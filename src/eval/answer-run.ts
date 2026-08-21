/**
 * Offline eval harness for the SYNTHESIS edition's authored answers (new-quranku-ai).
 *
 * WHAT IT DOES. For each case in answer-cases.ts it runs the REAL pipeline: the same retrieval prod
 * uses (gatherGrounding → retrieve() + retrieveKnowledge()), the same system prompt and params
 * (SYNTHESIS_SYSTEM_PROMPT / buildAnswerUserMessage / ANSWER_PARAMS), the Worker's OWN generation
 * loop (`runGeneration` from worker/src/answer-generation.ts), then an LLM judge that sees the SAME
 * grounding and audits the answer against it. Output: a markdown report + a console summary.
 *
 * ⚠ SCORED SERIES BREAK — 2026-08-21, ISC-558. Do NOT compare a run from this version against the
 * `answer-*.md` reports of 2026-07-20 or any figure quoted from them. Three things changed at once,
 * each of which moves the numbers on its own:
 *
 *   1. THE POPULATION GREW. This harness used to return `observed: "no-grounding"` WITHOUT calling
 *      the model whenever retrieval came back empty, mirroring a bow-out the app had. Erik reversed
 *      that on 2026-08-21 (ISC-418, worker/src/index.ts:545) — the model now runs on every question.
 *      Cases that never reached the model in the old series now generate, guard and get judged.
 *   2. THE WALL WAS SWITCHED ON. The old call was `guardAnswerProse(out, allowed)` — two arguments,
 *      taking the documented defaults that make the echo wall and the hadith predicate INERT. A
 *      whole class of refusal was unreachable, so the old refusal rate is a floor, not a measurement.
 *   3. REPAIR NOW RUNS, because prod runs it (ISC-560). A candidate the wall refuses may now be
 *      excised sentence-by-sentence and shipped, where the old series scored the whole turn refused.
 *
 * WHAT IT REPRODUCES, AND WHAT IT CANNOT. Stated here rather than left to be discovered — the
 * sibling harness `refusal-capture.ts` shipped a draft that guessed one of these and denied its own
 * blind spot on both turns it mattered (ISC-554).
 *
 *   · loop      — `runGeneration` itself, one turn budget (`MODEL_DEADLINE_MS`) spent by both attempts.
 *   · guard     — `guardAnswerProse` with all FOUR arguments, exactly as worker/src/index.ts:824-830.
 *   · citable   — `isRealAyah`, the real mushaf, which is what prod passes. NOT the turn's grounding
 *                 refs: the old two-arg call passed `allowedRefsFrom(...)`, which is STRICTER than
 *                 prod and could refuse a real ayah the reader would have received.
 *   · repair    — `repairAnswerProse`, the real one, judged by the very guard closure above it.
 *   · hadith    — `groundedHadithFrom([])`, EMPTY BY CONSTRUCTION. There is no dalil binding in this
 *                 process, so nothing was retrieved for the predicate to ground. That is a real
 *                 blind spot, not a reproduction: the `bad_hadith` rule can fire on an unresolvable
 *                 marker here, but a turn prod would have GROUNDED cannot be told apart from one it
 *                 would have refused. The run prints this per-run rather than assuming it away.
 *   · dalil     — absent entirely. No hadith lane runs, so no turn here carries hadith grounding.
 *
 * WHY IT EXISTS. The synthesis edition authors substantive answers about Islam and shipped with no
 * evaluation of the thing that matters most about it. The 18 unit tests cover the prompt fences and
 * the guard's mechanics — "does the guard reject a bad ref" — not whether real model output is
 * faithful to its grounding. The guard catches ungrounded CITATIONS mechanically; it cannot catch an
 * ungrounded CLAIM in fluent Indonesian carrying no reference. This harness is how that gets seen.
 *
 * WHY OFFLINE. It calls the provider directly (OpenRouter), never the prod /api/answer endpoint.
 * Tune here, compare, deploy once — never poke prod.
 *
 * USAGE.
 *   bun run eval:answer -- --dry-run          # no key, no calls — prints real grounding + exact prompts
 *   export OPENROUTER_API_KEY=sk-...          # same key as the Worker secret; spends real (tiny) credit
 *   bun run eval:answer                       # full run: generate + guard + judge, writes a report
 *   bun run eval:answer -- --no-judge         # generate + guard only (cheaper)
 *   bun run eval:answer -- --limit 5          # first 5 cases (quick smoke)
 *   bun run eval:answer -- --only aqidah      # only cases whose id contains "aqidah"
 *   bun run eval:answer -- --temp 0.2         # override sampling temperature
 *   bun run eval:answer -- --model deepseek/deepseek-chat
 *
 * READ THE REPORT WITH THE GROUNDING OPEN. The decisive question is never "is this answer good?" but
 * "did the material license this answer?" — the report prints both side by side for exactly that.
 */
