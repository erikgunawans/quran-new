import { describe, expect, test } from "bun:test";
import { passageHtml, type PassageAyah } from "./passage.ts";

/**
 * The demo draws its own verse card, so co-display had to be built twice. These tests exist to
 * make sure the SECOND one kept the restraint of the first (web/src/codisplay.test.ts): the
 * context must appear, must not be dismissible, must not be re-captioned in our words, and must
 * not duplicate its own subject.
 *
 * The demo is the only surface Erik shows people. A conditional approval rendered wrong here is
 * the ustadz's name on a claim he did not make, in front of an audience.
 */
const passage3: PassageAyah[] = [
  { ayah: 5, arabic: "ARABIC_5", primary: { text: "PRIMARY_5" } },
  { ayah: 6, arabic: "ARABIC_6", primary: { text: "PRIMARY_6" } },
  { ayah: 7, arabic: "ARABIC_SUBJECT", primary: { text: "PRIMARY_SUBJECT" } },
];

const both = (surah: number, subject: number, p?: PassageAyah[]): string =>
  passageHtml(surah, subject, p, "before") + passageHtml(surah, subject, p, "after");

describe("a verse with no condition is untouched", () => {
  test("no passage markup at all when there is no passage", () => {
    expect(both(92, 7, undefined)).toBe("");
    expect(both(92, 7, [])).toBe("");
  });
});

describe("required context is shown", () => {
  test("every neighbouring ayah in the range appears", () => {
    const html = both(92, 7, passage3);
    expect(html).toContain("ARABIC_5");
    expect(html).toContain("ARABIC_6");
    expect(html).toContain("PRIMARY_5");
    expect(html).toContain("PRIMARY_6");
  });

  test("neighbours are labelled with their own references", () => {
    const html = both(92, 7, passage3);
    expect(html).toContain("92:5");
    expect(html).toContain("92:6");
  });

  test("a neighbour with no interpretive reading renders its Arabic anyway", () => {
    const html = both(92, 7, [{ ayah: 6, arabic: "ARABIC_6", primary: null }]);
    expect(html).toContain("ARABIC_6");
    expect(html).not.toContain("qk-passage-tr");
  });
});

describe("the subject is not duplicated", () => {
  test("the range contains its subject; the layout skips it", () => {
    const html = both(92, 7, passage3);
    expect(html).not.toContain("ARABIC_SUBJECT");
    expect(html).not.toContain("PRIMARY_SUBJECT");
  });
});

describe("mushaf order is preserved around the subject", () => {
  test("earlier ayahs go above, later ayahs go below", () => {
    const around: PassageAyah[] = [
      { ayah: 25, arabic: "AR_25", primary: { text: "TR_25" } },
      { ayah: 26, arabic: "AR_26", primary: { text: "TR_26" } },
      { ayah: 27, arabic: "AR_27", primary: { text: "TR_27" } },
    ];
    const before = passageHtml(20, 26, around, "before");
    const after = passageHtml(20, 26, around, "after");
    expect(before).toContain("AR_25");
    expect(before).not.toContain("AR_27");
    expect(after).toContain("AR_27");
    expect(after).not.toContain("AR_25");
    // and neither side lays out the subject
    expect(before + after).not.toContain("AR_26");
  });

  test("a range entirely on one side leaves the other side empty, not blank markup", () => {
    expect(passageHtml(92, 7, passage3, "after")).toBe("");
  });
});

describe("context is not dismissible", () => {
  test("no disclosure wraps it — 'shown together' cannot mean 'shown if you ask'", () => {
    const html = both(92, 7, passage3);
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain("aria-expanded");
    // The `hidden` ATTRIBUTE, not the substring — `aria-hidden` on the decorative ref label is
    // correct and must not trip this. The demo hides the literal Kemenag rendering with exactly
    // this attribute (`<div class="qk-harf" hidden>`), so it is the real thing to guard against.
    expect(html).not.toMatch(/\shidden[=\s>]/);
  });
});

describe("our words stay on the verse they were written for", () => {
  test("neighbours carry no translation tag and no translator byline", () => {
    const html = both(92, 7, passage3);
    expect(html).not.toContain("Terjemahan");
    expect(html).not.toContain("qk-reading");
    expect(html).not.toContain("oleh");
  });

  test("neighbours carry no verse actions", () => {
    const html = both(92, 7, passage3);
    expect(html).not.toContain("qk-act");
    expect(html).not.toContain("<button");
  });
});

/**
 * There is deliberately NO malformed-ref block here any more.
 *
 * An earlier version took the ref as a string, re-derived the ayah number with a regex, and threw
 * on a bad parse — with ten tests pinning that throw, including near-misses like `"20:"` which
 * `Number("")` would have silently turned into ayah 0. All of it defended a conversion that never
 * needed to happen: the subject's ayah arrives as a number from `corpus.json`, and the ref is built
 * FROM it. Deleting the parse deleted the failure mode, which is why these tests are gone rather
 * than ported. `verse.ts` never had them either, for the same reason.
 */
describe("scripture is escaped like everything else", () => {
  test("markup in a neighbour's text cannot break out", () => {
    const html = passageHtml(92, 7, [{ ayah: 6, arabic: "<b>x</b>", primary: { text: "<script>y</script>" } }], "before");
    expect(html).not.toContain("<b>x</b>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;b&gt;");
  });
});
