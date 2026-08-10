import { describe, expect, test } from "bun:test";
import { hasAudio, nextWithAudio, playMode, setPlayMode } from "./audio.ts";

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

/**
 * Continuous playback (Erik, 2026-08-10).
 *
 * `nextWithAudio` is the guard that keeps auto-advance honest: only four surahs are downloaded, so
 * "the next ayah" is usually not a file, and chaining into a 404 would be worse than stopping.
 */
describe("nextWithAudio — where 'lanjut otomatis' is allowed to go", () => {
  test("advances within a surah we actually hold", () => {
    expect(nextWithAudio(1, 1)).toEqual({ surah: 1, ayah: 2, ref: "1:2" });
    expect(nextWithAudio(114, 5)).toEqual({ surah: 114, ayah: 6, ref: "114:6" });
  });

  test("stops at the end of a surah rather than rolling into the next one", () => {
    // Al-Fatiha ends at 7. There is no 1:8, and 2:1 is a different surah the reader did not ask for.
    expect(nextWithAudio(1, 7)).toBeNull();
    expect(nextWithAudio(114, 6)).toBeNull();
  });

  test("never advances from a surah or ayah outside the sample", () => {
    expect(nextWithAudio(2, 1)).toBeNull(); // Al-Baqarah has no audio at all
    expect(nextWithAudio(1, 99)).toBeNull(); // not a real position
  });
});

describe("playMode — remembered, but never assumed", () => {
  // Deliberately NOT asserting on localStorage. Another suite in this run installs a stub that
  // throws "private mode" to prove the app survives hostile storage, and globals are shared across
  // bun test files — so a storage assertion here is really an assertion about test ordering.
  // The contract that matters is storage-INDEPENDENT: remembering is a courtesy, and the mode the
  // player actually obeys is the in-memory one. That must hold whether the write lands or throws.
  test("defaults to single, so nothing auto-plays on a fresh install", () => {
    expect(playMode()).toBe("single");
  });

  test("setPlayMode takes effect even when storage refuses the write", () => {
    expect(() => setPlayMode("continue")).not.toThrow();
    expect(playMode()).toBe("continue");
    expect(() => setPlayMode("single")).not.toThrow();
    expect(playMode()).toBe("single");
  });
});
