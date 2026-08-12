/**
 * gatherGrounding — the fence around what the synthesis model is allowed to see.
 *
 * Everything downstream (the prompt, the citation whitelist, the guard) trusts this function to have
 * already decided what is legitimate grounding. Both bugs pinned here were invisible in the answer
 * itself: the model behaved perfectly given what it was handed, and what it was handed was wrong.
 */
import { describe, expect, test } from "bun:test";
import { gatherGrounding, isRealAyah, synthesizeAnswer } from "./answer.ts";
import { refsInProse } from "./answer-guard.ts";
import { AnswerBlockedError } from "./answer-live.ts";
import type { AnswerContext } from "./answer-contract.ts";
import type { Corpus } from "./retrieve.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const path = `web/public${u.startsWith("/") ? u : "/" + u}`;
  const text = await Bun.file(path).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

describe("gatherGrounding — the KB is a fallback, never a hijacker", () => {
  test("a question with real feeling verses is NOT also grounded on the ruling index", async () => {
    // "aku capek banget sama utang" is an exhausted person. Ungated, matchTopic('utang'→Ekonomi)
    // stacked riba/debt LAW lines beside the feeling verses, and the model — handed both — answered
    // the ruling. main.ts has always run the KB only after feelings came up empty; now so does this.
    const g = await gatherGrounding(corpus, "aku capek banget mikirin utang yang numpuk", []);
    expect(g.verses.length).toBeGreaterThan(0);
    expect(g.entries).toEqual([]);
  });

  test("a topic question with no feeling verses still reaches the KB", async () => {
    const g = await gatherGrounding(corpus, "apa hukum riba dalam islam", []);
    expect(g.verses).toEqual([]); // the honesty floor: a ruling question gets no feeling verse
    expect(g.entries.length).toBeGreaterThan(0);
  });
});

