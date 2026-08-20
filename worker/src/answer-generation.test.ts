/**
 * The generation diagnostic for `/api/answer`: what each attempt spent, and why the turn ended.
 *
 * WHY THIS FILE EXISTS AT ALL. ISC-487 is blocked on telling three reader-visible events apart:
 * a real refusal, a retry that died on the clock, and an upstream throw. Before the loop had a seam
 * they all lived inline in `handleAnswer`, wrapped around a live model call, so nothing could pin
 * their distinctions. These tests keep the measurement honest and the control flow unchanged.
 */
import { describe, expect, it } from "bun:test";
import type { AnswerViolationKind, AnswerViolationRule } from "../../web/src/answer-guard.ts";
import { runGeneration, newGenTrace, classifyGenFailure } from "./answer-generation.ts";
import { verdictAfterFailure, MAX_ATTEMPTS, MIN_RETRY_MS } from "./answer-retry.ts";
import { MODEL_DEADLINE_MS } from "./providers.ts";
import { nextAttemptBudget } from "./answer-retry.ts";

interface Clock {
  readonly now: () => number;
  advance(ms: number): void;
}

const clockFrom = (start: number): Clock => {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
};

/**
 * `nextAttemptBudget`'s answer for an attempt this test needs to have been ADMITTED.
 *
 * Not `!`. A null here means the reference arm itself was refused admission, and the comparison
 * below would then be null-against-null — green, and measuring nothing. This fails loudly instead.
 */
const admitted = (budgetMs: number | null): number => {
  if (budgetMs === null) throw new Error("nextAttemptBudget refused an attempt this test requires");
  return budgetMs;
};

const okVerdict = () => ({ ok: true, violations: [] as const });

/**
 * The RULE is a parameter, defaulted, because the two must be able to disagree in a test: the
 * loop reads them off ONE row and a fake that welds them together could not catch a drift where
 * `blockedRule` is read from a second lookup.
 */
const blockedVerdict = (kind: AnswerViolationKind, rule: AnswerViolationRule = "fatwa") =>
  ({ ok: false, violations: [{ kind, rule }] as const });

describe("a turn that answers", () => {
  /**
   * The success lane needs its own measurement because `"answered"` is the one terminal reason that
   * does NOT come from the shared exit expression. If this ever regresses to a reconstructed token,
   * the report could claim success after the loop had in fact ended for some other reason.
   */
  it("records one ok attempt on attempt 1 and ends answered", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(1_000);

    await runGeneration(trace, {
      turnDeadline: 11_000,
      now: clock.now,
      generate: async () => {
        clock.advance(320);
        return "  jawaban lolos  ";
      },
      guard: () => okVerdict(),
    });

    expect(trace.attempts).toEqual([{ ms: 320, budgetMs: 10_000, outcome: "ok" }]);
    expect(trace.reason).toBe("answered");
    expect(trace.answer).toBe("jawaban lolos");
  });
});

describe("a retry after a guard refusal", () => {
  /**
   * The retry is only worth opening if the second attempt can change the answer. Production proved
   * that `bad_hadith` is variance, not determinism; this test pins the report shape that tells us a
   * refused first attempt was later cleared instead of being mistaken for a terminal block.
   */
  it("records blocked then ok, clears the preserved verdict, and ends answered", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(10_000);

    await runGeneration(trace, {
      turnDeadline: 30_000,
      now: clock.now,
      generate: async ({ attempt }) => {
        if (attempt === 0) {
          clock.advance(4_000);
          return "first candidate";
        }
        clock.advance(5_500);
        return "second candidate";
      },
      guard: (candidate) => (candidate === "second candidate" ? okVerdict() : blockedVerdict("bad_hadith")),
    });

    expect(trace.attempts).toEqual([
      { ms: 4_000, budgetMs: 20_000, outcome: "blocked:bad_hadith" },
      { ms: 5_500, budgetMs: 16_000, outcome: "ok" },
    ]);
    expect(trace.reason).toBe("answered");
    expect(trace.blocked).toBeNull();
    expect(trace.answer).toBe("second candidate");
  });

  it("records two blocked attempts and preserves the final verdict", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(5_000);

    await runGeneration(trace, {
      turnDeadline: 25_000,
      now: clock.now,
      generate: async ({ attempt }) => {
        clock.advance(attempt === 0 ? 4_500 : 6_000);
        return `candidate-${attempt}`;
      },
      guard: () => blockedVerdict("fatwa"),
    });

    expect(trace.attempts).toEqual([
      { ms: 4_500, budgetMs: 20_000, outcome: "blocked:fatwa" },
      { ms: 6_000, budgetMs: 15_500, outcome: "blocked:fatwa" },
    ]);
    expect(trace.reason).toBe("blocked");
    expect(trace.blocked).toBe("fatwa");
    expect(trace.answer).toBeNull();
  });
});

