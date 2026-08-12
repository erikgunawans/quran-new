import "./styles.css";
import "./read.css";
import "./shell.css";
import "./shell.ts";
import { announce } from "./announce.ts";
import { toggleAudio, setPlayMode, ADVANCE_EVENT, type AdvanceDetail } from "./audio.ts";
import { crisisReply, detectCrisis } from "./crisis.ts";
import { closeExplainer, openExplainer } from "./explain.ts";
import { mountBand } from "./band.ts";
import { destroyLanding, isChatRoute, syncLanding } from "./landing.ts";
import { initDictation } from "./dictate.ts";
import { bindFooter } from "./footer.ts";
import { mountGreeting } from "./greet.ts";
import { CORPUS_VERSION, displayName, evictStaleCaches, findSurah, loadAyah, parseRef, ShardError, surahMeta } from "./quran.ts";
import { destroyCosmos, filterTema, renderPetaCategory, renderPetaIndex, soleTemaHref } from "./peta.ts";
import { gotoSurahInWheel, renderIndex, renderSurah } from "./read.ts";
import { findSurahLive } from "./find-surah-live.ts";
import { renderHadis, renderHadisBook, renderFikih, renderDoa } from "./sections.ts";
import { initSettings } from "./settings-ui.ts";
import { compose, keywordThemeHits, needsFamilyLawScholar, retrieve, type Corpus, type Voice } from "./retrieve.ts";
import { pickLucky } from "./lucky.ts";
import { retrieveKnowledge, type KnowledgeAnswer } from "./knowledge.ts";
import { knowledgeOnly, looksFactual } from "./question-form.ts";
import { aqidahById, aqidahRef, matchAqidah, type AqidahEntry } from "./aqidah.ts";
import { composeFraming } from "./compose-contract.ts";
import { liveFramingModel } from "./compose-live.ts";
import { isSynthesis } from "./mode.ts";
import { synthesizeAnswer } from "./answer.ts";
import type { AnswerViolationKind } from "./answer-guard.ts";
import { liveAnswerModel } from "./answer-live.ts";
import { linkifyRefs, planAnswerLayout } from "./answer-layout.ts";
import { understandThemes } from "./theme-understand.ts";
import { liveThemeModel } from "./theme-live.ts";
import { copyVerse, shareVerse, shareVerseImage } from "./share.ts";
import { applyLens, bindLazyTafsir, tafsirStackHtml, type TafsirLens } from "./tafsir.ts";
import { tafsirTierHtml } from "./tafsir-tier.ts";
import { bindLandingCards } from "./landing-cards.ts";
import { migrateStorage } from "./migrate-storage.ts";
import { clearThread, hasThread, loadThread, rememberTurn, turnFromHits, type Turn } from "./thread.ts";
import { esc, findPlayButton, fromShard, resetPlayButton, setPlayButton, verseEl, type VerseCard } from "./verse.ts";

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

// The agent tool-trace — the visible record of what New-Quranku did to answer, mapped from the
// design's frame 1c. PRESENTATION ONLY: it re-derives from the turn's decision (the question, the
// hits, the refs whose tafsir was read) and never drives retrieval. A settled step carries a solid
// emerald dot; a pending step a pulsing grey one — the same done/pending language the design uses.
interface TraceStep {
  label: string;
  pending?: boolean;
}
function traceEl(steps: TraceStep[]): string {
  return `<div class="qk-trace" role="group" aria-label="Langkah New-Quranku">${steps
    .map(
      (s) =>
        `<div class="qk-step${s.pending ? " pending" : ""}"><span class="qk-dot" aria-hidden="true"></span><span class="qk-step-label">${esc(s.label)}</span></div>`,
    )
    .join("")}</div>`;
}

// The trace a retrieval answer settles into: what actually happened, re-derived from the hits. Rendered
// at the top of the answer block (design frame 1c) so it persists with the answer — and rebuilds
// identically on restore, since every value comes from the stored decision, never from disk markup.
function settledTrace(query: string, refs: string[], readTafsir: boolean): string {
  const q = query.length > 40 ? `${query.slice(0, 39).trimEnd()}…` : query;
  const steps: TraceStep[] = [
    { label: "Memahami pertanyaan" },
    { label: `cari_ayat("${q}") · ${refs.length} ayat` },
  ];
  if (readTafsir) steps.push({ label: `baca_tafsir · ${refs.join(", ")}` });
  steps.push({ label: "Menyusun jawaban" });
  return traceEl(steps);
}

