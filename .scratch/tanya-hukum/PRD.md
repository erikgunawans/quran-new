# Tanya must answer hukum questions — grilling outcome, 2026-08-11

> Erik's framing: *"What I'm hoping for is for the system to answer me regarding what is said in
> Islam. Yes, first look for something based on Qur'an and Hadith, but some knowledge — even based
> on Qur'an and Hadith — still needs some opening so we can really search it."*
>
> Trigger: `saya mau tanya tentang hukum warisan di islam` → *"Aku belum menemukan ayat yang cocok
> dengan itu di korpus yang sudah diverifikasi."*

## FALSIFIED 2026-08-12 — step 1 was chasing a bug that is not there

**Everything below this section that concerns TOPIC SELECTION is wrong, and was measured wrong
rather than argued wrong.** Erik approved dropping it on 2026-08-12. Kept, not deleted, because the
reasoning trail is the point.

The PRD recorded `matchTopic("hukum warisan") -> perintah-dan-larangan` as the bug and `-> keluarga`
as the fix. Run end-to-end instead of at the `matchTopic` boundary, it is the other way round:

```
retrieveKnowledge("warisan")                            -> keluarga,              0 entries
retrieveKnowledge("hukum warisan")                      -> perintah-dan-larangan, QS 4:11 + 4:19
retrieveKnowledge("saya mau tanya tentang hukum waris…") -> perintah-dan-larangan, QS 4:11 + 10:94 + 4:19
```

