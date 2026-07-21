# QuranKu → New-Quranku — Adoption Audit

> Ran 2026-07-21 after the token extraction. Question: which "safe-to-align" items from
> `design-tokens.md` should be synced into `web/src`? **Answer: none — the app already implements
> all of them, and QuranKu's raw values would regress accessibility/identity.** No code changed.

## Item-by-item

| Item | QuranKu | New-Quranku (`web/src`) | Action |
|---|---|---|---|
| 40px emerald-10% number badge | `rgba(22,162,73,.1)` bg, `#16A249` text, 40px round | `read.css:160` `.srow-n` / `:258` `.trow-n` — 40px, `9999px`, `--primary-wash` bg, `--primary` text, hover→solid emerald | **Already exact** |
| Card radius 12px | `rounded-xl` = 12px | `read.css:152` `.srow` `border-radius:12px` | **Already there** |
| White card surface | `--card: #FFFFFF` | `--surface: oklch(1 0 0)` | **Already there** |
| Hairline-over-shadow | `1px #DCE0E5` + `shadow-sm` | `--line` borders + `--sh`/`--sh-sm` throughout | **Already the elevation model** |
| Outline-pill chips | white pill, 1px border, 9999px | `.seed` / `.chip` / `.lens` / `.srow-rev` all 999px outline pills | **Already there** |
| Emerald primary value | `#16A249` (`142 76% 36%`) | `--action` oklch(0.532 0.112 163), `--primary` oklch(0.416 0.083 165) | **Keep ours — see below** |
| Border/muted hue | cool gray `#DCE0E5` | green-tinted `--line` oklch(0.927 0.010 165) | **Keep ours — celestial identity** |
| Container width | 1280px | 46rem prose / 1120 landing / 1680 wide (measure system) | **Keep ours — more principled** |

## Why the color/width items are NOT safe to align

1. **Accessibility.** QuranKu's `#16A249` with white text ≈ **3.3:1** — fails WCAG AA (needs 4.5:1
   for normal text). New-Quranku's `--action` is deliberately darkened to **4.94:1**, and `--primary`
   sits at **8.2:1** because it carries body text. Adopting QuranKu's brighter emerald would flip
   every white-on-emerald surface (send button, CTAs, the mark, crisis CTA) from AA-pass to AA-fail.
   These values are pinned by the contrast suite, not by taste.
2. **Identity.** New-Quranku's borders/washes are green-tinted OKLCH to sit inside the celestial
   background. QuranKu's cool grays would fight that ground.
3. **Layout.** New-Quranku's widths are a reading-**measure** system (46rem = readable prose width),
   not a single content max. QuranKu's flat 1280px doesn't map onto a scripture-first column.

## Conclusion
New-Quranku already speaks QuranKu's visual dialect (it was built following it — see `read.css:127`),
then hardened it for accessibility and the celestial identity. The extraction is valuable as a
**parity reference**, not a change list. If a *specific* QuranKu detail is wanted (a particular
spacing, the verse-number ornament medallion, a card-density tweak), name it and it can be evaluated
on its own — but a blanket token sync would move the app backwards.
