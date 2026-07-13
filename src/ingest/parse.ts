import {
  TRUTH_CANONICAL,
  ayahId,
  surahId,
  translationId,
  type Ayah,
  type RevelationType,
  type Surah,
  type Translation,
} from "../domain/canonical.ts";
import type { Source } from "./sources.ts";

/** One `surah|ayah|text` record, straight from a Tanzil pipe file. */
export interface VerseRecord {
  readonly surah: number;
  readonly ayah: number;
  readonly text: string;
}

const SURA_TAG = /<sura\s+([^>]*?)\/>/g;
const ATTR = /(\w+)\s*=\s*"([^"]*)"/g;

function attrs(fragment: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of fragment.matchAll(ATTR)) {
    const [, k, v] = m;
    if (k !== undefined && v !== undefined) out[k] = v;
  }
  return out;
}

function requireAttr(a: Record<string, string>, key: string, ctx: string): string {
  const v = a[key];
  if (v === undefined || v === "") throw new Error(`${ctx}: missing attribute "${key}"`);
  return v;
}

function toInt(raw: string, key: string, ctx: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`${ctx}: attribute "${key}" is not an integer: ${raw}`);
  return n;
}

function revelationType(raw: string, ctx: string): RevelationType {
  const t = raw.trim().toLowerCase();
  if (t === "meccan" || t === "medinan") return t;
  throw new Error(`${ctx}: unrecognized revelation type "${raw}"`);
}

/**
 * Parse Tanzil's quran-data.xml into Surah nodes.
 *
 * The file is a pinned, checksummed artifact with a flat, fixed shape (114 self-closing
 * <sura/> tags), so attribute extraction is sufficient and dependency-free. The checksum
 * gate in fetch.ts is what makes this safe: if the shape ever changes, the pin fails first
 * and we never reach this parser with unexpected bytes.
 */
export function parseSurahMetadata(xml: string): Surah[] {
  const surahs: Surah[] = [];

  for (const match of xml.matchAll(SURA_TAG)) {
    const fragment = match[1];
    if (fragment === undefined) continue;
    const a = attrs(fragment);
    const ctx = `sura index=${a["index"] ?? "?"}`;

    const number = toInt(requireAttr(a, "index", ctx), "index", ctx);
    surahs.push({
      id: surahId(number),
      truth_class: TRUTH_CANONICAL,
      number,
      name_ar: requireAttr(a, "name", ctx),
      name_translit: requireAttr(a, "tname", ctx),
      name_en: requireAttr(a, "ename", ctx),
      revelation_type: revelationType(requireAttr(a, "type", ctx), ctx),
      order_revealed: toInt(requireAttr(a, "order", ctx), "order", ctx),
      ayah_count: toInt(requireAttr(a, "ayas", ctx), "ayas", ctx),
      ruku_count: toInt(requireAttr(a, "rukus", ctx), "rukus", ctx),
    });
  }

  if (surahs.length === 0) throw new Error("quran-data.xml: no <sura> entries found");
  return surahs.sort((x, y) => x.number - y.number);
}

/**
 * Parse a Tanzil pipe file (`surah|ayah|text`).
 *
 * Blank lines and `#` comment//trailer lines are skipped. Any other malformed line is a
 * hard error — we never silently drop a verse.
 */
export function parseVerseFile(content: string, label: string): VerseRecord[] {
  const records: VerseRecord[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] ?? "").trim();
    if (raw === "" || raw.startsWith("#")) continue;

    const first = raw.indexOf("|");
    const second = raw.indexOf("|", first + 1);
    if (first < 1 || second < 0) {
      throw new Error(`${label}:${i + 1}: malformed line (expected "surah|ayah|text"): ${raw.slice(0, 60)}`);
    }

    const surah = Number(raw.slice(0, first));
    const ayah = Number(raw.slice(first + 1, second));
    const text = raw.slice(second + 1).trim();

    if (!Number.isInteger(surah) || !Number.isInteger(ayah)) {
      throw new Error(`${label}:${i + 1}: non-integer surah/ayah reference`);
    }
    if (text === "") throw new Error(`${label}:${i + 1}: empty text for ${surah}:${ayah}`);

    records.push({ surah, ayah, text });
  }

  if (records.length === 0) throw new Error(`${label}: no verse records found`);
  return records;
}

export function toAyahs(records: readonly VerseRecord[]): Ayah[] {
  return records.map((r) => ({
    id: ayahId(r.surah, r.ayah),
    truth_class: TRUTH_CANONICAL,
    surah_number: r.surah,
    ayah_number: r.ayah,
    text_uthmani: r.text,
  }));
}

/** Literal (harfiyah) translations only — these are the canonical ones. */
export function toTranslations(records: readonly VerseRecord[], source: Source): Translation[] {
  const { lang, translator, translation_type } = source;
  if (!lang || !translator) {
    throw new Error(`source ${source.id}: translation sources must declare lang and translator`);
  }
  if (translation_type !== "literal") {
    throw new Error(
      `source ${source.id}: toTranslations() emits canonical (literal) translations only — ` +
        `interpretive translations carry provenance and must go through parseTafsiriyahDump()`,
    );
  }
  const slug = source.id.replace(/^tanzil-[a-z]{2}-/, "");
  return records.map((r) => ({
    id: translationId(slug, r.surah, r.ayah),
    truth_class: TRUTH_CANONICAL,
    translation_type: "literal" as const,
    ayah_id: ayahId(r.surah, r.ayah),
    lang,
    translator,
    text: r.text,
  }));
}
