import { describe, expect, test } from "bun:test";
import { ayahOfDay, localDayNumber } from "./band";

describe("ayat untukmu hari ini — curated and deterministic, never random", () => {
  test("the same day always yields the same ayah", () => {
    // Scripture is not a slot machine. Reopening the app must not reshuffle the verse.
    const a = ayahOfDay(new Date(2026, 6, 16, 9, 0));
    const b = ayahOfDay(new Date(2026, 6, 16, 23, 30));
    expect(a).toEqual(b);
  });

  test("the pick advances across days", () => {
    const days = new Set<string>();
    for (let i = 0; i < 10; i++) {
      days.add(ayahOfDay(new Date(2026, 6, 16 + i, 12, 0)).join(":"));
    }
    // Ten consecutive days should not all land on one verse.
    expect(days.size).toBeGreaterThan(1);
  });

  test("every day of a year produces a real, in-bounds reference", () => {
    for (let i = 0; i < 365; i++) {
      const [surah, ayah] = ayahOfDay(new Date(2026, 0, 1 + i, 12, 0));
      expect(surah).toBeGreaterThanOrEqual(1);
      expect(surah).toBeLessThanOrEqual(114);
      expect(ayah).toBeGreaterThanOrEqual(1);
    }
  });

  test("the pool cycles — a year of picks draws only from the curated set", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 365; i++) {
      seen.add(ayahOfDay(new Date(2026, 0, 1 + i, 12, 0)).join(":"));
    }
    // A random draw over 6,236 verses would blow past this. Curation is the point:
    // nobody opening this app at 2am carrying grief gets served a verse about hellfire.
    expect(seen.size).toBeLessThanOrEqual(10);
  });

  test("the day number turns over at the reader's midnight, not UTC's", () => {
    const lateNight = new Date(2026, 6, 16, 23, 59);
    const justAfter = new Date(2026, 6, 17, 0, 1);
    expect(localDayNumber(justAfter) - localDayNumber(lateNight)).toBe(1);
  });

  test("a day is one day long, whatever the local offset", () => {
    const a = localDayNumber(new Date(2026, 6, 16, 0, 0));
    const b = localDayNumber(new Date(2026, 6, 16, 23, 59));
    expect(a).toBe(b);
  });
});

/**
 * The regression that matters most in this file.
 *
 * The pool was first written from remembered fragments and shipped QS 65:2 — a ruling on divorce,
 * iddah and witnesses — as "ayat untukmu hari ini". The comforting line it was chosen for is only
 * its tail. A screenshot caught it; these tests make sure memory cannot do it again.
 */
describe("the pool refuses verses that only console when cropped", () => {
  const banned: [number, number, string][] = [
    [65, 2, "a ruling on divorce/iddah/witnesses — the consolation is only its tail"],
    [2, 216, "opens on the obligation to fight"],
    [40, 60, "ends in Jahannam"],
    [13, 28, "begins mid-sentence, dependent on 13:27"],
    [3, 159, "counsel to the Prophet on leading, not consolation"],
    [8, 46, "battlefield discipline"],
    [47, 7, "conditional on jihad"],
  ];

  test("none of the known-wrong verses can be served", () => {
    const picks = new Set<string>();
    for (let i = 0; i < 365; i++) {
      picks.add(ayahOfDay(new Date(2026, 0, 1 + i, 12, 0)).join(":"));
    }
    for (const [s, a, why] of banned) {
      expect(picks.has(`${s}:${a}`), `${s}:${a} must not be served — ${why}`).toBe(false);
    }
  });

  test("65:3 is served, 65:2 is not — the neighbouring verse is the one that stands alone", () => {
    const picks = new Set<string>();
    for (let i = 0; i < 365; i++) {
      picks.add(ayahOfDay(new Date(2026, 0, 1 + i, 12, 0)).join(":"));
    }
    expect(picks.has("65:3")).toBe(true);
    expect(picks.has("65:2")).toBe(false);
  });
});
