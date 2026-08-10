# Next session — New-Quranku, Tanya agent Phase 1

Resume New-Quranku. Read `PROGRESS.md` (top checkpoint 2026-08-10, "The reranker was the wrong fix
for the right bug") first, then `.scratch/tanya-agent/PRD.md` — the plan of record, 17 decisions.

## Where things stand

- Branch `worktree-humming-riding-scone` is at **`0678f77`** — ONE squashed commit carrying the whole
  session: rerank stage, text layer, `bad_hadith` guard, hadith card, 46 ISCs, typecheck fixes.
- **UNPUSHED.** `origin` still has the branch at `5ae5ef9`, which is what PR #3 currently shows.
- ISA is **357/363** (`ISA.md`, Cycle 6 = ISC-313..355).
- Nothing deployed. `worker/wrangler.toml` untouched by design (PRD decision 11).

## Task 1 — the merge that failed, and why (do this first)

`git rebase origin/main` **aborts with a conflict on `6326521`** ("feat(okf): corpus manifest +
private R2 rollout"), the OKF commit from the session before last. `origin/main` advanced from
`413dceb` to **`dd01946`** while this branch was out, and diverged in a way that collides with this
workstream's own earlier work.

Erik asked for: squash (done), push, then merge to main. So:

1. `git fetch origin && git log --oneline 413dceb..origin/main` — find out what landed on main and
   WHY it conflicts with the OKF manifest commit. Do not resolve hunks before understanding this;
   see the `nur_worktree_divergence` memory, which records three prior reconciliations where the
   obvious resolution was wrong.
2. Resolve, then push, then merge. Erik has already accepted that **main stops being green** — he was
   told explicitly and said to proceed. Do not re-litigate it, but do not silently hide it either.

## Task 2 — the two red gates (these are what "fix the bugs" still means)

- **`bun test` = 890 pass / 10 fail / 10 err.** All ten are eight DOM suites (`landing`, `split`,
  `peta`, `bookmark`, `hadith`, `migrate-storage`, `surah-intro`, `thread`) colliding on
  `GlobalRegistrator.register()` — "Happy DOM has already been globally registered". Each passes
  alone (`bun test web/src/landing.test.ts` → 26/26). Likely fix: a single `preload` script in
  `bunfig.toml` that registers once, replacing the per-file `register()` calls.
  **This repo has no `.github/` and no CI**, so this local run IS PR #3's only gate.
- **`bun run typecheck` = exit 2, 4 errors** in `web/src/main.ts` (3) and `web/src/peta.ts` (1).
  These are newly *visible*, not newly broken: `typecheck` chains three `tsc` passes with `&&`, and
  the root pass had been failing and short-circuiting the other two forever. Root is green now, so
  the web pass runs for the first time. Expect `src/eval`'s pass to reveal more once web clears.
  **Never check this with `| tail`** — that reports `tail`'s exit code, which is 0. Redirect to a
  file and echo `$?`.

## Task 3 — ISC-323.2, the finding most likely to be hiding another wrong diagnosis

Offline cosine over `data/okf/vectorize-upsert.ndjson` does **not** reproduce live Vectorize:
offline scores ran 0.51–0.59 and put Sahih Muslim 154 at rank 28; the live Worker returned 0.43–0.50
and a different candidate set entirely. Until that is explained, **no offline retrieval number may be
quoted as evidence about live behaviour** — including this session's bake-off matrix.

Related and still open: **ISC-323 is NOT met.** Live rank 1 for `gimana hukumnya meninggalkan sholat`
is Bukhari 540 ("The sin of one who misses the 'Asr prayer intentionally") — on topic, but not
Muslim 154, which is absent from the live top-8. The named false friend IS displaced. Do not mark it
passed because the outcome improved.

Probe with: `cd worker && bunx wrangler dev --config wrangler.dalil-probe.toml --remote --port 8799`
then `curl 'http://127.0.0.1:8799/?q=...'`.

## Standing constraints — do not relax any of these

- This repo is **PUBLIC** and the hadith are `usage: reference-only`. Never vendor corpus text into
  git, not chunked, not "derived". `data/` is gitignored; keep it that way.
- `MAX_DISPLAY = 2` is a rights position enforced in code, in three places. `private` records are
  filtered at BOTH build and query time. **RETRIEVABLE ≡ DISPLAYABLE** — a record with no English is
  excluded from the rerank layer too, or the model can cite it by marker and the renderer drops the
  card, leaving a prophetic attribution with nothing behind it.
- `CANDIDATE_K = 50` is not a tuning knob. The correct record for the regression case sits at rank 28.
- No similarity or rerank score may gate trust. Both bands overlap between right and wrong hits.
- Hadith search runs for KNOWLEDGE questions only. Feelings stay on the Qur'an path — measured, not
  preference ("cemas terus" retrieves a rebuke about asking too many questions).
- Do NOT touch `worker/wrangler.toml`. The R2 binding and `CORPUS_DIGEST` live only in
  `wrangler.dalil-probe.toml`.
- **No deploys.** Prod deploys are Erik's call.
- Verify secrets ONLY with `grep -c` or a checksum. Never cut/sed/awk/head a secret file.
- Worktrees need `node_modules` and `data/{canonical,hadith-src,raw,review,surah-intro-src}`
  symlinked from the main checkout, then `bun run app:corpus`. Without them the suite fakes a
  corpus regression.

## Waiting on Erik

- **Ustadz Ahmad's Phase 4 sign-off** on agent output. He gave a heads-up to proceed with the build.
  That is NOT the sign-off, and the two must not be collapsed.
- Whether to push/merge to the public repo (partially answered — he approved the merge; the rebase
  conflict blocked it).
- Still undecided in the PRD: agent persona/name, cost ceiling, **rate limiting** (a public
  tool-calling agent on a paid model is a cost-attack surface and must exist before Phase 4), consent
  copy for opt-in memory, SEA-LION quality evaluation, fate of `new-quranku-ai` after the flip.
