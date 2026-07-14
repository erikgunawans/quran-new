/**
 * The tafsir stack — rendering, the lens (issue 06), and LAZY loading (Path B1).
 *
 * Moved out of main.ts once a third surface needed it: chat already had `tafsir` pre-loaded per
 * verse (from `corpus.json`, only the 55 curated verses). The reading surface and theme browser
 * cover the FULL 6,236-ayah corpus, where tafsir is NOT pre-loaded — it lives in
 * `web/public/tafsir/{surah}/{ayah}.json` (Path B1: `-[:EXPLAINS]->` edges, built by
 * `bun run app:graph` from `data/canonical/tafsir-passages.json`, gitignored like corpus.json —
 * 105 MB across 6,236 files is a regenerable build artifact, not something to commit).
 *
 * LAZY is the point. Eagerly fetching every verse's tafsir on a surah page (up to 286 ayahs)
 * would mean up to 286 extra requests on load — the same reader's-bandwidth violation the audio
 * per-surah mistake was. Tafsir loads only when a reader actually opens the disclosure for that
 * specific verse, via a `toggle`-event listener on `<details data-lazy-tafsir>`.
 */
import type { Voice } from "./retrieve.ts";

export interface TafsirPassage {
  source_id: string;
  text: string;
  lang: string;
}

// ── the lens (issue 06) ─────────────────────────────────────────────────────────
//
// Four scholars, none ranked above another (ISA.md § Principles: "Plurality is warmth, not
// hedging"). A LENS is not a ranking — it is a reader-chosen VIEWING ORDER over voices that all
// remain fully present and attributed. It must never become a filter that hides one, and never
// silently default to anything but "as shipped" until the reader opts in themselves.
export type TafsirLens = "all" | "classical" | "contemporary";
const LENS_KEY = "nur:lens";

export function getLens(): TafsirLens {
  const v = localStorage.getItem(LENS_KEY);
  return v === "classical" || v === "contemporary" ? v : "all";
}

/** Chronology only, derived from the `era` string already shipped with every source — never
 * conflated with `authority_tier`, which answers a different question (doctrinal weight). */
function eraRank(era: string): number {
  if (era.startsWith("Classical")) return 0;
  if (era.startsWith("Modern")) return 1;
  return 2; // Contemporary, or unlabelled — treated as newest
}

function lensControl(lens: TafsirLens): string {
  const opt = (value: TafsirLens, label: string) =>
    `<button type="button" data-lens="${value}" aria-pressed="${lens === value}">${label}</button>`;
  return `<div class="lens" role="group" aria-label="Urutan tampilan tafsir">
            ${opt("all", "Semua")}
            ${opt("classical", "Klasik dulu")}
            ${opt("contemporary", "Kontemporer dulu")}
          </div>`;
}

/**
 * Re-order every tafsir stack ALREADY on screen. This never removes or hides a scholar — it
 * moves existing `.scholar` nodes within their own `.sources` block, so attribution, tier
 * labels, and the foreign-language note travel with them unchanged. Does NOT touch storage —
 * see `applyLens` for the reader-initiated action that does. Queries the LIVE DOM, so it picks
 * up lazily-loaded stacks that didn't exist yet at the last call, with no extra wiring.
 */
export function sortStacks(lens: TafsirLens): void {
  for (const stack of document.querySelectorAll<HTMLElement>(".sources")) {
    const scholars = Array.from(stack.querySelectorAll<HTMLElement>(".scholar"));
    const sorted = [...scholars].sort((a, b) => {
      if (lens === "all") return Number(a.dataset["order"]) - Number(b.dataset["order"]);
      const ra = Number(a.dataset["eraRank"]);
      const rb = Number(b.dataset["eraRank"]);
      return lens === "classical" ? ra - rb : rb - ra;
    });
    for (const el of sorted) stack.append(el);
    for (const btn of stack.querySelectorAll<HTMLButtonElement>("[data-lens]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset["lens"] === lens));
    }
  }
}

/** The reader explicitly chose a lens — persist it (same pattern as `nur:theme`/`nur:ar`, which
 * only write on an explicit click, never on boot) and re-sort what's on screen now. */
export function applyLens(lens: TafsirLens): void {
  localStorage.setItem(LENS_KEY, lens);
  sortStacks(lens);
}

// ── rendering ────────────────────────────────────────────────────────────────

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The inner content of a `.sources` block — lens control + scholar stack, or honest silence if
 * there's nothing. Shared between the EAGER path (tafsirEl, chat's pre-loaded 55 verses) and the
 * LAZY path (the slot a `toggle` listener fills in after fetching). */
