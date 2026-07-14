# PROGRESS

Append-only checkpoint log. Newest at the top. Never rewrite history — add a new checkpoint.

---

## 2026-07-15 (session end) — Merged with main's independent adversarial-review pass

**Anchor:** `main` @ `1dd9240` (local only — no remote)

### What happened

Asked to merge the Phase 2 worktree branch (issues 01–09b: retrieval fix, thread persistence,
crisis path, tafsir lens, theme browsing, recitation audio, knowledge graph B1 structural + B2
OpenRouter-derived) into `main`. Main turned out to have 4 commits of its own — a separate
session's adversarial-review pass (14 numbered defects, 180 tests, 31 gates) that had
independently rebuilt overlapping ground: its own `crisis.ts`, `thread.ts`, `explain.ts`,
`announce.ts`, plus real fixes the worktree branch never had (actual `CacheStorage` invalidation,
corpus-version query strings, browser-output integrity gates, a `#live` race-condition fix).

Two decisions needed before touching anything, both made explicitly:

1. **Crisis-path policy** — main's version replaces the entire answer (no verse, ever) when
   crisis language is detected; the worktree branch showed the resource alongside the normal
   verse. Directly opposite behaviors for the same safety-critical feature. **Ruled: replace.**
2. **Merge strategy for the rest of the overlap** — main's implementations preferred wholesale.
   They came from the more thorough pass: main's `thread.ts` never persists a crisis exchange to
   `localStorage` (a real privacy gap the worktree branch had — a shared phone would surface
   someone's crisis message to the next person who opened the app), and `announce.ts` fixes a
   race condition on the `#live` region neither branch's author had caught before.

9 conflicts resolved by hand, including two real defects the line-based auto-merge produced
*without* flagging as conflicts — a duplicate `const MIN_SCORE` in `retrieve.ts` that would not
have compiled, and an orphaned `#info-panel` popover in `main.ts` referencing DOM that no longer
existed. Caught by reading the auto-merged files, not by trusting a clean `git merge` exit code.

Found one real gap during live verification, not before: chat's direct ref lookup (asking
"18:10") wasn't wired to Path B1's lazy tafsir loading. Fixed.

A second commit (`1dd9240`) landed three fixes that were made and verified live during merge
resolution but never `git add`ed before the merge commit — caught by diffing the working tree
against the merge commit's own claims, not by assuming the commit matched what actually happened.

### Verification

`bun run typecheck` clean (root + web). `bun test` 220/220 across 12 files. `bun run verify`
31/31 gates. Live-verified via Interceptor post-merge: crisis path replaces correctly and is
never written to storage; a normal exchange persists and restores across reload with the "clear
conversation" control appearing; the explain dialog opens from the header icon with main's richer
2:156 comparison; the tafsir lens toggle reorders a lazily-loaded stack correctly while leaving
the translation pair untouched; theme browsing and audio playback both intact.

### A standing note for future sessions in this repo

This session ran in a **separate git worktree** from `main`'s working directory
(`.claude/worktrees/moonlit-strolling-panda`), while another session worked directly in `main`'s
own checkout and diverged independently over the same ground. Worth knowing before assuming a
worktree branch is the only place work is happening on this repo — check `git log main..HEAD` and
`git log HEAD..main` both ways before any future merge.

### Standing constraints

- **No remote.** Commits stay local; there is nothing to push. **bun/bunx only. TypeScript only.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — never weakened.
- **No generative model in the retrieval path** — reaffirmed this session (Path B's LLM stays
  build-time only, never in the live answer path).
- Disk on this machine fluctuated 711 MB–15 GB free across the session (shared machine) — worth
  checking before any future large build (`bun run ingest`, `bun run app:graph`).

---

## 2026-07-15 (latest) — Path B2 pilot ran for real: 666 edges, 2 quality issues found

**Anchor:** same as prior checkpoint (local only — no remote).

Erik provided an OpenRouter key. Smoke-tested with one hand-built passage first — caught a real
bug immediately: the `X-Title` header's em-dash made Bun's `fetch` throw "invalid header value"
before any request reached OpenRouter (HTTP headers are ASCII-only). Fixed (plain hyphen),
committed (`db859f4`), then ran the full 165-passage pilot for real.

**165/165 passages, 0 failures, 666 validated edges.** ABOUT_TOPIC 313, MENTIONS 187, EXPLAINS
93, THEMATICALLY_LINKED_TO 26, NARRATIVE_OF 20, HAS_CONTEXT 16, REFERENCES 11. Avg confidence
0.83. Read actual samples, not just counts — mostly grounded, but two real issues: (1) some
Entity/Topic labels came out in English despite Indonesian source passages, breaking Nur's
Indonesian-only discipline; (2) a few HAS_CONTEXT edges look like "virtue of reciting" notes
rather than genuine occasion-of-revelation. Also flagged: 93 EXPLAINS edges were extracted even
though B1 already builds those for free (deterministic) — a cost question worth Erik's call
before any larger run. Full detail in `.scratch/nur-phase2-trust-and-depth/issues/
09b-knowledge-graph-b2-derived.md`.

All 666 edges sit at `review_status: "auto"` in `data/review/graph-extraction.json`
(gitignored) — nothing shipped near the app. Waiting on Erik: read a slice himself, decide on the
English-label fix and the EXPLAINS question, then design the auto → human_pending →
scholar_verified promotion workflow against real data instead of a hypothetical.

---

## 2026-07-15 (even later) — Path B2 plumbing: OpenRouter, ready but not run

**Anchor:** same as prior checkpoint (local only — no remote).

