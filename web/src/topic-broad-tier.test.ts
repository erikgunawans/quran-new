/**
 * THE ROUTER COULD NOT SEE THE WORDS THE CORPUS IS MOST ABOUT.
 *
 * Measured on production 2026-08-16. Asked "apa aja sih yang tidak kita sadari kita lakukan yang
 * bisa membuat kita masuk neraka?", the app made ZERO `/api/` requests and told the reader nothing
 * in the verified corpus matched. It had not looked, and it could not: `matchTopic` returned null,
 * so `retrieveKnowledge` returned null, so `hasGrounding` was false and `synthesizeAnswer` bowed out
 * before the network call. Meanwhile the scholar's index holds NINE entries on neraka — 74:43
 * (leaving prayer), 85:10 (persecuting believers), 8:13 (defying the Messenger), 14:28-30 (a leader
 * dragging his people in), 3:131 — several of them direct answers to that exact question.
 *
 * The cause was `MAX_SPREAD = 3` in build-topic-subjects.ts: a word occurring in more than three
 * categories was discarded as framing rather than subject. In a thematic index of the Qur'an cut
 * into 13 chapters, occurring everywhere is what CENTRAL looks like. 276 words went that way, and
 * they were the religion's core vocabulary — neraka, dosa, akhirat, surga, iman, rezeki, tauhid.
 *
 * WHY A CONTROL SET AND NOT JUST THE TARGET. A router change that fixes one question and silently
 * re-routes forty others is not a fix, and this repo has shipped that shape before (the `musik` and
 * `homo` cases below are both scars). Every GUARD value here was captured from the router BEFORE the
 * change and must not move. They are asserted as literal slugs, not as "not null", because "it still
 * routes somewhere" is exactly the assertion that would have let the regression through.
 */
import { describe, expect, test } from "bun:test";
import { categoriesContaining, matchTopic, subjectWordsOf } from "./knowledge.ts";
import { TOPIC_BROAD, TOPIC_SUBJECTS } from "./topic-subjects.ts";

const TARGET = "apa aja sih yang tidak kita sadari kita lakukan yang bisa membuat kita masuk neraka?";

describe("the question that started this reaches the scholar's index", () => {
  test("the production question routes at all", () => {
    expect(matchTopic(TARGET)).not.toBeNull();
  });

  test("it routes to Perintah dan Larangan, where the neraka entries live", () => {
    // 3:131 "Jauhkan diri dari siksa neraka" and 14:28-30 are in this shard. Asserting the slug and
    // not merely non-null: routing somewhere is not the same as routing correctly.
    expect(matchTopic(TARGET)).toBe("perintah-dan-larangan");
  });

  test("the short form routes too — the fix is not a fluke of one long sentence", () => {
    expect(matchTopic("masuk neraka")).toBe("perintah-dan-larangan");
    expect(matchTopic("dosa apa yang membuat masuk neraka")).toBe("perintah-dan-larangan");
    expect(matchTopic("apa itu akhirat")).toBe("perintah-dan-larangan");
  });
});

describe("the corpus's central vocabulary is reachable again", () => {
  // Each of these occurs in the shipped shards and each was discarded by the spread cap. They are
  // asserted through `categoriesContaining` rather than by table membership, because the caller's
  // veto asks that function, not the table.
  for (const w of ["neraka", "dosa", "akhirat", "surga", "iman", "rezeki", "tauhid"]) {
    test(`"${w}" reaches at least one category`, () => {
      expect(categoriesContaining(w).length).toBeGreaterThan(0);
    });
  }

  test("the discriminating tier still answers first, so existing routes cannot be redirected", () => {
    // `homoseksual` is a spread-1 word: maximally discriminating, and it must keep its own answer
    // rather than be diluted by anything the broad tier adds.
    expect(categoriesContaining("homoseksual")).toEqual(["membangun-pribadi-shalih"]);
  });
});

describe("a word absent from the corpus is still absent — the veto keeps its basis", () => {
  // This is what stops the correction firing for "hukum mendengarkan musik". If either of these ever
  // becomes covered, the veto stops meaning anything and the musik regression returns.
  for (const w of ["musik", "pacaran"]) {
    test(`"${w}" is in neither tier`, () => {
      expect(TOPIC_SUBJECTS[w]).toBeUndefined();
      expect(TOPIC_BROAD[w]).toBeUndefined();
      expect(categoriesContaining(w)).toEqual([]);
    });
  }
});

describe("grammar words are not subjects", () => {
  test('"sedang" cannot carry a route', () => {
    // It reached one. `matchTopic("aku sedang sedih")` returned the Prophet's chapter on the
    // strength of this word alone, because the spread cap had been deleting it for being BROAD and
    // nobody had ever put it where it belonged. Four separate tests forbid that outcome; this pins
    // the cause rather than the symptom.
    expect(subjectWordsOf("aku sedang sedih")).toEqual([]);
    expect(categoriesContaining("sedang")).toEqual([]);
  });

  test("a feeling still reaches no topic at all", () => {
    for (const q of ["aku sedang sedih", "aku lagi capek banget", "aku sedih"]) {
      expect(matchTopic(q)).toBeNull();
    }
  });
});

describe("CONTROL — every route captured before the change is unmoved", () => {
  const BASELINE: readonly (readonly [string, string])[] = [
    ["hukum mendengarkan musik", "perintah-dan-larangan"],
    ["hukum pacaran dalam islam", "perintah-dan-larangan"],
    ["homo itu hukumnya apa sih di islam?", "membangun-pribadi-shalih"],
    ["bagaimana cara sholat", "ibadah"],
    ["apa itu zakat", "ibadah"],
    ["siapakah Allah", "allah-subhanahu-wa-ta-ala"],
    ["kewajiban anak kepada orang tua", "perintah-dan-larangan"],
    ["hukum riba", "perintah-dan-larangan"],
  ];
  for (const [q, slug] of BASELINE) {
    test(`"${q}" still routes to ${slug}`, () => {
      expect(matchTopic(q)).toBe(slug);
    });
  }
});

describe("the subject words vote — word ORDER must not decide the route", () => {
  test("a leading incidental word does not capture the question", () => {
    // `sadari` reaches `sadar`, a spread-1 word sitting in Keluarga. Under the old
    // "first subject word wins" rule that single incidental word sent a question about neraka to a
    // chapter on family. The vote is why it no longer can.
    expect(subjectWordsOf(TARGET)[0]).toBe("sadari");
    expect(categoriesContaining("sadari")).toContain("keluarga");
    expect(matchTopic(TARGET)).not.toBe("keluarga");
  });
});
