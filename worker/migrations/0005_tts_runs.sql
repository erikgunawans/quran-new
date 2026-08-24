-- The TTS spend ceiling, moved off the runner's filesystem and into D1.
--
-- WHY THIS TABLE EXISTS AT ALL. `src/app/kajian-budget.ts` enforces Erik's ruling of 30 TTS RUNS per
-- day, and it did so with a JSON file at the repo root. That was honest while the pipeline ran on
-- Erik's laptop. It stops being a ceiling the moment the runner moves to a cloud host behind a
-- residential proxy — his ruling of 2026-08-24 — because every hosted execution starts with a fresh
-- filesystem, so every run would find an empty ledger, charge slot 1 of 30, and the ceiling would be
-- uncapped while still reporting `1/30`. A ceiling that reads as covered and is not is the exact
-- shape this repo keeps paying for.
--
-- WHY THE WORKER OWNS THE DAY. `day` is computed BY THE WORKER in Asia/Jakarta and never read off
-- the request. A runner that supplied its own day key could reset its allowance by lying about the
-- date, which turns the ceiling into a suggestion.
--
-- WHY A ROW PER RUN AND NOT A COUNTER. A counter cannot be idempotent. One pipeline run narrates
-- TWICE (kajian.ts:581 and :622) and both narrations pass the same `runId`; charging a counter twice
-- would halve Erik's ceiling, and refusing the second would leave a run with a long script and no
-- short one. The PRIMARY KEY makes the second charge a no-op by construction rather than by a check
-- somebody has to remember to write.
--
-- Rows are KEPT, not pruned. At 30/day this is ~11k rows a year, which is nothing, and the history is
-- the only record of what the pipeline actually spent.
--
-- Applied by hand, once: `wrangler d1 execute new-quranku-memory --file worker/migrations/0005_tts_runs.sql --remote`.
-- ⚠️ `wrangler d1 migrations list` does not print these in order and its checkmarks have been
-- misleading on this project — verify by reading the schema, never by the list.
CREATE TABLE IF NOT EXISTS tts_runs (
  -- `YYYY-MM-DD` in ASIA/JAKARTA. Not UTC: a UTC boundary rolls the allowance at 07:00 Jakarta,
  -- mid-morning, and Erik works nights — a UTC day would split one sitting across two allowances.
  -- The local-file ledger already made this choice (`dayKey` uses local time); this keeps the two
  -- ledgers meaning the same thing rather than two ceilings with different midnights.
  day        TEXT    NOT NULL,
  run_id     TEXT    NOT NULL,
  charged_at INTEGER NOT NULL,
  PRIMARY KEY (day, run_id)
);

-- The gate reads `COUNT(*) WHERE day = ?` on every charge. The primary key already orders by `day`
-- first, so that count is a prefix scan and this index would be redundant — it is deliberately NOT
-- created, rather than added out of habit.
