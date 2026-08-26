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
  allowedRefsFrom,
  guardAnswerProse,
  groundedHadithFrom,
  markersInProse,
  refsInProse,
} from "../../web/src/answer-guard.ts";
import { echoVersesFor, loadEchoIndex } from "./echo-index.ts";
import { isRealAyah } from "../../web/src/quran.ts";
import { hashGrounding } from "../../web/src/grounding-digest.ts";
import {
  ANSWER_PARAMS,
  buildAnswerUserMessage,
  SYNTHESIS_SYSTEM_PROMPT,
  type GroundingEntry,
  type GroundingHadith,
  type GroundingVerse,
} from "../../web/src/answer-contract.ts";
import {
  capForDisplay,
  classifyDalilFailure,
  fetchDisplayRecords,
  publishedCardOf,
  searchDalil,
  type DalilEnv,
  type DalilFailure,
  type DalilHit,
  type DalilTimings,
  type PublishedCard,
} from "./dalil.ts";
import type { HadithCard } from "../../web/src/hadith-card.ts";
import { fiqhAreaOf, fiqhKitabOf } from "../../web/src/fikih-route.ts";
import { repairAnswerProse } from "./answer-repair.ts";
import { runGeneration, newGenTrace } from "./answer-generation.ts";
import { verdictAfterFailure } from "./answer-retry.ts";
import {
  enqueueKajianJob,
  listKajianJobs,
  youTubeVideoId,
  claimNextKajianJob,
  completeKajianJob,
  failKajianJob,
  listPublishedKajian,
  type KajianJobResult,
} from "./kajian-jobs.ts";
import { isRunner } from "./runner-auth.ts";
import { chargeTtsRunD1 } from "./tts-ledger.ts";
import {
  artifactContentType,
  artifactKey,
  artifactPath,
  parseArtifactPath,
  serveArtifact,
  MAX_ARTIFACT_BYTES,
  type KajianArtifactEnv,
} from "./kajian-artifacts.ts";
import { callChatModel, MODEL_DEADLINE_MS, resolveProvider, type ProviderName } from "./providers.ts";
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
import { signSession, buildAuthCookie, clearAuthCookie, roleForRequest, type Role } from "./session.ts";
import { isProbeRequest } from "./probe-marker.ts";

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
  /**
   * Role allowlists for `qk_auth` (Track B step 1). Comma-separated addresses, set with
   * `wrangler secret put ADMIN_EMAILS`. DELIBERATELY NOT A DATABASE TABLE: nothing in the running
   * app can grant privilege, so becoming an Administrator needs an operator and a redeploy. Unset
   * means NOBODY holds the role — it fails closed. See `session.ts`.
   */
  ADMIN_EMAILS?: string;
  /** Ships empty. The Reviewer role exists for the ustadz; no address is hardcoded — email is PII. */
  REVIEWER_EMAILS?: string;
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
  /**
   * Encrypted secret — `wrangler secret put RUNNER_SECRET`. The kajian runner's shared bearer
   * credential, and a SECOND AUTH PRINCIPAL: it proves a machine, never an account. Absent, unset or
   * shorter than the floor → the whole `/api/runner/*` surface answers 403 to everyone, which is the
   * correct state for a deploy that has no runner. See `runner-auth.ts` for why this is not a role.
   */
  RUNNER_SECRET?: string;
  /**
   * R2 binding — the finished summaries' FILES, keys `{videoId}/{slide.html|slide.png|short.m4a}`.
   * Optional like `AUDIO`: absent → the upload route answers 503 and `/kajian/{id}/{name}` 404s,
   * which is exactly prod's state today. See `kajian-artifacts.ts` for why an uploaded document is
   * served with an opaque origin.
   */
  KAJIAN?: KajianArtifactEnv["KAJIAN"];
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
// `new-quranku-ai.axiara.ai` was removed 2026-08-19 with the Worker and the DNS record it named.
// Left in, an allowed origin for a host nobody controls is a standing offer: the name no longer
// resolves, so whoever claims it next inherits cross-origin POST rights to this endpoint.
const ALLOWED_ORIGINS = new Set([
  "https://new-quranku.axiara.ai",
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
    if (url.pathname === "/api/auth/logout") {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      return handleAuthLogout(request);
    }
    if (url.pathname === "/api/auth/role") {
      if (request.method === "OPTIONS") return preflight(request);
      return handleAuthRole(request, env);
    }

    // The gate runs BEFORE the method check. A non-admin is not entitled to learn this surface
    // exists by probing it and comparing 405 against 403; a first cut checked the method first,
    // which would have leaked exactly that. ADR 4 makes these admin routes operational only.
    if (url.pathname === "/api/admin/kajian/jobs") {
      if (request.method === "OPTIONS") return preflight(request);
      const gate = await requireRole(request, env, "admin");
      if (gate) return gate;
      if (request.method === "POST") {
        if (!env.DB) return noStore(json({ ok: false, error: "unavailable" }, 503, request));
        return handleAdminKajianJobEnqueue(request, env, env.DB);
      }
      if (request.method === "GET") {
        if (!env.DB) return noStore(json({ ok: false, error: "unavailable" }, 503, request));
        return handleAdminKajianJobList(request, env.DB);
      }
      return noStore(json({ ok: false, error: "method_not_allowed" }, 405, request));
    }

    // One finished summary's files. `/kajian/index.json` cannot match here — `parseArtifactPath`
    // requires three segments and an allowlisted name — and that separation is asserted in tests
    // rather than left to a reader to notice.
    {
      const artifact = parseArtifactPath(url.pathname);
      if (artifact !== null) {
        if (request.method === "OPTIONS") return preflight(request);
        if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, request);
        const served = await serveArtifact(env, artifact.videoId, artifact.name);
        // Falls through to the SPA when the bucket is unbound or the object is missing, which is
        // today's behaviour for every unknown path on this origin.
        if (served !== null) return served;
      }
    }

    // The published summary list.
    //
    // `/kajian/index.json` LOOKS like a static asset and used to be one — `kajian-feed.ts` fetches
    // it as a manifest "published beside its artifacts". It cannot stay one: the runner writes its
    // results into D1 at run time, and `web/dist` is BAKED AT BUILD TIME, so a static file could
    // only ever show what was true when the app was last built.
    //
    // FALLS THROUGH WHEN D1 IS UNBOUND, which is prod today. That is not a degraded mode to fix —
    // it is exactly the behaviour the feed already handles: the asset is absent, this host answers
    // the SPA fallback at 200, and `loadKajianSummaries` refuses it on content-type and renders the
    // empty state. Serving an empty JSON array here instead would be a claim that the list is
    // empty, rather than that it is not published yet.
    if (url.pathname === "/kajian/index.json" && env.DB) {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, request);
      return handleKajianIndex(request, env.DB);
    }

    // ── THE RUNNER SURFACE ────────────────────────────────────────────────────────────────────────
    //
    // A DIFFERENT PRINCIPAL FROM EVERY ROUTE ABOVE. These three endpoints are spoken to by a machine
    // on a VPS holding a shared bearer secret — no cookie, no email, no role. `isRunner` is used
    // rather than `requireRole` on purpose; `runner-auth.ts` records why at length, and the short
    // version is that putting an Administrator's 30-day session cookie in a VPS env var would undo
    // the whole account layer.
    //
    // Gated BEFORE the method check, exactly like the admin route and for the same reason: an
    // unauthenticated prober must not be able to map the surface by comparing 405 against 403.
    if (url.pathname.startsWith("/api/runner/kajian/")) {
      if (request.method === "OPTIONS") return preflight(request);
      if (!isRunner(request, env)) {
        return noStore(json({ ok: false, error: "forbidden" }, 403, request));
      }
      if (request.method !== "POST") {
        return noStore(json({ ok: false, error: "method_not_allowed" }, 405, request));
      }
      // Upload is answered BEFORE the D1 check, because it needs the BUCKET and never touches the
      // database. Ordering the other way round would 503 an upload on a deploy that has R2 but no
      // D1 — a confusing answer that names the wrong missing thing.
      if (url.pathname === "/api/runner/kajian/upload") return handleRunnerUpload(request, env);

      if (!env.DB) return noStore(json({ ok: false, error: "unavailable" }, 503, request));
      // THE TTS SPEND CEILING. It rides the runner surface rather than living on the runner because
      // the runner's filesystem does not survive a hosted execution — see `tts-ledger.ts`. Erik's
      // 30 runs/day is enforced HERE, on state no runner can reset.
      if (url.pathname === "/api/runner/kajian/tts-charge") return handleTtsCharge(request, env.DB);
      if (url.pathname === "/api/runner/kajian/claim") return handleRunnerClaim(request, env.DB);
      if (url.pathname === "/api/runner/kajian/complete") return handleRunnerComplete(request, env.DB);
      if (url.pathname === "/api/runner/kajian/fail") return handleRunnerFail(request, env.DB);
      return noStore(json({ ok: false, error: "not_found" }, 404, request));
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
      url.pathname === "/api/dalil" ||
      url.pathname === "/api/answer"
    ) {
      if (request.method === "OPTIONS") return preflight(request);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, request);
      if (url.pathname === "/api/compose") return handleCompose(request, env);
      if (url.pathname === "/api/answer") return handleAnswer(request, env, ctx, identity);
      // /api/dalil is retrieval with NO model in the path — it returns corpus records verbatim and
      // authors nothing, so it is safe on the principled edition for the same reason /api/find-surah
      // is. The display cap and the rights wall are enforced inside the handler, not by the caller.
      if (url.pathname === "/api/dalil") return handleDalilSearch(request, env);
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
  /**
   * The Qur'an lane matched only a FEELING, so the hadith lane should also run. Read as a strict
   * `=== true`, so anything absent or malformed keeps the pre-2026-08-17 behaviour. Safe to take
   * from the body because it can only turn a retrieval lane ON — see the gate for the full argument.
   */
  weakVerses?: unknown;
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
  //
  // `isProbeRequest` is the LAST condition on purpose: it suppresses a write and nothing else, so it
  // must not be able to influence anything evaluated before it. See `probe-marker.ts` — an instrument
  // gets an anonymous `userId` exactly like a reader does, which is how 39 probe turns ended up in
  // `events` as reader traffic (ISC-655).
  if (env.DB && identity.userId && question && !isProbeRequest(request)) {
    ctx.waitUntil(recordEvent(env.DB, identity.userId, "question", { question }, Date.now()).catch(() => {}));
  }
  // Bound it, THEN prove it is ours. Forged grounding is dropped here, before the model ever sees it.
  const verses = await verifyGrounding(sanitizeGrounding(body.verses, true) as GroundingVerse[], env);
  const entries = await verifyGrounding(sanitizeGrounding(body.entries, false) as GroundingEntry[], env);
  if (!question) return json({ answer: null }, 200, request);

  // ISC-419's CITED half — started here, awaited far below, so its cost overlaps retrieval.
  //
  // The index is ~1.3 MB and is loaded ONCE PER ISOLATE; only the first turn on a fresh isolate pays
  // for it at all. Kicking it off here rather than at the guard means even that first turn pays
  // roughly nothing in wall-clock: `cari_dalil` retrieval below runs 1.2-2.7 s on this project, and
  // the fetch rides inside that. `loadEchoIndex` never rejects — it resolves to null on any failure
  // and the wall then sees exactly the verses prod has always handed it — so this promise needs no
  // catch and cannot become an unhandled rejection.
  const echoIndexLoad = loadEchoIndex(env.ASSETS);

  // ISC-418 IS REVERSED BY ERIK, 2026-08-21, AND THE HISTORY STAYS SO THE REVERSAL IS LEGIBLE.
  //
  // A `if (!hasGrounding({ verses, entries })) return json({ answer: null })` stood here. Its reason:
  // `bun run eval:grounding` found 46 of 46 no-grounding samples answering in full, so
  // "cara ganti oli motor beat" drew a fluent Islamic answer built from parametric memory alone, and
  // Erik ruled 2026-08-13 to bow out to the principled edition instead.
  //
  // On 2026-08-21 he ruled the other way, having seen what it costs a reader: a plain question
  // ("gimana cara menahan marah menurut Islam") that retrieved nothing returned index rows and
  // "Aku belum menemukan jalan dari pertanyaanmu ke ayat-ayatnya". His words: it has to be answered.
  // So the model now runs on every question, with or without retrieval, and answers from what it
  // knows — ayah first where one genuinely fits, hadith next, general Islamic teaching after that.
  //
  // THE 2026-08-13 FAILURE IS NOT DISMISSED, IT IS RE-SITED. The motor-oil case was real, and the
  // defence against it is now rule 9 of the prompt: an off-topic question is redirected, not dressed
  // in Islamic language. That is a judgement the model makes far better than a keyword list would —
  // this repo's record with keyword classifiers (`indonesian-affix-guards`,
  // `feeling-word-subject-collision`) is that they under-fire on real Indonesian and collide with
  // each other. If rule 9 proves insufficient the answer is a better rule, not a restored refusal.
  //
  // `hasGrounding` ITSELF SURVIVES as the shared definition and keeps its own tests; what is gone is
  // this file's CALL to it. (A first draft of this comment claimed it was "still used below" — it is
  // not, and the grep that would have caught that is the one that did.)

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
  // `book` is REQUIRED here, not optional as on `HadithCard`, and that is the type-level guarantee
  // `publishedCardOf` relies on. Without it a record could reach the projection with no book number,
  // which resolves to 0, which `main.ts` reads as "no shard" — deleting the Indonesian from every
  // answer card with no compile error and no failing test. That shipped once (2026-08-20 late) and
  // an exact-SET test pinned it as correct, because the key was present with value 0.
  let records: (HadithCard & { book: number })[] = [];
  // THE ONE BIT THAT WAS INVISIBLE. Measured 2026-08-15: zero hadith cards rendered across a live
  // run, and nothing anywhere could say whether retrieval had returned nothing or had thrown — the
  // catch below was bare, and this Worker has no telemetry by design. Erik chose this over adding
  // logging: three small counters and a stage token on the response body, which the browser can read
  // on any real turn. No PII, no raw error text (see classifyDalilFailure).
  const bound = Boolean(env.VECTORIZE && env.CORPUS && env.CORPUS_DIGEST);
  let dalilFailure: DalilFailure | null = null;
  // Per-stage wall-clock, for the same reason the counters above exist: the 2026-08-15 live run
  // measured eligible turns at 8-11 s against a 12,000 ms client abort and could say only that the
  // whole dalil chain was to blame, so any fix would have been a guess at which of embed / Vectorize
  // / R2 / rerank was actually spending it. `ms.total` is the number the abort cares about; the
  // stages say where to cut. See `DalilTimings` for why they do not add up.
  const timings: DalilTimings = {};
  // NULL, not 0 — and this initializer is the whole point. `display` is the one stage measured out
  // here rather than by `timed()`, so it does not get the absent-means-did-not-run discipline for
  // free. Any failure upstream of `fetchDisplayRecords` — an embed 401, a rerank 5xx, a missing text
  // layer — leaves this at its initializer, and a `0` would tell an operator "display was instant"
  // about a turn where display never ran at all. Those are exactly the failing turns this diagnostic
  // was built to read.
  let dalilDisplayMs: number | null = null;
  let dalilTotalMs: number | null = null;

  /**
   * The retrieval story for this turn: four small numbers and a stage token, read off state that is
   * final by the time either return path runs.
   *
   * HOW TO READ IT. `eligible:false` → the question never qualified for EITHER lane: grounding had
   * verses (so `entries` was empty, that gate lives in web/src/answer.ts:98, NOT here) and those
   * verses were not weak. `weak:true` → the SECOND lane is what opened it: the Qur'an lane matched
   * only a feeling, so hadith runs alongside verses. `bound:false` → this
   * deploy has no dalil bindings, which is the INTENDED state for `--env synthesis` and `--env demo`.
   * `offered:0` with `failed:null` → retrieval ran and genuinely matched nothing. `offered>0` with
   * `records:0` → the display shards did not resolve (`fetchDisplayRecords` drops those silently, by
   * design). `failed:<stage>` → the chain threw there. `records>0` alongside an empty `hadith` array
   * → retrieval worked and the MODEL declined to cite, which is a prompt problem, not a retrieval one.
   *
   * `ms:null` → the chain never ran (ineligible, or unbound), which is NOT the same as instant. A
   * MISSING stage key means the turn died before reaching it; no stage ever reports 0 for "skipped".
   * `ms.total` is the whole dalil chain and the only stage number the 12,000 ms client abort can
   * see; the rest say where to cut. They overlap and do not sum, and — because a Workers clock only
   * advances on I/O — `total` is a FLOOR on what the reader waited, not the figure: it cannot see
   * the ~100 ms of gunzip+parse CPU behind the text layer. See `DalilTimings` for all four traps.
   *
   * READ THE `records>0` + EMPTY `hadith` CASE CAREFULLY. It says the model did not leave a
   * resolvable receipt; it does NOT say the model chose not to. Until 2026-08-15 the receipt we
   * ordered it to copy was built from the reader-facing `collection`, so it could not match the
   * guard's grammar under any output — a verdict that named no actor was read for a session as one
   * that named the model. If this state returns, construct the passing string by hand BEFORE
   * concluding anything about the model.
   */
  // ONE EXPRESSION, read by both the report below and the gate that actually runs the chain.
  //
  // It used to be two. The report computed `eligible` as `entries.length > 0`, which WAS the whole
  // gate when it was written; the 2026-08-17 cascade added the weak-verse lane to the gate and left
  // the report behind. Every weak-verse turn then printed `eligible:false` beside `records:2` — a
  // diagnostic contradicting itself on exactly the turns the cascade was built for, and the reading
  // that costs a session is "ineligible, so the cascade never fired". Duplicating the condition and
  // testing the two copies match would only re-assert the copy; sharing the binding means they
  // cannot differ. `weak` says which half fired, which is the thing the report could never say.
  const weakVerses = body.weakVerses === true;
  const dalilEligible = entries.length > 0 || weakVerses;

  const dalilReport = () => ({
    eligible: dalilEligible,
    weak: weakVerses,
    bound,
    offered: offered.length,
    records: records.length,
    failed: dalilFailure,
    // Absent (not zero) on a turn that never ran the chain — an ineligible turn spent no time here,
    // and reporting 0 would make "skipped" and "instant" the same reading. `display` follows the
    // same rule one level down: omitted entirely when the chain died before it.
    ms:
      dalilTotalMs === null
        ? null
        : { ...timings, ...(dalilDisplayMs === null ? {} : { display: dalilDisplayMs }), total: dalilTotalMs },
  });

  // ERIK'S SEQUENCE, 2026-08-17: ayat, then hadits, then fikih.
  //
  // `entries.length > 0` alone meant step two could only run when step one returned NOTHING, because
  // `entries` fills only on `verses.length === 0` (web/src/answer.ts). Measured over 48 live reader
  // turns, the questions that never reached hadith were exactly the ones that retrieved one or two
  // FEELING-verses — `bagaimana adab kepada orang tua`, `apa keutamaan sedekah`, `bolehkah aku
  // pacaran`. Those are hadith topics, and the sequence was mostly theoretical because of them.
  //
  // `weakVerses` comes from the request body, which is fine HERE and would not be fine three lines
  // down: it can only turn a retrieval lane ON. It admits nothing, bypasses no guard, and every wall
  // below — `verifyGrounding` above, `capForDisplay`, `fetchDisplayRecords`, `isGroundedHadith`,
  // `guardAnswerProse` — runs exactly as before. A forged `true` buys a reader some hadith they could
  // have got by rephrasing; it cannot buy an unbacked attribution. (Both it and `dalilEligible` are
  // bound above `dalilReport`, so the report names the lane instead of contradicting it.)
  if (dalilEligible && bound) {
    // Started before the `try` and closed in a `finally` so a turn that THREW still reports how long
    // it spent before dying. A failure that is also slow and a failure that is instant need different
    // fixes, and `failed:<stage>` alone cannot tell them apart.
    const dalilStart = Date.now();
    try {
      const hits = await searchDalil(env as unknown as DalilEnv, question, undefined, timings);
      // CAP BEFORE OFFERING, not after. `searchDalil` returns up to MAX_RETRIEVE=8 so the reranker
      // has room to work, but the reader may only ever see MAX_DISPLAY=2. Offering the model all 8
      // would let it cite the 5th, whose marker resolves against the turn's grounding and passes the
      // guard — and then no card renders for it, because display is capped at the top 2. That is a
      // prophetic attribution with nothing behind it, which is the exact state `bad_hadith` exists
      // to prevent. Capping here makes CITABLE ≡ DISPLAYABLE by construction rather than by luck.
      // THE FIKIH STEP. There is no fiqh corpus to answer from — `web/src/fikih.ts` is a topic→kitab
      // map, "a doorway, not a treatise" — so the third step of the sequence contributes ORDER, not
      // text: when the question is plainly about wudu, prefer what the compilers themselves filed
      // under كتاب الوضوء. Applied BEFORE `capForDisplay` so it can change which two the reader sees;
      // after it, it could only reorder two already-chosen hits and would be decorative.
      //
      // It cannot admit or refuse. A wrong area match costs ordering within what retrieval already
      // returned, which is what makes a keyword router acceptable here — see `fikih-route.ts` for
      // why that argument is void if anyone wires this into an admission decision.
      offered = capForDisplay(rankByFiqhArea(hits, question));
      const displayStart = Date.now();
      records = (await fetchDisplayRecords(env as unknown as DalilEnv, offered)).map((r) => ({
        ...r,
        // The client needs the book number to look up the machine Indonesian shard (ISC-449); it is
        // in the corpus path and nowhere else in the record.
        book: bookOf(offered.find((h) => h.id === r.id)?.path ?? ""),
      }));
      dalilDisplayMs = Date.now() - displayStart;
    } catch (e) {
      // Loud failure upstream, quiet degradation here — embedding, the text layer or the reranker
      // being down means this turn simply has no hadith, which is every turn's normal state. The
      // answer still gets written from Qur'an grounding, exactly as before this cycle.
      //
      // The DEGRADATION is unchanged; only the silence is. `catch {}` discarded the one fact that
      // separated "retrieval found nothing" from "retrieval died", and those need different fixes.
      dalilFailure = classifyDalilFailure(e);
      offered = [];
      records = [];
    } finally {
      dalilTotalMs = Date.now() - dalilStart;
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

  // ISC-419's CITED half, resolved. `null` here — no asset on this deployment, or a fetch that threw
  // — means the wall is handed exactly the retrieved verses it has always been handed. See
  // `echo-index.ts` for why that is the honest failure direction.
  const echoIndex = await echoIndexLoad;
  // Which refs this turn was actually GROUNDED on, normalised. Built once per turn rather than per
  // candidate: it is a property of the retrieval, and `repair` re-guards many times.
  const retrievedRefs = allowedRefsFrom(verses.map((v) => v.ref));

  const user = buildAnswerUserMessage({ question, verses, entries, hadith });

  // WHY the answer is null, when it is null. Until this existed the endpoint had ONE null channel for
  // two entirely different events — "the model had nothing to say" and "the model said something good
  // and the wall stopped it" — and the browser rendered the identical honest-silence copy for both.
  // For a question whose truthful answer is a hadith that copy ("aku belum menemukan ayat yang cocok")
  // is not honest at all: an answer WAS found, and the app is choosing not to attribute it without a
  // receipt. A reader cannot tell a corpus gap from a deliberate refusal, so they read the refusal as
  // ignorance. Naming the blocking rule lets the browser say which one happened. Absent on success and
  // on model failure; the principled edition never sets it, so an older client sees today's behaviour.
  const gen = newGenTrace();
  // The generation story for this turn, read off bindings that are final by the time either return
  // path runs.
  //
  // HOW TO READ IT. `attempts` contains one row per attempt that actually STARTED, never a placeholder
  // for one refused admission. `reason` is the single terminal token chosen at the exit point that
  // ended the turn; it is not reconstructed afterwards from the array. The key itself is ABSENT on
  // earlier return paths for the same reason `DalilTimings` omits stages that did not run: "never
  // reached generation" is a different fact from "generation ran and did nothing", and collapsing the
  // two would erase exactly the distinction this diagnostic exists to surface.
  // `rule` rides HERE and not on `blocked`, deliberately. `blocked` is the reader's channel and the
  // browser branches on it; `own_wording` covers two different checks and `bad_hadith` two more, so
  // the kind alone cannot say which wall fired. After the echo wall deployed, `own_wording` moved
  // 4/24 → 5/24 with no instrument able to attribute the difference, against a run-to-run spread
  // already documented at 46% vs 25% on identical code — a whole-run bucket total is not evidence
  // on this project, and without the rule it could not even become one. Diagnostic only: it names a
  // guard that already refused, never a reason a reader is shown.
  const genReport = () => ({
    attempts: gen.attempts,
    reason: gen.reason,
    rule: gen.blockedRule,
    // Repair is invisible on the wire without these: a repaired answer and a first-pass-clean answer
    // are byte-identical in shape. `repairedRule` names the wall that cost the reader a sentence.
    repaired: gen.repaired,
    repairedDropped: gen.repairedDropped,
    repairedRule: gen.repairedRule,
    // WHICH attempt was repaired. The only row that can distinguish the ISC-561 widening from the
    // behaviour it replaced — every other field here reads the same whether repair was handed one
    // candidate or all of them.
    repairedAttempt: gen.repairedAttempt,
  });
  try {
    const cfg = resolveProvider(providerOf(body.provider), env);
    // ONE BUDGET FOR THE TURN, not one per call. `callChatModel` defaults to a fresh
    // `AbortSignal.timeout(MODEL_DEADLINE_MS)` on every call and this loop used to pass no
    // `deadlineMs`, so two attempts could spend 25 s each while the client's backstop sits at 30 s —
    // the second answer generated in full, billed in full, and discarded by a browser that had
    // already given up. That is the ISC-466 failure with the sides swapped. Single generations were
    // measured at 26.7 / 27.4 / 28.0 / 31.1 s on 2026-08-16, so this is a reachable state, not a
    // theoretical one. The deadline is read ONCE here and spent down by both attempts.
    const turnDeadline = Date.now() + MODEL_DEADLINE_MS;
    // One retry on a guard reject (a fresh generation usually clears it), exactly like compose. A
    // model error/timeout is caught below and NOT retried. Citations are validated against the real
    // mushaf (isRealAyah), not the grounding — the model may reach for any ayah, just not a fake one.
    //
    // The loop itself now lives in `answer-generation.ts`, for the same reason `answer-retry.ts`
    // exists: wrapped around a live `fetch` inside this Worker-only handler it had no seam, so the
    // policy could only be changed on reasoning. What is passed in here is exactly what the inline
    // loop called — same prompt, same params, same three guard arguments — and the seam exists to
    // make the TURN's story reportable, not to make any of those decisions negotiable.
    await runGeneration(gen, {
      turnDeadline,
      now: Date.now,
      // `attempt` is deliberately unread here. It names the generation for the diagnostic, and this
      // call is identical on both — a retry that changed the payload would be a different experiment,
      // not a second draw from the same one, which is the whole premise the retry rests on.
      generate: ({ deadlineMs }) =>
        callChatModel(cfg, SYNTHESIS_SYSTEM_PROMPT, user, { ...ANSWER_PARAMS, deadlineMs }),
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
      // The FOURTH argument is this turn's verified grounding, for the echo wall (ISC-419).
      //
      // `verses` here has already been through `sanitizeGrounding` (bounded) and `verifyGrounding`
      // (proved verbatim ours by hash), so this is our published wording and not something a caller
      // supplied. Passing `[]` — which is what the parameter defaults to — would leave the wall
      // switched off while every test around it still passed, so it is passed explicitly here and
      // asserted by `answer-guard-echo.test.ts` rather than left to a default.
      //
      // ONE text per verse today; see `EchoVerse` for why the companion translation is not here yet
      // and what carrying it would take.
      //
      // ── THE CITED HALF IS NOW WIRED (ISC-419, Erik's ruling 2026-08-25) ──────────────────────
      //
      // Until this cycle the fourth argument was `verses.map((v) => ({ ref: v.ref, texts: [v.text] }))`
      // — retrieval and nothing else — and that is why the located QS 66:6 rendering shipped: the
      // turn retrieved ZERO verses, `scriptureEchoShape` opened with `if (verses.length === 0)
      // return null`, and the wall never ran. `echoVersesFor` keeps that argument byte-identical and
      // APPENDS the ayahs this candidate cites that retrieval did not hand it, at
      // `ECHO_MIN_RUN_CITED = 6` rather than the retrieved floor of 4 — a separate constant because
      // the four was calibrated on retrieved verses and re-using it bought two false refusals,
      // one of them on `bolehkah perempuan jadi pemimpin`, an answer this project names as one a hard
      // rule must not destroy.
      //
      // Per CANDIDATE, not per turn: `repair` re-guards sub-slices, and a slice that no longer names
      // an ayah must no longer be judged against it.
      guard: (candidate) =>
        guardAnswerProse(
          candidate,
          isRealAyah,
          isGroundedHadith,
          echoVersesFor(candidate, verses, echoIndex, refsInProse, retrievedRefs),
        ),
      // ISC-560/ISC-564 — a violation costs the PARAGRAPH, not the answer.
      //
      // ATTRIBUTION CORRECTED 2026-08-22. This line read "a violation must cost the SENTENCE, not
      // the answer. Erik, 2026-08-21" — which was false twice over by then: the unit is no longer
      // the sentence (prod stranded a reply; see `splitParagraphs`), and the sentence framing was
      // not his. NO RECORD SHOWS HIM SAYING IT — put that way rather than "never his", because an
      // assertion of silence is what `docs/review/rights-2026-08-21.md` opens by convicting. His
      // recorded ruling is "it has to be answered"; the granularity was ours.
      // ISC-550 RECORDED this same distinction and named THIS FILE as where the sentence was
      // attributed to him. It distinguished the two and located the attribution; it did not call
      // the attribution unsupported, and saying it "convicted" it overstates what ISC-550 says.
      // `repairAnswerProse` is handed the very `guard` closure above, so the prose it returns has
      // been accepted by the same wall that judges egress; there is no second copy to drift.
      repair: repairAnswerProse,
    });
  } catch {
    // Carries `dalil` too: a turn that died at the model still has a retrieval story worth reading,
    // and this is the path a timeout takes.
    //
    // AND IT CARRIES `blocked`, which it did not until 2026-08-16. With the retry open, this catch is
    // reachable in a new way: the first attempt produces prose, the wall refuses it, and the SECOND
    // attempt then exhausts the turn budget and throws. The verdict was already earned at that point,
    // and returning a bare null threw it away — measured on prod as `{answer:null}` rising from 2/25
    // to 7/25 of eligible turns, every new one at a ~26 s wall. `blocked` renders as "an answer was
    // found and is being held back"; a bare null renders as "no matching verse was found". Handing a
    // reader the second when the first is true tells them the corpus is empty when the app is
    // refusing, which is exactly the confusion the `blocked` channel was added to end.
    //
    // `verdictAfterFailure` never invents one: an attempt that threw before generating anything
    // leaves `blocked` null, and that turn is a genuine absence which must keep saying so.
    return json(
      { answer: null, blocked: verdictAfterFailure(gen.blocked), dalil: dalilReport(), gen: genReport() },
      200,
      request,
    );
  }

  // WHAT THE READER GETS A CARD FOR: the hadith the answer actually cited, in the order it cited
  // them — not everything retrieval offered. An offered-but-uncited hadith is one the model judged
  // irrelevant, and stacking it under the answer anyway would put a saying of the Prophet ﷺ on the
  // page that nothing on the page is talking about.
  //
  // `markersInProse` is only safe on prose that CLEARED the guard, which is exactly the state here:
  // `answer` is non-null only on `verdict.ok`. Every marker in it therefore already resolved.
  //
  // AND IT GOES THROUGH `publishedCardOf`, which it did not until 2026-08-20 (late). `records` are
  // `DisplayRecord`s — the INTERNAL shape, carrying the sunnah.com narration and its translator
  // credit because the Worker needs the narration upstream to build the model's user message. This
  // line used to hand those objects straight to `json()`, so the English Erik withdrew from
  // publication was still served on a public endpoint, unpainted rather than unpublished. The
  // withdrawal's evidence was a grep of the served CLIENT BUNDLE and could not have seen it.
  const cited = gen.answer
    ? markersInProse(gen.answer)
        .map((id) => records.find((r) => r.id === id))
        // The element type of `records`, NOT `HadithCard` and NOT `DisplayRecord`: both declare
        // `book` optional or absent, and narrowing to either discards the guarantee at the exact
        // step that needs it.
        .filter((r): r is (typeof records)[number] => r !== undefined)
        .map(publishedCardOf)
    : [];

  return json({ answer: gen.answer, blocked: gen.blocked, hadith: cited, dalil: dalilReport(), gen: genReport() }, 200, request);
}

/** `hadith/muslim/001/002/0034.md` → `1`. The `hadith-id` shard key; 0 when the path is unusable. */
const bookOf = (path: string): number => Number(path.split("/")[2] ?? 0) || 0;

/**
 * The FIKIH step of the ayat → hadits → fikih sequence: a stable re-rank, never a filter.
 *
 * If the question routes to an amal area, hits sitting in the kitab the compilers themselves filed
 * that material under come first; everything else keeps its retrieval order behind them. Nothing is
 * dropped — a question about wudu that retrieved a relevant hadith from outside كتاب الوضوء still
 * has it, just lower. That is the difference between ordering the evidence and choosing it, and only
 * the first is something this app is allowed to do without a fiqh source.
 *
 * STABLE, and deliberately so. `Array.prototype.sort` is stable in every engine Workers runs, so
 * ties preserve the reranker's judgement rather than scrambling it. A partition would do the same,
 * but a comparator says the intent in one line.
 */
export function rankByFiqhArea(hits: DalilHit[], question: string): DalilHit[] {
  const area = fiqhAreaOf(question);
  if (!area) return hits;
  const want = fiqhKitabOf(area);
  const inArea = (h: DalilHit): number => (want.has(`${h.collection}:${bookOf(h.path)}`) ? 0 : 1);
  return [...hits].sort((a, b) => inArea(a) - inArea(b));
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

// ── /api/auth/* — magic-link login (issue 07) ─────────────────────────────────

interface AuthRequestBody {
  email?: unknown;
}
interface AuthVerifyBody {
  token?: unknown;
}
interface AdminKajianJobBody {
  url?: unknown;
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
  // ADR 2: the ACCOUNT proves itself with its own cookie, never through `canonical_user_id`. That
  // column has no UNIQUE constraint, and the line above re-points a shared device at the account's
  // id — so resolving a role through it would hand a Reviewer's privilege to the next person who
  // logged in on the same family tablet. This is the only place `qk_auth` is minted, and it is
  // reached only after `verifyMagicToken` returned an email.
  res.headers.append("Set-Cookie", buildAuthCookie(await signSession(email, secret, Date.now())));
  return res;
}

/**
 * A real logout — which ADR 2 lists as something the app did not have.
 *
 * IT CLEARS THE COOKIE; IT DOES NOT REVOKE THE TOKEN. The signed value stays valid for the rest of
 * its 30 days, so a value captured beforehand still verifies afterwards. That is ADR 2's own
 * definition of the feature ("clear the auth cookie"), and it is said here — not only in
 * `session.ts` — because this is the file a route reader opens first. The only revocation lever is
 * bumping `SESSION_DOMAIN`, which invalidates every session at once.
 *
 * The Identity cookie is deliberately LEFT ALONE: it addresses Memory, and signing out is not the
 * same act as forgetting a reader's bookmarks (that is `/api/forget`).
 */
async function handleAuthLogout(request: Request): Promise<Response> {
  const res = noStore(json({ ok: true }, 200, request));
  res.headers.append("Set-Cookie", clearAuthCookie());
  return res;
}

/**
 * Who am I, as far as ROLE is concerned. Anonymous Visitors get `{ role: "member" }` and a 200 —
 * ADR 1 says reading capabilities never depend on an Account, so absence of a session is normal and
 * not an error.
 */
async function handleAuthRole(request: Request, env: Env): Promise<Response> {
  const info = await roleForRequest(request, env.IDENTITY_HMAC_SECRET ?? "", env, Date.now());
  return noStore(json({ email: info.email, role: info.role }, 200, request));
}

/**
 * Enqueue one recorded-kajian video for the OUTSIDE-THE-WORKER runner.
 *
 * The queue row needs the admin's real email in `requested_by`, and `requireRole` quite rightly
 * does not widen itself into an identity carrier just because one caller wants attribution. So this
 * handler re-resolves the already-gated request through `roleForRequest` and refuses if the session
 * no longer proves an admin by the time attribution is read.
 */
async function handleAdminKajianJobEnqueue(request: Request, env: Env, db: D1Database): Promise<Response> {
  let body: AdminKajianJobBody;
  try {
    body = (await request.json()) as AdminKajianJobBody;
  } catch {
    // Malformed JSON is the same caller fault as omitting `url`: the queue got no parsable YouTube
    // URL, so the right answer is `invalid_url` and no write.
    return noStore(json({ ok: false, error: "invalid_url" }, 400, request));
  }

  const url = typeof body.url === "string" ? body.url : "";
  const videoId = youTubeVideoId(url);
  if (videoId === null) return noStore(json({ ok: false, error: "invalid_url" }, 400, request));

  const info = await roleForRequest(request, env.IDENTITY_HMAC_SECRET ?? "", env, Date.now());
  if (info.email === null || info.role !== "admin") {
    return noStore(json({ ok: false, error: "forbidden" }, 403, request));
  }

  const outcome = await enqueueKajianJob(db, videoId, url, info.email, Date.now());
  if ("error" in outcome) {
    // 429 with Retry-After, because the caller is not doing anything WRONG — the day's allowance is
    // simply spent (MAX_JOBS_PER_DAY, Erik 2026-08-23). The admin UI can say when to come back.
    const res = noStore(json({ ok: false, error: outcome.error }, 429, request));
    res.headers.set("Retry-After", String(Math.ceil(outcome.retryAfterMs / 1000)));
    return res;
  }
  return noStore(json({ ok: true, job: outcome.job, created: outcome.created }, 201, request));
}

/**
 * List the kajian queue as operational metadata only.
 *
 * ADR 4 forbids an Administrator from reading anyone's content; this surface stays on the allowed
 * side of that line because it returns queue state, source URLs and the requesting account, not the
 * transcript, notes or authored output that a Reviewer would read.
 */
async function handleAdminKajianJobList(request: Request, db: D1Database): Promise<Response> {
  return noStore(json({ ok: true, jobs: await listKajianJobs(db) }, 200, request));
}

/**
 * ── THE THREE RUNNER HANDLERS ───────────────────────────────────────────────────────────────────
 *
 * All three are POST even though `claim` reads like a GET, because claiming MUTATES: it moves a row
 * from `queued` to `running` and stamps a lease. A GET that changes state is one a proxy or a
 * prefetcher may repeat for free.
 *
 * None of them trusts its body. Everything arrives from a process outside this codebase, over the
 * public internet, and a runner that has been tampered with is exactly the case the validation is
 * for. Fields are read one at a time and refused on shape, never cast.
 */

/**
 * Serve the published summary list.
 *
 * PUBLIC AND IDENTICAL FOR EVERYONE, so unlike every /api/* route above it is not `noStore` — a
 * shared edge cache holding this is correct, it carries no one's memory. The window is short
 * because a summary appearing a minute late is fine and a stale list for an hour is not.
 */
async function handleKajianIndex(request: Request, db: D1Database): Promise<Response> {
  const items = await listPublishedKajian(db);
  const res = json({ items }, 200, request);
  res.headers.set("Cache-Control", "public, max-age=60");
  return res;
}

/**
 * Store one artefact for a finished summary and answer with the URL it is now reachable at.
 *
 * THE UPLOADER DOES NOT CHOOSE THE KEY AND DOES NOT DECLARE THE TYPE. `artifactKey` matches the
 * video id and the file name against exact patterns — a name that is not on the allowlist is
 * refused, not stored — and the served content type is decided from that allowlisted name, never
 * read from this request's `Content-Type`, which is a claim the uploader makes about its own bytes.
 *
 * The size cap is enforced against the DECLARED length AND against what actually arrived, because a
 * `Content-Length` is another such claim.
 */
async function handleRunnerUpload(request: Request, env: Env): Promise<Response> {
  const bucket = env.KAJIAN;
  if (!bucket) return noStore(json({ ok: false, error: "unavailable" }, 503, request));

  const params = new URL(request.url).searchParams;
  const videoId = params.get("videoId") ?? "";
  const name = params.get("name") ?? "";
  const key = artifactKey(videoId, name);
  if (key === null || artifactContentType(name) === null) {
    return noStore(json({ ok: false, error: "invalid_artifact" }, 400, request));
  }

  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_ARTIFACT_BYTES) {
    return noStore(json({ ok: false, error: "too_large" }, 413, request));
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) {
    return noStore(json({ ok: false, error: "too_large" }, 413, request));
  }
  if (bytes.byteLength === 0) {
    // An empty artefact is the file equivalent of a summary with nothing in it — refused here so it
    // cannot become a `done` job pointing at a blank page.
    return noStore(json({ ok: false, error: "empty" }, 400, request));
  }

  await bucket.put(key, bytes);
  return noStore(json({ ok: true, url: artifactPath(videoId, name) }, 201, request));
}

/**
 * Charge one TTS run against Erik's 30-a-day ceiling.
 *
 * ── WHY 429 AND NOT 403 ──────────────────────────────────────────────────────────────────────────
 *
 * A refusal here is "you have spent today's allowance", not "you are not allowed to ask". The runner
 * surface already answers 403 for a bad secret, and a ceiling that spoke the same code as an auth
 * failure would send an operator hunting for a credential problem that is not there. 429 also carries
 * the right instruction implicitly: come back later — at local midnight in Jakarta, which the body
 * names.
 *
 * ── WHAT THE BODY MUST CARRY ─────────────────────────────────────────────────────────────────────
 *
 * `used`, `limit` and `day` ride on BOTH answers. A runner that is refused needs to be able to log
 * why in a form a human can read without a database, and `30/30 on 2026-08-25` is that form. It is
 * also the only way an operator can tell a ceiling from a broken ledger: `0/30` with a refusal would
 * be a bug, and without the numbers the two look identical.
 */
async function handleTtsCharge(request: Request, db: D1Database): Promise<Response> {
  let body: { runId?: unknown };
  try {
    body = (await request.json()) as { runId?: unknown };
  } catch {
    return noStore(json({ ok: false, error: "bad_json" }, 400, request));
  }
  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  // A blank id would collapse every run onto ONE ledger row: the first would charge, and every run
  // after it for the rest of the day would find itself "already charged" and spend free. Refused
  // rather than defaulted, exactly as `NarrateOptions.runId` is required rather than optional.
  if (runId === "" || runId.length > 200) {
    return noStore(json({ ok: false, error: "bad_run_id" }, 400, request));
  }

  const verdict = await chargeTtsRunD1(db, runId, new Date());
  if (!verdict.allowed) {
    return noStore(
      json(
        { ok: false, error: "tts_ceiling", used: verdict.used, limit: verdict.limit, day: verdict.day },
        429,
        request,
      ),
    );
  }
  return noStore(
    json(
      { ok: true, charged: verdict.charged, used: verdict.used, limit: verdict.limit, day: verdict.day },
      200,
      request,
    ),
  );
}

/** Claim the next job, or say plainly that there is nothing to do. An empty queue is not an error —
 *  it is what most polls find — so it answers 200 with `job: null`, not 404. */
async function handleRunnerClaim(request: Request, db: D1Database): Promise<Response> {
  const job = await claimNextKajianJob(db, Date.now());
  return noStore(json({ ok: true, job }, 200, request));
}

/** A string field that must be present and non-blank. */
function reqStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * Validate the reported result.
 *
 * THE OMISSIONS ARE THE DESIGN. There is no `speaker` field and no `reviewed` field, and a runner
 * that sends them is not obeyed — they are dropped here, not stored. The roster is empty so no
 * summary names anyone (ADR 5), and nothing in this pipeline reviews anything, so `reviewed` must
 * never be settable by the machine that generated the text it would be vouching for.
 *
 * `audioUrl` is the one nullable field, because the play button's pre-generated narration may not
 * exist yet (ISC-624.8). Absent renders as absent; it is never filled with a guess.
 */
function parseRunnerResult(raw: unknown): KajianJobResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const title = reqStr(r.title);
  const channel = reqStr(r.channel);
  const thumbUrl = reqStr(r.thumbUrl);
  const summaryUrl = reqStr(r.summaryUrl);
  const generatedAt = reqStr(r.generatedAt);
  if (title === null || channel === null) return null;
  if (thumbUrl === null || summaryUrl === null || generatedAt === null) return null;

  const durationSec =
    typeof r.durationSec === "number" && Number.isFinite(r.durationSec) && r.durationSec >= 0
      ? r.durationSec
      : 0;

  return {
    title,
    channel,
    publishedAt: typeof r.publishedAt === "string" ? r.publishedAt : "",
    durationSec,
    thumbUrl,
    summaryUrl,
    audioUrl: reqStr(r.audioUrl),
    generatedAt,
  };
}

