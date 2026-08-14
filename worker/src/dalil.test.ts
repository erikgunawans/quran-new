/**
 * Tests for the retrieval-failure classifier.
 *
 * WHY THIS IS TESTED AT ALL. The token it returns is the ONLY thing that will distinguish "retrieval
 * found nothing" from "retrieval died at stage X" on production traffic — `/api/answer` has no
 * logging by design, and the catch it feeds discarded the error entirely until 2026-08-15. A
 * classifier that silently mislabels a stage sends the next session to the wrong file with full
 * confidence, which is worse than the silence it replaced.
 */
import { describe, expect, it } from "bun:test";
import { classifyDalilFailure } from "./dalil.ts";

describe("classifyDalilFailure", () => {
  it("names the stage for every message dalil.ts actually throws", () => {
    // These strings are copied from the throw sites, not invented. If a throw is reworded and this
    // test is not updated, the classifier starts reporting "unknown" for a stage it used to name —
    // which is exactly the drift the ordering comment in dalil.ts warns about.
    expect(classifyDalilFailure(new Error("OPENROUTER_API_KEY not configured"))).toBe("config");
    expect(classifyDalilFailure(new Error("CORPUS bucket not bound"))).toBe("config");
    expect(classifyDalilFailure(new Error("CORPUS_DIGEST not configured"))).toBe("config");
    expect(classifyDalilFailure(new Error("embeddings 401"))).toBe("embed");
    expect(classifyDalilFailure(new Error("empty embedding"))).toBe("embed");
    expect(classifyDalilFailure(new Error("rerank 429"))).toBe("rerank");
    expect(classifyDalilFailure(new Error("empty rerank result"))).toBe("rerank");
  });

  it("classifies the text-layer message as text-layer, though it CONTAINS the word rerank", () => {
    // The real message embeds the object key, which ends `rerank-en.json.gz`. Test the actual string.
    const real = new Error("text layer missing at text/8177e2e6e6c47370/rerank-en.json.gz");
    expect(classifyDalilFailure(real)).toBe("text-layer");
  });

  it("never echoes the failing object key back to the caller", () => {
    // The whole reason this returns a token instead of e.message: /api/answer is public, and the
    // text-layer throw carries the private bucket's key layout.
    const real = new Error("text layer missing at text/8177e2e6e6c47370/rerank-en.json.gz");
    const token = classifyDalilFailure(real);
    expect(token).not.toContain("8177e2e6e6c47370");
    expect(token).not.toContain("/");
    expect(token.length).toBeLessThan(20);
  });

  it("falls back to unknown rather than guessing a stage", () => {
    expect(classifyDalilFailure(new Error("Network connection lost"))).toBe("unknown");
    expect(classifyDalilFailure(new Error(""))).toBe("unknown");
  });

  it("survives a non-Error throw", () => {
    // Workers can reject with things that are not Errors; `e.message` on those is undefined and an
    // unguarded read would throw INSIDE the catch, turning a degraded turn into a 500.
    expect(classifyDalilFailure("some string")).toBe("unknown");
    expect(classifyDalilFailure(null)).toBe("unknown");
    expect(classifyDalilFailure(undefined)).toBe("unknown");
    expect(classifyDalilFailure({ weird: true })).toBe("unknown");
  });
});
