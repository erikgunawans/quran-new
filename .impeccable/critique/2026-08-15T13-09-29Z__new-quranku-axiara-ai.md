---
target: whole app, breadth-first
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
timestamp: 2026-08-15T13-09-29Z
slug: new-quranku-axiara-ai
---
Method: dual-agent (A: design review, isolated · B: detector + browser evidence, isolated)

Target: the whole app, breadth-first — `/`, `#/baca`, `#/surah/18`, `#/hadis`, `#/fikih`, `#/peta`, both registers, desktop 1440 and phone 390.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | The three-beat loader (*Memahami pertanyaan → Mencari ayat → Menyusun jawaban*) is excellent. But clicking `#send` produced no turn, no error, and cleared the field — only Enter submitted. Hash-navigating to `#/surah/18` mid-thread left the old thread on screen while the DOM reported surah content. |
| 2 | Match System / Real World | 2 | `#/surah/18` opens with "Pengantar Surah" defaulted to the `Arab` tab — 3,861px of untranslated scholarly Arabic before ayah 1. The `Fikih` nav item does not lead to fikih. |
| 3 | User Control and Freedom | 1 | `Hapus percakapan` is the most prominent control in the thread, unconfirmed, no undo. No "stop generating" during a ~12s answer. The back affordance moves per route, and on `#/peta` `Kembali` is a third segment inside a view-mode control. The graph has no zoom-out, no reset, no keyboard path. |
| 4 | Consistency and Standards | 1 | Gold is applied to 114 surah names (title *and* vertical spine glyphs) and 13 `#/peta` Arabic category labels, while `#/hadis` renders the identical class of Arabic in ink. The `MAKKIYAH` pill carries a gold outline. Per the brief, gold is permitted in the hero gradient, the ambient sky, and the Makkiyah/Madaniyah tag only. |
| 5 | Error Prevention | 2 | The question generator excludes unanswerable seeds by name — genuinely good. Against that, `Hapus percakapan` and `Hapus data di perangkat ini` are both unconfirmed destructive actions. |
| 6 | Recognition Rather Than Recall | 1 | `#/baca` shows one readable surah at a time out of 114, in a ring opening on `113 · 114 · 001 · 002 · 003`. Reaching Yasin means paging 35 times or already knowing the name. No list, no grid, no juz index. |
| 7 | Flexibility and Efficiency | 3 | Real depth: `⌘K`, working `A−/A/A+` Arabic scaling, tafsir sort, audio scope. Cost: 41 tab stops from load to the composer, and no skip link. |
| 8 | Aesthetic and Minimalist Design | 2 | The `#/baca` expanded card spends ~500×620px on one Arabic word with metadata crushed to the bottom edge. Three stacked overlays at the panel foot on every route. |
| 9 | Error Recovery | 1 | No designed error state surfaced; the one failure hit (the `#send` click swallowing the message) produced no message, no toast, no retry. |
| 10 | Help and Documentation | 4 | Best-in-class, plainly. `?` chips resolve to real accessible names, and the Hadis/Fikih notices state exactly what is machine-translated and exactly what the ustadz did and did not approve. |
| **Total** | | **19/40** | **Poor — major UX work needed, on top of an unusually strong foundation** |

No heuristic scored `n/a`; all ten apply to a product with an Operate surface, a Read surface, and destructive actions.

That 19 needs context. This is not a weak product — it is a product with three or four genuinely exceptional surfaces and a set of system-level failures that any one of them would survive but all of them together do not.

## Design Specificity Verdict

**Authored — more than most products in this category. But the authorship is concentrated in three surfaces, and the system does not hold across them.**

