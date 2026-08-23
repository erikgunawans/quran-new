# Erik's ruling — the four kajian questions, and the two unnamings

> **Decided by Erik, 2026-08-23, in session.**
>
> **FORM: HE ADOPTED THE DA'S RECOMMENDATIONS WHOLESALE, IN ONE LINE.** Asked for a suggestion, the
> DA proposed answers to four open questions and a four-step order of work. Erik replied
> **"i follow your recommendation"** — his words, and the only words of his this document rests on.
> One further question (the surah preface) was put separately as options and he chose the
> recommended one.
>
> **EVERY ARGUMENT BELOW IS THE DA'S. NONE OF THE REASONING IS ERIK'S.** He did not restate a case,
> weigh an ADR, or offer a ground. What is his is the **assent** and therefore the **outcome**; what
> is not his is the **reasoning**, and no sentence here may be quoted as his view.
> **Do not upgrade this to "Erik's argument" or to a written artefact of his own composition.**
> Same limitation as `erik-decision-2026-08-23.md` and `rights-darussalam-logo-2026-08-23.md`.
>
> **This is Erik's decision. It is NOT a scholarly artefact and must never be cited as one.**
> Ustadz Ahmad Isrofiel Mardlatillah was not consulted on any of it, and his three permissions
> (F-1 2026-07-17; co-display 2026-07-23; machine hadith Indonesian as-is 2026-08-12, verbal and
> relayed, hadith TEXT layer only) stand, do not widen, and cover none of this.

## Why one document for four questions

The DA's framing, adopted: they are one question with four faces — **how much of a third party's
identity may an unreviewed machine artifact carry?** Answered separately they would drift apart.

## 1. ISC-600 — a speaker's name WRITTEN on the slide: **ALLOWED**

Ground (the DA's): the slide is written, and ADR 6's own distinction is that text is visibly written
*about* someone while audio is heard as spoken *by* them.

**Condition attached at the time of the ruling:** the provenance note sits WITH the name, not
elsewhere on the slide.

## 2. Kajian ruling (b) — a speaker's name SPOKEN in the mp4: **REFUSED, permanently**

Ground (the DA's): ADR 6's argument is unrefuted — *"A caption disclaimer does not reach an
autoplaying feed."* The cost of silence is small, since the QR and the slide both carry attribution;
the cost of error is a scholar's voice-identity attached to machine prose.

**This closes (b) as a REFUSAL, not as a deferral.** It was open across five handoffs. To be
implemented as a rule in the pipeline, in the shape of the hadith wall — not left as a habit.

## 3. ISC-608 — the narrator voice: **`id-ID-Chirp3-HD-Schedar` KEPT**

**This REVERSES part of Erik's own skill-wins ruling of the same day**, and that is the point of
recording it rather than letting the tree quietly disagree with a decision record.

Ground (the DA's): the skill should win on **pipeline mechanics**, not overturn a choice Erik made
personally from eight rendered samples for a stated safety reason. The DA's assessment — offered as
such and not as fact — is that ADR 6's specific argument was never weighed when the skill-wins
ruling was given, because that ruling was a general precedence rule applied broadly.

**So the skill-wins ruling is NARROWED, not withdrawn.** Its speaker-naming half stands (see
`erik-ruling-2026-08-23-skill-wins.md` and its §*Answered*). Its voice half is superseded here.
`kajian-narration.ts:110` was already `id-ID-Chirp3-HD-Schedar` and does not change; what changes is
that the tree and the record now agree, where before a docblock claimed the skill's voice was in use.

## 4. The Darussalam logo clause: **DO NOT PUBLISH THAT SOURCE — and write to them**

Ground (the DA's): carrying their logo to satisfy the clause would make the slide read as
*Darussalam's own summary*, which is exactly the inference ADR 5 and ADR 6 exist to prevent. The two
requirements cannot both be satisfied, so the artifact is not published.

The artifacts built from `brlqHxjIp9c` on 2026-08-22 stay where they are — gitignored, unpublished,
a development fixture. A letter to the mosque is to be **drafted by the DA and sent by Erik**; the DA
sends nothing. See `rights-darussalam-logo-2026-08-23.md`.

## 5. Prod bindings: **NOT bound, deliberately**

Ground (the DA's): the queue has no consumer, so binding D1 and Resend on the live Worker would ship
a working admin page whose jobs nothing picks up — one more component ahead of its consumer. Bind it
in the same change that brings the VPS runner up. Until then the route's 403 is correct behaviour.

## 6. The two unnamings, both on LIVE surfaces

**(a) The Hadits banner** (`web/src/sections.ts`). It read *"Terjemahan **teks hadis**-nya sudah
diizinkan Ustadz Ahmad Isrofiel Mardlatillah untuk ditampilkan"*. The name is removed; the permission
claim STAYS, because the permission is real. This is **our own offer, taken**:
`docs/review/ustadz-followup-2026-08-18.md` offered him an unnamed sentence or removal, the written
confirmation asked for will never come, and Erik ended the wait on 2026-08-22 — so taking our own
offer is the only way that promise closes rather than staying open forever.

**(b) The surah preface** (`web/src/surah-intro.ts`) — **found while doing (a), put to Erik
separately, and he chose to drop the whole clause.** It read *"Menunggu tinjauan Ustadz Ahmad
Isrofiel."* Two things were wrong, and the second is worse: it named him as awaited reviewer of prose
he never agreed to review, **and it asserted a wait Erik had already ended.** Nothing true is lost —
the tooltip's head still reads *"— belum ditinjau."*

**Both are unnamings, and an unnaming only ever narrows a claim.** Neither removes a disclosure;
`belum ditinjau` survives on both surfaces. **Restoring either name requires a written artefact from
the ustadz in `docs/review/` — a verbal relay is not enough to print a real person's name on screen.**

## Two tests changed, and neither was relaxed to make an edit pass

- `hadith-permission-notice.test.ts` asserted the name was never introduced by an *unscoped*
  permission claim. Removing the name would have made it pass **because the construct it hunts for no
  longer exists** — vacuously green. Replaced with the stronger claim: the name is not displayed at
  all, AND the permission is still claimed (unnaming must not become unclaiming). Force-red: putting
  the name back fails both.
- `surah-intro.test.ts`'s *"the tooltip names what the edition is and who must review it"* asserted
  `toContain("Ustadz Ahmad Isrofiel")`. **The requirement it encoded was withdrawn by the principal**,
  which is the only acceptable reason to drop an assertion of this kind. Its other two assertions —
  the disclosure itself — are unchanged, and a negative test now pins the name's absence.

## Nothing here is deployed

Prod is unchanged. Deploy is gated to Erik. **Both unnamings are LIVE-SURFACE changes that have not
reached the live surface**, so until a deploy the banner and the preface still show his name.
