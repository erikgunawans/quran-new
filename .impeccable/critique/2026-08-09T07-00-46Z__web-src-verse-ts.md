---
target: the answer surface
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-09T07-00-46Z
slug: web-src-verse-ts
---
Method: dual-agent (A: ada97d0934fd6c825 · B: a8030eab5af012a8b)

Target: `web/src/verse.ts` — the answer surface (`#thread`, `.msg.me`, `.qk-trace`, `.said`, the `.verse` card, `.depth`, `.reader-note`, and the docked composer over it). Live at https://new-quranku.axiara.ai/, CSS `index-Cx4cBCn8.css`, Worker `1a134110`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Sidebar reads "Percakapanmu akan muncul di sini" while a conversation is on screen; clicks in the bottom 74px are silent no-ops. |
| 2 | Match System / Real World | 2 | The trace shows `cari_ayat("aku lagi capek banget, rasanya pengen n…")` and the stack prints "tier 1" / "tier 2" — machine vocabulary at the emotional entry. |
| 3 | User Control and Freedom | 3 | A−/A/A+ Arabic scaling, lens re-sort, per-verse copy/share/image. "Hapus percakapan" is irreversible with no confirm. |
| 4 | Consistency and Standards | 2 | `button.chip { font: inherit }` breaks the chip's own spec (16px/400 vs 0.7rem/600); companion chip's border resolves to `rgba(0,0,0,0)` while `.chip.lead` keeps its pill. Same component, two appearances. |
| 5 | Error Prevention | 2 | The 74px full-width `pointer-events: auto` composer strip turns every click in it into a silent no-op, including "Masuk". `verse.ts:135` can emit a primary without a literal, unguarded. |
| 6 | Recognition Rather Than Recall | 2 | "tier 1"/"tier 2" is unglossed internal taxonomy; the only cue that `TERJEMAHAN MAKNA` is pressable is a 14px `?` at 0.7 opacity. |
| 7 | Flexibility and Efficiency | 3 | Independent Arabic scaling, scholar re-ordering, flagged verses opening by default, restore-from-decision persistence. Genuinely strong. |
| 8 | Aesthetic and Minimalist | 2 | Every card is 954px holding a 680px text column — a 251px hollow gutter on the right of each. The trace adds 145px of chrome above every answer. |
| 9 | Error Recovery | 3 | `main.ts:186-200` silence/no-such-ayah copy is honest and offers concrete recovery. Source-verified, not rendered live. |
| 10 | Help and Documentation | 3 | The chip-as-explainer is genuinely excellent inline help; the tier labels and function-call trace get no equivalent. |
| **Total** | | **24/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment.** Strip the two components DESIGN.md nominates as signature and what remains is 2026 house-style AI chat: a glass card with `blur(18px) saturate(150%)`, a right-aligned gradient user bubble, a frosted docked composer, and a step-trace with green dots that reads exactly like Perplexity's. The authored parts are real and good — the `TERJEMAHAN MAKNA` / `oleh Ustadz Muhammad Thalib` pairing, a depth pill that names both its payloads in one label, the emerald khātam ayah-star, and the chip-as-explainer where the confusing label *is* the pressable thing (`verse.ts:98-108`).

But the component the doc calls "the signature component" is currently rendering **by accident**: `button.chip { font: inherit }` at `styles.css:1277` overrides `.chip`'s `font-size: 0.7rem; font-weight: 600` at `styles.css:704`, and the chip measures **16px / weight 400** — browser default. Meanwhile the attributed human is 12.32px. The two things that make this card not-generic are (a) mis-rendered and (b) smaller than the taxonomy label above them.

**Call: partly authored.** A generic RAG product could ship ~70% of this card verbatim.

**Deterministic scan.** `detect.mjs --json web/index.html web/src/` → exit 2, 9 findings. Seven are false positives for this surface (`#read`-only, `[data-landing]`-only, or the sidebar). One is relevant: `layout-transition` at `shell.css:362`, the docked composer's `transition: padding-left`.

