/* ════════════════════════════════════════════════════════════════════
   QuranKu clone — demo boot.

   The Beranda is a faithful clone of quran.tarjamahtafsiriyah.com (skin in demo.css,
   surah list from the app's own SURAH_INDEX). The "Tanya" tab is the New-Quranku feature
   added on top: it calls the REAL engine — retrieve() + compose() from ../src — so on stage
   it genuinely returns Qur'an verses for a feeling typed in plain Indonesian.

   Nothing here touches the live New-Quranku app; it only IMPORTS its pure retrieval modules.
   ════════════════════════════════════════════════════════════════════ */
import { SURAH_INDEX, CORPUS_VERSION } from "../src/surah-index.ts";
import { idName, idMeaning } from "./surah-id.ts";
import { retrieve, compose, type Corpus, type Hit } from "../src/retrieve.ts";
import { parseRef, loadAyah, loadSurah, displayName, surahMeta, BASMALAH, type ShardVerse } from "../src/quran.ts";
import { synthesizeAnswer } from "../src/answer.ts";
import type { AnswerContext, AnswerModel } from "../src/answer-contract.ts";
import { understandThemes, type ThemeContext, type ThemeModel } from "../src/theme-understand.ts";

/** The shape both the curated corpus (Reading) and a shard verse (ShardVerse.p/.c) satisfy. */
type ReadingLike = { text: string; translator: string; translation_type: string } | null;

/**
 * THE AI ENGINE — synthesis. This demo runs the *AI-authoring* edition (new-quranku-ai), not the
 * principled retrieval one. `synthesizeAnswer` gathers byte-exact grounding, hands it to the model,
 * and guards the prose. The model lives behind the edge Worker's /api/answer (it holds the key).
 *
 * The stock `liveAnswerModel` posts to a RELATIVE /api/answer — which does not exist on localhost —
 * so the demo uses this model, pointed at the deployed synthesis Worker (CORS-verified). Same
 * contract, same guard, same fail-closed degradation as the live app; only the URL is absolute.
 */
const AI_ANSWER_ENDPOINT = "https://new-quranku-ai.axiara.ai/api/answer";
const AI_TIMEOUT_MS = 20000;

const demoAnswerModel: AnswerModel = async (ctx: AnswerContext): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(AI_ANSWER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ctx.question, verses: ctx.verses, entries: ctx.entries }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/answer returned ${res.status}`);
    const data = (await res.json()) as { answer?: string | null };
    if (typeof data.answer !== "string" || data.answer.length === 0) throw new Error("no answer");
    return data.answer;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * The theme classifier — the FIRST model pass. Broadens retrieval so verses the keyword lexicon
 * misses still get grounded, exactly as the live synthesis app does (main.ts → understandThemes →
 * liveThemeModel → /api/classify). Without this the demo would ground on keywords alone and answer
 * more thinly on inputs phrased outside the lexicon. Absolute URL for the same reason as answer.
 */
const AI_CLASSIFY_ENDPOINT = "https://new-quranku-ai.axiara.ai/api/classify";
const CLASSIFY_TIMEOUT_MS = 4000;

const demoThemeModel: ThemeModel = async (ctx: ThemeContext): Promise<string[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);
  try {
    const res = await fetch(AI_CLASSIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ctx.question, themes: ctx.themes }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/classify returned ${res.status}`);
    const data = (await res.json()) as { themes?: unknown };
    if (!Array.isArray(data.themes)) throw new Error("no themes");
    return data.themes.filter((t): t is string => typeof t === "string");
  } finally {
    clearTimeout(timer);
  }
};

