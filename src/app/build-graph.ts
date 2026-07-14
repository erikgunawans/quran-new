#!/usr/bin/env bun
/**
 * Build the structural graph — Path B1 from issue 07's Path B follow-up
 * (`.scratch/nur-phase2-trust-and-depth/issues/07-concept-cross-linking.md`).
 *
 * Per `docs/design/quran-graphrag.html` § Relationship vocabulary, the 16-predicate schema
 * splits into two very different cost tiers. This script builds ONLY the zero-LLM tier that's
 * genuinely new (not already fully expressed by the existing corpus/shard architecture):
 *
 *   (TafsirPassage) -[:EXPLAINS]->    (Ayah)
 *   (TafsirPassage) -[:AUTHORED_BY]-> (TafsirSource)
 *
 * These aren't extracted from anything — they're the ALREADY-KNOWN structure of
 * `data/canonical/tafsir-passages.json` (18,707 passages, 3 sources), re-expressed as something
 * a reader can browse across the FULL corpus, not just the 55 curated verses `corpus.json`
 * ships to chat. (PART_OF, TRANSLATES, PRECEDES were considered too — but they're already fully
 * expressed by the existing ref-oracle/shard architecture; formalizing them here would just
 * relabel data that's already there, not add anything a reader can't already do.)
 *
 * The `derived` tier — Entity/Topic extraction, THEMATICALLY_LINKED_TO, NARRATIVE_OF,
 * SUBTOPIC_OF — genuinely needs an LLM reading tafsir text, and is NOT built here. That's a
 * separate follow-up needing its own decisions (LLM access, extraction scope, review workflow).
 *
 * PER-AYAH shards, not per-surah — measured first, per-surah is too big (surah 7's tafsir alone
 * is 9.3 MB as one file; worst single-ayah bundle is 57 KB). Same lesson already learned building
 * recitation audio. Output is gitignored (like corpus.json) — 113 MB of tafsir text across 6,236
 * files is a regenerable build artifact, not something to commit to git history.
 *
 *   bun run app:graph
 */
import { mkdir } from "node:fs/promises";

const DIR = "data/canonical";
const OUT_DIR = "web/public/tafsir";

interface TafsirPassage {
  id: string;
  source_id: string;
  ayah_id: string;
  surah_number: number;
  ayah_number: number;
  text: string;
  text_lang: string;
}

interface TafsirSource {
  id: string;
  name: string;
  author: string;
  lang: string;
  era: string;
  authority_tier: number;
  display_role: string;
}

const load = async <T>(n: string): Promise<T> => Bun.file(`${DIR}/${n}`).json();

const passages = await load<TafsirPassage[]>("tafsir-passages.json");
const sources = await load<TafsirSource[]>("tafsir-sources.json");

// The client already has this exact shape as `Voice` (retrieve.ts) — ship a matching sources
// catalog so every shard can stay small (source_id only) without losing attribution.
await mkdir(OUT_DIR, { recursive: true });
await Bun.write(
  `${OUT_DIR}/sources.json`,
  JSON.stringify(
    sources.map((s) => ({
      id: s.id,
      author: s.author,
      name: s.name,
      era: s.era,
      lang: s.lang,
      authority_tier: s.authority_tier,
      display_role: s.display_role,
    })),
    null,
    0,
  ),
);

// ── group by (surah, ayah) — the EXPLAINS edge, keyed by its target ──────────────
const byAyah = new Map<string, { source_id: string; text: string; lang: string }[]>();
for (const p of passages) {
  const key = `${p.surah_number}/${p.ayah_number}`;
  const list = byAyah.get(key) ?? [];
  list.push({ source_id: p.source_id, text: p.text, lang: p.text_lang });
  byAyah.set(key, list);
}

let written = 0;
let maxBytes = 0;
let totalBytes = 0;
const bySurahDir = new Set<number>();

for (const [key, list] of byAyah) {
  const [surahStr] = key.split("/");
  const surah = Number(surahStr);
  if (!bySurahDir.has(surah)) {
    await mkdir(`${OUT_DIR}/${surah}`, { recursive: true });
    bySurahDir.add(surah);
  }
  const json = JSON.stringify(list);
  const bytes = Buffer.byteLength(json);
  maxBytes = Math.max(maxBytes, bytes);
  totalBytes += bytes;
  await Bun.write(`${OUT_DIR}/${key}.json`, json);
  written++;
}

console.log(
  `✓ graph    ${written} ayahs with tafsir → ${OUT_DIR}/{surah}/{ayah}.json ` +
    `(worst: ${(maxBytes / 1024).toFixed(1)} KB, total: ${(totalBytes / 1024 / 1024).toFixed(1)} MB, gitignored — regenerate with \`bun run app:graph\`)`,
);
console.log(`✓ sources  ${sources.length} tafsir sources → ${OUT_DIR}/sources.json`);
