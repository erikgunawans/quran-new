/**
 * The echo wall — `scriptureEchoShape`, the second opinion beside `wordingShape` (ISC-419).
 *
 * THE POSITIVE CASES ARE PRODUCTION PROSE. This repo's guard tests were green for two sessions
 * against a wall that was open, because every string in them was prose we had written ourselves, and
 * the fix for that is not "write better strings" — it is to test the sentences that actually
 * shipped. The live 2026-08-20 violation and the two 2026-08-17 ones are all quoted in `ISA.md`.
 *
 * THE NEGATIVE CASES ARE ALSO PRODUCTION PROSE, which matters more here than usual: this wall's
 * whole cost is over-refusal, and a hand-written "clean" sentence proves nothing about whether a
 * real answer survives. Every negative below is a sentence a live answer shipped on 2026-08-20.
 *
 * ONE FIXTURE IS DELIBERATELY STRICTER THAN PRODUCTION, and saying so beats leaving it to be found:
 * QS 17:23 is given here as its COMPANION (literal) rendering, while `gatherGrounding` posts the
 * PRIMARY. The adab sentences track the companion's wording more closely than the primary's, so
 * clearing the companion is a HARDER test than the one production runs — the negatives hold against
 * the translation they most resemble, and they would also hold against the one actually posted.
 */
import { describe, expect, test } from "bun:test";
import { guardAnswerProse, scriptureEchoShape, type EchoVerse } from "./answer-guard.ts";

/** QS 2:261 as the app ships it — the interpretive primary, which is what the Worker posts. */
const V_2_261_PRIMARY =
  "Orang-orang yang mendermakan harta mereka untuk membela Islam adalah laksana orang menanam " +
  "sebuah biji yang menumbuhkan tujuh tangkai. Pada setiap tangkai ada seratus biji. Allah melipat " +
  "gandakan pahala kepada siapa yang dikehendaki-Nya karena kedermawanannya.";

/** QS 17:23, the adab ayah — the companion (literal) rendering. */
const V_17_23_COMPANION =
  "Dan Tuhanmu telah memerintahkan supaya kamu jangan menyembah selain Dia dan hendaklah kamu " +
  "berbuat baik pada ibu bapakmu dengan sebaik-baiknya. Jika salah seorang di antara keduanya atau " +
  'kedua-duanya sampai berumur lanjut dalam pemeliharaanmu, maka sekali-kali janganlah kamu mengatakan ' +
  'kepada keduanya perkataan "ah" dan janganlah kamu membentak mereka dan ucapkanlah kepada mereka ' +
  "perkataan yang mulia.";

/** QS 19:14 — short, which is exactly why a share-of-vocabulary rule fails on it. */
const V_19_14 =
  "dan seorang yang berbakti kepada kedua orang tuanya, dan bukanlah ia orang yang sombong lagi durhaka.";

const verses = (...vs: [string, string][]): EchoVerse[] => vs.map(([ref, text]) => ({ ref, texts: [text] }));

describe("it refuses prose that COPIES our shipped wording", () => {
  /**
   * The live violation, 2026-08-20, `apa keutamaan sedekah`. Unquoted, so `wordingShape` has no
   * quoted span to scan; `yang menumbuhkan tujuh tangkai` is verbatim from the primary.
   */
  const LIVE_2_261 =
    "Coba bayangkan, dalam QS Al-Baqarah 2:261, Allah menggambarkan pahala sedekah seperti sebutir " +
    "biji yang menumbuhkan tujuh tangkai, dan setiap tangkai berisi seratus biji.";

  test("the live 2026-08-20 QS 2:261 splice is caught", () => {
    expect(scriptureEchoShape(LIVE_2_261, verses(["2:261", V_2_261_PRIMARY]))).not.toBeNull();
  });

  test("it reports the OFFENDING SENTENCE, not the whole answer", () => {
    const prose = `Sedekah itu bukan sekadar memberi harta. ${LIVE_2_261} Mulailah dari yang ada.`;
    expect(scriptureEchoShape(prose, verses(["2:261", V_2_261_PRIMARY]))).toBe(LIVE_2_261);
  });

  test("it surfaces through guardAnswerProse as an own_wording violation", () => {
    const res = guardAnswerProse(LIVE_2_261, () => true, () => false, verses(["2:261", V_2_261_PRIMARY]));
    expect(res.ok).toBe(false);
    expect(res.violations.map((v) => v.kind)).toContain("own_wording");
  });

  /**
   * THE DEFAULT IS THE HOLE. Same prose, same guard, no fourth argument — and it passes. This is the
   * `isGroundedHadith = () => false` shape one parameter over, pinned so that a future call site
   * added without the argument fails a test rather than silently switching the wall off.
   */
  test("with NO verses passed the wall is inert — the reason the Worker passes them explicitly", () => {
    expect(guardAnswerProse(LIVE_2_261, () => true).ok).toBe(true);
    expect(scriptureEchoShape(LIVE_2_261, [])).toBeNull();
  });
});

