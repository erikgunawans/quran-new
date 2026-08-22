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
import { guardAnswerProse, type AnswerGuardResult } from "../../web/src/answer-guard.ts";
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

/**
 * ISC-562 — one rule tripped by MORE THAN ONE sentence.
 *
 * The fake above (`guardRejecting`) counts ONE VIOLATION PER OCCURRENCE. The real
 * `guardAnswerProse` does not: it pushes at most one violation per RULE
 * (`web/src/answer-guard.ts:1237-1278`, each an `if (x) violations.push(...)`), and `wordingShape`
 * returns only its FIRST matching span. So the existing fake is unrealistic in exactly the direction
 * that HIDES this defect — with per-occurrence arithmetic, deleting one of two offenders lowers the
 * count and the search walks out on its own.
 *
 * The fake here matches the real guard's arithmetic instead: one violation, `detail` = the FIRST
 * offending span. That is the shape carried by the blocked turn of the OFFLINE capture of
 * 2026-08-21 (`src/eval/refusal-capture.ts`, not prod) — two
 * `Allah berfirman … "<verse wording>"` sentences at QS At-Tahrim 66:6 and QS Al-Baqarah 2:24.
 */
describe("repairAnswerProse — one rule, two violating sentences (ISC-562)", () => {
  /** One violation per RULE, detail = first offending span. The real guard's arithmetic. */
  const oneViolationPerRule = (prose: string): AnswerGuardResult => {
    const hit = /POISON-\w+/.exec(prose);
    return hit === null
      ? ok
      : { ok: false, violations: [{ kind: "own_wording", rule: "wording", detail: hit[0] }] };
  };

  const PROSE = "Sabar itu indah. POISON-satu di sini. Rezeki dari Allah. POISON-dua di sana.";

  it("the control can tell the two cases apart", () => {
    // Without this, the test below could pass on a guard that reports a constant. One offender is
    // repairable in a single deletion; two are not, and BOTH report violations.length === 1.
    const one = oneViolationPerRule("Sabar itu indah. POISON-satu di sini.");
    const two = oneViolationPerRule(PROSE);
    expect(one.violations.length).toBe(1);
    expect(two.violations.length).toBe(1);
    expect(oneViolationPerRule("Sabar itu indah. Rezeki dari Allah.").ok).toBe(true);
    // And the single-offender case DOES repair today — so a failure below is about the pair.
    expect(repairAnswerProse("Sabar itu indah. POISON-satu di sini.", oneViolationPerRule).prose)
      .toBe("Sabar itu indah.");
  });

  it("repairs prose whose single rule is tripped by two sentences", () => {
    const r = repairAnswerProse(PROSE, oneViolationPerRule);
    expect(r.prose).toBe("Sabar itu indah. Rezeki dari Allah.");
    expect(r.dropped).toBe(2);
    // Never ship prose the injected guard rejects.
    expect(oneViolationPerRule(r.prose!).ok).toBe(true);
  });

  it("does not delete a clean sentence WHOSE REMOVAL THIS FAKE MAKES INVISIBLE", () => {
    // The counterfactual that keeps the fix from degenerating into "delete until clean".
    //
    // THE TITLE IS NARROWER THAN THE ONE THIS TEST FIRST CARRIED, and the narrowing is the point.
    // It said "does not delete a sentence that removes no reported violation", which claims more than
    // any fake can show. This fake derives `detail` solely from the offending sentence, so a clean
    // sentence's removal changes neither count nor span. THE REAL GUARD IS NOT LIKE THAT:
    // `wordingShape` reads a 160-character window that crosses sentence boundaries, so removing an
    // innocent filler sentence CAN change which span is reported first and make it rank-1 eligible —
    // demonstrated by `scholarly-gate` on 2026-08-22. No construction has yet made the innocent
    // sentence the one actually dropped (the cost tie-break favoured a real offender every time), so
    // this is an over-claim retired, not a defect demonstrated. See the docblock on
    // `repairAnswerProse`, which now carries the same caveat.
    const r = repairAnswerProse(PROSE, oneViolationPerRule);
    expect(r.prose).toContain("Sabar itu indah.");
    expect(r.prose).toContain("Rezeki dari Allah.");
  });
});

/**
 * ISC-562, second half — TWO OFFENDERS THAT REPORT THE SAME `detail`.
 *
 * These run against the REAL `guardAnswerProse`, deliberately, and that is a departure from this
 * file's stated policy of fakes-only. The policy is right about SCOPE — whether a rule judges a
 * sentence or the whole prose is the guard suite's business — and wrong about ARITHMETIC, which is
 * the one thing the search consumes. A fake cannot tell us what the real guard's `detail` looks
 * like, and it was a fake whose arithmetic did not match production that hid this defect for a
 * whole cycle (`guardRejecting` counts one violation per OCCURRENCE; the real guard counts one per
 * RULE).
 *
 * Measured on 2026-08-22, before the pair expansion existed:
 *
 *   two sentences citing DIFFERENT bad refs → detail "9:129" then "8:77" → repaired, dropped 2
 *   two sentences citing the SAME bad ref   → detail "9:129" throughout  → prose: null
 *
 * `bad_ref` reports a NORMALISED ref, `arabic` reports a single character, and every push site
 * truncates at 80 chars — so "the reported violation changed" is a strictly better signal than the
 * count and still not a sufficient one.
 */
