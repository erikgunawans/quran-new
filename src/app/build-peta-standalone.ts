#!/usr/bin/env bun
/**
 * Build the STAND-ALONE Peta Tematik graph — one file, no server, no network.
 *
 * WHY A BUILDER AND NOT A FILE.
 * `docs/reference/indeks-tematik/peta-tematik.html` is the cautionary case: it was hand-emitted
 * once, and it still says 1,554 verses / 494 bridges. The real index holds 1,632 and 518. That
 * artifact predates the parse fix that recovered 87 secondary refs, so it silently drops 78 of
 * Ustadz Muhammad Thalib's verses from a picture bearing his name. A file that is copied by hand
 * goes stale the moment the corpus moves; a file that is BUILT cannot. So the stand-alone is a
 * build target with the same expectation gate the rest of the peta pipeline carries.
 *
 * WHY IT IS SMALLER THAN THE ARTIFACT IT REPLACES.
 * 301 KB of the old file was d3 + d3-force-3d, whose only job was deciding where the dots go for
 * a graph that never changes. `src/app/build-peta-3d.ts` already solved that once and baked
 * integer coordinates into cosmos.json. This file just draws them: rotate by two angles, divide
 * by depth, paint. There is no solver here, so there is no solver to ship.
 *
 * WHAT IS HIS AND WHAT IS OURS. The categories, their names, the topic texts and every citation
 * are Ustadz Muhammad Thalib's, byte-identical to the published index. The 3D positions, the
 * clustering and the bridge geometry are OURS — computed by intersecting his citations. The page
 * says so, because that seam is not a footnote.
 *
 * WHAT IT DELIBERATELY DOES NOT CONTAIN: scripture. No Arabic ayah text, no translation. The
 * cosmos points AT verses; it never renders them. Same guarantee the live surface carries.
 *
 * Run:
 *   bun run app:peta-standalone
 */
import { mkdir } from "node:fs/promises";

const INDEX_PATH = "web/public/peta/index.json";
const COSMOS_PATH = "web/public/peta/cosmos.json";
const SHARD_DIR = "web/public/peta";
export const OUT_PATH = "docs/reference/indeks-tematik/peta-tematik-standalone.html";
export const SIZE_LIMIT_BYTES = 400 * 1024;

/** The same gate build-peta-3d.ts carries. A stand-alone that drifts is the bug being fixed. */
const EXPECTED = {
  categories: 13,
  entries: 2451,
  verses: 1632,
  bridges: 518,
} as const;

interface IndexCategory {
  slug: string;
  category: string;
  entries: number;
  subtopics: number;
}
interface IndexFile {
  source: { title: string; author: string; url: string };
  totals: { categories: number; entries: number; verses: number; bridges: number };
  categories: IndexCategory[];
}
interface CosmosCat {
  slug: string;
  name: string;
  entries: number;
  x: number;
  y: number;
  z: number;
}
type CosmosVerse = [number, number, number, number, number, number[], 0 | 1];
interface Cosmos {
  meta: { cats: number; verses: number; links: number; bridges: number; entries: number };
  source: { title: string; author: string; url: string };
  cats: CosmosCat[];
  verses: CosmosVerse[];
}
interface ShardRef {
  surah: number;
  ayah: number;
  resolvable: boolean;
  bridge: string[];
}
interface ShardEntry {
  text: string;
  ref: string;
  refs: ShardRef[];
}
interface Shard {
  slug: string;
  category: string;
  subtopics: { subtopic: string | null; entries: ShardEntry[] }[];
}

function assertEqual(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

async function readJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`missing ${path}`);
  return (await file.json()) as T;
}

/**
 * Surah display names come from Thalib's own `ref` strings ("QS. Al-Baqarah, 2:3"), not from a
 * separate table. Two reasons: the stand-alone then carries HIS naming rather than ours, and it
 * needs no second source of truth that could disagree with the first.
 */
const REF_RE = /^QS\.\s*(.+?),\s*(\d+)\s*:\s*(\d+)/u;

function collectSurahNames(shards: Shard[]): Record<number, string> {
  const tally = new Map<number, Map<string, number>>();
  for (const shard of shards) {
    for (const sub of shard.subtopics) {
      for (const entry of sub.entries) {
        const m = REF_RE.exec(entry.ref);
        if (!m) continue;
        const name = m[1]!.trim();
        const surah = Number(m[2]);
        if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
        const inner = tally.get(surah) ?? new Map<string, number>();
        inner.set(name, (inner.get(name) ?? 0) + 1);
        tally.set(surah, inner);
      }
    }
  }
  // The index spells a few surahs more than one way across categories. Take the majority spelling
  // rather than the first seen, so the page shows what the book most often shows.
  const out: Record<number, string> = {};
  for (const [surah, inner] of tally) {
    let best = "";
    let bestN = -1;
    for (const [name, n] of inner) {
      if (n > bestN || (n === bestN && name < best)) {
        best = name;
        bestN = n;
      }
    }
    out[surah] = best;
  }
  return out;
}

/**
 * "s:a" -> [[categoryIndex, topicText], ...] — every entry of his that cites that verse.
 *
 * UNRESOLVABLE REFS ARE INCLUDED. Four citations in the published index (8:77, 8:96, 11:161,
 * 48:59) name ayah numbers that do not exist in the mushaf. The house rule is settled: we do not
 * link them, do not correct them, and do not delete the entry. Skipping them here would have left
 * four stars that open an empty panel — the reader would read that as OUR bug rather than as a
 * property of the source, which is the opposite of honest. They carry his topic text and the page
 * says plainly why the reference goes nowhere.
 */