const AI_NOTE =
  `<p class="qk-ai-note">Jawaban ini disusun oleh AI berdasarkan ayat-ayat di atas — bukan fatwa, ` +
  `dan bukan kata-kata seorang ulama. Untuk kepastian, tanyakan kepada ustadz.</p>`;

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ── shared surah card (Beranda + Mushaf index) ──────────────────────── */
function surahCardHtml(s: (typeof SURAH_INDEX)[number], hrefPrefix: string): string {
  const rev = s.rev === "meccan" ? "meccan" : "medinan";
  const revLabel = s.rev === "meccan" ? "Makkiyah" : "Madaniyah";
  return `<li>
    <a class="qk-surah-card" href="${hrefPrefix}${s.n}" aria-label="${esc(s.tl)}">
      <div class="qk-sc-top">
        <div class="qk-sc-left">
          <span class="qk-sc-num">${s.n}</span>
          <span class="qk-sc-name">
            <span class="qk-sc-tl">${esc(idName(s.n, s.tl))}</span>
            <span class="qk-sc-en">${esc(idMeaning(s.n) || s.en)}</span>
          </span>
        </div>
        <span class="qk-sc-ar" dir="rtl" lang="ar">${esc(s.ar)}</span>
      </div>
      <div class="qk-sc-meta">
        <span class="qk-sc-rev ${rev}">${revLabel}</span>
        <span class="qk-sc-ayahs">${s.ayahs} Ayat</span>
      </div>
    </a>
  </li>`;
}

/* ── Beranda: the 114-surah grid (cards open the Mushaf reader) ───────── */
function renderSurahGrid(): void {
  const grid = $<HTMLUListElement>("#qk-surah-grid");
  grid.innerHTML = SURAH_INDEX.map((s) => surahCardHtml(s, "#/mushaf/")).join("");
}

/* ── Beranda: live clock ─────────────────────────────────────────────── */
function startClock(): void {
  const el = document.querySelector<HTMLElement>("#qk-clock");
  if (!el) return;
  // Date.now/new Date are fine in the browser (this is app code, not a workflow script).
  const tick = (): void => {
    const d = new Date();
    const p = (n: number): string => String(n).padStart(2, "0");
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  tick();
  window.setInterval(tick, 1000);
}

/* ── Beranda: "Topik Al-Qur'an Hari Ini" card (a real ayah from the corpus) ── */
async function renderToday(): Promise<void> {
  const el = document.querySelector<HTMLElement>("#qk-today");
  if (!el) return;
  const c = await ensureCorpus();
  if (!c) { el.remove(); return; }
  // A verse of consolation, present in the curated corpus (falls back to the first if absent).
  const pick =
    c.verses.find((v) => v.ref === "94:6") ??
    c.verses.find((v) => v.ref === "2:286") ??
    c.verses[0];
  if (!pick) { el.remove(); return; }
  const tr = pick.primary?.text ?? pick.companion?.text ?? "";
  el.innerHTML = `
    <div class="qk-today-ar" dir="rtl" lang="ar">${esc(pick.arabic)}</div>
    <p class="qk-today-tr">${esc(tr)}</p>
    <div class="qk-today-foot">
      <span class="qk-today-ref">${esc(pick.ref)} · ${esc(pick.surah_name)}</span>
      <a class="qk-today-btn" href="#/tanya">Baca Selengkapnya</a>
    </div>`;
}

/* ── Beranda: filter the surah grid ──────────────────────────────────── */
function wireSurahFind(): void {
  const input = document.querySelector<HTMLInputElement>("#qk-surah-find");
  const grid = document.querySelector<HTMLUListElement>("#qk-surah-grid");
  if (!input || !grid) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    for (const li of grid.querySelectorAll<HTMLLIElement>("li")) {
      li.hidden = q.length > 0 && !(li.textContent ?? "").toLowerCase().includes(q);
    }
  });
}

/* ── Tanya: wired to the real engine ─────────────────────────────────── */
let corpus: Corpus | null = null;
let corpusError = false;

async function ensureCorpus(): Promise<Corpus | null> {
  if (corpus || corpusError) return corpus;
  try {
    const res = await fetch(`/corpus.json?v=${CORPUS_VERSION}`);
    if (!res.ok) throw new Error(String(res.status));
    corpus = (await res.json()) as Corpus;
  } catch {
    corpusError = true;
  }
  return corpus;
}

function readingHtml(r: ReadingLike, primary: boolean): string {
  if (!r || !r.text.trim()) return "";
  const tag = r.translation_type === "literal" ? "Terjemah Harfiah" : "Terjemah Makna";
  return `<div class="qk-reading${primary ? " primary" : ""}">
    <span class="qk-reading-tag">${tag}</span>
    <div class="qk-reading-txt">${esc(r.text)}</div>
    <div class="qk-reading-by">oleh <b>${esc(r.translator)}</b></div>
  </div>`;
}

