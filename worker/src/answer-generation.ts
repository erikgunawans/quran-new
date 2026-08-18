/**
 * What the generation half of `/api/answer` actually DID, and why the TURN ended where it did.
 *
 * ISC-487 measured refusal turns averaging 24.8 s against a 25 s `MODEL_DEADLINE_MS`, and nothing
 * on the wire could say which of three materially different events had happened:
 *
 *   1. the wall refused a candidate and the turn ended with a real verdict,
 *   2. the turn budget expired inside the second attempt, or
 *   3. the upstream call threw for some other reason.
 *
 * Before this existed, all three could collapse into the same `{ answer:null, blocked:? }` shape.
 * The most misleading case is the one production actually hit: `verdictAfterFailure` correctly
 * preserves the FIRST attempt's verdict when the SECOND attempt throws, so a deadline abort on the
 * retry was byte-identical on the wire to a genuine second refusal. Reader-facing copy cannot
 * distinguish "an answer was found and is being held back" from "the retry died on the clock" unless
 * the generation loop reports both PER-ATTEMPT outcomes and the TURN-LEVEL reason in its own lane.
 *
 * Pulled out here for the same reason `answer-retry.ts` exists: the loop had no seam, so the policy
 * could only be edited inside `handleAnswer` and could not be red-tested. The extraction changes
 * nothing about admission, guarding or throwing; it gives those decisions a name and a public,
 * non-revealing report.
 */
import type { AnswerViolationKind } from "../../web/src/answer-guard.ts";
import { MAX_ATTEMPTS, nextAttemptBudget } from "./answer-retry.ts";

export type GenOutcome = "ok" | "empty" | "threw" | `blocked:${AnswerViolationKind}`;

export type GenReason = "answered" | "blocked" | "deadline" | "threw" | "no_attempt";

export interface GenAttempt {
  readonly ms: number;
  readonly budgetMs: number;
  readonly outcome: GenOutcome;
}

export interface GenTrace {
  attempts: GenAttempt[];
  reason: GenReason;
  blocked: AnswerViolationKind | null;
  answer: string | null;
}

interface GuardVerdict {
  readonly ok: boolean;
  readonly violations: readonly { readonly kind: AnswerViolationKind }[];
}

export interface RunGenerationDeps {
  readonly generate: (opts: { attempt: number; deadlineMs: number }) => Promise<string | null | undefined>;
  readonly guard: (candidate: string) => GuardVerdict;
  readonly now: () => number;
  readonly turnDeadline: number;
}

export function newGenTrace(): GenTrace {
  return { attempts: [], reason: "no_attempt", blocked: null, answer: null };
}

/**
 * The only public tokens the generation-failure path is allowed to emit.
 *
 * Token, not message, for exactly the same reason as `classifyDalilFailure`: `/api/answer` is
 * public, and raw upstream text is both unstable and more revealing than the client needs. The one
 * distinction worth surfacing is whether the TURN clock expired. That bucket must be conservative:
 * an abort-ish token wrongly labelled `"deadline"` sends the next session to budget math when the
 * real bug is elsewhere, so anything not clearly in the timeout family stays `"threw"`.
 */
export function classifyGenFailure(e: unknown): "deadline" | "threw" {
  if (!(e instanceof Error || e instanceof DOMException)) return "threw";
  if (e.name === "TimeoutError" || e.name === "AbortError") return "deadline";
  return /\baborted\b|\btimed out\b|\btimeout\b/i.test(e.message) ? "deadline" : "threw";
}

/**
 * The shared terminal reason for any exit that DID NOT come from `verdict.ok` or a thrown generate.
 *
 * ONE EXPRESSION ON PURPOSE. The response body reads `trace.reason`; it does NOT reconstruct a second
 * copy from `attempts` later. That is the same anti-drift rule `dalilEligible` exists for in
 * `index.ts`: the binding that chose the reason is the binding the report publishes.
 *
 * The ordering is load-bearing:
 *
 *   1. `attempts.length === 0` means the turn never reached generation at all, which is a different
 *      fact from "generation ran and ended quickly". A missing `gen` key on earlier return paths and
 *      `"no_attempt"` here are the same discipline at different scopes: absent means "did not run".
 *   2. `blocked !== null` wins over the clock. This is the required case where attempt 1 earned a
 *      real refusal and attempt 2 was REFUSED ADMISSION because the turn had less than
 *      `MIN_RETRY_MS` left. That turn must keep saying `"blocked"` with `attempts.length === 1`,
 *      because the reader-facing truth is still "an answer was found and is being held back".
 *      Downgrading it to `"deadline"` would recreate the exact confusion the `blocked` lane was
 *      introduced to end.
 *   3. Everything else lands in `"deadline"`, including the orphan defensive path where every started
 *      attempt returned empty prose. In production that second shape should be unreachable:
 *      `callChatModel` throws `"model returned no content"`, so an actually empty upstream turn
 *      arrives through `classifyGenFailure` as `"threw"`, not here. The `if (!candidate) continue`
 *      branch remains because this seam accepts injected `generate` fakes and must stay total. Read
 *      the TURN reason alongside `attempts`: two `"empty"` outcomes ending `"deadline"` do NOT say
 *      the clock fired. The per-attempt array is the disambiguator, which is the whole point of
 *      reporting both fields.
 */
