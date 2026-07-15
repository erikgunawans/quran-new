---
project: Nur
task: "Cycle 2 — mobile-first UI redesign + merge with main's adversarial-review line (Cycle 1: Fix the three P0s and two P1s from the 20/40 critique, complete; Adversarial review, 14 findings, complete)"
effort: E4
phase: verify
progress: 94/96
mode: build
started: 2026-07-13
updated: 2026-07-15
---

# Nur — Ideal State Artifact

> **نور** — *light*. A chat-first Qur'an reading app for Indonesian Muslims, over a
> deterministic, gated, attributed corpus. This file is the system of record.

## Problem

The official Indonesian translation is *harfiyah* — literal. It renders words, not meaning.
At 2:156, the verse recited at every Muslim death, Kemenag leaves the Arabic **untranslated**:
a grieving person reads *"Inna lillaahi wa innaa ilaihi raaji'uun"* and understands nothing.
The person concludes the fault is theirs. It isn't.

Nur was built to fix that, and the corpus half is done and gated — 114 surahs, 6,236 ayahs,
24 integrity gates, sha256-pinned sources. But the app half scored **20/40** in critique, and
the failures are not cosmetic:

1. **It tells users a real verse does not exist.** Only 55 of 6,236 verses ship to the browser.
   Ask for `18:10` — a real ayah in Al-Kahf — and Nur says *"Aku belum menemukan ayat yang
   benar-benar cocok."* The "honest silence" copy becomes a **lie by omission**. For a scripture
   app this is the trust-destroying failure. (Reproduced: `.impeccable/evidence/p0-denies-18-10-BEFORE.png`)
2. **You cannot read the Qur'an in it.** No surah list, no verse navigation, no continuous
   reading. You cannot open Al-Kahf on a Friday — the single most predictable devotional act
   the product exists to serve. Chat is the differentiator; reading is the *job*.
3. **It dies silently when the corpus fails to load.** `fetch("/corpus.json")` has no try/catch
   and no `res.ok` check. On the patchy 4G this product explicitly targets, the user sees a
   beautiful, completely dead app with no message.
4. **English leaks into an Indonesian product** — the verse-card `why` captions are curation
   notes that were never meant to ship, and Ibn Kathir renders in **English** to Indonesian users.
5. **Nothing is shareable**, and the audience is Gen Z, whose primary devotional act online *is*
   sharing a verse.

## Vision

A person arrives at 2am carrying something. They type how they actually talk. A verse comes
back that lands — in language they understand, with every voice named and none ranked above
another. And then the app does not abandon them at the peak: they can keep reading, open the
whole surah, carry the verse to someone else.

The euphoric surprise: **a Qur'an app that never lies to you about what the Qur'an contains** —
even when it doesn't have the tafsir, even when it can't find a match, even when the network
drops. It always knows the verse is real, because knowing *that* costs 9.7 KB.

## Out of Scope

Not in this ideal state: audio and recitation (acknowledged as a real gap for the "Islamic"
brief, but a separate body of work); a generative model in the retrieval path; user accounts,
sync, or any server-side session; a native mobile app; fatwa, ruling, or arbitration between
scholars; any Arabic-language UI surface; search over tafsir full-text (the 113 MB tafsir corpus
stays server-side and is not shipped to the browser); the per-verse override table pending
Erik's review of the 16 divergent verses.

## Principles

- **Silence over fabrication.** Where the corpus is silent, Nur is silent — and says so plainly.
- **But silence must be true.** "I don't have it" and "it does not exist" are different sentences,
  and conflating them is the worst thing a scripture app can do.
- **Attribution is design, not fine print.** Every rendering names its source in the reading surface.
- **Plurality is warmth, not hedging.** Show that scholars differ, name them, trust the reader.
- **The reader's bandwidth is a moral constraint.** A 4 MB blob on patchy 4G is a product failure,
  not a deployment detail.

## Constraints

- **bun/bunx only.** Never npm/npx. TypeScript only, never Python.
- **Remote: `github.com/erikgunawans/nur` (private).** Added 2026-07-15 for a shareable demo,
  reversing the earlier no-remote constraint — see Decisions.
- **`literal_iff_canonical`** — an interpretive translation is NEVER tagged canonical. Enforced
  in `src/ingest/validate-interpretive.ts`; the build hard-fails. **Do not weaken.**
- **`primary_voice`** — exactly one primary voice (Tarjamah Tafsiriyah).
- **`literal_companion`** — the build FAILS if the interpretive primary ships without Kemenag
  alongside it. This is a **data/ship invariant** (`validate-browser.ts` → `shipped_literal_companion`;
  egress in `share.ts`), and it is **not weakened** by presentation. As of 2026-07-15 the literal
  companion (and the tafsir stack) render collapsed inside the verse's *depth* disclosure — one tap
  below the interpretive primary — rather than eagerly visible; flagged-divergent verses (94:5/94:6)
  render the disclosure OPEN so the caution's "baca keduanya" stays honest. The companion is always
  PRESENT in the card and always SHIPS in the corpus; only its default visibility changed. **Do not
  weaken the data/ship guarantee.**
- **No generative model in the retrieval path.** Nur never answers in a scholar's voice.
- **Sources are sha256-pinned** (`src/ingest/sources.lock.json`); checksum drift hard-fails.
- The 113 MB tafsir corpus never reaches a phone. Only Arabic + the two translations ship.
- **Disk is tight.** `data/` (~230 MB) is gitignored and regenerable via `bun run ingest`.

## Goal

Nur can be *read*, not just queried: every one of the 6,236 ayahs is reachable by reference and
by browse, no real verse is ever denied, network failure produces a visible retry rather than a
dead app, the UI speaks only Indonesian, and any verse can be carried out of the app — all without
shipping more than ~35 KB on the median read, and without weakening a single corpus integrity gate.

## Criteria

### Data layer — the shard architecture

- [x] ISC-1: `src/app/build-corpus.ts` emits `web/public/index.json` containing all 114 surahs
- [x] ISC-2: Each index entry carries `number`, `name_ar`, `name_translit`, `name_en`, `ayah_count`, `revelation_type`
- [x] ISC-3: `index.json` is ≤ 15 KB
- [x] ISC-4: The builder emits one shard per surah at `web/public/surah/{n}.json`, 114 files
- [x] ISC-5: Every shard contains every ayah of that surah — `sum(shard.ayahs.length) === 6236`
- [x] ISC-6: Each shard ayah carries Arabic (`text_uthmani`), the primary rendering, and the companion rendering
- [x] ISC-7: No shard exceeds 320 KB (Al-Baqarah is the worst case at ~290 KB)
- [x] ISC-8: Shard ayah counts match `index.json` ayah_count for all 114 surahs
- [x] ISC-9: `web/public/corpus.json` (the chat hot path) still builds and stays under 300 KB
- [x] ISC-10: Anti: no shard, and not `index.json`, contains any tafsir passage text
- [x] ISC-11: Anti: the browser bundle never fetches more than 320 KB to answer a single verse reference

