# 03 — Explain terjemah makna vs terjemah harfiah in-product

Status: done
Type: fix
Priority: P1

## Problem

`web/src/verse.ts:38` already labels each rendering ("Terjemah makna" / "Terjemah harfiah") and
`share.ts` carries the distinction into shared text — but the *concept itself*, which is the
entire reason Nur exists (`ISA.md` § Problem: Kemenag leaves 2:156 untranslated, that's the
product's founding grievance), is never explained anywhere in the UI. A first-time user sees two
labelled boxes with no idea why there are two, or why it matters.

Research cross-check: the research flagged this independently as "the entire product thesis is
currently invisible to users" — same finding PROGRESS.md already logged as P1.

## Fix

Add a short, first-run (or persistently-accessible, e.g. an info affordance near the first verse
card) explanation in plain Indonesian: *terjemah harfiah* = word-for-word, *terjemah makna* =
what the words mean, and why both are shown together (the `literal_companion` doctrine, in
product language — see `ISA.md` § Principles for the internal framing, but write this for a user,
not a developer). Keep it brief — this is not a modal wall of text, it's a one-time or
one-tap explainer consistent with `PRODUCT.md`'s voice.

## Acceptance

- [x] A first-time user encounters an explanation of the two-translation concept before or at
      the first verse card, in Indonesian. — a collapsed `<details class="explainer">` sits
      inside `#hello`, the greeting screen every first-time visitor sees before asking anything.
- [x] The explanation is dismissible/one-time (or a persistent low-friction affordance) — it does
      not block or nag on every session. — two-tier: the `#hello` version is collapsed-by-default
      (opt-in, never blocking) and disappears with the greeting once chat starts; a header "ⓘ"
      icon button (`#info`) persists across every screen and session, opening a popover with the
      same explanation, closes on outside click or Escape.
- [x] Copy reviewed against `PRODUCT.md`'s voice and `ISA.md` § Principles — written in plain,
      second-person Indonesian ("kamu"), explicitly states neither rendering is "more correct"
      (mirrors "Plurality is warmth, not hedging"), kept to two short sentences per surface.
- [x] Anti: no English leaks into this copy — plain Indonesian, verified by inspection.
- [x] Verified live (Interceptor): confirmed `#info` toggles `#info-panel[hidden]` correctly
      (`false`→`true` on click, back to `true` on outside click), correct copy present in the DOM,
      and the `#hello` `<details>` renders in the initial tree.

## Comments

**2026-07-14 — Implemented.** `web/index.html`: added the header info-icon button + popover
panel, and a collapsed `<details class="explainer">` inside `#hello`. `web/src/styles.css`:
`.info-pop`/`.pop` (reuses the `--shadow-pop` token already defined for this theme system) and
`.explainer` (reuses the `.sources` disclosure-triangle pattern already used for the tafsir
stack, for visual consistency). `web/src/main.ts`: click/outside-click/Escape wiring for the
popover. No changes to `verse.ts` — the per-verse "Terjemah makna"/"Terjemah harfiah" chip labels
were left as-is; this issue was scoped to explaining the *concept*, not re-labelling it.
