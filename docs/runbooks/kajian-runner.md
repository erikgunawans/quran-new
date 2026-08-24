# Bringing the kajian runner up

One sequence, in order. Every step says what it costs and what it makes reachable. Nothing here has
been run — the resources do not exist in the account yet, and prod runs Worker `641f8ae2` from
`44ed447` with `DB`, `KAJIAN` and `RUNNER_SECRET` all absent.

## Before you start: two decisions that are not the DA's

1. **ISC-630 — may a summary derived from Darussalam's material publish?** This gates what the
   runner is pointed *at*, not whether it may be built or deployed. The rights position is
   unchanged: ~12.7 MB of their material in two `.scratch/` directories, no permission, and that
   never depended on the letter that was cancelled. Deploying the steps below publishes nothing by
   itself — the queue is empty and no runner is running.
2. **A per-day cost ceiling.** Each Summarize click spends model tokens on roughly 80,000
   characters of transcript. Admin-only is a bound on *who*, not on *how much*. There is no cap in
   the code today; that is recorded here rather than assumed away.

## The sequence

### 1. Create the two resources

```
cd worker
bunx wrangler d1 create new-quranku-memory     # prints a database_id
bunx wrangler r2 bucket create new-quranku-kajian
```

Both are new. The demo D1 (`new-quranku-demo-memory`) is **not** reused: it holds demo readers'
memory rows, and prod's queue does not belong in it.

### 2. Uncomment the bindings

In `worker/wrangler.toml`, uncomment the `[[d1_databases]]` and `[[r2_buckets]]` blocks under
"THE KAJIAN RUNNER SURFACE" and paste the `database_id` from step 1. They go at the **top level**,
not in an `[env]` block — env blocks do not inherit top-level bindings, and `--env demo` must keep
behaving exactly as it does today.

### 3. Apply the schema

```
cd worker
bunx wrangler d1 execute new-quranku-memory --remote --file migrations/0001_init.sql
bunx wrangler d1 execute new-quranku-memory --remote --file migrations/0002_accounts.sql
bunx wrangler d1 execute new-quranku-memory --remote --file migrations/0003_kajian_jobs.sql
bunx wrangler d1 execute new-quranku-memory --remote --file migrations/0004_kajian_results.sql
```

**In that order, and 0004 after 0003.** 0003 is `CREATE TABLE IF NOT EXISTS`; 0004 is `ALTER TABLE`
and will fail loudly if 0003 has not run. That failure is correct — it means the table is missing,
not that the file is broken. Re-running 0004 also fails ("duplicate column name"); these are applied
once, by hand, the way 0001 and 0002 were.

`--remote` needs a repo-root wrangler 4.x — see the `okf-shard-and-wrangler-gotchas` note.

### 4. Set the secrets

```
cd worker
bunx wrangler secret put RUNNER_SECRET      # 32+ chars. Under that length it admits NOBODY.
bunx wrangler secret put ADMIN_EMAILS       # comma-separated. Unset means nobody — it fails closed.
bunx wrangler secret put RESEND_API_KEY     # magic-link delivery
```

Generate the runner secret with `openssl rand -base64 48`. **Paste it into the hidden prompt only** —
never onto a command line, never into a file, never into a chat message.

For Resend, verify a domain on `axiara.ai` first, then set `RESEND_FROM` in `[vars]`. Until then
`/api/auth/request` answers `{sent:false}` and nobody can log in, so nobody can be an admin, so the
Summarize form stays behind its 403.

### 5. Deploy

```
bun run build && cd worker && bunx wrangler deploy
```

`wrangler deploy` uploads the **directory** and has never read `.gitignore` — `sweepPublishable` in
`src/app/build-meta.ts` is what removes `.DS_Store`. Do not skip the build.

### 6. Verify before pointing a runner at it

Curl, cold, from outside:

