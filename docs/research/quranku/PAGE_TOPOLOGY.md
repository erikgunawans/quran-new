# QuranKu — Homepage Topology

> Structure of `https://quran.tarjamahtafsiriyah.com/` top-to-bottom, extracted 2026-07-21.
> Single-column scroll page, 1280px content container, fixed header overlay.

## Section order (by scroll Y)

| # | Section | Y (px) | Notes |
|---|---|---|---|
| 0 | **Fixed header** | 0 | 72px tall, `position: fixed`, `z-50`, white/80% + `backdrop-blur(16px)`, hairline bottom border. Overlays all flow content. |
| 1 | **Hero** | 72 | `h1` "Al-Qur'an Tarjamah Tafsiriyah" (Poppins 60/800/−1.5px) + tagline + big search bar. |
| 2 | **Navigasi Al-Qur'an** | ~600 | Left: quick-access panel (Indeks Tematik, Yasin, Al-Waqi'ah, Al-Mulk, Al-Kahfi, Ar-Rahman, Ayat Kursi). Right/inline: live prayer-times clock ("Selasa, 21 Juli / 04:28:58 / Mencari…") + "Populer". |
| 3 | **Jelajahi Topik** | 1087 | "Explore Topics" — outline-pill chips (Keluarga, Allah SWT, Rahasia Kejiwaan Manusia, Karakteristik Negara Bersyari'ah, Membangun Pribadi Shalih…). |
| 4 | **Topik Al-Qur'an Hari Ini** | 1252 | "Today's topic" card block (h≈354px). |
| 5 | **Daftar Surah** | 1618 | "Explore 114 surahs." Filter row (Surah / Juz / Urutan Wahyu · Semua · Nomor Surah ASC) then the grid. |
| 5a | **Surah grid** | 1738 | **114 cards**, 3-column grid, each `bg-card rounded-xl`, 184px tall. See `components.md`. |
| 6 | **Footer** | ~9750 | (bottom of page) |

## Interaction model
- **Static / flow** page — no scroll-snap, no scroll-driven tab switching detected on the homepage.
- **Header**: `position: fixed` from load (not a scroll-triggered transform); already translucent+blurred at Y=0.
- **Live regions**: prayer-times clock ticks (JS interval); "Topik Hari Ini" and "Populer" load async ("Memuat…").
- **Surah grid filters** (Surah/Juz/Urutan Wahyu, sort) are click-driven re-sorts/re-groups of the same 114 cards.
- **Hover**: surah card title has `transition-colors` (title → emerald on hover); chips lift on hover.

## Nav (header)
Logo (QuranKu PNG) + wordmark · **Beranda · Mushaf · Audio · Bookmark · Tematik** · **Masuk** (solid emerald CTA).
Nav links Inter 16/400 ink; active/hover → emerald. This is the panel New-Quranku's nav pill already follows.

## Responsive (inferred from Tailwind classes; not width-tested — Chrome was minimized)
- Card padding `p-5 sm:p-6` (20→24px), title `text-base sm:text-lg` (16→18px), badge margin `ml-3 sm:ml-4`.
- Surah grid: 3-col desktop → collapses via Tailwind grid utilities at `sm`/`md` (stack to 1–2 col on mobile).
- **Gap:** full-width responsive sweep (1440/768/390) was NOT run — the OS window was minimized so no live
  viewport resize. Breakpoints above are read from class names, not observed. Re-run with a restored window
  to confirm exact column counts per breakpoint before relying on them.