### P0-a — never deny a real ayah

- [x] ISC-12: `web/src/quran.ts` exposes a ref parser accepting `18:10`, `18.10`, `surat 18 ayat 10`
- [x] ISC-13: A ref is validated against `index.json` alone — no shard fetch needed to know a verse is real
- [x] ISC-14: Asking `18:10` returns Al-Kahf 18:10 with Arabic + both renderings
- [x] ISC-15: Asking `18:999` produces "surah 18 only has 110 ayahs" — a true statement, not a denial
- [x] ISC-16: Asking `115:1` produces "there are only 114 surahs" — a true statement
- [x] ISC-17: A verse present in the Qur'an but absent from the tafsir corpus renders the verse AND says the tafsir is missing
- [x] ISC-18: Anti: the string "Tidak ada ayat yang cocok" is never emitted for a ref that resolves to a real ayah
- [x] ISC-19: The no-semantic-match copy is distinct from the not-in-corpus copy — two different sentences in the source

### P0-b — the reading surface

- [x] ISC-20: A browse entry point is reachable from the chat surface without a page reload
- [x] ISC-21: The surah index lists all 114 surahs with Arabic name, translit name, and ayah count
- [x] ISC-22: Selecting a surah renders its ayahs continuously, reusing the existing verse card
- [x] ISC-23: The reading view lazily fetches only that surah's shard
- [x] ISC-24: A verse reached from chat offers "read the rest of this surah" — the peak has a landing
- [x] ISC-25: Browser back/forward moves between chat and reading without losing the thread
- [x] ISC-26: Antecedent: reading Al-Kahf on a Friday takes ≤ 3 interactions from cold open

### P0-c — network honesty

- [x] ISC-27: Every `fetch` in `web/src/` is wrapped in try/catch AND checks `res.ok`
- [x] ISC-28: A failed corpus fetch renders a visible Indonesian error message, not a dead app
- [x] ISC-29: The error state offers a retry control that re-attempts the fetch
- [x] ISC-30: A successful retry restores full functionality with no reload
- [x] ISC-31: Anti: the send button is never left permanently disabled with no explanation

### P1-a — Indonesian only

- [x] ISC-32: Every `why` caption in `src/review/problem-verses.ts` is Indonesian
- [x] ISC-33: No English-language tafsir passage is rendered in the default (collapsed-open) view
- [x] ISC-34: Any English-source passage that does render is labelled as English to the reader
- [x] ISC-35: Anti: no user-visible string in `web/src/` is English prose (labels, errors, empty states)

### P1-b — shareable

- [x] ISC-36: Every verse card exposes a copy control that writes ref + Arabic + both renderings + attribution
- [x] ISC-37: Web Share API is used where available, with clipboard as the fallback
- [x] ISC-38: Antecedent: the copied text is attributed — a verse leaving Nur still names who translated it

### Discovered at THINK (IterativeDepth — 4 lenses)

- [x] ISC-43: The surah index is **inlined into the JS bundle** at build time — the ref oracle needs zero network
- [x] ISC-44: `18:10` resolves as real with the network fully offline (index never fetched)
- [x] ISC-45: The ref parser accepts surah **names** — "al kahfi", "yasin", "ar rahman" — not just `N:M`
- [x] ISC-46: Name matching is diacritic- and space-insensitive ("al-kahf" == "alkahfi" == "Al-Kahf")
- [x] ISC-47: Basmalah is rendered as an unnumbered opening for all surahs EXCEPT 1 (ayah 1) and 9 (absent)
- [x] ISC-48: Anti: the basmalah is never duplicated, and never omitted from a surah that has one
- [x] ISC-49: Shards are cached after first fetch — a re-read of the same surah issues no second request
- [x] ISC-50: Each shard self-declares its ayah count; a short/truncated shard is rejected, not half-rendered
- [x] ISC-51: Divergence between the primary and companion rendering is computed for all 6,236 verses at build time
- [x] ISC-52: [REFINED 2026-07-13 — see Changelog] Divergence is ranked into `data/review/divergence.json` as the human review queue
- [x] ISC-52.1: Anti: no shard and no browser artifact carries a `diverges` flag — the metric never reaches a reader
- [x] ISC-53: [REFINED 2026-07-13 — see Changelog] The caution UI fires from the HUMAN-CURATED list, in the reading surface AND in chat
- [x] ISC-54: 94:5 and 94:6 are flagged in the reading surface (the case PROGRESS.md forbids shipping bare)
- [x] ISC-55: Anti: no verse renders the Tafsiriyah primary without its Kemenag literal companion — **the structural safeguard**
- [x] ISC-56: Copied/shared text labels the primary rendering as **interpretive** (terjemah makna), not as the Qur'an's words
- [x] ISC-57: Copied/shared text carries the Kemenag literal rendering alongside — the `literal_companion` invariant, honored on egress
- [x] ISC-58: Anti: no share payload presents an interpretive rendering as canonical scripture
- [x] ISC-59: Al-Baqarah (286 ayahs) renders without blocking the main thread past 200ms

### Regression — nothing already earned is lost

- [x] ISC-39: `bun test` passes with no fewer than 63 tests
- [x] ISC-40: `bun run typecheck` is clean
- [x] ISC-41: All 21 WCAG AA contrast tests still pass in both themes
- [x] ISC-42: Anti: no corpus integrity gate is weakened, skipped, or removed — `bun run verify` still passes 24/24

### Adversarial review — 14 findings (2026-07-14)

