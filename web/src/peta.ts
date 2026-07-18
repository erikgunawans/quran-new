/**
 * Peta Tematik — browsing Ustadz Muhammad Thalib's Indeks Tematik.
 *
 * WHAT THIS IS. The Indeks Tematik is 13 categories / 42 subtopics / 2,451 entries / 2,633
 * citations, authored by Ustadz Muhammad Thalib's team and published at
 * quran.tarjamahtafsiriyah.com — the same scholar whose interpretive translation is the app's
 * primary. We display it here by explicit permission from Ustadz Ahmad Isrofiel Mardlatillah
 * (2026-07-17, Section F-1 of the scholar review package). Permission was to DISPLAY it. It was
 * not permission to correct it, reword it, or add to it — see `resolvable` below.
 *
 * WHY IT SITS BESIDE /tema AND DOES NOT REPLACE IT. The 12-theme / 55-verse lexicon in
 * `theme-index.ts` also feeds chat retrieval scoring; replacing it would touch the retrieval
 * path for a browsing win. Two doors, one of which is cheap. Erik's ruling.
 *
 * WHY THESE ARE ROWS, NOT VERSE CARDS. `themes.ts` renders full verse cards because it has 55
 * verses. "Perintah dan Larangan" alone has 626 entries — rendering cards would mean 626 shard
 * fetches, which is precisely the patchy-4G failure PRODUCT.md calls a product failure. So an
 * entry is what it is in the printed index: a sentence and a reference. The reference links to
 * the reading surface that already exists. Index-first; the verse text lives one tap away, in
 * the one place that renders scripture under the literal_companion guarantee.
 *
 * A CONSEQUENCE WORTH NAMING: because this surface renders no scripture at all, the
 * `literal_companion` invariant (an interpretive primary may never appear without the Kemenag
 * literal beside it) cannot be violated here — there is nothing to pair. That is not luck; it
 * is why linking out beats inlining.
 */
import { announce } from "./announce.ts";
import { legendHtml, mountCosmos, type Cosmos, type CosmosHandle } from "./peta-cosmos.ts";
import { bindActs, clearReadCards } from "./read.ts";
import { esc } from "./verse.ts";

/** One owner for the live region — see announce.ts. A private say() here would be the exact
 * race announce.ts exists to fix. */
const say = announce;

export interface PetaRef {
  readonly surah: number;
  readonly ayah: number;
  /** False for the four refs the published index cites that do not exist in the mushaf.
   * We do not link them, do not correct them, and do not delete the entry. See UNRESOLVED_NOTE. */
  readonly resolvable: boolean;
  /** Slugs of OTHER categories citing this same verse — the connective tissue. */
  readonly bridge: readonly string[];
}

export interface PetaEntry {
  /** Byte-identical to the published index. Never reworded. */
  readonly text: string;
  /** The original display reference, e.g. "QS. Al-Baqarah, 2:7". */
  readonly ref: string;
  readonly refs: readonly PetaRef[];
}

export interface PetaSubtopic {
  /** null for the 5 subtopics the source leaves unnamed — entries hang directly off the category. */
  readonly subtopic: string | null;
  readonly entries: readonly PetaEntry[];
}

export interface PetaCategoryMeta {
  readonly slug: string;
  readonly category: string;
  readonly entries: number;
  readonly subtopics: number;
}

export interface PetaIndex {
  readonly source: { readonly title: string; readonly author: string; readonly url: string };
  readonly totals: {
    readonly categories: number;
    readonly subtopics: number;
    readonly entries: number;
    readonly citations: number;
    readonly verses: number;
    readonly bridges: number;
    readonly unresolvable: number;
  };
  readonly categories: readonly PetaCategoryMeta[];
}

export interface PetaShard {
  readonly slug: string;
  readonly category: string;
  readonly subtopics: readonly PetaSubtopic[];
}

/** What a reader sees where a link would be, when the published index cites an ayah that is not
 * in the mushaf. Naming the gap is the honest move: we will not invent a destination, and we
 * will not quietly drop a scholar's line to keep our own surface tidy. */
