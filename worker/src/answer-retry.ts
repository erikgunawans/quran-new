/**
 * How many generations one `/api/answer` turn may spend, and how much of the turn's clock each gets.
 *
 * This was two lines inside `handleAnswer` — a `for (attempt < 2)` and a bare
 * `if (blocked === "bad_hadith") break;` — and both were changed on reasoning rather than on
 * measurement, twice. Pulled out here so the policy has a name, a seam, and a red test.
 *
 * TWO RULES, and they answer different questions:
 *
 *   1. MAY a retry run? It used to depend on WHICH rule refused the first candidate: every guard
 *      reject got a second generation except `bad_hadith`, which got none. That exception is gone —
 *      see `nextAttemptBudget` for the measurement that removed it.
 *   2. HOW LONG may it run? Whatever the TURN has left, never a fresh deadline. `callChatModel`
 *      defaults to its own `AbortSignal.timeout(MODEL_DEADLINE_MS)` per call, so two attempts used to
 *      be able to spend 25 s each behind a client backstop of 30 s — generating an answer nobody
 *      would receive and paying for it, which is precisely the defect ISC-466 closed on the other
 *      side of the wire.
 */
import type { AnswerViolationKind } from "../../web/src/answer-guard.ts";

/**
 * Two generations, and that is the whole cost ceiling of opening the retry.
 *
 * The number is unchanged — the loop already ran twice for every other violation kind. What changed
 * is that `bad_hadith` no longer leaves early, so the ceiling is now reached on turns that used to
 * stop at one.
 */
export const MAX_ATTEMPTS = 2;

/**
 * The least time worth handing a RETRY — set from a PERCENTILE of the measured completion
 * distribution, which is what ISC-535 asked for and what the old value did not have.
 *
 * WHAT THE OLD NUMBER WAS. 6_000, justified as "a verbose hadith generation measures ~6 s (a passing
 * control measured 3,772 ms)". That is the FASTEST observation in a small sample used as a predictor
 * of completion — the floor of a distribution standing in for its centre. It is the same shape of
 * error as `OWN_WORDING_MIN_WORDS = 8`, which was set from the smallest violation seen so far and
 * duly let a smaller one through (see `wordingShape`).
 *
 * THE DISTRIBUTION, measured live 2026-08-19 against prod worker `cfb0b05d` over 49 grounded turns
 * (`wall-live-probe --repeat 3` then `--repeat 4`), reading the per-attempt `gen` diagnostic. Of 20
 * attempts that COMPLETED (`outcome: "ok"`):
 *
 *     min 3,950 · p25 7,900 · p50 9,647 · p75 13,557 · p90 14,609 · max 18,486 ms
 *
 * A `threw` attempt is excluded: it was cut off at its budget and never completed, so folding it in
 * would measure the deadline rather than the work.
 *
 * WHY 11_500 AND NOT THE p50. The binding constraint is not the median, it is ISC-536: the answered
 * rate must not fall, and retries DO save turns — 5 of 22 retries in the sample ended answered. The
 * budgets those five were granted were 11,554 · 13,352 · 16,393 · 18,365 · 19,861 ms, so **11_500
 * sits just below the smallest budget that has ever produced a save** and cannot cut any observed
 * success. Of the 22 retries, only 3 were granted less than this, and **none of the three completed**
 * — so on this sample the change costs zero answers and stops three doomed spends.
 *
 * WHAT THIS NUMBER DOES NOT KNOW, stated so the next person does not over-trust it. The success arm
 * is n=5. The two runs disagree materially with NO deploy between them — 29% vs 41% answered, `ok`
 * p50 11,468 vs 8,677 — which is the run-to-run variance this repo has been bitten by before, so the
 * percentile itself is not stable to three digits. 11_500 is defensible because it is bounded below
 * an observed floor, not because the p50 is precise. **Move it again only against a fresh
 * distribution, never against arithmetic**, and re-read ISC-536 first.
 *
 * Deliberately NOT applied to the first attempt. A turn with 3 s left should still try, because the
 * alternative there is a guaranteed null; only a retry is a spend that has an alternative.
 */
export const MIN_RETRY_MS = 11_500;

/**
 * The budget in ms for the attempt about to run, or `null` when it must not run at all.
 *
 * `attempt` is 0-based and names the generation about to be spent; `blocked` is the verdict that
 * refused the PREVIOUS candidate (`null` before any has run); `remainingMs` is what is left of the
 * turn's single `MODEL_DEADLINE_MS` budget.
 *
 * WHY `bad_hadith` IS NO LONGER AN EXCEPTION. The break was justified by determinism: the first
 * attempt is handed the retrieved hadith and taught the `[H:…]` marker by rule 7 of the prompt, so a
 * `bad_hadith` verdict was read as "the model had everything it needed and chose an unbacked
 * attribution anyway" — a stable property of the turn, making a second generation a bet with no
 * evidence. Measured 2026-08-16 against prod, 25 live eligible turns over 10 distinct questions
 * (every one `eligible:true, offered:2, records:2, failed:null`): `bad_hadith` fired on **12 of 25**,
 * and the SAME question with identical grounding produced BOTH outcomes —
 * `apakah sedekah boleh diungkit ungkit` ran bad, bad, ok, bad, ok, and
 * `bagaimana hukum utang piutang dalam islam` ran ok, ok, ok, bad, bad. It is variance, not a
 * property of the turn. The determinism premise is false, so the exception built on it is gone.
 *
 * The OTHER half of that break's justification was latency — two ~6 s generations against a 12,000 ms
 * client abort — and it expired when `FAST_ANSWER_MS` split the reader's wait from the request's
 * deadline (ISC-466). The reader already has the principled answer at 9 s and the retry upgrades it
 * in place, so the second generation costs no stare. What it must NOT do is outrun the client, which
 * is what the shared budget above is for.
 */
export function nextAttemptBudget(opts: {
  attempt: number;
  blocked: AnswerViolationKind | null;
  remainingMs: number;
}): number | null {
  if (opts.attempt >= MAX_ATTEMPTS) return null;
  if (opts.remainingMs <= 0) return null;
  if (opts.attempt > 0 && opts.remainingMs < MIN_RETRY_MS) return null;
  return opts.remainingMs;
}

/**
 * What the model-failure path reports, given whatever verdict earlier attempts already earned.
 *
 * MEASURED ON PROD 2026-08-16, in the first 25 turns after the retry shipped. `bad_hadith` fell from
 * 12/25 to 2/25 exactly as the change predicted — and `{answer:null}` rose from 2/25 to **7/25**,
 * every new one at a wall of ~26 s. That is the turn budget expiring INSIDE the second attempt, and
 * the `catch` around the generation loop returned a bare `{answer:null}`, discarding the verdict the
 * FIRST attempt had already earned.
 *
 * Those two are not interchangeable copy, and the difference is the whole reason the `blocked`
 * channel exists. `blocked` renders as "an answer was found and is being held back"; a bare null
 * renders as "no matching verse was found". Substituting the second for the first tells the reader
 * the corpus is empty when the app is in fact refusing — so the reader concludes the app does not
 * know, and stops asking.
 *
 * This function is deliberately total and deliberately dull: a verdict survives, an absence stays an
 * absence, and nothing is ever invented. It exists so the rule has a name and a red test rather than
 * living as an argument list on one `return` inside a `catch`.
 */
export function verdictAfterFailure(blocked: AnswerViolationKind | null): AnswerViolationKind | null {
  return blocked;
}
