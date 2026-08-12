# Next-session prompt — New-Quranku

> Paste the short block at the bottom into a fresh session started in `~/quran-new`.
> Written 2026-08-10 ~14:55 GMT+7, **merging two parallel sessions' handoffs**. Anything dated
> later supersedes it. If this is more than a few days old, re-verify prod, the generator, and the
> test gates before believing any number here.

Two workstreams ran in parallel on 2026-08-10 and were merged into `main`:

- **A — reading surfaces** (`main`): Hadis/Fikih Indonesian layer, section-title fix, mic fix.
- **B — Tanya agent** (`worktree-humming-riding-scone`, PR #3): OKF retrieval, rerank, hadith card.

They touched **no source file in common**. The merge conflict was three metadata files only.

---

## Where things stand

- **Anchor `origin/main` `d32f2b9`**, clean tree, 0 ahead/0 behind. Top `PROGRESS.md` checkpoint:
  "The text layer went dark, and two parallel sessions became one branch".
- **Prod** Worker `39b922c1`, serving `index-CKqG9c2u.js` / `index-CsxJlLtp.css`. Workstream A is
  deployed; **workstream B is not deployed and must not be** without Erik's word.
- **ISA 357/363** — 357 met, **5 open**, 1 deferred. The older "313/315" in checkpoints predates the
  merge. The 5 open, by name:
  - **ISC-354** — `bun run typecheck` exits 0. NOT MET (exit 2; see red gates below).
  - **ISC-353** — `bun test` green on a checkout that has the corpus.
  - **ISC-323** — live rank 1 for `gimana hukumnya meninggalkan sholat` is not Muslim 154.
  - **ISC-323.2** — explain why the live candidate set differs from offline cosine.
  - **ISC-98** — real-iOS `visualViewport` composer check. Blocked on a physical device.
  - (**ISC-189**, 60fps on mid-range Android, is `[DEFERRED-VERIFY]` — also device-blocked. It uses
    a non-checkbox marker, which is why checkbox counts read 362 and the frontmatter says 363.)
- **Bab titles COMPLETE**: 4,864 / 4,864 translatable, live. The 3 unfilled keys (`muslim/53/0`,
  `bukhari/96/0`, `bukhari/97/49`) have 0-char Arabic source. Nothing to translate; do not chase.
- **Machine-translated hadith TEXT is GATED OFF** — `SHOW_MACHINE_HADITH_TEXT = false` in
  `web/src/hadith-id.ts`. See "The hadith-text ruling" below. It briefly shipped and was pulled.
- **Hadith text generation is STOPPED, DELIBERATELY**, at **1,746 / 14,736** (7.3s/record).
  Erik's call, 2026-08-10, immediately after the display gate went in: the output cannot currently
  be shown and may never be, so it is not worth ~26 more hours of API spend until Ustadz Ahmad
  rules. **Do NOT restart it.** Progress is preserved and it resumes by skipping what exists
  (`bun run src/app/translate-hadith.ts`) if and when the ruling comes.
  If you ever do run it: `pgrep -fl "translate-hadith\.ts"` FIRST, and never start a second
  instance — two ran concurrently against the same shards earlier that day.

## First actions

1. **Do not restart the hadith generator.** It is stopped on purpose (see above). If you think it
   should run, ask Erik — do not infer it from the fact that it is idle.
2. **Check the two red gates below.** Erik was told explicitly that main stops being green and said
   to proceed — do not re-litigate that, but do not silently hide it either.
3. **`web/dist` holds a MERGED build while prod is pre-merge.** A routine `wrangler deploy` from
   this tree would ship the whole Tanya agent workstream, which Erik has not approved. Rebuild and
   check the bundle hash against what prod serves before any deploy.
4. **ISC-98 and ISC-189 are device-blocked** — real-iOS `visualViewport`, and 60fps on a mid-range
   Android at `#/peta`. Do not attempt to close either in a browser.

## The two red gates — BOTH GREEN as of 2026-08-10 evening

Superseded reading below, kept for the trail. Current state:

- **`bun run typecheck` exits 0** (all three `tsc` passes). Eight errors, not four — the `&&` chain
  only ever shows the first failing pass, so each fix unmasked the next tranche. The only structural
  one: `count-defer` entered the SHARED `Turn` union for the demo, and `renderTurn` in the main app
  silently stopped being total. Two fixes were deliberately NOT the obvious one — `tafsirStack` was
  left narrow (the `undefined` was a parallel-array indexing artifact, not a real state), and
  `worker/src/index.ts`'s `proxyToOrigin` was EXPORTED rather than deleted, because it is the
  documented one-line revert to Cloud Run.
- **`bun test` is 1064/0, exit 0.** The `GlobalRegistrator` collision is diagnosed, not just absent:
  all seven DOM suites balance `register()`/`unregister()` and Bun runs files sequentially, so the
  collision requires a suite to ABORT before `afterAll`. A probe that registered then threw
  reproduced branch B's exact error in the next suite. Branch B's 10 errors were the cause; the 8
  collisions were the cascade — most likely the missing `data/`/`node_modules` worktree symlinks.
  **Do NOT apply the `bunfig.toml` preload fix** — idempotent registration would hide the aborts.

### Superseded (pre-fix) reading

- **`bun test`** — on branch B this was **890 pass / 10 fail / 10 err**: eight DOM suites colliding
  on `GlobalRegistrator.register()` ("Happy DOM has already been globally registered"). Each passes
  alone. Likely fix: one `preload` in `bunfig.toml` that registers once, replacing every per-file
  `register()`. **`web/src/dictate.test.ts` (workstream A) uses that same per-file pattern**, so it
  is part of the collision set now. **This repo has no `.github/` and no CI** — the local run is
  PR #3's only gate.
- **`bun run typecheck`** — exit 2, 4 errors in `web/src/main.ts` (3) and `web/src/peta.ts` (1).
  Newly *visible*, not newly broken: `typecheck` chains three `tsc` passes with `&&` and the root
  pass had been short-circuiting the rest. Expect `src/eval`'s pass to reveal more once web clears.
  **Never check this with `| tail`** — that reports `tail`'s exit code, which is 0. Redirect and
  echo `$?`.

## The hadith-text ruling (2026-08-10, Erik)

**Bab titles stay. Hadith text goes dark.** A clumsy chapter heading is a bad heading; a clumsy
rendering of the Prophet's ﷺ transmitted speech is a fabricated saying. This repo already refused an
unreviewed AI Indonesian rendering of the Dorar surah preface on those grounds, and
`web/src/hadith-card.ts` states the same rule for the Tanya surface: no Indonesian until Ustadz Ahmad
approves THAT record, one hadith at a time (`reviewed_id` is the per-record hook).

It is a **gate, not a deletion** — the 1,746 generated records stay exactly where they are, and
shipping later costs one constant, or better a per-record approval check. Locked by
`web/src/hadith-id.test.ts`. (Generation itself is now stopped too; see "Where things stand".)

Evidence the risk is real, not theoretical: bab 2 of Bukhari's Kitab al-Iman
(`دُعَاؤُكُمْ إِيمَانُكُمْ`, a flat equative — "your supplication IS your faith") came back as
"Doa kalian adalah **bagian dari** keimanan kalian", inserting a hedge the Arabic does not contain.
Plausible Indonesian, invisible to any parity test.

## Open finding most likely to hide another wrong diagnosis (workstream B)

**ISC-323.2** — offline cosine over `data/okf/vectorize-upsert.ndjson` does **not** reproduce live
Vectorize: offline 0.51–0.59 put Sahih Muslim 154 at rank 28; the live Worker returned 0.43–0.50 and
a different candidate set. Until explained, **no offline retrieval number may be quoted as evidence
about live behaviour** — including that session's bake-off matrix.

**ISC-323 is NOT met.** Live rank 1 for `gimana hukumnya meninggalkan sholat` is Bukhari 540 — on
topic, but not Muslim 154, which is absent from the live top-8. The named false friend IS displaced;
do not mark it passed because the outcome improved.

Probe: `cd worker && bunx wrangler dev --config wrangler.dalil-probe.toml --remote --port 8799`
then `curl 'http://127.0.0.1:8799/?q=...'`.

## Standing constraints — do not relax any of these

**Rights and content**

- This repo is **PUBLIC** and the hadith are `usage: reference-only`. Never vendor corpus text into
  git — not chunked, not "derived". `data/` is gitignored; keep it that way.
- **Never push tafseer-okf to a public repo** — 0 of 18,882 records are distributable.
- `MAX_DISPLAY = 2` is a rights position enforced in three places. `private` records are filtered at
  BOTH build and query time. **RETRIEVABLE ≡ DISPLAYABLE** — a record with no English is excluded
  from the rerank layer too, or the model can cite it by marker and the renderer drops the card,
  leaving a prophetic attribution with nothing behind it.
- Hadith search runs for KNOWLEDGE questions only. Feelings stay on the Qur'an path — measured, not
  preference ("cemas terus" retrieves a rebuke about asking too many questions).
- Generated Indonesian is a gitignored SIDECAR under `web/public/hadith-id/`. Never edit corpus
  shards under `web/public/hadith/`. The layer must stay `rm`-able until the ustadz signs off.

**Retrieval**

- `CANDIDATE_K = 50` is not a tuning knob. The correct record for the regression case sits at 28.
- No similarity or rerank score may gate trust. The bands overlap between right and wrong hits.

**Deploys and infrastructure**

- **Prod deploys are Erik's call, every time.** Ask; never infer from a previous approval.
- **NEVER run wrangler from the repo root.** It self-scaffolds a `wrangler.jsonc` that shadows
  `worker/wrangler.toml` and breaks every deploy. Deploy is `cd worker && bunx wrangler deploy`.
- Do NOT touch `worker/wrangler.toml`. The R2 binding and `CORPUS_DIGEST` live only in
  `wrangler.dalil-probe.toml` (PRD decision 11).
- **`web/dist` is SHARED** by the principled and synthesis builds. After any
  `VITE_ANSWER_MODE=synthesis` build, rebuild plain and verify by content hash. Grepping for
  `api/answer` does NOT distinguish them — that string is in both. The real check is that a plain
  rebuild reproduces the hash and the lone `synthesis` occurrence is the dead comparison Vite
  collapses to `principled`.
- Verify secrets ONLY with `grep -c` or a checksum. Never cut/sed/awk/head a secret file.

**Verification discipline**

- **`bun test` NEVER compiles CSS.** Check `bun run build`'s EXIT CODE, never a grep.
- **`pgrep -fl`, never `ps aux | grep … && echo`.** The grep form reported a live generator as dead
  twice on 2026-08-10 and caused a duplicate process against the same shard files.
- **Verify served bytes before believing any probe.** A first fetch after deploy can return
  `index.html` via the SPA fallback (≈15.5 kB) before the asset propagates. And a browser can hold a
  stale document after a deploy while `curl` shows the new one — open a NEW page with a
  cache-busting query before concluding a fix did not land.
- **Verification is OFF Erik's Chrome** by his request: dev server on localhost:5173 for him in
  Cursor's Simple Browser, isolated Chrome DevTools MCP for measurement. Overrides CLAUDE.md's
  Interceptor rule. Re-confirm it still holds.
- Worktrees need `node_modules` and `data/{canonical,hadith-src,raw,review,surah-intro-src}`
  symlinked from the main checkout, then `bun run app:corpus`. Without them the suite fakes a
  corpus regression.
- **`DESIGN.md`'s token block is GENERATED** (`bun run app:design`); amend the prose above it.
- Criteria must name repositories, never mutable aliases like a remote name.

**The two translation generators have OPPOSITE partial-batch rules ON PURPOSE.**
`translate-babs.ts` DISCARDS partial batches (position carries identity — a short reply silently
misaligns every later title). `translate-hadith.ts` KEEPS them (a `###N###` delimiter carries
identity), so its `~ batch returned 0 of 3 … keeping what arrived` lines are correct behaviour.
Do not "fix" one to match the other. When batches are being discarded, the safe lever is a smaller
`--batch`, never the rule.

## Waiting on Erik

- **Ustadz Ahmad's Phase 4 sign-off** on agent output. He gave a heads-up to proceed with the build.
  That is NOT the sign-off, and the two must not be collapsed.
- **Whether hadith text may EVER display**, and on what terms — the gate above is a holding position.
- **Set the synthesis key**: `cd ~/quran-new/worker && bunx wrangler secret put OPENROUTER_API_KEY
  --env synthesis`. Interactive hidden prompt ONLY — the harness `!` uploads an empty value.
- **Tap Dengar on `#/surah/1`**, pick "Lanjut otomatis" — needs a real user gesture.
- **Try the mic** (`#mic`). Lifecycle proven end-to-end against production bytes; real speech through
  a real device has never been exercised.
- Still undecided in the PRD: agent persona/name, cost ceiling, **rate limiting** (a public
  tool-calling agent on a paid model is a cost-attack surface and must exist before Phase 4), consent
  copy for opt-in memory, SEA-LION quality evaluation, fate of `new-quranku-ai` after the flip.
- Two long-standing sends: the sunnah.com API/dump request, and the LPMQ surat permohonan.

---

## The prompt to paste

```
Resume New-Quranku in ~/quran-new. Read .planning/next-session-prompt.md first — it merges two
parallel workstreams and carries the hard constraints and the open decisions. Then confirm the
hadith generator is STILL STOPPED with `pgrep -fl "translate-hadith\.ts"` (no match is the
correct state) — it is stopped on purpose; do not restart it without asking Erik.

Both red test gates are now GREEN: `bun run typecheck` exits 0 and `bun test` is 1064/0.
`web/dist` holds a build NEWER than prod (prod is still pre-merge `index-CKqG9c2u.js`), so a
routine deploy would ship the unapproved Tanya agent workstream — rebuild and diff the hash
before any deploy, and ask Erik first.
```

---

## 2026-08-11 UPDATE — supersedes the paste-block below

```
Resume New-Quranku in ~/quran-new. Read PROGRESS.md (top checkpoint 2026-08-11) then
.planning/next-session-prompt.md. Anchor origin/main e725fd5, clean tree except untracked WARP.md.

Both red gates are GREEN: `bun run typecheck` exits 0, `bun test` 1064/0, `bun run build` exits 0.
ISA 360/365. Open: ISC-98 (iOS device), ISC-323 + ISC-323.2 (live-vs-offline retrieval),
ISC-353.0 (superseded tombstone).

Do next, in order:
1. "Kumpulan Doa" left-panel section. Nav is ~6 lines in web/index.html:52-76, matching the
   Tanya/Al Qur'an/Hadis/Fikih/Tematik pattern. CONTENT is the blocker, not the nav: equran.id's
   doa family is `reference-only`, "no published terms; ask equran.id", 227 doa. Do NOT vendor it.
   Erik intends to make this repo PRIVATE -- that does NOT authorise shipping the corpus, because
   the APP IS DEPLOYED PUBLICLY at new-quranku.axiara.ai and serving it is publishing.
   Viable path = runtime query-and-quote through worker/, or equran.id's written permission.
   Do not ship a nav link without a working route -- prod is live.
2. Prod deploy decision for the merged Tanya agent workstream. Prod still serves the PRE-MERGE
   index-CKqG9c2u.js; `web/dist` is newer. Rebuild and diff the hash; ASK Erik before deploying.
3. ISC-323 / ISC-323.2 -- no offline retrieval number may be quoted as evidence about live
   behaviour until the live-vs-offline divergence is explained. Probe:
   cd worker && bunx wrangler dev --config wrangler.dalil-probe.toml --remote --port 8799
4. In ~/printing-press/library/tafseer-okf: the aqeedah Ar->Id run may still be going or may have
   finished. Read .planning-aqeeda-id-resume.md FIRST. `bun run aqeeda:verify-id` must exit 0
   before the lane may be committed; the lane is gitignored on purpose.

Constraints: prod deploys are Erik's call every time; NEVER run wrangler from the repo root;
pgrep -fl never `ps aux | grep`; bun test never compiles CSS (check build's EXIT CODE);
gitignored is NOT undeployed, and PRIVATE REPO IS NOT PRIVATE DEPLOYMENT.
NEVER import or wrap tool/translate-aqeeda-id.ts -- it self-executes a full 1,454-record run
(cost ~55 records twice). Single record: AQEEDA_ONLY=01/46.md.
Do NOT restart the hadith generator (stopped at 1,746/14,736 on purpose).

Open items waiting on Erik: LPMQ surat permohonan reply (unblocks Kemenag tafsir display);
Ustadz Ahmad Phase 4 sign-off; whether hadith text may EVER display; equran.id permission for doa;
making quran-new private; set OPENROUTER_API_KEY via interactive prompt; tap Dengar on #/surah/1;
try the mic on a real device; sunnah.com API/dump request.
```

---

## 2026-08-11 (later) UPDATE — supersedes every block above

```
Resume New-Quranku in ~/quran-new. Read .scratch/tanya-hukum/PRD.md FIRST — it is the whole
brief for the next build and it carries a reproduction you should not re-derive. Then skim the
top PROGRESS.md checkpoints. Anchor origin/main 80c37f8 (see the 2026-08-11 evening checkpoint), clean tree except untracked WARP.md.

Gates GREEN: bun run typecheck exits 0, bun test 1076/0, bun run build exits 0. ISA 382/388.
Prod = new-quranku-proxy version 8caeda1d, serving index-BjuemEbN.js / index-CXUVBmR_.css.
Kumpulan Doa is LIVE at #/doa, and Pengaturan (settings dialog beside Masuk) is LIVE (shipped on Ustadz Ahmad's VERBAL agreement, recorded as verbal
in docs/review/doa-provenance.md — do NOT upgrade that to a written sign-off in any doc).

BUILD THIS, in order (all four steps are specified in the PRD):
1. Write `subjectHit` and apply it in matchTopic (web/src/knowledge.ts:203) so a QUESTION_FRAME
   word can never win TOPIC SELECTION on its own. READ web/src/topic-words.ts:67-83 FIRST — the
   reasoning there is correct and must be honoured, not replaced. Frequency has already been
   tried against this index twice and failed twice; the separator is word CLASS.
   Reproduce before touching anything: matchTopic("warisan") -> keluarga (right), but
   matchTopic("hukum warisan") -> perintah-dan-larangan (wrong). That is the whole bug.
2. Add topic pins (matchPin exists, pins do not) for warisan, nikah, talak, riba, zakat, puasa,
   sholat, aurat.
3. Third tier: when tiers 1-2 come back thin, name the ayah(s), render them, and quote the
   sourced tafsir VERBATIM + attributed from web/public/tafsir/{surah}/{ayah}.json
   (source:as-saadi | source:ibn-kathir | source:mukhtasar, 6,237 files, already deployed).
4. Regression tests, force-red EACH: "hukum warisan", "hukum riba", "hukum pacaran",
   "cara sholat", plus "cemas terus" proving the feelings lane did not start answering hukum.

THE THREE DECISIONS (grilled from Erik 2026-08-11 — do not re-litigate):
- Show the dalil, never rule. fatwaShape stays unconditional; "kami tidak berfatwa" unchanged.
  But it must NOT be dry — the reader must be told what the dalil is actually about.
- Second lane, different safety model: the 191-verse feelings lane keeps per-verse ustadz
  review untouched; the knowledge lane's guarantee is quote-verbatim-with-attribution, never
  compose. Neither guarantee may be weakened to help the other.
- Tanya may quote tafsir as a third tier.

Constraints (unchanged): prod deploys are Erik's call EVERY time; NEVER run wrangler from the
repo root (cd worker && bunx wrangler deploy); pgrep -fl never `ps aux | grep`; bun test never
compiles CSS so check build's EXIT CODE; gitignored is NOT undeployed and a private repo is NOT
a private deployment; NEVER import or wrap tool/translate-aqeeda-id.ts (self-executes 1,454
records — single record is AQEEDA_ONLY=01/46.md); do NOT restart the hadith generator (stopped
at 1,746/14,736 on purpose).

Before trusting ANY guard you did not just force-red: ask what the current maximum is. A bound
set above every existing value has never fired. That is how `label.length <= 64` passed while
four doa labels carried verbatim spans of the translations we ship.

STILL OPEN: ISC-323.2 (probe config now fixed, but `wrangler dev --remote` fails at
"Could not create remote preview session on your account"; wrangler whoami is healthy) —
no offline retrieval number may be quoted as evidence about live behaviour until explained.
ISC-98 (real iOS device). Aqeedah Ar->Id lane running in ~/printing-press/library/tafseer-okf
(read .planning-aqeeda-id-resume.md first; `bun run aqeeda:verify-id` must exit 0 before the
lane may be committed; it is gitignored on purpose).

WAITING ON ERIK: which tafsir source, in what order, for hukum questions (Ustadz Ahmad — the
third tier was approved without gating on him, and three schools/eras are involved); whether
the fallback copy should stop saying "korpus yang sudah diverifikasi"; the CC BY-ND 3.0 label
on tanzil-id-kemenag in src/ingest/sources.ts is stronger than Tanzil's actual wording
("non-commercial purposes only", no CC licence named) and should be corrected; LPMQ surat
permohonan reply; sunnah.com API/dump request; equran.id written permission IF the
non-Qur'anic daily doa are ever wanted (admin@equran.id, their ToS §10 promises 30 working
days); whether hadith text may EVER display; set OPENROUTER_API_KEY via interactive prompt;
tap Dengar on #/surah/1; try the mic on a real device.
```
