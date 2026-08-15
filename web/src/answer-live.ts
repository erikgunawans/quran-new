/**
 * The live synthesis model — the browser half of the AI-authoring wrap. POSTs the AnswerContext
 * (question + retrieved grounding) to the edge Worker's `/api/answer`, which holds the model key.
 *
 * SAFE BY DEGRADATION. Any non-answer — endpoint 404 (Worker not deployed with this handler), model
 * down, the Worker's guard rejected the output (`{answer:null}`), or timeout — throws, and the
 * orchestrator (answer.ts) catches it and falls back to the principled behaviour.
 */
import type { AnswerContext, AnswerModel, AnswerResult } from "./answer-contract.ts";
import type { AnswerViolationKind } from "./answer-guard.ts";
import type { HadithCard } from "./hadith-card.ts";

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
/**
 * A BACKSTOP, not the reader's wait. Raised 12,000 → 30,000 on 2026-08-15.
 *
 * WHY THE OLD NUMBER COULD NOT BE TUNED. Measured live on prod that day, same payload, 14 samples:
 * 5,479 / 7,535 / 8,051 / 8,195 / 8,259 / 8,292 / 8,423 / 8,482 / 8,487 / 8,873 / 10,300 / 15,947 /
 * 23,782 / 27,293 ms. A median of ~8.45 s with a long, sparse tail. At 12 s the client discarded
 * **3 of 14 answers the server had finished**; at 20 s it would still discard 2, while adding eight
 * seconds to everyone's wait; only 30 s discards none, and nobody should watch a spinner for 27 s.
 * Every value on this axis is bad, which is what said the axis was wrong.
 *
 * SO THE WAIT AND THE DEADLINE WERE SPLIT. `main.ts` shows the reader a real, labelled answer at
 * `FAST_ANSWER_MS` (~9 s, just past the median) and keeps this request alive underneath, upgrading
 * the turn in place when the composed answer lands. This constant therefore no longer governs what
 * anyone waits for — it only stops a genuinely hung request from leaking. Raising it does NOT
 * reintroduce the defect the previous cycle rejected ("a 25 s wait for a refusal is its own
 * defect"), because after ~9 s nobody is waiting on it any more.
 *
 * MUST STAY ABOVE `MODEL_DEADLINE_MS` (25 s, worker/src/providers.ts). The Worker should be the one
 * to give up, because its giving-up is an honest degradation; the client's is a silent substitution
 * we also pay for. If these two ever cross, that inverts.
 */
const TIMEOUT_MS = 30000;

/**
 * Keep only what a hadith card needs, with every field forced to its expected type.
 *
 * The Worker is our own code, but this is a network boundary and the prose it accompanies is
 * model-authored — so the response is treated as untyped input, exactly like the grounding going the
 * other way. A malformed record is DROPPED rather than coerced into a half-empty card: an article
 * with a blank Arabic line and no source URL would be a hadith presented with its provenance
 * missing, which is worse than no card at all.
 */
const asCards = (raw: unknown): HadithCard[] => {
  if (!Array.isArray(raw)) return [];
  const out: HadithCard[] = [];
  for (const r of raw.slice(0, 2) as Record<string, unknown>[]) {
    if (!r || typeof r.id !== "string" || typeof r.arabic !== "string" || !r.arabic) continue;
    if (typeof r.source_url !== "string" || !r.source_url) continue;
    out.push({
      id: r.id,
      arabic: r.arabic,
      english: typeof r.english === "string" ? r.english : "",
      collection: typeof r.collection === "string" ? r.collection : "",
      hadith_number: Number(r.hadith_number) || 0,
      grade: typeof r.grade === "string" ? r.grade : "",
      book_en: typeof r.book_en === "string" ? r.book_en : "",
      bab_en: typeof r.bab_en === "string" ? r.bab_en : "",
      source_url: r.source_url,
      translator: typeof r.translator === "string" ? r.translator : "",
      book: Number(r.book) || 0,
    });
  }
  return out;
};

export const liveAnswerModel: AnswerModel = async (ctx: AnswerContext): Promise<AnswerResult> => {
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
    const data = (await res.json()) as {
      answer?: string | null;
      blocked?: AnswerViolationKind | null;
      hadith?: unknown;
    };
    if (typeof data.answer !== "string" || data.answer.length === 0) {
      // A `blocked` field means the Worker generated prose and its wall refused it. Anything else —
      // no field at all (the principled edition, or a Worker deployed before this change), an
      // unrecognised value, or an empty answer with no reason — stays an anonymous absence and falls
      // back exactly as it does today. Fail toward the old behaviour, never toward a claim.
      if (data.blocked) throw new AnswerBlockedError(data.blocked);
      throw new Error("no answer");
    }
    // `reviewed_id` is unreachable from here BY CONSTRUCTION — `asCards` never writes it and the
    // Worker never sends it. The ustadz-reviewed Indonesian ships from `docs/review/`, in the build,
    // and must never be able to arrive over the wire alongside model-authored prose (ISC-448).
    return { prose: data.answer, hadith: asCards(data.hadith) };
  } finally {
    clearTimeout(timer);
  }
};
