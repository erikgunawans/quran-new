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
  opts: { temperature: number; maxTokens: number },
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