import { ANSWER_CASES, type AnswerCase, type ExpectedBehaviour } from "./answer-cases.ts";
import {
  ANSWER_PARAMS,
  SYNTHESIS_SYSTEM_PROMPT,
  buildAnswerUserMessage,
  type GroundingEntry,
  type GroundingVerse,
} from "../../web/src/answer-contract.ts";
import { guardAnswerProse, groundedHadithFrom } from "../../web/src/answer-guard.ts";
import { isRealAyah } from "../../web/src/quran.ts";
import { gatherGrounding } from "../../web/src/answer.ts";
import type { Corpus } from "../../web/src/retrieve.ts";
import { resolveProvider, callChatModel, MODEL_DEADLINE_MS } from "../../worker/src/providers.ts";
import { runGeneration, newGenTrace, type GenTrace } from "../../worker/src/answer-generation.ts";
import { repairAnswerProse } from "../../worker/src/answer-repair.ts";
import type { Env } from "../../worker/src/index.ts";
import type { ModelCall } from "./judge.ts";
import { judgeAnswer, renderGrounding, NULL_JUDGMENT, type AnswerJudgment } from "./answer-judge.ts";

// ── flags ──────────────────────────────────────────────────────────────────────────
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const ONLY = flag("only");
const NO_JUDGE = has("no-judge");
const DRY_RUN = has("dry-run");
const TEMP = flag("temp") ? Number(flag("temp")) : ANSWER_PARAMS.temperature;
const MODEL = flag("model");

const cases = ANSWER_CASES.filter((c) => (ONLY ? c.id.includes(ONLY) : true)).slice(0, LIMIT);
if (cases.length === 0) {
  console.error(`No cases matched${ONLY ? ` --only ${ONLY}` : ""}.`);
  process.exit(1);
}

// ── serve the built Peta shards from disk, WITHOUT breaking the provider call ───────
// retrieveKnowledge() fetches /peta/*.json, which has no server here. We shim those local paths —
// but the provider call is also fetch(), over https, so the shim MUST delegate real URLs to the real
// fetch or every model call dies inside the shim.
type FetchArgs = Parameters<typeof fetch>;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: FetchArgs[0], init?: FetchArgs[1]) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as { url: string }).url;
  if (/^https?:\/\//i.test(url)) return realFetch(input, init);
  const path = `web/public${url.startsWith("/") ? url : "/" + url}`;
  const text = await Bun.file(path).text();
  return { ok: true, json: async () => JSON.parse(text) } as unknown as Response;
}) as typeof fetch;

// ── corpus (the same build artifact the app ships) ──────────────────────────────────
const CORPUS_PATH = "web/public/corpus.json";
if (!(await Bun.file(CORPUS_PATH).exists())) {
  console.error(`✗ ${CORPUS_PATH} not found — run \`bun run app:corpus\` first (the eval uses the shipped corpus).`);
  process.exit(1);
}
const corpus = (await Bun.file(CORPUS_PATH).json()) as Corpus;

// ── grounding, via the SAME path prod uses ──────────────────────────────────────────
interface Grounded {
  readonly verses: GroundingVerse[];
  readonly entries: GroundingEntry[];
  readonly refs: string[];
}
const groundingOf = (c: AnswerCase): Promise<Grounded> =>
  gatherGrounding(corpus, c.question, [...(c.themes ?? [])]);

