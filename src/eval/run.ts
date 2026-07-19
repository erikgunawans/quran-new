/**
 * Offline eval harness for the framing ("bridge") voice — Phase 2's tuning loop.
 *
 * WHAT IT DOES. For each labelled phrase in cases.ts it sends the SAME prompt + params prod sends
 * (FRAMING_SYSTEM_PROMPT / buildFramingUserMessage / FRAMING_PARAMS), reproduces prod's 2-attempt
 * guard loop, then scores the bridge with an LLM judge. Output: a markdown report + a console
 * summary you can watch move as you edit the prompt.
 *
 * WHY OFFLINE. This calls the model provider directly (OpenRouter), never the prod /api/compose
 * endpoint. Tune the prompt here, re-run, compare, and deploy ONCE when it's better — never poke prod.
 *
 * USAGE.
 *   export OPENROUTER_API_KEY=sk-...        # same key as the Worker secret; spends real (tiny) credit
 *   bun run eval:framing                    # full run: generate + judge, writes a report
 *   bun run eval:framing -- --no-judge      # generate + guard only (no judge calls, cheaper)
 *   bun run eval:framing -- --limit 5       # first 5 cases (quick smoke)
 *   bun run eval:framing -- --dry-run       # no API calls, no key — prints the exact prompts sent
 *   bun run eval:framing -- --temp 0.6      # override sampling temperature
 *   bun run eval:framing -- --model deepseek/deepseek-chat   # override the model
 *
 * TUNING LOOP. Run it → read the report (native eye first, scores second) → edit
 * web/src/compose-contract.ts FRAMING_SYSTEM_PROMPT → re-run → compare → deploy when better.
 */
import { CASES, type EvalCase } from "./cases.ts";
import {
  FRAMING_SYSTEM_PROMPT,
  FRAMING_PARAMS,
  buildFramingUserMessage,
  type ComposeContext,
} from "../../web/src/compose-contract.ts";
import { guardComposeProse } from "../../web/src/compose-guard.ts";
import { resolveProvider, callChatModel } from "../../worker/src/providers.ts";
import type { Env } from "../../worker/src/index.ts";
import { judgeBridge, type Judgment, type ModelCall } from "./judge.ts";

// ── flags ──────────────────────────────────────────────────────────────────────
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

const LIMIT = flag("limit") ? Number(flag("limit")) : Infinity;
const NO_JUDGE = has("no-judge");
const DRY_RUN = has("dry-run");
const TEMP = flag("temp") ? Number(flag("temp")) : FRAMING_PARAMS.temperature;
const MODEL = flag("model");

const cases = CASES.slice(0, LIMIT);
const ctxOf = (c: EvalCase): ComposeContext => ({ question: c.phrase, theme: c.theme, themeCount: c.themeCount ?? 1 });

// ── dry run: no key, no calls — just prove the exact prompts we'd send ────────────
if (DRY_RUN) {
  console.log("═══ DRY RUN — no API calls ═══\n");
  console.log("SYSTEM PROMPT (framing):\n" + FRAMING_SYSTEM_PROMPT + "\n");
  console.log(`\n${cases.length} cases. Example user messages the model would receive:\n`);
  for (const c of cases.slice(0, 3)) {
    console.log(`── [${c.id}] theme=${c.theme}${c.themeCount && c.themeCount > 1 ? ` (x${c.themeCount})` : ""} ──`);
    console.log(buildFramingUserMessage(ctxOf(c)) + "\n");
  }
  console.log(`(+${Math.max(0, cases.length - 3)} more cases)`);
  process.exit(0);
}

// ── live run: build the model call from env (same resolution prod uses) ───────────
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

// ── the run ──────────────────────────────────────────────────────────────────────
interface Result {
  readonly c: EvalCase;
  readonly attempts: string[];
  /** index of the attempt that cleared the wall, or -1 if none (prod would fall back to canned). */
  readonly safeIndex: number;
  readonly judgment?: Judgment;
}

async function generate(c: EvalCase): Promise<{ attempts: string[]; safeIndex: number }> {
  const user = buildFramingUserMessage(ctxOf(c));
  const attempts: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    let out: string;
    try {
      out = await call(FRAMING_SYSTEM_PROMPT, user, { temperature: TEMP, maxTokens: FRAMING_PARAMS.maxTokens });
    } catch (e) {
      attempts.push(`<model error: ${(e as Error).message}>`);
      return { attempts, safeIndex: -1 };
    }
    attempts.push(out);
    if (guardComposeProse(out).ok) return { attempts, safeIndex: i };
  }
  return { attempts, safeIndex: -1 };
}

