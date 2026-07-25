/* ════════════════════════════════════════════════════════════════════
   QuranKu clone — demo boot.

   The Beranda is a faithful clone of quran.tarjamahtafsiriyah.com (skin in demo.css,
   surah list from the app's own SURAH_INDEX). The "Tanya" tab is the New-Quranku feature
   added on top: it calls the REAL engine — retrieve() + compose() from ../src — so on stage
   it genuinely returns Qur'an verses for a feeling typed in plain Indonesian.

   Nothing here touches the live New-Quranku app; it only IMPORTS its pure retrieval modules.
   ════════════════════════════════════════════════════════════════════ */
import { SURAH_INDEX, CORPUS_VERSION } from "../src/surah-index.ts";
import { JUZ, juzLabel } from "../src/juz.ts";
import { idName, idMeaning } from "./surah-id.ts";
// The verse card, extracted so it can be tested. Two entry points: `curatedCardHtml` takes a corpus
// verse whole (so a reviewer's co-display condition cannot be left behind), `shardCardHtml` draws a
// plain mushaf ayah that has no curation to carry.
import { curatedCardHtml, shardCardHtml, readingHtml } from "./card.ts";
import { esc } from "../src/esc.ts";
import { todayPick, todayCardHtml } from "./today.ts";
import { linkifyRefs, resolvedRefsInProse } from "./linkify.ts";
import { retrieve, compose, needsFamilyLawScholar, type Corpus, type Hit } from "../src/retrieve.ts";
import { parseRef, loadAyah, loadSurah, displayName, surahMeta, BASMALAH, type ShardVerse } from "../src/quran.ts";
import { synthesizeAnswer } from "../src/answer.ts";
import { composeFraming, type ComposeContext, type FramingModel } from "../src/compose-contract.ts";
import type { AnswerContext, AnswerModel } from "../src/answer-contract.ts";
import { understandThemes, type ThemeContext, type ThemeModel } from "../src/theme-understand.ts";
// The AI chat is the SAME conversation model as the live new-quranku-ai edition: a persisted thread
// of turns, crisis exchanges answered but never written to disk, knowledge/aqidah fallback lanes.
import { rememberTurn, loadThread, clearThread, hasThread, turnFromHits, type Turn } from "../src/thread.ts";
import { detectCrisis, crisisReply } from "../src/crisis.ts";
import { matchAqidah, aqidahById, type AqidahEntry } from "../src/aqidah.ts";
import { retrieveKnowledge, type KnowledgeAnswer } from "../src/knowledge.ts";
import { knowledgeOnly, looksFactual } from "../src/question-form.ts";
// The baked 3D cosmos built for the Indeks Tematik: 1,632 verse-stars around 13 category hubs.
// Coordinates are precomputed (src/app/build-peta-3d.ts) — this only draws them, no solver.
import { legendHtml, mountCosmos, type Cosmos, type CosmosHandle } from "../src/peta-cosmos.ts";

/**
 * THE AI ENGINE — synthesis. This demo runs the *AI-authoring* edition (new-quranku-ai), not the
 * principled retrieval one. `synthesizeAnswer` gathers byte-exact grounding, hands it to the model,
 * and guards the prose. The model lives behind the edge Worker's /api/answer (it holds the key).
 *
 * SELF-HOSTED SINCE 2026-07-22. These three calls used to point at
 * https://new-quranku-ai.axiara.ai — the demo was a keyless static host borrowing the synthesis
 * Worker's key cross-origin. When the other two apps were retired, that made the surviving app
 * depend on a deleted one, so the demo Worker now holds its own key and serves its own /api/*.
 *
 * Same-origin in production, which also means no CORS surface at all. Localhost has no Worker
 * behind it, so dev falls back to the deployed demo host — the one case that still needs an
 * absolute URL.
 */
const API_ORIGIN =
  typeof location !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "https://demo-quranku.axiara.ai"
    : "";
const apiUrl = (path: string): string => `${API_ORIGIN}${path}`;

const AI_ANSWER_ENDPOINT = apiUrl("/api/answer");
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
const AI_CLASSIFY_ENDPOINT = apiUrl("/api/classify");
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

/**
 * The framing — the warm sentences that sit ABOVE the verses on the retrieval path.
 *
 * Until now the demo called the deterministic `compose()` only, so it showed the canned one-liner
 * ("Capek, ya, nahan semuanya sendirian.") while the live app had long since moved to prose that
 * answers the PERSON — naming the thing they actually wrote, sitting with it, then handing over.
 * The demo is the surface Erik pitches with, so it was showing strictly worse work than the
 * product it represents. Third of the three model passes to get an absolute URL, for the same
 * reason as answer and classify: a relative /api/compose does not exist on localhost or on the
 * demo Worker (which is a static host and holds no key).
 *
 * `composeFraming` keeps the canned line as its fallback, so every failure path — CORS, timeout,
 * a wall rejection, no key — lands exactly where the demo already was. This can only improve the
 * line, never remove it.
 *
 * Timeout is 8s to match `compose-live.ts`: the rewritten framing generates three specific
 * sentences rather than one generic one, and measured latency runs 2.2–5.7s. The old 4s cap threw
 * away good prose one call in four, invisibly — the endpoint logged a success for a line nobody
 * ever read. Do not lower this without re-measuring.
 */
const AI_COMPOSE_ENDPOINT = apiUrl("/api/compose");
const COMPOSE_TIMEOUT_MS = 8000;

