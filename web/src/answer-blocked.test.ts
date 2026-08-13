/**
 * The refusal channel — why an answer is absent, and why that distinction is the whole fix.
 *
 * Erik hit this live twice: a question whose truthful answer is a hadith ("apakah benar bahwa sakit
 * itu akan menghapus dosa kita?") returned `{"answer":null}`, and the reader was shown the corpus-gap
 * copy — "aku belum menemukan ayat yang cocok". That copy was false. An answer WAS found. The egress
 * wall refused it because the app cannot yet produce a receipt for a prophetic attribution, and the
 * app then reported its own deliberate withhold as ignorance.
 *
 * These tests pin three things, in the order they matter:
 *
 *   1. THE DIAGNOSIS. That a realistic hadith-shaped answer to Erik's exact question is refused by
 *      `bad_hadith` specifically, and not by any of the other three rules. The fix routes on the rule
 *      name, so a misdiagnosis here would point the reader at the wrong door.
 *   2. THAT THE WALL IS UNPASSABLE ON THIS PATH. Passing `groundedHadithFrom([])` — the "fix" of
 *      wiring the third argument through, with nothing retrieved to put in it — is byte-identical to
 *      the `() => false` default. This test exists to stop that no-op ever being mistaken for a fix
 *      again; it is the falsification of the original diagnosis, kept as a regression.
 *   3. THAT A REFUSAL AND AN ABSENCE STAY DISTINGUISHABLE. The whole point of the change.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { allowedRefsFrom, groundedHadithFrom, guardAnswerProse, safeAnswer } from "./answer-guard.ts";

const allow = (...refs: string[]) => allowedRefsFrom(refs);

/**
 * A realistic answer to Erik's question, in the app's own voice.
 *
 * Deliberately a GOOD answer: warm, grounded in a real ayah, no verdict, no Arabic, and the hadith it
 * leans on (illness effacing sin) is authentic. This is the case that hurts — the app is not refusing
 * a bad answer, it is refusing a true one it cannot receipt.
 */
const SICKNESS_ANSWER = `Pertanyaanmu ini menyentuh, dan aku ikut mendoakan kesehatanmu. Dalam Islam,
sakit bukan tanda Allah membencimu. Nabi ﷺ bersabda bahwa tidaklah seorang muslim ditimpa sakit
melainkan Allah menghapus kesalahan-kesalahannya, sebagaimana pohon menggugurkan daunnya. Al-Qur'an
juga mengingatkan dalam QS 2:155 bahwa ujian datang kepada orang-orang yang sabar.`;

describe("the diagnosis — which rule actually refuses a hadith-shaped answer", () => {
  test("Erik's live question is refused by bad_hadith", () => {
    const r = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]));
    expect(r.ok).toBe(false);
    expect(r.violations.map((v) => v.kind)).toContain("bad_hadith");
  });

  test("and by bad_hadith ALONE — not by fatwa, arabic, or bad_ref", () => {
    // Load-bearing: main.ts renders the hadith pointer only for `bad_hadith`. If this answer also
    // tripped `fatwa`, the reported reason could be the wrong one and the reader would get the wrong
    // door — or, worse, a pointer advertising a verdict the app had just refused to issue.
    const r = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]));
    expect(new Set(r.violations.map((v) => v.kind))).toEqual(new Set(["bad_hadith"]));
  });

  test("the offending fragment is the attribution itself, so the reason is legible in a log", () => {
    const r = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]));
    expect(r.violations.find((v) => v.kind === "bad_hadith")?.detail).toContain("bersabda");
  });

  test("the same answer without the attribution passes — the hadith is the only thing wrong with it", () => {
    // The control. Without this, "it was rejected" proves nothing about WHY: an answer that fails for
    // four reasons at once would satisfy every assertion above and still not be the case we fixed.
    const noHadith = `Pertanyaanmu ini menyentuh. Al-Qur'an mengingatkan dalam QS 2:155 bahwa ujian
      datang kepada orang-orang yang sabar, dan Allah dekat dengan mereka.`;
    expect(guardAnswerProse(noHadith, allow("2:155"), groundedHadithFrom([])).ok).toBe(true);
  });
});

