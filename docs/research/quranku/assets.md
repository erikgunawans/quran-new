# QuranKu — Asset Inventory

> Enumerated from the homepage 2026-07-21. QuranKu is asset-light: nearly everything is CSS +
> inline SVG. Only two raster assets, both on the Hostinger Horizons CDN.

## Raster images (2 unique)
| Asset | URL | Natural size | Use |
|---|---|---|---|
| **Logo** "QuranKu App" | `https://horizons-cdn.hostinger.com/1b9142fa-b9f6-4f76-96be-4e44304f2bbe/e5f5694cce7f0e30f98a65074412fbba.png` | 500×500 | header logo + favicon + apple-touch-icon (all point here) |
| **Verse Number Ornament** | `https://horizons-cdn.hostinger.com/1b9142fa-b9f6-4f76-96be-4e44304f2bbe/8eed20ecb23fc0fed1156f5c9f9ca89f.png` | 87×83 | decorative frame behind ayat numbers (mushaf-style medallion) |

## Icons
- **280 inline `<svg>`** on the homepage — nav icons, chevrons, badges, per-surah controls, etc.
  These are inline (likely lucide-react / a shadcn icon set), not sprite files. If replicating,
  match to an existing icon library rather than downloading; New-Quranku already has its own set.

## Favicons / meta
All favicon + apple-touch-icon `<link>`s resolve to the **same 500×500 logo PNG** above.
No dedicated `.ico`, no webmanifest icons, no OG image observed on the homepage `<head>`.

## Fonts
Self-hosted / bundled (no Google Fonts `<link>`): **Poppins**, **Inter**, and the Arabic stack
(**Uthman Naskh** primary → Uthman Hafs, Noto Naskh Arabic, Scheherazade New, Lateef, Amiri).

## Notes for New-Quranku
- The two PNGs are **QuranKu's own branding** — do NOT copy the logo into New-Quranku (it's their mark).
- The **verse-number ornament** medallion is a design *idea* worth noting (New-Quranku already has its
  khātam/girih identity — no need to lift QuranKu's asset).
- Nothing here needs downloading for a token/design extraction; the value is in the CSS, not the assets.
