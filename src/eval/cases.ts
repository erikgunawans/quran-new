/**
 * The offline eval set for the framing ("bridge") voice.
 *
 * These are REAL-shaped phrases — how an Indonesian actually types a feeling at 2am: lowercase,
 * run-on, casual, sometimes a typo. Each is labelled with the feeling retrieval should land on; the
 * harness feeds {phrase, theme} to the SAME prompt + params prod uses (buildFramingUserMessage /
 * FRAMING_PARAMS) and scores the bridge it writes.
 *
 * WHY LABELLED THEMES, not live retrieval. Phase 2 tunes the FRAMING PROMPT. Feeding a known-correct
 * theme isolates "is the bridge warm and human?" from "did retrieval pick the right feeling?" (a
 * separate concern). Keep the theme strings EXACTLY as they appear in retrieve.ts `OPENERS`.
 */
export interface EvalCase {
  readonly id: string;
  /** How a person actually types it. */
  readonly phrase: string;
  /** The feeling retrieval should detect — drives the framing. Must match a retrieve.ts theme key. */
  readonly theme: string;
  /** >1 when the person named several things at once (changes the user message). Default 1. */
  readonly themeCount?: number;
  /** What this case is probing. */
  readonly note?: string;
}

export const CASES: readonly EvalCase[] = [
  // ── Hardship & ease ──────────────────────────────────────────────────────────
  { id: "hardship-1", phrase: "aku udah gak kuat, semua terasa berat banget akhir-akhir ini", theme: "Hardship & ease" },
  { id: "hardship-2", phrase: "capek banget rasanya jalanin hidup gini terus", theme: "Hardship & ease" },
  // ── Anxiety & fear ───────────────────────────────────────────────────────────
  { id: "anxiety-1", phrase: "cemas terus tiap malam, gabisa tidur mikirin banyak hal", theme: "Anxiety & fear" },
  { id: "anxiety-2", phrase: "takut banget sama masa depan, kayak semuanya bakal gagal", theme: "Anxiety & fear" },
  // ── Grief & loss ─────────────────────────────────────────────────────────────
  { id: "grief-1", phrase: "baru kehilangan ibu, rasanya kosong banget", theme: "Grief & loss" },
  { id: "grief-2", phrase: "ditinggal orang yang paling aku sayang, gatau caranya lanjut", theme: "Grief & loss" },
  // ── Patience ─────────────────────────────────────────────────────────────────
  { id: "patience-1", phrase: "capek nunggu, udah sabar lama tapi belum ada hasilnya", theme: "Patience" },
  { id: "patience-2", phrase: "susah banget buat tetep sabar sama keadaan sekarang", theme: "Patience" },
  // ── Forgiveness & despair ────────────────────────────────────────────────────
  { id: "forgive-1", phrase: "aku ngerasa dosaku terlalu banyak, apa masih bisa diampuni", theme: "Forgiveness & despair" },
  { id: "forgive-2", phrase: "udah jauh banget dari Allah, malu rasanya mau balik", theme: "Forgiveness & despair" },
  // ── Provision & debt ─────────────────────────────────────────────────────────
  { id: "debt-1", phrase: "lagi banyak utang, stress mikirin gimana bayarnya", theme: "Provision & debt" },
  { id: "debt-2", phrase: "gaji abis terus tiap bulan, sesak napas mikirin kebutuhan", theme: "Provision & debt" },
  // ── Trust in God ─────────────────────────────────────────────────────────────
  { id: "trust-1", phrase: "bingung harus ngambil keputusan apa, takut salah langkah", theme: "Trust in God" },
  { id: "trust-2", phrase: "susah banget buat pasrah dan percaya semua bakal baik", theme: "Trust in God" },
  // ── Gratitude ────────────────────────────────────────────────────────────────
  { id: "grateful-1", phrase: "pengen belajar bersyukur tapi susah pas lagi banyak masalah", theme: "Gratitude" },
  { id: "grateful-2", phrase: "hari ini ada hal kecil yang bikin aku bersyukur", theme: "Gratitude" },
  // ── Prayer answered ──────────────────────────────────────────────────────────
  { id: "prayer-1", phrase: "udah lama berdoa tapi kayak gak dijawab-jawab", theme: "Prayer answered" },
  { id: "prayer-2", phrase: "apa doaku bener-bener didengar ya, aku mulai ragu", theme: "Prayer answered" },
  // ── Mercy ────────────────────────────────────────────────────────────────────
  { id: "mercy-1", phrase: "pengen ngerasa disayang sama Allah, lagi berat banget sendirian", theme: "Mercy" },
  { id: "mercy-2", phrase: "butuh diingetin aja kalau aku gak sendirian", theme: "Mercy" },
  // ── Self-worth & purpose ─────────────────────────────────────────────────────
  { id: "worth-1", phrase: "ngerasa gak berharga, kayak gaada gunanya aku hidup", theme: "Self-worth & purpose" },
  { id: "worth-2", phrase: "kayak gagal terus, ngerasa gaguna buat siapa-siapa", theme: "Self-worth & purpose" },
  // ── Family ───────────────────────────────────────────────────────────────────
  { id: "family-1", phrase: "lagi berantem sama orang tua, capek sama drama keluarga", theme: "Family" },
  { id: "family-2", phrase: "keluarga tuh bikin capek tapi tetep kangen juga", theme: "Family" },
  // ── Edge cases ───────────────────────────────────────────────────────────────
  { id: "multi-1", phrase: "capek, banyak utang, cemas, dan berasa sendirian semua sekaligus", theme: "Hardship & ease", themeCount: 3, note: "several feelings at once — the '(dan N hal lain)' path" },
  { id: "short-1", phrase: "capek", theme: "Hardship & ease", note: "one word — the model has almost nothing to meet" },
  { id: "typo-1", phrase: "gua lg sedih bgt gr2 putus sm pacar", theme: "Grief & loss", note: "heavy slang/typos — does the warmth survive the register?" },
];