describe("a retry refused admission", () => {
  /**
   * This is the misreading the `blocked` terminal reason exists to prevent. Attempt 1 earned a real
   * refusal; attempt 2 never STARTED because the turn had less than `MIN_RETRY_MS` left. Reporting
   * `"deadline"` here would tell the reader the clock decided the turn when in fact the wall did.
   */
  it("keeps the turn blocked, not deadline, and records only the attempt that actually ran", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(2_000);

    await runGeneration(trace, {
      turnDeadline: 12_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_500);
        return "candidate";
      },
      guard: () => blockedVerdict("bad_hadith"),
    });

    expect(trace.attempts).toEqual([{ ms: 5_500, budgetMs: 10_000, outcome: "blocked:bad_hadith" }]);
    expect(trace.attempts).toHaveLength(1);
    expect(trace.reason).toBe("blocked");
  });
});

describe("a retry that throws on the turn deadline", () => {
  /**
   * This is the production ambiguity ISC-487 is instrumenting. The first attempt earns a real block,
   * the second attempt starts, spends the rest of the turn, and then throws a timeout-shaped error.
   * The report must say `"deadline"` for the TURN while preserving the earlier verdict on
   * `trace.blocked`, because those two facts are simultaneously true.
   */
  it("records the thrown retry, rethrows, and preserves the earlier verdict", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(3_000);
    const deadlineError = new DOMException("operation timed out", "AbortError");

    await expect(
      runGeneration(trace, {
        turnDeadline: 23_000,
        now: clock.now,
        generate: async ({ attempt }) => {
          if (attempt === 0) {
            clock.advance(5_000);
            return "candidate";
          }
          clock.advance(15_000);
          throw deadlineError;
        },
        guard: () => blockedVerdict("bad_hadith"),
      }),
    ).rejects.toBe(deadlineError);

    expect(trace.attempts).toEqual([
      { ms: 5_000, budgetMs: 20_000, outcome: "blocked:bad_hadith" },
      { ms: 15_000, budgetMs: 15_000, outcome: "threw" },
    ]);
    expect(trace.reason).toBe("deadline");
    expect(trace.blocked).toBe("bad_hadith");
    expect(verdictAfterFailure(trace.blocked)).not.toBeNull();
  });
});

describe("the reported budget", () => {
  /**
   * The point of `budgetMs` is to show the REAL admission number, not a re-labelled
   * `MODEL_DEADLINE_MS`. A reader debugging a 12 s retry needs to know whether the attempt was given
   * 12 s or 25 s; anything else would reintroduce the same guesswork under a new key.
   */
  it("matches what nextAttemptBudget handed each started attempt", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(7_000);

    await runGeneration(trace, {
      turnDeadline: 27_000,
      now: clock.now,
      generate: async ({ attempt }) => {
        clock.advance(attempt === 0 ? 8_000 : 4_000);
        return attempt === 0 ? "blocked candidate" : "accepted candidate";
      },
      guard: (candidate) => (candidate === "accepted candidate" ? okVerdict() : blockedVerdict("bad_hadith")),
    });

    const attempt0Budget = nextAttemptBudget({ attempt: 0, blocked: null, remainingMs: 20_000 });
    const attempt1Budget = nextAttemptBudget({ attempt: 1, blocked: "bad_hadith", remainingMs: 12_000 });

    // Pinned to literals FIRST, and narrowed through `admitted` rather than `!`. `nextAttemptBudget`
    // returns null for a refused attempt, and `[null, null]` would compare equal to a `budgetMs` list
    // that had silently gone null too — a green test that had stopped measuring anything. The
    // reference arm has to be a real pair of budgets before it is worth comparing against.
    expect(attempt0Budget).toBe(20_000);
    expect(attempt1Budget).toBe(12_000);
    expect(trace.attempts.map((attempt) => attempt.budgetMs)).toEqual([
      admitted(attempt0Budget),
      admitted(attempt1Budget),
    ]);
    expect(trace.attempts.map((attempt) => attempt.ms)).toEqual([8_000, 4_000]);
  });
});

