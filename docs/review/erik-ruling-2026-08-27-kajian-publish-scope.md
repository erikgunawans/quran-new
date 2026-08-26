# Erik's ruling — the scope of "publish as-is", and the DRAFT gate

> **Decided by Erik, 2026-08-27, in session.**
>
> **FORM: HE CHOSE FROM OPTIONS THE DA PUT TO HIM. HE GAVE NO REASONING, AND NONE IS ATTRIBUTED
> TO HIM HERE.** The DA raised that ISC-630's earlier "publish as-is" had covered ONE video and was
> explicitly not a general rule, then offered three scopes and three treatments of the DRAFT gate.
> Erik selected **"All kajian, any channel"** and **"Leave it — as-is means as-is."** Those two
> selections are the only words of his this document rests on.
>
> **THE DA RAISED A CONCERN AND ERIK OVERRODE IT. Both halves are recorded because a record that
> keeps only the outcome cannot show that the cost was seen.** The option Erik chose carried the
> DA's warning verbatim — *"the widest reading, and sits against your own 'no shortcuts' principle
> where rights aren't established"* — and the DA said once more in session that this publishes third
> parties' material on a transformative-use basis that has never been tested. He chose it anyway.
> That is his to choose. **Do not re-litigate it, and do not soften it into something he did not say.**
>
> **This is Erik's decision. It is NOT a scholarly artefact and must never be cited as one.**
> Ustadz Ahmad Isrofiel Mardlatillah was not consulted on any of it. His three permissions
> (F-1 2026-07-17; co-display 2026-07-23; machine hadith Indonesian as-is 2026-08-12, verbal and
> relayed, hadith TEXT layer only, and on our own narrow reading the Hadits page only) stand, do not
> widen, and cover **none** of this.

## 1. Scope of "publish as-is": **ALL KAJIAN, ANY CHANNEL**

The previous ruling (2026-08-25, recorded in `PROGRESS.md`) covered the SILATURAHIM video alone.
Erik has now extended it: the runner may publish what it processes, from any channel, without
returning to him per item.

**This is a PUBLISHING rule. It is not a SOURCING rule, and it does not become one.**

## 2. The DRAFT gate: **LEFT STANDING, CONTRADICTION AND ALL**

`DRAFT_COPY = "DRAFT — belum diperiksa, belum boleh diposting"` (`src/app/kajian-slide.ts:647`)
fires through four carriers whenever `isDraft` is true — the slide band, the `-DRAFT` filename
suffix, the spoken `DRAFT_WARNING`, and the m4a `title` tag. `isDraft` is
`meta.language.isGenerated && flagged.length > 0` (`src/app/kajian.ts:349`), which is true for every
machine-transcribed kajian carrying flagged spans — i.e. in practice, all of them.

So published artifacts will keep declaring that they must not yet be posted, while being posted.
**Erik was shown this contradiction explicitly and chose to leave it.** The DA offered softening the
band while keeping `belum diperiksa ulama`, and offered unpublishing until reviewed; both were
declined. Nothing in the four carriers may be edited on the strength of this ruling — "as-is" was
chosen over "soften", so an edit would invert the thing decided.

## 3. What this ruling does NOT cover — read this before citing it

**(a) It does not touch ISC-630's SOURCING hold, and cannot.** The ISA states the distinction outright
in the criterion that records the runner's own gating — *"ISC-630 gates what the runner may be pointed
AT, not whether it may be built"* (cited by criterion, not line: this file's neighbours record what a
line-number citation costs once the file is edited). ISC-630
was resolved by Erik on 2026-08-23 — the hold on that channel's material stands **permanently**, the
12.8 MB capture was deleted, and the runner launches on a source whose rights are clear. A rule about
what may be PUBLISHED cannot reach a hold on what may be CAPTURED. **That channel stays off the
queue.** Anyone reading §1 as re-opening it is reading a publishing permission as a sourcing one.

**(b) It makes nothing "reviewed".** `reviewed_id` keeps its meaning (ISC-448 is a tested invariant).
Published-because-Erik-said-so and checked-by-a-scholar remain different facts, and the second is
still false for every kajian.

**(c) It is not a legal finding.** The ISA's standing note applies unchanged: a summary that links to
its source is *arguably* transformative, and publishing on that basis is a coherent position — not an
established one, and not advice anyone here is qualified to give.

**(d) It does not license naming a speaker beyond what `erik-ruling-2026-08-23-kajian-four.md`
already allows.** That document governs identity on the artifact; this one governs publication.

**(e) It is not retroactive consent from anyone whose material is published.** The takedown offer in
`Berkas Periksa Ringkasan Kajian` stands, and any request to take something down is honoured the same
day without requiring a reason.

## 4. Consequence Erik should see next

There is still **no per-day cost ceiling** on the kajian pipeline, and this ruling removes the
per-item human gate that was incidentally acting as one. A supervised runner that publishes without
returning to him makes that gap larger, not smaller. Recorded here rather than acted on — it is his.
