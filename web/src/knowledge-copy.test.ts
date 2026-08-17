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
