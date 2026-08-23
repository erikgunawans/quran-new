/**
 * THE SLIDE — one page, one image, and the place where every ADR-5 hazard actually lands.
 *
 * A briefing is read; a slide is scrolled past. Everything that made `briefing.md` honest — a
 * footnote under the title, a paragraph of provenance, the ability to scroll back — is unavailable
 * in a graphic sitting in someone's feed. So the honesty has to be structural here, not captioned.
 *
 * ── THE ONE DECISION THIS FILE EXISTS TO ENFORCE ────────────────────────────────────────────────
 *
 * THE VIDEO TITLE NEVER OCCUPIES THE IDENTITY SLOT. The roster (`kajian-roster.ts`) was built so an
 * unmatched video carries no name, no gelar and no face. But `meta.title` is carried verbatim
 * through the whole pipeline, and the first real title this tool processed was
 * "TUJUH TANDA KEBODOHAN | USTADZ FULAN HAMID, L.C., M.A." — a name AND a credential, written by
 * the uploader, checked by nobody. Render that as the slide's headline and the roster bought
 * nothing: a public graphic, under our name, asserting a gelar we never verified about a real
 * person who may well have earned a different one.
 *
 * So the slide's heading is the fixed string "Ringkasan Kajian", which asserts nothing about anyone.
 * The title appears exactly once, inside the source block beside the QR, under a label saying it is
 * YouTube's own wording. Quoting a listing is not the same act as claiming it — but only if the
 * layout keeps them visibly different, which is what `qs-speaker` (roster only) and `qs-source`
 * (YouTube's words) are for.
 *
 * ── WHY BULLETS ARE EXTRACTED AND NEVER GENERATED ───────────────────────────────────────────────
 *
 * The obvious build is a second model call: "summarise this briefing into four slide bullets". It
 * reads better and it is a second opportunity to invent an attribution, on the artifact where an
 * invented attribution costs the most. `extractSlideBullets` is therefore plain text handling over
 * a briefing that already exists, and its whole cleverness is in what it REFUSES to carry across.
 *
 * ── WHY NOTHING IS EVER TRUNCATED ───────────────────────────────────────────────────────────────
 *
 * A bullet too long for the slide is DROPPED and reported, never ellipsed. An ellipsis can land on
 * the far side of a negation and invert a sentence, and this repo has already paid for a quote cut
 * one clause short at exactly the clause that mattered. Losing a point loudly beats keeping a
 * mangled one quietly.
 *
 * ── TOKENS ──────────────────────────────────────────────────────────────────────────────────────
 *
 * Every colour, size and space is a custom property in ONE `:root` block, because Erik ships a
 * firmed visual design later and it must drop in as a token swap. This repo has already had a
 * retheme silently fail: `:root` moved and the surfaces did not, because literals were painted on
 * top. The test for that is a force-red — strip `:root` from the output and assert nothing coloured
 * survives — not a reading of the source.
 */

import type { RosterOutcome } from "./kajian-roster.ts";

// ── tokens ─────────────────────────────────────────────────────────────────────────────────────

/**
 * The whole visual surface, as data.
 *
 * Exported rather than inlined so a future design can be DIFFED against this one, and so a caller
 * can override a single value without a find-and-replace through a template string. Deliberately
 * neutral: greys, one restrained accent, no brand. Erik firms this later.
 */
