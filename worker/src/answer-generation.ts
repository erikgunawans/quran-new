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
import type { AnswerViolationKind, AnswerViolationRule } from "../../web/src/answer-guard.ts";
import { MAX_ATTEMPTS, nextAttemptBudget } from "./answer-retry.ts";

export type GenOutcome = "ok" | "empty" | "threw" | `blocked:${AnswerViolationKind}`;

export type GenReason = "answered" | "blocked" | "deadline" | "threw" | "no_attempt";

export interface GenAttempt {
  readonly ms: number;
  readonly budgetMs: number;
  readonly outcome: GenOutcome;
  /**
   * WHICH rule refused this attempt. Present only on a `blocked:*` outcome.
   *
   * ── WHY THE OUTCOME ALONE IS NOT ENOUGH ─────────────────────────────────────────────────────
   *
   * `outcome` carries the KIND, and `own_wording` is TWO different walls — `wordingShape` (a
   * grammar question about quoted spans) and `scriptureEchoShape` (a corpus question about shared
   * runs). Collapsing them was already recorded as a measurement hazard, and on 2026-08-25 it cost
   * a real answer: after ISC-419's cited half went live, both `apa yang al quran katakan tentang
   * neraka` turns blocked `own_wording` on their first attempt and then shipped clean prose. That is
   * exactly what the new wiring firing would look like — and exactly what `wordingShape` firing on
   * its own would look like too, and the probe could not tell them apart.
   *
   * The rule is already known here: `trace.blockedRule` is set from the same `verdict.violations[0]`
   * that sets `trace.blocked`, eleven lines above the push. It was simply not recorded. Diagnostic
   * only — it names a guard that already refused, never a reason a reader is shown.
   */
  readonly rule?: AnswerViolationRule | null;
}

export interface GenTrace {
  attempts: GenAttempt[];
  reason: GenReason;
  blocked: AnswerViolationKind | null;
  /**
   * WHICH CHECK earned `blocked`, when the kind alone cannot say.
   *
   * `own_wording` is pushed by two different checks and `bad_hadith` by two more, so `blocked`
   * names the reader's verdict but not the rule behind it. After the echo wall deployed, that made
   * its live effect unattributable — `own_wording` 4/24 → 5/24 against a documented run-to-run
   * spread of 46% vs 25%. This field is what an instrument reads; nothing reader-facing does.
   */
  blockedRule: AnswerViolationRule | null;
  answer: string | null;
  /**
   * The answer reaching the reader was REPAIRED — one or more violating sentences were excised and
   * the remainder passed the same guard. Diagnostic only; nothing reader-facing branches on it.
   *
   * Reported because a repaired turn and a first-pass-clean turn look identical on the wire
   * otherwise, and this repo's standing rule is that an instrument must be able to tell a change
   * happened. Without this field, "did repair ever fire in production?" is unanswerable — the same
   * blindness `gen.rule` was added to fix.
   */
  repaired: boolean;
  /** How many sentences repair removed. 0 whenever `repaired` is false. */
  repairedDropped: number;
  /**
   * WHICH attempt's prose was repaired, 0-based. `null` whenever `repaired` is false.
   *
   * ISC-561's fix is UNFALSIFIABLE FROM TELEMETRY WITHOUT THIS. Before it, repair only ever saw the
   * last refused candidate; now it sees them all, most recent first. Every field above reports the
   * same values whether the answer came from attempt 2 (which is what always happened) or attempt 1
   * (which is the whole point of the change) — so "did the widening ever fire in production?" would
   * have no row that only the widening could emit. That is the exact blindness `repaired` itself was
   * added to fix, and the blindness `wall-live-probe` shipped when it dropped `gen`.
   *
   * A row with `repairedAttempt` less than `attempts.length - 1` is one this code could not have
   * produced before 2026-08-22. Diagnostic only; nothing reader-facing branches on it.
   */
  repairedAttempt: number | null;
  /**
   * The rule that CAUSED the excision, preserved after `blocked` is cleared.
   *
   * `blocked` goes null on a successful repair because the reader is not being refused — and this
   * repo has already lost time to `blocked` and `gen.reason` disagreeing. Keeping the rule here
   * means clearing `blocked` costs no diagnosis.
   */
  repairedRule: AnswerViolationRule | null;
}

