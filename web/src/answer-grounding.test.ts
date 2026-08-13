/**
 * ISC-418 — the model may not author from nothing.
 *
 * Measured 2026-08-13 with `bun run eval:grounding`: handed NO grounding at all, the synthesis model
 * answered in full in **46 of 46** samples, and reached the fitting ayah from its own parametric
 * memory 35% of the time. There was no "I have no material for this" path on the authored edition —
 * so an off-topic question ("cara ganti oli motor beat") received a fluent Islamic answer composed
 * entirely from the model's own knowledge, with nothing of ours behind it.
 *
 * Erik's ruling, 2026-08-13: bow out to the principled edition. Empty grounding → no authored answer.
 *
 * THE RULE LIVES IN ONE PLACE ON PURPOSE. `hasGrounding` is called by BOTH the Worker (the authority,
 * after verifyGrounding) and the browser (before the network call, so a bow-out costs 0ms instead of
 * a ~6s generation). Duplicating the predicate would let the two drift, and the drift would be
 * invisible: both sides would still "work", just disagree about which questions get an answer.
 */
import { describe, expect, test } from "bun:test";
import { hasGrounding } from "./answer-contract.ts";
import { gatherGrounding, synthesizeAnswer } from "./answer.ts";
import type { AnswerContext, AnswerResult } from "./answer-contract.ts";
import type { Corpus } from "./retrieve.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const text = await Bun.file(`web/public${u.startsWith("/") ? u : "/" + u}`).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

const VERSE = { ref: "94:5", surah_name: "Ash-Sharh", text: "…" } as const;
const ENTRY = { ref: "QS. Al-Baqarah, 2:280", text: "…" } as const;

describe("hasGrounding — the single definition both sides call", () => {
  test("nothing of ours → the model may not author", () => {
    expect(hasGrounding({ verses: [], entries: [] })).toBe(false);
  });

  test("a verse alone is enough", () => {
    expect(hasGrounding({ verses: [VERSE], entries: [] })).toBe(true);
  });

  test("an index entry alone is enough — the ruling lane grounds on entries, never verses", () => {
    // `gatherGrounding` returns 0 verses / N entries for a fiqh question by design (the honesty
    // floor). A predicate that demanded verses would silence the entire hukum lane.
    expect(hasGrounding({ verses: [], entries: [ENTRY] })).toBe(true);
  });
});

describe("synthesizeAnswer bows out before spending a generation", () => {
  // A COUNTER, NOT A THROW — and the difference is the whole test.
  //
  // The first version of this used a model that threw "must not be called". It passed with the
  // short-circuit REMOVED: `synthesizeAnswer` wraps the model call in a try/catch that returns null
  // on any throw, so the forbidden model's exception was swallowed and `toBeNull()` was satisfied by
  // the error path instead of the bow-out. Force-red is what caught it. The call count is the only
  // signal that distinguishes "never asked the model" from "asked it and the answer died".
  let calls = 0;
  const counted = async (_ctx: AnswerContext): Promise<AnswerResult> => {
    calls += 1;
    return { prose: "Sabar itu indah, seperti QS Al-Baqarah 2:153.", hadith: [] };
  };

  for (const q of ["cara ganti oli motor beat", "resep rendang padang yang enak"]) {
    test(`"${q}" — zero grounding, so no authored answer and no model call`, async () => {
      const g = await gatherGrounding(corpus, q, []);
      expect(g.verses).toEqual([]); // the premise this case rests on
      expect(g.entries).toEqual([]);

      calls = 0;
      expect(await synthesizeAnswer(corpus, q, [], counted)).toBeNull();
      expect(calls).toBe(0); // the load-bearing assertion — a generation was never spent
    });
  }

  test("a real feeling still authors — the bow-out must not silence the app", async () => {
    // FORCE-RED CONTROL. Without this, a short-circuit that returned null unconditionally would pass
    // every test above while breaking the entire product.
    const q = "aku sedih banget rasanya";
    const g = await gatherGrounding(corpus, q, []);
    expect(g.verses.length + g.entries.length).toBeGreaterThan(0);

    let saw = false;
    const model = async (ctx: AnswerContext): Promise<AnswerResult> => {
      saw = true;
      expect(hasGrounding(ctx)).toBe(true); // the model never sees an empty context
      return { prose: "Allah menyertai orang yang bersabar, seperti QS Al-Baqarah 2:153 mengingatkan kita.", hadith: [] };
    };
    const out = await synthesizeAnswer(corpus, q, [], model);
    expect(saw).toBe(true);
    expect(out?.kind).toBe("answer");
  });
});
