import { describe, expect, test } from "bun:test";
import { lateOutcome } from "./withheld-turn.ts";
import type { Turn } from "./thread.ts";

const Q = "bolehkah perempuan jadi pemimpin";
const fastAnswer: Turn = { q: Q, kind: "hits", refs: ["4:34", "27:23"] };
const fastSilence: Turn = { q: Q, kind: "silence" };

describe("annotateWithheld — the late refusal has somewhere to go (ISC-533)", () => {
  // THE REACHABILITY TEST THAT NEVER EXISTED. Every other `answer-blocked` test in this repo reads
  // `main.ts` as a source string and asserts what the sentence says; not one asks whether any path
  // can produce the turn. All five stayed green for the whole time the channel was dead.
  test("a real guard refusal on a silent turn produces answer-blocked", () => {
    expect(lateOutcome(fastSilence, null, "blocked")).toEqual({ q: Q, kind: "answer-blocked" });
  });

  test("a real guard refusal beside a real answer annotates it and keeps every field", () => {
    expect(lateOutcome(fastAnswer, null, "blocked")).toEqual({
      q: Q,
      kind: "hits",
      refs: ["4:34", "27:23"],
      withheld: "wall",
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
      expect(lateOutcome(fastAnswer, null, terminal)).toBeNull();
      expect(lateOutcome(fastSilence, null, terminal)).toBeNull();
    });
  }

  test("no report at all is cannot-tell, and cannot-tell says nothing", () => {
    // A Worker older than ISC-532, or a token this build does not recognise, both arrive as null.
    // Fail toward the old silence, never toward a claim.
    expect(lateOutcome(fastAnswer, null, null)).toBeNull();
    expect(lateOutcome(fastSilence, null, null)).toBeNull();
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
      const out = lateOutcome(fast, null, "blocked");
      expect(out).not.toBeNull();
      expect(out?.kind).toBe(fast.kind);
      // Every field of the painted turn is still there — annotation, not substitution.
      expect({ ...out, withheld: undefined }).toEqual({ ...fast, withheld: undefined });
      expect(out?.withheld).toBe("wall");
    });
  }

  test("only `silence` is ever traded away, and only for copy that claims nothing", () => {
    // `silence` states that nothing in the corpus matched. On a refused question that is false, and
    // for a fiqh question it is a false claim about the mushaf. It is the one turn worth replacing.
    const replaced = painted.filter((t) => lateOutcome(t, null, "blocked")?.kind !== t.kind);
    expect(replaced).toEqual([]);
    expect(lateOutcome(fastSilence, null, "blocked")?.kind).toBe("answer-blocked");
  });
});

describe("lateOutcome — the Hadis pointer annotates, it does not evict (ISC-642, Erik 2026-08-24)", () => {
  // WHAT WAS LIVE BEFORE THIS. `applyAi` turns a `bad_hadith` block into a `hadith-defer` turn, and the
  // late path RENDERED it — a cited, grounded answer the reader had been reading for sixteen seconds was
  // replaced at ~25 s by an apology. The ISC-534 anti-criterion did not cover it, because it arrived as
  // a truthy `composed` rather than through the refusal branch. Erik ruled the answer outranks the
  // pointer: the answer's grounding never depended on the model's separate attempt, and the pointer
  // loses nothing by being an aside.
  const defer: Turn = { q: Q, kind: "hadith-defer" };

  test("a real answer keeps its kind, its fields, and gains the hadith note", () => {
    expect(lateOutcome(fastAnswer, defer, "blocked")).toEqual({
      q: Q,
      kind: "hits",
      refs: ["4:34", "27:23"],
      withheld: "hadith",
    });
  });

  test("the two annotations are DIFFERENT — a hadith refusal is not a plain wall refusal", () => {
    // If these collapsed to one flavour the reader would lose the Hadis pointer, which is the whole
    // thing Erik's ruling preserved. `wall` has nothing further to point at; `hadith` does.
    expect(lateOutcome(fastAnswer, defer, "blocked")?.withheld).toBe("hadith");
    expect(lateOutcome(fastAnswer, null, "blocked")?.withheld).toBe("wall");
  });

  test("a silent turn is still REPLACED by the pointer — the pointer beats a false claim", () => {
    expect(lateOutcome(fastSilence, defer, "blocked")).toEqual(defer);
  });

  test("the hadith pointer does not need `gen.reason` — the wall named it directly", () => {
    // `bad_hadith` is the one refusal that reaches this function as a TURN rather than as a terminal
    // token, so it is not gated on the deadline discriminator. A pointer is true whether the turn ran
    // out of clock or not: the question is still one a hadith answers.
    expect(lateOutcome(fastAnswer, defer, "deadline")?.withheld).toBe("hadith");
    expect(lateOutcome(fastAnswer, defer, null)?.withheld).toBe("hadith");
  });
});
