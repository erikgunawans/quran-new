/**
 * A HARD CEILING ON WHAT THE KAJIAN PIPELINE MAY SPEND IN A DAY.
 *
 * Chirp3-HD is billed per character and nothing in this repo capped it. That was acceptable while
 * TTS had never produced a single byte; on 2026-08-24 it did, billed to a real project, and a live
 * spend with no ceiling is a different thing from a dormant one. Erik's ruling, same day: **30 runs
 * per day.**
 *
 * ── WHY A RUN AND NOT A REQUEST ──────────────────────────────────────────────────────────────
 *
 * One pipeline run calls `narrateToWav` TWICE — once for the long script, once for the short
 * (`kajian.ts:581` and `:622`) — and each of those makes one request per TTS chunk, which is a
 * dozen or more on a long briefing. So a cap counted in requests, or even in narrations, is not the
 * number Erik gave: 30 narrations would be 15 runs, and 30 requests would be about one. The ledger
 * therefore counts DISTINCT RUN IDS, and both narrations of one run pass the same id and cost one.
 *
 * ── WHY IT SITS AT THE SPENDING FUNCTION AND NOT AT THE CLI ──────────────────────────────────
 *
 * A gate on the CLI entry point is walked around by anything that imports the module — and the
 * module's own comment already names `narrateToWav` as "the function that is about to spend money".
 * A ceiling that only some callers pass through is a ceiling that reads as covered and is not, which
 * is the shape this repo keeps paying for. `runId` is therefore REQUIRED in `NarrateOptions`: a
 * caller that forgets it is a compile error, never a silent unmetered run.
 *
 * ── WHAT IT DOES NOT DO, said plainly ────────────────────────────────────────────────────────
 *
 *   · It does not cap CHARACTERS, which is what Google actually bills. A run of a three-hour lecture
 *     and a run of a two-minute clip both cost one. Erik's ruling is in runs and this implements
 *     that ruling, not a better one somebody might have preferred.
 *   · It counts a run at its FIRST narration, so a run that dies before narrating costs nothing and
 *     a run that dies after its long script has been spoken still costs one. That is the honest
 *     direction: the money was already spent.
 *   · The LOCAL ledger is a file. Deleting it resets the day. It is a spend ceiling for this machine,
 *     not an accounting system, and it is not a substitute for a budget alert in Google Cloud.
 *
 * ── TWO LEDGERS, ONE CEILING ─────────────────────────────────────────────────────────────────
 *
 * `chargeTtsRun` below is the LOCAL file ledger. `chargeTtsRunFor` at the bottom of this file picks
 * between it and the D1 ledger behind the Worker, because a hosted runner's filesystem does not
 * survive its own execution and a file ledger there enforces nothing at all. Callers that are about
 * to spend money should call `chargeTtsRunFor`, never `chargeTtsRun` directly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Erik's ruling, 2026-08-24. The one number BOTH ledgers exist to enforce.
 *
 * Defined in `worker/src/tts-ledger.ts` and re-exported here. The direction looks backwards until you
 * see what can reach what: the Worker cannot import this module (it opens with `node:fs`), and two
 * copies of a ceiling is two ceilings that drift.
 */
export { TTS_RUNS_PER_DAY } from "../../worker/src/tts-ledger.ts";
import { TTS_RUNS_PER_DAY } from "../../worker/src/tts-ledger.ts";

/** Repo-root, gitignored. Not under `.scratch/`, which the pipeline itself clears per video. */
export const LEDGER_PATH = resolve(".kajian-tts-ledger.json");

interface Ledger {
  /** `YYYY-MM-DD` in LOCAL time — the day boundary a person means by "per day". */
  readonly day: string;
  /** Distinct run ids already charged against `day`. */
  readonly runs: readonly string[];
}

/**
 * Local calendar day, not UTC.
 *
 * A UTC boundary rolls the allowance at 07:00 in Asia/Jakarta, which is the middle of a working
 * morning, and Erik works nights — a UTC day would split one sitting across two allowances.
 */
export function dayKey(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function read(path: string): Ledger | null {
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Ledger>;
    if (typeof raw.day !== "string" || !Array.isArray(raw.runs)) return null;
    return { day: raw.day, runs: raw.runs.filter((r): r is string => typeof r === "string") };
  } catch {
    // A missing or corrupt ledger must not BLOCK — it must reset. The failure mode of throwing here
    // is a pipeline that cannot run at all because of a stray byte in a bookkeeping file.
    return null;
  }
}

export interface BudgetCharge {
  /** True when this call is what added the run to the ledger; false when the run was already on it. */
  readonly charged: boolean;
  /** Runs used today AFTER this call, including this one. */
  readonly used: number;
  readonly limit: number;
}

/**
 * Charge one run against today's allowance, or throw.
 *
 * Idempotent per `runId`: the second narration of the same run finds its id present, is not charged
 * again, and is allowed through even on the day's last slot. Charging it twice would halve the
 * ceiling Erik set, and refusing it would leave a run with a long script and no short one.
 */
