#!/usr/bin/env bun
/**
 * Build the baked 3D cosmos for the "Indeks Tematik" display surface.
 *
 * This script exists to encode a shipping boundary, not to "enhance" the browser.
 * The graph topology is static, so we pay the force-layout cost once at build time
 * and stop shipping a 3D simulation library to every reader just to rediscover the
 * same coordinates on every page load.
 *
 * Run:
 *   bun run app:peta3d
 */
import { mkdir } from "node:fs/promises";
import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force-3d";

const INDEX_PATH = "web/public/peta/index.json";
const SHARD_DIR = "web/public/peta";
export const OUT_PATH = "web/public/peta/cosmos.json";
export const SIZE_LIMIT_BYTES = 90 * 1024;

const EXPECTED = {
  categories: 13,
  subtopics: 42,
  entries: 2451,
  citations: 2633,
  distinctVerses: 1632,
  bridgeVerses: 518,
  bonds: 69,
  links: 2370,
} as const;

const EXPECTED_UNRESOLVABLE = new Set(["8:96", "8:77", "48:59", "11:161"]);
const HUB_CHARGE = -3000;
// -18 rather than -30: less mutual repulsion between verse-stars, so a category's verses
// gather into a legible clump instead of a diffuse haze. Cluster density is a LAYOUT property;
// no amount of paint fixes a cloud that is spread too thin.
const VERSE_CHARGE = -18;
const TICK_COUNT = 400;
const COSMOS_RADIUS = 1000;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type Source = {
  title: string;
  author: string;
  url: string;
};

type IndexCategory = {
  slug: string;
  category: string;
  entries: number;
  subtopics: number;
};

type IndexTotals = {
  categories: number;
  subtopics: number;
  entries: number;
  citations: number;
  verses: number;
  bridges: number;
  unresolvable: number;
};

type IndexFile = {
  source: Source;
  totals: IndexTotals;
  categories: IndexCategory[];
};

type ShardRef = {
  surah: number;
  ayah: number;
  resolvable: boolean;
  bridge: string[];
};

type ShardEntry = {
  text: string;
  ref: string;
  refs: ShardRef[];
};

type ShardSubtopic = {
  subtopic: string | null;
  entries: ShardEntry[];
};

type ShardFile = {
  slug: string;
  category: string;
  source: Source;
  subtopics: ShardSubtopic[];
};

type CategoryNode = {
  slug: string;
  name: string;
  entries: number;
};

type VerseNode = {
  surah: number;
  ayah: number;
  resolvable: boolean;
  catIndexes: number[];
};

type Graph = {
  source: Source;
  categories: CategoryNode[];
  verses: VerseNode[];
  links: { source: string; target: string }[];
  meta: {
    subtopics: number;
    entries: number;
    citations: number;
    bridges: number;
    unresolvable: Set<string>;
  };
};

type CosmosMeta = {
  cats: number;
  verses: number;
  links: number;
  bridges: number;
  entries: number;
};

type CosmosCat = {
  slug: string;
  name: string;
  entries: number;
  x: number;
  y: number;
  z: number;
};

type CosmosVerse = [
  x: number,
  y: number,
  z: number,
  surah: number,
  ayah: number,
  catIndexes: number[],
  resolvable: 0 | 1,
];

export type Cosmos = {
  meta: CosmosMeta;
  source: Source;
  cats: CosmosCat[];
  verses: CosmosVerse[];
};

