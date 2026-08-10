/**
 * Hadis & Fikih browse sections.
 *
 * HADIS is live (Arabic-only): it browses the Ṣaḥīḥayn corpus built by src/app/build-hadith.ts —
 * Ṣaḥīḥ al-Bukhārī + Ṣaḥīḥ Muslim, canonical public-domain Arabic with source + grade, sharded by
 * kitab. The English translation in the source is licensed "private research use" and is dropped at
 * build time; a licensed Indonesian translation is a later, reviewed step. Nothing here authors or
 * corrects religious content — it displays the text apa adanya with honest sourcing.
 *
 * FIKIH is still an honest "Dalam penyusunan" placeholder: no legally-clean, Indonesian, topic-
 * structured fiqh corpus exists off the shelf, so it stays gated on a source + licensing + scholar
 * sign-off (see the content-pillars + "displaying others' scholarship" notes).
 *
 * Presentation only — nothing here touches the answer engine.
 */
import { esc } from "./esc.ts";
import { kitabId } from "./hadith-titles.ts";
import {
  findCollection,
  loadHadithBook,
  loadHadithIndex,
  type HadithBab,
  type HadithCollectionMeta,
  type Hadith as HadithRecord,
} from "./hadith.ts";
import { FIQH_AREAS, type FiqhArea } from "./fikih.ts";

// ── Hadis ────────────────────────────────────────────────────────────────────

const gradeLabel = (grade: string): string => (grade === "sahih" ? "Ṣaḥīḥ" : grade);

function errorView(title: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
  return `
    <div class="read-index">
      <header class="tematik-head">
        <div class="tematik-head-l"><h1 class="tematik-title">${title}</h1></div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="alert">${esc(msg)} Coba muat ulang halaman.</p>
    </div>`;
}

function kitabCard(collectionId: string, b: HadithCollectionMeta["books"][number]): string {
  // The Indonesian title leads and the Arabic follows (Erik, 2026-08-10 — the grid was Arabic-only
  // and unreadable to a reader who does not read Arabic). The Arabic is NOT demoted to a subtitle:
  // it stays at full size as the canonical name, and the Indonesian sits above it as the way in.
  // A kitab with no mapping simply shows no Indonesian line — never a placeholder, never a guess.
  const id = kitabId(collectionId, b.no);
  // data-search now matches the number, the Arabic, OR the Indonesian, so a reader can type "wudu".
  const search = `${b.no} ${b.ar}${id ? ` ${id}` : ""}`;
  return `
    <a class="hadith-kitab" href="#/hadis/${esc(collectionId)}/${b.no}" data-search="${esc(search)}">
      <span class="hadith-kitab-orn" aria-hidden="true"></span>
      <span class="hadith-kitab-no">${b.no}</span>
      <span class="hadith-kitab-body">
        ${id ? `<span class="hadith-kitab-id">${esc(id)}</span>` : ""}
        <span class="hadith-kitab-ar" dir="rtl" lang="ar">${esc(b.ar)}</span>
      </span>
      <span class="hadith-kitab-count">${b.hadith} hadis</span>
    </a>`;
}

/** Skeleton grid while the index loads — shaped like the kitab cards, not a spinner. */
function hadithSkeleton(): string {
  const cards = Array.from({ length: 12 }, () => `<div class="hadith-sk-card" aria-hidden="true"></div>`).join("");
  return `<div class="read-index hadith-index"><div class="hadith-sk-head" aria-hidden="true"></div><div class="hadith-kitab-grid">${cards}</div></div>`;
}

/** One collection's kitab, in its own tab panel (only the active one is shown). */
function collectionPanel(c: HadithCollectionMeta, active: boolean): string {
  const kitab = c.books.map((b) => kitabCard(c.id, b)).join("");
  return `
    <div class="hadith-panel" data-coll="${esc(c.id)}" role="tabpanel"${active ? "" : " hidden"}>
      <div class="hadith-kitab-grid">${kitab}</div>
      <p class="hadith-empty" hidden>Tidak ada kitab yang cocok.</p>
    </div>`;
}

