# New-Quranku — Knowledge & Retrieval Capability Plan

> Status: **DECISIONS RATIFIED 2026-07-16** (see §7). Owner: Erik. Scope: how New-Quranku helps people *find*
> the right verse, and how a conversational/generative companion enters — safely.

## 7. Ratified decisions (2026-07-16)

1. **Architecture = S3 hybrid.** Curated lexical + Tematik retrieval is the always-works offline floor;
   semantic (and the generative companion) are **online enhancements**, never dependencies. New-Quranku stays a
   static/offline-first app; the *scripture* is always reachable offline, the *warm voice* is the online layer.
2. **Generative companion IS in scope — as a "grounded companion, never an author."** Erik's vision: a
   place people can talk to about what's bothering them and receive enlightenment *from the Qur'an itself*.
   Delivered via a hard division of labor:
   - **Retrieval (deterministic, gated) owns TRUTH** — it decides which verses + attributed tafsir are
     relevant. The model never selects scripture.
   - **The LLM owns WARMTH + PHRASING only** — it (a) reflects the feeling back, (b) introduces the
     retrieved verse in plain Indonesian, (c) phrases what the *attributed tafsir already says*. It may
     NOT add a ruling, an interpretation, or any verse retrieval didn't ground. Retrieval empty → honest
     silence, never invented comfort dressed as scripture.
   - The verse card + named voices still render; the model's prose sits *around* scripture, never *as* it.
   - **Invariant — crisis stays un-generated:** `detectCrisis` short-circuits to the vetted helpline
     before any generation. The LLM never handles acute crisis.
   - **Invariant — fabrication-gated:** every generated reply's scriptural/interpretive claims must trace
     to a retrieved, attributed span (enforced in evals). Zero ungrounded theology ships.
   - **This makes the scholar sign-off THE gate**, not a nicety — New-Quranku becomes pastoral AI.
3. **Scholar secured** (Erik has the reviewer lined up). The deliverable to prepare this week is the
   **Scholar Review Package** (§8) — what they sign off on before the conversational layer ships.

## 8. Scholar Review Package (prepare this week)

The single artifact the scholar reviews and signs before the conversational capability ships. Sections:

