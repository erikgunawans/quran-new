/**
 * OKF hadith TEXT LAYER — the two artifacts that let a Worker rerank and render without ever
 * holding the corpus.
 *
 * WHY THIS EXISTS. `build-index.ts` deliberately puts NO scripture in Vectorize, which is the right
 * call and which left the Worker with no text at all. That turned out to matter more than expected:
 * measured 2026-08-10, reranking on citation surface alone (collection · book › bab) does NOT fix
 * the Phase 0 false friend, because inside a 50-candidate window roughly forty of the bab titles are
 * prayer-related and the discriminating information is in the hadith body. Reranking on the English
 * body does fix it — Sahih Muslim 154 to rank 1. So the text has to be reachable.
 *
 * TWO ARTIFACTS, AND THE SPLIT IS THE RIGHTS ARGUMENT.
 *
 *   1. rerank-en.json.gz — id → English body, ALL eligible records, one gzipped object.
 *      MACHINE-ONLY. It is read by the reranker and never rendered. It is one object rather than
 *      14,736 so a Worker fetches it once per isolate instead of fanning out fifty subrequests.
 *
 *   2. display/<collection>/<book>.json — Arabic + English + attribution, sharded by book.
 *      READER-FACING, and fetched ONLY for the records that survive `capForDisplay`. Because the
 *      display path resolves records one at a time from a shard, it is structurally incapable of
 *      handing a reader a whole collection — the thing sunnah.com's terms forbid. The cap is a wall
 *      in `dalil.ts`; this layout means even a bug behind that wall cannot dump the corpus.
 *
 * NEITHER ARTIFACT ENTERS GIT. This repo is public and these records carry `usage: reference-only`.
 * Both land in `data/okf/text/` (gitignored) and are uploaded to the private `okf-corpus` bucket.
 *
 * STALENESS IS DETECTABLE. Both artifacts are written under the manifest's `corpus_digest`, so a
 * text layer built from a different corpus revision than the index cannot be silently queried.
 *
 * Usage:
 *   bun run okf:text                 # build artifacts into data/okf/text/
 *   bun run okf:text --upload        # build, then upload to R2 (needs wrangler auth)
 */
import { gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const OKF_ROOT = process.env.OKF ?? `${process.env.HOME}/printing-press/library/tafseer-okf/okf`;
const MANIFEST_JSONL = process.env.MANIFEST ?? "data/okf/manifest.jsonl";
const SUMMARY_PATH = process.env.SUMMARY_PATH ?? "docs/reference/okf-manifest.json";
const OUT_DIR = process.env.TEXT_OUT ?? "data/okf/text";

/** Body cap for the rerank document. Long enough to discriminate, short enough to keep the blob small. */
const RERANK_CHARS = 1200;

interface ManifestEntry {
  path: string;
  corpus: string;
  id?: string;
  rights_usage?: string;
  source_url?: string;
}

const section = (body: string, heading: string): string =>
  body.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1]?.trim() ?? "";

const field = (block: string, k: string): string =>
  block.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

/**
 * Shard key from the corpus path: `hadith/bukhari/010/060/0683.md` → `bukhari/010`.
 * Book-level granularity keeps each shard around 100 KB — small enough that fetching one to render a
 * single hadith is not wasteful, few enough (~150) that uploading them is not an ordeal.
 */
const shardKey = (path: string): string => {
  const parts = path.split("/");           // hadith / coll / book / chapter / file.md
  return `${parts[1]}/${parts[2]}`;
};

/** One reader-facing record. Verbatim source text plus everything an attribution line needs. */
interface DisplayRecord {
  id: string;
  arabic: string;
  english: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
  /**
   * Who rendered the English. Required on the card — decision 2 of the Tanya agent PRD.
   *
   * There is no `translator:` key in this corpus; the credit lives in the english rights LAYER's
   * holder ("Darussalam / Muhsin Khan and the named translators"), which is precisely what
   * `rights.attribution` says must be shown alongside any English text. Reading the layer rather
   * than inventing a field means the card credits whoever the record itself names.
   */
  translator: string;
}

/**
 * Pull the english layer's `holder` out of the nested `rights.layers` block.
 * Deliberately a targeted match rather than a YAML parse — same discipline as `build-manifest.ts`,
 * so unexpected frontmatter can never inject content into a reader-facing field.
 */
const englishHolder = (block: string): string =>
  block.match(/-\s+name:\s*english\n(?:\s+.*\n)*?\s+holder:\s*(.+)/)?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

