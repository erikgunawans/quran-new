/**
 * THE TTS SPEND CEILING, IN D1 — the ledger that survives a hosted runner.
 *
 * Erik ruled 30 TTS RUNS per day (2026-08-24) and `src/app/kajian-budget.ts` enforced it with a JSON
 * file at the repo root. That was honest while the pipeline ran on his laptop. On 2026-08-24 he also
 * ruled that the kajian runner moves to a CLOUD HOST behind a residential proxy — and a hosted
 * execution starts with a fresh filesystem, so a file ledger would find an empty day on every run,
 * charge slot 1 of 30, and report `1/30` for ever while spending without limit. The ceiling would
 * read as covered and would not be. That is why this exists, and why it is not optional once a
 * hosted runner ships.
 *
 * ── WHY THE COUNT IS THE GATE AND THE INSERT IS THE LOCK ─────────────────────────────────────────
 *
 * Two runners can be mid-charge at the same instant. Reading the count, deciding, then inserting
 * would let both take the last slot. So the decision and the write are ONE statement — an
 * `INSERT … SELECT … WHERE (SELECT COUNT(*) …) < limit` — and SQLite evaluates it atomically. The
 * `SELECT` that follows only REPORTS; it can over-count `used` if another runner inserted in between,
 * which is a display value, never the gate. Written down because "two statements" reads like a race
 * until you see which one decides.
 *
 * ── WHY A ROW PER RUN ────────────────────────────────────────────────────────────────────────────
 *
 * One pipeline run narrates TWICE and both narrations pass the same `runId`. A counter cannot be
 * idempotent; a `PRIMARY KEY (day, run_id)` is idempotent by construction. Charging twice would halve
 * Erik's ceiling; refusing the second would leave a run with a long script and no short one.
 *
 * ── WHY THE WORKER OWNS THE DAY ──────────────────────────────────────────────────────────────────
 *
 * The day key is computed HERE and never read off the request. A runner that supplied its own could
 * reset its allowance by lying about the date.
 */
import type { D1Database, D1RunResult } from "./store.ts";

/**
 * Erik's ruling, 2026-08-24. The one number both ledgers exist to enforce.
 *
 * It lives HERE rather than in `src/app/kajian-budget.ts`, which re-exports it, because the Worker
 * cannot import that module — it opens with `node:fs` — and two copies of a ceiling is two ceilings.
 * The direction of the import follows what can actually reach what, not what feels tidier.
 */
export const TTS_RUNS_PER_DAY = 30;

/**
 * `YYYY-MM-DD` in ASIA/JAKARTA, not UTC.
 *
 * A UTC boundary rolls the allowance at 07:00 Jakarta — the middle of a working morning — and Erik
 * works nights, so a UTC day would split one sitting across two allowances. The local-file ledger
 * already makes this choice by using machine-local time on a machine in Jakarta; fixing the zone here
 * keeps the two ledgers meaning the same thing instead of being two ceilings with different
 * midnights. Indonesia has no DST, so the offset is stable, but the zone is named rather than
 * hard-coded to +07:00 so the rule stays readable as "Erik's day".
 */
export function jakartaDayKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export interface TtsCharge {
  /** False when the ceiling refused this run. The caller must not spend. */
  readonly allowed: boolean;
  /** True only when THIS call added the run. The second narration of a run is allowed, not charged. */
  readonly charged: boolean;
  /** Runs used today after this call. Reported, never the gate — see the header. */
  readonly used: number;
  readonly limit: number;
  readonly day: string;
}

interface ChargeRow {
  readonly used: unknown;
  /** 0 when the run is not on today's ledger — i.e. the ceiling refused it. */
  readonly present: unknown;
}

const asInt = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0));

/**
 * Charge one run against today's allowance in D1.
 *
 * Returns a verdict rather than throwing: the caller is an HTTP handler that has to turn a refusal
 * into a status code either way, and a thrown string would have to be parsed back into one.
 */
export async function chargeTtsRunD1(
  db: D1Database,
  runId: string,
  now: Date = new Date(),
  limit: number = TTS_RUNS_PER_DAY,
): Promise<TtsCharge> {
  const day = jakartaDayKey(now);

  // The gate. `OR IGNORE` makes the repeat charge of the same run a no-op; the `WHERE` makes a NEW
  // run past the ceiling a no-op too. Both no-ops, different reasons — the SELECT below tells them
  // apart, because one is ALLOWED (the run is already on the ledger) and the other is REFUSED.
  const write = await db
    .prepare(
      "INSERT OR IGNORE INTO tts_runs (day, run_id, charged_at) " +
        "SELECT ?1, ?2, ?3 WHERE (SELECT COUNT(*) FROM tts_runs WHERE day = ?1) < ?4",
    )
    .bind(day, runId, now.getTime(), limit)
    .run();

  const row = await db
    .prepare(
      "SELECT (SELECT COUNT(*) FROM tts_runs WHERE day = ?1) AS used, " +
        "(SELECT COUNT(*) FROM tts_runs WHERE day = ?1 AND run_id = ?2) AS present",
    )
    .bind(day, runId)
    .first<ChargeRow>();

  // PRESENT means allowed: the run is on today's ledger, whether this call put it there or its first
  // narration did.
  //
  // ⚠️ `charged` is read off `meta.changes` and NOT off the row's timestamp. An earlier cut compared
  // `charged_at` to this call's `now` — and a route test caught it inside the same millisecond, where
  // the second narration of a run reported `charged: true` having inserted nothing. A verdict that
  // says money was spent when none was is worse than no verdict, so it is derived from the write
  // itself; where the double does not report changes, it stays false rather than guessing.
  const present = asInt(row?.present) > 0;
  return {
    allowed: present,
    charged: present && asInt((write as D1RunResult | null)?.meta?.changes) > 0,
    used: asInt(row?.used),
    limit,
    day,
  };
}
