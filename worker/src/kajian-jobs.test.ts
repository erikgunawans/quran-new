import { describe, expect, test } from "bun:test";
import { enqueueKajianJob, listKajianJobs, youTubeVideoId, MAX_JOBS_PER_DAY } from "./kajian-jobs.ts";
import type { D1Database, D1PreparedStatement, D1Result } from "./store.ts";

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
      this.db.lastListLimit = limit;
      const rows = [...this.db.rows.values()]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit) as T[];
      return { results: rows, success: true };
    }

    throw new Error(`fake D1 does not implement all() for SQL: ${this.sql}`);
  }

  async first<T = unknown>(): Promise<T | null> {
    // The rolling-day count behind MAX_JOBS_PER_DAY. Applied from the SQL's own predicate, so
    // changing the window reddens the cap tests rather than passing on the fake's own memory.
    if (this.sql.includes("SELECT COUNT(*) AS n FROM kajian_jobs WHERE created_at >= ?")) {
      const since = this.vals[0];
      if (typeof since !== "number") throw new Error("fake D1 expected a numeric since");
      if (this.db.breakCount) return { n: null } as T;
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
  /** Make the rolling-day count come back as something that is not a number. */
  breakCount = false;
  lastListLimit: number | null = null;

  prepare(sql: string): D1PreparedStatement {
    return new CountingStmt(this, sql);
  }

  async batch(): Promise<unknown[]> {
    throw new Error("fake D1 does not implement batch()");
  }
}

describe("youTubeVideoId accepts only the queue's supported URL forms", () => {
  const goodId = "AbCdEf123_-";

  test.each([
    ["https watch", `https://youtube.com/watch?v=${goodId}`],
    ["http watch", `http://youtube.com/watch?v=${goodId}`],
    ["www watch", `https://www.youtube.com/watch?v=${goodId}`],
    ["m watch", `https://m.youtube.com/watch?v=${goodId}`],
    ["watch with extra query params", `https://www.youtube.com/watch?v=${goodId}&t=20s&list=PL123`],
    ["youtu.be", `https://youtu.be/${goodId}`],
    ["www youtu.be", `https://www.youtu.be/${goodId}`],
    ["m youtu.be", `https://m.youtu.be/${goodId}`],
    ["shorts", `https://youtube.com/shorts/${goodId}`],
    ["www shorts", `https://www.youtube.com/shorts/${goodId}`],
    ["m shorts", `http://m.youtube.com/shorts/${goodId}`],
    // THE SHAPE THIS QUEUE EXISTS FOR, and the one it refused until 2026-08-24. A kajian is usually
    // streamed before it is a recording, and YouTube hands out `/live/<id>` for exactly those — so
    // the first real paste an admin made was rejected with `invalid_url`, no D1 row, no queue row.
    ["live", `https://youtube.com/live/${goodId}`],
    ["www live", `https://www.youtube.com/live/${goodId}`],
    ["m live", `http://m.youtube.com/live/${goodId}`],
    ["live with a share param", `https://www.youtube.com/live/${goodId}?si=xYz123`],
    ["embed", `https://www.youtube.com/embed/${goodId}`],
    // Same video, same id, different front door — what the YouTube Music app copies.
    ["music host", `https://music.youtube.com/watch?v=${goodId}`],
  ])("%s returns the 11-character video id", (_name, raw) => {
    expect(youTubeVideoId(raw)).toBe(goodId);
  });

  test("rejects a non-YouTube host", () => {
    expect(youTubeVideoId(`https://example.com/watch?v=${goodId}`)).toBeNull();
  });

  test("rejects a javascript URL", () => {
    expect(youTubeVideoId(`javascript:alert('${goodId}')`)).toBeNull();
  });

  test("rejects a data URL", () => {
    expect(youTubeVideoId(`data:text/plain,https://youtube.com/watch?v=${goodId}`)).toBeNull();
  });

  test("rejects a bare id with no URL around it", () => {
    expect(youTubeVideoId(goodId)).toBeNull();
  });

  test("rejects an embed URL carrying path traversal", () => {
    expect(youTubeVideoId(`https://www.youtube.com/embed/../watch?v=${goodId}`)).toBeNull();
  });

  test("rejects anything longer than 2048 characters before parsing", () => {
    const long = `https://www.youtube.com/watch?v=${goodId}&pad=${"a".repeat(2050)}`;
    expect(youTubeVideoId(long)).toBeNull();
  });

  // WIDENING THE SHAPES MUST NOT WIDEN WHAT COUNTS AS AN ID. Every accepted prefix runs the same
  // `YOUTUBE_ID` test as `?v=`, and these prove it rather than assert it — without them, admitting
  // `live` and `embed` would look identical to admitting `/live/<anything>`.
  test.each([["shorts"], ["live"], ["embed"]])("%s still refuses a malformed id", (prefix) => {
    expect(youTubeVideoId(`https://www.youtube.com/${prefix}/short`)).toBeNull();
    expect(youTubeVideoId(`https://www.youtube.com/${prefix}/way-too-long-to-be-an-id`)).toBeNull();
    expect(youTubeVideoId(`https://www.youtube.com/${prefix}/has.a.dot!`)).toBeNull();
  });

  test("a prefix that is not a video shape is still refused", () => {
    // A channel page and a playlist are the two things an admin is most likely to paste BY MISTAKE,
    // and neither is a video. They must stay refused, or the runner receives a job it cannot fetch.
    expect(youTubeVideoId("https://www.youtube.com/@SomeChannel/videos")).toBeNull();
    expect(youTubeVideoId("https://www.youtube.com/playlist?list=PL1234567890")).toBeNull();
    expect(youTubeVideoId(`https://www.youtube.com/live/${goodId}/extra`)).toBeNull();
  });
});

describe("enqueueKajianJob", () => {
  test("two enqueues of the same video perform exactly one stored write and return the first row on conflict", async () => {
    const db = new CountingDb();
    const first = await enqueueKajianJob(
      db,
      "AbCdEf123_-",
      "https://www.youtube.com/watch?v=AbCdEf123_-",
      "admin@example.com",
      1000,
    );
    const second = await enqueueKajianJob(
      db,
      "AbCdEf123_-",
      "https://youtu.be/AbCdEf123_-",
      "other@example.com",
      2000,
    );

    // Narrowed rather than asserted away: a rate-limited outcome here would be a real failure, not
    // a typing inconvenience, so the test says so before reading the fields.
    if ("error" in first || "error" in second) throw new Error("unexpected rate limit in the conflict test");

    expect(db.writeCount).toBe(1);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.job).toEqual(first.job);
    expect(second.job.url).toBe("https://www.youtube.com/watch?v=AbCdEf123_-");
    expect(second.job.requestedBy).toBe("admin@example.com");
    expect(second.job.createdAt).toBe(1000);
    expect(second.job.updatedAt).toBe(1000);
  });

  test("throws loudly if D1 hands back a malformed row after enqueue", async () => {
    const db = new CountingDb();
    db.rows.set("AbCdEf123_-", {
      id: "job-1",
      videoId: "bad",
      url: "https://www.youtube.com/watch?v=AbCdEf123_-",
      status: "queued",
      requestedBy: "admin@example.com",
      createdAt: 1000,
      updatedAt: 1000,
      error: null,
    });

    await expect(
      enqueueKajianJob(
        db,
        "AbCdEf123_-",
        "https://www.youtube.com/watch?v=AbCdEf123_-",
        "admin@example.com",
        1000,
      ),
    ).rejects.toThrow("failed validation");
  });
});

