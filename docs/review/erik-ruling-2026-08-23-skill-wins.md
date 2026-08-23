# Erik's ruling — the kajian skill wins where it conflicts with this repo

> **Decided by Erik, 2026-08-23, in session.**
> **THIS DOCUMENT IS A RELAY, NOT A RECORD OF HIS WORDS.** Erik gave this instruction verbally in a
> working session. Nothing in his own words was captured, no artefact was committed at the time, and
> the sentences below are the DA's write-up of what it was understood to mean. He is reading this to
> confirm or correct it. Until he does, every claim here carries that status.
> **This is Erik's decision. It is NOT a scholarly artefact and must never be cited as one.**
> Same form as `erik-ruling-2026-08-22.md`, `rights-2026-08-20.md` and `rights-2026-08-21.md`.

Written 2026-08-23 because the ruling reverses two accepted ADRs and had been carried across two
handoffs as a relay. `PROGRESS.md`'s 2026-08-23 checkpoint records it; a checkpoint is a log, not a
decision record, and a reversal of accepted architecture should not live only in one.

## Who the "scholar" is here, so this is not misread as an ustadz matter

ADR 5 and ADR 6 protect **the speaker in a third-party dakwah video** — someone whose lecture the
tool summarises and who has no relationship with this project. They are **not** about Ustadz Ahmad
Isrofiel Mardlatillah, he was not consulted on this ruling, and nothing here touches his three
existing permissions (F-1, 2026-07-17; co-display, 2026-07-23; the machine hadith Indonesian as-is,
2026-08-12 — verbal and relayed, hadith TEXT layer only). Those stand, do not widen, and cover none
of this.

## What he ruled

Where the `darussalam-kajian-summary` skill (`~/.hermes/skills/media/darussalam-kajian-summary/SKILL.md`)
conflicts with this repo's rules, **the skill wins**.

Two conflicts were live, and both were decided by that one sentence rather than argued individually.
That is worth stating plainly: this was a **precedence ruling**, not two separate judgements about
naming and about voice.

## What it reverses

### 1. ADR 5 — roster-only naming

ADR 5 §Decision, verbatim:

> **Profiles come from a roster we maintain** — name, whatever title that person actually uses,
> credentials, and a photo we are entitled to use. When a video matches no roster entry, the slide
> renders with the source link and no identity: no name, no face, no credentials. Omission is the
> fallback; guessing is not available.

The skill (step 5) requires the slide to include `speaker`, and takes it from **video metadata**.

`docs/kajian/roster.yaml` ships with `organisations: []` and `speakers: []` — **empty**. So under
ADR 5 as written, *every* video today renders unnamed. The ruling is therefore not a narrowing of
ADR 5's fallback; it is the difference between naming nobody and naming everybody from a field the
uploader controls.

**ADR 5's own reasoning is not answered by the ruling, and is reproduced so it is not lost:** the
transcript tool returns `channel`, and *"`channel` names a channel rather than a speaker — a channel
can host many."* A metadata-derived speaker name can therefore be wrong, and being wrong here means
attaching one scholar's name to another scholar's words.

### 2. ADR 6 — the narrator voice

ADR 6 fixes the narrator at `id-ID-Chirp3-HD-Schedar`, **chosen by Erik himself on 2026-08-22 from
eight rendered samples of the actual opening line**. The skill specifies `id-ID-ArdiNeural` via
`edge-tts` at rate ≈ `-8%`, pitch ≈ `-2Hz`. The skill wins.

**ADR 6's argument against changing it is overridden, not refuted**, and is reproduced verbatim
because the ADR declared it load-bearing:

> Per the decision above this is now load-bearing: viewers learn the voice as this channel's
> narrator, and changing it re-opens the inference the spoken attribution exists to close.

This half of the ruling **bites nothing today** — the voice lives in the runner, and the runner is
not built. It becomes real the first time an mp4 is produced.

### 3. NOT "ISC-10" — a citation to correct

**THREE** carriers say this ruling reverses **"ADR 5 and ISC-10"**, and a first cut of this
retraction counted only two — missing the most-read of them, which is the one in shipped source:

1. `PROGRESS.md`'s 2026-08-23 checkpoint;
2. `.planning/next-session-prompt.md`'s current block;
3. **`web/src/kajian-summary.ts`, committed at `fcb27c9`** — a docblock a developer reads before
   touching the kajian card, and it did not merely cite ISC-10, it attached a **quotation ISC-10 never
   contained**: *ISC-10 ("the video title never appears inside the identity slot")*. The citation and
   the false attribution are removed at the source in this change, with a pointer back here.

   **PRECISELY WHAT WAS WRONG, because a first draft of this retraction overshot and said "BOTH HALVES
   WERE WRONG":** the *identifier* was wrong and the *attribution* was invented. **The RULE IS REAL.**
   `src/app/kajian-slide.ts:10` states it as that file's headline decision — *"THE VIDEO TITLE NEVER
   OCCUPIES THE IDENTITY SLOT."* — and it is enforced and tested (`kajian-slide.test.ts:13`,
   `kajian.ts:39`, `kajian-narration.ts:26`). It is ADR 5's rule, not ISC-10's. Saying the whole thing
   was fabricated would tell the next developer a live guard was imaginary, which is how a real
   protection gets retired by a correction.

