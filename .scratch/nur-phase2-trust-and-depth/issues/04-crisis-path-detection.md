# 04 — Crisis-path keyword detection

Status: needs-info
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

## Why this is blocked

This is not an engineering-scoped decision. It needs Erik's ruling on:
1. Which resource to serve (PROGRESS.md names Kemenkes SEJIWA / 119 ext. 8 as the candidate —
   needs confirmation this is current/correct, and any additional resources to include).
2. What the detected response should say and do (show the resource alongside or instead of a
   verse match? Always? Only when confidence is high?).
3. False-positive tolerance — Indonesian slang for distress is broad; over-triggering on
   hyperbole ("mau mati aja rasanya" as a mundane complaint) vs under-triggering on real
   ideation is a judgment call with real consequences either way.

## What unblocks this

Erik's ruling on the three points above. Once ruled, this becomes a standard ready-for-agent
issue: keyword/phrase detection layered before retrieval, routes to a dedicated response path
independent of the verse-matching score, tested against both the real reproduced case and
plausible near-misses (to catch under- and over-triggering).

## Comments
