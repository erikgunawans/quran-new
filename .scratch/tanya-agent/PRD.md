# Tanya as a continuous agent, grounded in OKF

Status: **decided, not started.** Seventeen decisions taken in a grilling session on 2026-08-10.
Nothing below is built. Phase 0 gates everything.

## What this is

Turn the Tanya section from a single-turn answer box into a continuous conversational agent that
answers warmly from the OKF knowledge base (Qur'an + hadith + aqidah + tafsir), combining ayah and
hadith into one grounded reply, and keeping the thread of the conversation across turns.

## Current state (verified 2026-08-10)

| Thing | Where | Today |
|---|---|---|
| Answer pipeline | `web/src/answer.ts` → `/api/answer` in `worker/src/index.ts` | Single-turn. Model never sees a prior turn. |
| Conversation store | `web/src/thread.ts` | Persists *decisions*, 12h TTL, 20 turns, crisis exchanges structurally unpersistable. Re-render cache, not model context. |
| Retrieval | `web/src/retrieve.ts`, `web/src/knowledge.ts` | Hand-curated Indonesian keyword aliases + word overlap. Client-side. |
| Egress guard | `web/src/answer-guard.ts` | Three HARD rules: `arabic`, `bad_ref`, `fatwa`. |
| Crisis | `web/src/crisis.ts` | Client-side lexicon, fires **before** retrieval and before any network call. |
| Offline eval | `src/eval/` | Real pipeline + LLM judge for grounding faithfulness. Single-turn only. |
| Model provider | `worker/src/providers.ts` | OpenRouter primary (`deepseek/deepseek-v4-flash`); SEA-LION alternate, wiring is an unverified TODO. |
| Editions | `EDITION` env in `worker/src/index.ts` | `synthesis` unlocks `/api/answer`; absent/`principled` keeps authoring dark by construction. |
| OKF corpus | `~/printing-press/library/tafseer-okf/okf/` | 183 MB. aqeeda 20 MB **Arabic only**; hadith 87 MB (ar+en); tafseer 76 MB (ar/en complete, **id = 2 files**). Outside this repo. |
| This repo | `github.com/erikgunawans/quran-new` | **PUBLIC.** |

## Decisions

### 1. Rights posture on OKF hadith — **retrieve broadly, display narrowly**
Every OKF hadith record carries `usage: reference-only` and a rights review dated 2026-08-08:
sunnah.com permits per-hadith didactic display with attribution, forbids mass reproduction of
collections. So: retrieve across the full corpus server-side, but **display at most one or two
hadith per answer**, always with `source_url`, collection, number, grade and translator credit.
Never a list. Enforced in code, not in the prompt.

### 2. Hadith card language — **split the register**
- Card shows **Arabic + English verbatim** with full attribution. The sourced artifact, untouched.
- The model's Indonesian prose may explain *the point* in the app's own voice
  ("Nabi ﷺ pernah mengingatkan bahwa…"). **Never** formatted as a quotation, never labelled
  *terjemahan*.
- Every hadith actually served enters a review queue (`docs/review/` pipeline). Once Ustadz Ahmad
  approves an Indonesian rendering, that record's card upgrades to reviewed Indonesian and stops
  depending on the model.

Rationale: unreviewed AI Indonesian was already refused for the Dorar surah preface. A mistranslated
hadith is a fabricated saying of the Prophet ﷺ — higher stakes, same rule.

### 3. Retrieval — **Cloudflare Vectorize + Workers AI multilingual embeddings**
Build-time job walks OKF, chunks per record, embeds (bge-m3 class), upserts to Vectorize with
frontmatter as metadata. Worker embeds the incoming question, pulls top-k, hands results to the model
as grounding alongside verses and KB entries.

- Store a build-time **Indonesian gist line** per record in metadata — not shown as translation;
  it exists for logs, review surface, and sanity-checking retrieval without reading Arabic.
- **Filter on `rights.usage` at query time.** Metadata carries it; the display cap from decision 1 is
  enforced in code.

Fallback if this fails: curated hand-tagged subset (~500–2,000 records mapped to existing topics).

**Embedding provider — decided by bake-off, not by assumption (amended 2026-08-10).**
OpenRouter *does* serve embeddings (`POST /embeddings`, models listed at
`GET /api/v1/embeddings/models` — they are absent from `/api/v1/models`, which is what made an
earlier check conclude otherwise). 31 models available on the existing key, including
`baai/bge-m3`, `intfloat/multilingual-e5-large`, `qwen/qwen3-embedding-8b`,
`google/gemini-embedding-2`.

So Phase 0 runs as a **multi-model bake-off** through the existing OpenRouter key rather than a blind
commitment to one embedder. Winner is chosen on measured Indonesian→Arabic retrieval quality.

Host choice is then separate from model choice:
- `bge-m3` exists on **both** OpenRouter and Workers AI. Same model → same vector space, so it can be
  probed on OpenRouter and later moved into the Worker for lower query-time latency **without
  re-embedding the corpus**. Verify empirically before relying on it.
- A winner available only on OpenRouter means staying there, accepting one network hop per question.

Privacy note: corpus embedding is public scripture, but **query-time embedding sends the reader's
typed words to the provider** — the decision-7 data policy applies to embeddings too.

### 4. Continuity — **session-continuous now, opt-in long-term memory later**
Model receives the last N turns of the current thread as context. `thread.ts` becomes the context
source, not just a re-render cache. Long-term cross-session memory ships later, **opt-in with real
consent** (not a pre-ticked box). See phase 5.

### 5. Crisis under continuity — **RAM only, nowhere else**
1. Crisis text never leaves the device. Unchanged from today.
2. A **care-mode flag** (boolean + coarse reason, never the words) survives in memory for the life of
   the tab, so a follow-up right after the helpline meets an agent that knows the person is
   struggling.
3. Reload wipes it. Come back tomorrow and the agent has genuinely forgotten.

"The app forgot you were in crisis last night" is a smaller harm than "the app remembered, and told
someone else."

### 6. What D1 stores — **never raw question text**
Structured events only: topic slug, refs served, turn kind, timestamp, coarse feeling label.
`distill.ts` derives the KV profile from that. Raw transcript stays on the device in `thread.ts`,
where it already expires and where there is already a button to burn it.

"We never store what you typed" must be literally true.

### 7. Model provider — **constrain OpenRouter, minimize the payload**
Stay on OpenRouter. Set account data policy to refuse prompt training; pass provider routing
preferences so requests only land on zero-retention upstreams. Cap the payload: last N turns only,
no profile, no identity, no more grounding than the answer needs.

Note: the crisis path never reaches a provider at all — `crisis.ts` fires client-side before any
network call. This governs the ordinary-but-still-sensitive middle.

### 8. Hadith citation — **marker-only, enforced as a fourth HARD guard rule**
1. The model cites by **opaque marker** (`[H:bukhari:6962]`) which must resolve against *this turn's*
   grounding. The renderer turns it into the card from decision 2. The model cannot hand-write hadith
   text into prose, exactly as it cannot hand-write Arabic today.
2. New **`bad_hadith` rule, built like `VERDICT`** — a construction list, not a word list. Any
   prophetic-attribution grammar (`Nabi ﷺ bersabda`, `Rasulullah bersabda`, `dalam sebuah hadits`,
   `diriwayatkan oleh`) without a resolvable marker sinks the whole answer.

The fabrication risk is not a wrong number — it is an attribution with no number at all. This rule
will reject true answers. That is the correct trade, and the same one `bad_ref` already makes.

### 9. Guard rejection mid-conversation — **retry once, defer in-voice, log always**
1. Retry once on reject.
2. On second failure the agent **stays in character**: warm, admits it can't answer this one with
   confidence, points to a human, still renders whatever principled cards retrieval found. It never
   says *why* — that would be an invitation to probe the guard.
3. **Log violation kind per turn** (`arabic` / `bad_ref` / `fatwa` / `bad_hadith`) with a question
   **hash, not text**. Without this you cannot tell a 2% rejection rate from 40%.

Precedent: `compose-live.ts` records a failure that was invisible from the server — the endpoint
logged success for prose nobody ever read.

### 10 & 11. Surface — **this becomes the main app's Tanya, gated on the ustadz**
The agent ships as the main app's Tanya, not a separate synthesis edition. What replaces the deleted
guarantee:

1. **The principled build stays buildable, tested and deployable.** CI keeps building it, the
   `EDITION` gate keeps working, tests keep passing. Never shipped as default, never allowed to rot.
   It is what you hand a scholar or a critic and say "this is the app with the model removed."
2. **"Principled" is reframed from a deploy-level guarantee to a per-turn floor:** *the app is never
   worse than the trustworthy edition on any given turn.* Weaker than the old promise. Still true.
3. **The default does not flip until Ustadz Ahmad reviews the agent on a real eval set** — a few
   hundred real questions, verdicts on file in `docs/review/`, same pipeline as the aqidah sheet.

Accepted costs: the `EDITION` "can never author" property ends; the rights argument is thinner at
main-app volume; `new-quranku-ai` becomes redundant.

### 12. Scope — **general Islamic Q&A, all three existing refusals intact**
Broader in what it can discuss, unchanged in what it refuses:
- `fatwa` stays hard — explains what scholars said and why they differ, never assigns a ruling.
- `refer-family-law` stays — nafkah, divorce, marital rights go to a human ustadz.
- `count-defer` stays unless a reviewed answer exists.
- **Feelings still win the routing race.** "aku capek banget sama utang" is answered as a tired
  person, not handed riba law. This ordering bug is documented in `answer.ts` and will return the
  moment OKF outranks the feeling path.

Explicitly out of scope: madhhab-comparative fiqh (no open-licensed Indonesian fiqh corpus exists;
dalil-only is the only clean path).

### 13. Retrieval trigger — **tool-calling**
The model gets a `cari_dalil(query)` tool over Vectorize. It calls when the conversation needs new
evidence, reformulates follow-ups into real queries, and doesn't call on "makasih ya".

- **Cap tool calls per turn** (2–3, then answer with what's in hand).
- **Accumulate the turn's grounding across calls** so the decision-8 marker whitelist covers
  everything retrieved that turn.
- Guard is unaffected — it runs on final output regardless of path. The determinism that matters
  lives in the wall, not the route.

Fallback if tool-calling on DeepSeek V4 Flash disappoints: heuristic new-topic/follow-up classifier.

### 14. Latency — **never stream ungarded tokens; stream progress**
Streaming and egress guarding are incompatible: `safeAnswer()` works because it sees the whole answer
before anyone does. You cannot un-show a fabricated hadith.

So: SSE/chunked **progress frames** from the Worker — "Sebentar, aku cari dalilnya…" → "Ketemu 3
hadits dan 2 ayat…" → the guarded answer lands atomically. Those states are real events from the tool
loop, not a fake progress bar. Optional typing-reveal of the already-cleared block is pure
presentation and costs nothing in honesty.

Consequence: `TIMEOUT_MS` in `answer-live.ts` becomes a per-call budget inside a longer turn budget.
The client needs a hard ceiling on the whole turn or a stuck tool loop hangs the thread forever.

### 15. Evaluation — **extend the harness to conversations; its report is the ustadz's sheet**
1. **Multi-turn fixtures** (4–6 turns) with drift-bait written deliberately: topic switches, pronoun
   follow-ups, "tapi tadi kamu bilang…", and a walk from comfort toward a ruling.
2. **A hadith-faithfulness judge** — does the claim about `[H:bukhari:6962]` match what that record
   actually says? Highest-stakes judge in the system; needs Arabic + English in front of it.
3. **Rejection rate as a first-class metric**, same taxonomy as decision 9's prod telemetry.
4. **The report is the review artifact** — `docs/review/` + the `call-app-template.ts` HTML sheet
   (answers embedded in `var DEFAULTS`). Conditional approvals must ship as conditional, never
   flattened into a plain yes.

The harness README already names the hole this closes: *the guard catches an ungrounded citation
mechanically; it cannot catch an ungrounded claim in fluent Indonesian that carries no reference.*

### 16. Corpus plumbing — **private R2, builder in repo, index in Vectorize**
This repo is **public**, so vendoring OKF (even chunked, even "derived") would publish 14,736 hadith
records as a downloadable collection — verbatim the act the rights review forbids, and it would
silently undo decision 1.

- **Repo:** builder script + manifest (file list, per-file content hashes). No scripture text.
- **Private R2:** the corpus, uploaded once. Build job reads with a scoped token.
- **Vectorize:** embeddings + metadata incl. `rights.usage`. Not in git.
- **The manifest must record which corpus revision produced which index.** Cheap now, impossible to
  retrofit.

#### Portability — keeping the embedding provider swappable

Decided 2026-08-10. Workers AI (bge-m3) is the starting choice, but Vertex-via-ADC or any other
provider must stay a config change, not a rebuild.

**Vectors do not transfer.** A bge-m3 vector (1024-dim) is meaningless to Vertex
`text-multilingual-embedding-002` (768-dim). There is no conversion. Migration = re-embed from text.
That is fine — embeddings are the cheapest model call there is — *provided the text is still around
in usable form.* Two disciplines make that true:

1. **The chunk manifest is a first-class artifact in R2, never only inside the vector DB.**
   It holds chunk ID, source file, content hash, chunk text, metadata (incl. `rights.usage`), and the
   Indonesian gist line. Migration then reads to: manifest → embed with new provider → upsert to new
   index. If the only copy of the chunks lives in Vectorize, migration means redoing chunking,
   metadata and gists from scratch.
2. **Embedding and vector search sit behind a thin interface** — `embed(texts)` / `search(query, k)`.
   Exactly the `providers.ts` pattern already used for chat models ("flip `provider` to A/B them
   without touching the handlers"). One file, one implementation per provider.

**Also record the embedding model + dimensions in the manifest**, so every index is self-describing
and a mismatched vector set can never be silently queried with the wrong embedder.

**What stays sticky:** chunk size, top-k and similarity thresholds are calibrated per model, so a
swap costs about a day of re-tuning and invalidates the previous quality numbers. Vectorize itself is
separately swappable (→ Vertex Matching Engine, pgvector, Qdrant) behind the same interface.

**Never store only-in-the-index:** the ustadz's approved Indonesian renderings live in `docs/review/`
and git. The index is derived, disposable, rebuildable. Nothing irreplaceable goes in it.

### 17. Sequencing — **unproven technical assumptions first, irreversible trust decisions last**

| Phase | What | Gate |
|---|---|---|
| **0** | OKF → private R2, manifest, Vectorize build job, `cari_dalil` callable from a script. **No UI.** | **Does "aku capek banget sama utang" actually retrieve a relevant Arabic hadith?** |
| **1** | `bad_hadith` guard rule, marker protocol, hadith card + attribution, rights filter. Single-turn. | Existing eval harness, unchanged |
| **2** | Continuity: thread as model context, tool loop, progress frames, turn budget, crisis flag in RAM | — |
| **3** | Multi-turn eval + ustadz review sheet | — |
| **4** | Main-app flip; principled build preserved in CI | **Ustadz Ahmad's sign-off** |
| **5** | Opt-in long-term memory: consent copy, structured D1 events, profile, "forget me" | — |

**Phase 0 stands alone and gates everything.** Indonesian→Arabic multilingual retrieval is the single
biggest unproven assumption in this plan. If it fails, the honest response is the curated-subset
fallback from decision 3 — far better learned in week one than after the guard, the cards and the
tool loop are built on top of it.

## Phase 0 result — RUN 2026-08-10, verdict GO

Full corpus: 14,736 hadith (Bukhari + Muslim), embedded with `baai/bge-m3` via OpenRouter, 15 real
Indonesian questions from `src/eval` fixtures. Reports: `phase-0-report.md` (4-model bake-off, 400
docs), `phase-0-full.md` (winner, full corpus). Harness: `probe.ts`.

**Model bake-off.** `baai/bge-m3` (1024-dim) is the only usable model of four.
`intfloat/multilingual-e5-large` works but is noisy and score-compressed.
`qwen/qwen3-embedding-8b` and `google/gemini-embedding-2` returned near-random results — note that
Gemini cannot be fairly judged through OpenRouter, which exposes no `task_type`
(`RETRIEVAL_QUERY`/`RETRIEVAL_DOCUMENT`); that is a harness limitation, not a model verdict.

**Core question answered: yes.** Indonesian questions retrieve the correct Arabic hadith.

**Amendment A — hadith retrieval is for KNOWLEDGE questions only.**
Knowledge questions scored 9/9 (riba → *The sin of Riba*; dhuha → the exact rakaat hadith at 0.633;
repentance, birr al-walidayn, charity, tawhid, iman, sabar, zina all correct).
Feeling questions scored 1/4, and the failures are the dangerous kind:
- *"cemas terus tiap malam gabisa tidur"* → *"Asking too many questions and troubling with what does
  not concern one"* (0.542) — a **rebuke to an anxious person**, the same class of harm as the
  founding `utang` / `pengen mati` failure.
- *"aku capek banget sama utang"* → the correct debt hadith, but debt **law**, not comfort. It
  answered the noun, not the person.

This is measured confirmation of decision 12's routing law: **feelings stay on the Qur'an path;
hadith search only runs for knowledge questions.** Not a preference — evidence.

**Amendment B — cosine score cannot gate correctness; Phase 1 needs a rerank stage.**
*"gimana hukumnya meninggalkan sholat?"* retrieved *"To leave or depart from the right and from the
left after finishing the Salat"* at **0.596** — a semantic false friend (*abandoning* prayer vs
*departing after* prayer) that outscored a perfectly correct hit (*Being Dutiful To One's Parents*,
0.575). Right and wrong hits occupy the same 0.47–0.63 band with no separation.

Consequences:
- **No similarity threshold may be used as a confidence signal.** Any design that says "score > X →
  trustworthy" is invalid on this corpus.
- **Add a rerank stage** between retrieval and grounding (OpenRouter documents a rerank API
  alongside embeddings). Cheap, and it is the standard fix for exactly this failure.
- The decision-8 marker whitelist becomes more load-bearing than assumed: the model may well be
  handed a confidently-scored irrelevant hadith, so nothing downstream may treat retrieval rank as
  correctness.

**Also proven operationally:** a 14,736-document run drops sockets. The builder needs batch retries
with backoff and a resumable vector cache (first attempt died at 224/14,736 with no output). Already
implemented in `probe.ts`.

## Still open

- **Agent persona and name.** Nur? QuranKu? Unnamed? Voice specifics under continuity were never
  settled.
- **Cost ceiling.** Vectorize index size + embedding cost + 2–3 model round-trips per turn, against
  an unknown Cloudflare plan. Phase 0 should produce a real number.
- **Rate limiting / abuse.** A public agent calling a paid model is a cost-attack surface. There is
  currently no answer to this and it must exist before phase 4.
- **Consent copy and "forget me" mechanics** (phase 5).
- **SEA-LION evaluation** on answer quality (not privacy) — its wiring is still an unverified TODO.
- **What happens to `new-quranku-ai`** after the flip makes it redundant.
- **Turn budget numbers**: N turns of context, k retrieval results, tool-call cap.
