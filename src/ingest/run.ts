import type { CanonicalDataset, Translation } from "../domain/canonical.ts";
import type { InterpretiveDataset, TafsirPassage, TafsirSource } from "../domain/interpretive.ts";
import { emit, type Manifest } from "./emit.ts";
import { RAW_DIR, fetchAll, readLock } from "./fetch.ts";
import { parseTafsirDump, parseTafsiriyahDump, toTafsirSource } from "./parse-interpretive.ts";
import { parseSurahMetadata, parseVerseFile, toAyahs, toTranslations } from "./parse.ts";
import { sourceById, tafsirSources, translationSources } from "./sources.ts";
import { IntegrityError, validateCanonical } from "./validate.ts";
import { validateInterpretive } from "./validate-interpretive.ts";
import { validateBrowser } from "../app/validate-browser.ts";

async function readRaw(file: string): Promise<string> {
  const f = Bun.file(`${RAW_DIR}/${file}`);
  if (!(await f.exists())) throw new Error(`missing raw input: ${RAW_DIR}/${file} — run \`bun run ingest\``);
  return f.text();
}

/** Build both datasets from raw inputs on disk. Pure: no network, no LLM. */
export async function build(): Promise<{ canon: CanonicalDataset; interp: InterpretiveDataset }> {
  const surahs = parseSurahMetadata(await readRaw(sourceById("tanzil-metadata").file));

  const textSource = sourceById("tanzil-uthmani");
  const ayahs = toAyahs(parseVerseFile(await readRaw(textSource.file), textSource.file));

  const translations: Translation[] = [];
  const tafsir_sources: TafsirSource[] = [];
  const tafsir_passages: TafsirPassage[] = [];

  for (const source of translationSources()) {
    const raw = await readRaw(source.file);
    if (source.translation_type === "interpretive") {
      // Interpretive translations are opinion: they get a TafsirSource record too, so they
      // are attributable exactly like any other interpretive voice.
      translations.push(...parseTafsiriyahDump(raw, source));
      tafsir_sources.push(toTafsirSource(source));
    } else {
      translations.push(...toTranslations(parseVerseFile(raw, source.file), source));
    }
  }

  for (const source of tafsirSources()) {
    tafsir_sources.push(toTafsirSource(source));
    tafsir_passages.push(...parseTafsirDump(await readRaw(source.file), source));
  }

  return {
    canon: { surahs, ayahs, translations },
    interp: { tafsir_sources, tafsir_passages },
  };
}

function report(title: string, checks: readonly { name: string; detail: string }[]): void {
  console.log(`\n▸ GATE   (${title})`);
  for (const c of checks) console.log(`  ✓ ${c.name.padEnd(28)} ${c.detail}`);
}

export async function ingest(opts: { updateLock: boolean }): Promise<Manifest> {
  console.log("\n▸ FETCH  (pinned sources, sha256-verified)");
  const sources = await fetchAll(opts);

  console.log("\n▸ PARSE  (deterministic — zero LLM)");
  const { canon, interp } = await build();
  const literal = canon.translations.filter((t) => t.translation_type === "literal").length;
  const interpretive = canon.translations.length - literal;
  console.log(`  canonical    ${canon.surahs.length} surahs · ${canon.ayahs.length} ayahs · ${literal} literal translations`);
  console.log(`  interpretive ${interp.tafsir_sources.length} sources · ${interp.tafsir_passages.length} tafsir passages · ${interpretive} interpretive translations`);

  report("canonical integrity", validateCanonical(canon).checks);
  report("interpretive integrity", validateInterpretive(canon, interp).checks);

  console.log("\n▸ EMIT   (content-addressed)");
  const manifest = await emit(canon, interp, sources);
  for (const [name, a] of Object.entries(manifest.artifacts)) {
    console.log(`  ${name.padEnd(24)} ${String(a.bytes).padStart(9)} B  ${a.sha256.slice(0, 12)}`);
  }

  console.log(`\n✓ corpus_version: ${manifest.corpus_version}`);
  return manifest;
}

/** Re-run every gate against the corpus already on disk. No network. */
export async function verify(): Promise<void> {
  const lock = await readLock();
  if (Object.keys(lock).length === 0) throw new Error("no sources.lock.json — run `bun run ingest:lock` first");

  const { canon, interp } = await build();
  const a = validateCanonical(canon);
  const b = validateInterpretive(canon, interp);
  report("canonical integrity", a.checks);
  report("interpretive integrity", b.checks);

  // The gates above validate the corpus on disk — the INPUT. They say nothing about what a
  // person's phone actually downloads. That gap is how English captions shipped for an hour
  // behind a green suite. These gates check the OUTPUT.
  const manifest = await Bun.file("data/canonical/manifest.json").json();
  const c = await validateBrowser(manifest.corpus_version);
  report("browser artifacts", c.checks);

  console.log(`\n✓ ${a.checks.length + b.checks.length + c.checks.length} gates passed`);
}

export { IntegrityError };
