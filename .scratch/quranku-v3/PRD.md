# PRD: QuranKu v3 — Agentic Edition × UAT Feedback (combined)

**Status:** Draft for product triage — combines two source PRDs. Not an approval, not a release decision.
**Filed:** 2026-08-04 · **Owner:** Erik · **Domain reviewer:** Ustadz Ahmad Isrofiel Mardlatillah (reviewer of record — `U`'s "Pak Darus" is the same person, confirmed 2026-08-04)

**Sources combined:**
- `A` — *QuranKu v2, the Agentic Edition* (`.scratch/agent-edition/PRD.md`) — decided, from a `/grilling` interview (2026-08-02). The **architecture**.
- `U` — *QuranKu based on UAT Feedback* (`2026-08-04_…-uat-feedback-prd-en.md`) — triage-stage, from cycle `UAT-2026-01` (15 records, 5 contributors). The **demand**.

> **Framing — ✅ DECIDED 2026-08-04:** v3 = **the Agentic Edition is the delivery vehicle**, and the UAT feedback is the **user-validated requirement set** that vehicle should serve. The agent is *how*; the UAT needs are *what*, prioritised by real users. Everything below flows from that. First release = **agent spine + defect fixes together** (the spine *is* the search/output vehicle). (Naming: `A` said "v2"; you've been saying v3 — same edition, renamed here to v3.)

---

## 1. The thesis in one line

`A` answered **how to build the next edition** without deciding **what it should do first**; `U` answered **what users want** without a **delivery architecture**. Combined: the agent's tool loop is the spine, and the UAT feedback fills in and prioritises the read surface — **with three genuine conflicts that only Erik can settle** (§ 4).

## 2. Reconciliation map — every UAT need against the agent

Legend: **✅ served** (an agent tool / the architecture already delivers it) · **🔧 defect/independent** (a fix that stands alone, and also feeds the agent's pre-router) · **📚 needs sources+review** (content expansion — tension with `A`'s corpus wall) · **⚠️ conflict** (`A` explicitly rejects it — decision required).

| UAT need (feedback IDs) | v3 disposition | Maps to |
|---|---|---|
| **P1/Epic A — Search** | | |
| FR-A1/A2 surah-name normalization + aliases (F003) | 🔧 defect/independent — deterministic layer; also feeds `A`'s pre-router (`parseRef`/`matchTopic`) | search engine |
| FR-A3 quick-access is inactive (F011) | 🔧 defect — reproduce & fix; independent of the agent | bug |
| FR-A4 verse search (F005) | ✅ served — local keyword retrieval + `cariAyat` | tool 01 |
| FR-A5 semantic search, grounded + fallback (F002) | ✅ **largely delivered by `A`** — grounded, canonical refs, relevance reason, safe fallback are the agent's design | tool 01/02 |
| FR-A6 thematic-mapping integration; preserve the USP (F008) | ✅ served — `tema`/`peta` tools; 3D map preserved | tools 07/12 |
| **P2/Epic D — Depth & attribution** | | |
| FR-D1 source identity (F006) | ✅ served — attribution-chip is already the app's DNA | design law |
| FR-D3 content-type distinction (F007) | ✅ served — UI/attribution work, aligns with the source-stack | design law |
| FR-D2 translator profile (F006) | 📚 needs verified bio + review | content |
| FR-D4 "Popular" virtue claims (F003) | 📚 needs a visible reference + review per claim | content |
| FR-D5 tafsir comparison, side-by-side by source (F014) | 📚 **approved via WIDEN (§ 4.1)** — add tafsir datasets, each canonical + ustadz-reviewed | content |
| **P3/Epic B,C — Output fixes** | | |
| FR-B1–B3 Indonesian audio `id-ID-ArdiNeural` + fallback (F004) | 🔧 defect (wrong voice) + ✅ `putarAudio` tool invokes it | tool 09 |
| FR-C1–C5 story narratives, ready-to-read + refs + bounded (F013/F015/F016) | 📚 a new output mode the agent can host, **but the narrative content needs sources + review** (§ 4.1 adjacent) | new mode |
| **P4/Epic E — Daily companion** | | |
| FR-E1 favorites (F009) | ✅ served **if local** — `simpanPenanda` is already browser/local, matching `A`'s no-accounts privacy stance | tool 10 |
| FR-E2 qibla direction (F010) | ➕ new one-shot sensor feature — not rejected by `A`; a small add. Decision (§ 4.2 minor) | new |
| FR-E3 prayer-time **reminders** (F012) | 🕓 **deferred to post-v3 opt-in track** (§ 4.2 decided). `jadwalSalat` times stay in v3; the scheduler does not | later track |
| FR-E4 retention **notifications** (console-pending-2) | 🕓 **deferred to post-v3 opt-in track** (§ 4.2 decided) | later track |
| FR-E5 hadith readings (F009) | 📚 needs graded sources + review — **the sourcing infra now exists** (§ 5) | content |
| FR-E5 donations (F009) | ⏸️ deferred by BOTH — governance/compliance first | out |
| condition-based home / personalization (console-pending-1) | ⚠️ **conflict** — `A` rejects server memory/accounts on privacy grounds. Decision (§ 4.3) | ⚠️ |
| "grounded and talk to people" (console-clarify-1) | ❓ needs clarification — likely the warm-redirect behaviour `A` already specifies | § A guardrails |

**Read-out:** most of `U`'s search + output + attribution asks are already served or are clean defect fixes. The friction is concentrated in exactly three places, next.

## 3. What `A` decided that v3 keeps (unchanged)

The agent architecture is *decided* — v3 inherits it verbatim; see `A` for full detail. In brief: a **fourth Worker surface** (`agent-quranku.axiara.ai`, `[env.agent]`, own `web/dist-agent` bundle); a **hybrid loop** (Worker reasons at edge speed via `ASSETS`, browser acts); **guarded-JSON tools** (model-agnostic, degrades to keyword retrieval); a **deterministic pre-router** so obvious questions never hit the model; **local-render-first** so v3 never feels slower than today; **thread-only memory** (nothing leaves the phone); and the guardrails in § 6. The three live surfaces are untouched.

## 4. The three conflicts — decisions only Erik can make

These are where `A` and `U` actively disagree. Combining them means naming these, not averaging them. **Status 2026-08-04:** 4.1 and 4.2 settled by Erik; 4.3 recommendation stands pending final confirm.

### 4.1 The corpus wall vs. the depth demand ← **the big one** · ✅ DECIDED 2026-08-04: **WIDEN**
`U` Epic D (asbābun nuzūl, translator profiles, tafsir comparison, Popular virtues) and Epic C (story narratives) all ask for **more content than the current corpus holds**. `A` explicitly **declined to widen the corpus** — "hold the wall and redirect warmly." UAT users are the counter-signal: they want depth.

**Decision — Option W (widen).** Erik chose to serve the depth demand: add sourced content (asbābun nuzūl set, a second/third tafsir for comparison, story source material) — **each behind canonical sources + ustadz review** (the § 5 sourcing infra is what makes this feasible now). This supersedes `A`'s "hold the wall" thesis: the corpus grows, but only through *curated + attributed* material, **never generated** — the guardrails in § 6 (esp. no-fabrication) are unchanged. Cost accepted: large content + review effort; content usage rights must be cleared per source. Rollout is staged (§ 7 Phase 3), highest-demand set first.
- ~~**Option H (hold):**~~ rejected — does not satisfy the Epic-D users.
- ~~**Middle:**~~ not chosen — Erik went to full widen rather than a single-set pilot.

### 4.2 Reminders & notifications — in or out? · ✅ DECIDED 2026-08-04: **SEPARATE LATER TRACK**
`U` Epic E wants prayer reminders (F012) + interactive notifications (console-pending-2). `A` **non-goal: no scheduler, reminders, or notifications.** These are opposite.

**Decision — separate later track.** Not in v3 scope, but not killed: reminders/notifications are parked as their own **opt-in track** (quiet-hours + frequency caps, per `U`'s own gating) to be taken up **after v3 stabilises**. Keeps v3 focused on the agent spine + depth, without discarding the demand. When it does ship, it must satisfy consent/privacy (NFR-5) and the "no manipulative/guilt-inducing notifications" non-goal (§ 8). **Qibla (F010) is *not* in this conflict** — one-shot sensor read, safe to add in v3 (Phase 4).

### 4.3 Accounts / server personalization vs. privacy · ⏳ STILL OPEN — recommendation stands (local-only)
`U` asks about favorites-sync (FR-E1 open Q3) and a condition-based personalized home (console-pending-1). `A` **rejected server-side memory and accounts** on privacy grounds (shared family phones; a 2am marriage question must leave zero server trace). Recommended reconciliation: **favorites and personalization stay LOCAL** (browser storage), which satisfies most of `U`'s intent without the privacy cost — only cross-device sync is lost. Confirm you accept "no cross-device continuity."

## 5. What changed since both PRDs were written — sourcing infra now exists

Both docs gate religious content behind "canonical sources + review" but neither had the tooling. It now exists, which de-risks the 📚 rows:
- **Dorar hadith CLI** (`~/printing-press/library/dorar/dorar-pp-cli`) — pulls **graded** hadith (narrator, grader, source, authenticity) → directly serves FR-E5 hadith and any narrative/virtue claim needing a sourced, graded citation.
- **The aqidah review pipeline** (`web/src/aqidah.ts` pending-stub pattern + `docs/review/` + `build-aqidah-sheet.ts`) — the established "ustadz authors verbatim, app transcribes" flow. Every 📚 item routes through it. The `jumlah-nabi-rasul` stub is the worked example.

## 6. Unified guardrails (both PRDs already agree here)

`A` and `U` converge — this is the shared spine, restated once:
1. **Sources before generation** (`U` P1 / `A` the wall) — every result grounded in approved data; `guardAnswerProse`/`guardComposeProse` unchanged.
2. **No fabrication** — of scripture (`A`), or of hadith/asbābun nuzūl/virtues/story detail/sources (`U` non-goals). Unavailability is stated honestly.
3. **Action honesty (new class)** — `A`: the "here's what I did" line is templated from the executed-tool log, never model-written → a fabricated action is structurally impossible.
4. **Crisis pre-empts everything** — `detectCrisis` runs first, deterministic, no model call; the agent loop is never invoked on a hit. Unchanged.
5. **Religious review gate** — every 📚 item + the agent's system prompt/templates/redirect copy + ~30 transcripts reviewed by the ustadz before release. Both docs require this.
6. **Persona: first person, unnamed, never interprets** (`A`) — `aku`/`untukmu`, narrates what it did, points at who said what; no name, no avatar, no `menurutku`.
7. **Consent & control** (`U` NFR-5) — location/notifications/audio/personalization transparent and disableable.
8. **Preserve the USP** — 3D thematic mapping (F008) validated against every search/nav change.

## 7. Unified roadmap (merged phases)

| Phase | Content | From |
|---|---|---|
| **0 — Evidence & decisions** | Reproduce F004/F011/F016; settle § 4.1–4.3; appoint the reviewer & sign-off flow; measure search/perf baseline; confirm framing | `U` Phase 0 |
| **1 — Reliability + search foundation + the agent spine** | Fix defects (quick-access, audio voice); surah-name normalization/fuzzy; **stand up `[env.agent]` + the hybrid loop + deterministic pre-router + local-render-first** (`A` items 01–08); preserve peta | `U` P1 + `A` 01–08 |
| **2 — Attribution & agent guardrails** | Source/translator metadata + content-type UI (FR-D1/D3); **templated action narration, warm-redirect, crisis regression, rate-limit/spend ceiling** (`A` 07,09,10,12); the first screen (`A` 11) | `U` P2 + `A` 07–12 |
| **3 — Approved content experiences (§ 4.1 = WIDEN)** | Sourced asbābun nuzūl + tafsir-comparison + story-narrative mode — each ustadz-reviewed via § 5 infra; highest-demand set first, usage rights cleared per source | `U` P3 + `A` content |
| **4 — Daily companion (§ 4.2 = separate track)** | Local favorites; qibla (in v3); reminders/notifications **deferred to the post-v3 opt-in track**, not built here; personalization per § 4.3 (local-only rec); donations only after governance | `U` P4 |
| **Eval & review (continuous)** | `src/eval/agent-cases.ts` routing eval (≥85% top-tool, `A` 13); `bun test`/typecheck green; Interceptor on the live URL; scholar-review package (`A` 14) | `A` DoD |

## 8. Non-goals (unified)
New fatwas/tafsir · combining scholars into one opinion · fabricating any religious material · touching the three live surfaces · relaxing the guards · server-side memory/accounts (§ 4.3) · donations before governance · manipulative/guilt-inducing notifications · shipping all of `U` in one release.

## 9. Open decisions
**Erik/product:** ✅ RESOLVED 2026-08-04 — framing (§ 0 = agent spine is the vehicle), § 4.1 (WIDEN), § 4.2 (separate later track), reviewer (§ 9, same person), first-release scope (agent spine + defect fixes together). ⏳ Still open: § 4.3 accounts/privacy (recommendation local-only stands) · which daily features fit the positioning.
**Domain/religious:** approved sources for asbābun nuzūl/hadith/virtues/stories · boundaries for reflections & narrative elements · how to present tafsir differences without correcting scholars · the reviewer & sign-off workflow.
**Reviewer note (✅ resolved 2026-08-04):** `U`'s "Pak Darus" and the live-pipeline **Ustadz Ahmad Isrofiel Mardlatillah** are the **same person** — one reviewer of record for all religious sign-off.
**Still-needed evidence (`U`):** device/repro for F004/F011/F016 · exact prompt+output for the narrative finding · search/perf baseline · content usage rights · clarify "grounded and talk to people."

## 10. Sign-off
| Role | Name | Status |
|---|---|---|
| Product owner | Erik | Pending |
| Engineering owner | TBD | Pending |
| Domain/religious reviewer | Ustadz Ahmad Isrofiel Mardlatillah (= "Pak Darus", confirmed) | Pending |
| UAT/retest owner | TBD | Pending |
