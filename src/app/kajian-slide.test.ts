/**
 * The slide is the artifact that gets POSTED. Every safety property ADR 5 states — no inferred
 * name, no unverified gelar, no bullet styled as a quote — either holds in this file or holds
 * nowhere, because by the time a PNG exists nothing downstream can inspect it.
 *
 * TWO OF THESE TESTS ARE WRITTEN AS FALSIFICATIONS RATHER THAN ASSERTIONS, deliberately:
 *
 *   · "no colour survives without :root" STRIPS the token block from the generated document and
 *     asserts nothing coloured is left. Reading the source and seeing `var(...)` everywhere would
 *     prove nothing — this repo has already had a retheme silently fail because literals were
 *     painted on top of tokens that did move. The only honest test removes the tokens.
 *
 *   · "the title never reaches the identity slot" slices the document BETWEEN the header markers
 *     and asserts the title is not in that slice, rather than asserting it appears somewhere. The
 *     title does appear — that is correct and required. What must never happen is it appearing
 *     where a reader takes it as our attribution.
 *
 * Each case's carrier text holds no second cue: the repo's last force-red did not go red because
 * the sentence under test tripped three other rules at once.
 */
import { describe, expect, it } from "bun:test";
import {
  DENIALS,
  carriesCredential,
  SLIDE_TOKENS,
  buildSlideHtml,
  escapeHtml,
  extractSlideBullets,
  extractSlideTopics,
  sanitizeQrSvg,
  type SlideInput,
} from "./kajian-slide.ts";
import type { RosterOutcome } from "./kajian-roster.ts";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "./kajian-render.ts";

const NONE: RosterOutcome = { kind: "none" };
const MATCH: RosterOutcome = {
  kind: "match",
  match: { entry: { name: "Ustadz Fulan bin Fulan", credentials: "Lc., M.A." }, via: "titleContains" },
};
const MATCH_NO_CRED: RosterOutcome = {
  kind: "match",
  match: { entry: { name: "Ustadz Fulan bin Fulan" }, via: "channelId" },
};
const AMBIGUOUS: RosterOutcome = { kind: "ambiguous", names: ["Ustadz A", "Ustadz B"] };

/** The real shape of the hazard: a name AND a gelar, written by the uploader, verified by nobody. */
const HAZARD_TITLE = "15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A.";

const base = (over: Partial<SlideInput> = {}): SlideInput => ({
  title: "Sabar Menghadapi Ujian",
  channel: "Masjid Darussalam Kota Wisata",
  url: "https://www.youtube.com/watch?v=abc123",
  speaker: NONE,
  bullets: ["Sabar bukan sikap pasif.", "Ujian datang bertingkat."],
  isDraft: false,
  ...over,
});

/**
 * The markup only. Every class NAME appears in the stylesheet whether or not the element is
 * rendered, so a whole-document `not.toContain("qs-speaker")` is an assertion that can never pass —
 * and one that "passed" would have been proving nothing.
 */
function bodyOf(html: string): string {
  return html.slice(html.indexOf("<body>"));
}

/** Everything outside the one `:root { … }` block. */
function withoutTokens(html: string): string {
  return html.replace(/:root\s*\{[\s\S]*?\}/, "");
}

// ── the document ───────────────────────────────────────────────────────────────────────────────

describe("the slide refuses a gelar too", () => {
  it("drops a bullet carrying a post-nominal, and names the reason", () => {
    const r = extractSlideBullets("- Ustadz Fulan, Lc. menjelaskan tiga perkara\n- Poin yang aman dan wajar\n");
    expect(r.bullets).toEqual(["Poin yang aman dan wajar"]);
    expect(r.dropped.map((d) => d.reason)).toContain("carries-a-credential");
  });

  it("KEEPS a sourced citation — `Prof.` and `Dr.` are pre-nominal, not credentials", () => {
    /**
     * This is the test the revert needed and did not have. `prof` and `dr` were added to the
     * pattern once; the suite stayed green, and what they actually deleted was the briefing's
     * SOURCED points — "menurut Dr. X in kitab Y" — while keeping its unsourced ones. A screen
     * whose errors have a direction is worse than one with none, and nothing caught it.
     */
    const sourced = [
      "Menurut Prof. Dr. M. Quraish Shihab dalam Tafsir Al-Mishbah, ayat ini tentang sabar",
      "Dr. Yusuf al-Qaradawi menulis tentang fiqih prioritas",
      "Materi ini dinukil dr. buku beliau",
    ];
    for (const line of sourced) {
      expect(carriesCredential(line)).toBe(false);
      expect(extractSlideBullets(`- ${line}\n`).bullets).toEqual([line]);
    }
  });

  it("does not fire on ordinary prose — the screen only ever REMOVES", () => {
    // The screen only ever REMOVES, and it must not fire on ordinary prose.
    const r = extractSlideBullets("- Amar ma'ruf nahi munkar adalah kewajiban bersama\n");
    expect(r.bullets).toEqual(["Amar ma'ruf nahi munkar adalah kewajiban bersama"]);
  });
});

