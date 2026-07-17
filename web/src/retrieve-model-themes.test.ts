import { describe, expect, test } from "bun:test";
import { MODEL_THEME_MATCH, retrieve, type Corpus, type Verse } from "./retrieve.ts";

function verse(ref: string, theme: string, text: string): Verse {
  const [surah, ayah] = ref.split(":").map(Number) as [number, number];
  return {
    id: `q-${ref}`,
    ref,
    surah,
    ayah,
    surah_name: "X",
    surah_ar: "X",
    arabic: "…",
    theme,
    why: "",
    primary: { text, translator: "T", translation_type: "interpretive" },
    companion: null,
    tafsir: [],
  };
}

const corpus: Corpus = {
  corpus_version: "test",
  sources: [],
  themes: ["Grief & loss", "Gratitude"],
  verses: [
    verse("2:156", "Grief & loss", "sesungguhnya kami milik Allah"),
    verse("14:7", "Gratitude", "jika kalian bersyukur"),
  ],
};

describe("retrieve — model themes are additive, keywords keep precedence", () => {
  test("no keyword and no model theme → silence (unchanged behavior)", () => {
    expect(retrieve(corpus, "qwerty zzz")).toEqual([]);
  });

  test("a model theme surfaces the verse the keywords missed, with honest provenance", () => {
    const hits = retrieve(corpus, "qwerty zzz", 2, ["Grief & loss"]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.verse.ref).toBe("2:156");
    expect(hits[0]!.matched).toContain(MODEL_THEME_MATCH);
  });

  test("an off-corpus model theme surfaces nothing", () => {
    expect(retrieve(corpus, "qwerty zzz", 2, ["Politik"])).toEqual([]);
  });

  test("when a keyword matches, the keyword wins — no model provenance marker", () => {
    const hits = retrieve(corpus, "aku sedih", 2, ["Grief & loss"]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.verse.ref).toBe("2:156");
    expect(hits[0]!.matched).toContain("sedih");
    expect(hits[0]!.matched).not.toContain(MODEL_THEME_MATCH);
  });

  test("passing no model themes is byte-identical to the old two-arg call", () => {
    expect(retrieve(corpus, "aku sedih")).toEqual(retrieve(corpus, "aku sedih", 2, []));
  });
});
