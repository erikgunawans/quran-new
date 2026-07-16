# Product

**New-Quranku** — the new QuranKu.

> Renamed from **Nur** on 2026-07-16; the نور/light identity was retired. Only two things here were
> built on that metaphor — Design Principle #1's "make the room dark" clause, and Anti-reference #1's
> ban on emerald. Both were re-cut on 2026-07-17. Everything else in this doc predates the rename and
> survived it unchanged, because it was never about the name.

## Register

product

## Users

**Indonesian Muslims, weighted toward Gen Z and younger millennials**, on mid-range Android over patchy 4G.

They arrive in one of two states:

1. **Carrying something.** Debt, grief, anxiety, shame, a marriage cracking, a parent dying. They open the app at 2am because they cannot sleep. They are not looking for a fatwa. They are looking for something to hold.
2. **Curious but locked out.** They want to understand the Qur'an and can't get in. They open the official Kemenag translation and hit a wall of stiff, formal, sometimes untranslated Arabic. They conclude the fault is theirs. It isn't.

The job: **let the Qur'an actually reach them** — in language they understand, without a scholar in the room, without being lectured.

The Qur'an is read at 2am and on the commute. Day and night are both first-class; neither mode is bolted on.

## Product Purpose

The official Indonesian translation is *harfiyah* — literal. It renders words, not meaning. At 2:156, the verse recited at every Muslim death, it leaves the Arabic **untranslated**: a grieving person reads *"Inna lillaahi wa innaa ilaihi raaji'uun"* and understands nothing.

New-Quranku leads with a **meaning-based rendering** (Tarjamah Tafsiriyah) so the verse lands — and keeps the literal translation one tap away, never hidden: it ships with every verse and expands in place, so nothing is lost and nothing is imposed. Underneath sits a knowledge graph of attributed tafsir (Ibn Kathir, As-Sa'di, Al-Mukhtasar), and an AI that answers questions **only from cited sources**.

Success: a person arrives with a problem, leaves having *understood* a verse, and can see exactly who said what and why. Not converted. Not lectured. **Reached.**

## Brand Personality

**Warm · Plural · Unpreachy**

Voice: a friend who happens to know a great deal, and never makes you feel small for not knowing it. Speaks Indonesian the way people actually speak it — *"aku lagi capek banget"* gets a human answer, not a sermon.

Emotional goal: **relief, then curiosity.** First the weight lifts a little. Then they want to know more.

New-Quranku never arbitrates between scholars. It shows you that Ibn Kathir and As-Sa'di read this differently, names them both, and trusts you. Plurality is warmth, not hedging.

## Anti-references

Two reflexes, both rejected:

- **The devotional-app cliché — which is ornament, not green.** Gold, arabesque wallpaper, crescent moons, mosque-dome silhouettes, gold filigree frames, calligraphy-as-decoration. **Gold is banned outright.** The failure is ornament used as a substitute for reverence: decoration standing in for the thing it decorates.

  This ban used to include "emerald" and "guessable from the category alone". It no longer does, and that is deliberate. New-Quranku is in the QuranKu family on purpose — light, vivid green, rounded cards, prayer times. Being unrecognisable was never the goal; being *unornamented* was. We earn our place in the category by rigour — a corpus that never lies about what the Qur'an contains, every source named in the reading surface, WCAG AA as a test rather than an aspiration — not by refusing the category's colour.
- **The wellness-app cliché.** The move you make *to avoid* the first one: cream/sand ground, thin serif, sage green, infinite whitespace, breathing-exercise calm. Calm/Headspace with a verse in it. Equally predictable, and it makes the Qur'an feel like a lifestyle supplement.

Also banned: anything preachy, paternal, or guilt-shaped. No streak-shaming. No "you haven't read today." Gamified guilt is the opposite of this product.

Also banned: the AI answering in its own voice as if it were a scholar. It is not one.

## Design Principles

1. **The scripture out-shouts the interface, never the reverse.** The word is the light source; the interface is the room around it. This is a hierarchy, not a colour scheme — it survived the retirement of the نور metaphor because it was never about darkness. It is enforced, not aspired to: `contrast.test.ts` asserts that in the dark register the scripture out-luminates every piece of chrome, and the one bright emerald is reserved for what the reader can *do* (send, CTA, their own words, the mark). Light is the default register and dark its equal counterpart — the Qur'an is read at 2am and on the commute, and both are composed, not inverted.

2. **The word is the image.** Arabic script is the hero graphic, not an ornament layered over a stock photo. Geometry is *structure* — grids, rhythm, proportion — never wallpaper. Islamic visual tradition is rigorous, not decorative; honour the rigour, drop the filigree.

3. **Attribution is the design, not the fine print.** Every rendering names its source, visibly, in the reading surface. The system attributes; it never arbitrates. Plurality shown as generosity — *here is what four people saw in this verse* — not as a legal disclaimer.

4. **Meet them where they are, then go deeper.** The entry is conversational and low-effort. The depth (roots, cross-references, four tafsir disagreeing) is *there*, one tap away, rewarding curiosity without demanding it.

5. **Never fabricate; silence is honest.** Where the corpus is silent, New-Quranku is silent. It shows the verse and the sources and says plainly that it doesn't know. A Qur'an app that confabulates is worse than no app.

## Accessibility & Inclusion

All four are **hard requirements**, not polish:

- **WCAG AA throughout + full RTL Arabic.** Correct bidirectional text; Arabic never broken, reversed, or mis-shaped. Mis-rendered scripture is unshippable.
- **Adjustable Arabic type.** Readers scale the Arabic independently without breaking layout. Serves older and low-vision users, and everyone reading at 2am.
- **Reduced motion + screen reader.** Every animation has a `prefers-reduced-motion` alternative. Verse, translation, and *attribution* all read correctly aloud — a screen-reader user must still hear **who said what**.
- **Low-bandwidth / older Android.** Indonesia's real device landscape: mid-range phones, patchy 4G. Performance and offline-first are accessibility here, not optimisation.
