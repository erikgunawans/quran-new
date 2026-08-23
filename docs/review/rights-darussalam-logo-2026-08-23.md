# A rights condition the source states in its own description — Darussalam's logo clause

> **Found 2026-08-23** while answering Erik's question 2 on the speaker-naming ruling. Not looked
> for; it was sitting in metadata this project already fetched and stored.
> **Erik's disposition, 2026-08-23: RECORD IT, DO NOT ACT YET.** No code changed, no gate added, no
> message sent. This file exists so the condition is an explicit open item rather than something
> discovered after publishing.
>
> ⚠️ **SUPERSEDED IN PART, LATER THE SAME DAY (2026-08-23).** Erik was asked again and decided the
> letter **is to be sent**, and that the already-built derivatives **are to be disclosed in it**.
> So "DO NOT ACT YET" above no longer describes open item 3 below, and item 3 is **CLOSED — the
> answer is yes, ask them.** Items 1 and 2 are untouched and still open. The letter itself, and the
> limits on the form of that decision, are in `docs/review/surat-darussalam-2026-08-23.md`.
> **Still nothing sent** — the DA never sends, and Erik has not yet read the letter's text.
>
> **FORM: A SELECTION FROM OPTIONS THE DA AUTHORED, IN SESSION. NOT ERIK'S OWN WORDS.** He was shown
> a short list of dispositions and picked one; nothing he wrote or said verbatim was captured, and no
> artefact in his words exists. **Unattested here are both the option wording AND the claim that
> those were the options as put** — the prompt itself was never committed, so a count or a quotation
> of it is the DA's recollection, not a record (same limitation `erik-decision-2026-08-23.md` states
> about its own four options). Same status as `erik-decision-2026-08-23.md`. **Do not upgrade this document
> to "written confirmation" without an artefact from him**, and do not read any sentence below as his
> reasoning — the reasoning is the DA's throughout.
> **This is a finding written up by the DA. It is not legal advice and it is not a scholarly artefact.**

## What the source says

`.scratch/kajian/brlqHxjIp9c/meta.json` — *15 INDIKASI KEBODOHAN*, Masjid Darussalam Kota Wisata,
published 2026-07-23. Under a heading the uploader titles **Disclaimer**, verbatim:

> Kami mempersilahkan para jamaah untuk membagikan/share video kami tanpa menghilangkan Logo
> Darussalam TV dan Identitas lainnya. Apabila kami menemukan video yang sengaja
> menghilangkan/menutupi logo dan identitas Masjid Darussalam lainnya, kami akan meminta pihak
> Youtube atau Source lainnya untuk menghapus video tersebut.
>
> Sertakan juga link asli dari video kami.

In English, and this rendering is the DA's, not theirs: *we permit the congregation to share our
video provided the Darussalam TV logo and other identifying marks are not removed. If we find a
video that deliberately removes or covers the logo and other Masjid Darussalam identity, we will ask
YouTube or the other source to take it down. Also include the original link to our video.*

## What it covers and what it does not, against what this project actually produces

| Their condition | Our artifact | Met? |
|---|---|---|
| *"Sertakan juga link asli dari video kami"* | ADR 6's QR encodes the canonical video URL; ADR 5 requires a source link on every slide — **and the slide actually built on 2026-08-22 carries it** | **Yes** |
| *"tanpa menghilangkan Logo Darussalam TV dan Identitas lainnya"* | the slide and the mp4 carry OUR logo and our layout; nothing carries theirs | **No** |

The QR half is met **in design and in the one artifact that exists** — worth stating plainly, because
this is not a project that was ignoring attribution. `slide.html` for `brlqHxjIp9c` contains the
canonical `youtube.com/watch?v=brlqHxjIp9c`, verified by grep. The logo half is addressed nowhere: not
in ADR 5, not in ADR 6, and not in the built artifact.

**A CORRECTION THIS FILE MUST CARRY, because a first draft got it backwards.** That draft said the
slide and the mp4 *"do not exist yet"* and that the runner was unbuilt. **Both are false, and the
evidence was on screen when it was written.** `src/app/kajian.ts` is a 535-line runner that renders
the slide (`:446`) and builds the mp4 (`:518`), and it has RUN: `.scratch/kajian/brlqHxjIp9c/` holds **six files**, all
dated **2026-08-22 — the day before this file was written**: `briefing.md` (12,889 B),
`meta.json` (2,067 B), `slide.html`, `slide.png` (2160x2700, 333,165 B), `narasi-DRAFT.m4a`
(6.6 MB) and `short-DRAFT.mp4` (5.4 MB). A second complete run sits at
`.scratch/kajian/jNQXAC9IVRw/` — that one is *"Me at the zoo"* / `jawed`, **not** Darussalam, so no
clause on this page reaches it.

**COUNTED 2026-08-23 (second pass), because this list said FOUR and the directory holds SIX.**
The two it omitted were `briefing.md` and `meta.json`, and the omission mattered: `briefing.md`
carries **12 quoted passages from the lecture's content** — some the speaker's own phrasing, some
scripture and hadith he cited — **plus 32 verbatim transcript excerpts** in its own
`## Perlu dicek terhadap video (32)` section, each stamped with a timestamp. That makes it the most
sensitive artefact here, not the least.
(**This number has been wrong twice, both times low:** *four* counted only blockquoted lines, then
*eleven* counted only straight-quoted spans and missed the transcript section entirely. Recount, and
prefer the larger reading — undercounting it understates how much of their material we hold.)

