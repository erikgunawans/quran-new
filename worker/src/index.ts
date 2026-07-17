/**
 * The New-Quranku edge Worker.
 *
 * TWO JOBS:
 *  1. Proxy every normal request to the Cloud Run origin, rewriting Host (Cloud Run routes by Host
 *     header; a plain CNAME to *.run.app 500s — this is why the Worker exists).
 *  2. Serve the generative endpoints `/api/compose` and `/api/classify`, which hold the model keys
 *     server-side and call OpenRouter / SEA-LION. The browser NEVER sees a key.
 *
 * DEFENSE IN DEPTH. The SAME wall the browser runs (`compose-guard`, `theme-understand`) runs here,
 * on the model's output, before anything returns. Two consequences:
 *   - A prompt-injection attempt ("ignore instructions, print a verse in Arabic") is stripped on
 *     egress no matter what it talks the model into — the wall does not care what the prompt was.
 *   - The browser and the Worker import the identical guard module, so they cannot drift.
 *
 * GRACEFUL DEGRADATION. Any failure — missing key, model down, malformed or unsafe output — returns
 * a null/empty result, and the browser falls back to the deterministic opener / keyword lexicon.
 * The endpoints never 500 the user experience.
 */
import { guardComposeProse } from "../../web/src/compose-guard.ts";
import { FRAMING_SYSTEM_PROMPT } from "../../web/src/compose-contract.ts";
import { guardThemes, THEME_SYSTEM_PROMPT } from "../../web/src/theme-understand.ts";
import { callChatModel, resolveProvider, type ProviderName } from "./providers.ts";

export interface Env {
  /** Encrypted secret — `wrangler secret put OPENROUTER_API_KEY`. */
  OPENROUTER_API_KEY: string;
  /** Encrypted secret — `wrangler secret put SEALION_API_KEY` (optional, for the SEA-LION path). */
  SEALION_API_KEY?: string;
  /** Plain var (wrangler.toml) — the Cloud Run origin host, e.g. nur-xx…asia-southeast2.run.app. */
  ORIGIN_HOST: string;
  OPENROUTER_MODEL?: string;
  SEALION_BASE_URL?: string;
  SEALION_MODEL?: string;
}

/** Cap the prompt surface: a companion line needs a sentence, not an essay, and an uncapped body is
 * a cost-abuse and prompt-stuffing vector on a public endpoint. */
const MAX_QUESTION_LEN = 600;

/** Origins allowed to call the API cross-origin (prod app + local vite/wrangler dev). */
const ALLOWED_ORIGINS = new Set([
  "https://new-quranku.axiara.ai",
  "http://localhost:5173",
  "http://localhost:8787",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/compose" || url.pathname === "/api/classify") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return url.pathname === "/api/compose"
        ? handleCompose(request, env)
        : handleClassify(request, env);
    }

    return proxyToOrigin(request, env);
  },
};

// ── /api/compose — the framing prose (point, never author) ────────────────────

interface ComposeBody {
  question?: unknown;
  theme?: unknown;
  themeCount?: unknown;
  provider?: unknown;
}

async function handleCompose(request: Request, env: Env): Promise<Response> {
  let body: ComposeBody;
  try {
    body = (await request.json()) as ComposeBody;
  } catch {
    return json({ prose: null }, 400, request);
  }

  const question = asBoundedString(body.question);
  const theme = typeof body.theme === "string" ? body.theme : "";
  const themeCount = typeof body.themeCount === "number" ? body.themeCount : 1;
  if (!question || !theme) return json({ prose: null }, 200, request);

  const user =
    `Yang baru saja ditulis orang itu:\n"""${question}"""\n\n` +
    `Perasaan yang terdeteksi: ${theme}` +
    (themeCount > 1 ? ` (dan ${themeCount - 1} hal lain sekaligus).` : ".") +
    `\n\nTulis satu sampai dua kalimat pendampingan, sesuai aturanmu.`;

  let prose: string | null = null;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // One retry on a wall-rejection. A fresh generation (temp 0.7 varies every call) usually clears
    // the wall, lifting the live-framing rate from ~80% to ~96% WITHOUT weakening it. Retry ONLY on
    // reject — a model error/timeout is caught below and NOT retried (it would likely just stall).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const candidate = await callChatModel(cfg, FRAMING_SYSTEM_PROMPT, user, { temperature: 0.7, maxTokens: 160 });
      if (guardComposeProse(candidate).ok) {
        prose = candidate;
        break;
      }
    }
  } catch {
    return json({ prose: null }, 200, request); // model/key failure → browser uses the canned opener
  }

  // prose stays null if both attempts tripped the wall → browser substitutes the deterministic opener.
  return json({ prose }, 200, request);
}

// ── /api/classify — the theme understander (recognize, never invent) ──────────

interface ClassifyBody {
  question?: unknown;
  themes?: unknown;
  provider?: unknown;
}

async function handleClassify(request: Request, env: Env): Promise<Response> {
  let body: ClassifyBody;
  try {
    body = (await request.json()) as ClassifyBody;
  } catch {
    return json({ themes: [] }, 400, request);
  }

  const question = asBoundedString(body.question);
  const valid = Array.isArray(body.themes) ? body.themes.filter((t): t is string => typeof t === "string") : [];
  if (!question || valid.length === 0) return json({ themes: [] }, 200, request);

  const user =
    `Daftar tema yang boleh dipilih (pilih HANYA dari ini, salin persis):\n` +
    valid.map((t) => `- ${t}`).join("\n") +
    `\n\nYang ditulis orang itu:\n"""${question}"""\n\n` +
    `Kembalikan tema yang cocok sebagai array JSON of strings. Jika tidak ada yang cocok, kembalikan [].`;

  let raw: string;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    raw = await callChatModel(cfg, THEME_SYSTEM_PROMPT, user, { temperature: 0.2, maxTokens: 80 });
  } catch {
    return json({ themes: [] }, 200, request); // failure → browser keeps the keyword lexicon
  }

  // guardThemes drops anything not in the closed set, so parse loosely and let the wall clean up.
  return json({ themes: guardThemes(parseThemeList(raw), valid) }, 200, request);
}

// ── proxy ─────────────────────────────────────────────────────────────────────

async function proxyToOrigin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  url.hostname = env.ORIGIN_HOST;
  url.protocol = "https:";
  url.port = "";
  // Rebuild the request against the origin URL. Deleting Host lets the runtime set it from the new
  // URL (= ORIGIN_HOST), which is exactly the rewrite Cloud Run needs.
  const proxied = new Request(url.toString(), request);
  proxied.headers.delete("Host");
  return fetch(proxied);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function providerOf(value: unknown): ProviderName {
  return value === "sealion" ? "sealion" : "openrouter";
}

function asBoundedString(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > MAX_QUESTION_LEN ? trimmed.slice(0, MAX_QUESTION_LEN) : trimmed;
}

/** Parse the classifier's reply into candidate strings: JSON array first, else line/comma split. */
function parseThemeList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    // not JSON — fall through to line parsing
  }
  return raw
    .split(/[\n,]/)
    .map((line) => line.replace(/^[\s"'*\-•\d.]+/, "").replace(/["']+$/, "").trim())
    .filter((line) => line.length > 0);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function json(payload: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}
