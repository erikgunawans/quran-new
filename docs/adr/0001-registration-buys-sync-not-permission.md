# 1. Registration buys sync, not permission

Date: 2026-08-22
Status: Accepted

## Context

We set out to add "authentication" with three tiers, on the stated premise that
an unregistered person cannot bookmark and a registered one can.

Reading the code first showed the premise was already false. `identity.ts`
mints a signed `qk_uid` cookie for every visitor on first request, and every
memory write in `store.ts` — `addBookmark`, `addNote`, `setReadingPosition` —
is keyed on that anonymous id. Anonymous visitors have been able to bookmark
for as long as the feature has existed. What an Account actually buys today is
`linkAccount`: memory that survives across devices.

So the proposal was not "add a capability to Members". It was "remove a working
capability from Anonymous Visitors" — and the thing removed would be the first
thing a new visitor tries.

That cuts against a decision already recorded in `auth.ts`, which chose
passwordless magic-link login specifically so that "a user's private religious
questions are never associated with a third-party identity", with email as the
only PII. Demanding an email before someone may save an ayah pushes hard in the
opposite direction.

## Decision

Registration is a **sync tier**, not a permission tier.

Anonymous Visitors keep every reading capability they have today, Bookmarks
included. Becoming a Member changes durability, not permission: Memory survives
a cleared cookie and follows the person across devices.

Privilege tiers above Member (Reviewer, Administrator) are about operating and
reviewing the service. They are not "more of the reader experience".

## Consequences

The registration prompt has to be honest about a real risk rather than
advertising a withheld feature: *your bookmarks live only in this browser.*
That is a weaker hook than a locked button, and we accept the weaker hook.

We must be able to state the downside truthfully, which means Adoption (ADR 3)
has to work — telling someone their bookmarks are fragile and then losing them
at the moment they register would be worse than saying nothing.

No migration is needed. Existing anonymous bookmarks in D1 stay valid and
keyed exactly as they are.

If we ever do want a Member-only reading feature, this ADR is not in the way —
it rules on Bookmarks, which already worked, not on features not yet built.
