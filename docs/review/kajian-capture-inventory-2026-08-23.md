# Final inventory of the Darussalam capture, taken at deletion — ISC-626

> Measured 2026-08-23 from the directories themselves, immediately before deleting them. **Counted,
> not inherited** — ISC-626's standing instruction, because every previous count of this material ran
> the same direction: smaller than it was.
>
> This file exists because after the deletion the count is unrecoverable, and the disclosure record
> has to rest on a number somebody actually measured.

## What was held

Two directories, both gitignored, never published:

| Path | Size |
|---|---|
| `.scratch/kajian/brlqHxjIp9c/` | 12 MB |
| `.scratch/kajian/_transcripts/masjid-darussalam-kota-wisata/` | 656 KB |
| **Total** | **12,808 KB** (12.5 MiB / 13.1 MB decimal) |

Source: *15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A.*, Masjid Darussalam Kota Wisata,
YouTube `brlqHxjIp9c`, duration 7,365 s (2 h 3 m).

## The number every previous count missed

**The entire lecture was held verbatim: `transcript-raw.json`, 2,586 snippets, 77,528 characters.**

Every earlier record described the *derived* `briefing.md` — "four quotations", then "eleven", then
"twelve" — and none of them mentioned the raw transcript at all. That is the fifth time this material
has been described smaller than it is, and it is by far the largest miss: the difference between
holding a dozen quotations and holding the whole thing.

## `briefing.md` — the recount ISC-626 asked for

223 lines, 12,889 bytes. Two readings, both stated so nobody has to guess which was used:

| | Strict | **Larger (preferred)** |
|---|---|---|
| Blockquoted passages of their material | 4 | 4 |
| Straight-quoted spans of their material | 8 | 9 *(includes the lecture title at L184)* |
| **Quoted passages** | **12** | **13** |
| Verbatim transcript excerpts (`## Perlu dicek terhadap video (32)`) | 32 | 32 |
| **Total quoted or verbatim spans** | **44** | **45** |

The previously published figure was 12 + 32 = 44. The larger reading is **45**. Two further
blockquote blocks in the file (L1, L21) are OURS — the draft banner and the ADR 5 disclaimer — and
are excluded, because this is a count of their material, not of blockquotes.

## Other derived artefacts held

- `slide.html`, `slide.png` — one rendered summary
- `narasi-DRAFT.m4a` — long-form machine narration, a standalone reading of their content
- `short-DRAFT.mp4` — the short-form slide video

## What happened to it

**Deleted 2026-08-23**, on Erik's instruction, together with the decision that the runner does not
launch on their material (ISC-630 held permanently). Nothing derived from it was ever published:
prod ran Worker `641f8ae2` from `44ed447` throughout, with no kajian route, no D1 and no runner.

**NOT deleted:** `.scratch/kajian/jNQXAC9IVRw/` — "Me at the zoo", a 19-second public video kept as
the pipeline's only working test capture. It is third-party material too, and that is recorded rather
than glossed; it is retained because the pipeline needs one real capture to test against and this one
is 19 seconds of a zoo.

**Git history is untouched.** Their name, the lecture title and the mosque remain in 13 pushed
commits (earliest `43eee9e`). A rewrite was considered and DECLINED — see ISC-627.7d.
