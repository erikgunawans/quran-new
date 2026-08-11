# Kumpulan Doa — provenance of the 34 pairings

> Written 2026-08-11. Records where the section's content came from, so the rights position can be
> re-checked by someone who was not in the room. `data/` is gitignored, so review records live here
> alongside the ustadz files.
>
> **Status: SHIPPED 2026-08-11 on Erik's instruction, under a VERBAL agreement from Ustadz Ahmad.**
> Recorded here precisely because it is verbal: there is no written sign-off in this repository for
> the 7 theme names and 34 pairings. Erik's call, made explicitly. If a written confirmation later
> arrives, file it in this directory next to this note; if the ustadz revises any pairing, the fix
> is an edit to `web/src/doa.ts` and a redeploy, since the section holds references only.

## What the section contains, exactly

| Element | Source | Rights basis |
|---|---|---|
| Arabic of each ayah | **Not in this repo's doa module.** Rendered by the existing reading surface from `web/public/surah/N.json` | Tanzil Uthmani, verbatim-copy permission with attribution; UU 28/2014 Pasal 42(e) — *"tidak ada Hak Cipta atas … kitab suci"* |
| Indonesian translations | Same — rendered by the reading surface, not by this section | Existing app posture (Thalib interpretive + Kemenag literal), unchanged by this work |
| Surah:ayah references | Selected by this project | Facts. A citation is not a reproduction |
| Theme names (7) | Written by this project | Our own words |
| Ayah captions (34) | Written by this project | Our own words |

**`web/src/doa.ts` reproduces no scripture, in any language.** This is enforced by test, not by
intention: `doa.test.ts` fails if any Arabic-script codepoint appears in the module or in the
rendered output, and fails if `renderDoa` performs a fetch. Force-red verified 2026-08-11.

## Why nothing was vendored

Every candidate doa corpus was checked and each one failed:

- **Hisnul Muslim** — al-Qahtani d. 2018, Berne life+50, Arabic in copyright to ~2068. The
  Darussalam English translation states *"ALL RIGHTS RESERVED … No part of this book may be
  reproduced or utilized in any form."* IslamHouse's footer is a takedown-compliance notice
  (*"يلتزم الموقع بحفظ حقوق الملكية الفكرية"*), not a grant; its Indonesian edition PDF carries no
  copyright page at all, which under Berne means all rights reserved, not permission.
- **Kemenag, *Kumpulan Doa Sehari-Hari*** (Ditjen Bimas Islam, cet. III 2013) — *"Hak Cipta
  Dilindungi Undang-undang: Dilarang memperbanyak isi buku…"*. That statement is exactly what
  switches off the government-works exemption in UU 28/2014 Pasal 43(b).
- **MIT-labelled doa repositories on GitHub** — licence the repository structure while crediting no
  one for the Indonesian text inside. The one clean candidate (`fitrahive/dua-dhikr`, MIT, 97 ID
  entries) grants a licence from a party whose own upstream is undisclosed. Not shipped; the same
  shape of claim this project already declined for Shamela-MIT and fawazahmed0-Unlicense.
- **al-Nawawi's *Al-Adhkār*** — the 13th-c. Arabic is public domain, but every modern tahqiq and
  every Indonesian translation carries fresh copyright.

**No public-domain or openly-licensed Indonesian doa corpus was found to exist.**

## The path that was rejected, and why

The prior handoff listed *"runtime query-and-quote through `worker/`"* as a viable path. It was
rejected. Serving a third party's text to our users from our domain is reproduction and
distribution regardless of when the bytes are fetched; moving them out of git changes the storage
location, not the act. It is the same error as *"gitignored is not undeployed"*, one layer up:
**not-vendored is not not-published.** A proxy also removes the notice-and-takedown posture that
protects user-uploaded content — editorially-selected content chosen by the operator gets none of
it — and any edge cache is a copy we hold.

## equran.id — the premise that was wrong

The handoff recorded equran.id as *"no published terms; ask equran.id"*. **They do publish terms**,
at `https://equran.id/terms` (v1.0, *"Berlaku sejak 15 Juni 2025"*):

- §3 permits *"Membagikan konten dengan mencantumkan sumber dari EQuran.id"* and API use for
  application development.
- §5: *"Data yang diperoleh tidak boleh dijual atau diperjualbelikan."*
- §7 claims copyright over their translations and features.
- §9 reserves the right to change the terms at any time.

So display with attribution is **explicitly permitted** — but two things weaken it. Their §7 claims
rights they may not hold: their own docs cite Kemenag as the Qur'an source, and of the 227 doa
records, 182 carry an `HR.` hadith citation and **128 embed a third-party URL** (rumaysho.com,
muslim.or.id, konsultasisyariah.com, almanhaj.or.id and others). Their permission reaches only as
far as what they own. And §9 makes it revocable.

**If this route is ever taken, write to `admin@equran.id`** (ToS §10; their privacy policy §11
promises a reply within 30 working days), naming the doa endpoint, the intended use, and the
attribution that would be displayed. File the reply here.

## The claim that needs a scholar

The rights question is settled. This one is not, and it is the more serious of the two.

Selecting an ayah and captioning it *"Ayyub — ketika penyakit menimpanya"*, or gathering seven
ayahs under *"Saat sempit dan takut"*, is a **classificatory religious claim made in this project's
own voice**. It is not a rendering of licensed text; it is the kind of judgment CONTENT.md routes
through Ustadz Ahmad before ship. A copyright error is recoverable. A doa pointed at the wrong
occasion is not.

The precedent cuts the same way: `theme-index.ts` already carries 83 themes and 192 verse entries of
exactly this kind — and those were reviewed. These 34 pairings have not been.

**Resolved 2026-08-11 by verbal agreement, per Erik.** Still worth obtaining in writing: (a) the
seven theme names, (b) each ayah's placement within its theme, and (c) each caption's
characterisation of who is speaking and on what occasion. The standing rule that a heads-up is not a
sign-off is not being waived — it is being recorded that this shipped on a verbal agreement, so the
distinction survives in the trail rather than being quietly collapsed.

**A defect found and fixed before ship.** Twenty-three labels were rewritten because several
reproduced the meaning of their ayah rather than naming its occasion — four shared a verbatim
four-word span with the Kemenag or Thalib translation ("Dialah yang menyembuhkan aku", "dan aku
belum pernah kecewa", "aku dan kedua orang tuaku", "Kebaikan di dunia dan"). The added legal
exposure was nil, since the app renders both translations in full one click away. The defect was
honesty: the card's own note says *"Judulnya kami yang menulis; lafal dan artinya bukan"*, and for
those labels it was false. The guard that should have caught it (`label.length <= 64`) was
calibrated above the longest existing label and could never fire. It is now a four-word overlap
check against the ayah's own translations, force-red verified.

## Derivation method

Candidates were derived from the corpus rather than recalled: all 6,236 ayahs were scanned with
diacritics stripped for supplication forms (رَبَّنَا, رَبِّ + imperative, أعوذ, اللهم, حسبنا). 76
ayahs match `rabbanā` alone. The 34 shipped were then selected editorially for coverage across the
seven occasions, favouring the supplications of named prophets. Twenty of the pairings correspond to
doa-related entries already present in `theme-index.ts` (including its two existing doa themes,
"Doa yang dikabulkan" and "Doa tidak dijawab"), which are themselves ustadz-reviewed; **fourteen are
new and have no review behind them.**

Every one of the 34 was then verified present in the shipped shards with Arabic and both Indonesian
translations — 34/34, enforced on every test run.
