/**
 * ACCOUNT PROOF — the `qk_auth` cookie, and the role it resolves to. (Track B step 1, ADR 2.)
 *
 * ── WHY THIS IS NOT THE IDENTITY COOKIE ─────────────────────────────────────────────────────────
 *
 * Two cookies now exist with genuinely different jobs, and ADR 2's consequence section says the
 * difference has to stay legible — conflating them later would reintroduce the bug it was written
 * to kill. So they live in different modules:
 *
 *   · `qk_uid`  — the anonymous Identity cookie. ADDRESSES MEMORY. Untouched by this file.
 *   · `qk_auth` — this one. PROVES AN ACCOUNT. Carries an authenticated email and an expiry.
 *
 * Role resolution reads the email from `qk_auth` and NEVER reads `canonical_user_id`. ADR 2 records
 * why: that column has no UNIQUE constraint and no index, and `handleAuthVerify` re-points the
 * device cookie at the account's canonical id on login — so two Accounts that signed in on one
 * family tablet end up sharing an id permanently. Resolving a role through it would leak a
 * Reviewer's privilege to whoever else used that browser.
 *
 * ── DOMAIN SEPARATION, WHICH ADR 2 DOES NOT MENTION AND WHICH THIS FILE MUST NOT OMIT ───────────
 *
 * ADR 2 says to use "the same primitive `auth.ts` already uses for magic tokens". Taken literally —
 * same layout, same secret, same MAC — the two token types become INTERCHANGEABLE:
 *
 *   · a 15-minute magic-link token would validate as a 30-day session cookie. This app puts the
 *     token in the FRAGMENT (`${origin}/#/masuk/${token}`), so it reaches browser history but NOT
 *     server or CDN logs and not `Referer` — both strip fragments. AND THE LARGEST CHANNEL IS THE
 *     ONE THE FRAGMENT ARGUMENT DISTRACTS FROM: the link is DELIVERED BY EMAIL, so it traverses
 *     Resend, the recipient's mail provider, and then sits in a mailbox indefinitely. That is the
 *     strongest reason a 15-minute credential must not double as a 30-day session; and
 *   · a session cookie would validate as a magic-link token, making it a login credential.
 *
 * Same primitive, different DOMAIN. Every signature here covers a constant tag that the magic-token
 * signer does not use, so a token minted for one purpose cannot verify for the other. The tag is
 * versioned so the scheme can be rotated without silently accepting the old one.
 *
 * ── WHERE ROLES COME FROM, AND WHY NOT A TABLE ──────────────────────────────────────────────────
 *
 * No ADR settles this, so it is decided here and stated rather than buried. Roles are read from
 * environment allowlists, not from a database row an endpoint could write. There are at most two
 * privileged people, and the property that matters is that NOTHING IN THE RUNNING APP CAN GRANT
 * PRIVILEGE — becoming an Administrator requires an operator editing a secret and redeploying. A
 * `roles` table would put privilege one SQL injection or one careless admin route away.
 *
 * It FAILS CLOSED: an unset or empty allowlist means nobody holds that role, never everybody. An
 * email that matches nothing is a Member, which is the correct floor — ADR 1 says registration is a
 * sync tier, so Member is not a privilege, it is just "has an Account".
 *
 * The Reviewer allowlist ships EMPTY. The role "exists for Ustadz Ahmad" (`CONTEXT.md`), but Erik
 * withdrew the wait on 2026-08-22 and no address is hardcoded here — an email is PII and belongs in
 * a secret typed by an operator, not in a source file.
 */

const enc = new TextEncoder();

