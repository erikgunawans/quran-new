# Design

**New-Quranku** — the new QuranKu.

> Rewritten 2026-07-17. The previous version specified a design that no longer existed: a hue-155
> dark-first palette, Inter, a "2am room" thesis, a `≤12px` radius rule the app had stopped obeying,
> and two tokens (`--canonical`, `--interpretive`) that were never built at all. It drifted because it
> hand-copied values that already lived in `web/src/styles.css`. **The token tables are now generated**
> (`bun run app:design`) and cannot drift again. Everything above them is rationale — the part a
> stylesheet cannot explain.

## Theme

**Light is the register.** A page in daylight: green, open, unornamented. The reader arrives carrying
something and the app does not perform gravity at them.

Dark is its **equal counterpart** — not an afterthought, not an inversion. The Qur'an is read at 2am
and on the commute, and both are composed. Only the bg/surface/ink axis flips between them.

**What died with the rename, and what didn't.** The retired *Nur* identity built everything on "the
room is dark so the text glows". The durable half of that thesis survived: **the scripture out-shouts
the interface, never the reverse.** That is a hierarchy, not a colour scheme — and it is enforced
rather than asserted. `contrast.test.ts` asserts that in the dark register the scripture out-luminates
every piece of chrome. What died is only the instruction to make the room dark.

**Green is the ground, not decoration.** It carries the surface; it is not a 10% accent.

### What this is not

- **No gold ornament — one gold exception, revised 2026-07-17.** See PRODUCT.md § Anti-references: the
  devotional-app cliché is *ornament*, not green — arabesque wallpaper, crescents, dome silhouettes,
  filigree, calligraphy-as-decoration. Ornament is not reverence. Gold is now permitted in **exactly one
  place**: the hero heading's green→gold type gradient (`#16a249 → #f0c851`), the QuranKu-family
  signature — gold as *typography*, never as ornament. No gold frames, rules, hairlines, or edges
  anywhere else; the peta cosmos hues stay gold-free (ISA ISC-185). We are in the QuranKu family on
  purpose and earn our place by rigour, not
  by refusing the category's colour.
- **No filigree — geometry is structure.** The girih behind the daily ayah is an 8-point-star field
  tiled at 54px, 8% opacity: a plane-filling grid, which is what Islamic visual tradition is actually
  rigorous about. Not a motif laid over a page.
- **No wellness-app calm.** Cream, thin serif, sage, infinite whitespace — Calm with a verse in it. The
  Qur'an is not a lifestyle supplement.

## The rules that are not preferences

Three values here are constraints. Each is a test, not an intention.

1. **`--action`'s lightness is pinned by WCAG AA, not by taste.** Bright emerald is the *one* colour
   reserved for what the reader can DO — send, the CTA, their own words in the chat bubble, the mark.
   It carries **white text**, so contrast decides its lightness. The preview's `#12a074` gives white
   3.33:1 — a fail — and three design passes missed it because they audited `--ink-3` and never audited
   the action colour. Pinned at the brightest value that passes (4.94:1). *Brightening it to "pop more"
   must fail `contrast.test.ts` first.*

2. **A gradient passes at every stop, or it does not pass.** `--action-grad` and `--forest-grad` both
   carry white text across their whole sweep, so both are tested at every stop — never at 0% and hoped.

3. **The brand colours are theme-invariant.** `--action`, `--forest`, `--clay` are identical in both
   registers. One emerald means "you can do this" everywhere, and the white-on-action math is proved
   once instead of re-proved per theme.

## Layout

**The chat box is the hero.** On the empty state the composer sits *inside* the hero — between the
invitation and the seeds — not docked at the bottom. CSS alone cannot do it (`#composer-bar` is a
body-level sibling of `.app`), so `landing.ts` moves the node and the router owns dock/undock in both
directions. Get it wrong and the chat input strands inside a hidden `#chat` on the reading route. It
did, once — hence `landing.test.ts`.

**The band is asymmetric: 1.55fr / 1fr.** Scripture owns the width; prayer is a utility beside it. A
50/50 split would claim they carry equal weight. It stacks below 900px.

**46rem is a MEASURE, not a layout choice.** It is how wide prose stays readable, so the thread and the
reading surface never exceed it. The landing is not prose — it carries the band — so it widens to
1120px, and *only* the landing does.

**`display` out-argues `[hidden]`.** An author `display` rule always beats the UA stylesheet's
`[hidden] { display: none }`. Any element with both must re-assert it — `.band` and
`#read .surah-list li` both do. Skipping it paints the element from first load.

## Typography

Two scripts, two jobs. **The Arabic carries the personality; the Latin gets out of its way** — the word
is the image (PRODUCT.md principle 2).

