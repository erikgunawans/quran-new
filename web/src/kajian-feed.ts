/**
 * Loading the Rangkuman Kajian index.
 *
 * The summaries are produced by a runner OUTSIDE the Worker and published as a static manifest
 * beside their artifacts. This module fetches that manifest and hands back only records it could
 * actually validate.
 *
 * ── WHY IT VALIDATES RATHER THAN CASTS ──────────────────────────────────────────────────────────
 *
 * `await res.json() as KajianSummary[]` would be a lie the type system cannot catch: the file is
 * written by a separate process, may be stale, hand-edited, or half-written, and every string in it
 * originates in YouTube metadata. A record missing `summaryUrl`, or carrying a number where a string
 * belongs, would reach `kajianCard` and render `undefined` into the page. So each record is checked
 * field by field and DROPPED if it does not hold up — a short list is better than a broken card.
 *
 * ── FAILING SOFT IS DELIBERATE ──────────────────────────────────────────────────────────────────
 *
 * A missing or unreachable manifest resolves to `[]`, which renders the section's empty state. The
 * alternative — letting the fetch throw — takes down the whole route for a file that is simply not
 * published yet, and this feature ships before its runner does.
 */

import type { KajianSummary } from "./kajian-summary.ts";

/** Where the runner publishes its manifest. Relative so it follows whatever origin serves the app. */
export const KAJIAN_INDEX_URL = "/kajian/index.json";

const str = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Validate ONE record. Returns null rather than throwing, so one bad row cannot empty the list.
 *
 * `speaker` and `audioUrl` are the only nullable fields, and both default to null rather than to a
 * placeholder — absence renders as absence (`kajian-summary.ts`), never as a guess.
 */
export function toKajianSummary(raw: unknown): KajianSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!str(r.id) || !str(r.videoId) || !str(r.url) || !str(r.title)) return null;
  if (!str(r.channel) || !str(r.summaryUrl) || !str(r.thumbUrl)) return null;

  return {
    id: r.id,
    videoId: r.videoId,
    url: r.url,
    title: r.title,
    channel: r.channel,
    speaker: str(r.speaker) ? r.speaker : null,
    publishedAt: str(r.publishedAt) ? r.publishedAt : "",
    durationSec: typeof r.durationSec === "number" && Number.isFinite(r.durationSec) ? r.durationSec : 0,
    thumbUrl: r.thumbUrl,
    summaryUrl: r.summaryUrl,
    audioUrl: str(r.audioUrl) ? r.audioUrl : null,
    generatedAt: str(r.generatedAt) ? r.generatedAt : "",
    // Never inferred. A record has to SAY it was reviewed; anything else is unreviewed.
    reviewed: r.reviewed === true,
  };
}

export function parseKajianIndex(payload: unknown): KajianSummary[] {
  const rows = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items)
      : [];
  const out: KajianSummary[] = [];
  for (const row of rows) {
    const parsed = toKajianSummary(row);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

/**
 * Only the CALL SIGNATURE, deliberately — not `typeof fetch`. Bun's `fetch` carries `preconnect`,
 * so `typeof fetch` forces every test double to stub a property this function never calls, and the
 * fix for that is a cast, which is how a test double silently drifts from the real thing.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function loadKajianSummaries(fetchImpl: FetchLike = fetch): Promise<KajianSummary[]> {
  try {
    const res = await fetchImpl(KAJIAN_INDEX_URL, { headers: { accept: "application/json" } });
    // A missing asset on this host returns index.html at 200 (the SPA fallback), so an `res.ok`
    // check alone would hand HTML to JSON.parse. The try/catch below is what actually stops it, and
    // the content-type check is what makes the failure cheap instead of noisy.
    if (!res.ok) return [];
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("json")) return [];
    return parseKajianIndex(await res.json());
  } catch {
    return [];
  }
}