No unrelated product could use this unchanged. The Peta Tematik cosmos renders 1,632 verses as stars and 13 categories as constellations, and it earns the concept because the encoding is *honest* — one star is one ayah, cluster size is category size, and the stat block states `13 kategori / 2.451 topik / 1.632 ayat / 518 ayat penghubung` rather than leaving scale to be inferred from a pretty picture. That is the celestial ground used as data, which is the only real defence against the ornament charge. The `#/baca` shelf renders 114 surahs as book spines with the Arabic name running vertically down each — the mushaf as furniture. The surah cartouche is geometry as structure.

Where it goes generic: `#/fikih` is `#/hadis` wearing a different hat — every row is `kitab + Bukhari/Muslim · N hadis`, with "Salat", "Haid" and "Zakat" each appearing twice. The composer is the same floating pill on all six routes including index routes with nothing in context to ask about.

**Deterministic scan:** the detector found **1 finding across 25 markup sources** — `overused-font` at `web/index.html:23` (Fraunces). Two runs, exit 2 then exit 0. No JSX false positives; it did not misfire on template-string markup. That is a remarkably clean mechanical result, and it is worth saying why it doesn't mean much: every serious problem in this critique is a *composition, contrast, or voice* failure, and the detector's rule set does not reach any of them. A clean detector run on this app is evidence about the detector, not about the app.

**No overlay was created.** Injection preflight succeeded (`titleMutable`, `scriptTagExecuted`, `domAppend` all true), but no overlay content was specified for this run, so there is nothing visible in a browser tab to look at. Screenshots were captured instead.

## Overall Impression

The best thing in this app is its honesty, and the worst thing in this app is that its most honest surface and its least honest surface are one tap apart.

The Hadis notice names the machine, names the permission, and names what the ustadz did *not* do. Then the synthesis lane tells a woman whose mother just died what Allah wants, in a voice she did not use, with an unattributed hadith, under an 11.7px disclaimer four thousand pixels below.

The single biggest opportunity is not a redesign. It is the synthesis prompt and one theme bug.

## What's Working

1. **The honesty notices on `#/hadis` and `#/fikih` are the best design work in the product.** They work because they are set at body size, above the content, before the reader can be misled — not in a footer, not behind an info icon — and because they draw the exact line between what a scholar permitted (display) and what he did not (line-by-line review).

2. **The index answer is the best-composed screen in the app.** Claim on the left, `QS. At-Taubah, 9:103 →` right-aligned in tabular figures, hairline rules, no card chrome, eight rows capped with `Lihat semua 110 entri`. The reference and the claim are the only two things on the row, so the eye reads it as a table of evidence rather than a list of assertions. That is "attribution is the design" rendered as structure.

3. **The accessibility floor is real engineering, not a checklist.** `A+` scales `--ar-size` 2.1→2.7rem with `scrollWidth === clientWidth` on all five routes at 390px — zero horizontal overflow, a hard requirement actually met. 45 `:focus*` rules with only 3 outline removals, each with a replacement. 29 `prefers-reduced-motion` blocks gating every decorative animation.

## Priority Issues

### [P0] The default theme setting paints the answer white-on-white

**What:** Both assessments found the panel/ink desync. They disagreed on whether it ships, and the disagreement is the finding. Assessment A judged it **latent** — the token computes wrong but nothing currently paints with it. Assessment B **falsified that with a reachable path and a screenshot**: clicking Pengaturan → **"Ikut sistem"** — which is the default, `aria-pressed="true"` — removes the `data-theme` attribute entirely, and the panel paints `rgb(242,255,248)` while the ink tokens stay at dark-register values.

Measured in that state: **15 contrast failures**, against 5 in `light` and 0 in `dark`. The AI answer prose (`p.said`, 17.5px) computes to **1.06:1**. Not "below AA" — invisible.

**Why it matters:** this is the app's own default setting, on the surface that carries the answer, for a reader at 2am. It is transient — a reload re-stamps `data-theme="dark"` — which is worse, not better: it means the bug hides from anyone who refreshes before looking, which is exactly how it survived to production.

