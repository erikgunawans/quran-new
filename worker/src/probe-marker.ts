/**
 * Is this request an INSTRUMENT rather than a reader?
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * `handleAnswer` writes the text of every question to D1 `events`. `src/eval/wall-live-probe.ts`
 * posts the same body shape the front end posts, against the same prod, and gets an anonymous
 * `identity.userId` exactly like any other cookie-less visitor — so every probe turn was landing in
 * the table as reader traffic. Measured 2026-08-24: `events` held **39 question rows across 36
 * distinct `user_id`s and not one of them was a reader.** They were deleted on Erik's authorisation;
 * this is what stops the next run from recreating them.
 *
 * ── WHY A CLIENT-ASSERTED HEADER IS ENOUGH, AND WHERE ITS LIMIT IS ──────────────────────────────
 *
 * Anyone can send this header. That is a deliberate acceptance, not an oversight, and it is safe for
 * one reason: **the header can only ever cause LESS to be stored, never more, and it cannot change a
 * single byte of the answer.** A visitor who sends it has opted out of having their question kept —
 * which is a privacy affordance, not an attack. The failure it admits is under-counting reader
 * traffic; the failure it prevents is counting an instrument AS reader traffic, which has already
 * happened and produced a table that was 100% wrong.
 *
 * It must NEVER be extended into anything that grants access, relaxes a guard, or selects a code
 * path the reader's request cannot select. The moment a client-asserted header does any of that, its
 * unauthenticated nature stops being harmless. Suppressing one D1 write is the whole mandate.
 */
export const PROBE_HEADER = "X-QuranKu-Probe";

/**
 * True when the caller has declared itself an instrument.
 *
 * Header presence alone is NOT the test — an empty or whitespace-only value is what a misconfigured
 * client sends, and treating that as "this is a probe" would silently stop logging real traffic for
 * anyone whose proxy adds bare headers. The value must be `1`.
 */
export function isProbeRequest(request: Request): boolean {
  return request.headers.get(PROBE_HEADER)?.trim() === "1";
}
