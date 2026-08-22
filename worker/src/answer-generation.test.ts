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
import { repairAnswerProse } from "./answer-repair.ts";
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
const blockedVerdict = (
  kind: AnswerViolationKind,
  rule: AnswerViolationRule = "fatwa",
  /**
   * The offending SPAN. A third independent axis for the same reason `rule` is the second: repair
   * reads it (ISC-562) and nothing in `GenTrace` does, so a fake that welded it to `rule` could not
   * catch a loop that started reporting it. These tests do not exercise repair — every case here
   * leaves `deps.repair` unset — so the value only has to be present and distinct from the rule.
   */
  detail = "span",
) => ({ ok: false, violations: [{ kind, rule, detail }] as const });

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

describe("a generation that TIMES OUT is redrawn — Erik's 'it has to be answered', 2026-08-21", () => {
  it("retries after a deadline throw and answers on the second draw", async () => {
    // THE DEFECT THIS CLOSES, measured against prod 2026-08-21: 4 of 12 live turns ended
    // `reason:"deadline"` with a single `{"ms":25000,"outcome":"threw"}` attempt, and every one of
    // those questions answered in 3.9–10.9 s when asked again. The turn was losing to a bad draw it
    // never got to repeat, because a throw aborted the loop outright.
    //
    // Asserting the ATTEMPT COUNT, not just the answer: a fix that answered on the first draw would
    // satisfy `trace.answer` while proving nothing about the retry.
    const trace = newGenTrace();
    let calls = 0;
    let clock = 0;
    await runGeneration(trace, {
      turnDeadline: 25_000,
      now: () => clock,
      generate: async ({ deadlineMs }) => {
        calls += 1;
        if (calls === 1) {
          clock += deadlineMs; // the hung route burns its whole budget
          throw new DOMException("The operation timed out.", "TimeoutError");
        }
        clock += 4_000;
        return "Jawaban kedua yang bersih.";
      },
      guard: () => okVerdict(),
    });
    expect(calls).toBe(2);
    expect(trace.answer).toBe("Jawaban kedua yang bersih.");
    expect(trace.reason).toBe("answered");
    expect(trace.attempts.map((a) => a.outcome)).toEqual(["threw", "ok"]);
    // The first draw was capped so the second could exist at all.
    expect(trace.attempts[0]?.budgetMs).toBe(13_500);
  });

  it("still gives up when the deadline leaves too little for a retry", async () => {
    // The narrowing that keeps `handleAnswer`'s catch path reachable: when no retry is admissible
    // the throw propagates exactly as it always did. Force-red: dropping the `retryBudget === null`
    // clause makes this resolve instead of rejecting.
    const trace = newGenTrace();
    const boom = new DOMException("The operation timed out.", "TimeoutError");
    let clock = 0;
    await expect(
      runGeneration(trace, {
        turnDeadline: 25_000,
        now: () => clock,
        generate: async () => {
          clock = 24_000; // only 1 s left — under MIN_RETRY_MS
          throw boom;
        },
        guard: () => okVerdict(),
      }),
    ).rejects.toBe(boom);
    expect(trace.reason).toBe("deadline");
    expect(trace.attempts.length).toBe(1);
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

    // budgetMs is 13_500, not 25_000: since 2026-08-21 the first attempt reserves `MIN_RETRY_MS`
    // out of the turn so a hung route cannot spend all of it. A non-clock throw is still NOT
    // retried and still propagates — that is what this case pins, and it is unchanged.
    expect(trace.attempts).toEqual([{ ms: 0, budgetMs: 13_500, outcome: "threw" }]);
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

/**
 * ISC-561 — repair is offered EVERY refused candidate of the turn, not only the last.
 *
 * `lastBlocked = candidate` on every refusal means attempt 2 overwrites attempt 1, so the repair
 * block at the foot of the loop is handed only the survivor. Demonstrated OFFLINE on 2026-08-21 —
 * `src/eval/refusal-capture.ts`, not prod, and the word matters: `ISA.md` ISC-561 records that prod
 * ANSWERED this very question that morning in 6.0–12.9 s, first attempt `ok`, verified three ways.
 * No reader ever saw the block. In that offline capture, attempt 1's prose repaired in a SINGLE
 * deletion and attempt 2's did not repair at all.
 *
 * The repair injected here is the REAL `repairAnswerProse`, judged by the very guard the loop uses,
 * because what is under test is which CANDIDATES it is shown — not the search, which has its own
 * suite.
 *
 * The two attempts are given DIFFERENT rules on purpose. `repairedRule` must name the rule that
 * refused the candidate actually repaired; reading it off `trace.blockedRule` — which the loop sets
 * from the LAST attempt — would report attempt 2's rule over attempt 1's prose. A fake that welded
 * the two rules together could not catch that.
 */
describe("repair sees every refused candidate of the turn (ISC-561)", () => {
  const REPAIRABLE = "Sabar itu indah. POISON di sini. Rezeki datang dari Allah.";
  const UNREPAIRABLE = "VENOM satu. VENOM dua.";

  /** Occurrence-counting, so the search can make progress where progress exists. */
  const guard = (prose: string) => {
    const poison = prose.split("POISON").length - 1;
    const venom = prose.split("VENOM").length - 1;
    const violations = [
      ...Array.from({ length: poison }, () => ({
        kind: "own_wording" as const,
        rule: "wording" as const,
        detail: "POISON",
      })),
      ...Array.from({ length: venom }, () => ({
        kind: "fatwa" as const,
        rule: "fatwa" as const,
        detail: "VENOM",
      })),
    ];
    return { ok: violations.length === 0, violations };
  };

  it("the control: attempt 1 repairs alone, attempt 2 does not", () => {
    // Without this the test below could pass for the wrong reason — e.g. because BOTH candidates
    // repair, which would say nothing about which one repair was shown.
    expect(repairAnswerProse(REPAIRABLE, guard).prose).toBe("Sabar itu indah. Rezeki datang dari Allah.");
    expect(repairAnswerProse(UNREPAIRABLE, guard).prose).toBeNull();
  });

  it("answers from an earlier candidate when the LAST one cannot be repaired", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(0);
    let n = 0;

    await runGeneration(trace, {
      turnDeadline: 40_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        n += 1;
        return n === 1 ? REPAIRABLE : UNREPAIRABLE;
      },
      guard,
      repair: repairAnswerProse,
    });

    expect(trace.attempts.length).toBe(MAX_ATTEMPTS);
    expect(trace.answer).toBe("Sabar itu indah. Rezeki datang dari Allah.");
    expect(trace.reason).toBe("answered");
    expect(trace.repaired).toBe(true);
    expect(trace.repairedDropped).toBe(1);
    // Attempt 1's rule, not attempt 2's.
    expect(trace.repairedRule).toBe("wording");
    // THE ROW ONLY THIS CHANGE CAN EMIT. Every other field above reads the same whether repair was
    // handed one candidate or all of them, so without this the widening is unfalsifiable from
    // telemetry — you could not answer "did it ever fire in production?" from a log.
    expect(trace.repairedAttempt).toBe(0);
    expect(trace.repairedAttempt).toBeLessThan(trace.attempts.length - 1);
    expect(trace.blocked).toBeNull();
    expect(trace.blockedRule).toBeNull();
  });

  it("still prefers the LAST candidate when it repairs — this is a widening, not a swap", async () => {
    // Every turn that answers today must answer identically. Only turns that were SILENT change.
    const trace = newGenTrace();
    const clock = clockFrom(0);
    let n = 0;

    await runGeneration(trace, {
      turnDeadline: 40_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        n += 1;
        return n === 1 ? "VENOM awal. Kalimat bersih pertama." : REPAIRABLE;
      },
      guard,
      repair: repairAnswerProse,
    });

    expect(trace.answer).toBe("Sabar itu indah. Rezeki datang dari Allah.");
    expect(trace.repairedRule).toBe("wording");
    // The LAST attempt — the index this code could always have produced.
    expect(trace.repairedAttempt).toBe(trace.attempts.length - 1);
  });

  it("stays blocked when NO candidate of the turn can be repaired", async () => {
    const trace = newGenTrace();
    const clock = clockFrom(0);

    await runGeneration(trace, {
      turnDeadline: 40_000,
      now: clock.now,
      generate: async () => {
        clock.advance(5_000);
        return UNREPAIRABLE;
      },
      guard,
      repair: repairAnswerProse,
    });

    expect(trace.answer).toBeNull();
    expect(trace.reason).toBe("blocked");
    expect(trace.repaired).toBe(false);
    expect(trace.repairedAttempt).toBeNull();
    expect(trace.blockedRule).toBe("fatwa");
  });
});
