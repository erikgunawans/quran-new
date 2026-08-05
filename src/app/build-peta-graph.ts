#!/usr/bin/env bun
/**
 * Build the Peta Tematik ayah graph — the thematic map re-expressed as nodes and edges.
 *
 * The claim this artifact makes is narrow and worth stating: an ayah cited under more than one
 * category is a *bridge between themes*, and Ustadz Muhammad Thalib's index already says which
 * ayahs those are. We do not infer the connections, compute similarity, or rank anything. We
 * re-shape his curation so it can be traversed. 518 of 1628 ayahs bridge two or more
 * categories; that number is his, and this build fails if it ever stops matching the shards.
 *
 * The same rights boundary that governs `build-peta.ts` governs this one:
 *
 * - Arabic is spliced byte-identically from the canonical corpus, never retyped or normalised
 * - entry text is copied verbatim from the shards
 * - both translations are carried with their corpus `display_role` intact (Thalib primary,
 *   Kemenag companion) so consumers rank the scholars the way the corpus does, not by taste
 * - the four unresolvable citations stay unresolvable
 * - every count is asserted against `web/public/peta/index.json` before a byte is written
 *
 * Five categories are flat — a single subtopic whose name is `null`, 736 entries between them.
 * Those ayahs attach directly to the category node. Inventing a "None" subtopic for them would
 * put a label in the graph that the source never wrote.
 *
 * Note on inputs: `data/` exists only in the primary checkout, never in a git worktree, so this
 * script says so plainly rather than emitting a graph with no scripture in it.
 *
 * Run:
 *   bun run app:peta-graph
 */
import { readdir } from "node:fs/promises";

const PETA_DIR = "web/public/peta";
const CANON_DIR = "data/canonical";
const OUT = ".planning/graphs/graph-ayah.json";

const SOURCE =
  "Indeks Tematik — Ustadz Muhammad Thalib (quran.tarjamahtafsiriyah.com)";

/** Asserted against the shards, never trusted from a previous run. */
const EXPECTED = {
  categories: 13,
  namedSubtopics: 37,
  flatCategories: 5,
  resolvableAyahs: 1628,
  unresolvable: 4,
  distinctVerses: 1632,
  citations: 2501,
  connectors: 518,
  maxSpan: 6,
  /** span (categories bridged) -> ayah count. The shape of the whole map. */
  spanDistribution: { 1: 1110, 2: 360, 3: 110, 4: 36, 5: 10, 6: 2 } as Record<number, number>,
} as const;

/** Sampled from the hero green→gold gradient; index = categories bridged. */
const SPAN_COLOR: Record<number, string> = {
  1: "#2f6b52", 2: "#16a249", 3: "#5aa845", 4: "#93b444", 5: "#c6bf4d", 6: "#f0c851",
};
const CATEGORY_COLOR = "#1f5f4a";
const SUBTOPIC_COLOR = "#3f8f70";

const NON_CATEGORY_SHARDS = new Set(["index", "cosmos", "bonds"]);

type Ref = { surah: number; ayah: number; resolvable: boolean; bridge: string[] };
type Entry = { text: string; ref: string; refs: Ref[] };
type Subtopic = { subtopic: string | null; entries: Entry[] };
type Shard = { slug: string; category: string; subtopics: Subtopic[] };
type IndexFile = { totals: { categories: number; verses: number; bridges: number } };

type Ayah = { surah_number: number; ayah_number: number; text_uthmani: string };
type Translation = { ayah_id: string; text: string; display_role: string };
type Surah = { number: number; name_translit: string; revelation_type: string };

type Node = {
  id: string;
  label: string;
  kind: "ayah" | "subtopic" | "category";
  span: number;
  size: number;
  color: string;
  surah?: number;
  surahName?: string;
  rev?: string;
  detail: Record<string, string>;
};
type Edge = { from: string; to: string; kind: "cited_in" | "in_category" };

/** Declared, not an arrow const, so TS uses its `never` return to narrow callers. */
function die(msg: string): never {
  console.error(`build-peta-graph: ${msg}`);
  process.exit(1);
}

const key = (surah: number, ayah: number) => `${surah}:${ayah}`;
const unkey = (k: string): [number, number] => {
  const [s, a] = k.split(":");
  return [Number(s), Number(a)];
};
const catNodeId = (slug: string) => `cat::${slug}`;
const subNodeId = (slug: string, sub: string) => `sub::${slug}::${sub}`;
const ayahNodeId = (surah: number, ayah: number) => `ayah::${surah}:${ayah}`;