// ── dry run: no key, no model calls — but REAL retrieval, so you can audit the fence ─
if (DRY_RUN) {
  console.log("═══ DRY RUN — real retrieval, no API calls ═══\n");
  console.log("SYSTEM PROMPT (synthesis):\n" + SYNTHESIS_SYSTEM_PROMPT + "\n");
  for (const c of cases) {
    const g = await groundingOf(c);
    // NO BOW-OUT ANNOTATION HERE ANY MORE. An empty grounding used to print "synthesis bows out" and
    // suppress the prompt; since ISC-418's reversal the model runs on every question, and the
    // ungrounded prompt is exactly the one worth auditing in a dry run.
    const ungrounded = g.verses.length === 0 && g.entries.length === 0;
    console.log(`\n── [${c.id}] expect=${c.expect} — ${g.verses.length} verses, ${g.entries.length} entries${ungrounded ? "  ⟵ NO RETRIEVAL (model still runs, ISC-418 reversed)" : ""} ──`);
    console.log(`Q: ${c.question}`);
    console.log(buildAnswerUserMessage({ question: c.question, verses: g.verses, entries: g.entries }));
  }
  console.log(`\n(${cases.length} cases)`);
  process.exit(0);
}

// ── live run ────────────────────────────────────────────────────────────────────────
if (MODEL) process.env["OPENROUTER_MODEL"] = MODEL;
const env = {
  OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"],
  OPENROUTER_MODEL: process.env["OPENROUTER_MODEL"],
  SEALION_API_KEY: process.env["SEALION_API_KEY"],
} as unknown as Env;

/** The judge's call. Its opts carry no deadline — a judge call is not part of the turn's budget. */
let call: ModelCall;
/**
 * The GENERATION call, separate because it must carry `deadlineMs`.
 *
 * `runGeneration` hands each attempt the budget left in the turn, and a call that ignores it would
 * let two attempts spend `MODEL_DEADLINE_MS` each — the exact ISC-466 shape with the sides swapped,
 * and it would make `reason: "deadline"` unreachable here while prod reaches it.
 */
// `reasoning` is in the type, not just tolerated by it: `ANSWER_PARAMS` carries `reasoning: "none"`
// and a signature that omitted it would let the spread above compile while dropping the field.
let generateCall: (system: string, user: string, opts: { temperature: number; maxTokens: number; reasoning?: "none"; deadlineMs: number }) => Promise<string>;
try {
  const cfg = resolveProvider("openrouter", env);
  call = (system, user, opts) => callChatModel(cfg, system, user, opts);
  generateCall = (system, user, opts) => callChatModel(cfg, system, user, opts);
  console.log(`Model: ${cfg.model} | temp: ${TEMP} | cases: ${cases.length} | judge: ${NO_JUDGE ? "off" : "on"}`);
  console.log(`⚠ SERIES BREAK (ISC-558, 2026-08-21) — population, wall and repair all changed. Do not compare with pre-2026-08-21 reports.`);
  console.log(`  guard: FOUR arguments (isRealAyah · hadith predicate · echo verses) · repair: on · hadith grounding: EMPTY (no dalil binding offline)\n`);
} catch (e) {
  console.error(`✗ ${(e as Error).message}\n  Set OPENROUTER_API_KEY (the same key as the Worker secret), or use --dry-run.`);
  process.exit(1);
}

/**
 * What actually happened, mechanically — before any judgment. One token per `GenTrace.reason`,
 * plus `repaired` for the turn prod ships after excising a violating sentence.
 *
 * `"no-grounding"` IS GONE, and its absence is ISC-558's probe. It named a bow-out this harness
 * performed on the model's behalf; nothing in the app does that any more.
 */
type Observed = "answered" | "repaired" | "guard-rejected" | "deadline" | "model-error" | "no-attempt";

/** One candidate the wall judged, retained with the verdict it earned. */
interface GuardCall {
  readonly prose: string;
  readonly ok: boolean;
  readonly detail: string;
}

interface Result {
  readonly c: AnswerCase;
  readonly g: Grounded;
  /** Every candidate the wall was shown, in order — including each sentence mask repair tried. */
  readonly calls: readonly GuardCall[];
  /** The prose that cleared the wall, or null. Post-repair when repair fired. */
  readonly answer: string | null;
  readonly observed: Observed;
  readonly trace: GenTrace;
  /** `| undefined` is required by exactOptionalPropertyTypes — the runner assigns it unconditionally. */
  readonly judgment?: AnswerJudgment | undefined;
}

