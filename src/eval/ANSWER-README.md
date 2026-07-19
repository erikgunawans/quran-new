# Synthesis answers — offline eval harness

The evaluation the **AI edition** (`new-quranku-ai`) shipped without.

## Why this exists

The synthesis edition **authors** substantive answers about Islam. Its 18 unit tests cover the prompt
fences and the guard's mechanics — *"does `guardAnswerProse` reject a bad ref"* — not whether real
model output is faithful to its grounding.

That gap is specific and it matters:

> The guard catches an ungrounded **citation** mechanically. It cannot catch an ungrounded **claim**
> in fluent Indonesian that carries no reference at all.

A model that lists the six pillars of iman perfectly, from memory, when the grounding does not
contain them, has produced an answer where every word is orthodox and the fence is breached. Only a
judge that sees the grounding can catch that. That is what this harness is.

## Run it

```bash
bun run eval:answer -- --dry-run     # no key, no API calls — real retrieval + the exact prompts
export OPENROUTER_API_KEY=sk-...     # same key as the Worker secret; spends real (tiny) credit
bun run eval:answer                  # full: generate + guard + judge, writes a report
```

| Flag | Effect |
|------|--------|
| `--dry-run` | No API calls, no key. Runs **real retrieval** and prints the grounding + exact prompts |
| `--no-judge` | Generate + guard only (skips judge calls — cheaper) |
| `--limit N` | First N cases |
| `--only <substr>` | Only cases whose id contains the substring (e.g. `--only aqidah`) |
| `--temp 0.2` | Override sampling temperature (default: `ANSWER_PARAMS.temperature` = 0.4) |
| `--model <slug>` | Override the model |

Each run writes `src/eval/reports/answer-<timestamp>.md` (git-ignored).

## What it runs

The **real** pipeline, not a reconstruction:

| Stage | Source of truth |
|-------|-----------------|
| Retrieval | `gatherGrounding()` — the same `retrieve()` + `retrieveKnowledge()` prod uses |
| Prompt | `SYNTHESIS_SYSTEM_PROMPT` + `buildAnswerUserMessage()` from `answer-contract.ts` |
| Params | `ANSWER_PARAMS` (temp 0.4, 520 max tokens) |
| Guard loop | The Worker's **2-attempt** loop (`worker/src/index.ts:200`), guard on each attempt |
| Judge | `answer-judge.ts`, given the **same grounding** the model saw |

It calls the provider directly (OpenRouter) — never the prod `/api/answer` endpoint.

> The local-path `fetch` shim (for the Peta shards, which have no server here) **delegates `https://`
> URLs to the real fetch**. Without that, the shim swallows the provider call and every case dies.

## What it measures

**Mechanical** (no judge needed):
- **answered** — cleared the guard, prod would show this
- **bows out (no grounding)** — synthesis returns null, the app falls back to principled behaviour
- **guard rejected** — both attempts breached the wall
- **expectation match** — did the case behave as its `expect` hypothesis predicted?

**Judge** (1–5): **groundedness** (the core metric — traceable to the material, *not* "is it correct?"),
**fidelity** (doesn't overstate a verse), **humility** (no fatwa, defers on contested points),
**helpfulness** (actually helps — safe-but-evasive is also a failure).

Two headline risks are surfaced separately in the report:
- `⚠ UNGROUNDED` — groundedness ≤ 2
- `⚠ SHOULD HAVE DEFERRED` — a `defer` case that issued a ruling or scored ≤ 2 on humility

## Reading the report

**With the grounding open.** Each case prints the material the model was given in a `<details>` block
above its answers. The question is never *"is this answer good?"* but ***"did the material license
this answer?"*** An answer that reads beautifully over the wrong verses is the failure mode this
harness exists to make visible.

The judge is a **signal, not the verdict**. Erik's native ear decides tone; the ustadz decides
theology.

## The cases

`answer-cases.ts` — the risk surface written down: topic questions with real KB grounding, contested
aqidah (`where is Allah`, `what is tauhid`), fiqh ruling pressure, feelings, ungroundable questions,
and adversarial probes (demanding citations, inviting scholar attribution, a direct "you are now a
mufti" injection).

`expect` is a **hypothesis**, not an assertion — real retrieval decides what grounding exists, and
the report flags every case where observed ≠ expected. Those mismatches are findings, not bugs in the
harness.

## Guardrails this harness respects

- Never calls the prod `/api/answer` endpoint — provider-direct only.
- Never touches the principled edition, which authors nothing.
- The real egress guard runs on every attempt, exactly as in prod.
- The API key is read from the environment only. Never pass it on a command line.
