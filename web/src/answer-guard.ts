/**
 * The egress wall for the SYNTHESIS edition's authored answers (new-quranku-ai only).
 *
 * This wall is the INVERSE of compose-guard.ts in one respect and the SAME in another. Authoring is
 * now the point, so the "don't interpret" heuristic is gone. But the two rules that keep an authored
 * answer honest are enforced harder than ever:
 *
 *   - `arabic`     (HARD) — no Arabic script in the prose. Scripture renders as cards from the
 *                  sha256-pinned corpus; the model writes only Indonesian.
 *   - `bad_ref`    (HARD) — every verse reference the model writes MUST be one we handed it as
 *                  grounding. A reference the model produced on its own is, by definition, ungrounded
 *                  — the exact hallucination this whole app refuses. band.ts shipped the wrong verse
 *                  twice; a model does it confidently. So we whitelist: cite only what retrieval found.
 *
 * On ANY violation the caller (answer.ts) discards the answer and the app falls back to the
 * principled behaviour — a pointer or an honest silence. The worst reachable outcome is that the
 * synthesis edition degrades to the trustworthy edition for that one turn, never a fabricated ruling.
 */

export type AnswerViolationKind = "arabic" | "bad_ref";

export interface AnswerViolation {
  readonly kind: AnswerViolationKind;
  readonly detail: string;
}

export interface AnswerGuardResult {
  readonly ok: boolean;
  readonly violations: readonly AnswerViolation[];
}

/** Arabic-script ranges (main, supplement, presentation forms A/B) — same set as compose-guard. */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Any "surah:ayah" reference in the prose (also matches "112.1" and spaced "2 : 255"). */
const REF_IN_PROSE = /\b(\d{1,3})\s*[:.]\s*(\d{1,3})\b/g;

/** Normalise a ref to "surah:ayah" for whitelist comparison (drops a range tail like "112:1-4"). */
const normRef = (surah: string | number, ayah: string | number): string => `${Number(surah)}:${Number(ayah)}`;

/**
 * Guard an authored answer against the grounding it was built from. `allowedRefs` is the set of
 * "surah:ayah" strings for every verse AND scholar entry we handed the model — the only citations it
 * may legitimately produce.
 */
export function guardAnswerProse(prose: string, allowedRefs: ReadonlySet<string>): AnswerGuardResult {
  const violations: AnswerViolation[] = [];

  const arabic = ARABIC.exec(prose);
  if (arabic) violations.push({ kind: "arabic", detail: arabic[0] });

  for (const m of prose.matchAll(REF_IN_PROSE)) {
    const ref = normRef(m[1]!, m[2]!);
    if (!allowedRefs.has(ref)) {
      violations.push({ kind: "bad_ref", detail: ref });
      break; // one ungrounded citation is enough to reject the whole answer
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Return the model's answer only when it clears the wall; otherwise null, so the caller falls back
 * to the principled edition's honest behaviour for this turn.
 */
export function safeAnswer(prose: string, allowedRefs: ReadonlySet<string>): string | null {
  const trimmed = prose.trim();
  if (!trimmed) return null;
  return guardAnswerProse(trimmed, allowedRefs).ok ? trimmed : null;
}

/** Build the whitelist of citable refs from grounding ref strings ("surah:ayah"). */
export const allowedRefsFrom = (refs: Iterable<string>): Set<string> => {
  const set = new Set<string>();
  for (const r of refs) {
    const m = /(\d{1,3})\s*[:.]\s*(\d{1,3})/.exec(r);
    if (m) set.add(normRef(m[1]!, m[2]!));
  }
  return set;
};
