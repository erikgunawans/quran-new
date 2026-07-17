---
project: New-Quranku
task: "Cycle 5 — the generative companion (ISC-190..203): wrap retrieve() with a rung-1 pastoral model behind an egress wall (point, never author); resolves the ISC-80..97 deferral. Wall built + verified; the wrap/understander/model-wiring pending (prior: Cycle 4 cosmos ISCs, complete; Cycle 3 Peta Tematik, complete; Cycle 2 UI redesign, complete)"
effort: E3
phase: execute
progress: 199/204
mode: build
started: 2026-07-13
updated: 2026-07-17
---

# New-Quranku — Ideal State Artifact

> **New-Quranku** — a chat-first Qur'an reading app for Indonesian Muslims, over a
> deterministic, gated, attributed corpus. This file is the system of record.
> *(Renamed from "Nur" on 2026-07-16; the نور/light identity was retired — see Decisions.)*

## Problem

The official Indonesian translation is *harfiyah* — literal. It renders words, not meaning.
At 2:156, the verse recited at every Muslim death, Kemenag leaves the Arabic **untranslated**:
a grieving person reads *"Inna lillaahi wa innaa ilaihi raaji'uun"* and understands nothing.
The person concludes the fault is theirs. It isn't.

New-Quranku was built to fix that, and the corpus half is done and gated — 114 surahs, 6,236 ayahs,
24 integrity gates, sha256-pinned sources. But the app half scored **20/40** in critique, and
the failures are not cosmetic:

1. **It tells users a real verse does not exist.** Only 55 of 6,236 verses ship to the browser.
   Ask for `18:10` — a real ayah in Al-Kahf — and New-Quranku says *"Aku belum menemukan ayat yang
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
sync, or any server-side session (reaffirmed 2026-07-17 — "Masuk" was proposed and deferred to
its own session; the app stays local-only until Erik decides what an account is FOR); a native mobile app; fatwa, ruling, or arbitration between
scholars; any Arabic-language UI surface; search over tafsir full-text (the 113 MB tafsir corpus
stays server-side and is not shipped to the browser); the per-verse override table pending
Erik's review of the 16 divergent verses.

## Principles

- **Silence over fabrication.** Where the corpus is silent, New-Quranku is silent — and says so plainly.
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
- **No generative model in the retrieval path.** New-Quranku never answers in a scholar's voice.
- **Sources are sha256-pinned** (`src/ingest/sources.lock.json`); checksum drift hard-fails.
- The 113 MB tafsir corpus never reaches a phone. Only Arabic + the two translations ship.
- **Disk is tight.** `data/` (~230 MB) is gitignored and regenerable via `bun run ingest`.

## Goal

