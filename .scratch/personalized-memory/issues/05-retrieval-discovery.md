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

- [x] A user with history sees relevant topics/rails surfaced. — "Lanjutkan dari yang kamu jelajahi"
      chips on the Tanya landing, from `interest_tags` (`/api/profile`). Render path verified; live
      landing-chip screenshot not captured (see note).
- [x] Cold start (no profile) falls through to default ordering — `#qk-you` stays `hidden`; the default
      "Coba mulai dari sini" seeds are untouched. No special-casing, no breakage.
- [x] **The direct answer is never buried by personalization — PROVEN via diff:** T5 is `+34 lines,
      0 modifications`; `ask()`/`resolveTurn()`/`renderTurn()`/retrieval are untouched. A chip only
      *calls `ask(tag)`* (asks a NEW question, like any seed); there is no code path from the profile
      into answering. The additive-only guarantee is structural, not just tested.
- [x] Rails are clearly "related" — a separate labeled section ("Lanjutkan dari yang kamu jelajahi"),
      never presented as an answer.
- [x] Anonymous users get it — the identity is anonymous; no login required.

## Comments

**2026-07-25 — Implemented.** `web/demo/index.html`: `#qk-you` mount above the default seeds.
`web/demo/demo.ts`: `hydratePersonalizedSeeds()` (fetch `/api/profile` → interest chips → each `ask()`s
that topic), called on boot; hidden on cold start. Additive-only guarantee **proven by diff** (answer
path untouched). `demo.ts` tsc clean. Deployed ce879172.

**Visual note (honest):** the landing chips weren't captured live — the browser identity had a restored
conversation (landing hero hidden) and clearing it hit Interceptor's known stale-element flakiness; per
the "don't loop on browser tooling" rule I stopped. The render is deterministic (trivial map over
`/api/profile` tags, typechecked) and `/api/profile` is verified (T4). Re-check after clearing the demo
conversation if a live screenshot is wanted.
