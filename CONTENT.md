# Content

**Nur** — نور

## Register

product

## The Organizing Axis: Situation, Not Mood

Every competitor found (Muslim Therapy, MuslimHira, Muraqaba, Afiah, Ruh) maps verses to *mood* — calm, anxious, sad. This is the wellness-app move by another name: a feelings-tagger with scripture attached.

Nur maps to **situation**: the thing that actually happened. Got laid off. Parent won't accept a choice. Missed prayer for the fortieth day and stopped trying. Bullied for wearing hijab. This is what "personal psychologist from a religious point of view" (the founding brief) actually requires — a psychologist asks *what happened*, not just *how do you feel*.

This also matches PRODUCT.md's own framing of arrival state (*carrying something* / *curious but locked out*) — the pillar structure below is that framing, extended into content architecture. It is not a new idea layered on top; it is the existing product identity made operational.

**Rule for every pillar below:** name the situation in the user's words before naming the Islamic concept. "Aku baru di-PHK" comes before *rizq*. The concept explains; it does not lead.

## How to Read This Document

Each pillar has:
- **Situation** — what the user is actually going through, in plain language
- **Evidence** — confidence level from research (`[HIGH]` / `[MED]` / `[LOW-NEEDS-RESEARCH]`)
- **Quranic anchor** — the verse(s)/concept(s), attributed, never arbitrated
- **What NOT to do** — the failure mode this pillar is most likely to fall into
- **Format** — which of Nur's existing surfaces this pillar uses first

Pillars are tiered by launch priority, not importance — Tier 3 topics matter as much to users, they're just under-evidenced and would ship on guesswork today.

---

## Architecture & Pipeline

A pillar is not a standalone article. It is **structured data — a situation→verse/tafsir mapping — with a thin editorial wrapper on top.** The mapping is what makes this system usable by both a human browsing and, later, the AI chat's retrieval step; an editorial-only version would be disconnected from the AI that PRODUCT.md says "answers only from cited sources," and a data-only version would have no browsable surface for a user to actually land on.

The mapping lives as a **new, thin layer on the existing knowledge-graph pipeline** (`src/app/build-graph.ts`, `build-corpus.ts`, `build-graph-derived.ts`) — a `situations.json` (or equivalent build step) shaped `situation-tag → { pillar, verse refs, priority tafsir source ids }`, referencing verse and tafsir-source IDs that already exist in the corpus. It does not duplicate verse text or attribution data, and it does not become a second, parallel content system alongside the graph. Adding pillar 13 later is a data-file edit, not a new subsystem.

