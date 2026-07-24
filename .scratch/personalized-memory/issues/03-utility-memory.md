# 03 — Utility memory (branch C): remember what the user did

Status: ready-for-agent
Type: new capability
Blocked by: 02

## Problem

Deliver the honest, zero-inference half of the feature (branch C). No profiling, no risk — just
give people back what they themselves did. This is the safe foundation that earns trust before any
inference (branch A / 05) lands.

## Approach

Read-back UI + API over the D1 raw layer (no LLM, no inference):

- Bookmarks list
- Notes (per ayah)
- "Continue reading" — last `reading_position`
- Question history — the user's own past questions

All scoped to `user_id`; works for anonymous identities too (04+ not required).

## Acceptance

- [ ] A bookmark persists across sessions for the same identity.
- [ ] Notes save and retrieve per ayah.
- [ ] "Continue reading" resumes at the last position.
- [ ] Question history is visible to the user.
- [ ] Everything is `user_id`-scoped; anonymous users get it without login.
- [ ] Zero inference — this issue must not read or write the KV profile.

## Comments
