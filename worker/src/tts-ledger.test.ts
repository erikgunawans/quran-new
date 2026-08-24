/**
 * The D1 TTS ledger — the ceiling that survives a hosted runner.
 *
 * Backed by a REAL SQLite database (`bun:sqlite`) running the REAL migration file, not by a mock of
 * D1. The whole reason this ledger exists is that a fake one enforced nothing: the file ledger was a
 * correct implementation of the wrong storage. A hand-written double would let the conditional INSERT
 * — the single statement that IS the gate — pass without SQLite ever evaluating it.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { TTS_RUNS_PER_DAY, chargeTtsRunD1, jakartaDayKey } from "./tts-ledger.ts";
import type { D1Database, D1PreparedStatement } from "./store.ts";

/** A D1-shaped façade over bun:sqlite. Only the three methods this module uses. */
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
          db.query(sql).run(...(args as never[]));
          return {};
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

let db: Database;
let store: D1Database;

beforeEach(async () => {
  db = new Database(":memory:");
  db.run(await Bun.file("worker/migrations/0005_tts_runs.sql").text());
  store = d1(db);
});

/** 2026-08-25, 03:00 Jakarta — deliberately a time that is the PREVIOUS day in UTC. */
const NIGHT = new Date("2026-08-24T20:00:00Z");

describe("jakartaDayKey — Erik works nights, so the boundary is his midnight", () => {
  test("20:00 UTC is already the next day in Jakarta", () => {
    expect(jakartaDayKey(NIGHT)).toBe("2026-08-25");
    // The mutation: a UTC key would say 2026-08-24 and split one sitting across two allowances.
    expect(NIGHT.toISOString().slice(0, 10)).toBe("2026-08-24");
  });

  test("it pads to YYYY-MM-DD", () => {
    expect(jakartaDayKey(new Date("2026-01-05T02:00:00Z"))).toBe("2026-01-05");
  });
});

describe("the ceiling", () => {
  test("a fresh day allows the first run and counts it", async () => {
    const v = await chargeTtsRunD1(store, "run-1", NIGHT);
    expect(v).toMatchObject({ allowed: true, charged: true, used: 1, limit: TTS_RUNS_PER_DAY, day: "2026-08-25" });
  });

  test("the SECOND narration of the same run is allowed and NOT charged", async () => {
    await chargeTtsRunD1(store, "run-1", NIGHT);
    const again = await chargeTtsRunD1(store, "run-1", new Date(NIGHT.getTime() + 60_000));
    expect(again.allowed).toBe(true);
    expect(again.charged).toBe(false);
    expect(again.used).toBe(1);
  });

  test("run 31 is refused, and the refusal names the numbers", async () => {
    for (let i = 1; i <= TTS_RUNS_PER_DAY; i += 1) {
      const v = await chargeTtsRunD1(store, `run-${i}`, NIGHT);
      expect(v.allowed).toBe(true);
    }
    const over = await chargeTtsRunD1(store, "run-31", NIGHT);
    expect(over).toMatchObject({ allowed: false, charged: false, used: 30, limit: 30, day: "2026-08-25" });
    // …and it wrote nothing: a refused run must not consume a slot it was denied.
    expect(db.query("SELECT COUNT(*) AS n FROM tts_runs").get()).toEqual({ n: 30 });
  });

  test("the second narration of run 30 survives the FULL day — the idempotency that matters", async () => {
    // This is the case the file ledger's header calls out: charging twice halves Erik's ceiling, and
    // refusing the second leaves a run with a long script and no short one.
    for (let i = 1; i <= TTS_RUNS_PER_DAY; i += 1) await chargeTtsRunD1(store, `run-${i}`, NIGHT);
    const second = await chargeTtsRunD1(store, `run-${TTS_RUNS_PER_DAY}`, new Date(NIGHT.getTime() + 5_000));
    expect(second.allowed).toBe(true);
    expect(second.charged).toBe(false);
  });

  test("the allowance rolls at Jakarta midnight, not at the UTC one", async () => {
    for (let i = 1; i <= TTS_RUNS_PER_DAY; i += 1) await chargeTtsRunD1(store, `run-${i}`, NIGHT);
    expect((await chargeTtsRunD1(store, "next", NIGHT)).allowed).toBe(false);
    // 18:00 UTC the following day = 01:00 Jakarta on 2026-08-26.
    const tomorrow = new Date("2026-08-25T18:00:00Z");
    const v = await chargeTtsRunD1(store, "next", tomorrow);
    expect(v).toMatchObject({ allowed: true, charged: true, used: 1, day: "2026-08-26" });
  });

  test("a run charged on one day does not carry its charge into the next", async () => {
    await chargeTtsRunD1(store, "run-1", NIGHT);
    const v = await chargeTtsRunD1(store, "run-1", new Date("2026-08-25T18:00:00Z"));
    expect(v.charged).toBe(true);
    expect(v.used).toBe(1);
  });

  test("the limit is a parameter, so the gate can be forced RED", async () => {
    // A ceiling test that can only ever pass at 30 is a slow test, not a proof. At a limit of 1 the
    // second run must be refused — if it is not, the WHERE clause is not doing the gating.
    expect((await chargeTtsRunD1(store, "a", NIGHT, 1)).allowed).toBe(true);
    expect((await chargeTtsRunD1(store, "b", NIGHT, 1)).allowed).toBe(false);
  });
});
