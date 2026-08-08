/**
 * The reading surface.
 *
 * THE MISSING DOOR
 * ----------------
 * Nur could answer questions about the Qur'an but could not open it. You could not read
 * Al-Kahf on a Friday — the most predictable devotional act the product exists to serve —
 * because the only surface was a chat box. Everything below exists to close that hole.
 *
 * Two views, one file:
 *   renderIndex  — all 114 surahs, from the inlined index. Zero network, works offline,
 *                  works on the very first cold open before a single byte is fetched.
 *   renderSurah  — one surah, continuous, top to bottom, the way scripture is actually read.
 *
 * Scripture is drawn ONLY through verseEl()/fromShard(). Hand-writing card markup here would
 * fork the honesty contract — a verse could reach the page with its literal companion or its
 * attribution quietly missing. There is one renderer, and it always draws both.
 */
import {
  BASMALAH,
  isCached,
  loadSurah,
  displayName,
  ShardError,
  SURAH_INDEX,
  surahMeta,
  type Shard,
  type ShardVerse,
  type SurahMeta,
} from "./quran.ts";
import { announce } from "./announce.ts";
import { cancelBookmark, loadBookmark, saveBookmark } from "./bookmark.ts";
import { copyVerse, shareVerse, shareVerseImage } from "./share.ts";
import { esc, fromShard, verseEl, type VerseCard } from "./verse.ts";
import { bindIntroLang, IntroError, introEl, loadIntro } from "./surah-intro.ts";

// ── how much scripture arrives at once ───────────────────────────────────────
//
// Al-Baqarah is 286 ayahs. Building all of them in one synchronous pass locks the main thread
// on the mid-range Android this product is actually used on. Paint enough to fill the screen,
// then let the rest arrive while the phone is idle.
const FIRST = 20;
const CHUNK = 20;

/**
 * A monotonically increasing render token.
 *
 * A user on patchy 4G taps a surah, waits, gives up, taps another. The first shard can still
 * land afterwards. Without a token the late arrival paints its verses into a view the user
 * already left. Every render claims a token; every async continuation checks it still holds.
 */
let token = 0;
const claim = (): number => ++token;

/** Verses currently on the reading surface, so copy/share can find one by ref. */
const onRead = new Map<string, VerseCard>();

/** Register a card rendered by a DIFFERENT surface that shares this DOM container (e.g.
 * themes.ts, which renders into #read too) — so the ONE copy/share handler below (bindActs)
 * covers it without a second, duplicated click listener. */
export function registerReadCard(card: VerseCard): void {
  onRead.set(card.ref, card);
}

/** Same reason: a surface sharing #read needs to clear stale cards on its own navigations too,
 * not just read.ts's own renderIndex()/renderSurah(). */
export function clearReadCards(): void {
  onRead.clear();
}

/** One owner for the live region — see announce.ts. */
const say = announce;

// ── the last-read bookmark ─────────────────────────────────────────────────────
//
// As the reader moves down a surah, remember where they are, so "Lanjutkan baca" on the index can
// send them back. The write itself (debounced, validated, no-TTL) lives in bookmark.ts; this is only
// the eyes that watch the scroll.
//
// ONE observer per render, disconnected the moment the reader leaves. A per-chunk observer would
// swarm on a 286-ayah surah, and an observer left running after navigation would keep writing
// positions into a surah nobody is reading — a stale-write leak on exactly the phone we care about.
let tracker: IntersectionObserver | null = null;

/**
 * Stop watching. Called whenever a new reading surface mounts, so no observer outlives its surah.
 *
 * Also cancels any pending debounced write: disconnecting stops NEW positions, but a write already
 * scheduled before navigation would otherwise land afterwards and stamp the old surah's ayah onto
 * the one the reader just opened. Teardown must close both doors.
 */
function stopTracking(): void {
  tracker?.disconnect();
  tracker = null;
  cancelBookmark();
}

/**
 * Watch a surah's verses and record the topmost one in view.
 *
 * `rootMargin` pulls the root's bottom up to 25% of its height, so a verse "intersects" only while
 * it sits in the top band — i.e. the thing you are actually reading, not everything on screen. Among
 * the band, the topmost verse is simply the one with the smallest ayah number (verses render in
 * order), so we never touch geometry: keep a set of visible ayahs and save their minimum. saveBookmark
 * is debounced, so firing it on every intersection change is free.
 *
 * `root` MUST be the element the verses actually scroll inside. When the surah went split-screen the
 * text column became its own scroll container sitting BELOW the top quarter of the window, so a
 * viewport-rooted observer could never see a verse in its band — the reading position silently
 * stopped being recorded, and Riwayat Bacaan stopped advancing, with nothing on screen to say so.
 * The percentage margin is meaningless without naming the box it is a percentage OF.
 */