type ForceNode = {
  id: string;
  kind: "cat" | "verse";
  slug?: string;
  name?: string;
  entries?: number;
  surah?: number;
  ayah?: number;
  resolvable?: boolean;
  catIndexes?: number[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

type ForceLinkDatum = {
  source: string;
  target: string;
};

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

function expectNullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return expectString(value, label);
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}: expected array`);
  return value;
}

function expectSource(value: unknown, label: string): Source {
  const record = expectRecord(value, label);
  return {
    title: expectNonEmptyString(record.title, `${label}.title`),
    author: expectNonEmptyString(record.author, `${label}.author`),
    url: expectNonEmptyString(record.url, `${label}.url`),
  };
}

function expectIndexCategory(value: unknown, label: string): IndexCategory {
  const record = expectRecord(value, label);
  return {
    slug: expectNonEmptyString(record.slug, `${label}.slug`),
    category: expectNonEmptyString(record.category, `${label}.category`),
    entries: expectPositiveInteger(record.entries, `${label}.entries`),
    subtopics: expectPositiveInteger(record.subtopics, `${label}.subtopics`),
  };
}

function expectIndexTotals(value: unknown, label: string): IndexTotals {
  const record = expectRecord(value, label);
  return {
    categories: expectPositiveInteger(record.categories, `${label}.categories`),
    subtopics: expectPositiveInteger(record.subtopics, `${label}.subtopics`),
    entries: expectPositiveInteger(record.entries, `${label}.entries`),
    citations: expectPositiveInteger(record.citations, `${label}.citations`),
    verses: expectPositiveInteger(record.verses, `${label}.verses`),
    bridges: expectPositiveInteger(record.bridges, `${label}.bridges`),
    unresolvable: expectPositiveInteger(record.unresolvable, `${label}.unresolvable`),
  };
}

function expectIndexFile(value: unknown, label: string): IndexFile {
  const record = expectRecord(value, label);
  const categories = expectArray(record.categories, `${label}.categories`).map((item, index) =>
    expectIndexCategory(item, `${label}.categories[${index}]`),
  );
  return {
    source: expectSource(record.source, `${label}.source`),
    totals: expectIndexTotals(record.totals, `${label}.totals`),
    categories,
  };
}

function expectShardRef(value: unknown, label: string): ShardRef {
  const record = expectRecord(value, label);
  const bridge = expectArray(record.bridge, `${label}.bridge`).map((item, index) =>
    expectNonEmptyString(item, `${label}.bridge[${index}]`),
  );
  return {
    surah: expectPositiveInteger(record.surah, `${label}.surah`),
    ayah: expectPositiveInteger(record.ayah, `${label}.ayah`),
    resolvable: expectBoolean(record.resolvable, `${label}.resolvable`),
    bridge,
  };
}

function expectShardEntry(value: unknown, label: string): ShardEntry {
  const record = expectRecord(value, label);
  const refs = expectArray(record.refs, `${label}.refs`).map((item, index) =>
    expectShardRef(item, `${label}.refs[${index}]`),
  );
  return {
    text: expectNonEmptyString(record.text, `${label}.text`),
    ref: expectNonEmptyString(record.ref, `${label}.ref`),
    refs,
  };
}

function expectShardSubtopic(value: unknown, label: string): ShardSubtopic {
  const record = expectRecord(value, label);
  const entries = expectArray(record.entries, `${label}.entries`).map((item, index) =>
    expectShardEntry(item, `${label}.entries[${index}]`),
  );
  return {
    subtopic: expectNullableString(record.subtopic, `${label}.subtopic`),
    entries,
  };
}

function expectShardFile(value: unknown, label: string): ShardFile {
  const record = expectRecord(value, label);
  const subtopics = expectArray(record.subtopics, `${label}.subtopics`).map((item, index) =>
    expectShardSubtopic(item, `${label}.subtopics[${index}]`),
  );
  return {
    slug: expectNonEmptyString(record.slug, `${label}.slug`),
    category: expectNonEmptyString(record.category, `${label}.category`),
    source: expectSource(record.source, `${label}.source`),
    subtopics,
  };
}

function assertSameSource(actual: Source, expected: Source, label: string): void {
  if (actual.title !== expected.title || actual.author !== expected.author || actual.url !== expected.url) {
    throw new Error(
      `${label}: source mismatch expected ${expected.title} / ${expected.author} / ${expected.url}, got ${actual.title} / ${actual.author} / ${actual.url}`,
    );
  }
}

function makeSeed(index: number, total: number): { x: number; y: number; z: number } {
  const offset = index + 0.5;
  const y = 1 - (2 * offset) / total;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * offset;
  const z = Math.sin(theta) * radius;
  const x = Math.cos(theta) * radius;
  return { x, y, z };
}

function roundCoord(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label}: expected finite number, got ${value}`);
  return Math.round(value);
}

