# Stitch Prompt — New-Quranku UI Redesign

> **How to use this document.** It is not one prompt. It is a **preamble** plus **six screen prompts**.
>
> 1. Import `DESIGN.md` through Stitch's design-system door (`create_design_system_from_design_md`),
>    then `apply_design_system` to the project. Do **not** paste the token tables as prose — hand-copied
>    token values are exactly what made DESIGN.md silently diverge from `styles.css` for months. The
>    generated block is the only copy that was ever true. Let the tool read it.
> 2. Paste **§ PREAMBLE verbatim** at the top of every screen generation. Every one. Stitch generates
>    each screen independently and does not remember the last one.
> 3. Then append the one § SCREEN block you want.
>
> **Generate the 390px mobile frame first.** The users are on mid-range Android. Desktop is the
> adaptation, not the source.
>
> § TOKEN CARD is a fallback for if Stitch's colour parser rejects `oklch()`. Hex is derived from the
> stylesheet's oklch by conversion, not re-picked by eye.

---

## § PREAMBLE

*(Paste this whole section before every screen prompt.)*

### 1. Do not draw

- No gold, brass, bronze, ochre, or amber — no fill, no gradient, no rule, no hairline.
- No crescents, domes, minarets, lanterns, prayer beads, or building silhouettes.
- No pattern behind text except the one star field named in § 4.
- No border, frame, or rule around any block of Arabic.
- No Arabic below reading size, at an angle, faded, cropped, or used as a mark or logo.
- No photography.
- No cream, sand, beige, or sage ground. No thin serif.
- No streaks, badges, rings, counts, or "you haven't read today."
- No icons of mosques, domes, crescents, lanterns, or books-on-stands.


### 2. Never generate Arabic

**Every Arabic string you render is supplied to you verbatim in this document. Copy it exactly,
character for character, including every diacritic.** If a screen needs Arabic that is not supplied,
render the Latin transliteration in Plus Jakarta Sans and flag the gap.

Do not invent, approximate, extend, or fill Arabic text. This is a Qur'an app: invented Arabic is not a
placeholder, it is fabricated scripture. It is the one thing this product forbids outright.

Arabic type stack: `"Amiri", "Scheherazade New", "Noto Naskh Arabic", serif`. **If Amiri is unavailable,
stop and say so — do not substitute silently.** Uthmani diacritics break under the wrong face, and
mis-rendered scripture is unshippable.

### 3. The invariant — every screen, no exceptions

**Any surface that shows a verse shows both renderings.** The meaning-based rendering (*terjemah makna*)
leads; the literal companion (*terjemah harfiah*) sits beside it or one tap beneath it. A verse card
without its literal companion is a broken card — on any screen, in any context, including thumbnails,
previews, and share images.

### 4. Where the Islamic character comes from

Three carriers. Use them positively; there is no restraint to perform and no ornament to reintroduce.

1. **The script is the hero, and it is the hero *because it is text*.** The Arabic is the largest and
   **highest-contrast** element on any page it appears on — nothing else on the page, no button, no
   chip, no heading, has more contrast against the background than the scripture does. Set at reading
   size, upright, unrotated, on the background, with nothing behind it and nothing over it. Wide margins
   — at least one line-height of air on all four sides. No letter-spacing, ever; it breaks the script's
   joins. Its authority comes from being legible, not from being styled.

   In the dark register specifically, the scripture out-luminates every piece of chrome.

2. **Geometry is structure, never wallpaper.** This tradition's real contribution is mathematical
   rigour — tessellation, proportion, rhythm. Honour the rigour, drop the filigree. Mostly this means
   geometry is *felt, not seen*: the 4pt spacing scale and the column rhythm are the geometry.

   Exactly one visible exception, on exactly one surface — behind the daily ayah card only: a **strictly
   geometric 8-point-star tessellation.** Straight lines only. Uniform stroke weight. No curves, no
   tapering, no floral or vegetal forms, no interlace. Tiled at 54px, 8% opacity, in `--primary`. It is
   a wireframe grid, not a decorative panel. It appears on this one card and on no other surface.

3. **Attribution is the design, not the fine print.** Every rendering names its source **inline, in the
   reading surface**, at readable size — never a tooltip, never 10px grey, never behind an info icon.
   When scholars disagree, show them stacked, each named, each quoted, **none ranked above another in
   the visual hierarchy.** Plurality drawn as generosity — *here is what four people saw in this verse* —
   not as a legal disclaimer.