Erik chose OpenRouter for Path B2's LLM access. Built the plumbing, ran nothing for real (no key
yet): `.env`/`.gitignore` wired up (this repo had never handled a secret before — `.env` wasn't
even gitignored until now), `src/ingest/openrouter.ts` (plain fetch, no SDK, matching this repo's
existing style), `src/review/graph-extraction.ts` (the spec's exact 8-predicate closed vocabulary
+ system prompt + a validator that automatically rejects any edge whose evidence_span isn't a
real substring of the source passage — 10 unit tests, no network needed), and
`src/app/build-graph-derived.ts` (`bun run app:graph:derived`, default scope = the same 55
curated verses issue 07's Path A already uses, `--full` for the whole corpus but not the
default). Verified the model slug and pricing against OpenRouter's live catalog rather than
guessing from memory (`anthropic/claude-sonnet-5`, $2/M in, $10/M out — pilot scope should cost
well under $2). Dry-ran the pilot with no key set: correctly resolved 165 passages, failed each
one gracefully with a clear message, wrote a valid empty output file — confirms the whole
pipeline is sound except the one part that needs Erik's key.

Every edge this produces, once run for real, lands in `data/review/graph-extraction.json`
(gitignored) at `review_status: "auto"` — same discipline as `data/review/divergence.json`.
Nothing from this pipeline reaches `web/public` without a human step in between, and the LLM call
only ever happens in this one build-time script — never anywhere under `web/`.

`bun test` 142/142 (10 new). `bun run typecheck` clean.

### Next

Waiting on Erik: paste an OpenRouter API key, confirm the model/pilot scope, then
`bun run app:graph:derived` produces real candidate edges for review.

---

## 2026-07-15 (later) — Path B, split honestly: B1 (structural graph) shipped, B2 (LLM-derived) stays open

**Anchor:** same as prior checkpoint (local only — no remote).

### The check-in before writing code

Erik asked for "Path B" — the real knowledge graph from `docs/design/quran-graphrag.html`, not
issue 07's Path A shortcut. Read the full spec before touching anything: it bundles TWO very
different systems. (1) A build-time knowledge graph — LLM extraction over tafsir, closed
predicate schema, scholar-reviewed. (2) A live serving architecture — real backend (Neo4j/
Postgres), query router, vector+graph retrieval, reranker, AND a **generative LLM answering
live**. (2) directly contradicts `ISA.md`'s locked constraint ("No generative model in the
retrieval path") and assumes a live server Nur has never had (it's a 100% static site). Flagged
this before writing anything — Erik confirmed: (1) only, never touching the live answer path.

### The schema itself splits by cost

`docs/design/quran-graphrag.html`'s 16 predicates: 5 are pure structure, already fully expressed
by the existing ref-oracle/shard architecture (`PART_OF`, `TRANSLATES`, `PRECEDES` — building
these would just relabel data already there). Two more (`EXPLAINS`, `AUTHORED_BY`) are also
zero-LLM — they're the *known* structure of the tafsir corpus, just not yet browsable across the
full 6,236 ayahs (today tafsir only shows for the 55 curated verses, only in chat). The remaining
5 (`MENTIONS`, `ABOUT_TOPIC`, `THEMATICALLY_LINKED_TO`, `NARRATIVE_OF`, `SUBTOPIC_OF`) genuinely
need an LLM. Split into B1 (built this session) and B2 (stays open — see below).

### A blocker, resolved with a check-in first

`data/` didn't exist in this worktree — same gap that partially blocked issues 01 and 05, now
blocking B1 too, since it needs the raw tafsir corpus. Disk had been fluctuating 2.4–15 GB free
all session (clearly a shared machine). Asked before running anything expensive; Erik approved.
**Ran `bun run ingest`: 24/24 gates, 230 MB, 6.1 GB still free after.** Also ran `bun run
app:corpus` — as a side effect, `corpus.json` now exists in this worktree for the first time this
phase, which quietly fixes every "couldn't verify live, corpus.json missing" caveat logged in the
01, 05, and 06 checkpoints. `bun test` went from 129/132 to **132/132** — the 3 failures logged in
every prior Phase 2 checkpoint are gone, not worked around.

### B1 shipped

Measured before designing: a per-surah tafsir bundle is up to 9.3 MB (surah 7) — same bandwidth
violation already caught building recitation audio, same fix (per-ayah, not per-surah; worst case
118 KB). New `bun run app:graph` emits `web/public/tafsir/{surah}/{ayah}.json` (6,236 files,
gitignored — 105 MB of regenerable content, same treatment as `corpus.json`). New shared
`web/src/tafsir.ts` (the lens machinery from issue 06 moved out of `main.ts` once a third surface
needed it) adds LAZY loading — tafsir fetches only when a reader opens the disclosure for that
specific verse, never eagerly for a whole surah. Reading surface and theme browser both now show
real tafsir across the full corpus, not just the 55 curated verses.

**Verified live: 18:10** — the exact verse the original P0 bug denied existed, never part of the
curated 55 — now shows real tafsir from 3 scholars, lens-toggle-aware, correctly attributed. Chat's
original eager path re-verified unaffected by the refactor. Crisis-path detection re-verified
working. One tooling quirk found and isolated (not a bug): `interceptor act` doesn't trigger
native `<details>` toggle, though plain buttons work fine all session — confirmed via `eval`
`.click()` that the actual code is correct.

### B2 — genuinely still open, not quietly decided

Entity/Topic extraction and the 3 remaining derived predicates need a real LLM, and this repo has
zero LLM API integration today. Three real decisions before any of it gets built: LLM access
model (a real API key vs. supervised in-session extraction), extraction scope (18,707 passages is
a real cost — recommend a bounded pilot first, same reasoning as every MVP-scoped item this
phase), and the review workflow the spec itself mandates (`review_status`: auto → human_pending →
scholar_verified). Filed as issue 09b.

### Verification

