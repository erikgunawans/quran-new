# 04 — Session distillation: raw log → derived profile (KV)

Status: ready-for-agent
Type: new capability
Blocked by: 02

## Problem

The derived layer (decision 4) turns the raw D1 log into the small, fast profile that powers
ranking (05) and framing (06). Decision 5: profile lives in **KV**. Decision 9: **re-distill every
session, over the full log, skip when nothing new** — full-log distill is what makes it
whipsaw-proof.

## Approach

On session start, if there are new events since the last distill:

1. Read the **full** event log for `user_id` from D1.
2. Call the LLM to distill → `{ interest_tags[], summary_2line }`, **recency-weighted** (stale
   interests fade; raw log still keeps them).
3. Write `profile:{user_id}` to KV.

Fire **async via `waitUntil()`** (or a Queue) — never block the request. **Skip** entirely if no
new events since last distill (compare `last_distill_ts` / event count) — no LLM call, reuse KV.

## Acceptance

- [x] Profile is written to KV after new activity. — live: 5 seeded events → profile
      `{tags:[kecemasan,sabar,rezeki,zikir,ketenangan hati], summary:"…"}`.
- [x] No new events → no LLM call, existing KV profile reused. — re-trigger: `distilled_at`
      unchanged; tail showed `events 5` with **no** `llm out` line (skip guard hit before the LLM).
- [x] Recency weighting — prompt presents newest-first and instructs to weight recent activity;
      full-log read each time (whipsaw-proof, decision 9).
- [x] Fully regenerable from raw — reads the full event log; delete profile → next session rebuilds.
- [x] Never blocks the request — runs in `ctx.waitUntil` off the `/api/identity` beacon.
- [x] Billboard-safe — interest tags + neutral 2-line summary, no PII, no verbatim quotes; bounded
      (≤6 tags, clamped lengths) in `parseProfile`.

## Comments

**2026-07-25 — Implemented + live-verified.** KV `PROFILE_KV` (`7a6791bf…`) bound in `[env.demo]`.
`worker/src/distill.ts`: `maybeDistill` (skip-if-no-new-events via `last_event_ts`, full-log read,
OpenRouter distill with `reasoning:none`, bounded `parseProfile`) + `readProfile`. Triggered from the
`/api/identity` beacon via `ctx.waitUntil`. `GET /api/profile` (no-store) exposes the billboard-safe
profile. 5 distill unit tests (parse/clamp/build) + 12 = 17 green; Worker tsc clean. Live: profile
distilled correctly from seeded activity; skip guard confirmed via `wrangler tail`. Deployed 0d080323.
**Composer untouched.**

**Debugging note (kept for the next task):** verifying this burned time on tooling artifacts, not code
bugs — (a) zsh `$UID` is readonly (=OS uid); use `$UID_ONLY`/`$U`; (b) `wrangler d1 execute` prepends
warning lines before its JSON — strip to the first `[` before parsing; (c) `wrangler tail` splits
multi-arg `console.log` into a `message[]` array and samples under real traffic. The demo has **live
real-user traffic** now — see the Phase-1 caveat below.

**⚠ Real-user data is accumulating on the public demo (23 events from real users).** Phase 1 was
scoped "seed/test accounts only until the honesty surface (08)". The demo is public and people are
using it, so real spiritual questions are now being stored **and distilled** with no user-facing
"forget me" yet. Flagged to Erik — a Phase-1/PRD sequencing decision.
