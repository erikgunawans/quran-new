import "./styles.css";
import "./read.css";
import { announce } from "./announce.ts";
import { toggleAudio } from "./audio.ts";
import { crisisReply, detectCrisis } from "./crisis.ts";
import { closeExplainer, openExplainer } from "./explain.ts";
import { mountBand } from "./band.ts";
import { destroyLanding, isChatRoute, syncLanding } from "./landing.ts";
import { mountGreeting } from "./greet.ts";
import { CORPUS_VERSION, displayName, evictStaleCaches, loadAyah, parseRef, ShardError, surahMeta } from "./quran.ts";
import { destroyCosmos, renderPetaCategory, renderPetaIndex } from "./peta.ts";
import { renderIndex, renderSurah } from "./read.ts";
import { compose, keywordThemeHits, retrieve, type Corpus, type Voice } from "./retrieve.ts";
import { pickLucky } from "./lucky.ts";
import { retrieveKnowledge, type KnowledgeAnswer } from "./knowledge.ts";
import { aqidahById, aqidahRef, matchAqidah, type AqidahEntry } from "./aqidah.ts";
import { composeFraming } from "./compose-contract.ts";
import { liveFramingModel } from "./compose-live.ts";
import { isSynthesis } from "./mode.ts";
import { synthesizeAnswer } from "./answer.ts";
import { liveAnswerModel } from "./answer-live.ts";
import { understandThemes } from "./theme-understand.ts";
import { liveThemeModel } from "./theme-live.ts";
import { copyVerse, shareVerse, shareVerseImage } from "./share.ts";
import { applyLens, bindLazyTafsir, tafsirStackHtml, type TafsirLens } from "./tafsir.ts";
import { renderTheme, renderThemeIndex } from "./themes.ts";
import { migrateStorage } from "./migrate-storage.ts";
import { clearThread, hasThread, loadThread, rememberTurn, turnFromHits, type Turn } from "./thread.ts";
import { esc, fromShard, resetPlayButton, setPlayButton, verseEl, type VerseCard } from "./verse.ts";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const thread = $<HTMLDivElement>("#thread");
const form = $<HTMLFormElement>("#composer");
const input = $<HTMLTextAreaElement>("#q");
const send = $<HTMLButtonElement>("#send");
const app = $<HTMLElement>("#app");

let corpus: Corpus | null = null;
let voices = new Map<string, Voice>();

/**
 * Verses currently in the chat thread, so copy/share can find one by ref.
 *
 * Bounded. This used to grow forever — one entry per verse ever rendered, never cleared, in a
 * thread that also grows forever, on the mid-range Android in the brief. Only the most recent
 * exchanges are reachable by tapping anyway, so holding the rest was pure leak.
 */
const MAX_CARDS = 60;
const onScreen = new Map<string, VerseCard>();

const remember = (card: VerseCard) => {
  onScreen.delete(card.ref); // re-inserting moves it to the end — Map preserves insertion order
  onScreen.set(card.ref, card);
  while (onScreen.size > MAX_CARDS) {
    const oldest = onScreen.keys().next().value;
    if (oldest === undefined) break;
    onScreen.delete(oldest);
  }
};

/** One owner for the live region — see announce.ts. */
const say = announce;

// ── rendering ────────────────────────────────────────────────────────────────
// The tafsir stack lives in tafsir.ts now — shared with the reading surface and theme browser, and
// carrying the lens (issue 06) and lazy-loading (Path B1) this inline version never had. verseEl()
// folds it (and the literal companion) into the depth disclosure below the interpretive primary.

function mount(card: VerseCard): string {
  remember(card);
  return verseEl(card);
}

// The composing label is real content (announced to screen readers via #live in ask()), not
// decoration — the dots are aria-hidden because they're the same idea said twice visually.
function skeleton(): HTMLElement {
  const el = document.createElement("div");
  el.className = "msg nur";
  el.innerHTML = `<p class="composing"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>New-Quranku sedang menyusun jawaban…</p>
    <div class="skeleton" aria-hidden="true">
    <div class="sk-line short"></div><div class="sk-line ar"></div>
    <div class="sk-line"></div><div class="sk-line short"></div></div>`;
  return el;
}

// Someone who set "reduce motion" is telling the OS that animated scrolling makes them unwell — a
// vestibular need, not a preference. The CSS already honours it everywhere; the JS smooth-scrolls did
// not, so a reduced-motion reader still got thrown down the page on every answer. Ask the OS each time
// (the setting can change mid-session) and fall back to an instant jump.
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

const scrollDown = () =>
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: scrollBehavior() }));

// The honesty note — the app points at scripture, it never interprets. It used to be bolted onto
// every fallback opener as a spoken sentence, which read as a preached footer; now it lives here as
// quiet chrome UNDER an answer's verses, present on every answer (live or fallback) without being
// said out loud each turn.
const READER_NOTE = `<p class="reader-note">New-Quranku tidak menafsirkan — baca sendiri, dan lihat siapa yang mengatakan apa.</p>`;

