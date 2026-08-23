/**
 * Kajian job queue access.
 *
 * This module is the Worker-side doorway into the recorded-kajian pipeline: the Worker ACCEPTS an
 * admin's request to process a YouTube lecture, but the runner that turns that request into slides
 * lives OUTSIDE the Worker. A Worker cannot shell out to `yt-dlp`, so the queue row is the contract
 * between the edge surface and whatever external runner pulls jobs and does the heavy work.
 *
 * URL parsing is done with `new URL()` plus a small allowlist of supported YouTube hosts, not a
 * regex over the whole string. That keeps the security decision anchored in the browser/runtime's
 * URL parser: scheme, host, path segments and query params are all read from the parsed structure
 * rather than guessed from string shape.
 *
 * `enqueueKajianJob` inserts with `ON CONFLICT DO NOTHING` and then re-reads the row instead of
 * catching a UNIQUE-violation error string. The conflict is not exceptional here — deduplicating a
 * second request for the same video is part of the design — and re-reading lets both callers
 * converge on the stored row without binding correctness to D1's error-message wording.
 */
import type { D1Database } from "./store.ts";

const MAX_URL_LEN = 2048;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export type KajianJobStatus = "queued" | "running" | "done" | "failed";

export interface KajianJob {
  id: string;
  videoId: string;
  url: string;
  status: KajianJobStatus;
  requestedBy: string;
  createdAt: number;
  updatedAt: number;
  error: string | null;
}

interface KajianJobRow {
  id: unknown;
  videoId: unknown;
  url: unknown;
  status: unknown;
  requestedBy: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  error: unknown;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "m.youtu.be",
]);

function isKajianJobStatus(value: unknown): value is KajianJobStatus {
  return value === "queued" || value === "running" || value === "done" || value === "failed";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasDotSegment(raw: string, host: string): boolean {
  const hostIndex = raw.indexOf(host);
  if (hostIndex === -1) return false;
  const afterHost = raw.slice(hostIndex + host.length).toLowerCase();
  return afterHost.includes("/../") || afterHost.includes("/./") || afterHost.includes("/%2e%2e/") || afterHost.includes("/%2e/");
}

function parseKajianJobRow(raw: unknown): KajianJob | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as KajianJobRow;
  if (typeof row.id !== "string" || row.id === "") return null;
  if (typeof row.videoId !== "string" || !YOUTUBE_ID.test(row.videoId)) return null;
  if (typeof row.url !== "string" || row.url === "") return null;
  if (!isKajianJobStatus(row.status)) return null;
  if (typeof row.requestedBy !== "string" || row.requestedBy === "") return null;
  if (!isFiniteNumber(row.createdAt)) return null;
  if (!isFiniteNumber(row.updatedAt)) return null;
  if (!(typeof row.error === "string" || row.error === null)) return null;
  return {
    id: row.id,
    videoId: row.videoId,
    url: row.url,
    status: row.status,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    error: row.error,
  };
}

async function getKajianJobByVideoId(db: D1Database, videoId: string): Promise<KajianJob | null> {
  const row = await db
    .prepare(
      "SELECT id, video_id AS videoId, url, status, requested_by AS requestedBy, " +
        "created_at AS createdAt, updated_at AS updatedAt, error " +
        "FROM kajian_jobs WHERE video_id = ?",
    )
    .bind(videoId)
    .first<KajianJobRow>();
  const parsed = parseKajianJobRow(row);
  if (row !== null && parsed === null) {
    throw new Error(`kajian_jobs row for video ${videoId} failed validation after D1 read`);
  }
  return parsed;
}

