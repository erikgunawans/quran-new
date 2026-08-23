/**
 * Tests for the Rangkuman Kajian manifest loader.
 *
 * The point of these is that the manifest is written by a SEPARATE process and every string in it
 * came from YouTube. A cast would have made all of this invisible; these assert that a malformed
 * row is dropped rather than rendered as `undefined`, and that a missing manifest degrades to the
 * empty state instead of taking the route down.
 */

import { describe, expect, test } from "bun:test";
import { toKajianSummary, parseKajianIndex, loadKajianSummaries } from "./kajian-feed.ts";

const GOOD = {
  id: "a",
  videoId: "abc123",
  url: "https://youtu.be/abc123",
  title: "Judul",
  channel: "Kanal",
  summaryUrl: "https://example.com/s.html",
  thumbUrl: "https://example.com/t.jpg",
};

describe("record validation drops what it cannot trust", () => {
  test("a complete record is accepted", () => {
    expect(toKajianSummary(GOOD)).not.toBeNull();
  });

  test.each(["id", "videoId", "url", "title", "channel", "summaryUrl", "thumbUrl"])(
    "a record missing %s is dropped",
    (field) => {
      const bad: Record<string, unknown> = { ...GOOD };
      delete bad[field];
      expect(toKajianSummary(bad)).toBeNull();
    },
  );

  test("an empty-string required field is dropped, not rendered blank", () => {
    expect(toKajianSummary({ ...GOOD, title: "   " })).toBeNull();
  });

  test("a non-object is dropped", () => {
    expect(toKajianSummary(null)).toBeNull();
    expect(toKajianSummary("nope")).toBeNull();
    expect(toKajianSummary(42)).toBeNull();
  });
});

describe("optional fields default to absence, never to a guess", () => {
  test("a missing speaker becomes null", () => {
    expect(toKajianSummary(GOOD)!.speaker).toBeNull();
  });

  test("a non-string duration becomes 0 rather than NaN", () => {
    expect(toKajianSummary({ ...GOOD, durationSec: "long" })!.durationSec).toBe(0);
    expect(toKajianSummary({ ...GOOD, durationSec: Number.NaN })!.durationSec).toBe(0);
  });

  test("reviewed is true ONLY when the record says exactly true", () => {
    expect(toKajianSummary(GOOD)!.reviewed).toBe(false);
    expect(toKajianSummary({ ...GOOD, reviewed: "yes" })!.reviewed).toBe(false);
    expect(toKajianSummary({ ...GOOD, reviewed: 1 })!.reviewed).toBe(false);
    expect(toKajianSummary({ ...GOOD, reviewed: true })!.reviewed).toBe(true);
  });
});

describe("index parsing", () => {
  test("accepts a bare array and an { items } wrapper", () => {
    expect(parseKajianIndex([GOOD])).toHaveLength(1);
    expect(parseKajianIndex({ items: [GOOD] })).toHaveLength(1);
  });

  test("one bad row does not empty the list", () => {
    expect(parseKajianIndex([GOOD, { broken: true }, GOOD])).toHaveLength(2);
  });

  test("nonsense payloads yield an empty list, not a throw", () => {
    expect(parseKajianIndex(null)).toEqual([]);
    expect(parseKajianIndex("<html>")).toEqual([]);
  });
});

describe("loading degrades softly", () => {
  const res = (body: unknown, ok = true, type = "application/json") =>
    ({ ok, headers: new Headers({ "content-type": type }), json: async () => body }) as unknown as Response;

  test("a good manifest loads", async () => {
    expect(await loadKajianSummaries(async () => res([GOOD]))).toHaveLength(1);
  });

  test("the SPA fallback (HTML at 200) is refused rather than parsed", async () => {
    // A missing asset on this host returns index.html at 200, so status alone cannot be trusted.
    expect(await loadKajianSummaries(async () => res("<!doctype html>", true, "text/html"))).toEqual([]);
  });

  test("a 404 yields the empty state", async () => {
    expect(await loadKajianSummaries(async () => res([GOOD], false))).toEqual([]);
  });

  test("a network throw yields the empty state rather than taking down the route", async () => {
    expect(
      await loadKajianSummaries(async () => {
        throw new Error("offline");
      }),
    ).toEqual([]);
  });
});
