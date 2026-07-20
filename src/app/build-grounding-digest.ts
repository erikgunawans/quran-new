/**
 * The grounding digest — proof that a piece of grounding is real.
 *
 * `/api/answer` is a public endpoint that authors religious answers from grounding the BROWSER sends
 * it. `sanitizeGrounding` bounds that input's size, type and count, but never asked the only question
 * that matters: is this text something a scholar actually wrote?
 *
 * It was not. So a caller could POST invented "scholar index entries" and get back a fluent Indonesian
 * answer built on them — and the egress guard could not help, because it whitelists citations against
 * the SUBMITTED grounding, so fabricated grounding whitelists itself. The blast radius is limited (the
 * answer returns only to that caller; nothing leaks, no other reader is affected) but the artifact is
 * a screenshot of this app, under a real scholar's name, saying something no scholar said.
 *
 * The fix is to make the Worker able to check. Re-running retrieval at the edge would mean shipping
 * the corpus and all thirteen Peta shards into the Worker on every cold isolate; instead this emits a
 * small set of hashes — one per legitimate grounding item — that the Worker fetches once and reuses.
 *
 * The hash covers ref AND text, so a real reference carrying invented words fails just as a wholly
 * invented reference does. That is the actual attack: `2:255` is a real ayah, and it is the fabricated
 * sentence attached to it that would do the damage.
 *
 * CRITICAL: the hashed pair must be byte-identical to what `gatherGrounding` sends and what
 * `sanitizeGrounding` keeps — same text selection, same truncation. Any drift here fails CLOSED
 * (legitimate grounding gets rejected and synthesis bows out to the principled edition), which is the
 * safe direction but silently costs the AI edition its reason to exist. The parity test pins it.
 *
 * Run: `bun run app:grounding-digest` (wired into `bun run build` after the corpus and Peta shards).
 */
const CORPUS = "web/public/corpus.json";
const PETA_DIR = "web/public/peta";
const OUT = "web/public/grounding-digest.json";

// The hash lives in web/src/grounding-digest.ts, imported by BOTH this builder and the Worker.
// Two copies would drift, and drift fails closed — see that file's header.
import { groundingTextOf, hashGrounding } from "../../web/src/grounding-digest.ts";

const hashes = new Set<string>();

// ── curated verses: exactly the {ref, text} pair gatherGrounding builds ──────
const corpus = await Bun.file(CORPUS).json();
for (const v of corpus.verses) {
  hashes.add(await hashGrounding(v.ref, groundingTextOf(v)));
}
const verseCount = hashes.size;

// ── the scholar's index entries, across every Peta shard ─────────────────────
const index = await Bun.file(`${PETA_DIR}/index.json`).json();
for (const cat of index.categories) {
  const shard = await Bun.file(`${PETA_DIR}/${cat.slug}.json`).json();
  for (const st of shard.subtopics) {
    for (const e of st.entries) hashes.add(await hashGrounding(e.ref, e.text));
  }
}

const sorted = [...hashes].sort();
await Bun.write(OUT, JSON.stringify({ algorithm: "sha256-48", count: sorted.length, hashes: sorted }));
const kb = (await Bun.file(OUT).size) / 1024;
console.log(
  `✓ digest   ${sorted.length} grounding items (${verseCount} verses + ${sorted.length - verseCount} index entries) → ${OUT} (${kb.toFixed(1)} KB)`,
);
