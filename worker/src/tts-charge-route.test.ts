/**
 * REACHABILITY of the TTS ceiling, not its arithmetic.
 *
 * `tts-ledger.test.ts` proves `chargeTtsRunD1` counts and refuses correctly. It would stay green if
 * the route were never wired — which is exactly how a copy channel in this repo stayed green for six
 * days over a path nothing could reach. So every arm here goes through the real `worker.fetch`, over
 * a REAL sqlite database running the REAL migration, and asserts on the status the runner would
 * actually receive.
 *
 * ⚠️ THE CONTROL ARM IS MANDATORY. A 403 on this prefix says something about `isRunner` and NOTHING
 * about the ledger — the gate runs before the handler — so a test that only checks the refusal would
 * pass with the route deleted.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import worker, { type Env } from "./index.ts";
import type { D1Database, D1PreparedStatement } from "./store.ts";
import { TTS_RUNS_PER_DAY } from "./tts-ledger.ts";

const SECRET = "s".repeat(48);

function d1(db: Database): D1Database {
  return {
    prepare(sql: string): D1PreparedStatement {
      let args: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          args = values;
          return stmt;
        },
        async run() {
          // `meta.changes` is not decoration: `chargeTtsRunD1` reads it to tell an INSERT that
          // inserted from one `OR IGNORE` swallowed. A façade that omitted it would report every
          // charge as un-charged and the idempotence tests would pass for the wrong reason.
          const { changes } = db.query(sql).run(...(args as never[]));
          return { meta: { changes } };
        },
        async all<T>() {
          return { results: db.query(sql).all(...(args as never[])) as T[], success: true };
        },
        async first<T>() {
          return (db.query(sql).get(...(args as never[])) as T) ?? null;
        },
      };
      return stmt;
    },
    async batch() {
      throw new Error("not used");
    },
  };
}

let sqlite: Database;
let env: Env;

beforeEach(async () => {
  sqlite = new Database(":memory:");
  sqlite.run(await Bun.file("worker/migrations/0005_tts_runs.sql").text());
  env = { DB: d1(sqlite), RUNNER_SECRET: SECRET } as unknown as Env;
});

const charge = async (runId: unknown, auth: string = `Bearer ${SECRET}`): Promise<Response> =>
  worker.fetch(
    new Request("https://new-quranku.axiara.ai/api/runner/kajian/tts-charge", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    }),
    env,
    { waitUntil: () => {}, passThroughOnException: () => {} } as never,
  );

describe("POST /api/runner/kajian/tts-charge is reachable and it meters", () => {
  test("CONTROL — a wrong secret is 403, which proves the GATE and nothing about the ledger", async () => {
    const res = await charge("run-1", "Bearer wrong");
    expect(res.status).toBe(403);
    // …and it wrote nothing, so a 403 cannot be mistaken for a charge.
    expect(sqlite.query("SELECT COUNT(*) AS n FROM tts_runs").get()).toEqual({ n: 0 });
  });

  test("an authed charge reaches the ledger and comes back 200", async () => {
    const res = await charge("run-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, charged: true, used: 1, limit: TTS_RUNS_PER_DAY });
    expect(sqlite.query("SELECT COUNT(*) AS n FROM tts_runs").get()).toEqual({ n: 1 });
  });

  test("the second narration of the same run is 200 and NOT charged", async () => {
    await charge("run-1");
    const res = await charge("run-1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, charged: false, used: 1 });
  });

  test("a spent allowance is 429 — a ceiling, not an auth failure", async () => {
    for (let i = 1; i <= TTS_RUNS_PER_DAY; i += 1) expect((await charge(`run-${i}`)).status).toBe(200);
    const res = await charge("one-too-many");
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, error: "tts_ceiling", used: 30, limit: 30 });
  });

  test("a blank runId is refused rather than defaulted", async () => {
    // One blank id would collapse every run onto ONE ledger row: the first charges, and every run
    // after it for the rest of the day is "already charged" and spends free.
    expect((await charge("   ")).status).toBe(400);
    expect((await charge(null)).status).toBe(400);
    expect(sqlite.query("SELECT COUNT(*) AS n FROM tts_runs").get()).toEqual({ n: 0 });
  });

  test("GET is refused, like every route on this prefix", async () => {
    const res = await worker.fetch(
      new Request("https://new-quranku.axiara.ai/api/runner/kajian/tts-charge", {
        method: "GET",
        headers: { Authorization: `Bearer ${SECRET}` },
      }),
      env,
      { waitUntil: () => {}, passThroughOnException: () => {} } as never,
    );
    expect(res.status).toBe(405);
  });

  test("with D1 unbound the route is 503, and it does NOT pretend to have charged", async () => {
    env = { RUNNER_SECRET: SECRET } as unknown as Env;
    expect((await charge("run-1")).status).toBe(503);
  });
});
