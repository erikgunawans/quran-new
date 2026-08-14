---
name: coverage
description: Report generated-content coverage (hadith Indonesian and other sidecars) by distribution, and diff what is on disk against what is built against what is live. Use when asked how much is translated, why something is missing from the app, or before deploying generated content.
---

# Coverage

Answers "how much of this is done, and how much of it can a reader actually see" — which are **three different numbers**, and confusing them has produced wrong answers twice.

Run `.claude/skills/coverage/Tools/coverage.ts`:

```bash
bun run .claude/skills/coverage/Tools/coverage.ts
```

## The two mistakes this exists to prevent

**1. A count is not a distribution.** "21 files translated" was once reported as "books 1–21". The real book numbers were `0 1 6 7 10 16 17 20 21 26 27 30 31 36 37 40 41 47 50 51 56` — scattered, not a range. Anyone acting on the wrong reading opens book 3, sees nothing, and concludes the feature is broken. **Always print which books, never just how many.**

**2. On disk ≠ deployed.** Generated content under `web/public/` is a **gitignored sidecar baked into the static bundle at build time**. It does not stream. Output written after the last build is invisible to every reader while looking complete on disk — 3,935 finished translations sat in exactly that state while production served the older copy.

So the tool reports three columns, and a gap between any two is the finding:

| column | question |
|---|---|
| `public/` | what the generator has produced |
| `dist/` | what the last build baked in |
| live | what production actually serves |

## Checking live correctly

A missing asset returns **`200 text/html`** — the SPA fallback. Status alone will tell you every book exists. The tool checks `content-type`; if you probe by hand, do the same:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://new-quranku.axiara.ai/hadith-id/muslim/8.json
```

## Reporting

Lead with the reader's number — what is live — because that is the only one that is true for a user. Then the gaps, each with its remedy: `public > dist` means rebuild; `dist > live` means deploy; a whole collection at zero means the generator has not reached it yet.

Name collections that are entirely absent explicitly. Ṣaḥīḥ Bukhari at zero is roughly half the corpus, and a percentage averaged across both collections hides that completely.
