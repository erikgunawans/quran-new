#!/usr/bin/env bun
/**
 * Build the thematic index shards for the "Indeks Tematik" display surface.
 *
 * This script exists to encode a rights boundary, not to "clean up" data. We have permission to
 * display the published index authored by the late Ustadz Muhammad Thalib's team; we do not have
 * permission to rewrite it, silently correct it, or publish repaired citations in the author's
 * name. That constraint drives the whole build:
 *
 * - entry text is copied byte-identically
 * - the published display ref string is preserved as-is
 * - citations are expanded deterministically from the parsed source data
 * - known bad ayah references are marked `resolvable: false`, never "fixed"
 * - any drift in counts, slug uniqueness, bridge coverage, or output size fails loudly before write
 *
 * The output is intentionally split into a small landing manifest plus per-category shards. The
 * landing route needs provenance and aggregate counts, but not entry text; the category routes need
 * the full entry payload, bridge metadata, and the original citation strings.
 *
 * Run:
 *   bun run app:peta
 */
import { mkdir } from "node:fs/promises";

const INPUT_JSON = "docs/reference/indeks-tematik/indeks-tematik.json";
const SURAH_DIR = "web/public/surah";
const OUT_DIR = "web/public/peta";
const OUT_INDEX = `${OUT_DIR}/index.json`;

const SOURCE = {
  title: "Indeks Tematik",
  author: "Ustadz Muhammad Thalib",
  url: "https://quran.tarjamahtafsiriyah.com/",
} as const;

const EXPECTED = {
  categories: 13,
  subtopics: 42,
  nullSubtopics: 5,
  entries: 2451,
  citations: 2633,
  distinctVerses: 1632,
  bridgeVerses: 518,
} as const;

const EXPECTED_UNRESOLVABLE = new Set(["8:96", "8:77", "48:59", "11:161"]);
const INDEX_LIMIT_BYTES = 4 * 1024;
const SHARD_LIMIT_BYTES = 120 * 1024;

type RawSecondary = { surah: number; ayah_start: number; ayah_end?: number };
type RawParsed = {
  surah_name: string;
  surah: number;
  ayah_start: number;
  ayah_end: number;
  multi: boolean;
  secondary?: RawSecondary[];
};
type RawEntry = { text: string; ref: string; parsed: RawParsed };
type RawSubtopic = { subtopic: string | null; entries: RawEntry[] };
type RawCategory = { category: string; subtopics: RawSubtopic[] };

type RefOut = { surah: number; ayah: number; resolvable: boolean; bridge: string[] };
type EntryOut = { text: string; ref: string; refs: RefOut[] };
type SubtopicOut = { subtopic: string | null; entries: EntryOut[] };
// `source` is carried in EVERY shard, not just index.json. These files are separable artifacts:
// once served, a shard travels on its own — scraped, cached, mirrored — with none of our pages
// and none of our attribution around it. Attribution that only exists in the DOM is attribution
// that falls off the moment the data does. 13 duplicated objects is a rounding error against a
// 104 KB shard; a stripped credit is not.
type ShardOut = { slug: string; category: string; source: typeof SOURCE; subtopics: SubtopicOut[] };
type IndexOut = {
  source: typeof SOURCE;
  totals: {
    categories: number;
    subtopics: number;
    entries: number;
    citations: number;
    verses: number;
    bridges: number;
    unresolvable: number;
  };
  categories: { slug: string; category: string; entries: number; subtopics: number }[];
};

type Citation = { surah: number; ayah: number };
type CategoryWork = { slug: string; category: string; subtopics: RawSubtopic[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label}: expected object`);
  return value;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label}: expected string`);
  return value;
}

function expectNonEmptyString(value: unknown, label: string): string {
  const text = expectString(value, label);
  if (text.length === 0) throw new Error(`${label}: expected non-empty string`);
  return text;
}

function expectNullableSubtopic(value: unknown, label: string): string | null {
  if (value === null) return null;
  return expectNonEmptyString(value, label);
}

function expectPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label}: expected positive integer`);
  }
  return value;
}

function expectBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label}: expected boolean`);
  return value;
}

