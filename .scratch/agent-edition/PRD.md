# PRD: QuranKu v2 — the Agentic Edition

Status: needs-triage
Filed: 2026-08-02
Source: `/grilling` interview with Erik (17 questions, one branch at a time), grounded in a read of
`worker/wrangler.toml`, `worker/src/index.ts`, `worker/src/providers.ts`, `web/index.html`,
`web/src/main.ts`, `web/src/crisis.ts`, `web/src/thread.ts`, `src/eval/`, and `PRODUCT.md`.
Every decision below is Erik's, taken with the trade-off stated.

## Why this exists

Erik asked for a second version of New-Quranku "powered by agentic AI — an agent that serves the
users in doing everything inside the app", with a friendlier, more approachable design that "starts
with the chat box".

The interview turned up one thing that reframed the brief: **the app is already chat-first.**
`web/index.html` makes `#/` the Tanya route, pins a persistent composer
(`<textarea id="q" placeholder="Ceritakan apa yang kamu rasakan…">`), and demotes Baca/Tema/Peta to
secondary nav. There is no homepage to get past. So the design half of the brief is not a layout
problem.

Asked what actually reads as unfriendly, Erik picked two things, and **not** the two he might have:

- **The blank page** — an empty composer with no visible examples; the user freezes.
- **The invitation** — *"Ceritakan apa yang kamu rasakan…"* asks for emotional disclosure before
  you have typed a word. That is a therapy prompt, not a friendly one.

He explicitly did **not** pick "the look is too solemn" or "the answers are too dense". That is
load-bearing: the celestial ground, the green→gold signature, and the attributed scholarly cards
**stay exactly as they are**. This is a cold-start problem, not a reskin.

The agentic half is a real build: a tool-calling agent over the engines that already exist.

## Explicitly rejected (do not build)

- **A reskin.** No new palette, no lighter register, no rounded-messaging-app restyle. Erik ruled
  the visual language is not the problem. Anyone proposing this should be closed `wontfix`.
- **Simplifying the answer cards.** The Arabic, the meaning-based rendering, the literal rendering,
  and the named tafsir all stay. Density was considered and rejected as the cause.
- **A named agent persona with an avatar.** See § Persona — this is a deliberate rejection, not an
  oversight.
- **Any relaxation of `answer-guard.ts` / `compose-guard.ts`.** The wall is unchanged.
- **Server-side user memory or accounts.** Deliberately rejected on privacy grounds; see § Memory.

## Non-goals

Does not touch the three live surfaces (`new-quranku`, `new-quranku-ai`, `demo-quranku`). Does not
re-open anything in `PRODUCT.md` § Design Principles or § Anti-references. Does not widen the corpus
— "the corpus is too narrow" was offered as an option and declined in favour of holding the wall and
redirecting warmly. Does not introduce a scheduler, reminders, or notifications.

---

## The shape

A **fourth** Cloudflare Worker surface, forked from `web/src` (the real product), built as an
isolated bundle so it cannot disturb the three live apps.

### 1. Deploy surface

New `[env.agent]` block in `worker/wrangler.toml`:

| Field | Value |
|---|---|
| `name` | `new-quranku-agent-proxy` |
| `routes` | `agent-quranku.axiara.ai/*`, zone `axiara.ai` |
| `[env.agent.assets].directory` | `../web/dist-agent` — **its own bundle** |
| `EDITION` | `agent` — gates the new `/api/agent` endpoint |
| Secret | its own `OPENROUTER_API_KEY` (set once, interactively) |

**Why its own bundle directory.** `principled` and `synthesis` both build into `../web/dist`, so a
build for one ships the other's Worker a bundle it did not expect. That hazard is live in this repo
today (the principled worker is noted as un-synced). The demo already avoids it with
`../web/dist-demo`; the agent edition follows the demo, not the synthesis precedent.

One-time setup, mirroring the other three: a proxied placeholder AAAA record `agent-quranku` → `100::`
on the `axiara.ai` zone, and `bunx wrangler secret put OPENROUTER_API_KEY --env agent`.

### 2. Where the loop runs — hybrid

The Worker reasons; the browser acts.

- **Worker** runs the whole tool loop edge-side. It can read corpus shards through its `ASSETS`
  binding at edge speed with **zero external network** — the same `web/dist-agent/surah/N.json`
  files the browser fetches.
- **Browser** performs the UI actions the Worker cannot: navigation, audio playback, geolocation for
  prayer times, local bookmarks.