describe("buildSlideHtml — the document", () => {
  it("is one complete standalone HTML document", () => {
    const html = buildSlideHtml(base());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
  });

  it("references nothing external — Chrome renders it from file:// with no network", () => {
    const html = buildSlideHtml(base());
    expect(html).not.toMatch(/(?:src|href)\s*=\s*"(?:https?:)?\/\//);
    expect(html).not.toContain("@import");
  });

  it("renders without throwing when no bullet survived extraction", () => {
    const html = buildSlideHtml(base({ bullets: [] }));
    expect(html).toContain("</html>");
    expect(html).toContain("Ringkasan tidak tersedia");
  });
});

// ── identity: the ADR 5 property, at slide time ────────────────────────────────────────────────

describe("buildSlideHtml — who may be named", () => {
  it("names the speaker when the roster matched", () => {
    const html = buildSlideHtml(base({ speaker: MATCH }));
    expect(html).toContain("Ustadz Fulan bin Fulan");
    expect(html).toContain("Lc., M.A.");
  });

  it("renders a matched entry with no credentials, and invents no separator", () => {
    const body = bodyOf(buildSlideHtml(base({ speaker: MATCH_NO_CRED })));
    expect(body).toContain("Ustadz Fulan bin Fulan");
    expect(body).not.toContain("qs-cred");
    expect(body).not.toMatch(/Ustadz Fulan bin Fulan\s*,\s*</);
  });

  it("names nobody when the roster did not match", () => {
    const body = bodyOf(buildSlideHtml(base({ speaker: NONE })));
    expect(body).not.toContain("qs-speaker");
    expect(body).toContain("tidak menisbatkan");
  });

  it("treats two matches exactly like zero — ambiguity is absence, not a coin toss", () => {
    const body = bodyOf(buildSlideHtml(base({ speaker: AMBIGUOUS })));
    expect(body).not.toContain("qs-speaker");
    expect(body).not.toContain("Ustadz A");
    expect(body).not.toContain("Ustadz B");
  });

  /**
   * THE LOAD-BEARING ONE. The title is allowed on the slide and is required there — it is how a
   * reader knows which lecture this is. What is forbidden is the title sitting where the reader
   * reads it as OUR identification of a person. So this slices out the header and asserts the
   * title is not inside it, which is a different claim from "the title is absent".
   */
  it("keeps the uploader's title out of the identity slot, while still showing it as source", () => {
    const html = buildSlideHtml(base({ title: HAZARD_TITLE, speaker: NONE }));

    const header = html.slice(html.indexOf("<header>"), html.indexOf("</header>"));
    expect(header).not.toContain("SYARIFUL MAHYA");
    expect(header).not.toContain("L.C., M.A.");

    const source = html.slice(html.indexOf('class="qs-source"'));
    expect(source).toContain("SYARIFUL MAHYA");
    expect(source).toContain("Judul di YouTube, disalin apa adanya");
  });

  it("says on the artifact that it is a summary and not a quotation", () => {
    const html = buildSlideHtml(base());
    // Asserted through the SHARED constant, not a copy of its text: the slide, the briefing, the
    // spoken opening and the m4a panel all say this, and every one of them was typed separately
    // until they drifted apart. `Bukan kutipan` — the flat claim about the CONTENT — was withdrawn
    // because the screen behind it only detects paired quote marks.
    expect(html).toContain(DENIALS);
    expect(html).not.toContain("Bukan kutipan,");
  });

  it("styles no bullet as a quote — ADR 5", () => {
    const html = buildSlideHtml(base({ bullets: ["Sabar bukan sikap pasif."] }));
    const body = html.slice(html.indexOf('class="qs-body"'), html.indexOf("</main>"));
    expect(body).not.toMatch(/<blockquote/);
    expect(body).not.toMatch(/class="[^"]*(?:quote|kutipan)/);
  });
});

