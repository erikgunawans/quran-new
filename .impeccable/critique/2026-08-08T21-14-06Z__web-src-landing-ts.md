---
target: the landing page
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
timestamp: 2026-08-08T21-14-06Z
slug: web-src-landing-ts
---
Method: dual-agent (A: aa1b6081787a5781f · B: a8301ab5ddb5d91f6)

Target: `web/src/landing.ts` — the New-Quranku landing (`#/`, the Tanya empty state), live at https://new-quranku.axiara.ai/, CSS `index-BzadnAwO.css`, JS `index-B3ci7lSY.js`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `send.disabled = true` for the whole 619 KB corpus fetch (`main.ts:1000-1010`) with no loading affordance — on patchy 4G the composer just looks broken. |
| 2 | Match System / Real World | 3 | Copy is real Indonesian ("Belum bisa tidur?"), but "Masuk" promises an account that does not exist, and *terjemah makna* never appears on the page. |
| 3 | User Control and Freedom | 2 | Landing teardown is one-way and, on the restore path, takes the composer with it (P0). The only undo is "Hapus percakapan" — nuke everything. |
| 4 | Consistency and Standards | 3 | `#display-panel` carries `role="dialog"` + `hidden` while computing `display: flex` (`styles.css:388`) — a standard attribute that lies. |
| 5 | Error Prevention | 2 | "Hapus percakapan" is a one-click destructive control with no confirm; the boot path can leave send permanently dead behind a banner. |
| 6 | Recognition Rather Than Recall | 1 | `document.querySelectorAll(".seed").length === 0`. Zero examples, zero chips. The reader must compose a question from nothing — at 2am, from grief. |
| 7 | Flexibility and Efficiency | 3 | ⌘K genuinely wired (`shell.ts:41`), Enter-to-send, dictation, Arabic sizing, deep-linkable hashes. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained and well-proportioned on desktop; ~40% of the phone screen is empty with the crescent floating in it. |
| 9 | Error Recovery | 2 | The corpus-failure banner is exemplary. Nothing else on the landing has an error state at all. |
| 10 | Help and Documentation | 2 | The one explanation that unlocks persona #2 lives behind an unlabelled 36×36 ⓘ in a corner. No onboarding, no first run. |
| **Total** | | **23/40** | **Acceptable — significant improvements needed** |

No heuristic scored `n/a`: this is an Operate surface where all ten apply.

## Design Specificity Verdict

**LLM assessment.** Strip three elements and this is ChatGPT's, Claude's, Gemini's or DeepSeek's home screen unchanged: a 290px left rail (wordmark, "Obrolan baru ⌘K", five icon+label rows, collapsibles, history, account row at the foot), a centred hero, a gradient-wordmark headline, a one-line subhead, and a big rounded glass composer with a mic and a circular send in its bottom-right. The headline reads **"Tanya Apapun"** — *Ask Anything* — the exact string DESIGN.md's own "empty states teach" rule was written against, promoted to 52px in the brand gradient.

Three things are genuinely authored: the **salam as the first line**; the **time-aware greeting** (`greet.ts:47-49`) that renders **"Belum bisa tidur?"** between 00:00 and 04:00 and deliberately refuses "selamat pagi"; and the **placeholder** naming both verbs (*Ceritakan atau tanyakan*). But all three are the *smallest* things on screen — the greeting renders at 13.5 device px in `--ink-2`, ranked below a generic headline five times its size. The one element given hero scale that is category-specific is the **crescent**, the most predictable Muslim-app signifier there is. Meanwhile the product's actual differentiator — *terjemah makna* — appears in `web/index.html:8` (the `<meta name="description">`) and **nowhere on the rendered page**. The promise is in the metadata; the page shows the category.

**Call: partly authored.** One irreplaceable beat buried at the bottom of the type scale, inside a fully interchangeable chassis, with a category cliché doing the differentiating work.

