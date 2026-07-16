import { describe, expect, test } from "bun:test";

/**
 * The rights layer under the display-only guarantee.
 *
 * We have permission to DISPLAY the Indeks Tematik, not to rewrite it, "fix" it, or author
 * entries in Ustadz Muhammad Thalib's name after his death.
 * These tests are that guarantee, made mechanical.
 */

const SOURCE_BUNDLE = Bun.file("docs/reference/indeks-tematik/indeks-tematik.json");
const INDEX_FILE = Bun.file("web/public/peta/index.json");
const THEMES_FILE = Bun.file("web/src/themes.ts");
const SURAH = (n: number) => Bun.file(`web/public/surah/${n}.json`);

interface SourceSecondaryRef {
  surah: number;
  ayah_start: number;
  ayah_end?: number;
}

interface SourceParsedRef {
  surah_name: string;
  surah: number;
  ayah_start: number;
  ayah_end: number;
  multi: boolean;
  secondary?: SourceSecondaryRef[];
}

interface SourceEntry {
  text: string;
  ref: string;
  parsed: SourceParsedRef;
}

interface SourceSubtopic {
  subtopic: string | null;
  entries: SourceEntry[];
}

interface SourceCategory {
  category: string;
  subtopics: SourceSubtopic[];
}

interface ShardRef {
  surah: number;
  ayah: number;
  resolvable: boolean;
  bridge: string[];
}

interface ShardEntry {
  text: string;
  ref: string;
  refs: ShardRef[];
}

interface ShardSubtopic {
  subtopic: string | null;
  entries: ShardEntry[];
}

interface PetaShard {
  slug: string;
  category: string;
  subtopics: ShardSubtopic[];
}

interface PetaIndex {
  source: { title: string; author: string; url: string };
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
}

interface SurahShard {
  n: number;
  ayahs: number;
}

interface FlatSourceRef {
  surah: number;
  ayah: number;
}

interface FlatSourceEntry {
  slug: string;
  category: string;
  subtopic: string | null;
  text: string;
  ref: string;
  refs: FlatSourceRef[];
}

interface FlatShardEntry {
  slug: string;
  category: string;
  subtopic: string | null;
  text: string;
  ref: string;
  refs: ShardRef[];
}

interface Totals {
  categories: number;
  subtopics: number;
  nullSubtopics: number;
  entries: number;
  citations: number;
  verses: number;
  bridges: number;
  unresolvable: number;
}

interface LoadedJsonFile<T> {
  path: string;
  exists: boolean;
  bytes: number;
  json: T | null;
}

const slugify = (theme: string): string =>
  theme.toLowerCase().replace(/&/g, "dan").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const EXPECTED_TOTALS: Totals = {
  categories: 13,
  subtopics: 42,
  nullSubtopics: 5,
  entries: 2451,
  citations: 2633,
  verses: 1632,
  bridges: 518,
  unresolvable: 4,
};

const EXPECTED_UNRESOLVABLE = ["11:161", "48:59", "8:77", "8:96"] as const;
const LOCAL_SLUGIFY_SOURCE = `
  theme
    .toLowerCase()
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
`;

const sourceCategories: SourceCategory[] = (await SOURCE_BUNDLE.json()) as SourceCategory[];
const themesSource = await THEMES_FILE.text();
const surahShards: SurahShard[] = await Promise.all(
  Array.from({ length: 114 }, (_, i) => SURAH(i + 1).json() as Promise<SurahShard>),
);

const index: LoadedJsonFile<PetaIndex> = await loadJsonFile<PetaIndex>(INDEX_FILE);
const shardFiles: LoadedJsonFile<PetaShard>[] = await Promise.all(
  sourceCategories.map(async ({ category }) => loadJsonFile<PetaShard>(Bun.file(`web/public/peta/${slugify(category)}.json`))),
);

const ayahsBySurah = new Map<number, number>(surahShards.map((surah) => [surah.n, surah.ayahs]));
const flatSourceEntries = flattenSourceEntries(sourceCategories);
const flatShardEntries = flattenShardEntries(shardFiles);
const verseCategoriesFromSource = deriveVerseCategories(flatSourceEntries);
const sourceTotals = deriveSourceTotals(flatSourceEntries, sourceCategories, ayahsBySurah);
const emittedTotals = deriveShardTotals(flatShardEntries, shardFiles);
const expectedCategorySummaries = sourceCategories.map((category) => ({
  slug: slugify(category.category),
  category: category.category,
  entries: category.subtopics.reduce((count, subtopic) => count + subtopic.entries.length, 0),
  subtopics: category.subtopics.length,
}));

