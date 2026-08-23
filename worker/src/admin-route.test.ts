/**
 * HTTP-level tests for the admin kajian routes.
 *
 * THESE COOKIES MUST BE SIGNED AT THE REAL CLOCK. `requireRole` calls the real `Date.now()`
 * internally, so a cookie signed at a fixed epoch is already expired by the time the Worker checks
 * it. That makes refusal assertions pass on EXPIRY rather than on ROLE, which is a vacuous green.
 * Use the real `signSession` and `buildAuthCookie`, and sign each test cookie with `Date.now()`.
 *
 * The admin arm is mandatory on both endpoints. Without a positive control, the anonymous/member/
 * reviewer 403s would also pass if the route were simply absent or broken.
 */

import { describe, expect, test } from "bun:test";
import worker, { type Env } from "./index.ts";
import { buildAuthCookie, signSession } from "./session.ts";
import type { D1Database, D1PreparedStatement, D1Result } from "./store.ts";
import { MAX_JOBS_PER_DAY } from "./kajian-jobs.ts";

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface KajianJobRow {
  id: string;
  videoId: string;
  url: string;
  status: "queued" | "running" | "done" | "failed";
  requestedBy: string;
  createdAt: number;
  updatedAt: number;
  error: string | null;
}

class CountingStmt implements D1PreparedStatement {
  private vals: unknown[] = [];

  constructor(
    private readonly db: CountingDb,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.vals = values;
    return this;
  }

  async run(): Promise<unknown> {
    if (this.sql.includes("INSERT INTO kajian_jobs")) {
      const [id, videoId, url, status, requestedBy, createdAt, updatedAt, error] = this.vals;
      if (typeof videoId !== "string") throw new Error("fake D1 expected a string videoId");
      if (!this.db.rows.has(videoId)) {
        this.db.rows.set(videoId, {
          id: String(id),
          videoId,
          url: String(url),
          status: status as KajianJobRow["status"],
          requestedBy: String(requestedBy),
          createdAt: Number(createdAt),
          updatedAt: Number(updatedAt),
          error: error === null ? null : String(error),
        });
        this.db.writeCount += 1;
      }
      return {};
    }

    throw new Error(`fake D1 does not implement run() for SQL: ${this.sql}`);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    if (this.sql.includes("FROM kajian_jobs ORDER BY created_at DESC LIMIT ?")) {
      const limit = this.vals[0];
      if (typeof limit !== "number") throw new Error("fake D1 expected a numeric limit");
      const rows = [...this.db.rows.values()]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit) as T[];
      return { results: rows, success: true };
    }

    throw new Error(`fake D1 does not implement all() for SQL: ${this.sql}`);
  }

  async first<T = unknown>(): Promise<T | null> {
    // The rolling-day count behind MAX_JOBS_PER_DAY (Erik, 2026-08-23). Applied from the SQL's own
    // predicate, not hardcoded, so this fake cannot report a ceiling the statement does not ask for.
    if (this.sql.includes("SELECT COUNT(*) AS n FROM kajian_jobs WHERE created_at >= ?")) {
      const since = this.vals[0];
      if (typeof since !== "number") throw new Error("fake D1 expected a numeric since");
      return { n: [...this.db.rows.values()].filter((r) => r.createdAt >= since).length } as T;
    }
    if (this.sql.includes("FROM kajian_jobs WHERE video_id = ?")) {
      const videoId = this.vals[0];
      if (typeof videoId !== "string") throw new Error("fake D1 expected a string videoId");
      return (this.db.rows.get(videoId) ?? null) as T | null;
    }

    throw new Error(`fake D1 does not implement first() for SQL: ${this.sql}`);
  }
}

class CountingDb implements D1Database {
  readonly rows = new Map<string, KajianJobRow>();
  writeCount = 0;

  prepare(sql: string): D1PreparedStatement {
    return new CountingStmt(this, sql);
  }

  async batch(): Promise<unknown[]> {
    throw new Error("fake D1 does not implement batch()");
  }
}

const SECRET = "admin-route-test-secret";
const ADMIN_EMAIL = "admin@example.com";
const REVIEWER_EMAIL = "reviewer@example.com";
const MEMBER_EMAIL = "member@example.com";
const URL = "https://worker.example.com/api/admin/kajian/jobs";

const ctx: ExecutionContext = {
  waitUntil(_promise: Promise<unknown>): void {},
  passThroughOnException(): void {},
};

