/**
 * Peta Tematik DATA — types, cached loaders, nothing that touches a page.
 *
 * Split out of peta.ts (2026-07-22). knowledge.ts needs only `loadIndex`/`loadCategory`, but
 * peta.ts is also the RENDERING module: it imports read.ts and peta-cosmos.ts, which import
 * verse.ts. So every Bun script reaching the chat's knowledge path pulled the whole browser
 * surface behind it, and typechecking a build script failed on `document` and `HTMLButtonElement`.
 *
 * The seam is data vs rendering. Loaders and shapes live here; peta.ts renders and re-exports
 * these so its own importers are unaffected.
 */

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

// index.json is 1.5 KB and never changes within a session; a category shard is up to ~104 KB.
// Both are cached so navigating peta → surah → peta costs nothing. Only successful fetches
// populate these, so a failed load never poisons a later one.
let indexCache: PetaIndex | undefined;
const shardCache = new Map<string, PetaShard>();

/** Test-only — see resetPetaCache in peta.ts, which calls this alongside the cosmos caches. */
export function resetPetaDataCache(): void {
  indexCache = undefined;
  shardCache.clear();
}

// Exported so the chat's knowledge path (knowledge.ts) reuses the SAME cached loaders and the same
// source-of-truth shards — a knowledge answer surfaces the identical entries the Peta pages do.
export async function loadIndex(): Promise<PetaIndex> {
  if (indexCache) return indexCache;
  const res = await fetch("/peta/index.json");
  if (!res.ok) throw new Error(`Gagal memuat Peta Tematik (${res.status}).`);
  indexCache = (await res.json()) as PetaIndex;
  return indexCache;
}

export async function loadCategory(slug: string): Promise<PetaShard> {
  const hit = shardCache.get(slug);
  if (hit) return hit;
  const res = await fetch(`/peta/${encodeURIComponent(slug)}.json`);
  if (!res.ok) throw new Error(`Gagal memuat kategori ini (${res.status}).`);
  const shard = (await res.json()) as PetaShard;
  shardCache.set(slug, shard);
  return shard;
}

