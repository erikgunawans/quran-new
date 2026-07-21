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
// The AI chat is the SAME conversation model as the live new-quranku-ai edition: a persisted thread
// of turns, crisis exchanges answered but never written to disk, knowledge/aqidah fallback lanes.
import { rememberTurn, loadThread, clearThread, hasThread, turnFromHits, type Turn } from "../src/thread.ts";
import { detectCrisis, crisisReply } from "../src/crisis.ts";
import { matchAqidah, aqidahById, type AqidahEntry } from "../src/aqidah.ts";
import { retrieveKnowledge, type KnowledgeAnswer } from "../src/knowledge.ts";

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
  const ayah = pick.ref.split(":")[1] ?? pick.ref;
  el.innerHTML = `
    <div class="qk-today-head">
      <h3 class="qk-today-topic">${esc(pick.surah_name)}</h3>
      <p class="qk-today-ref">Ayat ${esc(ayah)}</p>
    </div>
    <div class="qk-today-ar" dir="rtl" lang="ar">${esc(pick.arabic)}</div>
    <p class="qk-today-tr">${esc(tr)}</p>
    <div class="qk-today-foot">
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
function knowledgeHtml(k: KnowledgeAnswer): string {
  const shown = k.entries.length, total = k.totalEntries;
  const items = k.entries
    .map((e) => `<div class="qk-know-item"><p class="qk-know-txt">${esc(e.text)}</p><span class="qk-know-ref">${esc(e.ref)}</span></div>`)
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
    try { const v = await loadAyah(r.surah, r.ayah); return cardHtml(`${r.surah}:${r.ayah}`, displayName(r.surah), v.ar, v.p, v.c); }
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
        cardHtml(`${t.surah}:${t.ayah}`, displayName(t.surah), v.ar, v.p, v.c);
    }
    case "hits": {
      const c = await ensureCorpus();
      const verses = c ? t.refs.map((r) => c.verses.find((v) => v.ref === r)).filter((v): v is NonNullable<typeof v> => !!v) : [];
      if (!verses.length) return SILENCE;
      const hits = verses.map((v) => ({ verse: v, score: 1, matched: [] as string[] }));
      const lead = compose(hits, t.q);
      return (lead ? `<div class="qk-lead">${esc(lead)}</div>` : "") + hits.map(verseHtml).join("");
    }
    case "ai": {
      const c = await ensureCorpus();
      return c ? aiAnswerHtml(c, t.prose, t.refs) : SILENCE;
    }
    case "aqidah": {
      const e = aqidahById(t.id);
      if (!e || !e.answer.trim() || !e.refs.length) return SILENCE;
      return aqidahHtml(e);
    }
    case "knowledge": {
      const k = await retrieveKnowledge(t.q);
      return k && k.entries.length ? knowledgeHtml(k) : SILENCE;
    }
    case "silence":
      return SILENCE;
  }
}

/**
 * Decide the turn — the SAME resolution order as the live app's ask(): direct reference first
 * (any of the 6236 ayat), then AI synthesis, then principled hits, then the knowledge/aqidah lanes,
 * then honest silence. Returns only the persistable DECISION; renderTurn() draws it.
 */
async function resolveTurn(q: string): Promise<Turn> {
  const ref = parseRef(q);
  if (ref.kind === "no-such-surah") return { q, kind: "no-such-surah", surah: ref.surah };
  if (ref.kind === "no-such-ayah") return { q, kind: "no-such-ayah", surah: ref.surah.n, ayah: ref.ayah };
  if (ref.kind === "surah") return { q, kind: "surah", surah: ref.surah.n };
  if (ref.kind === "ayah") return { q, kind: "ayah", surah: ref.surah.n, ayah: ref.ayah };

  const c = await ensureCorpus();
  if (!c) return { q, kind: "silence" };

  // Pass 1 — the theme classifier broadens retrieval (same as the live app); [] on any failure.
  const modelThemes = await understandThemes(q, c.themes, demoThemeModel, () => []);
  // Pass 2 — the AI authors a grounded answer. Null (nothing to ground / model down / guard reject)
  // falls through to the principled resolution, so this edition is never worse than the trustworthy one.
  const ai = await synthesizeAnswer(c, q, modelThemes, demoAnswerModel);
  if (ai) return { q, kind: "ai", prose: ai.prose, refs: [...ai.refs] };

  const turn = turnFromHits(q, retrieve(c, q, 2, modelThemes));
  if (turn.kind === "silence") {
    const aq = matchAqidah(q);
    if (aq) return { q, kind: "aqidah", id: aq.id };
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
    th.append(nurBubble(await renderTurn(t)));
  }
  refreshClear();
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
  return `<article class="qk-verse" id="ayat-${surah}-${v.a}">
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
    const a = anchorAyah ? Number(anchorAyah) : 0;
    if (a) {
      const target = document.getElementById(`ayat-${n}-${a}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
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

async function renderTematik(slug?: string): Promise<void> {
  const el = $("#qk-tematik");
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

const DONASI_KEY = "qk-donasi-dismissed";
function wireFloating(): void {
  // scroll-to-top: fades in once past the fold
  const top = document.getElementById("qk-top");
  if (top) {
    const onScroll = (): void => { top.classList.toggle("is-on", window.scrollY > 400); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // donation widget: a pill that expands into the card on hover (tap to toggle on touch)
  const donasi = document.getElementById("qk-donasi");
  if (donasi) {
    if (localStorage.getItem(DONASI_KEY) === "1") donasi.hidden = true;
    const pill = document.getElementById("qk-donasi-pill");
    const setOpen = (on: boolean): void => {
      donasi.classList.toggle("is-open", on);
      pill?.setAttribute("aria-expanded", on ? "true" : "false");
    };
    let closeTimer = 0;
    const open = (): void => { window.clearTimeout(closeTimer); setOpen(true); };
    // small grace delay so crossing the pill→card gap never flickers it shut
    const close = (): void => { window.clearTimeout(closeTimer); closeTimer = window.setTimeout(() => setOpen(false), 180); };
    donasi.addEventListener("mouseenter", open);
    donasi.addEventListener("mouseleave", close);
    donasi.addEventListener("focusin", open);
    donasi.addEventListener("focusout", close);
    pill?.addEventListener("click", () => setOpen(!donasi.classList.contains("is-open")));

    document.getElementById("qk-donasi-x")?.addEventListener("click", (e) => {
      e.stopPropagation();
      donasi.hidden = true;
      try { localStorage.setItem(DONASI_KEY, "1"); } catch { /* private mode */ }
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
renderSurahGrid();
wireSurahFind();
wireTanya();
void restoreThread();
startClock();
initPlayer();
void renderToday();
wireFloating();
window.addEventListener("hashchange", route);
route();
