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
export const translationId = (lang: string, surah: number, ayah: number): TranslationId =>
  `translation:${lang}:${surah}:${ayah}`;

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

export interface Translation {
  readonly id: TranslationId;
  readonly truth_class: typeof TRUTH_CANONICAL;
  readonly ayah_id: AyahId;
  readonly lang: string;
  /** Named human translator/body — never a model. */
  readonly translator: string;
  readonly text: string;
}

export interface CanonicalDataset {
  readonly surahs: readonly Surah[];
  readonly ayahs: readonly Ayah[];
  readonly translations: readonly Translation[];
}
