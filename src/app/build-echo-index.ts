/**
 * THE REF→TEXT INDEX — what lets the echo wall arm on an ayah the PROSE CITED.
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────
 *
 * `scriptureEchoShape` can only compare prose against text it was HANDED, and the Worker hands it
 * this turn's retrieval. ISC-419's located violation (QS 66:6, `run 7`, 2026-08-24) shipped on a turn
 * that retrieved ZERO verses, so the wall opened with `if (verses.length === 0) return null` and was
 * inert by construction. Arming it from the cited anchor means the Worker must be able to turn
 * `QS 66:6` into the words we ship for 66:6 — and it cannot:
 *
 *   · `verifyGrounding` is a hash-MEMBERSHIP test over `(ref, text)`. It proves a pair is ours; it
 *     cannot invert a ref into a text, and a 48-bit digest is not invertible even in principle.
 *   · `guard` is SYNCHRONOUS — `(candidate: string) => GuardVerdict` — and `repair` calls it
 *     repeatedly on sub-slices, so nothing inside it may await an asset fetch.
 *
 * Erik's ruling (2026-08-25) picked the per-isolate index over an async guard: the generation loop
 * and `repair` stay untouched, and the cost is a cold-start load rather than a refactor of every
 * call site plus a SHAPE check on every `env.ASSETS.fetch`.
 *
 * ── WHY THE SHARDS AND NOT `corpus.json` ─────────────────────────────────────────────────────────
 *
 * `corpus.json` is the CURATED retrieval set. An ayah the prose cites but retrieval never returned is
 * exactly the case this index exists for, so building it from the curated set would leave the wall
 * blind on the very refs that motivated it. The 114 surah shards carry all 6,236, and every one of
 * them resolves — measured, not assumed: 6,236 resolvable, 0 missing.
 *
 * ── FIDELITY, which is what makes `ECHO_MIN_RUN_CITED = 6` still mean what it was measured to mean ─
 *
 * The floor was calibrated by `src/eval/echo-widen.ts`, whose treatment arm resolved a cited ref to
 * ONE text — `p.text ?? c.text` off these same shards. This emitter therefore selects through
 * `groundingTextOf`, the SAME function `gatherGrounding` and `build-grounding-digest.ts` select
 * through, so the index text for a ref is byte-identical to the text the retrieved path would have
 * supplied for it. A different selection here would silently re-calibrate a constant measured
 * elsewhere, which is the shape this repo has paid for before.
 *
 * Run: `bun run app:echo-index` (wired into `bun run build` beside `app:grounding-digest`).
 */
import { groundingTextOf } from "../../web/src/grounding-digest.ts";

const SHARD_DIR = "web/public/surah";
const OUT = "web/public/echo-index.json";
const SURAHS = 114;

interface ShardVerse {
  readonly a: number;
  readonly p?: { readonly text: string } | null;
  readonly c?: { readonly text: string } | null;
}

const texts: Record<string, string> = {};
let missing = 0;

for (let s = 1; s <= SURAHS; s += 1) {
  const shard = (await Bun.file(`${SHARD_DIR}/${s}.json`).json()) as { verses: ShardVerse[] };
  for (const v of shard.verses) {
    // `primary`/`companion` are the contract's field names; the shard abbreviates them to `p`/`c`.
    // Mapped rather than re-implemented so the selection rule stays in ONE place.
    const text = groundingTextOf({ primary: v.p ?? null, companion: v.c ?? null });
    if (!text) {
      missing += 1;
      continue;
    }
    texts[`${s}:${v.a}`] = text;
  }
}

const count = Object.keys(texts).length;
// A shard set that resolves nothing would emit a well-formed EMPTY index, and the Worker's shape
// check would accept it — a wall switched off while every test around it passed. Fail the build
// instead: this is a generated artifact, and an empty one is a bug, never a valid state.
if (count === 0) throw new Error("build-echo-index: resolved 0 verses — refusing to emit an empty index");

await Bun.write(OUT, JSON.stringify({ count, texts }));
const kb = (await Bun.file(OUT).size) / 1024;
console.log(`✓ echo idx ${count} ayah translations (${missing} unresolvable) → ${OUT} (${(kb / 1024).toFixed(2)} MB)`);
