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
 */
import type { ThemeContext, ThemeModel } from "./theme-understand.ts";

const CLASSIFY_ENDPOINT = "/api/classify";
const TIMEOUT_MS = 3000;

export const liveThemeModel: ThemeModel = async (ctx: ThemeContext): Promise<string[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
  } finally {
    clearTimeout(timer);
  }
};
