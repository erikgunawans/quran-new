/**
 * The live synthesis model — the browser half of the AI-authoring wrap. POSTs the AnswerContext
 * (question + retrieved grounding) to the edge Worker's `/api/answer`, which holds the model key.
 *
 * SAFE BY DEGRADATION. Any non-answer — endpoint 404 (Worker not deployed with this handler), model
 * down, the Worker's guard rejected the output (`{answer:null}`), or timeout — throws, and the
 * orchestrator (answer.ts) catches it and falls back to the principled behaviour.
 */
import type { AnswerContext, AnswerModel } from "./answer-contract.ts";
import type { AnswerViolationKind } from "./answer-guard.ts";

/**
 * The Worker had an answer and its own egress wall refused it — thrown so the reason survives the
 * `AnswerModel` contract, which can only return prose or throw.
 *
 * This is NOT the same event as "the model was down" or "there was nothing to ground on", and the
 * distinction is the whole point: those are absences, this is a refusal. The orchestrator turns a
 * refusal into a pointer and an absence into the principled fallback. Before this type existed both
 * arrived as `new Error("no answer")` and the reader got identical copy for a corpus gap and a
 * deliberate withhold.
 */
export class AnswerBlockedError extends Error {
  constructor(readonly by: AnswerViolationKind) {
    super(`/api/answer blocked by ${by}`);
    this.name = "AnswerBlockedError";
  }
}

const ANSWER_ENDPOINT = "/api/answer";
/** A real answer is worth a longer wait than a one-line framing, but still bounded so a stalled
 *  model never holds the thread hostage. */
const TIMEOUT_MS = 12000;

export const liveAnswerModel: AnswerModel = async (ctx: AnswerContext): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ANSWER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ctx.question, verses: ctx.verses, entries: ctx.entries }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/answer returned ${res.status}`);
    const data = (await res.json()) as { answer?: string | null; blocked?: AnswerViolationKind | null };
    if (typeof data.answer !== "string" || data.answer.length === 0) {
      // A `blocked` field means the Worker generated prose and its wall refused it. Anything else —
      // no field at all (the principled edition, or a Worker deployed before this change), an
      // unrecognised value, or an empty answer with no reason — stays an anonymous absence and falls
      // back exactly as it does today. Fail toward the old behaviour, never toward a claim.
      if (data.blocked) throw new AnswerBlockedError(data.blocked);
      throw new Error("no answer");
    }
    return data.answer;
  } finally {
    clearTimeout(timer);
  }
};