describe("peta shards — the display-only guarantee", () => {
  test("all 13 shard files exist and every shard slug matches its filename", () => {
    const offenders: string[] = [];

    for (const file of shardFiles) {
      if (!file.exists || !file.json) {
        offenders.push(`missing ${file.path}`);
        continue;
      }
      const filename = file.path.split("/").pop()?.replace(/\.json$/u, "") ?? "(unknown)";
      if (file.json.slug !== filename) offenders.push(`${file.path} declares slug=${file.json.slug}`);
    }

    expect(shardFiles).toHaveLength(EXPECTED_TOTALS.categories);
    expect(offenders).toEqual([]);
  });

  test("source totals, emitted totals, and manifest totals all agree with the audited constants", () => {
    expect(sourceTotals).toEqual(EXPECTED_TOTALS);
    expect(emittedTotals).toEqual(EXPECTED_TOTALS);
    expect(index.json?.totals).toEqual({
      categories: EXPECTED_TOTALS.categories,
      subtopics: EXPECTED_TOTALS.subtopics,
      entries: EXPECTED_TOTALS.entries,
      citations: EXPECTED_TOTALS.citations,
      verses: EXPECTED_TOTALS.verses,
      bridges: EXPECTED_TOTALS.bridges,
      unresolvable: EXPECTED_TOTALS.unresolvable,
    });
  });

  // A typo in the printed source is still the author's typo. Rewording nothing also means
  // "fixing" nothing: the output must carry the exact same entry text byte-for-byte.
  test("every shard entry text is byte-identical to the published source", () => {
    const offenders = diffMultiset(
      flatShardEntries.map((entry) => JSON.stringify([entry.slug, entry.category, entry.subtopic, entry.ref, entry.text])),
      flatSourceEntries.map((entry) => JSON.stringify([entry.slug, entry.category, entry.subtopic, entry.ref, entry.text])),
      "entry-text",
    );

    expect(offenders).toEqual([]);
  });

  // The guarantee fails if a fabricated entry replaces a real one and the counts still balance.
  // This is a multiset check so duplicate-plus-drop cannot hide inside a single green number.
  test("no shard entry is fabricated, dropped, or duplicated relative to the source", () => {
    const offenders = diffMultiset(
      flatShardEntries.map((entry) => JSON.stringify([entry.slug, entry.category, entry.subtopic, entry.ref])),
      flatSourceEntries.map((entry) => JSON.stringify([entry.slug, entry.category, entry.subtopic, entry.ref])),
      "entry",
    );

    expect(offenders).toEqual([]);
  });

  // If the citation list changes, we have effectively published a different index in the
  // author's name. Order matters because the source order is part of the authored artifact.
  test("every emitted entry preserves the source citation list and order exactly", () => {
    const offenders = diffMultiset(
      flatShardEntries.map((entry) =>
        JSON.stringify([
          entry.slug,
          entry.category,
          entry.subtopic,
          entry.ref,
          entry.refs.map((ref) => `${ref.surah}:${ref.ayah}`),
        ]),
      ),
      flatSourceEntries.map((entry) =>
        JSON.stringify([
          entry.slug,
          entry.category,
          entry.subtopic,
          entry.ref,
          entry.refs.map((ref) => `${ref.surah}:${ref.ayah}`),
        ]),
      ),
      "entry-refs",
    );

    expect(offenders).toEqual([]);
  });

  test("the set of cited verses in the shards equals the set parsed from the source", () => {
    const emitted = new Set(flatShardEntries.flatMap((entry) => entry.refs.map((ref) => verseKey(ref.surah, ref.ayah))));
    const source = new Set(flatSourceEntries.flatMap((entry) => entry.refs.map((ref) => verseKey(ref.surah, ref.ayah))));
    const offenders = diffSet(emitted, source, "verse");

    expect(offenders).toEqual([]);
  });
});

describe("resolvability — preserve the source even when it is wrong", () => {
  test("exactly four refs stay unresolved, and they are the published typos", () => {
    const emitted = uniqueSorted(
      flatShardEntries
        .flatMap((entry) => entry.refs)
        .filter((ref) => !ref.resolvable)
        .map((ref) => verseKey(ref.surah, ref.ayah)),
    );
    const source = uniqueSorted(
      flatSourceEntries
        .flatMap((entry) => entry.refs)
        .filter((ref) => !isResolvable(ref.surah, ref.ayah, ayahsBySurah))
        .map((ref) => verseKey(ref.surah, ref.ayah)),
    );

    expect(source).toEqual([...EXPECTED_UNRESOLVABLE]);
    expect(emitted).toEqual([...EXPECTED_UNRESOLVABLE]);
  });

  // A `resolvable: true` claim is a claim about the Qur'an itself: that this ayah exists.
  // If the manifest says it exists and the shard does not, we have turned a display layer into
  // an unearned editorial correction.
  test("every resolvable:true ref points to an ayah that exists in the surah shards", () => {
    const offenders = flatShardEntries.flatMap((entry) =>
      entry.refs.flatMap((ref) =>
        ref.resolvable && !isResolvable(ref.surah, ref.ayah, ayahsBySurah)
          ? [`${entry.slug} :: ${entry.ref} -> ${verseKey(ref.surah, ref.ayah)}`]
          : [],
      ),
    );

    expect(offenders).toEqual([]);
  });
});

