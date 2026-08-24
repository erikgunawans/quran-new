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

---

## PAIRED RE-MEASURE AFTER THE DEPLOY — 2026-08-24, Worker `5c6fe3ca`

Erik deployed (`5c6fe3ca`, replacing `90b3929c`) and the probe was re-run against it, same eight
questions × 2. This is the paired arm the pre-deploy section said was owed.

```
                      pre-deploy (90b3929c)   post-deploy (5c6fe3ca)
answered turns                 16                      16
citations in prose             23                      22
  …to unretrieved ayahs        19                      17
CONTROL refusals              0/16                    0/16
TREATMENT refusals            5/16                    3/16

sweep, newly-refused by floor
  run≥4                         5                       3
  run≥5                         3                       1
  run≥6                         2                       1
  run≥7                         2                       1
  run≥8                         0                       0
```

**THE ABSOLUTE COUNTS MOVED AND THE DECISION DID NOT.** Delta at `run≥4` fell 5→3; at `run≥6` it
fell 2→1. This is exactly the run-to-run variance the limits section warned about, and it is why
n=16 was recorded as a SET rather than a class. **Never quote either run's delta as a rate.**

**What replicates is the thing the threshold was chosen for.** In BOTH runs, at `run≥6`, the ONLY
row that fires is QS 66:6:

| run | post-deploy row | anchor | verdict |
|-----|-----------------|--------|---------|
| **7** | `…neraka itu bahan bakarnya adalah manusia dan batu, dan penjaganya adalah malaikat…` | QS 66:6 | the shape ISC-419 was re-opened for |
| 4 | `…yang menyamakan orang yang memakan riba dengan orang yang berdiri seperti kemasukan setan…` | QS 2:275 | describes the ayah, reworded — over-refusal at 4 |
| 4 | `…bahwa orang yang memakan riba akan berdiri di hari kiamat seperti orang yang kemasukan setan…` | QS 2:275 | same |

Both `run 4` rows match `orang yang memakan riba` — a fixed noun phrase with no other way to say it
in Indonesian, in sentences that REWORD the ayah rather than reproduce it. Refusing them is
over-refusal, and `ECHO_MIN_RUN_CITED = 6` does not.

**The QS 66:6 shape is PERSISTENT, not a one-off.** It appeared 3 times across 32 live turns
(2 pre-deploy, 1 post-deploy), each time prefaced `Allah berfirman dalam QS At-Tahrim 66:6 bahwa …`
and each time reproducing the shipped wording for seven contiguous words. It remains a CANDIDATE —
the unquoted question is still Erik's open ruling — but it is a reproducible candidate, not a
sampling artefact.

## Deploy verification, recorded because two of the checks were traps

- **`KAJIAN` is LIVE**, proved by a PAIRED probe, not by the 403. An unauthenticated POST to
  `/api/runner/kajian/upload` returns **403 `forbidden`** — and that proves NOTHING about the
  binding, because `isRunner()` gates the whole `/api/runner/kajian/` prefix BEFORE
  `handleRunnerUpload` (where the `if (!bucket) return 503` lives). The real discriminator, which
  writes nothing: authenticated + deliberately invalid artifact name → **400 `invalid_artifact`**,
  i.e. execution reached past the bucket check. Control arm, wrong secret, same request → 403.
- ⚠️ **`/api/auth/role` CANNOT be verified from a browser address bar.** The same URL returns
  `application/json` to a normal request and the **SPA shell at 200** to a navigation. Isolated to a
  single header with a paired control: `Sec-Fetch-Mode: navigate` alone flips it. Cause is
  `not_found_handling = "single-page-application"` in `worker/wrangler.toml` — Cloudflare's asset
  handler answers navigation requests before the Worker runs. **So the `ADMIN_EMAILS` check must be
  made from the app's own UI (which uses XHR) or by curl with the session cookie — never by opening
  the URL.**
- ⚠️ **`.build-meta.json` is not a served asset** — requesting it returns the SPA shell at 200. The
  shipped bundle's `gitSha` reads `987126e`, one commit behind `55b57ba`, because the build ran
  before that commit; the bundle CONTENT includes the cited floor (built from the working tree).
  Behaviour is identical either way since no call site passes `origin: "cited"`.
