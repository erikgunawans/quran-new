/**
 * OpenRouter client — minimal, plain `fetch`, no SDK dependency.
 *
 * Matches this repo's existing ingest style (`src/ingest/fetch.ts` is plain fetch too, no HTTP
 * client library) rather than pulling in `openai` or a bespoke SDK for one endpoint. OpenRouter
 * exposes an OpenAI-compatible `/chat/completions` route across many providers under one key —
 * https://openrouter.ai/docs.
 *
 * ONLY ever called from build-time scripts (`src/app/build-graph-derived.ts`). Never imported by
 * anything under `web/` — Nur's live retrieval path has no generative model in it, by design
 * (ISA.md § Constraints), and that must stay true regardless of what this file can do.
 */
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  /** Ask for strict JSON output. Not all OpenRouter-routed models honor this equally — the
   * caller must still validate the response, never trust the flag alone. */
  json?: boolean;
}

export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add a key from https://openrouter.ai/keys.",
    );
  }

  const model = opts.model ?? process.env["OPENROUTER_MODEL"] ?? DEFAULT_MODEL;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter's own attribution headers — optional, harmless, not a real referrer check.
      "HTTP-Referer": "https://github.com/erikgunawans/quran-new",
      "X-Title": "Nur — knowledge graph extraction (build-time only)",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message: string };
  };
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty completion");
  return content;
}
