import type { CanonicalDataset } from "../domain/canonical.ts";
import { emit, type Manifest } from "./emit.ts";
import { RAW_DIR, fetchAll, readLock } from "./fetch.ts";
import { parseSurahMetadata, parseVerseFile, toAyahs, toTranslations } from "./parse.ts";
import { SOURCES, sourceById } from "./sources.ts";
import { IntegrityError, validateCanonical } from "./validate.ts";

async function readRaw(file: string): Promise<string> {
  const f = Bun.file(`${RAW_DIR}/${file}`);
  if (!(await f.exists())) throw new Error(`missing raw input: ${RAW_DIR}/${file} — run \`bun run ingest\``);
  return f.text();
}

/** Build the canonical dataset from raw inputs already on disk. Pure: no network, no LLM. */
export async function buildDataset(): Promise<CanonicalDataset> {
  const surahs = parseSurahMetadata(await readRaw(sourceById("tanzil-metadata").file));

  const textSource = sourceById("tanzil-uthmani");
  const ayahs = toAyahs(parseVerseFile(await readRaw(textSource.file), textSource.file));

  const translations = [];
  for (const source of SOURCES.filter((s) => s.kind === "translation")) {
    const records = parseVerseFile(await readRaw(source.file), source.file);
    translations.push(...toTranslations(records, source));
  }

  return { surahs, ayahs, translations };
}

export async function ingest(opts: { updateLock: boolean }): Promise<Manifest> {
  console.log("\n▸ FETCH  (pinned sources, sha256-verified)");
  const sources = await fetchAll(opts);

  console.log("\n▸ PARSE  (deterministic — zero LLM)");
  const ds = await buildDataset();
  console.log(
    `  ${ds.surahs.length} surahs · ${ds.ayahs.length} ayahs · ${ds.translations.length} translations`,
  );

  console.log("\n▸ GATE   (canonical integrity)");
  const report = validateCanonical(ds);
  for (const c of report.checks) console.log(`  ✓ ${c.name.padEnd(26)} ${c.detail}`);

  console.log("\n▸ EMIT   (content-addressed)");
  const manifest = await emit(ds, sources);
  for (const [name, a] of Object.entries(manifest.artifacts)) {
    console.log(`  ${name.padEnd(20)} ${String(a.bytes).padStart(9)} B  ${a.sha256.slice(0, 12)}`);
  }

  console.log(`\n✓ corpus_version: ${manifest.corpus_version}`);
  return manifest;
}

/** Re-run the gates against the corpus already on disk. No network. */
export async function verify(): Promise<void> {
  const lock = await readLock();
  if (Object.keys(lock).length === 0) throw new Error("no sources.lock.json — run `bun run ingest:lock` first");

  console.log("\n▸ GATE   (canonical integrity, from data/raw/)");
  const ds = await buildDataset();
  const report = validateCanonical(ds);
  for (const c of report.checks) console.log(`  ✓ ${c.name.padEnd(26)} ${c.detail}`);
  console.log(`\n✓ ${report.checks.length} gates passed`);
}

export { IntegrityError };
