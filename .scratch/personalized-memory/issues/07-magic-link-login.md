# 07 — Magic-link login: make memory portable

Status: ready-for-agent
Type: plumbing
Blocked by: 01

## Problem

Decision 3: login is not the gate to personalization — it's how memory *follows you across devices*.
Anonymous memory (01) already grows from visit #1; this issue lets a user carry it to a second
device. Decision 3 also rules out Google OAuth: routing private religious questions through a Google
sign-in is the wrong trust posture for this data.

## Approach

"Save your journey" → **email magic link** (passwordless). On verify, bind the current anonymous
`user_id` to an account. Future logins on any device resolve to the same `user_id` → same D1 + KV.
Minimal data: **email only**, no password.

## Acceptance

- [x] Magic link verifies. — token roundtrip unit-tested (8 tests) + live verify proven. **Email SEND
      verified live (2026-07-25):** Resend test mode (`onboarding@resend.dev`) sent to `erik@axiara.ai`
      → Erik clicked → `accounts` row for `erik@axiara.ai` created. Full chain works. (Production —
      emailing ANY user — still needs an `axiara.ai` domain verified in Resend; test mode only emails
      the Resend account owner.)
- [x] The current anonymous history carries into the account on binding — first login: the account
      adopts THIS device's id as canonical, so the device's existing memory becomes the account's.
- [x] Login on a second device resolves the *same* identity → same memory. — **VERIFIED live**: device B
      (id b5cd575f) logged into device A's account (id 85e58fed) → B's cookie re-issued to 85e58fed →
      B then read A's bookmark `2:255`.
- [x] No password stored; email is the only PII. — stateless HMAC tokens; `accounts` holds email +
      canonical id only.
- [x] Declining login costs nothing — anonymous personalization is fully independent of login.

## Comments

**2026-07-25 — Implemented + verified (except live email delivery).** Passwordless magic-link (decision 3,
NOT Google OAuth). `worker/src/auth.ts`: stateless HMAC tokens (`b64(email).exp.mac`, 15-min TTL),
email validation, Resend sender (graceful no-op without a key). `accounts` table (migration 0002).
`store.ts linkAccount` (race-safe upsert, canonical = first device's id, no data merge). `identity.ts
cookieFor` re-issues the cookie on cross-device login. Endpoints `/api/auth/request` + `/api/auth/verify`.
Frontend (`demo.ts`): "Masuk" modal + `#/masuk/<token>` verify on load; header button switched to
`<button id="qk-masuk">`. 8 auth unit tests (incl. the swapped-email attack); 25 total green. Deployed
e20aa580 (debug `/api/whoami` + `_debug_token` removed).

**DORMANT — Resend activation (Erik):** create a Resend account → verify a sending domain on axiara.ai →
`wrangler secret put RESEND_API_KEY --env demo` → set `RESEND_FROM` in `[env.demo.vars]` → redeploy.
Until then `/api/auth/request` returns `{sent:false}` and the UI says "login belum aktif".

**Root-cause correction (important):** the "flaky writes" flagged across T3/T4/T5 were **never code bugs**.
Three test-harness artifacts: (1) **zsh does not word-split unquoted `$J`/`$O` vars** (like the `$UID`
readonly gotcha) — this corrupted curl args; (2) hand-parsing `Set-Cookie` instead of a cookie jar; (3)
requests in the first ~seconds after `wrangler deploy` hit a propagating Worker and fail. Fix: cookie
jars (`-c/-b`), inline `-H` (never a variable), and warm up after deploy. The write/identity path is
reliable in steady state.