export async function renderHadis(mount: HTMLElement): Promise<void> {
  mount.innerHTML = hadithSkeleton();
  let index;
  try {
    index = await loadHadithIndex();
  } catch (err) {
    mount.innerHTML = errorView("Hadis", err);
    return;
  }

  const tabs = index.collections
    .map(
      (c, i) =>
        `<button class="hadith-tab${i === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${i === 0}" data-coll="${esc(c.id)}">${esc(c.name)} <span class="hadith-tab-n">${c.books.length} kitab</span></button>`,
    )
    .join("");
  const panels = index.collections.map((c, i) => collectionPanel(c, i === 0)).join("");

  mount.innerHTML = `
    <div class="read-index hadith-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Hadis</h1>
          <p class="tematik-sub">Ṣaḥīḥ al-Bukhārī & Ṣaḥīḥ Muslim — ${index.total.toLocaleString("id-ID")} hadis, tersusun menurut kitab.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="note">Nama kitab diterjemahkan agar mudah dicari; <b>teks hadisnya tetap Arab</b> yang kanonik, beserta sumber dan derajatnya. Terjemahan teks hadis menyusul setelah lisensinya jelas dan ditinjau ustadz — kami menampilkan karya ulama apa adanya, tidak mengarang isinya.</p>
      <div class="hadith-controls">
        <div class="hadith-tabs" role="tablist" aria-label="Pilih koleksi">${tabs}</div>
        <input class="hadith-filter" type="search" placeholder="Cari kitab — nomor, nama Indonesia, atau Arab…" aria-label="Cari kitab" />
      </div>
      ${panels}
    </div>`;

  wireHadisIndex(mount);
}

/** Tab switching + kitab filtering — plain DOM, no framework, re-runnable after each innerHTML swap. */
function wireHadisIndex(mount: HTMLElement): void {
  const root = mount.querySelector<HTMLElement>(".hadith-index");
  const filter = root?.querySelector<HTMLInputElement>(".hadith-filter");
  if (!root || !filter) return;

  const applyFilter = (): void => {
    const q = filter.value.trim().toLowerCase();
    const panel = root.querySelector<HTMLElement>(".hadith-panel:not([hidden])");
    if (!panel) return;
    let shown = 0;
    panel.querySelectorAll<HTMLElement>(".hadith-kitab").forEach((card) => {
      const match = q.length === 0 || (card.dataset.search ?? "").toLowerCase().includes(q);
      card.hidden = !match;
      if (match) shown += 1;
    });
    const empty = panel.querySelector<HTMLElement>(".hadith-empty");
    if (empty) empty.hidden = shown > 0;
  };

  root.querySelectorAll<HTMLButtonElement>(".hadith-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const coll = tab.dataset.coll;
      root.querySelectorAll<HTMLButtonElement>(".hadith-tab").forEach((t) => {
        const on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
      });
      root.querySelectorAll<HTMLElement>(".hadith-panel").forEach((p) => {
        p.hidden = p.dataset.coll !== coll;
      });
      applyFilter();
    });
  });

  filter.addEventListener("input", applyFilter);
}

function hadithCard(h: HadithRecord): string {
  return `
    <article class="hadith-card">
      <div class="hadith-meta">
        <span class="hadith-no">No. ${h.n}</span>
        <span class="hadith-grade">${esc(gradeLabel(h.grade))}</span>
      </div>
      <p class="ar hadith-ar" dir="rtl" lang="ar">${esc(h.ar)}</p>
      <a class="hadith-src" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">Sumber: sunnah.com ↗</a>
    </article>`;
}

function babBlock(bab: HadithBab): string {
  const head = bab.ar ? `<h3 class="hadith-bab" dir="rtl" lang="ar">${esc(bab.ar)}</h3>` : "";
  return `<section class="hadith-bab-block">${head}${bab.hadith.map(hadithCard).join("")}</section>`;
}