// The composing state, upgraded from a generic shimmer to the live tool-trace (design frame 1a): the
// first step already settled, the search + compose steps pulsing. `say()` still carries the spoken
// announcement to #live, so this is purely the visual affordance while retrieval runs.
function skeleton(): HTMLElement {
  const el = document.createElement("div");
  el.className = "msg nur";
  el.innerHTML = traceEl([
    { label: "Memahami pertanyaan" },
    { label: "Mencari ayat yang relevan", pending: true },
    { label: "Menyusun jawaban", pending: true },
  ]);
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
/** Same disclosure, minus the pointer — used when no verse card made it onto the page, so the note
 *  never directs a reader to "the verses above" when there are none. */
const AI_NOTE_NO_VERSES = `<p class="reader-note ai-note">Jawaban ini disusun oleh AI — bukan fatwa, dan bukan kata-kata seorang ulama. Untuk kepastian, tanyakan kepada ustadz.</p>`;

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

    case "refer":
      return `
        <p class="said">Ini soal hak dan kewajiban dalam rumah tangga — termasuk nafkah.</p>
        <div class="silence">
          <p>Aku menemani lewat <b>perasaan</b>, dan aku memilih tidak menyodorkan ayat yang tidak pas atau seolah memberi putusan hukum keluarga.</p>
          <p>Untuk hal seperti ini, sebaiknya kamu tanya <b>ustadz atau tokoh agama yang paham hukum keluarga</b> — mereka bisa menjelaskan hak dan langkah yang bisa kamu tempuh dengan lengkap.</p>
        </div>`;

    // Unreachable on THIS surface, and required anyway. `count-defer` lives in the shared `Turn`
    // union because the demo persists it through the same `rememberTurn`/`loadThread` storage — but
    // only `web/demo/demo.ts` imports `looksLikeCount()`, so the main app never produces one. It is
    // handled because a non-total renderer is how a stored turn becomes a blank bubble, and it
    // degrades to the honest silence rather than carrying copy this surface has not shipped. The
    // warm count pointer is demo-only; see COUNT_DEFER in `web/demo/demo.ts`.
    case "count-defer":
      return renderTurn({ q: t.q, kind: "silence" }, animate);

    // The wall refused a good answer because it was a hadith. Say THAT, and open a door.
    //
    // What this deliberately does NOT do is render the hadith. No text, no Arabic, no attribution,
    // not even a collection name — the refused prose never reaches this function. Whether hadith text
    // may EVER display in this app is still with the ustadz, and `SHOW_MACHINE_HADITH_TEXT` is false;
    // a pointer to a tab the reader can already open themselves does not touch that question. The
    // register is `count-defer`'s, which shipped for the same admission.
    // CONTENT-FREE ON PURPOSE, and the first draft of this copy was not.
    //
    // It opened "Aku menemukan jawabannya" — I found the answer. For a yes/no question ("apakah benar
    // bahwa sakit menghapus dosa?") that sentence IS the answer: it implies yes. An unreceipted
    // prophetic claim wearing a pointer costume walks straight through the wall this whole change was
    // built to respect. So the copy now says only what KIND of source answers questions like this, and
    // never whether such a hadith exists, what it says, or that the reader's premise was right.
    //
    // The pointer is also deliberately modest. The Hadis tab is live ARABIC-ONLY — the Indonesian
    // layer is unreviewed machine translation and gated dark — so promising an answer there would send
    // someone asking in Indonesian to a wall of untranslated text.
    case "hadith-defer":
      return `
        <p class="said">Pertanyaan seperti ini biasanya dijawab dari <b>hadis</b>, bukan dari ayat.</p>
        <div class="silence">
          <p>Aku belum bisa mengutip sabda Nabi ﷺ di sini, karena aku belum bisa menunjukkan
          sumbernya secara utuh supaya kamu bisa memeriksanya sendiri. Aku memilih diam daripada
          menyebut sabda beliau tanpa rujukan — dan aku juga tidak mau menyimpulkan jawabannya
          untukmu.</p>
          <p>Tab <a href="#/hadis">Hadis</a> memuat kitab-kitab utamanya, tapi <b>teksnya masih
          bahasa Arab</b>. Untuk kepastian sebuah hadis, sebaiknya tanyakan ke <b>ustadz</b>. Kalau
          mau, coba tanyakan lagi dari sisi <b>ayatnya</b> — itu bisa aku bantu telusuri.</p>
        </div>`;

    // A refusal that is NOT about hadith, landing where the corpus-gap copy would otherwise have lied.
    //
    // Reached only when the wall stopped an answer AND every fallback also came up empty. Says nothing
    // about what scripture does or does not contain, because it does not know: a `fatwa` block means
    // the model issued a ruling, not that the Qur'an is silent, and telling a reader "aku belum
    // menemukan ayat yang cocok" for their fiqh question is a false claim about the mushaf. Carries no
    // rule name and no fragment — our internal quality failures are not the reader's business.
    case "answer-blocked":
      return `
        <p class="said">Untuk yang ini aku belum bisa memberi jawaban yang bisa aku pertanggungjawabkan.</p>
        <div class="silence">
          <p>Bukan berarti Al-Qur'an diam soal ini — hanya saja jawaban yang tersusun tadi tidak lolos
          pemeriksaanku sendiri, dan aku memilih tidak menyampaikannya daripada menyampaikan sesuatu
          yang belum tentu benar.</p>
          <p>Kalau ini soal <b>hukum</b>, itu ranah <b>ustadz</b> — aku tidak menetapkan halal-haram.
          Coba juga tanyakan dengan kata-kata lain, atau telusuri lewat <a href="#/peta">Tematik</a>.</p>
        </div>`;

    case "silence":
      return `
        <p class="said">Aku belum menemukan ayat yang cocok dengan itu di korpus yang sudah diverifikasi.</p>
        <div class="silence">
          <p>Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak — aku menemani lewat <b>perasaan</b>, bukan menjawab soal ajaran, hukum, atau arti sebuah ayat.</p>
          <p>Kalau kamu nyari <b>topik atau konsep</b> — misalnya tentang Allah, sabar, atau rezeki — coba buka <a href="#/peta">Tematik</a>. Kalau kamu lagi <b>ngerasain sesuatu</b>, ceritakan aja pakai kata-katamu sendiri. Atau sebutkan <b>surah dan ayatnya langsung</b>, misalnya <b>18:10</b>.</p>
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

      // The tafsir stack for each verse, computed once so the trace can tell the truth about whether
      // `baca_tafsir` actually ran (curated chat verses carry a stack; a bare hit may not).
      //
      // Carried WITH its verse rather than in a parallel array indexed by position. Two arrays kept
      // in step by `i` is a correctness claim the compiler cannot check — and it could not: under
      // `noUncheckedIndexedAccess` `stacks[i]` types as `string | undefined` even though
      // `tafsirStackHtml()` never returns undefined, so the honest fix is to stop indexing.
      const stacked = verses.map((v) => ({ v, stack: tafsirStackHtml(v.tafsir, voices) }));
      const refs = verses.map((v) => v.ref);

      return (
        settledTrace(t.q, refs, stacked.some((s) => Boolean(s.stack))) +
        `<p class="said">${lead}</p>` +
        stacked
          .map(({ v, stack }) =>
            mount({
              ref: v.ref,
              surah: v.surah,
              ayah: v.ayah,
              surah_name: v.surah_name,
              arabic: v.arabic,
              primary: v.primary,
              companion: v.companion,
              why: v.why,
              passage: v.passage,
              tafsirStack: stack,
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
      // THIRD TIER. When the index came back thin, follow it with the ayah it points at and a named
      // mufasir's verbatim words about that ayah. Returns "" whenever it does not fire or anything
      // fails, so this line can only ever ADD to the answer above it — never replace or break it.
      return knowledgeHtml(k) + (await tafsirTierHtml(k, t.q, mount));
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
async function aiHtml(prose: string, refs: readonly string[], animate: boolean): Promise<string> {
  // THE CITED AYAH IS RESOLVED AGAINST THE WHOLE MUSHAF, NOT JUST THE CURATED 191.
  //
  // This used to be `corpus.verses.find(...)` alone, and the failure it produced was visible on the
  // first authored answer prod ever served: asked "kenapa kita harus salat lima waktu", the model
  // cited QS 4:103 and QS 20:14 — both real, both correct, neither among the 191 reviewed verses —
  // so every card was filtered out and the page rendered prose followed by "berdasarkan ayat-ayat
  // DI ATAS" with no ayah above it at all. The note was pointing at nothing.
  //
  // `refs` has already passed `isRealAyah`, so anything here names a real ayah; the shards hold all
  // 6,236 and the reading surface has loaded them this way for months. Curated verses still win
  // when we have one, because they carry the reviewer's `why` and the `passage` a conditional
  // approval was granted inside — dropping those would render a verse on a surface the reviewer
  // only approved it within.
  const built = await Promise.all(
    refs.map(async (ref): Promise<readonly [string, string]> => {
      const curated = corpus?.verses.find((v) => v.ref === ref);
      if (curated) {
        return [ref, mount({
          ref: curated.ref,
          surah: curated.surah,
          ayah: curated.ayah,
          surah_name: curated.surah_name,
          arabic: curated.arabic,
          primary: curated.primary,
          companion: curated.companion,
          why: curated.why,
          passage: curated.passage,
          tafsirStack: tafsirStackHtml(curated.tafsir, voices),
          continueTo: true,
          animate,
        })];
      }
      const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref);
      if (!m) return [ref, ""];
      const surah = Number(m[1]);
      const ayah = Number(m[2]);
      try {
        const card = fromShard(await loadAyah(surah, ayah), surah, displayName(surah));
        card.lazyTafsir = true; // the full unranked stack, one tap away, as everywhere else
        card.continueTo = true;
        card.animate = animate;
        return [ref, mount(card)];
      } catch {
        // A shard we cannot fetch is DROPPED, never faked. The note below then tells the truth
        // about how many verses actually made it onto the page.
        return [ref, ""];
      }
    }),
  );

  // Only verses that actually BUILT can be placed; a dropped shard must not leave a gap under the
  // paragraph that cites it, nor make the note claim a verse that is not on the page.
  const cardFor = new Map(built.filter(([, html]) => html));

  // A citation is real if the mushaf has it — the same question `bad_ref` asks on egress, asked here
  // so an unresolvable number never becomes a link promising something on the other side.
  const isReal = (ref: string): boolean => {
    const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref);
    if (!m) return false;
    const meta = surahMeta(Number(m[1]));
    return !!meta && Number(m[2]) >= 1 && Number(m[2]) <= meta.ayahs;
  };

  const { blocks, trailing } = planAnswerLayout(prose, [...cardFor.keys()], isReal);

  // Prose is ESCAPED first and linkified second. The other order would hand a model-authored string
  // an HTML injection surface.
  const body = blocks
    .map(({ para, refs: here }) => {
      const p = `<p class="said ai-said">${linkifyRefs(esc(para), isReal)}</p>`;
      const cards = here.map((r) => cardFor.get(r) ?? "").join("");
      return cards ? `${p}<div class="ai-verses">${cards}</div>` : p;
    })
    .join("");

  // Grounded but never cited — kept, at the bottom, exactly where the whole stack used to sit.
  const rest = trailing.map((r) => cardFor.get(r) ?? "").join("");
  const tail = rest ? `<div class="ai-verses">${rest}</div>` : "";

  // The note must not claim verses that are not there. This is the same sentence either way about
  // what the answer IS (AI-composed, not a fatwa); it only stops pointing "di atas" when nothing is.
  return body + tail + (cardFor.size ? AI_NOTE : AI_NOTE_NO_VERSES);
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
    ? `<p class="know-more"><a href="#/peta/${esc(e.topic)}">Telusuri lebih lanjut di Tematik →</a></p>`
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
      `<p class="know-more"><a href="#/peta/${esc(k.slug)}">Telusuri ${k.totalEntries} entri tentang ${esc(k.category)} di Tematik →</a></p>` +
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
    `<p class="know-more"><a href="#/peta/${esc(k.slug)}">Lihat semua ${k.totalEntries} entri tentang ${esc(k.category)} di Tematik →</a></p>` +
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
    case "refer":
      say("Ini soal hukum keluarga. New-Quranku menyarankan bertanya kepada ustadz.");
      break;
    // Announced, not left to `default`, so the refusal is audible. A screen-reader user hearing
    // nothing would have no way to tell this apart from the silence turn — the same conflation this
    // whole change exists to undo, one modality over.
    case "hadith-defer":
      say("Pertanyaan seperti ini dijawab dari hadis, bukan dari ayat. New-Quranku tidak mengutip sabda Nabi tanpa rujukan.");
      break;
    case "answer-blocked":
      say("Belum ada jawaban yang bisa dipertanggungjawabkan untuk ini. New-Quranku tidak menyampaikan jawaban yang belum lolos pemeriksaan.");
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
    // A marital rights/obligation question (nafkah) is fiqh, not feeling: it must never surface a
    // verse OR the KB, only a pointer to a human ustadz. Decided BEFORE the model themes and every
    // lane below, so it costs no model hop and nothing downstream can override it.
    const referral = ref.kind === "not-a-ref" && needsFamilyLawScholar(q);

    const modelThemes =
      !referral && ref.kind === "not-a-ref" && corpus && keywordThemeHits(q).size === 0
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
              : referral
                ? { q, kind: "refer" }
                : turnFromHits(q, corpus ? retrieve(corpus, q, 2, modelThemes) : []);

    // A referral needs no corpus, KB, or model — never throw it into the error path. (Matches demo.ts,
    // which returns the refer turn before ensureCorpus.)
    if (ref.kind === "not-a-ref" && !corpus && !referral) throw new Error("corpus");

    // SYNTHESIS edition (new-quranku-ai only). For any question, let the model author a grounded
    // answer from what retrieval found. On ANY failure — nothing to ground, model down, or the guard
    // rejected the output — synthesizeAnswer returns null and we fall straight through to the
    // principled resolution below, so this edition is never worse than the trustworthy one.
    let synthesized = false;
    // Remembered, not acted on immediately — see the `blocked` branch below.
    let blockedBy: AnswerViolationKind | null = null;
    if (isSynthesis() && ref.kind === "not-a-ref" && corpus && !referral) {
      const ai = await synthesizeAnswer(corpus, q, modelThemes, liveAnswerModel);
      if (ai?.kind === "answer") {
        turn = { q, kind: "ai", prose: ai.prose, refs: [...ai.refs] };
        synthesized = true;
      } else if (ai?.kind === "blocked" && ai.by === "bad_hadith") {
        // ONLY the hadith rule earns the Hadis pointer, because only for it is the pointer TRUE: the
        // kind of source that answers the question is a hadith collection, and we have one. Sending a
        // fiqh question there would be a wrong turn, not a modest one.
        turn = { q, kind: "hadith-defer" };
        synthesized = true;
      } else if (ai?.kind === "blocked") {
        // Every OTHER refusal (`fatwa`, `arabic`, `bad_ref`) keeps its fall-through, because falling
        // through is usually the better answer: if retrieval found real verses, showing them beats an
        // apology. What must not survive is the fall-through landing on `silence` — "aku belum
        // menemukan ayat yang cocok" is a claim about the corpus, and for a blocked fiqh question it is
        // simply false. So the block is remembered and only swapped in at the end, if nothing else
        // filled the turn. Narrower than replacing the copy outright, and it keeps the good outcomes.
        blockedBy = ai.by;
      }
    }

    // Knowledge fallback. A topic/theology question ("siapakah Allah?") lands on the feeling path's
    // silence — but our KB may hold the scholar's own entries on it. Surface those (verbatim, cited)
    // instead of nothing. Runs ONLY after feelings came up empty, so a real feeling is never hijacked.
    // FACTUAL-FORM FIRST. The block below runs on the feeling path's silence, which protects a real
    // feeling from being hijacked by a topic match. That guard only ever ran one way, though, and
    // the reverse hijack was wide open: 94 feeling keywords are also subjects the index covers, so
    // "apa itu zakat" answered with 2:261 (the reward of charity) and never reached Ibadah's eight
    // entries on zakat. A question in factual form therefore gets the knowledge lanes FIRST, and
    // still falls through to whatever feelings found if they hold nothing.
    if (!synthesized && !referral && ref.kind === "not-a-ref" && looksFactual(q)) {
      const aq = matchAqidah(q);
      if (aq) {
        turn = { q, kind: "aqidah", id: aq.id };
      } else {
        const knowledge = await retrieveKnowledge(q);
        // Pointer and silence BEAT a feeling match, but only for shapes where a feeling answer
        // would be wrong rather than merely second-best — see knowledgeOnly(). How-to questions
        // keep their fall-through, because scripture often does answer "how do I do X".
        if (knowledge && knowledge.entries.length > 0) turn = { q, kind: "knowledge", slug: knowledge.slug };
        else if (knowledgeOnly(q)) turn = knowledge ? { q, kind: "knowledge", slug: knowledge.slug } : { q, kind: "silence" };
      }
    }

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

    // LAST WORD on a refusal: the wall stopped an answer and every fallback came up empty too, so the
    // only thing left to render was the corpus-gap copy — which would state, falsely, that nothing in
    // the corpus matched. Swap it for copy that makes no claim about the corpus at all. Ordered after
    // every fallback on purpose: a block that still found verses or a reviewed entry keeps them.
    if (blockedBy && turn.kind === "silence") turn = { q, kind: "answer-blocked" };

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
function markNav(mode: "tanya" | "baca" | "peta" | "hadis" | "fikih" | "doa") {
  const links = {
    tanya: $<HTMLAnchorElement>("#nav-tanya"),
    baca: $<HTMLAnchorElement>("#nav-baca"),
    peta: $<HTMLAnchorElement>("#nav-peta"),
    hadis: $<HTMLAnchorElement>("#nav-hadis"),
    fikih: $<HTMLAnchorElement>("#nav-fikih"),
    doa: $<HTMLAnchorElement>("#nav-doa"),
  };
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
    hash === "#/baca" || hash === "#/peta" || hash === "#/hadis" || hash === "#/fikih" || hash === "#/doa",
  );
  // The Al-Qur'an wheel page keeps its docked composer small + translucent until hovered/focused
  // (Erik) — a browse surface, not a chat one. This marker scopes that treatment in shell.css.
  document.documentElement.toggleAttribute("data-baca", hash === "#/baca");
  // On the Al-Qur'an surface the docked box doubles as the surah finder, so it invites a search
  // rather than a feeling. Everywhere else it is the companion prompt. (Erik: composer says "Cari Surah".)
  // NOTE: this is the live value. The `placeholder` attribute in index.html is only what shows
  // before the first route pass, so changing one without the other changes nothing you can see.
  input.placeholder =
    hash === "#/baca" ? "Cari Surah" : hash === "#/peta" ? "Cari Tema" : "Ceritakan atau tanyakan apa saja…";
  // The rich celestial sky (crescent, gold, twinkle) is reserved for the companion home and the
  // cosmos; every other surface — reading especially — recedes to a quiet sky. Set the cosmos marker.
  document.documentElement.toggleAttribute("data-cosmos", hash === "#/peta");
  // The Tematik index gives the docked box the same treatment the Al-Qur'an surface does: a
  // quiet FINDER, not the companion prompt. Distinct from data-cosmos (which owns the sky) so
  // changing one never silently changes the other.
  document.documentElement.toggleAttribute("data-tematik", hash === "#/peta");
  const m = hash.match(/^#\/surah\/(\d{1,3})(?:#(\d{1,3}))?$/);
  const p = hash.match(/^#\/peta\/([a-z0-9-]+)$/);
  const h = hash.match(/^#\/hadis\/([a-z]+)\/(\d{1,3})$/);
  // Verse-reading surfaces (a surah) get a DEEPER — but still calm — night sky, so the scripture
  // glows against it. Distinct from the RICH sky (crescent/gold/twinkle) reserved for the companion
  // home + cosmos: reading gets depth and reverence, never decoration. Idempotent.
  document.documentElement.toggleAttribute("data-reading", Boolean(m));

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

  if (h) {
    markNav("hadis");
    showRead();
    await renderHadisBook(readView, h[1]!, Number(h[2]));
    return;
  }

  if (hash === "#/hadis") {
    markNav("hadis");
    showRead();
    await renderHadis(readView);
    return;
  }

  if (hash === "#/fikih") {
    markNav("fikih");
    showRead();
    await renderFikih(readView);
    return;
  }

  // No `await`: the section holds references only, so there is nothing to fetch. See `doa.ts`.
  if (hash === "#/doa") {
    markNav("doa");
    showRead();
    renderDoa(readView);
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

// The mic belongs to the COMPOSER, not the hero — the composer outlives the landing (landing.ts
// moves the same element into the docked bar), so this is wired once here and never re-run.
initDictation();

// Same reasoning as the mic: the footer is a body-level sibling that outlives every route, so it is
// wired once here rather than re-bound whenever a surface mounts. Re-binding on navigation would
// stack a second click listener and make the handle toggle twice per press — closed to open to
// closed, which reads as "the button does nothing".
bindFooter();
bindLandingCards();

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
  // On the Al-Qur'an surface the box is a surah FINDER, not the companion prompt — it must never
  // open the chat/answer view. Everywhere else it asks.
  if (location.hash === "#/baca") {
    void searchBaca(q);
    return;
  }
  // Tematik: the box is a finder here too. It has already filtered on every keystroke, so submit
  // only has to resolve the case where exactly one theme is left — then it opens it.
  if (location.hash === "#/peta") {
    const only = soleTemaHref();
    if (only) {
      filterTema("");
      location.hash = only;
    }
    return;
  }
  void ask(q);
});

// "Cari Surah": the model finds the surah (semantic — a theme, a story, a feeling, any language or
// spelling) and we spin the wheel straight to it. The keyword findSurah() is ONLY the fallback for
// when the model is unavailable — never the primary path (Erik: no annoying keyword search).
async function searchBaca(q: string): Promise<void> {
  let n: number | null = null;
  try {
    n = await findSurahLive(q);
  } catch {
    n = null; // endpoint/model down → fall through to the keyword matcher
  }
  if (n === null) {
    const hit = findSurah(q);
    n = hit ? hit.n : null;
  }
  if (n !== null) gotoSurahInWheel(n);
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 112) + "px";
  send.disabled = !input.value.trim();
  // Tematik filters live — thirteen cards are all on screen, so the answer can be instant.
  if (location.hash === "#/peta") filterTema(input.value);
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

// ── recitation: the play menu ────────────────────────────────────────────────
/** Shut every open play menu except `keep`, and re-sync the triggers' aria-expanded. */
function closePlayMenus(keep: HTMLElement | null): void {
  for (const m of document.querySelectorAll<HTMLElement>(".play-menu")) {
    if (m === keep || m.hidden) continue;
    m.hidden = true;
    m.parentElement?.querySelector('[data-act="play-menu"]')?.setAttribute("aria-expanded", "false");
  }
}

/**
 * Start (or pause) playback and repaint the button.
 *
 * `source` carries the surah/ayah/ref data; `button` is the element that should show the state.
 * They differ when the click came from a menu option — the option knows which ayah it belongs to,
 * but it is the Dengar button that has to turn into Jeda.
 */
function startPlayback(source: HTMLElement, button: HTMLElement): void {
  const surah = Number(source.dataset["surah"]);
  const ayah = Number(source.dataset["ayah"]);
  const ref = source.dataset["ref"] ?? "";
  void (async () => {
    const { playing, previous, failed } = await toggleAudio(surah, ayah, ref);
    if (previous) resetPlayButton(previous);
    setPlayButton(button as HTMLButtonElement, playing);
    say(failed ? "Gagal memutar audio. Coba lagi." : playing ? `Memutar ayat ${ref}.` : "Jeda.");
  })();
}

// Auto-advance moves playback without anyone clicking, so the buttons it leaves behind are stale.
// Repaint both ends of the move — the ayah that finished and the one that picked up.
document.addEventListener(ADVANCE_EVENT, (e) => {
  const { from, to, playing } = (e as CustomEvent<AdvanceDetail>).detail;
  resetPlayButton(from);
  if (!to) return;
  const next = findPlayButton(to);
  if (next && playing) setPlayButton(next, true);
  if (playing) say(`Lanjut ke ayat ${to}.`);
});

// A menu that stays open after you look away is a menu you have to dismiss twice.
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest(".act-play")) closePlayMenus(null);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePlayMenus(null);
});

// ── actions: seeds, copy, share, retry ───────────────────────────────────────
document.addEventListener("click", (e) => {
  const el = e.target as HTMLElement;

  // A seed is a button whose LABEL IS THE QUESTION — pressing it asks exactly what it says. That
  // makes the class dangerous to reuse for looks: `.seed-pill` (the landing's two controls) briefly
  // carried `.seed` for its pill styling and this handler dutifully asked Tanya "Acak pertanyaan"
  // and "Yang sering dibuka", because those are the labels. Excluded explicitly rather than relying
  // on the markup staying disciplined, since the failure is silent and the damage is a nonsense
  // question sent on the reader's behalf.
  const seed = el.closest<HTMLButtonElement>(".seed:not(.seed-pill)");
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

  // Dengar with a choice behind it (Erik, 2026-08-10): the first tap asks whether this is one ayah
  // or the start of a run, and the second tap is the one that plays. Only ever on the way IN — see
  // the `opensMenu` note in verse.ts.
  if (kind === "play-menu") {
    const menu = act.parentElement?.querySelector<HTMLElement>(".play-menu");
    if (!menu) return;
    const open = menu.hidden;
    closePlayMenus(open ? menu : null);
    menu.hidden = !open;
    act.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector<HTMLButtonElement>(".play-opt.on, .play-opt")?.focus();
    return;
  }

  if (kind === "play-mode") {
    setPlayMode(act.dataset["mode"] === "continue" ? "continue" : "single");
    closePlayMenus(null);
    const trigger = act
      .closest<HTMLElement>(".act-play")
      ?.querySelector<HTMLButtonElement>('[data-act="play-menu"]');
    startPlayback(act, trigger ?? act);
    return;
  }

  if (kind === "play") {
    startPlayback(act, act);
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
initSettings();

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

/**
 * The docked composer rests compact and translucent so the surah behind it stays readable, and
 * opens on approach. Hover and focus are pure CSS; this covers the case CSS cannot see — the reader
 * has typed something and then moved the pointer away. Without it their own half-written question
 * would fade to 62% and shrink under them, which is the one moment the input must not retreat.
 */
function bindComposerPresence(): void {
  const form = document.getElementById("composer");
  const field = form?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input[type='text']");
  if (!form || !field) return;
  const sync = (): void => {
    form.classList.toggle("is-typing", field.value.trim().length > 0);
  };
  field.addEventListener("input", sync);
  // A programmatic fill — a seed chip, "Kejutkan aku", the surah finder — does not fire `input`.
  form.addEventListener("submit", () => queueMicrotask(sync));
  sync();
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

  // THE WINDOW DOES NOT SCROLL IN THIS SHELL. `.qk-panel-body` is the scroll container — measured:
  // scrollHeight 1069 against clientHeight 788 while `window.scrollY` sat at 0 and never moved. So
  // this button has existed, been correctly styled, and been permanently invisible: its listener was
  // bound to a scroller that never fires. It shipped that way because the reskin moved the scroll
  // into the panel long after the button was written, and nothing tied the two together.
  //
  // Both are still observed: `window` for any surface that scrolls the document, the panel for the
  // shell. Whichever is actually scrolling decides.
  // On a surah there is a THIRD tier: the split's two columns are their own scrollers, and that is
  // where most of the reading scroll actually happens — the panel itself tops out around 330px while
  // a column runs for thousands. Watching only the panel would leave the button dark exactly when a
  // reader is deepest into a tafsir. All live scrollers are observed, and the deepest one decides.
  const scrollers = (): HTMLElement[] => [
    ...(document.querySelector<HTMLElement>(".qk-panel-body") ? [document.querySelector<HTMLElement>(".qk-panel-body")!] : []),
    ...document.querySelectorAll<HTMLElement>("#read .sp-scroll"),
  ];
  // VISIBILITY FOLLOWS THE SCROLLBAR, NOT THE SCROLL POSITION (Erik, 2026-08-09).
  //
  // It used to appear after 220px of travel, which meant it could be showing on a surface whose
  // scrollbar had since gone away — a route change, a collapsed column, a closed tafsir — leaving a
  // control offering to undo a scroll that no longer exists. The rule is now the one Erik stated:
  // if something on screen can scroll vertically, the button is available; if nothing can, it is
  // hidden. A few px of slack because sub-pixel layout leaves scrollHeight a hair over clientHeight
  // on elements that are not really scrollable.
  const canScroll = (): boolean =>
    document.documentElement.scrollHeight - window.innerHeight > 4 ||
    scrollers().some((s) => s.scrollHeight - s.clientHeight > 4);

  // ...AND there has to be something to go back to. Scrollability alone put the button on screen at
  // the very top of a long surah, where pressing it does nothing — an control that visibly does
  // nothing teaches the reader to distrust the next one. Both conditions must hold: the surface can
  // scroll, and the reader has left the top.
  //
  // 160px rather than a bare `> 0`: a trackpad's inertia and the browser's own scroll restoration
  // both produce a few px of travel the reader never asked for, and a control that blinks in and out
  // at the top edge reads as a glitch. 160 is also comfortably inside the panel's ~331px range, so it
  // stays reachable on the shallowest surface that scrolls at all.
  const offset = (): number =>
    Math.max(window.scrollY, ...scrollers().map((s) => s.scrollTop), 0);

  const sync = (): void => {
    btn.classList.toggle("is-visible", canScroll() && offset() > 160);
  };

  window.addEventListener("scroll", sync, { passive: true });
  // Capture phase: scroll does not bubble, and the inner columns are re-created on every route
  // change, so binding to each one individually would go stale the moment the reader opens a surah.
  document.addEventListener("scroll", sync, { passive: true, capture: true });
  // Scrollability changes without anyone scrolling: opening a surah, expanding a tafsir, collapsing
  // a column, resizing the window. Scroll events alone would leave the button stale in every one of
  // those cases, so the geometry itself is watched.
  window.addEventListener("resize", sync, { passive: true });
  window.addEventListener("hashchange", sync);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(sync);
    const observe = (): void => {
      for (const s of scrollers()) {
        ro.observe(s);
        if (s.firstElementChild) ro.observe(s.firstElementChild); // content growth, not just the box
      }
    };
    observe();
    window.addEventListener("hashchange", () => queueMicrotask(observe));
  }
  sync();

  btn.addEventListener("click", () => {
    const behavior = scrollBehavior();
    window.scrollTo({ top: 0, behavior });
    for (const s of scrollers()) s.scrollTo({ top: 0, behavior });
    // Return focus to the top of the document so keyboard users land where they were sent.
    document.querySelector<HTMLElement>(".qk-brand")?.focus();
  });
}

(() => {
  // FIRST — before anything reads storage: carry a returning reader's saved thread, bookmark, theme,
  // and size across the Nur → New-Quranku key rename, so the rebrand does not wipe their data.
  migrateStorage();

  bindLazyTafsir();
  bindKeyboardAwareComposer();
  bindComposerPresence();
  initToTop();

  // The attribute is ALWAYS set — from storage if the reader chose, otherwise from the system.
  //
  // It used to be set only when a theme was saved, which meant a first-time visitor had none, and
  // the app then took its register from two different signals at once: styles.css tokens flip on
  // `@media (prefers-color-scheme: dark)`, while shell.css's two-layer ground flips on
  // `[data-theme="dark"]`. On a dark OS that produced a genuinely half-dark app — dark ink tokens
  // painted onto the panel's light gradient, so a 48px greeting rendered near-white on near-white.
  // Every element-level colour patch for that was treating a symptom; the bad state enters HERE.
  //
  // Deliberately NOT written back to localStorage: an unset preference must keep following the OS,
  // so a reader who never opened the toggle still gets dark at night. Storage means "I chose".
  // `"system"` is a THIRD stored value, not a theme name, and it must never reach the attribute.
  // The settings panel can store it (the header toggle is binary and cannot express it), and the
  // CSS only knows `light` and `dark` — so `data-theme="system"` would match no rule and leave the
  // panel and the ink tokens keyed off different mechanisms, which is the white-on-white failure
  // this repo has already hit once. Treat it exactly like "unset": follow the OS.
  const savedTheme = localStorage.getItem("newquranku:theme");
  const explicit = savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
  document.documentElement.dataset["theme"] =
    explicit ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

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

  // NOT `$("#hello")?.remove()`. By the time this runs, `route()` (below, line ~1068) has already
  // called dockLanding(), which moves #composer-bar INSIDE #hello. Removing the hero directly took
  // the composer out of the document with it — so every reader returning to a saved thread within
  // thread.ts's 12-hour window could read their old answer and never ask another question, on any
  // route, until they hit "Hapus percakapan" and destroyed the thing they came back for.
  // destroyLanding() undocks first, which is the entire reason landing.ts exists.
  destroyLanding();
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