const demoFramingModel: FramingModel = async (ctx: ComposeContext): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPOSE_TIMEOUT_MS);
  try {
    const res = await fetch(AI_COMPOSE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ctx.question, theme: ctx.theme, themeCount: ctx.themeCount }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/compose returned ${res.status}`);
    const data = (await res.json()) as { prose?: string | null };
    if (typeof data.prose !== "string" || data.prose.length === 0) throw new Error("no prose");
    return data.prose;
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
// `esc` is imported from ../src/esc.ts (see the card import above), not redefined here. The local
// copy that used to live at this line escaped &, <, >, " but NOT ' — so the demo had two escapers
// of different strength, and the 47 call sites below were on the weaker one while the verse card
// was on the stronger. esc.ts is a pure, DOM-free module; there is no reason for a second one.

/* ── shared surah card (Beranda + Mushaf index) ──────────────────────── */
function surahCardHtml(s: (typeof SURAH_INDEX)[number], hrefPrefix: string, byRevelation = false): string {
  const rev = s.rev === "meccan" ? "meccan" : "medinan";
  const revLabel = s.rev === "meccan" ? "Makkiyah" : "Madaniyah";
  // In revelation order the badge shows the ORDER, not the surah number — otherwise the list
  // reads as a scrambled 1..114 and looks broken. The mushaf number moves to the meta row so
  // it is still there, just no longer the thing being counted.
  const badge = byRevelation ? s.order : s.n;
  return `<li>
    <a class="qk-surah-card" href="${hrefPrefix}${s.n}" aria-label="${esc(s.tl)}${byRevelation ? ` — wahyu ke-${s.order}` : ""}">
      <div class="qk-sc-top">
        <div class="qk-sc-left">
          <span class="qk-sc-num">${badge}</span>
          <span class="qk-sc-name">
            <span class="qk-sc-tl">${esc(idName(s.n, s.tl))}</span>
            <span class="qk-sc-en">${esc(idMeaning(s.n) || s.en)}</span>
          </span>
        </div>
        <span class="qk-sc-ar" dir="rtl" lang="ar">${esc(s.ar)}</span>
      </div>
      <div class="qk-sc-meta">
        <span class="qk-sc-rev ${rev}">${revLabel}</span>
        <span class="qk-sc-ayahs">${byRevelation ? `Surah ${s.n} · ${s.ayahs} Ayat` : `${s.ayahs} Ayat`}</span>
      </div>
    </a>
  </li>`;
}

/* ── shared juz card (same visual language as the surah card) ─────────── */
function juzCardHtml(j: (typeof JUZ)[number]): string {
  // Deep-links to the exact ayah the juz opens on, not just its surah — landing on 2:1 when the
  // juz actually begins at 2:142 would be the app quietly disagreeing with its own boundary.
  const surahCount = j.es - j.s + 1;
  const span = surahCount === 1 ? "1 surah" : `${surahCount} surah`;
  return `<li>
    <a class="qk-surah-card" href="#/mushaf/${j.s}/${j.a}" aria-label="${esc(juzLabel(j.n))}">
      <div class="qk-sc-top">
        <div class="qk-sc-left">
          <span class="qk-sc-num">${j.n}</span>
          <span class="qk-sc-name">
            <span class="qk-sc-tl">Juz ${j.n}</span>
            <span class="qk-sc-en">${esc(idName(j.s, j.from))} ${j.a} – ${esc(idName(j.es, j.to))} ${j.ea}</span>
          </span>
        </div>
      </div>
      <div class="qk-sc-meta">
        <span class="qk-sc-rev meccan">${span}</span>
        <span class="qk-sc-ayahs">${j.ayahs} Ayat</span>
      </div>
    </a>
  </li>`;
}

/* ── Beranda: the 114-surah grid (cards open the Mushaf reader) ───────── */
function renderSurahGrid(): void {
  const grid = $<HTMLUListElement>("#qk-surah-grid");
  grid.innerHTML = SURAH_INDEX.map((s) => surahCardHtml(s, "#/mushaf/")).join("");
}

/* ── Beranda: the 30-juz grid ────────────────────────────────────────── */
function renderJuzGrid(): void {
  const grid = $<HTMLUListElement>("#qk-surah-grid");
  grid.innerHTML = JUZ.map((j) => juzCardHtml(j)).join("");
}

/**
 * Beranda: the 114 surahs in the order they were REVEALED, not the order they are arranged in.
 *
 * These are different sequences and the difference is the point: Al-Alaq came first, Al-Faatiha
 * fifth, An-Nasr last, while the mushaf opens with Al-Faatiha and puts Al-Alaq at 96. Reading in
 * revelation order is how people follow the arc of the revelation rather than the arrangement.
 *
 * `order` is Tanzil's `order` attribute, carried through the pinned metadata to SURAH_INDEX — a
 * traditional ordering, not a reconstruction of ours.
 */
function renderRevelationGrid(): void {
  const grid = $<HTMLUListElement>("#qk-surah-grid");
  grid.innerHTML = SURAH_INDEX.slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => surahCardHtml(s, "#/mushaf/", true))
    .join("");
}

/**
 * The Surah / Juz tabs.
 *
 * These three buttons were inert decoration since the demo was built — `is-active` hardcoded on
 * "Surah" and nothing listening. All three now have data behind them: surah order, juz, and
 * revelation order (the last unlocked by carrying Tanzil's `order` through to SURAH_INDEX).
 */
function wireListTabs(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".qk-tabs .qk-tab"));
  if (tabs.length === 0) return;

  const find = document.querySelector<HTMLInputElement>("#qk-surah-find");
  const blurb = document.querySelector<HTMLElement>(".qk-surah-head p");

  const select = (idx: number): void => {
    tabs.forEach((t, i) => {
      t.classList.toggle("is-active", i === idx);
      t.setAttribute("aria-selected", i === idx ? "true" : "false");
    });
    if (idx === 1) {
      renderJuzGrid();
      if (blurb) blurb.textContent = "Jelajahi 30 juz dalam Al-Qur'an.";
      if (find) find.placeholder = "Cari juz, nomor, nama surah...";
    } else if (idx === 2) {
      renderRevelationGrid();
      if (blurb) blurb.textContent = "114 surah menurut urutan diturunkannya wahyu.";
      if (find) find.placeholder = "Cari nama surah, arti, nomor...";
    } else {
      renderSurahGrid();
      if (blurb) blurb.textContent = "Jelajahi 114 surah dalam Al-Qur'an.";
      if (find) find.placeholder = "Cari nama surah, arti, nomor...";
    }
    // The filter box matches on rendered text, so a stale query would hide every new card.
    if (find && find.value.trim().length > 0) {
      find.value = "";
      find.dispatchEvent(new Event("input"));
    }
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
  });
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
  // The pick rule and this slot's markup live in today.ts so they can be tested — the eligibility
  // filter that keeps conditionally-approved verses off the home screen is the whole invariant here.
  const pick = todayPick(c.verses);
  if (!pick) { el.remove(); return; }
  el.innerHTML = todayCardHtml(pick);
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

/** A retrieved hit — curated, so the verse goes through whole and its condition travels with it. */
const verseHtml = (hit: Hit): string => curatedCardHtml(hit.verse);

const SILENCE = `<div class="qk-silence">
  <p>Aku belum menemukan ayat yang benar-benar cocok untuk itu — dan aku tidak mau
  menyodorkan ayat yang tidak pas. Coba ceritakan dengan kata lain, atau sebutkan
  surah dan ayatnya langsung (misalnya <b>2:255</b>).</p>
</div>`;

/** A marital rights/obligation question (nafkah): fiqh, not feeling. No verse, no KB — a pointer to
 * a human ustadz who does family law. See needsFamilyLawScholar() in ../src/retrieve.ts. */
const REFER = `<div class="qk-silence">
  <p>Ini soal <b>hak dan kewajiban dalam rumah tangga</b> — termasuk nafkah. Aku menemani lewat
  perasaan, dan aku tidak mau menyodorkan ayat yang tidak pas atau seolah memberi putusan hukum keluarga.</p>
  <p>Untuk hal seperti ini, sebaiknya kamu tanya <b>ustadz atau tokoh agama yang paham hukum keluarga</b> —
  mereka bisa menjelaskan hak dan langkah yang bisa kamu tempuh dengan lengkap.</p>
</div>`;

/* ── the chat thread ─────────────────────────────────────────────────
   Matches the live new-quranku-ai edition: an accumulating conversation, not a single answer.
   We persist what the engine DECIDED (a ref, hits, an AI prose turn) via thread.ts and re-derive
   the markup here, so a restored thread is always current markup — never resurrected HTML. */
const thread = (): HTMLDivElement => $<HTMLDivElement>("#qk-thread");
const clearBtn = (): HTMLButtonElement => $<HTMLButtonElement>("#qk-thread-clear");

function refreshClear(): void { clearBtn().hidden = !hasThread(); }
/** Landing-only content (intro hero + seed/promise extras) shows on an empty Tanya, hides once chatting. */
function showLanding(show: boolean): void {
  for (const sel of ["#qk-tanya-hero", "#qk-tanya-extras"]) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) el.hidden = !show;
  }
}
function endHero(): void { showLanding(false); }
const scrollTo = (el: HTMLElement): void => el.scrollIntoView({ behavior: "smooth", block: "nearest" });

function meBubble(q: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "qk-msg qk-msg-me";
  el.textContent = q;
  return el;
}
function nurBubble(inner: string, loading = false): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "qk-msg qk-msg-nur" + (loading ? " qk-msg-loading" : "");
  el.innerHTML = inner;
  return el;
}

/** The scholar's Indeks Tematik entries (knowledge lane), verbatim + cited — never reworded. */
/**
 * A broad topic question the index holds no specific line for. Saying nothing is worse than
 * saying "I don't have a reviewed answer, but here is his whole chapter on it" — and the Tematik
 * accordion opens straight onto that category.
 */
function knowledgePointerHtml(k: KnowledgeAnswer): string {
  return `<p class="qk-said">Aku belum punya jawaban ringkas yang sudah ditinjau untuk pertanyaan seluas itu — dan aku tidak mau mengarangnya.</p>
    <p class="qk-said">Tapi <b>Indeks Tematik</b> punya <b>${k.totalEntries} entri</b> tentang <b>${esc(k.category)}</b>, disusun oleh Ustadz Muhammad Thalib — itu tempat terbaik untuk memulai.</p>
    <div class="qk-verse-acts"><a class="qk-act" href="#/tematik/${encodeURIComponent(k.slug)}">Buka ${esc(k.category)} →</a></div>`;
}

function knowledgeHtml(k: KnowledgeAnswer): string {
  const shown = k.entries.length, total = k.totalEntries;
  const items = k.entries
    .map((e) => {
      // Resolvable refs deep-link into the mushaf; the few the index cites that are not in the
      // mushaf are shown but never linked — a jump we cannot honour is its own small lie.
      const ref = e.resolvable
        ? `<a class="qk-know-ref" href="#/mushaf/${e.surah}/${e.ayah}">${esc(e.ref)} →</a>`
        : `<span class="qk-know-ref qk-know-ref-plain">${esc(e.ref)}</span>`;
      return `<div class="qk-know-item"><p class="qk-know-txt">${esc(e.text)}</p>${ref}</div>`;
    })
    .join("");
  return `<p class="qk-said">Ini yang ada di <b>Indeks Tematik</b> untuk topik <b>${esc(k.category)}</b>${total > shown ? ` (${shown} dari ${total} entri)` : ""}:</p>
    <div class="qk-know">${items}</div>
    <p class="qk-know-src">Sumber: Indeks Tematik Al-Qur'an — Ustadz Muhammad Thalib.</p>`;
}

