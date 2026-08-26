import { afterEach, describe, expect, test } from "bun:test";
import { liveThemeModel, CLASSIFY_TIMEOUT_MS, isClassifyTimeout } from "./theme-live.ts";

const ctx = { question: "ngerasa Tuhan udah nyerah sama aku", themes: ["Forgiveness & despair", "Trust in God"] };
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(status: number, payload: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("liveThemeModel", () => {
  test("returns the themes the Worker classified", async () => {
    stubFetch(200, { themes: ["Forgiveness & despair"] });
    expect(await liveThemeModel(ctx)).toEqual(["Forgiveness & despair"]);
  });

  test("throws when the endpoint is not there yet (404) → caller keeps the lexicon", async () => {
    stubFetch(404, { error: "not found" });
    await expect(liveThemeModel(ctx)).rejects.toThrow();
  });

  test("throws when the shape is wrong → caller keeps the lexicon", async () => {
    stubFetch(200, { oops: true });
    await expect(liveThemeModel(ctx)).rejects.toThrow();
  });
});

// ── ISC-658: the cap, and telling an abort apart from an honest empty ──────────────────────────

describe("the classifier's timeout cap", () => {
  test("is exported rather than a bare literal, so nothing can test a copy of it", () => {
    // A number duplicated into a probe or a doc drifts from the one the browser actually uses, and
    // the copy is what gets asserted on. One binding, imported everywhere.
    expect(typeof CLASSIFY_TIMEOUT_MS).toBe("number");
  });

  test("sits ABOVE the measured latency distribution, not inside it", async () => {
    // Measured against prod 2026-08-26, eight consecutive runs of `bolehkah aku pacaran`:
    // 0.93 1.04 1.47 2.41 2.60 2.64 2.68 3.36 s. At 3000 the last one was discarded and six of the
    // rest sat within 600 ms of the cap. Erik ruled 5000 on 2026-08-26.
    expect(CLASSIFY_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
  });
});

describe("an abort is not an empty result", () => {
  test("a timed-out classify throws an error that IDENTIFIES itself as a timeout", async () => {
    // This is the whole defect. `{themes: []}` is produced by an abort, by a thrown call, by a
    // guard drop and by an honest 'nothing matched' alike — so three cycles of probe output could
    // not tell a degraded classifier from a working one. The caller still falls back either way;
    // what changes is that the failure can now be COUNTED.
    globalThis.fetch = (async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    }) as unknown as typeof fetch;
    await expect(liveThemeModel(ctx)).rejects.toThrow(/timed out/i);
    expect(isClassifyTimeout(await liveThemeModel(ctx).catch((e) => e))).toBe(true);
  });

  test("a NON-timeout failure is not reported as a timeout", async () => {
    // The control arm. A predicate that answers true for every failure measures nothing — the same
    // shape as the runner's `signalCode !== null`, which reported every death as a timeout.
    stubFetch(500, { error: "boom" });
    expect(isClassifyTimeout(await liveThemeModel(ctx).catch((e) => e))).toBe(false);
  });
});
