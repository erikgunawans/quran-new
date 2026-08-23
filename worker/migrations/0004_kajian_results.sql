-- Result columns for a finished kajian summarisation, plus the runner's lease fields.
--
-- SEPARATE FROM 0003 ON PURPOSE. `0003_kajian_jobs.sql` uses CREATE TABLE IF NOT EXISTS, so amending
-- it in place would silently no-op against any D1 that had already run it and leave the columns
-- missing with no error. An ALTER against a table that does not exist fails LOUDLY, which is the
-- correct failure: it means 0003 has not been applied yet, and the operator should run it first.
--
-- Re-running this file fails ("duplicate column name"). That is also correct — these are applied
-- once, by hand (`wrangler d1 execute … --file`), the way 0001 and 0002 were.
--
-- WHY THE RESULT LIVES IN THE JOB ROW rather than in a second table: a job and its result are 1:1
-- and share a lifetime. A second table would buy nothing but a join and a way for the two to
-- disagree about whether the work finished.

-- What the reader's card needs (web/src/kajian-summary.ts). All nullable: a queued or failed job has
-- none of them, and a NULL here is what makes "not finished" unrepresentable as a half-built card.
ALTER TABLE kajian_jobs ADD COLUMN title        TEXT;
ALTER TABLE kajian_jobs ADD COLUMN channel      TEXT;
ALTER TABLE kajian_jobs ADD COLUMN published_at TEXT;
ALTER TABLE kajian_jobs ADD COLUMN duration_sec INTEGER;
ALTER TABLE kajian_jobs ADD COLUMN thumb_url    TEXT;
ALTER TABLE kajian_jobs ADD COLUMN summary_url  TEXT;
ALTER TABLE kajian_jobs ADD COLUMN audio_url    TEXT;
ALTER TABLE kajian_jobs ADD COLUMN generated_at TEXT;

-- DELIBERATELY ABSENT: `speaker` and `reviewed`.
--
--   `speaker` — the roster (docs/kajian/roster.yaml) is EMPTY, and that silence is a safety property:
--   no slide names anyone. A column here would be a place for a scraped name to land, so the schema
--   does not offer one. The feed's `speaker` field stays null until a roster exists.
--
--   `reviewed` — a record has to SAY it was reviewed, and nothing in this pipeline reviews anything.
--   `toKajianSummary` already defaults it to false for any record that omits it. Adding the column
--   would create a switch that a later change could flip without a human ever reading the summary.

-- The runner's lease. A claim that dies mid-run must not strand its job in `running` for ever, so
-- the claim stamps when it was taken and a later claim may reclaim one that went stale.
ALTER TABLE kajian_jobs ADD COLUMN claimed_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_kajian_jobs_claim ON kajian_jobs(status, created_at);
