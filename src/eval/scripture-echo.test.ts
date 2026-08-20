/**
 * Force-red tests for the scripture-echo detector.
 *
 * The two POSITIVE cases are production strings, not prose written for a test — the 2026-08-17
 * ISC-419 violation and the 2026-08-20 QS 2:261 paraphrase, both quoted verbatim in `ISA.md`. That
 * matters here more than usual: this repo's guard tests were green for two sessions against a wall
 * that was open, because every case in them was prose we had written ourselves.
 *
 * The NEGATIVE cases are NOT production strings and are marked so. They are the weakest part of this
 * file. Live clean answers are the control that counts, and they are read from a probe dump, not
 * pinned here — a hand-written control set that passes is exactly the artifact that hides a hole.
 */
import { describe, expect, test } from "bun:test";
import { buildDetector, loadTranslations, quotedSpans, refsInProse, stemsOf } from "./scripture-echo.ts";

const translations = await loadTranslations();
const det = buildDetector(translations);

/** The real 2026-08-17 violation. `ISA.md`, ISC-419. */
const VIOLATION_17_32 =
  'Islam melarang mendekati zina. Allah berfirman, "Dan janganlah kamu mendekati zina; ' +
  'sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk." (QS Al-Isra 17:32)';

/**
 * The OTHER real 2026-08-17 violation — the `bolehkah aku pacaran` turn. `ISA.md`, ISC-419.
 *
 * Kept beside the 17:32 one because the two differ in the way that matters: this one renders the
 * ayah in GUILLEMETS after a lead-in, and its overlap with the shipped text is 2 rare stems against
 * 17:32's 2-of-2 — so it is the case that would be lost first if the rare-stem axis were tightened,
 * and the verbatim axis is what actually catches it.
 */
const VIOLATION_2_187 =
  "Dalam QS Al-Baqarah 2:187, Allah menggambarkan hubungan suami istri sebagai pakaian yang saling " +
  "menenteramkan — «istri-istri kalian menjadi penenteram bagi kalian, kalian menjadi penenteram bagi mereka.»";

/** The real 2026-08-20 unquoted paraphrase. `ISA.md`, ISC-419, the open seam. */
const PARAPHRASE_2_261 =
  "Sedekah dilipatgandakan pahalanya. Al-Qur'an menggambarkannya seperti satu biji yang ditanam, " +
  "lalu tumbuh tujuh tangkai, dan setiap tangkai berisi seratus biji.";

describe("the corpus loads at all", () => {
  test("all 114 surah shards yield both translation kinds", () => {
    expect(translations.length).toBeGreaterThan(12_000);
    expect(new Set(translations.map((t) => t.kind))).toEqual(new Set(["primary", "companion"]));
  });
});

describe("it fires on the production violations — the force-red half", () => {
  test("the 2026-08-17 QS 17:32 rendering is caught on BOTH axes", () => {
    const anchored = det.against(VIOLATION_17_32, "17:32");
    // The verbatim axis: a long contiguous run against the shipped companion text.
    expect(Math.max(...anchored.map((h) => h.run))).toBeGreaterThanOrEqual(8);
    // The rare-stem axis, independently.
    expect(Math.max(...anchored.map((h) => h.hit))).toBeGreaterThanOrEqual(2);
    // And it is found with NO anchor at all, which is what makes verbatim detection anchor-free.
    expect(det.sweep(VIOLATION_17_32, 6).some((h) => h.ref === "17:32")).toBe(true);
  });

  test("the 2026-08-17 QS 2:187 rendering is caught, and its guillemets read as QUOTED", () => {
    expect(det.sweep(VIOLATION_2_187, 6).some((h) => h.ref === "2:187")).toBe(true);
    expect(quotedSpans(VIOLATION_2_187)).toHaveLength(1);
  });

  test("the QS 2:261 paraphrase is caught on the rare-stem axis, and MISSED by the sweep", () => {
    const anchored = det.against(PARAPHRASE_2_261, "2:261");
    expect(Math.max(...anchored.map((h) => h.hit))).toBeGreaterThanOrEqual(3);
    // The blind spot, PINNED rather than described: re-worded scripture has no long verbatim run,
    // so the anchor-free path cannot see it. If this ever starts passing, the header's limit 1 is
    // stale and must be rewritten before the number is trusted.
    expect(det.sweep(PARAPHRASE_2_261, 6)).toHaveLength(0);
  });

  test("the paraphrase is UNQUOTED and the violation is QUOTED — the axis Erik's ruling turns on", () => {
    expect(quotedSpans(PARAPHRASE_2_261)).toHaveLength(0);
    expect(quotedSpans(VIOLATION_17_32)).toHaveLength(1);
  });
});

describe("it stays quiet on prose that only POINTS at scripture (hand-written controls)", () => {
  // NOT production strings. See the file header.
  const CONTROLS: readonly (readonly [string, string])[] = [
    [
      "citation with no rendering",
      "Keutamaan sedekah disebutkan dalam QS Al-Baqarah 2:261, dan kartu ayatnya bisa kamu baca di bawah ini.",
    ],
    [
      "topical gloss, no wording",
      "Ayat ini mengajarkan bahwa memberi di jalan Allah tidak pernah membuat seseorang berkurang.",
    ],
    [
      "ordinary advice",
      "Sedekah tidak harus besar. Yang penting kamu melakukannya dengan ikhlas dan tidak menyakiti perasaan orang yang menerima.",
    ],
  ];
  for (const [label, prose] of CONTROLS) {
    test(`${label} reproduces ZERO rare stems of QS 2:261`, () => {
      for (const h of det.against(prose, "2:261")) expect(h.hit).toBe(0);
    });
  }
});

describe("the pieces the two axes rest on", () => {
  test("stemming collapses the affixed forms the paraphrase axis depends on", () => {
    // Each pair is a form the QS 2:261 paraphrase uses against the form the corpus ships. If these
    // stop collapsing, `hit` silently drops and the detector reports a quieter world than exists.
    for (const [a, b] of [
      ["ditanam", "menanam"],
      ["tumbuh", "menumbuhkan"],
      ["tangkai", "tangkainya"],
    ] as const) {
      expect(stemsOf(a)[0]).toBe(stemsOf(b)[0]!);
    }
  });

  test("refsInProse reads the citation shapes the app actually emits, and rejects impossible ones", () => {
    expect(refsInProse("(QS Al-Isra 17:32)")).toEqual(["17:32"]);
    expect(refsInProse("lihat QS. 2:261 dan 4:11")).toEqual(["2:261", "4:11"]);
    expect(refsInProse("pukul 09:30 dan surah 200:1")).toEqual([]);
  });

  test("quotedSpans finds the curly quotes the model actually writes, not just ASCII", () => {
    expect(quotedSpans("dia berkata, “sesuatu yang cukup panjang di sini” lalu berhenti")).toHaveLength(1);
  });
});
