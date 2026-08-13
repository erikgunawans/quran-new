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
import {
  guardAnswerProse,
  groundedHadithFrom,
  markersInProse,
  type AnswerViolationKind,
} from "../../web/src/answer-guard.ts";
import { isRealAyah } from "../../web/src/quran.ts";
import { hashGrounding } from "../../web/src/grounding-digest.ts";
import {
  ANSWER_PARAMS,
  buildAnswerUserMessage,
  hasGrounding,
  SYNTHESIS_SYSTEM_PROMPT,
  type GroundingEntry,
  type GroundingHadith,
  type GroundingVerse,
} from "../../web/src/answer-contract.ts";
import { capForDisplay, fetchDisplayRecords, searchDalil, type DalilEnv, type DalilHit } from "./dalil.ts";
import type { HadithCard } from "../../web/src/hadith-card.ts";
import { callChatModel, resolveProvider, type ProviderName } from "./providers.ts";
import { ensureIdentity, withIdentityCookie, cookieFor, type Identity } from "./identity.ts";
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
  deleteUser,
  linkAccount,
  type D1Database,
} from "./store.ts";
import { maybeDistill, readProfile, deleteProfile, type KVNamespace } from "./distill.ts";
import { isValidEmail, normalizeEmail, signMagicToken, verifyMagicToken, sendMagicLink } from "./auth.ts";

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
  /** R2 binding (wrangler.toml top-level [[r2_buckets]]) — the full 6,236-ayah recitation, keys
   *  `{surah}/{ayah}.mp3`. Absent → /audio/* degrades to the 22-file static sample in web/dist,
   *  which is exactly today's behaviour. env blocks do NOT inherit this, so synthesis and demo
   *  keep the sample and nothing about them changes. */
  AUDIO?: R2Bucket;
  /**
   * The DALIL surface — hadith retrieval. All three are OPTIONAL and checked together at the call
   * site: absent, `/api/answer` runs exactly as it did before this cycle (Qur'an grounding only,
   * every prophetic attribution refused). That is the designed degradation, not a gap — `dalil.ts`
   * throws loudly rather than guessing, and the caller falls back to the Qur'an path.
   *
   * They live at the TOP LEVEL of wrangler.toml, which is prod. `[env]` blocks do not inherit
   * top-level bindings, so `--env synthesis` and `--env demo` keep running without them and keep
   * today's behaviour — the same deliberate asymmetry as `AUDIO`.
   */
  VECTORIZE?: DalilEnv["VECTORIZE"];
  CORPUS?: DalilEnv["CORPUS"];
  CORPUS_DIGEST?: string;
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
  /** Encrypted secret — `wrangler secret put RESEND_API_KEY --env demo`. Sends magic-link email
   *  (issue 07). Absent → login is a no-op ("not configured"), app unaffected. */
  RESEND_API_KEY?: string;
  /** Plain var — the magic-link From address, on a Resend-verified domain (e.g. "QuranKu <no-reply@axiara.ai>"). */
  RESEND_FROM?: string;
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

    // Forget me (issue 08): hard-purge everything for this user — D1 rows AND the KV profile. Not
    // soft-delete. The honest, complete control that lets collection stay transparent.
    if (url.pathname === "/api/forget") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return handleForget(request, env, identity);
    }

    // Magic-link login (issue 07): request a link, then verify it to bind this device to an account so
    // memory follows the user across devices. Passwordless, email-only (decision 3 — not Google OAuth).
    if (url.pathname === "/api/auth/request") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return handleAuthRequest(request, env, url);
    }
    if (url.pathname === "/api/auth/verify") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return handleAuthVerify(request, env, identity);
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

    if (
      url.pathname === "/api/compose" ||
      url.pathname === "/api/classify" ||
      url.pathname === "/api/find-surah" ||
      url.pathname === "/api/answer"
    ) {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      if (url.pathname === "/api/compose") return handleCompose(request, env);
      if (url.pathname === "/api/answer") return handleAnswer(request, env, ctx, identity);
      // /api/find-surah is navigation, not authoring — safe on the principled edition. Like
      // /api/classify it recognizes from a CLOSED set (the real 114 surahs the client passes), so
      // the model can never invent a surah that does not exist.
      if (url.pathname === "/api/find-surah") return handleFindSurah(request, env);
      return handleClassify(request, env);
    }

    // Recitation. Must be handled BEFORE the assets fetch below — see serveAudio for why falling
    // through to it would return an HTML page with an audio Content-Type expectation.
    if (url.pathname.startsWith("/audio/")) return serveAudio(url, request, env);

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

