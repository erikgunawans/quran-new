import { afterEach, describe, expect, test } from "bun:test";
import { liveFramingModel } from "./compose-live.ts";

const ctx = { question: "capek banget", theme: "Hardship & ease", themeCount: 1 };
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

describe("liveFramingModel", () => {
  test("returns the prose the Worker approved", async () => {
    stubFetch(200, { prose: "Berat ya. Aku di sini." });
    expect(await liveFramingModel(ctx)).toBe("Berat ya. Aku di sini.");
  });

  test("throws when the Worker rejected the output (prose: null) → caller falls back", async () => {
    stubFetch(200, { prose: null });
    await expect(liveFramingModel(ctx)).rejects.toThrow();
  });

  test("throws when the endpoint is not there yet (404) → safe before deploy", async () => {
    stubFetch(404, { error: "not found" });
    await expect(liveFramingModel(ctx)).rejects.toThrow();
  });
});
