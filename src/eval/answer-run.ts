/**
 * Offline eval harness for the SYNTHESIS edition's authored answers (new-quranku-ai).
 *
 * WHAT IT DOES. For each case in answer-cases.ts it runs the REAL pipeline: the same retrieval prod
 * uses (gatherGrounding → retrieve() + retrieveKnowledge()), the same system prompt and params
 * (SYNTHESIS_SYSTEM_PROMPT / buildAnswerUserMessage / ANSWER_PARAMS), the same 2-attempt guard loop
 * the Worker runs (worker/src/index.ts), then an LLM judge that sees the SAME grounding and audits
 * the answer against it. Output: a markdown report + a console summary.
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
import { guardAnswerProse, allowedRefsFrom } from "../../web/src/answer-guard.ts";
import { gatherGrounding } from "../../web/src/answer.ts";
import type { Corpus } from "../../web/src/retrieve.ts";
import { resolveProvider, callChatModel } from "../../worker/src/providers.ts";
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
    const bows = g.verses.length === 0 && g.entries.length === 0;
    console.log(`\n── [${c.id}] expect=${c.expect} — ${g.verses.length} verses, ${g.entries.length} entries${bows ? "  ⟵ NO GROUNDING → synthesis bows out" : ""} ──`);
    console.log(`Q: ${c.question}`);
    if (!bows) console.log(buildAnswerUserMessage({ question: c.question, verses: g.verses, entries: g.entries }));
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

let call: ModelCall;
try {
  const cfg = resolveProvider("openrouter", env);
  call = (system, user, opts) => callChatModel(cfg, system, user, opts);
  console.log(`Model: ${cfg.model} | temp: ${TEMP} | cases: ${cases.length} | judge: ${NO_JUDGE ? "off" : "on"}\n`);
} catch (e) {
  console.error(`✗ ${(e as Error).message}\n  Set OPENROUTER_API_KEY (the same key as the Worker secret), or use --dry-run.`);
  process.exit(1);
}

/** What actually happened, mechanically — before any judgment. */
type Observed = "answered" | "no-grounding" | "guard-rejected" | "model-error";

interface Result {
  readonly c: AnswerCase;
  readonly g: Grounded;
  readonly attempts: string[];
  /** Index of the attempt that cleared the wall, or -1 if none. */
  readonly safeIndex: number;
  readonly observed: Observed;
  /** `| undefined` is required by exactOptionalPropertyTypes — the runner assigns it unconditionally. */
  readonly judgment?: AnswerJudgment | undefined;
}

/** Reproduce the Worker's answer path exactly: 2 attempts, guard each, null if neither clears. */
async function generate(c: AnswerCase, g: Grounded): Promise<{ attempts: string[]; safeIndex: number; observed: Observed }> {
  if (g.verses.length === 0 && g.entries.length === 0) return { attempts: [], safeIndex: -1, observed: "no-grounding" };

  const user = buildAnswerUserMessage({ question: c.question, verses: g.verses, entries: g.entries });
  const allowed = allowedRefsFrom([...g.refs, ...g.entries.map((e) => e.ref)]);
  const attempts: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    let out: string;
    try {
      out = (await call(SYNTHESIS_SYSTEM_PROMPT, user, { temperature: TEMP, maxTokens: ANSWER_PARAMS.maxTokens }))?.trim();
    } catch (e) {
      attempts.push(`<model error: ${(e as Error).message}>`);
      return { attempts, safeIndex: -1, observed: "model-error" };
    }
    attempts.push(out);
    if (out && guardAnswerProse(out, allowed).ok) return { attempts, safeIndex: i, observed: "answered" };
  }
  return { attempts, safeIndex: -1, observed: "guard-rejected" };
}

/** The expectation is a hypothesis; this is the honest mechanical check of it. */
const expectedFallback = (e: ExpectedBehaviour): boolean => e === "fallback";
const matched = (r: Result): boolean =>
  expectedFallback(r.c.expect) ? r.observed !== "answered" : r.observed === "answered";

const results: Result[] = [];
for (const c of cases) {
  const g = await groundingOf(c);
  const { attempts, safeIndex, observed } = await generate(c, g);
  let judgment: AnswerJudgment | undefined;
  if (!NO_JUDGE && observed === "answered") {
    try {
      judgment = await judgeAnswer(call, c.question, g.verses, g.entries, attempts[safeIndex]!);
    } catch (e) {
      judgment = NULL_JUDGMENT("judge-error", (e as Error).message);
    }
  }
  results.push({ c, g, attempts, safeIndex, observed, judgment });
  process.stdout.write(observed === "answered" ? (safeIndex === 0 ? "." : "r") : observed === "no-grounding" ? "-" : "✗");
}
process.stdout.write("\n\n");

// ── aggregate ───────────────────────────────────────────────────────────────────────
const n = results.length;
const answered = results.filter((r) => r.observed === "answered");
const noGrounding = results.filter((r) => r.observed === "no-grounding");
const rejected = results.filter((r) => r.observed === "guard-rejected");
const errored = results.filter((r) => r.observed === "model-error");
const mismatches = results.filter((r) => !matched(r));

const judged = results.filter((r) => r.judgment && r.judgment.groundedness > 0);
const avg = (pick: (j: AnswerJudgment) => number): string =>
  judged.length ? (judged.reduce((s, r) => s + pick(r.judgment!), 0) / judged.length).toFixed(2) : "—";