// ── /audio/* — recitation, R2 first, static sample second ─────────────────────
//
// WHY R2 FIRST AND NOT THE OTHER WAY ROUND. The obvious design is "serve the 22 static files, fall
// back to R2 on a 404" — and it cannot work here. `not_found_handling = "single-page-application"`
// means `env.ASSETS.fetch("/audio/2/5.mp3")` returns **index.html at status 200**, not a 404. A
// status-code fallback test would therefore never fire, and the <audio> element would be handed an
// HTML document as its MP3. This is the same trap already recorded against SPA origins elsewhere in
// this project (eleven non-existent /data/*.json paths that all returned one identical body); the
// only sound test against an SPA is the BODY or the Content-Type, never the status.
//
// So: R2 answers if it holds the key. Otherwise the assets binding is consulted but its answer is
// accepted ONLY if it is actually audio. Anything else becomes an honest 404 — a reader hearing
// nothing is correct; a reader whose player chokes on HTML is a bug we shipped.
//
// With no AUDIO binding at all (synthesis, demo — env blocks do not inherit top-level bindings)
// this collapses to "serve the static sample, else 404", which is today's behaviour exactly.
// Minimal structural shims, the same way store.ts declares D1Database and distill.ts declares
// KVNamespace — this repo does not pull in @cloudflare/workers-types. Deliberately NOT imported
// from dalil.ts, whose own R2Bucket shim belongs to the Vectorize/okf-corpus surface that ISC-331
// keeps off the trustworthy edition; a type import there would be the first thread of that coupling.
interface R2Meta {
  readonly size: number;
  readonly httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}
/** Siblings, not parent-and-child. `body` is declared absent here on purpose, so `"body" in obj`
 *  DISCRIMINATES the union — omit the key entirely and TypeScript widens the narrowed branch to
 *  `R2Meta & Record<"body", unknown>`, quietly costing you the narrowing you thought you had. */
interface R2Object extends R2Meta {
  readonly body?: undefined;
}
interface R2ObjectBody extends R2Meta {
  readonly body: ReadableStream;
}
interface R2Bucket {
  get(key: string, options?: { onlyIf?: Headers }): Promise<R2ObjectBody | R2Object | null>;
  head(key: string): Promise<R2Object | null>;
}

const AUDIO_KEY = /^\/audio\/(\d{1,3})\/(\d{1,3})\.mp3$/;

