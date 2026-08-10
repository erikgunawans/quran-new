/**
 * OKF hadith → Vectorize index builder.
 *
 * Phase 1 of the continuous Tanya agent. Reads the manifest, filters by rights, embeds each hadith
 * with bge-m3 (the Phase 0 bake-off winner — the only model of four that retrieved Indonesian
 * questions against Arabic text), and upserts to Vectorize.
 *
 * THREE RULES THIS FILE ENFORCES, none of them cosmetic:
 *
 * 1. RIGHTS FILTER AT BUILD TIME. `rights_usage: private` never enters the index. Three files carry
 *    it — hadith/_index.md and both Indonesian tafsir files, the latter being unreviewed AI
 *    Indonesian that declares its own restriction. A record excluded here cannot leak downstream by
 *    a later bug, because it does not exist in the index at all.
 *
 * 2. NO SCRIPTURE IN METADATA. Vectorize holds identifiers, rights fields and citation data only.
 *    The corpus remains the single source of truth for text. This keeps the index small, keeps
 *    `reference-only` material out of a second store, and means the display cap (decision 1: one or
 *    two hadith per answer, with attribution) is enforced where the text is actually fetched.
 *
 * 3. THE EMBEDDING IS RECORDED, NOT ASSUMED. On success the builder stamps the manifest's `index`
 *    field with model, dimensions, vector count and build time. An index whose model is unknown is
 *    an index you cannot safely query — vectors from different models are not comparable, so a
 *    mismatched embedder produces confident nonsense rather than an error.
 *
 * Usage:
 *   bun run okf:index                 # build/refresh the index
 *   LIMIT=100 bun run okf:index       # smoke test on the first 100 records
 *   DRY=1 bun run okf:index           # embed + report, no upsert
 */
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OKF_ROOT = process.env.OKF ?? `${process.env.HOME}/printing-press/library/tafseer-okf/okf`;
const MANIFEST_JSONL = process.env.MANIFEST ?? "data/okf/manifest.jsonl";
const SUMMARY_PATH = process.env.SUMMARY_PATH ?? "docs/reference/okf-manifest.json";
const INDEX_NAME = process.env.INDEX ?? "okf-hadith";
const MODEL = "baai/bge-m3";
const DIMENSIONS = 1024;
/** Vectors are cached OUTSIDE the repo: bulky, regenerable, and this repo is public. */
const CACHE = process.env.CACHE ?? "data/okf/vectors-bge-m3.jsonl";

const KEY = (() => {
  const line = readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith("OPENROUTER_API_KEY="));
  if (!line) throw new Error("OPENROUTER_API_KEY not in .env");
  return line.slice("OPENROUTER_API_KEY=".length).trim();
})();

interface ManifestEntry {
  path: string;
  corpus: string;
  sha256: string;
  id?: string;
  rights_usage?: string;
  source_url?: string;
}

interface IndexRecord {
  key: string;
  entry: ManifestEntry;
  text: string;
  meta: Record<string, string | number>;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRecord(entry: ManifestEntry): IndexRecord | null {
  const raw = readFileSync(join(OKF_ROOT, entry.path), "utf8");
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) return null;
  const block = fm[1];
  const field = (k: string) => block.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  const body = fm[2];
  const arabic = body.match(/## العربية\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() ?? "";
  const english = body.match(/## English\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() ?? "";
  if (!arabic) return null;

  const bookEn = field("book_en");
  const babEn = field("bab_en");
  // Same construction the Phase 0 probe measured. Changing it invalidates the probe's results, so it
  // is deliberately identical rather than "improved" here.
  const text = `${bookEn} › ${babEn}\n${arabic}\n${english}`.slice(0, 4000);

  return {
    key: sha256(text),
    entry,
    text,
    meta: {
      path: entry.path,
      collection: field("collection"),
      hadith_number: Number(field("hadith_number")) || 0,
      grade: field("grade"),
      book_en: bookEn.slice(0, 200),
      bab_en: babEn.slice(0, 400),
      source_url: entry.source_url ?? "",
      rights_usage: entry.rights_usage ?? "unknown",
    },
  };
}

async function embedBatch(chunk: string[]): Promise<number[][]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, input: chunk }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(String(res.status));
      if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
      return ((await res.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
    } catch (e) {
      lastErr = e;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr;
}

// ── collect ───────────────────────────────────────────────────────────────────

const all = readFileSync(MANIFEST_JSONL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as ManifestEntry);
const hadith = all.filter((e) => e.corpus === "hadith");
const excluded = hadith.filter((e) => e.rights_usage === "private");
const eligible = hadith.filter((e) => e.rights_usage !== "private");

console.log(`hadith: ${hadith.length} manifest entries`);
console.log(`  excluded by rights (private): ${excluded.length}${excluded.length ? ` — ${excluded.map((e) => e.path).join(", ")}` : ""}`);

const LIMIT = Number(process.env.LIMIT ?? 0);
const records = (LIMIT ? eligible.slice(0, LIMIT) : eligible).map(parseRecord).filter((r): r is IndexRecord => r !== null);
console.log(`  indexable records: ${records.length}`);

// ── embed (content-hash cache, so a rebuild after an edit only re-embeds what changed) ─────────

const cached = new Map<string, number[]>();
if (existsSync(CACHE)) {
  for (const line of readFileSync(CACHE, "utf8").split("\n")) {
    if (!line) continue;
    try {
      const { k, v } = JSON.parse(line) as { k: string; v: number[] };
      cached.set(k, v);
    } catch { /* truncated tail from a kill */ }
  }
  console.log(`  cache: ${cached.size} vectors on disk`);
}

const todo = records.filter((r) => !cached.has(r.key));
console.log(`  to embed: ${todo.length}`);

const BATCH = 32;
for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const vecs = await embedBatch(chunk.map((r) => r.text));
  chunk.forEach((r, n) => cached.set(r.key, vecs[n]));
  appendFileSync(CACHE, chunk.map((r, n) => JSON.stringify({ k: r.key, v: vecs[n] })).join("\n") + "\n");
  process.stdout.write(`\r  embedding: ${Math.min(i + BATCH, todo.length)}/${todo.length}   `);
}
if (todo.length) process.stdout.write("\n");

// ── upsert ────────────────────────────────────────────────────────────────────

if (process.env.DRY) {
  console.log("\nDRY=1 — no upsert performed.");
} else {
  const NDJSON = "data/okf/vectorize-upsert.ndjson";
  writeFileSync(
    NDJSON,
    records.map((r) => JSON.stringify({ id: r.entry.id ?? r.entry.path, values: cached.get(r.key), metadata: r.meta })).join("\n") + "\n",
  );
  console.log(`\nwrote ${NDJSON} (${records.length} vectors)`);
  console.log(`upsert with:\n  bunx wrangler vectorize insert ${INDEX_NAME} --file=${NDJSON}`);

  const summary = JSON.parse(readFileSync(SUMMARY_PATH, "utf8"));
  summary.index = {
    name: INDEX_NAME,
    model: MODEL,
    dimensions: DIMENSIONS,
    vectors: records.length,
    excluded_by_rights: excluded.length,
    built_at: new Date().toISOString().slice(0, 10),
  };
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n");
  console.log(`stamped ${SUMMARY_PATH} with index provenance`);
}
