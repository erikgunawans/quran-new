/**
 * Where an authored answer's verses land, and what a citation turns into.
 *
 * Tested at the module rather than through a rendered answer on purpose: an end-to-end check can tell
 * you a card appeared, but not WHICH rule put it there — and the rules that matter here are all about
 * position. Same reason the affix guards are unit-tested against their predicate.
 */
import { describe, expect, test } from "bun:test";
import { ayahHref, linkifyRefs, planAnswerLayout, refsInParagraph } from "./answer-layout.ts";

// The mushaf bounds that matter for these cases: Al-Baqarah 286, Thaha 135, An-Nisa 176, Al-Ikhlas 4.
const BOUNDS: Record<number, number> = { 2: 286, 4: 176, 20: 135, 94: 8, 112: 4 };
const isReal = (ref: string): boolean => {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref);
  if (!m) return false;
  const max = BOUNDS[Number(m[1])];
  return !!max && Number(m[2]) >= 1 && Number(m[2]) <= max;
};

describe("a citation becomes a door into the reading surface", () => {
  test("links to the exact ayah, matching the reviewed-aqidah link shape", () => {
    expect(ayahHref(2, 155)).toBe("#/surah/2#155");
  });

  test("a bare ref is linked", () => {
    expect(linkifyRefs("Lihat 2:155 ya.", isReal)).toBe(
      `Lihat <a class="ai-ref" href="#/surah/2#155">2:155</a> ya.`,
    );
  });

  test.each(["QS 2:155", "QS. 2:155", "Q.S. 2:155", "2.155"])(
    "the form the model actually writes is linked: %s",
    (written) => {
      expect(linkifyRefs(`Seperti ${written} misalnya.`, isReal)).toContain(`href="#/surah/2#155"`);
    },
  );

  test("the QS prefix is swallowed INTO the link, not left stranded beside it", () => {
    // A link reading "2:155" next to a loose "QS" is the seam that makes an interface feel assembled.
    expect(linkifyRefs("Lihat QS 2:155.", isReal)).toBe(
      `Lihat <a class="ai-ref" href="#/surah/2#155">QS 2:155</a>.`,
    );
  });

  test("a ref the mushaf does NOT have stays plain text", () => {
    // A link is a promise that something is on the other side. Al-Ikhlas has 4 ayahs.
    expect(linkifyRefs("Katanya 112:99 begitu.", isReal)).toBe("Katanya 112:99 begitu.");
    expect(linkifyRefs("Surah 999:1 tidak ada.", isReal)).toBe("Surah 999:1 tidak ada.");
  });

  test("ordinary numbers in prose are untouched", () => {
    expect(linkifyRefs("Puasanya 30 hari, sholat 5 waktu.", isReal)).toBe("Puasanya 30 hari, sholat 5 waktu.");
  });

  test("escaped prose survives linkification unharmed", () => {
    // linkifyRefs MUST run on already-escaped input — it injects markup, and the prose is
    // model-authored. This pins that escaping upstream is not undone here.
    const escaped = "Kata &quot;sabar&quot; muncul di 2:155 &amp; 2:153.";
    const out = linkifyRefs(escaped, isReal);
    expect(out).toContain("&quot;sabar&quot;");
    expect(out).toContain("&amp;");
    expect(out).not.toContain("<script");
  });
});

describe("cards sit under the paragraph that cites them", () => {
  const prose = [
    "Rasa takut itu manusiawi, dan Al-Qur'an menyebutnya terang-terangan di QS 2:155.",
    "Tapi kesulitan tidak pernah berdiri sendiri. Ada janji yang menyertainya, seperti dalam QS 94:6.",
  ].join("\n\n");

  test("two verses cited in two paragraphs land in two places", () => {
    const { blocks, trailing } = planAnswerLayout(prose, ["2:155", "94:6"], isReal);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.refs).toEqual(["2:155"]);
    expect(blocks[1]!.refs).toEqual(["94:6"]);
    expect(trailing).toEqual([]);
  });

  test("the prose between them is preserved verbatim and in order", () => {
    const { blocks } = planAnswerLayout(prose, ["2:155", "94:6"], isReal);
    expect(blocks.map((b) => b.para)).toEqual(prose.split("\n\n"));
  });

  test("a verse cited twice renders once, under its FIRST mention", () => {
    const p = "Ada di QS 2:155.\n\nSeperti QS 2:155 tadi, sabar itu berat.";
    const { blocks, trailing } = planAnswerLayout(p, ["2:155"], isReal);
    expect(blocks[0]!.refs).toEqual(["2:155"]);
    expect(blocks[1]!.refs).toEqual([]);
    expect(trailing).toEqual([]);
  });

  test("two verses cited in the SAME paragraph stack together there", () => {
    const p = "Keduanya bicara soal ini: QS 2:155 dan QS 94:6.";
    const { blocks } = planAnswerLayout(p, ["2:155", "94:6"], isReal);
    expect(blocks[0]!.refs).toEqual(["2:155", "94:6"]);
  });

  test("a grounded verse the prose never cites still renders, at the bottom", () => {
    // Grounding and citation are not the same set. Dropping an uncited verse would be a CONTENT
    // change wearing a layout change's clothes — the old behaviour is preserved for exactly this case.
    const { blocks, trailing } = planAnswerLayout("Sabar itu berat ya.", ["2:155"], isReal);
    expect(blocks[0]!.refs).toEqual([]);
    expect(trailing).toEqual(["2:155"]);
  });

  test("a ref cited in prose but NOT grounded this turn places no card", () => {
    // The prose may name a real ayah we did not build a card for (a dropped shard, or a citation
    // beyond MAX_CARDS). It still links — it is a real ayah — but nothing is placed.
    const { blocks, trailing } = planAnswerLayout("Lihat QS 20:14 juga.", [], isReal);
    expect(blocks[0]!.refs).toEqual([]);
    expect(trailing).toEqual([]);
  });

  test("an answer with no verses at all is just its paragraphs", () => {
    const { blocks, trailing } = planAnswerLayout("Satu.\n\nDua.", [], isReal);
    expect(blocks.map((b) => b.para)).toEqual(["Satu.", "Dua."]);
    expect(trailing).toEqual([]);
  });

  test("blank lines and stray whitespace do not create empty paragraphs", () => {
    const { blocks } = planAnswerLayout("Satu.\n\n\n\n   \n\nDua.", [], isReal);
    expect(blocks).toHaveLength(2);
  });
});

describe("refsInParagraph", () => {
  test("returns real citations in written order, de-duped", () => {
    expect(refsInParagraph("QS 94:6, lalu 2:155, lalu QS 94:6 lagi.", isReal)).toEqual(["94:6", "2:155"]);
  });

  test("skips citations the mushaf does not have", () => {
    expect(refsInParagraph("QS 112:99 dan QS 2:155.", isReal)).toEqual(["2:155"]);
  });
});
