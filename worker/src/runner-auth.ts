/**
 * The RUNNER's proof of itself — the second auth principal.
 *
 * ── WHY THIS IS NOT `requireRole` ───────────────────────────────────────────────────────────────
 *
 * There are two kinds of caller on the kajian surface and only one of them is a person.
 *
 *   A human at a form proves an ACCOUNT: `__Host-qk_auth`, an email, a role, an exact-match gate.
 *   A machine on a VPS proves ITSELF: a shared bearer secret. No email. No role. No cookie.
 *
 * Serving the runner with `requireRole` would mean putting an Administrator's 30-day
 * `__Host-qk_auth` into a VPS environment variable, and that undoes ISC-568 entirely: it
 * re-domiciles a browser-scoped, `HttpOnly`, person-bound credential onto a shared host as a static
 * admin token — one that logout cannot revoke (and logout does not revoke anyway, see `session.ts`).
 * It would also attribute the machine's writes to a human being who did not make them.
 *
 * The runner is not a low-privilege admin. It is not an account at all, and the moment it needs one
 * the design is wrong.
 *
 * ── WHAT IT CAN AND CANNOT DO ───────────────────────────────────────────────────────────────────
 *
 * Holding this secret lets a caller claim queued jobs and report results. It does NOT let a caller
 * enqueue anything — that stays behind `requireRole(…, "admin")` — so a leaked runner secret cannot
 * be used to make the app fetch arbitrary URLs. It cannot read any account, any question, any note.
 * The blast radius is the kajian queue and nothing else, and that containment is on purpose: this
 * credential lives on a datacentre host that also runs `yt-dlp` against the open internet.
 *
 * ── IT FAILS CLOSED ─────────────────────────────────────────────────────────────────────────────
 *
 * An unset or empty `RUNNER_SECRET` admits NOBODY, never everybody. That is the same property
 * `ADMIN_EMAILS` has and for the same reason: an unconfigured deploy must be inert, not open. A
 * short secret is refused too — a deploy that sets `RUNNER_SECRET=x` should not think it is
 * protected — and the floor is checked BEFORE the comparison so a weak configuration cannot be
 * matched at all.
 *
 * It answers 403 with a body that does not distinguish "no header" from "wrong secret", for the
 * same reason `requireRole` does: a body saying "bad token" tells an anonymous prober that the
 * endpoint exists and that guessing is the game.
 */
import { timingSafeEqual } from "./session.ts";

/** Below this a secret is a typo, not a credential. Refused before any comparison happens. */
export const MIN_RUNNER_SECRET_LEN = 32;

export interface RunnerEnv {
  /** Encrypted secret — `wrangler secret put RUNNER_SECRET`. Absent → the runner surface is dark. */
  RUNNER_SECRET?: string;
}

/**
 * Read the bearer credential out of an Authorization header.
 *
 * The scheme is matched case-insensitively because RFC 7235 says it is case-insensitive, and a
 * runner written in another language may well send `bearer`. The SECRET is not touched: no trim, no
 * case fold, no unescaping. Whatever follows the single space is compared verbatim, because
 * normalising a credential is how two different strings come to be accepted as one.
 */
export function readBearer(header: string | null): string | null {
  if (header === null) return null;
  const space = header.indexOf(" ");
  if (space === -1) return null;
  if (header.slice(0, space).toLowerCase() !== "bearer") return null;
  const token = header.slice(space + 1);
  return token === "" ? null : token;
}

/**
 * Does this request prove it is the runner? Pure predicate — no Response, so it is callable from a
 * test without building one, and from the route gate.
 */
export function isRunner(request: Request, env: RunnerEnv): boolean {
  const expected = env.RUNNER_SECRET ?? "";
  if (expected.length < MIN_RUNNER_SECRET_LEN) return false;
  const presented = readBearer(request.headers.get("Authorization"));
  if (presented === null) return false;
  return timingSafeEqual(presented, expected);
}