**Target structure for a verse block:** one column. Arabic at the top at reading size, RTL, with margin
on all four sides of at least one line-height. The meaning-based rendering below it. The source's name
below that, at the same size as the rendering. No frame, no border around the block, no background
pattern. The block's edges are whitespace, not a rule.

### 5. Visual direction

**The neutrals are green, not grey.** The background is a pale green-white (`#f4f9f6`) and cards are
white. The greenness lives in the *hue of the neutrals* and in `--forest`/`--primary` blocks that carry
real weight — not in a saturated green page. **Never a green page with white cards floating on it.**

**Light is the default register. Dark is its equal counterpart — composed, not inverted.** Only the
background/surface/ink axis flips. `--action`, `--forest`, and `--clay` are **theme-invariant** — one
emerald means "you can do this" in both registers. `--primary` does flip (it has to stay readable).

**Colour roles:**

- `--action` is the **one bright surface**, reserved for what the reader *can do*: send, the primary
  CTA, the reader's own words in a chat bubble, the bookmark. White text. Its lightness is **pinned by
  WCAG AA at 4.94:1 — a test, not a taste. Do not brighten it to make it pop.**
- `--primary`: the readable emerald — links, labels, pressed states, icons.
- `--forest`: weight without shouting — prayer card, resume bar, ayah badges.
- `--clay` (`#a86b4a`): the only non-green, used **at most once per screen** — a single short rule or a
  single icon accent. Never a border, never a frame, never an edge that traces the outline of a card or
  a block of Arabic. Never metallic, never gradient. Never body text. **If removing it changes nothing,
  remove it.**

**Type — two scripts, two jobs. The Arabic carries the personality; the Latin gets out of its way.**

| Role | Family | Notes |
|---|---|---|
| Scripture | **Amiri** (Naskh) | The hero. Uthmani diacritics. Large, breathing. Reader-scalable independently of the UI. |
| Display | **Fraunces** | Speaks **only** where the app addresses the reader: the hero, section titles, the daily ayah's meaning. Nowhere else. |
| UI + prose | **Plus Jakarta Sans** | Deliberately quiet. Good Indonesian diacritics. |
| Data / refs | Plus Jakarta Sans, `tabular-nums` | Verse refs (`2:255`), clocks, counts. |

Prose caps at 68ch.

**Icons:** outline only, uniform 1.5px stroke, geometric, `--primary`. No filled or ornamental icons.
(See the ban list.)

**Shape and depth.** Radius `14px` cards / `16px` large / `18px` inputs / full pill on chips. Hairline
borders and **defined** shadows, ≤10px blur. **Never a border plus a wide 40–70px shadow on the same
element** — that combination is the ghost-card tell and reads as machine-generated instantly.

**The nav shell** (identical on all six screens — generate it the same way every time):

- **Mobile:** a bottom tab bar, `--surface`, hairline top border. Three tabs — **Tanya** (chat),
  **Baca** (read), **Tema** (themes). Outline icons, `--primary` when active, `--ink-3` when not. Labels
  in Plus Jakarta Sans at `0.833rem`. A minimal top bar carrying only the screen title and, on reading
  screens, the Arabic type-size control.
- **Desktop:** the same three destinations as a top bar, left-aligned, `--surface`, hairline bottom
  border.

**The attribution chip** — the signature component, so it is specified rather than left to reach for:
full pill, `--primary-wash` fill, `--primary-line` hairline, `--primary` text at `0.833rem` Plus Jakarta
Sans, `4px 12px` padding. It sits **inline in the reading surface, directly beneath the rendering it
attributes**, at readable size. It is never grey, never 10px, never a tooltip, never an info icon. When
several sources are shown, each chip is visually identical — no chip is styled to outrank another.

**Motion — an ayat arrives, it does not perform.** Verses fade in at 320ms, ease
`cubic-bezier(0.16, 1, 0.3, 1)`. No bounce. Nothing descends, blurs, or settles into place. Content is
**visible by default**; reveals enhance, never gate. The greeting breathes on a 3s cycle. Every animation
has a `prefers-reduced-motion` alternative — reduced motion drops the breath to a single fade and
everything else to a crossfade.

**Component states.** Every interactive element ships **default, hover, focus, active, disabled,
loading, error.** No exceptions. **Skeletons, never spinners** in content — and an empty bordered box is
a hole in the page, so drop the chrome entirely until there is content.

