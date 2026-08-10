/**
 * The `bad_hadith` rule — PRD decision 8.
 *
 * Kept separate from answer-guard.test.ts because it tests a different failure than the other three
 * rules do. The fabrication this rule exists for is NOT a wrong hadith number: it is an attribution
 * to the Prophet ﷺ carrying no number at all — invisible to `arabic` (no Arabic script), invisible
 * to `bad_ref` (no verse reference), and fluent enough to be believed.
 */
import { describe, expect, test } from "bun:test";
import {
  allowedRefsFrom,
  groundedHadithFrom,
  guardAnswerProse,
  markersInProse,
  markerToId,
  safeAnswer,
} from "./answer-guard.ts";

const allow = (...refs: string[]) => allowedRefsFrom(refs);
const grounded = (...ids: string[]) => groundedHadithFrom(ids);

describe("prophetic attribution needs a resolvable marker", () => {
  test("an attribution with no marker at all is rejected", () => {
    const r = guardAnswerProse("Rasulullah bersabda bahwa senyum itu sedekah.", allow(), grounded());
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("bad_hadith");
  });

  test("the same attribution passes when a marker resolves against this turn's grounding", () => {
    const prose = "Nabi ﷺ pernah mengingatkan bahwa meninggalkan sholat itu perkara berat. [H:muslim:154]";
    expect(guardAnswerProse(prose, allow(), grounded("hadith-muslim-154")).ok).toBe(true);
  });

  test("a marker resolving to a hadith NOT retrieved this turn is rejected", () => {
    const prose = "Nabi ﷺ bersabda demikian. [H:bukhari:6962]";
    const r = guardAnswerProse(prose, allow(), grounded("hadith-muslim-154"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "bad_hadith")).toBe(true);
  });

  test("an invented marker is rejected even with no attribution grammar around it", () => {
    const r = guardAnswerProse("Ada juga riwayat lain. [H:bukhari:99999]", allow(), grounded("hadith-muslim-154"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "bad_hadith")).toBe(true);
  });

  // Same discipline as the fatwa rule: a receipt in one sentence does not cover the next.
  test("one resolvable marker does not license a later unmarked attribution", () => {
    const prose = "Nabi ﷺ bersabda begitu. [H:muslim:154] Beliau juga mengatakan bahwa puasa menghapus dosa.";
    expect(guardAnswerProse(prose, allow(), grounded("hadith-muslim-154")).ok).toBe(false);
  });

  test("defaults to rejecting attribution when no grounding predicate is supplied", () => {
    expect(guardAnswerProse("Dalam sebuah hadits disebutkan hal itu.", allow()).ok).toBe(false);
  });

  test("HR. Bukhari with no marker is rejected", () => {
    expect(guardAnswerProse("Amal tergantung niat (HR. Bukhari).", allow(), grounded()).ok).toBe(false);
  });

  test("safeAnswer returns null on an unmarked attribution", () => {
    expect(safeAnswer("Diriwayatkan oleh Bukhari bahwa amal tergantung niat.", allow(), grounded())).toBeNull();
  });
});

describe("the rule does not fire on compliant prose", () => {
  // A word list would reject these. That is exactly why this is a construction list.
  test("saying you are not a hadith expert passes", () => {
    expect(guardAnswerProse("Aku bukan ahli hadits, lebih baik tanyakan pada ustadz.", allow(), grounded()).ok).toBe(true);
  });

  test("naming the Prophet without attributing a saying passes", () => {
    expect(guardAnswerProse("Nabi ﷺ adalah teladan yang baik bagi kita semua.", allow(), grounded()).ok).toBe(true);
  });

  test("ordinary comfort prose passes", () => {
    const prose = "Rasanya berat ya. Kamu tidak sendirian menghadapi ini.";
    expect(guardAnswerProse(prose, allow(), grounded()).ok).toBe(true);
  });
});

describe("honorifics are not scripture", () => {
  // The app's intended voice (PRD decision 2) uses ﷺ. It sits in the Arabic presentation-forms
  // block, so before the HONORIFIC exception the `arabic` rule made that sentence unshippable.
  test("ﷺ alone does not trip the arabic rule", () => {
    expect(guardAnswerProse("Nabi ﷺ adalah teladan.", allow(), grounded()).ok).toBe(true);
  });

  test("ﷻ alone does not trip the arabic rule", () => {
    expect(guardAnswerProse("Allah ﷻ Maha Pengampun.", allow(), grounded()).ok).toBe(true);
  });

  test("real Arabic script alongside an honorific still fails", () => {
    const r = guardAnswerProse("Nabi ﷺ bersabda: إنما الأعمال بالنيات [H:bukhari:1]", allow(), grounded("hadith-bukhari-1"));
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "arabic")).toBe(true);
  });
});

describe("markersInProse — the renderer's work list", () => {
  test("extracts markers in order, de-duped", () => {
    expect(markersInProse("[H:muslim:154] lalu [H:bukhari:1] lalu [H:muslim:154]")).toEqual([
      "hadith-muslim-154",
      "hadith-bukhari-1",
    ]);
  });

  test("prose with no markers yields an empty list", () => {
    expect(markersInProse("Tidak ada rujukan hadits di sini.")).toEqual([]);
  });

  test("markerToId matches the corpus id shape the retrieval layer returns", () => {
    expect(markerToId("muslim", "154")).toBe("hadith-muslim-154");
    expect(markerToId("bukhari", 6962)).toBe("hadith-bukhari-6962");
  });
});
