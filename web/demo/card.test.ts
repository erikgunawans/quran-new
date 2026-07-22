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
    const html = shardCardHtml(20, "Taha", { a: 26, ar: "AR", p: { text: "TR", translator: "Uji", translation_type: "interpretive" }, c: null });
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
      // Boundary-matched, NOT substring. `.qk-passage` is a substring of `.qk-passage-before`, so
      // a plain toContain would let the bare `.qk-passage` rule — the one carrying the visual
      // subordination this test exists to defend — be deleted outright while still passing.
      expect(html).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
      expect(css).toMatch(new RegExp(`\\.${cls}\\s*[,{]`));
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

  /**
   * This pins the SPLIT, not a sort, and the fixture is shuffled so it can actually fail.
   *
   * The earlier version of this test fed a pre-sorted fixture and asserted 57<58<59<60<61. That
   * proved nothing: `passageHtml` does not sort, it preserves input order, so the assertion was
   * satisfied by the literal array and no renderer change could break it. What the renderer DOES
   * decide is which side of the subject each ayah lands on — so that is what gets tested, with an
   * input deliberately out of order.
   *
   * Intra-group ordering is the BUILDER's contract, enforced where it belongs: build-corpus.ts
   * emits the range with `for (let n = from; n <= to; n++)` and fail()s a range that omits its own
   * subject. Sorting again here would defend against something the build makes impossible.
   */
  test("every ayah lands on the correct side of the subject, even from a shuffled range", () => {
    const shuffled: PassageAyah[] = [59, 57, 61, 58, 60].map((a) => ({
      ayah: a,
      arabic: `AR_${a}`,
      primary: { text: `TR_${a}` },
    }));
    const html = curatedCardHtml(verse({ ref: "23:60", surah: 23, ayah: 60, arabic: "AR_60", passage: shuffled }));
    const at = (a: number): number => html.indexOf(`AR_${a}`);
    // the subject renders once, in its true position between the two groups
    expect(html.split("AR_60").length - 1).toBe(1);
    for (const before of [57, 58, 59]) expect(at(before)).toBeLessThan(at(60));
    for (const after of [61]) expect(at(after)).toBeGreaterThan(at(60));
  });
});