const results: Result[] = [];
for (const c of cases) {
  const { attempts, safeIndex } = await generate(c);
  let judgment: Judgment | undefined;
  if (!NO_JUDGE && safeIndex >= 0) {
    try {
      judgment = await judgeBridge(call, c.phrase, c.theme, attempts[safeIndex]!);
    } catch (e) {
      judgment = { warmth: 0, presence: 0, humanness: 0, fit: 0, flags: [`judge-error`], rationale: (e as Error).message };
    }
  }
  results.push({ c, attempts, safeIndex, judgment });
  process.stdout.write(safeIndex === 0 ? "." : safeIndex === 1 ? "r" : "✗");
}
process.stdout.write("\n\n");

// ── aggregate ────────────────────────────────────────────────────────────────────
const n = results.length;
const firstPass = results.filter((r) => r.safeIndex === 0).length;
const within2 = results.filter((r) => r.safeIndex >= 0).length;
const fellBack = results.filter((r) => r.safeIndex < 0);
const judged = results.filter((r) => r.judgment && r.judgment.warmth > 0);
const avg = (pick: (j: Judgment) => number): string =>
  judged.length ? (judged.reduce((s, r) => s + pick(r.judgment!), 0) / judged.length).toFixed(2) : "—";

const flagCounts = new Map<string, number>();
for (const r of results) for (const f of r.judgment?.flags ?? []) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);

console.log(`Guard — first attempt: ${firstPass}/${n} · within 2 (prod): ${within2}/${n} · falls back: ${fellBack.length}/${n}`);
if (!NO_JUDGE) {
  console.log(`Judge  — warmth ${avg((j) => j.warmth)} · presence ${avg((j) => j.presence)} · humanness ${avg((j) => j.humanness)} · fit ${avg((j) => j.fit)}`);
  if (flagCounts.size) console.log("Flags  — " + [...flagCounts].sort((a, b) => b[1] - a[1]).map(([f, c]) => `${f}:${c}`).join(" · "));
}
if (fellBack.length) console.log("Fell back: " + fellBack.map((r) => r.c.id).join(", "));

// ── report ───────────────────────────────────────────────────────────────────────
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const lines: string[] = [
  `# Framing eval — ${ts}`,
  ``,
  `Model \`${process.env["OPENROUTER_MODEL"] ?? "deepseek/deepseek-v4-flash"}\` · temp ${TEMP} · ${n} cases · judge ${NO_JUDGE ? "off" : "on"}`,
  ``,
  `## Summary`,
  `- Guard, first attempt: **${firstPass}/${n}**`,
  `- Guard, within 2 attempts (prod behaviour): **${within2}/${n}**`,
  `- Falls back to the canned opener: **${fellBack.length}/${n}**${fellBack.length ? ` (${fellBack.map((r) => r.c.id).join(", ")})` : ""}`,
  NO_JUDGE ? `- Judge: skipped` : `- Judge avg — warmth **${avg((j) => j.warmth)}**, presence **${avg((j) => j.presence)}**, humanness **${avg((j) => j.humanness)}**, fit **${avg((j) => j.fit)}** (of 5)`,
  ``,
  `## Cases`,
  ``,
];
for (const r of results) {
  const status = r.safeIndex === 0 ? "PASS" : r.safeIndex === 1 ? "PASS (retry)" : "FELL BACK";
  lines.push(`### [${r.c.id}] ${r.c.theme}  — ${status}`);
  lines.push(`> ${r.c.phrase}`);
  if (r.c.note) lines.push(`_${r.c.note}_`);
  lines.push(``);
  r.attempts.forEach((a, i) => {
    const ok = guardComposeProse(a).ok;
    const tag = ok ? "✓" : "✗ rejected(" + guardComposeProse(a).violations.map((v) => v.kind).join(",") + ")";
    lines.push(`- attempt ${i + 1} ${tag}: ${a}`);
  });
  if (r.judgment) {
    const j = r.judgment;
    lines.push(`- **scores** warmth ${j.warmth} · presence ${j.presence} · humanness ${j.humanness} · fit ${j.fit}${j.flags.length ? ` · flags: ${j.flags.join(", ")}` : ""}`);
    if (j.rationale) lines.push(`- judge: _${j.rationale}_`);
  }
  lines.push(``);
}

const path = `src/eval/reports/framing-${ts}.md`;
await Bun.write(path, lines.join("\n"));
console.log(`\nReport → ${path}`);