function cardHtml(ref: string, surahName: string, arabic: string, primary: ReadingLike, companion: ReadingLike): string {
  return `<article class="qk-verse">
    <div class="qk-verse-head">
      <span class="qk-verse-ref">${esc(ref)}</span>
      <span class="qk-verse-surah">${esc(surahName)}</span>
    </div>
    <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(arabic)}</div>
    ${readingHtml(primary, true)}
    ${readingHtml(companion, false)}
  </article>`;
}

const verseHtml = (hit: Hit): string =>
  cardHtml(hit.verse.ref, hit.verse.surah_name, hit.verse.arabic, hit.verse.primary, hit.verse.companion);

const SILENCE = `<div class="qk-silence">
  <p>Aku belum menemukan ayat yang benar-benar cocok untuk itu — dan aku tidak mau
  menyodorkan ayat yang tidak pas. Coba ceritakan dengan kata lain, atau sebutkan
  surah dan ayatnya langsung (misalnya <b>2:255</b>).</p>
</div>`;

async function askDirect(ref: string, ayah: number, out: HTMLDivElement, lead?: string): Promise<void> {
  const [surahStr] = ref.split(":");
  const surah = Number(surahStr);
  try {
    const v = await loadAyah(surah, ayah);
    out.innerHTML =
      (lead ? `<div class="qk-lead">${esc(lead)}</div>` : "") +
      cardHtml(`${surah}:${ayah}`, displayName(surah), v.ar, v.p, v.c);
  } catch {
    out.innerHTML = `<div class="qk-silence"><p><b>Gagal memuat ${esc(displayName(surah))}.</b> Periksa koneksi lalu coba lagi.</p></div>`;
  }
}

