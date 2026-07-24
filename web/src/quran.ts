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
import { BASMALAH, CORPUS_VERSION, SURAH_INDEX, type SurahMeta } from "./surah-index.ts";

export { BASMALAH, CORPUS_VERSION, SURAH_INDEX, type SurahMeta };

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

// ── how Indonesia actually spells them ───────────────────────────────────────
//
// The corpus ships academic transliteration — "Al-Baqara", "At-Tawba", "Al-Faatiha". No Indonesian
// writes those. They write Al-Baqarah, At-Taubah, Al-Fatihah. A product whose entire thesis is
// "meet the reader in the language they actually use" was misspelling the surah names at them.
//
// Only the endings that are genuinely wrong in Indonesian usage are overridden; the rest of the
// transliteration is left alone rather than rewritten wholesale on a guess.
const DISPLAY_NAME: Record<number, string> = {
  1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali 'Imran", 4: "An-Nisa", 5: "Al-Maidah",
  6: "Al-An'am", 7: "Al-A'raf", 8: "Al-Anfal", 9: "At-Taubah", 10: "Yunus",
  11: "Hud", 12: "Yusuf", 13: "Ar-Ra'd", 14: "Ibrahim", 15: "Al-Hijr",
  16: "An-Nahl", 17: "Al-Isra", 18: "Al-Kahfi", 19: "Maryam", 20: "Taha",
  21: "Al-Anbiya", 22: "Al-Hajj", 23: "Al-Mu'minun", 24: "An-Nur", 25: "Al-Furqan",
  26: "Asy-Syu'ara", 27: "An-Naml", 28: "Al-Qasas", 29: "Al-'Ankabut", 30: "Ar-Rum",
  31: "Luqman", 32: "As-Sajdah", 33: "Al-Ahzab", 34: "Saba", 35: "Fatir",
  36: "Yasin", 37: "As-Saffat", 38: "Sad", 39: "Az-Zumar", 40: "Gafir",
  41: "Fussilat", 42: "Asy-Syura", 43: "Az-Zukhruf", 44: "Ad-Dukhan", 45: "Al-Jasiyah",
  46: "Al-Ahqaf", 47: "Muhammad", 48: "Al-Fath", 49: "Al-Hujurat", 50: "Qaf",
  51: "Az-Zariyat", 52: "At-Tur", 53: "An-Najm", 54: "Al-Qamar", 55: "Ar-Rahman",
  56: "Al-Waqi'ah", 57: "Al-Hadid", 58: "Al-Mujadilah", 59: "Al-Hasyr", 60: "Al-Mumtahanah",
  61: "As-Saff", 62: "Al-Jumu'ah", 63: "Al-Munafiqun", 64: "At-Tagabun", 65: "At-Talaq",
  66: "At-Tahrim", 67: "Al-Mulk", 68: "Al-Qalam", 69: "Al-Haqqah", 70: "Al-Ma'arij",
  71: "Nuh", 72: "Al-Jinn", 73: "Al-Muzzammil", 74: "Al-Muddassir", 75: "Al-Qiyamah",
  76: "Al-Insan", 77: "Al-Mursalat", 78: "An-Naba", 79: "An-Nazi'at", 80: "'Abasa",
  81: "At-Takwir", 82: "Al-Infitar", 83: "Al-Mutaffifin", 84: "Al-Insyiqaq", 85: "Al-Buruj",
  86: "At-Tariq", 87: "Al-A'la", 88: "Al-Gasyiyah", 89: "Al-Fajr", 90: "Al-Balad",
  91: "Asy-Syams", 92: "Al-Lail", 93: "Ad-Duha", 94: "Asy-Syarh", 95: "At-Tin",
  96: "Al-'Alaq", 97: "Al-Qadr", 98: "Al-Bayyinah", 99: "Az-Zalzalah", 100: "Al-'Adiyat",
  101: "Al-Qari'ah", 102: "At-Takasur", 103: "Al-'Asr", 104: "Al-Humazah", 105: "Al-Fil",
  106: "Quraisy", 107: "Al-Ma'un", 108: "Al-Kausar", 109: "Al-Kafirun", 110: "An-Nasr",
  111: "Al-Lahab", 112: "Al-Ikhlas", 113: "Al-Falaq", 114: "An-Nas",
};

/** The name to SHOW. Every surface renders through this; nothing renders `meta.tl` raw. */
export const displayName = (n: number): string => DISPLAY_NAME[n] ?? bySurah.get(n)?.tl ?? `Surah ${n}`;

const bySurah = new Map<number, SurahMeta>(SURAH_INDEX.map((s) => [s.n, s]));

export const surahMeta = (n: number): SurahMeta | undefined => bySurah.get(n);

/** Does "surah:ayah" name a real ayah in the mushaf (surah 1–114, ayah within its bounds)? */
export function isRealAyah(ref: string): boolean {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref.trim());
  if (!m) return false;
  const meta = surahMeta(Number(m[1]));
  const ayah = Number(m[2]);
  return !!meta && ayah >= 1 && ayah <= meta.ayahs;
}

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

/**
 * A CLOCK IS NOT A VERSE.
 *
 * `2:30` is a valid reference to Al-Baqarah 30. It is also half past two in the morning, which is
 * exactly when this product expects to be used. Left unguarded, the bare `N:M` pattern turned
 * "aku bangun jam 2:30 pagi" into Al-Baqarah 2:30, and "udah jam 3:15 masih gabisa tidur" into
 * Aal-i-Imraan 3:15 — silently reinterpreting a person's insomnia as a citation, and skipping
 * retrieval entirely on the way (the ref path has no scoring to catch a bad guess).
 *
 * So a bare `N:M` is disqualified when the sentence is talking about time. Explicitly marked refs
 * ("QS 2:30", "surat 2 ayat 30") are never disqualified — the marker IS the intent.
 */
