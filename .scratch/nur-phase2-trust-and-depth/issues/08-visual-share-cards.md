# 08 — Visual (image) share cards

Status: done
Type: enhancement
Priority: P3

**2026-07-15 — Shipped.** `web/src/share-image.ts` (canvas-rendered PNG card) + `shareVerseImage()`
in `share.ts`, wired as a new "Kartu" button beside Salin/Bagikan on every verse card. See
`PROGRESS.md`'s matching checkpoint and `ISA.md` § Decisions for full detail, including a
disclosed Forge quota-blocker deviation.

**2026-07-14 — Unblocked.** 01–03 and 06 all shipped this session (see `PROGRESS.md`), so the
UI this issue would build against is now stable. Moved from `needs-triage` to `ready-for-agent`.

## Problem

`web/src/share.ts` already ships text-based sharing (Web Share API + clipboard fallback, both
renderings + attribution carried on egress — `ISC-36..38` in `ISA.md`, done in Phase 1). The
research recommends going further: a rendered *image* verse card (Ayah's "hold to interact"
pattern), matching Gen Z sharing behavior on Instagram/WhatsApp status where an image reads
better than a text dump.

## Why this is lower priority than it looks

Base sharing already exists and already carries attribution correctly — this is a richer
*format* of an already-solved problem, not a gap. It's filed as `needs-triage` rather than
`ready-for-agent` because it should wait until 01–03 (trust/utility fixes) and ideally 06 (lens
toggle, which affects what a "default" verse card even shows) land first, so the image-card
design isn't built against a UI that's about to change underneath it.

## Constraint this must respect

Same as every egress path in this product (`ISA.md` § Decisions, "Share payloads must carry the
interpretive label"): any generated image card must carry both renderings' attribution, and must
never present the interpretive rendering as unlabelled canonical scripture. An image is easier to
strip context from than plain text — this constraint needs *more* care in an image format, not
less.

## Comments