- The Worker returns **one** response: grounded prose plus a list of UI actions for the browser to
  perform.

**Why.** `PRODUCT.md` makes patchy 4G on mid-range Android a hard requirement. A browser-side loop
costs one phone round-trip *per tool hop*; the hybrid costs one round-trip regardless of hop count.

This is only cheap because the engines are already clean. Verified DOM/browser reference counts:
`retrieve.ts`, `knowledge.ts`, `answer.ts`, `themes.ts`, `lucky.ts`, `crisis.ts`, `aqidah.ts`,
`prayer.ts` — **zero**. They import into a Worker as-is. Only `tafsir.ts` (5) and `verse.ts` (1) are
coupled, and both are on the browser side of the split anyway.

### 3. Model and tool protocol

**Model: `deepseek/deepseek-v4-flash` on OpenRouter stays.** Erik's decision, cost-driven, taken with
the risk stated: its tool-calling is unmeasured here, and `providers.ts:84-99` documents this exact
model silently destroying small-budget calls in production — `/api/classify` returned `{"themes":[]}`
on every call for a period, with no error.

The mitigation is not to hope. It is:

**Tools are expressed as guarded JSON, not native tool-calling.** The model returns
`{"tool": "cariAyat", "args": {...}}` as text; the Worker parses it, validates against a schema,
executes, and loops. This is exactly the pattern `/api/classify` already uses (ask for JSON, run
`guardThemes()`, fall back to the keyword lexicon on junk).

Two properties this buys:

1. **Model-agnostic.** Works on deepseek, SEA-LION, or Claude. Swapping the model later is a config
   change, not a rewrite — so the model risk above is reversible at any time.
2. **Graceful degradation is inherited**, not invented. Malformed output falls back to deterministic
   keyword retrieval, the same way every generative endpoint in this app already does.

Note `callChatModel` (`worker/src/providers.ts:63`) is single-turn — system + user, no `tools`, no
message threading, no `tool_calls` parsing. **It must be rewritten for a loop regardless of model**,
so "keep the current provider" saves less than it appears to.

### 4. Routing — deterministic first

Twelve tools ship (§ Tool catalog). On a weaker model driving a hand-rolled protocol, catalog size is
a reliability dial, so routing gets a deliberate answer:

**Before any model call**, run the matchers that already exist:

| Signal | Existing function | Routes directly to |
|---|---|---|
| `"yasin 5"`, `"2:255"` | `parseRef()` (`quran.ts:198`) | `bukaSurah` |
| Curated topic hit | `matchTopic()` / `matchPin()` (`knowledge.ts:203,325`) | `jawabPengetahuan` |
| Reviewed creed question | `matchAqidah()` (`aqidah.ts:173`) | `jawabPengetahuan` |
| Prayer-time words | `isPrayer()` (`prayer.ts:23`) | `jadwalSalat` |
| Juz reference | `juzOf()` (`juz.ts:52`) | `bacaJuz` |

Obvious questions never reach the model at all — instant, free, exactly right, and zero spend. The
model only sees genuinely ambiguous input, where twelve tools is a much smaller problem.

### 5. Perceived speed — local render first

One round-trip still contains N model hops. On patchy 4G that can be ten-plus seconds of dead air,
which is precisely the failure this redesign exists to fix.

**On submit, the browser runs keyword retrieval locally and paints real verse cards in milliseconds**,
before the Worker replies. The agent's grounded prose and any additional tool results arrive after and
slot in around them.

This yields a guarantee worth stating plainly: **v2 never feels slower than today**, even if the model
is slow, rate-limited, or down. And it produces a free total-failure fallback — if the Worker dies,
the local render *is* the answer, which is today's app. **The agent is purely additive.**

### 6. Memory — thread only, nothing leaves the phone

The browser sends the last N turns (plus the last verses shown) with each call. The Worker stays
**stateless and stores nothing**. Reuses `thread.ts` (`newquranku:thread`) as-is, so follow-ups like
*"jelaskan tafsirnya"* work.

A durable local profile was offered and declined. Server-side memory with accounts was offered and
declined. Rationale: someone asking about their marriage at 2am leaves **zero** trace on a server, and
Indonesian mid-range phones are frequently shared within a family.

Cost accepted: no cross-device continuity. Constraint: history grows the prompt, so it needs a token
cap.

---

## Guardrails

### Crisis pre-empts everything

