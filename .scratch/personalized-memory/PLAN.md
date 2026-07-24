# New-Quranku — Personalized Memory · Phase 1 Plan (Foundation & Safe Personalization)

Source: `PRD.md` + `issues/01–09`. Planned 2026-07-25.
Surface: **demo only** (`[env.demo]` Worker, `demo-quranku.axiara.ai`).

## Scope

**In Phase 1** — the honest, single-device "grows into you" loop, everything that does NOT touch
the words of an answer:

- 01 anonymous identity · 02 D1 raw layer · 03 utility memory · 04 distillation · 05 discovery
- 07 magic-link (portability) — parallel track, only depends on 01

**Deferred to Phase 2** (the sensitive cluster — ships as a unit, gated):

- 06 framing injection · 08 honesty surface · 09 scholar-wall check

Phase 1 stores and personalizes *discovery*; it never alters a composed answer. That is what makes
it agent-buildable without the ustadz in the loop. Answer personalization (06) is Phase 2 and does
not start until 08 + 09 are designed.

## Invariants that bind every task (from PRD "hard walls")

1. **No answer content changes in Phase 1.** The composer (`worker/src/index.ts:handleCompose` /
   `handleAnswer`) is **not touched**. If a task wants to edit it, the task is out of scope.
2. **Additive, never subtractive** (05). Discovery may surface, never bury or outrank a direct answer.
3. **Nothing identifying leaves Cloudflare.** No new outbound payload carries `user_id`/PII.
4. **See / edit / forget from day one.** No real user is invited until the Phase 2 honesty surface
   exists — Phase 1 runs on **seed/test identities** only. Do not solicit real users this phase.

## Task graph (dependency order)

```
T1 (01 identity) ──┬─► T2 (02 D1) ──┬─► T3 (03 utility)
                   │                └─► T4 (04 distill) ──► T5 (05 discovery)
                   └─► T6 (07 magic-link)   [parallel, independent of T2–T5]
```

---

## T1 — Anonymous identity (issue 01)

- **Files:** new `worker/src/identity.ts`; wire into `worker/src/index.ts` (`Env` :35, `fetch` :72).
  Secret: `IDENTITY_HMAC_SECRET` via `wrangler secret put … --env demo`.
- **Build:** on each request, read+verify a signed `qk_uid` cookie (HMAC-SHA256 with the secret);
  if absent/invalid, mint a 128-bit opaque id and `Set-Cookie` (HttpOnly, Secure, SameSite=Lax,
  ~1y). Expose `env`-independent `getUserId(request)` to handlers. No PII, no fingerprint.
- **Acceptance:** issue 01 checklist. **Verify:** curl the demo twice, assert stable `qk_uid`;
  tamper the cookie → new id.

## T2 — D1 raw layer (issue 02)

- **Files:** `worker/wrangler.toml` `[env.demo]` add `[[env.demo.d1_databases]]`; new
  `worker/migrations/0001_init.sql`; new `worker/src/store.ts` (write helpers); call from
  `index.ts` on question (`handleAnswer`/`handleCompose`) + from new `/api/events` for read/bookmark/note.
- **Build:** tables `events`, `bookmarks`, `notes`, `reading_position` (all keyed `user_id`),
  index `(user_id, ts)`, append-only events. `d1_database_create` first, then apply migration.
- **Acceptance:** issue 02 checklist (incl. `DELETE … WHERE user_id` wipes clean — feeds T-forget in P2).

## T3 — Utility memory / branch C (issue 03)

- **Files:** `web/demo/demo.ts` (read-back UI on bookmark/mushaf/tanya tabs); worker `/api/memory/*`
  in `index.ts` reading `store.ts`. **Zero inference** — must not read/write KV.
- **Build:** bookmarks list, per-ayah notes, "continue reading" (last `reading_position`), question
  history. All `user_id`-scoped; works for anonymous ids.
- **Acceptance:** issue 03 checklist. **Verify:** Interceptor — bookmark persists across reload.

## T4 — Session distillation / derived profile (issue 04)

- **Files:** new `worker/src/distill.ts`; `wrangler.toml` `[env.demo]` add `[[env.demo.kv_namespaces]]`;
  trigger from `index.ts fetch` via `ctx.waitUntil(...)` on session start.
- **Build:** if new events since `last_distill_ts`, read **full** log, call the existing OpenRouter
  model (`OPENROUTER_MODEL`) to distill → `{interest_tags[], summary_2line}`, recency-weighted;
  write `profile:{user_id}` to KV. **Skip** when no new events (no LLM call). Never blocks the request.
- **Acceptance:** issue 04 checklist (regenerable-from-raw; billboard-safe; async).

## T5 — Discovery / branch A (issue 05)

- **Files:** `web/demo/demo.ts` (topic ranking + "related to what you've explored" rails); worker
  `/api/profile` (read-only KV). **Composer untouched** (invariant 1).
- **Build:** rank home/explore topics by `interest_tags`; add related-rails; connect new question to
  past ones. **Additive-only** (invariant 2) — never reorder/hide the direct answer.
- **Acceptance:** issue 05 checklist, incl. the additive-only test (direct answer never buried).

## T6 — Magic-link login (issue 07) · parallel track

- **Files:** worker `/api/auth/request` + `/api/auth/verify` in `index.ts`; `web/demo/demo.ts`
  "Masuk / Save your journey" flow; email send via an email provider.
- **⚠ Needs-info (one decision before build):** which email sender? (Resend / MailChannels /
  Cloudflare Email Routing). Passwordless, email-only, **not** Google OAuth (decision 3). Flag to Erik.
- **Build:** on verify, bind current anon `user_id` → account; second-device login resolves same id
  → same D1 + KV. Email is the only PII.
- **Acceptance:** issue 07 checklist.

---

## Phase 1 verification gate (exit condition)

- [ ] T1–T5 built and **live-verified on the demo via Interceptor** (identity stable, bookmark
      persists, discovery rails appear for a seeded profile, cold-start unaffected).
- [ ] Additive-only test green (T5) — direct answer never buried by personalization.
- [ ] `bun test` + `bun run typecheck` green; demo builds (`bun run demo:build`) and deploys.
- [ ] **Composer diff = zero** — confirm `git diff` touches no answer-composition code in
      `worker/src/index.ts` (invariant 1 holds).
- [ ] No real users invited — seed identities only until Phase 2 honesty surface ships.
- [ ] T6 either shipped or explicitly parked on the email-provider decision.

## Not in this phase (Phase 2 preview)

06 framing injection + 08 honesty surface + 09 scholar-wall check ship together, gated, on
seed/test accounts until the wall test and the ustadz sign-off pass. Do not begin 06 until 08/09
are designed — that sequencing is the whole safety story (PRD).