**Deterministic scan.** `detect.mjs --json web/index.html web/src/` → exit 2, **9 findings**. Four are false positives for this route (`side-tab` at `read.css:244` and two `layout-transition` hits are `#/baca`/`#/tematik`-only selectors; `overused-font` on Fraunces is a taste rule against a deliberate choice). Five are live: **three `gradient-text` findings** at `shell.css:41`, `:256`, `:263` — which map exactly onto the three elements that fail contrast in the light register — and two `layout-transition` rules on the sidebar collapse and composer bar. The detector could not scan the URL (`puppeteer is required for URL scanning`).

**Where the two assessments agree, independently:** the light-register gradient failure (A measured 1.43/2.98, B measured 1.42/2.94 by canvas rasterization); the ungated `qkshine`; the suppressed textarea focus outline; and the `#display-panel` `hidden`-but-visible contradiction. Four findings, two methods, same conclusions.

**Visual overlays: none.** Injection was attempted and failed three ways — mixed content blocked the `<script src="http://127.0.0.1:8400/detect.js">` on an HTTPS page (server reported `connectedClients: 0`); chunked injection of the 366 KB `detect.js` timed out at any payload ≥8,000 chars; and the browser-rendering fallback needs puppeteer. No user-visible overlay exists. The fallback signal is the CLI scan above plus direct computed-style measurement.

## Overall Impression

The writing in this codebase is better than the design on the screen. `greet.ts` refuses to say "selamat pagi" to someone awake at 2am; `landing.ts` carries a 20-line essay on why the composer must leave the hero before anything removes it. That thinking is real and it is rare. But the page does not show it: the one sentence no competitor could ship is 13.5px of muted grey, and the generic one is 52px in the brand gradient.

Then there is a functional hole underneath all of it, which I verified myself on production rather than taking on report: **a reader who returns to a saved conversation loses the composer entirely.**

The single biggest opportunity is not new design — it is inverting the hierarchy that already exists. The differentiator is written; it is just small.

## What's Working

1. **The time-aware greeting (`greet.ts:41-56`).** It works because it makes a claim about the *reader's* state rather than the app's features, and withholds the obvious wrong answer. It is the only element on the page that could not be lifted into another product.
2. **The dark register is composed, not inverted — and it is measurably the finished one.** Painted values: gold `#f0c851` **11.0:1**, green stop `#16a249` **5.3:1**, greeting ink **9.49:1**, placeholder **5.92:1**. Against light's 1.42/2.94, the night is where this design holds together — which matters, because PRODUCT.md says the Qur'an is read at 2am.
3. **The composer change shipped an hour ago is directionally right.** Rest carries `--composer-line` at 0.24–0.26 alpha; focus steps to 0.68–0.72, a 1.76:1 perceptual step, and the breathing glow *stops* on commit. It works because it encodes state in the perimeter of the object being acted on rather than in a separate indicator. It does not go far enough — see P1-3.

## Priority Issues

### [P0] A returning reader loses the composer entirely — `web/src/main.ts:1087`

- **What**: `restoreThread()` calls `$("#hello")?.remove()` directly, bypassing `destroyLanding()` (which is already imported at `main.ts:10`). By then `void route()` (`main.ts:1068`) has run `dockLanding()`, which moved `#composer-bar` **inside** `#hello`. The hero is removed with the composer still in it.
- **Verified twice, independently.** Assessment A reproduced it; I re-ran it myself on production with a seeded thread: `composerInDoc: false, textareaInDoc: false, helloInDoc: false, landingAttr: true, bodyKids: ["DIV#shell","BUTTON#to-top","SCRIPT"]`. `data-landing` is still set, so the landing's celestial ground paints behind a conversation.
- **Why it matters**: `thread.ts` persists for 12 hours precisely so that leaving and coming back works. Every reader who returns within 12 hours can read their old answer and **never ask another question**, on any route, until they hit "Hapus percakapan" — destroying the thing they came back for — or clear site data. For PRODUCT.md's 2am persona this is the worst possible ending: the app that noticed they were awake has no way for them to say anything else.
- **The irony**: `landing.ts:39-41` documents this exact failure in prose — *"otherwise it is … destroyed along with `#hello` (lost mid-question)"* — and the module exists so it would be testable. The one production path that removes the hero doesn't use the guard.
- **Fix**: replace `$("#hello")?.remove();` with `destroyLanding();`. Add a `landing.test.ts` case: dock, then destroy, assert `#composer-bar` is a child of `body` and `data-landing` is cleared.
- **Suggested command**: `$impeccable harden`