function collectTopics(shards: Shard[], order: string[]): Record<string, [number, string][]> {
  const slugIndex = new Map(order.map((slug, i) => [slug, i]));
  const out: Record<string, [number, string][]> = {};
  let counted = 0;
  for (const shard of shards) {
    const ci = slugIndex.get(shard.slug);
    if (ci === undefined) throw new Error(`shard ${shard.slug} not present in cosmos cats`);
    for (const sub of shard.subtopics) {
      for (const entry of sub.entries) {
        counted += 1;
        for (const ref of entry.refs) {
          const key = `${ref.surah}:${ref.ayah}`;
          const list = out[key] ?? [];
          // The same entry can cite the same verse twice; the reader does not want it twice.
          if (!list.some(([c, t]) => c === ci && t === entry.text)) list.push([ci, entry.text]);
          out[key] = list;
        }
      }
    }
  }
  assertEqual(counted, EXPECTED.entries, "topic entries");
  return out;
}

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (s: string): string => s.replace(/[&<>"']/gu, (c) => ESC[c]!);

/**
 * `</script>` inside a JSON string literal ends the script element, and U+2028/U+2029 are line
 * terminators to a JS parser but not to JSON.stringify. Those three are the only escapes the
 * inlined payload needs — quotes and control characters are already handled.
 */
const LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "gu");
const safeJson = (v: unknown): string =>
  JSON.stringify(v)
    .replace(/<\/(script)/giu, "<\\/$1")
    .replace(LINE_SEPARATORS, (c) => (c === "\u2028" ? "\\u2028" : "\\u2029"));

function page(payload: string, cosmos: Cosmos): string {
  const src = cosmos.source;
  const nf = (n: number): string => n.toLocaleString("id-ID");
  // The lafaz is written as HTML entities and JS escapes, never as raw Arabic in this source
  // file. Arabic bytes that survive a copy/paste are not the same Arabic bytes that survive an
  // editor's bidi handling, and this repo has been bitten by that before.
  const LAFAZ_ENTITIES = "&#1575;&#1604;&#1604;&#1607;";
  return `<!doctype html>
<html lang="id">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Peta Tematik Al-Qur'an — ${esc(src.title)}</title>
<style>
  :root{
    --bg:#05080a; --panel:rgba(13,20,25,.86); --line:rgba(255,255,255,.11);
    --line-2:rgba(255,255,255,.22); --ink:#f2f6f5; --ink-2:#a8b6bb; --ink-3:#6d7d84;
    --shadow:0 18px 60px rgba(0,0,0,.6);
    --f:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    --f-ar:"Amiri","Scheherazade New","Noto Naskh Arabic","Geeza Pro","Traditional Arabic",serif;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{
    background:var(--bg);color:var(--ink);font-family:var(--f);
    overflow:hidden;-webkit-font-smoothing:antialiased;
  }

  /* ── the split: graph left, cards right ─────────────────────────────────
     A grid, not floating panels. The cards used to sit ON the canvas, which
     meant every card was covering the thing it described. */
  #app{display:grid;grid-template-columns:minmax(0,1fr) 374px;height:100%}
  #stage{
    position:relative;min-width:0;min-height:0;overflow:hidden;
    background:radial-gradient(130% 115% at 50% 40%,#0b1217 0%,#070c10 45%,#04070a 100%);
  }
  #cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}
  #cv.drag{cursor:grabbing}
  #hint{
    position:absolute;left:18px;bottom:18px;z-index:3;padding:8px 12px;border-radius:12px;
    background:rgba(8,13,17,.7);border:1px solid var(--line);backdrop-filter:blur(10px);
    -webkit-backdrop-filter:blur(10px);
    font-size:11px;color:var(--ink-3);display:flex;gap:12px;align-items:center;flex-wrap:wrap;
  }
  #hint kbd{font-family:inherit;background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:5px;padding:1px 6px;font-size:10.5px;color:var(--ink-2)}

  #rail{
    overflow-y:auto;overscroll-behavior:contain;padding:16px;
    display:flex;flex-direction:column;gap:13px;
    border-left:1px solid var(--line);
    background:linear-gradient(180deg,#080d11 0%,#06090c 100%);
  }
  #rail::-webkit-scrollbar{width:9px}
  #rail::-webkit-scrollbar-thumb{background:rgba(255,255,255,.11);border-radius:99px}
  .card{
    background:var(--panel);border:1px solid var(--line);border-radius:16px;
    padding:15px 17px;box-shadow:var(--shadow);flex:none;
  }
  .card.pad0{padding:0}

  #head h1{margin:0;font-size:16px;font-weight:620;line-height:1.25}
  #head .sub{margin-top:4px;font-size:11.5px;color:var(--ink-3);letter-spacing:.03em}
  #head .stats{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-top:12px;font-size:11.5px;color:var(--ink-2)}
  #head .stats b{color:var(--ink);font-weight:650;font-variant-numeric:tabular-nums}

  #search{
    width:100%;background:transparent;border:0;outline:0;color:var(--ink);
    font:inherit;font-size:13px;padding:13px 16px
  }
  #search::placeholder{color:var(--ink-3)}
  .card.hit{border-color:var(--line-2)}

  /* ── the lafaz button ────────────────────────────────────────────────── */
  #lafazCard{padding:11px}
  #lafaz{
    width:100%;display:flex;align-items:center;gap:13px;padding:9px 11px;border-radius:12px;
    background:linear-gradient(180deg,rgba(94,234,212,.09),rgba(94,234,212,.03));
    border:1px solid rgba(94,234,212,.26);color:var(--ink);font-family:inherit;cursor:pointer;
    text-align:left;transition:border-color .15s,background .15s;
  }
  #lafaz:hover{border-color:rgba(94,234,212,.55);background:rgba(94,234,212,.13)}
  #lafaz:disabled{opacity:.45;cursor:not-allowed}
  #lafaz .ar{font-family:var(--f-ar);font-size:31px;line-height:1;color:#5eead4;flex:none;padding:0 2px}
  #lafaz .tx{display:flex;flex-direction:column;gap:2px;min-width:0}
  #lafaz .tx b{font-size:12.5px;font-weight:640}
  #lafaz .tx i{font-size:11px;font-style:normal;color:var(--ink-3);line-height:1.35}
  #lafazNote{margin:9px 3px 1px;font-size:11px;line-height:1.45;color:#fda4af;display:none}
  #lafazNote.show{display:block}

  #legend{display:flex;flex-direction:column;min-height:0}
  #legend .lh{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
  #legend .lh span{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);font-weight:650}
  #legend button.reset{font-size:11px;color:var(--ink-2);background:none;border:0;cursor:pointer;padding:2px 4px;border-radius:6px;font-family:inherit}
  #legend button.reset:hover{color:var(--ink);text-decoration:underline}
  /* No inner scroll cap. A capped list hid 2 of the 13 categories behind a nested scrollbar
     nobody looks for — "Membangun Pribadi Shalih" and "Karakteristik Negara Bersyari'ah" simply
     were not there. The rail scrolls; the legend does not need to scroll inside it. */
  #cats{display:flex;flex-direction:column;gap:1px;margin:0 -6px}
  .cat{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:9px;cursor:pointer;border:1px solid transparent;text-align:left;background:none;color:inherit;font:inherit;width:100%}
  .cat:hover{background:rgba(255,255,255,.05)}
  .cat.off{opacity:.3}
  .cat.solo{background:rgba(255,255,255,.07);border-color:var(--line-2)}
  .cat .dot{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:0 0 10px currentColor,0 0 3px currentColor}
  .cat .nm{font-size:12px;line-height:1.25;flex:1;min-width:0}
  .cat .ct{font-size:10.5px;color:var(--ink-3);font-variant-numeric:tabular-nums;flex:none}
  #legend .foot{margin-top:11px;padding-top:11px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
  .toggle{display:flex;align-items:center;gap:9px;font-size:11.5px;color:var(--ink-2);cursor:pointer;user-select:none}
  .toggle input{position:absolute;opacity:0;width:0;height:0}
  .toggle .sw{width:30px;height:17px;border-radius:9px;background:rgba(255,255,255,.08);border:1px solid var(--line-2);position:relative;flex:none;transition:background .15s}
  .toggle .sw::after{content:"";position:absolute;top:1.5px;left:1.5px;width:12px;height:12px;border-radius:50%;background:var(--ink-3);transition:transform .15s,background .15s}
  .toggle.on .sw{background:rgba(255,255,255,.24);border-color:rgba(255,255,255,.5)}
  .toggle.on .sw::after{transform:translateX(13px);background:#fff}

  #detail{padding:0;overflow:hidden}
  #detail .dh{padding:15px 17px 14px;border-bottom:1px solid var(--line);position:relative}
  #detail .ref{font-size:21px;font-weight:680;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
  #detail .surah{font-size:12.5px;color:var(--ink-2);margin-top:2px}
  #detail .meta{display:flex;gap:15px;margin-top:11px;font-size:11px;color:var(--ink-3)}
  #detail .meta b{color:var(--ink);font-weight:650;font-variant-numeric:tabular-nums}
  #detail .badge{display:inline-flex;align-items:center;gap:5px;margin-top:11px;margin-right:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3)}
  #detail .badge.warn{background:rgba(253,164,175,.13);border-color:rgba(253,164,175,.45);color:#fda4af}
  #detail .dbody{padding:14px 17px 16px;max-height:38vh;overflow-y:auto}
  #detail .lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);font-weight:650;margin-bottom:9px}
  #detail .chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:15px}
  #detail .chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--line-2);color:var(--ink-2);background:none;font-family:inherit;cursor:pointer}
  #detail .chip:hover{color:var(--ink)}
  #detail .chip .d{width:7px;height:7px;border-radius:50%;flex:none;box-shadow:0 0 6px currentColor}
  #detail .top{font-size:12.5px;line-height:1.5;padding:8px 0;border-top:1px solid var(--line);display:flex;gap:10px}
  #detail .top:first-of-type{border-top:0}
  #detail .top .tb{width:3px;border-radius:2px;flex:none;align-self:stretch;min-height:16px;box-shadow:0 0 8px currentColor}
  #detail .close{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--ink-2);cursor:pointer;font-size:16px;line-height:1;display:grid;place-items:center}
  #detail .close:hover{color:var(--ink)}
  #detail .dempty{padding:17px;font-size:12px;line-height:1.5;color:var(--ink-3)}
  #detail:not(.show) .dh,#detail:not(.show) .dbody{display:none}
  #detail.show .dempty{display:none}

  #cred{font-size:11px;line-height:1.55;color:var(--ink-3)}
  #cred a{color:var(--ink-2);text-decoration:none;border-bottom:1px solid var(--line-2)}
  #cred a:hover{color:var(--ink)}

  #tip{position:fixed;z-index:9;pointer-events:none;opacity:0;transition:opacity .1s;background:rgba(10,16,20,.95);border:1px solid var(--line-2);border-radius:10px;padding:7px 11px;font-size:12px;box-shadow:var(--shadow);max-width:240px}
  #tip.show{opacity:1}
  #tip .r{font-weight:680;font-variant-numeric:tabular-nums}
  #tip .s{color:var(--ink-3);font-size:11px;margin-top:1px}

  /* Below the split's useful width the rail goes under the graph rather than
     squeezing it — a 300px-wide cosmos is not a cosmos. */
  @media (max-width:900px){
    body{overflow:auto}
    #app{grid-template-columns:1fr;grid-template-rows:58vh auto;height:auto;min-height:100%}
    #rail{border-left:0;border-top:1px solid var(--line);overflow:visible}
    #detail .dbody{max-height:none}
    #hint{display:none}
  }
  @media (prefers-reduced-motion:reduce){#tip,.toggle .sw,.toggle .sw::after,#lafaz{transition:none}}
</style>

<div id="app">
  <main id="stage">
    <canvas id="cv" aria-label="Peta tematik 3D: ${nf(cosmos.meta.verses)} ayat mengelilingi ${cosmos.meta.cats} kategori. Seret untuk memutar, gulir untuk memperbesar, klik bintang untuk melihat topiknya."></canvas>
    <div id="hint"><span><kbd>seret</kbd> putar</span><span><kbd>gulir</kbd> zoom</span><span>klik bintang</span></div>
  </main>

  <aside id="rail">
    <section class="card" id="head">
      <h1>Peta Tematik Al-Qur'an</h1>
      <div class="sub">${esc(src.title)} · ${esc(src.author)}</div>
      <div class="stats">
        <span><b>${nf(cosmos.meta.cats)}</b> kategori</span>
        <span><b>${nf(cosmos.meta.entries)}</b> topik</span>
        <span><b>${nf(cosmos.meta.verses)}</b> ayat</span>
        <span><b>${nf(cosmos.meta.bridges)}</b> ayat penghubung</span>
      </div>
    </section>

    <section class="card pad0" id="searchWrap">
      <input id="search" placeholder="Cari ayat (mis. 2:255) atau surah…" autocomplete="off" spellcheck="false">
    </section>

    <section class="card" id="lafazCard">
      <button id="lafaz" type="button">
        <span class="ar">${LAFAZ_ENTITIES}</span>
        <span class="tx">
          <b id="lafazLabel">Bentuk lafaz Allah</b>
          <i>${nf(cosmos.meta.verses)} ayat menyusun satu nama</i>
        </span>
      </button>
      <p id="lafazNote"></p>
    </section>

    <section class="card" id="detail">
      <div class="dh">
        <button class="close" id="dClose" type="button" aria-label="Tutup">&times;</button>
        <div class="ref" id="dRef"></div>
        <div class="surah" id="dSurah"></div>
        <div class="meta"><span><b id="dTops"></b> topik</span><span><b id="dCats"></b> kategori</span></div>
        <div id="dBadge"></div>
      </div>
      <div class="dbody">
        <div class="lbl">Muncul di kategori</div><div class="chips" id="dChips"></div>
        <div class="lbl">Topik menurut ${esc(src.author)}</div><div id="dList"></div>
      </div>
      <div class="dempty">Klik salah satu bintang di peta untuk melihat topik-topik yang mengutip ayat itu.</div>
    </section>

    <section class="card" id="legend">
      <div class="lh"><span>Kategori</span><button class="reset" id="reset" type="button">Tampilkan semua</button></div>
      <div id="cats"></div>
      <div class="foot">
        <label class="toggle on" id="spinT"><input type="checkbox" id="spin" checked><span class="sw"></span>Putar otomatis</label>
        <label class="toggle" id="bridgeT"><input type="checkbox" id="bridge"><span class="sw"></span>Hanya ayat penghubung</label>
      </div>
    </section>

    <section class="card" id="cred">
      Kategori, penamaan, dan seluruh kutipan adalah milik ${esc(src.author)}.
      Posisi 3D, pengelompokan, dan geometri penghubung dihitung dari perpotongan kutipan itu.
      Halaman ini tidak menampilkan teks ayat.<br>
      Sumber: <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title)}</a>
    </section>
  </aside>
</div>

<div id="tip"><div class="r" id="tipR"></div><div class="s" id="tipS"></div></div>

<script>
"use strict";
const DATA = ${payload};
const LAFAZ = "\\u0627\\u0644\\u0644\\u0647";

/* 13 hues. Categorical colour is doing real work here — it is what makes a cluster readable at a
   glance — so this is the one surface that leaves the emerald discipline. Tuned to a common
   lightness/chroma so no single category shouts, and NO GOLD (hue 70–100). */
const HUES = ["#5eead4","#7dd3fc","#a5b4fc","#c4b5fd","#f0abfc","#fda4af","#fdba74",
              "#bef264","#6ee7b7","#67e8f9","#93c5fd","#d8b4fe","#f9a8d4"];
const catColor = (i) => HUES[i % HUES.length];

const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");

/* One pre-rendered glow per colour, reused for every star of that colour. 14 colours, 1,632
   stars: allocating a radial gradient per star per frame costs ~1.7ms/frame on a Mac and
   multiples of that on the mid-range Android this is actually written for. Drawing a sprite is
   a memcpy. */
const SPRITES = new Map();
function halo(color){
  const hit = SPRITES.get(color); if (hit) return hit;
  const size = 64, c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  grad.addColorStop(0,color); grad.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle = grad; g.fillRect(0,0,size,size);
  SPRITES.set(color,c); return c;
}

const hubs = DATA.cats.map((c,i)=>({
  x:c.x, y:c.y, z:c.z, name:c.name, slug:c.slug, entries:c.entries, ci:i,
  color:catColor(i), r:5+Math.sqrt(c.entries/626)*12,
  px:0, py:0, scale:1, persp:1, depth:1,
}));

const stars = DATA.verses.map((v,i)=>({
  x:v[0], y:v[1], z:v[2], surah:v[3], ayah:v[4], cats:v[5],
  bridge:v[5].length>1, resolvable:v[6]===1,
  phase:(i*2.399963)%(Math.PI*2),  /* golden-angle: adjacent stars never share a beat */
  r:v[5].length>1?1.9:1.3,
  color:v[5].length>1?"#ffffff":catColor(v[5][0]||0),
  px:0, py:0, scale:1, persp:1, depth:1,
}));

let rotY=0.6, rotX=-0.25, zoom=1, t=0, w=0, h=0, dpr=1;
let auto=true, bridgesOnly=false, solo=null, marked=null;
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) auto=false;

function resize(){
  dpr = Math.min(window.devicePixelRatio||1,2);
  const rect = cv.getBoundingClientRect();
  w = rect.width; h = rect.height;
  if (w===0 || h===0) return;
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

/* Rotate by rotY (yaw) then rotX (pitch), then perspective-divide.
   TWO scales come out of this and conflating them turns the field into a white blob. \`scale\`
   maps WORLD units to screen (cloud radius 1000 into min(w,h)/2, so ~0.23) — correct for
   positions, catastrophic for radii. \`persp\` is the perspective factor alone (~1): a star is a
   fixed ~1px that only grows as it approaches the camera. */
function project(p){
  const cy=Math.cos(rotY), sy=Math.sin(rotY), cx=Math.cos(rotX), sx=Math.sin(rotX);
  const x1 = p.x*cy - p.z*sy;
  const z1 = p.x*sy + p.z*cy;
  const y1 = p.y*cx - z1*sx;
  const z2 = p.y*sx + z1*cx;
  const D = 2600;                       /* camera distance; the cloud radius is 1000 */
  const depth = Math.max(D+z2, 1);
  const persp = (D/depth)*zoom;
  const scale = persp*(Math.min(w,h)/2/980);
  return { px:w/2 + x1*scale, py:h/2 + y1*scale, scale, persp, depth };
}
const assign = (o,p) => { o.px=p.px; o.py=p.py; o.scale=p.scale; o.persp=p.persp; o.depth=p.depth; };

const hubVisible = (ci) => solo===null || solo===ci;
function starVisible(s){
  if (bridgesOnly && !s.bridge) return false;
  if (solo!==null && s.cats.indexOf(solo)<0) return false;
  return true;
}

/* ── the lafaz ────────────────────────────────────────────────────────────
   Every star flies to a point sampled from the WORD, so the name is drawn out of his own
   categories' colours. The shape is not hand-authored: it is rasterised from a real Arabic
   typeface at runtime and sampled, because hand-drawing the lafaz Allah and getting it subtly
   wrong is a worse outcome than not offering the button at all.

   The one thing that can go wrong is a browser with no Arabic font, which draws .notdef boxes.
   Four rectangles arranged out of 1,632 verses would be an insult, so the sample is measured
   before it is trusted and the feature refuses rather than degrades. */
let lafazTargets = null;   /* per-star [x,y,z], or null before the first successful sample */
let lafazState = 0;        /* eased 0..1 */
let lafazWant = 0;         /* 0 = cosmos, 1 = word */
let lafazChecked = false;
let autoBeforeLafaz = true;

function sampleLafaz(){
  const W = 1600, H = 760, STEP = 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.direction = "rtl";
  g.font = '700 500px ' + getComputedStyle(document.documentElement).getPropertyValue("--f-ar");
  g.fillText(LAFAZ, W/2, H/2);

  let data;
  try { data = g.getImageData(0,0,W,H).data; } catch (err) { return null; }

  const pts = [];
  let minX=W, maxX=0, minY=H, maxY=0;
  for (let y=0; y<H; y+=STEP){
    for (let x=0; x<W; x+=STEP){
      if (data[(y*W+x)*4+3] > 130){
        pts.push(x,y);
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
      }
    }
  }
  const n = pts.length/2;
  if (n < 3000) return null;

  const bw = maxX-minX, bh = maxY-minY;
  if (bw<=0 || bh<=0) return null;
  const aspect  = bw/bh;
  const density = n / ((bw/STEP) * (bh/STEP));
  /* Real naskh: wide, and it leaves plenty of counter space. Solid .notdef boxes come back near
     1.0 density; hollow ones come back near 0.05. Either way, this rejects them. */
  if (aspect < 0.85 || aspect > 5 || density < 0.11 || density > 0.74) return null;

  /* Deterministic shuffle, then take one point per star. An even stride over a row-major list
     would band the word into visible scanlines. */
  const idx = new Int32Array(n);
  for (let i=0;i<n;i++) idx[i]=i;
  let seed = 20260806;
  for (let i=n-1;i>0;i--){
    seed = (seed*1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i+1);
    const tmp = idx[i]; idx[i]=idx[j]; idx[j]=tmp;
  }

  const want = stars.length;
  const chosen = [];
  for (let i=0;i<want;i++){
    const k = idx[i % n];
    chosen.push([pts[k*2], pts[k*2+1]]);
  }

  /* Pair sorted-by-x with sorted-by-x so stars keep their left/right order and the morph reads
     as the cloud folding into place rather than as 1,632 things swapping seats. */
  chosen.sort((a,b)=> a[0]-b[0] || a[1]-b[1]);
  const orderIdx = stars.map((s,i)=>i).sort((a,b)=> stars[a].x-stars[b].x || stars[a].y-stars[b].y);

  const k = 1700/bw;                       /* world width of the word */
  const ox = (minX+maxX)/2, oy = (minY+maxY)/2;
  const out = new Array(want);
  for (let i=0;i<want;i++){
    const p = chosen[i];
    const si = orderIdx[i];
    /* A thin, deterministic slab of depth so the word still catches the perspective divide and
       does not look like a flat sticker pasted over a 3D scene. */
    const jitter = ((si*2654435761) % 1000)/1000 - 0.5;
    out[si] = [ (p[0]-ox)*k, (p[1]-oy)*k, jitter*70 ];
  }
  return out;
}

const lafazBtn   = document.getElementById("lafaz");
const lafazLabel = document.getElementById("lafazLabel");
const lafazNote  = document.getElementById("lafazNote");

function toggleLafaz(){
  if (lafazWant === 1){
    lafazWant = 0;
    lafazLabel.textContent = "Bentuk lafaz Allah";
    auto = autoBeforeLafaz;
    document.getElementById("spin").checked = auto;
    document.getElementById("spinT").classList.toggle("on", auto);
    return;
  }
  if (!lafazChecked){
    lafazChecked = true;
    lafazTargets = sampleLafaz();
  }
  if (!lafazTargets){
    lafazBtn.disabled = true;
    lafazNote.textContent = "Peramban ini tidak punya huruf Arab yang bisa dipakai, jadi bentuk lafaz tidak ditampilkan daripada tampil salah.";
    lafazNote.classList.add("show");
    return;
  }
  /* Unwrap the spin before easing to 0, or the word arrives after several full turns. */
  rotY = Math.atan2(Math.sin(rotY), Math.cos(rotY));
  autoBeforeLafaz = auto;
  auto = false;
  document.getElementById("spin").checked = false;
  document.getElementById("spinT").classList.remove("on");
  /* A filtered cosmos would spell the name with holes in it. */
  setSolo(null);
  if (bridgesOnly){
    bridgesOnly = false;
    document.getElementById("bridge").checked = false;
    document.getElementById("bridgeT").classList.remove("on");
  }
  lafazWant = 1;
  lafazLabel.textContent = "Kembali ke peta";
}
lafazBtn.addEventListener("click", toggleLafaz);

const lerpPoint = {x:0,y:0,z:0};

function frame(){
  t += 0.016;

  const speed = reduce ? 0.05 : 0.018;
  if (lafazState !== lafazWant){
    lafazState += (lafazWant > lafazState) ? speed : -speed;
    if (Math.abs(lafazState-lafazWant) < speed) lafazState = lafazWant;
  }
  const m = lafazState<=0 ? 0 : lafazState>=1 ? 1 : lafazState*lafazState*(3-2*lafazState);

  if (lafazWant === 1){
    /* Face the word. A name read at 40 degrees of yaw is not read. */
    rotY += (0-rotY)*0.07;
    rotX += (0-rotX)*0.07;
    zoom += (1-zoom)*0.07;
  } else if (auto){
    rotY += 0.0016;
  }

  ctx.clearRect(0,0,w,h);

  for (const hub of hubs) assign(hub, project(hub));
  if (m > 0 && lafazTargets){
    for (let i=0;i<stars.length;i++){
      const s = stars[i], tg = lafazTargets[i];
      lerpPoint.x = s.x + (tg[0]-s.x)*m;
      lerpPoint.y = s.y + (tg[1]-s.y)*m;
      lerpPoint.z = s.z + (tg[2]-s.z)*m;
      assign(s, project(lerpPoint));
    }
  } else {
    for (const s of stars) assign(s, project(s));
  }

  /* Links first, underneath — only for bridge stars. Drawing all 2,370 every frame is both slow
     and visual mud; the bridges are the point, so they are what earns a line. They fade out as
     the word forms: the hubs are no longer where the lines claim they are. */
  ctx.globalCompositeOperation = "lighter";
  if (m < 0.98){
    for (const s of stars){
      if (!s.bridge || !starVisible(s)) continue;
      for (const ci of s.cats){
        const hub = hubs[ci];
        if (!hub || !hubVisible(ci)) continue;
        ctx.strokeStyle = hub.color;
        ctx.globalAlpha = 0.045*(1-m);
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(s.px,s.py); ctx.lineTo(hub.px,hub.py); ctx.stroke();
      }
    }
  }

  /* Stars, painted back-to-front so near ones sit on top. */
  const order = stars.slice().sort((a,b)=>b.depth-a.depth);
  for (const s of order){
    if (!starVisible(s)) continue;
    const isMark = marked===s;
    /* Twinkle: a slow sine per star. Bridges breathe wider — they are the interesting ones.
       It settles as the word forms; a pulsing name is a distracting name. */
    const raw = reduce ? 0.9 : 0.55 + 0.45*Math.sin(t*(s.bridge?1.6:1.0)+s.phase);
    const tw = raw + (0.97-raw)*m;
    const r = Math.max(s.r*s.persp*1.15, 0.5)*(isMark?2.6:1)*(1+m*0.4);
    const a = Math.min(tw*(s.bridge?1:0.8),1);

    /* The halo IS the luminosity — a flat arc() is a dot; a star is a core plus falloff, and
       under \`lighter\` the overlapping falloffs of a cluster sum into the glow that makes this
       read as a galaxy rather than as confetti. Blitted, never allocated. */
    const hr = r*3.2;
    ctx.globalAlpha = a*0.42;
    ctx.drawImage(halo(s.color), s.px-hr, s.py-hr, hr*2, hr*2);

    ctx.globalAlpha = a;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.px,s.py,r,0,Math.PI*2); ctx.fill();
  }

  /* Hubs last, with a bloom halo. \`lighter\` compositing is what makes overlapping light add up
     instead of occluding — the reason this reads as luminous rather than as flat dots. */
  if (m < 0.99){
    for (const hub of hubs.slice().sort((a,b)=>b.depth-a.depth)){
      if (!hubVisible(hub.ci)) continue;
      const r = Math.max(hub.r*hub.persp, 2);
      const g = ctx.createRadialGradient(hub.px,hub.py,0,hub.px,hub.py,r*5.5);
      g.addColorStop(0,hub.color); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.globalAlpha = 0.3*(1-m); ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hub.px,hub.py,r*5.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.95*(1-m); ctx.fillStyle = hub.color;
      ctx.beginPath(); ctx.arc(hub.px,hub.py,r,0,Math.PI*2); ctx.fill();
    }
  }

  /* Labels: normal compositing, or \`lighter\` turns text into glowing mush. Nearest-first, then
     skip any label that would collide with one already drawn — dropping the FARTHER label is the
     honest resolution; the hidden name is still in the legend and one rotation brings it back. */
  ctx.globalCompositeOperation = "source-over";
  if (m < 0.6){
    ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
    ctx.textAlign = "center";
    const drawn = [];
    for (const hub of hubs.slice().sort((a,b)=>a.depth-b.depth)){
      if (!hubVisible(hub.ci)) continue;
      const r = Math.max(hub.r*hub.persp,2);
      const lx = hub.px, ly = hub.py + r + 14;
      const tw2 = ctx.measureText(hub.name).width;
      let clash = false;
      for (const d of drawn){
        if (Math.abs(d.y-ly)<13 && Math.abs(d.x-lx) < (d.w+tw2)/2+6){ clash = true; break; }
      }
      if (clash) continue;
      drawn.push({x:lx,y:ly,w:tw2});
      const near = Math.max(0, Math.min(1, (2600+1000-hub.depth)/2000));
      const fade = 1 - m/0.6;
      ctx.globalAlpha = (0.45 + near*0.55)*fade;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillText(hub.name, lx+1, ly+1);
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fillText(hub.name, lx, ly);
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

/* ── picking / interaction ───────────────────────────────────────────────── */
function nearest(mx,my,radius){
  let best=null, bestD=radius;
  for (const s of stars){
    if (!starVisible(s)) continue;
    const d = Math.hypot(s.px-mx, s.py-my);
    if (d<bestD){ bestD=d; best=s; }
  }
  return best;
}

let dragging=false, lastX=0, lastY=0, moved=0;
cv.addEventListener("pointerdown", (e)=>{
  dragging=true; moved=0; lastX=e.clientX; lastY=e.clientY;
  cv.classList.add("drag"); cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", (e)=>{
  const rect = cv.getBoundingClientRect();
  if (!dragging){
    const s = nearest(e.clientX-rect.left, e.clientY-rect.top, 12);
    setTip(s, e.clientX, e.clientY);
    return;
  }
  const dx = e.clientX-lastX, dy = e.clientY-lastY;
  moved += Math.abs(dx)+Math.abs(dy);
  /* Dragging the word is fighting the camera easing, so a drag drops you back to the map. */
  if (lafazWant===1 && moved>18) toggleLafaz();
  rotY += dx*0.005;
  rotX = Math.max(-1.4, Math.min(1.4, rotX + dy*0.005));
  lastX=e.clientX; lastY=e.clientY;
});
cv.addEventListener("pointerup", (e)=>{
  dragging=false; cv.classList.remove("drag");
  /* A drag is not a click. Without this, rotating the cosmos also opens a random verse. */
  if (moved<5){
    const rect = cv.getBoundingClientRect();
    const s = nearest(e.clientX-rect.left, e.clientY-rect.top, 14);
    if (s) openDetail(s); else closeDetail();
  }
});
cv.addEventListener("pointerleave", ()=>setTip(null));
cv.addEventListener("wheel", (e)=>{
  e.preventDefault();
  zoom = Math.max(0.4, Math.min(4, zoom*(e.deltaY>0?0.92:1.08)));
}, {passive:false});
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);

/* ── tooltip ─────────────────────────────────────────────────────────────── */
const tip=document.getElementById("tip"), tipR=document.getElementById("tipR"), tipS=document.getElementById("tipS");
function setTip(s,cx,cy){
  if (!s){ tip.classList.remove("show"); return; }
  tipR.textContent = s.surah+":"+s.ayah;
  const n = (DATA.topics[s.surah+":"+s.ayah]||[]).length;
  tipS.textContent = (DATA.names[s.surah]||"") + " · " + n + " topik" + (s.bridge?" · penghubung":"");
  tip.style.left = Math.min(cx+14, window.innerWidth-250)+"px";
  tip.style.top  = Math.min(cy+14, window.innerHeight-70)+"px";
  tip.classList.add("show");
}

/* ── detail card ─────────────────────────────────────────────────────────── */
const detail=document.getElementById("detail");
const dRef=document.getElementById("dRef"), dSurah=document.getElementById("dSurah");
const dTops=document.getElementById("dTops"), dCats=document.getElementById("dCats");
const dBadge=document.getElementById("dBadge"), dChips=document.getElementById("dChips"), dList=document.getElementById("dList");

function openDetail(s){
  marked = s;
  const key = s.surah+":"+s.ayah;
  const tops = DATA.topics[key] || [];
  dRef.textContent = "QS. " + s.surah + ":" + s.ayah;
  dSurah.textContent = DATA.names[s.surah] || "";
  dTops.textContent = tops.length;
  dCats.textContent = s.cats.length;

  /* Four citations in the published index name ayah numbers that are not in the mushaf. We do
     not correct them and we do not hide them — we say so. */
  const badges = [];
  if (s.bridge) badges.push('<span class="badge">Ayat penghubung · ' + s.cats.length + ' kategori</span>');
  if (!s.resolvable) badges.push('<span class="badge warn">Nomor ayat ini tidak ada dalam mushaf</span>');
  dBadge.innerHTML = badges.join(" ");

  dChips.innerHTML = "";
  for (const ci of s.cats){
    const c = DATA.cats[ci]; if (!c) continue;
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.style.color = catColor(ci);
    b.innerHTML = '<span class="d" style="background:'+catColor(ci)+'"></span>';
    b.appendChild(document.createTextNode(c.name));
    b.addEventListener("click", ()=>setSolo(ci));
    dChips.appendChild(b);
  }

  dList.innerHTML = "";
  for (const pair of tops){
    const row = document.createElement("div");
    row.className = "top";
    const bar = document.createElement("div");
    bar.className = "tb"; bar.style.background = catColor(pair[0]); bar.style.color = catColor(pair[0]);
    const txt = document.createElement("div");
    txt.textContent = pair[1];
    row.appendChild(bar); row.appendChild(txt);
    dList.appendChild(row);
  }
  detail.classList.add("show");
}
function closeDetail(){ marked=null; detail.classList.remove("show"); }
document.getElementById("dClose").addEventListener("click", closeDetail);

/* ── legend ──────────────────────────────────────────────────────────────── */
const catsEl = document.getElementById("cats");
const rows = DATA.cats.map((c,i)=>{
  const b = document.createElement("button");
  b.type = "button"; b.className = "cat";
  b.innerHTML = '<span class="dot" style="background:'+catColor(i)+';color:'+catColor(i)+'"></span>' +
                '<span class="nm"></span><span class="ct"></span>';
  b.querySelector(".nm").textContent = c.name;
  b.querySelector(".ct").textContent = c.entries;
  b.addEventListener("click", ()=>setSolo(solo===i?null:i));
  catsEl.appendChild(b);
  return b;
});
function setSolo(ci){
  solo = ci;
  rows.forEach((r,i)=>{
    r.classList.toggle("solo", solo===i);
    r.classList.toggle("off", solo!==null && solo!==i);
  });
  if (solo!==null && marked && marked.cats.indexOf(solo)<0) closeDetail();
}
document.getElementById("reset").addEventListener("click", ()=>setSolo(null));

/* ── toggles ─────────────────────────────────────────────────────────────── */
function wire(boxId, labelId, apply){
  const box = document.getElementById(boxId), label = document.getElementById(labelId);
  box.addEventListener("change", ()=>{ label.classList.toggle("on", box.checked); apply(box.checked); });
}
wire("spin","spinT",(on)=>{ auto=on; autoBeforeLafaz=on; if (on && lafazWant===1) toggleLafaz(); });
wire("bridge","bridgeT",(on)=>{
  bridgesOnly=on;
  if (on && lafazWant===1) toggleLafaz();
  if (on && marked && !marked.bridge) closeDetail();
});
if (reduce){
  const spin = document.getElementById("spin");
  spin.checked = false; document.getElementById("spinT").classList.remove("on");
  autoBeforeLafaz = false;
}

/* ── search ──────────────────────────────────────────────────────────────── */
const searchEl = document.getElementById("search"), searchWrap = document.getElementById("searchWrap");
searchEl.addEventListener("input", ()=>{
  const q = searchEl.value.trim();
  if (!q){ searchWrap.classList.remove("hit"); return; }
  const mm = /^(\\d+)\\s*[:.\\s]\\s*(\\d+)$/.exec(q);
  let hitStar = null;
  if (mm){
    const s = Number(mm[1]), a = Number(mm[2]);
    hitStar = stars.find((v)=>v.surah===s && v.ayah===a) || null;
  } else {
    const lower = q.toLowerCase();
    let num = null;
    for (const k in DATA.names){
      if (DATA.names[k].toLowerCase().indexOf(lower) === 0){ num = Number(k); break; }
    }
    if (num===null) for (const k in DATA.names){
      if (DATA.names[k].toLowerCase().indexOf(lower) >= 0){ num = Number(k); break; }
    }
    if (num!==null) hitStar = stars.find((v)=>v.surah===num) || null;
  }
  searchWrap.classList.toggle("hit", !!hitStar);
  if (hitStar){ setSolo(null); openDetail(hitStar); }
});
searchEl.addEventListener("keydown",(e)=>{ if (e.key==="Escape"){ searchEl.value=""; searchWrap.classList.remove("hit"); closeDetail(); }});
document.addEventListener("keydown",(e)=>{ if (e.key==="Escape") closeDetail(); });

resize();
frame();
</script>
</html>
`;
}

async function main(): Promise<void> {
  const index = await readJson<IndexFile>(INDEX_PATH);
  const cosmos = await readJson<Cosmos>(COSMOS_PATH);

  assertEqual(cosmos.meta.cats, EXPECTED.categories, "cosmos meta.cats");
  assertEqual(cosmos.meta.verses, EXPECTED.verses, "cosmos meta.verses");
  assertEqual(cosmos.meta.bridges, EXPECTED.bridges, "cosmos meta.bridges");
  assertEqual(cosmos.meta.entries, EXPECTED.entries, "cosmos meta.entries");
  assertEqual(cosmos.verses.length, EXPECTED.verses, "cosmos verses length");
  assertEqual(index.totals.verses, EXPECTED.verses, "index totals.verses");

  const order = cosmos.cats.map((c) => c.slug);
  const shards: Shard[] = [];
  for (const slug of order) shards.push(await readJson<Shard>(`${SHARD_DIR}/${slug}.json`));

  const names = collectSurahNames(shards);
  const topics = collectTopics(shards, order);

  const bridges = cosmos.verses.filter((v) => v[5].length > 1).length;
  assertEqual(bridges, EXPECTED.bridges, "bridge verses in payload");

  // Every star must open onto something. A star with no topic and no surah name is a dot the
  // reader can click and be told nothing by — the exact failure the first cut shipped for the
  // four unresolvable refs.
  const starved = cosmos.verses.filter((v) => (topics[`${v[3]}:${v[4]}`] ?? []).length === 0);
  if (starved.length > 0) {
    throw new Error(`${starved.length} star(s) carry no topic: ${starved.map((v) => `${v[3]}:${v[4]}`).join(", ")}`);
  }
  const nameless = cosmos.verses.filter((v) => names[v[3]] === undefined);
  if (nameless.length > 0) {
    throw new Error(`${nameless.length} star(s) carry no surah name: ${[...new Set(nameless.map((v) => v[3]))].join(", ")}`);
  }

  const payload = safeJson({
    meta: cosmos.meta,
    source: cosmos.source,
    cats: cosmos.cats,
    verses: cosmos.verses,
    names,
    topics,
  });

  const html = page(payload, cosmos);
  const bytes = Buffer.byteLength(html);
  if (bytes > SIZE_LIMIT_BYTES) {
    throw new Error(`stand-alone is ${bytes} bytes, exceeds ${SIZE_LIMIT_BYTES} byte limit`);
  }
  // A stand-alone that reaches for the network is not stand-alone. The only permitted absolute
  // URL is the source attribution the reader clicks on purpose.
  const externals = html.match(/(?:src|href)\s*=\s*"https?:\/\/[^"]*"/giu) ?? [];
  const disallowed = externals.filter((m) => !m.includes(cosmos.source.url));
  if (disallowed.length > 0) throw new Error(`external subresource(s): ${disallowed.join(", ")}`);
  if (html.includes("fetch(")) throw new Error("stand-alone must not fetch()");

  await mkdir("docs/reference/indeks-tematik", { recursive: true });
  await Bun.write(OUT_PATH, html);
  console.log(
    `✓ peta-standalone  ${cosmos.meta.cats} kategori, ${cosmos.meta.verses} ayat, ${bridges} penghubung, ${EXPECTED.entries} topik → ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`,
  );
}

if (import.meta.main) {
  await main();
}
