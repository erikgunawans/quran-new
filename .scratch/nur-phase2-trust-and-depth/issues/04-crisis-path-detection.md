# 04 — Crisis-path keyword detection

Status: done
Type: fix (safety, P0)
Priority: P0

## Problem

Verified live, typed as a real query: *"aku gak sanggup bayar utang, pengen mati aja"* (I can't
handle the debt, I just want to die). Nur matched on the word "utang" and served a verse about
debt repayment. It entirely missed *pengen mati aja* — plain-language suicidal ideation in
casual Indonesian. There is no crisis path anywhere in the codebase. Rifqi — 19, in debt, at
2am — is `PRODUCT.md`'s founding persona. This is the single highest-severity gap in the product
as it stands.

Research cross-check: none of the four research agents flagged this specifically (it's a
domain-specific safety gap, not a general engagement pattern) — it was already surfaced
independently in `PROGRESS.md` before this research ran, and it remains the top-priority open
item regardless of what the research adds. Filing it here to keep all Phase 2 work in one place,
not because the research changed its priority.

## Erik's ruling (2026-07-14)

1. Resource: **Kemenkes SEJIWA / 119 ext. 8** — confirmed.
2. Response: **alongside** the normal verse match, never instead of it.
3. False-positive tolerance: not explicitly ruled — resolved by inference from #2. Since the
   resource never replaces the normal answer, the cost of a false positive is low (an extra,
   true, caring message), so detection defaults to broad/inclusive rather than narrow. Flagging
   this inference here rather than treating it as silently decided — revisit if it over-triggers
   in practice.

## Implementation

- [x] Phrase-based detection (not single-word — "mati" alone is far too broad), catches the
      exact reproduced case plus common Indonesian phrasings of suicidal ideation.
- [x] Runs on the raw question, independent of ref-parsing/retrieval — triggers regardless of
      what else the message contains or whether retrieval finds anything.
- [x] Resource shown ALONGSIDE whatever Nur would otherwise say (prepended, not a replacement
      branch) — verified live: real query, corpus.json unavailable (this worktree's existing
      limitation), crisis banner appeared FIRST followed by the normal (in this case, honest
      error) response.
- [x] `role="alert"` on the banner — reaches assistive tech immediately, not gated behind the
      polite `#live` region the rest of `say()` uses.
- [x] Regression: verified live that an ordinary ref lookup (`18:10`) does NOT trigger the
      banner — no false positive on normal use.
- [x] Unit tests (`web/src/crisis.test.ts`) cover the exact reported case, common phrasings,
      case/punctuation insensitivity, and explicit non-triggers (ordinary distress language,
      unrelated mentions of death) to guard against both under- and over-triggering drift.
- [x] `bun test` (69/69 in `web/src/`) + `bun run typecheck` clean.

## Comments

**2026-07-14 — Implemented.** New `web/src/crisis.ts` (phrase lexicon + `detectCrisis()` +
`CRISIS_RESOURCE` data) and `web/src/crisis.test.ts` (6 tests). Exported `norm()` from
`retrieve.ts` for reuse rather than duplicating the normalization helper. `main.ts`: computes
`detectCrisis(q)` once at the top of `ask()` (before ref/retrieval branching — a crisis phrase
matters regardless of what else the message contains), then prepends `crisisEl()` to
`answer.innerHTML` right before it's committed to history/DOM — a single insertion point that
applies uniformly to every existing branch (real ayah, bad ref, retrieval hit, honest silence,
fetch error) without duplicating the check into each one. `styles.css`: `.crisis` styled warm
(primary-green wash, not alarm-red) and prominent but not clinical, matching the product's "light
emerging from dark" voice rather than a scary error banner.
