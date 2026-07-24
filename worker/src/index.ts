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
import { FRAMING_SYSTEM_PROMPT, FRAMING_PARAMS, buildFramingUserMessage } from "../../web/src/compose-contract.ts";
import { guardThemes, THEME_SYSTEM_PROMPT } from "../../web/src/theme-understand.ts";
import { guardAnswerProse } from "../../web/src/answer-guard.ts";
import { isRealAyah } from "../../web/src/quran.ts";
import { hashGrounding } from "../../web/src/grounding-digest.ts";
import {
  ANSWER_PARAMS,
  buildAnswerUserMessage,
  SYNTHESIS_SYSTEM_PROMPT,
  type GroundingEntry,
  type GroundingVerse,
} from "../../web/src/answer-contract.ts";
import { callChatModel, resolveProvider, type ProviderName } from "./providers.ts";
import { ensureIdentity, withIdentityCookie, type Identity } from "./identity.ts";
import {
  recordEvent,
  addBookmark,
  removeBookmark,
  addNote,
  setReadingPosition,
  getBookmarks,
  getNotes,
  getReadingPosition,
  getQuestions,
  type D1Database,
} from "./store.ts";
import { maybeDistill, readProfile, type KVNamespace } from "./distill.ts";

export interface Env {
  /** Encrypted secret — `wrangler secret put OPENROUTER_API_KEY`. */
  OPENROUTER_API_KEY: string;
  /** Encrypted secret — `wrangler secret put SEALION_API_KEY` (optional, for the SEA-LION path). */
  SEALION_API_KEY?: string;
  /** Plain var (wrangler.toml) — the Cloud Run origin host, e.g. nur-xx…asia-southeast2.run.app.
   *  Retained for the proxy path (proxyToOrigin) so reverting to Cloud Run is a one-line change. */
  ORIGIN_HOST: string;
  /** Static-assets binding (web/dist). Serves the SPA straight from Cloudflare's edge — the app is
   *  100% static, so this replaces the Cloud Run backend. Revert = drop [assets] + proxyToOrigin. */
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENROUTER_MODEL?: string;
  SEALION_BASE_URL?: string;
  SEALION_MODEL?: string;
  /** Which edition this deploy is — "synthesis" unlocks /api/answer. Absent/"principled" keeps the
   *  authoring endpoint dark, so the trustworthy deploy can never author even via a direct POST. */
  EDITION?: string;
  /** Encrypted secret — `wrangler secret put IDENTITY_HMAC_SECRET --env demo`. Keys the signed
   *  anonymous-identity cookie (issue 01). Absent → identity degrades off (no cookie), app unaffected. */
  IDENTITY_HMAC_SECRET?: string;
  /** D1 binding (wrangler.toml [[env.demo.d1_databases]]) — the personalized-memory raw truth layer
   *  (issue 02). Absent → memory writes degrade to no-ops, app unaffected. */
  DB?: D1Database;
  /** KV binding (wrangler.toml [[env.demo.kv_namespaces]]) — the derived profile (issue 04). Absent →
   *  distillation is a no-op, app unaffected. */
  PROFILE_KV?: KVNamespace;
}

/** Minimal ExecutionContext — inline (Worker keeps `types: []`). `waitUntil` defers memory writes so
 *  they never delay the user's response. */
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** Cap the prompt surface: a companion line needs a sentence, not an essay, and an uncapped body is
 * a cost-abuse and prompt-stuffing vector on a public endpoint. */
const MAX_QUESTION_LEN = 600;

/** Origins allowed to call the API cross-origin (both prod editions + local vite/wrangler dev). */
const ALLOWED_ORIGINS = new Set([
  "https://new-quranku.axiara.ai",
  "https://new-quranku-ai.axiara.ai",
  "https://demo-quranku.axiara.ai",
  "http://localhost:5173",
  "http://localhost:8787",
]);

/** Bound the synthesis grounding: a public endpoint must cap how much it will feed the model. */
const MAX_GROUNDING_ITEMS = 8;
const MAX_GROUNDING_TEXT = 800;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Anonymous identity (issue 01): resolve or mint the signed `qk_uid` before routing, then attach
    // any fresh cookie to whatever response the route produces — so it lands on API and asset paths alike.
    const identity = await ensureIdentity(request, env.IDENTITY_HMAC_SECRET);
    const response = await route(request, env, ctx, identity);
    return withIdentityCookie(response, identity);
  },
};

