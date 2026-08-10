/**
 * OKF corpus manifest — the reproducibility record for the Tanya agent's knowledge base.
 *
 * WHY THIS EXISTS. The OKF corpus (hadith, aqeeda, tafseer) is 183 MB of scripture and scholarship
 * that CANNOT live in this repo: `erikgunawans/quran-new` is public, and the hadith records carry
 * `usage: reference-only` with a rights basis that expressly forbids mass reproduction of whole
 * collections. So the corpus lives in private R2 and the vectors live in Vectorize — but then
 * nothing in git says WHICH corpus produced WHICH index, and a stale or mismatched index becomes
 * undetectable.
 *
 * This manifest is that missing link. It records, per file, a content hash and the rights metadata —
 * and NO scripture text. It is the one piece of the pipeline that is safe to publish, and it is what
 * lets anyone verify that a given Vectorize index was built from a given corpus revision.
 *
 * The `corpus_digest` is the hash of all per-file hashes in sorted path order: change any source
 * file and the digest changes, which is the signal that an index needs rebuilding.
 *
 * Usage:
 *   bun run okf:manifest                    # writes to data/okf/
 *   OKF=/path/to/okf bun run okf:manifest   # override corpus location
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const OKF_ROOT = process.env.OKF ?? `${process.env.HOME}/printing-press/library/tafseer-okf/okf`;
const OUT_DIR = process.env.OUT_DIR ?? "data/okf";

/** The three corpora, each with its own shape and its own rights posture. */
const CORPORA = ["hadith", "aqeeda", "tafseer"] as const;
type Corpus = (typeof CORPORA)[number];

export interface ManifestEntry {
  /** Path relative to the OKF root — the stable key an R2 object and a Vectorize vector share. */
  path: string;
  corpus: Corpus;
  bytes: number;
  /** sha256 of the raw file bytes. Byte-level, not text-level: Arabic normalisation differences are
   *  real and must register as different content. */
  sha256: string;
  /** Frontmatter `id`, when present — the human-facing record identifier (e.g. hadith-bukhari-6962). */
  id?: string;
  /** `rights.usage` — the field the retrieval layer filters on. Absent means the file declares none,
   *  which is treated as MORE restrictive, never less. */
  rights_usage?: string;
  source_url?: string;
  license?: string;
}

const sha256 = (buf: Buffer | string): string => createHash("sha256").update(buf).digest("hex");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

/**
 * Pull only the fields the pipeline needs. Deliberately NOT a general YAML parser: this reads a
 * handful of known keys and ignores the rest, so a malformed or unexpected frontmatter block can
 * never inject content into a file that is meant to carry no scripture.
 */
function frontmatterFields(raw: string): Pick<ManifestEntry, "id" | "rights_usage" | "source_url" | "license"> {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return {};
  const block = fm[1];
  const scalar = (key: string): string | undefined =>
    block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
  // `usage` appears both at rights.usage (top level of the rights map) and again inside
  // rights.layers[]. Take the FIRST — the record-level posture, not a layer's.
  const rightsUsage = block.match(/^rights:\n(?:\s+.*\n)*?\s+usage:\s*(.+)$/m)?.[1]?.trim();
  return {
    id: scalar("id"),
    rights_usage: rightsUsage,
    source_url: scalar("source_url"),
    license: scalar("license"),
  };
}

const entries: ManifestEntry[] = [];
for (const corpus of CORPORA) {
  const dir = join(OKF_ROOT, corpus);
  let files: string[];
  try {
    files = walk(dir);
  } catch {
    console.warn(`  ${corpus}: not found at ${dir} — skipped`);
    continue;
  }
  for (const file of files) {
    const bytes = readFileSync(file);
    entries.push({
      path: relative(OKF_ROOT, file),
      corpus,
      bytes: bytes.length,
      sha256: sha256(bytes),
      ...frontmatterFields(bytes.toString("utf8")),
    });
  }
  console.log(`  ${corpus}: ${files.length} files`);
}

entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

/** Change any source file → this changes. The signal that an index is stale. */
const corpusDigest = sha256(entries.map((e) => `${e.path}:${e.sha256}`).join("\n"));

const byCorpus = Object.fromEntries(
  CORPORA.map((c) => {
    const rows = entries.filter((e) => e.corpus === c);
    return [c, {
      files: rows.length,
      bytes: rows.reduce((n, e) => n + e.bytes, 0),
      rights_usage: [...new Set(rows.map((e) => e.rights_usage ?? "(none declared)"))].sort(),
    }];
  }),
);

const summary = {
  version: 1 as const,
  corpus_digest: corpusDigest,
  okf_root: OKF_ROOT,
  total_files: entries.length,
  total_bytes: entries.reduce((n, e) => n + e.bytes, 0),
  by_corpus: byCorpus,
  /**
   * Filled in by the index builder, never here — an index is only self-describing if the model that
   * produced it is recorded alongside the corpus it read. A manifest with `index: null` means the
   * corpus has been catalogued but no index has been built from it.
   */
  index: null as null | { model: string; dimensions: number; built_at: string; vectors: number },
};

/**
 * The split is deliberate and lives here rather than in a README, so it cannot drift.
 *
 * SUMMARY → `docs/reference/` (committed). ~700 bytes, and its `corpus_digest` is the entire
 * staleness signal: any source file changes and the digest changes. That is what git needs.
 *
 * PER-FILE JSONL → `data/` (gitignored) and R2 alongside the corpus. 6.3 MB of content hashes that
 * regenerate in seconds, delta-compress badly, and only matter mid-diagnosis — at which point you
 * have corpus access anyway. Committing it would also contradict this repo's standing rule that
 * derived artifacts (web/public/corpus.json, web/dist, data/) stay out of git.
 */
const SUMMARY_PATH = process.env.SUMMARY_PATH ?? "docs/reference/okf-manifest.json";

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync("docs/reference", { recursive: true });
writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
writeFileSync(join(OUT_DIR, "manifest.jsonl"), entries.map((e) => JSON.stringify(e)).join("\n") + "\n");

console.log(`\ncorpus_digest ${corpusDigest.slice(0, 16)}…`);
console.log(`${entries.length} files, ${(summary.total_bytes / 1e6).toFixed(1)} MB`);
console.log(`wrote ${SUMMARY_PATH} (committed) + ${OUT_DIR}/manifest.jsonl (gitignored → R2)`);
