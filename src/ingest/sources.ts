/**
 * Pinned source registry.
 *
 * Every canonical input is fetched from a fixed URL and verified against a sha256
 * recorded in `sources.lock.json`. If upstream changes a single byte, ingest FAILS
 * rather than silently importing altered scripture. Refreshing a pin is a deliberate,
 * reviewable act: `bun run ingest:lock` rewrites the lockfile, and the diff is the
 * evidence a human signs off on.
 */

export type SourceKind = "metadata" | "quran-text" | "translation";

export interface Source {
  readonly id: string;
  readonly kind: SourceKind;
  readonly url: string;
  /** Filename under data/raw/. */
  readonly file: string;
  readonly license: string;
  readonly attribution: string;
  /** For translations only: language code + the named human translator. */
  readonly lang?: string;
  readonly translator?: string;
}

export const SOURCES: readonly Source[] = [
  {
    id: "tanzil-metadata",
    kind: "metadata",
    url: "https://tanzil.net/res/text/metadata/quran-data.xml",
    file: "quran-data.xml",
    license: "CC BY 3.0",
    attribution: "Tanzil.net — Qur'an metadata",
  },
  {
    id: "tanzil-uthmani",
    kind: "quran-text",
    url: "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&quranType=uthmani&outType=txt-2&agree=true",
    file: "quran-uthmani.txt",
    license: "CC BY-ND 3.0 (unmodified redistribution only)",
    attribution: "Tanzil.net — Uthmani Qur'an text",
  },
  {
    id: "tanzil-id-indonesian",
    kind: "translation",
    url: "https://tanzil.net/trans/id.indonesian",
    file: "id.indonesian.txt",
    license: "CC BY-ND 3.0 (unmodified redistribution only)",
    attribution: "Tanzil.net — Indonesian translation (Kementerian Agama RI)",
    lang: "id",
    translator: "Kementerian Agama Republik Indonesia",
  },
] as const;

export function sourceById(id: string): Source {
  const found = SOURCES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown source: ${id}`);
  return found;
}

/**
 * NOTE ON SCOPE — deliberate omission.
 *
 * The Tarjamah Tafsiriyah and any Tafsir corpora are NOT listed here. They are
 * `interpretive`, not `canonical`: they carry provenance, an authority_tier, and
 * they enter the graph through the extraction pipeline behind the scholar review
 * gate (spec Parts 2-3). Which Tafsir are in scope is a scholar-board decision,
 * not an engineering one — see the board sign-off step. Do not add them to this file.
 */
