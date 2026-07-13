/**
 * The Qur'an — reference resolution and surah loading.
 *
 * THE HONESTY ORACLE
 * ------------------
 * Nur used to tell people that real ayahs did not exist. Ask for 18:10 — a real verse in
 * Al-Kahf — and it said "Tidak ada ayat yang cocok", because only 55 of 6,236 verses were
 * bundled. That is a lie by omission, and for a scripture app it is the failure that ends
 * trust permanently.
 *
 * The fix rests on one observation: **you do not need a verse's text to know the verse is
 * real.** SURAH_INDEX is inlined into this bundle — 114 surahs and their ayah counts, no
 * network at all. So Nur can always answer "is this a real ayah?" truthfully: offline, on a
 * dead connection, on the very first cold open, before a single byte is fetched.
 *
 * Three answers are now distinguishable, where before there was only one:
 *   1. The verse is real and we have it        → render it.
 *   2. The verse is NOT real (18:999, 115:1)   → say precisely why, with the true bound.
 *   3. The verse is real, but no semantic match → a different sentence entirely.
 *
 * Conflating (2) and (3) is what produced the lie. They are now separate code paths.
 */
import { BASMALAH, SURAH_INDEX, type SurahMeta } from "./surah-index.ts";

export { BASMALAH, SURAH_INDEX, type SurahMeta };

export interface ShardVerse {
  /** Ayah number within the surah. */
  a: number;
  /** Uthmani Arabic. The basmalah has already been lifted out into the surah header. */
  ar: string;
  /** The interpretive primary (Tarjamah Tafsiriyah). */
  p: { text: string; translator: string; translation_type: string } | null;
  /** The literal companion (Kemenag). Ships with the primary, always. */
  c: { text: string; translator: string; translation_type: string } | null;
}

export interface Shard {
  n: number;
  name: string;
  name_ar: string;
  /** Self-declared. A shard whose verses don't match this count is REJECTED, not half-rendered. */
  ayahs: number;
  bismillah: boolean;
  verses: ShardVerse[];
}

const bySurah = new Map<number, SurahMeta>(SURAH_INDEX.map((s) => [s.n, s]));

export const surahMeta = (n: number): SurahMeta | undefined => bySurah.get(n);