/**
 * Record a finished summary.
 *
 * A `job: null` answer here is NOT a server fault — it means the row was not `running` when the
 * report arrived: already finished, already failed, or reclaimed by another runner after this one's
 * lease expired. 409 says that precisely, so a runner can log a lost race instead of retrying into
 * a result that will never be accepted.
 */
async function handleRunnerComplete(request: Request, db: D1Database): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore(json({ ok: false, error: "invalid_body" }, 400, request));
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = reqStr(record.id);
  const result = parseRunnerResult(record.result);
  if (id === null || result === null) {
    return noStore(json({ ok: false, error: "invalid_body" }, 400, request));
  }

  const job = await completeKajianJob(db, id, result, Date.now());
  if (job === null) return noStore(json({ ok: false, error: "not_running" }, 409, request));
  return noStore(json({ ok: true, job }, 200, request));
}

/**
 * Record a failure and its reason.
 *
 * THIS IS THE ENDPOINT THE PRD'S FOURTH CONSTRAINT NAMES. `yt-dlp` on a datacentre IP will be
 * refused a transcript, and that must surface as a JOB STATE with a stated reason — never as a
 * `complete` carrying an empty summary, which would publish silence as if it were a result. A
 * missing reason is filled with a generic one downstream rather than stored blank.
 */
