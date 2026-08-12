import { describe, expect, test } from "bun:test";
import { hasAudio, nextWithAudio, playMode, setPlayMode } from "./audio.ts";

/** `toggleAudio()` touches the `Audio`/DOM APIs and is verified live (Interceptor) instead —
 * same pattern as the other main.ts-adjacent, DOM-dependent code in this app. */
describe("hasAudio — the truth oracle for recitation", () => {
  test("the four surahs that were the whole sample still answer", () => {
    expect(hasAudio(1, 1)).toBe(true);
    expect(hasAudio(1, 7)).toBe(true);
    expect(hasAudio(112, 1)).toBe(true);
    expect(hasAudio(113, 5)).toBe(true);
    expect(hasAudio(114, 6)).toBe(true);
  });

  /** The change of 2026-08-12: the R2 ingest made the whole corpus reachable, so the surahs that
   * used to be the honest `false` are now the honest `true`. These assertions were INVERTED rather
   * than deleted — they are the ones that would catch a regression back to the sample. */
  test("the rest of the corpus is reachable now that the bucket is full", () => {
    expect(hasAudio(2, 1)).toBe(true); // Al-Baqarah — the sample's most conspicuous absence
    expect(hasAudio(2, 255)).toBe(true); // Ayat al-Kursi
    expect(hasAudio(2, 286)).toBe(true); // last ayah of the longest surah
    expect(hasAudio(18, 10)).toBe(true); // the ayah the surah index was built to stop denying
    expect(hasAudio(36, 1)).toBe(true); // Yaasiin
  });

  test("never claims an ayah the surah does not have", () => {
    expect(hasAudio(1, 8)).toBe(false); // Al-Fatiha only has 7
    expect(hasAudio(114, 7)).toBe(false); // An-Nas only has 6
    expect(hasAudio(2, 287)).toBe(false); // Al-Baqarah ends at 286
    expect(hasAudio(9, 130)).toBe(false); // At-Tawbah ends at 129
  });

  test("an unknown surah number never throws", () => {
    expect(hasAudio(999, 1)).toBe(false);
    expect(hasAudio(0, 1)).toBe(false);
    expect(hasAudio(-1, 1)).toBe(false);
  });

  test("a non-position is never a file", () => {
    expect(hasAudio(1, 0)).toBe(false);
    expect(hasAudio(1, -1)).toBe(false);
    expect(hasAudio(1, 1.5)).toBe(false); // `/audio/1/1.5.mp3` is not a key the ingest ever wrote
    expect(hasAudio(1, Number.NaN)).toBe(false);
  });

  /**
   * The bound the whole widening rests on. `hasAudio` claims exactly the corpus, so the count of
   * claimed positions must equal the count of objects the ingest was asked to upload — 6,236. If
   * these ever disagree, either the surah index moved or the manifest stopped tracking it, and in
   * both cases some reader is being offered a play button for a file that does not exist.
   */
  test("claims exactly 6,236 positions — no more, no less", () => {
    let claimed = 0;
    for (let s = 1; s <= 114; s++) {
      for (let a = 1; a <= 300; a++) if (hasAudio(s, a)) claimed++;
    }
    expect(claimed).toBe(6236);
  });
});

/**
 * Continuous playback (Erik, 2026-08-10).
 *
 * `nextWithAudio` is the guard that keeps auto-advance honest. With the full corpus behind it the
 * guard does not become decorative — it becomes the surah boundary, which is the one place
 * recitation genuinely should stop and wait rather than decide for the reader.
 */
describe("nextWithAudio — where 'lanjut otomatis' is allowed to go", () => {
  test("advances within a surah we actually hold", () => {
    expect(nextWithAudio(1, 1)).toEqual({ surah: 1, ayah: 2, ref: "1:2" });
    expect(nextWithAudio(114, 5)).toEqual({ surah: 114, ayah: 6, ref: "114:6" });
  });

  test("advances inside surahs the sample never covered", () => {
    expect(nextWithAudio(2, 1)).toEqual({ surah: 2, ayah: 2, ref: "2:2" });
    expect(nextWithAudio(2, 285)).toEqual({ surah: 2, ayah: 286, ref: "2:286" });
  });

  test("stops at the end of a surah rather than rolling into the next one", () => {
    // Al-Fatiha ends at 7. There is no 1:8, and 2:1 is a different surah the reader did not ask for.
    expect(nextWithAudio(1, 7)).toBeNull();
    expect(nextWithAudio(114, 6)).toBeNull();
    expect(nextWithAudio(2, 286)).toBeNull();
    expect(nextWithAudio(9, 129)).toBeNull();
  });

  test("Anti: never advances from a position that is not a real ayah", () => {
    expect(nextWithAudio(1, 99)).toBeNull(); // past the end of Al-Fatiha
    expect(nextWithAudio(999, 1)).toBeNull(); // not a surah
    expect(nextWithAudio(2, 0)).toBeNull(); // not an ayah
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
