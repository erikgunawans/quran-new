/**
 * The promise of "Kejutkan aku" is that it always lands somewhere real. If a draw returned silence,
 * the one affordance meant to reassure a lost 2am reader would instead say "I have nothing." So every
 * feeling prompt is run through the ACTUAL retrieval against the shipped corpus, and every reading
 * prompt through the ACTUAL ref parser. A prompt that stops landing fails the build, not the reader.
 */
import { describe, expect, test } from "bun:test";
import { LUCKY_FEELINGS, LUCKY_READINGS, LUCKY_PROMPTS, pickLucky } from "./lucky.ts";
import { retrieve, isRulingQuestion, type Corpus } from "./retrieve.ts";
import { parseRef } from "./quran.ts";

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

describe("Kejutkan aku — every feeling prompt lands on a real verse", () => {
  test.each([...LUCKY_FEELINGS])("'%s' retrieves ≥1 verse", (prompt) => {
    // A lucky feeling must never trip the honesty floor (that would be a ruling, not a feeling) and
    // must actually retrieve — the exact experience a click produces.
    expect(isRulingQuestion(prompt)).toBe(false);
    expect(retrieve(corpus, prompt, 2, []).length).toBeGreaterThan(0);
  });
});

describe("Kejutkan aku — every reading prompt resolves to scripture", () => {
  test.each([...LUCKY_READINGS])("'%s' parses to a surah or ayah", (prompt) => {
    const kind = parseRef(prompt).kind;
    expect(["surah", "ayah"]).toContain(kind);
  });
});

describe("pickLucky", () => {
  test("never repeats the previous prompt on consecutive draws", () => {
    let prev: string | null = null;
    // Walk a deterministic sequence; each draw must differ from the last.
    const seq = [0.0, 0.0, 0.5, 0.5, 0.99, 0.99];
    let i = 0;
    for (let n = 0; n < 5; n++) {
      const next = pickLucky(prev, () => seq[i++ % seq.length]!);
      expect(next).not.toBe(prev);
      expect(LUCKY_PROMPTS).toContain(next);
      prev = next;
    }
  });

  test("the pool is drawn from both halves of the app", () => {
    expect(LUCKY_FEELINGS.length).toBeGreaterThan(10);
    expect(LUCKY_READINGS.length).toBeGreaterThan(0);
    expect(new Set(LUCKY_PROMPTS).size).toBe(LUCKY_PROMPTS.length); // no duplicates
  });
});
