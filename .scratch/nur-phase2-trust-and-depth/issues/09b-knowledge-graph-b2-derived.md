# 09b — Knowledge graph, Path B2: the LLM-derived layer

Status: needs-info (pilot ran successfully — waiting on Erik's review + 2 quality decisions)
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

## Pilot run (2026-07-15)

Erik provided an OpenRouter key. Smoke-tested with one hand-built passage first (caught and fixed
a real bug: the `X-Title` header's em-dash made Bun's `fetch` throw "invalid header value" before
any request reached OpenRouter — non-ASCII in an HTTP header value isn't valid, fixed by using a
plain hyphen instead) — then ran the full 165-passage pilot for real.

**Result: 165/165 passages, 0 failures, 666 validated edges.**

| Predicate | Count |
|---|---|
| ABOUT_TOPIC | 313 |
| MENTIONS | 187 |
| EXPLAINS | 93 |
| THEMATICALLY_LINKED_TO | 26 |
| NARRATIVE_OF | 20 |
| HAS_CONTEXT | 16 |
| REFERENCES | 11 |

Confidence: avg 0.83, range 0.6–0.95. Spread across all 3 tafsir sources (Ibn Kathir 335,
As-Sa'di 197, Al-Mukhtasar 134).

**Read actual samples, not just the aggregate counts — mostly grounded and plausible, but two
real quality issues, not glossed over:**

1. **Some Entity/Topic labels came out in English even when the source passage is Indonesian**
   (e.g. `NARRATIVE_OF` → "Story of Ya'qub's grief over Yusuf", "Expedition to Hamra al-Asad" —
   both extracted from As-Sa'di, an Indonesian-language source). Nur is strict Indonesian-only
   everywhere else (`ISC-35` anti-check). The extraction prompt doesn't currently instruct label
   language — needs a fix before any larger run, not something to ship as-is.
2. **A few `HAS_CONTEXT` edges look like "virtue of reciting this verse" notes, not actual
   asbab al-nuzul** (occasion of revelation), which is what the schema's `RevelationContext`
   node/`HAS_CONTEXT` predicate is meant for. Borderline, genuinely a scholar's judgment call —
   flagging for review, not asserting it's wrong.

**A cost question, not just a quality one:** 93 `EXPLAINS` edges were extracted even though B1
(issue 09) already builds those deterministically from corpus structure — zero LLM cost. The
LLM-extracted ones carry an `evidence_span` quote the deterministic ones don't, which might be
worth something, but it's real spend for possibly-redundant data. Worth deciding whether to drop
`EXPLAINS` from the extraction prompt before scaling.

All 666 edges sit at `review_status: "auto"` in `data/review/graph-extraction.json`
(gitignored). Nothing shipped anywhere near the app.

## What's actually still needed from Erik (updated)

1. ~~The API key~~ — done, pilot ran.
2. ~~Confirm the model~~ — `anthropic/claude-sonnet-5` used, worked correctly.
3. Read a slice of the 666 edges directly, not just this summary.
4. Decide on the English-label fix (add an explicit language instruction to the system prompt?)
   and the `EXPLAINS`-redundancy question before running anything larger than this pilot.
5. The review-promotion workflow (`auto` → `human_pending` → `scholar_verified`) — still entirely
   undecided, now that there's real data to design it against instead of a hypothetical.

## Comments