export const SLIDE_TOKENS: Readonly<Record<string, string>> = {
  // ── canvas ───────────────────────────────────────────────────────────────────────────────────
  // LANDSCAPE, two-panel — Erik's reference, 2026-08-23. The portrait 1080x1350 it replaces was a
  // single column; two panels need width, and 16:9 is the one landscape ratio that is already the
  // native frame of the thing being summarised.
  //
  // ⚠ `--qs-h` is a FLOOR, not a fixed height. `.qs-slide` takes `min(var(--qs-h), 100dvh)`, so at
  // the render window it is exactly the canvas and on a phone it is the viewport. There is NO media
  // query anywhere in this document — every responsive step is a `clamp()` INSIDE this block, which
  // is what keeps the force-red test ("no px survives outside :root") honest rather than relaxed.
  "--qs-w": "1920px",
  "--qs-h": "1080px",
  "--qs-pad": "clamp(24px, 3.35vw, 64px)",

  // panel geometry. The two panels are one wrapping flex row: at canvas width both bases fit, and
  // below roughly 1000px the side rail wraps under the cards on its own. No breakpoint declares it.
  "--qs-main-basis": "1120px",
  "--qs-main-min": "min(100%, 520px)",
  "--qs-side-basis": "420px",
  "--qs-side-min": "min(100%, 320px)",
  "--qs-col-gap": "clamp(20px, 2.5vw, 48px)",

  // ── ink + ground ─────────────────────────────────────────────────────────────────────────────
  "--qs-ground": "#f6f5f2",
  "--qs-ink": "#1b1c1e",
  "--qs-ink-soft": "#5d6166",
  "--qs-ink-faint": "#8b9096",
  "--qs-rule": "#d9d7d1",
  "--qs-accent": "#2f6f57",
  "--qs-panel": "#ffffff",

  // numbered cards
  "--qs-card-ground": "#ffffff",
  "--qs-card-rule": "#e7e5df",
  "--qs-num-ground": "#2f6f57",
  "--qs-num-ink": "#ffffff",

  // category strip. A chip is single-line by construction (topics over the cap are DROPPED, never
  // wrapped), so the stadium shape is intended here — but the radius is still a fixed token, not
  // `999px`, because a `999px` corner clamps to half the box height and silently becomes a
  // different shape on any row that does wrap. See memory: pill-radius-clamps-to-height.
  "--qs-chip-ground": "#e9efe9",
  "--qs-chip-ink": "#2c5c4a",
  "--qs-chip-radius": "20px",

  // draft band
  "--qs-draft-ground": "#8a1c1c",
  "--qs-draft-ink": "#ffffff",

  // qr — its own pair, because contrast here is functional rather than aesthetic
  "--qs-qr-ink": "#000000",
  "--qs-qr-paper": "#ffffff",
  "--qs-qr-size": "clamp(132px, 9.2vw, 176px)",
  "--qs-qr-pad": "16px",

  // ── type ─────────────────────────────────────────────────────────────────────────────────────
  "--qs-font": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "--qs-kicker-size": "clamp(13px, 1.25vw, 24px)",
  "--qs-kicker-track": "0.22em",
  "--qs-head-size": "clamp(30px, 3.15vw, 60px)",
  "--qs-head-track": "-0.01em",
  "--qs-speaker-size": "clamp(19px, 1.8vw, 34px)",
  "--qs-cred-size": "clamp(15px, 1.35vw, 26px)",
  "--qs-bullet-size": "clamp(17px, 1.62vw, 31px)",
  "--qs-bullet-leading": "1.4",
  "--qs-num-size": "clamp(14px, 1.3vw, 25px)",
  "--qs-chip-size": "clamp(13px, 1.15vw, 22px)",
  "--qs-source-size": "clamp(14px, 1.1vw, 21px)",
  "--qs-label-size": "clamp(12px, 0.9vw, 17px)",
  "--qs-draft-size": "clamp(14px, 1.25vw, 24px)",

  // ── spacing ──────────────────────────────────────────────────────────────────────────────────
  "--qs-gap-xs": "8px",
  "--qs-gap-sm": "16px",
  "--qs-gap-md": "clamp(16px, 1.5vw, 28px)",
  "--qs-gap-lg": "clamp(20px, 1.8vw, 34px)",
  "--qs-card-gap": "clamp(10px, 0.85vw, 16px)",
  "--qs-card-pad": "clamp(13px, 1.05vw, 20px)",
  "--qs-chip-gap": "clamp(7px, 0.6vw, 12px)",
  "--qs-chip-pad-x": "clamp(10px, 0.85vw, 16px)",
  "--qs-chip-pad-y": "clamp(5px, 0.45vw, 9px)",
  "--qs-num-box": "clamp(28px, 2.4vw, 46px)",
  "--qs-rule-weight": "2px",
  "--qs-radius": "10px",
  "--qs-card-radius": "14px",
  "--qs-draft-pad-y": "clamp(10px, 0.95vw, 18px)",
};

// ── escaping ───────────────────────────────────────────────────────────────────────────────────

/**
 * Everything interpolated into the document is untrusted: a YouTube title is whatever the uploader
 * typed, and a roster entry is whatever a tired person typed at midnight.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── the QR ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Make `qrencode`'s SVG safe to paste into the middle of an HTML document, and themeable.
 *
 * Three things have to go. The XML prolog and the DOCTYPE are illegal mid-document. The ROOT
 * element's `width`/`height` are in centimetres and would override any CSS sizing. And the `fill`
 * attributes are hardcoded `#000000`/`#ffffff` — colour literals that would survive a token swap,
 * which is the precise failure mode this file's docblock warns about. Stripping them lets the two
 * QR tokens drive the contrast, and the QR retheres with everything else.
 *
 * ⚠ THE SIZE STRIP IS SCOPED TO THE OPENING `<svg>` TAG, and the first cut of this function was
 * not. A document-wide `width=`/`height=` strip also removes them from every `<rect>`, and a QR
 * whose modules have no width is a blank square that renders cleanly, exits zero, and cannot be
 * scanned. Caught by the test asserting a module rect keeps its geometry.
 *
 * A presentation attribute cannot read a custom property, so the fills are removed rather than
 * rewritten to `var(...)`; the stylesheet re-applies them by structure (`svg > g > rect` is
 * qrencode's background, the nested `g`'s rects are the modules).
 */
export function sanitizeQrSvg(raw: string): string {
  const svgStart = raw.indexOf("<svg");
  if (svgStart === -1) throw new Error("sanitizeQrSvg: no <svg> element in the input");
  const svg = raw.slice(svgStart);
  const tagEnd = svg.indexOf(">");
  if (tagEnd === -1) throw new Error("sanitizeQrSvg: the <svg> element is never closed");
  const openTag = svg.slice(0, tagEnd + 1).replace(/\s(?:width|height)="[^"]*"/g, "");
  return (openTag + svg.slice(tagEnd + 1)).replace(/\sfill="[^"]*"/g, "").trim();
}

// ── bullets ────────────────────────────────────────────────────────────────────────────────────

/** Why a bullet did not make it onto the slide. Reported, never swallowed. */
export type BulletDropReason =
  | "unclear-reference"
  | "carries-a-quote"
  | "carries-a-credential"
  | "too-long"
  | "over-budget"
  | "over-max";

export interface DroppedBullet {
  readonly reason: BulletDropReason;
  readonly text: string;
}

export interface ExtractedBullets {
  readonly bullets: readonly string[];
  readonly dropped: readonly DroppedBullet[];
}

