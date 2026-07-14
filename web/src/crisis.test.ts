import { describe, expect, test } from "bun:test";
import { detectCrisis } from "./crisis.ts";

/**
 * Reproduces the P0 from PROGRESS.md: "aku gak sanggup bayar utang, pengen mati aja" matched
 * only on "utang" and returned a debt-repayment verse — Nur never saw the ideation at all.
 */
describe("crisis detection", () => {
  test("catches the exact reproduced case", () => {
    expect(detectCrisis("aku gak sanggup bayar utang, pengen mati aja")).toBe(true);
  });

  test("catches common Indonesian phrasings of suicidal ideation", () => {
    expect(detectCrisis("udah capek hidup rasanya")).toBe(true);
    expect(detectCrisis("pengen bunuh diri aja")).toBe(true);
    expect(detectCrisis("gak sanggup hidup lagi")).toBe(true);
    expect(detectCrisis("mending mati daripada gini terus")).toBe(true);
  });

  test("is case- and punctuation-insensitive", () => {
    expect(detectCrisis("PENGEN MATI AJA!!!")).toBe(true);
  });

  test("does not trigger on ordinary distress language", () => {
    expect(detectCrisis("aku lagi capek banget sama kerjaan")).toBe(false);
    expect(detectCrisis("lagi banyak utang, stress")).toBe(false);
    expect(detectCrisis("ngerasa dosaku kebanyakan")).toBe(false);
  });

  test("does not trigger on unrelated mentions of death", () => {
    expect(detectCrisis("kalau aku mati duluan gimana ya")).toBe(false);
    expect(detectCrisis("baru kehilangan orang tua")).toBe(false);
  });

  test("empty or whitespace input never triggers", () => {
    expect(detectCrisis("")).toBe(false);
    expect(detectCrisis("   ")).toBe(false);
  });
});
