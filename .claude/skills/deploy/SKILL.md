---
name: deploy
description: Ship New-Quranku to production — build for the right edition, deploy the Worker, and verify the served bytes rather than the deploy log. Use when deploying or verifying a deploy.
disable-model-invocation: true
---

# Deploy

Six steps. **Five of them have cost a session.** The ones that look skippable are the ones that bite.

The PreToolUse guard in `.claude/hooks/bash-preflight.ts` blocks the two worst mistakes automatically — wrong edition, stale generated content — but it only catches what it can see. It cannot verify what actually reached a reader.

## 1. Build for the edition you are deploying

```bash
VITE_ANSWER_MODE=synthesis bun run build
```

Prod is `EDITION=synthesis`. A plain `bun run build` writes the same `web/dist` and silently un-authors production — the app stops composing answers with no error anywhere. The guard will now stop you, but build it right rather than relying on being stopped.

**Check the exit code, not the tail.** And if the change touched CSS, grep the built stylesheet for the rule — the build exits 0 when the parser silently discards a rule it dislikes.

## 2. Deploy from `worker/`

```bash
cd worker && bunx wrangler deploy          # prod (new-quranku.axiara.ai)
```

`--env synthesis` and `--env demo` are *different apps* with their own routes and bundles. `[env]` blocks do not inherit top-level bindings — the warnings wrangler prints about that are the intended state, not a defect.

## 3. Wait. Do not judge the first request.

Edge propagation is not instant, and the first `/api/answer` after a deploy runs on a cold isolate. A measurement taken immediately will be wrong in a way that looks like a bug. Ten to thirty seconds; longer for a large asset upload.

## 4. Verify the SERVED bytes, not the deploy log

```bash
curl -s https://new-quranku.axiara.ai/ | grep -o 'assets/index-[A-Za-z0-9]*\.\(css\|js\)' | sort -u
ls -t web/dist/assets/*.css web/dist/assets/*.js | head -2 | xargs -n1 basename
```

They must match. Then grep the served asset for the specific thing you shipped — a rule, a string, a literal. "It deployed" and "it is on the page" are different claims.

**For any file under `web/public/`, check `content-type`, not status.** A missing asset returns `200 text/html` — the SPA fallback. It reads as success and is an absence. This is exactly how 29 books of finished translation looked deployed and were not:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://new-quranku.axiara.ai/hadith-id/muslim/8.json
```

## 5. Confirm in real Chrome

Use the **Interceptor** skill, not a headless browser. Clear `CacheStorage` and reload first — a stale entry serves the OLD css/js right after a deploy and you will measure the previous build with total confidence:

```
interceptor eval --main "caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>location.reload())"
```

Then confirm the loaded stylesheet hash against `ls -t web/dist/assets/*.css | head -1` **before** believing any measurement.

Two more traps: `curl` to prod `/api/answer` is classifier-blocked, so drive it through the browser. And keep exactly one tab open on the target URL — duplicates make `eval` and the driven tab diverge, and the reading looks like a regression.

## 6. Say what actually shipped

If the working tree carried commits that were not the point of this deploy, they went out too. Name them. A deploy report that lists only the intended change is how an unreviewed workstream reaches production unannounced.