describe("listKajianJobs", () => {
  test("returns newest jobs first and passes the requested limit into D1", async () => {
    const db = new CountingDb();
    db.rows.set("AbCdEf123_-", {
      id: "job-1",
      videoId: "AbCdEf123_-",
      url: "https://www.youtube.com/watch?v=AbCdEf123_-",
      status: "queued",
      requestedBy: "admin1@example.com",
      createdAt: 1000,
      updatedAt: 1000,
      error: null,
    });
    db.rows.set("ZyXwVu98765", {
      id: "job-2",
      videoId: "ZyXwVu98765",
      url: "https://youtu.be/ZyXwVu98765",
      status: "running",
      requestedBy: "admin2@example.com",
      createdAt: 3000,
      updatedAt: 3001,
      error: null,
    });
    db.rows.set("LmNoPq43210", {
      id: "job-3",
      videoId: "LmNoPq43210",
      url: "https://youtube.com/shorts/LmNoPq43210",
      status: "failed",
      requestedBy: "admin3@example.com",
      createdAt: 2000,
      updatedAt: 2005,
      error: "transcript missing",
    });

    const jobs = await listKajianJobs(db, 2);

    expect(db.lastListLimit).toBe(2);
    expect(jobs.map((job) => job.videoId)).toEqual(["ZyXwVu98765", "LmNoPq43210"]);
  });

  test("drops malformed rows instead of returning unchecked D1 data", async () => {
    const db = new CountingDb();
    db.rows.set("AbCdEf123_-", {
      id: "job-1",
      videoId: "AbCdEf123_-",
      url: "https://www.youtube.com/watch?v=AbCdEf123_-",
      status: "queued",
      requestedBy: "admin@example.com",
      createdAt: 1000,
      updatedAt: 1000,
      error: null,
    });
    db.rows.set("bad-row", {
      id: "job-2",
      videoId: "bad-row",
      url: "https://www.youtube.com/watch?v=AbCdEf123_-",
      status: "queued",
      requestedBy: "admin@example.com",
      createdAt: 2000,
      updatedAt: 2000,
      error: null,
    });

    const jobs = await listKajianJobs(db, 10);

    expect(jobs.map((job) => job.id)).toEqual(["job-1"]);
  });
});

