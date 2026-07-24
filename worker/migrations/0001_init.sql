-- Personalized memory · raw truth layer (issue 02 / T2).
-- The append-only ground truth of what a user actually did. Every row is keyed by `user_id`
-- (the opaque id from T1). This is the WORK layer; the derived KV profile (T4) is regenerable from it,
-- and "Forget me" (issue 08) is a DELETE across every table below.

-- Append-only log. `kind` ∈ {'question','read',...}; `payload` is a small JSON blob (question text, ref…).
CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  TEXT    NOT NULL,
  kind     TEXT    NOT NULL,
  payload  TEXT,
  ts       INTEGER NOT NULL          -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events (user_id, ts);

-- One row per (user, ayah). Re-bookmarking the same ref updates the timestamp (upsert).
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id  TEXT    NOT NULL,
  ref      TEXT    NOT NULL,          -- e.g. '2:255'
  ts       INTEGER NOT NULL,
  PRIMARY KEY (user_id, ref)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_ts ON bookmarks (user_id, ts);

-- Free-text notes attached to an ayah. Many notes per (user, ref) allowed.
CREATE TABLE IF NOT EXISTS notes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  TEXT    NOT NULL,
  ref      TEXT    NOT NULL,
  text     TEXT    NOT NULL,
  ts       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_user_ts ON notes (user_id, ts);

-- Exactly one current reading position per user (upsert on user_id).
CREATE TABLE IF NOT EXISTS reading_position (
  user_id  TEXT    PRIMARY KEY,
  ref      TEXT    NOT NULL,
  ts       INTEGER NOT NULL
);
