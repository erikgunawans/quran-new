# 01 — Anonymous device identity minted on visit #1

Status: ready-for-agent
Type: plumbing
Blocked by: —

## Problem

The demo has zero per-user state today. Personalization (decision 1) needs a *stable* identity to
key memory on — but decision 3 forbids a login wall: value must come before any sign-in. So we need
an identity that exists from the very first request, with no user action.

## Approach

In the `[env.demo]` Worker, on a request with no valid identity cookie: mint a random opaque
`user_id` (UUID/128-bit), set a **signed, HttpOnly, Secure, SameSite=Lax** cookie (HMAC with a
Worker secret so it can't be forged), long-lived (~1y). On every request, verify the signature and
expose `user_id` to the app. No PII, no fingerprinting — just an opaque handle the user owns.

## Acceptance

- [x] A fresh visitor receives a signed identity cookie on first load. — unit test
- [x] Reload / return visit resolves the *same* `user_id`. — unit test (valid cookie, no re-set)
- [x] A tampered/forged cookie is rejected and a fresh id is minted (HMAC verified). — unit test
      (+ wrong-secret rejection)
- [x] No PII, no device fingerprint stored — opaque 128-bit hex id only.
- [x] Scoped to `[env.demo]` only; principled + synthesis Workers untouched. — code in demo Worker;
      secret is `--env demo` only.
- [x] **Live-verified on `demo-quranku`** — `GET /api/identity` on production: fresh → signed
      cookie + `Cache-Control: no-store`; valid cookie → stable (no re-set); tampered → rejected,
      fresh id. Beacon confirmed in the shipped bundle.

## Comments

**2026-07-25 — Implemented (commit c1b9aa9).** `worker/src/identity.ts` (HMAC-SHA256 signed `qk_uid`,
mint/verify, timing-safe compare), wired into `worker/src/index.ts` `fetch` via `route()` +
`withIdentityCookie` so the cookie attaches on API *and* asset responses. Graceful degradation: no
`IDENTITY_HMAC_SECRET` → no identity, app unaffected. 6 unit tests pass; Worker `tsc` clean
(`*.test.ts` excluded from the Worker tsconfig — Worker runtime, not Bun).

**Blocked on live-verify by two steps (Erik):**
1. `cd worker && bunx wrangler secret put IDENTITY_HMAC_SECRET --env demo` (interactive — paste a
   long random string; do NOT commit it).
2. Deploy: `bun run demo:build && cd worker && bunx wrangler deploy --env demo`.

Until (1), the code is live-safe but dormant (no cookie). After (1)+(2), Interceptor should show a
`qk_uid` Set-Cookie that is stable across reloads.

**2026-07-25 — Shipped live + caching fix.** Secret set (`wrangler secret put --env demo`), Worker +
demo deployed (Version 8df399c2). **Caching gotcha found & fixed:** the `[assets]` binding serves the
static HTML shell straight from the edge (`cf-cache-status: HIT`), *bypassing the Worker*, so the
document load never minted. Fix: (a) a dedicated uncacheable `GET /api/identity` beacon the SPA pings
on boot (`web/demo/demo.ts`), and (b) `withIdentityCookie` now stamps `Cache-Control: private,
no-store` on any minting response so a per-user cookie can never land in a shared cache. Live-verified
via curl on the endpoint (mint / stable / tamper-reject all pass). **T1 done.**
