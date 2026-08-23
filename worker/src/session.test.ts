/**
 * Tests for `qk_auth` (Track B step 1, ADR 2).
 *
 * The centrepiece is the CROSS-DOMAIN pair: a magic-link token must not verify as a session, and a
 * session must not verify as a magic-link token. ADR 2 says to reuse the magic-token primitive, and
 * reusing it literally would make those two interchangeable — a login credential that travels in a
 * URL would become a 30-day session, and vice versa. Asserted against the REAL `auth.ts` signer, not
 * a hand-rolled imitation of it, because an imitation would prove nothing about the actual pair.
 */

import { describe, expect, test } from "bun:test";
import {
  signSession,
  verifySession,
  roleFor,
  roleForRequest,
  readAuthCookie,
  buildAuthCookie,
  clearAuthCookie,
  SESSION_TTL_MS,
  AUTH_COOKIE,
} from "./session.ts";
import { signMagicToken, verifyMagicToken } from "./auth.ts";
import { requireRole } from "./index.ts";

const SECRET = "test-secret-value";
const NOW = 1_700_000_000_000;
const EMAIL = "erik@axiara.ai";

describe("a session round-trips", () => {
  test("a freshly signed session verifies to its email", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    expect(await verifySession(t, SECRET, NOW)).toBe(EMAIL);
  });

  test("the email is normalised on the way in and out", async () => {
    const t = await signSession("  Erik@Axiara.AI  ", SECRET, NOW);
    expect(await verifySession(t, SECRET, NOW)).toBe(EMAIL);
  });
});

describe("DOMAIN SEPARATION — the two token types are not interchangeable", () => {
  test("a magic-link token does NOT verify as a session", async () => {
    // A magic token rides in the URL FRAGMENT (`#/masuk/<token>`), so it reaches browser history.
    // Not server logs and not `Referer` — both strip fragments; scoped so the comment does not
    // inflate the channels. If it verified here it would be a 30-day session cookie.
    const magic = await signMagicToken(EMAIL, SECRET, NOW);
    expect(await verifySession(magic, SECRET, NOW)).toBeNull();
  });

  test("a session does NOT verify as a magic-link token", async () => {
    // The reverse leak: a stolen session cookie must not also be a login credential.
    const session = await signSession(EMAIL, SECRET, NOW);
    expect(await verifyMagicToken(session, SECRET, NOW)).toBeNull();
  });

  test("both are valid in their OWN domain — the separation is not just breakage", async () => {
    // Without this arm the two tests above would pass if signing were simply broken.
    expect(await verifyMagicToken(await signMagicToken(EMAIL, SECRET, NOW), SECRET, NOW)).toBe(EMAIL);
    expect(await verifySession(await signSession(EMAIL, SECRET, NOW), SECRET, NOW)).toBe(EMAIL);
  });
});

describe("verification refuses everything it cannot prove", () => {
  test("a tampered MAC is refused", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    const parts = t.split(".");
    expect(await verifySession(`${parts[0]}.${parts[1]}.${"A".repeat(parts[2]!.length)}`, SECRET, NOW)).toBeNull();
  });

  test("a swapped email with the original MAC is refused", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    const parts = t.split(".");
    const other = btoa("attacker@evil.com").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifySession(`${other}.${parts[1]}.${parts[2]}`, SECRET, NOW)).toBeNull();
  });

  test("an extended expiry with the original MAC is refused", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    const parts = t.split(".");
    expect(await verifySession(`${parts[0]}.${NOW + SESSION_TTL_MS * 10}.${parts[2]}`, SECRET, NOW)).toBeNull();
  });

  test("an expired session is refused", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    expect(await verifySession(t, SECRET, NOW + SESSION_TTL_MS + 1)).toBeNull();
  });

  test("a different secret is refused", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    expect(await verifySession(t, "other-secret", NOW)).toBeNull();
  });

  test("an EMPTY secret is refused on BOTH sides, by name rather than as a DOMException", async () => {
    // A misconfigured Worker must not authenticate everyone. The two sides refuse differently on
    // purpose: signing throws (an operator fault worth surfacing), verifying returns null (a
    // verifier refuses, it does not crash on input).
    expect(signSession(EMAIL, "", NOW)).rejects.toThrow("empty secret");
    const signed = await signSession(EMAIL, SECRET, NOW);
    expect(await verifySession(signed, "", NOW)).toBeNull();
  });

  test("malformed shapes are refused without throwing", async () => {
    for (const bad of ["", "a", "a.b", "a.b.c.d", "!!!.123.xyz"]) {
      expect(await verifySession(bad, SECRET, NOW)).toBeNull();
    }
  });
});

