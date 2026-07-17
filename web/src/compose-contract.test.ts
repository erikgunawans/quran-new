import { describe, expect, test } from "bun:test";
import {
  composeContext,
  composeFraming,
  FRAMING_SYSTEM_PROMPT,
  type ComposeContext,
  type FramingModel,
} from "./compose-contract.ts";
import type { Hit, Verse } from "./retrieve.ts";

function makeHit(theme: string, ref = "94:5"): Hit {
  const [surah, ayah] = ref.split(":").map(Number) as [number, number];
  const verse: Verse = {
    id: `q-${ref}`,
    ref,
    surah,
    ayah,
    surah_name: "Ash-Sharh",
    surah_ar: "الشرح",
    arabic: "…",
    theme,
    why: "",
    primary: null,
    companion: null,
    tafsir: [],
  };
  return { verse, score: 20, matched: [theme] };
}

const FALLBACK = "Berat, ya. Ada ayat yang sering dibaca orang saat sedang seperti ini.";

describe("composeContext", () => {
  test("extracts primary theme and distinct theme count", () => {
    const ctx = composeContext([makeHit("Provision & debt"), makeHit("Hardship & ease")], "utang numpuk, capek");
    expect(ctx).not.toBeNull();
    expect(ctx!.theme).toBe("Provision & debt");
    expect(ctx!.themeCount).toBe(2);
    expect(ctx!.question).toBe("utang numpuk, capek");
  });

  test("returns null when there is nothing to frame", () => {
    expect(composeContext([], "apa saja")).toBeNull();
  });

  test("the model context carries no verse text or reference", () => {
    const ctx = composeContext([makeHit("Grief & loss")], "kehilangan ibu");
    // The ONLY keys are question, theme, themeCount — verse text/refs are structural, never fed in.
    expect(Object.keys(ctx as ComposeContext).sort()).toEqual(["question", "theme", "themeCount"]);
  });
});

describe("composeFraming — the wrap", () => {
  const goodModel: FramingModel = async () => "Berat ya. Aku di sini, nggak buru-buru.";
  const leakyModel: FramingModel = async () => "Ayat ini artinya kamu harus sabar.";
  const arabicModel: FramingModel = async () => "Tenang, اللَّه menyertaimu.";
  const refModel: FramingModel = async () => "Coba baca QS 94:5, itu untukmu.";
  const throwingModel: FramingModel = async () => {
    throw new Error("gateway timeout");
  };

  test("clean model prose is used", async () => {
    expect(await composeFraming([makeHit("Hardship & ease")], "capek", goodModel, FALLBACK)).toBe(
      "Berat ya. Aku di sini, nggak buru-buru.",
    );
  });

  test("authoring output degrades to the deterministic opener", async () => {
    expect(await composeFraming([makeHit("Patience")], "capek", leakyModel, FALLBACK)).toBe(FALLBACK);
  });

  test("Arabic in output degrades to the fallback", async () => {
    expect(await composeFraming([makeHit("Trust in God")], "bingung", arabicModel, FALLBACK)).toBe(FALLBACK);
  });

  test("a verse reference in output degrades to the fallback", async () => {
    expect(await composeFraming([makeHit("Hardship & ease")], "capek", refModel, FALLBACK)).toBe(FALLBACK);
  });

  test("a model error never propagates — it falls back", async () => {
    expect(await composeFraming([makeHit("Grief & loss")], "kehilangan", throwingModel, FALLBACK)).toBe(FALLBACK);
  });

  test("no hits → silence, and the model is never invoked", async () => {
    let called = false;
    const spy: FramingModel = async () => {
      called = true;
      return "seharusnya tidak dipanggil";
    };
    expect(await composeFraming([], "apa saja", spy, FALLBACK)).toBe("");
    expect(called).toBe(false);
  });
});

describe("FRAMING_SYSTEM_PROMPT keeps its teeth", () => {
  // If a careless edit guts the prompt, these fail rather than silently weakening the voice.
  test("forbids authoring ('artinya')", () => {
    expect(FRAMING_SYSTEM_PROMPT).toContain("artinya");
  });
  test("forbids Arabic script in output", () => {
    expect(FRAMING_SYSTEM_PROMPT.toLowerCase()).toContain("arabic");
  });
  test("forbids verse references", () => {
    expect(FRAMING_SYSTEM_PROMPT.toLowerCase()).toContain("reference");
  });
  test("states the point-never-author line", () => {
    expect(FRAMING_SYSTEM_PROMPT).toContain("POINT, never AUTHOR");
  });
  test("names the companion role and Indonesian-only output", () => {
    expect(FRAMING_SYSTEM_PROMPT.toLowerCase()).toContain("companion");
    expect(FRAMING_SYSTEM_PROMPT).toContain("Indonesian");
  });
});
