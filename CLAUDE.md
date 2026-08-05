# CLAUDE.md

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature>/` — not GitHub Issues. The repo does have a remote (`quran-new` → github.com/erikgunawans/quran-new) and lands work via PR (PR #1 merged through it). See `docs/agents/issue-tracker.md`.

### Triage labels

Five default triage roles, strings unchanged (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