### [P1] The hero gradient fails WCAG AA at every stop in the light register — `web/src/shell.css:262-264`, `:248-257`, `:38-42`

- **What**: `#hello h1`, `.qk-hero-salam` and the sidebar wordmark paint `linear-gradient(90deg,#16a249,#f0c851)` clipped to text. Measured against the panel ground `rgb(230,244,237)`: green stop **2.94:1**, gold stop **1.42:1**. Large text needs 3:1; the sidebar wordmark at 22px needs 4.5:1. Both ends fail. Because the salam is RTL against an LTR gradient, the first word the eye lands on is the gold, lowest-contrast end.
- **Why it matters**: DESIGN.md § "The rules that are not preferences" #2 says *"A gradient passes at every stop, or it does not pass."* PRODUCT.md calls WCAG AA *"hard requirements, not polish."* Both are broken by the same three rules. It escapes enforcement for the reason DESIGN.md already diagnosed about `--action`: `contrast.test.ts` audits **tokens**, and `#16a249`/`#f0c851` are hardcoded literals in `shell.css`, invisible to it. Dark passes at 12.4 and 5.97, so the register that fails is the *daylight* one.
- **Fix**: promote the stops to tokens (`--hero-grad-a` / `--hero-grad-b`), give the light register values that clear 3:1 (the gold wants to land near the darker amber already used for the Makkiyah tag, documented as "tuned to pass AA"), and extend `contrast.test.ts` to walk gradient tokens at 0/50/100% the way it already does for `--action-grad`.
- **Suggested command**: `$impeccable colorize`

### [P1] The landing teaches nothing — the seeds are gone — `web/index.html:160-162`; dead CSS at `shell.css:269-277, 350`

- **What**: live, `document.querySelectorAll(".seed").length === 0`. The hero is greeting → headline → one paragraph → empty textarea. Nothing is tappable except the box. The `.seeds` / `.seed` styling is now unreachable dead code.
- **Why it matters**: DESIGN.md's own 2026-08-09 amendment softened "empty states teach" *for the placeholder only* and says explicitly *"The rule still binds everywhere else — **the seeds**, the reading surface, every other empty state."* The rule now binds an element that does not exist. Product-side this is the sharpest miss on the page: persona #1 *cannot articulate what is wrong*, and persona #2 already concluded *the fault is theirs*. A blank box confirms both. It is also the only place the app could demonstrate that feelings — not just queries — are admissible. The placeholder claims it; nothing shows it.
- **Fix**: restore three to four seeds (≤4, per the working-memory rule) written as first-person sentences rather than topics — one grief, one anxiety/debt, one curiosity ("apa bedanya terjemah makna sama harfiah?") — placed *below* the composer so they read as suggestions, not a menu. The DOM hook still exists: `dockLanding()` inserts the bar before `.seeds` when present.
- **Suggested command**: `$impeccable onboard`

### [P1] Keyboard focus on the hero control is below the 3:1 non-text threshold — `web/src/styles.css:821`

