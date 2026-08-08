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
import { esc } from "./esc.ts";
import {
  loadCategory,
  loadIndex,
  resetPetaDataCache,
  type PetaCategoryMeta,
  type PetaEntry,
  type PetaIndex,
  type PetaRef,
  type PetaShard,
  type PetaSubtopic,
} from "./peta-data.ts";
export {
  loadCategory,
  loadIndex,
  type PetaCategoryMeta,
  type PetaEntry,
  type PetaIndex,
  type PetaRef,
  type PetaShard,
  type PetaSubtopic,
};


/** One owner for the live region — see announce.ts. A private say() here would be the exact
 * race announce.ts exists to fix. */
const say = announce;


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
  `<a class="back back-top" href="#/peta"><span aria-hidden="true">←</span> Kembali ke Tematik</a>`;

// index.json is 1.5 KB and never changes within a session; a category shard is up to ~104 KB.
// Both are cached so navigating peta → surah → peta costs nothing. Only successful fetches
// populate these, so a failed load never poisons a later one.

let cosmosCache: Cosmos | undefined;
/** The running animation. Held module-level so navigating away can stop the rAF loop — a
 * forgotten 60fps canvas loop is a battery bug the reader never sees and always pays for. */
let cosmosHandle: CosmosHandle | undefined;

/** Test-only. Module-level caches survive between tests in the same file, which silently turns
 * "did this route fetch?" assertions into no-ops. Exported so the tests can be honest rather
 * than ordered-just-so. Nothing in the app calls this. */
