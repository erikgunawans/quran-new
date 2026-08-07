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
        <div class="tematik-head-l"><h1 class="qk-hero-gradient tematik-title">${title}</h1></div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="alert">${esc(msg)} Coba muat ulang halaman.</p>
    </div>`;
}

function kitabCard(collectionId: string, b: HadithCollectionMeta["books"][number]): string {
  return `
    <a class="hadith-kitab" href="#/hadis/${esc(collectionId)}/${b.no}">
      <span class="hadith-kitab-no">${b.no}</span>
      <span class="hadith-kitab-ar" dir="rtl" lang="ar">${esc(b.ar)}</span>
      <span class="hadith-kitab-count">${b.hadith} hadis</span>
    </a>`;
}

function collectionSection(c: HadithCollectionMeta): string {
  const kitab = c.books.map((b) => kitabCard(c.id, b)).join("");
  return `
    <section class="hadith-collection">
      <h2 class="hadith-coll-title">
        <span dir="rtl" lang="ar">${esc(c.name_ar)}</span>
        <span class="hadith-coll-latin">${esc(c.name)} · ${c.hadith.toLocaleString("id-ID")} hadis · ${c.books.length} kitab</span>
      </h2>
      <div class="hadith-kitab-grid">${kitab}</div>
    </section>`;
}

export async function renderHadis(mount: HTMLElement): Promise<void> {
  mount.innerHTML = `<div class="read-index"><p class="hadith-note">Memuat Hadis…</p></div>`;
  let index;
  try {
    index = await loadHadithIndex();
  } catch (err) {
    mount.innerHTML = errorView("Hadis", err);
    return;
  }

  mount.innerHTML = `
    <div class="read-index hadith-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Hadis</h1>
          <p class="tematik-sub">Ṣaḥīḥ al-Bukhārī & Ṣaḥīḥ Muslim — ${index.total.toLocaleString("id-ID")} hadis, tersusun menurut kitab.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="note">Bagian ini menampilkan <b>teks Arab</b> yang kanonik beserta sumber dan derajatnya. Terjemahan Indonesia menyusul setelah lisensinya jelas dan ditinjau ustadz — kami menampilkan karya ulama apa adanya, tidak mengarang isinya.</p>
      ${index.collections.map(collectionSection).join("")}
    </div>`;
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
          <h1 class="qk-hero-gradient tematik-title" dir="rtl" lang="ar">${esc(shard.book.ar)}</h1>
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
      return `
        <a class="fikih-kitab" href="#/hadis/${esc(r.collection)}/${r.book}">
          <span class="fikih-kitab-ar" dir="rtl" lang="ar">${esc(info.ar)}</span>
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
