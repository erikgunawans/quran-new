import { test, expect } from "bun:test";
import { parseProfile, buildUserMessage } from "./distill.ts";

test("parseProfile extracts JSON even when wrapped in prose/fences", () => {
  const raw = 'Berikut profilnya:\n```json\n{"interest_tags":["kecemasan","rezeki"],"summary":"Sedang mencari ketenangan."}\n```';
  const p = parseProfile(raw);
  expect(p).not.toBeNull();
  expect(p!.interest_tags).toEqual(["kecemasan", "rezeki"]);
  expect(p!.summary).toBe("Sedang mencari ketenangan.");
});

test("parseProfile caps tags at 6 and clamps tag length", () => {
  const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
  const p = parseProfile(JSON.stringify({ interest_tags: [...tags, "x".repeat(80)], summary: "ok" }));
  expect(p!.interest_tags.length).toBe(6);
  expect(p!.interest_tags.every((t) => t.length <= 40)).toBe(true);
});

test("parseProfile drops non-string tags and clamps summary", () => {
  const p = parseProfile(JSON.stringify({ interest_tags: ["sabar", 5, null, "syukur"], summary: "s".repeat(500) }));
  expect(p!.interest_tags).toEqual(["sabar", "syukur"]);
  expect(p!.summary.length).toBe(240);
});

test("parseProfile returns null on non-JSON or empty content", () => {
  expect(parseProfile("maaf, tidak ada data")).toBeNull();
  expect(parseProfile(JSON.stringify({ interest_tags: [], summary: "" }))).toBeNull();
});

test("buildUserMessage renders questions and reads, newest first, skipping malformed", () => {
  const msg = buildUserMessage([
    { kind: "question", payload: JSON.stringify({ question: "kenapa cemas" }) },
    { kind: "read", payload: JSON.stringify({ ref: "2:255" }) },
    { kind: "question", payload: "{{bad json" },
    { kind: "bookmark", payload: JSON.stringify({ ref: "1:1" }) }, // not a distilled kind
  ]);
  expect(msg).toContain("Bertanya: kenapa cemas");
  expect(msg).toContain("Membaca: QS 2:255");
  expect(msg).not.toContain("bad json");
  expect(msg).not.toContain("1:1");
});
