/**
 * THE PER-ISOLATE REF→TEXT INDEX — the half of ISC-419 that lets the wall see a CITED ayah.
 *
 * `src/app/build-echo-index.ts` emits the asset and records why it exists. This is the read side:
 * one fetch per isolate, then a synchronous `Map` lookup that `guard` — which is
 * `(candidate: string) => GuardVerdict` and is called repeatedly by `repair` on sub-slices — can use
 * without becoming async.
 *
 * ── THE SHAPE CHECK IS NOT DEFENSIVE PADDING ─────────────────────────────────────────────────────
 *
 * `not_found_handling = "single-page-application"` means a MISSING asset does not 404. Cloudflare's
 * asset handler answers `index.html` **at 200**, with `content-type: text/html`. So `res.ok` proves
 * nothing at all here, and `JSON.parse` on an HTML document throws into the catch and returns null,
 * which reads as "transient failure" when the truth is "this deployment has no index". Both of those
 * have been paid for on this repo (`spa-fallback-defeats-status-tests`), so the response is checked
 * for the SHAPE the builder writes, and a wrong shape is treated as STRUCTURAL absence.
 *
 * ── WHY FAILURE IS CACHED, AND WHY NOT ALWAYS ────────────────────────────────────────────────────
 *
 * The asset is ~1.3 MB. Re-fetching and re-parsing it on every turn of a deployment that does not
 * carry it would be a real cost paid for a result that cannot change, so a NON-OK status or a wrong
 * shape is remembered — those are facts about the deployment. A THROWN fetch is not: it is transient
 * by nature, and caching it would switch the wall off for the life of an isolate over one hiccup.
 *
 * ── WHAT IT DOES WHEN IT FAILS ───────────────────────────────────────────────────────────────────
 *
 * Returns null, and the caller hands the wall exactly the retrieved verses it hands today. The wall
 * does not weaken and it does not strengthen — a deploy without the asset behaves as prod did before
 * this change. That is the honest direction: an index that cannot be loaded must not be able to
 * refuse an answer, and must not silently claim to be watching an anchor it cannot read.
 */

/** What the builder writes. Both fields are checked before the payload is trusted. */
interface EchoIndexAsset {
  readonly count?: unknown;
  readonly texts?: unknown;
}

/** Loaded index for this isolate, or `null` once the deployment is known not to carry one. */
let cached: Map<string, string> | null | undefined;

/** The URL the ASSETS binding is asked for. Exported so the test can pin it rather than re-spell it. */
export const ECHO_INDEX_URL = "https://assets.local/echo-index.json";

export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

/**
 * Parse an asset body into the index, or null if it is not one.
 *
 * Separated from the fetch so the SPA-fallback case can be tested on a real `index.html` string
 * rather than on a mock that returns whatever the test wants it to.
 */
export function parseEchoIndex(body: unknown): Map<string, string> | null {
  if (typeof body !== "object" || body === null) return null;
  const { texts } = body as EchoIndexAsset;
  if (typeof texts !== "object" || texts === null || Array.isArray(texts)) return null;
  const out = new Map<string, string>();
  for (const [ref, text] of Object.entries(texts as Record<string, unknown>)) {
    if (typeof text === "string" && text.length > 0) out.set(ref, text);
  }
  // An index that parsed to nothing is not an index. Returning an empty Map would be a wall that is
  // switched off while every caller believes it is loaded.
  return out.size === 0 ? null : out;
}

/** Load once per isolate. Safe to call on every request. */
export async function loadEchoIndex(assets: AssetsFetcher | undefined): Promise<Map<string, string> | null> {
  if (cached !== undefined) return cached;
  if (!assets) {
    cached = null;
    return null;
  }
  let res: Response;
  try {
    res = await assets.fetch(new Request(ECHO_INDEX_URL));
  } catch {
    // Transient — deliberately NOT cached. See the header.
    return null;
  }
  if (!res.ok) {
    cached = null;
    return null;
  }
  let parsed: Map<string, string> | null;
  try {
    parsed = parseEchoIndex(await res.json());
  } catch {
    // The SPA fallback lands here: `index.html` at 200 is not JSON. That IS a fact about the
    // deployment, not a hiccup, so it is remembered.
    parsed = null;
  }
  cached = parsed;
  return cached;
}