async function ask(qRaw: string): Promise<void> {
  const q = qRaw.trim();
  if (!q) return;
  const out = $<HTMLDivElement>("#qk-answer");
  out.innerHTML = `<div class="qk-lead">Mencari ayat untukmu…</div>`;

  // Direct reference — "2:255", "surat 18 ayat 10", "yasin" — resolves via the shard loader,
  // so ANY of the 6236 ayat works, not just the curated feelings corpus.
  const ref = parseRef(q);
  if (ref.kind === "ayah") { await askDirect(`${ref.surah.n}:${ref.ayah}`, ref.ayah, out); return; }
  if (ref.kind === "surah") { await askDirect(`${ref.surah.n}:1`, 1, out, `${displayName(ref.surah.n)} — ayat 1:`); return; }
  if (ref.kind === "no-such-ayah") {
    out.innerHTML = `<div class="qk-silence"><p><b>${esc(displayName(ref.surah.n))}</b> hanya sampai ayat ${ref.surah.ayahs}. Ayat ${ref.ayah} tidak ada.</p></div>`;
    return;
  }
  if (ref.kind === "no-such-surah") {
    out.innerHTML = `<div class="qk-silence"><p>Tidak ada surah nomor ${ref.surah}. Al-Qur'an punya 114 surah.</p></div>`;
    return;
  }

  const c = await ensureCorpus();
  if (!c) {
    out.innerHTML = `<div class="qk-silence"><p><b>Gagal memuat data.</b> Periksa koneksi lalu coba lagi.</p></div>`;
    return;
  }

  // ── THE AI ENGINE (primary) ──────────────────────────────────────────
  // Synthesis: the model AUTHORS a grounded answer. Slower than a framing line (a real model call),
  // so it gets its own "menyusun" state. Returns null only when it cannot ground/guard safely — then
  // we degrade to the principled engine below, exactly as the live app does. Never a blank turn.
  out.innerHTML = `<div class="qk-lead qk-thinking">Menyusun jawaban dari ayat-ayatnya…</div>`;
  // Pass 1 — the theme classifier broadens retrieval (same as the live app). Falls back to keyword-
  // only retrieval ([]) if the classifier is slow/down; never blocks the answer beyond its timeout.
  const modelThemes = await understandThemes(q, c.themes, demoThemeModel, () => []);
  // Pass 2 — author the grounded answer, now grounded on the enriched retrieval.
  const ai = await synthesizeAnswer(c, q, modelThemes, demoAnswerModel);
  if (ai) {
    out.innerHTML = aiAnswerHtml(c, ai.prose, ai.refs);
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }

  // ── principled fallback (honest degradation) ─────────────────────────
  const hits = retrieve(c, q);
  if (!hits.length) {
    out.innerHTML = SILENCE;
    return;
  }
  const lead = compose(hits, q);
  out.innerHTML =
    (lead ? `<div class="qk-lead">${esc(lead)}</div>` : "") +
    hits.map(verseHtml).join("");
  out.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Render the AI-authored answer: guarded prose (paragraphs) + grounding verses + the AI label. */
function aiAnswerHtml(c: Corpus, prose: string, refs: readonly string[]): string {
  const paras = prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="qk-ai-said">${esc(p)}</p>`)
    .join("");
  const cards = refs
    .map((r) => c.verses.find((v) => v.ref === r))
    .filter((v): v is NonNullable<typeof v> => v !== undefined)
    .map((v) => cardHtml(v.ref, v.surah_name, v.arabic, v.primary, v.companion))
    .join("");
  return `<div class="qk-ai">${paras}</div>` + cards + AI_NOTE;
}

function wireTanya(): void {
  const form = $<HTMLFormElement>("#qk-ask");
  const ta = $<HTMLTextAreaElement>("#qk-q");
  const send = $<HTMLButtonElement>("#qk-send");

  const sync = (): void => {
    send.disabled = ta.value.trim().length === 0;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };
  ta.addEventListener("input", sync);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void ask(ta.value);
  });

  for (const seed of document.querySelectorAll<HTMLButtonElement>(".qk-seed")) {
    seed.addEventListener("click", () => {
      ta.value = seed.textContent ?? "";
      sync();
      void ask(ta.value);
    });
  }

  // Homepage search → route into Tanya and run it, so the feature is discoverable from Beranda.
  const search = $<HTMLFormElement>("#qk-search");
  search.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = search.querySelector("input");
    const val = input?.value.trim() ?? "";
    if (!val) return;
    ta.value = val;
    location.hash = "#/tanya";
    sync();
    void ask(val);
  });

  // Topic chips are illustrative on the clone; clicking one seeds Tanya with it.
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".qk-chip")) {
    chip.addEventListener("click", () => {
      ta.value = chip.textContent?.trim() ?? "";
      location.hash = "#/tanya";
      sync();
      void ask(ta.value);
    });
  }
}

/* ════════════════════════════════════════════════════════════════════
   The other tabs — each reuses New-Quranku's real content behind the QuranKu skin.
   ════════════════════════════════════════════════════════════════════ */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}

/* ── MUSHAF: per-ayah reading with dual translations (the improvement over a page-image mushaf) ── */
function ayahHtml(surah: number, surahName: string, v: ShardVerse): string {
  const ref = `${surah}:${v.a}`;
  const tr = v.p?.text ?? v.c?.text ?? "";
  const on = isBookmarked(ref);
  return `<article class="qk-verse">
    <div class="qk-verse-head">
      <span class="qk-verse-ref">${esc(ref)}</span>
      <span class="qk-verse-surah">${esc(surahName)}</span>
      <button class="qk-bm-btn${on ? " is-on" : ""}" aria-label="Simpan ayat" aria-pressed="${on}"
        data-ref="${esc(ref)}" data-surah="${esc(surahName)}" data-ar="${esc(v.ar)}" data-tr="${esc(tr)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>
      </button>
    </div>
    <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(v.ar)}</div>
    ${readingHtml(v.p, true)}
    ${readingHtml(v.c, false)}
  </article>`;
}

async function renderMushaf(param?: string): Promise<void> {
  const el = $("#qk-mushaf");
  const n = param ? Number(param) : 0;
  if (!n || n < 1 || n > 114) {
    el.innerHTML =
      `<div class="qk-page-head"><h1>Mushaf</h1><p>Baca Al-Qur'an per ayat — terjemah makna dan terjemah harfiah berdampingan, dengan sumber yang disebutkan namanya. 114 surah.</p></div>` +
      `<ul class="qk-surah-grid">${SURAH_INDEX.map((s) => surahCardHtml(s, "#/mushaf/")).join("")}</ul>`;
    return;
  }
  el.innerHTML = `<div class="qk-lead qk-thinking">Memuat surah…</div>`;
  try {
    const shard = await loadSurah(n);
    const meta = surahMeta(n);
    const revLabel = meta?.rev === "meccan" ? "Makkiyah" : "Madaniyah";
    el.innerHTML =
      `<a class="qk-back" href="#/mushaf">‹ Semua surah</a>
      <div class="qk-read-title">
        <div class="qk-read-ar" dir="rtl" lang="ar">${esc(shard.name_ar)}</div>
        <h1>${esc(idName(n, shard.name))}</h1>
        <p>${esc(idMeaning(n))} · ${meta?.ayahs ?? shard.verses.length} ayat · ${revLabel}</p>
      </div>
      ${shard.bismillah ? `<div class="qk-read-bismillah" dir="rtl" lang="ar">${esc(BASMALAH)}</div>` : ""}
      <div class="qk-ayat">${shard.verses.map((v) => ayahHtml(n, shard.name, v)).join("")}</div>`;
    wireBookmarkButtons(el);
  } catch {
    el.innerHTML = `<a class="qk-back" href="#/mushaf">‹ Semua surah</a><div class="qk-silence"><p><b>Gagal memuat surah.</b> Periksa koneksi lalu coba lagi.</p></div>`;
  }
}

