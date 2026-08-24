/**
 * WHAT WOULD IT COST to arm the echo wall from the ayah the PROSE CITES, not only the ayahs
 * retrieval handed the turn?
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * ISC-419's located violation (QS 66:6, `run 7`, unquoted, 2026-08-24) shipped on a turn that
 * retrieved ZERO verses. `scriptureEchoShape` opens with `if (verses.length === 0) return null`, so
 * the wall was handed `[]` and was inert BY CONSTRUCTION — it did not fail, it never ran. The
 * proposed close is to hand it the ayahs the prose itself cites.
 *
 * That is a WALL change, and ISC-419 was deliberately fixed in the PROMPT rather than the wall
 * precisely because a hard egress rule can reject the app's best answers and fall back to the
 * caption list Erik refused. So the widening is NOT armed here. Erik's ruling (2026-08-24) was
 * *build it behind a measurement first* — this file is that measurement, and it gates nothing.
 *
 * ── THE TWO ARMS ────────────────────────────────────────────────────────────────────────────────
 *
 *   CONTROL   `scriptureEchoShape(prose, retrieved)`          — what prod does today.
 *   TREATMENT `scriptureEchoShape(prose, retrieved ∪ cited)`  — what the widening would do.
 *
 * Both arms call THE REAL WALL, imported from `answer-guard.ts`. There is no second copy of the rule
 * to drift, and no reimplementation of the thing under test — an InnerTube probe that reimplemented
 * `yt-dlp` reported the same false reading from a working host and a blocked one (2026-08-24).
 * Citations are extracted with `refsInProse` from `scripture-echo.ts`, likewise the shipped one.
 *
 * ── FIDELITY OF THE CONTROL ARM, which decides whether the delta means anything ─────────────────
 *
 * `worker/src/index.ts:973` builds the wall's verse argument as `verses.map((v) => ({ ref: v.ref,
 * texts: [v.text] }))` — ONE text per retrieved ayah, and `GroundingVerse.text` is documented as
 * *"interpretive primary, else literal"*. So the control arm resolves ONE text per ref, primary
 * when we ship one and companion otherwise. Handing the control arm every shipped translation would
 * make it refuse more than prod does and would UNDERSTATE the delta — the direction that flatters
 * the change being measured.
 *
 * The treatment arm resolves cited refs the same one-text way, so the two arms differ in the VERSE
 * SET and in nothing else.
 *
 * ── WHAT THIS CANNOT DO ─────────────────────────────────────────────────────────────────────────
 *
 *   1. IT RETURNS NO VERDICT. Every newly-refused sentence is printed to be READ. A count here is a
 *      count of REFUSALS THE WIDENING WOULD ADD, never of violations it would correctly catch. That
 *      split is a human call and this file does not make it.
 *   2. IT CANNOT SEE AN UNCITED RENDERING. If the prose renders an ayah it never names and retrieval
 *      never returned, neither arm has anything to compare against. A zero from the delta never
 *      means "clean" — it means "nothing NEW was caught".
 *   3. ITS SAMPLE IS THE PROBE'S EIGHT QUESTIONS. That is a measured SET, not a class.
 *
 * USAGE.
 *   bun run src/eval/wall-live-probe.ts --repeat 2 --dump /tmp/rows.json
 *   bun run src/eval/echo-widen.ts --rows /tmp/rows.json
 */
import { echoWords, scriptureEchoShape, sharedRun } from "../../web/src/answer-guard.ts";
import { refsInProse } from "./scripture-echo.ts";

interface Row {
  readonly q: string;
  readonly prose: string;
  readonly verseRefs: readonly string[];
  readonly bucket: string;
  readonly genRule?: string | null;
}

const flag = (n: string): string | undefined => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
};

/**
 * ONE text per ref, primary when shipped and companion otherwise — the shape prod hands the wall.
 * Returns null when we ship no translation at all for the ref, which is a ref the widening could
 * never have armed on and must not be silently counted as one it did.
 */
