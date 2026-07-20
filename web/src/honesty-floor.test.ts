import { describe, expect, test } from "bun:test";
import { keywordThemeHits, retrieve, type Corpus } from "./retrieve.ts";

/**
 * The honesty floor, as a PROPERTY rather than a list of eight strings.
 *
 * The old floor test pinned eight hardcoded questions written when the lexicon had twelve themes.
 * Expanding to eighty-three breached it on every one of them and the suite stayed green, because the
 * pinned strings happened to contain none of the seventy-one new keywords:
 *
 *   "hukum cerai dalam islam"       -> 4:130 [Divorce]
 *   "hukum menunda sholat"          -> 87:8  [Laziness]
 *   "apakah sombong itu dosa besar" -> 3:135 [Forgiveness & despair]
 *
 * Each was wrapped in "Ada ayat yang mungkin nyambung sama yang kamu ceritain" — a confident
 * feeling answer to a request for a RULING. That is verbatim what retrieve.test.ts's own header
 * calls the trust-destroying failure: a wrong answer dressed exactly like a right one.
 *
 * A list decays every time the corpus grows. This asserts over the whole lexicon instead, so the
 * floor re-proves itself on each expansion.
 */
const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

/** How Indonesians actually ask for a ruling or a procedure. */
const CARRIERS = [
  (t: string) => `hukum ${t} dalam islam`,
  (t: string) => `apa hukum ${t}`,
  (t: string) => `apakah ${t} wajib`,
  (t: string) => `${t} itu haram atau nggak`,
  (t: string) => `${t} boleh ga sih`,
  (t: string) => `gimana cara ${t}`,
  (t: string) => `berapa ${t}`,
];

/** Topical nouns that appear in the lexicon AND in real ruling questions — the collision surface. */
const RULING_SUBJECTS = [
  "zakat", "sedekah", "cerai", "sholat", "puasa", "ghibah", "riba",
  "menunda sholat", "musik", "pacaran", "nikah", "hijrah", "jodoh", "harta",
];

/** Traits, not practices — "gimana cara sombong" is not a question anyone asks, but the ruling
 *  framings still must not answer with a feeling verse. */
const RULING_TRAITS = ["sombong", "dengki", "riya", "kikir"];

describe("a ruling question never gets a feeling answer", () => {
  test.each(RULING_SUBJECTS)("no carrier turns '%s' into a feeling verse", (subject) => {
    const leaks = CARRIERS.map((c) => c(subject)).filter((q) => retrieve(corpus, q, 2, []).length > 0);
    expect(leaks).toEqual([]);
  });

  test.each(RULING_TRAITS)("ruling framings of the trait '%s' stay silent", (trait) => {
    const framings = [`hukum ${trait} dalam islam`, `apakah ${trait} itu dosa besar`, `${trait} itu haram ga`];
    expect(framings.filter((q) => retrieve(corpus, q, 2, []).length > 0)).toEqual([]);
  });

  test("the originally pinned cases still hold", () => {
    for (const q of ["gimana cara sholat tahajud", "berapa rakaat sholat dhuha", "pacaran haram ga"]) {
      expect(retrieve(corpus, q, 2, [])).toEqual([]);
    }
  });
});

/**
 * Over-stripping.
 *
 * stemCandidates removes a prefix and up to two suffixes with no lexical validation, so ordinary
 * words decompose into short lexicon terms: "dimatikan" -> di+MATI+kan, "ketua" -> ke+TUA,
 * "kekayaan" -> ke+KAYA+an. At twelve broad themes this was harmless. At eighty-three, every short
 * term added ("tua", "mati", "kaya", "sepi", "uang") is a new false-positive surface — and
 * "lampu dimatikan jam 10" returned 29:57, "every soul will taste death".
 */
describe("ordinary Indonesian does not manufacture a feeling", () => {
  test.each([
    "lampu dimatikan jam 10",
    "ketua rt kami galak",
    "wilayah kami luas",
    "distribusi barang lancar",
    "ruangan ini sempit",
    "jadwal keberangkatan pagi",
  ])("%s -> no feeling detected", (q) => {
    expect([...keywordThemeHits(q).keys()]).toEqual([]);
  });

  test("real feelings still land — the fix must not buy silence with deafness", () => {
    for (const q of ["aku udah gak kuat", "wajar ga sih kalau merasa iri", "dibully terus di sekolah", "patah hati banget"]) {
      expect(retrieve(corpus, q, 2, []).length).toBeGreaterThan(0);
    }
  });
});
