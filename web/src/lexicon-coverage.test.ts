import { describe, expect, test } from "bun:test";
import { lexiconThemes, openerThemes } from "./retrieve.ts";

/**
 * The lexicon's theme keys must be real themes.
 *
 * LEXICON is `Record<string, string[]>` with 83 hand-typed English keys that have to match the
 * `Theme` union in src/review/problem-verses.ts exactly — two files on opposite sides of a build
 * boundary that cannot import each other. A single typo produces a feeling the keyword path can
 * never reach: the verse stays findable only through the model classifier, losing the transparent
 * "you typed this word" explanation the lexicon exists to provide. It fails to NOTHING, with no
 * error from tsc and no failing test.
 *
 * At twelve themes that was checkable by eye. At eighty-three it is not, and this session added
 * seventy-one of them by hand in three separate passes.
 */
const corpus = (await Bun.file("web/public/corpus.json").json()) as { themes: string[] };

describe("LEXICON keys correspond to real corpus themes", () => {
  test("every lexicon key is a theme that exists in the shipped corpus", () => {
    const themes = new Set(corpus.themes);
    const orphans = lexiconThemes().filter((t) => !themes.has(t));
    // An orphan is almost always a typo — it silently disables that feeling's keyword path.
    expect(orphans).toEqual([]);
  });

  test("every corpus theme has keyword coverage", () => {
    const covered = new Set(lexiconThemes());
    const uncovered = corpus.themes.filter((t) => !covered.has(t));
    // A theme with no keywords is reachable only via the model classifier — real, but it loses the
    // transparent explanation and stops working entirely when the classifier is unavailable.
    expect(uncovered).toEqual([]);
  });

  test("OPENERS is allowed to be partial, and falls back", () => {
    // Unlike LEXICON, openers intentionally cover a subset — compose() falls to OPENER_DEFAULT.
    // Pinned so the gap is a known state rather than a surprise, and so it can be watched shrinking.
    expect(openerThemes().length).toBeGreaterThan(0);
    expect(openerThemes().every((t) => corpus.themes.includes(t))).toBe(true);
  });
});