`bun run ingest` 24/24, `bun run verify` 24/24 (re-run after this session, confirming nothing in
the ingest pipeline was touched by graph-building). `bun test` 132/132. `bun run typecheck`
clean. Live-verified via Interceptor as above.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- **No generative model in the retrieval path** — reaffirmed, not just preserved: B1 is 100%
  build-time, and B2 (if built) must stay that way too, per Erik's explicit ruling this session.
- `data/` now exists in this worktree (230 MB) — still gitignored, still regenerable via
  `bun run ingest`. `web/public/tafsir/` (105 MB) is a new gitignored artifact, regenerable via
  `bun run app:graph`.

---

## 2026-07-15 — Issue 07 resolved as a spike, then Path A shipped: browse by theme

**Anchor:** same as prior checkpoint (local only — no remote).

### The spike, before any code

Issue 07 assumed Nur "already has the attributed-graph foundation." It doesn't. The original
`docs/design/quran-graphrag.html` spec's real knowledge graph (LLM triple-extraction over tafsir,
entity linking, scholar-reviewed predicate schema) was never built — `src/ingest/` has zero
concept extraction. What exists is smaller and already shipped: 55 hand-curated verses tagged
with 1 of 12 emotional themes (`src/review/problem-verses.ts`), already used to score chat
retrieval. Building the real graph means putting an LLM into an ingest pipeline that has been
deliberately zero-LLM since Phase 1 — a standing-invariant decision, not a scoping detail.

**Erik ruled: Path A** — surface the existing lexicon as a browsable index, cheaply, now. The
full graph (Path B) stays open and unbuilt.

### What shipped

New `#/tema` and `#/tema/{slug}` routes, a third nav tab. `src/app/build-themes.ts` (`bun run
app:themes`, wired into `bun run build`) generates an inlined `web/src/theme-index.ts` from
`problem-verses.ts` — zero dependency on `data/`, so it builds in any worktree. `web/src/
themes.ts` renders the theme list (zero network) and, per theme, fetches each verse from the
SAME per-surah shard the reading surface already uses — no new data path, no duplicated corpus,
no risk of the honesty contract (both translations + attribution, always) forking between
surfaces. Mid-implementation, caught a first draft writing a THIRD duplicated copy/share click
handler (main.ts and read.ts already each have one) — refactored to reuse read.ts's existing
`onRead` map via two small exports (`registerReadCard`, `clearReadCards`) instead.

### Verification

Unlike issues 01 and 05, this feature has **no dependency on the missing `corpus.json`** in this
worktree — verified live (Interceptor), completely, not partially: all 12 themes list with
correct counts (55 total, matching `problem-verses.ts` exactly), a theme's real verses load with
correct Arabic/both translations/attribution/why-caption pulled from the real shard files, a bad
slug shows an honest "not found" (not a blank page), nav highlighting is mutually exclusive
across Tanya/Baca/Tema, and `#/baca` itself is unaffected (regression check on the shared `#read`
container both surfaces render into). The copy button reached the real `copyVerse()` call
(confirmed structurally) — the clipboard write itself failed on `Document is not focused`, the
same automation-only limitation already logged twice this phase (issues 02 and 05), not a wiring
defect.

`bun run typecheck` clean (root + web). `bun test` 72/72 in `web/src/`.

### Where Phase 2 stands now

All 8 items in `.scratch/nur-phase2-trust-and-depth/PRD.md` are `done`: 01–06 fully, 07 as
Path A (Path B intentionally still open), 08 unblocked and `ready-for-agent` whenever picked up.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — untouched this session.
- **Zero-LLM ingest pipeline** — untouched; Path B (the real knowledge graph) would be the first
  thing to break this, and remains an open, un-ruled-on decision, not a default.

---

## 2026-07-14 (latest) — Phase 2 issues 04 and 05 shipped: the crisis path, and a first taste of recitation

**Anchor:** same as prior checkpoint (local only — no remote).

### Erik's rulings this session

- **04 — Kemenkes SEJIWA / 119 ext. 8**, shown ALONGSIDE the normal answer, never instead of it.
- **05 — Syaikh Mishary Rashid Alafasy.** Hosting was already decided (self-host, shard-style).

### 04 — the crisis path exists now

New `web/src/crisis.ts`: phrase-based detection (not single-word — "mati" alone is far too
broad), catches the exact reproduced case ("aku gak sanggup bayar utang, pengen mati aja") and
common Indonesian phrasings, verified NOT to trigger on ordinary distress language or unrelated
mentions of death. Wired into `main.ts`'s `ask()` at a single insertion point that applies to
every existing response branch uniformly. Verified live: real query → crisis banner appears
first, normal answer still follows; an ordinary ref lookup produces no banner.

### 05 — recitation audio, MVP scope

**A real design correction, not just an implementation:** the ruling said "self-host, shard-style,
per-surah" — but `curl -I` against a per-surah source showed Al-Baqarah alone is **115 MB as one
file**. `ISA.md`'s reader's-bandwidth principle rules that out outright. Switched to **per-ayah**
files instead (everyayah.com, Alafasy_64kbps) — same self-hosting principle, correctly sized,
reuses the lazy-fetch pattern the text shards already use. Recorded as a deviation-with-reason in
issue 05, not a silent scope change.

Shipped: Al-Fatiha + Al-Ikhlas + Al-Falaq + An-Nas (22 ayahs, ~1.0 MB, real audio,
downloaded, sha256-pinned via new `bun run app:audio`). Full 6,236-ayah coverage is thousands of
individual fetches against a third-party host — deliberately NOT attempted this session; `hasAudio()`
tells the truth about exactly what's available, same "truth oracle" discipline as the surah index.

