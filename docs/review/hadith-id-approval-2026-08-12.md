# Hadith Indonesian text — approval record

**Status:** APPROVED — machine translations, as they are
**Scholar:** Ustadz Ahmad Isrofiel Mardlatillah
**Relayed by:** Erik, 2026-08-12
**Form: VERBAL, relayed. Not written.** Do not upgrade this document to "written confirmation"
without an artefact from the ustadz himself — the same rule already applied to
`doa-provenance.md`, and for the same reason: a relayed yes and a signed yes are different
objects, and only one of them survives someone asking later who approved what.

## What was approved

That the app may display **our own machine-translated Indonesian hadith text** — the layer generated
by `tool/translate-hadith.ts` into the `web/public/hadith-id/` sidecar — rather than only an
Indonesian translation reviewed record by record.

This is the WIDER of the two readings available, and it was put to Erik explicitly as the wider one,
alongside three narrower alternatives (Indonesian-in-principle with per-record review; licensing a
published scholarly translation; going back to the ustadz to re-confirm). He chose this one knowing
the evidence below. Recorded so that the scope cannot later be mistaken for something narrower or
broader than it is.

## What was NOT approved, and is unchanged

- **The English text.** sunnah.com's terms cover it as private research use; it renders as the sourced
  artifact under the existing attribution, and nothing here widens that.
- **The display cap.** `MAX_DISPLAY = 2` in `worker/src/dalil.ts`, re-applied in `hadith-card.ts`.
  A rights position, not a layout choice.
- **Attribution and provenance.** Every machine-rendered line still carries `.is-ai` and the notice
  above it. Approval to display is not approval to display *unlabelled* — the reader must be able to
  tell which lines came from a model. See `displaying-others-scholarship.md`.
- **Any claim that the machine text is reviewed.** It is approved, which is not the same thing. The
  `reviewed_id` field keeps its meaning: an ustadz-approved rendering of one specific record. It must
  NOT be populated from machine output — that would erase the only distinction the data model has
  between "a scholar checked this sentence" and "a scholar permitted this method".

## The known defect, disclosed before the decision

Our Indonesian is LLM output and is measured to alter meaning, not merely to read clumsily:

| | |
|---|---|
| Arabic (Bukhari, Kitab al-Iman, bab 2) | `دُعَاؤُكُمْ إِيمَانُكُمْ` — a flat equative: *"your supplication **is** your faith"* |
| Our rendering | *"Doa kalian adalah **bagian dari** keimanan kalian"* — *"...**is part of** your faith"* |

The model inserted a hedge the Arabic does not contain, converting an identity claim into a partitive
one. Found 2026-08-10 in a **bab title**, and it was the stated reason hadith TEXT was gated dark
while titles were allowed: a clumsy chapter heading is a bad heading, a clumsy hadith is a fabricated
saying of the Prophet ﷺ.

**No automated test can catch the next instance.** The output is fluent, plausible Indonesian that
differs from the source only in sense, so a parity test comparing structure or length passes. This is
recorded not to re-litigate the decision but because the risk is now *accepted rather than absent*,
and the next person to read this file needs that distinction.

**Recommended follow-up, not blocking:** the highest-value use of the ustadz's time is now spot-review
of the records readers actually reach, since the display cap means that set is small. Findings go to
`reviewed_id`, which upgrades individual records from "permitted" to "checked".

## Coverage as of this approval

1,746 of 14,736 records carry Indonesian text. Generation was stopped deliberately on 2026-08-10
pending exactly this ruling. Restarting it is a separate decision — roughly 24h of compute — and is
Erik's call; the standing "do not restart the generator" instruction was predicated on the absence of
this approval and should be re-read now that it exists.

---

## Reaffirmed 2026-08-13 — same scope, still verbal, written confirmation promised

Erik relayed a further conversation with Ustadz Ahmad. Three things, kept separate because they are
easy to collapse into one another:

1. **What he approved is the AI-generated translation itself** — the machine layer, as it stands.
   That is the METHOD, not a judgement on any particular sentence. It is the same scope as the
   2026-08-12 entry above, reaffirmed rather than widened.
2. **It is still VERBAL.** The status line at the top of this file does not change. Erik reports the
   ustadz **will send written confirmation**; until that artefact exists, this remains a relayed yes.
   Do not edit the status line on the strength of this section — this section is the promise, not the
   artefact.
3. **He asked that it be shown in the app first, for testing.** The display is the ustadz's own
   suggestion, which is why it proceeds ahead of the written note rather than in spite of it.

### What this does NOT change

- **`reviewed_id` stays empty.** He approved the method; he did not read and sign off on individual
  renderings. `reviewed_id` means "a scholar checked THIS record's sentence" and is the data model's
  only way to tell *permitted* from *checked* — feeding the machine layer into it would erase that
  distinction irreversibly (ISA ISC-448, a tested invariant). The machine text renders from
  `machine_id`, its own field.
- **The `.is-ai` badge and the provenance notice stay.** "Terjemahan mesin · belum ditinjau" is still
  TRUE: the method is permitted, the sentences are unreviewed, and "for testing" is precisely the
  frame the ustadz asked for. ISC-446/447 pin this in both directions, and of the two possible
  errors — understating permission or overstating review — overstating review is the worse one.
- **The 2-card display cap is untouched.** That is a RIGHTS position from sunnah.com's terms
  (per-hadith didactic use, no mass reproduction), not a scholarly one, so no scholarly approval
  reaches it. Raising it is a licensing conversation with the source.

### The disclosed defect still stands

The accepted risk from the 2026-08-12 entry is unchanged and was not re-litigated: this layer is
measured to alter sense — `دُعَاؤُكُمْ إِيمَانُكُمْ` came back as *"…**bagian dari** keimanan
kalian"*, a hedge the Arabic does not contain — and no parity test can catch the next one. Accepted,
not absent.

### Coverage at the time of writing

**1,746 of 14,736 (11.8%), all Ṣaḥīḥ Muslim books 1–21, ZERO Bukhari.** So "show it on every card"
is not yet a thing the corpus can do, however the UI behaves. `src/app/translate-hadith.ts` was
restarted 2026-08-13 to close that gap (~24h, resumable per book).
