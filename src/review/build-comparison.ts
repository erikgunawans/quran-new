#!/usr/bin/env bun
/**
 * Build the primary-voice review sheet.
 *
 * Puts Kemenag (literal) and Tarjamah Tafsiriyah (interpretive, our proposed primary voice)
 * side by side on the verses people actually arrive with, so a qualified reviewer can rule
 * on whether the product's core thesis holds: that Tafsiriyah is clearer and reaches further.
 *
 * This tool takes NO position. It renders both faithfully and computes only mechanical
 * signals. The judgment is a human's.
 *
 *   bun run review:build
 */
import type { Translation } from "../domain/canonical.ts";
import type { TafsirPassage, TafsirSource } from "../domain/interpretive.ts";
import { PROBLEM_VERSES } from "./problem-verses.ts";

const OUT = "docs/review/primary-voice-review.html";
const DIR = "data/canonical";

interface Row {
  ref: string;
  /** Display label — a verse may carry several feelings, joined for the sheet. */
  theme: string;
  why: string;
  arabic: string;
  kemenag: string;
  tafsiriyah: string;
  /** Mechanical only: how much longer the interpretive rendering is. */
  expansion: number;
  /** Mechanical only: token overlap. Low overlap = the two readings genuinely diverge. */
  overlap: number;
  grounding: { author: string; tier: number; text: string }[];
}

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );

