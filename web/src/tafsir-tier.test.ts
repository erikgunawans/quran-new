/**
 * The third tier — when it fires, when it refuses, and what it may say.
 *
 * These pin decisions taken from MEASUREMENT, not taste, and the measurements are reproducible:
 * `bun run src/app/probe-tafsir-tier.ts` (thinness distribution over 22 hukum questions) and the
 * corpus scan recorded in `tafsir-tier.ts`'s header (source lang/coverage/length over all 6,236
 * shards). If either number moves, these tests are the thing that should go red.
 *
 * The most important test in this file is the nikah hold. The probe caught a case the spec did not:
 * `apa hukum nikah siri` is thin by every measure here and its lead ref is QS 4:25 — an answer the
 * project already records as live and *worse than silence*. Tier 3 would have promoted it into a
 * full verse card plus a scholar's tafsir on slavery under a marriage question. That hold exists
 * until the ustadz answers `docs/review/hukum-pin-request-2026-08-12.md`, and it should not be
 * removed by anyone who has not read that reply.
 */
import { describe, expect, test } from "bun:test";
import type { KnowledgeAnswer, KnowledgeEntry } from "./knowledge.ts";
import { MUKHTASAR_ID, TIER3_MAX_ENTRIES, TIER3_MAX_QUOTE_CHARS, tier3Entry } from "./tafsir-tier.ts";

const entry = (over: Partial<KnowledgeEntry> = {}): KnowledgeEntry => ({
  text: "Pembagian harta warisan.",
  ref: "QS. An-Nisa, 4:11",
  surah: 4,
  ayah: 11,
  resolvable: true,
  subtopic: null,
  ...over,
});

const answer = (entries: KnowledgeEntry[]): KnowledgeAnswer => ({
  slug: "perintah-dan-larangan",
  category: "Perintah dan Larangan",
  totalEntries: 626,
  source: { title: "Indeks Tematik", author: "Ustadz Muhammad Thalib", url: "https://quran.tarjamahtafsiriyah.com" },
  entries,
});

describe("thinness — the cut comes from the measured distribution, not from taste", () => {
  test("a two-entry answer is thin — this is Erik's originating case, 'hukum warisan di islam'", () => {
    expect(tier3Entry(answer([entry(), entry({ ref: "QS. An-Nisa, 4:33", ayah: 33 })]), "hukum warisan di islam")).not.toBeNull();
  });

  test("a one-entry answer is thin", () => {
    expect(tier3Entry(answer([entry()]), "hukum ghibah")).not.toBeNull();
  });

  test("a three-entry answer is NOT thin — the reader already has the scholar's own list", () => {
    expect(tier3Entry(answer([entry(), entry(), entry()]), "apa hukum riba")).toBeNull();
  });

  test("the cut is where the code says it is, so moving it cannot be silent", () => {
    expect(TIER3_MAX_ENTRIES).toBe(2);
    const atCut = Array.from({ length: TIER3_MAX_ENTRIES }, () => entry());
    expect(tier3Entry(answer(atCut), "hukum ghibah")).not.toBeNull();
    expect(tier3Entry(answer([...atCut, entry()]), "hukum ghibah")).toBeNull();
  });
});

describe("tier 3 orients an ayah — it can never invent one", () => {
  /**
   * An OUTCOME pin, and it is worth saying plainly that it cannot force-red: with the resolvable
   * lookup in place, no implementation of this function can return non-null for an empty list, so
   * every mutation leaves this test green. It is kept because the outcome matters and should be
   * pinned; it is annotated because a test that could never fail is not evidence, and this repo has
   * been bitten three times by treating one as if it were.
   */
  test("a zero-entry POINTER gets nothing: no ayah in hand, nothing to orient", () => {
    expect(tier3Entry(answer([]), "apa hukum berbohong")).toBeNull();
  });

  /**
   * `pacaran` is absent from all 2,451 index entries. It protects itself twice over: the live lane
   * returns SIX entries for this phrasing (the documented "haram" hijack, lead QS 10:59), which is
   * above the cut — and even at one entry, routing it here would be the app implying pacaran IS the
   * thing that verse forbids. Both guards are asserted, because relying on the entry count alone
   * would make this pass for the wrong reason.
   */
  test("pacaran cannot be rescued — above the cut, and no ayah of its own", () => {
    const sixEntries = Array.from({ length: 6 }, () => entry({ ref: "QS. Yunus, 10:59", surah: 10, ayah: 59 }));
    expect(tier3Entry(answer(sixEntries), "pacaran itu haram atau nggak")).toBeNull();
    expect(tier3Entry(answer([]), "pacaran itu haram atau nggak")).toBeNull();
  });

  test("an unresolvable ref is refused — the mushaf does not carry it, so it cannot be loaded", () => {
    expect(tier3Entry(answer([entry({ resolvable: false })]), "hukum ghibah")).toBeNull();
  });

  test("the first RESOLVABLE entry is the one oriented, not merely the first", () => {
    const picked = tier3Entry(
      answer([entry({ resolvable: false, ref: "QS. Hud, 11:999", ayah: 999 }), entry({ ref: "QS. An-Nisa, 4:11" })]),
      "hukum warisan",
    );
    expect(picked?.ref).toBe("QS. An-Nisa, 4:11");
  });
});

