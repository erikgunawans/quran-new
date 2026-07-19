# Framing voice — offline eval harness

The tuning loop for **Phase 2**: making the *live* bridge sentence (the model-written line above the
verses) more human — **without ever poking prod**.

## Why this exists

The bridge is written by a model (`/api/compose`, OpenRouter/DeepSeek) shaped by
`web/src/compose-contract.ts` → `FRAMING_SYSTEM_PROMPT`, then filtered by the egress wall
(`compose-guard.ts`). You cannot tune a system prompt by editing prod and watching real users. This
harness runs the **exact same prompt + params + guard** prod runs, against a fixed set of real-shaped
phrases, and scores the output — so you tune locally, compare, and deploy once.

It calls the model **provider directly** (OpenRouter), never the prod endpoint. That is what "offline"
means here.

## Run it

```bash
export OPENROUTER_API_KEY=sk-...     # the SAME key as the Worker secret; spends real (tiny) credit
bun run eval:framing                 # full: generate (prod's 2-attempt guard loop) + LLM judge + report
```

Flags:

| Flag | Effect |
|------|--------|
| `--dry-run` | No API calls, no key needed — prints the exact system + user prompts that would be sent |
| `--no-judge` | Generate + guard only (skips the judge calls — cheaper, faster) |
| `--limit N` | First N cases only (quick smoke test) |
| `--temp 0.6` | Override sampling temperature |
| `--model <slug>` | Override the model (e.g. `deepseek/deepseek-chat`) |

Example: `bun run eval:framing -- --limit 5 --no-judge`

## What it measures

- **Guard pass rate** — first attempt, and within 2 attempts (prod behaviour). "Falls back" = neither
  attempt cleared the wall, so prod would show the deterministic canned opener instead. This is the
  reliability signal (the false-silence problem).
- **Judge scores** (1–5) — warmth, presence (sits with, doesn't fix), humanness (not a bot), fit
  (meets *this* person's words). A signal, **not** the verdict — your native ear decides the tone.

Each run writes `src/eval/reports/framing-<timestamp>.md` (git-ignored) with every case: the phrase,
each attempt, guard result, and the judge's scores + rationale.

## The tuning loop

1. `bun run eval:framing` → baseline report. Read it (native eye first, scores second).
2. Edit `web/src/compose-contract.ts` → `FRAMING_SYSTEM_PROMPT` (warmth, specificity, "meet their exact
   words"). The guard and the deterministic fallback keep it safe no matter what.
3. Re-run → compare scores + read the new lines.
4. When it's clearly better **and** guard pass rate holds, deploy once
   (`bun run build && cd worker && bunx wrangler deploy`).

## Editing the cases

`cases.ts` — labelled real-shaped phrases (all 12 feelings + edge cases). Add real phrases people
actually type; keep the `theme` string EXACTLY as it appears in `retrieve.ts` `OPENERS`. Labelled
themes isolate *bridge quality* from *retrieval accuracy* (a separate concern).

## Guardrails this harness respects

- Never calls the prod `/api/compose` endpoint — provider-direct only.
- The egress wall (`guardComposeProse`) runs on every output here, exactly as in prod.
- It never changes the deterministic openers or the honesty note — those are Phase 1, already shipped.