function makeEnv(db?: D1Database): Env {
  return {
    OPENROUTER_API_KEY: "test-openrouter-key",
    ORIGIN_HOST: "origin.example.com",
    ASSETS: { fetch: async (_request: Request) => new Response("asset not used", { status: 500 }) },
    IDENTITY_HMAC_SECRET: SECRET,
    ADMIN_EMAILS: ADMIN_EMAIL,
    REVIEWER_EMAILS: REVIEWER_EMAIL,
    DB: db,
  };
}

async function authCookie(email: string): Promise<string> {
  return buildAuthCookie(await signSession(email, SECRET, Date.now()));
}

async function fetchRoute(args: {
  method: "GET" | "POST" | "PUT";
  env?: Env;
  cookie?: string;
  json?: unknown;
  rawBody?: string;
}): Promise<Response> {
  const headers = new Headers();
  if (args.cookie !== undefined) headers.set("Cookie", args.cookie);
  if (args.json !== undefined || args.rawBody !== undefined) headers.set("Content-Type", "application/json");
  const body = args.rawBody ?? (args.json === undefined ? undefined : JSON.stringify(args.json));
  return worker.fetch(new Request(URL, { method: args.method, headers, body }), args.env ?? makeEnv(new CountingDb()), ctx);
}

function expectNoStore(response: Response): void {
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
}

