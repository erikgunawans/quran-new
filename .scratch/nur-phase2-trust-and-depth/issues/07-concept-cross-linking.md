# 07 — Concept/thematic cross-linking (surface the knowledge graph)

Status: done (Path A — see Spike findings and Erik's ruling below)
Type: new capability, big bet
Priority: P2 (structural differentiator, not urgent)

## Problem / opportunity

`docs/design/quran-graphrag.html` already specs a knowledge-graph schema (concept → verses →
tafsir → related themes). The research's Perplexity pass found — and two independent sources
cross-checked — that **no mainstream Qur'an app ships a real conversational RAG/knowledge-graph
Q&A surface with this structure.** Nur already has the attributed-graph foundation and a chat
that answers only from cited sources; surfacing concept-to-concept navigation (Obsidian-style)
would be a differentiator competitors can't copy without rebuilding their entire data model.

The research itself tags this `[LOW]` confidence — it's white space by *absence* of evidence
(nobody does it, which could mean nobody's found it valuable, not just that nobody's built it).
That uncertainty is the reason this is `needs-triage`, not `ready-for-agent`.

## Why this needs a spike before a build commitment

This is a genuinely large scope increase — new UI surface, new navigation model, and it touches
`ISA.md` § Constraints ("the 113 MB tafsir corpus never reaches a phone" — cross-linking has to
be built from data that's *already* structured for this, or it becomes a second data-layer
project like the Phase 1 sharding work). Committing engineering time before validating the
premise (do readers actually want to browse concept-to-concept, or is chat + reading enough?)
risks building the thing the research itself is uncertain about.

## Spike findings (2026-07-14)

Ran the recommended spike — research only, no code, before anything was built:

1. **"The attributed-graph foundation" this issue assumed exists — doesn't, really.** The spec's
   actual knowledge graph (LLM triple-extraction over tafsir → entities/edges → concept↔verse
   cross-links, closed predicate schema with scholar sign-off) was never built. `src/ingest/`
   has zero concept/entity extraction of any kind.
2. **What DOES exist:** `src/review/problem-verses.ts` — 55 hand-curated verses, each tagged
   with one of 12 emotional themes, already used to score chat retrieval
   (`web/src/retrieve.ts`'s `LEXICON`). A flat lexicon, not a graph — but real, shipped, and
   already carrying exactly the kind of "what is this verse about" signal concept navigation
   would need.
3. **Building the real thing requires a new architectural decision, not just more time**: the
   spec's extraction pipeline needs an LLM at ingest time, and `bun run ingest` has been
   deliberately zero-LLM and deterministic since Phase 1. That's not a scoping question, it's a
   standing-invariant question — squarely Erik's call, not something to decide by implication.

## Erik's ruling (2026-07-14)

**Path A: build now, cheap.** Surface the existing 12-theme lexicon as a browsable index —
explicitly NOT the full LLM-extracted graph (that stays open, unbuilt, a future decision if Path
A shows people actually want to browse this way).

## Implementation

- [x] `src/app/build-themes.ts` (`bun run app:themes`) — generates `web/src/theme-index.ts`
      (inlined, ~9.4 KB) directly from `problem-verses.ts`, zero dependency on `data/`. Wired
      into `bun run build` alongside `app:corpus`.
- [x] `web/src/themes.ts` — `renderThemeIndex()` (all 12 themes, zero network) and `renderTheme()`
      (fetches each verse from the SAME per-surah shard the reading surface already uses — no new
      data path, no duplicated corpus).
- [x] New `#/tema` and `#/tema/{slug}` routes, third nav tab alongside Tanya/Baca.
- [x] Reused `read.ts`'s existing `onRead` map/click-handler (`registerReadCard()`,
      `clearReadCards()`, exported `bindActs()`) instead of a third, duplicated copy/share
      handler — caught mid-implementation that a first draft had written one.
- [x] Verified live (Interceptor), fully — unlike issues 01/05, this feature has NO dependency on
      the missing `corpus.json` in this worktree, so end-to-end verification was complete: all 12
      themes list with correct counts (55 total), a theme's real verses load from the real shard
      files with correct Arabic/both translations/attribution/why-caption, the "not found" state
      for a bad slug, nav highlighting mutually exclusive across all three tabs, the reading
      surface (`#/baca`) unaffected (regression check on the shared `#read` container).
      Copy button reached the real `copyVerse()` call (confirmed via `data-label` being set) —
      the clipboard write itself failed on `Document is not focused`, the same automation-only
      limitation already seen twice this session (issues 02 and 05), not a wiring bug.
- [x] `bun test` (72/72) + `bun run typecheck` clean.

## Comments

**2026-07-14 — Implemented as Path A.** Full graph (Path B) remains explicitly unbuilt and
un-ruled-on — this issue does not reopen or resolve that question, only the cheap validation
step.
