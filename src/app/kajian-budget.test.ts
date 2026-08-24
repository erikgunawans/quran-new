/**
 * The TTS daily ceiling — 30 runs/day, Erik 2026-08-24.
 *
 * WHAT THESE TESTS ARE FOR. A spend ceiling is the one kind of guard whose failure costs real money,
 * and this repo has a standing rule that a guard which cannot be shown to FIRE is not a guard. So the
 * refusal is exercised directly, the idempotence is exercised at the boundary (the day's LAST slot,
 * where a double charge would be indistinguishable from working), and the day roll is exercised with
 * an explicit clock rather than by waiting.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TTS_RUNS_PER_DAY, chargeTtsRun, chargeTtsRunFor, dayKey } from "./kajian-budget.ts";

const ledger = (): string => join(mkdtempSync(join(tmpdir(), "tts-budget-")), "ledger.json");
const at = (iso: string): Date => new Date(iso);

/**
 * Swap in a fetch stub without losing the parts of `typeof fetch` nobody here calls.
 * A bare `as typeof fetch` on an arrow function does not typecheck — `preconnect` is missing — and
 * casting through `unknown` would hide a real mismatch rather than satisfy one.
 */
const stubFetch = (fn: (url: string, init: RequestInit) => Promise<Response>): typeof fetch =>
  Object.assign(fn as unknown as typeof fetch, { preconnect: globalThis.fetch.preconnect });


describe("the daily run ceiling", () => {
  test("charges one slot per distinct run", () => {
    const p = ledger();
    expect(chargeTtsRun("vid-a:1", at("2026-08-24T10:00:00"), p)).toMatchObject({ charged: true, used: 1 });
    expect(chargeTtsRun("vid-b:2", at("2026-08-24T10:05:00"), p)).toMatchObject({ charged: true, used: 2 });
  });

  /**
   * THE SECOND NARRATION OF THE SAME RUN. `kajian.ts` calls `narrateToWav` twice — long, then short —
   * with one `runId`. Charging both would halve the ceiling Erik set; refusing the second on a full
   * day would leave a run with a long script and no short one. Tested AT the boundary, because in the
   * middle of the day a double charge looks exactly like working.
   */
  test("the same run is not charged twice, even on the day's last slot", () => {
    const p = ledger();
    for (let i = 0; i < TTS_RUNS_PER_DAY; i += 1) {
      chargeTtsRun(`run-${i}`, at("2026-08-24T09:00:00"), p);
    }
    const second = chargeTtsRun(`run-${TTS_RUNS_PER_DAY - 1}`, at("2026-08-24T09:30:00"), p);
    expect(second).toMatchObject({ charged: false, used: TTS_RUNS_PER_DAY });
  });

  test("refuses run 31 and names the ceiling", () => {
    const p = ledger();
    for (let i = 0; i < TTS_RUNS_PER_DAY; i += 1) chargeTtsRun(`run-${i}`, at("2026-08-24T09:00:00"), p);
    expect(() => chargeTtsRun("one-too-many", at("2026-08-24T23:59:00"), p)).toThrow(
      /daily ceiling reached: 30\/30/,
    );
  });

  test("a new local day resets the allowance", () => {
    const p = ledger();
    for (let i = 0; i < TTS_RUNS_PER_DAY; i += 1) chargeTtsRun(`run-${i}`, at("2026-08-24T09:00:00"), p);
    expect(() => chargeTtsRun("blocked", at("2026-08-24T23:59:00"), p)).toThrow();
    expect(chargeTtsRun("fresh", at("2026-08-25T00:01:00"), p)).toMatchObject({ charged: true, used: 1 });
  });

  /**
   * The boundary is LOCAL, not UTC. A UTC roll lands at 07:00 in Asia/Jakarta — the middle of a
   * working morning — and Erik works nights, so a UTC day would split one sitting across two
   * allowances. Asserted against the runtime's own local rendering rather than a hardcoded string,
   * so this test does not itself depend on the machine's zone.
   */
  test("the day boundary is local midnight", () => {
    const late = at("2026-08-24T23:30:00");
    const early = at("2026-08-25T00:30:00");
    expect(dayKey(late)).not.toBe(dayKey(early));
    expect(dayKey(at("2026-08-24T00:10:00"))).toBe(dayKey(late));
  });

  /**
   * A corrupt ledger must RESET, never block. The failure mode of throwing here is a pipeline that
   * cannot run at all because of a stray byte in a bookkeeping file — a spend ceiling that becomes
   * an outage.
   */
  test("a corrupt ledger resets rather than blocking", () => {
    const p = ledger();
    writeFileSync(p, "{ not json");
    expect(chargeTtsRun("after-corruption", at("2026-08-24T10:00:00"), p)).toMatchObject({
      charged: true,
      used: 1,
    });
  });

  test("an empty runId is refused outright", () => {
    expect(() => chargeTtsRun("  ", at("2026-08-24T10:00:00"), ledger())).toThrow(/must not be empty/);
  });
});