/**
 * Reproduce the Worker's answer path — by CALLING it, not by re-implementing it.
 *
 * This used to be a hand-rolled 2-attempt loop under a docblock claiming exactness. It drifted three
 * ways at once (see the SERIES BREAK note at the top), which is the argument for the seam:
 * `runGeneration` is the module `handleAnswer` calls, so the retry policy, the deadline arithmetic
 * and the repair step cannot silently differ here.
 *
 * The guard closure is WRAPPED rather than passed straight through — the same device
 * `refusal-capture.ts` uses. `GenTrace` reports the verdict but keeps no prose, and this report's
 * whole value is printing the candidate beside its grounding.
 */
async function generate(c: AnswerCase, g: Grounded): Promise<{ calls: GuardCall[]; answer: string | null; observed: Observed; trace: GenTrace }> {
  const user = buildAnswerUserMessage({ question: c.question, verses: g.verses, entries: g.entries });
  // EMPTY BY CONSTRUCTION and declared in the header: no dalil binding in this process, so nothing
  // was retrieved for the predicate to ground. Passed explicitly so the argument list matches prod's.
  const isGroundedHadith = groundedHadithFrom([]);
  const echoVerses = g.verses.map((v) => ({ ref: v.ref, texts: [v.text] }));

  const calls: GuardCall[] = [];
  const guard = (candidate: string) => {
    const verdict = guardAnswerProse(candidate, isRealAyah, isGroundedHadith, echoVerses);
    calls.push({
      prose: candidate,
      ok: verdict.ok,
      detail: verdict.violations.map((v) => `${v.rule}/${v.kind}:${v.detail}`).join(", "),
    });
    return verdict;
  };

  const trace = newGenTrace();
  try {
    await runGeneration(trace, {
      turnDeadline: Date.now() + MODEL_DEADLINE_MS,
      now: Date.now,
      // SPREAD `ANSWER_PARAMS`, never pick fields off it. Picking `temperature` and `maxTokens` by
      // hand silently dropped `reasoning: "none"` — and the configured model is a REASONING model
      // (providers.ts:152), so the harness ran it with reasoning ON while prod runs it OFF. That is
      // not a small divergence: it changes both the prose and the latency, and it would have made
      // the `deadline` bucket this file just added a measurement on a clock prod does not use.
      // `--temp` still overrides, which is the one deliberate departure and is printed in the header.
      generate: ({ deadlineMs }) =>
        generateCall(SYNTHESIS_SYSTEM_PROMPT, user, { ...ANSWER_PARAMS, temperature: TEMP, deadlineMs }),
      guard,
      repair: repairAnswerProse,
    });
  } catch (e) {
    // The Worker catches here too and still returns the verdict already earned; the trace is intact
    // either way, so the reason below is read from it rather than from the throw.
    calls.push({ prose: `<threw: ${(e as Error).message}>`, ok: false, detail: "threw" });
  }

  const observed: Observed =
    trace.reason === "answered" ? (trace.repaired ? "repaired" : "answered")
    : trace.reason === "blocked" ? "guard-rejected"
    : trace.reason === "deadline" ? "deadline"
    : trace.reason === "threw" ? "model-error"
    : "no-attempt";
  return { calls, answer: trace.answer, observed, trace };
}

