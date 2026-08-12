/**
 * Hukum questions — what Tanya may answer, and with what.
 *
 * These pin the outcome of a 2026-08-12 investigation that FALSIFIED the premise of
 * `.scratch/tanya-hukum/PRD.md`. The PRD recorded `matchTopic("hukum warisan") ->
 * perintah-dan-larangan` as the bug and `-> keluarga` as the fix. Measured end-to-end, it is the
 * other way round:
 *
 *   retrieveKnowledge("warisan")        -> keluarga, ZERO entries
 *   retrieveKnowledge("hukum warisan")  -> perintah-dan-larangan, QS 4:11 + 4:19
 *
 * Keluarga's 40 entries are marriage, talak and parenting; not one mentions inheritance. The
 * faraidh dalil lives in Perintah dan Larangan (4:11, 4:33) and Karakteristik Negara Bersyari'ah
 * (2:180). Routing "hukum warisan" to keluarga would have deleted a correct answer and pinned the
 * deletion with a test, so the topic-selection half of the PRD was dropped rather than built.
 *
 * What was left after the premise fell: the answer was RIGHT but carried a noise line, because the
 * question-frame discipline stops at the topic boundary and never reached entry ranking.
 */
import { describe, expect, test } from "bun:test";
import { matchTopic } from "./knowledge.ts";

// Serve the built Peta shards from disk so retrieveKnowledge runs with no server.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const u = String(input);
  const text = await Bun.file(`web/public${u.startsWith("/") ? u : "/" + u}`).text();
  return { ok: true, json: async () => JSON.parse(text) } as Response;
}) as typeof fetch;

const { retrieveKnowledge } = await import("./knowledge.ts");
const refsFor = async (q: string) => ((await retrieveKnowledge(q))?.entries ?? []).map((e) => e.ref);

describe("the dalil is reachable — pinning what already works, so it cannot be 'fixed' away", () => {
  test("'hukum warisan' reaches the faraidh verse itself", async () => {
    expect(await refsFor("hukum warisan")).toContain("QS. An-Nisa, 4:11");
  });

  test("Erik's own phrasing reaches it too", async () => {
    expect(await refsFor("saya mau tanya tentang hukum warisan di islam")).toContain("QS. An-Nisa, 4:11");
  });

  // The two rows of the PRD's own table. Both must stay green: the rulings chapter genuinely
  // CONTAINS riba rulings (71 of its 626 entries), which is why framing wins here and only here.
  test("'apa hukum riba' stays in the rulings chapter", () => {
    expect(matchTopic("apa hukum riba")).toBe("perintah-dan-larangan");
  });

  test("'bagaimana cara sholat' stays in Ibadah", () => {
    expect(matchTopic("bagaimana cara sholat")).toBe("ibadah");
  });

  test("a feeling still reaches no topic at all", () => {
    expect(matchTopic("aku sedang sedih")).toBeNull();
  });
});

describe("the speech-act preamble must not rank entries", () => {
  /**
   * FORCE-RED PROOF: with `tanya` absent from the speech-act stop list, this assertion failed —
   * "saya mau TANYA tentang hukum warisan" returned QS 10:94 "Tanyakan kebenaran Al-Qur'an kepada
   * Ahli Kitab" as entry #2, ranked above the real second inheritance line. It shipped that way to
   * production and is visible in the live answer captured on 2026-08-12.
   *
   * `topic-words.ts` already drops the speech-act verbs people open questions with — "ceritakan",
   * "jelaskan", "sebutkan", "jawab", "beritahu". The whole family was there except the single most
   * common Indonesian opener, which is also this app's own name for the feature.
   *
   * The bound is deliberately an EXCLUSION of a known-bad ref rather than a count. A count would
   * pass on any list that happens to be short, including a broken one.
   */
  test("'saya mau tanya…' does not pull in the entry about ASKING", async () => {
    expect(await refsFor("saya mau tanya tentang hukum warisan di islam")).not.toContain("QS. Yunus, 10:94");
  });

  test("the preamble changes nothing — same refs with it and without it", async () => {
    expect(await refsFor("saya mau tanya tentang hukum warisan di islam")).toEqual(await refsFor("hukum warisan"));
  });

  test.each(["nanya soal hukum riba", "mau tanya hukum riba", "pertanyaan tentang hukum riba"])(
    "%j reaches the riba lines, not the asking line",
    async (q) => {
      const refs = await refsFor(q);
      expect(refs).not.toContain("QS. Yunus, 10:94");
      expect(refs.length).toBeGreaterThan(0);
    },
  );
});

describe("silence stays honest where the corpus is genuinely empty", () => {
  /**
   * `pacaran` appears nowhere in the 2,451-entry index. There is no ayah to name, so there is
   * nothing for the tafsir tier to orient either. Routing it to the zina entries would be the app
   * deciding that pacaran IS zina — a ruling, which this lane may never issue. Silence is correct.
   */
  test("'hukum pacaran' returns no entries rather than the nearest ruling", async () => {
    expect(await refsFor("hukum pacaran")).toEqual([]);
  });
});