const UNRESOLVED_NOTE = "rujukan ini tidak kami temukan dalam mushaf — sedang kami tanyakan";

/** Attribution. Rendered on EVERY Peta route, at body size, inside the reading flow.
 * PRODUCT.md principle: attribution is design, not fine print. Do not shrink this, do not
 * move it to a footer, do not make it `visually-hidden`. It is the reason we may show any of
 * this at all. */
const creditEl = (src: PetaIndex["source"]): string =>
  `<p class="peta-credit">${esc(src.title)} oleh <strong>${esc(src.author)}</strong> — <a href="${esc(src.url)}" rel="noopener noreferrer" target="_blank">quran.tarjamahtafsiriyah.com</a></p>`;

/** Separating HIS work from OURS.
 *
 * The entry sentences and the category/subtopic taxonomy are Ustadz Muhammad Thalib's. The verse
 * links and the "muncul di N tema" bridges are OUR editorial additions, computed by us. Both sit
 * on a page carrying his name, so a reader could reasonably credit our layer to him — and under
 * UU 28/2014 the author's integrity right makes that our problem to prevent, not his to tolerate.
 * Naming the seam costs one line. */
const derivativeNoteEl = (): string =>
  `<p class="peta-derivative">Penautan ayat dan keterangan “muncul di N tema” adalah tambahan kami untuk memudahkan penelusuran — bukan bagian dari indeks aslinya.</p>`;

const backEl = (): string =>
  `<a class="back back-top" href="#/peta"><span aria-hidden="true">←</span> Kembali ke Peta Tematik</a>`;

// index.json is 1.5 KB and never changes within a session; a category shard is up to ~104 KB.
// Both are cached so navigating peta → surah → peta costs nothing. Only successful fetches
// populate these, so a failed load never poisons a later one.
let indexCache: PetaIndex | undefined;
const shardCache = new Map<string, PetaShard>();

let cosmosCache: Cosmos | undefined;
/** The running animation. Held module-level so navigating away can stop the rAF loop — a
 * forgotten 60fps canvas loop is a battery bug the reader never sees and always pays for. */
let cosmosHandle: CosmosHandle | undefined;

/** Test-only. Module-level caches survive between tests in the same file, which silently turns
 * "did this route fetch?" assertions into no-ops. Exported so the tests can be honest rather
 * than ordered-just-so. Nothing in the app calls this. */
export function resetPetaCache(): void {
  indexCache = undefined;
  cosmosCache = undefined;
  cosmosHandle?.destroy();
  cosmosHandle = undefined;
  shardCache.clear();
}

/** The map's data: 46 KB of baked 3D coordinates. Fetched ONLY when the reader opts in.
 * The layout was solved at build time (src/app/build-peta-3d.ts) so no physics library ships. */
/**
 * Stop the animation.
 *
 * The canvas is destroyed by innerHTML the moment the reader routes away, but requestAnimationFrame
 * does NOT stop with it — the loop keeps running against a detached node, burning a phone battery
 * for a picture nobody is looking at. The router calls this on every navigation away from Peta.
 * Idempotent.
 */
export function destroyCosmos(): void {
  cosmosHandle?.destroy();
  cosmosHandle = undefined;
}

async function loadCosmos(): Promise<Cosmos> {
  if (cosmosCache) return cosmosCache;
  const res = await fetch("/peta/cosmos.json");
  if (!res.ok) throw new Error(`Gagal memuat peta (${res.status}).`);
  cosmosCache = (await res.json()) as Cosmos;
  return cosmosCache;
}

async function loadIndex(): Promise<PetaIndex> {
  if (indexCache) return indexCache;
  const res = await fetch("/peta/index.json");
  if (!res.ok) throw new Error(`Gagal memuat Peta Tematik (${res.status}).`);
  indexCache = (await res.json()) as PetaIndex;
  return indexCache;
}

async function loadCategory(slug: string): Promise<PetaShard> {
  const hit = shardCache.get(slug);
  if (hit) return hit;
  const res = await fetch(`/peta/${encodeURIComponent(slug)}.json`);
  if (!res.ok) throw new Error(`Gagal memuat kategori ini (${res.status}).`);
  const shard = (await res.json()) as PetaShard;
  shardCache.set(slug, shard);
  return shard;
}

