import { test, expect } from "bun:test";
import { ensureIdentity, withIdentityCookie } from "./identity.ts";

const SECRET = "test-secret-abc-123";

function req(cookie?: string): Request {
  return new Request("https://demo-quranku.axiara.ai/", cookie ? { headers: { Cookie: cookie } } : {});
}
/** Pull the raw `qk_uid=<value>` back out of a Set-Cookie string. */
function cookieValue(setCookie: string): string {
  const first = setCookie.split(";")[0]; // qk_uid=<id>.<mac>
  return first.slice(first.indexOf("=") + 1);
}

test("fresh visitor gets a signed cookie with the hardening attributes", async () => {
  const id = await ensureIdentity(req(), SECRET);
  expect(id.userId).toMatch(/^[0-9a-f]{32}$/);
  expect(id.setCookie).toContain("HttpOnly");
  expect(id.setCookie).toContain("Secure");
  expect(id.setCookie).toContain("SameSite=Lax");
  expect(id.setCookie).toContain("Path=/");
});

test("a valid returning cookie resolves the same id and is NOT re-set", async () => {
  const first = await ensureIdentity(req(), SECRET);
  const second = await ensureIdentity(req(`qk_uid=${cookieValue(first.setCookie!)}`), SECRET);
  expect(second.userId).toBe(first.userId);
  expect(second.setCookie).toBeUndefined();
});

test("a tampered cookie is rejected and a fresh id is minted", async () => {
  const first = await ensureIdentity(req(), SECRET);
  const val = cookieValue(first.setCookie!);
  const tampered = val.slice(0, -1) + (val.endsWith("a") ? "b" : "a");
  const res = await ensureIdentity(req(`qk_uid=${tampered}`), SECRET);
  expect(res.userId).not.toBe(first.userId);
  expect(res.setCookie).toBeDefined();
});

test("a cookie signed with a different secret does not verify", async () => {
  const other = await ensureIdentity(req(), "a-different-secret");
  const res = await ensureIdentity(req(`qk_uid=${cookieValue(other.setCookie!)}`), SECRET);
  expect(res.userId).not.toBe(other.userId);
  expect(res.setCookie).toBeDefined();
});

test("no secret configured → no identity, no cookie (graceful degradation)", async () => {
  const id = await ensureIdentity(req(), undefined);
  expect(id.userId).toBeNull();
  expect(id.setCookie).toBeUndefined();
});

test("withIdentityCookie appends Set-Cookie only when a cookie was minted", async () => {
  const minted = await ensureIdentity(req(), SECRET);
  const withCookie = withIdentityCookie(new Response("ok"), minted);
  expect(withCookie.headers.get("Set-Cookie")).toContain("qk_uid=");

  const returning = await ensureIdentity(req(`qk_uid=${cookieValue(minted.setCookie!)}`), SECRET);
  const noCookie = withIdentityCookie(new Response("ok"), returning);
  expect(noCookie.headers.get("Set-Cookie")).toBeNull();
});