export interface ExtractOptions {
  /** Hard cap on how many bullets reach the slide. */
  readonly max?: number;
  /** Longest bullet the layout can hold without shrinking type past legibility. */
  readonly maxChars?: number;
  /**
   * Total characters across all bullets the body area can hold.
   *
   * THIS IS THE CONSTRAINT THAT ACTUALLY BINDS, and the first cut did not have it. A per-bullet cap
   * bounds one bullet and says nothing about four of them: the first real slide passed every
   * per-bullet check and rendered its last point straight through the QR and the source block.
   * The layout constrains the SUM, so the sum is what gets checked.
   */
  readonly maxTotalChars?: number;
}

const DEFAULT_MAX = 4;
const DEFAULT_MAX_CHARS = 200;
/**
 * MEASURED, NOT GUESSED — and the measurement is the only thing that makes this number honest.
 *
 * RE-MEASURED 2026-08-23 for the LANDSCAPE canvas (ISC-624). The portrait figure it replaces was
 * taken at 1080x1350 in a single column and does not transfer: the card column here is wider but
 * the page is 270px shorter, and each card adds its own padding, border and gap on top of its text.
 *
 * ⚠ WHAT BINDS IS THE WRAPPED LINE COUNT, NOT THE CHARACTER COUNT. 395 characters and 497 both
 * render as eight wrapped lines across four cards and occupy the same height; the budget is stated
 * in characters only because that is what the extractor can count before layout exists.
 *
 * The bracket, rendered at 1920x1080 with the draft band present and a full six-chip strip — the
 * tightest case, and the common one for auto-captioned video:
 *
 *   · 497 characters over four bullets — content ends at y≈988, and with the 64px bottom padding
 *     the page is ≈1052 tall. FITS the 1080 canvas with roughly 28px to spare.
 *   · 581 characters over four bullets — ten wrapped lines, content ends at y≈1064, page ≈1128.
 *     OVERFLOWS by ≈48px.
 *
 * 480 therefore sits inside the verified-fit region rather than at its edge.
 *
 * ⚠ NOTHING CLIPS ANY MORE, and that is the point. The portrait version put `overflow: hidden` on
 * the body as a net under this budget, and the net hid what it caught — a bullet cut at a line
 * boundary reads as a finished sentence. The page grows instead, so an over-budget render leaves a
 * card sliced by the fold: obviously broken rather than quietly wrong.
 *
 * ANY change to the type, card or spacing tokens invalidates this number. Re-render the real
 * briefing AND a ceiling case, and look at the PNG. Do not raise it by arithmetic.
 */
const DEFAULT_MAX_TOTAL_CHARS = 480;

/**
 * The marker the briefing prompt asks the model to write when a citation is garbled in the
 * transcript. On a slide there is nowhere to put that caveat and nobody to read it, so a bullet
 * carrying it does not travel.
 */
const UNCLEAR_MARKER = "rujukan tidak jelas";

/**
 * Anything after this heading is the CHECK LIST — the spans we are least sure about, with
 * timestamps. It is bullets, and it is the last thing that should reach a public graphic.
 */
const STOP_HEADING = /^#{1,6}\s*perlu dicek/i;

/**
 * ORDERED ITEMS COUNT. The first cut matched `- * +` only, and on the first real briefing that
 * skipped the entire Executive Summary — the model wrote it as `1. 2. 3. 4.` — and fell through to
 * the nested sub-points under the section after it. The slide shipped "Bukan diukur dari nilai
 * akademis atau gelar" as its opening line: a fragment of a definition, true in context and
 * meaningless out of it. Nothing was wrong with the code; the pattern simply did not describe how
 * the briefing is actually written.
 */
const BULLET_LINE = /^\s{0,3}(?:[-*+]|\d{1,2}[.)])\s+(.*)$/;

const ANY_HEADING = /^#{1,6}\s/;

/**
 * The section a briefing puts its actual takeaways in. Matched loosely because the prompt asks for
 * "a concise Executive Summary" in English while the body comes back in Indonesian, so the model
 * writes the heading either way.
 */
const SUMMARY_HEADING = /^#{1,6}\s*(?:executive\s+summary|ringkasan\s+eksekutif|ringkasan\s+utama)/i;

/**
 * The Executive Summary's lines, if the briefing has one — otherwise the whole document.
 *
 * PREFERRING THE SUMMARY IS THE WHOLE POINT. Document order gives whatever bullets appear first,
 * and in a briefing structured with headings those are detail nested under the first sub-topic, not
 * the top-line findings. This is the difference between a slide that says what the lecture was
 * about and one that says something true about its first ten minutes.
 */
function summaryScope(lines: readonly string[]): readonly string[] {
  const start = lines.findIndex((l) => SUMMARY_HEADING.test(l.trim()));
  // Returned BY IDENTITY so the caller can distinguish "no summary section" from "an empty one".
  if (start === -1) return lines;
  const after = lines.slice(start + 1);
  const end = after.findIndex((l) => ANY_HEADING.test(l.trim()));
  return end === -1 ? after : after.slice(0, end);
}

/**
 * ── THE THREE DENIALS, AS ONE STRING, FOR EVERY SURFACE ────────────────────────────────────────
 *
 * The slide, the briefing, the spoken narration and the audio file's description panel all have to
 * say this, and each one of them was typed separately. Predictably they drifted: the m4a panel
 * shipped carrying one denial of the three, and the slide kept asserting `Bukan kutipan` — a flat
 * claim about the CONTENT — after the spoken copy had already withdrawn it.
 *
 * That withdrawal is the substance here, not the tidiness. The screen behind denial #1 detects
 * PAIRED QUOTATION MARKS and nothing else, so a near-verbatim line the model wrote without quote
 * marks ships underneath it. "Tidak dimaksudkan sebagai kutipan" is a claim about our INTENT,
 * which this pipeline can always back; "bukan kutipan" is a claim about the text, which it cannot.
 *
 * `tidak` and not `bukan` on that first clause because `dimaksudkan` is a verb — `bukan` negates
 * nouns. It is spoken aloud in every narrated file, so the grammar is not cosmetic.
 */