/**
 * ── THE COST CEILING (Erik, 2026-08-23: five jobs per rolling day) ──────────────────────────────
 *
 * This is the only open item on this endpoint that can cost real money, so the tests are about the
 * two ways a cap goes wrong: it fails OPEN when it should refuse, or it charges for work that never
 * happened. Every id below is a distinct valid video id, because a repeat would be deduplicated and
 * would prove the wrong thing.
 */
const ids = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `vid${String(i).padStart(8, "0")}`);

async function enqueueAt(db: CountingDb, videoId: string, at: number) {
  return enqueueKajianJob(db, videoId, `https://youtu.be/${videoId}`, "admin@example.com", at);
}

describe("the per-day job cap", () => {
  test("admits exactly MAX_JOBS_PER_DAY and refuses the next", async () => {
    const db = new CountingDb();
    const list = ids(MAX_JOBS_PER_DAY + 1);

    for (const id of list.slice(0, MAX_JOBS_PER_DAY)) {
      expect("error" in (await enqueueAt(db, id, 1_000))).toBe(false);
    }
    const overflow = await enqueueAt(db, list[MAX_JOBS_PER_DAY]!, 1_000);

    // Asserted from the exported constant, so changing the ceiling cannot leave this passing while
    // testing a number nobody ships.
    expect("error" in overflow && overflow.error).toBe("rate_limited");
    expect(db.writeCount).toBe(MAX_JOBS_PER_DAY);
  });

  test("a REPEAT of an already-queued video does not consume the allowance", async () => {
    const db = new CountingDb();
    const list = ids(MAX_JOBS_PER_DAY);
    for (const id of list) await enqueueAt(db, id, 1_000);

    // The same video again: deduplicated, does no work, and must not be charged for. If it were,
    // an admin clicking twice would burn a day's budget on one lecture.
    const again = await enqueueAt(db, list[0]!, 2_000);

    expect("error" in again).toBe(false);
    expect("error" in again ? null : again.created).toBe(false);
    expect(db.writeCount).toBe(MAX_JOBS_PER_DAY);
  });

  test("the window ROLLS — a job just over 24h old no longer counts", async () => {
    const db = new CountingDb();
    const day = 24 * 60 * 60 * 1000;
    const list = ids(MAX_JOBS_PER_DAY + 1);
    for (const id of list.slice(0, MAX_JOBS_PER_DAY)) await enqueueAt(db, id, 1_000);

    // One millisecond past the window. A calendar day would let the ceiling be doubled either side
    // of local midnight; a rolling one cannot.
    const later = await enqueueAt(db, list[MAX_JOBS_PER_DAY]!, 1_000 + day + 1);

    expect("error" in later).toBe(false);
  });

  test("a job exactly AT the window edge still counts", async () => {
    const db = new CountingDb();
    const day = 24 * 60 * 60 * 1000;
    const list = ids(MAX_JOBS_PER_DAY + 1);
    for (const id of list.slice(0, MAX_JOBS_PER_DAY)) await enqueueAt(db, id, 1_000);

    const atEdge = await enqueueAt(db, list[MAX_JOBS_PER_DAY]!, 1_000 + day);

    expect("error" in atEdge && atEdge.error).toBe("rate_limited");
  });

  test("a count D1 cannot answer THROWS rather than reading as zero", async () => {
    // Zero would open the gate on exactly the reading that failed. For a spending limit that is the
    // wrong direction to fail in, so the refusal is loud.
    const db = new CountingDb();
    db.breakCount = true;
    await expect(enqueueAt(db, "vid00000000", 1_000)).rejects.toThrow();
  });
});