/**
 * The box `el` actually scrolls inside — `el` itself when it scrolls, else its nearest scrolling
 * ancestor, else the viewport (`null`).
 *
 * `.sp-scroll` is a scroll container at wide widths and, since the narrow branch released its
 * height cap, plain flow content at ≤820px. Handing a non-scrolling box to `startTracking` is not
 * an error the browser reports: the observer keeps working, but `-75%` of a 250,000px-tall element
 * is a 62,000px band, so nearly every verse "intersects", `Math.min` returns 1 forever, and the
 * bookmark silently freezes at ayah 1 — the same class of failure the comment on `startTracking`
 * already describes, arriving from the opposite direction. So ask the layout instead of assuming it.
 */
function scrollBox(el: Element): Element | null {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollHeight <= n.clientHeight) continue;
    if (/auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
  }
  return null;
}

function startTracking(surah: number, root: Element | null): void {
  stopTracking();
  const visible = new Set<number>();
  tracker = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const ayah = Number((e.target as HTMLElement).dataset["ref"]?.split(":")[1]);
        if (!Number.isFinite(ayah)) continue;
        if (e.isIntersecting) visible.add(ayah);
        else visible.delete(ayah);
      }
      if (visible.size) saveBookmark(surah, Math.min(...visible));
    },
    { root, rootMargin: "0px 0px -75% 0px", threshold: 0 },
  );
}

/** Hand the newly-appended cards to the tracker. Idempotent per element — IO.observe ignores repeats. */
function observeVerses(cards: Iterable<Element>): void {
  if (!tracker) return;
  for (const c of cards) tracker.observe(c);
}

const reduced = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Idle scheduling, feature-detected off globalThis rather than assumed.
 *
 * Safari has no requestIdleCallback. The timeout is a floor, not a promise: it guarantees the
 * remaining ayahs still arrive promptly on a busy thread instead of starving behind other work.
 */
