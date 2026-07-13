/**
 * Canonical domain model.
 *
 * Everything in this file is `truth_class: "canonical"` — the Arabic text, the
 * surah structure, and verified translations. Per the spec (docs/design/quran-graphrag.html,
 * Part 1), canonical data is IMPORTED from trusted structured datasets and is never
 * authored, rewritten, or inferred by an LLM. No model touches any value here.
 */

export const TRUTH_CANONICAL = "canonical" as const;

/** The Qur'an's fixed shape. These are invariants, not configuration. */
export const SURAH_COUNT = 114;
export const AYAH_COUNT = 6236;

export type RevelationType = "meccan" | "medinan";

/** Stable, human-readable, deterministic IDs — so rebuilds are idempotent and diffable. */
export type SurahId = `surah:${number}`;
export type AyahId = `ayah:${number}:${number}`;
export type TranslationId = `translation:${string}:${number}:${number}`;

export const surahId = (surah: number): SurahId => `surah:${surah}`;
export const ayahId = (surah: number, ayah: number): AyahId => `ayah:${surah}:${ayah}`;

/**
 * Keyed on the SOURCE slug, not the language — Kemenag and Tarjamah Tafsiriyah are both
 * `id`, and keying on language would silently collide them into one node. Two translations
 * of the same verse must remain two distinct, separately-attributed nodes. That is the
 * whole point of plural attribution.
 */
export const translationId = (slug: string, surah: number, ayah: number): TranslationId =>
  `translation:${slug}:${surah}:${ayah}`;

export interface Surah {
  readonly id: SurahId;
  readonly truth_class: typeof TRUTH_CANONICAL;
  readonly number: number;
  readonly name_ar: string;
  /** Latin transliteration, e.g. "Al-Baqara". */
  readonly name_translit: string;
  readonly name_en: string;
  readonly revelation_type: RevelationType;
  /** Chronological order of revelation (1..114), distinct from mushaf order. */
  readonly order_revealed: number;
  readonly ayah_count: number;
  readonly ruku_count: number;
}

export interface Ayah {
  readonly id: AyahId;
  readonly truth_class: typeof TRUTH_CANONICAL;
  readonly surah_number: number;
  readonly ayah_number: number;
  /** Uthmani script, with diacritics and pause marks as published by the source. */
  readonly text_uthmani: string;
}

/**
 * Literal vs interpretive translation.
 *
 * This distinction exists because "Tarjamah Tafsiriyah" (Ustadz Muhammad Thalib) forced it.
 * A *literal* (harfiyah) translation renders the words — Kemenag's does. An *interpretive*
 * (tafsiriyah) translation renders the meaning as its author understands it, folding exegesis
 * INTO the translated text. Example, 1:3 "Ar-Rahman Ar-Rahim":
 *
 *   literal      (Kemenag)    "Yang Maha Pengasih, Maha Penyayang"
 *   interpretive (Tafsiriyah) "...belas kasih-Nya kepada orang mukmin, serta Maha Penyayang
 *                              kepada semua makhluk-Nya"
 *
 * The second is an exegetical claim wearing a translation's clothes. It is therefore NOT
 * canonical: it is opinion, it must be attributed, and it may never be presented as the
 * plain meaning of the verse. Only `literal` translations may be truth_class "canonical";
 * the gates enforce this and there is no override.
 */
export type TranslationType = "literal" | "interpretive";

export interface Translation {
  readonly id: TranslationId;
  /** "canonical" iff translation_type === "literal". Enforced by validateCanonical. */
  readonly truth_class: typeof TRUTH_CANONICAL | "interpretive";
  readonly translation_type: TranslationType;
  readonly ayah_id: AyahId;
  readonly lang: string;
  /** Named human translator/body — never a model. */
  readonly translator: string;
  readonly text: string;
  /** Required for interpretive translations; absent for literal ones. */
  readonly source_id?: string;
  /** Required for interpretive translations. Set by the scholar board, not by engineers. */
  readonly authority_tier?: 1 | 2 | 3;
  /** Surfaced in the UI when a source is contested. */
  readonly note?: string;
}

export interface CanonicalDataset {
  readonly surahs: readonly Surah[];
  readonly ayahs: readonly Ayah[];
  readonly translations: readonly Translation[];
}