export const DENIALS =
  "Tidak dimaksudkan sebagai kutipan, bukan fatwa, dan belum diperiksa ulama.";

/** A pair of quotation marks of any flavour Indonesian editors actually type. */
const QUOTE_PAIR = /["“”][^"“”]{2,}["“”]/;

/**
 * ── THE THREE SHARED REFUSALS ──────────────────────────────────────────────────────────────────
 *
 * Exported as PREDICATES, not as the regexes behind them, and used by `collect()` below rather
 * than sitting beside a second copy of the same test. `kajian-narration.ts` applies the identical
 * three to spoken prose, where a direct quotation is strictly more dangerous than it is on a slide.
 *
 * The seam is behavioural on purpose. This repo has already shipped a diagnostic that printed
 * `eligible:false` beside `records:2` because a report duplicated a gate instead of importing it:
 * both copies had tests, both passed, and they disagreed in production. One binding, two callers.
 */

/** The briefing carries a citation the model could not read off the transcript. */
export function hasUnclearReference(s: string): boolean {
  return s.toLowerCase().includes(UNCLEAR_MARKER);
}

/** The line reproduces someone's words. On a slide it is a publishing call; in audio it is worse. */
export function carriesQuotation(s: string): boolean {
  return QUOTE_PAIR.test(s);
}

/**
 * Post-nominal credentials as they appear in UPLOADER-WRITTEN strings — `Lc.`, `M.A.`, `S.Ag.`.
 *
 * ⚠ THE TRAILING PERIOD IS LOAD-BEARING. Written first without it, this pattern matched the bare
 * word "ma" — and `\bma\b` fires on "ma'ruf", because an apostrophe is a word boundary. Amar ma'ruf
 * nahi munkar is about as common a phrase as Indonesian dakwah has.
 *
 * Deliberately NOT a list of honorifics. Screening "Ustadz" or "Imam" would delete the briefing's
 * legitimate citations of classical authors ("kitab Raudhatul Uqala karya Imam Ibnu Hibban"), which
 * name a SOURCE rather than claim who spoke.
 */
const CREDENTIAL_TOKEN =
  /\b(?:l\.?c|m\.?a|s\.?ag|m\.?pd|s\.?pd|m\.?ud|k\.?h|s\.?h|m\.?si|m\.?hum|s\.?th|m\.?ag)\.(?!\p{L})/iu;

/**
 * The line carries a DOTTED POST-NOMINAL from the list above — `Lc.`, `M.A.`, `S.Ag.`, `M.Hum.`.
 *
 * ⚠ THIS SCREENS THE SLIDE TOO, and it did not at first. ADR 5 is not ambiguous — an unrostered
 * video renders "with the source link and no identity: no name, no face, NO CREDENTIALS" — but
 * `collect()` applied only the unclear-reference and quotation screens, so a briefing bullet
 * reading "Ustadz Fulan, Lc. menjelaskan…" went straight onto a public graphic with a name and a
 * gelar on it. That was already forbidden by the record; the code simply did not enforce it.
 *
 * ⚠ IT DOES NOT CLOSE ADR 5'S GAP, AND AN EARLIER COMMENT HERE SAID IT DID. What it catches is
 * exactly the dotted forms enumerated above. **`Ustadz Fulan Lc` and `Ustadz Fulan MA` — the
 * DOTLESS forms — are not caught**, and cannot be without matching the bare words "lc" and "ma",
 * which fire on `ma'ruf` (an apostrophe is a word boundary) and would delete real content from
 * every lecture that says amar ma'ruf nahi munkar. That trade is deliberate and the hole is real:
 * under-firing is the safe direction, but it is still a hole, and it is recorded as one rather
 * than pinned shut by a passing test.
 *
 * The honorific alone ("Ustadz Fulan") is likewise not screened here, because "Imam Ibnu Hibban"
 * in a citation is the same shape and must survive. The roster is what actually closes this.
 *
 * ⚠ `Prof.` AND `Dr.` WERE ADDED HERE ONCE AND TAKEN BACK OUT. They are PRE-nominal honorifics,
 * not post-nominal credentials, and adding them did exactly what the paragraph above says this
 * screen refuses to do: it deleted the briefing's SOURCED points while keeping its unsourced ones.
 * "Menurut Prof. Dr. M. Quraish Shihab dalam Tafsir Al-Mishbah…" and "Dr. Yusuf al-Qaradawi
 * menulis…" are citations of a source, not claims about who spoke — and in auto-captions `dr.` is
 * routinely just "dari". The bias had a direction, which is what made it worth reverting rather
 * than tuning.
 */
export function carriesCredential(s: string): boolean {
  return CREDENTIAL_TOKEN.test(s);
}

/** The heading after which everything is the unchecked check-list. Both surfaces stop here. */
export function isCheckListHeading(line: string): boolean {
  return STOP_HEADING.test(line.trim());
}

export function stripInlineMarkdown(s: string): string {
  return s
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:!?)]|$)/g, "$1$2")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull the slide's bullets out of a briefing that already exists.
 *
 * Deterministic on purpose — see the module docblock on why this is not a second model call. The
 * interesting behaviour is all refusal: it stops at the check-list heading, ignores blockquotes
 * (that is where the briefing keeps its disclaimers), and drops anything carrying an unclear
 * reference, a quotation, or more text than the layout can hold.
 */
