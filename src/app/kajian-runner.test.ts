/**
 * The runner's decisions, separated from its plumbing.
 *
 * The loop itself — fetch, spawn, filesystem — is deliberately thin and untested here; what IS
 * tested is every point where the runner decides something a reader or an admin will live with:
 * what it refuses to start with, what it refuses to publish, and what it says when the work fails.
 */
import { describe, expect, test } from "bun:test";
import {
  runnerConfig,
  resultFrom,
  failureReason,
  resolveArtifactFile,
  UPLOADS,
  type PipelineExit,
} from "./kajian-runner.ts";

const GOOD_ENV = {
  QK_BASE_URL: "https://new-quranku.axiara.ai",
  QK_RUNNER_SECRET: "s".repeat(40),
};

describe("a misconfigured runner refuses to start rather than polling into silence", () => {
  test("a complete configuration is accepted, trailing slash and all", () => {
    const cfg = runnerConfig({ ...GOOD_ENV, QK_BASE_URL: "https://example.test/" });
    expect("error" in cfg).toBe(false);
    // Normalised, so every path concatenation below cannot produce a double slash.
    expect("error" in cfg ? "" : cfg.baseUrl).toBe("https://example.test");
  });

  test.each([
    ["no base url", { QK_RUNNER_SECRET: "s".repeat(40) }],
    ["an empty base url", { ...GOOD_ENV, QK_BASE_URL: "" }],
    ["no secret", { QK_BASE_URL: "https://example.test" }],
    ["an empty secret", { ...GOOD_ENV, QK_RUNNER_SECRET: "" }],
  ])("%s is refused", (_case, env) => {
    expect("error" in runnerConfig(env)).toBe(true);
  });

  test("a plain-http base url is refused — the bearer secret would travel in the clear", () => {
    const cfg = runnerConfig({ ...GOOD_ENV, QK_BASE_URL: "http://example.test" });
    expect("error" in cfg && cfg.error).toContain("https");
  });

  test.each([
    ["a sub-second poll", { QK_POLL_MS: "10" }],
    ["a non-numeric poll", { QK_POLL_MS: "soon" }],
    ["a one-second job timeout", { QK_JOB_TIMEOUT_MS: "1000" }],
  ])("%s is refused", (_case, extra) => {
    expect("error" in runnerConfig({ ...GOOD_ENV, ...extra })).toBe(true);
  });
});

describe("what the runner will and will not publish", () => {
  const META = { videoId: "aaaaaaaaaaa", title: "Kajian sabar", channel: "Contoh", duration: 3600, publishDate: "2026-08-01" };
  const FULL = { "slide.html": "/kajian/aaaaaaaaaaa/slide.html", "slide.png": "/kajian/aaaaaaaaaaa/slide.png" };
  const AT = "2026-08-23T00:00:00Z";

  test("a complete run becomes a result", () => {
    const r = resultFrom(META, FULL, AT);
    expect("error" in r).toBe(false);
    expect("error" in r ? null : r.summaryUrl).toBe(FULL["slide.html"]);
  });

  test("OUR OWN render is the thumbnail — never the uploader's", () => {
    const r = resultFrom(META, FULL, AT);
    // slide.png, the page this pipeline rendered. `meta.thumbnailUrl` is YouTube's image and is not
    // read at all: there is no field on PipelineMeta to carry it.
    expect("error" in r ? null : r.thumbUrl).toBe(FULL["slide.png"]);
  });

  test("a run with no render of our own FAILS rather than borrowing a thumbnail", () => {
    // The tempting fallback is `meta.thumbnailUrl`, and taking it would publish the uploader's image
    // on a card the app claims as its own summary. Asserted with one supplied, so the refusal is
    // about the policy and not about the fixture being bare.
    const r = resultFrom({ ...META, thumbnailUrl: "https://i.ytimg.com/vi/x/hq.jpg" } as never, { "slide.html": FULL["slide.html"] }, AT);
    expect("error" in r && r.error).toContain("thumbnail");
  });

  test.each([
    ["no slide.html", { "slide.png": FULL["slide.png"] }],
    ["nothing at all", {}],
  ])("a run with %s fails rather than completing with blanks", (_case, uploaded) => {
    expect("error" in resultFrom(META, uploaded, AT)).toBe(true);
  });

  test.each([
    ["a missing title", { ...META, title: undefined }],
    ["a blank title", { ...META, title: "   " }],
    ["a missing channel", { ...META, channel: undefined }],
  ])("%s fails rather than completing", (_case, meta) => {
    expect("error" in resultFrom(meta, FULL, AT)).toBe(true);
  });

  test("a missing narration is NOT a failure — the card ships without an audio control", () => {
    const r = resultFrom(META, FULL, AT);
    expect("error" in r ? undefined : r.audioUrl).toBeNull();
  });

  test("a present narration is carried through", () => {
    const r = resultFrom(META, { ...FULL, "short.m4a": "/kajian/aaaaaaaaaaa/short.m4a" }, AT);
    expect("error" in r ? null : r.audioUrl).toBe("/kajian/aaaaaaaaaaa/short.m4a");
  });

  test("a non-numeric duration becomes zero rather than NaN reaching the card", () => {
    const r = resultFrom({ ...META, duration: "an hour" }, FULL, AT);
    expect("error" in r ? null : r.durationSec).toBe(0);
  });
});

