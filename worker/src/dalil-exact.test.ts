/**
 * ISC-495..499 — the additive, default-off exact-scoring option on `searchDalil`.
 *
 * WHY THIS TEST EXISTS AT ALL. ISC-323.2 proved the live query path scores against an approximate
 * representation and that `returnValues: true` returns true cosines. Erik's answer (2026-08-18) was
 * "measure first, default-off param" — so the option must be reachable for a probe and INVISIBLE to
 * production. Those are two claims, and a test that only checks the option exists would pass on a
 * parameter nothing reads. This repo has already shipped one prescribed fix that was byte-identical
 * to the default and closed the item having changed nothing; the guard against repeating that is to
 * capture what `VECTORIZE.query` was ACTUALLY handed, in both states, from the real function.
 *
 * The fake binding RECORDS rather than throws. A mock that throws on the wrong call would be
 * swallowed by `searchDalil`'s own error handling and the test would pass green while asserting
 * nothing — that failure mode is on record here too.
 */
import { describe, expect, test } from "bun:test";
import { searchDalil, type DalilEnv } from "./dalil.ts";

/** Captures every options object the binding is handed, and returns no matches so the rest is skipped. */
function recordingEnv() {
  const seen: Record<string, unknown>[] = [];
  const env = {
    OPENROUTER_API_KEY: "test-key",
    VECTORIZE: {
      query(_v: number[], opts: Record<string, unknown>) {
        seen.push(opts);
        return Promise.resolve({ matches: [] });
      },
    },
  } as unknown as DalilEnv;
  return { env, seen };
}

// `searchDalil` embeds before it queries, so the embed call must resolve for the query to happen.
const withStubbedEmbed = async (fn: () => Promise<unknown>) => {
  const real = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ data: [{ embedding: Array.from({ length: 1024 }, () => 0.01) }] }), {
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
};

describe("searchDalil — exact-scoring option (ISC-495..499)", () => {
  test("ISC-496: by default the query options carry NO returnValues key — absent, not false", async () => {
    const { env, seen } = recordingEnv();
    await withStubbedEmbed(() => searchDalil(env, "gimana hukumnya meninggalkan sholat"));
    expect(seen.length).toBe(1);
    expect("returnValues" in seen[0]!).toBe(false);
  });

  test("ISC-497: with exactScores the query options carry returnValues: true", async () => {
    const { env, seen } = recordingEnv();
    await withStubbedEmbed(() =>
      searchDalil(env, "gimana hukumnya meninggalkan sholat", undefined, undefined, { exactScores: true }),
    );
    expect(seen.length).toBe(1);
    expect(seen[0]!.returnValues).toBe(true);
  });

  test("ISC-495: the option is additive — topK and returnMetadata are unchanged in both arms", async () => {
    const { env, seen } = recordingEnv();
    await withStubbedEmbed(() => searchDalil(env, "q"));
    await withStubbedEmbed(() => searchDalil(env, "q", undefined, undefined, { exactScores: true }));
    for (const o of seen) {
      expect(o.topK).toBe(50);
      expect(o.returnMetadata).toBe("all");
    }
  });
});
