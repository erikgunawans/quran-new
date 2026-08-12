/**
 * The gate on machine-translated hadith TEXT — now OPEN, and these tests changed shape with it.
 *
 * History: the layer shipped on 2026-08-10, was taken dark the same day, and reopened on 2026-08-12
 * when Ustadz Ahmad approved displaying our machine translations as they are (relayed verbally by
 * Erik; scope and exclusions in `docs/review/hadith-id-approval-2026-08-12.md`).
 *
 * The original reasoning was never refuted and is worth keeping in view: a clumsy rendering of a
 * chapter heading is a bad heading, a clumsy rendering of the Prophet's ﷺ transmitted speech is a
 * fabricated saying. What changed is WHO decides — a scholar, which is the only authority that could
 * open it. The measured defect that argued for the gate is now an ACCEPTED risk rather than an absent
 * one: this layer turned `دُعَاؤُكُمْ إِيمَانُكُمْ` ("your supplication IS your faith") into "Doa
 * kalian adalah BAGIAN DARI keimanan kalian", a hedge the Arabic does not contain.
 *
 * So these tests no longer guard the gate's direction — they guard what did NOT open with it. The
 * load-bearing one is that the provenance notice fires whenever text will be seen: an open gate plus a
 * missing label is a worse state than either gate position, because it puts machine-rendered prophetic
 * speech on screen with nothing marking it as machine output.
 *
 * `hadith-card.ts` is a DIFFERENT surface and is deliberately not opened by this flag — it still shows
 * Indonesian only from `reviewed_id`, per-record, which must never be fed from this layer.
 */

import { describe, expect, it } from "bun:test";
import {
  SHOW_MACHINE_HADITH_TEXT,
  hadithIdText,
  textNeedsNotice,
  babId,
  type HadithIdFile,
} from "./hadith-id.ts";

/** A book file exactly as the generator writes it: unreviewed machine text, fully populated. */
const LOADED: HadithIdFile = {
  meta: {
    translation: "ai",
    reviewed: false,
    reviewerNeeded: "Ustadz Ahmad Isrofiel Mardlatillah",
    notice: "Terjemahan mesin (AI), BELUM ditinjau ulama.",
  },
  hadith: { "1471": "Ibnu Abbas radhiyallahu 'anhuma berkata: …" },
};

describe("machine-translated hadith text is OPEN, on a scholar's approval", () => {
  it("the gate is OPEN — opened by Ustadz Ahmad's approval, not by a refactor", () => {
    // Flipped 2026-08-12. Scope, exclusions and the disclosed defect are recorded in
    // `docs/review/hadith-id-approval-2026-08-12.md`. This assertion is not "the gate is correct" —
    // it is "the gate's state matches a decision on file". If it ever flips again, that document is
    // what has to change first.
    expect(SHOW_MACHINE_HADITH_TEXT).toBe(true);
  });

  it("returns the translation when the file carries one", () => {
    expect(hadithIdText(LOADED, 1471)).toBe("Ibnu Abbas radhiyallahu 'anhuma berkata: …");
  });

  it("REQUIRES the provenance notice whenever text will be seen", () => {
    // The load-bearing test now, and the reason this file did not simply get deleted when the gate
    // opened. Approval to display is not approval to display UNLABELLED: this layer is measured to
    // alter sense ("is your faith" -> "is PART OF your faith"), so a reader must always be able to
    // tell the line came from a model. If the gate is open and this returns false, machine-rendered
    // prophetic speech is on screen with nothing marking it as such — the worst state this file can
    // be in, worse than either the old gate or the new one.
    expect(textNeedsNotice(LOADED)).toBe(true);
  });

  it("still falls back cleanly when the layer is absent entirely", () => {
    // Unchanged, and still the common case: only 1,746 of 14,736 records carry Indonesian.
    expect(hadithIdText({}, 1471)).toBeNull();
    expect(textNeedsNotice({})).toBe(false);
  });

  it("Anti: an open gate does not invent text for a record that has none", () => {
    // A book file present but missing THIS hadith must stay silent rather than fall through to some
    // neighbouring number — the failure mode that would attach one hadith's words to another's id.
    expect(hadithIdText(LOADED, 9999)).toBeNull();
  });
});

describe("bab titles are NOT gated", () => {
  it("still renders — a chapter heading is editorial apparatus, not transmitted speech", () => {
    const file = {
      meta: { translation: "ai", reviewed: false },
      babs: { "bukhari/2/2": "Doa kalian adalah bagian dari keimanan kalian" },
    };
    expect(babId(file, "bukhari", 2, 2)).toBe("Doa kalian adalah bagian dari keimanan kalian");
  });
});