async function textFor(ref: string, cache: Map<string, string | null>): Promise<string | null> {
  if (cache.has(ref)) return cache.get(ref) ?? null;
  const [s, a] = ref.split(":").map(Number);
  let out: string | null = null;
  try {
    const shard = (await Bun.file(`web/public/surah/${s}.json`).json()) as {
      verses: { a: number; p?: { text?: string }; c?: { text?: string } }[];
    };
    const v = shard.verses.find((x) => x.a === a);
    out = v?.p?.text ?? v?.c?.text ?? null;
  } catch {
    out = null;
  }
  cache.set(ref, out);
  return out;
}

export interface WidenResult {
  readonly scored: number;
  readonly citedTotal: number;
  readonly citedUnretrieved: number;
  readonly unresolvable: number;
  readonly controlRefusals: number;
  readonly treatmentRefusals: number;
  readonly added: readonly { q: string; sentence: string; newRefs: string[]; retrieved: string[] }[];
}

/**
 * Score both arms over a set of probe rows.
 *
 * Exported so the control set in `echo-widen.test.ts` can force it RED. An instrument whose delta is
 * always zero and an instrument that is broken print the same number, and this repo has shipped that
 * shape before (`eval:grounding` pinned the hadith predicate to `() => false` and reported ~24%
 * either way). The test proves this one can fire.
 */
export async function scoreWidening(rows: readonly Row[]): Promise<WidenResult> {
  const answered = rows.filter((r) => r.prose && r.prose.trim().length > 0);
  const cache = new Map<string, string | null>();

  let controlRefusals = 0;
  let treatmentRefusals = 0;
  let citedTotal = 0;
  let citedUnretrieved = 0;
  let unresolvable = 0;
  const added: { q: string; sentence: string; newRefs: string[]; retrieved: string[] }[] = [];

  for (const r of answered) {
    const retrieved = [...new Set(r.verseRefs ?? [])];
    const cited = [...new Set(refsInProse(r.prose))];
    citedTotal += cited.length;
    const newRefs = cited.filter((c) => !retrieved.includes(c));
    citedUnretrieved += newRefs.length;

    const build = async (refs: readonly string[]): Promise<{ ref: string; texts: string[] }[]> => {
      const out: { ref: string; texts: string[] }[] = [];
      for (const ref of refs) {
        const tx = await textFor(ref, cache);
        if (tx === null) continue;
        out.push({ ref, texts: [tx] });
      }
      return out;
    };
    for (const ref of newRefs) if ((await textFor(ref, cache)) === null) unresolvable += 1;

    const ctl = scriptureEchoShape(r.prose, await build(retrieved));
    const trt = scriptureEchoShape(r.prose, await build([...retrieved, ...newRefs]));
    if (ctl) controlRefusals += 1;
    if (trt) treatmentRefusals += 1;
    if (!ctl && trt) added.push({ q: r.q, sentence: trt, newRefs, retrieved });
  }

  return {
    scored: answered.length,
    citedTotal,
    citedUnretrieved,
    unresolvable,
    controlRefusals,
    treatmentRefusals,
    added,
  };
}


/**
 * The wall's threshold is a CONSTANT (`ECHO_MIN_RUN = 4`), calibrated on RETRIEVED verses — a set
 * the turn was actually grounded on. Widening the verse set changes what that constant is doing:
 * every extra anchor is another chance for a generic Indonesian phrase to collide. So the cost of
 * the widening is not one number, it is a curve, and the curve is what decides whether the change
 * is affordable.
 *
 * This walks the same comparison the wall makes — `sharedRun` over `echoWords`, both imported from
 * `answer-guard.ts`, no second copy — and reports, per candidate threshold, how many turns each arm
 * would refuse. `ECHO_MIN_RUN` itself is NOT changed here and nothing is armed.
 */