**A real bug caught, not glossed over:** an early version of the play/pause toggle updated the
button OPTIMISTICALLY, before `audio.play()`'s promise had actually resolved — so a rejected
play left the button lying, stuck on "Jeda" with nothing playing. Found by clicking the same
button twice and watching it not toggle off; fixed by making the toggle `async` and awaiting the
real result before touching the UI.

**A verification limit, disclosed rather than assumed away:** could not confirm AUDIBLE playback
through Interceptor — `a.play()` consistently rejects with Chrome's `NotAllowedError` (autoplay
gesture policy) on synthetic clicks, isolated as a tooling limitation (not a file/code defect —
the mp3 was independently verified valid via `curl -I`, and the code follows the standard correct
pattern of calling `.play()` synchronously inside a real click handler). Same class of limitation
already hit verifying the copy button's clipboard write in the 02 checkpoint. Recommend a
real-device spot-check before treating this as fully closed.

### Verification

`bun run typecheck` clean (root + web). `bun test` 72/72 in `web/src/` (new: `crisis.test.ts`
6/6, `audio.test.ts` 3/3). Live-verified via Interceptor: crisis banner (positive + negative
cases), play-button rendering/toggling/cross-reset on both the reading surface and chat, "only
one ayah plays at a time" behavior. Root-level `bun test`/`bun run verify` still blocked on the
same missing `data/`/`corpus.json` gap as every prior checkpoint this phase — unrelated to
either change.

### Next, in order

1. All of Phase 2's originally-scoped items (01–06, 08 unblocked) are now shipped. `07` (concept
   cross-linking) remains `needs-triage` — wants a design spike, not code.
2. Real-device spot-check on 05's audio playback, since Interceptor couldn't confirm it audibly.
3. Scaling 05 beyond the 22-ayah MVP sample, if/when Erik wants it — its own ingest run.
4. `bun run ingest` in this worktree, still not done, still optional — only needed if Erik wants
   the corpus gates runnable here.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — untouched this session.
- No streaks, badges, leaderboards, or completion-percentage mechanics.

---

## 2026-07-14 (even later) — Phase 2 issue 06 shipped: the tafsir lens toggle

**Anchor:** same as prior checkpoint (local only — no remote).

### What shipped

`web/src/main.ts` + `styles.css` — a "Semua / Klasik dulu / Kontemporer dulu" control on every
tafsir stack. It **reorders**, never filters: all 3 reference voices (Ibn Kathir, As-Sa'di,
Al-Mukhtasar) stay fully attributed and present in every state. Order is derived from each
source's `era` string only — deliberately not from `authority_tier`, which answers a different
question (doctrinal weight, not chronology) and would have been a real doctrine conflation to
reuse here. Default state is byte-identical to today's as-shipped order until the reader clicks
something.

### Verification

- `bun run typecheck` clean, `bun test` 120/123 (same 3 pre-existing missing-`data/` failures as
  the prior checkpoint, unrelated to this change).
- Live (Interceptor): chat retrieval — the only place tafsir stacks render today — needs
  `corpus.json`, which this worktree still doesn't have, so verification injected markup
  byte-identical to `tafsirEl()`'s real output and dispatched genuine `interceptor act` clicks
  (not `eval`-triggered) on the real rendered buttons, exercising the actual unmodified
  event-delegation handler. Confirmed all three lens states reorder correctly, attribution/text
  count never changes (3 in, 3 out, every time), and the choice survives a real reload.
- **Caught a real bug during self-verification, not after**: an early draft called
  `applyLens(getLens())` at boot to re-sort restored-thread cards against the reader's saved
  preference, but `applyLens` unconditionally wrote to `localStorage` — so a visitor who never
  touched the control would get `nur:lens` silently written on their very first load, breaking
  the write-only-on-explicit-action parity every other preference in this app follows
  (`nur:theme`, `nur:ar`). Found by checking `localStorage` directly rather than trusting the
  code was correct; fixed by splitting into `sortStacks()` (DOM-only, boot-safe) and `applyLens()`
  (storage write, click-only).

### Next, in order

1. **[P0] Crisis-path detection** — still blocked on Erik's ruling.
2. **[P1] Recitation audio** — hosting decided; reciter/source still open.
3. `bun run ingest` in this worktree, if Erik wants the corpus gates runnable here — still not
   done, still out of scope for UI-layer work.
4. `07` (concept cross-linking) and `08` (visual share cards) remain `needs-triage` — no session
   spent on them yet.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — untouched this session; the
  lens toggle deliberately never reaches the translation-pair rendering path.
- No streaks, badges, leaderboards, or completion-percentage mechanics.

---

## 2026-07-14 (later) — Phase 2 issues 01–03 shipped: retrieval honesty, thread persistence, the two-translation explainer

**Anchor:** same as prior checkpoint (local only — no remote).

### What shipped

**01 — Minimum-score threshold.** `web/src/retrieve.ts` — `.filter((h) => h.score > 0)` →
`.filter((h) => h.score >= MIN_SCORE)` with `MIN_SCORE = 4`. A direct ref (100) or any theme hit
(≥10) still clears it; a single incidental keyword (2) no longer does. Reproduces and locks the
exact reported failure ("gimana cara sholat tahajud" → 2:152 on the word "cara" alone) in a new
`web/src/retrieve.test.ts` against a synthetic corpus.

**02 — Thread persistence.** `web/src/main.ts` — every exchange is now pushed as `{ q, html,
cards }` to `localStorage["nur:thread"]` (capped at 40 turns) and replayed on boot via
`restoreThread()`. Deliberately stores the already-rendered answer + card data rather than
re-running retrieval on load, so a restored thread shows exactly what the user actually saw, and
restoration has no dependency on `corpus.json` or the network at all.