const flagCounts = new Map<string, number>();
for (const r of results) for (const f of r.judgment?.flags ?? []) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);

/** The headline risk: a case that should have deferred but issued a ruling, or scored low on humility. */
const deferBreaches = results.filter(
  (r) => r.c.expect === "defer" && r.judgment && (r.judgment.flags.includes("ruling-issued") || (r.judgment.humility > 0 && r.judgment.humility <= 2)),
);
/** Ungrounded claims the mechanical guard could never see. */
const groundingBreaches = judged.filter((r) => r.judgment!.groundedness <= 2);

console.log(`Pipeline — answered: ${answered.length}/${n} · no grounding (bows out): ${noGrounding.length}/${n} · guard rejected: ${rejected.length}/${n} · model error: ${errored.length}/${n}`);
console.log(`Expectation — matched: ${n - mismatches.length}/${n}${mismatches.length ? ` · mismatched: ${mismatches.map((r) => `${r.c.id}(want ${r.c.expect}, got ${r.observed})`).join(", ")}` : ""}`);
if (!NO_JUDGE) {
  console.log(`Judge — groundedness ${avg((j) => j.groundedness)} · fidelity ${avg((j) => j.fidelity)} · humility ${avg((j) => j.humility)} · helpfulness ${avg((j) => j.helpfulness)}  (of 5, n=${judged.length})`);
  if (flagCounts.size) console.log("Flags — " + [...flagCounts].sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f}:${c}`).join(" · "));
  if (groundingBreaches.length) console.log(`⚠ UNGROUNDED (≤2): ${groundingBreaches.map((r) => r.c.id).join(", ")}`);
  if (deferBreaches.length) console.log(`⚠ SHOULD HAVE DEFERRED: ${deferBreaches.map((r) => r.c.id).join(", ")}`);
}

// ── report ──────────────────────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const lines: string[] = [
  `# Synthesis answer eval — ${ts}`,
  ``,
  `Model \`${process.env["OPENROUTER_MODEL"] ?? "(provider default)"}\` · temp ${TEMP} · ${n} cases · judge ${NO_JUDGE ? "off" : "on"}`,
  ``,
  `Real retrieval, real prompt, real guard, real 2-attempt Worker loop. Read each case with its`,
  `grounding open: the question is not "is this answer good?" but "did the material license it?".`,
  ``,
  `## Summary`,
  `- Answered (cleared the guard): **${answered.length}/${n}**`,
  `- Bowed out, no grounding (falls back to principled): **${noGrounding.length}/${n}**`,
  `- Guard rejected both attempts: **${rejected.length}/${n}**${rejected.length ? ` (${rejected.map((r) => r.c.id).join(", ")})` : ""}`,
  `- Model error: **${errored.length}/${n}**`,
  `- Expectation matched: **${n - mismatches.length}/${n}**${mismatches.length ? ` — mismatched: ${mismatches.map((r) => `\`${r.c.id}\` (want ${r.c.expect}, got ${r.observed})`).join(", ")}` : ""}`,
  NO_JUDGE
    ? `- Judge: skipped`
    : `- Judge avg — groundedness **${avg((j) => j.groundedness)}**, fidelity **${avg((j) => j.fidelity)}**, humility **${avg((j) => j.humility)}**, helpfulness **${avg((j) => j.helpfulness)}** (of 5, n=${judged.length})`,
  ``,
];
if (!NO_JUDGE && (groundingBreaches.length || deferBreaches.length)) {
  lines.push(`### ⚠ Needs Erik's eye`, ``);
  for (const r of groundingBreaches) lines.push(`- **${r.c.id}** — groundedness ${r.judgment!.groundedness}/5: _${r.judgment!.rationale}_`);
  for (const r of deferBreaches) lines.push(`- **${r.c.id}** — should have deferred (humility ${r.judgment!.humility}/5): _${r.judgment!.rationale}_`);
  lines.push(``);
}
lines.push(`## Cases`, ``);
for (const r of results) {
  const status =
    r.observed === "answered" ? (r.safeIndex === 0 ? "ANSWERED" : "ANSWERED (retry)") :
    r.observed === "no-grounding" ? "BOWED OUT (no grounding)" :
    r.observed === "guard-rejected" ? "GUARD REJECTED" : "MODEL ERROR";
  lines.push(`### [${r.c.id}] expect=${r.c.expect} — ${status}${matched(r) ? "" : "  ⚠ MISMATCH"}`);
  lines.push(`> ${r.c.question}`);
  lines.push(`_${r.c.note}_`);
  lines.push(``);
  lines.push(`<details><summary>Grounding handed to the model (${r.g.verses.length} verses, ${r.g.entries.length} entries)</summary>`, ``);
  lines.push("```", renderGrounding(r.g.verses, r.g.entries), "```", `</details>`, ``);
  r.attempts.forEach((a, i) => {
    const allowed = allowedRefsFrom([...r.g.refs, ...r.g.entries.map((e) => e.ref)]);
    const res = guardAnswerProse(a, allowed);
    const tag = res.ok ? "✓ cleared" : `✗ rejected(${res.violations.map((v) => `${v.kind}:${v.detail}`).join(", ")})`;
    lines.push(`**attempt ${i + 1}** ${tag}`, ``, a, ``);
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
