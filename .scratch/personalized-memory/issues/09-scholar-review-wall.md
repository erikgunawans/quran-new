# 09 — Scholar-review path check: prove the framing-only wall holds

Status: ready-for-human
Type: governance
Blocked by: 06

## Problem

Personalized answers (06) are only safe because personalization can *only recombine reviewed atoms*
— so the ustadz reviewing the finite corpus still covers the infinite permutations. If that wall
ever leaks, the scholar's review is silently dead. This issue is the explicit check that it holds,
with the reviewer in the loop. Reviewer: **Ustadz Ahmad Isrofiel Mardlatillah**.

## Approach

1. Audit the 06 implementation: prove personalization cannot introduce a claim absent from the
   reviewed atoms (recombination-only).
2. Confirm nothing reaches the ustadz's review queue that isn't already a corpus atom — the
   personalization layer adds *zero* new reviewable religious content.
3. Brief the ustadz on the mechanism and get sign-off on **the framing-only wall itself** (not on
   each variant — that's the whole point).
4. Document a tripwire: if a future change lets the composer author content beyond recombination,
   this wall is breached and 06 must stop shipping until re-reviewed.

## Sequencing

Ships together with **06 + 08**.

## Acceptance

- [ ] Written proof the wall holds (recombination-only, no new-claim path).
- [ ] The 06 wall test is green and referenced here.
- [ ] Ustadz Ahmad Isrofiel Mardlatillah briefed and signs off on the framing-only mechanism.
- [ ] A documented tripwire exists for when the wall softens.

## Comments