describe("the diagnostic is instrument-only", () => {
  /**
   * Constraint 3 is behavioural, not stylistic: the new trace may describe decisions, but it may not
   * change them. The red check is the number of generations a scenario spends. If those counts move,
   * the user-visible diagnostic has become a control-flow edit in disguise.
   */
  it("keeps the constants and invocation counts exactly where the old loop left them", async () => {
    expect(MODEL_DEADLINE_MS).toBe(25_000);
    // 11_500 since 2026-08-19 (ISC-535), set from the p50 of 20 completing generations measured
    // live and bounded below the smallest budget that has ever produced a successful retry. This
    // pin exists so a constant cannot drift as a SIDE EFFECT of a diagnostic change — it is not a
    // claim that the value never moves. Moving it deliberately means editing this line and saying
    // why in `answer-retry.ts`; ISC-536 governs whether it may move at all.
    expect(MIN_RETRY_MS).toBe(11_500);
    expect(MAX_ATTEMPTS).toBe(2);

    const answeredTrace = newGenTrace();
    const answeredClock = clockFrom(0);
    let answeredCalls = 0;
    await runGeneration(answeredTrace, {
      turnDeadline: 10_000,
      now: answeredClock.now,
      generate: async () => {
        answeredCalls += 1;
        answeredClock.advance(500);
        return "accepted";
      },
      guard: () => okVerdict(),
    });

    const retriedTrace = newGenTrace();
    const retriedClock = clockFrom(0);
    let retriedCalls = 0;
    await runGeneration(retriedTrace, {
      turnDeadline: 20_000,
      now: retriedClock.now,
      generate: async ({ attempt }) => {
        retriedCalls += 1;
        retriedClock.advance(attempt === 0 ? 4_000 : 3_000);
        return attempt === 0 ? "blocked" : "accepted";
      },
      guard: (candidate) => (candidate === "accepted" ? okVerdict() : blockedVerdict("bad_hadith")),
    });

    const refusedRetryTrace = newGenTrace();
    const refusedRetryClock = clockFrom(0);
    let refusedRetryCalls = 0;
    await runGeneration(refusedRetryTrace, {
      turnDeadline: 7_000,
      now: refusedRetryClock.now,
      generate: async () => {
        refusedRetryCalls += 1;
        refusedRetryClock.advance(2_000);
        return "blocked";
      },
      guard: () => blockedVerdict("fatwa"),
    });

    expect(answeredCalls).toBe(1);
    expect(retriedCalls).toBe(2);
    expect(refusedRetryCalls).toBe(1);
  });
});

describe("a turn that never starts a generation", () => {
  /**
   * `"no_attempt"` and `"deadline"` are the same clock event at different times, and they are NOT
   * interchangeable copy. A turn whose budget was already gone before the first call never asked the
   * model anything — nothing was generated, nothing was refused, and nothing was paid for. Reporting
   * an empty `attempts` array alongside `"deadline"` would read as "the model was tried and ran out",
   * which sends the next session to the generation prompt for a defect that is upstream of it.
   *
   * This is the same absent-means-did-not-run discipline `DalilTimings` documents one level up: an
   * attempt that never started gets NO row, never a placeholder row of zeros.
   */
  it("reports no_attempt with an empty attempts array and never calls generate", async () => {
    const trace = newGenTrace();
    let calls = 0;

    await runGeneration(trace, {
      turnDeadline: 10_000,
      now: () => 10_000,
      generate: async () => {
        calls += 1;
        return "never reached";
      },
      guard: () => okVerdict(),
    });

    expect(trace.attempts).toEqual([]);
    expect(trace.reason).toBe("no_attempt");
    expect(trace.blocked).toBeNull();
    expect(trace.answer).toBeNull();
    expect(calls).toBe(0);
  });
});

