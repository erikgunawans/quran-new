import { describe, expect, test } from "bun:test";
import { compose, OPENERS } from "./retrieve.ts";
import type { Hit } from "./retrieve.ts";
import { guardComposeProse } from "./compose-guard.ts";

/**
 * The deterministic openers are the app's honest fallback voice — the line a reader sees whenever the
 * live framing model is down or its output was rejected. So every variant must (1) clear the egress
 * wall (no reference, no fatwa-shaped phrasing), (2) be replay-stable (same question → same line, or a
 * restored thread would rewrite itself), and (3) no longer speak the interpretive disclaimer, which is
 * now quiet chrome under the verses, not part of the spoken opener.
 */
const hitFor = (theme: string): Hit => ({ verse: { themes: [theme] } as Hit["verse"], score: 1, matched: [] });

// enough distinct seeds to land on every variant of a 2–3 entry list
const SEEDS = ["a", "bb", "ccc", "dddd", "eeeee", "ffffff", "ggggggg", "hhhhhhhh"];

describe("deterministic openers — every variant clears the wall", () => {
  for (const theme of Object.keys(OPENERS)) {
    test(theme, () => {
      for (const seed of SEEDS) {
        const prose = compose([hitFor(theme)], seed);
        expect(prose.length, `${theme}/${seed} empty`).toBeGreaterThan(0);
        expect(guardComposeProse(prose).ok, `${theme}/${seed}: "${prose}"`).toBe(true);
      }
    });
  }

  test("every declared variant (not just the sampled ones) clears the wall", () => {
    for (const [theme, variants] of Object.entries(OPENERS)) {
      for (const prose of variants) {
        expect(guardComposeProse(prose).ok, `${theme}: "${prose}"`).toBe(true);
      }
    }
  });
});

describe("deterministic openers — behaviour", () => {
  test("same question yields the same opener (replay-stable)", () => {
    const a = compose([hitFor("Family")], "kangen keluarga tapi berat");
    const b = compose([hitFor("Family")], "kangen keluarga tapi berat");
    expect(a).toBe(b);
    expect(OPENERS["Family"]).toContain(a);
  });

  test("the interpretive disclaimer is no longer spoken in the opener", () => {
    for (const theme of Object.keys(OPENERS)) {
      const prose = compose([hitFor(theme)], "apa saja");
      expect(prose).not.toContain("menafsirkan");
      expect(prose).not.toContain("silakan baca sendiri");
    }
  });

  test("an unknown theme still returns a safe, non-empty opener", () => {
    const prose = compose([hitFor("Some Unmapped Theme")], "x");
    expect(prose.length).toBeGreaterThan(0);
    expect(guardComposeProse(prose).ok).toBe(true);
  });

  test("no hits → empty string (never a fabricated opener)", () => {
    expect(compose([], "x")).toBe("");
  });
});