const TIME_CUE =
  /\b(jam|pukul|pkl|wib|wit|wita|am|pm|pagi|siang|sore|petang|malam|subuh|dini hari|tengah malam|menit|detik)\b/i;

const REF_PATTERNS: RegExp[] = [
  /(?:^|\s)(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s|$)/, //  18:10   18.10   ← bare; time-guarded below
  new RegExp(String.raw`${SURAH_WORD}\s*(\d{1,3})\s*(?:ayat|ayah|ay\.?)\s*(\d{1,3})`, "i"), // surat 18 ayat 10
  /(?:^|\s)q\.?s\.?\s*(\d{1,3})\s*[:.]\s*(\d{1,3})/i, //  QS 18:10
];

/** Only the bare `N:M` form is ambiguous with a clock. The marked forms carry their own intent. */
const IS_BARE = (i: number) => i === 0;

/**
 * Parse a user's message into a Qur'anic reference.
 *
 * Resolution is purely local — SURAH_INDEX is in the bundle. No fetch, no await, no network.
 * That is what lets Nur be honest about what the Qur'an contains even when it is offline.
 */
export function parseRef(input: string): RefResult {
  const q = input.trim();
  if (!q) return { kind: "not-a-ref" };

  for (const [i, re] of REF_PATTERNS.entries()) {
    const m = q.match(re);
    if (!m) continue;

    // "jam 2:30 pagi" is a time, not Al-Baqarah 30. Hand it to retrieval, where it belongs.
    if (IS_BARE(i) && TIME_CUE.test(q)) continue;

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

/** In-memory, for this page view. */
const cache = new Map<number, Shard>();
const inflight = new Map<number, Promise<Shard>>();

/**
 * Shards that survive a reload.
 *
 * The in-memory Map above used to be the whole story, while the comment beside it claimed shards
 * were "cached forever". They were not — they died on every reload, so a reader on patchy 4G who
 * closed the app and reopened it with no signal could not read anything. The claim was aspiration
 * written as fact, which is worse than no comment at all, because it gets believed.
 *
 * Now it is true. A shard is content-addressed by CORPUS_VERSION: it changes if and only if the
 * scripture changes, so a cached surah can be trusted indefinitely and served with no network.
 * Caches from older corpus versions are dropped on boot rather than left to rot.
 *
 * CacheStorage is unavailable in insecure contexts and in some in-app browsers. That is a
 * degradation, not a failure — we fall back to network-only and say nothing, because a reader who
 * can still read does not need to hear about our storage layer.
 */
const CACHE_NAME = `newquranku-quran-${CORPUS_VERSION}`;
const shardUrl = (n: number) => `/surah/${n}.json?v=${CORPUS_VERSION}`;

const cacheStore = async (): Promise<Cache | null> => {
  try {
    if (!("caches" in globalThis)) return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
};

/** Drop shards from a previous corpus. Scripture changed; the old bytes must not linger. */
export async function evictStaleCaches(): Promise<void> {
  try {
    if (!("caches" in globalThis)) return;
    const keys = await caches.keys();
    await Promise.all(
      // Clean stale shard caches under the current prefix — and any left over from the old `nur-quran-`
      // name after the New-Quranku rename (regenerable, so they just re-download once).
      keys
        .filter((k) => (k.startsWith("newquranku-quran-") || k.startsWith("nur-quran-")) && k !== CACHE_NAME)
        .map((k) => caches.delete(k)),
    );
  } catch {
    /* a cache we cannot clean is not a reason to stop the reader */
  }
}

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
    const url = shardUrl(n);
    const store = await cacheStore();

    // Cache first. A surah you have already read must open with no network at all.
    let res: Response | undefined = await store?.match(url).catch(() => undefined);
    let fromCache = Boolean(res);

    if (!res) {
      try {
        res = await fetch(url);
      } catch {
        throw new ShardError(`Gagal memuat ${displayName(n)}. Periksa koneksimu.`, n);
      }
      fromCache = false;
    }
    if (!res.ok) throw new ShardError(`Gagal memuat ${displayName(n)} (${res.status}).`, n);

    // Clone BEFORE reading the body — a Response body can only be consumed once, and the copy is
    // what gets persisted. Only after integrity passes, though: a corrupt shard that gets cached
    // is a corrupt shard forever.
    const toPersist = fromCache ? null : res.clone();

    let shard: Shard;
    try {
      shard = (await res.json()) as Shard;
    } catch {
      throw new ShardError(`Data ${displayName(n)} rusak saat diunduh.`, n);
    }

    // Integrity. A truncated or scrambled surah must never render.
    //
    // The counts alone are not enough: a shard with the right LENGTH and the wrong CONTENT would
    // sail through. So the ayah numbers must also be exactly 1..N, in order. That catches
    // truncation, duplication, reordering, and a shard served for the wrong surah — which is the
    // realistic failure when a CDN or a stale cache hands back the wrong file.
    const wrongCount = shard.verses.length !== shard.ayahs || shard.ayahs !== meta.ayahs;
    const wrongSurah = shard.n !== n;
    const notContiguous = shard.verses.some((v, i) => v.a !== i + 1);

    if (wrongCount || wrongSurah || notContiguous) {
      // A bad shard in the cache would poison every future read. Evict it.
      await store?.delete(url).catch(() => undefined);
      throw new ShardError(
        `Data ${displayName(n)} tidak lengkap atau rusak (${shard.verses.length} dari ${meta.ayahs} ayat). Aku tidak menampilkan surah yang terpotong.`,
        n,
      );
    }

    if (toPersist) await store?.put(url, toPersist).catch(() => undefined);

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
