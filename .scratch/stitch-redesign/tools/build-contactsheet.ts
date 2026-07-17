#!/usr/bin/env bun
/**
 * Rebuild the New-Quranku redesign contact sheet: scans the redesign dir for screenN-<slug>-<frame>.html
 * and lays them out as a grid — one row per screen, columns for the four frames. Mobile at 390px,
 * desktop scaled to fit. Run after generating frames: bun build-contactsheet.ts
 */
import { readdirSync } from "node:fs";

const DIR = "/Users/erikgunawansupriatna/quran-new/.scratch/stitch-redesign";
const SCREEN_TITLES: Record<string, string> = {
  "1": "Landing", "2": "Chat thread", "3": "Baca (surah list)",
  "4": "Reading surface", "5": "Tema (themes)", "6": "Peta (concept maps)",
};
const FRAME_ORDER = ["mobile-light", "mobile-dark", "desktop-light", "desktop-dark"];
const FRAME_LABEL: Record<string, string> = {
  "mobile-light": "mobile · light", "mobile-dark": "mobile · dark",
  "desktop-light": "desktop · light", "desktop-dark": "desktop · dark",
};

const files = readdirSync(DIR).filter((f) => /^screen\d-.*-(mobile|desktop)-(light|dark)\.html$/.test(f));
// index[screenNum][frameKey] = filename
const index: Record<string, Record<string, string>> = {};
for (const f of files) {
  const m = f.match(/^screen(\d)-.*-((?:mobile|desktop)-(?:light|dark))\.html$/);
  if (!m) continue;
  (index[m[1]] ??= {})[m[2]] = f;
}

function cell(file: string | undefined, frame: string): string {
  const isDesktop = frame.startsWith("desktop");
  const w = isDesktop ? 1120 : 390;
  const scale = isDesktop ? 0.42 : 1; // desktop scaled to ~470px wide
  const boxW = Math.round(w * scale);
  const boxH = Math.round(820 * scale);
  if (!file) {
    return `<figure><figcaption>${FRAME_LABEL[frame]}</figcaption><div class="frame missing" style="width:${boxW}px;height:${boxH}px">— not yet generated —</div></figure>`;
  }
  return `<figure><figcaption>${FRAME_LABEL[frame]}</figcaption>
    <div class="frame" style="width:${boxW}px;height:${boxH}px">
      <iframe src="${file}" style="width:${w}px;height:820px;transform:scale(${scale});transform-origin:top left"></iframe>
    </div></figure>`;
}

const rows = Object.keys(SCREEN_TITLES)
  .map((n) => {
    const cells = FRAME_ORDER.map((fr) => cell(index[n]?.[fr], fr)).join("\n");
    return `<section><h2>${n} · ${SCREEN_TITLES[n]}</h2><div class="row">${cells}</div></section>`;
  })
  .join("\n");

const have = files.length;
const html = `<!doctype html>
<meta charset="utf-8">
<title>New-Quranku — redesign, all frames</title>
<style>
  body{margin:0;background:#0f1712;color:#e6f4ed;font:14px/1.4 system-ui,sans-serif;padding:24px}
  h1{font-size:19px;font-weight:700;margin:0 0 4px}
  .lead{color:#8fa89b;margin:0 0 24px;max-width:70ch}
  section{margin:0 0 40px}
  h2{font-size:15px;font-weight:700;color:#63dcab;margin:0 0 12px;border-bottom:1px solid #2a3631;padding-bottom:6px}
  .row{display:flex;gap:20px;align-items:flex-start;overflow-x:auto;padding-bottom:12px}
  figure{margin:0;flex:0 0 auto}
  figcaption{margin:0 0 6px;font-size:12px;font-weight:600;color:#9fb3aa}
  .frame{border:1px solid #2a3631;border-radius:10px;overflow:hidden;background:#fff}
  .missing{display:flex;align-items:center;justify-content:center;color:#5b6a63;font-size:12px;background:#131f19;border-style:dashed}
  iframe{border:0}
</style>
<h1>New-Quranku — redesign, all frames (${have}/24)</h1>
<p class="lead">Six screens × four frames. Mobile at true 390px; desktop (1120px) scaled to fit. QuranKu-family language — green→gold hero, Poppins/Inter/Amiri, teal prayer card. Dark composed from the token card's dark column, never inverted. Prototype only — not ported to app code.</p>
${rows}`;

await Bun.write(`${DIR}/index.html`, html);
console.log(`contact sheet rebuilt: ${have}/24 frames present → ${DIR}/index.html`);
