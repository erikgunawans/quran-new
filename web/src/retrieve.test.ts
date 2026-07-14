import { describe, expect, test } from "bun:test";
import { retrieve, type Corpus, type Verse } from "./retrieve.ts";

/**
 * Reproduces the P1 from PROGRESS.md: "gimana cara sholat tahajud" returned 2:152 (Gratitude),
 * matched on the single word "cara". `score > 0` shipped that as a confident answer instead of
 * routing it to the honest-silence copy that already exists for exactly this case.
 */

function verse(overrides: Partial<Verse>): Verse {
  return {
    id: overrides.ref ?? "x",
    ref: "1:1",
    surah: 1,
    ayah: 1,
    surah_name: "Al-Faatiha",
    surah_ar: "الفاتحة",
    arabic: "",
    theme: "Hardship & ease",
    why: "",
    primary: { text: "", translator: "Tafsiriyah", translation_type: "interpretive" },
    companion: { text: "", translator: "Kemenag", translation_type: "literal" },
    tafsir: [],
    ...overrides,
  };
}

const corpus: Corpus = {
  corpus_version: "test",
  sources: [],
  themes: [],
  verses: [
    verse({ id: "a", ref: "94:5", surah: 94, ayah: 5, theme: "Hardship & ease" }),
    verse({
      id: "b",
      ref: "2:152",
      surah: 2,
      ayah: 152,
      theme: "Gratitude",
      why: "Ada kata cara yang kebetulan cocok di sini.",
    }),
  ],
};

describe("retrieve — minimum-score threshold", () => {
  test("a single incidental keyword hit does not ship as a confident answer", () => {
    const hits = retrieve(corpus, "gimana cara sholat tahajud");
    expect(hits.find((h) => h.verse.ref === "2:152")).toBeUndefined();
  });

  test("a real theme match still ships", () => {
    const hits = retrieve(corpus, "aku lagi capek banget");
    expect(hits.some((h) => h.verse.ref === "94:5")).toBe(true);
  });

  test("a direct verse reference always ships regardless of keyword noise", () => {
    const hits = retrieve(corpus, "94:5");
    expect(hits[0]?.verse.ref).toBe("94:5");
  });

  test("no match at all still returns empty, not a weak guess", () => {
    expect(retrieve(corpus, "zzz qqq")).toEqual([]);
  });
});