export function extractSlideBullets(markdown: string, opts: ExtractOptions = {}): ExtractedBullets {
  const lines = markdown.split("\n");
  const scoped = summaryScope(lines);

  const first = collect(scoped, opts);
  if (first.bullets.length > 0 || scoped === lines) return first;

  /**
   * THE PREFERENCE MUST NEVER BECOME SILENCE, and it did on the second real briefing.
   *
   * `summaryScope` is right to prefer the Executive Summary — document order gives nested detail
   * from the first sub-topic instead of the findings. But the model writes that section as a LIST
   * on one run and as PROSE PARAGRAPHS on the next, from the identical prompt and the identical
   * transcript. On the prose run the scope matched, found no list items, and the slide rendered
   * "Ringkasan tidak tersedia" with forty perfectly good bullets sitting directly below it.
   *
   * So the summary is a preference, not a filter: if it yields nothing, the whole document is read
   * instead. Both passes' refusals are reported — a bullet dropped for carrying a quotation is a
   * publishing judgement and must not disappear because a later pass found other content.
   */
  const second = collect(lines, opts);
  return { bullets: second.bullets, dropped: [...first.dropped, ...second.dropped] };
}

/** One pass over a set of lines. Split out so the summary and the whole document share it exactly. */
function collect(lines: readonly string[], opts: ExtractOptions): ExtractedBullets {
  const max = opts.max ?? DEFAULT_MAX;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const maxTotalChars = opts.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS;

  const bullets: string[] = [];
  const dropped: DroppedBullet[] = [];
  let used = 0;

  for (const rawLine of lines) {
    if (isCheckListHeading(rawLine)) break;

    // The briefing's provenance notes are a blockquote, and some of them are bulleted inside it.
    if (/^\s{0,3}>/.test(rawLine)) continue;

    const m = BULLET_LINE.exec(rawLine);
    if (!m) continue;

    const text = stripInlineMarkdown(m[1] ?? "");
    if (!text) continue;

    if (hasUnclearReference(text)) {
      dropped.push({ reason: "unclear-reference", text });
      continue;
    }
    if (carriesQuotation(text)) {
      dropped.push({ reason: "carries-a-quote", text });
      continue;
    }
    if (carriesCredential(text)) {
      dropped.push({ reason: "carries-a-credential", text });
      continue;
    }
    if (text.length > maxChars) {
      dropped.push({ reason: "too-long", text });
      continue;
    }
    if (bullets.length >= max) {
      dropped.push({ reason: "over-max", text });
      continue;
    }
    if (used + text.length > maxTotalChars) {
      dropped.push({ reason: "over-budget", text });
      continue;
    }
    used += text.length;
    bullets.push(text);
  }

  return { bullets, dropped };
}

// ── topics ─────────────────────────────────────────────────────────────────────────────────────

/**
 * THE CATEGORY STRIP — what the lecture covered, as chips, above the cards.
 *
 * Erik's reference carries a strip of category pills. The briefing already has the only honest
 * source for them: its own `###` sub-headings, which the model wrote while summarising. Nothing is
 * invented here and nothing is inferred — a topic that is not a heading in the briefing does not
 * appear on the slide.
 *
 * ⚠ A CHIP IS AN UNMARKED FRAGMENT, so it runs the SAME three screens a bullet runs. A heading like
 * `### 4. Tujuan Penggunaan Istilah "Bodoh"` carries a quotation and does not travel; a heading
 * naming a person with a gelar would be an attribution the roster never made. The screens are
 * shared with the bullets deliberately — a second copy of them is a second thing to drift.
 *
 * ⚠ LEVEL THREE ONLY. `#` is the document title (which carries the uploader's title verbatim) and
 * `##` is the structural section (`PEMBAHASAN UTAMA`, `EXECUTIVE SUMMARY`) — neither is a topic.
 * Taking `#` would put the YouTube title, gelar and all, into a slot the reader reads as ours.
 */

/** Level-3 headings only — see the note above on why `#` and `##` are excluded. */
const TOPIC_HEADING = /^\s{0,3}###\s+(.*)$/;

/** `1. `, `1) `, `(1) ` — the briefing numbers its sub-headings and the chip should not repeat it. */
const TOPIC_ORDINAL = /^\s*(?:\(\d{1,2}\)|\d{1,2}[.)])\s*/;

const DEFAULT_MAX_TOPICS = 6;
/**
 * A chip never wraps and never truncates. An over-long heading is DROPPED, for the same reason an
 * over-long bullet is: an ellipsis can cut past a negation, and half a topic is a claim about the
 * lecture that the lecture did not make.
 */
const DEFAULT_MAX_TOPIC_CHARS = 48;
/**
 * MEASURED, NOT GUESSED — the same rule as `DEFAULT_MAX_TOTAL_CHARS`. The strip is a wrapping row
 * above the cards, so its SUM is what steals height from them, and a third chip row would cost the
 * cards a wrapped line each.
 *
 * The real briefing yields exactly six surviving topics totalling 190 characters, which renders as
 * TWO chip rows at 1920 wide and is the case the 480-character bullet bracket above was measured
 * against. Anything larger pushes a third row. Re-render and look at the PNG after any change to
 * the `--qs-chip-*` tokens; do not raise it by arithmetic.
 */
const DEFAULT_MAX_TOPIC_TOTAL_CHARS = 190;

export interface ExtractedTopics {
  readonly topics: readonly string[];
  readonly dropped: readonly DroppedBullet[];
}

export interface TopicOptions {
  readonly max?: number;
  readonly maxChars?: number;
  readonly maxTotalChars?: number;
}

