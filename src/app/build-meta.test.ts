/**
 * The sweep exists because a real deploy published a real file. On 2026-08-23
 * `web/dist/.DS_Store` — 6,148 bytes of local file names — answered HTTP 200 on
 * new-quranku.axiara.ai, because `wrangler deploy` uploads the directory and has never read
 * `.gitignore`. These tests are written against that failure, not against the fix's shape.
 *
 * The nesting matters: the file Finder actually left behind was at the dist ROOT, but Finder writes
 * one per directory it has been opened in, so a sweep that only checks the top level would have
 * closed this instance and left the class open.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ASSET_DIRS, NEVER_PUBLISH, sweepPublishable } from "./build-meta";

const made: string[] = [];

async function distFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "sweep-"));
  made.push(dir);
  return dir;
}

afterEach(async () => {
  while (made.length > 0) await rm(made.pop() as string, { recursive: true, force: true });
});

describe("sweepPublishable", () => {
  test("removes a .DS_Store at the dist root and reports it", async () => {
    const dir = await distFixture();
    await writeFile(join(dir, ".DS_Store"), "x");

    const removed = await sweepPublishable(dir);

    expect(removed).toEqual([".DS_Store"]);
    expect(await Bun.file(join(dir, ".DS_Store")).exists()).toBe(false);
  });

  test("removes a NESTED .DS_Store — Finder writes one per directory it opens", async () => {
    const dir = await distFixture();
    await mkdir(join(dir, "assets", "img"), { recursive: true });
    await writeFile(join(dir, "assets", "img", ".DS_Store"), "x");

    const removed = await sweepPublishable(dir);

    expect(removed).toEqual([join("assets", "img", ".DS_Store")]);
    expect(await Bun.file(join(dir, "assets", "img", ".DS_Store")).exists()).toBe(false);
  });

  test("leaves every real asset alone", async () => {
    const dir = await distFixture();
    await mkdir(join(dir, "assets"), { recursive: true });
    await writeFile(join(dir, "index.html"), "<!doctype html>");
    await writeFile(join(dir, "assets", "index-abc.js"), "console.log(1)");

    const removed = await sweepPublishable(dir);

    expect(removed).toEqual([]);
    expect(await Bun.file(join(dir, "index.html")).text()).toBe("<!doctype html>");
    expect(await Bun.file(join(dir, "assets", "index-abc.js")).text()).toBe("console.log(1)");
  });

  test("writes .assetsignore covering every NEVER_PUBLISH name at root and nested", async () => {
    const dir = await distFixture();

    await sweepPublishable(dir);

    const ignore = await readFile(join(dir, ".assetsignore"), "utf8");
    for (const name of NEVER_PUBLISH) {
      expect(ignore).toContain(`\n${name}\n`);
      expect(ignore).toContain(`\n**/${name}\n`);
    }
  });

  test("does not report .assetsignore as swept — it is written, not found", async () => {
    const dir = await distFixture();
    await writeFile(join(dir, ".DS_Store"), "x");

    const removed = await sweepPublishable(dir);

    expect(removed).not.toContain(".assetsignore");
  });

  test("a second run is a no-op and reports nothing", async () => {
    const dir = await distFixture();
    await writeFile(join(dir, ".DS_Store"), "x");

    await sweepPublishable(dir);
    const second = await sweepPublishable(dir);

    expect(second).toEqual([]);
  });

  test("a missing dist does not throw — that failure belongs to the build", async () => {
    const dir = await distFixture();
    const gone = join(dir, "never-built");

    expect(await sweepPublishable(gone)).toEqual([]);
  });

  test("a missing dist gets no stray .assetsignore left behind", async () => {
    const dir = await distFixture();
    const gone = join(dir, "never-built");

    await sweepPublishable(gone);

    expect(await Bun.file(join(gone, ".assetsignore")).exists()).toBe(false);
  });
});

/**
 * The sweep only protects a directory it is pointed at. `demo:build` writes `web/dist-demo` and ends
 * in the SAME `app:build-meta` call as `build`, so a sweep covering only `web/dist` would leave
 * demo-quranku.axiara.ai open to the identical defect. These assert the wiring, not the constant:
 * the first fails if a dist stops being swept, the second if a build script stops calling the sweep.
 */
describe("every deployed dist is swept", () => {
  test("ASSET_DIRS names the prod dist and the demo dist", () => {
    expect([...ASSET_DIRS]).toEqual(["web/dist", "web/dist-demo"]);
  });

  test("every build script that writes a dist ends in app:build-meta", async () => {
    const pkg = (await Bun.file("package.json").json()) as {
      scripts: Record<string, string>;
    };
    for (const name of ["build", "demo:build"]) {
      expect(pkg.scripts[name]).toBeDefined();
      expect(pkg.scripts[name]).toContain("app:build-meta");
    }
  });

  test("each ASSET_DIR matches an assets directory declared in wrangler.toml", async () => {
    const toml = await Bun.file("worker/wrangler.toml").text();
    // wrangler.toml states them relative to worker/, e.g. `directory = "../web/dist"`.
    for (const dir of ASSET_DIRS) {
      expect(toml).toContain(`directory = "../${dir}"`);
    }
  });
});
