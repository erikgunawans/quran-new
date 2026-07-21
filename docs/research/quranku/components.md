# QuranKu — Key Component Specs

> Reusable components extracted from the homepage 2026-07-21 via `getComputedStyle`.
> Exact computed values (not estimates). Use with `design-tokens.md`.

## 1. Fixed Header
```
position: fixed; top: 0; z-index: 50; height: 72px;
background: rgba(255,255,255,0.8);
backdrop-filter: blur(16px);
border-bottom: 1px solid rgba(220,224,229,0.8);   /* --border @ 80% */
box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);          /* shadow-sm */
```
Contents: logo PNG + wordmark (left) · nav links (center) · Masuk CTA (right).
Nav links: Inter 16px/400, color `#17181C`, → emerald on hover/active.

## 2. Masuk CTA (primary button)
```
background: #16A249;      /* --primary */
color: #FFFFFF;
border-radius: 10px;
padding: 0 12px;          /* height comes from parent row, ~36–40px */
font: Inter 14px / 500;
border: none;
```
The canonical solid-emerald pill-ish button. Reused for all primary actions.

## 3. Surah Card (the workhorse — ×114 in a 3-col grid)
```
/* outer */
background: #FFFFFF;              /* --card */
border: 1px solid #DCE0E5;       /* --border */
border-radius: 12px;             /* rounded-xl */
box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
height: 184px;
position: relative;

/* inner link */  a.block.p-5.sm:p-6  → padding: 24px
```
### Internal layout
- Top row: `flex items-center justify-between mb-3` (48px tall).
  - **Number badge**: `flex items-center justify-center`, **40px circle**,
    `background: rgba(22,162,73,0.1)` (emerald @10%), `color: #16A249`,
    `border-radius: 9999px`, Inter 14px/500. Holds the surah number.
  - **Name block** (`ml-3 sm:ml-4`):
    - `h3` surah name (Latin): **Poppins 18px/600**, `#17181C`, `transition-colors` → emerald on hover.
    - `p` meaning (e.g. "Pembukaan"): Inter 14px/400, `#6B7580`.
  - Right side of top row: Arabic surah name (Uthman Naskh) + Makkiyah/Madaniyah badge.
- Bottom: ayat count (e.g. "7 Ayat"), muted.

This is exactly the card New-Quranku's surah grid mirrors. The signature details:
**40px emerald-10% number circle + Poppins name + hairline border + 12px radius + 24px padding.**

## 4. Topic Chip (Jelajahi Topik / Akses Cepat)
```
background: #FFFFFF;
color: #17181C;
border: 1px solid #DCE0E5;
border-radius: 9999px;      /* full pill */
padding: 8px 16px;
font: Inter 14px / 500;
```
Outline pill, white fill. Hover lifts to emerald (per `transition-colors`).

## 5. Search bar (hero)
```
height: 44px;
placeholder: "Cari ayat atau terjemahan..."
```
Rounded input inside a 576px-max inner container, hairline border, emerald focus ring (`--ring #22C55E`).

---

## Signature "QuranKu look" in one line
White cards, **hairline `#DCE0E5` borders over near-zero shadow**, 12px radius, emerald `#16A249`
as the single loud color (badges at 10% tint, CTAs solid), Poppins for names/headings, Inter for
everything else, gold held back as a quiet secondary. New-Quranku already speaks most of this dialect.
