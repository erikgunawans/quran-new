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

- [ ] A fresh visitor receives a signed identity cookie on first load.
- [ ] Reload / return visit resolves the *same* `user_id`.
- [ ] A tampered/forged cookie is rejected and a fresh id is minted (HMAC verified).
- [ ] No PII, no device fingerprint stored — opaque id only.
- [ ] Scoped to `[env.demo]` only; principled + synthesis Workers untouched.

## Comments