describe("gatherGrounding — only refs that exist in the mushaf may be citable", () => {
  test("no grounding entry carries a ref outside its surah's real ayah count", async () => {
    // The index cites 4 refs that are not in the mushaf (e.g. QS 8:77 — Al-Anfal has 75 ayahs). The
    // principled edition renders those unlinked and inert. Here the ref list becomes the citation
    // WHITELIST, which is the model's licence to write it as scripture — so an unresolvable entry
    // would launder a non-existent ayah into an authored answer. It must not survive this far.
    const { SURAH_INDEX } = await import("./surah-index.ts");
    const bound = new Map(SURAH_INDEX.map((s) => [s.n, s.ayahs] as const));

    const questions = ["apa hukum riba dalam islam", "zakat dan puasa", "hukum halal dan haram"];
    let checked = 0;
    for (const q of questions) {
      const g = await gatherGrounding(corpus, q, []);
      for (const e of g.entries) {
        const m = /(\d{1,3})\s*:\s*(\d{1,3})/.exec(e.ref);
        expect(m).not.toBeNull();
        const [surah, ayah] = [Number(m![1]), Number(m![2])];
        expect(ayah).toBeLessThanOrEqual(bound.get(surah) ?? 0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0); // the assertion above must actually have run
  });

  test("the one question whose ONLY entry is unresolvable grounds on nothing", async () => {
    // Not a hypothetical. "syarat" trips the honesty floor so no feeling verse qualifies, the KB lane
    // opens, and the ONLY line it finds is QS 8:77 ("Khianat") — Al-Anfal ends at 75. Ungated, that
    // single non-existent ayah was both the model's entire grounding AND its citation whitelist: a
    // licence to write a verse that is not in the mushaf. The phrasing is stilted because it has to
    // reach one specific cell of the index, but every word of it is input a person can type.
    const q = "syarat pribadi shalih khianat";
    const { retrieveKnowledge } = await import("./knowledge.ts");
    const raw = await retrieveKnowledge(q);
    expect(raw!.entries.map((e) => [e.ref, e.resolvable])).toEqual([["QS. Al-Anfal, 8:77", false]]);

    const g = await gatherGrounding(corpus, q, []);
    expect(g.verses).toEqual([]); // so the KB lane really did run — emptiness is the filter's doing
    expect(g.entries).toEqual([]);
  });
});

describe("isRealAyah — a citation is legitimate only if the ayah exists", () => {
  test("real ayat pass", () => {
    expect(isRealAyah("17:23")).toBe(true); // Al-Isra has 111
    expect(isRealAyah("2:255")).toBe(true); // Ayat al-Kursi
    expect(isRealAyah("114:6")).toBe(true); // last surah, last ayah
  });
  test("non-existent ayat fail", () => {
    expect(isRealAyah("8:77")).toBe(false); // Al-Anfal ends at 75
    expect(isRealAyah("115:1")).toBe(false); // no surah 115
    expect(isRealAyah("2:300")).toBe(false); // Al-Baqarah ends at 286
    expect(isRealAyah("nonsense")).toBe(false);
  });
});

describe("refsInProse — extracts what the model actually cited, in order, de-duped", () => {
  test("named + numeric forms, first-ayah of a range, no repeats", () => {
    expect(refsInProse("Lihat QS Al-Isra 17:23 dan QS Luqman 31:14, lalu 17:23 lagi."))
      .toEqual(["17:23", "31:14"]);
  });
});

describe("synthesizeAnswer — the model leads, guarded to real ayat and no verdict", () => {
  const model = (prose: string) => (_ctx: AnswerContext) => Promise.resolve(prose);

  test("cites a REAL ayah beyond the retrieved grounding — breadth is allowed now", async () => {
    const ai = await synthesizeAnswer(
      corpus,
      "gimana sih adab ke orang tua",
      [],
      model("Berbakti kepada orang tua itu inti. Lihat QS Al-Isra 17:23."),
    );
    expect(ai?.kind).toBe("answer");
    // rendered card = what the model actually cited
    expect(ai?.kind === "answer" ? ai.refs : null).toEqual(["17:23"]);
  });

  test("a warm answer with NO citation still ships — no more brush-off bail", async () => {
    // "syarat pribadi shalih khianat" grounds on nothing (see above); the old code bailed to null.
    const ai = await synthesizeAnswer(
      corpus,
      "syarat pribadi shalih khianat",
      [],
      model("Menjaga amanah itu berat, dan niatmu untuk memperbaiki diri sudah satu langkah baik."),
    );
    expect(ai?.kind).toBe("answer");
    expect(ai?.kind === "answer" ? ai.refs : null).toEqual([]);
  });

  test("a non-existent ayah sinks the whole answer", async () => {
    const ai = await synthesizeAnswer(corpus, "cerita tentang khianat", [], model("Lihat QS 8:77."));
    expect(ai).toBeNull();
  });

  test("a fatwa verdict is rejected — the warm-teacher boundary holds", async () => {
    const ai = await synthesizeAnswer(corpus, "hukum riba", [], model("Riba itu haram hukumnya."));
    expect(ai).toBeNull();
  });
});

describe("synthesizeAnswer — a refusal from the edge is reported, not swallowed", () => {
  const throwing = (err: Error) => (_ctx: AnswerContext) => Promise.reject(err);

  test("the Worker's hadith refusal comes back as a named block, not as null", async () => {
    // The bug in one assertion. Before this, the edge said "I had an answer and my wall stopped it"
    // and the orchestrator flattened that into the same null it uses for a corpus gap — so the reader
    // was told no verse matched when the truth was that the answer was in a hadith.
    const ai = await synthesizeAnswer(corpus, "apakah sakit menghapus dosa", [], throwing(new AnswerBlockedError("bad_hadith")));
    expect(ai).toEqual({ kind: "blocked", by: "bad_hadith" });
  });

  test("every other refusal kind is reported with its own name", async () => {
    // main.ts routes on the name and today points only for `bad_hadith`. The other three must still
    // arrive intact rather than being coerced, or that routing decision cannot be revisited later.
    const ai = await synthesizeAnswer(corpus, "hukum riba", [], throwing(new AnswerBlockedError("fatwa")));
    expect(ai).toEqual({ kind: "blocked", by: "fatwa" });
  });

  test("a model that is merely DOWN is still an absence, not a refusal", async () => {
    // The load-bearing negative. If an ordinary failure leaked through as a block, the reader would be
    // told their answer lives in a hadith every time the endpoint 404'd or the key expired — a
    // confident false claim, which is strictly worse than the silence this change replaces.
    expect(await synthesizeAnswer(corpus, "apa itu sabar", [], throwing(new Error("no answer")))).toBeNull();
    expect(await synthesizeAnswer(corpus, "apa itu sabar", [], throwing(new Error("/api/answer returned 404")))).toBeNull();
  });

  test("Anti: a timeout never becomes a hadith pointer", async () => {
    const abort = new Error("The operation was aborted.");
    abort.name = "AbortError";
    expect(await synthesizeAnswer(corpus, "apa itu sabar", [], throwing(abort))).toBeNull();
  });
});