/** 30 days. Long enough that a reader is not re-logging-in constantly; short enough to expire. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * `__Host-` PREFIX, adopted 2026-08-23 on Erik's instruction in session. No artefact in
 * `docs/review/` attests that instruction; it is named here because it authorises NOTHING — the
 * prefix only removes capability — but the attribution is a relay, not a record.
 *
 * The prefix is enforced by the BROWSER, not by us: a cookie whose name starts `__Host-` is accepted
 * only when it is `Secure`, has `Path=/`, and carries **no `Domain` attribute** — which means it can
 * only ever be set by the exact host that serves it. `axiara.ai` hosts several surfaces
 * (`new-quranku`, `demo-quranku`), and without the prefix any of them could set
 * `Domain=axiara.ai; qk_auth=…` and have it ride on requests to this one.
 *
 * WHAT THAT SHADOW COULD AND COULD NOT DO, precisely: it could NOT escalate — a forged value cannot pass `verifySession` without the Worker
 * secret, and `roleFor` is only ever consulted with an email that verification returned. What it
 * COULD do is ACCOUNT CONFUSION: `readAuthCookie` returns the FIRST match in the header, so a shadow
 * would make the victim's browser present someone else's proof — ACCOUNT CONFUSION, not a demotion.
 *
 * Only the prefixed name is read. Accepting a bare `qk_auth` as a fallback would hand the shadow
 * back exactly the position the prefix removes.
 *
 * (`Secure` does not break local development: browsers treat `http://localhost` as a secure context.)
 */
export const AUTH_COOKIE = "__Host-qk_auth";

/**
 * The domain tag. Signatures cover it, so a magic-link token can never verify as a session.
 * Bump the version to invalidate every outstanding session.
 */
const SESSION_DOMAIN = "qk_auth:v1";

/**
 * ADR 1: Member is a SYNC tier, not a privilege tier. Reviewer and Administrator are about
 * operating and reviewing the service, and they are DISJOINT in what they may see. That sentence is
 * `CONTEXT.md`'s — "an Administrator needs to see users, and a Reviewer must not" — NOT ADR 4's,
 * which never uses the word "Reviewer". ADR 4 states the same boundary from one side only:
 * "An Administrator never sees content: no question text, no bookmark references, no notes."
 */
export type Role = "member" | "reviewer" | "admin";

