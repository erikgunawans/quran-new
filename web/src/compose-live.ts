/**
 * The live framing model — the browser half of the wrap. It POSTs the ComposeContext (question +
 * theme only, never verse text) to the edge Worker's `/api/compose`, which holds the model key and
 * calls OpenRouter / SEA-LION.
 *
 * SAFE BEFORE DEPLOY. Any non-answer — the endpoint 404s (Worker not yet updated), the model is
 * down, the wall rejected the output (`{prose:null}`), or the call times out — throws, and
 * `composeFraming` catches it and uses the deterministic opener. So this can ship today; the live
 * model simply lights up the moment the Worker is deployed with a key, with zero further changes.
 */
import type { ComposeContext, FramingModel } from "./compose-contract.ts";

const COMPOSE_ENDPOINT = "/api/compose";
/**
 * Cap the wait so a slow model never holds the answer hostage — past this we fall back and move on.
 *
 * Raised 4s → 8s (2026-07-22) when the framing was rewritten to answer the PERSON rather than the
 * theme. Three specific sentences take longer to generate than one generic one: measured on the
 * live endpoint, 2.75s / 5.70s / 2.82s / 2.18s. At 4s that middle call was aborted client-side and
 * the reader got the canned opener — the endpoint was healthy, the prose was good, and it was
 * thrown away at the door. The failure was invisible from the server: /api/compose logged a
 * success for a line nobody ever read.
 *
 * 8s is bearable because the wait is NOT blank — `skeleton()` is already on screen. The older
 * framing of this comment ("the framing is garnish; the verses are the point") is no longer quite
 * true either: since the rewrite the framing is the part that makes the app sound like it heard
 * you, so it is worth a few more seconds than garnish would be.
 *
 * The better fix, deliberately not taken here, is to render the verses immediately and patch the
 * framing in when it lands — no cap needed at all. That is a real change to the turn's render
 * lifecycle, not a constant, so it is left as a follow-up rather than smuggled into a timeout bump.
 */
const TIMEOUT_MS = 8000;

export const liveFramingModel: FramingModel = async (ctx: ComposeContext): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(COMPOSE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: ctx.question,
        theme: ctx.theme,
        themeCount: ctx.themeCount,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/compose returned ${res.status}`);
    const data = (await res.json()) as { prose?: string | null };
    // `prose: null` means the Worker's wall rejected the model output — treat as "no framing" and
    // let composeFraming fall back to the honest canned line.
    if (typeof data.prose !== "string" || data.prose.length === 0) throw new Error("no prose");
    return data.prose;
  } finally {
    clearTimeout(timer);
  }
};
