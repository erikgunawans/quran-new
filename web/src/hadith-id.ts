/**
 * The machine-translated Indonesian layer for hadith bab titles.
 *
 * Loaded SEPARATELY from the corpus and failing SOFT: if `hadith-id/babs.json` is missing, stale,
 * or malformed, every caller falls back to Arabic-only — the state the app shipped in. Generated
 * content must never be able to break the canonical text it sits beside, and the corpus shards
 * under `web/public/hadith/` are never touched by the generator (see src/app/translate-babs.ts).
 *
 * The provenance is DATA, carried in the file's own `meta`, not a sentence hardcoded in the UI.
 * If the notice lived in the markup it could keep claiming "belum ditinjau" after a review had
 * happened, or — worse — keep claiming nothing at all after the file changed underneath it.
 */

export interface BabIdMeta {
  translation?: string;
  reviewed?: boolean;
  reviewerNeeded?: string;
  notice?: string;
}

interface BabIdFile {
  meta?: BabIdMeta;
  babs?: Record<string, string>;
}

let cache: BabIdFile | null = null;
let inflight: Promise<BabIdFile> | null = null;

/** Fetch once per session. A failure caches an EMPTY file rather than retrying on every book. */
export async function loadBabIds(): Promise<BabIdFile> {
  if (cache) return cache;
  inflight ??= (async () => {
    try {
      const res = await fetch("/hadith-id/babs.json");
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as BabIdFile;
      cache = { meta: json.meta ?? {}, babs: json.babs ?? {} };
    } catch {
      cache = { meta: {}, babs: {} }; // Arabic-only, silently — this layer is an enhancement
    }
    return cache;
  })();
  return inflight;
}

/** The Indonesian title for one bab, or null. */
export function babId(file: BabIdFile, collection: string, book: number, bab: number): string | null {
  return file.babs?.[`${collection}/${book}/${bab}`] ?? null;
}

/** True when this file carries unreviewed machine output that a reader is about to see. */
export function needsNotice(file: BabIdFile): boolean {
  return Boolean(file.meta?.translation === "ai" && file.meta.reviewed === false && Object.keys(file.babs ?? {}).length);
}

// ── hadith text ──────────────────────────────────────────────────────────────
//
// Per book, not one map: 14,736 translations is ~9 MB, and a reader opening one kitab must not pay
// for the other 153. Mirrors the corpus shard the page already fetches.

const textCache = new Map<string, BabIdFile & { hadith?: Record<string, string> }>();

export interface HadithIdFile {
  meta?: BabIdMeta;
  hadith?: Record<string, string>;
}

/** Translations for one book. Missing file → empty, and the page renders Arabic-only. */
export async function loadHadithIds(collection: string, book: number): Promise<HadithIdFile> {
  const key = `${collection}/${book}`;
  const hit = textCache.get(key);
  if (hit) return hit;
  let file: HadithIdFile;
  try {
    const res = await fetch(`/hadith-id/${collection}/${book}.json`);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as HadithIdFile;
    file = { meta: json.meta ?? {}, hadith: json.hadith ?? {} };
  } catch {
    file = { meta: {}, hadith: {} };
  }
  textCache.set(key, file);
  return file;
}

/**
 * Whether machine-translated hadith TEXT may be shown. It may — since 2026-08-12.
 *
 * OPENED ON A SCHOLAR'S APPROVAL, recorded in `docs/review/hadith-id-approval-2026-08-12.md`.
 * Ustadz Ahmad Isrofiel Mardlatillah approved displaying OUR machine translations as they are, relayed
 * verbally by Erik. Read that file before touching this line: it records the exact scope, what was NOT
 * approved, and the defect that was disclosed before the decision.
 *
 * The gate existed because bab titles and hadith text are not the same risk — a clumsy chapter heading
 * is a bad heading, a clumsy hadith is a fabricated saying of the Prophet ﷺ — and that reasoning has
 * not been refuted. What changed is who carries the judgement: it is now a scholar's call rather than
 * this file's, which is the only kind of authority that could ever have opened it.
 *
 * THE ACCEPTED RISK, so nobody rediscovers it as a surprise. This layer is measured to alter sense:
 * `دُعَاؤُكُمْ إِيمَانُكُمْ` ("your supplication IS your faith") came back as "Doa kalian adalah
 * BAGIAN DARI keimanan kalian" ("...is PART OF your faith") — a hedge the Arabic does not contain. It
 * is fluent and plausible and no parity test can catch the next one. The risk is now accepted, not
 * absent.
 *
 * WHAT DID NOT OPEN. `.is-ai` and the provenance notice stay on every machine-rendered line —
 * permission to display is not permission to display unlabelled. `reviewed_id` in `hadith-card.ts`
 * keeps its narrower meaning (a scholar checked THIS record's sentence) and must never be populated
 * from this layer, or the data model loses its only way to tell "permitted" from "checked".
 */
export const SHOW_MACHINE_HADITH_TEXT = true;

/**
 * The Indonesian rendering of one hadith, or null.
 *
 * Gated at the SOURCE rather than at the call site, so the whole app cannot render this text by
 * adding a new caller. It also keeps `textNeedsNotice` honest: with the gate shut the book page
 * falls back to the bab-only notice, whose "teks hadis tetap Arab" is true again.
 */
export function hadithIdText(file: HadithIdFile, n: number): string | null {
  if (!SHOW_MACHINE_HADITH_TEXT) return null;
  return file.hadith?.[String(n)] ?? null;
}

/** True when this book carries unreviewed machine text a reader is about to see. */
export function textNeedsNotice(file: HadithIdFile): boolean {
  if (!SHOW_MACHINE_HADITH_TEXT) return false; // nothing is about to be seen
  return Boolean(
    file.meta?.translation === "ai" && file.meta.reviewed === false && Object.keys(file.hadith ?? {}).length,
  );
}