function assertFiniteCoord(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label}: expected finite number, got ${value}`);
}

function ensureValidCatIndexes(catIndexes: number[], catCount: number, label: string): void {
  if (catIndexes.length === 0) throw new Error(`${label}: expected at least one category index`);
  for (let index = 0; index < catIndexes.length; index += 1) {
    const catIndex = catIndexes[index];
    if (catIndex === undefined || !Number.isInteger(catIndex) || catIndex < 0 || catIndex >= catCount) {
      throw new Error(`${label}: invalid category index ${String(catIndex)} for ${catCount} categories`);
    }
  }
}

function normalizeCosmos(cats: CosmosCat[], verses: CosmosVerse[]): void {
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let count = 0;

  for (const cat of cats) {
    assertFiniteCoord(cat.x, `cats.${cat.slug}.x`);
    assertFiniteCoord(cat.y, `cats.${cat.slug}.y`);
    assertFiniteCoord(cat.z, `cats.${cat.slug}.z`);
    sumX += cat.x;
    sumY += cat.y;
    sumZ += cat.z;
    count += 1;
  }

  for (let index = 0; index < verses.length; index += 1) {
    const verse = verses[index];
    if (!verse) throw new Error(`verses[${index}] is missing`);
    assertFiniteCoord(verse[0], `verses[${index}][0]`);
    assertFiniteCoord(verse[1], `verses[${index}][1]`);
    assertFiniteCoord(verse[2], `verses[${index}][2]`);
    sumX += verse[0];
    sumY += verse[1];
    sumZ += verse[2];
    count += 1;
  }

  const centerX = sumX / count;
  const centerY = sumY / count;
  const centerZ = sumZ / count;

  let maxRadius = 0;
  for (const cat of cats) {
    cat.x -= centerX;
    cat.y -= centerY;
    cat.z -= centerZ;
    const radius = Math.hypot(cat.x, cat.y, cat.z);
    if (radius > maxRadius) maxRadius = radius;
  }
  for (const verse of verses) {
    verse[0] -= centerX;
    verse[1] -= centerY;
    verse[2] -= centerZ;
    const radius = Math.hypot(verse[0], verse[1], verse[2]);
    if (radius > maxRadius) maxRadius = radius;
  }

  if (maxRadius === 0) throw new Error("normalize: expected non-zero radius");
  const scale = COSMOS_RADIUS / maxRadius;
  for (const cat of cats) {
    cat.x = roundCoord(cat.x * scale, `cats.${cat.slug}.x`);
    cat.y = roundCoord(cat.y * scale, `cats.${cat.slug}.y`);
    cat.z = roundCoord(cat.z * scale, `cats.${cat.slug}.z`);
  }
  for (let index = 0; index < verses.length; index += 1) {
    const verse = verses[index];
    if (!verse) throw new Error(`verses[${index}] is missing`);
    verse[0] = roundCoord(verse[0] * scale, `verses[${index}][0]`);
    verse[1] = roundCoord(verse[1] * scale, `verses[${index}][1]`);
    verse[2] = roundCoord(verse[2] * scale, `verses[${index}][2]`);
  }

  let finalMaxRadius = 0;
  for (const cat of cats) {
    assertFiniteCoord(cat.x, `cats.${cat.slug}.x`);
    assertFiniteCoord(cat.y, `cats.${cat.slug}.y`);
    assertFiniteCoord(cat.z, `cats.${cat.slug}.z`);
    const radius = Math.hypot(cat.x, cat.y, cat.z);
    if (radius > finalMaxRadius) finalMaxRadius = radius;
  }
  for (let index = 0; index < verses.length; index += 1) {
    const verse = verses[index];
    if (!verse) throw new Error(`verses[${index}] is missing`);
    assertFiniteCoord(verse[0], `verses[${index}][0]`);
    assertFiniteCoord(verse[1], `verses[${index}][1]`);
    assertFiniteCoord(verse[2], `verses[${index}][2]`);
    const radius = Math.hypot(verse[0], verse[1], verse[2]);
    if (radius > finalMaxRadius) finalMaxRadius = radius;
  }
  // The float cloud is scaled so its extreme node sits at exactly COSMOS_RADIUS, but the
  // coordinates then round to integers — which moves that node by up to sqrt(3)/2 ≈ 0.87.
  // An exactly-1000 integer radius would require the extreme node to land on a Pythagorean
  // triple, so the assertion has to allow the rounding drift.
  //
  // It previously asserted `Math.round(radius) === 1000`, which contradicted this very comment:
  // Math.round flips at 0.5, not at a whole unit, so a legitimate radius of 1000.5 failed. The
  // old layout passed only by luck — it happened to round down — and the failure surfaced the
  // moment an unrelated fix moved one node. Assert the drift the comment actually describes.
  if (finalMaxRadius > COSMOS_RADIUS + 1) {
    throw new Error(
      `max radius drifted past the rounding budget: expected ≤ ${COSMOS_RADIUS + 1}, got ${finalMaxRadius.toFixed(3)} — the scale step is wrong, not the rounding`,
    );
  }
  if (finalMaxRadius < COSMOS_RADIUS - 1) {
    throw new Error(
      `max radius fell short: expected ≥ ${COSMOS_RADIUS - 1}, got ${finalMaxRadius.toFixed(3)} — the cloud was not scaled to fill the sphere`,
    );
  }
}

export async function readGraph(): Promise<Graph> {
  const rawIndex = await Bun.file(INDEX_PATH).json();
  const indexFile = expectIndexFile(rawIndex, "index");

  assertEqual(indexFile.totals.categories, EXPECTED.categories, "index totals.categories");
  assertEqual(indexFile.totals.subtopics, EXPECTED.subtopics, "index totals.subtopics");
  assertEqual(indexFile.totals.entries, EXPECTED.entries, "index totals.entries");
  assertEqual(indexFile.totals.citations, EXPECTED.citations, "index totals.citations");
  assertEqual(indexFile.totals.verses, EXPECTED.distinctVerses, "index totals.verses");
  assertEqual(indexFile.totals.bridges, EXPECTED.bridgeVerses, "index totals.bridges");
  assertEqual(indexFile.totals.unresolvable, EXPECTED_UNRESOLVABLE.size, "index totals.unresolvable");
  assertEqual(indexFile.categories.length, EXPECTED.categories, "index categories.length");

  const categories: CategoryNode[] = [];
  const versesByKey = new Map<string, { surah: number; ayah: number; resolvable: boolean; catIndexes: Set<number> }>();
  const linkPairs = new Set<string>();
  const bridgeVerses = new Set<string>();
  const unresolvable = new Set<string>();
  let subtopicCount = 0;
  let entryCount = 0;
  let citationCount = 0;

  for (const [catIndex, indexCategory] of indexFile.categories.entries()) {
    categories.push({
      slug: indexCategory.slug,
      name: indexCategory.category,
      entries: indexCategory.entries,
    });

    const rawShard = await Bun.file(`${SHARD_DIR}/${indexCategory.slug}.json`).json();
    const shard = expectShardFile(rawShard, `shard:${indexCategory.slug}`);

    if (shard.slug !== indexCategory.slug) {
      throw new Error(`shard:${indexCategory.slug}.slug: expected ${indexCategory.slug}, got ${shard.slug}`);
    }
    if (shard.category !== indexCategory.category) {
      throw new Error(
        `shard:${indexCategory.slug}.category: expected ${indexCategory.category}, got ${shard.category}`,
      );
    }
    assertSameSource(shard.source, indexFile.source, `shard:${indexCategory.slug}`);
    assertEqual(shard.subtopics.length, indexCategory.subtopics, `shard:${indexCategory.slug}.subtopics.length`);

    let shardEntryCount = 0;
    for (const subtopic of shard.subtopics) {
      subtopicCount += 1;
      shardEntryCount += subtopic.entries.length;

      for (const entry of subtopic.entries) {
        entryCount += 1;
        citationCount += entry.refs.length;

        for (const ref of entry.refs) {
          const key = verseKey(ref.surah, ref.ayah);
          const verse =
            versesByKey.get(key) ??
            {
              surah: ref.surah,
              ayah: ref.ayah,
              resolvable: ref.resolvable,
              catIndexes: new Set<number>(),
            };
          if (verse.surah !== ref.surah || verse.ayah !== ref.ayah) {
            throw new Error(`verse ${key}: inconsistent coordinates`);
          }
          if (verse.resolvable !== ref.resolvable) {
            throw new Error(
              `verse ${key}: resolvable mismatch expected ${String(verse.resolvable)}, got ${String(ref.resolvable)}`,
            );
          }
          verse.catIndexes.add(catIndex);
          versesByKey.set(key, verse);

          if (!ref.resolvable) unresolvable.add(key);
          if (ref.bridge.length > 0) bridgeVerses.add(key);

          // Links are distinct category-to-verse bonds, not raw citations.
          // The same verse can be cited repeatedly inside one category and still
          // collapse to a single rendered edge.
          linkPairs.add(`${catIndex}|${key}`);
        }
      }
    }

    assertEqual(shardEntryCount, indexCategory.entries, `shard:${indexCategory.slug}.entries`);
  }

  assertEqual(categories.length, EXPECTED.categories, "categories");
  assertEqual(subtopicCount, EXPECTED.subtopics, "subtopics");
  assertEqual(entryCount, EXPECTED.entries, "entries");
  assertEqual(citationCount, EXPECTED.citations, "citations");
  assertEqual(versesByKey.size, EXPECTED.distinctVerses, "verses");
  assertEqual(bridgeVerses.size, EXPECTED.bridgeVerses, "bridges");
  assertEqual(linkPairs.size, EXPECTED.links, "links");
  assertSetEqual(unresolvable, EXPECTED_UNRESOLVABLE, "unresolvable");

  const verses: VerseNode[] = [...versesByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([, verse]) => {
      const catIndexes = [...verse.catIndexes].sort((left, right) => left - right);
      return {
        surah: verse.surah,
        ayah: verse.ayah,
        resolvable: verse.resolvable,
        catIndexes,
      };
    });

  for (const [index, verse] of verses.entries()) {
    ensureValidCatIndexes(verse.catIndexes, categories.length, `verses[${index}].catIndexes`);
  }

  const links: ForceLinkDatum[] = [...linkPairs]
    .sort()
    .map((pair) => {
      const [catIndexText, key] = pair.split("|");
      if (catIndexText === undefined || key === undefined) {
        throw new Error(`link ${pair}: malformed pair, expected "<catIndex>|<surah>:<ayah>"`);
      }
      const catIndex = Number.parseInt(catIndexText, 10);
      if (!Number.isInteger(catIndex) || catIndex < 0 || catIndex >= categories.length) {
        throw new Error(`link ${pair}: invalid category index ${catIndexText}`);
      }
      const category = categories[catIndex];
      if (category === undefined) throw new Error(`link ${pair}: no category at index ${catIndex}`);
      return {
        source: `cat:${category.slug}`,
        target: `verse:${key}`,
      };
    });

  return {
    source: indexFile.source,
    categories,
    verses,
    links,
    meta: {
      subtopics: subtopicCount,
      entries: entryCount,
      citations: citationCount,
      bridges: bridgeVerses.size,
      unresolvable,
    },
  };
}

export function computeCosmos(graph: Graph): Cosmos {
  assertEqual(graph.categories.length, EXPECTED.categories, "graph categories");
  assertEqual(graph.verses.length, EXPECTED.distinctVerses, "graph verses");
  assertEqual(graph.links.length, EXPECTED.links, "graph links");
  assertEqual(graph.meta.bridges, EXPECTED.bridgeVerses, "graph bridges");
  assertEqual(graph.meta.entries, EXPECTED.entries, "graph entries");
  assertSetEqual(graph.meta.unresolvable, EXPECTED_UNRESOLVABLE, "graph unresolvable");

  const nodes: ForceNode[] = [];
  const totalNodes = graph.categories.length + graph.verses.length;

  for (const category of graph.categories) {
    const seed = makeSeed(nodes.length, totalNodes);
    nodes.push({
      id: `cat:${category.slug}`,
      kind: "cat",
      slug: category.slug,
      name: category.name,
      entries: category.entries,
      x: seed.x * 80,
      y: seed.y * 80,
      z: seed.z * 80,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  for (const [verseIndex, verse] of graph.verses.entries()) {
    ensureValidCatIndexes(verse.catIndexes, graph.categories.length, `graph.verses[${verseIndex}].catIndexes`);
    const seed = makeSeed(nodes.length, totalNodes);
    nodes.push({
      id: `verse:${verseKey(verse.surah, verse.ayah)}`,
      kind: "verse",
      surah: verse.surah,
      ayah: verse.ayah,
      resolvable: verse.resolvable,
      catIndexes: [...verse.catIndexes],
      x: seed.x * 80,
      y: seed.y * 80,
      z: seed.z * 80,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  // Determinism: d3-force keeps its OWN internal LCG and threads it through jiggle() wherever
  // two nodes coincide. That generator's state persists across simulations in the same process,
  // so a second run in one process starts mid-stream and lands on different coordinates — which
  // is exactly what the determinism test caught. Seeding positions is not enough; the random
  // SOURCE has to be replaced too. This is a fresh, fixed-seed LCG per run, so two builds (and
  // two runs inside one process) are byte-identical.
  //
  // The constants are Numerical Recipes' LCG. Quality is irrelevant here — reproducibility is
  // the entire requirement.
  let seed = 0x2545f491;
  const seededRandom = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  // forceLink MUTATES the array it is given: it rewrites each link's `source`/`target` from an
  // id string into a live node object. Handing it `graph.links` therefore poisons the caller's
  // graph — a second computeCosmos(graph) would receive links already bound to the FIRST run's
  // node objects, and silently lay out a different cosmos. That is precisely what the
  // determinism test caught. Give the simulation its own copy; the graph stays pristine.
  const links: ForceLinkDatum[] = graph.links.map((link) => ({
    source: link.source,
    target: link.target,
  }));

  const simulation = forceSimulation<ForceNode, ForceLinkDatum>(nodes)
    .randomSource(seededRandom)
    .numDimensions(3)
    .force(
      "charge",
      forceManyBody<ForceNode>().strength((node: ForceNode) =>
        node.kind === "cat" ? HUB_CHARGE : VERSE_CHARGE,
      ),
    )
    .force(
      "link",
      forceLink<ForceNode, ForceLinkDatum>(links)
        .id((node: ForceNode) => node.id)
        // Read the RESOLVED node, not the raw datum. By the time this accessor runs, d3 has
        // already swapped `source` for a node object, so the previous `String(link.source)
        // .startsWith("cat:")` was comparing "[object Object]" and every link silently got 120 —
        // the hub-distance branch had never once executed.
        .distance((link: { source: ForceNode | string }) =>
          typeof link.source === "object" && link.source.kind === "cat" ? 160 : 120,
        )
        .strength(0.9),
    )
    .force("center", forceCenter(0, 0, 0));

  simulation.stop();
  for (let tick = 0; tick < TICK_COUNT; tick += 1) simulation.tick();

  const cats: CosmosCat[] = [];
  const verses: CosmosVerse[] = [];
  for (const node of nodes) {
    assertFiniteCoord(node.x, `${node.id}.x`);
    assertFiniteCoord(node.y, `${node.id}.y`);
    assertFiniteCoord(node.z, `${node.id}.z`);

    if (node.kind === "cat") {
      if (typeof node.slug !== "string" || typeof node.name !== "string" || typeof node.entries !== "number") {
        throw new Error(`${node.id}: incomplete category node`);
      }
      cats.push({
        slug: node.slug,
        name: node.name,
        entries: node.entries,
        x: node.x,
        y: node.y,
        z: node.z,
      });
      continue;
    }

    if (
      typeof node.surah !== "number" ||
      typeof node.ayah !== "number" ||
      typeof node.resolvable !== "boolean" ||
      !Array.isArray(node.catIndexes)
    ) {
      throw new Error(`${node.id}: incomplete verse node`);
    }
    ensureValidCatIndexes(node.catIndexes, graph.categories.length, `${node.id}.catIndexes`);
    verses.push([
      node.x,
      node.y,
      node.z,
      node.surah,
      node.ayah,
      [...node.catIndexes],
      node.resolvable ? 1 : 0,
    ]);
  }

  normalizeCosmos(cats, verses);

  for (let index = 0; index < verses.length; index += 1) {
    const verse = verses[index];
    if (!verse) throw new Error(`cosmos.verses[${index}] is missing`);
    ensureValidCatIndexes(verse[5], cats.length, `cosmos.verses[${index}][5]`);
  }

  const cosmos: Cosmos = {
    meta: {
      cats: cats.length,
      verses: verses.length,
      links: graph.links.length,
      bridges: graph.meta.bridges,
      entries: graph.meta.entries,
    },
    source: graph.source,
    cats,
    verses,
  };

  assertEqual(cosmos.meta.cats, EXPECTED.categories, "cosmos meta.cats");
  assertEqual(cosmos.meta.verses, EXPECTED.distinctVerses, "cosmos meta.verses");
  assertEqual(cosmos.meta.links, EXPECTED.links, "cosmos meta.links");
  assertEqual(cosmos.meta.bridges, EXPECTED.bridgeVerses, "cosmos meta.bridges");
  assertEqual(cosmos.meta.entries, EXPECTED.entries, "cosmos meta.entries");
  return cosmos;
}