const idle = (fn: () => void): void => {
  const ric = (
    globalThis as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  // Fire exactly once, via whichever scheduler gets there first.
  let ran = false;
  const run = (): void => {
    if (ran) return;
    ran = true;
    fn();
  };

  // The backstop is not belt-and-braces — it is load-bearing, and it was found the hard way.
  //
  // A chunk chain driven ONLY by requestIdleCallback stops dead in a hidden or throttled tab:
  // Chrome starves rIC in background tabs, the chain never resumes, and the reader is left with
  // a SILENTLY TRUNCATED surah. Observed: Al-Baqarah rendering 280 of 286 ayahs and stopping —
  // dropping 2:285-286 (`Amanar-Rasulu`, recited nightly) and 2:282, the longest verse in the
  // Qur'an. No error, no indication; the surah just ended early.
  //
  // That is the same class of failure the shard integrity check exists to prevent — scripture
  // does not degrade gracefully — so completeness must never depend on an optional scheduler.
  if (ric) ric(run, { timeout: 80 });
  setTimeout(run, 120);
};

// ── the data speaks English; the reader does not ─────────────────────────────
//
// SURAH_INDEX carries "meccan"/"medinan" because that is what the corpus ships. An Indonesian
// reader has never called it that. This is the only place the two vocabularies touch.
const revID = (rev: string): string =>
  rev === "meccan" ? "Makkiyah" : rev === "medinan" ? "Madaniyah" : rev;

/** Fold to a searchable shape: "Al-Kahf" and "al kahfi" and "alkahf" all collapse together. */
const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`\-_.]/g, "")
    .replace(/\s+/g, "");

// ═══════════════════════════════════════════════════════════════════════════
// THE INDEX
// ═══════════════════════════════════════════════════════════════════════════

// Lets the "Cari Surah" composer (main.ts) spin the mounted wheel to a surah without reaching into
// the renderIndex closure. Set while the index is mounted; each mount rebinds it to its own wheel.
let wheelGoto: ((n: number) => void) | null = null;
// The shelf's clip-resize observer. Module-level so each mount disconnects the prior one (no pileup).
let bacaResize: ResizeObserver | null = null;
/** Centre (and thereby open) surah `n` in the wheel. Returns false if the index isn't mounted. */
export function gotoSurahInWheel(n: number): boolean {
  if (!wheelGoto) return false;
  wheelGoto(n);
  return true;
}

// One card in the shelf. `i` picks one of the 8 gradient presets (data-bg, styled per theme in
// shell.css) so the row reads as a coloured shelf of books, not a wall of identical tiles (Erik's
// reference). `open` is the selected/centre card — it widens; the rest stay slim book-spines.
const indexRow = (s: SurahMeta, open: boolean, i: number): string => `
  <li>
    <a class="srow${open ? " is-open" : ""}" data-bg="${i % 8}" href="#/surah/${s.n}" data-n="${s.n}" data-find="${esc(`${fold(displayName(s.n))} ${fold(s.tl)} ${fold(s.en)} ${s.n}`)}" aria-label="${esc(`${displayName(s.n)} — ${s.ayahs} ayat`)}">
      <span class="srow-girih" aria-hidden="true"></span>
      <span class="srow-top">
        <span class="srow-n">${String(s.n).padStart(3, "0")}</span>
        <span class="srow-rev ${s.rev}">${revID(s.rev)}</span>
      </span>
      <!-- Collapsed: Arabic + name run up the spine (design frame quranA, s.shut). Decorative —
           the accessible name lives on the anchor's aria-label, so these can be aria-hidden. -->
      <span class="srow-spine" aria-hidden="true">
        <span class="srow-spine-line">
          <span class="srow-spine-ar" dir="rtl" lang="ar">${esc(s.ar)}</span>
          <span class="srow-spine-tl">${esc(displayName(s.n))}</span>
        </span>
      </span>
      <!-- Open (centered card): the full cluster. -->
      <span class="srow-ar" dir="rtl" lang="ar" aria-hidden="true">${esc(s.ar)}</span>
      <span class="srow-foot">
        <span class="srow-tl">${esc(displayName(s.n))}</span>
        <span class="srow-meta">${s.ayahs} ayat</span>
        <span class="srow-gloss">${esc(displayName(s.n))} — ${s.ayahs} ayat, surah ke-${s.n} dalam mushaf.</span>
      </span>
    </a>
  </li>`;

/**
 * All 114 surahs.
 *
 * Synchronous and network-free on purpose — SURAH_INDEX is inlined in the bundle. Even when
 * corpus.json never arrives, this list still opens. 114 plain rows build in one pass without
 * trouble; the chunking below is for surahs, not for this.
 */
export function renderIndex(mount: HTMLElement): void {
  claim(); // any surah still chunking in the background belongs to a view we are leaving
  onRead.clear();
  stopTracking(); // the index has no verses to watch

  // "Lanjutkan baca" — only when there is a real place to return to. loadBookmark already validated
  // it against the inlined index, so this link can never point at a verse that does not exist.
  const bm = loadBookmark();
  // The single resume link became a "Riwayat Bacaan" dropdown (Erik): a native <details> so it is
  // keyboard- and screen-reader-friendly with no JS. Closed by default; opens to the place you left.
  const history = `
    <details class="baca-history">
      <summary class="baca-history-sum">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <span>Riwayat Bacaan</span>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <div class="baca-history-body">
        ${bm
          ? `<a class="baca-history-item" href="#/surah/${bm.surah}#${bm.ayah}">
               <span class="baca-history-w">${esc(displayName(bm.surah))} · ayat ${bm.ayah}</span>
               <span class="baca-history-k">Lanjutkan baca <span aria-hidden="true">→</span></span>
             </a>`
          : `<p class="baca-history-empty">Belum ada riwayat bacaan. Buka satu surah untuk memulai.</p>`}
      </div>
    </details>`;

  mount.innerHTML = `
    <div class="read-index baca-index">
      <header class="baca-head">
        <div class="baca-head-l">
          <h1 class="qk-hero-gradient baca-title">Al Qur'an</h1>
          <p class="baca-sub">Al Qur'an dan Tafsir</p>
        </div>
        <div class="baca-head-r">${history}</div>
      </header>

      <div class="baca-strip" role="group" aria-label="Daftar surah — panah kiri/kanan menggeser barisan; yang di tengah terbuka" tabindex="0">
        <button class="baca-arrow baca-prev" type="button" aria-label="Surah sebelumnya" title="Sebelumnya">‹</button>
        <div class="baca-clip"><ul class="surah-list" id="surah-list"></ul></div>
        <button class="baca-arrow baca-next" type="button" aria-label="Surah berikutnya" title="Berikutnya">›</button>
      </div>
    </div>`;

  const list = mount.querySelector<HTMLUListElement>("#surah-list");
  const clip = mount.querySelector<HTMLElement>(".baca-clip");
  const strip = mount.querySelector<HTMLElement>(".baca-strip");
  // If the markup changed underneath us the rest is an enhancement over an already-navigable page.
  if (!list || !clip || !strip) return;

  // ── The looping book-shelf (Erik) ──────────────────────────────────────────
  // A FLAT shelf that WRAPS: the open card sits dead-centre with An-Nas (114) to the left of
  // Al-Fatihah (1) and Al-Baqarah (2) to the right — it goes around forever. We get a seamless loop by
  // TRIPLING the 114 cards into one flex row and translating the whole row so the open card is centred;
  // moving past either end just glides into the next copy, then we quietly snap `pos` back to the middle
  // copy (invisible — the copies are byte-identical). Only the open card widens (146 → 560px); the rest
  // stay slim spines. Width morph + row glide share ONE 620ms cubic-bezier(.16,1,.3,1) (CSS transitions
  // on .srow width + .surah-list transform), so opening and sliding read as a single motion — no rAF.
  const N = SURAH_INDEX.length; // 114
  const COPIES = 3;             // left copy · home copy · right copy → always a real surah on each side
  const HOME = N;              // the middle copy; real surah r lives at track index HOME + r
  const SHUT = 146, OPEN = 560, GAP = 10, PITCH = SHUT + GAP; // px — MUST match .srow widths in shell.css

  // Build COPIES×114 cards. Each card's colour preset + href come from its REAL surah, so a clone is
  // indistinguishable from its original — which is exactly what makes the wrap invisible.
  let html = "";
  for (let c = 0; c < COPIES; c++) for (let r = 0; r < N; r++) html += indexRow(SURAH_INDEX[r]!, false, r);
  list.innerHTML = html;

  let pos = HOME; // track index of the OPEN card (Al-Fatihah in the middle copy)
  let sel = 0;    // real surah index 0..113
  let openEl: Element | null = null;
  const openAt = (ti: number): void => {
    openEl?.classList.remove("is-open");
    openEl = list.children[ti]?.querySelector(".srow") ?? null;
    openEl?.classList.add("is-open");
  };

  // Centre the open card (at `pos`) in the clip. animate=false suppresses the CSS transitions (used for
  // the invisible wrap-normalisation and for resize). A ±N shift keeps pos on the physical triple track
  // and is visually identical, so it only ever matters under extreme continuous scrolling.
  const place = (animate: boolean): void => {
    while (pos < 0) pos += N;
    while (pos >= COPIES * N) pos -= N;
    const view = clip.clientWidth || list.clientWidth;
    const x = Math.round(view / 2 - (pos * PITCH + OPEN / 2));
    if (animate) {
      list.style.transform = `translate3d(${x}px,0,0)`;
    } else {
      list.classList.add("no-anim");
      list.style.transform = `translate3d(${x}px,0,0)`;
      void list.offsetWidth; // commit the no-transition state before re-enabling
      list.classList.remove("no-anim");
    }
  };

  let pending: ReturnType<typeof setTimeout> | undefined;
  const announce = (): void => {
    if (pending !== undefined) clearTimeout(pending);
    pending = setTimeout(() => {
      const s = SURAH_INDEX[sel];
      if (s) say(`${displayName(s.n)} terbuka, surah ke-${s.n}.`);
    }, 250);
  };

  // After a move settles, slide `pos` back into the middle copy — invisible, same surah + surroundings.
  // Debounced so a burst of turns normalises once, after it stops.
  let norm: ReturnType<typeof setTimeout> | undefined;
  const normalise = (): void => {
    if (norm !== undefined) clearTimeout(norm);
    if (pos >= HOME && pos < HOME + N) return; // already home
    norm = setTimeout(() => {
      pos = HOME + (((pos - HOME) % N) + N) % N;
      openAt(pos);
      place(false);
    }, 700);
  };

  // Move the open card to track index `ti`; wraps seamlessly because the shelf is tripled.
  const goTo = (ti: number, animate = true): void => {
    pos = ti;
    sel = (((pos - HOME) % N) + N) % N;
    openAt(pos);
    place(animate);
    announce();
    normalise();
  };
  const step = (dir: number): void => goTo(pos + dir);

  openAt(pos);   // open Al-Fatihah
  place(false);  // initial centre (the ResizeObserver re-runs this once layout has a width)

  // Click a slim card to bring it to centre; click the open card to enter the surah (its href navigates).
  list.addEventListener("click", (e) => {
    const li = (e.target as Element).closest?.(".srow")?.closest("li");
    if (!li) return;
    const ti = [...list.children].indexOf(li as Element);
    if (ti >= 0 && ti !== pos) { e.preventDefault(); goTo(ti); }
  });

  const prevBtn = mount.querySelector<HTMLButtonElement>(".baca-prev");
  const nextBtn = mount.querySelector<HTMLButtonElement>(".baca-next");
  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));

  // Left/right arrow keys shift the shelf when the strip holds focus.
  strip.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
  });

  // "Cari Surah" jumps straight to a match, centred in the home copy (no wild slide across the shelf).
  wheelGoto = (n: number): void => {
    const r = SURAH_INDEX.findIndex((s) => s.n === n);
    if (r >= 0) goTo(HOME + r, false);
  };

  // Re-centre when the clip resizes (sidebar toggle, window resize). One observer per mount; the
  // previous is disconnected so observers never pile up across route changes. Fires once on observe().
  bacaResize?.disconnect();
  bacaResize = new ResizeObserver(() => place(false));
  bacaResize.observe(clip);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SURAH
// ═══════════════════════════════════════════════════════════════════════════

const backEl = (cls: string): string =>
  `<a class="back ${cls}" href="#/baca"><span aria-hidden="true">←</span> Kembali ke daftar surah</a>`;

// ── Islamic craft: shared geometry ───────────────────────────────────────────
// The 8-pointed khātam star (also the ayah medallion in verse.ts) and a quarter-girih corner motif.
// Both stroke/fill with currentColor so they inherit the emerald line-work — never gold-on-content.
const STAR8 =
  "M20 2 L23.83 10.76 L32.73 7.27 L29.24 16.17 L38 20 L29.24 23.83 L32.73 32.73 L23.83 29.24 L20 38 L16.17 29.24 L7.27 32.73 L10.76 23.83 L2 20 L10.76 16.17 L7.27 7.27 L16.17 10.76 Z";
const GIRIH_CORNER =
  '<path fill="none" stroke="currentColor" stroke-width="1.3" d="M2 20 A18 18 0 0 1 20 2 M8 20 A12 12 0 0 1 20 8 M2 20 L20 20 L20 2"/>';
/** A quiet section rule with a central khātam — separates the Basmalah from the verses. */
const GIRIH_DIVIDER = `<div class="girih-divider" aria-hidden="true"><svg viewBox="0 0 40 40"><path fill="none" stroke="currentColor" stroke-width="1.4" d="${STAR8}"/></svg></div>`;

// The surah name + meta sit in an illuminated cartouche (double frame + corner girih + a crowning
// khātam), the way a mushaf opens a surah. Structural markup unchanged in substance — only wrapped.
const headEl = (m: SurahMeta): string => `
  <header class="surah-head">
    ${backEl("back-top")}
    <div class="surah-title cartouche">
      <span class="cartouche-frame" aria-hidden="true"></span>
      <svg class="girih-corner tl" viewBox="0 0 40 40" aria-hidden="true">${GIRIH_CORNER}</svg>
      <svg class="girih-corner br" viewBox="0 0 40 40" aria-hidden="true">${GIRIH_CORNER}</svg>
      <svg class="cartouche-star" viewBox="0 0 40 40" aria-hidden="true"><path fill="var(--primary-wash)" stroke="var(--primary-line)" stroke-width="1.2" d="${STAR8}"/></svg>
      <h1 class="surah-ar" dir="rtl" lang="ar">${esc(m.ar)}</h1>
      <p class="surah-tl">${esc(displayName(m.n))}</p>
      <p class="surah-meta">${m.ayahs} ayat · ${revID(m.rev)}</p>
    </div>
  </header>`;

/**
 * A scripture-SHAPED wait, not a grey bar.
 *
 * The silhouette of what is coming — one line at Arabic height, two at translation height —
 * so the page does not lurch when the real thing lands.
 */
const skeletonEl = (): string => {
  const block = `
    <div class="skeleton">
      <div class="sk-line ar"></div>
      <div class="sk-line"></div>
      <div class="sk-line short"></div>
    </div>`;
  return `<div class="read-sk" aria-hidden="true">${block.repeat(3)}</div>`;
};

// ═══════════════════════════════════════════════════════════════════════════
// THE SPLIT — preface LEFT, scripture RIGHT
// ═══════════════════════════════════════════════════════════════════════════
//
// A surah opens 50/50: Dorar's preface beside the text. Selecting either side slides the divider
// and gives that side the full width; the other collapses to a slim vertical rail that still shows
// its label and is still clickable. That rail is the whole reason the collapse is safe — a
// full-width state you cannot leave is a trap, and a reader who expands the preface must never
// have to go back through the index to reach the ayahs again.
//
// The motion is a flex-basis transition on the two columns, which is what makes the DIVIDER appear
// to slide: it has no width of its own to animate, it is simply the boundary the two bases meet
// at. Same 620ms/--ease the surah shelf uses, so the two reading surfaces move alike.

/** The three states of the split. `split` is where every surah opens. */
type Pane = "split" | "intro" | "text";

const PANE_LABEL: Readonly<Record<Exclude<Pane, "split">, string>> = {
  intro: "Pengantar Surah",
  text: "Teks Surah",
};

/** A preface-shaped wait: heading + prose, at Arabic measure. */
const introSkeletonEl = (): string => {
  const block = `
    <div class="skeleton">
      <div class="sk-line short"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
    </div>`;
  return `<div class="read-sk" aria-hidden="true">${block.repeat(2)}</div>`;
};

/**
 * Exported for the regression test, not for reuse.
 *
 * The load-bearing detail is that `#surah-body` IS the scrolling element (it carries `.sp-scroll`),
 * because `renderSurah` hands that same node to `startTracking` as the observer root. Nesting
 * `#surah-body` inside the scroller — an entirely reasonable-looking refactor — would hand the
 * observer a non-scrolling box and kill reading-position tracking with no error anywhere.
 */
export const splitEl = (cached: boolean): string => `
  <div class="surah-split" data-pane="split">
    <section class="sp-col sp-intro">
      <button class="sp-tab" type="button" data-pane-to="intro" aria-expanded="false">
        <span class="sp-tab-label">${PANE_LABEL.intro}</span>
      </button>
      <div class="sp-scroll" id="intro-body">${introSkeletonEl()}</div>
    </section>
    <div class="sp-divider" aria-hidden="true"></div>
    <section class="sp-col sp-text">
      <button class="sp-tab" type="button" data-pane-to="text" aria-expanded="false">
        <span class="sp-tab-label">${PANE_LABEL.text}</span>
      </button>
      <div class="sp-scroll" id="surah-body">${cached ? "" : skeletonEl()}</div>
    </section>
  </div>`;

/**
 * Wire the two tabs.
 *
 * Selecting a side expands it; selecting the SAME side again returns to 50/50. That second rule is
 * what makes the header double as the way back, so the expanded state has two exits (its own tab
 * and the opposite rail) rather than one.
 */
function bindSplit(root: HTMLElement): void {
  const split = root.querySelector<HTMLDivElement>(".surah-split");
  if (!split) return;

  const apply = (pane: Pane): void => {
    split.dataset["pane"] = pane;
    for (const t of split.querySelectorAll<HTMLButtonElement>(".sp-tab")) {
      t.setAttribute("aria-expanded", String(t.dataset["paneTo"] === pane));
    }
    if (pane !== "split") announce(`${PANE_LABEL[pane]} ditampilkan penuh.`);
    else announce("Tampilan terbagi dua.");
  };

  split.addEventListener("click", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>(".sp-tab");
    if (!tab) return;
    const to = tab.dataset["paneTo"];
    if (to !== "intro" && to !== "text") return;
    apply(split.dataset["pane"] === to ? "split" : to);
  });
}

