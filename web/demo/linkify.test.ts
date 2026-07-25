import { describe, expect, test } from "bun:test";
import { linkifyRefs, renderInlineMarkdown, resolvedRefsInProse } from "./linkify.ts";

describe("renderInlineMarkdown", () => {
  test("**bold** → <strong>", () => {
    expect(renderInlineMarkdown("ada **114 surah** di sana")).toBe("ada <strong>114 surah</strong> di sana");
  });
  test("*italic* → <em>", () => {
    expect(renderInlineMarkdown("kata *rezeki* itu")).toBe("kata <em>rezeki</em> itu");
  });
  test("multiple bolds in one line, non-greedy", () => {
    expect(renderInlineMarkdown("**a** dan **b**")).toBe("<strong>a</strong> dan <strong>b</strong>");
  });
  test("bold wrapping a linkified ref stays intact", () => {
    const linked = linkifyRefs("lihat **QS Al-Baqarah ayat 286** ya");
    expect(renderInlineMarkdown(linked)).toContain("<strong><a class=\"qk-ref-link\"");
    expect(renderInlineMarkdown(linked)).toContain("</a></strong>");
  });
  test("a lone asterisk (bullet) is left alone", () => {
    expect(renderInlineMarkdown("* butir pertama")).toBe("* butir pertama");
  });
});

/**
 * The model writes verse references in prose. We link them into the mushaf — but only ones we can
 * resolve to a real surah + ayah, because a wrong jump is its own small lie. These tests pin both
 * halves: the references that MUST become links, and the ones that MUST stay plain text.
 */
describe("linkifyRefs — model prose references become mushaf links, safely", () => {
  test("a named reference with a range links to the first ayah (the screenshot case)", () => {
    const out = linkifyRefs("Rujuk ke surah Al-Isra' ayat 23-24 untuk berbakti.");
    expect(out).toContain(`href="#/mushaf/17/23"`);
    expect(out).toContain(`class="qk-ref-link"`);
    // The visible label is preserved verbatim (escaped).
    expect(out).toContain("Al-Isra&#39; ayat 23-24");
  });

  test("named references across spelling variants resolve", () => {
    expect(linkifyRefs("surah Luqman ayat 14")).toContain(`href="#/mushaf/31/14"`);
    expect(linkifyRefs("QS Al-Baqarah ayat 83")).toContain(`href="#/mushaf/2/83"`);
    expect(linkifyRefs("surat Al-Ankabut ayat 8")).toContain(`href="#/mushaf/29/8"`);
  });

  test("a bare numeric reference links; 'QS n:m' links once, not twice", () => {
    expect(linkifyRefs("Coba baca 2:255 pelan-pelan.")).toContain(`href="#/mushaf/2/255"`);
    const qs = linkifyRefs("Lihat QS 2:255.");
    expect(qs).toContain(`href="#/mushaf/2/255"`);
    expect(qs.match(/<a /g)?.length).toBe(1);
  });

  test("an out-of-bounds ayah is NOT linked — Al-Fatihah has 7 ayahs", () => {
    const out = linkifyRefs("Tidak ada 1:99 di mushaf.");
    expect(out).not.toContain("<a ");
    expect(out).toContain("1:99");
  });

  test("a nonexistent surah number is NOT linked", () => {
    expect(linkifyRefs("surah 200 ayat 3")).not.toContain("<a ");
    expect(linkifyRefs("999:1")).not.toContain("<a ");
  });

  test("an unknown surah NAME stays plain text", () => {
    const out = linkifyRefs("surah Narnia ayat 3");
    expect(out).not.toContain("<a ");
    expect(out).toContain("Narnia");
  });

  test("prose with no reference is returned escaped, unchanged in meaning", () => {
    expect(linkifyRefs("Semoga kamu tenang <3")).toBe("Semoga kamu tenang &lt;3");
  });
});

describe("resolvedRefsInProse — the ayat to render as cards, resolving names AND numbers", () => {
  test("recognises the NAMED form the model actually writes (this was the missing-cards bug)", () => {
    const prose = "Lihat QS Al-Isra' ayat 23, lalu QS Al-Baqarah ayat 83 dan QS Al-Ankabut ayat 8.";
    expect(resolvedRefsInProse(prose)).toEqual(["17:23", "2:83", "29:8"]);
  });
  test("numeric + named mix, in order, de-duped, only real ayat", () => {
    expect(resolvedRefsInProse("2:255 dan QS Luqman ayat 14, lalu 2:255 lagi, dan QS Narnia ayat 3"))
      .toEqual(["2:255", "31:14"]);
  });
});
