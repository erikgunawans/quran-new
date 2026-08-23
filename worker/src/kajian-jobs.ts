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