/* ── TEMATIK: the Indeks Tematik (reuses New-Quranku's Peta data — Ustadz Muhammad Thalib's) ── */
interface PetaIndex { categories: { slug: string; category: string; entries: number }[] }
interface PetaCategory { category: string; subtopics: { subtopic: string; entries: { text: string; ref: string }[] }[] }

async function renderTematik(slug?: string): Promise<void> {
  const el = $("#qk-tematik");
  el.innerHTML = `<div class="qk-lead qk-thinking">Memuat…</div>`;
  try {
    if (!slug) {
      const idx = await fetchJson<PetaIndex>("/peta/index.json");
      el.innerHTML =
        `<div class="qk-page-head"><h1>Indeks Tematik Al-Qur'an</h1><p>Temukan dan pelajari ayat-ayat berdasarkan topik-topik utama yang telah dikelompokkan secara sistematis. Oleh <b>Ustadz Muhammad Thalib</b>.</p></div>` +
        `<ul class="qk-cat-grid">${idx.categories.map((c, i) => `<li>
          <a class="qk-cat-card" href="#/tematik/${encodeURIComponent(c.slug)}">
            <span class="qk-cat-n">${i + 1}</span>
            <span class="qk-cat-body"><span class="qk-cat-name">${esc(c.category)}</span><span class="qk-cat-count">${c.entries} entri</span></span>
            <span class="qk-cat-go">›</span>
          </a></li>`).join("")}</ul>`;
      return;
    }
    const cat = await fetchJson<PetaCategory>(`/peta/${slug}.json`);
    const subs = cat.subtopics.map((s) =>
      `<div class="qk-sub"><h2>${esc(s.subtopic)}</h2><ul class="qk-tentries">${
        s.entries.map((e) => `<li class="qk-tentry"><p class="qk-tentry-text">${esc(e.text)}</p><span class="qk-tentry-ref">${esc(e.ref)}</span></li>`).join("")
      }</ul></div>`).join("");
    el.innerHTML =
      `<a class="qk-back" href="#/tematik">‹ Semua topik</a>
      <div class="qk-page-head"><h1>${esc(cat.category)}</h1><p class="qk-credit">Indeks Tematik oleh <b>Ustadz Muhammad Thalib</b>.</p></div>${subs}`;
  } catch {
    el.innerHTML = `<div class="qk-silence"><p><b>Gagal memuat indeks tematik.</b> Coba lagi.</p></div>`;
  }
}

/* ── AUDIO: the full 114-surah grid + a persistent player (bottom bar + fullscreen) ──
   Only these four surahs have local recitation; the rest show the same card (visual parity) with an
   inert, dimmed play button. The player lives OUTSIDE the route so it survives tab changes. */
const AUDIO_AVAIL = new Set([1, 112, 113, 114]);
const QARI_NAME = "Mishary Rashid Al-Afasy";

const pl = { surah: 0, ayah: 1, total: 0, rate: 1 };
let pAudio: HTMLAudioElement | null = null;