/**
 * The briefing's `###` sub-headings, screened, deduped and budgeted.
 *
 * Stops dead at the check-list heading exactly as `extractSlideBullets` does — the section after it
 * is what we are least sure about, and a chip carries no caveat.
 */
export function extractSlideTopics(markdown: string, opts: TopicOptions = {}): ExtractedTopics {
  const max = opts.max ?? DEFAULT_MAX_TOPICS;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_TOPIC_CHARS;
  const maxTotal = opts.maxTotalChars ?? DEFAULT_MAX_TOPIC_TOTAL_CHARS;

  const topics: string[] = [];
  const dropped: DroppedBullet[] = [];
  const seen = new Set<string>();
  let total = 0;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (isCheckListHeading(line)) break;

    const m = TOPIC_HEADING.exec(line);
    if (!m) continue;

    const text = stripInlineMarkdown(m[1] ?? "").replace(TOPIC_ORDINAL, "").trim();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (hasUnclearReference(text)) {
      dropped.push({ reason: "unclear-reference", text });
      continue;
    }
    if (carriesQuotation(text)) {
      dropped.push({ reason: "carries-a-quote", text });
      continue;
    }
    if (carriesCredential(text)) {
      dropped.push({ reason: "carries-a-credential", text });
      continue;
    }
    if (text.length > maxChars) {
      dropped.push({ reason: "too-long", text });
      continue;
    }
    if (topics.length >= max) {
      dropped.push({ reason: "over-max", text });
      continue;
    }
    if (total + text.length > maxTotal) {
      dropped.push({ reason: "over-budget", text });
      continue;
    }

    topics.push(text);
    total += text.length;
  }

  return { topics, dropped };
}

// ── the document ───────────────────────────────────────────────────────────────────────────────


export interface SlideInput {
  /** YouTube's own title, verbatim. Rendered ONLY in the source block, never as identity. */
  readonly title: string;
  readonly channel: string;
  /** The canonical video URL. Shown as text and encoded in the QR. */
  readonly url: string;
  /** Already sanitized by `sanitizeQrSvg`. Omit to render the source block with no QR. */
  readonly qrSvg?: string;
  readonly speaker: RosterOutcome;
  readonly bullets: readonly string[];
  /** The briefing's screened `###` sub-headings, from `extractSlideTopics`. Omit for no strip. */
  readonly topics?: readonly string[];
  /** The briefing was built from auto-captions with unchecked spans. */
  readonly isDraft: boolean;
  /** Per-run token overrides. Merged over `SLIDE_TOKENS`. */
  readonly tokens?: Readonly<Record<string, string>>;
}

const HEADING = "Ringkasan Kajian";
const KICKER = "Ringkasan otomatis";
/**
 * The draft gate's wording, exported for the same reason `DENIALS` is: the gate now has four
 * carriers — this band, the `-DRAFT` filename suffix, the spoken `DRAFT_WARNING`, and the m4a
 * `title` tag — and the m4a's was a hand-typed byte-identical duplicate of this line.
 */
export const DRAFT_COPY = "DRAFT — belum diperiksa, belum boleh diposting";
const SOURCE_LABEL = "Judul di YouTube, disalin apa adanya";
const TOPICS_LABEL = "Yang dibahas";
const DISCLAIMER = `Ringkasan otomatis dari video di atas. ${DENIALS} Pindai kode untuk menonton sumbernya.`;
/**
 * Printed only when nobody was named. It says what is true — we did not identify anyone — without
 * repeating the title's claim, and without implying the title is wrong either.
 */
const NO_SPEAKER_NOTE = "Kami tidak menisbatkan ringkasan ini kepada siapa pun.";

function tokenBlock(tokens: Readonly<Record<string, string>>): string {
  return Object.entries(tokens)
    .map(([k, v]) => `      ${k}: ${v};`)
    .join("\n");
}

/**
 * The identity slot. Renders from the ROSTER or not at all.
 *
 * `none` and `ambiguous` are handled identically and that is the safety property, not an oversight
 * — two roster entries matching one video is exactly as unsafe as zero, because picking one would
 * make the file's ORDER decide who gets credited.
 */
function speakerBlock(speaker: RosterOutcome): string {
  if (speaker.kind !== "match") {
    return `        <p class="qs-nospeaker">${escapeHtml(NO_SPEAKER_NOTE)}</p>`;
  }
  const { name, credentials } = speaker.match.entry;
  const cred = credentials?.trim()
    ? `\n          <span class="qs-cred">${escapeHtml(credentials.trim())}</span>`
    : "";
  return (
    `        <div class="qs-speaker">\n` +
    `          <span class="qs-name">${escapeHtml(name)}</span>${cred}\n` +
    `        </div>`
  );
}

/**
 * The category strip. Omitted entirely when nothing survived the screens — an empty strip is a
 * frame around a claim we could not make, and it steals height from the cards for nothing.
 */
function topicStrip(topics: readonly string[]): string {
  if (!topics.length) return "";
  const chips = topics
    .map((t) => `          <li class="qs-chip">${escapeHtml(t)}</li>`)
    .join("\n");
  return (
    `      <nav class="qs-topics" aria-label="${escapeHtml(TOPICS_LABEL)}">\n` +
    `        <ul class="qs-chips">\n${chips}\n        </ul>\n` +
    `      </nav>\n`
  );
}