export function tafsirStackHtml(tafsir: TafsirPassage[], voices: Map<string, Voice>): string {
  if (!tafsir.length) {
    return `<div class="silence">Belum ada tafsir terverifikasi untuk ayat ini di korpus kami. Kami memilih diam daripada mengarang.</div>`;
  }

  const lens = getLens();
  // `order` is the ORIGINAL (as-shipped) position — kept as a data attribute so "Semua" can
  // restore it later without needing the source array again.
  const withRank = tafsir.map((t, order) => ({ t, order, rank: eraRank(voices.get(t.source_id)?.era ?? "") }));
  const ordered =
    lens === "all"
      ? withRank
      : [...withRank].sort((a, b) => (lens === "classical" ? a.rank - b.rank : b.rank - a.rank));

  const stack = ordered
    .map(({ t, order, rank }) => {
      const src = voices.get(t.source_id);
      // An English tafsir shown to an Indonesian reader is the exact wound this product exists
      // to heal. It may still appear — dropping a scholar is worse than showing him — but it is
      // labelled, so nobody is left thinking the fault is theirs for not understanding it.
      const foreign = t.lang !== "id";
      return `
        <div class="scholar${foreign ? " foreign" : ""}" data-order="${order}" data-era-rank="${rank}">
          <div class="who">
            <span class="by"><b>${esc(src?.author ?? t.source_id)}</b></span>
            <span class="tier">${esc(src?.era ?? "")} · tier ${src?.authority_tier ?? "?"}</span>
            ${foreign ? `<span class="lang-warn">teks bahasa Inggris — belum ada terjemahannya</span>` : ""}
          </div>
          <p class="txt"${foreign ? ' lang="en"' : ""}>${esc(t.text)}</p>
        </div>`;
    })
    .join("");

  return `${lensControl(lens)}${stack}`;
}

/** EAGER: tafsir already known (chat's 55 curated verses, from corpus.json). */
export function tafsirEl(tafsir: TafsirPassage[], voices: Map<string, Voice>): string {
  if (!tafsir.length) return tafsirStackHtml(tafsir, voices);
  return `<details class="sources">
            <summary>Lihat ${tafsir.length} ulama membahas ayat ini</summary>
            ${tafsirStackHtml(tafsir, voices)}
          </details>`;
}

/** LAZY: tafsir NOT yet known — renders the disclosure immediately (so a reader can always try),
 * fetches only when actually opened. Covers the full corpus, not just the curated 55. */
export function lazyTafsirEl(surah: number, ayah: number): string {
  return `<details class="sources" data-lazy-tafsir data-surah="${surah}" data-ayah="${ayah}">
    <summary>Lihat ulama yang membahas ayat ini</summary>
    <div class="tafsir-slot"></div>
  </details>`;
}

// ── fetching (Path B1 shards) ────────────────────────────────────────────────

const tafsirCache = new Map<string, TafsirPassage[]>();
let sourcesPromise: Promise<Map<string, Voice>> | null = null;

/** Fetched once, reused by every lazy load on the page. */
function loadTafsirSources(): Promise<Map<string, Voice>> {
  if (!sourcesPromise) {
    sourcesPromise = fetch("/tafsir/sources.json").then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = (await res.json()) as Voice[];
      return new Map(list.map((v) => [v.id, v]));
    });
  }
  return sourcesPromise;
}

/** A 404 here is a REAL, honest possibility — a handful of ayahs are silent in one source or
 * another (e.g. As-Sa'di on 72:11) — so it resolves to `[]`, not a thrown error. A network
 * failure (not 404) still throws, so the caller can show a real retry, not a false silence. */
async function loadTafsir(surah: number, ayah: number): Promise<TafsirPassage[]> {
  const key = `${surah}:${ayah}`;
  const cached = tafsirCache.get(key);
  if (cached) return cached;

  const res = await fetch(`/tafsir/${surah}/${ayah}.json`);
  if (res.status === 404) {
    tafsirCache.set(key, []);
    return [];
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as TafsirPassage[];
  tafsirCache.set(key, data);
  return data;
}

async function loadAndRenderTafsir(details: HTMLDetailsElement): Promise<void> {
  const slot = details.querySelector<HTMLDivElement>(".tafsir-slot");
  if (!slot) return;
  const surah = Number(details.dataset["surah"]);
  const ayah = Number(details.dataset["ayah"]);

  slot.innerHTML = `<p class="tafsir-loading">Memuat…</p>`;
  try {
    const [tafsir, voices] = await Promise.all([loadTafsir(surah, ayah), loadTafsirSources()]);
    slot.innerHTML = tafsirStackHtml(tafsir, voices);
    details.dataset["loaded"] = "true";
  } catch {
    slot.innerHTML = `<div class="oops" role="alert">
      <p>Gagal memuat tafsir. Koneksimu sepertinya sedang tidak stabil.</p>
      <button class="act retry-tafsir" type="button">Coba lagi</button>
    </div>`;
    details.dataset["loaded"] = "false";
  }
}

let bound = false;

/** Idempotent. Wires the `toggle`-triggered fetch and its retry button — call once, from
 * anywhere, before any `lazyTafsirEl()` output can appear on the page. */
export function bindLazyTafsir(): void {
  if (bound) return;
  bound = true;

  // `toggle` doesn't reliably bubble across engines — capture phase always fires regardless.
  document.addEventListener(
    "toggle",
    (e) => {
      const details = e.target;
      if (!(details instanceof HTMLDetailsElement) || !details.hasAttribute("data-lazy-tafsir")) return;
      if (!details.open || details.dataset["loaded"] === "true") return;
      void loadAndRenderTafsir(details);
    },
    true,
  );

  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".retry-tafsir");
    if (!btn) return;
    const details = btn.closest<HTMLDetailsElement>("[data-lazy-tafsir]");
    if (details) void loadAndRenderTafsir(details);
  });
}