/** One place that decides what an audio response says about itself, so HEAD and GET cannot drift. */
function audioHeaders(obj: R2Meta): Headers {
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", "audio/mpeg");
  headers.set("ETag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  // Recitation is immutable per ayah — the key never changes content. Cache hard.
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  // writeHttpMetadata does NOT write this — R2HTTPMetadata carries contentType/Encoding/
  // Disposition/Language/cacheControl/cacheExpiry and nothing about length. Left unset, a HEAD
  // reports a zero-length file and a player treats the ayah as empty.
  headers.set("Content-Length", String(obj.size));
  return headers;
}

async function serveAudio(url: URL, request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const m = AUDIO_KEY.exec(url.pathname);
  if (!m) return new Response("Not found", { status: 404 });

  // Number() normalizes a zero-padded request (/audio/01/007.mp3) onto the unpadded key the
  // ingest wrote. Out-of-range numbers simply miss in R2 — the surah index is the app's oracle
  // for what exists, and duplicating that bound here would be a second place to keep in sync.
  const key = `${Number(m[1])}/${Number(m[2])}.mp3`;

  if (env.AUDIO) {
    // NO IN-WORKER RANGE HANDLING, and that is the fix, not an omission. Two independent reasons,
    // both found by audit after the first version shipped range plumbing that looked correct:
    //
    //  1. `obj.range` is ALWAYS populated, even when the client sent no Range header — R2 fills in
    //     `{offset: 0, length: size}` as the default. So a `obj.range ? 206 : 200` status could
    //     only ever pick 206. Confirmed in the R2 simulator's own source, not inferred:
    //     `if (range === void 0) r2Range = defaultR2Range` (miniflare bucket.worker.js). Every
    //     plain GET would have answered 206 Partial Content to a client that asked for no part.
    //  2. Cloudflare never stores a 206 a Worker returns. So `immutable` below would have been
    //     dead on arrival across all 6,236 objects — every play of every ayah reaching R2 forever,
    //     which for a ~818 MB bucket is the difference between a cached asset and a standing bill.
    //
    // And it would have bought nothing: on a zone-routed Worker the edge STRIPS `Range` before
    // invoking us and asks for the full body, then does the slicing itself. Return a whole 200 and
    // let Workers caching serve the ranges — that is the documented shape, and it is also less code.
    // HEAD and GET are kept on SEPARATE branches, and that separation is load-bearing. The first
    // version routed HEAD through `head()` and then reused the GET branch — but `head()` returns a
    // bodyless object, and the GET branch reads "no body" as "onlyIf refused", so every HEAD came
    // back 304. Found by probing the live deploy, not by reading the code: two different reasons
    // for having no body had been collapsed into one branch.
    try {
      if (request.method === "HEAD") {
        // HEAD asks how big the file is, not for the file. `get()` would fetch every byte and have
        // the runtime discard it — a full egress charge for a response that carries no body.
        const meta = await env.AUDIO.head(key);
        if (meta) return new Response(null, { status: 200, headers: audioHeaders(meta) });
      } else {
        const obj = await env.AUDIO.get(key, { onlyIf: request.headers });
        if (obj) {
          const headers = audioHeaders(obj);
          if (obj.body !== undefined) return new Response(obj.body, { status: 200, headers });
          // Bodyless HERE genuinely does mean `onlyIf` refused. R2 does not say WHICH precondition
          // failed, but the request does: a failed If-None-Match/If-Modified-Since is 304, a failed
          // If-Match/If-Unmodified-Since is 412. One status for both lies to half the clients.
          const guarded =
            request.headers.has("If-Match") || request.headers.has("If-Unmodified-Since");
          // A 304 must not carry Content-Length — it describes a body that is not being sent.
          headers.delete("Content-Length");
          return new Response(null, { status: guarded ? 412 : 304, headers });
        }
      }
    } catch {
      // R2 throws (service error, malformed conditional). WITHOUT this catch the throw escapes to
      // Cloudflare's 1101 page, which is HTML — handing the <audio> element a web page, the exact
      // failure the fallback below was designed to prevent. Silence is the honest answer here.
      return new Response("Not found", { status: 404 });
    }
  }

  const asset = await env.ASSETS.fetch(request);
  const type = asset.headers.get("Content-Type") ?? "";
  if (asset.ok && type.includes("audio")) return asset;
  return new Response("Not found", { status: 404 });
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
  if (!question) return json({ answer: null }, 200, request);

  // ISC-418 — THE MODEL MAY NOT AUTHOR FROM NOTHING. This comment used to read "the model now leads
  // and can answer without any grounding … empty grounding just means fewer suggested verses, never a
  // refusal", and that was measured true and wrong: `bun run eval:grounding` found 46 of 46
  // no-grounding samples answering in full, so "cara ganti oli motor beat" drew a fluent Islamic
  // answer built from parametric memory alone. Erik ruled 2026-08-13: bow out to the principled
  // edition instead.
  //
  // NO `blocked` FIELD HERE, DELIBERATELY. `blocked` means "prose was generated and the wall refused
  // it", and the browser renders it as an answer found-but-withheld (main.ts:705). In this state no
  // answer was found at all, so that copy would be a lie in the reader's favour. The plain null is
  // the honest channel and already falls through to the corpus-gap/topic-pointer resolution.
  //
  // Placed AFTER verifyGrounding on purpose: forged grounding is dropped up there, lands here as
  // empty, and can no longer buy an authored answer — previously it bought one from memory.
  if (!hasGrounding({ verses, entries })) return json({ answer: null }, 200, request);

  // ISC-434 — hadith grounding, and the gate in front of it.
  //
  // WHY `entries.length > 0` IS THE KNOWLEDGE-SHAPED TEST and not a new classifier. Measured
  // 2026-08-13: hadith retrieval answers 9/9 knowledge-shaped questions and 1/4 feelings — on a
  // feeling it returns a rebuke to an anxious person, which is the worst thing this app could hand
  // someone. So it must only run on the knowledge lane. That lane already has an exact marker:
  // `gatherGrounding` (web/src/answer.ts) runs the scholar's index ONLY when the feeling path came
  // up empty, so a populated `entries` means, by construction, "no feeling was found to answer".
  // Inventing a second classifier here would be a second opinion that can drift from the first.
  //
  // The entries are the VERIFIED ones — `verifyGrounding` ran above — so a forged body cannot switch
  // this lane on either.
  let offered: DalilHit[] = [];
  let records: HadithCard[] = [];
  if (entries.length > 0 && env.VECTORIZE && env.CORPUS && env.CORPUS_DIGEST) {
    try {
      const hits = await searchDalil(env as unknown as DalilEnv, question);
      // CAP BEFORE OFFERING, not after. `searchDalil` returns up to MAX_RETRIEVE=8 so the reranker
      // has room to work, but the reader may only ever see MAX_DISPLAY=2. Offering the model all 8
      // would let it cite the 5th, whose marker resolves against the turn's grounding and passes the
      // guard — and then no card renders for it, because display is capped at the top 2. That is a
      // prophetic attribution with nothing behind it, which is the exact state `bad_hadith` exists
      // to prevent. Capping here makes CITABLE ≡ DISPLAYABLE by construction rather than by luck.
      offered = capForDisplay(hits);
      records = (await fetchDisplayRecords(env as unknown as DalilEnv, offered)).map((r) => ({
        ...r,
        // The client needs the book number to look up the machine Indonesian shard (ISC-449); it is
        // in the corpus path and nowhere else in the record.
        book: bookOf(offered.find((h) => h.id === r.id)?.path ?? ""),
      }));
    } catch {
      // Loud failure upstream, quiet degradation here — embedding, the text layer or the reranker
      // being down means this turn simply has no hadith, which is every turn's normal state. The
      // answer still gets written from Qur'an grounding, exactly as before this cycle.
      offered = [];
      records = [];
    }
  }

  // The model is handed ONLY records whose reader-facing text actually resolved. A hit whose display
  // shard is missing never becomes citable, so it can never become an unbacked attribution.
  const hadith: GroundingHadith[] = records.map((r) => ({
    id: r.id,
    collection: r.collection,
    hadith_number: r.hadith_number,
    grade: r.grade,
    english: r.english,
  }));
  const isGroundedHadith = groundedHadithFrom(hadith.map((h) => h.id));

  const user = buildAnswerUserMessage({ question, verses, entries, hadith });

  let answer: string | null = null;
  // WHY the answer is null, when it is null. Until this existed the endpoint had ONE null channel for
  // two entirely different events — "the model had nothing to say" and "the model said something good
  // and the wall stopped it" — and the browser rendered the identical honest-silence copy for both.
  // For a question whose truthful answer is a hadith that copy ("aku belum menemukan ayat yang cocok")
  // is not honest at all: an answer WAS found, and the app is choosing not to attribute it without a
  // receipt. A reader cannot tell a corpus gap from a deliberate refusal, so they read the refusal as
  // ignorance. Naming the blocking rule lets the browser say which one happened. Absent on success and
  // on model failure; the principled edition never sets it, so an older client sees today's behaviour.
  let blocked: AnswerViolationKind | null = null;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // One retry on a guard reject (a fresh generation usually clears it), exactly like compose. A
    // model error/timeout is caught below and NOT retried. Citations are validated against the real
    // mushaf (isRealAyah), not the grounding — the model may reach for any ayah, just not a fake one.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const candidate = (await callChatModel(cfg, SYNTHESIS_SYSTEM_PROMPT, user, ANSWER_PARAMS))?.trim();
      if (!candidate) continue;
      // The third argument is the REAL hadith-grounding predicate as of this cycle (ISC-434/435).
      //
      // It used to be a literal `() => false`, with a long comment explaining that this was
      // deliberate rather than an oversight: nothing retrieved hadith here, and
      // SYNTHESIS_SYSTEM_PROMPT never taught the `[H:collection:number]` syntax, so the model could
      // not emit a receipt even against a populated union. Both of those are now false — the search
      // runs above and rule 7 of the prompt teaches the marker — so the comment is rewritten rather
      // than deleted, because the thing it was protecting has not changed: a prophetic attribution
      // reaches a reader ONLY with a marker that resolves against what this turn actually retrieved.
      //
      // On the overwhelming majority of turns (any feeling question, and any turn where the dalil
      // bindings are absent) `hadith` is empty and this predicate is false for every id — which is
      // byte-for-byte the old behaviour, and correctly so.
      const verdict = guardAnswerProse(candidate, isRealAyah, isGroundedHadith);
      if (verdict.ok) {
        answer = candidate;
        blocked = null;
        break;
      }
      // Last attempt wins the diagnosis: report the rule that actually stopped the final candidate.
      blocked = verdict.violations[0]?.kind ?? null;
      // DO NOT SPEND A GENERATION THAT CANNOT SUCCEED.
      //
      // The retry above exists because most guard rejections are flukes — a fresh generation usually
      // drops the stray Arabic or the verdict. The break stays after ISC-434/435, for a reason that
      // has MOVED rather than disappeared. It used to be determinism: with no marker syntax and no
      // retrieval, both attempts failed identically, so the second was pure waste. Now the fix is
      // upstream — the model is handed the hadith and taught the receipt on the first attempt — so a
      // `bad_hadith` verdict means that first attempt already had everything it needed and chose an
      // unbacked attribution anyway. Spending a second ~6s generation on that is a bet with no
      // evidence behind it, and the latency argument below has not changed at all.
      //
      // Measured, and this was a live defect rather than a tidy-up: one generation runs ~4s (a passing
      // control measured 3772ms) and a verbose hadith answer ~6s, so two of them exceeded the browser's
      // 12s `TIMEOUT_MS` in `answer-live.ts` — observed aborting at 12126ms. The client then treated the
      // abort as an ABSENCE, which it is, and rendered the corpus-gap copy. So the pointer built for
      // exactly these questions was unreachable for exactly these questions: the ones that trip the
      // hadith wall are the ones that pay for two generations.
      //
      // Returning after the first rejection lands the answer near ~6s, inside the budget, and makes
      // these questions FASTER rather than slower. Raising `TIMEOUT_MS` instead would have treated the
      // symptom and left a reader waiting 25s for a refusal — a worse product either way.
      if (blocked === "bad_hadith") break;
    }
  } catch {
    return json({ answer: null }, 200, request); // model/key failure → browser falls back to principled
  }

  // WHAT THE READER GETS A CARD FOR: the hadith the answer actually cited, in the order it cited
  // them — not everything retrieval offered. An offered-but-uncited hadith is one the model judged
  // irrelevant, and stacking it under the answer anyway would put a saying of the Prophet ﷺ on the
  // page that nothing on the page is talking about.
  //
  // `markersInProse` is only safe on prose that CLEARED the guard, which is exactly the state here:
  // `answer` is non-null only on `verdict.ok`. Every marker in it therefore already resolved.
  const cited = answer
    ? markersInProse(answer)
        .map((id) => records.find((r) => r.id === id))
        .filter((r): r is HadithCard => r !== undefined)
    : [];

  return json({ answer, blocked, hadith: cited }, 200, request);
}

