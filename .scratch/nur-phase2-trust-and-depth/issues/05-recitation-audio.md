# 05 — Recitation audio on the reading surface

Status: needs-info
Type: new capability
Priority: P1

**2026-07-14 — Erik ruled on hosting: self-host, shard-style, like the text.** Fetch audio
per-surah, consistent with `web/public/surah/{n}.json`. Reciter/source selection (point 1 below)
is the only remaining blocker.

## Problem

`PROGRESS.md` already logs "Audio/recitation is entirely absent — the Qur'an is recitation" as
an open item. The research independently flags this as `[HIGH]` confidence, table-stakes, and
Nur's most glaring category gap — Tarteel AI (15M+ users) owns real-time recitation and voice
search, but the base expectation for *any* Qur'an app, gamified or not, is that you can hear the
verse. Nur currently has zero audio anywhere.

## Scope (deliberately narrow)

This issue is scoped to **playback only** — a recitation audio control alongside the reading
surface (`web/src/read.ts`) and/or verse card (`web/src/verse.ts`), synced to the currently
displayed ayah. It explicitly excludes real-time mistake-correction, voice search ("recite a
phrase, find the ayah"), and any memorization tooling — those are Tarteel's actual product and a
much larger, separate body of work per `ISA.md` § Out of Scope precedent (audio was already
excluded from Phase 1 for the same reason).

## Why this is blocked

Needs Erik's ruling on:
1. **Reciter / source.** Which qari, and under what license/attribution terms — this touches the
   same sha256-pinning and attribution discipline (`ISA.md` § Constraints) already applied to
   text sources. A recitation source needs the same rigor: is it free to redistribute, does it
   need attribution, is there a stable CDN/API to pull from at build time.
2. ~~Hosting approach~~ — **ruled 2026-07-14: self-host, shard-style, per-surah fetch,
   consistent with the existing `web/public/surah/{n}.json` architecture.**
3. Whether this ships per-ayah, per-surah, or both, given the existing reading-surface UX.

## What unblocks this

Erik's ruling on reciter/source (point 1). Hosting approach is decided. Once the source is
picked, this decomposes into a standard shard-style feature (parallel to `ref-oracle`/
`reading-surface` in `ISA.md` § Features), fetching per-surah audio shards the same way text
shards are fetched today, with its own ISCs once scoped.

## Comments
