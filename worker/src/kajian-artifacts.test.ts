/**
 * Storing and serving a finished summary's files.
 *
 * The claims worth testing here are not "does it round-trip a key". They are the three that stop an
 * uploaded document from becoming an attack on the reader who opens it:
 *
 *   1. The uploader does not choose the key — a name off the allowlist is refused, not stored.
 *   2. The uploader does not declare the type — it is decided from the allowlisted name.
 *   3. The served HTML has an opaque origin and cannot execute script.
 *
 * Plus the boring one that a comment in `index.ts` asserts and would otherwise be unchecked:
 * `/kajian/index.json` is the published LIST and must never be parsed as an artefact path.
 */
import { describe, expect, test } from "bun:test";
import {
  artifactContentType,
  artifactKey,
  artifactPath,
  parseArtifactPath,
  serveArtifact,
  MAX_ARTIFACT_BYTES,
} from "./kajian-artifacts.ts";

const ID = "aaaaaaaaaaa";

function bucketWith(...keys: string[]) {
  const held = new Set(keys);
  const puts = new Map<string, number>();
  return {
    puts,
    env: {
      KAJIAN: {
        async get(key: string) {
          if (!held.has(key)) return null;
          return { body: new Blob(["<p>slide</p>"]).stream(), size: 12 };
        },
        async put(key: string, value: ArrayBuffer | ReadableStream) {
          puts.set(key, value instanceof ArrayBuffer ? value.byteLength : -1);
          held.add(key);
          return {};
        },
      },
    },
  };
}

describe("the uploader chooses neither the key nor the type", () => {
  test.each([
    ["slide.html", "text/html; charset=utf-8"],
    ["slide.png", "image/png"],
    ["short.m4a", "audio/mp4"],
  ])("%s is allowed and served as %s", (name, type) => {
    expect(artifactContentType(name)).toBe(type);
    expect(artifactKey(ID, name)).toBe(`${ID}/${name}`);
  });

  test.each([
    ["a script", "evil.js"],
    ["an unlisted html name", "index.html"],
    ["a traversal", "../index.html"],
    ["an encoded traversal", "%2e%2e%2findex.html"],
    ["a nested path", "sub/slide.html"],
    ["an empty name", ""],
    ["a right extension under a wrong name", "other.html"],
  ])("%s is refused — the allowlist is of whole NAMES, not extensions", (_case, name) => {
    expect(artifactContentType(name)).toBeNull();
    expect(artifactKey(ID, name)).toBeNull();
  });

  test.each([
    ["too short", "aaaa"],
    ["too long", "aaaaaaaaaaaa"],
    ["a traversal", ".."],
    ["a slash", "aaaa/aaaaaa"],
    ["a dot", "aaaaa.aaaaa"],
  ])("a video id that is %s is refused", (_case, videoId) => {
    expect(artifactKey(videoId, "slide.html")).toBeNull();
  });
});

describe("the published list is not an artefact path", () => {
  test("/kajian/index.json does not parse as one — index.ts relies on this", () => {
    // The two surfaces share the `/kajian/` prefix. If this ever parsed, the list route would be
    // shadowed by the artefact route and the feed would 404 with no other symptom.
    expect(parseArtifactPath("/kajian/index.json")).toBeNull();
  });

  test.each([
    ["the bare prefix", "/kajian"],
    ["a trailing slash", "/kajian/"],
    ["a video id with no file", `/kajian/${ID}`],
    ["a fourth segment", `/kajian/${ID}/sub/slide.html`],
    // THE CASE THE LENGTH CHECK ACTUALLY CATCHES, and the only one. Every other row here is refused
    // by the id or name pattern, so widening `parts.length !== 3` reddened nothing until this was
    // added: here the third segment IS an allowlisted name, and without the length bound
    // `/kajian/<id>/slide.html/anything` would serve the slide from a path that is not its own.
    ["a trailing segment after a valid name", `/kajian/${ID}/slide.html/extra`],
    ["a different prefix", `/audio/${ID}/slide.html`],
  ])("%s does not parse", (_case, path) => {
    expect(parseArtifactPath(path)).toBeNull();
  });

  test("a real artefact path parses into its two parts", () => {
    expect(parseArtifactPath(artifactPath(ID, "slide.html"))).toEqual({ videoId: ID, name: "slide.html" });
  });
});

describe("an uploaded document is served inert", () => {
  test("HTML gets a sandbox and no script", async () => {
    const { env } = bucketWith(`${ID}/slide.html`);

    const res = await serveArtifact(env, ID, "slide.html");
    const csp = res?.headers.get("Content-Security-Policy") ?? "";

    expect(res?.status).toBe(200);
    // `sandbox` with no `allow-same-origin` is what gives the document an opaque origin, so it
    // cannot ride the reader's session. Asserted as an exact token, not a substring of a longer
    // word: `allow-same-origin` also contains "sandbox"-adjacent text in other policies.
    expect(csp.split(";").map((d) => d.trim())).toContain("sandbox");
    expect(csp).toContain("script-src 'none'");
    expect(csp).not.toContain("allow-same-origin");
    expect(csp).not.toContain("allow-scripts");
    expect(res?.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  test("the content type comes from the allowlist, not from the bytes", async () => {
    const { env } = bucketWith(`${ID}/short.m4a`);
    const res = await serveArtifact(env, ID, "short.m4a");
    expect(res?.headers.get("Content-Type")).toBe("audio/mp4");
    // Only the HTML surface needs the policy; an audio file cannot execute.
    expect(res?.headers.get("Content-Security-Policy")).toBeNull();
  });

  test("a missing object answers null, so the caller can fall through to the SPA", async () => {
    const { env } = bucketWith();
    expect(await serveArtifact(env, ID, "slide.html")).toBeNull();
  });

  test("an unbound bucket answers null rather than throwing — prod's state today", async () => {
    expect(await serveArtifact({}, ID, "slide.html")).toBeNull();
  });

  test("a name off the allowlist is never even looked up", async () => {
    const { env } = bucketWith(`${ID}/evil.js`);
    // The object EXISTS in the bucket. It is still not servable, because the refusal happens before
    // the read — otherwise anything that reached the bucket by another route would be reachable.
    expect(await serveArtifact(env, ID, "evil.js")).toBeNull();
  });
});

describe("the size bound", () => {
  test("is a real number of bytes, not a placeholder", () => {
    expect(MAX_ARTIFACT_BYTES).toBe(24 * 1024 * 1024);
  });
});
