import { describe, expect, test } from "bun:test";
import { annotateWithheld } from "./withheld-turn.ts";
import type { Turn } from "./thread.ts";

const Q = "bolehkah perempuan jadi pemimpin";
const fastAnswer: Turn = { q: Q, kind: "hits", refs: ["4:34", "27:23"] };
const fastSilence: Turn = { q: Q, kind: "silence" };

describe("annotateWithheld — the late refusal has somewhere to go (ISC-533)", () => {
  // THE REACHABILITY TEST THAT NEVER EXISTED. Every other `answer-blocked` test in this repo reads
  // `main.ts` as a source string and asserts what the sentence says; not one asks whether any path
  // can produce the turn. All five stayed green for the whole time the channel was dead.
  test("a real guard refusal on a silent turn produces answer-blocked", () => {
    expect(annotateWithheld(fastSilence, "blocked")).toEqual({ q: Q, kind: "answer-blocked" });
  });

  test("a real guard refusal beside a real answer annotates it and keeps every field", () => {
    expect(annotateWithheld(fastAnswer, "blocked")).toEqual({
      q: Q,
      kind: "hits",
      refs: ["4:34", "27:23"],
      withheld: true,
    });
  });
});

describe("annotateWithheld — a clock is not a refusal", () => {
  // THE LOAD-BEARING NEGATIVE. `blocked` on the wire cannot separate these: on a timed-out turn
  // `verdictAfterFailure` preserves attempt 1's verdict, so the field reads identically to a real
  // second refusal. Measured 2 of 21 grounded turns live, 2026-08-19. Telling those readers an answer
  // was found and withheld would name the wrong actor at roughly a tenth of grounded traffic.
  for (const terminal of ["deadline", "threw", "answered", "no_attempt"] as const) {
    test(`terminal ${terminal} changes nothing, beside an answer or beside silence`, () => {
      expect(annotateWithheld(fastAnswer, terminal)).toBeNull();
      expect(annotateWithheld(fastSilence, terminal)).toBeNull();
    });
  }

  test("no report at all is cannot-tell, and cannot-tell says nothing", () => {
    // A Worker older than ISC-532, or a token this build does not recognise, both arrive as null.
    // Fail toward the old silence, never toward a claim.
    expect(annotateWithheld(fastAnswer, null)).toBeNull();
    expect(annotateWithheld(fastSilence, null)).toBeNull();
  });
});

describe("annotateWithheld — never downgrades an answer the reader is holding (ISC-534)", () => {
  // The anti-criterion, run over every turn kind the principled chain can paint at FAST_ANSWER_MS.
  // A blanket "replace on refusal" would take a cited answer off the screen at ~25 s; the fast
  // answer's grounding never depended on the model's verdict.
  const painted: Turn[] = [
    { q: Q, kind: "hits", refs: ["4:34"] },
    { q: Q, kind: "ayah", surah: 4, ayah: 34 },
    { q: Q, kind: "surah", surah: 4 },
    { q: Q, kind: "knowledge", slug: "kepemimpinan" },
    { q: Q, kind: "aqidah", id: "tauhid-1" },
    { q: Q, kind: "refer" },
    { q: Q, kind: "count-defer" },
    { q: Q, kind: "hadith-defer" },
  ];
  for (const fast of painted) {
    test(`${fast.kind} survives the refusal intact`, () => {
      const out = annotateWithheld(fast, "blocked");
      expect(out).not.toBeNull();
      expect(out?.kind).toBe(fast.kind);
      // Every field of the painted turn is still there — annotation, not substitution.
      expect({ ...out, withheld: undefined }).toEqual({ ...fast, withheld: undefined });
      expect(out?.withheld).toBe(true);
    });
  }

  test("only `silence` is ever traded away, and only for copy that claims nothing", () => {
    // `silence` states that nothing in the corpus matched. On a refused question that is false, and
    // for a fiqh question it is a false claim about the mushaf. It is the one turn worth replacing.
    const replaced = painted.filter((t) => annotateWithheld(t, "blocked")?.kind !== t.kind);
    expect(replaced).toEqual([]);
    expect(annotateWithheld(fastSilence, "blocked")?.kind).toBe("answer-blocked");
  });
});
