#!/usr/bin/env bun
/**
 * Path B2 pilot — LLM-derived knowledge-graph edges (issue 09b).
 *
 * PILOT SCOPE by default: the same 55 verses issue 07's Path A already uses
 * (`src/review/problem-verses.ts`) — a known, bounded, already-trusted sample, so extraction
 * quality can be judged against verses Erik already knows, not against the full 18,707-passage
 * corpus sight unseen. `--full` runs the entire corpus — a real cost/scale decision, not a flag
 * to reach for casually.
 *
 * Sequential, not parallel — a good citizen of OpenRouter's rate limits, same reasoning as the
 * audio ingest script. Every edge lands in a REVIEW QUEUE, `review_status: "auto"` — NOTHING
 * here is shipped to `web/public`. A human reviews before any of this could ever inform a future
 * shard. Same discipline as `data/review/divergence.json`.
 *
 *   bun run app:graph:derived            pilot (55 curated verses × up to 3 tafsir sources)
 *   bun run app:graph:derived --full     the ENTIRE corpus — deliberate, not a default
 */
import { complete } from "../ingest/openrouter.ts";
import { PROBLEM_VERSES } from "../review/problem-verses.ts";
import { parseEdgesResponse, SYSTEM_PROMPT, validateEdge, type ExtractedEdge } from "../review/graph-extraction.ts";

const OUT_PATH = "data/review/graph-extraction.json";
const RUN_ID = `llm_extract_pilot_${new Date().toISOString().slice(0, 10)}`;

interface TafsirPassage {
  source_id: string;
  ayah_id: string;
  surah_number: number;
  ayah_number: number;
  text: string;
  text_lang: string;
}

async function loadPassages(): Promise<TafsirPassage[]> {
  const all = (await Bun.file("data/canonical/tafsir-passages.json").json()) as TafsirPassage[];
  if (process.argv.includes("--full")) return all;

  const pilotAyahs = new Set(PROBLEM_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`));
  return all.filter((p) => pilotAyahs.has(`${p.surah_number}:${p.ayah_number}`));
}

async function extractOne(passage: TafsirPassage): Promise<ExtractedEdge[]> {
  const raw = await complete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Ayah: ${passage.ayah_id}\nTafsir passage (source: ${passage.source_id}):\n${passage.text}`,
      },
    ],
    { json: true },
  );

  const candidates = parseEdgesResponse(raw);
  const valid = candidates
    .map((e) => validateEdge(e, passage.text))
    .filter((e): e is NonNullable<ReturnType<typeof validateEdge>> => e !== null);

  return valid.map((e) => ({
    ...e,
    source_id: passage.source_id,
    extracted_by: RUN_ID,
    review_status: "auto" as const,
  }));
}

async function main(): Promise<void> {
  const passages = await loadPassages();
  const full = process.argv.includes("--full");

  console.log(`Extracting from ${passages.length} tafsir passages (run: ${RUN_ID}, scope: ${full ? "FULL CORPUS" : "pilot"})`);
  if (full) {
    console.log(`  ⚠ full-corpus run — ${passages.length} model calls, real cost, real time. Ctrl-C now to abort.`);
  }

  const edges: ExtractedEdge[] = [];
  let failures = 0;
  let done = 0;

  for (const passage of passages) {
    try {
      edges.push(...(await extractOne(passage)));
    } catch (err) {
      failures++;
      console.warn(`  ⚠ ${passage.ayah_id}/${passage.source_id}: ${err instanceof Error ? err.message : err}`);
    }
    done++;
    if (done % 10 === 0 || done === passages.length) {
      console.log(`  ${done}/${passages.length} passages · ${edges.length} edges · ${failures} failures`);
    }
  }

  await Bun.write(OUT_PATH, JSON.stringify(edges, null, 2) + "\n");
  console.log(
    `\n✓ ${edges.length} edges (from ${passages.length - failures}/${passages.length} passages) → ${OUT_PATH}`,
  );
  console.log(`  review_status: "auto" for all of them — nothing shipped, human review is the next step.`);
}

await main();