- [x] ISC-60: Crisis intent is detected BEFORE ref parsing and BEFORE retrieval — nothing answers ahead of it
- [x] ISC-61: A crisis reply names one real, reachable resource (SEJIWA — 119 ext. 8, Kemenkes)
- [x] ISC-62: Anti: a crisis reply never leads with scripture — no verse, no Arabic, no translation block
- [x] ISC-63: Anti: a crisis reply never preaches — no "dosa", "sabar", "ujian", "azab", "neraka"
- [x] ISC-64: A clock is not a verse — "jam 2:30 pagi" does not resolve to Al-Baqarah 2:30
- [x] ISC-65: An explicitly marked ref ("QS 2:30") still resolves even beside time words
- [x] ISC-66: Retrieval requires a THEME hit — a coincidental word ("cara") can no longer answer
- [x] ISC-67: Every display surface renders Indonesian spellings (Al-Baqarah, not Al-Baqara)
- [x] ISC-68: A cached surah reads with `fetch()` hard-blocked — the offline claim is now true
- [x] ISC-69: Shard and corpus URLs carry `?v=CORPUS_VERSION`; stale caches are evicted on boot
- [x] ISC-70: Shard integrity verifies surah number and 1..N contiguity, not just length
- [x] ISC-71: Anti: a corrupt shard is evicted from cache, never allowed to poison future reads
- [x] ISC-72: `bun run verify` gates the BROWSER artifacts, incl. a staleness gate that hard-fails
- [x] ISC-73: The divergence review queue is tracked in git (docs/review/), not gitignored
- [x] ISC-74: `bun run dev` rebuilds the corpus — stale artifacts cannot be served in development
- [x] ISC-75: One owner for the live region; `onScreen` is bounded; `esc()` escapes single quotes

### UI Redesign Cycle 2 — mobile-first, chat as centerpiece (opened 2026-07-15)