/**
 * The expectation is a hypothesis; this is the honest mechanical check of it.
 *
 * `"fallback"` IS NO LONGER MECHANICALLY OBSERVABLE, and is reported as its own bucket rather than
 * scored either way. It meant "nothing to ground on — synthesis must bow out and let the principled
 * behaviour stand", and since ISC-418's reversal there is no bow-out to observe: the model answers
 * every question. Counting these as matched would be false-green; as mismatched, false-red.
 *
 * THE THREE CASES DO NOT FAIL THE SAME WAY, AND ONE OF THEM IS A FIQH FENCE. A first version of
 * this comment said an off-topic question is "supposed to be REDIRECTED by rule 9" and left it
 * there, which is true of two of the three and the exact opposite of the third:
 *
 * BOTH READINGS ARE RULE 9 — its two halves, which an earlier draft of this comment split across
 * two rules and attributed backwards. Rule 9 opens "ANSWER EVERY ISLAMIC QUESTION — NEVER BOW OUT"
 * and its SECOND paragraph carves the exception: "A QUESTION THAT IS NOT ABOUT ISLAM OR THEIR LIFE
 * AT ALL". Same rule, opposite instructions, and which half applies is the whole distinction:
 *
 *   · `gap-unrelated`, `gap-mundane` — UNSETTLED, and this file does not settle them. A draft of
 *     this comment called them "genuinely off-topic (investing, tomorrow's weather)" and applied
 *     the exception half. `scholarly-gate` caught that the quote had been cut one sentence short:
 *     the exception ENDS "A question about grief, MONEY, anger, family, work or doubt is NOT
 *     off-topic — that is exactly what this app is for", and `gap-unrelated` ("gimana cara
 *     investasi saham biar cuan") is a money question. Its note says "outside the CORPUS entirely",
 *     which is a coverage claim, not an off-topic one. Classifying it is Erik's, like `fiqh-rakaat`
 *     — and it is worse than the fiqh case, because that one was declared unsettled while this one
 *     was declared settled in the same edit, by a quote that stopped where it suited me.
 *   · `fiqh-rakaat` ("berapa rakaat sholat dhuha yang benar?") — an ISLAMIC question, so the FIRST
 *     half applies and orders it answered. Its case note declared `expect: "fallback"` and gave the
 *     reason: "Synthesis must bow out too, not reconstruct fiqh from a feeling verse". The bow-out
 *     half of that is gone; the reason is not. It retrieves (0 verses, 6 entries), so it always
 *     reached the model, and the old harness flagged MISMATCH the moment it answered at all — a
 *     fence now wrong in the other direction, because answering is what the app is told to do.
 *
 * SO ITS FENCE IS NOT RESTORED HERE, and that is deliberate rather than overlooked. Re-declaring
 * `fiqh-rakaat` as `expect: "defer"` would be the natural move and it is NOT mine to make: it
 * decides what this app should do when asked for a rakaat count, which is a fiqh question for Erik
 * and the ustadz, not a harness cleanup. What this file does instead is refuse to let the case go
 * dark — `rulingWatch` below flags a ruling on any case not expecting `defer`, so a rakaat count
 * issued here still lands in front of Erik with the judge's words attached WHEN THE JUDGE RUNS.
 * Under `--no-judge` there is no flag and no fence; that mode buys its cheapness with this hole.
 */
const unobservable = (e: ExpectedBehaviour): boolean => e === "fallback";
const matched = (r: Result): boolean => !unobservable(r.c.expect) && (r.observed === "answered" || r.observed === "repaired");

const results: Result[] = [];
for (const c of cases) {
  const g = await groundingOf(c);
  const { calls, answer, observed, trace } = await generate(c, g);
  let judgment: AnswerJudgment | undefined;
  // The REPAIRED prose is what a reader would receive, so it is what the judge must score. Judging
  // the pre-repair candidate would score text the app never shipped.
  if (!NO_JUDGE && answer) {
    try {
      judgment = await judgeAnswer(call, c.question, g.verses, g.entries, answer);
    } catch (e) {
      judgment = NULL_JUDGMENT("judge-error", (e as Error).message);
    }
  }
  results.push({ c, g, calls, answer, observed, trace, judgment });
  process.stdout.write(
    observed === "answered" ? (trace.attempts.length > 1 ? "r" : ".")
    : observed === "repaired" ? "±"
    : observed === "deadline" ? "⏱"
    : "✗",
  );
}
process.stdout.write("\n\n");

// ── aggregate ───────────────────────────────────────────────────────────────────────
const n = results.length;
const answered = results.filter((r) => r.observed === "answered");
const repaired = results.filter((r) => r.observed === "repaired");
const shipped = results.filter((r) => r.answer !== null);
const rejected = results.filter((r) => r.observed === "guard-rejected");
const timedOut = results.filter((r) => r.observed === "deadline");
const errored = results.filter((r) => r.observed === "model-error" || r.observed === "no-attempt");
const ungroundable = results.filter((r) => r.g.verses.length === 0 && r.g.entries.length === 0);
/** Reported separately from `matched` — see `unobservable`. Neither a pass nor a fail. */
const unscorable = results.filter((r) => unobservable(r.c.expect));
const mismatches = results.filter((r) => !unobservable(r.c.expect) && !matched(r));

const judged = results.filter((r) => r.judgment && r.judgment.groundedness > 0);
const avg = (pick: (j: AnswerJudgment) => number): string =>
  judged.length ? (judged.reduce((s, r) => s + pick(r.judgment!), 0) / judged.length).toFixed(2) : "—";

const flagCounts = new Map<string, number>();
for (const r of results) for (const f of r.judgment?.flags ?? []) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);

