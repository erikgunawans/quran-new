import { describe, expect, test } from "bun:test";
import {
  guardThemes,
  MAX_THEMES,
  THEME_SYSTEM_PROMPT,
  type ThemeModel,
  understandThemes,
} from "./theme-understand.ts";

// A representative closed set — in the app this is `corpus.themes`.
const VALID = [
  "Hardship & ease",
  "Anxiety & fear",
  "Grief & loss",
  "Patience",
  "Forgiveness & despair",
  "Provision & debt",
  "Trust in God",
];

const KEYWORD = () => ["Provision & debt"]; // stands in for the deterministic LEXICON detection

describe("guardThemes — the closed-set wall", () => {
  test("keeps only themes that exist in the corpus", () => {
    expect(guardThemes(["Grief & loss", "Politik", "Cinta"], VALID)).toEqual(["Grief & loss"]);
  });

  test("drops an invented category entirely (recognize, never invent)", () => {
    expect(guardThemes(["Kesepian Digital"], VALID)).toEqual([]);
  });

  test("is exact — a near-miss rename is not a match", () => {
    expect(guardThemes(["hardship & ease", "Grief and loss"], VALID)).toEqual([]);
  });

  test("dedupes, order-preserving", () => {
    expect(guardThemes(["Patience", "Patience", "Anxiety & fear"], VALID)).toEqual([
      "Patience",
      "Anxiety & fear",
    ]);
  });

  test("caps at MAX_THEMES", () => {
    const many = ["Hardship & ease", "Anxiety & fear", "Grief & loss", "Patience", "Trust in God"];
    expect(guardThemes(many, VALID)).toHaveLength(MAX_THEMES);
  });
});

describe("understandThemes — the wrap", () => {
  test("a good classification is kept", async () => {
    const model: ThemeModel = async () => ["Forgiveness & despair", "Trust in God"];
    expect(await understandThemes("ngerasa Tuhan udah nyerah sama aku", VALID, model, KEYWORD)).toEqual([
      "Forgiveness & despair",
      "Trust in God",
    ]);
  });

  test("off-list-only output falls back to keyword detection", async () => {
    const model: ThemeModel = async () => ["Kesepian", "Politik"];
    expect(await understandThemes("capek", VALID, model, KEYWORD)).toEqual(["Provision & debt"]);
  });

  test("a mixed result keeps the valid themes and does not fall back", async () => {
    const model: ThemeModel = async () => ["Politik", "Patience"];
    expect(await understandThemes("sabar", VALID, model, KEYWORD)).toEqual(["Patience"]);
  });

  test("empty model output falls back", async () => {
    const model: ThemeModel = async () => [];
    expect(await understandThemes("hmm", VALID, model, KEYWORD)).toEqual(["Provision & debt"]);
  });

  test("a model error falls back — never propagates", async () => {
    const model: ThemeModel = async () => {
      throw new Error("timeout");
    };
    expect(await understandThemes("bangkrut", VALID, model, KEYWORD)).toEqual(["Provision & debt"]);
  });

  test("an empty question is silence — model and fallback both untouched", async () => {
    let called = false;
    const model: ThemeModel = async () => {
      called = true;
      return ["Patience"];
    };
    let fellBack = false;
    const fb = () => {
      fellBack = true;
      return ["Provision & debt"];
    };
    expect(await understandThemes("   ", VALID, model, fb)).toEqual([]);
    expect(called).toBe(false);
    expect(fellBack).toBe(false);
  });
});

describe("THEME_SYSTEM_PROMPT keeps its teeth", () => {
  test("binds the model to the provided list only", () => {
    expect(THEME_SYSTEM_PROMPT.toLowerCase()).toContain("only from the provided list");
  });
  test("forbids inventing a theme", () => {
    expect(THEME_SYSTEM_PROMPT.toLowerCase()).toContain("never invent");
  });
  test("permits an empty answer when nothing fits", () => {
    expect(THEME_SYSTEM_PROMPT.toLowerCase()).toContain("empty list");
  });
  test("classifies a feeling, does not write or interpret", () => {
    expect(THEME_SYSTEM_PROMPT.toLowerCase()).toContain("feeling");
    expect(THEME_SYSTEM_PROMPT.toLowerCase()).toContain("not writing");
  });
});