- [x] ISC-80: A written design proposal is produced covering mobile ergonomics and the chat-surface redesign, before any implementation code is written
- [x] ISC-81: Anti: no implementation code is committed for this cycle until Erik has reviewed and approved the proposal
- [x] ISC-82: The proposal presents exactly three named options for what "generative AI chat capability" means, mapped against the locked Constraint
- [x] ISC-83: Anti: none of the three generative-capability options is silently chosen without Erik's explicit ruling — Erik chose "UI/UX only" via `AskUserQuestion`
- [x] ISC-84: The proposal identifies every touch target under 44×44px in the current mobile UI (icon-btn, size buttons, seed chips) with exact current dimensions
- [x] ISC-85: The proposal specifies a fix bringing every interactive control to ≥44×44px hit area without changing the design's visual weight — implemented, verified live at 44px
- [x] ISC-86: The proposal specifies `safe-area-inset-top` handling for `.top`, matching the existing `safe-area-inset-bottom` handling already in `.composer` — implemented
- [x] ISC-87: The proposal addresses the iOS Safari fixed-composer/on-screen-keyboard interaction risk with a named mitigation — `visualViewport` reposition implemented; live device confirmation is `[DEFERRED-VERIFY]` (Interceptor has no real iOS keyboard, same gap as Phase 2 issue 05's audio verification)
- [x] ISC-88: The proposal adds at least one responsive breakpoint beyond the existing single 30rem breakpoint, covering small-phone (<375px) and tablet/desktop (≥768px) distinctly — implemented
- [x] ISC-89: The proposal keeps `.app`'s existing 46rem max-width philosophy or explicitly justifies changing it — kept, just wider gutters ≥768px
- [x] ISC-90: The proposal specifies a "Nur is composing" state distinguishable from the current instant skeleton-to-answer swap, without violating the "no typewriter gimmick" motion doctrine — implemented, and a real bug caught in verification (see Decisions) required a follow-up fix
- [x] ISC-91: The proposal restructures the header's icon-button cluster for thumb-reach on mobile without removing any existing function (theme toggle, size control, info popover, nav) — implemented as a "Tampilan" overflow group below 768px, inline above it
- [x] ISC-92: The proposal specifies a mobile treatment for the info popover (current anchored popover risks edge-clipping on narrow viewports) — implemented (bottom-sheet anchor below 26rem, shared with the new display panel)
- [x] ISC-93: Anti: the proposal introduces no new color token, no gold, no wellness-app register shift — checked against `DESIGN.md`'s "What this is not" list; only existing tokens (`--surface`, `--line`, `--shadow-pop`, `--r-lg`) reused
- [x] ISC-94: Anti: the proposal does not touch `src/ingest/` or any retrieval-path code — this cycle is UI-surface only pending the generative-capability ruling; `bun run verify` 24/24 confirms
- [x] ISC-95: The proposal is engine-agnostic — the same layout renders under whichever of the three generative-capability options Erik eventually picks
- [x] ISC-96: Every proposed change maps to a token or component already defined in `styles.css`/`read.css`, or names the new token/component explicitly
- [x] ISC-97: Antecedent: Erik can read the proposal and make the generative-capability ruling without needing to ask a clarifying question back — confirmed: both `AskUserQuestion` items answered on the first pass, no round-trip needed
- [ ] ISC-98: [NEW] Real device / real-iOS spot-check of the `visualViewport` composer mitigation (ISC-87's deferred half) — not yet run
- [ ] ISC-99: [NEW] A genuine narrow-viewport (≤375px) live probe of the mobile header/panel/breakpoints — Interceptor in this environment has no viewport-resize or CDP device-emulation capability and no OS window-resize permission; verified instead via forced CSS override + computed-style checks at desktop width, which confirms the panel/positioning rules render correctly but not that the `47.9rem`/`26rem` triggers fire at real narrow widths (the media-query thresholds themselves were read from source, not exercised live)

## Test Strategy

| isc | type | check | threshold | tool |
|---|---|---|---|---|
| ISC-1..9 | data | build the shards, assert counts and sizes | exact | `bun run app:corpus` + `bun test` |
| ISC-5 | data | sum of all shard ayah counts | `=== 6236` | `bun test` |
| ISC-7 | perf | largest shard on disk | `≤ 320 KB` | `Bash` stat |
| ISC-10 | anti | grep shards for tafsir source ids | 0 hits | `rg` |
| ISC-12..19 | unit | ref parser + resolver table-driven tests | all pass | `bun test` |
| ISC-14 | live | ask `18:10` in real Chrome, read the reply | verse renders | `Interceptor` |
| ISC-18 | anti | live probe — the denial string must not appear | 0 occurrences | `Interceptor` |
| ISC-20..26 | live | click into browse, open Al-Kahf, screenshot | renders | `Interceptor` |
| ISC-26 | antecedent | count interactions from cold open to Al-Kahf | `≤ 3` | `Interceptor` |
| ISC-27 | static | every fetch call site has try/catch + res.ok | 100% | `rg` |
| ISC-28..30 | live | block the request, observe error + retry | recovers | `Interceptor` + `net override` |
| ISC-32 | static | scan captions for English words | 0 | `bun test` |
| ISC-35 | anti | scan user-visible strings for English prose | 0 | `bun test` |
| ISC-36..38 | live | click copy, read clipboard | attributed | `Interceptor` |
| ISC-39..41 | regression | full suite | 63+ pass, 0 fail | `bun test` |
| ISC-42 | anti | corpus gates | 24/24 | `bun run verify` |
| ISC-80..97 | proposal | Erik reads the written proposal and either approves it or rules on the generative-capability gate | explicit approval/ruling in this thread | inspection + `AskUserQuestion` |
| ISC-84 | static | measure current `.icon-btn`/`.size button`/`.seed` dimensions in `styles.css` | exact px | `Grep` + `Read` |

## Features

| name | description | satisfies | depends_on | parallelizable |
|---|---|---|---|---|
| shard-builder | Extend `build-corpus.ts` to emit `index.json` + 114 surah shards | ISC-1..11 | — | no (foundation) |
| ref-oracle | `web/src/quran.ts` — parse refs, validate against index, resolve via shard | ISC-12..19 | shard-builder | no |
| reading-surface | Surah index → continuous ayah view, routed, reusing the verse card | ISC-20..26 | shard-builder, ref-oracle | yes |
| network-honesty | try/catch + res.ok + error state + retry across all fetches | ISC-27..31 | — | yes |
| indonesian-only | Translate `why` captions; demote/label English tafsir | ISC-32..35 | — | yes |
| shareable | Per-verse copy + Web Share with clipboard fallback | ISC-36..38 | — | yes |
| regression-guard | Keep tests, typecheck, contrast, and corpus gates green | ISC-39..42 | all | no (final) |
| ui-redesign-proposal | Mobile ergonomics + chat-centerpiece design proposal, plus the generative-capability decision gate | ISC-80..97 | — | no |

## Decisions

**2026-07-13 — Shard the corpus; reject the 4 MB blob.**
The critique prescribed "load all 6,236 verses + both translations (~4MB)". Applying FirstPrinciples
to the constraint the same critique names — patchy Indonesian 4G — the blob is the wrong fix. Measured:
a 9.7 KB `index.json` (114 surahs + ayah counts) is sufficient to *know a verse is real*, and per-surah
shards average 33 KB (worst: Al-Baqarah at 290 KB). So the ref-oracle costs 9.7 KB, not 4 MB — a 400×
reduction — and the same index doubles as the browse surface. **You do not need a verse's text to know
it exists.** That insight collapses P0-a and P0-b into one data layer.

**2026-07-13 — Sharding escalates Erik's open divergence review; mitigate in-product rather than wait.**
Discovered via IterativeDepth (stakeholder lens). Today only 55 curated verses reach users. Sharding
puts all 6,236 interpretive renderings in front of readers — including the 16 divergent verses Erik has
not yet ruled on. The 94:5–6 flag covers two; **fourteen would go live unreviewed** behind a "verified
corpus" promise. Rather than block the release on a human review, the divergence score (already computed
in `src/review/`) is extended corpus-wide, carried into the shards as a `diverges` flag, and rendered
through the caution component that already exists. Erik's review then *upgrades the copy* for those
verses instead of *gating the ship*. Recorded because it is a deliberate risk transfer, not an oversight.

**2026-07-13 — Inline the index; the truth oracle costs zero network.**
Discovered via IterativeDepth (constraint-inversion lens). 9.7 KB of surah metadata gzips to ~4 KB.
Inlined into the JS bundle, Nur can prove `18:10` is a real ayah with **no fetch at all** — offline,
on a dead connection, on first cold open. Honesty becomes the cheapest path rather than the costliest.

**2026-07-13 — Share payloads must carry the interpretive label.**
Discovered via IterativeDepth (failure lens). The sharpest theological risk in this build: a Tafsiriyah
rendering leaving the app captioned "the Qur'an says" launders an *interpretation* into *scripture*.
The `literal_companion` invariant is enforced at build time inside the corpus; it must ALSO be enforced
on egress. Share text carries both renderings and labels the primary as *terjemah makna*.

**2026-07-15 — Content pillar structure added at `CONTENT.md`; orthogonal to Cycle 2, frontmatter untouched.**
Standard/Extensive research (4 agents, cross-checked) mapped Gen Z struggles to Quranic themes for the
"reach Gen Z" objective from PRODUCT.md. Produced `CONTENT.md`: 12 pillars in 3 evidence tiers, organized
by *situation* (what happened) rather than *mood* (how they feel) — the one axis no competitor (Muslim
Therapy, MuslimHira, Muraqaba, Afiah, Ruh) uses, and the one PRODUCT.md's own "arrival state" framing
already implies. This is a content-strategy deliverable, not code — logged here as a Decision rather than
advancing `phase`/`task` frontmatter, which stays owned by the in-flight Cycle 2 UI redesign (currently
`phase: verify`). Delegation floor (E2, soft ≥1) relaxed: the full research corpus and PRODUCT.md were
already in context: from the same conversation; an agent call would re-derive the same mapping with no
new information, so show-your-math applies and delegation was skipped.

**2026-07-15 — `CONTENT.md` design-tree resolved via grilling session; 13 decisions locked.**
A structured interview (one branch at a time, dependencies resolved in order) settled: pillars are
situation→verse/tafsir *data* feeding future AI retrieval, not standalone articles; the mapping lives as
a thin new layer on the existing knowledge-graph pipeline (no parallel content system); Wave 1 ships
browse-only, short-form-only, 1-2 anchors/pillar, to validate the draft→localize→review pipeline on
lowest-stakes content first; free-text AI routing is a deliberate fast-follow needing its own eval, per
"never fabricate; silence is honest." Scholar review gate is filled — **Ustadz Ahmad Isrofiel
Mardlatillah, M.A.** (Lentera Jalan Pulang Foundation / Marwah Muslimah Center; 0882 9544 4025) signs off
on every pillar's theological claim before ship. Copy is Indonesian-first (not translated post-hoc),
polished via `IndonesianPolish`. Every pillar response leads with Tarjamah Tafsiriyah (`tafsiriyah-thalib`)
per PRODUCT.md's existing reading model — no pillar-specific shortcut. Pillar 6's community-feature angle
is explicitly out of scope for v2. Erik overrode the conservative default on one branch: Tier 3 research
(Dating, Body Image, Addiction) is commissioned in parallel with Wave 1, not deferred until Waves 1-4 ship.
Verified (not assumed): none of the 12 anchor verses collide with the existing divergence-review queue
(`docs/review/divergence.json`) or Erik's 16 pending manual rulings.

**2026-07-13 — The ISA is seeded, not authored from scratch.**
Nur predates the ISA framework. Sources consulted: `PRODUCT.md`, `DESIGN.md`, `PROGRESS.md`,
`package.json`, `src/ingest/*`, the critique report, and the last 8 commits. `Principles` and
`Constraints` are lifted from constraints already enforced in code (the 24 gates), not invented.

**2026-07-15 (Cycle 2 opened) — "Generative AI chat capability" is not assumed to mean relaxing the locked constraint.**
Erik's request centered "the generative AI chat capability" in a UI-improvement ask. `ISA.md` §Constraints
already says "No generative model in the retrieval path. Nur never answers in a scholar's voice. Do not weaken,"
re-affirmed as recently as the Path B2 graphrag ruling (2026-07-15, above). Ran `FirstPrinciples/Challenge`:
classified "a chat-shaped UI" as a pure interaction-design choice (soft, no constraint interaction), "Erik wants
literal LLM-generated answers replacing retrieval" as an unvalidated assumption nothing in the message actually
states, and the locked no-generative rule itself as hard/immovable pending Erik's own ruling. Then ran an
`Advisor` consult (Rule 2, commitment boundary) before committing to a plan. The advisor caught a real hazard —
its `--auto-state` flag pulled in a stale ISA from an unrelated project (`entos-connector-registry-design`),
not Nur — but that hazard didn't propagate into this decision because Nur's actual constraint text was already
read verbatim from this file earlier in the session, not recalled from state. The advisor's substantive finding
was better than my own framing: not an (a) UI-only / (b) full-unlock binary, but a third reading — "generative
composition strictly downstream of deterministic retrieval" — whose legality turns on whether the locked
constraint is *structural* (no model decides which āyah is shown) or *output-scoped* (no model-generated prose
reaches the user at all). The constraint's own second sentence ("Nur never answers in a scholar's voice") reads
as evidence for the broader, output-scoped intent, not just the structural one — so this is not decided here.
**Recorded and NOT ruled on:** three options are put to Erik (UI/UX-only engine-unchanged; downstream generative
composition pending his structural-vs-output ruling; generative in the retrieval path requiring an explicit
unlock). Per the advisor and per the graphrag precedent above, a locked constraint is not relaxed by a phrase
in conversation — any relaxation gets written into this ISA by Erik, with rationale and a fail-closed boundary,
not inferred. The mobile-ergonomics and chat-layout work (ISC-84..96) is engine-agnostic and proceeds regardless
of which option Erik picks, per the advisor's "don't gate the UI work on the answer" guidance.

**2026-07-15 (Cycle 2, show-your-math) — ISC floor and delegation floor relaxed for a plan-stage cycle.**
This cycle's deliverable this turn is a written proposal (Erik's explicit ask, plus the global "Plan means
stop" rule and the brainstorming-before-creative-work rule), not shipped code. 18 ISCs (ISC-80..97) describe
proposal completeness and the decision gate — well under E4's soft 128-ISC floor, and no coding-delegation
(Forge/Anvil) fired, because no production code ships until Erik approves. Both are soft floors, relaxable
with justification: a full implementation ISC set (touch-target fixes, breakpoint CSS, header restructure,
composing-state markup) will be added to this same cycle, satisfying both floors, once Erik approves the
proposal and/or rules on the generative-capability gate — this is one continuing cycle, not a shortcut around
the tier's intent.

**2026-07-15 (Cycle 2 ruling) — Erik chose "UI/UX only" and confirmed the write-up was the ask.**
Via `AskUserQuestion`: (1) generative-capability gate resolved to option 1 — the deterministic
retrieval engine stays untouched this cycle, no constraint interaction, no ISA Constraint edit
needed; (2) confirmed "please provide a good wife" was dictation noise for "a good write-up" and
that the proposal itself was the requested deliverable. Proceeded to implement the engine-agnostic
mobile-ergonomics and chat-composing work (ISC-84..96) on the strength of this ruling, per the
Advisor's "don't gate the UI work on the answer" guidance recorded above — the UI-only reading was
always going to ship regardless of which option Erik picked.

**2026-07-15 (later) — Constraint reversed: a remote now exists.** Erik ran `/ship`; the
workflow's premise (push, open a PR) had no target — this repo had no git remote, ever, by
explicit constraint above. Asked rather than silently adding one. Erik chose: create a real
GitHub repo now, private, under his personal account (not the axiara-ai org — this stays a
personal project). `github.com/erikgunawans/nur`, private. This surfaced a second, larger issue
first — `main` (checked out separately in the primary worktree) had diverged with its own
adversarial-review line, 7 commits and 7 conflicting files never seen from this worktree. That
merge is its own entry above ("Cycle 2, show-your-math" section context) and its own commit
(`1e31b30`) — resolving it, including a real ISC-ID collision the line-based auto-merge didn't
flag, came before any push.

**2026-07-15 — Presentation ruling: the verse card leads with the interpretive primary alone;
the literal companion and tafsir move behind a *depth* disclosure.** Erik ruled on how a verse
should read by default: **Arabic → Muhammad Thalib's *terjemah makna*, and nothing else visible.**
The Kemenag *terjemah harfiah* and the full tafsir stack (Ibn Kathir, As-Sa'di, Al-Mukhtasar) now
render collapsed inside one `<details class="depth">` below the primary — "Terjemah harfiah &
tafsir ulama" — one tap away, not gone. This is a deliberate move toward DESIGN principle 4 ("meet
them where they are, then go deeper — depth one tap away") and away from the earlier "both
renderings eagerly in front of every reader" presentation.

Flagged before implementing that this touches `literal_companion`. Resolution: the invariant is a
**data/ship gate** (`validate-browser.ts` → `shipped_literal_companion`), and it stays fully
intact — the companion still ships with every verse and still travels on egress (`share.ts`);
`bun run verify` gates unchanged. Only *default UI visibility* changed. The one real interaction —
the 94:5/94:6 caution says "baca keduanya" (read both) — is preserved by rendering the depth
disclosure **OPEN** for flagged-divergent verses, so the companion the caution points at is
visible without a tap. Verified live (Interceptor): ordinary verse collapses to Arabic + makna;
expanding reveals the companion and lazily loads the tafsir; 94:5 opens by default with caution +
companion both visible. `verse.ts` owns the disclosure now (dead `tafsirEl`/`lazyTafsirEl`
removed); 162/162 web tests (6 new in `verse.test.ts`), typecheck clean.

## Changelog

**2026-07-13 — The divergence metric cannot be a caution.**

- **conjectured:** That a mechanical divergence score (Jaccard token overlap < 20% between the
  interpretive primary and the literal companion) could stand in for human review — flagging
  divergent verses in-app with a caution banner, so all 6,236 renderings could ship before Erik
  reviews the 16 divergent verses. This was recorded as ISC-51..53 at THINK.
- **refuted by:** Measurement across the full corpus at BUILD. Median overlap is **29%**, so
  "<20%" is not an anomaly — it is the lower half of a normal distribution, and it flags **1,224
  verses (19.6%)**. Worse, the metric cannot distinguish the product's best moment from its worst:
  **2:156** — the Tafsiriyah's greatest win, where Kemenag leaves the Arabic untranslated at the
  verse recited over the dead — scores **11%** overlap. **94:5** — its worst failure, a promise
  flattened into a weather report — scores **7%**. A banner driven by this metric would warn the
  reader away from the verse that proves the thesis.
- **learned:** Low overlap measures **interpretive expansion, not disagreement**. It is simply what
  an interpretive rendering looks like beside a literal one. The safeguard against unreviewed
  divergence was already structural and already enforced: the `literal_companion` invariant
  guarantees the reader sees BOTH renderings on EVERY verse. **Plurality is the mitigation; a banner
  is not.** A caution earns its force by being rare and human-ruled — spreading it across a fifth of
  the corpus would destroy the one that matters.
- **criterion now:** Divergence is computed at build time and ranked into `data/review/divergence.json`
  as Erik's review queue — it is **never** shipped to the browser as a reader-facing flag (ISC-52,
  ISC-52.1). The caution UI fires only from the human-curated list, 94:5 and 94:6 today (ISC-53).
  ISC-55 is promoted from a supporting check to **the** structural safeguard.

**2026-07-13 — Erik's ruling: Tafsiriyah stays primary; attribution risk accepted.**
Surfaced at the commitment boundary (advisor call, VERIFY). Sharding scales the interpretive primary
from 55 human-vetted verses to all 6,236. Extrapolating the observed defect rate in the vetted sample
(94:5 and 94:6 out of 55 = ~3.6%, on the verses that receive the MOST translator scrutiny) implies
roughly **200 verses with 94:5-class defects shipping unreviewed as the primary voice**. The advisor
recommended flipping to Kemenag-literal-primary until reviewed.

**Erik ruled: ship Tafsiriyah-primary. The thesis stands.** Rationale: flipping would gut PRODUCT.md's
core purpose — at 2:156, the verse recited over the dead, Kemenag leaves the Arabic untranslated, and
leading with it returns the grieving reader to the exact wall the product exists to remove. The
structural safeguard (`literal_companion` — Kemenag visible on every verse, always) is accepted as
sufficient mitigation.

**Erik also ruled: ship with the current attribution.** The "Ustadz Muhammad Thalib" attribution is
inherited from an API with no translator field, not verified against a published edition. This remains
an open item (PROGRESS.md), and sharding raises its stakes from 55 to 6,236 renderings carrying his
name. Accepted knowingly, not overlooked.

Both are recorded here so the decision has a name on it rather than riding in as a silent side effect
of a P0 sharding fix.

**2026-07-14 — Engagement research adopted; Phase 2 filed, not merged into this ISA's Criteria.**
Ran `/Research` (Standard mode, 4 cross-checked agents) against `PRODUCT.md`/`DESIGN.md`/
`PROGRESS.md` on what would make Nur more compelling without violating its own doctrine. Headline
finding: streak/badge/guilt mechanics are evidence-linked to compulsive use (arXiv:2203.16175) and
this product already rejects them (§ Principles, "Silence over fabrication") — confirmation, not
new information. The substantive finding is that the research independently re-derived the same
priority order already sitting in `PROGRESS.md`'s "Next, in order" list (min-score threshold,
thread persistence, terjemah makna/harfiah explainer, crisis-path detection), which is a stronger
signal than either source alone, plus three genuinely new items (recitation audio, tafsir lens
toggle, concept cross-linking) that extend rather than fight the existing shard architecture.
Filed as `.scratch/nur-phase2-trust-and-depth/PRD.md` with 8 issues, not merged into this ISA's
`## Criteria` — this ISA's `task`/`phase`/`progress` frontmatter describes the now-*complete*
Phase 1 cycle (59/59), and per the ID-stability rule, a new build cycle gets its own ISCs when
work actually starts on it (`Skill(ISA, "scaffold" or "append")`), not hand-appended speculatively
ahead of triage. Two items (crisis-path resource, recitation audio source/hosting) are blocked on
Erik's ruling, same pattern as the attribution-risk decision above.

