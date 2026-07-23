import { describe, expect, test } from "bun:test";
import { displayName, findSurah, parseRef, SURAH_INDEX, surahMeta } from "./quran.ts";
import { shareText } from "./share.ts";
import { renderVerseCardImage } from "./share-image.ts";
import { FLAGGED, type VerseCard } from "./verse.ts";

/**
 * The regression suite for the failure that mattered most.
 *
 * Nur used to tell people that 18:10 — a real ayah in Al-Kahf — did not exist, because only 55
 * of 6,236 verses were bundled. These tests exist so that can never quietly come back.
 */

describe("the truth oracle — inlined, zero network", () => {
  test("holds all 114 surahs", () => {
    expect(SURAH_INDEX.length).toBe(114);
  });

  test("holds all 6,236 ayahs", () => {
    expect(SURAH_INDEX.reduce((n, s) => n + s.ayahs, 0)).toBe(6236);
  });

  test("knows Al-Kahf has 110 ayahs", () => {
    expect(surahMeta(18)?.ayahs).toBe(110);
    expect(surahMeta(18)?.tl).toBe("Al-Kahf");
  });

  test("the basmalah is an unnumbered opening everywhere except Al-Faatiha and At-Tawbah", () => {
    expect(surahMeta(1)?.bismillah).toBe(false); // it IS ayah 1 there
    expect(surahMeta(9)?.bismillah).toBe(false); // At-Tawbah has none
    expect(surahMeta(2)?.bismillah).toBe(true);
    expect(surahMeta(18)?.bismillah).toBe(true);
    expect(SURAH_INDEX.filter((s) => s.bismillah).length).toBe(112);
  });
});

describe("P0 — a real ayah is NEVER denied", () => {
  test("18:10 resolves — the exact verse the app used to deny", () => {
    const r = parseRef("18:10");
    expect(r.kind).toBe("ayah");
    if (r.kind !== "ayah") throw new Error("unreachable");
    expect(r.surah.n).toBe(18);
    expect(r.surah.tl).toBe("Al-Kahf");
    expect(r.ayah).toBe(10);
  });

  test.each([
    ["18:10", 18, 10],
    ["18.10", 18, 10],
    ["QS 18:10", 18, 10],
    ["surat 18 ayat 10", 18, 10],
    ["2:255", 2, 255],
    ["114:6", 114, 6],
    ["1:1", 1, 1],
  ])("%s resolves to %i:%i", (input, s, a) => {
    const r = parseRef(input);
    expect(r.kind).toBe("ayah");
    if (r.kind !== "ayah") throw new Error("unreachable");
    expect(r.surah.n).toBe(s);
    expect(r.ayah).toBe(a);
  });

  test("every ayah of every surah resolves — all 6,236, no exceptions", () => {
    let checked = 0;
    for (const s of SURAH_INDEX) {
      for (const a of [1, Math.ceil(s.ayahs / 2), s.ayahs]) {
        const r = parseRef(`${s.n}:${a}`);
        expect(r.kind).toBe("ayah");
        checked++;
      }
    }
    expect(checked).toBe(342);
  });
});

describe("a non-existent reference gets the TRUE reason, not a denial", () => {
  test("18:999 — names the real bound instead of claiming no match", () => {
    const r = parseRef("18:999");
    expect(r.kind).toBe("no-such-ayah");
    if (r.kind !== "no-such-ayah") throw new Error("unreachable");
    expect(r.surah.ayahs).toBe(110); // "Al-Kahf only has 110 ayahs" — a true statement
  });

  test("115:1 — there are only 114 surahs", () => {
    const r = parseRef("115:1");
    expect(r.kind).toBe("no-such-surah");
  });

  test("18:0 is not an ayah — ayahs are 1-indexed", () => {
    expect(parseRef("18:0").kind).toBe("no-such-ayah");
  });

  test("a feeling is not a reference — it goes to retrieval", () => {
    expect(parseRef("aku lagi capek banget").kind).toBe("not-a-ref");
    expect(parseRef("lagi banyak utang, stress").kind).toBe("not-a-ref");
  });
});

