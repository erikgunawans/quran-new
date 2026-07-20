import { describe, expect, test } from "bun:test";
import { retrieve, type Corpus } from "./retrieve.ts";

/**
 * The honesty threshold.
 *
 * Asked "gimana cara sholat tahajud", Nur used to return 2:152 (Gratitude) — matched on the single
 * word `cara` ("way") — and wrap it in the full "here is a verse for you" framing. A wrong answer
 * arrived dressed exactly like a right one, which is worse than no answer: it spends the trust the
 * whole no-generative-model design exists to earn.
 */

const corpus: Corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

const refs = (q: string) => retrieve(corpus, q).map((h) => h.verse.ref);

describe("Nur answers a FEELING, not a coincidental word", () => {
  test("'gimana cara sholat tahajud' returns nothing — `cara` is not a feeling", () => {
    // The exact junk match that shipped. It must now reach honest silence instead.
    expect(refs("gimana cara sholat tahajud")).toEqual([]);
  });

  test.each([
    "gimana cara wudhu yang benar",
    "berapa rakaat sholat dhuha",
    "kapan waktu sholat ashar",
  ])("%s → honest silence, not a confident guess", (q) => {
    expect(refs(q)).toEqual([]);
  });
});

describe("a knowledge/theology question is not a feeling — honest silence, not a wrong verse", () => {
  test("the reported bug: 'siapakah allah? ada dimana allah dan mau nya allah itu apa?' → silence", () => {
    // Shipped a Hardship framing + 2:286, matched only on common fragments (allah/ada/dan/nya/itu/apa)
    // scored as substrings via word overlap. Word overlap can no longer qualify a verse on its own.
    expect(refs("siapakah allah? ada dimana allah dan mau nya allah itu apa?")).toEqual([]);
  });

  test.each([
    "apa itu tauhid",
    "hukum riba apa",
    "kapan hari kiamat",
    "siapa nabi terakhir",
  ])("%s → honest silence (a definition/ruling is not a feeling)", (q) => {
    expect(refs(q)).toEqual([]);
  });

  test("a verse dense in common words does not clear the floor without a feeling", () => {
    // No emotional keyword, no reference — only function-word overlap, which must not qualify anything.
    expect(refs("apa itu dan dari yang ada di dalam kitab ini")).toEqual([]);
  });
});

describe("but real feelings still land", () => {
  test.each([
    "aku lagi capek banget",
    "lagi banyak utang, stress",
    "baru kehilangan orang tua",
    "ngerasa dosaku kebanyakan",
    "cemas terus tiap malam",
  ])("%s → returns at least one verse", (q) => {
    expect(refs(q).length).toBeGreaterThan(0);
  });

  test("'gimana caranya biar aku tenang' now lands on a THEME, not on luck", () => {
    // The old critique noted this worked "only by lucky word overlap — the lexicon has no entry
    // for tenang". It now matches the Anxiety theme properly, which is why raising the floor did
    // not cost us the case.
    expect(refs("gimana caranya biar aku tenang").length).toBeGreaterThan(0);
  });
});

describe("the diversity rule still holds", () => {
  test("someone carrying two things hears both", () => {
    const hits = retrieve(corpus, "lagi banyak utang, stress banget");
    const themes = new Set(hits.map((h) => h.verse.themes[0]));
    expect(themes.size).toBe(hits.length); // one verse per theme, never two of the same
  });

  test("never returns more than 2 verses unasked", () => {
    expect(retrieve(corpus, "sedih, cemas, utang, dosa, capek").length).toBeLessThanOrEqual(2);
  });
});