/**
 * Fetch and render the preface into the left column.
 *
 * Deliberately independent of the shard load: a slow preface must never hold up the scripture, and
 * a preface that fails to load must never blank the surah. On failure the column says so and
 * offers a retry — the text side is untouched either way.
 */
async function hydrateIntro(root: HTMLElement, n: number, mine: number): Promise<void> {
  const slot = root.querySelector<HTMLDivElement>("#intro-body");
  if (!slot) return;
  try {
    const intro = await loadIntro(n);
    if (token !== mine || !slot.isConnected) return;
    slot.innerHTML = introEl(intro);
    bindIntroLang(slot, intro);
  } catch (err) {
    if (token !== mine || !slot.isConnected) return;
    const msg = err instanceof IntroError ? err.message : "Gagal memuat pengantar surah.";
    slot.innerHTML = oopsEl(msg, true);
    slot.querySelector<HTMLButtonElement>(".read-retry")?.addEventListener("click", () => {
      slot.innerHTML = introSkeletonEl();
      void hydrateIntro(root, n, mine);
    });
  }
}

/**
 * Never a blank mount. Every failure says what happened.
 *
 * `retry` is false for failures retrying cannot fix — surah 115 will not exist on the second
 * attempt, and a button that cannot work is a small lie of its own.
 */
