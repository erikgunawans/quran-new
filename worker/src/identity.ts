/**
 * Anonymous device identity (PRD issue 01).
 *
 * Every visitor gets a stable, opaque `user_id` from request #1 — no login, no PII, no fingerprint.
 * The id is carried in a signed cookie (`qk_uid = <id>.<hmac>`); the HMAC (SHA-256, keyed by a Worker
 * secret) is what makes it unforgeable, so a tampered cookie is rejected and a fresh id minted.
 *
 * GRACEFUL DEGRADATION (same doctrine as the rest of this Worker): if `IDENTITY_HMAC_SECRET` is not
 * configured we cannot sign, so we return NO identity and set NO cookie rather than 500. The app runs
 * exactly as before — anonymous, memoryless — until the secret is set.
 */

const COOKIE = "qk_uid";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const ID_RE = /^[0-9a-f]{32}$/; // 16 random bytes, hex

const enc = new TextEncoder();

function toB64Url(buf: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toB64Url(await crypto.subtle.sign("HMAC", key, enc.encode(userId)));
}

/** Length-constant compare — never short-circuit on the first mismatched char (timing oracle). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function mint(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export interface Identity {
  /** The user's opaque id, or null when no secret is configured (graceful degradation). */
  userId: string | null;
  /** A `Set-Cookie` value — present only when a fresh cookie must be sent (new or tampered visitor). */
  setCookie?: string;
}

/** Verify an incoming `qk_uid` cookie, or mint a fresh signed identity. Never throws. */
export async function ensureIdentity(request: Request, secret: string | undefined): Promise<Identity> {
  if (!secret) return { userId: null };

  const raw = readCookie(request.headers.get("Cookie"), COOKIE);
  if (raw) {
    const dot = raw.lastIndexOf(".");
    if (dot > 0) {
      const userId = raw.slice(0, dot);
      const mac = raw.slice(dot + 1);
      if (ID_RE.test(userId) && timingSafeEqual(mac, await sign(userId, secret))) {
        return { userId }; // valid — no re-set
      }
    }
  }

  const userId = mint();
  return { userId, setCookie: await cookieFor(userId, secret) };
}

/** Build the signed `Set-Cookie` for a given userId. Used to re-issue identity on login so every device
 *  of an account resolves the same canonical id (issue 07 cross-device bind). */
export async function cookieFor(userId: string, secret: string): Promise<string> {
  const value = `${userId}.${await sign(userId, secret)}`;
  return `${COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

/** Attach the identity's `Set-Cookie` to a response, if one was minted this request. */
export function withIdentityCookie(response: Response, identity: Identity): Response {
  if (!identity.setCookie) return response;
  const r = new Response(response.body, response);
  r.headers.append("Set-Cookie", identity.setCookie);
  // A per-user cookie must NEVER land in a shared/edge cache — else the next visitor inherits this
  // identity. Mark any minting response uncacheable, regardless of path.
  r.headers.set("Cache-Control", "private, no-store");
  r.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return r;
}
