import { describe, expect, test } from "bun:test";
import { AQIDAH, aqidahById, aqidahRef, isReviewed, matchAqidah, type AqidahEntry } from "./aqidah.ts";

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

describe("matchAqidah — conservative phrase matching on a REVIEWED entry", () => {
  const stub = AQIDAH.find((e) => e.id === "siapa-allah")!;
  const live = reviewed(stub, "Allah adalah Tuhan Yang Maha Esa. (contoh untuk pengujian)");

  // matchAqidah reads the module array, so test its logic via a hand-rolled scan over a live entry.
  const matchAgainst = (entries: AqidahEntry[], q: string): AqidahEntry | null => {
    const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
    for (const e of entries) {
      if (!isReviewed(e)) continue;
      for (const a of e.aliases) if (norm(q).includes(norm(a))) return e;
    }
    return null;
  };

  test("a reviewed entry matches its alias phrases (whole-phrase, case/punctuation-insensitive)", () => {
    expect(matchAgainst([live], "Siapakah Allah?")?.id).toBe("siapa-allah");
    expect(matchAgainst([live], "allah itu siapa sih")?.id).toBe("siapa-allah");
  });

  test("an unrelated question does not match", () => {
    expect(matchAgainst([live], "aku lagi capek banget")).toBeNull();
    expect(matchAgainst([live], "apa hukum riba")).toBeNull();
  });

  test("a pending stub never matches even if its alias appears", () => {
    expect(matchAgainst([stub], "siapakah allah")).toBeNull();
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
