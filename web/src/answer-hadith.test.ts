/**
 * The hadith path through an authored answer — ISC-434/435/449/450.
 *
 * `answer-blocked.test.ts` pins the wall SHUT: with nothing retrieved, every prophetic attribution is
 * refused. This file pins the door BESIDE it: with hadith actually retrieved and cited by marker, an
 * answer ships, and each of the three independent walls still holds on its own.
 *
 * The walls, in order, because they are easy to mistake for one guard written three times:
 *   1. THE WORKER, over what `searchDalil` returned this turn (`worker/src/index.ts`).
 *   2. THE BROWSER, over the records the response actually CARRIED (`synthesizeAnswer`). Independent
 *      because it asks the same question of data it can see for itself — a Worker that approved a
 *      marker and sent no record is refused here.
 *   3. THE RENDERER, over the records in hand at paint time (`aiHtml`). Covers the replayed turn,
 *      where prose and records were stored together and only the prose is trustworthy alone.
 *
 * Every test here was forced red before being kept — the standing rule after a "must not be called"
 * assertion once passed through the code's own catch.
 */
import { describe, expect, test } from "bun:test";
import {
  buildAnswerUserMessage,
  SYNTHESIS_SYSTEM_PROMPT,
  type AnswerContext,
  type AnswerResult,
  type GroundingHadith,
} from "./answer-contract.ts";
import { groundedHadithFrom, markersInProse, safeAnswer, stripMarkers } from "./answer-guard.ts";
import { hadithCardEl, type HadithCard } from "./hadith-card.ts";
import { gatherGrounding, synthesizeAnswer } from "./answer.ts";
import type { Corpus } from "./retrieve.ts";

const corpus = (await Bun.file("web/public/corpus.json").json()) as Corpus;

/** A retrieved hadith as the Worker offers it to the model. */
const grounding: GroundingHadith = {
  id: "hadith-bukhari-1",
  collection: "bukhari",
  hadith_number: 1,
  grade: "sahih",
  english: "Actions are but by intention, and every man shall have only that which he intended.",
};

/** The same record as the reader would meet it — verbatim from the pinned corpus. */
const card: HadithCard = {
  id: "hadith-bukhari-1",
  arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
  english: "Actions are but by intention.",
  collection: "bukhari",
  hadith_number: 1,
  grade: "sahih",
  book_en: "Revelation",
  bab_en: "How the Divine Revelation started",
  source_url: "https://sunnah.com/bukhari:1",
  translator: "M. Muhsin Khan",
  book: 1,
};

const model =
  (prose: string, hadith: readonly HadithCard[] = []) =>
  (_ctx: AnswerContext): Promise<AnswerResult> =>
    Promise.resolve({ prose, hadith });

// The canonical hadith-shaped question, borrowed from `answer-blocked.test.ts` so both files argue
// about the same case from opposite sides.
//
// It must GROUND, or the bow-out (ISC-418) returns null before the model is ever called and every
// "refused" assertion below passes for the wrong reason. That premise is asserted rather than
// assumed — see the first test. (Note the entries lane is always empty here: `retrieveKnowledge`
// fetches KB shards over the network, which bun test has no server for. The verses lane carries
// these cases.)
const QUESTION = "apakah sakit menghapus dosa";

describe("the marker protocol, end to end", () => {
  test("PREMISE — the question grounds, so every refusal below is the guard's doing", async () => {
    const g = await gatherGrounding(corpus, QUESTION, []);
    expect(g.verses.length + g.entries.length).toBeGreaterThan(0);
  });

  test("a marker backed by a returned record ships, and the hadith comes with it", async () => {
    const ai = await synthesizeAnswer(
      corpus,
      QUESTION,
      [],
      model("Nabi ﷺ mengajarkan bahwa amal bergantung pada niat [H:bukhari:1].", [card]),
    );
    expect(ai?.kind).toBe("answer");
    expect(ai?.kind === "answer" ? ai.hadith.map((h) => h.id) : null).toEqual(["hadith-bukhari-1"]);
  });

  test("THE SECOND WALL — a marker with no record behind it sinks the whole answer", async () => {
    // The Worker said yes and sent nothing. This is the case the browser's re-guard exists for, and
    // it is why the predicate is rebuilt from the response instead of being passed through.
    const ai = await synthesizeAnswer(
      corpus,
      QUESTION,
      [],
      model("Nabi ﷺ mengajarkan bahwa amal bergantung pada niat [H:bukhari:1].", []),
    );
    expect(ai).toBeNull();
  });

  test("a record the prose never cited is dropped, not stacked under the answer", async () => {
    const ai = await synthesizeAnswer(corpus, QUESTION, [], model("Sakit itu berat, dan Allah dekat dengan yang bersabar.", [card]));
    expect(ai?.kind).toBe("answer");
    expect(ai?.kind === "answer" ? ai.hadith : null).toEqual([]);
  });

  test("a prophetic attribution with NO marker is still refused, records or not", async () => {
    // The receipt rule is about the marker, never about whether hadith happened to be retrieved.
    const ai = await synthesizeAnswer(
      corpus,
      QUESTION,
      [],
      model("Rasulullah ﷺ bersabda bahwa amal bergantung pada niat.", [card]),
    );
    expect(ai).toBeNull();
  });

  test("a marker for a DIFFERENT hadith than the one returned does not resolve", async () => {
    const ai = await synthesizeAnswer(
      corpus,
      QUESTION,
      [],
      model("Nabi ﷺ mengajarkan tentang niat [H:bukhari:2].", [card]),
    );
    expect(ai).toBeNull();
  });

  test("FORCE-RED CONTROL — the same question authors fine with no hadith in play", async () => {
    // Without this, a `synthesizeAnswer` that returned null unconditionally would satisfy four of the
    // five tests above while breaking the product outright.
    const ai = await synthesizeAnswer(corpus, QUESTION, [], model("Sakit itu berat, dan Allah dekat dengan yang bersabar."));
    expect(ai?.kind).toBe("answer");
  });
});