/** The reviewed-aqidah lane: the ustadz's verbatim answer + his approved verse anchors. */
async function aqidahHtml(e: AqidahEntry): Promise<string> {
  const paras = e.answer.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p class="qk-ai-said">${esc(p)}</p>`).join("");
  const cards = (await Promise.all(e.refs.map(async (r) => {
    try { const v = await loadAyah(r.surah, r.ayah); return shardCardHtml(r.surah, displayName(r.surah), v); }
    catch { return ""; }
  }))).join("");
  return `<div class="qk-ai">${paras}</div>${cards}<p class="qk-ai-note">Jawaban ini ditinjau oleh Ustadz Ahmad Isrofiel Mardlatillah.</p>`;
}

/**
 * Live answers AND restored answers are drawn by THIS function and nothing else — that is what makes
 * persistence safe (see thread.ts). `ai` prose is replayed verbatim (a non-deterministic model output);
 * every other kind is re-derived from today's code.
 */
async function renderTurn(t: Turn): Promise<string> {
  switch (t.kind) {
    case "no-such-surah":
      return `<p class="qk-said">Tidak ada surah nomor ${t.surah}. Al-Qur'an punya <b>114 surah</b>.</p>`;
    case "no-such-ayah": {
      const m = surahMeta(t.surah);
      return `<p class="qk-said"><b>${esc(displayName(t.surah))}</b> hanya sampai ayat ${m?.ayahs ?? "?"}. Ayat ${t.ayah} tidak ada.</p>
        <div class="qk-verse-acts"><a class="qk-act" href="#/mushaf/${t.surah}">Baca ${esc(displayName(t.surah))} →</a></div>`;
    }
    case "surah": {
      const m = surahMeta(t.surah);
      return `<p class="qk-said">Ini surah ${esc(displayName(t.surah))} — ${m?.ayahs ?? "?"} ayat.</p>
        <div class="qk-verse-acts"><a class="qk-act" href="#/mushaf/${t.surah}">Baca ${esc(displayName(t.surah))} →</a></div>`;
    }
    case "ayah": {
      const v = await loadAyah(t.surah, t.ayah);
      return `<p class="qk-said">Ini ${esc(displayName(t.surah))} ${t.surah}:${t.ayah}.</p>` +
        shardCardHtml(t.surah, displayName(t.surah), v);
    }
    case "hits": {
      const c = await ensureCorpus();
      const verses = c ? t.refs.map((r) => c.verses.find((v) => v.ref === r)).filter((v): v is NonNullable<typeof v> => !!v) : [];
      if (!verses.length) return SILENCE;
      const hits = verses.map((v) => ({ verse: v, score: 1, matched: [] as string[] }));
      // Live framing, with the canned opener as the safety net — never worse than before.
      const lead = await composeFraming(hits, t.q, demoFramingModel, compose(hits, t.q));
      return (lead ? `<div class="qk-lead">${esc(lead)}</div>` : "") + hits.map(verseHtml).join("");
    }
    case "ai": {
      const c = await ensureCorpus();
      return c ? await aiAnswerHtml(c, t.prose, t.refs) : SILENCE;
    }
    case "aqidah": {
      const e = aqidahById(t.id);
      if (!e || !e.answer.trim() || !e.refs.length) return SILENCE;
      return aqidahHtml(e);
    }
    case "knowledge": {
      const k = await retrieveKnowledge(t.q);
      if (!k) return SILENCE;
      // Empty entries is NOT a failure — knowledge.ts returns them on purpose for a broad
      // definitional question ("siapa Allah?"), where ranking on the category's own name would
      // just return arbitrary lines. The documented answer is an honest pointer to the topic;
      // gating on entries.length threw that away and showed generic silence instead.
      return k.entries.length ? knowledgeHtml(k) : knowledgePointerHtml(k);
    }
    case "refer":
      return REFER;
    case "silence":
      return SILENCE;
  }
}

/**
 * Decide the turn. The app now answers as the ustadz would: the MODEL LEADS with a warm answer
 * grounded in our ayat. Order: direct reference → the two hard floors that outrank the model
 * (a family-law referral, a reviewed aqidah answer) → the model → and only if the model bows out,
 * the principled fallbacks (reviewed index, hits, honest silence). Returns the persistable DECISION.
 */
async function resolveTurn(q: string): Promise<Turn> {
  const ref = parseRef(q);
  if (ref.kind === "no-such-surah") return { q, kind: "no-such-surah", surah: ref.surah };
  if (ref.kind === "no-such-ayah") return { q, kind: "no-such-ayah", surah: ref.surah.n, ayah: ref.ayah };
  if (ref.kind === "surah") return { q, kind: "surah", surah: ref.surah.n };
  if (ref.kind === "ayah") return { q, kind: "ayah", surah: ref.surah.n, ayah: ref.ayah };

  // The warm-teacher boundary's hard floor: a marital rights/obligation question (nafkah) is a
  // binding fiqh verdict on someone's situation, not teaching — it defers to a human ustadz, before
  // any model hop. The prompt asks the model to defer these too; this is the deterministic backstop.
  if (needsFamilyLawScholar(q)) return { q, kind: "refer" };

  const c = await ensureCorpus();
  if (!c) return { q, kind: "silence" };

  const modelThemes = await understandThemes(q, c.themes, demoThemeModel, () => []);

  // A REVIEWED human answer (Ustadz Ahmad Isrofiel's verbatim aqidah) outranks the model — it is the
  // ustadz's actual vetted words, which is exactly what the app aspires to sound like.
  const aq = matchAqidah(q);
  if (aq) return { q, kind: "aqidah", id: aq.id };

  // The model LEADS: a warm answer in the ustadz voice, grounded in our ayat (any real ayah, our
  // translation). Retrieval verses and the curated pins reach it as grounding hints inside
  // synthesizeAnswer. Null (model down / guard reject) falls back below — never worse than principled.
  const ai = await synthesizeAnswer(c, q, modelThemes, demoAnswerModel);
  if (ai) return { q, kind: "ai", prose: ai.prose, refs: [...ai.refs] };

  // FALLBACKS, only when the model bowed out. A factual question still never drops to the feeling
  // lane: the reviewed index, an honest topic pointer, or silence. Otherwise: hits, else silence.
  const turn = turnFromHits(q, retrieve(c, q, 2, modelThemes));
  if (looksFactual(q)) {
    const k = await retrieveKnowledge(q);
    if (k && k.entries.length > 0) return { q, kind: "knowledge", slug: k.slug };
    if (knowledgeOnly(q)) return k ? { q, kind: "knowledge", slug: k.slug } : { q, kind: "silence" };
  }
  if (turn.kind === "silence") {
    const k = await retrieveKnowledge(q);
    if (k) return { q, kind: "knowledge", slug: k.slug };
  }
  return turn;
}

