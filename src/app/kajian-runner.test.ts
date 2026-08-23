/**
 * The runner's decisions, separated from its plumbing.
 *
 * The loop itself — fetch, spawn, filesystem — is deliberately thin and untested here; what IS
 * tested is every point where the runner decides something a reader or an admin will live with:
 * what it refuses to start with, what it refuses to publish, and what it says when the work fails.
 */
import { describe, expect, test } from "bun:test";
import { runnerConfig, resultFrom, failureReason } from "./kajian-runner.ts";

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
  test("a timeout is named as one, not as an exit code", () => {
    expect(failureReason(-1, "whatever", true)).toContain("time limit");
  });

  test.each([
    ["yt-dlp's 403", "ERROR: unable to download: HTTP Error 403: Forbidden"],
    ["the bot challenge", "Sign in to confirm you're not a bot"],
    ["a cookies hint", "Use --cookies-from-browser or --cookies"],
  ])("%s names the datacentre-IP cause and the two fixes", (_case, stderr) => {
    const reason = failureReason(1, stderr, false);
    // "HTTP Error 403" alone tells an admin nothing about what to do next. The PRD's fourth
    // constraint is the reason this branch exists at all.
    expect(reason).toContain("cookies");
    expect(reason).toContain("proxy");
  });

  test("an ordinary crash reports the TAIL of stderr, where the cause is", () => {
    const stderr = `${"startup noise ".repeat(200)}TypeError: cannot read x`;
    expect(failureReason(1, stderr, false)).toContain("TypeError: cannot read x");
  });

  test("a silent crash still says something", () => {
    expect(failureReason(137, "   ", false)).toContain("exited 137");
  });

  test("a long stderr is capped, so the report cannot be an unbounded upload", () => {
    expect(failureReason(1, "x".repeat(10_000), false).length).toBeLessThan(500);
  });
});
