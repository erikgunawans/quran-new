/**
 * The RUNNER half of the kajian queue: claiming work, reporting a result, reporting a failure.
 *
 * ── WHY THE FAKE D1 EXECUTES THE STATUS PREDICATE INSTEAD OF IGNORING IT ────────────────────────
 *
 * Every transition in `kajian-jobs.ts` puts its guard in the SQL (`WHERE … AND status = 'running'`),
 * not in an `if` above the call. A test double that stored whatever it was handed would therefore be
 * blind to the entire concurrency design: `completeKajianJob` on an already-`done` row would "pass"
 * because the fake never enforced the clause the real database would. A first cut of this fake did
 * exactly that, hardcoding `r.status !== "running"` — so it read the SQL's guards out of the picture
 * and three assertions here could never have failed. It now derives both the status guard and the
 * lease bound FROM the statement text.
 *
 * WHAT WAS ACTUALLY PROVED, and it is five mutations, not "everything below":
 *
 *   1. Deleting `AND status = 'running'` from complete and fail → 3 tests red.
 *   2. Replacing the lease bound with a bare `status = 'running'` → 2 tests red, including the
 *      single-winner claim.
 *   3. Removing the `MIN_RUNNER_SECRET_LEN` floor in `runner-auth.ts` → 1 red.
 *   4. Adding a `.trim()` to the extracted bearer credential → 1 red.
 *   5. Storing a blank failure reason verbatim → 2 red.
 *
 * The remaining cases in this file are ordinary assertions and carry no such warrant.
 */
import { describe, expect, test } from "bun:test";
import {
  CLAIM_LEASE_MS,
  claimNextKajianJob,
  completeKajianJob,
  failKajianJob,
  type KajianJobResult,
  type KajianJobStatus,
} from "./kajian-jobs.ts";
import { isRunner, readBearer, MIN_RUNNER_SECRET_LEN } from "./runner-auth.ts";
import type { D1Database, D1PreparedStatement, D1Result } from "./store.ts";

interface Row {
  id: string;
  videoId: string;
  url: string;
  status: KajianJobStatus;
  requestedBy: string;
  createdAt: number;
  updatedAt: number;
  error: string | null;
  claimedAt: number | null;
  title?: string;
  channel?: string;
  publishedAt?: string;
  durationSec?: number;
  thumbUrl?: string;
  summaryUrl?: string;
  audioUrl?: string | null;
  generatedAt?: string;
}

function row(over: Partial<Row> & Pick<Row, "id" | "videoId">): Row {
  return {
    url: `https://youtu.be/${over.videoId}`,
    status: "queued",
    requestedBy: "admin@example.test",
    createdAt: 1_000,
    updatedAt: 1_000,
    error: null,
    claimedAt: null,
    ...over,
  };
}

/** The projection every transition returns. Mirrors SELECT_COLS in kajian-jobs.ts. */
function projected(r: Row): Record<string, unknown> {
  return {
    id: r.id,
    videoId: r.videoId,
    url: r.url,
    status: r.status,
    requestedBy: r.requestedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    error: r.error,
  };
}

/** Every `status = 'x'` literal appearing after `marker` in the statement. */
function sqlStatusSet(sql: string, marker: string): Set<string> {
  const from = sql.indexOf(marker);
  const tail = from === -1 ? sql : sql.slice(from);
  const out = new Set<string>();
  for (const m of tail.matchAll(/status = '(\w+)'/g)) {
    const found = m[1];
    if (found !== undefined) out.add(found);
  }
  return out;
}

/** Does the row's status satisfy the `AND status = '…'` guard this statement carries? An UPDATE
 *  with no such guard accepts any row — which is exactly the mutation the tests must catch. */
function requiredStatusHolds(sql: string, status: string): boolean {
  const m = /AND status = '(\w+)'/.exec(sql);
  return m === null || m[1] === status;
}

class Stmt implements D1PreparedStatement {
  private vals: unknown[] = [];

  constructor(
    private readonly db: FakeDb,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.vals = values;
    return this;
  }

  async run(): Promise<unknown> {
    throw new Error(`fake D1 does not implement run() for SQL: ${this.sql}`);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    throw new Error(`fake D1 does not implement all() for SQL: ${this.sql}`);
  }

  async first<T = unknown>(): Promise<T | null> {
    if (this.sql.startsWith("UPDATE kajian_jobs SET status = 'running'")) return this.claim() as T | null;
    if (this.sql.startsWith("UPDATE kajian_jobs SET status = 'done'")) return this.complete() as T | null;
    if (this.sql.startsWith("UPDATE kajian_jobs SET status = 'failed'")) return this.fail() as T | null;
    throw new Error(`fake D1 does not implement first() for SQL: ${this.sql}`);
  }

