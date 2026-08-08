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
 * `rootMargin` pulls the root's bottom up to 25% of the viewport, so a verse "intersects" only while
 * it sits in the top band — i.e. the thing you are actually reading, not everything on screen. Among
 * the band, the topmost verse is simply the one with the smallest ayah number (verses render in
 * order), so we never touch geometry: keep a set of visible ayahs and save their minimum. saveBookmark
 * is debounced, so firing it on every intersection change is free.
 */
function startTracking(surah: number): void {
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
    { rootMargin: "0px 0px -75% 0px", threshold: 0 },
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
/** Centre (and thereby open) surah `n` in the wheel. Returns false if the index isn't mounted. */
export function gotoSurahInWheel(n: number): boolean {
  if (!wheelGoto) return false;
  wheelGoto(n);
  return true;
}

// `off` = signed distance from the opened centre card. It rides onto the <li> as a `--off` custom
// property (absolute distance) so shell.css can taper each neighbour smoothly toward a slim
// book-spine the further it sits from the middle — a shelf that opens at the centre (Erik).
const indexRow = (s: SurahMeta, open = false, off = 0): string => `
  <li data-off="${off}" style="--off:${Math.abs(off)}">
    <a class="srow${open ? " is-open" : ""}" href="#/surah/${s.n}" data-n="${s.n}" data-find="${esc(`${fold(displayName(s.n))} ${fold(s.tl)} ${fold(s.en)} ${s.n}`)}" aria-label="${esc(`${displayName(s.n)} — ${s.ayahs} ayat`)}">
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
      </header>

      ${history}

      <div class="baca-strip" role="group" aria-label="Pemutar surah — panah kiri/kanan untuk memutar">
        <button class="baca-arrow baca-prev" type="button" aria-label="Putar ke surah sebelumnya" title="Sebelumnya">‹</button>
        <ul class="surah-list" id="surah-list"></ul>
        <button class="baca-arrow baca-next" type="button" aria-label="Putar ke surah berikutnya" title="Berikutnya">›</button>
      </div>
    </div>`;

  const list = mount.querySelector<HTMLUListElement>("#surah-list");
  // If the list is missing the markup above changed underneath us. The rest is an enhancement over
  // an already-navigable page. Leave it be.
  if (!list) return;

  // ── The rotating wheel (Erik's spec) ───────────────────────────────────────
  // Not a linear strip but a CIRCULAR carousel: `centre` is the surah in the middle (opened), and
  // a fixed window of neighbours flanks it. The window wraps modulo 114, so left of Al-Fatihah (0)
  // sits An-Nas (113) and right of it Al-Baqarah (1); the arrows rotate the wheel either way forever.
  // We re-render the small visible window on each turn (≤9 nodes) rather than scroll 114 — that is
  // what makes the wrap seamless, which a scroll container cannot do.
  const N = SURAH_INDEX.length; // 114
  const WINDOW = 2; // neighbours shown each side of the centre
  let centre = 0; // Al-Fatihah opens in the middle

  // Fluid width morph (Erik): a turn must NOT rebuild the row. A fresh <li> has no previous width to
  // animate from, so innerHTML-replacement snaps. Instead we KEEP each card's DOM node across turns,
  // keyed by surah number, and only move its `--off`. Width, coverflow scale, and opacity are all pure
  // functions of `--off`, so tweening the NUMBER glides all three: the centre that slides out (off 0 →
  // 1) narrows while the neighbour sliding in (off 1 → 0) widens, and the flex row re-centres each
  // frame. We drive --off in JS (requestAnimationFrame) rather than a CSS `transition`, because a CSS
  // custom-property transition only interpolates the property on the element that DECLARES it — the
  // width lives on .srow while --off is inherited, so CSS transitions snapped. Setting the concrete
  // number each frame makes the browser recompute width from it directly, every frame, reliably.
  const nodes = new Map<number, HTMLLIElement>();
  const DUR = 560; // ms, matches the old transition feel
  const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3); // fast start, gentle settle
  const anims = new Map<HTMLLIElement, { from: number; to: number; start: number }>();
  let raf = 0;
  const applyOff = (li: HTMLLIElement, v: number): void => {
    li.dataset.offc = String(v); // current applied value — the start point for the next tween
    const s = String(v);
    li.style.setProperty("--off", s); // li: coverflow scale + opacity
    (li.firstElementChild as HTMLElement | null)?.style.setProperty("--off", s); // .srow: width
  };
  const tick = (now: number): void => {
    let alive = false;
    for (const [li, a] of anims) {
      const p = a.start >= now ? 0 : Math.min(1, (now - a.start) / DUR);
      applyOff(li, a.from + (a.to - a.from) * easeOut(p));
      if (p >= 1) anims.delete(li);
      else alive = true;
    }
    raf = alive ? requestAnimationFrame(tick) : 0;
  };
  // Move a card's --off toward `to`. `animate=false` snaps (fresh cards, first paint); otherwise it
  // tweens from wherever the card currently SITS (dataset.offc), so a turn interrupted mid-morph by a
  // fast second turn glides on from its live width instead of jumping — rapid spins stay smooth.
  const moveOff = (li: HTMLLIElement, to: number, animate: boolean): void => {
    const from = Number(li.dataset.offc ?? to);
    if (!animate || Math.abs(from - to) < 0.001) {
      anims.delete(li);
      applyOff(li, to);
      return;
    }
    anims.set(li, { from, to, start: performance.now() });
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const setOff = (li: HTMLLIElement, off: number, animate = true): void => {
    li.dataset.off = String(off);
    li.style.opacity = "";
    li.querySelector<HTMLElement>(".srow")?.classList.toggle("is-open", off === 0);
    moveOff(li, Math.abs(off), animate);
  };

  const renderWheel = (): void => {
    const want: { s: SurahMeta; off: number }[] = [];
    for (let off = -WINDOW; off <= WINDOW; off++) {
      const s = SURAH_INDEX[(centre + off + N) % N];
      if (s) want.push({ s, off });
    }
    const wanted = new Set(want.map((w) => w.s.n));

    // Cards that left the window taper to the spine and fade, then drop. Keep each on its exit side
    // (its last off sign) so a left-leaving card fades off the left edge, not popping to the right.
    const leftGhosts: HTMLLIElement[] = [];
    const rightGhosts: HTMLLIElement[] = [];
    for (const [n, li] of nodes) {
      if (wanted.has(n)) continue;
      nodes.delete(n);
      (Number(li.dataset.off ?? 0) < 0 ? leftGhosts : rightGhosts).push(li);
      // Tween --off well past the window: width floors at the spine, opacity (= 1 − off·0.12) fades to
      // 0, and scale shrinks — the card glides out on its own edge rather than popping. Then drop it.
      li.dataset.off = "9";
      moveOff(li, 9, true);
      setTimeout(() => li.remove(), DUR);
    }

    // Final left-to-right order: left ghosts, the live window, right ghosts. Reuse a surviving node
    // (tween its --off) or build one fresh (snap it to its resting --off; it eases in via qkrot).
    const ordered: HTMLLIElement[] = [...leftGhosts];
    for (const { s, off } of want) {
      let li = nodes.get(s.n);
      if (li) {
        setOff(li, off, true);
      } else {
        const tmp = document.createElement("div");
        tmp.innerHTML = indexRow(s, off === 0, off).trim();
        li = tmp.firstElementChild as HTMLLIElement;
        nodes.set(s.n, li);
        setOff(li, off, false); // snap fresh cards to their resting width (no tween on first paint)
      }
      ordered.push(li);
    }
    ordered.push(...rightGhosts);

    let prev: HTMLLIElement | null = null;
    for (const li of ordered) {
      if (prev) prev.after(li);
      else list.prepend(li);
      prev = li;
    }
  };

  let pending: ReturnType<typeof setTimeout> | undefined;
  const announceCentre = (): void => {
    if (pending !== undefined) clearTimeout(pending);
    pending = setTimeout(() => {
      const s = SURAH_INDEX[centre];
      if (s) say(`${displayName(s.n)} di tengah, surah ke-${s.n}.`);
    }, 250);
  };

  const rotate = (dir: number): void => {
    centre = (centre + dir + N) % N;
    renderWheel();
    announceCentre();
  };

  const prevBtn = mount.querySelector<HTMLButtonElement>(".baca-prev");
  const nextBtn = mount.querySelector<HTMLButtonElement>(".baca-next");
  prevBtn?.addEventListener("click", () => rotate(-1));
  nextBtn?.addEventListener("click", () => rotate(1));

  // Bind the external goto hook to THIS wheel — the "Cari Surah" search spins straight to a match.
  wheelGoto = (n: number): void => {
    const idx = SURAH_INDEX.findIndex((s) => s.n === n);
    if (idx < 0) return;
    centre = idx;
    renderWheel();
    announceCentre();
  };

  // Left/right arrow keys rotate the wheel when the strip (or an arrow) holds focus.
  mount.querySelector<HTMLElement>(".baca-strip")?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      rotate(-1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      rotate(1);
      e.preventDefault();
    }
  });

  renderWheel();
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
      <div class="surah-body" id="surah-body">${isCached(n) ? "" : skeletonEl()}</div>
      <div class="back-bottom">${backEl("")}</div>
    </div>`;

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
  startTracking(n);
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