async function route(request: Request, env: Env, ctx: ExecutionContext, identity: Identity): Promise<Response> {
    const url = new URL(request.url);

    // Identity beacon (issue 01): an uncacheable worker path the SPA pings on load, so a fresh visitor
    // gets their signed cookie even though the static HTML shell is served (cookie-free) straight from
    // the edge cache and never runs the Worker. The cookie itself is attached by withIdentityCookie.
    if (url.pathname === "/api/identity") {
      // Session start → re-distill the profile if there's new activity (issue 04). Deferred via
      // waitUntil so it never blocks the beacon; maybeDistill skips itself when nothing is new.
      if (env.DB && env.PROFILE_KV && identity.userId) {
        ctx.waitUntil(maybeDistill(env, identity.userId, Date.now()).catch(() => {}));
      }
      return json({ ok: true }, 200, request);
    }

    // Derived profile read-back (issue 04): the billboard-safe interest tags + summary. Per-user,
    // never cached. Powers T5 discovery and the user-visible "what we remember" surface (issue 08).
    if (url.pathname === "/api/profile") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "GET") return json({ error: "GET only" }, 405, request);
      if (!identity.userId) return noStore(json({ profile: null }, 200, request));
      return noStore(json({ profile: await readProfile(env, identity.userId) }, 200, request));
    }

    // Memory writes (issue 02): the SPA logs reads/bookmarks/notes/positions here. Client-driven, so it
    // rides an /api/* path (the static shell bypasses the Worker — see memory: demo-worker-edge-bypass).
    if (url.pathname === "/api/events") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return handleEvents(request, env, identity);
    }

    // Memory read-back (issue 03): the user's own bookmarks, notes, question history, reading position.
    // Zero inference — pure raw-layer reads. Per-user, so never cacheable.
    if (url.pathname === "/api/memory") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "GET") return json({ error: "GET only" }, 405, request);
      return handleMemoryRead(request, env, identity);
    }

    if (url.pathname === "/api/compose" || url.pathname === "/api/classify" || url.pathname === "/api/answer") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      if (url.pathname === "/api/compose") return handleCompose(request, env);
      if (url.pathname === "/api/answer") return handleAnswer(request, env, ctx, identity);
      return handleClassify(request, env);
    }

    // The app is 100% static — serve web/dist straight from Cloudflare's edge (no Cloud Run).
    // not_found_handling = "single-page-application" makes unmatched paths return index.html.
    // (proxyToOrigin is kept below, unused, so reverting to the Cloud Run backend is a one-liner.)
    const response = await env.ASSETS.fetch(request);

    // The hashed bundles (/assets/index-<hash>.js|css) are immutable — keep them cached at the edge
    // forever. But index.html is the SPA shell that POINTS at the current hash. If the zone edge caches
    // the shell, a fresh deploy uploads a new bundle yet users keep getting the old shell → old bundle
    // until the cache expires (this bit us: b508f31 uploaded, but `/` served the stale shell). Tell
    // Cloudflare's edge to revalidate the HTML every time — browser Cache-Control and hashed assets are
    // untouched, so every future deploy goes live at once with no manual purge.
    if ((response.headers.get("Content-Type") ?? "").includes("text/html")) {
      const fresh = new Response(response.body, response);
      fresh.headers.set("Cloudflare-CDN-Cache-Control", "no-cache");
      return fresh;
    }
    return response;
}

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

  const user = buildFramingUserMessage({ question, theme, themeCount });

  let prose: string | null = null;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // One retry on a wall-rejection. A fresh generation (temp 0.7 varies every call) usually clears
    // the wall, lifting the live-framing rate from ~80% to ~96% WITHOUT weakening it. Retry ONLY on
    // reject — a model error/timeout is caught below and NOT retried (it would likely just stall).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const candidate = await callChatModel(cfg, FRAMING_SYSTEM_PROMPT, user, FRAMING_PARAMS);
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

// ── /api/answer — the app's warm authored answer (ustadz voice) ───────────────
//
// The MODEL leads here (the opposite of /api/compose): it answers warmly and may cite ANY real ayah,
// for which the app renders its own translation. The grounding the caller supplies is PREFERRED
// context, not a fence, and is still verified verbatim-ours (verifyGrounding) so no forged scholarship
// reaches the model. The SAME guard the browser runs (answer-guard) runs here on egress: no Arabic,
// no fatwa verdict, and every cited reference must resolve to a REAL ayah (isRealAyah) — a non-existent
// citation sinks the answer. A rejected or failed generation returns {answer:null} and the browser
// falls back to the principled behaviour. One retry on a guard reject, like compose.