**2026-07-14 (later) — Phase 2 issues 01–03 shipped without opening a new ISC cycle.** Three
`ready-for-agent` issues from the PRD above (min-score threshold, thread persistence, the
two-translation explainer) were small and independent enough to implement directly rather than
formally scaffolding a Phase 2 ISA cycle first — see `PROGRESS.md`'s matching checkpoint for the
full change list and verification detail (including what could and couldn't be verified in this
worktree, since `data/` was never ingested here). Recorded here, not as new ISCs, because these
were bug-fix-scale changes against already-locked principles, not new ideal-state articulation —
`ISA.md` § Constraints and § Principles were the test, and nothing here required relaxing them.

**2026-07-14 (latest) — Phase 2 issues 04 and 05 shipped; 05 deviated from its own hosting
ruling for a Principles-driven reason.** Erik ruled: crisis resource = Kemenkes SEJIWA/119 ext.8,
shown alongside not instead; reciter = Alafasy. 04 shipped as scoped. 05's ruling said
"self-host, shard-style, PER-SURAH" — but measuring a real per-surah source put Al-Baqarah at 115
MB as one file, which the reader's-bandwidth principle above rules out on its own terms. Switched
to per-ayah instead, self-hosted, same principle, correctly sized — a deviation made FOR the
ruling's own underlying reason once new information (the actual file size) surfaced, not a
unilateral override. Shipped as a 22-ayah MVP sample (Al-Fatiha, Al-Ikhlas, Al-Falaq, An-Nas),
not the full 6,236-ayah corpus — that scale of ingest is a separate future run. Neither issue
opened a new ISC cycle, same rationale as the entry above. Full detail in the matching
`PROGRESS.md` checkpoint and `.scratch/nur-phase2-trust-and-depth/issues/04-*.md` / `05-*.md`,
including a real optimistic-UI bug caught and fixed in 05's playback toggle, and a disclosed
verification gap (Interceptor cannot satisfy Chrome's autoplay gesture policy, so audible
playback itself wasn't confirmable through this tooling — recommend a real-device spot-check).

**2026-07-15 — Issue 07 resolved as a spike before a build, revealing the "graph" premise was
wrong.** Issue 07 assumed Nur "already has the attributed-graph foundation" from `docs/design/
quran-graphrag.html`. It doesn't — that spec's real knowledge graph (LLM triple-extraction,
entity linking, scholar-reviewed predicate schema) was never built; `src/ingest/` has zero
concept extraction. What's real is smaller: 55 curated verses tagged with 12 emotional themes
(`src/review/problem-verses.ts`), already powering chat retrieval. Building the actual graph
means introducing an LLM into `bun run ingest`, which has been **deliberately zero-LLM and
deterministic since Phase 1** — that is a standing-invariant decision, squarely Erik's to make,
not implied by "the spec already exists." Erik ruled Path A: surface the existing lexicon as a
browsable index (`#/tema`), cheaply, now — explicitly not the full graph, which remains open and
unbuilt. No new ISC cycle opened, same rationale as the two entries above. Full detail in the
matching `PROGRESS.md` checkpoint and `.scratch/nur-phase2-trust-and-depth/issues/
07-concept-cross-linking.md`.

**2026-07-15 (later) — Erik asked for Path B; found it conflicts with a locked Constraint; split
it; shipped the half that doesn't.** `docs/design/quran-graphrag.html`'s full architecture
bundles a build-time knowledge graph WITH a live serving stack whose generation layer is a
**generative LLM answering in real time** — direct contradiction of this ISA's own § Constraints
("No generative model in the retrieval path. Nur never answers in a scholar's voice. Do not
weaken."), and it assumes a live backend server this 100%-static product has never had. Surfaced
this before writing any code. Erik confirmed: build-time graph only, the live/generative half
stays rejected.

The 16-predicate schema itself splits by cost: `PART_OF`/`TRANSLATES`/`PRECEDES` are pure
relabeling of structure the ref-oracle/shard architecture already expresses (built nothing for
these — no reader-facing gain). `EXPLAINS`/`AUTHORED_BY` are zero-LLM but genuinely new (tafsir
browsable across the full corpus, not just the 55 curated verses) — shipped as **Path B1**.
`MENTIONS`/`ABOUT_TOPIC`/`THEMATICALLY_LINKED_TO`/`NARRATIVE_OF`/`SUBTOPIC_OF` need a real LLM —
**Path B2**, filed open (issue 09b), not built: this repo has zero LLM API integration, and
extraction scope/access-model/review-workflow are real decisions, not implementation details.

B1 required `bun run ingest`, never run in this worktree before — asked before running it (disk
had been fluctuating 2.4–15 GB free all session), Erik approved, ran clean (24/24 gates, 230 MB).
Also measured before designing storage: a per-surah tafsir bundle can be 9.3 MB (surah 7) — the
SAME reader's-bandwidth lesson from Path B1's audio session, re-confirmed independently rather
than assumed to still hold. Per-ayah shards instead (worst case 118 KB), gitignored like
`corpus.json` (105 MB, regenerable via `bun run app:graph`), lazy-fetched on first `<details>`
open — never eagerly for a whole surah. Verified live: 18:10 (never in the curated 55, the
product's original P0 flagship verse) now shows real, lens-aware, attributed tafsir. Full detail
in the matching `PROGRESS.md` checkpoint and `.scratch/nur-phase2-trust-and-depth/issues/
09-knowledge-graph-b1-structural.md`.

**2026-07-15 (latest) — Issue 08 shipped (visual share cards); Forge blocked on a real quota
wall, deviation disclosed rather than silently absorbed.** A canvas-rendered PNG verse card,
additive to the existing text share, never a replacement — same rationale as every prior Phase 2
issue, no new ISC cycle opened. The egress contract (`literal_companion` on egress, established
shipping `share.ts` in Phase 1) is enforced *harder* here than in text: `renderVerseCardImage`
refuses to produce any image at all without the literal companion, and — per this issue's own
filed constraint that images need more care than text, not less — the FLAGGED caution (94:5/94:6)
renders on the image even though today's plain-text share doesn't carry it. Card height is
computed from actual wrapped content rather than a fixed aspect ratio, so the longest verse in
the Qur'an (2:282) renders complete and uncropped instead of being clipped — the same
"scripture does not degrade gracefully" principle from the reading surface's chunk loader,
re-applied to a new surface rather than re-derived from scratch.

Per the Algorithm's E3 auto-include binding, Forge (GPT-5.4/5.5 via `codex exec`) should have
authored this module. Spawned with a fully-specified prompt; it returned honestly **blocked** —
the account's Codex quota is exhausted until 2026-07-20 — rather than silently writing the code
under a different model and passing it off as a Forge deliverable, which its own role explicitly
forbids. Waiting five days on a P3 issue was disproportionate, so I wrote the module myself
against the identical spec. Recorded here as a disclosed deviation from the delegation binding,
not a silent skip — the doctrine's own soft-floor relaxation rule applies directly to an
external-service outage, not just to a judgment call about task shape.

Verified live via Interceptor across three real cases (shortest ayahs, the longest ayah in the
Qur'an, and a flagged/cautioned ayah, both themes) — full detail in the matching `PROGRESS.md`
checkpoint.

**2026-07-15 (even later) — `/impeccable` polish pass; confirmed intent before touching a
carefully-argued design system.** Erik asked for the UI to feel "fresh, friendly, but still
aesthetic." `DESIGN.md` explicitly names and rejects the wellness-app pivot as equally wrong as
the gold-arabesque cliché — exactly the drift "friendly" requests tend toward — so this was
checked with Erik before any edit, and confirmed as polish-within-identity, not a register
change. Two real, verified fixes came out of it, both recorded in the matching `PROGRESS.md`
checkpoint: (1) every CSS entrance animation used `animation: ... both`, a named anti-pattern
(impeccable's own motion guidance: "reveal animations must enhance an already-visible default")
that can leave content permanently invisible if the animation never starts (backgrounded tab at
load) — changed to `forwards` everywhere it appears, zero visual change in the working case; (2)
the `⚠` caution icon renders as a full-color emoji on most platforms, silently ignoring
`color: var(--caution)` — replaced with an SVG using `stroke="currentColor"`, verified to
correctly track the token in both themes (computed `stroke` differs by theme now; the emoji
never did). Also unified the verse-card action icons (copy/share/Kartu/play) to SVG matching the
header's existing icon language, closing a "feels slightly off" gap the Product register's own
slop test names directly. No new ISC cycle opened — same rationale as every Phase 2 entry above,
scoped markup/CSS work against already-locked Principles/Constraints, not new ideal-state
articulation.

**2026-07-15 (Cycle 2) — a "distinguishable composing state" is not distinguishable if it never paints.**

- **conjectured:** That adding a `.composing` "Nur sedang menyusun jawaban…" element ahead of the
  skeleton would satisfy ISC-90 — a felt beat before the answer, matching what a chat product is
  expected to do.
- **refuted by:** Live verification via Interceptor. Clicking a seed and immediately inspecting
  the DOM showed the answer already fully rendered — the `.composing` element was gone. Nur's
  retrieval (`retrieve(corpus, q)`) is a synchronous, local, in-memory lookup with no `await` on
  the semantic-match path; the skeleton mounts and gets replaced in the same synchronous tick,
  before the browser ever gets a frame to paint it. The one code path that DOES have a real async
  gap (`await loadAyah` for a direct verse reference) would have shown it fine — the majority
  path, a themed/semantic question, would not have.
- **learned:** A loading-state UI requirement is not met by the element merely existing in the
  DOM for zero milliseconds. For sub-frame-time operations, "distinguishable" requires an
  explicit minimum-visible-duration floor, not just correct markup — otherwise the fastest,
  most common case (the one this product is proudest of — instant, no hallucination, no
  round-trip) is exactly the case where the intended UX doesn't happen.
- **criterion now:** ISC-90 revised in place (not renumbered) to require a real floor. Implemented
  as `MIN_COMPOSING_MS = 260` in `web/src/main.ts`'s `ask()` — delays the DOM swap, never the
  computation itself, and is skipped entirely when a genuinely slow path (a shard fetch) already
  exceeds the floor on its own. Re-verified: the composing element is now present in the DOM
  immediately after click, every time.

## Verification

All probes run against the live app in real Chrome (Interceptor), not inspection.

**Cycle 2 — mobile ergonomics + chat composing state**
- ISC-84/65: static — `.icon-btn` was `width:36px;height:36px` (`styles.css:172`, pre-change),
  `.size button` was `30×30px` (`:435`), `.seed` computed ~33px tall (`:224`). Post-change: live
  `getComputedStyle` on the running app returned `{"icon":"44px","size":"44px"}`.
- ISC-86: static — `.top` now has `padding: max(1rem, env(safe-area-inset-top)) 0 0.85rem`,
  matching `.composer`'s existing `env(safe-area-inset-bottom)` pattern.
- ISC-87: implemented (`visualViewport` resize/scroll listener repositioning `#composer-bar`).
  `[DEFERRED-VERIFY — ISC-98]`: Interceptor cannot open a real iOS on-screen keyboard in this
  environment; needs a physical-device spot-check, same disclosed gap as Phase 2 issue 05's audio.
- ISC-88/69: static — new breakpoints at `23.4375rem` (compact) and `min-width: 48rem` (tablet+)
  added alongside the existing `30rem` tier; `.app` max-width unchanged at `46rem`, only gutters
  widen ≥768px.
- ISC-90: live — see Changelog entry above. Composing element present in DOM immediately on
  click after the `MIN_COMPOSING_MS` fix; absent before the fix (caught, then corrected, in this
  same session).
- ISC-91/72: live — the "Tampilan" trigger and its panel (`Mode` row with the theme toggle,
  `Ukuran Arab` row with the three size buttons) render correctly when forced open via a CSS
  override at desktop width — labels, icon-btn, and size group all present, no overlap. The
  inline (≥768px) layout was confirmed live at the real window width without any override: theme
  + size render inline in the header exactly as before, trigger hidden.
  `[DEFERRED-VERIFY — ISC-99]`: the actual `47.9rem`/`26rem` media-query *thresholds* were not
  exercised at a real narrow window — this environment's Interceptor build has no viewport-resize
  or CDP device-emulation command, and `interceptor macos windows` returns empty (no window
  handle available to resize via the bridge either). What's verified is that the CSS the
  breakpoint switches to is correct; not that the switch fires at the intended width.
- ISC-93: static — no new color token added; panel reuses `--surface`, `--line`, `--shadow-pop`,
  `--r-lg`, `--step--1`, `--ink-3` verbatim.
- ISC-94: `bun run verify` — 24/24 gates pass, unchanged from before this cycle. No file under
  `src/ingest/` touched (confirmed via `git status --short`: only `ISA.md`, `web/index.html`,
  `web/src/main.ts`, `web/src/styles.css`).
- Regression: `bun run typecheck` clean (root + web). `bun test` 148 root + 78 web = 226/226,
  0 fail — unchanged from the pre-cycle baseline in `PROGRESS.md`.

**P0-a — a real ayah is never denied**
- ISC-14: live — asked `18:10`; Nur returned "Ini Al-Kahf 18:10" with Arabic, both renderings, both translators named. Before: *"Tidak ada ayat yang cocok."* (evidence: `.impeccable/evidence/p0-denies-18-10-BEFORE.png`)
- ISC-15: live — `18:999` → "Surah Al-Kahf cuma punya 110 ayat, jadi ayat 999 tidak ada. Mau buka surahnya?"
- ISC-16: live — `115:1` → "Surah 115 tidak ada. Al-Qur'an punya 114 surah."
- ISC-44: live — Al-Kahf rendered in full **with `corpus.json` returning 404**. The inlined index means a network failure cannot take the Qur'an away.
- ISC-45/46: `bun test` — 11 name forms resolve (al kahfi / Al-Kahf / kahfi / yasin / ar-rahman / annas…); `surat 18 ayat 10` required accepting Indonesian "surat", not just "surah".

**P0-b — the reading surface**
- ISC-21/22: live — `#/baca` lists 114 surahs; `#/surah/18` renders Al-Kahf continuously, 110 ayahs.
- ISC-59: live — Al-Baqarah renders **286/286** ayahs, 0 active blur filters.

**P0-c — network honesty**
- ISC-28/29/30: live — removed `corpus.json` from disk → visible Indonesian error + "Coba lagi" (role=alert). Clicking retry restored full function with no reload. Reading kept working throughout.

**Basmalah (ISC-47/48) — theologically load-bearing**
- Surah 18: unnumbered header + 18:1 correctly begins `ٱلْحَمْدُ لِلَّهِ` (not the basmalah). Surah 9: no basmalah. Surah 1: no header, basmalah IS ayah 1, 7 ayahs. 1/9/18/36/114 all complete.

**Egress (ISC-56/57/58)**
- Live `shareText(94:5)` emits both renderings, the interpretive one labelled *Terjemah makna* with its translator, and Kemenag's literal beneath it. The known-defective 94:5 rendering **cannot leave Nur unaccompanied**.
- ISC-54: the 94:5 caution renders in the reading surface, not only chat.

**Regression (ISC-39..42)**
- `bun test` 117 pass / 0 fail (was 63). `bun run typecheck` clean across root **and** web. `bun run verify` 24/24 gates — `literal_companion` and `primary_voice` intact, not weakened.