async function readJson<T>(path: string, what: string): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return die(
      `missing ${what} at ${path}.` +
        (path.startsWith(CANON_DIR)
          ? " `data/` lives only in the primary checkout — run this from ~/quran-new, not a worktree."
          : ""),
    );
  }
  return (await file.json()) as T;
}

async function main() {
  // ---- inputs -------------------------------------------------------------
  const index = await readJson<IndexFile>(`${PETA_DIR}/index.json`, "peta index");
  const shardNames = (await readdir(PETA_DIR))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((s) => !NON_CATEGORY_SHARDS.has(s))
    .sort();

  const shards: Shard[] = [];
  for (const name of shardNames) {
    shards.push(await readJson<Shard>(`${PETA_DIR}/${name}.json`, `shard ${name}`));
  }

  const ayahs = await readJson<Ayah[]>(`${CANON_DIR}/ayahs.json`, "canonical ayahs");
  const translations = await readJson<Translation[]>(
    `${CANON_DIR}/translations.json`, "canonical translations",
  );
  const surahs = await readJson<Surah[]>(`${CANON_DIR}/surahs.json`, "canonical surahs");

  const arabic = new Map<string, string>();
  for (const a of ayahs) arabic.set(key(a.surah_number, a.ayah_number), a.text_uthmani);

  const primary = new Map<string, string>();
  const companion = new Map<string, string>();
  for (const t of translations) {
    const parts = t.ayah_id.split(":");
    (t.display_role === "primary" ? primary : companion)
      .set(key(Number(parts[1]), Number(parts[2])), t.text);
  }
  const surahById = new Map<number, Surah>(surahs.map((s) => [s.number, s]));

  // ---- fold the shards ----------------------------------------------------
  const catName = new Map<string, string>();
  const subsOfCat = new Map<string, string[]>();
  /** "S:A" -> the node ids it is cited under (subtopic ids, or a category id when flat). */
  const ayahSubs = new Map<string, Set<string>>();
  const ayahCats = new Map<string, Set<string>>();
  const ayahEntries = new Map<string, { slug: string; sub: string | null; text: string }[]>();
  const unresolvable: string[] = [];
  let flatCategories = 0;

  for (const shard of shards) {
    catName.set(shard.slug, shard.category);
    const named: string[] = [];
    let sawFlat = false;

    for (const st of shard.subtopics) {
      if (st.subtopic === null) sawFlat = true;
      else if (!named.includes(st.subtopic)) named.push(st.subtopic);

      for (const entry of st.entries) {
        for (const ref of entry.refs) {
          if (!ref.resolvable) { unresolvable.push(entry.ref); continue; }
          const k = key(ref.surah, ref.ayah);
          const target = st.subtopic === null
            ? catNodeId(shard.slug)
            : subNodeId(shard.slug, st.subtopic);
          if (!ayahSubs.has(k)) {
            ayahSubs.set(k, new Set()); ayahCats.set(k, new Set()); ayahEntries.set(k, []);
          }
          ayahSubs.get(k)!.add(target);
          ayahCats.get(k)!.add(shard.slug);
          ayahEntries.get(k)!.push({ slug: shard.slug, sub: st.subtopic, text: entry.text });
        }
      }
    }
    if (sawFlat) flatCategories++;
    subsOfCat.set(shard.slug, named);
  }

  // ---- nodes & edges ------------------------------------------------------
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const slug of [...catName.keys()].sort()) {
    const name = catName.get(slug)!;
    const subs = subsOfCat.get(slug)!;
    const ayahCount = [...ayahCats].filter(([, cs]) => cs.has(slug)).length;
    nodes.push({
      id: catNodeId(slug), label: name, kind: "category", span: 0, size: 42,
      color: CATEGORY_COLOR,
      detail: {
        Kategori: name, Slug: slug,
        Subtopik: String(subs.length), Ayat: String(ayahCount),
      },
    });
    for (const sub of subs) {
      const id = subNodeId(slug, sub);
      const n = [...ayahSubs].filter(([, targets]) => targets.has(id)).length;
      nodes.push({
        id, label: sub, kind: "subtopic", span: 0, size: 22, color: SUBTOPIC_COLOR,
        detail: { Subtopik: sub, Kategori: name, Ayat: String(n) },
      });
      edges.push({ from: id, to: catNodeId(slug), kind: "in_category" });
    }
  }

  const sortedAyahs = [...ayahSubs.keys()].sort((a, b) => {
    const [as, aa] = unkey(a);
    const [bs, ba] = unkey(b);
    return as - bs || aa - ba;
  });

  for (const k of sortedAyahs) {
    const [surah, ayah] = unkey(k);
    const span = ayahCats.get(k)!.size;
    const ar = arabic.get(k);
    if (ar === undefined) die(`no canonical Arabic for QS ${k}`);
    const th = primary.get(k);
    if (th === undefined) die(`no primary (Thalib) translation for QS ${k}`);
    const meta = surahById.get(surah);
    const targets = [...ayahSubs.get(k)!].sort();

    const detail: Record<string, string> = {
      Ayat: `QS ${surah}:${ayah} — ${meta?.name_translit ?? `Surah ${surah}`}`,
      Arab: ar,
      "Tarjamah Tafsiriyah (Ustadz Muhammad Thalib)": th,
      "Terjemah Kemenag": companion.get(k) ?? "",
      "Muncul di": `${span} kategori, ${targets.length} subtopik`,
    };
    ayahEntries.get(k)!.forEach((e, i) => {
      const where = e.sub === null ? catName.get(e.slug)! : `${catName.get(e.slug)!} › ${e.sub}`;
      detail[`Entri ${i + 1} · ${where}`] = e.text;
    });

    nodes.push({
      id: ayahNodeId(surah, ayah), label: `QS ${surah}:${ayah}`, kind: "ayah",
      span, size: 8 + 5 * span, color: SPAN_COLOR[span] ?? "#f0c851",
      surah, surahName: meta?.name_translit ?? "", rev: meta?.revelation_type ?? "",
      detail,
    });
    for (const target of targets) {
      edges.push({ from: ayahNodeId(surah, ayah), to: target, kind: "cited_in" });
    }
  }

  // ---- assert before writing ---------------------------------------------
  const spanDist: Record<number, number> = {};
  for (const cs of ayahCats.values()) spanDist[cs.size] = (spanDist[cs.size] ?? 0) + 1;
  const connectors = [...ayahCats.values()].filter((cs) => cs.size > 1).length;
  const namedSubtopics = [...subsOfCat.values()].reduce((n, s) => n + s.length, 0);
  const citations = [...ayahSubs.values()].reduce((n, s) => n + s.size, 0);
  const distinctUnresolvable = new Set(unresolvable).size;

  const fail: string[] = [];
  const eq = (what: string, got: number, want: number) => {
    if (got !== want) fail.push(`${what}: got ${got}, expected ${want}`);
  };
  eq("categories", catName.size, EXPECTED.categories);
  eq("named subtopics", namedSubtopics, EXPECTED.namedSubtopics);
  eq("flat categories", flatCategories, EXPECTED.flatCategories);
  eq("resolvable ayahs", ayahSubs.size, EXPECTED.resolvableAyahs);
  eq("unresolvable refs", distinctUnresolvable, EXPECTED.unresolvable);
  eq("citations", citations, EXPECTED.citations);
  eq("connectors", connectors, EXPECTED.connectors);
  eq("distinct verses", ayahSubs.size + distinctUnresolvable, EXPECTED.distinctVerses);
  for (const [s, n] of Object.entries(EXPECTED.spanDistribution)) {
    eq(`span ${s} ayahs`, spanDist[Number(s)] ?? 0, n);
  }
  // the shards are the authority, not our constants
  eq("connectors vs index.json bridges", connectors, index.totals.bridges);
  eq("verses vs index.json", ayahSubs.size + distinctUnresolvable, index.totals.verses);
  eq("categories vs index.json", catName.size, index.totals.categories);

  const noArabic = nodes.filter((n) => n.kind === "ayah" && !n.detail.Arab).length;
  const spliced = nodes.filter(
    (n) => n.kind === "ayah" && n.detail.Arab !== arabic.get(n.id.slice("ayah::".length)),
  ).length;
  if (noArabic) fail.push(`${noArabic} ayah nodes without Arabic`);
  if (spliced) fail.push(`${spliced} ayah nodes whose Arabic is not byte-identical to the corpus`);

  if (fail.length) {
    console.error("build-peta-graph: refusing to write — the source drifted:");
    for (const f of fail) console.error(`  - ${f}`);
    process.exit(1);
  }

  const graph = {
    nodes, edges,
    meta: {
      ayahs: ayahSubs.size, subtopics: namedSubtopics, categories: catName.size,
      citations, connectors, max_span: Math.max(...Object.keys(spanDist).map(Number)),
      unresolvable: distinctUnresolvable, source: SOURCE,
    },
  };

  await Bun.write(OUT, `${JSON.stringify(graph, null, 1)}\n`);
  console.log(
    `build-peta-graph: ${nodes.length} nodes (${ayahSubs.size} ayah + ${namedSubtopics} subtopik ` +
      `+ ${catName.size} kategori), ${edges.length} edges, ${connectors} penghubung -> ${OUT}`,
  );
}

await main();