**Nothing is invented to fill a gap.** No location → the prayer card says so and offers to ask again; it
does not guess a city. A prayer time the astronomy cannot honestly place renders `—`, not a plausible
number. Where the corpus is silent, the app is silent and says so plainly.

**Accessibility — hard requirements, each a test rather than an aspiration.**

- **WCAG AA on every text pair, both registers.** Body ≥4.5:1, large ≥3:1.
- **Full RTL Arabic** (`dir="rtl"`, `lang="ar"`). Never broken, reversed, or mis-shaped.
- **Independent Arabic scaling** — the reader scales the scripture without the UI moving.
- **Screen readers hear attribution.** The source is in the accessible name, not just visible. A blind
  reader must still know **who said what**.
- **Touch targets ≥44px.** Low bandwidth, mid-range Android: performance is accessibility here.

### 6. The product

**New-Quranku** — an Indonesian Qur'an app. Users: **Indonesian Muslims, mostly Gen Z and younger
millennials, on mid-range Android over patchy 4G.** They arrive either **carrying something** (debt,
grief, anxiety, shame) at 2am and not looking for a ruling — or **curious and locked out**, because the
official Indonesian translation is literal and they bounced off it and concluded the fault was theirs.

Tone: **warm, plural, unpreachy.** A friend who knows a great deal and never makes you feel small for
not knowing it. Emotional arc: **relief, then curiosity.** The app never arbitrates between scholars, and
its AI answers only from cited sources — never in its own voice as though it were a scholar.

### 7. The Arabic you may use — copy verbatim

| Ref | Arabic | Use |
|---|---|---|
| greeting | `ٱلسَّلَامُ عَلَيْكُمْ` | landing greeting |
| **2:156** | `ٱلَّذِينَ إِذَآ أَصَٰبَتْهُم مُّصِيبَةٌ قَالُوٓا۟ إِنَّا لِلَّهِ وَإِنَّآ إِلَيْهِ رَٰجِعُونَ` | the worked example — see § SCREEN 4 |
| **94:5** | `فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا` | the diverging case — disclosure renders **open** |

Surah names, for the list on § SCREEN 3 — copy verbatim, no others:

`2 Al-Baqara البقرة` · `3 Aal-i-Imraan آل عمران` · `9 At-Tawba التوبة` · `12 Yusuf يوسف` ·
`13 Ar-Ra'd الرعد` · `20 Taa-Haa طه` · `21 Al-Anbiyaa الأنبياء` · `41 Fussilat فصلت` ·
`65 At-Talaaq الطلاق` · `94 Ash-Sharh الشرح`

---

## § SCREEN 1 — Landing (`/`)

**Mobile 390px first**, then desktop at 1120px. The app's front door and its most screenshotted surface.

**The chat box is the hero.** The composer sits **inside** the hero block — between the invitation and
the seed chips — **not docked at the bottom of the screen.** This is the most important layout fact on
this page: the app opens with an invitation to speak, not a search bar. **On mobile with the keyboard
open**, the hero scrolls and the composer stays in the hero — it does not reparent to a keyboard-docked
bar. Show both states.

Top to bottom:

- **The greeting.** `ٱلسَّلَامُ عَلَيْكُمْ` in Amiri, RTL. It is the greeting a Muslim already knows,
  not decoration. Beneath it, one quiet Latin line that notices what time it is for the reader.
  Breathes, 3s.
- **The invitation.** Fraunces: *"Ada apa hari ini?"*, with *"hari ini"* emphasised. Beneath it, in Plus
  Jakarta Sans: *"Cerita saja pakai bahasa kamu sendiri. Aku carikan ayatnya — lalu kamu lihat sendiri
  siapa yang mengatakan apa."*
- **The composer**, `18px` radius, send button in `--action`.
- **Seed chips**, full pill. **These are the empty state, and empty states teach** — real questions in
  real language, never "Ask me anything": `aku lagi capek banget` · `lagi banyak utang, stress` ·
  `baru kehilangan orang tua` · `ngerasa dosaku kebanyakan` · `cemas terus tiap malam` · `al kahfi`.
