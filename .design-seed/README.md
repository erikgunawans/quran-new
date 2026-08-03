# New-QuranKu — Design Language

A Qur'an app in the QuranKu family: **light is the register, scripture owns the width, structure not filigree.** Use this to build **New-QuranKu v3 (the Agentic Edition)** on-brand. Style everything with the tokens in `styles.css` — do not invent a palette.

## Styling idiom: CSS custom properties (`var(--*)`)

There are no utility classes and no component framework. Style via the **tokens** in `styles.css` (`:root` light, `:root[data-theme="dark"]` dark). Read `styles.css` before styling — it is the source of truth. A handful of ready primitives exist: `.qk-card`, `.qk-action`, `.qk-chip`, `.qk-attribution`, `.qk-arabic`, `.qk-display`, `.qk-hero-gradient`.

**Token families (real names — use these, don't guess):**
- **Surface/ink:** `--bg` `--surface` `--surface-2` `--line` `--line-strong` · `--ink` `--ink-2` `--ink-3`
- **Brand (theme-invariant):** `--primary` (readable emerald: links/labels/icons) · `--action` + `--action-grad` (the ONE bright surface — send/CTA/the reader's own words/the mark) · `--forest` + `--forest-grad` (weight without shouting) · `--clay` (the only spark)
- **Type:** `--f-ar` (Amiri, scripture) · `--f-display` (Fraunces, only where the app addresses the reader) · `--f-ui` (Plus Jakarta Sans, quiet UI+prose) · scale `--step--1`…`--step-4` · `--ar-size` (user-scalable scripture)
- **Space/shape:** `--s-1`…`--s-9` (4pt) · `--r` 14 / `--r-lg` 16 / `--r-input` 18, pill on chips · `--sh-sm` `--sh` · `--ease` `--t`

## Non-negotiable laws (each is enforced by a test in the real app)

1. **Green is the ground, not a 10% accent.** It carries the surface.
2. **The gold law — gold is atmosphere/typography, NEVER on content.** Gold appears in exactly two places, both *ground*: the hero green→gold type gradient (`.qk-hero-gradient`, `#16a249 → #f0c851`) and the celestial background. **Never** a gold frame, rule, hairline, or edge on a card or on anything the reader reads. (One functional exception in the surah index: gold=Makkiyah / green=Madaniyah region tags.)
3. **Bright emerald = ACTIONS ONLY.** `--action` is reserved for what the reader can DO. It carries white text; its lightness is pinned by WCAG AA (4.94:1). Do not brighten it to "pop."
4. **Hairline over shadow.** Depth = hairline borders + defined shadows (≤10px blur). **Never** a border + a wide 40–70px shadow on the same element (the ghost-card tell). Radius 14–16, pill on chips; never over-round (22–26 is the tell).
5. **WCAG AA on every text pair, both light and dark.** Body ≥4.5:1, large ≥3:1.
6. **Scripture out-shouts the interface, never the reverse.** The Arabic carries the personality; the Latin gets out of its way. Arabic is `dir="rtl"`, `lang="ar"`, never `letter-spacing`.
7. **No devotional-app cliché** — no arabesque wallpaper, dome silhouettes, filigree, calligraphy-as-decoration, and no wellness-app calm (cream/sage/thin-serif/infinite-whitespace). Geometry is structure (an 8-point-star girih field), not a motif laid over a page.

## Signature components
- **Attribution chip** — every rendering names its source **inline, in the reading surface**, never in a tooltip. Attribution is design, not fine print (`.qk-attribution`).
- **Source stack** — the plural view: scholars named, each quoted, none ranked above another. The system attributes; it never arbitrates.
- **Depth disclosure** — a verse leads with the interpretive meaning alone; the literal companion + tafsir collapse into one *depth* toggle below. Depth on demand, never depth removed.
- **Empty states teach** — show real questions in real language, never "Ask me anything." **Skeletons, never spinners** in content.

## Motion
An ayat arrives, it does not perform. Fades (320ms), ease `cubic-bezier(0.16,1,0.3,1)`, no bounce. Content visible by default; reveals enhance, never gate. Respect `prefers-reduced-motion`.

## Build target: v3, the Agentic Edition
See `guidelines/v3-agentic-direction.md`. In one line: the app is **already chat-first** — v3 is **not a reskin** (celestial ground, green→gold, and the scholarly cards all stay). The design work is two cold-start fixes (seed the blank composer with real example questions; replace the therapy-prompt invitation) plus surfacing a tool-calling agent. Build with these tokens; keep the register light and the scripture dominant.