const fmtTime = (t: number): string => {
  if (!isFinite(t) || t < 0) return "0:00";
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
};
const setText = (sel: string, text: string): void => { const e = document.querySelector(sel); if (e) e.textContent = text; };
const setPlayIcons = (playing: boolean): void => {
  for (const i of document.querySelectorAll<HTMLElement>(".qk-pplay-i")) i.classList.toggle("is-playing", playing);
};
function markAudioGrid(): void {
  const playing = pl.surah > 0 && !(pAudio?.paused ?? true);
  for (const c of document.querySelectorAll<HTMLElement>(".qk-au-card")) {
    c.classList.toggle("is-playing", playing && Number(c.dataset.surah) === pl.surah);
  }
}
function updatePlayerUI(): void {
  const m = surahMeta(pl.surah);
  const nm = idName(pl.surah, m?.tl ?? "");
  setText("#qk-pbar-title", nm);
  setText("#qk-full-name", nm);
  setText("#qk-full-ar", m?.ar ?? "");
  setText("#qk-full-wm", String(pl.surah).padStart(3, "0"));
  setText("#qk-full-ayah", `Ayat ${pl.ayah} dari ${pl.total}`);
  setPlayIcons(!(pAudio?.paused ?? true));
  markAudioGrid();
  for (const b of document.querySelectorAll<HTMLButtonElement>("#qk-speeds button")) {
    b.classList.toggle("is-active", Number(b.dataset.rate) === pl.rate);
  }
}
function loadCurrentAyah(): void {
  if (!pAudio || !pl.surah) return;
  pAudio.src = `/audio/${pl.surah}/${pl.ayah}.mp3`;
  pAudio.playbackRate = pl.rate;
  void pAudio.play();
}
function playerStart(n: number): void {
  if (!AUDIO_AVAIL.has(n)) return;
  pl.surah = n; pl.ayah = 1; pl.total = surahMeta(n)?.ayahs ?? 0;
  $("#qk-pbar").hidden = false;
  loadCurrentAyah();
  updatePlayerUI();
}
function playerNext(): void { if (pl.surah && pl.ayah < pl.total) { pl.ayah += 1; loadCurrentAyah(); updatePlayerUI(); } }
function playerPrev(): void { if (pl.surah && pl.ayah > 1) { pl.ayah -= 1; loadCurrentAyah(); updatePlayerUI(); } }
function openFull(): void { if (!pl.surah) return; $("#qk-pfull").hidden = false; document.body.style.overflow = "hidden"; updatePlayerUI(); }
function closeFull(): void { $("#qk-pfull").hidden = true; document.body.style.overflow = ""; }
function playerClose(): void { pAudio?.pause(); pl.surah = 0; $("#qk-pbar").hidden = true; closeFull(); markAudioGrid(); }

function initPlayer(): void {
  pAudio = $<HTMLAudioElement>("#qk-audio-el");
  const act = (a: string, btn: HTMLElement): void => {
    if (a === "toggle") { if (pAudio) { if (pAudio.paused) void pAudio.play(); else pAudio.pause(); } }
    else if (a === "next") playerNext();
    else if (a === "prev") playerPrev();
    else if (a === "close") playerClose();
    else if (a === "fullscreen") { if (!pl.surah) playerStart(1); openFull(); }
    else if (a === "collapse") closeFull();
    else if (a === "mute" && pAudio) { pAudio.muted = !pAudio.muted; btn.classList.toggle("is-on", pAudio.muted); }
    else if (a === "repeat") { for (const el of document.querySelectorAll<HTMLElement>('[data-act="repeat"]')) el.classList.toggle("is-on"); }
  };
  for (const b of document.querySelectorAll<HTMLElement>("[data-act]")) b.addEventListener("click", () => act(b.dataset.act ?? "", b));
  for (const b of document.querySelectorAll<HTMLButtonElement>("#qk-speeds button")) {
    b.addEventListener("click", () => { pl.rate = Number(b.dataset.rate); if (pAudio) pAudio.playbackRate = pl.rate; updatePlayerUI(); });
  }
  const seek = (v: number): void => { if (pAudio && isFinite(pAudio.duration)) pAudio.currentTime = (v / 1000) * pAudio.duration; };
  for (const s of document.querySelectorAll<HTMLInputElement>(".qk-pseek")) s.addEventListener("input", () => seek(Number(s.value)));
  $<HTMLInputElement>("#qk-vol").addEventListener("input", (e) => { if (pAudio) pAudio.volume = Number((e.target as HTMLInputElement).value) / 100; });
  pAudio.addEventListener("timeupdate", () => {
    if (!pAudio) return;
    const cur = pAudio.currentTime, dur = pAudio.duration || 0;
    const pct = dur ? String((cur / dur) * 1000) : "0";
    for (const s of document.querySelectorAll<HTMLInputElement>(".qk-pseek")) s.value = pct;
    setText("#qk-cur", fmtTime(cur)); setText("#qk-full-cur", fmtTime(cur));
    setText("#qk-dur", fmtTime(dur)); setText("#qk-full-dur", fmtTime(dur));
  });
  pAudio.addEventListener("play", () => { setPlayIcons(true); markAudioGrid(); });
  pAudio.addEventListener("pause", () => { setPlayIcons(false); markAudioGrid(); });
  pAudio.addEventListener("ended", () => {
    const repeatOn = document.querySelector('.qk-pbar [data-act="repeat"]')?.classList.contains("is-on");
    if (repeatOn) loadCurrentAyah();
    else if (pl.ayah < pl.total) { pl.ayah += 1; loadCurrentAyah(); updatePlayerUI(); }
    else { setPlayIcons(false); markAudioGrid(); }
  });
}

