# QuranKu Design Extraction

> Design-token + structure extraction of **`https://quran.tarjamahtafsiriyah.com/`** (the QuranKu
> homepage — the site New-Quranku already loosely follows), captured **2026-07-21** via `/clone-website`
> run in **extract-into-app** mode. DOM-level extraction (Chrome was minimized → no reference screenshots
> or live responsive sweep; those gaps are flagged in `PAGE_TOPOLOGY.md`).

## Files
| File | What's in it |
|---|---|
| `design-tokens.md` | Full color/font/radius/spacing token system (HSL + hex), type scale, layout constants, **adoption notes + conflicts** |
| `PAGE_TOPOLOGY.md` | Homepage section order, interaction model, nav, responsive (inferred) |
| `components.md` | Exact computed specs for header, CTA, surah card, topic chip, search |
| `assets.md` | Asset inventory (2 PNGs, 280 inline SVGs, fonts) |

## Headline findings
- QuranKu is **shadcn/ui + Tailwind**, HSL tokens. **Emerald `#16A249` primary + gold `#EFC851` secondary + ink `#17181C`** — the exact palette New-Quranku already shares.
- Display face **Poppins**, UI face **Inter**, Arabic **Uthman Naskh**.
- Look = white cards, **hairline `#DCE0E5` borders over near-zero shadow**, 12px radius, emerald as the one loud color (40px emerald-10% number badges, solid-emerald CTAs), gold held quiet.
- Homepage is a **static single-column scroll** (fixed 72px header, hero+search, topic pills, 114-card surah grid). No scroll-snap / scroll-driven tabs.

## Two conflicts before "adopt precisely" (Erik's call — not applied)
1. **Gold** — QuranKu uses gold as a free secondary accent; New-Quranku's **gold law** is gold-as-ground-only. Don't lift the *usage*.
2. **Fonts** — QuranKu is Poppins/Inter; New-Quranku deliberately keeps **Fraunces**. Font swap is a separate identity decision.

## Safe-to-align now (no identity conflict)
Emerald/ink/border/muted values · 12px card radius · white card surface · **hairline-over-shadow elevation** · 1280px container · **40px emerald-10% number badges** · **outline-pill topic chips** · Poppins-weight hierarchy for names (if fonts kept, apply the *weights* not the *face*).

## Status
Extraction only — **no code changed** in the New-Quranku app. Next step is Erik's: pick which
safe-to-align items to sync into `web/src/` and resolve the two conflicts.