describe("bridges — only where the source really overlaps", () => {
  test("every emitted bridge array matches the independently derived source graph", () => {
    const offenders = flatShardEntries.flatMap((entry) =>
      entry.refs.flatMap((ref) => {
        const expected = (verseCategoriesFromSource.get(verseKey(ref.surah, ref.ayah)) ?? []).filter(
          (slug) => slug !== entry.slug,
        );
        return arraysEqual(ref.bridge, expected)
          ? []
          : [
              `${entry.slug} :: ${entry.ref} -> ${verseKey(ref.surah, ref.ayah)} expected [${expected.join(", ")}] got [${ref.bridge.join(", ")}]`,
            ];
      }),
    );

    expect(offenders).toEqual([]);
  });

  test("Anti: no shard's bridge array ever contains its own slug", () => {
    const offenders = flatShardEntries.flatMap((entry) =>
      entry.refs.flatMap((ref) => (ref.bridge.includes(entry.slug) ? [`${entry.slug} :: ${entry.ref}`] : [])),
    );

    expect(offenders).toEqual([]);
  });
});

describe("index.json — the manifest cannot lie about the shards", () => {
  test("index.json totals equal the totals derived from the emitted shards", () => {
    expect(index.exists).toBe(true);
    expect(index.json?.totals).toEqual({
      categories: emittedTotals.categories,
      subtopics: emittedTotals.subtopics,
      entries: emittedTotals.entries,
      citations: emittedTotals.citations,
      verses: emittedTotals.verses,
      bridges: emittedTotals.bridges,
      unresolvable: emittedTotals.unresolvable,
    });
  });

  test("index.json category summaries equal the category counts derived from the source", () => {
    expect(index.json?.categories).toEqual(expectedCategorySummaries);
  });

  test("index.json stays under 4 KB and every shard stays under 120 KB", () => {
    const offenders: string[] = [];

    if (!index.exists) offenders.push("missing web/public/peta/index.json");
    if (index.bytes > 4096) offenders.push(`web/public/peta/index.json :: ${index.bytes} bytes`);

    for (const file of shardFiles) {
      if (!file.exists) continue;
      if (file.bytes > 122_880) offenders.push(`${file.path} :: ${file.bytes} bytes`);
    }

    expect(offenders).toEqual([]);
  });
});

describe("Anti: representation drift never becomes a silent fork", () => {
  test('the string "null" never ships as a subtopic value', () => {
    const offenders = flatShardEntries
      .filter((entry) => entry.subtopic === "null")
      .map((entry) => `${entry.slug} :: ${entry.ref}`);

    expect(offenders).toEqual([]);
  });

  test("Anti: slugify has not drifted from web/src/themes.ts", () => {
    expect(normalizeSource(extractSlugifyBody(themesSource))).toBe(normalizeSource(LOCAL_SLUGIFY_SOURCE));
  });
});

function expandSourceRefs(parsed: SourceParsedRef): FlatSourceRef[] {
  const refs: FlatSourceRef[] = [];

  for (let ayah = parsed.ayah_start; ayah <= parsed.ayah_end; ayah++) {
    refs.push({ surah: parsed.surah, ayah });
  }

  for (const secondary of parsed.secondary ?? []) {
    const end = secondary.ayah_end ?? secondary.ayah_start;
    for (let ayah = secondary.ayah_start; ayah <= end; ayah++) {
      refs.push({ surah: secondary.surah, ayah });
    }
  }

  return refs;
}

function flattenSourceEntries(categories: SourceCategory[]): FlatSourceEntry[] {
  const entries: FlatSourceEntry[] = [];

  for (const category of categories) {
    const slug = slugify(category.category);
    for (const subtopic of category.subtopics) {
      for (const entry of subtopic.entries) {
        entries.push({
          slug,
          category: category.category,
          subtopic: subtopic.subtopic,
          text: entry.text,
          ref: entry.ref,
          refs: expandSourceRefs(entry.parsed),
        });
      }
    }
  }

  return entries;
}

function flattenShardEntries(files: LoadedJsonFile<PetaShard>[]): FlatShardEntry[] {
  const entries: FlatShardEntry[] = [];

  for (const file of files) {
    if (!file.json) continue;
    for (const subtopic of file.json.subtopics) {
      for (const entry of subtopic.entries) {
        entries.push({
          slug: file.json.slug,
          category: file.json.category,
          subtopic: subtopic.subtopic,
          text: entry.text,
          ref: entry.ref,
          refs: entry.refs,
        });
      }
    }
  }

  return entries;
}