- **The hint line:** *"Atau sebutkan langsung surah dan ayatnya — **18:10**, **yasin**, **2:255**."*
- **The band.** Desktop: **asymmetric, 1.55fr / 1fr** — scripture owns the width, prayer is a utility
  beside it; a 50/50 split would claim they carry equal weight. **Mobile: stacks, ayah above prayer.**
  - **The daily ayah** — use **94:5** (§ 7). Amiri large, the 8-point-star field behind it at 54px / 8%
    (the only surface that gets it). The meaning-based rendering in Fraunces: *"Dalam kehidupan dunia
    ini benar-benar ada penderitaan dan ada kesenangan."* — attributed to **Ustadz Muhammad Thalib** —
    **and the literal companion with it**: *"Karena sesungguhnya sesudah kesulitan itu ada kemudahan,"*
    — **Kementerian Agama Republik Indonesia**. This card once shipped without the literal companion.
    That was a bug, on the app's most-screenshotted surface.
  - **The prayer card**, `--forest`. Next prayer, the day's times, tabular-nums. If there is no location
    it says so and offers to ask again. It does not guess a city.

## § SCREEN 2 — Chat thread (`/`, after asking)

Prose measure **46rem, never wider** — 46rem is how wide prose stays readable, not a layout preference.
Mobile: single column, 16px gutters. The composer docks to the bottom here — and only here.

- **The reader's own words** in `--action` with white text — their message is a thing they *did*.
- **The answer** on `--surface`. It answers only from cited sources, never in its own voice as though it
  were a scholar. Where the corpus is silent it says so plainly rather than reaching.
- **Verse cards inside the thread** carry the full apparatus: Amiri Arabic, meaning-based rendering,
  **literal companion**, attribution chip, verse ref.
- New messages **fade** at 320ms. Nothing descends or settles.
- **Skeletons while thinking, never a spinner.**

## § SCREEN 3 — Surah list (`#/baca`)

The index. 46rem measure. Mobile-first.

- A scannable list of surahs — use only the ten in § 7. Each row: number (tabular-nums), Latin name,
  Arabic name in Amiri set **right**, ayah count, Makkiyah/Madaniyah.
- Quiet rows. This is a directory, not a shrine — the reverence budget belongs on the reading surface.
- Search/filter at the top.
- A **"lanjutkan"** resume bar in `--forest` if the reader has a last-read position.

## § SCREEN 4 — Reading surface (`#/surah/N`)

**The most important screen in the app.** 46rem measure. Mobile-first.

**Use 2:156 as the worked example — it is the whole product in one card:**

- **Amiri Arabic, RTL, large**, at least one line-height of margin on all four sides, nothing behind it:
  `ٱلَّذِينَ إِذَآ أَصَٰبَتْهُم مُّصِيبَةٌ قَالُوٓا۟ إِنَّا لِلَّهِ وَإِنَّآ إِلَيْهِ رَٰجِعُونَ`
  Reader-scalable independently of the UI, via the type-size control in the top bar.
- **The meaning-based rendering leads, alone**, in Fraunces: *"Ketika kaum mukmin ditimpa musibah,
  mereka berkata: «Kami semua adalah milik Allah. Kami semua pasti kembali kepada-Nya.»"* — attribution
  chip: **Ustadz Muhammad Thalib**.
- **A single *depth* toggle below it**, collapsed by default, holding the **literal companion** and the
  **tafsir stack**. Depth on demand, never depth removed. Opened, the literal reads: *"(yaitu)
  orang-orang yang apabila ditimpa musibah, mereka mengucapkan: «Inna lillaahi wa innaa ilaihi
  raaji'uun»."* — chip: **Kementerian Agama Republik Indonesia**.

  *This pair is why the product exists: the official literal leaves the Arabic untranslated, so a
  grieving person reads it and understands nothing. Both are shown. Neither is corrected.*
- **For 94:5, render the disclosure open**, not collapsed — that verse is flagged as diverging, and
  *"baca keduanya"* has to be honest without requiring a tap.
- **The tafsir stack, when open:** Ibn Kathir (Classical, 14th c.), As-Sa'di (Modern, 20th c.),
  Al-Mukhtasar (Markaz Tafsir, Riyadh) — each **named**, each quoted, **none ranked above another in the
  visual hierarchy.** Identical chips. The system attributes; it never arbitrates.
- **Per-verse actions:** bookmark, play audio, share. The bookmark uses `--action`.

## § SCREEN 5 — Themes (`#/tema`)

Entry by human problem, not by surah number — the door for the reader who arrived carrying something and
doesn't know where to look.

- A grid of theme cards (single column on mobile), `14px` radius, hairline border, defined shadow — **no
  border plus wide shadow**.
- Each card: the theme in Fraunces, a one-line plain-Indonesian description, verse count in tabular-nums.
- Themes are named the way a person would say them, not the way an index would.
- The detail view lists verses using the § SCREEN 4 verse component, unchanged — **literal companion
  included**.

