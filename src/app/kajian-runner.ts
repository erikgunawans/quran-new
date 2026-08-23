/**
 * The VPS runner — the process that consumes the kajian queue.
 *
 * A Worker cannot shell out to `yt-dlp` or run ffmpeg, which is the whole reason this exists as a
 * separate process. It claims a job from the Worker, runs the LOCAL pipeline (`src/app/kajian.ts`)
 * as a subprocess, uploads what that produced, and reports back.
 *
 * ── IT SPAWNS THE PIPELINE RATHER THAN IMPORTING IT ─────────────────────────────────────────────
 *
 * `src/app/kajian.ts` is a top-level script driven by `process.argv`, not a module with an entry
 * function, so it cannot be imported and called. That constraint turns out to be the right shape
 * anyway: a pipeline that dies — ffmpeg segfault, out of memory, an unhandled rejection deep in a
 * transcript fetch — takes down a subprocess, not the poll loop. The loop then reports the failure
 * and takes the next job.
 *
 * ── WHAT IT UPLOADS, AND WHAT IT DELIBERATELY DOES NOT ──────────────────────────────────────────
 *
 * `slide.html` (the published artifact — Erik's call, because an image of text is invisible to a
 * screen reader), `slide.png`, and the short narration when one exists.
 *
 * NOT `briefing.md` and NOT `meta.json`: those hold the third party's material at length —
 * transcript-derived prose, the description, the chapter list. Uploading them would publish the
 * lecture rather than a summary of it, which is the thing nobody has permission to do.
 *
 * AND NOT `meta.thumbnailUrl`. YouTube's thumbnail is the uploader's image; the guardrail Erik chose
 * for the redesign was "layout only, keep the guardrails", and one of those guardrails is no scraped
 * thumbnail. So the card's `thumbUrl` points at OUR OWN rendered `slide.png`. If the render is
 * missing there is no thumbnail to substitute, and the job fails rather than borrowing one.
 *
 * ── FAILURE IS A STATE, NEVER A SILENT EMPTY SUMMARY ────────────────────────────────────────────
 *
 * The PRD's fourth constraint. `yt-dlp` from a datacentre IP will be refused a transcript, and Erik
 * chose the VPS knowing that. Every path that cannot produce a real summary calls `/fail` with a
 * reason a human can act on. Nothing here ever calls `/complete` with blanks in it.
 */

/** One artefact the Worker's allowlist will accept. Kept in step with `kajian-artifacts.ts`. */
export type ArtifactName = "slide.html" | "slide.png" | "short.m4a";

export interface RunnerConfig {
  baseUrl: string;
  secret: string;
  /** How long to wait between empty polls. An idle queue should be cheap, not busy. */
  pollMs: number;
  /** Hard ceiling on one pipeline run. Beyond this the subprocess is killed and the job fails. */
  jobTimeoutMs: number;
}

/**
 * Read the configuration, refusing rather than defaulting where a default would be dangerous.
 *
 * THE SECRET HAS NO DEFAULT AND NO PLACEHOLDER. A runner that starts with an empty secret would poll
 * forever against a 403 and look like a queue that is simply always empty — the worst failure mode
 * available, because it is silent. Same for the base URL: pointing a default at production would
 * make a misconfigured test runner claim real jobs.
 */
