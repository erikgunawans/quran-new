# Ruling: no third-party logo or branding on any summary, ever

> **Erik, 2026-08-23**, on the DA's recommendation. Closes rights items 1 and 2, which had stood
> open across six handoffs.

## What was open

Two questions had been carried as separate, unanswered items:

1. **Does the source channel's logo clause reach a machine-written summary at all?** — a
   clause-reading question, recorded in `docs/review/rights-darussalam-logo-2026-08-23.md`.
2. **Should a summary carry the source's logo?** — a product question.

Item 3 of that set ("ask the mosque?") became moot when the letter was cancelled (ISC-629).

## The ruling

**No summary carries any third party's logo, wordmark, channel art, thumbnail, or other branding.
Not the source's, not anyone's. There is no case-by-case reading.**

This is a blanket rule and it REPLACES both open questions rather than answering them. The reasoning
Erik accepted:

- A blanket rule is simpler than reading a licence clause per source, and it cannot be got wrong by a
  future reader who reads the clause differently.
- There is no upside. A borrowed logo on a machine-written, unreviewed religious summary implies an
  endorsement that nobody gave — which is the same failure ADR 5 exists to prevent for NAMES.
- It costs nothing to obey: the slide already refuses a borrowed logo, a scraped thumbnail and an
  unrostered name. This makes the refusal a rule instead of a default.

## What it means in the code

Already true, now with a stated reason rather than a pending question:

- `src/app/kajian-slide.ts` refuses the logo, the video thumbnail and the speaker name.
- The card's `thumbUrl` is OUR OWN rendered `slide.png`; `src/app/kajian-runner.ts` FAILS the job
  rather than falling back to `meta.thumbnailUrl`, which is the uploader's image.
- `worker/src/kajian-jobs.ts` accepts no field that could carry branding.

## What it does not do

It does not settle **attribution**. A summary still links to its source and still says what it is —
an automatic summary, not a quotation (ADR 5). Refusing someone's logo is not refusing to credit
them; it is refusing to wear their identity.