/**
 * THE SWITCH — which ledger a process actually charges against.
 *
 * This is the part that decides whether the ceiling exists at all on a hosted runner. The file ledger
 * is a correct implementation of the WRONG storage there: a fresh filesystem per execution means it
 * reads an empty day every time, charges slot 1 of 30, prints `1/30`, and never refuses anything.
 */
describe("chargeTtsRunFor — the file ledger is not a ceiling on a host with no disk", () => {
  const remoteEnv = { QK_BASE_URL: "https://example.test", QK_RUNNER_SECRET: "s3cret" };

  test("with NEITHER credential set it charges the local file — today's behaviour, unchanged", async () => {
    const p = ledger();
    const v = await chargeTtsRunFor("run-local", {}, p);
    expect(v).toMatchObject({ charged: true, used: 1, limit: TTS_RUNS_PER_DAY });
    expect(JSON.parse(readFileSync(p, "utf8")).runs).toEqual(["run-local"]);
  });

  test("with only ONE credential set it still charges locally", async () => {
    // Half-configured is not hosted. A runner with a URL and no secret cannot claim a job either, so
    // it is not about to spend anything — and silently reaching for a remote ledger it cannot
    // authenticate against would turn a config mistake into an outage.
    const p = ledger();
    expect((await chargeTtsRunFor("a", { QK_BASE_URL: "https://example.test" }, p)).charged).toBe(true);
    expect((await chargeTtsRunFor("b", { QK_RUNNER_SECRET: "s" }, p)).charged).toBe(true);
  });

  test("with BOTH set it charges the WORKER and never touches the file", async () => {
    const p = ledger();
    const calls: { url: string; auth: string | null; body: unknown }[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = stubFetch(async (url: string, init: RequestInit) => {
      calls.push({
        url: String(url),
        auth: new Headers(init.headers).get("authorization"),
        body: JSON.parse(String(init.body)),
      });
      return new Response(JSON.stringify({ ok: true, charged: true, used: 4, limit: 30, day: "2026-08-25" }));
    });
    try {
      const v = await chargeTtsRunFor("run-hosted", remoteEnv, p);
      expect(v).toEqual({ charged: true, used: 4, limit: 30 });
    } finally {
      globalThis.fetch = real;
    }
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://example.test/api/runner/kajian/tts-charge");
    expect(calls[0]?.auth).toBe("Bearer s3cret");
    expect(calls[0]?.body).toEqual({ runId: "run-hosted" });
    // The file ledger must not have been written — two ledgers disagreeing is worse than one.
    expect(existsSync(p)).toBe(false);
  });

  test("a 429 throws, and the message names the ceiling and the day", async () => {
    const real = globalThis.fetch;
    globalThis.fetch = stubFetch(async () =>
      new Response(JSON.stringify({ ok: false, error: "tts_ceiling", used: 30, limit: 30, day: "2026-08-25" }), {
        status: 429,
      }));
    try {
      await expect(chargeTtsRunFor("over", remoteEnv, ledger())).rejects.toThrow(/30\/30 runs already spent on 2026-08-25/);
    } finally {
      globalThis.fetch = real;
    }
  });

  /**
   * FAIL CLOSED. A ceiling that shrugs when it cannot reach its ledger is not a ceiling — and the
   * tempting alternative (fall back to the file) is exactly the hole this whole change closes, since
   * on a hosted runner that file is always empty.
   */
  test("an unreachable ledger REFUSES the spend rather than falling back to the file", async () => {
    const p = ledger();
    const real = globalThis.fetch;
    globalThis.fetch = stubFetch(async () => new Response("nope", { status: 500 }));
    try {
      await expect(chargeTtsRunFor("run-x", remoteEnv, p)).rejects.toThrow(/refusing to spend without a ledger/);
    } finally {
      globalThis.fetch = real;
    }
    expect(existsSync(p)).toBe(false);
  });

  test("a ledger failure is not reported as a ceiling", async () => {
    // The two send an operator to different places: one waits for midnight, the other looks at the
    // Worker. A message that conflates them costs a night.
    const real = globalThis.fetch;
    globalThis.fetch = stubFetch(async () => new Response("{}", { status: 503 }));
    try {
      // Captured rather than asserted with `.not.toThrow`, which passes for a message that merely
      // fails to match and cannot distinguish that from no rejection at all.
      const err = await chargeTtsRunFor("run-y", remoteEnv, ledger()).then(
        () => null,
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      );
      expect(err).toContain("unreachable");
      expect(err).not.toContain("ceiling reached");
    } finally {
      globalThis.fetch = real;
    }
  });
});
