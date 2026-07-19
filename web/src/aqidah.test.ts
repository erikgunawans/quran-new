import { describe, expect, test } from "bun:test";
import { aliasHit, AQIDAH, aqidahById, aqidahRef, isReviewed, matchAqidah, type AqidahEntry } from "./aqidah.ts";

const aliasesOf = (id: string) => AQIDAH.find((e) => e.id === id)!.aliases;

// A helper to build a reviewed entry from a pending stub, so tests exercise the matched path without
// putting any authored theology into the shipped module (which must stay pending until the ustadz).
const reviewed = (base: AqidahEntry, answer: string): AqidahEntry => ({ ...base, answer, refs: base.suggestedRefs });

describe("ship state — nothing renders until the ustadz authors it", () => {
  test("every shipped entry is a pending stub (no authored answer, no verses)", () => {
    // This is the whole point of the on-principle path: the app authors nothing. If this fails, some
    // answer text was committed without review — a violation, not a feature.
    for (const e of AQIDAH) {
      expect(e.answer).toBe("");
      expect(e.refs).toHaveLength(0);
      expect(isReviewed(e)).toBe(false);
    }
  });

  test("matchAqidah returns null for every question while the lane is unreviewed", () => {
    // The lane degrades to the app's honest topic pointer until filled — pure upside, no regression.
    for (const e of AQIDAH) for (const a of e.aliases) expect(matchAqidah(a)).toBeNull();
    expect(matchAqidah("siapakah Allah?")).toBeNull();
  });
});

describe("module integrity", () => {
  test("ids are unique and stable-looking (kebab-case)", () => {
    const ids = AQIDAH.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  test("every candidate ref points at a real mushaf verse (resolvable)", () => {
    for (const e of AQIDAH)
      for (const r of e.suggestedRefs) expect(aqidahRef(r).resolvable).toBe(true);
  });

  test("every topic slug (when set) has a matching Peta category shard", async () => {
    const idx = (await Bun.file("web/public/peta/index.json").json()) as { categories: { slug: string }[] };
    const slugs = new Set(idx.categories.map((c) => c.slug));
    for (const e of AQIDAH) if (e.topic) expect(slugs.has(e.topic)).toBe(true);
  });

  test("aqidahById round-trips real ids and rejects unknown ones", () => {
    expect(aqidahById(AQIDAH[0]!.id)?.id).toBe(AQIDAH[0]!.id);
    expect(aqidahById("does-not-exist")).toBeNull();
  });
});

describe("aliasHit — the enclitic-robust matcher (tested directly, review-independent)", () => {
  test("the -kah enclitic no longer breaks a match (the reported bug)", () => {
    // "siapakah Nabi Muhammad?" — the "kah" sits between "siapa" and "nabi", so a plain substring
    // match on "siapa nabi muhammad" missed it. Enclitic-stripping fixes it.
    expect(aliasHit("siapakah Nabi Muhammad?", aliasesOf("siapa-muhammad"))).toBe(true);
    expect(aliasHit("siapakah Allah?", aliasesOf("siapa-allah"))).toBe(true);
    expect(aliasHit("apakah tauhid itu?", aliasesOf("apa-itu-tauhid"))).toBe(true);
    expect(aliasHit("di manakah Allah?", aliasesOf("di-mana-allah"))).toBe(true);
  });

  test("the apostrophe form of Al-Qur'an matches (tokenises to 'al qur an')", () => {
    expect(aliasHit("apa itu Al-Qur'an?", aliasesOf("apa-itu-alquran"))).toBe(true);
    expect(aliasHit("alquran itu apa sih", aliasesOf("apa-itu-alquran"))).toBe(true);
  });

  test("common phrasings hit their entry", () => {
    expect(aliasHit("nabi muhammad itu siapa", aliasesOf("siapa-muhammad"))).toBe(true);
    expect(aliasHit("allah itu siapa", aliasesOf("siapa-allah"))).toBe(true);
    expect(aliasHit("dimana allah sekarang", aliasesOf("di-mana-allah"))).toBe(true);
  });

  test("unrelated questions never match", () => {
    expect(aliasHit("aku lagi capek banget", aliasesOf("siapa-allah"))).toBe(false);
    expect(aliasHit("apa hukum riba", aliasesOf("apa-itu-tauhid"))).toBe(false);
    expect(aliasHit("", aliasesOf("siapa-allah"))).toBe(false);
  });
});

describe("matchAqidah — routes only when an entry is actually reviewed", () => {
  test("a pending lane never matches (degrades to the honest pointer)", () => {
    // AQIDAH ships all-pending; a hand-reviewed fixture proves the matched path, without committing
    // any authored answer into the shipped module.
    const live = reviewed(AQIDAH.find((e) => e.id === "siapa-allah")!, "Contoh jawaban untuk pengujian.");
    expect(matchAqidah("siapakah Allah?")).toBeNull(); // shipped lane: pending
    expect(isReviewed(live)).toBe(true); // the fixture would match if it were in the lane
    expect(aliasHit("siapakah Allah?", live.aliases)).toBe(true);
  });
});

describe("aqidahRef — display + resolvability against real bounds", () => {
  test("formats the scholar's display ref", () => {
    expect(aqidahRef({ surah: 112, ayah: 1 }).ref).toBe("QS. Al-Ikhlas, 112:1");
  });

  test("flags an out-of-bounds ayah as unresolvable, never guessed", () => {
    expect(aqidahRef({ surah: 112, ayah: 99 }).resolvable).toBe(false); // Al-Ikhlas has 4
    expect(aqidahRef({ surah: 999, ayah: 1 }).resolvable).toBe(false);
  });
});
