/**
 * The live theme classifier — the browser half of the input understander. It POSTs the question +
 * the closed corpus theme set to the edge Worker's `/api/classify`, which calls the model and
 * guards the result to the closed set.
 *
 * PURE UPSIDE + SAFE BEFORE DEPLOY. Any non-answer — endpoint 404s, model down, empty result, or
 * timeout — throws, and `understandThemes` catches it and returns its keyword fallback ([]), so
 * `retrieve()`'s own keyword pass stands alone. The model can only ADD themes the keywords missed.
 *
 * Tighter timeout than compose: this call BLOCKS retrieval (themes must be known before scoring),
 * so a slow classifier delays the answer. Past the cap we drop it and retrieve on keywords alone.
 *
 * ── THE CAP WAS INSIDE THE DISTRIBUTION IT WAS MEANT TO BOUND (ISC-658) ─────────────────────────
 *
 * It was 3000 ms. Measured against prod on 2026-08-26, eight consecutive runs of the one probe
 * question that produces themes (`bolehkah aku pacaran`): 0.93, 1.04, 1.47, 2.41, 2.60, 2.64, 2.68,
 * **3.36** s. So one result in eight was aborted and thrown away, and six of the other seven landed
 * within 600 ms of the cap — the cap was not bounding a tail, it was cutting into the body.
 *
 * That is worse than it sounds, because `main.ts` calls this ONLY when `keywordThemeHits(q).size
 * === 0` and passes `() => []` as the fallback. The model is therefore the SOLE source of themes for
 * exactly the questions the keyword lexicon already missed, and an abort leaves that reader with
 * none at all. Erik ruled 5000 ms on 2026-08-26: it clears the whole measured body with margin, and
 * the added wait lands only on the model path.
 *
 * ── AN ABORT IS NOT AN EMPTY RESULT, AND USED TO BE INDISTINGUISHABLE FROM ONE ──────────────────
 *
 * A timeout, a thrown call, a guard drop and an honest "nothing matched" all ended as the same
 * `[]`. Three cycles of probe output reported "0 themes on 14 of 16 turns" as an alarm that nobody
 * could act on, because the number could not separate a broken classifier from a working one
 * answering ruling questions against an emotional vocabulary. The fallback behaviour is unchanged —
 * the caller still degrades to keywords — but the failure can now be COUNTED.
 */
import type { ThemeContext, ThemeModel } from "./theme-understand.ts";

const CLASSIFY_ENDPOINT = "/api/classify";

/**
 * How long the browser will wait for the classifier before retrieving on keywords alone.
 *
 * EXPORTED ON PURPOSE. A probe or a runbook that repeats the number as a literal drifts from the
 * one the browser actually uses, and then asserts on its own copy — so this binding is the only
 * place it exists.
 */
export const CLASSIFY_TIMEOUT_MS = 5000;

/** Marker for the one failure that means "we may have thrown a real answer away". */
const TIMEOUT_MARK = "classify timed out";

/**
 * Did this failure come from the cap, rather than from a 404, a 500 or a bad shape?
 *
 * The distinction is the point: a predicate that answers true for every failure measures nothing.
 * That is the shape the runner's `signalCode !== null` had, which reported every death as a timeout
 * and destroyed the evidence underneath.
 */
export function isClassifyTimeout(err: unknown): boolean {
  return err instanceof Error && err.message.includes(TIMEOUT_MARK);
}

export const liveThemeModel: ThemeModel = async (ctx: ThemeContext): Promise<string[]> => {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLASSIFY_TIMEOUT_MS);
  try {
    const res = await fetch(CLASSIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: ctx.question, themes: ctx.themes }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/classify returned ${res.status}`);
    const data = (await res.json()) as { themes?: unknown };
    if (!Array.isArray(data.themes)) throw new Error("no themes");
    return data.themes.filter((t): t is string => typeof t === "string");
  } catch (err) {
    // The flag, not the error's name: `AbortError` is also what a caller-supplied signal produces,
    // and a fetch can reject with an AbortError for reasons that are not this timer.
    if (timedOut || (err instanceof Error && err.name === "AbortError")) {
      throw new Error(`${TIMEOUT_MARK} after ${CLASSIFY_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
