/**
 * Hadis DATA — types + cached loaders for the Ṣaḥīḥayn browse corpus. No DOM here (sections.ts
 * renders); this module is import-safe for tests and any non-browser caller.
 *
 * The corpus is ARABIC ONLY by design — see src/app/build-hadith.ts. The English translation in the
 * source is licensed "private research use" and is dropped at build time; what ships is the canonical
 * public-domain Arabic plus our own structural metadata (collection, kitab, bab, number, grade) and a
 * sunnah.com attribution link. Shape mirrors the on-disk shards emitted there.
 */

export interface HadithBookMeta {
  readonly no: number;
  readonly ar: string;
  readonly hadith: number;
  readonly babs: number;
}

export interface HadithCollectionMeta {
  readonly id: string;
  readonly name: string;
  readonly name_ar: string;
  readonly author_ar: string;
  readonly hadith: number;
  readonly books: readonly HadithBookMeta[];
}

export interface HadithIndex {
  readonly source: string;
  readonly note: string;
  readonly total: number;
  readonly collections: readonly HadithCollectionMeta[];
}

export interface Hadith {
  readonly n: number;
  readonly grade: string;
  /** Byte-exact canonical Arabic. Never reworded. */
  readonly ar: string;
  /** Attribution link to the source record on sunnah.com. */
  readonly url: string;
}

export interface HadithBab {
  readonly no: number;
  /** May be "" — a few chapter headings exist only in English in the source and are never invented here. */
  readonly ar: string;
  readonly hadith: readonly Hadith[];
}

export interface HadithBook {
  readonly collection: string;
  readonly collection_ar: string;
  readonly book: { readonly no: number; readonly ar: string };
  readonly babs: readonly HadithBab[];
}

let indexCache: HadithIndex | null = null;
const bookCache = new Map<string, HadithBook>();

/** Drop cached fetches — for tests that swap `globalThis.fetch` between cases. */
export function resetHadithCache(): void {
  indexCache = null;
  bookCache.clear();
}

export async function loadHadithIndex(): Promise<HadithIndex> {
  if (indexCache) return indexCache;
  const res = await fetch("/hadith/index.json");
  if (!res.ok) throw new Error(`Gagal memuat daftar Hadits (${res.status}).`);
  indexCache = (await res.json()) as HadithIndex;
  return indexCache;
}

export async function loadHadithBook(collection: string, book: number): Promise<HadithBook> {
  const key = `${collection}/${book}`;
  const hit = bookCache.get(key);
  if (hit) return hit;
  const res = await fetch(`/hadith/${encodeURIComponent(collection)}/${book}.json`);
  if (!res.ok) throw new Error(`Gagal memuat kitab ini (${res.status}).`);
  const shard = (await res.json()) as HadithBook;
  bookCache.set(key, shard);
  return shard;
}

/** The collection meta for an id, or undefined if the route names a collection we don't ship. */
export function findCollection(index: HadithIndex, id: string): HadithCollectionMeta | undefined {
  return index.collections.find((c) => c.id === id);
}
