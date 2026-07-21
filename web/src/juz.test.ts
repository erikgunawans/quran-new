import { describe, expect, test } from "bun:test";
import { JUZ, ayahsInJuz, juzLabel, juzOf, juzSpan, surahsInJuz } from "./juz.ts";
import { SURAH_INDEX, TOTAL_AYAHS } from "./surah-index.ts";

/**
 * The juz index slices scripture. A wrong boundary does not throw — it quietly sends a reader
 * to the wrong place and looks like the app's own claim about where a division falls. So these
 * tests are mostly about the structure being airtight, not about the API being pleasant.
 */
describe("juz boundaries", () => {
  test("there are exactly 30, numbered 1..30 in order", () => {
    expect(JUZ.length).toBe(30);
    expect(JUZ.map((j) => j.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  test("juz 1 opens the Qur'an and juz 30 closes it", () => {
    expect(JUZ[0]).toMatchObject({ s: 1, a: 1 });
    expect(JUZ[29]).toMatchObject({ es: 114, ea: 6 });
  });

  test("the 30 spans tile all 6,236 ayahs with no gap and no overlap", () => {
    expect(JUZ.reduce((sum, j) => sum + j.ayahs, 0)).toBe(TOTAL_AYAHS);

    // Every real ayah belongs to exactly one juz — walked exhaustively, not sampled.
    const seen = new Set<string>();
    for (let n = 1; n <= 30; n++) {
      for (const { surah, ayah } of ayahsInJuz(n)) {
        const key = `${surah}:${ayah}`;
        expect(seen.has(key)).toBe(false); // no ayah in two juz
        seen.add(key);
        expect(juzOf(surah, ayah)).toBe(n); // and the lookup agrees with the enumeration
      }
    }
    expect(seen.size).toBe(TOTAL_AYAHS); // no ayah missing
  });

  test("every boundary lands on an ayah that actually exists", () => {
    for (const j of JUZ) {
      const start = SURAH_INDEX.find((s) => s.n === j.s);
      const end = SURAH_INDEX.find((s) => s.n === j.es);
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      expect(j.a).toBeGreaterThanOrEqual(1);
      expect(j.a).toBeLessThanOrEqual(start?.ayahs ?? 0);
      expect(j.ea).toBeGreaterThanOrEqual(1);
      expect(j.ea).toBeLessThanOrEqual(end?.ayahs ?? 0);
    }
  });

  test("known boundaries match the standard Hafs divisions", () => {
    // Spot-checks a reader would notice immediately if they were wrong.
    expect(juzSpan(2)).toMatchObject({ s: 2, a: 142 });
    expect(juzSpan(15)).toMatchObject({ s: 17, a: 1 });
    expect(juzSpan(30)).toMatchObject({ s: 78, a: 1 });
    expect(juzOf(1, 1)).toBe(1);
    expect(juzOf(2, 141)).toBe(1);
    expect(juzOf(2, 142)).toBe(2);
    expect(juzOf(114, 6)).toBe(30);
  });
});

describe("juzOf refuses to invent a location", () => {
  test("returns null for references that are not real", () => {
    expect(juzOf(2, 287)).toBeNull(); // Al-Baqarah has 286
    expect(juzOf(115, 1)).toBeNull(); // there is no surah 115
    expect(juzOf(0, 1)).toBeNull();
    expect(juzOf(1, 0)).toBeNull();
    expect(juzOf(1, 1.5)).toBeNull();
  });

  test("the last ayah of every surah resolves, and one past it does not", () => {
    for (const s of SURAH_INDEX) {
      expect(juzOf(s.n, s.ayahs)).not.toBeNull();
      expect(juzOf(s.n, s.ayahs + 1)).toBeNull();
    }
  });
});

describe("juz helpers", () => {
  test("ayahsInJuz counts match the declared span length", () => {
    for (const j of JUZ) expect(ayahsInJuz(j.n).length).toBe(j.ayahs);
  });

  test("surahsInJuz is contiguous and starts/ends where the span does", () => {
    for (const j of JUZ) {
      const surahs = surahsInJuz(j.n);
      expect(surahs[0]).toBe(j.s);
      expect(surahs[surahs.length - 1]).toBe(j.es);
      for (let i = 1; i < surahs.length; i++) expect(surahs[i]).toBe((surahs[i - 1] ?? 0) + 1);
    }
  });

  test("out-of-range juz numbers yield empty, not a crash", () => {
    expect(juzSpan(0)).toBeNull();
    expect(juzSpan(31)).toBeNull();
    expect(ayahsInJuz(31)).toEqual([]);
    expect(surahsInJuz(0)).toEqual([]);
    expect(juzLabel(99)).toBe("");
  });

  test("labels name the range, and collapse when a juz sits inside one surah", () => {
    expect(juzLabel(1)).toBe("Juz 1 · Al-Faatiha – Al-Baqara");
    expect(juzLabel(2)).toBe("Juz 2 · Al-Baqara"); // entirely within Al-Baqarah
  });
});