describe("a failure says what an admin can act on", () => {
  /**
   * THE SHAPES ARE REAL, MEASURED FROM `Bun.spawnSync` ON 2026-08-25 — and measuring them is the
   * whole point of this block. `failureReason` used to take a `timedOut` BOOLEAN that the loop
   * computed as `proc.signalCode !== null`. Bun leaves `signalCode` **undefined** on an ordinary
   * exit, not null, so that expression was true for every failure there is, and the first real job
   * ever run reported a URL the skill could not parse as *"pipeline exceeded its time limit and was
   * killed"* — a verdict naming a clock that was never involved.
   *
   *   ordinary failure  → { exitCode: 1,    signalCode: undefined }
   *   the timeout       → { exitCode: null, signalCode: "SIGTERM" }
   *   a crash by signal → { exitCode: null, signalCode: "SIGTRAP" }
   *
   * So the function now takes the spawn result itself. A caller cannot pass the wrong boolean if
   * there is no boolean to pass, which retires the CLASS of defect rather than this instance.
   */
  const LIMIT = 45 * 60 * 1000;
  const exit = (over: Partial<PipelineExit>): PipelineExit => ({
    exitCode: 1,
    signalCode: undefined,
    stderr: "",
    elapsedMs: 1_000,
    timeoutMs: LIMIT,
    ...over,
  });

  test("the timeout is named as one", () => {
    const reason = failureReason(exit({ exitCode: null, signalCode: "SIGTERM", elapsedMs: LIMIT }));
    expect(reason).toContain("time limit");
  });

  /**
   * THE REGRESSION, stated as the real spawn shape rather than as a boolean. This is the exact
   * result Bun handed the runner for the `/live/` URL failure, and it must not mention a clock.
   */
  test("an ordinary non-zero exit is NOT reported as a timeout", () => {
    const reason = failureReason(exit({ exitCode: 1, stderr: "✗ not a YouTube video URL or id" }));
    expect(reason).not.toContain("time limit");
    expect(reason).toContain("not a YouTube video URL");
  });

  /**
   * SIGTERM ALONE IS NOT THE TIMEOUT. An operator `kill`, a laptop suspending, or a supervisor
   * stopping the runner all send SIGTERM too. Blaming the limit for a job that died three seconds
   * in sends the admin looking at durations and proxies — the same wrong hunt as before, just
   * narrower. So the verdict is checked against the clock it names.
   */
  test("a SIGTERM far short of the limit does not blame the limit", () => {
    const reason = failureReason(exit({ exitCode: null, signalCode: "SIGTERM", elapsedMs: 3_000 }));
    expect(reason).not.toContain("time limit");
    expect(reason).toContain("SIGTERM");
  });

  test("a crash by another signal names that signal", () => {
    const reason = failureReason(exit({ exitCode: null, signalCode: "SIGTRAP", elapsedMs: 9_000 }));
    expect(reason).toContain("SIGTRAP");
    expect(reason).not.toContain("time limit");
  });

  test.each([
    ["yt-dlp's 403", "ERROR: unable to download: HTTP Error 403: Forbidden"],
    ["the bot challenge", "Sign in to confirm you're not a bot"],
    ["a cookies hint", "Use --cookies-from-browser or --cookies"],
  ])("%s names the datacentre-IP cause and the two fixes", (_case, stderr) => {
    // "HTTP Error 403" alone tells an admin nothing about what to do next. The PRD's fourth
    // constraint is the reason this branch exists at all.
    const reason = failureReason(exit({ stderr }));
    expect(reason).toContain("cookies");
    expect(reason).toContain("proxy");
  });

  test("an ordinary crash reports the TAIL of stderr, where the cause is", () => {
    const stderr = `${"startup noise ".repeat(200)}TypeError: cannot read x`;
    expect(failureReason(exit({ stderr }))).toContain("TypeError: cannot read x");
  });

  test("a silent crash still says something", () => {
    expect(failureReason(exit({ exitCode: 137, stderr: "   " }))).toContain("exited 137");
  });

  test("a long stderr is capped, so the report cannot be an unbounded upload", () => {
    expect(failureReason(exit({ stderr: "x".repeat(10_000) })).length).toBeLessThan(500);
  });
});