```
curl -si https://new-quranku.axiara.ai/api/runner/kajian/claim -X POST                 # expect 403
curl -si https://new-quranku.axiara.ai/api/runner/kajian/claim -X POST \
     -H "Authorization: Bearer $RUNNER_SECRET"                                          # expect 200 {"job":null}
curl -si https://new-quranku.axiara.ai/kajian/index.json                                # expect 200 {"items":[]}
```

⚠️ **A 200 proves nothing on this origin by itself.** A missing asset returns `index.html` at 200
(the SPA fallback), so check the `content-type` and the body, not the status. And never judge the
first request after a deploy — propagation.

### 7. Run the runner

On the VPS:

```
export QK_BASE_URL=https://new-quranku.axiara.ai
export QK_RUNNER_SECRET=<the same secret>
bun run src/app/kajian-runner.ts
```

It refuses to start on a missing secret, a missing base URL, or a plain-`http` one — a runner that
polls forever against a 403 looks exactly like a queue that is always empty, which is the worst
failure available because it is silent.

**`yt-dlp` on a datacentre IP will be refused a transcript.** Erik chose the VPS knowing this. Fix it
with exported cookies (`--cookies-from-browser`) or a residential proxy. Until then, every job fails
with a reason that names both options — which is the designed behaviour, not a bug: a fetch that
fails must surface as a job state and never as a silent empty summary.

## What is still not built

- **The play button itself** (ISC-624.8, partly closed). The FILE is now produced: the short
  narration has its own flag, is ON by default, and is encoded to `short*.m4a` independently of the
  mp4 — verified by running the pipeline at `HEAD` and on the fix with identical flags, where `HEAD`
  never attempts narration and the fix reaches the TTS call. The runner uploads `short.m4a` or
  `short-DRAFT.m4a` when one exists and the card ships without audio when neither does.
  **VERIFIED END TO END 2026-08-24 — the first real `short.m4a` exists.** 646,080 bytes, 46.24 s,
  AAC 24 kHz mono, `mean_volume -18.3 dB` / `max -0.3 dB` — measured with `volumedetect`, because a
  file of that size is equally consistent with 46 seconds of silence and the size alone would not
  have told them apart. The three denials and the source URL ride INSIDE the container as designed:
  `description=Ringkasan otomatis. Tidak dimaksudkan sebagai kutipan, bukan fatwa, dan belum
  diperiksa ulama.`
  ⚠️ **The reason this line used to give was WRONG, and it is corrected rather than deleted.** It
  said the machine had no Google TTS credentials. ADC was in fact live, and the 2026-08-24 01:42 run
  in `.scratch/kajian/jNQXAC9IVRw/` had already written a `narasi.m4a` that measures as real speech
  (126.92 s, `mean_volume -19.9 dB`) — so credentials were never the blocker and a reader of this
  file would have gone looking for the wrong thing. What was actually missing was Erik's decision on
  **which project to bill**, settled 2026-08-24: `story-maker-demo`, **temporarily**.
  **How the billing is pointed, and how to unpoint it:** `quotaProject()` prefers the
  `GOOGLE_CLOUD_PROJECT` environment variable over gcloud's configured project, so a run is billed
  elsewhere with `export GOOGLE_CLOUD_PROJECT=story-maker-demo` and nothing in Erik's gcloud config
  is touched. Unsetting the variable is the whole of the revert.
  ⚠️ **There is still NO per-day or per-run cost ceiling in the code** (see the decisions at the
  top). That was tolerable while nothing could reach the API. It is a live spend now.
  **The CONTROL is built and lives on the CARD** (Erik, 2026-08-24), so `slide.html`'s CSP is
  untouched — it denies `media-src` and `script-src` both, and a player there would have needed it
  relaxed. **No `speechSynthesis` fallback:** a feed record carries no summary text, so a browser
  voice could only read the TITLE, which is not the summary. Shipping `speechSynthesis` alone was
  never an option anyway — ADR 6 refused it because the voice would vary per device.
- **A cost ceiling.** See the decisions at the top.
- **Kajian step 7.** Still undefined anywhere in the repo, and unanswered across prior sessions. Asked again this session.
