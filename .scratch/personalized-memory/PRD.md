# PRD: Personalized Memory — the AI edition that grows into each user

Status: needs-triage
Filed: 2026-07-25
Source: `/grill-me` session "New-QuranKU" (2026-07-24 → 07-25). Ten design decisions resolved
one at a time down the design tree. This PRD is what survives that grilling; the decision ledger
below is the shared understanding, not a fresh proposal.

## Why this exists

Erik wants the AI edition to "grow more and more into us" — a memory built over time about a
particular person, so answers aim at where that person actually is. The pull is real: a Qur'an
app that remembers you've been wrestling with grief, or debt, or doubt, and meets you there is
more useful than one that answers every stranger identically.

The danger is equally real, and it's the whole reason this PRD is careful. This app displays
*other people's scholarship* (`displaying-others-scholarship`), gated by a scholar reviewer
(Ustadz Ahmad Isrofiel Mardlatillah). "Permission to DISPLAY is not permission to CORRECT."
A memory feature done naively becomes: infinite unreviewed religious answers, personalized per
person, that no scholar ever saw — plus a secret profile of someone's spiritual state shipped to
a third-party LLM. That is exactly the "trick" Erik's product doctrine refuses to build.

So the design threads one needle: **personalize the framing, never the religious content; make
the memory visible and deletable; let nothing identifying leave Cloudflare.** Every decision below
serves that needle.

## The 10 locked decisions (design ledger)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | What memory changes | Retrieval/discovery (A) + utility (C) + answer **framing** | Defer free voice adaptation (B); framing over grounded atoms is the honest slice |
| 2 | Surface | **Demo** (`web/demo/`, `[env.demo]` Worker) | Erik's build surface; already reuses the synthesis AI-Tanya engine |
| 3 | Identity | **Anonymous from visit #1 → optional magic-link** | Value first, no login wall; login only to make memory portable across devices |
| 4 | Memory model | **Two-layer:** raw append-only log + regenerable derived profile | Same shape as PAI's own WORK→KNOWLEDGE distillation |
| 5 | Storage | **D1** for raw truth, **KV** for the fast profile | D1 queryable for distill/export/delete; KV cheap per-request read |
| 6/7 | Where memory touches the answer | **Framing only** — recombine reviewed atoms, never author new religious claims | Keeps the ustadz's review alive: he reviews finite atoms, not infinite permutations |
| 8 | Privacy boundary | **Minimal hint** to the LLM (`angle`, `tone`) — never the person | Billboard-safe or it doesn't cross; no name/id/history/summary leaves |
| 9 | Refresh | **Re-distill every session**, over the *full log*, skip when no new events | Full-log distill kills whipsaw; skip-guard kills pointless cost |
| 10 | Honesty surface | **Label + "what we remember" page + Forget-me button**, shipped *with* the feature | Personalization the user can see is a gift; unseen is manipulation |

## The hard walls (load-bearing — do not soften without Erik + the ustadz)

1. **The grounded core is byte-identical for every user.** Personalization recombines and reframes
   reviewed atoms; it never introduces a claim not in the reviewed corpus. This is what makes
   infinite personalized answers reviewable without infinite review.
2. **Additive, never subtractive.** Answer the actual question straight and first; personalized
   connections appear *alongside*, never *instead*, and may never outrank or bury the direct answer.
   (Guards against the `knowledge-lane-precedence` direction-blind-ranking scar.)
3. **Nothing identifying leaves Cloudflare.** The external composer receives the question, the
   grounded atoms, and a minimal framing hint. Never the raw history, the narrative summary, the
   name, the user_id, or the email.
4. **See it / edit it / forget it.** No secret profile. The derived profile is user-visible,
   line-editable, and one button hard-purges D1 + KV (not soft-delete).
5. **No training on user data.** The composer runs on a zero-retention / no-train API tier.

## Explicitly rejected / deferred (do not build now)

- **Personalized *voice/tone* authoring** (original branch B) — deferred. Personalization touches
  framing and selection, not the register of religious explanation.