const oopsEl = (msg: string, retry: boolean): string => `
  <div class="oops" role="alert">
    <p>${esc(msg)}</p>
    ${retry ? `<button class="act read-retry" type="button">Coba lagi</button>` : ""}
  </div>`;

/** Build one card and register it, so its copy/share buttons can find it later. Path B1: tafsir
 * loads lazily here (the full corpus, not chat's pre-loaded 55) — see tafsir.ts. */
const cardEl = (v: ShardVerse, n: number, name: string): string => {
  const card = { ...fromShard(v, n, name), lazyTafsir: true };
  onRead.set(card.ref, card);
  return verseEl(card);
};

/**
 * One surah, continuously.
 *
 * @param scrollToAyah  from `#/surah/18#10` — land on the ayah the user actually came for.
 */
export async function renderSurah(mount: HTMLElement, n: number, scrollToAyah?: number): Promise<void> {
  const mine = claim();
  onRead.clear();
  stopTracking(); // leaving wherever we were — no observer outlives its surah, even on the error paths below
  bindActs();

  const meta = surahMeta(n);
  if (!meta) {
    // Reachable by a hand-typed URL. The index is inlined, so we can say this offline and be
    // certain of it — and retrying will not conjure a 115th surah, so we do not offer to.
    const msg = `Surah ${n} tidak ada. Al-Qur'an punya 114 surah.`;
    mount.innerHTML = `
      <div class="surah-view">
        ${oopsEl(msg, false)}
        <div class="back-bottom">${backEl("")}</div>
      </div>`;
    say(msg);
    return;
  }

  mount.innerHTML = `
    <div class="surah-view">
      ${headEl(meta)}
      ${splitEl(isCached(n))}
      <div class="back-bottom">${backEl("")}</div>
    </div>`;

  bindSplit(mount);
  // The preface loads alongside the shard, never in front of it — see hydrateIntro.
  void hydrateIntro(mount, n, mine);

  const body = mount.querySelector<HTMLDivElement>("#surah-body");
  if (!body) return;

  let shard: Shard;
  try {
    shard = await loadSurah(n);
  } catch (err) {
    if (token !== mine) return; // the user has already navigated somewhere else
    // ShardError messages are written for humans, in Indonesian, and are more specific than
    // anything we could say here — a corrupt download and a dead connection are different facts.
    const msg =
      err instanceof ShardError
        ? err.message
        : `Gagal memuat ${displayName(meta.n)}. Koneksimu sepertinya sedang tidak stabil.`;

    body.innerHTML = oopsEl(msg, true);
    body.querySelector<HTMLButtonElement>(".read-retry")?.addEventListener("click", () => {
      void renderSurah(mount, n, scrollToAyah);
    });
    say(msg);
    return;
  }
  if (token !== mine) return;

  // ── the basmalah ──────────────────────────────────────────────────────────
  //
  // Unnumbered, above ayah 1 — it is the opening of the surah, not a verse of it. Except in
  // Al-Faatiha, where it IS ayah 1, and At-Tawbah, which has none at all. The shard's boolean
  // already encodes that ruling; we honour it rather than re-deriving it. And loadSurah has
  // already lifted the basmalah out of the verse text, so rendering it here cannot double it.
  const bismillah = shard.bismillah
    ? `<p class="bismillah" dir="rtl" lang="ar">${esc(BASMALAH)}</p>${GIRIH_DIVIDER}`
    : "";

  // If the reader came here FOR a specific ayah — tapped "Baca lanjutan" on 2:255, or opened a
  // link to Ayat al-Kursi — that ayah must exist in the DOM on the first paint. Chunking it in
  // twelve batches later means they arrive, see the wrong part of the surah, and wait several
  // seconds staring at Al-Baqarah's opening while the verse they asked for catches up.
  // Render through the target, then chunk the remainder as usual.
  const upTo = scrollToAyah !== undefined ? Math.max(FIRST, Math.min(scrollToAyah + 2, shard.verses.length)) : FIRST;

  const opening = shard.verses.slice(0, upTo);
  body.innerHTML = `${bismillah}<div class="verses" id="verses">${opening
    .map((v) => cardEl(v, n, displayName(n)))
    .join("")}</div>`;

  const verses = body.querySelector<HTMLDivElement>("#verses");
  if (!verses) return;

  // Start watching the scroll now that there are verses to watch, and hand it the opening batch.
  // `body` carries .sp-scroll, but that only SCROLLS at wide widths — see scrollBox.
  startTracking(n, scrollBox(body));
  observeVerses(verses.children);

  say(`${displayName(meta.n)} terbuka. ${meta.ayahs} ayat.`);

  // ── landing on the ayah the user came for ─────────────────────────────────
  let landed = false;
  const tryLand = (): void => {
    if (landed || scrollToAyah === undefined) return;
    const target = verses.querySelector(`.verse[data-ref="${n}:${scrollToAyah}"]`);
    if (!target) return; // not chunked in yet — try again after the next batch
    landed = true;
    target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    target.classList.add("landed");
    say(`Ayat ${n}:${scrollToAyah} ditampilkan.`);
  };
  tryLand();

  // ── the rest, while the phone is idle ─────────────────────────────────────
  if (shard.verses.length <= FIRST) return;

  let at = upTo;
  const step = (): void => {
    // Two guards, and both are real: the token catches a navigation, isConnected catches a
    // re-render that replaced this container while a chunk was still queued.
    if (token !== mine || !verses.isConnected) return;

    const batch = shard.verses.slice(at, at + CHUNK);
    at += batch.length;

    // Parse once per chunk into a fragment, then a single append — not innerHTML +=, which
    // would re-parse and re-create every ayah already on the page, every time.
    const tpl = document.createElement("template");
    tpl.innerHTML = batch.map((v) => cardEl(v, n, displayName(n))).join("");
    const added = Array.from(tpl.content.children); // element refs survive the move into `verses`
    verses.append(tpl.content);
    observeVerses(added);

    tryLand();

    if (at < shard.verses.length) {
      idle(step);
      return;
    }

    // Completeness backstop. The chain believes it is finished — prove it. If the DOM does not
    // hold every ayah of this surah, flush the remainder in one pass rather than let a reader
    // scroll to the end of a surah that quietly stopped short.
    const rendered = verses.querySelectorAll(".verse").length;
    if (rendered < shard.verses.length) {
      const rest = document.createElement("template");
      rest.innerHTML = shard.verses
        .slice(rendered)
        .map((v) => cardEl(v, n, displayName(n)))
        .join("");
      const restAdded = Array.from(rest.content.children);
      verses.append(rest.content);
      observeVerses(restAdded);
    }
  };
  idle(step);
}

