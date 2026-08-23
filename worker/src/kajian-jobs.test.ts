import { describe, expect, test } from "bun:test";
import { enqueueKajianJob, listKajianJobs, youTubeVideoId } from "./kajian-jobs.ts";
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
