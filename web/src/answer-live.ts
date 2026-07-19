/**
 * The live synthesis model — the browser half of the AI-authoring wrap. POSTs the AnswerContext
 * (question + retrieved grounding) to the edge Worker's `/api/answer`, which holds the model key.
 *
 * SAFE BY DEGRADATION. Any non-answer — endpoint 404 (Worker not deployed with this handler), model
 * down, the Worker's guard rejected the output (`{answer:null}`), or timeout — throws, and the
 * orchestrator (answer.ts) catches it and falls back to the principled behaviour.
 */
import type { AnswerContext, AnswerModel } from "./answer-contract.ts";

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
    const data = (await res.json()) as { answer?: string | null };
    if (typeof data.answer !== "string" || data.answer.length === 0) throw new Error("no answer");
    return data.answer;
  } finally {
    clearTimeout(timer);
  }
};
