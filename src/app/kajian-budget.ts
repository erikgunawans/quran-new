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
 *   · The ledger is a local file. Deleting it resets the day. It is a spend ceiling for this machine,
 *     not an accounting system, and it is not a substitute for a budget alert in Google Cloud.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Erik's ruling, 2026-08-24. The one number this file exists to enforce. */
export const TTS_RUNS_PER_DAY = 30;

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
