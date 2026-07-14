# 09b — Knowledge graph, Path B2: the LLM-derived layer

Status: parked (T1, unstaffed) + shipped (T2 slice — related verses, see below)
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

## Review session (2026-07-15) — real numbers, not just the pilot summary

Read the actual 666 edges rather than re-stating the earlier aggregate. Findings were more
precise than the original flags:

**English-label leak — narrower than reported.** Raw heuristic hit 200/629 labeled edges (32%),
but 121 of those are from Ibn Kathir, a genuinely English-language source in this corpus
(`lang: "en"` in `sources.ts`, already shown as English to readers). Labeling an Ibn Kathir
passage in English is correct, not a defect. The real leak is **79/629 (12.6%)** — English labels
pulled from As-Sa'di and Al-Mukhtasar, both `lang: "id"` sources — concentrated in `ABOUT_TOPIC`
and `EXPLAINS`. Root cause: the extraction prompt never specified a label language at all.

**Ruling:** fixed at the prompt level, not with a blanket "always Indonesian" rule (which would
have degraded Ibn Kathir's correctly-English output). `SYSTEM_PROMPT` in
`src/review/graph-extraction.ts` now says: label in the same language as the source passage.

**`EXPLAINS` redundancy — confirmed at 100%, not "possibly."** All 93 `EXPLAINS` edges (52 unique
ayahs) duplicate what B1 (`src/app/build-graph.ts`) already produces structurally, zero-LLM, for
every one of the 18,707 tafsir passages in the corpus — not just this pilot's 55-verse sample.
**Ruling:** dropped `EXPLAINS` from `ALLOWED_PREDICATES` and the system prompt entirely. The 93
existing edges were purged from `data/review/graph-extraction.json` (they represented a predicate
that's no longer valid to extract, not data worth keeping in a review queue).

**`HAS_CONTEXT` — read all 16, not "a few."** ~10-12 are genuine occasion-of-revelation content
(Battle of Uhud, the Najran delegation, Abu Bakr's oath re: the ifk incident). 4 were weak enough
to reject outright rather than defer to scholar review: *"Reciting these two ayahs at night"*
(virtue-of-recitation, not an occasion), *"Makkiyah surah"* (a classification fact), *"Prophet
Muhammad"* (too vague to be usable), *"Address to jinn and mankind"* (describes the verse's
audience, not its context). Marked `review_status: "rejected"` with a `rejection_reason` each,
left in the file rather than deleted — same discipline as the divergence review queue: rejection
is a recorded judgment, not a silent drop.

**Current state of `data/review/graph-extraction.json`:** 573 edges (666 − 93 purged `EXPLAINS`),
569 at `review_status: "auto"`, 4 at `"rejected"`. `bun test` (10/10, `graph-extraction.test.ts`)
and `bun run typecheck` both clean after the prompt/vocabulary change.

**The review-promotion workflow was never actually undecided — I'd missed that it's already
fully specified.** `docs/design/quran-graphrag.html` § Stage 06 / Part Three defines a tiered
policy, not a flat `auto → human_pending → scholar_verified` queue:

| Tier | Predicates | Gate | Ever citable? |
|---|---|---|---|
| T0 | Structural (B1's `EXPLAINS`) | none — deterministic | Yes |
| T1 | `ABROGATES`, `HAS_CONTEXT`, `REFERENCES`, new Entity creation | **two independent scholars must agree** — never auto-promotable regardless of confidence | Only after promotion |
| T2 | `ABOUT_TOPIC`, `MENTIONS`, `THEMATICALLY_LINKED_TO` @ high confidence | sampled audit (~300 edges, ≥95% precision) | No — ranking only, never quoted |
| T3 | below `τ_low`, or unpromoted doctrinal edges | blocked | No |

**2026-07-15 (later) — asked Erik directly: T1 needs real scholar hours. Unstaffed, confirmed.**
Per the spec's own "Decisions to pin before build" section, this was always flagged as a staffing/
governance gap, not an engineering one — and `ISA.md` Out of Scope already excludes "fatwa,
ruling, or arbitration between scholars," so building T1 promotion tooling with no reviewer to
use it would just be inventory nobody can act on. **Ruling: T1 predicates (`ABROGATES`,
`HAS_CONTEXT`, `REFERENCES`) stay at `auto`/unreviewed indefinitely — parked, not blocked-on-me.**
The 4 `HAS_CONTEXT` rejections earlier this session were schema-fit checks (does this even look
like an occasion of revelation), not a T1 doctrinal ruling — noted so nobody later mistakes that
for scholar review having happened.

**T2 predicates need no scholar and are already in their correct terminal state.** `ABOUT_TOPIC`
(313), `MENTIONS` (187), `THEMATICALLY_LINKED_TO` (26) sit at `review_status: "auto"`, which per
the table above is already the right resting state for ranking-only use — no promotion step
exists for T2, only an optional sampled-precision audit before trusting the population broadly.
`NARRATIVE_OF` (20) isn't named in either tier in the spec; flagging rather than guessing — it
creates new Entity nodes describing historical/narrative claims, closer in kind to T1's "new
Entity creation" row than to T2's topic-tagging predicates. Left unclassified, not silently
assigned.

**2026-07-15 (later) — shipped the smallest honest slice of the T2 population: "related verses."**
Asked Erik whether to spend the T2 data on theme-browser enrichment or retrieval ranking;
recommended theme-browser (additive, doesn't touch the trust-critical chat-answer path) over
ranking (spec-sanctioned but riskier to verify). He approved.

Scoped narrower than "wire in ABOUT_TOPIC/MENTIONS/THEMATICALLY_LINKED_TO" — read all 26
`THEMATICALLY_LINKED_TO` edges first. 22 were same-surah adjacency (a passage spanning several
ayahs generates a link for every pair — a reader already sees these together in continuous
reading, so surfacing them as a special "connection" would be noise). Only the **4 cross-surah
edges** are genuine concept-to-concept navigation, and all 4 read as solid on inspection — direct
textual echoes in the evidence_span (e.g. 2:153 and 57:4 both carry the exact phrase "He is with
you wherever you are"; 2:154's passage literally says "refer to Surat Al-Ahzab 33:44").

**Shipped:** `src/app/build-related-verses.ts` (`bun run app:related`) reads
`data/review/graph-extraction.json`, keeps only cross-surah `THEMATICALLY_LINKED_TO` edges not
`review_status: "rejected"`, and generates `web/src/related-verses.ts` (inlined, 4 entries).
Graceful no-op (empty index, not a build failure) if the pilot was never run — same property
`build-themes.ts` already has relative to `data/`. `verse.ts`'s `verseEl()` looks the current
ref up in `RELATED_VERSES` (same pattern as the existing `FLAGGED` caution lookup) and renders a
"Terhubung secara tematik" block naming the source tafsir explicitly — T2 per the spec's own
tiering (auto, navigation only, never a doctrinal citation in Nur's voice), so it's presented as
a sourced pointer, not an assertion.

Verified live (Interceptor): the block renders only on the 4 linked verses, not elsewhere;
clicking through from 2:153 → 57:4 correctly switches to the reading surface, hides chat, and
renders Al-Hadid with 57:4 present. `bun test` 226/226, `bun run typecheck` clean, `bun run
verify` 24/24 — nothing in the retrieval or corpus-integrity path touched.

This is deliberately tiny (4 links) — a real slice of issue 07's original ask, not a finished
feature. A full corpus run of the extractor (still an open, costed decision — see above) would
likely yield a much richer network; this pilot-scale slice exists to see whether the pattern is
worth that investment before committing to it.

## Comments
