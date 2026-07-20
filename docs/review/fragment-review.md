# Fragment review — the three verses the build gate flagged

**Decided 2026-07-20.** The corpus build gate (`src/app/build-corpus.ts`) flags any curated verse whose
Indonesian rendering opens with a **lowercase letter** — the translator's own mark that this ayah
continues the one before it. A reader who meets such a verse alone gets a sentence with no beginning.

Three verses sat in `FRAGMENT_OK` with a `REVIEW:` prefix: the gate warned about them on every build
but did not block. This is the decision on all three.

The question asked of each verse was **not** "is this good scripture" — it is all good scripture. It
was narrower and answerable without a scholar: **does this rendering, shown alone on a card to a
person in this feeling, say something true?**

---

## 25:70 — Al-Furqaan · *Shame* · **BLESSED, ships**

> kecuali ia bertaubat, beriman, dan beramal shalih. Dosa-dosa mereka akan Allah tukar dengan pahala.
> Allah senantiasa Maha Pengampun lagi Maha Penyayang kepada semua makhluk-Nya.

`kecuali` hangs off 25:68 — the gravest sins: shirk, murder, zina. But everything *after* the dangling
word is a complete, self-contained promise, and the direction of the missing context is what settles
it: in context the promise is stated for the worst of sins, so applying it to ordinary shame is **a
fortiori** — the fragment understates nothing and misleads no one.

Shipping the referent alongside it would put the gravest sins in front of someone already drowning in
shame, and buy nothing. The only real defect is the lowercase opener.

---

## 23:61 — Al-Muminoon · *Fear of insincerity* · **DROPPED from the feeling corpus**

> mereka itulah orang-orang yang berusaha keras untuk menaati Allah, dan mereka berlomba untuk
> beramal shalih.

This was the least safe of the three, and it is worse than "missing context" — alone it says the
**opposite** of what it was curated to say.

`mereka itulah` points at 23:57–60. 23:60 is the trembling heart: *"…dan yang hatinya senantiasa takut
kepada siksa Allah ketika kelak mereka kembali kepada Tuhan mereka."* That is the whole comfort — the
person who fears their worship is hollow is told **that fear is the mark of the sincere**.

Cut loose from its referent, "mereka itulah orang-orang yang berusaha keras menaati Allah" points at
nobody, and a person afraid they are a fraud reads it as a description of *better people than them*.

**No swap was available.** 23:57, 23:58, 23:59 and 23:60 are each themselves lowercase continuations —
the entire passage is one sentence. There is no standalone verse in it to substitute.

*Fear of insincerity* keeps **4:146**, so the feeling is still answered.

**For the ustadz:** ship 23:57–61 as a single passage (the app has no multi-ayah card today), or name
a different verse for this feeling.

---

## 113:5 — Al-Falaq · *Envy & comparison* · **DROPPED from the feeling corpus**

> dan dari kejahatan pendengki yang melakukan kedengkiannya."

Al-Falaq is one unbroken du'a. The verb — *aku berlindung* — is in 113:1, and every ayah after it
hangs off that verb. Served alone the card opens "dan dari", and closes on a **quotation mark with no
opening quote**: the excision showing through to the reader as a visible artifact.

*Envy & comparison* keeps **4:32**, so the feeling is still answered.

**For the ustadz:** ship Al-Falaq whole, the way it is actually recited. It is five short ayahs.

---

## Result

- Corpus **201 → 199 verses**; still **83 feelings** — neither drop left a feeling with no verse.
- `FRAGMENT_OK` now holds only genuinely blessed entries; the build prints no `⚠ awaiting a decision`.
- Because the gate is a build gate, any future fragment still blocks until someone decides it.
