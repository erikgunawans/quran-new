# 07 — Concept/thematic cross-linking (surface the knowledge graph)

Status: needs-triage
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

## Recommended next step

A design/data spike, not a build: (1) what concept/theme metadata already exists in the ingest
pipeline (`src/ingest/`) vs. what would need new extraction, (2) a low-fidelity prototype of the
navigation (even a static mockup) to sanity-check the interaction model, (3) Erik's read on
whether this is worth committing to before Phase 2's other items land.

## Comments