// RETITLED 2026-08-13, and the old title is quoted because it was a true claim that STOPPED being
// true rather than a mistake: "the wall is unpassable on the /api/answer path, and wiring the
// argument does not change that". ISC-434/435 fed the union and taught the marker, so the wall is now
// passable — with a receipt. Every test below still pins live behaviour, because an empty union is
// still what most turns have (any feeling question, any deploy without the dalil bindings) and it
// must still refuse exactly what it always refused.
describe("an UNFED union refuses exactly what the () => false default refused", () => {
  test("an EMPTY grounding union is identical to the () => false default", () => {
    // This is the falsification of the original diagnosis ("safeAnswer gets 2 args, so the predicate
    // is always false — wire the third argument"). It was true and insufficient: wiring the argument
    // without feeding it is byte-identical to the default, which is what this pins.
    const withDefault = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"));
    const withEmptyUnion = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]));
    expect(withEmptyUnion.ok).toBe(withDefault.ok);
    expect(withEmptyUnion.violations.map((v) => v.kind)).toEqual(withDefault.violations.map((v) => v.kind));
  });

  test("with nothing retrieved, a regenerated answer cannot clear it either", () => {
    // The endpoint retries once on a guard reject, which usually clears a fluke. With an unfed union
    // this failure is not a fluke: any answer attributing to the Prophet ﷺ fails, both times. (The
    // endpoint now breaks rather than retrying on `bad_hadith` for a latency reason, and after
    // ISC-434/435 for a second reason — the first attempt already had the hadith and the syntax.)
    const secondAttempt = `Aku ikut mendoakan. Diriwayatkan oleh Bukhari bahwa sakit menghapus dosa
      seorang mukmin, dan QS 2:155 menyebut ujian bagi orang yang sabar.`;
    expect(safeAnswer(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]))).toBeNull();
    expect(safeAnswer(secondAttempt, allow("2:155"), groundedHadithFrom([]))).toBeNull();
  });

  test("a marker cannot rescue it either, because nothing was retrieved to resolve against", () => {
    // Even if the model somehow emitted the right syntax unprompted, an empty union refuses it — this
    // is `bad_ref`'s analogue and it is correct behaviour, not a bug to route around.
    const marked = `Nabi ﷺ bersabda bahwa sakit menghapus dosa. [H:bukhari:5641]`;
    expect(safeAnswer(marked, allow(), groundedHadithFrom([]))).toBeNull();
    // ...and resolves the moment a real union contains it. The wall is not broken; it is unfed.
    expect(safeAnswer(marked, allow(), groundedHadithFrom(["hadith-bukhari-5641"]))).toBe(marked);
  });
});

describe("a refusal and an absence must not be the same event", () => {
  test("an absence has no violations to report", () => {
    // The honest-silence copy belongs to THIS case and only this one.
    expect(guardAnswerProse("Allah Maha Pengasih dan dekat dengan hamba-Nya.", allow()).violations).toEqual([]);
  });

  test("a refusal always names at least one rule, so the caller can never be left guessing", () => {
    const r = guardAnswerProse(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]));
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations[0]?.kind).toBeTruthy();
  });

  test("Anti: the pointer copy never states whether the hadith exists or what it says", () => {
    // The advisor caught this one and it was a real leak, not a style note. The first draft opened
    // "Aku menemukan jawabannya" — I found the answer. Erik's live question is a yes/no ("apakah BENAR
    // bahwa sakit menghapus dosa?"), so that sentence IS the answer: it confirms the premise. An
    // unreceipted prophetic claim wearing a pointer costume defeats the entire wall.
    //
    // Read from the shipped source rather than restated here, so a future edit to the copy has to face
    // this test. A literal duplicated into the test would pass forever while the real copy drifted.
    const src = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const copy = src.slice(src.indexOf('case "hadith-defer":'), src.indexOf('case "answer-blocked":'));
    expect(copy).toContain("Pertanyaan seperti ini");
    // No claim of having found it, and no conclusion drawn for the reader.
    expect(copy).not.toContain("Aku menemukan jawabannya");
    expect(copy).not.toMatch(/\bbenar\b/i);
    // Names the kind of source and its real limitation, rather than promising an answer waits there.
    expect(copy).toContain("bahasa Arab");
  });

  test("Anti: the non-hadith refusal copy never claims the corpus is empty", () => {
    // A `fatwa` block means the model issued a ruling, NOT that the Qur'an is silent on the subject.
    // Telling a reader "aku belum menemukan ayat yang cocok" for their fiqh question is a false
    // statement about the mushaf, and it is the specific lie this turn exists to stop telling.
    const src = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const copy = src.slice(src.indexOf('case "answer-blocked":'), src.indexOf('case "silence":'));
    expect(copy).not.toContain("belum menemukan ayat yang cocok");
    expect(copy).toContain("Bukan berarti Al-Qur'an diam");
    // And it never leaks which rule tripped — our quality failures are not the reader's business.
    for (const kind of ["fatwa", "bad_ref", "arabic", "bad_hadith"]) expect(copy).not.toContain(kind);
  });

  test("Anti: the refused prose is never returned to a caller in any form", () => {
    // The reader must never see an unreceipted attribution — not as an answer, not as a preview, not
    // quoted back inside an explanation of the refusal. `safeAnswer` returning null is that guarantee,
    // and `hadith-defer` carries only the question, never the prose.
    expect(safeAnswer(SICKNESS_ANSWER, allow("2:155"), groundedHadithFrom([]))).toBeNull();
  });
});
