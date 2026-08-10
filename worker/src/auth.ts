/**
 * Magic-link login (issue 07 / T6): make anonymous memory portable across devices.
 *
 * Passwordless by design (decision 3) — NOT Google OAuth, so a user's private religious questions are
 * never associated with a third-party identity. Email is the only PII.
 *
 * Tokens are STATELESS: `<b64url(email)>.<exp>.<hmac>`, signed with a Worker secret (same HMAC-SHA256
 * primitive as the identity cookie). No tokens table to store or clean up. Short expiry (15 min) bounds
 * the replay window; the tradeoff (a token is reusable until it expires) is acceptable for this demo and
 * documented here so it is a decision, not an accident.
 *
 * GRACEFUL DEGRADATION: if RESEND_API_KEY is unset, sending is a no-op that returns false — the login
 * UI reports "not configured" and the app is otherwise unaffected.
 */

const enc = new TextEncoder();
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
// Deliberately conservative email shape — a public endpoint should reject obvious junk before sending.
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
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toB64Url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

/** Normalize an email for use as the account key (lowercase, trimmed). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Sign a magic-link token for an email, valid until `now + TOKEN_TTL_MS`. */
export async function signMagicToken(email: string, secret: string, now: number): Promise<string> {
  const exp = now + TOKEN_TTL_MS;
  const payload = `${b64urlEncode(email)}.${exp}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

/** Verify a token → the email it was issued for, or null if malformed / tampered / expired. */
export async function verifyMagicToken(token: string, secret: string, now: number): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, mac] = parts;
  // Unreachable given the length check, and deliberately not a cast. This is the token verifier:
  // `as [string, string, string]` would assert the guarantee, whereas this one CHECKS it, so the
  // three names are non-null by proof rather than by assertion. Refusing on a missing part is also
  // the correct answer if the length check above is ever loosened.
  if (emailB64 === undefined || expStr === undefined || mac === undefined) return null;
  const payload = `${emailB64}.${expStr}`;
  if (!timingSafeEqual(mac, await hmac(payload, secret))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return null;
  try {
    const email = b64urlDecode(emailB64);
    return isValidEmail(email) ? email : null;
  } catch {
    return null;
  }
}

/**
 * Send the magic link via Resend. Returns false (never throws) when unconfigured or on any send error,
 * so the caller degrades gracefully. `from` must be an address on a Resend-verified domain.
 */
export async function sendMagicLink(
  apiKey: string | undefined,
  from: string | undefined,
  to: string,
  link: string,
): Promise<boolean> {
  if (!apiKey || !from) return false;
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:440px;margin:0 auto">` +
    `<h2 style="color:#16a249">QuranKu</h2>` +
    `<p>Klik tautan di bawah untuk menyimpan perjalananmu dan membukanya di perangkat lain:</p>` +
    `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#16a249;color:#fff;` +
    `border-radius:999px;text-decoration:none;font-weight:600">Masuk ke QuranKu</a></p>` +
    `<p style="color:#6b7580;font-size:13px">Tautan ini berlaku 15 menit. Abaikan email ini jika kamu tidak memintanya.</p>` +
    `</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "Masuk ke QuranKu", html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
