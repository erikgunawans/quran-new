import { describe, expect, test } from "bun:test";
import {
  TRUTH_CANONICAL,
  ayahId,
  surahId,
  translationId,
  type Ayah,
  type CanonicalDataset,
  type Surah,
  type Translation,
} from "../src/domain/canonical.ts";
import {
  TRUTH_INTERPRETIVE,
  tafsirPassageId,
  tafsirSourceId,
  type InterpretiveDataset,
  type TafsirPassage,
  type TafsirSource,
} from "../src/domain/interpretive.ts";
import { cleanText, parseTafsirDump, toTafsirSource } from "../src/ingest/parse-interpretive.ts";
import { sourceById } from "../src/ingest/sources.ts";
import { IntegrityError, validateCanonical } from "../src/ingest/validate.ts";
import { validateInterpretive } from "../src/ingest/validate-interpretive.ts";

const AYAH = ayahId(1, 1);

function canon(translations: Translation[] = []): CanonicalDataset {
  const surahs: Surah[] = [
    {
      id: surahId(1),
      truth_class: TRUTH_CANONICAL,
      number: 1,
      name_ar: "الفاتحة",
      name_translit: "Al-Faatiha",
      name_en: "The Opening",
      revelation_type: "meccan",
      order_revealed: 5,
      ayah_count: 1,
      ruku_count: 1,
    },
  ];
  const ayahs: Ayah[] = [
    { id: AYAH, truth_class: TRUTH_CANONICAL, surah_number: 1, ayah_number: 1, text_uthmani: "بِسْمِ" },
  ];
  return { surahs, ayahs, translations };
}

const src = (
  slug: string,
  tier: 1 | 2 | 3 = 1,
  role: "primary" | "companion" | "reference" = "reference",
): TafsirSource => ({
  id: tafsirSourceId(slug),
  truth_class: TRUTH_INTERPRETIVE,
  name: slug,
  author: `Author ${slug}`,
  lang: "id",
  era: "Classical",
  authority_tier: tier,
  display_role: role,
});

const passage = (slug: string): TafsirPassage => ({
  id: tafsirPassageId(slug, 1, 1),
  truth_class: TRUTH_INTERPRETIVE,
  source_id: tafsirSourceId(slug),
  ayah_id: AYAH,
  surah_number: 1,
  ayah_number: 1,
  text: `commentary from ${slug}`,
  text_lang: "id",
});

const interp = (): InterpretiveDataset => ({
  tafsir_sources: [src("tafsiriyah-thalib", 3, "primary"), src("ibn-kathir"), src("as-saadi", 2)],
  tafsir_passages: [passage("ibn-kathir"), passage("as-saadi")],
});

/** Kemenag literal translation — the permanent companion. */
const companion = (): Translation => ({
  id: translationId("kemenag", 1, 1),
  truth_class: TRUTH_CANONICAL,
  translation_type: "literal",
  ayah_id: AYAH,
  lang: "id",
  translator: "Kementerian Agama Republik Indonesia",
  text: "Dengan nama Allah",
  display_role: "companion",
});

/** Tafsiriyah — the primary voice, always attributed. */
const primaryVoice = (): Translation => ({
  id: translationId("tafsiriyah-thalib", 1, 1),
  truth_class: "interpretive",
  translation_type: "interpretive",
  ayah_id: AYAH,
  lang: "id",
  translator: "Ustadz Muhammad Thalib",
  text: "Dengan nama Allah yang Mahaluas belas kasih-Nya",
  source_id: tafsirSourceId("tafsiriyah-thalib"),
  authority_tier: 3,
  display_role: "primary",
});

const full = () => canon([companion(), primaryVoice()]);

const violations = (fn: () => unknown): string[] => {
  try {
    fn();
    return [];
  } catch (e) {
    if (e instanceof IntegrityError) return [...e.violations];
    throw e;
  }
};

describe("cleanText", () => {
  test("strips markup and collapses whitespace but never paraphrases", () => {
    expect(cleanText("<p>Segala   puji<br/>bagi Allah</p>")).toBe("Segala puji bagi Allah");
  });
  test("preserves wording verbatim — evidence_span substring checks depend on it", () => {
    const original = "Dengan nama Allah yang Mahaluas belas kasih-Nya";
    expect(cleanText(original)).toBe(original);
  });
});

describe("interpretive gates", () => {
  test("a plural, attributed corpus passes", () => {
    const report = validateInterpretive(full(), interp());
    expect(violations(() => validateInterpretive(full(), interp()))).toEqual([]);
    expect(report.checks.some((c) => c.name === "plurality")).toBe(true);
  });

  test("rejects a single-voice corpus — one voice reads as authoritative", () => {
    const single: InterpretiveDataset = {
      tafsir_sources: [src("ibn-kathir", 1, "primary")],
      tafsir_passages: [passage("ibn-kathir")],
    };
    expect(violations(() => validateInterpretive(full(), single)).join()).toMatch(
      /plural attribution requires at least 2/,
    );
  });

  test("rejects a passage whose source was never declared (provenance hole)", () => {
    const bad: InterpretiveDataset = { ...interp(), tafsir_passages: [passage("ghost-scholar")] };
    expect(violations(() => validateInterpretive(full(), bad)).join()).toMatch(/unknown source/);
  });

  test("rejects a passage anchored to a nonexistent ayah", () => {
    const orphan = { ...passage("ibn-kathir"), ayah_id: ayahId(99, 99) };
    const bad: InterpretiveDataset = { ...interp(), tafsir_passages: [orphan, passage("as-saadi")] };
    expect(violations(() => validateInterpretive(full(), bad)).join()).toMatch(
      /outside the canonical corpus/,
    );
  });

  test("rejects a declared source that contributes nothing", () => {
    const bad: InterpretiveDataset = {
      tafsir_sources: [src("ibn-kathir"), src("as-saadi"), src("silent")],
      tafsir_passages: [passage("ibn-kathir"), passage("as-saadi")],
    };
    expect(violations(() => validateInterpretive(full(), bad)).join()).toMatch(/contributes nothing/);
  });
});