describe("it spares the live answers this project wants to keep", () => {
  /**
   * Every sentence here SHIPPED on 2026-08-20 and every one reproduces some of the ayah's
   * distinctive vocabulary — `lanjut`, `bentak`, `mulia`, `berbakti` are the corpus's own words.
   * They describe the ayah rather than copy it, and the wall has to be able to tell the difference.
   */
  const LIVE_CLEAN: readonly (readonly [string, string])[] = [
    [
      "adab: the closest a good answer came (run 3)",
      "Dalam QS Al-Isra 17:23, Allah menetapkan bahwa setelah perintah untuk tidak menyembah selain-Nya, perintah berikutnya adalah berbuat baik kepada ibu bapak.",
    ],
    [
      "adab: reproduces `membentak` and `perkataan yang mulia`, still description",
      "Sebaliknya, kita diperintahkan untuk berkata dengan perkataan yang mulia dan menyenangkan hati mereka.",
    ],
    [
      "adab: a closing du'a — covers HALF of 19:14's distinctive words and is plainly innocent",
      "Semoga Allah memudahkan kita semua untuk berbakti kepada orang tua, baik yang masih ada maupun yang sudah tiada.",
    ],
    [
      "sedekah: same answer as the violation, a different sentence",
      "Ini menunjukkan betapa Allah Maha Pemurah kepada hamba-Nya yang suka berderma.",
    ],
  ];

  for (const [label, sentence] of LIVE_CLEAN) {
    test(`${label} is NOT refused`, () => {
      const g = verses(["2:261", V_2_261_PRIMARY], ["17:23", V_17_23_COMPANION], ["19:14", V_19_14]);
      expect(scriptureEchoShape(sentence, g)).toBeNull();
    });
  }

  test("prose citing an ayah without rendering it is untouched", () => {
    const s = "Keutamaan sedekah disebutkan dalam QS Al-Baqarah 2:261, dan kartunya ada di bawah.";
    expect(scriptureEchoShape(s, verses(["2:261", V_2_261_PRIMARY]))).toBeNull();
  });
});

describe("the Worker actually forwards its verses — the default is silent otherwise", () => {
  /**
   * A SOURCE-LEVEL check, and it is here because the alternative is a comment claiming a guarantee
   * nothing enforces. `guardAnswerProse`'s fourth parameter defaults to `[]`, so deleting the
   * argument at the Worker call site switches the wall off while every behavioural test above still
   * passes — they call the guard directly and would never notice.
   *
   * This asserts the one thing those tests cannot see: that the live call site passes real verses.
   */
  test("worker/src/index.ts passes this turn's verses into guardAnswerProse", async () => {
    const src = await Bun.file("worker/src/index.ts").text();
    const call = src.slice(src.indexOf("guard: (candidate) =>"));
    expect(call).toContain("guardAnswerProse(");
    // The mapping from verified grounding to EchoVerse. If this line goes, the wall goes with it.
    expect(call).toContain("verses.map((v) => ({ ref: v.ref, texts: [v.text] }))");
  });
});

describe("the limits, pinned rather than described", () => {
  /**
   * The EARLIER 2026-08-20 form of the same violation. It runs 2 against both translations, so it
   * PASSES — this wall closes verbatim and near-verbatim copying, not paraphrase. Recorded as a
   * passing expectation ONLY because it is a limit of a shipped rule, not a gap we chose to leave
   * unmeasured: if this ever starts failing, the threshold moved and the cost needs re-pricing.
   */
  test("a LOOSE paraphrase of the same ayah is NOT caught", () => {
    const loose =
      "Al-Qur'an menggambarkannya seperti satu biji yang ditanam, lalu tumbuh tujuh tangkai, dan setiap tangkai berisi seratus biji.";
    expect(scriptureEchoShape(loose, verses(["2:261", V_2_261_PRIMARY]))).toBeNull();
  });

  test("an ayah that was never posted cannot be compared against", () => {
    const violation =
      'Allah berfirman, "Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk."';
    expect(scriptureEchoShape(violation, verses(["2:261", V_2_261_PRIMARY]))).toBeNull();
  });

  test("but it IS caught once that ayah's text is in hand — the wall works, the wire is short", () => {
    const violation =
      'Allah berfirman, "Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk."';
    const shipped =
      "Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji. Dan suatu jalan yang buruk.";
    expect(scriptureEchoShape(violation, verses(["17:32", shipped]))).not.toBeNull();
  });

  test("a sentence shorter than the run threshold is skipped, not scanned", () => {
    expect(scriptureEchoShape("Biji itu.", verses(["2:261", V_2_261_PRIMARY]))).toBeNull();
  });
});
