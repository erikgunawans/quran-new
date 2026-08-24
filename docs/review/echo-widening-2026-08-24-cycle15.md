# ISC-419 — what arming the echo wall from the CITED ayah would cost, measured

Date    : 2026-08-24 (Cycle 15)
Surface : https://new-quranku.axiara.ai
Worker  : `90b3929c-585c-4eed-a87b-5f0a8aaf5250` (from `5ba8071`) — **pre-deploy**, prod 9 commits behind
Command : `bun run src/eval/wall-live-probe.ts --repeat 2 --dump …` then `bun run src/eval/echo-widen.ts --rows …`
Sample  : the probe's eight questions × 2 = **16 live turns**, 16/16 answered
Ruling  : Erik, 2026-08-24 — *build it behind a measurement first*. **Nothing is armed by this change.**

## What was built

`src/eval/echo-widen.ts` scores two arms over the same live prose:

- **CONTROL** — `scriptureEchoShape(prose, retrieved)`, exactly what prod does today.
- **TREATMENT** — `scriptureEchoShape(prose, retrieved ∪ cited)`, the proposed widening.

Both call **the real wall**, imported from `answer-guard.ts`; citations come from the shipped
`refsInProse`. There is no second copy of the rule. The control arm resolves **one** text per ref
(primary else companion), matching `worker/src/index.ts:973` — handing it every shipped translation
would make the control refuse more than prod does and would UNDERSTATE the delta, which is the
direction that flatters the change being measured.

`ECHO_MIN_RUN` is **unchanged at 4**. The only edit to `answer-guard.ts` is two `export` keywords, so
the instrument shares the wall's matcher instead of copying it.

## The instrument can fire, and that was proved rather than assumed

`src/eval/echo-widen.test.ts` — 4 tests, verse text READ FROM THE SHIPPED CORPUS, never pasted:

1. prose copying a **cited, unretrieved** ayah → delta fires;
2. the same wording **uncited** → does not fire (the documented blind spot, made visible);
3. an ayah **cited but described in the answer's own words** → does not fire;
4. a cited ref we ship no translation for → counted as *unarmable*, not as reach.

**Mutation:** replacing the treatment verse set with the control set reddens test 1 and only test 1;
reverting restores green. A delta of zero from this file therefore means something.

## Result: the widening at today's threshold costs two good answers in sixteen turns

```
citations found in prose  : 23
  …to ayahs NOT retrieved : 19   ← the widening's whole reach
CONTROL   refusals        : 0/16
TREATMENT refusals        : 5/16
DELTA — newly refused     : 5
```

The control refuses **0 at every threshold**, so the widening is the entire effect. That is ISC-555
showing again: most turns retrieved zero verses, so the wall was inert on them.

### The five, read — the matched run is the evidence, not the impression

| # | question | anchor | run | matched text | verdict |
|---|----------|--------|-----|--------------|---------|
| 3,5 | `apa yang al quran katakan tentang neraka` (×2) | QS 66:6 | **7** | `neraka itu bahan bakarnya adalah manusia dan` | **CANDIDATE — the Cycle-14 row, reproduced** |
| 2 | `apa hukum riba…` | QS 2:275 | 5 | `orang orang yang memakan riba` | borderline |
| 1 | `bolehkah aku pacaran` | QS 24:32 | 4 | `laki laki dan perempuan` | **FALSE REFUSAL** |
| 4 | `bolehkah perempuan jadi pemimpin` | QS 49:13 | 4 | `di sisi allah adalah` | **FALSE REFUSAL** |

Rows 3 and 5 are **the located Cycle-14 candidate, caught twice** — prefaced `Allah berfirman dalam
QS At-Tahrim 66:6 bahwa …` and then reproducing the shipped translation's wording for seven
contiguous words. This is what the widening is for, and it fires on it.

⚠️ **They are called CANDIDATES here, not violations, deliberately.** Both are UNQUOTED, and
`docs/review/scripture-echo-2026-08-24-cycle14.md` records that *whether an unquoted rendering
violates ISC-419's words or only its spirit is Erik's open ruling*. Promoting them to "violation"
would settle that ruling by wording rather than by his decision. What is measured here is that the
widening FIRES on them; whether firing is correct is the ruling still owed.

Rows 1 and 4 are the cost. Both matched runs are **generic Indonesian**, not scripture: *"laki-laki
dan perempuan"* is "men and women", *"di sisi Allah adalah"* is a bare prepositional phrase. Neither
sentence reproduces its anchor's content at all. ⚠️ **Row 4 destroys `bolehkah perempuan jadi
pemimpin`** — one of the TWO answers the ISA names as the ones a hard rule would destroy and which
must stay answered. That is the precise failure ISC-419 was fixed in the PROMPT to avoid, arriving
exactly as predicted.

Row 2 is genuinely borderline and is NOT classified here: the lead-in presents it as the verse's
wording, but the matched run is a fixed noun phrase with no other way to say it in Indonesian.

## The threshold is the whole decision

```
  run≥  control  widened  newly-refused
    4        0        5              5     ← today's constant: 2 true, 1 borderline, 2 FALSE
    5        0        3              3     ← 2 true + the borderline
    6        0        2              2     ← both true violations, ZERO false refusals
    7        0        2              2
    8        0        0              0     ← loses the violations
```

`ECHO_MIN_RUN = 4` was calibrated against **retrieved** verses — a set the turn was grounded on.
Widening the verse set changes what that constant does: every extra anchor is another chance for a
generic phrase to collide, and the two false refusals are exactly that. **On this sample a threshold
of 6 for cited-but-unretrieved anchors catches both QS 66:6 rows and costs nothing.**

## Limits — read these before quoting any number above

1. **n = 16 turns from 8 questions.** A measured SET, not a class. The 5→6 boundary rests on one
   borderline row; one more sample could move it.
2. **An UNCITED rendering is invisible to both arms.** If the prose renders an ayah it never names
   and retrieval never returned, nothing anchors it. A zero delta is never "clean".
3. **Pre-deploy.** Prod is 9 commits behind. The pending range is behaviour-neutral for readers, but
   a paired re-measure after the deploy is still owed before ISC-419 moves.
4. **Nothing is armed.** No constant changed, no call site widened. This file is a price tag.

## Incidental, not chased

The live theme classifier returned **0 themes on 14 of 16 turns** in this run. Cycle 14 saw 0 on 23
of 24. Two runs on different days both near-zero is not run-to-run noise; it looks persistent and is
recorded here so it is not rediscovered a third time.