/** `hadith/muslim/001/002/0034.md` → `1`. The `hadith-id` shard key; 0 when the path is unusable. */
const bookOf = (path: string): number => Number(path.split("/")[2] ?? 0) || 0;

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

// ── /api/auth/* — magic-link login (issue 07) ─────────────────────────────────

interface AuthRequestBody {
  email?: unknown;
}
interface AuthVerifyBody {
  token?: unknown;
}

/** Step 1: email a magic link. Returns { sent } — the SPA reports honestly whether email is configured. */
async function handleAuthRequest(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.IDENTITY_HMAC_SECRET) return noStore(json({ ok: false, sent: false }, 200, request));
  let body: AuthRequestBody;
  try {
    body = (await request.json()) as AuthRequestBody;
  } catch {
    return noStore(json({ ok: false }, 400, request));
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return noStore(json({ ok: false, error: "invalid_email" }, 400, request));

  const token = await signMagicToken(email, env.IDENTITY_HMAC_SECRET, Date.now());
  // The SPA reads `#/masuk/<token>` on load and POSTs it to /api/auth/verify.
  const link = `${url.origin}/#/masuk/${token}`;
  const sent = await sendMagicLink(env.RESEND_API_KEY, env.RESEND_FROM, email, link);
  return noStore(json({ ok: true, sent }, 200, request));
}

