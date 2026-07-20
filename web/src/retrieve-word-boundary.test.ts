import { describe, expect, test } from "bun:test";
import { keywordThemeHits } from "./retrieve.ts";

/**
 * The theme lexicon matched with raw `q.includes(term)`, so a lexicon word buried inside an
 * unrelated word hijacked the whole question:
 *
 *   "dibully terus di sekolah"  → "ibu" ⊂ d-IBU-lly   → Family → "berbuat baiklah kepada orang tua"
 *
 * A person describing being bullied was told to honour their parents. Not silence — a confident
 * wrong answer, which retrieve.test.ts's own header calls worse than none. This is the same
 * substring bug already fixed for word OVERLAP ("nya" ⊄ "kesanggupannya"); theme matching never
 * got the fix.
 *
 * Plain word-set matching would fix it and break something else: Indonesian is agglutinative, so
 * "bersabar", "ketakutan" and "pekerjaan" must still reach sabar / takut / kerja. Matching is
 * therefore affix-aware — a question word matches a term when the term IS that word, or is that
 * word minus recognised Indonesian affixes. That distinction is exactly what separates "keuangan"
 * (ke+UANG+an → real) from "ruangan" (no valid affix yields "uang" → noise).
 */

const themesOf = (q: string) => [...keywordThemeHits(q).keys()].sort();

describe("a lexicon word buried inside another word must NOT match", () => {
  test.each([
    ["wilayah kami luas", "ayah ⊂ wilayah"],
    ["distribusi barang", "ibu/istri ⊂ distribusi"],
    ["ruangan ini sempit", "uang ⊂ ruangan"],
    ["sepintas terlihat baik", "sepi ⊂ sepintas"],
  ])("%s — %s", (q) => {
    expect(themesOf(q)).toEqual([]);
  });

  test("dibully matches BEING BULLIED, never Family", () => {
    // "dibully" is now a real keyword of its own theme, so this is no longer silent — but the bug
    // being pinned is the substring hijack, and that must stay dead: `ibu` ⊂ d-IBU-lly must never
    // route a bullied person to verses about honouring parents.
    const hits = keywordThemeHits("dibully terus di sekolah");
    expect(hits.get("Family")).toBeUndefined();
    expect([...hits.keys()]).toContain("Being bullied");
  });

  test("the reported case: being bullied is not a question about parents", () => {
    expect(keywordThemeHits("dibully terus di sekolah").get("Family")).toBeUndefined();
  });
});

describe("real Indonesian affixed forms must STILL match", () => {
  test.each([
    ["aku harus bersabar", "Patience"],
    ["ketakutan setiap malam", "Anxiety & fear"],
    ["pekerjaanku berat sekali", "Provision & debt"],
    ["kesepian banget akhir-akhir ini", "Self-worth & purpose"],
    ["keuangan keluargaku kacau", "Provision & debt"],
  ])("%s → %s", (q, theme) => {
    expect(themesOf(q)).toContain(theme);
  });

  test("plain words keep matching", () => {
    expect(themesOf("aku sedih")).toContain("Grief & loss");
    expect(themesOf("cemas terus")).toContain("Anxiety & fear");
  });

  test("multi-word phrases keep matching", () => {
    expect(themesOf("aku gak kuat lagi")).toContain("Hardship & ease");
    expect(themesOf("kangen orang tua")).toContain("Family");
  });
});

describe("the honesty floor is unchanged", () => {
  test.each([
    "gimana cara sholat tahajud",
    "berapa rakaat sholat dhuha",
    "siapakah allah? ada dimana allah dan mau nya allah itu apa?",
  ])("%s → no feeling detected", (q) => {
    expect(themesOf(q)).toEqual([]);
  });
});
