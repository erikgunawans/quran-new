# 09 — Knowledge graph, Path B1: the structural layer (EXPLAINS/AUTHORED_BY)

Status: done
Type: new capability
Priority: P2

## Context

Follow-up to issue 07. Erik asked to do "Path B" (the real knowledge graph from
`docs/design/quran-graphrag.html`, not the Path A lexicon-browsing shortcut). Before writing any
code, split Path B by cost: the 16-predicate schema has a **zero-LLM structural tier**
(`PART_OF`, `TRANSLATES`, `PRECEDES`, `EXPLAINS`, `AUTHORED_BY`) and an **LLM-derived tier**
(`MENTIONS`, `ABOUT_TOPIC`, `THEMATICALLY_LINKED_TO`, `NARRATIVE_OF`, `SUBTOPIC_OF`). Also
surfaced that the spec's full serving architecture (live Neo4j/Postgres backend, query router,
reranker, and — critically — a **generative LLM answering live**) directly contradicts a locked
constraint (`ISA.md`: "No generative model in the retrieval path"). Erik confirmed: build-time
knowledge graph only, never touching the live answer path.

Of the structural tier, `PART_OF`/`TRANSLATES`/`PRECEDES` turned out to be pure relabeling — the
existing ref-oracle/shard architecture already expresses them fully; formalizing them adds no
reader-facing capability. `EXPLAINS`/`AUTHORED_BY` are the genuinely new piece: "which scholars
wrote about this verse, browsable across the full 6,236-ayah corpus" — today tafsir only shows
for the 55 curated verses, only in chat.

## Blocker discovered and resolved

`data/` didn't exist in this worktree (same gap that partially blocked issues 01 and 05) — the
raw tafsir corpus was never ingested here. Asked Erik; he approved running `bun run ingest` now.
Ran it: 24/24 gates passed, ~230 MB, disk had 6.1 GB free afterward (checked before and after,
given this machine's disk has been fluctuating 2.4–15 GB free all session).

## Design decision: per-ayah, not per-surah

Measured before building: a per-surah tafsir bundle for surah 7 is 9.3 MB; median across all 114
surahs is 578 KB. Both fail the reader's-bandwidth principle for a lazy on-demand fetch. Per-ayah
bundles: worst case 118 KB, comfortably reasonable. Same lesson already learned building
recitation audio (issue 05) — re-confirmed, not re-litigated.

## What shipped

- `src/app/build-graph.ts` (`bun run app:graph`) — reads `data/canonical/tafsir-passages.json`
  (18,707 passages) + `tafsir-sources.json`, emits `web/public/tafsir/{surah}/{ayah}.json` (6,236
  files, one per ayah with tafsir) + `web/public/tafsir/sources.json`. Output is **gitignored**
  (`.gitignore`), same treatment as `corpus.json` — 105 MB of regenerable derived content, not
  something to commit to git history.
- `web/src/tafsir.ts` — new shared module. Moved the lens machinery (issue 06) out of `main.ts`
  once a THIRD surface needed it (chat, reading, themes). Added:
  - `tafsirStackHtml()` / `tafsirEl()` — the EAGER path (tafsir already known — chat's 55
    curated verses from `corpus.json`), refactored from the original `main.ts` code, behavior
    unchanged.
  - `lazyTafsirEl()` / `loadTafsir()` / `loadTafsirSources()` / `bindLazyTafsir()` — the LAZY
    path: renders the disclosure immediately, fetches only on first `toggle` (not eagerly for
    every verse on a page — a surah can have up to 286 ayahs, eagerly fetching all of them would
    repeat the exact bandwidth mistake caught in issue 05). A 404 resolves to an honest empty
    state (a few ayahs are genuinely silent in one source — e.g. As-Sa'di on 72:11), a real
    network failure shows a retry.
- `web/src/verse.ts` — `VerseCard.lazyTafsir?: boolean`; `verseEl()` renders `lazyTafsirEl()`
  when set and `extra` isn't already provided.
- `web/src/read.ts` / `web/src/themes.ts` — both now set `lazyTafsir: true`, so tafsir is
  browsable on the reading surface and the theme browser, not just chat — the actual point of
  this issue.

## Verification

- `bun run ingest` — 24/24 gates. `bun run verify` — 24/24 (re-run after this session's changes,
  confirming nothing in the ingest/corpus pipeline was touched).
- `bun test` 132/132 (all pre-existing missing-data failures from every prior Phase 2 checkpoint
  are now GONE, since `data/`/`corpus.json` exist in this worktree for the first time this
  session — a real side benefit, not just noise reduction).
- `bun run typecheck` clean.
- Live (Interceptor): **18:10** — the exact verse the original P0 bug denied existed, never part
  of the 55 curated verses — now shows real tafsir from 3 scholars (Ibn Kathir, As-Sa'di,
  Al-Mukhtasar), lazily fetched, correctly attributed. Lens toggle (issue 06) correctly reorders
  the lazily-loaded stack (classical-first: Ibn Kathir → As-Sa'di → Al-Mukhtasar). Theme browser
  (`#/tema/patience`) also shows working lazy tafsir. Chat's EAGER path (55 curated verses)
  verified unaffected by the refactor — real query "aku lagi capek banget" still returns 2:214
  with pre-loaded tafsir, no `data-lazy-tafsir` attribute (confirming the correct code path).
  Crisis-path detection re-verified working after the `main.ts` refactor.
- One tooling quirk, not a code bug: `interceptor act` doesn't trigger native
  `<details>/<summary>` toggle (works fine on plain `<button>` elements throughout the rest of
  this session) — isolated by confirming a plain `.click()` via `eval` opens it correctly. Same
  category as the autoplay-gesture and clipboard-focus limitations hit earlier this phase.

## What's still open (Path B2 — not this issue)

Entity/Topic extraction, `THEMATICALLY_LINKED_TO`, `NARRATIVE_OF`, `SUBTOPIC_OF` — the genuinely
LLM-dependent tier. This repo still has zero LLM API integration. Needs Erik's input on: LLM
access model (real API key vs. supervised in-session extraction), extraction scope (full 18,707
passages vs. a bounded pilot), and the review workflow (`review_status`: auto → human_pending →
scholar_verified, per the spec's own provenance model).

## Comments