**03 — The two-translation explainer.** `web/index.html` + `styles.css` + `main.ts` — a collapsed
explainer inside `#hello` (first thing a new visitor can read) plus a persistent header "ⓘ"
popover (`#info`/`#info-panel`) reachable from every screen, every session. Two short sentences,
Indonesian, states neither rendering is "more correct" — consistent with `ISA.md` §
Principles ("Plurality is warmth, not hedging").

### Verification

- `bun run typecheck` — clean (root + web).
- `bun test` — 120 pass (4 of them new, in `retrieve.test.ts`). 3 pre-existing failures are
  unrelated `ENOENT`s on `data/raw/quran-data.xml` and `web/public/corpus.json` — this worktree
  never ran `bun run ingest` / `bun run app:corpus` (both gitignored build artifacts). Confirmed
  via `git status` that nothing in the ingest pipeline was touched this session.
- `bun run verify` (24/24 corpus gates) — **could not run**, same missing-`data/` reason. None of
  this session's changes are in the ingest/corpus path, so they cannot have affected these gates,
  but the gate itself is unverified in this worktree. Flagging rather than claiming a false green.
- Live verification via **Interceptor** (mandatory per house rules, not agent-browser): opened the
  dev server, confirmed the info popover toggles correctly with the right copy, confirmed the
  `#hello` explainer renders, sent a ref query (`18:10` — works without `corpus.json`, since ref
  resolution is inlined), reloaded, confirmed the exchange persisted with working attribution and
  a correctly re-wired copy button (`onScreen` lookup succeeded post-restore). Screenshots weren't
  available (Chrome window was minimized — a known Interceptor limitation only the user can
  clear); verification instead used the accessibility tree and `eval` against live DOM/
  `localStorage` state, which is a direct rather than visual confirmation.
- 01 could not be verified against a live chat query end-to-end, because chat retrieval needs
  `corpus.json`, which this worktree doesn't have built. The unit test reproduces the exact
  reported bug against a synthetic corpus instead — logically equivalent, not a live substitute.

### What's left in this worktree before the P0/P1 corpus gates can run again

`bun run ingest` (needs `data/raw/quran-data.xml` and friends — ~230 MB, network-dependent) and
`bun run app:corpus` were never run here. Not done this session — out of scope for three small UI/
retrieval fixes, and a call on whether it's worth doing in this worktree vs. the main checkout
belongs to Erik, not an assumption to make silently.

### Next, in order

1. **[P0] Crisis-path detection** — still blocked; Erik explicitly deferred the resource ruling
   this session (`.scratch/nur-phase2-trust-and-depth/issues/04-crisis-path-detection.md`).
2. **[P1] Recitation audio** — hosting decided (self-host, shard-style); reciter/source is the
   remaining blocker (`issues/05-recitation-audio.md`).
3. **[P2] Tafsir lens toggle** — `ready-for-agent`, next up when there's a session for it
   (`issues/06-tafsir-lens-toggle.md`).
4. `bun run ingest` in this worktree, if Erik wants the corpus gates runnable here.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — **never weakened**; none of
  this session's changes touch the corpus or ingest layer.
- No streaks, badges, leaderboards, or completion-percentage mechanics.

---

## 2026-07-14 — Engagement research run; Phase 2 filed to the tracker

**Anchor:** same as prior checkpoint (local only — no remote); no code changed this session.

### What happened

Ran `/Research` (Standard mode) against `PRODUCT.md` / `DESIGN.md` / `PROGRESS.md`: what would
make Nur more compelling and increase desire to learn the Qur'an, without breaking the product's
own no-gamification doctrine. Result cross-checked what was already known against new evidence
rather than surfacing a pivot — see `ISA.md` § Decisions (2026-07-14 entry) for the full reasoning.

**Confirmed, not discovered:** the four "Next, in order" items already at the top of this file
(min-score threshold, thread persistence, terjemah makna/harfiah explainer, crisis-path
detection) are exactly what the research independently flagged as highest-leverage. Nothing here
changes that list's order.

**New, added as Phase 2 candidates:** recitation audio (already an open item above, now with
research backing it as category table-stakes, not just a nice-to-have), a tafsir "choose your
lens" filter (addresses decision-paralysis across the 4 tafsir voices without ranking them —
doctrine stays intact), and concept/thematic cross-linking surfacing the graph `docs/design/
quran-graphrag.html` already specs (flagged `[LOW]` confidence by the research itself — filed as
a design spike, not a build commitment).

**Explicitly rejected, logged so it doesn't get re-proposed:** streaks, leaderboards, badges,
completion percentages, guilt nudges. `PRODUCT.md` already forbids these; the research supplies
the evidence (arXiv:2203.16175 on Duolingo-style compulsive use) for why that doctrine is correct,
not a reason to reconsider it.

### Filed

`.scratch/nur-phase2-trust-and-depth/PRD.md` + 8 issues, triaged:
- `ready-for-agent`: min-score threshold, thread persistence, terjemah-makna/harfiah explainer,
  tafsir lens toggle.
- `needs-info` (blocked on Erik): crisis-path resource/response, recitation audio source + hosting.
- `needs-triage`: concept cross-linking (design spike first), visual share cards (lower priority,
  sequence after the lens toggle).

### Next, in order

Unchanged from the prior checkpoint — this session added scope, it did not reprioritize:

1. **[P0] Crisis-path detection** — still blocked on Erik's ruling on the resource.
2. **[P1] Explain terjemah makna vs terjemah harfiah** — now `ready-for-agent`
   (`.scratch/nur-phase2-trust-and-depth/issues/03-explain-terjemah-makna-harfiah.md`).
3. **[P1] Minimum-score threshold** — now `ready-for-agent`
   (`.scratch/nur-phase2-trust-and-depth/issues/01-min-score-threshold.md`).
4. **[P1] Thread persistence across reload** — now `ready-for-agent`
   (`.scratch/nur-phase2-trust-and-depth/issues/02-thread-persistence.md`).

