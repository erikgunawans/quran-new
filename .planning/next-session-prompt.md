# Next session — New-Quranku (checkpoint 2026-08-22 late)

> Prepended by /wrap 2026-08-22 (late). **Anchor `cc7f5df` on origin/main** (verified by `git fetch`,
> not by a push pipe — `git push | tail` returns an EMPTY exit code here). **Supersedes the `2f23edd`
> anchor.** From that handoff: item 1 (**deploy ISC-564**) is **DONE — DEPLOYED AND VERIFIED ON PROD**.
> Item 2 (verify by driving the app) is **DONE, and it found a live defect — see §2**. Item 3
> (`hadithShape`'s verb list) is **DONE as ISC-565, committed but NOT DEPLOYED**, and its diagnosis in
> the old handoff was WRONG — see §1. Items 4 (measure ISC-561 in prod), 5 (Track B step 1) and 6
> (kajian step 7) were NEVER STARTED and carry forward. Its §2 (open items), §3 (known weaknesses) and
> §4 (kajian criteria live in a TASK ISA) all **SURVIVE**.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-22 (late)**).

## 0. STATE — prod is HEALTHY; the emergency from the last two handoffs is over

`new-quranku.axiara.ai` runs Worker version **`9ab57d4b`** (`EDITION: "synthesis"`, 100% of traffic),
built from `2f23edd`. **ISC-564 is live and the stranded-reply defect is gone.** There is no longer a
known reader-facing defect shipping, so nothing in this handoff is an emergency.

⚠️ **`web/dist` provenance is NOT what a handoff claims it is.** The last one said it held a synthesis
build; `.build-meta.json` said `principled` and the preflight hook would have blocked the deploy.
**Always read `.build-meta.json` before deploying — never trust the handoff's word for it.**

Gates at the anchor: `bun test` **1855/0** exit 0 · typecheck exit 0 · build exit 0. ISA **574/589**
(573 `[x]` + ISC-418 `[~]`; 14 open, 1 deferred). Clean tree except untracked `WARP.md` — **leave it,
never `git add -A`.**

## 1. DO NEXT, IN ORDER

1. **Third `scholarly-gate` pass on ISC-565's CORRECTIONS — the one thing this session did not finish.**
   Two passes ran; both returned **CONCERNS with the code clean**, and **two of the second pass's four
   findings were defects the FIRST fix pass introduced**. Every finding is fixed in `cc7f5df`, but
   **those fixes were never themselves gated**, which is exactly the shape that has now bitten three
   times (`correction-is-the-least-scrutinised-edit`). Gate `git show cc7f5df` over `ISA.md`,
   `PROGRESS.md`, `web/src/answer-guard.ts`, `web/src/answer-guard-hadith.test.ts`.
2. **Then decide whether to DEPLOY ISC-565.** It is committed and pushed but **NOT deployed**; prod
   runs ISC-564 only. It only ADDS refusals, so it is the safe direction — but it moves the `diam`
   premise a **third** time (see §2), and Erik's stated preference at wrap was to put that in the
   ustadz letter BEFORE shipping it, not after. **This is his call, not a default.** If deploying:
   read `.build-meta.json`, then `VITE_ANSWER_MODE=synthesis bun run build`, verify the inlined literal
   ``try{return`synthesis`}`` (not a grep for the word), then `cd worker && bunx wrangler deploy`.
3. **ISC-564's cost (c) is no longer theoretical — cross-paragraph danglers SHIPPED TO A READER.**
   On `9ab57d4b`, question *"apa keutamaan salat lima waktu menurut hadits"*, `repaired: true`,
   `repairedRule: "wording"`, `repairedAttempt: 1`, the reader got a first paragraph opening
   **"Selain itu,"** — referring to a paragraph that no longer exists — and a close of **"ingatlah
   sungai rahmat yang mengalir itu"**, pointing at a parable the excision removed. Two danglers in one
   answer. **The raw capture is committed at `docs/review/captures/api-answer-9ab57d4b-2026-08-22.json`**
   (all three turns, bodies verbatim). Deliberately NOT pinned by a passing test
   (`dont-pin-a-known-hole-with-a-green-test`). Fixing it is real work and nobody has scoped it.
4. **ISC-561's widening is STILL unwitnessed in production.** `gen.repairedAttempt: 0` has never
   appeared; both live repairs to date are `repairedAttempt: 1`, the incumbent path. A measurement job
   needing many turns, not a fix.
5. **`MEMORY.md` is 27.9 KB against a 24.4 KB limit — only PART OF IT LOADS.** It has been over since
   before this session and grew by two entries in it. Index lines need shortening or old ones folding
   into topic files. This is silent context loss on every session start.
6. **Track B step 1, if Erik picks it** — the `qk_auth` signed cookie + `roleFor()`.
7. **Kajian step 7, if Erik wants it** — nothing is specified; steps 1-6 are complete.

## 2. Open items waiting on Erik

- **THE THREE KAJIAN RULINGS, all still owed** — (a) the channel name on the slide vs refused in
  narration, (b) model-relayed speaker names being spoken, (c) consensus claims unscreened in the
  autoplay mp4.
- **The `diam` drift, now moved THREE times.** `docs/review/tanya-ai-request-2026-08-17.md` is **SENT
  and UNANSWERED** and tells the ustadz the app chooses silence when the answer is in a hadith.
  Morning: excise-and-ship. Evening: excise MORE, and ship outright silence on a single-paragraph
  answer. **Now ISC-565 adds refusals on a shape that previously passed**, so more silence again. The
  direction is TOWARD the letter's description and never away from it — more receipts required, never
  more display — so it needs no permission and is the safe error. But the next letter's tally must say
  three, and **Erik said at wrap he would rather the letter go before ISC-565 ships.**
- **Nobody has read a repaired answer for THEOLOGICAL correctness.** Three have now been read for
  coherence only.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ. Two letters SENT, both unanswered — never write
  "Ustadz Ahmad's letter", he has sent nothing.**
- **Answer Record retention**, **ISC-554's remaining half**, **firmed slide visual design**, **roster
  entries** — all unchanged.

## 3. Known weaknesses — recorded, NOT fixed

- **Cross-paragraph danglers** — now WITNESSED live, twice in one answer. See §1 item 3.
- **A single-paragraph answer that trips the wall ships SILENCE.** Unchanged, and ISC-565 makes the
  wall fire on strictly more shapes, so this becomes strictly more likely.
- **Three or more offenders reporting the SAME `detail` still end in silence** (ISC-562's bound).
- **ISC-565's frame covers only the TWO WITNESSED nouns** (`perumpamaan`, `gambaran`). A giving verb
  over an unobserved nominalisation still passes — and on this rule's own evidence the second surface
  form appeared within HOURS of the first. Widen only from real transcripts.
- **The `di-` arm of `LIGHT_VERB_SPEECH` is narrower than it looks.** It requires verb-then-noun order,
  so it reaches the impersonal passive ("…sudah seringkali diberikan perumpamaan") where the Prophet
  would be the RECIPIENT — NOT the passive attribution "gambaran yang diberikan Rasulullah ﷺ", which
  the pattern returns null for. It is kept because widening only adds refusals, not because that shape
  is covered.
- `splitSentences` is **dead** except for its own tests. Kept deliberately.

## 4. Where the kajian criteria live — STILL NOT IN `ISA.md`

Step 4's 38 ISCs are in a TASK ISA at `~/.claude/PAI/MEMORY/WORK/kajian-slide-qr/ISA.md`. Steps 5-6
have NO task ISA. **`quran-new/ISA.md` has zero kajian criteria — do not report 574/589 as kajian
progress.**

---

## Constraints to honor (carried forward — plus four new)

- **NEW — a blocked hook DISCARDS EVERY WRITE IN THAT BASH CALL.** `bash-preflight` rejected a command
  that batched `cat >> <test file>` with a piped gate run; the append never happened, and the test run
  that followed printed the UNTOUCHED BASELINE as if it were a green new suite. **Never batch a file
  write with a gate command.** A pass count identical to the pre-change baseline is the tell.
- **NEW — an impossibility claim is a quantifier.** Three false ones in this one change: *"could not
  have worked"*, *"every real corpus on disk"*, *"the largest real corpus in the tree"*. None was
  load-bearing; all three were caught by re-running rather than re-reading. Prefer stating a rule's
  firing CONDITION over a corpus count — the condition survives an incomplete inventory.
- **NEW — a sentence-level scan of corpus JSON is not an instrument.** Splitting JSON on `.` yields
  "sentences" of scaffolding. Both this session's scans (the gate's "0 of 71", mine "4 of 118") were
  artifacts of it.
- **NEW — do not accept an auditing agent's measurement either.** `scholarly-gate` reported ZERO frame
  occurrences in `grounding-…577Z.md`; the file contains two, and it withdrew on the second pass.
  Re-measure both directions.
- **`/api/answer` cannot be probed by curl** — no hash-verified grounding means it bails before
  generation and returns no `gen` key. Drive the app with Interceptor, clear
  `localStorage['newquranku:thread']`, and discard a warm-up turn.
- **A `scholarly-gate` BLOCK is almost always the RECORD, not the code** — eight passes across three
  changes now, code clean from the first every time. **Re-gate after applying its fixes.**
- **A green wall is not a readable answer.** The guard is a RULES wall, not a coherence check.
- **Arabic you type is not the Arabic that shipped.** Splice captured bytes. (A stray `۩` U+06E9 was
  typed into a docblock this session and caught by a codepoint scan of the diff — run that scan.)
- **The granularity was never Erik's.** His ruling is *"it has to be answered"*.
- **Do not edit files while an auditing agent is auditing them.**
- **The kajian tool never rewrites a transcript**, widens its cue list ONLY from real transcripts, and
  never copies credentials from a video title.
- **The narrator voice `id-ID-Chirp3-HD-Schedar` is LOAD-BEARING per ADR 6.** Do not change it.

---

# Next session — New-Quranku (checkpoint 2026-08-22 night)

> Prepended by /wrap 2026-08-22 (night). **Supersedes the `359caab` anchor.** From that handoff:
> §2 items 1 and 2 (**ISC-561, ISC-562**) are **DONE, pushed AND DEPLOYED**. Items 3 (Track B step 1)
> and 4 (kajian step 7) were NEVER STARTED and carry forward unchanged. Its §1 (three kajian rulings),
> §3 (kajian criteria live in a TASK ISA) and §4 (open items) all **SURVIVE**.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-22 (night)**).

## 🔴 START HERE: PROD IS SERVING A BUILD WITH A KNOWN READER-FACING DEFECT

`new-quranku.axiara.ai` runs Worker version **`6dde5c32`** from **`e6791f0`**. On a repaired turn it
can ship a sentence whose antecedent was excised. **Observed live**, for
*"kenapa kita harus salat lima waktu"*:

> "Rasulullah ﷺ memberikan perumpamaan yang indah tentang shalat lima waktu. **Tentu tidak.** Itulah
> perumpamaan shalat lima waktu…"

**The fix is written, green, and NOT deployed** (ISC-564, paragraph-unit excision, in the working
tree at the anchor below). Erik chose "leave prod up, fix forward" — the fix-forward was not finished
before the session ended. **Deploying it is item 1 and nothing should go before it.**

**Current state.** Gates green — `bun test` **1849/0** exit 0 · typecheck exit 0 (five passes) · build
exit 0. ISA **573/588** (572 `[x]` + ISC-418 `[~]`; 14 open, 1 deferred). Clean tree except untracked
`WARP.md` — **leave it, never `git add -A`.** `web/dist` currently holds a **SYNTHESIS** build (prod's
edition) — that is correct for a prod deploy and the preflight hook enforces it.

## 1. DO NEXT, IN ORDER

1. **DEPLOY ISC-564. The gate has PASSED it.** `scholarly-gate` pass 3 returned **CONCERNS, code
   clean, "ship it"** — all four remaining findings were RECORD defects and all four are fixed in
   `bfa2108` (including a FABRICATED ISNAD in the ISA's own witness: it quoted Bukhari 1260's chain
   for Bukhari 518, cross-contaminated from another turn of the same capture). **No further gate is
   required before deploying** — but if you touch the code again, re-gate.** `Agent(subagent_type="scholarly-gate")` over
   `git diff` on `worker/src/answer-repair.ts`, `worker/src/answer-repair.test.ts`,
   `worker/src/answer-generation.test.ts`, `worker/src/index.ts`, `ISA.md`. Then:
   `VITE_ANSWER_MODE=synthesis bun run build` (the preflight hook BLOCKS a principled dist), verify by
   the **inlined literal** `try{return`synthesis`}` — not a grep for the word — then
   `cd worker && bunx wrangler deploy`, then verify the live version and drive real turns.
2. **Verify the fix on prod the way the defect was found — by DRIVING THE APP, not by curl.**
   `/api/answer` needs hash-verified grounding, so a bare curl bails before generation and tells you
   nothing. Use Interceptor, clear `localStorage['newquranku:thread']` first, discard a warm-up turn,
   then read `interceptor net log --filter api/answer`. **What to look for:** `gen.repaired: true`
   with prose that has no stranded opener, and `gen.repairedAttempt` — a value **less than
   `attempts.length - 1`** is ISC-561's widening firing, which has NEVER been observed (both live
   repairs were `repairedAttempt: 1`, the incumbent path).
3. **`hadithShape`'s verb list — the bigger hole, and it is NOT ISC-564.** It decides whether a
   prophetic attribution needs a receipt by matching VERBS. `mengajarkan` was missing for two
   sessions; **`memberikan perumpamaan` is missing now.** On the observed turn the marker survived
   and a real card rendered — luck, not the wall. Widen ONLY from real prod transcripts, never from
   invented prose (`guard-tests-need-production-prose`), and gate it.
4. **ISC-561's widening is still unwitnessed in production.** `repairedAttempt: 0` has never appeared.
   It needs many turns; it is a measurement job, not a fix.
5. **Track B step 1, if Erik picks it** — the `qk_auth` signed cookie + `roleFor()`.
6. **Kajian step 7, if Erik wants it** — nothing is specified; steps 1-6 are complete.

## 2. Open items waiting on Erik

- **THE THREE KAJIAN RULINGS, all still owed** — (a) the channel name on the slide vs refused in
  narration, (b) model-relayed speaker names being spoken, (c) consensus claims unscreened in the
  autoplay mp4.
- **The `diam` drift, now moved TWICE in one day.** `docs/review/tanya-ai-request-2026-08-17.md` is
  **SENT and UNANSWERED** and tells the ustadz the app chooses silence when the answer is in a hadith.
  Morning: excise-and-ship. Evening: excise MORE, and ship OUTRIGHT SILENCE on a single-paragraph
  answer. Belongs in the next letter; whether it goes there is his.
- **Nobody has read a repaired answer for THEOLOGICAL correctness.** Two were read for coherence.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ. Two letters SENT, both unanswered — never write
  "Ustadz Ahmad's letter", he has sent nothing.**
- **Answer Record retention**, **ISC-554's remaining half**, **firmed slide visual design**, **roster
  entries** — all unchanged from the previous handoff.

## 3. Known weaknesses — recorded, NOT fixed

- **A single-paragraph answer that trips the wall now ships SILENCE.** n=4 cannot show the case is
  absent, only that it did not occur; a larger sample was attempted and lost to a broken sampler.
- **Cross-paragraph danglers are NOT fixed** — a paragraph opening *"Selain itu,"* can still refer to
  one that was removed. Deliberately NOT pinned by a passing test.
- **Three or more offenders reporting the SAME `detail` still end in silence** (ISC-562's bound).
- `splitSentences` is now **dead** except for its own tests. Kept deliberately; do not re-point repair
  at it without re-reading the prod transcript in `splitParagraphs`.

## 4. Where the kajian criteria live — STILL NOT IN `ISA.md`

Step 4's 38 ISCs are in a TASK ISA at `~/.claude/PAI/MEMORY/WORK/kajian-slide-qr/ISA.md`. Steps 5-6
have NO task ISA. **`quran-new/ISA.md` has zero kajian criteria — do not report 573/588 as kajian
progress.**

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a green wall is not a readable answer.** The guard is a RULES wall, not a coherence check.
  Prose that strands a survivor passes every rule it has. Never infer readability from `ok`.
- **NEW — Arabic you type is not the Arabic that shipped.** A regression fixture's honorific was
  retyped (`صلى الله عليه وسلم` for `ﷺ`) inside a docblock claiming it was verbatim; the spelled-out
  form trips the guard's `arabic` rule, so prod could not have sent it. Splice captured bytes.
- **NEW — the granularity was never Erik's.** His ruling is *"it has to be answered"*. *"A violation
  must cost the SENTENCE"* is our write-up; ISC-550 convicted that conflation once already.
- **NEW — `/api/answer` cannot be probed by curl.** No hash-verified grounding means it bails before
  generation and returns no `gen` key at all. Drive the app.
- **NEW — do not edit files while an auditing agent is auditing them.** `green-suite` runs
  `git checkout HEAD --` to force-red; concurrent edits produced 4 phantom test failures.
- **A `scholarly-gate` BLOCK is almost always the RECORD, not the code** — five passes across two
  changes, code clean from the first. Re-gate after applying its fixes; two passes found defects the
  previous fix pass introduced.
- **The kajian tool never rewrites a transcript**, widens its cue list ONLY from real transcripts,
  and never copies credentials from a video title.
- **The narrator voice `id-ID-Chirp3-HD-Schedar` is LOAD-BEARING per ADR 6.** Do not change it.

---

# Next session — New-Quranku (checkpoint 2026-08-22 evening)

> Prepended by /wrap 2026-08-22 (evening). **Anchor `43eee9e`** (verified on origin/main via
> `git ls-remote`). **Supersedes the `efabda8` anchor.** From that handoff: its §2 item 1
> (**kajian steps 5-6 — narration**) is **DONE and pushed**. Items 2-4 (ISC-561, ISC-562, Track B
> step 1) were NEVER STARTED and carry forward unchanged. Its §1 (the ADR 5 ruling), §3 (kajian
> criteria live in a TASK ISA, not `quran-new/ISA.md`), §4 (open items) and §5 (known weaknesses)
> all **SURVIVE**, with §1 now WIDER — see §1 below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-22 (evening)**).

**Current state.** Gates green — `bun test` **1833/0** exit 0 · typecheck exit 0 (five passes) ·
build exit 0. Project ISA **569 met / 16 open / 1 deferred = 586** (kajian is NOT in it — see §3).
Clean tree except untracked `WARP.md` — **leave it, and never `git add -A`.** **Nothing was
deployed.** ⚠️ `web/dist` holds a **`principled`** gate build — rebuild with the right
`VITE_ANSWER_MODE` before ANY deploy.

**Kajian steps 1-6 are SHIPPED** (`43eee9e`). `bun run src/app/kajian.ts <url>` writes
`briefing.md`, `slide.html`, `slide.png`, `narasi[-DRAFT].m4a` and `short[-DRAFT].mp4` into the
gitignored `.scratch/kajian/<videoId>/`. Flags: `[--lang id,en] [--no-brief] [--refresh]
[--model <id>] [--no-slide] [--bullets N] [--deadline S] [--no-audio] [--no-video]`.

---

## 1. ERIK OWES THREE RULINGS — ONE IS WIDER THAN THE LAST HANDOFF SAID

**(a) The slide's source block carries TWO uploader-written strings, not one.** The afternoon
handoff recorded only the video TITLE. The **CHANNEL** is the other, and it has no label above it
at all (`qs-where` renders `${channel} — ${url}` bare). This session established that a bare-name
dakwah channel is a person as often as not — `Firanda Andirja`, `Hanan Attaki`, `Khalid Basalamah
Official`. The narration now refuses to say it; **the slide still prints it, and the short mp4 is
that slide on screen for its whole duration.** Options unchanged: keep, or drop to channel+URL only.

**(b) A speaker name the MODEL relays into its own prose is SPOKEN.** `"Penceramah, Syariful Mahya,
menjelaskan tiga perkara"` clears the title-overlap threshold (2 of 5 tokens, under 0.6) and carries
no dotted gelar, so both screens pass. Could not be closed: the classical-author citations the body
MUST keep ("kitab Raudhatul Uqala karya Imam Ibnu Hibban") are the same shape as the speaker name it
must drop. The roster closes it one video at a time. **Deliberately NOT pinned by a passing test.**

**(c) Consensus claims are unscreened and now SPOKEN.** `speakableFrom` drops quotations, unclear
references, title echoes and dotted gelar. It does not touch `"para ulama sepakat…"` /
`"tidak ada khilaf…"`, and `kajian-flags.test.ts` pins that non-flagging as INTENDED. Defensible for
a written briefing under a labelled disclaimer; this step turns the same sentence into our
narrator's voice on an autoplaying mp4. **Adding a consensus screen is a policy change, not a bug
fix.**

## 2. DO NEXT, IN ORDER

1. **ISC-561 — repair sees only the LAST refused candidate.** Untouched for four sessions.
   `worker/src/answer-generation.ts:278` assigns `lastBlocked = candidate` on every refusal, so
   attempt 2 overwrites attempt 1, and `:294` hands repair only the survivor. **Write the failing
   test BEFORE implementing** — this repo's record is that a prescribed fix can be byte-identical
   to the default.
2. **ISC-562 — repair's progress signal is a count of RULES.** It hill-climbs on
   `guard(text).violations.length`, but `guardAnswerProse` pushes at most one violation per rule, so
   two independently-violating sentences score 1 and `bestIndex` stays `-1`. `AnswerViolation.detail`
   holds what a fix needs; `RepairVerdict` does not expose it. **Widening it is guard-adjacent —
   gate with `scholarly-gate` before committing.**
3. **Track B step 1, if Erik picks it** — the `qk_auth` signed cookie + `roleFor()`. Unblocks
   everything else in that track and is small.
4. **Kajian step 7, if Erik wants it** — nothing is specified. Steps 1-6 are complete and ADR 6 is
   fully satisfied except the rulings in §1.

## 3. WHERE THE KAJIAN CRITERIA LIVE — STILL NOT IN `ISA.md`

Step 4's 38 ISCs are in a TASK ISA at `~/.claude/PAI/MEMORY/WORK/kajian-slide-qr/ISA.md`. **Steps
5-6 have NO task ISA** — they were built against ADR 6 directly and verified by the scholarly-gate
rounds recorded in `PROGRESS.md`. `quran-new/ISA.md` has **zero** kajian criteria. **Do not report
the project ISA's 569/586 as the kajian track's progress.**

## 4. Open items waiting on Erik

- **§1(a), (b) and (c)** — three rulings. (a) blocks calling the slide closed; (b) and (c) are
  live-behaviour policy calls on an artifact that gets posted.
- **Which track next.** Both ready; they share nothing.
- **Roster entries.** `docs/kajian/roster.yaml` ships `speakers: []` AND `organisations: []` on
  purpose. Ustadz Syariful Mahya was deliberately NOT pre-filled — the title's "L.C., M.A." is the
  uploader's wording and unverified. Add a name with `credentials` omitted if unsure.
- **Firmed slide visual design** — still NEUTRAL. Every colour/size is a `--qs-*` property in one
  `:root` block; `SLIDE_TOKENS` is exported so a new design can be diffed against this one.
- **Answer Record retention** — blocks Track B's review queue.
- **ISC-554's remaining half** — whether refused prose may ever be surfaced on the PUBLIC endpoint.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ.** **Two letters SENT, both unanswered — never
  write "Ustadz Ahmad's letter", he has sent nothing.** The ID-key correction is owed in the third.

## 5. Known weaknesses — recorded, NOT fixed

- **§1(b) and §1(c) above are the two live ones.** Both are in `PROGRESS.md` and in the
  `kajian-narration.ts` docblock, and in no third place.
- **The `[rujukan tidak jelas dalam transkrip]` marker has now fired ZERO times across THREE real
  runs.** Still cannot distinguish "nothing was ambiguous" from "the instruction is inert" — but the
  extractor's drop rule for it is unit-tested on both paths and would fire if it appeared.
- **`DEFAULT_MAX_TOTAL_CHARS = 480` is a MEASUREMENT, not a preference.** Any change to a type or
  spacing token invalidates it — re-render the real briefing and LOOK at the PNG. Clipping is silent.
- **Three of the short path's four screens are unreachable from the CLI today** (`collect()` screens
  them first); only `echoes-the-title` can fire there. They are kept because `buildNarrationScript`
  does not get to assume its caller. Said so in the docblock.
- **A prose Executive Summary yields WEAKER bullets.** Real, deliberately left alone: splitting
  prose into slide bullets is authoring, and this pipeline does not author.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a source grep greps the IMPORTS too.** Three tests asserted a safety property by grepping
  a source file and all three were blind: `toContain("DRAFT_WARNING")` stayed green with the gate
  DELETED because the import line still named the symbol. For anything a file EMITS, encode/render
  and read it back (`kajian-audio.test.ts` calls `encodeM4a` + `ffprobe`). Strip comments first —
  one grep fired on a comment explaining the very bug it checked for.
- **NEW — force-red EACH branch separately.** A test named "runs ALL FOUR screens" pinned three; the
  fourth was deletable with the suite green. And a fixture that trips two screens cannot pin either.
- **NEW — a channel/personal NAME cannot be screened by pattern.** Allowlist it or omit it. The
  honorific pattern caught `Buya Yahya` and passed `Firanda Andirja`.
- **NEW — a disclaimer conditional on an unrelated field is not a disclaimer.** Every m4a denial sat
  inside `if (tags.sourceUrl)`; a URL-less encode shipped carrying nothing.
- **NEW — `-shortest` does not bound a looped still image.** Measure the audio, pass `-t`, and
  measure the result. 50.8s of narration produced a 63.0s mp4.
- **The kajian tool never rewrites a transcript**, and widens its cue list ONLY from real
  transcripts, only ever growing. **Never copy credentials from a video title.**
- **The narrator voice `id-ID-Chirp3-HD-Schedar` is LOAD-BEARING per ADR 6.** Do not change it.
- **Google TTS caps `input.text` at 5,000 UTF-8 BYTES** (measured). ADC + `X-Goog-User-Project`; the
  token expires mid-session and needs an interactive `gcloud auth application-default login`.
- **Do NOT raise `MODEL_DEADLINE_MS` for a slow offline job.** `callChatModel` takes `deadlineMs`.
- **`.scratch/` is NOT gitignored** — the issue tracker lives there. Only `.scratch/kajian/` is.
- **prod AUTHORS and REPAIRS for readers.** Any change to `answer-generation.ts`, `answer-repair.ts`
  or the guard has a live blast radius.
- **Quote a rule to its END.** **A correction is the least-scrutinised edit** — re-run
  `scholarly-gate` AFTER applying one. This session: 8 gate rounds, and THREE of the defects were
  regressions introduced by the previous round's own fix.
- **Name WHO permitted a thing and WHICH SURFACE.** **A whole-run bucket total is NOT evidence.**
- **Never record a declined gap as a PASSING test.** Record it in `PROGRESS.md` instead.
- **Verify a deploy by SERVED BYTES and a remote SHA**; the first curl after a deploy reads stale.
- **Verify a push with `git ls-remote`, never the push's exit code, and never pipe `git push`.**
- **Never pipe a gate command into head/tail** — the preflight hook blocks it, and it hides exit 2.
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.**
- **Read the terminal reason from `gen.reason`, never `blockedBy`.**
- **Do NOT switch model. Do NOT build the echo union.**
- **Never `git add -A` in this repo** — it swept `WARP.md` in twice.
- **`quran-new/ISA.md` has no `### Phase` headings and there is no `.planning/STATUS.md`** — a
  per-phase table renders 0/0 and a tracker table renders nothing. Neither absence is a signal.

---

# Next session — New-Quranku (checkpoint 2026-08-22 afternoon)

> Prepended by /wrap 2026-08-22 (afternoon). **Anchor `efabda8`** (verified on origin/main via
> `git ls-remote`). **Supersedes the `a11e2e8` anchor.** From that handoff: its §2 item 1
> (**kajian step 4 — slide + QR**) is **DONE**. Items 2-5 were NEVER STARTED and carry forward
> unchanged. Its §1 (two independent tracks), §3 (widen the cue list only from real transcripts),
> §4 (open items) and §5 (the `[rujukan tidak jelas]` marker is unverified) all **SURVIVE** — with
> §5 now **PARTLY ANSWERED**: see §5 below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-22 (afternoon)**).

**Current state.** Gates green — `bun test` **1775/0** exit 0 · typecheck exit 0 (five passes).
Project ISA **569 met / 16 open / 1 deferred / 1 reversed = 587** (kajian is NOT in it — see below).
Clean tree except untracked `WARP.md` — **leave it, and never `git add -A`.** **Nothing was
deployed.** Prod is still worker `885945f5` from the morning session.

**Kajian steps 1-4 are SHIPPED.** `bun run src/app/kajian.ts <url>` writes `briefing.md`,
`slide.html` and `slide.png` (2160x2700) into the gitignored `.scratch/kajian/<videoId>/`.
Flags: `[--lang id,en] [--no-brief] [--refresh] [--model <id>] [--no-slide] [--bullets N]
[--deadline S]`.

---

## 1. ERIK OWES A RULING BEFORE STEP 4 IS REALLY CLOSED

**ADR 5 read strictly is NOT satisfied by the shipped slide, and this was my judgement rather than
the ADR's.** ADR 5 says an unrostered video renders "with the source link and no identity: no name,
no face, no credentials." The slide DOES put a name and a gelar on the image — quoted, labelled
"Judul di YouTube, disalin apa adanya", and confined to the source block beside the QR, but on the
image. I chose that because suppressing the title leaves the slide unable to say which lecture it
summarises, and the QR leads to a page showing the title anyway.

Options: **(a)** keep as shipped; **(b)** source block shows channel + URL only, no title.
**Related hazard either way:** a `channelId` roster match on a MOSQUE channel would render two
different names on one slide — the roster's in the identity slot, the title's in the source block.
`validateRoster` does not prevent that configuration.

## 2. DO NEXT, IN ORDER

1. **Kajian steps 5-6 — narration.** Voice is **`id-ID-Chirp3-HD-Schedar`**, chosen by Erik and
   recorded in ADR 6 as load-bearing. Spoken attribution FIRST, before any content. ffmpeg 8.1 is
   installed; image+audio→mp4 is one command. **The long-form needs chunking AND a length assertion
   against the source text** — Chirp3-HD caps input per request, and a dropped chunk plays cleanly
   and exits zero. Google TTS needs the `X-Goog-User-Project` header for quota billing.
2. **ISC-561 — repair sees only the LAST refused candidate.** Untouched for three sessions now.
   `worker/src/answer-generation.ts:278` assigns `lastBlocked = candidate` on every refusal, so
   attempt 2 overwrites attempt 1, and `:294` hands repair only the survivor. **Write the failing
   test BEFORE implementing** — this repo's record is that a prescribed fix can be byte-identical
   to the default.
3. **ISC-562 — repair's progress signal is a count of RULES.** It hill-climbs on
   `guard(text).violations.length`, but `guardAnswerProse` pushes at most one violation per rule, so
   two independently-violating sentences score 1 and `bestIndex` stays `-1`. `AnswerViolation.detail`
   holds what a fix needs; `RepairVerdict` does not expose it. **Widening it is guard-adjacent —
   gate with `scholarly-gate` before committing.**
4. **Track B step 1, if Erik picks it** — the `qk_auth` signed cookie + `roleFor()`. Unblocks
   everything else in that track and is small.

## 3. WHERE THE KAJIAN CRITERIA LIVE — NOT IN `ISA.md`

Step 4's 38 ISCs are in a TASK ISA at
`~/.claude/PAI/MEMORY/WORK/kajian-slide-qr/ISA.md` (38/38, with the Verification and Changelog
sections populated). `quran-new/ISA.md` is the reader-facing app's harness and has **zero** kajian
criteria, matching how steps 1-3 were tracked. **Do not report the project ISA's 569/587 as the
kajian track's progress** — they measure different things.

## 4. Open items waiting on Erik

- **§1's ADR 5 ruling** — (a) keep the title, or (b) drop it. Blocks calling step 4 closed.
- **Which track next.** Both ready; they share nothing.
- **Roster entries.** `docs/kajian/roster.yaml` ships EMPTY on purpose. Ustadz Syariful Mahya was
  deliberately NOT pre-filled — the title's "L.C., M.A." is the uploader's wording and unverified.
  Add the name with `credentials` omitted if unsure; a wrong gelar insults someone who earned a
  different one.
- **Firmed slide visual design** — shipped NEUTRAL. Every colour and size is a `--qs-*` custom
  property in one `:root` block in `src/app/kajian-slide.ts`; `SLIDE_TOKENS` is exported so a new
  design can be diffed against this one.
- **Answer Record retention** — how long stored Q+A is kept. Blocks Track B's review queue.
- **ISC-554's remaining half** — whether refused prose may ever be surfaced on the PUBLIC endpoint.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ.** **Two letters SENT, both unanswered — never
  write "Ustadz Ahmad's letter", he has sent nothing.** The ID-key correction is owed in the third.

## 5. Known weaknesses — recorded, NOT fixed

- **A prose Executive Summary yields WEAKER bullets.** The fallback picks up detail sub-points
  ("Kecerdasan akademis: mengacu pada nilai ujian dan prestasi sekolah"). Real, and deliberately
  left alone: splitting prose into slide bullets is authoring, and this pipeline does not author.
- **The `[rujukan tidak jelas dalam transkrip]` marker fired ZERO times across TWO real runs** now,
  not one. Still cannot distinguish "nothing was ambiguous" from "the instruction is inert" — but
  the extractor's drop rule for it is unit-tested and would fire if the marker ever appeared.
- **`DEFAULT_MAX_TOTAL_CHARS = 480` is a MEASUREMENT, not a preference.** 438 chars fitted with two
  lines spare; 552 clipped. **Any change to a type or spacing token invalidates it** — re-render the
  real briefing and LOOK at the PNG. Do not raise it by arithmetic. Clipping is silent.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a scope preference must never be able to produce silence.** Preferring the Executive
  Summary emptied the slide the moment the model wrote that section as prose instead of a list,
  from the identical prompt. Always fall back, and report BOTH passes' refusals.
- **NEW — run any parser of model output TWICE on the same input before believing it.** The output
  SHAPE is not stable across calls even when prompt, transcript and temperature are.
- **NEW — a per-item cap is not a layout bound.** The layout constrains the SUM. And `overflow:
  hidden` CONTAINS damage without announcing it: a clipped bullet reads as a finished sentence.
- **NEW — decode the QR, never inspect the SVG.** A QR whose modules lost their geometry renders as
  a clean blank square and exits zero. `cv2.QRCodeDetector().detectAndDecode()` on the PNG is the
  only probe that catches it. (Python for the probe only — never committed; this repo is TS.)
- **NEW — do NOT raise `MODEL_DEADLINE_MS` for a slow offline job.** It guards a READER waiting on a
  page and is deliberately below the browser's backstop. `callChatModel` takes `deadlineMs` per
  call; the kajian CLI passes its own.
- **The kajian tool never rewrites a transcript**, and widens its cue list ONLY from real
  transcripts, only ever growing.
- **Never copy credentials from a video title.** That is the uploader's wording.
- **`.scratch/` is NOT gitignored** — the issue tracker lives there in tracked markdown. Only
  `.scratch/kajian/` is ignored. Never blanket-ignore `.scratch/`.
- **A test's carrier sentence must contain NO second cue.**
- **prod AUTHORS and REPAIRS for readers.** Any change to `answer-generation.ts`, `answer-repair.ts`
  or the guard has a live blast radius.
- **Quote a rule to its END.** **A correction is the least-scrutinised edit** — re-run
  `scholarly-gate` AFTER applying one. **A justification is a claim and gets audited like one.**
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Never record a declined gap as a PASSING test.**
- **Verify a deploy by SERVED BYTES and a remote SHA**; the first curl after a deploy reads stale.
- **Verify a push with `git ls-remote`, never the push's exit code, and never pipe `git push`.**
- **Never pipe a gate command into head/tail** — the preflight hook blocks it, and it hides exit 2.
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.**
- **Read the terminal reason from `gen.reason`, never `blockedBy`.**
- **Do NOT switch model. Do NOT build the echo union.**
- **Never `git add -A` in this repo** — it swept `WARP.md` in twice.
- **`quran-new/ISA.md` has no `### Phase` headings and there is no `.planning/STATUS.md`** — a
  per-phase table renders 0/0 and a tracker table renders nothing. Neither absence is a signal.

---

# Next session — New-Quranku (checkpoint 2026-08-22)

> Prepended by /wrap 2026-08-22. **Anchor `5a7e806`** (verified on origin/main via `git ls-remote`).
> **Supersedes the `1b89497` anchor.** From that handoff: its §2 item 1 (**ISC-558**) is **DONE**.
> Items 2 and 3 — **ISC-561 and ISC-562 — were NEVER STARTED** and are carried forward below
> unchanged. Its §1 (refusal-capture exists, do not rebuild it), §3 (a scoped re-gate never re-reads
> settled text) and §4 (open items) all **SURVIVE**.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-22**).

**Current state.** Gates green — `bun test` **1737/0** exit 0 · typecheck exit 0 (five passes).
ISA **569 of 585 parsed** (16 open; the parser skips `[~]`-marked reversals, so treat this as ±2 —
`### Cycle` headings do NOT bound the criteria, and there is no `.planning/STATUS.md` tracker in this
repo). Clean tree except untracked `WARP.md` — **leave it, and never `git add -A`.**

**PROD WAS DEPLOYED THIS SESSION** — worker `885945f5` replaced `4339cb45`, on Erik's explicit
approval. The ISC-418 always-answer reversal and the ISC-560 repair pipeline are now in front of
readers for the first time. Verified by rows only the change could emit (`repaired:true`,
`repairedDropped:1`, `repairedRule:"wording"`). **Mechanics only — not one answer was checked for
theological correctness, and no scholar has.**

---

## 1. TWO INDEPENDENT TRACKS. Ask Erik which, do not assume.

**Track A — kajian pipeline. Steps 1-3 SHIPPED, steps 4-6 remain.** Local CLI, no auth, no Worker,
nothing published. `bun run src/app/kajian.ts <url> [--lang id,en] [--no-brief] [--refresh]`.

**Track B — auth/roles/review. DESIGN ONLY, zero code.** Ten decisions in ADRs 1-4 + `CONTEXT.md`.

## 2. DO NEXT, IN ORDER

1. **Kajian step 4 — slide + QR.** Self-contained HTML → `qrencode` SVG inline → system Chrome
   `--headless --screenshot --window-size=1080,1350` → PNG. **Neutral design, built on CSS custom
   properties** — Erik ships a firmed visual later and it must drop in as a token swap. This repo has
   already had a retheme silently fail because hardcoded colour literals outlived the tokens.
   `qrencode` IS installed (`/opt/homebrew/bin/qrencode`); an earlier note that it was missing was
   wrong — it was unlinked, not absent.
2. **Kajian steps 5-6 — narration.** Voice is **`id-ID-Chirp3-HD-Schedar`**, chosen by Erik and
   recorded in ADR 6 as load-bearing. Spoken attribution FIRST, before any content. ffmpeg 8.1 is
   installed; image+audio→mp4 is one command. **The long-form needs chunking AND a length assertion
   against the source text** — Chirp3-HD caps input per request, and a dropped chunk plays cleanly
   and exits zero.
3. **ISC-561 — repair sees only the LAST refused candidate.** Untouched for two sessions now.
   `answer-generation.ts:278` assigns `lastBlocked = candidate` on every refusal, so attempt 2
   overwrites attempt 1, and `:294` hands repair only the survivor. **Write the failing test BEFORE
   implementing** — this repo's record is that a prescribed fix can be byte-identical to the default.
4. **ISC-562 — repair's progress signal is a count of RULES.** It hill-climbs on
   `guard(text).violations.length`, but `guardAnswerProse` pushes at most one violation per rule, so
   two independently-violating sentences score 1 and `bestIndex` stays `-1`. `AnswerViolation.detail`
   holds what a fix needs; `RepairVerdict` does not expose it. **Widening it is guard-adjacent — gate
   with `scholarly-gate` before committing.**
5. **Track B step 1, if Erik picks it** — the `qk_auth` signed cookie + `roleFor()`. Unblocks
   everything else in that track and is small.

## 3. WIDEN THE CUE LIST ONLY FROM REAL TRANSCRIPTS

`src/app/kajian-flags.ts` was falsified by the first real video: three devotional words produced 191
hits, the Arabic detector fired zero times in 80,113 chars (ASR transliterates to Latin), and five
carefully unit-tested cues had zero occurrences. **The suite was green on prose I wrote myself.**
Every future widening comes from a transcript that actually came back, and the list only ever grows.

## 4. Open items waiting on Erik

- **Which track to build next.** Both are ready; they share nothing.
- **Roster entries.** `docs/kajian/roster.yaml` ships EMPTY on purpose. Ustadz Syariful Mahya was
  deliberately NOT pre-filled — the title's "L.C., M.A." is the uploader's wording and unverified.
  Add the name with `credentials` omitted if he is unsure; a wrong gelar insults someone who earned
  a different one.
- **Firmed slide visual design** — he said neutral for now, real design later.
- **Answer Record retention** — how long stored Q+A is kept. Blocks Track B's review queue.
- **ISC-554's remaining half** — whether refused prose may ever be surfaced on the PUBLIC endpoint.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ.** **Two letters SENT, both unanswered — never
  write "Ustadz Ahmad's letter", he has sent nothing.** The ID-key correction is owed in the third.

## 5. Unverified, do not claim it works

The briefing prompt's `[rujukan tidak jelas dalam transkrip]` marker fired **zero** times on the one
real run. Either nothing was ambiguous enough or the instruction is inert — one run cannot tell.

---

## Constraints to honor (carried forward — plus six new)

- **NEW — a test's carrier sentence must contain NO second cue.** The first force-red did not go red:
  "hadits ini diriwayatkan oleh Imam Bukhari" carries three other cues, so it passed with the feature
  deleted. A guard that passes because ANOTHER guard caught it is not working.
- **NEW — `.scratch/` is NOT gitignored** — the issue tracker deliberately lives there in tracked
  markdown. Only `.scratch/kajian/` is ignored. Never blanket-ignore `.scratch/`.
- **NEW — never copy credentials from a video title.** That is the uploader's wording. The roster
  holds only what a human verified.
- **NEW — the kajian tool never rewrites a transcript.** An LLM cleanup pass reads better and is
  unverifiable; once a citation is "fixed", nothing downstream can tell a right correction from a
  plausible wrong one.
- **NEW — prod now AUTHORS and REPAIRS for readers.** Any change to `answer-generation.ts`,
  `answer-repair.ts` or the guard now has a live blast radius it did not have before 2026-08-21.
- **NEW — quote a rule to its END.** A rule-9 quote was cut one sentence short at exactly the clause
  that supported the argument; the omitted sentence said the opposite.
- **A correction is the least-scrutinised edit.** Re-run `scholarly-gate` AFTER applying one.
- **A justification is a claim and gets audited like one.**
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Never record a declined gap as a PASSING test.**
- **Verify a deploy by SERVED BYTES and a remote SHA**; the first curl after a deploy reads stale.
- **Verify a push with `git ls-remote`, never the push's exit code, and never pipe `git push`.**
- **Never pipe a gate command into head/tail** — the preflight hook blocks it, and it hides exit 2.
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.**
- **Read the terminal reason from `gen.reason`, never `blockedBy`.**
- **Do NOT raise `MODEL_DEADLINE_MS`.** **Do NOT switch model.** **Do NOT build the echo union.**
- **Never `git add -A` in this repo** — it swept `WARP.md` in twice.
- **This ISA's `### Cycle` headings do not bound the criteria**, and there is no `### Phase` heading
  at all — a per-phase table renders 0/0 and is not a signal.

---

# Next session — New-Quranku (checkpoint 2026-08-21 evening)

> Prepended by /wrap 2026-08-21 (evening). **Anchor `1b89497`** — verified landed via
> `git ls-remote`, not by the push's exit code. **Supersedes the `d2d622a` anchor.** From that
> handoff: its §1 (the two rules named backwards) is **DONE** — ISC-559 met. Its §2's BLOCKER is
> **GONE** — ISC-554 met, refused prose is readable. Its §3 (do not use `eval:answer`), §4 (echo wall
> inert on verse-less turns), §5 (the 33 s turn is ISC-487, do NOT raise `MODEL_DEADLINE_MS`), §6 (an
> agent with write access reverted ISA.md) and §7 (open items) all **SURVIVE UNCHANGED**.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-21 (evening)**).

**Current state.** Gates green — `bun test` **1712/0** exit 0 · typecheck exit 0 (five passes) ·
synthesis build exit 0. **ISA 569/587** (568 met + ISC-418 reversed; 17 open, 1 deferred). Clean tree
except untracked `WARP.md` — **leave it, and never `git add -A`.** **Nothing was deployed.** Prod is
still worker `4339cb45`.

---

## 1. THE REFUSED PROSE IS READABLE NOW — use it, do not rebuild it

`src/eval/refusal-capture.ts` runs the Worker's own `runGeneration` in-process: same loop module,
`guardAnswerProse` with all FOUR arguments, the real `repairAnswerProse`, same prompt/params/provider,
with the guard closure WRAPPED so every candidate the wall judged is retained — including every
sentence mask repair tried. Publishes nothing, deploys nothing.

```
export OPENROUTER_API_KEY=...        # it is in ./.env — source it, never print it
bun run src/eval/refusal-capture.ts --only musik --repeat 2
bun run src/eval/refusal-capture.ts --blocked-only --out /path/OUTSIDE/the/repo.txt
```

**Its output is REFUSED model output.** It may carry fabricated divine or prophetic attribution. It
stays on the dev surface: never quoted into `ISA.md`, `PROGRESS.md`, a letter, or anything that ships,
and never shown to a reader. `--out` REFUSES any literal path inside the outermost git tree above the
cwd — that is enforced, not advised.

## 2. DO NEXT, IN ORDER

1. **ISC-558 — `src/eval/answer-run.ts`.** Untouched, and it was item 4 of the last handoff. `:149`
   has the stale bow-out; `:163` calls `guardAnswerProse(out, allowed)` with **two** arguments, taking
   the defaults that switch OFF the echo wall and the hadith predicate, under a docblock claiming it
   *"reproduce[s] the Worker's answer path exactly"*. The fix must land **WITH a declared break in the
   `answer-judge` scored series** — that is a sequencing requirement, not a difficulty one.
   `refusal-capture.ts` is the worked example of the four-argument wiring.
2. **ISC-561 — repair sees only the LAST refused candidate.** `answer-generation.ts:278` assigns
   `lastBlocked = candidate` every refusal, so attempt 2 overwrites attempt 1, and `:294` hands repair
   only the survivor. Measured: attempt 1's prose repaired in a SINGLE deletion (`dropped: 1`, 220
   words the wall accepts) while attempt 2's did not repair at all. **Write the failing test BEFORE
   implementing** — this repo's record is that a prescribed fix can be byte-identical to the default.
3. **ISC-562 — repair's progress signal is a count of RULES.** It hill-climbs on
   `guard(text).violations.length`, but `guardAnswerProse` pushes **at most one violation per rule**
   (`web/src/answer-guard.ts:1237-1278`) and `wordingShape` returns only its FIRST span. Two
   independently-violating sentences under one rule therefore score 1, every single deletion still
   scores 1, `bestIndex` stays `-1`, and repair returns `dropped: 0` after one round. The verdict
   already carries what a fix needs — `AnswerViolation.detail` holds the offending span — but
   `RepairVerdict`, the structural type repair accepts, does not expose it. **Widening it is
   guard-adjacent: gate it with `scholarly-gate` before committing.**
4. **ISC-487 (latency), ISC-419 (echo coverage), ISC-533/534, ISC-440.6, ISC-454, ISC-486** — still
   open, none started this session.

## 3. A NARROWLY-SCOPED RE-GATE NEVER RE-READS SETTLED TEXT

Eleven `scholarly-gate` passes on one change. Three BLOCKs were defects introduced by **corrections to
the previous pass**. Worse: an overclaim in the ORIGINAL ISC-561 — asserting a READER lost an answer,
on an offline run where no reader existed — **survived six passes, and only ONE of them ever read it.**
Pass 1 read it and missed it; passes 2-6 were scoped BY ME to "the edits under review" and never
re-opened its prose; pass 7 caught it the moment `PROGRESS.md` restated the paragraph.

**So: when re-gating more than twice, budget one pass that re-reads the WHOLE artifact, and prefer a
CHANGED FRAME over a repeat read.** A repeat read is an opportunity, not a catch — pass 1 proves it.

## 4. Open items — two need Erik, one needs the ustadz

- **ISC-554's remaining half — Erik's call, UNTOUCHED.** Whether refused prose may ever be surfaced on
  the PUBLIC endpoint. The dev-only route needed no ruling and is what shipped; the public one is his.
- **Deploy — Erik's.** Nothing from this session needs one; the harness is not shipped code.
- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ.** Only Ustadz Ahmad can meet ISC-417; he has a
  heads-up only. **Two letters SENT, both unanswered — never write "Ustadz Ahmad's letter", he has
  sent nothing.** The ID-key correction is still owed in whatever is sent next, the THIRD.

## 5. Every open ISC (17 open + 1 deferred + 1 reversed; 587 total)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) · `ISC-353.0` · `ISC-417` ·
`ISC-418` **`[~]` reversed by Erik** · `ISC-419` · `ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` ·
`ISC-486` · `ISC-487` · `ISC-533` · `ISC-534` · **`ISC-552`** · **`ISC-558`** · **`ISC-561`** ·
**`ISC-562`**.

---

## Constraints to honor (carried forward — plus six new)

- **NEW — a narrowly-scoped re-gate never re-reads settled text.** See §3. One unscoped pass, or a
  frame change, per multi-pass review.
- **NEW — verify a rule's LOCATOR from the code, not only its scope.** The correction that fixed the
  swapped function names put the cited sentence in the wrong block. `:606` is in `:579-616` (above
  `DIVINE_VERB`), NOT in `:903-1004` (above `VERBATIM_DIVINE`).
- **NEW — never cite a criterion ID from memory; grep it.** "ISC-546 was raised to end that" was
  invented, inside a paragraph about invented attributions.
- **NEW — this repo contains FOUR live git worktrees under `.claude/worktrees/`, and a worktree's
  `.git` is a FILE.** Any "am I inside the repo" check that stops at the nearest `.git` anchors on the
  worktree and leaves the TRACKED tree exposed.
- **NEW — `refusal-capture.ts`'s corpus check has stood in for its `--out` guard THREE times.** Do not
  move `CORPUS_PATH`'s existence check without re-testing containment.
- **NEW — an original defect is caught by the FIRST full pass or by an accident.** Do not assume a
  clean re-gate means the artifact is clean; it may only mean nobody re-read it.
- **A correction is the least-scrutinised edit.** Re-run `scholarly-gate` AFTER applying one.
- **A justification is a claim and gets audited like one.** Ask whether it is the flattering reading.
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Never record a declined gap as a PASSING test — a `- [x]` checkbox is the same artifact.**
- **35% / 96% (ISC-418) are CITE rates, not answered rates.** The ungrounded arm ANSWERS 46/46.
- **An instrument encodes the contract it was written against.** After a behavioural change, ask what
  each probe would print if the change were REVERTED before citing its number.
- **Brief write-capable agents against `git checkout`/`restore`/`stash`.** One destroyed a session's
  ISA work and reported it as a fabrication.
- **Read an echo/guard count against its ELIGIBLE denominator.** The echo wall is inert on any
  verse-less turn; this run, eligible on only 3/8.
- **Verify a deploy by SERVED BYTES and a remote SHA**; the first curl after a deploy reads stale.
- **Verify a push with `git ls-remote`, never the push's exit code, and never pipe `git push`.**
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.**
- **Read the terminal reason from `gen.reason`, never `blockedBy`.** `gen.rule` names the CHECK.
- **Do NOT raise `MODEL_DEADLINE_MS`.** **Do NOT switch model.** **Do NOT build the echo union.**
- **Never `git add -A` in this repo** — it swept `WARP.md` in twice.
- **This ISA's `### Cycle` headings do not bound the criteria** — 150 of 587 sit before the first one.
  The TOTAL is right; a per-cycle table is not.

---

# Next session — New-Quranku (checkpoint 2026-08-21 morning)

> Prepended 2026-08-21 (morning). **Anchor `d2d622a`** (verified landed on origin/main). **Supersedes the
> `c1b163a` anchor.** From that handoff: **§1's RATE did not reproduce but its MECHANISM STANDS** —
> and §1 named the wrong function for it (see §2 below). Its §2 (provider pin), §3 (no model switch),
> §4 (no echo union), §6 (dalil-probe dev-only), §7 (ID-key stays broken), §8 (two unanswered
> letters, no letter about the always-answer change) all **SURVIVE UNCHANGED**.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-21 (morning)**).

**Current state.** Gates green — `bun test` **1712/0** exit 0 · typecheck exit 0 (five passes) ·
synthesis build exit 0. **ISA 566 accounted (565 met + ISC-418 reversed) / 17 open / 1 deferred = 584.** Clean tree except untracked
`WARP.md` — **leave it, and never `git add -A`.** **Nothing was deployed this session.** Prod is
still worker `4339cb45` from `c1b163a`.

---

## 1. THE TWO `own_wording` RULES ARE NAMED BACKWARDS IN THE TREE. Read this before touching repair.

- `rule:"wording"` = `wordingShape` = **WHOLE-PROSE** (`web/src/answer-guard.ts:606` says so in terms).
- `rule:"echo"` = `scriptureEchoShape` = **SENTENCE-SCOPED** (`:1138` splits on `[.!?]`; `:1137` is its early return).

`worker/src/answer-repair.ts:19-21` asserts the reverse, and the previous handoff repeated it. **I
inherited the swap and wrote an inverted ISC-552 before `scholarly-gate` caught it.** ISC-559 records
it; the docblock is NOT yet corrected because that file was under this session's no-guard-edits
constraint. **Correct it in the next change allowed to touch that file** — it is a comment, not a
rule, so the edit is safe.

## 2. ITEM 1 IS STILL OPEN, WITH ITS MECHANISM CONFIRMED AT n=1 AND ITS RATE UNREPRODUCED

Three runs on `4339cb45`: **A** 0 blocked/14 grounded · **B** 1/14 · **C** 0/7. Not comparable to the
prior 2–3/12 (different question set, grounded-only denominator, whole-run totals on identical code).
The one block was `apakah musik haram`, `gen.rule: wording` — **the whole-prose rule**, i.e. §1's
diagnosis was right. Its two attempts failed on **different** rules (`fatwa`, then `wording`), so
per-attempt repair faces a rule SET, not one persistent violation.

**BLOCKER: you cannot design the fix yet.** `/api/answer` returns `answer: null` on a block, so the
refused PROSE is unreadable (ISC-554). Designing sentence-level surgery against prose nobody can see
is the failure this project keeps paying for. **Two publish-nothing ways to get it** — an unrouted
dev-only Worker with its own wrangler config (precedent: `worker/src/dalil-probe.ts`,
`docs/review/rights-2026-08-20.md` ruling 2), or `wrangler tail`. Returning it on the public endpoint
is Erik's call and is NOT the only option, contrary to a draft I had to correct. **Neither dev route is
a licence for the prose to travel**, and the `dalil-probe` precedent covers a DIFFERENT class —
third-party rights, not model output. What would be captured here is REFUSED prose, which by
construction may carry fabricated divine or prophetic attribution: it stays on the dev surface, is
never quoted into anything that ships, and is never shown to a reader.

## 3. DO NOT USE `eval:answer` AS THE FALLBACK INSTRUMENT — it is doubly blind (ISC-558)

`src/eval/answer-run.ts:149` has the SAME stale bow-out the live probe just lost, under a docblock
claiming it *"Reproduce[s] the Worker's answer path exactly"*. And `:163` calls
`guardAnswerProse(out, allowed)` with **two arguments**, taking the defaults that switch OFF the echo
wall and the hadith predicate — so it can never emit `rule:"echo"` or a real `bad_hadith`. Fixing it
must land **with a declared break in the `answer-judge` scored series**, not quietly ahead of it.

## 4. THE ECHO WALL IS INERT ON ANY VERSE-LESS TURN, and always-answer makes that worse (ISC-555)

`worker/src/index.ts:829` hands it `verses.map(...)`; `scriptureEchoShape` returns null on an empty
array. Only 3/8 and 6/16 turns retrieved a verse. **Never read an echo count against a run total** —
the probe now prints the eligible denominator for you. This is an ISC-419 COVERAGE question and it is
not the same question as §2.

## 5. THE 33 s TURN IS ISC-487, NOT A GUARD PROBLEM

The one blocked turn ran 33,154 ms, past the browser's 30,000 ms `TIMEOUT_MS`, with generation using
its full 25,000 ms deadline. The reader saw nothing regardless of the verdict. The probe now counts
past-abort turns. **Do NOT raise `MODEL_DEADLINE_MS`.**

## 6. AN AGENT WITH WRITE ACCESS REVERTED `ISA.md` MID-SESSION

Forge's Codex subagent timed out; Forge concluded the new ISA cycle was fabricated and ran
`git checkout -- ISA.md`. **It was real work from this session's own dumps** — its subagent could not
see the scratchpad. Rebuilt from the scratchpad. **Brief write-capable audit agents explicitly: no
`git checkout`/`restore`/`stash`.** Its technical findings were good; its provenance call was wrong.

## 7. Open items — two need Erik, one needs the ustadz

- **ISC-417 / ISC-464(b) — WAITING ON THE USTADZ, not on Erik.** Only Ustadz Ahmad can meet ISC-417;
  he has a heads-up only. Two letters were SENT and both are unanswered — never write "Ustadz
  Ahmad's letter", he has sent nothing. Erik ruled 2026-08-21 that the always-answer change gets NO
  letter; the ID-key correction is still owed in whatever is sent next, which would be the THIRD.
- **ISC-554** — whether refused prose may ever be surfaced, and by which route.
- **Deploy** — nothing from this session is deployed; the probe is not shipped code, so there is
  nothing that NEEDS deploying. Deploys remain Erik's.

## 8. Every open ISC (17 open + 1 deferred; 584 total)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) · `ISC-353.0` · `ISC-417` ·
`ISC-419` · `ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` · `ISC-486` · `ISC-487` · `ISC-533` ·
`ISC-534` · **`ISC-552`** · **`ISC-554`** · **`ISC-558`** · **`ISC-559`**.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — verify a rule's SCOPE from its own code, never from a comment about it.** Two files and one
  handoff had `wordingShape` and `scriptureEchoShape` swapped. Read the docblock at the function and
  the split expression, not a reference to it elsewhere.
- **NEW — 35% / 96% (ISC-418) are CITE rates, not answered rates.** The ungrounded arm ANSWERS 46/46.
  Restating them as answered rates inverts the direction of every argument built on them.
- **NEW — an instrument encodes the contract it was written against.** After any behavioural change,
  ask what each probe would print if the change were REVERTED before citing its number.
- **NEW — brief write-capable agents against `git checkout`/`restore`/`stash`.** One destroyed the
  session's ISA work and reported it as a fabrication.
- **NEW — read an echo/guard count against its ELIGIBLE denominator.** A rule that cannot fire on a
  turn contributes a guaranteed zero.
- **A correction is the least-scrutinised edit.** Re-run `scholarly-gate` AFTER applying one.
- **A justification is a claim and gets audited like one.** Ask whether it is the flattering reading.
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Never record a declined gap as a PASSING test — a `- [x]` checkbox is the same artifact.**
- **Verify a deploy by SERVED BYTES and a remote SHA**; the first curl after a deploy reads stale.
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.**
- **Read the terminal reason from `gen.reason`, never `blockedBy`.** `gen.rule` names the CHECK.
- **Do NOT raise `MODEL_DEADLINE_MS`.** **Do NOT switch model.** **Do NOT build the echo union.**
- **Never `git add -A` in this repo** — it swept `WARP.md` in twice.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right.

---

# Next session — New-Quranku (checkpoint 2026-08-21 late)

> Prepended by /wrap 2026-08-21 (late). Anchor `c1b163a`. **Supersedes the `1ff4948` anchor.**
> That handoff's §1 (ID key), §4 (dalil-probe), §6 (letters), §7/§8 all SURVIVE UNCHANGED.
> Its §2 (echo union) and §3 (`gen.rule`) survive. **§5's §8 ruling is DONE.**

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-21 (late)**).

**Current state.** Gates green — `bun test` **1712/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 556 met / 13 open / 1 deferred = 570.** Clean tree except
untracked `WARP.md` — **leave it, and never `git add -A`** (it has been swept in twice).

**LIVE: worker `4339cb45`, from `c1b163a`.** The app now ALWAYS answers unless its own guard refuses.

---

## 1. THE ONE REMAINING GAP: 2–3 turns per run end `blocked` and repair cannot clean them

This is now the ONLY thing between the app and Erik's "it has to be answered". It is **not a
regression** — it was always there, hidden behind the deadlines that the provider pin removed.

`worker/src/answer-repair.ts` excises violating SENTENCES. These failures look like **whole-prose
violations** (`scriptureEchoShape` measures adjacency ACROSS the sentence split by design —
`answer-guard.ts:606`), which sentence excision cannot reach. **A different fix, not a tuning of this
one.** Read `gen.rule` on a blocked turn before designing anything; `own_wording` is pushed by TWO
checks and the kind alone cannot say which fired.

**DO NOT relax a guard rule to close this.** Erik kept every rule deliberately (2026-08-21): the
change was to the CONSEQUENCE of a violation, never its definition.

## 2. THE PROVIDER PIN IS A BET ON CIRCUMSTANTIAL EVIDENCE — re-measure before trusting it further

`OPENROUTER_ROUTING` in `worker/src/providers.ts` pins `quantizations:["fp8"]` + an `order` of the
four best-uptime endpoints. Measured paired: **unpinned 61% answered / 39% deadline → pinned 79% / 0%
deadline** over 24 turns.

**But OpenRouter's `uptime` measures ERRORS, and our failure was a silent timeout that may never
register as downtime.** The theory fits every symptom; it is not proven. The evidence is the paired
re-measure and nothing else. **Re-read the endpoints API before citing any uptime number** — it is a
live feed and the numbers in `PROGRESS.md` are a 2026-08-21 snapshot.

## 3. DO NOT switch model. The data no longer implicates it

`qwen/qwen3.7-flash` (1 provider, 100% uptime, ~21% cheaper) was researched and is on the table, but
the remaining 21% failure is OUR GUARD, not the provider. Switching now changes a variable the data
has cleared. Cost is unchanged today — same model, same price.

## 4. DO NOT BUILD THE ECHO-WALL UNION · 5. `gen.rule` IS READABLE · 6. `dalil-probe.ts` IS DEV-ONLY

All unchanged from the previous handoff.

## 7. THE ID-KEY HOLE STAYS BROKEN, DELIBERATELY

Machine Indonesian never renders on the answer card, Hadits search, or Fikih search —
`h.collection` is a display name, shards are keyed by slug. **Erik ruled: LEAVE IT.** Fixing it
switches on three surfaces the ustadz has never permitted while question 3 is unanswered. Cite the
fix by SYMBOL (`loadHadithIds(h.collection, h.book)`) — that line number rotted FOUR times.

**Do NOT justify it as "the state the 2026-08-17 letter promised"** (absolute, already false, since
retracted) **or as "widens a standing breach"** (the one live surface is the one he PERMITTED). Both
were BLOCKed by `scholarly-gate`.

## 8. TWO UNANSWERED LETTERS **TO** Ustadz Ahmad — and Erik ruled NO letter about this session

`tanya-ai-request-2026-08-17.md` (blocks ISC-417) and `ustadz-followup-2026-08-18.md` (blocks
ISC-464(b)). **Erik ruled 2026-08-21: the always-answer change gets NO letter** — recorded internally
only. The ID-key correction is still owed in whatever is sent next, which would be the **THIRD**
letter. Never write "Ustadz Ahmad's letter" — he has sent nothing.

## 9. Every open ISC (13 open + 1 deferred = 570)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** (uses a THIRD marker form, `- [DEFERRED-VERIFY]`; a
`[ ]`/`[x]` parser silently reports 569) · `ISC-323` (TOMBSTONED) · `ISC-353.0` · `ISC-417` ·
`ISC-419` · `ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` · `ISC-486` · `ISC-487` · `ISC-533` ·
`ISC-534`. **`ISC-418` is now `[~]` REVERSED** — not open work, not a live criterion.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — when a fix does not move the number, the DIAGNOSIS is wrong, not the dose.** The retry
  split was correct engineering and bought 8/12 → 7/12. A control arm (same questions, 20 s apart)
  is what proved the cause was elsewhere. Build the control before building the second fix.
- **NEW — read the provider's own API before recommending a model.** 18 upstreams, 3 degraded, and
  fp4/fp8/unknown quantization on ONE model id — none of it guessable from training data.
- **NEW — a derived bound composes, a hardcoded one fights.** `13_500` was right for the 25 s turn
  and wrong for the 20 s one; a cap and a retry floor must sum to the turn.
- **NEW — a fixture copied from the source under test cannot fail.** A fake guard counted distinct
  poisons not occurrences; a routing suite asserted its own literal instead of `resolveProvider`'s.
  Both passed. Force-red found both.
- **NEW — never `git add -A` in this repo.** It swept `WARP.md` in twice.
- **A correction is the least-scrutinised edit.** Re-run `scholarly-gate` AFTER applying one.
- **A justification is a claim and gets audited like one.** Ask whether it is the flattering reading.
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Ask what a probe would say if the feature were REVERTED, before citing its number.**
- **Never record a declined gap as a PASSING test — a `- [x]` checkbox is the same artifact.**
- **Verify a deploy by SERVED BYTES and a remote SHA**, rebuild at HEAD first, use a CONTROL.
- **The first curl after a deploy reads the STALE `index.html`.**
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.** Verify the INLINED literal.
- **Read the terminal reason from `gen.reason`, never `blockedBy`.** `gen.rule` names the CHECK.
- **Do NOT raise `MODEL_DEADLINE_MS`.** `MIN_RETRY_MS` is 11,500; the first attempt now reserves it.
- **A bare `curl` to `/api/answer` posts no grounding** — use a probe that runs `gatherGrounding`.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right.

---

# Next session — New-Quranku (checkpoint 2026-08-21)

> Prepended by /wrap 2026-08-21. Anchor `89f5720`. **Supersedes the `7660617` / `dd0982a` anchors.**
> From that handoff: **its §1 IS DONE — Erik approved the deploy and it is LIVE and verified.**
> **Its §3 is DISCHARGED** — `gen.rule` has now been read from a live deploy. **Its §5 IS RULED** —
> the §8 question was finally PUT and answered. Its **§2, §4, §6, §7, §8 survive unchanged.**

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-21**).

**Current state.** Gates green — `bun test` **1687/0** exit 0 · typecheck exit 0 · synthesis build
exit 0. **ISA 556 met / 13 open / 1 deferred = 570**, no checkbox moved. Clean tree except untracked
`WARP.md` — **leave it**.

**PROD NOW CARRIES THIS WORK.** Worker version **`ccb77595`** (was `b63b5300`). The rights leak is
CLOSED — verified by a paired before/after arm on the same `/api/dalil` query, and by 3 real cards
off `/api/answer` with `/api/dalil` as a live control.

---

## 1. THE ID-KEY HOLE IS REAL, RECORDED, AND MUST NOT BE FIXED

The machine Indonesian has **never rendered** on the answer card, Hadits search, or Fikih search.
`h.collection` is a DISPLAY NAME (`"Sahih Muslim"`); the shards are keyed by SLUG (`muslim`). The SPA
fallback returns `index.html` at **HTTP 200**, and **`loadHadithIds` catches its own failure**
(`web/src/hadith-id.ts:74-81`) and returns an empty file — **the call-site `catch` fires on ZERO
calls.** Get that mechanism right; the first write-up got it backwards.

**Erik ruled 2026-08-21: LEAVE IT BROKEN.** Fixing it **widens a standing breach from one surface to
four** while question 3 of the 2026-08-18 letter — which names these exact three surfaces — is
unanswered. `docs/review/rights-2026-08-21.md` ruling 6.

**TWO justifications were tried and BOTH were BLOCKed by `scholarly-gate`. Do not reach for either.**
1. *"the state the 2026-08-17 letter promised"* — that promise was ABSOLUTE, was already false when
   sent, and has been retracted. (And be exact: `:68` is a STATEMENT of state; the PROMISE is the
   *"Yang tidak kami lakukan"* list item at `:139`, and the retraction attaches to the list item.)
2. *"widens a standing breach from one surface to four"* — **the ONE surface is the Hadits browse
   page, which is the one surface the ustadz DID permit** (relayed 2026-08-12, rendering since
   **2026-08-13**, `f067bd2` — those are different dates and mixing them is its own defect). Calling
   his own permission a breach wrongs him.

The accurate form, which was available all along: it switches on **three surfaces he has never
permitted** — the exact three question 3 asks about.

The fix, when someone is allowed to make it: both `loadHadithIds(h.collection, h.book)` call sites —
`web/src/main.ts` and `hydrateMachineIndonesian` in `web/src/dalil-search.ts`. **Cited by SYMBOL on
purpose: that line number rotted FOUR times in four commits** (532 → 545 → 550), broken each time by
the very commit that wrote it, and the sweep missed the copies in the TABLES twice. There is no test
for this, on purpose.

## 2. DO NOT BUILD THE ECHO-WALL UNION. Erik's ruling stands. UNCHANGED

`run ≥ 4 OR shared ≥ 8` is measured and deliberately not built. Do not lower `ECHO_MIN_RUN` to 3.
Eight more answered turns were gathered this session; that is still not enough for a threshold.

## 3. `gen.rule` IS NOW READABLE — the §3 blocker is gone

First live reading, 8 turns: **`wording=2 · -=4 · hadith_unbacked=1`** — not a row of `-`. Terminal
`gen.reason` `deadline=3 · answered=2 · blocked=2`. **No rate is claimed from eight turns of one
run**, and none should be. `-` means "did not refuse", not "refused anonymously".

## 4. `dalil-probe.ts` IS DEV-ONLY AND STILL EMITS. UNCHANGED

Not routed from `index.ts`. Do not "fix" it into the shipped path.

## 5. §8 IS RULED — and the lesson is about WHO said it

Browse page stays (`docs/review/rights-2026-08-21.md` ruling 5). **The three-part basis was composed
by the DA and put to Erik as the option's stated reasoning; he SELECTED it.** Assent his, wording
not. Never quote it as his articulation. The `MAX_DISPLAY` cap stays EDITORIAL and the ruling does
not hand it a licensing basis back.

## 6. TWO UNANSWERED LETTERS **TO** Ustadz Ahmad. UNCHANGED — and now with a debt attached

- `docs/review/tanya-ai-request-2026-08-17.md` — SENT 2026-08-17. Blocks **ISC-417**; it is *this*
  one that forbids installing the God/unseen filter.
- `docs/review/ustadz-followup-2026-08-18.md` — SENT 2026-08-19, **EIGHT** questions. Blocks
  **ISC-464(b)**.

**NEW DEBT: the next letter is the THIRD, and the ID-key correction MUST be folded into it.** That
letter told him the machine Indonesian appears in EMPAT TEMPAT; three of the four never did. The
binding reminder is the appended status note. **Never write "Ustadz Ahmad's letter"** — they are
letters *to* him and he has sent nothing.

## 7. LIMIT 3 ON THE DIVINE WALL. UNCHANGED. 8. ISC-486 IS 120/120. UNCHANGED

## 9. Every open ISC (13 open + 1 deferred = 570)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** (note: it uses a THIRD marker form, `- [DEFERRED-VERIFY]`
— a `[ ]`/`[x]` parser silently drops it and reports 569) · `ISC-323` (TOMBSTONED) · `ISC-353.0` ·
`ISC-417` (his ANSWER) · `ISC-419` · `ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` (b blocked) ·
`ISC-486` · `ISC-487` · `ISC-533` · `ISC-534`.

---

## Constraints to honor (carried forward — plus four new)

- **NEW — a JUSTIFICATION is a claim and gets audited like one.** The gate BLOCKed on the *reason*
  for a decision, not on its facts. Every fact in ruling 6 was right; the sentence justifying it was
  false in our favour. Ask of any justification: is this the flattering reading?
- **NEW — read the mechanism, do not infer it from the outcome.** A measured outcome (0/2 vs 2/2)
  is consistent with several routes. The route was written from a glance and was backwards.
- **NEW — a single date over multiple surfaces reads in the flattering direction.** `e80ff9f` covered
  one of three; the other two were `734c577`, five days younger, on the date the letter regrets most.
- **NEW — a correction pass leaves residue, and the residue lives in the TABLES.** Two consecutive
  fixes updated the prose pointer and left the stale line in the same two summary tables. Sweep the
  whole tree with `rg` for the OLD string; never fix the sites you remember.
- **NEW — do not run `git add -A` in this repo.** It swept `WARP.md` in twice, once immediately after
  a `git rm --cached` in the same sequence, which made a commit message false as it was written.
  Stage named files.
- **NEW — three gate passes, three verdicts, and the second and third BLOCKed the FIX rather than the
  original.** Two findings were the exact failure the previous commit message claimed to have closed.
  Budget a gate pass AFTER every correction, and expect it to find something.
- **A correction is the least-scrutinised edit.** Re-run the gate AFTER applying it.
- **Name WHO permitted a thing and WHICH SURFACE.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **A measured set is not a class**, and a threshold from a set with ONE positive is not a threshold.
- **Ask what a probe would say if the feature were REVERTED, before citing its number.**
- **A question recorded as "waiting on Erik" may never have been ASKED.** Both put this session were
  answered in one exchange. §8 had sat "open" since the day before, not for fifteen handoffs.
- **Never record a declined gap as a PASSING test — a `- [x]` checkbox is the same artifact.**
- **Verify a deploy by SERVED BYTES and a remote SHA**, rebuild at HEAD first, and use a CONTROL.
- **The first curl after a deploy reads the STALE `index.html`.**
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.** Verify the INLINED literal.
- **Read the terminal reason from `gen.reason`, never `blockedBy`.** `gen.rule` names the CHECK.
- **Do NOT raise `MODEL_DEADLINE_MS`.**
- **The live theme classifier is NONDETERMINISTIC.**
- **A bare `curl` to `/api/answer` posts no grounding and returns `{"answer":null}` in 0.1s.** That is
  the no-grounding early return, NOT a broken deploy. Use `wall-live-probe`, which posts real
  grounding.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right.

---

# Next session — New-Quranku (checkpoint 2026-08-20 late-2)

> Prepended by /wrap 2026-08-20 (late-2). Anchor `dd0982a`, PUSHED. **Supersedes the `2f3c1d9` anchor.**
> From that handoff: its **§1 is RULED ON — Erik chose GATHER MORE TURNS, so the union is NOT built
> and must not be.** Its **§2 is DONE** — the `own_wording` bucket is split. Its **§3, §4, §5, §6,
> §7, §8 survive unchanged.** Its "open items" list is CLEARED except the ustadz's letter: the two
> rights questions and the gate offer were all put and all answered.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-20 (late-2)**).

**Current state.** Gates green — `bun test` **1687/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 556/570, no checkbox moved.** Clean tree except
untracked `WARP.md` — **leave it**. Hadith generator still STOPPED (1,746/14,736).

**PROD DOES NOT CARRY THIS SESSION'S WORK.** Prod is still worker `b63b5300`, bundle
`index-BjZH83ls.js`, from `9b6a5922`. **All work is PUSHED** — `origin/main` is at `dd0982a`,
verified by `git ls-remote`. Nothing is waiting to leave the machine; what is waiting is a DEPLOY.

---

## 1. ASK ERIK ABOUT DEPLOYING. This is item 1 and it is a question, not a task

**Pushed already** — do NOT re-push. `origin/main` is `dd0982a` (five commits: `6ede5cf`,
`881f2dd`, `57888be`, `24086a6`, `dd0982a`), confirmed against the remote. **Deploys are Erik's,
always** — never deploy without his word.

**The deploy decision is not neutral this time.** The rights fix (`publishedCardOf`) stops two public
endpoints serving the sunnah.com narration and the Muhsin Khan credit. That leak is LIVE on prod
right now. Erik withdrew the English on 2026-08-20 believing it had shipped; it half-shipped. Put
that plainly when you ask, and do not deploy without his word anyway.

## 2. DO NOT BUILD THE ECHO-WALL UNION. Erik ruled: gather more turns first

`run ≥ 4 OR shared ≥ 8` is measured and **deliberately not built**. Erik was given (a) ship now,
(b) gather more turns, (c) ship log-only, and **chose (b)**. The margin was 7-against-10 on eight
answered turns **with ONE positive** — a threshold measured on a set with one positive is not a
threshold. Do not lower `ECHO_MIN_RUN` to 3 either; that refuses a live good answer (measured,
force-red). What is wanted is MORE ANSWERED TURNS through the offline `scripture-echo` detector.

`gen.rule` now exists and is what makes that measurement attributable — see §3.

## 3. `gen.rule` IS ON THE WIRE BUT HAS NEVER BEEN READ FROM A LIVE DEPLOY

`wall-live-probe` prints the tally, and against TODAY's prod it will print **all `-`**, because prod
predates the field. That row means "the Worker is too old", NOT "no rule fired" — the probe says so
in a comment and you must not read it the other way. It becomes informative only after §1 deploys.

**It still does not make a bucket total evidence.** A whole-run total is not evidence on this
project. It makes a PAIRED arm constructible where one was not.

## 4. THE RIGHTS WALL COVERS TWO ROUTES; `dalil-probe.ts` IS DEV-ONLY AND STILL EMITS

`worker/src/dalil-probe.ts` emits `book_en`, `bab_en` and `translator`. It has its own wrangler
config and is **not routed from `index.ts`**, so it is out of scope for "neither rides the wire" —
noted in `docs/review/rights-2026-08-20.md` so a future grep does not read it as a contradiction.
Do not "fix" it into the shipped path.

## 5. THE OPEN RIGHTS QUESTION NOBODY HAS ASKED: §8 AND THE BROWSE PAGE

`MAX_DISPLAY` was reclassified as editorial precisely because two cards and a whole collection
cannot both be what sunnah.com About §8 permits. **The browse page publishes the entire Ṣaḥīḥayn.**
If §8 binds anything, it binds that — not a two-card cap. Recorded as open in
`docs/review/rights-2026-08-20.md`; **never put to Erik.** Put it.

## 6. DO NOT install the God/unseen filter. THERE ARE **TWO** UNANSWERED LETTERS, NOT ONE

Fourteenth handoff running, and every previous one named only one letter. Both are letters **TO**
Ustadz Ahmad — he has sent nothing, and no artefact from him exists.

- **`docs/review/tanya-ai-request-2026-08-17.md` — SENT 2026-08-17, UNANSWERED.** *This* is the one
  that forbids the God/unseen filter: *"Kami perlu tahu batas yang Ustadz anggap benar sebelum kami
  memasang aturan penyaringnya"* (`:52`). **ISC-417 stays NOT MET until he replies.**
- **`docs/review/ustadz-followup-2026-08-18.md` — SENT 2026-08-19, UNANSWERED.** It poses **EIGHT**
  numbered questions (`:244-261` nos. 1-5, `:310-316` nos. 6-8), not three. **ISC-464(b) is blocked
  on this one.** Its **question 3** is what the answer card's Indonesian currently runs on — Erik's
  own 2026-08-13 extension, not the ustadz's permission. Say it that way, everywhere, always (§9).
  Question 4 (bab titles) and question 7 (whether Muslim 154 / Bukhari 540-541 need a companion
  explanation) are also outstanding and have never appeared in a handoff.

**Never write "Ustadz Ahmad's letter."** The possessive conjures a written artefact from the scholar,
which is the one thing this project must not manufacture. They are letters *to* him.

## 7. LIMIT 3 ON THE DIVINE WALL IS STILL OPEN AND PRE-EXISTING. UNCHANGED

All 26 tokens in `AGENT_PRONOUN` ∪ `HUMAN_ROLE` still buy a bypass; HEAD passes them too. The
enumeration lists TAILS, not BODIES. Not pinned by a passing test, deliberately.

## 8. ISC-486 IS WORSE BY DESIGN; THE REDUCING PATH IS A PROPER-NAME VOCABULARY. UNCHANGED

120 of 120. The narrowing to 80 was tried and REVERTED. Blocker: `wordingShape` lower-cases.

## 9. THE ATTRIBUTION RULE THIS SESSION COST THREE GATE PASSES TO LEARN — READ THIS ONE

A new `docs/review` record and a new source comment both wrote *"the ustadz's VERBAL approval covers
DISPLAYING this Indonesian"* about the ANSWER CARD. The sent letter tells him, in terms, that this
surface is **Erik's** interpretation and that he was **never asked**. The record's own header said
*"Nothing on this page carries Ustadz Ahmad's authority"* — and §3 handed it to him four paragraphs
later. **The qualifier already existed eighty lines up in the same file; a correction removed it.**

Both are fixed. The rule: **whenever you write that something is permitted, name WHO permitted it
and WHICH SURFACE they permitted it on.** Erik extended the Hadits-page approval to the answer card
on 2026-08-13. That is his sentence, not the ustadz's, forever.

## 10. Every open ISC (13 open + 1 deferred = 570 total) — UNCHANGED

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) · `ISC-353.0` (superseded) ·
`ISC-417` (his ANSWER) · `ISC-419` (**wall deployed; misses at run 3; union parked per §2**) ·
`ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` (b blocked by §6) · `ISC-486` (§8) · `ISC-487` ·
`ISC-533` · `ISC-534`.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — an instrument pointed at the RENDERER cannot see a leak in the RESPONSE BODY.** The
  English withdrawal's evidence was a grep of the served client bundle; two public endpoints were
  still serving the narration as JSON. Ask WHERE the artifact you grepped comes from.
- **NEW — an exact-SET test cannot see a key that is PRESENT holding a sentinel.** `book: 0` reads
  as "no shard" and deletes the Indonesian; the set test passes either way. Where a value carries
  meaning, assert the VALUE and the CONSEQUENCE, not the key list.
- **NEW — prefer a compile error to a comment claiming a guarantee.** `book?: number` with `?? 0`
  re-armed the defect it fixed. Required types moved it to typecheck, where a probe can prove it.
- **NEW — name WHO permitted a thing and WHICH SURFACE.** See §9. A correct document header is no
  protection; the defect was four paragraphs below one.
- **NEW — a correction is the least-scrutinised edit, AND removing a qualifier is a correction.**
  Three passes; two BLOCKs were the previous pass's own fixes. Re-run the gate after applying.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **A measured set is not a class, and a threshold from a set with ONE positive is not a threshold.**
- **Ask what a probe would say if the feature were REVERTED, before citing its number.**
- **A question recorded as "waiting on Erik" may never have been ASKED.** Four were put this session
  and all four answered in one exchange. Check before carrying one forward again.
- **Never record a declined gap as a PASSING test — and a `- [x]` checkbox is the same artifact.**
- **Verify a deploy by SERVED BYTES and a remote SHA**, and rebuild at HEAD first. Read the WORKER
  BUNDLE, with CONTROLS — a grep that finds nothing may be a broken grep.
- **The first curl after a deploy reads the STALE `index.html`.**
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.** Verify the INLINED literal.
- **Read the terminal reason from `gen.reason`, never `blockedBy`.** `gen.rule` names the CHECK.
- **Do NOT raise `MODEL_DEADLINE_MS`.** `MIN_RETRY_MS` is 11,500 (`4a28bf2`).
- **The live theme classifier is NONDETERMINISTIC** — 0 themes on 23 of 24 turns.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned.** Stage paths deliberately. **Never Python**, including wrap parsers.
- **Force-red every new test**, and prefer disjoint mutations — one per load-bearing piece.
- **`--env synthesis` is GONE and must not be recreated.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **`MAX_DISPLAY = 2` did not move** and must not. Its basis is EDITORIAL (Erik, 2026-08-20); the
  canonical statement is the `MAX_DISPLAY` docblock and three other comments now point at it.
- **`h.english`, `translator`, `bab_en`, `book_en` must not be published.** They stay on the record
  and `english` stays in the model's user message.
- **The Fikih router may ONLY re-rank**, and `entries` stays gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **`docs/review/` sent letters are ARTEFACTS.** Append a dated status note below; never edit the
  sent text.

---

## Open items waiting on me (the user)

- **Deploy `dd0982a`?** The English leak is live on prod until you do. §1. (Pushed; not deployed.)
- **TWO letters TO Ustadz Ahmad are unanswered** (§6): 2026-08-17 blocks ISC-417 and forbids the
  God/unseen filter; 2026-08-19 blocks ISC-464(b) and has EIGHT open questions, of which no. 3 is
  what the answer card's Indonesian runs on. He has sent nothing — never call these "his letter".
- **sunnah.com §8 vs the BROWSE PAGE** (§5) — never asked, and it is the real §8 question.
- **More answered turns for the echo threshold** (§2) — you chose to gather before shipping.

# Next session — New-Quranku (checkpoint 2026-08-20 late)

> Prepended by /wrap 2026-08-20 (late). Anchor `2f3c1d9`. **Supersedes the `8df0330` anchor.** From
> that handoff: its **§1 is DONE** — the independent detector exists, is force-red verified, and has
> been run twice against live prod. Its **§2 is RULED ON and SHIPPED**. Its **§6 rights questions are
> BOTH RULED ON and shipped.** Its §3, §4, §5, §7 survive unchanged. Do not rebuild the detector or
> re-ask those three rulings.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-20 (late)**).

**Current state.** Gates green — `bun test` **1669/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 556/570, no checkbox moved.** Clean tree except untracked
`WARP.md` — **leave it**. **PROD IS CURRENT AND CARRIES THIS SESSION'S WORK**: worker `b63b5300` at
`9b6a5922`, page `db3207a6…`, bundle `index-BjZH83ls.js`, both byte-identical to local dist. Hadith
generator still STOPPED (1,746/14,736).

---

## 1. THE ECHO WALL IS LIVE AND IT MISSES THE VIOLATION IT WAS BUILT FOR. This is item 1

`scriptureEchoShape` refuses a sentence sharing ≥ 4 contiguous words with a shipped translation of a
grounded verse. On the FIRST post-deploy run, `apa keutamaan sedekah` shipped the same ayah and the
same `Dalam QS …, Allah menggambarkan …` construction at **run 3** and passed. Verified by running
the SHIPPED function on the SHIPPED prose — verdict `pass` — so **the deploy is sound and the RULE is
the problem.** Three variants are on record at runs 5, 3 and 2 and a reader cannot tell them apart.

**The reducing path is measured and deliberately NOT built.** Distinct shared content stems,
sentence-scoped against the posted translation, needs no corpus and no df table: missed violation
**10**, caught violation 7, best GOOD sentence **7**. So `run ≥ 4 OR shared ≥ 8` catches both and
spares everything measured. **The margin is 7 against 10 on eight answered turns and the nearest good
sentence — `Dalam QS Al-Isra 17:23, Allah menetapkan bahwa…` at 7 — is one step from refusal.**
Erik was given (a) ship the union now, (b) gather more turns first, and **has not answered**. Ask
before shipping; do not lower `ECHO_MIN_RUN` to 3, which refuses a live good answer (measured,
force-red).

## 2. `own_wording` IS ONE BUCKET FOR TWO CHECKS, SO THE WALL'S LIVE EFFECT IS UNATTRIBUTABLE

`wordingShape` and `scriptureEchoShape` both push `kind: "own_wording"`, deliberately (identical to a
reader) — but the probe reports the bucket and the Worker returns only `blocked: own_wording`, so
**no instrument can say which check fired.** Post-deploy `own_wording` was 5/24 against 4/24 before,
and that difference is NOT attributable to anything: run-to-run spread on identical code is already
documented at 46% vs 25%. Fixing this needs a distinct kind or the violation `detail` on the wire.
This is the blind-instrument shape a THIRD time; it was introduced by this session's own change.

## 3. LIMIT: THE WORKER SUPPLIES ONE TRANSLATION AND WE SHIP TWO

QS 17:32's violation runs **18 against the COMPANION and 2 against the PRIMARY**, and
`gatherGrounding` posts `primary ?? companion` — so that exact violation slips the wall today.
`EchoVerse.texts` is plural so the wall is ready; the WIRE is not. Carrying the companion means
adding `hash(ref, companion)` to the build-time grounding digest (`src/app/build-grounding-digest.ts`)
and verifying the second field separately — a browser-supplied one would let a caller weaken or trip
the wall. Deliberately not half-built.

## 4. DETECTOR BLIND SPOT, PINNED BY A PASSING TEST

An UNANCHORED paraphrase is invisible to `scripture-echo`: with no anchor the QS 2:261 paraphrase
ranks below an unrelated ayah sharing `tumbuh`. Anchors are prose citations ∪ `verseRefs`. The
verbatim sweep has no such gap. If `det.sweep(PARAPHRASE_2_261, 6)` ever stops returning empty, the
header's limit 1 is stale and must be rewritten before any number from it is trusted.

## 5. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Thirteenth handoff running. SENT 2026-08-19, **UNANSWERED**. ISC-464(b) is blocked on the ANSWER;
ISC-417 stays NOT MET until he replies.

## 6. LIMIT 3 ON THE DIVINE WALL IS STILL OPEN AND PRE-EXISTING

The adjacency stand-down fires INSIDE an epithet whenever an owner token sits at the tail, so all 26
tokens in `AGENT_PRONOUN` ∪ `HUMAN_ROLE` still buy a bypass; HEAD passes them too. Failing strings in
`ISA.md` under ISC-419 and in the guard docblock. The enumeration lists TAILS, not BODIES. Not pinned
by a passing test, deliberately.

## 7. ISC-486 IS WORSE BY DESIGN; THE REDUCING PATH IS A PROPER-NAME VOCABULARY

120 of 120. A narrowing to 80 was tried and REVERTED (it re-opened the divine bypass for pronoun
epithets, 18 over-refusals bought for 36 under-refusals). Blocker: `wordingShape` lower-cases the 160
chars before the quote, so capitalisation is unavailable.

## 8. A PRE-EXISTING FIXTURE PUTS THE PROPHET'S ﷺ WORDS IN A NAMED IMAM'S MOUTH

`web/src/answer-guard-wording.test.ts:163` — `Imam Nawawi … "sabar itu cahaya."` is وَالصَّبْرُ
ضِيَاءٌ, Ṣaḥīḥ Muslim 223. Recorded under ISC-419, deliberately not fixed; the row is INERT (3 words,
under `OWN_WORDING_MIN_WORDS`).

## 9. Every open ISC (13 open + 1 deferred = 570 total)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) · `ISC-353.0` (superseded) ·
`ISC-417` (his ANSWER) · `ISC-419` (**wall deployed; misses at run 3 — see §1**) · `ISC-420` ·
`ISC-440.6` · `ISC-454` · `ISC-464` (b blocked by §5) · `ISC-486` (§7) · `ISC-487` · `ISC-533` ·
`ISC-534`.

---

## Constraints to honor (carried forward — plus four new)

- **NEW — re-measure a discriminator at the WINDOW you will ship at.** Whole-prose, rare-word overlap
  separates and `run` does not; SENTENCE-scoped it inverts, because a four-word ayah is trivial to
  cover. The offline detector and the shipped wall correctly use OPPOSITE axes. Porting the probe's
  axis into the wall would have shipped a rule refusing closing du'as and passing the violation.
- **NEW — a threshold measured on a set with ONE positive is not a threshold.** "Four is the only
  value that separates this set" was true and useless; the next run produced a variant one word
  below. State how many POSITIVES the set contained, not just how many rows.
- **NEW — an absence from a grep is a fact about the grep.** Two patterns reported the guard wiring
  gone from the worker bundle; it was intact at line 3338. The bundle is multi-line and unminified.
- **NEW — a question recorded as "waiting on Erik" may never have been ASKED.** Two rights items sat
  six handoffs; put once with the contradiction and 2–3 options, both answered immediately. Check
  whether an item was ever put before carrying it forward again.
- **Ask what a probe would say if the feature were REVERTED, before citing its number.**
- **A measured set is not a class, and the gap is where the bias hides.** State the SET.
- **Re-run the gate AFTER applying its findings, every time.**
- **Never record a declined gap as a PASSING test — and a `- [x]` checkbox is the same artifact.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Verify a deploy by SERVED BYTES and a remote SHA**, and rebuild at HEAD first. Read the WORKER
  BUNDLE for wiring that defaults to a no-op — `guardAnswerProse`'s 4th arg defaults to `[]`.
- **The first curl after a deploy reads the STALE `index.html`** (did not fire this time; still warm up).
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.** Verify the INLINED literal.
- **Read the terminal reason from `gen.reason`, never `blockedBy`.**
- **Do NOT raise `MODEL_DEADLINE_MS`.** `MIN_RETRY_MS` is 11,500 (`4a28bf2`).
- **The live theme classifier is NONDETERMINISTIC** — 0 themes on 23 of 24 turns in BOTH runs today.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right. Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned.** Stage paths deliberately. **Never Python**, including wrap parsers.
- **Force-red every new test**, and prefer disjoint mutations — one per load-bearing piece.
- **`--env synthesis` is GONE and must not be recreated.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **`MAX_DISPLAY = 2` did not move** and must not; it is now documented as EDITORIAL, not licensing.
- **`h.english` must not be published.** It stays on the record and in the model's user message.
- **The Fikih router may ONLY re-rank**, and `entries` stays gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.

## Open items waiting on me (the user)

- **§1 — ship the `shared ≥ 8` union now, or gather more answered turns first?** Not answered.
- **Ustadz Ahmad's letter, SENT 2026-08-19, UNANSWERED** — blocks ISC-417 and ISC-464(b).
- **`bab_en` (English chapter titles) still render**, and `machine_id` was GENERATED FROM the English
  we just stopped publishing. Neither was covered by the `h.english` ruling; flagged, never asked.
- **`scholarly-gate` was NOT run** on this session's scripture/hadith changes — agent use is not
  invoked here unless Erik asks. Offer it before the next deploy.

---

# Next session — New-Quranku (checkpoint 2026-08-20)

> Prepended by /wrap 2026-08-20. Anchor `8df0330`. **Supersedes the `bcc963d` anchor.** From that
> handoff: its **§1 is DONE** — `bcc963d` + the new fix are DEPLOYED and re-measured. Its **§2 limit 1
> is NARROWED (not closed)**; its **§2 limit 2 (over-refusal) is WORSE, deliberately**; its **§3, §4,
> §5 and §6 all survive unchanged**. Do not re-derive the appositive work, the union rule, or the
> nine gate passes — all recorded under ISC-419 in `ISA.md`.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-20**).

**Current state.** Gates green — `bun test` **1642/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 556/570**, no checkbox moved. Clean tree except untracked
`WARP.md` — **leave it**. **PROD IS CURRENT**: `7556cfd` deployed, worker `b847f6eb`, bundle
`index-Da5Logen.js`, remote asset sha256 byte-identical to local dist. Hadith generator still
STOPPED (1,746/14,736).

---

## 1. BUILD A LEAK DETECTOR INDEPENDENT OF THE WALL. This is item 1 and it is the only thing that can close ISC-419

`wall-live-probe`'s `Leaks past the deployed wall (wordingShape on returned prose): 0` **cannot fail**.
`guardAnswerProse` calls `wordingShape` and IS the egress gate (`worker/src/index.ts:783`), so every
returned answer is clean by construction — the line prints 0 whether the fix shipped, were reverted,
or never existed. **Do not cite it. Do not re-run the same probe expecting different evidence.**

What is needed is a detector that does NOT share the wall's function: a second-model read over
answered prose, or a hand-built detector of the kind that caught the 2026-08-17 violation. **Force it
red first** — feed it the known 2026-08-17 violation string, which is quoted verbatim in ISA.md
under ISC-419, and confirm it fires before trusting a zero from it.

## 2. THE UNQUOTED-PARAPHRASE SEAM — Erik's ruling, not a coding task

The one non-circular read (n=1) found `apa keutamaan sedekah` shipping an **unquoted** close
paraphrase of QS 2:261 — *"satu biji yang ditanam, lalu tumbuh tujuh tangkai, dan setiap tangkai
berisi seratus biji"* — beside the app's own translation card for that ayah. `wordingShape` scans
QUOTED spans only, so this is outside the rule as written. **Whether it violates ISC-419's words or
only its spirit is Erik's call and was deliberately not decided.** Ask before building anything: a
rule reaching unquoted prose is a very different wall and would refuse far more.

## 3. LIMIT 3 IS OPEN, PRE-EXISTING, AND NOT A REGRESSION

The adjacency stand-down fires INSIDE an epithet whenever an owner token sits at the tail, so **all
26 tokens in `AGENT_PRONOUN` ∪ `HUMAN_ROLE`** still buy a bypass — HEAD passes them too. Failing
strings are in `ISA.md` under ISC-419 and in the guard docblock, with the eight tail shapes
enumerated. **The enumeration lists TAILS, not BODIES:** the result depends on the epithet body
clearing arm 1's forty characters, and the same tails on a short body are REFUSED. Deliberately NOT
pinned by a passing test.

## 4. ISC-486 GOT WORSE, DELIBERATELY, AND THE REDUCING PATH IS KNOWN

A bare scholar name was rescued on HEAD by any upstream owner token; the new arm ignores upstream
tokens — **120 of 120**. A narrowing that cut it to 80 was tried and REVERTED because it re-opened
the divine bypass for pronoun epithets (45 of 45; 18 over-refusals bought for 36 under-refusals).
**The reducing path is a proper-name vocabulary on the ownership test** — `scholarly-gate`
demonstrated it works with a green suite. Blocker: `wordingShape` lower-cases the 160 chars before
the quote, so capitalisation is unavailable and a hand-kept list is what remains (`Buya Hamka`,
`Quraish Shihab` carry no particle). Design question, not a correction.

## 5. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Twelfth handoff running. The letter is SENT (2026-08-19) and **UNANSWERED**. ISC-464(b) is blocked on
the ANSWER; ISC-417 stays NOT MET until he replies.

## 6. Two rights questions, STILL Erik's call, untouched for a SIXTH handoff

- Cards render `h.english` publicly while `hadith-id-approval-2026-08-12.md` records sunnah.com's
  terms as **"private research use"**. Never asked, never settled.
- `MAX_DISPLAY = 2` is defended as a licensing restraint while the browse page publishes the entire
  Ṣaḥīḥayn with machine Indonesian.

## 7. A PRE-EXISTING FIXTURE PUTS THE PROPHET'S ﷺ WORDS IN A NAMED IMAM'S MOUTH

`web/src/answer-guard-wording.test.ts:163` — `Imam Nawawi menjelaskan hal itu; beliau berkata,
"sabar itu cahaya."` That is وَالصَّبْرُ ضِيَاءٌ, Ṣaḥīḥ Muslim 223 (compiled by Muslim ibn
al-Ḥajjāj; Nawawi COMMENTED and anthologised it). Introduced by a correction pass in `e6aa468`.
**Recorded under ISC-419, deliberately not fixed** — and the row is INERT as well as wrong: the quote
is 3 words, under `OWN_WORDING_MIN_WORDS`, so all four rows in that `describe` (3, 2, 3, 1 words)
never reach attribution logic, and the docblock above them names a cause false for every one.

## 8. Every open ISC (13 open + 1 deferred = 570 total)

`ISC-98` · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) · `ISC-353.0` (superseded) ·
`ISC-417` (his ANSWER) · `ISC-419` (**deployed, re-measured, NOT MET — instrument is blind**) ·
`ISC-420` · `ISC-440.6` · `ISC-454` · `ISC-464` (b blocked by §5) · `ISC-486` (**worse, see §4**) ·
`ISC-487` · `ISC-533` · `ISC-534`.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — ask what a probe would say if the feature were REVERTED, before citing its number.**
  `wall-live-probe`'s leak line re-scans returned prose with the very function that gated it. It is
  structurally incapable of a non-zero result. This project has now hit the blind-instrument shape
  twice; the first was `eval:grounding` pinning the hadith predicate to `() => false`.
- **NEW — a measured set is not a class, and the gap is where the bias hides.** "CLOSED" was wrong
  three times in one change, and each time the set had been built so it could not show the failure:
  a cost probe with no upstream owner, epithets all comma-terminated, a denominator from a wider
  grid. State the SET, never the class, and say what the set excludes.
- **NEW — a mutation probe that cannot fail is the same artifact as a test that cannot fail.** Two
  arm-deletion probes reported all-zero because the edit never applied (bad `perl` escape, then
  stale line numbers deleting comments). **Derive line numbers by grep and ASSERT the target line
  contains `new RegExp` before deleting it.**
- **NEW — verify a substitution LANDED; do not report the intent.** A de-staling `perl` matched one
  of its two sites and was reported as applied; the criterion then carried three different pass
  counts at once. Grep for the new string after every edit.
- **NEW — a record that counts its own review passes is structurally one pass behind.** Write it as
  "at least N", never as a total or a verdict. Only a pass returning no blocking finding closes it,
  recorded afterwards with its date.
- **Re-run the gate AFTER applying its findings, every time.** Seven of eight classified BLOCKs this
  session were defects an earlier pass's own corrections introduced.
- **Never record a declined gap as a PASSING test — and a `- [x]` checkbox is the same artifact.**
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Verify a deploy by SERVED BYTES and a remote SHA**, and rebuild at HEAD first.
- **The first curl after a deploy reads the STALE `index.html` from the edge.** Observed again today.
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`.** Verify the INLINED
  `` return`synthesis` `` literal in the bundle, not a config grep.
- **Read the terminal reason from `gen.reason`, never `blockedBy`** — they disagree on ~10% of turns.
- **Do NOT raise `MODEL_DEADLINE_MS`.** `TIMEOUT_MS` (30 s, client) stays ABOVE it (25 s, Worker).
- **`MIN_RETRY_MS` is 11,500 (`4a28bf2`)**, bounded below the smallest successful retry budget.
- **The live theme classifier is NONDETERMINISTIC** — it returned no grounding for 4 of 6 questions
  in one capture run and 3 of 24 in the probe run. Never compare runs without a paired arm.
- **This ISA's `### Cycle` headings do not bound the criteria.** The TOTAL is right. Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned.** Stage paths deliberately. **Never Python**, including wrap parsers.
- **Force-red every new test**, and prefer disjoint mutations — one per load-bearing piece.
- **`--env synthesis` is GONE and must not be recreated.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **`MAX_DISPLAY = 2` did not move** — and must not, on an engineering argument.
- **The Fikih router may ONLY re-rank**, and `entries` stays gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect, echo `$?`, read separately.
- **Interceptor refs go stale after `navigate`** — re-read the tree before clicking send.
- **Routes and identifiers stay `hadis`** though the reader-facing label is **Hadits**.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it across all three markers.

---

# Next session — New-Quranku (checkpoint 2026-08-19 late-4)

> Prepended by /wrap 2026-08-19 late-4. Anchor `bcc963d`. **Supersedes the `8a16cbf`/`d69e297`
> anchor.** From that handoff: its **§1(a) — the appositive bypass — is CLOSED, committed, pushed,
> and NOT deployed**; its **§1(b), §2, §3, §4 and §5 all survive unchanged.** Do not re-derive the
> appositive reproduction, the union fix, or the five gate passes; all are closed and recorded under
> ISC-419 in `ISA.md`.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-19 (late-4)**).

**Current state.** Gates green — `bun test` **1624/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 556/570** (was 557; ISC-486 un-marked, see §2). Clean
tree except untracked `WARP.md` — **leave it**. **PROD IS NOW BEHIND MAIN IN A WAY THAT MATTERS**:
worker `da3031a7`, bundle `index-CWwCYulA.js` — it does NOT carry `bcc963d`, so the appositive
bypass is still open to readers. Hadith generator still STOPPED (1,746/14,736).

---

## 1. DEPLOY `bcc963d` AND RE-MEASURE. This is item 1 and it is Erik's call to run

The fix is committed and pushed and reaches nobody. Deploys are gated to Erik — ask, do not run it.
`web/dist` on disk is already a **synthesis** build at `bcc963d`, but **rebuild at HEAD first**
anyway (`VITE_ANSWER_MODE=synthesis bun run build` — that is the env var, **not** `EDITION`), verify
the inlined `` return`synthesis` `` literal is present exactly once, then verify the deploy by
**served bytes and a remote sha256**, never an exit code.

**Then re-measure ISC-419 on a FRESH sample.** One passing turn proves nothing: `apa hukum riba…`
was refused `own_wording` on two of its three turns in the last sample. The criterion cannot be
marked MET on the probe alone — the probe questions do not happen to produce long appositives.

## 2. TWO LIMITS ARE OPEN ON THE WALL, failing in OPPOSITE directions. ONE fix serves both

Both recorded under ISC-419 in `ISA.md`, both verified, **neither pinned by a passing test** — and
that is deliberate, see the constraint below.

- **UNDER-refusal.** `APPOSITIVE_BREAK` includes `HUMAN_ROLE`, whose entries (`orang`, `banyak`,
  `sebagian`, `catatan`) are ordinary words as well as roles. One planted inside an epithet ends the
  span early and the bypass reopens **for the nine loose verbs only**: `Allah, Tuhan yang menciptakan
  seluruh ORANG di muka bumi ini, melarang, "…"` passes; the same epithet without the noun REFUSES.
  **`berfirman` is airtight regardless** — `VERBATIM_DIVINE` needs no subject.
- **OVER-refusal.** Every bare proper name now refuses — **48 of 48** combinations: `Ibnu Katsir`,
  `Quraish Shihab`, `Buya Hamka`, `Al-Ghazali`, `Ibnu Taimiyah`, `gurunya`, `penulisnya`, `muridnya`.
  **This is why ISC-486 was un-marked `[x]` → `[ ]`** — it is now false for the commonest citation
  form in Indonesian religious prose. That flip is a judgement call Erik can overturn; the reasoning
  is in the criterion itself and rests on his own sent letter's *beserta syaratnya* convention.

**The fix for both is the same:** make the break ask whether the noun is near enough to the verb to
OWN it — `AGENT_BEFORE_VERB`'s question, already implemented in `muhammadSpeechAct`. It was
deliberately NOT built as a fifth correction inside one change. **A THIRD path neither limit covers
is PRE-EXISTING and will survive any fix aimed at the span:** `wordingShape` reads the 160 characters
before the quote and that window CROSSES SENTENCE BOUNDARIES, so `Allah berfirman … . Ibnu Katsir
menjelaskan bahwa "…"` refuses on HEAD too.

## 3. Hole (b) — the prophetic sub-8 seam — UNCHANGED, and still Erik's trade to fund

Eight verbatim verbs (`bersabda`, `berkata`, `mengatakan`, `menuturkan`, `menyampaikan`, `berpesan`,
`mengucapkan`, `bertutur`) uncaught under eight words. Caught at 8+ by `muhammadSpeechAct` +
`PROPHETIC`, untouched. **Read the SCOPE block above `VERBATIM_DIVINE` in `web/src/answer-guard.ts`
BEFORE touching it** — it records three failed attempts in full. The trade underneath: **`beliau
berkata` is the Prophet ﷺ or a named scholar depending on nothing the sentence contains.** Include
those verbs and the app refuses to quote scholars; exclude them and seven verbatim prophetic forms
pass. State that trade up front; do not discover it a fourth time.

## 4. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Eleventh handoff running. The letter is SENT (2026-08-19) and **UNANSWERED**, which does NOT unblock
this — question 3 commits us to learning his boundary first. **ISC-464(b) is blocked on the ANSWER**,
and ISC-417 stays NOT MET until he replies.

## 5. ISC-533 / ISC-534 survive, unchanged

**The stale-verdict hazard is OBSERVED**, 2 of 21 grounded turns: `blocked:"bad_hadith"` /
`blocked:"own_wording"` returned alongside `gen.reason:"deadline"`. Any `answer-blocked` copy must
read the terminal reason from **`gen.reason`**, never `blockedBy` — they disagree on ~10% of grounded
turns. ISC-534 (blocked copy is an ANNOTATION beside a fast answer, never a replacement) untouched.
**Do not raise `MODEL_DEADLINE_MS`.**

## 6. Two rights questions, STILL Erik's call, untouched for a FIFTH handoff

- The cards render `h.english` publicly while `hadith-id-approval-2026-08-12.md` records sunnah.com's
  terms as **"private research use"**. Never asked, never settled.
- `MAX_DISPLAY = 2` is defended as a licensing restraint while the browse page publishes the entire
  Ṣaḥīḥayn with machine Indonesian. The sent letter discloses the asymmetry; nobody has resolved it.

## 7. Every open ISC (13 open + 1 deferred = 570 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) ·
`ISC-353.0` (superseded, kept for the trail) · `ISC-417` (his ANSWER) · `ISC-419` (**fixed for
`berfirman`, committed, NOT deployed; open on §1 and §2**) · `ISC-420` (0 hits in 12 answered turns
across two runs, still n-small) · `ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454`
(deployed, block rate not re-measured) · `ISC-464` (b blocked by §4) · `ISC-486` (**NEWLY un-marked,
see §2**) · `ISC-487` (re-diagnosed, deliberately NOT MET) · `ISC-533` `ISC-534` (§5).

---

## Constraints to honor (carried forward — plus four new)

- **NEW — a SWAP is not a WIDENING, and the suite cannot see the difference.** Replacing a crude
  bound with a smarter predicate DELETES refusals the crude bound was making: `[^.!?]{0,40}` matched
  straight THROUGH an agent pronoun where the new span stops at one, and the swap silently deleted
  **six** refusals while `bun test` stayed 1616/0 green. **Union, never replacement** (ISC-440,
  stated in that same file). Prove supersetness with a **paired HEAD-vs-tree probe** —
  `git show HEAD:<path>` imported beside the tree — before writing any polarity claim, and never
  claim a polarity for a whole commit when only one half earns it.
- **NEW — the later gate passes are about the PROSE, and they matter as much.** Five passes: one
  BLOCK on the code, then four rounds of comments and ISA entries claiming more than the code does —
  a headline contradicted by its own limits paragraph, a control measured where nothing could fail, a
  rate whose denominator mixed the rescued class with the broken one, a corpus citation that could
  not have falsified the claim it was offered for. On this repo an overstated wall IS the failure the
  review record exists to catch. Keep going; they converge.
- **NEW — a fixture must never put words in a real mouth, and this file has now learned it THREE
  times.** A fabricated approval from the reviewer; then a hadith qudsi in an unnamed ustadz's mouth;
  then, in the correction to THAT, a fabricated fiqh ruling in Imam Nawawi's. Use a generic subject
  (`seorang mufti`, `penafsir itu`) — it exercises the same code. And check the LEAD clause too: one
  survived two corrections because attention went each time to the clause after the comma.
- **NEW — after flipping any ISA marker, grep every file for sentences asserting the old status.**
  Un-marking ISC-486 orphaned three, one of them the very block the checkbox points at.
- **Re-run the gate AFTER applying its findings, every time.** Six of this change's defects were
  introduced by an earlier pass's own corrections — at least one in every round, including the count
  of them. "All findings applied" is not "clean". Reproduce each finding yourself first.
- **Never record a declined gap as a PASSING test — and a `- [x]` checkbox is the same artifact.**
  Declined gaps go in `ISA.md` as open items with the failing string. A criterion MET for one class
  and false for another gets `- [ ]` plus the condition, never `- [x]` plus a caveat.
- **`MIN_RETRY_MS` is 11,500 (`4a28bf2`), bounded below the 11,554 ms smallest successful retry
  budget — NOT the p50.** Success arm n=5. ISC-536 stays in force.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Verify a deploy by SERVED BYTES and a remote SHA**, and rebuild at HEAD first.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **The synthesis env var is `VITE_ANSWER_MODE`, NOT `EDITION`** — a gate pass got this wrong and
  stamped `web/dist` principled. A plain `bun run build` leaves a PRINCIPLED dist while prod runs
  SYNTHESIS. Verify the INLINED literal (`` return`synthesis` ``) in the bundle, not a config grep.
- **This ISA's `### Cycle` headings do not bound the criteria** — attribution by document position is
  unreliable (the "Cycle 7 — recitation" heading carries 119 ISCs). The TOTAL is right. Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned.** Stage paths deliberately. **Never Python**, including wrap parsers.
- **Force-red every new test**, and prefer disjoint mutations — one per load-bearing piece.
- **`--env synthesis` is GONE and must not be recreated.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Neither moves.
- **`MAX_DISPLAY = 2` did not move** — and must not, on an engineering argument.
- **The Fikih router may ONLY re-rank**, and `entries` stays gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect, echo `$?`, read separately.
- **Interceptor refs go stale after `navigate`** — re-read the tree before clicking send.
- **Routes and identifiers stay `hadis`** though the reader-facing label is **Hadits**.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it across all three markers.

## Open items waiting on me (the user)

- **Deploy `bcc963d`** (§1) — the fix reaches no reader until you do.
- **Whether to fund the `AGENT_BEFORE_VERB` proximity fix** for §2's two limits, or leave both open.
- **Whether to overturn the ISC-486 `[x]` → `[ ]` un-marking** (§2).
- **Hole (b)** (§3) — whether to close it, and which side of the `beliau berkata` trade to pay for.
- **The two rights questions** (§6) — fifth handoff carrying these.
- **The Dorar Indonesian preface** — own letter, folded in, or left on the standing rights call?

---

# Next session — New-Quranku (checkpoint 2026-08-19 late-3)

> Prepended by /wrap 2026-08-19 late-3. Anchor `8a16cbf` (work in `d20f078`, `4a28bf2`, `0b9e8a9`,
> `e6aa468`, `5919078`, `4c3b9b0`, `226825c`). **Supersedes the `90bcde3` anchor.** From that
> handoff: its **§1 (deploy) is DONE**; its **§2 (the scholarly-gate pass) is DONE — three passes,
> three BLOCKs, all applied**; its **§4 (post-deploy ISC-419 re-measure) is DONE and the criterion
> is STILL OPEN for a different reason**; its **§3, §5 and §6 survive.** Do not re-derive the
> ISC-537 probe, the generation distribution, or the three gate passes; all are closed.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-19 (late-3)**).

**Current state.** Gates green — `bun test` **1609/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler --dry-run` exit 0. **ISA 557/570.** Clean tree except untracked `WARP.md` —
**leave it**. **PROD IS CURRENT AND MATCHES MAIN**: worker `da3031a7`, bundle `index-CWwCYulA.js`,
verified by served-bytes sha256 `66bd3671…`. Hadith generator still STOPPED (1,746/14,736).

---

## 1. TWO NAMED HOLES ARE OPEN IN THE WORDING WALL. Neither is a regression; both are tracked

Both were found by the gate, both verified by me, both deliberately NOT fixed on Erik's ship-narrow
call. **Do not mark ISC-419 met without closing (a).**

- **(a) The appositive bypass — SCRIPTURE side, and it is the blocker.** `VERBATIM_DIVINE` binds
  subject to verb within `[^.!?]{0,40}` and `DIVINE_ATTR` carries the SAME cap, so:
  `Allah, Tuhan semesta alam yang Maha Pengasih dan Maha Penyayang kepada kita, berfirman,
  "Bertakwalah kalian."` **passes at seven words AND at nine.** Not a sub-8 gap — a full bypass at
  any length, and it is the live riba violation with a longer subject phrase. Write that string into
  a failing test FIRST.
- **(b) The prophetic sub-8 seam.** Eight verbatim verbs (`bersabda`, `berkata`, `mengatakan`,
  `menuturkan`, `menyampaikan`, `berpesan`, `mengucapkan`, `bertutur`) are uncaught under eight
  words. Caught at 8+ by `muhammadSpeechAct` + `PROPHETIC`, untouched.

**Read the SCOPE block above `VERBATIM_DIVINE` in `web/src/answer-guard.ts` BEFORE touching either.**
It records three failed attempts in full. The trap underneath (b): **`beliau berkata` is the Prophet
ﷺ or a named scholar depending on nothing the sentence contains.** Include those verbs and the app
refuses to quote scholars; exclude them and seven verbatim prophetic forms pass. That trade is its
own decision and needs stating up front, not discovering a fourth time.

## 2. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Tenth handoff running. The letter is SENT (2026-08-19) and **UNANSWERED**, which does NOT unblock
this — question 3 commits us to learning his boundary first. **ISC-464(b) is blocked on the ANSWER**,
and ISC-417 stays NOT MET until he replies.

## 3. ISC-533 / ISC-534 survive, and 533's evidence base changed

**The stale-verdict hazard is OBSERVED**, 2 of 21 grounded turns: `blocked:"bad_hadith"` /
`blocked:"own_wording"` returned alongside `gen.reason:"deadline"`. Any `answer-blocked` copy must
read the terminal reason from **`gen.reason`**, never `blockedBy` — they disagree on ~10% of grounded
turns. ISC-534 (blocked copy is an ANNOTATION beside a fast answer, never a replacement) untouched.
**Do not raise `MODEL_DEADLINE_MS`.**

## 4. Two rights questions, STILL Erik's call, untouched for a fourth handoff

- The cards render `h.english` publicly while `hadith-id-approval-2026-08-12.md` records sunnah.com's
  terms as **"private research use"**. Never asked, never settled.
- `MAX_DISPLAY = 2` is defended as a licensing restraint while the browse page publishes the entire
  Ṣaḥīḥayn with machine Indonesian. The sent letter discloses the asymmetry; nobody has resolved it.

## 5. Every open ISC (12 open + 1 deferred = 570 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED) ·
`ISC-353.0` (superseded, kept for the trail) · `ISC-417` (his ANSWER) · `ISC-419` (**deployed,
re-measured clean, still open on §1a**) · `ISC-420` (0 hits in 12 answered turns across two runs, but
still n-small) · `ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (deployed,
block rate not re-measured) · `ISC-464` (b blocked by §2) · `ISC-487` (re-diagnosed, deliberately NOT
MET) · `ISC-533` `ISC-534` (§3).

---

## Constraints to honor (carried forward — plus five new)

- **NEW — re-run the gate AFTER applying its findings.** Three passes on one change; **two of the
  three BLOCKs were defects my own corrections introduced.** "All findings applied" is not "clean".
  And reproduce each finding yourself before acting — the gate is another model.
- **NEW — never record a declined gap as a PASSING test.** A green test is read as a satisfied
  requirement and its comment second, if at all. That artifact is exactly what let the original
  violation ship. Declined gaps go in `ISA.md` as open items with the failing string.
- **NEW — a cost check that samples only the half you did not break is not a cost check.** Pass 2's
  eight regressions were invisible because the new cost block contained zero prophetic cases.
- **NEW — `muhammadSpeechAct` is the RECEIPT instrument, not a verbatim one.** Its verb set carries
  the topical stems on purpose. Reusing it for a wording rule inverts the seam.
- **NEW — a fixture must never put words in a real scholar's mouth.** One named the reviewer and had
  him grant permission he has not granted. No reader could see it; it was still a record injury.
- **`MIN_RETRY_MS` is 11,500 (`4a28bf2`), bounded below the 11,554 ms smallest successful retry
  budget — NOT the p50.** Success arm n=5. ISC-536 stays in force: move it again only against a
  fresh distribution with a bigger success arm.
- **A whole-run bucket total is NOT evidence.** Three runs this session: 29%, 41%, 21% answered, with
  one deploy among them. Only a PAIRED arm, or a row only the change could emit.
- **Verify a deploy by SERVED BYTES and a remote SHA**, and rebuild at HEAD first — the dist on disk
  can be a commit behind, which makes build-meta name the wrong commit.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (`` return`synthesis` ``) in the bundle, not a config grep.
- **This ISA's `### Cycle` headings do not bound the criteria** — 150 ISCs sit BEFORE the first
  heading. The TOTAL is right; per-cycle attribution is not. Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned.** Stage paths deliberately. **Never Python**, including wrap parsers.
- **Force-red every new test**, and prefer two disjoint mutations over one.
- **`--env synthesis` is GONE and must not be recreated.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Neither moves.
- **`MAX_DISPLAY = 2` did not move** — and must not, on an engineering argument.
- **The Fikih router may ONLY re-rank**, and `entries` stays gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect, echo `$?`, read separately.
- **Interceptor refs go stale after `navigate`** — re-read the tree and confirm `#q`'s value landed
  before clicking send; a silent type failure looks exactly like a submit that did nothing.
- **Routes and identifiers stay `hadis`** though the reader-facing label is **Hadits**.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it across all three markers.

## Open items waiting on me (the user)

- **§1 — which hole, if either, to close**, and whether to fund the `beliau berkata` trade properly.
- **The two rights questions** (§4) — public English text under "private research use", and the
  `MAX_DISPLAY = 2` asymmetry. Fourth handoff carrying these.
- **The Dorar Indonesian preface** — own letter, folded in, or left on the standing rights call?

---

# Next session — New-Quranku (checkpoint 2026-08-19 late-2)

> Prepended by /wrap 2026-08-19 late-2. Anchor `90bcde3` (work in `77737aa`, `143323a`,
> `d20f078`, `4a28bf2`, `15dc044`). **Supersedes the `707f8bb` anchor.** From that handoff: its
> **§2 (the letter) is CLOSED — Erik sent it**; its **§3 (ISC-537) is MET**; its **§4 (ISC-533/535/
> 536) is HALF CLOSED — 535 and 536 are MET, 533 and 534 survive**; its **§1, §5 and §6 survive.**
> Do not re-derive the ISC-537 probe, the generation distribution, or the ISC-323.3 rerank
> measurement; all three are closed.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-19 (late-2)**).

**Current state.** Gates green — `bun test` **1597/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler deploy --dry-run` exit 0. **ISA 557/570** across all three markers. Clean tree
except untracked `WARP.md` — **leave it**. **PROD IS UNCHANGED and is now BEHIND main in a way that
matters**: worker `cfb0b05d`, bundle `index-hqD14U2e.js`. Two reader-facing fixes are committed and
unreachable. Hadith generator still STOPPED (1,746/14,736).

---

## 1. DEPLOY IS ITEM ONE, and until it happens prod is actively wrong in two ways

Not a tidy-up. Both of these are measured, live, reader-facing:

- **Prod prints hand-written ayah wording.** `d20f078` fixes it. Until deployed, `wordingShape`
  still waves through any ≤7-word quote after `Allah berfirman` — measured, one shipped answer.
- **Prod still admits 6-second retries.** `4a28bf2` raises `MIN_RETRY_MS` to 11,500. Until deployed,
  turns keep paying for retries that the distribution says will not finish.

Deploys are Erik's. **Verify by SERVED BYTES and a remote SHA, never by the command's exit code**,
and the first curl after a deploy reads the STALE `index.html` from the edge.

## 2. A `scholarly-gate` pass on `d20f078` is OUTSTANDING and should precede the deploy

The change narrows what the app will print about scripture and the Prophet ﷺ — exactly that gate's
subject. It was not run because this session's harness config forbade spawning agents unsolicited.
**Ask Erik before running it, then run it before he ships.** Note the standing lesson: re-run the
gate AFTER applying its findings — a correction is an edit with LESS scrutiny than what it replaces.

## 3. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Ninth handoff running. **The letter is now SENT (2026-08-19), which does NOT unblock this** —
question 3 commits us to learning the ustadz's boundary before installing the filter, and
**ISC-464(b) is blocked on the ANSWER**. ISC-417 likewise stays NOT MET until he replies.

## 4. ISC-419 needs a POST-DEPLOY re-measure, and one passing turn will not do

`apa hukum riba…` was refused `own_wording` on two of its three turns in the same 24-turn sample
that caught the violation, so a single clean turn proves nothing. Re-run
`bun run src/eval/wall-live-probe.ts --repeat 3` against the deployed fix and read the answered
prose, not just the bucket count.

## 5. ISC-533 / ISC-534 survive, and 533's evidence base changed today

**The stale-verdict hazard is now OBSERVED**, 2 of 21 grounded turns: `blocked:"bad_hadith"` /
`blocked:"own_wording"` returned alongside `gen.reason:"deadline"`. So `answer-blocked` copy must
read the terminal reason from **`gen.reason`**, never from `blockedBy` — the two disagree on ~10% of
grounded turns. ISC-534 (blocked copy is an ANNOTATION beside a fast answer, never a replacement) is
untouched. **Do not raise `MODEL_DEADLINE_MS`.**

## 6. Two rights questions, STILL Erik's call, untouched for a third handoff

- The cards render `h.english` publicly while `hadith-id-approval-2026-08-12.md` records sunnah.com's
  terms as **"private research use"**. Never asked, never settled.
- `MAX_DISPLAY = 2` is defended as a licensing restraint while the browse page publishes the entire
  Ṣaḥīḥayn with machine Indonesian. The sent letter discloses the asymmetry; nobody has resolved it.

## 7. Every open ISC, so none is invisible (12 open + 1 deferred = 570 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED —
do not build against it) · `ISC-353.0` (superseded, kept for the trail) · `ISC-417` (ustadz sign-off
— his ANSWER, letter now sent) · `ISC-419` (**re-measured 2026-08-19 and STILL VIOLATED**; fix
committed, needs deploy + §4) · `ISC-420` (0 hits in 7 answered turns, but n=7 — not enough to
close) · `ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (deployed, block rate
NOT re-measured) · `ISC-464` (b blocked by §3) · `ISC-487` (re-diagnosed, deliberately NOT MET) ·
`ISC-533` `ISC-534` (§5).

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a test fixture can teach the suite to expect the bug.** The 8-word floor's own test used
  `Allah berfirman "…seven words"` and asserted it passes. To test a threshold, hold every OTHER
  variable at its most permissive. When a test names a numeric boundary, read what else its fixture
  asserts.
- **NEW — fix a bad bound by splitting on MEANING, not by moving the number.** 8→7 buys one word and
  re-makes the error. A bound set from the smallest violation seen so far holds only until a smaller
  one arrives.
- **NEW — a criterion citing an instrument is not evidence the instrument can answer it.** ISC-535
  and ISC-536 both named `wall-live-probe` while it dropped `gen` on the floor. Diff the FIELDS a
  criterion needs against the fields the probe parses, before running it.
- **NEW — exclude `outcome:"threw"` from any completion percentile.** It was cut off at budget, so
  it measures the deadline, not the work. And `row.ms` (whole-POST wall-clock) is not a substitute
  for per-attempt `gen.attempts[].ms`.
- **NEW — three turns cannot contain a two-attempt shape.** I wrote "hazard unobserved" into the ISA
  off a 3-turn probe and a 24-turn run falsified it within the hour. Say "not sampled", not "not
  present".
- **`MIN_RETRY_MS` is 11,500 as of `4a28bf2`, bounded below the 11,554 ms smallest successful retry
  budget — NOT set at the p50.** The success arm is n=5 and the two runs disagree (29% vs 41%
  answered, `ok` p50 11,468 vs 8,677) with no deploy between. ISC-536 stays in force: move it again
  only against a fresh distribution with a bigger success arm.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could
  emit. Two runs this session differed by 12 points with nothing changed between them.
- **This ISA's `### Cycle` headings do not bound the criteria** — 150 ISCs sit BEFORE the first
  heading and nine live past `## Test Strategy`. The TOTAL is right; per-cycle attribution is not.
  Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned in this repo.** Stage paths deliberately.
- **Never Python** — including the wrap's own parsers. TypeScript/bun for every script.
- **Force-red every new test.** It caught the ISC-419 fix's real coverage this session.
- **`--env synthesis` is GONE and must not be recreated** — see the tombstone in `worker/wrangler.toml`.
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal, not a config grep.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Neither moves.
- **`MAX_DISPLAY = 2` did not move** — and must not, on an engineering argument.
- **The Fikih router may ONLY re-rank**, and `entries` must stay gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect, echo `$?`, read separately.
- **Interceptor refs go stale after `navigate`** — re-read the tree, and confirm `#q`'s value landed
  before clicking send; a silent type failure looks exactly like a submit that did nothing.
- **Routes and identifiers stay `hadis`** even though the reader-facing label is **Hadits**.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it across all three markers.

## Open items waiting on me (the user)

- **Deploy** (§1) — two measured reader-facing defects are fixed on main and unreachable.
- **Authorise the `scholarly-gate` pass on `d20f078`** (§2) — it should precede the deploy.
- **The two rights questions** (§6) — public English text under "private research use", and the
  `MAX_DISPLAY = 2` asymmetry. Third handoff carrying these.
- **The Dorar Indonesian preface** — own letter, folded in, or left on the standing rights call?
  ISC-538 is met on the writing requirement but this decision is still open.

---

# Next session — New-Quranku (checkpoint 2026-08-19 late)

> Prepended by /wrap 2026-08-19 late. Anchor `707f8bb` (work in `18e3e36`, `6e837a6`, `6d4d909`,
> `712558a`). **Supersedes the `6ad6f69` anchor.** From that handoff: its **§2 (ISC-538) is
> DISCHARGED** — Erik chose keep-as-drafted; its **§3 (the letter) had THREE more gate passes and is
> still DRAF**; its **§5 deploy question is ANSWERED and SHIPPED**; its **§7 ("Gustaf") is CLOSED —
> Erik had the name deleted**; its **§1, §4, §6 and §8–13 survive.** Do not re-derive the ISC-323.3
> rerank measurement, the ISC-493 floor, or the ISC-487 clock re-diagnosis; all three are closed.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-19 (late)**).

**Current state.** Gates green — `bun test` **1593/0** exit 0 · typecheck exit 0 · synthesis build
exit 0 · `wrangler deploy --dry-run` exit 0. **ISA 553/570** across all three markers. Clean tree
except untracked `WARP.md` — **leave it**. **PROD IS CURRENT AND AHEAD OF WHERE IT WAS**: worker
`cfb0b05d`, bundle `index-hqD14U2e.js`, verified by served bytes. **`new-quranku-ai` NO LONGER
EXISTS** — Worker deleted, `[env.synthesis]` tombstoned, DNS record deleted. Hadith generator still
STOPPED (1,746/14,736 — the sidecar is 14,655, a different number; see the letter).

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Eighth handoff running. The letter's question 3 commits us to learning the ustadz's boundary BEFORE
installing the filter. **ISC-464(b) is blocked on the ANSWER, not the send.**

## 2. The letter is DRAF, had SIX gate passes, and I did NOT certify it clean

`docs/review/ustadz-followup-2026-08-18.md`, **BELUM DIKIRIM**. Six `scholarly-gate` passes, six
BLOCKs, **no finding repeated**. Erik said "read it" — that is his next action, not another pass.

**Do not simply run a seventh pass and call it done.** The gate stopped being a proofreader around
pass 4 and became a discovery instrument: each pass found a reader-facing SURFACE nobody had
enumerated, and each new surface falsified a sentence written about the earlier ones. My standing
recommendation, not yet accepted: **build a one-time inventory of every reader-facing surface that
touches hadith or scholarship** — text layer, bab layer, kitab names, surah preface, answer prose,
search cards, answer cards — and write the letter from the inventory instead of patching it.

## 3. ISC-537 is now RUNNABLE and was not run

The deploy it was gated on has happened. Drive a **refused** turn past 9 s through Interceptor and
confirm the "masih menyusun" line is gone once the turn settles. Constraints: sample the whole
window at 2 s (not at settle), and read the `/api/answer` RESPONSE — the renderer strips markers.

## 4. ISC-533 / ISC-535 / ISC-536 — now have a live distribution available, still not moved

ISC-532's `gen:{attempts,reason}` is live on prod. **It is a FREQUENCY instrument, not a forcing
function** — ask what it would print if the feature were reverted; the answer is "the same thing".
ISC-536 still forbids moving `MIN_RETRY_MS` before a live distribution EXISTS. It can now be
collected. Do not raise `MODEL_DEADLINE_MS`.

## 5. Two rights questions surfaced by pass 6 and NOT acted on — Erik's call

- The cards render `h.english` publicly, while `hadith-id-approval-2026-08-12.md` records sunnah.com's
  terms as **"private research use"**. Never asked, never settled.
- `MAX_DISPLAY = 2` is defended as a licensing restraint while the browse page publishes the entire
  Ṣaḥīḥayn with machine Indonesian. The letter now discloses that asymmetry; nobody has resolved it.

## 6. Every open ISC, so none is invisible (15 open + 2 deferred = 570 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323` (TOMBSTONED —
do not build against it) · `ISC-353.0` (superseded, kept for the trail) · `ISC-417` (ustadz sign-off
— his ANSWER) · `ISC-419`/`ISC-420` (fixed at ingestion; now DEPLOYED but NOT re-measured) ·
`ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (deployed, block rate NOT
re-measured) · `ISC-464` (b blocked by §1) · `ISC-487` (re-diagnosed, deliberately NOT MET) ·
`ISC-533` `ISC-534` `ISC-535` `ISC-536` (§4) · `ISC-537` **`[DEFERRED-VERIFY]`** (§3) · `ISC-538`
(DISCHARGED as a decision; criterion still open pending the send).

---

## Constraints to honor (carried forward — plus six new)

- **NEW — a grep can report a false ABSENCE.** A source template literal that wraps across lines is
  carried into the bundle WITH its newline and indentation, so a long single-line pattern cannot
  match. Grep short fragments that cannot straddle a break, and treat 0 on a long phrase as unproven.
- **NEW — a correction is an edit too, and has had LESS scrutiny than what it replaces.** Two of pass
  5's blocking findings were defects introduced by applying pass 4's fixes. Re-run the gate AFTER
  applying its findings; "all findings applied" is not "clean".
- **NEW — hand-typed grounding does not verify.** `verifyGrounding` hashes (ref, text) against
  `grounding-digest.json` and FAILS CLOSED, so a forged `/api/answer` payload returns the same bare
  `{"answer":null}` a broken deploy would. Build it from `groundingTextOf(v)` and assert IN-DIGEST
  first. `worker/smoke-answer.ts`'s Al-Ikhlas payload is one of these.
- **NEW — deleting a host CREATES an exposure.** Once its DNS is gone the name is unclaimed, so any
  allowlist still trusting it is a standing grant to whoever registers it next. Audit every allowlist.
- **NEW — removing a surface can make a check UNFAILABLE rather than failing.** A smoke assertion
  that passes when the request throws goes green against a deleted host.
- **NEW — a test may pin what copy must NOT claim, never a WORLD-FACT.** Nothing re-derives a
  world-fact. Ask which file could falsify the assertion without touching the test.
- **An environment that is never deployed is a time capsule of every defect fixed since.**
- **This ISA's `### Cycle` headings do not bound the criteria** — nine ISCs live past
  `## Test Strategy`. The TOTAL is right; the final rows' attribution is not. Do not "fix" it.
- **The ISA has THREE checkbox markers** — `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned in this repo.** Stage paths deliberately.
- **Never Python.** TypeScript/bun for every script, including the wrap's own parsers.
- **Force-red every new test.** It caught defects in three separate sessions now.
- **`--env synthesis` is GONE and must not be recreated** to "restore" anything — see the tombstone
  in `worker/wrangler.toml`.
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (\`return\`synthesis\`\`), not a config grep.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Neither moves.
- **`MAX_DISPLAY = 2` did not move** — and must not, on an engineering argument.
- **The Fikih router may ONLY re-rank**, and `entries` must stay gated on `verses.length === 0`.
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect, echo `$?`, read separately.
- **Routes and identifiers stay `hadis`** even though the reader-facing label is **Hadits**.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it across all three markers.

## Open items waiting on me (the user)

- **Read the letter** (§2) — `docs/review/ustadz-followup-2026-08-18.md`. Then: send, or commission
  the surface inventory first?
- **The two rights questions** (§5) — public English text under "private research use" terms, and
  the `MAX_DISPLAY = 2` asymmetry.
- **ISC-419/420/454 re-measurement** (§6) — all three now say "not until deployed"; it IS deployed.

---

# Next session — New-Quranku (checkpoint 2026-08-19 early)

> Prepended by /wrap 2026-08-19 early. Anchor `6ad6f69` (work in `abaaed7`, `b4cb3cd`, `3f37c53`,
> `6ad6f69`). **Supersedes the `23ee51b` anchor.** From that handoff: its **§2 (ISC-323.4) is
> DISCHARGED — Erik chose tombstone-and-ask**; its **§3 (ISC-487) was WORKED and RE-DIAGNOSED**; its
> **§6 (the ustadz note) is DRAFTED, not sent.** Its **§1, §4, §5, §7, §8 and §9–13 survive verbatim.**
> **Do not re-derive the ISC-323.3 rerank measurement or the ISC-493 floor; both are closed.**

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-19 (early)**).

**Current state.** Gates green — `bun test` **1593/0** exit 0 · typecheck exit 0 (all five passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 546/563**, computed across all three markers.
Clean tree except untracked `WARP.md` — **leave it**. **PROD IS UNCHANGED** (worker `4bf633a2`,
bundle `index-KFCMiW0O.js`) and **nothing shipped this session** — but unlike last session, prod is
now BEHIND main in a way that matters: the ISC-529 fix and the ISC-532 diagnostic are both committed
and both unreachable by a reader until Erik deploys. Hadith generator still STOPPED (1,746/14,736).

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried verbatim for the seventh handoff running, because it is the item most likely to be
"unblocked" by someone reading a stale line. The letter's question 3 commits us to learning the
ustadz's boundary BEFORE installing the filter. **ISC-464(b) is blocked on the ANSWER, not the send.**

## 2. ISC-538 — the FOURTH surface. NEW, and the most consequential open item. ERIK'S CALL

The scholarly gate's third pass found a reader-facing surface nobody had named in three review
passes. `web/src/surah-intro.ts:205-229` offers a reader-selectable **"Bahasa Indonesia"** tab on the
surah preface. Verified in the **BUILT** artefact, not just source: all **114** `web/dist/surah-intro/*.json`
carry `editions.id` with `translation:"ai"`, `reviewStatus:"unreviewed"`,
`reviewerNeeded:"Ustadz Ahmad Isrofiel"` — and **61 of the 114 contain prophetic-speech markers**
(`bersabda`/`Rasulullah`), some inside quotation marks, alongside quotations attributed to **named
imams**. Its own generator banner reads *"jangan disajikan ke pengguna sebelum ditinjau Ustadz Ahmad
Isrofiel"*; `surah-intro.ts:166-170` records that Erik chose to offer it anyway.

**Dorar is `usage: private` under different terms from sunnah.com, so ONE APPROVAL CANNOT SPAN BOTH.**

Why it hid: `hadith-card.ts:12-13` and `PROGRESS.md:2463` both still said that AI rendering "was
refused" for this preface. That was reversed 2026-08-08. **The code comment is corrected; PROGRESS.md
is append-only and keeps its entry as history.** A memory said the same wrong thing and is corrected.

**Already applied to the letter:** the question is bounded in writing to the Bukhari/Muslim corpus, the
fourth surface is DISCLOSED, and the letter states the ustadz's answer will not be applied to it.
**Undecided and needs Erik:** own letter, folded in, or standing on his existing rights call?

## 3. The ustadz letter is a DRAFT and I did NOT call it clean

`docs/review/ustadz-followup-2026-08-18.md`, marked **BELUM DIKIRIM**. `scholarly-gate` blocked it
**three times and found something new on every pass** — 4 blocking, then 1, then 2. Every finding was
real and all are applied. **A fourth pass is likely to find more; run one before Erik sends.** Do not
report it as ready.

What it now does: retracts THREE false claims in the sent 2026-08-17 letter (two sentences plus a
written undertaking in its "Yang tidak kami lakukan" list, which is the binding register); separates
the Hadits tab (the ustadz's, verbal+relayed) from the Fikih tab and answer card (**Erik's own
2026-08-13 ruling** — never write these up as the ustadz's); states `MAX_DISPLAY = 2` is a licensing
position his answer cannot move, BEFORE asking him which hadith should lead; states that in production
Muslim 154 is **absent from the pool**, not rank 3 (rank 3 was the rejected arm); discloses the scale
change 1,746 → 14,655 of 14,736; and discloses that the measured meaning-alteration defect is from the
**bab-title** layer while the hadith-text layer has **no measured error rate at all**.

## 4. ISC-487 — RE-DIAGNOSED, and the criterion was measuring the wrong clock

**`FAST_ANSWER_MS = 9000` means the reader NEVER waits 26 seconds.** They hold a real cited principled
answer at 9 s and it upgrades in place. Confirmed on the DEPLOYED bundle (`var Il=9e3`). The turn
clock and the reader clock diverged at ISC-466 and every reading since conflated them. **Do not
re-derive this and do not go back to chasing turn duration.**

Still NOT MET, deliberately. Two levers remain and BOTH are gated on deploying ISC-532:
- **ISC-533** — the `answer-blocked` copy is unreachable past 9 s. **OPEN AND READER-VISIBLE, not
  "instrumented".** Fixing it today would render *"an answer was found and is being held back"* on
  turns that merely ran out of clock, because `verdictAfterFailure` preserves the first verdict when
  the second attempt throws and a deadline abort IS a throw.
- **ISC-535** — `MIN_RETRY_MS = 6_000` against a ~8,450 ms median generation. A retry admitted at the
  threshold cannot finish. **ISC-536 forbids moving it** before a live distribution exists: some
  admitted retries currently SUCCEED and the answered rate must not fall.

## 5. ISC-532 shipped but is NOT the forcing function, and this is the trap

`gen:{attempts,reason}` reports how the GENERATION LOOP terminated, server-side, on the far side of
the broken display path. **Asked the disqualifying question — what would it print if ISC-533 were
fixed versus reverted? The same thing.** It is a FREQUENCY instrument, not a verification one. A
`reason` histogram will NOT tell you the blocked channel works. **ISC-537 is the live read, and it is
`[DEFERRED-VERIFY]` because the deploy is Erik's.**

## 6. The ISC-529 fix made the app QUIETER, and that is a cost not a win

Removing the false "still composing" promise was right, but before it a reader at least saw that
something else had been happening; now **nothing indicates a fuller answer was produced and withheld**.
That is why §4's ISC-533 severity rose. Do not let a handoff or a summary describe it as closed.

## 7. [nama tidak dicatat] is unresolved and deliberately not acted on · 8. The aqidah gate is GREEN-ER but still
## red at 17 · 9. QS 7:19 on ruling questions · 10. `neraka` routes to SCRIPTURE · 11. Audio DENGAR
## click · 12. `MAX_DISPLAY = 2` rights call · 13. Continuous chat PRD — all unchanged, carried forward

## 14. Every open ISC, so none is invisible (15 open + 2 deferred = 563 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`** · `ISC-323`
**(TOMBSTONED — closed, do not build against it)** · `ISC-353.0` (superseded, kept for the trail) ·
`ISC-417` (ustadz sign-off — his ANSWER) · `ISC-419`/`ISC-420` (fixed at ingestion, awaiting his
answer) · `ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (rights half +
ISC-487) · `ISC-464` (b blocked by §1) · `ISC-487` (§4) · `ISC-533` `ISC-534` `ISC-535`
`ISC-536` (§4/§5) · `ISC-537` **`[DEFERRED-VERIFY]`** (§5) · `ISC-538` (§2, NEW).
**ISC-323.4, ISC-493, ISC-494 are CLOSED and no longer on this list.**

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a latency criterion must name WHOSE CLOCK it measures.** "The turn took 26 s" and "the reader
  waited 26 s" were the same sentence until ISC-466 and are not now. Before costing any latency lever,
  check what the reader already has on screen at that moment.
- **NEW — a letter can be honest sentence-by-sentence and still misattribute authority**, because
  attribution lives in the JOIN between two true clauses. **Every letter touching a scholar's approval
  goes through `scholarly-gate` BEFORE it reaches Erik, not after.** And state which CORPUS a
  permission covers, in writing.
- **NEW — a test that goes red against the CORRECT fix is broken, not strict.** One of my three new
  assertions forbade a string the fix itself introduces; force-red is what found it. An `Anti:`
  assertion needs a WINDOW, not just a forbidden string.
- **NEW — an agent's finding is not evidence, and neither is your first refutation of it.** The gate
  claimed 14,655 sidecar records; my first count said 310 and looked like a refutation. **My count was
  wrong** — the shards are `{meta, hadith}` and I counted top-level keys. Recount before disputing.
- **NEW — ask what a diagnostic would print if the feature were REVERTED.** If the answer is "the same
  thing", it is a frequency instrument and not a forcing function. This is how ISC-532 was correctly
  classified before anyone leaned on it.
- **This ISA's `### Cycle` headings do not bound the criteria.** Nine ISCs (479-487) live past
  `## Test Strategy`, so any per-cycle parser attributes them to the LAST cycle heading. The TOTAL is
  right; the final row's attribution is not. Do not "fix" this by moving criteria — IDs are stable.
- **The ISA has THREE checkbox markers, not two.** `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]`.
- **`git add -A` is banned in this repo.** Stage paths deliberately.
- **An `includes()` guard can match your own prose.** Count the criterion LINE
  (`/^- \[ \] ISC-N:/m`), never a substring.
- **`Inference.ts --mode advisor` takes `<task> <state> <question>`** — three args, or
  `--auto-state` with two. `--auto-state` can load the WRONG ISA; pass state explicitly.
- **A negative result about a corpus needs a control that is known PRESENT.**
- **`wrangler dev --remote` MUST run from the REPO ROOT** (root 4.120.0; `worker/` pins 3.114.17,
  whose `dev --remote` dies naming the account when it means the VERSION).
- **A rerank/cosine score cannot gate topicality or correctness.**
- **`referenceLineOf` is an explicit key literal and must never become a spread.**
- **A deploy log can say `No files to upload` while the assets DID ship.** Verify by SERVED BYTES.
- **The Fikih router may ONLY re-rank**, and `entries` must stay gated on `verses.length === 0`.
- **`MAX_DISPLAY = 2` did not move** — and must not, including to make ISC-323's rank 3 visible.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm, or a row only the change could emit.
- **A diagnostic that mirrors a gate is a COPY of that gate and drifts silently.** Share one binding.
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`, then
  read the file in a SEPARATE command.
- **Force-red every new test.** It caught two live defects this session, including one of my own tests.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (``return\`synthesis\```), not a config grep. Current `web/dist` IS synthesis.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Neither moves.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it — across all three markers.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.**
- **Routes and identifiers stay `hadis`** even though the reader-facing label is **Hadits**.

## Open items waiting on me (the user)

- **ISC-538 (§2) — NEW and the biggest.** The Dorar Indonesian preface: own letter to the ustadz,
  folded into the current draft, or left standing on Erik's existing rights call?
- **Send the ustadz letter? (§3)** Drafted and batched, three gate passes applied — **but not certified
  clean.** Run a fourth gate pass, then Erik reads it himself before sending.
- **Deploy ISC-529 + ISC-532? (§5)** Both are committed and both are invisible to readers until Erik
  ships. ISC-533, ISC-535 and ISC-537 are all downstream of that one deploy.
- **A follow-up note about [nama tidak dicatat]** (§7) — still not recorded, still Erik's call.

---

# Next session — New-Quranku (checkpoint 2026-08-18 late-4)

> Prepended by /wrap 2026-08-18 late-4. Anchor `23ee51b` (work in `6b4aedf`) — **THREE of the
> previous handoff's open decisions are DISCHARGED by Erik's answers**, committed and pushed,
> **NOTHING DEPLOYED and nothing owed a deploy**. Supersedes the `c589078` anchor. From that handoff:
> its **§2 (ISC-323.3) is ANSWERED — the answer is NO**; its **§3 (ISC-493) is CLOSED by decision**;
> its **§4 (ISC-494) is MET**; its **deploy question is answered "neither"**. Its **§1, §5, §6, §7, §8
> and §9–13 all survive verbatim.** Do not re-derive the ISC-493 rerank floor; it is measured, rejected,
> and now closed.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-18 (late-4)**).

**Current state.** Gates green — `bun test` **1580/0** exit 0 · typecheck exit 0 (all 5 passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 537/551**, computed across all THREE markers.
Clean tree except untracked `WARP.md` — **leave it** (it was accidentally committed this session in
`6b4aedf` and untracked again in `23ee51b`; do not re-add it). **PROD IS CURRENT** (worker
`4bf633a2`, bundle `index-KFCMiW0O.js` / `index-BuvZdTir.css`) and nothing shipped this session.
Hadith generator still STOPPED (1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` clean and pushed at `b8beb353`.

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried verbatim for the sixth handoff running, because it is the item most likely to be
"unblocked" by someone reading a stale line. The letter's question 3 commits us to learning the
ustadz's boundary BEFORE installing the filter, and reports 8 of 8 as measured fact.
**ISC-464(b) is blocked on the ANSWER, not the send.**

## 2. ISC-323.4 — the ONLY new decision. ERIK'S CALL, and a recommendation is already on the table

ISC-323.3 is answered by measurement and the answer is **no**. Paired arms through the production
binding, three runs, `worker/src/dalil-probe.ts` `/rerank`:

| arm | `hadith-muslim-154` after `voyageai/rerank-2.5` | within `MAX_DISPLAY = 2`? |
|---|---|---|
| **plain** — production today (control) | **absent** | no |
| **exact** — `returnValues: true` | **rank 3**, score 0.6289 | **no** |

Cost measured at **653 ms**. Bukhari 540 scores 0.6602 and 541 scores 0.6367 — both on-topic, both
correctly graded, and **the reranker returned byte-identical scores for every shared record across
arms**, so it did not re-judge anything, it inserted one record at its own merit and that merit is
third. **The lever's whole case was "then the reranker can finally see it." It can, and it disagrees.**
Not applied. `exactScores` is shipped **default-off** and reachable only from the probe.

**ISC-323.4 is a question about the CRITERION, not the code.** ISC-323 demands that record at rank 1.
It was written when the diagnosis was a RECALL failure (cosine rank 28, unreachable at K=8) — a
diagnosis that was correct and was fixed by `CANDIDATE_K = 50`. Since then the criterion has been
quietly asserting a scholarly judgment: *which hadith best answers "gimana hukumnya meninggalkan
sholat"*. That is not an engineering call.

**Recommendation given to Erik on 2026-08-18, not yet accepted:** tombstone ISC-323 with an honest
note (*not met, cause understood, cost of the only known fix measured and rejected*), and route the
editorial half — "which hadith should lead on hukum meninggalkan sholat?" — to Ustadz Ahmad, batched
with the questions already waiting on him. **Do NOT restate the criterion to match the measurement**,
and **do NOT raise `MAX_DISPLAY` to make rank 3 visible** — that is a rights call wearing an
engineering costume.

## 3. ISC-487 — the ~26 s wall. RECOMMENDED as the next session's work

Now the only open item a reader actually feels, and **the coupling that made it awkward is gone**:
ISC-323.3 would have added ~600 ms to every dalil turn and it is not happening, so latency work is
unobstructed for the first time in several sessions. Prior measurement: retrieval is 1.2–2.7 s of a
5.5–27.3 s turn and the **12 s client abort is the real defect**. **Do not "fix" it by raising the
deadline** — there are 5 s of headroom before `MODEL_DEADLINE_MS` crosses the client `TIMEOUT_MS`
(30 s) and that ordering is load-bearing. The lever is first-attempt latency.

## 4. ISC-493 is CLOSED — accepted as search behaviour (Erik, 2026-08-18). Do not reopen it

No code changed, deliberately. The rerank floor is measured and rejected (0.0703 window at n=20:
worst REAL `hukum poligami` 0.4805 vs best NON-REAL `qqqq wwww eeee rrrr` 0.4102). **Do not
re-derive it.** The stale-measurement caveat is also moot — it was conditional on adopting exact
scoring, and §2 answered no.

## 5. ISC-494 is MET — and two facts every prior handoff had wrong

`fiqhAreaOf` now resolves a tie to the **earliest-mentioned area**. Two corrections that matter for
anyone touching this file: (a) the tie on `hukum menceraikan istri saat haid` is **THREE-way**, not
two — `istri` is a `nikah` cue and was never counted; (b) `sai` was listed **twice** under `haji`,
so that area scored 2 for one cue and won ties it had no claim to (`hukum wudu lalu sai` → *haji*).
Both fixed. **Two residuals were ACCEPTED, not solved:** the rule is user-phrasing-dependent by
construction, and on a genuinely ambiguous question the doorway now names a kitab on a positional
guess where it used to stay silent.

## 6. The letter contains a sentence that was false when sent. ERIK'S CALL — still open

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* The
`own_wording` deploy made it true. Whether a follow-up note goes to the ustadz is Erik's. **If §2's
recommendation is taken, this note and the ISC-323.4 editorial question travel together.**

## 7. [nama tidak dicatat] is unresolved and deliberately not acted on

Erik named the reviewer [nama tidak dicatat]; every record in `docs/review/` says **Ustadz Ahmad Isrofiel
Mardlatillah**. He chose NOT to record it. Do not invent a record for [nama tidak dicatat].

## 8. The aqidah gate is GREEN-ER but still red at 17 — and that is correct

82 → 17 with a control arm showing 0 of 2,367 passing spans broken. Erik chose to STOP here.
`okf/aqeeda/id/` stays uncommitted.

## 9. QS 7:19 on ruling questions · 10. `neraka` routes to SCRIPTURE · 11. Audio DENGAR click ·
## 12. `MAX_DISPLAY = 2` rights call · 13. Continuous chat PRD — all unchanged, carried forward

## 14. Every open ISC, so none is invisible (13 open + 1 deferred = 551 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`, a THIRD marker — see the
counting constraint below** · `ISC-323` (§2 — now gated on ISC-323.4, NOT on ISC-323.3) ·
`ISC-323.4` (§2, NEW) · `ISC-353.0` (superseded, kept for the trail) · `ISC-417` (ustadz sign-off —
his ANSWER) · `ISC-419` / `ISC-420` (fixed at ingestion, awaiting his answer) · `ISC-440.6` (two Nabi
Yunus sentences, pinned not fixed) · `ISC-454` (rights half + ISC-487) · `ISC-464` (b is blocked by
§1) · `ISC-487` (§3). **ISC-493 and ISC-494 are CLOSED and are no longer on this list.**

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a pool fix cannot substitute for disagreeing with the ranker.** When a retrieval change is
  justified by "then stage N can see it", run stage N and READ ITS SCORE. Do not ship the pool change
  and infer the outcome. Identical cross-arm scores are the tell that the ranker was never the
  variable. And check the DISPLAY cap, not just the rank — `capForDisplay` slices to 2, so rank 3 is
  invisible no matter how correct it is.
- **NEW — `null` from `fiqhAreaOf` was a SIGNAL, not an absence, and it has THREE consumers.**
  `index.ts:844` (`rankByFiqhArea`, stable partition), `index.ts:1206` (doorway payload), and
  `web/src/dalil-search.ts:165` (`fiqhDoorwayEl`, `if (!area) return ""`) — the last is the one a
  reader sees and it was missed by grepping the function name, because the value crosses an API
  boundary and gets renamed to a field. **Grep the FIELD name too.**
- **NEW — `git add -A` is banned in this repo.** It swept untracked `WARP.md` into `6b4aedf` against
  an explicit handoff instruction. Stage paths deliberately.
- **NEW — an `includes()` guard can match your own prose and silently skip the write.** An
  `if (!s.includes("ISC-323.4"))` guard matched a MENTION of that id inside another criterion's body,
  so the insert never ran while the script reported success. Count the criterion LINE
  (`/^- \[ \] ISC-323\.4:/m`), never a substring.
- **NEW — `Inference.ts --mode advisor --auto-state` can load the WRONG ISA.** It loaded
  `sider-contrast-roll-and-devbuild` for a quran-new task and opened with a "fatal flaw: the ISA
  doesn't match" that was its own bug. **Read past it — the rest of that pass found three real
  defects.** Pass state explicitly if you need it right.
- **The ISA has THREE checkbox markers, not two.** `- [x]`, `- [ ]`, `- [DEFERRED-VERIFY]` (ISC-189).
  An "off-by-one denominator" is far more often an unmatched marker than a hand-set number.
- **A negative result about a corpus needs a control that is known PRESENT.**
- **`wrangler vectorize get-vectors --ids` is an ARRAY flag taking SPACE-separated values.**
- **Offline cosine is right about the VECTORS and wrong about what the live scorer RANKS.** Explained
  by ISC-323.2, and §2 has now decided not to close the gap.
- **`wrangler dev --remote` MUST run from the REPO ROOT.** `worker/` pins wrangler 3.114.17, whose
  `dev --remote` dies with *"Could not create remote preview session on your account."* **That error
  names the account and means the VERSION.** Root is 4.120.0. Probe command:
  `bunx wrangler dev --config worker/wrangler.dalil-probe.toml --remote --port 8799`, then
  `curl 'http://127.0.0.1:8799/rerank'` (or `/scoring`, or `/?q=`).
- **A rerank/cosine score cannot gate topicality either** — not just correctness.
- **`referenceLineOf` is an explicit key literal and must never become a spread.**
- **A deploy log can say `No files to upload` while the assets DID ship.** Verify by SERVED BYTES.
- **A stale `CacheStorage` entry survives a SERVER RESTART.**
- **The Fikih router may ONLY re-rank.** Re-verified structurally this session across all three
  consumers; `fiqh-rank.test.ts` enforces it.
- **`entries` must stay gated on `verses.length === 0`.**
- **`MAX_DISPLAY = 2` did not move** — and must not move by accident, including to make §2's rank 3
  visible.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **The DOM screenshot times out at 15 s on the heavier routes.**
- **`interceptor act` takes `<ref>` with NO `click` keyword**, and a SYNTHETIC click does not open a
  native `<details>`.
- **A sent letter is a commitment and outranks a handoff item.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm or a row only the change could emit.
- **A diagnostic that mirrors a gate is a COPY of that gate and drifts silently.**
- **The sentence splitter breaks a quote pair when the full stop sits inside the closing quote.**
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`, then
  read the file in a SEPARATE command.
- **Force-red every new test.** It caught a live defect this session (`sai` double-counting) and
  proved the `exactScores` param was not a no-op. If a proposed test can only re-assert a copy of the
  code, remove it.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (``function Ms(){try{return\`synthesis\`}…``), not a config grep. Confirmed synthesis this
  session, and the rebuild reproduced `index-KFCMiW0O.js` — the exact bundle prod serves.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.**
- **Never hand-set ISA `progress:`.** Compute it — across all three markers.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.**
- **Routes and identifiers stay `hadis`** (`#/hadis`, `nav-hadis`, `renderHadis`, `.hadith-*`) even
  though the reader-facing label is **Hadits**.

## Open items waiting on me (the user)

- **ISC-323.4 (§2) — NEW and the freshest.** Tombstone ISC-323 and send the editorial half to the
  ustadz, or keep it as written and accept NOT MET indefinitely? A recommendation is on the table and
  Erik has not answered.
- **ISC-487 — the ~26 s wall** (§3): recommended as the next session's work, now uncoupled from
  ISC-323.3. Confirm before a session is spent on it.
- **A follow-up note to Ustadz Ahmad?** (§6) — the letter's hadith sentence was false when sent, and
  §2's editorial question would ride along with it.
- **Who is [nama tidak dicatat]?** (§7) — declined to record for now; still unresolved.
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b). Do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** Answered "neither" on 2026-08-18; both remain
  several deploys behind, and `new-quranku-ai` SHARES `web/dist` so it needs a synthesis rebuild
  first. Re-ask only if Erik raises it.
- **Whether `MAX_DISPLAY = 2` may ever rise** (§12) — a rights call, and §2 gives a new reason someone
  might be tempted. It should still not move.

---

# Next session — New-Quranku (checkpoint 2026-08-18 late-3)

> Prepended by /wrap 2026-08-18 late-3. Anchor `3be6240` + the wrap commit — **ISC-323.2 ANSWERED,
> committed and pushed, NOTHING DEPLOYED and nothing owed a deploy** (no production behaviour
> changed). Supersedes the `e426bd3` anchor. That handoff's items **1, 2, 3, 5, 6, 7, 8, 9–13 all
> survive verbatim**; its **item 4 (ISC-323.2) is DISCHARGED — by being ANSWERED**, and the probe it
> named is done. Do not go looking for the vector-count work it described; it is finished and the
> count was clean.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-18 (late-3)**, which opens
with a CORRECTION to late-2 — read that before quoting any ISA count).

**Current state.** Gates green — `bun test` **1574/0** exit 0 · typecheck exit 0 (all 5 passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 504/518**, computed across all THREE
markers. Clean tree except untracked `WARP.md` — leave it. **PROD IS CURRENT** (worker `4bf633a2`,
bundle `index-KFCMiW0O.js` / `index-BuvZdTir.css`) and nothing shipped this session. Hadith generator
still STOPPED (1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` clean and pushed at `b8beb353`.

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried verbatim for the fifth handoff running, because it is the item most likely to be
"unblocked" by someone reading a stale line. The letter's question 3 commits us to learning the
ustadz's boundary BEFORE installing the filter, and reports 8 of 8 as measured fact.
**ISC-464(b) is blocked on the ANSWER, not the send.**

## 2. ISC-323.3 — the ONLY new decision this session. ERIK'S CALL, and it is measurable

ISC-323.2 is answered: **the live Vectorize query path scores against an APPROXIMATE
representation.** Paired arms inside the Worker runtime, through the production binding, same query
vector, same `topK: 50`:

| arm | score range | `hadith-muslim-154` |
|---|---|---|
| **plain** — what `dalil.ts:272` sends today | 0.4291–0.4866 | **ABSENT from top-50** |
| **exact** — `returnValues: true` | 0.5157–0.5926 | **rank 24** |

Orderings agree in **1 of 50 positions**. The exact arm reproduces the recorded OFFLINE range and the
plain arm the recorded LIVE range — which is what closes the question. **The offline reproduction was
right about the vectors and wrong only about what the live scorer ranks.**

**The lever costs ~+600 ms** (plain mean 243 ms, exact mean 837 ms over 5 runs) plus a 50×1024-float
payload, while ISC-487 is open. **NOT applied.** Erik has not decided.

**The measurement that would decide it, and it is NOT yet done:** whether `hadith-muslim-154`
survives `voyageai/rerank-2.5` to rank 1 in the exact arm. Rank 24 is inside `CANDIDATE_K = 50`, so
the reranker can finally see it — but **a better candidate pool is not by itself a better answer**,
and this repo's own rule says a ranking result naming a record proves nothing about what the reader
gets. Doing it needs an additive, default-off parameter on `searchDalil` — safe and reversible, but
it opens the retrieval path the Fikih safety argument rests on, so **Erik was asked and has not
answered.** Do not just ship `returnValues: true`.

Reproduce either arm with the dev-only route added this session (not deployed, not routed, not
referenced by `index.ts`), run from the REPO ROOT:
`bunx wrangler dev --config worker/wrangler.dalil-probe.toml --remote --port 8799`
then `curl 'http://127.0.0.1:8799/scoring'` (optional `?q=`, `?id=`, `?k=`).

## 3. ISC-493 — section search answers gibberish. The obvious fix is FORBIDDEN by data. ERIK'S CALL

`zxqw plumbus flarn` returns 2 hadith cards and 6 references exactly as a real question does,
because vector search always returns its top-k; `dalilEmptyEl` is only reachable when retrieval
itself fails. **Do not "fix" this with a rerank floor without re-reading this.** On 3 samples the
separation looked huge (REAL 0.75–0.85 vs non-real 0.19–0.41). At **20** samples it collapsed: worst
REAL `hukum poligami` **0.4805** vs best NON-REAL `qqqq wwww eeee rrrr` **0.4102** — a 0.0703 window,
against a score `dalil.ts` twice documents as "NOT a correctness signal, and not comparable across
questions". Options: accept as search behaviour (the box says "Cari Hadits"), or re-frame the results
copy as "closest in the corpus".

**New in light of §2:** those 20 samples were measured on the APPROXIMATE scores. The exact scores
run ~0.10 higher and reorder freely, so **if ISC-323.3 is ever taken, this measurement must be
REDONE before anyone re-proposes a floor.** It does not make a floor viable — it makes the existing
rejection evidence stale.

## 4. ISC-494 — the Fikih doorway vanishes on mixed questions. Pre-existing. ERIK'S CALL

`hukum menceraikan istri saat haid` names NO area: `fiqhAreaOf` returns `null` on a TIE, and
`menceraikan` (talak) and `haid` (thaharah) each score 1. Deliberately conservative — it declines to
guess rather than guessing wrong — but the doorway is absent exactly where a reader wants it.
**Changing tie-breaking touches the re-rank the whole Fikih safety argument rests on.**

## 5. ISC-487 — the ~26 s wall, still the only open latency item. ERIK'S CALL

Arm-independent (3/9 dead turns in BOTH arms). **Do not "fix" it by raising the deadline** — there
are 5 s of headroom before `MODEL_DEADLINE_MS` crosses the client `TIMEOUT_MS` (30 s) and that
ordering is load-bearing. The lever is first-attempt latency. **Note the interaction with §2:**
ISC-323.3 would ADD ~600 ms to every dalil turn, so these two are one decision, not two.

## 6. The letter contains a sentence that was false when sent. ERIK'S CALL — still open

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* The
`own_wording` deploy made it true. Whether a follow-up note goes to the ustadz is Erik's.

## 7. [nama tidak dicatat] is unresolved and deliberately not acted on

Erik named the reviewer [nama tidak dicatat]; every record in `docs/review/` says **Ustadz Ahmad Isrofiel
Mardlatillah**. He chose NOT to record it. Do not invent a record for [nama tidak dicatat].

## 8. The aqidah gate is GREEN-ER but still red at 17 — and that is correct

82 → 17 with a control arm showing 0 of 2,367 passing spans broken. Erik chose to STOP here.
`okf/aqeeda/id/` stays uncommitted.

## 9. QS 7:19 on ruling questions · 10. `neraka` routes to SCRIPTURE · 11. Audio DENGAR click ·
## 12. `MAX_DISPLAY = 2` rights call · 13. Continuous chat PRD — all unchanged, carried forward

## 14. Every open ISC, so none is invisible (13 open + 1 deferred = 518 total)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` **`[DEFERRED-VERIFY]`, a THIRD marker — see the
counting constraint below** · `ISC-323` (unblocked by ISC-323.2; now gated on ISC-323.3) ·
`ISC-323.3` (§2, NEW) · `ISC-353.0` (superseded, kept for the trail) · `ISC-417` (ustadz sign-off —
his ANSWER) · `ISC-419` / `ISC-420` (fixed at ingestion, awaiting his answer) · `ISC-440.6` (two Nabi
Yunus sentences, pinned not fixed) · `ISC-454` (rights half + ISC-487) · `ISC-464` (b is blocked by
§1) · `ISC-487` (§5) · `ISC-493` (§3) · `ISC-494` (§4).

---

## Constraints to honor (carried forward — plus four new)

- **NEW — the ISA has THREE checkbox markers, not two.** `- [x]`, `- [ ]`, and `- [DEFERRED-VERIFY]`
  (ISC-189). A parser matching only the first two drops the third from the numerator AND the
  denominator at once, which is how a CORRECT `503/517` was misread this session as an off-by-one and
  briefly rewritten to a wrong `504/517`. Correct is **504/518**. **An "off-by-one denominator" is far
  more often an unmatched marker than a hand-set number** — check the marker vocabulary first.
- **NEW — a negative result about a corpus needs a control that is known PRESENT.** Two probes this
  session reported records "absent from the index" when the instrument was wrong: the Vectorize
  vector id is the file's frontmatter `id` (`r.entry.id ?? r.entry.path`), **not** the `sha256(text)`
  in `build-index.ts` — that sha is the embedding CACHE key. The control record, known live at rank 1,
  also read absent, which is the only reason the error surfaced.
- **NEW — `wrangler vectorize get-vectors --ids` is an ARRAY flag taking SPACE-separated values.** A
  comma list is sent as ONE id and fails with `id too long; max is 64 bytes, got 76 bytes`. Read that
  error as a syntax error, not a missing record.
- **NEW — offline cosine is right about the VECTORS and wrong about what the live scorer RANKS.** The
  standing ban on quoting offline retrieval as evidence about live behaviour still holds, but the
  reason is now known (§2) and the gap is closable at ~+600 ms. Do not treat the ban as unexplained.
- **`wrangler dev --remote` MUST run from the REPO ROOT.** `worker/` pins wrangler 3.114.17, whose
  `dev --remote` opens a legacy edge preview session and dies with *"Could not create remote preview
  session on your account."* **That error names the account and means the VERSION.** Root is 4.120.0.
- **A rerank/cosine score cannot gate topicality either** — not just correctness. The separation that
  looks decisive at n=3 is a 0.07 window at n=20. Widen the sample before setting a bound, and state
  the current max.
- **`referenceLineOf` is an explicit key literal and must never become a spread.** It is the rights
  wall for the reference list; the test asserts the key SET, because the leak that matters is a field
  added to `DalilHit` later.
- **A deploy log can say `No files to upload` while the assets DID ship.** Verify by SERVED BYTES.
- **A stale `CacheStorage` entry survives a SERVER RESTART.** `caches.delete()` before believing any
  post-deploy visual probe.
- **The Fikih router may ONLY re-rank.** `fikih-route.ts` says so and `fiqh-rank.test.ts` enforces it.
- **`entries` must stay gated on `verses.length === 0`.** Only the HADITH lane was widened.
- **`MAX_DISPLAY = 2` did not move to build section search** — and must not move by accident.
- **The first curl after a deploy reads the STALE `index.html` from the edge.**
- **The DOM screenshot times out at 15 s on the heavier routes.** Stop after ~3 attempts and
  substitute `eval --main` computed-style probes, STATING the missing-pixel gap.
- **`interceptor act` takes `<ref>` with NO `click` keyword**, and a SYNTHETIC click does not open a
  native `<details>`.
- **A sent letter is a commitment and outranks a handoff item.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm or a row only the change could emit.
- **An unpaired single-shot turn has produced the same false diagnosis twice** (ISC-454, ISC-484).
- **A diagnostic that mirrors a gate is a COPY of that gate and drifts silently.** Share one binding.
- **The sentence splitter breaks a quote pair when the full stop sits inside the closing quote.**
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **A "lane X never renders" claim needs a control arm that makes it render.**
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
- **Force-red every new test.** If a proposed test can only re-assert a copy of the code, remove it.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (``function Ms(){try{return`synthesis`}…``), not a config grep.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.** New Indonesian goes through the
  IndonesianPolish skill — but match the LOCAL register.
- **Never hand-set ISA `progress:`.** Compute it — across all three markers.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.** Committable only when `aqeeda:verify-id` exits 0.
- **Routes and identifiers stay `hadis`** (`#/hadis`, `nav-hadis`, `renderHadis`, `.hadith-*`) even
  though the reader-facing label is **Hadits**.

## Open items waiting on me (the user)

- **ISC-323.3 (§2) — NEW and the freshest.** Pass `returnValues: true` in `dalil.ts:272` for a true-cosine
  candidate pool at **~+600 ms**, or leave it? And separately: may the next session add an additive,
  default-off param to `searchDalil` to MEASURE whether Muslim 154 survives the reranker? **Erik was
  asked at the end of the last session and has not answered.**
- **ISC-493** (§3) — accept gibberish returning nearest matches as search behaviour, or re-frame the
  results copy? The rerank floor is measured and rejected; do not re-derive it.
- **ISC-494** (§4) — leave the doorway absent on tie-matched questions, or change tie-breaking?
- **ISC-487 — the ~26 s wall** (§5): accept it, or spend a session on first-attempt latency? Note it
  is now coupled to ISC-323.3.
- **A follow-up note to Ustadz Ahmad?** (§6) — the letter's hadith sentence was false when sent.
- **Who is [nama tidak dicatat]?** (§7) — declined to record for now; still unresolved.
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b). Do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** Both several deploys behind, and `new-quranku-ai`
  SHARES `web/dist` so it needs a synthesis rebuild first.
- **Whether `MAX_DISPLAY = 2` may ever rise** (§12) — a rights call.

---

# Next session — New-Quranku (checkpoint 2026-08-18 late-1)

> Prepended by /wrap 2026-08-18 late-1. Anchor `e426bd3` — section-scoped search, **committed,
> pushed AND DEPLOYED** (worker `4bf633a2`, bundle `index-KFCMiW0O.js` / `index-BuvZdTir.css`).
> Supersedes the `8f3ab32` anchor. That handoff's **items 1–6 all survive** except its open
> "deploy `8f3ab32`" question, which is DISCHARGED — that commit shipped inside this deploy.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-18 (late-1)**).

**Current state.** Gates green — `bun test` **1574/0** exit 0 · typecheck exit 0 (all 5 passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 503/517**, computed. Clean tree except
untracked `WARP.md` — leave it. **PROD IS CURRENT** and verified by served bytes + a before/after
control (`/api/dalil` 405 → 200). Hadith generator still STOPPED (1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` clean and pushed at `b8beb353`.

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried verbatim for the fourth handoff running, because it is the item most likely to be
"unblocked" by someone reading a stale line. The letter's question 3 commits us to learning the
ustadz's boundary BEFORE installing the filter, and reports 8 of 8 as measured fact.
**ISC-464(b) is blocked on the ANSWER, not the send.**

## 2. ISC-493 — section search answers gibberish. The obvious fix is FORBIDDEN by data. ERIK'S CALL

`zxqw plumbus flarn` returns 2 hadith cards and 6 references exactly as a real question does,
because vector search always returns its top-k; `dalilEmptyEl` is only reachable when retrieval
itself fails. **Do not "fix" this with a rerank floor without re-reading this.** On 3 samples the
separation looked huge (REAL 0.75–0.85 vs non-real 0.19–0.41). At **20** samples it collapsed:

| | value | query |
|---|---|---|
| worst REAL | **0.4805** | `hukum poligami` |
| best NON-REAL | **0.4102** | `qqqq wwww eeee rrrr` |

A 0.0703 window, against a score `dalil.ts` twice documents as "NOT a correctness signal, and not
comparable across questions". A threshold there silences a legitimate fiqh question to suppress
nonsense. Cosine separates worse. Options: accept as search behaviour (the box says "Cari Hadits",
and a search returning nearest matches is not the answer path manufacturing an answer), or re-frame
the results copy as "closest in the corpus".

## 3. ISC-494 — the Fikih doorway vanishes on mixed questions. Pre-existing. ERIK'S CALL

`hukum menceraikan istri saat haid` names NO area: `fiqhAreaOf` returns `null` on a TIE, and
`menceraikan` (talak) and `haid` (thaharah) each score 1. Deliberately conservative — it declines to
guess rather than guessing wrong — but the doorway is absent exactly where a reader wants it.
**Changing tie-breaking touches the re-rank the whole Fikih safety argument rests on.** Not changed
unilaterally.

## 4. ISC-323.2 — the probe channel is OPEN and the next probe is named

Two explanations eliminated this session: not an embedder mismatch (`build-index.ts:38,109` and
`dalil.ts:72,107` are both `baai/bge-m3` via OpenRouter, no prefix), not a metric mismatch
(`okf-hadith` is `1024 / cosine`). What survives is **ANN recall over `topK`** — an exhaustive
offline scan can reach a rank-28 record the live index never returns — or an index/cache population
difference. **Next probe: vector count of the live index vs `data/okf/vectors-bge-m3.jsonl`.**
Closing this unblocks ISC-323 and ISC-372 is already closed.

Run the probe from the REPO ROOT (see the new constraint below):
`bunx wrangler dev --config worker/wrangler.dalil-probe.toml --remote --port 8799`

## 5. ISC-487 — the ~26 s wall, still the only open latency item. ERIK'S CALL

Arm-independent (3/9 dead turns in BOTH arms). **Do not "fix" it by raising the deadline** — there
are 5 s of headroom before `MODEL_DEADLINE_MS` crosses the client `TIMEOUT_MS` (30 s) and that
ordering is load-bearing. The lever is first-attempt latency.

## 6. The letter contains a sentence that was false when sent. ERIK'S CALL — still open

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* The
`own_wording` deploy made it true. Whether a follow-up note goes to the ustadz is Erik's.

## 7. [nama tidak dicatat] is unresolved and deliberately not acted on

Erik named the reviewer [nama tidak dicatat]; every record in `docs/review/` says **Ustadz Ahmad Isrofiel
Mardlatillah**. He chose NOT to record it. Do not invent a record for [nama tidak dicatat].

## 8. The aqidah gate is GREEN-ER but still red at 17 — and that is correct

82 → 17 with a control arm showing 0 of 2,367 passing spans broken. Erik chose to STOP here.
`okf/aqeeda/id/` stays uncommitted.

## 9. QS 7:19 on ruling questions · 10. `neraka` routes to SCRIPTURE · 11. Audio DENGAR click ·
## 12. `MAX_DISPLAY = 2` rights call · 13. Continuous chat PRD — all unchanged, carried forward

## 14. Every open ISC, so none is invisible (13 open + 1 deferred)

`ISC-98` (real-iOS `visualViewport`) · `ISC-189` [DEFERRED-VERIFY] (60fps on real mid-range Android)
· `ISC-323` + `ISC-323.2` (§4) · `ISC-353.0` (superseded, kept for the trail) · `ISC-417` (ustadz
sign-off — his ANSWER) · `ISC-419` / `ISC-420` (fixed at ingestion, awaiting his answer) ·
`ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (rights half + ISC-487) ·
`ISC-464` (b is blocked by §1) · `ISC-487` (§5) · `ISC-493` (§2) · `ISC-494` (§3).

---

## Constraints to honor (carried forward — plus five new)

- **NEW — `wrangler dev --remote` MUST run from the REPO ROOT.** `worker/` pins wrangler 3.114.17,
  whose `dev --remote` opens a legacy edge preview session and dies with *"Could not create remote
  preview session on your account."* **That error names the account and means the VERSION** — it
  cost two sessions chasing a Cloudflare permissions problem that did not exist. Root is 4.120.0.
- **NEW — a rerank/cosine score cannot gate topicality either.** Not just correctness. See §2: the
  separation that looks decisive at n=3 is a 0.07 window at n=20. Always widen the sample before
  setting a bound, and state the current max.
- **NEW — `referenceLineOf` is an explicit key literal and must never become a spread.** It is the
  rights wall for the reference list. `worker/src/dalil-search.test.ts` asserts the key SET, not the
  absence of `arabic`/`english`, because the leak that matters is a field added to `DalilHit` later.
- **NEW — a deploy log can say `No files to upload` while the assets DID ship.** Seen 2026-08-18
  with freshly-built hashes. Verify by SERVED BYTES; the log line is not evidence either way.
- **NEW — a stale `CacheStorage` entry survives a SERVER RESTART.** Clearing the dist and restarting
  wrangler did not shift the browser off the old bundle; `caches.delete()` did. Clear it before
  believing any post-deploy visual probe.
- **The Fikih router may ONLY re-rank.** `fikih-route.ts` says so and `fiqh-rank.test.ts` enforces it.
  `/api/dalil` passes `fiqh` as a plain boolean ONLY because the lane cannot admit or refuse.
- **`entries` must stay gated on `verses.length === 0`.** Only the HADITH lane was widened.
- **`MAX_DISPLAY = 2` did not move to build section search** — and must not move by accident.
- **The first curl after a deploy reads the STALE `index.html` from the edge.** Re-check after a beat,
  with a cache-buster AND `Cache-Control: no-cache`.
- **The DOM screenshot times out at 15 s on the heavier routes** (paint complexity, documented). Stop
  after ~3 attempts and substitute `eval --main` computed-style probes, STATING the missing-pixel gap.
  The OS capture grabs Chrome's FRONT window, which may be a different one.
- **`interceptor act` takes `<ref>` with NO `click` keyword**, and a SYNTHETIC click does not open a
  native `<details>`.
- **A sent letter is a commitment and outranks a handoff item.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE.
- **A whole-run bucket total is NOT evidence.** Only a PAIRED arm or a row only the change could emit.
- **An unpaired single-shot turn has produced the same false diagnosis twice** (ISC-454, ISC-484).
- **A diagnostic that mirrors a gate is a COPY of that gate and drifts silently.** Share one binding.
- **The sentence splitter breaks a quote pair when the full stop sits inside the closing quote.**
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **A "lane X never renders" claim needs a control arm that makes it render.**
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
- **Force-red every new test.** If a proposed test can only re-assert a copy of the code, remove the copy.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Verify the INLINED
  literal (`function Ms(){try{return\`synthesis\`}…`), not a config grep.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.** New Indonesian goes through the
  IndonesianPolish skill — but match the LOCAL register.
- **Never hand-set ISA `progress:`.** Compute it.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.** Committable only when `aqeeda:verify-id` exits 0.
- **Routes and identifiers stay `hadis`** (`#/hadis`, `nav-hadis`, `renderHadis`, `.hadith-*`) even
  though the reader-facing label is **Hadits**.

## Open items waiting on me (the user)

- **ISC-493** (§2) — accept gibberish returning nearest matches as search behaviour, or re-frame the
  results copy? The rerank floor is measured and rejected; do not re-derive it.
- **ISC-494** (§3) — leave the doorway absent on tie-matched questions, or change tie-breaking (which
  touches the Fikih safety argument)?
- **ISC-487 — the ~26 s wall** (§5): accept it, or spend a session on first-attempt latency?
- **A follow-up note to Ustadz Ahmad?** (§6) — the letter's hadith sentence was false when sent.
- **Who is [nama tidak dicatat]?** (§7) — declined to record for now; still unresolved.
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b). Do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** Both several deploys behind, and `new-quranku-ai`
  SHARES `web/dist` so it needs a synthesis rebuild first.
- **Whether `MAX_DISPLAY = 2` may ever rise** (§12) — a rights call, deliberately not pre-empted by
  the reference-line design.

---

# Next session — New-Quranku (checkpoint 2026-08-17 late-5)

> Prepended by /wrap 2026-08-17 late-5. Anchor `8f3ab32` — the dalil-report fix and the ISC-484
> correction, **committed and pushed, NOT deployed**. Supersedes the `840539a0` anchor.
> That handoff's **item 2 is DISCHARGED — by being FALSIFIED, not fixed.** Do not go looking for
> the prompt work it described; there is none. Its item 1 STILL STANDS. Items 3–11 survive.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-17 (late-5)**).

**Current state.** Gates green — `bun test` **1569/0** exit 0 · typecheck exit 0 (all 5 passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 496/508**, computed. Clean tree except
untracked `WARP.md` — leave it. **PROD IS ONE COMMIT BEHIND**: `8f3ab32` touches `worker/src/index.ts`
and has NOT been deployed. The change is diagnostic-only (a report field plus a no-op refactor), so
nothing is broken by the delay — but prod's `dalil` report keeps printing the contradiction below
until it ships. Hadith generator still STOPPED (1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` clean and pushed at `b8beb353`.

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried forward verbatim for the third handoff running, because it is the item most likely to be
"unblocked" by someone reading a stale line. The letter's question 3 commits us to learning the
ustadz's boundary BEFORE installing the filter, and reports 8 of 8 as measured fact.
**ISC-464(b) is blocked on the ANSWER, not the send.**

This does NOT conflict with Erik's 2026-08-17 decision to build the cascade without waiting for
sign-off. He authorised NEW SOURCES, not the filter the letter names.

## 2. ISC-484 is MET. Its diagnosis was WRONG. Do not do the prompt work it asked for

The last handoff's top item said the widened hadith lane makes the model "reach for a prophetic
attribution WITHOUT a resolving marker" and sent the next session to rule 7 of
`SYNTHESIS_SYSTEM_PROMPT`. Measured with a **paired control arm** against live prod — same question,
same verified verses, POSTed twice back-to-back with only `weakVerses` flipped — 9 pairs over the
three WEAK questions:

| hadith lane | answered | answered mean | turns ≥20 s | answered turns citing ≥1 hadith |
|---|---|---|---|---|
| **ON** (cascade) | **7/9 (78%)** | 12.8 s | 3/9 | **7/7** |
| **OFF** (pre-cascade) | 6/9 (67%) | 8.2 s | 3/9 | 0/6 |

**Rule 7 lands 7 times out of 7.** Editing the prompt would have "fixed" a rule that was already
working. The widened lane answers MORE often than the arm without it. `turns ≥20 s` is **3/9 in BOTH
arms**, so the ~26 s wall is arm-independent — not the cascade, not the hadith payload, not
`bad_hadith`. Carrying hadith costs **+4.5 s** on an answered turn, of which 1.3–4.0 s is the dalil
chain (`dalil.ms.total`), so 1–3 s is the model.

**ISC-454 carried the same falsified reading** ("zero cards, and the cause is the PROMPT") and has
been corrected in place rather than flipped — what keeps it open is the rights half and ISC-487,
neither of which is a measurement.

## 3. ISC-487 — the ~26 s wall is now the ONLY open engineering item in the cycle. ERIK'S CALL

Sharpened this session: it is **arm-independent**. The pre-cascade arm produced its own dead turns
(`null:no-reason` ×2 at 25.0 s, `own_wording` at 25.3 s). A retry does not fit inside
`MODEL_DEADLINE_MS` on ANY lane.

**Do not "fix" this by raising the deadline.** There are 5 s of headroom before `MODEL_DEADLINE_MS`
crosses the client's `TIMEOUT_MS` (30 s), and that ordering is load-bearing. The lever is
first-attempt latency.

## 4. The letter contains a sentence that was false when sent. ERIK'S CALL — still open

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* The
`own_wording` deploy made it true. Whether a follow-up note goes to the ustadz is Erik's.

## 5. [nama tidak dicatat] is unresolved and deliberately not acted on

Erik named the reviewer [nama tidak dicatat]; every record in `docs/review/` says **Ustadz Ahmad Isrofiel
Mardlatillah**. He chose NOT to record it. Do not invent a record for [nama tidak dicatat].

## 6. The aqidah gate is GREEN-ER but still red at 17 — and that is correct

82 → 17 with a control arm showing 0 of 2,367 passing spans broken. The 17 are a hand-read mix of
whole unbroken ayat (real corruption) and artifact shapes the trim does not cover. Erik chose to STOP
here. `okf/aqeeda/id/` stays uncommitted.

## 7. QS 7:19 on ruling questions · 8. `neraka` routes to SCRIPTURE · 9. Audio DENGAR click ·
## 10. `MAX_DISPLAY = 2` rights call · 11. Continuous chat PRD — all unchanged, carried forward

## 12. The other 11 open ISCs, so none is invisible

`ISC-98` (real-iOS `visualViewport` spot-check) · `ISC-323` + `ISC-323.2` (live vs offline candidate
set) · `ISC-353.0` (superseded, kept for the trail) · `ISC-372` (blocked on ISC-323.2) · `ISC-417`
(ustadz sign-off — his ANSWER) · `ISC-419` / `ISC-420` (fixed at ingestion, awaiting his answer) ·
`ISC-440.6` (two Nabi Yunus sentences, pinned not fixed) · `ISC-454` (rights half + ISC-487) ·
`ISC-464` (b is blocked by §1) · `ISC-487` (§3).

---

## Constraints to honor (carried forward — plus four new)

- **NEW — a whole-run bucket total is NOT evidence in this app.** The same 24-turn probe read 25%
  then 38% answered within two hours with NO deploy between; late-4 recorded 46%. Only a PAIRED arm
  (same question, same body, one bit flipped) or a row only the change could emit is actionable.
- **NEW — an unpaired single-shot turn has now produced the same false diagnosis twice** (ISC-454
  2026-08-15, ISC-484 2026-08-17). I reproduced it myself on this session's first probe
  (`bad_hadith` at 26.4 s) before pairing it. Pair before concluding.
- **NEW — a diagnostic that mirrors a gate is a COPY of that gate and drifts silently.** `dalilReport`
  computed `eligible` from the OLD gate and printed `eligible:false` beside `records:2` on exactly
  the turns the cascade was built for. Fixed by SHARING ONE BINDING (`dalilEligible`) with the gate —
  not by duplicating the condition and testing the copies agree, which re-asserts the copy.
  `probe-hadith-gate.ts` held the same stale copy.
- **NEW — `wall-live-probe.ts` now records the `dalil` report** (`h offered→records→cited`) and
  splits its summary by whether the model was handed hadith. It prints an EMPTY arm rather than
  dropping the line. Do not re-add a second unrecorded script to read the response body.
- **The Fikih router may ONLY re-rank.** `fikih-route.ts` says so and `fiqh-rank.test.ts` enforces it.
  Wire it into an admission decision and the whole safety argument is void.
- **`entries` must stay gated on `verses.length === 0`.** Only the HADITH lane was widened. That gate
  stops the ruling index hijacking a real feeling. Do not "simplify" the two gates into one.
- **The first curl after a deploy reads the STALE `index.html` from the edge.** Re-check after a beat,
  with a cache-buster AND `Cache-Control: no-cache`.
- **`interceptor act` takes `<ref>` with NO `click` keyword**, and a SYNTHETIC click does not activate
  a native `<details>`.
- **A sent letter is a commitment and outranks a handoff item.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE, never
  `innerText`, when judging a guard.
- **The sentence splitter breaks a quote pair when the full stop sits inside the closing quote.**
- **A `value=` attribute does NOT survive the Artifact publish wrapper.**
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **A "lane X never renders" claim needs a control arm that makes it render.**
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
- **Force-red every new test.** And if a proposed test can only re-assert a copy of the code, do not
  write it — remove the copy instead.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.**
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.**
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.** New Indonesian goes through the
  IndonesianPolish skill — but match the LOCAL register.
- **Never hand-set ISA `progress:`.** Compute it.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.** Committable only when `aqeeda:verify-id` exits 0.
- **Routes and identifiers stay `hadis`** (`#/hadis`, `nav-hadis`, `renderHadis`, `.hadith-*`) even
  though the reader-facing label is now **Hadits**. So does the system prompt's
  `"Hadis yang terambil"` heading — it is paired with the grounding builder's matching header.

## Open items waiting on me (the user)

- **Deploy `8f3ab32` to prod?** Diagnostic-only, but prod's `dalil` report lies until it ships.
- **ISC-487 — the ~26 s wall** (§3): accept it, or spend a session on first-attempt latency? It is
  now the ONLY open engineering item in the cycle.
- **A follow-up note to Ustadz Ahmad?** (§4) — the letter's hadith sentence was false when sent.
- **Who is [nama tidak dicatat]?** (§5) — declined to record for now; still unresolved.
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b). Do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** Prod-only chosen twice; both now several deploys
  behind, and `new-quranku-ai` SHARES `web/dist` so it needs a synthesis rebuild first.

---

# Next session — New-Quranku (checkpoint 2026-08-17 late-4)

> Prepended by /wrap 2026-08-17 late-4. Anchor `840539a0` — the ayat → hadits → fikih cascade,
> **committed, pushed AND deployed** (worker `ddfa28af`, bundle `index-CyVBC63y.js`). The wrap's own
> checkpoint commit sits above it and touches only `PROGRESS.md`, `ISA.md` and this file.
> Supersedes the `bb4e951` anchor.
> That handoff's **items 2, 4 and 5 are DISCHARGED** — 2 deployed and re-measured, 4 done at
> 82 → 17 with a clean control, 5 decided (prod only, unchanged). Its **item 1 STILL STANDS and is
> still the most important line in this file.** Items 3, 6, 7, 8, 9 survive.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-17 (late-4)**).

**Current state.** Gates green — `bun test` **1569/0** exit 0 · typecheck exit 0 (all 5 passes) ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 495/508**, computed. Clean tree except
untracked `WARP.md` — leave it. **PROD IS CURRENT**: four deploys landed this session and the last
one is verified by served bytes. No undeployed commit, no stale dist. Hadith generator still STOPPED
(1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` clean and pushed at `b8beb353`.

---

## 1. DO NOT install the God/unseen filter. The sent letter still forbids it. UNCHANGED

Carried forward verbatim from the last two handoffs because it has not changed and it is the item
most likely to be "unblocked" by someone reading a stale line. The letter's question 3 commits us to
learning the ustadz's boundary BEFORE installing the filter, and reports 8 of 8 as measured fact.
**ISC-464(b) is blocked on the ANSWER, not the send.**

Note this does NOT conflict with Erik's 2026-08-17 decision to build the cascade without waiting for
sign-off. Those are different things: he authorised NEW SOURCES, not the filter the letter names.

## 2. ISC-484 — the widened hadith lane REFUSES where it used to answer. This is the top job

The cascade works — proven by a row only it could emit (`apa keutamaan sedekah`, `blocked:bad_hadith`
at 1 verse / 0 entries, unreachable before). But on the two questions it was built for, the model
reaches for a prophetic attribution WITHOUT a resolving marker, so `bad_hadith` stops it.
`bagaimana adab kepada orang tua` and `apa keutamaan sedekah` both answered cleanly BEFORE.

**The remaining work is the PROMPT half, not retrieval.** Rule 7 of `SYNTHESIS_SYSTEM_PROMPT`
already specifies the marker syntax; the model is not following it on these turns. Before editing
the prompt, check the response body's `dalil` report — `records>0` with an empty `hadith` array means
retrieval worked and the model declined to cite, which the Worker's own comment calls a prompt
problem. `records:0` would mean something else entirely.

Measure with `bun run src/eval/wall-live-probe.ts --repeat 3`. Require the two `WEAK` rows to answer.

## 3. ISC-487 — the wall's real cost is LATENCY, and nobody has ruled on it. ERIK'S CALL

3 of 4 remaining `own_wording` refusals land at ~26 s: the retry exhausted the Worker's 25 s
`MODEL_DEADLINE_MS` and the FIRST attempt's verdict was reported. Only one (15.8 s) is a genuine
second violation. Answered turns average 12.2 s, refusals 24.8 s.

**Do not "fix" this by raising the deadline.** There are 5 s of headroom before `MODEL_DEADLINE_MS`
crosses the client's `TIMEOUT_MS` (30 s), and that ordering is load-bearing. The lever is
first-attempt latency.

## 4. The letter contains a sentence that was false when sent. ERIK'S CALL — still open

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* The
`own_wording` deploy made it true. Whether a follow-up note goes to the ustadz is Erik's.

## 5. [nama tidak dicatat] is unresolved and deliberately not acted on

Erik named the reviewer [nama tidak dicatat]; every record in `docs/review/` says **Ustadz Ahmad Isrofiel
Mardlatillah**. Asked whether to create a separate record for a second reviewer — **he chose not to
record it yet.** So his standing decision to iterate during testing lives in the session transcript
and in PROGRESS.md, and NOT in `docs/review/`. Do not invent a record for [nama tidak dicatat].

## 6. The aqidah gate is GREEN-ER but still red at 17 — and that is correct

82 → 17 with a control arm showing 0 of 2,367 passing spans broken. The handoff predicted exit 0;
that was wrong. The 17 are a hand-read mix of whole unbroken ayat (real corruption) and a few
artifact shapes the trim does not cover. Erik chose to STOP here. `okf/aqeeda/id/` stays uncommitted.

## 7. QS 7:19 on ruling questions · 8. `neraka` routes to SCRIPTURE · 9. Audio DENGAR click ·
## 10. `MAX_DISPLAY = 2` rights call · 11. Continuous chat PRD — all unchanged, carried forward

---

## Constraints to honor (carried forward — plus five new)

- **NEW — the Fikih router may ONLY re-rank.** `fikih-route.ts` says so and `fiqh-rank.test.ts`
  enforces it. A keyword list is acceptable there ONLY because it cannot admit or refuse a hadith;
  wire it into an admission decision and the whole safety argument is void. Keyword lists have
  failed three times in this repo as GATES.
- **NEW — `entries` must stay gated on `verses.length === 0`.** Only the HADITH lane was widened.
  The entries gate is what stops the ruling index hijacking a real feeling ("aku capek banget sama
  utang" → riba law). Do not "simplify" the two gates into one.
- **NEW — a bucket total across two live runs is not a comparison.** `/api/classify` returned zero
  themes on all 24 turns of one run and some themes on another, which moved `no-grounding` by 3
  turns for reasons unrelated to the change under test. Compare per-question, or compare a row only
  the change could emit.
- **NEW — the first curl after a deploy reads the STALE `index.html` from the edge.** It reported
  the previous bundle hash this session even though the deploy log showed the new asset uploaded.
  Re-check after a beat, with a cache-buster AND `Cache-Control: no-cache`.
- **NEW — `interceptor act` takes `<ref>` with NO `click` keyword.** `act <tab> click e26` treats
  `click` as the ref and `e26` as text to type, and dies with `stale element [undefined]` — which
  looks exactly like the known minimized-window failure and is not it. Also: a SYNTHETIC click does
  not activate a native `<details>`; confirm toggles with a real activation.
- **A sent letter is a commitment and outranks a handoff item.**
- **The renderer STRIPS `[H:…]` markers before display** — capture the `/api/answer` RESPONSE, never
  `innerText`, when judging a guard.
- **The sentence splitter breaks a quote pair when the full stop sits inside the closing quote.**
  This is why `wordingShape` allows an unterminated span AND why adjacency is measured over the
  whole prose rather than per sentence.
- **A `value=` attribute does NOT survive the Artifact publish wrapper.**
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **A "lane X never renders" claim needs a control arm that makes it render.**
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
- **Force-red every new test.** Two of the fiqh-router tests passed under mutation this session and
  had to be rewritten; they were pinning nothing.
- **Never Python.** TypeScript/bun for every script, including the wrap's own table parsers.
- **frequency has failed THREE times against this index. Do not try IDF again.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.**
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.**
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.** New Indonesian goes through the
  IndonesianPolish skill — but match the LOCAL register.
- **Never hand-set ISA `progress:`.** Compute it. It was wrong two sessions running.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.** Committable only when `aqeeda:verify-id` exits 0.
- **Routes and identifiers stay `hadis`** (`#/hadis`, `nav-hadis`, `renderHadis`, `.hadith-*`) even
  though the reader-facing label is now **Hadits**. So does the system prompt's
  `"Hadis yang terambil"` heading — it is paired with the grounding builder's matching header.

## Open items waiting on me (the user)

- **ISC-487 — the wall's latency cost** (§3): accept it, or spend a session on first-attempt latency?
- **A follow-up note to Ustadz Ahmad?** (§4) — the letter's hadith sentence was false when sent.
- **Who is [nama tidak dicatat]?** (§5) — declined to record for now; still unresolved.
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b). Do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** Prod-only chosen twice; both now several
  deploys behind, and `new-quranku-ai` SHARES `web/dist` so it needs a synthesis rebuild first.
- **The audio DENGAR click** (§9) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (§10) — a rights call.

---
# Next session — New-Quranku (checkpoint 2026-08-17 late-3)

> Prepended by /wrap 2026-08-17 late-3. Anchor `bb4e951` — the `own_wording` wall, **committed and
> NOT deployed**. The wrap's own checkpoint commit sits directly above it and touches only
> `PROGRESS.md`, `ISA.md` and this file, so `origin/main` being one ahead of the anchor is expected.
> Supersedes the `5d0ce87` anchor.
> That handoff's **items 2, 6 and 10 are DISCHARGED** — 2 sent by Erik, 6 built/deployed/verified,
> 10 published and a defect in it fixed. Its **item 3 is INVERTED, not done — read §1 before
> touching the prompt.** Items 1, 4, 5, 7, 8, 9 survive and are carried forward.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-17 (late-3)**).

**Current state.** Gates green — `bun test` **1538/0** exit 0 · typecheck exit 0 ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 488/499** (the front-matter said 500; the
computed count is 499 — second consecutive session the hand-written denominator was wrong). Clean
tree except untracked `WARP.md` — leave it. **PROD IS ONE COMMIT BEHIND**: worker `baaf3b21` serves
bundle `index-BBTkDZJz.js` with this morning's copy fixes, but NOT the `own_wording` wall. The
hadith generator remains STOPPED (1,746/14,736).

**Second repo:** `~/printing-press/library/tafseer-okf` is clean and pushed at `b5ea6ea0`.

---

## 1. DO NOT install the God/unseen filter. The sent letter forbids it. READ THIS FIRST

The previous handoff said "fix `SYNTHESIS_SYSTEM_PROMPT` for ISC-419/420 after the letter is sent".
The letter is now sent, and **its question 3 explicitly commits us to the opposite**: *"Kami perlu
tahu batas yang Ustadz anggap benar sebelum kami memasang aturan penyaringnya."* It also reports as
measured fact that **8 of 8** live answers carry an unattributed claim about Allah or the unseen.

Installing that rule now would break a promise in a letter already in his hands AND make the 8/8
figure stale while he is reading it. **ISC-464(b) is blocked on the ANSWER, not the send.** This is
the ISC-423 trap in the other direction. Do not "unblock" it because a handoff line says so.

## 2. Deploy the `own_wording` wall — and re-measure, because 38% is a first-generation number

`bb4e951`. `cd worker && bunx wrangler deploy`, then re-run the same 8 questions live and tabulate
every outcome bucket. Measured cost on live prose: **3 of 8 authored answers refused on the first
generation, 0 of the 5 clean ones touched.** The Worker's retry is open (2026-08-16), so the reader
only loses an answer that violates TWICE — that residue is the number nobody has yet.

Do not judge it on the first post-deploy request, and clear `CacheStorage` before probing.

## 3. The letter contains a sentence that was false when it was sent. ERIK'S CALL

*"Aplikasi tidak pernah menampilkan teks hadis dalam bahasa Indonesia hasil mesin."* Measured false
twice on 2026-08-17 — the model wrote hadith wording in Indonesian in its prose (sourced, with a
card below, but on the screen). Item 2's deploy makes it true. Whether a short follow-up note goes
to Ustadz Ahmad is Erik's, not ours.

## 4. The aqidah gate is still red at 82 — JUDGEMENT CALL, unchanged. ERIK'S CALL

`bun run aqeeda:verify-id` exits **1**: 2,367 exact, 0 nfc-only, **82 MISSING**. The source-side
`scriptureQuotes` regex in `tool/lib/splice-scripture.ts` over-captures the author's connective prose
into the "quotation" (73% of the 82 contain a prose connector against 1.1% of the 2,367 correct
spans — 66× enrichment), so those spans could never appear verbatim in a translation. Tightening it
NARROWS WHAT THE GATE ASSERTS, which is why it was not just done. Probe if approved: tighten, re-run
`aqeeda:repair-id --apply`, `aqeeda:verify-id` must exit 0, then re-run the 1.1% control to confirm
real quotations did not start dropping.

## 5. Two sibling Workers are still on older deploys

`new-quranku-ai` (`--env synthesis`, shares `web/dist`) and `demo-quranku` (`--env demo`, needs
`bun run demo:build` first). Erik chose prod-only on 2026-08-17. Ask before deploying either.

## 6. QS 7:19 on ruling questions — PRE-EXISTING, seen twice. Do not open without a control set

Still surfaces on `apa hukum riba dalam islam dan kenapa dilarang`. Within-chapter ranking, the axis
where frequency has failed three times.

## 7. `apa yang al quran katakan tentang neraka` still routes to the SCRIPTURE chapter

The COPY is fixed (the reader is now told which chapter was searched, so the mis-route is visible)
but the ROUTING is not: the literal words `al quran` capture routing and `neraka` is ignored. Needs
a control set captured first, per the standing rule.

## 8. Audio DENGAR on the `#/baca` shelf card — blocked on one click from Erik

## 9. `MAX_DISPLAY = 2` — a rights call · 10. Continuous chat PRD — unchanged

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a sent letter is a commitment, and it outranks a handoff item.** Before changing behaviour
  the letter describes, re-read the letter. §1 exists because the handoff and the letter disagreed.
- **NEW — the renderer STRIPS `[H:…]` markers before display**, so DOM text is not what the guard
  sees. A guard verdict computed from `innerText` is computed from the wrong artefact; this produced
  a confident "the hadith wall is bypassed" that was false. Capture the `/api/answer` RESPONSE.
- **NEW — the sentence splitter breaks a quote pair when the full stop sits inside the closing
  quote** (`…bagi mereka.”`), which is how real prose is written. A strictly-paired quote pattern
  matches nothing on real answers. `QUOTED_SPAN` allows an unterminated span for this reason.
- **NEW — `interceptor act` on a ref from before a full document load silently no-ops.** Three asks
  were lost to it. Refresh the ref map with a `tree` call at the top of every round.
- **NEW — `interceptor navigate` to a URL differing only in the HASH does not reload.** The thread
  survived a `localStorage.clear()` because of this and faked a 27-turn "fresh" page.
- **A `value=` attribute on a form control does NOT survive the Artifact publish wrapper.** Drive
  defaults from the constant in JS.
- **The `dari bab` label is CSS-generated** — count `a.know-cat` ELEMENTS, never search text.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s**, not at settle.
- **A "lane X never renders" claim needs a control arm that makes it render.**
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`. It
  also silently discards the REST of a compound command.
- **Force-red every new test, and check the mutation actually applied** — and check WHY it went red.
  A benign-case test here passed at threshold 3 and at 8; it was pinning nothing.
- **Never Python.** TypeScript/bun for every script, including throwaway probes and the wrap's own
  table parsers.
- **frequency has now failed THREE times against this index. Do not try IDF again.**
- **`ACTION_FRAME` is deliberately NOT consulted by `subjectWordsOf`.** **`RULING_FRAME` is excluded
  from shard SELECTION only.** **`stemReach`'s one-directional rule is the `musik` guard.**
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.**
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code** — and the
  FIRST fetch after a deploy can still serve the old bundle from the edge.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL.** All new Indonesian goes through the
  IndonesianPolish skill — but match the LOCAL register: the knowledge surface is informal `aku`.
- **Never hand-set ISA `progress:`.** Compute it. Wrong two sessions running.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE.** It may only be committed when `aqeeda:verify-id`
  exits 0.
- **Do not re-translate to fix a splice.** Measure the failure class first.

## Open items waiting on me (the user)

- **Deploy the `own_wording` wall?** (§2) — built, tested, unshipped. Changes what readers get.
- **A follow-up note to Ustadz Ahmad?** (§3) — the letter's hadith sentence was false when sent.
- **The aqidah extractor** (§4) — narrow what the gate asserts, or leave it red at 82?
- **The ustadz's ANSWER** — carries ISC-417, ISC-419/420 and ISC-464(b) with it. Nothing to do but
  wait; do not pre-empt it (§1).
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** (§5)
- **The audio DENGAR click** (§8) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (§9) — a rights call.

---
# Next session — New-Quranku (checkpoint 2026-08-17 late)

> Prepended by /wrap 2026-08-17 late. Anchor `5d0ce87` — **the DEPLOYED and verified state**; the
> wrap's own checkpoint commit sits directly above it and touches only `PROGRESS.md` and this file,
> so `origin/main` being one commit ahead of the anchor is expected, not drift.
> Supersedes the `4daa219` anchor.
> That handoff's **items 1, 2, 4 and 6 are DISCHARGED** — 1 built+deployed+verified, 2 pushed with
> the basis recorded, 4 rewritten and ready for Erik to send, 6 decided (no change). Its item 3 is
> HALF discharged; the rest survive and are carried forward below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-17 (late)**).

**Current state.** Gates green — `bun test` **1517/0** exit 0 · typecheck exit 0 ·
`VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 488/500.** Clean tree except untracked
`WARP.md` — leave it. **PROD IS CURRENT AND VERIFIED THIS SESSION**: worker `f3fc6ab4`, bundle
`index-De6rz3fV.js`, `EDITION: "synthesis"`. Unlike the last three handoffs there is no undeployed
commit and no stale dist — `web/dist` currently holds a SYNTHESIS build, which is what prod wants.
The hadith generator remains STOPPED (1,746/14,736).

**A SECOND REPO IS IN PLAY:** `~/printing-press/library/tafseer-okf` (private,
`erikgunawans/tafseer-okf`), now PUSHED and clean at `49ebf8c3`. Its `okf/aqeeda/id/` lane is
gitignored on purpose and holds 199 records repaired this session but never committed — that is the
gitignore working, not an omission.

---

## 1. The aqidah gate is still red at 82 — and making it green is a JUDGEMENT CALL. ERIK'S CALL

`bun run aqeeda:verify-id` exits **1**: 2,367 exact, **0 nfc-only**, **82 MISSING**. The nfc-only
half was fixed this session offline at zero cost (see PROGRESS.md). The 82 are a DIFFERENT defect
and were deliberately left alone.

**Diagnosis, measured:** the source-side extraction regex in `tool/lib/splice-scripture.ts`
(`scriptureQuotes`) over-captures — it runs from `تعالى:` to the next bracketed citation, and when
the author's connective prose sits inside that span (`وقال سُبحانَه:`, `وهذا يشمَلُ`, `الآية`) the
"quotation" is not scripture at all. It can therefore never appear verbatim in a translation, and
the translator was RIGHT to translate it. Evidence with a control arm: **73%** of the 82 contain a
prose connector against **1.1%** of the 2,367 correctly-spliced spans — a 66× enrichment.

**Why it was not just fixed:** tightening that regex NARROWS WHAT THE GATE ASSERTS, and the gate is
what stands between a partial machine-translated aqidah lane and a commit. Making a red gate green
by weakening the check is exactly the move that needs Erik's eyes, not mine.

Probe if he approves: tighten `scriptureQuotes` to stop a span at a prose connector, re-run
`aqeeda:repair-id --apply`, then `aqeeda:verify-id` must exit 0 — and re-run the 1.1% control to
confirm the tightening did not start dropping REAL quotations.

## 2. Send the ustadz letter — READY, waiting only on Erik

`docs/review/tanya-ai-request-2026-08-17.md` (the letter) and
`docs/review/tanya-ai-request-2026-08-17-pengantar.md` (the WhatsApp text). Erik chose "you send it
— I'll prep the message" on 2026-08-17. Both are written, polished through IndonesianPolish, and
committed. **Nothing leaves this machine.** The old `hukum-pin-request-2026-08-12.md` is marked
SUPERSEDED — do not send it, it contains a sentence that is false.

This letter carries ISC-417/418/419/420 with it. If he answers, several ISA items unblock at once.

## 3. ISC-419 / ISC-420 — the receipt half of the critique. STILL BLOCKED ON THE ANSWER TO ITEM 2

Unchanged. All 8 real prod paragraphs carry an unattributed claim about God or the unseen; a receipt
guard as prescribed refuses ~100% of answers. **Recommended path unchanged:** fix
`SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue, guard only what is left.

## 4. Two sibling Workers are on older deploys

Only prod (`new-quranku-proxy`) was deployed this session. `new-quranku-ai` (`--env synthesis`) and
`demo-quranku` (`--env demo`) are untouched. `new-quranku-ai` shares `web/dist`, so
`cd worker && bunx wrangler deploy --env synthesis` would ship this same build to it; the demo needs
`bun run demo:build` first because it serves `web/dist-demo`. Erik did not ask for either — ask
before deploying them.

## 5. QS 7:19 on ruling questions — PRE-EXISTING, seen twice

Still surfaces on `apa hukum riba dalam islam dan kenapa dilarang`. Within-chapter ranking, the axis
where frequency has failed three times. **Do not open without a control set.**

## 6. Two copy defects, both authored-surface, both their own diff (unchanged)

- The zero-entry pointer misstates the cause (`"Pertanyaan soal {category} itu luas"`).
  `apa yang al quran katakan tentang neraka` routes to the SCRIPTURE chapter because the literal
  words `al quran` capture routing and `neraka` is ignored. A narrow question told it is too broad.
- `main.ts`'s scholar-voice sentence still presents an app-ranked, 8-capped subset.

## 7. Audio DENGAR on the `#/baca` shelf card (unchanged, blocked on one click from Erik)

## 8. `MAX_DISPLAY = 2` (unchanged — a rights call) · 9. Continuous chat PRD (unchanged)

## 10. Optional: publish the 3D graph as an Artifact

`graph/okf-graph-3d.html` in tafseer-okf is self-contained and holds only structural metadata — no
corpus text — so it is safe to publish. Two attempts 502'd from the artifact service; retry.

---

## Constraints to honor (carried forward — plus four new)

- **NEW — the model transliterates Arabic citations into Latin.** `[البقرة: 173]` becomes
  `[al-Baqarah: 173]`. Never anchor a splice, a match, or a test on a bracketed surah citation
  surviving a translation. Anchor on the AYAH.
- **NEW — `nfc(text).indexOf(x)` returns an index into the NORMALIZED string** and cannot be used to
  splice the original. Walk canonical-composition clusters (starter + its combining marks) to get a
  normalized view AND a byte-accurate map back in one pass.
- **NEW — before reporting a corpus-match number, run the control.** A test that recognised only
  36.4% of KNOWN-GOOD spans was about to be reported as "1,573 spans are prose". Ask what the
  instrument says about cases you already know the answer to.
- **NEW — the screenshot times out on this app's gradient ground.** Documented Interceptor limit,
  not a minimized window and not a stale extension. Substitute `eval --main` computed-style probes
  and STATE the missing-pixel gap; do not loop past ~3 attempts.
- **The `dari bab` label is CSS-generated** (`styles.css`, `.know-cat::before{content:"dari bab "}`).
  `textContent` searches return 0 on a perfectly-rendering page. Count `a.know-cat` ELEMENTS.
- **Sample a progressively-upgraded UI across the WHOLE window at 2 s resolution**, not just at
  settle. A settle-only reading says "unseen"; the truth was "shown and retracted".
- **A "lane X never renders" claim needs a control arm that makes it render.** Patching
  `window.fetch` to reject `/api/answer` is the one that works here.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
  It also silently discards the REST of a compound command.
- **Force-red every new test**, and check the mutation actually applied before trusting the red.
- **Never Python.** House rule — TypeScript/bun for every script, including throwaway probes.
- **frequency has now failed THREE times against this index. Do not try IDF again.**
- **`ACTION_FRAME` is deliberately NOT consulted by `subjectWordsOf`.** **`RULING_FRAME` is excluded
  from shard SELECTION only and must NOT feed `isFrameWord`.** **`stemReach`'s one-directional rule
  is the `musik` guard.** Do not tidy any of these away.
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.** Clear it before probing.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`.
- **Verify a deploy by SERVED BYTES and a remote SHA, never by the command's exit code.**
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** Erik decided
  2026-08-17 to leave both and accept the ~10% tail silence.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** All new Indonesian
  goes through the IndonesianPolish skill.
- **Never hand-set ISA `progress:`.** Compute it. It was found off by one this session.
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE** — a partial lane in git looks exactly like a
  complete one. It may only be committed when `aqeeda:verify-id` exits 0.
- **Do not re-translate to fix a splice.** Measure the failure class first; the last prescribed
  re-translation would have cost ~245 records × ~3 min to reproduce the same bug.

## Open items waiting on me (the user)

- **The aqidah extractor** (item 1) — narrow what the gate asserts, or leave it red?
- **Send the ustadz letter** (item 2) — written and ready; only Erik can send it. It carries
  ISC-417 (he has still never signed off on AI-authored answers at all) and ISC-419/420 with it.
- **Deploy `new-quranku-ai` and/or `demo-quranku`?** (item 4) — both are on older builds.
- **The audio DENGAR click** (item 7) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 8) — a rights call.

---

# Next session — New-Quranku (checkpoint 2026-08-17)

> Prepended by /wrap 2026-08-17 (anchor `4daa219` (the checkpoint commit; this line was fixed by the follow-up commit above it)). Supersedes the late-4 anchor `0446c2b`.
> That handoff's **item 1 is DISCHARGED** (measured, answered, and inverted — see below). Its items
> 2, 3, 4, 5, 6, 7, 8, 9 survive and are carried forward.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-17**).

**Current state.** Gates green — `bun test` **1505/0** exit 0 · typecheck exit 0 · `VITE_ANSWER_MODE=
synthesis bun run build` exit 0. **ISA 487/499.** Clean tree except untracked `WARP.md` — leave it.
**NOTHING WAS DEPLOYED THIS SESSION** — the light-theme hairline is committed and unshipped, so prod
still serves bundle `index-DZQQeRQP.js`. The hadith generator remains STOPPED (1,746/14,736).

**A SECOND REPO IS IN PLAY THIS SESSION:** `~/printing-press/library/tafseer-okf` (private,
`erikgunawans/tafseer-okf`). Three commits there, **unpushed**, held deliberately — see item 2.

---

## 1. ISC-476 — the knowledge card is shown for four seconds, then taken away. ERIK'S CALL

Measured on prod: `FAST_ANSWER_MS = 9000` renders the principled turn (often the knowledge card,
with the ISC-472 `dari bab` tags) at ~T+12 s, and `main.ts:934` replaces the whole node when the AI
lands at ~T+16 s. The reader begins reading Ustadz Muhammad Thalib's cited entries and has them
swapped for app-authored prose mid-sentence.

**Two options and they promise the reader different things** — this is a design decision, not a
defect to patch: (a) keep the scholar's entries BELOW the composed answer instead of replacing them,
or (b) stop rendering a card that is going to be retracted, and show only the composing state until
the answer lands. Do not pick one without Erik.

Probe to assert either fix: sample `a.know-cat` count at 2 s resolution from submit to T+20 s and
require it never goes 1 → 0.

## 2. Push the `tafseer-okf` commits? — NEEDS ERIK, because of the licence gap

Three commits sit unpushed at `~/printing-press/library/tafseer-okf`:
`14f402e9` (QTT lane), `fbb61968` (3D graph), `b6a4abbb` (graph a11y).

**Why they were held:** `14f402e9` adds 6,350 records of Ustadz Muhammad Thalib's Tarjamah
Tafsiriyah, and **no licence, permission letter, or clearance record for that text exists in either
repo** — I searched both. quran-new displays it as `display_role: "primary"` on Erik's standing call,
which is a decision about the app, not a grant covering a redistributable corpus. Owning
`quran.tarjamahtafsiriyah.com` is not owning the copyright; that sits with Ustadz Muhammad Thalib /
Majelis Mujahidin Indonesia. The repo is PRIVATE and the existing Dorar/sunnah.com lanes are also
`reference-only`, so pushing is consistent with precedent — but it is Erik's call, not mine.
**Ask him for the permission basis and record it in the lane's `clearance_path`.**

## 3. Aqidah Indonesian is 1,454/1,454 but the GATE IS RED — resume point is precise

`bun run aqeeda:verify-id` exits **1**: **245 of 1,454 records carry `scripture_issues`** (315
nfc-only, 82 MISSING quotations). All files exist; `okf/aqeeda/id/` stays gitignored and
uncommitted, which is exactly what that gitignore is for.

**Do NOT blindly run the resume doc's prescribed fix** (`rg -l '^scripture_issues: [1-9]' … | xargs
rm -f && bun run aqeeda:translate-id`). The defect rate has been ~18-22% across three separate runs,
which is the signature of something SYSTEMATIC, not transient — deleting and re-translating 245
records may reproduce it exactly and spend real money doing so. **First** read `spliceScripture()` /
`checkPreserved()` in `tool/translate-aqeeda-id.ts` and establish why the splice mis-anchors on
these citations; `nfc-only` means the splice found the quote but the stored bytes differ in
combining-mark order, `MISSING` means it did not find it at all. Fix the splice, then re-run.

## 4. Send `hukum-pin-request` to Ustadz Ahmad? — NEEDS ERIK (now FOUR sessions old)

`docs/review/hukum-pin-request-2026-08-12.md`, status `BELUM DIKIRIM`. Unchanged.

## 5. ISC-419 / ISC-420 — the receipt half of the critique. STILL BLOCKED ON ERIK

Unchanged. Every one of 8 real prod paragraphs carries an unattributed claim about God or the
unseen; a receipt guard as prescribed refuses ~100% of answers. **Recommended path unchanged:** fix
`SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue, guard only what is left.

## 6. `MODEL_DEADLINE_MS` — Erik's call, numbers unchanged

Ten prod samples, median 7.5 s, tail to 25.4 s. Raising it cannot happen without the client's 30 s
`TIMEOUT_MS` moving with it (ISC-466).

## 7. QS 7:19 on ruling questions — PRE-EXISTING, and now seen twice

Still surfaces on `apa hukum riba dalam islam dan kenapa dilarang` — visible in this session's
control-arm screenshot. Within-chapter ranking, the axis where frequency has failed three times.
**Do not open without a control set.**

## 8. Two copy defects, both authored-surface, both their own diff (unchanged)

- The zero-entry pointer misstates the cause (`"Pertanyaan soal {category} itu luas"`). **Newly
  reproduced this session**: `apa yang al quran katakan tentang neraka` routed to the SCRIPTURE
  chapter (`Al-Qur'an, Taurat, Injil, dan Zabur`, 111 entries) because the literal words `al quran`
  captured routing and `neraka` was ignored. A narrow question told it was too broad.
- `main.ts`'s scholar-voice sentence still presents an app-ranked, 8-capped subset.

## 9. Audio DENGAR on the `#/baca` shelf card (unchanged, blocked on one click from Erik)

## 10. `MAX_DISPLAY = 2` (unchanged — a rights call) · 11. Continuous chat PRD (unchanged)

## 12. Optional: publish the 3D graph as an Artifact

`graph/okf-graph-3d.html` is self-contained and holds only structural metadata (names, counts) — no
corpus text — so it is safe to publish. Two publish attempts **502'd** from the artifact service
during the wrap; retry when it recovers.

---

## Constraints to honor (carried forward — plus five new)

- **NEW — a fall-through lane is not invisible, it FLASHES.** Sample a progressively-upgraded UI
  across the whole window from submit to settle at 2 s resolution, not just at the endpoint. A
  settle-only reading said `knowcat=0` and would have shipped "the feature is unseen"; the truth was
  "shown and retracted", a different defect with a different fix.
- **NEW — the `dari bab` label is CSS-generated** (`styles.css:1144`,
  `.know-cat::before{content:"dari bab "}`). `textContent` searches return 0 on a perfectly-rendering
  page. Count `a.know-cat` ELEMENTS; confirm the words by screenshot only.
- **NEW — a "lane X never renders" claim needs a control arm that makes it render.** Patching
  `window.fetch` to reject `/api/answer` is the one that works here.
- **NEW — when a generator stalls at N of M, compare the size distribution of DONE vs MISSING before
  re-running.** The aqidah leftovers were the long tail, not the queue's end, and an unchanged
  re-run would have spent 12 hours reproducing the same timeout.
- **NEW — Arabic must be normalised on BOTH sides before matching.** The `tafseer/ar` lane stores
  surah names fully vowelled, citations are bare; a naive match resolved 6% and still rendered a
  convincing graph. Strip diacritics, fold alef/teh-marbuta/alef-maqsura and the article.
- **`interceptor macos screenshot` grabs Chrome's VISUAL FRONT tab**, which is Erik's tab, not the
  driven one. Prefer `interceptor screenshot` (DOM render) — and note a backgrounded tab is
  rAF-throttled to ~1 fps, so an animated page will not settle while it is behind another tab.
- **After `interceptor navigate`, element refs go STALE.** Re-read the tree. Count `#thread` turns
  before AND after every submit — that is what caught a silent no-op this session.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — redirect to a file, echo `$?`.
  It also silently discards the REST of a compound command, which is how a `cat >> test.ts` append
  vanished this session and a "force-red" then passed against a test that was never added.
- **Force-red every new test**, and check the mutation actually applied — a `python3` assert that
  fails leaves the file untouched and the green run looks like a passing force-red.
- **A test can assert the FIXTURE rather than the guard.** Prefer asserting the invariant.
- **frequency has now failed THREE times against this index. Do not try IDF again.** The separator
  is word CLASS.
- **`ACTION_FRAME` is deliberately NOT consulted by `subjectWordsOf`.** **`RULING_FRAME` is excluded
  from shard SELECTION only and must NOT feed `isFrameWord`.** **`stemReach`'s one-directional rule
  is the `musik` guard.** Do not tidy any of these away.
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
- **Widening may never MANUFACTURE an answer.** Honest silence stands.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.**
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** All new Indonesian
  goes through the IndonesianPolish skill.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES `bun run app:topic-subjects`** — it is GENERATED.
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736.
- **`okf/aqeeda/id/` is gitignored ON PURPOSE** — a partial lane in git looks exactly like a
  complete one. It may only be committed when `aqeeda:verify-id` exits 0.

## Open items waiting on me (the user)

- **ISC-476 — keep the scholar's entries below the AI answer, or stop showing a card that will be
  retracted?** (item 1). Design decision, mine to make.
- **Push the three `tafseer-okf` commits, and what licence backs Tarjamah Tafsiriyah?** (item 2).
- **Send `hukum-pin-request` to Ustadz Ahmad?** (item 4) — FOUR sessions old.
- **ISC-419/420 — may the app assert things about God without citation?** (item 5). Theological.
- **ISC-417 — Ustadz Ahmad has still never signed off on AI-authored answers at all.**
- **`MODEL_DEADLINE_MS`** (item 6) — raise it, or accept the ~10% tail silence?
- **The audio DENGAR click** (item 9) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 10) — a rights call.

---

# Next session — New-Quranku (checkpoint 2026-08-16 late-4)

> Prepended by /wrap 2026-08-16 late-4 (anchor `0446c2b`). Supersedes the late-3 anchor `32a1ecc`.
> That handoff's **item 1 is DISCHARGED** (deployed + verified live) and **item 5 is DISCHARGED**
> (retrieval widened, deployed, verified). Its items 2, 3, 4, 7, 8, 9 survive verbatim below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-16 (late-4)**, anchor
`origin/main` `0446c2b`).

**Current state.** Gates green — `bun test` **1503/0** exit 0 · typecheck exit 0 (five chained
`tsc` passes) · `VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 485/496** (+7 this
session: ISC-469..475). Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands
directly on `main`. The hadith generator is STOPPED and must stay stopped (1,746/14,736).

**PROD IS CURRENT AND VERIFIED.** Worker `bd46704a`, built from `0446c2b`, `EDITION: "synthesis"`.
Five deploys landed this session, each checked against SERVED bytes and then in real Chrome.
Unlike the last two handoffs there is no undeployed commit and no stale dist.

---

## 1. Confirm the `dari bab` tags are a SETTLED view, not a pre-settle one — TOP ITEM

The cross-chapter attribution (`dari bab Ekonomi Islam`) and the amended sentence (*"...dan bab
lain yang membahas hal serupa"*) are shipped and were seen rendering correctly. But the **synthesis
lane supersedes the knowledge card on many questions**, and one reading this session was taken
mid-flight and later replaced — 8 refs and 7 tags at one moment, 0 a few seconds later, because
`/api/answer` returned and swapped the turn.

So: drive 5+ questions through the real UI, wait for FULL settle (30 s+), and record for each
whether the reader's final view is the knowledge card or the AI lane. **Count `#thread` turns
before and after, and re-read after 30 s** — a reading taken before the async upgrade lands is not
the reader's view. If the knowledge card is rarely the settled view, the ISC-472 copy is shipped
but largely unseen, and that is worth knowing before more work goes into it.

## 2. Send `hukum-pin-request` to Ustadz Ahmad? — NEEDS ERIK (unchanged, now THREE sessions old)

`docs/review/hukum-pin-request-2026-08-12.md`, status `BELUM DIKIRIM`, asks *"Bolehkah 4:25 kami
keluarkan dari hasil pertanyaan nikah?"* THREE changes have now landed in its territory. It has
never been sent.

## 3. ISC-419 / ISC-420 — the receipt half of the critique. STILL BLOCKED ON ERIK

Unchanged. Measured against real prod prose: **every one of 8 paragraphs carries at least one
unattributed claim about God or the unseen.** A receipt guard as prescribed refuses **~100%** of
answers. **Deliberately NOT built.** Worst example: *"Allah tidak pernah bosan menerima hamba-Nya
yang kembali"* — a hadith rendered as the app's own sentence. **Recommended path (unchanged):** fix
`SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue on real prose, guard only what is left.

## 4. `MODEL_DEADLINE_MS` — Erik's call, with numbers behind it (unchanged)

Ten samples through the real UI: `5554 · 6073 · 6554 · 6924 · 7016 · 7984 · 8525 · 13074 · 19453 ·
25445` ms. **Median 7.5 s**, and the one silent turn was `ms:25445, answer:null, blocked:null` —
the 25 s Worker deadline. Raising it **cannot happen without the client's 30 s `TIMEOUT_MS` moving
with it** (ISC-466). The median is fine; the tail is what kills.

## 5. QS 7:19 on ruling questions — PRE-EXISTING, newly visible

`apa hukum riba dalam islam dan kenapa dilarang` still surfaces *"Adam dan istrinya disuruh tinggal
di surga tetapi dilarang mendekati sebuah pohon"*. It is in the ROUTED chapter, so it was reachable
long before the widening and is NOT from ISC-469 — the widening merely made it easy to notice. It
is a within-chapter ranking question (`dilarang` scoring on an off-subject caption), which is the
axis where frequency has already failed three times. Do not open it without a control set.

## 6. Two copy defects, both authored-surface, both their own diff (unchanged)

- **The zero-entry pointer misstates the cause.** It says *"Pertanyaan soal {category} itu luas"*,
  blaming the question's breadth, when for a narrow question the real cause is that the index holds
  no on-subject line. `knowledge.ts` states both halves; the copy carries one.
- **`main.ts`'s scholar-voice sentence** presents an app-ranked, 8-capped subset. ISC-472 made it
  MORE true (borrowed lines now name their chapter); it did not fix the 8-cap framing.

## 7. Audio — DENGAR on the `#/baca` shelf card (unchanged, blocked on Erik)

Decided: the button goes on the `#/baca` shelf card (`read.ts`, `indexRow`). **Blocked on one
click:** Erik must open `quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted
player can be read out of the DOM — autoplay policy rejects programmatic clicks. **Do not loop on
coordinate clicks.** The shelf card is a single `<a href>` wrapping its inner layer, so a nested
`<button>` is invalid and would navigate; the card needs restructuring.

## 8. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's
terms, not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.**

## 9. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every
rule is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question`
events too?

---

## Constraints to honor (carried forward — plus four new)

- **NEW — probe with the question a PERSON types, not the one you type.** The ruling-word defect
  (ISC-473) shipped because the probe asked `hukum riba dalam islam` and dropped the trailing `dan
  kenapa dilarang`. Erik's screenshot of the live app found it. TWICE this session looking at the
  screen beat measuring; budget for both.
- **NEW — `RULING_FRAME` is excluded from shard SELECTION only and must NOT feed `isFrameWord`.**
  A ruling word is a real ranking signal inside a chapter and a false one for picking chapters.
  Selection asks which chapters the question is about; ranking asks whether an entry is about what
  was asked. Do not tidy the asymmetry away.
- **NEW — widening may never MANUFACTURE an answer.** If the routed chapter matched nothing
  on-subject, the honest silence stands. Removing this took four safety guards red at once.
- **NEW — a reading taken before the async upgrade settles is not the reader's view.** A probe
  showed 8 refs and 7 chapter tags; seconds later the same thread held 0, because `/api/answer`
  returned and replaced the turn. Wait 30 s, then re-read.
- **A test can assert the FIXTURE rather than the guard.** Two `answer.test.ts` cases pinned a
  hand-built question returning exactly one unresolvable entry — true only while retrieval read one
  shard. Prefer asserting the invariant; force-red every guard by neutering the code it guards.
- **frequency has now failed THREE times against this index. Do not try IDF again.** The separator
  is word CLASS — `STOP`, `QUESTION_FRAME`, `ACTION_FRAME`, and now `RULING_FRAME`.
- **`ACTION_FRAME` is deliberately NOT consulted by `subjectWordsOf`.** Adding it there would move
  every slug pinned in `topic-broad-tier.test.ts`.
- **A routing/ranking test that asserts a SLUG proves nothing about what the reader gets.** Assert
  literal REFS (`web/src/entry-ranking.test.ts`, `web/src/shard-spread.test.ts`), and force-red with
  a POPULATED array — `refsOf` collapses a `null` return to `[]`, so `not.toContain` passes
  vacuously if retrieval merely dies.
- **`stemReach`'s one-directional rule is the `musik` guard. Do NOT make it bidirectional.**
- **`MAX_SPREAD` had been doubling as an ad-hoc stopword list.** Re-run the FEELING tests if you
  widen the tiers again; four exist for exactly this.
- **A router change needs a CONTROL SET captured before the change, asserted as literal slugs.**
- **A comment that QUOTES retired copy can fail the anti-test guarding it.** Paraphrase instead.
- **The corpus-gap copy must never claim the corpus is empty.** `EDITION` is `synthesis`, so the
  app must also never describe itself as one that declines to answer ajaran.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.** Clear caches, hard-reload,
  confirm the loaded css/js HASH before measuring anything.
- **A symbol grep cannot prove presence OR absence after minification** — probe string LITERALS,
  and make sure the negative control is formed the same way as the test. A control that shares the
  test's bug is not a control.
- **`wrangler deploy` reporting "2 new assets" is not proof the JS did not ship.** Verify by what
  prod SERVES.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`, and check `.build-meta.json` says `synthesis` AND its
  `gitSha` matches HEAD. (`.build-meta.json` is NOT served — a fetch returns the SPA fallback.)
- **An identical bundle hash after a rebuild is not proof the build did nothing** — the previous
  dist may have been built from the same working tree before the commit. Check `.build-meta`'s
  `gitSha` and a literal probe, not the filename.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).**
- **All new Indonesian goes through the IndonesianPolish skill.** `menyinggung` was caught that way
  — it reads first as *offend*, which is expensive on a religious surface.
- **`interceptor eval` only prints STRING returns.** Wrap every probe in `String(...)`. Pin
  `interceptor tab switch <id>` in the SAME Bash command as every eval/screenshot. After
  `interceptor navigate`, element refs go STALE — re-read the tree, or the submit silently does
  nothing and you measure an empty thread. Recover a lost tab with `tab new <url>`, never a loop.
- **The Bash preflight hook BLOCKS a gate piped into head/tail.** Redirect to a file, echo `$?`,
  then read the file. `cd` does NOT persist between Bash calls — use absolute paths.
- **Measure EVERY outcome bucket after a change, not the one you set out to move.**
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`** — it is
  GENERATED, and it emits TWO tables (`TOPIC_SUBJECTS` + `TOPIC_BROAD`).
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736 pending a ruling.

## Open items waiting on me (the user)

- **Send `hukum-pin-request` to Ustadz Ahmad?** (item 2) — THREE changes have now landed in its
  territory and it has still never been sent.
- **ISC-419/420 — may the app assert things about God without citation?** (item 3). Theological,
  not engineering. The prompt-first path needs a go-ahead before any guard work starts.
- **ISC-417 — Ustadz Ahmad has still never signed off on AI-authored answers at all.** Recorded as
  Erik's knowing call; `EDITION="synthesis"` is live and the app authors prose today. The
  cross-chapter attribution shipped this session widens what the reader sees of the scholar's
  material, and he has not seen it.
- **`MODEL_DEADLINE_MS`** (item 4) — raise it above 25 s, and the client's 30 s with it, or accept
  the current ~10% tail silence?
- **The audio DENGAR click** (item 7) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 8) — a rights call, not a scholarly one.

---

# Next session — New-Quranku (checkpoint 2026-08-16 late-3)

> Prepended by /wrap 2026-08-16 late-3 (anchor `32a1ecc`). Supersedes the late-2 anchor `f10fccc`.
> That handoff's **item 1 is DISCHARGED** — the entry-ranking half is fixed and committed. Its
> items 2-6 survive verbatim and are carried below, plus two new ones this session created.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-16 (late-3)**, anchor
`origin/main` `32a1ecc`).

**Current state.** Gates green — `bun test` **1477/0** exit 0 · typecheck exit 0 (five chained
`tsc` passes) · `VITE_ANSWER_MODE=synthesis bun run build` exit 0. **ISA 478/489** (unchanged —
reactive defect work). Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands
directly on `main`. The hadith generator is STOPPED and must stay stopped (1,746/14,736).

**⚠️ PROD IS ONE COMMIT BEHIND, AND `web/dist` IS STALE.** Prod serves worker `5700421d` / bundle
`index-CdvPLSbA.js`, built from `f10fccc` — the routing fix, NOT the ranking fix. `.build-meta.json`
says `answerMode: synthesis, gitSha: 8cb648b2`, which is ALSO pre-fix. **Do not deploy the dist that
is on disk.** Rebuild with `VITE_ANSWER_MODE=synthesis bun run build`, confirm `.build-meta.json`
names `synthesis` AND a gitSha matching HEAD, then deploy.

---

## 1. Deploy `32a1ecc` and verify the four neraka entries live — BLOCKED ON ERIK'S GO-AHEAD

The ranking fix is committed and unshipped. It narrows what the reader sees of Ustadz Thalib's
entries, which is the OPPOSITE direction from the change Erik already had an open question about,
so it was deliberately not deployed unilaterally. Once he says go: rebuild (see the warning above),
deploy, then verify in a FRESH Interceptor tab with CacheStorage purged and the bundle hash
confirmed — asking *"apa aja sih yang tidak kita sadari kita lakukan yang bisa membuat kita masuk
neraka?"* must return exactly QS 3:131 + 14:28-30 and NOT 24:27 / 24:58 / 2:208.

## 2. Send `hukum-pin-request` to Ustadz Ahmad? — NEEDS ERIK

`docs/review/hukum-pin-request-2026-08-12.md`, status `BELUM DIKIRIM`, asks the exact question this
session's change acts on: *"Bolehkah 4:25 kami keluarkan dari hasil pertanyaan nikah?"* Two changes
have now landed in its territory. Not a blocker for the deploy (see PROGRESS for why), but it is a
pending ask that two sessions have now walked past.

## 3. ISC-419 / ISC-420 — the receipt half of the critique. STILL BLOCKED ON ERIK

Unchanged. Measured against real prod prose: **every one of 8 paragraphs carries at least one
unattributed claim about God or the unseen.** A receipt guard as prescribed refuses **~100%** of
answers. **Deliberately NOT built.** Worst example: *"Allah tidak pernah bosan menerima hamba-Nya
yang kembali"* — a hadith rendered as the app's own sentence. **Recommended path (unchanged):** fix
`SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue on real prose, guard only what is left.

## 4. `MODEL_DEADLINE_MS` — Erik's call, with numbers behind it

Ten samples through the real UI: `5554 · 6073 · 6554 · 6924 · 7016 · 7984 · 8525 · 13074 · 19453 ·
25445` ms. **Median 7.5 s**, and the one silent turn was `ms:25445, answer:null, blocked:null` —
the 25 s Worker deadline. Raising it **cannot happen without the client's 30 s `TIMEOUT_MS` moving
with it** (ISC-466). The median is fine; the tail is what kills.

## 5. The single-shard ceiling — NEW, found this session

The index holds **nine** `neraka` entries across **five** chapters and `retrieveKnowledge` loads
exactly one. Four are reachable; five are not, at ANY ranking quality. `retrievePinned` is the only
multi-shard path and fires for one hand-curated pin. Either widen retrieval for central vocabulary
or pin the limitation in a test — but decide it, do not rediscover it.

## 6. Two copy defects, both authored-surface, both their own diff — NEW

- **The zero-entry pointer misstates the cause.** It says *"Pertanyaan soal {category} itu luas"*,
  blaming the question's breadth, when for a narrow question the real cause is that the index holds
  no on-subject line. `knowledge.ts` states both halves; the copy carries one.
- **`main.ts:597`** presents an app-ranked, 8-capped subset in the scholar's voice (*"Ini yang
  Ustadz Muhammad Thalib kumpulkan soal…"*). This session's diff makes that sentence MORE true; it
  does not fix the framing.

## 7. Audio — DENGAR on the `#/baca` shelf card (unchanged, blocked on Erik)

Decided: the button goes on the `#/baca` shelf card (`read.ts`, `indexRow`). **Blocked on one
click:** Erik must open `quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted
player can be read out of the DOM — autoplay policy rejects programmatic clicks. **Do not loop on
coordinate clicks.** The shelf card is a single `<a href>` wrapping its inner layer, so a nested
`<button>` is invalid and would navigate; the card needs restructuring.

## 8. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's
terms, not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.**

## 9. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every
rule is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question`
events too?

---

## Constraints to honor (carried forward — plus three new)

- **NEW — frequency has now failed THREE times against this index. Do not try IDF again.** Inside
  Perintah dan Larangan the reaches are `lakukan` 1, `membuat` 3, `neraka` 4, `masuk` 9; across all
  2,451 entries `membuat` 8, `neraka` 9, `lakukan` 10. The captions are terse imperative headings,
  so a common verb is not a frequent word. The separator is word CLASS — `STOP`, `QUESTION_FRAME`,
  `ACTION_FRAME`. Read those three docblocks BEFORE touching the ranker.
- **NEW — `ACTION_FRAME` is deliberately NOT consulted by `subjectWordsOf`.** Routing had no
  measured defect; a selection fix has no business moving it. Adding it there would move every slug
  pinned in `topic-broad-tier.test.ts`.
- **NEW — a routing/ranking test that asserts a SLUG proves nothing about what the reader gets.**
  That is how half the reported failure shipped as fixed. Assert literal REFS (see
  `web/src/entry-ranking.test.ts`), and force-red with a POPULATED array — `refsOf` collapses a
  `null` return to `[]`, so `not.toContain` assertions pass vacuously if retrieval merely dies.
- **`stemReach`'s one-directional rule is the `musik` guard. Do NOT make it bidirectional.**
- **`MAX_SPREAD` had been doubling as an ad-hoc stopword list.** If you widen the tiers again,
  re-run the FEELING tests first; four of them exist for exactly this.
- **A router change needs a CONTROL SET captured before the change, asserted as literal slugs.**
- **A comment that QUOTES retired copy can fail the anti-test guarding it.** Paraphrase instead.
- **The corpus-gap copy must never claim the corpus is empty.** `EDITION` is `synthesis`, so the
  app must also never describe itself as one that declines to answer ajaran.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.** Clear caches, hard-reload,
  confirm the loaded css/js HASH before measuring anything.
- **`wrangler deploy` reporting "2 new assets" is not proof the JS did not ship.** Verify by what
  prod SERVES.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`, and check `.build-meta.json` says `synthesis` AND its
  `gitSha` matches HEAD. (`.build-meta.json` is NOT served — a fetch returns the SPA fallback.)
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** The model
  addressing a reader as *"Nak"* is a different axis and still unaddressed.
- **`interceptor eval` only prints STRING returns.** Wrap every probe in `String(...)`. The tab
  also gets STOLEN mid-session — pin `interceptor tab switch <id>` in the SAME Bash command as
  every eval/screenshot, and recover with `tab new <url>`, never a loop.
- **The Bash preflight hook BLOCKS a gate piped into head/tail.** Redirect to a file, echo `$?`,
  then read the file.
- **A green test can assert the defect.** Force-red every new test.
- **Measure EVERY outcome bucket after a change, not the one you set out to move.**
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`** — it is
  GENERATED, and it emits TWO tables (`TOPIC_SUBJECTS` + `TOPIC_BROAD`).
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736 pending a ruling.

## Open items waiting on me (the user)

- **Deploy `32a1ecc`?** (item 1) — committed, gates green, NOT shipped. It narrows what the reader
  sees of the scholar's entries.
- **Send `hukum-pin-request` to Ustadz Ahmad?** (item 2) — two changes have now landed in its
  territory and it has never been sent.
- **ISC-419/420 — may the app assert things about God without citation?** (item 3). Theological,
  not engineering. The prompt-first path needs a go-ahead before any guard work starts.
- **ISC-417 — Ustadz Ahmad has still never signed off on AI-authored answers at all.** Recorded as
  Erik's knowing call; `EDITION="synthesis"` is live and the app authors prose today.
- **`MODEL_DEADLINE_MS`** (item 4) — raise it above 25 s, and the client's 30 s with it, or accept
  the current ~10% tail silence?
- **The single-shard ceiling** (item 5) — widen retrieval for central vocabulary, or pin the
  limitation in a test?
- **The audio DENGAR click** (item 7) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 8) — a rights call, not a scholarly one.

---

# Next session — New-Quranku (checkpoint 2026-08-16 late-2)

> Prepended by /wrap 2026-08-16 late-2 (anchor `f10fccc`). Supersedes the 2026-08-16 anchor
> `7f81b63`. That handoff's item 2 is DISCHARGED (typecheck now checks `worker/src`) and item 3 is
> DIAGNOSED AND CLOSED (see below — it was the 25 s deadline, not eschatology). Its items 1, 4, 5,
> 6 and 7 survive and are carried below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-16 (late-2)**, anchor
`origin/main` `f10fccc`).

**Current state.** Prod DEPLOYED and verified live: worker `5700421d`, bundle `index-CdvPLSbA.js`,
css `index-DePTriQW.css`, `EDITION: "synthesis"`. Gates green — `bun test` **1470/0** exit 0 ·
typecheck exit 0 (now including `worker/src` AND its tests) · build exit 0. **ISA 478/489**
(unchanged — reactive defect work, no ISC closed; consider writing ISCs for the routing fix).
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.
The hadith generator is STOPPED and must stay stopped (1,746/14,736) pending a scholarly ruling.

**Two deploys this session, both verified live:** `145c4c57` (justified Tanya answer) →
`5700421d` (the routing fix + the honest corpus-gap copy).

---

## 1. Finish what the routing fix started — entry RANKING inside the chapter

The reported question now routes to Perintah dan Larangan and renders the scholar's entries with
attribution, **including QS 3:131** — but the entries shown look like the category's LEADING lines
(2:180 wasiat, 2:208, 2:238…) rather than the neraka ones. `retrieveKnowledge` documents that path:
`matched` empty → broad-topic question → take the leading entries. So the SELECTION is fixed and the
RANKING is not: 14:28-30 and 74:43 exist in the index and did not surface.

**Do not assume why.** Measure whether `matched` was genuinely empty (and if so, why `neraka` scored
0 against entries whose text contains it — suspect `qWords`, `hasOwnSense`, or `onSubject`), before
touching the ranker. The probes from this session are in the scratchpad pattern: import
`matchTopic` / `subjectWordsOf` / `categoriesContaining` from `web/src/knowledge.ts` (all three are
now exported) and run them under `bun`.

## 2. ISC-419 / ISC-420 — the receipt half of the critique. STILL BLOCKED ON ERIK

Unchanged. Measured against real prod prose: **every one of 8 paragraphs carries at least one
unattributed claim about God or the unseen.** A receipt guard as prescribed refuses **~100%** of
answers. **Deliberately NOT built.** Worst example: *"Allah tidak pernah bosan menerima hamba-Nya
yang kembali"* — a hadith rendered as the app's own sentence.

**Recommended path (unchanged):** fix `SYNTHESIS_SYSTEM_PROMPT` first, re-measure the residue on
real prose, guard only what is left. Building the wall first is what produced the 48% refusal.

## 3. `MODEL_DEADLINE_MS` — Erik's call, now with numbers behind it

**Item 3 of the previous handoff is CLOSED as a diagnosis.** "apa yang terjadi setelah kita
meninggal" returning no prose is NOT an eschatology refusal. Ten samples through the real UI:
`5554 · 6073 · 6554 · 6924 · 7016 · 7984 · 8525 · 13074 · 19453 · 25445` ms. **Median 7.5 s**, and
the ONE silent turn was `ms:25445, answer:null, blocked:null` — the `catch` at `index.ts:759`, i.e.
the 25 s Worker deadline, on a turn whose first attempt threw before generating anything.

So the lever is `MODEL_DEADLINE_MS` above 25 s, which **cannot move without the client's 30 s
`TIMEOUT_MS` moving with it** (ISC-466). The median is fine; the tail is what kills.

## 4. Audio — DENGAR on the `#/baca` shelf card (unchanged, blocked on Erik)

Decided: the button goes on the `#/baca` shelf card (`read.ts`, `indexRow`). **Blocked on one
click:** Erik must open `quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted
player can be read out of the DOM — autoplay policy rejects programmatic clicks. **Do not loop on
coordinate clicks.** The shelf card is a single `<a href>` wrapping its inner layer, so a nested
`<button>` is invalid and would navigate; the card needs restructuring.

## 5. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's
terms, not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.**

## 6. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every
rule is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question`
events too?

---

## Constraints to honor (carried forward — plus five new)

- **NEW — `stemReach`'s one-directional rule is the `musik` guard. Do NOT make it bidirectional.**
  Its comment says so and `knowledge.test.ts` pins it. A session almost shipped that change; the
  `sadari` → `sadar` gap is closed by a NAMED-SUFFIX strip inside `categoriesContaining` instead,
  which cannot reach an arbitrary shorter word.
- **NEW — `MAX_SPREAD` had been doubling as an ad-hoc stopword list.** Anything that stops the cap
  from deleting broad words resurrects grammar words with the real subjects — `matchTopic("aku
  sedang sedih")` routed to the Prophet's chapter on `sedang` alone. If you widen the tiers again,
  re-run the FEELING tests first; four of them exist for exactly this.
- **NEW — a router change needs a CONTROL SET captured before the change, asserted as literal
  slugs.** "It still routes somewhere" is the assertion that lets a regression through.
  `web/src/topic-broad-tier.test.ts` holds 8 such routes; extend it, never relax it.
- **NEW — a comment that QUOTES retired copy can fail the anti-test guarding it.** The
  `answer-blocked` test slices `main.ts` between two case labels; a verbatim quote inside that range
  reads as the lie itself. Paraphrase retired copy in comments.
- **NEW — the corpus-gap copy must never claim the corpus is empty.** Two roads reach the same
  reader (the wall's, and the never-searched one) and both are now pinned. `EDITION` is `synthesis`,
  so the app must also never describe itself as one that declines to answer ajaran.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy.** Clear caches, hard-reload,
  confirm the loaded css/js HASH before measuring anything.
- **`wrangler deploy` reporting "2 new assets" is not proof the JS did not ship.** The asset store is
  content-addressed; a chunk already uploaded is not re-sent. Verify by what prod SERVES.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output.
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).**
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`, and check `.build-meta.json` says `synthesis` AND its
  `gitSha` matches HEAD. (`.build-meta.json` is NOT served — a fetch returns the SPA fallback.)
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** Noted again this
  session: the model addressed a reader as *"Nak"*, which is a different axis and still unaddressed.
- **`interceptor eval` only prints STRING returns.** Wrap every probe in `String(...)` or
  `JSON.stringify(...)`. The tab also gets STOLEN mid-session — pin `interceptor tab switch <id>` in
  the SAME Bash command as every eval/screenshot, and recover with `tab new <url>`, never a loop.
- **The Bash preflight hook BLOCKS a gate piped into head/tail** — and it also fires on an unrelated
  `| head` later in the same command. Redirect to a file, echo `$?`, then read the file.
- **A green test can assert the defect.** Force-red every new test; a break must fail the RIGHT
  test and only it.
- **Measure EVERY outcome bucket after a change, not the one you set out to move.**
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`** — it is
  GENERATED, and it now emits TWO tables (`TOPIC_SUBJECTS` + `TOPIC_BROAD`).
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736 pending a ruling.

## Open items waiting on me (the user)

- **ISC-419/420 — may the app assert things about God without citation?** (item 2). Theological, not
  engineering. The prompt-first path needs a go-ahead before any guard work starts.
- **ISC-417 — Ustadz Ahmad has still never signed off on AI-authored answers at all.** Recorded as
  Erik's knowing call; `EDITION="synthesis"` is live and the app authors prose today.
- **`MODEL_DEADLINE_MS`** (item 3) — raise it above 25 s, and the client's 30 s with it, or accept
  the current ~10% tail silence?
- **The audio DENGAR click** (item 4) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 5) — a rights call, not a scholarly one.
- **Does the routing change need the ustadz?** It surfaces MORE of his verbatim entries and authors
  nothing new, so this session treated it as already-approved display. Worth confirming.

---

# Next session — New-Quranku (checkpoint 2026-08-16)

> Prepended by /wrap 2026-08-16 (anchor `7f81b63`). Supersedes the 2026-08-15 `late-3` anchor
> `4743f2d` **entirely**. That handoff's items 1, 2 and 3a are DISCHARGED (ISC-468 closed as a
> negative result, ISC-465 measured and fixed, the composer overprint swept and fixed). Its items
> 4, 5, 6 and 7 survive and are carried below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-16 (late)**, anchor
`origin/main` `7f81b63`).

**Current state.** Prod DEPLOYED and verified: worker `c357ea7e`, bundle `index-BROZrzBm.js`,
css `index-CGkeJ2q-.css`, `EDITION: "synthesis"`. Gates green — `bun test` **1438/0** exit 0 ·
typecheck exit 0 · **worker tsc exit 0** · build exit 0. **ISA 478/489.** Clean tree except
untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`. The hadith generator
is STOPPED and must stay stopped (1,746/14,736) pending a scholarly ruling.

**Four deploys this session, all verified live:** `20b04277` (bad_hadith retry on a shared budget)
→ `66254521` (a blocked verdict survives a retry timeout) → `384a6f9d` (`#/peta` composer
clearance) → `c357ea7e` (AI disclosure chip above the answer).

---

## 1. ISC-419 / ISC-420 — the receipt half of the critique. BLOCKED ON ERIK, and the prescribed fix cannot ship as written

The handoff wording was "extend the receipt rule already applied to the Prophet's words". **Measured
against real prod prose first** (two full answers, 8 paragraphs, captured live rather than composed):
**every one of the 8 paragraphs carries at least one unattributed claim about God or the unseen.**

A receipt guard shipped as prescribed refuses **~100%** of answers — not 48% like `bad_hadith` — and
would silently turn the app off. **It was deliberately NOT built.** Evidence in ISA ISC-464(b).

Worst single example, and the reason this needs the ustadz rather than an engineer:
*"Allah tidak pernah bosan menerima hamba-Nya yang kembali"* — **a hadith, rendered as the app's own
sentence.** Also *"semakin besar dosa, semakin besar pula peluang untuk merasakan indahnya
ampunan-Nya"*, which is not sourceable to anything.

**The model demonstrably CAN cite** — both answers quote scripture verbatim with refs (QS 4:27,
3:135, 29:2-3, 2:155-156). It treats pastoral assertion as a different act from quotation.

**Recommended path — the shape that worked for the hadith marker:** fix `SYNTHESIS_SYSTEM_PROMPT`
first, re-measure the residue on real prose, and only then guard what is left. Building the wall
first is precisely what produced the 48% refusal.

## 2. `bun run typecheck` DOES NOT CHECK `worker/src` — one line, nobody has made it

`"typecheck": "tsc --noEmit && tsc --noEmit -p web/tsconfig.json && tsc --noEmit -p src/eval/tsconfig.json"`
and root `tsconfig.json` includes only `["src","test"]`. **Every worker change this repo has ever
shipped went out unchecked by the gate everyone calls "typecheck".** `worker/tsconfig.json` exists
and passes; add `&& tsc --noEmit -p worker/tsconfig.json` to the script. Until then, run it by hand
after ANY worker edit. (It also excludes `src/**/*.test.ts`, so worker test files stay unchecked.)

## 3. `apa yang terjadi setelah kita meninggal` returned NO prose at all

Observed once, 2026-08-16, while collecting samples. Zero `p.said.ai-said` paragraphs — no answer,
no visible refusal. May mean eschatology is already being refused somewhere, or may be an ordinary
model-path null. **One observation is not a pattern** (this project's standing lesson); collect N
before diagnosing. The `dalil` diagnostic on `/api/answer` reads the retrieval story for free.

## 4. `MODEL_DEADLINE_MS` vs the measured generation time — Erik's call

Generations measured a **~16 s median** this session against a **25 s turn budget**, so two attempts
often do not fit and the retry lands in the timeout path. `MIN_RETRY_MS` was deliberately left at
6,000 ms: raising it to match reality would make the retry almost never fire and forfeit the
48%→12% `bad_hadith` gain. The real lever is `MODEL_DEADLINE_MS` above 25 s — which **cannot move
without the client's 30 s `TIMEOUT_MS` moving with it.** They must never cross (ISC-466). Decide
after watching the deployed rate; the verdict-preservation fix may have made the residual silence
acceptable on its own.

## 5. Audio — DENGAR on the `#/baca` shelf card (unchanged, still blocked on Erik)

Decided: the button goes on the `#/baca` shelf card (`read.ts`, `indexRow`); tapping it turns that
card's inner layer into an audio UI. **Blocked on one click:** Erik must open
`quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted player can be read out of
the DOM — autoplay policy rejects programmatic clicks. **Do not loop on coordinate clicks.** The
shelf card is a single `<a href>` wrapping its inner layer, so a nested `<button>` is invalid and
would navigate; the card needs restructuring.

## 6. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's
terms, not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.**

## 7. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every
rule is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question`
events too?

---

## Constraints to honor (carried forward — plus four new)

- **NEW — an occlusion claim needs hit-testing, or it is fiction.** Raw `getBoundingClientRect()`
  against `#composer-bar` is wrong twice over: it ignores clipping by scrolling ancestors (content
  scrolled out of `#intro-body.sp-scroll`, box ending y606, reads as "occluded" at y628), and
  `#composer-bar` is `pointer-events: none` + transparent at full width while only `form#composer`
  PAINTS. Clip by every scrolling ancestor → intersect with the FORM → `elementFromPoint` at the
  centre of the overlap. **And always run the counterfactual** (remove the reservation, or grow the
  composer): a probe that returns 0 for both arms is blind, and that happened.
- **NEW — the acceptance criterion for occlusion is AT-BOTTOM, not at-rest.** Every healthy route
  overlaps the composer at rest (`#/hadis` 4 elements, `#/fikih` 1, `#/doa` 1, `#/surah/18` 1) and
  clears by scrolling. Only content stranded at the END of the scroll is a defect.
- **NEW — `canvas.fillStyle` does not parse `oklch()`.** A regex over the returned string reads the
  oklch components as RGB and produces confident nonsense (`[1,0,163]`, contrast 1.01). This app's
  colours are all oklch. **Use a screenshot for any contrast or visibility question.**
- **NEW — measure EVERY outcome bucket after a change, not the one you set out to move.** Shipping
  the `bad_hadith` retry moved it 48%→8% exactly as predicted AND tripled `{answer:null}` silence
  8%→28% in the same deploy. Reporting only the target metric would have shipped a 3× regression as
  a win. Verify by a row only your change could emit, not by a shifted average.
- **A stale `CacheStorage` entry serves the OLD bundle after a deploy — hit TWICE more this
  session.** Clear caches, hard-reload, and confirm the loaded css/js HASH before measuring anything.
- **`bun run build` exits 0 when the CSS parser silently DISCARDS a rule.** Grep the SHIPPED output
  for the rule itself, and check its ORDER against any rule it must beat (same specificity = source
  order decides; the minifier rewrites `max-width:700px` to `width<=700px` and merges blocks).
- **`TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** If they cross,
  an honest server-side degradation becomes a silent client-side substitution we also pay for.
- **A plain `bun run build` leaves a PRINCIPLED dist while prod runs SYNTHESIS.** Always
  `VITE_ANSWER_MODE=synthesis bun run build`, and check `.build-meta.json` says `synthesis` AND its
  `gitSha` matches HEAD.
- **Deploy uploads generated content that has been sitting on disk.** Check what an asset upload
  contains before assuming it is only your change — `wrangler` prints the file list.
- **The formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** The critique's
  pronoun recommendation is WITHDRAWN. Do not "fix" pronouns from the critique snapshot. (Noted but
  not acted on: the model once addressed a reader as *"Nak"*, which is a different axis.)
- **Do NOT re-open the composer overprint from the critique snapshot.** Half (a) was swept across
  nine routes × two widths and is fixed; the snapshot's wording is reproducible by naive
  rect-overlap. Re-run the counterfactual before believing it again.
- **`interceptor eval` only prints STRING returns.** Wrap every probe in `String(...)` or
  `JSON.stringify(...)`. The Interceptor tab also gets STOLEN mid-session — pin
  `interceptor tab switch <id>` in the SAME Bash command as every eval/screenshot.
- **A green test can assert the defect**, and **a test can pass on `null === null`.** Force-red every
  new test; a break must fail the RIGHT test and only it.
- **A reload that heals a bug is a reason to test BEFORE reloading.** Both the theme desync and the
  thread-ordering bug self-healed on refresh, which is how each survived.
- **A restored thread replays a PAST turn as a fresh one**, and a reload does NOT preserve it
  (104,569 → 6,529 chars). Clear `localStorage` and count `#thread` turns before AND after. Never
  reload between the two arms of an A/B — inject, measure both, reload only to clean up.
- **An instrument can agree with itself regardless of the world.** Before re-running a probe to
  measure a change, ask what it would report if the feature were reverted.
- **Check the EXIT CODE, not the tail** — and the preflight hook BLOCKS a gate piped into head/tail.
  Redirect to a file, echo `$?`, then read the file.
- **Three numbers, not one: disk ≠ dist ≠ live.** Generated content is baked in at BUILD time. A
  missing asset returns `200 text/html`, so key on `content-type`, never on status.
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.**
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736 pending a ruling.

## Open items waiting on me (the user)

- **ISC-419/420 — may the app assert things about God without citation?** (item 1). Theological, not
  engineering. The recommended prompt-first path needs a go-ahead before any guard work starts.
- **ISC-417 — Ustadz Ahmad has still never signed off on AI-authored answers at all.** Recorded as
  Erik's knowing call; `EDITION="synthesis"` is live and the app authors prose today.
- **`MODEL_DEADLINE_MS`** (item 4) — raise it above 25 s, and the client's 30 s with it, or accept
  the current residual silence?
- **The audio DENGAR click** (item 5) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 6) — a rights call, not a scholarly one.

---

# Next session — New-Quranku (checkpoint 2026-08-15 late-3)

> Prepended by /wrap 2026-08-15 late-3 (anchor `4743f2d`). Supersedes the 2026-08-15 `late` anchor
> `3e67ee1` **entirely** — that handoff's items 1, 2 and 4 are DISCHARGED (the marker fix shipped,
> the latency premise was falsified and the abort is fixed, the theme bug is fixed). Its items 3, 5
> and 6 survive unchanged and are carried below.

Resume New-Quranku — read `PROGRESS.md` first (top checkpoint **2026-08-15 late-3**, anchor
`origin/main` `4743f2d`).

**Current state.** Prod DEPLOYED and verified: worker `608b3e3c`, bundle `index-BN1JKt-B.js`, css
`index-Dv3PeDUX.css`, `EDITION: "synthesis"`, all three dalil bindings live. Gates green — `bun test`
**1420/0** exit 0 · typecheck exit 0 · build exit 0 · `wrangler deploy` exit 0. **ISA 476/489.**
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.
The hadith generator is STOPPED and must stay stopped (1,746/14,736) pending a scholarly ruling.

**Three things shipped and verified live this session:** the hadith marker fix (first non-empty
`hadith` array and a rendering card ever seen on prod), per-stage `dalil.ms` timings, the
"Ikut sistem" white-on-white theme fix, and the progressive answer that removed the 12 s abort.

---

## 1. ISC-468 — the `display` stage spent 8,710 ms of a 10,106 ms chain

One live turn reported `ms:{"embed":621,"vectorize":277,"text_layer":0,"rerank":498,"display":8710,"total":10106}`
against 72-373 ms for `display` on every prior observation. That is `fetchDisplayRecords` — two R2
shard GETs, already issued in parallel, no model call in the path.

**Do NOT theorise from the code, and do not fix anything yet.** One outlier is not a pattern, and
this project has now TWICE produced a confident wrong latency diagnosis from too few samples —
including the one this session falsified. Collect N eligible turns first (the diagnostic ships live,
no deploy needed: POST `/api/answer` through the real UI and read `dalil.ms` off the body), then check
whether the shards involved (`Sahih al-Bukhari/43`, `Sahih Muslim/22`) are cold, oversized or contended.

**`text_layer: 0` is NOT a finding.** It is the documented expected reading — the residual after the
prefetch overlap absorbed it, on a module-cached warm isolate, with a Workers clock that only advances
on I/O. A verifying agent already misread it as "that stage may not be running at all". See the
four traps on `DalilTimings` in `worker/src/dalil.ts`.

## 2. ISC-465 — `bad_hadith` still fires on ~1/3 of generations

Measured: 9 completions of `apakah sedekah boleh diungkit ungkit` → 5 returned `hadith:1`, **3 returned
`blocked:"bad_hadith"` with `records:2` and `hadith:[]`**, 1 returned `blocked:null` with no `[H:…]`
marker at all. Before the marker fix this verdict meant "no output could have passed"; now the offered
marker IS writable and resolvable, so it means the model had everything it needed and still emitted an
unresolvable receipt.

**This also re-opens a decision.** The no-retry break on `bad_hadith` was justified by DETERMINISM —
both attempts would fail identically. A 1-in-3 failure rate refutes that, so a second generation now
has evidence behind it. It costs ~6 s, which was unaffordable against a 12 s client deadline and IS
affordable against the new 25 s Worker budget. Read the "no-retry break … STAYS" note in ISA.md before
changing it.

## 3. The critique's two remaining P0s (from `.impeccable/critique/2026-08-15T13-09-29Z__new-quranku-axiara-ai.md`, 19/40)

- **The composer overprints the scripture.** `#composer-bar` floats over a scroll container that
  reserves no space, so `Ceritakan atau tanyakan apa saja…` renders ON TOP of the Arabic of 2:156 and
  its meaning translation at BOTH 1440 and 390, and occludes the `Terjemahan harfiah & tafsir ulama`
  toggle. Five of six routes. Fix: reserve the space (`padding-bottom` + matching
  `scroll-padding-bottom`, measuring `--composer-h` off the element), opaque ground on scroll routes.
- **The synthesis lane makes claims about God and the unseen with no receipt**, and buries the AI
  disclaimer at ~11.7px some 4,000px below the theology. Extend the receipt rule already applied to
  the Prophet's words; move the disclaimer to a chip at the HEAD of the composed paragraph.
  **The pronoun half of this finding is WITHDRAWN — see Constraints.**

## 4. The hadith gate is narrower than the Worker suggests — Erik's decision, unchanged

`gatherGrounding` (`web/src/answer.ts`) populates `entries` ONLY when `verses.length === 0`, and the
Worker gates hadith on `entries.length > 0` — so **hadith can only fire on a turn that retrieved zero
ayah.** Measured 7 of 19 eligible. Four plainly hadith-answerable questions are locked out for matching
a verse. **Do NOT widen it without asking.** The gate measured 9/9 on knowledge and 1/4 on feelings,
where it returned a rebuke to an anxious person.

## 5. Audio — DENGAR on the `#/baca` shelf card (unchanged, still blocked on Erik)

Decided: the button goes on the `#/baca` shelf card (`read.ts`, `indexRow`); tapping it turns that
card's inner layer into an audio UI. **Blocked on one click:** Erik must open
`quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted player can be read out of
the DOM — autoplay policy rejects programmatic clicks. **Do not loop on coordinate clicks.** The shelf
card is a single `<a href>` wrapping its inner layer, so a nested `<button>` is invalid and would
navigate; the card needs restructuring.

## 6. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's terms,
not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.**

## 7. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every rule
is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question` events too?

---

## Constraints to honor (carried forward — plus six new)

- **NEW — the formal `Anda` / `Saudaraku` register is INTENTIONAL (Erik, 2026-08-15).** Formality is
  respect in Indonesian religious speech. The critique's pronoun-matching recommendation is WITHDRAWN
  in both the ISA and the critique snapshot. A later `$impeccable polish` reads that snapshot — do not
  "fix" the pronouns.
- **NEW — `TIMEOUT_MS` (30 s, client) must stay ABOVE `MODEL_DEADLINE_MS` (25 s, Worker).** The Worker
  giving up is an honest degradation; the client giving up is a silent substitution we also pay for.
  If they cross, that inverts.
- **NEW — a plain `bun run build` leaves a PRINCIPLED dist in `web/dist` while prod runs SYNTHESIS.**
  Always `VITE_ANSWER_MODE=synthesis bun run build` before deploying, and check `.build-meta.json`
  says `synthesis` AND its `gitSha` matches HEAD.
- **NEW — deploy uploads generated content that has been sitting on disk.** The first deploy this
  session shipped 77 `hadith-id` shards that were never live. Within scope
  (`SHOW_MACHINE_HADITH_TEXT = true` by Erik's relay of the ustadz's ruling, `.is-ai` intact), but
  check what an asset upload contains before assuming it is only your change.
- **NEW — a stale `CacheStorage` entry served the OLD bundle after a deploy, twice this session.**
  Confirm the loaded JS hash BEFORE measuring, and re-confirm after every reload.
- **NEW — the Interceptor tab gets STOLEN mid-session** by another Chrome-driving process (Storymaker
  on localhost:3000/3100 this time). Pin `interceptor tab switch <id>` in the SAME Bash command as
  every eval/screenshot, and re-verify `location.href` before trusting a reading.
- **`interceptor eval` only prints STRING returns.** Anything else prints a bare `ok`. Wrap every
  probe in `String(...)` or `JSON.stringify(...)`.
- **A green test can assert the defect.** The theme bug was PINNED by a passing test that had asserted
  it since it was written, and two files held OPPOSITE policies citing the same failure as
  justification. Force-red every new test; a break must fail the RIGHT test and only it.
- **A test can pass on `null === null`.** The replacement theme test "boot and settings agree" passed
  under the old policy too, vacuously. Force-red found it; assert on a concrete value.
- **A reload that heals a bug is a reason to test BEFORE reloading**, not evidence the bug is minor.
  Both the theme desync and the thread-ordering bug self-healed on refresh, which is how each survived.
- **An instrument can agree with itself regardless of the world.** Before re-running a probe to measure
  a change, ask what it would report if the feature were reverted.
- **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
  Two one-armed probes have now each blocked a build on a false diagnosis.
- **Check the EXIT CODE, not the tail** — and the preflight hook BLOCKS a gate piped into head/tail.
  Redirect to a file, echo `$?`, then read the file. `bun run build` exits 0 when the CSS parser
  silently DISCARDS a rule, so also grep the SHIPPED output for the rule itself.
- **Three numbers, not one: disk ≠ dist ≠ live.** Generated content is baked in at BUILD time. A
  missing asset returns `200 text/html`, so key on `content-type`, never on status.
- **A restored thread replays a PAST turn as a fresh one.** Clear `localStorage` and count `#thread`
  turns before AND after.
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- **Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.**
- **Do NOT restart the hadith generator.** Stopped deliberately at 1,746/14,736 pending a ruling.

## Open items waiting on me (the user)

- **The ISC-465 retry decision** — re-enable a second generation on `bad_hadith` now that determinism
  no longer justifies the break? It is affordable against the new 25 s Worker budget.
- **The audio DENGAR click** (item 5) — one manual ▶ on `quran.tarjamahtafsiriyah.com/audio-quran`.
- **Whether `MAX_DISPLAY = 2` may ever rise** (item 6) — a rights call, not a scholarly one.
- **Ustadz Ahmad has still never signed off on AI-authored answers.** Recorded as Erik's knowing call.
  `EDITION="synthesis"` is live on prod and the app authors prose today.
- **The composer-overprint fix** (item 3) touches five routes — confirm scope before a redesign.

---

# Next session — New-Quranku (checkpoint 2026-08-15 late)

> Prepended by /wrap 2026-08-15 late (anchor `3e67ee1`, docs+ISA commit on top). Supersedes the
> 2026-08-15 anchor `5b507d7`. **That handoff's items 1 and 2 are BOTH DISCHARGED** — the zero-cards
> cause is found and the instrument question is answered. Its items 3–6 slide up, unchanged.

Read `PROGRESS.md` first (top checkpoint, 2026-08-15 late).

**Prod:** worker `6d2f9743`, js `index-8yQBCStV.js`, css `index-DO8SZXQY.css`, `EDITION: "synthesis"`.
**Coverage:** disk = dist = live = **10,502** across 115 shards, **107 populated** (8 bukhari books
still empty — "115 books" means 115 FILES, not 115 populated).
**Gates GREEN:** `bun test` **1407/0** exit 0 · typecheck exit 0 · `wrangler --dry-run` exit 0. ISA **465/475**.
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.
**Generator is RUNNING** at `--batch 1` (PID from this session: 14906), now on the fixed code. Pause
it before any deploy.

---

## 1. The model is not writing the receipt — this is the whole remaining hadith job

**Settled 2026-08-15 late, live on prod, with a control arm.** The `dalil` diagnostic on
`/api/answer` (shipped `d5750f6`) reported, on BOTH eligible questions:

```
{ eligible:true, bound:true, offered:2, records:2, failed:null }  →  blocked:"bad_hadith", 0 cards
```

| question | ms |
|---|---|
| `bagaimana hukum utang piutang dalam islam` | 8,406 |
| `apakah sedekah boleh diungkit ungkit` | 10,588 |
| CONTROL `aku sedih sekali hari ini` → `eligible:false, offered:0, records:0` | 4,387 |

Retrieval hands the model **two fully-resolved hadith** and nothing throws. The model then attributes
something prophetic **without a resolvable `[H:…]` marker**, so `guardAnswerProse` refuses it
correctly (`answer-guard.ts:580` for the attribution, `:585` for a marker that does not resolve).

**Do NOT re-audit the retrieval half.** It was statically cleared this session and then proven live:
prod is the TOP-LEVEL worker and has all three dalil bindings; `CORPUS_DIGEST` matches
`docs/reference/okf-manifest.json`; the R2 text layer object exists; OpenRouter's `/v1/embeddings`
and `/v1/rerank` answer 401 (real endpoints), not 404.

**The fix is in the prompt** — `SYNTHESIS_SYSTEM_PROMPT` / `buildAnswerUserMessage` in
`worker/src/index.ts`. **Write the failing test FIRST, against REAL production prose.** The standing
trap here is documented and has already cost two sessions: every guard test written from prose we
composed ourselves passes. Capture actual prod output and test that.

**How to read the diagnostic** (it ships live, no deploy needed to use it): `eligible:false` → the
question never qualified. `bound:false` → no dalil bindings (INTENDED on synthesis/demo envs).
`offered:0 failed:null` → retrieval matched nothing. `offered>0 records:0` → display shards did not
resolve. `failed:<stage>` → the chain threw (`config`/`embed`/`text-layer`/`rerank`/`vectorize`/`unknown`).
`records>0` + empty `hadith` → **the model declined to cite**, which is today's state.

## 2. Latency — make the eligible path cheaper, do NOT raise `TIMEOUT_MS`

The control answered in **4.4 s because it skips the dalil chain entirely**. Eligible turns pay
embed + Vectorize + R2 + rerank on top and land at **8–11 s** against the 12,000 ms client abort
(`answer-live.ts:33`). A fourth question (`aku lagi marah banget sama temanku`) **aborted outright**.

The previous cycle already rejected raising the constant in writing (`worker/src/index.ts` ~line 645):
it leaves a reader waiting 25 s for a refusal. Read that comment before touching it. Cheaper ideas
worth measuring: the 6.5 MB decompressed rerank text layer is loaded and `JSON.parse`d **inside the
request** on a cold isolate (`dalil.ts:128`), module-cached only for warm ones.

## 3. The hadith gate is narrower than the Worker suggests — Erik's decision, unchanged

`gatherGrounding` (`web/src/answer.ts:98`) populates `entries` ONLY when `verses.length === 0`, and
the Worker gates hadith on `entries.length > 0` — so **hadith can only fire on a turn that retrieved
zero ayah.** Measured **7 of 19 eligible** by `bun run src/app/probe-hadith-gate.ts` (new this
session). Four plainly hadith-answerable questions are locked out for matching a verse: `berbakti
kepada orang tua`, `keutamaan bersedekah`, `adab bertetangga`, `keutamaan menahan marah`.

**Do NOT widen it without asking.** It is a product decision: the gate measured 9/9 on knowledge and
1/4 on feelings, where it returned a rebuke to an anxious person.

## 4. Audio — DENGAR on the `#/baca` shelf card (unchanged, still blocked on Erik)

**Decided:** the button goes on the `#/baca` shelf card (`read.ts:233`, `indexRow`); tapping it turns
that card's inner layer into an audio UI. Not the `#/surah/N` header. **Blocked on one click:** Erik
must open `quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ so the mounted player can be
read out of the DOM — autoplay policy rejects programmatic clicks. **Do not loop on coordinate
clicks.** QTT serves per-SURAH files; we serve per-AYAH, so their timeline is continuous and ours has
a seam per ayah. The shelf card is a single `<a href>` wrapping its inner layer — a nested `<button>`
is invalid and would navigate, so the card needs restructuring.

## 5. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's terms,
not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.** Item 3's
measurement is the live evidence that bears on this.

## 6. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every rule
is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question` events too?

## Standing constraints (carried forward — all still true, plus five new)

- **NEW — `interceptor eval` only prints STRING returns.** Anything else prints a bare `ok`, which
  reads as success and tells you nothing. Wrap every probe in `String(...)` or `JSON.stringify(...)`.
- **NEW — the active tab gets STOLEN mid-session.** Evals silently began running against an unrelated
  `localhost:3000` tab, and the readings looked real. Pin `interceptor tab switch <id>` in the SAME
  Bash command as every eval, not once at the start.
- **NEW — hadith shard numbers are NON-CONTIGUOUS.** A shard file exists only where there is content.
  Probing a `1..N` range invents URLs that were never shards and reads their (correct) SPA fallback
  as a missing deploy — this produced a confident wrong "live = 8,731, 26 shards missing". Drive
  coverage counts off the REAL filenames in `web/dist`.
- **NEW — an aborted `/api/answer` leaves no row in the passive net log,** so it reads as "no request
  made". A `fetch` wrapper installed on the page BEFORE submitting catches it; that is the only
  reason the 12 s abort was seen at all.
- **NEW — `wrangler r2 object get` transparently decodes `content-encoding: gzip`.** What lands is the
  DECOMPRESSED bytes, so a size read there is not the stored object's size. Do not conclude a blob
  "isn't gzipped" from it.
- **An instrument can agree with itself regardless of the world.** Before re-running a probe to
  measure a change, ask what it would report if the feature were reverted. `eval:grounding` is blind
  to the whole hadith cycle (`() => false` at `grounding-probe.ts:216`, `entries: []` at `:151`).
- **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
  The control arm is what made item 1 a finding rather than a guess.
- **A pipe with an unread stderr turns failure into a plausible wrong diagnosis.** FIXED this session
  in `translate-hadith.ts`, but the shape recurs — `worker/src/index.ts:565` was the same bug.
- **Three numbers, not one: disk ≠ dist ≠ live.** Generated content is baked in at build time. A
  missing asset returns `200 text/html`, so key on `content-type`. Print WHICH books, never just how many.
- **A guard predicate left at its default with a comment explaining why is a DESIGN DECISION.** The
  hadith predicate is applied at THREE layers. Grep every call site.
- **A test whose failure mode is an exception can pass through the code's own catch.** Force-red every
  new test; assert on a counter.
- **Guard tests need PRODUCTION prose.** Cases we write ourselves all pass; the wall was open for two
  sessions because `mengajarkan` was unlisted and every test case was our own writing.
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy.** Clear it and confirm
  the loaded hash against `ls -t web/dist/assets/*.css | head -1` BEFORE measuring. (Done this session.)
- **Check the EXIT CODE, not the tail** — and the preflight hook will BLOCK a gate piped into
  head/tail. Redirect to a file, echo `$?`, then read the file. `bun run build` exits 0 when the CSS
  parser silently DISCARDS a rule, so also grep the shipped output for the rule itself.
- **A restored thread replays a PAST turn as a fresh one.** Count `#thread` turns before AND after, or
  instrument the network — do not read the DOM alone.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **Widening the knowledge-shaped gate** (item 3) — product decision, now with a measurement behind it.
- **Click ▶ on QTT's `/audio-quran`** so the player can be captured (item 4).
- **Written confirmation of the hadith approval** — reaffirmed 2026-08-13 but still VERBAL AND
  RELAYED. **Do not edit that record's status line** until an artefact exists. `reviewed_id` stays
  empty; the `.is-ai` badge stays.
- **ISC-454's block RATE** — the wall is now verified live, but the rate still has no comparable
  number and the 24% baseline is not re-runnable. Erik's call whether it needs one at all.
- **The Tanya visual pass.** Spacing, the dotted citation underline, the 17.5px step-down. Ask first.
- **Copy review** — the bow-out shows honest-silence copy often. Consider IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped. The ⛔ header stands.
- **`/printing-press almanhaj`** — Erik asked for it 2026-08-15; still deferred. `almanhaj.or.id` is a
  WEBSITE, not an API, so it routes through browser-sniff discovery. **Flag the rights question at the
  absorb gate**: a read-only CLI is fine, but redistributing their corpus through New-Quranku is the
  same shape as the Hadis/Fikih sourcing call — a worker proxy still publishes.

---

# Next session — New-Quranku (checkpoint 2026-08-15)

> Prepended by /wrap 2026-08-15 (anchor `5b507d7`, unchanged — docs-only commit on top). Supersedes
> the 2026-08-14 anchor `3982e21`. **That handoff's item 1 is DONE** (batch shipped, all 115 books
> live, cadence settled). **Its item 2 is REFRAMED, not done** — see item 1 below. Items 3, 5, 6 are
> untouched and slide up.

Read `PROGRESS.md` first (top checkpoint, 2026-08-15).

**Prod:** worker `dbd6be86`, js `index-8yQBCStV.js`, css `index-DO8SZXQY.css`, `EDITION: "synthesis"`.
**Coverage:** disk = dist = live = **10,196** entries, all 115 books. Corpus total 14,736.
**Gates:** NOT re-run — no source file changed this session. ISA **465/475**.
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.
**Generator is RUNNING** at `--batch 1` (see item 3). Pause it before any deploy.

---

## 1. The latency, which is the finding that should not wait

Measured live on prod this session, and it is worse than the previous handoff suspected. `TIMEOUT_MS`
is **12,000** in `answer-live.ts:33`. Observed `/api/answer`: **9,433 · 10,954 · 18,614 · 12,254 ms**,
plus **two of seven questions that never resolved at all in 45 s**. The single `hadith-defer` fired at
**12,254 ms** — outside the budget the no-retry break exists to stay inside. So the door built for
exactly these questions is, again, unreachable for exactly these questions.

**Zero hadith cards rendered** across the whole run (`.ai-hadith` = 0 on every turn). The wall is open;
nothing is coming through it. Whether that is the `entries.length > 0` gate never firing on these
questions, or retrieval returning nothing, is UNDETERMINED — do not assume.

**Classify by DOM class, never by copy.** An aborted `/api/answer` falls through to the principled
resolution, which also renders prose. `.ai-said` is the only thing separating an authored answer from
a fall-through; classify on copy and every abort reads as a success.

Raising `TIMEOUT_MS` is the tempting fix and the previous cycle already rejected it in writing
(`worker/src/index.ts` ~line 645): it leaves a reader waiting 25 s for a refusal. Read that comment
before changing the constant.

## 2. ISC-454 needs a NEW instrument — do not re-run `eval:grounding`

The 24% baseline (34/141) is **not production traffic and cannot be re-run into a comparable number.**
Prod has no telemetry at all — no `console.*` in `worker/src/`, no `observability` block in
`wrangler.toml`. The baseline came from `bun run eval:grounding`, offline, 2026-08-13. That probe:

- pins the hadith predicate to `() => false` (`src/eval/grounding-probe.ts:216`), so it reproduces
  ~24% **by construction** whether or not the wall opened;
- sends `entries: []` on every sample (`:151`), and the Worker gates hadith retrieval on
  `entries.length > 0` — so **none of those 141 samples could ever have reached hadith.**

`src/eval/answer-run.ts:163` has the same two-arg guard. Neither harness calls `searchDalil`.

Two honest paths, and this is a real choice for Erik: **(a)** add Worker-side logging of the `blocked`
kind + latency and let real traffic produce a rate — apples-to-apples, but slow and it means writing
telemetry into a Worker that deliberately has none; or **(b)** drive the live UI over a fixed question
set and report the rate on that set, stating plainly that it is a new baseline, not the old one.
**Do not report any number as "measured against the 24% baseline."**

The live-probe harness from this session is reusable: install a driver on `window` via
`interceptor eval --main`, submit through `#composer` / `#q`, poll `#thread` children until the
pending copy (`Menyusun jawaban` / `Mencari ayat`) clears, and read `performance.getEntriesByType('resource')`
filtered to `/api/answer`. Do NOT trust a settle-detector that only watches child count — the loading
turn is itself a turn, and it will fire early.

## 3. The generator: keep it at `--batch 1`, and pause it to deploy

**`--batch 3` yields nothing on what remains.** It logged `+0` on 12 of 14 batches. Cause: `Inference.ts`
times out at 30 s and `translate-hadith.ts` spawns it with `stderr: "pipe"` and never reads the pipe, so
a failed call is indistinguishable from truncation — and the code's comment blames truncation. The
remaining records are the long ones; three at a time always blows the 30 s budget, and "the resumable
loop picks the stragglers up on a later pass" is false because nothing differs between passes.

Measured: `--batch 3` → **0 of 12**. `--batch 1` → **8 of 8**, then **48 of 53**. ~15 s/hadith.

**Worth fixing properly:** read the spawn's stderr and report inference failure as failure, so this
cannot recur silently. Consider auto-falling back to batch 1 on a zero-yield batch.

**A running generator makes every build stale within minutes** — `web/public/` is baked in at build
time and the preflight guard blocks the deploy for it, correctly. The deploy sequence is: pause
generator → `VITE_ANSWER_MODE=synthesis bun run build` → `cd worker && bunx wrangler deploy` → restart
generator. Cadence is **ship each batch** (Erik, 2026-08-15).

## 4. Audio — DENGAR on the `#/baca` shelf card (unchanged, still blocked on Erik)

Unchanged from the 2026-08-14 handoff. **Decided:** the button goes on the `#/baca` shelf card
(`read.ts:233`, `indexRow`); tapping it turns that card's inner layer into an audio UI. Not the
`#/surah/N` header. **Blocked on one click:** Erik must open `quran.tarjamahtafsiriyah.com/audio-quran`
and click any ▶ so the mounted player can be read out of the DOM — autoplay policy rejects programmatic
clicks and `interceptor macos windows --app "Google Chrome"` returns `[]`. **Do not loop on coordinate
clicks.** QTT serves per-SURAH files; we serve per-AYAH, so their timeline is continuous and ours has a
seam per ayah. The shelf card is a single `<a href>` wrapping its inner layer — a nested `<button>` is
invalid and would navigate, so the card needs restructuring.

## 5. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik (unchanged)

Retrieval already uses all 14,736; `MAX_DISPLAY = 2` is a **rights** position from sunnah.com's terms,
not a scholarly one, so no ustadz approval reaches it. **Do not quietly raise it.** The real lever is
the knowledge-shaped gate (`entries.length > 0`), which measured 9/9 on knowledge and 1/4 on feelings —
on a feeling it returned a rebuke to an anxious person. **Ask before touching it.** Item 1's zero-cards
finding is new evidence that bears on this: the gate may not be firing where anyone assumed.

## 6. Continuous chat — unblocked, PRD needs updating first (unchanged)

`.scratch/continuous-chat/PRD.md`. Its trap section rests on "the model's answers are ungrounded",
measured false (+61 pt lift). **Settled, do NOT re-open:** last 6 turns verbatim; tabs stay;
local-now / adopts-on-sign-in. **Still open:** does history change what the guard must do (every rule
is sentence-scoped)? And what does "delete" delete — transcript only, or the D1 `question` events too?

## Standing constraints (carried forward — all still true, plus three new)

- **NEW — an instrument can agree with itself regardless of the world.** Before re-running a probe to
  measure a change, check that the probe can SEE the change. Two independent pins (`() => false`,
  `entries: []`) made `eval:grounding` blind to the entire hadith cycle. Ask what the probe would
  report if the feature were reverted; if the answer is "the same", it is not an instrument.
- **NEW — a pipe with an unread stderr turns failure into a plausible wrong diagnosis.** The generator
  blamed truncation for 12 of 14 dead batches; it was a 30 s inference timeout the whole time.
- **NEW — an aborted `/api/answer` renders prose.** The principled fall-through is not silence, so
  outcome classification must key on `.ai-said` / `.ai-hadith`, never on copy.
- **Three numbers, not one: disk ≠ dist ≠ live.** Generated content is baked in at build time. A
  missing asset returns `200 text/html`, so key on `content-type`. Print WHICH books, never just how many.
- **A guard predicate left at its default with a comment explaining why is a DESIGN DECISION.** The
  hadith predicate is applied at THREE layers. Grep every call site.
- **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
- **A test whose failure mode is an exception can pass through the code's own catch.** Force-red every
  new test; assert on a counter.
- **Two tabs at the same URL make `eval` and the driven tab diverge.** Close duplicates to one.
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy.** Confirm the loaded hash
  against `ls -t web/dist/assets/*.css | head -1` BEFORE measuring. (Verified clean this session.)
- **Check the EXIT CODE, not the tail** — and `bun run build` exits 0 when the CSS parser silently
  DISCARDS a rule, so also grep the shipped output for the rule itself.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **ISC-454's new instrument** — Worker telemetry vs a fresh live-UI baseline (item 2). His call.
- **Click ▶ on QTT's `/audio-quran`** so the player can be captured (item 4).
- **Written confirmation of the hadith approval** — reaffirmed 2026-08-13 but still VERBAL AND
  RELAYED. **Do not edit that record's status line** until an artefact exists. `reviewed_id` stays
  empty; the `.is-ai` badge stays.
- **Widening the knowledge-shaped gate** (item 5) — product decision, and item 1 adds evidence to it.
- **The Tanya visual pass.** Spacing, the dotted citation underline, the 17.5px step-down. Ask first.
- **Copy review** — the bow-out shows honest-silence copy often. Consider IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped. The ⛔ header stands.
- **`/printing-press almanhaj`** — Erik asked for it 2026-08-15; deferred to a fresh session for
  context. `almanhaj.or.id` is a WEBSITE, not an API, so it routes through browser-sniff discovery.
  **Flag the rights question at the absorb gate**: a read-only CLI is fine, but redistributing their
  corpus through New-Quranku is the same shape as the Hadis/Fikih sourcing call — a worker proxy
  still publishes.

---

# Next session — New-Quranku (checkpoint 2026-08-14 late)

> Prepended by /wrap 2026-08-14 (checkpoint `3982e21`). Supersedes the 2026-08-13-late anchor
> `fe04125`. **The hadith wall is DEPLOYED** — that handoff's items 0.5 and 1 are done except for the
> measurement. Its item 3 (audio) is untouched and still blocked on one click from Erik.

Read `PROGRESS.md` first (top checkpoint, 2026-08-14 late).

**Gates GREEN:** `bun test` 1402/0 exit 0 · typecheck exit 0 · synthesis build exit 0. ISA **465/475**.
**Prod:** worker `4c32658f`, css `index-DO8SZXQY.css`, `EDITION: "synthesis"`.
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.

**NEW: a PreToolUse guard is now active** (`.claude/hooks/bash-preflight.ts`). It will block a deploy
whose build is for the wrong edition or predates `web/public/`, and a gate command piped into
head/tail. If it blocks you, it is almost certainly right — read the message before working around
it. `.build-meta.json` is gitignored and per-machine, so a first deploy from a new machine blocks
until a build runs there.

---

## 1. Ship the translation batch, then keep shipping them

**disk 8,393 · dist 6,912 · live 5,681.** Generated content is a gitignored sidecar **baked into the
bundle at build time** — it does not stream, so finished translations are invisible until a rebuild
AND a deploy. Check with `bun run .claude/skills/coverage/Tools/coverage.ts` (prints all three
columns, keys on `content-type` because a missing asset returns `200 text/html`).

```
VITE_ANSWER_MODE=synthesis bun run build && cd worker && bunx wrangler deploy
```

The generator reached **Bukhari** this session (was Muslim-only). Erik was asked whether to ship each
batch as it completes and did not answer — **ask him**, then settle into a rhythm.

## 2. ISC-454 — measure the opened hadith wall

The wall is LIVE and UNMEASURED. Baseline to beat: **34 refusals in 141 live generations (24%)**.
Two things only visible live, and both are bets this build makes:

- Does the model emit a marker on the FIRST generation? `handleAnswer` still breaks rather than
  retrying on `bad_hadith`.
- What does the retrieval hop cost against the browser's 12s `TIMEOUT_MS` on a cold isolate? §4
  below measured 2-in-3 first-requests timing out BEFORE this cycle added an embed + Vectorize query
  + R2 fetch + rerank to the path. **Suspect the timeout before suspecting the marker.**

Use Interceptor — `curl` to prod `/api/answer` is classifier-blocked.

## 3. Audio — DENGAR on the `#/baca` shelf card (unchanged, still blocked on Erik)

**Decided:** the button goes on the **`#/baca` shelf card** (`read.ts:233`, `indexRow`); tapping it
turns that card's inner layer into an audio UI. Not the `#/surah/N` header.

**Blocked on one click.** The QTT reference player could not be captured: autoplay policy rejects
programmatic clicks and `interceptor macos windows --app "Google Chrome"` returns `[]`, so no trusted
OS click can be aimed. Ask Erik to open `quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶,
then read the mounted player out of the DOM. **Do not loop on coordinate clicks.**

Established: QTT's audio is its own route with a surah grid and the same Alafasy reciter — so "like
QTT" means the PLAYER, not the placement. **QTT serves per-SURAH files; we serve per-AYAH** (`audio.ts`
rejected per-surah after measuring Al-Baqarah at 115 MB), so their timeline is continuous and ours has
one seam per ayah. A whole-surah listen is the existing `continue` play-mode. **The shelf card is a
single `<a href>` wrapping its inner layer** — a nested `<button>` is invalid and would navigate, so
the card needs restructuring, not a button dropped in.

## 4. The cold-start error copy fires on most first requests

2 of 3 first-requests after a page load rendered *"Ada yang salah saat mengambil ayatnya…"*. Suspect
the 12s `TIMEOUT_MS` in `answer-live.ts`. **An aborted fetch leaves NO row in the passive network
log**, so absence of an `/api/answer` row is the abort signature — but it is ALSO the bow-out
signature. Distinguish by whether grounding existed. Item 2 adds latency to exactly this path.

## 5. "Utilize the whole hadith as a knowledge base" — scoped, needs Erik

- **Retrieval already uses all 14,736.** `searchDalil` queries the full index, `CANDIDATE_K=50`,
  reranks on the English body. Nothing is withheld there.
- **What is capped is DISPLAY** — `MAX_DISPLAY = 2`, enforced at three points. That is a **rights**
  position from sunnah.com's terms, NOT a scholarly one, so no approval from the ustadz reaches it.
  Raising it is a licensing conversation. **Do not quietly raise it.**
- **The real lever is the knowledge-shaped gate** (`entries.length > 0` in `handleAnswer`). Hadith
  retrieval measured 9/9 on knowledge and 1/4 on feelings — on a feeling it returned a rebuke to an
  anxious person. Widening it is a product decision. **Ask before touching it.**

## 6. Continuous chat — unblocked, PRD needs updating first

`.scratch/continuous-chat/PRD.md` blocked on ISC-418, now lifted. Its trap section rests on "the
model's answers are ungrounded", measured false (+61 pt lift). **Settled, do NOT re-open:** last 6
turns verbatim; tabs stay; local-now / adopts-on-sign-in. **Still open:** does history change what the
guard must do (every rule is sentence-scoped)? And what does "delete" delete — transcript only, or the
D1 `question` events too?

## Standing constraints (carried forward — all still true, plus two new)

- **NEW — three numbers, not one: disk ≠ dist ≠ live.** Generated content is baked in at build time.
  A missing asset returns `200 text/html`, so key on `content-type`. And print WHICH books, never
  just how many — "21 files" was twice misreported as "books 1–21" when the set was scattered.
- **NEW — a guard predicate left at its default with a comment explaining why is a DESIGN DECISION.**
  The hadith predicate is applied at THREE layers (Worker, browser, renderer). Grep every call site.
  `answer.ts` must never receive a permissive predicate — rebuild it from the returned records.
- **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
  Hold the question fixed, vary one thing, always run the blank control. Report the LIFT.
- **A test whose failure mode is an exception can pass through the code's own catch.** Force-red every
  new test; assert on a counter.
- **Two tabs at the same URL make `eval` and the driven tab diverge.** Close duplicates to one.
- **Never judge `/api/answer` on the first post-deploy request**, nor the first after a page load.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy.** Clear, reload, confirm
  the loaded hash against `ls -t web/dist/assets/*.css | head -1` BEFORE measuring.
- **Check the EXIT CODE, not the tail** — and `bun run build` exits 0 when the CSS parser silently
  DISCARDS a rule, so also grep the shipped output for the rule itself.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **Ship each translation batch as it completes, or wait for the full run?** Asked, not answered.
- **Click ▶ on QTT's `/audio-quran`** so the player can be captured (item 3).
- **Written confirmation of the hadith approval** — reaffirmed 2026-08-13 but still VERBAL AND
  RELAYED; he says the ustadz will send it. **Do not edit that record's status line** until an
  artefact exists. `reviewed_id` stays empty; the `.is-ai` badge stays.
- **Widening the knowledge-shaped gate** (item 5) — product decision, measurement behind it.
- **The Tanya visual pass.** Spacing, the dotted citation underline, the 17.5px step-down — never
  discussed. Ask before tuning.
- **Copy review** — the bow-out shows honest-silence copy far more often now. Consider IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped. The ⛔ header stands.
- quran.tarjamahtafsiriyah.com's Supabase is DELETED — bears on "adopts on sign-in" for item 6.

---

# Next session — New-Quranku (checkpoint 2026-08-13 late)

> Prepended by /wrap 2026-08-13 late. Anchor `origin/main` `e80ff9f`. Supersedes the
> 2026-08-13-evening anchor `d03ec97`. **Nothing was deployed.** That handoff's item 0
> (ISC-434/435/449) is BUILT but UNVERIFIED LIVE — it is now item 1, and it is a deploy, not a build.
> Its item 1 (continuous chat) and item 2 are unchanged and slide down.

Read `PROGRESS.md` first (top checkpoint, 2026-08-13 late).

**Gates GREEN:** `bun test` 1398/0 exit 0 · typecheck exit 0 · synthesis build exit 0. ISA **465/475**.
**Prod is BEHIND main:** worker `23f0ad17`, the hadith wall still shut. `web/dist` holds the NEW
synthesis build (css `index-CtO3DA2R.css`, js `index-Dy0UDu2F.js`).
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.

---

## 0. FIRST ACTION — run `/claude-mem:learn-codebase` with a full window

Deferred from last session, deliberately: it was invoked at ~65% context and would have read maybe
20 of 148 files before compaction ate the first half. Primary tree is **148 non-test source files /
39,741 lines**, unusually comment-dense.

**Scope it to the primary tree.** `.claude/worktrees/` holds FOUR stale copies of `web/src`
(`toasty-sleeping-flame`, `humming-riding-scone`, `cozy-launching-clarke`, `crispy-zooming-acorn`) —
a naive `find` reads the codebase ~5× and ingests four divergent historical versions as if current.
Naive test-file count is 345 against a real ~80.

## 0.5. The hadith Indonesian — generator RUNNING, and the KB question is open

**Ustadz Ahmad reaffirmed approval 2026-08-13** (Erik relaying): the AI-generated translation itself,
as it stands — the METHOD, not individual sentences. **Still VERBAL**; he will send written
confirmation. He asked that it be **shown in the app for testing**, which is why display runs ahead
of the note. Recorded in `docs/review/hadith-id-approval-2026-08-12.md` under "Reaffirmed
2026-08-13". **Do not edit that file's status line** until an artefact exists — that section is the
promise, not the artefact.

**The generator is RUNNING.** Started 2026-08-13, PID 58439 at the time of writing, resumed at
`muslim/36.json`, log in the session scratchpad. ~24h, resumable per book. `pgrep -fl translate-hadith`
to check. If it died, restarting is now authorised — that standing "do not restart" is retired.

**There is no UI work outstanding for "show the translation on the cards."** It already renders:
`machine_id` + `.is-ai` on the answer card (shipped and deployed 2026-08-13) and on the Hadis tab
since 2026-08-12. The only gap is COVERAGE — 11.8%, Muslim 1–21, zero Bukhari — which the generator
closes. Check `ls web/public/hadith-id/*/` before believing any percentage.

**Erik also asked to "utilize the whole hadith as a knowledge base." Two halves, and only one is
real work:**

- **Retrieval already uses all 14,736.** `searchDalil` queries the full `okf-hadith` index, pulls
  `CANDIDATE_K=50`, reranks on the English body. Nothing is withheld at that stage.
- **What is capped is DISPLAY** — `MAX_DISPLAY = 2`, enforced at three separate points. That is a
  **rights** position from sunnah.com's terms (per-hadith didactic use, no mass reproduction), NOT a
  scholarly one, so no approval from the ustadz reaches it. Raising it is a licensing conversation
  with the source. Do not quietly raise it.
- **The real lever is the knowledge-shaped gate** (`entries.length > 0` in `handleAnswer`). Hadith
  retrieval measured 9/9 on knowledge questions and 1/4 on feelings — on a feeling it returned a
  rebuke to an anxious person. Widening that gate is a genuine product decision and needs Erik.
  **Ask before touching it**; the measurement behind it is the reason it exists.

## 1. Deploy the hadith wall — DONE 2026-08-13. MEASURE it — ISC-454

**DEPLOYED 2026-08-13** (version `4c32658f`), alongside the Tematik swaps. So the wall is LIVE and
UNMEASURED — the measurement below is the outstanding half.

```
VITE_ANSWER_MODE=synthesis bun run build && cd worker && bunx wrangler deploy
```

**The baseline to beat: 34 refusals in 141 live generations (24%), measured 2026-08-13.** Two things
can only be seen live, and both are bets this build makes:

- **Does the model emit a marker on the FIRST generation?** `handleAnswer` still breaks rather than
  retrying on `bad_hadith`. The reason MOVED rather than disappeared (it used to be determinism; it
  is now "the first attempt already had the hadith and the syntax"). If the block rate does not
  fall, this is the first thing to re-open.
- **What does the retrieval hop cost?** The knowledge lane now pays an embed + Vectorize query + R2
  gzip fetch + rerank before generation. §2 below already measures 2-in-3 first-requests timing out
  at 12s BEFORE any of that existed. **Suspect the timeout before suspecting the marker.**

Verify in Interceptor, never curl (classifier-blocked). Clear CacheStorage and confirm the loaded
asset hash against `ls -t web/dist/assets/*.css | head -1` BEFORE measuring.

## 2. The cold-start error copy fires on most first requests (unchanged, and now more urgent)

2 of 3 first-requests after a page load rendered *"Ada yang salah saat mengambil ayatnya…"*. Suspect
the 12s `TIMEOUT_MS` in `answer-live.ts`. **An aborted fetch leaves NO row in the passive network
log**, so absence of an `/api/answer` row is the abort signature — but it is ALSO the bow-out
signature. Distinguish by whether grounding existed. Item 1 adds latency to exactly this path.

## 3. Audio — the DENGAR button on the surah card (Erik, this session)

**Decided:** the button goes on the **`#/baca` shelf card** (`read.ts:233`, `indexRow`), and tapping
it turns that card's inner layer into an audio UI. **Not** the `#/surah/N` header cartouche.

**Blocked on one 5-second action from Erik.** The QTT reference player could not be captured:
Chrome's autoplay policy rejects programmatic clicks and `interceptor macos windows --app "Google
Chrome"` returns `[]`, so no trusted OS click can be aimed. Ask Erik to open
`quran.tarjamahtafsiriyah.com/audio-quran` and click any ▶ himself, then read the mounted player out
of the DOM. **Do not loop on coordinate clicks.**

**Established already:**
- QTT's audio is its own route `/audio-quran` — a surah grid, Per Surah / Per Juz toggle, reciter
  selector already on **Mishary Rashid Al Afasy**, the same reciter we ship. So "like QTT" means
  the PLAYER, not the placement — Erik's chosen placement differs from the reference on purpose.
- **QTT serves per-SURAH files; we serve per-AYAH.** `audio.ts` rejected per-surah after measuring
  Al-Baqarah at 115 MB against the reader's-bandwidth principle. Their timeline is continuous; ours
  has one seam per ayah. A whole-surah listen is chained per-ayah playback — which already exists as
  the `continue` play-mode (`main.ts:1143`) and needs no new audio assets.
- QTT's player has **no `<audio>` element** — constructed in JS on play.
- **The shelf card is a single `<a href="#/surah/N">` wrapping its whole inner layer.** A nested
  `<button>` is invalid HTML and would navigate instead of playing. The card must be restructured
  first; this is not "drop a button in".
- Today `Dengar` is PER-AYAH only (`verse.ts:291`), with a two-option menu — this ayah, or
  auto-advance from here (`main.ts:1129`).

## 4. Continuous chat — unblocked, PRD needs updating before building

`.scratch/continuous-chat/PRD.md` blocked this on ISC-418, which is lifted. **Update the PRD first**:
its trap section rests on "the model's answers are ungrounded", measured false (96% grounded
citation, +61 pt lift). **Settled, do NOT re-open:** window is the last 6 turns verbatim. Tabs stay.
Continuity is local-now / adopts-on-sign-in. **Still open:** does history change what the guard must
do (every rule is sentence-scoped and blind to a ruling built across turns)? And what does "delete"
delete — the transcript only, or the D1 `question` events too?

## 5. ISC-440.6 — a known, pinned over-refusal

About a fifth of the 24% block is this class. Closing it requires narrowing a `PROPHETIC` pattern.
**Do not.** Pinned as a test.

## Standing constraints (carried forward — all still true, plus two new)

- **NEW — a guard predicate left at its default with a comment explaining why is a DESIGN DECISION.**
  `guardAnswerProse`'s hadith predicate is applied at THREE layers (Worker, browser, renderer) and
  the handoff named two. Before wiring any predicate end to end, grep EVERY call site of that guard,
  not just the one the task names. Layer 2 (`answer.ts`) must never receive a permissive predicate —
  rebuild it from the records the response carried. See memory `three-walls-not-two`.
- **NEW — check the DISTRIBUTION of the hadith Indonesian, not the count.** The 1,746 translations
  are Ṣaḥīḥ Muslim books 1–21 and ZERO Bukhari, so a Bukhari-grounded answer never carries
  Indonesian. `ls web/public/hadith-id/*/`.
- **A probe with no control cannot distinguish "it ignored our input" from "our input was wrong."**
  `bun run eval:grounding` is the shape: hold the question fixed, vary one thing, always run the
  blank control. Report the LIFT, never the hit rate.
- **A test whose failure mode is an exception can pass through the code's own catch.** Force-red
  every new test; assert on a counter, not on an exception the system absorbs.
- **Two tabs at the same URL make `eval` and the driven tab diverge.** Close duplicates to exactly
  one before believing any prod measurement.
- **Never judge `/api/answer` on the first post-deploy request**, nor on the first request after any
  page load.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy.**
- **`curl` to prod `/api/answer` is classifier-blocked.** Use Interceptor. Foreground `sleep` is
  blocked; use `interceptor wait`.
- **The composer accepts ONE programmatic submit per page load.** Reload between probes, wait ~8s,
  count `#thread .msg` before AND after.
- **`wrangler deploy` needs Erik.** A plain build silently un-authors prod.
- **Check the EXIT CODE, not the tail** — and `bun run build` exits 0 when the CSS parser silently
  DISCARDS a rule, so also grep the shipped output for the rule itself.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **Deploy item 1.** Nothing in this cycle is live.
- **Click ▶ on QTT** so the audio player can be captured (item 3).
- **Restart the hadith generator?** 1,746 of 14,736, ~24h compute — and Muslim-only, so Bukhari
  answers have no Indonesian at all. More urgent now that the answer card displays it. Do not start
  it without asking.
- **Written confirmation of the hadith Indonesian approval** — still VERBAL AND RELAYED in
  `docs/review/hadith-id-approval-2026-08-12.md`, and ISC-449 leans on it harder than the Hadis tab
  did. Do not upgrade its status without an artefact from the ustadz.
- **The Tanya visual pass.** Erik has SEEN the interleaved layout and moved on; spacing, the dotted
  citation underline and the 17.5px step-down were never discussed. Ask before tuning.
- **Copy review** — the bow-out shows the honest-silence copy far more often now, plus ~15 sentences
  of new Indonesian. Consider IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — it says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped. The ⛔ header stands.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- quran.tarjamahtafsiriyah.com's Supabase is DELETED — sign-in broken, which bears on the
  "adopts on sign-in" half of the continuity build.

---

# Next session — New-Quranku (checkpoint 2026-08-13 evening)

> Prepended by /wrap 2026-08-13 evening. Anchor `origin/main` `f916340`. Supersedes the
> 2026-08-13-late anchor `ef80cfc`. **One deploy shipped** (`2f747a1b` → `23f0ad17`). That handoff's
> item 0 (ISC-418) is DONE — but its DIAGNOSIS was falsified, so read §0 before trusting anything it
> said about grounding. Its item 1 (continuous chat) is UNBLOCKED. Its item 2 is now item 0.

Read `PROGRESS.md` first (top checkpoint, 2026-08-13 evening).

**Gates GREEN:** `bun test` 1380/0 exit 0 · typecheck exit 0 · synthesis build exit 0. ISA **458/470**.
**Prod:** worker `23f0ad17`, `EDITION: "synthesis"`, css `index-cT59WjmB.css`, js `index-BURygbT8.js`.
Clean tree except untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.

---

## 0. START HERE — ISC-434/435: the hadith wall refuses a QUARTER of ordinary questions

**Now unblocked.** ISC-449 was the gate and Erik ruled on it 2026-08-13: the ustadz's approval of the
machine Indonesian DOES extend from the Hadis tab to the answer card.

Measured this session, 141 live generations: **`bad_hadith` blocked 24% (34/141)**, `fatwa` 1%. And
`worker/src/index.ts:554` BREAKS rather than retrying on `bad_hadith` — deliberately, for latency —
so every one of those is a reader receiving `{answer:null}`. This is not an edge case; it is roughly
one in four ordinary warm questions.

**Six parts, and the config one is the dangerous one:**

1. `worker/wrangler.toml` — add the `VECTORIZE` binding, the `CORPUS` R2 binding and `CORPUS_DIGEST`.
   **`[env]` blocks do NOT inherit top-level bindings.** This is the ONE file ISC-331 kept the DALIL
   surface off deliberately; a binding change committed but not deployed is a split-brain state.
2. ISC-434 — call `searchDalil` in `handleAnswer`. Probe: `grep -c searchDalil worker/src/index.ts` > 0.
3. ISC-435 — teach `[H:collection:number]` in `SYNTHESIS_SYSTEM_PROMPT`. Probe:
   `grep -c 'H:' web/src/answer-contract.ts` > 0. This is the deeper blocker: the model cannot emit a
   receipt even with a populated union, which is why the wall is unpassable independently of ISC-434.
4. Pass the real predicate as `guardAnswerProse`'s third argument. It is `() => false` today and the
   comment at `index.ts:519-527` explains at length why that is deliberate, not an oversight —
   **that comment becomes wrong the moment 2 and 3 land, and must be rewritten, not deleted.**
5. ISC-449 — the answer-card Indonesian. **Its own field or badge. Never overload `reviewed_id`**
   (ISC-448 is a tested invariant). The approval is **verbal and relayed** — Erik's decision to
   display, not an artefact from the ustadz. Do not write it up as the latter.
6. Test, `VITE_ANSWER_MODE=synthesis bun run build`, deploy from `worker/`, verify in Interceptor.

**Dependencies confirmed present in the account this session:** Vectorize index `okf-hadith`
(1024-dim, cosine — matches bge-m3) and R2 bucket `okf-corpus`. `OPENROUTER_API_KEY` is already a
Worker secret. So nothing here is blocked on provisioning.

**Two constraints with measurements behind them, unchanged:** gate hadith grounding to
knowledge-shaped questions (**9/9 on knowledge, 1/4 on feelings — it rebukes an anxious person**),
and **no score may gate trust** (a correct hit scored 0.3551 while a wrong hit scored 0.3682).

## 1. The cold-start error copy fires on most first requests

Measured incidentally this session: **2 of 3** first-requests after a page load rendered the generic
*"Ada yang salah saat mengambil ayatnya. Mungkin koneksimu sedang tidak stabil."* The warm retry
answered every time. Pre-existing and unrelated to the bow-out, but the standing constraint calls
this "occasional" and 2-in-3 is not occasional — it is what most readers meet on their first question.

Suspect: the 12s `TIMEOUT_MS` in `answer-live.ts` against a ~6s warm generation that is far slower on
a cold isolate. **An aborted fetch leaves NO row in the passive network log**, so absence of an
`/api/answer` row is the abort signature — but it is now ALSO the bow-out signature, so the two can
no longer be told apart by the log alone. Distinguish them by whether grounding existed.

## 2. Continuous chat — unblocked, and the trap is narrower than the PRD says

`.scratch/continuous-chat/PRD.md` blocked this on ISC-418. That block is lifted, but **update the PRD
before building**: its trap section rests on "the model's answers are ungrounded", which is now
measured false (96% grounded citation, +61 pt lift). The half that was real — the model answering
from nothing — is what the bow-out closed. So continuity now builds on a path that either grounds or
stays silent, which is the condition the sequencing decision was actually protecting.

**Settled, do NOT re-open:** window is the **last 6 turns verbatim**. Tabs stay. Continuity is
local-now / adopts-on-sign-in. The warm ustadz voice is already right.

**Still open and worth asking:** does history change what the guard must do (every rule is
sentence-scoped and blind to a ruling built across turns)? And what does "delete" delete — the
transcript only, or the D1 `question` events too?

## 3. ISC-440.6 — a known, pinned over-refusal, now corroborated live

About a fifth of the 24% `bad_hadith` block is this class, and it is no longer only synthetic:
*"Nabi Ya'qub dalam QS Yusuf 12:86 mengajarkan teladan indah…"* was refused on a real generation —
the Qur'an, cited with a resolvable ref, read as an unsourced prophetic attribution. Closing it
requires narrowing a `PROPHETIC` pattern. **Do not.** Pinned as a test.

## Standing constraints (carried forward — all still true, plus three new)

- **NEW — a probe with no control cannot distinguish "it ignored our input" from "our input was
  wrong."** Two live probes founded ISC-418 and blocked a whole build on it; both varied the
  grounding's CORRECTNESS and neither varied its PRESENCE. The three-arm harness
  (`bun run eval:grounding`) is the shape: hold the question fixed, vary the one thing you are
  testing, and always run the blank control. Report the LIFT, never the hit rate.
- **NEW — a test whose failure mode is an exception can pass through the code's own catch.**
  `synthesizeAnswer` returns null on ANY model throw, so a "must not be called" model was swallowed
  and the assertion passed with the fix removed. Force-red every new test; assert on a counter, not
  on an exception the system under test is designed to absorb.
- **NEW — two tabs at the same URL make `eval` and the driven tab diverge**, and the reading looks
  like a regression. Signature: `#q` returns null via `eval --main` while `find` still sees the
  textbox. Close duplicates down to exactly one before believing any prod measurement.
- **Never judge `/api/answer` on the first post-deploy request** — and now also not on the first
  request after any page load; see §1.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy.** Clear caches,
  `location.reload()`, then confirm the loaded asset hash against `ls -t web/dist/assets/*.css | head -1`
  BEFORE any measurement.
- **`curl` to prod `/api/answer` is classifier-blocked.** Use Interceptor. Foreground `sleep` is
  blocked; use `interceptor wait`. Static assets curl fine.
- **The composer accepts ONE programmatic submit per page load**, and a `requestSubmit()` fired
  before the handler mounts submits NATIVELY and reloads the page — leaving `turns=0` and no error.
  Reload between probes, wait ~8s for mount, and count `#thread .msg` before AND after.
- **`wrangler deploy` needs Erik.** It ran clean this session from `worker/` after
  `VITE_ANSWER_MODE=synthesis bun run build`. A plain build silently un-authors prod. There is no
  root `wrangler.jsonc` any more — verified absent.
- **Check the EXIT CODE, not the tail** — and `bun run build` exits 0 when the CSS parser silently
  DISCARDS a rule, so also grep the shipped output for the rule itself.
- **Never hand-set ISA `progress:`.** Compute it (`rg -c '^- \[x\] ISC-' ISA.md`).
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **Restart the hadith generator?** 1,746 of 14,736. Stopped 2026-08-10 pending a ruling that has
  since arrived, so the standing "do NOT restart" is stale, not law. ~24h of compute. **Becomes more
  urgent with item 0** — the answer card will now display Indonesian, and only 12% of the corpus has
  it. Do not start it without asking.
- **Written confirmation of the hadith Indonesian approval** — still VERBAL AND RELAYED in
  `docs/review/hadith-id-approval-2026-08-12.md`, and ISC-449 now leans on it harder than the Hadis
  tab did. Do not upgrade its status without an artefact from the ustadz.
- **The Tanya visual pass.** Erik has SEEN the interleaved layout and moved on, but the spacing above
  and below the card, the dotted citation underline, and whether 17.5px is enough of a step down were
  never discussed. Ask before tuning further.
- **Copy review** — the bow-out now shows the honest-silence copy far more often than before, so that
  sentence is doing more work. Plus ~15 sentences of new Indonesian across recent sessions. Consider
  IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — it says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped. **Partially truer now** (the app no longer authors from
  nothing) but still false in general; the ⛔ header stands.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- quran.tarjamahtafsiriyah.com's Supabase is DELETED — sign-in is broken, which bears on the
  "adopts on sign-in" half of the continuity build.
- CC BY-ND 3.0 on `tanzil-id-kemenag` is stronger than the evidence; everayah licence is an ACCEPTED,
  DOCUMENTED risk — do not reopen.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md` FIRST;
  `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap `tool/translate-aqeeda-id.ts`
  (self-invoking).

---

# Next session — New-Quranku (checkpoint 2026-08-13 late wrap)

> Prepended by /wrap 2026-08-13 late. Anchor `origin/main` `ef80cfc`+. Supersedes the earlier
> 2026-08-13 anchor `f067bd2`. **Two deploys shipped** (`01381b82` → `2f747a1b`). That handoff's
> item 0 (ISC-440, the grammar) is DONE, audited, corrected and verified live.

Read `PROGRESS.md` first (top checkpoint, 2026-08-13 late wrap).

**Gates GREEN:** `bun test` 1373/0 exit 0 · typecheck exit 0 · synthesis build exit 0. ISA **457/470**.
**Prod:** worker `2f747a1b`, `EDITION: "synthesis"`, css `index-cT59WjmB.css`. Clean tree except
untracked `WARP.md` — leave it. No PRs; this repo lands directly on `main`.

---

## 0. START HERE — ISC-418: the model answers from its own knowledge, and continuity is blocked on it

**Erik decided the sequencing this session: fix grounding BEFORE wiring chat history.** Not a
suggestion — a decision, recorded in `.scratch/continuous-chat/PRD.md`.

Measured, twice: `POST /api/answer` with grounding **forced to QS 4:25** answered with 2:221, 5:5 and
60:10 and never mentioned 4:25. With **no grounding at all**, it answered in full anyway. So every
retrieval fix, curated pin and topic correction is invisible on the authored path — the model is not
reading them.

**Why this is item 0 and not item 2:** continuity on top of it compounds. Give the model its own prior
answers as context and it builds on them, including the ones drawn from its own parametric knowledge.
A model citing its own earlier ungrounded claim reads to a reader as consistency, and consistency
reads as authority.

The done-condition is a MEASUREMENT, not a prompt edit: force grounding to a known ayah, ask a
question whose honest answer is that ayah, and show the answer uses it. `web/src/answer-contract.ts`
holds `SYNTHESIS_SYSTEM_PROMPT`; `worker/src/index.ts:473` is `handleAnswer`.

## 1. Continuous chat — the build, once ISC-418 is settled

Erik hit the failure live this session: *"apa itu sabar"* answered fully, then *"apakah sabar ada
batasnya?"* fell through to silence. `AnswerBody` (`worker/src/index.ts:405`) is
`{question, verses, entries, provider}` — **no history field**. The follow-up reached the Worker as a
stranger. Full spec `.scratch/continuous-chat/PRD.md`; read it before touching anything.

**Settled, do NOT re-open:** window is the **last 6 turns verbatim** (not 20 — that cap is a STORAGE
bound; not a rolling summary — model-authored text re-entering the prompt is a new unguarded surface).
Tabs stay. Continuity is local-now / adopts-on-sign-in. The warm ustadz voice is already right.

**Still open in the PRD and worth asking:** does history change what the guard must do (every rule is
sentence-scoped and blind to a ruling built across turns — hedged in turn 3, asserted bare in turn 5)?
And what does "delete" delete — the transcript only, or the D1 `question` events too?

## 2. ISC-434 / ISC-435 — make hadith actually answer questions

Unchanged from the last handoff and still true. `worker/src/dalil.ts` is fully built and measured;
`handleAnswer` never calls `searchDalil`, and `SYNTHESIS_SYSTEM_PROMPT` has zero mentions of the
`[H:collection:number]` syntax. Probes: `grep -c searchDalil worker/src/index.ts` > 0 and
`grep -c 'H:' web/src/answer-contract.ts` > 0. Bindings for Vectorize + `okf-corpus` are deliberately
off the prod Worker (`worker/wrangler.toml:37`); adding them is part of the work, and `wrangler env`
blocks do NOT inherit top-level bindings.

Two constraints with measurements behind them: **gate hadith grounding to knowledge-shaped questions**
(9/9 on knowledge, **1/4 on feelings — it rebukes an anxious person**), and **no score may gate trust**
(a correct hit scored 0.3551 while a wrong hit scored 0.3682).

## 3. ISC-440.6 — a known, pinned over-refusal

*"Nabi Yunus mengajarkan bahwa…"* and *"Kisah Nabi Sulaiman mengingatkan kita bahwa…"* are refused by
the LEGACY weak-verb + `bahwa` pattern. **Pre-existing** — the control scored identically before the
grammar landed. Closing them requires narrowing a `PROPHETIC` pattern. **Do not.** Pinned as a test.

## Standing constraints (carried forward — all still true, plus four new)

- **NEW — a corpus from ONE generator is ONE vocabulary.** The grammar scored 64/64 against a corpus
  it had been tuned against, while a second model found 44 leaks and 39 false positives. Corpus and
  audit are different instruments: generate with one prompt, then have a separate pass ATTACK the
  implementation. Never report a guard closed on the corpus it was tuned against.
- **NEW — generating from an open axis is only safe where the derivation is semantically reliable.**
  `meN-`/`di-` on a speech-act stem always yields a speech act; `ber-`/`ter-`/`memper-` do not
  (`ternyata`, `bersama`, `memperingati`). Their real forms are a small named set — the one case where
  enumeration is the honest instrument.
- **NEW — `.said` has no `font-size`; the chat type rule is `shell.css:774`,
  `clamp(14px, 1.7vw, 17.5px)`.** Editing `--step-*` on `#thread .msg` does NOT change the answer
  prose — `.said` inherits from `body { font-size: var(--step-0) }` and redefining the token further
  down never re-runs that declaration. Measure on the live page before claiming a type change landed.
- **NEW — the composer only accepts ONE programmatic submit per page load.** A second
  `form.requestSubmit()` silently does nothing (the composer re-mounts). Reload between probes, or use
  the `.retry` button. Count `#thread .msg` before AND after — the count is the only honest signal.
- **Never judge `/api/answer` on the first post-deploy request.** Cold isolate aborts; it rendered the
  generic "Ada yang salah" oops twice this session and the warm retry answered fine both times.
- **An aborted fetch leaves NO row in the passive network log** — "no `/api/answer` row and no non-2xx"
  is the signature of an abort, not of a request never made.
- **A stale `CacheStorage` entry serves the OLD css/js right after a deploy**, and a hash-only
  `navigate` does not reload. Clear caches, `location.reload()`, then confirm the loaded asset hash
  against `ls -t web/dist/assets/*.css | head -1` BEFORE any measurement.
- **`curl` to prod `/api/answer` is classifier-blocked.** Use Interceptor. Foreground `sleep` is
  blocked; use `interceptor wait`. Static assets curl fine — that is how the bundle was verified.
- **Interceptor screenshots are unavailable while Chrome is minimized** (`macos windows` → `[]`). Only
  Erik can restore it. State it once, never loop; `eval --main` probes are the evidence to use.
- **`wrangler deploy` normally needs Erik**, but he authorised and it ran clean this session from
  `worker/`, after `VITE_ANSWER_MODE=synthesis bun run build`. A plain build silently un-authors prod.
  The root `wrangler.jsonc` that shadowed the config is GONE.
- **Check the EXIT CODE, not the tail** — and `bun run build` exits 0 when the CSS parser silently
  DISCARDS a rule, so also grep the shipped output for the rule itself.
- **Never hand-set ISA `progress:`.** Compute it.
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **ISC-449** — may the ANSWER card show the machine Indonesian? The Hadis tab already does. Browsing
  a book and being told *"this hadith answers your question"* are different weights on the same words.
  `reviewed_id` must keep its meaning (ISC-448) — add a field or a badge, never overload it.
- **Restart the hadith generator?** 1,746 of 14,736. Stopped 2026-08-10 pending the ruling that has
  since arrived, so the standing "do NOT restart" is stale, not law. ~24h of compute. Do not start it
  without asking.
- **Written confirmation of the hadith Indonesian approval** — still VERBAL AND RELAYED in
  `docs/review/hadith-id-approval-2026-08-12.md`. Do not upgrade without an artefact from the ustadz.
- **The Tanya visual pass.** Erik has now SEEN the interleaved layout and approved it implicitly by
  moving on, but the spacing above/below the card, the dotted citation underline, and whether 17.5px
  is enough of a step down were never discussed. Ask before tuning further.
- **Copy review** — ~15 sentences of new Indonesian across the last three sessions. Consider
  IndonesianPolish.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED** — it says *"Aplikasi tidak mengarang
  jawaban"*, false since the edition flipped.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- quran.tarjamahtafsiriyah.com's Supabase is DELETED — sign-in is broken, which bears on the
  "adopts on sign-in" half of the continuity build.
- CC BY-ND 3.0 on `tanzil-id-kemenag` is stronger than the evidence; everayah licence is an ACCEPTED,
  DOCUMENTED risk — do not reopen.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md` FIRST;
  `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap `tool/translate-aqeeda-id.ts`
  (self-invoking).

---

# Next session — New-Quranku (checkpoint 2026-08-13 wrap)

> Prepended by /wrap 2026-08-13. Anchor `origin/main` `f067bd2`+. Supersedes the 2026-08-12
> late-night anchor `e1ba9cf`. **Four deploys shipped** (`c7999a77` → `88e17cff` → `f128d8a9` →
> `ed556080`). The previous handoff's item 0 (the pointer) is DONE and verified live.

Read `PROGRESS.md` first (top checkpoint, 2026-08-13).

**Gates GREEN:** `bun test` 1227/0 exit 0 · typecheck exit 0 · build exit 0. ISA **445/459**.
**Prod:** worker `ed556080`, `EDITION: "synthesis"`. Clean tree except untracked `WARP.md` — leave it.
No open PRs; this repo lands directly on `main`.

---

## 0. START HERE — ISC-440: the attribution wall is a vocabulary, and it must become a grammar

**This leaked TWICE in production in one evening.** Both times the fix was verified against one
phrasing and the model reached for another within minutes:

1. `mengajarkan` — active voice, absent while `menganjurkan` was present (one letter apart to the eye).
2. `diajarkan oleh Rasulullah` — passive voice; the active patterns anchor subject-then-verb and
   Indonesian puts the agent last via `oleh`.

Both are closed. **The next unlisted synonym or construction leaks identically**, and the stakes are
the highest in the codebase: an unreceipted saying of the Prophet ﷺ reaching a reader.

`PROPHETIC` in `web/src/answer-guard.ts` now holds: the original active list, a `bahwa`-gated weak-verb
list, a generalised `di-…oleh` passive, and `menurut <the Prophet>`. **Do NOT narrow any of them** —
widening only adds refusals; narrowing is how a fabrication ships.

**What "a grammar" means here, concretely:** detect the CONSTRUCTION (a prophetic subject standing in
an agent relation to a speech-act verb, in either voice) rather than enumerating verbs. Options worth
weighing: a morphological rule over Indonesian affixes (`me-`/`di-`/`-kan` on a speech-act stem), or an
allow-list inversion — refuse ANY sentence carrying a prophetic subject plus any verb, unless it
matches a known-safe narrative shape. The second is stricter and the app can now afford strictness,
because a caught hadith renders a pointer rather than cold silence.

**The test file is the spec.** `web/src/answer-guard-hadith.test.ts` holds both directions, including
the two verbatim leaked sentences and the must-pass Qur'anic-narrative cases (*"Kisah Nabi Yusuf
mengajarkan kita arti kesabaran"*) that a flat widening would destroy. Any grammar must keep all of it.

## 1. ISC-449 — may the ANSWER card show machine Indonesian? (waiting on Erik)

The Hadis TAB now shows Indonesian (ISC-445). The answer card still shows Arabic + English only,
because `hadith-card.ts` renders Indonesian solely from per-record `reviewed_id` and I deliberately did
NOT feed that from the machine layer.

**This is a decision, not a task.** Browsing a book and being told *"this hadith answers your
question"* are different weights on the same words. If Erik relays that the approval covers the card
too, the change is small — but `reviewed_id` must KEEP its meaning (ISC-448): it is the only thing
distinguishing "a scholar checked this sentence" from "a scholar permitted this method". Add a separate
field or reuse the machine layer with its own badge; never overload `reviewed_id`.

## 2. ISC-434 / ISC-435 — make hadith actually answer questions

This is what Erik originally asked for, and the Indonesian gate (ISC-445) removed the blocker that
made it pointless. `worker/src/dalil.ts` is fully built and measured — `searchDalil` (bge-m3 → 50-wide
Vectorize window → rerank on the English body), `capForDisplay`, `fetchDisplayRecords`, ids already in
the `hadith-bukhari-6962` shape the guard validates. `hadith-card.ts` renders them, cap 2.

- **ISC-434:** call `searchDalil` from `handleAnswer`; build the predicate from the UNION across calls
  (PRD decision 13 — never per call). Probe: `grep -c searchDalil worker/src/index.ts` > 0.
- **ISC-435:** teach `SYNTHESIS_SYSTEM_PROMPT` (`web/src/answer-contract.ts`) the
  `[H:collection:number]` syntax. Zero mentions today. Probe: `grep -c 'H:'` > 0.
- **Bindings:** the Vectorize index and `okf-corpus` bucket are deliberately NOT on the prod Worker,
  held for exactly this gate (`worker/wrangler.toml:37`, ISC-331/ISC-379). Adding them is part of the
  work, and `wrangler env` blocks do NOT inherit top-level bindings.

**Two constraints with measurements behind them, not opinions:**
- **Gate hadith grounding to knowledge-shaped questions.** Measured on this corpus: 9/9 on knowledge,
  **1/4 on feelings — it rebukes an anxious person.** Someone writing "aku capek banget" must never be
  handed a hadith.
- **No score may gate trust.** `dalil.ts` rule 2, measured twice: a correct hit scored 0.3551 while a
  wrong hit scored 0.3682. Correctness comes from the marker protocol and the guard, never a threshold.

**Erik's own framing to build on:** retrieval may range over all 14,736 records (narrowing
`CANDIDATE_K` reintroduces a measured recall bug), but the display cap of 2 means the set readers
actually reach is small — so spot-review is bounded. Offer to measure that number before he next talks
to the ustadz.

## 3. Restart the hadith generator? (Erik's call)

1,746 of 14,736 records carry Indonesian. Generation was stopped deliberately on 2026-08-10 pending
exactly the ruling that has now arrived, so **the standing "do NOT restart the generator" instruction
was predicated on the approval being absent and should be re-read, not obeyed reflexively.** ~24h of
compute. Do not start it without asking.

## 4. Continuous chat — the build Erik asked for, not started

Full spec `.scratch/continuous-chat/PRD.md`; read it before touching anything. `AnswerBody`
(`worker/src/index.ts`) still has no history field. **Four open questions for Erik are in the PRD — ask
them before building.** Settled, do not re-open: tabs stay, continuity is local-now /
adopts-on-sign-in, the warm ustadz voice is already right.

**ISC-418 should gate this.** Prod answers with NO grounding and ignores grounding it IS given.
Continuity on top makes it worse: a model citing its own earlier ungrounded claim reads as consistency,
which reads as authority.

## Standing constraints (carried forward — all still true, plus five new)

- **NEW — never judge `/api/answer` on the first post-deploy request.** Cold isolate: 12914ms and an
  abort; the identical request then took 7848ms. Warm it, then measure.
- **NEW — the passive network log does NOT record aborted requests.** An aborted fetch looks like "no
  request was made" and sent a whole session down a routing dead end. Instrument `window.fetch` when a
  request seems absent.
- **NEW — a stale `CacheStorage` entry serves the OLD css/js right after a deploy.** Clear caches and
  hard-reload before judging any CSS deploy. (Cost a confident false negative this session.)
- **NEW — a guard's test corpus must come from PRODUCTION OUTPUT, not prose you write.** Two leaks in
  one evening, both because the cases were authored by us.
- **NEW — `--shell-bg`: tune CHROMA, never L.** L 0.990 is load-bearing; it clears the panel's 0.965
  foot and the panel has no border, so the colour step is the only separator.
- **Count `#thread` turns before AND after; a restored thread fakes a fresh answer.** `localStorage`
  replays past turns. Composer is `textarea#q`; the a11y tree does not expose it as a textbox.
- **`curl` to prod `/api/answer` is classifier-blocked.** Use Interceptor. Foreground `sleep` is
  blocked too — use `interceptor wait`.
- **Verify the edition by the INLINED LITERAL, never a grep.** ``function ss(){try{return`synthesis` ``.
  Backtick quoting in zsh will make a correct probe look like a failure.
- **Deploys run from `worker/`**, always after `VITE_ANSWER_MODE=synthesis bun run build` — a plain
  build produces a PRINCIPLED bundle and silently un-authors prod.
- **Check the EXIT CODE, not the tail** — and `$PIPESTATUS` is empty in zsh (it is `$pipestatus`).
  `bun run build` exits 1 on unparseable CSS but **0 when the parser silently DISCARDS rules**, so also
  grep the shipped output for the rule.
- **Never hand-set ISA `progress:`.** This wrap found `436/451` against a real 450, and a tombstone
  written as `- [ ] ISC-…` that every parser would count as open. Compute it.
- **A grep needs a CONTROL.** Against a SPA origin compare body hashes or Content-Type, never status.
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Use `pgrep -fl`, never `ps aux | grep`. Interceptor screenshots are unavailable while Chrome is
  minimized (`macos windows` returns `[]`) — state it once, never loop; `eval --main` probes are the
  evidence to use.
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases. Do NOT narrow any `PROPHETIC` pattern.

## Open items waiting on Erik

- **ISC-449** — may the answer card show machine Indonesian? (§1 above.)
- **Restart the generator?** (§3 above.) 1,746/14,736.
- **Written confirmation of the hadith Indonesian approval.** Currently VERBAL AND RELAYED in
  `docs/review/hadith-id-approval-2026-08-12.md`. Do not upgrade that file without an artefact from the
  ustadz — same rule as `doa-provenance.md`.
- **Copy review** — ~15 sentences of new Indonesian shipped over this session and the last
  (`hadith-defer`, `answer-blocked`, the rewritten Hadis notices). Worth his eye; consider
  IndonesianPolish.
- **Was the outer-frame green right?** It was reasoned and numerically verified but NEVER SEEN —
  Interceptor screenshots failed all session because Chrome's window is minimized, and only Erik can
  restore it. If still too pale: chroma 0.018 → 0.026, do not touch L.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision.
- **ISC-418** — is a model answering fiqh from its own parametric knowledge the product, or a defect?
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED and must not be sent as written** — it
  says *"Aplikasi tidak mengarang jawaban"*, false since the edition flipped. ⛔ header records it.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- An equal-weight three-scholar disclosure was recommended and NOT built.
- quran.tarjamahtafsiriyah.com's Supabase project is DELETED — sign-in and the daily-readers counter
  are broken in prod. Bears on the "adopts on sign-in" half of the continuity build.
- CC BY-ND 3.0 label on `tanzil-id-kemenag` is stronger than the evidence. LPMQ surat permohonan;
  equran.id permission. everyayah licence is an ACCEPTED, DOCUMENTED risk — do not reopen.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md` FIRST;
  `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap `tool/translate-aqeeda-id.ts`
  (self-invoking).

---

# Next session — New-Quranku (checkpoint 2026-08-12 late-night wrap)

> Written by /wrap 2026-08-12 late night. Anchor `origin/main` `e1ba9cf`. Supersedes the earlier
> 2026-08-12 anchor `4c3cbcc`+. **Two deploys shipped this session** (`ab5cddb6` → `c7999a77` →
> `88e17cff`). The previous handoff's item 0 is DONE but did not ship as written — read §0 before
> assuming anything about the hadith wall.

Read `PROGRESS.md` first (top checkpoint, 2026-08-12 late night).

**Gates GREEN:** `bun test` 1216/0 exit 0 · typecheck exit 0 · build exit 0. ISA 436/451.
**Prod:** worker `88e17cff`, `EDITION: "synthesis"`, bundle `index-C8Ur3EzZ.js` confirmed served.
Clean tree except untracked `WARP.md` — leave it. No open PRs.

---

## 0. START HERE — the hadith pointer does not fire in production

The wall now correctly refuses an unreceipted hadith. But the reader gets the **OLD misleading copy**
(*"Aku belum menemukan ayat yang cocok dengan itu di korpus yang sudah diverifikasi"*), not the
`hadith-defer` pointer that was built and deployed for exactly this case.

**Reproduce (real Chrome, Interceptor — the curl path is classifier-blocked):**

```
interceptor tab new "https://new-quranku.axiara.ai"
interceptor eval --main "localStorage.clear()"          # a restored thread WILL fool you — see below
interceptor navigate "https://new-quranku.axiara.ai/"
interceptor eval --main "var q=document.querySelector('#q'); q.focus(); q.value='apakah benar bahwa sakit itu akan menghapus dosa kita?'; q.dispatchEvent(new Event('input',{bubbles:true})); q.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))"
interceptor wait 20000
interceptor eval --main "var t=document.querySelectorAll('#thread > *'); 'turns='+t.length+'|'+t[t.length-1].innerText.slice(0,300)"
```

**COUNT THE TURNS, both before and after.** A restored thread cost a full diagnostic pass this
session: the count stayed 5→5, the page showed a plausible answer, and it was a turn from an earlier
session — not a fresh one. `turns` must INCREMENT or the submit did not fire and the reading is void.

**What is known:** no `/api/answer` request appears in the network log for that turn, so synthesis is
not reaching the endpoint on this path.

**Two candidate causes. NEITHER is established — do not inherit a guess as a finding:**

1. **The client's 12s timeout.** `TIMEOUT_MS = 12000` in `web/src/answer-live.ts`. The widened wall
   means the first candidate is now rejected more often, so the Worker runs TWO generations, which can
   exceed 12s. The client aborts, and an abort is BY DESIGN an absence (not a refusal), so it renders
   `silence`. This is the hypothesis the evidence leans toward — the same question DID author on the
   previous bundle `CaAavd7d` and the only client-side delta is the guard — but leaning is not proof.
2. **Routing.** Something sends the question away from the synthesis branch before the fetch
   (`web/src/main.ts` ~line 620, `isSynthesis() && ref.kind === "not-a-ref" && corpus && !referral`).

**How to settle it in one step rather than guessing:** instrument the Worker's timing, or temporarily
raise `TIMEOUT_MS` and re-probe. If (1), the fix is NOT simply a bigger timeout — a 25s wait on a
religious question is its own product failure. Consider returning `blocked` from the FIRST rejection
without retrying, since for a hadith the retry is spent rather than a chance (already proven
deterministic in `answer-blocked.test.ts`).

**Prod is SAFE meanwhile:** it refuses rather than fabricates. The remaining failure is the
misleading-copy one, which is what this question did all morning — no regression.

## 1. ISC-440 — the verb list is still an enumeration

`PROPHETIC` now catches `mengajarkan`, `menjelaskan`, `menyebutkan`, `memberitahu`, `mengabarkan`,
`menuturkan`, `menyampaikan`, `menegaskan`, `mengungkapkan` (the last group gated on `bahwa` or direct
speech). **The next unlisted synonym leaks identically.** A construction-level test — attribution
grammar rather than vocabulary — is the real fix and is NOT built.

**Do NOT narrow any existing pattern.** Widening only ever adds refusals; narrowing is how a
fabricated hadith ships. And any new verb needs the `bahwa` gate, because a flat addition rejects
*"Kisah Nabi Yusuf mengajarkan kita arti kesabaran"* — measured, in `answer-guard-hadith.test.ts`.

## 2. ISC-434 / ISC-435 — the real hadith-answer path, still blocked on the ustadz

Hadith answers cannot work until BOTH land, and neither should land before Ustadz Ahmad rules on
whether hadith text may display at all — a resolving marker is only useful if a card may render.

- **ISC-434:** wire `searchDalil` (`worker/src/dalil.ts`, fully built — `capForDisplay`,
  `MAX_DISPLAY=2`, `fetchDisplayRecords`, ids already in the `hadith-bukhari-6962` shape the guard
  validates) into `handleAnswer`. Probe: `grep -c searchDalil worker/src/index.ts` > 0.
- **ISC-435:** teach `SYNTHESIS_SYSTEM_PROMPT` (`web/src/answer-contract.ts`) the
  `[H:collection:number]` syntax. Zero mentions today. Probe: `grep -c 'H:'` > 0.

## 3. Continuous chat — the build Erik asked for, not started

Full spec `.scratch/continuous-chat/PRD.md`. Read it before touching anything. `AnswerBody`
(`worker/src/index.ts`) still has no history field. **Four open questions for Erik are in the PRD —
ask them before building.** Settled and not to be re-opened: tabs stay, continuity is local-now /
adopts-on-sign-in, the warm ustadz voice is already right.

**ISC-418 should gate this.** Prod answers with NO grounding and ignores grounding it IS given.
Continuity built on that makes it worse: a model citing its own earlier ungrounded claim reads as
consistency, which reads as authority.

## Standing constraints (carried forward — all still true, plus three new)

- **NEW — a guard's test corpus must come from PRODUCTION OUTPUT, not prose you write.** An open wall
  read as closed for two sessions because every test case was authored by us. Probe live, then pin.
- **NEW — count turns in `#thread` before AND after; a restored thread looks like a fresh answer.**
- **NEW — `curl` to prod `/api/answer` is classifier-blocked.** Use Interceptor. Foreground `sleep` is
  blocked too; use `interceptor wait`.
- **Verify the edition by the INLINED LITERAL, never a grep.** `grep -c synthesis` returns 1 in both
  editions. The distinguisher is Vite's fold: ``function ss(){try{return`synthesis` ``. Backtick
  quoting in zsh will make a correct probe look like a failure — quote carefully.
- **Deploys run from `worker/`**, never the repo root, always after `VITE_ANSWER_MODE=synthesis bun run
  build`. A plain build produces a PRINCIPLED bundle and silently un-authors prod. The root
  `wrangler.jsonc` shadow is GONE (checked this session).
- **Check the EXIT CODE, not the tail** — and note `$PIPESTATUS` is empty in zsh (it is `$pipestatus`).
  Redirect to a file and read `$?`.
- `bun run build` exits 1 on unparseable CSS but **0 when the parser silently DISCARDS rules**.
- **Before believing any geometry measurement, check the loaded stylesheet/bundle hash against disk.**
- **A grep needs a CONTROL.** Against a SPA origin compare body hashes or Content-Type, never status.
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Use `pgrep -fl`, never `ps aux | grep`. Interceptor screenshots are unavailable while Chrome is
  minimized — state it once, never loop; `eval --main` probes work fine and are the evidence to use.
- Do NOT restart the hadith generator (stopped at 1,746/14,736 on purpose). Do NOT rebuild the
  tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut remaining `keluarga`
  aliases.

## Open items waiting on Erik

- **Whether hadith text may EVER display** — blocks ISC-434/435 entirely. With Ustadz Ahmad.
- **ISC-417** — ustadz sign-off on AI-authored answers. Prod authors without it, by Erik's decision. A
  heads-up is not a cleared gate.
- **ISC-418** — is a model answering fiqh from its own parametric knowledge the product, or a defect?
- **Copy review** — ~10 sentences of new Indonesian shipped this session (`hadith-defer`,
  `answer-blocked`, in `main.ts` and `web/demo/demo.ts`). Worth Erik's eye; consider IndonesianPolish.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED and must not be sent as written** — it
  says *"Aplikasi tidak mengarang jawaban"*, false since the edition flipped. A ⛔ header records it.
  Needs rewriting around whether the app may compose fiqh at all, not the pin list.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- An equal-weight three-scholar disclosure was recommended and NOT built.
- quran.tarjamahtafsiriyah.com's Supabase project is DELETED — sign-in and the daily-readers counter
  are broken in prod. Bears on the "adopts on sign-in" half of the continuity build.
- Written confirmation of Ustadz Ahmad's VERBAL doa approval (do not upgrade
  `docs/review/doa-provenance.md` to written).
- CC BY-ND 3.0 label on `tanzil-id-kemenag` is stronger than the evidence. LPMQ surat permohonan;
  equran.id permission. everyayah licence is an ACCEPTED, DOCUMENTED risk — do not reopen.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md` FIRST;
  `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap `tool/translate-aqeeda-id.ts`
  (self-invoking).

---

# Next session — New-Quranku (checkpoint 2026-08-12 wrap)

> Written by /wrap 2026-08-12. Anchor `origin/main` `4c3cbcc`+. Supersedes the 2026-08-12-night
> anchor `3a037ee`. Prod DEPLOYED this session at `ab5cddb6` — the previous handoff's "deploy first"
> is done; item **0** below replaces it as the first action.

# New-Quranku (`~/quran-new`)

Read `PROGRESS.md` first (top two checkpoints, both 2026-08-12 night). Anchor: `origin/main` at
`fb17a6c`. Clean tree except untracked `WARP.md` — leave it.

**Gates GREEN:** typecheck 0 · `bun test` 1183/0 · build 0. ISA 423/433.

---

## 0. START HERE — the app goes silent on any question whose answer is a hadith

**Erik hit this live and it is the failure his users will hit most.** Reproduced cold, 2/2:

```
curl -s -X POST https://new-quranku.axiara.ai/api/answer -H "Content-Type: application/json" \
  -d '{"question":"apakah benar bahwa sakit itu akan menghapus dosa kita?"}'
→ {"answer":null}
```

**It is NOT a stale bundle** (an earlier diagnosis said so and was wrong — Erik's screenshot showed a
full authored answer with verse cards one turn earlier, which only a synthesis bundle can render).
**It is NOT the continuity gap** — it refuses with no history at all.

**Cause:** the honest answer to that question is a hadith, not an ayah. The model writes
*"Nabi ﷺ bersabda…"*, and `hadithShape` (`web/src/answer-guard.ts:156`) rejects any prophetic
attribution with no resolvable marker. On this path **nothing can ever resolve one**:
`web/src/answer.ts:110` calls `safeAnswer(prose, isRealAyah)` with only two arguments, so
`isGroundedHadith` takes its default `() => false`. Every marker fails by construction, both retries
reject, and the reader gets the cold silence Erik has now refused twice.

**The fix, in order:**

1. **Wire hadith grounding through.** `groundedHadithFrom` and `markersInProse` already exist in
   `answer-guard.ts` and are unused on this path. Retrieve hadith for the turn, build the predicate
   from the union of what was retrieved (PRD decision 13 — accumulate across calls, never per call),
   and pass it as `safeAnswer`'s third argument. Until this lands, the hadith wall is not a wall, it
   is a blanket refusal.
2. **A guard rejection must never render as "nothing found".** Today `synthesizeAnswer` returns
   `null` for *both* "no grounding" and "the guard rejected it", and `main.ts` renders the identical
   silence. Distinguish them: when the model had something and the wall stopped it, say so and point
   — *"ini jawabannya ada di hadis, bukan di ayat"* with a door into Hadis. **A pointer beats
   silence** (already a recorded lesson on this repo — see the grounded-alias short-circuit).
3. **Check the rights gate before displaying anything.** Hadith TEXT display is still ungated by the
   ustadz (`SHOW_MACHINE_HADITH_TEXT=false`, and whether hadith text may EVER display is open). A
   pointer to Hadis is safe today; rendering hadith text inside an answer is not. Do not conflate.

**Also unresolved and related:** the same silence fires for any question the corpus cannot serve. The
principled fallback copy (*"Aku belum menemukan ayat yang cocok…"*) is written for a retrieval miss
and is actively misleading when the truth is "the wall stopped a good answer".

## 1. Deploy — DONE 2026-08-12, but re-read this before the next one

**Already deployed** at Erik's instruction: `new-quranku-proxy` version `ab5cddb6`, `EDITION:
"synthesis"`, serving `index-n0j2Eeyk.js`. The fatwa-wall fix, both prompt rules and the Fikih card
shape are all LIVE. Post-deploy measurement of the twelve questions: quoted-scripture 1 → **0**,
`yang artinya` 2 → **1** (one residual leak in `apakah musik haram`), and the forced-grounding nikah
case came back clean on all three shapes. ISC-419/420 verified live.

For the NEXT deploy: `cd worker && bunx wrangler deploy`, always after
`VITE_ANSWER_MODE=synthesis bun run build`.

The synthesis bundle is already built and verified by the inlined literal
``function ss(){try{return `synthesis` ``. **Always rebuild with
`VITE_ANSWER_MODE=synthesis bun run build` before deploying prod** — a plain build produces a
PRINCIPLED bundle and would silently un-author production.

**Then re-measure, because the prompt fix is an unverified claim about behaviour.** The same twelve
questions are in `docs/review/answer-audit-questions-2026-08-12.txt`. POST each to
`https://new-quranku.axiara.ai/api/answer` and count how many still carry (a) a hand-written
translation of an ayah in quotes, (b) `para ulama sepakat` / a named madzhab's position. Both were
fixed at the PROMPT, so until they are measured against live output they are not done. ISC-419 and
ISC-420 stay `[ ]` until then.

## 2. THE BUILD ERIK ASKED FOR — continuous chat

Full spec: **`.scratch/continuous-chat/PRD.md`**. Read it before touching anything.

One-line version: the app has a persistent *transcript* and a non-continuous *conversation*, and
Erik is asking for the second. `AnswerBody` (`worker/src/index.ts:405`) has no history field, so a
follow-up like `kenapa?` has nothing to attach to.

**Settled by Erik, do not re-open:** the app keeps its current shape (tabs stay, nothing folds into
chat); continuity is *local now, adopts on sign-in*; the warm ustadz voice is already right and is
not to be "improved".

**Four open questions for Erik are listed in the PRD — ask them before building, not after.**

## 3. THE THING THAT SHOULD GATE #2 — ISC-418

Production is warm and it is **not** referring to our corpus. Measured: grounding forced to QS 4:25
came back citing 2:221, 5:5, 60:10; with *no* grounding at all it answered in full anyway.

This matters for #2 specifically: **continuity built on top of it makes it worse.** Each ungrounded
answer stands alone today. Give the model its own prior answers as context and it will build on
them, and a model citing its own earlier ungrounded claim reads as consistency — which reads as
authority. Settle ISC-418 with Erik before or alongside the continuity build.

## Standing constraints (carried forward — all still true)

- **Verify the edition by the INLINED LITERAL, never a grep.** `grep -c synthesis` returns 1 in both
  editions' bundles. The distinguisher is Vite's constant fold.
- **Deploys run from `worker/`**, never the repo root.
- `bun run build` exits 1 on unparseable CSS but **0 when the parser silently DISCARDS rules** — exit
  code is necessary, not sufficient. Measure the element live after any CSS edit.
- **Before believing any geometry measurement, check the loaded stylesheet hash against disk.** The
  preview server caches `index.html` and will hand you a confident wrong number. Restart it, don't
  just reload. (Cost a full measurement pass last session.)
- **A grep needs a CONTROL.** Against a SPA origin compare body hashes or Content-Type, never status
  codes.
- Verify composer controls by COUNTING TURNS appended to `#thread`, not `box.value`.
- Before borrowing a class, `rg` it in `main.ts`'s delegated click handler — `.seed` calls
  `ask(button.textContent)`.
- Editing `web/src/topic-subjects.ts` REQUIRES re-running `bun run app:topic-subjects`.
- Use `pgrep -fl`, never `ps aux | grep`.
- **Interceptor:** screenshots are unavailable while Chrome's window is minimized
  (`macos windows` returns `[]`). State it once, never loop. DOM/geometry probes via
  `eval --main` work fine and are the evidence to use.
- Do NOT restart the hadith generator (stopped at 1,746/14,736 on purpose).
- Do NOT rebuild the tanya-hukum PRD. Do NOT fix the feeling-word filter wholesale. Do NOT cut the
  remaining `keluarga` aliases.

## Open items waiting on Erik

- **Deploy** (above). Nothing from 2026-08-12 night is live.
- **ISC-418** — is a model answering fiqh from its own parametric knowledge the product, or a defect?
- **ISC-419 / ISC-420** — fixed at the prompt; a hard egress wall was deliberately NOT built because
  it would reject `apakah musik haram` and `bolehkah perempuan jadi pemimpin`, the app's two best
  answers, and fall back to the caption list Erik refused.
- **`docs/review/hukum-pin-request-2026-08-12.md` is BLOCKED and must not be sent as written.** It
  says *"Aplikasi tidak mengarang jawaban"* — false since the edition flipped — and is addressed to
  Ustadz Ahmad. A ⛔ header now records that plus the falsified premise. It needs rewriting around
  the question that actually matters now (may the app compose fiqh at all), not the pin list.
- **Ustadz sign-off on AI-authored answers (ISC-417)** — prod authors without it, by Erik's decision.
  A heads-up is not a cleared gate.
- `gimana bersikap ke teman yang beda agama` held out of the question pool pending his eye.
- An equal-weight three-scholar disclosure was recommended and NOT built.
- quran.tarjamahtafsiriyah.com's Supabase project is DELETED — sign-in and the daily-readers counter
  are broken in production. **This bears on the "adopts on sign-in" half of the continuity build.**
- Written confirmation of Ustadz Ahmad's VERBAL doa approval (do not upgrade
  `docs/review/doa-provenance.md` to written).
- CC BY-ND 3.0 label on `tanzil-id-kemenag` is stronger than the evidence.
- LPMQ surat permohonan; equran.id permission. Whether hadith text may EVER display.
- everyayah licence is an ACCEPTED, DOCUMENTED risk — do not reopen as undecided.

## Not started

- Aqeedah Ar→Id in `~/printing-press/library/tafseer-okf`. Read `.planning-aqeeda-id-resume.md`
  FIRST; `bun run aqeeda:verify-id` must exit 0. NEVER import or wrap
  `tool/translate-aqeeda-id.ts` (self-invoking).