export function youTubeVideoId(raw: string): string | null {
  if (raw.length > MAX_URL_LEN) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
    if (hasDotSegment(raw, url.host)) return null;

    if (url.hostname.endsWith("youtu.be")) {
      const parts = url.pathname.split("/").filter((part) => part !== "");
      if (parts.length !== 1) return null;
      // Bound to a local and CHECKED rather than asserted with `!`. Under
      // `noUncheckedIndexedAccess` an index read is `string | undefined`, and an assertion here
      // would claim a guarantee the length test alone does not give the compiler.
      const id = parts[0];
      return id !== undefined && YOUTUBE_ID.test(id) ? id : null;
    }

    if (url.pathname === "/watch") {
      const videoId = url.searchParams.get("v");
      return videoId !== null && YOUTUBE_ID.test(videoId) ? videoId : null;
    }

    const parts = url.pathname.split("/").filter((part) => part !== "");
    if (parts.length === 2 && parts[0] === "shorts") {
      const id = parts[1];
      return id !== undefined && YOUTUBE_ID.test(id) ? id : null;
    }

    return null;
  } catch {
    // A non-URL input is not an exceptional enqueue case here; `null` is the correct parse answer.
    return null;
  }
}

export async function enqueueKajianJob(
  db: D1Database,
  videoId: string,
  url: string,
  email: string,
  now: number,
): Promise<{ job: KajianJob; created: boolean }> {
  const attemptedId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO kajian_jobs (id, video_id, url, status, requested_by, created_at, updated_at, error) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (video_id) DO NOTHING",
    )
    .bind(attemptedId, videoId, url, "queued", email, now, now, null)
    .run();

  const job = await getKajianJobByVideoId(db, videoId);
  if (job === null) {
    throw new Error(`kajian_jobs row missing after enqueue attempt for video ${videoId}`);
  }
  return { job, created: job.id === attemptedId };
}

