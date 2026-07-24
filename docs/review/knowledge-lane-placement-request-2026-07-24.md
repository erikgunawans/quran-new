# Review request — Indeks Tematik as direct Tanya answers (birrul walidain)

**Date:** 2026-07-24
**Reviewer:** Ustadz Ahmad Isrofiel Mardlatillah
**Status:** ❌ CLOSED — MOOT. Erik decided (2026-07-24) no sign-off is needed. The card lane this
package pitched was replaced hours later by the warm AI-authored voice (see PROGRESS 2026-07-24
"answers AS THE USTADZ"): the Peta captions are now grounding HINTS to the model, not displayed
verbatim as the answer, and every answer carries the AI-composed / not-a-fatwa label, so no
scholar attribution rides on it. The review artifact was never forwarded. Kept for history only.
**Related code:** `web/src/knowledge.ts` (`TOPIC_PINS` / `matchPin` / `retrievePinned`), commit `7d148f4`.
Live on demo-quranku.axiara.ai as of version `4eb23c66`.

## What changed

The demo Tanya lane now answers factual/knowledge questions from the reviewed **Indeks Tematik
Al-Qur'an (Ustadz Muhammad Thalib)** BEFORE the AI synthesis lane, instead of letting the model brush
them off. For "kewajiban anak kepada orang tua" it surfaces a **curated pin** of four of Ustadz
Thalib's verbatim, attributed entries — displayed, never authored, not as a fatwa.

## The two asks put to the ustadz

1. **Placement** — is it acceptable to surface Ustadz Thalib's Indeks Tematik entries as *direct
   answers inside Tanya* (until now they appeared only on the Tematik pages)?
2. **The ref list** — for this question, are the four entries below correct and sufficient? Anything
   to replace, drop, or add?

## The four pinned entries (birrul walidain), in display order

| # | Ustadz Thalib caption (verbatim) | Ref | Shard |
|---|----------------------------------|-----|-------|
| 1 | Kewajiban anak berbakti pada orang tua | 17:23 | keluarga |
| 2 | Berbakti kepada ibu-bapak | 2:83 | perintah-dan-larangan |
| 3 | Mengikuti ajakan orang tua untuk berbuat syirik (batas ketaatan) | 29:8 | perintah-dan-larangan |
| 4 | Anak usia 40 sadar hutang budi pada orang tua | 46:15 | keluarga |

Note: 2:83 is shard-keyed to `perintah-dan-larangan` deliberately — the same verse carries a different
caption ("Wajib berbuat baik pada anak yatim") in `keluarga`, and the birrul-walidain reading is the
perintah one.

## The review package

Self-contained review page (Bahasa, byte-exact Arabic spliced from the surah shards, both Tarjamah
Tafsiriyah + Harfiah, per-entry verdict + copy-summary tool), built for the ustadz to review and reply:

**https://claude.ai/code/artifact/fb190430-cb1f-4e62-afa4-75e8fae2c909**

Generator + data: session scratchpad (`build-review-page.mjs`, `review-data.json`) — not shipped.

## On his answer

- **Placement approved** → the lane stays as-is; record the confirmation here.
- **Placement declined / conditional** → gate the pin lane behind the condition (do NOT ship a
  conditional approval as a plain one — see the co-display precedent).
- **Ref list edited** → update `TOPIC_PINS` in `knowledge.ts` (add/drop/replace refs, shard-keyed),
  re-run tests, redeploy.
