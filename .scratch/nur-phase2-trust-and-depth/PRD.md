# PRD: Nur Phase 2 — Trust, Utility, and Depth

Status: needs-triage
Filed: 2026-07-14
Source: `/Research` (Standard mode — Claude + Gemini + Grok + Perplexity, cross-checked) run against
`PRODUCT.md`, `DESIGN.md`, `PROGRESS.md`. See full research output pasted into the session that
created this PRD; the synthesis below is what survives contact with this codebase.

## Why this exists

The research question was "what would make Nur more compelling and increase desire to learn
the Qur'an." The research's own headline finding disqualifies the obvious answer: streak/badge/
guilt mechanics (Duolingo-style) are evidence-linked to compulsive use and guilt (arXiv:2203.16175,
62% of Duolingo users report guilt), and a study specific to Islamic-education apps found gamified
trackers don't build real competence. `PRODUCT.md` already independently arrived at the same
conclusion — no streak-shaming, no gamified guilt — so this isn't a new constraint, it's
confirmation of one already locked in `ISA.md` § Principles ("Silence over fabrication").

The research converges on a different lever: **depth and utility, not pressure.** Concretely,
almost everything it recommends either (a) is *already an open P0/P1* in `PROGRESS.md`'s "Next,
in order" list — the research just independently re-derived the same priorities from a different
angle, which is a stronger signal than either source alone — or (b) is a genuinely new capability
(recitation audio, tafsir-lens selection, concept cross-linking) that extends `ISA.md`'s existing
architecture rather than fighting it.

## Explicitly rejected (do not build)

Streaks, leaderboards, badges, completion percentages, "you haven't read today" nudges, any
social/competitive comparison mechanic. This is not a gap to fill later — it's load-bearing
product doctrine (`PRODUCT.md`, `ISA.md` § Principles). Any future issue proposing one of these
should be closed `wontfix` on sight, not re-litigated.

## Prioritization

Ordered by leverage-to-cost, per the research's own instruction: fix trust and utility gaps
before adding new surface area.

| # | Item | Type | Status | Blocked on |
|---|------|------|--------|------------|
| 01 | Minimum-score threshold on retrieval | fix | done | — |
| 02 | Chat thread persists across reload | fix | done | — |
| 03 | Explain *terjemah makna* vs *terjemah harfiah* in-product | fix | done | — |
| 04 | Crisis-path keyword detection | fix (P0, safety) | done | — |
| 05 | Recitation audio on the reading surface | new capability | done (MVP, 22 ayahs) | — |
| 06 | Tafsir "choose your lens" toggle | new capability | done | — |
| 07 | Concept/thematic cross-linking (surface the graph) | new capability, big bet | done (Path A) | — (Path B, the full graph, remains unbuilt and un-ruled-on) |
| 08 | Visual (image) share cards | enhancement | ready-for-agent | unblocked 2026-07-14 — 01–03, 06 shipped |

Items 01–03 are the direct continuation of `PROGRESS.md`'s existing "Next, in order" list — this
research just confirms they're the right next three, not a new discovery. Item 04 was already
`PROGRESS.md`'s #1 priority and is unchanged in urgency; it's `needs-info` only because Erik's
ruling on the resource was already the blocker before this research and remains so.

## Non-goals of this PRD

This PRD does not re-open anything already decided in `ISA.md` § Decisions or § Changelog
(Tafsiriyah-primary, attribution risk, divergence-as-review-queue-not-banner). It does not
propose full Tarteel-style mistake-correction memorization tooling — that's a different, much
larger product and out of scope until 05 (basic playback) ships and is used.

## Verification

Each issue carries its own acceptance check. Phase exit condition: 01–03 shipped and verified
live (Interceptor), 04 either shipped or explicitly deferred by Erik's written ruling, 05/06
scoped with Erik's input, 07 has a design spike doc before any code lands.
