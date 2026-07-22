import { describe, expect, test } from "bun:test";
import { matchTopic, stemReach } from "./knowledge.ts";

/**
 * Routing pins.
 *
 * The bug: `matchTopic` knew only category ALIASES, so it routed on how a question was FRAMED
 * rather than what it was ABOUT. "homo itu hukumnya apa sih di islam?" scored on `hukum` and
 * `larangan`, landed on Perintah dan Larangan, and pointed there confidently — while the entry it
 * wanted ("Homoseksual", QS 7:80) sat in Membangun Pribadi Shalih. The index held the answer and
 * the router could not reach it.
 *
 * Most of these tests are REGRESSION pins, not new behaviour. The correction rule went through
 * three wrong versions before this one — each fixed the target case and broke a neighbour — so the
 * baseline is pinned deliberately and in detail.
 */
describe("the case this fixed", () => {
  test("a subject in the index reaches its own category, not the one its framing suggests", () => {
    expect(matchTopic("homo itu hukumnya apa sih di islam?")).toBe("membangun-pribadi-shalih");
  });

  test("the bare subject word routes too — it previously reached nothing at all", () => {
    expect(matchTopic("homoseksual")).toBe("membangun-pribadi-shalih");
  });
});

describe("curated aliases still win — subject correction never overrules them", () => {
  // Regression: "sholat" appears in Rahasia Kejiwaan's entry TEXTS but not Ibadah's, so an earlier
  // version of the rule moved this question out of Ibadah. A curated alias naming the subject
  // outright is stronger evidence than which entry texts happen to use the word.
  test("'bagaimana cara sholat' stays in Ibadah", () => {
    expect(matchTopic("bagaimana cara sholat")).toBe("ibadah");
  });

  test("definitional questions keep their category", () => {
    expect(matchTopic("allah itu siapa sih ?")).toBe("allah-subhanahu-wa-ta-ala");
    expect(matchTopic("siapa allah")).toBe("allah-subhanahu-wa-ta-ala");
    expect(matchTopic("nabi muhammad siapa")).toBe("muhammad-shallallahu-alaihi-wasallam");
    expect(matchTopic("apa itu zakat")).toBe("ibadah");
  });

  test("ruling questions about covered subjects stay where they were", () => {
    expect(matchTopic("apa hukum riba")).toBe("perintah-dan-larangan");
    expect(matchTopic("hukum musik dalam islam")).toBe("perintah-dan-larangan");
  });
});

describe("feeling questions must reach no topic at all", () => {
  // The feeling lane runs first and owns these words. A person saying they are sad, handed a
  // chapter of commands and prohibitions, has been answered by a machine that heard a keyword and
  // not a person. An earlier version of the rule did exactly that.
  test.each(["aku sedang sedih", "aku capek banget", "aku kangen ibu"])("%j routes nowhere", (q) => {
    expect(matchTopic(q)).toBeNull();
  });
});

describe("an uncovered subject blocks correction entirely", () => {
  /**
   * "hukum mendengarkan musik" names two subjects: `mendengarkan`, which the index uses freely
   * about listening to the Qur'an, and `musik`, which it does not cover at all. Correcting on the
   * covered word alone routed a question about music into a chapter about scripture — confidently
   * answering the wrong thing, which is the failure knowledge.test.ts already pins against.
   */
  test("stays on the framing route rather than chasing the one covered word", () => {
    expect(matchTopic("hukum mendengarkan musik")).toBe("perintah-dan-larangan");
  });
});

describe("stemReach is deliberately one-directional", () => {
  test("a clipped asked word reaches a fuller written one", () => {
    expect(stemReach("homo", "homoseksual")).toBe(true);
    expect(stemReach("zina", "zinah")).toBe(true);
  });

  test("a longer asked word does NOT reach a shorter written stem", () => {
    // This direction let "mendengarkan" match "mendengar" and surface entries for a subject the
    // index does not cover. The asymmetry is the fix, not an oversight.
    expect(stemReach("mendengarkan", "mendengar")).toBe(false);
  });

  test("prefix only — never substring", () => {
    expect(stemReach("ana", "zina")).toBe(false);
    expect(stemReach("kata", "perkataan")).toBe(false);
  });

  test("short tokens never stem — they are particles", () => {
    expect(stemReach("ada", "adalah")).toBe(false);
    expect(stemReach("dan", "dana")).toBe(false);
  });

  test("identical words always reach", () => {
    expect(stemReach("riba", "riba")).toBe(true);
  });
});
