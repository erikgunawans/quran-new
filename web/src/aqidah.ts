/**
 * The reviewed-aqidah content lane — plain-language answers to BROAD DEFINITIONAL questions.
 *
 * WHY THIS EXISTS. Phase A (knowledge.ts) surfaces the scholar's Indeks Tematik — a PREDICATE index
 * ("Allah does X → verse"). That answers a SPECIFIC question ("hukum riba") well, but a broad
 * definitional one ("siapakah Allah?", "apa itu tauhid?") matches the topic yet finds no specific
 * line, so it lands on an honest topic pointer — not an answer. Erik chose to close that gap the
 * on-principle way: NOT by having a model author the theology (the path he declined — contested
 * positions, no review), but by ENRICHING the KB with definitional content the ustadz reviews.
 *
 * THE BRIGHT LINE — the app authors NOTHING here. Every `answer` is Ustadz Ahmad Isrofiel
 * Mardlatillah's own, transcribed verbatim from `docs/review/aqidah-review.md` after he authors it.
 * The verses are the Qur'an's; the app only frames, surfaces, and cites. This is the same law that
 * governs every other scholarship surface (peta.ts, problem-verses.ts): the scholar authors, a
 * developer transcribes, the app displays. No model, no synthesis, no app-voice theology.
 *
 * SHIP STATE. Every entry below is a PENDING STUB — `answer: ""`, `refs: []`. `matchAqidah` returns
 * ONLY reviewed entries, so until the ustadz fills the sheet this lane renders nothing and the app
 * degrades to today's honest topic pointer. The stubs carry the QUESTION (ours — which questions to
 * ask) and CANDIDATE verse anchors (`suggestedRefs`, which the ustadz may edit) to seed the sheet.
 */
import { displayName, surahMeta } from "./quran.ts";
import { norm } from "./retrieve.ts";

export interface AqidahRef {
  readonly surah: number;
  readonly ayah: number;
}

export interface AqidahEntry {
  /** Stable id — persisted in the thread and re-derived at render time. Never reuse an id. */
  readonly id: string;
  /** Peta slug for a "Telusuri lebih lanjut" deep-link, or null when no single topic fits. */
  readonly topic: string | null;
  /** The canonical broad question — shown to the ustadz on the review sheet. */
  readonly question: string;
  /** Match keys: each is a set of words that must all appear in the question (order-independent). */
  readonly aliases: readonly string[];
  /** Candidate verse anchors we propose. The ustadz may replace or extend these — not binding. */
  readonly suggestedRefs: readonly AqidahRef[];
  /** Optional note surfaced on the review sheet (e.g. flags a theologically sensitive question). */
  readonly note?: string;
  /**
   * The ustadz's VERBATIM answer. Empty string = pending review — never rendered, never matched.
   * Paragraphs are separated by a blank line; the renderer splits on it. Reworded by no one.
   */
  readonly answer: string;
  /** The APPROVED verse anchors. Empty until the ustadz confirms them. */
  readonly refs: readonly AqidahRef[];
}

/**
 * The lane. Every entry is a PENDING STUB (answer: "", refs: []) until Ustadz Ahmad Isrofiel
 * authors it via `docs/review/aqidah-review.md` and a developer transcribes it back here. Adding a
 * reviewed answer here is the ONLY way one goes live — see build-aqidah-sheet.ts for the workflow.
 */