/**
 * ONE DOCUMENT, TWO PRESENTATIONS — and the second one is why there is not a single media query.
 *
 * At the render window (`--qs-w` x `--qs-h`, mirrored by `kajian-render.ts`) this is the landscape
 * canvas Erik asked for: header, category strip, then two panels — numbered cards on the left, the
 * source rail with the QR on the right. Pointed at a phone it is the same markup reflowing into one
 * column, which is the form that actually matters: the published artifact is the HTML, and an image
 * of text is invisible to assistive technology.
 *
 * ⚠ EVERY RESPONSIVE STEP IS A `clamp()` INSIDE `:root`, never a breakpoint. A media query cannot
 * take a `var()`, so its condition would be a `px` literal living outside the token block — which
 * the force-red test forbids for a good reason, and relaxing that test to fit a layout would have
 * traded a real guard for a convenience. The wrapping flex row does the same job with no literal:
 * both panels declare a basis and a `min()` floor, and the rail wraps under the cards on its own.
 *
 * ⚠ NOTHING CLIPS ANY MORE. The portrait version put `overflow: hidden` on the body as a net under
 * the character budget, and that net hid the thing it caught: a bullet cut at a line boundary reads
 * as a finished sentence. Here the page GROWS instead — `min-height`, not `height` — so an
 * over-budget render leaves a card sliced by the fold in the PNG, which is obviously broken rather
 * than quietly wrong. The budget is still the guarantee; the visible break is only the alarm.
 *
 * ⚠ THREE THINGS IN ERIK'S REFERENCE ARE REFUSED BY DESIGN, and their absence is the feature:
 * the source channel's logo (SETTLED 2026-08-23 — no third party's branding on any summary, ever;
 * `docs/review/erik-ruling-2026-08-23-no-third-party-branding.md`), the video thumbnail (`roster.yaml`
 * states a frame grabbed off the video is not an image we are entitled to use) and the speaker name
 * (`speakers: []` — ADR 5 gives an unrostered video no identity). The reference also carries no
 * "automatic summary, not a quotation" line; ADR 5 requires one, so `DISCLAIMER` survives the
 * redesign. That is why this document still has zero `<img>` and zero `data:` URIs.
 */
