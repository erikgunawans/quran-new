/**
 * The retry policy for /api/answer, and the shared budget that makes a second generation affordable.
 *
 * WHY THIS FILE EXISTS AT ALL. The policy used to be two lines inside `handleAnswer` — a `for` loop
 * and `if (blocked === "bad_hadith") break;` — and nothing could test either, because the loop is
 * wrapped around a live `fetch` in a Worker-only module with no seam. It was changed twice on
 * reasoning alone. It is a pure function now so the next change has to survive a red test.
 */
import { describe, expect, it } from "bun:test";
import { MIN_RETRY_MS, MAX_ATTEMPTS, nextAttemptBudget, verdictAfterFailure } from "./answer-retry.ts";
import { MODEL_DEADLINE_MS } from "./providers.ts";

describe("the first attempt", () => {
  it("always runs, and gets whatever the turn has left", () => {
    expect(nextAttemptBudget({ attempt: 0, blocked: null, remainingMs: MODEL_DEADLINE_MS })).toBe(MODEL_DEADLINE_MS);
  });

  it("does not run when the turn has already spent its budget", () => {
    expect(nextAttemptBudget({ attempt: 0, blocked: null, remainingMs: 0 })).toBeNull();
    expect(nextAttemptBudget({ attempt: 0, blocked: null, remainingMs: -1_200 })).toBeNull();
  });
});

describe("a second generation on bad_hadith", () => {
  /**
   * THE MEASUREMENT THAT OPENED THIS, kept here because the next reader will want to revert it.
   *
   * The break was justified by DETERMINISM: the first attempt already had the hadith and the marker
   * syntax, so a `bad_hadith` verdict supposedly meant the model would fail identically twice.
   * Measured 2026-08-16 across 25 live eligible turns on prod, 10 distinct questions: `bad_hadith`
   * fired on 12 of 25 (48%), and the SAME question with identical grounding produced both outcomes —
   * `apakah sedekah boleh diungkit ungkit` went bad, bad, ok, bad, ok. It is variance, not a property
   * of the turn, which is exactly the case a retry exists for.
   */
  it("is granted, where it used to be refused outright", () => {
    expect(nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: 18_000 })).toBe(18_000);
  });

  it("is granted on the same terms as any other guard reject", () => {
    const hadith = nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: 12_000 });
    const arabic = nextAttemptBudget({ attempt: 1, blocked: "arabic", remainingMs: 12_000 });
    expect(hadith).toBe(arabic);
  });
});

describe("the budget is shared across the turn, not per call", () => {
  /**
   * `callChatModel` defaults to a FRESH `AbortSignal.timeout(MODEL_DEADLINE_MS)` on every call, and
   * `handleAnswer` passed no `deadlineMs` — so before this, two attempts could spend 25 s each while
   * the client's `TIMEOUT_MS` backstop sits at 30 s. The second answer would be generated, paid for,
   * and then discarded by a browser that had already given up: the exact failure ISC-466 closed.
   * Single generations were already measured at 26.7 / 27.4 / 28.0 / 31.1 s on 2026-08-16.
   */
  it("gives the retry what is LEFT, never a fresh deadline", () => {
    // 14_000 rather than the original 9_400 only because `MIN_RETRY_MS` rose to 11_500 on the
    // 2026-08-19 distribution. This test is about pass-through, not about the floor: the figure just
    // has to clear the floor and sit under the deadline, and 9_400 no longer does the first.
    const budget = nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: 14_000 });
    expect(budget).toBe(14_000);
    expect(budget!).toBeLessThan(MODEL_DEADLINE_MS);
  });

  it("refuses a retry that cannot plausibly finish", () => {
    // A verbose hadith generation measures ~6 s. Handed less than that, a retry cannot produce an
    // answer — it can only make the reader wait longer for the same refusal, and bill for it.
    expect(nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: MIN_RETRY_MS - 1 })).toBeNull();
    expect(nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: MIN_RETRY_MS })).toBe(MIN_RETRY_MS);
  });

  it("holds the floor against the first attempt too — but only the floor, not the run", () => {
    // Attempt 0 is not bound by MIN_RETRY_MS: a turn with 3 s left should still TRY, because the
    // alternative is a guaranteed null. Only a retry is a spend with an alternative.
    expect(nextAttemptBudget({ attempt: 0, blocked: null, remainingMs: 3_000 })).toBe(3_000);
  });
});

describe("a verdict, once earned, is never downgraded to silence", () => {
  /**
   * MEASURED ON PROD 2026-08-16, immediately after the retry shipped. `bad_hadith` fell from 12/25
   * to 2/25 exactly as predicted — and `{answer:null}` rose from 2/25 to 7/25, every one of the new
   * ones at a wall of ~26 s. That is the turn budget expiring inside the SECOND attempt, and the
   * `catch` around the generation loop was returning a bare `{answer:null}`: the verdict the FIRST
   * attempt had already earned was thrown away with it.
   *
   * The two are not interchangeable copy. `blocked` renders as "I found an answer and am holding it
   * back"; a bare null renders as "I found no matching verse". Substituting the second for the first
   * tells the reader the corpus is empty when the app is actually refusing — the precise confusion
   * the `blocked` channel was introduced to end.
   */
  it("survives a model failure on a later attempt", () => {
    expect(verdictAfterFailure("bad_hadith")).toBe("bad_hadith");
    expect(verdictAfterFailure("fatwa")).toBe("fatwa");
  });

  it("does not invent one when no candidate was ever refused", () => {
    // Attempt 1 threw outright: nothing was generated, so nothing was refused. That turn is a
    // genuine absence and must keep saying so.
    expect(verdictAfterFailure(null)).toBeNull();
  });
});

describe("the turn ends", () => {
  it("after MAX_ATTEMPTS, however much budget is left", () => {
    expect(nextAttemptBudget({ attempt: MAX_ATTEMPTS, blocked: "bad_hadith", remainingMs: 24_000 })).toBeNull();
  });

  it("with no third generation, which is what bounds the cost of opening the retry", () => {
    expect(MAX_ATTEMPTS).toBe(2);
  });
});
