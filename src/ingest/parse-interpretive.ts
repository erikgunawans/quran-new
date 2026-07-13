import { ayahId, translationId, type Translation } from "../domain/canonical.ts";
import {
  TRUTH_INTERPRETIVE,
  tafsirPassageId,
  tafsirSourceId,
  type TafsirPassage,
  type TafsirSource,
} from "../domain/interpretive.ts";
import type { Source } from "./sources.ts";

/**
 * Strip markup and normalize whitespace.
 *
 * Presentation only — we remove HTML tags and collapse whitespace so the text is usable as
 * a prompt context and as an `evidence_span` target. We do NOT paraphrase, summarize, or
 * otherwise alter wording: the passage must stay quotable verbatim, because Part 2's
 * substring check verifies every extracted claim against this exact text.
 */
export function cleanText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function requireInterpretiveMeta(source: Source): {
  slug: string;
  author: string;
  lang: string;
  era: string;
  tier: 1 | 2 | 3;
} {
  const { source_slug, author, lang, era, authority_tier } = source;
  if (!source_slug || !author || !lang || !era || !authority_tier) {
    throw new Error(
      `source ${source.id}: interpretive sources must declare source_slug, author, lang, era, ` +
        `and authority_tier — an unattributed opinion is a provenance hole`,
    );
  }
  return { slug: source_slug, author, lang, era, tier: authority_tier };
}

export function toTafsirSource(source: Source): TafsirSource {
  const m = requireInterpretiveMeta(source);
  return {
    id: tafsirSourceId(m.slug),
    truth_class: TRUTH_INTERPRETIVE,
    name: source.attribution,
    author: m.author,
    lang: m.lang,
    era: m.era,
    authority_tier: m.tier,
    ...(source.note ? { note: source.note } : {}),
  };
}

interface SurahBundleEntry {
  surah: number;
  payload: unknown;
}

function bundle(json: string, label: string): SurahBundleEntry[] {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${label}: expected a surah bundle array`);
  return parsed as SurahBundleEntry[];
}

/**
 * Parse a spa5k/tafsir_api dump: per surah, an array of `{surah, ayah, text}`.
 *
 * Empty passages are DROPPED, not fabricated. A tafsir legitimately may not comment on
 * every ayah, and coverage is reported by the gates rather than forced to 6,236.
 */
export function parseTafsirDump(json: string, source: Source): TafsirPassage[] {
  const m = requireInterpretiveMeta(source);
  const out: TafsirPassage[] = [];

  for (const entry of bundle(json, source.file)) {
    const rows = entry.payload;
    if (!Array.isArray(rows)) continue;
    for (const row of rows as { surah?: number; ayah?: number; text?: string }[]) {
      const surah = row.surah ?? entry.surah;
      const ayah = row.ayah;
      const text = cleanText(String(row.text ?? ""));
      if (!Number.isInteger(surah) || !Number.isInteger(ayah) || text === "") continue;
      out.push({
        id: tafsirPassageId(m.slug, surah!, ayah!),
        truth_class: TRUTH_INTERPRETIVE,
        source_id: tafsirSourceId(m.slug),
        ayah_id: ayahId(surah!, ayah!),
        surah_number: surah!,
        ayah_number: ayah!,
        text,
        text_lang: m.lang,
      });
    }
  }

  if (out.length === 0) throw new Error(`${source.file}: no tafsir passages parsed (empty edition?)`);
  return out;
}

/**
 * Parse the QuranKu Tafsiriyah dump into INTERPRETIVE translations.
 *
 * Shape: [{ surah, payload: { data: { verses: [{ verseNumber, translations: { terjemahTafsiriyah } }] } } }]
 *
 * Note we take ONLY the translation text. The Arabic in this payload is ignored — canonical
 * Arabic comes from Tanzil, which is checksummed and authoritative. Smaller trust surface.
 */
export function parseTafsiriyahDump(json: string, source: Source): Translation[] {
  const m = requireInterpretiveMeta(source);
  const { translator, translation_type } = source;
  if (!translator || translation_type !== "interpretive") {
    throw new Error(`source ${source.id}: expected an interpretive translation source`);
  }

  const out: Translation[] = [];
  for (const entry of bundle(json, source.file)) {
    const payload = entry.payload as
      | { data?: { verses?: { verseNumber?: number; translations?: Record<string, string> }[] } }
      | undefined;
    const verses = payload?.data?.verses ?? [];

    for (const v of verses) {
      const ayah = v.verseNumber;
      const text = cleanText(String(v.translations?.["terjemahTafsiriyah"] ?? ""));
      if (!Number.isInteger(ayah) || text === "") continue;
      out.push({
        id: translationId(m.lang, entry.surah, ayah!),
        truth_class: TRUTH_INTERPRETIVE,
        translation_type: "interpretive",
        ayah_id: ayahId(entry.surah, ayah!),
        lang: m.lang,
        translator,
        text,
        source_id: tafsirSourceId(m.slug),
        authority_tier: m.tier,
        ...(source.note ? { note: source.note } : {}),
      });
    }
  }

  if (out.length === 0) throw new Error(`${source.file}: no Tafsiriyah translations parsed`);
  return out;
}
