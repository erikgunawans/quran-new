import { describe, expect, test } from "bun:test";
import { retrieve, type Corpus, type Verse } from "./retrieve.ts";

/**
 * Multi-theme verses.
 *
 * A verse used to carry exactly one feeling. That was invisible while there were twelve broad
 * themes; it bit as soon as the themes got finer-grained, because human states overlap — 3:185
 * ("every soul will taste death") genuinely consoles both someone grieving and someone afraid of
 * dying, and could only do one.
 *
 * Widening to `themes[]` creates two ways to get it wrong, both pinned here:
 *   1. SCORE INFLATION — a verse tagged with three feelings must not outrank a single-tagged verse
 *      just for being tagged more. Score comes from the BEST matching theme, not the sum.
 *   2. DIVERSITY COLLAPSE — "one verse per theme" exists so someone carrying two things ("lagi
 *      banyak utang, stress") hears both. A multi-tagged verse must not silently consume every
 *      theme it touches and crowd the second concern out.
 */

const v = (ref: string, themes: string[], why = "", text = "teks"): Verse => ({
  id: `ayah:${ref}`,
  ref,
  surah: Number(ref.split(":")[0]),
  ayah: Number(ref.split(":")[1]),
  surah_name: "Test",
  surah_ar: "ت",
  arabic: "",
  themes,
  why,
  primary: { text, translator: "t", translation_type: "interpretive" as const },
  companion: null,
  tafsir: [],
});

const corpusOf = (verses: Verse[]): Corpus => ({
  corpus_version: "test",
  sources: [],
  themes: [...new Set(verses.flatMap((x) => x.themes))],
  verses,
});

describe("a verse can carry more than one feeling", () => {
  test("it is reachable from EACH of its themes", () => {
    const corpus = corpusOf([v("3:185", ["Grief & loss", "Fear of death"])]);
    // Reached via the model-detected theme, which is how the classifier path feeds retrieval.
    expect(retrieve(corpus, "apa pun", 5, ["Grief & loss"]).map((h) => h.verse.ref)).toEqual(["3:185"]);
    expect(retrieve(corpus, "apa pun", 5, ["Fear of death"]).map((h) => h.verse.ref)).toEqual(["3:185"]);
  });

  test("being tagged with more feelings does NOT inflate its score", () => {
    // The two verses must answer DIFFERENT asked-about feelings, or diversification (correctly)
    // drops one of them and there is nothing left to compare. Each matches exactly one of the
    // feelings named; the extra tags on the first are irrelevant here and must not buy it rank.
    const many = v("1:1", ["Grief & loss", "Fear of death", "Patience", "Mercy"]);
    const one = v("2:2", ["Provision & debt"]);
    const hits = retrieve(corpusOf([many, one]), "apa pun", 5, ["Grief & loss", "Provision & debt"]);
    expect(hits).toHaveLength(2);
    expect(hits[0]!.score).toBe(hits[1]!.score);
  });

  test("two verses sharing the asked-about feeling still yield ONE — diversification unchanged", () => {
    // The pre-existing rule, re-pinned: multi-theme support must not quietly loosen it.
    const corpus = corpusOf([v("1:1", ["Grief & loss", "Patience"]), v("2:2", ["Grief & loss"])]);
    expect(retrieve(corpus, "apa pun", 5, ["Grief & loss"])).toHaveLength(1);
  });

  test("a second concern still gets heard — diversification survives", () => {
    // The person carries two things. The multi-tagged verse answers the first; the second
    // concern must still surface its own verse rather than being crowded out.
    const corpus = corpusOf([
      v("1:1", ["Grief & loss", "Provision & debt"]),
      v("2:2", ["Provision & debt"]),
      v("3:3", ["Grief & loss"]),
    ]);
    const refs = retrieve(corpus, "apa pun", 5, ["Grief & loss", "Provision & debt"]).map((h) => h.verse.ref);
    expect(refs.length).toBeGreaterThanOrEqual(2);
    // Both feelings the person named are represented among the returned verses.
    const themesReturned = new Set(refs.flatMap((r) => corpus.verses.find((x) => x.ref === r)!.themes));
    expect(themesReturned.has("Grief & loss")).toBe(true);
    expect(themesReturned.has("Provision & debt")).toBe(true);
  });

  test("the same verse is never returned twice, even matching two asked-about themes", () => {
    const corpus = corpusOf([v("1:1", ["Grief & loss", "Fear of death"])]);
    const refs = retrieve(corpus, "apa pun", 5, ["Grief & loss", "Fear of death"]).map((h) => h.verse.ref);
    expect(refs).toEqual(["1:1"]);
  });
});
