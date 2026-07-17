import { afterEach, describe, expect, test } from "bun:test";
import { liveThemeModel } from "./theme-live.ts";

const ctx = { question: "ngerasa Tuhan udah nyerah sama aku", themes: ["Forgiveness & despair", "Trust in God"] };
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(status: number, payload: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("liveThemeModel", () => {
  test("returns the themes the Worker classified", async () => {
    stubFetch(200, { themes: ["Forgiveness & despair"] });
    expect(await liveThemeModel(ctx)).toEqual(["Forgiveness & despair"]);
  });

  test("throws when the endpoint is not there yet (404) → caller keeps the lexicon", async () => {
    stubFetch(404, { error: "not found" });
    await expect(liveThemeModel(ctx)).rejects.toThrow();
  });

  test("throws when the shape is wrong → caller keeps the lexicon", async () => {
    stubFetch(200, { oops: true });
    await expect(liveThemeModel(ctx)).rejects.toThrow();
  });
});
