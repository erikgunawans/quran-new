import { describe, expect, test } from "bun:test";
import { verseEl, type VerseCard } from "./verse.ts";

/**
 * The product's core concept, and whether it is actually explained.
 *
 * Two critiques scored Help & Documentation 1/4 — the only heuristic that never moved. The whole
 * product hinges on the difference between terjemah makna and terjemah harfiah, and the app never
 * once told anyone what it was.
 */

// The explainer builds its DOM lazily against `document`, which does not exist under `bun test`.
// The markup itself is what we assert on, so we read the source — the same trick the corpus tests
// use to gate the shipped artifact rather than the intent.
// Backslashes are stripped so an escaped apostrophe in the source (`raaji\'uun`) matches the
// string a reader actually sees (`raaji'uun`). We assert on what lands on the page, not on how
// the literal happened to be quoted.
const src = (await Bun.file("web/src/explain.ts").text()).replace(/\\/g, "");

describe("the explainer exists and says the necessary things", () => {
  test("it answers the actual question a first-timer has", () => {
    expect(src).toContain("Kenapa ada dua terjemahan?");
  });

  test("it defines BOTH kinds, not just the one we lead with", () => {
    expect(src).toContain("Terjemahan makna");
    expect(src).toContain("Terjemahan harfiah");
    expect(src).toContain("kata per kata"); // what harfiah means
    expect(src).toContain("maksud"); // what makna means
  });

  test("it admits the meaning-based rendering is an interpretation", () => {
    // The most important sentence in the panel. Leading with a rendering that contains a human's
    // choice, without saying so, would be the same dishonesty the whole corpus design forbids.
    expect(src).toContain("wilayah tafsir");
  });
});

describe("it SHOWS rather than lectures — 2:156 is the argument", () => {
  test("it uses the verse recited at every Muslim death", () => {
    expect(src).toContain("2:156");
  });

  test("it quotes Kemenag leaving the Arabic UNTRANSLATED — the wound the product exists to heal", () => {
    expect(src).toContain("Inna lillaahi wa innaa ilaihi raaji'uun");
  });

  test("it quotes the Tafsiriyah actually rendering it in Indonesian", () => {
    expect(src).toContain("Kami semua adalah milik Allah");
  });

  test("it names why the literal rendering fails there", () => {
    expect(src).toContain("tidak memberitahu apa-apa");
  });
});

describe("Anti: it is not advertising", () => {
  // An explainer that only sells the product is marketing. This one has to be trustworthy,
  // because trust IS the thesis.
  test("it admits terjemah makna is NOT always better", () => {
    expect(src).toContain("tidak selalu lebih baik");
  });

  test("it names 94:5 — where our own primary voice fails", () => {
    expect(src).toContain("94:5");
    expect(src).toContain("sesudah kesulitan ada kemudahan");
  });

  test("it hands the judgment to the reader, not to Nur", () => {
    expect(src).toContain("Kamu yang menilai");
  });

  test("Anti: it never claims one rendering is the correct one", () => {
    for (const claim of ["yang benar adalah", "terjemahan yang salah", "harus kamu percaya"]) {
      expect(src).not.toContain(claim);
    }
  });
});

describe("it is reachable from the point of confusion", () => {
  const card: VerseCard = {
    ref: "2:156",
    surah: 2,
    ayah: 156,
    surah_name: "Al-Baqarah",
    arabic: "ٱلَّذِينَ إِذَآ أَصَٰبَتْهُم مُّصِيبَةٌ",
    primary: { text: "Kami semua adalah milik Allah.", translator: "Ustadz Muhammad Thalib" },
    companion: { text: "Inna lillaahi wa innaa ilaihi raaji'uun.", translator: "Kemenag" },
  };

  const html = verseEl(card);

  test("BOTH translation labels are pressable — the label you're confused by IS the button", () => {
    expect(html).toContain('data-explain="open"');
    // once per reading: makna and harfiah
    expect(html.match(/data-explain="open"/g)?.length).toBe(2);
  });

  test("the affordance is a real button, not a div with a click handler", () => {
    expect(html).toContain('<button class="chip lead" data-explain="open"');
    expect(html).toContain('<button class="chip " data-explain="open"');
  });

  test("it carries an accessible name that states what pressing it does", () => {
    expect(html).toContain("apa bedanya? Buka penjelasan");
  });
});
