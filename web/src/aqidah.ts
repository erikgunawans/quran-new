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
  /** Normalized-phrase variants a user might type. Conservative: matched as whole phrases. */
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
    aliases: ["siapa allah", "siapakah allah", "allah itu siapa", "allah siapa", "kenal allah"],
    suggestedRefs: [{ surah: 112, ayah: 1 }, { surah: 112, ayah: 2 }, { surah: 112, ayah: 3 }, { surah: 112, ayah: 4 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-tauhid",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Apa itu tauhid (mengesakan Allah)?",
    aliases: ["apa itu tauhid", "arti tauhid", "makna tauhid", "mengesakan allah", "tauhid itu apa"],
    suggestedRefs: [{ surah: 112, ayah: 1 }, { surah: 2, ayah: 163 }, { surah: 47, ayah: 19 }],
    answer: "",
    refs: [],
  },
  {
    id: "di-mana-allah",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Di mana Allah?",
    aliases: ["di mana allah", "dimana allah", "allah ada di mana", "allah dimana", "tempat allah"],
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
    aliases: ["siapa muhammad", "siapa nabi muhammad", "siapakah muhammad", "nabi muhammad siapa", "muhammad itu siapa"],
    suggestedRefs: [{ surah: 33, ayah: 40 }, { surah: 21, ayah: 107 }, { surah: 48, ayah: 29 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-alquran",
    topic: "al-qur-an-taurat-injil-dan-zabur",
    question: "Apa itu Al-Qur'an?",
    aliases: ["apa itu al quran", "apa itu alquran", "apa itu quran", "al quran itu apa", "alquran itu apa"],
    suggestedRefs: [{ surah: 2, ayah: 2 }, { surah: 17, ayah: 9 }, { surah: 15, ayah: 9 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-iman",
    topic: "allah-subhanahu-wa-ta-ala",
    question: "Apa itu iman?",
    aliases: ["apa itu iman", "arti iman", "makna iman", "iman itu apa"],
    suggestedRefs: [{ surah: 2, ayah: 285 }, { surah: 49, ayah: 15 }],
    answer: "",
    refs: [],
  },
  {
    id: "apa-itu-takwa",
    topic: "membangun-pribadi-shalih",
    question: "Apa itu takwa?",
    aliases: ["apa itu takwa", "arti takwa", "makna takwa", "takwa itu apa"],
    suggestedRefs: [{ surah: 2, ayah: 2 }, { surah: 49, ayah: 13 }],
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
 * Match a broad definitional question to a REVIEWED aqidah entry, or null. Conservative: an alias
 * phrase must appear whole in the normalized question, and pending (unreviewed) stubs never match —
 * so an unfilled lane simply returns null and the caller's honest pointer stands.
 */
export function matchAqidah(question: string): AqidahEntry | null {
  const q = norm(question);
  if (!q) return null;
  for (const e of AQIDAH) {
    if (!isReviewed(e)) continue;
    for (const a of e.aliases) if (q.includes(norm(a))) return e;
  }
  return null;
}