- **Incremental distillation** — deferred. "Re-distill every session over the full log" is the
  pilot rule. Switch a heavy user to incremental (prior profile + new events) only when their log
  grows large enough that full re-distill token cost bites. A scale problem, not a pilot one.
- **Personalization on the principled app** — the principled edition (`new-quranku`) stays
  stateless and anonymous. It is the pure, un-personalized reference. This feature is AI-edition only.
- **Personalization on Nur** — Nur has a separate deploy path and the ustadz's review workflow;
  it is not the testbed.
- **Durable Objects / R2** — memory is batch-distilled and read-mostly; D1 + KV cover it.

## The data flow

```
use  → log events to D1 (questions asked, ayat read, bookmarks, notes)  [keyed by user_id]
session start → if new events since last distill:
                  re-distill FULL log → interest tags + 2-line summary → KV (profile:{user_id})
                  recency-weighted, so a stale interest fades but the raw log keeps it
ask  → retrieve grounded atoms (identical for all users)
     → compose answer, injecting ONLY a minimal framing hint from KV (angle, tone)
     → render with "aimed at what you've explored — see why" label
```

## Prioritization (implementation issues)

Ordered so trust/plumbing lands before the sensitive answer-injection. Each ships behind seed/test
accounts until 08 (the honesty surface) exists — no real user's private data is stored before the
user can see and delete it.

| # | Item | Type | Blocked on |
|---|------|------|------------|
| 01 | Anonymous device identity (signed cookie/handle) minted on visit #1 | plumbing | — |
| 02 | D1 schema + write path: `events`, `bookmarks`, `notes` keyed by user_id | plumbing | 01 |
| 03 | Utility memory (C): bookmarks, notes, reading position, question history read-back | new capability | 02 |
| 04 | Session distillation job: full-log → derived profile → KV; skip-if-no-new-events | new capability | 02 |
| 05 | Retrieval/discovery (A): rank topics + "related to what you've explored" rails (additive) | new capability | 04 |
| 06 | Minimal-hint framing injection into the grounded composer | new capability, sensitive | 04, 05 |
| 07 | Magic-link login → bind anonymous identity to a portable account | plumbing | 01 |
| 08 | Honesty surface: personalized-answer label + "what we remember" page + Forget-me | new capability, gating | 03, 06 |
| 09 | Scholar-review path check: confirm framing-only wall holds; nothing reaches the ustadz's queue that isn't a corpus atom | governance | 06 |

Sequencing note: **06 and 08 ship together or 06 does not ship to real users.** The answer-injection
(06) is the sensitive flow; it is not exposed to any real human before the honesty surface (08)
and the governance check (09) are live. Seed/test accounts only until then.

## Non-goals of this PRD

- Does not re-open the framing-vs-core wall (decisions 6/7). Any future issue proposing
  personalized *religious content* (not framing) is `wontfix` until a scholar-review path for
  generated variants is designed first, in writing, with the ustadz.
- Does not touch the principled edition or Nur.
- Does not specify the exact LLM vendor/tier for 06 beyond "zero-retention / no-train" — that's an
  issue-level decision for 06, subject to the minimal-hint boundary regardless of vendor.

## Verification

- **Wall integrity (the one that matters):** a test proving two users with different profiles asking
  the identical question receive answers whose *grounded claims* are byte-identical — only framing
  differs. If this test can't pass, the framing-vs-core wall has leaked and 06 does not ship.
- **Boundary integrity:** a test asserting the composer request payload contains no user_id, name,
  email, raw history, or narrative summary — only question + atoms + `{angle, tone}`.
- **Deletion integrity:** Forget-me purges both D1 rows and the KV blob; a follow-up read returns
  cold-start (universal answer), not a stale profile.
- **Live verify (Interceptor, mandatory):** personalized label renders, "see why" reveals the hint +
  atoms, "what we remember" page is editable, Forget-me works — all confirmed on `demo-quranku`.
- **Phase exit:** 01–05 shipped and verified on seed accounts; 06+08+09 shipped together; wall,
  boundary, and deletion tests green; Interceptor pass on the live demo.
