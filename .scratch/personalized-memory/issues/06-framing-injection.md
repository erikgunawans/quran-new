# 06 — Minimal-hint framing injection into the grounded composer

Status: ready-for-human
Type: new capability — SENSITIVE (the whole risk of this feature lives here)
Blocked by: 04, 05

## Problem

This is the feature Erik explicitly asked for (Q7): personalized *answers*. It is also the single
place the whole design can go wrong — the line between "aimed at the person" and "unreviewed
scripture per person." Everything else is ordinary plumbing; this issue is the needle.

## Approach

The composer request contains **only**: the question + the retrieved grounded atoms + a **minimal
framing hint** `{ angle, tone }` derived from the KV profile. The grounded core is composed
**byte-identical for every user**; only framing / selection / emphasis varies.

## Guardrails (load-bearing — see PRD "hard walls")

1. **Framing, not content.** The composer may recombine and reframe reviewed atoms; it may **never**
   assert a religious claim not in the reviewed corpus.
2. **Additive, not subtractive** (inherits 05).
3. **Boundary (wall 3):** nothing identifying crosses to the LLM — no `user_id`, name, email, raw
   history, or narrative summary. Billboard-safe hint only.
4. **Zero-retention / no-train** API tier.

## Sequencing

**Ships together with 08 (honesty surface) and 09 (governance check), or it does not reach real
users.** Seed/test accounts only until 08 + 09 are live.

## Acceptance

- [ ] **Wall test:** two users with different profiles asking the identical question receive answers
      whose *grounded claims* are byte-identical — only framing differs. If this can't pass, 06 does
      not ship.
- [ ] **Boundary test:** composer payload asserted to contain no `user_id`/name/email/raw history/
      summary — only question + atoms + `{angle, tone}`.
- [ ] Recombination-only: no path lets the composer introduce a claim absent from the atoms.
- [ ] Zero-retention tier confirmed with the vendor.
- [ ] Not exposed to any real user before 08 + 09 ship.

## Comments
