# Design

**Nur** — نور

## Theme

**Scene:** 2am. A single lamp. A page. The room is dark and the words on the page are the only thing giving off light.

That sentence forces every decision below. The interface is **the room**; the scripture is **the light source**. We do not decorate the room. We make it dark enough that the text glows — and, by day, bright enough that it sings.

**Dual mode, equal weight.** Night is the default emotional register (the 2am reader is who this is for), but the Qur'an is read on the commute too. Neither theme is an afterthought; both are composed, not inverted.

**Color strategy: Committed.** In dark mode the green carries the surface — it is not a 10% accent. It is the room.

### What this is not

- Not **emerald + gold + arabesque**. No filigree, no crescents, no dome silhouettes, no calligraphy-as-wallpaper. Ornament is not reverence.
- Not **cream + thin serif + sage** — the wellness-app move you make to escape the first cliché. The Qur'an is not a lifestyle supplement.
- **There is no gold in this system.** Not one token. Green + gold is the tell; refusing the pairing is how we escape it.

Green stays because green *means* something here — it is not decoration, it is the ground. Deep, damp, contemplative. Saiho-ji moss under wet stone, not a Ramadan banner.

## Color

OKLCH throughout. The seed (`oklch(0.400 0.106 150)`) anchors the primary; everything else is composed around the light/dark axis.

### Dark (default — the 2am room)

| Token | OKLCH | Role |
|---|---|---|
| `--bg` | `oklch(0.158 0.012 155)` | Near-black, faint green undertone. Shaded stone. |
| `--surface` | `oklch(0.205 0.016 155)` | Raised panels, the chat's own ground |
| `--surface-2` | `oklch(0.255 0.018 155)` | Inset wells, input fields |
| `--line` | `oklch(0.305 0.016 155)` | Hairlines |
| `--ink` | `oklch(0.975 0.004 95)` | **The light.** Scripture + primary text. Faintly warm — lamplight, not fluorescent. |
| `--ink-2` | `oklch(0.780 0.008 155)` | Secondary prose |
| `--ink-3` | `oklch(0.620 0.010 155)` | Labels, metadata |
| `--primary` | `oklch(0.680 0.115 150)` | Interactive: actions, selection, links. Lifted from seed for AA on dark. |
| `--primary-ink` | `oklch(0.180 0.020 150)` | Text on primary fills |
| `--primary-wash` | `oklch(0.680 0.115 150 / 0.14)` | Selected states, quiet fills |

### Light (the commute)

| Token | OKLCH | Role |
|---|---|---|
| `--bg` | `oklch(1.000 0.000 0)` | **Pure white.** No hidden warmth. |
| `--surface` | `oklch(0.978 0.004 155)` | Panels |
| `--surface-2` | `oklch(0.955 0.006 155)` | Wells |
| `--line` | `oklch(0.905 0.008 155)` | Hairlines |
| `--ink` | `oklch(0.185 0.018 155)` | Scripture + primary text |
| `--ink-2` | `oklch(0.420 0.014 155)` | Secondary — AA at 4.5:1 |
| `--ink-3` | `oklch(0.545 0.012 155)` | Labels — AA at 4.5:1 |
| `--primary` | `oklch(0.400 0.106 150)` | The seed, unchanged |

### Semantic (both themes, separate from the accent)

| Token | Role |
|---|---|
| `--canonical` | Scripture + literal translation. Reads as ink, not as a color. |
| `--interpretive` | Attributed opinion. Carries `--primary` at low chroma. |
| `--caution` `oklch(0.70 0.14 55)` | *Only* for "this source changes the meaning" and unreviewed-verse warnings. Never decorative. |

### The nūr

The glow is **achromatic luminance**, never a colored bloom: a soft radial of `--ink` at very low alpha behind the Arabic, plus real `text-shadow` at large blur. Light, not gold. It is the one place the design permits itself drama.

## Typography

Two scripts, two jobs. **The Arabic carries all the personality; the Latin gets out of its way.** That is Principle 2 — the word is the image.

| Role | Family | Notes |
|---|---|---|
| **Scripture** | **Amiri** (Naskh) | The hero. Renders Uthmani diacritics correctly. Large, breathing, `line-height: 2.1`. User-scalable independently of UI. |
| **UI + prose** | **Inter** (variable) | Deliberately quiet. Excellent Indonesian diacritics. Product-register default — familiarity is a feature. |
| **Data / refs** | Inter, `tabular-nums` | Verse refs (`2:255`), counts. |

- Fixed rem scale, ratio **1.2**. No fluid clamp in product UI.
- Prose capped at **68ch**.
- `text-wrap: balance` on headings, `pretty` on prose.
- Display letter-spacing floor **-0.03em**. Never tighter.
- **Arabic never uses `letter-spacing`** — it breaks the script's joins.

## Components

Every interactive element ships **default, hover, focus, active, disabled, loading, error**. No exceptions.

- **Radius:** `8px` standard, `12px` on the verse card, full pill on chips. Nothing above 12px — the over-round is a tell.
- **Depth:** hairline borders. **Never** border + wide shadow on the same element.
- **Attribution chip:** the signature component. Every rendering names its source *inline, in the reading surface*, not in a tooltip. Attribution is design, not fine print.
- **Source stack:** the plural view — four scholars, each named, each quoted, none ranked above another in the visual hierarchy. The system attributes; it never arbitrates.
- **Skeletons**, never spinners in content.
- **Empty states teach.** The chat's empty state shows real questions in real language (*"aku lagi capek banget"*), not "Ask me anything."

## Motion

150–250ms. State, not decoration.

- Ease: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). No bounce.
- **The one permitted flourish:** when a verse resolves, its Arabic *rises into light* — a 400ms luminance + blur settle. It fires once, on the hero element only. It is the product's thesis rendered as motion.
- Streaming chat text appears token-wise; no typewriter gimmick.
- `prefers-reduced-motion`: every animation degrades to a crossfade. The glow becomes static.
- Content is **visible by default**; reveals enhance, never gate.

## Accessibility

Hard requirements, verified — not aspirations.

- **WCAG AA** on every text pair, both themes. Body ≥4.5:1, large ≥3:1.
- **RTL Arabic** with `dir="rtl"`, `lang="ar"`. Never broken, reversed, or mis-shaped.
- **Independent Arabic scaling** — a control that scales scripture without touching UI or breaking layout.
- **Screen readers hear attribution.** The source of every rendering is in the accessible name, not just visual. A blind user must still know *who said what*.
- **Reduced motion** honoured everywhere.
- **Low-bandwidth first.** No framework runtime. Arabic font subset + `font-display: swap`. The app must work on a mid-range Android over 4G.