describe("the nikah hold — a review hold with a named expiry, not a permanent rule", () => {
  test.each([
    "apa hukum nikah siri",
    "hukum menikah beda agama",
    "apa hukum pernikahan dini",
    "hukum kawin kontrak",
    "apa hukum poligami",
  ])("%j is held — tier 3 must not amplify an answer that is under review", (q) => {
    expect(tier3Entry(answer([entry({ ref: "QS. An-Nisa, 4:25", ayah: 25 })]), q)).toBeNull();
  });

  /**
   * Deliberately narrow. Both of these were MEASURED correct end-to-end — 2:229 is the talak verse,
   * 4:11 is the faraidh verse and was confirmed on live prod — so holding them would trade a good
   * answer for silence on no evidence at all.
   */
  test("talak is NOT held — its lead ref is the talak verse itself", () => {
    expect(tier3Entry(answer([entry({ ref: "QS. Al-Baqarah, 2:229", surah: 2, ayah: 229 })]), "apa hukum talak")).not.toBeNull();
  });

  test("warisan is NOT held — its lead ref is the faraidh verse itself", () => {
    expect(tier3Entry(answer([entry()]), "hukum warisan di islam")).not.toBeNull();
  });

  /**
   * An advisor call raised the right worry — that a keyword hold under-fires, and that under-firing
   * is the dangerous direction, since QS 4:25 in front of a reader is the failure this hold exists
   * to prevent. Probed against the LIVE lane with sixteen phrasings chosen to dodge the trigger.
   * No leak: nothing reached 4:25. Two of the advisor's own examples never even arrive —
   * `bolehkah menikah tanpa wali` and `syarat sah pernikahan` fail `looksFactual` upstream, so the
   * gate that catches them is not this one. These pin the hold's own surface.
   */
  test.each([
    "hukum akad nikah tanpa saksi",
    "bolehkah menikahi budak",
    "hukum kawin lari",
    "apa hukum nikah mut'ah",
    "bolehkah poligami tanpa izin istri",
  ])("%j does not slip past the hold", (q) => {
    expect(tier3Entry(answer([entry({ ref: "QS. An-Nisa, 4:25", ayah: 25 })]), q)).toBeNull();
  });
});

describe("the corpus claim this tier is built on", () => {
  /**
   * Al-Mukhtasar is quoted in the open because it is the ONLY source that is Indonesian, present
   * for every ayah, and short enough to quote whole. Asserted against the real shards rather than
   * restated as a comment: a claim nothing checks is how "verbatim" quietly becomes "truncated".
   */
  test.each([
    [4, 11],
    [2, 255],
    [2, 229],
    [24, 2],
    [17, 23],
  ])("%i:%i — Al-Mukhtasar is present, Indonesian, and quotable whole", async (surah, ayah) => {
    const passages = (await Bun.file(`web/public/tafsir/${surah}/${ayah}.json`).json()) as {
      source_id: string;
      text: string;
      lang: string;
    }[];
    const m = passages.find((p) => p.source_id === MUKHTASAR_ID);
    expect(m).toBeDefined();
    expect(m!.lang).toBe("id");
    expect(m!.text.trim().length).toBeGreaterThan(0);
    // Measured max across all 6,236 shards is 2,976. A source that outgrows a chat bubble cannot be
    // quoted whole, and quoting it in part would stop this tier being verbatim — so the renderer
    // HOLDS above this cap instead of cutting. Asserted against the constant the renderer actually
    // uses, so the bound and the guard can never drift apart.
    expect(m!.text.length).toBeLessThanOrEqual(TIER3_MAX_QUOTE_CHARS);
  });

  test("the quote cap sits just above the measured max — a real guard, not a restated measurement", () => {
    expect(TIER3_MAX_QUOTE_CHARS).toBe(3000);
    expect(TIER3_MAX_QUOTE_CHARS).toBeGreaterThan(2976); // observed corpus-wide maximum
  });

  test("Ibn Kathir is English and therefore never leads — the wound this app exists to heal", async () => {
    const passages = (await Bun.file("web/public/tafsir/4/11.json").json()) as { source_id: string; lang: string }[];
    expect(passages.find((p) => p.source_id === "source:ibn-kathir")?.lang).toBe("en");
  });

  test("As-Sa'di on 4:11 is far too long to quote whole — the reason it is not the open quote", async () => {
    const passages = (await Bun.file("web/public/tafsir/4/11.json").json()) as { source_id: string; text: string }[];
    expect(passages.find((p) => p.source_id === "source:as-saadi")!.text.length).toBeGreaterThan(30_000);
  });
});