const summary = JSON.parse(readFileSync(SUMMARY_PATH, "utf8")) as { corpus_digest: string };
const all = readFileSync(MANIFEST_JSONL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as ManifestEntry);

// Same rights filter as the index builder. A record excluded there must be excluded here, or the
// text layer becomes a way to reach what the index refuses to return.
const eligible = all.filter((e) => e.corpus === "hadith" && e.rights_usage !== "private");
console.log(`hadith: ${eligible.length} eligible records (${all.filter((e) => e.corpus === "hadith").length - eligible.length} excluded by rights)`);

const rerankMap: Record<string, string> = {};
const shards = new Map<string, Record<string, DisplayRecord>>();
/** Records the upstream corpus has in Arabic only. Reported, never silently swallowed. */
const excludedNoEnglish: string[] = [];

for (const entry of eligible) {
  if (!entry.id) continue;
  const raw = readFileSync(join(OKF_ROOT, entry.path), "utf8");
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) continue;
  const [, block, body] = fm as unknown as [string, string, string];

  const arabic = section(body, "العربية");
  const english = section(body, "English");
  if (!arabic) continue;

  // A record with no English is excluded from BOTH artifacts, not just from display.
  //
  // Measured 2026-08-10: exactly one record (hadith-muslim-6292) has Arabic and no English in the
  // upstream corpus. Showing it would put a wall of untranslated Arabic in front of an Indonesian
  // reader, and the only "translation" available would be the model's prose — the precise thing
  // decision 2 forbids. But dropping it from DISPLAY alone would be worse than useless: the record
  // would still be retrievable, so the model could cite it by marker, the marker would resolve
  // against the turn's grounding, the guard would pass it, and the renderer would then drop the
  // card — leaving a prophetic attribution with nothing behind it. That is exactly the failure
  // `bad_hadith` exists to prevent, arriving through a side door.
  //
  // So the invariant is: RETRIEVABLE ≡ DISPLAYABLE. Enforced here by exclusion, and again in
  // `dalil.ts` by dropping candidates absent from the rerank layer.
  if (!english.trim()) {
    excludedNoEnglish.push(entry.id);
    continue;
  }

  rerankMap[entry.id] = english.slice(0, RERANK_CHARS);

  const key = shardKey(entry.path);
  if (!shards.has(key)) shards.set(key, {});
  shards.get(key)![entry.id] = {
    id: entry.id,
    arabic,
    english,
    collection: field(block, "collection"),
    hadith_number: Number(field(block, "hadith_number")) || 0,
    grade: field(block, "grade"),
    book_en: field(block, "book_en"),
    bab_en: field(block, "bab_en"),
    source_url: entry.source_url ?? "",
    translator: englishHolder(block),
  };
}

// ── write ─────────────────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
const rerankJson = JSON.stringify(rerankMap);
const rerankGz = gzipSync(Buffer.from(rerankJson), { level: 9 });
writeFileSync(join(OUT_DIR, "rerank-en.json.gz"), rerankGz);

let shardBytes = 0;
for (const [key, records] of shards) {
  const p = join(OUT_DIR, "display", `${key}.json`);
  mkdirSync(dirname(p), { recursive: true });
  const json = JSON.stringify(records);
  shardBytes += json.length;
  writeFileSync(p, json);
}

const manifest = {
  version: 1 as const,
  corpus_digest: summary.corpus_digest,
  records: Object.keys(rerankMap).length,
  excluded_no_english: excludedNoEnglish,
  rerank_blob: { key: `text/${summary.corpus_digest.slice(0, 16)}/rerank-en.json.gz`, bytes: rerankGz.length, chars_per_record: RERANK_CHARS },
  display_shards: { prefix: `text/${summary.corpus_digest.slice(0, 16)}/display/`, count: shards.size, bytes: shardBytes },
};
writeFileSync(join(OUT_DIR, "text-layer.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`  rerank blob:    ${(rerankGz.length / 1e6).toFixed(2)} MB gzipped (${(rerankJson.length / 1e6).toFixed(2)} MB raw)`);
console.log(`  display shards: ${shards.size} files, ${(shardBytes / 1e6).toFixed(2)} MB raw`);
console.log(`  corpus_digest:  ${summary.corpus_digest.slice(0, 16)}…`);
if (excludedNoEnglish.length) {
  console.log(`  excluded (Arabic only, no English): ${excludedNoEnglish.length} — ${excludedNoEnglish.join(", ")}`);
}
console.log(`\nwrote ${OUT_DIR}/ (gitignored)`);
console.log(`upload with: bun run okf:text --upload`);