export async function sweepThresholds(
  rows: readonly Row[],
  thresholds: readonly number[] = [4, 5, 6, 7, 8],
): Promise<{ t: number; control: number; treatment: number; added: number }[]> {
  const cache = new Map<string, string | null>();
  const answered = rows.filter((r) => r.prose && r.prose.trim().length > 0);

  // Per turn: the longest run against RETRIEVED verses, and against retrieved ∪ cited.
  const perTurn: { ctlMax: number; trtMax: number }[] = [];
  for (const r of answered) {
    const retrieved = [...new Set(r.verseRefs ?? [])];
    const newRefs = [...new Set(refsInProse(r.prose))].filter((c) => !retrieved.includes(c));

    const texts = async (refs: readonly string[]): Promise<string[]> => {
      const out: string[] = [];
      for (const ref of refs) {
        const tx = await textFor(ref, cache);
        if (tx !== null) out.push(tx);
      }
      return out;
    };
    const ctlTexts = await texts(retrieved);
    const newTexts = await texts(newRefs);

    let ctlMax = 0;
    let trtMax = 0;
    for (const raw of r.prose.split(/(?<=[.!?])\s+/u)) {
      const words = echoWords(raw.trim());
      if (words.length === 0) continue;
      for (const tx of ctlTexts) ctlMax = Math.max(ctlMax, sharedRun(words, echoWords(tx)));
      for (const tx of newTexts) trtMax = Math.max(trtMax, sharedRun(words, echoWords(tx)));
    }
    trtMax = Math.max(trtMax, ctlMax);
    perTurn.push({ ctlMax, trtMax });
  }

  return thresholds.map((t) => ({
    t,
    control: perTurn.filter((x) => x.ctlMax >= t).length,
    treatment: perTurn.filter((x) => x.trtMax >= t).length,
    added: perTurn.filter((x) => x.trtMax >= t && x.ctlMax < t).length,
  }));
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const ROWS = flag("rows");
  if (!ROWS) {
    console.error("need --rows <dump.json> from wall-live-probe");
    process.exit(2);
  }
  const rows = (await Bun.file(ROWS).json()) as Row[];
  const r = await scoreWidening(rows);

  console.log(`\n── echo-wall widening: what arming from the CITED ayah would add ──\n`);
  console.log(`answered turns scored          : ${r.scored}`);
  console.log(`citations found in prose       : ${r.citedTotal}`);
  console.log(`  …to ayahs NOT retrieved      : ${r.citedUnretrieved}  ← the widening's whole reach`);
  console.log(`  …of those, no shipped text   : ${r.unresolvable}  (could not arm even if we wanted to)`);
  console.log(`\nCONTROL   refusals (prod today): ${r.controlRefusals}/${r.scored}`);
  console.log(`TREATMENT refusals (widened)   : ${r.treatmentRefusals}/${r.scored}`);
  console.log(`DELTA — turns NEWLY refused    : ${r.added.length}\n`);

  const sweep = await sweepThresholds(rows);
  console.log("── threshold sweep (ECHO_MIN_RUN is 4 today; nothing here is armed) ──\n");
  console.log("  run≥  control  widened  newly-refused");
  for (const s of sweep) {
    console.log(`  ${String(s.t).padStart(3)}  ${String(s.control).padStart(7)}  ${String(s.treatment).padStart(7)}  ${String(s.added).padStart(13)}`);
  }
  console.log();

  if (r.added.length === 0) {
    console.log("No turn in this sample is newly refused. Read note 2: that is not 'clean'.\n");
  } else {
    console.log("Each newly-refused sentence, to be READ and classified by a human:\n");
    for (const [i, a] of r.added.entries()) {
      console.log(`[${i + 1}] q: ${a.q}`);
      console.log(`    armed by (cited, not retrieved): ${a.newRefs.join(", ")}`);
      console.log(`    retrieved this turn            : ${a.retrieved.length ? a.retrieved.join(", ") : "(none)"}`);
      console.log(`    sentence: ${a.sentence}\n`);
    }
  }
}