## § SCREEN 6 — Concept maps (`#/peta`)

The depth layer for the reader who got curious — the knowledge graph made visible.

- A list of maps: *Ekonomi Islam*, *Perintah dan Larangan*, *Membangun Pribadi Shalih*, *Rahasia
  Kejiwaan Manusia dalam Al-Qur'an*, *Sosial*, *Hijrah, Jihad dan Perang*.
- The map view renders concepts and their relationships. **Geometry as structure applies literally
  here** — this is a graph, and its rigour is the point. Nodes and edges in `--forest` and `--primary`.
- Every node carrying a verse links to the § SCREEN 4 component — **literal companion included.** No
  surface escapes § 3.
- Must degrade on a mid-range Android over patchy 4G. If a map cannot load, say so; **never render a
  half-graph that implies a relationship the corpus does not contain.**

---

## § TOKEN CARD — fallback only

Use only if Stitch's colour parser rejects `oklch()`. Verified: `--action` → `#0c8059` gives white
**4.94:1**, matching the pinned WCAG AA value in the stylesheet. These are a translation, not a re-pick.

### Surface & ink

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f4f9f6` pale green-white | `#09130e` |
| `--surface` | `#ffffff` | `#131f19` |
| `--surface-2` | `#e6f4ed` | `#1d2b25` |
| `--line` | `#e1e9e5` | `#2a3631` |
| `--line-strong` | `#d1ded7` | `#3d4a44` |
| `--ink` | `#0f1e18` | `#f2f6f4` |
| `--ink-2` | `#41504a` | `#b7c0bc` |
| `--ink-3` | `#5b6a63` | `#919b96` |

### Brand

| Token | Light | Dark | Role |
|---|---|---|---|
| `--primary` | `#0b5a41` | `#52cb9d` | readable emerald — links, labels, pressed, icons. **Flips.** |
| `--action` | `#0c8059` | `#0c8059` | **the one bright surface.** White text, 4.94:1. **Invariant. Do not brighten.** |
| `--action-2` | `#0c8079` | `#0c8079` | gradient partner |
| `--forest` | `#0a4d38` | `#0a4d38` | weight without shouting. **Invariant.** |
| `--clay` | `#a86b4a` | `#a86b4a` | once per screen, accents only. **Invariant.** |
| `--caution` | `#a24f00` | `#a24f00` | |

Gradients (`--action-grad` 120°, `--forest-grad` 145°) carry white text across their whole sweep, so
**they pass at every stop or they do not pass** — never test at 0% and hope.

### Shape, space, motion

- 4pt spacing scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Rhythm from a defined set, never
  arbitrary numbers.
- Radius `14` / `16` / `18` inputs / full pill on chips.
- Type scale `0.833 · 1 · 1.2 · 1.44 · 1.728 · 2.074rem`. Scripture starts at `2.1rem`, reader-scalable
  from there.
- Ease `cubic-bezier(0.16, 1, 0.3, 1)`, base transition `200ms`. No bounce.
- Shadows `0 1px 3px` + `0 4px 10px` at 4–6% — defined, never diffuse.

---

## § SELF-CHECK — run against every generated screen

1. Is there gold, or any warm metallic — **including any use of `--clay` that traces an outline or reads
   as metal**? → fail.
2. Any crescent, dome, minaret, lantern, prayer beads, or building silhouette — including in an icon? → fail.
3. Is Arabic used as a graphic — angled, faded, cropped, behind something, or as a mark — rather than as
   text at reading size? → fail.
4. Is **anything** on the page higher-contrast against the background than the Arabic? → fail.
5. **Was any Arabic generated rather than copied from § 7?** → fail. (Check character by character.)
6. Does every verse shown carry its literal companion, at most one tap away? → if not, fail.
7. Is every source named inline in the reading surface at readable size, with identical chips? → if not, fail.
8. Does the star field contain any curve, taper, leaf, vine, or interlace — or appear on any surface
   other than the daily ayah card? → fail.
9. Any element with both a border and a wide 40–70px shadow? → fail.
10. Any streak, badge, ring, count, or guilt? → fail.
11. Does `--action` appear anywhere that is not something the reader can *do*? → fail.
12. Is it a green page with white cards floating on it? → fail. (Green is the neutrals' hue, not the fill.)
13. Does it look like Calm with a verse in it? → fail.
