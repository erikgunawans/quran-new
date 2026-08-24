# CLAUDE.md

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature>/` — not GitHub Issues. The repo does have a remote (`quran-new` → github.com/erikgunawans/quran-new) and lands work via PR (PR #1 merged through it). See `docs/agents/issue-tracker.md`.

### Triage labels

Five default triage roles, strings unchanged (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Memory in this repo: a fixed-size working set, not an archive

`memory/MEMORY.md` is loaded whole at session start against a hard byte budget, and **when it
overflows the tail is silently cut — and the tail is the NEWEST entries.** On 2026-08-25 it stood at
26.9 KB / 167 entries and the newest **nine never loaded**, including the trap explaining why
`ECHO_MIN_RUN_CITED = 6` and the one about `Sec-Fetch-Mode: navigate`. Five of those nine were needed
that same session; they only landed because `.planning/next-session-prompt.md` repeats them.

At ~145 characters a hook the budget holds **roughly 160 entries, permanently**. So this is not a
tidiness problem: past that point **every new memory costs an old one**. Two rules follow.

**1. State does not go in memory.** Before writing an entry, ask: *does a deploy, a merge, or a
decision make this false?*

- **Yes → it is state.** It belongs in `ISA.md`, `PROGRESS.md`, or
  `.planning/next-session-prompt.md`, which already track it per-cycle with evidence and are read
  first every session. A stale memory is worse than none: `quran-new-prod-deployed` sat in the index
  naming a version that had already been superseded twice.
- **No → memory.** Durable traps ("a 200 can be the SPA fallback"), rights and permission facts,
  `user`, `reference`. Rights entries are never retired on size grounds — being wrong there costs
  something other than time.

**2. Retiring is part of writing.** At `/wrap`, if the index is within ~1 KB of the budget, retire
before adding. Prefer **deleting superseded entries** over shortening surviving ones: a hook's second
clause is usually its actionable half, and a mechanical trim of 80 hooks was tried on 2026-08-25 and
**reverted** — it cut "write the failing test BEFORE implementing it" and "verify by schema not the
checkmark", and severed several mid-phrase. Merging is also usually a bad trade: one 145-char hook
cannot carry four unrelated retrieval triggers.

A full backup lives at `scratchpad/memory-backup-2026-08-25.tgz` for the 2026-08-25 pass.