**That identifier is wrong.** `ISA.md` line 116 reads:

> `- [x] ISC-10: Anti: no shard, and not index.json, contains any tafsir passage text`

which concerns tafsir shards and has nothing to do with speaker naming. There is **no ISC** for
roster-only naming; the rule exists only in ADR 5's Decision section, implemented in
`src/app/kajian-roster.ts`. All three carriers were written by the DA, and the error is the DA's.
The correction is recorded here rather than by editing the append-only checkpoint — except in the
source docblock, which is not append-only and where the invented quote is deleted outright.

## What it does NOT change

**Scope: the WEB CARD only.** The ruling admits the speaker name on the `#/kajian` card. **It is
SILENT on the mp4.** Kajian ruling **(b)** — *may a model-relayed speaker name be SPOKEN in the
autoplaying video?* — is **still open and still Erik's**. Text is visibly written *about* someone;
ADR 6's own framing is that *"audio is heard as spoken by someone"*. Do not read this document as
having settled that.

**The provenance labels are UNCHANGED.** Erik's 2026-08-22 ruling holds, verbatim:

> `AI_CHIP` / `AI_NOTE`, the hadith layer's *"Terjemahan mesin · belum ditinjau"*, and the kajian
> artefacts' *"belum diperiksa ulama"* … **must not be softened, made conditional, or removed.**

Naming the speaker is attribution to the video's **source**. It is not permission to present model
prose as that scholar's words, and `PROVENANCE_NOTE` must keep saying so on the surface.

**Everything ADR 5 decided that is not the roster rule still stands** — the transcript is never
rewritten; auto-caption briefings are stamped as such with low-confidence citations timestamped;
every slide links its source and states it is an automatic summary; bullets are never styled as
quotes. ADR 6's spoken-attribution-first rule and the QR pointing at the canonical video URL are
likewise untouched.

## The consequence nobody asked for: a new attack surface

The speaker field becomes **uploader-controlled YouTube metadata rendered into HTML** — attacker-
reachable **because of this ruling**, where under ADR 5 it could only ever be a roster string we
wrote ourselves.

**Stated in the future tense on purpose: it is NOT reachable today.** The reason, corrected — a first
draft gave three and two of them were false:

- **TRUE, and it is sufficient on its own:** nothing in this repo writes `/kajian/index.json`, so no
  manifest carries a speaker to the web card. Verified by grep across `src/`, `web/src`, `worker/src`.
- **TRUE:** `resolveSpeakerWithProvenance` (`src/app/kajian-speaker.ts`) has no production caller —
  only its own tests.
- ~~*"`src/app/kajian.ts` still calls `matchRoster` only"*~~ — **WITHDRAWN. `matchRoster` does not
  exist.** No such function is defined anywhere; the only occurrence of the string in this repository
  was that sentence. `kajian.ts:231` calls `resolveSpeaker` from `kajian-roster.ts`. **The DA invented
  the name.** (The new module's function was ALSO originally called `resolveSpeaker`, colliding with
  the roster export in a sibling file; it is renamed `resolveSpeakerWithProvenance` in this change.)
- ~~*"and the runner is unbuilt"*~~ — **WITHDRAWN AS FALSE.** `src/app/kajian.ts` is a 535-line runner
  and it has run; see `docs/review/rights-darussalam-logo-2026-08-23.md`. What does not exist is a
  HOSTED job runner that consumes a queue and publishes a manifest.

The hazard is prospective and certain to arrive the moment something publishes a manifest.

Force-red on 2026-08-23 confirmed this is not theoretical: neutering `web/src/esc.ts` lands the
payload raw as `<p class="kajian-speaker"><img src=x onerror=alert(1)></p>`. `esc()` is the only
thing between that field and the page. It works — the finding is that it is now **load-bearing for a
reason that did not exist before**, and a future refactor that drops it has a live exploit behind it.

## Second instruction, same day, also unrecorded: the `__Host-` cookie prefix

Erik instructed in session on 2026-08-23 that the account cookie be renamed `qk_auth` →
`__Host-qk_auth`. Also a relay; also no artefact in his words.

**It authorises nothing.** The prefix only *removes* capability: a browser accepts a `__Host-` cookie
only when it is `Secure`, has `Path=/`, and carries **no `Domain` attribute**, so only the exact host
serving it can set it. Without it, any `axiara.ai` surface could set `Domain=axiara.ai; qk_auth=…`
and have it ride on requests to this one.