export function buildSlideHtml(input: SlideInput): string {
  const tokens = { ...SLIDE_TOKENS, ...(input.tokens ?? {}) };

  const draftBand = input.isDraft
    ? `      <p class="qs-draft">${escapeHtml(DRAFT_COPY)}</p>\n`
    : "";

  // An <ol> so the numbering is SEMANTIC — a screen reader announces "1 of 3" without reading the
  // painted digit, which is why the digit itself is aria-hidden rather than merely decorative.
  const cards = input.bullets.length
    ? `        <ol class="qs-cards">\n` +
      input.bullets
        .map(
          (b, i) =>
            `          <li class="qs-card">` +
            `<span class="qs-num" aria-hidden="true">${i + 1}</span>` +
            `<p class="qs-point">${escapeHtml(b)}</p></li>`,
        )
        .join("\n") +
      `\n        </ol>`
    : `        <p class="qs-nopoints">Ringkasan tidak tersedia untuk slide ini.</p>`;

  const qr = input.qrSvg
    ? `        <div class="qs-qr">${input.qrSvg}</div>`
    : `        <div class="qs-qr qs-qr-empty"></div>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(HEADING)}</title>
  <style>
    :root {
${tokenBlock(tokens)}
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html { background: var(--qs-ground); }

    /* NOT a flex container, deliberately. Making it one turns the slide into a flex item, and a flex
       item's default min-width is auto — its MIN-CONTENT width — which a long unwrapped chip could
       hold open wider than a narrow viewport. Centring by auto inline margin cannot do that. This is
       a hazard closed by construction, NOT a bug observed: the sideways cut it was first written to
       explain turned out to be headless Chrome clamping its own window to a minimum of about five
       hundred CSS pixels and cropping the screenshot to the requested width. Probe narrow layouts at
       that minimum or wider, or through CDP emulation. (Two things this stylesheet may not contain,
       both enforced by tests: a backtick, because it lives in a template literal, and a length
       literal, because the force-red test greps the whole document — comments included.) */
    body {
      background: var(--qs-ground);
      color: var(--qs-ink);
      font-family: var(--qs-font);
      -webkit-font-smoothing: antialiased;
    }

    /* width is the canvas and max-width is the phone; min-height is a FLOOR, so the page grows
       rather than clipping. See the note on buildSlideHtml. */
    .qs-slide {
      width: var(--qs-w);
      max-width: 100%;
      margin-inline: auto;
      min-height: min(var(--qs-h), 100dvh);
      padding: var(--qs-pad);
      display: flex;
      flex-direction: column;
      gap: var(--qs-gap-lg);
    }

    .qs-draft {
      margin: calc(var(--qs-pad) * -1) calc(var(--qs-pad) * -1) 0;
      padding: var(--qs-draft-pad-y) var(--qs-pad);
      background: var(--qs-draft-ground);
      color: var(--qs-draft-ink);
      font-size: var(--qs-draft-size);
      font-weight: 700;
      letter-spacing: var(--qs-kicker-track);
      text-transform: uppercase;
    }

    .qs-kicker {
      font-size: var(--qs-kicker-size);
      letter-spacing: var(--qs-kicker-track);
      text-transform: uppercase;
      color: var(--qs-accent);
      font-weight: 700;
    }

    .qs-head {
      margin-top: var(--qs-gap-sm);
      font-size: var(--qs-head-size);
      font-weight: 700;
      letter-spacing: var(--qs-head-track);
      line-height: 1.08;
    }

    .qs-speaker {
      margin-top: var(--qs-gap-md);
      display: flex;
      flex-direction: column;
      gap: var(--qs-gap-xs);
    }
    .qs-name { font-size: var(--qs-speaker-size); font-weight: 600; }
    .qs-cred { font-size: var(--qs-cred-size); color: var(--qs-ink-soft); }

    .qs-nospeaker {
      margin-top: var(--qs-gap-md);
      font-size: var(--qs-cred-size);
      color: var(--qs-ink-faint);
    }

    /* the category strip */
    .qs-chips {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: var(--qs-chip-gap);
      min-width: 0;
    }
    .qs-topics { min-width: 0; }
    /* A FIXED radius, never an oversized one. A radius bigger than half the box is CLAMPED to half
       the box height, so a single declaration renders a different shape on every row whose height
       differs — one value rendered three corners in this repo before. Chips are single-line here by
       construction (an over-long topic is dropped, not wrapped), but the token keeps that true even
       if a future type scale makes one wrap. NOTE: this comment carries no length literal on
       purpose — the force-red test greps the whole document, comments included. */
    .qs-chip {
      padding: var(--qs-chip-pad-y) var(--qs-chip-pad-x);
      border-radius: var(--qs-chip-radius);
      background: var(--qs-chip-ground);
      color: var(--qs-chip-ink);
      font-size: var(--qs-chip-size);
      font-weight: 600;
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    /* the two panels — one wrapping row, no breakpoint */
    .qs-panels {
      flex: 1 1 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: var(--qs-col-gap);
      min-height: 0;
    }

    .qs-body {
      flex: 1 1 var(--qs-main-basis);
      min-width: var(--qs-main-min);
      min-height: 0;
    }

    .qs-cards {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--qs-card-gap);
    }
    /* A card with a numbered chip, never a left bar and never a quotation mark: ADR 5 says bullets
       are not styled as quotes, and a rule down the left edge reads as a pull-quote at a glance. */
    .qs-card {
      display: flex;
      align-items: flex-start;
      gap: var(--qs-gap-md);
      padding: var(--qs-card-pad);
      background: var(--qs-card-ground);
      border: var(--qs-rule-weight) solid var(--qs-card-rule);
      border-radius: var(--qs-card-radius);
    }
    .qs-num {
      flex: none;
      width: var(--qs-num-box);
      height: var(--qs-num-box);
      border-radius: var(--qs-radius);
      background: var(--qs-num-ground);
      color: var(--qs-num-ink);
      font-size: var(--qs-num-size);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qs-point {
      min-width: 0;
      font-size: var(--qs-bullet-size);
      line-height: var(--qs-bullet-leading);
      overflow-wrap: anywhere;
    }

    .qs-nopoints { font-size: var(--qs-bullet-size); color: var(--qs-ink-faint); }

    /* the source rail */
    .qs-source {
      flex: 1 1 var(--qs-side-basis);
      min-width: var(--qs-side-min);
      display: flex;
      flex-direction: column;
      gap: var(--qs-gap-md);
      padding: var(--qs-card-pad);
      background: var(--qs-panel);
      border: var(--qs-rule-weight) solid var(--qs-card-rule);
      border-radius: var(--qs-card-radius);
    }

    .qs-qr {
      flex: none;
      width: var(--qs-qr-size);
      height: var(--qs-qr-size);
      padding: var(--qs-qr-pad);
      background: var(--qs-qr-paper);
      border-radius: var(--qs-radius);
    }
    .qs-qr svg { width: 100%; height: 100%; display: block; }
    /* qrencode's own fills were stripped so the tokens can drive them. The background rect is the
       direct child of the outer <g>; the modules live one <g> deeper. */
    .qs-qr svg rect { fill: var(--qs-qr-ink); }
    .qs-qr svg > g > rect { fill: var(--qs-qr-paper); }

    .qs-meta { min-width: 0; }
    .qs-label {
      font-size: var(--qs-label-size);
      letter-spacing: var(--qs-kicker-track);
      text-transform: uppercase;
      color: var(--qs-ink-faint);
    }
    .qs-title {
      margin-top: var(--qs-gap-xs);
      font-size: var(--qs-source-size);
      font-weight: 600;
      color: var(--qs-ink);
    }
    .qs-where {
      margin-top: var(--qs-gap-xs);
      font-size: var(--qs-source-size);
      color: var(--qs-ink-soft);
      word-break: break-word;
    }
    .qs-disclaimer {
      margin-top: var(--qs-gap-sm);
      padding-top: var(--qs-gap-sm);
      border-top: var(--qs-rule-weight) solid var(--qs-rule);
      font-size: var(--qs-label-size);
      line-height: var(--qs-bullet-leading);
      color: var(--qs-ink-faint);
    }
  </style>
</head>
<body>
  <article class="qs-slide">
${draftBand}    <header>
      <p class="qs-kicker">${escapeHtml(KICKER)}</p>
      <h1 class="qs-head">${escapeHtml(HEADING)}</h1>
${speakerBlock(input.speaker)}
    </header>

${topicStrip(input.topics ?? [])}    <div class="qs-panels">
      <main class="qs-body">
${cards}
      </main>

      <aside class="qs-source">
${qr}
        <div class="qs-meta">
          <p class="qs-label">${escapeHtml(SOURCE_LABEL)}</p>
          <p class="qs-title">${escapeHtml(input.title)}</p>
          <p class="qs-where">${escapeHtml(input.channel)} — ${escapeHtml(input.url)}</p>
          <p class="qs-disclaimer">${escapeHtml(DISCLAIMER)}</p>
        </div>
      </aside>
    </div>
  </article>
</body>
</html>
`;
}
