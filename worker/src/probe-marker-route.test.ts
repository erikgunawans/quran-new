/**
 * REACHABILITY, not copy. This file exists because a predicate test cannot see whether any path
 * calls the predicate.
 *
 * `probe-marker.test.ts` proves `isProbeRequest` decides correctly. It would stay green if the call
 * in `handleAnswer` were deleted — which is precisely how this repo's `answer-blocked` copy tests
 * stayed green for six days over a channel nothing could reach. So these two arms go through the
 * real `worker.fetch`, and assert on whether an `INSERT INTO events` actually happened.
 *
 * ⚠️ THE CONTROL ARM IS MANDATORY. Without the first test, the second would pass just as happily if
 * the write were broken, the DB unbound, `EDITION` wrong, or the identity anonymous — a green that
 * says nothing. The pair is the measurement; neither half is.
 */
import { describe, expect, test } from "bun:test";
import worker, { type Env } from "./index.ts";
import type { D1Database, D1PreparedStatement, D1Result } from "./store.ts";
import { PROBE_HEADER } from "./probe-marker.ts";

class LoggingStmt implements D1PreparedStatement {
  private vals: unknown[] = [];
  constructor(
    private readonly log: string[],
    private readonly sql: string,
  ) {}
  bind(...values: unknown[]): D1PreparedStatement {
    this.vals = values;
    return this;
  }
  async first<T = unknown>(): Promise<T | null> {
    return null;
  }
  async run<T = unknown>(): Promise<D1Result<T>> {
    this.log.push(this.sql);
    return { results: [], success: true } as unknown as D1Result<T>;
  }
  async all<T = unknown>(): Promise<D1Result<T>> {
    this.log.push(this.sql);
    return { results: [], success: true } as unknown as D1Result<T>;
  }
}

function fakeDb(): { db: D1Database; sql: string[] } {
  const sql: string[] = [];
  const db = {
    prepare: (s: string) => new LoggingStmt(sql, s),
    batch: async (stmts: D1PreparedStatement[]) => {
      for (const s of stmts) await s.run();
      return [];
    },
  };
  return { db: db as unknown as D1Database, sql };
}

/** Runs one POST /api/answer and returns every SQL statement the Worker issued. */
async function post(headers: Record<string, string>): Promise<string[]> {
  const { db, sql } = fakeDb();
  const env = {
    EDITION: "synthesis",
    IDENTITY_HMAC_SECRET: "a-secret-long-enough-to-sign-with",
    DB: db,
  } as unknown as Env;

  // `waitUntil` is where the event write lives — deferred so it never delays the answer. A test that
  // does not await these sees an empty log no matter what the code does, which would make BOTH arms
  // pass and the measurement meaningless.
  const deferred: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void deferred.push(p), passThroughOnException: () => {} };

  await worker.fetch(
    new Request("https://new-quranku.axiara.ai/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ question: "kenapa kita harus salat lima waktu", verses: [], entries: [] }),
    }),
    env,
    ctx as never,
  );
  await Promise.allSettled(deferred);
  return sql;
}

describe("the probe marker suppresses the question write, and only that write", () => {
  test("CONTROL — a reader's request DOES write the question to events", async () => {
    const sql = await post({});
    expect(sql.some((s) => s.includes("INSERT INTO events"))).toBe(true);
  });

  test("a request marked as a probe writes NOTHING to events", async () => {
    const sql = await post({ [PROBE_HEADER]: "1" });
    expect(sql.some((s) => s.includes("INSERT INTO events"))).toBe(false);
  });

  test("a header the predicate rejects is treated as a reader, not as a probe", async () => {
    const sql = await post({ [PROBE_HEADER]: "" });
    expect(sql.some((s) => s.includes("INSERT INTO events"))).toBe(true);
  });
});
