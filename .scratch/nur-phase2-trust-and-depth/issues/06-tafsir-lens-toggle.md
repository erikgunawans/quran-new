# 06 — Tafsir "choose your lens" toggle

Status: done
Type: new capability
Priority: P2

## Problem

Nur carries 4 attributed tafsir voices (Ibn Kathir, As-Sa'di, Al-Mukhtasar, plus the primary/
companion translation pair) but — per the corpus table in `PROGRESS.md` — the natural default
is to show all of them flat and undifferentiated. The research flags this as a decision-paralysis
risk: Perplexity's core mechanic (citation-first trust, which Nur already structurally has) works
best when the reader can choose a lens ("classical vs. contemporary") rather than face four
uncredentialed columns at once.

## Constraint this must respect

This is explicitly **not** permission to rank or arbitrate between scholars — `ISA.md` §
Principles: "Plurality is warmth, not hedging. Show that scholars differ, name them, trust the
reader," and `PRODUCT.md`/`DESIGN.md`'s plural + attributed doctrine is locked. A "lens" toggle
must be a *filter/default-view* control the reader operates themselves (e.g. "show classical
first" / "show contemporary first" / "show all"), never the app silently promoting one voice as
more correct. If any implementation of this ends up hard-coding an authority ranking into the
default state without the reader's own choice, that's a doctrine violation, not a UX nicety.

## Scope

- A lens/filter control on the reading surface and/or verse card, defaulting to the current
  flat/all view (no behavior change until the reader opts in).
- Toggling changes *display order/visibility*, never removes attribution, never removes the
  `literal_companion` pairing.

## Acceptance

- [x] Default (untouched) view is unchanged from today — verified: with no `nur:lens` key set,
      the "Semua" lens reproduces the exact as-shipped order (proven live — see Comments).
- [x] Reader-selected lens persists across the session (localStorage, same pattern as `nur:theme`
      — only written on an explicit click, never on boot; caught and fixed a bug where an early
      draft wrote it unconditionally on every page load, see Comments).
- [x] All 3 tafsir voices (this issue's "4" in the Problem section double-counted the primary/
      companion translation pair, which isn't part of `v.tafsir` at all — see Comments) remain
      reachable in every lens state; toggling only reorders, confirmed live.
- [x] Anti: no lens state ever hides a source's attribution or presents one voice as canonical —
      verified live: scholar count stayed 3 and every attribution/text stayed intact across all
      three lens states.
- [x] `bun test` (120 pass, same 3 pre-existing unrelated failures as issue 01) + `bun run
      typecheck` (root + web) clean; verified live (Interceptor) with real, trusted clicks on the
      actual lens buttons — not `eval`-triggered — exercising the real event-delegation code path.

## Comments

**2026-07-14 — Implemented.** `web/src/main.ts`: `tafsirEl()` now renders a `.lens` control
(Semua / Klasik dulu / Kontemporer dulu) and tags each `.scholar` with `data-order` (as-shipped
position) and `data-era-rank` (derived from the `era` string already on each source — "Classical"
→ 0, "Modern" → 1, else → 2; deliberately NOT derived from `authority_tier`, which answers a
different question — doctrinal weight, not chronology — and conflating the two would have been a
real doctrine violation). `sortStacks()` re-orders `.scholar` nodes in place (re-`append()`
*moves* an already-attached node, so nothing is re-parsed or lost) across every `.sources` block
on screen; `applyLens()` (the reader-initiated action) additionally writes `nur:lens` to storage.
`web/src/styles.css`: `.lens` reuses the pill-button visual language already established.

**Scope correction from the issue's Problem section:** only the 3 *reference* tafsir sources
(Ibn Kathir, As-Sa'di, Al-Mukhtasar — rendered via `v.tafsir`/`tafsirEl()`) are affected. The
primary/companion translation pair (Tafsiriyah/Kemenag) is a different data path (`Reading`, not
`v.tafsir`) and was correctly left untouched — reordering *that* would risk the `literal_companion`
invariant, which this issue was never meant to touch.

**Verification note:** chat retrieval (the only place tafsir stacks currently render — the
reading surface doesn't show tafsir at all, `fromShard()` never sets `card.extra`) needs
`corpus.json`, which this worktree doesn't have (same gap as issue 01). Live verification instead
injected markup byte-identical to what `tafsirEl()` produces into a real page, then dispatched
real `interceptor act` clicks (not `eval`-triggered) on the actual rendered buttons — exercising
the real, unmodified event-delegation handler in `main.ts`, not a simulation of it. Confirmed:
shuffled as-shipped order → "Klasik dulu" produces Ibn Kathir → As-Sa'di → Al-Mukhtasar → "Kontemporer
dulu" exactly reverses it → "Semua" restores the original order → `nur:lens` persists across a
real reload.

**Bug caught and fixed during self-verification:** an early version called
`applyLens(getLens())` on every boot to re-sort restored thread cards (issue 02) against the
reader's current preference — but `applyLens` unconditionally wrote to storage, so a visitor who
never touched the control would get `nur:lens` silently set to `"all"` on their very first load,
breaking parity with the `nur:theme`/`nur:ar` pattern (write-on-action only). Caught by checking
`localStorage` directly rather than trusting the code read correct, live in this same session —
split into `sortStacks()` (DOM-only, used at boot) and `applyLens()` (storage write, used only by
the click handler) to fix it.