export async function renderHadisBook(mount: HTMLElement, collectionId: string, book: number): Promise<void> {
  mount.innerHTML = `<div class="read-index"><p class="hadith-note">Memuat kitab…</p></div>`;
  let coll: HadithCollectionMeta | undefined;
  let shard;
  try {
    const index = await loadHadithIndex();
    coll = findCollection(index, collectionId);
    shard = await loadHadithBook(collectionId, book);
  } catch (err) {
    mount.innerHTML = errorView("Hadis", err);
    return;
  }

  const count = shard.babs.reduce((n, b) => n + b.hadith.length, 0);
  mount.innerHTML = `
    <div class="read-index hadith-book">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <p class="hadith-crumb"><a href="#/hadis">Hadis</a> › ${esc(coll?.name ?? collectionId)}</p>
          <h1 class="tematik-title" dir="rtl" lang="ar">${esc(shard.book.ar)}</h1>
          <p class="tematik-sub">${count} hadis · ${esc(shard.collection_ar)}</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/hadis">Kembali</a></div>
      </header>
      <div class="hadith-list">${shard.babs.map(babBlock).join("")}</div>
    </div>`;
}

// ── Fikih (dalil-only — a doorway into the sourced hadith, never a ruling) ─────

interface KitabInfo {
  readonly ar: string;
  readonly hadith: number;
}

const collLabel = (id: string): string => (id === "bukhari" ? "Bukhari" : id === "muslim" ? "Muslim" : id);

function fiqhCard(a: FiqhArea, lookup: Map<string, KitabInfo>): string {
  const chips = a.refs
    .map((r) => {
      const info = lookup.get(`${r.collection}/${r.book}`);
      if (!info) return "";
      // Same treatment as the Hadis grid: these chips point at the very same kitab, so leaving
      // them Arabic-only would have made Fikih the one place the reader still cannot navigate.
      // The Indonesian leads, the canonical Arabic follows it on the same line.
      const idn = kitabId(r.collection, r.book);
      return `
        <a class="fikih-kitab" href="#/hadis/${esc(r.collection)}/${r.book}">
          <span class="fikih-kitab-n">
            ${idn ? `<span class="fikih-kitab-id">${esc(idn)}</span>` : ""}
            <span class="fikih-kitab-ar" dir="rtl" lang="ar">${esc(info.ar)}</span>
          </span>
          <span class="fikih-kitab-meta">${collLabel(r.collection)} · ${info.hadith} hadis</span>
        </a>`;
    })
    .join("");
  return `
    <section class="fikih-card">
      <h2 class="fikih-title">${esc(a.title)}</h2>
      <p class="fikih-sub">${esc(a.sub)}</p>
      <div class="fikih-kitab-list">${chips}</div>
    </section>`;
}

export async function renderFikih(mount: HTMLElement): Promise<void> {
  mount.innerHTML = `<div class="read-index"><p class="hadith-note">Memuat Fikih…</p></div>`;
  const lookup = new Map<string, KitabInfo>();
  try {
    const index = await loadHadithIndex();
    for (const c of index.collections) {
      for (const b of c.books) lookup.set(`${c.id}/${b.no}`, { ar: b.ar, hadith: b.hadith });
    }
  } catch (err) {
    mount.innerHTML = errorView("Fikih", err);
    return;
  }

  mount.innerHTML = `
    <div class="read-index fikih-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Fikih</h1>
          <p class="tematik-sub">Pintu ke dalilnya — tiap amal ibadah menautkan ke kitab hadis Ṣaḥīḥ yang menaunginya, menurut susunan para imam.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="note">Ini <b>pintu masuk ke dalil</b>, bukan uraian hukum — kami tidak berfatwa. Tiap topik menautkan ke kitab hadis yang relevan (susunan Imam al-Bukhārī & Muslim sendiri). Uraian fikih beserta dalil Al-Qur'an dari rujukan berlisensi menyusul setelah ditinjau ustadz.</p>
      <div class="fikih-grid">${FIQH_AREAS.map((a) => fiqhCard(a, lookup)).join("")}</div>
    </div>`;
}