async function assertDependencyBoundary(): Promise<void> {
  const rawPackage = await Bun.file("package.json").json();
  const pkg = expectRecord(rawPackage, "package");
  const dependencies = pkg.dependencies === undefined ? undefined : expectRecord(pkg.dependencies, "package.dependencies");
  const devDependencies =
    pkg.devDependencies === undefined ? undefined : expectRecord(pkg.devDependencies, "package.devDependencies");

  const prodVersion = dependencies?.["d3-force-3d"];
  const devVersion = devDependencies?.["d3-force-3d"];
  if (prodVersion !== undefined) {
    throw new Error(
      `package dependencies.d3-force-3d: expected devDependencies only, found dependencies=${expectString(prodVersion, "package.dependencies.d3-force-3d")}`,
    );
  }
  if (devVersion === undefined) {
    throw new Error("package devDependencies.d3-force-3d: expected entry");
  }
  expectString(devVersion, "package.devDependencies.d3-force-3d");
}

async function main(): Promise<void> {
  await assertDependencyBoundary();
  const graph = await readGraph();
  const cosmos = computeCosmos(graph);
  const body = JSON.stringify(cosmos);
  const bytes = Buffer.byteLength(body);
  if (bytes > SIZE_LIMIT_BYTES) {
    throw new Error(`cosmos.json is ${bytes} bytes, exceeds ${SIZE_LIMIT_BYTES} byte limit`);
  }

  await mkdir("web/public/peta", { recursive: true });
  await Bun.write(OUT_PATH, body);
  console.log(
    `✓ peta3d  ${cosmos.meta.cats} cats, ${cosmos.meta.verses} verses, ${cosmos.meta.links} links → ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`,
  );
}

if (import.meta.main) {
  await main();
}