describe("the marker is machine plumbing and never reaches a reader", () => {
  test("stripMarkers removes it and closes the space before the full stop", () => {
    expect(stripMarkers("...bergantung pada niat [H:bukhari:1].")).toBe("...bergantung pada niat.");
  });

  test("several markers in one paragraph all go", () => {
    expect(stripMarkers("a [H:bukhari:1] b [H:muslim:154] c")).toBe("a b c");
  });

  test("Anti: stripping does not touch an ayah reference or ordinary bracketed text", () => {
    const prose = "Lihat QS 2:155 [catatan] dan 2.153.";
    expect(stripMarkers(prose)).toBe(prose);
  });

  test("the stored prose KEEPS its markers, so a replayed turn is still guardable", async () => {
    const prose = "Nabi ﷺ mengajarkan bahwa amal bergantung pada niat [H:bukhari:1].";
    const ai = await synthesizeAnswer(corpus, QUESTION, [], model(prose, [card]));
    expect(ai?.kind === "answer" ? ai.prose : null).toBe(prose);
    expect(markersInProse(ai?.kind === "answer" ? ai.prose : "")).toEqual(["hadith-bukhari-1"]);
  });
});

describe("the contract teaches the receipt", () => {
  test("ISC-435 — the system prompt carries the marker syntax", () => {
    expect(SYNTHESIS_SYSTEM_PROMPT).toContain("[H:collection:number]");
  });

  test("the retrieved hadith reach the model as citable markers, with their bodies", () => {
    const msg = buildAnswerUserMessage({ question: "q", verses: [], entries: [], hadith: [grounding] });
    expect(msg).toContain("[H:bukhari:1]");
    expect(msg).toContain(grounding.english);
  });

  test("an EMPTY hadith list says so out loud rather than going silent", () => {
    // Rule 7 is static, so the model is taught the syntax on every turn including the ones that
    // retrieve nothing. Silence there is an invitation to invent a marker, and an invented marker
    // sinks the answer. Regression guard for exactly that.
    const msg = buildAnswerUserMessage({ question: "q", verses: [], entries: [] });
    expect(msg).toContain("(tidak ada)");
    expect(msg).not.toContain("[H:bukhari");
  });
});

describe("ISC-449 — the answer card's Indonesian, and the field it must never borrow", () => {
  test("machine Indonesian renders, and is labelled .is-ai", () => {
    const html = hadithCardEl({ ...card, machine_id: "Amal itu bergantung pada niatnya." });
    expect(html).toContain("Amal itu bergantung pada niatnya.");
    expect(html).toContain('class="hadith-id is-ai"');
  });

  test("ISC-448 — a reviewed rendering wins outright, and never shows beside the machine one", () => {
    const html = hadithCardEl({ ...card, reviewed_id: "Tinjauan ulama.", machine_id: "Mesin." });
    expect(html).toContain("Tinjauan ulama.");
    expect(html).not.toContain("Mesin.");
    // The reviewed line is NOT marked as AI output — that label is the whole distinction.
    expect(html).toContain('<p class="hadith-id" lang="id">');
  });

  test("neither field set → no Indonesian line at all, which is most records today", () => {
    expect(hadithCardEl(card)).not.toContain("hadith-id");
  });
});

describe("the walls are independent, not one guard written three times", () => {
  test("the Worker's predicate and the browser's ask the same question of different data", () => {
    const prose = "Nabi ﷺ mengajarkan tentang niat [H:bukhari:1].";
    // Worker: the union is what retrieval returned.
    expect(safeAnswer(prose, () => true, groundedHadithFrom(["hadith-bukhari-1"]))).toBe(prose);
    // Browser: the union is what the RESPONSE carried. Divergence is the whole point.
    expect(safeAnswer(prose, () => true, groundedHadithFrom([]))).toBeNull();
  });
});