function renderAudio(): void {
  const el = $("#qk-audio");
  const pad = (n: number): string => String(n).padStart(3, "0");
  const cards = SURAH_INDEX.map((s) => {
    const avail = AUDIO_AVAIL.has(s.n);
    return `<div class="qk-au-card${avail ? "" : " qk-au-off"}" data-surah="${s.n}">
      <span class="qk-au-wm">${pad(s.n)}</span>
      <div class="qk-au-name">${s.n}. ${esc(idName(s.n, s.tl))}</div>
      <div class="qk-au-sub">${esc(idMeaning(s.n) || `${s.ayahs} ayat`)}</div>
      <button class="qk-au-play" data-surah="${s.n}" aria-label="Putar ${esc(s.tl)}"${avail ? "" : ' title="Audio belum tersedia di demo"'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 8.2 16 12l-6 3.8V8.2Z" fill="currentColor" stroke="none"/></svg>
      </button>
    </div>`;
  }).join("");
  el.innerHTML =
    `<div class="qk-au-hero">
      <span class="qk-au-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v3a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2ZM20 13v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z"/></svg></span>
      <h1 class="qk-hero-title">Audio Al-Qur'an</h1>
      <p>Dengarkan lantunan merdu ayat suci Al-Qur'an dari Qari ternama, per Surah atau per Juz.</p>
      <button class="qk-au-fs" data-act="fullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
        Buka Player Fullscreen
      </button>
    </div>
    <div class="qk-au-toolbar">
      <div class="qk-find">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
        <input type="search" id="qk-au-find" placeholder="Cari Surah..." aria-label="Cari surah">
      </div>
      <div class="qk-au-selects">
        <span class="qk-au-sel">Per Surah <span class="qk-au-caret">▾</span></span>
        <span class="qk-au-sel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>${esc(QARI_NAME)} <span class="qk-au-caret">▾</span></span>
      </div>
    </div>
    <div class="qk-au-grid">${cards}</div>`;
  // The hero fullscreen button is created dynamically, so wire it here (initPlayer only saw static [data-act]).
  el.querySelector<HTMLButtonElement>(".qk-au-fs")?.addEventListener("click", () => { if (!pl.surah) playerStart(1); openFull(); });
  for (const b of el.querySelectorAll<HTMLButtonElement>(".qk-au-play")) {
    b.addEventListener("click", () => playerStart(Number(b.dataset.surah)));
  }
  const find = el.querySelector<HTMLInputElement>("#qk-au-find");
  find?.addEventListener("input", () => {
    const q = find.value.trim().toLowerCase();
    for (const c of el.querySelectorAll<HTMLElement>(".qk-au-card")) {
      c.hidden = q.length > 0 && !(c.textContent ?? "").toLowerCase().includes(q);
    }
  });
  markAudioGrid();
}

