/**
 * The Fikih router — question → amal area, for re-ranking hadith retrieval only.
 *
 * These tests pin two different things, and the second matters more than the first. One: that the
 * obvious questions route where a reader would expect. Two: that AMBIGUITY RESOLVES TO NULL, because
 * null means "leave retrieval exactly as it is" and a wrong area is the only way this file can do
 * harm at all.
 */
import { describe, expect, test } from "bun:test";
import { fiqhAreaOf, fiqhKitabOf } from "./fikih-route.ts";
import { FIQH_AREAS } from "./fikih.ts";

describe("fiqhAreaOf — routing a question to the imams' own kitab", () => {
  const cases: [string, string][] = [
    ["bagaimana cara wudu yang benar", "thaharah"],
    ["apakah mandi junub wajib sebelum salat subuh", "thaharah"],
    ["berapa rakaat salat duha", "salat"],
    ["berapa nisab zakat mal", "zakat"],
    ["hukum puasa bagi orang sakit", "puasa"],
    ["apa saja rukun haji", "haji"],
    ["bagaimana cara memandikan jenazah", "jenazah"],
    ["apa syarat sah nikah", "nikah"],
    ["berapa lama iddah setelah cerai", "talak"],
    ["apa hukum riba dalam jual beli", "muamalah"],
    ["apakah daging babi haram dimakan", "makanan"],
  ];
  for (const [q, id] of cases) {
    test(`"${q}" → ${id}`, () => {
      expect(fiqhAreaOf(q)?.id).toBe(id);
    });
  }

  test("a question about nothing fiqh-shaped routes nowhere", () => {
    expect(fiqhAreaOf("aku udah gak kuat, semua terasa berat banget")).toBeNull();
    expect(fiqhAreaOf("ceritakan tentang nabi muhammad")).toBeNull();
    expect(fiqhAreaOf("besok cuaca gimana ya")).toBeNull();
  });

  test("A TIE ROUTES NOWHERE — the safe direction, not the clever one", () => {
    // `sedekah` is a zakat cue and `makan` a makanan cue; one each. Guessing between them would put
    // a boost on the wrong kitab, and the point of returning null is that retrieval is then left
    // untouched rather than nudged wrongly. Ambiguity costs nothing; a wrong guess costs ordering.
    expect(fiqhAreaOf("apakah sedekah makan itu berpahala")).toBeNull();
  });

  test("scored, not first-match — declaration order must not decide", () => {
    // THE EARLIER-DECLARED AREA MUST LOSE, or this test proves nothing. `zakat` is declared 3rd and
    // gets one cue; `muamalah` is declared 9th and gets four (jual, beli, riba, utang). A first-match
    // walk would answer `zakat`. The first version of this test used a question whose only hit WAS
    // muamalah, so it passed under first-match too — it was pinning nothing, and the mutation proved
    // it. Force-red now fails on `if (!best)`.
    expect(fiqhAreaOf("bolehkah gaji dari jual beli riba dipakai bayar utang dan zakat")?.id).toBe("muamalah");
  });

  test("a multi-word cue is found in the phrase, not in the word set", () => {
    // `rumah tangga` is the only multi-word cue and nothing else exercised it, so dropping phrase
    // matching used to leave the suite green. It does not now.
    expect(fiqhAreaOf("bagaimana menjaga rumah tangga tetap harmonis")?.id).toBe("nikah");
  });

  test("Indonesian affixed forms are matched, not stemmed past", () => {
    // `\b`-bounded stems under-fire on exactly these, which is on record in this repo.
    expect(fiqhAreaOf("bolehkah menikahi sepupu sendiri")?.id).toBe("nikah");
    expect(fiqhAreaOf("apa hukumnya berpuasa saat bepergian")?.id).toBe("puasa");
    expect(fiqhAreaOf("bagaimana tata cara berwudu")?.id).toBe("thaharah");
  });

  test("every area's cues can actually reach it — no unreachable area", () => {
    // A typo in an id key would leave an area permanently unroutable and nothing else would notice.
    const reachable = new Set(
      ["wudu", "salat", "zakat", "puasa", "haji", "jenazah", "nikah", "talak", "riba", "sembelih"]
        .map((w) => fiqhAreaOf(`hukum ${w}`)?.id)
        .filter(Boolean),
    );
    expect(reachable.size).toBe(FIQH_AREAS.length);
  });
});

describe("fiqhKitabOf", () => {
  test("returns the collection:book keys a boost matches on", () => {
    const thaharah = FIQH_AREAS.find((a) => a.id === "thaharah")!;
    const keys = fiqhKitabOf(thaharah);
    expect(keys.size).toBe(thaharah.refs.length);
    for (const r of thaharah.refs) expect(keys.has(`${r.collection}:${r.book}`)).toBe(true);
  });
});