### Erik ruled this session

- **Crisis-path resource (issue 04): deferred, not decided.** Stays `needs-info`. Do not pick a
  resource unilaterally — wait for an explicit ruling before writing any crisis-detection code.
- **Recitation audio hosting (issue 05): self-host, shard-style**, per-surah fetch, same pattern
  as `web/public/surah/{n}.json`. Reciter/source selection is the only remaining blocker on that
  issue — see `.scratch/nur-phase2-trust-and-depth/issues/05-recitation-audio.md`.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `data/` is gitignored and regenerable via `bun run ingest`.
- Gates: **119 tests · typecheck clean (root + web) · 24/24 corpus gates** — unchanged, no code
  touched this session.
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — **never weaken these.**
- No streaks, badges, leaderboards, or completion-percentage mechanics — **now backed by cited
  evidence, not just house style.**

---

## 2026-07-14 — The crisis path, and 14 defects from an adversarial review

**Anchor:** `main` @ `25785aa` (local only — this repo has no remote)

### The one that mattered

**Nur did not notice a person saying they want to die.** Typed into the live app:
*"aku gak sanggup bayar utang, pengen mati aja."* It matched on `utang`, served 2:280 — a verse
about granting debtors respite — and never saw the rest of the sentence. `rg` for any crisis
vocabulary across the whole codebase returned nothing.

That is Rifqi: 19, in debt, awake at 2am. He is the persona PRODUCT.md was written around.

`web/src/crisis.ts` now runs **before** reference parsing and **before** retrieval — nothing gets
to answer ahead of it. It acknowledges the person, names **one** real resource (SEJIWA — dial
**119**, then **8**; Kemenkes, free, 24h), and does **not** lead with scripture. Tests assert it
never preaches: no *dosa*, no *sabar*, no *ujian*, no verse, no Arabic.

The detector is deliberately broad. A false positive costs one extra caring sentence; a false
negative costs something we cannot undo. The tuning follows that asymmetry, not precision.

### Behavioural truths

- **A clock is not a verse.** *"aku bangun jam 2:30 pagi"* resolved to Al-Baqarah 2:30 — silently
  reinterpreting insomnia as a citation, on the ref path, which skips retrieval and so had no
  scoring to catch it. Bare `N:M` is now disqualified near time words; `QS 2:30` still resolves.
- **`score > 0` shipped confident junk.** *"gimana cara sholat tahajud"* returned 2:152 (Gratitude),
  matched on the word `cara`. The floor is now a **theme hit** — Nur answers when it recognises a
  *feeling*, not when a word coincidentally appears in a translation. The honest-silence copy is
  finally reachable.
- **The app was misspelling surah names at Indonesian readers** ("Al-Baqara", "At-Tawba"). Every
  display surface routes through `displayName()` now.

### Truth of claims — four were defects introduced the day before

- **"a shard is cached forever" was a comment asserting a property the code did not have.** It was
  a `Map`; it died on reload. Now real CacheStorage keyed on `CORPUS_VERSION`. **Verified: Al-Kahf
  renders 110/110 after a reload with `fetch()` hard-blocked.** An uncached surah fails honestly
  with a retry, not a blank screen.
- Shard and corpus URLs now carry `?v=CORPUS_VERSION`. Without it, a rebuild left every CDN and
  phone serving the previous scripture indefinitely.
- The divergence review queue was written into **gitignored** `data/`. The artifact Erik has to act
  on vanished on a clean checkout. Now tracked at `docs/review/divergence.json` (468K, 1,224 verses
  ranked worst-first).
- `bun run dev` did not rebuild the corpus — the actual cause of the English captions shipping
  behind a green test suite. It does now.

### The gates were checking the wrong end

All 24 gates validated `data/canonical/` — the **input**. They never looked at what a phone
downloads. Seven browser gates added, including a **staleness gate that hard-fails** when the
browser artifacts and the corpus disagree. Confirmed it fires by feeding it a stale build.

**24 → 31 gates. 119 → 180 tests.**

Also: shard integrity now checks surah number + 1..N contiguity (a right-length, wrong-content
shard used to pass) and evicts a bad shard rather than poisoning every future read.

### Next, in order

1. **[P1] The core concept is never explained.** *Terjemah makna* vs *terjemah harfiah* is the whole
   product and has zero documentation in the UI. Jordan (first-timer) sees two translations that
   disagree and cannot learn why.
2. **[P1] The chat thread is destroyed on reload.** Verified: 2 messages → 0. Only theme and Arabic
   size persist. Casey switches to WhatsApp and loses everything.
3. **[P2] The crisis lexicon is hand-written and Indonesian-only.** It will miss phrasings nobody
   thought of. This is the best remaining use of an LLM anywhere in this product.
4. Re-run `$impeccable critique` (last: **30/40**, was 20/40).

### Open items waiting on Erik

- **Verify the helpline.** 119 ext. 8 (SEJIWA/Kemenkes) is a real-world commitment made on his
  behalf. One constant in `crisis.ts`. Please sanity-check before this reaches anyone.
- **Rule on the divergence queue** — `docs/review/divergence.json`, ranked worst-first.
- Scholar-board sign-off on sources + authority tiers.
- **Verify the Tafsiriyah text against a published edition.** Attribution is inherited, not verified.
- **Audio/recitation is entirely absent.** The Qur'an *is* recitation.
- PAI pins `gpt-5.4` while the installed Codex CLI is on `gpt-5.5` — every Forge call 400s until
  that pin is fixed. Codex quota is also exhausted until **Jul 20**.

### Standing constraints