**Fix:** the panel flips on the `data-theme` attribute while ink tokens flip on `prefers-color-scheme`. Pick one axis for both. The cheapest correct fix is to stamp a resolved `data-theme` on load for the `system` choice too, so the attribute is never absent; the more durable one is to define every ink token on bare `:root` and override under both `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`.

**Suggested command:** `$impeccable audit`

### [P0] The composer prints its placeholder on top of the scripture

**What:** `#composer-bar` is a translucent floating pill fixed to the panel foot, and the scroll container reserves no space for it. On the answer thread at both 1440×779 and 390×724, `Ceritakan atau tanyakan apa saja…` renders directly over the Qur'anic Arabic of 2:156 and over its meaning translation. It also occludes the `Terjemahan harfiah & tafsir ulama` toggle — the one affordance design principle 4 depends on. Same overlap on `#/baca`, `#/hadis`, `#/fikih` and `#/peta`. Five of six routes.

**Why it matters:** the interface literally out-shouting the scripture inverts design principle 1 on the highest-stakes content in the app. At 390px the composer eats the bottom 15% of the panel and the overlapped band is precisely where the verse falls.

**Fix:** reserve the space instead of floating over it — `padding-bottom: calc(var(--composer-h) + var(--footer-h) + var(--s-5))` on `.qk-panel-body`, with matching `scroll-padding-bottom` so anchor jumps land clear, measuring `--composer-h` off the element rather than hardcoding. Give the composer an opaque ground on scroll routes; the translucent treatment is right on the empty landing and wrong everywhere else.

**Suggested command:** `$impeccable layout`

### [P0] The AI answers grief in its own voice, as a scholar

**What:** the synthesis lane asserts divine intent (*"Allah justru ingin mengingatkan kita pada satu hakikat yang sangat mendalam"*), the deceased's metaphysical state (*"kebaikan Anda adalah kebanggaan bagi ibu Anda di alam sana"*), and an unattributed hadith (*"doa anak yang shalih adalah salah satu amal yang tidak terputus"*) — then issues imperatives to a bereaved reader. The user wrote *aku*; the app replied *Anda* and *Saudaraku*.

**Why it matters:** three of the brief's named bans at once — preachy/paternal, the AI speaking as a scholar, and claims the corpus does not carry — landing on the exact user PRODUCT.md was written for. And the app already proves it can do better: the retrieval lane says *"aku nggak menafsirkan sendiri"* in exactly the right register. The warm voice landed on the dry zakat lookup and the sermon voice landed on the dead mother.

**Fix:** (a) ~~pin the pronoun to the user's own register~~ — **WITHDRAWN 2026-08-15 by Erik. The formal `Anda` / `Saudaraku` register is INTENTIONAL: formality is respect in Indonesian religious speech, and the critique was applying a Western informality norm that does not transfer.** Do not "fix" the pronouns; a later pass that reads only the finding and not this line would degrade the product. (b) Extend the receipt rule already applied to the Prophet's words: every sentence making a claim about God, the unseen, or a ruling carries a reference or is cut. **This half stands** — it is about unattributed claims, not register, and the two were bundled in the original finding when they should not have been. (c) Move the AI disclaimer from the foot of the thread to a chip at the head of the composed paragraph, at the same size and weight as the `Terjemahan makna` chip — a label on the prose, not a footnote after it. **Stands.**

**Suggested command:** `$impeccable clarify`

### [P1] `#/surah/18` opens with 3,861px of untranslated Arabic

**What:** the `Pengantar Surah` block defaults to the `Arab` tab and stacks above the verses. First ayah begins at ~4,784px — **6.6 screens** on a 390×724 phone.

**Why it matters:** a first-timer taps Al-Kahfi to read Al-Kahfi and gets a wall of scholarly Arabic. This is the founding grievance of the product — *the official translation is a wall* — reproduced by the product, at its own reading surface. On 4G they pay to download it.