// The SYNTHESIS edition's honesty label (new-quranku-ai only). An authored answer must never read as
// a fatwa or as a scholar's words — this quiet chrome under it says plainly what it is: machine-made,
// grounded in the verses shown, and no substitute for a real scholar.
const AI_NOTE = `<p class="reader-note ai-note">Jawaban ini disusun oleh AI berdasarkan ayat-ayat di atas — bukan fatwa, dan bukan kata-kata seorang ulama. Untuk kepastian, tanyakan kepada ustadz.</p>`;

// ── the one renderer ─────────────────────────────────────────────────────────
//
// Live answers and restored answers are drawn by THIS function and nothing else. That is what makes
// persistence safe: we store what Nur *decided* (a ref, a set of hits, a bounds error) and rebuild
// the markup from today's code. Stash the rendered HTML instead and a previous build's mistakes —
// the English captions, the old chip markup — would resurrect from disk months later.
//
// `animate` is off on replay: a restored thread should be *there*, already, the way you left it.
// Nineteen verses fading in one after another on a cold open is theatre, and it is not the truth.
async function renderTurn(t: Turn, animate = true): Promise<string> {
  switch (t.kind) {
    case "no-such-surah":
      return `<p class="said">Surah ${t.surah} tidak ada. Al-Qur'an punya <b>114 surah</b> — coba cek lagi nomornya.</p>`;

    case "no-such-ayah": {
      const m = surahMeta(t.surah);
      return `<p class="said">Surah ${esc(displayName(t.surah))} cuma punya <b>${m?.ayahs ?? "?"} ayat</b>, jadi ayat ${t.ayah} tidak ada. Mau buka surahnya?</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${t.surah}">Baca ${esc(displayName(t.surah))} →</a></div>`;
    }

    case "surah": {
      const m = surahMeta(t.surah);
      return `<p class="said">Ini surah ${esc(displayName(t.surah))} — ${m?.ayahs ?? "?"} ayat.</p>
        <div class="verse-acts"><a class="act go" href="#/surah/${t.surah}">Baca ${esc(displayName(t.surah))} →</a></div>`;
    }

    case "ayah": {
      // The verse is real. We have it. There is no world in which we deny it.
      const v = await loadAyah(t.surah, t.ayah);
      const card = fromShard(v, t.surah, displayName(t.surah));
      card.continueTo = true; // the peak gets a landing
      card.animate = animate;
      card.lazyTafsir = true; // Path B1 — a direct ref lookup gets the same tafsir access reading/themes do
      return `<p class="said">Ini ${esc(displayName(t.surah))} ${t.surah}:${t.ayah}.</p>` + mount(card);
    }

    case "silence":
      return `
        <p class="said">Aku belum menemukan ayat yang cocok dengan itu di korpus yang sudah diverifikasi.</p>
        <div class="silence">
          <p>Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak — aku menemani lewat <b>perasaan</b>, bukan menjawab soal ajaran, hukum, atau arti sebuah ayat.</p>
          <p>Kalau kamu nyari <b>topik atau konsep</b> — misalnya tentang Allah, sabar, atau rezeki — coba buka <a href="#/peta">Peta</a> atau <a href="#/tema">Tema</a>. Kalau kamu lagi <b>ngerasain sesuatu</b>, ceritakan aja pakai kata-katamu sendiri. Atau sebutkan <b>surah dan ayatnya langsung</b>, misalnya <b>18:10</b>.</p>
        </div>`;

    case "hits": {
      if (!corpus) throw new Error("corpus");
      const verses = t.refs.map((r) => corpus!.verses.find((v) => v.ref === r)).filter((v) => v !== undefined);
      if (!verses.length) return renderTurn({ q: t.q, kind: "silence" }, animate);

      const hits = verses.map((v) => ({ verse: v, score: 1, matched: [] as string[] }));
      // Live framing via the edge model, guarded, with the deterministic opener as the safety net.
      // Until /api/compose is deployed (or if the model/wall rejects), this falls back silently —
      // the reader always gets an honest line, and the verses below never wait on it beyond the cap.
      const lead = await composeFraming(hits, t.q, liveFramingModel, compose(hits, t.q));

      return (
        `<p class="said">${lead}</p>` +
        verses
          .map((v) =>
            mount({
              ref: v.ref,
              surah: v.surah,
              ayah: v.ayah,
              surah_name: v.surah_name,
              arabic: v.arabic,
              primary: v.primary,
              companion: v.companion,
              why: v.why,
              tafsirStack: tafsirStackHtml(v.tafsir, voices),
              continueTo: true,
              animate,
            }),
          )
          .join("") +
        READER_NOTE
      );
    }

    case "knowledge": {
      // Re-derived from the KB, never resurrected from disk. Null (network fail, or the topic no
      // longer matches) degrades to the honest silence — never a blank answer.
      //
      // An EMPTY entry list is not a failure and must NOT degrade here: knowledge.ts returns one
      // deliberately for a broad definitional question ("siapa Allah?"), and knowledgeHtml already
      // renders the honest topic pointer for that case. Bailing on `!k.entries.length` made that
      // branch unreachable, so the pointer this lane exists to give never rendered.
      const k = await retrieveKnowledge(t.q);
      if (!k) return renderTurn({ q: t.q, kind: "silence" }, animate);
      return knowledgeHtml(k);
    }

    case "aqidah": {
      // Re-derived from the reviewed-aqidah module by id. If the entry was removed or reverted to a
      // pending stub since this turn was stored, degrade to silence — never render a blank answer.
      const e = aqidahById(t.id);
      if (!e || !e.answer.trim() || !e.refs.length) return renderTurn({ q: t.q, kind: "silence" }, animate);
      return aqidahHtml(e);
    }

    case "ai": {
      // The synthesis edition's authored answer. Prose is REPLAYED verbatim from the stored turn (it
      // was model-generated once and guarded then); the verses re-render as cards from the corpus.
      if (!corpus) throw new Error("corpus");
      return aiHtml(t.prose, t.refs, animate);
    }
  }
}

