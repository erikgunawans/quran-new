# Tanya must answer hukum questions — grilling outcome, 2026-08-11

> Erik's framing: *"What I'm hoping for is for the system to answer me regarding what is said in
> Islam. Yes, first look for something based on Qur'an and Hadith, but some knowledge — even based
> on Qur'an and Hadith — still needs some opening so we can really search it."*
>
> Trigger: `saya mau tanya tentang hukum warisan di islam` → *"Aku belum menemukan ayat yang cocok
> dengan itu di korpus yang sudah diverifikasi."*

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

## Build order for the next session

1. **Write `subjectHit`** and apply it in `matchTopic`, so a `QUESTION_FRAME` word can never win
   topic selection on its own. Read `topic-words.ts:67-83` first — the reasoning there is correct
   and must be honoured, not replaced. Frequency has already failed against this index twice.
2. **Add topic pins** for high-traffic hukum subjects (warisan, nikah, talak, riba, zakat, puasa,
   sholat, aurat), the documented fix for direction-blind ranking. `matchPin` exists; pins do not.
3. **Third tier**: ayah + verbatim attributed tafsir when tiers 1–2 come back thin.
4. **Regression tests**, force-red each: `hukum warisan`, `hukum riba`, `hukum pacaran`, `cara
   sholat`, and at least one feelings question (`cemas terus`) proving the feelings lane did not
   start answering hukum.

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
