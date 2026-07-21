/**
 * Model providers, OpenAI-compatible. Both OpenRouter (DeepSeek V4 Flash by default) and SEA-LION
 * speak the same chat-completions shape, so one call function serves both — flip `provider` to
 * A/B them without touching the handlers.
 *
 * The API key NEVER appears here as a literal. It arrives from the Worker's encrypted secrets
 * (`env.OPENROUTER_API_KEY` / `env.SEALION_API_KEY`) — set once with `wrangler secret put`, never in
 * code, never in git, never in the browser bundle.
 */
import type { Env } from "./index.ts";

export type ProviderName = "openrouter" | "sealion";

interface ProviderConfig {
  readonly url: string;
  readonly apiKey: string;
  readonly model: string;
  readonly headers: Record<string, string>;
}

/** Default runtime model — cheap, strong, decent Bahasa Indonesia. Overridable via env. */
const DEFAULT_OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";
// TODO(F-MODEL-WIRING): confirm the exact SEA-LION base URL and model slug against sea-lion.ai docs
// before relying on this path. SEA-LION is the optional Indonesian specialist; OpenRouter is primary.
const DEFAULT_SEALION_BASE_URL = "https://api.sea-lion.ai/v1/chat/completions";
const DEFAULT_SEALION_MODEL = "aisingapore/Gemma-SEA-LION-v3-9B-IT";

export function resolveProvider(name: ProviderName, env: Env): ProviderConfig {
  if (name === "sealion") {
    const apiKey = env.SEALION_API_KEY;
    if (!apiKey) throw new Error("SEALION_API_KEY is not set");
    return {
      url: env.SEALION_BASE_URL ?? DEFAULT_SEALION_BASE_URL,
      apiKey,
      model: env.SEALION_MODEL ?? DEFAULT_SEALION_MODEL,
      headers: {},
    };
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey,
    model: env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
    // OpenRouter asks for these for attribution/ranking; harmless and polite.
    headers: {
      "HTTP-Referer": "https://new-quranku.axiara.ai",
      "X-Title": "New-Quranku",
    },
  };
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * One chat-completions call. Throws on any non-2xx or malformed response — the caller catches and
 * falls back to the deterministic path, so a down model or a bad key degrades the experience, never
 * breaks it.
 */
export async function callChatModel(
  cfg: ProviderConfig,
  system: string,
  user: string,
  opts: { temperature: number; maxTokens: number; reasoning?: "none" },
): Promise<string> {
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...cfg.headers,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      // REASONING OFF, where the call does not want thinking (2026-07-22).
      //
      // The configured model (deepseek-v4-flash) is a REASONING model. Measured on the live
      // endpoint, the two small-budget calls were silently destroyed by it: /api/classify
      // (80 tokens) returned `{"themes":[]}` on every single call — model theme-understanding was
      // dead in production and grounding ran on keywords alone — and /api/compose (160 tokens)
      // came back cut mid-word ("Capek bang", "…apalagi kalau semu") or empty, which the caller
      // then reported as a wall-rejection. /api/answer at 520 tokens was unaffected, which is what
      // pinned the cause to budget rather than prompt.
      //
      // OpenRouter's docs claim reasoning tokens do not consume the `max_tokens` response budget,
      // but they also require max_tokens to exceed the reasoning budget — and the observed
      // behaviour is unambiguous. So both levers are pulled: ask for no thinking here, AND stop
      // running these budgets near the line (see FRAMING_PARAMS / THEME params). A warmth sentence
      // and a label pick do not need a chain of thought.
      ...(opts.reasoning === "none" ? { reasoning: { effort: "none" } } : {}),
    }),
  });

  if (!res.ok) throw new Error(`model returned ${res.status}`);
  const data = (await res.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("model returned no content");
  }
  return content.trim();
}
