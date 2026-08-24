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
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TTS_RUNS_PER_DAY, chargeTtsRun, dayKey } from "./kajian-budget.ts";

const ledger = (): string => join(mkdtempSync(join(tmpdir(), "tts-budget-")), "ledger.json");
const at = (iso: string): Date => new Date(iso);

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