export interface RoleEnv {
  readonly ADMIN_EMAILS?: string | undefined;
  readonly REVIEWER_EMAILS?: string | undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toB64Url(buf: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

async function hmac(msg: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toB64Url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

/**
 * Compare without leaking position through timing. Length is not secret; content is.
 *
 * EXPORTED so `runner-auth.ts` shares this exact binding rather than carrying its own copy. Two
 * implementations of a constant-time compare is two things that can drift, and the copy is the one
 * nobody re-reads — a test pointed at the copy would keep passing while the original rotted.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

/**
 * Mint a session for an authenticated email. Callers must ONLY reach this after magic-link verify.
 *
 * An empty secret throws HERE, loudly and by name. WebCrypto already refuses a zero-length HMAC key,
 * but it does so with a bare `DOMException` from `importKey` that reads like an internal fault; a
 * misconfigured Worker deserves to say what is actually wrong. `verifySession` takes the opposite
 * branch and returns null, because a verifier's job is to refuse, not to crash on input.
 */
export async function signSession(email: string, secret: string, now: number): Promise<string> {
  if (secret === "") throw new Error("signSession: refusing to sign with an empty secret");
  const exp = now + SESSION_TTL_MS;
  const payload = `${b64urlEncode(normalizeEmail(email))}.${exp}`;
  return `${payload}.${await hmac(`${SESSION_DOMAIN}.${payload}`, secret)}`;
}

/**
 * Verify a session cookie → the email it proves, or null.
 *
 * Null on every failure mode and never a throw: malformed, tampered, expired, wrong domain, or a
 * payload that does not decode to a valid address.
 */
export async function verifySession(token: string, secret: string, now: number): Promise<string | null> {
  // An empty secret would make every signature forgeable by anyone who can compute HMAC over a
  // known-empty key. Refusing is the only safe reading of a misconfigured Worker.
  if (secret === "") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, mac] = parts;
  // Checked rather than cast, for the same reason `verifyMagicToken` checks: this is the verifier,
  // and an assertion here would be a guarantee we have not actually established.
  if (emailB64 === undefined || expStr === undefined || mac === undefined) return null;
  const payload = `${emailB64}.${expStr}`;
  if (!timingSafeEqual(mac, await hmac(`${SESSION_DOMAIN}.${payload}`, secret))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return null;
  try {
    const email = b64urlDecode(emailB64);
    return isValidEmail(email) ? normalizeEmail(email) : null;
  } catch {
    return null;
  }
}

/**
 * Read the `__Host-qk_auth` value out of a Cookie header. Returns null when absent.
 *
 * It reads the PREFIXED name only. A bare `qk_auth` is deliberately refused — that is the whole
 * point of the prefix, and a fallback here would undo it.
 */
export function readAuthCookie(cookieHeader: string | null): string | null {
  if (cookieHeader === null) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== AUTH_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}

/**
 * `HttpOnly` is the load-bearing attribute: this cookie PROVES AN ACCOUNT, so script must never be
 * able to read it. `SameSite=Lax` keeps it off cross-site POSTs while surviving a magic-link
 * navigation, which is a top-level GET.
 */
export function buildAuthCookie(token: string, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)): string {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/**
 * A real logout, which ADR 2 lists as something the app does not have today.
 *
 * IT DOES NOT REVOKE THE TOKEN. This clears the cookie; the signed value stays valid for the rest of
 * its 30 days, so a value captured beforehand still verifies afterwards. That is ADR 2's own
 * definition of the feature ("clear the auth cookie"), stated here so nobody reads "real logout" as
 * "session invalidated". The only revocation lever in this design is bumping `SESSION_DOMAIN`, which
 * invalidates every outstanding session at once.
 */
export function clearAuthCookie(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function allowlist(raw: string | undefined): Set<string> {
  if (raw === undefined) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter((s) => s !== ""),
  );
}

/**
 * Resolve a role for an AUTHENTICATED email.
 *
 * The argument must be an email `verifySession` returned. Passing an unverified string here would
 * make the allowlist a formality, so callers go through `roleForRequest` unless they have already
 * verified.
 *
 * Administrator outranks Reviewer when one address appears on BOTH lists — a configuration mistake.
 *
 * THE REASON IS CONTENT EXPOSURE, AND IT IS NOT THAT THE MISTAKE BECOMES VISIBLE — it does not.
 * With `requireRole` matching exactly, a double-listed address resolves to `admin` and is then
 * REFUSED every Reviewer gate behind an uninformative 403, which is silent withholding.
 *
 * What justifies the ordering is that `admin` is the role ADR 4 defines by NOT seeing content, so a
 * misconfiguration resolves AWAY from question text and notes. STATED WITH ITS OTHER HALF, because
 * the exchange is not free: it resolves TOWARD what ADR 4 does grant an Administrator — seeing that
 * an Account exists, how much it holds, and the power to delete it. Content exposure down,
 * user-directory and deletion up. Neither role is a superset; this picks a side of a real trade.
 *
 * THAT IS A TIE-BREAK INSIDE THIS FUNCTION AND NOT A PRIVILEGE LADDER. `requireRole` matches a
 * privileged role EXACTLY, because the two are disjoint in what they may see; a first cut ranked
 * them and let an Administrator through a Reviewer gate. Do not reintroduce a rank here.
 */
export function roleFor(email: string | null, env: RoleEnv): Role {
  if (email === null) return "member";
  const normalized = normalizeEmail(email);
  if (allowlist(env.ADMIN_EMAILS).has(normalized)) return "admin";
  if (allowlist(env.REVIEWER_EMAILS).has(normalized)) return "reviewer";
  return "member";
}

export interface SessionInfo {
  /** The proven account, or null for an Anonymous Visitor. */
  readonly email: string | null;
  readonly role: Role;
}

/**
 * The one call a route should make: read the cookie, verify it, resolve the role.
 *
 * An Anonymous Visitor resolves to `{ email: null, role: "member" }` — NOT to an error. ADR 1 is
 * explicit that reading capabilities do not depend on an Account, so the absence of a session is a
 * normal state, and only routes that actually gate must check the role.
 */
export async function roleForRequest(
  request: Request,
  secret: string,
  env: RoleEnv,
  now: number,
): Promise<SessionInfo> {
  const raw = readAuthCookie(request.headers.get("cookie"));
  if (raw === null) return { email: null, role: "member" };
  const email = await verifySession(raw, secret, now);
  if (email === null) return { email: null, role: "member" };
  return { email, role: roleFor(email, env) };
}
