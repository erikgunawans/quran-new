/**
 * THE READER SAW THE SYNTAX.
 *
 * Reported from the live app 2026-08-16 with a screenshot: mid-answer, in a paragraph about sins a
 * person does not notice themselves committing, the prose read
 *
 *   Salah satu yang paling sering tidak kita sadari adalah **sikap meremehkan dosa kecil**.
 *
 * asterisks and all. The model writes markdown; the render escapes before it linkifies (it must —
 * the other order hands a model-authored string an HTML injection surface), so the emphasis markers
 * survived escaping as literal text and shipped.
 */
import { describe, expect, test } from "bun:test";
import { mdEmphasis } from "./prose-format.ts";

describe("the reported defect", () => {
  test("the exact sentence from the screenshot renders as emphasis, not syntax", () => {
    const out = mdEmphasis(
      "Salah satu yang paling sering tidak kita sadari adalah **sikap meremehkan dosa kecil**. Kita berkata,",
    );
    expect(out).toBe(
      "Salah satu yang paling sering tidak kita sadari adalah <strong>sikap meremehkan dosa kecil</strong>. Kita berkata,",
    );
    expect(out).not.toContain("**");
  });

  test("italic too, since the same model writes both", () => {
    expect(mdEmphasis("kata *harfiyah* berarti literal")).toBe("kata <em>harfiyah</em> berarti literal");
  });

  test("more than one run in a paragraph", () => {
    expect(mdEmphasis("**satu** lalu **dua**")).toBe("<strong>satu</strong> lalu <strong>dua</strong>");
  });
});

describe("it runs after escaping, and must not undo that", () => {
  test("entities from esc() pass through untouched", () => {
    // This is what the function actually receives: esc() has already run.
    const escaped = "tanda &lt;kurung&gt; dan &amp; tetap **utuh**";
    expect(mdEmphasis(escaped)).toBe("tanda &lt;kurung&gt; dan &amp; tetap <strong>utuh</strong>");
  });

  test("it introduces no tag other than strong/em", () => {
    const out = mdEmphasis("**a** *b* &lt;script&gt;alert(1)&lt;/script&gt;");
    const tags = [...out.matchAll(/<\/?([a-z]+)/g)].map((m) => m[1]);
    expect([...new Set(tags)].sort()).toEqual(["em", "strong"]);
  });
});

describe("what it deliberately leaves alone", () => {
  test("a lone asterisk is not emphasis", () => {
    expect(mdEmphasis("harganya 5 * 3 rupiah")).toBe("harganya 5 * 3 rupiah");
  });

  test("asterisks with a gap do not swallow the sentence", () => {
    // The guard against a greedy match eating a whole paragraph between two unrelated markers.
    expect(mdEmphasis("bintang * di sini dan * di sana")).toBe("bintang * di sini dan * di sana");
  });

  test("emphasis does not span a paragraph break", () => {
    const s = "awal *satu\n\ndua* akhir";
    expect(mdEmphasis(s)).toBe(s);
  });

  test("headings and bullets are not emphasis and stay as written", () => {
    // Narrow by design: this is not a markdown renderer. If the model starts emitting headings at
    // the reader, that is a PROMPT problem, and silently rendering them would hide it.
    expect(mdEmphasis("## Kesimpulan")).toBe("## Kesimpulan");
    expect(mdEmphasis("- poin pertama")).toBe("- poin pertama");
  });

  test("prose with no markdown is returned byte-identical", () => {
    const s = "Allah mengingatkan dalam QS Ali Imran 3:131, \"Jauhkan diri dari siksa neraka.\"";
    expect(mdEmphasis(s)).toBe(s);
  });
});

describe("the sourced hadith surface", () => {
  test("the corpus's own markdown renders instead of showing as syntax", () => {
    // Real text from the sunnah.com export, seen live in the app: every narration opens this way.
    // Rendering it is presentation, NOT correction -- no word of the narration changes.
    const src = "**Narrated `Aisha:**\n\nWhen the Verses of Surat-al-Baqara regarding usury (i.e. Riba) were revealed";
    const out = mdEmphasis(src);
    expect(out).toContain("<strong>Narrated `Aisha:</strong>");
    expect(out).not.toContain("**");
    // The narration itself is untouched, to the byte.
    expect(out).toContain("When the Verses of Surat-al-Baqara regarding usury (i.e. Riba) were revealed");
  });
});
