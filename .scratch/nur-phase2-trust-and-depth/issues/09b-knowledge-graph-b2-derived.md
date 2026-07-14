# 09b — Knowledge graph, Path B2: the LLM-derived layer

Status: needs-info
Type: new capability
Priority: P2

## What this is

The genuinely-needs-an-LLM half of Path B (see issue 09): `MENTIONS` (Entity), `ABOUT_TOPIC`,
`THEMATICALLY_LINKED_TO`, `NARRATIVE_OF` — extracted per-passage from the 18,707 tafsir passages
already ingested (`data/canonical/tafsir-passages.json`). Per the spec's own extraction prompt
(`docs/design/quran-graphrag.html` § Extraction), also covers `REFERENCES`, `ABROGATES`,
`HAS_CONTEXT` — genuine textual claims a tafsir passage can make about another verse or a
historical occasion, which do need a model reading the passage, unlike the purely structural
`EXPLAINS`/`AUTHORED_BY` edges B1 already shipped.

**Stays build-time only, permanently.** `ISA.md` § Constraints: "No generative model in the
retrieval path." This pipeline is offline, batch, versioned — the extraction script is the only
thing that ever calls an LLM, and it's never imported by anything under `web/`.

## Provider: OpenRouter (Erik's choice)

Plumbing built this session, no SDK dependency (plain `fetch`, matching this repo's existing
ingest style):

- `.env.example` / `.gitignore` — `OPENROUTER_API_KEY` (required), `OPENROUTER_MODEL` (optional,
  defaults to `anthropic/claude-sonnet-5` — verified against OpenRouter's live model catalog,
  not guessed from memory; pricing checked too: $2/M input, $10/M output tokens).
- `src/ingest/openrouter.ts` — minimal client, `complete(messages, opts)`.
- `src/review/graph-extraction.ts` — the closed 8-predicate vocabulary, the exact system prompt
  from the spec, and `validateEdge()` (Stage 04 per the spec: "Schema + predicate whitelist, pure
  code"). The `evidence_span` check automatically rejects any edge whose "quote" isn't an actual
  substring of the source passage — a fabricated quote never survives, no model trust required
  for that part. 10 unit tests, all passing, no network needed.
- `src/app/build-graph-derived.ts` (`bun run app:graph:derived`) — the orchestration script.
  Default scope is the SAME 55 curated verses issue 07's Path A already uses (~165 tafsir
  passages) — a known, bounded sample so extraction quality can be judged against verses Erik
  already knows. `--full` runs the entire corpus (deliberately not the default — real cost, real
  time, a decision to make on purpose). Sequential, not parallel — a good citizen of rate limits.
  Every edge lands in `data/review/graph-extraction.json` (gitignored, under `data/`),
  `review_status: "auto"` — nothing ships anywhere near `web/public` from this script.

**Dry-run verified**: ran the pilot scope with no API key set — correctly resolved 165 pilot
passages, failed each one gracefully with a clear "set OPENROUTER_API_KEY" message (not a crash),
wrote a valid (empty) output file. Confirms the whole pipeline is sound except the one part that
needs a real key.

## What's still needed from Erik

1. **The API key.** Paste it and it goes straight into a local, gitignored `.env` — never
   echoed back, never committed, never appears in any tracker file.
2. **Confirm or override the model.** Default is `anthropic/claude-sonnet-5`. Rough pilot cost at
   that price: well under $2 for the 165-passage pilot scope.
3. **Confirm the pilot scope is right** (55 curated verses) before running, or name a different
   bounded sample.
4. **The review workflow, once a pilot run produces real edges.** They'll all sit at
   `review_status: "auto"` in `data/review/graph-extraction.json` — who reviews them, and what's
   the bar for promoting one to `human_pending` → `scholar_verified`, versus discarding it?
   Recommend: Erik reads through the pilot output himself first (~165 passages' worth of
   candidate edges, likely far fewer after validation), same way he already reviews
   `data/review/divergence.json`.

## Comments