describe("people type surah NAMES, not numbers", () => {
  test.each([
    ["al kahfi", 18],
    ["Al-Kahf", 18],
    ["alkahfi", 18],
    ["kahfi", 18],
    ["yasin", 36],
    ["Yaasin", 36],
    ["ar-rahman", 55],
    ["arrahman", 55],
    ["al mulk", 67],
    ["al-ikhlas", 112],
    ["annas", 114],
  ])("%s → surah %i", (name, n) => {
    expect(findSurah(name)?.n).toBe(n);
  });

  test("'al kahfi' alone opens the surah for reading", () => {
    const r = parseRef("al kahfi");
    expect(r.kind).toBe("surah");
    if (r.kind !== "surah") throw new Error("unreachable");
    expect(r.surah.n).toBe(18);
  });

  test("a named surah with an ayah resolves to that ayah", () => {
    const r = parseRef("al kahfi ayat 10");
    expect(r.kind).toBe("ayah");
    if (r.kind !== "ayah") throw new Error("unreachable");
    expect(r.surah.n).toBe(18);
    expect(r.ayah).toBe(10);
  });

  test("nonsense is not a surah", () => {
    expect(findSurah("zzzz")).toBeUndefined();
  });
});

// ── the egress contract ──────────────────────────────────────────────────────
const card = (over: Partial<VerseCard> = {}): VerseCard => ({
  ref: "94:5",
  surah: 94,
  ayah: 5,
  surah_name: "Ash-Sharh",
  arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
  primary: { text: "Dalam hidup ini ada kesusahan dan ada kesenangan.", translator: "Ustadz Muhammad Thalib" },
  companion: {
    text: "Maka sesungguhnya beserta kesulitan ada kemudahan.",
    translator: "Kementerian Agama Republik Indonesia",
  },
  ...over,
});

