# PROGRESS

Append-only checkpoint log. Newest at the top. Never rewrite history — add a new checkpoint.

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