// ── name matching ────────────────────────────────────────────────────────────
//
// People do not type "18:10". They type "al kahfi", "yasin", "ar-rahman" — the surah by name,
// the way it is spoken. A reference parser that only accepts N:M still denies them, and the
// P0 survives wearing a different costume.
//
// Fold to the consonantal shape: lowercase, drop dashes/apostrophes/spaces, and collapse the
// Arabic definite article, so "Al-Kahf" == "alkahfi" == "al kahf" == "kahfi".
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip Latin diacritics
    .replace(/['’`\-_.]/g, "")
    .replace(/\s+/g, "");

/** Indonesian readers use Indonesian spellings; the corpus uses academic transliteration. */
const ALIASES: Record<string, number> = {
  alfatihah: 1, fatihah: 1, alfatiha: 1,
  albaqarah: 2, baqarah: 2,
  aliimran: 3, alimran: 3, imran: 3,
  annisa: 4, nisa: 4,
  almaidah: 5, maidah: 5,
  alkahfi: 18, kahfi: 18, alkahf: 18, kahf: 18,
  maryam: 19,
  thaha: 20, taha: 20,
  yasin: 36, yaasin: 36, yassin: 36,
  arrahman: 55, rahman: 55,
  alwaqiah: 56, waqiah: 56,
  almulk: 67, mulk: 67,
  alkahfi18: 18,
  annaba: 78,
  alkautsar: 108, alkawthar: 108,
  alikhlas: 112, ikhlas: 112, alikhlash: 112,
  alfalaq: 113, falaq: 113,
  annas: 114, nas: 114,
};

/** Resolve a surah by number or by name. Returns undefined if it is not a surah. */
export function findSurah(token: string): SurahMeta | undefined {
  const t = token.trim();
  if (/^\d{1,3}$/.test(t)) return bySurah.get(Number(t));

  const f = fold(t);
  if (!f) return undefined;
  if (ALIASES[f] !== undefined) return bySurah.get(ALIASES[f]!);

  // Fall back to the corpus transliteration, with and without the article.
  const bare = (x: string) => fold(x).replace(/^al/, "");
  return SURAH_INDEX.find((s) => fold(s.tl) === f || bare(s.tl) === bare(f));
}

// ── reference parsing ────────────────────────────────────────────────────────

export type RefResult =
  /** A real ayah. Both numbers are in range. */
  | { kind: "ayah"; surah: SurahMeta; ayah: number }
  /** A real surah, no ayah given — the user wants to read it. */
  | { kind: "surah"; surah: SurahMeta }
  /** Parsed as a reference, but the surah number does not exist. */
  | { kind: "no-such-surah"; surah: number }
  /** The surah is real; the ayah number is past its end. We can say exactly how far. */
  | { kind: "no-such-ayah"; surah: SurahMeta; ayah: number }
  /** Not a reference at all — this is a question, hand it to retrieval. */
  | { kind: "not-a-ref" };

// Indonesian says "surat", not "surah" — getting this wrong is how the P0 survives in a new
// costume, so all the spellings people actually type are accepted.
const SURAH_WORD = String.raw`sur(?:ah|at|a)?`;

const REF_PATTERNS: RegExp[] = [
  /(?:^|\s)(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s|$)/, //  18:10   18.10
  new RegExp(String.raw`${SURAH_WORD}\s*(\d{1,3})\s*(?:ayat|ayah|ay\.?)\s*(\d{1,3})`, "i"), // surat 18 ayat 10
  /(?:^|\s)q\.?s\.?\s*(\d{1,3})\s*[:.]\s*(\d{1,3})/i, //  QS 18:10
];

/**
 * Parse a user's message into a Qur'anic reference.
 *
 * Resolution is purely local — SURAH_INDEX is in the bundle. No fetch, no await, no network.
 * That is what lets Nur be honest about what the Qur'an contains even when it is offline.
 */
export function parseRef(input: string): RefResult {
  const q = input.trim();
  if (!q) return { kind: "not-a-ref" };

  for (const re of REF_PATTERNS) {
    const m = q.match(re);
    if (!m) continue;
    const sn = Number(m[1]);
    const an = Number(m[2]);
    const surah = bySurah.get(sn);
    if (!surah) return { kind: "no-such-surah", surah: sn };
    if (an < 1 || an > surah.ayahs) return { kind: "no-such-ayah", surah, ayah: an };
    return { kind: "ayah", surah, ayah: an };
  }

  // "surat al-kahfi ayat 10" / "al kahfi" / "yasin"
  const named = q.match(
    new RegExp(String.raw`^(?:${SURAH_WORD}\s+)?([\p{L}\s'’-]+?)(?:\s+(?:ayat|ayah|ay\.?)\s*(\d{1,3}))?$`, "iu"),
  );
  if (named) {
    const surah = findSurah(named[1]!);
    if (surah) {
      if (named[2] === undefined) return { kind: "surah", surah };
      const an = Number(named[2]);
      if (an < 1 || an > surah.ayahs) return { kind: "no-such-ayah", surah, ayah: an };
      return { kind: "ayah", surah, ayah: an };
    }
  }

  return { kind: "not-a-ref" };
}

// ── shard loading ────────────────────────────────────────────────────────────

export class ShardError extends Error {
  constructor(
    message: string,
    readonly surah: number,
  ) {
    super(message);
    this.name = "ShardError";
  }
}

/** Surahs already fetched. Immutable per corpus_version, so a shard is cached forever. */
const cache = new Map<number, Shard>();
const inflight = new Map<number, Promise<Shard>>();

/**
 * Fetch one surah. Never the whole book.
 *
 * A truncated download must never render as a half-surah — scripture does not degrade
 * gracefully, and half an ayah is worse than no ayah. Every shard self-declares its ayah
 * count; a shard that does not match it is rejected outright.
 */
export async function loadSurah(n: number): Promise<Shard> {
  const cached = cache.get(n);
  if (cached) return cached;

  const pending = inflight.get(n);
  if (pending) return pending;

  const meta = bySurah.get(n);
  if (!meta) throw new ShardError(`Surah ${n} tidak ada. Al-Qur'an punya 114 surah.`, n);

  const task = (async (): Promise<Shard> => {
    let res: Response;
    try {
      res = await fetch(`/surah/${n}.json`);
    } catch {
      throw new ShardError(`Gagal memuat ${meta.tl}. Periksa koneksimu.`, n);
    }
    if (!res.ok) throw new ShardError(`Gagal memuat ${meta.tl} (${res.status}).`, n);

    let shard: Shard;
    try {
      shard = (await res.json()) as Shard;
    } catch {
      throw new ShardError(`Data ${meta.tl} rusak saat diunduh.`, n);
    }

    // Integrity: refuse a partial surah rather than render a truncated one.
    if (shard.verses.length !== shard.ayahs || shard.ayahs !== meta.ayahs) {
      throw new ShardError(
        `Data ${meta.tl} tidak lengkap (${shard.verses.length} dari ${meta.ayahs} ayat). Aku tidak menampilkan surah yang terpotong.`,
        n,
      );
    }

    cache.set(n, shard);
    return shard;
  })();

  inflight.set(n, task);
  try {
    return await task;
  } finally {
    inflight.delete(n);
  }
}

/** Has this surah already been fetched? Lets the UI skip a spinner it doesn't need. */
export const isCached = (n: number) => cache.has(n);

/** Fetch a single ayah, by way of its surah's shard. */
export async function loadAyah(surah: number, ayah: number): Promise<ShardVerse> {
  const shard = await loadSurah(surah);
  const v = shard.verses.find((x) => x.a === ayah);
  if (!v) throw new ShardError(`Ayat ${surah}:${ayah} tidak ditemukan di surah yang dimuat.`, surah);
  return v;
}
