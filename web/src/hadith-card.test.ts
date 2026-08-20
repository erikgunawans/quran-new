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

  /**
   * REVERSED 2026-08-20 on Erik's ruling. This test previously asserted `English renders verbatim`,
   * and it was green for as long as the card was publishing text that
   * `docs/review/hadith-id-approval-2026-08-12.md` records sunnah.com's terms as covering for
   * "private research use" only. A passing test is exactly how that survived six handoffs of being
   * raised and never asked: the behaviour looked deliberate because something asserted it.
   *
   * `h.english` stays on the RECORD and stays in the model's user message
   * (`answer-contract.ts`) — the ruling was about PUBLISHING it, not about holding it.
   */
  test("the English narration is NOT published — sunnah.com's terms are private research use", () => {
    expect(html).not.toContain("Between a man and polytheism and unbelief there is the abandonment of prayer.");
    expect(html).not.toContain('class="hadith-en"');
  });

  test("the Arabic still carries the card — pulling the English must not empty it", () => {
    expect(html).toContain("حَدَّثَنَا أَبُو غَسَّانَ الْمِسْمَعِيُّ");
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

  /**
   * The credit went WITH the text it credited. "Terjemahan Inggris: Darussalam / Muhsin Khan" on a
   * card carrying no English credits an artifact the reader cannot see. This is an adjacent call I
   * made rather than one Erik ruled on — the ruling named `h.english` — and it is flagged as such.
   */
  test("the English translator credit goes with the English it credited", () => {
    expect(html).not.toContain("Darussalam / Muhsin Khan and the named translators");
    expect(html).not.toContain("Terjemahan Inggris");
  });

  test("the source link stays — attribution to sunnah.com is not what was withdrawn", () => {
    expect(html).toContain('href="https://sunnah.com/muslim:154"');
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
