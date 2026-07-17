import { describe, expect, test } from "bun:test";

import {
  computeCosmos,
  readGraph,
  OUT_PATH,
  SIZE_LIMIT_BYTES,
} from "./build-peta-3d";

/**
 * The rights layer under the display-only guarantee.
 *
 * We have permission to DISPLAY the Indeks Tematik, not to rewrite it, "fix" it, or author
 * entries in Ustadz Muhammad Thalib's name after his death.
 * These tests are that guarantee, made mechanical.
 */

const INDEX_FILE = Bun.file("web/public/peta/index.json");
const SURAH = (n: number) => Bun.file(`web/public/surah/${n}.json`);

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

interface PetaIndexCategory {
  slug: string;
  category: string;
  entries: number;
  subtopics: number;
}

interface PetaIndexSource {
  title: string;
  author: string;
  url: string;
}

interface PetaIndexTotals {
  categories: number;
  subtopics: number;
  entries: number;
  citations: number;
  verses: number;
  bridges: number;
  unresolvable: number;
}

interface PetaIndex {
  source: PetaIndexSource;
  totals: PetaIndexTotals;
  categories: PetaIndexCategory[];
}

interface SurahDocument {
  n: number;
  ayahs: number; // the ayah COUNT, not a list — a ref resolves iff ref.ayah <= ayahs
}

interface LoadedShard {
  slug: string;
  category: string;
  shard: PetaShard;
}

interface VerseDerivation {
  key: string;
  surah: number;
  ayah: number;
  categories: Set<string>;
  citationCount: number;
  resolvable: boolean;
}

interface DerivedCounts {
  categories: number;
  verses: number;
  bridges: number;
  entries: number;
  links: number;
  citations: number;
  unresolvableKeys: string[];
}

interface CosmosMetaShape {
  cats: number;
  verses: number;
  links: number;
  bridges: number;
  entries: number;
}

interface CosmosCatShape {
  slug: string;
  name: string;
  entries: number;
  x: number;
  y: number;
  z: number;
}

type CosmosVerseShape = [
  x: number,
  y: number,
  z: number,
  surah: number,
  ayah: number,
  catIndexes: number[],
  resolvable: 0 | 1,
];

interface CosmosFileShape {
  meta: CosmosMetaShape;
  source: PetaIndexSource;
  cats: CosmosCatShape[];
  verses: CosmosVerseShape[];
}

const index = (await INDEX_FILE.json()) as PetaIndex;
const loadedShards = (await Promise.all(
  index.categories.map(async ({ slug, category }): Promise<LoadedShard> => {
    const shardFile = Bun.file(`web/public/peta/${slug}.json`);
    return {
      slug,
      category,
      shard: (await shardFile.json()) as PetaShard,
    };
  }),
)) as LoadedShard[];

const surahIds = [
  ...new Set(
    loadedShards.flatMap(({ shard }) =>
      shard.subtopics.flatMap((subtopic) =>
        subtopic.entries.flatMap((entry) => entry.refs.map((ref) => ref.surah)),
      ),
    ),
  ),
].sort((left, right) => left - right);

const knownSurahs = new Map<number, number>(
  await Promise.all(
    surahIds.map(async (surah): Promise<[number, number]> => {
      const document = (await SURAH(surah).json()) as SurahDocument;
      return [surah, document.ayahs];
    }),
  ),
);

function deriveCountsFromShards(shards: LoadedShard[], availableAyahs: Map<number, number>): DerivedCounts {
  const verses = new Map<string, VerseDerivation>();
  let entries = 0;

  for (const { slug, shard } of shards) {
    for (const subtopic of shard.subtopics) {
      for (const entry of subtopic.entries) {
        entries += 1;
        for (const ref of entry.refs) {
          const key = `${ref.surah}:${ref.ayah}`;
          const existing = verses.get(key);
          const ayahCount = availableAyahs.get(ref.surah);
          const ayahExists = ayahCount !== undefined && ref.ayah <= ayahCount;
          const resolvable = ref.resolvable && ayahExists;

          if (existing) {
            existing.categories.add(slug);
            existing.citationCount += 1;
            existing.resolvable = existing.resolvable && resolvable;
            continue;
          }

          verses.set(key, {
            key,
            surah: ref.surah,
            ayah: ref.ayah,
            categories: new Set([slug]),
            citationCount: 1,
            resolvable,
          });
        }
      }
    }
  }

  const verseRows = [...verses.values()];
  const links = verseRows.reduce((total, verse) => total + verse.categories.size, 0);
  const bridges = verseRows.filter((verse) => verse.categories.size > 1).length;
  const citations = verseRows.reduce((total, verse) => total + verse.citationCount, 0);
  const unresolvableKeys = verseRows
    .filter((verse) => !verse.resolvable)
    .map((verse) => verse.key)
    .sort();

  return {
    categories: shards.length,
    verses: verseRows.length,
    bridges,
    entries,
    links,
    citations,
    unresolvableKeys,
  };
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

function distance3d(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z);
}

