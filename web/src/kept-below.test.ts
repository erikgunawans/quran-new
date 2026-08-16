import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { keptBelow } from "./kept-below.ts";
import type { Turn } from "./thread.ts";

/**
 * ISC-476 — the scholar's card must never be taken off the screen to make room for a composed answer.
 *
 * Measured on prod 2026-08-17: the principled turn painted at ~T+12 s and the AI upgrade replaced the
 * whole node at ~T+16 s, so a reader who had begun on Ustadz Muhammad Thalib's entries lost them
 * mid-sentence. Erik's call was to keep them below the composed answer rather than stop showing them.
 *
 * These assert the INVARIANT (which superseded turns are carried, and that the late path carries one
 * at all), not the markup — the rendered card is `renderTurn`'s existing output and is verified live.
 */
describe("keptBelow", () => {
  it("carries the Indeks Tematik entries, which are the scholar's own lines", () => {
    const superseded: Turn = { q: "apa itu zakat", kind: "knowledge", slug: "ibadah" };
    expect(keptBelow(superseded)).toEqual({ kind: "knowledge", slug: "ibadah" });
  });

  it("carries the reviewed-aqidah answer, which is the ustadz's own prose", () => {
    const superseded: Turn = { q: "siapakah Allah", kind: "aqidah", id: "aq-1" };
    expect(keptBelow(superseded)).toEqual({ kind: "aqidah", id: "aq-1" });
  });

  it("keeps NOTHING when the answer won the race — no card was ever painted", () => {
    expect(keptBelow(undefined)).toBeUndefined();
  });

  /**
   * Each of these says some version of "I am not answering this" in OUR voice, or is a verse card the
   * composed answer already re-renders from its own refs. Printing either under a composed answer
   * would contradict it or duplicate it — the fix is about not removing the SCHOLAR's work.
   */
  it.each([
    ["silence", { q: "x", kind: "silence" }],
    ["refer", { q: "x", kind: "refer" }],
    ["count-defer", { q: "x", kind: "count-defer" }],
    ["hadith-defer", { q: "x", kind: "hadith-defer" }],
    ["answer-blocked", { q: "x", kind: "answer-blocked" }],
    ["ayah", { q: "x", kind: "ayah", surah: 2, ayah: 255 }],
    ["hits", { q: "x", kind: "hits", refs: ["2:255"] }],
  ] as [string, Turn][])("does not carry a %s turn", (_name, turn) => {
    expect(keptBelow(turn)).toBeUndefined();
  });
});

/**
 * The wipe happened at ONE call site: the late upgrade rebuilt the turn without the card and assigned
 * over `answer.innerHTML`. `renderTurn` now appends whatever `below` holds, so the only thing that can
 * silently restore the old behaviour is the late path forgetting to pass the turn it is superseding.
 * That argument is the guard, so that argument is what this asserts.
 */
describe("the late upgrade path", () => {
  const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");

  it("passes the superseded turn to applyAi so the card is carried, not dropped", () => {
    expect(main).toContain("applyAi(v, fast)");
  });

  it("renders the carried card below the composed prose rather than instead of it", () => {
    // aiHtml is the composed answer; `below` is concatenated AFTER it, never in place of it.
    expect(main).toMatch(/aiHtml\([^)]*\)\)\s*\+\s*below/u);
  });
});
