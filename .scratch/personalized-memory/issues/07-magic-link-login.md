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

- [ ] Magic link is sent and verifies.
- [ ] The current anonymous history carries into the account on binding (no data loss).
- [ ] Login on a second device resolves the *same* identity → same memory.
- [ ] No password stored; email is the only PII.
- [ ] Declining login costs nothing — anonymous personalization keeps working.

## Comments