**Fix:** collapse the preface to a closed `<details>` below the cartouche, or move it behind the `ⓘ` it already sits next to. Verse 1 should be the first content under the cartouche. Don't default the tab to `Arab` when the Indonesian export is unavailable — say so on the tab instead.

**Suggested command:** `$impeccable layout`

### [P1] You built a shelf and you cannot find a book on it

**What:** `#/baca` is a wrapped ring showing one expanded card, opening on `113 · 114 · 001 · 002 · 003` — so the first thing anyone sees is Al-Falaq and An-Nas, which reads as an error. Prev/next arrows and a search box are the only routes to surah 36. The leftmost spine's Arabic (`الفلق`) is clipped mid-glyph and its Latin label renders as `l-Falaq`.

**Why it matters:** this is an **Operate** surface built as an **Experience** surface. Recognition is impossible — you must already know the name to find it.

**Fix:** keep the shelf as the default *view* and add a `Daftar` toggle beside it — `#/peta` already proves the pattern with `Kartu / Peta Tematik`. Fix the spine clipping. Cut the expanded card's empty upper region by ~40% and lift the title block into it.

**Suggested command:** `$impeccable adapt`

### [P2] Gold has escaped its three permitted places, onto the Arabic

**What:** in the dark register, every surah name on `#/baca` and every Arabic category label on `#/peta` renders flat gold; `#/hadis` renders the same class of Arabic in ink. The `MAKKIYAH` pill carries a gold outline — a gold hairline tracing an edge, banned in the same sentence that permits the tag.

**Why it matters:** the rule permits gold as hero *type gradient*, as ambient sky, and as the Makkiyah/Madaniyah *information* tag. Flat gold on 114 surah titles is gold as ornament on content — and because the ornamented thing is the Arabic script, it lands on the "calligraphy-as-decoration" anti-reference exactly. The stated test is *"if gold ornaments anything, it fails."*

**Fix:** return surah names and category labels to `--ink`/`--primary`, keep gold on the Makkiyah tag's fill only, drop the pill outline. If the shelf needs warmth, take it from the per-surah ground wash, not from the script.

**Suggested command:** `$impeccable polish`

## Persona Red Flags

**Casey (distracted mobile, one-handed, 4G — the modal user in this brief):**
- The composer prints its placeholder across the Arabic of 2:156 at 390px. Not a near-miss — the same band.
- `#/surah/18` costs her 6.6 screens of Arabic before verse 1, downloaded over 4G.
- `Hapus percakapan` is top-left at 390px, wrapping to two lines, next to **an empty green square where its icon should be** — the same broken glyph on `Kembali ke daftar surah` and the `#/hadis`, `#/fikih`, `#/peta` headers. A destructive, unconfirmed action with a missing icon, thumb-adjacent.
- `Kembali ke daftar surah` renders clipped as `embali ke daftar surah` at 390px — the only way out of a reading surface, truncated.
- `#/peta` zooms on scroll, so on touch she cannot scroll past it.
- Tap targets: `#mic` and `#send` drop to **29×29** at 390px; the nav rail collapses to **25×38**; `button.si-infobtn` is **18×18**. Thirty sub-44px targets on `/` alone.

**Sam (screen reader, keyboard, 200% zoom):**
- **41 tab stops from load to the composer textarea, and no skip link.** The sidebar, the `Ayat untukmu` card, the prayer widget, `Masuk`, `Pengaturan` and three `A` buttons all precede the app's primary input.
- The `#/peta` graph is keyboard-inaccessible — its own instruction is *drag, scroll, click*. 1,632 ayahs and 518 connectors, no keyboard equivalent, and nothing tells him the `Kartu` view is the alternative.
- Attribution is adjacent text, not an accessible name. The source lives in a sibling `.aod-src` with no `aria-label`; navigating by region or heading he can land on the translation without ever hearing who rendered it. DESIGN.md's own standard is not met.
- 3 of 38 Arabic text nodes carry neither `lang="ar"` nor `direction: rtl` — the other 35 do, which makes those three a bug rather than a policy.
- Focus rings could not be observed live (synthetic Tab does not drive native traversal, and the host lacked Accessibility permission). Statically, the whole primary nav, `a.qk-brand`, `#side-toggle`, `#settings-open`, `#send` and all `a.tema-card` match no custom focus rule — they fall back to Chrome's UA ring, since no global `outline:none` exists. **Unverified, not cleared.**

