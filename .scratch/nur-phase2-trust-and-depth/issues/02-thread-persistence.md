# 02 — Chat thread persists across reload

Status: done
Type: fix
Priority: P1

## Problem

Verified live: 2 messages in the chat thread → reload → 0 messages. `web/src/main.ts` already
persists theme (`localStorage.setItem("nur:theme", ...)`) and Arabic size (`nur:ar`) but the
chat thread itself lives only in the DOM (`#thread` in `main.ts`), not in storage.

Research cross-check: the research's #1 concrete, evidence-backed recommendation is "utility not
pressure — bookmarks, resume-where-you-left-off" — this bug is the direct blocker to that. Fixing
it isn't just a bug fix, it's the highest-leverage engagement feature the research identified,
because it respects intent the user already expressed instead of discarding it.

## Fix

Persist the thread (messages + their rendered verse/attribution data, not just raw text — the
attribution must survive reload too, per `ISA.md`'s `literal_companion` doctrine) to
`localStorage` keyed e.g. `nur:thread`, restore on load. Respect the existing "hidden and
restored, not destroyed" pattern noted at `main.ts:184` for chat↔read switching — reload should
behave the same way, not worse.

## Acceptance

- [x] Send 2+ messages, reload the page, thread is intact with correct attribution on any verse
      cards. — verified live (Interceptor): asked `18:10`, reloaded, the exchange (question +
      Al-Kahf 18:10 with both readings + attribution) was present after reload, and the copy
      button's `onScreen` lookup for that verse resolved correctly (proving the restored card
      data, not just raw HTML, was repopulated).
- [x] Clearing storage / first visit still starts with an empty thread (no stale-data crash). —
      verified live: cleared `nur:thread`, reloaded, `#hello` greeting reappeared correctly.
- [x] No unbounded growth — capped at `MAX_THREAD_TURNS = 40` in `main.ts`.
- [x] `bun run typecheck` clean (root + web). `bun test` 120 pass, 3 pre-existing unrelated
      failures (see issue 01 comments — missing `data/`, not touched by this change).
- [x] Verified live (Interceptor) — screenshot wasn't available this session (Chrome window was
      minimized, a known Interceptor limitation only the user can clear), so verification used
      the accessibility tree + `eval` against the live DOM and `localStorage` instead, which
      confirmed the actual persisted state directly rather than a visual proxy for it.

## Comments

**2026-07-14 — Implemented.** `web/src/main.ts`: each `ask()` exchange is now pushed as a
`ThreadTurn` (`{ q, html, cards }`) to `localStorage["nur:thread"]` (capped at last 40, silently
no-ops on quota/private-mode failure). `mount()` takes an optional `turnCards` accumulator so
restore can repopulate `onScreen` (needed for copy/share to keep working post-reload) without
re-fetching anything. `restoreThread()` runs at boot, replays stored turns into the DOM directly
— no network dependency, works even if `corpus.json` never loads. Chose to persist rendered HTML
+ card data rather than replaying `ask()` on load, since re-running retrieval against a possibly
different corpus version could return different verses than what the user actually saw.