| Role | Family | Notes |
|---|---|---|
| **Scripture** | **Amiri** (Naskh) | The hero. Renders Uthmani diacritics correctly. Large, breathing. Reader-scalable independently of the UI (`--ar-size`). |
| **Display** | **Fraunces** | Speaks *only* where the app addresses the reader: the hero, section titles, the daily ayah's meaning. |
| **UI + prose** | **Plus Jakarta Sans** | Deliberately quiet. Good Indonesian diacritics. |
| **Data / refs** | Plus Jakarta Sans, `tabular-nums` | Verse refs (`2:255`), clocks, counts. |

**Weights are variable RANGES, never a list of static cuts.** `wght@400;500;600;700;800` ships five
files per subset — **548 KB** for an Indonesian reader (latin+arabic, measured). The same weights as
`wght@400..800` cost **414 KB**. Adding a weight inside the range is free; adding one to a list is not.
The reader's bandwidth is a moral constraint, and this is where it gets decided.

- Prose capped at **68ch**; `text-wrap: balance` on headings, `pretty` on prose.
- **Arabic never uses `letter-spacing`** — it breaks the script's joins.

## Components

Every interactive element ships **default, hover, focus, active, disabled, loading, error**. No exceptions.

- **Radius:** `--r` 14px, `--r-lg` 16px, `--r-input` 18px, full pill on chips. *(The old doc said
  "nothing above 12px — the over-round is a tell". The `$impeccable` critique found the real tell was
  22–26px; 14–16 is the QuranKu family's soft-card language, which is the locked direction.)*
- **Depth:** hairline borders and **defined** shadows (≤10px blur). **Never** a border plus a wide
  40–70px shadow on the same element — that combination is the ghost-card tell.
- **Attribution chip:** the signature component. Every rendering names its source *inline, in the
  reading surface*, never in a tooltip. Attribution is design, not fine print.
- **Source stack:** the plural view — scholars named, each quoted, none ranked above another in the
  visual hierarchy. The system attributes; it never arbitrates.
- **Depth disclosure:** the verse leads with the interpretive primary (*terjemah makna*) alone; the
  literal companion (*terjemah harfiah*) and the tafsir stack collapse into one *depth* toggle below —
  depth on demand, never depth removed. Verses flagged as diverging (94:5) render the disclosure
  **open**, so *"baca keduanya"* is honest without a tap.
- **`literal_companion` is an EGRESS invariant.** The primary may never appear without the literal
  beside it — enforced in the corpus build, in `share.ts` on copy, in `share-image.ts` on the PNG, and
  in the daily-ayah card. Any new surface that shows a verse shows both. The daily card broke this and
  had to be fixed; it is the most screenshotted surface in the app.
- **Skeletons**, never spinners in content. An empty bordered box is a hole in the page — drop the
  chrome until there is content (`.aod:empty`).
- **Empty states teach.** The chat's empty state shows real questions in real language
  (*"aku lagi capek banget"*), never "Ask me anything."
- **Nothing is invented to fill a gap.** No location → the prayer card says so and offers to ask again;
  it does not guess a city. A prayer the astronomy cannot honestly place renders `—`, not a plausible
  number.

## Motion

One rule: **an ayat arrives, it does not perform.** New verses fade (320ms). Nothing descends, blurs,
or settles — that was the retired thesis's choreography, and it is deleted.

- Ease: `cubic-bezier(0.16, 1, 0.3, 1)`. No bounce.
- **`forwards`, never `both`.** `both` back-fills the FROM keyframe the instant the element exists,
  before the animation engine runs a frame. A tab backgrounded mid-load (app-switch, screen lock —
  routine on the mid-range Android this targets) can leave the animation never-started, and `both` then
  leaves the verse **permanently invisible**. Scripture is never gated behind motion that might not run.
- Content is **visible by default**; reveals enhance, never gate.
- The greeting breathes (3s); `prefers-reduced-motion` drops it to a single fade-in and degrades every
  other animation to a crossfade.

## Accessibility

Hard requirements, each a test rather than an aspiration — see PRODUCT.md § Accessibility & Inclusion.

- **WCAG AA** on every text pair, both registers. Body ≥4.5:1, large ≥3:1. Checked against the *tokens*
  in `contrast.test.ts`, because the tokens are the source of truth and a screenshot only proves one
  moment on one machine.
- **RTL Arabic** with `dir="rtl"`, `lang="ar"`. Never broken, reversed, or mis-shaped.
- **Independent Arabic scaling** that does not break layout.
- **Screen readers hear attribution.** The source of every rendering is in the accessible name, not
  just visually. A blind reader must still know *who said what*.
- **Low-bandwidth first.** No framework runtime; sharded corpus; `font-display: swap`. Must work on a
  mid-range Android over patchy 4G.

## Tokens

<!-- GENERATED:tokens START — `bun run app:design`. Do not edit by hand. -->

> Generated from `web/src/styles.css` by `bun run app:design`. **Do not edit this block** — edit
> the stylesheet and re-run. These values existed twice for months and silently diverged; the
> browser's copy is the only one that was ever true, so it is now the only one written by hand.

### Surface & ink

The light register. Dark flips only this axis — see `@media (prefers-color-scheme: dark)` in the stylesheet.

| Token | Value | Why |
|---|---|---|
| `--bg` | `oklch(0.978 0.007 160)` | pale green-white, not paper-white |
| `--surface` | `oklch(1.000 0.000 0)` | the card |
| `--surface-2` | `oklch(0.955 0.017 165)` | the wash |
| `--line` | `oklch(0.927 0.010 165)` | — |
| `--line-strong` | `oklch(0.889 0.017 163)` | — |
| `--ink` | `oklch(0.219 0.024 167)` | — |
| `--ink-2` | `oklch(0.416 0.021 169)` | — |
| `--ink-3` | `oklch(0.509 0.021 166)` | — |

### Brand

**Theme-invariant.** One emerald means "you can do this" in both registers, so the white-on-action contrast math is proved once, not per theme.

| Token | Value | Why |
|---|---|---|
| `--primary` | `oklch(0.416 0.083 165)` | primary = the READABLE emerald: links, labels, pressed states, icons. |
| `--primary-ink` | `oklch(1.000 0.000 0)` | — |
| `--primary-wash` | `oklch(0.955 0.017 165)` | — |
| `--primary-line` | `oklch(0.627 0.129 165 / 0.45)` | — |
| `--action` | `oklch(0.532 0.112 163)` | action = the ONE bright surface, reserved for what the reader can DO (send, CTA, |
| `--action-2` | `oklch(0.542 0.092 188)` | — |
| `--action-grad` | `linear-gradient(120deg, var(--action) 0%, var(--action-2) 100%)` | — |
| `--action-ink` | `oklch(1.000 0.000 0)` | — |
| `--forest` | `oklch(0.375 0.073 166)` | forest = weight without shouting. Prayer sidebar, resume bar, ayah badges. |
| `--forest-grad` | `linear-gradient(145deg, oklch(0.375 0.073 166) 0%, oklch(0.370 0.058 195) 60%, oklch(0.365 0.060 235) 100%)` | — |
| `--clay` | `oklch(0.586 0.091 49)` | clay = the only spark. Decorative rules and accents; never body text. |
| `--wash-1` | `oklch(0.627 0.129 165 / 0.08)` | the ambient light behind everything — dimmer in the dark room, never absent |
| `--wash-2` | `oklch(0.542 0.092 188 / 0.05)` | — |

### Semantic

| Token | Value | Why |
|---|---|---|
| `--caution` | `oklch(0.520 0.135 55)` | — |
| `--caution-wash` | `oklch(0.520 0.135 55 / 0.10)` | — |
| `--glow` | `none` | — |
| `--shadow-pop` | `0 8px 28px oklch(0.20 0.01 155 / 0.10)` | — |
| `--sh-sm` | `0 1px 2px oklch(0.30 0.04 160 / 0.05)` | — |
| `--sh` | `0 1px 3px oklch(0.30 0.04 160 / 0.06), 0 4px 10px oklch(0.30 0.04 160 / 0.04)` | — |

### Type

Arabic is scaled by the reader independently of the UI (`--ar-size`).

| Token | Value | Why |
|---|---|---|
| `--f-ar` | `"Amiri", "Scheherazade New", "Noto Naskh Arabic", serif` | — |
| `--f-ui` | `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | — |
| `--f-display` | `"Fraunces", Georgia, serif` | display: Fraunces — the one characterful voice, for the hero and section titles only. |
| `--step--1` | `0.833rem` | — |
| `--step-0` | `1rem` | — |
| `--step-1` | `1.2rem` | — |
| `--step-2` | `1.44rem` | — |
| `--step-3` | `1.728rem` | — |
| `--step-4` | `2.074rem` | — |
| `--ar-size` | `2.1rem` | user-scalable scripture, independent of UI |

### Space & shape

4pt scale. Rhythm comes from a defined set, never arbitrary numbers.

| Token | Value | Why |
|---|---|---|
| `--s-1` | `4px` | 4pt spacing scale — rhythm comes from a defined set, never arbitrary numbers |
| `--s-2` | `8px` | — |
| `--s-3` | `12px` | — |
| `--s-4` | `16px` | — |
| `--s-5` | `24px` | — |
| `--s-6` | `32px` | — |
| `--s-7` | `48px` | — |
| `--s-8` | `64px` | — |
| `--s-9` | `96px` | — |
| `--r` | `14px` | — |
| `--r-lg` | `16px` | — |
| `--r-input` | `18px` | — |

### Motion & layers

z is semantic, never 9999.

| Token | Value | Why |
|---|---|---|
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | — |
| `--t` | `200ms var(--ease)` | — |
| `--z-sticky` | `10` | z-scale — semantic, never 9999 |
| `--z-sheet-backdrop` | `20` | — |
| `--z-sheet` | `30` | — |
| `--z-toast` | `40` | — |

<!-- GENERATED:tokens END -->
