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

**BOTH DONE.** `new-quranku-memory` (D1) was created and all four migrations applied on 2026-08-23;
`new-quranku-kajian` (R2) was created 2026-08-24 and appears in `wrangler r2 bucket list`.

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
bunx wrangler d1 execute new-quranku-memory --remote --file migrations/0005_tts_runs.sql
```

✅ **0005 APPLIED TO REMOTE 2026-08-25.** `tts_runs` exists on `new-quranku-memory` with the compound
key in the right order (`day` pk 1, `run_id` pk 2, `charged_at` NOT NULL), verified by `PRAGMA
table_info` and by running the Worker's own conditional INSERT against the live database and deleting
the probe row (`remaining: 0`).

⚠️ **`d1_migrations` DOES NOT LIST 0005 — and it never listed a hand-applied file.** All five were
applied with `--file`, not `wrangler d1 migrations apply`, so that table records only 0001-0004. It
under-reports, and it has already been observed printing what it does hold OUT OF ORDER
(`0001, 0003, 0004, 0002`). **Read the schema, never that table**, when you need to know what is
applied:

```
bunx wrangler d1 execute new-quranku-memory --remote --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Re-running 0005 is safe (`CREATE TABLE IF NOT EXISTS`).

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

**DONE 2026-08-24 — `RUNNER_SECRET` is set (64 characters, twice the 32-character floor).** It was
generated and piped straight into `wrangler secret put` in one shell pipeline, so the value was never
rendered to a terminal, a log, or this repo. The runner's copy lives in `.env.runner` — mode `0600`,
gitignored — because the runner needs the SAME string and a value nobody holds cannot be given to it.
That file is the one place it exists outside Cloudflare; treat it as a credential.

Proved live with THREE arms against prod, and with **no deploy in between** — secrets take effect on
the next request:

| Arm | `POST /api/runner/kajian/claim` |
|---|---|
| no `Authorization` header | **403** `{"ok":false,"error":"forbidden"}` |
| correct bearer | **200**, returned the real queued job |
| wrong bearer, same 64-character length | **403** |

The third arm is the one that matters: without it, a 200 on the correct bearer is equally consistent
with a route that checks nothing but length.

**DONE 2026-08-24 — `axiara.ai` is verified in Resend and `RESEND_FROM` is set to
`QuranKu <no-reply@axiara.ai>`.** ⚠ It is a **SECRET** (`wrangler secret put RESEND_FROM`), NOT a
`[vars]` entry — this line used to say `[vars]`, and that is worse than merely wrong: a var of the
same name is rewritten on every `wrangler deploy`, so following it would have reverted the verified
sender to test mode with no error and no symptom until a real user failed to get a link.

Proved with a paired arm on the live surface rather than assumed: the same
`POST /api/auth/request` for a NON-owner address returned `{"sent":false}` before the change and
`{"sent":true}` after. Before that, `/api/auth/request` answered `{sent:false}` and nobody could log in, so nobody could be an admin, so the
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

#### MEASURED 2026-08-24, and it is worse than "yt-dlp will be refused"

The warning above was written about `yt-dlp`. The transcript skill's PRIMARY path is not `yt-dlp` at
all — it is a pure-HTTP InnerTube call, with `yt-dlp` only as a fallback — so it was worth asking
whether the primary path survives a datacentre IP. **It does not, and it fails earlier and harder.**

A paired probe, same video (`J5x-9tHxeJA`), same two requests, minutes apart:

| Arm | `GET /watch` | Body | Bot wall | InnerTube |
|---|---|---|---|---|
| **Cloudflare edge** (`wrangler dev --remote`) | **429** | 1,947 bytes | **yes** | never reached — no API key to extract |
| **Erik's residential IP** (control) | 200 | 1,259,600 bytes | no | 200, title returned |

The datacentre arm never gets far enough to read `INNERTUBE_API_KEY` out of the watch page, so the
whole skill — primary path AND fallback — is dead there. **This rules out running the fetch inside
the Worker**, which would otherwise have been the simplest possible host: no VPS, no container, no
proxy. It was tested rather than assumed, and the control arm is what makes the 429 mean "YouTube
refuses this IP" rather than "the request was malformed".

#### Google Cloud Run, measured separately — because the sentence that stood here was an overclaim

The line above originally read *"Cloudflare, Cloud Run and a datacentre VPS are all the same arm of
that table."* **That was a universal asserted from ONE arm** — only Cloudflare had been measured — and
it is the shape this repo files under `impossibility-is-a-quantifier`. Cloud Run was then measured,
and the conclusion survives while the reasoning behind it does not: **the two clouds fail at
DIFFERENT gates, and Cloud Run gets materially further.**

