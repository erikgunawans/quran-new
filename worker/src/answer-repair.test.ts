/**
 * Tests for REPAIR — the stage that turns a guard refusal into a shorter true answer.
 *
 * Every case here was force-red before being committed: the implementation was mutated to the
 * defect the test names and the test was watched to fail. This repo's record
 * (`tests-swallowed-by-the-catch`, `a-green-test-can-assert-the-defect`) is that a test which was
 * never seen red is a test that may be asserting nothing at all.
 *
 * The guards are FAKES here on purpose. What is under test is the SEARCH — that it excises the
 * offending sentence, keeps the rest, and never ships prose the injected guard rejects. The real
 * guard's semantics are its own suite's job; coupling this one to them would make it fail for
 * reasons that have nothing to do with repair.
 */
import { describe, expect, it } from "bun:test";
import type { AnswerGuardResult } from "../../web/src/answer-guard.ts";
import { repairAnswerProse, splitSentences } from "./answer-repair.ts";

const ok: AnswerGuardResult = { ok: true, violations: [] };
const bad = (n: number): AnswerGuardResult => ({
  ok: false,
  violations: Array.from({ length: n }, () => ({
    kind: "own_wording" as const,
    rule: "wording" as const,
    detail: "x",
  })),
});

/**
 * A guard that rejects prose containing `poison`, ONE VIOLATION PER OCCURRENCE.
 *
 * Occurrences, not distinct words — and that distinction is load-bearing. A first cut counted
 * distinct poison strings, so prose containing POISON twice reported ONE violation, removing either
 * copy showed no improvement, and the search bailed. Two tests then "passed"/"failed" for reasons
 * that had nothing to do with the code under test. A fake guard whose arithmetic does not match a
 * real guard's is an instrument that cannot measure what it is pointed at.
 */
const guardRejecting =
  (...poison: string[]) =>
  (prose: string): AnswerGuardResult => {
    const hits = poison.reduce((n, p) => n + prose.split(p).length - 1, 0);
    return hits === 0 ? ok : bad(hits);
  };

describe("splitSentences — must reconstruct the input byte-for-byte", () => {
  const CASES = [
    "Satu. Dua! Tiga?",
    "Ada baris.\nBaris kedua.\n",
    "Tanpa tanda baca di akhir",
    "Amal bergantung niat [H:bukhari:1]. Dan sabar itu indah.",
    "",
  ];
  for (const input of CASES) {
    it(`rejoins exactly: ${JSON.stringify(input)}`, () => {
      expect(splitSentences(input).join("")).toBe(input);
    });
  }

  it("pulls a marker written AFTER the full stop back into the sentence it cites", () => {
    // The model writes receipts this way, and a naive split puts the receipt in the NEXT sentence —
    // so dropping either piece orphans the other. Force-red: with the merge branch removed this
    // returns 3 pieces and the marker stands alone.
    const parts = splitSentences("Amal bergantung niat. [H:bukhari:1] Sabar itu indah.");
    expect(parts.length).toBe(2);
    expect(parts[0]).toContain("[H:bukhari:1]");
    expect(parts.join("")).toBe("Amal bergantung niat. [H:bukhari:1] Sabar itu indah.");
  });
});