describe("POST /api/admin/kajian/jobs", () => {
  test("anonymous is refused with 403", async () => {
    const response = await fetchRoute({ method: "POST", json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" } });

    expect(response.status).toBe(403);
    expectNoStore(response);
  });

  test("a signed-in member is refused with 403", async () => {
    const response = await fetchRoute({
      method: "POST",
      cookie: await authCookie(MEMBER_EMAIL),
      json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" },
    });

    expect(response.status).toBe(403);
    expectNoStore(response);
  });

  test("a reviewer is refused with the same body an anonymous caller gets", async () => {
    const anonymous = await fetchRoute({ method: "POST", json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" } });
    const reviewer = await fetchRoute({
      method: "POST",
      cookie: await authCookie(REVIEWER_EMAIL),
      json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" },
    });

    expect(reviewer.status).toBe(403);
    expect(await reviewer.text()).toBe(await anonymous.text());
    expectNoStore(anonymous);
    expectNoStore(reviewer);
  });

  test("an admin is admitted and enqueues the first request", async () => {
    const db = new CountingDb();
    const response = await fetchRoute({
      method: "POST",
      env: makeEnv(db),
      cookie: await authCookie(ADMIN_EMAIL),
      json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" },
    });

    expect(response.status).toBe(201);
    expectNoStore(response);
    expect(await response.json()).toMatchObject({
      ok: true,
      created: true,
      job: {
        videoId: "AbCdEf123_-",
        url: "https://www.youtube.com/watch?v=AbCdEf123_-",
        requestedBy: ADMIN_EMAIL,
        status: "queued",
      },
    });
    expect(db.writeCount).toBe(1);
  });

  /**
   * THE COST CEILING AT THE SURFACE AN ADMIN ACTUALLY TOUCHES (Erik, 2026-08-23: five per day).
   *
   * `kajian-jobs.test.ts` proves the counting. What it cannot show is what the CALLER learns, and
   * that is the half that matters here: this endpoint spends model tokens on ~80,000 characters per
   * click, admin-only bounds WHO and never HOW MUCH, and without a stated status a client retry loop
   * would keep pressing.
   */
  test("the day's allowance spent answers 429 with a Retry-After, not a silent failure", async () => {
    const db = new CountingDb();
    const env = makeEnv(db);
    const cookie = await authCookie(ADMIN_EMAIL);

    for (let i = 0; i < MAX_JOBS_PER_DAY; i++) {
      const ok = await fetchRoute({
        method: "POST",
        env,
        cookie,
        json: { url: `https://youtu.be/vid${String(i).padStart(8, "0")}` },
      });
      expect(ok.status).toBe(201);
    }

    const refused = await fetchRoute({
      method: "POST",
      env,
      cookie,
      json: { url: "https://youtu.be/vidOVERFLOW" },
    });

    // 429 and not 403: the caller is a legitimate admin doing nothing wrong — the budget is spent.
    // A 403 would say "you may not", which is false and sends an admin looking at their role.
    expect(refused.status).toBe(429);
    expect(await refused.json()).toMatchObject({ ok: false, error: "rate_limited" });
    // Without this header a client cannot tell a momentary refusal from a permanent one.
    expect(refused.headers.get("Retry-After")).toBe(String(24 * 60 * 60));
    // Counted from the constant, so raising the ceiling cannot leave this asserting a stale number.
    expect(db.writeCount).toBe(MAX_JOBS_PER_DAY);
  });

  test("a bad URL returns 400 and records no write", async () => {
    const db = new CountingDb();
    const response = await fetchRoute({
      method: "POST",
      env: makeEnv(db),
      cookie: await authCookie(ADMIN_EMAIL),
      json: { url: "https://example.com/watch?v=AbCdEf123_-" },
    });

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_url" });
    expect(db.writeCount).toBe(0);
  });

  test("malformed JSON takes the same invalid_url path and records no write", async () => {
    const db = new CountingDb();
    const response = await fetchRoute({
      method: "POST",
      env: makeEnv(db),
      cookie: await authCookie(ADMIN_EMAIL),
      rawBody: "{",
    });

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(await response.json()).toEqual({ ok: false, error: "invalid_url" });
    expect(db.writeCount).toBe(0);
  });

  test("a second POST for the same video returns created false and still records one write", async () => {
    const db = new CountingDb();
    const env = makeEnv(db);
    const cookie = await authCookie(ADMIN_EMAIL);

    const first = await fetchRoute({
      method: "POST",
      env,
      cookie,
      json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" },
    });
    const second = await fetchRoute({
      method: "POST",
      env,
      cookie,
      json: { url: "https://youtu.be/AbCdEf123_-" },
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expectNoStore(first);
    expectNoStore(second);
    expect(((await first.json()) as { created: boolean }).created).toBe(true);
    expect(((await second.json()) as { created: boolean }).created).toBe(false);
    expect(db.writeCount).toBe(1);
  });

  test("no DB returns 503 and does not throw", async () => {
    const response = await fetchRoute({
      method: "POST",
      env: makeEnv(),
      cookie: await authCookie(ADMIN_EMAIL),
      json: { url: "https://www.youtube.com/watch?v=AbCdEf123_-" },
    });

    expect(response.status).toBe(503);
    expectNoStore(response);
    expect(await response.json()).toEqual({ ok: false, error: "unavailable" });
  });
});

describe("method probing stays behind the admin gate", () => {
  test("a non-admin PUT still gets 403 rather than learning the route shape", async () => {
    const response = await fetchRoute({ method: "PUT" });

    expect(response.status).toBe(403);
    expectNoStore(response);
  });

  test("an admin PUT gets the route's 405 once the gate has admitted them", async () => {
    const response = await fetchRoute({ method: "PUT", cookie: await authCookie(ADMIN_EMAIL) });

    expect(response.status).toBe(405);
    expectNoStore(response);
    expect(await response.json()).toEqual({ ok: false, error: "method_not_allowed" });
  });
});

describe("GET /api/admin/kajian/jobs", () => {
  test("anonymous is refused with 403", async () => {
    const response = await fetchRoute({ method: "GET" });

    expect(response.status).toBe(403);
    expectNoStore(response);
  });

  test("a signed-in member is refused with 403", async () => {
    const response = await fetchRoute({ method: "GET", cookie: await authCookie(MEMBER_EMAIL) });

    expect(response.status).toBe(403);
    expectNoStore(response);
  });

  test("a reviewer is refused with the same body an anonymous caller gets", async () => {
    const anonymous = await fetchRoute({ method: "GET" });
    const reviewer = await fetchRoute({ method: "GET", cookie: await authCookie(REVIEWER_EMAIL) });

    expect(reviewer.status).toBe(403);
    expect(await reviewer.text()).toBe(await anonymous.text());
    expectNoStore(anonymous);
    expectNoStore(reviewer);
  });

  test("an admin is admitted and gets the queued jobs", async () => {
    const db = new CountingDb();
    db.rows.set("AbCdEf123_-", {
      id: "job-1",
      videoId: "AbCdEf123_-",
      url: "https://www.youtube.com/watch?v=AbCdEf123_-",
      status: "queued",
      requestedBy: ADMIN_EMAIL,
      createdAt: 1000,
      updatedAt: 1000,
      error: null,
    });
    const response = await fetchRoute({ method: "GET", env: makeEnv(db), cookie: await authCookie(ADMIN_EMAIL) });

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(await response.json()).toEqual({
      ok: true,
      jobs: [
        {
          id: "job-1",
          videoId: "AbCdEf123_-",
          url: "https://www.youtube.com/watch?v=AbCdEf123_-",
          status: "queued",
          requestedBy: ADMIN_EMAIL,
          createdAt: 1000,
          updatedAt: 1000,
          error: null,
        },
      ],
    });
  });

  test("no DB returns 503 and does not throw", async () => {
    const response = await fetchRoute({ method: "GET", env: makeEnv(), cookie: await authCookie(ADMIN_EMAIL) });

    expect(response.status).toBe(503);
    expectNoStore(response);
    expect(await response.json()).toEqual({ ok: false, error: "unavailable" });
  });
});