const oops = (msg: string, back: boolean): string =>
  `<div class="surah-view">
    <div class="oops" role="alert"><p>${esc(msg)}</p></div>
    ${back ? `<div class="back-bottom">${backEl()}</div>` : ""}
  </div>`;

/** One entry's reference: a link when the ayah exists, an honest note when it does not. */
function refEl(entry: PetaEntry): string {
  const parts = entry.refs.map((r) => {
    if (!r.resolvable) {
      // No `title` here: the note is already visible text, and a title duplicating it makes a
      // screen reader announce the same sentence twice.
      return `<span class="peta-ref peta-ref-unresolved">${esc(r.surah + ":" + r.ayah)}<span class="peta-unresolved-note"> — ${esc(UNRESOLVED_NOTE)}</span></span>`;
    }
    return `<a class="peta-ref" href="#/surah/${r.surah}#${r.ayah}">${esc(r.surah + ":" + r.ayah)}</a>`;
  });
  return parts.join(" · ");
}

/** "Muncul di N tema" — the bridge. Derived from the emitted data, never hardcoded. */
function bridgeEl(entry: PetaEntry, index: PetaIndex): string {
  const slugs = new Set<string>();
  for (const r of entry.refs) for (const b of r.bridge) slugs.add(b);
  if (slugs.size === 0) return "";
  const names = [...slugs].map((s) => {
    const meta = index.categories.find((c) => c.slug === s);
    return meta ? `<a class="peta-bridge-link" href="#/peta/${esc(s)}">${esc(meta.category)}</a>` : "";
  }).filter(Boolean);
  if (names.length === 0) return "";
  // +1 — the category the reader is currently looking at also holds this verse.
  return `<p class="peta-bridge">Ayat ini muncul di ${slugs.size + 1} tema: ${names.join(", ")}</p>`;
}

/** The 13 categories. Fetches index.json ONLY — no category shard is touched here. */
export async function renderPetaIndex(mount: HTMLElement): Promise<void> {
  bindActs();
  clearReadCards();
  destroyCosmos();

  let index: PetaIndex;
  try {
    index = await loadIndex();
  } catch (err) {
    mount.innerHTML = oops(err instanceof Error ? err.message : "Gagal memuat Peta Tematik.", false);
    say("Peta Tematik gagal dimuat.");
    return;
  }

  const t = index.totals;
  mount.innerHTML = `
    <div class="read-index peta-index">
      <header class="read-intro">
        <h1>Peta Tematik</h1>
        <p>Seluruh Qur'an dipetakan lewat topik: ${t.categories} kategori, ${t.entries.toLocaleString("id-ID")} entri, menunjuk ke ${t.verses.toLocaleString("id-ID")} ayat. Telusuri kategori, lalu subtopik, sampai ke ayatnya. Kalau ingin mulai dari perasaan, bukan topik, buka <b>Tema</b>.</p>
        ${creditEl(index.source)}
        ${derivativeNoteEl()}
      </header>

      <div class="peta-map-wrap">
        <button class="peta-map-toggle" type="button" aria-expanded="false" aria-controls="peta-map-slot">
          Lihat peta tematik 3D
          <span class="peta-map-hint">${t.verses.toLocaleString("id-ID")} ayat, ${t.bridges.toLocaleString("id-ID")} di antaranya menghubungkan lebih dari satu tema</span>
        </button>
        <div id="peta-map-slot" class="peta-map-slot" hidden></div>
      </div>

      <ul class="theme-list peta-list">
        ${index.categories.map((c) => `
          <li>
            <a class="trow" href="#/peta/${esc(c.slug)}">
              <span class="trow-name">${esc(c.category)}</span>
              <span class="trow-count">${c.entries.toLocaleString("id-ID")} entri</span>
            </a>
          </li>`).join("")}
      </ul>
    </div>`;

  bindMapToggle(mount);
  say(`Peta Tematik — ${t.categories} kategori tersedia.`);
}

