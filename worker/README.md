# New-Quranku edge Worker

Two jobs: **(1)** proxy `new-quranku.axiara.ai/*` to the Cloud Run origin (rewriting Host), and
**(2)** serve the generative endpoints that hold the model keys server-side.

```
Browser ──POST /api/compose──►  Worker  ──►  OpenRouter (DeepSeek V4 Flash) / SEA-LION
   no key ever                  keys here
```

## Endpoints

| Route | In | Out | On failure |
|-------|----|----|-----------|
| `POST /api/compose` | `{ question, theme, themeCount, provider? }` | `{ prose: string \| null }` | `prose: null` → browser uses the canned opener |
| `POST /api/classify` | `{ question, themes[], provider? }` | `{ themes: string[] }` | `themes: []` → browser keeps the keyword lexicon |

`provider` is `"openrouter"` (default) or `"sealion"` — flip it to A/B without redeploying.
The **same egress wall** the browser runs also runs here on the model's output, so prompt-injection
is stripped on egress regardless of what the user talked the model into.

## Where the keys live

- **Runtime keys go ONLY here (Worker) — never in `web/src`, never in the app's `.env`.**
- **Production:** Cloudflare secrets, encrypted at rest. Set once (you run these — your Cloudflare auth):
  ```
  cd worker
  wrangler secret put OPENROUTER_API_KEY     # paste the key when prompted
  wrangler secret put SEALION_API_KEY        # optional, only for the SEA-LION path
  ```
- **Local dev:** copy `.dev.vars.example` → `.dev.vars` (gitignored) and fill in. `wrangler dev` loads it.

> The build-time `OPENROUTER_API_KEY` in the repo's `.env` is a **separate** thing (used offline by
> `src/ingest/openrouter.ts`). You may reuse the same key value, but the runtime copy must live here.

## Deploy

```
cd worker
bun install          # gets wrangler locally (or use a global wrangler)
bun run typecheck    # optional sanity check
wrangler deploy
```

### ⚠️ Verify before you deploy

`wrangler.toml`'s `name` + `routes` must match the Worker already serving `new-quranku.axiara.ai`.
A matching deploy **updates that live Worker**. Two options:

- **Full replace** — confirm the proxy logic here matches your current Worker (Host rewrite to
  `ORIGIN_HOST`), then `wrangler deploy`. Also confirm `ORIGIN_HOST` in `wrangler.toml` is the
  current Cloud Run host.
- **Safe path (recommended if unsure)** — leave your working proxy alone and copy just the
  `/api/compose` + `/api/classify` block (and the helpers) from `src/index.ts` into your existing
  Worker. Lower risk: it never touches the proxy that's already serving traffic.

## Model choice

Default is **DeepSeek V4 Flash** (`deepseek/deepseek-v4-flash`, ~$0.09/$0.18 per M tokens — pennies
at this scale). Change via the `OPENROUTER_MODEL` var in `wrangler.toml`, or pass `provider:"sealion"`
from the client to try the Indonesian specialist. Judge the two by **reading the Indonesian**, not by
benchmark — see ISA F-MODEL-WIRING.

## Not yet wired

The browser still calls the deterministic `compose()`. Pointing it at `/api/compose` (and the
classifier at `/api/classify`, unioned into `retrieve()`) is the remaining client step — ISA
ISC-201 / ISC-202.2 / ISC-204.