/**
 * Render a SYNTHESIS answer: the model's guarded prose, the grounding verses as cards, and the AI
 * label. The prose already cleared answer-guard (no Arabic, only grounded citations) — here it is
 * only HTML-escaped and split into paragraphs; the app authors nothing new at render time.
 */
function aiHtml(prose: string, refs: readonly string[], animate: boolean): string {
  const verses = refs.map((r) => corpus!.verses.find((v) => v.ref === r)).filter((v) => v !== undefined);
  const paras = prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="said ai-said">${esc(p)}</p>`)
    .join("");
  const cards = verses
    .map((v) =>
      mount({
        ref: v.ref,
        surah: v.surah,
        ayah: v.ayah,
        surah_name: v.surah_name,
        arabic: v.arabic,
        primary: v.primary,
        companion: v.companion,
        why: v.why,
        tafsirStack: tafsirStackHtml(v.tafsir, voices),
        continueTo: true,
        animate,
      }),
    )
    .join("");
  return paras + cards + AI_NOTE;
}

/**
 * A reviewed-aqidah answer: the ustadz's verbatim prose + the verses he approved, cited. The app
 * authors NOTHING — the answer is Ustadz Ahmad Isrofiel Mardlatillah's own; only the framing line,
 * the verse links, and the attribution are ours (and every one is labelled as such).
 */
function aqidahHtml(e: AqidahEntry): string {
  const paras = e.answer
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="said know-answer">${esc(p)}</p>`)
    .join("");

  const refs = e.refs
    .map((r) => {
      const { ref, resolvable } = aqidahRef(r);
      return resolvable
        ? `<a class="know-ref" href="#/surah/${r.surah}#${r.ayah}">${esc(ref)} →</a>`
        : `<span class="know-ref know-ref-unresolved" title="rujukan ini tidak kami temukan dalam mushaf">${esc(ref)}</span>`;
    })
    .join("");

  const more = e.topic
    ? `<p class="know-more"><a href="#/peta/${esc(e.topic)}">Telusuri lebih lanjut di Peta →</a></p>`
    : "";

  return (
    `<p class="said">Ini yang bisa aku sampaikan — bukan tafsir dariku, tapi jawaban yang ditinjau <b>Ustadz Ahmad Isrofiel Mardlatillah</b>, dengan ayat-ayatnya:</p>` +
    paras +
    `<div class="know-verses">${refs}</div>` +
    more +
    `<p class="know-credit">Jawaban ditinjau oleh <strong>Ustadz Ahmad Isrofiel Mardlatillah</strong>.</p>` +
    `<p class="know-derivative">Penautan ayat adalah tambahan kami untuk memudahkan penelusuran.</p>`
  );
}

/**
 * A grounded knowledge answer: the scholar's own verbatim entries + verse links, cited. The app
 * authors NOTHING here — every line is Ustadz Muhammad Thalib's, every link is ours and labelled so.
 */
function knowledgeHtml(k: KnowledgeAnswer): string {
  const credit =
    `<p class="know-credit">Indeks Tematik oleh <strong>${esc(k.source.author)}</strong> — <a href="${esc(k.source.url)}" rel="noopener noreferrer" target="_blank">quran.tarjamahtafsiriyah.com</a></p>` +
    `<p class="know-derivative">Penautan ayat adalah tambahan kami untuk memudahkan penelusuran — bukan bagian dari indeks aslinya.</p>`;

  // Broad topic, no specific line in the index — point honestly, don't invent an answer from
  // arbitrary entries. (This is what "who is Allah?" reaches: the index is a predicate list, not a
  // definition.) Still more helpful than a bare silence: it deep-links the exact topic.
  if (!k.entries.length) {
    return (
      `<p class="said">Pertanyaan soal <b>${esc(k.category)}</b> itu luas — dan aku nggak mau ngarang. Tapi di knowledge base kami ada <b>${k.totalEntries} entri</b> soal ini, dikumpulkan <b>${esc(k.source.author)}</b>, masing-masing langsung menunjuk ke ayatnya. Coba persempit pertanyaanmu, atau telusuri langsung:</p>` +
      `<p class="know-more"><a href="#/peta/${esc(k.slug)}">Telusuri ${k.totalEntries} entri tentang ${esc(k.category)} di Peta →</a></p>` +
      credit
    );
  }

  const entries = k.entries
    .map((e) => {
      const cite = e.resolvable
        ? `<a class="know-ref" href="#/surah/${e.surah}#${e.ayah}">${esc(e.ref)} →</a>`
        : `<span class="know-ref know-ref-unresolved" title="rujukan ini tidak kami temukan dalam mushaf">${esc(e.ref)}</span>`;
      return `<li class="know-entry"><span class="know-text">${esc(e.text)}</span>${cite}</li>`;
    })
    .join("");
  return (
    `<p class="said">Ini yang <b>${esc(k.source.author)}</b> kumpulkan soal <b>${esc(k.category)}</b> — aku nggak menafsirkan sendiri, tiap baris langsung menunjuk ke ayatnya:</p>` +
    `<ul class="know-list">${entries}</ul>` +
    `<p class="know-more"><a href="#/peta/${esc(k.slug)}">Lihat semua ${k.totalEntries} entri tentang ${esc(k.category)} di Peta →</a></p>` +
    credit
  );
}