**Where the two assessments agree independently:** the composer occlusion (A measured 58 of 77px of 12:110's Arabic covered; B measured a permanent 61px band plus 12.6px of transparent-but-click-capturing dock, with `elementFromPoint` returning `div.composer` over verse text); the 16px chip; and the type inventory.

**Visual overlays: none.** B did not attempt injection (prior run established HTTPS mixed-content blocks it and eval payloads ≥8000 chars time out). The CLI scan plus direct measurement is the fallback.

## Overall Impression

Contrast is *not* the problem here — and that is worth saying first, because it was the story on the landing. B composited the actual painted stack (panel gradient + gold radial + every translucent ancestor) for 17 text roles in both themes: **zero failures**, lowest 4.94:1. `contrast.test.ts` is doing its job.

The problems on this surface are **size, hierarchy, and one layout bug that inverts the product's first principle**. The card knows what it wants to be — the depth disclosure is textbook, the prose is the brand working — but the conversation's UI register has leaked into the reading island. The translation is 15.2px; the scholars' own words are 12.32px, which is 11.1 device px after the `.9` zoom, on a mid-range-Android product.

## What's Working

1. **The depth disclosure delivers on its contract exactly.** One 13.5px pill naming both payloads; inside, the Kemenag literal renders at the *same* 15.2px as the interpretive primary with the full institutional name — not shrunk, not apologised for. That is "depth on demand, never depth removed" actually built. `verse.ts:126-144`.
2. **The composed prose is the brand, working.** It matches feeling before offering scripture and explicitly gives permission to do nothing — *"Nggak apa-apa kalau sekarang kamu cuma mau diem dulu."* Nothing preachy, paternal, or guilt-shaped. The hardest thing in the product, and it is right.
3. **The literal-companion invariant holds.** Both rendered verses carry a `.reading.companion` (631 and 304 chars). The egress rule is real on this surface, not aspirational.

## Priority Issues

### [P0] The docked composer covers the scripture, and its transparent strip swallows clicks

- **What**: `#composer-bar` is `position: fixed; z-index: 10; pointer-events: auto`, **74px tall × full viewport width**. Reservation exists only on `.app` (`shell.css:234`, `padding-bottom: clamp(120px,13vh,160px)`), which clears the *end* of the scroll but nothing mid-scroll. `.qk-panel-body` has `padding-bottom: 0` and `scroll-padding-bottom: auto`.
- **Measured**: at `scrollTop 444`, 12:110's `.ar` [614.2→691.2] sits under a glass band [646.4→707.4] — **44.8px of the Arabic line rendered behind `blur(28px)`**. At `scrollTop 0`, 2:286's primary translation is covered by 54.2px. `elementFromPoint` inside that text returns `div.composer`, not the verse. A further 6.2px (707.4→713.6) is fully transparent yet still intercepts pointer events; the sidebar's "Masuk" at (92, 684) also resolves to `div.composer`.
- **Why it matters**: this inverts PRODUCT.md Design Principle 1 — *"the scripture out-shouts the interface, never the reverse."* The interface is literally on top of the Qur'an. It also silently breaks any control that scrolls into the band.
- **Fix**: `#composer-bar { pointer-events: none }` with `#composer-bar form { pointer-events: auto }` (kills the dead strip); add `.qk-panel-body { scroll-padding-bottom: 96px }`; and give the band an opaque `--bg` backing or a mask fade above the form so no glyph is ever read through glass.
- **Suggested command**: `$impeccable layout`

### [P1] The signature component is unstyled — and the type-reduction comment claiming otherwise is false

- **What**: `styles.css:1277` — `button.chip { font: inherit; … }` — is (0,1,1) and later in the file than `.chip` at `styles.css:704`. The `font` shorthand resets size *and* weight. Measured: **16.00px / 400**, against a design intent of 11.2px / 600. It is now **larger than the 15.2px translation it labels** and the second-largest Latin on the card. The same block's `border: 1px solid transparent` is why the companion chip measures `borderColor: rgba(0,0,0,0)` while `.chip.lead` survives at (0,2,0).
- **Why it matters**: `.chip` reads a hard `0.7rem`, not a `--step-*` token, so the 2026-08-09 reduction could never reach it — and the comment I wrote at `styles.css:536` asserting the token block covers "`.by`, `.surah-name`, `.reader-note`, `.chip`" is **wrong about `.chip`**. A law document and a code comment both asserting a mechanism nobody measured is exactly how that pass shipped incomplete.
- **Fix**: replace `font: inherit` with `font-family: inherit; line-height: 1.2;`; change `.chip`'s `font-size: 0.7rem` to `var(--step--2)` so the surface scale reaches it; correct the comment at `styles.css:536`.
- **Suggested command**: `$impeccable polish`

### [P2] Attribution is fine print; the filing category is the design. Invert them.

- **What**: in one `.who` row — category label `TERJEMAHAN MAKNA` at **16px** uppercase with letter-spacing in an emerald pill (8.82:1), versus the credited human `oleh **Ustadz Muhammad Thalib**` at **12.32px** (11.1 device px). In the tafsir stack the scholar's name *and* his prose are both 12.32px.
- **Why it matters**: PRODUCT.md's third principle — *"Attribution is the design, not the fine print"* — is a claim about **who said it**, not about which bucket it belongs to. The surface currently reads the category loudly and the person quietly.
- **Fix**: `.by b` → 14px/600 in `--ink-2`; `.chip` → 11px, `text-transform: none`, no letter-spacing. Keep the `?` affordance. The name should be the second-loudest Latin in the card.
- **Suggested command**: `$impeccable typeset`

### [P2] The tool trace echoes the reader's pain back in function-call syntax, before any comfort

- **What**: `main.ts:89-107` + `:210` render `.qk-trace` as the **first** element of every answer — 558×145px, above the prose. Step 2 reads `cari_ayat("aku lagi capek banget, rasanya pengen n…") · 2 ayat`.
- **Why it matters**: for the 2am arrival, the first thing the app returns is her own sentence, truncated mid-word, wrapped in machine syntax — and it duplicates the question already visible in `.msg.me` directly above.
- **Fix**: collapse the settled trace to one line of human language (*"Dicari dari 2 ayat, tafsir 3 ulama"*) with the steps behind a `<details>`; never interpolate the reader's raw sentence into a step label (`main.ts:100-101`). Keep the pulsing multi-step version for the *pending* skeleton where it earns its keep.
- **Suggested command**: `$impeccable clarify`

### [P3] One column, three measures — DESIGN.md's 46rem law is unenforced

- **What**: `getComputedStyle('.thread').maxWidth` = **`none`**. Right edges in one column: trace 558px, `.said` 774px, `.verse` **954px**. Inside the 954px card the text column is 680px, leaving a **251px hollow gutter** on the right of every card. DESIGN.md § Layout: *"46rem is a MEASURE … the thread and the reading surface never exceed it"* — 46rem = 736px.
- **Fix**: `.qk-panel-body .thread { max-width: 46rem; margin-inline: auto }`, and add a test so the measure becomes enforced the way the colour rules already are.
- **Suggested command**: `$impeccable layout`

### [P3] Scholars are ranked — twice

- **What**: `styles.css:1181` gives `.scholar.foreign .txt` `--ink-3` (6.23:1) against `--ink-2` (9.58:1) for the others; and `tafsir.ts:116-120` prints *"Classical (14th c.) · tier 1"* / *"Modern (20th c.) · tier 2"*.
- **Why it matters**: DESIGN.md — *"none ranked above another in the visual hierarchy. The system attributes; it never arbitrates."* A printed tier is arbitration in text; a dimmer ink is arbitration in the hierarchy.
- **Fix**: drop `tier N` from the reader-facing label (keep the era), give `.scholar.foreign .txt` the same `--ink-2`. The `lang-warn` note already handles the honesty.
- **Suggested command**: `$impeccable clarify`

## Persona Red Flags

**The 2am griever (PRODUCT.md user state 1).** She types *"aku lagi capek banget, rasanya pengen nyerah"*; the first element returned is the trace quoting it back truncated mid-word in function syntax. She scrolls to read the verse and the frosted composer covers 44.8px of the Arabic. Two of the three worst moments on this surface land on exactly the person the product was built for.

**The locked-out reader (user state 2).** The whole thesis is the makna/harfiah pairing, and the two are rendered *unequal*: `.chip.lead` is a bordered emerald pill; the companion `.chip` measures `borderColor: rgba(0,0,0,0)` and transparent background — the same component, demoted. The comparison the product exists to make is drawn as a hierarchy.

**Sam (screen reader / low vision).** **Zero headings on the entire page** — `h1`–`h6` count is 0 inside `#thread` and 0 document-wide. Both `.verse` elements are `<article>` with a real `<header>` but **no accessible name**, so they are indistinguishable in a landmark list. `.qk-trace` is `role="group" aria-label="Langkah New-Quranku"` and reads out `cari_ayat("aku lagi capek bang…")` unglossed. `.tier` is announced as "tier 1". The Arabic is reader-scalable — genuinely good — but there is no equivalent control for the tafsir, which is the smallest text in the stack. The composer textarea still has `outline-style: none` on focus (carried over from the landing critique, still open), and every other focus ring measures 1.11px where WCAG 2.2 wants ≥2px.

**Casey (interrupted, mid-range Android).** Restore works well — the thread rebuilt from `newquranku:thread` with `animate=false`, exactly as `thread.ts` promises. But **every interactive control in the answer surface is under 44px vertically** — measured hit areas 27.2–36.6px (`Salin` 30.5, `Semua` 27.9, the depth summary 36.6, "Hapus percakapan" 27.2). The `::after` expanders that rescue the composer's send button (32.4 → 49.2) are absent here; answer-surface controls gain 0.2–0.9px. And the composer's `blur(28px) saturate(150%)` composites over the card's own `blur(18px) saturate(150%)` on every scroll frame — two nested backdrop filters over scrolling content, flagged as the likely jank source, not measured on real hardware.

## Minor Observations

- `qkin` on `.verse` (`shell.css`) is declared outside any media query and **still runs at full strength under reduced motion** — an 8px translate + fade on every answer card. `markIn` and `qkpulse` are correctly gated; `fade` on `.ar` is clamped to 1ms. Derived from the deployed stylesheet's media structure, not from a reduce-mode render (neither driver exposed the emulation).
- `.why` parks a full sentence at the far right of `.verse-head`, ~900px from the ref chip it shares a baseline with — and in the card measured it duplicates the translation's opening line almost verbatim.
- `.reader-note` — the app's own honesty statement — is the smallest (12.32px) and dimmest (6.23:1) text on the surface. In a product whose third principle bans fine print, this is fine print by design.
- Eight distinct rendered Latin sizes on one card: 10.88 / 11 / 12.32 / 13.5 / 15.2 / 16 / 18.5 / 23.12.
- `.msg.me` is a bare `<div>` — no role, nothing marking it as the user's own utterance.
- CTA reads "Baca lanjutan Al-Baqara →"; Indonesian convention is *Al-Baqarah*.
- `verse.ts:135` — `if (!v.companion && !tafsir) return "";` — would silently emit a primary-only card if data ever lacked a companion. The invariant has a data guarantee and no render-time guard.
- The composer's border is `rgba(150,220,185,0.16)` in **both** themes — it does not adapt.
- DESIGN.md's gold ban is now three nested revisions spending ~600 words to say "no ornament on content". Worth re-cutting to one paragraph with the amendments in a changelog.

## Questions to Consider

1. Who is `cari_ayat("aku lagi capek banget, rasanya pengen n…")` actually for — the grieving reader, or the demo? If the trace exists to prove the app doesn't fabricate, the reader-note already says so in Indonesian. If it exists to look capable, it is buying credibility with someone else's pain.
2. DESIGN.md names the attribution chip "the signature component," and it has rendered at browser-default 16px/400 for as long as `button.chip { font: inherit }` has existed — through a full type-reduction pass, unnoticed. In what sense is it the signature?
3. The doctrine says the system never arbitrates, but it prints "tier 1" and "tier 2" beside scholars' names and dims the ones it hasn't translated. Which is the real policy — unranked plurality, or a ranked corpus wearing an unranked slogan?
4. The 2026-08-09 amendment argues a cited verse is "evidence supporting a sentence." But the reader didn't arrive with a claim to support — she arrived carrying something. If the verse is the peak of the journey, why is it now 22% of its own card, and the one thing the interface is permitted to cover?
