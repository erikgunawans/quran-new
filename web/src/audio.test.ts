import { describe, expect, test } from "bun:test";
import { hasAudio } from "./audio.ts";

/** `toggleAudio()` touches the `Audio`/DOM APIs and is verified live (Interceptor) instead —
 * same pattern as the other main.ts-adjacent, DOM-dependent code in this app. */
describe("hasAudio — the truth oracle for recitation", () => {
  test("the MVP sample is reachable", () => {
    expect(hasAudio(1, 1)).toBe(true);
    expect(hasAudio(1, 7)).toBe(true);
    expect(hasAudio(112, 1)).toBe(true);
    expect(hasAudio(113, 5)).toBe(true);
    expect(hasAudio(114, 6)).toBe(true);
  });

  test("never claims audio outside the sample", () => {
    expect(hasAudio(1, 8)).toBe(false); // Al-Fatiha only has 7
    expect(hasAudio(2, 1)).toBe(false); // Al-Baqarah isn't in the sample at all
    expect(hasAudio(114, 7)).toBe(false); // An-Nas only has 6
  });

  test("an unknown surah number never throws", () => {
    expect(hasAudio(999, 1)).toBe(false);
  });
});