/** The headline risk: a case that should have deferred but issued a ruling, or scored low on humility. */
const deferBreaches = results.filter(
  (r) => r.c.expect === "defer" && r.judgment && (r.judgment.flags.includes("ruling-issued") || (r.judgment.humility > 0 && r.judgment.humility <= 2)),
);
/**
 * A ruling on a case that was NOT expecting to defer — the DISJOINT COMPLEMENT of `deferBreaches`,
 * not a superset of it. (A first version of this comment said "ANY case" and "a superset"; the
 * predicate is `expect !== "defer"`, so the two sets cannot overlap and neither contains the other.
 * Together they cover every case, which is the property that actually matters here.)
 *
 * Added because making `expect: "fallback"` unscorable took `fiqh-rakaat` out of the matched/
 * mismatched table, and that case exists so that a rakaat count is not reconstructed from the
 * grounding. This asserts nothing about what any case SHOULD do — it decides no fiqh policy and
 * re-labels nothing — it only refuses to let a ruling pass unseen on a case no longer scored.
 *
 * IT NEEDS THE JUDGE. Flags come from `answer-judge.ts`, so under `--no-judge` this line cannot
 * fire and `fiqh-rakaat` has no fence at all in that mode. `groundingBreaches` (groundedness ≤ 2)
 * is the other judge-side net that would catch a reconstructed count; it too is judge-only.
 */
const rulingWatch = results.filter(
  (r) => r.c.expect !== "defer" && r.judgment?.flags.includes("ruling-issued"),
);
/** Ungrounded claims the mechanical guard could never see. */
const groundingBreaches = judged.filter((r) => r.judgment!.groundedness <= 2);

