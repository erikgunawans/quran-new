/**
 * THE ROUTE WAS RIGHT AND THE ENTRIES WERE STILL WRONG.
 *
 * `topic-broad-tier.test.ts` fixed the routing half of the reported failure and asserted it with a
 * control set of literal slugs. It stopped there, and so did every other routing test in this repo —
 * which is why the second half shipped unnoticed: asked "…yang bisa membuat kita masuk neraka?",
 * the app routed correctly to Perintah dan Larangan and then handed back 2:180 (wasiat), 2:208,
 * 2:238, 3:131, 17:78, 24:27, 24:58, 25:9 — the chapter in ascending surah order, three of them
 * there on the word `masuk` alone ("Berilah salam sebelum masuk rumah orang").
 *
 * Instrumented at that commit: 16 entries matched and the score histogram was `{1: 16}`. Every
 * matched word weighed 1 and the four query words never co-occurred, so nothing could outscore
 * anything; the stable sort returned document order and `MAX_ENTRIES = 8` cut the tie at 8,
 * dropping 14:28-30.
 *
 * SO THESE TESTS ASSERT REFS, NOT SLUGS. A slug is a proxy; the entries are the thing the reader
 * actually gets. Every value here was captured from `retrieveKnowledge` and each guard case was
 * confirmed to pass BEFORE the ACTION_FRAME change, so a demotion shows up as a failure here
 * rather than as a quieter answer in production.
 */
import { describe, expect, test } from "bun:test";
import { retrieveKnowledge } from "./knowledge.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const path = `web/public${u.startsWith("/") ? u : "/" + u}`;
  const text = await Bun.file(path).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

const refsOf = async (q: string): Promise<string[]> => {
  const r = await retrieveKnowledge(q);
  return (r?.entries ?? []).map((e) => `${e.surah}:${e.ayah}`);
};

const TARGET = "apa aja sih yang tidak kita sadari kita lakukan yang bisa membuat kita masuk neraka?";

describe("the reported question gets the chapter's neraka entries", () => {
  test("all four neraka entries in the routed chapter surface", async () => {
    // 3:131 alone used to survive, at rank 3, by accident of sitting in Al-Imran. 14:28-30 sat at
    // doc#459-461 and were cut by MAX_ENTRIES.
    const refs = await refsOf(TARGET);
    expect(refs).toContain("3:131");
    expect(refs).toContain("14:28");
    expect(refs).toContain("14:29");
    expect(refs).toContain("14:30");
  });

  test("nothing surfaces on a generic action verb alone", async () => {
    // These three matched `masuk` and nothing else. An entry about greeting someone before entering
    // their house is not an answer to a question about the hereafter, and it consumed a slot that
    // 14:28 needed.
    const refs = await refsOf(TARGET);
    expect(refs).not.toContain("24:27"); // Berilah salam sebelum masuk rumah orang
    expect(refs).not.toContain("24:58"); // minta izin sebelum masuk kamar orang tua
    expect(refs).not.toContain("2:208"); // Masuk Islam secara total
  });
});

describe("guard — entries that were already right must not move", () => {
  // Captured from retrieveKnowledge BEFORE the change. Asserted as literal refs: "it still returns
  // something" is the assertion that lets a demotion through.
  test.each([
    ["apa hukum riba dalam islam?", "2:278"],
    ["kenapa harus zakat?", "9:103"],
    ["apa kewajiban seorang pemimpin?", "22:27"],
    ["bagaimana cara bertaubat dari dosa besar?", "3:135"],
  ])("%s still leads with %s", async (q, lead) => {
    expect((await refsOf(q))[0]).toBe(lead);
  });

  test("a question with no subject beyond its frame still surfaces entries", async () => {
    // `masuk` is action-frame, `islam` is corpus-frame — so this question has NO subject word left,
    // and subjectWords' empty-set escape must let the frame score normally rather than go silent.
    const refs = await refsOf("gimana cara masuk islam?");
    expect(refs.length).toBeGreaterThan(0);
  });
});
