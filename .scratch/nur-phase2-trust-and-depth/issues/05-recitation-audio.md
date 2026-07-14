# 05 — Recitation audio on the reading surface

Status: done (MVP — see Scope delivered)
Type: new capability
Priority: P1

**2026-07-14 — Erik ruled on hosting: self-host, shard-style, like the text.**
**2026-07-14 (later) — Erik ruled on reciter: Syaikh Mishary Rashid Alafasy.** Both blockers
resolved; implemented as an MVP this session (see Comments for exactly what shipped vs. what a
full-corpus version would need).

## Problem

`PROGRESS.md` already logs "Audio/recitation is entirely absent — the Qur'an is recitation" as
an open item. The research independently flags this as `[HIGH]` confidence, table-stakes, and
Nur's most glaring category gap — Tarteel AI (15M+ users) owns real-time recitation and voice
search, but the base expectation for *any* Qur'an app, gamified or not, is that you can hear the
verse. Nur currently has zero audio anywhere.

## Scope (deliberately narrow)

This issue is scoped to **playback only** — a recitation audio control alongside the reading
surface (`web/src/read.ts`) and/or verse card (`web/src/verse.ts`), synced to the currently
displayed ayah. It explicitly excludes real-time mistake-correction, voice search ("recite a
phrase, find the ayah"), and any memorization tooling — those are Tarteel's actual product and a
much larger, separate body of work per `ISA.md` § Out of Scope precedent (audio was already
excluded from Phase 1 for the same reason).

## A design change discovered during implementation

"Self-host, shard-style, per-surah fetch, consistent with `web/public/surah/{n}.json`" was the
ruling — but per-SURAH turned out to be the wrong grain once measured. `curl -I` against
mp3quran.net's Alafasy per-surah files (the natural first source to check) showed **Al-Baqarah
alone is 115 MB as a single mp3**. `ISA.md` § Principles: "A 4 MB blob on patchy 4G is a product
failure, not a deployment detail" — a 115 MB one immediately fails that bar by nearly 30×, for
one surah. Switched to **per-AYAH** files (everyayah.com, Alafasy_64kbps — confirmed real,
working, ~25–150 KB per ayah via HTTP HEAD before committing to anything) instead: same
self-hosting principle Erik ruled on, but sized correctly, and it naturally reuses the same
lazy-fetch-on-demand pattern the text shards already use. Recorded here because it's a real
deviation from the literal ruling, made for a reason the ruling itself would very likely have
produced if the 115 MB number had been known at the time — not a unilateral scope change.

## Scope delivered: MVP sample, not the full corpus

Full 6,236-ayah coverage means thousands of individual fetches against a third-party host — a
real ingest run of its own, not something to do casually inside a session already covering two
other issues. What shipped instead: **Al-Fatiha (7 ayahs) + Al-Ikhlas, Al-Falaq, An-Nas (15
ayahs)** — 22 ayahs, ~1.0 MB total, real audio, downloaded, self-hosted, sha256-pinned, and
playable. `hasAudio()` tells the truth about exactly this set — no verse outside it ever claims
audio it doesn't have. Scaling to the full corpus is future work; the architecture (manifest +
per-ayah shard files + `bun run app:audio`) is built to extend, not rebuilt for it.

## Implementation

- [x] `src/app/build-audio.ts` (`bun run app:audio`) — sequential (deliberately, to be a
      considerate API citizen) per-ayah fetch from everyayah.com/Alafasy_64kbps, writes
      `web/public/audio/{surah}/{ayah}.mp3`, sha256-pins to `src/app/audio.lock.json` (same
      drift-detection discipline as `src/ingest/fetch.ts`, kept as a separate lock file since
      this isn't part of the main corpus SOURCES registry).
- [x] `web/src/audio.ts` — inlined manifest (`hasAudio()`, zero-network truth oracle, same
      pattern as the surah index), single shared `<audio>` element, `toggleAudio()`.
- [x] `verse.ts` — a play button renders only when `hasAudio(surah, ayah)` is true; shared
      `setPlayButton()`/`resetPlayButton()` helpers (TEXT-NODE label swap, not the icon span —
      deliberately avoiding the "Salin Salin"-class bug that pattern is already known to risk).
- [x] `main.ts` — wired into the existing delegated click handler; no changes needed in
      `read.ts` at all, since play needs no per-view card lookup (unlike copy/share) — a single
      unscoped listener correctly handles play buttons in both chat and the reading surface.
- [x] "Only one ayah plays at a time" — verified live: playing 1:2 then clicking 1:3 correctly
      resets 1:2's button back to "Dengar" while 1:3 shows "Jeda".
- [x] License disclosed honestly, not hidden: everyayah.com's terms weren't findable —
      documented as "unverified", same disclosed-but-shipped status already accepted for the
      Tafsiriyah translation source (`ISA.md` § Decisions, "Attribution risk accepted").
- [x] `bun test` (72/72 in `web/src/`, `audio.test.ts` covers `hasAudio()`) + `bun run
      typecheck` clean.

## A real bug caught during self-verification

An early version of `toggleAudio()` returned `{ playing: true }` **synchronously**, before
`a.play()`'s promise had actually resolved, and the button was updated immediately from that
optimistic value. Caught live: clicking a button twice didn't toggle it back off, and digging in
revealed why — `a.play()` can reject, and the button was lying about playback state when it did.
Fixed by making `toggleAudio()` `async` and awaiting the real result before the caller updates
the button; a rejection now correctly shows "Gagal memutar audio. Coba lagi." instead of a stuck,
false "Jeda" state.

## A verification limitation, disclosed rather than glossed over

Could not confirm AUDIBLE playback through Interceptor: `a.play()` consistently rejects with
`NotAllowedError: play() failed because the user didn't interact with the document first` when
triggered by Interceptor's synthetic clicks, on every attempt (isolated from any interceptor-tool
quirk by testing with plain `.click()` too — same result). This is Chrome's autoplay gesture
policy, not a file or code defect: the mp3 itself was verified independently (`curl -I` — correct
`content-type: audio/mpeg`, byte count matching the download exactly), and the code calls
`a.play()` synchronously inside a real click handler, the standard correct pattern. This is the
same class of automation limitation already hit verifying the copy button's clipboard write in
issue 02 ("Gagal menyalin" on an eval-triggered click) — a real human tap in a real browser
carries genuine OS-level input that satisfies this policy; Interceptor's synthetic click,
evidently, does not. Recommend a real-device spot-check before considering this fully closed,
since this is the one piece I could not verify end-to-end myself.

## Comments