/** Jaccard overlap — a crude divergence signal, NOT a quality score. */
function overlapOf(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / new Set([...A, ...B]).size;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function load<T>(name: string): Promise<T[]> {
  const f = Bun.file(`${DIR}/${name}`);
  if (!(await f.exists())) throw new Error(`missing ${DIR}/${name} — run \`bun run ingest\` first`);
  return f.json() as Promise<T[]>;
}

const ayahs = await load<{ id: string; text_uthmani: string }>("ayahs.json");
const translations = await load<Translation>("translations.json");
const passages = await load<TafsirPassage>("tafsir-passages.json");
const sources = await load<TafsirSource>("tafsir-sources.json");

const byAyah = new Map(ayahs.map((a) => [a.id, a]));
const srcById = new Map(sources.map((s) => [s.id, s]));

const rows: Row[] = [];
const missing: string[] = [];

for (const v of PROBLEM_VERSES) {
  const [s, a] = v.ref;
  const id = `ayah:${s}:${a}`;
  const arabic = byAyah.get(id)?.text_uthmani ?? "";
  const here = translations.filter((t) => t.ayah_id === id);
  const kemenag = here.find((t) => t.translation_type === "literal")?.text ?? "";
  const tafsiriyah = here.find((t) => t.translation_type === "interpretive")?.text ?? "";

  if (!arabic || !kemenag || !tafsiriyah) {
    missing.push(`${s}:${a}`);
    continue;
  }

  rows.push({
    ref: `${s}:${a}`,
    theme: v.themes.join(" · "),
    why: v.why,
    arabic,
    kemenag,
    tafsiriyah,
    expansion: tafsiriyah.length / kemenag.length,
    overlap: overlapOf(kemenag, tafsiriyah),
    grounding: passages
      .filter((p) => p.ayah_id === id)
      .map((p) => {
        const src = srcById.get(p.source_id);
        return {
          author: src?.author ?? p.source_id,
          tier: src?.authority_tier ?? 0,
          text: p.text.length > 400 ? p.text.slice(0, 400) + "…" : p.text,
        };
      })
      .sort((x, y) => x.tier - y.tier),
  });
}

if (missing.length) console.warn(`⚠ no data for: ${missing.join(", ")}`);

// ── Mechanical summary. Signals only — the verdict belongs to a human. ──────
const diverged = rows.filter((r) => r.overlap < 0.2);
const avgExpansion = rows.reduce((n, r) => n + r.expansion, 0) / rows.length;

const themes = [...new Set(rows.map((r) => r.theme))];

const body = themes
  .map((theme) => {
    const group = rows.filter((r) => r.theme === theme);
    const cards = group
      .map(
        (r) => `
      <article class="verse" id="v${r.ref.replace(":", "-")}">
        <header class="vh">
          <span class="ref">${r.ref}</span>
          <span class="why">${esc(r.why)}</span>
          <span class="sig ${r.overlap < 0.2 ? "warn" : ""}">overlap ${(r.overlap * 100).toFixed(0)}% · ${r.expansion.toFixed(2)}×</span>
        </header>
        <p class="ar" dir="rtl" lang="ar">${esc(r.arabic)}</p>
        <div class="pair">
          <div class="col lit">
            <p class="lbl">Kemenag — literal (harfiyah)</p>
            <p class="txt">${esc(r.kemenag)}</p>
          </div>
          <div class="col int">
            <p class="lbl">Tarjamah Tafsiriyah — meaning-based <em>(proposed primary voice)</em></p>
            <p class="txt">${esc(r.tafsiriyah)}</p>
          </div>
        </div>
        <details class="ground">
          <summary>Grounding — what the tafsir corpus says (${r.grounding.length})</summary>
          ${r.grounding
            .map(
              (g) =>
                `<p class="gp"><span class="ga">${esc(g.author)} <em>[tier ${g.tier}]</em></span> ${esc(g.text)}</p>`,
            )
            .join("")}
        </details>
        <div class="verdict">
          <span class="vl">Which reaches further?</span>
          <label><input type="radio" name="${r.ref}"> Tafsiriyah</label>
          <label><input type="radio" name="${r.ref}"> Kemenag</label>
          <label><input type="radio" name="${r.ref}"> Tie</label>
          <label><input type="radio" name="${r.ref}"> ⚠ Tafsiriyah changes the meaning</label>
        </div>
      </article>`,
      )
      .join("");
    return `<section class="theme"><h2>${esc(theme)} <span class="n">${group.length}</span></h2>${cards}</section>`;
  })
  .join("");

const html = `<title>Primary Voice Review — Tafsiriyah vs Kemenag</title>
<style>
  :root{
    --bg:#FFFFFF;--surface:#F7F7F7;--surface-2:#FFFFFF;--border:#E8E8E8;--border-mid:#DDDDDD;
    --ink:#111111;--body:#333333;--muted:#6E6E6E;
    --red:#F14F44;--red-wash:rgba(241,79,68,.10);--blue:#3A7BD5;--blue-wash:rgba(58,123,213,.08);
    --f-display:"Barlow Condensed","Arial Narrow",Arial,sans-serif;
    --f-body:"Barlow",system-ui,-apple-system,sans-serif;
    --f-mono:"Courier New",ui-monospace,monospace;
    color-scheme:light;
  }
  @media (prefers-color-scheme:dark){:root{
    --bg:#111111;--surface:#1A1A1A;--surface-2:#1E1E1E;--border:#222222;--border-mid:#2E2E2E;
    --ink:#FFFFFF;--body:#E5E5E5;--muted:#888888;--blue:#5B9BF5;--blue-wash:rgba(58,123,213,.14);
    color-scheme:dark;}}
  :root[data-theme="light"]{--bg:#FFFFFF;--surface:#F7F7F7;--surface-2:#FFFFFF;--border:#E8E8E8;
    --ink:#111111;--body:#333333;--muted:#6E6E6E;--blue:#3A7BD5;color-scheme:light;}
  :root[data-theme="dark"]{--bg:#111111;--surface:#1A1A1A;--surface-2:#1E1E1E;--border:#222222;
    --ink:#FFFFFF;--body:#E5E5E5;--muted:#888888;--blue:#5B9BF5;color-scheme:dark;}
  *{box-sizing:border-box}
  body{background:var(--bg);color:var(--body);font-family:var(--f-body);line-height:1.7;margin:0;font-size:16px}
  .wrap{max-width:min(100% - 2rem,1080px);margin:0 auto;padding:0 1rem 6rem}
  header.mast{padding:3rem 0 1.6rem;border-bottom:1px solid var(--border);margin-bottom:2rem}
  .slashes{display:inline-flex;gap:3px;margin-bottom:1.2rem}
  .slashes i{width:5px;height:18px;background:var(--red);transform:skewX(-18deg);display:block}
  .slashes i:nth-child(2){opacity:.7}.slashes i:nth-child(3){opacity:.4}
  h1{font-family:var(--f-display);font-weight:900;text-transform:uppercase;font-size:clamp(2rem,5vw,3.4rem);
    line-height:.95;margin:0 0 .8rem;color:var(--ink);letter-spacing:-.01em}
  .dek{color:var(--body);max-width:65ch;margin:0}
  .task{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--red);
    padding:1.2rem 1.4rem;margin:1.6rem 0}
  .task p{margin:0 0 .6rem}.task p:last-child{margin:0}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border:1px solid var(--border);margin:1.4rem 0}
  .stat{padding:.9rem 1.1rem;border-right:1px solid var(--border)}
  .stat:last-child{border-right:none}
  .stat b{display:block;font-family:var(--f-display);font-weight:700;letter-spacing:.18em;
    text-transform:uppercase;font-size:.58rem;color:var(--muted);margin-bottom:.3rem}
  .stat span{font-family:var(--f-display);font-weight:800;font-size:1.5rem;color:var(--ink)}
  .theme{margin:2.6rem 0}
  h2{font-family:var(--f-display);font-weight:800;text-transform:uppercase;font-size:1.5rem;
    color:var(--ink);border-top:2px solid var(--border-mid);padding-top:.9rem;margin:0 0 1.2rem;letter-spacing:.01em}
  h2 .n{font-family:var(--f-mono);font-size:.8rem;color:var(--muted);font-weight:400}
  .verse{border:1px solid var(--border);background:var(--surface-2);margin-bottom:1.2rem;padding:1.1rem 1.2rem}
  .vh{display:flex;flex-wrap:wrap;align-items:baseline;gap:.7rem;margin-bottom:.7rem}
  .ref{font-family:var(--f-mono);font-weight:700;color:var(--red);font-size:.9rem}
  .why{color:var(--muted);font-size:.86rem;flex:1}
  .sig{font-family:var(--f-mono);font-size:.7rem;color:var(--muted);white-space:nowrap}
  .sig.warn{color:var(--red);font-weight:700}
  .ar{font-size:1.5rem;line-height:2;text-align:right;color:var(--ink);margin:.4rem 0 1rem;
    padding-bottom:.9rem;border-bottom:1px solid var(--border)}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border)}
  @media (max-width:720px){.pair{grid-template-columns:1fr}}
  .col{padding:.9rem 1rem}
  .col.lit{border-right:1px solid var(--border);background:var(--bg)}
  .col.int{background:var(--blue-wash)}
  @media (max-width:720px){.col.lit{border-right:none;border-bottom:1px solid var(--border)}}
  .lbl{font-family:var(--f-display);font-weight:700;text-transform:uppercase;letter-spacing:.14em;
    font-size:.6rem;color:var(--muted);margin:0 0 .5rem}
  .col.int .lbl{color:var(--blue)}
  .txt{margin:0;color:var(--ink);font-size:.96rem;line-height:1.65}
  .ground{margin-top:.8rem;border-top:1px solid var(--border);padding-top:.6rem}
  .ground summary{font-family:var(--f-display);font-weight:700;text-transform:uppercase;
    letter-spacing:.12em;font-size:.62rem;color:var(--muted);cursor:pointer}
  .gp{font-size:.85rem;color:var(--body);margin:.7rem 0 0;padding-left:.8rem;border-left:2px solid var(--border-mid)}
  .ga{font-family:var(--f-display);font-weight:700;text-transform:uppercase;letter-spacing:.08em;
    font-size:.66rem;color:var(--ink);display:block;margin-bottom:.2rem}
  .verdict{display:flex;flex-wrap:wrap;gap:.9rem;align-items:center;margin-top:.9rem;
    padding-top:.8rem;border-top:1px solid var(--border)}
  .vl{font-family:var(--f-display);font-weight:700;text-transform:uppercase;letter-spacing:.14em;
    font-size:.6rem;color:var(--muted)}
  .verdict label{font-size:.84rem;color:var(--body);cursor:pointer;display:flex;align-items:center;gap:.3rem}
  footer{margin-top:3rem;padding-top:1.2rem;border-top:1px solid var(--border);
    font-family:var(--f-display);text-transform:uppercase;letter-spacing:.2em;font-size:.6rem;color:var(--muted)}
  @media print{.verdict input{-webkit-appearance:none;appearance:none;width:11px;height:11px;border:1px solid #666}
    .ground{display:block}.ground summary{display:none}}
</style>
<div class="wrap">
<header class="mast">
  <span class="slashes" aria-hidden="true"><i></i><i></i><i></i></span>
  <h1>Primary Voice Review<br>Tafsiriyah vs Kemenag</h1>
  <p class="dek">The product proposes to lead with the <strong>Tarjamah Tafsiriyah</strong> (Ustadz
  Muhammad Thalib) because the official literal translation leaves many readers cold. This sheet
  tests that claim where it matters most — on the ${rows.length} verses people actually arrive with
  when they are struggling.</p>
</header>

<div class="task">
  <p><strong>What we need from you.</strong> For each verse: read the Arabic, then both renderings.
  Ask one question — <em>which one would actually reach a person in this state?</em></p>
  <p>Mark <strong>⚠ changes the meaning</strong> whenever the Tafsiriyah says something the verse does
  not say. That flag matters more than the preference: a rendering can be warmer and still be wrong,
  and we would rather know now.</p>
  <p>The tafsir corpus is shown under each verse so you can check the interpretive reading against
  classical grounding. <em>This tool takes no position. The percentages are mechanical, not verdicts.</em></p>
</div>

<div class="stats">
  <div class="stat"><b>Verses</b><span>${rows.length}</span></div>
  <div class="stat"><b>Avg expansion</b><span>${avgExpansion.toFixed(2)}×</span></div>
  <div class="stat"><b>Low overlap &lt;20%</b><span>${diverged.length}</span></div>
  <div class="stat"><b>Themes</b><span>${themes.length}</span></div>
</div>

${body}

<footer>Axiara AI · Generated from the pinned corpus · Kemenag (literal) + Tarjamah Tafsiriyah (interpretive)</footer>
</div>`;

/** Standalone shell — without meta charset the Arabic garbles when opened from disk. */
const standalone = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${html.replace(/^<title>/, "<title>")}
</body>
</html>`.replace("<div class=\"wrap\">", "</head>\n<body>\n<div class=\"wrap\">");

await Bun.write(OUT, standalone);
console.log(`\n✓ ${rows.length} verses across ${themes.length} themes → ${OUT}`);
console.log(`  avg expansion ${avgExpansion.toFixed(2)}× · ${diverged.length} verses diverge (<20% overlap)`);
if (diverged.length) {
  console.log(`\n  Most divergent — read these first:`);
  for (const r of [...diverged].sort((a, b) => a.overlap - b.overlap).slice(0, 8)) {
    console.log(`    ${r.ref.padEnd(7)} ${(r.overlap * 100).toFixed(0).padStart(3)}% overlap  ${r.why}`);
  }
}
