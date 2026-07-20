/**
 * gatherGrounding — the fence around what the synthesis model is allowed to see.
 *
 * Everything downstream (the prompt, the citation whitelist, the guard) trusts this function to have
 * already decided what is legitimate grounding. Both bugs pinned here were invisible in the answer
 * itself: the model behaved perfectly given what it was handed, and what it was handed was wrong.
 */
import { describe, expect, test } from "bun:test";
import { gatherGrounding } from "./answer.ts";
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
