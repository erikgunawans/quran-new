import { describe, expect, test } from "bun:test";
import { knowledgeOnly, looksFactual } from "./question-form.ts";

/**
 * The whole point of this predicate is knowing when NOT to fire. A false positive sends someone in
 * distress to a chapter of definitions; a false negative just leaves today's behaviour in place.
 * So the "must stay feeling" list is the one that matters most here.
 */
describe("factual shapes — these should reach the knowledge lanes first", () => {
  test.each([
    "apa itu zakat",
    "apa itu takdir",
    "apa itu taubat",
    "zina itu apa",
    "malaikat itu apaan",
    "apa arti ikhlas",
    "apa maksud tawakal",
    "apa bedanya iman dan islam",
    "siapa allah",
    "allah itu siapa sih ?",
    "siapakah nabi muhammad",
    "di mana allah",
    "dimana allah",
    "kapan hari kiamat",
    "berapa rakaat sholat subuh",
    "hukum pacaran dalam islam",
    "homo itu hukumnya apa sih di islam?",
    "hukum ghibah",
    "cara wudhu yang benar",
    "apa dalil puasa sunnah",
  ])("%j is factual", (q) => {
    expect(looksFactual(q)).toBe(true);
  });
});

describe("a person telling us something keeps the feeling lane", () => {
  /**
   * Every one of these names a word the topical index also covers — takdir, utang, sedih, doa,
   * sakit, cerai. Without the first-person guard they would be pulled out of the lane built for
   * them and answered with definitions.
   */
  test.each([
    "aku bingung sama takdir",
    "aku ngerasa gagal terus",
    "aku sedang sedih",
    "aku capek banget",
    "utang numpuk banget",
    "saya sakit dan ga sembuh-sembuh",
    "gue takut mati",
    "aku kangen ibu",
    "aku mau cerai",
    "aku udah berdoa tapi belum dikabulkan",
    "aku ngerasa jauh dari allah",
    "kami lagi susah ekonomi",
  ])("%j is NOT factual", (q) => {
    expect(looksFactual(q)).toBe(false);
  });

  test("a first-person opener wins even when the sentence also looks like a question", () => {
    // Names a subject AND uses a question word, but it is still someone describing their own state.
    expect(looksFactual("aku bingung hukumnya gimana")).toBe(false);
    expect(looksFactual("saya ga tau apa itu ikhlas tapi aku pengen belajar")).toBe(false);
  });
});

describe("edges", () => {
  test("empty and whitespace are never factual", () => {
    expect(looksFactual("")).toBe(false);
    expect(looksFactual("   ")).toBe(false);
  });

  test("a bare subject word is not a factual SHAPE — routing handles those separately", () => {
    expect(looksFactual("homoseksual")).toBe(false);
    expect(looksFactual("zakat")).toBe(false);
  });
});

/**
 * Erik's 2026-07-22 question set exposed all of these. Every one was reaching the FEELING lane and
 * being answered with a consolation verse — counted as "answered" in the audit, and wrong.
 */
describe("casual chat shapes (Erik's set)", () => {
  test.each([
    "Kenapa syirik dibilang sebagai dosa besar yang paling parah?",
    "Apa aja sih yang termasuk dalam kategori dosa-dosa besar?",
    "Apakah dosa besar bisa diampuni tanpa harus taubat nasuha?",
    "Beda antara takdir mubram sama takdir muallaq itu apa ya?",
    "Sebutkan rukun Islam yang 5 dan contoh simpel pengamalannya",
    "Rukun Iman ada berapa aja ya? Tolong urutin dari yang pertama sampai terakhir",
    "Apa aja keutamaan kalau kita rajin ngebaca Ayat Kursi",
    "Kalau pacarannya cuma lewat chat tanpa ketemu dan ngga ngomong jorok, tetep dosa ngga?",
    "Salatnya orang yang bertato itu tetep sah atau ngga ya?",
  ])("%j is knowledge-only — a feeling answer here would be wrong", (q) => {
    expect(looksFactual(q)).toBe(true);
    expect(knowledgeOnly(q)).toBe(true);
  });
});

describe("how-to keeps its fall-through", () => {
  /**
   * "gimana cara berbakti sama orang tua" regressed from two well-chosen verses on honouring
   * parents to nothing at all when every factual shape was made knowledge-only. Scripture DOES
   * answer "how do I do X"; it does not answer "which things count as X".
   */
  test.each(["gimana cara berbakti sama orang tua", "bagaimana cara sholat", "cara wudhu yang benar"])(
    "%j prefers knowledge but may still fall through",
    (q) => {
      expect(looksFactual(q)).toBe(true);
      expect(knowledgeOnly(q)).toBe(false);
    },
  );
});

describe("first person still wins over every new shape", () => {
  test.each([
    "aku ngerasa dosaku terlalu banyak",
    "kenapa aku selalu gagal",
    "aku malas ibadah",
    "kenapa hidupku susah terus ya",
  ])("%j stays in the feeling lane", (q) => {
    expect(looksFactual(q)).toBe(false);
    expect(knowledgeOnly(q)).toBe(false);
  });
});