interface AnswerBody {
  question?: unknown;
  verses?: unknown;
  entries?: unknown;
  provider?: unknown;
}

/** Coerce + bound the grounding the browser sent. A public endpoint trusts nothing about its size. */
function sanitizeGrounding(raw: unknown, withName: boolean): (GroundingVerse | GroundingEntry)[] {
  if (!Array.isArray(raw)) return [];
  const out: (GroundingVerse | GroundingEntry)[] = [];
  for (const item of raw.slice(0, MAX_GROUNDING_ITEMS)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const ref = typeof o.ref === "string" ? o.ref.slice(0, 40) : "";
    const text = typeof o.text === "string" ? o.text.slice(0, MAX_GROUNDING_TEXT) : "";
    if (!ref || !text) continue;
    if (withName) out.push({ ref, surah_name: typeof o.surah_name === "string" ? o.surah_name.slice(0, 60) : "", text });
    else out.push({ ref, text });
  }
  return out;
}

/**
 * The set of hashes proving a grounding item is real. Fetched once per isolate, then reused.
 *
 * Module scope survives across requests in a warm isolate, so the 39 KB digest is paid for on a cold
 * start and never again. A failed fetch is NOT cached, so a transient miss self-heals next request.
 */
let groundingDigest: Set<string> | null = null;

async function loadGroundingDigest(env: Env): Promise<Set<string> | null> {
  if (groundingDigest) return groundingDigest;
  try {
    const res = await env.ASSETS.fetch(new Request("https://assets.local/grounding-digest.json"));
    if (!res.ok) return null;
    const body = (await res.json()) as { hashes?: unknown };
    if (!Array.isArray(body.hashes) || body.hashes.length === 0) return null;
    groundingDigest = new Set(body.hashes as string[]);
    return groundingDigest;
  } catch {
    return null;
  }
}

/**
 * Drop any grounding the browser sent that is not verbatim ours.
 *
 * `sanitizeGrounding` above bounds the input; this establishes that it is REAL. Without it a caller
 * could POST invented scholar entries and receive a fluent answer built on them — and the egress guard
 * is powerless there by construction, since it whitelists citations against the submitted grounding,
 * so forged grounding whitelists its own citations.
 *
 * Hashing ref+text together is the point. A real reference carrying invented words is the dangerous
 * case: 2:255 exists, and it is the sentence bolted onto it that would be screenshotted.
 *
 * FAILS CLOSED. If the digest cannot be loaded we return nothing, every item is dropped, and the
 * caller falls back to the principled edition — the app's standing rule that synthesis may degrade to
 * the trustworthy edition but must never outrun it.
 */
async function verifyGrounding<T extends { ref: string; text: string }>(items: T[], env: Env): Promise<T[]> {
  if (items.length === 0) return [];
  const digest = await loadGroundingDigest(env);
  if (!digest) return [];
  const ok = await Promise.all(items.map((i) => hashGrounding(i.ref, i.text).then((h) => digest.has(h))));
  return items.filter((_, idx) => ok[idx] === true);
}

async function handleAnswer(request: Request, env: Env, ctx: ExecutionContext, identity: Identity): Promise<Response> {
  // The authoring endpoint exists in one codebase but must only be live on the synthesis edition.
  // On the principled deploy EDITION is unset → this returns null and the app authors nothing.
  if (env.EDITION !== "synthesis") return json({ answer: null }, 200, request);

  let body: AnswerBody;
  try {
    body = (await request.json()) as AnswerBody;
  } catch {
    return json({ answer: null }, 400, request);
  }

  const question = asBoundedString(body.question);

  // Memory (issue 02): log the question to the raw layer — deferred so it never delays the answer, and
  // best-effort so a D1 hiccup can't break the response. Only the question text is stored, no PII.
  if (env.DB && identity.userId && question) {
    ctx.waitUntil(recordEvent(env.DB, identity.userId, "question", { question }, Date.now()).catch(() => {}));
  }
  // Bound it, THEN prove it is ours. Forged grounding is dropped here, before the model ever sees it.
  const verses = await verifyGrounding(sanitizeGrounding(body.verses, true) as GroundingVerse[], env);
  const entries = await verifyGrounding(sanitizeGrounding(body.entries, false) as GroundingEntry[], env);
  // The model now leads and can answer without any grounding, so only the question is required. Empty
  // grounding just means fewer suggested verses, never a refusal.
  if (!question) return json({ answer: null }, 200, request);

  const user = buildAnswerUserMessage({ question, verses, entries });

  let answer: string | null = null;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // One retry on a guard reject (a fresh generation usually clears it), exactly like compose. A
    // model error/timeout is caught below and NOT retried. Citations are validated against the real
    // mushaf (isRealAyah), not the grounding — the model may reach for any ayah, just not a fake one.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const candidate = (await callChatModel(cfg, SYNTHESIS_SYSTEM_PROMPT, user, ANSWER_PARAMS))?.trim();
      if (candidate && guardAnswerProse(candidate, isRealAyah).ok) {
        answer = candidate;
        break;
      }
    }
  } catch {
    return json({ answer: null }, 200, request); // model/key failure → browser falls back to principled
  }

  return json({ answer }, 200, request);
}

