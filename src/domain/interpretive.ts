/**
 * Interpretive domain model.
 *
 * Everything here is HUMAN OPINION about scripture — never scripture itself, and never
 * machine-generated. Per the spec (Part 1), interpretive nodes are plural, attributed,
 * and carry provenance. The system surfaces them side by side and NEVER arbitrates
 * between them.
 *
 * Note the deliberate asymmetry with canonical.ts: a canonical node needs no source_id
 * (the Qur'an is the source). An interpretive node without a source_id is a provenance
 * hole, and the gates reject it.
 */

import type { AyahId } from "./canonical.ts";

export const TRUTH_INTERPRETIVE = "interpretive" as const;

export type TafsirSourceId = `source:${string}`;
export type TafsirPassageId = `tp:${string}:${number}:${number}`;

export const tafsirSourceId = (slug: string): TafsirSourceId => `source:${slug}`;
export const tafsirPassageId = (slug: string, surah: number, ayah: number): TafsirPassageId =>
  `tp:${slug}:${surah}:${ayah}`;

/**
 * How much weight a source carries — NOT a claim that a lower tier is "wrong".
 * Tiering is a scholar-board decision, recorded here; engineers do not set it.
 *
 *   1 — classical, broadly accepted across schools
 *   2 — modern, mainstream, widely taught
 *   3 — contemporary or contested; always shown WITH its attribution and caveat
 */
export type AuthorityTier = 1 | 2 | 3;

export interface TafsirSource {
  readonly id: TafsirSourceId;
  readonly truth_class: typeof TRUTH_INTERPRETIVE;
  readonly name: string;
  readonly author: string;
  readonly lang: string;
  /** Rough era, for display and for ordering plural views. */
  readonly era: string;
  readonly authority_tier: AuthorityTier;
  /** Free-text note surfaced in the UI when a source is contested. */
  readonly note?: string;
}

export interface TafsirPassage {
  readonly id: TafsirPassageId;
  readonly truth_class: typeof TRUTH_INTERPRETIVE;
  readonly source_id: TafsirSourceId;
  readonly ayah_id: AyahId;
  readonly surah_number: number;
  readonly ayah_number: number;
  readonly text: string;
  readonly text_lang: string;
}

export interface InterpretiveDataset {
  readonly tafsir_sources: readonly TafsirSource[];
  readonly tafsir_passages: readonly TafsirPassage[];
}
