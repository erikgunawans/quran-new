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

- [x] Migration applies cleanly to the demo D1. — `num_tables: 4`, `changed_db: true` (remote).
- [x] Writes land keyed by `user_id` for all four event kinds. — live e2e: `question` + `read`
      events, bookmark, note, reading_position all landed under the T1 identity.
- [x] Full history for one user is queryable in one statement. — `getEvents` (ORDER BY ts DESC);
      verified via SELECT UNION across tables.
- [x] `DELETE … WHERE user_id = ?` wipes a user completely. — `deleteUser` (batch of 4 DELETEs);
      live DELETE left `remaining: 0`.
- [x] No cross-user leakage — every read/write is `user_id`-scoped (every statement binds `user_id`).

## Comments

**2026-07-25 — Implemented + live-verified.** D1 `new-quranku-demo-memory` created
(`5c522383-…`), bound as `DB` in `[[env.demo.d1_databases]]`. Schema in
`worker/migrations/0001_init.sql` (events / bookmarks / notes / reading_position, all keyed
`user_id`, `(user_id, ts)` indexes). Write helpers in `worker/src/store.ts` (minimal inline D1
types — no `@cloudflare/workers-types` dep, matching the Worker's `types: []`). Wiring in
`worker/src/index.ts`: `POST /api/events` (bookmark/unbookmark/note/read) + a `question` event
logged on `/api/answer` via `ctx.waitUntil` (deferred, best-effort — never delays or alters the
answer, so **invariant 1 holds: the composer is untouched**). Both degrade to no-ops when the DB
binding or a signed identity is absent. 6 store unit tests (fake-D1 capturing SQL + bindings) +
6 identity = 12 green; Worker `tsc` clean. Deployed Version ef677823. **T2 done.**
