import { describe, expect, test } from "bun:test";
import { verseEl, type VerseCard } from "./verse.ts";

/**
 * Co-display renders the context a scholar made a CONDITION of approving a verse.
 *
 * The interesting properties are all about restraint: the context must appear, must not be
 * dismissible, must not be re-captioned with our words, and must not duplicate its own subject.
 * Each of those, violated, turns a conditional approval into a claim he did not make.
 */
const base = (over: Partial<VerseCard> = {}): VerseCard => ({
  ref: "92:7",
  surah: 92,
  ayah: 7,
  surah_name: "Al-Lail",
  arabic: "ARABIC_SUBJECT",
  primary: { text: "PRIMARY_SUBJECT", translator: "Uji" },
  companion: { text: "COMPANION_SUBJECT", translator: "Uji Kemenag" },
  why: "WHY_SUBJECT",
  ...over,
});

const passage3 = [
  { ayah: 5, arabic: "ARABIC_5", primary: { text: "PRIMARY_5", translator: "Uji" }, companion: null },
  { ayah: 6, arabic: "ARABIC_6", primary: { text: "PRIMARY_6", translator: "Uji" }, companion: null },
  { ayah: 7, arabic: "ARABIC_SUBJECT", primary: { text: "PRIMARY_SUBJECT", translator: "Uji" }, companion: null },
];

describe("a verse with no condition is untouched", () => {
  test("renders no passage markup at all", () => {
    const html = verseEl(base());
    expect(html).not.toContain("passage");
  });
});

describe("required context is shown", () => {
  test("every neighbouring ayah in the range appears", () => {
    const html = verseEl(base({ passage: passage3 }));
    expect(html).toContain("ARABIC_5");
    expect(html).toContain("ARABIC_6");
    expect(html).toContain("PRIMARY_5");
    expect(html).toContain("PRIMARY_6");
  });

  test("neighbours are labelled with their own references", () => {
    const html = verseEl(base({ passage: passage3 }));
    expect(html).toContain("92:5");
    expect(html).toContain("92:6");
  });

  test("the subject is NOT duplicated — the range contains it, the layout skips it", () => {
    const html = verseEl(base({ passage: passage3 }));
    // Subject Arabic appears once (its own line), not twice (its own line + a passage row).
    expect(html.split("ARABIC_SUBJECT").length - 1).toBe(1);
    expect(html.split("PRIMARY_SUBJECT").length - 1).toBe(1);
  });
});

describe("context is not dismissible", () => {
  test("no disclosure wraps the passage — 'shown together' cannot mean 'shown if you ask'", () => {
    const html = verseEl(base({ passage: passage3 }));
    const before = html.slice(0, html.indexOf("ARABIC_5"));
    // The depth <details> exists lower in the card for the literal reading; what matters is that
    // the passage itself is not inside one.
    const passageBlock = html.slice(html.indexOf('class="passage'), html.indexOf("ARABIC_SUBJECT"));
    expect(passageBlock).not.toContain("<details");
    expect(passageBlock).not.toContain("<summary");
    expect(before).not.toContain("<details");
  });
});

describe("our sentence stays on the verse it was written for", () => {
  test("the caption appears once, on the subject — never repeated onto neighbours", () => {
    const html = verseEl(base({ passage: passage3 }));
    expect(html.split("WHY_SUBJECT").length - 1).toBe(1);
  });

  test("neighbours carry no caption element of their own", () => {
    const html = verseEl(base({ passage: passage3 }));
    const passageBlock = html.slice(html.indexOf('class="passage'), html.indexOf("ARABIC_SUBJECT"));
    expect(passageBlock).not.toContain('class="why"');
  });
});

describe("passage order follows the mushaf", () => {
  test("ayahs before the subject render above it, ayahs after render below", () => {
    const spanning = [
      { ayah: 25, arabic: "AR_25", primary: { text: "TR_25", translator: "U" }, companion: null },
      { ayah: 26, arabic: "ARABIC_SUBJECT", primary: { text: "PRIMARY_SUBJECT", translator: "U" }, companion: null },
      { ayah: 27, arabic: "AR_27", primary: { text: "TR_27", translator: "U" }, companion: null },
      { ayah: 28, arabic: "AR_28", primary: { text: "TR_28", translator: "U" }, companion: null },
    ];
    const html = verseEl(base({ ref: "20:26", surah: 20, ayah: 26, passage: spanning }));
    const i25 = html.indexOf("AR_25");
    const iSub = html.indexOf("ARABIC_SUBJECT");
    const i27 = html.indexOf("AR_27");
    const i28 = html.indexOf("AR_28");
    expect(i25).toBeGreaterThan(-1);
    expect(i25).toBeLessThan(iSub);
    expect(iSub).toBeLessThan(i27);
    expect(i27).toBeLessThan(i28);
  });

  test("a range entirely before the subject still renders", () => {
    const html = verseEl(
      base({
        ref: "41:35",
        surah: 41,
        ayah: 35,
        passage: [
          { ayah: 34, arabic: "AR_34", primary: { text: "TR_34", translator: "U" }, companion: null },
          { ayah: 35, arabic: "ARABIC_SUBJECT", primary: { text: "PRIMARY_SUBJECT", translator: "U" }, companion: null },
        ],
      }),
    );
    expect(html).toContain("AR_34");
    expect(html.indexOf("AR_34")).toBeLessThan(html.indexOf("ARABIC_SUBJECT"));
  });
});
