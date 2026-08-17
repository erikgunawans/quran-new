/**
 * `rankByFiqhArea` — the FIKIH step of Erik's ayat → hadits → fikih sequence.
 *
 * The whole safety argument for this function is that it ORDERS and never CHOOSES, so that is what
 * these tests pin. A re-rank that could drop a hit would be a filter wearing a re-rank's name, and
 * the app has no licensed fiqh source that would justify one.
 */
import { describe, expect, test } from "bun:test";
import { rankByFiqhArea } from "./index.ts";
import type { DalilHit } from "./dalil.ts";

const hit = (id: string, collection: string, book: number, rerank: number): DalilHit =>
  ({
    id,
    score: 0.5,
    rerank_score: rerank,
    // `bookOf` reads segment [2]; the shard layout is `hadith/<collection>/<book>/<n>.md`.
    path: `hadith/${collection}/${String(book).padStart(3, "0")}/0001.md`,
    collection,
    hadith_number: 1,
    grade: "sahih",
    book_en: "",
    bab_en: "",
  }) as DalilHit;

describe("rankByFiqhArea", () => {
  test("hits from the area's own kitab come first", () => {
    // thaharah → muslim:2, bukhari:4, bukhari:5 (fikih.ts). `bukhari:78` is outside it.
    const hits = [hit("far", "bukhari", 78, 0.9), hit("near", "bukhari", 4, 0.1)];
    expect(rankByFiqhArea(hits, "bagaimana cara wudu yang benar").map((h) => h.id)).toEqual([
      "near",
      "far",
    ]);
  });

  test("NOTHING IS DROPPED — a re-rank, not a filter", () => {
    // The load-bearing property. If this ever shrinks, the function has started choosing evidence
    // rather than ordering it, which is precisely what the app has no source to justify.
    const hits = [hit("a", "bukhari", 78, 0.9), hit("b", "bukhari", 4, 0.1), hit("c", "muslim", 40, 0.5)];
    const out = rankByFiqhArea(hits, "bagaimana cara wudu yang benar");
    expect(out).toHaveLength(hits.length);
    expect(new Set(out.map((h) => h.id))).toEqual(new Set(["a", "b", "c"]));
  });

  test("a question that routes nowhere leaves the order untouched", () => {
    const hits = [hit("a", "bukhari", 78, 0.9), hit("b", "bukhari", 4, 0.1)];
    expect(rankByFiqhArea(hits, "aku udah gak kuat, semua terasa berat").map((h) => h.id)).toEqual([
      "a",
      "b",
    ]);
  });

  test("STABLE — ties keep the reranker's judgement instead of scrambling it", () => {
    // Three hits, none in the salat kitab set beyond the first two: within each group the incoming
    // order must survive, because the reranker already ordered them and this function knows nothing
    // the reranker did not.
    const hits = [
      hit("out1", "bukhari", 78, 0.9),
      hit("in1", "bukhari", 10, 0.8),
      hit("out2", "bukhari", 79, 0.7),
      hit("in2", "bukhari", 11, 0.6),
    ];
    expect(rankByFiqhArea(hits, "berapa rakaat salat duha").map((h) => h.id)).toEqual([
      "in1",
      "in2",
      "out1",
      "out2",
    ]);
  });

  test("an empty result stays empty", () => {
    expect(rankByFiqhArea([], "bagaimana cara wudu")).toEqual([]);
  });
});
