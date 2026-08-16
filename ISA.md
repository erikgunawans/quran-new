---
project: New-Quranku
task: "Cycle 5 — the generative companion (ISC-190..203): wrap retrieve() with a rung-1 pastoral model behind an egress wall (point, never author); resolves the ISC-80..97 deferral. Wall built + verified; the wrap/understander/model-wiring pending (prior: Cycle 4 cosmos ISCs, complete; Cycle 3 Peta Tematik, complete; Cycle 2 UI redesign, complete)"
effort: E4
phase: complete
progress: 485/496
mode: build
started: 2026-07-13
updated: 2026-08-16
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
- [x] ISC-288: Anti: the Al Qur'an shelf route (`#/baca`) never overflows `.qk-panel-body` — the shelf is sized to fit, so `scrollHeight - clientHeight` must read 0 and no viewport-height scrollbar may appear
- [x] ISC-289: Antecedent: the shelf's last card still clears the docked composer — measured gap between the card's bottom and the composer's top is > 0, so nothing is occluded by the fix that removes the clearance padding
- [x] ISC-290: the surah reading route (`#/surah/N`) scrolls `.qk-panel-body` by exactly the height of the cartouche it is meant to scroll away, and by nothing else — `(scrollHeight - clientHeight) - (.surah-head height + margin-bottom + panel padding-top)` reads 0 (±1px)
- [x] ISC-291: Antecedent: at maximum panel scroll the `.back-bottom` link still clears the docked composer — `composer.top - backBottom.bottom` is > 0, so the fix widens the columns without pushing anything behind the bar
- [x] ISC-292: the `-94px` subtrahend stays honest — `.back-bottom` height + its margin-top re-measures to 94px (±2px). If this drifts, `.surah-split` is silently mis-sized again and ISC-290's delta is the alarm
- [x] ISC-293: Anti: the narrow branch is untouched — the `@media (width<=820px)` rule setting `.surah-split { height: auto }` still appears AFTER the wide rule in the built stylesheet, so the phone layout that put scripture back above the fold is unaffected
- [x] ISC-294: Anti: the zoom correction is NOT retrofitted onto the three sibling `dvh` users in `shell.css` (`:330`, `:800`, and the shelf at `:988`) — their constants were tuned against the raw value and already absorb it. `shell.css` IS in the diff, but only to tokenise the composer clearance; `git diff web/src/shell.css` touches no line containing `dvh`
- [x] ISC-295: Anti: `web/dist` holds a principled build, never a synthesis one — the compiled edition constant reads `principled` in both branches of its try/catch
- [x] ISC-296: the composer clearance has exactly one definition — `.app`'s `padding-bottom` and `.surah-split`'s height both read `--composer-clear`, so `clamp(120px, 13vh, 160px)` opening up past a ~923px viewport moves both together. Probe: force `--composer-clear: 160px` and the split must shrink by the same 40px, holding ISC-290's delta at 0
- [x] ISC-297: Antecedent: every geometry probe runs against the build actually under test — the `link[rel=stylesheet]` filename read from the live DOM must equal the newest `web/dist/assets/index-*.css` on disk before any measurement is believed
- [x] ISC-298: the split column headers read as raised surfaces, not flat labels — `.sp-tab` carries a body gradient, a light top inset, a dark bottom inset and a downward-only drop shadow, so `getComputedStyle(.sp-tab).boxShadow` is not `none`
- [x] ISC-299: the outer shell ground is a dark GREEN, not near-black — `getComputedStyle(.qk-shell).backgroundColor` reads `rgb(8, 23, 15)`, and stays darker than the panel's foot stop so the two-layer reading survives
- [x] ISC-300: the pool under the composer paints the panel's GILDED foot, not the raw green — `#composer-bar::before` resolves `--panel-foot-lit`, so it no longer subtracts the gold wash `.qk-panel::before` lays down there
- [x] ISC-301: emphasis in the Pengantar Surah prose is carried by hue, not weight alone — `getComputedStyle(.si-h).color` reads `rgb(240, 200, 81)` in dark
- [x] ISC-302: the ayah action row sits centred in its own band — `.verse-acts` padding is symmetric (14px top and bottom), not `4px / 18px`
- [x] ISC-303: Dengar offers a choice before it plays — the button renders `data-act="play-menu"` with `aria-haspopup`, and its menu holds exactly two options, `Ayat ini saja` and `Lanjut otomatis`
- [x] ISC-304: choosing a mode persists it and starts playback — clicking `[data-mode="continue"]` closes the menu and writes `continue` to `qk:audio-mode`
- [x] ISC-305: auto-advance repaints BOTH ends of the move — dispatching `qk:audio-advance` from 1:1 to 1:2 leaves 1:1 reading `Dengar`/`play-menu` and 1:2 reading `Jeda`/`play`/`aria-pressed=true`
- [x] ISC-306: Anti: auto-advance never chains into audio that does not exist — `nextWithAudio` returns null at the end of a surah and for any surah outside the downloaded manifest
- [x] ISC-307: Anti: the play mode obeys memory, not storage — `setPlayMode` still takes effect when `localStorage` throws, so a private-mode reader can still choose
- [x] ISC-308: the reading route has no bottom back-link and the columns took the space — `.back-bottom` is absent from `#/surah/N`, and `.surah-split` grew by exactly the 94px it freed
- [x] ISC-309: the surah cartouche is shorter — `.surah-head` measures 311px, down from 329px, with its bottom margin cut from 2rem to 1.25rem
- [x] ISC-310: Riwayat Bacaan clears the floated display controls — the summary's top sits below `.qk-panel-top`'s bottom, measured gap 11px (44px was copied from `.tematik-head-r` and overlapped by 5px; 62px is measured)
- [x] ISC-311: each Riwayat entry can be deleted on its own — the row carries a `data-act="history-del"` button whose `aria-label` names the surah and ayah, and using it swaps the row for the empty state without collapsing the dropdown
- [x] ISC-312: every section title in a panel header is gold — the treatment binds to `.tematik-head-l > h1` and `.baca-head-l > h1` by POSITION, so a section cannot forget the class; `webkitTextFillColor` is transparent over the hero gradient

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
- [x] ISC-99: [NEW] A genuine narrow-viewport (≤375px) live probe of the mobile header/panel/breakpoints — **RUN 2026-08-08**. The blocker recorded here was misdiagnosed: OS window-resize works fine (`osascript … set bounds`), Chrome on macOS simply **hard-clamps its window at 500 CSS px** (requested 375/400/300 all returned `innerWidth: 500`), so no real Chrome window can ever show a phone width. Probed instead through Chrome DevTools device emulation at 375×812 DPR3 and 320×568 DPR2, coarse pointer — a real Blink layout, not a CSS override: all eight width breakpoints (`23.4375rem`/`26rem`/440/`30rem`/560/700/`47.9rem`/820) evaluated `true` live. Bundle confirmed current (`index-Br2UE3bA.js` == prod curl). Findings: ISC-99.1, ISC-99.2, ISC-99.3.
- [x] ISC-99.1: [NEW] `.si-tip` must not clip off the viewport at ≤375px — **FIXED + VERIFIED LIVE** on `index-B8Sdw2Id.css`: `#/surah/2` tip now `translate: 65px` → `left: 10, right: 293`, `#/peta` tip `translate: 8px` → `left: 15, right: 299`, both `opacity: 1`, zero clip either side; screenshot confirms it readable on glass. Erik chose "keep floating, pin to the panel", so `pinTip()` in `surah-intro.ts` corrects the horizontal anchor after layout while CSS keeps the vertical one — the two axes need different containing blocks and one absolute box gets one. Original defect below. The `≤820px` edge-pinning rule (`read.css:978`) anchors `right: 0` to the ⓘ icon, not to the viewport. On `#/surah/2` at 375px the preface provenance tooltip renders at `opacity: 1` with `left: -49px` — 49px of it is off-screen. Same defect on `#/peta` at 320px (`left: -9px`). A candidate fix (`.si-info { position: static }`) clears the horizontal clip (left 14, right 361) but re-parents the tooltip to `.qk-panel-body`, dropping it to `top: 819` — below the fold. Fix is a design call (floating tooltip vs inline disclosure on mobile), pending Erik.
- [x] ISC-99.2: [NEW] A phone reader must see scripture on a surah page without scrolling past a second nested scroller — **FIXED + VERIFIED LIVE**. Erik ruled "release the cap when stacked": `max-height: none; overflow: visible` at ≤820px. Live at 375px `#surah-body` now computes `max-height: none`, and the scroller enumeration returns ONE reading scroller (`.qk-panel-body`) where it previously returned three. Follow-on caught before it shipped: releasing the cap stops `#surah-body` being a scroll container, and the bookmark observer was rooted ON it — `-75%` of a 250,000px box is a 62,000px band, so `Math.min` would have pinned the bookmark to ayah 1 forever with nothing on screen to say so. `scrollBox()` in `read.ts` now asks the layout which box scrolls instead of assuming. Original finding below. `read.css:1032` caps both stacked panes at `max-height: 62dvh`. At 375×812 that puts the preface scroller at y=376 (503px tall, 3484px of content) and the *scripture* scroller at y=876 — entirely below the fold, so opening Al-Baqarah on a phone shows the hero card and Dorar's preface and no Qur'an. The 286 ayahs then read through a 503px porthole nested inside `.qk-panel-body`. Stacking, `flex-direction: column`, and `.sp-divider { display: none }` all verified correct; it is the retained pane height that is wrong for touch.
- [x] ISC-99.3: [NEW] Anti: no control on a primary route is below the 44px touch minimum at 375px — **FIXED + VERIFIED LIVE**: `#/peta` at 375px now reports **0 of 22 visible controls failing** (was 8). Erik chose invisible hit-area padding, so nothing drawn changed: `::after` insets sized per control against the `.9` body zoom — `.qk-iconbtn` 49 on glass, `.icon-btn` 45, `.send` 45 (landing variant 59), `.si-infobtn` widened −15→−16 for 47. Two rounds of measurement were needed because the authored sizes and the on-glass sizes disagree per surface (`.send` is 36 authored in the panel, 32 on Tematik). Inline prose links keep their 18px line box under the WCAG 2.5.8 inline exception, documented in `styles.css`. Original measurements below: 8 of 38 visible controls on `#/peta` measured post-zoom on glass: `.si-infobtn` 18×18, `.send` 29×29, `.qk-iconbtn` 31×31, `.icon-btn` 40×40, `.tematik-vbtn`/`.tematik-back` 37px tall, the credit link 18px tall. This is the app-wide finding deferred from the DESIGN.md audit, now with real mobile numbers behind it.
- [x] ISC-99.4: [NEW] Anti: the narrow layout must not overflow horizontally — **PASSES** at both 375 and 320: `documentElement.scrollWidth == clientWidth` on landing, `#/peta`, and `#/surah/2`. The only negative-left elements (`.aod-ref`, `.aod-link`) sit inside the collapsed sidebar at effective opacity 0 — checked, not a defect.
- [x] ISC-99.5: [NEW] Anti: the Tematik card wall must not lose its column fallback at phone width — **PASSES**: 13 cards across 2 columns at both 375 and 320, no overflow, ranking intact.

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
- [x] ISC-110: scrolling updates the persisted position via IntersectionObserver — **LIVE-VERIFIED 2026-08-08** during the ISC-99 probe, which supplied the visible, non-minimized page the old deferral was waiting for. On `#/surah/2` at 375px, scrolling `.qk-panel-body` to 4200 then 9000 moved `localStorage["newquranku:baca"]` from `null` → `{"surah":2,"ayah":1}` → `{"surah":2,"ayah":9}`. Note the key is `newquranku:baca`, not the `nur:baca` this entry originally named — the rename outlived the note, and the first probe read the dead key and looked like a regression. Prior deferral text: CODE verified (grep-confirmed wiring, min-over-persistent-`Set` the advisor validated, per-chunk `observe()`); LIVE firing could NOT be probed because the Chrome window is minimized → `document.visibilityState === "hidden"` → the browser suspends the rendering lifecycle so IO callbacks do not fire (confirmed live: `hidden=true`, `scrollY=0`, `nur:baca=null` after landing; same environment limit as ISC-98/99 and last session's rAF-while-minimized issue). FOLLOW-UP: Erik scrolls a surah in a NON-minimized window and confirms `localStorage["nur:baca"]` advances.
- [x] ISC-111: opening `#/surah/N#A` records `N:A` — **FULLY LIVE-VERIFIED 2026-08-09**, both halves. LANDING half (verified earlier): deep-link `#/surah/18#10` renders Al-Kahf, `.verse[data-ref="18:10"]` present, `.landed` fires. RECORD half (closed today): with `newquranku:baca` deleted first so no stale value could fake a pass, deep-linking `#/surah/18#10` in a **foregrounded** tab wrote `{"v":1,"surah":18,"ayah":10}`; a control on a different ref, `#/surah/2#255`, wrote `{"v":1,"surah":2,"ayah":255}` — the value tracks the deep link rather than being a fixed artifact. The deferral was confirmed to be **purely environmental, never a code defect**: the same navigation with `document.visibilityState === "hidden"` left `baca: null` despite `landed: true`, and the write appeared within seconds of `tab switch` making the document visible. Same environment limit ISC-110 shed on 2026-08-09.
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

**Co-display reaches the demo (2026-07-22) — the blocker on restoring the 7 conditional verses**

- [x] ISC-207: the demo's own verse card renders a required passage — `web/demo/passage.ts` mirrors `verse.ts`'s `passageEl` (split at subject, subject skipped, before above / after below). Verified: `bun test web/demo/` 30/0; live pixel probe in real Chrome at 20:26 inside 20:25–28 shows Musa's du'a in unbroken mushaf order, light and dark theme.
- [x] ISC-208: neighbours carry no caption of ours — no translation tag, no translator byline, no verse actions, no `why`. Verified: `passage.test.ts` "our words stay on the verse they were written for".
- [x] ISC-209: Anti: the required passage is never dismissible — no `<details>`, `<summary>`, `aria-expanded`, or `hidden` attribute wraps it, and it is never nested inside the `qk-harf` disclosure the literal companion legitimately uses. Verified: `passage.test.ts` + `card.test.ts` (asserts both passage sides precede the `qk-harf` element).
- [x] ISC-210: Anti: a curated verse cannot be rendered with its condition dropped — the card takes the verse WHOLE (`curatedCardHtml(v)`), so there is no argument to omit. The shard-backed lanes call `shardCardHtml`, which names in its signature that it draws an uncurated mushaf ayah. Verified: `card.test.ts` wiring tests; `rg cardHtml web/demo/demo.ts` shows all four call sites repointed.
- [x] ISC-211: the Beranda "ayat hari ini" slot — a FIFTH render path that never used the card — cannot show a conditionally-approved verse alone. Its candidate pool now excludes any verse carrying a `passage`, which is a property of the slot rather than of today's picks (its fallback is positional `verses[0]`, so a rebuild could otherwise land a conditional verse on the home screen). Verified: `demo.ts` `renderToday()` filters `eligible`.
- [x] ISC-212: Anti: a malformed ref cannot silently misplace the subject — the guard matches `/^(\d+):(\d+)$/` whole. A digits-only check ADMITTED `"20:"` (`Number("")` is 0, an integer), placing the subject at ayah 0 so the entire range counted as "after" it and stacked below the verse, subject included. Verified: `passage.test.ts` `test.each` over 8 near-miss refs.
- [x] ISC-213: the whole range reaches the reader, once each, in mushaf order. Verified: `card.test.ts` count assertion over 23:57–61 (each ayah exactly once) and index-ordering assertion with the subject in its true position.
- [x] ISC-214: Anti: no verse was restored this run — restoring before every surface can render a passage is the half-approved ship the mechanism exists to prevent. Verified: `corpus.json` has 0 verses carrying `passage`; 5 entries remain `kind: "condition-unmet"` in `problem-verses.ts`. **SUPERSEDED 2026-07-23 by the restore cycle below: the precondition (every render path can carry a passage) is now met, so the anti-criterion's guard is deliberately released.**

**The seven conditional verses return (2026-07-23) — restore, once the premises were checked**

Two premises inherited from the co-display cycle were wrong and were falsified before building. (a) The share leak was framed as *blocking* and *live*; in fact the Tanya answer cards (`curatedCardHtml`) carry no copy/share button, so the live demo has no conditional-verse egress — the leak is latent in the *non-deployed* `web/src`. (b) The "pair-duplication" the merge was meant to solve is architecturally impossible: `retrieve.ts` diversifies one-verse-per-feeling, and both pair members share a single theme, so they can never co-retrieve. The merge Erik chose was therefore dropped as dead code and the plan simplified to data + latent-leak hygiene.

- [x] ISC-215: all seven subjects carry a `codisplay` range in `PROBLEM_VERSES` — 41:35→[34,35], 92:7→[5,7], 20:25→[25,28], 20:26→[25,28], 106:4→[1,4], 23:60→[57,61], 23:61→[57,61]. VERIFIED: `rg` shows all seven entries with `codisplay: { range: … }`; applied via `apply-conditional-restore.ts`.
- [x] ISC-216: the five formerly-withheld refs are gone from `WITHDRAWN`; zero `condition-unmet` data rows remain. VERIFIED: `rg "condition-unmet" problem-verses.ts` returns only the type union (l.612) and the doc comment, no data rows.
- [x] ISC-217: the built `web/public/corpus.json` carries a non-empty `passage` on exactly these seven subjects and no others. VERIFIED: `bun` read → `with passage: 7`, ranges [34,35]/[5,6,7]/[25,26,27,28]×2/[1,2,3,4]/[57..61]×2. Corpus grew 184→191.
- [x] ISC-218: each restored verse's shipped `why` is the ustadz's `replacement` wording verbatim. VERIFIED: corpus `why` matches JSON `replacement`; curly-quote fidelity confirmed (`106:4` ships `Ka’bah` with U+2019).
- [x] ISC-219: the corpus build's co-display gates pass. VERIFIED: `bun run app:corpus` exits 0 after the fragment+backref gates learned the co-display lead-in exemption; every range contains its subject; `NEVER_TOGETHER` clean.
- [x] ISC-220: Anti: no pair is ever rendered duplicated, and the merge is NOT built — one-verse-per-feeling diversification makes the pairs mutually exclusive in one answer. VERIFIED: two `retrieve.test.ts` cases assert a StudyStress query yields ≤1 of {20:25,20:26} and a riya query ≤1 of {23:60,23:61}; empirically `["2:286","20:26"]` and `["23:60","3:139"]`.
- [x] ISC-221: the latent egress leak is closed — `shareText` includes every context ayah when `v.passage` is present. VERIFIED: `quran.test.ts` egress case; PROVEN to guard by neutralising the passage branch → the test goes RED, restored → GREEN.
- [x] ISC-222: Anti: `share-image.ts` cannot emit a passage-carrying verse as a bare card — it refuses the blob and `shareVerseImage` degrades to the passage-carrying text. VERIFIED: `renderVerseCardImage(conditional)` returns `null`; test asserts it.
- [x] ISC-223: full suite green and typecheck clean. VERIFIED: `bun test` → 823 pass / 0 fail (+5 new); `tsc -p web/tsconfig.json` → 3 errors, all the pre-existing origin/main baseline in `main.ts`/`themes.ts`, none in changed files.
- [x] ISC-224: co-display reaches ALL THREE answer lanes, not just the principled one. VERIFIED: principled hits and the AI/synthesis grounding cards both render `curatedCardHtml(v)` (demo.ts:347, :593) — the synthesis lane's own comment names this as "the lane that most needs the passage"; the reader/Beranda paths were pinned last cycle (ISC-207..213).
- [x] ISC-225: the seven render live with their passages on the deployed demo. VERIFIED 2026-07-23 — deployed `new-quranku-demo-proxy` (version `7575a233`) to `demo-quranku.axiara.ai`; Interceptor on the live site, study-stress query surfaced **20:26 via the AI/synthesis lane** rendering the full **20:25–28** passage in mushaf order (25 context → 26 subject with "Terjemahan Makna" + translator → 27/28 context, no neighbour re-captioned). Console clean, `.qk-verse` present. (DOM/text probe; the OS screenshot was blocked by a minimized Chrome window — text evidence is the stronger structural proof here.)

**Cycle 6 — corpus durability and remote truth (ISC-226..243, opened 2026-08-09)**

- [x] ISC-226: `~/printing-press/library/tafseer-okf` is a git repository. VERIFIED: `git init -b main`, initial commit `18916 files changed, 1263636 insertions(+)`.
- [x] ISC-227: a `.gitignore` at the corpus root excludes `cache/`, `node_modules/`, and `.DS_Store`. VERIFIED: file read back; the three `okf/**/.DS_Store` files are the exact delta between `find` and the staged tree.
- [x] ISC-228: the corpus working tree is clean after the initial commit. VERIFIED: `git status --porcelain | wc -l` → `0`.
- [x] ISC-229: the committed tree carries every `okf/` record. VERIFIED: `git ls-files okf` → **18,884**; the 3 missing against `find` are all `.DS_Store` (named individually via `diff`), and `rights-audit.ts` counts **18,882** records — the 2-file gap is non-record index files. Threshold corrected from the 18,887 raw `find` count, which had counted Finder metadata as records.
- [x] ISC-230: Anti: the 801M `cache/` directory is NOT committed. VERIFIED: `git ls-files cache | wc -l` → `0`.
- [x] ISC-231: Anti: `node_modules/` is NOT committed. VERIFIED: `git ls-files node_modules | wc -l` → `0`.
- [x] ISC-232: the machine rights gate survives the commit. VERIFIED: `git show HEAD:okf/tafseer/en/083/018-028.md` returns the record with `rights: {usage: reference-only, holder: Dorar Al-Saniyyah, commercial: prohibited}` intact.
- [x] ISC-233: `rights-audit.ts` exits 0 against the committed tree, still reporting zero distributable. VERIFIED: `EXIT=0`, `DISTRIBUTABLE AS-IS : 0 / 18882`, `✓ all invariants hold`, split 18,879 reference-only / 3 private.
- [x] ISC-234: `.git` stays under 400M. VERIFIED: `du -sh .git` → **122M**. Plain markdown compresses well; no LFS needed.
- [x] ISC-235: the "107 unpushed commits" claim is resolved into a true per-remote statement. VERIFIED: `git rev-list --count quran-new/main..HEAD` → **0** (main tracks `[quran-new/main]`, fully in sync); `git rev-list --count origin/main..HEAD` → **107**, where `origin` is `erikgunawans/nur`, the retired remote. Nothing is unpushed to the live remote. See Decisions 2026-08-09.
- [x] ISC-236: Erik has an explicit recorded decision on the `origin`/nur remote's fate. VERIFIED: 2026-08-09 — "Leave nur alone". No push; nur retained as a remote so the closed PR stays reachable. Recorded in Decisions.
- [x] ISC-237: Anti: nothing is pushed to the **nur repository** (`github.com/erikgunawans/nur`) absent Erik's explicit approval. VERIFIED: `git rev-parse nur/main` → `c4ff3ae3140a70df684299bc37ea407e3f138ae0`, unchanged. **Reworded 2026-08-10:** this criterion said "pushed to `origin` (nur)". The remotes were then renamed so `origin` names the LIVE repo (quran-new) and the retired one is `nur`. Left as-written, the anti-criterion would have forbidden pushing to the live remote — the exact inversion the rename was meant to prevent. Criteria must name repositories, not remote aliases.
- [x] ISC-238: `worktree-cozy-launching-clarke` rebases onto `main` carrying exactly its one commit. VERIFIED: `git rebase main` → "Successfully rebased"; `git log --oneline main..HEAD` → one line, `dd918f5 feat(peta): stand-alone graph + corpus rights research`.
- [x] ISC-239: the `package.json` conflict resolves keeping BOTH main's scripts and `app:peta-standalone`. VERIFIED: **no conflict actually occurred** — main's 107 commits never touched that region, so git auto-merged. `diff` of `.scripts` keys against main shows exactly one addition: `app:peta-standalone`. The handoff's predicted conflict was a prediction, not an observation.
- [x] ISC-240: the post-rebase suite matches main's baseline. VERIFIED: `bun test` → **999 pass / 0 fail**, 22,800 expect() calls, 64 files — identical to main measured in the primary tree the same hour.
- [x] ISC-241: the post-rebase build succeeds. VERIFIED: `bun run build` → `✓ built in 455ms`, `index-xpdk2-pk.css` 101.28 kB (the same CSS hash main deployed), `index-DpQxI_nn.js` 175.80 kB.
- [x] ISC-242: all five peta files survive the rebase. VERIFIED: `git diff --stat main..HEAD` → 5 files, 2,309 insertions. `bun run app:peta-standalone` regenerates `peta-tematik-standalone.html` **byte-identical** to the committed copy (13 kategori, 1,632 ayat, 518 penghubung) — the builder is reproducible against main's newer corpus.
- [x] ISC-243: Anti: the rebase drops none of main's commits. VERIFIED: `git rev-list --count HEAD..main` → `0`. Escape hatch retained as tag `pre-rebase-cc1e1a1`.

### Cycle 7 — the landing says the sentence only it can say (ISC-244..287, 2026-08-09)

> Two `$impeccable` critiques scored the landing 23/40 and the answer surface 24/40. Their shared
> finding is a hierarchy inversion: the surface renders the *generic* thing large and the
> *distinctive* thing small. "Belum bisa tidur?" — a greeting no competitor ships, written for the
> one reader awake at 2am — sat at 13.5px under a 52px "Tanya Apapun". The named scholar sat at
> 12.32px under a 16px filing category. This cycle inverts both, restores the seeds DESIGN.md's
> "empty states teach" rule has been binding against a deleted element, and turns the 46rem MEASURE
> from prose into a test — because **colour rules here are tests and layout rules are prose**, and
> that asymmetry is what let `.thread` drift to `max-width: none` and 954px cards.

**D1 — the greeting leads**

- [x] ISC-244: the time-aware greeting renders at display size — computed `font-size` of `#greet-la` on the live landing ≥ 30px.
- [x] ISC-245: "Tanya Apapun" is demoted below it — computed `font-size` of the tagline < the greeting's, measured in the same probe.
- [x] ISC-246: the greeting is authored at reskin specificity — `grep` finds the rule under a `.qk-panel-body` scope in `shell.css`, not styles.css alone.
- [x] ISC-247: the greeting carries the display family — computed `font-family` of `#greet-la` includes Fraunces.
- [x] ISC-248: `mountGreeting()` still writes into it after the tag change — live `#greet-la` textContent is non-empty.
- [x] ISC-249: Anti: the demotion does not orphan the brand gradient — exactly one hero element still paints `--hero-a`→`--hero-b`, confirmed in the computed `background-image`.
- [x] ISC-250: `greet.ts` is unmodified — `git diff --stat web/src/greet.ts` is empty (the copy was already right; only its size was wrong).

**D1b — the seeds return**

- [x] ISC-251: `.seeds` exists in `index.html` with 4 `.seed` buttons — `grep -c 'class="seed"'` = 4.
- [x] ISC-252: every seed is first-person Indonesian — read-back shows all four begin from the reader's own voice ("aku…", "lagi…", "baru…", "cemas…").
- [x] ISC-253: the stale comment claiming seeds were removed is gone — `grep 'With .seeds removed'` returns nothing.
- [x] ISC-254: `dockLanding()` now takes its `.seeds` branch — live DOM order inside `#hello` puts `#composer-bar` before `.seeds`.
- [x] ISC-255: `landing.test.ts:46` ("composer above the seeds") passes against real markup rather than a fixture-only element.
- [x] ISC-256: a seed click still asks — `main.ts:812` `.seed` handler resolves on the live page (click → composer populated / request fired).
- [x] ISC-257: Anti: the seeds do not push the composer below the fold at 1280×800 — composer bottom edge < viewport height on glass.

**D2 — attribution over filing category**

- [x] ISC-258: `.by b` computes to 14px on the answer surface — live `getComputedStyle` reads `14px`.
- [x] ISC-259: `.by b` weight is 600 and colour is `--ink-2` — computed values match the token's resolved rgb.
- [x] ISC-260: `.chip` no longer shouts — computed `text-transform` is `none`.
- [x] ISC-261: `.chip` letter-spacing is `normal` — computed value, not the authored 0.06em.
- [x] ISC-262: the named scholar out-sizes the category — `.by b` computed px > `.chip` computed px in the same probe.

**D3 — the MEASURE becomes a test**

- [x] ISC-263: `.thread` computes `max-width: 736px` (46rem) on the live answer surface, not `none`.
- [x] ISC-264: the rule is authored at reskin specificity — under `.qk-panel-body` in `shell.css`.
- [x] ISC-265: the thread is centred — computed `margin-inline` resolves to `auto` on both sides.
- [x] ISC-266: a card no longer runs 954px — measured `.msg`/card width on glass ≤ 736px.
- [x] ISC-267: **a test enforces it** — a new case in the layout suite fails if `max-width` leaves `.thread`.
- [x] ISC-268: the new test passes — `bun test` names it in the green output.
- [x] ISC-269: Anti: the 46rem clamp does NOT reach the landing — DESIGN.md:93 exempts the landing at 1120px; `#hello` width is unchanged on glass.
- [x] ISC-270: Anti: the clamp does not reach `#read` — the reading surface's computed width is unchanged.

**D4 — un-rank the scholars**

- [x] ISC-271: no reader-facing tier ranking ships — `grep 'tier '` in `tafsir.ts` returns nothing in the rendered template.
- [x] ISC-272: the era survives — the `.tier` span still carries `src.era`, so the reader learns *when*, not *which rank*.
- [x] ISC-273: `authority_tier` stays in the data — it orders the stack; only its display is dropped. Confirmed by `grep` in the sort path.
- [x] ISC-274: Anti: no scholar is dropped — the rendered count equals the tafsir count for the probed ayah.

**D5 — landing debt, evidence before fix**

- [x] ISC-275: the brand mark is right-sized — `quranku-mark.png` under 40KB while still rendering crisp at 2× its 46px box.
- [x] ISC-276: `/favicon.ico` no longer returns the SPA shell — `curl -sI` shows an image content-type, or an explicit icon link resolves.
- [x] ISC-277: `#display-panel` is adjudicated with evidence — the `[hidden]{display:flex}` at `styles.css:409` is shown to be the documented desktop-inline behaviour, and NOT "fixed".
- [x] ISC-278: the heading claim is adjudicated — live `document.querySelectorAll('h1,h2,h3,h4,h5,h6').length` is reported as measured, and the greeting's re-tagging is judged against it.
- [x] ISC-279: Anti: no critique line is actioned as a fix before it is reproduced on glass — every D5 item carries a probe result, including the ones that turn out to be false positives.

**Build, ship, and the standing rails**

- [x] ISC-280: `bun test` stays green — pass count ≥ 999 plus the new MEASURE test, 0 fail.
- [x] ISC-281: `bun run build` exits 0 — because `bun test` never compiles CSS and a broken comment has passed 999 tests before.
- [x] ISC-282: the deployed CSS/JS filenames on prod differ from `index-xpdk2-pk.css` / `index-D7CyoCrn.js`, proving the deploy landed. VERIFIED 2026-08-10: `new-quranku.axiara.ai` serves `index-CLV41V3N.css` + `index-CbtcXzU2.js` (Worker version `b2f82372`), both different from the pre-deploy pair, and the CSS hash matches the local build byte-for-byte. Token read-back on the live page under CDP `emulate {colorScheme:light}` with `visibilityState: visible`: `--shell-bg oklch(99% .003 172)`, `--surface oklch(100% 0 0)`, `--primary oklch(41.6% .132 163)`.
- [x] ISC-283: every glass probe asserts `document.visibilityState === "visible"` inline — a null from a hidden document is the harness, not the product.
- [x] ISC-284: Anti: nothing is pushed to the **nur repository** — `git rev-parse nur/main` unchanged at `c4ff3ae`. **Reworded 2026-08-10** for the same reason as ISC-237: it previously said "pushed to `origin` (nur)", and `origin` now means the live repo.
- [x] ISC-285: Anti: the answer engine, corpus, and `#read` are untouched — `git diff --stat` lists no file under `retrieve`/`corpus`/the reading surface's logic.
- [x] ISC-286: Anti: no backticks in the commit message — `git log -1 --format=%B` reads back complete, with no silently deleted fragments. VERIFIED 2026-08-10: all four of this session's commits (`e998ba1`, `01d567d`, `4306c55`, `1079785`) read back with a backtick count of 0; messages were authored with `--` and plain quoting instead of code spans.
- [x] ISC-287: DESIGN.md is amended, never contradicted — the MEASURE section gains the enforcement note rather than a new competing rule.

### Cycle 6 — Tanya as a continuous agent, grounded in OKF (ISC-313..349)

Opened 2026-08-10. Plan of record is `.scratch/tanya-agent/PRD.md` (17 decisions). This cycle covers
Phase 1 only — the text layer, the rerank stage, the `bad_hadith` wall and the hadith card. Continuity,
the tool loop, multi-turn eval and the main-app flip are later phases and have no ISCs yet.

**The text layer, and the rights posture it has to preserve**

- [x] ISC-313: `bun run okf:text` exits 0 and writes `data/okf/text/rerank-en.json.gz` plus `data/okf/text/display/`.
- [x] ISC-314: the rerank blob and the display shards describe exactly the same record set — key count `=== 14735 ===` display record count. **Corrected 2026-08-10** from a flat `=== 14736`: the upstream corpus has one Arabic-only record, and the right invariant is that the two artifacts AGREE, not that they hit a number written down before the data was read.
- [x] ISC-315: every display record carries BOTH a non-empty `arabic` and a non-empty `english` — the card shows the sourced artifact, and half of it is not the artifact.
- [x] ISC-315.1: RETRIEVABLE ≡ DISPLAYABLE — a record with no English is excluded from the rerank layer as well as from display, and `searchDalil` drops any candidate absent from the text layer. Otherwise the model can cite an undisplayable record by marker, the guard resolves it, and the renderer drops the card: a prophetic attribution with nothing behind it.
- [x] ISC-316: every display record carries a non-empty `translator`, read from the record's own english rights layer — the corpus has no `translator:` key, so a card crediting "sunnah.com" would be crediting the wrong party.
- [x] ISC-317: Anti: no record carrying `rights_usage: private` appears in either artifact — the text layer must not become a way to reach what the index refuses to return.
- [x] ISC-318: Anti: neither artifact is in git — `git check-ignore` names the rule for both. This repo is public and these records are `reference-only`.
- [x] ISC-319: both artifacts are readable from the private `okf-corpus` bucket under the manifest's `corpus_digest` prefix — proven by the live probe rendering two cards with Arabic, English, `source_url` and translator credit fetched from R2, not merely by the upload reporting success.
- [x] ISC-320: the committed `docs/reference/okf-manifest.json` digest and the digest the text layer was built under are the same string — a text layer paired with a different corpus revision than the index is undetectable otherwise.
- [x] ISC-321: Anti: the R2 bucket stays private — no `r2.dev` public access, no custom domain.

**The rerank stage — and the recall bug it actually fixes**

- [x] ISC-322: `CANDIDATE_K` in `worker/src/dalil.ts` is `≥ 40`. Not a tuning knob: the canonical regression case's correct record sits at cosine rank 28, so a narrower window reintroduces a named, reproducible failure.
- [ ] ISC-323: through the live Worker path, `gimana hukumnya meninggalkan sholat` returns `hadith-muslim-154` ("Clarifying the usage of the word Kafir for one who abandons Salat") at rank 1. **NOT MET as written, 2026-08-10.** Live rank 1 is Bukhari 540, *"The sin of one who misses the 'Asr prayer (intentionally)"* — on-topic and defensible, but not the named record, which does not appear in the live top-8 at all. See ISC-323.1; do not mark this `[x]` on the strength of the outcome being better.
- [x] ISC-323.1: the named false friend is no longer rank 1 — *"leave or depart from the right and from the left after finishing the Salat"* has been displaced. Its live analogue, Muslim 1534 (*"permissible to leave to the right or left after finishing the prayer"*), now sits at rank 8 with the lowest rerank score in the set.
- [ ] ISC-323.2: explain why the live candidate set differs from the offline reproduction over the same vectors — offline cosine ran 0.51–0.59 and surfaced Muslim 154 at rank 28; live scores run 0.43–0.50 and surface a different set. Until this is understood, no offline retrieval measurement may be quoted as evidence about live behaviour.
- [x] ISC-324: through the live Worker path, `berapa rakaat sholat dhuha yang benar` still returns a Duha hadith at rank 1 — the fix must not buy the regression case with a regression elsewhere.
- [x] ISC-325: the rerank document is the citation line PLUS the English body. Measured 2026-08-10: citation-line-only reranking does not fix the regression case, because inside a 50-candidate window most bab titles are prayer-related.
- [x] ISC-326: `searchDalil` returns at most `MAX_RETRIEVE` hits after reranking.
- [x] ISC-327: `MAX_DISPLAY` is still 2 and `capForDisplay` still slices to it — widening RETRIEVAL breadth must not widen DISPLAY breadth.
- [x] ISC-328: Anti: no similarity score and no rerank score is compared against a threshold anywhere in `dalil.ts`. Both bands overlap between right and wrong hits; any `score > X → trustworthy` design is invalid on this corpus.
- [x] ISC-329: every stage throws on failure rather than degrading to cosine order — silently serving the unreranked list restores exactly the defect the stage exists to remove.
- [x] ISC-330: the rerank blob is held at module scope and fetched once per isolate, not once per candidate.
- [x] ISC-331: Anti: `worker/wrangler.toml` is untouched — the principled edition's surface stays exactly as it is until the ustadz-gated flip (PRD decision 11).
- [x] ISC-332: the `CORPUS` R2 binding and `CORPUS_DIGEST` exist only in `worker/wrangler.dalil-probe.toml`.
- [x] ISC-333: Anti: no scripture text is added to Vectorize metadata — the index still carries identifiers, citation data and rights fields only.

**`bad_hadith` — the fourth HARD rule (PRD decision 8)**

- [x] ISC-334: `bad_hadith` is a member of `AnswerViolationKind`.
- [x] ISC-335: a prophetic attribution with no marker at all is rejected.
- [x] ISC-336: the same attribution passes when a marker resolves against this turn's grounding.
- [x] ISC-337: a marker naming a hadith NOT retrieved this turn is rejected — the hadith analogue of `bad_ref`.
- [x] ISC-338: one resolvable marker does not license a later unmarked attribution — sentence-scoped, exactly like `fatwa`.
- [x] ISC-339: the rule defaults to rejecting attribution when no grounding predicate is supplied — a caller that forgets to pass grounding must fail closed.
- [x] ISC-340: `HR. Bukhari` is caught despite the full stop inside the abbreviation splitting the sentence.
- [x] ISC-341: a marker written after the sentence's full stop still acts as that sentence's receipt — the natural place to write a citation must not be the place that fails.
- [x] ISC-342: Anti: the rule does not fire on compliant prose that merely mentions hadith ("aku bukan ahli hadits, tanyakan pada ustadz") — a word list would reject exactly the answers that obey.
- [x] ISC-343: ﷺ (U+FDFA) and ﷻ (U+FDFB) alone do not trip the `arabic` rule. Before this exception the app's own intended voice from PRD decision 2 was unshippable.
- [x] ISC-344: Anti: real Arabic script alongside an honorific still fails the `arabic` rule — the exemption is two codepoints, not a hole.

**The hadith card (PRD decision 2)**

- [x] ISC-345: the card renders Arabic verbatim, marked `dir="rtl"` and `lang="ar"`.
- [x] ISC-346: the card renders the English verbatim.
- [x] ISC-347: collection, number and grade all appear on the card.
- [x] ISC-348: `source_url` renders as an outbound link carrying `rel="noopener noreferrer"`.
- [x] ISC-349: the translator credit appears on every card, labelled as the translator's work and never as the app's.
- [x] ISC-350: Anti: no Indonesian line renders unless that specific record carries an ustadz-approved `reviewed_id` — approval is granted one hadith at a time, so it cannot be a global flag.
- [x] ISC-351: the display cap holds inside the renderer too, whatever the caller passes — a rights position that lives in one function is one refactor away from being lost.
- [x] ISC-352: hostile text in any corpus field cannot inject markup.

**Regression gates for this cycle**

- [x] ISC-353: `bun test` is green on a checkout that HAS `web/public/corpus.json` and `node_modules`. **MET on the merged tree, 2026-08-10 (evening): exit 0, `1064 pass / 0 fail` across 69 files, run twice.** And the `GlobalRegistrator` collision is now DIAGNOSED rather than merely absent — it was never an independent infra defect. All seven DOM suites register unguarded but each `unregister()`s in `afterAll`, and Bun runs files sequentially in one process, so the pairs balance; that is why the suite is green here AND why each file passed alone. The collision therefore requires a suite to ABORT before its `afterAll` runs. Proven, not assumed: a throwaway probe that registered and then threw at module scope made the very next DOM suite die with branch B's exact string, `Failed to register. Happy DOM has already been globally registered.` So branch B's 10 ERRORS were the primary failure and the 8 "collisions" were its downstream cascade — most likely the documented worktree hazard (missing `data/` + `node_modules` symlinks) making corpus-dependent suites throw at load. **The proposed `bunfig.toml` preload fix is REJECTED** — a global preload forces a DOM onto every suite in the repo and makes registration succeed so uniformly that the abort stops being visible. But rejecting it and stopping there was wrong, and the advisor call caught it: I first wrote "the loud cascade is the signal," which is backwards. The cascade BURIES the signal — one legible red becomes eight illegible ones, and the seven innocent suites are the loud part, so the next person with a real failure in `peta.test.ts` goes hunting through Happy DOM. And *any* abort triggers it (assertion throw, unhandled rejection, OOM), not only the symlink case — so the symlink story was today's trigger, not the mechanism. Closed by `web/src/test-dom.ts`: `registerDom()`/`unregisterDom()`, idempotent in both directions, adopted by all seven suites. Verified by force-red, not by assertion — an abort probe that previously produced `0 pass / 2 fail` with the registration error now produces `111 pass / 1 fail / 1 error` and zero registration errors across all seven. The aborting file fails alone.
- [x] ISC-353.2: Anti: the abort-proofing does not make an aborting suite quieter — force-red confirms the aborting file still fails, with its own error text, and is the only failure.
- [ ] ISC-353.0: [SUPERSEDED by ISC-353 above — kept for the trail] **NOT MET, 2026-08-10, and the handoff's premise was only half right.** With both artifacts present the suite goes 21 fail/18 err → **890 pass / 10 fail / 10 err**, so the corpus explained 11 of 21. The residue is NOT missing artifacts: eight DOM test files (`landing`, `split`, `peta`, `bookmark`, `hadith`, `migrate-storage`, `surah-intro`, `thread`) collide on `GlobalRegistrator.register()` when run in one process. `landing.test.ts` alone passes 26/26. This repo has **no `.github/` and no CI**, so PR #3's gate is this local run and it is currently red.
- [x] ISC-353.1: Anti: none of the failures are this cycle's work — all eight errored files are pre-existing DOM suites, and the four new suites (`answer-guard`, `answer-guard-hadith`, `hadith-card`, plus the existing guard suite) are 46/46 green.
- [x] ISC-354: `bun run typecheck` exits 0. **MET, 2026-08-10 (evening).** All three `tsc` passes clear; verified by redirect + `echo $?`, never a pipe. Eight errors were fixed in three tranches, each unmasked by the previous — the `&&` chain reports only the first failing pass, so "4 errors" was never the total. Tranche 1 (`web`): `main.ts:155` TS2366 was the only structural one — `count-defer` entered the SHARED `Turn` union in `db87a66` for the demo, which persists it through the same `rememberTurn`/`loadThread`, but only `web/demo/demo.ts` imports `looksLikeCount()`, so `renderTurn` in the main app silently stopped being total; a non-total renderer is how a stored turn becomes a blank bubble. `passage` widened to `?: T[] | undefined` (real corpus state; all 7 readers use `?? []`/`?.length`). `peta.ts` `MIN_H` deleted — superseded by CSS `min-height` (108/128/132, not 84) — and the comment documenting it amended so the file stops describing a constant it no longer has. Tranche 2: `tafsirStack` — NOT widened, because `tafsirStackHtml()` never returns undefined; the `undefined` was an artifact of indexing a parallel array, so the fix carried the stack WITH its verse. Tranche 3 (`src/eval`, which pulls in `worker/`): `auth.ts` narrowed by check not cast (it is the token verifier); `distill.ts` binds the head instead of length-testing then indexing; `proxyToOrigin` EXPORTED rather than deleted — it is retained-on-purpose as the documented one-line revert to Cloud Run (`index.ts:58,61,199`), and deleting it to satisfy `noUnusedLocals` would have deleted a rollback affordance.
- [x] ISC-354.1: Anti: no typecheck error is in a file created this cycle — `build-text-layer.ts`, `hadith-card.ts`, `dalil.ts` and `answer-guard.ts` are all clean.
- [x] ISC-355: Anti: nothing is deployed — prod Worker versions unchanged. Prod deploys are Erik's call.

### Cycle 6 — the merged build shipped, and a doa section that owns no text (ISC-356..369)

- [x] ISC-356: the merged Tanya workstream's hadith card is proven ABSENT from the built bundle, by a falsifiable probe rather than a symbol grep. **MET.** Minifiers rename module-level symbols, so `grep MAX_DISPLAY_CARDS` could never have failed informatively. Re-run on string literals with a working positive control: `bersabda` (from `answer-guard`, which IS imported) = 1 in the deployed bundle, while `tidak ada hadits` and `Sahih Muslim 154` (both runtime strings in `hadith-card.ts`) = 0.
- [x] ISC-357: the new `bad_hadith` guard is proven unreachable on the trustworthy edition. **MET.** `web/src/answer.ts` is the synthesis orchestrator, `new-quranku-ai` only; the live Worker reports `EDITION: "principled"`.
- [x] ISC-358: prod serves the merged build, verified by served bytes not by deploy success. **MET.** `index-CH3JlSGK.js`, 189,271 bytes, SHA-256 identical to `web/dist`; not the ~15.5 kB SPA fallback.
- [x] ISC-359: Anti: the deploy did not contaminate the trustworthy edition with synthesis. **MET.** `synthesis` occurs once in the bundle (the dead comparison Vite collapses); prod `POST /api/answer` returns `{"answer":null}`; CSS hash `index-CsxJlLtp.css` byte-identical to pre-deploy prod.
- [x] ISC-360: Anti: no root `wrangler.jsonc` shadowed the deploy — absent at deploy time; deploy ran from `worker/`.
- [x] ISC-361: a "Kumpulan Doa" nav item exists AND resolves to a working route. **MET.** `#nav-doa` in `web/index.html`, five wiring points in `main.ts`, screenshot at `#/doa` renders 7 cards with zero console errors.
- [x] ISC-362: every doa reference resolves in the shipped corpus with Arabic present. **MET.** 34/34.
- [x] ISC-363: every doa reference carries BOTH Indonesian translations the reading surface renders. **MET.** 34/34 have `p.text` and `c.text`.
- [x] ISC-364: Anti: `web/src/doa.ts` reproduces no scripture — no Arabic script anywhere in the module, checked as a Unicode SCRIPT range, not a word list.
- [x] ISC-365: Anti: the RENDERED section shows no Arabic either — guards the case where text enters via the renderer rather than the data.
- [x] ISC-366: Anti: `renderDoa` fetches nothing — proven with a Proxy over the real `fetch` that counts calls. Locks the claim that the section owns no data.
- [x] ISC-367: the doa guards are falsifiable, not vacuous. **MET by force-red:** injecting `QS 1:999` and one Arabic word failed exactly four tests (ref-resolution, both-translations, module-Arabic, rendered-Arabic); restoring returned 12/12.
- [x] ISC-368: every doa chip targets the detail route `main.ts` already parses — asserted against `/^#\/surah\/\d{1,3}#\d{1,3}$/`, and walked end-to-end in a browser (QS 21:87 → Yunus' du'a with Arabic + translation).
- [x] ISC-369: the ustadz gate on the 34 pairings. **MET 2026-08-11 by VERBAL agreement from Ustadz Ahmad, per Erik, who instructed ship.** Recorded as verbal rather than collapsed into a written sign-off — there is no written confirmation in-repo, and `docs/review/doa-provenance.md` says so plainly, so the standing heads-up-is-not-sign-off distinction survives in the trail. Revising any pairing later is an edit to `doa.ts` plus a redeploy, because the section holds references only.
- [x] ISC-370: a provenance record for the 34 pairings exists in `docs/review/`. **MET.** `docs/review/doa-provenance.md` records what the section contains, why nothing was vendored, the rejected proxy path, equran.id's actual published terms (the handoff's "no terms" premise was wrong), the derivation method, and the fact that 14 of the 34 pairings have no ustadz review behind them.
- [x] ISC-373: Anti: no label reproduces the meaning of its ayah. **Found VIOLATED by adversarial review after the section was already on main, then fixed.** Four labels shared a verbatim 4-word span with the Kemenag or Thalib translation ("Dialah yang menyembuhkan aku", "dan aku belum pernah kecewa", "aku dan kedua orang tuaku", "Kebaikan di dunia dan") on a card whose own note reads `Judulnya kami yang menulis; lafal dan artinya bukan`. Legal exposure nil — both translations render in full one click away — but the note was false. 23 labels rewritten to name the occasion.
- [x] ISC-374: the label guard is falsifiable. **The prior one was not:** `label.length <= 64` with a longest label of 54 is a bound set above everything that exists and can never fire. Replaced with a 4-word overlap check against the ayah's own two translations; force-red verified by re-injecting the exact span that shipped.
- [x] ISC-375: the Arabic guard covers Arabic Extended-A (U+08A0–08FF), where the Quranic annotation signs live. The hand-written ranges missed it; `\p{Script=Arabic}` does not.
- [x] ISC-376: Anti: `doa.ts` reaches no network API, checked at SOURCE with comments stripped. The prior `fetch` spy was a sieve — a module-scope alias binds before the spy installs, a deferred fetch resolves after the synchronous assertion, and XHR never touches `fetch`.
- [x] ISC-377: the chat composer is present on `#/doa`. **It was NOT, and neither on `#/hadis` nor `#/fikih`** — a route missing from `isChatRoute` classifies as chat, so `showRead()` docks `#composer-bar` into `#hello` inside `#chat` and then hides `#chat`. Invisible for weeks because it was CONSISTENT across all three. One line; verified in-browser on prod.
- [x] ISC-378: Kumpulan Doa is LIVE. Prod `index-CTJQixra.js`, 193,867 B, SHA-256 identical to `web/dist`; `id="nav-doa"` present in served HTML; the two retired translation spans return 0 in the deployed bundle.
- [x] ISC-371: the ISC-323.2 probe config can start at all. **MET.** It could not: `wrangler dev` refuses without `preview_bucket_name`, so the command documented in the handoff had been broken since the R2 binding landed. Fixed to point at the same bucket deliberately — the probe only reads, and a stand-in corpus cannot testify about live behaviour.
- [ ] ISC-372: **NOT MET — ISC-323.2 remains open, but its blocker is now two named causes rather than one unknown.** With the config fixed, bindings resolve (`VECTORIZE: okf-hadith`, `CORPUS: okf-corpus`) and startup fails at "Could not create remote preview session on your account" — a Cloudflare-side/account-scope failure, distinct from the config bug. `wrangler whoami` is healthy (OAuth, `erik@axiara.ai`). Stopped after two attempts rather than looping.

