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
