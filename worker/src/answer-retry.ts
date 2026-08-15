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
 * The least time worth handing a RETRY. A verbose hadith generation measures ~6 s (a passing control
 * measured 3,772 ms; the hadith-carrying answers run longer), so a retry given less than this cannot
 * produce an answer — it can only make the reader wait longer for the same refusal, and bill an
 * upstream call for the privilege.
 *
 * Deliberately NOT applied to the first attempt. A turn with 3 s left should still try, because the
 * alternative there is a guaranteed null; only a retry is a spend that has an alternative.
 */
export const MIN_RETRY_MS = 6_000;

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
