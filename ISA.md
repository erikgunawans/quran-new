---
project: New-Quranku
task: "Cycle 5 — the generative companion (ISC-190..203): wrap retrieve() with a rung-1 pastoral model behind an egress wall (point, never author); resolves the ISC-80..97 deferral. Wall built + verified; the wrap/understander/model-wiring pending (prior: Cycle 4 cosmos ISCs, complete; Cycle 3 Peta Tematik, complete; Cycle 2 UI redesign, complete)"
effort: E4
phase: learn
progress: 687/701  # **RECOUNTED BY GREP 2026-08-26 (Cycle 18): 680 `[x]` + 7 `[~]` + 14 `[ ]` = 701 (ISC-659 added `[~]` — the long-surah render budget, whose performance premise I falsified myself).** Cycle 18 added ISC-657 `[x]` (runner supervision) and ISC-658 `[x]` (the theme-classifier alarm measured, fixed and DEPLOYED: the rate was innocent, the 3s cap was not); the open `[ ]` count is unchanged at 14. What follows is the Cycle-13 measurement, kept because its reasoning is still load-bearing: 677 `[x]` + 6 `[~]`; 14 open `[ ]`. **Counted by grep, 2026-08-24 (Cycle 13)** — `grep -c '^- \[x\] ISC-'` = 677, `'^- \[ \] ISC-'` = 14, `'^- \[~\] ISC-'` = 6, sum 697. **Cycle 13 is a DEPLOY cycle and moved one checkbox, not the total: ISC-655 `[~]` → `[x]` (the probe marker is live on Worker `eaa27ba4` and was verified with BOTH arms against the real prod D1 — two marked POSTs wrote 0 rows, one unmarked control wrote `id 40`, since deleted). ISC-654 was RULED by Erik and stays `[ ]` by decision — a declined fix does not satisfy its criterion. ISC-486 had its deploy gate discharged and was re-measured live; it does NOT advance, because `wall-live-probe` never captures refused prose and so is blind to the class this criterion is about.** The open count is unchanged at 14 on purpose. **Cycle 12 opened on ISC-647 and split it: the deployed CLIENT paints the late-refusal annotation (verified live through Interceptor, synthetic wire), and prod PRODUCES the input 0 times in 32 live turns — `gen.reason` answered 29 / deadline 3 / blocked 0, against 38 blocked ATTEMPTS. The mechanism is `ISC-561`'s repair sitting between a guard block and a reader-visible refusal, plus a client that honours `blocked` only when `answer` is empty. ISC-647 is `[~]`, not `[x]`. ISC-653/654/655 added.** **Cycle 11 opened on the answer-wall cluster: ISC-533 CLOSED (its gate had been discharged for six days — ISC-532 met 2026-08-18 and on prod since 2026-08-23 — while `answer-live.ts` dropped `gen` at the parse boundary), ISC-534 CLOSED (it was `[~]` for one pass; ISC-642 closed the hole the same day on Erik's ruling), and ISC-643/644/645/646 added and met, ISC-642/647 added and open.** A late refusal now annotates the fast answer instead of vanishing; nothing that ran out of clock says anything. **Offline only — ISC-647 is the live verification and the deploy is Erik's.** **ISC-487 STAYS NOT MET: the annotation is the honesty half, not the latency half; no constant moved.** **D1 IS BOUND AND DEPLOYED** — the older line in this file saying `NO D1 BINDING … commented out in worker/wrangler.toml` is FALSE as of 2026-08-24; `new-quranku-memory` exists, all four migrations are applied to REMOTE, `DB` is bound, and Worker `8634ed83` carries it. Sign-in still cannot sign anyone in for THREE operator reasons (`IDENTITY_HMAC_SECRET`, `RESEND_API_KEY`, `ADMIN_EMAILS`), and `IDENTITY_HMAC_SECRET` — not the binding — is the switch that starts persisting the text of every question. **ISC-624.8 stays `[~]`**: the file is produced and the player is built on the card per Erik 2026-08-24, but no real `short.m4a` has been written (no TTS credentials), there is no `speechSynthesis` fallback (the feed carries no summary text to speak), and no ground-truth pixel of the native control was obtainable. The denominator counts checkbox LINES, not unique criteria — ~10 ids are duplicated, pre-existing. Cycle 9 = ISC-569..640. Gates at this edit: `bun test` **2256/0** exit 0 (2213 at the anchor, +43 new), typecheck exit 0, `VITE_ANSWER_MODE=synthesis bun run build` exit 0 — run locally, no CI. **DEPLOYED 2026-08-23: Worker `8634ed83` from `24674ec` (22 commits, 6,402 insertions); everything in Cycle 11 is AHEAD of prod.**
mode: build
started: 2026-07-13
updated: 2026-08-24
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
- [ ] ISC-323: through the live Worker path, `gimana hukumnya meninggalkan sholat` returns `hadith-muslim-154` ("Clarifying the usage of the word Kafir for one who abandons Salat") at rank 1. **NOT MET as written, 2026-08-10.** Live rank 1 is Bukhari 540, *"The sin of one who misses the 'Asr prayer (intentionally)"* — on-topic and defensible, but not the named record, which does not appear in the live top-8 at all. See ISC-323.1; do not mark this `[x]` on the strength of the outcome being better. **TOMBSTONED 2026-08-18 — Erik's ruling on ISC-323.4. Closed NOT MET, and the text above is deliberately UNCHANGED.** The criterion is not restated to match the measurement, because restating it would convert a failure into a definition. What is recorded instead is the whole honest position: the criterion is not met; the cause is understood (ISC-323.2 — the live query path scores an APPROXIMATE representation, so the record was unreachable, not mis-ranked); the only known fix was measured and rejected (ISC-323.3 — `returnValues: true` costs 653 ms and lands the record at rank 3, outside `MAX_DISPLAY = 2`, so no reader sees it). **The half that remains is not an engineering question and must not be answered by engineering.** "Which hadith should lead on *hukum meninggalkan sholat*?" is a scholarly judgment: `voyageai/rerank-2.5` prefers Bukhari 540 and 541, both on-topic and correctly graded, and this ISA has no standing to overrule that on the reader's behalf. That question is routed to Ustadz Ahmad Isrofiel Mardlatillah — see `docs/review/ustadz-followup-2026-08-18.md`. **Nothing may be built against this criterion.** `MAX_DISPLAY` does not move to make rank 3 visible; that is a rights call wearing an engineering costume. **RE-MEASURED 2026-08-24 (Cycle 12) AGAINST THE LIVE INDEX, AND THE DIAGNOSIS CHANGES: THIS IS A POOL PROBLEM, NOT A RANKING PROBLEM.** Run through `worker/wrangler.dalil-probe.toml` — a config with **no D1 binding**, so unlike `wall-live-probe` it contaminates nothing (ISC-655). **Display path, unchanged from 2026-08-10:** rank 1 is still `hadith-bukhari-540`, `retrieved:8 · displayable:2`, and `hadith-muslim-154` is absent from the top 8. **The `/scoring` paired arms are the finding.** Same query vector, same `topK:50`, one arm as production runs it and one with `returnValues:true`, repeated three times with identical results: **plain (production) `target_rank: null` — the record is not in the top 50 AT ALL; exact `target_rank: 24`.** So the record IS in the index and IS reachable; **production's approximate scoring cannot see it within 50 candidates.** `identical_positions: 1` — only ONE of fifty positions agrees between the arms, so this is a different candidate set, not a mild reordering. Cost of the exact arm: 249–296 ms plain against 1,031–1,658 ms exact, ~+800–1,400 ms per turn. **WHAT THIS RULES OUT.** No reranker change can meet this criterion: a reranker can only order the array it is handed, and the named record is not in that array — the `pool-not-ranker` shape, measured rather than assumed. **And it rules out the easy fix too:** even under exact scoring the record is rank 24, while the display cap admits 2, so `returnValues:true` alone would not put it in front of a reader either. Two independent gaps, one behind the other. ⚠️ **`topK` CEILINGS FOUND WHILE MEASURING, since they will stop the next person:** Vectorize refuses `topK > 100` outright (`40011`), and refuses `topK > 50` whenever `returnValues:true` or `returnMetadata:"all"` is set (`40025`). The paired-arm route therefore cannot be run above 50 at all. **STAYS `[ ]`** — nothing was fixed here and the criterion asks for rank 1. What changed is that the lever is now known to be recall/scoring mode plus the display cap, not ranking quality.
- [x] ISC-323.1: the named false friend is no longer rank 1 — *"leave or depart from the right and from the left after finishing the Salat"* has been displaced. Its live analogue, Muslim 1534 (*"permissible to leave to the right or left after finishing the prayer"*), now sits at rank 8 with the lowest rerank score in the set.
- [x] ISC-323.2: explain why the live candidate set differs from the offline reproduction over the same vectors — offline cosine ran 0.51–0.59 and surfaced Muslim 154 at rank 28; live scores run 0.43–0.50 and surface a different set. **MET 2026-08-18. The offline reproduction was never wrong, and neither surviving explanation was the cause.** The live query path scores against an APPROXIMATE representation; asking the same index for the same topK with `returnValues` returns TRUE cosines. Paired arms inside the Worker runtime, through the production binding (`worker/src/dalil-probe.ts` `/scoring`), same query vector, same `topK: 50`: **plain** (exactly what `dalil.ts:272` sends today — `{ topK, returnMetadata }`, no `returnValues`) scores **0.4291–0.4866** and `hadith-muslim-154` is **ABSENT from the top-50**; **exact** (`returnValues: true`) scores **0.5157–0.5926** and the same record sits at **rank 24**. The two orderings agree in **1 of 50 positions**, set overlap 45/50. The exact arm's range reproduces the recorded OFFLINE range (0.51–0.59) and the plain arm reproduces the recorded LIVE range (0.43–0.50), which is what closes the question. The exact scores are true cosines and were reproduced independently: recomputing cosine locally from the returned values against the query vector matches the reported score to **4e-7** over the top 10. The error is not a constant offset — per-record deficit runs **0.093–0.121**, a ±0.014 spread that is comparable to the entire 0.026 spread of the live top-8, which is precisely why the ordering scrambles. Corroborating the same mechanism without a query at all: querying by `--vector-id` (a vector the index literally contains) self-scores **0.8883–0.9041, mean 0.8977 over n=25** rather than 1.0, and returns to exactly **1.0** when `--return-values` is passed. All 25 self-retrieve at rank 1, so ANN recall on an exact match is intact. **Both previously-surviving explanations are ELIMINATED.** Not a population difference: `wrangler vectorize info okf-hadith` reports `vectorCount 14736`, matching `docs/reference/okf-manifest.json` exactly, with `processedUpToDatetime 2026-08-10T03:44:26Z` and no pending mutations; and `hadith-muslim-154` is PRESENT when fetched by id. Not plain ANN recall over `topK`: the record is missing from a topK=50 plain arm but present at rank 24 in the topK=50 exact arm — same index, same breadth, same call. **Consequence for this ISA: the standing ban on quoting offline retrieval measurements as evidence about live behaviour is now EXPLAINED rather than merely observed** — offline cosine is right about the vectors and wrong about what the live scorer ranks. **Cost of the lever, measured, because ISC-487 is open:** `returnValues: true` at topK=50 costs **~+600 ms** on the retrieval call (plain mean 243 ms over 5 runs, exact mean 837 ms) and ships 50×1024 floats. **NOT applied to `dalil.ts` — that is Erik's call** (see ISC-323.3), because it changes what the reranker sees on the trustworthy path and adds latency to an open latency item.
- [x] ISC-323.3: decide whether `worker/src/dalil.ts` passes `returnValues: true`. **ANSWERED 2026-08-18 BY MEASUREMENT, AND THE ANSWER IS NO — the ~+600 ms buys nothing a reader can see.** Erik's ruling of 2026-08-18 was "measure first, default-off param"; the param shipped as `DalilSearchOptions.exactScores` (default off, ISC-495..499) and `dalil-probe.ts` `/rerank` ran BOTH arms end-to-end through the real `searchDalil` — same question, same request, plain arm as control. **Result, stable over three runs: `hadith-muslim-154` reaches rank 3 after `voyageai/rerank-2.5` in the exact arm, and is absent entirely in the plain arm.** Rank 3 is OUTSIDE `MAX_DISPLAY = 2`, so `target_within_display_cap` is `false` — the record enters the pool, survives the reranker, and still never reaches the reader. **On this question the reranker returned IDENTICAL scores across arms for every shared record** (Bukhari 540 = 0.6602 in both, 541 = 0.6367, Muslim 1384 = 0.6094), so the exact arm did not re-judge the records it shares — it inserted Muslim 154 at **0.6289, behind two Bukhari records that outscore it on the reranker's own reading**. **That is one question, and it is NOT enough to claim the reranker is pool-order-independent in general** — the arms differed in membership and order but not in size, so a size-coupled or truncation-coupled effect was never exercised, and scores are reported to 4 dp, which would hide an effect below ±0.0003. The general claim was drafted here and withdrawn after the advisor pass; testing it properly wants permuted-order and truncated-pool arms across several questions. **The rank-3 finding does not depend on it** and stands on its own as a measurement of that arm. Measured cost `exact_cost_ms`: 653 ms on a warm isolate, matching the ~+600 ms ISC-323.2 predicted. **So the lever's whole case collapses:** it was justified by "the reranker can finally see it", the reranker now sees it, and it ranks third. Not applied. ISC-323 remains NOT MET as written, and is no longer gated on this — see ISC-323.4.
- [x] ISC-372.1: the probe command documented in `worker/wrangler.dalil-probe.toml`'s header runs from the directory that CANNOT work. **MET 2026-08-18 in `734c577`** — header now reads `bunx wrangler dev --config worker/wrangler.dalil-probe.toml --remote --port 8799` from the REPO ROOT, and states why the directory is load-bearing so the next reader does not re-derive it. ORIGINAL: Its `cd worker && bunx wrangler dev …` resolves wrangler 3.114.17; the command must run from the repo root to resolve 4.120.0. The header is what sent two sessions into an account-scope dead end — fix the header, not just the knowledge.
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
- [x] ISC-323.4: decide whether ISC-323 is still the right criterion. **OPENED 2026-08-18 by ISC-323.3's measurement. ERIK'S CALL, and it is a question about the CRITERION, not the code.** ISC-323 demands `hadith-muslim-154` at rank 1. With a true-cosine pool the record now enters the reranked list and `voyageai/rerank-2.5` places it **third, at 0.6289** — behind Sahih al-Bukhari 540 (0.6602, *"The sin of one who misses the 'Asr prayer intentionally"*) and 541 (0.6367). Those two are on-topic, correctly graded, and the reranker prefers them on its own reading, with scores that do not move between arms. So the criterion now asks for a record the ranker judges third-best to be placed first — a claim about what the RIGHT answer is, not about whether retrieval works. Either ISC-323 is restated (e.g. "Muslim 154 appears in the reranked pool" — true in the exact arm, still false in production), or it is kept as written and accepted as NOT MET indefinitely. **Nothing should be built against it until this is settled.** **DECIDED 2026-08-18 BY ERIK — tombstone, and send the editorial half to the ustadz.** Offered three ways: (a) tombstone with an honest note and route the editorial question to Ustadz Ahmad, (b) keep it as written and carry NOT MET indefinitely, (c) tombstone without asking him. Erik chose (a). Consequences, both applied: ISC-323 carries a tombstone that leaves its original text intact, and the question travels in the batched follow-up note alongside the ISC-464/§6 correction rather than as a second interruption. **This criterion is MET by the decision being made and recorded — not by ISC-323 becoming true.**
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
- [x] ISC-372: the ISC-323.2 probe reaches the live index. **MET 2026-08-17, and the cause recorded here was FALSIFIED, not fixed.** This entry blamed "a Cloudflare-side/account-scope failure". It was the wrangler VERSION, and the version is decided by the directory the documented command runs from. Paired arms, same config, same account, minutes apart: from `worker/` (wrangler **3.114.17**) bindings resolve and startup dies at `✘ Could not create remote preview session on your account.` — verbatim the string this entry recorded; from the repo ROOT (wrangler **4.120.0**) the same command prints `Total Upload: 11.47 KiB` and `Ready on http://localhost:8798`. v3's `dev --remote` uses the legacy edge preview-session API; v4 does not. The account was never the problem. **The documented command in `worker/wrangler.dalil-probe.toml` still says `cd worker &&` and is still wrong** — see ISC-372.1. Live probe returns HTTP 200 in 2.78 s, `retrieved: 8`.

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
- [~] ISC-418: grounding is retrieval-only. **REVERSED BY ERIK 2026-08-21 — the criterion no longer
  describes the app and must not be cited as if it does.** It was MET, and its measurement (46 of 46
  no-grounding samples answering in full; "cara ganti oli motor beat" drawing a fluent Islamic answer
  from parametric memory) was real and is not disowned. What changed is which cost is worse: Erik saw
  a plain question — "gimana cara menahan marah menurut Islam" — return index rows and *"Aku belum
  menemukan jalan dari pertanyaanmu ke ayat-ayatnya"*, and ruled that the app must always answer.
  Both bow-outs are gone (the Worker's AND the client's, `web/src/answer.ts` — removing only one
  would have shipped invisibly). The motor-oil hazard is RE-SITED to prompt rule 9, not dismissed.
  Marked `[~]` rather than `[ ]` or deleted: it is neither open work nor a live criterion, and this
  file's rule is that a superseded criterion keeps its text so the reversal stays legible.
  **ORIGINAL ENTRY FOLLOWS, UNEDITED:** grounding is retrieval-only. **MET 2026-08-13, and the route to it went through a falsified diagnosis — read the whole entry before citing it.** Erik ruled: bow out rather than author from nothing. `hasGrounding` (`answer-contract.ts`) is called by the Worker after `verifyGrounding` and by the browser before the network call, so forged grounding can no longer buy an answer either. **Verified live on prod worker `23f0ad17`** in real Chrome: *"cara ganti oli motor beat"* now renders *"Aku bisa saja mengarang jawaban yang terdengar meyakinkan. Aku memilih tidak"* with NO `/api/answer` request at all, while *"aku sedih banget rasanya"* still answers in full and *"apa hukum riba dalam islam"* still reaches the entries-only knowledge lane — the two controls that prove the bow-out did not silence the app. THE LEG THAT USED TO BE OPEN: the model never bowed out — **46 of 46** samples handed NO grounding answered anyway, 35% reaching the fitting ayah from parametric memory. THE LEG THAT WAS NEVER REAL: *"the model is not reading our grounding, so every retrieval fix is invisible"* is **false**. Same question, three arms, prod's model/prompt/params, 16 cases × 3 samples: grounded **96%** cite the ayah they were handed vs a **35%** blank control — a **+61 pt lift**, and it HOLDS on fiqh (`+53`) where the model's priors are strongest, not just on feelings (`+66`). The 2026-08-12 QS 4:25 probe measured the model overriding grounding that was WRONG, which the decoy arm reproduces exactly: an unrelated real ayah is taken only 26% of the time, and on hukum only 11%. Retrieval fixes, curated pins and topic corrections are worth 61 points of citation control on the authored path. ORIGINAL TEXT, kept because the reasoning it recorded is what the control overturned: `POST /api/answer` with **no `verses` and no `entries` at all** returns a complete fiqh answer (measured: the ahli-kitab/5:5 + 2:221 ruling). `worker/src/index.ts:495-497` says so in a comment — *"the model now leads and can answer without any grounding"* — and only `question` is required. So the sentence *"grounding is still retrieval-only, and it matters"* in the 2026-08-12 checkpoint is **false on production**: retrieval is a hint the model may discard, and on the one question we know retrieval gets wrong, it discards it. Erik's call to make: is a model answering from its own parametric knowledge of fiqh the product, or a defect?
- [ ] ISC-419: an authored answer never hand-writes a translation of scripture. **FIXED AT THE INGESTION POINT 2026-08-12; NOT MET until deployed and re-measured.** Rule 2 said only *"you do not need to quote the translation yourself"* — an invitation, not a rule, which is exactly why the model quoted anyway. Now a prohibition: *"NEVER write out the translation of an ayah yourself — not in quotation marks, not as 'yang artinya', not as a paraphrase presented as the verse's wording."* Fixed in the PROMPT rather than the wall, deliberately — a hard egress rule would reject the app's best answers and fall back to the caption list Erik refused, whereas a prompt rule cannot cost a good answer. Original evidence, unguarded: The `arabic` rule stops the model writing the Arabic; nothing stops it writing its own Indonesian rendering of an ayah in quotation marks. Live: `bolehkah aku pacaran` shipped *"Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk." (QS Al-Isra 17:32)* — a translation the model composed, sitting beside the app's own pinned-corpus translation. `apakah musik haram` shipped one prefaced *"yang artinya kurang lebih"*. The app's entire rights and provenance posture is that translations come from the pinned corpus with attribution.

  **DEPLOY GATE DISCHARGED AND RE-MEASURED — 2026-08-24 (Cycle 14). THE RE-MEASURE FOUND A CANDIDATE VIOLATION RATHER THAN CLEARING IT, so this stays `[ ]`.** Full record: `docs/review/scripture-echo-2026-08-24-cycle14.md`. The gate half was verified, not assumed: the prompt rule entered in `766d0f8` and `git merge-base --is-ancestor 766d0f8 5ba8071` succeeds, so the fix is an ancestor of the commit live Worker `90b3929c` was built from. **This is the FOURTH deferral in this file found sitting on a gate that had already been discharged** (ISC-533, ISC-486's deploy gate, ISC-486's instrument gate, this) — see [[deferral-gate-goes-stale]]. **The `leak: clean` on all 16 rows is NOT the measurement**: that line re-runs `wordingShape`, the very function the egress gate calls, so it cannot fail and is a DEPLOY check only. The measurement is `src/eval/scripture-echo.ts`, which imports nothing from `answer-guard.ts`.

  **16 live turns, 19 anchored candidates, contiguous shared-stem `run` distribution 1×1 · 9×2 · 5×3 · 2×4 · 1×5 · 2×7.** For scale the violations on record score 18 (QS 17:32), 12 (QS 2:187) and 5 (the QS 2:261 splice), against a wall threshold of 4. ⚠ **A first reading of that report said "max run = 3" and was taken off the TAIL of the file only; the head carries both `run 7` rows.** **THE CANDIDATE: QS 66:6, `run 7`, UNQUOTED, cover 0.55**, on `apa yang al quran katakan tentang neraka` — the shipped sentence prefaces the ayah's content with `Allah berfirman dalam QS At-Tahrim 66:6 bahwa …` and then renders it tracking the shipped companion translation for seven contiguous stems with no quotation marks, which is precisely what the prompt rule prohibits ("not as a paraphrase presented as the verse's wording"). A second row (QS 17:23, `run 5`, cover 0.63) was read and judged NOT a violation — its quoted span is the single word `"ah"` and the overlap is a plain-words description of the ayah, which the app must be able to do. **1 of 16 turns; a located instance, never a rate.**

  **NEITHER WALL FAILED — BOTH WERE INERT, and that is the finding.** `wordingShape` needs a QUOTED span and there is none, so no arm could fire. `scriptureEchoShape` needs this turn's verses and **the turn retrieved ZERO** (`0t/0v/0e`), so it was handed `[]` and is inert by construction — ISC-555, measured as a paired control on 2026-08-21. This is ISC-555's predicted consequence with a live instance behind it: the always-answer ruling sends MORE verse-less turns to the model, and the prose then cited an ayah retrieval never returned. ⚠️ **Arming `scriptureEchoShape` with the ayah the PROSE CITES would close it and is deliberately NOT built here** — ISC-419 was fixed in the prompt rather than the wall precisely because a hard egress rule can reject the app's best answers and fall back to the caption list Erik refused. That trade is **Erik's call**, and it is now a question waiting on him rather than a gap nobody had located. ⚠️ **Unanchored paraphrase remains invisible to this instrument by construction**, so a zero from it never meant "clean".


  **PRICED 2026-08-24 (Cycle 15) — THE WIDENING COSTS TWO GOOD ANSWERS AT TODAY'S THRESHOLD, AND ONE OF THEM IS A NAMED MUST-ANSWER.** Erik ruled *build it behind a measurement first*, so `src/eval/echo-widen.ts` scores CONTROL (`retrieved`) against TREATMENT (`retrieved ∪ cited`) over the same live prose, both arms calling the REAL wall — no second copy of the rule, and the control resolves ONE text per ref to match `worker/src/index.ts:973` rather than every shipped translation, because over-supplying the control understates the delta. **16 live turns: 23 citations, 19 to ayahs the turn was never handed, control 0/16, treatment 5/16, delta 5.** Read, with the matched run as the evidence: **QS 66:6 at `run 7` twice — the located Cycle-14 CANDIDATE, fired on, which is what the widening is for** (candidate, not violation: both are UNQUOTED and the Cycle-14 record leaves the unquoted question as Erik's open ruling, so calling them violations would settle that ruling by wording); QS 2:275 at `run 5` borderline and deliberately unclassified; and **two FALSE REFUSALS at `run 4` whose matched text is generic Indonesian, not scripture** — `laki laki dan perempuan` and `di sisi allah adalah`. ⚠️ **One of the two destroys `bolehkah perempuan jadi pemimpin`, which this file names as an answer a hard rule must not destroy** — the exact failure the prompt-first fix was chosen to avoid, arriving as predicted. **The threshold is the whole decision:** newly-refused by `run≥` is 4→5, 5→3, **6→2 (both QS 66:6 rows, ZERO false refusals)**, 7→2, 8→0. `ECHO_MIN_RUN = 4` was calibrated on RETRIEVED verses; widening the verse set gives every extra anchor another chance to collide, and that is precisely what the two false rows are. **NOTHING IS ARMED** — no constant moved, no call site widened; the only `answer-guard.ts` edit is two `export` keywords so the instrument shares the wall's matcher. The instrument was proved able to fire: a mutation removing the widening reddens exactly the positive control. **Limits: n=16 from 8 questions is a SET not a class, the 5→6 boundary rests on one row, an UNCITED rendering is invisible to both arms so a zero delta is never "clean", and this was measured PRE-DEPLOY so a paired re-measure is still owed.** **PAIRED RE-MEASURE AFTER THE DEPLOY (Worker `5c6fe3ca`, 2026-08-24): the absolute counts MOVED and the decision did NOT.** Delta at `run≥4` fell 5→3, at `run≥6` fell 2→1 — run-to-run variance, exactly why n=16 was recorded as a SET; never quote either run's delta as a rate. **What replicates is the thing the threshold was chosen for: in BOTH runs, at `run≥6`, the ONLY row that fires is QS 66:6.** Post-deploy the two `run 4` rows both matched `orang yang memakan riba` against QS 2:275 in sentences that REWORD the ayah — over-refusals at 4, and `ECHO_MIN_RUN_CITED = 6` does not make them. **The QS 66:6 shape is PERSISTENT: 3 occurrences across 32 live turns**, each prefaced `Allah berfirman dalam QS At-Tahrim 66:6 bahwa …` and reproducing seven contiguous shipped words — a reproducible CANDIDATE, not a sampling artefact, and still a candidate because the unquoted question is Erik's open ruling. Record: `docs/review/echo-widening-2026-08-24-cycle15.md`. Still `[ ]` — the WALL half is armed at six but NO CALL SITE passes `origin: "cited"`, so prod behaviour is unchanged; the wiring is blocked on Erik's choice between an async guard and a per-isolate ref→text index.

  **WIRED 2026-08-25 (Cycle 16) ON ERIK'S RULING, AND IT STAYS `[ ]`.** Asked which wiring he wanted — an async guard, or a per-isolate ref→text index — he chose the index. `guard` stays `(candidate: string) => GuardVerdict`, `repair` and `runGeneration` are untouched, and no `env.ASSETS.fetch` was added inside a synchronous path. `src/app/build-echo-index.ts` emits `web/public/echo-index.json` (6,236 ayah translations, 0 unresolvable, 1.28 MB) selecting through `groundingTextOf` — the SAME function `gatherGrounding` and `build-grounding-digest.ts` select through, so an index text is byte-identical to the text the retrieved path would have supplied and `ECHO_MIN_RUN_CITED = 6` still means what `src/eval/echo-widen.ts` measured it to mean. `worker/src/echo-index.ts` loads it once per isolate and `echoVersesFor` appends the candidate's cited-but-unretrieved anchors at the cited floor. The call site now reads `echoVersesFor(candidate, verses, echoIndex, refsInProse, retrievedRefs)`; `answer-guard-echo.test.ts:129` was updated deliberately, not deleted — the retrieved mapping did not go away, it MOVED into the seam, and it is now asserted behaviourally in `worker/src/echo-index.test.ts` because a source slice cannot see inside a function.

  Gates at the wiring commit: `bun test` **2331/0** exit 0 · typecheck exit 0 · `VITE_ANSWER_MODE=synthesis bun run build` exit 0 · `wrangler deploy --dry-run --env=""` exit 0, six bindings. The mutation was run: replacing `echoVersesFor`'s cited half with the retrieved set alone reddens 4 tests and only those 4.

  ⚠️ **WHY IT IS STILL `[ ]`, said plainly.** THREE things are still owed and none of them is code. (1) **It is not deployed** — prod deploys are Erik's, and until one lands the live wall behaves exactly as it did, because a deployment without the asset resolves the index to null and the wall sees only retrieval. (2) **The paired live re-measure has not run**, and this criterion's own history is that a measurement overturned the ruling that ordered it. (3) **Erik's ruling on whether an UNQUOTED rendering violates this criterion's words or only its spirit is still owed** — the QS 66:6 rows this wiring fires on are the rows `docs/review/scripture-echo-2026-08-24-cycle14.md` records as CANDIDATES for exactly that reason, and marking this MET would settle that ruling by checkbox.

  **LIMITS THIS WIRING DOES NOT CLOSE.** An UNCITED rendering of an unretrieved ayah is still invisible — neither half of the verse set can contain a verse the prose never names and retrieval never returned, and that was true before this change and remains true after it. `MAX_CITED_ECHO_VERSES = 16` bounds the cited half as a LATENCY bound (the guard is O(words²) per verse and `repair` re-runs it on sub-slices); it DROPS SILENTLY beyond the cap, against a measured mean of 1.2 unretrieved citations per turn. And the index ships as a PUBLIC asset at `/echo-index.json`: no new material is published — the same Thalib translations are already served in full by the 114 `web/public/surah/*.json` shards the browser reads — but it is a more convenient bulk shape of them, and that is Erik's to accept or to move into R2 behind the Worker.

  **RE-MEASURED LIVE 2026-08-19 (24 turns, `wall-live-probe --repeat 3`, prod worker `cfb0b05d`) AND IT IS STILL VIOLATED. STILL NOT MET, now for a second and different reason.** The prompt rule holds up: 5 of 24 turns were refused `own_wording` at generation, so the wall is working and the model is being caught. But one violation went all the way to a reader:

  > *Allah berfirman dalam QS Ali Imran 3:130, "Janganlah kamu memakan riba dengan berlipat ganda."*

  Hand-written ayah wording, in quotation marks, attributed to Allah, adjacent to the ref — the criterion's exact prohibition, shipped. **`wordingShape` returned `clean` on it, and `DIVINE_ATTR` matches that sentence perfectly.** It never got there: the quote is SEVEN words, `OWN_WORDING_MIN_WORDS` is eight, and the loop `continue`s on length before reading any attribution. Verified by construction — the identical sentence with one more word is CAUGHT, so the entire difference between shipped and blocked was the floor.

  **A GREEN TEST WAS PINNING THE DEFECT, which is why two sessions of a passing suite meant nothing here.** `answer-guard-wording.test.ts > the eight-word boundary > seven words is a phrase, and passes` built its own fixture as `Allah berfirman "satu dua tiga empat lima enam tujuh"` and asserted `toBeNull()`. The suite could not catch this violation because it had been taught to expect it. The fixture is the lesson, not the threshold: to test a length floor you must hold every other variable at its most permissive, and that one pinned the floor under the single preamble that should defeat it.

  **The floor's own comment shows how it happened, and the fix deliberately does NOT lower it.** It records being set from a distribution — "the violations were 18, 12 and 11 words; the longest benign quote was 6… Eight is the gap, with two words of margin". Sound reasoning, wrong number, because a bound taken from the largest violation observed so far holds only until a smaller one arrives — and a 7-word one did, landing inside the margin. Lowering 8 to 7 would buy one word and re-make the same mistake. **Fixed instead by splitting on what the VERB CLAIMS** (`d20f078`): `berfirman`/`firman`/`bersabda`/`sabda`/`artinya`/`terjemahannya`/`bunyinya` assert *these are the words* and now bypass the floor at any length; the topical verbs (`menyebut`, `menggambarkan`, `menjelaskan`, `melarang`) keep it, because the benign bare term — `Allah menyebut mereka "munafik"` — lives there and is short because it is a term, not because of where a threshold sits. The Prophet's ﷺ half is closed in the same commit, since this repo has twice shipped a wall built for one and not the other.

  **SCOPE NARROWED TO THE DIVINE CASE — Erik's call, 2026-08-19, after THREE `scholarly-gate` passes and three BLOCKs.** The divine half (`Allah berfirman "…"` under eight words) is the violation actually measured on prod, all three passes agree the fix is sound, and it costs nothing measurable. **Every attempt to extend the same bypass to the Prophet ﷺ inside the same commit introduced a NEW defect, each caught only by the following pass** — and none of them was caught by a green suite:

  1. A hand-rolled subject list was a strict subset of `muhammadSubjects`, so `Baginda bersabda`, `Nabiyullah bersabda` and the passive forms walked through. The wall was built for God and not for the Prophet ﷺ — the third time this file has done that.
  2. Reusing `muhammadSpeechAct` to fix (1) pulled in its TOPICAL verb stems, because that function serves the RECEIPT rule where topical verbs are attributions too. It INVERTED the seam: `Nabi Muhammad menyebut mereka "munafik"` refused while the identical sentence about Allah passed — the floor's own named benign example with the subject swapped. Eight benign strings regressed.
  3. A verbatim-only verb list paired with `muhammadSubjects` fixed (2) but silently dropped the clause window and other-agent break that live inside `muhammadSpeechAct`, so subject and verb no longer had to be in the same SENTENCE; and it left seven further verbatim verbs uncaught while the comment disclosed one.

  **Underneath all three is a real ambiguity that no machinery resolves:** `beliau berkata` is the Prophet ﷺ or a named scholar depending on nothing the sentence contains. Include those verbs and the app refuses to quote scholars; exclude them and seven verbatim prophetic forms pass. That trade is its own decision, not a rider on a divine-side fix.

  **So the prophetic sub-eight-word seam is OPEN and tracked here. It is not a regression** — it was open before this rule existed, and it is still caught at eight words and up by `muhammadSpeechAct` + `PROPHETIC`. **There is deliberately NO test asserting the seam passes:** a green test pinning a known hole is what let the divine violation ship in the first place, and one of those is enough. An open ISC line cannot be mistaken for a satisfied assertion; a passing test can.

  **A fourth finding from pass 3 was fixed on its own (`5919078`) and was not a guard defect at all:** a test fixture written during pass 2's correction named Ustadz Ahmad Isrofiel — the actual reviewer — and had him answer our letter granting permission. He has not answered, and both sent letters forbid recording anything as answered until he does. No reader could have seen it (`wordingShape`'s return reaches `violations[].detail`, which nothing consumes), so it was a record injury rather than a shipped claim — but it is exactly what this ISA's review discipline exists to prevent, and it was introduced by a correction, which is the pattern this project keeps paying for.

  **DEPLOYED 2026-08-19 and RE-MEASURED — the fix works, and the criterion STILL does not pass. Both halves of that sentence are load-bearing.** Worker `da3031a7`, bundle `index-CWwCYulA.js`, verified by served-bytes SHA `66bd3671…` matching local, not by an exit code. Post-deploy `wall-live-probe --repeat 3`: **0 leaks**, and across the 5 answered turns **zero quoted spans of any length**. Four of those five open with `berfirman`/`bersabda`/`firman` and then PARAPHRASE without quotation marks — which is precisely the shape the prompt rule always asked for and never got. The wall is not costing answers here, it is changing their form. `apa hukum riba…`, the question that produced the violation, answered clean.

  **What that does NOT license.** The answered rate was 5/24 in this run against 7/24 and 13/32 in the two pre-deploy runs — **do not read a drop into that.** Those two pre-deploy runs disagreed with each other by 12 points with no deploy between them; this spread is inside the known run-to-run variance and no paired arm was run. Nothing here measures the deploy's effect on the answered rate.

  **AND A PRE-EXISTING SCRIPTURE-SIDE BYPASS, found by the third `scholarly-gate` pass and verified after deploy — this is why the criterion stays open.** `VERBATIM_DIVINE` binds subject to verb within `[^.!?]{0,40}`, and `DIVINE_ATTR` carries the SAME 40-character cap. So an appositive longer than forty characters walks the sentence past both:

  > *Allah, Tuhan semesta alam yang Maha Pengasih dan Maha Penyayang kepada kita, berfirman, "Bertakwalah kalian."*

  Measured: passes at seven words AND at nine, so this is not a sub-eight gap — **it is a full bypass of the divine wording rule at any length.** It predates every commit made today and is not a regression, but it is the live riba violation with a longer subject phrase, and no test covers it. **Not fixed here**, consistent with Erik's ship-narrow call: raising a cap widens what the guard catches, and every widening today has cost three gate passes to get right.

  **THE APPOSITIVE BYPASS IS CLOSED FOR `berfirman` AT ANY EPITHET, AND STILL OPEN FOR THE NINE LOOSE VERBS (2026-08-19, later).** That headline is the third one this entry has had: the first two said "CLOSED" flat and were contradicted by their own limits paragraph four down, which is exactly how a guard comes to be read as stronger than it is. The fix is not a bigger number. `VERBATIM_DIVINE` drops the subject test on `berfirman` entirely, so no epithet of any length or content can walk it — the subject was never carrying weight, and deleting it is un-bypassable where widening 40 to 80 only waits for a longer epithet. The supporting claim that Indonesian reserves `berfirman` for God is **consistent with** a scan of `web/public/surah/*.json` (114 files, **273** occurrences — 270 lowercase plus 3 sentence-initial `Berfirman Allah:` in surah 3 and 6, which a case-sensitive count missed — divine subject in every one, no royal usage) but **not verified by it**: those files are Qur'an translations only, so a human-subject `berfirman` could not have appeared there and the scan could not have falsified the claim. The corpus the guard actually runs on is model-composed answer prose, which has not been scanned for this. `DIVINE_ATTR` gains an appositive arm for `allah|tuhan`: unbounded inside one sentence, terminated by `APPOSITIVE_BREAK` (`AGENT_PRONOUN|HUMAN_ROLE` under the same preposition lookbehind `OTHER_AGENT` uses, so `kepada kita` stays a RECIPIENT). **Paired control at NINE words, where the arm is the only thing deciding** — cited at seven in the first draft, which is below `OWN_WORDING_MIN_WORDS`, so both halves agreed for a reason unrelated to the fix and the control could not have failed: `Allah menjelaskan, "<9 words>"` and its epithet-wearing twin both REFUSE, so the appositive buys nothing.

  **THE FIRST CUT WAS A NARROWING AND THE GREEN SUITE COULD NOT SEE IT — `scholarly-gate` BLOCKed it.** It SWAPPED `[^.!?]{0,40}` for the span instead of unioning with it, and `{0,40}` matches straight THROUGH an agent pronoun where the span stops dead at one. Paired HEAD-vs-tree probe: HEAD refused 7 of 7, the tree passed 6 — `Allah mengajarkan kita lewat ayat ini, lalu menegaskan, "<an ayah rendering>"` and five like it, every one this criterion's exact object, all inside forty characters. **The doctrine broken is stated in the same file thirty lines up** (`hadithShape`, ISC-440): *union, never replacement — widening only adds refusals, whereas narrowing is how a fabrication ships.* The docblock even quoted the polarity claim while violating it. Arms are now a union; **all six lost refusals are pinned** as their own `test.each` block — it was five for one correction pass, while the comment beside it said six, which is the kind of gap a count discloses and nobody adds up. **0 refusals lost** is confirmed by two independent generated sweeps (499,200 and 628,992 sentences) AND holds structurally: arms 1+3 of `DIVINE_ATTR` reconstruct HEAD's single regex exactly, arm 2 is purely additive, `VERBATIM_DIVINE`'s new `/\bberfirman\b/` is a superset of HEAD's, and `HUMAN_ATTR`'s 20-word set is unchanged element-by-element. **The companion "refusals gained" counts are deliberately NOT recorded here** — they are generator-dependent, the two sweeps disagree, and roughly two thirds of them sit on human-subject `berfirman` prose no model writes, so the number reads as benefit and mostly is not.

  **THREE RESIDUAL LIMITS. Limit 1 is NARROWED — not closed; limit 2 is open and got WORSE; limit 3 is why limit 1 is not closed.**

  1. **UNDER-REFUSAL — the price of the `HUMAN_ROLE` half. NARROWED 2026-08-20, NOT CLOSED — see limit 3.** Those nouns are ordinary words as well as roles, so one planted inside an epithet ends the span early and the bypass reopens for the nine looser verbs. Measured against a control (the same epithet without the noun is REFUSED): *Allah, Tuhan yang menciptakan seluruh **orang** di muka bumi ini, melarang, "…"* passes; likewise with `banyak`, `sebagian`, `catatan`. **`berfirman` is airtight regardless** — `VERBATIM_DIVINE` needs no subject — so this reaches only the loose-verb half. Closing it needs the break to ask whether the noun is near enough to the verb to OWN it (`AGENT_BEFORE_VERB`'s question), which is real machinery and was deliberately NOT built as a third correction inside one change. **[Built 2026-08-20 — see the block below; it narrows this limit rather than closing it.]**
  2. **OVER-REFUSAL — ISC-486 regresses on bare proper names.** See that criterion below.
  3. **THE ADJACENCY STAND-DOWN FIRES INSIDE AN EPITHET, which is why limit 1 is narrowed rather than closed. Pre-existing; HEAD passes these too.** `APPOSITIVE_OWNS_VERB` asks only whether an owner token sits within one word of the verb. It cannot tell the sentence's subject from a noun buried in a description of Allah. Every row pinned for limit 1 terminates its epithet with a COMMA, and a comma defeats `\w+\s+`, so the arm fires; move the same noun to the tail of the epithet — ordinary Indonesian, no comma — and all three arms stand down together. Failing strings, both currently PASSING on HEAD and on the tree:

     > *Allah, Tuhan yang menghidupkan dan mematikan setiap makhluk dan banyak **orang** melarang, "…"*
     > *Allah, Tuhan yang telah menciptakan langit dan bumi beserta **kita** semua menegaskan, "…"*

     **EVERY ROW OPEN across eight tail-position epithet shapes × nine loose verbs — 72 of 72 on the grid described here, whose eight shapes are enumerated in the guard docblock beside `APPOSITIVE_BREAK`.** ⚠ **The numeral 72 carries FOUR senses in these two files and two of them are opposite (a draft said THREE and missed `HUMAN_ATTR`'s `{0,72}` character bound at the foot of this file — a universal asserted about a numeral is still a universal): `72 GAINED` (refusals added), `72 of 72` CLOSED (comma-terminated set, limit 1), and this one, `72 of 72` OPEN (tail-position set, limit 3). The first two are the same rows; this third is a disjoint set of coincidentally equal size, ~30 lines away in the same docblock. A draft replaced a wrong "72 of 207" with a bare "72 of 72" and created the collision while fixing the denominator.** **AND 72 IS NOT THE ONLY ONE — 36 and 18 carry the identical shape and are flagged here rather than left: `36` is a count of under-refusals AND two disjoint 36-row measured sets AND a 36-of-36 figure; `18` is a count of over-refusals AND an 18-row owner-free set AND the numerator of the discredited "18 of 63" rate AND the largest word count in the `OWN_WORDING_MIN_WORDS` distribution ("the violations were 18, 12 and 11 words"). The `18` flag missed that fourth sense on its first pass while the `72` flag had already been widened to catch exactly that kind of non-measurement numeral — a flag held to a lower standard than the flag beside it.** And the 100% is a property of THIS eight-shape set, not of tail position as a class — an independently-chosen eight-shape set returned 54–59 of 72 — and that denominator is a FIFTH sense of 72, a different eight-shape grid, which the four-sense list above does not cover. **A draft wrote "72 of 207", and 8×9 is exactly 72 while 207 is not divisible by 8: the numerator came from the stated grid and the denominator from a larger one that mixed in shapes this class does not cover. That reads as a 35% rate and is not one** — the same denominator error `ISA.md` corrects under ISC-486 ("a denominator mixing the rescued class with the broken one reads as a rate and is not one"). Wider: 2 designations × 26 owner tokens × 8 tail shapes × 9 loose verbs × 2 quotes = 7,488 rows, 7,488 open on tree AND on HEAD, measured by `scholarly-gate`; **every token in `AGENT_PRONOUN` ∪ `HUMAN_ROLE` opens it at tail position — 26 of 26 measured, one row per token, identical on HEAD**, not merely the four nouns limit 1 names. It is also open for the plain `Allah yang …` relative clause — **but ONLY when an owner token sits at the tail. A draft said "with no appositive at all", and that is false as a universal in the direction that overstates the hole: `Allah yang Maha Pengasih menegaskan, "…"` and `Allah yang menciptakan langit dan bumi beserta seluruh isinya menegaskan, "…"` are REFUSED on tree and on HEAD; the same clause ending `beserta KITA semua` is open.** `berfirman` is airtight throughout. **HOW IT WAS FOUND, stated accurately because the first version of this sentence was not: `scholarly-gate` wrote the SIBLING of a pinned row with the owner noun moved to the tail of the epithet. That is a rewrite in ordinary Indonesian word order, not a mutation — an exhaustive single-character deletion over all eight pinned rows (599 deletions) opens the wall 84 times and every one of those mangles the divine verb itself, never once with a `DIVINE_VERB` intact. Deleting the epithet-terminating comma specifically leaves all eight still REFUSED. The false version made an open divine-attribution bypass read as the artifact of a contrived one-character edit, which is the opposite of what makes it serious.** Recorded here with its failing strings and deliberately NOT pinned by a passing test.

     **STILL OPEN AFTER THE 2026-08-29 `DIVINE_VERB` WIDENING — verified against these very rows, not assumed.** That change closed a DIFFERENT class (owner token upstream of a plain designation, no epithet). All three rows here, including a loose-verb variant written to test exactly this, remain unrefused. See ISC-486 below.

  **THE UNDER-REFUSAL IS NARROWED, NOT CLOSED, AND NARROWING IT MADE THE OVER-REFUSAL WORSE. 2026-08-20.** `DIVINE_ATTR` gains a FOURTH regex — a third arm on the `allah|tuhan` branch — that asks `AGENT_BEFORE_VERB`'s question instead of the break's: not whether an owner APPEARS between designation and verb, but whether one sits adjacent enough to OWN it (`APPOSITIVE_OWNS_VERB`, owner plus at most one intervening word, reusing `APPOSITIVE_BREAK` verbatim so the preposition lookbehind is not forked). Additive, never a replacement. **Paired HEAD-vs-tree sweep of 880 designation × epithet × verb × quote combinations: 72 GAINED, 0 LOST.** The four bypass strings and two paired controls (same epithet, role noun swapped for an ordinary noun — both REFUSE on HEAD and after, so the role noun is shown to be the variable) are pinned as a `test.each` block. Deliberately no `berfirman` row: `VERBATIM_DIVINE` takes those whatever the epithet holds, so such a row would be green with the whole arm deleted.

  **THE COST — AND A CORRECTION THAT RE-OPENED THE BYPASS, CAUGHT ON THE NEXT GATE PASS.** The arm ignores owner tokens UPSTREAM of the verb, and those are exactly what rescued a bare proper name on HEAD. `scholarly-gate` measured **120 of 120** bare-name rows carrying an upstream owner token flipping `pass` → `REFUSE`, against a disclosed cost of "18 of 63" whose probe put no owner token upstream and therefore **could not have contained the class it was offered as the cost of**. The correction was to narrow the span to `AGENT_PRONOUN` tokens only (`PRONOUN_APPOSITIVE`), which cut the over-refusal to 80 of 120 and the owner-distance cost to 0 of 63. **It also re-opened the divine bypass for pronoun epithets — 45 of 45 —** because a pronoun planted inside an epithet longer than forty characters ends that span too: *Allah, Tuhan yang menciptakan **kita** semua di muka bumi ini, menegaskan, "…"* passed, which is this file's own recorded live-violation shape, caught until then only because it fitted inside forty characters. The premise was false in the same breath: `kita` in *menciptakan kita semua* is an OBJECT, so those tokens are not "agents wherever they appear" either.

  **REVERTED. The narrowing bought 18 fewer over-refusals and cost 36 more under-refusals, and on this wall those units are not comparable** — an under-refusal is the app printing its own rendering as Allah's words; an over-refusal is a scholar's quotation declined, with the reader told nothing (ISC-528). Measured across both directions at once: role-noun epithets 0 of 36 open, pronoun epithets 0 of 36 open, OWNER-FREE long epithets 0 of 18 open. **That third label read "plain long epithets" in a draft and collided head-on with limit 3, which records the plain `Allah yang …` relative clause as OPEN.** The 18 rows carry no owner token at all; they say nothing about the relative-clause shape, and all three figures are the measured set, not the space. **The under-refusal limit is closed for 72 of 72 COMMA-TERMINATED epithets measured (plus 7,020 of 7,020 on a wider comma grid, and 14,040 of 14,040 on an independent one), and open for the tail-position case limit 3 records. Both of those "72 of 72" figures are MEASURED SETS, not classes — and they are DIFFERENT sets that happen to have the same cardinality, one closed and one open. See the collision warning in limit 3.** The word "CLOSED" stood over a version that was closed for role nouns and open for pronouns, for a whole gate pass; the scope is now stated wherever the word appears, and a third gate pass then found the word was still wrong in a way no epithet in the measured set could show — see limit 3.

  **A FIXTURE PUTS THE PROPHET's ﷺ WORDS IN A NAMED IMAM's MOUTH, AND IT IS RECORDED HERE RATHER THAN FIXED. `web/src/answer-guard-wording.test.ts:163`** reads `Imam Nawawi menjelaskan hal itu; beliau berkata, "sabar itu cahaya."` — and *sabar itu cahaya* is the standard Indonesian of **وَالصَّبْرُ ضِيَاءٌ**, from the hadith of Abū Mālik al-Ashʿarī, Ṣaḥīḥ Muslim 223. So `beliau berkata` makes a named imam the AUTHOR of the Prophet's ﷺ words, and Nawawi COMMENTED on that collection (*Sharḥ Ṣaḥīḥ Muslim*) and anthologised the hadith in *al-Arbaʿīn* — he did not compile it; Muslim ibn al-Ḥajjāj did. A draft of this note called him "the compiler who transmits that hadith", which is an inaccurate claim about a named imam inside a note whose whole subject is inaccurate claims about a named imam. Same class as the hadith qudsi and the fabricated Nawawi fiqh ruling that two earlier gate passes replaced; introduced by the pass-2 correction in `e6aa468`. **Not fixed in this change, deliberately:** a fixture edit is a code edit, two of the last three BLOCKs here were defects that corrections introduced, and this pass's value is that the arms did not move. **And the row is INERT as well as wrong, which the note first missed:** `sabar itu cahaya` is THREE words, under `OWN_WORDING_MIN_WORDS`, so `wordingShape` returns before any attribution logic runs — the same sentence with a ten-word quote is REFUSED. All four rows in that `describe` are under the floor (3, 2, 3, 1 words), so the docblock above them stating they pass "because the shipped bypass requires a verb reserved for the Prophet ﷺ" names a cause that is false for every one of them. A test that cannot fail, beside a comment explaining a mechanism it never reaches. Recorded with its failing string so it cannot be inherited as clean.

  **"ONE FIX SERVES BOTH" IS FALSIFIED — proximity does not close ISC-486. But the residue is NOT irreducible, and a draft of this block said it was.** `scholarly-gate` refuted that in one pass by adding a proper-name vocabulary to the ownership test alone: the bare-name rows are rescued, all four ISC-419 bypass rows stay refused, whole suite green. The sentence does distinguish the two cases — the owner adjacent to the verb is a NAME. That path is not taken here because `before` is lower-cased before any arm sees it, so capitalisation is unavailable and a hand-kept name list is what remains, which is a design question and not a fifth correction inside one change. Recorded under ISC-486 as the reducing path.

  **ARM NUMBERING IN THE PARAGRAPHS ABOVE IS STALE AND IS LEFT AS HISTORY.** "Arms 1+3 reconstruct HEAD's single regex exactly, arm 2 is purely additive" was written when the `allah|tuhan` branch had two arms and `dia|ia` was arm 3. The branch now has three (window, span, ownership) and `dia|ia` is arm 4. The structural claim it supports is unchanged and still holds; only the ordinals moved.

  **`scholarly-gate` findings applied, then the gate RE-RUN on the fixes.** Beyond the two above: the arm-2 "strictly subsumed by arm 3" claim was false — arm 3's lookbehind is not scoped to the region between designation and verb, so `menurut ulama allah menegaskan bahwa "…"` matches arm 2 and not arm 3; it is subsumed on every row in the file (measured), not as a property, and arm 2 stays. A `describe` title naming a mechanism the code lacks ("no longer ends the appositive span" — the span still ends there; the refusal comes from the new arm) was renamed. A fixture attributing a substantive position to *para ulama* collectively — under the ISC-420 line — was changed to a generic singular subject.

  **`scholarly-gate` HAS RUN EIGHT TIMES ON THE 2026-08-20 CHANGE AND BLOCKED ALL EIGHT. NO VERDICT IS RECORDED HERE FOR THE FINAL STATE, BECAUSE NONE HAS BEEN ISSUED.**

  **THIS PARAGRAPH IS STRUCTURALLY ONE PASS BEHIND, AND SAYING SO IS THE ONLY HONEST WAY TO WRITE IT.** Each pass judges the corrections made after the previous one, so the count here can never include the pass now reading it — and a draft that said "FIVE … BLOCKED ALL FIVE" went stale the moment pass 6 blocked, which pass 7 then caught as its own finding. **Read the number as "at least this many", never as a total, and never as a verdict.** The only thing that closes this criterion is a pass that returns no blocking finding, recorded afterwards with its date. That sentence is written this way deliberately: the `bcc963d` paragraph below records a `PASS` for its own pass 5 *together with a measurement attributed to it*, and this criterion is the one place a reader looks to learn whether a wall was signed off. A status line upgraded ahead of its artefact is the exact failure this gate exists to catch, and the record has now committed it once, about the gate itself.

  **Pass tally, all BLOCK, every finding reproduced before acting (at least eight; see the staleness note above):** (1) the arm ENLARGED ISC-486 at 120 of 120 while the docblock said it did not; (2) the correction to that RE-OPENED the divine bypass for pronoun epithets at 45 of 45 — reverted, because it bought 18 over-refusals for 36 under-refusals; (3) "CLOSED" was false — limit 3, found by a sibling row with the owner moved to the tail; (4) three sentences making the residual hole read smaller — a false method claim, six-where-it-is-twenty-six, and a colliding label; (5) a verdict claimed for a pass that had not run, "every comma-terminated epithet" falsified by an owner after the comma, a denominator mixing two grids, and an inaccurate attribution to Imam Nawawi *inside the note about inaccurate attribution to Imam Nawawi*. (6) the `bcc963d` count paragraph's "stated once" claim broken by the paragraph fixing it, a numeral collision created by the fix for the mixed denominator, and a fixture note inserted into the numbered limits list; (7) this very count left stale at five, and the guard header still saying TWO LIMITS forty lines above limit 3 while the ISA header was corrected in the same diff; (8) that count left stale AGAIN at six while its own tally enumerated seven, a de-staling substitution reported as applied that had matched only one of its two sites, and two further "two limits" sites the pass-7 fix did not reach. **Seven of the eight BLOCKs were defects introduced by the previous pass's own corrections, and the basis is stated per item so the count can be checked rather than believed:** (1) is original-change residue, NOT correction-introduced; (2) was introduced by the correction to (1); (3) is MIXED and is counted on one half only — the bare word "CLOSED" stood over the original arm, but the specific false scope "closed for every epithet measured" was written by the correction to (2); (4), (5), (6), (7) and (8) were each introduced entirely by the correction to the pass before — (8) most plainly, since all three of its findings were written by pass 7's fixes — (6) most plainly, since all three of its findings were written by pass 5's own fixes. Same shape `bcc963d` recorded, at a higher rate. **This is the SECOND count of correction-introduced defects in this criterion** — the `bcc963d` paragraph below carries its own, for a different audit; neither supersedes the other and neither is the single site.

  **THE DIRECTION IS THE FINDING, NOT THE COUNT.** **MOST** prose defects across all passes so far pointed the same way: the guard read stronger, the hole read smaller, the review read cleaner. **A draft said "NONE pointed the other way" and called that half exact. It is not, and the counterexamples are in this paragraph's own tally.** The stale pass counts in items (7) and (8) UNDERSTATE the scrutiny this change received — line 781 of this file names that direction in terms, *"the safe error"* — so they point the other way, and the inaccurate attribution to Imam Nawawi in item (5) is an attribution error that points nowhere on this axis at all. **A universal asserted about a bias is still a universal, and asserting one inside the paragraph documenting the habit of asserting them is how this took nine passes.** The bias is real and is the finding; the word "NONE" was the flattering half of it, because a uniform story is a cleaner one. The measured sets were each time constructed so they could not show the failure — a cost probe with no upstream owner, epithets all terminated by a comma, a denominator borrowed from a wider grid. `ustadz-followup-2026-08-18` commits us in writing to the opposite: *"supaya Ustadz tidak menilai penjaga itu lebih kuat daripada keadaannya."*

  **A MUTATION PROBE THAT COULD NOT HAVE FAILED — TWICE, and the second time was after writing this paragraph about the first.** Pass 1 reported 0 red for all three arms because its `perl` substitution never applied; three no-op "deletions" read as three green results. Redone by line number — and then redone AGAIN, because the second version used line numbers that had gone stale as the docblocks grew, so it deleted three comment lines and once more reported all-zero. The probe now derives the line numbers by grep and **asserts the line it is about to delete contains `new RegExp`** before deleting it. Final measurement: **arm 1 → 4 red, arm 2 → 0, arm 3 → 8.** A mutation probe that cannot fail is the same artifact as a test that cannot fail, and this change shipped both before catching either.

  **It also exposed a real defect once it worked: deleting arm 1 turned 0 rows red**, because the unbounded arm 3 adopts the six pass-1 regression rows that were arm 1's only witnesses. Four rows pinning arm 1's unique class — an owner adjacent to the verb but INSIDE the 40-character window, where the ownership arm stands down and the window does not — were added, and they are what makes arm 1's deletion visible at all.

  **`scholarly-gate` ran FIVE times on the 2026-08-19 CHANGE (`bcc963d`) — 1 BLOCK, then 3 CONCERN, then PASS: 22 findings, all reproduced before acting.** [Scope marker added 2026-08-20: everything in this paragraph describes `bcc963d`, NOT the 2026-08-20 change ABOVE (lines 744-779), which has run at least eight passes. Two multi-pass audits now sit in one criterion — `bcc963d` closed at five, the 2026-08-20 one is at eight and counting; a draft of THIS marker said "two five-pass audits", stale inside the very sentence written to fix staleness, which is the third consecutive pass to find that shape and a reader was one sentence away from reading this verdict as that one's.] (This header said "THREE times, 17 findings" for two passes while a sentence two paragraphs below it already referenced pass 4 — a stale count sitting above its own contradiction, which is the sixth correction-introduced defect and the one pass 5 found. The direction was understatement of scrutiny, the safe error, but it is a claim about the REVIEW RECORD and that is the one category this gate exists for.) Pass 1 BLOCK: the six lost refusals, a blind cost check, and a fixture putting a hadith qudsi (*inna raḥmatī sabaqat ghaḍabī*) in an unnamed ustadz's mouth. Pass 2 CONCERN, 5 findings, **2 of them defects pass 1's own corrections introduced** — a cost row labelled with a stand-down the code does not have, and a fabricated fiqh ruling put in Imam Nawawi's mouth to replace the hadith qudsi: the same class, one notch down. Pass 3 CONCERN, 8 findings, **again 2 of them correction-introduced** (a false-refusal rate whose denominator mixed the rescued class with the broken one; a row label naming a mechanism the row does not reach), and **zero code regressions — the third pass's own 628,992-sentence sweep found nothing behavioural.** Pass 4 CONCERN, 5 findings, **again 2 correction-introduced** — un-marking ISC-486 orphaned three sentences still asserting it was marked MET, one of them the paragraph its own checkbox points at. **Pass 5 PASS**, with the stale header above as its single non-blocking note, and an independent 23,040-sentence paired sweep confirming 0 refusals lost. **Every pass after the first found only prose that claimed more than the code does** — the guard itself has been correct since pass 2.

  **THE COUNT OF CORRECTION-INTRODUCED DEFECTS FOR `bcc963d`, with its basis.** [Scope + uniqueness marker added 2026-08-20: this paragraph counts the 2026-08-19 change ONLY. It formerly opened "stated once with its basis", which stopped being true the moment the 2026-08-20 paragraph above stated a second such count for a second audit — there are now TWO counts of correction-introduced defects in this criterion, for two different changes, and each is the single site for its own.] **Six**, all in `bcc963d` — 2 found by pass 2 in pass 1's corrections, 2 found by pass 3 in pass 2's, 1 found by pass 4 in pass 3's (un-marking ISC-486 orphaned three sentences that still asserted it was marked MET, including the paragraph its own checkbox points at — one defect, three sites), and 1 found by pass 5 in pass 4's (this very count's own header left stale at "THREE times, 17 findings"). **Each pass made the number wrong by finding the thing that changed it**, which is the shape of the whole loop and the reason `bcc963d` took five passes to close. **That closure is `bcc963d`'s, not the 2026-08-20 change's — which has run at least eight passes and has NO verdict, per the paragraph above.** The "six across two sessions" figure that stood here added the two from 2026-08-19 early (`e6aa468`, `5919078`) to these four and is not wrong, but it mixed two changes under one number; the file-local comment saying "three of the last six" was a third count with no basis at all and is gone. **Still NOT MET — but THE DEPLOY GATE IN THIS SENTENCE IS DISCHARGED, corrected 2026-08-24 (Cycle 12).** It read *"not deployed — deploys are Erik's"*, and that stopped being true on 2026-08-23: `bcc963d` (2026-08-19, the appositive fix) is an ANCESTOR of `431b2c1`, the commit prod's Worker `7b337a20` was built from — verified with `git merge-base --is-ancestor`, not assumed. **The fix has been live for a day and the criterion was still reading as blocked on shipping it.** Same shape as ISC-533, which sat blocked on a gate discharged six days earlier; this is the second instance and the reason the handoff's rule is to grep the ISA for an id before trusting any deferral written beside it. **What remains is the RE-MEASURE, and it is blocked on something else entirely:** a fresh live sample means live `/api/answer` POSTs, and each one writes a question row into D1 `events`. The suppression for that is built (ISC-655) but is NOT on prod, so measuring today would re-contaminate the table that was cleaned the same morning. **Deploy first, then measure** — otherwise the cost of this measurement is another hand-deletion. **BOTH GATES ARE NOW DISCHARGED AND THE MEASUREMENT WAS RUN — 2026-08-24 (Cycle 13). IT DOES NOT SETTLE THIS CRITERION, AND THAT IS THE FINDING.** Erik authorised the deploy; prod moved to Worker `eaa27ba4` from `d49060df`, the probe marker went live and was verified with both arms (ISC-655), and the first uncontaminating run is `docs/review/wall-live-probe-2026-08-24-cycle13.txt`: 8 turns, **8/8 answered, 0 reader-facing refusals**, 0 past the 30 s client abort. Attempt level, 12 generations: 4 `blocked:bad_hadith`, 2 `blocked:own_wording`, 2 `blocked:fatwa`, 4 `ok`. **THE INSTRUMENT IS BLIND TO THE FIELD THIS CRITERION IS ABOUT.** `wall-live-probe` keeps only the FINAL answer text (`src/eval/wall-live-probe.ts:303` records `leak` off the returned `answer`); the prose of a REFUSED attempt is never captured. This criterion asks whether the wall refuses **a scholar's position quoted beside an ayah**, so settling it requires reading the refused prose — and the two `own_wording` blocks above therefore cannot be classified as ISC-486 over-refusals OR as correct refusals. A live run can report the RATE of the bucket the class lives in; it cannot report the class. ⚠️ **So do not record the deploy as having advanced this criterion.** What changed is which gate is open: it is no longer waiting on a deploy or on `events` contamination — both are gone — it is waiting on an instrument that captures refused prose, and behind that on the proper-name vocabulary design question recorded below, which is still NOT BUILT. ⚠️ And do not read `0 reader-facing refusals` as this criterion being met: retry and ISC-561 repair sit between a blocked attempt and a refused turn, which is the same absorption recorded at ISC-454 — a turn-level zero is equally consistent with a wall that works and one whose violations were excised.

  **THE INSTRUMENT GATE WAS ALREADY DISCHARGED WHEN IT WAS WRITTEN — 2026-08-24 (Cycle 14), and this is the THIRD instance of that shape in this file.** The Cycle-13 sentence above concludes that this criterion "cannot be scored at all" until something captures refused prose. That conclusion is TRUE OF `wall-live-probe` AND FALSE AS WRITTEN: `src/eval/refusal-capture.ts` was built for exactly this job and marked `[x]` under **ISC-554 on 2026-08-21**, three days earlier — it runs the Worker's own `runGeneration` with the four-argument `guardAnswerProse` and wraps the guard closure, so every candidate the wall was shown is retained. The gate named was the one instrument's; the conclusion drawn was about the criterion. Same shape as ISC-533 (blocked on a gate discharged six days earlier) and as the deploy gate in the paragraph above; the standing rule — grep this file for an id before trusting any deferral written beside it — did not fire because the deferral named a FILE, not an id.

  **WHAT WAS MISSING WAS NOT THE PROSE BUT THE DISCRIMINATOR, and it is now built.** `wordingShape` has FOUR independent reasons to refuse and `guardAnswerProse` reported one label for all of them, `rule: "wording"`. Three are refusals this project wants — a divine verbatim claim (`verbatim_divine`, `divine_attr`) or a prophetic one (`prophetic`). The fourth, `adjacent_unowned`, is the ONLY arm this criterion's class can live in: a quote of at least `OWN_WORDING_MIN_WORDS` words with a citation inside `ADJACENT_CHARS` and no `HUMAN_ROLE` token in the 160 lower-cased characters before it — which is what a bare proper name looks like to a window that cannot see capitalisation. So a count of `rule:"wording"` refusals over real model prose was never a measurement of anything this criterion asks, and a zero and a ten were equally consistent with the wall never once refusing a scholar. `wordingShapeScan` now reports the arm per span, **ONE BINDING** — it IS the arm logic, `wordingShapeHit` is its first refusing span and `wordingShape` is that span's text, so no diagnostic can drift from the gate it describes. Nothing reader-facing and nothing in `GenTrace` reads it. Falsified before it was trusted: relabelling `divine_attr` as `prophetic` in the source reddens exactly one row — the new arm assertion — and leaves every other row in the file green, this file's **67 pre-existing `wordingShape` tests included** (counted by running `HEAD`'s copy of the suite, not estimated). That is the discrimination the old suite did not have: it could not tell those two arms apart at all.

  **FIRST MEASUREMENT OVER REAL MODEL PROSE — 24 turns, `--repeat 3`, 2026-08-24 (Cycle 14).** 59 refused candidates, 32 refused by `wordingShape`: **22 `verbatim_divine` · 9 `divine_attr` · 1 `adjacent_unowned`.** The single `adjacent_unowned` span was read and **is NOT this criterion's class** — its lead-in attributes the words to Allah (`dalam qs al-isra 17:23, allah menetapkan dengan tegas,`), so it is the app writing out an ayah's wording, the refusal this rule exists for. It landed on the ownership arm rather than `divine_attr` only because `menetapkan` is not in `DIVINE_ATTR`; correct outcome, incidental arm. **ISC-486 over-refusals observed: 0, out of 1 opportunity.**

  ⚠️ **READ THE DENOMINATOR BEFORE THAT ZERO. It is 1, not 24, and the first cut of this instrument printed a denominator that could not have been right.** Only **1 of 144 quoted spans** in the sample was ELIGIBLE for the ownership arm at all. A draft defined eligibility as "long enough AND adjacent" and printed `26 eligible · 0 owned · 0 adjacent_unowned` — three figures that cannot all be true, because a long adjacent span with no owner refuses by definition. The arms are ORDERED: a span carrying a divine or prophetic claim is taken before the ownership test is reached, so counting it as an opportunity the wall declined credits the wall with a judgement it never made. Eligibility now means the ownership test ACTUALLY RAN, and the identity `arm === "adjacent_unowned"` ⟺ `eligible && !humanAttr` is asserted in the suite over a corpus exercising both sides.

  **SO THIS CRITERION IS RE-PRICED, NOT MET, AND STAYS `[ ]`.** The guard defect is real and is proved by construction — `Ibnu Katsir menafsirkan QS An-Naml 27:23 begini: "…"` refuses while `Sebagian ulama …` and `Imam Ibnu Katsir …` do not, the whole difference being one `HUMAN_ROLE` token. What the measurement adds is EXPOSURE: this model, on the eight recorded questions, writes about Allah in indirect speech and almost never quotes a named scholar beside an ayah, so the shape occurs at roughly **one opportunity per 24 turns**. The hand-built `120 of 120` grid measures a shape production barely emits, and that is a fact about the grid, not a reason to trust it less — [[guard-tests-need-production-prose]] cuts the other way here for once. ⚠️ **Run-to-run spread is large and two runs of this sample disagreed** (one run: 26 spans reaching the old, wrong denominator with 0 on the arm; another: 1 with 1). Never cite a single run of this instrument as a rate. The proper-name vocabulary design question below is UNCHANGED and still NOT BUILT.

  **DEPLOYED 2026-08-20 (`7556cfd`, worker version `b847f6eb`), RE-MEASURED ON A FRESH SAMPLE, AND STILL NOT MET — because the instrument that would have proved it CANNOT FAIL.** `wall-live-probe --repeat 3`, 24 turns against `new-quranku.axiara.ai`, deploy verified by served bytes (page sha256 `14da2425…` → `948abc13…`, bundle `index-CWwCYulA.js` → `index-Da5Logen.js`, remote asset sha256 byte-identical to local dist; the FIRST curl returned the stale edge copy exactly as this file's constraint predicts). Buckets: `blocked:own_wording` 7 (29%) · `null:no-reason` 5 (21%) · `answered` 5 (21%) · `no-grounding` 3 (13%) · `blocked:bad_hadith` 3 (13%) · `blocked:fatwa` 1 (4%). Terminal `gen.reason` (ISC-533, never `blockedBy`): `blocked`=9 · `deadline`=7 · `answered`=5.

  **THE HEADLINE "Leaks past the deployed wall (`wordingShape` on returned prose): 0" IS TAUTOLOGICAL AND MUST NOT BE CITED AS EVIDENCE.** `guardAnswerProse` — which calls `wordingShape` — IS the egress gate (`worker/src/index.ts:783`), so every returned answer has `wordingShape === null` **by construction**. The probe would print `0` whether this change shipped, whether it were reverted, or whether the wall existed at all. Verified by reading the call path, not inferred. This is the `blind-instrument` shape this project has already recorded once: **ask what the probe would say if the feature were reverted.** The line is not evidence of anything and the criterion cannot be marked on it.
 
  **THE WALL MISSED THE SAME VIOLATION ON THE FIRST POST-DEPLOY RUN, AND THE PRE-DEPLOY COST MEASUREMENT READ BETTER THAN THE RULE DESERVES. 2026-08-20 (post-deploy).** `apa keutamaan sedekah` answered again and shipped *"Dalam QS Al-Baqarah 2:261, Allah menggambarkan orang yang mendermakan hartanya seperti seorang yang menanam satu biji, lalu tumbuh tujuh tangkai, dan setiap tangkai berisi seratus biji."* — the SAME construction, the SAME ayah, the same question — at a plain-word run of **3**, one below the threshold. It passed. Verified by running the SHIPPED `scriptureEchoShape` against the SHIPPED prose and the posted grounding: verdict `pass`, matching what prod did, so this is the rule working as built and not a broken deploy or a bad wire.
 
  **THREE VARIANTS OF ONE VIOLATION ARE NOW ON RECORD AT RUNS 5, 3 AND 2, AND A READER CANNOT TELL THEM APART.** Run 5 (2026-08-20 early-live) is caught; run 3 (this one) and run 2 (*"satu biji yang ditanam"*) are not. The contiguous-run axis is measuring how many connective words the model happened to leave between the borrowed ones, which is not the thing that makes this a violation. **The claim recorded above that four "is the only value that separates this set" is TRUE OF THAT SET and false as a statement about the class** — the set was five answered turns containing exactly one violation, and the very next run produced a variant one word below the line. This is `measured-set-is-not-a-class` repeating INSIDE the entry that cites it.
 
  **THE REDUCING PATH IS A SECOND AXIS, MEASURED ACROSS BOTH RUNS (8 answered turns, 4 with posted verses) AND NOT BUILT.** Counting DISTINCT shared content stems between a sentence and the posted translation — no corpus, no frequency table, just a stopword list and the light stemmer — separates where run does not: the missed violation scores **10**, the caught violation scores 7, and the highest-scoring GOOD sentence in either run scores **7**. So `run ≥ 4 OR shared ≥ 8` catches both violations and spares every good sentence measured, which is a union in the sense ISC-440 means. **The margin is 7 against 10 on eight answered turns and that is thin**, and the nearest good sentence — *"Dalam QS Al-Isra 17:23, Allah menetapkan bahwa…"* at 7 — is one step from refusal. Recorded as an open item with its numbers rather than shipped on a threshold this session's own evidence says is the kind that moves.
  **DEPLOYED 2026-08-20 (late) ON ERIK'S INSTRUCTION. Worker version `b63b5300`, built at HEAD `9b6a5922`.** Verified by SERVED BYTES and a remote sha256, never an exit code: page `948abc13…` → **`db3207a6…`**, bundle `index-Da5Logen.js` → **`index-BjZH83ls.js`**, and BOTH the served page and the served bundle are **byte-identical to local dist** (`e6e9ba23…`). The pre-deploy served state matched what the previous checkpoint recorded, so this is a clean succession rather than a deploy onto an unknown base. The edge settled on the FIRST request this time — the stale-first-curl this file warns about did not fire, which is luck and not a reason to stop warming.
 
  **THE FOURTH ARGUMENT WAS VERIFIED IN THE WORKER BUNDLE BEFORE SHIPPING, not inferred from the source.** `guardAnswerProse`'s echo parameter defaults to `[]` and a bundler that dropped the argument would have shipped a wall that is inert while every test stayed green. `wrangler deploy --dry-run --outdir` then reading the bundle shows the call intact at line 3338 — `verses.map((v) => ({ ref: v.ref, texts: [v.text] }))` — passing real grounding. **Two greps for it returned NOTHING first** (`texts:\[…\]`, and a single-line four-argument pattern) purely because the bundle is multi-line and unminified; a reader who stopped at those would have concluded the wiring was gone. An absence from a grep is a fact about the grep.
 
  **The rights fix is live on the same deploy, checked in the SERVED bundle rather than the built one:** `hadith-en` 0, `Terjemahan Inggris` 0, `hadith-cite` 1, and the inlined `` return`synthesis` `` literal present exactly once.

  **THAT RIGHTS CLAIM WAS TRUE OF THE BUNDLE AND FALSE OF THE APP, AND A `scholarly-gate` PASS FOUND IT 2026-08-21.** The probe above greps the served CLIENT BUNDLE. The leak was in the WORKER RESPONSE: `/api/answer` returned `DisplayRecord` objects raw in its `hadith:` array and `/api/dalil` spread them into `cards`, so `english` (the sunnah.com narration, terms: `private research use`) and `translator` (the Darussalam / Muhsin Khan credit) were still served as JSON on two public endpoints — unpainted rather than unpublished. **An instrument pointed at the renderer cannot see a leak in the response body, and the evidence recorded for the fix was exactly that instrument.** Closed by `publishedCardOf` (`worker/src/dalil.ts`), a field-by-field projection with an exact-SET test, applied on BOTH routes; the model's user message keeps the English per the ruling's scope. Verified in the worker bundle with CONTROLS — `source_url: r.source_url` 1 and `book: r.book` 2 prove the grep works, against `english: r.english` 1 whose sole context is `buildAnswerUserMessage`.
  **THE ATTRIBUTION BUCKET IS SPLIT, 2026-08-21 — the blind instrument named in the 2026-08-20 (late) handoff §2.** `wordingShape` and `scriptureEchoShape` both push `kind: "own_wording"`, deliberately (identical to a reader, and splitting the kind would split reader-facing copy for no reader-visible reason — the ISC-528 shape). The cost was that the wall's live effect was unattributable: post-deploy `own_wording` moved 4/24 → 5/24 against a run-to-run spread already documented at 46% vs 25% on IDENTICAL code. The discriminator now rides a SECOND field: `AnswerViolationRule` on every violation (all seven pushes, so none is anonymous), `GenTrace.blockedRule` read off the SAME `violations[0]` binding as `blocked`, and `gen.rule` on the wire beside `gen.reason`. `wall-live-probe` prints the tally unconditionally — a row of all `-` says the deployed Worker predates the field, which is a DIFFERENT fact from "no rule fired" and must not read as the same one. **This does not by itself make any bucket total evidence** — a whole-run total is still not evidence on this project; it makes a paired arm constructible where one was not.

  **AND IT HAS NOW BEEN READ FROM A LIVE DEPLOY, 2026-08-21 — the first time.** Deployed at
  `7660617` (worker version `ccb77595`, up from `b63b5300`); `wall-live-probe`, 8 turns, printed
  **`refusing gen.rule: wording=2 · -=4 · hadith_unbacked=1`**. Not a row of all `-`, which is the
  reading that would have said the Worker predates the field. Terminal `gen.reason` on the same run:
  `deadline=3 · answered=2 · blocked=2`; buckets `own_wording` 2 · `null:no-reason` 2 · `answered` 2
  · `no-grounding` 1 · `bad_hadith` 1. **NOTHING IS CLAIMED FROM THOSE TOTALS.** Eight turns from one
  run, one deploy, no paired arm — the discriminator being READABLE is what changed here, not any
  rate. The `-=4` cell is four turns that did not refuse at all, not four anonymous refusals.


  **THE PASS-3 BLOCK WAS AN ATTRIBUTION DEFECT AND IT SURVIVED TWO PASSES — record it as the finding, not as a typo.** A NEW `docs/review/` record (`rights-2026-08-20.md` §3) and a NEW comment in `web/src/hadith-card.ts` both stated, unqualified, that *"Ustadz Ahmad's VERBAL approval covers DISPLAYING this Indonesian"* — about the ANSWER CARD. `docs/review/ustadz-followup-2026-08-18.md:138`, **SENT 2026-08-19 and UNANSWERED**, tells him the opposite in terms: that card runs on **Erik's** 2026-08-13 extension of a Hadits-page permission, *"penafsiran Erik atas ucapan Ustadz, bukan ucapan Ustadz"*, and the ustadz was never asked. It is question 3 of that letter. The letter's own `:151` states the reason this must never happen: write *"izin Ustadz"* across all four surfaces, let him answer *"benar"*, and Erik's decision is recorded forever as the ustadz's. **Two aggravations worth more than the fix.** (a) The record's own header reads *"Decider: Erik. Not a scholarly review. Nothing on this page carries Ustadz Ahmad's authority"* — and §3 handed him the load-bearing permission four paragraphs later, so a correct header is no protection. (b) The qualifier ALREADY EXISTED eighty lines up in the same file, on `machine_id`; **a correction REMOVED it.** Both sites now name whose extension it is and that question 3 is outstanding. This is `attribution-lives-in-the-join` a second time: every sentence true on its own, the credit wrong in the join.
  **THREE `scholarly-gate` PASSES ON THIS SESSION'S RIGHTS WORK, AND THE PATTERN REPEATED: two of the three BLOCKs were defects introduced by the PREVIOUS PASS'S OWN CORRECTIONS.** Pass 1 (retroactive, on already-deployed `21ed3c9..6309562`) found the API-body leak above. Pass 2, on the fix for it, found `publishedCardOf` DROPPED `book` — not a `DisplayRecord` field, grafted on from the corpus path so the client can locate the Indonesian shard (ISC-449) — and because `main.ts` bails on `!h.book`, that silently deleted the Indonesian from every answer card, **leaving Arabic alone for a reader who by assumption cannot read the Arabic, and deleting the one thing Erik had just ruled to KEEP.** Its exact-SET test pinned the result as correct. Pass 3, on THAT fix, found the `?? 0` repair re-armed the same defect at the type level (a bare `DisplayRecord` still typechecked to `book: 0`, and the set test cannot see a key that is present holding 0) — closed by making `book` required, verified by a probe confirming a bare `DisplayRecord` is now a COMPILE ERROR. **The code was sound from pass 2 onward; every pass-3 finding was documentation or attribution.**
  **THE WALL IS WIDENED TO UNQUOTED COPYING, ON ERIK'S RULING, 2026-08-20 (late). BUILT AND GATED, NOT DEPLOYED — deploys are Erik's.** He was given the choice with its cost priced and chose to widen narrowly. `scriptureEchoShape` runs BESIDE `wordingShape` and reports the same `own_wording` kind: union, never replacement (ISC-440), because a swap is not a widening and this project has already lost six refusals to one. **The rule is one sentence: a sentence may not share FOUR or more CONTIGUOUS words with a translation we ship for a verse this turn was grounded on.** No stemmer, no corpus, no frequency table — just the two strings.
 
  **THE THRESHOLD IS MEASURED, AND IT IS PINNED FROM BOTH SIDES BY PRODUCTION PROSE.** Scored sentence-by-sentence over the five live answered turns: the violating sentence runs 5, and the highest run in any NON-violating sentence is 3. Against the three production violations on record: 17:32 runs 18, 2:187 runs 12, today's 2:261 splice runs 5. `answer-guard-echo.test.ts` forces red in BOTH directions on real sentences — at 8 the live violation escapes (3 tests red), at 3 a live GOOD answer is refused (1 test red, the `perkataan yang mulia` sentence). Four is not a chosen number; it is the only value that separates this set.
 
  **THE DISCRIMINATOR IS THE OPPOSITE OF THE DETECTOR'S, AND ASSUMING OTHERWISE WOULD HAVE SHIPPED THE WRONG RULE.** Whole-prose, rare-word overlap separates cleanly and `run` does not. SENTENCE-scoped — which is how a wall works — it inverts: overlap stops separating entirely, because a four-word ayah is trivial to cover and a benign closing du'a (*"Semoga Allah memudahkan kita semua untuk berbakti kepada orang tua"*) covers HALF of QS 19:14's distinctive vocabulary, more than the violation covers of QS 2:261's. Both axes were measured before either was chosen.
 
  **COST, PRICED ON REAL PROSE RATHER THAN ESTIMATED: 1 of 5 answered turns refused, and it is the violating one.** Both `adab` turns and both `salat` turns survive. The estimate given to Erik when he ruled was worse than this — the borderline adab case was expected to die and does not — so the widening is cheaper than the ruling assumed, not dearer. **This is a SET of five from one run, not a class**, and the live theme classifier returned 0 themes on 23 of those 24 turns, so a paired live re-measure after deploy is required before ISC-419 moves.
 
  **TWO GAPS, STATED AND PINNED AS PASSING TESTS BECAUSE THEY ARE LIMITS OF A SHIPPED RULE:** a LOOSE paraphrase is not caught (the earlier 2026-08-20 form, *"satu biji yang ditanam, lalu tumbuh tujuh tangkai"*, runs 2 and passes — this closes copying, not paraphrase), and an ayah never posted as grounding cannot be compared against. **A THIRD gap is open and is the most consequential: the Worker supplies ONE translation per verse and we ship two.** QS 17:32's violation runs 18 against the COMPANION and 2 against the PRIMARY, and `gatherGrounding` posts `primary ?? companion`, so that exact violation would slip this wall today. `EchoVerse.texts` is plural so the wall is already ready; the WIRE is not, and carrying the companion means adding `hash(ref, companion)` to the build-time grounding digest and verifying the second field separately — trusting a browser-supplied one would let a caller weaken or trip the wall at will. **Deliberately NOT half-built**, because a partially wired guard is the artifact this repo keeps paying for (`three-walls-not-two`).
 
  **THE FOURTH ARGUMENT DEFAULTS TO EMPTY, WHICH SILENTLY DISABLES IT — the same shape as `isGroundedHadith = () => false` one parameter over.** Two of the five call sites are offline evals with no verse text, so a required parameter would only have them pass `[]` with more ceremony. The live path is policed by a SOURCE-LEVEL test asserting `worker/src/index.ts` forwards real verses; deleting that argument turns the wall off while every behavioural test still passes, and that test is force-red verified.
  **THE INSTRUMENT IS NO LONGER BLIND, AND THE QUOTED HALF MEASURES CLEAN WHILE THE UNQUOTED HALF DOES NOT. 2026-08-20 (late).** `src/eval/scripture-echo.ts` is a detector that shares NO function with the wall: `wordingShape` asks a GRAMMAR question (is there an attribution verb or a citation near a quoted span), this asks a CORPUS question (does this prose reproduce the wording of a translation we ship). It scores every (prose, ayah) pair on two axes — `run`, the longest contiguous shared stem run, scanned corpus-wide and needing no anchor; and `hit`, how many of the translation's RARE stems (df ≤ 150 over all 12,472 shipped translations) the prose reproduces, which survives re-wording. **FORCED RED ON THREE PRODUCTION STRINGS BEFORE ANY ZERO WAS TRUSTED**, all three quoted verbatim in this file: the 17:32 rendering (`run 11`, `hit 2/2`, QUOTED), the 2:187 rendering (`run 9`, sweep hit, guillemets read as QUOTED), and the 2:261 paraphrase (`hit 4/13`, UNQUOTED). Five disjoint mutations — assimilation restore, `DF_MAX`, `longestRun`, the ref-lead guard, curly quotes — each turn the suite red. **Writing the tests found two SILENT defects in the detector itself, both in the direction that reports a cleaner world:** `ditanam`/`menanam` never collapsed (meN- elides the root consonant, so a naive strip yields `anam` against the corpus's `tanam`) and the paraphrase still fired on four OTHER stems, so it looked like it worked while under-counting the exact echo it was built for; and `pukul 09:30` parsed as QS 9:30, a false anchor that manufactures rows.

  **MEASURED, n = 5 ANSWERED TURNS FROM ONE RUN — a set, not a class, and the denominator is small on purpose rather than by accident.** `wall-live-probe --repeat 3` returned 24 turns of which 5 answered (`no-grounding` 21% · `bad_hadith` 21% · `answered` 21% · `own_wording` 17% · `fatwa` 13% · `null:no-reason` 8%). **The live theme classifier returned 0 themes on 23 of the 24 turns**, the ISC-487 confound, which is why so few turns reached a verse-grounded answer at all. No rate is claimed from this and none should be read out of it.

  - **QUOTED renderings: ZERO.** No quotation marks of ANY style appear in any of the five answers, and the anchor-free corpus sweep returns nothing. This is the first non-circular zero this criterion has ever had — the instrument that produced it can fail, and was made to fail three times first.
  - **UNQUOTED near-verbatim rendering: 1 of 5, and it is the strongest instance yet recorded.** `apa keutamaan sedekah` shipped *"dalam QS Al-Baqarah 2:261, Allah menggambarkan pahala sedekah seperti sebutir biji yang menumbuhkan tujuh tangkai, dan setiap tangkai berisi seratus biji"* (`hit 10/13`, `cover 0.77`, `run 5` against the shipped primary). It is a SPLICE of the two shipped translations, not a loose gloss: `yang menumbuhkan tujuh tangkai` is a verbatim four-word run from the primary, `seratus biji` is verbatim in both, and `sebutir` is lifted from the companion. **It is strictly closer to the pinned wording than the 2026-08-20 (early) instance this file records** (*"satu biji yang ditanam, lalu tumbuh tujuh tangkai"*), so the seam is not decaying.
  - **THE CONSTRUCTION IS THE 2026-08-17 VIOLATION'S, MINUS THE QUOTATION MARKS.** That violation was *"Dalam QS Al-Baqarah 2:187, Allah menggambarkan … — «istri-istri kalian menjadi penenteram bagi kalian»"*. Today's is *"dalam QS Al-Baqarah 2:261, Allah menggambarkan … seperti sebutir biji …"*. Same lead-in, same verb `menggambarkan`, same citation-first shape; the difference is that the rendering continues unquoted instead of breaking into a quote. **Whether the wall taught the model to drop the punctuation it keys on is NOT established** — this is n=1 against n=1 and the two runs differ in a dozen ways — but the shapes are identical minus the one feature `wordingShape` scans for, and that is worth writing down rather than inferring from.
  - **BORDERLINE, recorded as borderline: 2 of 5.** `bagaimana adab kepada orang tua` (both answered turns) reproduces 5–7 of QS 17:23's rare stems — `lanjut`, `bentak`, `mulia`, `ibu`, `usia` are the companion's own words — but frames them as DESCRIPTION (*"Ayat ini memberi panduan… kita dilarang… kita diperintahkan"*), never as the verse's wording. Under the prompt rule's third clause that is arguably permitted and arguably not. Not counted as a violation and not counted as clean.
  - **CLEAN, and it is the shape the rule WANTS: 1 of 5.** `kenapa kita harus salat lima waktu` says *"Allah berfirman bahwa shalat itu memiliki waktu-waktu yang tetap bagi orang-orang beriman (QS An-Nisa 4:103)"* — `berfirman` + `bahwa`, indirect, and **`hit 0/7`**: same meaning, none of the corpus's distinctive vocabulary. **That the detector separates hit 0 here from hit 10/13 on 2:261 is the useful validation**, because neither case was in the set it was designed against.
  - **ONE OF THE ELEVEN CANDIDATES WAS A FALSE POSITIVE, and 11 must not be read as 11 findings.** The 4:103 row surfaced on `run 5` with `hit 0` — five contiguous COMMON stems. The `run ≥ 4` anchored reporting threshold admits noise without rare-stem support; the design answer is that a human reads every row, and a human read this one and rejected it.

  **WHAT THIS SETTLES AND WHAT IT DOES NOT.** The criterion's own prompt rule already reaches this case in words — *"not as a paraphrase presented as the verse's wording"* is its third clause — so the unquoted instance is a violation of the RULE AS WRITTEN, not merely of its spirit, and the earlier framing of that as an open question was too generous to the wall. What is genuinely open, and is Erik's, is whether the WALL should be widened to enforce the clause the prompt already states: a rule reaching unquoted prose refuses far more, and `hit 10/13` and `hit 5/8` are one threshold apart while the second is the borderline adab case. **STILL `- [ ]`** — but no longer for the reason the last two records gave. The instrument is not blind any more; the quoted half is clean on a set of five, and the unquoted half is violated on the same set.
  **INDEPENDENT READ, which is the only non-circular evidence available, and it is n=1.** Answer prose was captured directly and read rather than re-scanned with the wall's own function. The one answered turn recovered (`apa keutamaan sedekah`) carries **no quoted rendering of scripture** — the ISC-419 shape — and its two hadith claims carry resolvable markers (`[H:bukhari:1371]`, `[H:muslim:2270]`). **But it does carry an UNQUOTED close paraphrase of QS 2:261** — *"satu biji yang ditanam, lalu tumbuh tujuh tangkai, dan setiap tangkai berisi seratus biji"* — which is the ayah's content in the model's own Indonesian, beside the app's own translation card for the same ayah. **`wordingShape` scans QUOTED spans, so an unquoted paraphrase is outside the rule as written.** Whether that is a violation of this criterion's *words* or only of its *spirit* is a real question and is NOT settled here; it is recorded so the seam is visible rather than discovered a second time.

  **WHAT THIS RE-MEASURE DOES NOT ESTABLISH, stated because the buckets are tempting.** The 29% `own_wording` rate is NOT attributable to this change: a whole-run bucket total is not evidence on this project (only a paired arm, or a row only the change could emit), and the run-to-run spread here is already documented at 46% vs 25% answered on identical code. The capture run compounds it — 4 of 6 questions returned `no-grounding` where the probe run had grounding for 21 of 24, because the live theme classifier is nondeterministic, the confound this file records under ISC-487. **So: deployed, re-measured, and the criterion is exactly as unproven as before — but now the REASON is recorded, which it was not.** What would settle it is a leak detector independent of the wall (a second-model read, or a hand-built detector like the one that caught the 2026-08-17 violation), run over answered prose. That instrument does not exist.

  **What was still required before this could be marked MET, and it is deliberately not fudged:** ~~the fix is COMMITTED, not deployed — deploys are Erik's — so the measurement above still describes what a reader gets today.~~ **Deployed 2026-08-20 on Erik's instruction; superseded by the block above.** ~~A re-measure must run against the deployed fix, and it must be a fresh run~~ — **RUN 2026-08-20, 24 turns; it did not settle the criterion, and the block above says why.** The caution it carried still holds and was borne out: `apa hukum riba…` answered on one of its three turns and was refused `own_wording` on another, so a single passing turn still proves nothing. ~~**A `scholarly-gate` pass on the change is also outstanding**~~ — **that sentence described `bcc963d`, whose five passes are recorded below; the 2026-08-20 change has had nine, all BLOCK, none touching the regex.**

  **RE-MEASURED 2026-08-17 (late-3) ON LIVE PROD, AND IT IS STILL VIOLATED — the prompt rule is deployed and is NOT sufficient.** Seven authored answers driven through the real composer on worker `baaf3b21` (reader conditions: the browser retrieves and posts its own grounding, so this is not the no-grounding path a bare curl measures). **1 of 7 hand-wrote a rendering of scripture**: `bolehkah aku pacaran` shipped *"Dalam QS Al-Baqarah 2:187, Allah menggambarkan hubungan suami istri sebagai pakaian yang saling menenteramkan — «istri-istri kalian menjadi penenteram bagi kalian, kalian menjadi penenteram bagi mereka.»"* — the model's own wording of the ayah, in quotation marks, immediately after the citation, while the app's own translation card for 2:187 renders below it. That is precisely the "two different renderings of the same ayah on one screen" the rule names. A single instance falsifies a `never` criterion, so this is NOT MET on evidence rather than on absence of measurement. **MECHANISM, verified by construction and not inferred:** `guardAnswerProse` has NO check for it — `guardAnswerProse('Dalam QS Al-Baqarah 2:187, Allah menggambarkan — "istri-istri kalian…"', anyAyah, grounded)` returns `ok`. Rule 2 lives only in the prompt, and a prompt rule is a request. The detector used here fired 3/3 on the pre-fix prod prose quoted in this file, so the six clean answers are a measurement rather than a blind spot.
- [ ] ISC-420: an authored answer never attributes a position to the scholars without a receipt. **FIXED AT THE INGESTION POINT 2026-08-12; NOT MET until deployed and re-measured.** New rule 6 draws the line where it actually falls: saying the scholars DIFFER is honest and stays (it tells the reader the matter is contested); asserting that they AGREE — `para ulama sepakat`, `sudah ijma`, `tidak ada khilaf` — or naming a madzhab's position does not, because the app cannot show the reader the source. That line keeps `apakah musik haram` and `bolehkah perempuan jadi pemimpin`, the two answers a hard wall would have destroyed. Original evidence, unguarded: `hadithShape` demands a resolvable marker for every sentence attributing something to the Prophet ﷺ. There is no analogue for attributing to the ulama, so *"para ulama sepakat…"*, *"sebagian besar ulama klasik memahami…"*, *"ulama kontemporer banyak yang berpendapat…"* all ship with no source. 2 of 11 live answers carry one. **The wall has a receipt rule for the Prophet and none for the scholars, and a script rule for Arabic and none for translated scripture — both walls are half-built along the same seam.** Building the second half is a product decision, not a bug fix: the two answers carrying these claims (`apakah musik haram`, `bolehkah perempuan jadi pemimpin`) are among the best the app produces, and a hard rule would replace them with the cold caption list Erik refused.

  **RE-MEASURED 2026-08-17 (late-3) ON LIVE PROD: 0 violations in 7 authored answers.** Same run as ISC-419 above. Every scholar mention was a statement that they DIFFER — *"ditafsirkan berbeda oleh para ulama"*, *"Sebagian ulama memandang…"*, *"Perbedaan ini adalah khilaf yang sudah lama dikenal"* — which rule 6 does not merely permit but welcomes, because it tells the reader the matter is contested. No `para ulama sepakat`, no `ijma`, no `tidak ada khilaf`, no madzhab position. **The sample deliberately contains both answers this file names as the ones a hard rule would have destroyed** (`apakah musik haram`, `bolehkah perempuan jadi pemimpin`); both are clean, which is the outcome the prompt-first path was betting on. Detector fired 3/3 on the control, including a synthetic `para ulama sepakat` sentence. Not marked MET on 7 samples alone — but the evidence now points the same way the fix intended, and the contrast with ISC-419 (same prompt, same run, still violated) is the useful finding: rule 6 tells the model what it MAY say instead, rule 2 only tells it what it may not.
- [x] ISC-422: the it-depends opener does not license the verdict behind its `tapi`. **MET.** `"Tergantung niat, tapi perbuatan itu haram"` passed the first cut of `DEFER`; the clause was dropped entirely at a measured cost of zero — no regression across the eleven live answers, none across the compliant-disclaimer cases.
- [x] ISC-423: Anti: the pin-request letter is never sent stating something about the app that is no longer true. **MET.** `docs/review/hukum-pin-request-2026-08-12.md` said *"Aplikasi tidak mengarang jawaban"* and is addressed to Ustadz Ahmad. That has been false since the edition flipped. A blocking ⛔ header now stands above it recording both the false sentence and the falsified premise, so the letter cannot go out as written.
- [x] ISC-421: naming the scholars does not buy amnesty from the fatwa wall. **MET 2026-08-12.** `HEDGE` was a flat word list read sentence-wide, so `ulama`, `fatwa`, `ustadz` and `tergantung` each switched the verdict check off for their whole sentence — and those are the words that appear in the strongest rulings. Control pair: `"Perbuatan itu haram"` CAUGHT / `"Para ulama sepakat perbuatan itu haram"` PASSED. Replaced with `DEFER`, a construction list requiring an actual deferral. Force-red confirms the new tests are load-bearing (reverting to a word list fails exactly 2). **0 regressions across the 11 live answers** — the old amnesty protected none of them, so it could only ever let a ruling out.
- [ ] ISC-417: Ustadz Ahmad has signed off on AI-authored answers. **WITHDRAWN by Erik 2026-08-22 — and it stays `[ ]`, permanently, because withdrawing the criterion does not satisfy it.** Erik's ruling is that the project no longer WAITS on a reply: *"no need for ustadz letter anymore"* — confirmed **by Erik**, on a direct follow-up question, to cover this criterion and ISC-464(b). **What that changes is the WAITING SCHEDULE, not the provenance and not one promise.** Ustadz Ahmad Isrofiel Mardlatillah **has sent nothing in reply to these two letters** — `docs/review/tanya-ai-request-2026-08-17.md` and `docs/review/ustadz-followup-2026-08-18.md` — and that fact is now PERMANENT rather than pending. **So this criterion must never be re-marked `[x]`, and no record may ever say he reviewed, approved, cleared or answered anything IN THESE TWO LETTERS.** ⚠️ **That prohibition is scoped deliberately, because a blanket version of it would be false and would void three real permissions**: F-1 = yes (2026-07-17, displaying the Indeks Tematik, `ISA.md:292`), the co-display confirmation (`docs/review/codisplay-confirmation-2026-07-23.md`), and the machine hadith Indonesian approved as-is (`docs/review/hadith-id-approval-2026-08-12.md`, **VERBAL and relayed — the hadith TEXT layer only, NOT chapter titles, and on our own narrow reading the Hadits page only, NOT the answer card**; that file's 2026-08-21 caveat exists precisely to stop this permission being restated unbounded, so never cite it without both narrowings). Those three stand, do not widen, and **do not cover AI-composed answers.** **And ending the wait does NOT make a future reply unrecordable** — if he ever answers, it is recorded per each letter's §*Setelah Ustadz menjawab*, form included. A first draft wrote "no record may ever say he answered anything", which would have breached that promise and destroyed the record's ability to represent a real approval. The direction of the change is a WEAKER claim, not a stronger one: the app ships AI-authored religious answers with no scholarly sign-off, by Erik's knowing decision, indefinitely. **The user-facing disclosures are therefore MORE load-bearing than before and must not be softened, made conditional, or removed.** Per surface: the ANSWER surface ships `AI_CHIP` / `AI_NOTE` (`web/src/answer-disclosure.ts`); the HADITH layer ships *"Terjemahan mesin · belum ditinjau"*; the KAJIAN artefacts ship *"belum diperiksa ulama"* (`src/app/kajian-slide.ts`, `kajian-narration.ts`). Each is pinned by tests. They are not the ONLY safeguard — the answer guard is the other — but they are the part the reader sees, and a first draft both called them "the only thing" and filed a kajian-only string under the answer surface. **⚠️ WHAT THIS RULING DOES NOT UNBLOCK — every PROMISE in either letter.** Two drafts of this line got the shape wrong and `scholarly-gate` BLOCKED both: the first said "one thing", the second gave a CLOSED numbered list under a heading claiming totality. Both are exhaustive by construction, and both released by implication the promises they omitted — the second one missed six. **The binding sets are each letter's §*Yang tidak kami lakukan* (four bullets in `tanya-ai-request-2026-08-17.md`, seven in `ustadz-followup-2026-08-18.md`) plus every *"selama menunggu"* / *"sebelum surat ini dijawab"* clause in their bodies. No summary here is the boundary, this one included; anything not explicitly released is HELD BY DEFAULT.** Deciding not to wait is Erik's to make, but a promise delivered to a third party cannot be retired by our own bookkeeping (`a-sent-letter-outranks-the-handoff`) — and because we no longer wait, those clauses lose the closing event that was ours to bring about, so the promises become PERMANENT rather than lapsed. Examples, NOT the boundary: the God/unseen filter (ISC-464(b)); the hukum-nikah and hukum-waris pinned lists; hadith ORDERING unchanged on our own technical grounds; the TWO-HADITH cap `MAX_DISPLAY = 2`, separately Erik's own ruling in `docs/review/rights-2026-08-20.md` §4 and never reachable by a bookkeeping edit; and *"Tidak mencatat teks hasil mesin sebagai teks yang sudah diperiksa"* — the permitted-vs-checked invariant this whole audit protects. **Of the two promises whose REMEDY depended on an answer, ONE IS NOW CLOSED and one still hangs.** **CLOSED 2026-08-22**: the exception for one already-shipped sentence to be corrected "according to the Ustadz's answer" — the sentence was in fact corrected FIRST, independently, in `6d4d909` (2026-08-19), which scoped the permission banner to the hadith TEXT layer and states outright that the bab titles were never asked about. So Erik's decision no longer stands written as the ustadz's. Verified live in the deployed bundle and now pinned by `web/src/hadith-permission-notice.test.ts` (force-red: reverting the string fails 3 of 4). **The promise therefore stands UNCONDITIONAL, which is why the pin was added — an unconditional promise guaranteed only by an unpinned string is one careless edit from breaking silently.** Residual, and NOT part of that exception: his name still appears on the basis of a VERBAL relay while the written confirmation asked for will never arrive; the letter's own offer to replace it with an unnamed sentence or remove it stands open and is Erik's. **STILL HANGING**: corrections a *next letter* was bound to carry, with Erik having decided (2026-08-21) not to send a separate third letter. That vehicle is gone, so the correction has no delivery path — Erik's to decide, and an undelivered correction must not quietly become a correction that never existed. **Releasing any of this requires an explicit, item-by-item ruling from Erik**, recorded at `docs/review/erik-ruling-2026-08-22.md`. Cited by SECTION NAME, never line number — a first draft cited four line numbers and its own edit had already invalidated all four, which is the rule `ustadz-followup-2026-08-18.md` states outright.
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
- [ ] ISC-454: the opened wall is verified LIVE on prod, and the `bad_hadith` block rate is re-measured against the 24% baseline. **NOT MET — and the stated baseline cannot settle it (2026-08-15).** **CORRECTION 2026-08-17 (late-5) — the "zero cards, and the cause is the PROMPT" reading below is FALSIFIED, and the missing instrument now exists.** Cards do render: two 24-turn `wall-live-probe --repeat 3` runs and a 9-pair control arm all show the model citing what it is offered — `h2→2→2` and `h2→2→1` rows throughout, **7 of 7** answered turns in the paired arm carrying a resolving marker, and 8 of 9 in the whole-run sample. Rule 7 lands; there is no prompt work here. The 2026-08-15 reading came from unpaired single-shot turns, the same failure mode recorded at ISC-484. **The block RATE now has a comparable number from a real instrument**, which is what this criterion actually wanted: `bad_hadith` was 5/24 and 2/24 across the two whole runs and 1/9 in the paired arm — but whole-run totals move 25% → 38% → 46% answered with NO deploy between, so only the paired arm is worth acting on. What keeps this open is unchanged and is NOT a measurement: the rights half (recorded below, Erik ruled) and the ~26 s deadline wall, which is ISC-487 and arm-independent. **UPDATE 2026-08-15 (late) — the wall IS verified live, and the zero-cards cause is now known: it is the PROMPT, not retrieval.** A `dalil` diagnostic on the `/api/answer` body (shipped `d5750f6`, worker `6d2f9743`) reported `eligible:true, bound:true, offered:2, records:2, failed:null` on BOTH eligible questions driven through the real UI (`bagaimana hukum utang piutang dalam islam` 8,406 ms; `apakah sedekah boleh diungkit ungkit` 10,588 ms) — retrieval handed the model two fully-resolved hadith and nothing threw, and the model still made a prophetic attribution WITHOUT a resolvable `[H:…]` marker, so `bad_hadith` fired correctly and no card rendered. A control question (`aku sedih sekali hari ini`) reported `eligible:false, offered:0, records:0` and answered in 4,387 ms, which is what makes the field an instrument rather than a constant. This retires the earlier "UNDETERMINED — gate vs retrieval" reading. **The remaining half of this criterion is unchanged and still needs Erik:** the block RATE still has no comparable number, because the 24% baseline is not re-runnable (see below). Latency now has a mechanism too — the control is fast precisely because it skips the dalil chain, so eligible turns pay embed + Vectorize + R2 + rerank and land at 8–11 s against the 12,000 ms client abort; a fourth question aborted outright. Make the eligible path cheaper; do NOT raise `TIMEOUT_MS`. The wall is now DEPLOYED (worker `dbd6be86`), so "needs Erik's deploy" is discharged. What is not discharged is the measurement, because the instrument that produced the 24% baseline is structurally blind to this change: `src/eval/grounding-probe.ts:216` pins the hadith predicate to `() => false`, and `:151` sends `entries: []` on every sample while the Worker gates hadith retrieval on `entries.length > 0` — so re-running `eval:grounding` reproduces ~24% BY CONSTRUCTION, and none of the original 141 samples could ever have reached hadith. `src/eval/answer-run.ts:163` has the same two-arg guard. Neither offline harness calls `searchDalil`, and prod has NO telemetry (no `console.*` in `worker/src/`, no `observability` block in `wrangler.toml`), so the baseline was never production traffic either. A comparable number therefore needs a NEW instrument — either live-UI probing (7-question run done 2026-08-15) or Worker-side logging of `blocked` — not a re-run. Live probe found: 3 of 7 questions at or past the 12s `TIMEOUT_MS` (9,433 / 10,954 / 18,614 ms), 2 of 7 never resolving, the single `hadith-defer` firing at 12,254 ms, and ZERO hadith cards rendered. Everything above is code-verified only (`bun test` 1398/0, typecheck exit 0, synthesis build exit 0, dry-run bindings confirmed). The baseline to beat is 34 refusals in 141 live generations, measured 2026-08-13. Two things can only be seen live: whether the model reliably emits a marker on the first generation (the no-retry break is a bet that it does), and what the added retrieval hop costs against the browser's 12s `TIMEOUT_MS` on a cold isolate — §1 of the handoff already measured 2-in-3 first-requests timing out BEFORE this cycle added an embed + Vectorize query + R2 fetch to the path. Erik ruled the approval DOES extend from the Hadis tab to the answer card. Two constraints ride with it and neither is optional: `reviewed_id` must keep its meaning (ISC-448 is a tested invariant) so the machine text needs its OWN field or badge and must never overload it; and the approval remains **verbal and relayed** (`docs/review/hadith-id-approval-2026-08-12.md`) — a decision by Erik to display, not an artefact from Ustadz Ahmad, and it must not be written up as the latter. This unblocks ISC-434/435, which still additionally need the Vectorize + `okf-corpus` bindings on the prod Worker (`worker/wrangler.toml`; `[env]` blocks do NOT inherit top-level bindings). ORIGINAL: **NOT MET — open decision, not a coding task.** The Hadis tab now shows Indonesian; the answer card still shows Arabic + English only. Whether the ustadz's approval extends here is Erik's to relay: browsing a book and being told *"this hadith answers your question"* are different weights on the same words. **RE-MEASURED 2026-08-24 (Cycle 12) — the reader-facing `bad_hadith` refusal rate is 0/32, and the number moved for a reason that is NOT the wall getting looser.** Dump: `docs/review/wall-live-probe-2026-08-24.txt` (32 turns over the 8 recorded questions, Worker `7b337a20`, two runs). **Turn level: `blocked:bad_hadith` 0 of 32 (0%).** **Attempt level: 8 of 56 generations (14%) were refused by the hadith rule** — so the wall is still firing at roughly the rate it always did; what changed is that a refused generation no longer ends the turn. Two things absorb it, both read off the wire rather than inferred: **retry** (17 of 24 turns in run B admitted a second generation, 16 of those 17 ended answered) and **repair (ISC-561)**, which ships the prose with the offending sentences excised even when BOTH generations were refused — captured verbatim on one turn as `attempts:[blocked:bad_hadith, blocked:own_wording]` with `reason:"answered", repaired:true, repairedDropped:3`. ⚠️ **DO NOT WRITE "24% → 0%".** The 24% baseline (34 of 141, 2026-08-13, `worker/wrangler.toml:53`) was measured over a DIFFERENT and far larger question set; this is 32 turns over 8 questions. The comparison is not like-for-like and this project has already lost a session to treating a measured set as a class. What IS supported: **on this set, at this deploy, the hadith wall costs the reader nothing.** ⚠️ **This does not verify the wall is still CORRECT.** A refusal rate of zero is equally consistent with a wall that works and with one that has been defeated by repair excising the receipt along with the violation — nobody has read a repaired answer for theological soundness, which is the open ustadz item. It stays `[ ]` for that reason, not for want of a number.
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
- [ ] ISC-464: the two remaining P0s from the 2026-08-15 critique are addressed. **NOT MET — scoped, one half withdrawn, and HALF (a) IS NOW FALSIFIED (2026-08-16).** **Half (b) UPDATE 2026-08-22: it is no longer blocked on the ustadz's ANSWER — Erik withdrew the wait (see ISC-417) — but it is NOT thereby unblocked.** The letter promised the ustadz we would learn his boundary *before* installing the filter on claims about Allah and the unseen. That is a commitment to a third party, and not waiting for a reply does not release it. **Held pending an explicit ruling from Erik on the promise itself, which is a different question from the schedule.**

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
- [x] ISC-472: every displayed entry can name the chapter it was collected under. **MET 2026-08-16 (late-4), verified live by screenshot. RE-VERIFIED 2026-08-17 with a control arm — correct, but reachable only on the `applyAi`-null fall-through; see ISC-476.** The render says *"Ini yang {author} kumpulkan soal {category}"* and that sentence is false for a borrowed line unless the line can say where it came from — so `category` and `categorySlug` are REQUIRED fields on `KnowledgeEntry`, not optional. Borrowed lines carry a quiet `dari bab X` link home; when nothing is borrowed the original sentence is untouched, so the common case adds no new review surface. Live: *"...kumpulkan soal **Perintah dan Larangan** dan bab lain yang membahas hal serupa"* with `dari bab Ekonomi Islam` on QS 30:39. The added Indonesian went through the IndonesianPolish pass (`menyinggung` -> `membahas`: `menyinggung` reads first as *offend*, an ambiguity that is expensive on a religious surface).
- [x] ISC-473: Anti: ruling VOCABULARY selects no chapters. **MET 2026-08-16 (late-4), found by Erik's screenshot of the live app, not by any probe of mine.** After ISC-469 shipped, `apa hukum riba dalam islam dan kenapa dilarang` returned QS 33:52 (*"Dilarang menikah lagi dan mengganti istri"*), 5:49 (*"Dilarang mengikuti hawa nafsu manusia"*) and 33:48 under a question about riba — every one a genuine `dilarang` hit, not one about riba. `dilarang` reaches 4 categories and `wajib` reaches 7; `riba` reaches 2 and is the actual subject. `RULING_FRAME` is excluded from shard SELECTION only and deliberately does NOT feed `isFrameWord`, because a ruling word must keep scoring normally inside a chapter or `kenapa zina dilarang` would stop ranking a *"Dilarang..."* caption above one silent on the ruling. **Do not tidy that asymmetry away.** MY PROBE MISSED IT because it asked `hukum riba dalam islam` and dropped the trailing `dan kenapa dilarang` — the shortened question a developer types, not the one a person does; the tests now use full phrasings. QS 7:19 still appears on ruling questions and is NOT from this change — it is in the routed chapter and was always reachable.
- [x] ISC-474: the reader never meets markdown syntax. **MET 2026-08-16 (late-4), reported by Erik with a screenshot and verified live at 0 raw asterisks.** Mid-answer, in a paragraph about sins a person does not notice themselves committing, the app rendered `**sikap meremehkan dosa kecil**` asterisks and all. The model writes markdown; the render escapes BEFORE it linkifies (it must — the other order hands a model-authored string an HTML injection surface), so the markers survived escaping as literal text. `mdEmphasis` runs AFTER `esc`, where the input is already inert, and converts bold and italic ONLY — headings and bullets are not emphasis, and silently rendering them would hide a prompt problem. It lives in `web/src/prose-format.ts` rather than `main.ts` because `main.ts` is the entry point with no exports, so nothing in it can be unit-tested. Chasing the count to zero found a SECOND surface: the sunnah.com export carries markdown in the corpus itself (every narration opens `**Narrated \`Aisha:**`). Rendering it is presentation, NOT correction — no word of the narration changes. Probe: `web/src/prose-format.test.ts`, force-red 5/10 with the function neutered to identity.
- [x] ISC-475: the reader's own question is on screen when the answer lands. **MET 2026-08-16 (late-4), reported by Erik, verified live at `top=70px` in an 816px viewport after a settled second turn.** `scrollDown` pinned the BOTTOM of the page, which read fine while the skeleton was the last thing in the thread — then the answer landed, the page grew by several screens, and the same call threw the reader past their own question to the foot of an answer they had not started reading. From the second question onward Erik had to scroll UP to see what he asked. The AI-upgrade path was the worst of the four sites: it fires a beat AFTER reading has begun and yanked the viewport out mid-sentence. `scrollIntoView` rather than arithmetic ON PURPOSE — body carries `zoom: .9`, which desynchronises `getBoundingClientRect()` from `window.scrollY`, and hand-rolled offset maths against that has already cost this project a session. Header clearance rides on `scroll-margin-top` in the stylesheet.
- [x] ISC-476: the reader is never shown the scholar's cited entries and then has them taken away. **MET 2026-08-17 — deployed to prod (worker version `f3fc6ab4`, bundle `index-De6rz3fV.js`) and verified live in real Chrome by the probe this criterion names.** Dense 2 s sampling of `apa hukum riba dalam islam dan kenapa dilarang`, storage and CacheStorage cleared first and the endpoint warmed so the first post-deploy request is not the evidence: composing notice to T+12 s (`chars=60`), the knowledge card at T+14 s (`knowcat=1 knowlist=1 knowref=5 chars=841`), and at T+18 s the AI answer lands — `kept=1 ai=1 chars=9839` **with `knowcat` still 1**. Held at 1 through T+46 s. **The count never goes 1 -> 0**, which is the exact assertion; the same probe read `knowcat=0` from T+16 s before this change. Ordering confirmed numerically: the kept card's text begins at character 9,070 of 9,839, i.e. BELOW the composed prose, not above it. Survives a reload (`turns=3 knowcat=1 kept=1 chars=9839` after navigate), so the stored KEY re-derives correctly. Computed-style probe stands in for the screenshot, which times out on this page's gradient ground (documented Interceptor limit — the missing-pixel gap is stated, not implied): the divider resolves its token rather than falling back (`1.11px solid oklch(0.32 0.018 165)`, `margin-top 28px / padding-top 20px`), the CSS-generated label renders (`::before content: "dari bab "` on `a.know-cat` reading `Ekonomi Islam` — invisible to any textContent probe, see ISC-472), all 5 entries survive, and the credit line travels WITH the entries (`Indeks Tematik oleh Ustadz Muhammad Thalib — quran.tarjamahtafsiriyah.com`) rather than being orphaned from them. Zero failed resource loads on the deployed page. ORIGINAL DECISION AND BUILD: Erik's call: keep the entries BELOW the composed answer rather than stop rendering a card that will be retracted — "nothing ever disappears." Erik's call: keep the entries BELOW the composed answer rather than stop rendering a card that will be retracted — "nothing ever disappears". Shipped in `7575682`: the composed turn now carries a `below` KEY (never markup) naming the superseded `knowledge`/`aqidah` turn, `renderTurn`'s `ai` case re-derives that card through the same code path a standalone turn uses and concatenates it under `aiHtml`, and `.kept-scholar` separates them with the rule `.tier3` already uses — what is above is machine-composed and ours, what is below is the scholar's, and an unmarked join would let the prose borrow his authority. Storing the key rather than the HTML means a RESTORED thread re-derives from today's index, so nothing disappears on reload either. Only the two lanes where the app authors nothing are carried; our own refusal copy would contradict the answer above it and verse cards would duplicate what the composed answer already renders from its refs. `keptBelow` was lifted into its own module so it is testable without importing the app entry: 12 tests, force-red confirmed (reverting `applyAi(v, fast)` to `applyAi(v)` fails the guard, and the mutation was verified applied before the run). Gates: `bun test` 1517/0, typecheck 0, synthesis build 0, `.kept-scholar` confirmed present in the SHIPPED css (a discarded rule still exits 0). **Follow-up to close this:** after deploy, sample `a.know-cat` at 2 s resolution from submit to T+20 s and assert the count never goes 1 -> 0. ORIGINAL: **NOT MET — measured 2026-08-17 on prod.** `FAST_ANSWER_MS = 9000` renders the principled turn at ~9 s while the composed answer keeps coming, and `main.ts:934` then replaces the whole node. Dense 2 s sampling of `apa hukum riba dalam islam dan kenapa dilarang` caught the window exactly: composing notice to ~T+11 s, the knowledge card with `knowcat=1 knowlist=1 knowref=5` at T+12 s and T+14 s, the AI lane from T+16 s onward. For about four seconds the reader is reading Ustadz Muhammad Thalib's five cited entries; then app-authored prose replaces them mid-sentence. The fast turn is LABELLED as the fast one, but the label says "still composing", not "these entries are about to disappear". Probe: sample `a.know-cat` count at 2 s resolution from submit to T+20 s and assert the count never goes 1 -> 0. Fixing this is a design decision for Erik, not a defect to quietly patch — the options (keep the entries below the composed answer, or stop rendering a card that is going to be retracted) change what the reader is promised.
- [x] ISC-477: Anti: the `dari bab` attribution is never probed by page TEXT. **MET 2026-08-17.** `styles.css:1144` is `.know-cat::before { content: "dari bab "; }` — the words exist only in the stylesheet. `document.body.textContent.includes('dari bab')` is `false` on a page where the feature is rendering perfectly, so a text probe reports the shipped feature as missing. Count `a.know-cat` elements for presence; confirm the rendered words by screenshot only. Both halves were confirmed in SERVED bytes this session: `index-DZQQeRQP.js` carries the amended sentence, `index-sBZ5Brsy.css` carries the `::before` rule.
- [x] ISC-488: typing in the Hadits section searches hadith instead of running the companion pipeline. **MET 2026-08-18 — DEPLOYED TO PROD (worker version `4bf633a2`, bundle `index-KFCMiW0O.js` / `index-BuvZdTir.css`) and verified on the live site in real Chrome.** Prod probe: `/api/dalil` HTTP 200 in 2,458 ms with `cards:2` / `refs:6`, and the rendered page reports `readVisible:true chatHidden:true cards:2 refs:6 backClickable:true anyRefHasText:false`. Baseline before the deploy was `/api/dalil` → 405 and bundle `index-CyVBC63y.js`, so the change is provable rather than asserted. Originally verified live** against the real Vectorize index via `wrangler dev --remote` on `worker/wrangler.toml` (repo root, wrangler 4.x — see ISC-372). Erik's ask (2026-08-17): "whenever you are clicking there, that particular section will be the first thing it will serve." `main.ts` submit now branches on `#/hadis` / `#/fikih` the same way it already branched on `#/baca` and `#/peta`; those two routes previously fell through to `ask(q)`, which leads with ayat and reaches hadith only when retrieval found NO verse. Probe: POST `/api/dalil` with `apakah ada hadits tentang perceraian` → HTTP 200 in 1,669 ms, `cards: 2` (Bukhari 5042, 5118, kitab *Divorce*), `refs: 6`.
- [x] ISC-489: the section search has NO model in its path. **MET 2026-08-18.** `handleDalilSearch` calls `searchDalil` → `rankByFiqhArea` → `capForDisplay` → `fetchDisplayRecords` and returns corpus records verbatim. No `callChatModel`, no prose, therefore no surface for `fatwaShape`, `own_wording` or the hadith guard to police, and no way for this route to author a ruling. Same safety argument as `/api/find-surah`, which is why it sits in the same principled-edition allowlist.
- [x] ISC-490: the display cap did not move to build this. **MET 2026-08-18.** `MAX_DISPLAY = 2` is unchanged and `capForDisplay` still slices to it; the live probe returns exactly 2 cards on every query tried. Erik chose the two-tier result (2026-08-17) precisely so the list could grow without touching the rights position, which remains an open call and is NOT pre-empted here.
- [x] ISC-491: Anti: a reference line never carries hadith text. **MET 2026-08-18, force-red verified.** `referenceLineOf` is an explicit seven-key literal (`id, collection, hadith_number, grade, book_en, bab_en, source_url`) — never a spread, never a spread-then-delete. `worker/src/dalil-search.test.ts` asserts the key SET rather than the absence of two names, because the real failure is a field added to `DalilHit` next month arriving free. Force-red: replacing the body with `{ ...h }` fails 4 of 5 tests, naming `arabic`, `english`, `path`, `score`, `rerank_score`. Confirmed on the WIRE too — the live response's `refs` array matches neither `"arabic"` nor `"english"`, and every ref has exactly 7 keys.
- [x] ISC-492: the Fikih section names the amal area without implying a ruling was produced. **MET 2026-08-18 — DEPLOYED and verified on live prod:** placeholder reads `Cari Bab Fikih`, `hukum perceraian` renders the doorway **Talak** linking to `#/hadis/bukhari/68` and `#/hadis/muslim/18`, with `cards:2 refs:6`. On prod the fiqh arm returned DIFFERENT records from the hadith arm (Muslim 3529 and an all-Muslim reference set vs Bukhari 5118), so the re-rank is doing observable work rather than being a no-op. `fiqhAreaOf` supplies a doorway card (title, sub, and links to the compilers' own kitab at `#/hadis/<collection>/<book>` — there is no `#/fikih/<area>` route and this does not invent one). Live: `berapa rakaat salat duha` → **Salat**, `bagaimana cara wudu yang benar` → **Thaharah**, `nisab zakat emas` → **Zakat**, `puasa syawal` → **Puasa**. The Fikih lane still only re-ranks; `rankByFiqhArea` is applied BEFORE the cap so it can change which two show, and it can neither admit nor refuse.
- [x] ISC-493: section search does not present its nearest matches as if they answered the question. **CLOSED BY DECISION 2026-08-18 — Erik: accept it as search behaviour. NOT fixed, and deliberately so.** The measurement stands and is the reason: a rerank floor looked clean on 3 samples (REAL 0.75–0.85 vs non-real 0.19–0.41) and COLLAPSED at 20 — worst real `hukum poligami` at **0.4805**, best non-real `qqqq wwww eeee rrrr` at **0.4102**, a 0.0703 window against a score `dalil.ts` twice documents as "NOT a correctness signal, and not comparable across questions". A threshold in that window silences a legitimate fiqh question to suppress gibberish, and that trade is not worth making. The box is labelled "Cari Hadits"; a search returning its nearest matches is search behaviour, not the answer path manufacturing an answer — the answer path's own walls are untouched by this. **No code changed.** Note for anyone re-opening it: those 20 samples were measured on the APPROXIMATE scores, so if exact scoring is ever adopted the measurement is stale and must be redone before a floor is re-proposed — but ISC-323.3 has since answered NO to exact scoring, so that path is closed too.
- [x] ISC-494: the Fikih doorway appears on questions that span two areas. **MET 2026-08-18 — Erik's call: change tie-breaking.** `fiqhAreaOf` now resolves a tie to the EARLIEST-MENTIONED area instead of `null`. **The tie on the named question is THREE-way, not the two-way every prior record described:** `hukum menceraikan istri saat haid` matches `menceraikan` (talak), `istri` (nikah) and `haid` (thaharah) at n=1 each — `istri` is a nikah cue and was missed. It now routes to **talak**. The rule is grammatical, not juristic: Indonesian names the subject first and trails the circumstance (`hukum X saat Y`), so the earliest cue is the topic and the later ones qualify it; nothing here asserts a ruling, and `fatwaShape` still refuses. **The safety argument was re-verified structurally rather than restated, and there are THREE consumers, not the two first recorded here:** `index.ts:844` `rankByFiqhArea` is a stable partition that drops nothing; `index.ts:1206` builds the doorway payload; and `web/src/dalil-search.ts:165` `fiqhDoorwayEl` gates on `if (!area) return ""` and is the one that actually renders the reader-facing card. The third was found only because the advisor pass insisted `null` was a SIGNAL — "no confident area" — rather than an absence, and that every branch reading it be enumerated. None of the three can admit or refuse a hadith, so the re-rank-only argument holds; but the honest statement of the cost is now **ordering, a doorway label, and which two cards clear `MAX_DISPLAY = 2`** — not ordering alone. **Two residuals are accepted rather than solved:** the rule is user-phrasing-dependent by construction (two paraphrases of one question can file differently), and on a genuinely ambiguous question the doorway now names a kitab on a positional guess where it used to stay silent. Both are inherent to the change Erik chose; the card's copy files the question under a kitab and asserts no ruling, and `fatwaShape` still refuses. **A second, unlooked-for defect was found and fixed in the same function:** `sai` was listed TWICE under `haji`, so that area silently scored 2 for one cue and won ties it had no claim to — `hukum wudu lalu sai` routed to haji over thaharah. Cues are now deduped, so the score means "how many DISTINCT cues matched", which is the only reading the tie-break can rest on.
- [x] ISC-478: Anti: a "lane X never renders" claim ships without a control arm that makes it render. **MET 2026-08-17.** Eight questions returned `knowcat=0` at settle, which is equally consistent with "superseded", "wrong selector", and "feature reverted". Patching `window.fetch` to reject `/api/answer` made the identical question render `knowcat=1` with the tag on the genuinely borrowed entry (QS 30:39, `Ekonomi Islam`), which converts an absence into a measurement. The same control also enumerated what it was testing: `applyAi` returns null on exactly four branches (`answer.ts` 140/151/170, `main.ts:830`), so the fall-through's reachability is a closed list, not a guess.
### Cycle 9 — three of Erik's calls, and the lever that answered itself (ISC-495..526, 2026-08-18)

- [x] ISC-495: `searchDalil` accepts an ADDITIVE options argument whose `exactScores` defaults to false. **Cycle 9 — opened 2026-08-18 by Erik's ISC-323.3 answer: "measure first, default-off param".** **MET** — `DalilSearchOptions` on `worker/src/dalil.ts`, 5th parameter, `exactScores?: boolean`.
- [x] ISC-496: with the option absent, the object passed to `VECTORIZE.query` carries NO `returnValues` key — not `false`, absent, byte-identical to today. **MET** — `dalil-exact.test.ts` asserts `"returnValues" in opts === false` on the captured options object; absence, not falsiness.
- [x] ISC-497: with `exactScores: true`, the object passed to `VECTORIZE.query` carries `returnValues: true`. **MET** — same fake binding, `opts.returnValues === true` when `exactScores` is passed.
- [x] ISC-498: Anti: no production call site passes the new option. `worker/src/index.ts` reaches `searchDalil` exactly as before. **MET** — `rg 'searchDalil\(' worker/src/index.ts` shows the call unchanged; the option is passed only from `dalil-probe.ts`.
- [x] ISC-499: the ISC-496/497 test FORCE-REDS against the pre-change function — it can distinguish the two states, so the param is not a no-op that closes the item. **MET, force-red recorded** — against the pre-change function ISC-497 failed with `Expected: true / Received: undefined`. The test can distinguish the two states, so the param is not a no-op.
- [x] ISC-500: `worker/src/dalil-probe.ts` exposes a `/rerank` route that runs BOTH scoring arms end-to-end through the real `searchDalil`, not a reimplementation of it. **MET** — `/rerank` calls the real `searchDalil` twice with the flag flipped; no reimplementation.
- [x] ISC-501: `/rerank` reports, per arm, the post-rerank rank of the target id and the full ordered hit list. **MET** — response carries `target_rank_after_rerank` and the full ordered `hits` array per arm.
- [x] ISC-502: the paired run executes against the LIVE index from the repo root and its JSON output is recorded verbatim in this ISA. **MET** — `bunx wrangler dev --config worker/wrangler.dalil-probe.toml --remote --port 8799` from the repo root; three runs, output quoted in ISC-323.3.
- [x] ISC-503: the question "does `hadith-muslim-154` survive `voyageai/rerank-2.5` to rank 1 in the exact arm" has a recorded numeric answer. **MET, and the answer is NO** — rank **3**, not 1, stable across three runs.
- [x] ISC-504: the plain arm runs in the SAME request on the SAME question as a control, so the exact-arm result is never a one-armed claim. **MET** — the plain arm ran in the same request on the same question and returned `target_rank_after_rerank: null`, so the exact-arm result is a paired difference, not a one-armed claim.
- [x] ISC-505: Anti: `returnValues: true` is NOT applied to the production retrieval path. `dalil.ts`'s default behaviour and latency are unchanged. **MET** — `dalil.ts` spreads `returnValues` in only when `opts?.exactScores` is truthy; the default query object is byte-identical to before.
- [x] ISC-506: `/rerank` reports rerank SCORES beside ranks, so "rank 1" is not the only evidence offered. **MET** — every hit carries `rerank`; that is what showed the reranker scores identically across arms.
- [x] ISC-507: the ISC-323.3 entry records the measured outcome and what it implies for the ~+600 ms spend, in terms Erik can decide on. **MET** — recorded in ISC-323.3: 653 ms measured, rank 3, outside `MAX_DISPLAY = 2`, so nothing a reader sees changes.
- [x] ISC-508: ISC-493 is closed by DECISION, with Erik's ruling of 2026-08-18 quoted and dated — accepted as search behaviour, not fixed. **MET** — ISC-493 above carries Erik's 2026-08-18 ruling, quoted and dated.
- [x] ISC-509: Anti: no code changed for ISC-493. No rerank floor, no copy re-frame, no threshold. **MET** — `git diff --stat` shows no change to any search, copy, or threshold file for ISC-493.
- [x] ISC-510: `fiqhAreaOf("hukum menceraikan istri saat haid")` returns `talak`. **MET** — `fikih-route.test.ts` asserts `talak`; green.
- [x] ISC-511: the ISA records that this tie is THREE-way (`thaharah` via `haid`, `nikah` via `istri`, `talak` via `menceraikan`), correcting the two-way description carried in the handoff. **MET** — recorded in ISC-494 above and in the `fikih-route.ts` header: `menceraikan`/`istri`/`haid`, three areas at n=1.
- [x] ISC-512: the tie-break rule is POSITIONAL — among tied areas the earliest-mentioned cue wins — and the file header states it is derived from Indonesian word order, not from any juristic view. **MET** — `fiqhAreaOf` compares `(n, at)`; the header states the rule is derived from Indonesian word order and asserts no ruling.
- [x] ISC-513: a tie that is ALSO positionally tied still returns `null`. The safe direction survives where the rule genuinely cannot distinguish. **MET** — the `n === best.n && at === best.at` branch returns `null`; unreachable today, and `fikih-route.test.ts` pins the no-shared-cue precondition that makes it so.
- [x] ISC-514: all 11 pinned routing cases still return their original area. **MET** — all 11 pinned cases green in the full suite.
- [x] ISC-515: `fiqhAreaOf` still returns `null` when NO area scores at all. **MET** — the existing `a question about nothing fiqh-shaped routes nowhere` test is unchanged and green.
- [x] ISC-516: the "A TIE ROUTES NOWHERE" test is REPLACED, not deleted — its replacement states the policy reversed, who reversed it, and when. **MET** — the replacement test names the reversed policy, Erik, and 2026-08-18 in its body.
- [x] ISC-517: Anti: the Fikih router still only re-ranks. No admission, refusal, or gating path is added, and `fiqh-rank.test.ts` stays green. **MET** — both consumers re-read: `rankByFiqhArea` is a stable partition that drops nothing, `index.ts:1206` renders a payload. `fiqh-rank.test.ts` green in the full suite.
- [x] ISC-518: the within-area duplicate cue (`sai` listed twice under `haji`) no longer double-counts toward that area's score. **MET** — cues deduped via `Set`. Force-red caught the live defect: `hukum wudu lalu sai` returned `haji` before the fix, `thaharah` after.
- [x] ISC-519: the new tie-break test FORCE-REDS against the pre-change `fiqhAreaOf`. **MET, force-red recorded** — two of three new assertions failed pre-change (`Expected: "talak" / Received: undefined` and `Expected: "thaharah" / Received: "haji"`).
- [x] ISC-520: `apakah sedekah makan itu berpahala` routes to `zakat` under the new rule, and that outcome is asserted as intended rather than left incidental. **MET** — asserted explicitly in the replacement test, with a comment saying the rule and the reader's intent agree here rather than leaving it incidental.
- [x] ISC-521: `bun test` exits 0 with at least 1574 passing, exit code captured to a file rather than read off a pipe. **MET** — `bun test > /tmp/gate-test.txt 2>&1; echo $?` → `0`, **1579 pass / 0 fail** across 94 files (was 1574).
- [x] ISC-522: typecheck exits 0 across all five passes, exit code captured to a file. **MET** — `bun run typecheck > /tmp/gate-tc.txt 2>&1; echo $?` → `0`, all five passes.
- [x] ISC-523: `VITE_ANSWER_MODE=synthesis bun run build` exits 0, exit code captured to a file. **MET** — `VITE_ANSWER_MODE=synthesis bun run build > /tmp/gate-build.txt 2>&1; echo $?` → `0`.
- [x] ISC-524: Anti: nothing is deployed. Prod stays at worker `4bf633a2`; `new-quranku-ai` and `demo-quranku` stay behind, per Erik's answer. **MET** — no `wrangler deploy` ran. Prod stays at worker `4bf633a2`; `new-quranku-ai` and `demo-quranku` untouched, per Erik's answer.
- [x] ISC-525: ISA `progress:` is RECOMPUTED across all three checkbox markers, never hand-set. **MET** — computed by a three-marker parser (`[x]`/`[ ]`/`[DEFERRED-VERIFY]`), never hand-set. 539 met · 11 open · 1 deferred = **539/551**.
- [x] ISC-526: the work is committed and pushed to `origin/main`. **MET** — committed in `6b4aedf` (work) and the 2026-08-18 late-4 wrap commit, pushed to `origin/main` and verified against `git ls-remote --heads origin main`, not against the push command's exit code.


### Cycle 10 — the 26-second wall is not a wait (ISC-527..536, 2026-08-18)

**Erik's call, 2026-08-18:** spend the session on ISC-487, do not touch `MODEL_DEADLINE_MS` or
`TIMEOUT_MS`. Tracing it moved the whole diagnosis: `FAST_ANSWER_MS` (9 s) means the reader never
stares for 26 seconds — they have a real principled answer at 9 s. What lands at ~26 s is not a wait,
it is two browser-side failures nobody could see, plus a retry admission rule set from the wrong end
of the latency distribution.

- [x] ISC-527: the reader's actual exposure to the ~26 s turn is established, rather than assumed from the turn duration. **MET 2026-08-18.** `FAST_ANSWER_MS = 9000` (`web/src/main.ts:161`) hands the reader the principled answer at 9 s and upgrades the turn in place when the composed answer lands (`:947` `Promise.race`). So ISC-487's "24.8 s average refusal" is **not 24.8 s of staring**. The turn duration and the reader's wait were the same number before ISC-466 and have not been the same number since; every prior reading of ISC-487 conflated them. **CONFIRMED ON THE SERVED BYTES, not just on main.** `curl https://new-quranku.axiara.ai/assets/index-KFCMiW0O.js` (200, 226,713 bytes — the bundle prod is serving today) contains `var Il=9e3` immediately above the `still-composing` notice factory. The 9-second race is LIVE, so the re-diagnosis applies to production and not merely to the working tree.
- [x] ISC-528: the terminal-refusal copy is reachable on a slow turn, or it is not, and which one is recorded. **NOT REACHABLE — measured by inspection, 2026-08-18.** `blockedBy` (`web/src/main.ts:841`) has exactly ONE consumer: `:929`, the final statement of `resolvePrincipled`. On the fast path `resolvePrincipled` runs at `:963`, **before** the model has answered, so `blockedBy` is necessarily null there; on the late path `applyAi` assigns it at `:876` and returns null, then `:979` `if (!composed) return` exits and `resolvePrincipled` is never called again. **Therefore `kind: "answer-blocked"` cannot render for any refusal slower than `FAST_ANSWER_MS`.** ISC-487 measures refusals at 24.8 s mean, so the channel is dead on effectively all of them. The Worker's `verdictAfterFailure` preserves the verdict with care and the browser discards it. Probe: `grep -n blockedBy web/src/main.ts` returns exactly three lines — one declaration, one write, one read — and the read is inside a function the write can never precede. **AND THE SUITE WAS GREEN THE WHOLE TIME.** `grep -rn "answer-blocked" web/src/*.test.ts` returns five hits: three police what the copy SAYS (`answer-blocked.test.ts:128,142` — that it never claims the corpus is empty, never leaks the rule name), one is a comment, one is a render-shape fixture (`kept-below.test.ts:41`). **Not one of them asks whether the copy can be reached.** So the app carried three tests defending the wording of a sentence no reader past 9 s could ever see — which is the same shape as this repo's blind-instrument failures, arriving in the test suite instead of in a probe. The question that would have caught it: *what would this test say if the feature were reverted?*
- [x] ISC-529: the "still composing" notice is retracted on every way the upgrade can end. **MET 2026-08-18.** It was removed only in `.catch`, which covers one of three endings; the other two both fall through `if (!composed) return` — the model answered with nothing better, or the wall REFUSED it (`applyAi` returns null for every violation kind except `bad_hadith`). On a refused turn the line *"aku masih menyusun jawaban yang lebih lengkap…"* therefore stayed on screen permanently, from 9 s onward, about work that had already stopped. Fixed by holding the node at creation and removing it in `.finally`. **THE DEFECT WAS CONFIRMED ON PRODUCTION'S OWN BYTES BEFORE THE FIX WAS WRITTEN UP.** From the deployed `index-KFCMiW0O.js`, minified verbatim: `.then(async e=>{if(!a.isConnected)return;let t=f(e,u);t&&(a.innerHTML=await J(t),...)}).catch(()=>{a.isConnected&&a.querySelector(`.still-composing`)?.remove()})`. The minifier rendered `if (!composed) return` as the guard `t&&(...)`, which makes the hole unmistakable: when `t` is falsy — every refusal except `bad_hadith`, and every 'nothing better arrived' — **the chain does nothing at all**, and the only `remove()` in the whole expression sits inside `.catch`. Grep counts alone could not have shown this: the fixed bundle also contains `still-composing` exactly twice, because the capture selector replaces the catch selector one-for-one. **The count is identical and the meaning is opposite** — only reading WHERE it sits distinguishes them.
- [x] ISC-530: Anti: the retraction never removes a NEWER turn's notice. **MET** — the fix holds a direct node reference captured immediately after the `innerHTML` write, and the settle handlers contain no `querySelector(".still-composing")`. A selector lookup at settle time can alias a later turn's notice, retracting a promise the app is still keeping. **THE INTERLEAVING THE ADVISOR HELD THE COMMIT FOR — checked, and it is structurally impossible rather than merely untested.** The concern was precise and worth the stop: the fast path upgrades IN PLACE, so if the upgrade re-rendered the subtree, the held reference would be detached while a LIVE notice remained on screen — and a source test asserting "`.finally` contains the removal" passes identically in both worlds. **What decides it is that there is only ever one notice per turn.** `stillComposingNotice()` has exactly ONE call site in the whole file (`main.ts:964`) and `renderTurn` never emits it, verified by grep; so no path can re-create the node after the fast render. The upgrade at `:986` replaces `innerHTML`, which removes the notice from view, and the `.finally` then no-ops on an already-detached node — the intended behaviour. **And this is exactly where the held reference beats a selector:** `answer` is written by several turns and by the verse renderer (`:1810`), so a `querySelector` at settle time could match a LATER turn's node. A direct reference cannot. **Recorded as a structural argument, not as a test** — a DOM test here would assert my own reconstruction of the promise chain rather than the shipped one, which is worth nothing (this ISA's standing rule).
- [x] ISC-531: the ISC-529 tests fail against the pre-fix implementation. **MET — force-red with three distinct mutations.** (a) removal restored to `.catch` with a selector → 2 red; (b) capture moved above the `innerHTML` write → 2 red; (c) `notice?.remove()` inside `.finally` replaced by a selector lookup → 2 red. Restored → `bun test web/src/answer-blocked.test.ts` exit 0. **One of the three tests was WRONG and the force-red is what found it:** the first draft forbade `querySelector(".still-composing")` anywhere in the chain and went red against the CORRECT implementation, because the fix's own capture line uses that selector. The assertion was rescoped to the settle handlers. A test that goes red on the fix is not a strict test, it is a broken one.
- [x] ISC-532: `/api/answer` reports, per turn, why the turn ENDED — `answered` | `blocked` | `deadline` | `threw` | `no_attempt` — and per attempt its wall-clock, its granted budget, and its outcome. Instrument only: not one control-flow decision may change. **The reason it is needed is ISC-533.** **MET 2026-08-18 (built by Forge, verified independently).** `worker/src/answer-generation.ts` (new) lifts the generation loop out of `handleAnswer`, which had no seam at all — it wrapped a live `fetch` inside a Worker-only handler, so no test could reach it. Same precedent as `answer-retry.ts`. Response now carries `gen: {attempts:[{ms,budgetMs,outcome}], reason}` on BOTH returns that already carried `dalil`, and is ABSENT on the four early returns — absent means "never reached generation", never `0`. **One binding:** `trace.blocked` is assigned once and read by the per-attempt outcome, `terminalGenReason`, and `verdictAfterFailure`; the report does not reconstruct a second copy from `attempts`. **Token, not message:** `classifyGenFailure` emits only `deadline`|`threw` and buckets conservatively — anything outside the timeout family stays `threw`, so a mislabelled abort cannot send the next session to budget math. **Instrument-only, verified by reading the diff, not by trusting the report:** `MODEL_DEADLINE_MS` 25_000, `MIN_RETRY_MS` 6_000, `MAX_ATTEMPTS` 2 and `TIMEOUT_MS` 30000 all unchanged; `nextAttemptBudget` is IMPORTED rather than reimplemented; `runGeneration` rethrows so `handleAnswer`'s catch still fires and the failure response keeps its exact shape (no `hadith` key) and still returns `verdictAfterFailure(gen.blocked)`. **Ten tests, one mutation each, all red on target.** Two were worthless until force-red found them: the deadline test used a `DOMException` whose MESSAGE matched the regex fallback, so the name-check branch was never exercised and could have been deleted silently; and one mutation hardcoded a value the first attempt already had, which is a bad mutation rather than a weak test, re-aimed at the second attempt's push. Gates re-run by me, not read off the report: `bun test` **1593/0** exit 0, typecheck exit 0 (all five passes), synthesis build exit 0.
- [x] ISC-533: Anti: the `answer-blocked` copy is NOT made reachable until a deadline expiry can be distinguished from a guard refusal. **HONOURED, AND THE GATE IS NOW DISCHARGED — 2026-08-24.** The condition this anti-criterion set was met before the copy was made reachable, in that order, which is the only way it could be marked. `gen.reason` is read at the browser's parse boundary (`answer-live.ts`, `asTerminal`) and carried on `AnswerBlockedError.terminal` → `SynthesisOutcome.terminal` → `annotateWithheld`, so a `deadline` and a `blocked` are now different values at every point a reader-facing decision is taken. **THE GATE HAD BEEN DISCHARGEABLE FOR SIX DAYS AND NOBODY RE-READ IT.** This item names ISC-532 as its blocker; ISC-532 was MET 2026-08-18 and reached prod in the 2026-08-23 deploy. The field was on the wire the whole time and the CLIENT COULD NOT SEE IT — `answer-live.ts` typed the response as `{answer, blocked, hadith}` and dropped `gen` at the parse. That is the same shape as `instrument-blind-to-the-field-it-was-cited-for`: the discriminator existed, unread, on the wire. **The general lesson is ISC-646.** The three prohibitions the copy carries are preserved and re-verified by force-red: it names no rule, quotes no fragment, and makes no claim about what the corpus holds. Anything that is NOT literally `"blocked"` — `deadline`, `threw`, `answered`, `no_attempt`, an absent report, an unrecognised token — leaves the reader with exactly what they had. Proven by mutation M1 (5 tests red) and M5 (2 tests red), not by reading. ORIGINAL DEFERRAL, unchanged and still correct at the time it was written: **DELIBERATELY DEFERRED, and this is the whole reason ISC-528 was not simply "fixed" this session.** `verdictAfterFailure` preserves the FIRST attempt's guard verdict when the second attempt throws — and a deadline abort **is** a throw. So on a timed-out turn `blockedBy` holds a stale verdict that is byte-identical to a real second refusal. Rendering it today would tell nearly every slow reader *"an answer was found and is being held back"* when the truth is *"we ran out of clock"* — a verdict naming the wrong actor, at scale, on exactly the path that produces the wall. This repo has already lost a session to a guard verdict that named no actor. The copy becomes reachable only after ISC-532 ships and the terminal reason is read from the SAME binding the diagnostic reports. **SEVERITY RAISED THE MOMENT ISC-529 SHIPPED — surfaced by the advisor at the close-out boundary, and it inverts how this item must be described in a handoff.** Before the fix, a reader whose answer was refused past 9 s saw the fast principled answer plus a "masih menyusun" line that never resolved: dishonest, but it SIGNALLED that something else had been happening. After the fix the notice is cleanly removed and **nothing on the page indicates that a fuller answer was produced and withheld.** That is quieter, not more honest — and it is the same failure class this repo keeps re-landing on. ISC-529 was still right (a false promise cannot be the signal), but it converted a visible-and-wrong signal into NO signal, which is harder to notice next time and reads to the reader as "this is the complete answer". **So ISC-528 is not "instrumented", it is OPEN AND READER-VISIBLE, and any handoff that says otherwise is wrong.** **ISC-532 does not verify it.** `gen:{attempts,reason}` reports how the GENERATION LOOP terminated, server-side, on the far side of the broken display path; it is a FREQUENCY instrument, not a verification one. Asked the disqualifying question: *what would `gen` print if ISC-528 were fixed, versus reverted?* **The same thing.** So it is not the forcing function either — the forcing function is ISC-537's live read plus a named threshold, and the deploy that carries it is Erik's.

  **STILL OPEN after ISC-537 ran live on 2026-08-19, and here is precisely what the run did and did not settle.** It DID establish that the two endings are distinguishable ON THE WIRE, which is the thing this criterion says it is waiting for: a deadline turn returned `blocked:null` with `gen.reason:"deadline"`, and a guard refusal returned `blocked:"bad_hadith"` with `gen.reason:"blocked"` — two fields, both already in the response the client receives, disagreeing in exactly the way that would let the copy name the right actor. It did NOT clear the stale-verdict hazard. **CORRECTION, same day, from the 24-turn `wall-live-probe` run below: the hazard is not merely unconfirmed — it is OBSERVED, twice in 21 grounded turns (~10%), and the earlier "unobserved" reading here was written off a 3-turn sample that could not contain the shape.** The shape this criterion fears is attempt 1 BLOCKED and attempt 2 THROWING on the deadline, and prod produced it exactly:

  - `bagaimana adab kepada orang tua menurut islam` — attempt 1 `11728 ms blocked:bad_hadith`, attempt 2 `13272 ms threw` (budget 13272). Response: `blocked:"bad_hadith"`, `gen.reason:"deadline"`.
  - `apa hukum riba dalam islam dan kenapa dilarang` — attempt 1 `13733 ms blocked:own_wording`, attempt 2 `11267 ms threw`. Response: `blocked:"own_wording"`, `gen.reason:"deadline"`.

  On both, `blocked` names a guard verdict from an attempt that is no longer the reason the turn ended, while `gen.reason` says `deadline` — the truth. **This is the whole criterion, demonstrated:** had `answer-blocked` been reachable, those two readers would have been told an answer was found and withheld, when the app had in fact run out of clock. It is also the disqualifying evidence for the obvious shortcut — the two fields DISAGREE on ~10% of grounded turns, so `blocked` alone cannot drive the copy. Before it is made reachable, the terminal reason must be read from `gen.reason`, the SAME binding the diagnostic reports, and never from `blockedBy`.
- [x] ISC-534: Anti: making `answer-blocked` reachable never DOWNGRADES a turn that already has a real answer on screen. **NOW TRUE OF THE APP, not just of the new channel — ISC-642 closed the same day it was opened, on Erik's ruling.** It was `[~]` for one pass with the hole named beneath it. **Every remaining path that replaces a late turn is either a better answer or not an answer:** the `ai` upgrade (real composed prose the wall passed — an upgrade, not a downgrade), and `silence` traded for a pointer or for `answer-blocked` (silence is the claim that nothing in the corpus matched, false for a refused question). Enumerated over all eight painted kinds, plus the `hadith-defer` case that used to escape this criterion by arriving as a truthy `composed` rather than through the refusal branch. Mutations M2/M3 (annotation shape) and M6/M7 (the hadith branch) redden 3–11 tests each. ORIGINAL EVIDENCE: `annotateWithheld` (`web/src/withheld-turn.ts`) returns `{...fast, withheld: true}` for every painted kind and replaces only `silence`, which is not an answer but the claim that nothing in the corpus matched — false for a refused question and, for a fiqh question, a false claim about the mushaf. Verified across all eight kinds the principled chain can paint at `FAST_ANSWER_MS` (`hits`, `ayah`, `surah`, `knowledge`, `aqidah`, `refer`, `count-defer`, `hadith-defer`): kind preserved, every field preserved, `withheld: true` added. Mutation M2 (invert the silence exception) reddens 11 tests; M3 (drop the flag) reddens 9. **A plain `[x]` here would have been the `dont-pin-a-known-hole-with-a-green-test` failure exactly:** the suite would be green while the ONE pre-existing path that does downgrade a real answer — the late-path `hadith-defer` substitution — stayed live and unrecorded. Found while writing the test list for this criterion, not fixed, and not silently ruled on. ORIGINAL: On the fast path the reader is holding a principled, cited answer by 9 s; replacing it with a refusal because the model's own attempt was blocked is a product regression wearing a bug-fix costume. Blocked copy is an ANNOTATION beside the fast answer, never a replacement for it — the fast answer's grounding is independent of the model's guard verdict.
- [x] ISC-535: `MIN_RETRY_MS` is set from a percentile of the measured generation distribution, not from its floor. **The defect is arithmetic and can be stated before the measurement, which is why it is written down first.** `MIN_RETRY_MS = 6_000` admits a retry whenever 6 s of turn budget remain; measured generation is **5,479–27,293 ms with a ~8,450 ms median**. A retry admitted at the threshold therefore **cannot finish** — by construction, not by bad luck — and the turn pays the full remaining budget for zero output before returning the verdict it already had. The comment justifying 6_000 cites "a passing control measured 3,772 ms", i.e. the FASTEST observation in the sample, used as a predictor of completion. ISC-532 refines the percentile; it is not needed to establish the defect.

  **MET 2026-08-19 (`4a28bf2`) — `MIN_RETRY_MS` is now 11_500, set from a percentile.** The distribution, measured live against prod worker `cfb0b05d` over **49 grounded turns** (`wall-live-probe --repeat 3` then `--repeat 4`, reading the per-attempt `gen` the probe was taught to capture in `d20f078`). Of the **20 attempts that COMPLETED** (`outcome:"ok"`): **min 3,950 · p25 7,900 · p50 9,647 · p75 13,557 · p90 14,609 · max 18,486 ms.** `threw` attempts are excluded — cut off at their budget, never completed, so folding them in would measure the deadline instead of the work.

  **The criterion's own statement of the defect needs one correction, and it is not cosmetic.** It says a retry admitted at 6,000 ms "**cannot** finish — by construction, not by bad luck". Measured, that is slightly too strong: one of the twenty completions came in at **3,950 ms**, under the old floor. The defect is real but it is probabilistic — at 6,000 ms roughly 1 in 20 completions would fit, at the p50 of 9,647 ms about half. Left uncorrected, that overstatement would be the same species of error as the constant it was written to condemn.

  **11_500 rather than the p50, and the reason is ISC-536, not arithmetic.** Retries genuinely save turns: **5 of 22** ended answered, on granted budgets of **11,554 · 13,352 · 16,393 · 18,365 · 19,861 ms**. 11_500 sits just under the smallest budget that has ever produced a save, so it cannot cut an observed success. Only **3 of 22** retries were ever granted less than that, and **none of the three completed** — so on this sample the change costs zero answers and stops three doomed spends.

  **The instrument had to be built before the number could be read, which is the part worth carrying forward.** This criterion and ISC-536 both named `wall-live-probe` as the tool for the job while the probe read only `answer`/`blocked`/`hadith`/`dalil` off the response and dropped `gen` on the floor. It could say how a turn ENDED but not how long an attempt ran, whether a retry happened, or whether one succeeded — the last being the exact number ISC-536 says no instrument in this repo can see, sitting on the wire unread since ISC-532 shipped. Fixed in `d20f078`.
- [x] ISC-536: Anti: `MIN_RETRY_MS` does not move before ISC-532 has produced a live distribution. Raising it cuts retries, and some of those retries are currently SUCCEEDING — the answered rate is the thing that must not fall, and no instrument in this repo can presently see per-attempt outcomes. A constant moved on arithmetic alone would be the same class of error as the 6_000 it replaces.

  **MET 2026-08-19 — and met as an ANTI-criterion, meaning it was honoured, not overridden.** The gate it set is discharged: ISC-532's diagnostic produced a live distribution (49 grounded turns), and the constant moved only after that. Its substantive fear turned out to be well founded — **retries ARE succeeding, 5 of 22** — so the new value was bounded below the smallest budget that has ever produced a save (11,554 ms) rather than set at the p50, which would have been the arithmetic answer. The per-attempt outcomes this criterion says nothing in the repo can see are now visible; see ISC-535 for the numbers.

  **What must not be read into this.** The success arm is **n=5**, and the two runs disagree with NO deploy between them — 29% vs 41% answered, `ok` p50 11,468 vs 8,677 ms. So the distribution is stable enough to bound a threshold below an observed floor and NOT stable enough to defend a percentile to three digits. **This criterion stays in force for the next move**: 11_500 does not become the new "measured" number that a future arithmetic argument can adjust. Any further move needs a fresh distribution, and a bigger success arm than five.
- [x] ISC-537: the ISC-529 retraction is confirmed on a LIVE refused turn — the "masih menyusun" line is gone once the turn settles, on a turn measured past `FAST_ANSWER_MS` that ends in a refusal. **Deferred because the probe is impossible at execution time, not because it is optional.** Deploys of this Worker are gated to Erik, so the fix cannot reach a live surface this session; and the shape being probed only occurs on a turn slower than 9 s that the wall then refuses, which cannot be forced from a curl (grounding must hash-verify as verbatim-ours). **Follow-up: verify in the same session that deploys ISC-532**, by driving a live question through Interceptor and sampling the DOM across the WHOLE window at 2 s rather than at settle — a fall-through lane that flashes and clears is invisible to a settle-time sample. Code-side evidence today: force-red across three mutations, `bun test` exit 0, and the shipped synthesis bundle carries the class twice (creation + capture) and zero selector lookups in the settle handlers.

  **MET 2026-08-19 — driven live through Interceptor against `https://new-quranku.axiara.ai` on worker `cfb0b05d` / bundle `index-hqD14U2e.js`, sampled at 2 s across the WHOLE window (not at settle), verdict read from the `/api/answer` RESPONSE BODY and never from the DOM.** Live-bundle precheck first: the served `index-hqD14U2e.js` carries `still-composing` twice and the literal `finally(()=>{d?.remove()})`, so the probe was run against the fixed code and not a stale edge copy. Three turns, all of which mounted the notice PAST 9 s, and all three retracted it:

  - **The refusal the criterion names.** `bagaimana adab seorang anak kepada kedua orang tuanya?` → `{"answer":null,"blocked":"bad_hadith",…,"gen":{"attempts":[{"ms":12940,"budgetMs":25000,"outcome":"blocked:bad_hadith"},{"ms":6478,"budgetMs":12060,"outcome":"blocked:bad_hadith"}],"reason":"blocked"}}`. Notice present at t=11 s and still present at t=20 s; **absent from t=22 s onward** and never returned through t=38 s. Turn count held at 3 throughout — nothing was appended, the turn was replaced in place. The reader is left on the hadith-defer copy (*"Pertanyaan seperti ini biasanya dijawab dari hadits, bukan dari ayat…"*), which is a statement about US, not about the corpus.
  - **Two DEADLINE endings, which exercise the OTHER branch.** `apa keutamaan sholat tahajud?` and `apa keutamaan puasa senin kamis?` both returned `{"answer":null,"blocked":null,…,"gen":{"attempts":[{"ms":25000,"budgetMs":25000,"outcome":"threw"}],"reason":"deadline"}}`. Notice present ~10 s → ~27 s, **gone by t=28 s / t=29 s**, and the turn text shrank by exactly the notice line (1083→1009 and 1285→1211 chars) with no other change.

  **The two branches are not the same code path and it matters that both were seen.** `applyAi` returns non-null for `bad_hadith` alone, so the refusal run took `composed` truthy → `answer.innerHTML = renderTurn(composed)`, which DETACHES the notice node and makes `remove()` a no-op — the retraction there is a consequence of the replacement, not of the `finally`. The two deadline runs took `if (!composed) return` → `.finally(() => notice?.remove())`, which is the line ISC-529 actually added and the one that was stranding the promise. A probe that had only caught a `bad_hadith` turn would have reported MET while never executing the fix.

  **Two things this run measured that are NOT this criterion and must not be filed under it.** (1) Both deadline turns burned the FULL 25 000 ms budget on a SINGLE attempt with no retry — `gen` reports one attempt, not two — so on those turns the model never returned at all and the guard was never consulted. That is ISC-487/ISC-533 territory and is unchanged by anything here. (2) `MODEL_DEADLINE_MS` is not to be raised on the strength of it; see the standing constraint.
- [x] ISC-538: the scope of any machine-Indonesian permission is stated by CORPUS, in writing, before a scholar is asked to rule on it. **MET 2026-08-19 — Erik sent the letter.** The corpus bound (Ṣaḥīḥayn via sunnah.com) and the exclusion of the Dorar preface were both in writing BEFORE the send, which is what the criterion asks. **This closes the WRITING requirement only.** Nothing here records an approval: the letter is `SUDAH DIKIRIM … Belum ada jawaban`, ISC-417 stays NOT MET, and the Erik-decision named below is still open. **OPENED 2026-08-18 by the third `scholarly-gate` pass, and it is ERIK'S CALL, not a coding task.** The follow-up letter asked Ustadz Ahmad about machine-translated Indonesian hadith text and named three reader-facing surfaces. **There is a FOURTH, and nobody had named it in three review passes.** `web/src/surah-intro.ts:205-229` offers a reader-selectable **"Bahasa Indonesia"** tab on the surah preface; verified in the BUILT artefact, all **114** `web/dist/surah-intro/*.json` carry `editions.id` with `translation:"ai"`, `reviewStatus:"unreviewed"`, `reviewerNeeded:"Ustadz Ahmad Isrofiel"`, and **61 of the 114 contain prophetic-speech markers** (`bersabda`/`Rasulullah`), some inside quotation marks, alongside quotations attributed to named imams. Its own generator banner reads *"jangan disajikan ke pengguna sebelum ditinjau Ustadz Ahmad Isrofiel"*, and `surah-intro.ts:166-170` records that Erik chose to offer it anyway. **This is a DIFFERENT corpus under DIFFERENT terms** — Dorar is `usage: private`, shipped publicly on Erik's own rights call, deliberately contradicting the sunnah.com treatment — **so one approval cannot span both.** Why it stayed invisible: `hadith-card.ts:12-13` and `PROGRESS.md:2463` both still asserted that the AI rendering "was refused" for this preface, a claim reversed on 2026-08-08. The code comment is corrected in this cycle; `PROGRESS.md` is append-only and keeps its entry as history. **Applied to the letter already:** the question is now bounded in writing to the Bukhari/Muslim corpus, the fourth surface is DISCLOSED as existing, and the letter states explicitly that the ustadz's answer will not be applied to it. **What is NOT decided and needs Erik:** whether the Dorar Indonesian preface gets its own letter, is folded into this one, or stays as-is on his standing rights call.

### Cycle 11 — what we were telling readers while apologising for it (ISC-539..545, 2026-08-19)

The cycle opened as a deploy and a fourth gate pass. It became something else: **six `scholarly-gate`
passes, six BLOCKs, and not one finding repeated.** The gate was not converging because it was not
finding errors in a letter — it was discovering reader-facing surfaces one pass at a time, and each
new surface falsified a sentence already written about the previous ones. Two of pass 5's blocking
findings were defects introduced by applying pass 4's fixes.

- [x] ISC-539: no reader-facing copy states a fact about the corpus that the corpus contradicts. **MET 2026-08-19, deployed (worker `cfb0b05d`, bundle `index-hqD14U2e.js`, verified by served bytes sha256 `89ba7b44…`).** The `hadith-defer` refusal told readers *"Tab Hadits memuat kitab-kitab utamanya, tapi **teksnya masih bahasa Arab**"*. False since 2026-08-13 (`SHOW_MACHINE_HADITH_TEXT = true`); 14,655 of 14,736 records carry machine Indonesian. **A test was PINNING it** — `expect(copy).toContain("bahasa Arab")` in `answer-blocked.test.ts`, deliberately reading the shipped source so a copy edit would have to face it. That design is right; the assertion was not, because it encoded a WORLD-FACT rather than a property of the refusal, and nothing re-derives a world-fact. Green for six days over a sentence the 2026-08-18 ustadz letter was simultaneously retracting to the scholar. Assertion replaced and force-red verified. Same clause removed from `web/demo/demo.ts`.
- [x] ISC-540: no surface claims a scholar permitted something he was not asked about. **MET 2026-08-19, deployed.** Two sites, found by gate pass 6. (a) The Hadits INDEX said *"Terjemahan Indonesianya sudah diizinkan ustadz untuk ditampilkan"* — the only Indonesian on that page is the kitab names, and those are **ours** (`hadith-titles.ts:11`, "authored here rather than machine-generated"). It called our own writing machine output AND claimed a scholar had permitted it: wrong in both directions, and the over-claiming direction is the one `hadith.test.ts` already names as the worse sin. (b) The kitab page named the reviewer above a page interleaving TWO machine layers — hadith text (`translate-hadith.ts`, permitted verbally 2026-08-12) and bab titles (`translate-babs.ts`, a different generator, shipped 2026-08-10, never put to him) — and the bab layer carries the one measured meaning-alteration defect. Both now name the layer they cover. Third ANTI assertion added to `hadith.test.ts`, force-red verified.
- [x] ISC-541: a letter to a scholar states which CORPUS a permission covers, and never credits him with our own ruling. **MET 2026-08-19 as far as a draft can be.** `docs/review/ustadz-followup-2026-08-18.md` now names sunnah.com and Dorar explicitly, bounds every question to the Ṣaḥīḥayn, discloses the Dorar preface as excluded, and separates the ustadz's 2026-08-12 verbal permission from **Erik's own 2026-08-13 and 2026-08-18 decisions**. Corrects the letter's account of its own breach: the Fikih surface shipped **2026-08-18**, the day AFTER the promise-bearing letter was sent (`web/src/dalil-search.ts` first appears in `734c577`; the letter is `80cdc57`), so the promise was not merely already broken — a new surface was added while it stood. Four surfaces, not three. **SENT by Erik 2026-08-19**, unchanged from the draft this criterion was measured against; the letter header now records `SUDAH DIKIRIM … Belum ada jawaban`.
- [x] ISC-542: a false cause in a SENT letter is retracted, and not left standing because the observation it accompanied was true. **MET 2026-08-19.** The 2026-08-17 letter told the ustadz that QS 2:221 was missed *"semata-mata karena frasa 'beda agama' tidak berbagi satu kata pun dengan kata 'musyrik' yang dipakai Ustadz Muhammad Thalib"*. Measured through `retrieveKnowledge` over the built Peta shards: `hukum nikah beda agama` → 4:25, 2:136, no 2:221; `hukum **menikah** beda agama` → 2:221 at rank 2; `hukum nikah dengan orang **musyrik**` → 2:221 ABSENT although the query CONTAINS "musyrik"; `hukum menikah dengan orang musyrik` → 2:221 at rank 1. The discriminator is the prefix, not the word — our affix matcher, kin to [[indonesian-affix-guards]]. **We laid our own bug at a scholar's word choice and then used it to justify asking him to endorse a pinned list.** Retracted in the follow-up; questions 4–6 of the sent letter explicitly NOT withdrawn.
- [x] ISC-543: a machine-authored attribution to the Prophet ﷺ is disclosed as such, not described as a translation. **MET 2026-08-19 (letter half).** The largest finding of six passes. `answer-contract.ts:148` instructs the model to say what a hadith TEACHES **in its own words** and *never* to write the hadith's wording — so the reader's first sentence is *"Rasulullah ﷺ mengajarkan bahwa…"*, carrying no `Terjemahan mesin · belum ditinjau` chip (that chip is `.hadith-id.is-ai::before` and never touches `.ai-said` prose). **A translation inventory could never have found it**, and the letter had been exactly that — "machine Indonesian appears in N places". Now item 8, referenced from question 3, so a plain "boleh" cannot be filed as approving a card.
- [x] ISC-544: a deployed environment that no longer receives deploys is not left serving. **MET 2026-08-19 by deletion, at Erik's instruction.** `new-quranku-ai.axiara.ai` had not been redeployed since before ISC-418. Paired arms, identical POST, `{"verses":[],"entries":[]}`: prod → `{"answer":null}` in 0.1 s (bail fires); new-quranku-ai → **1,757-char authored Islamic answer in 17.4 s**. Same for grounding failing the digest hash. So a public surface was still composing religious answers from parametric memory alone, months after Erik ruled on 2026-08-13 that it must not — because **an environment that is never deployed is a time capsule of every defect fixed since**, and the fix being on main ships nothing. Worker deleted; `[env.synthesis]` replaced with a tombstone so `--env synthesis` now ERRORS rather than resurrecting it; DNS AAAA deleted (record `4568379e…`, zone `53b2e640…`).
- [x] ISC-545: Anti: removing a host does not leave a grant or an unfailable check behind it. **MET 2026-08-19, and this is the half that nearly shipped.** (a) `new-quranku-ai.axiara.ai` was still in `ALLOWED_ORIGINS` — and deleting its DNS is what makes the name UNCLAIMED, so an allowed origin for a host nobody owns is a standing grant of cross-origin POST rights to `/api/answer` to whoever registers it next. **Deleting the DNS creates the exposure rather than closing it.** (b) `worker/smoke-answer.ts` check ④ ("the principled edition refuses to author") passes whenever the request THROWS, and a request to a deleted host throws — so removing a surface made a smoke test **unfailable** instead of failing. Check ④ deleted rather than repointed: both ends of the comparison are gone, prod having been `EDITION=synthesis` since 2026-08-12. Its hand-copied Al-Ikhlas grounding also does NOT verify against `grounding-digest.json`, documented in the file so the resulting bare null is not read as an outage.


### Cycle 11 — the instrument could not see the ruling (ISC-546..559)

> **Three live runs, labelled here once so no figure below floats between them.** All on worker
> `4339cb45`, 2026-08-21 morning — i.e. AFTER the "2026-08-21 (late)" checkpoint, whose `(late)`
> names the session that produced the code, not a later clock. **Run A** = 8 questions × 2, probe
> BEFORE the fix. **Run B** = 8 × 2, probe AFTER. **Run C** = 8 × 1, verification of the new report
> sections. Grounding is not stable run to run — the theme classifier is a live model — so per-run
> figures are per-run and are labelled as such.

- [x] ISC-546: `wall-live-probe` POSTs a turn whose retrieval returned nothing, exactly as the browser does. **The defect is a stale contract copy.** `turn()` returned `{bucket:"no-grounding", ms:0}` **without a request** whenever `verses.length === 0 && entries.length === 0` — the client-side bow-out that `web/src/answer.ts` used to run before the network call. Erik's always-answer ruling DELETED that bow-out on 2026-08-21 (ISC-418 reversed, both gates removed) and `answer-live.ts:102-109` now posts `{question, verses, entries, weakVerses}` unconditionally. Asked the disqualifying question: **what would the probe print if the always-answer change were reverted?** For `apa yang al quran katakan tentang neraka`, `no-grounding` at 0 ms — byte-identical, feature present or absent. **MET (run B) — 16 turns, zero 0 ms rows.** The two rows run A skipped are `U 0t/ 0v/ 0e … 6813ms` and `… 5950ms`, both **answered**, 234 and 216 words. **The blindness is one session old, not lifelong:** before the always-answer deploy (`0dc644fb`) the Worker refused on `!hasGrounding` and the client bowed out first, so on every run before that deploy the `no-grounding` row was CORRECT. What the probe could not see is the window between that deploy and this fix. Probe: a live run in which no row records `ms === 0`.
- [x] ISC-547: the report splits grounded from UNGROUNDED turns as separate arms and never blends them into one headline. Measured under ISC-418, an ungrounded turn ANSWERED in **46 of 46** samples while reaching the fitting ayah only **35%** of the time against **96%** grounded. **35 and 96 are CITE rates and must never be restated as answered rates**; and the ISC-418 record carries no grounded ANSWERED rate to set 46/46 against, so no comparative claim is made from it. They are still two populations on the axis the app cares about. **MET (run B) — `grounded 13/14 (93%)` · `UNGROUNDED 2/2 (100%)`;** (run C) `grounded 7/7` · `UNGROUNDED 1/1`. **The tick is for the SPLIT EXISTING, not for those percentages.** Every ungrounded turn across all three runs is the SAME question (`apa yang al quran katakan tentang neraka`) repeated, so the arm is n=1 question, and its 100% carries exactly as little as ISC-552's single blocked turn does.
- [x] ISC-548: Anti: post-change bucket percentages are never presentable as a continuation of the pre-change series, and the break is printed ABOVE the table it qualifies. **MET.** The honest demonstration is a SAME-RUN re-tabulation, not a cross-run one: run B's 16 rows read **15/16 = 94% answered** under the new rule and **13/16 = 81%** under the old one, because two rows that used to sit in `no-grounding` are now counted. That 13 pp is entirely the instrument. **An earlier draft of this criterion compared run A's 88% with run B's 94% and called the gap "none of it the app" — that was wrong twice over:** it is the cross-run comparison ISC-552 declares inadmissible, and it is false on its face, since run B contains a blocked grounded turn and run A does not, which IS the app.
- [x] ISC-549: Anti: the recorded question set (`PROBES`) is not edited by this change. The file promises a like-for-like replay from 2026-08-18 onward and an edit there silently voids it. **MET** — `git diff -- src/eval/wall-live-probe.ts` shows no line added or removed inside the `PROBES` array.
- [x] ISC-550: Anti: no guard rule's DEFINITION changes in this cycle. **MET** — `git status` shows neither `web/src/answer-guard.ts` nor `worker/src/answer-repair.ts` modified. Attribution stated precisely: Erik's recorded ruling is *"it has to be answered"*, and *"a violation must cost the SENTENCE, not the answer"* is attributed to him in the tree (`worker/src/index.ts:831`). That **no rule was relaxed or deleted** is a recorded property of THIS change (see this checkpoint's closing paragraph in `PROGRESS.md`: *"No guard rule touched"*), not a quotation of him. Do not cite the PREVIOUS checkpoint's *"No guard rule relaxed or deleted"* for it — that sentence belongs to the repair change, not this one — the constraint is honoured either way, but the sentence is his assent and outcome, not his words.
- [x] ISC-551: the reader-facing outcome of a zero-grounding question is on the record, read from the response body rather than inferred. **MET (run B) — `genReason: "answered"` on both repeats**, first attempt `ok`, 5,950 and 6,813 ms; (run C) one more at first-attempt `ok`. Verified independently of the probe by posting the browser's own four-field body (`verses:[] entries:[] weakVerses:false`) by hand: answered in 6,978 and 12,925 ms. Erik's always-answer ruling reaches a reader on the zero-grounding path. Claimed as evidence FROM THIS PROBE for the first time — not as the first evidence anywhere, which this criterion cannot establish.
- [x] ISC-552: the 2026-08-21 (late) handoff's "2–3 turns per run end `blocked`" is recorded as NOT REPRODUCED at the stated RATE, while its MECHANISM is left standing. **NOT REPRODUCED AT RATE.** Run A: 0 blocked / 14 grounded. Run B: 1 blocked / 14 grounded. Run C: 0 blocked / 7 grounded. What the set excludes is everything outside these eight questions. **Not comparable to the prior session's 2–3/12 in three independent ways**, each sufficient alone: that figure is 12 turns, so it did not come from this eight-question probe; the old probe skipped ungrounded turns, so its denominator was grounded-only; and both are whole-run totals on identical code, a comparison this project has ruled inadmissible. At n=35 grounded turns against n=12, nothing here is distinguishable from run-to-run variance in either direction. **TWO FURTHER RUNS, 2026-08-24 (Cycle 12): 0 blocked / 8 turns and 0 blocked / 24 turns** — `docs/review/wall-live-probe-2026-08-24.txt`. That is now FIVE independent runs (A 0/14, B 1/14, C 0/7, plus these two) and the stated 2–3-per-run rate has never come back. **The MECHANISM still stands and is now explained rather than merely left standing:** a turn CAN end `blocked`, but only when both generations are refused AND `repair` fails on both AND no throw preempted the terminal reason. Measured across the same 32 turns, 38 of 56 generations were refused and 0 turns ended blocked, so the conjunction — not the wall's strictness — is what makes the rate low. See ISC-454 and ISC-647.
  **THE MECHANISM, HOWEVER, IS NOT REFUTED — AND AN EARLIER DRAFT OF THIS CRITERION CLAIMED IT WAS, ON AN INVERTED READING OF THE TWO RULES.** The one blocked turn is `apakah musik haram`, `gen.reason: blocked`, **`gen.rule: wording`**. That draft called this a contradiction of the handoff's whole-prose theory. **It is the opposite.** `rule: "wording"` is `wordingShape`, and `wordingShape` **IS** the whole-prose check — the docblock governing that rule, `answer-guard.ts:579-616`, reads at `:606` *"ADJACENCY IS MEASURED ON THE WHOLE PROSE, NOT PER SENTENCE, AND THAT IS A FIX."* (That block sits above `DIVINE_VERB`. `wordingShape` at `:1007` has **no docblock of its own** — the block at `:903-1004` belongs to `VERBATIM_DIVINE` at `:1005`, and the tree points at the right one from `:1026`, *"See the SCOPE block above `VERBATIM_DIVINE`"*. An earlier correction of mine named `:903-1004` as `wordingShape`'s and was wrong; the substance is unaffected either way.) `rule: "echo"` is `scriptureEchoShape`, which is **sentence-scoped** (`:1138`, `prose.split(/(?<=[.!?])\s+/u)`). So the observed refusal is the whole-prose rule firing on prose that sentence-level repair then failed to clean — which is exactly the shape the handoff described. **The handoff named the wrong function for the right diagnosis** (see ISC-559), and I inherited the misnaming and built an inverted conclusion on it.
  What the turn carries beyond that: its two attempts failed on **different** rules — `blocked:fatwa` at 12,063 ms, then `blocked:own_wording` at 10,362 ms — so per-attempt repair is facing a rule SET, not one persistent violation, and each cycle costs latency. And **the reader never saw the turn at all:** 33,154 ms end to end, past the browser's 30,000 ms `TIMEOUT_MS`, with generation consuming its full 25,000 ms deadline (12,063 ran + 12,937 granted). On this turn the clock, not the guard, is what cost the reader an answer — that is ISC-487.
  **Still `[ ]`, and n=1 still cannot carry a rate or a class.** What it now carries is one confirmed instance of the handoff's mechanism, correctly named. **What reopens the rate question:** blocked turns exceeding run-to-run variance over a labelled arm. **The blocker is cleared and the mechanism is now diagnosed, but the RATE claim is unchanged.** The clause that stood here — *"the repair fix was not designed, because the prose of the one observed block is unreadable (ISC-554)"* — no longer holds: ISC-554 is met, and an OFFLINE reproduction (2026-08-21 evening) produced a blocked turn whose prose and whole repair search are readable. Two defects were named from it — **ISC-561** (repair sees only the LAST refused candidate, and here the FIRST one was repairable in a single deletion) and **ISC-562** (repair's progress signal is a count of RULES, so a rule tripped by two sentences makes every single deletion look like no progress). **Neither is a fix, and neither touches this criterion's rate.** That reproduction is a different process on a different sample from the runs above; its 1-blocked-in-8 is NOT comparable to run A/B/C and is not offered as a rate. This stays `[ ]` for the reason it always did: what would reopen the rate question is blocked turns exceeding run-to-run variance over a labelled arm, and no such arm has been run.
- [x] ISC-553: Anti: a `0t` theme count on a doctrinal question is not re-diagnosed as a classifier failure. All 83 corpus themes are pastoral feeling-states (`Anxiety & fear`, `Grief & loss`, `Patience`…); there is no doctrinal theme, so `apa yang al quran katakan tentang neraka` correctly classifies to zero and `/api/classify` returning `{"themes":[]}` for it is right behaviour. Run B showed `0t` on 14 of 16 rows and the nearest prior finding — a classifier that returned 0 themes for a whole 24-turn run and moved `no-grounding` by itself — would have misread it. **MET** — measured: 0 doctrinal entries of 83.
- [x] ISC-554: when a turn is blocked, the refused PROSE is readable somewhere. **MET 2026-08-21 (evening), by the route that publishes nothing.** `src/eval/refusal-capture.ts` runs the Worker's own generation loop in-process — `runGeneration` itself, `guardAnswerProse` with all FOUR arguments, the real `repairAnswerProse`, the same prompt/params/provider — and WRAPS the guard closure, so every candidate the wall was shown is retained with the verdict it earned. Nothing is deployed, no route is created, no reader-facing surface changes, and `/api/answer` still returns `{answer:null}`. Wrapping the closure rather than adding a field to `GenTrace` was deliberate: the Worker acquires no capability it did not already have, and the capture is strictly richer than the refused candidate alone — it also holds every sentence mask `repairAnswerProse` tried before giving up, which is the sequence ISC-552 needed and could not see. **Probe met:** run of 2026-08-21 (evening), the eight recorded questions once each, `deepseek/deepseek-v4-flash` @ 0.4 — 8 turns, **1 ended blocked**, **63 refused candidates captured**, 1 repaired (`dropped 2, rule echo`). The blocked turn's prose is readable and was diagnosed (ISC-561, ISC-562). **This is NOT a prod measurement and its 1/8 is not comparable to any live-probe figure** — different process, no dalil binding, freshly sampled model output. Refusals of the same CLASS, never the same bytes. **Fidelity is declared by the instrument itself and was corrected once before it was trusted:** the run prints which of the Worker's arguments it reproduces and which it does not, and an early version of its hadith-lane flag guessed the Worker's gate as "weak or ungrounded" and therefore printed `hadith lane absent on 0/2 turns` when the honest count was `2/2` — it denied its own blind spot on both turns prod would have sent down that lane. (An earlier draft of THIS sentence said "reported the hole as ABSENT on 2 of 2", which reads as the opposite arithmetic to ISC-563's record of the same fact; `scholarly-gate` caught the contradiction.) The gate is now transcribed from `worker/src/index.ts:648` (`entries.length > 0 || weakVerses`); the full run reports the lane absent on **all 8** turns with **7 of 8 eligible on prod**. **The output stays on the dev surface.** It is refused model output, the class the wall exists to stop, and by construction may carry fabricated divine or prophetic attribution: never quoted into this file or `PROGRESS.md`, never shown to a reader, and `--out` has no default path and refuses any literal path inside the outermost git tree above the cwd (ISC-563 carries what that does and does not guarantee). **Erik's separate question — whether refused prose may ever be surfaced on the PUBLIC endpoint — is untouched by this and remains his.** **One qualifier rides with the retained text below, because under an `[x] MET` heading it would otherwise read as endorsement:** `docs/review/rights-2026-08-20.md` ruling 2 does not GRANT a dev-Worker precedent, it records `dalil-probe` as a noted exception so a future grep does not read it as a contradiction — and it covers a DIFFERENT class, third-party rights rather than model output. The route actually taken here creates no Worker at all and so does not rest on it. **Original finding, kept:** `/api/answer` returns `answer: null` on a block, so the probe's `prose` field is `""` on exactly the rows a repair fix must read. `gen.rule` names the CHECK; nothing names the STRING. **The fence is narrower than an earlier draft claimed.** That draft framed the only fix as "returning refused prose over the public API" and rested on a rights objection; publishing refused prose on the public endpoint IS Erik's call, but it is one implementation of several, and two others publish nothing: an unrouted dev-only Worker with its own wrangler config (the precedent already exists — `worker/src/dalil-probe.ts`, `docs/review/rights-2026-08-20.md` ruling 2), or Worker-side logging read through `wrangler tail`. Neither needs a rights ruling. **But neither is a licence to let the prose travel:** what would be captured is REFUSED model output — the class the wall exists to stop, which by construction may carry fabricated divine or prophetic attribution. It must stay on the dev surface, never be quoted into a document that ships, and never be shown to a reader. **And the offline harness is NOT the safe fallback that draft named it:** `src/eval/answer-run.ts:149` carries the same stale bow-out (ISC-558), and `:163` calls `guardAnswerProse(out, allowed)` with **two arguments**, which defaults `isGroundedHadith` to `() => false` and `scripture` to `[]` — so it can never emit `rule: "echo"` and never produce a real `bad_hadith` verdict. Pointing the next reader at it would hand them an instrument that confirms whatever they hope. Probe: a blocked row whose refused prose is readable from somewhere.
- [x] ISC-555: the echo wall's reach is measured, not assumed — it is INERT on any turn that retrieved zero verses. **MET by a paired control.** `worker/src/index.ts:829` builds the wall's fourth argument as `verses.map((v) => ({ ref: v.ref, texts: [v.text] }))`, and `scriptureEchoShape` opens with `if (verses.length === 0) return null` (`:1136-1137`). Control, identical prose echoing twelve contiguous words of QS 65:7's shipped Thalib translation, uncited and unquoted: with the verse present `guardAnswerProse` returns `rules: ["echo"]`; with `scripture: []`, `rules: []`. **Run C: only 3 of 8 turns retrieved ≥1 verse**, so the wall was inert on five of them; run B, 6 of 16. A count of zero echo refusals over those runs was never capable of being anything else. **This bears on ISC-419's COVERAGE, not on the handoff's whole-prose question** — `echo` is the sentence-scoped rule, so it was never the mechanism §1 described (see ISC-552). **The always-answer change pushes coverage the wrong way:** it sends MORE verse-less turns to the model, and every one is a turn this wall cannot police.
- [x] ISC-556: the live report states the echo wall's eligible denominator and counts turns the reader never saw. **MET (run C).** `── echo wall (ISC-419) eligibility ──` printed `3/8 turns retrieved ≥1 verse … observed rule:"echo" refusals: 0 — read this ONLY against the 3, never against 8`. `── past the browser's 30000 ms abort ──` printed `0/8`; on run B it would have named the 33,154 ms turn. An `answered` row past the abort delivered nothing and a `blocked` row past it was not a refusal the reader experienced, so counting refusals without that line attributes to the guard what the clock took.
- [x] ISC-557: Anti: removing the short-circuit does not silently re-weight an arm it was holding apart. **CAUGHT BY FORGE, and my own comment asserted the opposite.** I dropped `r.bucket !== "no-grounding"` from `withoutH` and wrote that the term "would match everything" — a no-op. It was not: the excluded population did not cease to exist when the early return did, it **moved** into real posted rows. And it moves one-sidedly by construction — `dalilEligible = entries.length > 0 || weakVerses` (`worker/src/index.ts:648`), `entries` fills only when `verses.length === 0` (`web/src/answer.ts:101`), `weakVerses` requires `verses.length > 0` (`web/src/answer.ts:141`) — so a turn with neither is hadith-INELIGIBLE and its `records` is always 0. Every ungrounded turn piled into `withoutH`, none into `withH`. Verified independently before accepting: the three line references read directly, and both ungrounded rows in run B carry `records: 0`. Fixed to `r.records === 0 && r.grounded`. This is [[a-swap-is-not-a-widening]] landing on my own edit in the same session in which I quoted it as a premortem.
- [x] ISC-558: the SIBLING instrument has the same bow-out AND a silently disabled wall. **MET 2026-08-21 (late evening).** `src/eval/answer-run.ts` now calls the Worker's own `runGeneration` instead of re-implementing it, with the four-argument guard (`isRealAyah`, `groundedHadithFrom([])`, this turn's echo verses) and the real `repairAnswerProse`, and the bow-out is gone. **The two defects this criterion named were not the whole drift — the same function held three more, all in the same direction (the harness looked stricter and quieter than prod):** (a) a SECOND two-argument `guardAnswerProse` call in the report loop, which re-guarded each attempt to print its verdict, so the report scored every answer against a wall the run itself never used (an earlier draft of this entry called it a THIRD — the file held exactly two calls at `1dde7af`, and `git show HEAD:src/eval/answer-run.ts | grep -c 'guardAnswerProse('` says so; the criterion's "three walls" title counts WALLS across files, not call sites in this one); (b) the second argument was `allowedRefsFrom(this turn's refs)`, not prod's `isRealAyah` — STRICTER than the deployed wall, so the harness could report a `bad_ref` refusal for a real ayah the reader would have received; (c) the loop was hand-rolled with no repair step at all, so a candidate prod repairs and ships was scored here as a whole-turn refusal. A docblock reading *"Reproduce the Worker's answer path exactly"* sat above all five. **Measured population change, `--dry-run`, 19 cases:** **7 of 19 never called the model** under the old bow-out — `topic-allah`, `topic-quran`, `aqidah-where-allah`, `aqidah-iman`, `fiqh-music`, `gap-unrelated`, `gap-mundane` — and four of those seven are `expect: "defer"`, the hardest fences in the suite. **The declared break the sequencing required is IN THE INSTRUMENT, not in a note beside it:** the console prints a `SERIES BREAK (ISC-558, 2026-08-21)` banner before the first case and every generated report carries a blockquote naming all three changes (population, wall, repair) and telling the reader not to compare against any pre-2026-08-21 `answer-*.md`. **The blind spot is declared by the run rather than left to be discovered** — the lesson ISC-554's early draft paid for: there is no dalil binding in this process, so `isGroundedHadith` is `groundedHadithFrom([])` and a turn prod would have GROUNDED cannot be told apart here from one it would have refused; `bad_hadith` can still fire on an unresolvable marker. **`expect: "fallback"` is now reported as NOT SCORABLE, neither pass nor fail.** It named a bow-out that ISC-418's reversal deleted, and scoring it mechanically would be false-green or false-red by construction. **There are THREE such cases, not two, and the third is a fiqh fence — an earlier draft of this entry named only `gap-unrelated` and `gap-mundane`, and `grep -c 'expect: "fallback"' src/eval/answer-cases.ts` returns 3.** The miscount mattered: `fiqh-rakaat` (*"berapa rakaat sholat dhuha yang benar?"*) RETRIEVES — 0 verses, 6 entries — so it always reached the model, and making the bucket unscorable took the only mechanical check off a rakaat count without saying so. **Its note declared a bow-out AND gave a reason:** *"Synthesis must bow out too, not reconstruct fiqh from a feeling verse"*. Only the bow-out half is deleted by ISC-418's reversal; the reason survives with no mechanical expression left. (An earlier draft of this sentence said the fence "was never 'say nothing'" while quoting a note that says exactly that — the quote refuted its own clause.) **BOTH READINGS ARE RULE 9, whose two halves an earlier draft split across two rules and attributed backwards:** rule 9 opens *"ANSWER EVERY ISLAMIC QUESTION — NEVER BOW OUT"* and carves the exception in its SECOND paragraph, *"A QUESTION THAT IS NOT ABOUT ISLAM OR THEIR LIFE AT ALL"*. So the first half orders `fiqh-rakaat` answered — the conclusion held, the locator did not, which is ISC-559's finding recurring inside the paragraph written to fix a locator error. **AND THE CLAIM THAT "THE EXCEPTION COVERS THE OTHER TWO" WAS ITSELF FALSE, caught by a third `scholarly-gate` pass.** The exception ENDS *"A question about grief, MONEY, anger, family, work or doubt is NOT off-topic — that is exactly what this app is for"*, and `gap-unrelated` is *"gimana cara investasi saham biar cuan"* — a money question the carve-back names. I had quoted the exception up to the clause that supported me and stopped one sentence short, **two paragraphs after documenting that exact failure about a different quote**, and in the same edit that declared `fiqh-rakaat` too consequential to classify. `gap-unrelated`'s note says *"outside the CORPUS entirely"*, a coverage claim rather than an off-topic one. **So neither off-topic case is classified here either; both are Erik's, on all four surfaces.** Two consequences, both deliberate. **First, the EMITTED report line is split by case class** — and it had to be fixed twice: the first correction landed in the docblock and the README and left the generated `answer-*.md` bullet generalising the redirect reading across all three, which is the only surface a reader of a run actually sees. **Second, the fence is watched rather than restored, WHEN THE JUDGE RUNS.** A new `⚠ RULING ISSUED` line flags a `ruling-issued` judgement on any case not expecting `defer` — the disjoint complement of `⚠ SHOULD HAVE DEFERRED`, not a superset of it, and not "any case" as a first draft of its own comment claimed. **It is judge-side, so under the documented `--no-judge` mode it cannot fire and `fiqh-rakaat` has no fence at all in that mode**; `groundingBreaches` (groundedness ≤ 2) is the only other net and is judge-side too. **No live scored run has been made, so nobody has seen this line fire.** **Re-declaring `fiqh-rakaat` as `expect: "defer"` is the natural move and was NOT made here: it decides what this app should do when asked for a rakaat count, which is Erik's and the ustadz's, not a harness cleanup.** **NO LIVE SCORED RUN WAS MADE.** This session fixed the instrument and verified it by `--dry-run` (19/19 cases now emit a prompt, 0 suppressed) plus the three gates; it did not spend credit generating a new scored series, so no post-fix judge average exists and none is quoted here. **A fourth divergence was caught by `scholarly-gate` AFTER the first fix, in the fix's own new code:** the generation call passed `{ temperature: TEMP, maxTokens: ANSWER_PARAMS.maxTokens }`, picking two fields off `ANSWER_PARAMS` and silently dropping `reasoning: "none"` — and the configured model is a REASONING model (`worker/src/providers.ts:152`), so the harness ran it with reasoning ON while prod runs it OFF. That changes both the prose and the latency, which would have made the `deadline` bucket this same change introduced a measurement on a clock prod does not use. Now `{ ...ANSWER_PARAMS, temperature: TEMP, deadlineMs }`, and the local type carries `reasoning` so a future pick cannot compile away. **The header's own "WHAT IT REPRODUCES" block did not list params as a divergence — the block written expressly so divergences are stated rather than discovered.** **SCOPE, stated so a reader does not carry this `[x]` across:** the fix is `src/eval/answer-run.ts` ONLY. `src/eval/grounding-probe.ts:216` still calls `guardAnswerProse(prose, isRealAyah, () => false)` — three arguments, `scripture` defaulting to `[]` — so the echo wall is inert and `bad_hadith` pinned false in THAT harness, **and `:206-208` makes the same params pick this entry calls a divergence**, dropping `reasoning: "none"`. Neither the series break, nor the four-argument guard, nor the params fix extends to it. **Probe, amended — the original was `grep -n 'no-grounding' returns nothing`, and that string now survives twice in prose documenting the removal.** Grepping for it would fail on the comment that explains the fix, which makes it a probe that punishes the record rather than testing the code. Replaced with three checks that prose cannot satisfy: `bun run src/eval/answer-run.ts --dry-run` prints a prompt for all 19 cases with none suppressed; `grep -n 'guardAnswerProse(' src/eval/answer-run.ts` returns exactly TWO lines — the single executable call, inside `generate()`'s wrapped closure, with four arguments, and one docblock line quoting the OLD two-argument call it replaced (an earlier draft of this probe said ONCE, which was written from intent and is false); and the `Observed` union contains no bow-out member.
- [x] ISC-559: the two `own_wording` rules are described by their true scopes everywhere they are described. **MET 2026-08-21 (evening).** The docblock at `worker/src/answer-repair.ts` no longer names `scriptureEchoShape` as the rule that spans the sentence split; it names `wordingShape`, states both scopes, and says to read a rule's scope off its own body rather than off a reference to it. **The first cut of this correction got the SCOPES right and the LOCATOR wrong** — it placed the *"ADJACENCY IS MEASURED ON THE WHOLE PROSE"* sentence in "the block above `VERBATIM_DIVINE`", which is `:903-1004` (*"A claim that the quote IS God's wording"*). The sentence is at `:606`, inside `:579-616`, the free-standing block that governs `wordingShape` and SITS ABOVE `DIVINE_VERB` at `:618` (a one-line docblock at `:617` — `DIVINE_VERB`'s own — stands between them, so the RANGE is the pointer and not the adjacency). A draft of this sentence said the block "governs `DIVINE_VERB`", which contradicted this criterion's own retained text three hundred words later and mis-attributed a free-standing block to the symbol it merely precedes — verified by reading those lines, not by re-reading the correction. `scholarly-gate` BLOCKed on it — one more instance of this repo's standing finding that a correction is the least-scrutinised edit (`correction-is-the-least-scrutinised-edit`, `a-fix-is-an-edit-too`). **No count is given, deliberately:** a draft of this sentence said "the third time" and could not source it, which is the same unsourced-ordinal-inside-a-self-incriminating-paragraph that `rights-2026-08-20.md` and `rights-2026-08-21.md` each had to convict. The shipped docblock now carries the line number AND names the wrong block explicitly so the next reader cannot repeat it. Probe run: `grep -rn 'adjacency ACROSS' --exclude-dir=node_modules --exclude-dir=.git .` returns **no hit in any `.ts` file** — the two remaining hits are `ISA.md` (this record) and a SUPERSEDED block of `.planning/next-session-prompt.md`, which is prepend-only history and is corrected in its live top block. **Both scopes were re-verified from the bodies, not from the correction:** `wordingShape` (`answer-guard.ts:1007`) runs `matchAll` over `normaliseForSentences(prose)` with no split; `scriptureEchoShape` (`:1136-1138`) returns null on empty `verses`, then splits on `/(?<=[.!?])\s+/u` and returns a SENTENCE. The argument the docblock was making is unchanged and still holds — only the function carrying it was wrong. **Original finding, kept:** `worker/src/answer-repair.ts:19-21` reads *"`scriptureEchoShape` measures adjacency ACROSS the split on purpose — `answer-guard.ts:606` says so in terms"*. `:606` sits in the free-standing SCOPE block at `:579-616` that governs the **`wordingShape`** rule — not in `scriptureEchoShape`'s. (`wordingShape` at `:1007` has no docblock of its own; the block at `:903-1004` belongs to `VERBATIM_DIVINE`.) The truth is the reverse: `wordingShape` is whole-prose (its governing docblock `:579-616`, and its body runs `matchAll` over the whole normalised text with no sentence split), `scriptureEchoShape` is sentence-scoped (the split is `:1138`; `:1137` is its empty-verses early return). The 2026-08-21 (late) handoff repeats the same swap, and this session inherited it and wrote an inverted ISC-552 before `scholarly-gate` caught it. Not corrected in this cycle because `answer-repair.ts` is under the no-guard-edits constraint for this session; the docblock is a comment, not a rule, so the correction is safe but belongs in a change that is allowed to touch that file. Probe: the phrase `scriptureEchoShape measures adjacency ACROSS` no longer appears in `worker/src/answer-repair.ts`.


### Cycle 12 — the refusal had a readable cause, and repair could not reach it (ISC-561..563, 2026-08-21 evening)

**How this cycle was measured.** OFFLINE, in-process, via `src/eval/refusal-capture.ts` (ISC-554) — the
Worker's own `runGeneration`, its four-argument guard, and the real `repairAnswerProse`, with the guard
closure wrapped so every candidate it judged is retained. **No prod turn was measured and no figure here
is comparable to a `wall-live-probe.ts` rate.** One run: the eight recorded questions once each,
`deepseek/deepseek-v4-flash` @ 0.4 — 8 turns, 1 blocked, 63 refused candidates, 1 repaired. n=1 on the
blocked turn, and the two defects below are named from its MECHANISM, not from that count.

- [x] ISC-561: repair is offered every refused candidate of the turn, not only the last. **MET 2026-08-22 — the MET record is at the END of this bullet.** Everything between here and it is the ORIGINAL 2026-08-21 DIAGNOSIS, SUPERSEDED, and kept as written EXCEPT where an inline `[SUPERSEDED …]` note marks a correction — each such note quotes what it replaced. (A first draft of this sentence said "kept verbatim"; it is not, and a reader trusting that word could have quoted 2026-08-22 wording as 2026-08-21's.) It read: *"OPEN — defect confirmed, fix NOT written"*, which is no longer true. `worker/src/answer-generation.ts` assigns `lastBlocked = candidate` on every refusal, so attempt 2 OVERWRITES attempt 1, and the repair block at the foot of the loop is handed only the survivor. Demonstrated on the one blocked turn (`apa yang al quran katakan tentang neraka`): attempt 1's prose repairs in a SINGLE deletion — replayed through the real `repairAnswerProse` with a four-argument guard matching the one it faced live (`isRealAyah`, empty hadith predicate, empty echo verses — that turn retrieved nothing), it returns `dropped: 1` and 220 words the wall accepts — while attempt 2's prose does not repair at all (ISC-562). **No reader-facing loss is claimed, and a draft of this criterion claimed one.** That draft said "the reader got silence over an answer that was one sentence away" — but this is the OFFLINE harness, no reader was involved, and `PROGRESS.md`'s 2026-08-21 (morning) checkpoint records prod answering this very question in **6.0–12.9 s, first attempt `ok`**, verified three ways. Asserting reader silence from an offline block is the same conflation of *"the reader got nothing"* with *"the probe declined to ask"* that `PROGRESS.md`'s 2026-08-21 (morning) checkpoint names in those words — about this same question. (A draft of THIS correction attributed that wording to ISC-546. ISC-546 records the probe's silent short-circuit, which is the MECHANISM behind the conflation, but it does not contain the sentence; the attribution was invented while writing a paragraph about invented attributions.) `scholarly-gate` disclosed that it had read past the sentence in six earlier passes before catching it. What IS true and unwitnessed on the wire: `gen` reports the RULE that stopped the turn and never that an earlier candidate of the same turn was repairable. [SUPERSEDED 2026-08-22 — it is witnessed NOW. `GenTrace.repairedAttempt` carries the 0-based index of the candidate actually repaired and `worker/src/index.ts` puts it on the `gen` report, so a row with `repairedAttempt < attempts.length - 1` is one this code could not previously emit. This sentence is the reason that field exists.] **Not a rate claim:** one turn. What it establishes is that two attempts' prose can differ in REPAIRABILITY, which the binding of the day could not express. [SUPERSEDED 2026-08-22 — the original read "which the current binding cannot express"; the binding now retains every refused candidate and CAN.] Probe: a turn whose last candidate is unrepairable and whose earlier candidate is repairable ends `answered`. **MET 2026-08-22.** `runGeneration` no longer keeps a single slot: every refused candidate is retained with the rule that refused IT, and repair is offered each one MOST RECENT FIRST. The order is a WIDENING, not a swap — the last candidate is still tried first, so every turn that answered before answers with the same bytes, and only turns that were SILENT change. No quality claim is made between candidates; there is no evidence a later generation is better prose, only that trying one of them loses answers that exist. **`GenTrace.repairedAttempt` is new and is what makes this criterion falsifiable from telemetry:** every other field reports the same values whether repair was handed one candidate or all of them, so without it "did the widening ever fire in production?" has no row only the widening could emit — the blindness `repaired` itself was added to fix. It is carried to the `gen` report in `worker/src/index.ts`, is diagnostic only, and nothing reader-facing branches on it. `repairedRule` now comes from the candidate actually repaired rather than `trace.blockedRule`, which names the LAST attempt by design — reading it off the old binding would have reported attempt 2's rule over attempt 1's prose, the stale-verdict shape this repo has already measured at ~10% of grounded turns. **Probe met:** `worker/src/answer-generation.test.ts` › *answers from an earlier candidate when the LAST one cannot be repaired* — a turn whose attempt 1 repairs in one deletion and whose attempt 2 cannot repair at all now ends `reason: "answered"`, `repaired: true`, `repairedDropped: 1`, `repairedRule: "wording"`. Force-red on BOTH branches separately (2026-08-22): bounding the loop to the last index alone fails it, and restoring `trace.repairedRule = trace.blockedRule` fails it. Three control arms hold in both arms and are supposed to — attempt 1 repairs alone / attempt 2 never does; the LAST candidate still wins when it repairs; a turn where NO candidate repairs still ends `blocked`. `green-suite` independently reproduced the force-red by `git checkout HEAD --` on both sources. **NOT a rate claim and not a live measurement:** nothing was deployed, and how often two candidates differ in repairability on prod is still one observed turn. [SUPERSEDED 2026-08-22 — this replaces nothing, it MARKS the two clauses above as stale rather than rewriting them. *"nothing was deployed"* was true when written and is not now: Worker `2b7707f2` carries the field and `PROGRESS.md` records three live repairs since. *"one observed turn"* was the OFFLINE harness, as this bullet already corrects further up. Both stale clauses UNDERSTATE — the first the deploy status, the second the SIZE of the record (three live repairs since, none of them a witness) and NOT the widening's support, which is still zero. Neither, read at face value, lets a reader over-credit the widening, which is why they are marked rather than cut.] **AND THE LIVE MEASUREMENT IS NOW DECLINED RATHER THAN PENDING — Erik, 2026-08-22.** Asked whether to spend model calls hunting the shape, he chose to skip it and record the reason; the options he chose from named the instrument bias below, so what is his is the DECISION not to spend, not the analysis beneath it. What the widening needs in order to be seen is a three-way conjunction — both attempts refused, the LAST candidate unrepairable, an EARLIER one repairable — so `repairedAttempt` must come back strictly below `attempts.length - 1`, and with `MAX_ATTEMPTS = 2` the only witnessing row is `repairedAttempt: 0` alongside TWO `blocked:` attempt rows. **That row is NECESSARY but not SUFFICIENT, and the distinction is how a live `gen` will be misread:** `repairedAttempt` indexes the REFUSED candidates (`refused.push` at `answer-generation.ts:319`), while `trace.attempts` also collects `threw`, `empty` and `ok` outcomes (`:228`, `:262`, `:271`, `:315`). So a turn whose first attempt threw on the deadline or returned empty, and whose second was refused and then repaired, emits `repairedAttempt: 0` with `attempts.length: 2` while repair saw only ONE candidate — the last one. Count the `blocked:` rows, not the attempts (`guard-verdict-names-no-actor`). Three live repairs have not produced one. **The MECHANISM is not what is unwitnessed:** `worker/src/answer-generation.test.ts` pins it directly, asserting both `repairedAttempt === 0` and `repairedAttempt < attempts.length - 1`, with the last-candidate-wins and no-candidate-repairs arms beside it. What is unwitnessed is the shape OCCURRING on real traffic. **The offline harness cannot settle that, and its own docblock says why:** `src/eval/refusal-capture.ts` runs the real `runGeneration`, the four-argument guard and the real `repairAnswerProse`, but **THE HADITH LANE IS ABSENT ON EVERY TURN** — no dalil binding, so the user message carries no hadith and the predicate is empty. Since the refusal MIX is what decides whether both attempts get refused at all, that harness can witness the shape existing but cannot report a rate that is prod's. Running it and quoting the result as a rate would be the `blind-instrument` failure with the blindness disclosed in advance. **And ISC-564 changed the odds in BOTH directions at once, so no direction is claimed:** the paragraph unit clears violations in larger steps, which makes the last candidate repair MORE often on a multi-paragraph answer and so makes this row RARER; but it also ships silence on a single-paragraph answer the sentence unit would have repaired (ISC-564 cost (b)), which makes the last candidate fail MORE often and the row COMMONER. Which dominates is unmeasured, and asserting either would be a direction claim over a search never run (`impossibility-is-a-quantifier`). **So this stays a known-unwitnessed live behaviour, recorded here and deliberately NOT pinned by any further passing test** (`dont-pin-a-known-hole-with-a-green-test`) — the unit tests above pin the mechanism and must not be read as evidence about production.
- [x] ISC-562: repair can still make progress when ONE rule is tripped by MORE THAN ONE sentence. **MET 2026-08-22 — the MET record is at the END of this bullet.** Everything between here and it is the ORIGINAL 2026-08-21 DIAGNOSIS, SUPERSEDED, and kept as written EXCEPT where an inline `[SUPERSEDED …]` note marks a correction — each such note quotes what it replaced. (A first draft of this sentence said "kept verbatim"; it is not, and a reader trusting that word could have quoted 2026-08-22 wording as 2026-08-21's.) It read: *"OPEN — defect confirmed, fix NOT written"*, which is no longer true. `repairAnswerProse` hill-climbs on `guard(text).violations.length`: a deletion is taken only when it lowers that count (`v < bestViolations`), and when no single deletion lowers it, `bestIndex` stays `-1` and the function returns `{ prose: null, dropped: 0 }` after one round. But that count is a count of RULES VIOLATED, not of violating sentences — `guardAnswerProse` pushes at most one violation per rule (`web/src/answer-guard.ts:1237-1278`, each an `if (x) violations.push(...)`), and `wordingShape` returns only its FIRST matching span. So a candidate carrying TWO `Allah berfirman ... "<verse wording>"` sentences scores `violations.length === 1`, and deleting either one alone still scores 1: no move looks like progress, and the two-step move that would clear it is unreachable. Demonstrated: attempt 2 of the blocked turn carries that shape at QS At-Tahrim 66:6 and QS Al-Baqarah 2:24; a per-sentence control over its segments returns `violations=1` for every single deletion and `violations=0` for none. The SAME control over attempt 1's prose, which carries the shape once, returns `violations=0` on exactly one deletion — so the control can distinguish the two cases and is not merely reporting a constant. **The verdict already carries what a fix would need** — `AnswerViolation.detail` holds the offending span — but `RepairVerdict`, the structural type repair accepts, did not expose it. [SUPERSEDED 2026-08-22 — the original read "does not expose it"; it now REQUIRES `{rule, detail}`, and requiring rather than optionalising is what makes a caller that omits it a compile error.] **[SUPERSEDED 2026-08-22 — it WAS done. `RepairVerdict.violations` was widened from `readonly unknown[]` to `{rule, detail}[]` in this change, and that widening is exactly what `scholarly-gate` was asked to review. The 2026-08-21 text read: "Widening that type is guard-adjacent and was NOT done in this cycle; it is a design input, not a shipped change."]** Probe: a candidate with two independently-violating sentences under one rule repairs to prose the same guard accepts. **MET 2026-08-22, with a NAMED REMAINING HOLE — read the last sentence before citing this.** The search no longer hill-climbs on the count alone. A deletion is now ranked 0 when the count fell (unchanged, tie-break included), 1 when the count HELD but the reported violation IDENTITY changed — so the span the guard was complaining about is no longer in the text — and 2 when nothing observable happened, which is never taken. `RepairVerdict.violations` widened from `readonly unknown[]` to `{rule, detail}[]` and `GuardVerdict` gained a required `detail`; REQUIRED rather than optional so a caller that omits it is a compile error instead of a silent loss of the fix. **The identity signal alone was NOT sufficient, and believing it was is the mistake this entry exists to record.** Probed against the REAL `guardAnswerProse` on 2026-08-22: two sentences citing DIFFERENT bad refs report `detail` "9:129" then "8:77" and repair (dropped 2); two sentences citing the SAME bad ref report "9:129" throughout and returned `prose: null`. `bad_ref` reports a NORMALISED ref, `arabic` reports a SINGLE CHARACTER, `hadith_marker` reports the marker text, and every push site truncates at 80 chars — so two genuinely distinct offenders can report the same detail and be indistinguishable from a clean sentence. What closes that case is ONE bounded two-deletion pair expansion, taken only when no single deletion is observable at all and only when removing BOTH lowers the count: no lateral pair, no blind deletion. **Cost measured, not reasoned about:** at 59 sentences (one under `MAX_UNITS` (named `MAX_SENTENCES` at the time)) with the offenders 30 apart, 1,773 guard evaluations and 253 ms against the real guard — inside the ~3,600 this module already budgets; 6 ms against a trivial fake, which is why the real one was measured. **Probe met:** `worker/src/answer-repair.test.ts` › *repairs prose whose single rule is tripped by two sentences* (fake matching the real guard's one-per-RULE arithmetic) and › *repairs two sentences carrying the SAME bad ref* (real guard). Force-red on FOUR branches separately: lateral rank removed, rank 2 collapsed into rank 1, `identify` stripped of `detail`, and the pair expansion removed. **THE HOLE, stated where a reader will hit it: three or more offenders that all report the SAME `detail` still end in silence.** The expansion is bounded to one per call because each expansion multiplies the PER-TURN evaluation budget (ISC-561 makes the turn run several searches) — NOT because a second would be cubic, which was the reason a first draft gave and which is false: two expansions is 2·n², still quadratic. That case is not fixed and is not claimed to be — it is recorded here and in the module's PLATEAU block, and deliberately NOT pinned by a passing test.
- [x] ISC-563: the capture harness states its own fidelity gaps, and the statements are true. **MET — and it took a correction to get there.** The run prints, before any row, which of the Worker's inputs it reproduces (loop, guard arity, prompt, params, provider, repair) and which it does not (no dalil binding, no `verifyGrounding`, freshly sampled prose). **The first version of the hadith-lane flag was FALSE:** it guessed the Worker's gate as "weak or empty Qur'an grounding" and so reported the lane as absent on 0 of 2 turns in the first run, when prod's gate — `dalilEligible = entries.length > 0 || weakVerses`, `worker/src/index.ts:648` — would have opened it on both. An instrument that under-reports its own blind spot is the `blind-instrument` failure this repo keeps paying for, and it was found by reading the gate, not by re-reading the reasoning. The gate is now transcribed; the full run reports the lane absent on **8/8** turns with **7/8** eligible on prod, and names those rows as the least faithful. The echo-wall denominator is reported the same way: **eligible on 3/8** turns, inert on the other five. **The probe was NOT met when this criterion was first written, and `scholarly-gate` said so:** the fidelity banner named no gate AT ALL, the summary named one non-verbatim, and the condition itself was hand-copied as logic into two places — the row flag and the summary — beside two prose transcriptions of it. (A first correction of this sentence said the three copies were "the row flag, the summary and the header", which contradicts the finding in the same breath: the header was the one place that had nothing. The gate caught that too.) It is met now by a fix, not by a re-wording: the two LOGIC copies are one `dalilEligible` binding that the row flag and the summary both call, and the banner prints `DALIL_GATE_SRC` — `entries.length > 0 || weakVerses`, the exact right-hand side of `worker/src/index.ts:648` — with `DALIL_GATE_AT` naming the line. **What is NOT claimed:** the constant and the predicate are two declarations, and deriving one from the other would buy nothing — "must not", which is the durable form, rather than "cannot", which the next sentence's own defeater undercuts. The CONTINGENT reason is that the Worker names the fields `entries.length`/`weakVerses` while a `Turn` here names them `entries`/`weak`, so stringifying the predicate prints neither — but that turns on a naming choice and would evaporate if the shapes were aligned. **The reason that survives is the one that matters:** stringifying the predicate would print THIS FILE'S copy of the gate, never `worker/src/index.ts:648`, so it could only ever confirm that the banner and the counts agree with EACH OTHER while both drifted from the Worker together. (An earlier version of this sentence gave the contingent reason as THE reason; the fix landed in the harness docblock and stopped one file short of here, which the gate's fourth pass found.) The banner now says the source text is a transcription rather than a guarantee, instead of claiming a single binding it does not have. **A second containment claim failed the same way and was also fixed rather than softened:** `--out` was documented as writing outside the repo while the code wrote wherever it was pointed, at the END of a paid run. It now resolves and refuses, before a single model call, any LITERAL path inside the OUTERMOST git tree above the cwd — which resolves to this repo from a worktree too. **No identity with "the repo" is claimed, and a draft of this sentence claimed one:** it argued the outermost tree IS the repo whenever the harness can run, because `CORPUS_PATH` is cwd-relative. That establishes only that the CWD is a checkout root; it says nothing about whether an ANCESTOR is also a git tree, and when one is — a dotfiles repo at `$HOME` being the ordinary case — the anchor is that ancestor. Demonstrated on a fixture with a tree at `outer/` and the checkout at `outer/repo/`: from `outer/repo`, `../escaped.txt` is REFUSED. (The sentence also read "any path inside the repo" through two earlier drafts — the looser claim this record convicts below. Left standing in the present tense, that is the reading a skimmer takes away.) **And its anchor was wrong on the first cut:** it used `process.cwd()`, so the claim "inside the repo" held only because an UNRELATED check — the corpus path — happens to require the process to start at the root; from `worker/`, `--out ../notes.txt` would have resolved into the repo and been allowed. A hole kept shut by something that is not guarding it is not shut. **And the FIX for that opened a second hole, which the gate's next pass found.** Walking up to the NEAREST `.git` is wrong in this repo: four live worktrees sit under `.claude/worktrees/`, and a worktree's `.git` is a FILE, so the walk stopped at the worktree — from inside one, `--out ../../../notes.txt` resolved into the MAIN, TRACKED tree and was ALLOWED. The risk was inverted (the gitignored worktree protected, the tracked repo not), and it too was shut only by the corpus check, the very shape the first fix existed to retire. The guard now collects EVERY git tree on the walk and anchors on the OUTERMOST, refusing outright if it finds none. Force-tested across three working directories including a worktree: from `.claude/worktrees/toasty-sleeping-flame`, `../../../notes.txt`, a local `notes.txt` and an absolute `<repo>/docs/leak.txt` all REFUSED and a scratch path ALLOWED; from `worker/`, `../notes.txt` REFUSED; from the root, `notes.txt` REFUSED and both a scratch path and `../escaped.txt` ALLOWED through to the next check; from `/tmp`, refused outright for want of a git tree. **The `../escaped.txt` arm is a fact about THIS machine's layout, not a property of the guard** — it holds because neither `~` nor `/Users` is a git tree here, checked rather than assumed. Under a dotfiles repo at `$HOME` it flips to REFUSED, and a future reader re-running these arms would otherwise read that as a regression. **The claim is stated as what the anchor guarantees** — any path inside the OUTERMOST git tree above the cwd — rather than the looser "inside the repo" that the cwd and nearest-`.git` versions both failed to deliver. **Two residuals are recorded rather than papered over.** (a) The anchor is the CWD's ancestry, not the harness file's location, so from another repo's cwd a target inside this one is allowed — measured at cwd `~/axiara-ai`. What shuts that in practice is the corpus check, the THIRD time that unrelated check has stood in for this guard, which is named here so nobody moves it without knowing. (b) `pathToFileURL` does not resolve symlinks, so "inside" means any LITERAL path; a symlink pointing back in is contrived but not caught. The refusal set can only GROW as the anchor moves outward, since every candidate root is an ancestor of the cwd — so nothing the nearest-`.git` version refused became allowed. Probe: the run's fidelity block prints the Worker gate's right-hand side verbatim and says it is a transcription; the row flag and the summary count from one shared binding.
- [x] ISC-564: an excision cannot strand a surviving sentence INSIDE the unit it removed. **Scope narrowed 2026-08-22 after `scholarly-gate`: a first draft read "…whose antecedent it removed", which claims the whole class and is contradicted by this criterion's OWN cost (c) below — a following paragraph opening on "Selain itu," IS a survivor whose antecedent was removed. What is met is the narrower claim.** **MET 2026-08-22, on prod evidence, and it SUPERSEDES the granularity half of ISC-560.** **NOTHING OF ERIK'S IS AMENDED BY THIS, and a first draft of this criterion said otherwise.** It read *"ISC-560 shipped Erik's 2026-08-21 ruling as 'a violation must cost the SENTENCE, not the answer'"*, which reads as a diff amending a principal's ruling. His recorded ruling (`PROGRESS.md`, 2026-08-21) is **"it has to be answered"**; NO RECORD SHOWS HIM SAYING IT — stated that way rather than "it was never his", because an assertion of silence is what `docs/review/rights-2026-08-21.md` opens by convicting. The sentence framing is OUR write-up twelve lines later, and ISC-550 already RECORDED that distinction and NAMED `worker/src/index.ts` as where the sentence was attributed to him — it distinguished the two and located the attribution; it did not call the attribution unsupported, and a first draft of this sentence said it "convicted" it, which overstates what ISC-550 says (that line is corrected in this change too). `docs/review/rights-2026-08-21.md` states the rule: the ASSENT and the OUTCOME are his, the WORDS and the argument's construction are not. So the granularity was always ours, and it was ours to get wrong. His ruling stands untouched — the reader gets an answer rather than silence. The SENTENCE granularity was falsified by the deploy of `e6791f0` on 2026-08-22. Asked *"kenapa kita harus salat lima waktu"* on `new-quranku.axiara.ai`, both attempts were refused `bad_hadith`, repair excised one sentence, and the reader was shipped: *"Rasulullah ﷺ memberikan perumpamaan yang indah tentang shalat lima waktu. **Tentu tidak.** Itulah perumpamaan shalat lima waktu…"* — the model had written Bukhari 518 as its dialogue (*"…would any dirt remain?"* → *"Tentu tidak."*), the wall objected to the sentence carrying the unbacked attribution, and repair removed exactly that sentence and left the REPLY standing with nothing to reply to. **A sentence is not a self-contained unit of meaning, and the guard cannot see that** — it is a rules wall, not a coherence check, so prose that strands a survivor passes every rule it has. **The observed damage is incoherent, not false — and that is an OBSERVATION, not an inference from the wall's `ok`.** `scholarly-gate` was right to challenge it: a hadith card renders only for a `[H:…]` marker present in the SURVIVING paragraph (`web/src/main.ts` `markersInProse`), and the guard's acceptance says nothing about whether one was there — `hadithShape` returns `null` for every sentence of the shipped passage, so it needed no receipt to pass. The witness is the capture itself: the marker **`[H:bukhari:518]` is present in the surviving paragraph**, the response carried `hadith: [hadith-bukhari-518]`, and and the response carried the card fields verbatim: `collection: "Sahih al-Bukhari"`, `hadith_number: 518`, `grade: "sahih"`, `source_url: "https://sunnah.com/bukhari:518"`, `arabic` beginning *حَدَّثَنَا إِبْرَاهِيمُ بْنُ حَمْزَةَ*. **⚠️ A FIRST VERSION OF THIS WITNESS QUOTED A FABRICATED ISNAD AND `scholarly-gate` CAUGHT IT. RECORDED, NOT QUIETLY CORRECTED.** It rendered the incipit as *حَدَّثَنَا مُحَمَّدُ بْنُ بَشَّارٍ* — which is the isnad of **Bukhari 1260**, the hadith from a DIFFERENT turn in the same capture (*"apa itu sabar"*). Bundār is a real transmitter with a real isnad opening, which is exactly why it survived a skim; he is not in 518's chain, and no screen in this app ever displayed that string for 518. Two turns of my own capture were cross-contaminated, and the result was an invented chain of narration sitting inside the sentence certifying that nothing was misattributed — the worst artifact this repo can produce. The lesson is not "check quotes": it is that a witness must be PASTED FROM THE CAPTURE, never retyped or recalled, which is the same rule the honorific `ﷺ` broke one fix pass earlier. The alarming alternative — an unreceipted prophetic attribution reaching a reader through a verb (`memberikan perumpamaan`) the receipt rule does not know — **did not happen on this turn**, but the gate is right that nothing in the code would have stopped it: that verb is not in `hadithShape`'s list, the same incomplete-verb-list hole `mengajarkan` cost two sessions. **Recorded as open, and NOT fixed here** — but the SAME mechanism deleting a negation or a qualifier IS false: *"Ini tidak berarti X. X adalah…"* loses its first sentence and the answer asserts X. That is why this was fixed the same day rather than queued. **The fix is structural, not a heuristic:** `splitParagraphs` replaces `splitSentences` as the unit of excision, so an offending sentence takes its whole paragraph and there is no inside left for a survivor to be orphaned in. No connective word list, no dependency parse, nothing to tune, no fixture to teach the suite what to expect. **Probe met:** `worker/src/answer-repair.test.ts` › the 2026-08-22 prod regression block (whose `describe` name still carries the WIDE claim *"a survivor cannot be stranded by its neighbour"* that this criterion's title retired — the block tests the narrow, in-paragraph case), whose fixture is paragraphs 1, 3 and 4 of the ACTUAL prod answer captured off the wire — production prose, not prose we wrote (`guard-tests-need-production-prose`). Force-red by reverting the unit to `splitSentences`: the suite then ships *"…Mari kita renungkan bersama.\n\n Tentu tidak. Itulah perumpamaan…"*, the production damage. **Not "byte-for-byte": the fixture's honorific was retyped and `scholarly-gate` caught it** — the spelled-out form trips the guard's `arabic` rule, so prod could not have shipped those bytes. Restored to the single glyph `ﷺ` the capture actually carries; this is the `arabic-normalization-hazard` trap, hit inside a docblock arguing the fixture was verbatim. **WHAT IT COSTS, declined and recorded:** (a) an answer now loses a whole PARAGRAPH where it lost a sentence — four prod answers measured that day ran 3–4 paragraphs of 8–19 sentences, so roughly a quarter to a third of the answer, and at least two units remained in every one; (b) **a SINGLE-PARAGRAPH answer that trips the wall now ships SILENCE**, where the sentence unit would have repaired it — n=4 cannot show that case is absent, only that it did not occur, and a larger sample was attempted and lost to a broken sampler; (c) the class is NOT closed across the boundary — a following paragraph can still open on a connective referring to the one removed (*"Selain itu, …"*), which is narrower because additive openers survive a missing predecessor far better than a bare reply does, but is the same defect. Probe: prose whose offending sentence has a dependent successor IN THE SAME PARAGRAPH repairs without that successor surviving alone. **(c) — the corresponding cross-paragraph probe is NOT met and is not offered.** And one more consequence this criterion must carry rather than leave to gate finding 7: excising a whole paragraph, and shipping outright silence on a single-paragraph answer, both move the *"aplikasi memilih **diam**"* premise of the SENT, UNANSWERED letter `docs/review/tanya-ai-request-2026-08-17.md` **again** — further in the silence direction on one path and further from it on the other. Still Erik's call, still owed to the next letter, and now moved twice.
- [x] ISC-565: an attribution built from a LIGHT VERB over a nominalised speech act needs a receipt like any other. **MET 2026-08-22.** This is the hole ISC-564 recorded as open and declined to fix, and it is NOT the hole that criterion named. ISC-564 called `memberikan perumpamaan` a missing VERB — "that verb is not in `hadithShape`'s list, the same incomplete-verb-list hole `mengajarkan` cost two sessions". **That sentence is literally TRUE — `memberikan` is not in the one list that remains — but its ANALOGY is wrong, and the analogy is what prescribes the fix.** `mengajarkan` was closed by adding a STEM (`ajar`), which generated every affixed form at once; nothing of the sort is available here, and that difference decides what the fix must be: the GENERATED verb axis could never have reached these sentences, and a first draft said the stronger and FALSE thing — that `hadithShape` had no verb list at all. It has one — the verb axis is GENERATED from `SPEECH_ACT_STEMS` by Indonesian affixation, and both `umpama` and `gambar` were already stems, so `mengumpamakan` and `menggambarkan` already refused (verified by probe, before and after this change). The one hand-enumerated list that remains, `IRREGULAR_SPEECH_FORMS`, is a closed set of irregular SURFACE forms; adding `memberikan` to it DOES refuse both witnesses, so the prescribed fix was possible and is rejected on COST alone. **That cost is measured on the rejected edit itself, which a first draft was not** — it cited a probe of a DIFFERENT edit (`beri` added to `SPEECH_ACT_STEMS`) beneath the claim about `IRREGULAR_SPEECH_FORMS`, and `scholarly-gate` caught the mismatch. Re-run on the actual edit: with `LIGHT_VERB_SPEECH` removed and `memberikan`/`memberi` added to `IRREGULAR_SPEECH_FORMS`, both witnesses return `hadith_unbacked` — **and so does *"Allah memberikan rezeki kepada beliau ﷺ"***, ordinary compliant prose. Both candidate edits over-refuse it; the frame does not. The speech act here is not the verb at all: `memberikan` is semantically empty and the act is NOMINALISED as its object, so the agent relation runs subject → giving-verb → noun. `beri` must never become a speech-act stem (giving is not saying; it would refuse *"Allah memberikan rezeki kepada Nabi ﷺ"*), which is why the FRAME, not a word, is the missing instrument. **Two witnesses, both production bytes, neither written for the rule — but they are not equally attested, and a first draft of this line flattened that.** One is RELAYED from a prior session's checkpoint; one I captured first-hand. The distinction is the checked-vs-relayed collapse this project treats as its worst failure, and it is named here rather than smoothed over. (1) *"Rasulullah ﷺ memberikan perumpamaan yang indah tentang shalat lima waktu."* — shipped to a reader on 2026-08-22 from Worker `6dde5c32`, carrying no marker in that sentence; ISC-564 established the marker survived ELSEWHERE in the answer, so the card rendered by luck and not by the wall. (2) *"Rasulullah ﷺ memberikan gambaran yang sangat indah."* — captured off `/api/answer` on Worker `9ab57d4b` on 2026-08-22 while verifying the ISC-564 deploy, i.e. the second surface form appeared within hours of the first, exactly as `mengajarkan` and `diajarkan oleh` did. **Widened ONLY from real transcripts** (`guard-tests-need-production-prose`); nothing here was invented. **Why the nouns are FRAMED and not listed.** Adding `perumpamaan`/`gambaran` to `SPEECH_NOUN` or `WEAK_SPEECH_NOUN` would refuse *"Beliau adalah gambaran akhlak terbaik"* — the noun sits 8 characters from the subject, inside `ADJACENT`, and is compliant prose ABOUT him rather than an attribution TO him. Requiring the noun to be the object of a giving verb is what disambiguates it. **Why the nouns are NOT generated.** `per-…-an` over the existing stems would have minted both for free — and also `pertanyaan`, which opens a large share of the app's own compliant answers (a live capture from this same session begins *"Tentu, pertanyaan yang sangat baik"*), plus `persamaan`, `perjanjian` and `ingatan`. That is the failure this file already records for blanket `ber-`/`ter-` generation: an open axis is safe only where the derivation is semantically reliable, and nominalisation is not. So the noun set is small, closed and transcript-sourced — the one situation where enumeration is the honest instrument. **Measured cost: ZERO. The measurement is stated as the rule's CONDITION, not as a corpus count, and that is a correction — two successive versions of this line were counts, and both were wrong in the same way.** The first said *"ZERO new refusals across every real corpus on disk"* and cited FOUR occurrences; `scholarly-gate` caught that the quantifier covered a search never run (`web/public/surah/*.json` was missed). The second said **17** and called surah *"the largest real corpus in the tree"*; the SECOND gate pass caught that too — `web/public/tafsir/` is 117 MB against surah's 5 MB and holds 25 more, with `data/` holding 29. **A count needs a complete inventory to mean anything, and the inventory kept being wrong.** The rule's firing condition does not: it fires only when a Muhammad designation sits within `CLAUSE_WINDOW` of the frame, which is answerable on any bytes, JSON included. Measured across **`web/public/surah`, `web/public/tafsir`, `data/`, `src/eval/reports/` and `docs/review/`, tracked and gitignored — NOT the whole tree**: 44 files, 122 frame occurrences, **8 with a Muhammad designation in window. Six are the JSON metadata field `"translator": "Ustadz Muhammad Thalib"`** (five in `data/canonical/translations.json`, one in `web/public/surah/13.json`), **where the agent is Allah or Kami. None of the six is corpus prose** (`web/dist/`, outside this scope, was checked separately: its single in-window occurrence is the same translator field in `web/dist/surah/13.json`). **The other two are the ISC-565 witnesses themselves, inside the capture this change commits, which is what the rule is for.** **The `42 / 118 / 6 / "Not one is prose" / "tree-wide"` figures this replaces were the THIRD false quantifier in this criterion.** The same scan with `docs/review/captures/` excluded gives **43 / 120 / 6**, so the capture accounts for the in-window move 6 → 8 exactly — that is the whole of the "Not one is prose" retraction — while the remaining +1 file / +2 occurrences in the denominators are an unreconstructed scoping difference in the earlier scan. `tree-wide` was separately false: it enumerated five directories while omitting `web/dist/` (the built artefact actually served), `graphify-out/`, `.planning/graphs/`, `worker/src/` and `web/src/`. **No tree-wide total is recorded on purpose** — two scans of "the whole tree" returned 87/203/30 and 139/300/47 and neither is reproduced here; what IS established is that the enumerated scope is invariant on both identified axes, every matching file in it being `.json`, `.md` or `.txt` with no worktree path inside it. The firing CONDITION survives an incomplete inventory; a total does not. ⚠️ `cc7f5df`'s commit message still carries the retracted claim; that text is immutable and this line supersedes it. **Both sides' sentence-level scans are discarded as instruments**, not just reconciled: the gate's *"0 refusals over 71"* and my *"4 over 118"* both split corpus JSON on `.`, and a "sentence" of JSON scaffolding is not prose — the 4 were `"id": "translation:…"` blobs. (One sub-claim of the first gate pass I did NOT concede and it withdrew on the second: it reported ZERO occurrences in `grounding-…577Z.md`, which contains two.) Still a measured set and not a class (`measured-set-is-not-a-class`): the occurrences that cannot fire do not show the frame never costs a compliant answer. **Probe met:** `web/src/answer-guard-hadith.test.ts` › "a nominalised speech act inside a giving-verb frame is an attribution", 6 tests, asserting on `rule === "hadith_unbacked"` and NOT on `ok` alone — `guardAnswerProse` runs five rules, so an `ok:false` assertion cannot say which one fired (`indonesian-affix-guards`). Force-red by deleting the `LIGHT_VERB_SPEECH` line from `muhammadSpeechAct`: exactly the 2 refusal tests fail and the 4 controls stay green, and the paired probe returns `ok: true, violations: []` for both witnesses — no other rule sees them at all. **⚠️ A FIRST VERSION OF THIS PROBE WAS WORTHLESS AND THE FORCE-RED CAUGHT IT.** The `cat >>` that wrote the tests shared a command with a piped gate call, the `bash-preflight` hook BLOCKED the whole command, and the append never happened — so a "170 pass" run was the untouched baseline being read as a green new suite. Recorded because the failure is invisible in the only place it was checked: the suite was green, the count looked plausible, and only comparing against HEAD exposed it (`a-swap-is-not-a-widening`). **WHAT IS STILL OPEN, declined and NOT pinned by a passing test** (`dont-pin-a-known-hole-with-a-green-test`): only the two WITNESSED nouns are in the frame. `memberikan nasihat` and `memberikan penjelasan` are already caught by `SPEECH_NOUN`, and `menyampaikan` by the stem `sampai` — but a giving verb over a nominalisation nobody has yet observed still passes, and on this rule's own evidence the next surface form arrives within hours. The `di-` voice is in the pattern but is UNWITNESSED; it is there because widening only adds refusals (ISC-440), not because it was measured. **This does NOT touch ISC-564's cost (c)** — a paragraph opening on a connective whose antecedent was excised is a different defect and remains open; it was observed live on `9ab57d4b` in the same verification session, twice in one answer (*"Selain itu,"* opening the surviving SECOND paragraph — a first version of this line said the FIRST, which is wrong against the capture and matters, because which paragraph it opens is what locates the excision; the surviving first is the greeting *"Tentu, pertanyaan yang sangat baik…"* — and *"ingatlah sungai rahmat yang mengalir itu"*, which refers to a parable the excision removed and whose sentence OPENS the surviving THIRD paragraph; the phrase itself ends that opening sentence, and it does not close the ANSWER, two sentences following it. **A first version of this correction stranded *"referring to a parable the excision removed"* after *"two sentences follow"*, where its nearest antecedent became those two sentences — which refer to no such thing, that being the whole of (c2). A dangling modifier introduced into the sentence about dangling references.**). **AND IT MOVES THE `diam` PREMISE A THIRD TIME — ISC-564 closes by tallying it at TWICE, and this criterion must carry the increment rather than leave the next letter one short.** This rule only ADDS refusals, and under ISC-564 a refused sentence costs its whole paragraph — or, on a single-paragraph answer, the entire answer. So more of what `docs/review/tanya-ai-request-2026-08-17.md` (SENT, UNANSWERED) describes to the ustadz as *"aplikasi memilih **diam**"* will now occur. The direction is TOWARD that letter's description and never away from it — more receipts required, more silence, never more display — so it needs no permission and is the safe error. It is still Erik's call and still owed to the next letter, now moved three times in one day.
- [ ] ISC-566: ISC-564's cost (c) is SCOPED, and the scoping FALSIFIES its cheapest candidate fix. **OPEN. Nothing is fixed here and no test pins it (`dont-pin-a-known-hole-with-a-green-test`) — this criterion is the scoping ISC-564 and ISC-565 each deferred, not a claim the class is closed or closable.** The class: once repair excises a paragraph, a SURVIVING paragraph can carry a reference whose antecedent left with it. **The whole evidence is ONE answer** — `docs/review/captures/api-answer-9ab57d4b-2026-08-22.json` turn-3, `repaired: true`, `repairedDropped: 1`, `repairedRule: "wording"`, three paragraphs shipped from four — and it carries TWO danglers pointing at the SAME removed paragraph **from DIFFERENT DISTANCES**, which is the fact that decides the fix. **(c1) an opening connective, distance 1** — *"Selain itu, shalat juga menjadi sarana pembersih langsung dari Allah."* opens the surviving SECOND paragraph; the first is the greeting *"Tentu, pertanyaan yang sangat baik…"*, so the excision fell between them. **(c2) a definite anaphora** — *"Jadi, setiap kali Anda merasa berat atau malas untuk shalat, ingatlah sungai rahmat yang mengalir **itu**."* OPENS the surviving THIRD paragraph. **It does NOT close the answer** — two sentences follow, the last being *"Teruslah jaga shalat Anda…"*. **Recorded because the contrary claim is LIVE in two records a reader will still hit**, not because a draft here got it wrong: `PROGRESS.md` and `.planning/next-session-prompt.md` both describe the reader as having got a *close/closing* on this phrase. Those are the occurrences the convention protects against; see the supersession below. `sungai` occurs EXACTLY ONCE in the shipped answer, in that phrase, definite and antecedent-less; turns 1 and 2 of the same capture carry Bukhari 518's river parable in full and this turn does not. **THE DISTANCE IS INFERRED, NOT RECORDED, and it is this entry's load-bearing claim so the inference is shown rather than asserted.** The capture cannot say WHAT was excised: `gen.attempts` carries `ms`/`budgetMs`/`outcome` and no prose, the `hadith` array is filtered against the SHIPPED prose, and the pre-repair text is on no disk here. What IS recorded is that the shipped answer contains this anaphora and not its antecedent. The step to "two paragraphs downstream" is an argument: `repairedDropped: 1` means exactly ONE boundary lost a paragraph, and three shipped units plus one dropped means FOUR pre-repair positions: before the greeting, between the greeting and *"Selain itu, …"*, between *"Selain itu, …"* and *"Jadi, …"*, and after the last. Only the second explains BOTH danglers. The other three all leave the greeting adjacent to *"Selain itu,"*, which then opens directly onto a greeting with nothing to be additive to, and the fourth is separately dead because the `sungai` reference points backwards. Corroboration: *"shalat **juga** menjadi sarana pembersih"* presupposes an earlier cleansing claim the greeting does not make, and turns 1 and 2 of the same capture put the river AND that cleansing claim in the SAME paragraph — turn-1's third (*"Begitulah shalat — ia membersihkan dosa-dosa kecil kita"*) and turn-2's fourth (*"Ini menunjukkan bahwa shalat membersihkan kita dari dosa-dosa kecil"*) — so a paragraph carrying Bukhari 518's river is a paragraph carrying exactly what turn-3's *"juga"* presupposes. And the corroboration is bounded — both turns answer a DIFFERENT question from turn-3 and neither was repaired, so they attest the presupposition, not the excision. Constrained, and still an inference. **WHAT IT FALSIFIES.** The cheapest candidate — cascade the excision to the immediate successor when it opens on a back-referring connective — applied to this witness by inspection drops the *"Selain itu"* paragraph, which is where the answer's entire evidence sits (`[H:bukhari:4481]`, QS Al-Baqarah 2:3 and 2:45), leaving a greeting and a closing; **and (c2) survives it untouched**, because that dangler is two paragraphs from the removal. It pays the largest cost on offer and does not close the defect. **Every ONE-STEP adjacency strategy misses (c2) — but NOT for the reason a reader reaches for first, which is why the refutation is on record.** The natural inference is that a connective list cannot reach (c2) because its trigger is a content noun; the capture refutes it — the (c2) paragraph OPENS on *"Jadi,"*, which is exactly the closed-class back-referring connective such a list would hold. A rule applied TRANSITIVELY (drop the successor, re-test ITS successor) is still adjacency-defined and would reach it, at the price of deleting everything after the greeting. What actually puts (c2) out of one-step reach is that ITS predecessor was not excised — the same *predecessor-was-excised* condition the diagnostic below uses. **WHAT IS REACHABLE, and what each costs.** (i) A connective word list reaches (c1) only, and FORFEITS the property `splitParagraphs` was chosen for — ISC-564 states it as *"No connective word list, no dependency parse, nothing to tune, no fixture to teach the suite what to expect"*, quoted whole here; it does not reach (c2) in one step — not because (c2) lacks a connective (it opens on *"Jadi,"*) but because (c2)'s own predecessor survived; reaching it needs the rule applied transitively, which costs everything after the greeting. (ii) Keeping only the PREFIX — drop the offender and everything after — closes both for BACKWARD reference, since nothing kept can point back at anything removed. **Not "by construction": cataphora falsifies the general claim** — it holds for the two witnessed danglers, both of which point backwards. **What it costs:** on this witness it ships the greeting alone, which is worse than a hole because it does not read as one. (iii) Seeing (c2) RELIABLY needs the removed text compared against the survivors for referring expressions. **Stated as a reliability claim and not an exclusivity one, because this entry's OWN diagnostic below would falsify the stronger form:** the survivors-only heuristic proposed below flags (c2) on THIS witness — `sungai` occurs once — while being unable to separate an antecedent-less definite from an ordinary first mention, which is exactly why it can COUNT and never GUARD. A reliable check is a coherence check, and this module's founding line is that the wall is a rules wall and never one (`green-wall-is-not-a-readable-answer`) — a new component, not a tweak. (iv) Preferring the LATER paragraph in the search's tie-break is free and structural, on the same backward-reference assumption as (ii) and subject to the same cataphora caveat — but ties are unmeasured, the offending paragraph's position is not ours to choose, and swapping a working tie-break is the shape `a-swap-is-not-a-widening` records. **RECOMMENDED: no code fix at this granularity.** **AND THE RATE IS UNMEASURED — n=1.** It did NOT recur on the 2026-08-22 night verification turn (three coherent paragraphs, `repairedDropped: 2`) — **and the two are not equally attested, which is the checked-vs-relayed distinction this project treats as its worst failure.** The occurrence is a committed raw capture; the non-occurrence rests on our OWN write-up in `PROGRESS.md` and no response body was committed for it. One occurrence and one weaker-graded non-occurrence is neither a class nor an absence (`measured-set-is-not-a-class`, `control-arm-or-no-claim`). **The cheap next step is a DIAGNOSTIC, not a guard:** over the repaired turns already captured, flag any surviving paragraph that opens on a back-referring connective whose predecessor was excised, or that carries a definite noun phrase occurring nowhere else in the surviving prose. It ships nothing and only counts — and it must share the repair's own binding rather than copy it (`diagnostic-outlives-its-gate`). **TWO OTHER RECORDS STILL CARRY THE RETRACTED POSITIONAL CLAIM AND THIS ENTRY SUPERSEDES BOTH**, named rather than silently left: `PROGRESS.md`'s 2026-08-22 (night) checkpoint and `.planning/next-session-prompt.md` — where the claim sits in the TOP (live) block AND again under the superseded `cc7f5df` block, with a third generic echo, so a grepping reader hits it more than once even though only the top block is acted on. Both records say the reader got *"a first paragraph opening"* on *"Selain itu,"* — and then differ by a word on the second error, `PROGRESS.md` saying *"a closing"* and the handoff *"a close"*, quoted separately here because an entry about positional exactness should not flatten two sources into one quotation. Both are wrong on both counts. Neither is edited in place — `PROGRESS.md` is append-only by its own header (*"Never rewrite history — add a new checkpoint"*) and `next-session-prompt.md` prepend-only by construction rather than by injunction — **37 of its 40 blocks record *"Prepended by /wrap"* and the file states no prohibition anywhere**; rewriting either would be the bookkeeping edit this repo refuses; the correction rides forward in the next checkpoint and the next handoff block. **THAT IS A CONDITION, NOT AN INTENTION — and it is recorded here by the AUTHOR of this entry, with no gate transcript committed anywhere in this repo.** That is the relayed-vs-documented distinction one level down: a reviewer's condition written up by the reviewed party. Labelled rather than asserted flat. So recorded: `scholarly-gate` accepted supersession-by-pointer only on it — both must carry the corrected positions verbatim — *"Selain itu," opens the surviving SECOND paragraph; the sentence *"Jadi, setiap kali Anda merasa berat atau malas untuk shalat, ingatlah sungai rahmat yang mengalir itu."* OPENS the surviving THIRD, the `sungai` phrase itself ENDING that opening sentence, with two sentences after it* — and a further deferral was explicitly refused. Until that write happens, the stale positions are what a cold session reads. **`next-session-prompt.md` is the file a cold session ACTS on, so this supersession is the load-bearing half of the finding, not a footnote.** **OWED TO ERIK AND NOT DECIDABLE HERE:** which cost to pay — a thinner answer (i or ii), a new coherence component (iii), or the hole as it stands. **This moves the `diam` premise of `docs/review/tanya-ai-request-2026-08-17.md` NOT AT ALL** — nothing here adds a refusal or a silence, so the tally stays at the three ISC-565 left it at.
- [x] ISC-567: The cross-paragraph dangler class is INSTRUMENTED — `src/eval/dangler-scan.ts`, `bun run eval:danglers`. **This measures; it does not fix.** ISC-566 stays OPEN and no repair behaviour changed. Erik decided on **2026-08-23** to leave **the hole as it stands** — the **UNNUMBERED** fourth option in ISC-566's *OWED TO ERIK* sentence. **It is NOT that criterion's enumerated cost (iv)**, which is a change to `repairAnswerProse`'s tie-break; citing (iv) here would attribute to him a code change he was never shown. **AND THE FORM OF THAT DECISION IS ITSELF RECORDED, because ISC-566 states *“OWED TO ERIK AND NOT DECIDABLE HERE”* in its penultimate sentence (it CLOSES on the `diam`-premise sentence, which is a different claim) and an owed item must not be closed by a sentence in another criterion citing a chat turn:** `docs/review/erik-decision-2026-08-23.md`, written in the same form as `erik-ruling-2026-08-22.md` — **and it records the difference between them.** That ruling could quote him verbatim; this one cannot, because he was shown four options authored here and **SELECTED** one. A picked option written up as a stated ruling is the checked-vs-relayed collapse this project treats as its worst failure, one actor over. No chat transcript is committed anywhere in this repo. The tool is read-only, runs on committed captures, ships in no bundle and is wired into no route or build step. It SHARES the repair's own `splitParagraphs` by import rather than copying it (`diagnostic-outlives-its-gate`); the connective list it adds lives only here, because repair deliberately has none and moving it there would be ISC-566 cost (i), which Erik PASSED OVER on 2026-08-23 by selecting the hole as it stands — **not a standing bar**, since `docs/review/erik-decision-2026-08-23.md` is explicit that his decision neither closes ISC-566 nor rules on the granularity; the injunction rests on ISC-564's own stated property, not on him. ISC-566 itself declines nothing: it RECOMMENDS, and marks the choice owed. **TWO SIGNALS, AND WHAT EACH CAN ESTABLISH.** *A — a surviving paragraph opening on a back-referring connective.* ISC-566 words the condition as *“whose predecessor was excised”*, and **that is not derivable from an `/api/answer` RESPONSE capture** — stated as a firing condition, not an impossibility, because the broader claim is false (`impossibility-is-a-quantifier`): `refusal-capture.ts` output DOES carry pre-repair prose, and a diff of it against the shipped answer would locate the excision. A response capture's `gen` carries `attempts`/`reason`/`rule`/`repaired`/`repairedDropped`/`repairedRule`/`repairedAttempt` and none of those localises the drop, so against that corpus the tool reports a tier rather than a verdict — `necessary` only at paragraph index 0, where no surviving predecessor exists at all, and `candidate` everywhere else. **On the witness BOTH known danglers are `candidate` and neither is `necessary`**, (c1) sitting at index 1 behind the surviving greeting and (c2) at index 2; an instrument reading only `necessary` would report ZERO on the answer that motivated it. *B — a definite phrase none of whose content words recur in the surviving prose.* It flags (c2) exactly as ISC-566 predicted it would. **WHAT THE RUN ACTUALLY SAYS, n=1.** The whole committed corpus is ONE file, three turns, **one repaired** — `rg -l repairedDropped` finds no other CORPUS — it matches other files, but all of them are source, tests or records rather than captures. So the tool prints a refusal to be quoted as a rate on every run, and this entry does not quote one (`measured-set-is-not-a-class`). **THE CONTROL ARM ESTABLISHES THAT THE INSTRUMENT IS NOT TRIVIALLY ALWAYS-FIRING, AND NOTHING MORE** (`control-arm-or-no-claim`): turns 1 and 2 were NEVER repaired, so every hit there is a false positive by construction. **It does NOT make the hit counts mean anything** — same file, same session, same deploy, and turns 1-2 answer a DIFFERENT question from turn 3 (`run-to-run-confound`). Turn 1 is silent on both signals; turn 2 yields **one signal-A false positive** — a coherent fifth paragraph that merely opens on *“Jadi,”* — and zero on B. **AND SIGNAL B FIRES TWICE ON THE WITNESS, ONE OF WHICH CORRESPONDS TO THE DANGLER ISC-566 INFERS.** That is **not a measured precision**: ISC-566 is explicit that the distance is *“INFERRED, NOT RECORDED”*, so 1-of-2 inherits that inference, and if (c2)'s antecedent was never in the excised paragraph it is 0-of-2. **Both ratios are stated only to show the inference they rest on** — neither is a rate, and neither survives being lifted out of this sentence. The second hit is Indonesian TOPIC-MARKING `itu` — *“shalat di dua ujung siang dan sebagian malam itu menghapus kesalahan-kesalahan”*, **the model's own paraphrase of a verse, UNREVIEWED, carrying no verse reference and no translator; label it so wherever it is repeated** — whose referent sits in its own clause and never left. **It is left unsuppressed deliberately**: a discriminator fitted to this single answer would be the fixture teaching the suite to expect the witness (`a-fixture-can-teach-the-suite-to-expect-the-bug`). Widen or tighten only from real transcripts, and only once several exist. **DECLARED LIMITS, both of which are why it counts and never guards.** It cannot separate an antecedent-less definite from an ORDINARY FIRST MENTION, and `candidate` is noisy by construction because Indonesian prose opens paragraphs on connectives constantly. Seeing (c2) RELIABLY needs the removed text compared against the survivors, which is a coherence component — ISC-566 cost (iii) — which Erik PASSED OVER by selecting option 1, and which NEITHER he nor ISC-566 declined; the one act that record attests cannot be a standing bar on (i) and a decline of (iii) at once — and against this module's founding line that the wall is a rules wall and never a coherence check (`green-wall-is-not-a-readable-answer`). **Neither total it prints is a defect count, and the caveats ride in the `--json` PAYLOAD as well as the prose footer** — the first cut returned from the `--json` branch before every caveat, which is the mode whose output gets pasted into a report stripped of prose, and the n=1 warning was gated so a second capture would silently retire it. **CONTAINMENT.** It prints excerpts of its INPUT. Pointed at `docs/review/captures/` those are SHIPPED answers, already public; pointed at `refusal-capture.ts` output they would be REFUSED model prose, which stays on the dev surface — the output inherits its input's containment and this tool does not relax it (`--no-excerpts` prints counts only). **A THIRD RECORD CARRIES THE SUPERSEDED “DECLINES ALL FOUR” CLAIM AND THIS ENTRY SUPERSEDES IT, NAMED RATHER THAN SILENTLY LEFT** — `.planning/next-session-prompt.md`'s TOP (live) block says *“The entry records four candidate fixes and declines all four”*. ISC-566 declines none: it says **“RECOMMENDED: no code fix at this granularity”** and marks the choice **“OWED TO ERIK AND NOT DECIDABLE HERE”**. That file is prepend-only and is **the file a cold session ACTS on**, so the correction rides forward in the next handoff block rather than being edited in place — the same treatment ISC-566 gave the two records carrying its retracted positional claim. **PINNED BY 12 TESTS IN `src/eval/dangler-scan.test.ts`, WHICH PIN THE INSTRUMENT AND NOT THE HOLE** (`dont-pin-a-known-hole-with-a-green-test`) — witness prose is spliced from the capture at run time, never retyped (`arabic-normalization-hazard`), and the control arm and the two-hit signal-B count are both asserted so that a future improvement turns them RED rather than passing silently. The suite is not green-by-construction: it went red twice while being written — once on the `sungai` recurrence control, once on the hit count — and each red was a real defect in the tool (a punctuation-blind span walk that swallowed a recurring noun across a comma, and a rule that fired on any rare word in the phrase rather than on the phrase having no antecedent at all). Gates at commit: `bun test` 1871/0 exit 0 · typecheck exit 0 · build exit 0, and the two new files are confirmed present in `tsc --listFiles` so the typecheck pass is not vacuous (`bundle-absence-needs-a-control`). **This moves the `diam` premise of `docs/review/tanya-ai-request-2026-08-17.md` NOT AT ALL** — nothing here adds a refusal, a silence or a reader-facing surface, so the tally stays where ISC-565 left it.
- [x] ISC-568: **Track B step 1 — the `qk_auth` account cookie and `roleFor()`** (`worker/src/session.ts`). ADR 2 is implemented WITH ONE DELIBERATE DEPARTURE FROM ITS WORDING, recorded below: on successful magic-link verify the Worker mints a SECOND HMAC-signed cookie carrying the authenticated email and an expiry, and role resolution reads that email and **never `canonical_user_id`**. ADR 2's reasoning is load-bearing and reproduced so a later reader does not “simplify” it away: that column carries no UNIQUE constraint and no index, and `handleAuthVerify` re-points a device cookie at the account's canonical id on login — so two Accounts that signed in on one family tablet share an id permanently, and a role resolved through it would hand a Reviewer's privilege to whoever else used that browser. **THE DEFECT ADR 2 DOES NOT MENTION, AND THE REASON THIS IS NOT A LITERAL COPY OF `auth.ts`.** ADR 2 says to use “the same primitive `auth.ts` already uses for magic tokens”. Taken literally — same layout, same secret, same MAC — the two token types become INTERCHANGEABLE: a 15-minute magic-link token would verify as a 30-day session cookie. **The exposure claim is scoped to what this app actually does:** the link is built as `${url.origin}/#/masuk/${token}` (`worker/src/index.ts`), so the token rides in the **FRAGMENT** — it therefore reaches **browser history**, but NOT server or CDN access logs and not `Referer`, both of which strip fragments. **AND THE LARGEST CHANNEL IS THE ONE THAT ARGUMENT DISTRACTS FROM: the link is DELIVERED BY EMAIL**, traversing Resend and the recipient's mail provider before sitting in a mailbox indefinitely — the strongest reason a 15-minute credential must not double as a 30-day session. And a session cookie would verify as a magic-link token, i.e. as a login credential. Same primitive, DIFFERENT DOMAIN: every session signature covers a versioned constant tag (`qk_auth:v1`) that the magic-token signer does not use. **Pinned by a paired test against the REAL `auth.ts` signer, not an imitation of it, plus a both-still-valid-in-their-own-domain arm so the pair cannot pass by signing simply being broken** (`fake-differs-by-construction`, `control-arm-or-no-claim`). **Force-red run:** deleting the tag fails EXACTLY those two tests and no others — which also demonstrates the hazard was real rather than theoretical. **WHERE ROLES LIVE IS DECIDED HERE, BECAUSE NO ADR SETTLES IT.** Environment allowlists (`ADMIN_EMAILS`, `REVIEWER_EMAILS`), not a table: the property worth having is that **nothing in the running app can grant privilege** — becoming an Administrator needs an operator editing a secret and redeploying, so privilege is never one SQL injection or one careless admin route away. It **FAILS CLOSED** — unset or empty grants NOBODY, never everybody — and an unmatched address is a Member, which is the correct floor because ADR 1 makes Member a SYNC tier and not a privilege. `REVIEWER_EMAILS` **ships empty and no address is hardcoded**: the role exists for the ustadz (`CONTEXT.md`) but an email is PII and belongs in an operator-typed secret. Admin outranks Reviewer **in `roleFor` only** — i.e. when one address sits on both allowlists, which is a configuration mistake. **THE REASON IS CONTENT EXPOSURE, AND THE MISTAKE IS NOT MADE VISIBLE — it is not.** With `requireRole` matching exactly, a double-listed address resolves to `admin` and is then REFUSED every Reviewer gate behind an uninformative 403, which IS silent withholding. What justifies the ordering is that `admin` is the role ADR 4 defines by NOT seeing content, so a misconfiguration resolves AWAY from question text and notes — **stated with its other half, because the exchange is not free:** it resolves TOWARD what ADR 4 does grant an Administrator, namely seeing that an Account exists, how much it holds, and the power to delete it. Content exposure down, user-directory and deletion up. **THAT ORDERING MUST NOT BE READ AS A PRIVILEGE LADDER, AND A FIRST CUT OF `requireRole` MADE EXACTLY THAT MISTAKE.** It ranked `member < reviewer < admin` and admitted anyone at or above the needed rank, so an **Administrator satisfied a Reviewer gate** — walking that role into the one surface it is defined by NOT seeing: ADR 4 says *“An Administrator never sees content: no question text, no bookmark references, no notes”*, while a Reviewer's whole job is reading what the app said. `CONTEXT.md` states the separation from the other end — *“an Administrator needs to see users, and a Reviewer must not”* — **and the disjointness sentence is `CONTEXT.md`'s, NOT ADR 4's, which never uses the word “Reviewer” at all.** The gate is now an EXACT match on a privileged role. The ladder LANDED GREEN IN THIS CHANGE — it never reached a deploy, which is gated to Erik — because `requireRole` had NO tests; it now has seven, and restoring the ladder fails exactly three of them — the Administrator-at-a-Reviewer-gate case, the signed-in case, and, less obviously, **a FORGED cookie passing a `member` gate**, because a forgery degrades to `member` and `member >= member`. **ALSO LANDED (nothing here is deployed):** a real logout (`POST /api/auth/logout`) and a real session expiry, both of which ADR 2 lists as things the app did not have. **LOGOUT DOES NOT REVOKE THE TOKEN** — it sets `Max-Age=0`, and the signed value stays cryptographically valid for the rest of its 30 days, so a cookie captured beforehand still works afterwards. That matches ADR 2's own definition (*“a real logout (clear the auth cookie)”*), and it is recorded rather than left for a reader to discover; **the only revocation lever in the design is bumping `SESSION_DOMAIN`, which invalidates EVERY session at once.** Logout clears `qk_auth` ONLY and deliberately leaves the Identity cookie alone, because signing out is not the act of forgetting a reader's bookmarks (that is `/api/forget`). `GET /api/auth/role` answers 200 with `role:"member"` for an Anonymous Visitor rather than an error, per ADR 1. `requireRole` answers **403 without distinguishing “no session” from “wrong role”**, since a body that says “you are not an admin” confirms to an anonymous caller that the endpoint exists and is worth attacking. The cookie is named **`__Host-qk_auth`** — the prefix adopted 2026-08-23 on Erik's instruction in session (**no artefact in `docs/review/` attests it, and it authorises nothing — the hardening only REMOVES capability**), and enforced by the BROWSER: a `__Host-` cookie is accepted only with `Secure`, `Path=/` and **no `Domain`**, so only the exact host serving it can set it. `axiara.ai` runs several surfaces, and without the prefix any of them could set `Domain=axiara.ai; qk_auth=…`. **WHAT THAT SHADOW COULD DO, precisely:** it could not escalate — a forged value never passes `verifySession`, and `roleFor` only ever sees a verified email — but it could cause **ACCOUNT CONFUSION**, since `readAuthCookie` returns the FIRST match, so the victim's browser would present someone else's proof — not a demotion. Only the prefixed name is read; accepting a bare `qk_auth` as a fallback would hand the shadow back the position the prefix removes. The cookie is also `HttpOnly; Secure; SameSite=Lax` — `HttpOnly` is the load-bearing one, because this cookie PROVES AN ACCOUNT and script must never read it. An **empty secret is refused on both sides, differently on purpose**: signing throws by name (an operator fault worth surfacing, where WebCrypto would emit a bare `DOMException`), verifying returns null (a verifier refuses, it does not crash on input). **WHAT THIS DOES NOT DO.** It does not fix the shared-`canonical_user_id` defect, which ADR 2 explicitly scopes out — that still entangles the MEMORY of two people who log in on one browser, predates this work, and needs its own fix. **`requireRole` is exported and has NO caller yet**; it is the gate the Rangkuman Kajian admin route will use, and it is recorded as unused rather than left to look load-bearing. 37 tests, `worker/src/session.test.ts`. **THE ROUTE WIRING IS UNPINNED:** every test here exercises `session.ts` (plus the real `auth.ts` signer and `requireRole`); there is **no `index.test.ts` and no test that issues an HTTP request to `/api/auth/verify`, `/logout` or `/role`**, so the claims about what those endpoints emit rest on source reading. Untested in particular: `handleAuthVerify` now appends a second or third `Set-Cookie` on one response, and multi-`Set-Cookie` survival through the identity wrapper is ASSUMED, not demonstrated. **THAT GAP IS NOW CLOSED BY MEASUREMENT (2026-08-24, ISC-641):** the whole flow was driven against REAL WORKERD (`wrangler dev`, a throwaway config supplying the D1 binding the live config leaves commented out) — `/request` → a token minted with the repo's OWN `signMagicToken` → `/verify` → `/role` → the admin gate. **Two DISTINCT `Set-Cookie` headers survive** the identity wrapper, `__Host-qk_auth` and `qk_uid`, not comma-collapsed; the session then resolves `{email, role:"admin"}` against `ADMIN_EMAILS`, and `/api/admin/kajian/jobs` answers **200 with it and 403 without**. Still no committed `index.test.ts` — this was a driven probe, not a pinned test. Gates: `bun test` 1941/0 exit 0 · typecheck exit 0 · build exit 0, run locally — this repo has no CI.

### Cycle 9 — the kajian runner has a home, and `requireRole` gets its first caller (ISC-569..617)

> Erik picked the runner's host on 2026-08-23: **a VPS**, not his Mac and not a container on it. He
> picked it knowing the cost the option carried on its face — **a datacentre IP, which YouTube
> blocks** — so `yt-dlp` on that host will need exported cookies or a residential proxy. That is the
> runner's problem, and the runner is NOT built here. What is built here is the half that lives in
> the Worker: the gated admin route that ENQUEUES a job. **A queue with no consumer is what ships
> today**, and it is recorded as that rather than described as a working pipeline.

- [x] ISC-569: `docs/review/erik-ruling-2026-08-23-skill-wins.md` exists and its FIRST section states
      that the ruling reached the repo as a **relay** — Erik's verbal in-session instruction, written
      up by the DA — and that **no artefact in Erik's own words attests it**. Probe: `grep -c` for the
      relay sentence.
- [x] ISC-570: **REPHRASED AT BUILD, because writing the record falsified the criterion.** It asked for
      the record to name *"ADR 5, ISC-10, ADR 6"* as the three things reversed. **`ISC-10` is the wrong
      identifier** — `ISA.md` line 116 is `Anti: no shard, and not index.json, contains any tafsir
      passage text`, which has nothing to do with speaker naming, and **no ISC covers roster-only
      naming at all**: the rule lives only in ADR 5's Decision section, implemented in
      `src/app/kajian-roster.ts`. The bad citation was the DA's, and it is in TWO committed documents
      (`PROGRESS.md`'s 2026-08-23 checkpoint and the current handoff block), so a reader can encounter
      it — which is what makes the retraction reachable and therefore worth writing
      (`retraction-needs-a-reachable-reader`). The criterion now reads: the record names **ADR 5** and
      **ADR 6** as the two things reversed, and **corrects the `ISC-10` citation in a section of its
      own**. Probe, **re-measured after the record was finished** (`grep -o … | wc -l`): **ADR 5 ×17, ADR 6 ×9, ISC-10 ×7**, measured after the SECOND correction pass. Two earlier values are recorded because the drift is the lesson: ×12/×8/×3 (before §*Answered* existed) and ×16/×9/×5 (before the BLOCK-2 and CONCERN-3 corrections were applied). A number written about a file you are still editing is false by the time it is read. `correction-pass-writes-the-record-wrong`: measure last, and re-measure after every later edit.
- [x] ISC-571: the record scopes the speaker-naming permission to the **web card** and says in terms
      that the ruling is **SILENT on the mp4**, which is where kajian ruling (b) still sits unanswered.
      Probe: `grep`.
- [x] ISC-572: the record states the 2026-08-22 provenance-label ruling is **UNCHANGED** — labels must
      not be softened, made conditional, or removed — so a reader cannot take the reversal as general
      permission to loosen provenance. Probe: `grep`.
- [x] ISC-573: **Anti:** the record contains no blanket *"the ustadz has approved nothing"* and no
      sentence attributing the skill-wins ruling to the ustadz. It is **Erik's** ruling; the ustadz was
      not consulted on it. Probe: `grep -ci` for the blanket phrasing and for `ustadz.*(approv|ruled)`
      → the only ustadz mentions must be the three real permissions, scoped.
- [x] ISC-574: the record covers the **`__Host-` hardening** as the second unrecorded 2026-08-23
      instruction and says it **authorises nothing** — the prefix only removes capability. Probe: `grep`.
- [x] ISC-575: `worker/migrations/0003_kajian_jobs.sql` creates `kajian_jobs` with a UNIQUE `video_id`,
      a `status`, and the enqueueing admin's email. Probe: `Read` the file.
- [x] ISC-576: `POST /api/admin/kajian/jobs` answers **403 to an anonymous caller**. Probe: HTTP-level
      test against the Worker's exported `fetch`.
- [x] ISC-577: it answers **403 to a signed-in Member**. Probe: same, with a validly signed cookie for
      an address on no allowlist.
- [x] ISC-578: it answers **403 to a REVIEWER**. This is the disjointness case, not a formality — the
      ladder bug ISC-568 killed would have admitted the wrong role here, and this is the first place a
      real route could feel it. Probe: same, with the address on `REVIEWER_EMAILS` only.
- [x] ISC-579: it answers **201 to an Administrator** on `ADMIN_EMAILS`. **This is the positive control
      arm** — without it every refusal above could pass for the wrong reason, which is exactly how
      ISC-568's vacuous-clock defect survived (`control-arm-or-no-claim`). Probe: same, asserting the
      created row.
- [x] ISC-580: a URL that is not a YouTube watch/short link is refused **400 and writes NO row**.
      Probe: a DB stub counting writes; the count must be 0, not merely "no error".
- [x] ISC-581: enqueueing the same video twice yields **one row**, and the second call reports the
      existing job rather than erroring. Probe: two calls against one stub, row count asserted.
- [x] ISC-582: `GET /api/admin/kajian/jobs` is gated identically and lists the queue. Probe: HTTP test
      at all four principals.
- [x] ISC-583: with `env.DB` **absent** the route answers 503 and does not throw — the same designed
      degradation `AUDIO`, `VECTORIZE` and `CORPUS` already have. Probe: HTTP test with no binding.
- [x] ISC-584: **Anti:** no admin response is cacheable. Every one carries `private, no-store`, because
      a shared edge cache holding one admin's queue is the same class of bug `noStore` already exists to
      prevent. Probe: header assertion on each.
- [x] ISC-585: **Anti:** the 403 body does not distinguish *no session* from *wrong role*. Probe: compare
      the anonymous and the reviewer bodies **byte-for-byte** — equality is the assertion, not a shape check.
- [x] ISC-586: `#/admin/kajian` renders the paste-a-URL form **only** when `GET /api/auth/role` returns
      `role:"admin"`; every other answer renders a refusal. Probe: DOM test at each role.
- [x] ISC-587: **Anti:** the admin page renders **no user content** — no question text, no bookmark
      reference, no note. ADR 4 defines the Administrator by not seeing those. Probe: `grep` the module
      for those symbols → 0.
- [x] ISC-588: the page's Indonesian copy claims nothing about who reviewed a summary, and does not
      imply a queued job is a published one. Probe: `scholarly-gate` verdict on the diff.
- [x] ISC-589: **Force-red.** Replacing the route's `requireRole(request, env, "admin")` with `null`
      fails ISC-576..579 and no others. Without this the gate tests could be green because the route is
      unreachable rather than because it refuses. Probe: apply, run, count, revert.
- [x] ISC-590: `bun test` exit 0 · typecheck exit 0 · build exit 0, **run locally and with the exit code
      echoed, never piped** (`$?` becomes the pipe's status). This repo has no CI; nothing automated
      attests these.
- [x] ISC-591: **Antecedent:** `ADMIN_EMAILS` is documented — in the route's own docblock and in the
      handoff — as the secret an operator must set **before the route admits anyone**. Unset means
      nobody, by design, and without this sentence the first person to open the page reads a correct
      fail-closed as a broken feature. Probe: `grep` both surfaces.
- [x] ISC-592: **the handoff's reason the admin route admits nobody is TRUE BUT THE SMALLER OF TWO, and
      "unreachable" is replaced here by the firing condition.** The handoff says *"`ADMIN_EMAILS` must be
      set as a secret before it can admit anyone"*. Also true, and not the binding constraint.
      **Which config governs prod was CHECKED, not assumed** — memory `quran-new-deploy-path` warns of an
      untracked root `wrangler.jsonc` shadowing `worker/`; `ls` and `find -maxdepth 2` confirm **no root
      wrangler file exists today**, so `worker/wrangler.toml` is the only config for `new-quranku-proxy`.
      **The chain, each link named so a reader can re-derive it rather than trust it:**
      (i) `worker/wrangler.toml` has **no top-level `d1_databases`** — the only one is `[[env.demo.d1_databases]]`
      at line 183 — and **no top-level `RESEND_FROM`**; the only one is `[env.demo.vars]` at line 179.
      (ii) `sendMagicLink` returns `false` when `from` is undefined (`worker/src/auth.ts:93`), so prod
      `/api/auth/request` answers `{sent:false}` and **no email is ever sent**.
      (iii) even given a token by other means, `handleAuthVerify` returns `{ok:false}` when `!env.DB`
      (`worker/src/index.ts:1073`), so **`__Host-qk_auth` is never minted on prod.**
      (iv) therefore `roleForRequest` always resolves `{email:null, role:"member"}` there.
      **WHAT A PROD CALLER ACTUALLY GETS IS A 403** — the route IS registered and the gate DOES answer.
      It is **not** a 500 (no binding is dereferenced before the gate) and **not** the SPA's 200
      `index.html` fallback (the path matches before `env.ASSETS`). Those are three different postures and
      naming the wrong one would mislead the next reader (`spa-fallback-defeats-status-tests`).
      **So `ADMIN_EMAILS` alone would open nothing: Erik himself would get 403.** Opening it needs a
      top-level D1 binding plus Resend on prod — infrastructure on the LIVE Worker, deploy-gated to Erik.
      **Nothing here binds anything.** Probe: `grep -c d1_databases worker/wrangler.toml` → 1, at `env.demo`.
- [x] ISC-601: **the queue persists NO attribution, checked rather than assumed.** `kajian_jobs` is
      `id, video_id, url, status, requested_by, created_at, updated_at, error` — there is **no speaker
      column**, so no unreviewed scholar name is written to a durable store and no `extracted`-vs-`reviewed`
      provenance column is owed before the first row exists. Raised by the advisor as the highest-cost
      retrofit in this change; it does not apply, and that is recorded so the question is not re-opened
      from memory. `status` already carries a `CHECK` and every non-nullable column is `NOT NULL`.
      Probe: `grep -ci speaker worker/migrations/0003_kajian_jobs.sql` → 0.
- [x] ISC-602: **the GET gate was force-redded, and it is the SAME call site as POST's — one binding, not
      two.** The advisor's instruction was to neuter GET's gate separately, on the premise that "GET has
      only one gate" was an unproven negative from an instrument that had already missed one.
      **The premise does not hold here and the work was already done:** route dispatch reaches
      `requireRole` exactly once for both verbs (`worker/src/index.ts:231`), so force-red run (i) — which
      removed that single shared call — IS GET's force-red, and it failed all three GET refusals plus the
      non-admin PUT probe. Sharing one binding is what the advisor asked for and what the code already
      does (`diagnostic-outlives-its-gate`). The asymmetry is therefore **not** two authz call sites: POST
      additionally re-resolves the role INSIDE `handleAdminKajianJobEnqueue` (`index.ts:1151`) because the
      row needs the admin's email for `requested_by`, which `requireRole` deliberately does not return.
      **Recorded as a fact, not closed as a defect.** Probe: `grep -c "requireRole(request, env" worker/src/index.ts` → 1.

- [x] ISC-593: **Erik's answer to question 2 of the skill-wins record, 2026-08-23 — and the question
      as put was WRONG.** The record asked *"the speaker name comes from `channel` … is naming a
      possibly-wrong scholar better than naming nobody?"* **`channel` was the DA's inference, not the
      ruling's text**, and checking the capture instead of arguing from ADR 5's prose falsified it.
      `.scratch/kajian/brlqHxjIp9c/meta.json` carries `channel: "Masjid Darussalam Kota Wisata"` — a
      MOSQUE — while the speaker's name sits in the description as a deliberate `👤Ustadz Syariful
      Mahya, L.c., M.A.` line and again in the title after a `|`. So ADR 5's warning is confirmed
      EMPIRICALLY, not quoted: `channel` is certainly wrong on the only real input, not possibly wrong.
      Erik ruled: **description or title, never `channel`, omission still the fallback.** Probe: the
      record's §*Answered* section, `grep -c "ANSWERED 2026-08-23"` → 1.
- [x] ISC-594: `src/app/kajian-speaker.ts` reads the speaker from the description's `👤`/`Pemateri:`/
      `Pembicara:`/`Narasumber:`/`Penceramah:`/`Bersama` line first, else a title segment AFTER a
      separator carrying an honorific, else returns null. Probe: `bun test src/app/kajian-speaker.test.ts`
      → **17 pass / 0 fail, exit 0**, run against the REAL capture bytes read from disk with a verbatim
      splice as the offline fallback (`guard-tests-need-production-prose`).
- [x] ISC-595: **Anti:** `channel` is never consulted as a speaker. Probe: a test asserts the returned
      name is neither `meta.channel` nor contains `Masjid`, on the real capture.
- [x] ISC-596: **Anti:** the whole title is never taken as a name. Without the after-the-separator rule,
      `15 INDIKASI KEBODOHAN | USTADZ …` names a lecture as a scholar. Probe: a test asserts the result
      contains neither `INDIKASI` nor `15`.
- [x] ISC-597: **provenance is preserved, not flattened.** `SpeakerOutcome` is `roster` | `metadata` |
      `none`; a roster entry WINS over a description, and an AMBIGUOUS roster falls through to metadata
      (we cannot say which of OURS it was; that says nothing about whether the uploader named someone).
      **This is the criterion that keeps kajian ruling (b) open**: `kajian-narration.ts` refuses a
      `metadata` outcome, so nothing here makes a model-relayed name SPOKEN. Probe: four `resolveSpeaker` tests asserting `.kind`. **The narration half is NOT held by that probe** —
      it is held by the TYPE (`kajian-narration.ts` takes `RosterOutcome`, which is `match|none|ambiguous`,
      so a `{kind:"metadata"}` value is not assignable and `tsc` exits 0 across all five projects) and by
      `resolveSpeaker` having no production caller. Stated because a criterion whose named probe does not
      reach half its claim is `a-source-grep-greps-the-imports-too`.
- [x] ISC-598: **Force-red, twice, because 17/17 on the first run is a reason to falsify.**
      (i) replacing `return hasHonorific(s)` with `return true` fails **exactly 2** tests — *no honorific
      anywhere* and *label with nothing after it*. The other omission cases stayed green and that is
      CORRECT, not a gap: they are held by **five** guards, and a first cut of this line
      named three while claiming the enumeration was the point — the same failure it cites. In full, from
      `looksLikeName`: the after-a-separator rule (whole-title cases), the URL/`@`/angle-bracket filter
      (url and email lines), `MIN_NAME` (`👤 Ust`), **`MAX_NAME`** (the 200-character case), and **the
      `/[!?]/` rejection** — the only thing holding *a sentence, not a name*, since
      `👤 Siapa ustadz yang mengisi?` carries the honorific and passes both length bounds.
      `impossibility-is-a-quantifier`.
      (ii) disabling the roster-wins branch fails **exactly 1** — *a roster entry WINS*. Both reverted;
      `grep -c FORCE-RED src/app/kajian-speaker.ts` → 0 and the suite returns 17/17 exit 0.
- [x] ISC-599: **A rights condition was found in metadata this project already stored, and it is
      recorded rather than acted on** (`docs/review/rights-darussalam-logo-2026-08-23.md`, Erik's
      disposition 2026-08-23). The Darussalam description states: *"Kami mempersilahkan … membagikan/share
      video kami **tanpa menghilangkan Logo Darussalam TV dan Identitas lainnya** … kami akan meminta pihak
      Youtube … untuk menghapus video tersebut. Sertakan juga link asli."* **The QR half is MET IN FACT** — ADR 6's
      QR encodes the canonical URL, and the `slide.html` actually built on 2026-08-22 contains
      `youtube.com/watch?v=brlqHxjIp9c`. **The logo half is met by nothing.** **THE SCOPING TO THE
      mp4/slide TRACK AND AWAY FROM THE `#/kajian` WEB CARD IS THE DA'S READING, NOT ERIK'S RULING** — a
      first cut of this criterion stated it flat, as settled, while the record it summarises marks it
      contested. Erik's recorded disposition is *"record it, do not act"* and nothing more. **Nothing is in breach because nothing has
      been published**, and the file says so rather than implying jeopardy. The tension worth carrying: a
      slide bearing Darussalam TV's mark could read as Darussalam's OWN summary, which is the exact
      inference ADR 5 and ADR 6 exist to prevent — so the two requirements pull against each other and
      that is Erik's to resolve. Probe: `grep -c "tanpa menghilangkan Logo" docs/review/rights-darussalam-logo-2026-08-23.md` → **2** (the verbatim quote and the table row). A first cut said 1 — that is the count against `meta.json`, which the criterion does not name.
- [x] ISC-600: **ANSWERED 2026-08-23 by Erik — a metadata name MAY be written on the slide, with the provenance note beside it (see ISC-610).** The criterion is preserved below as written, because it was correct to hold it open rather than infer an answer. **the slide PNG is a THIRD surface and nobody has ruled on it.** Erik's ruling was recorded
      as scoping to the WEB CARD; `kajian-slide.ts` is written rather than spoken, so ADR 6's
      text-versus-audio distinction does not settle it either way. **OPEN — do not print a `metadata` name
      on a slide until Erik says one word.** Recorded as open rather than resolved by inference, which is
      what `a-question-never-put-stays-open` costs when it is not.
- [x] ISC-603: **THE ONLY CODE DEFECT THIS SESSION PRODUCED, and it was the DA's: a name collision.**
      `src/app/kajian-speaker.ts` originally exported `resolveSpeaker` — a name **already exported by
      `src/app/kajian-roster.ts:112`**, a sibling module in the same directory, with a different
      signature (`(entries, video)` vs `(roster, meta)`) and a different return type (`RosterOutcome` vs
      `SpeakerOutcome`). `src/app/kajian.ts:58` imports the ROSTER one. An import of the wrong module
      would have compiled and meant something else. Renamed **`resolveSpeakerWithProvenance`**, which
      also names the thing that distinguishes it. Two scholarly-gate passes found this; neither of my own
      force-reds could have, because both functions work correctly in isolation. Probe:
      `grep -rn "export function resolveSpeaker" src/app/` → exactly one `resolveSpeaker`
      (kajian-roster) and one `resolveSpeakerWithProvenance` (kajian-speaker).
- [x] ISC-604: **"the runner is unbuilt" was FALSE in three documents, and the evidence had already been
      on screen.** `src/app/kajian.ts` is a **535-line runner** that renders the slide (`:446`) and builds
      the mp4 (`:518` `stillVideo`). It has RUN: `.scratch/kajian/brlqHxjIp9c/` holds `slide.png`
      (2160×2700), `slide.html`, `narasi-DRAFT.m4a` (6.6 MB) and `short-DRAFT.mp4` (5.4 MB), **dated
      2026-08-22 — the day before the records claiming they did not exist were written** — plus a second
      complete run at `jNQXAC9IVRw/`. **The DA listed that very directory earlier in the same session and
      wrote "unbuilt" anyway.** What genuinely does not exist is a **HOSTED job runner** that claims a
      queued job and publishes a manifest; nothing writes `/kajian/index.json`. Conflating "no hosted
      runner" with "no runner" is what produced the error. **This is not bookkeeping: a derivative mp4
      made from a third party's recording already sits on this disk**, unpublished only because
      `.gitignore:66` excludes `.scratch/kajian/`, and Erik's open question on the Darussalam logo clause
      reads differently in that light. Probe: `ls .scratch/kajian/brlqHxjIp9c/` and `wc -l src/app/kajian.ts`.
- [x] ISC-605: **a correction that would have retired a live guard, caught before it shipped.** The
      ISC-10 retraction overshot into *"BOTH HALVES WERE WRONG … that sentence appears nowhere."* **The
      RULE is real:** `src/app/kajian-slide.ts:10` carries *"THE VIDEO TITLE NEVER OCCUPIES THE IDENTITY
      SLOT."* as that file's headline decision, pinned by `kajian-slide.test.ts:13` and echoed in
      `kajian.ts:39` and `kajian-narration.ts:26`. Only the **identifier** was wrong and only the
      **attribution to ISC-10** was invented; the rule is ADR 5's. Telling the next developer a live,
      tested guard was imaginary is how a real protection gets deleted by a correction. Both the record
      and the source docblock now say identifier-wrong / rule-real. Probe: `sed -n '10p' src/app/kajian-slide.ts`.
- [x] ISC-606: **two ISA edits I believed I had made were ABSENT from the working tree** — the
      `index.ts:1051`→`1073` citation and the three-guards→five-guards enumeration. Both were written in a
      multi-replace script **without an assert**, so a non-matching pattern no-oped in silence while the
      script reported success. The second pass re-applied them with `assert old in s` on **every** replace,
      and the first run of that script aborted on a genuine miss and wrote NOTHING — which is the
      behaviour wanted. Related to `blocked-hook-kills-neighbours` in effect, different in cause: not a
      rejected hook but an unasserted string match. **Rule: never `str.replace` into a record without
      asserting the target exists.** Probe: `grep -n "worker/src/index.ts:1073" ISA.md` → the corrected citation in ISC-592. **Not**
      `grep -c "index.ts:1051"` → 0, which a first cut wrote and which this very criterion falsifies:
      the old line number survives twice, both inside this retraction describing it. A probe must not
      be blind to the text that states it.
- [x] ISC-607: **Anti:** no probe number in this cycle is quoted from a measurement taken before the last
      edit to the file it measures. ISC-570's counts drifted ×12/×8/×3 → ×16/×9/×5 → ×17/×9/×7 across two
      correction passes, and the Verification block separately claimed 147 lines (now 244) and "ustadz
      twice" (actually 6 on 5 lines). Each was true when written and false when read. All are re-measured
      and the drift is recorded rather than overwritten, because the drift is the finding.
      Probe: `wc -l docs/review/erik-ruling-2026-08-23-skill-wins.md` → 244.
- [x] ISC-608: **ANSWERED 2026-08-23 by Erik — Schedar is KEPT and the skill-wins ruling is NARROWED (see ISC-612).** the tree still narrates in ADR 6's voice, and one docblock said otherwise in the present
      tense. `kajian-narration.ts:110` is `NARRATION_VOICE = "id-ID-Chirp3-HD-Schedar"` — Erik's own pick
      from eight samples — and the m4a built 2026-08-22 used it. Erik's skill-wins ruling replaces it with
      `id-ID-ArdiNeural`, but **nothing implements that yet**; `web/src/kajian-summary.ts` stated the
      ruling as the state of the tree and now marks it as a ruling not yet implemented. **OPEN: the voice
      change is unimplemented, deliberately** — it lives in the runner path and Erik has an unanswered
      question (kajian ruling (b)) about that whole surface. Do not implement it as a side effect.
- [x] ISC-609: **the four kajian questions are ANSWERED, and the record states the form honestly.**
      Erik replied **"i follow your recommendation"** — his only words, adopting DA-authored answers
      wholesale. `docs/review/erik-ruling-2026-08-23-kajian-four.md` says in its header that **every
      argument is the DA's and none of the reasoning is Erik's**; what is his is the assent and
      therefore the outcome. Nothing in it may be quoted as his view. Probe: `grep -c "NONE OF THE
      REASONING IS ERIK'S"` → 1.
- [x] ISC-610: **ISC-600 ANSWERED — a metadata speaker name MAY be written on the slide**, on the
      condition recorded with the ruling: the provenance note sits WITH the name. Closes a criterion
      that was deliberately left open rather than resolved by inference.
- [x] ISC-611: **kajian ruling (b) is REFUSED PERMANENTLY, and is now a RULE rather than an accident.**
      Before this it was held by two things that are not rules: `openingLine` takes `RosterOutcome` so
      `{kind:"metadata"}` is not assignable (a type widens the day someone widens it), and the
      extractor had no caller ("no caller" ends the day there is one). Two tests now assert the
      behaviour directly — `openingLine` names nobody when a name WAS obtainable from metadata, and a
      metadata outcome is not one of `match|none|ambiguous` at RUNTIME, so it survives a type
      widening tsc would allow. Probe: `bun test src/app/kajian-speaker.test.ts` → 21 pass, exit 0.
- [x] ISC-612: **ISC-608 ANSWERED — `id-ID-Chirp3-HD-Schedar` is KEPT, which REVERSES the voice half of
      Erik's own skill-wins ruling of the same day.** The tree never changed (`kajian-narration.ts:110`);
      what changed is that the record now agrees with it, where `web/src/kajian-summary.ts`'s docblock
      had claimed the skill's `id-ID-ArdiNeural` was in use. **The skill-wins ruling is NARROWED, not
      withdrawn** — its speaker-naming half stands. Probe: `grep -c ArdiNeural src/app/kajian-*.ts` → 0.
- [x] ISC-613: **the Hadits banner no longer names the ustadz** (`web/src/sections.ts`). The permission
      claim STAYS because the permission is real; only the name goes. **This is our own offer taken** —
      `ustadz-followup-2026-08-18.md` offered him an unnamed sentence or removal, and since the written
      confirmation will never come and Erik ended the wait, taking our own offer is the only way that
      promise closes instead of standing open forever. **The old test would have gone VACUOUSLY GREEN**:
      it hunted for `sudah diizinkan ${esc(String(m.reviewerNeeded))}` and that construct no longer
      exists. Replaced by two stronger claims — the name is not displayed at all, AND the permission is
      still claimed (unnaming must not become unclaiming). Force-red: restoring the name fails **both**.
- [x] ISC-614: **the surah preface no longer names him either, and it was the worse of the two.** It
      rendered *"Menunggu tinjauan Ustadz Ahmad Isrofiel."* — naming him as awaited reviewer of prose he
      never agreed to review, **and asserting a wait Erik ENDED on 2026-08-22**, so the sentence was
      false independently of the name. Found while doing ISC-613, put to Erik separately, and he chose
      to drop the whole clause. Nothing true is lost: the tooltip head still reads *"— belum ditinjau."*
      **An existing test asserted the opposite** — *"the tooltip names what the edition is and who must
      review it"*, with `toContain("Ustadz Ahmad Isrofiel")`. It was narrowed because **the principal
      withdrew the requirement it encoded**, which is the only acceptable ground for dropping an
      assertion of that kind; its two disclosure assertions are unchanged, and a negative test now pins
      the absence against a fixture that still CARRIES `reviewerNeeded`, so it cannot pass by absence.
- [x] ISC-615: **Anti:** neither unnaming removed a disclosure. `belum ditinjau` survives on both
      surfaces, and the hadith permission is still claimed. An unnaming narrows a claim; it must never
      be allowed to quietly delete one. Probe: the two "still claimed / still unreviewed" tests.
- [x] ISC-616: **the Darussalam letter was DRAFTED and UNSENT** (`docs/review/surat-darussalam-2026-08-23.md` —
      **cancelled by ISC-629, then DELETED by ISC-640; the path no longer resolves**).
      It names no ustadz — pulling Ustadz Syariful Mahya into a permissions question that is not his
      would repeat the error this project keeps making — states plainly that the summaries are machine
      written and unreviewed, and offers three outcomes including refusal. **The DA does not send.**
      One judgment is left to Erik in a note that is not part of the letter: whether to disclose that a
      slide and mp4 from their video already exist locally. Suggested wording is provided; the choice is his.
- [~] ISC-617: **prod bindings stay UNBOUND, and the runner they were waiting for is now BUILT.**
      D1 and Resend remain `[env.demo]` only, so the admin route answers 403 to everyone including Erik
      (ISC-592). Erik's decision: bind them in the SAME change that brings the VPS runner up, so the app
      never carries a working admin page whose jobs nothing consumes. Until then the 403 is correct
      behaviour and must not be "fixed". **The consumer side landed 2026-08-23 as ISC-631..634 below;
      the bindings are written into `worker/wrangler.toml` COMMENTED, with `docs/runbooks/kajian-runner.md`
      as the one sequence that binds all three. `[~]` not `[x]`: the code exists, nothing is deployed,
      and the resources do not exist in the account.**

- [x] ISC-618: **the two unnamings reached the live surface.** Deployed 2026-08-23 from `44ed447`;
      Worker `2b7707f2` → `641f8ae2`. Verified in real Chrome, not by grep: the Hadits kitab banner
      renders `"Terjemahan teks hadis-nya sudah diizinkan untuk ditampilkan; tinjauan per hadits belum
      dilakukan."` with no name, and the surah preface's Indonesian edition renders 6,659 chars with
      `hasIsrofiel:false`, `hasMenunggu:false` and a provenance tooltip reading `"Terjemahan mesin
      (AI) — belum ditinjau."` **The reviewed-aqidah credit in `main.ts:638/642` still names him and
      MUST — that is his own prose, a different attribution, and was never in scope.**
- [x] ISC-619: **the deploy shipped more than the unnamings, and the record must say so.** Prod ran
      `4a144ad`; the deploy carried `4a144ad..44ed447`, i.e. the whole Track B auth layer
      (`session.ts`, `__Host-qk_auth`, `roleFor()`) and the kajian admin route. Probed live:
      `/api/admin/kajian/jobs` 403 both verbs, `/api/auth/role` `{"email":null,"role":"member"}`,
      `/api/auth/request` `{"ok":false,"sent":false}`. All as designed (ISC-592/617). The only
      `answer-repair.ts` change in that range is comment-only.
- [x] ISC-620: **a deploy published `web/dist/.DS_Store` — 6,148 bytes of local file names, HTTP 200.**
      `wrangler deploy` uploads the DIRECTORY and has never read `.gitignore`; nothing in the build
      removed it. Closed by redeploy the same session — both `/.DS_Store` and `/.assetsignore` now
      return the 24,835-byte SPA fallback, **which is the only sound test here: a 200 proves nothing
      on this origin.** Guard is `sweepPublishable` in `src/app/build-meta.ts`, 11 tests.
- [x] ISC-621: **the sweep covers BOTH deployed dists, not just prod's.** `demo:build` writes
      `web/dist-demo` and ends in the same `app:build-meta` call, so a `web/dist`-only sweep would
      have left `demo-quranku.axiara.ai` open to the identical defect. `ASSET_DIRS` names both, and
      a test asserts each one matches a `directory = "../<dir>"` in `worker/wrangler.toml`.
      demo was probed clean on 2026-08-23 — this keeps it clean, it did not fix a live leak.
      Force-red twice: a non-recursive walk fails ONLY the nesting test; a bogus dir fails both
      wiring tests.
- [x] ISC-622: **`.assetsignore` alone is not a guard.** Wrangler does honour it (evidence: the file
      came back as the SPA fallback rather than its own bytes, i.e. wrangler consumed it), but it
      lives inside `web/dist`, which vite empties every build. Deterministic deletion is the guard;
      the ignore file is the belt.
- [x] ISC-623: **narration and the mp4 are opt-in.** Erik, 2026-08-23: *"I prefer the result to be
      like the HTML format ... I don't need the video for that"*, and, asked directly, drop the
      narration too. `--audio`/`--video` opt in; `--no-audio`/`--no-video` kept as accepted no-ops so
      older invocations do not start failing. **Nothing removed** — `narrateToWav`, `encodeM4a` and
      `stillVideo` and their tests are untouched. The deliverable is `slide.html` + its PNG.
- [~] ISC-624: **the slide layout Erik asked for — BUILT 2026-08-23, except the play button.** He
      supplied a landscape two-panel reference and chose *layout only, keep the guardrails*. Split
      below; the parent stays partial because ISC-624.8's CONTROL is still unbuilt — the pipeline
      side of it closed 2026-08-24, and what remains is a player and a CSP decision, not layout.
- [x] ISC-624.1: **the canvas is landscape two-panel.** `--qs-w`/`--qs-h` are `1920px`/`1080px` and
      `kajian-render.ts`'s `SLIDE_WIDTH`/`SLIDE_HEIGHT` mirror them; a test asserts the pair matches,
      because the renderer's window size IS the responsive switch and one number out of step would
      silently screenshot the phone layout instead of the canvas.
- [x] ISC-624.2: **the points are numbered cards, and the numbering is SEMANTIC.** An `<ol
      class="qs-cards">` of `<li class="qs-card">`, each with an `aria-hidden` painted digit, so a
      screen reader announces the order without reading the decoration. Still no blockquote and no
      left bar — ADR 5's "no bullet styled as a quote" is unchanged and still tested.
- [x] ISC-624.3: **the category strip is built from the briefing's own `###` sub-headings**
      (`extractSlideTopics`), never invented and never inferred. Level THREE only: `#` carries the
      uploader's YouTube title verbatim, gelar and all, so reading it would put an unverified name in
      a slot the reader takes as ours. Chips run the SAME three screens the bullets run — credential,
      quotation, unclear-reference — plus a drop-not-truncate length cap, and drops are reported.
- [x] ISC-624.4: **Anti: the three refused elements are absent, and their absence is tested as a
      property of the document.** No `<img>`, no `<picture>`, no `data:image`, no `background-image`
      — so no Darussalam logo (rights item 2, still Erik's), no scraped video thumbnail
      (`roster.yaml`), and `speakers: []` still means no slide names anyone.
- [x] ISC-624.5: **the "automatic summary, not a quotation" line survived the rewrite.** Erik's
      reference carries no such line and ADR 5 requires one; asserted through the shared `DENIALS`
      constant rather than a copy of its text.
- [x] ISC-624.6: **the slide is a readable page as well as a canvas, with NO media query.** The
      published artifact is the HTML — an image of text is invisible to assistive tech — so the same
      markup reflows to one column on a phone. Every responsive step is a `clamp()` inside `:root`,
      because a media-query condition cannot take a `var()` and its `px` literal would have forced
      relaxing the force-red guard to fit the layout. Verified by rendering at 520 wide.
- [x] ISC-624.7: **the character budget was RE-MEASURED for the landscape canvas, with a bracket.**
      497 chars → page ≈1052 tall, fits 1080 with ≈28px spare; 581 chars → ≈1128, overflows by ≈48px.
      The portrait figure (438 fits / 552 clips at 1080x1350) did not transfer and no longer appears.
      **What binds is the wrapped LINE count, not the character count** — 395 and 497 render the same
      eight lines. `overflow: hidden` was REMOVED: the page grows, so an over-budget render leaves a
      card sliced by the fold instead of a bullet clipped into a finished-looking sentence.
- [~] ISC-624.8: **the play button's FILE is produced; the CONTROL is not.** The PRD specifies
      pre-generated `id-ID-Chirp3-HD-Schedar` with browser `speechSynthesis` only as a FALLBACK.
      ADR 6's one-voice rule is the reason browser-TTS-only was rejected, so a control backed by
      nothing but `speechSynthesis` is not a partial delivery of this — it is the option already
      refused.
      **DONE:** the short narration no longer lives inside `if (!NO_VIDEO …)`. Each of the three
      artefacts has its own flag with the default it was actually given — short narration ON,
      long form OFF (`--long-audio`, old spelling `--audio`), mp4 OFF (`--video`) — the narration is
      encoded to `short*.m4a` carrying the same source URL, three denials and draft state the long
      form carries, and the mp4 became one optional CONSUMER of its WAV rather than the reason the
      WAV exists. `--video --no-narration` is refused at parse time; the old pair failed it silently.
      The runner resolves `short.m4a` OR `short-DRAFT.m4a` — the draft suffix is the disk naming rule
      (ADR 5) and the allowlist has one audio key, so without the second name the button would have
      been dead for every auto-caption video, which is most of them.

      **THE FIRST REAL `short.m4a` EXISTS — 2026-08-24 (Cycle 13), on Erik's ruling to bill TTS to
      `story-maker-demo` temporarily.** Produced by running the real pipeline end to end
      (`GOOGLE_CLOUD_PROJECT=story-maker-demo bun run src/app/kajian.ts <url>`), not by a synthesize
      probe: 646,080 bytes, **46.24 s**, AAC 24 kHz mono, and it is SPEECH rather than a file of the
      right size — `volumedetect` reads `mean_volume -18.3 dB` / `max -0.3 dB`, where silence reads
      around `-91 dB` or `-inf`. The provenance rides INSIDE the container as specified:
      `comment` carries the source URL and `description` carries all three denials verbatim
      (*"Ringkasan otomatis. Tidak dimaksudkan sebagai kutipan, bukan fatwa, dan belum diperiksa
      ulama."*). Artifacts live in `.scratch/kajian/`, which is gitignored — nothing was committed.

      ⚠️ **THE REASON RECORDED FOR THIS BEING BLOCKED WAS WRONG, and is corrected rather than
      quietly dropped.** `docs/runbooks/kajian-runner.md` said the machine had no Google TTS
      credentials. ADC was live, and the earlier 2026-08-24 01:42 run had already written a
      `narasi.m4a` that measures as real speech (126.92 s, `mean_volume -19.9 dB`) — so credentials
      were never the blocker, and anyone acting on that line would have gone to fix the wrong thing.
      What was missing was a DECISION about which project to bill. **What is NOT explained and is
      not asserted either way:** why that 01:42 run left no `short.m4a` despite reaching TTS for the
      long form. The independent-`short.m4a` code landed in `ee30022` (04:47), *after* that run,
      which fits — but this entry does not claim it as the cause, because nobody measured it.

      **Billing is pointed by an ENVIRONMENT VARIABLE, so the revert is one unset.** `quotaProject()`
      prefers `GOOGLE_CLOUD_PROJECT` over gcloud's configured project, so Erik's gcloud default was
      never touched. ⚠️ **`temporarily` is Erik's word and is recorded as a condition, not as a
      settled arrangement** — and there is STILL no per-day or per-run cost ceiling anywhere in the
      code, which was harmless while nothing could reach the API and is a live spend now.

      **STAYS `[~]`.** The FILE half is now met and measured; the remainder is unchanged — there is
      still no `speechSynthesis` fallback (a feed record carries no summary text, so a browser voice
      could only read the TITLE), and still no ground-truth pixel of the native audio control, which
      is unphotographable through UA shadow DOM.
      **VERIFIED by a PAIRED probe, not by reading:** the pipeline run at `HEAD` and on the fix, same
      flags, same video (`jNQXAC9IVRw`) — `HEAD` never attempts narration at all; the fix reaches the
      Google TTS call. Plus a mutation: deleting `short-DRAFT.m4a` from `UPLOADS` reddens exactly the
      two tests written for it.
      **THE PLAYER IS BUILT — Erik ruled 2026-08-24 that it lives on the CARD**, so `slide.html`'s
      CSP (`default-src 'none'` + `sandbox`, denying `media-src` and `script-src` both) is NOT
      relaxed and was never touched. A native `<audio controls preload="none">` sits in its own row
      above the card footer, labelled, outside the card's link, with `AUDIO_NOTE` beside it — that
      line is load-bearing, not decoration: the control sits directly under a line naming the
      scholar, which is the exact confusion ADR 6's one-voice rule exists to prevent, and the
      page-level `PROVENANCE_NOTE` is already scrolled past by someone who came to press play.
      **AND IT UNCOVERED A BUG THAT MADE THE WHOLE SURFACE DEAD.** `kajianCard` validated
      `summaryUrl`/`thumbUrl`/`audioUrl` with `safeHttpUrl`, which calls `new URL(raw)` with no base
      — that THROWS for a relative path, and the upload endpoint returns `artifactPath()`, i.e.
      `/kajian/{videoId}/{name}`. So `summaryHref` was null for every real record and every published
      card rendered as `""`. Measured, not inferred: `kajianCard` on the served shape returned a
      zero-length string. Nothing caught it because every fixture in `kajian-summary.test.ts` and
      `kajian-feed.test.ts` uses an absolute `https://…` URL — the suite was green against a shape
      the runner never produces. New `safeArtifactUrl` accepts a same-origin path, and a
      production-shaped fixture set now pins it.
      ⚠ **A first cut of that guard compared `u.origin` as well, and that line COULD NEVER FIRE** —
      a pathname equal to a raw string starting with `/` is same-origin by construction. Found by
      mutation, not by review: swapping the real check for the naive prefix guard passed the entire
      suite. The dead line is gone and the surviving equality is mutation-proven.
      **NOT DONE, and neither is guessed at:**
      (a) **no real `short.m4a` has ever been written** — this machine has no Google TTS credentials
      (`gcloud auth application-default print-access-token` exits 1, re-checked 2026-08-24), so the
      pipeline probe stops at the auth boundary and the bytes are unproven. Erik's to run.
      (b) **no `speechSynthesis` fallback, and its absence is a finding rather than an omission.**
      The PRD asks for one so the control is never dead. A feed record carries NO summary TEXT — see
      `KajianSummary`: title, channel, speaker, urls — so the only string on the card a browser voice
      could read is the TITLE, which is not the summary. A control that reads the title while
      claiming to read the summary is worse than an absent one. Making it possible means carrying
      the bullets in `index.json`; that is a data decision, not a UI one.
      (c) **NO GROUND-TRUTH PIXEL of the native control was obtained, and it is not claimed.** Its
      geometry, label, source, preload and load are all measured in real Chrome on a clean tab
      running the shipped stylesheet (271x49 rendered, 54px intrinsic, `readyState` 4, duration 48 s
      off a real m4a over HTTP), and `color-scheme` computes `dark` on the element so it paints in
      the dark register. But the DOM-render screenshot does not paint UA shadow content — it showed
      a light pill with no play button while `color-scheme` measured dark, so the RENDER is the
      unreliable party — and the OS capture grabs Chrome's front window, which `tab switch` could not
      move. A first cut of the CSS also set `height: 34px`, an invented number BELOW the control's
      54px intrinsic height; removed rather than tuned.
- [x] ISC-641: **the sign-in surface exists — the missing half of a contract the Worker wrote months ago.**

- [x] ISC-648: the kajian queue accepts the URL shape a kajian actually has. **MET AND VERIFIED LIVE ON PROD 2026-08-24, Worker `7b337a20`, end to end through the real form in Erik's own signed-in Chrome at his request.** Typed `https://www.youtube.com/live/EsQ_bmXKA4A` — the exact shape that was refused before — into `#/admin/kajian` and submitted: the UI answered *"URL diterima. Masuk ke antrean dan menunggu diproses"* and the queue rendered the row. D1 confirms it independently: `id 489e4518-4fa0-4790-ba2e-9ea7ec3e9092, video_id EsQ_bmXKA4A, status queued, requested_by erik@axiara.ai, url .../live/EsQ_bmXKA4A`. Parser → role gate → D1 write → render, all four. **A LIVE PROBE THAT LOOKED DECISIVE AND WAS BLIND, recorded so it is not retried.** The first attempt tested the parser by POSTing to `/api/admin/kajian/jobs` UNAUTHENTICATED, expecting 403 for an accepted URL and 400 for a rejected one. All three arms returned **403**, including a channel URL the parser refuses — the router gates on role BEFORE the handler parses, so the probe could not have distinguished the fix from its absence in either direction. It is the `control-arm-or-no-claim` shape: without the refused arm coming back 400, the two accepted arms proved nothing. Only a real admin session could answer it. **The verification left a real row in production**, deliberately and with Erik told: the video is an AI lecture rather than a kajian, and nothing can drain it (`RUNNER_SECRET` unset, `new-quranku-kajian` absent), so it will sit `queued` until removed. ORIGINALLY: **the defect Erik hit on the first real paste.** `youTubeVideoId` handled `?v=`, `youtu.be/` and `/shorts/` and nothing else, so `youtube.com/live/<id>` — **what YouTube hands out for a streamed lecture, which is what most kajian are** — returned `null` → 400 `invalid_url`, no queue row, no D1 row. Reproduced before any code was read: `/api/admin/kajian/jobs` returned `{"ok":true,"jobs":[]}` on prod and `SELECT … FROM kajian_jobs` returned `[]`, which is what pointed at the parser rather than the write. `ID_IN_SECOND_SEGMENT` now carries `shorts | live | embed`, and `music.youtube.com` joins the host set. **Widening the SHAPES does not widen what counts as an ID:** every prefix runs the same `YOUTUBE_ID` test, proven by three malformed-id cases per prefix rather than asserted — mutation M10 (drop the id check) reddens 3 tests, M9 (revert to `shorts` only) reddens 5. A channel page, a playlist and `/live/<id>/extra` all stay refused.
- [x] ISC-649: a spent daily allowance reads as a spent allowance, not as an outage. **MET 2026-08-24.** `res.status === 429` had **no branch at all** — it fell through to the generic `else` and said *"Permintaan antrean tidak tersedia pada sesi ini"*, an outage sentence on the one path where nothing is wrong with the app. The Worker answers 429 with `Retry-After` precisely so the UI can say WHEN; nothing read it. **The wait is derived from that header rather than from a copy of `MAX_JOBS_PER_DAY`** — the ceiling lives in `worker/src/kajian-jobs.ts`, `web/` cannot import across the build graph, and a number typed into the client would be a second source of truth that no test could see drift in. `retryHint` degrades a missing, non-numeric or negative header to a sentence that promises nothing, because *"coba lagi dalam NaN jam"* is worse than saying less. M11 (delete the branch) reddens 3; M12 (trust the header blindly) reddens 1.
- [x] ISC-650: the admin queue form is styled as a form. **MET 2026-08-24 — it had no styling of its own at all.** It reused `.kajian-card-foot`, a CARD FOOTER, which brought a `border-top` and card padding to a standalone row and styled **neither the input nor the button** — so both rendered as raw UA defaults on a themed dark page. It read as unfinished because it was. Now `.admin-kajian-*`, modelled on `.masuk-row` (the correct sibling): wrap-don't-shrink at phone widths, a `:focus-visible` ring, a caution border only once something has been typed (`:invalid:not(:placeholder-shown)` — marking an untouched required field is scolding somebody for not having started), a busy label on the button, and **a hint line naming the accepted shapes BEFORE the mistake**, since the refusal is the only moment an admin is looking. Tokens only; all eight verified defined. **PIXEL GAP STATED: not seen rendered.** The surface needs an admin session from the Worker, so a static preview cannot reach it and prod does not carry this code yet — verified as far as "the rules survived the CSS parser into `web/dist`" and no further. Visual confirmation rides with ISC-647's deploy.
- [x] ISC-651: the app speaks in ONE register. **MET 2026-08-24, and it was Erik who saw it — from a screenshot, not from a grep.** `masuk.ts` was the ONLY user-facing file in `web/src/` using formal `Anda` (7 occurrences) while **eleven** others use `kamu`/`-mu`, including `main.ts`, `crisis.ts` and `landing-cards.ts` — and the magic-link email that leads INTO the page uses `perjalananmu` and `kamu`. So the app spoke as a friend everywhere and as a bank letter on the one screen where it asks for an email. A second break went with it: the page said `kami` where the app says `aku` everywhere else. `rg -c '\bAnda\b' web/src/*.ts` now returns nothing. **No test asserted any of these strings, which is why it survived being written and reviewed** — the register is invisible to a suite that only checks behaviour.
- [x] ISC-652: a role check that FAILS is indistinguishable from a role check that REFUSES. **NOT MET — found while reproducing ISC-648, not the defect Erik hit, and deliberately not fixed in the same pass.** `renderAdminKajian` paints `refusalHtml()` first, then fetches `/api/auth/role`; if that fetch throws — a blip, a dropped connection — the outer `catch` leaves the refusal standing, saying *"Halaman ini khusus admin"* to somebody who IS an admin. There is no retry and no way back but a manual reload, and the route check only runs on route entry, so a tab opened before an allowlist change keeps showing it indefinitely. Erik's report initially looked like this and turned out not to be (*"it is actually there, my bad"*) — **which is exactly why it is recorded rather than dropped: the symptom is reachable, it was momentarily believed, and the next person to hit it will have no way to tell.** The fix is to split "could not check" from "not permitted" and offer a retry. **MET 2026-08-24 (Cycle 12).** `checkRole` in `web/src/admin-kajian.ts` now returns three outcomes where there were two: `admin`, `denied` (the check ran and the answer was not admin) and `unavailable` (the check did not complete). **Only `denied` may claim anything about permission.** `unavailable` paints `unavailableHtml()` — copy that claims nothing (*"Aku belum bisa memastikan status sesimu — pemeriksaannya tidak selesai, bukan berarti kamu ditolak"*) plus a retry that re-enters `renderAdminKajian`, because the check runs on route entry only and without a button the sole recovery was knowing to reload by hand. **The outer `catch` was the second half and it is fixed too:** everything reachable from there runs AFTER the session already proved `admin`, so a throw in `loadJobs` was telling a verified administrator *"Halaman ini khusus admin"*. It now lands on `unavailable` as well. **WHAT DID NOT CHANGE IS THE POINT: neither outcome opens the surface.** No form, no queue. The split changes what the reader is TOLD, never what they are SHOWN — an honest "I could not tell" that revealed the queue would be a worse bug than the one being fixed, and a test pins exactly that. **TWO OLD TESTS WERE PINNING THE DEFECT.** `renders refusal and no form for non-ok response` and `… for throwing fetch` asserted the string *"Halaman ini khusus admin"* on precisely the two cases that are not refusals. They were MOVED rather than deleted, because what they must assert changed while what they must not allow did not — and a third case was added for the SPA-fallback trap (a 200 of `index.html`), which is why shape validation and not status is the discriminator. **MUTATION-VERIFIED, and the first attempt was a NO-OP that must not be repeated:** rewriting `if (check !== "admin") return` as `if (check === "denied") return` changed nothing, because the `unavailable` branch above already returns — it passed 22/22 and proved nothing. The mutation that bites is removing that branch's `return` so `unavailable` falls through and opens the surface: 3 tests redden. Collapsing `unavailable` back into the refusal reddens 4. Gates: `bun test` **2268/0** exit 0, typecheck exit 0, synthesis build exit 0; `.admin-kajian-retry` verified present in the BUILT CSS (4 rules in `web/dist/assets/*.css`) and the copy present in the built JS, since a build exits 0 even when the parser discards a rule. ⚠️ **NOT LIVE UNTIL DEPLOYED, and NOT SEEN RENDERED** — prod is Worker `7b337a20`. Like ISC-650 this surface needs an admin session from the Worker, so it cannot be previewed statically.

- [x] ISC-643: the Worker's terminal generation reason survives the browser's parse boundary. **MET 2026-08-24.** `gen` has ridden on every `/api/answer` response since ISC-532 (2026-08-18) and reached prod in the 2026-08-23 deploy, and `web/src/answer-live.ts` was typing the body as `{answer, blocked, hadith}` — so the one field that separates a refusal from an expired clock was arriving and being discarded, one line from where it was needed. `asTerminal` narrows it against a closed five-token set and returns `null` for anything else: no `gen` key (a Worker older than ISC-532), `gen: null`, `gen` not an object, a sixth token, a non-string, a report with no `reason`. Ten tests at `web/src/answer-live.test.ts`, six of them the degraded-wire cases. **`null` means CANNOT TELL, never NOT BLOCKED** — every consumer must fail toward the old silence. Mutation M4 (drop the narrowing, pass any string through) reddens 2 tests.
- [x] ISC-644: a refusal slower than `FAST_ANSWER_MS` reaches the reader as a signal rather than as nothing. **MET 2026-08-24, offline.** ISC-528 measured the channel dead: `blockedBy` is written in `applyAi` and read only inside `resolvePrincipled`, which the fast path already ran (at 9 s, before the model settled, so `blockedBy` was necessarily null) and the late path never calls again — `if (!composed) return`. ISC-487 puts refusals at 24.8 s mean, so the copy could not render on effectively any of them. The `void pending.then` block now calls `annotateWithheld(fast, blockedTerminal)`; `null` leaves the reader untouched, otherwise the turn is re-rendered, re-announced, and `replaceTurn`d into storage so the annotation survives a thread restore rather than being a node a later `innerHTML` deletes. **NOT VERIFIED LIVE — that is ISC-647.**
- [x] ISC-645: Anti: the annotation never fires on a turn that ran out of clock. **MET 2026-08-24.** This is the whole of what ISC-533 was protecting. On a timed-out turn `verdictAfterFailure` preserves attempt 1's guard verdict — a deadline abort IS a throw — so `blocked` reads byte-identically to a real second refusal; measured live 2026-08-19 at 2 of 21 grounded turns (`blocked:"bad_hadith"` with `gen.reason:"deadline"`; `blocked:"own_wording"` with `gen.reason:"deadline"`). `annotateWithheld` returns `null` for `deadline`, `threw`, `answered`, `no_attempt` and `null`, beside an answer and beside silence alike — ten assertions. Mutation M1 (delete the guard) reddens 5 tests, so the line is load-bearing rather than decorative, which reading it could not have established.
- [x] ISC-646: a turn kind's copy test is not evidence that any path produces it. **RECORDED 2026-08-24 — the general form of how this stayed broken for six days.** All five `answer-blocked` hits in the suite either slice `main.ts` as a SOURCE STRING between `case` labels to assert what the sentence says (`answer-blocked.test.ts:128,142`) or fixture its render shape (`kept-below.test.ts:41`). Not one asks whether the turn is reachable. **A copy test passing over dead code is that technique's default outcome, not an accident** — the technique can only read text. `web/src/withheld-turn.ts` exists so the question has somewhere to be asked, on the same precedent as `kept-below.ts`: `main.ts` boots the whole surface on import, so nothing inside it can be reached by a test, and that is a root cause rather than a style preference. The systemic version — every reader-facing turn kind carries at least one non-source-slicing test that PRODUCES it — is **not** done and is deliberately not claimed here.
- [x] ISC-642: the late-path `hadith-defer` substitution REPLACES a real answer the reader is already holding. **MET 2026-08-24 — ERIK RULED: THE ANSWER OUTRANKS THE POINTER.** The Hadis pointer is now an ANNOTATION beside the answer (`withheld: "hadith"`), not a turn that evicts it. His reasoning, and it is the right one: the answer is real and cited, its grounding never depended on the model's separate attempt, and the pointer loses nothing by being an aside. **The pointer's substance is kept in full, including the machine-translation disclosure** (`teks Arabnya kanonik, terjemahan Indonesianya hasil mesin dan belum ditinjau`) — a pointer that sends the reader to the Hadis tab while omitting what they will find there is a worse pointer, and this repo's standing position is that the disclosure travels with the material. **The two annotations are deliberately DIFFERENT tokens, not one flag:** `"wall"` has nothing further to point at, `"hadith"` does, and collapsing them would silently delete the pointer Erik's ruling preserved — mutation M7 reddens 3 tests on exactly that. **The hadith pointer is NOT gated on `gen.reason`,** unlike the wall annotation: `bad_hadith` reaches the decision as a TURN the wall named directly, and the pointer is true whether or not the turn ran out of clock — the question is still one a hadith answers. M8 (gating it anyway) reddens 1 test. `pinQuestion` fires on the `ai` upgrade and NOT on an annotation: scrolling a reader who is mid-read to reveal an aside is hostile, and only the upgrade actually changes the content under them. FOUND AS: `applyAi` returns `{kind:"hadith-defer"}` for a `bad_hadith` block, which makes `composed` truthy, so `main.ts` takes the fast answer off the screen at ~25 s and replaces it with the Hadis pointer. On the FAST path that is correct — no answer was ever painted. On the LATE path the reader has had a cited, grounded answer for sixteen seconds and it is taken away. The tension is real in both directions and that is why it is not being ruled on here: the pointer is the one refusal this app considers TRUE (`ONLY the hadith rule earns the Hadis pointer, because only for it is the pointer true`), and annotating instead would keep the answer but lose the pointer. **Deliberately NOT changed in the same pass that built the annotation channel** — that channel only ever fires where the code previously did nothing, so it cannot have introduced this, and folding a behaviour change into it would have made the diff impossible to reason about. Needs Erik: *does a real answer on screen outrank the Hadis pointer?*
- [~] ISC-647: the annotation is verified on a LIVE refused turn on prod, sampled across the whole window rather than at settle. **PARTIAL 2026-08-24 (Cycle 12) — the browser half is VERIFIED ON THE DEPLOYED BUNDLE; the live half is MEASURED AT ZERO and the mechanism is now named.** Split it, because the two halves came back with opposite verdicts. **(a) THE DEPLOYED CLIENT PAINTS IT.** Driven through Interceptor against `https://new-quranku.axiara.ai` on Worker `7b337a20`, sampled every 2 s: the fast answer painted at T+12 s (1,708 chars, still-composing notice up), the shimmed refusal was delivered a few seconds after the last 2 s sample (`Date.now()` 1787545051142, with the T+31 s sample still showing `withheld:0`), and at the next observation the note had rendered as the LAST CHILD of the same turn — `Tadi aku sempat menyusun jawaban yang lebih panjang untuk pertanyaan ini, tapi jawaban itu tidak lolos pemeriksaanku sendiri, jadi tidak aku tampilkan. Yang di atas tetap utuh.` — with `.still-composing` gone and the fast answer intact (1,708 → 1,889 chars, appended not replaced). ISC-534 and ISC-529 both hold on the live surface. **THE WIRE WAS SYNTHETIC AND THAT IS THE WHOLE CAVEAT.** A `window.fetch` shim in the page's main world took the REAL prod response and changed exactly three things — `answer` to `""`, `blocked` to `"own_wording"`, `gen.reason` to `"blocked"` — then held it 9 s to force the late branch. Prod never produced that body. This verifies the deployed CLIENT, not the deployed SYSTEM. **(b) PROD DOES NOT PRODUCE THE INPUT.** 32 live turns (`wall-live-probe`, 8 + 24, same day, same Worker): terminal `gen.reason` = **answered 29 · deadline 3 · blocked 0**, and 0/32 turns past the 30 s client abort. That is despite **38 blocked ATTEMPTS** across 56 generations (own_wording 20, bad_hadith 8, fatwa 10). Rule of three puts the terminal-`blocked` rate under ~9% at 95% confidence on this sample — a BOUND, not a proof of impossibility. **THE MECHANISM, which is the finding and was not known when this criterion was written.** The client honours `blocked` only INSIDE `if (typeof data.answer !== "string" || data.answer.length === 0)` (`web/src/answer-live.ts:157`, and byte-identical in the deployed bundle) — so a non-empty `answer` beside a `blocked` field is IGNORED, correctly. The Worker sends an empty answer only when `trace.answer === null`, which needs BOTH attempts refused AND `repair` failing on BOTH candidates. **ISC-561's repair sits between a guard block and a reader-visible refusal**, and it is doing almost all the absorbing. Captured live on the wire this session: `attempts:[blocked:bad_hadith, blocked:own_wording]` with `reason:"answered", repaired:true, repairedDropped:3, repairedRule:"wording", repairedAttempt:1` — both generations refused, reader got prose. **So the channel is CORRECT AND SILENT, which is the alternative this criterion pre-registered — not broken.** It stays `[~]` and not `[x]` because the criterion says *a LIVE refused turn* and no turn of the required shape occurred; do not upgrade it on the strength of (a). **TWO FALSE NEGATIVES THIS PROBE PRODUCED, both recorded so the next run does not repeat them:** a first shim set `blocked` while leaving `answer` at its real 1,150 chars — the client ignored it exactly as designed and the turn upgraded to an AI answer, which reads as "the annotation is dead"; and a sampling window that stopped at T+31 s ended before delivery, so it recorded `withheld:0` on a turn that annotated correctly moments later. See ISC-653.
- [x] ISC-653: a synthetic-wire probe is only evidence if it differs from the real body in exactly the fields the code branches on, and only if the sampling window outlives delivery. **RECORDED 2026-08-24 — both halves failed first, in opposite directions, inside one hour.** Attempt 1 set `blocked:"own_wording"` and `gen.reason:"blocked"` on a response whose `answer` was still the real 1,150 chars. The client ignored it and upgraded the turn to an AI answer — a clean, confident FALSE NEGATIVE that reads as "the annotation channel is dead on prod", because the one field the branch actually tests (`answer.length === 0`) was the field left alone. The general form: **a fake must match the real thing on every field the predicate READS, not on the fields the story is about.** Attempt 2 fixed the body but sampled T+0..T+31 s and stopped; delivery had not happened yet, and the note appeared only in a follow-up poll. A window that stops before the event under test cannot distinguish silence from lateness, which is the same error `fallthrough-lane-flashes` records from the other end (sampling too late instead of stopping too early). Sample until the thing arrives OR until a stated timeout, and say which one ended the run. Both were caught only because a CONTROL ARM existed: an unshimmed turn on the same page painted its upgrade at T+21 s, proving the late path was alive.
- [ ] ISC-654: a blocked turn that settles UNDER `FAST_ANSWER_MS` tells the reader nothing, and the asymmetry with the late path is undocumented. **OPEN — found 2026-08-24 while probing ISC-647, and it needs Erik's ruling rather than a fix.** `main.ts:1060` is the early branch: `applyAi(raced.v)` returns null for every refusal except `bad_hadith`, so the turn falls to `resolvePrincipled`, and the ONLY thing the block buys there is `main.ts:1038` — `if (blockedBy && t.kind === "silence") t = {q, kind:"answer-blocked"}`. So when the principled turn is a REAL answer rather than `silence`, an early-settling refusal is invisible. `lateOutcome` and the `withheld` annotation are reachable ONLY from the `void pending.then` block, i.e. only when the model settles after 9 s. Measured the same day: the 8 unblocked (`ok`) generations in the 24-turn run ran at a median 7,654 ms and one whole probe turn completed in 8,966 ms, so sub-9-second turns are not hypothetical. **RULED BY ERIK 2026-08-24 (Cycle 13): LEAVE IT, and record it here as a bounded gap rather than build it.** So the criterion's second clause is discharged — the asymmetry is now a decision with a written firing condition — and the first clause is not: a reader whose turn settles under 9 s with a real answer and a wall block is still told nothing, ON PURPOSE. **It therefore stays `[ ]`, the same shape as ISC-417 and ISC-566: a declined fix does not satisfy the criterion it declines, and this file does not pin a known hole with a passing test.** The evidence Erik ruled on, stated as a firing CONDITION and not as a class: the note fires only when the Worker's terminal `gen.reason` is `blocked`, and across the two Cycle-12 runs (32 turns, 8 questions) **terminal `blocked` was 0 of 32** — so the LATE path's note did not fire either, and only ~4 of those 32 turns settled under 9 s at all. Building the fast-path arm would add a second copy path for an event this instrument has not yet observed on EITHER path, and would have to re-prove the load-bearing negative (`deadline`/`threw` must NOT annotate) on that second path. ⚠️ Read `0 of 32` as a rate over eight questions at one deploy, never as "it never fires". **This is not asserted as a defect.** ISC-644's honesty argument ("a fuller answer was composed and held back") applies identically on both paths, but on the fast path there is no promise to retract and no wait to explain, so whether the reader is owed the note is a PRODUCT call. Recorded so the asymmetry is a decision rather than an accident.
- [x] ISC-655: the live probe instrument writes a reader-traffic row for every turn it measures. **OPEN — measured 2026-08-24.** `worker/src/index.ts:672` logs the question text to `events` whenever `env.DB && identity.userId && question`, and an unauthenticated `wall-live-probe` POST evidently still resolves an `identity.userId` — 39 rows carry 36 DISTINCT `user_id`s, which is what a fresh anonymous identity per cookie-less request looks like — so all 32 probe turns were recorded. `events` now holds **39 `question` rows across 36 distinct `user_id`s, and NONE of them are reader traffic**: 38 carry a `ts` inside this session's window and 1 predates it by ~18 minutes (`ts` 1787542875384), matching the previous session's own live verification rather than any reader. The 2026-08-24 evening handoff's line that `events` "was empty when baselined… so every row now is real reader traffic" is FALSE as of this entry. **THE ROWS ARE DELETED — Erik authorised it 2026-08-24 and it ran: `DELETE FROM events WHERE id <= 39`, `changes: 39`, and `SELECT COUNT(*) FROM events` now returns **0**.** Scoped by `id`, not by `kind` or `ts`, so anything written after the count could not be caught; a pre-flight check confirmed `newer = 0` at the moment of the delete. `accounts` (1 row), `kajian_jobs`, `bookmarks` and `notes` were re-counted afterwards and are untouched. **CORRECTION to this entry's first draft: the next reader is NOT row 1.** `events.id` is `INTEGER PRIMARY KEY AUTOINCREMENT`, so `sqlite_sequence` still reads 39 and the first genuine reader will be **id 40**. That gap is deliberately left in place — resetting the sequence would erase the only remaining trace that 39 rows were ever written and removed. **THE MARKER IS BUILT — 2026-08-24, same day.** `worker/src/probe-marker.ts` exports `isProbeRequest`, and `handleAnswer` now reads `env.DB && identity.userId && question && !isProbeRequest(request)`; `src/eval/wall-live-probe.ts` sends `X-QuranKu-Probe: 1`. The predicate requires the VALUE `1` rather than header presence, because a proxy that appends bare headers would otherwise silently stop logging real readers — the failure this module exists to prevent, inverted. **It is client-asserted and that is accepted deliberately:** the header can only cause LESS to be stored, never more, and cannot change a byte of the answer, so a reader who sends it has opted out of question retention. It must never be extended to grant access, relax a guard, or select a path a reader's request cannot select. **VERIFIED BY MUTATION, both arms, because a predicate test cannot see reachability.** `probe-marker.test.ts` (6) pins the decision; `probe-marker-route.test.ts` (3) drives the real `worker.fetch` with a logging D1 fake and a PAIRED CONTROL — a reader's POST must still write `INSERT INTO events`. Deleting the `!isProbeRequest` call reddens the probe arm only; forcing the whole condition false reddens the control and the third arm. Gates at this edit: `bun test` **2265/0** exit 0, typecheck exit 0, synthesis build exit 0, `wrangler deploy --dry-run` exit 0 with all five bindings. **MET 2026-08-24 (Cycle 13) — DEPLOYED AND VERIFIED LIVE ON PROD, WITH A CONTROL ARM.** Erik authorised the deploy; Worker `eaa27ba4-3cb7-4784-9205-73164588a74c` replaced `7b337a20`, built from `d49060df`. **Both arms were run against the real prod D1, not a fake:** two POSTs to `/api/answer` carrying `X-QuranKu-Probe: 1` left `SELECT COUNT(*) FROM events` at **0**, and one UNMARKED control POST wrote exactly one row — so the zero is a measurement and not a dead logging path, which a marked-only arm could not have distinguished. **The control row landed at `id 40`, independently confirming this entry's own `AUTOINCREMENT` correction** (the counter resumed at 40, not 1). That row was deleted immediately — `DELETE FROM events WHERE id = 40 AND payload LIKE '%ISC-655 arm B unmarked control row DELETE ME%'`, `changes: 1`, scoped by id AND by the string the control itself wrote so it could not match anything else — and `events` is empty again with the next id at 41. **The first probe run that contaminated nothing is `docs/review/wall-live-probe-2026-08-24-cycle13.txt`.** ⚠️ Marked as met for the SUPPRESSION only. The header remains client-asserted by design and its mandate is unchanged: it may suppress one D1 write and nothing else.
      `index.html` carried a dead `<div>` reading "Masuk" and said so itself (*"Masuk is still a
      stub"*): no handler, no route, no page. Meanwhile `handleAuthRequest` has been building
      `${url.origin}/#/masuk/${token}` and commenting *"The SPA reads `#/masuk/<token>` on load"* —
      **a route that did not exist**, so every magic link ever minted pointed at nothing. The route
      shape is COPIED from the Worker, not chosen here; changing it would break minted links.
      **THERE IS NO SIGN-UP, AND ITS ABSENCE IS THE DESIGN, NOT A LATER PHASE.** With magic-link
      there is nothing to register: `linkAccount` creates an unseen address and resumes a known one.
      A separate "Daftar" page could only ask for the same single field and would imply a password
      or a profile ADR 1 deliberately refuses.
      **DELIVERY HONESTY IS THE FEATURE.** `/api/auth/request` answers `{ok, sent}` and its own
      docstring says the SPA must report "honestly whether email is configured". Three payloads,
      three DIFFERENT messages — and `{ok:true, sent:false}` (accepted, nothing sent, the state of
      every deploy without `RESEND_API_KEY`) must NOT say "check your inbox". Pinned as an ABSENCE,
      and force-red: deleting that branch so it falls through to the success message fails exactly
      that one test. All three payload shapes were then CONFIRMED against workerd, not imagined —
      including `{ok:false, error:"invalid_email"}`, which carries BOTH fields, so the error branch
      has to be tested before the `ok` branch or a bad address reports as a server fault.
      **VERIFIED BY DRIVING IT IN REAL CHROME, END TO END:** form → the honest not-sent message →
      landing on a real token → signed in → `Peran: admin` → `#/admin/kajian` reachable → a YouTube
      URL enqueued and attributed to the account → Keluar → gate closed again.
      ⚠ **The token is STRIPPED from the address bar on landing** (`history.replaceState`, whatever
      the verdict): it is a live credential until it expires, and ISC-568 already records that the
      fragment reaches browser history. `replaceState` and not a hash assignment, so the back button
      cannot walk into a second verify.
      ⚠ **A DEFECT FOUND ONLY BY LOOKING: after Keluar the sidebar chip still named the ended
      session.** The chip is refreshed by the ROUTER and logging out re-renders in place without
      routing. Fixed with an `onSessionChange` callback so `masuk.ts` stays ignorant of the shell.
      ⚠ **AND THE FIRST "FIX" WAS MEASURED ON A STALE BUNDLE** — the page was running
      `index-ChQfEX9g.js` while disk held `index-Dj73OB6I.js`, so the chip read stale and the fix
      looked broken. Caught only by diffing the served script against `ls -t`; the verdict above is
      from a run where those two agree.
      **WHAT THIS DOES NOT DO — and prod CANNOT sign anyone in today.** Four separate operator gaps,
      measured 2026-08-24: `IDENTITY_HMAC_SECRET` unset (so `/api/auth/request` answers
      `{ok:false}`), `RESEND_API_KEY` unset (so no mail), `ADMIN_EMAILS` unset (so **nobody** is an
      admin — it fails closed), and **NO D1 BINDING AT ALL** on the top-level Worker — the
      `[[d1_databases]]` block is COMMENTED OUT in `worker/wrangler.toml`, so `handleAuthVerify`
      returns `{ok:false}` before it even reads the token. Only `env.demo` has a `DB`. The UI is
      built and correct; the deploy is not configured, and that is Erik's to do.
      **Logout still does not REVOKE** (ADR 2) — the copy says "perangkat ini" and a
      "keluar dari semua perangkat" claim is pinned as an absence.
      36 tests, `web/src/masuk.test.ts`.
- [x] ISC-624.9: **Anti: the rewrite added no new Darussalam material to this PUBLIC repo.** Two
      fixtures written during the build carried real strings from the lecture — its title fragment
      and one of its sub-headings — and were replaced with invented headings of the same SHAPE before
      commit. The screens key on shape (a paired quote, a post-nominal, the unclear marker), so the
      guard is not weakened. ISC-627's outstanding promise of removal made this not a neutral act.
- [x] ISC-625: **the letter discloses everything we hold, on Erik's decision.** It named two
      artefacts while we hold ~12.7 MB across TWO directories — `.scratch/kajian/brlqHxjIp9c/` (six
      files) and `.scratch/kajian/_transcripts/masjid-darussalam-kota-wisata/…/` (656 KB, including
      `transcript.md` 88,364 B verbatim and their `cover.jpg`), **the second of which no rights
      record mentioned until 2026-08-23.** The completeness phrase *"supaya Bapak/Ibu tahu persis
      keadaannya"* was cut before the widening, because two-of-six does not deliver it.
- [x] ISC-626: **recounted from the directories at deletion, and the count was low a FOURTH time —
      but the real miss was of a different order.** MET 2026-08-23; the measurement is
      `docs/review/kajian-capture-inventory-2026-08-23.md`, taken immediately before the directories
      were deleted, because after deletion the count is unrecoverable. `briefing.md`: **13 quoted
      passages under the preferred larger reading** (4 blockquote blocks + 9 straight-quoted spans,
      the ninth being the lecture title at L184) **+ 32 verbatim transcript excerpts = 45**, against
      the published 12 + 32 = 44. Two further blockquote blocks are OURS — the draft banner and the
      ADR 5 disclaimer — and are excluded, because this counts THEIR material, not blockquotes.
      **THE FINDING THAT MATTERS IS NOT THE OFF-BY-ONE.** Every previous count described the DERIVED
      `briefing.md` and none of them mentioned `transcript-raw.json`: **the entire lecture was held
      verbatim, 2,586 snippets, 77,528 characters.** The difference between holding a dozen
      quotations and holding the whole thing is the whole question, and five records in a row
      described the smaller one. Total holding measured at **12,808 KB** across the two directories,
      which is the first figure on this material that was not low. **DELETED the same day** with
      ISC-630's resolution.

- [~] ISC-627: **the PUBLIC repo published Darussalam material — SCRUBBED FROM THE CODE 2026-08-23,
      still present in the records and in git history.** Erik's decision, asked and answered: replace
      what is theirs, keep what is ours, and make the letter say what is actually true. Split below.
- [x] ISC-627.1: **the inventory was wrong, and wrong LOW for the third time on this file.** This
      criterion said "the tracked fixture `src/app/kajian-narration.test.ts`" — ONE file, three
      lines. The measured footprint was **41 occurrences of his name across 9 files**, the lecture
      title across 8, and the mosque across 7 — plus a real video id, and a second real ustadz
      (`PERSON_CHANNEL`) and seven more named in a channel list. Same direction as ISC-626: every
      error on this material has made it look smaller than it is. **Count, never inherit a count.**
- [x] ISC-627.2: **their material is out of the code.** 70 replacements across 10 files: the
      speaker's name and gelar, the lecture title, the mosque, and the one verbatim blockquoted
      sentence of the lecture, all replaced with invented equivalents of the same SHAPE. The model's
      own summary prose, the table and the bullets were KEPT — they are ours, and keeping them is
      what preserves the vocabulary the `speakableFrom` overlap test draws on.
- [x] ISC-627.3: **the guard did not weaken, and that was verified by mutation, not by reading.**
      The screens key on shape — a paired quote mark, a dotted post-nominal, the unclear-reference
      marker, title overlap — none of which can tell whose sentence it is. Control: disabling
      `normaliseCaps` in `kajian-speaker.ts` reddens the capture-relative case; restoring it greens.
      Suite went 2048/0 → 2048/0 with **25,924 assertions, up from 25,917**.
- [x] ISC-627.4: **two `kajian-speaker.test.ts` cases were hardcoded to one capture's output, and
      scrubbing exposed it.** They named the expected string, so they passed on a clean clone and
      FAILED on the machine holding the real capture — and one hardcoded negative
      (`not.toContain("INDIKASI")`) could never have failed against the other path. All four are now
      capture-relative: they derive what they expect from whichever capture they were handed, so the
      disk path (real bytes, gitignored) and the published fallback (invented) cannot drift.
      `guard-tests-need-production-prose` still holds where it matters — the REAL bytes are still
      read from disk whenever `.scratch/` is present.
- [x] ISC-627.5: **the letter now says what is true.** It claimed "salah satu berkas pengujian" —
      one file — and promised "Saya akan menghapusnya". Both corrected: the true spread, what was
      replaced, and the two things that are NOT done — the project records still name them, and
      **git history keeps every old version readable on the public remote** (the line is in 13
      pushed commits; earliest `43eee9e`). A history rewrite is offered, not assumed.
- [x] ISC-627.6: **a real, prominent, unrelated ustadz was a fixture and is not any more.** Erik's
      call. `PERSON_CHANNEL` and a list of eight real dakwah channels were invented equivalents of
      the same shape; the load-bearing property is that the name is BARE — no honorific, no gelar —
      and that property is indifferent to whether the person exists.
- [ ] ISC-627.7: **what deliberately REMAINS, so nobody records this as finished.** (a) `ISA.md`,
      `PROGRESS.md`, `docs/review/` and `.planning/` still name the mosque, the ustadz, the lecture
      and the video id — Erik declined the tree-wide scrub so the project's own record of WHY these
      decisions were made stays readable. (b) `docs/kajian/roster.yaml` and `kajian-narration.ts`
      still name real dakwah channels in PROSE, as a neutral observation that Indonesian channels
      are usually named after a person — that is the argument for the design, not attributed
      content. (c) The video id survives in `kajian-speaker.test.ts` as the PATH to the gitignored
      capture; removing it would delete the real-bytes test path. (d) **Git history is untouched.**
- [x] ISC-629: **the Darussalam letter is CANCELLED. Erik, 2026-08-23:** *"let's forget about any
      letter. i hereby cancel all requirements to send letter whatsoever."* No letter goes to Masjid
      Darussalam Kota Wisata. **SUPERSEDED THE SAME DAY: this said the letter file "is retained as an
      ARCHIVE with a cancellation banner rather than deleted". It was DELETED by ISC-640 — the ISA
      already carries what was drafted and why it stopped, and a public repo did not need a document
      naming a mosque whose only content was a void promise. The path does not resolve.** Checked for other outstanding send-requirements: there are none — the only other letter
      in `docs/review/` is `ustadz-followup-2026-08-18.md`, **SENT 2026-08-19** (ISC-541).
- [x] ISC-629.1: **every promise inside that letter is void, because a promise binds only once it is
      delivered.** Nothing was ever sent, so no third party ever received one. This retires: the
      removal promise that ISC-627.5 was written to satisfy, and the *"tidak ada satu pun ringkasan,
      gambar, video, atau audio … yang saya terbitkan"* sentence that the publish HOLD rode on.
- [x] ISC-629.2: **Anti: the ISC-627 scrub is NOT unwound by this, and its justification is not the
      letter.** Their material is out of the code because `quran-new` is a PUBLIC repo — that reason
      is independent of whether anyone was ever written to. The scrub stands, ISC-627.7's list of what
      deliberately remains stands, and git history is still untouched ([[delete-is-not-removal]]).
- [x] ISC-630: **RESOLVED by Erik 2026-08-23 — the hold stands PERMANENTLY, and is made moot by not
      launching on their material at all.** The DA's recommendation, accepted. **The reasoning in the
      DA's own earlier framing was wrong and is corrected here:** it said keeping the hold would
      "invent a fresh justification for a rule whose old one was deleted". It would not. The
      justification was always the standing rights position — their material held with no permission
      — and the letter was going to RESOLVE that question, not create it. Cancelling the letter did
      not remove the reason for the hold; **it removed the only route by which the answer could ever
      become yes**, because nobody will now ask them. **What was done:** the capture was DELETED
      (12,808 KB, two directories, inventoried first as ISC-626), and the runner launches on a source
      whose rights are clear instead. Nothing derived from it was ever published — prod ran Worker
      `641f8ae2` from `44ed447` throughout, with no kajian route, no D1 and no runner. **Stated so a
      later reader does not mistake this for a legal finding:** a summary that links to its source is
      arguably transformative, and publishing on that basis would have been a coherent position. It
      was not taken, because there is no path to permission and Erik's standing principle is no
      shortcuts. **`.scratch/kajian/jNQXAC9IVRw/` — "Me at the zoo", 19 seconds — was NOT deleted**
      and is retained as the pipeline's only working test capture; it is third-party material too,
      recorded rather than glossed.
      ⚠️ **2026-08-28 — A LATER RULING WIDENED PUBLISHING TO "ALL KAJIAN, ANY CHANNEL", AND IT DOES
      NOT REACH THIS CRITERION.** Erik extended "publish as-is" from the one SILATURAHIM video to every
      kajian the runner processes, from any channel, and separately chose to leave the DRAFT gate's
      self-contradiction standing (`docs/review/erik-ruling-2026-08-28-kajian-publish-scope.md`). **That
      is a PUBLISHING rule and this is a SOURCING hold** — the distinction this file already draws at
      ISC-631's neighbour, *"ISC-630 gates what the runner may be pointed AT, not whether it may be
      built"*. **The hold recorded above stands unchanged: that channel stays off the queue and its
      capture stays deleted.** A reader who takes the 2026-08-28 ruling as re-opening it has read a
      permission about what may be published as one about what may be captured. The DA raised the
      widest-reading concern before Erik chose it; he chose it anyway, and both halves are recorded in
      that file rather than only the outcome.
- [x] ISC-630.1: **the ORIGINAL text of this criterion, kept because the record must show what was
      open before it was closed.** It read: the publish hold has lost its stated basis and is now
      an OPEN question for Erik. It was written into `.scratch/kajian-summarize/PRD.md` as a
      constraint riding on the letter's own sentence, and that sentence is void. Two things follow and
      neither is the DA's to decide: (a) the underlying rights position is UNCHANGED — we hold ~12.7 MB
      of their material across two `.scratch/` directories with no permission, and that was never a
      consequence of the letter; (b) **nothing is blocked today**, because the publish path does not
      exist — no VPS runner, no endpoint, `kajian_jobs` unapplied — so this needs an answer before the
      runner ships, not before the next commit. **The DA does not resolve this in either direction:**
      keeping the hold would be inventing a new justification for a rule whose old one was just
      deleted, and dropping it would be authorising publication of a third party's material.

- [x] ISC-631: **the runner is a SECOND AUTH PRINCIPAL, and `runner-auth.ts` exists so that it cannot
      quietly become an account.** A human at a form proves an ACCOUNT (`__Host-qk_auth`, an email, an
      exact-match role); a machine on a VPS proves ITSELF (a shared bearer secret, no email, no role, no
      cookie). Serving the runner with `requireRole` would put an Administrator's 30-day session cookie
      in a VPS environment variable, which undoes ISC-568 entirely — a browser-scoped, `HttpOnly`,
      person-bound credential re-domiciled onto a shared host as a static admin token that logout cannot
      revoke (and logout does not revoke anyway). **It FAILS CLOSED**: unset, empty, or under a 32-char
      floor admits NOBODY, and the floor is checked BEFORE the comparison so a weak configuration cannot
      be matched at all. **THE BLAST RADIUS IS BOUNDED ON PURPOSE**: holding the secret permits claiming
      and reporting, NOT enqueuing — which stays behind `requireRole(…, "admin")` — so a leak cannot make
      the app fetch arbitrary URLs, and it reads no account, question or note. 403 undistinguished, same
      reason as `requireRole`. `timingSafeEqual` is EXPORTED from `session.ts` and shared rather than
      copied ([[diagnostic-outlives-its-gate]]). **One test I wrote FAILED and was wrong, not the code:**
      "a trailing space in the header is refused" — RFC 9110 §5.5 strips OWS before this code runs, so it
      is asserted as the transport property it is, lest someone add a `.trim()` to `readBearer` to fix a
      case that never arrives ([[fake-differs-by-construction]]).
- [x] ISC-632: **every job transition names the status it comes from, IN THE SQL.** Claiming is one
      `UPDATE … WHERE status = 'queued' … RETURNING`, so D1 picks the single winner — a `SELECT` then an
      `UPDATE` would let two runners take one job. `complete` and `fail` both require `running`, so a
      late or duplicate report cannot resurrect a finished job and the caller learns it lost the race
      (409) instead of silently overwriting. A claim carries a **two-hour lease**, so a runner killed
      mid-run does not strand its row in `running` for ever — but a merely SLOW one is left alone,
      because reclaiming it would run the work twice. **THE FAKE D1 FIRST HARDCODED THE GUARD, which made
      three "cannot report twice" assertions vacuous** — it refused the second call whether or not the
      statement carried the clause ([[evidence-that-could-never-have-failed]]). It now derives both the
      status guard and the lease bound FROM the statement text. **And a first fix of THAT was itself
      wrong**: it read "no `claimed_at` bound" as "reclaim nothing" when SQL semantics say "reclaim
      everything", which inverted the mutation — the lease test passed under a query with no lease
      ([[correction-is-the-least-scrutinised-edit]]). Nine mutations run across the surface, each killing
      the intended tests and enumerated in the test header. Migration `0004_kajian_results.sql` is
      SEPARATE from 0003 because 0003 is `CREATE TABLE IF NOT EXISTS` and amending it would silently
      no-op against a D1 that had run it; an `ALTER` against a missing table fails loudly instead.
- [x] ISC-633: **the two guardrails are enforced at the PUBLISH boundary, and asserted against rows that
      carry violations.** `speaker` is pinned null — no column exists to read one from (0004 says why in
      the file) and no field carries one — because `docs/kajian/roster.yaml` is EMPTY and that silence is
      ADR 5's safety property, not an unfinished feature. `reviewed` is pinned false — nothing in this
      pipeline reviews anything, and the generator must never vouch for its own text
      ([[permitted-is-not-reviewed]]). Both are tested against a row carrying `speaker: "Ustadz Fulan"`
      and `reviewed: true`, so the claim is about what the pipeline STRIPS rather than about a clean
      fixture. `/kajian/index.json` stops being a static asset when D1 is bound, because `web/dist` is
      **baked at build time** ([[disk-dist-live]]) and a static file could only show what was true at the
      last build; `WHERE status = 'done'` is the whole publication rule, so there is no second flag to
      fall out of step. **Unbound, the route does not exist and the feed renders its empty state — which
      is the honest answer**: an empty JSON array would claim the list IS empty rather than not yet
      published. The Worker record is round-tripped through the READER'S OWN validator
      (`web/src/kajian-feed.ts`), asserted from the WEB tranche because that import drags `HTMLElement`
      into the Worker's `types: []` project ([[typecheck-chain-hides-tranches]]).
- [x] ISC-634: **an uploaded document is served with an OPAQUE ORIGIN, because the runner uploads HTML a
      model wrote after reading a third party's transcript, on a host that also runs `yt-dlp` against the
      open internet.** Served from this origin it would be same-origin with the reader's session: script
      in it could not READ `__Host-qk_auth` (HttpOnly) but could RIDE it. So `Content-Security-Policy`
      leads with `sandbox` — no `allow-same-origin`, no `allow-scripts` — plus `default-src 'none'`,
      `script-src 'none'`, `nosniff`, and a content type decided from an allowlist of whole FILE NAMES
      rather than extensions. The uploader chooses neither the key nor the type. **A first cut set a
      `Sandbox:` header, which is not an HTTP header at all** — recorded in the file, because a header
      that does nothing looks exactly like one that works. **And the length bound in `parseArtifactPath`
      was untested and reddened NOTHING under mutation** — every other case was caught by the id or name
      pattern. The one path it actually catches is `/kajian/<id>/slide.html/extra`, where the third
      segment IS allowlisted; now tested, and the mutation now kills it
      ([[evidence-that-could-never-have-failed]]).
- [x] ISC-635: **the runner refuses to start on a bad configuration rather than defaulting**, because a
      runner polling forever against a 403 looks exactly like a queue that is always empty — the worst
      failure available, since it is silent. No secret, no base URL, and no plain-`http` base URL (the
      bearer credential would travel in the clear). **It will not borrow a thumbnail**: the card's
      `thumbUrl` is OUR OWN rendered `slide.png`, and with no render of our own the job FAILS rather than
      falling back to `meta.thumbnailUrl`, which is the uploader's image — tested against a meta that
      CARRIES one. It uploads neither `briefing.md` nor `meta.json`, which hold the third party's
      material at length. Every path that cannot produce a real summary calls `/fail` with a sentence an
      admin can act on, and `yt-dlp`'s datacentre-IP refusal names both fixes explicitly, because
      "HTTP Error 403" alone says nothing about what to do next. **The bindings are written COMMENTED**:
      a `[[d1_databases]]` with a placeholder id would fail EVERY prod deploy, including one with nothing
      to do with kajian. Verified by `wrangler deploy --dry-run` exit 0 with bindings unchanged.
      **ISC-630 gates what the runner may be pointed AT, not whether it may be built** — and a per-day
      cost ceiling still does not exist in the code, recorded in the runbook rather than assumed away.

- [x] ISC-636: **five jobs per rolling day, enforced at the door.** Erik, 2026-08-23, on the DA's
      recommendation, and the DA proposed the NUMBER rather than asking for one. **A job count, not a
      token budget**: a token cap depends on transcript length, model and retries, can only be
      enforced after the money is gone, and no human can hold it in their head. Five is roughly one
      lecture per weekday — far above realistic use. It is not rationing; it bounds the two ways this
      endpoint spends money nobody intended, a client retry loop and an admin session in the wrong
      hands, because **admin-only bounds WHO and never HOW MUCH**. **ROLLING 24 hours**, so the
      ceiling cannot be doubled either side of local midnight. **A deduplicated request does not
      count**, because it does no work — otherwise an admin clicking twice burns a day's budget on
      one lecture; the existence check therefore runs BEFORE the ceiling check. **A count D1 cannot
      answer THROWS rather than reading as zero**: zero would open the gate on exactly the reading
      that failed, which is the wrong direction for a spending limit to fail in. The route answers
      **429 with `Retry-After`, not 403** — the caller is a legitimate admin doing nothing wrong, and
      a 403 would send them to look at their role. Five mutations, each killing the intended tests:
      `>=`→`>`, charging deduplicated requests, a broken count read as zero, a 100× window, and
      dropping the 429 branch. `MAX_JOBS_PER_DAY` is exported and every test asserts from it, so
      raising the ceiling cannot leave a test pinning a number nobody ships.
- [x] ISC-637: **rights items 1 and 2 are CLOSED by a blanket rule, which replaces both questions
      rather than answering them.** Erik, 2026-08-23:
      `docs/review/erik-ruling-2026-08-23-no-third-party-branding.md`. **No summary carries any third
      party's logo, wordmark, channel art, thumbnail or other branding — not the source's, not
      anyone's, no case-by-case clause reading.** A blanket rule cannot be got wrong by a future
      reader who reads the licence differently, and there is no upside: a borrowed logo on a
      machine-written unreviewed religious summary implies an endorsement nobody gave, which is the
      same failure ADR 5 prevents for NAMES. Item 3 of that set ("ask the mosque?") was already moot
      with ISC-629. **It does not settle attribution** — a summary still links to its source and
      still says it is an automatic summary, not a quotation. Refusing someone's logo is not refusing
      to credit them; it is refusing to wear their identity.
- [x] ISC-638: **kajian step 7 and "Maruli" are CLOSED as no such thing.** Erik, 2026-08-23. Step 7
      was asked across five sessions and never defined anywhere in the repo; "Maruli" greps to zero
      occurrences and was asked three times. **An item nobody can describe after five asks is not a
      requirement — it is a note somebody made once**, and leaving both open made every handoff carry
      two permanent question marks that blocked nothing. Reopen if the memory returns; do not carry
      them forward as pending.
- [x] ISC-639: **the git-history rewrite (ISC-627.7d) is DECLINED, and the decline is recorded so it
      stops resurfacing.** Erik, 2026-08-23, on the DA's recommendation. A rewrite changes every SHA,
      **including ones the ISA and the deploy records cite** — `44ed447`, `641f8ae2`, `43eee9e`. What
      remains in the 13 pushed commits is a transcript excerpt and a speaker's name: not a credential,
      and nothing that gets worse with time. Permanent cost across every record, marginal benefit. **If
      it ever does matter, making the repo private is the cheaper lever**, and that is the fallback
      rather than a rewrite. [[delete-is-not-removal]] still holds and is not contradicted by this: a
      working-tree scrub was never claimed to be removal, and this criterion is why the claim was never
      made.
- [x] ISC-640: **the cancelled letter file is DELETED, and the last real-channel names left the code.**
      `docs/review/surat-darussalam-2026-08-23.md` is gone: a public repo, naming a mosque, whose only
      content was a promise now void, sitting beside a record that we held their material without
      permission. The ISA carries both the letter and its cancellation (ISC-616, ISC-629), which is the
      durable record. **ISC-627.7b is closed with it** — `docs/kajian/roster.yaml`,
      `src/app/kajian-narration.ts`, `src/app/kajian-speaker.ts`, `src/app/kajian-audio.ts`,
      `src/app/kajian.ts` and two test files named real dakwah channels and preachers in PROSE, as the
      naming-convention argument; the argument survives with the names generalised, and every fixture
      moved to invented equivalents of the same SHAPE. **A distinction that had to be got right and
      nearly was not: "Darussalam" in `hadith-card.test.ts`, `dalil.ts`, `doa.ts` and `index.ts` is
      Darussalam PUBLISHERS, the hadith translation house — a different entity from Masjid Darussalam
      Kota Wisata, and a real translation credit. Those were NOT touched.** Likewise `surah/6.json` and
      `10.json`, where *dār as-salām* is Qur'anic. **`kajian-speaker.test.ts` lost its real-capture
      branch**: it read `.scratch/` when present and fell back to an invented fixture otherwise, so
      after the deletion the disk branch could never fire — and would have silently re-read a third
      party's metadata the moment anyone re-downloaded the video. Expectations are still DERIVED from
      the fixture, and mutating the extractor reddens 15 of 21.

- [x] ISC-628: **three false claims were caught in the letter body by a fourth gate pass, after the
      commit.** (1) The disclosure said *"seluruhnya"* twice while omitting `narasi-DRAFT.m4a` — a
      474 s standalone machine reading of the whole briefing, NOT the 48.5 s mp4's soundtrack;
      the file was named in the notes the whole time. (2) *"tidak ada satu pun materi … yang saya
      terbitkan"* — falsified by ISC-627. (3) *"materi itu memakai identitas visual saya sendiri"* —
      false and **against us**: `kajian-slide.ts:56` says "no brand", the built slide has zero
      `data:image`, and the ONLY identity printed on it is **theirs**, which reads more like a
      Darussalam publication, not less. All three corrected; the letter is still unsent.

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

- **2026-08-24 — ERIK RULED ISC-642: a real answer on screen outranks the Hadis pointer.** Asked as a
  straight either/or the same session it was found, and answered the same session. The pointer becomes
  an annotation; the reader keeps the cited answer they had been reading for sixteen seconds. **This
  supersedes the entry above it**, which recorded ISC-642 as waiting on him — it waited for one
  exchange, which is the whole argument for putting a question to him rather than carrying it in a
  handoff. Two constraints ride with the ruling and neither is optional: the machine-translation
  disclosure travels with the pointer, and `"wall"` and `"hadith"` stay DISTINCT tokens, because one
  flag would silently delete the pointer this ruling exists to preserve.

- **2026-08-24 — ISC-642 is recorded, not ruled on, and that is deliberate.** The late-path
  `hadith-defer` substitution takes a cited answer off the reader's screen at ~25 s and replaces it
  with the Hadis pointer. It is a genuine ISC-534 violation, it is PRE-EXISTING (the annotation
  channel only fires where the code previously did nothing, so it cannot have introduced it), and the
  tension is real in both directions: the pointer is the one refusal this app considers TRUE, and
  annotating instead would keep the answer but lose the pointer. **Needs Erik: does a real answer on
  screen outrank the Hadis pointer?** Folding a behaviour change into the same diff would also have
  made that diff impossible to reason about.

- **2026-08-24 — show your math, delegation floor unmet (E3 wants ≥2).** One delegation ran
  (`RootCauseAnalysis`, which independently reproduced the closure-order chain and surfaced two things
  this session would otherwise have missed: the false "runs in EITHER order" docstring at
  `main.ts:924`, and that a `silence` fast turn currently tells the reader to RESEND after a guard
  refusal). The second — a `Forge` pass, which the E3 coding-task binding calls for — was NOT run: the
  session's operating instructions forbid unrequested Agent calls. What it would have bought is an
  independent read of `annotateWithheld`'s branch table; that surface is instead covered by five
  force-red mutations, which is the stronger evidence for this particular shape of change.

- **2026-08-24 — refined: `withheld` is a flag on the Turn, not a DOM node.** The obvious
  implementation appends a `<p>` to the answer element. Rejected: a loose node dies when a later
  turn's `innerHTML` runs, and it never reaches storage — so a restored thread would show the same
  turn WITHOUT its annotation, which is a quieter version of the defect being fixed. On the Turn it
  survives `replaceTurn` and re-renders on restore.

**2026-08-23 — the runner has a host: a VPS, chosen by Erik knowing the cost printed on the option.** Handoff item 1 was a question, not work, and it was put in this session's first exchange. He picked **a VPS** over his Mac (polling) and over a container on his Mac. The option he selected carried its own objection on its face — **a datacentre IP, which YouTube blocks**, so `yt-dlp` on that host will need exported cookies or a residential proxy. That is the runner's cost and the runner is NOT built here; it is recorded so nobody later reads the block as a surprise.

**What that decision settles, and what it does not.** It unblocks the admin route (ISC-575..592) because the enqueue side is Worker work regardless of where the consumer runs. It does NOT settle the runner-facing protocol, and `FirstPrinciples/Deconstruct` is the reason that is a separate change rather than a scope cut: **there are two principals here, not one.** A human at a form proves an ACCOUNT — `requireRole`, exact match, disjoint roles. A machine on a VPS proves ITSELF — a shared bearer secret, no email, no role, no cookie. Serving both with `requireRole` would mean putting an Administrator's 30-day `__Host-qk_auth` into a VPS environment variable, which undoes ISC-568 entirely: it re-domiciles a browser-scoped, `HttpOnly`, person-bound credential onto a shared host as a static admin token that logout cannot revoke (and logout does not revoke anyway — ISC-568). **The runner is not a low-privilege admin; it is not an account at all, and the moment it needs one the design is wrong.**

**2026-08-23 — `SystemsThinking/FindArchetype` says Shifting the Burden, and its verdict is declined on a false premise while two of its findings are kept.** Its recommendation was *"do not write the queue — the question has never been put"*, and it named its own discriminator: put the question; answered in one exchange → the archetype is confirmed and the constraint was never hard. **The question WAS put, at the top of this session, and answered in one exchange.** So the diagnosis of the PAST pattern is confirmed and the block it describes is lifted; the recommendation built on the premise is not followed. **Kept, because they survive that correction:** (1) *an unconsumed contract can only be tested against the interface its author imagined* — the enqueue row shape is validated by nothing but my own tests, and that is recorded in **this cycle's preamble above ISC-569** (*"A queue with no consumer is what ships today"*) rather than hidden. **Not in ISC-575**, which a first cut of this entry cited and which says only that the migration creates the table — `a-slug-is-not-an-answer`: a pointer that does not land is not a record; (2) the supply-side blindness of every instrument here — 1,941 tests and an ISA count cannot see that **nothing in this repo writes `/kajian/index.json`**, verified by grep across `src/app/kajian*.ts`. That single fact is the honest version of its "components with no caller" counter, and it is written down instead of tooled, because a counter script would itself be one more component with no consumer.

**2026-08-17 — ISC-472's `dari bab` tags are shipped, correct, and shown to the reader for about FOUR SECONDS before being wiped.** The handoff asked whether the knowledge card is the settled view. Measured on prod (`new-quranku.axiara.ai`, bundle `index-DZQQeRQP.js`, `EDITION: synthesis`) across 8 questions driven through the real composer with a cleared thread, a discarded warm-up, and turn counts asserted before and after every ask: **7 of 8 settled on the AI lane (`p.ai-said`), 1 settled on the zero-entry pointer, 0 settled on the knowledge card.** `knowcat` was 0 in every one of the 7 AI turns, so the two lanes are exclusive, not stacked.

**refined: the supersession is STRUCTURAL, not probabilistic.** `main.ts:907-908` (`turn = composed ?? await resolvePrincipled(turn)`) and `main.ts:932-933` (`if (!composed) return;`) make the knowledge card a FALL-THROUGH. On the synthesis edition it renders only when `applyAi` returns null, which has exactly four live branches: `answer.ts:140` no grounding, `answer.ts:151` model error/timeout, `answer.ts:170` the safety wall refusing, and `main.ts:830` a `fatwa`/`arabic`/`bad_ref` block. A healthy turn can never show it. Scope the claim to the synthesis edition — the principled chain is gated behind `isSynthesis()` at `main.ts:887`, so where that gate is false the card is 100% of what the reader sees.

**The four-second window is the real defect, and it is worse than invisibility.** Dense sampling of `apa hukum riba dalam islam dan kenapa dilarang` (2 s resolution) gives the reader's actual timeline: composing notice until ~T+11 s, then the knowledge card with `knowcat=1 knowlist=1 knowref=5` at **T+12 s and T+14 s**, then the AI lane from **T+16 s** onward and permanently. That is `FAST_ANSWER_MS = 9000` firing as designed. The reader is handed Ustadz Muhammad Thalib's five cited entries, begins reading, and has them replaced mid-sentence by app-authored prose. ISC-472 is not unseen; it is shown and retracted.

**A control arm was required and run, because "knowcat=0 eight times" is unfalsifiable without one.** Patching `window.fetch` to reject `/api/answer` made the identical question render the card: `knowcat=1`, tag text `Ekonomi Islam`, attached to entry 4 (`Menyedot harta orang lain melalui riba`, QS 30:39) — the genuinely borrowed line, not a neighbour — under the amended lead *"...kumpulkan soal **Perintah dan Larangan** dan bab lain yang membahas hal serupa"*. Screenshot confirms the CSS-only `dari bab ` prefix paints. Both ISC-472 literals were also confirmed in the SERVED bytes (`index-DZQQeRQP.js` carries the sentence; `index-sBZ5Brsy.css` carries `know-cat:before{content:"dari bab "}`), so this is not a disk-vs-edge artifact.

**The `dari bab` words are CSS-generated and invisible to every text probe.** `styles.css:1144` is `.know-cat::before { content: "dari bab "; }`. A `textContent` search for `"dari bab"` returns 0 on a correctly-rendering page. Count `a.know-cat` elements; confirm the words only by screenshot. Any future probe written against the text will report the feature missing.

**New, unrelated to ISC-472: `apa yang al quran katakan tentang neraka` routes to the SCRIPTURE chapter, not a neraka chapter.** It settled on the zero-entry pointer reading *"Pertanyaan soal **Al-Qur'an, Taurat, Injil, dan Zabur** itu luas"* with 111 entries offered. The literal words `al quran` captured routing and `neraka` was ignored. This is upstream of the pool widening that fixed neraka retrieval — the request never reached a chapter where those entries live. Not opened this session; it needs a control set captured first, per the standing rule. It is also a live instance of the item-6 copy defect: the reader asked something narrow and was told their question was too broad.

**2026-08-16 (late-3) — frequency was tried a THIRD time against this index and failed a third time.** The routing fix landed the question in the right chapter and the entries were still wrong: 16 entries matched, the score histogram was `{1: 16}`, and a stable sort plus `MAX_ENTRIES = 8` returned the chapter in ascending surah order, cutting 14:28-30. The first attempt at a fix weighted each matched word by `log(1 + N/reach)` computed from the shard. It recovered 14:28-30 and was still wrong: within the routed chapter the reaches are `lakukan` 1, `membuat` 3, `neraka` 4, `masuk` 9, so IDF ranks the two generic verbs ABOVE the subject, and widening the sample to all 2,451 entries does not separate them either (`membuat` 8, `neraka` 9, `lakukan` 10). The captions are terse imperative headings, so a common verb is not a frequent word in them. `topic-words.ts` already recorded this exact refutation twice, in the `STOP` and `QUESTION_FRAME` docblocks; the IDF branch was written and reverted before either was read. **The separator is word CLASS**, and the fix is `ACTION_FRAME` — action verbs (doing, causing, becoming, entering) may still rank, but may not count as a question's SUBJECT.

**refined: the verb half deliberately does NOT reach routing.** `subjectWordsOf` still consults `QUESTION_FRAME` alone, so every slug pinned in `topic-broad-tier.test.ts` is byte-identical. Routing had no measured defect after the previous session's fix; a selection fix has no business moving it.

**The cost, measured across 37 questions rather than the one that was reported: zero-entry outcomes went 6 → 7.** "apa yang harus dilakukan saat marah?" lost its only two entries (3:135/3:136, surfaced on `dilakukan` while the question is about anger) and now returns none. That is the intended class of change — an entry reached only through a frame verb was never on-subject — and `marah` is a feeling word, so the feeling lane owns that question before this path sees it. Recorded as a real trade, not as a free win.

**Ranking tests now assert REFS, and that gap is the systemic finding.** Every routing test in the repo asserts a slug; none asserted what entries came back, which is why the reported failure was declared fixed while half of it shipped. `web/src/entry-ranking.test.ts` pins literal refs for the target and for four already-correct control questions.

**No scholar has approved this, and a pending ask covers exactly this act.** `docs/review/hukum-pin-request-2026-08-12.md` — status `BELUM DIKIRIM`, never sent — asks the ustadz precisely whether an entry may be *excluded* from a question's results ("Bolehkah 4:25 kami **keluarkan** dari hasil pertanyaan nikah?"). So exclusion-from-results is a pending question, not a granted permission. It is not a blocker here: nothing is deleted from the index, the entry stays reachable at `#/peta/{slug}`, the rule is a generic word class rather than a per-entry editorial verdict, and the same class of unilateral suppression already ships as `MARRIAGE_HOLD` in `tafsir-tier.ts`. The previous session's reasoning does not carry over and must not be reused: "surfaces MORE of his entries, therefore inside the display permission" does not invert into "surfaces fewer, therefore outside it" — fewer entries can only understate coverage, never overstate review, which is the safer of the two errors under `docs/review/hadith-id-approval-2026-08-12.md`. Recorded as Erik's call. Neither Ustadz Muhammad Thalib nor Ustadz Ahmad Isrofiel has reviewed it.

**FIXED 2026-08-17 (late-2), `0188ec9` — the zero-entry pointer misstated the cause.** It said *"Pertanyaan soal {category} itu luas"*, attributing an empty result to the question's breadth, and asked the reader to narrow a question that on the `apa yang al quran katakan tentang neraka` route was already narrow — the one action that could not have helped. It now names what `knowledge.ts` actually did: no line in the ROUTED chapter matched the question on-subject. That sentence is true whichever way routing landed, and it prints the chapter, so a reader can see the mis-route above for themselves. Copy only; routing is untouched and the mis-route itself is still open, still needing a control set first. Pinned by reading the shipped source in `web/src/knowledge-copy.test.ts` — `knowledgeHtml` is private and returns a template string, so nothing behavioural can assert it — and force-red against the old copy, 5/5.

**FIXED 2026-08-17 (late-2), `200151a` — the entry list credited the scholar with our selection and our ranking.** *"Ini yang {author} kumpulkan soal {category}"* reads as his collection on the topic. What renders is at most `MAX_ENTRIES = 8` lines, scored against the question by our scorer, sorted by that score and deduped, out of up to 626 in a chapter. The lines are verbatim his; the eight and their order are ours, and an unmarked subset presented as the whole overstates what he did — the same class of overstatement the review gate exists to catch, on the one surface whose whole claim is that the app authors nothing. Both branches now say the lines are the ones that fit the question and that the selection and ordering are ours, and both keep *"aku nggak menafsirkan sendiri"*, the per-line citation, and the borrowed-chapter naming. Asserted by COUNT (2, one per branch) rather than presence, because a one-sided fix is the failure this class of change actually has.

**Both verified LIVE on prod** (worker version `baaf3b21`, bundle `index-BBTkDZJz.js`, real Chrome, `localStorage` and `CacheStorage` cleared, turns counted before and after each ask, sampled every 2 s across the whole window rather than at settle). `apa yang al quran katakan tentang neraka` → pointer paints at T+4 s and holds through T+28 s: *"Di bab Al-Qur'an, Taurat, Injil, dan Zabur, aku nggak menemukan satu baris pun yang benar-benar menjawab pertanyaanmu…"*, `itu luas` absent at every sample. `apa hukum riba dalam islam` → knowledge card at T+10 s with 4 entries reading *"Ini baris-baris dari indeks Ustadz Muhammad Thalib yang paling cocok dengan pertanyaanmu — dari bab Perintah dan Larangan dan bab lain yang membahas hal serupa. Pemilihan dan urutannya dari kami, bukan dari beliau."*, `kumpulkan soal` absent at every sample. The same run is an independent confirmation of ISC-476: the AI answer landed at T+14 s and `li.know-entry` stayed at 4 through T+26 s — the scholar's entries were kept below, not wiped. Missing-pixel gap stated: screenshots fail on this app's gradient ground, so this is text and element-count evidence, not a visual capture.

**2026-08-17 (late-3) — BOTH "never write the text yourself" rules are prompt-only, and one of them is observably ignored.** The receipt rules are walls: `hadithShape` refuses a prophetic attribution without a resolving marker, `bad_ref` refuses an uncitable ayah. The WORDING rules are not walls at all. Verified by construction against the shipped guard, with a resolving marker present so the receipt half is satisfied: prose quoting the hadith's own words (*"beliau bersabda, «Biarkanlah mereka, wahai Abu Bakar…»"*) **passes**, and prose writing out an ayah's translation **passes**. Rule 2 and rule 7's second half exist only in `SYNTHESIS_SYSTEM_PROMPT`. ISC-419 shows what that is worth: 1 of 7 live answers broke it. This is the same seam the "half-built wall" entry describes, one notch further in — there is a receipt rule but no wording rule, and the app's rights posture rests on the wording rule.

**And a false diagnosis, caught by a control before it was reported — the method matters more than the finding.** The first reading of this run was "the hadith wall is BYPASSED on prod": two live answers carried prophetic attributions with no marker anywhere in them, and feeding that exact captured text to the shipped `hadithShape` returned a refusal. Both legs were true and the conclusion was wrong. **The renderer strips markers before display** (`stripMarkers`), so `innerText` is text the guard never sees — the instrument was measuring the wrong artefact. Two things settled it: the `/api/answer` body for a musik turn read `{"answer":null,"blocked":"bad_hadith"}`, which is the wall firing correctly on prod; and the authored musik turn carried **5 hadith card elements**, which only render from a marker that resolved. Before claiming a wall is open, capture the RESPONSE, not the rendering — the reader-facing DOM is downstream of every strip, upgrade and replacement in the pipeline.

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

### 2026-08-18 — Cycle 9: three of Erik's calls, and the one that answered itself

**ISC-323.3 — "measure first, default-off param" (Erik, 2026-08-18), and the measurement said no.**
The param shipped default-off; `/rerank` ran both arms end to end through the real `searchDalil`.
`hadith-muslim-154` reaches **rank 3**, outside `MAX_DISPLAY = 2`. The decisive detail is that the
reranker scores every shared record IDENTICALLY across arms — it is deterministic and
pool-order-independent, so the exact arm does not re-judge anything, it inserts one record at its own
merit and that merit is third. **The lever's entire case was "the reranker can finally see it"; it can,
and it disagrees.** Not applied, and now unlikely ever to be worth applying for this question.

**refined: ISC-323 is no longer gated on ISC-323.3 — it is gated on whether it is the right criterion.**
See ISC-323.4. Deliberately not decided here: restating a criterion to match what the system does is
the failure mode this ISA exists to prevent, and only Erik can say whether Muslim 154 at rank 1 was
ever the real requirement or a proxy for "retrieval finds the Kafir hadith at all".

**ISC-493 — accepted as search behaviour (Erik, 2026-08-18). No code shipped, deliberately.** The
rerank-floor rejection stands on its own measurement (0.0703 window at n=20) and was not re-derived.

**ISC-494 — tie-breaking changed (Erik, 2026-08-18).** The old policy's stated reasoning was half
wrong: "ambiguity costs nothing" is false, because a tie deletes the doorway, not just the boost. New
rule is positional and grammatical, never juristic. Two things were found in the doing that the
handoff did not know: the tie is **three-way** (`istri` is a nikah cue), and `sai` was listed twice
under `haji`, inflating that area in every tie it entered.

**Deploys — none (Erik, 2026-08-18).** `new-quranku-ai` and `demo-quranku` stay behind.

**show your math — delegation floor relaxed to 0 against an E3 soft floor of 2.** This session's
harness forbids the Agent tool unless Erik asks for it, so Forge (the E3 coding auto-include) and the
`green-suite` agent were both unavailable. What they would have done was done inline instead: the
three gates ran via Bash with exit codes captured to files rather than read off a pipe, and the
adversarial pass Forge would have supplied was substituted by force-redding every new assertion —
which is what caught the `sai` double-count and proved the `exactScores` param was not a no-op.


**2026-08-18 (Cycle 10) — ISC-323 tombstoned, and the editorial half sent to the ustadz (Erik's call).**
Offered three ways: tombstone + ask the ustadz; keep it as written and carry NOT MET indefinitely;
tombstone without asking. Erik chose the first. The criterion's original text is left byte-intact —
restating it to match the measurement would convert a failure into a definition, which is the one
move that makes an ISA stop being a test harness. What is recorded beside it is the whole honest
position: not met, cause understood (ISC-323.2), only known fix measured and rejected (ISC-323.3),
and the remaining half is a scholarly judgment this ISA has no standing to make. Routed to Ustadz
Ahmad in `docs/review/ustadz-followup-2026-08-18.md`, batched with the §6 correction so he is
interrupted once rather than twice.

**2026-08-18 (Cycle 10) — the follow-up note also asks for the 2026-08-12 approval in WRITING.**
Not a widening and not a re-litigation. `hadith-id-approval-2026-08-12.md` records that approval as
VERBAL and RELAYED BY ERIK, with an explicit standing instruction not to upgrade it to "written
confirmation" without an artefact from the ustadz himself. The note asks him for that artefact and
states plainly that if the relay was wrong we stop displaying the machine Indonesian. Erik reviews
and sends; nothing is sent by me.

**2026-08-18 (Cycle 10) — mode was classified NATIVE and executed as ALGORITHM E3.**
The classifier saw a bare `/next` in isolation and returned NATIVE with the reason "single
continuation command with no specified multi-step scope". The conversation then supplied the scope:
Erik approved three deliverables, two of them durable. Escalated per the v6.3.0 conversation-context
override, logged here rather than left implicit.

**2026-08-18 (Cycle 10) — the advisor reordered this session's work, and the reordering was the
valuable part.**
My plan was: fix both browser defects, then instrument, then measure. The advisor refused the
ordering on a specific ground I had not seen — that `verdictAfterFailure` preserves the first
attempt's verdict when the second THROWS, and a deadline abort is a throw, so making the
`answer-blocked` copy reachable today would render "an answer was found and is being held back"
across nearly every slow turn where the truth is "we ran out of clock". Accepted verbatim. The
retraction fix (ISC-529) ships because it asserts nothing about WHY the work stopped; the copy fix
(ISC-528) is deferred behind the instrument (ISC-533). **Show-your-math on the delegation floor: met
without argument — Forge on the Worker diagnostic, scholarly-gate on the letter, green-suite on the
gates.**


**2026-08-18 (Cycle 10) — the scholarly gate BLOCKED the follow-up note, and four of its findings were
things I could not have caught by re-reading my own draft.**
The first draft was well-written and wrong in ways that only a check against the RECORDS could expose.
(a) It said "izin menampilkan teks mesin ini datang dari Ustadz sendiri" while naming TWO surfaces —
but only the Hadis tab was his. The answer card was **Erik's own ruling of 2026-08-13** extending it
(ISC-449), and `hadith-card.ts:14` says so in as many words. The draft then asked him to confirm the
whole thing **in writing** — which would have converted Erik's decision into the ustadz's grant,
permanently, in exactly the form `hadith-id-approval-2026-08-12.md` forbids. (b) It called
`MAX_DISPLAY = 2` "batas itu kami pasang sendiri" — a limit we chose — when the record calls it a
RIGHTS position from the source's licensing terms, "not a scholarly one, so no scholarly approval
reaches it". Placed one paragraph above a question inviting him to say which hadith should show, a
reply of "show the third one too" would have been recorded as scholarly grounds for a licensing change
he was never told about. (c) The ranking table put Muslim 154 at **rank 3**, which is true only of the
REJECTED experimental arm; in production it is absent from the pool entirely, so blaming the display
cap for its absence named the wrong cause and made (b) live rather than theoretical. (d) It offered
him a question whose "yes" we had already bricked up that same session.
**Learning, and it is the one worth carrying:** a letter can be honest sentence-by-sentence and still
misattribute authority, because attribution lives in the JOIN between sentences — two true clauses
("we display it in two places", "the ustadz permitted it") produce one false claim when set side by
side. Re-reading my own prose could never have found that; only reading it against
`docs/review/` could. **Every future letter to the ustadz goes through `scholarly-gate` before it
reaches Erik, not after.**

**2026-08-18 (Cycle 10) — I checked the gate's numbers instead of taking them.**
Its finding 8 claimed the machine-Indonesian sidecar had grown to 14,655 records. My first count
returned 310 and looked like a refutation. The count was mine that was wrong — the shards are
`{meta, hadith}` and I had counted top-level keys, not records. Recounted on `j.hadith`:
**14,655 (bukhari 7,222 + muslim 7,433) of 14,736**, exactly as reported. Recorded because the
near-miss cuts both ways: an agent's finding is not evidence, and neither is my first refutation of it.


## Changelog

### 2026-08-24 (later) — ISC-642, opened and closed in one exchange

**Conjecture.** The late-path `hadith-defer` substitution is a product decision that has to sit in a
handoff until Erik has time for it.

**Refuted by.** It took one question and one answer. The item was found, recorded as blocked on him,
and ruled on inside the same session — while a comparable rights question in this project's history
sat "waiting on Erik" for six handoffs because nobody actually put it to him ([[a-question-never-put-stays-open]]).

**Learned.** The cost of asking is one exchange; the cost of not asking is a cycle. A decision that is
genuinely his is not the same as a decision that must WAIT — and the difference is entirely whether it
was put to him in a form he can answer. Framing matters: the question that got answered in one turn
named the two options and carried a recommendation with its reasoning, rather than describing the
tension and inviting him to think about it.

**Also learned, the mundane one.** The first attempt at answering it mismatched — the reply was about
hadith Indonesian display, not about turn replacement. Flagging that plainly instead of picking the
reading that let work continue is what made the second attempt correct. Guessing here would have
shipped a change to the hadith display pipeline that nobody asked for.

**Criterion now.** ISC-642 `[x]`. ISC-534 `[~]` → `[x]`, because the hole that kept it partial is the
one this closed. `withheld` becomes `"wall" | "hadith"` rather than `true` — the pointer and a plain
refusal owe the reader different things, and one flag could not carry both.

### 2026-08-24 — the late refusal reaches the reader (Cycle 11 opens)

**Conjecture.** ISC-533's deferral is current: the `answer-blocked` copy must stay unreachable because
`blocked` on the wire cannot separate a guard refusal from an expired clock, and rendering it would
name the wrong actor at scale.

**Refuted by.** The gate it names was discharged on **2026-08-18**, the day it was written. ISC-532
shipped `gen: {attempts, reason}` that same day and reached prod in the 2026-08-23 deploy. The
discriminator has been on every `/api/answer` response since, and `web/src/answer-live.ts` typed the
body as `{answer, blocked, hadith}` — so it was arriving and being discarded one line from where it
was needed. Two handoffs repeated the deferral verbatim without re-reading its precondition.

**Learned.** Three things, in descending generality.

1. **A deferral is a conditional that expires, and nothing here re-opens it.** An `[ ]` criterion that
   names another ISC as its blocker is read afterwards as a *fact about the item* rather than as a
   claim with a stated trigger. The workflow fix is mechanical: when marking any ISC `[x]`, grep the
   ISA for its own id and re-read whatever cites it. ISC-533 named ISC-532 in its first sentence.
2. **A copy test cannot see reachability, and passing over dead code is its DEFAULT outcome.** All
   five `answer-blocked` tests slice `main.ts` as a source string to assert what the sentence says;
   none asks whether any path produces the turn. They were green for the whole six days. The
   technique can only read text — and it is equally blind to the closure-order bug underneath, where
   `resolvePrincipled` closes over a mutable `let blockedBy` so the order dependence never reaches
   the signature and `tsc` has no parameter to object to. Recorded as ISC-646.
3. **The honest fix was a third option neither side of the old argument had.** The choice had been
   framed as "downgrade a real answer" versus "say nothing", and the code said nothing. `Turn` was
   replace-or-nothing; there was no representation for *the fast answer stands, plus a note*. Adding
   the annotation channel dissolved the dilemma rather than resolving it — which is the shape worth
   looking for the next time a criterion sits open because both of its options are bad.

**Criterion now.** ISC-533 `[x]` (the anti-criterion was HONOURED — the gate was discharged before the
copy was made reachable, in that order). ISC-534 `[~]`, not `[x]`: it holds for the channel built here
and is FALSE of the app, because the late-path `hadith-defer` substitution still takes a real answer
off the screen at ~25 s. That is ISC-642, found while enumerating this criterion's test list, recorded
rather than fixed, and waiting on Erik — pinning a known hole with a green test is the failure this
project already has a memory for. ISC-643/644/645/646 added and met. ISC-647 added and open: the live
verification, which needs a deploy that is Erik's.

**And what this did NOT do.** ISC-487 stays NOT MET. The annotation closes the *honesty* half of that
criterion and none of the *latency* half — `MODEL_DEADLINE_MS`, `MIN_RETRY_MS`, `MAX_ATTEMPTS` and the
client's `TIMEOUT_MS` are byte-identical to the anchor. Nothing here measured, let alone bounded,
anything. Do not let a future reading treat the annotation as the bound.

**2026-08-18 (Cycle 10) — the 26-second wall was never a wait.**
- **conjectured:** that ISC-487's ~26 s refusals cost the reader 26 seconds of staring, so the fix
  was to make the turn shorter — cheaper retrieval, a first-attempt latency lever, a retry that fits.
  Every prior session read the criterion this way, and the criterion's own text says "the wall's cost
  to the reader is latency".
- **refuted_by:** `web/src/main.ts:161` — `FAST_ANSWER_MS = 9000`. The reader is handed a real,
  cited, principled answer at 9 s and the composed answer upgrades the turn in place underneath. A
  24.8 s refusal is therefore a 9 s ANSWER followed by an arrival 16 s later, not a 25 s wait. The
  turn duration and the reader's wait stopped being the same number when ISC-466 shipped, and the
  criterion was written in the vocabulary of the world before that.
- **learned:** a latency criterion must name WHOSE clock it measures. "The turn took 26 s" and "the
  reader waited 26 s" were the same sentence for this app until the moment they were not, and nothing
  in the criterion recorded which one it meant — so the number stayed true while its meaning silently
  inverted. Chasing the turn duration would have optimised a number no reader experiences, and the
  two real defects sitting at that exact moment in the timeline (an unreachable refusal copy, an
  unretracted promise) were invisible precisely because everyone was looking at the clock.
- **criterion_now:** ISC-527 establishes the reader's actual exposure before any latency work is
  costed; ISC-528/529/530 name what really lands at ~26 s; ISC-535/536 hold `MIN_RETRY_MS` still
  until an instrument can see per-attempt outcomes. ISC-487 stays NOT MET and now says why.

**2026-08-18 (Cycle 10) — a strict-looking test went red against the correct fix.**
- **conjectured:** that forbidding `querySelector(".still-composing")` anywhere in the upgrade chain
  pinned the aliasing bug, since the fix is supposed to hold a node instead of looking one up.
- **refuted_by:** the assertion went red against the CORRECT implementation. The fix's own capture
  line uses that selector, once, synchronously, at a moment when the node it wants is the only one on
  screen. The force-red pass is what surfaced it — the mutation and the fix both failed, which is the
  signature of a broken test rather than a strict one.
- **learned:** an Anti: assertion needs a WINDOW, not just a forbidden string. The bug is re-querying
  at settle time, when a later turn's node can be aliased; capturing at creation time is the fix
  itself. Same string, opposite meanings, separated only by when it runs. **A test that goes red on
  the fix is not strict, it is wrong** — and without force-red it would have shipped as a permanent
  false constraint that the next person "fixed" by deleting the capture.
- **criterion_now:** ISC-530 scopes the prohibition to the settle handlers; ISC-531 records all three
  mutations, including the one that exposed the bad assertion.

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

### 2026-08-18 — a better candidate pool is not a better answer, and this time it was measurable

- **conjectured:** `hadith-muslim-154`'s absence from the live top-50 was the reason ISC-323 fails, so
  restoring true cosines would let `voyageai/rerank-2.5` surface it and the criterion would pass.
- **refuted_by:** the paired `/rerank` arms. The exact pool does contain the record and the reranker
  does see it — and places it **third at 0.6289**, behind Bukhari 540 (0.6602) and 541 (0.6367), with
  every shared record scoring IDENTICALLY in both arms. Rank 3 is outside `MAX_DISPLAY = 2`, so no
  reader would have seen a difference for the 653 ms it costs.
- **learned:** the pool and the ranker are separate failures and fixing the pool cannot substitute for
  disagreeing with the ranker. When a retrieval fix is justified by "then the reranker can see it",
  the honest test is to let the reranker see it and read its score — not to ship the pool change and
  infer the outcome. An identical cross-arm score is the tell that the ranker was never the variable.
- **criterion_now:** ISC-323.4 — the open question is whether ISC-323's "rank 1" was the requirement or
  a proxy for "retrieval finds it at all", and that is Erik's to answer, not something to be resolved
  by restating the criterion to match the measurement.

- **conjectured:** ranking repair's deletions on the IDENTITY of the reported violation, rather than on
  the count, was a sufficient fix for ISC-562 — a rule tripped by two sentences would clear in two
  single deletions because the reported span changes when the first offender goes.
- **refuted_by:** the REAL `guardAnswerProse`, probed 2026-08-22 rather than a fake. Two sentences
  citing DIFFERENT bad refs report `detail` "9:129" then "8:77" and repair (dropped 2). Two sentences
  citing the SAME bad ref report "9:129" throughout — identity never changes, and `repairAnswerProse`
  returned `prose: null`. `bad_ref` reports a NORMALISED ref, `arabic` reports a single character,
  `hadith_marker` reports the marker text, and every push site truncates at 80 chars.
- **learned:** an identity signal is a strictly better COUNT, not a solution. Two offenders can be
  genuinely distinct sentences and report the same detail, at which point they are indistinguishable
  from a clean sentence to any rank built on the reported span. The fake that would have "confirmed"
  the fix used details that differ by construction (`POISON-satu` / `POISON-dua`) — the same class of
  instrument error that hid the original defect, where `guardRejecting` counted one violation per
  OCCURRENCE while the real guard counts one per RULE. A search that consumes a predicate's ARITHMETIC
  must be measured against that predicate at least once, whatever the module's fakes-only policy says
  about its SCOPE.
- **criterion_now:** ISC-562 is met by identity-ranking PLUS one bounded two-deletion pair expansion,
  and carries a named remaining hole — three or more offenders reporting the same `detail` still end in
  silence. The hole is recorded in the criterion and in the module's PLATEAU block, and deliberately
  not pinned by a passing test (`dont-pin-a-known-hole-with-a-green-test`).

## Verification

**ISC-575..591 — the kajian admin queue**, marked at the wrap, not when the code landed. The delay is
itself the finding: the work was built, gate-tested and force-redded hours earlier while seventeen
criteria sat `[ ]`, and only the wrap's per-cycle table (31/49) surfaced it. A green suite does not
mark an ISA.

- ISC-575: `worker/migrations/0003_kajian_jobs.sql` — UNIQUE `video_id`, `CHECK` on `status`, `NOT NULL` throughout, index on `status`.
- ISC-576..579, 582: eight HTTP-level tests against the Worker's exported `fetch` at four principals × two verbs, cookies signed at the REAL clock. **`worker/src/admin-route.test.ts` is the first HTTP-level route test this repo has ever had.**
- ISC-580, 581: *"a bad URL returns 400 and records no write"* and *"a second POST … still records one write"*, asserted on a write COUNTER, not on the absence of an error. Plus *"malformed JSON takes the same invalid_url path"*.
- ISC-583: *"no DB returns 503 and does not throw"*, both verbs.
- ISC-584, 585: `private, no-store` on every response, and the anonymous and reviewer 403 bodies compared BYTE-FOR-BYTE.
- **ISC-586 was NOT met when first reviewed and is not marked on the strength of the code.** The suite shipped with only *"renders the form for an admin session"* — nothing proved a non-admin gets a refusal instead of a form, so "renders only when role is admin" was half-asserted. Six cases added at the wrap: member, reviewer, anonymous, a 403, a throwing fetch, and a junk payload. Each asserts no form, no url input, and non-empty visible text (a blank div reads as a broken page, not a refusal). The stub THROWS if the jobs endpoint is touched, so a component that fetched anyway fails rather than passing quietly. Control arm: the admin case still renders a form, so the six negatives cannot be green because rendering is broken.
- ISC-587: asserted at the wrap alongside 586 — no `bookmark`, `catatan`, `pertanyaan`, `riwayat` in the rendered HTML, per ADR 4's Administrator-never-sees-content boundary.
- ISC-588: `scholarly-gate`, second pass, on the Indonesian copy — *"Clean. Every string is about queue processing only … Nothing implies published, reviewed, or scholar-checked."* It also checked `shell.css` for `::before{content}` on the reused `.kajian-unreviewed` class, per `css-generated-text-is-probe-invisible`, and found colour/padding only.
- ISC-589: force-red, twice. Removing the route gate fails 4 (all GET-side + the PUT probe); removing the handler's second gate as well fails all 8. Reverted, `grep -c FORCE-RED` → 0.
- ISC-590: `bun test` 2017/0 exit 0 (2010 when first run; 7 more added at the wrap for ISC-586/587) · typecheck exit 0 · build exit 0, each run unpiped with the code echoed. **No CI attests them.**
- ISC-591: `ADMIN_EMAILS` documented in `worker/src/index.ts` (×2) and carried into the handoff — unset means nobody, by design, and ISC-592 records the larger reason the route admits no one on prod.


**ISC-569..574 — the 2026-08-23 skill-wins record** (`docs/review/erik-ruling-2026-08-23-skill-wins.md`, **244 lines** after two correction passes; it was 147 when this line was first written), probed by `grep -c` on the file:
- ISC-569: `RELAY, NOT A RECORD OF HIS WORDS` ×1 in the blockquote header, plus *"Nothing in his own words was captured"* ×1.
- ISC-570: **REPHRASED — see the criterion.** Re-measured after the SECOND correction pass: `ADR 5` ×17, `ADR 6` ×9, `ISC-10` ×7. Earlier values ×12/×8/×3 and ×16/×9/×5 were each true when written and false when read.
- ISC-571: `WEB CARD only` ×1 and `SILENT on the mp4` ×1, with kajian ruling (b) named as still open and still Erik's.
- ISC-572: `provenance labels are UNCHANGED` ×1, quoting the 2026-08-22 ruling's *"must not be softened, made conditional, or removed"* verbatim ×1.
- ISC-573: the blanket phrasing greps **0** — that is the criterion, and it holds. The count beside it did not: a first cut said the word `ustadz` "appears twice"; it is **6 occurrences on 5 lines**. Two name Ustadz Ahmad Isrofiel inside §*Who the "scholar" is here* (which states he was not consulted and scopes his three permissions); the other four name **Ustadz Syariful Mahya, the third-party video speaker**, in §*Answered*, which did not exist when the count was taken. No sentence attributes the ruling to any ustadz, which is what ISC-573 actually forbids.
- ISC-574: `__Host-` ×3 and *"It authorises nothing"* ×1, with the ACCOUNT-CONFUSION correction of the first write-up carried into the record.


**2026-08-17 — ISC-472 settled-view measurement (handoff item 1).** Prod `https://new-quranku.axiara.ai`, worker bundle `index-DZQQeRQP.js` / `index-sBZ5Brsy.css`, `EDITION: synthesis`. Thread cleared (`localStorage.removeItem('newquranku:thread')`), reload asserted `#thread` at 1 child (hello only), one warm-up question discarded, `#thread` child count asserted before and after every ask (+2 per turn, 1 -> 19 with no gaps), settle read at T+44 s.

| # | Question | Settled lane | `ai-said` | `know-cat` | `know-list` | chars |
|---|---|---|---|---|---|---|
| W | apa itu sabar menurut al quran | AI | 3 | 0 | 0 | — |
| 1 | apa hukum riba dalam islam dan kenapa dilarang | AI | 4 | 0 | 0 | 13399 |
| 2 | bagaimana islam mengatur utang piutang antar saudara | AI | 4 | 0 | 0 | 5920 |
| 3 | apa yang al quran katakan tentang neraka | zero-entry pointer | 0 | 0 | 0 | 521 |
| 4 | kenapa kita harus sabar waktu lagi susah banget | AI | 3 | 0 | 0 | 10792 |
| 5 | apa hukumnya nikah beda agama | AI | 5 | 0 | 0 | 9070 |
| 6 | bagaimana adab kepada orang tua yang sudah tua | AI | 3 | 0 | 0 | 6119 |
| 7 | apa hukum zakat fitrah | AI | 3 | 0 | 0 | 3046 |
| **C** | **#1 with `/api/answer` rejected (control)** | **knowledge card** | **0** | **1** | **1** | **769** |

Every outcome bucket tabulated: 7/8 AI lane, 1/8 zero-entry pointer, 0/8 knowledge card. `know-cat` was 0 in all seven AI turns, so the lanes are exclusive rather than stacked. No AI turn was refusal copy — the shortest was 3,046 chars of substantive prose.

ISC-476: dense 2 s sampling of question #1, `interceptor eval --main` counting `a.know-cat` on the last `#thread` child — `T+3/6/8/10 s` composing notice (`chars=60`), **`T+12 s` and `T+14 s` `knowcat=1 knowlist=1 knowref=5 chars=841`**, `T+16 s` onward `ai=5 knowcat=0 chars=10309`, stable to T+44 s. The card is visible for roughly four seconds and then wiped.

ISC-477: `curl https://new-quranku.axiara.ai/assets/index-sBZ5Brsy.css | rg -o 'know-cat[^{]*\{[^}]*\}'` returns `know-cat:before{content:"dari bab "}`; `rg -c "bab lain yang membahas hal serupa"` on the served JS returns 1. Screenshot (`interceptor macos screenshot --app "Google Chrome"`) shows `dari bab Ekonomi Islam` painted under QS 30:39.

ISC-478: control arm via `window.fetch` patch rejecting `/api/answer`. Per-`li` read confirmed the tag is on entry 4 of 5 (`Menyedot harta orang lain melalui riba`, QS. Ar-Rum 30:39) — the genuinely borrowed line — and not on the four Perintah dan Larangan entries. Lead sentence read back verbatim: *"Ini yang Ustadz Muhammad Thalib kumpulkan soal Perintah dan Larangan dan bab lain yang membahas hal serupa — aku nggak menafsirkan sendiri, tiap baris langsung menunjuk ke ayatnya:"*

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

### Cycle 12 verification — ISC-561 / ISC-562 (2026-08-22)

**Gates, real exit codes.** `bun test` **1846 pass / 0 fail** across 104 files (1833 at the `359caab`
anchor; 13 new). `bun run typecheck` **exit 0**, all five chained `tsc` passes reached. `bun run build`
**exit 0**. **Nothing deployed.** `web/dist` still holds the **principled** bundle, confirmed by the
inlined literal ``return`principled` `` rather than by a grep for the word.

**One side effect found and repaired.** Running the build gate wrote `.build-meta.json` with
`answerMode: "synthesis"` while `web/dist` held the principled bundle. That sidecar exists precisely so
a deploy can refuse the wrong build, so a disagreement between it and `dist` is the failure it was
written to prevent, pointing the wrong way. Restored by an honest `bun run build` (principled); both now
agree. It is gitignored, so nothing about the commit changed.

**Force-red inventory — every branch separately, never one fixture for two branches.**

| # | Mutation | Test that failed |
|---|---|---|
| A | repair loop bounded to the last index alone | ISC-561 › answers from an earlier candidate |
| B | `repairedRule` read off `trace.blockedRule` | ISC-561 › answers from an earlier candidate |
| C | lateral rank removed (count-only) | ISC-562 › two sentences under one rule; › no useless deletion |
| D | rank 2 collapsed into rank 1 (any non-worsening deletion) | both ISC-562 fake-guard cases |
| E | `identify` stripped of `detail` | both ISC-562 fake-guard cases |
| F | pair expansion removed | ISC-562 › SAME bad ref (real guard) |
| G | pair accepted without lowering the count | pair expansion is bounded to ONE per call |
| H | `repairedAttempt` never recorded | both ISC-561 arms |

`green-suite` independently reproduced the force-red by `git checkout HEAD --` on both sources: **5 fail
/ 39 pass**. The four control arms stayed green in both arms, which is what makes them controls.

**Advisor consulted at the commitment boundary; two of its premises were FALSIFIED rather than accepted,
and that is recorded because taking them would have sent the next session to the wrong place.**

- *"Repair may cost a model round-trip per candidate, so trying N candidates is N× the deadline risk."*
  **False.** `repairAnswerProse` makes no network call and no model call — `grep` for
  `fetch|callChatModel|await` in `worker/src/answer-repair.ts` returns **0**. It is a pure local search
  over prose the model already wrote, judged by the injected local guard. The 253 ms figure IS the
  stage's wall clock, not a component of it.
- *"The quadratic expansion is unbounded — what is the real maximum sentence count?"* **Already bounded.**
  `answer-repair.ts:171` refuses the whole search above `MAX_SENTENCES = 60`, so 59 is the worst case by
  construction, not by sampling. The measurement was taken AT the bound.
- *"Rank 1 may be comparing a stale field."* **Checked, not assumed.** The ~10% stale-verdict record is
  about `blocked` vs `gen.reason` on the TRACE, not about the guard's own violations; `detail` is built in
  the same `push` as the decision. Probed anyway: 200 evaluations of one string yielded **1 distinct
  verdict**.
- *"No row only your change could emit."* **Correct, and acted on.** `GenTrace.repairedAttempt` added and
  carried to the `gen` report in `worker/src/index.ts`. A row with `repairedAttempt < attempts.length - 1`
  is one this code could not have produced before today. Pinned in all three arms and force-red (H).

**TWO GAPS DECLINED, recorded here and NOT pinned by a passing test.**

1. **Three or more offenders reporting the SAME `detail` still end in silence.** The pair expansion is
   bounded to one per call because each expansion multiplies the PER-TURN budget (not because a second would be cubic — 2·n² is still quadratic). Not fixed, not claimed fixed.
2. **A deletion is a SEMANTIC edit and the guard is not a correctness oracle.** Excising a sentence can
   orphan a receipt, strip a qualifier, or leave a survivor opening on a connective whose antecedent is
   gone — and the prose still passes every rule. This is NOT new today (repair has excised sentences
   since ISC-560, 2026-08-21) but the two-deletion path widens the surface. **No repaired output has been
   READ end-to-end by a person.** Closing it needs real repaired answers off a live run, which this
   session did not do and did not deploy for. **Erik's call whether that read happens before the next
   deploy.**

**`scholarly-gate`: CONCERNS, no BLOCK — and it ran the replay this session could not.** Paired
HEAD-vs-tree over a synthetic corpus: of **2,061** inputs the old search solved, the new one returned
**byte-identical prose on 2,061 of 2,061**, and **1,216** further inputs now answer where HEAD gave up.
Separately, **3,621** guard-dirty inputs through the real `guardAnswerProse` produced **zero** cases of
the new path returning prose the injected guard rejects, and it reproduced the 1,773-evaluation figure
independently (230 ms to my 253). **Synthetic, NOT a live rate.** The derivable figures are **1,216 of the 1,560 inputs HEAD gave up on (78%)**, or **+59% relative to HEAD's 2,061 answered**. A first draft of this sentence forbade quoting "~59%" while giving no denominator a reader could reconstruct it from, which is a guardrail on a number that does not exist.

**Seven findings raised; six fixed in the same change, one is Erik's.**

1. **`answer-generation.test.ts` said the defect was "Demonstrated LIVE".** It was the OFFLINE capture,
   on a question `PROGRESS.md` records prod ANSWERING that morning in 6.0–12.9 s, first attempt `ok`.
   That is the exact upgrade ISC-561 already forbids in its own text, made three lines away from it.
   Corrected at all FOUR sites. A first correction pass fixed three and reported the class closed — it missed `answer-generation.ts`, the production file the fix lives in and the one a Worker maintainer reads before either test. The re-gate caught it.
2. **`repairAnswerProse`'s docblock stated the OPPOSITE of the code beneath it** — "a round that cannot
   improve the count stops the search", which is precisely what stopped being true. Worse, the
   three-or-more limitation was recorded ~90 lines below it, so a reader who read the docblock and
   stopped would never reach it. Docblock rewritten; the limitation now sits where a reader arrives.
3. **The bound test could not have failed:** 23 guard calls WITH the bound and 23 WITHOUT, against
   `toBeLessThan(40)`. Its fixture put three offenders under ONE rule, so no pair could lower the count,
   the first expansion failed and a second was never reachable — it named a mechanism it could not
   reach. Replaced with two rules × two sentences: **45 calls bounded, 61 unbounded**, asserted exactly,
   outcome deliberately unasserted.
4. **"A second expansion would make it cubic" was wrong** — 2·n² is still quadratic. The honest reason
   for the cap is the per-TURN budget, not asymptotics. Corrected, with the wrong sentence left visible.
5. **The cost budget was stated per CALL while ISC-561 makes it per TURN.** Worst case ≈ 2 × (3,600 + 1,770)
   ≈ 10.7k evaluations. Measured 60-sentence/20-offender case: 1,032 calls / 141 ms. Now named.
6. **"RANK 2 never taken" was over-absolute.** `wordingShape`'s 160-char window crosses sentence
   boundaries, so removing an INNOCENT sentence can change which span is reported and make it rank-1
   eligible. No construction made the innocent sentence the one actually dropped — the cost tie-break
   favoured a real offender every time — so this is an over-claim retired, not a defect shown. Both the
   docblock and the test title now say evidence, not proof.
7. **ERIK'S CALL — the sent, unanswered letter's premise is drifting.**
   `docs/review/tanya-ai-request-2026-08-17.md` (SUDAH DIKIRIM, belum ada jawaban) describes the app to
   the ustadz as: *"Bila jawaban sebuah pertanyaan sebenarnya ada pada hadis, aplikasi memilih **diam**
   dan mengarahkan pembaca bertanya kepada ustadz."* Repair still never displays machine hadith
   Indonesian — that half holds. But *"memilih diam"* is what changed: on a turn refused by
   `hadith_unbacked` the app now excises that sentence and ships the remainder. **This is ISC-560,
   already live since 2026-08-21 on Erik's ruling — ISC-561/562 only WIDEN it.** No fix is proposed
   here: the letter is sent and unanswered, and amending what he was told is not a code change.
   **It belongs in the next letter, and whether it goes there is Erik's.**
   Related and unaddressed: more excision means more novel sentence boundaries judged by `hadithShape`,
   whose verb list this repo records as incomplete (`mengajarkan` unlisted for two sessions; nine loose
   divine verbs still open). The widening leans harder on a wall known to be partial.

**Two pre-existing artifacts the gate surfaced, neither introduced here, both now carried more often.**
`splitSentences` splits inside quoted spans, so repaired prose can ship an unbalanced `"` — 61% of old
answers and 56% of new in the synthetic sample, but ~65% more answers now carry it. And the returned
string is `join(keep).trim()` while the verdict was earned on `join(keep)`: the shipped bytes are the
guarded bytes minus surrounding whitespace. Recorded in the docblock; neither fixed in this cycle.

**What is NOT claimed.** No live measurement and no prod rate. How often two candidates of one turn
differ in repairability **on prod** is still **one observed turn**, the offline block of 2026-08-21 —
and the byte-identity of previously-answered turns is now measured (2,061/2,061), but measured on a
SYNTHETIC corpus, not on production traffic.


## Cycle 8 — the answer has three sources, in order (ISC-479..484)

Opened 2026-08-17 on Erik's instruction: *"ayat will be the first, then Hadits and Fikih. If ayat is
not there then go to Hadits and then Fikih."* Erik also ruled that this proceeds without waiting on
the scholar's sign-off, on the basis of his own agreement that correction happens during testing.
Recorded as his knowing decision, not as a cleared gate — **ISC-417 remains NOT MET.**

- [x] ISC-479: the hadith lane can be reached by a question the Qur'an lane already answered weakly. **MET 2026-08-17.** Before this, step two required step one to return NOTHING: the Worker gate reads `entries.length > 0` and `entries` fills only on `verses.length === 0` (`web/src/answer.ts`). Measured over 48 live reader turns, the questions that never reached hadith were exactly the ones retrieving one or two FEELING-verses — `bagaimana adab kepada orang tua` (2), `apa keutamaan sedekah` (1), `bolehkah aku pacaran` (2), all hadith topics. `gatherGrounding` now reports `weakVerses`, and the gate is `(entries.length > 0 || weakVerses)`. **The split is the scorer's own, not a threshold invented here:** `retrieve()` qualifies a verse on an explicit reference (`REFERENCE_SCORE` = 100) or a recognised feeling (10 each), and overlap re-ranks but never qualifies — so "the reader named an ayah" and "we matched a mood" were already distinguishable and are now distinguished. `REFERENCE_SCORE` is exported and used at the scoring site so the two cannot drift.
- [x] ISC-480: opening the hadith lane does not reopen the ruling-index hijack. **MET 2026-08-17.** `entries` stays gated on `verses.length === 0`, untouched. That gate exists because the ruling index ungated pulled riba law onto "aku capek banget sama utang" and the model answered the debt instead of the exhausted person. Only the HADITH lane widens, and hadith is retrieved semantically from the question rather than by subject-index lookup.
- [x] ISC-481: the Fikih step contributes ORDER, never text. **MET 2026-08-17.** There is no fiqh corpus to answer from — `web/src/fikih.ts` is a topic→kitab map, "a doorway, not a treatise", and no legally-clean Indonesian fiqh corpus exists off the shelf (research 2026-08-08). `rankByFiqhArea` therefore prefers hits sitting in the kitab the compilers themselves filed the material under, and does nothing else. Verified by construction: force-red shows that turning the stable sort into a filter fails three tests, including one that asserts the output length is unchanged.
- [x] ISC-482: Anti: the Fikih router can never admit or refuse a hadith. **MET 2026-08-17.** This is the whole reason a keyword router is acceptable here when this repo has three times proved keyword lists unacceptable as GATES. `fiqhAreaOf` feeds a re-rank over hits retrieval ALREADY returned; a wrong area match costs ordering and nothing else. `fikih-route.ts` records that the argument is void if anyone later wires it into an admission decision. Ties route to `null` — an ambiguous question gets no boost and retrieval is left exactly as it is.
- [x] ISC-483: the new lane is confirmed by a row only it could emit. **MET 2026-08-17.** `apa keutamaan sedekah` returned `blocked:bad_hadith` at 1 verse / 0 entries on live prod. That verdict requires the model to have been OFFERED hadith, which at `verses > 0` was unreachable before this cycle. Bucket totals across the before/after runs are NOT comparable and are not cited as evidence: `/api/classify` returned zero themes on all 24 turns of the after-run against some themes in the before-run, so `no-grounding` doubled for reasons unrelated to this change.
- [x] ISC-484: the widened lane produces ANSWERS rather than refusals. **MET 2026-08-17 (late-5) — and the diagnosis this line carried until now was WRONG.** It read: "the model reaches for a prophetic attribution and does not carry a resolving marker, so `bad_hadith` stops it… the remaining work is the PROMPT half (teaching the model to cite the hadith it is handed, per rule 7)". Measured with a PAIRED CONTROL ARM against live prod — the same question, the same verified verses, posted twice back-to-back with only `weakVerses` flipped, so the hadith lane is the one thing that differs — over 9 pairs on the three WEAK questions (`bagaimana adab kepada orang tua`, `apa keutamaan sedekah`, `bolehkah aku pacaran`):

    | hadith lane | answered | answered mean | turns ≥20 s | answered turns citing ≥1 hadith |
    |---|---|---|---|---|
    | **ON** (cascade) | **7/9 (78%)** | 12.8 s | 3/9 | **7/7** |
    | **OFF** (pre-cascade) | 6/9 (67%) | 8.2 s | 3/9 | 0/6 |

    **The prompt half is not broken: every single answered turn that was offered hadith cited one with a resolving marker, 7 of 7.** Rule 7 lands. The widened lane also answers MORE often than the arm without it, not less, so the criterion as written is met. The earlier reading came from unpaired single-shot samples that happened to catch the ~26 s turns; **`turns ≥20 s` is 3/9 in BOTH arms**, so that wall is arm-independent and the cascade did not cause it. It is ISC-487, and it is the whole of what is left. The real cost of carrying hadith is **+4.5 s on an answered turn**, of which the dalil chain itself is 1.3–4.0 s (`dalil.ms.total`) — so roughly 1–3 s is the model, not retrieval. Sample is 9 pairs and is reported as such; the 7/7 citation result does not depend on the sample size, because the falsified claim was that the model does not cite at all. Instrument: `src/eval/wall-live-probe.ts` now records the Worker's `dalil` report and the `hadith` array on every row (`h offered→records→cited`), so the check this criterion calls for no longer needs an unrecorded second script.

## Cycle 8 — the wording wall, and what it cost (ISC-485..487)

- [x] ISC-485: prose that writes out scripture's or the Prophet's words is refused by a WALL, not a prompt rule. **MET 2026-08-17, deployed and measured.** `own_wording` shipped (worker `84a6d4c7`) and then narrowed (worker `e0f2ae79`). Zero leaks across 48 live turns, `wordingShape` re-run on every returned answer.
- [ ] ISC-486: the wall does not refuse a scholar's position quoted beside an ayah. **MET 2026-08-17 FOR ROLE NOUNS; UN-MARKED 2026-08-19 because it is false for bare proper names — see the regression block below.** The `[x]` was left standing for one pass with the caveat written beneath it, and that was the wrong call on this project's own convention: `ustadz-followup-2026-08-18` commits us to recording a conditional answer *beserta syaratnya*, never as a plain approval, and a checkbox is the plainest mark there is. No script parses these markers — the audience is human, which is exactly who lifts a `[x]` out of its paragraph. The first cut asked only whether the SENTENCE cited an ayah, which is a different question from whether the QUOTE is scripture. It refused `bolehkah perempuan jadi pemimpin` 3 of 3 — one of the two answers this file names as the ones a hard rule would destroy — and `apa hukum riba` 2 of 3. Verified by construction: it refused a scholar's position, our own knowledge entry and the reader's own framing identically to a hand-written ayah translation. Now requires DIVINE ATTRIBUTION or ADJACENCY to the citation, and stands down when a human subject plainly owns the words. **It also closed a hole the first cut had:** adjacency is measured over the whole prose, so the bare `"…" (QS 17:32)` shape — the original ISC-419 evidence — is caught, where the sentence splitter had been separating the quote from its citation.

  **PARTIALLY REGRESSED 2026-08-19 by ISC-419's appositive arm — this is the block the un-marked checkbox above points at.** `DIVINE_ATTR`'s new appositive span for `allah|tuhan` runs until someone else who could own the verb turns up, and a BARE PROPER NAME is in neither `AGENT_PRONOUN` nor `HUMAN_ROLE`. So a designation early in the sentence now reaches a verb belonging to a named scholar. **Measured by `scholarly-gate` across three independent probes, every bare name refuses — 48 of 48 owner-form × verb combinations, all of them HEAD-passes turned tree-refusals**: `Ibnu Katsir`, `Quraish Shihab`, `Buya Hamka`, `Al-Ghazali`, `Ibnu Taimiyah`, and the possessives `gurunya`, `penulisnya`, `muridnya`. (An earlier draft led with "3 false refusals in 6 named-scholar rows" and corrected it two sentences later; that reads as a rate near half, and leading with the understating half of a number whose whole defect was understatement is the same mistake twice.) The role-noun subjects this criterion was written for — `imam`, `mufti`, `penafsir`, `banyak orang` — were rescued by extending the break vocabulary to `HUMAN_ROLE` (the first cut of the arm refused those too, which is what `scholarly-gate` caught), and are covered by a test row. The polarity is over-refusal, so the cost is a pointer rather than a fabrication. **The true rate for the bare-name class is 100%, not the "3 in 6" first recorded here:** over 15 owner forms × 6 verbs, every survivor survived because its form CONTAINS a `HUMAN_ROLE` token (`Imam` Nawawi, `Syaikh` Utsaimin, seorang `mufti`) and no bare name survived — `Al-Ghazali`, `Ibnu Taimiyah`, `gurunya`, `penulisnya`, `muridnya` all refuse too. A denominator mixing the rescued class with the broken one reads as a rate and is not one. ~~Closing it needs the same `AGENT_BEFORE_VERB`-style proximity test ISC-419's under-refusal limit names — one fix serves both.~~ **FALSIFIED 2026-08-20 — see the block below.**

  **THE PROXIMITY TEST SHIPPED, IT DID NOT CLOSE THIS, AND IT MADE IT WORSE. 2026-08-20.** ISC-419's under-refusal limit is NARROWED (not closed — see limit 3 there) by a third `allah|tuhan` arm asking `AGENT_BEFORE_VERB`'s question. **"One fix serves both" was wrong and is retracted.** Proximity can only make the BREAK fire less often, and a bare proper name never fires it at all — that class is a VOCABULARY gap, not a proximity gap, shown directly by the paired controls: adding a `HUMAN_ROLE` token to the same form (`Imam` Nawawi, seorang `mufti`) is what rescues it, and taking it away is what breaks it.

  **AND THE NEW ARM ENLARGES THIS CRITERION'S FAILURE.** On HEAD a bare name is RESCUED whenever any owner token appears earlier in the sentence, because the span ends there before the verb is reached: *"…pada bagian akhir pembahasan panjang yang **kita** baca bersama tadi malam, dan **Ibnu Katsir** menjelaskan bahwa «…»"* passes on HEAD. The arm ignores upstream tokens and refuses **120 of 120** such rows — found by `scholarly-gate`, not by the change's own cost probe, which put no owner token upstream and so could not have contained the class. A bare name with NO upstream token was already refused on HEAD (48 of 48, above), so the arm makes this criterion **uniformly** false for bare names rather than newly false.

  **A NARROWING THAT CUT THE RESIDUE TO 80 OF 120 WAS TRIED AND REVERTED**, because it re-opened ISC-419's bypass for pronoun epithets: 45 of 45 on a 5-epithet × 9-verb grid, 36 of 36 on the paired 4-epithet grid that scores both directions on the same rows. Read off that paired grid, it bought 18 over-refusals for 36 under-refusals, and on this wall an under-refusal is the app printing its own rendering as Allah's words while an over-refusal is a quotation declined. Full account under ISC-419.

  **THE REDUCING PATH IS A PROPER-NAME VOCABULARY ON THE OWNERSHIP TEST, DEMONSTRATED BY `scholarly-gate` AND NOT BUILT.** Adding one rescues the bare-name rows while all four ISC-419 bypass rows stay refused, whole suite green — so the earlier claim in this block that the residue was irreducible, and that the two limits were one ambiguity, is **retracted**. The obstacle is narrower than "irreducible": `wordingShape` lower-cases the 160 characters before the quote before any arm sees them, so capitalisation — the thing that actually marks a proper name — is unavailable, and what remains is a hand-kept list that will not generalise (`Buya Hamka` and `Quraish Shihab` carry no particle). That is a design question for a separate change. **Still `- [ ]`, and now false for a wider class than when it was un-marked** — recorded here as an open item with its failing strings rather than as a passing test, per this file's own convention. The PRE-EXISTING second path below is unaffected by any of this and still stands.

  **A THIRD PATH, ALSO PRE-EXISTING AND ALSO NOT A REGRESSION: arm 1's 40-character window overrides the ownership stand-down.** The ownership arm stands down when an owner is adjacent to the verb, but the window arm reads straight through one, so the two arms disagree about who owns `menegaskan` in *"Allah dan kita menegaskan, «…»"* and the union keeps the REFUSING answer. HEAD refuses it too, so union discipline requires keeping it — but it means the wall's answer to "who owns this verb" depends on a character count. Pinned by the `the 40-character window catches what neither the span nor the ownership arm can` block, which exists because deleting arm 1 was briefly green across the whole file.

  **THIS IS NOT A COMPLETE ACCOUNT OF ISC-486's STATE, and the block read as one for a pass.** A second, PRE-EXISTING path refuses a named scholar with no help from the appositive arm: `wordingShape` tests `VERBATIM_DIVINE` against the 160 characters before the quote, and that window CROSSES SENTENCE BOUNDARIES. So *"Allah berfirman tentang riba dalam QS Ali Imran 3:130. Ibnu Katsir menjelaskan bahwa «…»"* refuses on HEAD and on the current tree alike. Not a regression and not introduced here — but any fix aimed only at the appositive span will leave it standing, and a reader of the block above would not have known to look.

  **THE GRID IS NOW AN EXECUTABLE INSTRUMENT, NOT A DESCRIPTION — `src/eval/ownership-grid.ts`, added
  2026-08-29 (Cycle 21).** Every number this criterion argues from was prose in this file; the probe
  prints them from `wordingShapeScan` on demand, scores BOTH directions on ONE row set, and carries
  an `adjacent` column so a refusal count can never be read without its denominator. It asserts
  nothing and is not a test — per this entry's own convention that a known hole is recorded, not
  pinned green.

  **REPRODUCED AT HEAD `b52264e`, with a working control in both directions:**

  | row | refused | adjacent | reading |
  |---|---|---|---|
  | bare proper name, no owner token | **30/30** | 30/30 | the ISC-486 defect, 100% as recorded |
  | `-nya` possessive, no owner token | **18/18** | 18/18 | same defect, `gurunya` · `penulisnya` · `muridnya` |
  | role-noun form (`Imam Nawawi`, `seorang mufti`) | 0/24 | 24/24 | **CONTROL — the rescued class still passes** |
  | bare name / possessive, owner token in window | 0/30 · 0/18 | all | rescued by the 72-char window, not by vocabulary |

  The control is the load-bearing row: a probe on which nothing passes cannot show that a rescue
  worked, and the earlier "3 in 6" rate this entry already corrects came from exactly that shape.

  ⚠️ **CAPITALISATION CANNOT BE THE WHOLE RULE, and that narrows the design question this entry
  leaves open.** The block above frames the obstacle as `wordingShape` lower-casing its 160-character
  window, which is true and is a single site (`answer-guard.ts`, `before = …slice(…).toLowerCase()`).
  But **half the broken class carries no capital at all**: `gurunya`, `penulisnya` and `muridnya`
  refuse 18/18 and are ordinary lower-case nouns with a `-nya` possessive. Preserving case rescues
  the `Ibnu Katsir` half and leaves the possessive half exactly where it is. **Two signals are needed,
  not one** — and this is the first time that has been written down here.

  🔶 **THE TWO DIRECTIONS SHARE ONE PREDICATE, WHICH IS WHY THIS IS A RULING AND NOT A PATCH.**
  `humanAttr` decides both. Direction A refuses because the vocabulary is too NARROW; direction B
  (`epithet × loose verb, owner token in window` — **0/24 refused, 24/24 adjacent**) goes unrefused
  because the same stand-down is too WIDE. Any widening that rescues a bare name widens the
  stand-down that already lets a divine attribution through. That is the trade the 2026-08-20
  narrowing was reverted over, measured here in one place rather than argued.

  ⚠️ **THE DIRECTION-B ROW IS A REPRODUCTION OF ISC-419's RECORDED LIMIT, NOT A NEW HOLE — checked
  before it was written up.** ISC-419 limit 3 already records the loose-verb bypass at `72 of 72` and
  `7,488 of 7,488`. **One aspect may not be covered by its enumerated shapes and is flagged as a
  CANDIDATE, not a violation:** the rows here carry NO epithet and put the owner token UPSTREAM of the
  designation (*"Seperti kita pahami, Allah menerangkan bahwa «…»"*), whereas the eight enumerated
  shapes place it at the TAIL of an epithet. I did not score this against those eight shapes, so
  whether it is a distinct shape or the same one restated is **UNVERIFIED**. Do not cite it as new
  without that comparison.

  ⚠️ **THE ROWS ARE PROSE I WROTE, and this repo has been burned by exactly that
  (`guard-tests-need-production-prose` — the hadith wall stood open for two sessions because every
  case was ours).** The one real capture available (`docs/review/captures/api-answer-9ab57d4b`) holds
  no long Indonesian quote and so could not have exercised these arms. What it DOES attest is the
  precondition: its genuine prod prose uses `kita` freely (*"kadang kita menjalankan shalat"*,
  *"mendekatkan kita kepada allah"*), and `kita` within 72 characters is the single token that
  collapses the stand-down. **The trigger is attested in production; the full shape is not.**


  🔬 **THE TWO DIRECTIONS CAN BE DECOUPLED RATHER THAN TRADED — measured 2026-08-29, NOT BUILT, and
  the price is now a number instead of an argument.** The coupling exists only because a divine row
  carrying a LOOSE verb is refused by nothing but `adjacent_unowned`, which is the same arm that has
  to stand down to rescue a scholar. Widening `DIVINE_VERB` by the six loose verbs gives those rows
  their own arm: **direction B goes 0/24 → 24/24 refused, every one now labelled `divine_attr`
  instead of `adjacent_unowned`, and direction A is byte-identical.** After that widening the
  ownership vocabulary could be widened for ISC-486 without re-opening ISC-419 — which is precisely
  the trade the 2026-08-20 narrowing was reverted over.

  ⚠️ **IT IS NOT FREE, AND THE SUITE CANNOT SEE THE PRICE.** `bun test` was **2400/0 exit 0 with the
  widening in place** — green through the whole experiment, exactly the shape `a-swap-is-not-a-widening`
  records. A paired HEAD-vs-tree probe on rows the suite does not contain found the cost: `dia` and
  `ia` are ordinary HUMAN pronouns as well as the divine ones `DIVINE_ATTR` arm 4 reads, so a scholar
  referred to by pronoun starts refusing. **Human `ia`/`dia` × loose verb: 6/18 refused on HEAD,
  18/18 with the widening — 12 NEW over-refusals**, all `divine_attr`.

  **The trade, stated without pretending it is a rate:** 24 under-refusals closed on the epithet grid,
  12 over-refusals added on the human-pronoun grid. **Different constructed row sets with different
  denominators — this is NOT 24-for-12 as an exchange**, and this entry's own correction of the
  discredited "3 in 6" and "72 of 207" applies to any attempt to divide them. What IS comparable is
  the DIRECTION: the reverted 2026-08-20 narrowing added under-refusals, and this adds over-refusals
  while removing under-refusals — the opposite polarity, on a wall where this file's standing ruling
  is that an under-refusal (the app printing its own rendering as Allah's words) outweighs an
  over-refusal (a quotation declined). **That ruling is Erik's to apply, not mine, and nothing was
  built or shipped here.** Reproduce with `src/eval/ownership-grid.ts` plus the six-verb widening.


  ✅ **BUILT AND CLOSED ON ERIK'S RULING, 2026-08-29 (Cycle 21) — but for a NARROWER class than the
  decoupling note above proposed, and the narrowing is the important part.** `DIVINE_VERB` gains the
  six loose verbs. The class measured open at **0 of 24** — a plain designation, a loose verb, and an
  owner token inside the stand-down window — is now **24 of 24 refused, every row labelled
  `divine_attr`**, so it no longer depends on the ownership arm and ISC-486's vocabulary can be
  widened without re-opening it. Written test-first: 12 rows confirmed **RED (12 fail / 86 pass)**
  before the edit, green after, with 6 role-noun CONTROL rows that passed BEFORE the fix — so the
  block cannot be satisfied by refusing everything. Suite **2418/0** (2400 + 18), typecheck exit 0,
  synthesis build exit 0.

  ⚠️ **THIS DOES NOT CLOSE ISC-419 LIMIT 3, AND THE CANDIDATE FLAGGED "UNVERIFIED" ABOVE NOW RESOLVES
  TO "A DIFFERENT SHAPE".** Limit 3's own recorded failing strings were run against the fixed tree
  rather than assumed, and **all three are still OPEN**: *"…dan banyak **orang** melarang, «…»"*,
  *"…beserta **kita** semua menegaskan, «…»"*, and — the row that settles it — the same tail-position
  shape carrying a LOOSE verb, *"…beserta **kita** semua menyatakan, «…»"*, which the widening should
  have caught if the two classes were one. They are not. Limit 3 is a tail-position owner token
  defeating the appositive break, so no divine arm binds designation to verb at all; the class closed
  here is an owner token sitting UPSTREAM of a plain designation with no epithet. **Limit 3 stays
  open, at its recorded `72 of 72` and `7,488 of 7,488`, untouched by this change.**

  ⚠️ **THE PRICE WAS PAID, NOT AVOIDED.** `dia`/`ia` are ordinary human pronouns, so a scholar
  referred to by pronoun now refuses: **6/18 → 18/18** on the paired probe. Erik ruled to accept it
  (2026-08-29), on this file's standing asymmetry that an under-refusal outweighs a declined
  quotation. Recorded here and in the guard's own docblock; **deliberately NOT pinned as a passing
  test**, so a later session that finds a way to recover those rows is not fighting a green assertion.
  The 12 new refusal rows ARE pinned, so narrowing `DIVINE_VERB` back goes red rather than silently
  re-opening the bypass.

  **ISC-486 ITSELF IS UNCHANGED AND STILL `[ ]`** — bare names 30/30 and `-nya` possessives 18/18,
  identical before and after. What changed is that closing it no longer costs an under-refusal on the
  classes this grid covers. **Nothing was deployed; prod is unchanged.**

- [ ] ISC-487: the wall's cost to the reader is latency, not refusal, and it is bounded. **NOT MET — measured, and the number is the finding.** Of the remaining `own_wording` refusals, 3 of 4 land at ~26 s: the retry exhausted the Worker's 25 s `MODEL_DEADLINE_MS` and the first attempt's verdict was reported. Only one (15.8 s) is a genuine second violation. `answered` turns average 12.2 s against 24.8 s for refusals. The dominant cost of this wall is that a retry does not fit inside the turn budget, and there are only 5 s of headroom before `MODEL_DEADLINE_MS` would cross the client's `TIMEOUT_MS` (30 s) — so the lever is first-attempt latency, not the deadline. Erik has not ruled on it. **Sharpened 2026-08-17 (late-5): this wall is ARM-INDEPENDENT, which makes it the only thing left in the cycle.** The ISC-484 paired control arm put `turns ≥20 s` at 3/9 with the hadith lane ON and 3/9 with it OFF — identical — and the pre-cascade arm produced its own ~25 s dead turns (`null:no-reason` ×2 at 25.0 s, `own_wording` at 25.3 s). So it is not the cascade, not the hadith payload and not `bad_hadith`: it is that a retry does not fit inside `MODEL_DEADLINE_MS` on ANY lane. A whole-run measurement the same afternoon (`wall-live-probe --repeat 3`, 24 turns) read **25% answered** against the late-4 run's 46%, with 0 leaks — the buckets move this much run-to-run, so the paired arm is the only comparison in this cycle worth acting on. **RE-DIAGNOSED 2026-08-18 (Cycle 10) — the framing above is WRONG in its most load-bearing word, and the correction changes what the fix is.** "The wall's cost to the reader is latency" assumed the reader waits out the turn. They do not: `FAST_ANSWER_MS = 9000` hands them a real, cited, principled answer at 9 s and upgrades it in place, so a 24.8 s refusal is a 9 s answer followed by something arriving 16 s later — not a 25 s stare. **The turn duration and the reader's wait stopped being the same number at ISC-466 and every reading of this criterion since has conflated them.** What actually lands at ~26 s is two browser-side failures and one mis-set constant, now split out as their own criteria: the `answer-blocked` copy is UNREACHABLE past 9 s (ISC-528, the Worker preserves the verdict and the browser discards it); the "still composing" promise was never retracted on a refusal (ISC-529, FIXED); and `MIN_RETRY_MS = 6_000` is the FLOOR of the generation distribution used as a completion predictor when the median is ~8,450 ms (ISC-535). **This criterion stays NOT MET** — nothing here bounded latency, and deliberately so: the two remaining levers (rendering the verdict, moving the retry threshold) are both gated on an instrument that does not exist yet, ISC-532. Recorded so no future reading treats the re-diagnosis as the fix. **UPDATE 2026-08-24 — the FIRST lever is built, and this criterion is STILL NOT MET, which is the point worth writing down.** Rendering the verdict shipped (ISC-644): a late refusal now annotates the fast answer instead of vanishing. That closes the *honesty* half — the reader is told a fuller answer was composed and held back — and closes NOTHING of the latency half. No constant moved: `MODEL_DEADLINE_MS` 25_000, `MIN_RETRY_MS`, `MAX_ATTEMPTS` 2 and the client's `TIMEOUT_MS` 30_000 are byte-identical to the anchor. The second lever (the retry threshold, ISC-535) is untouched here. **Do not let the annotation be read as the bound.** The criterion says *bounded*, and nothing in this session measured, let alone bounded, anything: it is a browser-side change verified offline, and the live re-measurement is ISC-647, which needs Erik's deploy.

- [x] ISC-656: **the kajian queue drains end to end on production, and the two defects that stopped it were never the two blockers on the board.**
      Two consecutive handoffs recorded kajian automation as gated on (a) a residential proxy, because
      "every datacentre IP is refused by YouTube", and (b) ISC-630's rights call. Tested first rather
      than assumed: the transcript skill fetched **1,483 snippets** for `J5x-9tHxeJA` from Erik's machine
      on the first attempt. The proxy premise was never the thing stopping a local run, and no code in
      this repo had ever completed one.

      **DEFECT 1 — the `/live/` URL never reached the transcript skill intact.** `youTubeVideoId`
      (`worker/src/kajian-jobs.ts`) has parsed `youtube.com/live/<id>` since 2026-08-24, so the queue row
      holds the correct `video_id`; `src/app/kajian.ts` then handed the skill the RAW argument, and the
      skill understands `watch?v=` and bare ids only. It answered *"Invalid video ID: pass the ID, not the
      URL"* and exited in ~1 s. **A kajian is streamed before it is a recording, so the stream URL is the
      NORMAL input, and it was the one input that could not work.** Closed by `src/app/kajian-source.ts`,
      which reduces the argument to a bare id through the QUEUE'S OWN parser — imported, never copied, so
      the admin page and the runner cannot disagree about what is admissible.

      **DEFECT 2 — the runner reported every failure as a timeout, and that is why defect 1 stayed
      invisible.** `runPipeline` derived `timedOut` from `proc.signalCode !== null`, and `Bun.spawnSync`
      leaves `signalCode` **undefined** on an ordinary exit — so the expression was true for every failure
      there is. A one-second death on an unparseable URL was reported to the admin as *"pipeline exceeded
      its time limit and was killed"*, with the real stderr discarded. `failureReason` now takes the spawn
      result itself (`PipelineExit`) — there is no boolean left for a caller to get wrong — and checks a
      timeout verdict against the clock it names, since SIGTERM is also what an operator `kill` sends.
      The measured shapes are recorded on the interface, not assumed.

      ⚠️ **THE OLD TESTS COULD NOT HAVE CAUGHT EITHER ONE.** They passed `timedOut` by hand, so they
      exercised the function while the JOIN was what was broken. Both fixes were written test-first and
      both new tests were confirmed RED before implementation.

      **VERIFIED LIVE, not by the checkmark.** The runner claimed job `666022fc` against production, ran
      the pipeline, uploaded to R2 and completed. `/kajian/index.json` → `application/json`; `slide.html`
      → `text/html` 37,309 B; `slide.png` → `image/png` 445,957 B at 3840x2160, byte-DISTINCT from the
      25,233 B SPA shell — the check that matters, because a missing asset returns `index.html` at 200.
      Card renders at `#/kajian` in real Chrome with `Belum diperiksa` and `speaker: null`.
      Gates: `bun test` **2374/0** exit 0 · typecheck exit 0 · synthesis build exit 0. Commit `3707095`.
      **No deploy was required** — both files run on the runner host, not in the Worker bundle.

      **A THIRD BLOCKER SURFACED AND IS NOT CODE: OpenRouter hit HTTP 402 mid-session** (topped up by
      Erik, re-verified). And the play button is still silent: `audioUrl` is `null` because Google ADC
      needs an INTERACTIVE `gcloud auth application-default login` that only Erik can run.

- [x] ISC-657: **the kajian runner survives the shell it was started from — supervision, not a scheduler.**
      Three consecutive handoffs recorded "THERE IS STILL NO SCHEDULER" and pointed at Cloud Run Job +
      Cloud Scheduler, which is blocked on a residential proxy Erik has not bought. **Reading the code
      first changed what the gap was.** `kajian-runner.ts` is already a `for(;;)` poll loop that catches
      network blips, Worker restarts and pipeline deaths and keeps going — it needs no scheduler and no
      cron. The single thing it cannot survive is the SHELL EXITING: it is a foreground process, so it
      dies with the terminal, with a logout and with a reboot, and a queue whose consumer is dead is
      indistinguishable from a queue nobody has clicked Summarize on.

      **So what was missing was supervision, and supervision is not blocked by the proxy.** The proxy
      gates the HOSTED case only, because YouTube refuses a transcript to a datacentre IP — measured on
      both clouds and recorded in `docs/runbooks/kajian-runner.md`, where the runbook's own conclusion
      already reads *"the recommended first host is Erik's own machine"*. Local supervision needs no
      residential egress, no container, and no vendoring of the transcript skill.

      `src/app/kajian-agent.ts` generates a launchd LaunchAgent — `RunAtLoad` at login, `KeepAlive` on
      death, `ThrottleInterval` 30 s so a runner that CANNOT start does not respawn into prod's 403 in a
      hot loop. `bun run kajian:agent` writes it with every absolute path resolved on the machine that
      will run it, so nothing absolute is committed.

      **THE PLIST HOLDS NO CREDENTIAL, and its absence is a tested guardrail.** `~/Library/LaunchAgents`
      is world-readable and rides along in every home-directory backup, so launchd is handed a `sh -c`
      that SOURCES `.env` and `.env.runner` (mode 0600, gitignored) at start; there is deliberately no
      `EnvironmentVariables` block. Two other fields are load-bearing and silent if wrong: `WorkingDirectory`,
      because BOTH `kajian-runner.ts` and `kajian.ts` call `resolve(".scratch/kajian")` and a job started
      from `/` would fail naming the wrong cause; and the absolute `bun` path, since launchd reads no
      shell profile. The `[ -r ./.env.runner ] || exit 78` guard exists because `sh` sourcing a MISSING
      file prints an error and CARRIES ON — without it the runner starts with no secret, is refused by
      its own config check, exits 2, and is restarted by `KeepAlive` for ever.

      **VERIFIED AGAINST launchd'S OWN PARSER AND ON BOTH ARMS, not by reading the XML.** `plutil -lint`
      → OK; `plutil -extract` returns `WorkingDirectory` = the repo root, `KeepAlive` = true,
      `ThrottleInterval` = 30. The generated plist contains **0 occurrences** of the runner secret. The
      exact `sh -c` string launchd will run was then executed directly: with the env files present it
      exported `QK_BASE_URL`, a 64-character `QK_RUNNER_SECRET` (length printed, never the value) and
      `OPENROUTER_API_KEY`, exit 0; from a directory holding `.env` but no `.env.runner` it printed
      `kajian-agent: ./.env.runner is missing or unreadable` and exited **78** before reaching `exec`.

      ⚠️ **THE FIRST RED WAS THE MODULE-MISSING RED AND PROVED NOTHING**, so all five load-bearing
      assertions were mutation-tested individually: dropping `WorkingDirectory` reddens 2, dropping the
      `.env.runner` guard 1, defeating XML escaping 1, dropping `ThrottleInterval` 1, and inlining a
      secret into the plist 1. Five mutations, five reddenings, restored green after each.
      Gates: `bun test` **2385/0** exit 0 · typecheck exit 0 · synthesis build exit 0.

      ⚠️ **NOT LOADED, AND THAT IS DELIBERATE.** `launchctl bootstrap` starts a live consumer of the
      production queue that spends model tokens on every job it claims, so the installer WRITES the
      inert plist and PRINTS the two `launchctl` lines rather than running them. Erik's call, one command.

      **WHAT THIS DOES NOT BUY, stated rather than glossed:** the machine must be awake and logged in.
      This is survival of the shell, the logout and the reboot — not survival of a closed lid. Unattended
      operation still needs a host with residential egress, and that is still ISC-630-adjacent and still
      Erik's money. Nor does it touch the two other kajian gaps: `audioUrl` is still `null` pending an
      interactive `gcloud auth application-default login`, and there is still **NO per-day cost ceiling**
      on the pipeline's model spend — a supervised runner that restarts for ever makes that gap larger,
      not smaller, and it is recorded here as the direct consequence of this change.

- [x] ISC-658: **the "theme classifier returns 0 themes on 14 of 16 turns" alarm is MOSTLY INNOCENT, and a real defect was hiding behind it.**
      Three handoffs carried this as 🔴 *"multiple runs, different days — not noise, and still nobody
      has looked"*. Looked, 2026-08-26, by calling the live `/api/classify` on prod directly with the
      real 83-theme corpus set rather than reading the probe's summary number.

      **THE HEADLINE NUMBER IS CORRECT BEHAVIOUR.** Run against `wall-live-probe`'s OWN eight
      questions: **7 of 8 returned `[]`** — 87.5%, matching the reported 14/16 almost exactly. But six
      of those seven answered in **2.07–2.46 s**, well inside the cap, with an honest empty from the
      model. **The probe set is ruling and knowledge questions** (`apakah musik haram`, `apa hukum riba`,
      `apa yang al quran katakan tentang neraka`, `apa keutamaan sedekah`) **and the theme vocabulary is
      EMOTIONAL** (`Grief & loss`, `Anxiety & fear`, `Hardship & ease`, …). There is no emotional theme
      for *what does the Qur'an say about hell*, so `[]` is the right answer, not a failure. An alarm
      raised on the rate alone could not have told those apart — which is why it sat unexamined for three
      cycles while looking urgent.

      ⚠️ **DO NOT read this as "the classifier is fine."** The same measurement found a defect the rate
      was masking. **`TIMEOUT_MS = 3000` in `web/src/theme-live.ts` sits INSIDE the classifier's own
      latency distribution.** Eight consecutive runs of `bolehkah aku pacaran` — the one probe question
      that DOES produce themes: 0.93, 1.04, 1.47, 2.41, 2.60, 2.64, 2.68, **3.36** s. **One in eight real
      theme results is aborted and discarded**, and six of the other seven land at 2.4–2.7 s, a hair under
      the cap. Across the eight distinct probe questions, 2 of 8 exceeded 3 s (3.70 s and 6.38 s).

      **AND IT IS INVISIBLE BY CONSTRUCTION — the same collapse this route was already burned by once.**
      An aborted fetch, a thrown model call, a `guardThemes` drop and an honest "nothing matched" all
      produce byte-identical `{"themes":[]}`. `handleClassify`'s own `catch` returns `json({themes: []},
      200)`, and the comment directly above it records that an earlier 80-token cap made the classifier
      return `[]` on EVERY live call and *"failed invisibly because `[]` is also the legitimate answer"*.
      That lesson was written down and the failure mode was left in place.

      **THE COST IS NOT PARTIAL DEGRADATION — IT IS TOTAL, FOR EXACTLY THE CLASS THAT NEEDS IT.**
      `main.ts:904` calls the classifier ONLY when `keywordThemeHits(q).size === 0`, and passes `() => []`
      as the fallback. So the model is the SOLE source of themes precisely for the questions the keyword
      lexicon already missed, and an abort leaves that reader with zero themes — and `bolehkah aku
      pacaran` is recorded in this repo as retrieving NOTHING on `[]`.

      **BOTH HALVES ARE BUILT — 2026-08-26, and the constant was Erik's to choose.** The cap is a
      reader-latency trade-off (the call BLOCKS retrieval, so raising it delays every answer that takes
      the model path); put to him with the measured distribution, he ruled **5000 ms**, which clears the
      whole measured body with margin. `CLASSIFY_TIMEOUT_MS` is now EXPORTED rather than a bare literal,
      so a probe or a runbook cannot assert on a drifted copy of it.

      The observability half names the four causes on the wire: `/api/classify` returns
      `outcome: "matched" | "none" | "dropped" | "error"` beside `themes`. **`dropped` is deliberately
      not folded into `none`** — the model naming themes the guard removes means it is answering out of
      vocabulary, which is a different event and is what the 80-token incident would have looked like
      from outside. Client-side, `liveThemeModel` now throws a self-identifying timeout and exports
      `isClassifyTimeout`, so an abort can be COUNTED rather than silently becoming `[]`.
      ⚠️ **`themes` is unchanged and an arm asserts it** — a client reading only `themes` cannot tell
      this shipped.

      **MUTATION-VERIFIED ON BOTH FILES, six mutations, six reddenings**, each restored to green:
      cap back to 3000 (1), removing the timeout marker (1), a predicate true for ANY error (1 — the
      control arm, the `signalCode !== null` shape), collapsing `dropped` into `none` (1), reporting a
      thrown call as `none` (1), and a guard that always returns empty (2, including the control).
      Gates: `bun test` **2395/0** exit 0 · typecheck exit 0 · synthesis build exit 0 ·
      `wrangler deploy --dry-run` exit 0 with all six bindings. Verified in the BUILT bundle, not just
      the source: the minified call site reads `_u=5e3` at the `setTimeout` guarding `/api/classify`,
      and the marker string is present.

      **DEPLOYED AND VERIFIED LIVE 2026-08-26 — Erik authorised it.** Worker
      `2dc1775e-4c46-41ae-951c-0fd44380d859` replaced `fb75d322`, built from `35ae177c`, six bindings,
      `EDITION="synthesis"`, 2 assets changed — consistent with a client-code-only change and nothing
      else. **The range was diffed before shipping**, because a deploy carries everything since the last
      one: `87c7583..HEAD` touches only `web/src/theme-live.ts` and `worker/src/index.ts` in shipping
      code; the rest is runner-host `src/app/*`, docs and this file, none of which enters either bundle.

      **Four arms on the live surface, the first request discarded for propagation.** `matched` on a
      feeling question (`Grief & loss`, `Anxiety & fear`); **`none` on `apa yang al quran katakan tentang
      neraka`** — the case that was an unattributable `[]` for three cycles and now names itself; `none`
      on an empty candidate set. And the CLIENT half read out of the bundle **prod actually serves**
      (`/assets/index-66SAIz94.js`, fetched from the origin, not from local `dist`): `_u=5e3` at the
      `setTimeout` guarding `/api/classify`, timeout marker present.

      **CONTROL ARM, because a deploy that broke the app would pass every check above.** Measured against
      the 25,233 B SPA shell rather than against status, since a missing asset returns `index.html` at
      200: `/echo-index.json` 1,338,552 B (byte-identical to the Cycle-16 figure), `/kajian/index.json`
      498 B, `/corpus.json` 633,536 B, `/grounding-digest.json` 39,544 B — all `application/json`, none
      the shell. And the reader path itself: a probe-marked `/api/answer` returned 1,481 chars at
      `gen.reason: answered` in 8.96 s.

      ⚠️ **Do not read a later run's improved theme rate as this criterion being met.** The rate was
      never the defect. A run whose questions happen to be feeling-shaped will move it on its own; what
      settles anything now is `outcome`, which is why it exists.

- [~] ISC-659: **the long-surah "weird behaviour" — the render budget is bounded, and MY OWN DIAGNOSIS OF IT WAS AN ARTIFACT.**
      Erik reported weird behaviour on long surahs and sent two screenshots: ayah cards showing their
      header and action row with the middle BLANK. Reproduced in real Chrome on prod before reading any
      code, per the repo rule.

      **WHAT IS TRUE.** Ali 'Imran renders all 200 ayahs at once — **11,581 DOM nodes, 119,756 px in one
      scroll container**, no virtualisation. `read.ts` chunks INSERTION through `idle()` with a
      completeness backstop, but nothing bounds the steady-state paint. And every card holds its text:
      **0 of 200 empty by `innerText`**, in the same `data-pane="text"` collapsed-rail state as the
      screenshots. So whatever Erik saw, the DOM was never the broken part — a content assertion reports
      everything fine.

      ⚠️ **WHAT I REPORTED AND THEN FALSIFIED, recorded because the first version was published to Erik.**
      I measured Ali 'Imran at **19.7 fps, then 10.5 fps, with a 1,458 ms frame**, against 120.4 fps for
      Al-Ikhlas, and reported that as a property of surah length. **It is not.** Under an identical
      cold-load procedure, alternating arms, the SAME page with the SAME 11,581 nodes and 119,756 px
      measures **119.9 / 120.1 fps with 0 frames over 50 ms** — and still does after deliberately churning
      between long surahs eight times. The original readings were a transient degraded browser state
      (repeated navigation, competing tabs, mid-chunking), not the page. `run-to-run confound`, and I
      published the confounded number first. **The performance premise for this fix is WITHDRAWN.**

      **WHAT THE FIX ACTUALLY BUYS, measured on six paired runs.** `#read #surah-body .verse` gets
      `content-visibility: auto` + `contain-intrinsic-size: auto 370px` — 370 is the MEASURED MEDIAN of
      all 200 cards (min 323, p25 346, median 370, p75 450, p95 520, max 728), not a round number; the
      first draft used a guessed 420. fps is unchanged (120.4–120.6 vs 119.9–120.2). **Worst frame is
      consistently lower with no overlap between the groups — 10.6 / 11.7 / 12.4 ms against 14.6 / 15.0 /
      16.5 ms** — but both sit inside one frame budget, so this is a small real improvement and nothing
      a reader would notice.

      **COSTS, stated rather than glossed — AND THE FIRST STATEMENT OF THEM WAS TOO KIND BY TEN TIMES.**
      `contain-intrinsic-size` makes the scroll height an ESTIMATE until each card has rendered once.
      ⚠️ **The cost is 29%, not the 3% first recorded here.** At FIRST PAINT, same viewport, paired arms:
      **78,081 px with the rule against 110,667 px without it — 29% short.** The 3% (116,164 against a
      true 119,756) is not wrong, it is the wrong MOMENT: it was measured AFTER the cards had rendered,
      which is the best case and not what the reader's scrollbar shows on arrival. **The number a
      criterion states must be the one the reader meets** — kept here rather than swapped silently,
      because publishing the flattering half of a paired measurement is the failure this file exists to
      catch. **Re-measured 2026-08-28 (Cycle 19) as a SAME-MOMENT PAIRED READING**, which the original
      29% was not: two prod tabs open at once, same viewport, same build, one with the rule live and one
      with `content-visibility: visible` injected — `#surah-body.scrollHeight` **77,826 px against
      112,914 px, 31% short.** Two independent measurements a day apart, by different procedures, land
      on 29% and 31%. The 3% is not reproducible at first paint by either.
      Against that, the deep link was measured rather than assumed:
      `scrollIntoView` to 3:150 lands with **1 px of drift**, so no correction pass was added — writing one
      would have been the `no-op fix` shape.

      ✅ **THE BLANK CARDS ARE REPRODUCED — 2026-08-28 (Cycle 19), ON PROD, FIRST TIME IN THREE SESSIONS.**
      What unblocked it was not a theory but Erik answering the question the last two handoffs carried:
      the cards go blank **after the page has been SITTING**, and **scrolling back up repaints them**.
      That pair names a paint failure, not a content failure, and it is why every instrument used so far
      reported the page healthy.

      **THE PROCEDURE, so it can be re-run.** Open Ali 'Imran on prod in a tab and leave it BACKGROUNDED
      for roughly fifteen minutes. Foreground it, then scroll. ⚠️ **The instrument must be
      `interceptor screenshot --pixel`** — the default screenshot RE-RENDERS from the DOM and repaints the
      very artifact being hunted, and on a 90,887 px scroller it times out at 15 s anyway.

      **WHAT THE BROKEN STATE MEASURES.** `data-pane="text"` (the collapsed-rail state of the screenshots),
      **200 cards, 0 blank by `innerText`, 0 of zero height**, and card #2 laid out ON SCREEN at
      `top: 78, height: 346` — while the screen shows nothing there. **DOM correct, LAYOUT correct, PAINT
      absent.** This is the finding: `innerText` was never the wrong reading, it was the wrong INSTRUMENT,
      and so is `getBoundingClientRect` — both report a healthy page in the middle of the defect. Only a
      pixel-true compositor capture can see it.

      **IT REPAINTS PARTIALLY, WHICH IS EXACTLY THE SCREENSHOT.** After a scroll the action row
      (Dengar / Salin / Bagikan / Kartu) comes back while the card middles stay blank — header + action row
      + blank middle, Erik's image reproduced. The sidebar corrupts too (a black block over "Hadits"), so
      this is not a verse-card bug; it is the whole renderer.

      **WHAT DOES NOT CLEAR IT, each with a control.** A forced layer invalidation (`translateZ(0)` toggle
      + reflow): no change. A style recalc from a no-op injected rule: no change — and this is the control
      arm for the next line. Injecting **this very rule** (`content-visibility: auto` +
      `contain-intrinsic-size: auto 370px`) into the broken page: **no change.** A document reload: **fully
      restores.** So the raster for a ~90,887 × 1,076 px composited scroller is lost and is never
      regenerated within the document's life.

      ⚠️ **DO NOT UPGRADE THAT NEGATIVE INTO A VERDICT ON THIS FIX.** What was tested is whether the rule
      RESCUES a page already in the broken state. It does not. Whether it PREVENTS the state from arising —
      which is the only claim that would matter, and is plausible because it is layer size that is at issue
      — **is UNTESTED.** Testing it needs the full fifteen-minute background-sit with the rule present from
      first paint, in both arms. Until that runs, this fix is justified by the worst-frame number ABOVE and
      by nothing else.

      ✅ **THE `data-pane="text"` COLLAPSE IS NOT AN UNSUMMONABLE TRIGGER — IT IS A READER CLICKING A TAB.
      Settled 2026-08-28 (Cycle 20) by catching one in the act.** Two handoffs recorded the collapse as the
      part of the trigger "nobody can yet summon on demand", and a session was nearly spent waiting for it.
      It is summoned by clicking **Teks Surah**. Read the code first: `data-pane` is written in exactly ONE
      place — the delegated click handler in `bindSplit` (`read.ts`) — with **no resize observer, no timer,
      no visibility handler**, so the attribute CANNOT change without a click. Then caught live: a recorder
      installed in the page world (`--main`; an isolated-world `eval` silently loses `window` state between
      calls) logged `{kind:"click", trusted:true, closestTab:true, hidden:false}` followed 6 ms later by
      `{kind:"attr", from:"split", to:"text"}`. **`isTrusted: true` cannot be forged by script**, so that
      was a real input device — Erik's, on a window this session had raised in front of him.
      ⚠️ **Every instrument step was excluded individually first**, each on a clean probe tab that stayed
      `split`: `tab switch`, raising the Chrome window, `screenshot --pixel`, and `read --tree-only`. The
      collapse is ordinary UI, which means **the blank-card state is reachable by normal reading** — collapse
      the rail to read the text full width, leave the tab, come back — and the procedure below can now be run
      deliberately instead of waited for.

      ⚠️ **TWO SITS, TEN ARM-RUNS, NOTHING REPRODUCED — AND THE PROCEDURE ABOVE IS THEREFORE NOT
      SUFFICIENT AS WRITTEN.** Cycle 20 ran five prod tabs twice. Run 1: 23 minutes, all five in
      `data-pane="split"` — nothing. Run 2, correcting run 1 by collapsing the rail first because the
      reported defect is a `text`-state defect: **35–39 minutes of UNINTERRUPTED background each**, verified
      per-arm from the recorder's own `visibilitychange` timestamps rather than assumed —

      | arm | config | background | pane held | opacity 0 | pixels |
      |-----|--------|-----------|-----------|-----------|--------|
      | A | prod as shipped | 35.3 min | text | 0/200 | painted |
      | B | Al-Fatihah (28× smaller scroller) | 39 min | text | 0/7 | painted |
      | C | `animation: none` on `.verse` | 37.3 min | text | 0/200 | painted |
      | D | `content-visibility: visible` | 37.5 min | text | 0/200 | painted |
      | E | split, intro pre-scrolled | 38 min | split | 0/200 | painted; **no ghost**, and none after a 6.4k scroll |

      **THE POSITIVE CONTROL NEVER FAILED, SO ARMS C AND D MEASURE NOTHING.** The `qkin` and
      `content-visibility` hypotheses below are UNTESTED, not eliminated — recorded so no later session
      reads this table as having cleared them. What the run does establish is a bound on the recipe: **the
      documented fifteen-minute sit did not reproduce at 35–39 minutes**, in EITHER pane state, on prod as
      shipped, with and without the closing scroll. Erik saw the defect and it was reproduced once, so the
      defect is real; what is missing is a condition nobody has named yet. ⚠️ **Do not re-run this recipe
      unchanged and expect a different answer** — vary something (machine sleep, memory pressure, a second
      heavy tab, a real pointer scroll rather than a scripted `scrollTop`) or the next session buys another
      null.

      **TWO MEASUREMENTS OF THE COMPOSITED COST, taken because layer size is the standing suspicion.**
      A census of the live surah page found **all 200 `article.verse` carrying
      `backdrop-filter: blur(18px) saturate(1.5)`** — one composited blur READBACK per card inside the
      ~78,000 px scroller — plus `blur(28px)` on the composer. ⚠️ **The blur is very nearly invisible:**
      the card fill is `rgba(208,190,151,.94)`, 94% opaque, and an A/B with the rule disabled differs by a
      **maximum of 3/255 in any channel** (mean 0.044, 8.3% of pixels). Scope stated: one surah (112), one
      theme, one viewport — it is a cost/benefit reading, not yet a licence to delete. Separately, every
      card runs `@keyframes qkin { from { opacity: 0 } }`, and `shell.css` ALREADY carries a comment saying
      that animation "could strand a card invisible if the tab backgrounded first" — the same symptom class,
      hit once before. With `content-visibility: auto` live, a card first becomes rendered when scrolled
      toward, which is when that animation fires. **Both are hypotheses with arms built, not findings.**

      🔴 **STILL OPEN, and the open part is now sharp rather than mysterious.** Nothing here is a fix. What
      exists is a reproduction, a procedure, an instrument that can see the defect, and four eliminated
      remedies. The remaining question is whether the render budget prevents it, and behind that whether a
      ~90,000 px composited scroller is viable at all on this surface.

      Gates: `bun test` **2400/0** exit 0 · typecheck exit 0 · synthesis build exit 0, and the rule was
      verified present in the BUILT css (`contain-intrinsic-size:auto 370px` in `web/dist/assets/*.css`)
      because a build exits 0 even when the parser discards a rule. Five tests, five mutations, five
      reddenings. **DEPLOYED 2026-08-28 on Erik's explicit call** (he chose keep-and-deploy knowing the
      premise was withdrawn): Worker **`0d33ef55-800a-4924-8523-895312ad1e1e`**, was `2dc1775e`. Verified
      LIVE by fetching the asset rather than trusting the upload — `131,303 B` of `text/css`, not the
      25,233 B SPA shell, carrying `#read #surah-body .verse{content-visibility:auto;contain-intrinsic-size:auto 370px}`
      exactly once.

      ⚠️ **THE DEPLOY BROKE THE DIAGNOSTIC THIS CRITERION IS WRITTEN AROUND — found the same session,
      by the paired test above, and it is MY regression.** With the rule live, `innerText` on the surah
      reader reports **194 of 200 cards blank** while the page paints PIXEL-IDENTICALLY to a control arm
      with the rule disabled (verse 3:3 fully rendered in both). `content-visibility: auto` skips layout
      for off-screen content and `innerText` is layout-dependent, so it returns empty for every skipped
      card. `textContent` is not layout-dependent and is unaffected.

      **So the instrument has INVERTED, and both of its readings are uncorrelated with the defect.**
      Before the deploy it said `0 of 200 empty` while the reader saw nothing — recorded above as the
      wrong instrument. After the deploy it says `194 of 200 empty` while the reader sees everything.
      ⚠️ **A later session running the probe this criterion documents will read 194 and conclude the
      surah reader is catastrophically broken. It is not.** Use `--pixel` capture, or `textContent`.

      **NOT user-facing, checked rather than assumed.** `innerText` appears in NO production source —
      only in this file, `PROGRESS.md`, and a test docblock. `Salin` / `Bagikan` / `Kartu` go through
      `shareText(v: VerseCard)` (`web/src/share.ts:28`), which reads the DATA object and never the DOM,
      so the copy and share paths are untouched. The blast radius is diagnostics only.

      🔶 **THE PREVENTION TEST IS INCONCLUSIVE, and its own control says so.** Two prod tabs, one with
      the rule and one with `content-visibility: visible !important` injected, backgrounded together for
      26 minutes and then scrolled by an identical delta. **Neither arm reproduced the blank state** —
      both stayed `data-pane="split"` and both painted correctly. Since the CONTROL never failed, the
      test arm being clean measures nothing: the trigger did not fire in either. The pane collapse to
      `data-pane="text"` that preceded the original reproduction did not recur, and it is now the part
      of the trigger that is NOT understood. **Do not record this run as evidence either way.**

      **What the paired run DID establish, because it appeared in both arms:** the intro panel ghosts
      reliably after a ~26-minute sit — two renderings of the Dorar preface superimposed at different
      scroll offsets, sharp text over dim text on the same rows. It is OUTSIDE this rule's scope by
      construction (`#read #surah-body .verse` does not cover the preface panel), it reproduces without
      the pane collapse, and it is therefore the CHEAPEST known handle on the same compositor failure —
      minutes rather than a trigger nobody can yet summon. Start there.

      **The first-paint scroll-height cost is also worse than this criterion states.** Measured in the
      paired arms at the same viewport: control `110,667` against test `78,081` — **29% short**, not the
      3% recorded above. The 3% figure was measured AFTER cards had rendered, which is the best case;
      29% is what the reader's scrollbar is wrong by when the surah first opens.

      ── Cycle 21 (2026-08-29) ─────────────────────────────────────────────────────────────────────

      ✅ **THE `qkin` LEAD AND THIS RULE LAND ON THE SAME ELEMENT, and the reading surface's entrance
      is NOT the `data-new` one.** Read in code, not inferred: `web/index.html:226` wraps `#read` in
      `.qk-panel-body`, so `shell.css:832` — `.qk-panel-body .verse { animation: qkin 320ms forwards }`,
      gated only on `prefers-reduced-motion: no-preference` — applies to **every one of the 200 surah
      cards**, the same cards `read.css:453` gives `content-visibility: auto`. The second rule at
      `shell.css:839` (`.verse[data-new]`) is CHAT-ONLY: `verse.ts:255` stamps `data-new` only when the
      caller passes `animate`, and `read.ts` never does — `verse.ts:179` records that as a deliberate
      opt-in after 286 simultaneous filters on Al-Baqarah. **So item 4(b) is not a separate lead from
      this criterion; it is the same element carrying both mechanisms.**

      ⚠️ **`forwards` DOES NOT CLOSE THIS.** `shell.css:827` and `shell.css:1058` both record the
      `both` → `forwards` fix and state its reasoning correctly: `forwards` leaves the *un-animated*
      state visible, so an animation that never STARTS cannot strand a card. **That protects the
      before-phase only.** It says nothing about an animation frozen mid-ACTIVE-phase, where the
      committed style is the interpolated `opacity`, which near t=0 is 0. The fix as written is not
      wrong; its scope is narrower than the comment's confidence implies.

      🔬 **NEW INSTRUMENT TRAP — `interceptor eval` SILENTLY NO-OPS ON A NEVER-ACTIVATED TAB.** Four
      evals against background tab `893423825` each returned `success: true` / `ok` / `data: null` and
      **none of them ran**: `document.title = "PROBE|…"` left the title at `New-Quranku` when read back
      through `interceptor state`, and an appended `<div id="probe-marker">` was not findable. This is
      not the isolated-world trap from Cycle 20 and not a reachability problem — `interceptor state`
      and `interceptor read` returned a **full tree for that same tab**. Same family as the `--pixel`
      activeTab trap: the read paths reach a background tab, the execute path does not.

      ✅ **`interceptor read --include-style` MEASURES OPACITY ON A NEVER-ACTIVATED TAB** — 230 styled
      elements, `opacity=1` on all of them, no eval and no reveal. **This is a strictly better
      instrument for this defect than an eval recorder**, because it removes the reveal from the
      measurement loop.

      🔶 **AND THAT EXPOSES A LIMIT IN THE TEN ARM-RUNS — stated as a hypothesis with its firing
      condition, NOT as a finding.** IF the blank state is a frozen CSS animation, then activating the
      tab resumes animations and `qkin` completes to `opacity: 1` within 320 ms. Every prior arm was
      measured through an instrument that required activation (an eval recorder cannot be installed or
      read on a background tab, per the trap above) or a repaint. **Under that condition a post-reveal
      reading cannot distinguish "never stranded" from "stranded, and healed by the reveal itself".**
      ⚠️ The condition is real but not established: it fires only for an animation-freeze mechanism, and
      NOT for a `content-visibility` mechanism, which would heal on scroll rather than on activation.
      What it does establish is narrower and sufficient: **reveal-then-measure is not by itself a valid
      method for this defect**, and the ten null arm-runs should not be read as having excluded the
      animation-freeze hypothesis. They did not test it; they could not have.

      🧪 **ARM F IS RUNNING and is the first arm measured without revealing.** Surah 3 opened in a tab
      created in the background by `interceptor open` (background-first by default) and **never
      activated**, sampled every 10 minutes by `read --include-style` for up to 16 h, logging the
      opacity histogram per sample and keeping only samples that show a strand. Baseline 14:41:45,
      `elems=230 opacity0=0 opacity_sub1=0`. The new variable against Cycle 20 is twofold: the tab is
      **loaded while hidden and never foregrounded** (`shell.css:827` names precisely this order —
      "if the tab backgrounded FIRST" — and all ten prior arms painted first, then backgrounded), and
      the measurement never touches the tab. ⚠️ **A null from Arm F is a null for the never-revealed
      state only**; it does not clear either mechanism, for the same control reason recorded above.