**Entry point sequencing:** Wave 1 ships as **browse-only** — a static list/grid rendering `situations.json`, no new AI logic. Free-text routing (a user typing their situation into the AI chat and having it auto-match a pillar) is a deliberate fast-follow, not part of this launch — misrouting a free-text message at 2am is worse than no routing (per PRODUCT.md's "never fabricate; silence is honest"), and that accuracy problem needs its own eval pass before it ships.

## Authoring & Review Process

1. **Draft:** AI-assisted first pass, pulling only from verses/tafsir already attributed in the corpus — no new interpretive claims invented at this stage.
2. **Edit:** You edit for voice. This is the step that matters most — an unedited AI draft reads as generic empathy copy, which is the wellness-app failure mode this whole product is built to avoid.
3. **Localize:** Copy is drafted **Indonesian-first**, not written in English and translated — colloquial distress language ("aku baru di-PHK") doesn't survive translate-after. Run through `IndonesianPolish` before the next step.
4. **Review:** A named scholar signs off on the theological claim (this verse addresses this situation) before anything ships — the editorial framing is a product/content call, but the claim itself goes through a review gate, the same way ISA.md's `literal_companion` invariant treats interpretive risk as a first-class concern, not a footnote.
   **Reviewer: Ustadz Ahmad Isrofiel Mardlatillah, M.A.** (Lentera Jalan Pulang Foundation / Marwah Muslimah Center, Cibubur — runs a recurring Tadabbur Al-Qur'an series). Contact: 0882 9544 4025.
5. **Coverage bar for Wave 1:** ship with the 1-2 anchor verses already drafted per pillar — thin-but-reviewed beats wide-but-unreviewed. A broader verse set (5-10 per pillar) is a v2 depth pass, needed only once free-text retrieval (above) becomes a real workstream.

**Primary rendering rule:** every pillar response — the actual text a user reads when Nur answers their situation — leads with the **Tarjamah Tafsiriyah (Ustadz Muhammad Thalib, `tafsiriyah-thalib` in `src/ingest/sources.ts`)** rendering, with the literal translation kept alongside, not primary. This is not a pillar-specific exception; it's PRODUCT.md's whole-app reading model applied without a shortcut here.

**Checked, not assumed:** none of the 12 pillars' anchor verses collide with the existing divergence-review queue (`docs/review/divergence.json`, 1,224 mechanically-flagged verses) or the 16 verses awaiting Erik's manual ruling. No new blocker introduced against that pending review.

---

## Tier 1 — Flagship Pillars (build first, strongest evidence)

### 1. Shame & the Return
**Situation:** Missed prayer for weeks. Stopped reading. Feels like it's too late to come back, so doesn't try.
**Evidence:** `[HIGH]` — named by research as the single most overlooked struggle across all four competitors; ISPU data ties stigma directly to Muslim youth avoiding help.
**Quranic anchor:** *"Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah"* (39:53) — tawbah as ongoing return, not a one-time failure state.
**What NOT to do:** Do not gamify this. No streaks, no "you haven't opened Nur in 12 days," no guilt-shaped copy anywhere near this pillar — this is the one place the anti-streak-shaming principle in PRODUCT.md is load-bearing, not decorative.
**Format:** A dedicated re-entry surface, separate from onboarding, that a lapsed user lands on directly — not a lecture, an open door.

### 2. Identity Between Two Worlds
**Situation:** Muslim in a non-Muslim (or nominally Muslim) space, online self vs. offline self, first-gen navigating a culture parents don't fully recognize.
**Evidence:** `[HIGH]` — the strongest, most consistently-surfaced mapping across every research pass.
**Quranic anchor:** Fitrah (identity as inherent, not performed); prophetic narratives of dual belonging — Musa raised in Pharaoh's household, Yusuf between cultures and betrayed by his own family.
**What NOT to do:** Don't resolve the tension with a tidy answer. The prophets in question lived the tension for years before resolution; the content should sit in it, not rush past it.
**Format:** Story-based tafsir — narrative retellings of the prophetic arc, not verse-by-verse exegesis, with the tafsir sources named alongside per the attribution-as-design principle.

### 3. Purpose in the Middle of Nowhere
**Situation:** Existential drift. "What is any of this for." Often adjacent to career anxiety but broader — a meaning crisis, not just a jobs crisis.
**Evidence:** `[HIGH]` — flagged in the academic research pass as the clearest tafsir-to-struggle mapping found.
**Quranic anchor:** Khalifa (stewardship/purpose) reframed past ritual-only reading; tawakkul (trust after effort) as the operating posture, not a platitude.
**What NOT to do:** Don't answer "what's it for" with "worship" as a full stop — 51:56 is the anchor, but the content needs to unpack what that actually asks of a 22-year-old on a Tuesday, or it reads as a Sunday-school answer.
**Format:** Pairs naturally with Pillar 6 (Money & Work) — cross-link rather than duplicate.

### 4. Money & Work
**Situation:** Laid off, broke, can't get hired, comparing salaries, debt.
**Evidence:** `[HIGH]` — Deloitte 2025: ~65% of Gen Z don't feel financially stable; this is their #1 stressor. Zero competitors touch it.
**Quranic anchor:** Rizq (provision) theology — *"Allah is the best of providers"* (62:11) — held in balance with effort, not fatalism dressed as faith.
**What NOT to do:** Do not let this collapse into "just trust Allah and stop worrying" — that reads as dismissive of a real, structural problem (2025 job market) and will read as out-of-touch to exactly the audience this pillar targets.
**Format:** Situation-triggered — "I got laid off" as a literal entry point users can type or tap, not buried under a "finance" mood tag.

### 5. Family, Not Resolved
**Situation:** Parents who don't accept a partner, a career choice, a level of religiosity, or its absence. Intergenerational and often diaspora-specific.
**Evidence:** `[HIGH]` — ISPU names family conflict as a primary barrier to Muslim youth seeking help; competitors handle this shallowly per the Perplexity research pass.
**Quranic anchor:** Birr al-walidayn (kindness to parents), held against 31:15's explicit carve-out — *accompany them with good companionship* even while *not obeying* if they demand disobedience to Allah. Nuance is the content, not a bug to smooth over.
**What NOT to do:** Do not resolve every case with "honor your parents." The verse itself doesn't. Content should validate that the tension can be real and unresolved.
**Format:** Longer-form — this is the pillar most likely to need the four-tafsir-disagreeing view, since scholars differ on where the line sits.

### 6. Alone in a Full Feed
**Situation:** Hundreds of contacts, no one to call. Loneliness that hyperconnection didn't fix.
**Evidence:** `[HIGH]` — ~80% of Gen Z report loneliness in the past 12 months, roughly double the Boomer rate.
**Quranic anchor:** Allah as *al-Qareeb* (the Near) — *"I am near, I respond to the call of the caller"* (2:186); ummah as a real, not metaphorical, community claim.
**What NOT to do:** Don't let "Allah is always with you" substitute for pointing toward actual human community — that's a spiritual bypass, and PRODUCT.md's "reached, not lectured" standard rejects it. **Also don't oversell:** this pillar has no companion feature to point to (below), so the copy must not imply one exists.
**Format:** Content-only for v2. The honest answer to loneliness is arguably a community/connection feature, not just content — but that's a different order of engineering and moderation effort, and bundling it into this launch would stall the other 11 pillars waiting on something structurally unrelated. **Decision (2026-07-15): out of scope for v2.** Ship the content honestly — situation + Allah as *al-Qareeb* — without gesturing at a community feature the app doesn't have.

### 7. Comparing Yourself to Everyone
**Situation:** Doom-scrolling, FOMO, "everyone's life looks better than mine."
**Evidence:** `[HIGH]` — well-documented in the Gallup/Walton data (33% of Gen Z feel pressure to be perfect, 40% of girls).
**Quranic anchor:** Shukr and qana'ah (gratitude, contentment) — *"Do not extend your eyes toward what We have given some to enjoy"* (20:131).
**What NOT to do:** Don't make this a generic gratitude-journal feature with a verse stapled on — that's the wellness-app cliché PRODUCT.md explicitly bans.
**Format:** Short-form, situational — works well as the lightest-touch pillar for a 2am one-tap read.

### 8. Anxious About Everything
**Situation:** General anxiety, perfectionism, pressure to have it figured out.
**Evidence:** `[HIGH]` — 45% of Gen Z felt stressed "a lot" yesterday (Gallup/Walton).
**Quranic anchor:** Tawakkul — *"So when you have decided, then rely upon Allah"* (3:159); *"Allah does not burden a soul beyond what it can bear"* (2:286).
**What NOT to do:** This is the pillar most at risk of becoming generic — "trust God" is true but needs the specific reframe (control vs. surrender, decided vs. undecided) or it's indistinguishable from a fridge magnet.
**Format:** The most natural fit for the AI chat entry point — anxiety rarely arrives pre-labeled with a verse in mind.

---

## Tier 2 — Differentiator (greenfield, no competitor has built this)

### 9. The World Is Falling Apart
**Situation:** Climate anxiety, political despair, doomscrolling the news.
**Evidence:** `[MED]` — the conceptual bridge (khalifa/stewardship, 2:30) is clean and well-attested theologically, but named explicitly in the academic research pass as a content gap nobody has filled. Build with more editorial care than the Tier 1 pillars since there's no prior art to react to.
**Quranic anchor:** Khalifa — humanity as steward, not owner, of the earth (2:30).
**What NOT to do:** Don't make this partisan. Stewardship theology, not a specific policy position.
**Format:** Longer-form essay/reflection, lower frequency than Tier 1 — this is a differentiation play, not a daily-use pillar.

---

## Tier 3 — Needs Dedicated Research Before Building

Do not write content for these against the current evidence base — the research pass came back thin on all three, across all four independent agents. Each needs its own follow-up research pass (community sentiment, app-store reviews, Reddit) before a single verse gets mapped.

### 10. Dating & Relationships `[LOW-NEEDS-RESEARCH]`
Weakest-evidenced category in the entire research pass. Likely real (it's a universal Gen Z topic) but unmapped.

### 11. Body Image `[LOW-NEEDS-RESEARCH]`
Thin across all four agents. 95:4 (*best of stature*) and haya-as-dignity are plausible anchors but unvalidated against actual user language.

### 12. Addiction — Porn, Gaming, Substances `[LOW-NEEDS-RESEARCH]`
High-demand by community anecdote, underrepresented in the literature the research pass could find. Sensitive enough that guessing at tone here is a real risk — needs its own pass before a content brief exists.

---

## Cross-Cutting Rules (apply to every pillar)

1. **Attribution is the content, not a footnote.** Every verse-to-situation mapping names its tafsir source(s) inline, the same way the reading surface does per PRODUCT.md. Where sources disagree, show it — that's generosity, not hedging.
2. **Silence over fabrication.** If a situation has no clean anchor in the corpus, the content says so. A confident wrong answer is worse than "I don't know" here specifically because the audience is in distress when they read it.
3. **2am and commute are both first-class — eventually.** Every Tier 1 pillar's *destination* is a short form (one verse, one reframe, tappable in the dark at 2am) and a long form (the full story/nuance, read on the commute). Wave 1 ships short-form only, to get the drafting→localize→review pipeline validated on lower-stakes content first — long-form is a deliberate fast-follow per pillar, not a relaxation of the rule that both must eventually exist.
4. **No pillar ends in a lecture.** Every piece closes on the verse and its meaning, not on a call to "be more grateful" / "pray more" / "trust more." PRODUCT.md's ban on preachy, paternal, guilt-shaped content applies pillar-by-pillar, not just app-wide.
5. **Situation-first copy.** The user's own words for what's happening come before the Islamic term that explains it — never the reverse.
6. **Tafsiriyah leads, literal stays companion.** Every pillar response renders the Tarjamah Tafsiriyah (Thalib) first, with the literal translation kept alongside — never dropped, never primary. See Authoring & Review Process above.

## Suggested Launch Sequence

**Wave 1** (highest evidence + covers the widest arrival-state range): Shame & the Return, Anxious About Everything, Alone in a Full Feed. Ships browse-only, short-form only, 1-2 anchor verses per pillar — this wave's job is to validate the draft→localize→review pipeline end-to-end on the lowest-stakes content before committing to depth.
**Wave 2**: Identity Between Two Worlds, Purpose in the Middle of Nowhere, Money & Work.
**Wave 3**: Family Not Resolved, Comparing Yourself to Everyone.
**Wave 4**: The World Is Falling Apart (Tier 2).
**Tier 3 research** (Dating & Relationships, Body Image, Addiction): commissioned **in parallel with Wave 1**, not parked until Waves 1-4 ship — Erik's call, overriding the more conservative default of waiting for the review pipeline to prove out first. No content gets drafted for these until that dedicated research pass lands.

## Design Decisions (resolved 2026-07-15, via grilling session)

All open questions from the first draft of this document are now resolved:

- **Artifact type:** pillars are situation→verse/tafsir data (feeds AI retrieval later) with a thin editorial wrapper — not standalone articles.
- **Data location:** new `situations.json`-style layer on the existing knowledge-graph pipeline, referencing existing verse/tafsir IDs — not a parallel content system.
- **Routing:** browse ships first (Wave 1); free-text AI routing is a fast-follow requiring its own accuracy eval.
- **Review gate:** scholar sign-off required before any pillar ships — **Ustadz Ahmad Isrofiel Mardlatillah, M.A.**, contact 0882 9544 4025.
- **Verse coverage:** 1-2 anchors for Wave 1; 5-10 per pillar is a v2 depth pass tied to the free-text retrieval workstream.
- **Language:** Indonesian-first drafting, polished via `IndonesianPolish`, before scholar review.
- **Format:** short-form ships first per pillar; long-form is a fast-follow, not a relaxed requirement.
- **Ownership:** AI-assisted first draft → Erik edits for voice → scholar reviews.
- **Primary rendering:** Tarjamah Tafsiriyah (Thalib, `tafsiriyah-thalib`) leads every pillar response; literal translation stays companion, never dropped.
- **Pillar 6 (Alone in a Full Feed):** community/connection feature explicitly out of scope for v2; content ships honestly without implying one exists.
- **Tier 3 timing:** research commissioned in parallel with Wave 1.
- **Success signal:** completion (did they read to the end) + 7-day return (did they come back to Nur at all) — diagnostic pair, not a pass/fail number, no numeric target set yet.
- **Divergence-queue check:** verified none of the 12 anchor verses collide with the existing 1,224-verse mechanical flag list or Erik's 16 pending manual rulings.
