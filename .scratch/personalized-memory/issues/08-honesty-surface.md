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
      — **DEFERRED**: depends on issue 06 (personalized answers not built yet); ships with 06.
- [~] Profile page shows the derived profile, and edits/strikes persist. — **PARTIAL**: profile
      (interest chips + summary) is now shown on the Riwayat tab. Per-tag *editing* **deferred** — needs
      a suppress-list to be honest (re-distillation would re-add a struck tag). Forget-me covers control.
- [x] "Forget me" hard-deletes D1 rows AND the KV blob. — live: `/api/forget` → D1 total 0, KV None.
- [x] Post-delete read = cold start, no stale profile anywhere. — live: profile None, memory all 0.
- [x] Verified **live on demo** — notice + see-it + Forget-me render (screenshot); purge verified via curl.

## Comments

**2026-07-25 — Pulled forward ahead of 06 (Erik's call).** Built to close the collection-vs-transparency
gap: real users' data was accumulating on the public demo with no way to see/erase it. Scope this pass:
**transparency notice + show-derived-profile (chips + summary) + Forget-me** (two-step inline confirm, no
blocking dialog). Backend: `deleteProfile` (distill.ts) + `POST /api/forget` → `deleteUser` (D1) +
`deleteProfile` (KV), no-store. Frontend (`demo.ts`): `fetchProfile`, `forgetMe`, notice + chips in
`hydrateMemorySection`, `wireForget`. CSS in `demo.css`. Live-verified: forget purges D1+KV to cold
start; surface renders. Deployed b6e199b1. Remaining for full 08: personalized-answer label (needs 06),
per-tag edit (needs suppress-list).