// ═══════════════════════════════════════════════════════════════════════════
// COPY / SHARE ON THE READING SURFACE
// ═══════════════════════════════════════════════════════════════════════════
//
// verseEl() stamps every card with copy and share buttons. main.ts already delegates clicks on
// [data-act], but it resolves the card from ITS OWN map of chat verses — a ref rendered here is
// not in it, so it finds nothing and returns. Without this handler those two buttons would be
// on every ayah in the Qur'an and do nothing at all.
//
// This listener is scoped to #read and looks the ref up in onRead, so the two never contend:
// for a chat verse this one finds nothing and stops; for a reading verse main.ts finds nothing
// and stops. The egress contract still holds either way, because both go through share.ts —
// an interpretation cannot leave this app dressed as scripture.
let bound = false;

/** Idempotent — safe to call from any surface sharing #read (themes.ts included) without
 * risking a duplicate listener; only the FIRST call actually attaches anything. */
export function bindActs(): void {
  if (bound) return;
  bound = true;

  document.addEventListener("click", (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;

    const act = el.closest<HTMLButtonElement>("button[data-act]");
    if (!act || !act.closest("#read")) return;

    const kind = act.dataset["act"];
    if (kind !== "copy" && kind !== "share" && kind !== "image") return;

    const card = onRead.get(act.dataset["ref"] ?? "");
    if (!card) return;

    void carry(act, kind, card);
  });
}