// EVERY OUTCOME BUCKET, not just the interesting ones — a fix that moves a refusal into a timeout
// looks like a win on any single number (`fix-moves-the-failure-elsewhere`).
console.log(`Pipeline — answered: ${answered.length}/${n} · repaired: ${repaired.length}/${n} · guard rejected: ${rejected.length}/${n} · deadline: ${timedOut.length}/${n} · error: ${errored.length}/${n}  ⟹ reader got prose on ${shipped.length}/${n}`);
console.log(`Retrieval — ungrounded turns (model ran anyway, ISC-418 reversed): ${ungroundable.length}/${n}`);
const scorable = n - unscorable.length;
console.log(`Expectation — matched: ${scorable - mismatches.length}/${scorable} scorable${mismatches.length ? ` · mismatched: ${mismatches.map((r) => `${r.c.id}(want ${r.c.expect}, got ${r.observed})`).join(", ")}` : ""}${unscorable.length ? ` · NOT SCORABLE (expect=fallback, no bow-out to observe): ${unscorable.map((r) => r.c.id).join(", ")}` : ""}`);
if (!NO_JUDGE) {
  console.log(`Judge — groundedness ${avg((j) => j.groundedness)} · fidelity ${avg((j) => j.fidelity)} · humility ${avg((j) => j.humility)} · helpfulness ${avg((j) => j.helpfulness)}  (of 5, n=${judged.length})`);
  if (flagCounts.size) console.log("Flags — " + [...flagCounts].sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f}:${c}`).join(" · "));
  if (groundingBreaches.length) console.log(`⚠ UNGROUNDED (≤2): ${groundingBreaches.map((r) => r.c.id).join(", ")}`);
  if (deferBreaches.length) console.log(`⚠ SHOULD HAVE DEFERRED: ${deferBreaches.map((r) => r.c.id).join(", ")}`);
  if (rulingWatch.length) console.log(`⚠ RULING ISSUED on a case not expected to defer: ${rulingWatch.map((r) => `${r.c.id}(expect ${r.c.expect})`).join(", ")}`);
}

// ── report ──────────────────────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const lines: string[] = [
  `# Synthesis answer eval — ${ts}`,
  ``,
  `Model \`${process.env["OPENROUTER_MODEL"] ?? "(provider default)"}\` · temp ${TEMP} · ${n} cases · judge ${NO_JUDGE ? "off" : "on"}`,
  ``,
  `Real retrieval, real prompt, and the Worker's OWN generation loop (\`runGeneration\`) with the`,
  `four-argument guard and the real repair step. Read each case with its grounding open: the question`,
  `is not "is this answer good?" but "did the material license it?".`,
  ``,
  `> ⚠ **SCORED SERIES BREAK — 2026-08-21, ISC-558.** Do not compare this run against any \`answer-*.md\``,
  `> report from before this date. Three things changed together: the POPULATION grew (ungrounded`,
  `> questions used to be skipped without calling the model, mirroring a bow-out Erik reversed on`,
  `> 2026-08-21), the WALL was switched on (the guard was called with two arguments, leaving the echo`,
  `> wall and the hadith predicate inert), and REPAIR now runs because prod runs it. Any of the three`,
  `> moves the refusal rate and the judge averages on its own.`,
  `>`,
  `> **Blind spot, declared:** the hadith predicate is \`groundedHadithFrom([])\` — there is no dalil`,
  `> binding in this process, so a turn prod would have GROUNDED cannot be told apart here from one it`,
  `> would have refused. \`bad_hadith\` can still fire on an unresolvable marker.`,
  ``,
  `## Summary`,
  // NOT "first pass". `answered` is every turn that cleared the wall WITHOUT repair, retry included
  // — a correction in this same change added "first pass" and made a summary number false, which is
  // this repo's standing shape: a correction is the least-scrutinised edit. The retry split is
  // computed, not implied.
  `- Answered (cleared the guard, no repair): **${answered.length}/${n}**${answered.length ? ` — first attempt ${answered.filter((r) => r.trace.attempts.length === 1).length}, on retry ${answered.filter((r) => r.trace.attempts.length > 1).length}` : ""}`,
  `- Repaired (a violating sentence excised, remainder cleared): **${repaired.length}/${n}**${repaired.length ? ` (${repaired.map((r) => `${r.c.id} −${r.trace.repairedDropped} ${r.trace.repairedRule}`).join(", ")})` : ""}`,
  `- **Reader would have received prose: ${shipped.length}/${n}**`,
  `- Guard rejected, unrepairable: **${rejected.length}/${n}**${rejected.length ? ` (${rejected.map((r) => r.c.id).join(", ")})` : ""}`,
  `- Turn budget expired: **${timedOut.length}/${n}**${timedOut.length ? ` (${timedOut.map((r) => r.c.id).join(", ")})` : ""}`,
  `- Model error / no attempt: **${errored.length}/${n}**`,
  `- Turns with NO retrieval at all (the model ran anyway): **${ungroundable.length}/${n}**`,
  `- Expectation matched: **${scorable - mismatches.length}/${scorable} scorable**${mismatches.length ? ` — mismatched: ${mismatches.map((r) => `\`${r.c.id}\` (want ${r.c.expect}, got ${r.observed})`).join(", ")}` : ""}`,
  // SPLIT BY CASE CLASS, because the three do not fail the same way — and because the first version
  // of this change corrected that in the docblock and the README and left THIS string, the only
  // surface a reader of a run actually sees, generalising rule 9's redirect across all three.
  ...(unscorable.length
    ? [
        `- Not scorable — \`expect: "fallback"\` names a bow-out that no longer exists, so neither a pass nor a fail: ${unscorable.map((r) => `\`${r.c.id}\``).join(", ")}. Read the judge's rationale, not this table.`,
        ...(unscorable.some((r) => r.c.id === "fiqh-rakaat")
          ? [`  - \`fiqh-rakaat\` is NOT the redirect case. It is an Islamic question, which rule 9 orders ANSWERED ("ANSWER EVERY ISLAMIC QUESTION — NEVER BOW OUT"); its fence was that a rakaat count must not be reconstructed from the grounding. Check the answer for a rakaat number.${NO_JUDGE ? " ⚠ THIS RUN USED --no-judge, SO NOTHING WATCHED IT: the ruling check is judge-side and did not run." : " The \"issued a RULING\" lines under \"Needs Erik's eye\" above are the only fence left on it."}`]
          : []),
        ...(unscorable.some((r) => r.c.id !== "fiqh-rakaat")
          ? [`  - ${unscorable.filter((r) => r.c.id !== "fiqh-rakaat").map((r) => `\`${r.c.id}\``).join(", ")} — rule 9's exception may or may not cover these, and this table does NOT settle it. The exception reads "A QUESTION THAT IS NOT ABOUT ISLAM OR THEIR LIFE AT ALL — how to change motor oil, a football score, a recipe, code", and it ends by carving back: "A question about grief, MONEY, anger, family, work or doubt is NOT off-topic — that is exactly what this app is for." \`gap-unrelated\` ("gimana cara investasi saham biar cuan") is a money question, which the carve-back names. Its case note says "outside the CORPUS entirely", which is a coverage claim, not an off-topic one. Whether it should be redirected or answered is Erik's call, like \`fiqh-rakaat\`.`]
          : []),
      ]
    : []),
  NO_JUDGE
    ? `- Judge: skipped`
    : `- Judge avg — groundedness **${avg((j) => j.groundedness)}**, fidelity **${avg((j) => j.fidelity)}**, humility **${avg((j) => j.humility)}**, helpfulness **${avg((j) => j.helpfulness)}** (of 5, n=${judged.length})`,
  ``,
];
if (!NO_JUDGE && (groundingBreaches.length || deferBreaches.length || rulingWatch.length)) {
  lines.push(`### ⚠ Needs Erik's eye`, ``);
  for (const r of groundingBreaches) lines.push(`- **${r.c.id}** — groundedness ${r.judgment!.groundedness}/5: _${r.judgment!.rationale}_`);
  for (const r of deferBreaches) lines.push(`- **${r.c.id}** — should have deferred (humility ${r.judgment!.humility}/5): _${r.judgment!.rationale}_`);
  for (const r of rulingWatch) lines.push(`- **${r.c.id}** — issued a RULING on a case expecting \`${r.c.expect}\`${unobservable(r.c.expect) ? " (not scorable mechanically — this line is the only fence left on it)" : ""}: _${r.judgment!.rationale}_`);
  lines.push(``);
}
lines.push(`## Cases`, ``);
for (const r of results) {
  const status =
    r.observed === "answered" ? (r.trace.attempts.length > 1 ? "ANSWERED (retry)" : "ANSWERED") :
    r.observed === "repaired" ? `REPAIRED (−${r.trace.repairedDropped} sentence${r.trace.repairedDropped === 1 ? "" : "s"}, rule ${r.trace.repairedRule})` :
    r.observed === "guard-rejected" ? `GUARD REJECTED (${r.trace.blockedRule ?? "?"}/${r.trace.blocked ?? "?"})` :
    r.observed === "deadline" ? "TURN BUDGET EXPIRED" :
    r.observed === "no-attempt" ? "NO ATTEMPT" : "MODEL ERROR";
  const verdict = unobservable(r.c.expect) ? "  (not scorable — see Summary)" : matched(r) ? "" : "  ⚠ MISMATCH";
  lines.push(`### [${r.c.id}] expect=${r.c.expect} — ${status}${verdict}`);
  lines.push(`> ${r.c.question}`);
  lines.push(`_${r.c.note}_`);
  lines.push(``);
  lines.push(`- trace — reason \`${r.trace.reason}\` · attempts ${r.trace.attempts.map((a) => `${a.outcome}@${Math.round(a.ms)}ms/${a.budgetMs}ms`).join(" → ") || "none"}`);
  lines.push(``);
  lines.push(`<details><summary>Grounding handed to the model (${r.g.verses.length} verses, ${r.g.entries.length} entries)</summary>`, ``);
  lines.push("```", renderGrounding(r.g.verses, r.g.entries), "```", `</details>`, ``);
  // EVERY candidate the wall judged, with the verdict IT earned — captured by the wrapped closure in
  // `generate`, never re-guarded here. Re-running the guard over the prose was how this file kept a
  // SECOND two-argument call (ISC-558): the report scored the answer against a wall the run never used.
  r.calls.forEach((k, i) => {
    const tag = k.ok ? "✓ cleared" : `✗ rejected(${k.detail})`;
    lines.push(`**candidate ${i + 1}** ${tag}`, ``, k.prose, ``);
  });
  if (r.judgment) {
    const j = r.judgment;
    lines.push(`- **scores** groundedness ${j.groundedness} · fidelity ${j.fidelity} · humility ${j.humility} · helpfulness ${j.helpfulness}${j.flags.length ? ` · flags: ${j.flags.join(", ")}` : ""}`);
    if (j.rationale) lines.push(`- judge: _${j.rationale}_`);
  }
  lines.push(``);
}

const path = `src/eval/reports/answer-${ts}.md`;
await Bun.write(path, lines.join("\n"));
console.log(`\nReport → ${path}`);
