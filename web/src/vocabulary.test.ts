import { describe, expect, test } from "bun:test";
import { VOCABULARY, vocabularyForms } from "./vocabulary.ts";

/**
 * This file guards a LINE, not a feature.
 *
 * A naming variant makes the scholar's existing work findable. A fiqh association makes the app
 * issue a ruling through a lookup table. They look identical in code — two strings in a map — and
 * only the intent separates them, so the intent is pinned here.
 *
 * `musik -> bernyanyi` was in this map and was removed: singing and music are not the same thing,
 * and knowledge.test.ts caught it. That is the failure mode this file exists to make loud.
 */
describe("the line: naming variants only, never rulings", () => {
  const FORBIDDEN: readonly (readonly [string, string, string])[] = [
    ["pinjol", "riba", "asserts online lending IS riba"],
    ["asuransi", "judi", "asserts insurance IS gambling"],
    ["asuransi", "riba", "asserts insurance IS riba"],
    ["kripto", "judi", "asserts crypto IS gambling"],
    ["kripto", "gharar", "asserts crypto carries prohibited uncertainty"],
    ["aborsi", "membunuh anak", "asserts those verses govern abortion"],
    ["musik", "bernyanyi", "singing and music are not the same thing"],
    ["musik", "nyanyian", "singing and music are not the same thing"],
    ["childfree", "keturunan", "asserts a ruling on choosing not to have children"],
    ["rokok", "khamr", "asserts smoking falls under intoxicants"],
  ];

  test.each(FORBIDDEN)("%s must not map to %s — %s", (asked, forbidden) => {
    const forms = vocabularyForms(asked).map((f) => f.toLowerCase());
    expect(forms).not.toContain(forbidden.toLowerCase());
  });

  test("every mapping is settleable with a dictionary, not a scholar", () => {
    // Enumerated deliberately: adding a key to VOCABULARY without adding it here fails the test,
    // which forces the next person to state which side of the line their entry falls on.
    const JUSTIFIED = new Set([
      "ghibah", "namimah", "lgbt", "homo", "korupsi",
      "bohong", "sombong", "pelit",
      "sholat", "shalat", "salat", "tobat", "taubat", "rezeki", "jum",
    ]);
    for (const key of Object.keys(VOCABULARY)) {
      expect(JUSTIFIED.has(key)).toBe(true);
    }
  });
});

describe("vocabularyForms", () => {
  test("always includes the asked word itself", () => {
    expect(vocabularyForms("ghibah")).toContain("ghibah");
    expect(vocabularyForms("tidakadadisini")).toEqual(["tidakadadisini"]);
  });

  test("reaches the word the index actually uses", () => {
    expect(vocabularyForms("ghibah")).toContain("menggunjing");
    expect(vocabularyForms("korupsi")).toContain("mengkorupsi");
    expect(vocabularyForms("lgbt")).toContain("homoseksual");
  });

  test("spelling variants resolve in every direction", () => {
    expect(vocabularyForms("sholat")).toContain("salat");
    expect(vocabularyForms("salat")).toContain("sholat");
    expect(vocabularyForms("shalat")).toContain("sholat");
  });
});
