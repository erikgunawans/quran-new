# Summarize-from-the-page — the Kajian URL field

> **Status: SPEC ONLY. No code written.** Erik described the feature on 2026-08-23 and answered
> three scoping questions. This file is what he decided plus what the codebase already constrains.
>
> **FORM: three selections from options the DA authored, in session. Not Erik's own words.** Nothing
> verbatim was captured. Do not upgrade this to a written specification from him. What IS his, in his
> words, is the shape: *"There is a field where we can put the URL of the Kajian and then we click
> summarize, where that summarize is actually calling those skills."*

## What Erik asked for

On the Kajian page: an input for a kajian YouTube URL and a **Summarize** button. Paste a link, click,
get back the HTML summary — **the slide**. No mp4, no narration (decided the same day; `--audio` and
`--video` are opt-in as of `fc6872c`). The page stops being a list something offline populates and
becomes self-serve.

"Darussalam Kajian Skills" means **our own kajian tooling** — `src/app/kajian.ts` and its briefing /
slide / render modules. There is no Claude skill by that name; checked the repo and PAI both.

## The three decisions

| Question | Erik's answer |
|---|---|
| Who can click Summarize? | **Only Erik / admins.** Role-gated behind the auth layer that went live 2026-08-23. |
| Where does the result go? | **Published to the public Kajian list.** |
| Which runner first? | **The VPS runner, as already decided.** Not a local-runner shim. |

### One constraint that rides on decision 2, and is NOT a reversal of it

Erik's own unsent letter promises Darussalam, in the text he is sending:

> *"Selama belum ada jawaban, tidak ada satu pun ringkasan, gambar, video, atau audio dari kajian
> Masjid Darussalam Kota Wisata yang saya terbitkan."*

So the publish path is built as he asked, **and Darussalam-sourced summaries are held until they
reply.** Publishing them would falsify a written promise to a third party — the same class of defect
as the *"tidak ada satu pun materi … yang saya terbitkan"* line that a gate caught on 2026-08-23
(ISC-628). Every other source publishes normally. **This hold is Erik's commitment, not a DA veto;
it lifts when Darussalam answers, or if Erik withdraws the sentence before sending.**

## What exists, and what does not

| Piece | State |
|---|---|
| `#/kajian` page | **exists** — renders its empty state, because nothing writes `/kajian/index.json` (`web/src/kajian-feed.ts:26`) |
| URL field + Summarize button | **does not exist** |
| An endpoint accepting a URL | **does not exist**. `/api/admin/kajian/jobs` is the QUEUE route and 403s to everyone (correct — ISC-592/617) |
| `kajian_jobs` table | migration `0003_kajian_jobs.sql` written, **never applied to any real D1** |
| A process that runs jobs | **does not exist.** This is the VPS runner |
| Writing results back | **does not exist** |
| The pipeline itself | **exists and works**, as a LOCAL CLI (`src/app/kajian.ts`, 535 lines, has run) |

## Constraints the build must honour

1. **It cannot be request/response.** A two-hour lecture takes minutes; the CLI's own deadline default
   is 600s. Click → enqueue → runner claims → page shows it when ready. Design the waiting state.
2. **The runner is a SECOND AUTH PRINCIPAL** — a shared bearer secret. **Do NOT reach for
   `requireRole`.** Putting an Administrator's 30-day `__Host-qk_auth` in a VPS env var undoes ISC-568
   entirely.
