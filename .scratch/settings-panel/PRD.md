# Pengaturan — settings entry beside Masuk, bottom-left

> Erik, 2026-08-11: *"Add the setting capability close to the login capability on the bottom left.
> Put the setting features that you think are necessary for this kind of system."*
>
> Spec only. Nothing built — the session that wrote this was out of context. Build order at the end.

## Anchor

`web/index.html:111` — `<div class="qk-user"><span class="avatar"></span><span>Masuk</span></div>`
is the bottom-left row. Settings sits beside it as a sibling icon button, not inside it: signing in
and configuring the app are unrelated actions, and burying settings behind an account row implies
(falsely) that you must be signed in to reach them.

## What already exists — consolidate, do not duplicate

| Control | Where | Persists |
|---|---|---|
| Light/dark toggle | `#theme`, `index.html:140` | `newquranku:theme` |
| Arabic text size | `#size`, `index.html:146` | `newquranku:ar` |
| "Kenapa ada dua terjemahan?" | `#info`, `index.html:128` | `newquranku:explained` |

These stay where they are — they are *in-context* controls a reader reaches while reading, and moving
them into a modal would make the common case slower. Settings **mirrors** them and adds what has no
home today. Two surfaces, one state: both must read and write the same keys, or they will disagree.

## The settings this system needs, and why each earns its place

Ordered by how much this particular app needs them. Anything not on this list was considered and
rejected below.

**1. Terjemahan mana yang tampil lebih dulu** — *the most app-specific setting there is.*
The app ships two Indonesian translations with genuinely different characters: Thalib's *tafsiriyah*
(interpretive — renders meaning) and Kemenag's *harfiyah* (literal — renders words). The whole
premise in `ISA.md` is that the literal one "renders words, not meaning." Which one leads is a real
reading preference, and today the reader has no say. Options: *Tafsiriyah dulu* (default) /
*Harfiyah dulu* / *Tampilkan keduanya*. New key `newquranku:trans`.

**2. Hapus data di perangkat ini** — *the one I would not ship without.*
People ask this app about anxiety, sin, debt, marriage and death. That history sits in
`localStorage` on a device that may be shared with family. A visible, plain-language "delete my
conversation history and bookmarks" is not a nice-to-have in an app people confide in — it is the
minimum. Must state what is deleted and that it cannot be undone, and must be a real deletion, not a
UI clear. Related: `bookmark.ts`, `migrate-storage`, the `RIWAYAT` list.

**3. Ukuran teks Arab** — mirror of `#size`, key `newquranku:ar`. Belongs here because a first-time
reader looking for "how do I make this bigger" looks in settings, not in a header cluster.

**4. Tema: Terang / Gelap / Ikut sistem** — mirror of `#theme`, key `newquranku:theme`.
**Adds the option that is missing today:** the toggle is binary, so a reader who wants the app to
follow their phone cannot ask for it. Note `panel-ink-desync` in memory — the panel flips on the
`data-theme` attribute while ink tokens flip on `prefers-color-scheme`, so "ikut sistem" must set
*no* attribute rather than compute one, and the result must be screenshotted in all three states.

**5. Tampilkan tafsir otomatis** — tafsir is lazily loaded behind `<details data-lazy-tafsir>`
(`tafsir.ts`). Default closed is right for browsing and wrong for study. Off by default; when on,
keep the lazy fetch — this changes the open/closed default, never the loading strategy, or a 286-ayah
surah fetches 286 files.

**6. Kurangi animasi** — the CSS already honours `prefers-reduced-motion`, but a reader on a device
where that is unset has no way to ask. Cheap: one attribute on `<html>` that the existing
`@media (prefers-reduced-motion: no-preference)` blocks also respect.

### Considered and deliberately NOT included

- **Account / profile settings** — there is no account system yet; `Masuk` is a stub. Adding profile
  rows would promise something that does not exist.
- **Notification / prayer-time alerts** — the prayer schedule is a sidebar disclosure, not a
  notification system. A settings row for notifications that send nothing is a lie.
- **Qari / audio selection** — audio exists but "Dengar" has never been exercised on a real device
  (open item). Do not add configuration to an unverified feature.
- **Language switching (ID/EN)** — the app is Indonesian by design and the English tafsir layer is
  `reference-only`. A language switch would imply an English product that does not exist.
- **"Reset all settings"** — three keys and a delete-data action already cover it; a second
  destructive button beside the first is how people press the wrong one.
- **Anything that changes what the app SAYS** — no "show me rulings", no "enable AI answers", no
  translation-of-hadith toggle. Those are governed by the ustadz gates and the `fatwaShape` guard,
  and a user-facing switch would route around a scholarly decision. **Settings may change how
  content is PRESENTED, never which content is permitted.** This is the load-bearing constraint.

## Build order

1. `web/index.html` — icon button beside `.qk-user` (`id="settings"`, `aria-label="Pengaturan"`),
   plus a `<dialog id="settings-panel">`. Use `<dialog>`: it gets focus trapping and Esc free, and
   `esc.ts` already exists for the rest.
2. `web/src/settings.ts` — one module owning read/write for all keys, so the header controls and the
   panel cannot diverge. Existing keys keep their names; new: `newquranku:trans`,
   `newquranku:tafsir-open`, `newquranku:reduce-motion`.
3. Wire the mirrors: changing theme in the panel must update `#theme`'s state and vice versa.
4. `web/src/shell.css` — panel styling. **Tokens only.** `hardcoded-literals-outlive-tokens` and
   `panel-ink-desync` both apply; falsify with a red ground before believing the theming works.
5. `web/src/settings.test.ts` — force-red each: a written setting survives a reload; "ikut sistem"
   sets no `data-theme` attribute; delete-data actually empties the keys it names; and an
   anti-test that no setting can enable hadith text or AI answers.
6. Verify in-browser in **all three** theme states, and screenshot — per `panel-ink-desync`, a panel
   whose text paints white-on-white passes every DOM assertion.
