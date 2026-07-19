#!/usr/bin/env bun
export {}; // top-level await needs this file to be a module (it has no imports of its own)
/**
 * Render the Ustadz-facing review documents (markdown) into self-contained, PRINTABLE HTML.
 *
 * The review sheets and their cover notes are markdown — right for version control, wrong for handing
 * to a scholar who will open them in a browser or print them to fill in by hand. This tool converts
 * each one into a styled, single-file HTML page (no external assets, no network — CSP/offline safe),
 * theme-aware on screen and clean black-on-white in print. Fill-in blanks become writable underlines
 * sized to the space the sheet intended.
 *
 * It re-renders the CURRENT markdown, so the flow is: regenerate the sheet (app:aqidah-sheet), then
 * this (app:review-html). Deterministic, depends only on the .md files in docs/review/.
 *   bun run src/review/build-review-html.ts   (or: bun run app:review-html)
 */

// Every document we hand to the ustadz. Output is the same basename with a .html extension.
const DOCS = [
  "docs/review/aqidah-cover-note.md",
  "docs/review/aqidah-review.md",
  "docs/review/thematic-curation-review.md",
  "docs/review/ustadz-cover-note.md",
] as const;

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Inline markdown → HTML. Order matters: blanks and code are protected before emphasis runs. */
function inline(src: string): string {
  let t = esc(src);
  // Fill-in blanks: a run of 3+ underscores becomes a writable underline, widened to match the run
  // length the author drew (a 64-underscore answer line stays long; a "QS. __ : __" blank stays short).
  t = t.replace(/_{3,}/g, (m) => `<span class="blank" style="min-width:${(m.length * 0.55).toFixed(1)}ch"></span>`);
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/_([^_]+)_/g, "<em>$1</em>"); // single-underscore italics (blanks already consumed)
  return t;
}

/** Split a table row on unescaped pipes, then restore any escaped `\|` inside a cell. */
const cells = (row: string): string[] =>
  row
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, "|").trim());

/**
 * Join the physical lines of one paragraph into a single string, THEN inline it as a whole — so
 * emphasis that opens on one line and closes on the next (e.g. an italic span wrapped mid-sentence)
 * pairs correctly. A markdown hard break (two trailing spaces) becomes a <br>, carried through the
 * inline pass as a visible [[BR]] sentinel so it survives escaping.
 */
const joinLines = (lines: string[]): string => {
  const raw = lines
    .map((l, i) => {
      if (i === lines.length - 1) return l.trim();
      return l.trim() + (/\s{2,}$/.test(l) ? "[[BR]]" : " ");
    })
    .join("");
  return inline(raw).replace(/\[\[BR\]\]/g, "<br>");
};