  /**
   * `queued`, or a `running` row whose lease expired — oldest first, exactly one winner.
   *
   * WHICH ROWS ARE ELIGIBLE IS READ OUT OF THE SQL, not hardcoded. If the statement stops asking
   * about `claimed_at`, this fake stops honouring stale claims too, so the lease assertions fail
   * when the lease is removed from the real query instead of passing on the fake's own memory.
   */
  private claim(): Record<string, unknown> | null {
    const [now, updated, staleBefore] = this.vals as [number, number, number];
    const reclaimsStale = this.sql.includes("claimed_at <");
    const statuses = sqlStatusSet(this.sql, "WHERE");
    const eligible = [...this.db.rows.values()]
      .filter((r) => {
        if (!statuses.has(r.status)) return false;
        // The lease narrows the `running` branch ONLY, and only while the statement asks for it.
        // Modelled this way round on purpose: a statement that selects `running` without a
        // `claimed_at` bound reclaims EVERY running job, including one still being worked. A first
        // cut of this fake read a missing bound as "reclaim nothing", which quietly inverted the
        // mutation — the lease test passed under a query that had no lease.
        if (r.status === "running" && reclaimsStale) {
          return r.claimedAt !== null && r.claimedAt < staleBefore;
        }
        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt);
    const pick = eligible[0];
    if (pick === undefined) return null;
    pick.status = "running";
    pick.claimedAt = now;
    pick.updatedAt = updated;
    return projected(pick);
  }

  private complete(): Record<string, unknown> | null {
    const [updated, title, channel, publishedAt, durationSec, thumbUrl, summaryUrl, audioUrl, generatedAt, id] =
      this.vals as [number, string, string, string, number, string, string, string | null, string, string];
    const r = this.db.rows.get(id);
    // THE GUARD IS READ FROM THE SQL, not asserted here. A first cut of this fake hardcoded
    // `r.status !== "running"`, which made every "cannot report twice" assertion vacuous: the fake
    // refused the second call whether or not the real statement carried the clause. Deleting
    // `AND status = 'running'` from `kajian-jobs.ts` now reddens those tests, which is the only
    // thing that makes them evidence.
    if (r === undefined || !requiredStatusHolds(this.sql, r.status)) return null;
    Object.assign(r, {
      status: "done" as const,
      error: null,
      updatedAt: updated,
      title,
      channel,
      publishedAt,
      durationSec,
      thumbUrl,
      summaryUrl,
      audioUrl,
      generatedAt,
    });
    return projected(r);
  }

  private fail(): Record<string, unknown> | null {
    const [stored, updated, id] = this.vals as [string, number, string];
    const r = this.db.rows.get(id);
    if (r === undefined || !requiredStatusHolds(this.sql, r.status)) return null;
    r.status = "failed";
    r.error = stored;
    r.updatedAt = updated;
    return projected(r);
  }
}

class FakeDb implements D1Database {
  readonly rows = new Map<string, Row>();

  constructor(...seed: Row[]) {
    for (const r of seed) this.rows.set(r.id, r);
  }

  prepare(sql: string): D1PreparedStatement {
    return new Stmt(this, sql);
  }

