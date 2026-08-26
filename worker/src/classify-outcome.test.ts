/**
 * `{"themes": []}` had four causes and one appearance (ISC-658).
 *
 * A model that answered "nothing matched", a model call that threw, and a model that named themes
 * outside the closed set all left the route by the same door. Three cycles of probe output reported
 * *"0 themes on 14 of 16 turns"* as an urgent red item nobody could act on, because the number could
 * not separate a broken classifier from a working one answering ruling questions against an
 * emotional vocabulary — which is what it turned out to be for six of eight.
 *
 * The comment above `handleClassify`'s own `catch` already records this exact failure mode from the
 * 80-token incident: *"it failed invisibly because `[]` is also the legitimate answer"*. The lesson
 * was written down and the shape was left in place. These arms pin the shape shut.
 *
 * ⚠️ `themes` IS THE CONTRACT AND MUST NOT MOVE. `outcome` is additive telemetry; a client that
 * reads only `themes` must behave exactly as it did before. One arm below asserts that directly.
 */
import { afterEach, describe, expect, test } from "bun:test";
import worker, { type Env } from "./index.ts";

const VALID = ["Anxiety & fear", "Grief & loss", "Patience"];
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Make the upstream model answer with `content`, or throw if `content` is null. */
function stubModel(content: string | null): void {
  globalThis.fetch = (async () => {
    if (content === null) throw new Error("upstream is down");
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

async function classify(question: string, themes: unknown = VALID): Promise<{ themes: string[]; outcome: string }> {
  const env = { EDITION: "synthesis", OPENROUTER_API_KEY: "test-key" } as unknown as Env;
  const res = await worker.fetch(
    new Request("https://new-quranku.axiara.ai/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, themes }),
    }),
    env,
    { waitUntil: () => {}, passThroughOnException: () => {} } as never,
  );
  return (await res.json()) as { themes: string[]; outcome: string };
}

describe("every way of arriving at an empty list is now named", () => {
  test("themes matched — the healthy case, and the control for all four arms below", async () => {
    // Without this arm the others would pass just as happily against a route that always says [],
    // which is the failure being tested for.
    stubModel(JSON.stringify(["Anxiety & fear"]));
    expect(await classify("aku cemas")).toEqual({ themes: ["Anxiety & fear"], outcome: "matched" });
  });

  test("the model answered, and nothing matched — a RULING question, and legitimately empty", async () => {
    stubModel("[]");
    expect(await classify("apa hukum riba dalam islam")).toEqual({ themes: [], outcome: "none" });
  });

  test("the model call THREW — indistinguishable from the above until now", async () => {
    stubModel(null);
    expect(await classify("aku cemas")).toEqual({ themes: [], outcome: "error" });
  });

  test("the model named themes OUTSIDE the closed set — guarded away, and that is worth knowing", async () => {
    // Not the same event as "nothing matched": it means the model is answering out of vocabulary,
    // which is what the 80-token incident would have looked like from the outside.
    stubModel(JSON.stringify(["Kesedihan", "Rasa takut"]));
    expect(await classify("aku cemas")).toEqual({ themes: [], outcome: "dropped" });
  });

  test("a request with no themes to choose from never reaches the model", async () => {
    stubModel(JSON.stringify(["Anxiety & fear"]));
    expect(await classify("aku cemas", [])).toEqual({ themes: [], outcome: "none" });
  });
});

describe("the existing contract is untouched", () => {
  test("`themes` is still an array of the guarded strings, whatever `outcome` says", async () => {
    // liveThemeModel reads `data.themes` and nothing else. A client that ignores `outcome` must not
    // be able to tell this change happened.
    stubModel(JSON.stringify(["Anxiety & fear", "Patience"]));
    const body = await classify("aku cemas dan berusaha sabar");
    expect(body.themes).toEqual(["Anxiety & fear", "Patience"]);
  });
});