`main.ts:407` runs `detectCrisis(q)` before anything else and short-circuits to `crisisReply()`.
`crisis.ts` is emphatic that this is deliberate: *"Crude on purpose... Cleverness here buys nothing
and risks missing someone."* It fires on `"pengen mati aja"` buried inside a sentence about debt —
a case the comment records as having already failed once.

**In v2 this is unchanged and runs first. On a hit the agent loop is never invoked at all.** The
SEJIWA helpline renders deterministically. No model call in the one path where a model failure is
unacceptable, and no added latency.

An agent-owned crisis tool was offered and rejected: "instructed to call it first" is not
"guaranteed to", and the failure mode is someone in danger receiving a verse about patience instead
of a phone number.

### The wall holds, but redirects warmly

`guardAnswerProse` / `guardComposeProse` unchanged — zero ungrounded claims survive. What changes is
the *dead end*. Instead of a bare "I don't know", the agent uses its tools to offer the nearest true
thing:

> *"Aku belum punya sumber soal itu. Tapi soal rezeki dan keraguan, ini yang Al-Qur'an bilang —"*
> \+ real verse cards.

Honesty becomes a feature rather than a failure. This requires a good near-miss retrieval path and
refusal copy that does not read as a brush-off.

### Action honesty — a new failure class

`PRODUCT.md` #5 bans fabricating **scripture**. An agent introduces the ability to fabricate
**actions**: *"aku sudah simpan penandamu"* when `saveBookmark()` never ran. `guardAnswerProse` knows
nothing about whether a tool executed.

**The "here's what I did" line is generated by the Worker from the executed-tool log** — template
strings keyed to results that actually ran. The model writes only the one interpretive sentence about
the verse, which the existing guard polices unchanged.

A fabricated action claim becomes **structurally impossible**, rather than something a second guard
has to catch after the fact.

### Persona — first person, unnamed, never interprets

`PRODUCT.md` bans *"the AI answering in its own voice as if it were a scholar."* An agent that says
*"aku sudah buka Surah Yasin untukmu"* is unavoidably speaking in its own voice, so the line is drawn
precisely:

- **Yes:** `aku`, `untukmu`, warm and present. Narrates what it did. Points at who said what —
  *"Ini yang Ibnu Katsir lihat di ayat ini."*
- **No:** a name. An avatar. A character. `menurutku`. `aku rasa`. Any first-person interpretation of
  scripture.

The friendliness lives in the doing and the tone, not in a personality.

### Cost and abuse

`/api/*` is public and unauthenticated (`ALLOWED_ORIGINS` at `index.ts:59` is CORS, which `curl`
ignores). Today one POST is one model call; an agent loop makes one POST **N** model calls. Three
layers:

1. **Hard cap of 3 tool hops per turn** — bounds a single request.
2. **Cloudflare rate-limiting rule on `/api/*` per IP** — bounds a single abuser.
3. **Daily spend ceiling** — once hit, the agent switches off and the app falls back to local
   deterministic retrieval. It keeps working; it just stops being agentic.

Layer 3 is nearly free because the local-render fallback already exists (§ 5).

`MAX_QUESTION_LEN` (600) stays.

---

## The first screen

The cold-start problem Erik actually named. Composed **locally, with no model call**, from what the
app already knows:

| Element | Source |
|---|---|
| Greeting | `greet.ts` (name-aware) |
| Time-of-day framing | 2am reads differently from the commute; both are first-class per `PRODUCT.md` |
| *"Maghrib in 40 minutes"* | `nextPrayer()` (`prayer.ts:316`) |
| *"Continue Al-Kahfi"* | `loadBookmark()` (`bookmark.ts:105`) |
| Three tappable starter chips | curated list; `LUCKY_PROMPTS` is the existing precedent |
| Composer | cursor autofocused on load; **placeholder replaced** — neutral and low-stakes, not *"Ceritakan apa yang kamu rasakan…"* |

Renders instantly, costs nothing, works with no network, and **no ungrounded prose can reach the
first impression**. A model-generated greeting was offered and declined for exactly that reason,
plus first-paint latency on 4G.

---

## Tool catalog

Twelve tools — the full read surface. Erik chose breadth over the safer five, consistent with "the
agent does everything"; § 4 is the mitigation.