// ── /api/events — the memory write path (issue 02) ────────────────────────────

interface EventBody {
  kind?: unknown;
  ref?: unknown;
  text?: unknown;
}

/** Client-driven memory writes: read position, bookmark/unbookmark, note. Keyed by the T1 identity.
 *  Degrades to a no-op (never 500s) when the DB binding or a signed identity is absent. */
async function handleEvents(request: Request, env: Env, identity: Identity): Promise<Response> {
  const userId = identity.userId;
  if (!env.DB || !userId) return json({ ok: false }, 200, request); // memory off → no-op, app unaffected

  let body: EventBody;
  try {
    body = (await request.json()) as EventBody;
  } catch {
    return json({ ok: false }, 400, request);
  }

  const kind = typeof body.kind === "string" ? body.kind : "";
  const ref = typeof body.ref === "string" ? body.ref.slice(0, 32) : "";
  const now = Date.now();

  try {
    switch (kind) {
      case "read":
        if (!ref) return json({ ok: false }, 400, request);
        await setReadingPosition(env.DB, userId, ref, now);
        await recordEvent(env.DB, userId, "read", { ref }, now);
        break;
      case "bookmark":
        if (!ref) return json({ ok: false }, 400, request);
        await addBookmark(env.DB, userId, ref, now);
        break;
      case "unbookmark":
        if (!ref) return json({ ok: false }, 400, request);
        await removeBookmark(env.DB, userId, ref);
        break;
      case "note": {
        const text = typeof body.text === "string" ? body.text : "";
        if (!ref || !text) return json({ ok: false }, 400, request);
        await addNote(env.DB, userId, ref, text, now);
        break;
      }
      default:
        return json({ ok: false, error: "unknown kind" }, 400, request);
    }
  } catch {
    return json({ ok: false }, 200, request); // D1 failure → degrade, never 500 the UX
  }
  return json({ ok: true }, 200, request);
}

// ── /api/memory — the read-back (issue 03), zero inference ─────────────────────

const EMPTY_MEMORY = { bookmarks: [], notes: [], questions: [], position: null };

/** The user's own memory: bookmarks, notes, recent questions, reading position — straight from the raw
 *  layer, no KV, no inference. Per-user → `no-store`. Degrades to empty when DB/identity absent. */
async function handleMemoryRead(request: Request, env: Env, identity: Identity): Promise<Response> {
  const userId = identity.userId;
  const empty = () => noStore(json(EMPTY_MEMORY, 200, request));
  if (!env.DB || !userId) return empty();
  try {
    const [bookmarks, notes, questions, position] = await Promise.all([
      getBookmarks(env.DB, userId),
      getNotes(env.DB, userId),
      getQuestions(env.DB, userId),
      getReadingPosition(env.DB, userId),
    ]);
    return noStore(json({ bookmarks, notes, questions, position }, 200, request));
  } catch {
    return empty();
  }
}

/** Mark a per-user API response uncacheable — a shared edge cache must never hold one user's memory. */
function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return response;
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
    // 80 tokens against a reasoning model returned `[]` on EVERY live call — model theme-under-
    // standing was silently dead in production and every question grounded on the keyword lexicon
    // alone. It failed invisibly because `[]` is also the legitimate "nothing matched" answer, so
    // the degraded path looked exactly like the healthy one. Picking a few labels needs no thinking
    // and no essay, but it does need room to answer at all.
    raw = await callChatModel(cfg, THEME_SYSTEM_PROMPT, user, { temperature: 0.2, maxTokens: 200, reasoning: "none" });
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
