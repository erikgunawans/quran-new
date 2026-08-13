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