New-Quranku can be *read*, not just queried: every one of the 6,236 ayahs is reachable by reference and
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
- [x] ISC-38: Antecedent: the copied text is attributed — a verse leaving New-Quranku still names who translated it

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
- [x] ISC-90: The proposal specifies a "New-Quranku is composing" state distinguishable from the current instant skeleton-to-answer swap, without violating the "no typewriter gimmick" motion doctrine — implemented, and a real bug caught in verification (see Decisions) required a follow-up fix
- [x] ISC-91: The proposal restructures the header's icon-button cluster for thumb-reach on mobile without removing any existing function (theme toggle, size control, info popover, nav) — implemented as a "Tampilan" overflow group below 768px, inline above it
- [x] ISC-92: The proposal specifies a mobile treatment for the info popover (current anchored popover risks edge-clipping on narrow viewports) — implemented (bottom-sheet anchor below 26rem, shared with the new display panel)
- [x] ISC-93: Anti: the proposal introduces no new color token, no gold, no wellness-app register shift — checked against `DESIGN.md`'s "What this is not" list; only existing tokens (`--surface`, `--line`, `--shadow-pop`, `--r-lg`) reused
- [x] ISC-94: Anti: the proposal does not touch `src/ingest/` or any retrieval-path code — this cycle is UI-surface only pending the generative-capability ruling; `bun run verify` 24/24 confirms
- [x] ISC-95: The proposal is engine-agnostic — the same layout renders under whichever of the three generative-capability options Erik eventually picks
- [x] ISC-96: Every proposed change maps to a token or component already defined in `styles.css`/`read.css`, or names the new token/component explicitly
- [x] ISC-97: Antecedent: Erik can read the proposal and make the generative-capability ruling without needing to ask a clarifying question back — confirmed: both `AskUserQuestion` items answered on the first pass, no round-trip needed
- [ ] ISC-98: [NEW] Real device / real-iOS spot-check of the `visualViewport` composer mitigation (ISC-87's deferred half) — not yet run
- [ ] ISC-99: [NEW] A genuine narrow-viewport (≤375px) live probe of the mobile header/panel/breakpoints — Interceptor in this environment has no viewport-resize or CDP device-emulation capability and no OS window-resize permission; verified instead via forced CSS override + computed-style checks at desktop width, which confirms the panel/positioning rules render correctly but not that the `47.9rem`/`26rem` triggers fire at real narrow widths (the media-query thresholds themselves were read from source, not exercised live)

### Last-read bookmark — "Lanjutkan baca" (opened 2026-07-15, P2 from the $impeccable critique)

*The deep-link routing fix (`4aea757`) is the enabler: `#/surah/N#A` already lands on the exact ayah. `thread.ts:40` already named the design — "the answer to it is a bookmark, an explicit chosen act, not a chat log that quietly refuses to end."*

- [x] ISC-100: `web/src/bookmark.ts` exists and exports `saveBookmark`, `loadBookmark`, `clearBookmark` — verified by Read + 21 green tests
- [x] ISC-101: A stored bookmark contains only `{surah, ayah, at}` — test asserts the raw JSON matches `^\{"v":1,"surah":18,"ayah":10,"at":\d+\}$`, no `<`, no Arabic
- [x] ISC-102: `loadBookmark()` returns `null` for corrupt JSON and never throws — test "corrupt JSON yields null, not a throw" passes
- [x] ISC-103: `loadBookmark()`/`saveBookmark()`/`clearBookmark()` swallow a throwing localStorage — three storage-throw tests (get/set/remove) pass
- [x] ISC-104: `loadBookmark()` rejects an out-of-bounds surah (surah 0, 115) → `null` on both save and load — tests pass
- [x] ISC-105: `loadBookmark()` rejects an ayah outside the surah's real count (18:111, Al-Kahf has 110) via `surahMeta().ayahs` → `null` — tests pass
- [x] ISC-106: The bookmark persists under key `nur:baca` — test asserts the key
- [x] ISC-107: Anti: saving a bookmark leaves a pre-set `nur:thread` byte-identical — test "nur:thread stays untouched" passes
- [x] ISC-108: NO TTL — test "a bookmark from 30 days ago still loads" passes (aged `at`, still returned)
- [x] ISC-109: `saveBookmark` debounced/coalesced — test "rapid saves coalesce to the latest position" passes (2:1 then 2:255 → 2:255)
- [DEFERRED-VERIFY] ISC-110: scrolling updates the persisted position via IntersectionObserver — CODE verified (grep-confirmed wiring, min-over-persistent-`Set` the advisor validated, per-chunk `observe()`); LIVE firing could NOT be probed because the Chrome window is minimized → `document.visibilityState === "hidden"` → the browser suspends the rendering lifecycle so IO callbacks do not fire (confirmed live: `hidden=true`, `scrollY=0`, `nur:baca=null` after landing; same environment limit as ISC-98/99 and last session's rAF-while-minimized issue). FOLLOW-UP: Erik scrolls a surah in a NON-minimized window and confirms `localStorage["nur:baca"]` advances.
- [DEFERRED-VERIFY] ISC-111: opening `#/surah/N#A` records `N:A` — the LANDING half verified live (deep-link `#/surah/18#10` renders Al-Kahf, `.verse[data-ref="18:10"]` present, `.landed` fires); the RECORD half shares ISC-110's hidden-document deferral (same FOLLOW-UP)
- [x] ISC-112: Anti: `saveBookmark` is called from exactly ONE site — `read.ts:111`, the `renderSurah` observer callback; grep confirms it appears in no other module (not `main.ts`, not `themes.ts`)
- [x] ISC-113: Leaving a surah disconnects the observer AND cancels the pending debounced write — `stopTracking()` (calls `disconnect()` + `cancelBookmark()`) fires at `renderSurah` entry, `renderIndex` entry, and inside `startTracking`; grep-confirmed
- [x] ISC-114: With a bookmark set, `renderIndex` shows a "Lanjutkan baca" entry linking to `#/surah/{surah}#{ayah}` — LIVE: `.resume` exists, `href="#/surah/18#10"`
- [x] ISC-115: The resume entry names the surah in Indonesian — LIVE: text = "Lanjutkan baca Al-Kahfi · ayat 10 →", not a raw ref
- [x] ISC-116: No bookmark → no resume entry — LIVE: after clearing `nur:baca` and a fresh `renderIndex`, `.resume` is absent and all 114 rows render
- [x] ISC-117: Clicking the resume entry lands on the exact ayah — LIVE: `.resume.click()` → `hash=#/surah/18#10`, read surface shown, `.verse[data-ref="18:10"]` present, surah = Al-Kahfi, `.landed` fired
- [x] ISC-118: Anti: a crisis exchange never creates a bookmark — structural: the crisis branch in `main.ts ask()` returns before any navigation, and `saveBookmark` exists only on the reading surface (ISC-112); no code path connects them
- [x] ISC-119: Anti: no scripture is ever written to `nur:baca` — test asserts the raw JSON contains no `<` and no Arabic (`/[؀-ۿ]/`)
- [x] ISC-120: `web/src/bookmark.test.ts` covers save/load/clear/cancel, bounds, corrupt JSON, no-TTL, key isolation, storage-throw paths — 21 pass, 0 fail
- [x] ISC-121: `bun test web/src` green — 185 pass, 0 fail (was 164; +21 bookmark tests)
- [x] ISC-122: `bun run typecheck` clean — `tsc --noEmit` root + `web/tsconfig.json`, exit 0
- [x] ISC-123: Live probe (surface + routing) — seeded a valid bookmark, drove real Chrome: resume card renders, names Al-Kahfi · ayat 10, click routes to `#/surah/18#10` and lands on the verse; the scroll→observer→write half shares the ISC-110/111 hidden-document deferral

### Cycle 3 — Peta Tematik (ISC-124..162)

> Unblocked 2026-07-17: Ustadz Ahmad Isrofiel answered **F-1 = yes** (permission to display the
> Indeks Tematik), **F-2 = no preference** (our proposed attribution stands), **F-4 = no exclusions**
> (all 2,451 entries). F-3 was closed earlier by Erik's ruling that family consent suffices.
> The index is authored by **Ustadz Muhammad Thalib's** team — we display it, we never rewrite it.

**Generator + data**

- [x] ISC-124: `src/app/build-peta.ts` exists and `bun run app:peta` is wired in `package.json` scripts
- [x] ISC-125: The generator's ONLY input is `docs/reference/indeks-tematik/indeks-tematik.json` — no hand-copied entry text anywhere in `src/` or `web/src/`
- [x] ISC-126: `web/public/peta/index.json` emitted — 13 categories, each with `slug`, `category`, `entries`, `subtopics`
- [x] ISC-127: 13 per-category shards emitted at `web/public/peta/<slug>.json`
- [x] ISC-128: `index.json` ≤ 4 KB — the landing route must not pay for the whole index
- [x] ISC-129: Largest per-category shard ≤ 120 KB
- [x] ISC-130: Entries across all shards = **2451**, re-derived from source at test time, never asserted from memory
- [x] ISC-131: Citations across all shards = **2633** (ranges expanded + 87 secondary refs from the 75 multi-ref entries)
- [x] ISC-132: Distinct verses across all shards = **1632**
- [x] ISC-133: Bridge verses (appearing in >1 category) = **518**; top hubs 2:185 and 33:33 at 6 categories each
- [x] ISC-134: The 5 null-named subtopics render entries directly under their category — the string "null" never reaches a shard or the DOM
- [x] ISC-135: The generator refuses to write a truncated shard set (<13 categories or <2451 entries), same guard as `build-design-doc.ts`
- [x] ISC-136: Anti: no entry's `text` differs from the source bundle — every shipped sentence is byte-identical to Thalib's team's wording
- [x] ISC-137: Anti: no entry exists in a shard that is absent from the source — nothing is authored in his name

**UI**

- [x] ISC-138: `web/src/peta.ts` exists
- [x] ISC-139: Route `#/peta` renders 13 category cards
- [x] ISC-140: Route `#/peta/<slug>` renders that category's subtopics and entries
- [x] ISC-141: Each entry links to `#/surah/<n>#<a>` — the existing reading surface, not a new verse renderer
- [x] ISC-142: Renders into the shared `#read` container and registers cards via `registerReadCard()` — read.ts's copy/share handler covers this surface, no fourth click listener
- [x] ISC-143: Anti: `peta.ts` imports `esc` from `verse.ts` — it does NOT re-implement it (that bug already exists 3× in this repo)
- [x] ISC-144: Category shards load lazily — `#/peta` fetches `index.json` only, never a category shard
- [x] ISC-145: `ShardError` is handled on a failed category fetch — reader sees a message, not a blank pane
- [x] ISC-146: Anti: `peta.ts` uses `announce()` — no private `say()` (the exact race announce.ts exists to fix)

**Attribution (F-2)**

- [x] ISC-147: "Indeks Tematik oleh Ustadz Muhammad Thalib" renders on `#/peta`
- [x] ISC-148: The same attribution renders on all 13 `#/peta/<slug>` pages
- [x] ISC-149: A link to `quran.tarjamahtafsiriyah.com` is present on every Peta page
- [x] ISC-150: Antecedent: attribution sits in the reading flow at body text size — not `visually-hidden`, not `font-size` below the body scale. Attribution is design, not fine print (PRODUCT.md principle #3)
- [x] ISC-151: Anti: no Peta route renders without attribution — test iterates all 14 routes

**Bridges — the differentiator**

- [x] ISC-152: An entry whose verse appears in >1 category shows "Ayat ini muncul di N tema"
- [x] ISC-153: N is derived from the emitted data at build time — never a hardcoded number
- [x] ISC-154: The bridge chip links to the other categories containing that verse

**Coexistence (Erik's ruling: beside `/tema`, not replacing it)**

- [x] ISC-155: Anti: `#/tema` still routes and renders — the 12-theme browser is untouched
- [x] ISC-156: Anti: `src/review/problem-verses.ts` and `theme-index.ts` are byte-unchanged — the retrieval scoring path cannot regress
- [x] ISC-157: Anti: no LLM anywhere in the peta pipeline — the zero-LLM-ingest constraint holds
- [x] ISC-158: Anti: `literal_companion` is not weakened — Peta shows entry sentences and links out; it never renders an interpretive primary alone

**Build + regression**

- [x] ISC-159: `web/src/peta.test.ts` exists and passes
- [x] ISC-160: `bun test` green — ≥386 prior tests still pass, 0 fail
- [x] ISC-161: `bun run typecheck` clean, exit 0
- [x] ISC-162: Live probe — real Chrome at `#/peta` and one category route, screenshot read, light tokens inherited (Anti: no dark cosmos, no gold)

**Unresolvable references (THINK-phase discovery, 2026-07-17)**

> Four entries in the published source cite ayahs that do not exist: `8:96` and `8:77` (Al-Anfal has
> 75), `48:59` (Al-Fath has 29), `11:161` (Hud has 123). Verified against the raw `.md`/`.csv` — our
> parser is byte-faithful; the typos are the source's. F-1 gave permission to *display* the index. It
> did not give permission to *correct* it, and no count-based test detects this.
> Doctrine applied: **don't link, don't delete, don't guess, name it, ask him.**

- [x] ISC-163: The generator detects unresolvable refs at BUILD time by checking every citation against `web/public/surah/*.json` — a reader never discovers one
- [x] ISC-164: Each entry carries a `resolvable: boolean`; the 4 known-bad refs emit `resolvable: false` rather than failing the build
- [x] ISC-165: An unresolvable entry still renders its text — Thalib's sentence is displayed, never deleted for our convenience
- [x] ISC-166: An unresolvable entry names the gap in Indonesian (e.g. "rujukan ini tidak kami temukan dalam mushaf — sedang kami tanyakan") — named non-coverage, not silence
- [x] ISC-167: Anti: an unresolvable ref never renders as a clickable link into a dead shard
- [x] ISC-168: Anti: no ayah number is ever substituted or "corrected" — `8:96` never becomes `8:66`; the diff between shard refs and source refs is empty
- [x] ISC-169: The generator asserts EXACTLY 4 unresolvable refs — if the source changes and a 5th appears, the build fails loudly rather than absorbing it
- [x] ISC-170: Section F-5 added to `SCHOLAR-REVIEW-PACKAGE.id.md` asking Ustadz Ahmad about the 4 typos, naming each one, proposing no correction

### Cycle 4 — the 3D cosmos: baked layout, zero physics shipped (2026-07-17, added 2026-07-17 resume)

> The map surface (`peta.ts`, index + category routes + attribution) is covered by Cycle 3
> (ISC-140..162). What shipped WITHOUT its own ISCs is the **3D cosmos**: the build-time layout
> baker `src/app/build-peta-3d.ts` and the render-only client `web/src/peta-cosmos.ts`. The chord
> diagram (`1dd8f3c`) was removed at `0debe3a` and is intentionally NOT tracked here. Cycle 4 makes
> the shipped cosmos mechanical. Every criterion below is a single tool probe.

**The layout baker (`src/app/build-peta-3d.ts`)**

- [x] ISC-171: `web/public/peta/cosmos.json` exists and is ≤ `SIZE_LIMIT_BYTES` (90 KB) — the builder refuses to write a larger file
- [x] ISC-172: the builder asserts the exact topology against the shards — 13 cats, 42 subtopics, 2,451 entries, 2,633 citations, 1,632 distinct verses, 518 bridges, 2,370 links — any drift throws at build, never ships
- [x] ISC-173: Anti: `d3-force-3d` is a `devDependencies` entry only; `package.dependencies` never contains it — `assertDependencyBoundary()` throws at build if the physics lib leaks into prod deps
- [x] ISC-174: the layout is deterministic — two builds (and two `computeCosmos` calls in one process) are byte-identical: a fixed-seed LCG replaces d3's internal random source and the links array is copied, not mutated
- [x] ISC-175: every verse node carries a non-empty `catIndexes` all in `[0,13)` and finite integer coords; the normalized cloud's extreme node sits at radius 1000 within the ±1 rounding budget
- [x] ISC-176: the cosmos build asserts EXACTLY the 4 unresolvable refs (`8:96`, `8:77`, `48:59`, `11:161`) via `assertSetEqual` — the picture cannot silently gain or lose one relative to the shards
- [x] ISC-177: Anti: verse positions are baked integers in `cosmos.json`, not recomputed — the render path runs no force, octree, or solver

**The render path (`web/src/peta-cosmos.ts`)**

- [x] ISC-178: Anti: the shipped render path imports zero physics — grep of `web/src/` for `d3-force`/`forceSimulation`/`forceManyBody` finds only a code comment, no import
- [x] ISC-179: the cosmos is opt-in — `loadCosmos()` fetches `/peta/cosmos.json` on a dedicated (cached, idempotent) path distinct from the index/category route load; the map renders without ever fetching it
- [x] ISC-180: `prefers-reduced-motion: reduce` stops BOTH auto-rotate and twinkle — the guard reads the media query and sets `auto = false`
- [x] ISC-181: Anti: no `createRadialGradient` allocation inside the per-star draw loop — one halo sprite per colour (14 total) is pre-rendered once and blitted via `drawImage`
- [x] ISC-182: a drag is not a click — `pick()` fires only when the pointer moved `< 5px`, so rotating the cosmos never opens a random verse
- [x] ISC-183: `destroy()` cancels the rAF handle AND removes every pointer/wheel/resize listener — navigating away stops the loop, no battery burn on a detached canvas
- [x] ISC-184: Anti: position scale and radius scale are separate — star radii are sized by `persp` (≈1px on screen), never by the world `scale` ×26 that produced the saturated white blob
- [x] ISC-185: Anti: 13 categorical hues with NO GOLD (hue 70–100 stays banned) — the cosmos is the one surface that leaves the emerald discipline, and it honors the gold gate
- [x] ISC-186: overprinting hub labels is resolved deterministically — nearest-first draw + greedy collision-skip drops the farther label (still in the legend), never overprints both
- [x] ISC-187: the legend is real DOM (`legendHtml`), selectable and screen-readable — not canvas text

**Build + regression + the one open probe**

- [x] ISC-188: `bun test` green across the peta suites (`peta-3d.test.ts`, `peta-shards.test.ts`, `web/src/peta.test.ts` — 46 pass, 0 fail) and `bun run typecheck` clean
- [DEFERRED-VERIFY] ISC-189: the cosmos holds 60fps on a real mid-range Android. UNVERIFIABLE here — rAF is suspended while Chrome is minimized (same blocker as ISC-110/111). The glow-sprite optimization is sound by inspection (ISC-181) but unproven on-device. **Follow-up: F-COSMOS-PERF — Erik profiles `#/peta` cosmos on a physical mid-range Android; mark `[x]` only with an on-device frame-rate reading.**

### Cycle 5 — the generative companion: point, never author (2026-07-17)

> The ISC-80..97 generative-capability decision, DEFERRED at Cycle 2 ("UI/UX only"), is now MADE.
> Ruling: the model **wraps** `retrieve()` — it understands messy input and writes the pastoral
> framing in the app's own voice, but retrieval stays the source of truth for WHICH verses and
> their text. The bright line is **point, never author**: the model may point at meaning
> ("para ulama membaca ayat ini tentang rahmat — kata-katanya ada di bawah"), never author it
> ("ayat ini artinya kamu harus sabar"). Enforced by an egress WALL, not a prompt — because
> band.ts shipped the wrong verse twice and the source itself misremembers 4 ayahs, so a model
> will too. On any violation the deterministic hand-written opener ships instead: degradation to
> honesty, silent to the reader.

**The egress wall (`web/src/compose-guard.ts`) — built + verified 2026-07-17**

- [x] ISC-190: `guardComposeProse(prose)` is a pure, synchronous function returning `{ ok, violations }`; `safeCompose(prose, fallback)` returns the model prose iff it clears the wall
- [x] ISC-191: Anti: model prose containing Arabic script is rejected (HARD wall) — scripture is rendered structurally from the corpus, never typed by the model
- [x] ISC-192: Anti: model prose containing any verse reference — digit (`94:5`) or spelled (`QS 94:5`, `surat 94 ayat 5`) — is rejected (HARD wall); retrieval owns which verses appear
- [x] ISC-193: Anti: authoring/ruling phrasings are rejected (heuristic layer) — "ayat ini artinya…", "Allah menyuruh kamu…", "menurut Islam…", "hukumnya wajib", "kamu harus sabar"
- [x] ISC-194: deictic pointing WITHOUT a number ("ayat di bawah", "ayat ini tentang rahmat") passes — the bright line holds, pointing is allowed, authoring is not
- [x] ISC-195: `safeCompose` returns the deterministic opener on ANY violation — the reader never sees an error, only a slightly less personal but honest sentence
- [x] ISC-196: every existing hand-written `compose()` opener passes its own wall — the fallback is shippable by construction
- [x] ISC-197: `compose-guard.test.ts` green (18 pass, 0 fail) and `bun run typecheck` clean

**The wrap (`compose-contract.ts`) — contract + prompt built + verified 2026-07-17; live model pending**

- [x] ISC-198: `composeFraming(hits, question, model, fallback)` receives the grounded `Hit[]` + question and returns ONLY framing prose; the model's `ComposeContext` carries exactly `{question, theme, themeCount}` — no verse text, no reference — so it cannot select verses or leak their text (test asserts the key set)
- [x] ISC-199: Anti: the retrieval path is byte-unchanged — `git diff HEAD -- web/src/retrieve.ts` is empty; the wrap is a new file, retrieval untouched
- [x] ISC-200: Anti: no generative code touches `src/ingest/` or the pinned corpus — `git diff HEAD -- src/ingest/` empty; all Cycle-5 code is `web/src/`
- [x] ISC-203: Antecedent: `composeFraming` returns `""` on empty hits BEFORE invoking the model — silence-over-fabrication; test "no hits → silence, model never invoked" confirms the model spy is never called
- [x] ISC-201: the live model routes through `guardComposeProse` and renders above the verses. VERIFIED LIVE 2026-07-18 (Interceptor, real Chrome, prod `new-quranku.axiara.ai`): asked "aku capek banget, utang numpuk, pengen nyerah" → `POST /api/compose` 200 `{"prose":"Capek banget, ya. Nggak apa-apa buat ngerasa ingin menyerah dulu."}`; DOM confirms that line renders ABOVE verse cards 2:214 + 2:280 (retrieval heard BOTH hardship and debt), with zero Arabic/refs in the framing (they appear only in the cards below). Degradation path proven separately: no-key returned `{prose:null}` → fallback; `compose-live.test.ts` covers null/404/error → canned opener. (Screenshot unavailable — Chrome window minimized; DOM + network log are the evidence.)
- [x] ISC-202.1: the input understander CONTRACT — `understandThemes(question, validThemes, model, keywordFallback)` classifies only into the closed corpus theme set (`guardThemes` drops invented/renamed categories exactly), falls back to keyword detection on any miss/error, returns `[]` on empty input, and generates no scripture (verified: `theme-understand.test.ts`, 20 tests)
- [x] ISC-202.2: the classifier is unioned into `retrieve()`, keyword hits keep precedence. VERIFIED LIVE 2026-07-18 (Interceptor, prod, rev nur-00006-zgb): asked the keyword-miss phrase "aku merasa makin jauh dari Tuhan" (verified against the LEXICON to match ZERO keywords → the old app would go SILENT) → `/api/classify` 200 `{"themes":["Forgiveness & despair"]}` → surfaced **39:53 (Az-Zumar, "jangan berputus asa dari rahmat Allah")** — the single most fitting ayah, from what was previously silence. Code: additive `modelThemes` param (keyword pass untouched, model-only theme reaches `MIN_SCORE`, honest `MODEL_THEME_MATCH` provenance); `theme-live.ts` → `/api/classify` (3s) → `understandThemes`; `main.ts` awaits on the question path only, degrades to `[]`. Tests: `retrieve-model-themes.test.ts`, `theme-live.test.ts`; full suite 492/0. (Note: the "~80%/~20%" compose rate first recorded here was later found to be OpenRouter rate-limiting of burst testing, not wall rejections — see ISC-206; under sparse traffic the live-framing rate is ~100%.)
- [x] ISC-204: the wired framing model is a real generation call and the `FRAMING_SYSTEM_PROMPT` + wall behave correctly on live output. VERIFIED 2026-07-18 — Worker deployed, `OPENROUTER_API_KEY` set, live `curl POST /api/compose` (DeepSeek V4 Flash) returned: *"Capek banget, ya, apalagi kalau semuanya terasa numpuk sendiri. Ayat-ayat di bawah ini sering dibaca orang yang lagi di titik serupa."* — warm natural Indonesian, points at the verses ("sering dibaca orang yang lagi di titik serupa"), zero Arabic/refs/authoring; passed the server-side wall (prose returned, not null).

**Optimizations (2026-07-18)**

- [x] ISC-205: the model classifier is skipped when the keyword lexicon already matched — `main.ts` gates the `/api/classify` call on `keywordThemeHits(q).size === 0`, so the common (keyword-hit) case pays zero model latency and the model is spent only on misses. Shared `keywordThemeHits()` extracted from `retrieve()` (behavior byte-identical). Verified: `retrieve-model-themes.test.ts` (keyword phrase → theme present → skip; miss → empty → call). Full suite 495/0.
- [x] ISC-206: the composer retries once on a wall-rejection before falling back. VERIFIED 2026-07-18 — deployed Worker code fetched via the Cloudflare API confirms the `for (attempt<2)` retry loop is live; under SPARSE traffic (6 calls, 6s apart) the live-framing rate is **0/6 null ≈ 100%**. IMPORTANT CORRECTION: the elevated null rates seen while burst-testing (17–50%, and the earlier "~80%/~20%" in ISC-202.2) were **OpenRouter RATE-LIMITING my test bursts** (429 → `callChatModel` throws → null), NOT wall rejections — a measurement artifact of hammering the endpoint. Genuine wall-rejections are rare; the retry only fires on those. **Caveat (not fixed, by design): under real high concurrent load, OpenRouter rate-limiting would cause fallbacks and the retry marginally amplifies request rate. Fine at demo scale; revisit (queue/backoff/rate-limit rule) if traffic spikes.**

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
| ISC-100..109 | unit | `bookmark.ts` — save/load/clear, bounds, corrupt JSON, no-TTL, key isolation, debounce | all pass | `bun test` |
| ISC-101,119 | anti | grep the written `nur:baca` JSON for markup/scripture | 0 hits | `bun test` (regex) |
| ISC-110..113 | live | scroll a surah, read back `nur:baca`; leave and confirm no stale write | position tracks | `Interceptor` + localStorage read |
| ISC-114..117 | live | with a bookmark set, open `#/baca`, click "Lanjutkan baca" | lands on ayah | `Interceptor` |
| ISC-118 | anti | trace: crisis path returns before reading surface; never calls `saveBookmark` | structural | `Grep` + `Read` |
| ISC-120..122 | regression | full web suite + typecheck | ≥164 pass, 0 fail, tsc clean | `bun test` + `tsc` |
| ISC-171 | perf | `stat` cosmos.json on disk | `≤ 90 KB` (actual 45.7 KB) | `Bash` stat |
| ISC-172,176 | data | builder assertions run against shards | exact topology, 4 unresolvable | `bun run app:peta3d` + `bun test` |
| ISC-173,177,178 | anti | grep prod deps + `web/src` for physics | 0 imports | `node` + `rg` |
| ISC-174,175 | unit | `peta-3d.test.ts` — determinism, coords, catIndexes | all pass | `bun test` |
| ISC-179..187 | static | `Read`/`Grep` the render source for each invariant | present | `Grep` + `Read` |
| ISC-188 | regression | peta suites + typecheck | 46 pass, 0 fail, tsc clean | `bun test` + `tsc` |
| ISC-189 | perf-live | on-device frame rate at `#/peta` cosmos | `≥ 60fps` | physical Android (F-COSMOS-PERF) |

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
| last-read-bookmark | `bookmark.ts` persists surah:ayah; `renderSurah` tracks position via IntersectionObserver; `renderIndex` surfaces "Lanjutkan baca" | ISC-100..123 | reading-surface, ref-oracle | no |
| peta-tematik-map | `build-peta.ts` emits `index.json` + 13 category shards; `web/src/peta.ts` renders the browsable index, category routes, bridges, and attribution | ISC-124..170 | shard-builder, ref-oracle | no |
| cosmos-baker | `src/app/build-peta-3d.ts` runs d3-force-3d once at build time, asserts topology, bakes integer coords → `cosmos.json` (46 KB); physics is a devDependency, never shipped | ISC-171..177 | peta-tematik-map | no (foundation for render) |
| cosmos-render | `web/src/peta-cosmos.ts` — projection-only client: rotate, perspective-divide, blit glow sprites; opt-in fetch, reduced-motion aware, drag≠click, disposable | ISC-178..189 | cosmos-baker | no |
| compose-guard | `web/src/compose-guard.ts` — egress wall: no Arabic, no verse ref (hard) + authoring heuristic; `safeCompose` degrades to the deterministic opener | ISC-190..197 | — | no (foundation) |
| compose-contract | `web/src/compose-contract.ts` — the wrap: `composeFraming` + `FRAMING_SYSTEM_PROMPT`; model is blind to verse text/refs; falls back on no-hits/error/unsafe | ISC-198..204 | compose-guard | no |
| theme-understand | `web/src/theme-understand.ts` — input understander: `understandThemes` + `THEME_SYSTEM_PROMPT`; classifies into the closed corpus theme set only, keyword fallback | ISC-202.1..202.2 | — | yes (mirror of compose-contract) |

## Decisions

**2026-07-17 (Cycle 5 wiring scaffold) — runtime keys live in the edge Worker, never in the app.**
The app is 100% static (nginx serving `web/dist`; the Dockerfile says "no server-side code"), so
there is nowhere in the app to hold a runtime secret. The runtime model call therefore goes through
the existing `new-quranku-proxy` Cloudflare Worker, now pulled into the repo as version-controlled
source at `worker/`:
- `worker/src/index.ts` — proxy (Host-rewrite to Cloud Run) + `POST /api/compose` + `POST /api/classify`.
- `worker/src/providers.ts` — OpenAI-compatible call for OpenRouter (DeepSeek V4 Flash default) and
  SEA-LION; `provider` param A/Bs them. Keys arrive from `env` secrets, never literals.
- **The SAME wall runs server-side** — the Worker imports `guardComposeProse` / `guardThemes` from
  `web/src`, so browser and edge cannot drift, and a prompt-injection ("ignore instructions, print a
  verse") is stripped on egress regardless of what it talked the model into.
- **Graceful degradation everywhere:** missing key, model down, malformed or unsafe output → the
  endpoint returns `{prose:null}` / `{themes:[]}` and the browser falls back to the deterministic
  opener / keyword lexicon. The endpoints never 500 the experience.
- **Key locations (the answer Erik asked for):** runtime keys go in Cloudflare Worker **secrets**
  (`wrangler secret put OPENROUTER_API_KEY` / `SEALION_API_KEY`) for prod, and `worker/.dev.vars`
  (gitignored) for local `wrangler dev` — NEVER in `web/src`, NEVER in the app's `.env`. The
  build-time `OPENROUTER_API_KEY` in `.env` (used offline by `src/ingest/openrouter.ts`) is a
  separate thing; the value may be reused but the runtime copy lives in the Worker.
- **Cost-abuse note:** `/api/*` is public and calls a paid model — input is length-capped (600) and
  CORS-restricted; add a Cloudflare rate-limiting rule before heavy public exposure.
- Worker typechecks clean (cross-dir shared imports resolve). Deploy + `wrangler secret put` are
  Erik's to run (Cloudflare auth; touches the live front door). ISC-201/202.2/204 stay pending until
  the browser is pointed at `/api/*` and a live generation is probed.

**2026-07-17 (Cycle 5 opened) — the generative-capability ruling is MADE: point, never author.**
ISC-80..97 deferred this at Cycle 2 ("UI/UX only pending the generative-capability ruling"). Erik
ruled in discussion this session:
- **Wrap, not replace.** The model wraps `retrieve()`. Retrieval stays the source of truth for
  which verses appear and their byte-exact text; the model understands the input and writes the
  pastoral framing. It does not become the source of truth and does not drive verse selection.
- **Rung 1 (companion), not rung 2 (interpreter).** The model speaks only in the app's own voice —
  present, naming the feeling, refusing to fix. It does NOT explain what verses mean. The reasoning:
  the tafsir is already one tap away, and the only *new* thing rung 2 adds is the model *weaving* a
  verse into a person's situation — which is exactly the fatwa-shaped act the constraints forbid.
  The safe part of rung 2 (quoting pinned tafsir) we already have; the new part is the dangerous part.
- **The bright line: point, never author.** "Para ulama membaca ayat ini tentang rahmat — kata-kata
  mereka ada di bawah" (pointing, allowed) vs "ayat ini artinya kamu harus sabar" (authoring, blocked).
- **A wall, not a prompt.** Safety lives on the model's OUTPUT (`compose-guard.ts`), where the model
  cannot reach past it — not in instructions it can ignore. Justified by this repo's own history:
  band.ts shipped the wrong verse twice by trusting memory over shipped data; the source index itself
  misremembers 4 ayahs that do not exist. A model does this confidently, at scale.
- **Degradation to honesty.** On any wall violation, `safeCompose` ships the deterministic
  hand-written opener — the worst case is a slightly-less-personal sentence, never a betrayal.
- **The generative pipeline is not yet in this repo.** The prod Gemini 3 / Redis / worker demo lives
  outside `quran-new` (the "port the whole thing into the real app" note). Cycle 5's first brick —
  the wall — is LLM-independent and shipped first; the wiring (understander + composer + which model,
  called from where) is the open question for the next step. **Constraint line 91 ("No generative
  model in the retrieval path") is honored by design: the model wraps retrieval's OUTPUT, never enters
  the scoring/resolution path.**

**2026-07-17 (Cycle 4 added, resume session) — the 3D cosmos gets its own ISCs; the map surface
already had them.** The prior checkpoint flagged `build-peta-3d.ts` / `peta-cosmos.ts` / "peta-map.ts"
as shipped without criteria. On inspection the map renderer is `web/src/peta.ts` and it IS covered by
Cycle 3 (ISC-140..162: routes, bridges, attribution, live probe at `#/peta`); there is no separate
`peta-map.ts`. The genuine gap is the **cosmos** — the build-time layout baker and the render-only
client. Added ISC-171..189 as Cycle 4. The removed chord diagram (`1dd8f3c`, reverted at `0debe3a`)
is deliberately NOT tracked — tracking a reverted artifact would misrepresent the deployed product.
Eighteen of the nineteen are verified this session by probe (stat, `node` deps check, `rg`, `bun test`
46/0, source read). ISC-189 (60fps on a mid-range Android) is the lone `[DEFERRED-VERIFY]` — rAF is
suspended in minimized Chrome, so on-device is the only honest probe; follow-up F-COSMOS-PERF is Erik's.

**2026-07-17 — F-1 answered: the Peta Tematik build is unblocked, and three of the four F-questions
resolved to defaults.** Ustadz Ahmad Isrofiel granted permission to display the Indeks Tematik.
F-2: no attribution preference stated → our proposed form ships ("Indeks Tematik oleh Ustadz Muhammad
Thalib" + link, every page, body size, in-flow). F-4: no entries flagged → all 2,451 ship, no
exclusion list. F-3 was already closed by Erik's earlier ruling that family consent suffices; Ustadz
Ahmad *is* the family answering, so it was not re-asked.

**2026-07-17 — The permission we received was narrower than the permission we needed, and the gap was
invisible until we read the data.** F-1 grants the right to DISPLAY the index. It says nothing about
what to do when the index is WRONG. Four of 2,633 citations point at ayahs that do not exist (8:96,
8:77 — Al-Anfal has 75; 48:59 — Al-Fath has 29; 11:161 — Hud has 123). Verified against the raw
`.md`/`.csv`: our parser is byte-faithful, so this is the source's. Three options were available and
two are forbidden by our own rules: *correcting* them (8:96→8:66 is plausible — Al-Anfal 8:66 is
literally about enemy strength — and that is exactly why it is fabrication in a scholar's name), or
*dropping* them (silently editing the work we promised only to display). Chosen: display his sentence,
decline to linkify a ref we cannot resolve, name the gap in the UI, route it to him as **F-5**. This
is the project's existing "no fabrication, named non-coverage" rule, applied to someone else's work.
No count-based test detects this class — ISC-163..169 exist because 2,451/2,451 was green throughout.

**2026-07-17 — `refined:` ISC-142 — registerReadCard does not apply to this surface.** The ISC was
written assuming Peta would render verse cards like `themes.ts`. It cannot: "Perintah dan Larangan"
alone has 626 entries, and 626 shard fetches is the patchy-4G failure PRODUCT.md names. Entries are
index rows that link to the existing reading surface. So `peta.ts` calls `bindActs()`/`clearReadCards()`
(no stale cards leak across surfaces) but registers nothing — there is nothing to register. A
consequence worth keeping: because this surface renders no scripture, `literal_companion` cannot be
violated here at all. Linking out beats inlining on rights, bandwidth, and the honesty gate at once.

**2026-07-17 — The advisor caught what 424 green tests could not: we conflated the website with the
book.** Our source is a vendored extraction of quran.tarjamahtafsiriyah.com, not Ustadz Muhammad
Thalib's printed index. So we do not know whether the 4 bad refs are his team's typos or artifacts of
the site's transcription — and F-5 originally implied the former. Reworded to name our actual source
and ask rather than assert. Two further advisor findings adopted: (1) the verse links and "muncul di N
tema" bridges are OUR derivative work sitting on a page bearing his name — under UU 28/2014's
integrity right, preventing misattribution to him is our duty, so `derivativeNoteEl()` names the seam
on both routes; (2) the shards are a separable, scrapeable dataset that travels without our pages, so
`source` is now embedded in every shard, not just index.json — DOM-only attribution falls off the
moment the data does. F-6 added telling him plainly that the data is downloadable, and that we will
remove it on request. **Rejected** one advisor claim: it asserted "your session has no ISA.md" —
`--auto-state` simply did not find the project ISA, which exists and carries ISC-124..170.

**2026-07-17 — Show my math on the E3 delegation floor (soft, ≥2; ran 1).** Forge authored the
generator + its 15 tests; no second delegation was taken. The unused slot would have been Worktree
Isolation, which the ISOLATION GATE actively rules out here: Forge's targets (`src/app/build-peta.ts`,
its test, package.json) and mine (`web/src/*`) do not overlap, so the prayer.ts clobber cannot recur —
and a worktree would strand the emitted shards where the UI could not read them, which is the one
thing the build depends on. Effort tier itself was a **context-override**: the classifier returned E2
reading "confirmed by ustadz ahmad…" in isolation as a status note; the thread makes it a green-light
releasing a generator, 14 emitted files, a UI module, routing, attribution, and tests.

**2026-07-17 — Prayer times ship with TWO methods named, because plurality is not only about translation.**
Kemenag holds Subuh at −20° (Tim Falakiyah, reaffirmed 21 Dec 2020, still held Dec 2025); Muhammadiyah
holds −18° (Munas Tarjih ke-31, 2020). Kemenag's statement was a direct rebuttal; the split is live and
unresolved. The delta is **~8 minutes of Subuh** — for tens of millions of people, the difference between
a valid prayer and an invalid one. The tempting move is to ship the state standard silently as "the"
prayer times. That would violate `## Principles`: *"Plurality is warmth, not hedging. Show that scholars
differ, name them, trust the reader."* The realisation is that this principle was never about
translation specifically — it is about **any question where scholars differ and the app is tempted to
pick for the reader**. So `METHODS` ships both, each carrying an `authority` string rendered in the
prayer card. Same rule, new surface. `literal_iff_canonical` has a sibling now: no method is "the" method.

**2026-07-17 — "Masuk" (accounts) stays out of scope; prayer times do not need it.**
Erik chose the maximal scope including auth. Surfaced that his own `## Out of Scope` bans *"user
accounts, sync, or any server-side session"*, and that the app is 100% static by construction — the
reason `thread.ts` expires in 12h and the bookmark does not is that a reading position is a coordinate,
not a confession. The Vision is a person arriving at 2am carrying something; accounts would put that on
a server with a subpoena surface and a breach surface. Erik chose design + prayer times now, Masuk as
its own session. Prayer times are client-side (geolocation + astronomy), so no conflict. The greeting's
optional name therefore lives in `localStorage` only — personalisation without identity.

**2026-07-17 — refined: the action color's lightness is a contrast constraint, not a taste choice.**
Three `$impeccable` passes audited `--ink-3` and never audited the action color. White on the preview's
bright emerald (`#12a074`) is **3.33:1** — a WCAG AA failure — and it carries *text* (the chat bubble,
the CTA). Pinned to the brightest AA-passing value (4.94:1). `contrast.test.ts` asserts it at **both**
stops of the gradient: a gradient passes at both ends or it does not pass. Brightening the emerald "to
pop more" must now fail a test first.

**2026-07-17 — the daily ayah is curated by FULL TEXT, never by remembered fragment.**
The first pool shipped QS 65:2 as "ayat untukmu hari ini". 65:2 entire is a ruling on divorce, iddah and
witnesses; the line it was chosen for is only its tail. A screenshot caught it. Rule now encoded in
tests: a verse must **stand alone AND console when read whole** — "contains a comforting fragment" is
not sufficient. If a verse only works cropped, it does not belong; cropping scripture to fit a mood is
the fabrication this app exists to refuse. (2:216 opens on fighting, 40:60 ends in Jahannam, 13:28
begins mid-sentence — all excluded by name.)

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
Inlined into the JS bundle, New-Quranku can prove `18:10` is a real ayah with **no fetch at all** — offline,
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
New-Quranku predates the ISA framework. Sources consulted: `PRODUCT.md`, `DESIGN.md`, `PROGRESS.md`,
`package.json`, `src/ingest/*`, the critique report, and the last 8 commits. `Principles` and
`Constraints` are lifted from constraints already enforced in code (the 24 gates), not invented.

**2026-07-15 (Cycle 2 opened) — "Generative AI chat capability" is not assumed to mean relaxing the locked constraint.**
Erik's request centered "the generative AI chat capability" in a UI-improvement ask. `ISA.md` §Constraints
already says "No generative model in the retrieval path. New-Quranku never answers in a scholar's voice. Do not weaken,"
re-affirmed as recently as the Path B2 graphrag ruling (2026-07-15, above). Ran `FirstPrinciples/Challenge`:
classified "a chat-shaped UI" as a pure interaction-design choice (soft, no constraint interaction), "Erik wants
literal LLM-generated answers replacing retrieval" as an unvalidated assumption nothing in the message actually
states, and the locked no-generative rule itself as hard/immovable pending Erik's own ruling. Then ran an
`Advisor` consult (Rule 2, commitment boundary) before committing to a plan. The advisor caught a real hazard —
its `--auto-state` flag pulled in a stale ISA from an unrelated project (`entos-connector-registry-design`),
not New-Quranku — but that hazard didn't propagate into this decision because New-Quranku's actual constraint text was already
read verbatim from this file earlier in the session, not recalled from state. The advisor's substantive finding
was better than my own framing: not an (a) UI-only / (b) full-unlock binary, but a third reading — "generative
composition strictly downstream of deterministic retrieval" — whose legality turns on whether the locked
constraint is *structural* (no model decides which āyah is shown) or *output-scoped* (no model-generated prose
reaches the user at all). The constraint's own second sentence ("New-Quranku never answers in a scholar's voice") reads
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

**2026-07-16 — Last-read bookmark: no TTL, separate key, and the debounce/navigation race.**
The P2 from the $impeccable critique. Three rulings worth recording:
- **No TTL, separate `nur:baca` key (FirstPrinciples · Challenge).** The sibling `thread.ts` expires
  in 12h because a grief disclosure on a shared phone can out a vulnerable reader. Transplanting that
  TTL to a reading bookmark was classified as an *unvalidated assumption*, not a hard constraint: a
  position (`surah:ayah`) is a coordinate, not a confession. Expiring it would break the one feature
  `thread.ts:40` already said should replace the never-ending log. So: no TTL, independent key, so
  burning the conversation never burns the bookmark (ISC-107/108). The advisor independently agreed
  the asymmetry is correct.
- **The advisor caught a real race (Rule 2 earned its cost).** `stopTracking()` disconnected the
  scroll observer on navigation but did NOT cancel the already-scheduled debounced write — so leaving
  surah 18 within the 400ms window could let a stale `{18,47}` write land *after* arrival and clobber
  the new surah's position. Fix: `cancelBookmark()` (drop pending, keep committed) in the same
  teardown as `disconnect()`. Added a regression test (`the navigation race`). A green suite would NOT
  have caught this — it is timing-dependent.
- **Surface as an explicit entry point, not an auto-jump.** "restore on load" is honored by showing
  "Lanjutkan baca" on the reading index (`loadBookmark()` at `renderIndex`), not by dumping the reader
  mid-surah on cold open. This is the "explicit, chosen act" the product philosophy names. Whether to
  ALSO surface it on the `#hello` chat home is left for Erik — a deliberate non-decision, not an omission.
- **ISC floor show-your-math (soft, E3 ≥32).** The natural granular count for this single-surface
  feature is 24 genuine binary probes (ISC-100..123). Padding to 32 would manufacture phantom criteria;
  the floor is soft, so the honest count stands.

**2026-07-16 — Renamed Nur → New-Quranku; retired the نور/light identity.**
Erik's call. Full rebrand, done in the right order to protect users and scripture:
- **Data safety (migration, not deletion).** The saved-data keys were the risk — `nur:thread`,
  `nur:baca`, `nur:theme`, `nur:ar`, `nur:lens`, `nur:explained` hold a returning reader's conversation,
  last-read bookmark, and settings. Renaming them blind would have wiped every existing user's data. So
  `migrate-storage.ts` runs first at boot and copies each `nur:*` key to `newquranku:*` once, then drops
  the old — idempotent, storage-safe, 5 tests. Shard cache `nur-quran-` → `newquranku-quran-` (regenerable;
  `evictStaleCaches` now also cleans the old prefix).
- **Scripture protected.** A blind `s/Nur/New-Quranku/` would have corrupted **Surah An-Nur (24)** and
  "Nūr" (24:35). Every rename was word-boundary-guarded and grep-verified against surah names — never touched.
- **Identity dropped.** The نور (light) wordmark and the Arabic mark were removed from the logo, title,
  and share image; wordmark is now plain "New-Quranku". The light/cahaya *positioning* copy in `PRODUCT.md`
  and `DESIGN.md` (e.g. "Light emerging from dark — Nūr is the Qur'an's metaphor for itself, 24:35") is
  **flagged for Erik to rewrite**, not mechanically mangled — it needs an editorial hand, not a sed.
- Code comments still say "Nur" as the internal persona (harmless narrative); left untouched unless Erik
  wants them swept. Web tests 190/190, typecheck clean.
- **2026-07-17 — Gold gate reversed, narrowly (Erik's ruling, during the Stitch UI redesign).** The
  blanket "no gold" is retired in favour of the line PRODUCT.md always implied: the ban was on *ornament*,
  not the hue. Gold is now permitted in **exactly one surface** — the hero heading's green→gold type
  gradient (`#16a249 → #f0c851`), the QuranKu-family signature. Gold *ornament* (frames, rules, hairlines,
  filigree, any edge or decoration) stays banned outright. PRODUCT.md § Anti-references and DESIGN.md
  "What this is not" were revised to match. **ISC-93, ISC-162, ISC-185 are NOT flipped and remain
  verified:** none of them cover the hero heading. ISC-162/185 are about the peta cosmos, which stays
  gold-free; ISC-93 recorded a past proposal that added no gold. All three are still true for their
  surfaces — flipping them would falsify a verified record. The new boundary is "gold only in the hero
  heading gradient," and it enters the test surface as a criterion when the redesign ports to the app
  (tracked: F-GOLD-BOUNDARY), not before — the redesign is still a Stitch prototype in `.scratch/`.

## Changelog

**2026-07-17 — The "no gold" rule conflated a hue with an anti-pattern.**
- **conjectured:** that gold had to be banned outright — "No gold. Not one token." (DESIGN.md) — because
  gold is the devotional-app cliché and any gold at all would drag the app toward filigree kitsch.
- **refuted by:** the Stitch redesign against the live QuranKu family, whose signature is a green→gold
  gradient *heading*. Seen rendered, gold-as-type-gradient reads as a modern wordmark, not as ornament —
  the reader cannot mistake `background-clip:text` for a filigree frame. The failure the ban guards
  against is ornament substituting for reverence; a type gradient is not ornament. The doc's own line
  ("the cliché is ornament, not green") already said this; the blanket ban over-reached past it.
- **learned:** the rule was pointed at the wrong noun. Banning the *hue* was a proxy for banning
  *ornament*, and the proxy was lossy — it forbade a legitimate modern use to prevent an illegitimate
  decorative one. The precise rule costs nothing the blanket rule protected: ornament is still banned.
- **criterion now:** gold permitted only in the hero heading gradient; gold ornament banned everywhere.
  ISC-93/162/185 stand unchanged (they cover non-hero surfaces that stay gold-free). The new boundary
  becomes a probeable anti-criterion (F-GOLD-BOUNDARY) when the redesign ports to app code.

**2026-07-17 — A shipped surface with no ISCs means the ISA under-represents the product.**
- **conjectured:** that Cycle 3 (ISC-124..170) covered the whole Peta Tematik surface, so the ISA
  could be cited as complete for everything reachable at `#/peta`.
- **refuted by:** the 3D cosmos — `src/app/build-peta-3d.ts` (the build-time layout baker) and
  `web/src/peta-cosmos.ts` (the render-only client) — shipped in the same session with zero criteria
  of their own. Cycle 3 stops at the map/index/attribution; nothing in it probes the dependency
  boundary, layout determinism, the zero-physics render path, or the deferred on-device frame rate.
- **learned:** "the tests were green" and "the ISA covers this" are different claims. A green suite for
  the map said nothing about the cosmos, because there were no cosmos criteria to be green about. The
  ISA is only the system of record for the surfaces it actually enumerates.
- **criterion now:** ISC-171..189 (Cycle 4) make the cosmos mechanical — 18 verified this session by
  probe, and ISC-189 (60fps, mid-range Android) carries `[DEFERRED-VERIFY]` + follow-up F-COSMOS-PERF,
  the same honest treatment ISC-110/111 got, rather than a green checkmark on an unmeasured claim.

**2026-07-17 — Permission to display is not permission to be faithful.**
- **conjectured:** that F-1 ("may we display the Indeks Tematik?") was the whole rights question, and
  that once answered the build was a data-transformation problem — shard it, render it, credit it.
- **refuted by:** reading the data before trusting the design. Four of 2,633 citations point at ayahs
  that do not exist (8:96, 8:77, 48:59, 11:161), verified against the raw source as the publisher's,
  not our parser's. Every count-based test was green — 2,451/2,451 entries, 2,633/2,633 citations —
  and would have stayed green while four entries linked into the void under a dead scholar's name.
  The advisor then refuted the refutation's framing: our source is the *website*, not his *book*, so
  we do not even know whose typo it is.
- **learned:** displaying someone else's scholarship obliges you at exactly the points their work is
  imperfect, and those points are invisible to parity tests, which only ever compare your copy to
  their copy. The three tempting moves — correct it, drop it, link it anyway — are all forms of
  speaking for them. The honest fourth is: show their words, refuse to invent a destination, name the
  gap, ask. Two further obligations only became visible from the rights lens, never the code lens:
  our links and bridges are *our* derivative work sitting on a page bearing *his* name (UU 28/2014
  integrity right), and shards are a scrapeable dataset that travels without our attribution unless
  the attribution is inside the payload.
- **criterion now:** ISC-163..169 make the gap mechanical — the generator resolves every citation
  against the real corpus, stamps `resolvable`, fails loudly if a 5th ever appears, and mutation
  tests prove "correcting" 8:96→8:66 fails the suite. ISC-170 routes the question to the one person
  who can answer it. Attribution is embedded per-shard, and the derivative seam is named on both routes.


**2026-07-16 — A scroll observer cannot be verified in a hidden document.**

- **conjectured:** That the last-read position tracker (IntersectionObserver in `renderSurah`) could
  be fully live-verified through Interceptor, the way the surface and routing were — driving real
  Chrome, scrolling, and reading back `localStorage["nur:baca"]`.
- **refuted by:** The live probe. With the Chrome window minimized, `document.visibilityState` is
  `"hidden"`, the browser suspends the rendering lifecycle, and IntersectionObserver callbacks never
  fire — `nur:baca` stayed `null` after landing on 18:10 despite 110 verses rendered and `scrollY=0`.
  This is the SAME class of environment limit as ISC-98/99 (no real narrow viewport) and last
  session's rAF-while-minimized bug in the constellation.
- **learned:** IntersectionObserver-, rAF-, and screenshot-based verification all share one
  precondition — a *composited* surface. A minimized window fails all three identically. The correct
  response is to split the ISC: verify everything that does NOT need the rendering lifecycle (the
  module via unit tests, the wiring via grep, the surface + routing via seeded-state live probes) and
  mark ONLY the lifecycle-dependent half `[DEFERRED-VERIFY]` with a concrete follow-up — never claim
  the whole loop is proven.
- **criterion now:** ISC-110/111 carry `[DEFERRED-VERIFY]` + a named follow-up (scroll a surah in a
  non-minimized window, confirm `nur:baca` advances); ISC-114..117 + 123-surface are `[x]` on live
  Interceptor evidence.

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
`PROGRESS.md` on what would make New-Quranku more compelling without violating its own doctrine. Headline
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
wrong.** Issue 07 assumed New-Quranku "already has the attributed-graph foundation" from `docs/design/
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
("No generative model in the retrieval path. New-Quranku never answers in a scholar's voice. Do not
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

- **conjectured:** That adding a `.composing` "New-Quranku sedang menyusun jawaban…" element ahead of the
  skeleton would satisfy ISC-90 — a felt beat before the answer, matching what a chat product is
  expected to do.
- **refuted by:** Live verification via Interceptor. Clicking a seed and immediately inspecting
  the DOM showed the answer already fully rendered — the `.composing` element was gone. New-Quranku's
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

**Cycle 4 — the 3D cosmos (2026-07-17 resume).** These are build-artifact and source probes, not
Interceptor live — the cosmos's one live claim (frame rate) is exactly the deferred one.
- ISC-171: `stat web/public/peta/cosmos.json` → 46,764 bytes (45.7 KB), under the 90 KB `SIZE_LIMIT_BYTES`.
- ISC-172/176: `bun test` runs `computeCosmos` against the shards; the `EXPECTED` and `EXPECTED_UNRESOLVABLE`
  assertions in `build-peta-3d.ts` pass (13/42/2451/2633/1632/518/2370, 4 unresolvable) — 46/0.
- ISC-173: `node -e` on `package.json` → `dependencies: {}`, `devDependencies["d3-force-3d"]: ^3.0.6`.
- ISC-174/175: `peta-3d.test.ts` (determinism, finite coords, valid catIndexes, radius budget) green.
- ISC-177/178: `rg 'd3-force|forceSimulation|forceManyBody' web/src/` → one comment hit, zero imports.
- ISC-179: `web/src/peta.ts:151` — `loadCosmos()` fetches `/peta/cosmos.json` on a cached, idempotent
  path separate from `loadIndex()`; the map route renders without it.
- ISC-180..187: `Read web/src/peta-cosmos.ts` confirms each — reduced-motion guard (`:375`), sprite cache
  `SPRITES`/`haloSprite` blitted (`:71,251`), `moved < 5` drag-guard (`:345`), `destroy()` teardown
  (`:380`), separate `scale`/`persp` (`:202,239`), 13 non-gold hues (`:54`), label collision-skip
  (`:296`), DOM `legendHtml` (`:394`).
- ISC-188: `bun test` peta suites → 46 pass, 0 fail, 425 expect() calls.
- ISC-189: `[DEFERRED-VERIFY]` — follow-up F-COSMOS-PERF (on-device Android frame rate).

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
- ISC-14: live — asked `18:10`; New-Quranku returned "Ini Al-Kahf 18:10" with Arabic, both renderings, both translators named. Before: *"Tidak ada ayat yang cocok."* (evidence: `.impeccable/evidence/p0-denies-18-10-BEFORE.png`)
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
- Live `shareText(94:5)` emits both renderings, the interpretive one labelled *Terjemah makna* with its translator, and Kemenag's literal beneath it. The known-defective 94:5 rendering **cannot leave New-Quranku unaccompanied**.
- ISC-54: the 94:5 caution renders in the reading surface, not only chat.

**Regression (ISC-39..42)**
- `bun test` 117 pass / 0 fail (was 63). `bun run typecheck` clean across root **and** web. `bun run verify` 24/24 gates — `literal_companion` and `primary_voice` intact, not weakened.
