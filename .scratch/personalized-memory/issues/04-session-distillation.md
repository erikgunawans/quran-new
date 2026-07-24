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

- [ ] Profile is written to KV after the new-events threshold is crossed.
- [ ] No new events → no LLM call, existing KV profile reused (the cost guard).
- [ ] Recency weighting fades a stale interest while the raw log retains it.
- [ ] Profile is fully regenerable from raw (delete profile → rebuild identical from log).
- [ ] Distillation never blocks the user's request (async).
- [ ] Profile content is **billboard-safe** — interest tags + 2-line summary, no PII, no raw quotes.

## Comments