**Jordan (first-timer):**
- `#/baca` opens on Al-Falaq and An-Nas, leftmost clipped. Nothing signals it's a ring rather than a broken list.
- `Fikih` in the primary nav doesn't lead to fikih, and the doubled `Salat`/`Haid`/`Zakat` rows read as duplicate-data bugs rather than Bukhari-vs-Muslim.
- `Kembali` sits inside the `Kartu / Peta Tematik / Kembali` segmented control — he'll read it as a third view.
- **Clicking `Kirim` swallowed his message with no feedback**, at the moment the brief says is hardest: admitting what is wrong.

## Minor Observations

- Cognitive load: **6 of 8 checklist items fail.** Decision points over four options: the ayah-card action row (**8 controls**), `#/hadis` (**97 ungrouped kitab tiles**), the `#/peta` legend (**13 categories**, including three near-identical magentas — not colour-blind safe), and the top-right cluster (**5 controls, three of them the same `A` glyph**).
- The AI disclaimer is the smallest type on the page (~11.7px, greyed) and sits ~4,000px below the theology it qualifies. Principle 3 says attribution is the design, not the fine print; this is the fine print.
- Ibn Kathir is labelled honestly as untranslated and then rendered at full weight anyway — ~150 words of English in front of a grieving Indonesian reader. Honest, and still a wall.
- The thread's ayah card computes `rgba(208,190,151,0.94)` — a hardcoded tan — while `--surface` is `oklch(100% 0 0)`. It's the only warm object in the app, and it's the cream ground DESIGN.md repealed on 2026-08-10. A colour literal that reaches a paint property is invisible to the token audit that was supposed to enforce the retheme.
- `/favicon.ico` returns **200 `text/html`** (SPA fallback). A control probe confirmed `/assets/does-not-exist.js` also returns 200 HTML — a missing asset is indistinguishable from a present one by status alone.
- Light register has 5 contrast failures, all `--ink-3` at 4.02–4.13:1 — just under AA, on `span.qk-riwayat`, `#nur-clear`, `p.know-derivative`, `span.kbd`, `span.sf-handle-label`.
- 72 `transition:` declarations sit outside any `prefers-reduced-motion` block (statically counted, not verified live).
- `#/peta` graph labels collide in three places; white 13px sans on a starfield with no halo or plate.
- `#/hadis` girih appears only as a corner flourish per card rather than the plane-filling tile DESIGN.md specifies.

## Questions to Consider

1. **The retrieval lane says `aku nggak menafsirkan sendiri`. The synthesis lane says `Rasa sakit yang Anda rasakan`. Which one is New-Quranku?** You shipped both voices and gave the warmer one to the colder question.
2. **The disclaimer says the AI is not a scholar. The prose says what Allah wants.** One of those is not telling the truth to a person at 2am. Which are you willing to delete?
3. **If `Fikih` cannot yet be fikih, why is it in the primary navigation?** The notice inside it is more honest than the nav item leading to it. A promise kept by a disclaimer is still a broken promise.
4. **The rule says gold fails if it ornaments anything. 114 surah names are gold.** Either the rule quietly changed or the app is quietly breaking it — and the lesson already in DESIGN.md is that a colour literal reaching a paint property is invisible to the test meant to enforce it. Which is it, and where is the test?
5. **Your default theme setting ships an unreadable answer, and a reload hides it.** How many other defects are one refresh away from invisible?
