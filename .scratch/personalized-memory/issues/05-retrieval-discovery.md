# 05 — Retrieval / discovery (branch A): additive personalization

Status: ready-for-agent
Type: new capability
Blocked by: 04

## Problem

Use the derived profile to help the user *find* relevant material faster (branch A) — without ever
bending what they get. This is where the `knowledge-lane-precedence` scar lives: personalization
must never pre-empt the correct answer.

## Approach

Read `profile:{user_id}` from KV to:

- Rank topics on the home/explore view by `interest_tags`.
- Add "related to what you've explored" rails.
- Connect a new question to the user's past ones.

**Hard rule (wall 2 — additive, never subtractive):** answer/surface the actual query straight and
first; personalized connections appear *alongside*, never *instead*. Personalization may never
rank down, hide, or bury the direct answer.

## Acceptance

- [ ] A user with history sees relevant topics/rails surfaced.
- [ ] Cold start (no profile) falls through to default ordering — no breakage, no special-casing.
- [ ] **Test:** the direct answer to an explicit query is never buried or outranked by
      personalization (the additive-only guarantee).
- [ ] Rails are clearly "related," not presented as *the* answer.
- [ ] Anonymous users with local history still get discovery.

## Comments