- **What**: `.composer textarea:focus { outline: none }` suppresses the textarea's own ring, so the global `:focus-visible` rule at `styles.css:309` never applies here. The entire focus signal is the form border stepping to `--composer-line-on` (**2.37:1** against the form's white fill) plus a 3px `--primary-wash` ring measured at **1.01:1** against the panel. And `body { zoom: .9 }` quantizes the authored 2px ring down to **1 device pixel** everywhere on the page.
- **Why it matters**: WCAG 2.2 SC 1.4.11 / 2.4.13 require 3:1. This is the most important control on the surface and the only one whose native ring was removed. The change I shipped an hour ago fixed the *rest* state and left the *focus* state below threshold — worth saying plainly, because it looked finished.
- **Fix**: raise `--composer-line-on` to an emerald that clears 3:1 against `#ffffff` (nearer `--primary`'s `oklch(0.416 0.083 165)` than `0.627` at 72% alpha), and either promote the ring to `--primary-line` or drop it — a ring at 1.01:1 is decoration pretending to be an affordance. Add the pair to `contrast.test.ts` as a non-text check.
- **Suggested command**: `$impeccable audit`

### [P1] Reduced motion is not honoured on the salam — and the gated animation never runs at all — `web/src/shell.css:257`

- **What**: `.qk-hero-salam { animation: qkshine 3.6s infinite }` sits outside any `prefers-reduced-motion` query. B verified this live under `--force-prefers-reduced-motion`: `getAnimations()` returned `qkshine` still `running`, `infinite`. **And there is a second layer**: because `shell.css` loads after `styles.css`, this ungated rule *overrides* the correctly-gated `.greet-ar` rule at `styles.css:442` entirely — so the carefully gated greeting animation never runs for anyone, and the ungated infinite shimmer runs for everyone.
- **Why it matters**: PRODUCT.md makes reduced-motion a hard requirement. Beyond compliance: an endless gold shine sweeping across the salam is *ornament applied to the thing it decorates* — the precise failure PRODUCT.md defines as the devotional-app cliché. It is filigree made of light, on the one line of the page that is sacred text. Separately `shell.css:104` uses `animation: … both`, which DESIGN.md § Motion bans by name.
- **Fix**: wrap `qkshine` in `@media (prefers-reduced-motion: no-preference)`, change `both` → `forwards` at `:104`, and resolve the cascade collision so the greeting's own animation can run. Then decide whether an infinite shine belongs on the salam at all — both assessments say kill it.
- **Suggested command**: `$impeccable animate`

## Persona Red Flags

**Sam (screen reader, keyboard, 200% zoom).** `#q` is the **18th tab stop** of 19, with no skip link. The theme toggle and A/A/A group are visible and clickable but **removed from the accessibility tree** — `#display-panel` keeps `hidden` while `styles.css:388` sets `display: flex`, and its controller `#display-trigger` is `display:none` while still reporting `aria-expanded="false"`. The **closed** "Ayat untukmu" disclosure leaks its entire contents into the a11y tree, so Sam hears the whole daily-ayah card and the prayer widget before reaching the input. At 200% zoom the invitation paragraph and the composer collide at y≈204/205. The three text-size buttons all have the accessible name **"A"** — three adjacent controls, one meaningless name.

**Casey (one-handed, patchy 4G).** The landing ships **≈865 KiB over the wire** for a screen containing one Arabic line, a headline, a paragraph and an empty box. Breakdown: **webfonts 404,452 B (45.7%)** — including Amiri 700 Arabic at 100,024 B when the only Arabic on the landing is weight 400, and Fraunces *italic* at 81,704 B; `corpus.json` at 157,983 B transferred, fetched unconditionally although the landing renders no verse; and **`quranku-mark.png` at 204,468 B — a 540×540 PNG rendered at 36×36, served `max-age=0, must-revalidate`**. DESIGN.md agonises over a 134 KB font delta and calls the reader's bandwidth *"a moral constraint"*. Also: **`/favicon.ico` returns the SPA shell as `text/html` and was requested six times in one load** — 27,198 wasted bytes, ~82–95 ms each. And the mic button's hit area is **35.1 × 47.0** rather than the ~48px its `-8px` expander implies, because `#send`'s larger `-9px` expander sits 3.6px away and wins the hit test: two overlapping expanders, the bigger eating the smaller.

**Jordan (first-timer — PRODUCT.md persona #2).** The landing never tells him the one thing that would unlock him: **makna** and **tafsiriyah** appear nowhere on the rendered page, while `index.html:8` tells search engines *"Al-Qur'an dengan terjemah makna yang bisa kamu pahami."* He also sees `.qk-user` — an avatar and the word **"Masuk"** — which is a `<div>` with `cursor: auto` and no handler (`shell.css:83-85`; `greet.test.ts:31` confirms it is out of scope). He taps it, nothing happens, and the first thing the app teaches him is that it says things that aren't true. In a product whose fifth design principle is *"Never fabricate; silence is honest,"* a decorative sign-in row is the one control that must not exist.

**Rifqi — the 2am arrival carrying grief (project persona, PRODUCT.md § Users #1).** He opens the app at 01:40. It says *"Belum bisa tidur?"* and for two seconds it is exactly right. Then: a blank box, no examples, nothing to hold — and he is the person who by definition cannot yet name it. If he types anyway, the send arrow may still be grey with no reason given. If he gets an answer that helps and comes back at 07:00 to reread it, **the composer is gone**. And the surface he came to for stillness runs an infinite gold shine across the salam that does not stop when he asks his phone to stop moving.

## Minor Observations

- The Riwayat rail still reads **"Percakapanmu akan muncul di sini"** while a live conversation is on screen.
- `p#live.sr` (`aria-live="polite"`) held **stale content from a previously visited route** — "Tematik — 13 tema tersedia." — while sitting on the landing.
- DESIGN.md's generated token table lists `--composer-line` under **Brand**, whose standfirst asserts *"Theme-invariant."* It is not: dark is `oklch(0.76 0.128 165 / 0.24)`. The generator emits only the light `:root` block, so the table silently misrepresents any theme-variant token in that section. (Same generator I patched an hour ago for silently dropping ungrouped tokens.)
- DESIGN.md says gold is permitted in *"exactly two places"*; the live page paints the green→gold gradient in **four**. A law document that miscounts its own exceptions invites the next drift.
- `.qk-panel::after` paints five "stars" at `rgba(70,110,90,.13–.24)` on a near-white light ground — invisible. Commit to the star field or delete it.
- `#to-top` is a focusable tab stop while `opacity: 0` and `pointer-events: none` — an invisible focus stop.
- The hero's `min-height: calc(100dvh - 210px)` leaves ~250px of gold foot-glow over nothing at 1280×720 — exactly where the seeds used to live.
- Icon SVGs inside `#side-toggle`, `#newchat`, `#info`, `#theme`, `#send` lack `aria-hidden="true"` while nav and tool icons have it. Harmless, inconsistent.
- `⌘K` on "Obrolan baru" is genuinely wired (`shell.ts:41-43`). Advertised shortcuts usually aren't.

## Questions to Consider

1. If `contrast.test.ts` only audits tokens, and the two colours the reader sees first are hardcoded hexes, what is the test proving? DESIGN.md diagnosed this exact failure mode once for `--action` — why did the fix stop at one colour instead of becoming a rule that *no literal colour may reach a paint property*?
2. "Tanya Apapun" is *Ask Anything* — the string DESIGN.md wrote a rule against — at 52px in the brand gradient. "Belum bisa tidur?", the only sentence no competitor could ship, is 13.5px of `--ink-2`. What happens if you swap their type scales?
3. The composer sits inside the hero because "the chat box is the hero" — but the *interface* was never meant to be the hero; PRODUCT.md says the word is. What would this landing look like if the ayah currently hidden inside a collapsed sidebar disclosure were the largest thing on screen, and the composer sat quietly beneath it?
4. `landing.ts` exists as its own module, with a header essay, specifically so "the composer must leave the hero BEFORE anything removes it" would be testable — and the one production path that removes the hero ships that exact bug. Is the lesson "add a test", or that `#hello` should never have been removable by anything except `destroyLanding()`?