- **A — Tafsir source integrity.** The 4 attributed voices: who they are, editions, authority tier,
  correct attribution. Sound to present as the tafsir stack? *(Closes the long-standing "scholar sign-off
  on tafsir sources" open item.)*
- **B — Situation → verse mappings.** A table of every emotional situation New-Quranku responds to (the
  problem-verses + Tematik themes) and the verses it surfaces, so the scholar can flag any theologically
  inappropriate pairing (e.g. is answering debt-despair with 2:280 sound?). This is the retrieval-truth review.
- **C — Conversational behavior spec + sample transcripts.** The companion's rules (empathize → frame →
  phrase-grounded-sources-only → never author → honest silence → crisis-exempt) plus 15–20 real sample
  dialogues (input → New-Quranku's reply), so the scholar reviews whether the *framing* ever misrepresents
  scripture or oversteps into ruling-giving. This is the generative-safety review.
- **D — Crisis handling.** The fixed, human-vetted crisis response + helpline, shown for confirmation.
- **E — What New-Quranku will NOT do.** Explicit non-capabilities (no fatwa, no halal/haram rulings, no authored
  tafsir, no answer without a source), so the sign-off is scoped and honest.

Turnaround: reviewable in a week. Blocks the conversational layer's ship, not Phases 0–1.

**Reviewer-conflict note (2026-07-16).** The reviewer, Ustadz Ahmad Isrofiel, is **Ustadz Muhammad
Thalib's son** — the author of New-Quranku's primary translation. He is an ideal, credentialed reviewer for
tafsir fidelity (A's presentation questions + the tafsir stack), the behavior rules (C), the mappings
(B), and the crisis path (D). But he is *conflicted* on one meta-question: whether the Thalib
translation *deserves* primacy over the official Kemenag literal. So Section A was **reframed** from a
judgment on his father's work into a *stewardship* review (are we presenting it faithfully, attributing
it correctly, honoring its adab) — which he is uniquely qualified to answer — and the "should an
interpretive translation lead as primary?" design question is **routed to a separate independent
scholar** outside the translation's lineage. Deleting that question would have been convenient; routing
it keeps the review honest. The "dissatisfied-with-Kemenag" backstory was removed from the package.

---

> Original discussion draft (semantic-vs-graph framing) preserved below.

---

## 0. The reframe: semantic and graph are not competitors

The instinct is to pick "semantic search" **or** "a knowledge graph." That framing is wrong for New-Quranku.
They solve two *different* jobs:

- **Semantic search = the FRONT DOOR.** A colloquial query → the right entry verses. This is New-Quranku's
  primary job: *"aku lagi capek banget"* → verses that actually speak to exhaustion, even when the
  query shares no keyword with them.
- **Graph = the ROOMS BEYOND.** Given an entry verse → related / contextual / doctrinally-linked
  verses. *"Show me what connects to this, what abrogates it, what its context of revelation is."*

The canonical GraphRAG pattern retrieves entry nodes **by vector similarity first, then traverses the
graph.** So a graph *depends on* a good front-door retrieval — it does not replace it. Picking "graph"
without solving the front door gives you beautiful rooms nobody can find the entrance to.

**And you already own a curated graph.** The Indeks Tematik (13 categories · 42 subtopics · 2,451
human-authored theme→verse mappings) is a thematic graph that needs **no ML and no scholar sign-off**
(it is a published thematic index, human-made). You can have the thematic "rooms beyond" *today*,
for free, with zero fabrication risk.

**Conclusion:** the real question is not *which*, it is *in what order*, and *is semantic even needed
yet* — which only measurement can answer. That is what this plan is built around.

---

## 1. The decisive constraint (read this before the semantic-vs-graph debate)

**New-Quranku is a zero-backend, offline-first, static app.** Confirmed in the repo:
- Served by `nginx` from `web/dist` (see `Dockerfile`, `nginx.conf`). **No runtime server. No inference endpoint.**
- All data is static files fetched on demand (`/corpus.json`, `/tafsir/N/A.json`) with the Cache API
  for offline reading (`quran.ts` `caches.open`, `evictStaleCaches`, `isCached`).
- The whole product ethos is "works on patchy Indonesian 4G, degrades gracefully" — the corpus can
  fail to load and *reading still works*.

**This is the crux of the semantic decision.** A vector/embedding search needs a model somewhere.
That forces an architectural fork:

| Option | How | Keeps offline? | Cost on mid-range Android / patchy 4G | Moat fit |
|---|---|---|---|---|
| **S1 — Fully client-side** | Ship precomputed verse embeddings as static vectors (like shards); embed the *query* in-browser via a small quantized ONNX/transformers.js model; cosine over ~6k vectors client-side | **Yes** | Model download (~20–100 MB, one-time cached) + first-load compute — heavy but not fatal | Strong — no new trust surface |
| **S2 — Backend endpoint** | Small Cloud Run service embeds the query, returns top-k | **No** (search needs network) | Adds latency + cost + a live dependency on flaky 4G | Breaks "search works offline"; adds an attack/uptime surface |
| **S3 — Hybrid (recommended)** | Keep curated lexical + Tematik retrieval as the *always-works offline floor*; add semantic **only as an online enhancement / reranker** | **Yes (floor)** | Zero cost when offline; semantic when online | Best — mirrors the existing "corpus fails → reading still works" graceful-degradation design |

**S3 is the most New-Quranku-shaped answer if semantic is needed at all.** It never trades away the offline
floor; semantic becomes an *enhancement*, not a *dependency* — exactly how the corpus/reading split
already works.

---

## 2. Semantic vs Graph — the honest comparison (the thing to talk through)

| Axis | **Semantic (embeddings)** | **Doctrinal Graph (GraphRAG, T1)** |
|---|---|---|
| **Job it solves** | Front door: paraphrase/slang/code-switch query → entry verses | Rooms beyond: abrogation, asbab al-nuzul, cross-reference, doctrinal linkage |
| **What it buys New-Quranku** | The core recall win — "I feel X in my own words" finds the right verse | Depth & scholarly credibility — *how* verses relate, multi-hop |
| **Data readiness** | Corpus + tafsir are clean and embeddable **today**; index does not exist | Graph scaffolding exists (`src/app/build-graph*.ts`); **doctrinal edges are PARKED** |
| **The real blocker** | The zero-backend architecture fork (§1) | **Two independent scholars you don't have** — shipping unverified doctrinal edges is a *theological liability* |
| **Moat risk** | Fuzzy recall can present a verse as "answering" what it doesn't → the exact fabrication risk New-Quranku refuses. Needs a relevance floor + honest silence | Low if scholar-gated; catastrophic if you ship an unverified "X abrogates Y" |
| **Effort** | E4–E5 (model choice, index, integration, offline fork) | E5 + a *people* dependency (scholar board), timeline in months |
| **Depends on** | Nothing external (if S1/S3) | A good front-door retrieval to pick entry nodes → depends on lexical/semantic first |

**My read:** semantic is the higher-leverage *and* lower-dependency bet for New-Quranku's primary job, **but
you may not need it yet.** The cheapest hypothesis to falsify first is:

> *Does Tematik + lexicon expansion close enough of the recall gap that embeddings aren't worth their
> cost/complexity yet?*

You can only answer that with an eval harness. Which is why the sequence below puts **measurement
before the semantic-vs-graph commitment** — so the data decides, not the vibe.

---

## 3. Recommended sequence (phased)

Each phase is independently shippable and de-risks the next. Moat guardrails (§4) bind all of them.

### Phase 0 — Wire the Indeks Tematik into retrieval  *(the free coverage you already own)*
- **Goal:** replace/augment the 55-verse `LEXICON` + per-verse `theme` tags with the 2,451 curated
  Tematik mappings, so retrieval and `/tema` both draw on the full thematic index.
- **Build:** transform `indeks-tematik.csv` → theme→verses map; expand `retrieve.ts` LEXICON and the
  corpus theme tagging; keep the honest-silence floor. `data/`-side, no ML.
- **Data readiness:** ✅ parsed, incl. the 87 secondary refs.
- **Moat touch:** none — human-curated mappings, zero fabrication risk.
- **Effort:** ~E3, days. **Exit:** eval set (Phase 1) shows measurably higher recall with no new false positives.

### Phase 1 — Build the eval harness  *(the instrument — do this before ANY generative/semantic bet)*
- **Goal:** a graded, versioned test set of real Indonesian emotional queries → expected verse(s) and
  expected-**silence** cases. A scorer wired into CI (`bun run` + a gate).
- **Build:** curate ~100–200 queries (from the seed chips, real phrasings, edge cases); define
  pass = correct verse in top-k AND no fabrication AND correct refusal when it should be silent.
  Score lexical-today vs Tematik-wired (Phase 0) vs any future semantic.
- **Why first:** you currently have **no measured proof** retrieval is honest or complete. For a
  religious tool, "feels right" is not evidence. This harness is what lets you *trust* any later layer.
- **Moat touch:** none — it *protects* the moat by measuring it.
- **Effort:** ~E3–E4. **Exit:** every retrieval change runs against it; the Phase 0→2 decision is made *on its numbers*.

### Phase 2 — Semantic front door  *(only if Phase 1 shows a recall gap Tematik didn't close)*
- **Goal:** paraphrase/slang recall via embeddings, added as the S3 hybrid (online enhancement over
  the offline lexical+Tematik floor).
- **Build (sub-decisions in §5):** pick a multilingual embedding model (Indonesian colloquial + Arabic
  + classical tafsir is a real quality question); precompute verse/tafsir/theme vectors at build time;
  choose the arch fork (S1 client-side vs S3 hybrid); add a similarity floor that preserves honest silence.
- **Data readiness:** corpus embeddable today; index net-new.
- **Moat touch:** ⚠️ high — a fuzzy hit must never be dressed as a canonical answer. Guardrails §4 are non-negotiable here.
- **Effort:** ~E4–E5, weeks. **Exit:** eval recall up, *fabrication rate still zero*, offline floor intact.

### Phase 3 — Doctrinal GraphRAG  *(highest value, scholar-gated, slowest)*
- **Goal:** the "rooms beyond" — abrogation, asbab al-nuzul, cross-reference — traversed from an entry
  verse the front door found.
- **Build:** finish the graph pipeline; a scholar-verification workflow; edges ship **only** as two
  independent scholars sign each class.
- **The real blocker is people, not code.** This gates on standing up the scholar board (§5).
- **Moat touch:** ⚠️ catastrophic if ungated — an unverified doctrinal edge is worse than no edge.
- **Effort:** E5 + months, paced by scholar availability.

### Cross-cutting (starts now, runs in parallel)
- **Scholar board.** The bottleneck for Phase 3 *and* for any generative capability. Identify, recruit,
  define the two-independent-reviewer workflow. Nothing doctrinal or generative ships without it.

---

## 4. Moat guardrails — invariants that bind every phase (non-negotiable)

1. **`literal_iff_canonical` / `primary_voice` / `literal_companion`** — never weakened.
2. **Honest silence.** Below the relevance floor, New-Quranku says it's unsure. No confidence theatre. (Already
   the doctrine in `retrieve.ts`.)