describe("repairAnswerProse", () => {
  it("returns clean prose untouched, and reports zero drops", () => {
    const r = repairAnswerProse("Sabar itu indah. Allah bersama orang sabar.", () => ok);
    expect(r.prose).toBe("Sabar itu indah. Allah bersama orang sabar.");
    expect(r.dropped).toBe(0);
  });

  it("drops ONLY the offending sentence and keeps the rest of the answer", () => {
    const prose = "Sabar itu indah. POISON kalimat buruk. Allah bersama orang sabar.";
    const r = repairAnswerProse(prose, guardRejecting("POISON"));
    expect(r.prose).toBe("Sabar itu indah. Allah bersama orang sabar.");
    expect(r.dropped).toBe(1);
  });

  it("removes several offenders when they are spread across the prose", () => {
    const prose = "A baik. POISON satu. B baik. VENOM dua. C baik.";
    const r = repairAnswerProse(prose, guardRejecting("POISON", "VENOM"));
    expect(r.prose).toBe("A baik. B baik. C baik.");
    expect(r.dropped).toBe(2);
  });

  it("NEVER returns prose its own guard rejects — the invariant the whole module exists for", () => {
    const guard = guardRejecting("POISON");
    for (const prose of [
      "A. POISON. B.",
      "POISON satu. POISON dua. C bersih.",
      "Bersih semua di sini.",
    ]) {
      const r = repairAnswerProse(prose, guard);
      if (r.prose !== null) expect(guard(r.prose).ok).toBe(true);
    }
  });

  it("returns null rather than empty prose when EVERY sentence offends", () => {
    // Silence is wrong, but so is shipping "". The caller decides what null means; repair must not
    // manufacture an answer out of nothing.
    //
    // A comment here first claimed this force-reds the `if (!text.trim()) continue` guard. IT DOES
    // NOT — mutating that line away leaves this green, because the null actually comes from the
    // `return prose ? … : null` ternary further down. Two mechanisms, one outcome. The claim was
    // removed rather than left standing, and the case that DOES pin the `continue` is below.
    const r = repairAnswerProse("POISON satu. POISON dua.", guardRejecting("POISON"));
    expect(r.prose).toBeNull();
  });

  it("never ASKS the guard about an empty candidate", () => {
    // This is what `if (!text.trim()) continue` actually buys, and the only way to see it: the
    // outcome is identical with and without it, so only the guard's call log can tell them apart.
    // Force-red: removing that line makes `""` appear in `seen`.
    const seen: string[] = [];
    repairAnswerProse("POISON satu. POISON dua.", (prose) => {
      seen.push(prose);
      return guardRejecting("POISON")(prose);
    });
    expect(seen).not.toContain("");
    expect(seen.length).toBeGreaterThan(1);
  });

  it("returns null when the violation is not attributable to any single sentence", () => {
    // A guard that rejects everything regardless — no excision can help, so the search must stop
    // rather than strip the answer to nothing sentence by sentence.
    let calls = 0;
    const r = repairAnswerProse("A. B. C.", () => {
      calls++;
      return bad(1);
    });
    expect(r.prose).toBeNull();
    expect(calls).toBeGreaterThan(0);
  });

  it("does not attempt repair on a single-sentence candidate", () => {
    // Nothing to excise but the whole answer, which is just the refusal by another name.
    expect(repairAnswerProse("POISON.", guardRejecting("POISON")).prose).toBeNull();
  });

  it("refuses the search on pathological input instead of running it", () => {
    const many = Array.from({ length: 61 }, (_, i) => `Kalimat ${i}.`).join(" ");
    let calls = 0;
    const r = repairAnswerProse(many, () => {
      calls++;
      return bad(1);
    });
    expect(r.prose).toBeNull();
    // One call to test the input, and then it must bail — NOT ~3,700 evaluations inside a request
    // that already has a deadline. Asserting the COUNT, not just the result: a bail and a failed
    // search return the same value, so only the call count can tell them apart.
    expect(calls).toBe(1);
  });

  it("prefers dropping the SHORTER sentence when two removals are equally clean", () => {
    // A DISCRIMINATING tie: the guard fires only while BOTH markers are present, so removing either
    // sentence alone reaches ok. The two outcomes therefore DIFFER, and only the cost tiebreak
    // decides which. (A first version of this test used two poisoned sentences — both orders ended
    // at the same string, so it could not have failed for the reason it names, which is exactly the
    // `bundle-absence-needs-a-control` shape.)
    const guard = (prose: string): AnswerGuardResult =>
      prose.includes("ALPHA") && prose.includes("BETA") ? bad(1) : ok;
    const longSentence = " ALPHA yang panjang sekali dan penuh isi bermanfaat.";
    const prose = `Awal bersih.${longSentence} BETA.`;
    const r = repairAnswerProse(prose, guard);
    // The SHORT offender goes; the long, content-bearing sentence survives.
    expect(r.prose).toBe(`Awal bersih.${longSentence}`.trim());
    expect(r.dropped).toBe(1);
  });
});
