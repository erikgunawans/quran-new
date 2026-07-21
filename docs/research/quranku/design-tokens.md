# QuranKu — Design Tokens

> Extracted from `https://quran.tarjamahtafsiriyah.com/` (homepage) on 2026-07-21 via
> `getComputedStyle` on `:root`. Values are verbatim from the live site. QuranKu is a
> **shadcn/ui + Tailwind** app; tokens are stored as HSL triples (`H S% L%`) consumed via
> `hsl(var(--token))`. Hex equivalents added for reference.

## Color tokens (light theme — `html.light`, the only theme shipped on the homepage)

| Token | HSL (raw) | Hex ≈ | Role |
|---|---|---|---|
| `--background` | `210 20% 98%` | `#F7F9FA` | page background (cool near-white) |
| `--foreground` | `224 10% 10%` | `#17181C` | primary ink |
| `--card` | `0 0% 100%` | `#FFFFFF` | card surface |
| `--card-foreground` | `224 10% 10%` | `#17181C` | text on cards |
| `--popover` | `0 0% 100%` | `#FFFFFF` | popover surface |
| `--popover-foreground` | `224 10% 10%` | `#17181C` | popover text |
| `--primary` | `142 76% 36%` | `#16A249` | **emerald** — brand, CTAs, active states, numbers |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` | text on emerald |
| `--secondary` | `45 84% 63%` | `#EFC851` | **gold/amber** — secondary accent |
| `--secondary-foreground` | `142 76% 15%` | `#0A4021` | text on gold (dark emerald) |
| `--muted` | `210 16% 93%` | `#E9ECF0` | muted surface |
| `--muted-foreground` | `210 9% 46%` | `#6B7580` | muted/secondary text |
| `--accent` | `210 16% 93%` | `#E9ECF0` | accent surface (= muted) |
| `--accent-foreground` | `224 10% 10%` | `#17181C` | accent text |
| `--border` | `210 15% 88%` | `#DCE0E5` | hairline borders (cards, header, chips) |
| `--input` | `210 15% 88%` | `#DCE0E5` | input borders |
| `--ring` | `142 76% 46%` | `#22C55E` | focus ring (brighter emerald) |
| `--destructive` | `0 84% 60%` | `#EF4444` | error/red |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` | text on red |

### Brand gradient (emerald → teal → cyan)
| Token | Value |
|---|---|
| `--gradient-from` | `#34D399` (emerald-400) |
| `--gradient-via` | `#14B8A6` (teal-500) |
| `--gradient-to` | `#0891B2` (cyan-600) |

Used for hero/brand flourishes. A cool emerald→cyan sweep, not a warm one.

### Admin theme (separate namespace, not used on the public homepage — recorded for completeness)
`--admin-primary: 120 60% 24%`, `--admin-secondary: 45 74% 53%`, `--admin-sidebar: 224 15% 12%`,
`--admin-background: 210 20% 98%`. A darker, more saturated green + darker gold for the admin panel.

## Radius
| Token | Value | Notes |
|---|---|---|
| `--radius` | `0.75rem` (12px) | base; cards use `rounded-xl` = 12px |
| pills | `9999px` | topic chips, number badges (fully round) |
| buttons | `10px` | Masuk CTA |

## Typography

| Family | Where | Notes |
|---|---|---|
| **Poppins** | all headings (`h1`–`h3`), surah names | 600–800 weight; the display face |
| **Inter** | body, nav, buttons, inputs, subtitles | 400–500; the UI face |
| **Uthman Naskh** (`--arabic-font-family`) | Arabic ayat / surah script | fallback stack: Uthman Hafs → Noto Naskh Arabic → Scheherazade New → Lateef → Amiri → serif |

Fonts are self-hosted / bundled (no Google Fonts `<link>` on the page).

### Type scale (measured computed values)
| Element | Family | Size | Weight | Line-height | Tracking | Color |
|---|---|---|---|---|---|---|
| Hero `h1` | Poppins | 60px | 800 | 60px | −1.5px | `#17181C` |
| Section `h2` ("Akses Cepat") | Poppins | 20px | 700 | 28px | normal | `#17181C` |
| Card title `h3` ("Al-Fatihah") | Poppins | 18px | 600 | 28px | normal | `#17181C` |
| Nav links | Inter | 16px | 400 | 24px | normal | `#17181C` |
| Button / label | Inter | 14px | 500 | 20px | normal | `#6B7580` |
| Card subtitle ("Pembukaan") | Inter | 14px | 400 | 20px | normal | `#6B7580` |
| Body / input | Inter | 14px | 400 | 20px | normal | `#17181C` |

## Layout constants
| Constant | Value |
|---|---|
| Content container max-width | **1280px** (`max-w-7xl`); inner prose/search blocks 896px & 576px |
| Sidebar width token | `--sidebar-width: 18rem` |
| Header height | 72px, `position: fixed`, `z-index: 50` |

## Elevation
- Standard card / header shadow: `0 1px 2px 0 rgba(0,0,0,0.05)` (Tailwind `shadow-sm`). Very restrained — the design leans on hairline borders (`#DCE0E5`), not shadow.

---

## Adoption notes for New-Quranku (READ before applying)

New-Quranku already shares QuranKu's **emerald primary** and **ink foreground** — those map 1:1
and are safe to align exactly (`#16A249` primary, `#17181C` ink, `#DCE0E5` borders, `#6B7580` muted).

Two tokens conflict with New-Quranku's established identity — **do not apply silently**:

1. **Gold.** QuranKu uses gold as a full `--secondary` accent (`#EFC851`, used freely). New-Quranku's
   **gold law** is gold-as-ground-only. Adopting QuranKu's gold usage verbatim would violate it.
   → Keep New-Quranku's gold law; only borrow the *hue* if wanted, not the *usage*.
2. **Fonts.** QuranKu is Poppins + Inter. New-Quranku deliberately uses **Fraunces** (kept per prior
   decision). Adopting Poppins/Inter would drop New-Quranku's display voice.
   → Font swap is a separate identity decision, not a token sync.

Safe-to-align now: emerald, ink, borders, muted, radius (12px), card surface (white), hairline-over-shadow
elevation, 1280px container, 40px emerald-tint number badges, outline-pill chips.