function deriveVerseCategories(entries: FlatSourceEntry[]): Map<string, string[]> {
  const verseCategories = new Map<string, string[]>();

  for (const entry of entries) {
    for (const ref of entry.refs) {
      const key = verseKey(ref.surah, ref.ayah);
      const slugs = verseCategories.get(key) ?? [];
      if (!slugs.includes(entry.slug)) slugs.push(entry.slug);
      verseCategories.set(key, slugs);
    }
  }

  return verseCategories;
}

function deriveSourceTotals(
  entries: FlatSourceEntry[],
  categories: SourceCategory[],
  ayahs: Map<number, number>,
): Totals {
  const verseCategories = deriveVerseCategories(entries);
  const uniqueVerses = new Set<string>();
  let citations = 0;
  let unresolvable = 0;

  for (const entry of entries) {
    citations += entry.refs.length;
    for (const ref of entry.refs) {
      uniqueVerses.add(verseKey(ref.surah, ref.ayah));
      if (!isResolvable(ref.surah, ref.ayah, ayahs)) unresolvable++;
    }
  }

  return {
    categories: categories.length,
    subtopics: categories.reduce((count, category) => count + category.subtopics.length, 0),
    nullSubtopics: categories.reduce(
      (count, category) => count + category.subtopics.filter((subtopic) => subtopic.subtopic === null).length,
      0,
    ),
    entries: entries.length,
    citations,
    verses: uniqueVerses.size,
    bridges: [...verseCategories.values()].filter((slugs) => slugs.length > 1).length,
    unresolvable,
  };
}

function deriveShardTotals(entries: FlatShardEntry[], files: LoadedJsonFile<PetaShard>[]): Totals {
  const uniqueVerses = new Set<string>();
  const bridgeVerses = new Set<string>();
  let citations = 0;
  let unresolvable = 0;

  for (const entry of entries) {
    citations += entry.refs.length;
    for (const ref of entry.refs) {
      const key = verseKey(ref.surah, ref.ayah);
      uniqueVerses.add(key);
      if (ref.bridge.length > 0) bridgeVerses.add(key);
      if (!ref.resolvable) unresolvable++;
    }
  }

  return {
    categories: files.filter((file) => file.json !== null).length,
    subtopics: files.reduce((count, file) => count + (file.json?.subtopics.length ?? 0), 0),
    nullSubtopics: files.reduce(
      (count, file) => count + (file.json?.subtopics.filter((subtopic) => subtopic.subtopic === null).length ?? 0),
      0,
    ),
    entries: entries.length,
    citations,
    verses: uniqueVerses.size,
    bridges: bridgeVerses.size,
    unresolvable,
  };
}

function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

function isResolvable(surah: number, ayah: number, ayahs: Map<number, number>): boolean {
  const total = ayahs.get(surah);
  return total !== undefined && ayah >= 1 && ayah <= total;
}

function diffMultiset(actualItems: string[], expectedItems: string[], label: string): string[] {
  const actual = countMultiset(actualItems);
  const expected = countMultiset(expectedItems);
  const offenders: string[] = [];
  const keys = uniqueSorted([...actual.keys(), ...expected.keys()]);

  for (const key of keys) {
    const actualCount = actual.get(key) ?? 0;
    const expectedCount = expected.get(key) ?? 0;
    if (actualCount !== expectedCount) offenders.push(`${label} :: ${key} :: emitted=${actualCount} source=${expectedCount}`);
  }

  return offenders;
}

function countMultiset(items: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);

  return counts;
}

function diffSet(actual: Set<string>, expected: Set<string>, label: string): string[] {
  const offenders: string[] = [];

  for (const key of uniqueSorted([...actual])) {
    if (!expected.has(key)) offenders.push(`${label} extra :: ${key}`);
  }
  for (const key of uniqueSorted([...expected])) {
    if (!actual.has(key)) offenders.push(`${label} missing :: ${key}`);
  }

  return offenders;
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right));
}

function normalizeSource(source: string): string {
  return source.replace(/\s+/gu, "");
}

function extractSlugifyBody(source: string): string {
  const match = source.match(/export const slugify = \(theme: string\): string =>\s*([\s\S]*?);/u);
  if (!match?.[1]) throw new Error("Could not extract slugify from web/src/themes.ts");
  return match[1];
}

async function loadJsonFile<T>(file: Bun.BunFile): Promise<LoadedJsonFile<T>> {
  const exists = await file.exists();
  return {
    path: file.name ?? "(unknown)",
    exists,
    bytes: exists ? (await file.arrayBuffer()).byteLength : 0,
    json: exists ? ((await file.json()) as T) : null,
  };
}