describe("roleFor reads the allowlist and fails closed", () => {
  test("an unset allowlist grants nobody, not everybody", () => {
    expect(roleFor(EMAIL, {})).toBe("member");
    expect(roleFor(EMAIL, { ADMIN_EMAILS: "" })).toBe("member");
    expect(roleFor(EMAIL, { ADMIN_EMAILS: "   " })).toBe("member");
  });

  test("a listed admin resolves to admin, case- and space-insensitively", () => {
    expect(roleFor(EMAIL, { ADMIN_EMAILS: "  ERIK@Axiara.ai , other@x.com " })).toBe("admin");
  });

  test("a listed reviewer resolves to reviewer", () => {
    expect(roleFor("ustadz@example.com", { REVIEWER_EMAILS: "ustadz@example.com" })).toBe("reviewer");
  });

  test("an unlisted email is a Member — ADR 1's floor, not an error", () => {
    expect(roleFor("someone@else.com", { ADMIN_EMAILS: EMAIL })).toBe("member");
  });

  test("a null email (Anonymous Visitor) is a Member", () => {
    expect(roleFor(null, { ADMIN_EMAILS: EMAIL })).toBe("member");
  });

  test("admin outranks reviewer when an address is on both lists", () => {
    expect(roleFor(EMAIL, { ADMIN_EMAILS: EMAIL, REVIEWER_EMAILS: EMAIL })).toBe("admin");
  });

  test("a substring of a listed address is NOT granted the role", () => {
    // "erik@axiara.ai.evil.com" must not match on a prefix, and neither must a bare local part.
    expect(roleFor("erik@axiara.ai.evil.com", { ADMIN_EMAILS: EMAIL })).toBe("member");
    expect(roleFor("erik", { ADMIN_EMAILS: EMAIL })).toBe("member");
  });
});

describe("cookie handling", () => {
  test("the auth cookie is HttpOnly, Secure and SameSite=Lax", () => {
    const c = buildAuthCookie("tok");
    // HttpOnly is the load-bearing one: this cookie proves an account, so script must not read it.
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
  });

  test("clearing sets Max-Age=0 and keeps the same flags", () => {
    const c = clearAuthCookie();
    expect(c).toContain("Max-Age=0");
    expect(c).toContain("HttpOnly");
  });

  test("the cookie is read out of a header carrying several cookies", () => {
    expect(readAuthCookie(`qk_uid=abc; ${AUTH_COOKIE}=xyz; other=1`)).toBe("xyz");
  });

  test("absence, emptiness and a missing header all read as null", () => {
    expect(readAuthCookie(null)).toBeNull();
    expect(readAuthCookie("qk_uid=abc")).toBeNull();
    expect(readAuthCookie(`${AUTH_COOKIE}=`)).toBeNull();
  });

  test("a cookie whose NAME merely ends in the cookie name is not mistaken for it", () => {
    expect(readAuthCookie(`not___Host-qk_auth=xyz`)).toBeNull();
  });

  test("an UNPREFIXED `qk_auth` is ignored — this is what the __Host- prefix buys", () => {
    // A sibling surface on axiara.ai can set `Domain=axiara.ai; qk_auth=…`, but the browser refuses
    // to let anything set a `__Host-` cookie with a Domain. Accepting the bare name as a fallback
    // would hand that shadow back the position the prefix removes.
    expect(readAuthCookie(`qk_auth=shadow`)).toBeNull();
    expect(readAuthCookie(`qk_auth=shadow; ${AUTH_COOKIE}=real`)).toBe("real");
  });

  test("the cookie NAME carries the __Host- prefix, whose preconditions the flags satisfy", () => {
    expect(AUTH_COOKIE.startsWith("__Host-")).toBe(true);
    const c = buildAuthCookie("tok");
    // The browser enforces the prefix only if all three hold; a Domain attribute would void it.
    expect(c).toContain("Secure");
    expect(c).toContain("Path=/");
    expect(c).not.toContain("Domain=");
    expect(clearAuthCookie()).not.toContain("Domain=");
  });
});