async function ask(qRaw: string): Promise<void> {
  const q = qRaw.trim();
  if (!q) return;
  const th = thread();
  endHero();
  th.append(meBubble(q));
  const bubble = nurBubble(`<div class="qk-lead qk-thinking">Menyusun jawaban dari ayat-ayatnya…</div>`, true);
  th.append(bubble);
  scrollTo(bubble);

  // Crisis runs FIRST — before parsing, before retrieval. Answered, but NEVER written to disk
  // (a shared phone must not surface it to whoever opens the app next). See thread.ts.
  const crisis = detectCrisis(q);
  if (crisis) {
    bubble.classList.remove("qk-msg-loading");
    bubble.innerHTML = crisisReply();
    scrollTo(bubble);
    return; // deliberately NOT remembered
  }

  try {
    const turn = await resolveTurn(q);
    bubble.classList.remove("qk-msg-loading");
    bubble.innerHTML = await renderTurn(turn);
    // The thread renders verse cards too, so its disclosures need the same wiring the reader gets.
    // Without this the chevron is inert markup — it looks interactive and does nothing.
    wireVerseTools(bubble);
    rememberTurn(turn);
  } catch {
    bubble.classList.remove("qk-msg-loading");
    bubble.innerHTML = `<div class="qk-silence"><p><b>Ada yang salah saat menyusun jawaban.</b> Mungkin koneksimu sedang tidak stabil — coba lagi.</p></div>`;
  }
  refreshClear();
  scrollTo(bubble);
}

/** Rebuild a saved conversation on load — same renderer as the live path, so markup is always current. */
async function restoreThread(): Promise<void> {
  const turns = loadThread();
  if (!turns.length) return;
  endHero();
  const th = thread();
  for (const t of turns) {
    th.append(meBubble(t.q));
    const b = nurBubble(await renderTurn(t));
    th.append(b);
    wireVerseTools(b); // must run on RESTORED turns too, or reloading the page kills every chevron
  }
  refreshClear();
}