describe("a draft narration still reaches the play button (ISC-624.8)", () => {
  /**
   * Against the REAL `UPLOADS`, never a copy of it. The rule being tested is not "a find() prefers
   * the first match" — that is arithmetic — it is "the runner looks for the draft-suffixed narration
   * at all". A local table repeating the two names would stay green after somebody deleted
   * `short-DRAFT.m4a` from the shipping one.
   */
  const short = UPLOADS.find((u) => u.name === "short.m4a");

  test("the narration entry looks for the draft-suffixed file too", () => {
    expect(short?.files).toEqual(["short.m4a", "short-DRAFT.m4a"]);
  });

  test("a draft-only directory publishes its narration rather than shipping a silent card", () => {
    // The pipeline suffixes an audio file whose briefing came from unchecked auto-captions, which
    // is the COMMON case for a lecture with no manual captions. Missing this name would mean the
    // play button was dead for most real videos while every test still passed.
    const onDisk = new Set(["slide.html", "slide.png", "short-DRAFT.m4a"]);
    expect(resolveArtifactFile(short?.files ?? [], (f) => onDisk.has(f))).toBe("short-DRAFT.m4a");
  });

  test("the plain name wins when a directory somehow holds both", () => {
    const onDisk = new Set(["short.m4a", "short-DRAFT.m4a"]);
    expect(resolveArtifactFile(short?.files ?? [], (f) => onDisk.has(f))).toBe("short.m4a");
  });

  test("neither present resolves to null, which is what makes absence a non-failure", () => {
    expect(resolveArtifactFile(short?.files ?? [], () => false)).toBeNull();
  });

  test("the two required artefacts are NOT draft-tolerant — the pipeline never suffixes them", () => {
    // Stated as a test because the `files` list is now plural everywhere and a well-meaning later
    // edit could add `slide-DRAFT.html` to match. The slide carries its draft state in a VISIBLE
    // BAND inside the document, so its filename never moves; the audio's does.
    for (const name of ["slide.html", "slide.png"] as const) {
      expect(UPLOADS.find((u) => u.name === name)?.files).toEqual([name]);
    }
  });
});
