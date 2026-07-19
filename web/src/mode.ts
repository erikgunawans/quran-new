/**
 * The answer-mode switch — the one bit that makes New-Quranku two apps from one codebase.
 *
 *   "principled" (default)  — the app authors NOTHING. Feelings → retrieval + a pointing framing;
 *                             theology/definitional → the ustadz's reviewed words or an honest
 *                             pointer. This is the deployed identity at new-quranku.axiara.ai.
 *
 *   "synthesis"             — the AI-authoring alternative (Erik's second direction, deliberately a
 *                             180° reversal). The MODEL composes a grounded answer to any question,
 *                             citing ONLY the verses/KB we retrieved, labelled AI-composed (never a
 *                             fatwa, never attributed to a scholar). Deploys separately to
 *                             new-quranku-ai.axiara.ai. See answer.ts / answer-contract.ts.
 *
 * Set at BUILD time: `VITE_ANSWER_MODE=synthesis bun run build`. Absent (tests, the default build,
 * the principled deploy) → "principled". Guarded so it is safe under bun/Node where import.meta.env
 * does not exist.
 */
export type AnswerMode = "principled" | "synthesis";

function readMode(): AnswerMode {
  try {
    // Vite inlines import.meta.env at build; under bun test it is undefined → default principled.
    const v = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_ANSWER_MODE;
    return v === "synthesis" ? "synthesis" : "principled";
  } catch {
    return "principled";
  }
}

export const ANSWER_MODE: AnswerMode = readMode();

export const isSynthesis = (): boolean => ANSWER_MODE === "synthesis";