async function handleRunnerFail(request: Request, db: D1Database): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore(json({ ok: false, error: "invalid_body" }, 400, request));
  }
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = reqStr(record.id);
  if (id === null) return noStore(json({ ok: false, error: "invalid_body" }, 400, request));

  const reason = typeof record.reason === "string" ? record.reason : "";
  const job = await failKajianJob(db, id, reason, Date.now());
  if (job === null) return noStore(json({ ok: false, error: "not_running" }, 409, request));
  return noStore(json({ ok: true, job }, 200, request));
}

/**
 * Gate a request to a role. Returns null when allowed, or the 403 to return when not.
 *
 * ROLES ARE DISJOINT CAPABILITIES, NOT A LADDER — and a first cut of this function got that wrong.
 * It ranked `member < reviewer < admin` and admitted anyone at or above the needed rank, which made
 * an Administrator satisfy a Reviewer gate. ADR 4 forbids exactly that: *"An Administrator never
 * sees content: no question text, no bookmark references, no notes"*, while a Reviewer's whole job
 * is reading what the app said. A ladder would have walked an Administrator straight into the one
 * surface that role is defined by not seeing. `CONTEXT.md` states the same separation from the other
 * end — *"an Administrator needs to see users, and a Reviewer must not"*.
 *
 * So a privileged role is matched EXACTLY. Widening this to "admin can do anything" is a decision
 * for a human with ADR 4 open, not a convenience.
 *
 * `needed: "member"` means SIGNED IN, which is not the same as `role === "member"`: an Anonymous
 * Visitor also resolves to `member` (ADR 1's floor), so the check is on a proven email. A first cut
 * of this branch gated nothing at all.
 *
 * It answers 403 rather than 404, and the body does not distinguish "no session" from "wrong role" —
 * an endpoint that says "you are not an admin" to an anonymous caller confirms it exists and is
 * worth attacking.
 */