function parseSecondary(value: unknown, label: string): RawSecondary {
  const rec = expectRecord(value, label);
  const surah = expectPositiveInteger(rec.surah, `${label}.surah`);
  const ayah_start = expectPositiveInteger(rec.ayah_start, `${label}.ayah_start`);
  const ayah_end =
    rec.ayah_end === undefined ? undefined : expectPositiveInteger(rec.ayah_end, `${label}.ayah_end`);
  if (ayah_end !== undefined && ayah_end < ayah_start) {
    throw new Error(`${label}: ayah_end ${ayah_end} is before ayah_start ${ayah_start}`);
  }
  return ayah_end === undefined ? { surah, ayah_start } : { surah, ayah_start, ayah_end };
}

function parseParsed(value: unknown, label: string): RawParsed {
  const rec = expectRecord(value, label);
  const surah_name = expectNonEmptyString(rec.surah_name, `${label}.surah_name`);
  const surah = expectPositiveInteger(rec.surah, `${label}.surah`);
  const ayah_start = expectPositiveInteger(rec.ayah_start, `${label}.ayah_start`);
  const ayah_end = expectPositiveInteger(rec.ayah_end, `${label}.ayah_end`);
  const multi = expectBoolean(rec.multi, `${label}.multi`);
  if (ayah_end < ayah_start) {
    throw new Error(`${label}: ayah_end ${ayah_end} is before ayah_start ${ayah_start}`);
  }
  const secondary =
    rec.secondary === undefined
      ? undefined
      : Array.isArray(rec.secondary)
        ? rec.secondary.map((item, index) => parseSecondary(item, `${label}.secondary[${index}]`))
        : (() => {
            throw new Error(`${label}.secondary: expected array`);
          })();
  return secondary === undefined
    ? { surah_name, surah, ayah_start, ayah_end, multi }
    : { surah_name, surah, ayah_start, ayah_end, multi, secondary };
}

function parseEntry(value: unknown, context: string): RawEntry {
  const rec = expectRecord(value, context);
  const text = expectNonEmptyString(rec.text, `${context}.text`);
  const ref = expectNonEmptyString(rec.ref, `${context}.ref`);
  const parsed = parseParsed(rec.parsed, `${context}.parsed`);
  return { text, ref, parsed };
}

function parseSubtopic(value: unknown, category: string, index: number): RawSubtopic {
  const rec = expectRecord(value, `category "${category}" subtopic[${index}]`);
  const subtopic = expectNullableSubtopic(rec.subtopic, `category "${category}" subtopic[${index}].subtopic`);
  if (!Array.isArray(rec.entries)) {
    throw new Error(`category "${category}" subtopic[${index}]: expected entries array`);
  }
  const entries = rec.entries.map((entry, entryIndex) =>
    parseEntry(entry, `category "${category}" subtopic[${index}] entry[${entryIndex}]`),
  );
  return { subtopic, entries };
}

function parseCategory(value: unknown, index: number): RawCategory {
  const rec = expectRecord(value, `category[${index}]`);
  const category = expectNonEmptyString(rec.category, `category[${index}].category`);
  if (!Array.isArray(rec.subtopics)) {
    throw new Error(`category "${category}": expected subtopics array`);
  }
  const subtopics = rec.subtopics.map((subtopic, subtopicIndex) => parseSubtopic(subtopic, category, subtopicIndex));
  return { category, subtopics };
}

function expandRange(surah: number, ayahStart: number, ayahEnd: number, label: string): Citation[] {
  if (ayahEnd < ayahStart) {
    throw new Error(`${label}: ayah_end ${ayahEnd} is before ayah_start ${ayahStart}`);
  }
  const refs: Citation[] = [];
  for (let ayah = ayahStart; ayah <= ayahEnd; ayah += 1) refs.push({ surah, ayah });
  return refs;
}

