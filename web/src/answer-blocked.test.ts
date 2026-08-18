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

/**
 * THE SAME LIE, ON THE OTHER ROAD.
 *
 * The suite above stops the corpus-empty claim on the WALL's path. This describes the road the
 * reader actually takes far more often: retrieval qualified nothing, `matchTopic` returned null,
 * `hasGrounding` was false, and `synthesizeAnswer` bowed out before any network call — so the turn
 * renders `kind: "silence"` having never consulted anything.
 *
 * Measured on prod 2026-08-16 with "apa aja sih yang tidak kita sadari kita lakukan yang bisa
 * membuat kita masuk neraka?": ZERO `/api/` requests, and the scholar's index holds nine `neraka`
 * entries the router could not reach. The old headline told that reader the verified corpus had
 * nothing for them. It is the identical false statement about the mushaf, so it gets an identical
 * test rather than a comment hoping someone remembers.
 */
describe("Anti: the corpus-gap copy never claims the corpus is empty either", () => {
  const silenceCopy = () => {
    const src = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    // From the case label — NOT from the comment above it, which quotes the retired line verbatim
    // to explain why it went. Slicing from the comment would make this test pass on the old copy.
    const from = src.indexOf('    case "silence":\n      return `');
    return src.slice(from, src.indexOf('case "hits":', from));
  };

  test("it makes no claim about what the corpus contains", () => {
    expect(silenceCopy()).not.toContain("belum menemukan ayat yang cocok");
    expect(silenceCopy()).not.toContain("korpus yang sudah diverifikasi");
  });

  test("it says the limit is ours, exactly as the blocked path does", () => {
    expect(silenceCopy()).toContain("Bukan berarti Al-Qur'an diam");
  });

  test("it does not describe this edition as one that declines to answer ajaran", () => {
    // EDITION is "synthesis" and this app authors answers about ajaran daily. The retired tail
    // ("aku menemani lewat perasaan, bukan menjawab soal ajaran…") was true of the principled
    // edition only, and a self-description the running code contradicts is the same defect as the
    // headline it sat beneath.
    expect(silenceCopy()).not.toContain("bukan menjawab soal ajaran");
  });

  test("it still offers the reader somewhere to go", () => {
    const copy = silenceCopy();
    expect(copy).toContain('href="#/peta"');
    expect(copy).toContain("18:10");
  });
});

/**
 * THE THIRD LIE, AND IT IS NOT COPY — IT IS A PROMISE NOBODY RETRACTED.
 *
 * The two suites above stop the app claiming the corpus is empty. This one stops it claiming that
 * work is still happening after the work has stopped.
 *
 * At `FAST_ANSWER_MS` (9 s) the reader is handed the principled answer plus a line that says
 * "aku masih menyusun jawaban yang lebih lengkap…", and the composed answer keeps coming underneath.
 * That line is a claim about work IN FLIGHT, so it is only true until the flight ends. It was removed
 * on exactly ONE of the three ways an upgrade can end — the `.catch` — and the other two both fall
 * through `if (!composed) return`: the model answered with nothing better, or the WALL REFUSED it,
 * which `applyAi` reports as null for every violation kind except `bad_hadith`.
 *
 * So on a refused turn the promise stayed on screen permanently. ISC-487 measures those turns at
 * 24.8 s on average against a 9 s fast answer, which means the line sat there — false — from the
 * moment the reader started reading until they navigated away.
 *
 * WHY THIS IS A SOURCE TEST. The notice's whole lifetime is inside one detached promise chain in
 * `ask()`, with no seam a unit test can hold. Re-creating the chain in the test would assert the
 * test's own reproduction, which is worth nothing. What CAN be pinned is the property the fix rests
 * on: the retraction runs on every ending, and it runs against a held node rather than a selector.
 */
describe("Anti: the still-composing promise is retracted on every ending", () => {
  const askChain = () => {
    const src = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    // From the fast-answer marker to the end of the detached upgrade chain.
    const from = src.indexOf("// ── the fast answer ─");
    expect(from).toBeGreaterThan(-1);
    return src.slice(from, src.indexOf("turn = await resolvePrincipled(turn);", from));
  };

  test("the retraction is in a finally, not only in the catch", () => {
    // The whole defect in one assertion. A `.catch`-only removal covers the throwing ending and
    // leaves the two resolving ones — including every refusal — telling the reader work continues.
    const chain = askChain();
    expect(chain).toMatch(/\.finally\(\(\) => \{\s*notice\?\.remove\(\);\s*\}\)/);
  });

  test("Anti: the notice is never re-queried by selector after the turn settles", () => {
    // The aliasing trap, and the scope of this assertion is the whole point of it.
    //
    // The FIRST draft of this test forbade `querySelector(".still-composing")` anywhere in the chain
    // and went red against the correct implementation — because the fix's own capture line uses that
    // selector, once, synchronously, while the node it wants is the only one on screen. The test was
    // wrong, not the fix. Capturing is fine; RE-QUERYING at settle time is the bug, because by then
    // the reader may have asked again and the lookup can find a NEWER turn's notice and delete it,
    // retracting a promise the app is still keeping.
    //
    // So the window is the settle handlers only — everything from the detached chain onward.
    const chain = askChain();
    const settle = chain.slice(chain.indexOf("void pending"));
    expect(settle.length).toBeGreaterThan(0);
    expect(settle).not.toContain('querySelector(".still-composing")');
  });

  test("the held reference is captured in the same block that renders the notice", () => {
    // Capture must follow the innerHTML write that creates the node; a reference taken before it
    // would be null forever and the retraction would silently do nothing on every path.
    const chain = askChain();
    const rendered = chain.indexOf("stillComposingNotice()");
    const captured = chain.indexOf('const notice = answer.querySelector(".still-composing")');
    expect(rendered).toBeGreaterThan(-1);
    expect(captured).toBeGreaterThan(rendered);
  });
});
