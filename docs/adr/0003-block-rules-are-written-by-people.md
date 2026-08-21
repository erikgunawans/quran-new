# 3. Block Rules are written by a person, not inferred by a classifier

Date: 2026-08-22
Status: Accepted

## Context

A Review Verdict is worthless if rejecting an answer changes nothing for the
next reader. But an Authored Answer cannot be retracted — it is regenerated
per asking and never stored as the thing shown. So a rejection has to act on
the *question*, which means deciding when a later question is "the same one".

Three mechanisms were available.

**The existing fiqh router.** `fiqhAreaOf` is a keyword matcher over a
normalised question. This repo's record with it is poor and well documented:
word-boundary keywords under-fire on Indonesian affixes, feeling-words collide
with subject names across a large number of subjects, and an entire routing
PRD was falsified end to end. It also returns null for questions matching no
area — including "apa hukum musik", the case that prompted this design. A veto
that silently no-ops on the questions most worth vetoing is worse than none.

**Semantic similarity.** We have Vectorize and a working embedder, so we could
block anything near the rejected question. But it adds an embed call to an
answer path already fighting a 25-second budget, the threshold is a magic
number that stays unfalsifiable until it misfires, and this repo has already
recorded that a cosine score cannot gate correctness.

**A written rule.** A person states the condition; the app matches it.

The distinction that decides it: the first two try to classify *every* question
into buckets. A Block Rule only has to recognise a narrow, named case. Far
smaller ambition, far higher chance of being right — and inspectable when wrong.

## Decision

A Review Verdict of "not sound" opens a rule editor, pre-filled with candidate
terms drawn from the question. A person edits and saves it. Matching is exact
and deterministic.

Before a rule can be saved, the editor shows which recent real questions the
rule *would* have blocked.

## Consequences

Over-blocking becomes visible while the rule is being written rather than being
discovered in production. That preview is the substance of this decision, not a
convenience — without it a written rule is just a hand-made classifier with the
same blind spots and less review.

Rules will miss phrasings nobody anticipated. That is the accepted cost, and it
fails in the safe direction: a missed rule means the app answers as it does
today, while an over-broad rule means silence where a reader deserved help.

Rules are readable, testable, diffable, and attributable to whoever wrote them.
A scholar can be shown exactly what his rejection did.

Rules accumulate and will need pruning; nothing here expires them. Revisit when
the set grows large enough that a person can no longer hold it in their head.

This does not close the standing question of scholarly review of the synthesis
edition. It gives a Reviewer a veto, which is narrower than approval, and no
scholar has yet signed off on the app authoring answers at all.