function announceTurn(t: Turn): void {
  switch (t.kind) {
    case "ayah":
      say(`${displayName(t.surah)} ${t.surah}:${t.ayah} ditampilkan.`);
      break;
    case "silence":
      say("Belum ada ayat yang cocok. New-Quranku tidak mengarang jawaban.");
      break;
    case "hits":
      say(`${t.refs.length} ayat ditemukan: ${t.refs.join(", ")}.`);
      break;
    case "knowledge":
      say("Menampilkan entri dari Indeks Tematik Ustadz Muhammad Thalib beserta ayatnya.");
      break;
    case "aqidah":
      say("Menampilkan jawaban yang ditinjau Ustadz Ahmad Isrofiel Mardlatillah beserta ayatnya.");
      break;
    case "ai":
      say("Menampilkan jawaban yang disusun AI berdasarkan ayat-ayatnya. Bukan fatwa.");
      break;
    default:
      break;
  }
}

// ── ask ──────────────────────────────────────────────────────────────────────
//
// The old code had ONE failure sentence — "aku belum menemukan ayat yang cocok" — and used it
// for everything. So when a user asked for 18:10, a real ayah in Al-Kahf, Nur told them it did
// not exist. That is not honest silence; it is a lie by omission, and it is the failure that
// ends trust in a scripture app permanently.
//
// There are FOUR distinct truths here, and they now have four distinct answers:
//   1. A real ayah we hold          → render it.
//   2. A real surah, no ayah given  → open it for reading.
//   3. Not a real reference         → say exactly why, with the true bound (110 ayahs, 114 surahs).
//   4. A question with no match     → honest silence — and only here.
async function ask(question: string) {
  const q = question.trim();
  if (!q) return;

  endLanding();
  showChat();

  const me = document.createElement("div");
  me.className = "msg me";
  me.textContent = q;
  thread.append(me);

  const loading = skeleton();
  thread.append(loading);
  scrollDown();
  say("New-Quranku sedang menyusun jawaban.");
  // Retrieval here is a local, synchronous corpus lookup — no network round-trip. Without a
  // floor, the composing state mounts and gets swapped for the answer in the same tick, before
  // the browser ever paints it. MIN_COMPOSING_MS holds it on screen for one real beat (within
  // DESIGN.md's 150-250ms motion band) — never added to genuinely slow paths (a shard fetch),
  // only floors the instant ones, so it reads as intentional rhythm, not an artificial delay.
  const composingStarted = Date.now();

  const answer = document.createElement("div");
  answer.className = "msg nur";

  // ── before anything else ──────────────────────────────────────────────────
  //
  // Crisis check runs FIRST — before reference parsing, before retrieval, before Nur gets to be
  // clever. "aku gak sanggup bayar utang, pengen mati aja" used to match on `utang` and come back
  // with a verse about loan terms. The app answered the topic and missed the person.
  //
  // Nothing gets to answer ahead of this. And nothing about it is written to disk — see thread.ts.
  const crisis = detectCrisis(q);
  if (crisis) {
    loading.remove();
    answer.innerHTML = crisisReply();
    thread.append(answer);
    scrollDown();
    say("New-Quranku menampilkan bantuan darurat. Telepon 119 lalu tekan 8 untuk bicara dengan seseorang.");
    return; // NOT remembered. Deliberately. A shared phone must not out him in the morning.
  }

  // Reference resolution is LOCAL — the surah index is inlined, not fetched. Nur can tell the
  // truth about what the Qur'an contains even with no network at all.
  const ref = parseRef(q);

  try {
    // On the question path (not a direct reference), let the model recognise the feeling — but ONLY
    // when the keyword lexicon came up empty. Most messages hit a keyword, and there the lexicon is
    // already right and instant; the model is only needed for the MISSES ("ngerasa Tuhan udah nyerah
    // sama aku"). Skipping it on keyword-hits keeps the common case snappy (one fewer model hop).
    // Guarded to the closed corpus set, additive, and degrades to [] on any failure.
    const modelThemes =
      ref.kind === "not-a-ref" && corpus && keywordThemeHits(q).size === 0
        ? await understandThemes(q, corpus.themes, liveThemeModel, () => [])
        : [];

    let turn: Turn =
      ref.kind === "no-such-surah"
        ? { q, kind: "no-such-surah", surah: ref.surah }
        : ref.kind === "no-such-ayah"
          ? { q, kind: "no-such-ayah", surah: ref.surah.n, ayah: ref.ayah }
          : ref.kind === "surah"
            ? { q, kind: "surah", surah: ref.surah.n }
            : ref.kind === "ayah"
              ? { q, kind: "ayah", surah: ref.surah.n, ayah: ref.ayah }
              : turnFromHits(q, corpus ? retrieve(corpus, q, 2, modelThemes) : []);

    if (ref.kind === "not-a-ref" && !corpus) throw new Error("corpus");

    // SYNTHESIS edition (new-quranku-ai only). For any question, let the model author a grounded
    // answer from what retrieval found. On ANY failure — nothing to ground, model down, or the guard
    // rejected the output — synthesizeAnswer returns null and we fall straight through to the
    // principled resolution below, so this edition is never worse than the trustworthy one.
    let synthesized = false;
    if (isSynthesis() && ref.kind === "not-a-ref" && corpus) {
      const ai = await synthesizeAnswer(corpus, q, modelThemes, liveAnswerModel);
      if (ai) {
        turn = { q, kind: "ai", prose: ai.prose, refs: [...ai.refs] };
        synthesized = true;
      }
    }

    // Knowledge fallback. A topic/theology question ("siapakah Allah?") lands on the feeling path's
    // silence — but our KB may hold the scholar's own entries on it. Surface those (verbatim, cited)
    // instead of nothing. Runs ONLY after feelings came up empty, so a real feeling is never hijacked.
    if (!synthesized && turn.kind === "silence") {
      // Reviewed-aqidah first: a broad definitional question ("siapakah Allah?") gets the ustadz's
      // own reviewed answer when one exists. Until the review sheet is filled, this returns null and
      // the knowledge path's honest topic pointer stands — so the lane is pure upside, never a
      // regression.
      const aq = matchAqidah(q);
      if (aq) {
        turn = { q, kind: "aqidah", id: aq.id };
      } else {
        const knowledge = await retrieveKnowledge(q);
        if (knowledge) turn = { q, kind: "knowledge", slug: knowledge.slug };
      }
    }

    answer.innerHTML = await renderTurn(turn);
    announceTurn(turn);
    rememberTurn(turn);
  } catch (err) {
    const msg =
      err instanceof ShardError
        ? err.message
        : "Ada yang salah saat mengambil ayatnya. Mungkin koneksimu sedang tidak stabil.";
    answer.innerHTML = `<div class="oops"><p>${esc(msg)}</p>
      <button class="act retry" data-retry="${esc(q)}">Coba lagi</button></div>`;
    say(msg);
  }

  const MIN_COMPOSING_MS = 260;
  const elapsed = Date.now() - composingStarted;
  if (elapsed < MIN_COMPOSING_MS) {
    await new Promise((r) => setTimeout(r, MIN_COMPOSING_MS - elapsed));
  }

  loading.remove();
  thread.append(answer);
  showClearControl();
  scrollDown();
}