/** Render the AI-authored answer: guarded prose (paragraphs) + grounding verses + the AI label. */
async function aiAnswerHtml(c: Corpus, prose: string, refs: readonly string[]): Promise<string> {
  const paras = prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="qk-ai-said">${linkifyRefs(p)}</p>`)
    .join("");
  // Cards for exactly the ayat the prose CITED — resolved from the prose itself (named or numeric),
  // so they always match the inline links. The stored `refs` are a numeric-only fallback for replay.
  const cited = resolvedRefsInProse(prose);
  const cardRefs = (cited.length ? cited : refs.filter((r) => /^\d+:\d+$/.test(r))).slice(0, 5);
  // The model cites any real ayah; we render OUR translation for each. A curated verse keeps its
  // rich card (both renderings, any co-display); anything else loads from the mushaf shard so the
  // reader always meets the verse the answer leaned on — in our own Tarjamah Tafsiriyah.
  const cards = (await Promise.all(cardRefs.map(async (r) => {
    const curated = c.verses.find((v) => v.ref === r);
    if (curated) return curatedCardHtml(curated);
    const [s, a] = r.split(":").map(Number);
    if (!s || !a) return "";
    try { return shardCardHtml(s, displayName(s), await loadAyah(s, a)); }
    catch { return ""; } // a shard that fails to load just drops its card, never breaks the answer
  }))).join("");
  return `<div class="qk-ai">${paras}</div>` + cards + AI_NOTE;
}

function wireTanya(): void {
  const form = $<HTMLFormElement>("#qk-ask");
  const ta = $<HTMLTextAreaElement>("#qk-q");
  const send = $<HTMLButtonElement>("#qk-send");

  const sync = (): void => {
    send.disabled = ta.value.trim().length === 0;
    ta.style.height = "auto";
    // floor matches the CSS min-height so the composer never collapses back to one line
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 88), 280)}px`;
  };
  ta.addEventListener("input", sync);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  // Send-and-clear: the composer empties on submit, like any chat input, and the turn appears in the thread.
  const submit = (val: string): void => { ta.value = ""; sync(); void ask(val); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit(ta.value);
  });

  for (const seed of document.querySelectorAll<HTMLButtonElement>(".qk-seed")) {
    seed.addEventListener("click", () => submit(seed.textContent ?? ""));
  }

  // Burn the conversation — clears storage AND the DOM, and brings the intro hero back.
  clearBtn().addEventListener("click", () => {
    clearThread();
    thread().replaceChildren();
    refreshClear();
    showLanding(true);
  });

  // Homepage search → route into Tanya and run it, so the feature is discoverable from Beranda.
  const search = $<HTMLFormElement>("#qk-search");
  search.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = search.querySelector("input");
    const val = input?.value.trim() ?? "";
    if (!val) return;
    if (input) input.value = "";
    location.hash = "#/tanya";
    submit(val);
  });

  // Topic chips are illustrative on the clone; clicking one seeds Tanya with it.
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".qk-chip")) {
    chip.addEventListener("click", () => {
      location.hash = "#/tanya";
      submit(chip.textContent?.trim() ?? "");
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
  const harf = readingHtml(v.c, false);
  const canPlay = AUDIO_AVAIL.has(surah);
  return `<article class="qk-verse" id="ayat-${surah}-${v.a}"
      data-ref="${esc(ref)}" data-name="${esc(surahName)}" data-ar="${esc(v.ar)}" data-tr="${esc(tr)}">
    <div class="qk-verse-head">
      <span class="qk-verse-ref">${esc(ref)}</span>
      <span class="qk-verse-surah">${esc(surahName)}</span>
      ${harf ? `<button class="qk-harf-btn" type="button" aria-expanded="false" aria-label="Tampilkan terjemahan harfiah">
        <!-- Erik, 2026-07-22: the disclosure must name what it opens. "Harfiah" alone is an
             adjective floating next to a chevron — the reader has to already know that the
             literal Kemenag rendering is the thing being hidden. Full noun phrase. -->
        <span>Terjemahan Harfiah</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>` : ""}
    </div>
    <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(v.ar)}</div>
    <div class="qk-verse-body">
      <div class="qk-verse-tools">
        ${canPlay ? `<button class="qk-vt" type="button" data-play="${surah}" data-ayah="${v.a}" aria-label="Putar ayat ini" title="Putar">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5v15l12-7.5-12-7.5Z"/></svg>
        </button>` : ""}
        <button class="qk-vt" type="button" data-copy aria-label="Salin ayat" title="Salin">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="qk-vt qk-bm-btn${on ? " is-on" : ""}" type="button" aria-label="Simpan ayat" aria-pressed="${on}" title="Simpan"
          data-ref="${esc(ref)}" data-surah="${esc(surahName)}" data-ar="${esc(v.ar)}" data-tr="${esc(tr)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>
        </button>
        <button class="qk-vt" type="button" data-share aria-label="Bagikan ayat" title="Bagikan">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
        </button>
        <button class="qk-vt" type="button" data-note aria-label="Tambah catatan pribadi" title="Catatan">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>
      <div class="qk-verse-readings">
        ${readingHtml(v.p, true)}
        ${harf ? `<div class="qk-harf" hidden>${harf}</div>` : ""}
      </div>
      <div class="qk-note-box" hidden>
        <textarea class="qk-note-input" rows="2" maxlength="2000" placeholder="Tulis catatan pribadi untuk ayat ini…"></textarea>
        <button class="qk-note-save" type="button">Simpan catatan</button>
      </div>
    </div>
  </article>`;
}

/** Per-ayah tools: harfiah disclosure, play, copy, share (bookmark keeps its own wiring). */
function wireVerseTools(scope: HTMLElement): void {
  for (const b of scope.querySelectorAll<HTMLButtonElement>(".qk-harf-btn")) {
    b.addEventListener("click", () => {
      const box = b.closest(".qk-verse")?.querySelector<HTMLElement>(".qk-harf");
      if (!box) return;
      const open = box.hidden;
      box.hidden = !open;
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", open ? "Sembunyikan terjemahan harfiah" : "Tampilkan terjemahan harfiah");
    });
  }
  for (const b of scope.querySelectorAll<HTMLButtonElement>("[data-play]")) {
    b.addEventListener("click", () => playerStart(Number(b.dataset.play), Number(b.dataset.ayah) || 1));
  }
  for (const b of scope.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
    b.addEventListener("click", () => {
      const a = b.closest<HTMLElement>(".qk-verse");
      if (!a) return;
      const text = `${a.dataset.ar ?? ""}\n\n${a.dataset.tr ?? ""}\n\n(QS. ${a.dataset.name ?? ""} : ${(a.dataset.ref ?? "").split(":")[1] ?? ""})`;
      navigator.clipboard.writeText(text).then(() => toast("Ayat disalin")).catch(() => toast("Gagal menyalin"));
    });
  }
  for (const b of scope.querySelectorAll<HTMLButtonElement>("[data-share]")) {
    b.addEventListener("click", async () => {
      const a = b.closest<HTMLElement>(".qk-verse");
      if (!a) return;
      const [s, ay] = (a.dataset.ref ?? "").split(":");
      const url = `${location.origin}${location.pathname}#/mushaf/${s}/${ay}`;
      try {
        if (navigator.share) { await navigator.share({ title: `QS. ${a.dataset.name} : ${ay}`, text: a.dataset.tr ?? "", url }); return; }
        await navigator.clipboard.writeText(url);
        toast("Tautan disalin");
      } catch { /* cancelled */ }
    });
  }
  // Personal notes (issue 03): toggle the inline editor, save to the raw layer.
  for (const b of scope.querySelectorAll<HTMLButtonElement>("[data-note]")) {
    b.addEventListener("click", () => {
      const box = b.closest(".qk-verse")?.querySelector<HTMLElement>(".qk-note-box");
      if (!box) return;
      box.hidden = !box.hidden;
      if (!box.hidden) box.querySelector("textarea")?.focus();
    });
  }
  for (const b of scope.querySelectorAll<HTMLButtonElement>(".qk-note-save")) {
    b.addEventListener("click", () => {
      const verse = b.closest<HTMLElement>(".qk-verse");
      const ta = verse?.querySelector<HTMLTextAreaElement>(".qk-note-input");
      const ref = verse?.dataset.ref ?? "";
      const text = ta?.value.trim() ?? "";
      if (!ref || !text) return;
      logMemory("note", ref, text);
      if (ta) ta.value = "";
      const box = verse?.querySelector<HTMLElement>(".qk-note-box");
      if (box) box.hidden = true;
      toast("Catatan disimpan");
    });
  }
}

async function renderMushaf(param?: string, anchorAyah?: string): Promise<void> {
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
    wireVerseTools(el);
    // Track reading position (issue 03): opening a surah records where the user is, for "continue reading".
    logMemory("read", `${n}:${anchorAyah ? Number(anchorAyah) || 1 : 1}`);
    const a = anchorAyah ? Number(anchorAyah) : 0;
    if (a) {
      const target = document.getElementById(`ayat-${n}-${a}`);
      if (target) {
        // "auto", not "smooth" — this is an ARRIVAL, not an in-page nudge. Al-Baqarah is ~60,000px
        // tall, and a smooth scroll across that took over 12 seconds to reach a quarter of the way:
        // tapping Juz 2 looked like it had dumped you at 2:1 and then drifted. Landing instantly is
        // what a deep link means. The juz grid made this obvious, but it equally affects bookmarks
        // and Tematik's "Lihat di Surah", which use this same anchor path.
        target.scrollIntoView({ behavior: "auto", block: "center" });
        target.classList.add("is-target");
        window.setTimeout(() => target.classList.remove("is-target"), 2600);
      }
    }
  } catch {
    el.innerHTML = `<a class="qk-back" href="#/mushaf">‹ Semua surah</a><div class="qk-silence"><p><b>Gagal memuat surah.</b> Periksa koneksi lalu coba lagi.</p></div>`;
  }
}

/* ── TEMATIK: the Indeks Tematik (reuses New-Quranku's Peta data — Ustadz Muhammad Thalib's) ── */
interface PetaIndex { categories: { slug: string; category: string; entries: number }[] }
interface PetaRef { surah: number; ayah: number; resolvable: boolean }
interface PetaEntry { text: string; ref: string; refs?: PetaRef[] }
interface PetaCategory { category: string; subtopics: { subtopic: string; entries: PetaEntry[] }[] }

const TEMA_BOOK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.6C10.4 5.4 8.4 5.1 6 5.3v12.5c2.4-.2 4.4.1 6 1.3 1.6-1.2 3.6-1.5 6-1.3V5.3c-2.4-.2-4.4.1-6 1.3Z"/><path d="M12 6.6v12.5"/></svg>`;

/** Short reference badge like the original ("Al-Baqarah:7", or "Fussilat:2-4" for a run). */
function refRange(rs: PetaRef[]): string {
  const a = rs.map((r) => r.ayah);
  const min = Math.min(...a), max = Math.max(...a);
  return min === max ? String(min) : `${min}-${max}`;
}

/* The 3D cosmos: mounted lazily, and torn down whenever the page is rebuilt so a stale
   canvas never keeps its animation frame running. */
let cosmosHandle: CosmosHandle | undefined;

function wirePeta(): void {
  const btn = document.getElementById("qk-peta-btn");
  const slot = document.getElementById("qk-peta-slot");
  if (!btn || !slot) return;
  let loaded = false;
  btn.addEventListener("click", () => {
    const open = slot.hidden;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    slot.hidden = !open;
    if (!open || loaded) return;
    slot.innerHTML = `<p class="qk-peta-loading">Memuat peta…</p>`;
    // 46 KB, fetched here and nowhere else — never opening the map costs nothing.
    void (async () => {
      try {
        const res = await fetch("/peta/cosmos.json");
        if (!res.ok) throw new Error("gagal memuat peta");
        const cosmos = (await res.json()) as Cosmos;
        slot.innerHTML = `
          <div class="pc-frame">
            <canvas class="pc-canvas" aria-label="Peta tematik 3D: ${cosmos.meta.verses} ayat mengelilingi ${cosmos.meta.cats} kategori. Seret untuk memutar, gulir untuk memperbesar, klik bintang untuk membuka ayat."></canvas>
            <div class="pc-hud">
              <label class="pc-check"><input type="checkbox" class="pc-auto" checked> Putar otomatis</label>
              <label class="pc-check"><input type="checkbox" class="pc-bridges"> Hanya ayat penghubung</label>
            </div>
            <p class="pc-help">seret untuk memutar · gulir untuk zoom · klik bintang untuk membuka ayat</p>
            ${legendHtml(cosmos)}
          </div>`;
        const canvas = slot.querySelector<HTMLCanvasElement>(".pc-canvas");
        if (!canvas) return;
        cosmosHandle?.destroy();
        // A star IS a verse — clicking one lands on the reader at that exact ayah.
        cosmosHandle = mountCosmos(canvas, cosmos, (surah, ayah) => {
          location.hash = `#/mushaf/${surah}/${ayah}`;
        });
        slot.querySelector<HTMLInputElement>(".pc-auto")?.addEventListener("change", (e) => {
          cosmosHandle?.setAutoRotate((e.target as HTMLInputElement).checked);
        });
        slot.querySelector<HTMLInputElement>(".pc-bridges")?.addEventListener("change", (e) => {
          cosmosHandle?.setBridgesOnly((e.target as HTMLInputElement).checked);
        });
        loaded = true;
      } catch {
        slot.innerHTML = `<p class="qk-peta-loading">Gagal memuat peta. Coba lagi.</p>`;
      }
    })();
  });
}

async function renderTematik(slug?: string): Promise<void> {
  const el = $("#qk-tematik");
  cosmosHandle?.destroy();
  cosmosHandle = undefined;
  el.innerHTML = `<div class="qk-lead qk-thinking">Memuat…</div>`;
  try {
    const idx = await fetchJson<PetaIndex>("/peta/index.json");
    el.innerHTML = `
      <div class="qk-tema-head">
        <span class="qk-tema-ico">${TEMA_BOOK}</span>
        <h1>Indeks Tematik Al-Qur'an</h1>
        <p>Temukan dan pelajari ayat-ayat berdasarkan topik-topik utama yang telah dikelompokkan secara sistematis.</p>
      </div>
      <div class="qk-tema-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="qk-tema-find" type="search" placeholder="Cari tema, nama surah, atau topik…" aria-label="Cari tema, nama surah, atau topik" autocomplete="off">
      </div>
      <section class="qk-peta">
        <button class="qk-peta-head" id="qk-peta-btn" type="button" aria-expanded="false">
          <span class="qk-peta-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18"/></svg></span>
          <span class="qk-peta-body">
            <span class="qk-peta-name">Peta Tematik 3D</span>
            <span class="qk-peta-sub">1.632 ayat mengelilingi 13 tema — seret untuk memutar, klik bintang untuk membuka ayat</span>
          </span>
          <svg class="qk-peta-chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="qk-peta-slot" id="qk-peta-slot" hidden></div>
      </section>
      <div class="qk-tema-list">${idx.categories.map((c) => `
        <section class="qk-tcat" data-slug="${esc(c.slug)}" data-name="${esc(c.category.toLowerCase())}">
          <button class="qk-tcat-head" type="button" aria-expanded="false">
            <span class="qk-tcat-ico">${TEMA_BOOK}</span>
            <span class="qk-tcat-name">${esc(c.category)}</span>
            <span class="qk-tcat-count">${c.entries}</span>
            <svg class="qk-tcat-chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div class="qk-tcat-body" hidden></div>
        </section>`).join("")}</div>`;
    wireTematik(slug);
  } catch {
    el.innerHTML = `<div class="qk-silence"><p><b>Gagal memuat indeks tematik.</b> Coba lagi.</p></div>`;
  }
}

function wireTematik(slug?: string): void {
  const el = $("#qk-tematik");
  wirePeta();
  for (const head of el.querySelectorAll<HTMLButtonElement>(".qk-tcat-head")) {
    head.addEventListener("click", () => void toggleCategory(head.closest(".qk-tcat") as HTMLElement));
  }
  const find = el.querySelector<HTMLInputElement>("#qk-tema-find");
  find?.addEventListener("input", () => {
    const q = find.value.trim().toLowerCase();
    for (const sec of el.querySelectorAll<HTMLElement>(".qk-tcat")) {
      sec.hidden = q.length > 0 && !(sec.dataset.name ?? "").includes(q);
    }
  });
  if (slug) {
    const sec = el.querySelector<HTMLElement>(`.qk-tcat[data-slug="${CSS.escape(slug)}"]`);
    if (sec) { void toggleCategory(sec, true); window.setTimeout(() => sec.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }
  }
}

async function toggleCategory(sec: HTMLElement, forceOpen = false): Promise<void> {
  const head = sec.querySelector<HTMLButtonElement>(".qk-tcat-head");
  const body = sec.querySelector<HTMLElement>(".qk-tcat-body");
  if (!head || !body) return;
  const open = forceOpen || body.hidden;
  head.setAttribute("aria-expanded", open ? "true" : "false");
  body.hidden = !open;
  if (!open || body.dataset.loaded) return;
  body.innerHTML = `<div class="qk-lead qk-thinking">Memuat…</div>`;
  try {
    const cat = await fetchJson<PetaCategory>(`/peta/${sec.dataset.slug}.json`);
    const multi = cat.subtopics.length > 1;
    let n = 0;
    body.innerHTML = cat.subtopics.map((s) =>
      (multi ? `<h3 class="qk-tsub">${esc(s.subtopic)}</h3>` : "") +
      s.entries.map((e) => entryRowHtml(++n, e)).join("")
    ).join("");
    body.dataset.loaded = "1";
    for (const eh of body.querySelectorAll<HTMLButtonElement>(".qk-tentry-head")) {
      eh.addEventListener("click", () => void toggleEntry(eh.closest(".qk-tentry") as HTMLElement));
    }
  } catch { body.innerHTML = `<p class="qk-silence">Gagal memuat topik.</p>`; body.dataset.loaded = ""; }
}

function entryRowHtml(n: number, e: PetaEntry): string {
  const rs = (e.refs ?? []).filter((r) => r.resolvable);
  const r = rs[0];
  const badge = r ? `${displayName(r.surah)}:${refRange(rs)}` : e.ref;
  return `<div class="qk-tentry" data-surah="${r?.surah ?? 0}" data-ayah="${r?.ayah ?? 0}">
    <button class="qk-tentry-head" type="button" aria-expanded="false"${r ? "" : " disabled"}>
      <span class="qk-tentry-title"><b>${n}.</b> ${esc(e.text)}</span>
      <span class="qk-tentry-ref">${esc(badge)}</span>
    </button>
    <div class="qk-tentry-body" hidden></div>
  </div>`;
}

async function toggleEntry(entry: HTMLElement): Promise<void> {
  const head = entry.querySelector<HTMLButtonElement>(".qk-tentry-head");
  const body = entry.querySelector<HTMLElement>(".qk-tentry-body");
  if (!head || !body) return;
  const open = body.hidden;
  head.setAttribute("aria-expanded", open ? "true" : "false");
  body.hidden = !open;
  if (!open || body.dataset.loaded) return;
  const surah = Number(entry.dataset.surah), ayah = Number(entry.dataset.ayah);
  if (!surah || !ayah) { body.innerHTML = `<p class="qk-silence">Rujukan tidak tersedia.</p>`; body.dataset.loaded = "1"; return; }
  body.innerHTML = `<div class="qk-lead qk-thinking">Memuat ayat…</div>`;
  try {
    const v = await loadAyah(surah, ayah);
    const tr = v.p?.text ?? v.c?.text ?? "";
    const name = displayName(surah);
    body.innerHTML = `
      <div class="qk-tentry-ar" dir="rtl" lang="ar">${esc(v.ar)}</div>
      <p class="qk-tentry-tr">${esc(tr)}</p>
      <p class="qk-tentry-cite">— Tarjamah Tafsiriyah</p>
      <div class="qk-tentry-acts">
        <div class="qk-tentry-tools">
          <button class="qk-ico-act" type="button" data-copy aria-label="Salin ayat"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button class="qk-ico-act" type="button" data-share aria-label="Bagikan ayat"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg></button>
        </div>
        <a class="qk-tentry-go" href="#/mushaf/${surah}/${ayah}">Lihat di Surah <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </div>`;
    body.dataset.loaded = "1";
    body.querySelector<HTMLButtonElement>("[data-copy]")?.addEventListener("click", () => {
      const text = `${v.ar}\n\n${tr}\n\n(QS. ${name} : ${ayah} — Tarjamah Tafsiriyah)`;
      navigator.clipboard.writeText(text).then(() => toast("Ayat disalin")).catch(() => toast("Gagal menyalin"));
    });
    body.querySelector<HTMLButtonElement>("[data-share]")?.addEventListener("click", async () => {
      const url = `${location.origin}${location.pathname}#/mushaf/${surah}/${ayah}`;
      const data: ShareData = { title: `QS. ${name} : ${ayah}`, text: tr, url };
      try { if (navigator.share) { await navigator.share(data); return; } await navigator.clipboard.writeText(url); toast("Tautan disalin"); } catch { /* cancelled */ }
    });
  } catch { body.innerHTML = `<p class="qk-silence">Gagal memuat ayat.</p>`; body.dataset.loaded = "1"; }
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
function playerStart(n: number, startAyah = 1): void {
  if (!AUDIO_AVAIL.has(n)) return;
  pl.surah = n; pl.ayah = startAyah; pl.total = surahMeta(n)?.ayahs ?? 0;
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

/* ── MEMORY: server-backed, identity-scoped, zero inference (issue 03) ─────── */
interface ServerMemory {
  bookmarks: { ref: string; ts: number }[];
  notes: { ref: string; text: string; ts: number }[];
  questions: { question: string; ts: number }[];
  position: { ref: string; ts: number } | null;
}
/** Fire-and-forget write to the raw layer. Rides /api/* so the Worker sees it (the static shell
 *  bypasses the Worker — see the demo-worker-edge-bypass note). Failures are silently ignored. */
function logMemory(kind: string, ref?: string, text?: string): void {
  void fetch(apiUrl("/api/events"), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, ref, text }),
  }).catch(() => {});
}
async function fetchMemory(): Promise<ServerMemory | null> {
  try {
    const res = await fetch(apiUrl("/api/memory"), { credentials: "same-origin" });
    if (!res.ok) return null;
    return (await res.json()) as ServerMemory;
  } catch {
    return null;
  }
}
/** Split a "surah:ayah" ref into a mushaf deep-link hash. */
function refHref(ref: string): string {
  const [s, a] = ref.split(":");
  return `#/mushaf/${encodeURIComponent(s ?? "")}${a ? `/${encodeURIComponent(a)}` : ""}`;
}
interface DerivedProfile {
  interest_tags: string[];
  summary: string;
}
async function fetchProfile(): Promise<DerivedProfile | null> {
  try {
    const res = await fetch(apiUrl("/api/profile"), { credentials: "same-origin" });
    if (!res.ok) return null;
    return ((await res.json()) as { profile: DerivedProfile | null }).profile;
  } catch {
    return null;
  }
}
/** Hard-purge everything the app remembers about this user — D1 + KV + local bookmarks (issue 08). */
async function forgetMe(): Promise<void> {
  try {
    await fetch(apiUrl("/api/forget"), { method: "POST", credentials: "same-origin" });
  } catch {
    /* best-effort — still clear local + re-render */
  }
  try {
    localStorage.removeItem(BM_KEY);
  } catch {
    /* private mode */
  }
  toast("Semua datamu sudah dihapus.");
  renderBookmark();
}

/** Append the visible memory (what we learned + history) and the honest controls below the bookmarks. */
async function hydrateMemorySection(el: HTMLElement): Promise<void> {
  const [mem, profile] = await Promise.all([fetchMemory(), fetchProfile()]);
  const parts: string[] = [];
  if (profile && (profile.interest_tags.length || profile.summary)) {
    parts.push(
      `<section class="qk-mem"><h2>Yang kami kenali tentang minatmu</h2>` +
        (profile.interest_tags.length
          ? `<div class="qk-chips">${profile.interest_tags.map((t) => `<span class="qk-chip">${esc(t)}</span>`).join("")}</div>`
          : "") +
        (profile.summary ? `<p class="qk-mem-sum">${esc(profile.summary)}</p>` : "") +
        `</section>`,
    );
  }
  if (mem?.position) {
    parts.push(
      `<section class="qk-mem"><h2>Lanjutkan membaca</h2>` +
        `<p><a href="${refHref(mem.position.ref)}">QS ${esc(mem.position.ref)}</a></p></section>`,
    );
  }
  if (mem?.questions.length) {
    parts.push(
      `<section class="qk-mem"><h2>Pertanyaan terakhir</h2><ul class="qk-mem-list">` +
        mem.questions.slice(0, 8).map((q) => `<li>${esc(q.question)}</li>`).join("") +
        `</ul></section>`,
    );
  }
  if (mem?.notes.length) {
    parts.push(
      `<section class="qk-mem"><h2>Catatan</h2><ul class="qk-mem-list">` +
        mem.notes
          .map((n) => `<li><a href="${refHref(n.ref)}">QS ${esc(n.ref)}</a> — ${esc(n.text)}</li>`)
          .join("") +
        `</ul></section>`,
    );
  }
  if (!parts.length) return;
  const wrap = document.createElement("div");
  wrap.className = "qk-mem-wrap";
  wrap.innerHTML =
    `<div class="qk-page-head"><h1>Riwayat &amp; Catatan</h1>` +
    `<p>Demo ini mengingat yang kamu jelajahi untuk membantumu — anonim, tanpa login. Kamu bisa menghapusnya kapan saja.</p></div>` +
    parts.join("") +
    `<div class="qk-forget"><button class="qk-forget-btn" type="button">Hapus semua data saya</button></div>`;
  el.appendChild(wrap);
  wireForget(wrap);
}
/** Two-step inline confirm for the Forget-me button — no blocking browser dialog. */
function wireForget(wrap: HTMLElement): void {
  const btn = wrap.querySelector<HTMLButtonElement>(".qk-forget-btn");
  const box = btn?.parentElement;
  if (!btn || !box) return;
  btn.addEventListener("click", () => {
    box.innerHTML =
      `<span class="qk-forget-ask">Yakin hapus semua data yang tersimpan?</span>` +
      `<button class="qk-forget-yes" type="button">Ya, hapus</button>` +
      `<button class="qk-forget-no" type="button">Batal</button>`;
    box.querySelector(".qk-forget-yes")?.addEventListener("click", () => void forgetMe());
    box.querySelector(".qk-forget-no")?.addEventListener("click", () => renderBookmark());
  });
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
      // Dual-write to the raw layer so bookmarks feed the derived profile (T4) and follow the identity.
      logMemory(on ? "bookmark" : "unbookmark", b.dataset.ref ?? "");
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
    void hydrateMemorySection(el);
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
      <div class="qk-reading primary"><span class="qk-reading-tag">Terjemahan Makna</span><div class="qk-reading-txt">${esc(bm.tr)}</div></div>
    </article>`).join("");
  for (const b of el.querySelectorAll<HTMLButtonElement>(".qk-bm-remove")) {
    b.addEventListener("click", () => {
      const ref = b.dataset.ref ?? "";
      saveBookmarks(getBookmarks().filter((x) => x.ref !== ref));
      logMemory("unbookmark", ref); // keep the raw layer in sync with the local removal
      renderBookmark();
    });
  }
  void hydrateMemorySection(el);
}

/* ── router ──────────────────────────────────────────────────────────── */
const ROUTES = ["beranda", "tanya", "mushaf", "tematik", "audio", "bookmark"] as const;

function route(): void {
  // The fullscreen player is a modal overlay that persists across routes by design; but it must never
  // survive a NAVIGATION, or you land inside the player (covering e.g. Beranda) instead of the route.
  // The bottom bar keeps playing — only the fullscreen overlay is dismissed. (openFull() doesn't touch
  // the hash, so the Audio → fullscreen flow is unaffected.)
  closeFull();

  const [sectionRaw = "", param, param2] = location.hash.replace(/^#\//, "").split("/");
  const section = (ROUTES as readonly string[]).includes(sectionRaw) ? sectionRaw : "beranda";

  for (const r of ROUTES) {
    const node = document.getElementById(`route-${r}`);
    if (node) node.hidden = r !== section;
  }

  if (section === "mushaf") void renderMushaf(param, param2);
  else if (section === "tematik") void renderTematik(param ? decodeURIComponent(param) : undefined);
  else if (section === "audio") renderAudio();
  else if (section === "bookmark") renderBookmark();

  for (const link of document.querySelectorAll<HTMLAnchorElement>(".qk-nav-link")) {
    if (link.dataset.route === section) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  window.scrollTo({ top: 0 });
}

/* ── Tanya headline: the same invitation, worded differently each time ──── */
// Each wording sets on exactly two lines — the lines are nowrap and fitHeadline()
// scales the type down for the longer ones instead of letting them wrap.
const TANYA_HEADLINES: readonly (readonly [string, string])[] = [
  ["Tanya apa saja.", "Tanpa perlu sungkan."],
  ["Ceritakan saja dulu.", "Di sini kamu aman."],
  ["Curahkan isi hatimu.", "Tak ada yang menghakimi."],
  ["Datang apa adanya.", "Tak perlu pura-pura kuat."],
  ["Yang mengganjal di dada,", "ceritakan pelan-pelan."],
  ["Tak tahu mulai dari mana?", "Mulai dari yang kamu rasakan."],
  ["Apa pun bebanmu,", "di sini selalu ada tempatnya."],
];

/** Two nowrap lines, scaled to fill the width without ever wrapping to a third. */
function fitHeadline(h1: HTMLElement, a: HTMLElement, b: HTMLElement): void {
  const cap = Math.min(58, Math.max(32, window.innerWidth * 0.064));
  h1.style.minHeight = `${Math.round(cap * 2)}px`;   // constant box → no shift on swap
  h1.style.fontSize = `${cap}px`;
  const avail = h1.clientWidth;
  if (!avail) return;
  const widest = Math.max(a.getBoundingClientRect().width, b.getBoundingClientRect().width);
  if (widest > avail) {
    h1.style.fontSize = `${Math.max(22, Math.floor(cap * (avail / widest)))}px`;
  }
}

function wireTanyaHeadline(): void {
  const h1 = document.getElementById("qk-tanya-title");
  const a = h1?.querySelector<HTMLElement>(".qk-tt-a");
  const b = h1?.querySelector<HTMLElement>(".qk-tt-b");
  if (!h1 || !a || !b) return;
  // open on the familiar line, then wander through the rest in a shuffled order
  const rest = [...TANYA_HEADLINES.slice(1)].sort(() => Math.random() - 0.5);
  const order = [TANYA_HEADLINES[0]!, ...rest];
  let i = 0;
  fitHeadline(h1, a, b);
  window.addEventListener("resize", () => fitHeadline(h1, a, b));
  window.setInterval(() => {
    // only while the landing headline is actually on screen (not mid-conversation,
    // not on another route, not on a background tab)
    if (document.hidden || h1.offsetParent === null) return;
    i = (i + 1) % order.length;
    const [l1, l2] = order[i]!;
    h1.classList.remove("is-swap");
    void h1.offsetWidth;                 // restart the keyframe
    h1.classList.add("is-swap");
    window.setTimeout(() => { a.textContent = l1; b.textContent = l2; fitHeadline(h1, a, b); }, 300);
  }, 6800);
}

/* ── theme: light/dark, persisted, defaults to the OS preference ──────── */
const THEME_KEY = "qk-theme";
function applyTheme(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
function wireTheme(): void {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  applyTheme(stored ? stored === "dark" : prefersDark);
  document.getElementById("qk-theme")?.addEventListener("click", () => {
    const nowDark = document.documentElement.dataset.theme !== "dark";
    applyTheme(nowDark);
    try { localStorage.setItem(THEME_KEY, nowDark ? "dark" : "light"); } catch { /* private mode */ }
  });
}

/* ── floating UI: right rail · donation card · scroll-to-top ──────────── */
let toastTimer = 0;
function toast(msg: string): void {
  const t = document.getElementById("qk-toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("is-on");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("is-on"), 2200);
}

function wireFloating(): void {
  // scroll-to-top: fades in once past the fold
  const top = document.getElementById("qk-top");
  if (top) {
    const onScroll = (): void => { top.classList.toggle("is-on", window.scrollY > 400); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // donation widget: the pill slides in from the left and stays; clicking it opens the
  // card; the card's X closes it and the pill slides back in from the left.
  const donasi = document.getElementById("qk-donasi");
  if (donasi) {
    const pill = document.getElementById("qk-donasi-pill");
    const setOpen = (on: boolean): void => {
      donasi.classList.toggle("is-open", on);
      pill?.setAttribute("aria-expanded", on ? "true" : "false");
    };
    // let the pill make its entrance a beat after load
    window.setTimeout(() => donasi.classList.remove("is-pre"), 600);
    pill?.addEventListener("click", () => setOpen(true));
    document.getElementById("qk-donasi-x")?.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(false);
    });
  }

  // right rail — matches QuranKu's users / trending / share
  document.getElementById("qk-rail-komunitas")?.addEventListener("click", () => {
    window.open("https://quran.tarjamahtafsiriyah.com/", "_blank", "noopener");
  });
  document.getElementById("qk-rail-pop")?.addEventListener("click", () => {
    if (location.hash.replace(/^#\//, "").split("/")[0] !== "beranda") location.hash = "#/beranda";
    window.setTimeout(() => document.getElementById("qk-surah-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  });
  document.getElementById("qk-rail-share")?.addEventListener("click", async () => {
    const url = location.origin + location.pathname;
    const data: ShareData = { title: "QuranKu — Al-Qur'an Tarjamah Tafsiriyah", text: "Al-Qur'an Tarjamah Tafsiriyah", url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      toast("Tautan disalin ke clipboard");
    } catch { /* user cancelled the share sheet, or clipboard blocked */ }
  });
}

/* ── boot ────────────────────────────────────────────────────────────── */
// Identity beacon (issue 01): the static HTML shell is served straight from the edge (Worker
// bypassed), so a fresh visitor's signed cookie is minted here — one uncacheable ping on load,
// before any interaction. Fire-and-forget; a failure leaves the app exactly as before.
void fetch(apiUrl("/api/identity"), { credentials: "same-origin" }).catch(() => {});
wireTheme();
wireTanyaHeadline();
renderSurahGrid();
wireSurahFind();
wireListTabs();
wireTanya();
void restoreThread();
startClock();
initPlayer();
void renderToday();
wireFloating();
window.addEventListener("hashchange", route);
route();
