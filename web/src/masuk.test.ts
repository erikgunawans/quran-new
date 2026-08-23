/**
 * The sign-in surface's decisions, separated from its plumbing.
 *
 * What is tested is every point where this page tells a person something they will act on: whether
 * a link was actually sent, whether a token was accepted, and whether they are signed in. The
 * `{ok:true, sent:false}` branch is the reason this file is worth its length — it is the state
 * every deploy is in until an operator sets `RESEND_API_KEY`, and collapsing it into "check your
 * inbox" would have the app tell a lie on the operator's behalf.
 */

import { describe, expect, test } from "bun:test";
import {
  parseMasukRoute,
  looksLikeEmail,
  requestOutcome,
  verifyOutcome,
  parseRole,
  MASUK_NOTE,
  LOGOUT_NOTE,
} from "./masuk.ts";

describe("the emailed link's route is parsed, not matched", () => {
  test("the bare form route", () => {
    expect(parseMasukRoute("#/masuk")).toEqual({ kind: "form" });
  });

  test("a token-bearing link is recognised and the token passed through VERBATIM", () => {
    // Copied from the shape `signMagicToken` emits: `<b64url(email)>.<exp>.<mac>`. The dots matter:
    // a parser that split on "/" and then on "." would hand the Worker a fragment of its own token.
    const token = "ZXJpa0BleGFtcGxlLmNvbQ.1787520000000.abcDEF-_123";
    expect(parseMasukRoute(`#/masuk/${token}`)).toEqual({ kind: "verify", token });
  });

  test("a trailing slash with nothing after it is the FORM, not an empty token", () => {
    // What a mangled paste produces. Posting "" to /api/auth/verify spends a request to be told
    // what is already known here.
    expect(parseMasukRoute("#/masuk/")).toEqual({ kind: "form" });
  });

  test("other routes are not claimed", () => {
    for (const hash of ["#/", "#/kajian", "#/admin/kajian", "#/masukkan", ""]) {
      expect(parseMasukRoute(hash)).toBeNull();
    }
  });

  test("`#/masukkan` is NOT a login route — the prefix must be a whole segment", () => {
    // A `startsWith("#/masuk")` check passes this and would route an unrelated page into login.
    expect(parseMasukRoute("#/masukkan")).toBeNull();
  });
});

describe("an obviously malformed address is refused before a request is spent", () => {
  test.each(["a@b.co", "nama.lengkap@contoh.co.id", "  spasi@contoh.com  "])(
    "%s is accepted",
    (raw) => {
      expect(looksLikeEmail(raw)).toBe(true);
    },
  );

  test.each([["no at sign", "nama.contoh.com"], ["no dot in the domain", "nama@contoh"], ["empty", ""], ["spaces inside", "na ma@contoh.com"]])(
    "%s is refused",
    (_case, raw) => {
      expect(looksLikeEmail(raw)).toBe(false);
    },
  );

  test("an address over the 254-char limit is refused", () => {
    expect(looksLikeEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
  });
});

describe("the app never claims an email was sent when none was", () => {
  test("ok+sent says the link is coming, and names the 15-minute expiry", () => {
    const out = requestOutcome({ ok: true, sent: true });
    expect(out.tone).toBe("info");
    expect(out.notice).toContain("15 menit");
  });

  test("⚠ ok WITHOUT sent must NOT tell anyone to check their inbox", () => {
    // The state of every deploy with no RESEND_API_KEY. The request succeeded and no mail exists.
    const out = requestOutcome({ ok: true, sent: false });
    expect(out.tone).toBe("error");
    expect(out.notice).toContain("TIDAK terkirim");
    // The load-bearing assertion: not that the wording is right, but that it does not send someone
    // to wait on an inbox. Written as an absence because that is the failure being prevented.
    expect(out.notice).not.toContain("Buka email");
  });

  test("ok:false is named as a server-side gap the user cannot fix", () => {
    // What production answers TODAY: IDENTITY_HMAC_SECRET is unset.
    const out = requestOutcome({ ok: false, sent: false });
    expect(out.tone).toBe("error");
    expect(out.notice).toContain("pengelola");
    expect(out.notice).not.toContain("Buka email");
  });

  test("an invalid_email verdict from the server is reported as the user's to fix", () => {
    const out = requestOutcome({ ok: false, error: "invalid_email" });
    expect(out.tone).toBe("error");
    expect(out.notice).toContain("ejaan");
  });

  test.each([[null], [undefined], ["not json"], [42], [{}]])(
    "a junk payload (%p) degrades to an error, never to a success claim",
    (payload) => {
      const out = requestOutcome(payload);
      expect(out.tone).toBe("error");
      expect(out.notice).not.toContain("Buka email");
    },
  );
});

describe("the verify landing distinguishes an expired link from a broken server", () => {
  test("success names the account that was signed in", () => {
    const out = verifyOutcome({ ok: true, email: "nama@contoh.com" });
    expect(out.tone).toBe("info");
    expect(out.notice).toContain("nama@contoh.com");
  });

  test("an expired token invites a NEW link, because that fixes it", () => {
    const out = verifyOutcome({ ok: false, error: "invalid_token" });
    expect(out.tone).toBe("error");
    expect(out.notice).toContain("tautan baru");
  });

  test("⚠ a broken server must NOT invite a new link — that loop cannot terminate", () => {
    // `{ok:false}` with no error means the secret or the database is missing. Telling the user to
    // request another link sends them round a circuit that will fail identically every time.
    const out = verifyOutcome({ ok: false });
    expect(out.tone).toBe("error");
    expect(out.notice).not.toContain("tautan baru");
    expect(out.notice).toContain("pengelola");
  });

  test("ok:true with no email is NOT treated as a success", () => {
    // The Worker answers `{ok:false}` in this case, but a success branch keyed only on `ok` would
    // render "Berhasil masuk sebagai undefined".
    expect(verifyOutcome({ ok: true }).tone).toBe("error");
  });
});

describe("the session view never invents an identity", () => {
  test("an anonymous visitor is a member with no email", () => {
    expect(parseRole({ email: null, role: "member" })).toEqual({ email: null, role: "member" });
  });

  test("an empty-string email reads as ANONYMOUS, not as an account named \"\"", () => {
    expect(parseRole({ email: "", role: "member" }).email).toBeNull();
  });

  test("an admin session carries its role through", () => {
    expect(parseRole({ email: "a@b.co", role: "admin" })).toEqual({ email: "a@b.co", role: "admin" });
  });

  test.each([[null], ["nonsense"], [{ role: 7 }], [{}]])(
    "junk (%p) degrades to anonymous member",
    (payload) => {
      expect(parseRole(payload)).toEqual({ email: null, role: "member" });
    },
  );
});

describe("the two paragraphs the page must not lose", () => {
  test("the note says reading needs no account — ADR 1's whole point", () => {
    // A sign-in page is exactly where a reader forms the belief that content is gated behind it.
    expect(MASUK_NOTE).toContain("tanpa masuk");
  });

  test("the note says what is stored, because asking for an email without saying is the worry", () => {
    expect(MASUK_NOTE).toContain("alamat email");
  });

  test("logout copy claims only this device — the token is NOT revoked", () => {
    // `handleAuthLogout` clears the cookie; the signed value stays valid for its remaining 30 days.
    // "Keluar dari semua perangkat" would be a false claim the code cannot make true.
    expect(LOGOUT_NOTE).toContain("perangkat ini");
    expect(LOGOUT_NOTE).not.toContain("semua perangkat");
  });
});
