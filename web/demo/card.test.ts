import { describe, expect, test } from "bun:test";
import { curatedCardHtml, shardCardHtml, type CuratedVerse } from "./card.ts";
import type { PassageAyah } from "./passage.ts";

/**
 * THE WIRING, not the renderer.
 *
 * `passage.test.ts` proves the passage renders correctly when it is handed over. These tests prove
 * it is handed over at all — which is the regression that actually threatens this mechanism. When
 * the card took `passage` as an optional sixth positional argument, deleting it at a call site
 * type-checked clean and passed every test in the suite; the verse would simply have appeared
 * without the context it was approved inside, silently, forever.
 *
 * The card now takes a curated verse WHOLE. These tests pin that.
 */
const passage: PassageAyah[] = [
  { ayah: 5, arabic: "ARABIC_5", primary: { text: "PRIMARY_5" } },
  { ayah: 6, arabic: "ARABIC_6", primary: { text: "PRIMARY_6" } },
  { ayah: 7, arabic: "ARABIC_SUBJECT", primary: { text: "PRIMARY_SUBJECT" } },
];

/**
 * 92:5-7 has its subject at the END of the range, so it exercises only the "before" side. Any test
 * about both sides needs a subject with neighbours on both — 20:26, approved inside 20:25-28.
 */
const straddling: PassageAyah[] = [25, 26, 27, 28].map((a) => ({
  ayah: a,
  arabic: `AR_${a}`,
  primary: { text: `TR_${a}` },
}));
const straddlingVerse: CuratedVerse = {
  ref: "20:26",
  surah: 20,
  ayah: 26,
  surah_name: "Taha",
  arabic: "AR_26",
  primary: { text: "TR_26", translator: "Uji", translation_type: "interpretive" },
  companion: { text: "COMPANION_26", translator: "Uji Kemenag", translation_type: "literal" },
  passage: straddling,
};

/** The 23:57-61 range: five ayahs with the subject (23:60) in the middle. */
const range23: PassageAyah[] = [57, 58, 59, 60, 61].map((a) => ({
  ayah: a,
  arabic: `AR_${a}`,
  primary: { text: `TR_${a}` },
}));

const verse = (over: Partial<CuratedVerse> = {}): CuratedVerse => ({
  ref: "92:7",
  surah: 92,
  ayah: 7,
  surah_name: "Al-Lail",
  arabic: "ARABIC_SUBJECT",
  primary: { text: "PRIMARY_SUBJECT", translator: "Uji", translation_type: "interpretive" },
  companion: { text: "COMPANION_SUBJECT", translator: "Uji Kemenag", translation_type: "literal" },
  ...over,
});

describe("a curated verse carries its condition into the card", () => {
  test("the required context renders — it cannot be left behind, there is no argument to forget", () => {
    const html = curatedCardHtml(verse({ passage }));
    expect(html).toContain("ARABIC_5");
    expect(html).toContain("ARABIC_6");
    expect(html).toContain("qk-passage");
  });

  test("a verse with no condition renders no passage markup at all", () => {
    expect(curatedCardHtml(verse())).not.toContain("qk-passage");
  });

  test("the subject still renders in full: its own Arabic, reading and translator", () => {
    const html = curatedCardHtml(verse({ passage }));
    expect(html).toContain("qk-verse-ar");
    expect(html).toContain("PRIMARY_SUBJECT");
    expect(html).toContain("Uji");
  });

  test("the subject is not duplicated — it appears once as itself, never as its own neighbour", () => {
    const html = curatedCardHtml(verse({ passage }));
    expect(html.split("ARABIC_SUBJECT").length - 1).toBe(1);
  });
});

describe("the required context is not behind the disclosure the companion is behind", () => {
  test("the literal companion is hidden; the passage is not", () => {
    const html = curatedCardHtml(straddlingVerse);
    // The companion's own wrapper carries `hidden` — that is our editorial choice about a
    // translation, and it is allowed. The passage must never be inside it.
    expect(html).toContain('<div class="qk-harf" hidden>');
    const beforeCompanion = html.slice(0, html.indexOf('<div class="qk-harf"'));
    expect(beforeCompanion).toContain("qk-passage-before");
    expect(beforeCompanion).toContain("qk-passage-after");
  });
});

describe("a shard ayah is a different act and says so", () => {
  test("a plain mushaf lookup renders the verse with no passage markup", () => {
    const html = shardCardHtml(20, 26, "Taha", "AR", { text: "TR", translator: "Uji", translation_type: "interpretive" }, null);
    expect(html).toContain("AR");
    expect(html).not.toContain("qk-passage");
  });
});

describe("the classes the stylesheet depends on", () => {
  /**
   * Renaming a class here does not fail typecheck and does not fail any behavioural test — the
   * neighbours simply stop being demoted and render at the subject's weight. That is the OPPOSITE
   * failure from a missing passage, and just as bad: context that reads as the answer.
   */
  test("each hook in demo.css is present on a card with a passage", async () => {
    const html = curatedCardHtml(straddlingVerse);
    const css = await Bun.file(new URL("./demo.css", import.meta.url)).text();
    for (const cls of ["qk-passage", "qk-passage-before", "qk-passage-after", "qk-passage-ayah", "qk-passage-ref", "qk-passage-ar", "qk-passage-tr"]) {
      expect(html).toContain(cls);
      expect(css).toContain(`.${cls}`);
    }
  });
});

describe("the whole range reaches the reader", () => {
  test("every ayah of the range renders exactly once across both sides plus the subject", () => {
    const html = curatedCardHtml(
      verse({ ref: "23:60", surah: 23, ayah: 60, arabic: "AR_60", primary: { text: "TR_60", translator: "Uji", translation_type: "interpretive" }, passage: range23 }),
    );
    for (const a of [57, 58, 59, 60, 61]) {
      expect(html.split(`AR_${a}`).length - 1).toBe(1);
    }
  });

  test("neighbours appear in mushaf order, not merely present", () => {
    const html = curatedCardHtml(verse({ ref: "23:60", surah: 23, ayah: 60, arabic: "AR_60", passage: range23 }));
    const at = (a: number): number => html.indexOf(`AR_${a}`);
    expect(at(57)).toBeLessThan(at(58));
    expect(at(58)).toBeLessThan(at(59));
    expect(at(59)).toBeLessThan(at(60)); // subject sits in its true position
    expect(at(60)).toBeLessThan(at(61));
  });
});