export function chargeTtsRun(runId: string, now: Date = new Date(), path: string = LEDGER_PATH): BudgetCharge {
  if (runId.trim() === "") throw new Error("chargeTtsRun: runId must not be empty");
  const today = dayKey(now);
  const prior = read(path);
  const runs = prior && prior.day === today ? [...prior.runs] : [];

  if (runs.includes(runId)) return { charged: false, used: runs.length, limit: TTS_RUNS_PER_DAY };

  if (runs.length >= TTS_RUNS_PER_DAY) {
    throw new Error(
      `TTS daily ceiling reached: ${runs.length}/${TTS_RUNS_PER_DAY} runs already spent on ${today}.\n` +
        `  This is a spend ceiling, not a bug. It resets at local midnight.\n` +
        `  Ledger: ${path}`,
    );
  }

  runs.push(runId);
  writeFileSync(path, `${JSON.stringify({ day: today, runs } satisfies Ledger, null, 2)}\n`);
  return { charged: true, used: runs.length, limit: TTS_RUNS_PER_DAY };
}

// ── THE SAME CEILING, ON A HOST WHOSE DISK DOES NOT SURVIVE ──────────────────────────────────────
//
// Everything above is a LOCAL-FILE ledger and it is honest on Erik's laptop. On 2026-08-24 he ruled
// that the kajian runner moves to a CLOUD HOST behind a residential proxy, and a hosted execution
// starts with a fresh filesystem: every run would read an empty ledger, charge slot 1 of 30, print
// `1/30`, and spend without limit. The ceiling would REPORT correctly and ENFORCE nothing.
//
// So the ledger moves into D1, behind the Worker (`worker/src/tts-ledger.ts`,
// `POST /api/runner/kajian/tts-charge`), on state no runner can reset.

/** How the remote ledger answers. Mirrors `TtsCharge` in `worker/src/tts-ledger.ts`. */
interface RemoteCharge {
  ok?: unknown;
  error?: unknown;
  charged?: unknown;
  used?: unknown;
  limit?: unknown;
  day?: unknown;
}

/**
 * Charge against the D1 ledger through the Worker.
 *
 * ── IT THROWS ON EVERY FAILURE, INCLUDING NETWORK FAILURE ────────────────────────────────────────
 *
 * A spend ceiling that degrades to "carry on" when it cannot reach its ledger is not a ceiling. The
 * only safe reading of "I could not ask whether I may spend" is "do not spend" — this is the same
 * fail-closed direction `verifyGrounding` takes when the digest will not load, and for the same
 * reason: the failure costs a run, and the alternative costs money nobody agreed to.
 */
export async function chargeTtsRunRemote(runId: string, baseUrl: string, secret: string): Promise<BudgetCharge> {
  if (runId.trim() === "") throw new Error("chargeTtsRunRemote: runId must not be empty");
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/runner/kajian/tts-charge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  const body = (await res.json().catch(() => ({}))) as RemoteCharge;
  if (res.status === 429) {
    throw new Error(
      `TTS daily ceiling reached: ${String(body.used ?? "?")}/${String(body.limit ?? TTS_RUNS_PER_DAY)} runs ` +
        `already spent on ${String(body.day ?? "today")}.\n` +
        `  This is a spend ceiling, not a bug. It resets at local midnight in Jakarta.\n` +
        `  Ledger: D1 \`tts_runs\` via ${baseUrl}`,
    );
  }
  if (!res.ok || body.ok !== true) {
    // Named as a LEDGER failure, not a ceiling. An operator who reads "ceiling" goes and waits for
    // midnight; an operator who reads this goes and looks at the Worker.
    throw new Error(`TTS ledger unreachable (HTTP ${res.status}) — refusing to spend without a ledger.`);
  }
  return {
    charged: body.charged === true,
    used: typeof body.used === "number" ? body.used : 0,
    limit: typeof body.limit === "number" ? body.limit : TTS_RUNS_PER_DAY,
  };
}

/**
 * Charge one run against whichever ledger this process actually has.
 *
 * ── WHY THE SWITCH IS `QK_BASE_URL` + `QK_RUNNER_SECRET` AND NOT A FLAG OF ITS OWN ───────────────
 *
 * A dedicated `QK_TTS_LEDGER=d1` flag would be clearer to read and WRONG to rely on: a hosted deploy
 * that forgets it falls silently back to the file ledger and the ceiling evaporates — the exact
 * failure this function exists to prevent, reintroduced by the thing meant to prevent it.
 *
 * These two variables cannot be forgotten. A hosted runner cannot claim a single job without both of
 * them (`runnerConfig` refuses to start otherwise), so the credential that lets it WORK is the same
 * one that METERS it. There is no configuration in which it runs the pipeline and misses the ledger.
 *
 * With neither set, this is Erik's laptop invoking the pipeline directly and the file ledger applies,
 * byte-for-byte as before.
 */
export async function chargeTtsRunFor(
  runId: string,
  env: Record<string, string | undefined> = process.env,
  path: string = LEDGER_PATH,
): Promise<BudgetCharge> {
  const baseUrl = (env.QK_BASE_URL ?? "").trim();
  const secret = (env.QK_RUNNER_SECRET ?? "").trim();
  if (baseUrl !== "" && secret !== "") return chargeTtsRunRemote(runId, baseUrl, secret);
  return chargeTtsRun(runId, new Date(), path);
}