export async function requireRole(request: Request, env: Env, needed: Role): Promise<Response | null> {
  const info = await roleForRequest(request, env.IDENTITY_HMAC_SECRET ?? "", env, Date.now());
  const forbidden = noStore(json({ ok: false, error: "forbidden" }, 403, request));
  if (needed === "member") return info.email === null ? forbidden : null;
  return info.role === needed ? null : forbidden;
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

/**
 * Why a classify call produced the themes it did.
 *
 * ADDITIVE TELEMETRY — `themes` is the contract and does not move. This exists because `[]` had four
 * causes and one appearance, so three cycles of probe output could not tell a broken classifier from
 * a working one answering ruling questions against an emotional vocabulary (ISC-658).
 *
 * `none`    the model answered and nothing in the closed set fitted — legitimate, and the common
 *           case for a ruling or knowledge question. Also the no-op case: no question, no candidates.
 * `matched` at least one theme survived the guard.
 * `dropped` the model named themes and the guard removed ALL of them — it is answering out of
 *           vocabulary, which is a different event from "nothing fitted" and is what the 80-token
 *           incident below would have looked like from outside.
 * `error`   the model call threw. Never again reportable as an empty result.
 */
type ClassifyOutcome = "matched" | "none" | "dropped" | "error";

async function handleClassify(request: Request, env: Env): Promise<Response> {
  let body: ClassifyBody;
  try {
    body = (await request.json()) as ClassifyBody;
  } catch {
    return json({ themes: [], outcome: "error" satisfies ClassifyOutcome }, 400, request);
  }

  const question = asBoundedString(body.question);
  const valid = Array.isArray(body.themes) ? body.themes.filter((t): t is string => typeof t === "string") : [];
  // Nothing to classify and nothing to classify INTO. Reported as `none` rather than `error`: no
  // call was attempted, so nothing failed.
  if (!question || valid.length === 0) {
    return json({ themes: [], outcome: "none" satisfies ClassifyOutcome }, 200, request);
  }

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
    // Failure → browser keeps the keyword lexicon, exactly as before. What changed is that the
    // caller can now tell this apart from the model having answered with nothing.
    return json({ themes: [], outcome: "error" satisfies ClassifyOutcome }, 200, request);
  }

  // guardThemes drops anything not in the closed set, so parse loosely and let the wall clean up.
  const candidates = parseThemeList(raw);
  const themes = guardThemes(candidates, valid);
  const outcome: ClassifyOutcome =
    themes.length > 0 ? "matched" : candidates.length > 0 ? "dropped" : "none";
  return json({ themes, outcome }, 200, request);
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

/**
 * A hit the reader may NAVIGATE to but not READ here — collection, number, grade, link.
 *
 * THIS TYPE IS THE RIGHTS WALL FOR THE LIST. `MAX_DISPLAY` caps how many hadith may be SHOWN, and
 * that cap does not move (Erik, 2026-08-17). But a search that returns two cards and silently drops
 * the other six tells the reader those six do not exist. A reference line is the honest middle: it
 * says "this record is here, graded this" and hands over a link, while displaying no
 * hadith text at all. That is the same position the Fikih section already ships — a doorway.
 *
 * `bab_en` AND `book_en` were both withdrawn on 2026-08-20 (late), on Erik's ruling: sunnah.com's
 * English chapter and kitab titles are the same "private research use" apparatus as the narration,
 * one and two levels up. This type carried seven keys before; it carries five now. What is left
 * still says which record this is, how it is graded, and where to read it — the kitab is gone from
 * the doorway, which is the cost. See `docs/review/rights-2026-08-20.md` §2.
 *
 * THIS DOCBLOCK WAS WRONG THREE WAYS FOR ONE COMMIT and the corrections are kept, because this is
 * the block a future dev reads before re-adding a field: it said `book_en` was "kept and FLAGGED",
 * said "Erik has not been asked about it", and called `bab_en` "THE EIGHTH KEY". `book_en` was
 * removed in that same commit, Erik HAD ruled on it, and there were seven keys, not eight.
 */
export interface DalilReference {
  id: string;
  collection: string;
  hadith_number: number;
  grade: string;
  source_url: string;
}

/**
 * Project a hit down to a reference line — FIELD BY FIELD, never a spread.
 *
 * The explicit projection is the whole guarantee and it is why this is a function rather than a
 * `const ref = { ...hit }` with two deletes. `DalilHit` does not carry `arabic`/`english` today;
 * a spread would start leaking them the day someone adds them, silently, with every test still
 * green. Listing the permitted keys means a new field on `DalilHit` reaches a reader only
 * when a human edits THIS function. `dalil-search.test.ts` force-reds on exactly that.
 */
export function referenceLineOf(h: DalilHit): DalilReference {
  return {
    id: h.id,
    collection: h.collection,
    hadith_number: h.hadith_number,
    grade: h.grade,
    source_url: h.source_url,
  };
}

/**
 * SECTION-SCOPED SEARCH — what the composer does when the reader is standing in Hadits or Fikih.
 *
 * Erik, 2026-08-17: typing in a section should serve that section first. Everywhere else the box
 * runs the companion pipeline, which leads with ayat and reaches hadith only when retrieval found
 * NO verse (`entries` stays gated on `verses.length === 0` — untouched here). Inside Hadits that
 * ordering is wrong: someone who navigated to Hadits and typed "hadits tentang perceraian" is
 * asking the hadith corpus a question, not asking to be consoled.
 *
 * This endpoint does NOT author. It retrieves, orders, caps, and returns records verbatim from the
 * corpus — there is no model in the path, so there is nothing for the answer guard to police and no
 * way for it to produce a fatwa. It is the hadith twin of `/api/find-surah`: navigation.
 *
 * `fiqh: true` adds the FIKIH step and nothing else. `rankByFiqhArea` re-ranks what retrieval
 * already returned and `fiqhAreaOf` names the doorway; neither can admit a record retrieval missed
 * nor refuse one it found. The re-rank-only argument in `fikih-route.ts` survives intact — this
 * caller makes no admission decision.
 */
async function handleDalilSearch(request: Request, env: Env): Promise<Response> {
  let body: { query?: unknown; fiqh?: unknown };
  try {
    body = (await request.json()) as { query?: unknown; fiqh?: unknown };
  } catch {
    return json({ cards: [], refs: [], area: null }, 400, request);
  }

  const query = asBoundedString(body.query);
  if (!query) return json({ cards: [], refs: [], area: null }, 200, request);
  const fiqh = body.fiqh === true;

  let hits: DalilHit[];
  try {
    hits = await searchDalil(env as unknown as DalilEnv, query);
  } catch {
    // Quiet degradation, like /api/find-surah: the section still renders its browse grid, and the
    // reader gets no results rather than an error page. The loud version lives in searchDalil.
    return json({ cards: [], refs: [], area: null }, 200, request);
  }

  const ordered = fiqh ? rankByFiqhArea(hits, query) : hits;
  // Same order as the answer path: FIKIH re-rank first, THEN the cap, so the fiqh area can change
  // which two the reader actually sees. After the cap it could only shuffle two and be decorative.
  const offered = capForDisplay(ordered);

  // THE SPREAD WENT THROUGH `publishedCardOf` ON 2026-08-20 (late), and until then this endpoint
  // was the other half of a leak that was reported closed.
  //
  // `refs` on this route has been walled by `referenceLineOf` since it was written; `cards` never
  // was. `{ ...r }` of a `DisplayRecord` published `english`, `translator` and `bab_en` verbatim —
  // so after the answer route was walled, `POST /api/dalil` was still serving the full sunnah.com
  // narration and the Darussalam / Muhsin Khan credit as JSON, and a comment on the answer route's
  // new wall said this list "already had this wall". Half of it did. That sentence is the exact
  // stale-assertion shape the withdrawal itself was caught by.
  //
  // `book` is added BEFORE the projection because `publishedCardOf` carries it: it is the routing
  // key for the machine-Indonesian shard and is not part of `DisplayRecord`.
  let cards: PublishedCard[] = [];
  try {
    cards = (await fetchDisplayRecords(env as unknown as DalilEnv, offered)).map((r) =>
      publishedCardOf({ ...r, book: bookOf(offered.find((h) => h.id === r.id)?.path ?? "") }),
    );
  } catch {
    cards = []; // text layer down → references still stand, since they need no text
  }

  // Everything retrieval found that the cap excluded, plus anything the text layer could not render
  // (a record with no body is unshowable but still real, and its reference is still true).
  const shown = new Set(cards.map((c) => c.id));
  const refs = ordered.filter((h) => !shown.has(h.id)).map(referenceLineOf);

  // `refs` travel with the area because the doorway's only honest destination is the kitab itself —
  // there is no `#/fikih/<area>` reader, and an area IS its kitab. Sent from here rather than looked
  // up client-side so the doorway and the re-rank agree on one definition of the area's books.
  const area = fiqh ? fiqhAreaOf(query) : null;
  return json(
    {
      cards,
      refs,
      area: area
        ? {
            id: area.id,
            title: area.title,
            sub: area.sub,
            refs: area.refs.map((r) => ({ collection: r.collection, book: r.book })),
          }
        : null,
    },
    200,
    request,
  );
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
