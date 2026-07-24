# 02 — D1 schema + write path (the raw truth layer)

Status: ready-for-agent
Type: plumbing
Blocked by: 01

## Problem

The two-layer model (decision 4) needs a queryable, append-only store of ground truth — what the
user actually did — keyed by `user_id`. This is the `WORK`/truth layer; everything (distillation,
export, delete) reads from it. Decision 5: this layer is **D1**.

## Approach

Add a D1 binding to `[env.demo]`. Tables (all keyed by `user_id`):

- `events(id, user_id, kind, payload_json, ts)` — append-only; `kind` ∈ {question, read, …}
- `bookmarks(user_id, ref, ts)`
- `notes(user_id, ref, text, ts)`
- `reading_position(user_id, ref, ts)`

Index on `(user_id, ts)`. Worker writes on: question asked, ayah read, bookmark added, note saved.
Ship as a migration file. Append-only for `events` (never mutate history).

## Acceptance

- [ ] Migration applies cleanly to the demo D1.
- [ ] Writes land keyed by `user_id` for all four event kinds.
- [ ] Full history for one user is queryable in one statement (feeds 04 distillation + export).
- [ ] `DELETE … WHERE user_id = ?` wipes a user completely (consumed by 08 Forget-me).
- [ ] No cross-user leakage — every read/write is `user_id`-scoped.

## Comments