/**
 * The word on the button, and only the word.
 *
 * verseEl() builds the button as `<span aria-hidden>⧉</span> Salin` — an icon span followed by
 * a bare text node. Writing the new label into the span (the obvious move, and the one the
 * `span:last-child` selector invites) leaves the original text node sitting there, so the
 * button reads "Tersalin Salin" — and on the restore it degrades further to "Salin Salin".
 * The label lives in the TEXT NODE. Swap that, leave the icon alone.
 */
const labelNode = (act: HTMLButtonElement): ChildNode | undefined =>
  Array.from(act.childNodes)
    .reverse()
    .find((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");

async function carry(act: HTMLButtonElement, kind: "copy" | "share" | "image", card: VerseCard): Promise<void> {
  const outcome =
    kind === "copy"
      ? ((await copyVerse(card)) ? "copied" : "failed")
      : kind === "share"
        ? await shareVerse(card)
        : await shareVerseImage(card);

  const label = labelNode(act);
  const original = act.dataset["label"] ?? label?.textContent?.trim() ?? "";
  act.dataset["label"] = original;

  act.classList.toggle("ok", outcome !== "failed");
  if (label) {
    label.textContent =
      outcome === "failed"
        ? kind === "image"
          ? " Gagal membuat kartu"
          : " Gagal menyalin"
        : outcome === "shared"
          ? " Dibagikan"
          : outcome === "downloaded"
            ? " Terunduh"
            : " Tersalin";
  }
  say(
    outcome === "failed"
      ? kind === "image"
        ? "Gagal membuat kartu gambar."
        : "Gagal menyalin ayat."
      : kind === "image"
        ? "Kartu gambar ayat siap."
        : "Ayat tersalin, lengkap dengan sumbernya.",
  );

  setTimeout(() => {
    act.classList.remove("ok");
    if (label) label.textContent = ` ${original}`;
  }, 1800);
}