// ── routing ──────────────────────────────────────────────────────────────────
//
// Hash routing, so back/forward work and a verse has a URL you can return to. Chat is never
// destroyed — it is hidden and restored, because losing the thread when you tap "read" would
// punish exactly the person we built this for.
const chatView = $<HTMLElement>("#chat");
const readView = $<HTMLElement>("#read");

function showChat() {
  syncLanding(location.hash);
  chatView.hidden = false;
  readView.hidden = true;
}

/** Sync FIRST: hiding #chat while the composer is still inside it is what stranded the input. */
function showRead() {
  syncLanding(location.hash);
  chatView.hidden = true;
  readView.hidden = false;
}

/** Tell the reader — and the screen reader — which door they are standing in. */
function markNav(mode: "tanya" | "baca" | "tema" | "peta") {
  const links = { tanya: $<HTMLAnchorElement>("#nav-tanya"), baca: $<HTMLAnchorElement>("#nav-baca"), tema: $<HTMLAnchorElement>("#nav-tema"), peta: $<HTMLAnchorElement>("#nav-peta") };
  for (const [key, el] of Object.entries(links)) {
    if (key === mode) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

async function route() {
  const hash = location.hash;
  // The cosmos runs a rAF loop. Every route that is not the Peta index must stop it, or it keeps
  // animating a canvas that is no longer on the page. renderPetaIndex re-arms it on the way in.
  if (hash !== "#/peta") destroyCosmos();
  // The browse indexes are card grids, not reading prose — they get the wide measure (like the
  // landing) so the grid fills the viewport and the header sits at the edge. The verse-reading
  // surfaces (a surah, a theme's verses, a category's entries) keep the 46rem reading measure.
  // Idempotent on every route pass.
  document.documentElement.toggleAttribute(
    "data-wide",
    hash === "#/baca" || hash === "#/tema" || hash === "#/peta",
  );
  // The rich celestial sky (crescent, gold, twinkle) is reserved for the companion home and the
  // cosmos; every other surface — reading especially — recedes to a quiet sky. Set the cosmos marker.
  document.documentElement.toggleAttribute("data-cosmos", hash === "#/peta");
  const m = hash.match(/^#\/surah\/(\d{1,3})(?:#(\d{1,3}))?$/);
  const t = hash.match(/^#\/tema\/([a-z0-9-]+)$/);
  const p = hash.match(/^#\/peta\/([a-z0-9-]+)$/);
  // Verse-reading surfaces (a surah, a theme's verses) get a DEEPER — but still calm — night sky, so
  // the scripture glows against it. Distinct from the RICH sky (crescent/gold/twinkle) reserved for
  // the companion home + cosmos: reading gets depth and reverence, never decoration. Idempotent.
  document.documentElement.toggleAttribute("data-reading", Boolean(m) || Boolean(t));

  if (m) {
    markNav("baca");
    showRead();
    await renderSurah(readView, Number(m[1]), m[2] ? Number(m[2]) : undefined);
    return;
  }

  if (hash === "#/baca") {
    markNav("baca");
    showRead();
    renderIndex(readView);
    return;
  }

  if (t) {
    markNav("tema");
    showRead();
    await renderTheme(readView, t[1]!);
    return;
  }

  if (hash === "#/tema") {
    markNav("tema");
    showRead();
    renderThemeIndex(readView);
    return;
  }

  // Peta Tematik sits BESIDE /tema, deliberately — the 12-theme lexicon also feeds chat
  // retrieval scoring, so replacing it would touch the retrieval path for a browsing win.
  if (p) {
    markNav("peta");
    showRead();
    await renderPetaCategory(readView, p[1]!);
    return;
  }

  if (hash === "#/peta") {
    markNav("peta");
    showRead();
    await renderPetaIndex(readView);
    return;
  }

  markNav("tanya");
  showChat();
}

window.addEventListener("hashchange", () => void route());

// ── the landing ──────────────────────────────────────────────────────────────
//
// dock/undock/destroy live in landing.ts so the two rules they enforce are testable — this
// file is DOM-heavy and side-effectful at import, which is exactly why the routing regression
// they now guard could not be caught here. The router owns dock/undock; only a question destroys.

let stopGreeting: (() => void) | null = null;
let stopBand: (() => void) | null = null;

// The greeting and band belong to the hero and live as long as it does — mounted once, not on
// every route pass. The band loads a shard and asks for geolocation, so it must never block the
// chat box; and re-mounting it on each Tanya↔Baca trip would re-do both for nothing.
if ($("#hello")) {
  const la = $<HTMLElement>("#greet-la");
  if (la) stopGreeting = mountGreeting(la);
  void mountBand().then((stop) => {
    stopBand = stop;
  });
}

function endLanding(): void {
  destroyLanding();
  stopGreeting?.();
  stopGreeting = null;
  stopBand?.();
  stopBand = null;
}

// ── composer ─────────────────────────────────────────────────────────────────
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  input.style.height = "auto";
  send.disabled = true;
  void ask(q);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 112) + "px";
  send.disabled = !input.value.trim();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// "Kejutkan aku" — drop a random real-shaped question into the field, focused, ready. It does NOT
// submit: the person sees what "just talk to me" looks like and decides. The pool is retrieval- and
// parser-validated (lucky.test.ts), so a draw never lands on silence.
const lucky = document.getElementById("lucky");
let lastLucky: string | null = null;
lucky?.addEventListener("click", () => {
  lastLucky = pickLucky(lastLucky);
  input.value = lastLucky;
  input.dispatchEvent(new Event("input", { bubbles: true })); // autosize + enable send
  input.focus();
  const caret = input.value.length;
  input.setSelectionRange(caret, caret);
  lucky.classList.remove("is-rolling");
  void lucky.offsetWidth; // restart the sparkle spin on every click
  lucky.classList.add("is-rolling");
});

// ── actions: seeds, copy, share, retry ───────────────────────────────────────
document.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;

  const seed = el.closest<HTMLButtonElement>(".seed");
  if (seed) {
    void ask(seed.textContent!.trim());
    return;
  }

  const retry = el.closest<HTMLButtonElement>("[data-retry]");
  if (retry) {
    const q = retry.dataset["retry"]!;
    retry.closest(".msg")?.remove();
    void ask(q);
    return;
  }

  const boot = el.closest<HTMLButtonElement>("#boot-retry");
  if (boot) {
    void bootCorpus();
    return;
  }

  if (el.closest("#nur-clear")) {
    clearThread();
    thread.querySelectorAll(".msg, .thread-tools").forEach((n) => n.remove());
    onScreen.clear();
    say("Percakapan dihapus.");
    location.reload(); // back to the empty state, cleanly
    return;
  }

  const ex = el.closest<HTMLElement>("[data-explain]");
  if (ex) {
    if (ex.dataset["explain"] === "open") openExplainer();
    else closeExplainer();
    return;
  }

  const lensBtn = el.closest<HTMLButtonElement>("[data-lens]");
  if (lensBtn) {
    applyLens(lensBtn.dataset["lens"] as TafsirLens);
    return;
  }

  const act = el.closest<HTMLButtonElement>("[data-act]");
  if (!act) return;
  const kind = act.dataset["act"];

  if (kind === "play") {
    const surah = Number(act.dataset["surah"]);
    const ayah = Number(act.dataset["ayah"]);
    const ref = act.dataset["ref"] ?? "";
    void (async () => {
      const { playing, previous, failed } = await toggleAudio(surah, ayah, ref);
      if (previous) resetPlayButton(previous);
      setPlayButton(act, playing);
      say(failed ? "Gagal memutar audio. Coba lagi." : playing ? `Memutar ayat ${ref}.` : "Jeda.");
    })();
    return;
  }

  const card = onScreen.get(act.dataset["ref"] ?? "");
  if (!card || (kind !== "copy" && kind !== "share" && kind !== "image")) return;

  void (async () => {
    const ok =
      kind === "copy"
        ? ((await copyVerse(card)) ? "copied" : "failed")
        : kind === "share"
          ? await shareVerse(card)
          : await shareVerseImage(card);
    const label = act.querySelector("span:last-child") ?? act;
    const original = act.dataset["label"] ?? act.textContent!.trim();
    act.dataset["label"] = original;

    act.classList.toggle("ok", ok !== "failed");
    label.textContent =
      ok === "failed"
        ? kind === "image"
          ? " Gagal membuat kartu"
          : " Gagal menyalin"
        : ok === "shared"
          ? " Dibagikan"
          : ok === "downloaded"
            ? " Terunduh"
            : " Tersalin";
    say(
      ok === "failed"
        ? kind === "image"
          ? "Gagal membuat kartu gambar."
          : "Gagal menyalin ayat."
        : kind === "image"
          ? "Kartu gambar ayat siap."
          : "Ayat tersalin, lengkap dengan sumbernya.",
    );

    setTimeout(() => {
      act.classList.remove("ok");
      label.textContent = " " + original.replace(/^[⧉↗▦]\s*/, "");
    }, 1800);
  })();
});

// ── scripture size — scales alone, never the UI ──────────────────────────────
const SIZES = { s: "1.7rem", m: "2.1rem", l: "2.7rem" } as const;
$("#size").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!btn) return;
  const key = btn.dataset["size"] as keyof typeof SIZES;
  document.documentElement.style.setProperty("--ar-size", SIZES[key]);
  localStorage.setItem("newquranku:ar", key);
  for (const b of $("#size").querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b === btn));
  }
});