function expandRefs(entry: RawEntry, context: string): Citation[] {
  const refs = expandRange(
    entry.parsed.surah,
    entry.parsed.ayah_start,
    entry.parsed.ayah_end,
    `${context}.parsed`,
  );
  for (const [index, secondary] of (entry.parsed.secondary ?? []).entries()) {
    refs.push(
      ...expandRange(
        secondary.surah,
        secondary.ayah_start,
        secondary.ayah_end ?? secondary.ayah_start,
        `${context}.parsed.secondary[${index}]`,
      ),
    );
  }
  return refs;
}

function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

function assertEqual(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertSetEqual(actual: Set<string>, expected: Set<string>, label: string): void {
  const unexpected = [...actual].filter((item) => !expected.has(item));
  const missing = [...expected].filter((item) => !actual.has(item));
  if (unexpected.length === 0 && missing.length === 0) return;
  const parts: string[] = [];
  if (unexpected.length > 0) parts.push(`unexpected ${unexpected.join(", ")}`);
  if (missing.length > 0) parts.push(`missing ${missing.join(", ")}`);
  throw new Error(`${label}: ${parts.join("; ")}`);
}

async function readSurahAyahCounts(): Promise<Map<number, number>> {
  const pairs = await Promise.all(
    Array.from({ length: 114 }, async (_, index) => {
      const surah = index + 1;
      const path = `${SURAH_DIR}/${surah}.json`;
      const json = await Bun.file(path).json();
      const rec = expectRecord(json, path);
      const ayahs = expectPositiveInteger(rec.ayahs, `${path}.ayahs`);
      return [surah, ayahs] as const;
    }),
  );
  return new Map(pairs);
}

// Duplicated instead of imported because web/src/themes.ts pulls a browser-only module graph
// (`./announce.ts`, `./quran.ts`, `./read.ts`, `./theme-index.ts`, `./verse.ts`) into Bun.
const slugify = (theme: string): string =>
  theme.toLowerCase().replace(/&/g, "dan").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const raw = await Bun.file(INPUT_JSON).json();
if (!Array.isArray(raw)) throw new Error(`${INPUT_JSON}: expected top-level array`);

const categories = raw.map((item, index) => parseCategory(item, index));
assertEqual(categories.length, EXPECTED.categories, "category count");

const categoryWork: CategoryWork[] = [];
const seenSlugs = new Map<string, string>();
for (const category of categories) {
  const slug = slugify(category.category);
  if (slug.length === 0) throw new Error(`category "${category.category}" slugified to empty string`);
  const previous = seenSlugs.get(slug);
  if (previous) throw new Error(`duplicate category slug "${slug}" for "${previous}" and "${category.category}"`);
  seenSlugs.set(slug, category.category);
  categoryWork.push({ slug, category: category.category, subtopics: category.subtopics });
}
assertEqual(categoryWork.length, EXPECTED.categories, "shard count");

let subtopicCount = 0;
let nullSubtopicCount = 0;
let entryCount = 0;
let citationCount = 0;
const verseToCategories = new Map<string, Set<string>>();
const unresolvable = new Set<string>();
const ayahCounts = await readSurahAyahCounts();

for (const category of categoryWork) {
  for (const subtopic of category.subtopics) {
    subtopicCount += 1;
    if (subtopic.subtopic === null) nullSubtopicCount += 1;
    for (const [entryIndex, entry] of subtopic.entries.entries()) {
      entryCount += 1;
      const refs = expandRefs(
        entry,
        `category "${category.category}" subtopic "${subtopic.subtopic ?? "null"}" entry[${entryIndex}]`,
      );
      citationCount += refs.length;
      for (const ref of refs) {
        const key = verseKey(ref.surah, ref.ayah);
        const ayahs = ayahCounts.get(ref.surah);
        const resolvable = ayahs !== undefined && ref.ayah <= ayahs;
        if (!resolvable) unresolvable.add(key);
        const categoriesForVerse = verseToCategories.get(key) ?? new Set<string>();
        categoriesForVerse.add(category.slug);
        verseToCategories.set(key, categoriesForVerse);
      }
    }
  }
}

assertEqual(subtopicCount, EXPECTED.subtopics, "subtopic count");
assertEqual(nullSubtopicCount, EXPECTED.nullSubtopics, "null subtopic count");
assertEqual(entryCount, EXPECTED.entries, "entry count");
assertEqual(citationCount, EXPECTED.citations, "citation count");
assertEqual(verseToCategories.size, EXPECTED.distinctVerses, "distinct verse count");
assertEqual(
  [...verseToCategories.values()].filter((slugs) => slugs.size > 1).length,
  EXPECTED.bridgeVerses,
  "bridge verse count",
);
assertSetEqual(unresolvable, EXPECTED_UNRESOLVABLE, "unresolvable ref set");

const shards: { path: string; body: string; entryCount: number }[] = [];
let emittedEntries = 0;

for (const category of categoryWork) {
  const shard: ShardOut = {
    slug: category.slug,
    category: category.category,
    source: SOURCE,
    subtopics: category.subtopics.map((subtopic, subtopicIndex) => ({
      subtopic: subtopic.subtopic,
      entries: subtopic.entries.map((entry, entryIndex) => ({
        text: entry.text,
        ref: entry.ref,
        refs: expandRefs(
          entry,
          `category "${category.category}" subtopic[${subtopicIndex}] entry[${entryIndex}]`,
        ).map((ref) => {
          const key = verseKey(ref.surah, ref.ayah);
          const ayahs = ayahCounts.get(ref.surah);
          const resolvable = ayahs !== undefined && ref.ayah <= ayahs;
          const bridge = [...(verseToCategories.get(key) ?? new Set<string>())].filter((slug) => slug !== category.slug);
          return { surah: ref.surah, ayah: ref.ayah, resolvable, bridge };
        }),
      })),
    })),
  };

  const shardEntries = shard.subtopics.reduce((total, subtopic) => total + subtopic.entries.length, 0);
  emittedEntries += shardEntries;
  const body = JSON.stringify(shard);
  const bytes = Buffer.byteLength(body);
  if (bytes > SHARD_LIMIT_BYTES) {
    throw new Error(`${category.slug}.json is ${bytes} bytes, exceeds ${SHARD_LIMIT_BYTES} byte limit`);
  }
  shards.push({ path: `${OUT_DIR}/${category.slug}.json`, body, entryCount: shardEntries });
}

if (shards.length < EXPECTED.categories) {
  throw new Error(`refusing to write truncated shard set: built ${shards.length}, expected ${EXPECTED.categories}`);
}
if (emittedEntries < EXPECTED.entries) {
  throw new Error(`refusing to write truncated shard set: emitted ${emittedEntries} entries, expected ${EXPECTED.entries}`);
}

const index: IndexOut = {
  source: SOURCE,
  totals: {
    categories: categoryWork.length,
    subtopics: subtopicCount,
    entries: entryCount,
    citations: citationCount,
    verses: verseToCategories.size,
    bridges: [...verseToCategories.values()].filter((slugs) => slugs.size > 1).length,
    unresolvable: unresolvable.size,
  },
  categories: categoryWork.map((category) => ({
    slug: category.slug,
    category: category.category,
    entries: category.subtopics.reduce((total, subtopic) => total + subtopic.entries.length, 0),
    subtopics: category.subtopics.length,
  })),
};

const indexBody = JSON.stringify(index);
const indexBytes = Buffer.byteLength(indexBody);
if (indexBytes > INDEX_LIMIT_BYTES) {
  throw new Error(`index.json is ${indexBytes} bytes, exceeds ${INDEX_LIMIT_BYTES} byte limit`);
}

await mkdir(OUT_DIR, { recursive: true });
await Bun.write(OUT_INDEX, indexBody);
await Promise.all(shards.map((shard) => Bun.write(shard.path, shard.body)));

const maxShardBytes = Math.max(...shards.map((shard) => Buffer.byteLength(shard.body)));
console.log(
  `✓ peta   ${shards.length} shards, ${entryCount} entries, ${citationCount} citations → ${OUT_DIR}/ (${(indexBytes / 1024).toFixed(1)} KB index, ${(maxShardBytes / 1024).toFixed(1)} KB max shard)`,
);