**What that shadow could do, precisely** — the first write-up of this got it wrong and is corrected
here: it could **not** escalate privilege, because a forged value never passes `verifySession` and
`roleFor` only ever sees an email verification returned. It could cause **ACCOUNT CONFUSION**, since
`readAuthCookie` returns the first match in the header, so the victim's browser would present
someone else's proof. That is not a demotion.

It is recorded because an unrecorded instruction is unreviewable, not because it needed authority.

## What Erik is being asked to confirm

1. **Is "the skill wins" right as a precedence rule**, or was it meant only for the two specific
   conflicts it was applied to?
2. ~~**The speaker name comes from `channel`,** which names a channel and not a person. Is naming a
   possibly-wrong scholar better than naming nobody? ADR 5 said no.~~
   **ANSWERED 2026-08-23 — and the question as put was WRONG. See the section below.**
3. **The mp4 is still open.** Kajian ruling (b) is unanswered — may the name be *spoken*?
4. **ADR 6's voice was your own pick from eight samples.** Confirm it is genuinely superseded.
5. **Should ADR 5 and ADR 6 be superseded in `docs/adr/`** with a new ADR, or left Accepted with this
   document as the override? They currently read `Status: Accepted` with no pointer here.

## Answered — question 2, and the correction it forced

**The question above was framed on a false premise, and the premise was the DA's, not the ruling's.**
It said *"the speaker name comes from `channel`"*. The ruling says **from video metadata**; `channel`
is one field among several, and it is the worst one. Checking the actual capture rather than arguing
from ADR 5's prose is what exposed this.

`.scratch/kajian/brlqHxjIp9c/meta.json`, the one real kajian capture:

| field | value |
|---|---|
| `channel` | `Masjid Darussalam Kota Wisata` — a mosque |
| `title` | `15 INDIKASI KEBODOHAN \| USTADZ SYARIFUL MAHYA, L.C., M.A.` |
| `description` | `👤Ustadz Syariful Mahya, L.c., M.A.` — a line the uploader typed on purpose |

So ADR 5's warning is **confirmed empirically, not merely quoted**: `channel` would be certainly
wrong on the only real input we have, rendering a building as the person who spoke. And the speaker's
name **is** in the metadata — twice, consistently, and in the description with their own casing.

**Erik's answer, 2026-08-23:** the name comes from the **description or the title**, never from
`channel`, and **omission remains the fallback** when neither says who spoke.

### What that means in code

`src/app/kajian-speaker.ts` (new, 210 lines) + `kajian-speaker.test.ts` (17 tests, green; two
force-red runs recorded in `ISA.md`). Nothing was added to `kajian-roster.ts`, whose own docblock
promises it will never infer a speaker — that promise still holds.

- the description's 👤 / `Pemateri:` / `Pembicara:` / `Narasumber:` / `Penceramah:` / `Bersama` line, first;
- else a title segment **after** a separator that carries an honorific (Ustadz, Ustadzah, Syaikh,
  Habib, Buya, Kyai, Prof, Dr, KH). The segment rule is load-bearing: without it
  `15 INDIKASI KEBODOHAN | …` would name a lecture as a scholar;
- else **no name** — ADR 5's fallback survives the reversal intact.

**`channel` is never consulted.** A name is rejected if it is under 4 or over 80 characters, or
contains a URL, an `@`, angle brackets, a newline, or `!`/`?`.

**Known, bounded inaccuracy on the title path:** an ALL-CAPS title is normalised, and dotted
abbreviations are left uppercase (`L.C., M.A.`) because lowercasing them to match how Darussalam
actually writes it (`L.c., M.A.`) would be a guess about house style — which is the thing ADR 5
removed. This is precisely why the description wins when both exist.

### The provenance distinction, which is the part that must not be lost

A metadata name is **not** a roster name, and the code refuses to flatten them. `SpeakerOutcome` is
`roster` | `metadata` | `none`, and a roster entry still WINS: a name we typed is one we answer for,
and Erik's ruling widened where a name may come from without demoting that list.

**`kajian-narration.ts` must keep refusing a `metadata` outcome.** ADR 6: *"Text is visibly written
about someone; audio is heard as spoken by someone."* Kajian ruling **(b)** — may a model-relayed
speaker name be SPOKEN — is unanswered and Erik's alone. A change that makes narration speak one of
these names would answer his open question on his behalf.

### Still open after this answer

- **(b), the mp4.** Untouched. The ruling is silent and stays silent.
- **The slide PNG.** Erik's ruling was recorded as scoping to the *web card*; `kajian-slide.ts` is a
  third surface that is written rather than spoken, and neither the ruling nor this answer named it.
  It needs one word from Erik before a slide prints a metadata name.
- **A separate rights condition found in the same file** —
  `docs/review/rights-darussalam-logo-2026-08-23.md`. Recorded, not acted on, by Erik's disposition.

Nothing in this document has been deployed. Prod is unchanged.