| Host | `GET /watch` | InnerTube key extractable | `yt-dlp --list-subs` |
|---|---|---|---|
| Cloudflare edge | **429**, 1,947 bytes | no — never reachable | n/a, blocked before |
| **Cloud Run** (asia-southeast2) | **200**, ~1.2 MB | **yes** | **`Sign in to confirm you're not a bot`** |
| Erik's residential IP | 200, ~1.26 MB | yes | full auto-caption list |

⚠️ **The first probe of this was a BLIND INSTRUMENT and its result must not be cited.** It was a
hand-rolled InnerTube call rather than the skill itself, and it reported `caption_tracks: 0` and
`playability: UNPLAYABLE` for **every** video from **every** host — including "Me at the zoo" from
Erik's own machine, which certainly has captions. A field that reads the same on the working arm and
the broken one measures nothing. The table above uses **real `yt-dlp`** (with a `deno` runtime in the
image, which current yt-dlp requires and whose absence is a container bug, not an IP symptom), and it
is controlled: the SAME command from the residential IP returns the caption list.

So the conclusion stands and is now earned: **a hosted runner needs residential egress — exported
cookies (`--cookies`) or a residential proxy — and that is true on Cloud Run too.** What changes is
the diagnosis you will see: Cloudflare dies with a 429 at the first request, Cloud Run gets a normal
page and dies inside `yt-dlp` with the bot wall.

#### If the runner is to live on Cloud Run

Shape it as a **Cloud Run Job** driven by **Cloud Scheduler**, not a Service: the runner is a polling
loop, and a Service that scales to zero has nothing to poll with, while a Service pinned at
`min-instances=1` pays for idle. A Job that wakes, claims one item, processes it and exits matches
both the queue's lease model (`CLAIM_LEASE_MS`, 2 h) and the billing model.

Three things that are NOT obvious and each of which will bite:

1. **The transcript skill is not in this repo.** `src/app/kajian.ts:205` spawns
   `~/.claude/skills/baoyu-youtube-transcript/scripts/main.ts`, which lives in Erik's PAI directory.
   A container has no such path. It has to be vendored into the image (or into this repo) before the
   pipeline can run anywhere but his machine.
2. **THE TTS DAILY CEILING — BUILT 2026-08-25, NOT YET APPLIED.** This item used to read *"silently
   becomes unlimited"*, and it was true: `chargeTtsRun` kept its ledger in a local file
   (`.kajian-tts-ledger.json`), and a fresh writable layer per execution means every run reads an
   empty ledger, charges slot 1 of 30, and passes **for ever**. The ledger now lives in D1
   (`worker/migrations/0005_tts_runs.sql`, `worker/src/tts-ledger.ts`,
   `POST /api/runner/kajian/tts-charge`), keyed by the ASIA/JAKARTA day the WORKER computes — never a
   day the runner supplies, or a runner could reset its own allowance.

   **The switch is `QK_BASE_URL` + `QK_RUNNER_SECRET`, not a flag.** With both set, `chargeTtsRunFor`
   charges the Worker; with neither, the local file. Those are the same two variables `runnerConfig`
   refuses to start without, so a hosted runner CANNOT be configured to work and miss the ledger — a
   dedicated `QK_TTS_LEDGER` flag could be forgotten, and forgetting it would restore this exact hole.

   **It fails closed.** An unreachable ledger throws *"refusing to spend without a ledger"* and no
   audio is generated. That message is deliberately different from the ceiling message: one sends you
   to wait for midnight, the other sends you to look at the Worker.

   ⚠️ **Two things are still owed before a hosted runner is safe:** migration 0005 applied to REMOTE
   (see §3), and a deploy carrying the `/api/runner/kajian/tts-charge` route.
3. **Cookies are a credential with an expiry.** `--cookies` means Erik's YouTube session in a secret,
   rotated by hand when it lapses, and a bot-wall failure is what a lapse looks like. A residential
   proxy costs money instead and does not expire. Neither is free; the choice is his.

Also observed while testing: **`--allow-unauthenticated` is refused by the org policy on
`axiara.ai`** — `gcloud run deploy` completes and then warns that setting the IAM policy failed, so
the service exists but answers nobody. A Job invoked by Scheduler with a service account sidesteps
that entirely, which is a second reason to prefer the Job shape here.

#### The consequence: the recommended first host is Erik's own machine

`src/app/kajian-runner.ts` polls a HOSTED queue. Running it locally still makes the pipeline work
"over the internet" in every way that matters: any admin queues a video from any device, and the
results publish to the public site. Only the transcript fetch stays on an IP YouTube will talk to.
The cost is that the machine has to be awake. A cloud host plus a residential proxy buys unattended
operation and is the upgrade, not the starting point.

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
