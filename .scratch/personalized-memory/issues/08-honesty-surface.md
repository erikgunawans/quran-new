# 08 — Honesty surface: label + "what we remember" + Forget-me

Status: ready-for-human
Type: new capability — GATING (the feature's license to exist)
Blocked by: 03, 06

## Problem

Decision 10: personalization the user can *see* is a gift; personalization they can't see is
manipulation. Same feature — the only difference is whether these surfaces exist. For this data and
for who Erik is, they are not polish; they are the license to ship 06.

## Approach

Three touchpoints:

1. **Label on personalized answers** — "aimed at what you've explored — see why." Tapping "see why"
   reveals the framing hint used (`angle`) + the grounded atoms (which are identical for everyone).
   This directly closes the "AI prose never sees the *why*" scar — here the *why* is surfaced.
2. **"What we remember about you" page** — the visible, line-editable derived profile (interest tags
   + 2-line summary); each line strike-through-able.
3. **"Forget me" button** — hard-purges D1 rows **and** the KV blob. Not soft-delete. Present, not
   buried.

## Sequencing

Ships together with **06 + 09**.

## Acceptance

- [ ] Personalized answers carry the label; "see why" reveals the hint + the (universal) atoms.
- [ ] Profile page shows the derived profile, and edits/strikes persist.
- [ ] "Forget me" hard-deletes D1 rows AND the KV blob.
- [ ] Post-delete read = cold start (universal answer), no stale profile anywhere.
- [ ] All four verified **live on the demo via Interceptor** (label, see-why, edit, forget).

## Comments
