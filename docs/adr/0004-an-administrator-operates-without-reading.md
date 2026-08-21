# 4. An Administrator operates the service without reading anyone's content

Date: 2026-08-22
Status: Accepted

## Context

The Administrator role needs to support users, delete accounts on request, and
deal with abuse. The straightforward way to do that is to let an Administrator
open any Account and look at it.

But `auth.ts` records a decision that predates this work: magic-link login was
chosen over OAuth specifically so that "a user's private religious questions are
never associated with a third-party identity", with email as the only PII. The
app also ships a hard-delete — `deleteUser` removes rows rather than marking
them deleted.

Both say the same thing: QuranKu holds as little as it can about people, and
lets go of it completely when asked. An admin console that renders someone's
questions about doubt, sin, or their marriage would contradict that in the one
place where nobody would think to look for the contradiction.

The questions people ask this app are closer to what they would say to a
counsellor than to a search box.

## Decision

An Administrator sees **that** an Account exists and **how much** it holds —
email, creation date, counts of bookmarks, notes and questions — and can delete
it.

An Administrator never sees content: no question text, no bookmark references,
no notes.

## Consequences

Every operational need we could actually name is still met: identify an account,
see whether it holds anything, remove it.

Support gets harder in one specific way. If someone writes in saying "my
bookmarks disappeared", we can see whether they have any and how many, but not
which. We accept a slower answer over a readable confessional.

Debugging by inspecting a real user's data is off the table. Reproduction has to
come from a question we can ask ourselves — which is the same constraint the
evaluation harnesses already work under, so it is not a new discipline.

This is a constraint on the surface we build, not a security boundary. Anyone
with database credentials can still read the tables. It stops an admin console
from making that easy, routine, and invisible — it does not stop a determined
operator, and should not be described as if it does.