`keluarga` holds 40 entries — marriage, talak, parenting — and **not one mentions inheritance**. The
faraidh dalil is in Perintah dan Larangan (4:11 *"Berikan bagian warisan kepada anak perempuan
setengah bagian anak lelaki"*, 4:33) and Karakteristik Negara Bersyari'ah (2:180). Building step 1
would have routed the question away from QS 4:11 into a category with nothing in it, and the
proposed regression test would have pinned that deletion as correct.

**The refusal does not reproduce.** Asked verbatim on live production
(`new-quranku.axiara.ai`, bundle `index-BjuemEbN.js`, 2026-08-12), *"saya mau tanya tentang hukum
warisan di islam"* returns Ustadz Thalib's Perintah dan Larangan entries, QS 4:11 first. If the
refusal was real it came from a different surface or an older bundle — see Open items.

**Why the original diagnosis looked so solid:** `matchTopic` was probed in isolation and its output
compared against intuition about where inheritance "should" live. Nobody asked the corpus where the
inheritance verses actually are. A routing function's return value is not evidence about an answer;
only the answer is. This is the same shape as the three checks that could not fail, logged in
PROGRESS.md the day before.

**What was actually broken, found while measuring, now fixed:** the question-frame discipline stops
at the topic boundary and never reached entry ranking. `tanya` — the single most common Indonesian
question opener, and this app's own name for the feature — was missing from the speech-act stop
list that already held `ceritakan`, `jelaskan`, `sebutkan`, `jawab`, `beritahu`. So Erik's preamble
ranked QS 10:94 *"Tanyakan kebenaran Al-Qur'an kepada Ahli Kitab"* into second place in an answer
about inheritance. That noise line is visible in the live capture above. Fixed in `topic-words.ts`,
force-red verified, pinned in `web/src/tanya-hukum.test.ts`.

## The finding that reframes everything

**Nothing is missing. The app owns all three pieces and cannot reach two of them.**

| Piece | State | Evidence |
|---|---|---|
| The dalil | **Already deployed.** QS 4:11, 4:12, 4:176 with full Indonesian | `web/public/surah/4.json`, verified present |
| The orientation | **Already deployed.** 6,237 per-ayah tafsir files, 3 named sources | `web/public/tafsir/{surah}/{ayah}.json`; `source:as-saadi`, `source:ibn-kathir`, `source:mukhtasar` |
| The lane | **Already built.** Quote-verbatim-never-compose over Thalib's Indeks Tematik | `web/src/knowledge.ts`, 2,451 cited entries |

Al-Mukhtasar's Indonesian for QS 4:11 already says *"anak laki-laki mendapatkan dua kali lipat
bagian anak perempuan"* — a Riyadh committee source, not AI, on our own server. The app can be
genuinely useful on fara'id **without composing one sentence of fiqh in its own voice.**

The refusal message is true about the 191-verse verified corpus and false about the application.

## Root cause — reproduced, not theorised

```
matchTopic("warisan")                              -> keluarga              CORRECT
matchTopic("hukum warisan")                        -> perintah-dan-larangan WRONG
matchTopic("saya mau tanya tentang hukum warisan…") -> perintah-dan-larangan WRONG
matchPin(…)                                        -> null on all of them
```

`hukum` out-ranks `warisan` and drags topic selection into the generic
"perintah dan larangan" bucket, which holds nothing about inheritance → fallthrough → silence.

**This is a hole in an existing, deliberately-designed mechanism, not a missing feature.**
`QUESTION_FRAME` (`topic-words.ts:83`) already contains `hukum`, with a *measured* argument for why
an IDF threshold cannot make this distinction (`hukum` is 6/626 = 1.0% in Perintah dan Larangan,
RARER than the legitimate `riba` at 2.9%; word CLASS is the separator, not frequency). But
`QUESTION_FRAME` is consumed only at `knowledge.ts:166,423,445` — ranking entries **inside** a
topic. `matchTopic` (`knowledge.ts:203`) scores raw alias hits and discounts only `FRAME_ALIAS`.

**`subjectHit` — the function `topic-words.ts:81` says "See `subjectHit` for how this is used" —
does not exist anywhere in the repo.** The topic-selection half of the guard was designed,
documented, and never written.

Same bug class as the demo's "can't answer common knowledge" incident: not a missing source,
but direction-blind ranking plus absent topic-pins.

## Decisions taken (Erik, grilled 2026-08-11)

1. **What "answer" means — show the dalil, do NOT rule.** Name the ayah, render it, and say what it
   is about. Never issue the ruling, never compute the asker's shares. The unconditional
   `fatwaShape` guard stays exactly as it is, and Fikih's *"kami tidak berfatwa"* is unchanged.
   *Erik's amendment:* **it must not be dry.** A bare pointer is not an answer — the reader must be
   told what the dalil is actually talking about. "The system has to be smart to answer it."

2. **Architecture — a second lane with a different safety model.** The 191-verse feelings lane keeps
   its per-verse ustadz review untouched. The knowledge lane's safety is a different guarantee:
   *it may only quote sourced material verbatim with attribution, and may never compose.* Two lanes,
   two guarantees, neither weakened. (This lane already exists and already honours that line.)

3. **Third tier — Tanya may quote tafsir.** After Indeks Tematik, fall through to: name the ayah(s),
   render them, quote the sourced tafsir verbatim and attributed ("menurut Tafsir Al-Mukhtasar…").
   This is what makes the answer not-dry without the app ever ruling.

## Build order — REVISED 2026-08-12 after the falsification

1. ~~**Write `subjectHit`**~~ **DROPPED.** There is no topic-selection bug to fix. The comment at
   `topic-words.ts:81` pointing at a function nobody wrote is stale documentation, not a missing
   guard — the guard it describes would have made routing worse. Delete the comment; do not write
   the function. **Done instead:** the speech-act stop-list gap above. Green.
2. **Topic pins — only where retrieval is measurably thin** (Erik, 2026-08-12). Measured end-to-end
   across all eight candidates rather than assumed:

   | Subject | Entries | Verdict |
   |---|---|---|
   | `warisan` (bare) | **0** | PIN — cross-shard: 4:11 + 4:33 (p-d-l), 2:180 (karakteristik), 4:176 (allah) |
   | `nikah` (bare) | **0** | PIN — keluarga is full of marriage entries the bare word cannot reach |
   | `talak`, `aurat` | 1 | thin; pin candidates, lower priority |
   | `riba` 2-3, `zakat`/`puasa`/`sholat` 8 | | **no pin** — already correct, a pin here can only regress |
   | `pacaran` | **0** | **NO PIN POSSIBLE** — absent from all 2,451 entries |

   The pin ref-lists are curation and go to Ustadz Ahmad before they ship.
3. **Third tier**: ayah + verbatim attributed tafsir when tiers 1–2 come back thin. Note the limit
   discovered while measuring: tier 3 orients an ayah we already have, so it cannot rescue
   `pacaran`, where there is no ayah. Silence stays right there — routing pacaran to the zina
   entries would be the app deciding pacaran IS zina, which is a ruling.
4. **Regression tests** — DONE, `web/src/tanya-hukum.test.ts`, 11 tests, each force-red verified.
   Pins the working behaviour (4:11 reachable, riba stays in p-d-l, sholat in ibadah, feelings route
   nowhere, pacaran stays silent) so the next "fix" cannot quietly delete it.

## Open, and NOT settled by this grilling

- **Which tafsir, in what order, for hukum questions.** As-Sa'di, Ibn Kathir and Al-Mukhtasar are
  different schools and eras. Erik chose the third tier without gating it on the ustadz first; the
  source-ordering question should still go to Ustadz Ahmad before it ships.
- **Rights on the tafsir layer.** It is already deployed, so this is not new exposure — but
  `src/ingest/sources.ts` labels for the translation layer were flagged as stronger than the
  evidence (the `CC BY-ND 3.0` string on `tanzil-id-kemenag`; Tanzil publishes "non-commercial
  purposes only" and names no CC licence). Worth correcting regardless of this feature.
- **Where hadith fits.** Fara'id is largely Qur'anic, but most hukum is not. The OKF hadith
  retrieval lane exists and is gated; it is out of scope here and stays gated.
- **The refusal copy.** Even after this lands, the fallback message should probably stop saying
  "korpus yang sudah diverifikasi" — it describes an internal structure the reader cannot see.


## Attempted 2026-08-11, reverted — what step 1 is NOT

Two candidate fixes were written, measured and backed out. The tree is unchanged; this section
exists so the next session does not spend the same hour.

**`subjectHit` alone is NOT sufficient.** Adding
`!FRAME_ALIAS.has(a) && !QUESTION_FRAME.has(a)` to the `grounded` computation compiles, keeps all
1076 tests green, and leaves `matchTopic("hukum warisan")` returning `perintah-dan-larangan`
exactly as before. Stopping `hukum` from marking a category grounded lets execution PAST the
`if (best?.grounded) return best.slug` short-circuit, but the subject-correction block below then
declines to correct anyway. **The real lever is inside that correction block, not the grounded flag.**
Read `knowledge.ts:228-260` and find why the correction declines for `warisan` — that is step 1.

**Ranking grounded above score is WRONG and a test already pins why.** Making a grounded match beat
an ungrounded one regardless of score does fix warisan — and breaks
`web/src/topic-routing.test.ts:43`, which pins `matchTopic("apa hukum riba")` to
`perintah-dan-larangan`. That test is RIGHT, and the distinction it protects is the whole subtlety
of this bug:

| Question | Correct topic | Why |
|---|---|---|
| `apa hukum riba` | `perintah-dan-larangan` | the rulings chapter genuinely CONTAINS riba rulings |
| `hukum warisan` | `keluarga` | the rulings chapter contains NOTHING about inheritance |

So the discriminator is **not** "is the matched alias a ruling word" — it is **"does the chosen
category actually cover this subject"**. The existing correction block already asks that question
(see its own comment about `homo itu hukumnya apa sih` and QS 7:80, and the "uncovered subject
blocks correction entirely" suite at `topic-routing.test.ts:57`). It is asking it and getting the
wrong answer for `warisan`. Fix the coverage test; do not add a second ranking rule beside it.

Whatever lands must keep BOTH rows of that table green, plus `bagaimana cara sholat` → `ibadah` and
`aku sedang sedih` → null.