describe("roleForRequest", () => {
  const req = (cookie?: string) =>
    new Request("https://example.com/api/x", cookie === undefined ? {} : { headers: { cookie } });

  test("an Anonymous Visitor is a Member and not an error", async () => {
    expect(await roleForRequest(req(), SECRET, {}, NOW)).toEqual({ email: null, role: "member" });
  });

  test("a valid session on the admin list resolves to admin", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    expect(await roleForRequest(req(`${AUTH_COOKIE}=${t}`), SECRET, { ADMIN_EMAILS: EMAIL }, NOW)).toEqual({
      email: EMAIL,
      role: "admin",
    });
  });

  test("a FORGED cookie carrying an admin address resolves to Anonymous, not admin", async () => {
    // The whole point: the allowlist is checked only against an email the signature proved.
    const forged = `${btoa(EMAIL).replace(/=+$/, "")}.${NOW + SESSION_TTL_MS}.notavalidmac`;
    expect(await roleForRequest(req(`${AUTH_COOKIE}=${forged}`), SECRET, { ADMIN_EMAILS: EMAIL }, NOW)).toEqual({
      email: null,
      role: "member",
    });
  });

  test("an expired admin session resolves to Anonymous", async () => {
    const t = await signSession(EMAIL, SECRET, NOW);
    const info = await roleForRequest(req(`${AUTH_COOKIE}=${t}`), SECRET, { ADMIN_EMAILS: EMAIL }, NOW + SESSION_TTL_MS + 1);
    expect(info).toEqual({ email: null, role: "member" });
  });
});


describe("requireRole — roles are DISJOINT capabilities, not a ladder", () => {
  // These exist because a rank-based `requireRole` — member < reviewer < admin, admitting anyone at
  // or above the needed rank — lets an Administrator through a Reviewer gate, which is
  // the one thing ADR 4 forbids: "An Administrator never sees content". No test caught it, so the
  // ladder landed green IN ITS OWN CHANGE — it never reached a deploy, which is gated to Erik. The assertions below are written against the SEPARATION, not the ranks.
  const req = (cookie?: string) =>
    new Request("https://example.com/api/x", cookie === undefined ? {} : { headers: { cookie } });
  const env = { IDENTITY_HMAC_SECRET: SECRET, ADMIN_EMAILS: EMAIL, REVIEWER_EMAILS: "ustadz@example.com" };
  // Signed at the REAL clock, because `requireRole` calls `Date.now()` internally. Signing at the
  // fixed NOW above (2023) yields an ALREADY-EXPIRED cookie, and refusal assertions then pass on
  // expiry rather than on role separation.
  //
  // ONLY THE MEASURED CLAIM IS STATED HERE. Two attempts to enumerate which assertions are affected
  // were both wrong — the first swept ("every refusal assertion"), the second miscounted the callers
  // of `signed()` and misclassified one. Re-derive by running it, do not trust a list.
  // Measured: reverting `signed()` to NOW fails two tests, and the positive control arm
  // ("each role passes its OWN gate") is one of them — which is why that arm is here at all.
  const signed = async (who: string) => `${AUTH_COOKIE}=${await signSession(who, SECRET, Date.now())}`;

  test("an Administrator is REFUSED a Reviewer gate", async () => {
    const res = await requireRole(req(await signed(EMAIL)), env as never, "reviewer");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  test("a Reviewer is REFUSED an Administrator gate", async () => {
    const res = await requireRole(req(await signed("ustadz@example.com")), env as never, "admin");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  test("each role passes its OWN gate — the separation is not just blanket refusal", async () => {
    expect(await requireRole(req(await signed(EMAIL)), env as never, "admin")).toBeNull();
    expect(await requireRole(req(await signed("ustadz@example.com")), env as never, "reviewer")).toBeNull();
  });

  test('needed:"member" means SIGNED IN, so an Anonymous Visitor is refused', async () => {
    // An Anonymous Visitor also resolves to role "member" (ADR 1's floor), so a naive
    // `role === needed` check here would gate nothing at all.
    const res = await requireRole(req(), env as never, "member");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  test('needed:"member" admits any signed-in account, privileged or not', async () => {
    expect(await requireRole(req(await signed("plain@example.com")), env as never, "member")).toBeNull();
    expect(await requireRole(req(await signed(EMAIL)), env as never, "member")).toBeNull();
  });

  test("a forged cookie is refused at every gate", async () => {
    const forged = `${AUTH_COOKIE}=${btoa(EMAIL).replace(/=+$/, "")}.${Date.now() + SESSION_TTL_MS}.badmac`;
    for (const need of ["member", "reviewer", "admin"] as const) {
      expect(await requireRole(req(forged), env as never, need)).not.toBeNull();
    }
  });

  test("the 403 body does not say WHICH of the two reasons applied", async () => {
    // "you are not an admin" tells an anonymous caller the endpoint exists and is worth attacking.
    const anon = await requireRole(req(), env as never, "admin");
    const wrong = await requireRole(req(await signed("plain@example.com")), env as never, "admin");
    expect(await anon!.clone().text()).toBe(await wrong!.clone().text());
  });
});