export function runnerConfig(env: Record<string, string | undefined>): RunnerConfig | { error: string } {
  const baseUrl = (env.QK_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secret = env.QK_RUNNER_SECRET ?? "";
  if (baseUrl === "") return { error: "QK_BASE_URL is not set" };
  if (!/^https:\/\//.test(baseUrl)) {
    // The secret is a bearer credential; sending it over plain http would put it in the clear.
    return { error: "QK_BASE_URL must be https" };
  }
  if (secret === "") return { error: "QK_RUNNER_SECRET is not set" };

  const pollMs = Number(env.QK_POLL_MS ?? "15000");
  const jobTimeoutMs = Number(env.QK_JOB_TIMEOUT_MS ?? String(45 * 60 * 1000));
  if (!Number.isFinite(pollMs) || pollMs < 1000) return { error: "QK_POLL_MS must be at least 1000" };
  if (!Number.isFinite(jobTimeoutMs) || jobTimeoutMs < 60_000) {
    return { error: "QK_JOB_TIMEOUT_MS must be at least 60000" };
  }
  return { baseUrl, secret, pollMs, jobTimeoutMs };
}

/** What `src/app/kajian.ts` writes into `.scratch/kajian/{videoId}/`, as this runner reads it. */
export interface PipelineMeta {
  videoId?: unknown;
  title?: unknown;
  channel?: unknown;
  duration?: unknown;
  publishDate?: unknown;
}

export interface CompletedResult {
  title: string;
  channel: string;
  publishedAt: string;
  durationSec: number;
  thumbUrl: string;
  summaryUrl: string;
  audioUrl: string | null;
  generatedAt: string;
}

/**
 * Build the result to report, or say why it cannot be built.
 *
 * Returns a REASON rather than throwing, because every caller here has the same job either way: tell
 * the Worker what happened. A thrown error would have to be caught and turned back into one of
 * these, and the version that reaches `/fail` would be an exception message rather than a sentence
 * written for the admin reading the queue.
 */
export function resultFrom(
  meta: PipelineMeta,
  uploaded: Partial<Record<ArtifactName, string>>,
  generatedAt: string,
): CompletedResult | { error: string } {
  const title = typeof meta.title === "string" ? meta.title.trim() : "";
  const channel = typeof meta.channel === "string" ? meta.channel.trim() : "";
  const summaryUrl = uploaded["slide.html"];
  const thumbUrl = uploaded["slide.png"];

  if (title === "") return { error: "pipeline produced no title" };
  if (channel === "") return { error: "pipeline produced no channel" };
  if (summaryUrl === undefined) return { error: "pipeline produced no slide.html" };
  // No fallback to YouTube's thumbnail. Absent our own render, the job fails.
  if (thumbUrl === undefined) return { error: "pipeline produced no slide.png to use as a thumbnail" };

  return {
    title,
    channel,
    publishedAt: typeof meta.publishDate === "string" ? meta.publishDate : "",
    durationSec: typeof meta.duration === "number" && Number.isFinite(meta.duration) ? meta.duration : 0,
    thumbUrl,
    summaryUrl,
    audioUrl: uploaded["short.m4a"] ?? null,
    generatedAt,
  };
}

/** Longest tail of stderr worth reporting. The Worker caps the stored reason too; this keeps the
 *  request small and the cap from silently eating the useful end of a stack. */
const STDERR_TAIL = 400;

/**
 * Turn a dead subprocess into a sentence for the admin reading the queue.
 *
 * The TAIL of stderr, not the head: a pipeline that fails does so at the end of a long run, and the
 * first four hundred characters are startup noise. `yt-dlp`'s refusal is named explicitly because it
 * is the failure this deployment is most likely to hit, and "HTTP Error 403" on its own tells an
 * admin nothing about what to do next.
 */
export function failureReason(exitCode: number, stderr: string, timedOut: boolean): string {
  if (timedOut) return "pipeline exceeded its time limit and was killed";
  const tail = stderr.trim().slice(-STDERR_TAIL);
  if (/HTTP Error 403|Sign in to confirm|not a bot|cookies/i.test(stderr)) {
    return `transcript fetch was refused — this host needs exported cookies or a residential proxy: ${tail}`;
  }
  return tail === "" ? `pipeline exited ${exitCode} with no output` : `pipeline exited ${exitCode}: ${tail}`;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE LOOP. Everything above is pure and tested; everything below touches the network, the
// filesystem and a subprocess, and is deliberately thin so that the untested part stays small.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const OUT_ROOT = resolve(".scratch/kajian");

/** Which produced files are uploaded, and in which order. `slide.html` first, so a partial upload
 *  never leaves a thumbnail pointing at a summary that is not there. */
const UPLOADS: { name: ArtifactName; file: string; required: boolean }[] = [
  { name: "slide.html", file: "slide.html", required: true },
  { name: "slide.png", file: "slide.png", required: true },
  // The play button's narration (ISC-624.8). Not produced yet by the pipeline's current flags, so
  // absence is expected and is NOT a failure — the card renders without an audio control.
  { name: "short.m4a", file: "short.m4a", required: false },
];

interface ClaimedJob {
  id: string;
  videoId: string;
  url: string;
}

async function post(cfg: RunnerConfig, path: string, body?: unknown): Promise<Response> {
  return fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.secret}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function claim(cfg: RunnerConfig): Promise<ClaimedJob | null> {
  const res = await post(cfg, "/api/runner/kajian/claim");
  if (!res.ok) throw new Error(`claim failed: HTTP ${res.status}`);
  const data = (await res.json()) as { job?: ClaimedJob | null };
  return data.job ?? null;
}

async function reportFailure(cfg: RunnerConfig, id: string, reason: string): Promise<void> {
  const res = await post(cfg, "/api/runner/kajian/fail", { id, reason });
  // A 409 means the job was reclaimed or already finished — this runner lost the race. Logged, not
  // retried: retrying into a state that will never accept the report is a loop, not a recovery.
  if (!res.ok) console.error(`  ! could not report failure for ${id}: HTTP ${res.status}`);
}

/** Upload one produced file and return the public URL the Worker assigned it. */
async function upload(cfg: RunnerConfig, videoId: string, name: ArtifactName, path: string): Promise<string> {
  const bytes = readFileSync(path);
  const url = `${cfg.baseUrl}/api/runner/kajian/upload?videoId=${encodeURIComponent(videoId)}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.secret}` },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`upload of ${name} failed: HTTP ${res.status}`);
  const data = (await res.json()) as { url?: unknown };
  if (typeof data.url !== "string") throw new Error(`upload of ${name} returned no url`);
  return data.url;
}

