import { mkdir } from "node:fs/promises";
import type { CanonicalDataset } from "../domain/canonical.ts";
import { sha256, type Lockfile } from "./fetch.ts";

export const OUT_DIR = "data/canonical";

export interface Manifest {
  /** Version of the emitted corpus — this is the `graph_version` the cache key binds to. */
  readonly corpus_version: string;
  readonly truth_class: "canonical";
  readonly counts: { surahs: number; ayahs: number; translations: number };
  readonly languages: readonly string[];
  /** sha256 of each emitted artifact — the corpus is content-addressed, so rebuilds are diffable. */
  readonly artifacts: Record<string, { sha256: string; bytes: number }>;
  /** The pinned inputs this corpus was built from. */
  readonly sources: Lockfile;
}

/** Stable JSON: sorted arrays + fixed key order, so byte-identical inputs give byte-identical output. */
function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

async function writeArtifact(
  name: string,
  value: unknown,
  artifacts: Record<string, { sha256: string; bytes: number }>,
): Promise<void> {
  const json = stableJson(value);
  const bytes = new TextEncoder().encode(json);
  await Bun.write(`${OUT_DIR}/${name}`, json);
  artifacts[name] = { sha256: await sha256(bytes), bytes: bytes.byteLength };
}

/**
 * Emit the canonical corpus as content-addressed artifacts plus a manifest.
 *
 * The manifest's `corpus_version` is derived from the artifact hashes, so it changes if
 * and only if the corpus changes. That is exactly the property the serving cache key
 * depends on (spec Part 4): a rebuild invalidates caches by construction — no purge job.
 */
export async function emit(ds: CanonicalDataset, sources: Lockfile): Promise<Manifest> {
  await mkdir(OUT_DIR, { recursive: true });
  const artifacts: Record<string, { sha256: string; bytes: number }> = {};

  const surahs = [...ds.surahs].sort((a, b) => a.number - b.number);
  const ayahs = [...ds.ayahs].sort(
    (a, b) => a.surah_number - b.surah_number || a.ayah_number - b.ayah_number,
  );
  const translations = [...ds.translations].sort((a, b) => a.id.localeCompare(b.id));

  await writeArtifact("surahs.json", surahs, artifacts);
  await writeArtifact("ayahs.json", ayahs, artifacts);
  await writeArtifact("translations.json", translations, artifacts);

  const fingerprint = await sha256(
    new TextEncoder().encode(
      Object.keys(artifacts)
        .sort()
        .map((k) => `${k}:${artifacts[k]!.sha256}`)
        .join("|"),
    ),
  );

  const manifest: Manifest = {
    corpus_version: `canonical-${fingerprint.slice(0, 12)}`,
    truth_class: "canonical",
    counts: { surahs: surahs.length, ayahs: ayahs.length, translations: translations.length },
    languages: [...new Set(translations.map((t) => t.lang))].sort(),
    artifacts,
    sources,
  };

  await Bun.write(`${OUT_DIR}/manifest.json`, stableJson(manifest));
  return manifest;
}
