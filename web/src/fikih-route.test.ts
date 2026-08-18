/**
 * The Fikih router — question → amal area, for re-ranking hadith retrieval only.
 *
 * These tests pin two different things, and the second matters more than the first. One: that the
 * obvious questions route where a reader would expect. Two: that AMBIGUITY RESOLVES TO NULL, because
 * null means "leave retrieval exactly as it is" and a wrong area is the only way this file can do
 * harm at all.
 */
import { describe, expect, test } from "bun:test";
import { AREA_CUES, fiqhAreaOf, fiqhKitabOf } from "./fikih-route.ts";
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

  /**
   * THIS TEST REPLACES "A TIE ROUTES NOWHERE", AND THE POLICY IT PINNED WAS REVERSED ON PURPOSE.
   *
   * The old test asserted that any tie returns null, reasoning that "ambiguity costs nothing; a
   * wrong guess costs ordering". The second half is true. The FIRST HALF IS NOT, and ISC-494 is what
   * exposed it: a tie also deletes the Fikih doorway (`index.ts` sends `area: null` and the reader
   * gets no kitab card at all), so ambiguity costs the whole navigational affordance on exactly the
   * mixed questions where a reader most wants it. Erik was shown the trade on 2026-08-18 and chose
   * to change tie-breaking.
   *
   * The replacement rule is POSITIONAL and deliberately grammatical, not juristic: among tied areas
   * the earliest-mentioned cue wins, because Indonesian questions name the subject first and trail
   * the circumstance (`hukum X saat Y`). Nothing here asserts a ruling — that is still `fatwaShape`'s
   * business, and it still refuses.
   */
  test("a tie resolves to the EARLIEST-mentioned area — the policy Erik reversed on 2026-08-18", () => {
    // The ISC-494 question. Note it is a THREE-way tie, not the two-way it was described as:
    // `menceraikan` (talak), `istri` (nikah) and `haid` (thaharah) each score exactly 1.
    expect(fiqhAreaOf("hukum menceraikan istri saat haid")?.id).toBe("talak");
    // The question the OLD test used to pin null. `sedekah` (zakat) precedes `makan` (makanan), and
    // zakat is also the area a reader asking about sedekah wants — the rule and the intent agree
    // here, which is asserted rather than left to look incidental.
    expect(fiqhAreaOf("apakah sedekah makan itu berpahala")?.id).toBe("zakat");
  });

  test("the tie-break reads TEXT position, not declaration order — a paired control", () => {
    // Registry order is thaharah(1st) … nikah(7th), talak(8th). A rule that was really keyed on
    // declaration order while looking positional would answer `thaharah` to BOTH of these, since
    // thaharah is declared first in each. Swapping only the word order flips the answer, which
    // declaration order cannot do — so this pair, and not either line alone, is the evidence.
    expect(fiqhAreaOf("hukum cerai saat haid")?.id).toBe("talak"); // registry-LAST wins on text
    expect(fiqhAreaOf("hukum haid setelah cerai")?.id).toBe("thaharah"); // registry-FIRST wins on text
  });

  test("no cue is shared between areas — which is why the positional tie-break is total", () => {
    // The positional rule can only fail to separate two areas if one TOKEN is a cue for both, and no
    // cue is currently shared. So `fiqhAreaOf`'s null-on-positional-tie branch is unreachable from
    // today's corpus — it stays in the code as the safe direction, and this test is what tells the
    // next person the moment it becomes reachable. Asserting it here rather than claiming coverage
    // of a branch no fixture can reach: a test that can only re-assert a copy of the code is worse
    // than no test.
    const owners = new Map<string, string[]>();
    for (const [area, cues] of Object.entries(AREA_CUES)) {
      for (const cue of cues) owners.set(cue, [...(owners.get(cue) ?? []), area]);
    }
    const shared = [...owners].filter(([, areas]) => new Set(areas).size > 1);
    expect(shared).toEqual([]);
  });

  test("a within-area duplicate cue does not double-count (ISC-518)", () => {
    // `sai` was listed twice under `haji`, silently inflating that area by one whenever it appeared
    // and biasing every tie it took part in. Deduping is what makes the score mean "how many
    // DISTINCT cues matched", which is the only reading the tie-break can rest on.
    expect(fiqhAreaOf("hukum sai")?.id).toBe("haji");
    // One distinct cue for haji must not outrank one distinct cue for another area by position alone
    // reversed: `wudu` comes first, so thaharah wins despite `sai` appearing twice in the list.
    expect(fiqhAreaOf("hukum wudu lalu sai")?.id).toBe("thaharah");
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
