import { mkdir } from "node:fs/promises";
import type { CanonicalDataset } from "../domain/canonical.ts";
import type { InterpretiveDataset } from "../domain/interpretive.ts";
import { sha256, type Lockfile } from "./fetch.ts";

export const OUT_DIR = "data/canonical";

export interface Manifest {
  /** Version of the emitted corpus — this is the `graph_version` the cache key binds to. */
  readonly corpus_version: string;
  readonly truth_class: "canonical";
  readonly counts: {
    surahs: number;
    ayahs: number;
    translations_literal: number;
    translations_interpretive: number;
    tafsir_sources: number;
    tafsir_passages: number;
  };
  readonly languages: readonly string[];
  /** Attribution roster — who is speaking, and with what weight. Ships with the corpus. */
  readonly interpretive_voices: readonly { id: string; author: string; tier: number; note?: string }[];
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
export async function emit(
  ds: CanonicalDataset,
  interp: InterpretiveDataset,
  sources: Lockfile,
): Promise<Manifest> {
  await mkdir(OUT_DIR, { recursive: true });
  const artifacts: Record<string, { sha256: string; bytes: number }> = {};

  const surahs = [...ds.surahs].sort((a, b) => a.number - b.number);
  const ayahs = [...ds.ayahs].sort(
    (a, b) => a.surah_number - b.surah_number || a.ayah_number - b.ayah_number,
  );
  const translations = [...ds.translations].sort((a, b) => a.id.localeCompare(b.id));
  const tafsirSources = [...interp.tafsir_sources].sort((a, b) => a.id.localeCompare(b.id));
  const tafsirPassages = [...interp.tafsir_passages].sort(
    (a, b) =>
      a.source_id.localeCompare(b.source_id) ||
      a.surah_number - b.surah_number ||
      a.ayah_number - b.ayah_number,
  );

  await writeArtifact("surahs.json", surahs, artifacts);
  await writeArtifact("ayahs.json", ayahs, artifacts);
  await writeArtifact("translations.json", translations, artifacts);
  await writeArtifact("tafsir-sources.json", tafsirSources, artifacts);
  await writeArtifact("tafsir-passages.json", tafsirPassages, artifacts);

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
    counts: {
      surahs: surahs.length,
      ayahs: ayahs.length,
      translations_literal: translations.filter((t) => t.translation_type === "literal").length,
      translations_interpretive: translations.filter((t) => t.translation_type === "interpretive").length,
      tafsir_sources: tafsirSources.length,
      tafsir_passages: tafsirPassages.length,
    },
    languages: [...new Set(translations.map((t) => t.lang))].sort(),
    interpretive_voices: tafsirSources.map((s) => ({
      id: s.id,
      author: s.author,
      tier: s.authority_tier,
      ...(s.note ? { note: s.note } : {}),
    })),
    artifacts,
    sources,
  };

  await Bun.write(`${OUT_DIR}/manifest.json`, stableJson(manifest));
  return manifest;
}
