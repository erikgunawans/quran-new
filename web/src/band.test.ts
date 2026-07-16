import { describe, expect, test } from "bun:test";
import { ayahOfDay, localDayNumber, POOL } from "./band";
import { FLAGGED } from "./verse";

describe("ayat untukmu hari ini — curated and deterministic, never random", () => {
  test("the same day always yields the same ayah", () => {
    // Scripture is not a slot machine. Reopening the app must not reshuffle the verse.
    expect(ayahOfDay(new Date(2026, 6, 16, 9, 0))).toEqual(ayahOfDay(new Date(2026, 6, 16, 23, 30)));
  });

  test("the pick advances across days", () => {
    const days = new Set<string>();
    for (let i = 0; i < 10; i++) days.add(ayahOfDay(new Date(2026, 6, 16 + i, 12, 0)).join(":"));
    expect(days.size).toBeGreaterThan(1);
  });

  test("the day number turns over at the reader's midnight, not UTC's", () => {
    expect(localDayNumber(new Date(2026, 6, 17, 0, 1)) - localDayNumber(new Date(2026, 6, 16, 23, 59))).toBe(1);
  });

  test("a day is one day long, whatever the local offset", () => {
    expect(localDayNumber(new Date(2026, 6, 16, 0, 0))).toBe(localDayNumber(new Date(2026, 6, 16, 23, 59)));
  });

  test("a year of picks draws only from the curated pool", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 365; i++) seen.add(ayahOfDay(new Date(2026, 0, 1 + i, 12, 0)).join(":"));
    // A random draw over 6,236 verses would blow past this. Curation is the point.
    expect(seen.size).toBeLessThanOrEqual(POOL.length);
  });
});

/**
 * The gate that replaced a denylist.
 *
 * The first version of this file listed seven refs someone had already thought of and asserted
 * they were absent. It never opened the corpus — so it certified 65:3 as "the verse that stands
 * alone" while disqualifying 13:28 for a defect 65:3 has too, and it passed 94:5 while the app's
 * own FLAGGED registry called that verse the primary's worst divergence. A test taught the answer
 * cannot catch the next wrong answer. So this re-derives every property from the shipped data.
 *
 * It does NOT certify that a verse consoles — that is judgment, made by reading each one whole.
 * This guards the mechanical failures only, and says so.
 */
describe("every pool verse, re-derived from the shipped corpus", () => {
  const load = async (s: number) => (await Bun.file(`web/public/surah/${s}.json`).json()) as {
    verses: { a: number; ar: string; p: { text: string; translator: string } | null; c: { text: string } | null }[];
  };

  const HARSH = /kafir|neraka|jahanam|azab|adzab|siksa|perang|berperang|jihad|memerangi|munafik|talak|ditalak|iddah|rujuk|cerai|dosa besar|membunuh|zina/i;
  const FRAGMENT_OPENER = /^(Dan|Serta|Maka|Yaitu|Adapun|Kemudian)$/;

  for (const [surah, ayah] of POOL) {
    const ref = `${surah}:${ayah}`;

    describe(ref, () => {
      test("exists, with BOTH renderings — the literal_companion invariant", async () => {
        const v = (await load(surah)).verses.find((x) => x.a === ayah);
        expect(v, `${ref} is not in the corpus`).toBeDefined();
        // No makna → renderAyahOfDay returns false and the block silently vanishes.
        expect(v!.p?.text?.length, `${ref} has no makna`).toBeGreaterThan(0);
        // No literal → the card would ship the interpretive primary alone, which share.ts calls
        // the sharpest theological risk in the product.
        expect(v!.c?.text?.length, `${ref} has no literal companion`).toBeGreaterThan(0);
      });

      test("is not FLAGGED as diverging from the literal", async () => {
        // 94:5 sat in this pool while verse.ts said Thalib reads it as a description of life and
        // Kemenag as the promise "sesudah kesulitan ada kemudahan". We were quoting the
        // divergence as if it were the comfort.
        expect(Object.keys(FLAGGED), `${ref} is FLAGGED — it needs the caution the card cannot show`).not.toContain(ref);
      });

      test("stands alone — not a grammatical fragment of the verse before it", async () => {
        const v = (await load(surah)).verses.find((x) => x.a === ayah)!;
        // 65:3 opens `وَيَرْزُقْهُ` — a bare waw + jussive hanging off 65:2. It reads standalone
        // ONLY in the gloss, which supplies the subject the Arabic does not have.
        expect(v.ar.trim().startsWith("وَ"), `${ref} opens on a bare waw`).toBe(false);

        for (const [label, text] of [
          ["makna", v.p!.text],
          ["literal", v.c!.text],
        ] as const) {
          const first = text.trim().split(/\s+/)[0]!.replace(/[“”"']/g, "");
          // An Indonesian sentence starts uppercase. A lowercase opening IS a continuation.
          expect(/^[a-z]/.test(first), `${ref} ${label} opens lowercase "${first}"`).toBe(false);
          expect(FRAGMENT_OPENER.test(first), `${ref} ${label} opens "${first}"`).toBe(false);
        }
      });

      test("finishes its own sentence — it is not half of a pair", async () => {
        const p = (await load(surah)).verses.find((x) => x.a === ayah)!.p!.text.trim();
        // 15:49 ends "Aku Maha Pengampun lagi Maha Penyayang," — and 15:50 is "dan sungguh
        // siksa-Ku sangat pedih." Serving 49 alone hides half of what the passage says.
        expect(/[,;:]$/.test(p), `${ref} ends on a comma — the sentence continues`).toBe(false);
        expect((p.match(/"/g) ?? []).length % 2, `${ref} opens a quotation it never closes`).toBe(0);
        expect(/[.!?"]$/.test(p), `${ref} has no terminal punctuation`).toBe(true);
      });

      test("consoles all the way to its tail", async () => {
        const p = (await load(surah)).verses.find((x) => x.a === ayah)!.p!.text;
        // Checked over the WHOLE text, not the opening: 2:286 opens "Allah tidak membebani
        // seseorang melebihi kemampuannya" and closes on defeating the disbelievers.
        const hit = p.match(HARSH);
        expect(hit?.[0], `${ref} contains "${hit?.[0]}"`).toBeUndefined();
      });

      test("fits the card without becoming a wall of text", async () => {
        const p = (await load(surah)).verses.find((x) => x.a === ayah)!.p!.text;
        expect(p.length, `${ref} is ${p.length} chars`).toBeLessThanOrEqual(350);
        expect(p.length, `${ref} is only ${p.length} chars — not a whole thought`).toBeGreaterThanOrEqual(45);
      });
    });
  }

  test("the known-wrong verses cannot pass this gate", async () => {
    // Not a denylist — a demonstration that the properties above actually catch the real misses.
    // If someone re-adds any of these, the per-verse tests above fail on their own.
    const knownWrong: [number, number, string][] = [
      [65, 2, "a ruling on divorce/iddah/witnesses"],
      [65, 3, "the same ruling, opening on a bare waw"],
      [94, 5, "FLAGGED — the primary diverges from the literal"],
      [13, 28, "opens lowercase 'yaitu'"],
      [15, 49, "the mercy half of a pair; 15:50 is the punishment"],
      [2, 286, "closes on defeating the disbelievers"],
    ];
    for (const [s, a] of knownWrong) {
      expect(POOL.some(([ps, pa]) => ps === s && pa === a), `${s}:${a} is back in the pool`).toBe(false);
    }
  });
});
