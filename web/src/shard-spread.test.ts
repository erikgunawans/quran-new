/**
 * THE POOL WAS THE DEFECT, NOT THE RANKER.
 *
 * `entry-ranking.test.ts` fixed how entries are ORDERED once they are in the array. This file covers
 * what gets INTO the array. Measured before the widening: the index holds nine entries whose text
 * says `neraka`, spread over five chapters — 4 in Perintah dan Larangan, 2 in Ibadah, 1 each in
 * Allah, Membangun Pribadi Shalih and Muhammad. `retrieveKnowledge` loaded exactly one shard, so
 * five of the nine were unreachable at ANY ranking quality. Asked "apa yang menyebabkan orang masuk
 * neraka", the app returned ONE entry.
 *
 * These assert REFS, not slugs, for the reason entry-ranking.test.ts documents: a slug is a proxy
 * and the entries are what the reader actually gets. Every value here was captured from a live
 * `retrieveKnowledge` run, and each was confirmed to FAIL against the pre-widening code.
 */
import { describe, expect, test } from "bun:test";
import { retrieveKnowledge, matchTopic, categoriesContaining, subjectWordsOf } from "./knowledge.ts";
import { ACTION_FRAME, QUESTION_FRAME } from "./topic-words.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const text = await Bun.file(`web/public${u.startsWith("/") ? u : "/" + u}`).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

const refsOf = async (q: string): Promise<string[]> => {
  const r = await retrieveKnowledge(q);
  return (r?.entries ?? []).map((e) => `${e.surah}:${e.ayah}`);
};

const TARGET = "apa aja sih yang tidak kita sadari kita lakukan yang bisa membuat kita masuk neraka?";
const THIN = "apa yang menyebabkan orang masuk neraka";

describe("neraka entries outside the routed chapter are now reachable", () => {
  test("the routed chapter's four still surface — the widening must not cost what already worked", async () => {
    const refs = await refsOf(TARGET);
    // Guard against the vacuous pass entry-ranking.test.ts warns about: a dead retrieval returns []
    // and every toContain below would fail loudly, but a PARTIAL one would not, so assert the floor.
    expect(refs.length).toBeGreaterThanOrEqual(8);
    for (const r of ["3:131", "14:28", "14:29", "14:30"]) expect(refs).toContain(r);
  });

  test("entries the scholar filed in OTHER chapters now surface too", async () => {
    const refs = await refsOf(TARGET);
    // 74:43 + 85:10 are Ibadah, 8:13 is Membangun Pribadi Shalih, 9:68 is Allah. All four were
    // unreachable before: they were never in the array being sorted.
    for (const r of ["74:43", "85:10", "8:13", "9:68"]) expect(refs).toContain(r);
  });

  test("the thin question goes from one entry to eight", async () => {
    // Pre-widening this returned exactly ["8:13"] — routed to Membangun Pribadi Shalih, which holds
    // a single neraka line. The reader asked the most direct form of the question and got the least.
    const refs = await refsOf(THIN);
    expect(refs.length).toBeGreaterThan(1);
    expect(refs).toContain("8:13");
    expect(refs).toContain("3:131");
  });
});

describe("widening does not loosen what surfaces", () => {
  test("a subject the index does not cover still returns nothing", async () => {
    // The honest-silence path. Reading twelve more shards must not turn an uncovered subject into a
    // page of loosely-related verses — `score > 0 && onSubject` is unchanged and this proves it.
    expect(await refsOf("apa hukumnya pacaran")).toEqual([]);
  });

  test("a question that matches no topic at all still returns null", async () => {
    expect(await retrieveKnowledge("apa itu sabar")).toBeNull();
  });

  test("one verse filed in two chapters is shown once", async () => {
    // First run of the widening returned QS 2:278 TWICE for this question — once from Perintah dan
    // Larangan, once from Ekonomi Islam. Two cards, same ayah, which on a scholarship surface reads
    // as the scholar padding.
    const refs = await refsOf("hukum riba dalam islam");
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).toContain("30:39"); // the genuine new reach from Ekonomi Islam
  });

  test("a curated pin is untouched by the widening", async () => {
    expect(await refsOf("kewajiban anak kepada orang tua")).toEqual(["17:23", "2:83", "29:8", "46:15"]);
  });
});

describe("every entry can name the chapter it was collected under", () => {
  test("borrowed entries carry a category that differs from the answer's", async () => {
    const r = await retrieveKnowledge(TARGET);
    expect(r).not.toBeNull();
    // The render says "Ini yang {author} kumpulkan soal {category}". That sentence is false for a
    // borrowed line unless the line can say where it came from, so the field must be populated.
    for (const e of r!.entries) expect(e.category.length).toBeGreaterThan(0);
    expect(r!.entries.some((e) => e.categorySlug !== r!.slug)).toBe(true);
    expect(r!.entries.some((e) => e.categorySlug === r!.slug)).toBe(true);
  });
});

describe("the pool stays bounded", () => {
  /**
   * The bound is the measured maximum, not a round number chosen to look safe. Widening on ALL
   * subject words measured 9 of 13 shards, because `masuk` alone reaches 8 — it is how the question
   * is phrased, not what it is about. Restricting to non-ACTION_FRAME subject words measured a
   * maximum of 6 over the probe below, median 1-2. If a corpus rebuild pushes that up, this fails
   * here rather than as a slow page.
   */
  const isFrame = (w: string) => QUESTION_FRAME.has(w) || ACTION_FRAME.has(w);
  const shardsFor = (q: string): number => {
    const u = new Set(subjectWordsOf(q).filter((w) => !isFrame(w)).flatMap((w) => categoriesContaining(w)));
    const primary = matchTopic(q);
    if (primary) u.add(primary);
    return u.size;
  };

  test("no probed question loads more than six of the thirteen shards", () => {
    const probe = [
      TARGET, THIN, "bagaimana cara agar tidak masuk neraka", "hukum riba dalam islam",
      "bagaimana cara sholat", "apa hukumnya pacaran", "bagaimana adab kepada tetangga",
      "apa hukum musik dalam islam", "bagaimana cara bertaubat dari dosa besar",
      "apa saja tanda tanda kiamat", "bagaimana islam memandang perempuan bekerja",
    ];
    const worst = Math.max(...probe.map(shardsFor));
    expect(worst).toBe(6);
  });

  test("ACTION_FRAME words are what keep it bounded", () => {
    // `masuk` is the one that would blow the bound open, and it is an ACTION_FRAME word. If someone
    // removes it from that set, the pool rule silently widens and this says so.
    expect(isFrame("masuk")).toBe(true);
    expect(categoriesContaining("masuk").length).toBeGreaterThan(6);
    expect(isFrame("neraka")).toBe(false);
  });
});
