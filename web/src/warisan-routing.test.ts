/**
 * Warisan reaches the faraidh dalil — and the words beside it keep their pointer.
 *
 * These pin a 2026-08-12 finding that falsified the SECOND half of `.scratch/tanya-hukum/PRD.md`,
 * by the same error as the first: measuring at `retrieveKnowledge` instead of at the answer.
 *
 * The plan of record was "topic pins for `warisan` and `nikah`", both measured at zero entries.
 * Measured at the boundary `main.ts` actually uses, both bare words have `looksFactual === false`
 * and go down the FEELINGS path — `retrieveKnowledge`, where `matchPin` lives, is never called for
 * them. A pin on the bare word would have been dead code.
 *
 * What was really broken sat one layer up. `keluarga` listed `warisan` among its aliases. That is a
 * GROUNDED hit (it is a subject word, not ruling vocabulary), and a grounded hit returns
 * immediately — short-circuiting the subject-correction block that exists precisely to catch
 * "the chosen category does not contain this subject and another one does". Keluarga holds no
 * inheritance entry at all, so every factual phrasing that landed there answered with silence
 * while QS 4:11 sat in Perintah dan Larangan.
 *
 * `hukum warisan` escaped only by accident — Perintah dan Larangan tied it on the word `hukum`
 * and won the tie on alias iteration order. Accidents are not guarantees, so it is pinned here.
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
const answerFor = async (q: string) => await retrieveKnowledge(q);
const refsFor = async (q: string) => ((await retrieveKnowledge(q))?.entries ?? []).map((e) => e.ref);

describe("a factual warisan question reaches the verse that answers it", () => {
  // FORCE-RED PROOF: with "warisan" still in keluarga's alias list these four returned
  // keluarga with ZERO entries — the app went silent on a question the corpus answers.
  test("'apa itu warisan' no longer lands in the chapter that has no inheritance", async () => {
    expect(await refsFor("apa itu warisan")).toContain("QS. An-Nisa, 4:11");
  });

  test("naming the family chapter out loud does not divert it either", async () => {
    expect(await refsFor("hukum warisan dalam keluarga")).toContain("QS. An-Nisa, 4:11");
  });

  /**
   * 4:33 is reachable, but only when the question's wording happens to overlap it. Its text reads
   * "Berikan kepada AHLI WARIS bagian yang telah ditetapkan oleh Allah" — no "warisan", so
   * "hukum warisan dalam keluarga" ranks it below 4:34 and 9:23, which merely contain "keluarga".
   * That gap is the argument for a curated pin, and it is deliberately NOT asserted away here:
   * this suite pins the routing fix, not a ranking the corpus cannot currently deliver.
   */
  test("the trustee rule arrives on the phrasing that overlaps it", async () => {
    expect(await refsFor("apa hukum waris islam")).toContain("QS. An-Nisa, 4:33");
  });

  test("routing is to the chapter that actually holds faraidh", async () => {
    expect(matchTopic("apa itu warisan")).toBe("perintah-dan-larangan");
  });

  test("the phrasing that already worked by tie-break accident still works", async () => {
    expect(await refsFor("hukum warisan")).toContain("QS. An-Nisa, 4:11");
    expect(await refsFor("apa hukum waris islam")).toContain("QS. An-Nisa, 4:11");
  });
});

describe("the words left beside it keep the pointer they had", () => {
  /**
   * The alias list holds several words no category's entry text covers — `poligami`, `jodoh`,
   * `mertua`, `ipar`. For those the alias is the ONLY thing standing between the reader and
   * silence: it yields a Keluarga pointer rather than nothing. `perceraian` is load-bearing for a
   * second reason — it is also a feeling word, so with the alias removed `subjectWordsOf` drops it
   * and the question routes nowhere. Cutting the whole "lying alias" class would have traded a
   * useful pointer for silence in five places to fix one.
   */
  test("'apa itu perceraian' still points at the Keluarga chapter", async () => {
    expect(matchTopic("apa itu perceraian")).toBe("keluarga");
    expect(await answerFor("apa itu perceraian")).not.toBeNull();
  });

  test("poligami and jodoh still point somewhere rather than nowhere", () => {
    expect(matchTopic("poligami")).toBe("keluarga");
    expect(matchTopic("jodoh")).toBe("keluarga");
  });

  test("the marriage words keluarga really does hold are untouched", async () => {
    expect((await refsFor("menikah")).length).toBeGreaterThan(0);
    expect((await refsFor("pernikahan")).length).toBeGreaterThan(0);
  });
});

describe("nothing that already routed correctly moved", () => {
  test("the birrul walidain pin still wins", async () => {
    expect(await refsFor("kewajiban anak kepada orang tua")).toContain("QS. Al-Isra, 17:23");
  });

  test("ibadah and the rulings chapter are unaffected", () => {
    expect(matchTopic("bagaimana cara sholat")).toBe("ibadah");
    expect(matchTopic("apa hukum riba")).toBe("perintah-dan-larangan");
  });

  test("a feeling still reaches no topic at all", () => {
    expect(matchTopic("aku sedang sedih")).toBeNull();
  });
});