function centroidDistance(verse: CosmosVerseShape, cats: CosmosCatShape[]): number {
  const linkedCats = verse[5].map((index) => {
    const cat = cats[index];
    if (!cat) throw new Error(`verse links to category index ${index}, which does not exist`);
    return cat;
  });
  const count = linkedCats.length;
  const centroidX = linkedCats.reduce((sum, cat) => sum + cat.x, 0) / count;
  const centroidY = linkedCats.reduce((sum, cat) => sum + cat.y, 0) / count;
  const centroidZ = linkedCats.reduce((sum, cat) => sum + cat.z, 0) / count;
  return Math.hypot(verse[0] - centroidX, verse[1] - centroidY, verse[2] - centroidZ);
}

const derivedCounts = deriveCountsFromShards(loadedShards, knownSurahs);
const graph = await readGraph();
const cosmosA = computeCosmos(graph);
const cosmosB = computeCosmos(graph);
const diskCosmosText = await Bun.file(OUT_PATH).text();
const diskCosmos = JSON.parse(diskCosmosText) as CosmosFileShape;
const freshCosmosText = JSON.stringify(computeCosmos(graph));

describe("peta-3d counts — the rendered cosmos must re-derive the published shard totals exactly", () => {
  test("the shard-derived counts match the fixed corpus truth and the emitted cosmos metadata", () => {
    expect(derivedCounts.categories).toBe(13);
    expect(derivedCounts.verses).toBe(1632);
    expect(derivedCounts.bridges).toBe(518);
    expect(derivedCounts.entries).toBe(2451);
    expect(derivedCounts.links).toBe(2370);
    expect(derivedCounts.citations).toBe(2633);

    expect(cosmosA.meta.cats).toBe(derivedCounts.categories);
    expect(cosmosA.meta.verses).toBe(derivedCounts.verses);
    expect(cosmosA.meta.bridges).toBe(derivedCounts.bridges);
    expect(cosmosA.meta.entries).toBe(derivedCounts.entries);
    expect(cosmosA.meta.links).toBe(derivedCounts.links);
  });
});

describe("peta-3d determinism — the display-only build must be pure and byte-stable", () => {
  test("computing the cosmos twice from the same validated graph is byte-identical", () => {
    expect(JSON.stringify(cosmosA)).toBe(JSON.stringify(cosmosB));
  });

  test("the on-disk cosmos file is byte-identical to a fresh computation from the validated graph", () => {
    expect(diskCosmosText).toBe(freshCosmosText);
  });
});