- **No remote.** Commits stay local; there is nothing to push. **bun/bunx only. TypeScript only.**
- `data/` (~230 MB) is gitignored and regenerable via `bun run ingest`.
- Gates: **180 tests · typecheck clean (root + web) · 31 gates.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — **never weaken these.**
- Erik ruled: **ship Tafsiriyah-primary** (thesis intact); **attribution risk accepted**.

---

## 2026-07-13 (later) — The corpus is sharded; Nur can be read. 20/40 → 30/40

**Anchor:** `main` @ `b17b5ee` (local only — no remote)

### What changed

**The app no longer lies about what the Qur'an contains.** It used to tell users that 18:10 —
a real ayah in Al-Kahf — did not exist, because only 55 of 6,236 verses were bundled.

The critique said "just load all 4MB". Measured, that is the wrong fix for the constraint the
same critique names (patchy 4G). **You do not need a verse's text to know the verse is real.**

| Artifact | Size | Job |
|---|---|---|
| `web/src/surah-index.ts` | ~4 KB gzipped, **inlined in the bundle** | The truth oracle. Zero network. |
| `web/public/surah/{n}.json` | median 8 KB gzipped, worst 80 KB (Al-Baqarah) | Fetched on demand |
| `web/public/corpus.json` | 178 KB | Chat hot path, tafsir-bearing |

Consequence worth stating: **with `corpus.json` returning 404, all 110 ayahs of Al-Kahf still
render.** A network failure can no longer take the Qur'an away from you.

- **P0-a** — `18:10` resolves. `18:999` → "Al-Kahf cuma punya 110 ayat". `115:1` → "ada 114 surah".
  Refs accept names too: "al kahfi", "yasin", "surat 18 ayat 10".
- **P0-b** — Reading surface: 114-surah index → continuous ayah view.
- **P0-c** — try/catch + `res.ok` everywhere, visible error, working retry.
- **P1-a** — 55 captions translated. English tafsir sorted last and labelled.
- **P1-b** — Copy/share. Payload always carries BOTH renderings, interpretive one labelled.

### Found along the way (each one would have shipped)

1. **Tanzil prepends the basmalah to ayah 1 of 112 surahs.** `2:1` is really just *"Alif Lam Mim"*.
   Shipped unstripped, 112 surahs render a textually wrong first ayah — against a translation that
   never had it. This was a **pre-existing mismatch**, not a new bug. Stripped on the consonantal
   skeleton (95 and 97 carry a spurious shadda on the bā).
2. **`bun run typecheck` never covered `web/`.** `include: ["src","test"]`, no DOM lib. The entire
   frontend was unchecked while the gate reported clean. Repaired; it immediately found a real error.
3. **The reading surface dropped Al-Baqarah 2:281–286** — including *Amanar-Rasulu* and the longest
   verse in the Qur'an — because the chunk chain rode on `requestIdleCallback` alone, which a
   throttled tab starves. Scripture does not degrade gracefully.
4. **The Indonesian captions were never live.** The source was translated, the test went green, and
   the browser rendered English for an hour — `corpus.json` was built before the translation. The
   test guarded the *source*; the reader sees the *artifact*. Two tests now assert on the shipped file.

### Rejected: the mechanical divergence flag

Conjectured that Jaccard overlap < 20% between the interpretive primary and literal companion could
stand in for human review. **Refuted by measurement.** Median overlap is 29%, so <20% flags 1,224
verses — and the metric **cannot tell 2:156 (the Tafsiriyah's greatest win) from 94:5 (its worst
failure)**; both score ~7–11%. Low overlap measures interpretive *expansion*, not disagreement.

The safeguard was already structural: `literal_companion` puts both renderings in front of every
reader, on every verse. Divergence is now a **human review queue** (`data/review/divergence.json`,
1,224 ranked worst-first), never a reader-facing banner. Full C/R/L entry in `ISA.md` § Changelog.

### Erik ruled this session

- **Ship Tafsiriyah-primary.** Sharding scales the interpretive primary from 55 vetted verses to all
  6,236; the observed defect rate implies ~200 unreviewed 94:5-class renderings. Flipping to
  Kemenag-primary would gut the thesis (2:156 would lead with untranslated Arabic again). Thesis stands.
- **Attribution risk accepted.** "Ustadz Muhammad Thalib" is still inherited, not verified.

### Next, in order — the first one is serious

1. **[P0] Nur does not notice suicidal ideation.** Typed live: *"aku gak sanggup bayar utang, pengen
   mati aja."* Nur matched on `utang` and served a verse about debt repayment. It did not see
   *pengen mati aja* at all. There is **no crisis path anywhere in the codebase**. Rifqi — 19, in
   debt, at 2am — is the product's founding persona. **Needs Erik's ruling on the resource**
   (Kemenkes SEJIWA / 119 ext. 8) before I wire it.
2. **[P1] The core concept is never explained.** *Terjemah makna* vs *terjemah harfiah* — the whole
   product — has zero documentation in the UI.
3. **[P1] `score > 0` ships confident junk.** *"gimana cara sholat tahajud"* returned 2:152
   (Gratitude), matched on the single word `cara`. Needs a minimum-score threshold; the honest-silence
   copy already exists and is simply never reached.
4. **[P1] The thread is destroyed on reload.** Verified: 2 messages → 0.

### Still open from before

- Scholar-board sign-off on sources + authority tiers.
- Read the 16 divergent verses (now ranked in `data/review/divergence.json`) and rule on them.
- Verify the Tafsiriyah text against a **published edition**.
- **Audio/recitation is entirely absent.** The Qur'an *is* recitation.

### Standing constraints

- **No remote.** Commits stay local. **bun/bunx only. TypeScript only.**
- `data/` (~230 MB) is gitignored and regenerable via `bun run ingest`.
- Gates: **119 tests · typecheck clean (root + web) · 24/24 corpus gates.**
- `literal_iff_canonical`, `primary_voice`, `literal_companion` — **never weaken these.**

