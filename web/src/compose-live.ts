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
/** The framing is garnish; the verses are the point. Cap the wait so a slow model never holds the
 * answer hostage — past this we fall back and move on. */
const TIMEOUT_MS = 4000;

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
