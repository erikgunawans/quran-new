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
 * "15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A." — a name AND a credential, written by
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
  // canvas
  "--qs-w": "1080px",
  "--qs-h": "1350px",
  "--qs-pad": "84px",

  // ink + ground
  "--qs-ground": "#f6f5f2",
  "--qs-ink": "#1b1c1e",
  "--qs-ink-soft": "#5d6166",
  "--qs-ink-faint": "#8b9096",
  "--qs-rule": "#d9d7d1",
  "--qs-accent": "#2f6f57",
  "--qs-panel": "#ffffff",

  // draft band
  "--qs-draft-ground": "#8a1c1c",
  "--qs-draft-ink": "#ffffff",

  // qr — its own pair, because contrast here is functional rather than aesthetic
  "--qs-qr-ink": "#000000",
  "--qs-qr-paper": "#ffffff",
  "--qs-qr-size": "190px",
  "--qs-qr-pad": "16px",

  // type
  "--qs-font": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "--qs-kicker-size": "26px",
  "--qs-kicker-track": "0.22em",
  "--qs-head-size": "52px",
  "--qs-head-track": "-0.01em",
  "--qs-speaker-size": "34px",
  "--qs-cred-size": "25px",
  "--qs-bullet-size": "34px",
  "--qs-bullet-leading": "1.42",
  "--qs-source-size": "23px",
  "--qs-label-size": "19px",
  "--qs-draft-size": "24px",

  // spacing
  "--qs-gap-xs": "8px",
  "--qs-gap-sm": "16px",
  "--qs-gap-md": "28px",
  "--qs-gap-lg": "46px",
  "--qs-bullet-gap": "26px",
  "--qs-marker-size": "11px",
  "--qs-marker-offset": "17px",
  "--qs-rule-weight": "2px",
  "--qs-radius": "10px",
  "--qs-draft-pad-y": "18px",
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
 * Rendered against the first real briefing at 1080x1350 WITH the draft band present (the tighter
 * of the two cases, and the common one for auto-captioned video). The body area holds twelve
 * wrapped lines at the default type scale. 438 characters over three bullets rendered with two
 * lines to spare; 552 over four clipped the last line of the last bullet.
 *
 * ⚠ CLIPPING IS SILENT. The overflow rule contains the damage but does not announce it — a bullet
 * cut at a line boundary reads as a finished sentence. So this budget is the guarantee and the
 * clip is only the net beneath it. ANY change to the type or spacing tokens invalidates this
 * number: re-render the real briefing and look at the PNG. Do not raise it by arithmetic.
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

/** A pair of quotation marks of any flavour Indonesian editors actually type. */
const QUOTE_PAIR = /["“”][^"“”]{2,}["“”]/;

function stripInlineMarkdown(s: string): string {
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
    if (STOP_HEADING.test(rawLine.trim())) break;

    // The briefing's provenance notes are a blockquote, and some of them are bulleted inside it.
    if (/^\s{0,3}>/.test(rawLine)) continue;

    const m = BULLET_LINE.exec(rawLine);
    if (!m) continue;

    const text = stripInlineMarkdown(m[1] ?? "");
    if (!text) continue;

    if (text.toLowerCase().includes(UNCLEAR_MARKER)) {
      dropped.push({ reason: "unclear-reference", text });
      continue;
    }
    if (QUOTE_PAIR.test(text)) {
      dropped.push({ reason: "carries-a-quote", text });
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
  /** The briefing was built from auto-captions with unchecked spans. */
  readonly isDraft: boolean;
  /** Per-run token overrides. Merged over `SLIDE_TOKENS`. */
  readonly tokens?: Readonly<Record<string, string>>;
}

const HEADING = "Ringkasan Kajian";
const KICKER = "Ringkasan otomatis";
const DRAFT_COPY = "DRAFT — belum diperiksa, belum boleh diposting";
const SOURCE_LABEL = "Judul di YouTube, disalin apa adanya";
const DISCLAIMER =
  "Ringkasan otomatis dari video di atas. Bukan kutipan, bukan fatwa, dan belum diperiksa ulama. " +
  "Pindai kode untuk menonton sumbernya.";
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
    return `      <p class="qs-nospeaker">${escapeHtml(NO_SPEAKER_NOTE)}</p>`;
  }
  const { name, credentials } = speaker.match.entry;
  const cred = credentials?.trim()
    ? `\n        <span class="qs-cred">${escapeHtml(credentials.trim())}</span>`
    : "";
  return (
    `      <div class="qs-speaker">\n` +
    `        <span class="qs-name">${escapeHtml(name)}</span>${cred}\n` +
    `      </div>`
  );
}

