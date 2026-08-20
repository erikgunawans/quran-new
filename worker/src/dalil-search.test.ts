/**
 * `referenceLineOf` — the rights wall for the section-search result list.
 *
 * WHY THIS FILE EXISTS. `MAX_DISPLAY = 2` caps how many hadith may be SHOWN. Section search still
 * wants to tell the reader that the other six records exist, so it returns them as citations with
 * no text. That is only safe while "no text" is STRUCTURAL. These tests pin the structure, not the
 * intention: the projection is an explicit seven-key literal, and the test that matters asserts the
 * key SET rather than the absence of two names — because the failure mode is a field nobody has
 * thought of yet, added to `DalilHit` next month, arriving in the reader's payload for free.
 *
 * Force-red check (run 2026-08-17): replacing the body of `referenceLineOf` with `({ ...h })` turns
 * "carries no key beyond the seven permitted" red with `arabic`/`english`/`path`/`rights_usage`
 * listed. Replacing it with a two-delete version (`const r = {...h}; delete r.arabic; ...`) ALSO
 * turns it red, on `path` and `score` — which is the point: a denylist cannot be complete.
 */
import { describe, expect, test } from "bun:test";
import { referenceLineOf } from "./index.ts";
import type { DalilHit } from "./dalil.ts";

/** A hit carrying every field the real one does, PLUS the two text fields a leak would ride in. */
const hit = (over: Partial<Record<string, unknown>> = {}): DalilHit =>
  ({
    id: "hadith-bukhari-5251",
    score: 0.44,
    rerank_score: 0.66,
    path: "hadith/bukhari/068/0001.md",
    collection: "Sahih al-Bukhari",
    hadith_number: 5251,
    grade: "sahih",
    book_en: "Divorce",
    bab_en: "Whoever permitted divorce",
    source_url: "https://sunnah.com/bukhari:5251",
    rights_usage: "reference-only",
    // NOT on the DalilHit interface today. Present here on purpose: this fixture is a stand-in for
    // the future record that does carry text, and the whole test is "does that reach the reader".
    arabic: "نص عربي",
    english: "English translation body.",
    ...over,
  }) as unknown as DalilHit;

/**
 * The keys a reader is permitted to receive for a record they may not read here.
 *
 * `bab_en` AND `book_en` were both on this list until 2026-08-20 (late). Erik withdrew sunnah.com's
 * English chapter and kitab titles for the same reason he withdrew the narration a commit earlier —
 * "private research use" — so two keys are gone and this SET is what force-reds if either returns.
 */
const PERMITTED = [
  "id",
  "collection",
  "hadith_number",
  "grade",
  "source_url",
] as const;

describe("referenceLineOf — the rights wall for reference lines", () => {
  test("carries no key beyond the permitted set", () => {
    // The assertion is on the SET. A denylist ("no arabic, no english") passes for any field not on
    // the list, which is exactly the leak this is here to stop.
    expect(Object.keys(referenceLineOf(hit())).sort()).toEqual([...PERMITTED].sort());
  });

  test("drops hadith text even when the hit is carrying it", () => {
    const ref = referenceLineOf(hit()) as unknown as Record<string, unknown>;
    expect(ref.arabic).toBeUndefined();
    expect(ref.english).toBeUndefined();
    // Serialized too — the reader gets JSON, not the object.
    const wire = JSON.stringify(ref);
    expect(wire).not.toContain("نص عربي");
    expect(wire).not.toContain("English translation body.");
  });

  test("withdraws bab_en — the English chapter title, out since 2026-08-20 (late)", () => {
    const ref = referenceLineOf(hit()) as unknown as Record<string, unknown>;
    expect(ref.bab_en).toBeUndefined();
    expect(JSON.stringify(ref)).not.toContain("Whoever permitted divorce");
  });

  test("keeps everything an attribution line needs", () => {
    const ref = referenceLineOf(hit());
    expect(ref.id).toBe("hadith-bukhari-5251");
    expect(ref.collection).toBe("Sahih al-Bukhari");
    expect(ref.hadith_number).toBe(5251);
    expect(ref.grade).toBe("sahih");
    expect(ref.source_url).toBe("https://sunnah.com/bukhari:5251");
  });

  test("does not leak retrieval scores, which are not correctness signals", () => {
    // `dalil.ts` says twice that cosine and rerank are logging-only and not comparable across
    // questions. Shipping them to the browser invites exactly the reading the corpus forbids.
    const ref = referenceLineOf(hit()) as unknown as Record<string, unknown>;
    expect(ref.score).toBeUndefined();
    expect(ref.rerank_score).toBeUndefined();
  });

  test("does not leak the corpus path", () => {
    // The shard path is internal layout. It is also the one field that would let a caller guess the
    // text-layer URL for a record the cap deliberately withheld.
    expect((referenceLineOf(hit()) as unknown as Record<string, unknown>).path).toBeUndefined();
  });
});
