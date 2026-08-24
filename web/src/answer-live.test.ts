import { afterEach, describe, expect, test } from "bun:test";
import { AnswerBlockedError, liveAnswerModel } from "./answer-live.ts";
import type { AnswerContext } from "./answer-contract.ts";

const ctx: AnswerContext = { question: "apa hukum riba", verses: [], entries: [], weakVerses: false };

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Serve one `/api/answer` body, exactly as the Worker would. */
const serve = (body: unknown) => {
  // `as unknown as` rather than `as typeof fetch`: Bun's lib types put a `preconnect` property on the
  // global, and a bare cast is a compile error. Nothing under test touches it.
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))) as unknown as typeof fetch;
};

const blockedBy = async (body: unknown): Promise<AnswerBlockedError> => {
  serve(body);
  try {
    await liveAnswerModel(ctx);
  } catch (err) {
    if (err instanceof AnswerBlockedError) return err;
    throw new Error(`expected AnswerBlockedError, got ${String(err)}`);
  }
  throw new Error("expected a throw");
};

describe("liveAnswerModel — the terminal reason survives the parse boundary", () => {
  // THE FIELD WAS ON THE WIRE AND UNREAD. `gen` has shipped on every `/api/answer` response since
  // ISC-532 (2026-08-18) and reached prod 2026-08-23, while the response type here named three keys
  // and dropped it — the same shape as the `wall-live-probe` blindness already recorded: an
  // instrument missing the one field it was cited for.
  test("a genuine guard refusal arrives as terminal `blocked`", async () => {
    const err = await blockedBy({ answer: null, blocked: "fatwa", gen: { reason: "blocked", attempts: [] } });
    expect(err.by).toBe("fatwa");
    expect(err.terminal).toBe("blocked");
  });

  test("a timed-out turn keeps its STALE verdict but reports terminal `deadline`", async () => {
    // The pair measured live 2026-08-19, 2 of 21 grounded turns: `verdictAfterFailure` preserves
    // attempt 1's guard verdict when attempt 2 throws on the deadline, so `blocked` names a rule
    // while `gen.reason` names the clock. Both must arrive; only the second may be spoken.
    const err = await blockedBy({ answer: null, blocked: "own_wording", gen: { reason: "deadline", attempts: [] } });
    expect(err.by).toBe("own_wording");
    expect(err.terminal).toBe("deadline");
  });
});

describe("liveAnswerModel — an unreadable report is cannot-tell, never a claim", () => {
  // Each of these is a Worker this build cannot interrogate. `null` is the only honest value, and
  // `annotateWithheld` turns `null` into silence — so a degraded wire degrades to the OLD behaviour
  // rather than to a sentence about a withheld answer.
  const unreadable: [string, unknown][] = [
    ["no gen key at all (a Worker older than ISC-532)", { answer: null, blocked: "fatwa" }],
    ["gen present but null", { answer: null, blocked: "fatwa", gen: null }],
    ["gen is not an object", { answer: null, blocked: "fatwa", gen: "blocked" }],
    ["reason is a token this build does not know", { answer: null, blocked: "fatwa", gen: { reason: "abandoned" } }],
    ["reason is not a string", { answer: null, blocked: "fatwa", gen: { reason: 3 } }],
    ["reason is missing from an otherwise real report", { answer: null, blocked: "fatwa", gen: { attempts: [] } }],
  ];
  for (const [name, body] of unreadable) {
    test(name, async () => {
      const err = await blockedBy(body);
      expect(err.by).toBe("fatwa");
      expect(err.terminal).toBeNull();
    });
  }
});

describe("liveAnswerModel — reading gen changed nothing else", () => {
  test("an absence is still an absence, not a refusal", async () => {
    // The load-bearing negative that predates this change: a body with no `blocked` field must stay
    // an anonymous absence even when `gen` says the turn ended on the clock.
    serve({ answer: null, gen: { reason: "deadline", attempts: [] } });
    await expect(liveAnswerModel(ctx)).rejects.toThrow("no answer");
  });

  test("a real answer is returned with `gen` ignored entirely", async () => {
    serve({ answer: "Riba dilarang dalam Al-Qur'an.", hadith: [], gen: { reason: "answered", attempts: [] } });
    expect(await liveAnswerModel(ctx)).toEqual({ prose: "Riba dilarang dalam Al-Qur'an.", hadith: [] });
  });
});
