import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * The two sentences `knowledgeHtml` speaks in the app's own voice, pinned as SHIPPED SOURCE.
 *
 * `knowledgeHtml` is private to `main.ts` and its output is a template string, so the only way to
 * assert what the reader is actually told is to read the file — the lesson from the refusal-copy
 * defect, where copy that leaked the answer passed every behavioural test in the suite.
 */
const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");

/**
 * THE ZERO-ENTRY POINTER TOLD A NARROW QUESTION IT WAS TOO BROAD.
 *
 * Measured on prod: `apa yang al quran katakan tentang neraka` routes to the SCRIPTURE chapter,
 * because the literal words `al quran` capture routing and `neraka` is ignored. `knowledge.ts` then
 * empties `entries` — its rule is that the ROUTED chapter decides whether there is an answer — and
 * the reader was told *"Pertanyaan soal Al-Qur'an, Taurat, Injil dan Zabur itu luas"* and asked to
 * narrow a question that was already narrow.
 *
 * Two things were wrong with that: it named a cause that was not the cause, and the action it asked
 * for was the one thing the reader could not do anything with. The copy now names the real cause —
 * no line in THIS chapter matched — which is true whichever way routing landed.
 */
describe("the zero-entry pointer names the real cause", () => {
  it("no longer blames the question's breadth", () => {
    expect(main).not.toContain("itu luas");
  });

  it("no longer asks the reader to narrow a question that may already be narrow", () => {
    expect(main).not.toContain("persempit pertanyaanmu");
  });

  it("says what actually happened: nothing in the routed chapter matched", () => {
    expect(main).toContain("aku nggak menemukan satu baris pun yang benar-benar menjawab pertanyaanmu");
  });

  it("names the chapter it looked in, so the reader can judge the routing themselves", () => {
    // The category is what routing chose. Printing it is what lets a reader see that a question about
    // neraka was answered out of the chapter about scripture.
    expect(main).toMatch(/Di bab <b>\$\{esc\(k\.category\)\}<\/b>/u);
  });

  it("still refuses to invent, and still offers the honest way forward", () => {
    expect(main).toContain("aku nggak mau ngarang");
    expect(main).toContain("Coba tanya pakai kata lain");
  });
});

/**
 * THE ENTRY LIST WAS CREDITED TO THE SCHOLAR, SELECTION AND ORDER INCLUDED.
 *
 * *"Ini yang {author} kumpulkan soal {category}"* reads as: this is his collection on the topic. It
 * is not. `knowledge.ts` scores every entry against the question, sorts by that score, dedupes, and
 * `.slice(0, MAX_ENTRIES)` — eight lines out of up to 626. The lines are verbatim his; the eight and
 * the order are ours, and on a scholarship surface an unmarked subset presented as the whole is the
 * overstatement the review gate exists to catch.
 *
 * Both branches are asserted. The spans-chapters branch is the one that fires on the borrowed-line
 * case and is the easier of the two to fix on one side only.
 */
describe("the entry list is credited honestly", () => {
  it("no longer presents our top-8 as the scholar's own collection", () => {
    expect(main).not.toMatch(/Ini yang <b>\$\{esc\(k\.source\.author\)\}<\/b> kumpulkan/u);
  });

  it("says the lines are the ones that fit the question, not the whole chapter", () => {
    const fits = main.match(/yang paling cocok dengan pertanyaanmu/gu) ?? [];
    // One per branch: routed-chapter-only and spans-chapters.
    expect(fits.length).toBe(2);
  });

  it("names WHO selected and ordered them, on both branches", () => {
    const ours = main.match(/Pemilihan dan urutannya dari kami, bukan dari beliau\./gu) ?? [];
    expect(ours.length).toBe(2);
  });

  it("still says the lines are not our interpretation, and still cites each one", () => {
    const notOurs = main.match(/Aku nggak menafsirkan sendiri, tiap baris langsung menunjuk ke ayatnya/gu) ?? [];
    expect(notOurs.length).toBe(2);
  });

  it("still names the borrowed-chapter case rather than filing it silently", () => {
    expect(main).toContain("dan bab lain yang membahas hal serupa");
  });
});
