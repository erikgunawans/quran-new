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