/**
 * The opt-in map. Nothing is fetched or drawn until the reader asks.
 *
 * `[hidden]` alone is not enough here — an author `display` rule out-argues it, which this
 * codebase has already been bitten by (read.css:122, and the band shipping painted-empty). The
 * slot is styled with `display:none` on `[hidden]` explicitly in read.css.
 */
function bindMapToggle(mount: HTMLElement): void {
  const btn = mount.querySelector<HTMLButtonElement>(".peta-map-toggle");
  const slot = mount.querySelector<HTMLDivElement>("#peta-map-slot");
  if (!btn || !slot) return;

  let loaded = false;

  btn.addEventListener("click", async () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    if (open) {
      btn.setAttribute("aria-expanded", "false");
      slot.hidden = true;
      say("Peta ditutup.");
      return;
    }

    btn.setAttribute("aria-expanded", "true");
    slot.hidden = false;

    if (loaded) return;
    slot.innerHTML = `<p class="peta-map-loading">Memuat peta…</p>`;
    try {
      // 46 KB, fetched here and nowhere else. A reader who never opens the map pays nothing —
      // which is the only reason a 3D star field belongs in an app built for patchy 4G.
      const cosmos = await loadCosmos();
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
      cosmosHandle = mountCosmos(canvas, cosmos, (surah, ayah) => {
        // A star IS a verse. Clicking one goes to the reading surface that already exists,
        // under the literal_companion guarantee — the cosmos never renders scripture itself.
        location.hash = `#/surah/${surah}#${ayah}`;
      });

      slot.querySelector<HTMLInputElement>(".pc-auto")?.addEventListener("change", (e) => {
        cosmosHandle?.setAutoRotate((e.target as HTMLInputElement).checked);
      });
      slot.querySelector<HTMLInputElement>(".pc-bridges")?.addEventListener("change", (e) => {
        cosmosHandle?.setBridgesOnly((e.target as HTMLInputElement).checked);
      });

      loaded = true;
      say(`Peta 3D dimuat — ${cosmos.meta.verses} ayat, ${cosmos.meta.cats} tema.`);
    } catch (err) {
      slot.innerHTML = `<div class="oops" role="alert"><p>${esc(err instanceof Error ? err.message : "Gagal memuat peta.")}</p></div>`;
      say("Peta gagal dimuat.");
    }
  });
}

/** One category: its subtopics and entries. Lazily fetched — this is the only route that
 * pays for a category shard. */
export async function renderPetaCategory(mount: HTMLElement, slug: string): Promise<void> {
  bindActs();
  clearReadCards();
  destroyCosmos();

  let index: PetaIndex;
  let shard: PetaShard;
  try {
    index = await loadIndex();
    shard = await loadCategory(slug);
  } catch {
    mount.innerHTML = oops("Kategori itu tidak ada.", true);
    say("Kategori tidak ditemukan.");
    return;
  }

  const count = shard.subtopics.reduce((n, s) => n + s.entries.length, 0);

  mount.innerHTML = `
    <div class="surah-view peta-view">
      <header class="surah-head">
        ${backEl()}
        <div class="surah-title">
          <p class="surah-tl">${esc(shard.category)}</p>
          <p class="surah-meta">${count.toLocaleString("id-ID")} entri</p>
        </div>
        ${creditEl(index.source)}
        ${derivativeNoteEl()}
      </header>

      ${shard.subtopics.map((st) => `
        <section class="peta-sub">
          ${st.subtopic ? `<h2 class="peta-sub-name">${esc(st.subtopic)}</h2>` : ""}
          <ul class="peta-entries">
            ${st.entries.map((e) => `
              <li class="peta-entry">
                <p class="peta-text">${esc(e.text)}</p>
                <p class="peta-refs">${refEl(e)}</p>
                ${bridgeEl(e, index)}
              </li>`).join("")}
          </ul>
        </section>`).join("")}

      <div class="back-bottom">${backEl()}</div>
    </div>`;

  say(`${esc(shard.category)} — ${count} entri dimuat.`);
}