/** Test seam. Production never calls this; the isolate cache is the point in prod. */
export function resetEchoIndexCache(): void {
  cached = undefined;
}

/**
 * How many CITED-but-unretrieved anchors one candidate may arm the wall with.
 *
 * A LATENCY BOUND, not a semantic one, and it is named as such because the two get confused. Every
 * extra verse multiplies `sharedRun` — O(words × words) per sentence — and `repair` re-runs the whole
 * guard on sub-slices, so an unbounded set turns a wall into a deadline. This project has already
 * spent refusals on exactly that: three of four apparent refusals in one probe were the retry blowing
 * the 25 s deadline, not any rule firing.
 *
 * SIXTEEN, against a measured mean of 1.2 unretrieved citations per turn (19 across 16 live turns,
 * 2026-08-24). The cap was not reached on that sample and is not expected to be; it exists for prose
 * that is pathological rather than typical. ⚠️ It DROPS SILENTLY — refs beyond the cap are simply not
 * armed — so the order is prose order, keeping the anchors the answer leads with, which are the ones
 * a rendering is built around.
 */
export const MAX_CITED_ECHO_VERSES = 16;

/** What `scriptureEchoShape` takes. Re-declared structurally so this module needs no web/ import. */
export interface EchoVerseArg {
  readonly ref: string;
  readonly texts: readonly string[];
  readonly origin?: "retrieved" | "cited";
}

/**
 * Build the wall's verse argument for ONE candidate: this turn's retrieval, plus every ayah the
 * candidate CITES that retrieval did not hand it and the index can resolve.
 *
 * ── WHY IT IS PER-CANDIDATE AND NOT PER-TURN ─────────────────────────────────────────────────────
 *
 * The cited half is a property of the PROSE, not of the turn, so it cannot be computed once beside
 * the retrieval. `repair` calls `guard` on sub-slices; a slice that no longer names an ayah is
 * correctly no longer judged against it, because the surviving prose has to stand on its own.
 *
 * ── THE RETRIEVED HALF IS UNCHANGED, DELIBERATELY ────────────────────────────────────────────────
 *
 * `origin` is left absent on retrieved verses rather than set to `"retrieved"`. `floorFor` treats
 * absent and `"retrieved"` identically and `answer-guard-echo-cited.test.ts` pins that they agree —
 * so writing it would be noise, and the retrieved arm stays byte-for-byte the argument prod has
 * shipped since 2026-08-20.
 *
 * @param refsIn `refsInProse` — injected so this module carries no dependency on the guard, and so a
 *               test can prove the cap and the de-dupe without spelling Qur'anic references.
 * @param allowed a predicate over normalised refs (`allowedRefsFrom`), used to skip anchors already
 *               retrieved. Normalisation matters: `refsInProse` yields `"66:6"` and a raw string
 *               compare would treat a differently-spelled retrieved ref as a new anchor and arm the
 *               CITED floor on a verse the turn was actually grounded on.
 */
export function echoVersesFor(
  candidate: string,
  retrieved: readonly { readonly ref: string; readonly text: string }[],
  index: Map<string, string> | null,
  refsIn: (prose: string) => string[],
  allowed: (ref: string) => boolean,
): EchoVerseArg[] {
  const out: EchoVerseArg[] = retrieved.map((v) => ({ ref: v.ref, texts: [v.text] }));
  if (!index) return out;
  let added = 0;
  for (const ref of refsIn(candidate)) {
    if (added >= MAX_CITED_ECHO_VERSES) break;
    if (allowed(ref)) continue;
    const text = index.get(ref);
    if (text === undefined) continue;
    out.push({ ref, texts: [text], origin: "cited" });
    added += 1;
  }
  return out;
}
