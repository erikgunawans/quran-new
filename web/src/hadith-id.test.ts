/**
 * The gate on machine-translated hadith TEXT.
 *
 * This layer briefly shipped to production on 2026-08-10 and was taken dark the same day. The rule
 * it now encodes is not a preference: a clumsy rendering of a chapter heading is a bad heading, but
 * a clumsy rendering of the Prophet's ﷺ transmitted speech is a fabricated saying. `hadith-card.ts`
 * states the same rule for the Tanya surface, and the Dorar surah preface was refused on it before
 * either existed.
 *
 * These tests exist so the gate cannot drift shut-to-open silently — by a flipped constant, or by a
 * new caller reaching around `hadithIdText` for the raw file.
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

describe("machine-translated hadith text is gated", () => {
  it("the gate is SHUT — changing this is a decision for Erik and the ustadz, not a refactor", () => {
    expect(SHOW_MACHINE_HADITH_TEXT).toBe(false);
  });

  it("returns null even when the translation is present in the file", () => {
    // The data is there. That is the point: generation continues, display does not.
    expect(LOADED.hadith?.["1471"]).toBeTruthy();
    expect(hadithIdText(LOADED, 1471)).toBeNull();
  });

  it("raises no text notice, so the book page keeps the true bab-only wording", () => {
    // The bab notice says "teks hadis tetap Arab" — which is only honest while the gate is shut.
    expect(textNeedsNotice(LOADED)).toBe(false);
  });

  it("still falls back cleanly when the layer is absent entirely", () => {
    expect(hadithIdText({}, 1471)).toBeNull();
    expect(textNeedsNotice({})).toBe(false);
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