// ── the draft band ─────────────────────────────────────────────────────────────────────────────

describe("buildSlideHtml — draft state", () => {
  it("carries an unmissable band when the briefing is a draft", () => {
    const html = buildSlideHtml(base({ isDraft: true }));
    expect(html).toContain("qs-draft");
    expect(html).toContain("belum boleh diposting");
  });

  it("carries no band when it is not", () => {
    const html = buildSlideHtml(base({ isDraft: false }));
    expect(html).not.toContain("belum boleh diposting");
    expect(html).not.toMatch(/<p class="qs-draft">/);
  });
});

// ── escaping ───────────────────────────────────────────────────────────────────────────────────

describe("escaping — every interpolated string is somebody else's typing", () => {
  it("escapes markup in a title", () => {
    const html = buildSlideHtml(base({ title: "<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes an ampersand in a roster name", () => {
    const speaker: RosterOutcome = {
      kind: "match",
      match: { entry: { name: "Ustadz Ali & Rekan" }, via: "channelId" },
    };
    expect(buildSlideHtml(base({ speaker }))).toContain("Ustadz Ali &amp; Rekan");
  });

  it("escapes the five characters and nothing else", () => {
    expect(escapeHtml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&#39;f");
  });
});

// ── tokens: falsified, not read ────────────────────────────────────────────────────────────────

describe("tokens — a literal painted on top would survive a retheme", () => {
  /**
   * Force-red: with `:root` gone, ANY colour still in the document is one the tokens do not
   * control. That is the whole failure mode — reading the source and seeing `var(...)` cannot
   * distinguish a themed surface from one with a literal sitting on it.
   */
  it("no colour survives when the token block is removed", () => {
    const rest = withoutTokens(buildSlideHtml(base({ qrSvg: sanitizeQrSvg(FAKE_QR) })));
    expect(rest).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(rest).not.toMatch(/\b(?:rgba?|hsla?|oklch|color-mix)\s*\(/i);
    expect(rest).not.toMatch(/:\s*(?:white|black|red|green|blue|grey|gray|silver)\s*[;}]/i);
  });

  it("no px size survives outside the token block either", () => {
    const rest = withoutTokens(buildSlideHtml(base()));
    expect(rest).not.toMatch(/\d+px/);
  });

  it("exports the tokens so a future design can be diffed against this one", () => {
    expect(Object.keys(SLIDE_TOKENS).length).toBeGreaterThan(20);
    expect(SLIDE_TOKENS["--qs-w"]).toBe("1920px");
    expect(SLIDE_TOKENS["--qs-h"]).toBe("1080px");
  });

  it("is actually wired — overriding one token changes the document", () => {
    const a = buildSlideHtml(base());
    const b = buildSlideHtml(base({ tokens: { "--qs-accent": "#123456" } }));
    expect(b).not.toBe(a);
    expect(b).toContain("--qs-accent: #123456;");
  });
});

// ── the QR ─────────────────────────────────────────────────────────────────────────────────────

const FAKE_QR = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- Created with qrencode 4.1.1 -->
<svg width="8.18cm" height="8.18cm" viewBox="0 0 29 29" version="1.1" xmlns="http://www.w3.org/2000/svg">
\t<g id="QRcode">
\t\t<rect x="0" y="0" width="29" height="29" fill="#ffffff"/>
\t\t<g id="Pattern" transform="translate(0,0)">
\t\t\t<rect x="0" y="0" width="1" height="1" fill="#000000"/>
\t\t</g>
\t</g>
</svg>`;

describe("sanitizeQrSvg", () => {
  it("drops the XML prolog and the comment — both are illegal mid-document", () => {
    const out = sanitizeQrSvg(FAKE_QR);
    expect(out.startsWith("<svg")).toBe(true);
    expect(out).not.toContain("<?xml");
    expect(out).not.toContain("Created with qrencode");
  });

  it("drops qrencode's centimetre sizing so CSS can size the QR", () => {
    const out = sanitizeQrSvg(FAKE_QR);
    expect(out).not.toContain("8.18cm");
    expect(out).toContain('viewBox="0 0 29 29"');
  });

  it("drops the hardcoded fills, so the QR retheres with everything else", () => {
    const out = sanitizeQrSvg(FAKE_QR);
    expect(out).not.toContain("#ffffff");
    expect(out).not.toContain("#000000");
    // the geometry is untouched — a stripped rect is still a module
    expect(out).toContain('<rect x="0" y="0" width="1" height="1"/>');
  });

  /**
   * REGRESSION. The first cut stripped `width=`/`height=` document-wide, which also took them off
   * every module rect — a QR that renders as a clean blank square, exits zero, and scans as
   * nothing. Nothing downstream of here could have noticed.
   */
  it("leaves the module rects their geometry — a QR with no module widths is a blank square", () => {
    const out = sanitizeQrSvg(FAKE_QR);
    expect(out).toContain('<rect x="0" y="0" width="1" height="1"/>');
    expect(out).toContain('viewBox="0 0 29 29"');
  });

  it("throws rather than emitting half a document when handed something that is not SVG", () => {
    expect(() => sanitizeQrSvg("qrencode: command not found")).toThrow(/no <svg>/);
  });
});

// ── bullets: mostly a study in refusal ─────────────────────────────────────────────────────────

describe("extractSlideBullets", () => {
  /**
   * REGRESSION, found by looking at the first real slide rather than by reading the code. The
   * briefing's Executive Summary comes back as an ORDERED list; the first cut matched only
   * `- * +`, skipped the summary entirely, and fell through to nested detail under the section
   * after it. Both halves of that failure are pinned here.
   */
  it("reads the Executive Summary in preference to whatever bullets come first", () => {
    const md = [
      "### EXECUTIVE SUMMARY",
      "",
      "1. **Kecerdasan** diukur dari perilaku.",
      "2. Kebodohan bukan soal pendidikan formal.",
      "",
      "### PEMBAHASAN UTAMA",
      "",
      "#### A. Definisi",
      "",
      "- Bukan diukur dari nilai akademis atau gelar",
    ].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual([
      "Kecerdasan diukur dari perilaku.",
      "Kebodohan bukan soal pendidikan formal.",
    ]);
    expect(out.bullets.join(" ")).not.toContain("nilai akademis");
  });

  /**
   * REGRESSION, found by a SECOND real run of the same video with the same prompt. The model wrote
   * the Executive Summary as a list the first time and as prose paragraphs the second, and the
   * scope preference turned that into an empty slide with forty usable bullets below it.
   */
  it("falls back to the whole document when the summary section carries no list at all", () => {
    const md = [
      "## EXECUTIVE SUMMARY",
      "",
      "Ceramah ini membahas kebodohan dalam perspektif Islam, bukan kecerdasan akademis.",
      "",
      "## PEMBAHASAN UTAMA",
      "",
      "- Kecerdasan versi Islam bertumpu pada perilaku.",
      "- Kebodohan adalah perbuatan yang disengaja.",
    ].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual([
      "Kecerdasan versi Islam bertumpu pada perilaku.",
      "Kebodohan adalah perbuatan yang disengaja.",
    ]);
  });

  it("keeps the summary's safety refusals visible even after falling back", () => {
    const md = [
      "## EXECUTIVE SUMMARY",
      "",
      `- Penceramah menutup dengan "sabar itu separuh iman" di akhir sesi.`,
      "",
      "## PEMBAHASAN UTAMA",
      "",
      "- Kebodohan adalah perbuatan yang disengaja.",
    ].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual(["Kebodohan adalah perbuatan yang disengaja."]);
    expect(out.dropped.some((d) => d.reason === "carries-a-quote")).toBe(true);
  });

  it("falls back to document order when the briefing has no summary section", () => {
    const md = ["#### A. Definisi", "", "- Poin pertama di sini.", "- Poin kedua di sini."].join("\n");
    expect(extractSlideBullets(md).bullets).toEqual(["Poin pertama di sini.", "Poin kedua di sini."]);
  });

  it("returns the briefing's summary bullets", () => {
    const md = ["## Ringkasan", "", "- Sabar itu bertingkat.", "- Ujian bukan hukuman.", "- Doa adalah senjata."].join("\n");
    expect(extractSlideBullets(md).bullets).toEqual([
      "Sabar itu bertingkat.",
      "Ujian bukan hukuman.",
      "Doa adalah senjata.",
    ]);
  });

  it("stops dead at the check-list heading — that section is what we are UNSURE of", () => {
    const md = [
      "- Sabar itu bertingkat.",
      "",
      "## Perlu dicek terhadap video (2)",
      "",
      "- **1:15** _(istilah)_ — nabi yunus dalam perut ikan",
      "- **4:02** _(rujukan)_ — riwayat bukhari nomor sekian",
    ].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual(["Sabar itu bertingkat."]);
    expect(out.bullets.join(" ")).not.toContain("bukhari");
  });

  it("drops a bullet whose reference the transcript could not resolve", () => {
    // carrier holds no quote, no emphasis, and is well under the length budget
    const md = "- Beliau menyebut sebuah ayat [rujukan tidak jelas dalam transkrip] pada bagian ini.";
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual([]);
    expect(out.dropped).toEqual([
      { reason: "unclear-reference", text: "Beliau menyebut sebuah ayat [rujukan tidak jelas dalam transkrip] pada bagian ini." },
    ]);
  });

  it("drops a bullet carrying a quotation — an unmarked quote on a slide is worse than a styled one", () => {
    // carrier holds no unclear marker and is short enough to pass every other rule
    const md = `- Penceramah menutup dengan "sabar itu separuh iman" di akhir sesi.`;
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual([]);
    expect(out.dropped[0]!.reason).toBe("carries-a-quote");
  });

  it("DROPS an over-long bullet rather than truncating it — an ellipsis can cut past a negation", () => {
    const long = `- ${"kata ".repeat(60).trim()}`;
    const out = extractSlideBullets(long);
    expect(out.bullets).toEqual([]);
    expect(out.dropped[0]!.reason).toBe("too-long");
    expect(out.dropped[0]!.text).not.toContain("…");
    expect(out.dropped[0]!.text).not.toContain("...");
  });

  it("reports every drop with its reason — a silent drop reads as 'the briefing had nothing'", () => {
    const md = [
      "- Sabar itu bertingkat.",
      "- Ada rujukan tidak jelas dalam transkrip di sini.",
      `- Beliau berkata "ini kalimatnya" lalu lanjut.`,
    ].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toHaveLength(1);
    expect(out.dropped.map((d) => d.reason)).toEqual(["unclear-reference", "carries-a-quote"]);
  });

  /**
   * The defaults are a MEASUREMENT of the rendered layout, not a preference. Pinned so that
   * changing one forces whoever changes it to re-render the real briefing and look at the PNG —
   * an overflowing body clips silently, and a clipped bullet reads as a complete sentence.
   */
  it("pins the measured layout budget — change it only after re-rendering and looking", () => {
    const four = Array.from({ length: 6 }, () => `- ${"x".repeat(100)}`).join("\n");
    const out = extractSlideBullets(four);
    expect(out.bullets).toHaveLength(4); // DEFAULT_MAX
    const over = Array.from({ length: 6 }, () => `- ${"y".repeat(170)}`).join("\n");
    const o2 = extractSlideBullets(over);
    expect(o2.bullets).toHaveLength(2); // 340 fits, 510 would not — DEFAULT_MAX_TOTAL_CHARS 480
    expect(o2.dropped.some((d) => d.reason === "over-budget")).toBe(true);
  });

  it("never returns more than max, and says what it left behind", () => {
    const md = Array.from({ length: 10 }, (_, i) => `- Poin nomor ${i + 1} di sini.`).join("\n");
    const out = extractSlideBullets(md, { max: 4 });
    expect(out.bullets).toHaveLength(4);
    expect(out.dropped).toHaveLength(6);
    expect(out.dropped.every((d) => d.reason === "over-max")).toBe(true);
  });

  it("strips inline markdown so a slide never shows a stray asterisk", () => {
    const md = "- **Sabar** itu _bertingkat_ dan `nyata`.";
    expect(extractSlideBullets(md).bullets).toEqual(["Sabar itu bertingkat dan nyata."]);
  });

  it("never lifts a line out of a blockquote — that is where the briefing keeps its disclaimers", () => {
    const md = ["> - Ringkasan otomatis, belum diperiksa.", "> Bukan fatwa."].join("\n");
    const out = extractSlideBullets(md);
    expect(out.bullets).toEqual([]);
    expect(out.dropped).toEqual([]);
  });
});

// ── the category strip ─────────────────────────────────────────────────────────────────────────

/**
 * A chip is an UNMARKED FRAGMENT sitting above the cards, so it is exactly as dangerous as a
 * bullet and runs exactly the same screens. The cases below are written so each one trips only the
 * rule under test — the repo's last force-red failed to go red because its carrier tripped three.
 *
 * ⚠ EVERY HEADING BELOW IS INVENTED, and must stay that way. This repo is PUBLIC, and a tracked
 * fixture already carries a line of a real lecture (ISC-627) — a promise of removal is outstanding
 * to its rights holder, so adding more is not a neutral act. The screens under test key on SHAPE
 * (a paired quote mark, a post-nominal, the unclear-reference marker), and an invented heading of
 * the same shape exercises them exactly as well as a real one would.
 */
describe("extractSlideTopics — the category strip", () => {
  it("takes the briefing's level-3 headings, without their numbering", () => {
    const r = extractSlideTopics("## PEMBAHASAN UTAMA\n### 1. Doa Harian\n### (2) Sabar\n### 3) Syukur\n");
    expect(r.topics).toEqual(["Doa Harian", "Sabar", "Syukur"]);
  });

  /**
   * THE LOAD-BEARING EXCLUSION. `#` is the document title, and the briefing writes the uploader's
   * YouTube title there verbatim — gelar and all. Reading level 1 would put a name we never
   * verified into a slot a reader takes as ours, which is the one thing ADR 5 exists to prevent.
   */
  it("never reads the document title or the section heading — only level three", () => {
    const r = extractSlideTopics("# TIGA TANDA SYUKUR | USTADZ FULAN, L.C.\n## PEMBAHASAN UTAMA\n### Sabar\n");
    expect(r.topics).toEqual(["Sabar"]);
  });

  it("drops a heading carrying a credential, and names the reason", () => {
    const r = extractSlideTopics("### Nasihat Ustadz Fulan, Lc.\n");
    expect(r.topics).toEqual([]);
    expect(r.dropped[0]?.reason).toBe("carries-a-credential");
  });

  it("drops a heading carrying a quotation — an unmarked quote on a chip has nowhere to be caveated", () => {
    const r = extractSlideTopics('### Makna Kata "Sabar" dalam Al-Qur\'an\n');
    expect(r.topics).toEqual([]);
    expect(r.dropped[0]?.reason).toBe("carries-a-quote");
  });

  it("drops a heading whose reference the transcript could not resolve", () => {
    const r = extractSlideTopics("### Dalil rujukan tidak jelas\n");
    expect(r.topics).toEqual([]);
    expect(r.dropped[0]?.reason).toBe("unclear-reference");
  });

  /** Same rule as the bullets: an ellipsis can cut past a negation, so half a topic never ships. */
  it("DROPS an over-long heading rather than truncating it", () => {
    const long = "A".repeat(120);
    const r = extractSlideTopics(`### ${long}\n`);
    expect(r.topics).toEqual([]);
    expect(r.dropped[0]).toEqual({ reason: "too-long", text: long });
  });

  it("stops dead at the check-list heading, exactly as the bullets do", () => {
    const r = extractSlideTopics("### Sabar\n## Perlu dicek terhadap video (32)\n### Menit 12:03\n");
    expect(r.topics).toEqual(["Sabar"]);
  });

  it("does not repeat a topic the briefing repeated", () => {
    expect(extractSlideTopics("### Sabar\n### sabar\n").topics).toEqual(["Sabar"]);
  });

  it("reports what it left behind rather than showing a shorter strip in silence", () => {
    const r = extractSlideTopics("### A\n### B\n### C\n### D\n### E\n### F\n### G\n", { max: 2 });
    expect(r.topics).toEqual(["A", "B"]);
    expect(r.dropped.map((d) => d.reason)).toEqual(["over-max", "over-max", "over-max", "over-max", "over-max"]);
  });

  it("bounds the SUM, not just each chip — the strip is one row and steals height from the cards", () => {
    const r = extractSlideTopics("### AAAAAAAAAA\n### BBBBBBBBBB\n", { maxChars: 20, maxTotalChars: 15 });
    expect(r.topics).toEqual(["AAAAAAAAAA"]);
    expect(r.dropped[0]?.reason).toBe("over-budget");
  });
});

describe("buildSlideHtml — the strip on the document", () => {
  it("renders a chip per topic", () => {
    const body = bodyOf(buildSlideHtml(base({ topics: ["Doa Harian", "Sabar"] })));
    expect(body).toContain("Doa Harian");
    expect(body).toContain("Sabar");
    expect(body.match(/class="qs-chip"/g)?.length).toBe(2);
  });

  /** An empty strip is a frame around a claim we could not make — and it steals card height. */
  it("omits the strip entirely when nothing survived the screens", () => {
    const body = bodyOf(buildSlideHtml(base({ topics: [] })));
    expect(body).not.toContain("qs-topics");
    expect(body).not.toContain('class="qs-chip"');
  });

  it("escapes a chip — a heading is model output, not a literal", () => {
    const body = bodyOf(buildSlideHtml(base({ topics: ["<script>alert(1)</script>"] })));
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });

  /**
   * The strip sits OUTSIDE `<header>`, so the header-slice test above cannot see it. Without this
   * case a topic naming the speaker would reach the slide through a door that guard does not watch.
   */
  it("keeps the uploader's title out of the strip as well as out of the header", () => {
    const html = buildSlideHtml(base({ title: HAZARD_TITLE, topics: ["Sabar"] }));
    const strip = html.slice(html.indexOf('class="qs-topics"'), html.indexOf("</nav>"));
    expect(strip).not.toContain("SYARIFUL MAHYA");
  });
});

// ── the landscape rewrite: what must survive it ────────────────────────────────────────────────

/**
 * ISC-624 changed the canvas, the panels and every card. These cases pin the three things Erik's
 * reference carries that we REFUSE — a borrowed logo, a scraped video thumbnail, a name the roster
 * never made — plus the one thing it does NOT carry that ADR 5 requires. All four are properties of
 * the document rather than of any one element, so none of them is covered by a class-name check.
 */
describe("buildSlideHtml — the landscape layout keeps the guardrails", () => {
  it("carries no image of any kind — no logo, no thumbnail, no embedded bytes", () => {
    const html = buildSlideHtml(base({ qrSvg: sanitizeQrSvg(FAKE_QR), topics: ["Sabar"] }));
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toMatch(/<picture\b/i);
    expect(html).not.toContain("data:image");
    expect(html).not.toMatch(/background-image\s*:/i);
  });

  /** The reference shows no such line. ADR 5 requires one, so the redesign may not lose it. */
  it("still says it is an automatic summary and not a quotation, after the rewrite", () => {
    expect(buildSlideHtml(base({ topics: ["Sabar"] }))).toContain(DENIALS);
  });

  it("numbers the cards SEMANTICALLY, so the order survives without the painted digit", () => {
    const html = buildSlideHtml(base({ bullets: ["Satu.", "Dua."] }));
    const main = html.slice(html.indexOf('class="qs-body"'), html.indexOf("</main>"));
    expect(main).toContain("<ol class=\"qs-cards\">");
    expect(main.match(/<li class="qs-card">/g)?.length).toBe(2);
    expect(main).toContain('class="qs-num" aria-hidden="true"');
  });

  /**
   * FALSIFICATION, not an assertion. A media query condition cannot take a `var()`, so a breakpoint
   * would put a length literal outside `:root` — and the honest fix was to build the reflow out of
   * `clamp()` and a wrapping flex row rather than to relax the force-red test to fit the layout.
   */
  it("reflows with no media query at all — every responsive step lives in the token block", () => {
    const html = buildSlideHtml(base());
    expect(html).not.toContain("@media");
    expect(html).not.toContain("@container");
    expect(html).toContain('name="viewport"');
  });

  /**
   * The portrait version clipped overflow as a net under the character budget, and the net hid what
   * it caught: a bullet cut at a line boundary reads as a finished sentence. The page grows now.
   */
  it("never clips its own body — an over-budget render must break VISIBLY", () => {
    const html = buildSlideHtml(base());
    expect(html).not.toMatch(/overflow\s*:\s*hidden/);
    expect(html).toContain("min-height: min(var(--qs-h), 100dvh)");
  });

  it("mirrors the canvas the renderer hands Chrome — one number out of step captures the phone layout", () => {
    expect(SLIDE_TOKENS["--qs-w"]).toBe(`${SLIDE_WIDTH}px`);
    expect(SLIDE_TOKENS["--qs-h"]).toBe(`${SLIDE_HEIGHT}px`);
  });
});