3. **Bind D1 + Resend on prod IN THE SAME CHANGE as the runner** (ISC-617, Erik's decision), so the app
   never carries a working admin page whose jobs nothing consumes. Apply migration 0003.
4. **yt-dlp on a datacentre IP** needs exported cookies or a residential proxy. Erik chose the VPS
   knowing this. Transcript fetches will fail otherwise, and the failure must surface as a job state,
   not a silent empty summary.
5. **ADR 5 survives the redesign.** Every slide carries a source link and says it is an automatic
   summary, not a quotation. `docs/kajian/roster.yaml` is EMPTY (`speakers: []`), so **no slide names
   anyone** — that silence is the safety property.
6. **The slide layout is ISC-624 and is unbuilt.** Erik supplied a landscape two-panel reference and
   chose *layout only, keep the guardrails*: no borrowed logo, no scraped thumbnail, no unrostered
   name. These are the same feature in practice — the button is worthless without something to show.
7. **A cost ceiling.** Even admin-only, each click spends model tokens on ~80,000 characters. Decide a
   per-day cap before shipping, not after a bill.

## Open, and Erik's

- **ISC-627** — the PUBLIC repo publishes a line of the Darussalam lecture and the speaker's name in
  `src/app/kajian-narration.test.ts`. The letter now promises removal. Scrubbing is not free: a guard
  test fed invented prose is a weaker guard.
- **Kajian step 7** — still undefined anywhere in the repo. Asked three times.
- **"Maruli"** — appears nowhere in the repo. The one real video's speaker is Ustadz Syariful Mahya.
- **Rights items 1 and 2** — does the logo clause reach a summary at all; carry their logo or not.

---

## The play button — clarified by Erik, 2026-08-23

> **FORM: his own description, plus two selections from DA-authored options.** The shape is his, in
> his words: *"in the HTML version there is a play button whereas when you play that button there
> would be a text-to-speech using the voice that we choose to explain the summary to people who have
> a limitation to see the UI ... or maybe he is driving."* The two options below are DA-authored.

**The published artifact is the HTML, not the PNG.** Erik's call, and it is the accessibility-critical
one: an image of text is invisible to assistive tech. Publishing the HTML makes the summary real,
selectable, screen-reader-readable text; the play button is an ADDITION to that, never a substitute.

| Decision | Answer |
|---|---|
| How the play button makes sound | **Pre-generate in `id-ID-Chirp3-HD-Schedar`; browser speech synthesis as fallback** so the control is never dead. |
| Does the Darussalam hold cover audio | **Yes — hold the whole thing** until they reply. His letter's own sentence names audio: *"tidak ada satu pun ringkasan, gambar, video, atau audio … yang saya terbitkan."* |

### A correction this file must carry

The DA asked *"keep the narration audio?"* and described it as *"a 6.6 MB machine-voiced reading of
their content"*. Erik said drop it. **He was answering about the LONG FORM.** The DA then turned off
both narrations, which was more than he asked for. There are two, and only one was unwanted:

- **Long form** (`narasi*.m4a`, ~474 s) — the whole briefing aloud. **Correctly dropped.** It is a
  standalone derivative of their lecture that nobody asked for.
- **Short form** (`speak("short")`, ~48 s) — the slide's own bullets, i.e. **our composed summary**,
  not their lecture. **This IS the play button.** It already exists in the code.

### The code cannot express this yet

`src/app/kajian.ts:532` nests the short narration inside `if (!NO_VIDEO && …)`, and its WAV is
consumed **only** by `stillVideo` into an mp4 — it is never kept as a file of its own. So the flag
change that turned the video off also destroyed the only producer of the play button's audio.

Required, and **not done**:

1. **Decouple the short narration from the video branch.** Short audio must be producible with no mp4.
2. **Encode it to its own artefact** (m4a/mp3) rather than only into `stillVideo`.
3. **Give the flags honest names.** `--audio` currently means "long form, and short only if video".
   The wanted default for the summarize pipeline is **short narration ON, long form OFF, video OFF**.
4. **Store and serve it.** One short file per kajian. R2 is the obvious home (`AUDIO` bucket already
   exists for recitation, keyed `{surah}/{ayah}.mp3` — kajian needs its own prefix or its own bucket).
5. **Fallback path.** If the file is absent, the page falls back to browser `speechSynthesis` so the
   button still works. Never render a dead control.

### Guardrails on the spoken audio — already settled, do not relitigate

- **It must never SPEAK the speaker's name.** Kajian ruling (b), REFUSED PERMANENTLY; a metadata name
  may be WRITTEN, never SPOKEN. Pinned by `src/app/kajian-speaker.test.ts`.
- **One narrator voice across every kajian** (ADR 6), chosen so a listener never hears the summary as
  the scholar speaking. This is why browser-TTS-only was rejected: the voice would vary per device.
- ⚠️ **ADR 6's voice is LOAD-BEARING again.** A previous handoff called it dormant because narration
  had been switched off. That is now wrong.

### Accessibility is a requirement here, not a nice-to-have

Erik named two people: someone who cannot see the UI, and someone driving. They need different things
and the play button only serves the second well — a screen-reader user is served by **markup**.

The current `slide.html` is a fixed 1080x1350 surface built to be PHOTOGRAPHED, not read. Making it a
real page — semantic headings, reflow on a phone, sane focus order, a properly labelled audio control
with a text alternative — is **part of ISC-624**, not a coat of paint on it.
