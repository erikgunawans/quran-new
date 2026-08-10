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

- **Prod** Worker `39b922c1`, serving `index-CKqG9c2u.js` / `index-CsxJlLtp.css`. Workstream A is
  deployed; **workstream B is not deployed and must not be** without Erik's word.
- **ISA 357/363** (`ISA.md`, Cycle 6 = ISC-313..355). The older "313/315" in checkpoints predates
  the merge — it is history, not current.
- **Bab titles COMPLETE**: 4,864 / 4,864 translatable, live. The 3 unfilled keys (`muslim/53/0`,
  `bukhari/96/0`, `bukhari/97/49`) have 0-char Arabic source. Nothing to translate; do not chase.
- **Machine-translated hadith TEXT is GATED OFF** — `SHOW_MACHINE_HADITH_TEXT = false` in
  `web/src/hadith-id.ts`. See "The hadith-text ruling" below. It briefly shipped and was pulled.
- **Hadith text generation is RUNNING** as PID 33579 (started 10:54, outlives its session).
  ~915+/14,736 at 7.3s/record. Resumable; it skips what exists.
  **`pgrep -fl "translate-hadith\.ts"` BEFORE touching it.** Never start a second instance.

## First actions

1. `pgrep -fl "translate-hadith\.ts"` — confirm the generator is alive. Resume only if truly dead.
2. **Check the two red gates below.** Erik was told explicitly that main stops being green and said
   to proceed — do not re-litigate that, but do not silently hide it either.
3. ISC-98 (real-iOS visualViewport composer) and ISC-189 (60fps mid-range Android, `#/peta`) both
   need a physical device. Blocked; do not attempt to close them in a browser.

## The two red gates

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

It is a **gate, not a deletion** — generation continues, the sidecar stays, and shipping later costs
one constant, or better a per-record approval check. Locked by `web/src/hadith-id.test.ts`.

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
parallel workstreams and carries the hard constraints, the two red test gates, and the open
decisions. Then confirm the hadith generator is alive with `pgrep -fl "translate-hadith\.ts"`
before doing anything else.
```