**AND THE FOOTPRINT IS TWO DIRECTORIES, NOT ONE.** No rights record mentioned the second until
2026-08-23: `.scratch/kajian/_transcripts/masjid-darussalam-kota-wisata/…/` holds `transcript.md`
(88,364 B — the **full verbatim transcript**), `transcript-raw.json` (253,975 B),
`transcript-sentences.json` (184,208 B), `meta.json`, and `imgs/cover.jpg` (132,797 B — **their cover
image**). ~656 KB. Any question phrased as "what do we hold of theirs" must cover BOTH directories.

The four-file version had already been copied into `docs/review/surat-darussalam-2026-08-23.md`
before a gate caught it, which is why the instruction here is blunt: **count the directories
yourself; do not copy this list.**

**What is genuinely absent is a different thing: a HOSTED job runner** — something that claims a
queued job and publishes a manifest. Nothing in the repo writes `/kajian/index.json`. That is what
Erik's 2026-08-23 VPS decision is about, and conflating the two produced the error above.

**This matters to the decision and is not bookkeeping.** A reader told *"we have built nothing"*
weighs Erik's open question 2 differently from a reader told *"a derivative mp4 made from their
recording already sits on this disk."* The second is the true one. It is **unpublished** —
`.gitignore:66` excludes `.scratch/kajian/` — and unpublished is where the whole safety of this
position currently rests.

## Why this is not obviously answered by "it is a summary, not a re-share"

There is a real argument that a machine briefing is a distinct work rather than a copy of their
video, and that a condition written for people re-uploading the recording does not reach it. **That
argument is available and it is not made here**, for two reasons worth writing down:

1. **The artifacts are not text-only.** ADR 6's output is an mp4 and an m4a built from their
   recording's content — and both have been built. **A first draft added that they carry "a thumbnail
   derived from their video"; that is FALSE and is withdrawn.** `coverImage`/`thumbnailUrl` appear once
   in the pipeline, as type fields at `src/app/kajian.ts:175`, and are read by nothing:
   `stillVideo(slide.png, narration.wav, …)` composes OUR 2160x2700 slide with TTS audio. Their
   `cover.jpg` reaches no artifact. What remains true without it is enough: the mp4 is built from the
   CONTENT of their recording, which is closer to a derivative than a written summary is.
2. **They named the remedy, not just the preference.** The sentence ends in a takedown request. A
   condition with a stated consequence deserves a decision rather than an inference.

Deciding which reading is right is **not the DA's call and not an engineering call.** It is Erik's,
and it may be a question for the mosque.

## Scope — where this bites and where it does not

- **The mp4 and the slide PNG (`src/app/kajian-slide.ts`, `kajian-audio.ts`)** — this is the surface
  the condition is about, and **both have been built locally and neither has been published.**
- **The `#/kajian` web card** — **NOT in scope, and that scoping is the DA's, not Erik's.** The
  reasoning: it is a listing that links out, carries no logo of ours over their content, and shows a
  YouTube-hosted thumbnail. **Erik has recorded no disposition on the web card at all.**
  (His "record it, do not act" of 2026-08-23 was superseded for the LETTER later the same day — see
  the head of this file — but it was never about the web card, and nothing since has been.) The option he selected is RECALLED as carrying the words *"scope: mp4/slide only, not
  the web card"* in its preview text — **recalled, not quoted: the prompt was never committed, so that
  wording is unattested** — and in any case it was written by the DA for him to pick, so at best it is
  a DA scoping he did not object to, NOT a ruling of his about where a third party's condition reaches.
  **If the clause does reach the web card, this file is wrong and Erik did not say otherwise.**
- **Nothing is published.** Prod is unchanged and no kajian artifact has ever shipped.

## What is NOT claimed here

- **Not that we are in breach.** Nothing has been published, so there is nothing to be in breach of.
- **Not that this generalises.** It is ONE uploader's stated condition on ONE video. Other channels
  say other things or nothing; ADR 5 and ADR 6 are not amended by it.
- **Not that the QR discharges it.** The QR meets the second sentence — in the built `slide.html`, in
  fact and not only in design. It says nothing about the first, which is the whole open question.
- **Not a licence review.** Nobody has read Darussalam's terms beyond this description field, and no
  YouTube ToS analysis was done.

## Open, and Erik's alone to close

1. **Does the logo clause reach a machine summary at all?** If no, record the reasoning and this file
   closes.
2. **If yes — carry their logo, or do not publish that source?** Carrying it interacts with ADR 5's
   *"the artifact says what it is"*: a slide bearing Darussalam TV's mark could read as Darussalam's
   own summary, which is the exact inference ADR 5 and ADR 6 exist to prevent. **These two
   requirements pull against each other** and that tension is the substance of the decision.
3. ~~**Ask the mosque?**~~ **CLOSED 2026-08-23 — yes.** They publish **six contact channels**
   (YouTube, TikTok, Facebook, Instagram, Telegram, X) plus `darussalam.id`, per `meta.json` for
   `brlqHxjIp9c`; none has been tried, so which one actually gets a reply is unknown.
   Erik decided to send, and to disclose the already-built derivatives in the letter. Drafted at `docs/review/surat-darussalam-2026-08-23.md`;
   **not yet sent** — Erik sends, the DA never does, and he has not yet read the text. See the
   supersession note at the head of this file for the limits on the form of that decision.
