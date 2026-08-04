# PRD: QuranKu v3 — Agentic Edition × UAT Feedback (combined)

**Status:** Draft for product triage — combines two source PRDs. Not an approval, not a release decision.
**Filed:** 2026-08-04 · **Owner:** Erik · **Domain reviewer:** Ustadz Ahmad Isrofiel Mardlatillah (see § Reviewer note)

**Sources combined:**
- `A` — *QuranKu v2, the Agentic Edition* (`.scratch/agent-edition/PRD.md`) — decided, from a `/grilling` interview (2026-08-02). The **architecture**.
- `U` — *QuranKu based on UAT Feedback* (`2026-08-04_…-uat-feedback-prd-en.md`) — triage-stage, from cycle `UAT-2026-01` (15 records, 5 contributors). The **demand**.

> **Framing assumption (correct me if wrong):** v3 = **the Agentic Edition is the delivery vehicle**, and the UAT feedback is the **user-validated requirement set** that vehicle should serve. The agent is *how*; the UAT needs are *what*, prioritised by real users. Everything below flows from that. (Naming: `A` said "v2"; you've been saying v3 — same edition, renamed here to v3.)

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
| FR-D5 tafsir comparison, side-by-side by source (F014) | 📚 **needs more tafsir datasets → corpus expansion** — the central tension (§ 4.1) | content |
| **P3/Epic B,C — Output fixes** | | |
| FR-B1–B3 Indonesian audio `id-ID-ArdiNeural` + fallback (F004) | 🔧 defect (wrong voice) + ✅ `putarAudio` tool invokes it | tool 09 |
| FR-C1–C5 story narratives, ready-to-read + refs + bounded (F013/F015/F016) | 📚 a new output mode the agent can host, **but the narrative content needs sources + review** (§ 4.1 adjacent) | new mode |
| **P4/Epic E — Daily companion** | | |
| FR-E1 favorites (F009) | ✅ served **if local** — `simpanPenanda` is already browser/local, matching `A`'s no-accounts privacy stance | tool 10 |
| FR-E2 qibla direction (F010) | ➕ new one-shot sensor feature — not rejected by `A`; a small add. Decision (§ 4.2 minor) | new |
| FR-E3 prayer-time **reminders** (F012) | ⚠️ **conflict** — `A` ships `jadwalSalat` (times) but explicitly **rejects a scheduler/reminders**. Decision (§ 4.2) | tool 04 / ⚠️ |
| FR-E4 retention **notifications** (console-pending-2) | ⚠️ **conflict** — `A` non-goal: no notifications. Decision (§ 4.2) | ⚠️ |
| FR-E5 hadith readings (F009) | 📚 needs graded sources + review — **the sourcing infra now exists** (§ 5) | content |
| FR-E5 donations (F009) | ⏸️ deferred by BOTH — governance/compliance first | out |
| condition-based home / personalization (console-pending-1) | ⚠️ **conflict** — `A` rejects server memory/accounts on privacy grounds. Decision (§ 4.3) | ⚠️ |
| "grounded and talk to people" (console-clarify-1) | ❓ needs clarification — likely the warm-redirect behaviour `A` already specifies | § A guardrails |

**Read-out:** most of `U`'s search + output + attribution asks are already served or are clean defect fixes. The friction is concentrated in exactly three places, next.

## 3. What `A` decided that v3 keeps (unchanged)

The agent architecture is *decided* — v3 inherits it verbatim; see `A` for full detail. In brief: a **fourth Worker surface** (`agent-quranku.axiara.ai`, `[env.agent]`, own `web/dist-agent` bundle); a **hybrid loop** (Worker reasons at edge speed via `ASSETS`, browser acts); **guarded-JSON tools** (model-agnostic, degrades to keyword retrieval); a **deterministic pre-router** so obvious questions never hit the model; **local-render-first** so v3 never feels slower than today; **thread-only memory** (nothing leaves the phone); and the guardrails in § 6. The three live surfaces are untouched.

## 4. The three conflicts — decisions only Erik can make

These are where `A` and `U` actively disagree. Combining them means naming these, not averaging them.

### 4.1 The corpus wall vs. the depth demand ← **the big one**
`U` Epic D (asbābun nuzūl, translator profiles, tafsir comparison, Popular virtues) and Epic C (story narratives) all ask for **more content than the current corpus holds**. `A` explicitly **declined to widen the corpus** — "hold the wall and redirect warmly." UAT users are the counter-signal: they want depth.
- **Option W (widen):** add sourced content (asbābun nuzūl set, a second/third tafsir for comparison, story source material) — each behind canonical sources + ustadz review. Serves the demand; large content + review effort; changes `A`'s thesis.
- **Option H (hold):** keep the corpus narrow; the agent's **warm redirect** (`A` § guardrails) is the answer to depth questions it can't source. Cheaper, safer, but does not satisfy the Epic-D users.
- **Middle (recommended to consider):** hold for *generative* depth, but add the **highest-demand sourced set only** (translator source identity FR-D1 is already in; add asbābun nuzūl OR one tafsir-comparison pair as a reviewed pilot). Depth as *curated + attributed*, never *generated*.

### 4.2 Reminders & notifications — in or out?
`U` Epic E wants prayer reminders (F012) + interactive notifications (console-pending-2). `A` **non-goal: no scheduler, reminders, or notifications.** These are opposite. Decision: are reminders/notifications part of v3, a separate track, or out? (`A`'s rationale was scope discipline, not a hard product ban — but they carry real privacy/consent + delivery cost, and `U` itself gates them behind opt-in/quiet-hours/frequency-caps.) **Qibla (F010) is *not* in this conflict** — it's a one-shot sensor read, safe to add.

### 4.3 Accounts / server personalization vs. privacy
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
| **3 — Approved content experiences (gated on § 4.1)** | If widen: sourced asbābun nuzūl / tafsir-comparison pilot / story-narrative mode — each ustadz-reviewed via § 5 infra | `U` P3 + `A` content |
| **4 — Daily companion (gated on § 4.2/4.3)** | Local favorites; qibla; then reminders/notifications *only if* § 4.2 says in, consent-gated; donations only after governance | `U` P4 |
| **Eval & review (continuous)** | `src/eval/agent-cases.ts` routing eval (≥85% top-tool, `A` 13); `bun test`/typecheck green; Interceptor on the live URL; scholar-review package (`A` 14) | `A` DoD |

## 8. Non-goals (unified)
New fatwas/tafsir · combining scholars into one opinion · fabricating any religious material · touching the three live surfaces · relaxing the guards · server-side memory/accounts (§ 4.3) · donations before governance · manipulative/guilt-inducing notifications · shipping all of `U` in one release.

## 9. Open decisions
**Erik/product:** the three conflicts (§ 4.1–4.3) · which daily features fit the positioning · framing assumption (§ 0) · v3 scope of first release (stabilise vs. search vs. agent spine — recommend: agent spine + defect fixes together, since the spine *is* the search/output vehicle).
**Domain/religious:** approved sources for asbābun nuzūl/hadith/virtues/stories · boundaries for reflections & narrative elements · how to present tafsir differences without correcting scholars · the reviewer & sign-off workflow.
**Reviewer note:** `U` cites "Pak Darus" as proposer and a "TBD" reviewer; `A` and our live pipeline name **Ustadz Ahmad Isrofiel Mardlatillah**. Confirm they're the same person or clarify roles.
**Still-needed evidence (`U`):** device/repro for F004/F011/F016 · exact prompt+output for the narrative finding · search/perf baseline · content usage rights · clarify "grounded and talk to people."

## 10. Sign-off
| Role | Name | Status |
|---|---|---|
| Product owner | Erik | Pending |
| Engineering owner | TBD | Pending |
| Domain/religious reviewer | Ustadz Ahmad Isrofiel Mardlatillah (confirm vs. "Pak Darus") | Pending |
| UAT/retest owner | TBD | Pending |