/**
 * One self-contained HTML document, 1080x1350, with no external reference of any kind — Chrome is
 * pointed at a `file://` URL with no network, so a webfont or a CDN stylesheet would render as a
 * silent fallback rather than an error.
 */
export function buildSlideHtml(input: SlideInput): string {
  const tokens = { ...SLIDE_TOKENS, ...(input.tokens ?? {}) };

  const draftBand = input.isDraft
    ? `    <div class="qs-draft">${escapeHtml(DRAFT_COPY)}</div>\n`
    : "";

  const bullets = input.bullets.length
    ? `      <ul class="qs-points">\n` +
      input.bullets.map((b) => `        <li>${escapeHtml(b)}</li>`).join("\n") +
      `\n      </ul>`
    : `      <p class="qs-nopoints">Ringkasan tidak tersedia untuk slide ini.</p>`;

  const qr = input.qrSvg
    ? `      <div class="qs-qr">${input.qrSvg}</div>`
    : `      <div class="qs-qr qs-qr-empty"></div>`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(HEADING)}</title>
  <style>
    :root {
${tokenBlock(tokens)}
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: var(--qs-w);
      height: var(--qs-h);
      background: var(--qs-ground);
      color: var(--qs-ink);
      font-family: var(--qs-font);
      -webkit-font-smoothing: antialiased;
    }

    .qs-slide {
      width: var(--qs-w);
      height: var(--qs-h);
      padding: var(--qs-pad);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .qs-draft {
      margin: calc(var(--qs-pad) * -1) calc(var(--qs-pad) * -1) var(--qs-gap-lg);
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

    /* Clipping is a SECOND line of defence behind the character budget, not the primary one. If a
       budget is ever set too high, an overflowing body must clip inside its own box — the first
       real render pushed a bullet straight through the QR and the source block, which reads as a
       broken image rather than as too much text. */
    .qs-body {
      flex: 1 1 auto;
      margin-top: var(--qs-gap-lg);
      min-height: 0;
      overflow: hidden;
    }

    .qs-points { list-style: none; }
    .qs-points li {
      position: relative;
      padding-left: calc(var(--qs-marker-size) * 3);
      margin-bottom: var(--qs-bullet-gap);
      font-size: var(--qs-bullet-size);
      line-height: var(--qs-bullet-leading);
    }
    /* A round marker, never a quotation mark or a rule: ADR 5 says bullets are not styled as
       quotes, and a left bar reads as a pull-quote at a glance. */
    .qs-points li::before {
      content: "";
      position: absolute;
      left: 0;
      top: var(--qs-marker-offset);
      width: var(--qs-marker-size);
      height: var(--qs-marker-size);
      border-radius: var(--qs-marker-size);
      background: var(--qs-accent);
    }

    .qs-nopoints { font-size: var(--qs-bullet-size); color: var(--qs-ink-faint); }

    .qs-source {
      flex: none;
      display: flex;
      gap: var(--qs-gap-md);
      align-items: flex-start;
      border-top: var(--qs-rule-weight) solid var(--qs-rule);
      padding-top: var(--qs-gap-md);
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
      word-break: break-all;
    }
    .qs-disclaimer {
      margin-top: var(--qs-gap-sm);
      font-size: var(--qs-label-size);
      line-height: var(--qs-bullet-leading);
      color: var(--qs-ink-faint);
    }
  </style>
</head>
<body>
  <div class="qs-slide">
${draftBand}    <header>
      <p class="qs-kicker">${escapeHtml(KICKER)}</p>
      <h1 class="qs-head">${escapeHtml(HEADING)}</h1>
${speakerBlock(input.speaker)}
    </header>

    <main class="qs-body">
${bullets}
    </main>

    <footer class="qs-source">
${qr}
      <div class="qs-meta">
        <p class="qs-label">${escapeHtml(SOURCE_LABEL)}</p>
        <p class="qs-title">${escapeHtml(input.title)}</p>
        <p class="qs-where">${escapeHtml(input.channel)} — ${escapeHtml(input.url)}</p>
        <p class="qs-disclaimer">${escapeHtml(DISCLAIMER)}</p>
      </div>
    </footer>
  </div>
</body>
</html>
`;
}