interface GuardVerdict {
  readonly ok: boolean;
  /**
   * `detail` is here for REPAIR, not for the diagnostic — nothing in `GenTrace` reads it and nothing
   * reader-facing ever will. `repairAnswerProse` needs to tell "the offending span is gone" from
   * "nothing happened", and the count alone cannot (ISC-562); `RepairVerdict` documents why.
   *
   * Required, so a fake that omits it is a compile error rather than a silent loss of the fix.
   */
  readonly violations: readonly {
    readonly kind: AnswerViolationKind;
    readonly rule: AnswerViolationRule;
    readonly detail: string;
  }[];
}

export interface RunGenerationDeps {
  readonly generate: (opts: { attempt: number; deadlineMs: number }) => Promise<string | null | undefined>;
  readonly guard: (candidate: string) => GuardVerdict;
  readonly now: () => number;
  readonly turnDeadline: number;
  /**
   * Excise violating sentences from a blocked candidate — Erik's 2026-08-21 "it has to be answered".
   *
   * INJECTED so the loop stays testable and so repair judges with THIS deps.guard, never a second
   * copy of the wall. Optional purely so the offline evals, which construct these deps by hand, do
   * not silently acquire a behaviour the deployed Worker has: an eval that repaired when prod did
   * not would report a refusal rate prod never had.
   */
  readonly repair?: (candidate: string, guard: (p: string) => GuardVerdict) => { prose: string | null; dropped: number };
}