/** Step 2: verify the token, bind this device to the account, re-issue the cookie to the canonical id. */
async function handleAuthVerify(request: Request, env: Env, identity: Identity): Promise<Response> {
  const secret = env.IDENTITY_HMAC_SECRET;
  if (!secret || !env.DB || !identity.userId) return noStore(json({ ok: false }, 200, request));
  let body: AuthVerifyBody;
  try {
    body = (await request.json()) as AuthVerifyBody;
  } catch {
    return noStore(json({ ok: false }, 400, request));
  }
  const token = typeof body.token === "string" ? body.token : "";
  const email = await verifyMagicToken(token, secret, Date.now());
  if (!email) return noStore(json({ ok: false, error: "invalid_token" }, 200, request));

  // First login for this email → the account adopts THIS device's id. Later logins → resolve the stored
  // canonical id and re-point this device's cookie at it, so it now reads the account's memory.
  const canonical = await linkAccount(env.DB, email, identity.userId, Date.now());
  const res = noStore(json({ ok: true, email }, 200, request));
  if (canonical !== identity.userId) {
    res.headers.append("Set-Cookie", await cookieFor(canonical, secret));
  }
  return res;
}

/** Hard-purge every trace of a user — D1 rows and the KV profile (issue 08 "Forget me"). */
async function handleForget(request: Request, env: Env, identity: Identity): Promise<Response> {
  const userId = identity.userId;
  if (!userId) return noStore(json({ ok: false }, 200, request));
  try {
    if (env.DB) await deleteUser(env.DB, userId);
    await deleteProfile(env, userId);
  } catch {
    return noStore(json({ ok: false }, 200, request));
  }
  return noStore(json({ ok: true }, 200, request));
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

// ── /api/find-surah — AI-supported surah finder (recognize from the closed 114, never invent) ──
//
// The Al-Qur'an "Cari Surah" box: the client sends the person's words + the closed list of all 114
// surahs (n + a human label), and the model returns the ONE surah number that best fits — a theme,
// a story, a feeling, or a name in any language/spelling. Same optimized model path as /api/classify.
// Closed-set guarded, so a reply outside the passed numbers becomes null and the browser falls back
// to its keyword matcher. No keyword matching here — this IS the semantic layer Erik asked for.

interface FindSurahBody {
  query?: unknown;
  surahs?: unknown;
  provider?: unknown;
}

const FIND_SURAH_SYSTEM =
  `Kamu membantu orang menemukan SATU surah Al-Qur'an dari yang mereka tulis. ` +
  `Mereka boleh menyebut tema, kisah, perasaan, atau nama surah dalam bahasa/ejaan apa pun ` +
  `(mis. "sabar", "kisah Nabi Yusuf", "sapi", "the opening", "kahfi"). ` +
  `Pilih HANYA dari daftar surah yang diberikan. Jawab dengan JSON persis: {"n": <nomor>} ` +
  `atau {"n": null} bila tidak ada yang cocok. Jangan menulis penjelasan.`;

function isSurahEntry(s: unknown): s is { n: number; label: string } {
  if (typeof s !== "object" || s === null) return false;
  const r = s as Record<string, unknown>;
  return typeof r.n === "number" && typeof r.label === "string";
}

async function handleFindSurah(request: Request, env: Env): Promise<Response> {
  let body: FindSurahBody;
  try {
    body = (await request.json()) as FindSurahBody;
  } catch {
    return json({ n: null }, 400, request);
  }

  const query = asBoundedString(body.query);
  const surahs = Array.isArray(body.surahs) ? body.surahs.filter(isSurahEntry) : [];
  if (!query || surahs.length === 0) return json({ n: null }, 200, request);

  const valid = new Set(surahs.map((s) => s.n));
  const user =
    `Daftar surah (pilih satu nomor dari sini):\n` +
    surahs.map((s) => `${s.n}. ${s.label}`).join("\n") +
    `\n\nYang ditulis orang itu:\n"""${query}"""\n\n` +
    `Kembalikan {"n": <nomor>} untuk surah yang paling cocok, atau {"n": null}.`;

  let raw: string;
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // A reasoning model needs room even to emit one number — the classify budget lesson applies.
    raw = await callChatModel(cfg, FIND_SURAH_SYSTEM, user, { temperature: 0.1, maxTokens: 200, reasoning: "none" });
  } catch {
    return json({ n: null }, 200, request); // failure → browser keeps its keyword fallback
  }

  const n = parseSurahNumber(raw);
  return json({ n: n !== null && valid.has(n) ? n : null }, 200, request);
}

/** Pull a surah number out of the model's reply, tolerating {"n":2}, "2", or a stray line of prose. */
function parseSurahNumber(raw: string): number | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "n" in parsed) {
      const n = (parsed as Record<string, unknown>).n;
      if (typeof n === "number") return Math.trunc(n);
    }
  } catch {
    /* fall through to a loose scan */
  }
  const m = raw.match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : null;
}

// ── proxy ─────────────────────────────────────────────────────────────────────

// Exported, not called. `noUnusedLocals` flags a retained-on-purpose local, and the two ways to
// silence it are to delete the function or to make it part of the module's surface. Deleting it
// would delete the documented one-line revert to the Cloud Run backend (see the [assets] notes
// above and the routing comment at ~199), so it is exported and stays.
export async function proxyToOrigin(request: Request, env: Env): Promise<Response> {
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