function terminalGenReason(trace: GenTrace): GenReason {
  if (trace.attempts.length === 0) return "no_attempt";
  if (trace.blocked !== null) return "blocked";
  return "deadline";
}

/**
 * Spend up to two generations inside one turn budget, recording exactly what happened.
 *
 * Behaviourally this is the old inline loop, byte for byte in policy:
 *
 *   - `nextAttemptBudget` still decides admission.
 *   - the candidate is still trimmed before the guard sees it.
 *   - the first successful answer still wins immediately.
 *   - a thrown generation is still NOT retried, and is still re-thrown to the caller.
 *
 * The only added work is measurement. Each attempt records the wall-clock it actually spent and the
 * exact budget `nextAttemptBudget` handed it, including calls that throw.
 */
export async function runGeneration(trace: GenTrace, deps: RunGenerationDeps): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const budgetMs = nextAttemptBudget({
      attempt,
      blocked: trace.blocked,
      remainingMs: deps.turnDeadline - deps.now(),
    });
    if (budgetMs === null) {
      trace.reason = terminalGenReason(trace);
      break;
    }

    const t0 = deps.now();
    let candidate: string | null | undefined;
    try {
      candidate = (await deps.generate({ attempt, deadlineMs: budgetMs }))?.trim();
    } catch (e) {
      trace.attempts.push({ ms: deps.now() - t0, budgetMs, outcome: "threw" });
      trace.reason = classifyGenFailure(e);
      throw e;
    }

    const ms = deps.now() - t0;
    if (!candidate) {
      trace.attempts.push({ ms, budgetMs, outcome: "empty" });
      continue;
    }

    const verdict = deps.guard(candidate);
    if (verdict.ok) {
      trace.answer = candidate;
      trace.blocked = null;
      trace.attempts.push({ ms, budgetMs, outcome: "ok" });
      trace.reason = "answered";
      break;
    }

    // Last attempt wins the diagnosis: report the rule that actually stopped the final candidate.
    //
    // ONE BINDING, NOT TWO. The per-attempt outcome is derived from the SAME `trace.blocked`
    // assignment the caller later reads in the catch path; it does not re-evaluate
    // `verdict.violations[0]?.kind` in a second place that could drift.
    trace.blocked = verdict.violations[0]?.kind ?? null;
    // THE `bad_hadith` BREAK THAT USED TO LIVE IN THIS LOOP IS GONE (2026-08-16, Erik's call), and
    // this note travelled with the loop out of `handleAnswer` so it is not restored from the
    // reasoning that justified it.
    //
    // It read: "a `bad_hadith` verdict means the first attempt already had everything it needed —
    // the hadith and the marker syntax — and chose an unbacked attribution anyway, so a second ~6s
    // generation is a bet with no evidence behind it." That rests on the failure being DETERMINISTIC
    // for the turn. Measured against prod across 25 live eligible turns over 10 distinct questions,
    // every one `eligible:true, offered:2, records:2, failed:null`: `bad_hadith` fired on **12 of
    // 25**, and the SAME question with identical grounding produced BOTH outcomes —
    // `apakah sedekah boleh diungkit ungkit` ran bad, bad, ok, bad, ok. It is variance, so the
    // second generation now has exactly the evidence the break said it lacked.
    //
    // The break's OTHER leg was latency: two ~6s generations against the browser's 12s `TIMEOUT_MS`,
    // observed aborting at 12,126 ms and rendering the corpus-gap copy over a refusal. That leg
    // expired with ISC-466 — `FAST_ANSWER_MS` (9 s) now bounds what the READER waits and the answer
    // upgrades in place, so a retry costs no stare, and `TIMEOUT_MS` is a 30 s backstop.
    //
    // What replaces the break is the SHARED BUDGET at the top of this loop, which is the honest
    // form of the same concern: a retry is refused when it cannot finish inside what the turn has
    // left (`MIN_RETRY_MS`), rather than refused by name. The diagnostic reports that refusal as
    // `reason:"blocked"` with a single attempt — see `terminalGenReason`.
    if (trace.blocked === null) {
      // Defensive only: the guard contract is "ok:false implies a first violation", and the real
      // caller obeys it. If an injected fake ever breaks that contract, the public diagnostic still
      // stays inside its enum by reporting that the attempt produced no admissible answer rather than
      // inventing a block reason the guard never named.
      trace.attempts.push({ ms, budgetMs, outcome: "empty" });
      continue;
    }
    trace.attempts.push({ ms, budgetMs, outcome: `blocked:${trace.blocked}` });
  }

  if (trace.reason === "no_attempt") {
    trace.reason = terminalGenReason(trace);
  }
}
