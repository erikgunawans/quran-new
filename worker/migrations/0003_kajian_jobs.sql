-- Kajian summarisation queue entries.
-- One row per YouTube video requested by an admin, so the runner can claim queued work, mark progress,
-- and leave a failure reason behind without losing when or by whom the request was made.
CREATE TABLE IF NOT EXISTS kajian_jobs (
  id           TEXT    PRIMARY KEY,
  video_id     TEXT    NOT NULL UNIQUE,
  url          TEXT    NOT NULL,
  status       TEXT    NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
  requested_by TEXT    NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_kajian_jobs_status ON kajian_jobs(status);
