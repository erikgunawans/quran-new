import type { Turn } from "./thread.ts";
import type { GenTerminalReason } from "./answer-live.ts";

/**
 * What the LATE path should render when the composed answer never arrived (ISC-533 / ISC-534).
 *
 * Lives in its own module rather than in `main.ts` for the same reason `kept-below.ts` does: the app
 * entry point boots the whole surface on import, so nothing inside it can be reached by a test. That
 * is not a style preference here — it is the root cause the ISC-528 diagnosis landed on. Every
 * `answer-blocked` test in this repo slices `main.ts` as a SOURCE STRING to assert what the copy
 * says, and a technique that can only read text is structurally incapable of asking whether any path
 * produces the turn. The copy tests stayed green for the whole time the channel was dead. This
 * function exists so that question has somewhere to be asked.
 *
 * Returns `null` for "change nothing" — the fast answer stands exactly as the reader has it.
 *
 * @param fast     the turn already on screen, painted at `FAST_ANSWER_MS`
 * @param terminal the Worker's own `gen.reason` for how the turn ENDED
 */
export function annotateWithheld(fast: Turn, terminal: GenTerminalReason | null): Turn | null {
  // THE LOAD-BEARING NEGATIVE, and the reason this criterion was deferred for six days instead of
  // being shipped half-built.
  //
  // `deadline` and `threw` are turns that ran out of clock, and on those the Worker's `blocked` field
  // still carries attempt 1's guard verdict — `verdictAfterFailure` preserves it, and a deadline abort
  // IS a throw. Measured live 2026-08-19: 2 of 21 grounded turns came back `blocked:"bad_hadith"` and
  // `blocked:"own_wording"` with `gen.reason:"deadline"`. Saying "a fuller answer was composed and I
  // held it back" on one of those names the wrong actor to the reader, at roughly a tenth of all
  // grounded traffic. `null` (no report at all, or a token this build does not recognise) means we
  // CANNOT TELL, and cannot-tell falls back to the old silence rather than to a claim.
  if (terminal !== "blocked") return null;

  // ISC-534. The fast answer is real: cited, grounded, and already being read. It is ANNOTATED, never
  // replaced — swapping it for a refusal because the model's separate attempt was blocked is a product
  // regression wearing a bug-fix costume. Its grounding never depended on the model's verdict.
  //
  // `silence` is the one exception, and it is not an exception to the rule so much as a case where the
  // rule does not apply: `silence` is not an answer, it is the claim that nothing in the corpus
  // matched — which for a question the wall refused is simply false, and for a fiqh question is a
  // false statement about the mushaf. Trading a false claim for copy that claims nothing is the fix
  // `answer-blocked` was written for, not a downgrade.
  if (fast.kind === "silence") return { q: fast.q, kind: "answer-blocked" };
  return { ...fast, withheld: true };
}