---

## 2026-07-13 — Corpus ingested, spec written, Nur app built & critiqued

**Anchor:** `main` @ `e2f896c` (local only — this repo has no remote)

### What exists now

**1. The design spec** — `docs/design/quran-graphrag.html` (standalone, opens in a browser)
Four parts: hybrid GraphRAG architecture → knowledge-graph schema → triple-extraction pipeline → serving & concurrency. Locked decisions: single-store, hundreds-concurrent, **plural + attributed** doctrine.

**2. The corpus** — deterministic, gated, zero-LLM (`bun run ingest`)
- **Canonical:** 114 surahs · 6,236 ayahs (Tanzil Uthmani) · 6,236 Kemenag literal translations.
- **Interpretive:** 4 attributed voices · 18,707 tafsir passages · 6,236 interpretive translations.

| Source | Role | Tier | Coverage |
|---|---|---|---|
| Tarjamah Tafsiriyah (Ustadz Muhammad Thalib) | **primary** | 3 | 6236/6236 (interpretive translation) |
| Kemenag | **companion** | — | 6236/6236 (literal, canonical) |
| Ibn Kathir | reference | 1 | 6236/6236 (**English** — see open items) |
| As-Sa'di | reference | 2 | 6235/6236 (silent on 72:11) |
| Al-Mukhtasar | reference | 2 | 6236/6236 |

- **24 integrity gates** pass. Sources are sha256-pinned (`src/ingest/sources.lock.json`); checksum drift **hard-fails** the build.
- `corpus_version` is derived from artifact hashes → rebuilds are byte-identical, and cache invalidation is by construction.
- Key invariants enforced in code: `literal_iff_canonical` (an interpretive translation can never be tagged canonical), `primary_voice` (exactly one), `literal_companion` (**the build FAILS if the interpretive primary ships without Kemenag alongside it**).

**3. Nur** — the reading + chat app (`web/`, Vite + TS, no framework runtime)
- PRODUCT.md + DESIGN.md written. Own brand. "Light emerging from dark" — no gold token in the system.
- Chat-first, real Indonesian slang, wired to the real corpus (223KB hot-path bundle).
- Retrieval is transparent keyword+theme scoring. **No generative model in the path** — Nur never answers in a scholar's voice.
- 63/63 tests pass, typecheck clean, 21/21 WCAG AA contrast tests (both themes).

### Key finding — the product thesis is real but NOT universal

`docs/review/primary-voice-review.html` (`bun run review:build`) — 55 verses people actually arrive with, Tafsiriyah vs Kemenag side by side.

- **2:156 — Tafsiriyah WINS.** Kemenag leaves *"Inna lillaahi wa innaa ilaihi raaji'uun"* untranslated; Tafsiriyah renders it in Indonesian. The thesis, proven.
- **94:5–6 — Tafsiriyah LOSES.** "With hardship comes ease" (a promise) becomes "in this worldly life there is suffering and pleasure" (a weather report). Both verses get the *identical* rendering, destroying the Qur'anic repetition. 0% word overlap.
- This ships as a **product feature**: the app flags 94:5–6 and tells the reader to read both.

### Critique — 20/40 (`.impeccable/critique/`)

Design is strong (clears the AI-slop check at both altitudes). **The product is the gap.**

- **[P0]** Says a real verse doesn't exist. Ask `18:10` → *"Tidak ada ayat yang cocok."* Only 55 verses are bundled. This is a lie by omission and the trust-killer for a scripture app.
- **[P0]** **You cannot read the Qur'an.** No browse surface. Can't open Al-Kahf on a Friday.
- **[P0]** Silent death if `corpus.json` fails — no try/catch, no error state. On patchy 4G this *will* happen.
- **[P1]** English leaking into an Indonesian product (verse captions + Ibn Kathir's English tafsir).
- **[P1]** Nothing is shareable, and the audience is Gen Z.

### Next, in order

1. **`$impeccable harden` the app** — fix the three P0s: load all 6,236 verses + both translations (~4MB; only tafsir stays server-side), distinguish "not in corpus" from "no match", add try/catch + error/retry state.
2. **Build the reading surface** (`$impeccable shape`) — surah index → continuous ayah view. The verse card already exists; this is structure, not styling.
3. **`$impeccable clarify`** — translate the `why` captions to Indonesian; source an Indonesian Ibn Kathir or drop it and lead with As-Sa'di + Al-Mukhtasar.

### Open items waiting on Erik

- **Scholar-board sign-off on the source list + authority tiers.** Blocks the extraction pipeline. Recorded in `src/ingest/sources.ts` rather than quietly decided.
- **Read the 16 divergent verses** in the review sheet (flagged red, most-divergent first) and rule on them. ~1 hour. Then I wire a per-verse override table.
- **Do not ship 94:5 with the Tafsiriyah rendering alone** — whatever else the review concludes.
- Verify the Tafsiriyah API text against a **published edition**. It's served from a personal EasyPanel box with no translator field; our attribution is inherited, not verified from the publisher.
- Indonesian **Ibn Kathir / Jalalayn** need a source. `in-tafsir-jalalayn` upstream is an empty stub (recorded in `sources.ts`).
- **Audio/recitation is entirely absent.** The Qur'an *is* recitation. Unresolved for the "Islamic" brief.

### Standing constraints

- **No remote.** Commits stay local; there is nothing to push.
- **Disk is tight.** Was at 99% / 130MB free this session; freed 5.5GB by deleting the finished QuranKu publish clone. `data/` (~120MB) is gitignored and regenerable via `bun run ingest`.
- **bun/bunx only, never npm/npx. TypeScript only.**
- Publishing/merging is a public action under GitHub identity `erikgunawans`.

---
