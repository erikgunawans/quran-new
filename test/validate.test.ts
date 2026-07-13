import { describe, expect, test } from "bun:test";
import {
  TRUTH_CANONICAL,
  ayahId,
  surahId,
  translationId,
  type Ayah,
  type CanonicalDataset,
  type Surah,
  type Translation,
} from "../src/domain/canonical.ts";
import { IntegrityError, validateCanonical } from "../src/ingest/validate.ts";

/**
 * A synthetic corpus with the Qur'an's exact shape: 114 surahs, 6,236 ayahs.
 * Each test then breaks ONE invariant and asserts the gate catches it. A gate that
 * never fails is decoration, so every gate gets a negative test.
 */
const REAL_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8,
  19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
] as const;

function fixture(): CanonicalDataset {
  const surahs: Surah[] = [];
  const ayahs: Ayah[] = [];
  const translations: Translation[] = [];

  REAL_COUNTS.forEach((count, i) => {
    const n = i + 1;
    surahs.push({
      id: surahId(n),
      truth_class: TRUTH_CANONICAL,
      number: n,
      name_ar: `س${n}`,
      name_translit: `Surah-${n}`,
      name_en: `Surah ${n}`,
      revelation_type: n % 2 === 0 ? "medinan" : "meccan",
      order_revealed: n,
      ayah_count: count,
      ruku_count: 1,
    });
    for (let a = 1; a <= count; a++) {
      ayahs.push({
        id: ayahId(n, a),
        truth_class: TRUTH_CANONICAL,
        surah_number: n,
        ayah_number: a,
        text_uthmani: `نص ${n}:${a}`,
      });
      translations.push({
        id: translationId("id", n, a),
        truth_class: TRUTH_CANONICAL,
        ayah_id: ayahId(n, a),
        lang: "id",
        translator: "Kementerian Agama Republik Indonesia",
        text: `teks ${n}:${a}`,
      });
    }
  });

  return { surahs, ayahs, translations };
}

const violations = (ds: CanonicalDataset): string[] => {
  try {
    validateCanonical(ds);
    return [];
  } catch (e) {
    if (e instanceof IntegrityError) return [...e.violations];
    throw e;
  }
};

describe("canonical integrity gates", () => {
  test("the real Qur'anic shape sums to exactly 6,236 across 114 surahs", () => {
    expect(REAL_COUNTS).toHaveLength(114);
    expect(REAL_COUNTS.reduce((a, b) => a + b, 0)).toBe(6236);
  });

  test("a well-formed corpus passes every gate", () => {
    const report = validateCanonical(fixture());
    expect(report.checks.length).toBeGreaterThanOrEqual(10);
    expect(violations(fixture())).toEqual([]);
  });

  test("catches a missing ayah (6,235)", () => {
    const ds = fixture();
    const ayahs = ds.ayahs.filter((a) => a.id !== "ayah:2:255");
    expect(violations({ ...ds, ayahs }).join()).toMatch(/ayah count is 6235/);
  });

  test("catches a missing surah", () => {
    const ds = fixture();
    const surahs = ds.surahs.filter((s) => s.number !== 114);
    expect(violations({ ...ds, surahs }).join()).toMatch(/surah count is 113/);
  });

  test("catches a per-surah count that disagrees with the metadata", () => {
    const ds = fixture();
    const surahs = ds.surahs.map((s) => (s.number === 1 ? { ...s, ayah_count: 8 } : s));
    expect(violations({ ...ds, surahs }).join()).toMatch(/has 7 ayahs, metadata declares 8/);
  });

  test("catches a break in ayah numbering within a surah", () => {
    const ds = fixture();
    const ayahs = ds.ayahs.map((a) =>
      a.id === "ayah:1:3" ? { ...a, ayah_number: 99, id: ayahId(1, 99) } : a,
    );
    expect(violations({ ...ds, ayahs }).join()).toMatch(/numbering breaks/);
  });

  test("catches duplicate ayah ids", () => {
    const ds = fixture();
    const ayahs = [...ds.ayahs];
    ayahs[5] = { ...ayahs[0]! };
    expect(violations({ ...ds, ayahs }).join()).toMatch(/duplicate ayah ids/);
  });

  test("catches empty scripture text", () => {
    const ds = fixture();
    const ayahs = ds.ayahs.map((a) => (a.id === "ayah:1:1" ? { ...a, text_uthmani: "   " } : a));
    expect(violations({ ...ds, ayahs }).join()).toMatch(/empty text_uthmani/);
  });

  test("catches incomplete translation coverage", () => {
    const ds = fixture();
    const translations = ds.translations.slice(0, 6235);
    expect(violations({ ...ds, translations }).join()).toMatch(/covers 6235 ayahs, must cover all 6236/);
  });

  test("catches a translation pointing at a nonexistent ayah", () => {
    const ds = fixture();
    const translations = ds.translations.map((t) =>
      t.id === "translation:id:1:1" ? { ...t, ayah_id: ayahId(115, 1) } : t,
    );
    expect(violations({ ...ds, translations }).join()).toMatch(/references unknown ayah/);
  });

  test("catches a duplicate revelation order", () => {
    const ds = fixture();
    const surahs = ds.surahs.map((s) => (s.number === 2 ? { ...s, order_revealed: 1 } : s));
    expect(violations({ ...ds, surahs }).join()).toMatch(/revelation order contains duplicates/);
  });

  test("catches a node not tagged canonical — no LLM-touched data may pass", () => {
    const ds = fixture();
    const ayahs = ds.ayahs.map((a) =>
      a.id === "ayah:1:1" ? ({ ...a, truth_class: "derived" } as unknown as Ayah) : a,
    );
    expect(violations({ ...ds, ayahs }).join()).toMatch(/not tagged truth_class="canonical"/);
  });

  test("reports ALL violations at once, not just the first", () => {
    const ds = fixture();
    const surahs = ds.surahs.filter((s) => s.number !== 114);
    const ayahs = ds.ayahs.filter((a) => a.surah_number !== 114);
    expect(violations({ ...ds, surahs, ayahs }).length).toBeGreaterThan(1);
  });
});