export async function listKajianJobs(db: D1Database, limit = 50): Promise<KajianJob[]> {
  const res = await db
    .prepare(
      "SELECT id, video_id AS videoId, url, status, requested_by AS requestedBy, " +
        "created_at AS createdAt, updated_at AS updatedAt, error " +
        "FROM kajian_jobs ORDER BY created_at DESC LIMIT ?",
    )
    .bind(limit)
    .all<KajianJobRow>();

  const out: KajianJob[] = [];
  for (const row of res.results) {
    const parsed = parseKajianJobRow(row);
    // Rows from D1 cross a trust boundary just like a published JSON manifest does: if one is
    // malformed, we drop THAT row rather than widening the return type or handing bad data onward.
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

/**
 * ── THE RUNNER SIDE OF THE QUEUE ────────────────────────────────────────────────────────────────
 *
 * Everything above is the ADMIN's half: a person at a form asks for a video to be summarised.
 * Everything below is the RUNNER's half: a machine on a VPS takes that work and reports what
 * happened. They are different principals (see `runner-auth.ts`) and they touch different columns.
 *
 * EVERY TRANSITION NAMES THE STATUS IT COMES FROM, in the WHERE clause, not in an `if` above it.
 * That is the whole concurrency design and it is not decoration:
 *
 *   - Two runners polling the same queue must not both get the same job. `claimNextKajianJob` moves
 *     `queued -> running` in ONE `UPDATE … WHERE status = 'queued' … RETURNING`, so the database
 *     decides the winner. A `SELECT` followed by an `UPDATE` would let both read the same row.
 *   - A duplicate or late `complete`/`fail` must not resurrect a finished job. Both transitions
 *     require `status = 'running'`, so the second call changes nothing and returns null. The caller
 *     learns it lost the race instead of silently overwriting a result.
 *
 * A STALE CLAIM IS RECLAIMABLE, and that is why `claimed_at` exists. A runner that is killed mid-run
 * leaves its row in `running` for ever; nothing else would ever pick it up, and the admin would see
 * a job that is permanently "in progress" with no error to explain it. So a claim older than the
 * lease is treated as abandoned and may be taken again. The lease is deliberately much longer than a
 * lecture takes: reclaiming a job that is merely SLOW would run it twice.
 */

/** How long a claim is honoured before another runner may take the job. Two hours — a long lecture
 *  plus transcription plus model time, with room to spare. Too short duplicates work; too long
 *  strands a job after a crash. */
export const CLAIM_LEASE_MS = 2 * 60 * 60 * 1000;

/** What the runner reports back when the work succeeded. Every field is what the reader's card
 *  needs; none of them is a speaker name, and that omission is the point (see migration 0004). */
export interface KajianJobResult {
  title: string;
  channel: string;
  publishedAt: string;
  durationSec: number;
  thumbUrl: string;
  summaryUrl: string;
  audioUrl: string | null;
  generatedAt: string;
}

const SELECT_COLS =
  "id, video_id AS videoId, url, status, requested_by AS requestedBy, " +
  "created_at AS createdAt, updated_at AS updatedAt, error";

/**
 * Claim the oldest unclaimed job, or reclaim one whose lease expired.
 *
 * Returns null when there is nothing to do, which is the ordinary answer on a quiet queue and not an
 * error. The runner polls; an empty queue is most polls.
 */
export async function claimNextKajianJob(db: D1Database, now: number): Promise<KajianJob | null> {
  const row = await db
    .prepare(
      "UPDATE kajian_jobs SET status = 'running', claimed_at = ?, updated_at = ? " +
        "WHERE id = (SELECT id FROM kajian_jobs " +
        "WHERE status = 'queued' OR (status = 'running' AND claimed_at IS NOT NULL AND claimed_at < ?) " +
        "ORDER BY created_at ASC LIMIT 1) " +
        `RETURNING ${SELECT_COLS}`,
    )
    .bind(now, now, now - CLAIM_LEASE_MS)
    .first<KajianJobRow>();

  const parsed = parseKajianJobRow(row);
  if (row !== null && parsed === null) {
    throw new Error("kajian_jobs row failed validation after claim");
  }
  return parsed;
}

/**
 * Record a finished summary. Returns null if the job was not `running` — i.e. it never existed, was
 * already finished, or was reclaimed by another runner while this one worked.
 */
export async function completeKajianJob(
  db: D1Database,
  id: string,
  result: KajianJobResult,
  now: number,
): Promise<KajianJob | null> {
  const row = await db
    .prepare(
      "UPDATE kajian_jobs SET status = 'done', error = NULL, updated_at = ?, " +
        "title = ?, channel = ?, published_at = ?, duration_sec = ?, " +
        "thumb_url = ?, summary_url = ?, audio_url = ?, generated_at = ? " +
        "WHERE id = ? AND status = 'running' " +
        `RETURNING ${SELECT_COLS}`,
    )
    .bind(
      now,
      result.title,
      result.channel,
      result.publishedAt,
      result.durationSec,
      result.thumbUrl,
      result.summaryUrl,
      result.audioUrl,
      result.generatedAt,
      id,
    )
    .first<KajianJobRow>();

  const parsed = parseKajianJobRow(row);
  if (row !== null && parsed === null) {
    throw new Error(`kajian_jobs row ${id} failed validation after complete`);
  }
  return parsed;
}

/** Cap the stored reason. It is operator-facing text from an outside process, not a log sink. */
const MAX_ERROR_LEN = 500;

/**
 * Record a failure WITH ITS REASON. This is the criterion the PRD names: a transcript fetch that
 * fails on a datacentre IP must surface as a job state, never as a silent empty summary. A runner
 * that cannot get the audio calls this; it does not call `complete` with nothing in it.
 */
export async function failKajianJob(
  db: D1Database,
  id: string,
  reason: string,
  now: number,
): Promise<KajianJob | null> {
  const trimmed = reason.trim();
  // An empty reason is worse than a generic one: the admin sees "failed" with a blank cause and has
  // nothing to act on. So absence is filled here rather than stored as NULL.
  const stored = (trimmed === "" ? "unspecified runner failure" : trimmed).slice(0, MAX_ERROR_LEN);

  const row = await db
    .prepare(
      "UPDATE kajian_jobs SET status = 'failed', error = ?, updated_at = ? " +
        "WHERE id = ? AND status = 'running' " +
        `RETURNING ${SELECT_COLS}`,
    )
    .bind(stored, now, id)
    .first<KajianJobRow>();

  const parsed = parseKajianJobRow(row);
  if (row !== null && parsed === null) {
    throw new Error(`kajian_jobs row ${id} failed validation after fail`);
  }
  return parsed;
}
