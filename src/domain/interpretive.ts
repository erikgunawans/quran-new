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
 * Scholarly weight when GROUNDING A DOCTRINAL CLAIM — and nothing else.
 * A scholar-board decision, recorded here; engineers do not set it.
 *
 *   1 — classical, broadly accepted across schools
 *   2 — modern, mainstream, widely taught
 *   3 — contemporary; still finding its place in scholarly consensus
 *
 * A lower tier is NOT a claim that a source is wrong, and it says NOTHING about how
 * prominently a source is shown. See DisplayRole: the two axes are orthogonal, and
 * conflating them makes a product either dishonest or unreadable.
 */
export type AuthorityTier = 1 | 2 | 3;

/**
 * Prominence in the READING EXPERIENCE — a product decision, not a doctrinal one.
 *
 * This axis exists because of the mission: make the Qur'an understandable and
 * heart-reaching. A literal rendering nobody can feel their way into fails that mission
 * however officially sanctioned it is. So the reading surface may LEAD with a
 * meaning-based (tafsiriyah) translation, while doctrinal CLAIMS stay grounded in the
 * higher-tier tafsir corpus.
 *
 *   primary   — the default rendering. The product's voice.
 *   companion — always one tap away for comparison. Never removed, never buried.
 *   reference — grounding material behind cited answers; not the reading surface.
 */
export type DisplayRole = "primary" | "companion" | "reference";

export interface TafsirSource {
  readonly id: TafsirSourceId;
  readonly truth_class: typeof TRUTH_INTERPRETIVE;
  readonly name: string;
  readonly author: string;
  readonly lang: string;
  /** Rough era, for display and for ordering plural views. */
  readonly era: string;
  readonly authority_tier: AuthorityTier;
  readonly display_role: DisplayRole;
  /** Shown with the source. States what it is plainly — a description, not a disclaimer. */
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