describe("repairAnswerProse — two offenders, identical detail, real guard (ISC-562)", () => {
  const cite = (ref: string) => ref === "2:255";
  const guard = (prose: string) => guardAnswerProse(prose, cite);

  const SAME = "Sabar itu indah. Lihat QS 9:129 untuk itu. Rezeki dari Allah. Juga QS 9:129 menerangkannya.";
  const DIFF = "Sabar itu indah. Lihat QS 9:129 untuk itu. Rezeki dari Allah. Juga QS 8:77 menerangkannya.";
  const ONE = "Sabar itu indah. Lihat QS 9:129 untuk itu. Rezeki dari Allah.";

  it("the real guard reports ONE violation for two bad refs, and the same detail when the ref repeats", () => {
    // The premise of the whole block. If this ever stops being true — because the guard's `break`
    // is lifted, or `bad_ref` starts reporting a span — the tests below stop measuring what they
    // name, and this assertion is what says so.
    const v = guard(SAME).violations;
    expect(v.length).toBe(1);
    expect(v[0]!.detail).toBe("9:129");
    expect(guard(DIFF).violations[0]!.detail).toBe("9:129");
    expect(guard(ONE).violations.length).toBe(1);
  });

  it("repairs two sentences carrying the SAME bad ref", () => {
    const r = repairAnswerProse(SAME, guard);
    expect(r.prose).toBe("Sabar itu indah. Rezeki dari Allah.");
    expect(r.dropped).toBe(2);
    expect(guard(r.prose!).ok).toBe(true);
  });

  it("still repairs two sentences carrying DIFFERENT bad refs", () => {
    // The rank-1 path, which reaches this in two single deletions and never opens the pair search.
    const r = repairAnswerProse(DIFF, guard);
    expect(r.prose).toBe("Sabar itu indah. Rezeki dari Allah.");
    expect(r.dropped).toBe(2);
  });

  it("still repairs a single offender in one deletion", () => {
    const r = repairAnswerProse(ONE, guard);
    expect(r.prose).toBe("Sabar itu indah. Rezeki dari Allah.");
    expect(r.dropped).toBe(1);
  });

  it("returns null rather than deleting the whole answer when nothing clean is reachable", () => {
    const r = repairAnswerProse("Lihat QS 9:129 di sana. Juga QS 9:129 di sini.", guard);
    expect(r.prose).toBeNull();
    expect(r.dropped).toBe(0);
  });
});

describe("the pair expansion is bounded to ONE per call", () => {
  /**
   * THE FIRST VERSION OF THIS TEST COULD NOT HAVE FAILED, and `scholarly-gate` caught it by running
   * the counterfactual I had not: its input made 23 guard calls WITH the bound and 23 WITHOUT, against
   * an assertion of `toBeLessThan(40)`. A bound set far from the real value with a narrative attached
   * is `bundle-absence-needs-a-control` exactly. Its input had three offenders under ONE rule, so no
   * pair could ever lower the count, the first expansion failed, and a second was never reachable —
   * the test named a mechanism its fixture could not reach.
   *
   * THIS input can. Two rules, each tripped by TWO sentences with a constant detail per rule. One
   * expansion clears one rule and lowers the count from 2 to 1; a SECOND would be needed for the
   * other, and the bound is what stops it. Both arms measured 2026-08-22:
   *
   *     bound in place (shipped)   45 guard calls
   *     bound removed              61 guard calls
   *
   * THE OUTCOME IS DELIBERATELY NOT ASSERTED. Needing two expansions is a KNOWN HOLE, and
   * `dont-pin-a-known-hole-with-a-green-test` is this repo's record of what a passing test asserting
   * silence costs: closing the hole would turn the suite RED for doing the right thing. What is
   * asserted is the BOUND, which is a real property this test may defend. If a future change lifts it
   * on purpose, this failing is the correct signal — re-measure the number, never delete the assertion.
   */
  it("does not open a second pair search after the first lowers the count but leaves work", () => {
    const prose =
      "Bersih satu. ALFA di sini. Bersih dua. ALFA di sana. Bersih tiga. BETA di sini. Bersih empat. BETA di sana.";
    let calls = 0;
    const guard = (p: string) => {
      calls++;
      const violations: { rule: string; detail: string }[] = [];
      if (p.includes("ALFA")) violations.push({ rule: "wording", detail: "ALFA" });
      if (p.includes("BETA")) violations.push({ rule: "echo", detail: "BETA" });
      return { ok: violations.length === 0, violations };
    };
    repairAnswerProse(prose, guard);
    expect(calls).toBe(45);
  });
});
