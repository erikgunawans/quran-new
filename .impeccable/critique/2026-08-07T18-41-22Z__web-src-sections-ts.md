---
target: Hadis + Fikih sections (web/src/sections.ts)
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-08-07T18-41-22Z
slug: web-src-sections-ts
---
# Critique — New-QuranKu Hadis & Fikih sections (product register)

Design Health: 23/40 (mid-range). Independence: clean (Assessment A separate agent; Assessment B detector+browser).

## Anti-patterns verdict
Mostly not AI-looking: clean radius (16px), small shadows (no ghost-card), no glass, no eyebrows, RTL+esc correct. BUT breaks two of the app's own written laws and reads plainer than .tematik-*.
- Detector: 1 new hit — .hadith-note border-left:3px (side-stripe); rest (gradient-text, layout-transition) pre-existing app code.
- Contrast (live, both themes): ALL pass AA — fikih-meta 5.03, grade 8.39, crumb 5.15, scripture 15.56. Add new pairings to contrast.test.ts.

## Priority issues
- [P1] `animation: qkin ... both` unguarded by reduced-motion on .hadith-kitab/.hadith-card/.fikih-card. DESIGN.md L140: "forwards, never both". Can strand Arabic at opacity:0 on backgrounded mid-render (mid-range Android). No prefers-reduced-motion alt. Fix: both->forwards + reduced-motion guard.
- [P1] .hadith-ar clamp overrides --ar-size (reader A/A/A control, main.ts:868). Breaks "Adjustable Arabic type" hard requirement on the surface with the most Arabic. Also .hadith-kitab-ar/.hadith-bab/.fikih-kitab-ar fixed-px. Fix: base on var(--ar-size).
- [P1] Arabic-only Hadis wall re-inflicts founding wound; only action is external English sunnah.com link. Transliteration needs no license (app already transliterates 2:156). Fix: add transliteration or gate drilldown behind explicit "teks Arab saja".
- [P2] Hadis index ~150-kitab flat wall: Hick's-law overwhelm, no search/filter/jump, plain-text loader not skeleton. Fix: tabs/accordion per collection, filter, skeleton, lazy-render.
- [P2] qk-hero-gradient (green->gold) on Amiri Arabic kitab title + error title. DESIGN bans gold-on-content/calligraphy-as-decoration; background-clip:text unreliable over diacritics. Fix: solid --ink/--primary for Arabic + error titles; keep gradient on Latin hero titles only.
- [P3] .hadith-note side-stripe redundant with full border+tint — remove.
- [P3] new AA pairings pass live but not in contrast.test.ts — add them.

## What's working
Attribution done right (grade chip + inline sunnah.com link in reading surface). Fikih data model (compilers' own kitab, no authored ruling, byte-exact Arabic from index). Contrast + RTL hygiene clean; scripture out-shouts chrome 15.56:1.

## Persona red flags
Rani (19, no Arabic): Hadis+Fikih -> Arabic wall -> exit to English. Budi (4G): qkin both strands cards blank mid-render; text loader reads broken. Sri (low-vision, reduced-motion): can't enlarge hadith Arabic; card fade no reduced-motion path.