export function newGenTrace(): GenTrace {
  return {
    attempts: [],
    reason: "no_attempt",
    blocked: null,
    blockedRule: null,
    answer: null,
    repaired: false,
    repairedDropped: 0,
    repairedRule: null,
    repairedAttempt: null,
  };
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
  // EVERY candidate the guard REFUSED, in the order the model produced them, each with the rule
  // that refused IT. Repair works on prose the model actually wrote; it never invents text, so with
  // nothing retained there is nothing to repair.
  //
  // ISC-561 — THIS WAS A SINGLE SLOT (`lastBlocked = candidate`) UNTIL 2026-08-22, so attempt 2
  // overwrote attempt 1 and repair was handed only the survivor. Measured on the blocked turn of the
  // OFFLINE capture of 2026-08-21 — `src/eval/refusal-capture.ts`, NOT prod, and the distinction is
  // load-bearing: `PROGRESS.md`'s 2026-08-21 (morning) checkpoint records prod ANSWERING this very
  // question (`apa yang al quran katakan tentang neraka`) in 6.0-12.9 s, first attempt `ok`, 216-234
  // words, verified three ways. No reader ever saw the block. In that offline capture, attempt 1's
  // prose repaired in a SINGLE deletion and attempt 2's did not repair at all. Two attempts' prose can differ in
  // REPAIRABILITY, and one slot cannot express that.
  //
  // THE RULE TRAVELS WITH THE CANDIDATE, and that is not decoration. `trace.blockedRule` is set from
  // the LAST attempt by design ("last attempt wins the diagnosis"), so reading `repairedRule` off it
  // after repairing an EARLIER candidate would report attempt 2's rule over attempt 1's prose —
  // exactly the stale-verdict shape this repo has already measured at ~10% of grounded turns.
  const refused: { readonly prose: string; readonly rule: AnswerViolationRule | null }[] = [];
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
      // A DEADLINE IS NOW RETRIED; A REAL ERROR IS STILL NOT. (2026-08-21, Erik's "it has to be
      // answered".)
      //
      // Every throw used to abort the turn here. Combined with attempt 1 holding the whole budget,
      // that made one hung provider route the end of the turn — measured against prod the same day,
      // 4 of 12 turns died as `[{"ms":25000,"outcome":"threw"}]` and every one of those questions
      // answered in 3.9–10.9 s when asked again. The turn was losing to a draw it never repeated.
      //
      // The distinction is the whole point and it is why `classifyGenFailure` returns a TOKEN rather
      // than a boolean. `"deadline"` means the clock fired — the route said nothing, so a second draw
      // is a genuinely different experiment and the premise the retry rests on holds. `"threw"` is
      // anything else (a 4xx, a malformed body, a bug) — repeating that is repeating the same
      // experiment expecting a different result, and it is still re-thrown so `handleAnswer`'s catch
      // keeps its exact shape.
      //
      // NARROWED TO EXACTLY THE CASE BEING FIXED. The retry is taken only when `nextAttemptBudget`
      // would actually ADMIT one; otherwise the throw propagates exactly as it always has, so
      // `handleAnswer`'s catch — and its `verdictAfterFailure(gen.blocked)` response shape — is
      // reached on every path that reached it before. Falling through to the normal return instead
      // would have quietly swapped that shape on deadline turns, which is the kind of second-order
      // change this repo has lost sessions to.
      const retryBudget = nextAttemptBudget({
        attempt: attempt + 1,
        blocked: trace.blocked,
        remainingMs: deps.turnDeadline - deps.now(),
      });
      if (trace.reason !== "deadline" || retryBudget === null) throw e;
      continue;
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
      trace.blockedRule = null;
      trace.attempts.push({ ms, budgetMs, outcome: "ok" });
      trace.reason = "answered";
      break;
    }

    // Last attempt wins the diagnosis: report the rule that actually stopped the final candidate.
    //
    // ONE BINDING, NOT TWO. The per-attempt outcome is derived from the SAME `trace.blocked`
    // assignment the caller later reads in the catch path; it does not re-evaluate
    // `verdict.violations[0]?.kind` in a second place that could drift.
    //
    // The RULE is read off that same row for the same reason. `own_wording` is pushed by two
    // different checks, so the kind cannot say which wall fired; reading the rule from a second
    // `verdict.violations[0]` lookup would be exactly the drift this comment exists to forbid.
    const first = verdict.violations[0];
    trace.blocked = first?.kind ?? null;
    trace.blockedRule = first?.rule ?? null;
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
    // `rule` rides the SAME `trace.blockedRule` the turn-level report reads — one binding, not a
    // second lookup into `verdict.violations`, which is the drift the comment above forbids.
    trace.attempts.push({ ms, budgetMs, outcome: `blocked:${trace.blocked}`, rule: trace.blockedRule });
    refused.push({ prose: candidate, rule: trace.blockedRule });
  }

  // ── REPAIR — Erik's ruling of 2026-08-21: the app must always answer ───────────────────────────
  //
  // Every attempt was refused. Before this, that was the end and the reader got
  // "Aku belum menemukan jalan dari pertanyaanmu ke ayat-ayatnya" over prose the model had already
  // written, most of which was fine. Now the offending sentences are excised and the rest ships.
  //
  // NO RULE IS RELAXED. `deps.guard` is the same wall, and repair returns only prose it has watched
  // that wall accept — so nothing reaches the reader that the wall would have rejected whole. What
  // changed is the CONSEQUENCE of a violation, not its definition.
  //
  // `blocked` is cleared on success because the reader is NOT being refused, and a stale `blocked`
  // beside a delivered answer is exactly the disagreement this repo has already lost a session to.
  // The rule survives in `repairedRule`, so clearing it costs no diagnosis.
  //
  // ── ORDER: MOST RECENT FIRST (ISC-561) ────────────────────────────────────────────────────────
  //
  // A WIDENING, NOT A SWAP. Every turn that answers today answers with the same bytes: the last
  // refused candidate is still tried first, so a turn where it repairs is untouched. Only turns
  // that were SILENT change. This repo's record (`a-swap-is-not-a-widening`) is that replacing a
  // crude rule with a smarter one DELETED six refusals while the suite stayed green; ordering the
  // fallback behind the incumbent is what keeps that from happening here, and the third test in
  // `answer-generation.test.ts` pins it.
  //
  // NO QUALITY CLAIM IS MADE BETWEEN CANDIDATES. There is no evidence that a later generation is
  // better prose than an earlier one — only that trying just one of them loses answers that exist.
  // The order is chosen to preserve today's behaviour, not because attempt 2 is believed superior.
  if (trace.answer === null && deps.repair) {
    for (let i = refused.length - 1; i >= 0; i -= 1) {
      const attemptRefusal = refused[i]!;
      const repaired = deps.repair(attemptRefusal.prose, deps.guard);
      if (repaired.prose === null) continue;
      trace.answer = repaired.prose;
      trace.repaired = true;
      trace.repairedDropped = repaired.dropped;
      trace.repairedAttempt = i;
      // The rule that refused THIS candidate — not `trace.blockedRule`, which names the last one.
      trace.repairedRule = attemptRefusal.rule;
      trace.blocked = null;
      trace.blockedRule = null;
      trace.reason = "answered";
      return;
    }
  }

  if (trace.reason === "no_attempt") {
    trace.reason = terminalGenReason(trace);
  }
}