  async batch(): Promise<unknown[]> {
    throw new Error("fake D1 does not implement batch()");
  }
}

const RESULT: KajianJobResult = {
  title: "Kajian tentang sabar",
  channel: "Contoh Kanal",
  publishedAt: "2026-08-01",
  durationSec: 3_600,
  thumbUrl: "https://example.test/own-render.png",
  summaryUrl: "https://example.test/kajian/abcdefghijk/slide.html",
  audioUrl: null,
  generatedAt: "2026-08-23T00:00:00Z",
};

describe("claiming is a single-winner transition, not a read followed by a write", () => {
  test("claims the OLDEST queued job and marks it running with a lease stamp", async () => {
    const db = new FakeDb(
      row({ id: "new", videoId: "bbbbbbbbbbb", createdAt: 9_000 }),
      row({ id: "old", videoId: "aaaaaaaaaaa", createdAt: 2_000 }),
    );

    const job = await claimNextKajianJob(db, 50_000);

    expect(job?.id).toBe("old");
    expect(job?.status).toBe("running");
    expect(db.rows.get("old")?.claimedAt).toBe(50_000);
  });

  test("a second claim cannot take the job the first one took", async () => {
    const db = new FakeDb(row({ id: "only", videoId: "aaaaaaaaaaa" }));

    const first = await claimNextKajianJob(db, 50_000);
    const second = await claimNextKajianJob(db, 50_001);

    expect(first?.id).toBe("only");
    // Not "the same job twice" — the second poll finds an empty queue, which is the ordinary answer.
    expect(second).toBeNull();
  });

  test("an empty queue answers null rather than throwing", async () => {
    expect(await claimNextKajianJob(new FakeDb(), 1)).toBeNull();
  });

  test("a job already done or failed is never re-claimed", async () => {
    const db = new FakeDb(
      row({ id: "d", videoId: "aaaaaaaaaaa", status: "done" }),
      row({ id: "f", videoId: "bbbbbbbbbbb", status: "failed" }),
    );
    expect(await claimNextKajianJob(db, 999_999_999)).toBeNull();
  });
});

describe("a dead runner's claim is reclaimable, but a slow one's is not", () => {
  const claimedAt = 100_000;

  test("a claim older than the lease may be taken again", async () => {
    const db = new FakeDb(row({ id: "stuck", videoId: "aaaaaaaaaaa", status: "running", claimedAt }));

    const job = await claimNextKajianJob(db, claimedAt + CLAIM_LEASE_MS + 1);

    expect(job?.id).toBe("stuck");
    expect(db.rows.get("stuck")?.claimedAt).toBe(claimedAt + CLAIM_LEASE_MS + 1);
  });

  test("a claim still inside its lease is left alone — reclaiming a SLOW job would run it twice", async () => {
    const db = new FakeDb(row({ id: "busy", videoId: "aaaaaaaaaaa", status: "running", claimedAt }));

    // One millisecond before the lease expires. The boundary is asserted from the exported constant
    // rather than a literal, so changing the lease cannot leave this test silently testing nothing.
    expect(await claimNextKajianJob(db, claimedAt + CLAIM_LEASE_MS - 1)).toBeNull();
    expect(db.rows.get("busy")?.claimedAt).toBe(claimedAt);
  });
});

describe("reporting a result is accepted once, from `running` only", () => {
  async function claimed(): Promise<FakeDb> {
    const db = new FakeDb(row({ id: "j1", videoId: "aaaaaaaaaaa" }));
    await claimNextKajianJob(db, 10_000);
    return db;
  }

  test("stores every field the reader's card needs", async () => {
    const db = await claimed();

    const job = await completeKajianJob(db, "j1", RESULT, 20_000);

    expect(job?.status).toBe("done");
    const stored = db.rows.get("j1");
    expect(stored?.title).toBe(RESULT.title);
    expect(stored?.summaryUrl).toBe(RESULT.summaryUrl);
    expect(stored?.generatedAt).toBe(RESULT.generatedAt);
  });

  test("a duplicate report cannot overwrite a finished job", async () => {
    const db = await claimed();
    await completeKajianJob(db, "j1", RESULT, 20_000);

    const again = await completeKajianJob(db, "j1", { ...RESULT, title: "OVERWRITTEN" }, 30_000);

    expect(again).toBeNull();
    expect(db.rows.get("j1")?.title).toBe(RESULT.title);
  });

  test("a job that was never claimed cannot be completed", async () => {
    const db = new FakeDb(row({ id: "j1", videoId: "aaaaaaaaaaa" }));
    expect(await completeKajianJob(db, "j1", RESULT, 20_000)).toBeNull();
    expect(db.rows.get("j1")?.status).toBe("queued");
  });

  test("an unknown id is refused rather than inserted", async () => {
    const db = await claimed();
    expect(await completeKajianJob(db, "no-such-id", RESULT, 20_000)).toBeNull();
  });

  test("completing CLEARS a previous error, so a retried job does not keep a stale cause", async () => {
    const db = new FakeDb(row({ id: "j1", videoId: "aaaaaaaaaaa", error: "earlier yt-dlp refusal" }));
    await claimNextKajianJob(db, 10_000);

    await completeKajianJob(db, "j1", RESULT, 20_000);

    expect(db.rows.get("j1")?.error).toBeNull();
  });
});

describe("a failure always carries a stated reason — the PRD's silent-empty-summary criterion", () => {
  async function claimed(): Promise<FakeDb> {
    const db = new FakeDb(row({ id: "j1", videoId: "aaaaaaaaaaa" }));
    await claimNextKajianJob(db, 10_000);
    return db;
  }

  test("stores the reason the runner gave", async () => {
    const db = await claimed();

    const job = await failKajianJob(db, "j1", "yt-dlp: HTTP 403 from a datacentre IP", 20_000);

    expect(job?.status).toBe("failed");
    expect(job?.error).toBe("yt-dlp: HTTP 403 from a datacentre IP");
  });

  test.each([
    ["an empty reason", ""],
    ["whitespace only", "   \n\t "],
  ])("%s is replaced by a generic cause, never stored blank", async (_name, reason) => {
    const db = await claimed();

    const job = await failKajianJob(db, "j1", reason, 20_000);

    // The admin must never see "failed" with nothing to act on.
    expect(job?.error).toBe("unspecified runner failure");
  });

  test("a very long reason is capped rather than stored whole", async () => {
    const db = await claimed();

    const job = await failKajianJob(db, "j1", "x".repeat(5_000), 20_000);

    expect(job?.error?.length).toBe(500);
  });

  test("a failure cannot overwrite an already-done job", async () => {
    const db = await claimed();
    await completeKajianJob(db, "j1", RESULT, 20_000);

    expect(await failKajianJob(db, "j1", "too late", 30_000)).toBeNull();
    expect(db.rows.get("j1")?.status).toBe("done");
  });
});

describe("the runner proves a MACHINE, and proves it or is refused", () => {
  const secret = "s".repeat(MIN_RUNNER_SECRET_LEN);
  const req = (auth?: string): Request =>
    new Request("https://example.test/api/runner/kajian/claim", {
      method: "POST",
      headers: auth === undefined ? {} : { Authorization: auth },
    });

  test("the exact secret is admitted", () => {
    expect(isRunner(req(`Bearer ${secret}`), { RUNNER_SECRET: secret })).toBe(true);
  });

  test("the scheme is case-insensitive, as RFC 7235 says", () => {
    expect(isRunner(req(`bearer ${secret}`), { RUNNER_SECRET: secret })).toBe(true);
    expect(isRunner(req(`BEARER ${secret}`), { RUNNER_SECRET: secret })).toBe(true);
  });

  test.each([
    ["no header at all", undefined],
    ["a wrong secret of the same length", `Bearer ${"t".repeat(MIN_RUNNER_SECRET_LEN)}`],
    ["a prefix of the real secret", `Bearer ${secret.slice(0, -1)}`],
    ["the right secret under the wrong scheme", `Basic ${secret}`],
    ["the bare secret with no scheme", secret],
    ["an empty bearer value", "Bearer "],
  ])("%s is refused", (_name, header) => {
    expect(isRunner(req(header), { RUNNER_SECRET: secret })).toBe(false);
  });

  test.each([
    ["unset", undefined],
    ["empty", ""],
    ["one character short of the floor", "s".repeat(MIN_RUNNER_SECRET_LEN - 1)],
  ])("a %s RUNNER_SECRET admits NOBODY — it fails closed, never open", (_name, configured) => {
    const env = { RUNNER_SECRET: configured };
    // The control arm: with no header there is nothing to match anyway, so the claim being tested is
    // that presenting the CONFIGURED value still fails. Otherwise a passing test proves nothing about
    // fail-closed — only that an empty request is empty.
    expect(isRunner(req(undefined), env)).toBe(false);
    expect(isRunner(req(`Bearer ${configured ?? ""}`), env)).toBe(false);
  });

  test("a trailing space in the header is NOT a distinct credential, and cannot be made one", () => {
    // Written first as "a trailing space is refused" — and it failed, because it is not this code's
    // decision. RFC 9110 5.5 strips optional whitespace around a header field value, and `Request`
    // does so before `runner-auth.ts` is reached: `Bearer <secret> ` and `Bearer <secret>` are the
    // same header on the wire. Asserted here as the transport property it is, rather than deleted,
    // so nobody re-adds a trim to `readBearer` to "fix" a case that never arrives.
    const req2 = new Request("https://example.test/api/runner/kajian/claim", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret} ` },
    });
    expect(req2.headers.get("Authorization")).toBe(`Bearer ${secret}`);
    expect(isRunner(req2, { RUNNER_SECRET: secret })).toBe(true);
  });

  test("readBearer does not normalise the credential it extracts", () => {
    // Trimming or case-folding a secret is how two different strings come to be accepted as one.
    expect(readBearer("Bearer  padded")).toBe(" padded");
    expect(readBearer("Bearer MiXeD")).toBe("MiXeD");
    expect(readBearer("Bearer")).toBeNull();
    expect(readBearer(null)).toBeNull();
  });
});
