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
/**
 * What D1 reports about a write. `meta.changes` is the row count the statement actually affected —
 * the only honest way to tell a conditional INSERT that inserted from one that was ignored.
 *
 * Optional throughout, because a test double is entitled not to model it; a caller that needs it must
 * treat its absence as "unknown", never as zero.
 */
export interface D1RunResult {
  meta?: { changes?: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  // Typed `unknown` and NOT `D1RunResult`, deliberately. Several test doubles in this repo return a
  // `D1Result` from `run()`, and narrowing this would force every one of them to change to satisfy a
  // field exactly one caller reads. `chargeTtsRunD1` narrows it at the read site instead, where a
  // missing `meta` degrades to "no rows changed" rather than to a wrong verdict.
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

// ── accounts (magic-link portability, issue 07) ────────────────────────────────

export interface Account {
  email: string;
  canonical_user_id: string;
}

export async function getAccount(db: D1Database, email: string): Promise<Account | null> {
  return db
    .prepare("SELECT email, canonical_user_id FROM accounts WHERE email = ?")
    .bind(email)
    .first<Account>();
}

/**
 * Resolve the account's canonical user id, creating the account (canonical = this device's id) if new.
 * Race-safe: `ON CONFLICT DO NOTHING` then re-read, so two simultaneous first-logins converge on one id.
 */
export async function linkAccount(
  db: D1Database,
  email: string,
  deviceUserId: string,
  now: number,
): Promise<string> {
  await db
    .prepare("INSERT INTO accounts (email, canonical_user_id, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING")
    .bind(email, deviceUserId, now)
    .run();
  const account = await getAccount(db, email);
  return account?.canonical_user_id ?? deviceUserId;
}

/** Hard-delete every row for a user across all tables. Not soft-delete. */
export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM events WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM bookmarks WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM notes WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM reading_position WHERE user_id = ?").bind(userId),
  ]);
}