### Cycle 7 — recitation becomes audible (ISC-379..390)

The corpus half of this shipped as an ingest on 2026-08-12: 6,236 ayahs into R2 `new-quranku-audio`.
None of it was reachable. `web/src/audio.ts` gated playback to four surahs and the Worker had no
route, so the bucket was a private archive of something the app already refused to offer. This
cycle is the route plus the gate, deliberately as ONE change — widening the manifest first would
have made `nextWithAudio` promise files no route could serve, which is ISC-306 exactly.

- [x] ISC-379: Anti: the audio binding does not smuggle in the dalil surface — `wrangler deploy --dry-run` lists `AUDIO: new-quranku-audio` as the only R2 binding, and no `VECTORIZE`/`CORPUS`/`CORPUS_DIGEST`. **This ISC exists because ISC-331 said `worker/wrangler.toml` is untouched, and this cycle touches it.** ISC-331 was written to keep the Vectorize index and `okf-corpus` off the trustworthy edition until the ustadz-gated flip; it was not written about recitation. Rather than reinterpret an anti-criterion to fit the work, the protected thing is restated here as its own probe, and ISC-331 is superseded on its literal wording only. Erik notified in-session.
- [x] ISC-380: Anti: `synthesis` and `demo` do not inherit the bucket — `--dry-run --env synthesis` lists no R2 binding at all. wrangler prints a warning urging the binding be added to `env.demo`; **the warning is the intended state** and the toml says so, or a future reader "fixes" it by putting a 991 MB bucket behind two Workers with no reason to serve recitation.
- [x] ISC-381: Anti: the fallback never serves an HTML page as an MP3. `not_found_handling = "single-page-application"` makes `ASSETS.fetch("/audio/2/5.mp3")` return `index.html` at **status 200**, so the natural "assets first, fall back on 404" design could never have fired its fallback and would have handed the `<audio>` element a web page. Order inverted to R2-first, and the assets answer is accepted only on a `Content-Type` containing `audio` — never on status.
- [x] ISC-382: the 22-file static sample still resolves after the change — `web/dist/audio/**/*.mp3` counts 22 after a clean build, and with the `AUDIO` binding absent the route collapses to exactly today's behaviour.
- [x] ISC-383: `hasAudio` claims exactly 6,236 positions — counted by iteration in `audio.test.ts`, not asserted from the surah index it is derived from.
- [x] ISC-384: the widening costs zero bundle bytes — `SURAH_INDEX` already inlines every ayah count as the truth oracle, so the manifest literal was deleted rather than grown to 6,236 entries.
- [x] ISC-385: the corpus bound is falsifiable. **Force-red verified:** changing `ayah <= count` to `ayah <= count + 1` fails exactly 3 tests (the 6,236 count, the never-claims bound, and the surah-boundary stop); restoring returns 12/12.
- [x] ISC-386: Anti: auto-advance still stops at the surah boundary — `nextWithAudio(2, 286)`, `(9, 129)`, `(114, 6)` all return null. The full corpus makes this guard MORE load-bearing, not decorative: rolling An-Naas into Al-Faatiha would be the app deciding what someone is reciting.
- [x] ISC-387: Anti: a non-position is never offered a file — `hasAudio(1, 1.5)`, `(1, 0)`, `(1, NaN)`, `(0, 1)`, `(-1, 1)` are all false. `/audio/1/1.5.mp3` is not a key the ingest ever wrote.
- [x] ISC-388: gates green on the changed tree — `bun run typecheck` exit 0, `bun test` 1113 pass / 0 fail, `bun run build` exit 0, all checked by exit code and not by reading output.
- [x] ISC-389: the ingest journal reaches 6,236 successful objects. **MET.** The first run ended at 6,231 with 5 transient Cloudflare 520s; one rerun of the same command retried exactly those and no others (7:127, 9:70 and 113:3 among them), reaching 6,236/6,236 at 818.3 MB — under the ~991 MB projection. The journal records successes only, verified by both known failures being ABSENT from it mid-run, so `count === 6236` is a sound completeness gate rather than a hopeful one.
- [x] ISC-390: recitation is audible in production for ayahs outside the old sample. **MET, by round-trip not by deploy success.** Seven live probes (1:1, 2:255, 7:127, 9:70, 113:3, 36:1, 114:6) all return 200 `audio/mpeg` with sha256 matching the journal — including all three that had failed and been retried. Version `aeb13a9d`.
- [x] ISC-391: Anti: no plain GET answers 206. **Found VIOLATED by audit before deploy, in code that read as textbook R2 range plumbing.** `obj.range` is ALWAYS populated — R2 substitutes `{offset: 0, length: size}` when the client sent no Range — so `obj.range ? 206 : 200` could only ever choose 206. Confirmed in the R2 simulator's own source (`if (range === void 0) r2Range = defaultR2Range`), not inferred from behaviour. Cloudflare never stores a Worker-returned 206, so `immutable` would have been dead on arrival across all 6,236 objects: every play of every ayah reaching R2 forever. Live GET now reports `HTTP/2 200` with `cache-control: public, max-age=31536000, immutable`.
- [x] ISC-392: Anti: an R2 throw never reaches the reader as HTML. The route had no `try`/`catch`, and neither does `route()` nor the `fetch` handler — so a throw escaped to Cloudflare's 1101 error page, which is HTML. That is the SAME failure ISC-381 was written to prevent, reintroduced one layer down by the code that prevents it. Caught and closed with a catch returning 404.
- [x] ISC-393: HEAD reports the true length. **Two defects, the second caused by fixing the first.** `writeHttpMetadata` does not write `Content-Length` (R2HTTPMetadata has no such field), so a HEAD reported a zero-length file and a player would treat the ayah as empty. Setting it explicitly and routing HEAD through `head()` then produced a NEW bug — `head()` returns a bodyless object, and the GET branch reads "no body" as "onlyIf refused", so every HEAD answered **304**. Found only by probing the live deploy; the code reads correctly. HEAD and GET now sit on separate branches sharing one `audioHeaders()`. Live: `HTTP/2 200`, `content-length: 416704`.
- [x] ISC-394: the corpus renders as buttons, not just as objects — `#/surah/2` shows **286** elements carrying `data-act="play-menu"`/`"play"`, exactly Al-Baqarah's ayah count, where before the deploy there were zero.
- [x] ISC-395: an ayah outside the old sample actually PLAYS in real Chrome — `2:255` reaches `loadedmetadata` with `duration = 52.0s`. **The first probe of this said STALL, and a control is the only reason it was not filed as a regression:** `/audio/1/1.mp3`, the untouched sample that has served production for a month, stalled identically. Background tabs throttle media loading; foregrounding the tab resolved both. A failing probe with no control is not evidence of a failure.
- [x] ISC-396: Anti: the deploy did not contaminate the trustworthy edition — prod `POST /api/answer` returns `{"answer":null}`, served bundle `index-C8A5wC4f.js` is SHA-256 identical to `web/dist`, the CSS hash is UNCHANGED from pre-deploy prod (JS-only delta), and the synthesis Worker still answers 200 on its own host.
- [x] ISC-397: Anti: a non-existent ayah returns a hard 404, never the SPA shell. **This was live on production before the deploy and is the whole reason ISC-306 forbids widening the manifest first:** `/audio/2/255.mp3` returned `200 text/html`, 20,444 bytes — the SPA shell dressed as an MP3. It went unnoticed only because `hasAudio()` rendered no button there. Now `2:287`, `9:130`, `115:1` and `1/1.5` all return `404 text/plain`.
- [x] ISC-398: the reciter is named on the reading surface. **MET — and the starting point was worse than "not enough attribution": there was NONE.** `RECITER_NAME` had been exported since the 22-ayah sample and imported by NOTHING, so it tree-shook out — `grep -c Alafasy` on the deployed bundle returned **0** while the app served 818 MB of his recitation. The app's own meta description promises *"Setiap sumber disebutkan namanya"*, which was therefore false about the recitation. Erik chose per-surah + source (2026-08-12). Live on `#/surah/18`: `Murotal oleh Syaikh Mishary Rashid Alafasy · sumber everyayah.com`. Bundle count 0 → 1 for both `Alafasy` and `everyayah`, so the credit survives tree-shaking.
- [x] ISC-399: the licence status is a recorded DECISION, not an oversight. **MET.** Erik, 2026-08-12, asked explicitly once exposure went 22 → 6,236 files: the UNVERIFIED everyayah licence is an ACCEPTED, DOCUMENTED risk. Written into `web/src/audio.ts` beside `AUDIO_SOURCE` as well as here, so the next person to edit that file sees a decision someone made rather than a gap nobody noticed. **Attribution does NOT confer permission** — naming everyayah.com credits a source whose redistribution terms are unconfirmed; resolving that is separate work, deliberately not done.
- [x] ISC-411: production authors. **MET 2026-08-12, Erik's explicit call.** `EDITION = "synthesis"` on `new-quranku-proxy`; live `POST /api/answer` returns authored prose where it returned `{"answer":null}` the same afternoon.
- [x] ISC-412: the front end actually USES it — both halves shipped. **MET.** Verified by the inlined literal in the served bundle (``function ss(){try{return `synthesis` ``), not by a string grep: `synthesis` occurs exactly once in BOTH editions' bundles, so the count proves nothing and the constant-folded value proves everything.
- [x] ISC-413: an authored answer renders its cited verses as real cards. **MET after a live failure.** First deploy showed prose + *"ayat-ayat di atas"* with **zero** cards, because `aiHtml` resolved refs against the 191 curated verses only. Now `#/` → *"kenapa kita harus salat lima waktu"* renders 3 prose paragraphs and **3 verse cards (4:103, 2:45, 2:3) with Arabic present**, measured in real Chrome on production.
- [x] ISC-414: Anti: the AI note never points at verses that are not there. **MET.** `AI_NOTE_NO_VERSES` drops "di atas" when no card rendered; an unloadable shard is dropped rather than faked.
- [x] ISC-415: Anti: unlocking warmth did not unlock rulings. **MET by unchanged code** — `fatwaShape` (`answer-guard.ts:182`), retrieval-only grounding, and the AI-composed label are all untouched by the flip; the deploy output confirms only `EDITION` changed.
- [x] ISC-416: an authored answer over a WRONG retrieval is not shipped as if it were right. **MET — but by a mechanism this criterion assumed was impossible, so read the evidence before trusting the tick.** The premise was *"synthesis DRESSES retrieval"*. Falsified live 2026-08-12: `POST /api/answer` for `boleh ga sih nikah beda agama?` with the grounding **forced to QS 4:25** returned an answer citing **2:221, 5:5, 60:10 and never once mentioning 4:25**. The model does not dress bad retrieval; it overrides it. Across 12 live questions the prose cited `4:11` for warisan and `24:32 / 4:21` for nikah siri — the 4:25 caption reached the reader in none of them. See ISC-418: this tick is a symptom of a larger and worse fact, not a clean pass. **AMENDED 2026-08-13:** the override behaviour is now measured rather than inferred from one question — the probe's decoy arm hands the model an unrelated REAL ayah and it is taken only 26% of the time overall, **11%** on hukum. So this tick is sound and the mechanism is general. What did NOT survive is the inference drawn from it in ISC-418; read that criterion's amendment before citing this one as evidence that grounding is inert.
- [x] ISC-418: grounding is retrieval-only. **MET 2026-08-13, and the route to it went through a falsified diagnosis — read the whole entry before citing it.** Erik ruled: bow out rather than author from nothing. `hasGrounding` (`answer-contract.ts`) is called by the Worker after `verifyGrounding` and by the browser before the network call, so forged grounding can no longer buy an answer either. **Verified live on prod worker `23f0ad17`** in real Chrome: *"cara ganti oli motor beat"* now renders *"Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak"* with NO `/api/answer` request at all, while *"aku sedih banget rasanya"* still answers in full and *"apa hukum riba dalam islam"* still reaches the entries-only knowledge lane — the two controls that prove the bow-out did not silence the app. THE LEG THAT USED TO BE OPEN: the model never bowed out — **46 of 46** samples handed NO grounding answered anyway, 35% reaching the fitting ayah from parametric memory. THE LEG THAT WAS NEVER REAL: *"the model is not reading our grounding, so every retrieval fix is invisible"* is **false**. Same question, three arms, prod's model/prompt/params, 16 cases × 3 samples: grounded **96%** cite the ayah they were handed vs a **35%** blank control — a **+61 pt lift**, and it HOLDS on fiqh (`+53`) where the model's priors are strongest, not just on feelings (`+66`). The 2026-08-12 QS 4:25 probe measured the model overriding grounding that was WRONG, which the decoy arm reproduces exactly: an unrelated real ayah is taken only 26% of the time, and on hukum only 11%. Retrieval fixes, curated pins and topic corrections are worth 61 points of citation control on the authored path. ORIGINAL TEXT, kept because the reasoning it recorded is what the control overturned: `POST /api/answer` with **no `verses` and no `entries` at all** returns a complete fiqh answer (measured: the ahli-kitab/5:5 + 2:221 ruling). `worker/src/index.ts:495-497` says so in a comment — *"the model now leads and can answer without any grounding"* — and only `question` is required. So the sentence *"grounding is still retrieval-only, and it matters"* in the 2026-08-12 checkpoint is **false on production**: retrieval is a hint the model may discard, and on the one question we know retrieval gets wrong, it discards it. Erik's call to make: is a model answering from its own parametric knowledge of fiqh the product, or a defect?
- [ ] ISC-419: an authored answer never hand-writes a translation of scripture. **FIXED AT THE INGESTION POINT 2026-08-12; NOT MET until deployed and re-measured.** Rule 2 said only *"you do not need to quote the translation yourself"* — an invitation, not a rule, which is exactly why the model quoted anyway. Now a prohibition: *"NEVER write out the translation of an ayah yourself — not in quotation marks, not as 'yang artinya', not as a paraphrase presented as the verse's wording."* Fixed in the PROMPT rather than the wall, deliberately — a hard egress rule would reject the app's best answers and fall back to the caption list Erik refused, whereas a prompt rule cannot cost a good answer. Original evidence, unguarded: The `arabic` rule stops the model writing the Arabic; nothing stops it writing its own Indonesian rendering of an ayah in quotation marks. Live: `bolehkah aku pacaran` shipped *"Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk." (QS Al-Isra 17:32)* — a translation the model composed, sitting beside the app's own pinned-corpus translation. `apakah musik haram` shipped one prefaced *"yang artinya kurang lebih"*. The app's entire rights and provenance posture is that translations come from the pinned corpus with attribution.
- [ ] ISC-420: an authored answer never attributes a position to the scholars without a receipt. **FIXED AT THE INGESTION POINT 2026-08-12; NOT MET until deployed and re-measured.** New rule 6 draws the line where it actually falls: saying the scholars DIFFER is honest and stays (it tells the reader the matter is contested); asserting that they AGREE — `para ulama sepakat`, `sudah ijma`, `tidak ada khilaf` — or naming a madzhab's position does not, because the app cannot show the reader the source. That line keeps `apakah musik haram` and `bolehkah perempuan jadi pemimpin`, the two answers a hard wall would have destroyed. Original evidence, unguarded: `hadithShape` demands a resolvable marker for every sentence attributing something to the Prophet ﷺ. There is no analogue for attributing to the ulama, so *"para ulama sepakat…"*, *"sebagian besar ulama klasik memahami…"*, *"ulama kontemporer banyak yang berpendapat…"* all ship with no source. 2 of 11 live answers carry one. **The wall has a receipt rule for the Prophet and none for the scholars, and a script rule for Arabic and none for translated scripture — both walls are half-built along the same seam.** Building the second half is a product decision, not a bug fix: the two answers carrying these claims (`apakah musik haram`, `bolehkah perempuan jadi pemimpin`) are among the best the app produces, and a hard rule would replace them with the cold caption list Erik refused.
- [x] ISC-422: the it-depends opener does not license the verdict behind its `tapi`. **MET.** `"Tergantung niat, tapi perbuatan itu haram"` passed the first cut of `DEFER`; the clause was dropped entirely at a measured cost of zero — no regression across the eleven live answers, none across the compliant-disclaimer cases.
- [x] ISC-423: Anti: the pin-request letter is never sent stating something about the app that is no longer true. **MET.** `docs/review/hukum-pin-request-2026-08-12.md` said *"Aplikasi tidak mengarang jawaban"* and is addressed to Ustadz Ahmad. That has been false since the edition flipped. A blocking ⛔ header now stands above it recording both the false sentence and the falsified premise, so the letter cannot go out as written.
- [x] ISC-421: naming the scholars does not buy amnesty from the fatwa wall. **MET 2026-08-12.** `HEDGE` was a flat word list read sentence-wide, so `ulama`, `fatwa`, `ustadz` and `tergantung` each switched the verdict check off for their whole sentence — and those are the words that appear in the strongest rulings. Control pair: `"Perbuatan itu haram"` CAUGHT / `"Para ulama sepakat perbuatan itu haram"` PASSED. Replaced with `DEFER`, a construction list requiring an actual deferral. Force-red confirms the new tests are load-bearing (reverting to a word list fails exactly 2). **0 regressions across the 11 live answers** — the old amnesty protected none of them, so it could only ever let a ruling out.
- [ ] ISC-417: Ustadz Ahmad has signed off on AI-authored answers. **NOT MET.** He has a heads-up only. Recorded as a knowing decision by Erik, not as a cleared gate.
- [x] ISC-402: a knowledge answer with 1–2 entries and a resolvable lead ref is followed by that ayah and one verbatim attributed tafsir. **MET.** `hukum warisan di islam` (2 entries) renders QS 4:11 as a full card plus Al-Mukhtasar's 920-char explanation of the shares, live in real Chrome.
- [x] ISC-403: the tafsir quoted inline is Indonesian. **MET by construction and by corpus scan** — `lang !== "id"` returns `""`; Al-Mukhtasar is `id` in 6,236/6,236 shards.
- [x] ISC-404: the tafsir quoted inline is never truncated. **MET.** The renderer emits `mukhtasar.text` whole; above `TIER3_MAX_QUOTE_CHARS` (3000, just over the observed corpus max of 2,976) it HOLDS rather than cuts. Verbatim or nothing.
- [x] ISC-405: the selection criterion is stated ON THE GLASS, not in a commit message. **MET.** `.tier3-why` renders *"Ditampilkan di sini karena ringkas dan tersedia dalam bahasa Indonesia untuk setiap ayat — bukan karena lebih utama dari mufasir lain."* — measured live at 33px, `oklch(0.68 0.014 165)`.
- [x] ISC-406: no reader-facing ranking is introduced — all three scholars remain unranked and one tap away. **MET.** The card sets `lazyTafsir`, so the existing `tafsirStackHtml` disclosure is unchanged; tier 3 adds no ordering claim.
- [x] ISC-407: Anti: tier 3 never fires where there is no ayah to orient. **MET.** Zero-entry pointers and unresolvable refs both return `null`; `pacaran` stays silent (6 entries, above the cut, and no ayah of its own).
- [x] ISC-408: Anti: tier 3 never amplifies the QS 4:25 nikah answer while it is under review. **MET, and this is the finding the spec did not contain.** `apa hukum nikah siri` is thin by every measure and would have been promoted into a verse card plus a tafsir on slavery. Held live: 0 tier-3 blocks, answer byte-identical to today's.
- [x] ISC-408.1: the marriage hold does not under-fire on affixed forms. **MET after a real leak.** `\bmenikah\b` does not match **menikahi** — the exact word in the 4:25 caption — and `bolehkah menikahi budak` walked through, invisible in the live probe only because `looksFactual` rejected it upstream. Now a stem match; force-red confirms reverting to whole-word fails exactly one test.
- [x] ISC-409: Anti: any failure leaves the answer exactly as it ships today. **MET.** Every non-success path returns `""`; the whole block including its rule lives inside `.tier3`, so nothing orphans.
- [x] ISC-410: tier 3 is a third tier, not the main path. **MET by measurement.** 0 of 30 representative ask-seed candidates fire it; ~32% of hukum-shaped knowledge answers do.
- [x] ISC-424: the endpoint distinguishes "nothing to say" from "the wall stopped a good answer". **MET 2026-08-12.** `handleAnswer` now returns `{answer, blocked}`, where `blocked` carries the `AnswerViolationKind` of the rule that refused the final candidate. Absent on success, absent on model/key failure, absent on the principled edition — so an older client and the trustworthy deploy both behave exactly as they do today.
- [x] ISC-425: the refusal survives the wire and the `AnswerModel` contract. **MET.** `AnswerModel` can only return prose or throw, so a reason had to become a throwable: `AnswerBlockedError` in `answer-live.ts`. Anything that is not a recognised `blocked` value still throws the anonymous `Error("no answer")` and falls back as before — fail toward the old behaviour, never toward a claim.
- [x] ISC-426: `synthesizeAnswer` can report a refusal rather than flattening it to `null`. **MET.** Returns `SynthesisOutcome | null`: `{kind:"answer"}`, `{kind:"blocked", by}`, or `null` for a genuine absence. `null` keeps its old meaning exactly — nothing to ground on, model down, timeout.
- [x] ISC-427: a question whose honest answer is a hadith gets a pointer, not the corpus-gap copy. **MET.** New `hadith-defer` turn, sibling of `count-defer`, rendered in `main.ts` and `web/demo/demo.ts`: *"Yang kamu tanyakan ini jawabannya ada di hadis, bukan di dalam ayat."* plus a door into `#/hadis` (route confirmed at `main.ts:767`) and an invitation to re-ask from the ayah side.
- [x] ISC-428: the pointer is audible, not only visible. **MET.** `announceTurn` gained an explicit `hadith-defer` case. Left to `default:` it would have said nothing, and a screen-reader user could not have told a refusal from a silence — the same conflation this change exists to undo, one modality over.
- [x] ISC-429: ONLY the hadith rule earns a pointer. **MET by construction and test.** `main.ts` routes on `ai.by === "bad_hadith"`. `fatwa` must not point, because pointing would advertise a verdict the app had just refused to issue; `arabic` and `bad_ref` are malformed output and are not the reader's business. All three still fall through to today's principled resolution.
- [x] ISC-430: Anti: an ordinary failure never becomes a hadith pointer. **MET.** A model that is down, 404s, or times out returns `null`, tested explicitly including the `AbortError` shape. A false "your answer is in a hadith" on every endpoint hiccup would be a confident wrong claim — strictly worse than the silence being replaced.
- [x] ISC-431: Anti: no hadith text, Arabic, attribution or collection name reaches the reader. **MET.** The refused prose never leaves `handleAnswer`; the `hadith-defer` turn carries only the question. `SHOW_MACHINE_HADITH_TEXT` is untouched and whether hadith text may EVER display remains with the ustadz. A pointer to a tab the reader can already open is not a display of hadith.
- [x] ISC-432: Anti: the `bad_hadith` diagnosis is proven by rule, not inferred from a null. **MET.** `answer-blocked.test.ts` runs a realistic answer to Erik's exact live question through the real guard: the violation set is EXACTLY `{bad_hadith}`, the offending fragment contains `bersabda`, and the control — the same answer minus the attribution — passes. Without the control, "it was rejected" would have proven nothing about why.
- [x] ISC-433: Anti: wiring the third argument is never mistaken for a fix again. **MET, and this is the finding the handoff did not contain.** A regression test pins `groundedHadithFrom([])` as byte-identical to the `() => false` default in both `ok` and violation kinds. The originally-named fix — pass the predicate through — would have shipped ZERO behaviour change and closed the item, because the union is necessarily empty on this path.
- [x] ISC-434: `searchDalil` is wired into `handleAnswer`, so the turn's hadith grounding is non-empty. **MET 2026-08-13 (code); live probe DEFERRED to the deploy.** Probe run: `grep -c searchDalil worker/src/index.ts` = 3. Gated to knowledge-shaped turns by `entries.length > 0` — NOT a new classifier, because `gatherGrounding` runs the scholar's index only when the feeling path came up empty, so populated entries already mean "no feeling was found to answer". That matters: hadith retrieval scores 9/9 on knowledge questions and 1/4 on feelings, where it rebukes an anxious person. Retrieval is capped to `MAX_DISPLAY` BEFORE the model sees it, so citable ≡ displayable by construction rather than by luck. ORIGINAL: **NOT MET — blocker 1 of 2 for real hadith answers.** `worker/src/dalil.ts` is fully built (`searchDalil`, `capForDisplay`, `MAX_DISPLAY=2`, `fetchDisplayRecords`) and returns ids in exactly the `hadith-bukhari-6962` shape the guard validates, but `handleAnswer` never calls it. Probe: `grep -c searchDalil worker/src/index.ts` > 0.
- [x] ISC-435: `SYNTHESIS_SYSTEM_PROMPT` teaches the `[H:collection:number]` marker syntax. **MET 2026-08-13 (code); live probe DEFERRED to the deploy.** Probe run: `grep -c 'H:' web/src/answer-contract.ts` = 4. Rule 7 is STATIC so an offline-tuned prompt still ships byte-identical, which means the model is taught the syntax on turns that retrieve nothing — so `buildAnswerUserMessage` states the empty case out loud (`Hadis yang terambil: (tidak ada)`) rather than going silent, because silence there invites an invented marker and an invented marker sinks the answer. ORIGINAL: **NOT MET — blocker 2 of 2, and the deeper one.** `web/src/answer-contract.ts` contains ZERO mentions of hadith, marker, or `H:`. The model therefore cannot emit a receipt even with a populated union, which is why the wall is unpassable independently of ISC-434. Probe: `grep -c 'H:' web/src/answer-contract.ts` > 0.
- [x] ISC-436: the hadith pointer is verified live on prod. **MET 2026-08-13**, after being FAILED and, before that, wrongly recorded as `[DEFERRED-VERIFY]`. End-to-end on a warm isolate: `POST /api/answer` → `200 ms=7848 {"answer":null,"blocked":"bad_hadith"}` and the browser rendered *"Pertanyaan seperti ini biasanya dijawab dari hadis, bukan dari ayat."* Cause of the failure was found by instrumenting `window.fetch` (see ISC-441) — the passive network log never records an aborted request, which is why the previous session concluded "no request was made" and listed routing as a candidate. Refuted. The FAILED → MET trail lives in this line's own history and in the Decisions entries, not in a tombstone criterion — a tombstone phrased as `- [ ] ISC-…` would be counted as an open criterion by every parser that reads this file.
- [x] ISC-441: a guard rejection that cannot clear on retry does not spend a second generation. **MET 2026-08-13, and this was what made ISC-436 reachable.** Instrumented `fetch` caught `AbortError` at 12126ms against `TIMEOUT_MS = 12000`: the widened wall rejected candidate 1, the Worker ran a second generation, and the client aborted before it returned — so the abort became an ABSENCE and rendered the corpus-gap copy. The questions that trip the hadith wall are exactly the ones that paid for two generations, so the pointer was unreachable precisely where it was needed. `handleAnswer` now returns after the first `bad_hadith` rejection (deterministic per `answer-blocked.test.ts`); measured 6405ms bare, 7531ms with grounding, versus a 3772ms passing control. Raising the timeout was rejected as treating the symptom — a 25s wait for a refusal is its own defect.
- [x] ISC-442: no prophetic attribution reaches a reader through PASSIVE voice. **MET 2026-08-13 — the second live leak, found minutes after ISC-437 was deployed and called done.** Prod shipped *"…sebagaimana yang **diajarkan oleh** Rasulullah ﷺ"*. Two misses at once: the active patterns anchor subject-then-verb while Indonesian passive puts the agent last via `oleh`, and `diajarkan` is the `di-` passive of the `mengajarkan` just added. `diriwayatkan\s+(oleh|dari|bahwa)` had been in the list all along — itself a `di-` passive taking `oleh`, enumerated as one word instead of as the construction it is. Fixed with a generalised passive pattern plus `menurut <the Prophet>`; 16/16 both directions including three controls where `oleh` names a non-prophetic agent.
- [x] ISC-443: the outer frame reads as light green rather than washed-out. **MET 2026-08-13.** `--shell-bg` was `oklch(0.990 0.003 172)` — chroma an order of magnitude below the 0.036 DESIGN.md already calls "a tint, not a colour", and hue nine points off the brand axis (163) toward cyan. Now `oklch(0.990 0.018 163)`. L held at exactly 0.990 so the documented lightness step over the panel's 0.945→0.965 ground is bit-for-bit unchanged. DESIGN.md amended with the rule: tune chroma, never L.
- [x] ISC-444: every Doa row carries the same corner as the card containing it. **MET 2026-08-13.** `border-radius: 999px` is not a fixed corner — it clamps to half the box height, so 34 rows at three heights (36/62/80px) rendered 18px, 31px and 40px from one declaration. Bound to `--r-lg`, the token `.doa-card` uses; measured on the deployed stylesheet with no injection: 34/34 at 16px, parent 16px. Heights deliberately unchanged (`shell.css:1526` records that equalising them truncated 27 of 34 labels).
- [x] ISC-445: machine-translated hadith Indonesian may display, on a recorded scholarly approval. **MET 2026-08-13.** `SHOW_MACHINE_HADITH_TEXT = true`. Ustadz Ahmad Isrofiel Mardlatillah approved displaying our machine translations as they are, relayed verbally by Erik; recorded in `docs/review/hadith-id-approval-2026-08-12.md` as VERBAL AND RELAYED, never upgraded to written (same rule as `doa-provenance.md`). The accepted risk is documented rather than absent: this layer turned `دُعَاؤُكُمْ إِيمَانُكُمْ` into *"…**bagian dari** keimanan kalian"*, a hedge the Arabic does not contain, and no parity test can catch the next one.
- [x] ISC-446: Anti: machine-rendered hadith text never reaches a reader unlabelled. **MET 2026-08-13.** Permission to display is not permission to display unlabelled. `textNeedsNotice()` must be true whenever text will be seen; force-red confirms suppressing the label fails the test. An open gate with no label is a worse state than either gate position.
- [x] ISC-447: Anti: no user-facing sentence survives the gate flip while claiming the text is Arabic-only or reviewed. **MET 2026-08-13.** The Hadis note promised *"teks hadisnya tetap Arab"* and translation *"setelah ditinjau ustadz"*; the per-book suffix said *"Menunggu tinjauan"*, which now reads as not-permitted. All three rewritten. `hadith.test.ts` pins the true claims and anti-asserts the false ones, which fail in OPPOSITE directions — understating permission versus overstating review — and overstating review is the worse of the two.
- [x] ISC-448: Anti: `reviewed_id` is never populated from the machine layer. **MET by construction.** `hadith-card.ts` (the answer surface) is untouched by the gate; it renders Indonesian only from `reviewed_id`, per record. That field is the data model's only way to distinguish "a scholar checked this sentence" from "a scholar permitted this method", and feeding it from machine output would erase the distinction irreversibly.
- [x] ISC-449: hadith Indonesian on the ANSWER card. **MET 2026-08-13 (code); live probe DEFERRED to the deploy.** Shipped as `machine_id` — its OWN field on `HadithCard`, rendered `<p class="hadith-id is-ai">`, resolved through `hadith-id.ts` so the `SHOW_MACHINE_HADITH_TEXT` gate stays the single place that decides whether this text may show. `reviewed_id` wins outright when present and is never written by any production path (ISC-448 intact; `asCards` in `answer-live.ts` cannot even parse it off the wire). COVERAGE IS NARROWER THAN "12%" SUGGESTS: the 1,746 generated translations are Ṣaḥīḥ Muslim books 1–21 and **zero Bukhari**, so a Bukhari-grounded answer will never carry Indonesian. ORIGINAL: **DECIDED 2026-08-13, NOT BUILT — the blocker moved from a question to an implementation.**
- [x] ISC-450: Anti: opening the dalil surface on prod does not open it on the other two deploys. **MET 2026-08-13.** This is ISC-379's protected thing restated for the cycle that supersedes ISC-379's literal wording, exactly as ISC-379 did for ISC-331 — and the gate both were holding is CLEARED, not bypassed: there is no trustworthy edition at this scope any more (`EDITION = "synthesis"` since 2026-08-12, Erik's instruction) and Erik ruled on the hadith Indonesian on 2026-08-13. Probe run: `wrangler deploy --dry-run` lists `VECTORIZE: okf-hadith`, `CORPUS: okf-corpus`, `CORPUS_DIGEST`; `--dry-run --env synthesis` lists NONE of the three. The demo env prints the "exists at the top level, but not on env.demo" warning for all three, which is the intended state and not a defect.
- [x] ISC-451: Anti: a hadith marker never reaches a reader as text. **MET 2026-08-13.** `stripMarkers` removes it at render, swallowing one leading space so "…niatnya [H:bukhari:1]." closes to "…niatnya." Stripping happens at RENDER and never before storage: the stored prose has to stay guardable, because a replayed turn is re-checked against the records it was stored with and a marker-free string cannot be. Forced red both ways.
- [x] ISC-452: the browser's second wall survives the Worker learning to say yes. **MET 2026-08-13 — and this blocker was NOT in the handoff, which named two walls where there are three.** `synthesizeAnswer` re-guarded prose with the `() => false` default deliberately, so shipping ISC-434/435 alone would have had the Worker approve a hadith answer and the browser silently discard it. The predicate is now rebuilt from the ids the RESPONSE carried — the same question asked of data the browser can see for itself, which is what makes it independent rather than an echo. A Worker that approves a marker and sends no record is still refused. Forced red: a permissive `() => true` fails exactly 2 tests.
- [x] ISC-453: a hadith reaches the reader only if the answer actually cited it. **MET 2026-08-13.** `markersInProse` is the work list at all three layers: the Worker returns only cited records, `synthesizeAnswer` filters again, and `aiHtml` renders a card only when a record for that marker is in hand. An offered-but-uncited hadith would put a saying of the Prophet on a page that nothing on the page is discussing.
- [ ] ISC-454: the opened wall is verified LIVE on prod, and the `bad_hadith` block rate is re-measured against the 24% baseline. **NOT MET — and the stated baseline cannot settle it (2026-08-15).** **UPDATE 2026-08-15 (late) — the wall IS verified live, and the zero-cards cause is now known: it is the PROMPT, not retrieval.** A `dalil` diagnostic on the `/api/answer` body (shipped `d5750f6`, worker `6d2f9743`) reported `eligible:true, bound:true, offered:2, records:2, failed:null` on BOTH eligible questions driven through the real UI (`bagaimana hukum utang piutang dalam islam` 8,406 ms; `apakah sedekah boleh diungkit ungkit` 10,588 ms) — retrieval handed the model two fully-resolved hadith and nothing threw, and the model still made a prophetic attribution WITHOUT a resolvable `[H:…]` marker, so `bad_hadith` fired correctly and no card rendered. A control question (`aku sedih sekali hari ini`) reported `eligible:false, offered:0, records:0` and answered in 4,387 ms, which is what makes the field an instrument rather than a constant. This retires the earlier "UNDETERMINED — gate vs retrieval" reading. **The remaining half of this criterion is unchanged and still needs Erik:** the block RATE still has no comparable number, because the 24% baseline is not re-runnable (see below). Latency now has a mechanism too — the control is fast precisely because it skips the dalil chain, so eligible turns pay embed + Vectorize + R2 + rerank and land at 8–11 s against the 12,000 ms client abort; a fourth question aborted outright. Make the eligible path cheaper; do NOT raise `TIMEOUT_MS`. The wall is now DEPLOYED (worker `dbd6be86`), so "needs Erik's deploy" is discharged. What is not discharged is the measurement, because the instrument that produced the 24% baseline is structurally blind to this change: `src/eval/grounding-probe.ts:216` pins the hadith predicate to `() => false`, and `:151` sends `entries: []` on every sample while the Worker gates hadith retrieval on `entries.length > 0` — so re-running `eval:grounding` reproduces ~24% BY CONSTRUCTION, and none of the original 141 samples could ever have reached hadith. `src/eval/answer-run.ts:163` has the same two-arg guard. Neither offline harness calls `searchDalil`, and prod has NO telemetry (no `console.*` in `worker/src/`, no `observability` block in `wrangler.toml`), so the baseline was never production traffic either. A comparable number therefore needs a NEW instrument — either live-UI probing (7-question run done 2026-08-15) or Worker-side logging of `blocked` — not a re-run. Live probe found: 3 of 7 questions at or past the 12s `TIMEOUT_MS` (9,433 / 10,954 / 18,614 ms), 2 of 7 never resolving, the single `hadith-defer` firing at 12,254 ms, and ZERO hadith cards rendered. Everything above is code-verified only (`bun test` 1398/0, typecheck exit 0, synthesis build exit 0, dry-run bindings confirmed). The baseline to beat is 34 refusals in 141 live generations, measured 2026-08-13. Two things can only be seen live: whether the model reliably emits a marker on the first generation (the no-retry break is a bet that it does), and what the added retrieval hop costs against the browser's 12s `TIMEOUT_MS` on a cold isolate — §1 of the handoff already measured 2-in-3 first-requests timing out BEFORE this cycle added an embed + Vectorize query + R2 fetch to the path. Erik ruled the approval DOES extend from the Hadis tab to the answer card. Two constraints ride with it and neither is optional: `reviewed_id` must keep its meaning (ISC-448 is a tested invariant) so the machine text needs its OWN field or badge and must never overload it; and the approval remains **verbal and relayed** (`docs/review/hadith-id-approval-2026-08-12.md`) — a decision by Erik to display, not an artefact from Ustadz Ahmad, and it must not be written up as the latter. This unblocks ISC-434/435, which still additionally need the Vectorize + `okf-corpus` bindings on the prod Worker (`worker/wrangler.toml`; `[env]` blocks do NOT inherit top-level bindings). ORIGINAL: **NOT MET — open decision, not a coding task.** The Hadis tab now shows Indonesian; the answer card still shows Arabic + English only. Whether the ustadz's approval extends here is Erik's to relay: browsing a book and being told *"this hadith answers your question"* are different weights on the same words.
- [x] ISC-437: no prophetic attribution reaches a reader through an unlisted attribution verb. **MET 2026-08-12, and this was a LIVE LEAK, not a hypothetical.** Found by probing prod after deploying ISC-424..433 — asked Erik's own question and prod answered *"Rasulullah shallallahu alaihi wasallam **mengajarkan** bahwa tidaklah seorang muslim tertimpa kelelahan, penyakit, kesedihan…"*: a real hadith, no marker, `guardAnswerProse` returned `ok = true` with ZERO violations. `PROPHETIC` carried `menganjurkan` and not `mengajarkan`. Measured leaking verbs: `mengajarkan`, `menjelaskan`, `menyebutkan`, `memberitahu`. Fixed by a second `bahwa`-gated pattern plus a direct-speech variant; deployed and verified live (the attribution is gone from the answer). Force-red fails exactly 11 tests.
- [x] ISC-438: widening the verb list does not block Qur'anic narrative. **MET, and it is why the fix is two patterns rather than a longer list.** Measured BEFORE choosing the design: a flat widening rejects *"Kisah Nabi Yusuf mengajarkan kita arti kesabaran"* and *"Kisah Nabi Musa menjelaskan betapa besar pertolongan Allah"* — the app's core competency, and the loss would have been silent. `bahwa` discriminates grammatically (complement clause = reported speech) rather than lexically. 9 must-pass cases pinned, including scripture citing itself (*"Al-Qur'an menjelaskan bahwa…"*).
- [x] ISC-439: Anti: the widening only ever ADDS refusals. **MET by construction.** The original verb list is untouched and stays unconditional; the new verbs are an additional pattern. No input that was refused before is admitted now.
- [x] ISC-440: the intermittency is explained and closed. **MET 2026-08-13 (`814fc26`).** The silence-vs-answer flip was never caching: the outcome depended on which verb the model reached for. Closed at the level of the CONSTRUCTION, not the vocabulary — speech-act verbs are now generated from stems by Indonesian affixation (meN- nasal assimilation, `ber-`/`di-`/`ter-`/`memper-`, `-kan`/`-i`), the subject resolves Muhammad-vs-other-prophet against the canon of 25, and the agent relation is order-blind across all four voices. Union with the legacy list, so narrowing is structurally impossible. Probe: `bun test web/src/answer-guard-hadith.test.ts` → 150/150.
- [x] ISC-440.1: the wall's true opening was MEASURED, not assumed. A 100-sentence corpus written by GPT-5.4 answering as this app's chatbot, none edited to fit, run against the pre-change guard as a control: **29/64 refused — the wall was 55% open** while every test in the file passed. After: 64/64. Probe: `.scratch/isc-440/probe-before.ts` vs `probe.ts`.
- [x] ISC-440.7: the grammar was audited by an INDEPENDENT model and every finding reproduced. GPT-5.4, read-only, found 44 attribution leaks and 39 wrongly-refused compliant sentences in a grammar that scored 150/150 here and 64/64 on its own corpus. 18 representative cases probed, **18/18 confirmed on first run**, all now pinned as tests. Probe: the `audit corpus` describe block.
- [x] ISC-440.8: Anti: the grammar does not over-generate. `ter-`/`ber-` prefixed to every stem minted `ternyata`, `tersebut`, `bersama`, `memperingati` as speech acts — a REGRESSION that refused *"semoga kita dikumpulkan bersama Nabi ﷺ"* and *"kita memperingati Maulid Nabi ﷺ"*. `meN-`/`di-` are semantically reliable on a speech-act stem; the other three are not, so their real forms are a small named set. Probe: the seven `still ships` audit cases.
- [x] ISC-440.9: the subject axis is matched by REFERENT, not spelling. `Rosulullah` walked straight through, and `-o-` spelling dominates Indonesian Islamic web text. Probe: the two orthography cases.
- [x] ISC-440.10: BOTH Indonesian passives are covered. The object-focus passive (`yang Rasulullah ajarkan`) was never covered by any pattern, legacy or generated — the file's own comment named only the `oleh` passive that leaked. Probe: the three bare-root cases.
- [x] ISC-440.11: a recipient is not an agent. *"dipesankan **kepada kita** oleh Rasulullah"* shipped while *"dipesankan oleh Rasulullah"* was refused. Probe: the benefactive case.
- [x] ISC-440.12: `mewajibkan` no longer clears both walls at once — `wajib` is invisible inside it to `VERDICT`'s `\b(wajib|haram|makruh)\s+bagi\b`, and it was not a speech-act stem either. Probe: the zakat case.
- [x] ISC-440.2: Anti: nothing narrowed. The allow-direction scored 34/36 both before and after, identically — the generated grammar is added BESIDE `PROPHETIC`, never instead of it. Probe: the two control runs above.
- [x] ISC-440.3: the `bahwa` gate is retired for Muhammad ﷺ. It was never sound — everything he taught is known only through hadith, so "Rasulullah mengajarkan kita untuk bersyukur" is an unreceipted hadith claim. It read as correct only because every compliant test case named Yusuf, Ibrahim or Musa. Probe: the `the bahwa gate is gone for Muhammad ﷺ specifically` test.
- [x] ISC-440.4: an unlisted prophet name fails to the STRICT side — costing a pointer, never a fabrication. Probe: the `Nabi Fulan` test.
- [x] ISC-440.5: the grammar is verified on PROD. **MET 2026-08-13.** Deployed (worker version `2f747a1b`, `EDITION: "synthesis"`); edge serves `index-cT59WjmB.css`. Probed live via Interceptor after clearing `localStorage` AND `CacheStorage`, turns counted 0 before / 2 after so the answer was fresh, not replayed. The CSS rules and the inlined `synthesis` literal were confirmed on the served bytes, not on the local build.
- [ ] ISC-440.6: Known limitation, pinned not fixed — two Qur'anic-narrative sentences about Nabi Yunus and Nabi Sulaiman are over-refused by the LEGACY weak-verb + `bahwa` pattern (pre-existing; the control scored identically before the grammar). Closing them requires narrowing a `PROPHETIC` pattern, which is forbidden. Cost is a hadith pointer instead of a story. Probe: the `known over-refusal` describe block.
- [x] ISC-455: the marker the prompt OFFERS is one the guard can resolve. **MET 2026-08-15.** `buildAnswerUserMessage` built the offered `[H:...]` out of `DisplayRecord.collection`, which is the READER-FACING name. Pulled live from `okf-corpus/text/8177e2e6e6c47370/display/{bukhari/024,muslim/001}.json`: `id "hadith-bukhari-1349"` alongside `collection "Sahih al-Bukhari"`, and `id "hadith-muslim-1"` alongside `"Sahih Muslim"` — the two disagree on all 14,736 records. So the prompt printed `[H:Sahih al-Bukhari:1349]` against `MARKER_IN_PROSE = /\[H:([a-z][a-z-]*):\d{1,6}\]/`: a capital and a space, matching NOTHING, so the marker was invisible to the guard and branch (a) refused the attribution sentence for having no marker in it. Even matched, `markerToId` yields `hadith-Sahih al-Bukhari-1349`, not the id. **Every possible model output was refused**, which is the entirety of the 2026-08-15 `blocked:"bad_hadith"` with `records:2`. Fixed directionally: `markerFor(id)` is the exact inverse of `markerToId` over the grammar the guard accepts, so offered ≡ writable ≡ resolvable holds by construction rather than by two files agreeing. Probe: `bun test web/src/answer-hadith.test.ts` — "REAL corpus records reach the model as markers the guard can resolve".
- [x] ISC-456: the fix is proven with a CONTROL ARM against real model output. **MET 2026-08-15.** Same question (`bagaimana hukum utang piutang dalam islam`), same two records (`hadith-bukhari-2201/2202`, Loans/Payment of Loans), same `SYNTHESIS_SYSTEM_PROMPT` and `ANSWER_PARAMS`, the marker construction the only variable. OLD arm offered `[H:Sahih al-Bukhari:2201]`, the model copied it verbatim, verdict `bad_hadith` — prod's exact observed state, reproduced offline. NEW arm offered `[H:bukhari:2201]`, the model copied it verbatim, verdict `ok`. The single-arm version of this probe could not have distinguished "the fix worked" from "this question was always fine". A first run using arbitrary records (bukhari 1349/1350, Zakat) had the model correctly decline to attribute in BOTH arms, which is why the records had to be topically real too.
- [x] ISC-457: Anti: an id outside the marker grammar is never offered uncitable. **MET 2026-08-15.** `markerFor` returns `null` and the record is dropped from the offer list rather than printed with a marker that cannot clear the wall — the same RETRIEVABLE ≡ DISPLAYABLE discipline `dalil.ts` applies to records with no body, and for the same reason: a citable-but-unresolvable hadith is a prophetic attribution with nothing behind it. Probe: the "Anti: an id outside the marker grammar is DROPPED" test. Note the assertion is `not.toMatch(/\[H:[^\]]*\d/)` and not `not.toContain("[H:")` — the empty-case copy legitimately carries the literal `[H:...]` when it forbids inventing one.
- [x] ISC-458: the opened marker path is verified LIVE on prod. **MET 2026-08-15 (late-2), deployed by Erik's instruction — worker version `238e6861`, bundle `index-CdOZwi13.js`.** `bagaimana hukum utang piutang dalam islam` returned `blocked:null` with a TWO-ELEMENT `hadith` array — the state never once observed before this fix — and the prose carried `[H:bukhari:2292]` and `[H:muslim:3873]`, both resolving to real records (Sahih al-Bukhari 2292 and Sahih Muslim 3873, both `sahih`, both with Arabic, English and `source_url`). Reproduced 4/4. A card RENDERS: `#thread .ai-hadith` went 0 → 1 → 2 across two UI submissions of `apakah sedekah boleh diungkit ungkit`, reading *"Sahih al-Bukhari 1438 · Can one buy the thing which he has given in charity?"*. **TWO LIMITS RIDE WITH THE PASS and are filed as ISC-465/466:** `bad_hadith` still fires on ~1/3 of generations (3 of 9 completions returned `blocked:"bad_hadith"` with `records:2` and `hadith:[]`), which is now MODEL VARIANCE rather than a regex that could never match; and the 12,000 ms client abort beat the server on 3 of 3 UI attempts at the utang-piutang question, so the very question that proves the fix at the API never once delivered its hadith through the actual UI. ORIGINAL: NOT MET — needs Erik's deploy (prod deploys are his). Everything above is offline: gates green (`bun test` 1410/0 exit 0, typecheck exit 0, `wrangler deploy --dry-run` exit 0) and the control-armed probe used the real provider, real prompt and real records, but not the real `searchDalil` results for the question. What only prod can settle: whether reranked records for a live question produce a citing answer inside the 12,000 ms client abort, and whether a hadith card actually paints. Read it off the shipped `dalil` diagnostic — `records>0` with a NON-empty `hadith` array is the state that was never once observed before this fix.
- [x] ISC-459: the text layer no longer queues behind the embedding. **MET 2026-08-15 (late-2).** `searchDalil` called `loadRerankTexts` at its use site, after `embedQuestion` and `VECTORIZE.query`, though it depends on neither — so a cold isolate paid a 1.8 MB R2 GET plus a 6.5 MB gunzip+`JSON.parse` (measured 99/121/140 ms of pure CPU on a dev laptop) strictly in series behind two network round-trips. The promise now starts before the embed and is awaited at the same place, so the blob overlaps the round-trips it used to follow. Zero behavioural change: nothing between the two points reads `texts`. `void textsPromise.catch(() => {})` marks the rejection handled so a text-layer failure cannot surface as an unhandled rejection while embed is still in flight, without swallowing it — `textsPromise` still rejects at the `await`, and embed is awaited first, so `classifyDalilFailure` keeps reporting the EARLIEST stage. Probe: `bun test worker/src/dalil.test.ts` — "starts the R2 text-layer read BEFORE the embedding resolves".
- [x] ISC-460: Anti: the overlap cannot be silently un-done by a tidying edit. **MET 2026-08-15 (late-2).** The optimisation is invisible in the shape of the code — moving `loadRerankTexts(env)` back down to `const texts = await …` reads BETTER and restores the serial version with no output change, no failing test, and no evidence but a latency number nobody re-measures. So the ordering is asserted directly against a held-open embed stub: if the R2 read were queued behind the embedding it could not have started while the embedding is unresolved. FORCED RED — reverting to the use-site call fails exactly this one test (`8 pass, 1 fail`, `expect(h.log).toContain("r2:start")`) and nothing else, which is the whole point of writing it.
- [x] ISC-461: the eligible path's cost is attributed to a STAGE, not to "the dalil chain". **MET 2026-08-15 (late-2), live, with the control arm — AND IT FALSIFIED THE PREMISE IT WAS BUILT ON.** Verbatim from prod: `{"eligible":true,"bound":true,"offered":2,"records":2,"failed":null,"ms":{"embed":376,"vectorize":391,"text_layer":0,"rerank":427,"display":373,"total":1567}}`, plus three more eligible turns at `total` 1947 / 2092 / 1855 ms, and the ineligible control `{"eligible":false,"bound":true,"offered":0,"records":0,"failed":null,"ms":null}` — `ms:null` for a chain that never ran, exactly as specified. **THE DALIL CHAIN IS NOT THE LATENCY.** It costs 1.2–2.7 s of turns measured at 5.5–27.3 s, and the control — which skips the chain ENTIRELY — took 8,195 ms, as slow as the eligible turns. The 2026-08-15 reading ("the control is fast at 4,387 ms BECAUSE it skips the dalil chain") does not survive a second control: generation dominates and its variance is the story. So the optimisation in ISC-459 is real but marginal, and the remaining work is ISC-466, not further retrieval tuning. `text_layer: 0` on every single observation is the DOCUMENTED expected reading, not a dead stage — it is the residual after the overlap absorbed it, on a module-cached warm isolate, measured with a clock that only advances on I/O. The verifying agent read it as "that stage may not be running at all", which is precisely the misreading `DalilTimings` trap 2 was written to pre-empt; the comment earned itself on its first outing. ORIGINAL: NOT MET — needs Erik's deploy. 2026-08-15 measured eligible turns at 8,406/10,588 ms against a 12,000 ms client abort, with a 4,387 ms ineligible control, and could say only that retrieval-plus-a-bigger-prompt accounted for the gap — so any cut would have been a guess at which of embed / Vectorize / text-layer / rerank / display was spending it. `dalil.ms` now ships `{embed, vectorize, text_layer, rerank, display, total}` on the same public response body the counters already ride, measured in a `finally` so a turn that THREW still reports how long it spent before dying. `ms:null` means the chain never ran, which is not the same as instant. Three read-traps are owned in `DalilTimings`: the stages overlap and do not sum; `text_layer` is the RESIDUAL wait after the overlap and NOT the blob's cost, so a `0` there means the overlap absorbed it rather than that the fetch was free; and a Workers span containing no I/O reads 0, so the gunzip+parse CPU is real but invisible here. Probe: one eligible question on prod, read `dalil.ms` off the response body.
- [x] ISC-462: the DEFAULT theme choice never paints the answer on itself. **MET 2026-08-15 (late-2).** `Pengaturan → "Ikut sistem"` (`aria-pressed="true"`, the default) called `applyTheme("system")`, which REMOVED `data-theme` — and with the attribute absent the panel painted `rgb(242,255,248)` while the ink tokens stayed at dark-register values. Measured live on prod: **15 contrast failures** against 5 in `light` and 0 in `dark`, answer prose `p.said` at 17.5px computing to **1.06:1**. A reload re-stamped a resolved value and hid it, which is why it reached production. The cause was a POLICY CONFLICT, not a typo: `main.ts` always stamped a resolved value at boot ("the bad state enters HERE") while `settings.ts` removed the attribute for the same choice ("Absence of the attribute IS the 'follow the system' state") — two files, opposite policies, each citing this same failure as its justification, so the app booted correct and broke the instant the reader touched the control. Fixed on both sides: `applyTheme` resolves AND watches `matchMedia` so resolving does not freeze the choice, `main.ts` delegates to it, and storage still holds the literal `"system"` so the choice is remembered as a choice. Probe: `bun test web/src/settings.test.ts`.
- [x] ISC-463: Anti: a green test may not assert this defect. **MET 2026-08-15 (late-2).** `describe("ikut sistem must be an ABSENT attribute")` pinned `hasAttribute("data-theme") === false` and had passed for as long as the bug existed — the test WAS the bug's guarantee. Inverted, with the measurement written into the comment rather than the intent, because the next reader to think absence looks more correct needs the numbers. FORCED RED: restoring `removeAttribute` fails exactly 2 of the block's 4 tests. The 4th ("the boot path and the settings path agree") passed under the old policy too, on `null === null` — vacuous — so it now also pins the agreed value to a concrete register. That strengthening exists because the force-red exposed it, not because it read nicely.
- [ ] ISC-464: the two remaining P0s from the 2026-08-15 critique are addressed. **NOT MET — scoped, one half withdrawn, and HALF (a) IS NOW FALSIFIED (2026-08-16).**

  **(a) SUPERSEDED BY THE FULL SWEEP — ONE REAL DEFECT EXISTED, ON A ROUTE THE CRITIQUE DID NOT NAME. FIXED AND DEPLOYED (`acf3e8c`, worker `384a6f9d`).** Swept all NINE routes at 1440×900 and 390×844 with the hit-testing probe plus a per-route liveness counterfactual. **`#/peta` at 390 px was the only route with content stranded at the BOTTOM of its scroll** — the position a reader cannot scroll past: `Sosial` (15 px) and `38 ayat` (11 px) covered, and at rest the Arabic `الأسرة` / `محمد` and the card reading "Muhammad Shallallahu alaihi wasallam" under the bar. CAUSE: `:root[data-tematik] … .app { padding-bottom: 16px }` (`shell.css:956`) is unconditional, and is only correct while `.tematik-index` holds `height: calc(100dvh - 40px)` — a wall sized to stop above the composer already pays the clearance, so the generic reservation would be charged twice (the same trade `.app:has(.baca-clip)` makes). The `@media (max-width: 700px)` block releases that height ("let the page scroll it") and silently invalidates the premise. FIX: below 700 px the tematik route takes `--composer-clear` like every other scrolling route. **Verified on the DEPLOYED build after clearing a stale `CacheStorage` entry that served the pre-fix CSS on first load** (`index-Dv3PeDUX.css` with `appPB: 16px` — the documented trap, hit again): all 9 routes × both widths now read `atBottom: 0` with the probe live on every one, and `#/peta` reads `120px` at 390 while correctly keeping `16px` at 1440 and 760.

  **THE ACCEPTANCE CRITERION IS AT-BOTTOM, NOT AT-REST, and it came from a control rather than taste.** Every healthy route overlaps the composer at rest — `#/hadis` 4 elements, `#/fikih` 1, `#/doa` 1, `#/surah/18` 1 — all with `atBottom: 0`. Content passing under a docked bar mid-scroll is the pattern working; content stranded there at the end of the scroll is the defect. Same verdict for the sidebar's prayer widget at 760 px, which overlaps by 35 px at rest and scrolls clear to 0 (`.qk-tool-body` sh 496 > ch 396) — not a defect.

  SUPERSEDED READING (2026-08-16, earlier the same session), kept because the METHOD lesson below is what survived and the conclusion is what did not: **the composer overprint does not reproduce; no fix needed.** That was true for the routes and widths tested at the time (`#/surah/18` and `#/tanya` at 1280×720, `#/tanya` at 390×844) and WRONG as a general claim. Two routes are not nine, and the one that mattered was not among them. Measured on prod with a hit-testing instrument and a positive control: **0 elements covered** at 1280×720 on `#/surah/18` (split) and `#/tanya` (chat, scrolled fully to the bottom), and at 390×844 via CDP `emulate` on `#/tanya` in BOTH the thread and the landing state. The reservation that makes this true already exists — `--composer-clear` (`clamp(120px, 13vh, 160px)`, `shell.css:336`) is consumed by `.app` at `:337` and subtracted by `.surah-split` at `read.css:831`. Proven by counterfactual on identical frozen content (7,174 chars, byte-stable across both arms): baseline `padding-bottom: 120px` → **0 covered**; the same page with the reservation forced to `0px` → **1 covered, 32 px overlap**. The counterfactual is load-bearing, not decoration: it is what proves the probe can SEE an occlusion, so the baseline zero is a measurement rather than a blind spot.

  **This criterion was NOT falsified by reading code — it was falsified by fixing the instrument, and the first two instruments were both wrong.** The original finding (mine, and almost certainly the critique's) came from comparing raw `getBoundingClientRect()` against `#composer-bar`. That is wrong twice over: it ignores clipping by scrolling ancestors, so content scrolled out of `#intro-body.sp-scroll` (box ends y 606) was counted as occluded at y 628; and `#composer-bar` is `pointer-events: none` and fully transparent at 1280 px wide, while the only element that PAINTS is `form#composer` — 389 px, centred at x 575–964, 61 px tall — so the occluding area was inflated more than 3×. The SECOND instrument then returned 0 for both arms because it hit-tested at each element's left edge, which for a wide chat bubble falls outside the centred form; only the counterfactual exposed that. `.qk-panel-body`'s `padding-bottom: 0` is a red herring — the reservation was never meant to live there.

  **Do not re-open (a) from the critique snapshot alone.** It is an automated dual-agent report and naive rect-overlap reproduces its exact wording. Re-run the counterfactual first. Not separately tested: 1440 width, and `#/peta` / `#/hadis` / `#/fikih` / `#/doa`.

  ORIGINAL CLAIM, kept because it is what the measurement overturned: (a) The composer overprints the scripture: `#composer-bar` floats over a scroll container that reserves no space, so `Ceritakan atau tanyakan apa saja…` renders ON TOP of the Arabic of 2:156 and its meaning translation at BOTH 1440 and 390, and occludes the `Terjemahan harfiah & tafsir ulama` toggle — five of six routes. This inverts design principle 1 (the interface out-shouting the scripture) on the highest-stakes content in the app. (b) — **THE DISCLAIMER HALF IS MET (2026-08-16, deployed worker `c357ea7e`, `b83ce60`); THE RECEIPT HALF IS MEASURED AND BLOCKED ON ERIK.**

  **Disclaimer half — MET.** Measured on prod before the change (`apakah Allah mengampuni dosa besar`): the only disclosure was the footer note at **11.68px** against 17.5px prose, sitting **1,730px** below the answer's first sentence — on a SHORT answer (4 paragraphs, 2 verse cards). Disclosure that arrives after the claim has been read is not disclosure. Two changes: a chip now precedes the prose (`Disusun AI — bukan fatwa`, `role="note"`, wording confirmed by Erik 2026-08-16), and `.ai-note` takes `--step-0` (13.92px) instead of inheriting `--step--1`. **The second was a comment that had been true on paper and false in the CSS since it was written** — `styles.css` said the label "must be readable, not fine print, since it is the one thing telling the reader this answer is machine-made and not a fatwa", while `.ai-note` overrode only `color` and `border-top-color`. Order was untestable because `aiHtml` returned `body + tail + AI_NOTE` inside `main.ts`, which exports only `surahMeta` and `app` and which no test imports (importing boots the app); extracted to `web/src/answer-disclosure.ts` so the rule has a seam. **VERIFIED LIVE on the deployed build** after clearing a stale cache: chip precedes the prose in DOM order, **45px above** the first sentence versus the note's 1,700px below; chip and note both 13.92px against 17.5px prose; legible in all THREE theme states — `data-theme=light`, `data-theme=dark`, and the no-attribute/`prefers-color-scheme: light` combination that produced the ISC-462 white-on-white — confirmed by screenshot, because the computed-style contrast maths was WRONG (`canvas.fillStyle` does not parse `oklch()`, so a regex read the oklch components as RGB and produced colours like `[1,0,163]`). At 390px the chip is 173px on one line, no overflow. 7 tests; force-red twice (chip returned to the end fails 4, restoring the "di atas" pointer to the no-verses note fails exactly 1).

  **Receipt half — NOT MET, and the prescribed fix cannot be implemented as specified.** The handoff says "extend the receipt rule already applied to the Prophet's words". Measured against REAL prod prose first (two full answers, 8 paragraphs, captured live rather than composed — the standing trap on this guard): **every one of the 8 paragraphs contains at least one unattributed claim about God or the unseen.** Samples: *"Allah tidak pernah bosan menerima hamba-Nya yang kembali"* (a hadith, stated as the app's own words), *"Orang baik yang menderita sedang dalam proses pemurnian jiwa, bukan sedang dihukum"*, *"Setiap air mata… akan menjadi pahala yang tak terkira di akhirat nanti"* (a specific promise about the akhirat), *"Allah sedang menggenggam tangan mereka… menyiapkan ganjaran yang jauh lebih besar"*, and *"semakin besar dosa, semakin besar pula peluang untuk merasakan indahnya ampunan-Nya"* which is not sourceable to anything. So a receipt guard shipped as-is would refuse **~100%** of answers — not 48% like `bad_hadith` — and would silently turn the app off. NOT BUILT for that reason. The model demonstrably CAN cite: both answers quote scripture verbatim with refs (QS 4:27, 3:135, 29:2-3, 2:155-156); it simply treats pastoral assertion as a different act from quotation. **Recommended path, the same shape that worked for the hadith marker: fix upstream in `SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue on real prose, and only then guard what is left** — a wall is affordable once the prompt makes compliance normal, and building the wall first is exactly what produced the 48% refusal. **Erik's call, not an engineering one:** whether this app may assert things about God without citation is theological, and it sits on the standing open item that Ustadz Ahmad has never signed off on AI-authored answers at all. Two observations recorded but NOT acted on: the model addressed a reader as *"Nak"* (paternal — a different axis from the formality Erik ruled on, so pronouns were left alone), and `apa yang terjadi setelah kita meninggal` returned no prose at all, which may mean eschatology is already refused somewhere.

  ORIGINAL: The synthesis lane makes claims about God and the unseen with no receipt, and buries the AI disclaimer at ~11.7px some 4,000px below the theology. **The pronoun half of (b) is WITHDRAWN by Erik 2026-08-15: the formal `Anda`/`Saudaraku` register is intentional — formality is respect in Indonesian religious speech — and the critique was applying a norm that does not transfer.** Only the unattributed-claims and disclaimer-placement halves stand. Full report: `.impeccable/critique/2026-08-15T13-09-29Z__new-quranku-axiara-ai.md` (19/40, dual-agent).
- [x] ISC-465: `bad_hadith` on a turn with resolved records is measured and bounded. **MET 2026-08-16 — deployed (worker `20b04277`, then `66254521`) and verified live across THREE 25-turn runs on the same 11 questions.** The rate is bounded from **12/25 (48%) to 3/25 (12%)**, answered turns rose **10/25 (40%) → 15/25 (60%)**, and silence held at its baseline **2/25 (8%)**.

  | outcome | baseline | retry shipped | + verdict fix |
  |---|---|---|---|
  | answered | 10 (40%) | 12 (48%) | **15 (60%)** |
  | `bad_hadith` | **12 (48%)** | 2 (8%) | 3 (12%) |
  | `fatwa` | 1 | 4 | 5 (20%) |
  | `{answer:null}` silence | 2 (8%) | **7 (28%)** | **2 (8%)** |

  **THE MIDDLE COLUMN IS THE POINT, and it was only visible because the change was measured rather than assumed.** Shipping the retry did exactly what the evidence predicted for `bad_hadith` — and TRIPLED silence, every new null at a ~26 s wall. The retry had opened a new route into the generation `catch`: attempt 1 produces prose, the wall refuses it, attempt 2 exhausts the turn budget and throws, and the `catch` returned a bare `{answer:null}` — discarding the verdict attempt 1 had already earned. `blocked` renders as "an answer was found and is being held back"; a bare null renders as "no matching verse was found", so the reader was told the corpus is empty while the app was refusing, which is the exact confusion the `blocked` channel exists to end. Fixed by `verdictAfterFailure` (`a8218de`), which preserves an earned verdict and never invents one. **Verified by MECHANISM, not by rate:** the post-fix run contains four rows of the shape `wall≈26,1xx blocked=<kind> hadith=-` — a timeout turn (no `hadith` key ⇒ the catch path) carrying a verdict, which the old code could not emit on that path under any input. Rate alone would not have settled it, because generation latency drifted across the session (walls 5.3-31.1 s) and no arm is a clean control for another. **Left deliberately untuned:** `MIN_RETRY_MS` stays 6,000 ms against a measured ~16 s median generation and a 25 s turn budget, so two attempts often do not fit. Raising the floor to match would make the retry almost never fire and forfeit the 48%→12% gain; the real lever is `MODEL_DEADLINE_MS` above 25 s, which cannot move without the client's 30 s `TIMEOUT_MS` moving with it (they must never cross — see ISC-466). That is Erik's call and is deferred, not forgotten. ORIGINAL: **NOT MET — newly opened 2026-08-15 (late-2).** Measured 2026-08-16 before any change: `bad_hadith` on 12 of 25 live eligible turns (48%) over 10 distinct questions, every one `eligible:true, offered:2, records:2, failed:null`. **The determinism premise behind the no-retry break was REFUTED, not merely doubted:** the SAME question with identical grounding produced both outcomes — `apakah sedekah boleh diungkit ungkit` ran bad, bad, ok, bad, ok, and `bagaimana hukum utang piutang dalam islam` ran ok, ok, ok, bad, bad. Erik ruled: retry, with a shared budget. `MODEL_DEADLINE_MS` is now read ONCE per turn and spent down by both attempts, because `callChatModel` defaults to a fresh `AbortSignal.timeout` per call and this loop passed no `deadlineMs`: two attempts could each spend 25 s behind a 30 s client backstop, generating and billing an answer the browser had already abandoned — the ISC-466 defect with the sides swapped, and reachable rather than theoretical (single generations measured at 26.7 / 27.4 / 28.0 / **31.1** s the same day). A retry that cannot finish in what is left is refused by BUDGET (`MIN_RETRY_MS`), never by violation name. Policy extracted to `worker/src/answer-retry.ts` because it sat inside a `fetch` loop with no seam and had been changed twice on reasoning alone; 11 tests, force-red in all three directions — restoring the break fails 4, a fresh per-call deadline fails 4, dropping the verdict fails exactly 1.

  SUPERSEDED PLAN, kept because it is what the measurement replaced: **MEASURED 2026-08-16; the bound is shipped in code and AWAITS A PROD DEPLOY to be verified.** The rate is worse than the 1-in-3 first reported: **12 of 25** live eligible turns (**48%**) over 10 distinct questions, every one `eligible:true, offered:2, records:2, failed:null` — 10 turns answered carrying ≥1 hadith card, 1 `blocked:"fatwa"`, 2 model-path nulls. **The determinism premise behind the no-retry break is REFUTED, not merely doubted:** the SAME question with identical grounding produced both outcomes — `apakah sedekah boleh diungkit ungkit` ran bad, bad, ok, bad, ok, and `bagaimana hukum utang piutang dalam islam` ran ok, ok, ok, bad, bad. It is variance, so a second generation has exactly the evidence the break said it lacked. Erik ruled 2026-08-16: retry, **with a shared budget**. Shipped as `worker/src/answer-retry.ts` (`nextAttemptBudget`) — the `if (blocked === "bad_hadith") break;` is gone and `MODEL_DEADLINE_MS` is now read ONCE per turn and spent down by both attempts, because `callChatModel` defaults to a fresh `AbortSignal.timeout` per call and this loop passed no `deadlineMs`: two attempts could each spend 25 s behind a 30 s client backstop, generating and billing an answer the browser had already abandoned — the ISC-466 defect with the sides swapped, and reachable rather than theoretical (single generations measured at 26.7 / 27.4 / 28.0 / **31.1** s the same day, the last already past the backstop). A retry that cannot finish in what is left is refused by BUDGET (`MIN_RETRY_MS` 6,000 ms), never by violation name. The policy was extracted to its own module because it sat inside a `fetch` loop with no seam and had been changed twice on reasoning alone; 9 tests, force-red BOTH directions — restoring the break fails 4, a fresh per-call deadline fails 4. **What is not yet met:** the post-change rate. The 48% baseline is re-runnable by the same instrument, so unlike the 24% figure it can actually be beaten; measure it on the deployed Worker. ORIGINAL: **NOT MET — newly opened 2026-08-15 (late-2), and it is a DIFFERENT defect from the one just closed.** Across 9 live completions of `apakah sedekah boleh diungkit ungkit`: 5 returned `hadith:1`, **3 returned `blocked:"bad_hadith"` with `records:2` and `hadith:[]`**, and 1 returned `blocked:null` with no `[H:…]` marker in the prose at all. Before this deploy that verdict meant "no output could have passed"; now the marker we offer is writable and resolvable, so the same verdict means the model had everything it needed and still emitted an unresolvable receipt on roughly a third of generations. That is model variance and belongs in the prompt or in a retry policy — and note the no-retry break on `bad_hadith` (ISA § "The no-retry break … STAYS") was justified by determinism, which a 1-in-3 failure rate refutes: a second generation now has evidence behind it where it previously had none. Re-open that decision before widening anything else.
- [x] ISC-466: an answer the server finished is not thrown away by the client. **MET 2026-08-15 (late-2), deployed and verified live — worker `608b3e3c`, bundle `index-BN1JKt-B.js`.** The wait and the deadline are now different things: `FAST_ANSWER_MS` (9,000 ms) bounds what the READER waits, `MODEL_DEADLINE_MS` (25,000 ms, Worker) bounds the REQUEST, and the client's `TIMEOUT_MS` is demoted to a 30,000 ms backstop that must stay ABOVE the Worker's deadline — the Worker giving up is an honest degradation, the client giving up is a silent substitution we also pay for. Verified in real Chrome across four criteria: a 6,974 ms turn never shows the notice; a slow turn shows `.still-composing` at **9,134 / 9,220 ms** and upgrades IN PLACE with `.msg.nur` measured at 1 before, 1 during and 1 after; **no `AbortError` on any request**, the decisive run completing at **19,460 ms** — 7,460 ms past the old cutoff, an answer that was previously binned; and a second question submitted 4,416 ms into a slow one left the stored thread as `["bagaimana hukum utang piutang dalam islam:ai","aku sedih sekali hari ini:ai"]`, first still first, upgraded, not duplicated. The Worker also had NO server-side deadline before this, so every client abort left it generating into a void at full cost. ORIGINAL: NOT MET — the largest reader-facing defect in the generative path.
- [x] ISC-467: an answer sits beside the question it answers, under concurrency. **MET 2026-08-15 (late-2).** Found by the ISC-466 verification, not predicted: with a second question submitted 4.4 s into a slow one, the live thread rendered `me, me, nur, nur` — both answers detached from their questions. `mountAnswer` appended to the thread, but the skeleton it removed sat directly after its own `me` bubble, so `loading.replaceWith(answer)` restores adjacency and appending never could. It only became reachable in practice with the progressive answer, which returns from `ask()` while composing and deliberately frees the composer, making a mid-compose second question a SUPPORTED flow rather than a race nobody hits. **It self-healed on reload** — the persisted model was already correct and only the live append path mis-positioned — which is precisely how a defect survives: refreshing makes it disappear, so it never looks real. The crisis path had the same shape and took the same fix.
- [x] ISC-468: the `display` stage's 8.7-second outlier is explained. **MET 2026-08-16 — as a NEGATIVE result, which is the honest form of this criterion.** Both named hypotheses are falsified and the outlier did not recur once in **25 live eligible turns** across 10 distinct questions on prod, every one `eligible:true, offered:2, records:2, failed:null`. `display` measured **130–552 ms** (median ~137) and the whole dalil chain **1,110–2,309 ms**, against the single 8,710 ms observation. **Oversized: out** — the named shards pulled straight from R2 are `bukhari/043` **44,872 B**, `muslim/022` **285,563 B** (also `bukhari/038` 5,650 B, `bukhari/001` 42,945 B); two GETs of that size cannot spend 8.7 s. **Cold: out** — a second arm drove five fresh questions onto shards untouched that session (`Sahih al-Bukhari/11`, `Sahih Muslim/13`, `Sahih al-Bukhari/24`) on FIRST contact and measured 130–232 ms, so a cold shard is not slow. What remains is an unreproduced tail-latency event in R2 or isolate scheduling, recorded rather than fixed: there is no defect to change, and inventing one from a single sample is the exact failure this criterion was written to prevent. The instrument used is `/private/tmp/.../probe-display.ts` in shape: build `entries` by running the app's OWN `retrieveKnowledge` against the LIVE peta shards and hash-check each against the shipped `grounding-digest.json` BEFORE spending a model call — anything hand-written lands as `entries:[]` → `eligible:false` and measures nothing. Same run produced the ISC-465 measurement. ORIGINAL: **NOT MET — newly opened 2026-08-15 (late-2), and the timing instrument found it on its first real outing.** Run B of the live verification reported `ms:{"embed":621,"vectorize":277,"text_layer":0,"rerank":498,"display":8710,"total":10106}` — `fetchDisplayRecords` alone spent **8,710 ms of a 10,106 ms chain**, against 373 / 232 / 159 / 72 / 270 ms on every earlier observation. That is two R2 shard GETs, already issued in parallel, on a path with no model call in it. This is exactly the attribution ISC-461 was built to make possible: before the stage timings the turn would have read as "generation was slow" and the 8.7 s would have been invisible inside the total. Do NOT theorise from the code — one outlier is not a pattern, and this project has twice now drawn a confident wrong conclusion from too few observations. Collect N eligible turns with `dalil.ms` before diagnosing, and check whether the shard keys involved (`Sahih al-Bukhari/43`, `Sahih Muslim/22`) are cold, oversized, or contended.
  ORIGINAL DETAIL, kept because it is the measurement that justified the design: `TIMEOUT_MS = 12000` (`answer-live.ts:33`, shipped as `$s=12e3`) against measured server latency of **5,479 / 7,535 / 8,051 / 8,195 / 8,259 / 8,292 / 8,423 / 8,482 / 8,487 / 8,873 / 10,300 / 15,947 / 23,782 / 27,293 ms** for identical payloads. Observed aborts at 12,005 / 12,006 / 12,002 / 12,004 / 12,725 ms, each `AbortError: signal is aborted without reason`, each falling back silently to the Tematik index answer with zero hadith cards and no error shown to the reader. **On `bagaimana hukum utang piutang dalam islam` the UI aborted 3 of 3 times** — the one question whose API response is a clean two-hadith success, replayed without the abort signal in 8,482 ms. So the ISC-458 fix is invisible to readers on the question that best demonstrates it. The previous cycle rejected raising the constant on the grounds that a 25 s wait for a REFUSAL is its own defect, and that reasoning stands for refusals — but it was written believing the dalil chain caused the delay, which ISC-461 has now falsified. The real shape is a bimodal generation time, so the fix is a decision between streaming, a longer bound with a visible cancel, and a server-side cap — Erik's call, not a constant to nudge.
- [x] ISC-400: Anti: the attribution deploy regressed nothing — `2:255` and `1:1` still return 200 `audio/mpeg`, `#/surah/18` still renders its full set of play buttons (110 = Al-Kahf's ayah count), `POST /api/answer` still returns `{"answer":null}`, and the served bundle is SHA-256 identical to `web/dist`.

- [x] ISC-469: retrieval reaches the scholar's entries filed OUTSIDE the routed chapter. **MET 2026-08-16 (late-4), deployed and verified live — worker `bd46704a`.** The reported neraka question was never a ranking defect: the index holds NINE entries whose text says `neraka` across FIVE chapters (4 Perintah dan Larangan, 2 Ibadah, 1 each Allah / Membangun Pribadi Shalih / Muhammad) and `retrieveKnowledge` loaded exactly one shard, so five were unreachable at ANY ranking quality — they were never in the array being sorted. That is why tuning the ranker kept not fixing it. The pool is now widened by the SUBJECT words, reusing the ACTION_FRAME distinction ISC-464's fix established. Measured: the target question **4 -> 8** refs, the direct phrasing `apa yang menyebabkan orang masuk neraka` **1 -> 8**, `hukum riba dalam islam` **3 -> 4** (30:39 a genuine reach into Ekonomi Islam). Live probe on prod returned `8:13,74:43,3:131,14:28,14:29,14:30,85:10,9:68`. Probe: `web/src/shard-spread.test.ts`, force-red 5/10 with the widening neutered.
- [x] ISC-470: Anti: widening never MANUFACTURES an answer. **MET 2026-08-16 (late-4).** If the routed chapter matched nothing on-subject the honest silence stands, unchanged. The first cut of ISC-469 lacked this and took FOUR guards red at once: `hukum mendengarkan musik` began surfacing entries because `mendengarkan` is not an ACTION_FRAME verb but names no topic either, so once the pool widened it found chapters where the bare verb appears. Enumerating such words is what has failed in this repo three times, so the rule is structural instead — the routed chapter decides WHETHER there is an answer, the other chapters only how complete it is. Probe: `apa hukumnya pacaran` returns `[]` and `apa itu sabar` returns `null`, in `shard-spread.test.ts`.
- [x] ISC-471: Anti: a widened answer never shows the same verse twice. **MET 2026-08-16 (late-4).** One verse can be filed in several chapters, so reading more than one surfaced it more than once: `hukum riba dalam islam` returned QS 2:278 TWICE on the first run — once from Perintah dan Larangan, once from Ekonomi Islam. Two cards, same ayah, different caption, which on a scholarship surface reads as padding BY THE SCHOLAR. Deduped after the sort so the surviving copy is the best-scoring one and the routed chapter wins a tie.
- [x] ISC-472: every displayed entry can name the chapter it was collected under. **MET 2026-08-16 (late-4), verified live by screenshot.** The render says *"Ini yang {author} kumpulkan soal {category}"* and that sentence is false for a borrowed line unless the line can say where it came from — so `category` and `categorySlug` are REQUIRED fields on `KnowledgeEntry`, not optional. Borrowed lines carry a quiet `dari bab X` link home; when nothing is borrowed the original sentence is untouched, so the common case adds no new review surface. Live: *"...kumpulkan soal **Perintah dan Larangan** dan bab lain yang membahas hal serupa"* with `dari bab Ekonomi Islam` on QS 30:39. The added Indonesian went through the IndonesianPolish pass (`menyinggung` -> `membahas`: `menyinggung` reads first as *offend*, an ambiguity that is expensive on a religious surface).
- [x] ISC-473: Anti: ruling VOCABULARY selects no chapters. **MET 2026-08-16 (late-4), found by Erik's screenshot of the live app, not by any probe of mine.** After ISC-469 shipped, `apa hukum riba dalam islam dan kenapa dilarang` returned QS 33:52 (*"Dilarang menikah lagi dan mengganti istri"*), 5:49 (*"Dilarang mengikuti hawa nafsu manusia"*) and 33:48 under a question about riba — every one a genuine `dilarang` hit, not one about riba. `dilarang` reaches 4 categories and `wajib` reaches 7; `riba` reaches 2 and is the actual subject. `RULING_FRAME` is excluded from shard SELECTION only and deliberately does NOT feed `isFrameWord`, because a ruling word must keep scoring normally inside a chapter or `kenapa zina dilarang` would stop ranking a *"Dilarang..."* caption above one silent on the ruling. **Do not tidy that asymmetry away.** MY PROBE MISSED IT because it asked `hukum riba dalam islam` and dropped the trailing `dan kenapa dilarang` — the shortened question a developer types, not the one a person does; the tests now use full phrasings. QS 7:19 still appears on ruling questions and is NOT from this change — it is in the routed chapter and was always reachable.
- [x] ISC-474: the reader never meets markdown syntax. **MET 2026-08-16 (late-4), reported by Erik with a screenshot and verified live at 0 raw asterisks.** Mid-answer, in a paragraph about sins a person does not notice themselves committing, the app rendered `**sikap meremehkan dosa kecil**` asterisks and all. The model writes markdown; the render escapes BEFORE it linkifies (it must — the other order hands a model-authored string an HTML injection surface), so the markers survived escaping as literal text. `mdEmphasis` runs AFTER `esc`, where the input is already inert, and converts bold and italic ONLY — headings and bullets are not emphasis, and silently rendering them would hide a prompt problem. It lives in `web/src/prose-format.ts` rather than `main.ts` because `main.ts` is the entry point with no exports, so nothing in it can be unit-tested. Chasing the count to zero found a SECOND surface: the sunnah.com export carries markdown in the corpus itself (every narration opens `**Narrated \`Aisha:**`). Rendering it is presentation, NOT correction — no word of the narration changes. Probe: `web/src/prose-format.test.ts`, force-red 5/10 with the function neutered to identity.
- [x] ISC-475: the reader's own question is on screen when the answer lands. **MET 2026-08-16 (late-4), reported by Erik, verified live at `top=70px` in an 816px viewport after a settled second turn.** `scrollDown` pinned the BOTTOM of the page, which read fine while the skeleton was the last thing in the thread — then the answer landed, the page grew by several screens, and the same call threw the reader past their own question to the foot of an answer they had not started reading. From the second question onward Erik had to scroll UP to see what he asked. The AI-upgrade path was the worst of the four sites: it fires a beat AFTER reading has begun and yanked the viewport out mid-sentence. `scrollIntoView` rather than arithmetic ON PURPOSE — body carries `zoom: .9`, which desynchronises `getBoundingClientRect()` from `window.scrollY`, and hand-rolled offset maths against that has already cost this project a session. Header clearance rides on `scroll-margin-top` in the stylesheet.

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
| ISC-313 | build | run the builder, check exit code and both output paths | exit 0, both exist | `bun run okf:text` |
| ISC-314 | data | compare rerank-blob key count to display-record count | equal (14735) | `bun -e` |
| ISC-315.1 | anti | look up the Arabic-only record in both artifacts; read the `searchDalil` filter | 0 hits, filter present | `bun -e` + `Grep` |
| ISC-315,316 | data | scan every display shard for an empty `arabic`/`english`/`translator` | 0 empties | `bun -e` |
| ISC-317 | anti | look up the known-private record id in both artifacts | 0 hits | `bun -e` |
| ISC-318 | anti | ask git whether each artifact is ignored | rule named for both | `git check-ignore -v` |
| ISC-319 | live | fetch both keys back out of the private bucket | bytes returned | `wrangler r2 object get` |
| ISC-320 | data | compare committed manifest digest to the text layer's | identical string | `bun -e` |
| ISC-321 | anti | read the bucket's public-access settings | r2.dev disabled, no domain | `wrangler r2 bucket info` |
| ISC-322 | static | read the `CANDIDATE_K` constant | `≥ 40` | `Grep` |
| ISC-323,324 | live | curl the dev probe against the real index for both questions | expected id at rank 1 | `wrangler dev --remote` + `curl` |
| ISC-325 | static | read the rerank document construction | body is concatenated | `Grep` |
| ISC-326,327 | static | read `MAX_RETRIEVE`, `MAX_DISPLAY`, `capForDisplay` | 8 / 2 / slices | `Grep` |
| ISC-328 | anti | grep `dalil.ts` for a comparison against either score | 0 hits | `rg` |
| ISC-329 | static | every failure path is a `throw`, none returns cosine order | 0 silent fallbacks | `Grep` |
| ISC-330 | static | the blob cache is module-scope, guarded by a null check | present | `Grep` |
| ISC-331 | anti | ask git whether the prod config changed | not listed | `git diff --stat` |
| ISC-332 | static | grep both wrangler configs for the binding | probe only | `rg` |
| ISC-333 | anti | grep the index builder's metadata map for body fields | 0 hits | `rg` |
| ISC-334..344 | unit | the `bad_hadith` and honorific suites | all pass | `bun test` |
| ISC-345..352 | unit | the hadith-card suite | all pass | `bun test` |
| ISC-353 | regression | full suite on a corpus-bearing checkout | 0 fail | `bun test` |
| ISC-354 | regression | all three tsconfigs | exit 0 | `bun run typecheck` |
| ISC-355 | anti | compare live Worker version ids to the checkpoint | unchanged | `wrangler deployments list` |
| ISC-459 | unit | hold the embed stub open, assert `r2:start` logged before `embed:end` | ordered | `bun test worker/src/dalil.test.ts` |
| ISC-460 | anti | revert to the use-site call and re-run | exactly 1 fail | `bun test` (forced red) |
| ISC-461 | live | one eligible question on prod, read `dalil.ms` off the body | `total` attributed per stage | `curl` / `Interceptor` |

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
| okf-text-layer | `src/okf/build-text-layer.ts` + `upload-text-layer.sh` — two derived artifacts in private R2: a gzipped English-only rerank blob (machine-only) and per-book display shards carrying Arabic + English + attribution (reader-facing, fetched only for records that pass the cap) | ISC-313..321 | okf-index (prior session) | no (foundation) |
| dalil-rerank | `worker/src/dalil.ts` — widen the candidate window to `CANDIDATE_K`, rerank on citation line + English body with `voyageai/rerank-2.5`, cut to `MAX_RETRIEVE`; `fetchDisplayRecords` resolves capped hits to reader text | ISC-322..333 | okf-text-layer | no |
| bad-hadith-guard | `web/src/answer-guard.ts` — fourth HARD rule: opaque `[H:coll:n]` markers resolved against the turn's accumulated grounding, plus a PROPHETIC construction list built like VERDICT; honorific exemption for ﷺ/ﷻ | ISC-334..344 | — | yes (independent of retrieval) |
| hadith-card | `web/src/hadith-card.ts` — the only surface allowed to show hadith text: Arabic + English verbatim, collection, number, grade, source_url, translator; cap re-applied; no Indonesian without a per-record ustadz approval | ISC-345..352 | bad-hadith-guard | yes |

## Decisions

**2026-08-16 (late-3) — frequency was tried a THIRD time against this index and failed a third time.** The routing fix landed the question in the right chapter and the entries were still wrong: 16 entries matched, the score histogram was `{1: 16}`, and a stable sort plus `MAX_ENTRIES = 8` returned the chapter in ascending surah order, cutting 14:28-30. The first attempt at a fix weighted each matched word by `log(1 + N/reach)` computed from the shard. It recovered 14:28-30 and was still wrong: within the routed chapter the reaches are `lakukan` 1, `membuat` 3, `neraka` 4, `masuk` 9, so IDF ranks the two generic verbs ABOVE the subject, and widening the sample to all 2,451 entries does not separate them either (`membuat` 8, `neraka` 9, `lakukan` 10). The captions are terse imperative headings, so a common verb is not a frequent word in them. `topic-words.ts` already recorded this exact refutation twice, in the `STOP` and `QUESTION_FRAME` docblocks; the IDF branch was written and reverted before either was read. **The separator is word CLASS**, and the fix is `ACTION_FRAME` — action verbs (doing, causing, becoming, entering) may still rank, but may not count as a question's SUBJECT.

**refined: the verb half deliberately does NOT reach routing.** `subjectWordsOf` still consults `QUESTION_FRAME` alone, so every slug pinned in `topic-broad-tier.test.ts` is byte-identical. Routing had no measured defect after the previous session's fix; a selection fix has no business moving it.

**The cost, measured across 37 questions rather than the one that was reported: zero-entry outcomes went 6 → 7.** "apa yang harus dilakukan saat marah?" lost its only two entries (3:135/3:136, surfaced on `dilakukan` while the question is about anger) and now returns none. That is the intended class of change — an entry reached only through a frame verb was never on-subject — and `marah` is a feeling word, so the feeling lane owns that question before this path sees it. Recorded as a real trade, not as a free win.

**Ranking tests now assert REFS, and that gap is the systemic finding.** Every routing test in the repo asserts a slug; none asserted what entries came back, which is why the reported failure was declared fixed while half of it shipped. `web/src/entry-ranking.test.ts` pins literal refs for the target and for four already-correct control questions.

**No scholar has approved this, and a pending ask covers exactly this act.** `docs/review/hukum-pin-request-2026-08-12.md` — status `BELUM DIKIRIM`, never sent — asks the ustadz precisely whether an entry may be *excluded* from a question's results ("Bolehkah 4:25 kami **keluarkan** dari hasil pertanyaan nikah?"). So exclusion-from-results is a pending question, not a granted permission. It is not a blocker here: nothing is deleted from the index, the entry stays reachable at `#/peta/{slug}`, the rule is a generic word class rather than a per-entry editorial verdict, and the same class of unilateral suppression already ships as `MARRIAGE_HOLD` in `tafsir-tier.ts`. The previous session's reasoning does not carry over and must not be reused: "surfaces MORE of his entries, therefore inside the display permission" does not invert into "surfaces fewer, therefore outside it" — fewer entries can only understate coverage, never overstate review, which is the safer of the two errors under `docs/review/hadith-id-approval-2026-08-12.md`. Recorded as Erik's call. Neither Ustadz Muhammad Thalib nor Ustadz Ahmad Isrofiel has reviewed it.

**Carried, not fixed — the zero-entry pointer misstates the cause.** It says *"Pertanyaan soal {category} itu luas"*, attributing an empty result to the question's breadth. For a narrow question the real cause is that the index holds no on-subject line; `knowledge.ts`'s own comment states both halves and the copy carries one. Authored-surface edit, its own diff.

**Known and NOT addressed: the single-shard ceiling.** The index holds nine `neraka` entries across five chapters and `retrieveKnowledge` loads exactly one. Four are reachable; five are not, at any ranking quality. `retrievePinned` is the only multi-shard path and fires for one hand-curated pin.

**2026-08-13 (late) — the hadith wall is opened, and the handoff named two blockers where there were three.** ISC-434/435 were the two the handoff listed: nothing retrieved hadith on the `/api/answer` path, and the prompt never taught the `[H:collection:number]` receipt. Both are now shipped. The third was found while building: `synthesizeAnswer` re-guards the Worker's prose in the browser with the `() => false` default, *deliberately*, as a documented second wall — so shipping only the two would have had the Worker approve a hadith answer and the browser silently discard every one of them, with no error anywhere. The comment there is right that threading a permissive predicate through would remove a wall rather than fix one; the resolution is that the Worker returns the records it resolved and the browser rebuilds its predicate from THOSE ids. Same question, asked of data the browser can see for itself. ISC-452.

**The knowledge-shaped gate needed no new classifier.** The constraint carried forward from the retrieval work was to gate hadith grounding to knowledge-shaped questions — 9/9 there against 1/4 on feelings, where it rebukes an anxious person. `entries.length > 0` already IS that gate: `gatherGrounding` runs the scholar's index only after the feeling path came up empty, so populated entries mean, by construction, that no feeling was found to answer. A second classifier here would have been a second opinion free to drift from the first.

**refined: capped BEFORE offering, not after.** `searchDalil` returns up to 8 so the reranker has room; the reader may see 2. Offering the model all 8 would let it cite the 5th, whose marker resolves against the turn's grounding and passes every guard — and then no card renders, because display is capped at the top 2. That is a prophetic attribution with nothing behind it, the exact state `bad_hadith` exists to prevent. Capping the offered set makes citable ≡ displayable by construction.

**ISC-379's literal wording is superseded; the thing it protected is not, and the gate is CLEARED rather than bypassed.** Both ISC-331 and ISC-379 held one line: the dalil surface stays off the trustworthy edition until the ustadz-gated flip. There is no trustworthy edition at this scope any more — Erik set `EDITION = "synthesis"` on prod on 2026-08-12, asked for directly and twice — and Erik ruled on 2026-08-13 that the ustadz's approval of the machine Indonesian extends to the answer card. So the bindings land, and what was protected is restated as its own probe (ISC-450) rather than an anti-criterion being reinterpreted to fit the work. Same move ISC-379 made on ISC-331, for the same reason.

**The no-retry break on `bad_hadith` STAYS, for a reason that moved rather than disappeared.** It used to be determinism: with no marker syntax and nothing retrieved, both attempts failed identically, so the second was pure waste. Now the fix is upstream — the first generation already has the hadith and the syntax — so a `bad_hadith` verdict means the model had everything it needed and chose an unbacked attribution anyway. A second ~6s generation on that is a bet with no evidence behind it, and the latency finding that motivated the break (12s `TIMEOUT_MS` against two ~6s generations) is unchanged. Whether that bet is right is exactly what ISC-454 measures live.

**Deviation, stated rather than buried: the E3 delegation floor was not met.** Zero delegation capabilities were invoked against a soft floor of 2, because this session's harness directive forbids the Agent tool unless Erik asks for it. The thinking capabilities (RootCauseAnalysis on the blocking chain, FirstPrinciples on what ISC-379 actually protects) were applied inline rather than through skill loads, which is a genuine departure from the hard thinking floor and is recorded here rather than papered over.

**2026-08-12 (late night) — the wall was OPEN, and only a live probe could have found it.** After deploying the reason-channel work, verifying it in real Chrome turned up something worse than the bug it fixed: prod answered Erik's question with *"Rasulullah shallallahu alaihi wasallam **mengajarkan** bahwa tidaklah seorang muslim tertimpa kelelahan…"* — a genuine hadith, no receipt, guard `ok = true`, zero violations. The verb list held `menganjurkan` and not `mengajarkan`.

**Erik's call, asked explicitly because it trades one failure he has twice refused against correctness:** widen the wall and deploy. Widening was only affordable because the pointer work landed first — before it, every extra catch meant more cold silence, which is exactly what he rejected. The two changes are a pair; neither is shippable alone.

**refined: the design is two patterns, not a longer list, and that was measured rather than reasoned.** A flat widening rejects *"Kisah Nabi Yusuf mengajarkan kita arti kesabaran"* — Qur'anic narrative, the app's whole purpose — and the loss would have been silent. `bahwa` discriminates grammatically: it marks a complement clause, so `mengajarkan bahwa X` reports a saying while `mengajarkan kita kesabaran` draws a lesson.

**What this says about the last two sessions' evidence.** The silence-vs-answer flip on one question was diagnosed as a stale bundle, then as a blanket refusal. It was neither: the outcome depended on which verb the model picked. Every claim about this wall to date was verified against prose written BY US, never against what the model actually emits — which is why an open wall read as a closed one for two sessions. **A guard's test corpus must come from production output, not from the author's imagination.** ISC-440 stays open because the list is still an enumeration: the next unlisted synonym leaks identically.

**Also corrected: ISC-436 was recorded `[DEFERRED-VERIFY]` and should have been FAILED.** The live probe was possible — it just had not been run yet. Deferring a verifiable criterion is how a failure gets filed as a pending task.

**2026-08-12 (night) — the hadith wall is not a wall, and the named fix would not have changed a byte.** Erik hit `{"answer":null}` twice on *"apakah benar bahwa sakit itu akan menghapus dosa kita?"*, reproduced cold here with an ayah-question control that answered in full. The prior handoff diagnosed it as `worker/src/index.ts:509` calling the guard with two arguments, so `isGroundedHadith` defaults to `() => false`, and prescribed wiring the predicate through.

**That diagnosis was true and insufficient, and acting on it alone would have closed the item having shipped nothing.** The wall is unpassable at THREE independent layers, each on its own sufficient: (a) the two-argument call; (b) `handleAnswer` never calls `searchDalil`, so there is no retrieved hadith to build a union from — `groundedHadithFrom([])` is byte-identical to the default, now pinned as a regression test (ISC-433); (c) `SYNTHESIS_SYSTEM_PROMPT` never teaches the `[H:collection:number]` marker syntax — zero mentions in `answer-contract.ts` — so the model *cannot* emit a receipt regardless of (a) or (b). Layer (c) is the deepest and was not in the handoff at all.

**refined: what actually ships is the handoff's step 2, and it is the whole user-visible win.** The endpoint had ONE null channel for two unrelated events — "nothing to say" and "I had something good and my wall stopped it" — and the browser rendered the corpus-gap copy for both. For a hadith question that copy is a false statement about the app's own knowledge: an answer WAS found, and the app reported its deliberate withhold as ignorance, teaching the reader it does not know. Fixing the collapsed channel also fixes it for `fatwa`, `arabic` and `bad_ref`, which is why it is the upstream-most shippable point.

**Not done, deliberately.** ISC-434 (wire `searchDalil`) and ISC-435 (teach the marker syntax) are the real hadith-answer path, and they are gated behind a question that is not ours: whether hadith TEXT may display at all is still with Ustadz Ahmad, and a marker that resolves is only useful if a card may render. A pointer to the `#/hadis` tab touches none of that. `SHOW_MACHINE_HADITH_TEXT` untouched.

**Show-your-math on the E3 delegation floor (1 of 2, under floor):** no `Agent` calls — this session's instructions forbid them unless Erik asks, which outranks CLAUDE.md's E3 Forge auto-include. Forge's highest-value target here would have been the guard regexes, and `PROPHETIC`/`VERDICT`/`DEFER` are untouched by design: narrowing them to "let good answers through" is how a fabricated hadith ships.

**2026-08-12 (evening) — PRODUCTION NOW AUTHORS. The edition's founding guarantee is deleted, deliberately, by Erik.** `new-quranku.axiara.ai` served `EDITION = "principled"` since launch: the app quoted sourced material verbatim and composed nothing. Erik asked for the change directly and twice, on evidence — asked *"kenapa kita harus salat lima waktu"* the app returned **eight index captions and no explanation**, and his judgement was that he would not put that in front of a user. **His words: "I hate to see [it] … I'm not gonna go with this kind of answer."**

Measured before acting rather than estimated: the capability was never missing. `OPENROUTER_API_KEY` was ALREADY on the prod Worker; `worker/src/index.ts:476` refuses to author unless `EDITION === "synthesis"`. The gap between the answer Erik hated and the answer he wanted was **one config line plus a `VITE_ANSWER_MODE=synthesis` rebuild** — a lock, not a missing feature.

**What did NOT change:** grounding is still retrieval-only, `fatwaShape` (`answer-guard.ts:182`) still rejects prose that issues a ruling, output is still labelled AI-composed and never attributed to a scholar. Warmth unlocked; verdicts not.

**What this does NOT fix, and must not be read as fixing:** synthesis composes over whatever retrieval returns. It DRESSES retrieval, it does not correct it. `nikah beda agama` still grounds on QS 4:25 — so that answer is now fluent AND wrong, which is *harder* for a reader to discount than a visibly cold list. Fixing the routing is the next job and is now more urgent than it was this morning, not less.

**STILL OPEN: Ustadz Ahmad has had a heads-up on AI-authored answers, never a sign-off.** Recorded as Erik's call, made knowingly after the cost was stated. Revert is TWO halves — `EDITION = "principled"` **and** a rebuild without the flag; the config carries that note, because the flag alone leaves a front end still calling `/api/answer`.

**2026-08-12 (evening) — the first authored answer cited verses it never showed.** `aiHtml` resolved citations against `corpus.verses` — the 191 REVIEWED verses only. The model cited QS 4:103 and QS 20:14, both real and both correct, neither among the 191, so every card was filtered out and the page rendered prose followed by *"berdasarkan ayat-ayat **di atas**"* with no ayah above it. The disclaimer pointed at nothing. Citations now resolve against the whole mushaf through the same shard loader the reading surface has used for months; curated verses still win when one exists, because they carry the reviewer's `why` and the `passage` a conditional approval was granted inside. An unloadable shard is DROPPED, never faked, and the note drops "di atas" when nothing is above it.

**2026-08-12 — the third tier quotes Al-Mukhtasar, and the reason is measurement, not authority.** Scanned all 6,236 tafsir shards before designing: Al-Mukhtasar is Indonesian in every one, present in every one, p50 292 chars and max 2,976. Ibn Kathir is **English in every single shard** — leading an Indonesian reader with it is the wound this app exists to heal. As-Sa'di runs to 39,525 chars on 4:11, the flagship inheritance verse this tier was built for, so quoting it means either an unreadable bubble or cutting a scholar mid-sentence, and a truncated quote is not verbatim. Al-Mukhtasar is the only source that can be quoted WHOLE. Tier 3 therefore makes no ordering claim, which is exactly the question still open with Ustadz Ahmad — the unranked three-scholar stack is untouched, one tap away.

**2026-08-12 — prominence is a ranking signal even when the reason is length.** An advisor call at the commitment boundary named it: the reader sees one tafsir printed and three names in a drawer; they do not see the character counts. The justification lived in a commit message while the claim lived on the glass, against a stated no-adjudication guarantee. Fixed by rendering the criterion as visible text (`.tier3-why`), verified live rather than grepped — a disclaimer that lives in a data field can silently never reach the screen. The advisor's stronger fix (an equal-weight three-row disclosure) is NOT built: it would redesign the shipped verse card on the reading surface too. **Erik's call, and it belongs in the review letter already in flight.**

**2026-08-12 — the marriage hold is a review hold with a named expiry, and it is deliberately narrow.** `apa hukum nikah siri` returns 1 entry whose lead ref is QS 4:25, an answer this project already records as *worse than silence*. Tier 3 would have promoted it into a verse card plus a scholar's tafsir on slavery under a marriage question — the feature built to make thin answers honest making the worst live answer louder. Held until `docs/review/hukum-pin-request-2026-08-12.md` comes back. `talak` (2:229) and `warisan` (4:11) are NOT held: both measured correct end-to-end, and holding them trades a good answer for silence on no evidence.

**2026-08-12 — show your math: delegation floor taken as 0 at E3.** The harness system prompt forbids spawning agents unless Erik asks, which outranks CLAUDE.md's Forge auto-include. What Forge would have done — adversarially read the fire/hold predicate for cases the 22-question probe missed — was done instead by the advisor call plus a 16-phrasing adversarial probe, and it earned its keep: it is what surfaced the `menikahi` leak.

**2026-08-10 — The synthesis Worker had been DELETED, and a "522" hid it for an unknown stretch.** The handoff carried `new-quranku-ai` forward as "likewise unchanged"; it was returning HTTP 522. Not a broken deploy — `wrangler deployments list --env synthesis` answered `This Worker does not exist on your account [code: 10007]`. **A 522 on an assets-serving Worker means the Worker is gone, not that an origin is sick** — an assets Worker has no origin to be sick, so the route was falling through toward the dead Cloud Run host. Recreated as Version `95a8a7f8`, route re-bound, verified 200 + rendering in real Chrome. A recreated Worker starts with **no secrets** (`secret list` → `[]`), so `/api/answer` returns `{"answer":null}` and Tanya degrades to keyword retrieval until Erik re-runs the interactive `wrangler secret put OPENROUTER_API_KEY --env synthesis`. This also refutes `principled-worker-no-key`: prod's `new-quranku-proxy` **does** now hold the key (that memory was deleted).

**2026-08-10 — refined: the demo needs no theme work, because its premise was wrong.** The handoff's first item read "demo-quranku.axiara.ai still serves the OLD parchment theme". A live probe on the running page returned `data-theme:"light"`, body `rgb(247,249,250)` = `#f7f9fa` — a cool near-white already in the same register family as the new light theme, holding light even though the machine prefers dark. There is no parchment. And a deploy could not have changed it either way: `web/demo/demo.css` is a standalone 86KB sheet with **zero `@import`** of the app tokens, built through its own `vite.demo.config.ts` into `dist-demo`, so the light-register commits never touched it. Retheming the demo is a CSS job, not a deploy. Erik chose to leave it alone — the demo is a deliberate QuranKu clone (its own `--qk-secondary: #efc851` carries the comment *"QuranKu uses gold freely — this is THEIR design, not New-Quranku"*), and repainting it stops it being a clone.

**2026-08-10 — the warm accents stay.** Measured in genuine light mode (CDP `emulate`, `prefersDark:false` + `attr:light`, so no ink desync): `.srow-spine-ar` renders `#a8741f` and the MAKKIYAH pill `.srow-rev.meccan` renders `#7a5e17`. Both warm, on the new cool ground. Erik's eye on the screenshot: keep both as-is, consistent with his reference. Note the forcing method matters — the stylesheets key dark on **both** `prefers-color-scheme` and `[data-theme]`, so flipping the attribute alone on a dark-preference machine produces a desynced fake rather than the light register.

**2026-08-10 — equran stays local, against my recommendation.** I recommended a private GitHub repo (matching `tafseer-okf` and `komdigi-cli`, the only two siblings with remotes) on single-disk-risk grounds. Erik chose to leave it local for now. Recorded because the risk is the same one he spent the night eliminating for the OKF corpus; it is his call and not a blocker.

**2026-07-23 — The seven return; the merge Erik chose was dropped because retrieval makes it impossible.** Erik chose "merge co-ranged pairs into one card" and "restore all 7" over two options I posed. Building the merge, I read `retrieve.ts` and found its one-verse-per-feeling diversification makes 20:25/20:26 (both StudyStress) and 23:60/23:61 (both Fear of insincerity) mutually exclusive in any single answer — the second always finds its only theme already claimed. So the pair-duplication the merge was meant to fix cannot occur, and each verse's co-display range already includes its sibling (both are always co-visible). I dropped the merge as dead code, surfaced the correction to Erik, and proceeded with the strictly-smaller plan. This reverses a stated choice on a technical finding; deploy stays Erik's call so he sees it before anything ships. ISC-220 pins the invariant with a test that fails first if retrieval ever changes.

**2026-07-23 — refined: the share "leak" was latent, not live.** The co-display checkpoint framed `web/src/share.ts` as a *blocking* gate. Verified otherwise: the Tanya answer cards (`curatedCardHtml`) carry no copy/share button, so the live demo has no conditional-verse egress; the leak lives only in the non-deployed `web/src`. Closed it anyway (ISC-221/222) so the shared corpus is safe for any future deploy — "everything by the rules" — but it was never blocking the restore.

**2026-07-23 — the fragment + backref build gates learned a principled exemption, not an allowlist.** Adding 23:60/23:61 tripped both gates (a lowercase opener and "mereka itulah" backref). Rather than allowlist two refs, the gates now exempt any verse whose `codisplay` range starts before the subject — because a preceding ayah in the same passage IS the machine-readable proof the reader is handed the sentence's beginning. This is not a silent disarm: the exemption is tied to a real structural invariant `buildPassage` enforces (contiguous range containing the subject), so it generalises correctly to future co-displayed content and a non-co-displayed fragment still fails loudly. The advisor pushed for an allowlist; I kept the general rule because an allowlist would fail the build on a legitimately-fine new co-displayed fragment while adding no safety.

**2026-07-18 (Cycle 5 tune — REVERTED, see below).** The eager retune + few-shot below made the classifier WORSE, not better: it returned `[]` even for unambiguous feelings ("aku sedih banget kehilangan ibuku"). Root cause: a few-shot example that outputs `[]` primed the model to over-produce `[]` at temp 0.2, compounded by two `[]` mentions in the instructions. Compose was unaffected (isolating it to the classify prompt). Reverted to the known-good original prompt + user message in `09a65d0`; KEPT the compose retry (Opt 2) and keyword-skip gate (Opt 1). The false-silence concern is real but tuning a stochastic model via live deploys thrashed — proper fix deferred to an OFFLINE eval harness (run 20–30 phrases locally, tune, then deploy once). Lesson: never tune an LLM classifier by live-deploy trial-and-error; build the eval first. The strike-through entry below is kept for the record.

~~**2026-07-18 (Cycle 5 tune) — the classifier is retuned eager-but-bounded: false silence violates "silence must be true".**~~ Live testing found the classifier returned `[]` on ~40% of calls for a clear borderline feeling ("aku merasa makin jauh dari Tuhan"), producing SILENCE where 39:53 fits perfectly — a *false* silence, since the corpus holds the verse. The old `THEME_SYSTEM_PROMPT` rule 3 ("if nothing genuinely fits, return empty; a wrong theme sends the wrong verse") was too shy. Retuned: classify ANY genuine feeling (even subtle/spiritual — distance from God, emptiness), return `[]` ONLY for non-emotional input (factual/command/spam/gibberish). Tradeoff accepted: an eager classifier risks a mildly-off verse on a truly-ambiguous phrase, but (a) the framing POINTS never AUTHORS, so an off verse is "here's a verse" not a false claim about God; (b) Opt-1 means the classifier fires only on keyword-misses — exactly the unusual phrasings we want it to reach; (c) the crisis check still runs first. Prompt-teeth tests still pass. Re-verify the `[]` rate after redeploy (worker + app both import the prompt).

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

- **2026-07-22 — The shard-backed lanes render without a passage, deliberately.** Two of the demo's
  five verse-render paths load from surah shards, which hold no curation and therefore no `passage`:
  the direct `20:26` ref lookup, and the anchors on a reviewed aqidah answer. They keep that
  behaviour, mirroring the main reader (`web/src/main.ts` `case "ayah"`). The reasoning: on a direct
  lookup the app makes no claim — no `why`, no theme, no curation, just "Ini Taha 20:26" — which is
  the same act as opening a printed mushaf. The condition attaches to *our offering a verse as an
  answer*, not to the verse existing. Recorded as a decision rather than left implicit because it is
  genuinely arguable: the stated reason for two of the seven (41:35 "berdiri sebagai kelanjutan ayat
  34", 92:7 "bergantung pada syarat di ayat sebelumnya") is a property of the TEXT, which is true no
  matter who asked. Worth putting to the ustadz at the meeting. A smaller related gap: the main
  reader gives a direct lookup a "Baca lanjutan" link into the surah; the demo's card has no
  `continueTo`, so its lookup is a dead end where the reader's is a doorway. Not fixed here.
- **2026-07-22 — The pair-duplication case is known, unfixed, and Erik's call.** Two of the seven
  conditional verses are PAIRS inside one range (20:25 + 20:26 in 20:25–28; 23:60 + 23:61 in
  23:57–61). If both members co-retrieve in one answer — and the demo returns exactly 2 hits, so a
  pair consumes the whole answer — each renders its own card with its own copy of the range. Every
  ayah then appears exactly twice, and each subject appears once as a headline verse and once
  demoted to grey context for its sibling. Not a doctrinal failure: the required context is fully
  present on both cards and no caption is transplanted. It is a presentation defect — a stutter and
  a status inversion mid-scroll — and it is guaranteed the first time a pair co-retrieves. Deferred
  to the restore step (1b), where the options are visible: merge co-ranged hits into one card, or
  suppress a hit already displayed as a neighbour.
- **2026-07-22 — Delegation floor met at 1 of 2 (show your math).** Forge ran an adversarial pass
  over the diff and earned its cost — it found the fifth render path (`renderToday`), the truncated-
  ref guard hole, and the wiring test gap, all three of which are fixed above. The second delegation
  would have been Anvil for whole-project context, and it was not spent: the change touches one
  directory (`web/demo/`) against a reference implementation (`web/src/verse.ts`) already read in
  full, so long-context reasoning had nothing to reach for that a direct read had not already
  supplied.

## Changelog

**2026-08-15 (late+1) — "the model declined to cite" was a claim about the model made from evidence that only ever described the prompt.**
- **conjectured:** that retrieval works and *"the model then attributes something prophetic without a
  resolvable `[H:…]` marker"* — so the remaining hadith job is prompt tuning, and the fix belongs in
  `SYNTHESIS_SYSTEM_PROMPT` / `buildAnswerUserMessage` with a failing test written from captured prod prose.
- **refuted by:** reading the live text layer instead of the prompt. `okf-corpus/text/8177e2e6e6c47370/display/bukhari/024.json`
  carries `id "hadith-bukhari-1349"` beside `collection "Sahih al-Bukhari"`, and the offer line was built
  from `collection`. The marker printed was `[H:Sahih al-Bukhari:1349]`, which `MARKER_IN_PROSE`
  (`/\[H:([a-z][a-z-]*):\d{1,6}\]/`) cannot match and `markerToId` cannot resolve. A control-armed probe
  then reproduced prod offline: same question, same records, same prompt — the old marker construction
  yields `bad_hadith`, the new one yields `ok`, and in BOTH arms the model copied the offered marker
  faithfully. The model was obeying rule 7 exactly as written.
- **learned:** `blocked:"bad_hadith"` names the rule that fired, never who is at fault for it. Reading a
  guard verdict as a statement about the model is the same error as reading a 200 as a statement about
  content: the diagnostic was honest, and the sentence built on top of it ("the model declined") added
  an actor the evidence never contained. The check that would have caught it is cheap and was available
  all along — before concluding a model *chose* not to satisfy a rule, construct by hand the output that
  WOULD satisfy it. Here that output does not exist.
- **criterion now:** ISC-455 (offered ≡ resolvable, by inverse-function construction rather than by two
  files agreeing), ISC-456 (control arm mandatory, and its records must be topically real — a first run
  with irrelevant hadith had the model correctly decline in both arms and would have read as "no effect"),
  ISC-457 (an id outside the grammar is dropped, never offered uncitable).

**2026-08-13 — "The model is not reading our grounding" was a one-armed measurement, and the control reverses it.**
- **conjectured:** that grounding is inert on the authored path — that *"every retrieval fix, curated
  pin and topic correction is invisible, because the model is not reading them"*. The founding
  evidence was two live probes: grounding forced to QS 4:25 answered with 2:221/5:5/60:10, and no
  grounding at all still produced a complete fiqh answer. The 2026-08-13 handoff made this item 0 and
  BLOCKED the continuous-chat build on it.
- **refuted by:** the control neither probe had. `src/eval/grounding-probe.ts` runs the same question
  under three grounding arms — the fitting ayah, nothing, and an unrelated real ayah — against prod's
  model (`deepseek/deepseek-v4-flash`), prompt and params. 16 cases × 3 arms × 3 samples, 141 usable:

  | arm | cites the fitting ayah |
  |---|---|
  | grounded | **96%** (46/48) |
  | blank (the control) | **35%** (16/46) |
  | **lift** | **+61 pts** |

  Split by group to kill the obvious confound — ISC-418 was born on a fiqh question, where the model's
  priors are strongest, while the curated corpus is feelings: **feeling +66 pts, hukum +53 pts.** The
  lift survives exactly where it was predicted to collapse.
- **learned:** the two founding probes measured the model OVERRIDING WRONG grounding, not the model
  ignoring grounding — a different fact wearing the same clothes. The decoy arm reproduces them
  precisely: handed an unrelated real ayah the model takes it only 26% of the time, and on hukum only
  **11%**. So *"a wrong retrieval the model ignores and a right retrieval the model ignores are the
  same event"* — the sentence this ISA drew the whole diagnosis from — is **false**. They are not the
  same event, and only varying the grounding while holding the question fixed can tell them apart.
  **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
- **criterion now:** ISC-418 stays NOT MET, but on the one leg that actually survived: **the model
  never bows out.** 46 of 46 blank samples answered in full, and 35% landed the fitting ayah from
  parametric memory alone. There is no "I have no material for this" path on the authored edition.
  That — not inert grounding — is the open product question, and it is Erik's, as ISC-418 always said.
  The retrieval half is worth 61 points of citation control and is NOT invisible.
- **incidental, and it belongs to ISC-434/435:** `bad_hadith` blocked **24% (34/141)** of raw
  candidates and `fatwa` 1%. `worker/src/index.ts:554` BREAKS rather than retrying on `bad_hadith`,
  so each one is a reader receiving `{answer:null}` — roughly a quarter of ordinary warm questions.
  About a fifth of those refusals are the ISC-440.6 over-refusal class, now corroborated on live
  generations rather than written cases (*"Nabi Ya'qub dalam QS Yusuf 12:86 mengajarkan…"* — the
  Qur'an, cited with a resolvable ref, refused as an unsourced prophetic attribution).

**2026-08-12 — The urgent bug was fixed by a change nobody made, and the fix is what should worry us.**
- **conjectured:** that synthesis DRESSES retrieval — that `nikah beda agama` would keep grounding on
  QS 4:25 and the authoring layer would render that wrong verse fluently, making it harder to
  discount. ISC-416 was written on this premise and carried as the most urgent item in the repo.
- **refuted by:** posting to the live `/api/answer` with the grounding **forced to QS 4:25** and
  reading what came back — 2:221, 5:5, 60:10, and no mention of 4:25 anywhere. Then posting the same
  question with **no grounding at all** and getting a complete fiqh answer regardless. The model does
  not dress retrieval; it overrides retrieval, because `worker/src/index.ts:495` requires only the
  question. The QS 4:25 caption never reaches the reader through the authored path at all.
- **learned:** the routing bug was never fixed — it was *bypassed*, and the bypass is a bigger
  exposure than the bug. The checkpoint sentence *"grounding is still retrieval-only, and it
  matters"* was false the moment the edition flipped. **A wrong retrieval that the model ignores and
  a right retrieval that the model ignores are the same event**; we noticed only because the ignored
  one happened to be wrong. Fixing the pin list would have changed nothing the reader sees.
- **criterion now:** ISC-416 ticks on measured evidence but points at ISC-418, which states the real
  condition — grounding is retrieval-only — and is NOT met. ISC-419 (no hand-written scripture
  translation) and ISC-420 (no scholar attribution without a receipt) are the two unguarded shapes
  the volume audit found, both of them the missing half of a wall that already exists for the
  Prophet ﷺ and for Arabic script.

**2026-07-23 — A merge was designed for a collision the retrieval engine already prevents.**
- **conjectured:** that restoring the paired conditional verses (20:25+20:26, 23:60+23:61) needed a
  new "merge into one card" renderer, because if both members of a pair co-retrieved into one 2-hit
  answer, each would draw its own copy of the shared range and every ayah would appear twice.
- **refuted by:** reading `retrieve.ts`. Its diversification admits one verse per feeling and both
  members of each pair carry a single, shared theme — so the second is always skipped, and the
  collision the merge existed to fix cannot happen. The ISA had asserted the collision as fact
  without checking the engine that makes it impossible.
- **learned:** verify the premise in the code that governs it before building the fix — a whole
  render mode was scoped against a failure the retriever structurally forecloses. The cheaper move
  (a unit test asserting the pair never co-retrieves) both proves the non-problem and guards it.
- **criterion now:** ISC-220 (the pair never co-retrieves; merge not built), and the build gates'
  co-display lead-in exemption (a fragment/backref is fine when a preceding ayah renders above it).

**2026-07-22 — An optional parameter cannot enforce a condition.**
- **conjectured:** that co-display was safe on the demo once `cardHtml` accepted a `passage` and the
  corpus-backed call sites passed it — the mechanism was built, the render path was correct, and the
  tests over the renderer all passed.
- **refuted by:** an adversarial read of the diff. Deleting `, hit.verse.passage` from the call site
  type-checked clean and left all 13 tests green. The tests proved the renderer, not the wiring, so
  the single most likely future regression — a call site quietly dropping the passage — was
  invisible to both the compiler and the suite. The mechanism whose entire purpose is "this verse
  cannot appear without its context" had "forgetting the context" as a silent, compiling operation.
  A second reading found a fifth render path (the Beranda's ayat-hari-ini) that never called the card
  at all, and a guard that admitted `"20:"` and placed the subject at ayah 0.
- **learned:** an enforcement mechanism has to be enforced at the type of its input, not at the
  diligence of its callers. Passing the verse WHOLE removes the argument there was to forget; two
  named entry points make "this one has no curation to carry" a statement the signature makes rather
  than an omission a reader has to notice. And a renderer's test suite is not the mechanism's test
  suite: what needed pinning was which call sites must pass a passage, which is exactly what no test
  covered.
- **criterion now:** ISC-210 (a curated verse cannot be rendered with its condition dropped),
  ISC-211 (the one-verse-alone slot excludes conditional verses by pool, not by pick), ISC-212 (a
  malformed ref throws rather than misplacing the subject).

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

**2026-08-10 — ISC-288 / ISC-289, the full-viewport scrollbar on the Al Qur'an shelf.**
- ISC-288: `interceptor eval --main` on live `#/baca` at 1280x720. Before: `.qk-panel-body`
  `scrollHeight 819 / clientHeight 788` = **31px over**, `.app` `padding-bottom: 120px`. After the
  deploy: `panelOverflow: 0`, `docOverflow: 0`, `scrollbarW: 0`, `appPadBottom: 14px`. Screenshot
  confirms the panel's right edge is clean. The scrollbar's length was never proportional to the
  defect — 31px of overflow in a container spanning 5→715 of a 720px viewport renders a scrollbar
  the full height of the viewport, which is what the eye catches.
- ISC-289: same probe, `clearanceToComposer: 25` (px, positive) — the shelf's card bottom still
  sits above the docked composer after the clearance padding was dropped to 14px. Falsified the
  cheap version of this fix (`padding-bottom: 0`) by measuring both: 0 and 14px both give zero
  overflow, so 14px was chosen to keep `.baca-clip`'s own `4px 0 14px` foot rhythm.
- Deploy: Worker `fc17e128`, CSS `index-DOa-lg3a.css` fetched from the live origin with
  `Accept-Encoding: identity` and `cmp`-verified **byte-identical** (103,518 B) to the local build.
  A first check read 15,481 B and looked like a truncated asset — that was curl returning brotli it
  could not decode, not a bad deploy.

**2026-08-10 — ISC-290..295, the split reading view sized against the wrong box.**
- ISC-290: `interceptor eval --main` on live `#/surah/1`, then on the rebuilt bundle served at
  `localhost:5199`. The 331px was not one error but two that failed to cancel. `.surah-split` asked
  for `clamp(380px, 100dvh - 190px, 1100px)`; inside `body`'s `zoom: .9` subtree `100dvh` resolves
  to the **raw 720px**, not the 800px the layout actually has (probed directly: a scratch element
  at `100dvh` computed `720px`, the same element at `calc(100dvh / .9)` computed `800px`). And the
  box is not sized against the viewport at all — it lives in `.qk-panel-body` (788px) with 375px of
  cartouche above and 214px of back-button plus composer clearance below. The real surround is
  589px; `190` was never a candidate. Budget closed to the pixel before the fix:
  `14 + 361.1 + 530 + 94.4 + 120 = 1119.5` against a 788 frame = **331 over**, matching the probe's
  `scrollHeight 1119 / clientHeight 788` exactly. After: split `573.993px`, overflow **375**,
  cartouche + panel padding-top **375.0**, `delta 0.0`.
- ISC-291: same probe at `scrollTop = max` (376). Cartouche bottom **-24** (fully scrolled off),
  split top **5** (flush with the panel top), `.back-bottom` 558→607, composer top 646 —
  `clearance 40px`, positive. Composited `macos screenshot` confirms it visually: both columns run
  full height, "Kembali ke daftar surah" sits clear of the docked bar, nothing occluded. This is
  why the handoff's instinct was right — stripping the clearance the way the shelf fix did would
  have hidden that link. The clearance stayed at 120px; the columns grew into the dead band instead.
- ISC-292: `.back-bottom` 54.41 + margin-top 40 = **94.41**.
- ISC-293: built stylesheet offsets — wide rule at 55,983, `@media (width<=820px)` `height:auto`
  at 61,574. Later wins, so the stacked phone layout is untouched.
- ISC-294: `git diff --stat` lists `read.css`, `styles.css`, `shell.css`. The `shell.css` hunk is
  the `--composer-clear` token and nothing else — no line containing `dvh` is touched. Deliberate:
  the shelf's `calc(100dvh - 150px)` reads 570 against the same raw 720 and measures **0 overflow
  today** (ISC-288), so its magic number already absorbs the discrepancy. Fixing the dvh at the
  ingestion point would have regressed last night's verified fix, not extended it.
- ISC-295: compiled edition reads `principled` in both the try and catch branches of the bundle's
  edition resolver; `bun run build` exit code **0**, `bun test` exit code **0** (1017 pass, 0 fail).
  Exit codes checked, never a grep of the output — a stylesheet that fails to parse still passes
  1017 tests.
- ISC-296: the advisor's multi-height challenge found a real second bug before it shipped. `.app`'s
  clearance is `clamp(120px, 13vh, 160px)`, not a flat 120 — past a ~923px viewport `13vh` overtakes
  the floor and the reservation grows. A frozen `-214px` would have been correct only at the height
  it was measured at. Tokenised to `--composer-clear`, read by both rules, and proved with a
  counterfactual on the built bundle: forcing `--composer-clear: 160px`, the shipped rule shrinks
  the split 573.993 → 533.993 and holds `DELTA 0.0`; the frozen `-214px` variant keeps the split at
  573.993 and `DELTA` jumps to **+40.0** — exactly 40px of content pushed under the docked bar.
- ISC-297: the first "pass" on the tokenised build was **false** and was caught. `serve` had cached
  `index.html`, so the browser was still on build 1 (`index-6JfiHfcC.css`) while disk held build 3
  — and `800 - 12 - 214` and `800 - 12 - 94 - 120` are both **574**, so the old and new formulas are
  indistinguishable at exactly the 720px viewport being measured. The tell was a counterfactual
  that computed `height: auto` (4054.53px) because `var(--app-100vh)` did not exist in the loaded
  sheet. Re-verified after restarting the server: DOM reports `index-7rbDTvdN.css`, matching disk.
  Two lessons compounded — an injected stylesheet lands EARLIER in the cascade, so overrides need
  `!important` or they lose silently; and a probe that agrees with your hypothesis for the wrong
  reason is the most expensive kind of pass.

**2026-08-09 — ISC-111's record half, and the deferral's cause proven rather than assumed.**
- ISC-111 (record half): `interceptor eval` deleted `newquranku:baca` (read back `null`), then
  `navigate https://new-quranku.axiara.ai/#/surah/18#10`. First read returned
  `{"vis":"hidden","landed":true,"baca":null}` — the deferral reproducing verbatim. `tab switch`
  to foreground, and the next read returned
  `{"vis":"visible","baca":"{\"v\":1,\"surah\":18,\"ayah\":10,\"at\":1786218299482}"}`.
- ISC-111 (control): key cleared again, `#/surah/2#255` →
  `{"vis":"visible","landed":true,"baca":"{\"v\":1,\"surah\":2,\"ayah\":255}"}`. Two different refs
  produce two different bookmarks, so the write tracks the deep link and is not a fixed artifact.
- **Cause established:** the identical navigation produced `null` while hidden and the correct value
  while visible, with no code change in between. The two-session deferral was `visibilityState`
  suspending the rendering lifecycle (so IntersectionObserver never delivers), exactly as the
  ISC-110 note conjectured — now demonstrated with a hidden/visible A-B on one page load rather
  than inferred.

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
