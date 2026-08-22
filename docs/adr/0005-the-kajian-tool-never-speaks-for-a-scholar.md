# 5. The kajian tool never speaks for a scholar

Date: 2026-08-22
Status: Accepted

## Context

We want a tool that turns a dakwah video into a briefing and a one-page slide
for posting on our own channels.

The pipeline is: a person's spoken words -> machine transcription -> machine
summarisation -> machine translation -> a graphic carrying their name and face.
Every stage loses or distorts something, and the artifact at the end reads as
that scholar's teaching.

Three specific hazards, each verified against the tooling rather than assumed:

**No profile data exists.** The transcript tool returns `title`, `channel`,
`channelId`, `description`, `duration`, `thumbnailUrl`. There is no credential,
institution or biography field, and `channel` names a channel rather than a
speaker — a channel can host many. Anything richer than that has to come from
somewhere, and the default "somewhere" is a model inventing it.

**Auto-captions mangle exactly this vocabulary.** Arabic terms, hadith
collection names, surah and ayah numbers are what auto-generated Indonesian
captions get wrong. The tool exposes `isGenerated` per track, so we can tell.

**The obvious remedy is the trap.** An LLM cleanup pass over the transcript
reads better and is unverifiable: once it has "fixed" a citation, nothing
downstream can tell a right correction from a plausible wrong one, because the
original is gone. This repo already carries the rule — permission to display is
not permission to correct.

Underneath all three is the failure this project has hit before: a text true
sentence by sentence still misattributed a ruling, because the damage lived in
the join between a name and a claim rather than in any sentence.

## Decision

The tool may summarise. It may never speak for a scholar.

**Profiles come from a roster we maintain** — name, whatever title that person
actually uses, credentials, and a photo we are entitled to use. When a video
matches no roster entry, the slide renders with the source link and no
identity: no name, no face, no credentials. Omission is the fallback; guessing
is not available.

**The transcript is never rewritten.** When only auto-generated captions exist,
the briefing is stamped as such and lists the citations and Arabic terms it is
least confident about, with timestamps, so they can be checked against the
video. The slide stays a draft until they are.

**The artifact says what it is.** Every slide carries a link to the source
video and states that it is an automatic summary rather than a quotation.
Bullets are never styled as quotes.

## Consequences

Coverage is limited to scholars we have deliberately added. That is the point:
the roster is the list of people we are prepared to be accountable about.

Slides for unrostered videos are less useful — a summary with no attribution.
Correct, and it keeps the fallback safe rather than tempting.

Auto-caption videos cost manual checking before posting. Some will not be worth
it, and not posting is an acceptable outcome.

Reading quality is lower than a cleaned transcript would give. Accepted: the
alternative buys fluency with unverifiability.

This ADR governs the artifact we publish. It says nothing about whether a
scholar would endorse our summary — we do not ask, and must not imply we did.
