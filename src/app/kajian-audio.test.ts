/**
 * The m4a's METADATA PANEL, asserted by encoding a real file and reading the tags back.
 *
 * ⚠ WHY THIS FILE EXISTS. The panel's guarantees were checked twice by grepping `kajian-audio.ts`
 * for symbol names, and both versions were blind. The first asserted `toContain("DRAFT_WARNING")`
 * and stayed green when the gate was deleted, because the IMPORT LINE still mentions the symbol.
 * The second asserted `${draft}` and `tags.isDraft ?` and stayed green while every disclaimer sat
 * nested inside `if (tags.sourceUrl)` — encode without a URL and the file came back carrying
 * nothing but ffmpeg's own tags.
 *
 * A grep proves a name is spelled in a file. It cannot prove the code runs, and this panel is the
 * one surface that travels ALONE — read without pressing play, away from the slide and the
 * briefing. So this encodes and reads back. It needs ffmpeg, which the pipeline needs anyway.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeM4a, type M4aTags } from "./kajian-audio.ts";
import { NARRATION_DENIALS, DRAFT_WARNING } from "./kajian-narration.ts";
import { DRAFT_COPY } from "./kajian-slide.ts";

const have = (bin: string) => Bun.spawnSync([bin, "-version"], { stdout: "pipe", stderr: "pipe" }).exitCode === 0;
const READY = have("ffmpeg") && have("ffprobe");

const dir = mkdtempSync(join(tmpdir(), "kajian-tagtest-"));
const wav = join(dir, "in.wav");

/** One second of silence — enough to carry tags, and it costs nothing to make. */
if (READY) {
  const p = Bun.spawnSync(
    ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "1", wav],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (p.exitCode !== 0) throw new Error(p.stderr.toString().slice(-400));
}

function encode(name: string, tags: M4aTags): string {
  const out = join(dir, name);
  encodeM4a(wav, out, tags);
  const p = Bun.spawnSync(["ffprobe", "-v", "error", "-show_entries", "format_tags", "-of", "default=nw=1", out], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return p.stdout.toString();
}

describe.if(READY)("what the m4a panel actually carries", () => {
  test("the three denials ride in the file, with a source URL", () => {
    expect(encode("a.m4a", { sourceUrl: "https://youtu.be/abc" })).toContain(NARRATION_DENIALS);
  });

  test("a file with no source URL is REFUSED — the spoken closing promises one unconditionally", () => {
    // The disclaimers were once nested inside `if (tags.sourceUrl)`, so a URL-less encode shipped
    // carrying nothing at all. Requiring the URL removes the branch that made that possible.
    expect(() => encode("b.m4a", { sourceUrl: "  " } as never)).toThrow(/source URL is required/);
  });

  test("a draft says so in the file, not only in its filename", () => {
    const t = encode("c.m4a", { sourceUrl: "https://youtu.be/abc", isDraft: true });
    expect(t).toContain(DRAFT_WARNING);
    expect(t).toContain(`title=${DRAFT_COPY}`);
  });

  test("a non-draft claims no draft state", () => {
    const t = encode("d.m4a", { sourceUrl: "https://youtu.be/abc" });
    expect(t).not.toContain(DRAFT_COPY);
    expect(t).not.toContain(DRAFT_WARNING);
    expect(t).toContain(NARRATION_DENIALS);
  });

  test("the source URL is in the file, so the spoken closing line is TRUE", () => {
    expect(encode("e.m4a", { sourceUrl: "https://youtu.be/xyz" })).toContain("https://youtu.be/xyz");
  });

  test("the tags a real encode emits are only description, title (draft) and comment", () => {
    /**
     * ⚠ NAMED FOR WHAT IT MEASURES. This was called "no tag carries the uploader's channel" — but
     * `M4aTags` has no channel field and this test supplies none, so re-adding `album=${channel}`
     * (the exact regression) would sail straight through it. A behavioural test cannot check for
     * an input it never provides. The real instrument for that property is the source assertion in
     * `kajian-narration.test.ts`, which greps the compiled-away comments out and looks for
     * `album=`, `readonly channel`, and `tags.channel`.
     */
    const t = encode("f.m4a", { sourceUrl: "https://youtu.be/abc", isDraft: true });
    const keys = t.split("\n").filter(Boolean).map((l) => l.split("=")[0]).filter((k) => !k?.includes("brand") && !k?.includes("version") && k !== "TAG:encoder");
    expect(new Set(keys)).toEqual(new Set(["TAG:title", "TAG:description", "TAG:comment"]));
  });
});

// Not at top level: that would delete the fixtures before a single test had run.
afterAll(() => rmSync(dir, { recursive: true, force: true }));