// The "why two translations" affordance now opens explain.ts's dialog (data-explain="open" on
// #info, wired into the [data-explain] handler above) — one explainer, not a second popover.

// ── theme — both modes are first-class ───────────────────────────────────────
$("#theme").addEventListener("click", () => {
  const cur =
    document.documentElement.dataset["theme"] ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset["theme"] = next;
  localStorage.setItem("newquranku:theme", next);
});

// ── the "tampilan" (display) sheet — theme + Arabic size, collapsed on phones ────────────────
//
// Below the tablet breakpoint (styles.css) the panel becomes a real dropdown/sheet; at tablet+
// CSS keeps it always visible inline, so this toggle only matters on the widths where the
// trigger itself is shown.
const displayBtn = $<HTMLButtonElement>("#display-trigger");
const displayPanel = $<HTMLElement>("#display-panel");
displayBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = displayPanel.hidden;
  displayPanel.hidden = !open;
  displayBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (displayPanel.hidden) return;
  if (e.target === displayBtn || displayBtn.contains(e.target as Node)) return;
  if (displayPanel.contains(e.target as Node)) return;
  displayPanel.hidden = true;
  displayBtn.setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !displayPanel.hidden) {
    displayPanel.hidden = true;
    displayBtn.setAttribute("aria-expanded", "false");
    displayBtn.focus();
  }
});