describe("display roles — the honesty gate", () => {
  test("rejects two sources both claiming to be the primary voice", () => {
    const bad: InterpretiveDataset = {
      tafsir_sources: [src("tafsiriyah-thalib", 3, "primary"), src("ibn-kathir", 1, "primary")],
      tafsir_passages: [passage("tafsiriyah-thalib"), passage("ibn-kathir")],
    };
    expect(violations(() => validateInterpretive(full(), bad)).join()).toMatch(
      /claim display_role "primary"/,
    );
  });

  test("rejects a corpus with no primary voice", () => {
    const bad: InterpretiveDataset = {
      tafsir_sources: [src("ibn-kathir"), src("as-saadi", 2)],
      tafsir_passages: [passage("ibn-kathir"), passage("as-saadi")],
    };
    expect(violations(() => validateInterpretive(full(), bad)).join()).toMatch(
      /reading experience has no voice/,
    );
  });

  /**
   * The load-bearing test. Leading with an interpretive translation is only honest because
   * the official literal one is permanently alongside it. Remove the companion and the
   * product becomes exactly the thing it refuses to be — so the build must refuse to ship.
   */
  test("REFUSES to ship an interpretive primary with no literal companion", () => {
    const noCompanion = canon([primaryVoice()]); // Tafsiriyah alone, Kemenag dropped
    expect(violations(() => validateInterpretive(noCompanion, interp())).join()).toMatch(
      /only honest if the literal one is always available alongside/,
    );
  });
});

describe("the literal ⟺ canonical invariant", () => {
  const interpretiveTranslation = (over: Partial<Translation> = {}): Translation => ({
    id: translationId("tafsiriyah-thalib", 1, 1),
    truth_class: "interpretive",
    translation_type: "interpretive",
    ayah_id: AYAH,
    lang: "id",
    translator: "Ustadz Muhammad Thalib",
    text: "…belas kasih-Nya kepada orang mukmin…",
    source_id: tafsirSourceId("tafsiriyah-thalib"),
    authority_tier: 3,
    ...over,
  });

  test("an interpretive translation may NOT be tagged canonical", () => {
    const bad = interpretiveTranslation({ truth_class: TRUTH_CANONICAL });
    const ds = canon([bad]);
    expect(violations(() => validateCanonical(ds)).join()).toMatch(
      /interpretive translations must NOT be canonical/,
    );
  });

  test("an interpretive translation without attribution is a provenance hole", () => {
    const { source_id: _drop, ...rest } = interpretiveTranslation();
    const ds = canon([rest as Translation]);
    expect(violations(() => validateCanonical(ds)).join()).toMatch(/provenance hole/);
  });

  test("interpretive translations are exempt from the 6,236 literal-coverage gate", () => {
    // Only ONE interpretive translation, yet coverage must not be demanded of it.
    const ds = canon([interpretiveTranslation()]);
    expect(violations(() => validateCanonical(ds)).join()).not.toMatch(/must cover all/);
  });
});

describe("source registry", () => {
  test("Tafsiriyah is the PRIMARY voice and tier 3 — the two axes are independent", () => {
    const s = sourceById("tafsiriyah-thalib");
    expect(s.translation_type).toBe("interpretive");
    expect(s.author).toBe("Ustadz Muhammad Thalib");
    // It leads the reading experience (the mission)...
    expect(s.display_role).toBe("primary");
    // ...while carrying contemporary weight for grounding doctrinal claims (the scholarship).
    expect(s.authority_tier).toBe(3);
  });

  test("the Tafsiriyah note discloses what it is, without euphemism", () => {
    const note = sourceById("tafsiriyah-thalib").note ?? "";
    expect(note).toMatch(/meaning-based/i); // it says what it IS
    expect(note).toMatch(/kemenag/i); // it names its relationship to the official translation
    expect(note).toMatch(/debated|contested/i); // it does not hide the dispute
    expect(note).toMatch(/never presented as the bare word/i); // the line we hold
  });

  test("Kemenag is the literal COMPANION — always available, never removed", () => {
    const s = sourceById("tanzil-id-kemenag");
    expect(s.translation_type).toBe("literal");
    expect(s.display_role).toBe("companion");
  });

  test("toTafsirSource refuses a source missing attribution", () => {
    const { author: _a, ...bare } = sourceById("tafsir-as-saadi-id");
    expect(() => toTafsirSource(bare)).toThrow(/provenance hole/);
  });

  test("parseTafsirDump refuses an empty edition rather than emitting nothing", () => {
    // This is exactly the `in-tafsir-jalalayn` failure mode: every surah returns [].
    const empty = JSON.stringify([{ surah: 1, payload: [] }]);
    expect(() => parseTafsirDump(empty, sourceById("tafsir-as-saadi-id"))).toThrow(
      /no tafsir passages parsed/,
    );
  });
});
