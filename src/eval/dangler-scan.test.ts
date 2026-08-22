/**
 * Tests for the ISC-566 dangler DIAGNOSTIC.
 *
 * WHAT THESE PIN, AND WHAT THEY DO NOT. They pin the INSTRUMENT — that it fires on the one committed
 * witness and stays quiet on coherent prose. They do NOT pin the hole. ISC-566 is OPEN, no fix
 * shipped, and nothing here asserts a dangler is prevented (`dont-pin-a-known-hole-with-a-green-test`).
 *
 * THE WITNESS PROSE IS SPLICED FROM THE CAPTURE, NEVER RETYPED. The bytes are read out of
 * `docs/review/captures/api-answer-9ab57d4b-2026-08-22.json` at run time, because Indonesian and
 * Arabic that is retyped is not the text that shipped (`arabic-normalization-hazard`).
 *
 * THE CONTROL ARM IS THE POINT. A scanner that flagged every paragraph would satisfy the witness
 * assertions and be worthless. Turns 1 and 2 of the same capture were NEVER REPAIRED — nothing was
 * excised from them, so every signal there is a false positive by construction. They are asserted
 * here as the control (`control-arm-or-no-claim`).
 */

import { describe, expect, test } from "bun:test";
import { scanAnswer, type AnswerScan } from "./dangler-scan.ts";
import { splitParagraphs } from "../../worker/src/answer-repair.ts";

const CAPTURE = new URL(
  "../../docs/review/captures/api-answer-9ab57d4b-2026-08-22.json",
  import.meta.url,
).pathname;

interface CapturedTurn {
  turn: string;
  body: { answer: string | null; gen: { repaired: boolean } };
}

const turns: CapturedTurn[] = await Bun.file(CAPTURE).json();
const scanOf = (index: number): AnswerScan => scanAnswer(turns[index]!.body.answer ?? "");

describe("the committed witness — ISC-566's (c1) and (c2)", () => {
  const witness = turns[2]!;

  test("turn-3 is the repaired turn this diagnostic exists for", () => {
    expect(witness.body.gen.repaired).toBe(true);
  });

  test("signal A flags both danglers, and BOTH are only `candidate` — neither is derivable", () => {
    const scan = scanOf(2);
    expect(scan.paragraphs).toBe(3);
    expect(scan.signalA.map((hit) => [hit.paragraphIndex, hit.opener, hit.tier])).toEqual([
      [1, "selain itu", "candidate"],
      [2, "jadi", "candidate"],
    ]);
    // The instrument cannot reach `necessary` on the very answer that motivated it, because both
    // danglers sit behind a SURVIVING predecessor. This is the bound, asserted rather than described.
    expect(scan.signalA.every((hit) => hit.tier === "candidate")).toBe(true);
  });

  test("signal B flags the `sungai … itu` anaphora ISC-566 names, in the THIRD paragraph", () => {
    const scan = scanOf(2);
    const real = scan.signalB.find((hit) => hit.paragraphIndex === 2);
    expect(real).toBeDefined();
    expect(real!.marker).toBe("itu");
    expect(real!.soleOccurrences).toContain("sungai");
  });

  test("signal B ALSO fires on topic-marking `itu` — two hits on the witness, not one", () => {
    const scan = scanOf(2);
    // "…shalat di dua ujung siang dan sebagian malam itu menghapus kesalahan-kesalahan." — the
    // MODEL'S OWN paraphrase of a verse, UNREVIEWED, carrying no verse reference and no translator,
    // quoted at the shipped casing. The `itu` marks the topic of the very clause it sits in; its
    // referent never left, so this is a FALSE POSITIVE and not a second dangler. "Two hits, one of
    // which corresponds to the dangler ISC-566 INFERS" is the honest statement — not a measured
    // precision, since that criterion is explicit the distance is "INFERRED, NOT RECORDED". It is asserted rather than tuned away: suppressing it would
    // mean shaping the rule around the ONE witness that motivated the rule
    // (`a-fixture-can-teach-the-suite-to-expect-the-bug`), on a corpus of n=1.
    expect(scan.signalB).toHaveLength(2);
    const falsePositive = scan.signalB.find((hit) => hit.paragraphIndex === 1);
    expect(falsePositive).toBeDefined();
    expect(falsePositive!.soleOccurrences).toEqual(["sebagian", "malam"]);
  });
});

describe("control arm — turns NEVER repaired, so every hit is a false positive", () => {
  test("turn-1 is silent on both signals", () => {
    expect(turns[0]!.body.gen.repaired).toBe(false);
    const scan = scanOf(0);
    expect(scan.signalA).toHaveLength(0);
    expect(scan.signalB).toHaveLength(0);
  });

  test("turn-2 produces ONE measured signal-A false positive, and zero on signal B", () => {
    expect(turns[1]!.body.gen.repaired).toBe(false);
    const scan = scanOf(1);
    // A coherent, never-excised answer whose fifth paragraph merely opens on "Jadi,". This is the
    // noise A/candidate was declared to carry, measured rather than predicted.
    expect(scan.signalA.map((hit) => [hit.paragraphIndex, hit.opener])).toEqual([[4, "jadi"]]);
    expect(scan.signalB).toHaveLength(0);
    // IF THIS GOES RED because the count dropped, the false positive was fixed — re-measure the
    // control and say so. Do not just edit the number to match.
  });
});

describe("mechanics", () => {
  test("index 0 is the only tier the capture can establish", () => {
    const scan = scanAnswer("Selain itu, hal ini penting.\n\nKalimat kedua berdiri sendiri.\n");
    expect(scan.signalA[0]).toMatchObject({ paragraphIndex: 0, tier: "necessary" });
  });

  test("an opener must end at a word boundary — `itulah` is not `itu`", () => {
    expect(scanAnswer("Itulah sebabnya kami hadir.\n").signalA).toHaveLength(0);
    expect(scanAnswer("Inilah jawabannya.\n").signalA).toHaveLength(0);
  });

  test("the longest opener wins, so `oleh karena itu` is not scored as `karena itu`", () => {
    const scan = scanAnswer("Oleh karena itu, kami menulis.\n");
    expect(scan.signalA[0]!.opener).toBe("oleh karena itu");
  });

  test("a connective `itu` does not become a signal-B definite", () => {
    // "Selain itu" is a discourse connective; its `itu` heads no noun phrase, so B must skip it
    // even though the paragraph carries words that occur exactly once.
    const scan = scanAnswer("Selain itu, kemuliaan terpancar.\n");
    expect(scan.signalB).toHaveLength(0);
  });

  test("a definite whose head recurs in the surviving prose is NOT flagged", () => {
    // `sungai` twice — an antecedent survives, so the signal must stay quiet. This is the
    // discrimination the whole of signal B rests on.
    const scan = scanAnswer(
      "Ada sungai di depan rumah.\n\nIngatlah sungai itu.\n",
    );
    expect(scan.signalB).toHaveLength(0);
  });

  test("the shared splitParagraphs still rejoins byte for byte", () => {
    // A paragraph COUNT would pass identically against a hand-copied splitter, so it cannot show the
    // property its name claims (`fake-differs-by-construction`). Assert the exactness contract
    // itself, against the witness bytes rather than a toy string.
    const shipped = turns[2]!.body.answer ?? "";
    expect(splitParagraphs(shipped).join("")).toBe(shipped);
    expect(scanAnswer(shipped).paragraphs).toBe(splitParagraphs(shipped).length);
  });
});