// ── keyboard-aware composer ──────────────────────────────────────────────────
//
// `.composer` is `position: fixed; bottom: 0`. iOS Safari resizes the *visual* viewport when
// the on-screen keyboard opens but leaves the *layout* viewport (what `fixed` anchors to)
// alone — a documented WebKit quirk. `visualViewport` is the standards-track fix: when it
// resizes, pin the composer to its actual bottom edge instead of trusting `position: fixed` to
// react on its own. No-ops everywhere the API is unsupported or the offset is zero (desktop, no
// keyboard open). DEFERRED-VERIFY (ISC-98 in ISA.md): needs a real-device spot-check.
function bindKeyboardAwareComposer() {
  const vv = window.visualViewport;
  if (!vv) return;
  const bar = $<HTMLElement>("#composer-bar");
  const reposition = () => {
    const offset = window.innerHeight - vv.height - vv.offsetTop;
    bar.style.transform = offset > 0 ? `translateY(-${offset}px)` : "";
  };
  vv.addEventListener("resize", reposition);
  vv.addEventListener("scroll", reposition);
}

// ── boot ─────────────────────────────────────────────────────────────────────
//
// The old boot did `await fetch("/corpus.json")` with no try/catch and no res.ok check. On a
// failed request the promise rejected, `corpus` stayed null, the send button stayed disabled
// forever, and every seed click did nothing. The user saw a beautiful, completely dead app with
// no message — on exactly the patchy 4G this product targets.
//
// Note what is NOT gated on this fetch any more: reference lookup and the entire reading surface.
// The surah index is inlined in the bundle, so even if corpus.json never arrives, you can still
// ask for 18:10 and still read Al-Kahf. Only the chat retrieval degrades.
async function bootCorpus(): Promise<void> {
  const banner = $("#boot-error");
  banner.hidden = true;
  send.disabled = true;

  try {
    // Versioned, for the same reason the shards are: without it, a corpus rebuild leaves every
    // CDN and every phone serving the previous scripture until some cache decides to expire.
    const res = await fetch(`/corpus.json?v=${CORPUS_VERSION}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    corpus = (await res.json()) as Corpus;
    voices = new Map(corpus.sources.map((s) => [s.id, s]));
    send.disabled = !input.value.trim();
    banner.hidden = true;
  } catch {
    corpus = null;
    banner.hidden = false;
    banner.innerHTML = `
      <p><b>Gagal memuat korpus.</b> Koneksimu sepertinya sedang tidak stabil.</p>
      <p class="sub">Kamu masih bisa membaca Al-Qur'an dan membuka ayat lewat nomornya — yang belum bisa cuma pencarian lewat percakapan.</p>
      <button class="act" id="boot-retry">Coba lagi</button>`;
    // Chat cannot run without the corpus, but reading can. Do not pretend otherwise.
    send.disabled = true;
    say("Gagal memuat korpus. Membaca Al-Qur'an tetap bisa.");
  }
}

/**
 * The back-to-top control. A browse index (114 surahs, 13 categories) is a long scroll; this returns
 * the reader to the top without a manual drag back. Hidden until they've scrolled a screen, so it
 * never clutters the first view. Enhancement-only: it stays `hidden` if this never runs (no JS).
 */
function initToTop(): void {
  const btn = document.getElementById("to-top");
  if (!btn) return;
  btn.hidden = false; // JS is here — hand visibility to CSS (opacity), gated on scroll below
  const onScroll = (): void => {
    btn.classList.toggle("is-visible", window.scrollY > 420);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    // Return focus to the top of the document so keyboard users land where they were sent.
    document.querySelector<HTMLElement>(".mark")?.focus();
  });
}

(() => {
  // FIRST — before anything reads storage: carry a returning reader's saved thread, bookmark, theme,
  // and size across the Nur → New-Quranku key rename, so the rebrand does not wipe their data.
  migrateStorage();

  bindLazyTafsir();
  bindKeyboardAwareComposer();
  initToTop();

  const savedTheme = localStorage.getItem("newquranku:theme");
  if (savedTheme) document.documentElement.dataset["theme"] = savedTheme;

  const savedSize = localStorage.getItem("newquranku:ar") as keyof typeof SIZES | null;
  if (savedSize) {
    document.documentElement.style.setProperty("--ar-size", SIZES[savedSize]);
    for (const b of $("#size").querySelectorAll("button")) {
      b.setAttribute("aria-pressed", String(b.dataset["size"] === savedSize));
    }
  }

  // Shards from a previous corpus version are no longer this scripture. Drop them.
  void evictStaleCaches();

  void route();
  void bootCorpus().then(restoreThread);
})();

/**
 * Put the conversation back.
 *
 * Runs after the corpus lands, because `hits` turns need it to re-render. Ref turns would work
 * without it — the surah index is inlined — but restoring half a conversation is worse than
 * restoring it a beat later.
 *
 * Rendered through the same `renderTurn()` the live path uses, with `animate` off: a restored
 * thread should simply BE there, the way you left it. Nineteen verses fading in on a cold open is
 * theatre, not memory.
 */
async function restoreThread(): Promise<void> {
  const turns = loadThread();
  if (!turns.length) return;

  $("#hello")?.remove();
  // Reveal chat only if the reader is actually on the chat route. On a cold load onto a deep link
  // (#/surah/N, #/tema/X, #/baca) route() has already mounted the reading surface; forcing
  // showChat() here would stomp it — silently snapping every returning visitor (anyone with a
  // saved thread) back to chat, breaking share, bookmark, and reload for the very links this app
  // generates ("Baca lanjutan →"). Let route() own visibility; rebuild the thread DOM underneath.
  if (isChatRoute(location.hash)) showChat();

  for (const t of turns) {
    const me = document.createElement("div");
    me.className = "msg me";
    me.textContent = t.q;
    thread.append(me);

    const answer = document.createElement("div");
    answer.className = "msg nur";
    try {
      answer.innerHTML = await renderTurn(t, false);
    } catch {
      // A shard we cannot reach (offline, never cached). Say so; do not resurrect a blank bubble.
      answer.innerHTML = `<div class="oops"><p>Ayat ini tidak bisa dimuat sekarang — koneksimu sedang tidak stabil.</p>
        <button class="act retry" data-retry="${esc(t.q)}">Coba lagi</button></div>`;
    }
    thread.append(answer);
  }

  showClearControl();
  say(`Percakapan sebelumnya dipulihkan — ${turns.length} pertanyaan.`);
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
}

/** The user can always burn it. Shown only when there is something to burn. */
function showClearControl(): void {
  if (!hasThread() || document.getElementById("nur-clear")) return;
  const bar = document.createElement("div");
  bar.className = "thread-tools";
  bar.innerHTML = `<button class="linkish" id="nur-clear">Hapus percakapan</button>`;
  thread.prepend(bar);
}

// Keep the reading surface reachable even before the corpus lands.
export { surahMeta, app };
