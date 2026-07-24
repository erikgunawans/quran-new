/**
 * Personalized memory · raw truth layer access (issue 02 / T2).
 *
 * The append-only ground truth of what a user did, in D1. Everything is keyed by `user_id` (T1). The
 * derived KV profile (T4) is regenerable from here; "Forget me" (issue 08) is `deleteUser`.
 *
 * Minimal inline D1 types — same self-contained style as the Worker's inline `ASSETS` type — so the
 * Worker keeps its `types: []` tsconfig and pulls no `@cloudflare/workers-types` dependency.
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(column?: string): Promise<T | null>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

/** Cap a note's length — a public write endpoint must bound what it stores. */
const MAX_NOTE_LEN = 2000;
/** Cap an event payload blob. */
const MAX_PAYLOAD_LEN = 4000;

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

// ── writes ────────────────────────────────────────────────────────────────────

/** Append one event to the log. `payload` is serialized to a bounded JSON string. */
export async function recordEvent(
  db: D1Database,
  userId: string,
  kind: string,
  payload: unknown,
  now: number,
): Promise<void> {
  const blob = payload === undefined ? null : clamp(JSON.stringify(payload), MAX_PAYLOAD_LEN);
  await db
    .prepare("INSERT INTO events (user_id, kind, payload, ts) VALUES (?, ?, ?, ?)")
    .bind(userId, kind, blob, now)
    .run();
}

/** Add or refresh a bookmark (upsert on (user_id, ref)). */
export async function addBookmark(db: D1Database, userId: string, ref: string, now: number): Promise<void> {
  await db
    .prepare(
      "INSERT INTO bookmarks (user_id, ref, ts) VALUES (?, ?, ?) " +
        "ON CONFLICT (user_id, ref) DO UPDATE SET ts = excluded.ts",
    )
    .bind(userId, ref, now)
    .run();
}

export async function removeBookmark(db: D1Database, userId: string, ref: string): Promise<void> {
  await db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND ref = ?").bind(userId, ref).run();
}

export async function addNote(db: D1Database, userId: string, ref: string, text: string, now: number): Promise<void> {
  await db
    .prepare("INSERT INTO notes (user_id, ref, text, ts) VALUES (?, ?, ?, ?)")
    .bind(userId, ref, clamp(text, MAX_NOTE_LEN), now)
    .run();
}

/** Set the user's single current reading position (upsert on user_id). */
export async function setReadingPosition(db: D1Database, userId: string, ref: string, now: number): Promise<void> {
  await db
    .prepare(
      "INSERT INTO reading_position (user_id, ref, ts) VALUES (?, ?, ?) " +
        "ON CONFLICT (user_id) DO UPDATE SET ref = excluded.ref, ts = excluded.ts",
    )
    .bind(userId, ref, now)
    .run();
}

// ── reads (consumed by T3 read-back UI and T4 distillation) ─────────────────────

export interface EventRow {
  kind: string;
  payload: string | null;
  ts: number;
}

/** The user's full event history, newest first. Feeds T4 distillation (which reads the FULL log). */
export async function getEvents(db: D1Database, userId: string): Promise<EventRow[]> {
  const res = await db
    .prepare("SELECT kind, payload, ts FROM events WHERE user_id = ? ORDER BY ts DESC")
    .bind(userId)
    .all<EventRow>();
  return res.results;
}

export interface BookmarkRow {
  ref: string;
  ts: number;
}
export interface NoteRow {
  ref: string;
  text: string;
  ts: number;
}
export interface PositionRow {
  ref: string;
  ts: number;
}
export interface QuestionRow {
  question: string;
  ts: number;
}

export async function getBookmarks(db: D1Database, userId: string): Promise<BookmarkRow[]> {
  const res = await db
    .prepare("SELECT ref, ts FROM bookmarks WHERE user_id = ? ORDER BY ts DESC")
    .bind(userId)
    .all<BookmarkRow>();
  return res.results;
}

export async function getNotes(db: D1Database, userId: string): Promise<NoteRow[]> {
  const res = await db
    .prepare("SELECT ref, text, ts FROM notes WHERE user_id = ? ORDER BY ts DESC")
    .bind(userId)
    .all<NoteRow>();
  return res.results;
}

export async function getReadingPosition(db: D1Database, userId: string): Promise<PositionRow | null> {
  return db.prepare("SELECT ref, ts FROM reading_position WHERE user_id = ?").bind(userId).first<PositionRow>();
}

/** Recent questions (newest first), parsed out of the event log's JSON payload. */
export async function getQuestions(db: D1Database, userId: string, limit = 20): Promise<QuestionRow[]> {
  const res = await db
    .prepare("SELECT payload, ts FROM events WHERE user_id = ? AND kind = 'question' ORDER BY ts DESC LIMIT ?")
    .bind(userId, limit)
    .all<{ payload: string | null; ts: number }>();
  const out: QuestionRow[] = [];
  for (const row of res.results) {
    try {
      const q = (JSON.parse(row.payload ?? "{}") as { question?: string }).question ?? "";
      if (q) out.push({ question: q, ts: row.ts });
    } catch {
      /* skip malformed payload */
    }
  }
  return out;
}

// ── delete (the "Forget me" path, issue 08) ────────────────────────────────────

/** Hard-delete every row for a user across all tables. Not soft-delete. */
export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM events WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM bookmarks WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM notes WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM reading_position WHERE user_id = ?").bind(userId),
  ]);
}