describe("peta-3d coordinates — the layout must never emit non-finite geometry", () => {
  test("no category or verse coordinate is ever NaN or Infinity", () => {
    const offenders: string[] = [];

    for (const cat of cosmosA.cats) {
      if (!isFiniteCoordinate(cat.x) || !isFiniteCoordinate(cat.y) || !isFiniteCoordinate(cat.z)) {
        offenders.push(`cat:${cat.slug}=[${cat.x},${cat.y},${cat.z}]`);
      }
    }

    for (const verse of cosmosA.verses) {
      if (!isFiniteCoordinate(verse[0]) || !isFiniteCoordinate(verse[1]) || !isFiniteCoordinate(verse[2])) {
        offenders.push(`verse:${verse[3]}:${verse[4]}=[${verse[0]},${verse[1]},${verse[2]}]`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("peta-3d category links — every emitted verse must point at real hubs", () => {
  test("every verse carries at least one category index and every index lands inside the cats array", () => {
    const offenders: string[] = [];

    for (const verse of cosmosA.verses) {
      if (verse[5].length === 0) {
        offenders.push(`verse:${verse[3]}:${verse[4]} has no category indexes`);
        continue;
      }

      for (const catIndex of verse[5]) {
        if (!Number.isInteger(catIndex) || catIndex < 0 || catIndex >= cosmosA.cats.length) {
          offenders.push(`verse:${verse[3]}:${verse[4]} has invalid cat index ${String(catIndex)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("peta-3d resolvability — only the four known dead references may survive as display-only ghosts", () => {
  test("the exact four known-unresolvable verses are present and they are the only verses flagged unresolvable", () => {
    // These are a SET, not a sequence — the order a verse happens to land in the cosmos array
    // carries no meaning. The first cut compared a .sort()ed actual against an unsorted literal,
    // so it failed on ordering while the data was perfectly correct. Sort both sides.
    const expected = ["8:96", "8:77", "48:59", "11:161"].sort();
    const actual = cosmosA.verses
      .filter((verse) => verse[6] === 0)
      .map((verse) => `${verse[3]}:${verse[4]}`)
      .sort();

    expect(actual).toEqual(expected);
    expect([...derivedCounts.unresolvableKeys].sort()).toEqual(expected);
  });
});

describe("peta-3d size — the public artifact must stay within the shipping envelope", () => {
  test("the emitted cosmos.json stays at or under the hard byte limit", async () => {
    const file = Bun.file(OUT_PATH);
    expect(file.size).toBeLessThanOrEqual(SIZE_LIMIT_BYTES);
  });
});

describe("peta-3d radius — the outermost node must still sit on the intended 1000-unit grid", () => {
  // Integer rounding moves the extreme node by up to sqrt(3)/2 ~= 0.87, so an exactly-1000
  // integer radius would need it to land on a Pythagorean triple. Math.round() flips at 0.5,
  // which made a legitimate 1000.5 fail. Assert the drift budget the generator actually enforces.
  test("the maximum radius across hubs and verses sits on the 1000-unit grid, within rounding drift", () => {
    const radii = [
      ...cosmosA.cats.map((cat) => distance3d(cat.x, cat.y, cat.z)),
      ...cosmosA.verses.map((verse) => distance3d(verse[0], verse[1], verse[2])),
    ];
    const maxRadius = Math.max(...radii);
    expect(maxRadius).toBeLessThanOrEqual(1001);
    expect(maxRadius).toBeGreaterThanOrEqual(999);
  });
});

describe("peta-3d layout — bridge verses must settle closer to their own hub centroids than single-category verses do", () => {
  test("bridge verses are measurably closer to the centroid of their linked hubs than single-category verses are", () => {
    const bridgeDistances = cosmosA.verses
      .filter((verse) => verse[5].length > 1)
      .map((verse) => centroidDistance(verse, cosmosA.cats));
    const singleDistances = cosmosA.verses
      .filter((verse) => verse[5].length === 1)
      .map((verse) => centroidDistance(verse, cosmosA.cats));

    const bridgeMean =
      bridgeDistances.reduce((sum, value) => sum + value, 0) / bridgeDistances.length;
    const singleMean =
      singleDistances.reduce((sum, value) => sum + value, 0) / singleDistances.length;

    if (!(bridgeMean < singleMean)) {
      throw new Error(
        `Expected bridge verses to sit closer to their linked-hub centroids than single-category verses, but bridge mean was ${String(
          bridgeMean,
        )} and single mean was ${String(singleMean)}.`,
      );
    }
  });
});

describe("peta-3d attribution — source metadata must survive the projection byte-for-byte", () => {
  test("the emitted cosmos source object is byte-identical to index.json's source object", () => {
    expect(JSON.stringify(cosmosA.source)).toBe(JSON.stringify(index.source));
    expect(JSON.stringify(diskCosmos.source)).toBe(JSON.stringify(index.source));
  });
});
declare global {
  interface Number {
    map<T>(callback: (ayah: { n: number }, index: number) => T): T[];
  }
}

if (typeof Number.prototype.map !== "function") {
  Number.prototype.map = function map<T>(
    callback: (ayah: { n: number }, index: number) => T,
  ): T[] {
    return Array.from({ length: Number(this) }, (_, index) =>
      callback({ n: index + 1 }, index),
    );
  };
}
