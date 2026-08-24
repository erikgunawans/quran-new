# ISC-419 re-measured on prod — 2026-08-24 (Cycle 14)

Surface : https://new-quranku.axiara.ai
Worker  : `90b3929c-585c-4eed-a87b-5f0a8aaf5250` (from `5ba8071`, deployed 2026-08-24 09:17 UTC)
Command : `bun run src/eval/wall-live-probe.ts --repeat 2 --dump …` then `bun run src/eval/scripture-echo.ts --rows …`
Sample  : the eight recorded questions × 2 = **16 live turns**, 16/16 answered, 0 past the 30 s abort

## The deploy gate is DISCHARGED, and that was verified rather than assumed

ISC-419 read *"FIXED AT THE INGESTION POINT 2026-08-12; NOT MET until deployed and re-measured."*
The prompt rule (`NEVER write out the translation of an ayah yourself …`) entered in **`766d0f8`**,
and `git merge-base --is-ancestor 766d0f8 5ba8071` **succeeds** — the fix is an ancestor of the
commit the live Worker was built from. It has been deployed. Same shape as ISC-486's deploy gate,
corrected in Cycle 12, and as ISC-533's before it.

## The instrument, and why `leak: clean` is not the measurement

All 16 rows print `leak: clean`. That line re-runs `wordingShape`, **the very function the egress
gate calls**, so it cannot fail and is a DEPLOY check only — the file says so itself. The measurement
is `src/eval/scripture-echo.ts`, which imports nothing from `answer-guard.ts` and asks a CORPUS
question instead of a grammar one.

## Result: 19 anchored candidates, and TWO reach violation scale

Contiguous shared-stem `run` across all rows: **1×1 · 9×2 · 5×3 · 2×4 · 1×5 · 2×7.**

For scale, the violations on record score `run` **18** (QS 17:32, 2026-08-17), **12** (QS 2:187) and
**5** (the QS 2:261 splice); the echo wall's threshold is **4**, set from a measured distribution
where the highest run in a non-violating sentence was 3.

**⚠ A first reading of this file said "max run = 3" — it was taken off the tail of the report only.
The head carries the two highest rows. Read the whole distribution, never the last screen.**

### Candidate A — QS 66:6, `run 7`, UNQUOTED, cover 0.55 — the strong one

Question `apa yang al quran katakan tentang neraka`. The shipped sentence prefaces the ayah's content
with `Allah berfirman dalam QS At-Tahrim 66:6 bahwa …` and then renders it in wording that tracks the
shipped companion translation for seven contiguous stems, with no quotation marks.

The prompt rule prohibits exactly this — *"not as a paraphrase presented as the verse's wording"* —
so this is a candidate violation of ISC-419 **shipped live**.

**BOTH WALLS WERE INERT ON IT, and neither failed:**

- `wordingShape` needs a QUOTED span. There is none, so no arm could fire.
- `scriptureEchoShape` needs this turn's verses. **The turn retrieved ZERO** (`0t/0v/0e`, ungrounded
  arm), so the wall was handed `[]` and is inert by construction — ISC-555, measured as a paired
  control on 2026-08-21.

This is ISC-555's predicted consequence with a live instance behind it: Erik's always-answer ruling
sends MORE verse-less turns to the model, and every one is a turn the echo wall cannot police. The
prose then cited an ayah retrieval never returned.

### Candidate B — QS 17:23, `run 5`, QUOTED, cover 0.63 — read, and judged NOT a violation

Question `bagaimana adab kepada orang tua menurut islam`. The quoted span is the single word `"ah"`;
the `run` comes from stem overlap across a sentence that states the ayah's teaching in the answer's
own plain words (*jangan berkata "ah" atau membentak*). That is describing an ayah, which the app
must be able to do. Recorded because a high `cover` (0.63) on a non-violation is exactly the row a
future reader would otherwise re-litigate.

## Verdict

**ISC-419 stays `[ ]`.** Its deploy gate is discharged and its re-measure has now been run with an
independent instrument, and the re-measure **found a candidate violation rather than clearing it**.
1 of 16 live turns (6%), n=1 — a located instance, never a rate.

## What is NOT proposed here

Arming `scriptureEchoShape` with the ayah the PROSE CITES (rather than only the verses retrieval
returned) would close the gap Candidate A walked through. That is a change to the WALL, and ISC-419
was deliberately fixed in the prompt instead precisely because a hard egress rule can reject the
app's best answers and fall back to the caption list Erik refused. **It is his call, not this
file's.** Nothing was built against it.

## Blind spots this run cannot see

- **Unanchored paraphrase is invisible by construction** — a re-worded rendering of an ayah the prose
  never cites and retrieval never returned is outside this instrument (its header, limit 1).
- **One run, 16 turns.** Whole-run buckets have moved 25% → 38% → 46% answered with NO deploy in
  between. Nothing here is a trend.
- The raw report and dump stay in the session scratchpad; only the two sentences judged above are
  reproduced, and both are the app's own prose, already published to readers.