/** Run the pipeline for one job. Returns null on success, or the reason it failed. */
function runPipeline(cfg: RunnerConfig, job: ClaimedJob): string | null {
  // SHORT NARRATION ON, LONG FORM OFF, VIDEO OFF — the summarize pipeline's wanted default per the
  // PRD. `--audio` currently also produces the long form; that flag split is ISC-624.8 and is not
  // done, so this passes neither and the card ships without an audio control rather than shipping a
  // standalone machine reading of somebody's whole lecture.
  const proc = Bun.spawnSync(["bun", "run", "src/app/kajian.ts", job.url], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: cfg.jobTimeoutMs,
  });
  if (proc.exitCode === 0) return null;
  // `killed` distinguishes the timeout from an ordinary non-zero exit; without it a killed process
  // reports whatever signal-derived code it happened to carry, which reads as a pipeline bug.
  return failureReason(proc.exitCode ?? -1, proc.stderr.toString(), proc.signalCode !== null);
}

async function processJob(cfg: RunnerConfig, job: ClaimedJob): Promise<void> {
  console.log(`→ ${job.videoId} (${job.url})`);

  const failed = runPipeline(cfg, job);
  if (failed !== null) {
    console.error(`  ✗ ${failed}`);
    await reportFailure(cfg, job.id, failed);
    return;
  }

  const outDir = join(OUT_ROOT, job.videoId);
  const uploaded: Partial<Record<ArtifactName, string>> = {};
  for (const item of UPLOADS) {
    const path = join(outDir, item.file);
    if (!existsSync(path)) {
      if (item.required) {
        const reason = `pipeline reported success but produced no ${item.file}`;
        console.error(`  ✗ ${reason}`);
        await reportFailure(cfg, job.id, reason);
        return;
      }
      continue;
    }
    uploaded[item.name] = await upload(cfg, job.videoId, item.name, path);
  }

  const result = resultFrom(
    JSON.parse(readFileSync(join(outDir, "meta.json"), "utf8")) as PipelineMeta,
    uploaded,
    new Date().toISOString(),
  );
  if ("error" in result) {
    console.error(`  ✗ ${result.error}`);
    await reportFailure(cfg, job.id, result.error);
    return;
  }

  const res = await post(cfg, "/api/runner/kajian/complete", { id: job.id, result });
  if (!res.ok) {
    console.error(`  ! complete rejected for ${job.id}: HTTP ${res.status}`);
    return;
  }
  console.log(`  ✓ ${result.title}`);
}

async function main(): Promise<void> {
  const cfg = runnerConfig(process.env);
  if ("error" in cfg) {
    console.error(`kajian-runner: ${cfg.error}`);
    process.exit(2);
  }
  console.log(`kajian-runner: polling ${cfg.baseUrl} every ${cfg.pollMs}ms`);

  for (;;) {
    try {
      const job = await claim(cfg);
      if (job === null) {
        await Bun.sleep(cfg.pollMs);
        continue;
      }
      await processJob(cfg, job);
    } catch (err) {
      // A network blip or a Worker restart must not end the runner. Logged and slept off; the job,
      // if one was claimed, is left to its lease and reclaimed after it expires.
      console.error(`kajian-runner: ${err instanceof Error ? err.message : String(err)}`);
      await Bun.sleep(cfg.pollMs);
    }
  }
}

if (import.meta.main) await main();