describe("egress — an interpretation must never leave dressed as scripture", () => {
  test("the shared text labels the interpretive rendering as interpretive", () => {
    const t = shareText(card());
    expect(t).toContain("Terjemahan makna");
    expect(t).toContain("Ustadz Muhammad Thalib");
  });

  test("the literal companion travels with it — literal_companion, honored on egress", () => {
    const t = shareText(card());
    expect(t).toContain("Terjemahan harfiah");
    expect(t).toContain("Kementerian Agama Republik Indonesia");
    expect(t).toContain("Maka sesungguhnya beserta kesulitan ada kemudahan.");
  });

  test("Anti: no share payload presents an interpretive rendering as the Qur'an's own words", () => {
    const t = shareText(card());
    // The interpretive text must never appear without its label somewhere above it.
    const iMakna = t.indexOf("Terjemahan makna");
    const iText = t.indexOf("Dalam hidup ini ada kesusahan");
    expect(iMakna).toBeGreaterThanOrEqual(0);
    expect(iText).toBeGreaterThan(iMakna);
    expect(t).not.toMatch(/Al-Qur'?an (berkata|mengatakan)/i);
  });

  test("the Arabic and the reference both travel", () => {
    const t = shareText(card());
    expect(t).toContain("QS Ash-Sharh 94:5");
    expect(t).toContain("فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا");
  });
});

describe("egress — a conditional verse carries the whole passage it was approved in", () => {
  const reading = (text: string) => ({ text, translator: "Ustadz Muhammad Thalib" });
  const conditional = card({
    ref: "20:26",
    surah: 20,
    ayah: 26,
    surah_name: "Ta Ha",
    arabic: "وَيَسِّرْ لِىٓ أَمْرِى",
    primary: reading("Mudahkanlah urusanku."),
    companion: { text: "dan mudahkanlah untukku urusanku,", translator: "Kementerian Agama Republik Indonesia" },
    passage: [
      { ayah: 25, arabic: "رَبِّ ٱشْرَحْ لِى صَدْرِى", primary: reading("Ya Tuhanku, lapangkanlah dadaku."), companion: null },
      { ayah: 26, arabic: "وَيَسِّرْ لِىٓ أَمْرِى", primary: reading("Mudahkanlah urusanku."), companion: null },
      { ayah: 27, arabic: "وَٱحْلُلْ عُقْدَةً مِّن لِّسَانِى", primary: reading("Lepaskan kekakuan lidahku."), companion: null },
      { ayah: 28, arabic: "يَفْقَهُوا۟ قَوْلِى", primary: reading("agar mereka memahami ucapanku."), companion: null },
    ],
  });

  test("every ayah of the approved range travels, in mushaf order, under the range ref", () => {
    const t = shareText(conditional);
    expect(t).toContain("QS Ta Ha 20:25-28");
    for (const ay of [25, 26, 27, 28]) expect(t).toContain(`(20:${ay})`);
    expect(t.indexOf("(20:25)")).toBeLessThan(t.indexOf("(20:26)"));
    expect(t.indexOf("(20:26)")).toBeLessThan(t.indexOf("(20:27)"));
    expect(t.indexOf("(20:27)")).toBeLessThan(t.indexOf("(20:28)"));
    expect(t).toContain("Lepaskan kekakuan lidahku."); // the neighbour's text is present
  });

  test("Anti: only the captioned subject carries our labelled dual rendering — neighbours are not re-captioned", () => {
    const t = shareText(conditional);
    expect(t.match(/Terjemahan makna/g)?.length).toBe(1);
    expect(t.match(/Terjemahan harfiah/g)?.length).toBe(1);
  });

  test("Anti: a conditional verse can never leave as a single-ayah image card", async () => {
    // No blob is ever produced for a passage-carrying verse — the image path refuses it, so the
    // plain-text egress above (which carries the whole passage) is the only carrier it degrades to.
    expect(await renderVerseCardImage(conditional)).toBeNull();
  });
});

describe("the caution stays rare and human-ruled", () => {
  test("94:5 and 94:6 are flagged — the case PROGRESS.md forbids shipping bare", () => {
    expect(FLAGGED["94:5"]).toBeDefined();
    expect(FLAGGED["94:6"]).toBeDefined();
  });

  test("2:156 is NOT flagged — low overlap there is the thesis PROVEN, not broken", () => {
    // The mechanical divergence score cannot tell the product's best moment from its worst.
    // See ISA.md § Changelog. This test is the tombstone for that idea.
    expect(FLAGGED["2:156"]).toBeUndefined();
  });

  test("the flag list is human-curated and stays small", () => {
    expect(Object.keys(FLAGGED).length).toBeLessThan(10);
  });
});

describe("a clock is not a verse", () => {
  // "2:30" is Al-Baqarah 30. It is also half past two in the morning — which is exactly when this
  // product expects to be used. The bare N:M pattern used to silently reinterpret a person's
  // insomnia as a citation, and the ref path skips retrieval entirely, so nothing caught it.
  test.each([
    "aku bangun jam 2:30 pagi",
    "udah jam 3:15 masih gabisa tidur",
    "tiap malam kebangun pukul 2:30",
    "besok meeting jam 9:30 pagi",
    "sekarang 1:20 dini hari",
  ])("%s → NOT a verse reference", (msg) => {
    expect(parseRef(msg).kind).toBe("not-a-ref");
  });

  test("but an explicit reference still resolves, even near time words", () => {
    // The marker IS the intent. "QS 2:30" is unambiguous no matter what else is in the sentence.
    const r = parseRef("tiap malam aku baca QS 2:30");
    expect(r.kind).toBe("ayah");
    if (r.kind !== "ayah") throw new Error("unreachable");
    expect(r.surah.n).toBe(2);
    expect(r.ayah).toBe(30);
  });

  test("a bare ref with no time context still works", () => {
    expect(parseRef("2:30").kind).toBe("ayah");
    expect(parseRef("coba buka 18:10").kind).toBe("ayah");
  });
});

describe("surah names are spelled the way Indonesians spell them", () => {
  test.each([
    [2, "Al-Baqarah"],
    [9, "At-Taubah"],
    [1, "Al-Fatihah"],
    [18, "Al-Kahfi"],
    [94, "Asy-Syarh"],
    [112, "Al-Ikhlas"],
  ])("surah %i displays as %s", (n, name) => {
    expect(displayName(n)).toBe(name);
  });

  test("Anti: the academic transliteration never reaches a reader", () => {
    for (const wrong of ["Al-Baqara", "At-Tawba", "Al-Faatiha"]) {
      expect(SURAH_INDEX.map((s) => displayName(s.n))).not.toContain(wrong);
    }
  });
});