3. **No scripture in New-Quranku's own voice.** Generation, if it ever enters, may *only phrase what retrieval
   already grounded* — the `compose()` leash. It never authors tafsir.
4. **Every claim cites a source span.** Attribution is the moat. A generated sentence with no traceable
   source is a failure, not a feature.
5. **The offline floor never depends on a network model.** Search degrades to lexical+Tematik offline,
   the way reading already degrades gracefully when the corpus won't load.

---

## 5. Open decisions for you (let's talk these through)

1. **The architecture fork (§1): S1 client-side vs S3 hybrid vs S2 backend?** This is the biggest one —
   it decides whether New-Quranku stays a pure static/offline app. My lean: **S3 hybrid** (keep the offline
   floor, semantic as online enhancement).
2. **Is semantic even needed yet, or does Tematik + lexicon expansion defer it?** Decide *after* Phase 1
   evals, not now — but worth agreeing we'll let the numbers rule.
3. **Embedding model** (if we go semantic): multilingual quality for Indonesian colloquial + Arabic +
   classical tafsir; local/quantized vs API. Real research task.
4. **Scholar board — who and when?** This gates Phase 3 and *any* generative answer. It's the long pole;
   start it now regardless of the semantic-vs-graph order.
5. **Is generative answering in scope at all, or is "semantic" strictly better retrieval?** You ruled
   "UI/UX only" in Cycle 2. If that still holds, Phases 0–2 are retrieval-only and the moat is safe by
   construction; generation stays parked behind the scholar board.

---

## 6. My one-line recommendation

**Don't pick semantic-vs-graph yet. Ship Phase 0 (Tematik — free coverage you already own), build
Phase 1 (evals — the instrument), and let the eval numbers tell you whether you have a recall problem
(→ semantic) or a relationship problem (→ graph). Stand up the scholar board in parallel, because it's
the long pole for everything doctrinal or generative. And keep generation on the `retrieve.ts` leash —
the moment New-Quranku paraphrases scripture in its own voice, the trust that makes it worth building is gone.**