export function resetPetaCache(): void {
  resetPetaDataCache();
  cosmosCache = undefined;
  cosmosHandle?.destroy();
  cosmosHandle = undefined;
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

/**
 * Arabic calligraphy per category — the labels shown on the design's Tematik cards, keyed by slug.
 * These are DECORATIVE theme titles (standard Arabic nouns, not Qur'anic verse text), transcribed
 * from the claude.ai/design mockup at Erik's direction. Flagged for Ustadz Ahmad's spot-check; not
 * spliced from the corpus, so no byte-exact contract applies here.
 */
const TEMATIK_AR: Record<string, string> = {
  "allah-subhanahu-wa-ta-ala": "الله",
  "muhammad-shallallahu-alaihi-wasallam": "محمد",
  "al-qur-an-taurat-injil-dan-zabur": "الكتب",
  ibadah: "العبادة",
  "perintah-dan-larangan": "الأمر والنهي",
  "hijrah-jihad-dan-perang": "الجهاد",
  "rahasia-kejiwaan-manusia-dalam-al-qur-an": "النفس",
  "prinsip-prinsip-pendidikan-islam": "التربية",
  keluarga: "الأسرة",
  sosial: "المجتمع",
  "ekonomi-islam": "الاقتصاد",
  "membangun-pribadi-shalih": "الصلاح",
  "karakteristik-negara-bersyari-ah": "الدولة",
};


/**
 * Size the card wall so its heights stay proportional to ayah count AND the whole thing fits one
 * viewport with nothing to scroll.
 *
 * The prototype's proportions are `148 + n*0.52` px, which totals ~3,200px across the 13 themes.
 * That is roughly six times taller than the space between the header and the docked composer, so
 * the shape is kept and the magnitude is scaled: every card is multiplied by one factor chosen so
 * the total lands just inside `columns x columnHeight`. One factor for all of them is what keeps
 * the comparison honest — "Perintah dan Larangan" stays exactly 626/38 times taller than "Sosial".
 *
 * Measured from the live box rather than assumed, and re-run on resize, because the column count is
 * a media query and the height is a dvh clamp: hard-coding a factor would fit my window and no one
 * else's. MIN_H keeps the smallest theme tall enough for two lines of title plus its count.
 */
const MIN_H = 104;

export function fitTematik(): void {
  const grid = document.getElementById("tematik-grid");
  if (!grid || grid.hidden) return;
  const cards = [...grid.querySelectorAll<HTMLAnchorElement>(".tema-card")];
  if (!cards.length) return;

  const cs = getComputedStyle(grid);
  const cols = Number.parseInt(cs.columnCount, 10);
  const box = grid.getBoundingClientRect().height;
  // Below the breakpoint the wall scrolls with the page; heights go back to the CSS default.
  if (!Number.isFinite(cols) || cols < 1 || box < 40) {
    for (const c of cards) c.style.removeProperty("--tema-h");
    return;
  }

  const gap = 14; // matches the margin-bottom in shell.css
  const raw = cards.map((c) => 148 + Number(c.dataset["n"] ?? 0) * 0.52);
  const budget = cols * box - cards.length * gap;
  const total = raw.reduce((a, b) => a + b, 0);
  let scale = Math.min(1, budget / total);

  const apply = (k: number): void => {
    for (const [i, c] of cards.entries()) {
      c.style.setProperty("--tema-h", `${Math.max(MIN_H, Math.round(raw[i]! * k))}px`);
    }
  };

  /**
   * Then shrink until it actually fits, because the arithmetic above is optimistic.
   *
   * `break-inside: avoid` means a column ends as soon as the next card would not fit whole, so real
   * packing always wastes some of `cols x height`. Assuming perfect packing cost "Karakteristik
   * Negara Bersyari'ah" its place — it spilled into a sixth column and `overflow: hidden` ate it, so
   * the wall silently showed 12 of 13 themes. A dropped theme is not a layout blemish; it is the
   * page lying about the index.
   *
   * Overflow is detectable: extra columns widen the box, so `scrollWidth > clientWidth` means at
   * least one card did not make it. Shrink 6% and re-measure, up to a floor.
   */
  apply(scale);
  for (let i = 0; i < 10 && grid.scrollWidth > grid.clientWidth + 1 && scale > 0.2; i++) {
    scale *= 0.94;
    apply(scale);
  }
}

let fitBound = false;
/** One listener for the lifetime of the tab; fitTematik no-ops when the wall is not on screen. */
function bindFit(): void {
  if (fitBound) return;
  fitBound = true;
  addEventListener("resize", () => fitTematik());
}

/**
 * "Cari Tema" — on this route the docked box is a FINDER, the same contract the Al-Qur'an surface
 * gives it, never the companion prompt.
 *
 * It filters instead of calling a model, and that difference from `searchBaca` is deliberate: there
 * are 114 surahs and a reader may describe one by feeling, so that search earns a semantic
 * round-trip. There are THIRTEEN categories, all on screen at once — a network call to choose among
 * thirteen visible things would be slower and less certain than showing which ones match as you
 * type. Matches the Indonesian name, the Arabic name, and the slug.
 */
export function filterTema(q: string): number {
  const grid = document.getElementById("tematik-grid");
  if (!grid) return 0;
  const needle = q.trim().toLowerCase();
  let shown = 0;
  for (const card of grid.querySelectorAll<HTMLAnchorElement>(".tema-card")) {
    const hit = !needle || (card.dataset["find"] ?? "").includes(needle);
    card.hidden = !hit;
    if (hit) shown++;
  }
  grid.classList.toggle("is-filtered", Boolean(needle));
  return shown;
}

/** The href of the only matching card, or null when the filter is not down to exactly one. */
export function soleTemaHref(): string | null {
  const grid = document.getElementById("tematik-grid");
  if (!grid) return null;
  const vis = [...grid.querySelectorAll<HTMLAnchorElement>(".tema-card")].filter((c) => !c.hidden);
  return vis.length === 1 ? vis[0]!.getAttribute("href") : null;
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
    <div class="read-index tematik-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Tematik</h1>
          <p class="tematik-sub">Tiga belas tema besar Al-Qur'an, dengan jumlah ayat yang menyinggungnya.</p>
        </div>
        <div class="tematik-head-r">
          <button class="tematik-vbtn tematik-cards-toggle is-active" type="button" aria-pressed="true">Kartu</button>
          <button class="tematik-vbtn peta-map-toggle" type="button" aria-expanded="false" aria-controls="peta-map-slot">Peta Tematik</button>
          <a class="tematik-back" href="#/">Kembali</a>
        </div>
      </header>

      <div id="peta-map-slot" class="peta-map-slot" hidden></div>

      <div class="tematik-grid" id="tematik-grid">
        ${index.categories
          .map(
            (c) => `
          <a class="tema-card" href="#/peta/${esc(c.slug)}" data-n="${c.entries}" data-find="${esc((c.category + " " + (TEMATIK_AR[c.slug] ?? "") + " " + c.slug).toLowerCase())}">
            <span class="tema-girih" aria-hidden="true"></span>
            <span class="tema-ar" dir="rtl" lang="ar">${esc(TEMATIK_AR[c.slug] ?? "")}</span>
            <span class="tema-body">
              <span class="tema-name">${esc(c.category)}</span>
              <span class="tema-count">${c.entries.toLocaleString("id-ID")} ayat</span>
            </span>
          </a>`,
          )
          .join("")}
      </div>
      ${creditEl(index.source)}
      ${derivativeNoteEl()}
    </div>`;

  bindMapToggle(mount);
  bindFit();
  fitTematik();
  say(`Tematik — ${t.categories} tema tersedia.`);
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
  const cardsBtn = mount.querySelector<HTMLButtonElement>(".tematik-cards-toggle");
  const slot = mount.querySelector<HTMLDivElement>("#peta-map-slot");
  const grid = mount.querySelector<HTMLDivElement>("#tematik-grid");
  if (!btn || !slot) return;

  let loaded = false;

  /**
   * Kartu and Peta Tematik are two VIEWS of the same 13 categories, not two panels that stack.
   * Showing both meant scrolling past a 3D canvas to reach the cards, and left "Kartu" lit while
   * the map was open — the control lied about the state. Exactly one is visible (Erik, 2026-08-08).
   */
  const show = (view: "cards" | "map"): void => {
    const map = view === "map";
    slot.hidden = !map;
    if (grid) grid.hidden = map;
    btn.setAttribute("aria-expanded", String(map));
    btn.classList.toggle("is-active", map);
    cardsBtn?.classList.toggle("is-active", !map);
    cardsBtn?.setAttribute("aria-pressed", String(!map));
  };

  cardsBtn?.addEventListener("click", () => {
    if (slot.hidden) return; // cards are already the visible view
    show("cards");
    fitTematik(); // the wall had no measurable box while it was display:none
    say("Tampilan kartu.");
  });

  btn.addEventListener("click", async () => {
    if (btn.getAttribute("aria-expanded") === "true") return; // map is already the visible view
    show("map");

    if (loaded) return;
    slot.innerHTML = `<p class="peta-map-loading">Memuat peta…</p>`;
    try {
      // 46 KB, fetched here and nowhere else. A reader who never opens the map pays nothing —
      // which is the only reason a 3D star field belongs in an app built for patchy 4G.
      const cosmos = await loadCosmos();
      const m = cosmos.meta;
      const src = cosmos.source;
      const n = (v: number) => v.toLocaleString("id-ID");
      // Two columns: the transparent star-cloud on the LEFT, one info rail on the RIGHT holding
      // every fact about the graph — head/meta, the detail hint, the legend, its two toggles, and
      // the attribution. Mirrors the reference (Peta Tematik — Transparent/Light) adapted onto the
      // app's own tokens so it reads on both the light and dark transparent page.
      slot.innerHTML = `
        <div class="pc-shell">
          <div class="pc-frame">
            <canvas class="pc-canvas" aria-label="Peta tematik 3D: ${m.verses} ayat mengelilingi ${m.cats} kategori. Seret untuk memutar, gulir untuk memperbesar, klik bintang untuk membuka ayat."></canvas>
            <p class="pc-help">seret untuk memutar · gulir untuk zoom · klik bintang untuk membuka ayat</p>
          </div>
          <aside class="pc-rail" aria-label="Informasi peta tematik">
            <section class="pc-card pc-head">
              <h2 class="pc-title">Peta Tematik Al-Qur'an</h2>
              <p class="pc-source">${esc(src.title)} · ${esc(src.author)}</p>
              <div class="pc-stats">
                <span><b>${n(m.cats)}</b> kategori</span>
                <span><b>${n(m.entries)}</b> topik</span>
                <span><b>${n(m.verses)}</b> ayat</span>
                <span><b>${n(m.bridges)}</b> ayat penghubung</span>
              </div>
            </section>

            <section class="pc-card pc-detail">
              <p class="pc-detail-hint">Klik bintang di peta untuk membuka ayatnya di layar baca.</p>
            </section>

            <section class="pc-card pc-legend-card">
              <div class="pc-legend-h"><span>Kategori</span></div>
              ${legendHtml(cosmos)}
              <div class="pc-foot">
                <label class="pc-check"><input type="checkbox" class="pc-auto" checked> Putar otomatis</label>
                <label class="pc-check"><input type="checkbox" class="pc-bridges"> Hanya ayat penghubung</label>
              </div>
            </section>

            <p class="pc-card pc-cred">${esc(src.title)} oleh <strong>${esc(src.author)}</strong> — <a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">quran.tarjamahtafsiriyah.com</a>. Posisi 3D, pengelompokan, dan geometri penghubung adalah tambahan kami.</p>
          </aside>
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
