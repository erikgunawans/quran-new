/**
 * What the pipeline hands the transcript skill.
 *
 * THIS EXISTS BECAUSE OF A LIVE FAILURE, not a hypothetical. The queue accepted
 * `youtube.com/live/J5x-9tHxeJA?si=…` — correctly, `youTubeVideoId` has parsed `/live/` since
 * 2026-08-24 — and then the pipeline passed that URL through UNCHANGED to a skill that only
 * understands `watch?v=` and bare ids. The skill answered *"Invalid video ID: pass the ID, not the
 * URL"* and died in about a second, which the runner then reported to the admin as **"pipeline
 * exceeded its time limit and was killed"**.
 *
 * So the shape a kajian most often arrives in — a stream — was the one shape that could not be
 * processed, and the queue said the wrong thing about why. The parser was never the problem: the
 * job row holds the right `video_id`. The JOIN between that parser and the skill is what was
 * missing, and a join is exactly what neither side's own tests can see.
 */
import { describe, expect, it } from "bun:test";
import { skillTarget } from "./kajian-source.ts";

const ID = "J5x-9tHxeJA";

describe("skillTarget", () => {
  it("reduces the /live/ URL that broke production to a bare id", () => {
    // The literal string from `kajian_jobs`, `si` tracking parameter and all.
    expect(skillTarget(`https://www.youtube.com/live/${ID}?si=30K4d6YgkQyCvRUH`)).toBe(ID);
  });

  it.each([
    ["a watch URL", `https://www.youtube.com/watch?v=${ID}`],
    ["a watch URL with extra params", `https://www.youtube.com/watch?v=${ID}&t=42s`],
    ["a short link", `https://youtu.be/${ID}`],
    ["a shorts URL", `https://www.youtube.com/shorts/${ID}`],
    ["an embed URL", `https://www.youtube.com/embed/${ID}`],
    ["a mobile URL", `https://m.youtube.com/watch?v=${ID}`],
  ])("reduces %s to the same bare id", (_label, raw) => {
    expect(skillTarget(raw)).toBe(ID);
  });

  it("passes a bare id straight through", () => {
    // Documented usage is `<youtube-url-or-id>`, and the skill takes an id happily.
    expect(skillTarget(ID)).toBe(ID);
  });

  it("trims surrounding whitespace before deciding", () => {
    expect(skillTarget(`  https://www.youtube.com/live/${ID}  `)).toBe(ID);
  });

  /**
   * REFUSAL NAMES THE INPUT, because the failure this replaces named a CLOCK. An admin reading
   * "exceeded its time limit" goes looking at durations and proxies; the actual defect was the URL
   * they pasted, which nothing told them.
   */
  it("refuses a non-YouTube URL with a reason that names the input", () => {
    const out = skillTarget("https://vimeo.com/12345");
    expect(typeof out).not.toBe("string");
    expect((out as { error: string }).error).toContain("vimeo.com");
  });

  it("refuses an empty argument", () => {
    expect(typeof skillTarget("   ")).not.toBe("string");
  });

  it("refuses a YouTube URL that carries no video id", () => {
    expect(typeof skillTarget("https://www.youtube.com/@somechannel")).not.toBe("string");
  });

  /**
   * A near-miss must NOT be waved through as a bare id. Eleven characters of the right alphabet is
   * the id shape; anything else is a mistake worth reporting rather than handing to the skill.
   */
  it.each([
    ["too short", "J5x-9tHxe"],
    ["too long", "J5x-9tHxeJAA"],
    ["an illegal character", "J5x-9tHxe!A"],
  ])("refuses %s as a bare id", (_label, raw) => {
    expect(typeof skillTarget(raw)).not.toBe("string");
  });
});