/* ── BOOKMARK: saved verses (localStorage) ───────────────────────────── */
interface Bookmark { ref: string; surah: string; ar: string; tr: string }
const BM_KEY = "qk-demo-bookmarks";
function getBookmarks(): Bookmark[] {
  try { const v = JSON.parse(localStorage.getItem(BM_KEY) ?? "[]"); return Array.isArray(v) ? (v as Bookmark[]) : []; }
  catch { return []; }
}
function saveBookmarks(list: Bookmark[]): void { localStorage.setItem(BM_KEY, JSON.stringify(list)); }
function isBookmarked(ref: string): boolean { return getBookmarks().some((b) => b.ref === ref); }
function toggleBookmark(bm: Bookmark): boolean {
  const list = getBookmarks();
  const i = list.findIndex((b) => b.ref === bm.ref);
  if (i >= 0) { list.splice(i, 1); saveBookmarks(list); return false; }
  list.unshift(bm); saveBookmarks(list); return true;
}
function wireBookmarkButtons(scope: HTMLElement): void {
  for (const b of scope.querySelectorAll<HTMLButtonElement>(".qk-bm-btn")) {
    b.addEventListener("click", () => {
      const on = toggleBookmark({ ref: b.dataset.ref ?? "", surah: b.dataset.surah ?? "", ar: b.dataset.ar ?? "", tr: b.dataset.tr ?? "" });
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
}
function renderBookmark(): void {
  const el = $("#qk-bookmark");
  const list = getBookmarks();
  if (!list.length) {
    el.innerHTML =
      `<div class="qk-page-head"><h1>Bookmark</h1><p>Ayat yang kamu simpan, tersimpan langsung di perangkat ini — tanpa perlu login.</p></div>
      <div class="qk-empty">
        <span class="qk-empty-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg></span>
        <p class="qk-empty-lead">Belum ada ayat yang disimpan.</p>
        <p>Buka <a href="#/mushaf">Mushaf</a>, lalu ketuk ikon bookmark pada sebuah ayat untuk menyimpannya di sini.</p>
      </div>`;
    return;
  }
  el.innerHTML =
    `<div class="qk-page-head"><h1>Bookmark</h1><p>${list.length} ayat disimpan.</p></div>` +
    list.map((bm) => `<article class="qk-verse">
      <div class="qk-verse-head">
        <span class="qk-verse-ref">${esc(bm.ref)}</span>
        <span class="qk-verse-surah">${esc(bm.surah)}</span>
        <button class="qk-bm-remove" data-ref="${esc(bm.ref)}" aria-label="Hapus bookmark">✕</button>
      </div>
      <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(bm.ar)}</div>
      <div class="qk-reading primary"><span class="qk-reading-tag">Terjemah Makna</span><div class="qk-reading-txt">${esc(bm.tr)}</div></div>
    </article>`).join("");
  for (const b of el.querySelectorAll<HTMLButtonElement>(".qk-bm-remove")) {
    b.addEventListener("click", () => { saveBookmarks(getBookmarks().filter((x) => x.ref !== b.dataset.ref)); renderBookmark(); });
  }
}

/* ── router ──────────────────────────────────────────────────────────── */
const ROUTES = ["beranda", "tanya", "mushaf", "tematik", "audio", "bookmark"] as const;

function route(): void {
  // The fullscreen player is a modal overlay that persists across routes by design; but it must never
  // survive a NAVIGATION, or you land inside the player (covering e.g. Beranda) instead of the route.
  // The bottom bar keeps playing — only the fullscreen overlay is dismissed. (openFull() doesn't touch
  // the hash, so the Audio → fullscreen flow is unaffected.)
  closeFull();

  const [sectionRaw = "", param] = location.hash.replace(/^#\//, "").split("/");
  const section = (ROUTES as readonly string[]).includes(sectionRaw) ? sectionRaw : "beranda";

  for (const r of ROUTES) {
    const node = document.getElementById(`route-${r}`);
    if (node) node.hidden = r !== section;
  }

  if (section === "mushaf") void renderMushaf(param);
  else if (section === "tematik") void renderTematik(param ? decodeURIComponent(param) : undefined);
  else if (section === "audio") renderAudio();
  else if (section === "bookmark") renderBookmark();

  for (const link of document.querySelectorAll<HTMLAnchorElement>(".qk-nav-link")) {
    if (link.dataset.route === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  window.scrollTo({ top: 0 });
}

/* ── boot ────────────────────────────────────────────────────────────── */
renderSurahGrid();
wireSurahFind();
wireTanya();
startClock();
initPlayer();
void renderToday();
window.addEventListener("hashchange", route);
route();
