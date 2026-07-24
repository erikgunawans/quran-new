import { test, expect } from "bun:test";
import {
  recordEvent,
  addBookmark,
  removeBookmark,
  addNote,
  setReadingPosition,
  deleteUser,
  type D1Database,
} from "./store.ts";

/** A fake D1 that captures every prepared statement + its bound values, for asserting the write path. */
interface Call {
  sql: string;
  vals: unknown[];
}
class FakeStmt {
  vals: unknown[] = [];
  constructor(
    private sql: string,
    private log: Call[],
  ) {}
  bind(...values: unknown[]): FakeStmt {
    this.vals = values;
    return this;
  }
  async run(): Promise<unknown> {
    this.log.push({ sql: this.sql, vals: this.vals });
    return {};
  }
  async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
    this.log.push({ sql: this.sql, vals: this.vals });
    return { results: [], success: true };
  }
  async first<T = unknown>(): Promise<T | null> {
    return null;
  }
}
class FakeDB {
  log: Call[] = [];
  prepare(sql: string): FakeStmt {
    return new FakeStmt(sql, this.log);
  }
  async batch(stmts: FakeStmt[]): Promise<unknown[]> {
    for (const s of stmts) await s.run();
    return [];
  }
}

function db(): { db: D1Database; log: Call[] } {
  const fake = new FakeDB();
  return { db: fake as unknown as D1Database, log: fake.log };
}

test("recordEvent inserts into events with a JSON payload and ts", async () => {
  const { db: d, log } = db();
  await recordEvent(d, "user1", "question", { question: "kenapa cemas" }, 1000);
  expect(log).toHaveLength(1);
  expect(log[0].sql).toContain("INSERT INTO events");
  expect(log[0].vals).toEqual(["user1", "question", JSON.stringify({ question: "kenapa cemas" }), 1000]);
});

test("addBookmark upserts on (user_id, ref)", async () => {
  const { db: d, log } = db();
  await addBookmark(d, "user1", "2:255", 1000);
  expect(log[0].sql).toContain("INSERT INTO bookmarks");
  expect(log[0].sql).toContain("ON CONFLICT (user_id, ref) DO UPDATE");
  expect(log[0].vals).toEqual(["user1", "2:255", 1000]);
});

test("removeBookmark deletes the exact (user_id, ref)", async () => {
  const { db: d, log } = db();
  await removeBookmark(d, "user1", "2:255");
  expect(log[0].sql).toContain("DELETE FROM bookmarks WHERE user_id = ? AND ref = ?");
  expect(log[0].vals).toEqual(["user1", "2:255"]);
});

test("addNote clamps overlong text", async () => {
  const { db: d, log } = db();
  const long = "x".repeat(5000);
  await addNote(d, "user1", "2:255", long, 1000);
  expect(log[0].sql).toContain("INSERT INTO notes");
  expect((log[0].vals[2] as string).length).toBe(2000); // MAX_NOTE_LEN
});

test("setReadingPosition upserts on user_id", async () => {
  const { db: d, log } = db();
  await setReadingPosition(d, "user1", "18:10", 1000);
  expect(log[0].sql).toContain("INSERT INTO reading_position");
  expect(log[0].sql).toContain("ON CONFLICT (user_id) DO UPDATE");
  expect(log[0].vals).toEqual(["user1", "18:10", 1000]);
});

test("deleteUser wipes all four tables for the user", async () => {
  const { db: d, log } = db();
  await deleteUser(d, "user1");
  const tables = log.map((c) => c.sql);
  expect(tables.some((s) => s.includes("DELETE FROM events"))).toBe(true);
  expect(tables.some((s) => s.includes("DELETE FROM bookmarks"))).toBe(true);
  expect(tables.some((s) => s.includes("DELETE FROM notes"))).toBe(true);
  expect(tables.some((s) => s.includes("DELETE FROM reading_position"))).toBe(true);
  for (const c of log) expect(c.vals).toEqual(["user1"]);
});
