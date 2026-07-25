import { test, expect } from "bun:test";
import { isValidEmail, normalizeEmail, signMagicToken, verifyMagicToken } from "./auth.ts";

const SECRET = "test-magic-secret";
const NOW = 1_000_000_000_000;

test("isValidEmail accepts sane addresses and rejects junk", () => {
  expect(isValidEmail("a@b.co")).toBe(true);
  expect(isValidEmail("erik.gs@axiara.ai")).toBe(true);
  expect(isValidEmail("no-at-sign")).toBe(false);
  expect(isValidEmail("two@@at.com")).toBe(false);
  expect(isValidEmail("space @b.co")).toBe(false);
  expect(isValidEmail("x@y")).toBe(false);
});

test("normalizeEmail lowercases and trims", () => {
  expect(normalizeEmail("  Erik@Axiara.AI ")).toBe("erik@axiara.ai");
});

test("a fresh token verifies back to its email", async () => {
  const token = await signMagicToken("erik@axiara.ai", SECRET, NOW);
  expect(await verifyMagicToken(token, SECRET, NOW + 1000)).toBe("erik@axiara.ai");
});

test("an expired token is rejected", async () => {
  const token = await signMagicToken("erik@axiara.ai", SECRET, NOW);
  expect(await verifyMagicToken(token, SECRET, NOW + 16 * 60 * 1000)).toBeNull(); // TTL is 15 min
});

test("a token signed with a different secret is rejected", async () => {
  const token = await signMagicToken("erik@axiara.ai", SECRET, NOW);
  expect(await verifyMagicToken(token, "other-secret", NOW + 1000)).toBeNull();
});

test("a tampered token is rejected", async () => {
  const token = await signMagicToken("erik@axiara.ai", SECRET, NOW);
  const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
  expect(await verifyMagicToken(tampered, SECRET, NOW + 1000)).toBeNull();
});

test("a swapped-email payload (same mac) is rejected", async () => {
  const token = await signMagicToken("erik@axiara.ai", SECRET, NOW);
  const [, exp, mac] = token.split(".");
  const forged = `${btoa("attacker@evil.com").replace(/=+$/, "")}.${exp}.${mac}`;
  expect(await verifyMagicToken(forged, SECRET, NOW + 1000)).toBeNull();
});

test("malformed tokens return null, not throw", async () => {
  expect(await verifyMagicToken("garbage", SECRET, NOW)).toBeNull();
  expect(await verifyMagicToken("a.b", SECRET, NOW)).toBeNull();
  expect(await verifyMagicToken("", SECRET, NOW)).toBeNull();
});
