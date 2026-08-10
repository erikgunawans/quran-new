import { describe, expect, test } from "bun:test";
import { hadithCardEl, hadithCardsEl, hadithRef, MAX_DISPLAY_CARDS, type HadithCard } from "./hadith-card.ts";

const rec = (over: Partial<HadithCard> = {}): HadithCard => ({
  id: "hadith-muslim-154",
  arabic: "حَدَّثَنَا أَبُو غَسَّانَ الْمِسْمَعِيُّ",
  english: "Between a man and polytheism and unbelief there is the abandonment of prayer.",
  collection: "Sahih Muslim",
  hadith_number: 154,
  grade: "sahih",
  book_en: "The Book of Faith",
  bab_en: "Clarifying the usage of the word Kafir for one who abandons Salat",
  source_url: "https://sunnah.com/muslim:154",
  translator: "Darussalam / Muhsin Khan and the named translators",
  ...over,
});

describe("the card shows the sourced artifact untouched", () => {
  const html = hadithCardEl(rec());

  test("Arabic renders verbatim, marked rtl and lang=ar", () => {
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="ar"');
    expect(html).toContain("حَدَّثَنَا أَبُو غَسَّانَ الْمِسْمَعِيُّ");
  });

  test("English renders verbatim", () => {
    expect(html).toContain("Between a man and polytheism and unbelief there is the abandonment of prayer.");
  });

  test("collection, number and grade are all present", () => {
    expect(html).toContain("Sahih Muslim 154");
    expect(html).toContain("Sahih");
    expect(html).toContain('data-grade="sahih"');
  });

  test("source_url is a real outbound link", () => {
    expect(html).toContain('href="https://sunnah.com/muslim:154"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("translator credit is shown — the record's rights.attribution requires it", () => {
    expect(html).toContain("Darussalam / Muhsin Khan and the named translators");
  });
});

describe("no unreviewed Indonesian", () => {
  test("a record with no approved rendering shows no Indonesian line", () => {
    expect(hadithCardEl(rec())).not.toContain('lang="id"');
  });

  test("an ustadz-approved rendering does show, for that record only", () => {
    const html = hadithCardEl(rec({ reviewed_id: "Antara seseorang dengan kesyirikan adalah meninggalkan sholat." }));
    expect(html).toContain('lang="id"');
    expect(html).toContain("Antara seseorang dengan kesyirikan");
  });

  test("the English is never labelled as the app's terjemahan", () => {
    // "Terjemahan Inggris: <translator>" credits a third party; it must not read as ours.
    expect(hadithCardEl(rec())).not.toMatch(/terjemahan:\s*</i);
  });
});

describe("the display cap is a wall here too", () => {
  test("renders at most MAX_DISPLAY_CARDS however many are passed", () => {
    const many = [rec({ id: "a" }), rec({ id: "b" }), rec({ id: "c" }), rec({ id: "d" })];
    const html = hadithCardsEl(many);
    expect(html.match(/<article class="hadith"/g)!.length).toBe(MAX_DISPLAY_CARDS);
  });

  test("an empty list renders nothing at all — not an empty container", () => {
    expect(hadithCardsEl([])).toBe("");
  });
});

describe("escaping", () => {
  test("hostile text in a corpus field cannot inject markup", () => {
    const html = hadithCardEl(rec({ bab_en: '"><script>alert(1)</script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("hadithRef", () => {
  test("reads as a human citation", () => {
    expect(hadithRef(rec())).toBe("Sahih Muslim 154");
  });
});