export const AQIDAH: readonly AqidahEntry[] = [
  {
    id: "siapa-allah",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Siapakah Allah?",
    aliases: ["siapa allah", "allah itu siapa", "kenal allah"],
    suggestedRefs: [{ surah: 112, ayah: 1 }, { surah: 112, ayah: 2 }, { surah: 112, ayah: 3 }, { surah: 112, ayah: 4 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-tauhid",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Apa itu tauhid (mengesakan Allah)?",
    aliases: ["tauhid", "mengesakan allah"],
    suggestedRefs: [{ surah: 112, ayah: 1 }, { surah: 2, ayah: 163 }, { surah: 47, ayah: 19 }],
    answer: "",
    refs: [],
  },
  {
    id: "di-mana-allah",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Di mana Allah?",
    aliases: ["di mana allah", "dimana allah", "tempat allah"],
    // Deliberately sparse — this touches a contested position (istiwa'). We propose nothing beyond
    // the two least-disputed verses and defer the stance entirely to the ustadz.
    suggestedRefs: [{ surah: 2, ayah: 115 }, { surah: 50, ayah: 16 }],
    note: "Pertanyaan sensitif secara akidah (istiwa'). Mohon Ustadz tetapkan sikap dan ayat rujukan yang tepat; kami tidak mengusulkan apa pun di luar dua ayat paling disepakati.",
    answer: "",
    refs: [],
  },
  {
    id: "siapa-muhammad",
    topic: "muhammad-shallallahu-alaihi-wasallam",
    question: "Siapakah Nabi Muhammad?",
    aliases: ["nabi muhammad", "siapa muhammad", "muhammad itu siapa"],
    suggestedRefs: [{ surah: 33, ayah: 40 }, { surah: 21, ayah: 107 }, { surah: 48, ayah: 29 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-alquran",
    topic: "al-qur-an-taurat-injil-dan-zabur",
    question: "Apa itu Al-Qur'an?",
    // Cover all three spellings: norm("Al-Qur'an") → tokens {al,qur,an}; "alquran" → {alquran};
    // "quran"/"al quran" → {quran}. Word-subset needs each spelling represented as its own alias.
    aliases: ["quran", "alquran", "al qur an"],
    suggestedRefs: [{ surah: 2, ayah: 2 }, { surah: 17, ayah: 9 }, { surah: 15, ayah: 9 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-iman",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Apa itu iman?",
    aliases: ["iman"],
    suggestedRefs: [{ surah: 2, ayah: 285 }, { surah: 49, ayah: 15 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-takwa",
    topic: "membangun-pribadi-shalih",
    question: "Apa itu takwa?",
    aliases: ["takwa"],
    suggestedRefs: [{ surah: 2, ayah: 2 }, { surah: 49, ayah: 13 }],
    answer: "",
    refs: [],
  },
  {
    id: "jumlah-nabi-rasul",
    topic: null,
    question: "Ada berapa jumlah nabi dan rasul?",
    aliases: ["jumlah nabi rasul", "berapa jumlah nabi", "berapa jumlah rasul", "berapa nabi rasul"],
    // Deliberately sparse — like di-mana-allah, this is a "jumlah pasti" question where the popular
    // total rests on a hadith graded WEAK (ضعيف) by Ibn Baz, Ibn 'Utsaimin, and al-Albani (sourced,
    // ranked, in docs/review/jumlah-nabi-rasul-evidence.md via the Dorar encyclopedia). We propose
    // ONLY the solid Qur'anic anchors — the naming lists and the two ayat stating not all messengers
    // were named to us — and take NO stance on a total. Until the ustadz authors this, it stays a
    // pending stub: matchAqidah returns nothing and the app degrades to the honest count-defer.
    suggestedRefs: [{ surah: 4, ayah: 164 }, { surah: 40, ayah: 78 }, { surah: 6, ayah: 83 }, { surah: 4, ayah: 163 }],
    note: "Pertanyaan 'jumlah pasti' yang sensitif. Yang tetap dari Al-Qur'an: 25 nabi disebut namanya, dan Allah menegaskan ada rasul yang TIDAK diceritakan kepada kita (QS 4:164, 40:78). Angka populer '124.000 nabi / 315 rasul' berasal dari hadits (Abu Dzar/Abu Umamah) yang DINILAI LEMAH (ضعيف) oleh Ibnu Baz, tidak dikuatkan Ibnu 'Utsaimin, dan disebut lemah sanadnya oleh Al-Albani — bukti berperingkat dari Ensiklopedia Dorar di docs/review/jumlah-nabi-rasul-evidence.md. Mohon Ustadz menetapkan sikap dan redaksinya; kami tidak mengarang angka.",
    answer: "",
    refs: [],
  },
];

/** A stub is live ONLY when the ustadz has authored both a prose answer and confirmed its verses. */
export const isReviewed = (e: AqidahEntry): boolean => e.answer.trim().length > 0 && e.refs.length > 0;

/** Display form + resolvability for a ref, computed against the real mushaf bounds (never guessed). */
export function aqidahRef(r: AqidahRef): { ref: string; resolvable: boolean } {
  const m = surahMeta(r.surah);
  const resolvable = !!m && r.ayah >= 1 && r.ayah <= m.ayahs;
  return { ref: `QS. ${displayName(r.surah)}, ${r.surah}:${r.ayah}`, resolvable };
}

/** Look an entry up by id — for re-deriving a persisted turn. Returns null if it no longer exists. */
export const aqidahById = (id: string): AqidahEntry | null => AQIDAH.find((e) => e.id === id) ?? null;

/**
 * Strip Indonesian's interrogative/emphatic enclitic `-kah` so "siapakah" matches an alias built on
 * "siapa", "apakah"→"apa", "dimanakah"→"dimana". Only fires on a ≥3-letter stem + word-final "kah",
 * so "allah" (no "kah") and short words are untouched. This is why "siapakah Nabi Muhammad?" — where
 * the "kah" sat between "siapa" and "nabi" — previously slipped past a plain substring match.
 */
const stripKah = (s: string): string => s.replace(/([a-z]{3,})kah\b/g, "$1");

/** Enclitic-stripped whole-word token set of a phrase — the unit alias matching works over. */
const tokens = (s: string): Set<string> => new Set(stripKah(norm(s)).split(/[\s-]+/).filter(Boolean));

/**
 * Does the question hit any of these aliases? Word-SUBSET, not substring: an alias matches when every
 * one of its words is present in the question (order-independent, tolerant of inserted words). This
 * is why the alias "siapa allah" matches "siapa Allah?", "siapakah Allah?", and "Allah itu siapa?"
 * alike — substring matching was order-sensitive and missed some. Exported so the logic is testable
 * independent of whether the shipped lane happens to be reviewed yet.
 */
export const aliasHit = (question: string, aliases: readonly string[]): boolean => {
  const q = tokens(question);
  if (q.size === 0) return false;
  return aliases.some((a) => {
    const aw = [...tokens(a)];
    return aw.length > 0 && aw.every((w) => q.has(w));
  });
};

/**
 * Match a broad definitional question to a REVIEWED aqidah entry, or null. Conservative: an alias
 * must appear in the question, and pending (unreviewed) stubs never match — so an unfilled lane
 * simply returns null and the caller's honest pointer stands.
 */
export function matchAqidah(question: string): AqidahEntry | null {
  for (const e of AQIDAH) if (isReviewed(e) && aliasHit(question, e.aliases)) return e;
  return null;
}