/** Block-level markdown → HTML, over the constrained subset these documents use. */
function render(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (!line.trim()) { i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { const n = h[1]!.length; out.push(`<h${n}>${inline(h[2]!)}</h${n}>`); i++; continue; }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    // Table: a header row, a |---| separator, then body rows.
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().match(/^\|[\s:|-]+\|?$/)) {
      const head = cells(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) body.push(cells(lines[i++]!));
      const th = head.map((c) => `<th>${inline(c)}</th>`).join("");
      const rows = body
        .map((r) => `<tr>${head.map((_, c) => `<td>${inline(r[c] ?? "")}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`);
      continue;
    }

    // Blockquote: consecutive `>` lines, split into paragraphs on empty quote lines.
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) quoted.push(lines[i++]!.replace(/^>\s?/, ""));
      const paras: string[] = [];
      let buf: string[] = [];
      const flush = () => { if (buf.length) { paras.push(`<p>${joinLines(buf)}</p>`); buf = []; } };
      for (const q of quoted) { if (!q.trim()) flush(); else buf.push(q); }
      flush();
      out.push(`<blockquote>${paras.join("")}</blockquote>`);
      continue;
    }

    // Unordered list. Each item may wrap across lazy-continuation lines (indented or plain wrapped
    // text) — fold them into the one item so inline emphasis spanning a line break still renders.
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        let text = lines[i++]!.replace(/^[-*]\s+/, "");
        while (
          i < lines.length &&
          lines[i]!.trim() &&
          !/^[-*]\s+/.test(lines[i]!) &&
          !/^(#{1,6}\s|>|-{3,}\s*$|\*{3,}\s*$)/.test(lines[i]!) &&
          !lines[i]!.trim().startsWith("|")
        ) {
          text += " " + lines[i++]!.trim();
        }
        items.push(`<li>${inline(text)}</li>`);
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Paragraph: gather until a blank line or a block starter.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(#{1,6}\s|>|[-*]\s|-{3,}\s*$|\*{3,}\s*$)/.test(lines[i]!) &&
      !lines[i]!.trim().startsWith("|")
    ) {
      para.push(lines[i++]!);
    }
    if (para.length) out.push(`<p>${joinLines(para)}</p>`);
    else i++; // safety: never spin on a line no branch consumed
  }

  return out.join("\n");
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{
    --bg:#fbfaf7;--surface:#ffffff;--ink:#1a1a17;--body:#33322d;--muted:#6b6a63;
    --line:#e6e3db;--accent:#16a249;--accent-2:#b8891b;--quote-bg:#f4f2ec;--blank:#9a9890;
    color-scheme:light;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#16150f;--surface:#1d1c15;--ink:#f3f1e8;--body:#d9d6cb;--muted:#9a988c;
    --line:#2c2a22;--accent:#34d399;--accent-2:#e0b64f;--quote-bg:#201e17;--blank:#6a685e;
    color-scheme:dark;}}
  :root[data-theme="light"]{--bg:#fbfaf7;--surface:#ffffff;--ink:#1a1a17;--body:#33322d;--muted:#6b6a63;
    --line:#e6e3db;--quote-bg:#f4f2ec;--blank:#9a9890;color-scheme:light;}
  :root[data-theme="dark"]{--bg:#16150f;--surface:#1d1c15;--ink:#f3f1e8;--body:#d9d6cb;--muted:#9a988c;
    --line:#2c2a22;--quote-bg:#201e17;--blank:#6a685e;color-scheme:dark;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--body);
    font:16px/1.7 Georgia,"Times New Roman",serif;
    -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
  .sheet{max-width:44rem;margin:0 auto;padding:3rem 1.5rem 5rem;}
  .hint{max-width:44rem;margin:1rem auto -1rem;padding:0 1.5rem;font:13px/1.5 system-ui,sans-serif;color:var(--muted);}
  h1,h2,h3{color:var(--ink);line-height:1.25;font-weight:700;}
  h1{font-size:1.9rem;margin:0 0 1.5rem;letter-spacing:-.01em;}
  h2{font-size:1.35rem;margin:2.4rem 0 .8rem;padding-top:.4rem;}
  h3{font-size:1.1rem;margin:1.6rem 0 .6rem;}
  h2 em,h1 em{font-style:normal;color:var(--accent);}
  p{margin:0 0 1rem;}
  a{color:var(--accent);text-underline-offset:2px;}
  strong{color:var(--ink);font-weight:700;}
  code{font:.9em ui-monospace,"Courier New",monospace;background:var(--quote-bg);
    padding:.1em .4em;border-radius:4px;color:var(--muted);}
  hr{border:none;border-top:1px solid var(--line);margin:2.2rem 0;}
  ul{margin:.4rem 0 1.2rem;padding-left:1.3rem;}
  li{margin:.45rem 0;}
  blockquote{margin:1.2rem 0;padding:.9rem 1.2rem;background:var(--quote-bg);
    border-left:3px solid var(--accent-2);border-radius:0 6px 6px 0;}
  blockquote p{margin:0 0 .6rem;color:var(--body);}
  blockquote p:last-child{margin:0;}
  table{width:100%;border-collapse:collapse;margin:1rem 0 1.6rem;font-size:.95rem;}
  th,td{border:1px solid var(--line);padding:.55rem .7rem;text-align:left;vertical-align:top;}
  th{background:var(--quote-bg);color:var(--ink);font-weight:700;}
  .blank{display:inline-block;min-width:8ch;border-bottom:1.5px solid var(--blank);
    height:1.25em;vertical-align:baseline;margin:0 .15em;}
  @media print{
    :root{--bg:#fff;--surface:#fff;--ink:#000;--body:#1a1a1a;--muted:#555;--line:#bbb;
      --quote-bg:#f4f2ec;--accent:#0a6b30;--accent-2:#8a6512;--blank:#777;color-scheme:light;}
    .hint{display:none;}
    .sheet{max-width:none;padding:0;}
    h2{page-break-after:avoid;}
    blockquote,table,li{page-break-inside:avoid;}
    a{color:#000;text-decoration:none;}
  }
</style>
</head>
<body>
<p class="hint">Dokumen ini bisa dicetak (Print → Save as PDF) untuk diisi dengan tangan, atau dibaca langsung di layar.</p>
<main class="sheet">
${body}
</main>
</body>
</html>
`;
}

for (const md of DOCS) {
  const raw = await Bun.file(md).text();
  const title = raw.match(/^#\s+(.*)$/m)?.[1]?.replace(/\*/g, "").trim() ?? md;
  const html = page(title, render(raw));
  const out = md.replace(/\.md$/, ".html");
  await Bun.write(out, html);
  console.log(`✓ ${out}  (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
}
