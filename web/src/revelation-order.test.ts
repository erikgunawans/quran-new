import { describe, expect, test } from "bun:test";
import { SURAH_INDEX } from "./surah-index.ts";

/**
 * Revelation order is a factual claim about scripture, carried from Tanzil's pinned metadata.
 * It is also the kind of field that can silently degrade — a regenerated index that dropped or
 * duplicated an order would still render a plausible-looking list, just a wrong one. These
 * tests exist so that failure is loud.
 */
describe("revelation order", () => {
  test("every surah carries one", () => {
    for (const s of SURAH_INDEX) {
      expect(Number.isInteger(s.order)).toBe(true);
      expect(s.order).toBeGreaterThanOrEqual(1);
      expect(s.order).toBeLessThanOrEqual(114);
    }
  });

  test("the 114 orders are a permutation of 1..114 — no gap, no duplicate", () => {
    const orders = SURAH_INDEX.map((s) => s.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 114 }, (_, i) => i + 1));
  });

  test("revelation order is NOT mushaf order — the distinction the tab exists to show", () => {
    const differing = SURAH_INDEX.filter((s) => s.n !== s.order);
    expect(differing.length).toBeGreaterThan(100);
  });

  test("the traditional anchors hold", () => {
    // Al-Alaq ("Iqra") first, An-Nasr last, Al-Faatiha fifth despite opening the mushaf.
    expect(SURAH_INDEX.find((s) => s.order === 1)?.n).toBe(96);
    expect(SURAH_INDEX.find((s) => s.order === 114)?.n).toBe(110);
    expect(SURAH_INDEX.find((s) => s.n === 1)?.order).toBe(5);
  });

  test("sorting by order yields 114 surahs, each exactly once", () => {
    const sorted = SURAH_INDEX.slice().sort((a, b) => a.order - b.order);
    expect(sorted.length).toBe(114);
    expect(new Set(sorted.map((s) => s.n)).size).toBe(114);
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i]?.order ?? 0) > (sorted[i - 1]?.order ?? 0)).toBe(true);
    }
  });
});