| # | Tool | Runs | Backed by |
|---|---|---|---|
| 01 | `cariAyat(query)` | Worker | `gatherGrounding()` / `retrieve.ts` |
| 02 | `jawabPengetahuan(question)` | Worker | `retrieveKnowledge()` + `matchAqidah()` |
| 03 | `bukaSurah(surah, ayah?)` | Both | `parseRef()` / `loadSurah()` + navigate |
| 04 | `jadwalSalat()` | Both | `prayerTimes()` + browser geolocation |
| 05 | `ayatAcak()` | Worker | `pickLucky()` |
| 06 | `tafsir(ref)` | Browser | `tafsir.ts` (DOM-coupled) |
| 07 | `tema(slug)` | Worker | `theme-index.ts` / `topic-subjects.ts` |
| 08 | `bacaJuz(n)` | Worker | `juzOf()` / `surahsInJuz()` |
| 09 | `putarAudio(ref)` | Browser | `toggleAudio()` |
| 10 | `simpanPenanda(ref)` | Browser | `saveBookmark()` |
| 11 | `bagikan(ref)` | Browser | `renderVerseCardImage()` |
| 12 | `peta(slug)` | Worker | `peta-data.ts` |

If the catalog later needs to grow past ~12, add a tool-retrieval step that shows the model only the
3–4 tools relevant to the question. Not in scope for v1.

---

## Definition of done

| Gate | Bar |
|---|---|
| `src/eval/agent-cases.ts` | ~40 real questions, each with the tool sequence it should produce. **Routing scores deterministically** — expected tool vs. actual, no judge needed. Initial bar **≥85% top-tool match** (Erik to confirm). |
| `bun test` | Green (45 test files today) |
| `bun run typecheck` | Green across root, `web/`, `src/eval/` |
| Interceptor | `interceptor open https://agent-quranku.axiara.ai` — mandatory per `CLAUDE.md`; never agent-browser |
| Scholar review | See below |

The routing eval is the point. It converts the accepted deepseek risk into **a number** — and gives a
baseline to compare against if the model is ever swapped. Below the bar, the fix is either to push
more cases into the deterministic pre-router or to swap the model, which the JSON protocol makes
cheap by construction.

Mirrors the existing harness: `ANSWER_CASES` + typed `ExpectedBehaviour` (`src/eval/answer-cases.ts`),
`judgeAnswer()` (`answer-judge.ts`), reports to `src/eval/reports/`.

### Scholar review gate

Ustadz Ahmad Isrofiel Mardlatillah reviews the **behaviour, not every output**:

1. The agent's system prompt — its persona, what it may and may not say
2. The fixed narration templates
3. The warm-redirect copy for ungrounded questions
4. ~30 real transcripts across the question types people actually ask

Bounded, reviewable in one sitting, and it reviews the system — the only unit that generalises to
outputs nobody has seen yet. Records go in `docs/review/` (`data/` is gitignored).

---

## Assumptions carried

Flagged during the interview, not separately confirmed. Correct any and the PRD changes:

- **"genetic AI" = agentic AI.** Voice-input artefact; read as agentic throughout.
- Replies in **Bahasa Indonesia**, mirroring the user's register (code-switching as the app does today).
- Routing bar **≥85%** top-tool match is a proposed starting number, not a measured one.
- Celestial ground, green→gold signature, and attributed cards all stay unchanged.
- The three existing surfaces are not touched by any part of this work.

## Work breakdown

To be split into `.scratch/agent-edition/issues/NN-<slug>.md` per `docs/agents/issue-tracker.md`.

| # | Item | Type | Blocked on |
|---|------|------|------------|
| 01 | `[env.agent]` + `web/dist-agent` build + DNS + secret | infra | Erik runs deploy + secret |
| 02 | Multi-turn `callChatModel` with message threading | fix | — |
| 03 | Guarded JSON tool protocol + schema validation | new capability | 02 |
| 04 | Deterministic pre-router | new capability | — |
| 05 | Worker-side agent loop, 3-hop cap | new capability | 03, 04 |
| 06 | Twelve tool implementations (Worker + browser split) | new capability | 05 |
| 07 | Templated action narration from the tool log | new capability, safety | 05 |
| 08 | Local-render-first submit path | new capability | — |
| 09 | Crisis pre-empt preserved + regression test | fix, P0 safety | — |
| 10 | Warm-redirect copy + near-miss retrieval | new capability | 01 |
| 11 | First screen: greeting, context, chips, autofocus, placeholder | new capability | — |
| 12 | Rate limit + daily spend ceiling + degrade path | infra, safety | 01, 08 |
| 13 | `src/eval/agent-cases.ts` routing eval | eval | 05 |
| 14 | Scholar review package | review | 07, 10, 13 |