describe("a generation that throws for a reason that is not the clock", () => {
  /**
   * The whole point of splitting `"deadline"` from `"threw"` is that they need different fixes: one
   * is budget math, the other is upstream. A classifier that reached for `"deadline"` on any throw
   * would be worse than no classifier at all — it would send every session to the timing code. So the
   * default is the vague token, exactly as `classifyDalilFailure` leaves an unmatched stage
   * `"unknown"` rather than forcing it into a bucket.
   *
   * `verdictAfterFailure` must also keep saying null here. Nothing was refused on this turn, so the
   * browser must render the corpus-gap copy and not "an answer was found and is being held back".
   */
  it("reports threw, not deadline, and invents no verdict", async () => {
    const trace = newGenTrace();
    const upstream = new Error("model returned 502");

    await expect(
      runGeneration(trace, {
        turnDeadline: 25_000,
        now: () => 0,
        generate: async () => {
          throw upstream;
        },
        guard: () => okVerdict(),
      }),
    ).rejects.toBe(upstream);

    expect(trace.attempts).toEqual([{ ms: 0, budgetMs: 25_000, outcome: "threw" }]);
    expect(trace.reason).toBe("threw");
    expect(trace.blocked).toBeNull();
    expect(verdictAfterFailure(trace.blocked)).toBeNull();
  });

  /**
   * `/api/answer` is PUBLIC. `classifyGenFailure` returns a TOKEN and never the message it read, for
   * the same reason `classifyDalilFailure` does: upstream error text is unstable, and it is the one
   * place a provider could hand us a key fragment, a URL or a fragment of the reader's own question.
   * The report may say WHICH FAMILY the failure was in and nothing else.
   */
  it("emits a token and never carries the error text onto the wire", async () => {
    // NAME-ONLY, with messages carrying none of the tokens the regex below looks for. Written the
    // other way round — `DOMException("The operation was aborted", "AbortError")` — the regex arm
    // answers first and the name arm is never exercised: deleting it outright left this file green,
    // which is how it was caught. These two are the shapes `AbortSignal.timeout` actually produces,
    // and they must classify on identity, not on text a runtime is free to reword.
    expect(classifyGenFailure(new DOMException("upstream closed the stream", "AbortError"))).toBe("deadline");
    expect(classifyGenFailure(new DOMException("", "TimeoutError"))).toBe("deadline");
    // MESSAGE-ONLY, name `Error`: the fallback arm, for a provider SDK that reports its own wall.
    expect(classifyGenFailure(new Error("The operation timed out"))).toBe("deadline");
    expect(classifyGenFailure(new Error("model returned 401"))).toBe("threw");
    expect(classifyGenFailure("OPENROUTER_API_KEY sk-or-v1-secret rejected")).toBe("threw");

    const trace = newGenTrace();
    const leaky = new Error("upstream said: sk-or-v1-deadbeef is invalid");
    await expect(
      runGeneration(trace, {
        turnDeadline: 25_000,
        now: () => 0,
        generate: async () => {
          throw leaky;
        },
        guard: () => okVerdict(),
      }),
    ).rejects.toBe(leaky);

    // The whole published shape, serialised exactly as `genReport()` hands it to `json()`.
    const wire = JSON.stringify({ attempts: trace.attempts, reason: trace.reason });
    expect(wire).not.toContain("sk-or-v1");
    expect(wire).not.toContain("upstream said");
    expect(Object.keys(trace.attempts[0]!).sort()).toEqual(["budgetMs", "ms", "outcome"]);
  });
});

/**
 * WHICH WALL FIRED — the attribution channel (`trace.blockedRule`), added because `blocked` alone
 * could not answer it.
 *
 * `own_wording` is pushed by both `wordingShape` and `scriptureEchoShape`, and `bad_hadith` by both
 * `hadithShape` and the unresolvable-marker sweep. When the echo wall deployed, the post-deploy
 * `own_wording` rate moved 4/24 → 5/24 and NOTHING on the wire could say which of the two checks
 * had produced any of those five. That is a blind instrument, the third in this project, and this
 * suite is where it stops being one.
 *
 * The kind is deliberately held CONSTANT across these cases and only the rule varies — otherwise a
 * passing test would be consistent with the loop reading the rule off the kind.
 */
describe("the loop reports WHICH check refused, not only the reader's verdict", () => {
  it("carries the rule beside the kind, and they are read off the same row", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(0);

    await runGeneration(trace, {
      turnDeadline: 25_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        return "candidate";
      },
      guard: () => blockedVerdict("own_wording", "echo"),
    });

    expect(trace.blocked).toBe("own_wording");
    expect(trace.blockedRule).toBe("echo");
  });

  it("distinguishes the OTHER own_wording check on an identical kind", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(0);

    await runGeneration(trace, {
      turnDeadline: 25_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        return "candidate";
      },
      guard: () => blockedVerdict("own_wording", "wording"),
    });

    expect(trace.blocked).toBe("own_wording");
    expect(trace.blockedRule).toBe("wording");
  });

  /**
   * THE RESET. A retry that clears the wall must not leave the first attempt's rule standing, or
   * every answered turn downstream of one refusal would be reported as having been refused by a
   * rule — the stale-verdict shape this project has already measured at ~10% of grounded turns.
   */
  it("clears the rule when a retry produces an admissible answer", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(0);
    let n = 0;

    await runGeneration(trace, {
      turnDeadline: 40_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        n += 1;
        return "candidate";
      },
      guard: () => (n === 1 ? blockedVerdict("own_wording", "echo") : okVerdict()),
    });

    expect(trace.answer).toBe("candidate");
    expect(trace.reason).toBe("answered");
    expect(trace.blocked).toBeNull();
    expect(trace.blockedRule).toBeNull();
  });

  it("a turn that never generated names no rule at all", () => {
    expect(newGenTrace().blockedRule).toBeNull();
  });
});
