import { describe, expect, test } from "bun:test";
import { PROBLEM_VERSES } from "../review/problem-verses.ts";

/**
 * The data layer under the honesty guarantee.
 *
 * Nur can only promise "no real ayah is ever denied" if the shards actually hold every ayah.
 * These tests are that promise, made mechanical.
 */

const SHARD = (n: number) => Bun.file(`web/public/surah/${n}.json`);

interface Shard {
  n: number;
  name: string;
  ayahs: number;
  bismillah: boolean;
  verses: { a: number; ar: string; p: { text: string } | null; c: { text: string } | null }[];
}

const shards: Shard[] = await Promise.all(
  Array.from({ length: 114 }, (_, i) => SHARD(i + 1).json() as Promise<Shard>),
);

describe("shards — every ayah is there", () => {
  test("114 shards exist", async () => {
    for (let n = 1; n <= 114; n++) expect(await SHARD(n).exists()).toBe(true);
  });

  test("6,236 ayahs across all shards — the whole Qur'an", () => {
    expect(shards.reduce((n, s) => n + s.verses.length, 0)).toBe(6236);
  });

  test("every shard's verse count matches its self-declared ayah count", () => {
    for (const s of shards) expect(s.verses.length).toBe(s.ayahs);
  });

  test("Al-Kahf holds 18:10 — the verse Nur used to deny", () => {
    const kahf = shards[17]!;
    expect(kahf.n).toBe(18);
    expect(kahf.ayahs).toBe(110);
    const v = kahf.verses.find((x) => x.a === 10);
    expect(v).toBeDefined();
    expect(v!.ar.length).toBeGreaterThan(10);
    expect(v!.p?.text.length).toBeGreaterThan(10);
  });

  test("ayah numbers are contiguous from 1..n in every surah", () => {
    for (const s of shards) {
      expect(s.verses.map((v) => v.a)).toEqual(Array.from({ length: s.ayahs }, (_, i) => i + 1));
    }
  });
});

describe("the basmalah — theologically load-bearing", () => {
  // Tanzil prepends the basmalah to ayah 1 of every surah but At-Tawbah. It is an OPENING,
  // not part of the verse: Al-Baqarah 2:1 is `الٓمٓ`. Ship it unstripped and 112 surahs render
  // a textually wrong first ayah — visible to every Muslim who opens the app.
  const bare = (s: string) => s.replace(/[ً-ٰٕۖ-ۭـ]/gu, "");
  const BASMALAH_BARE = bare(shards[0]!.verses[0]!.ar); // Al-Faatiha 1:1 IS the basmalah

  test("Al-Faatiha keeps the basmalah as ayah 1", () => {
    expect(shards[0]!.bismillah).toBe(false);
    expect(bare(shards[0]!.verses[0]!.ar)).toBe(BASMALAH_BARE);
  });

  test("At-Tawbah has no basmalah at all", () => {
    expect(shards[8]!.n).toBe(9);
    expect(shards[8]!.bismillah).toBe(false);
    expect(bare(shards[8]!.verses[0]!.ar).startsWith(BASMALAH_BARE)).toBe(false);
  });

  test("Anti: no other surah's ayah 1 still carries the prepended basmalah", () => {
    for (const s of shards) {
      if (s.n === 1 || s.n === 9) continue;
      expect(s.bismillah).toBe(true);
      const first = bare(s.verses[0]!.ar);
      expect(first.startsWith(BASMALAH_BARE)).toBe(false);
    }
  });

  test("Al-Baqarah 2:1 is exactly Alif-Lam-Mim", () => {
    expect(shards[1]!.verses[0]!.ar.trim()).toBe("الٓمٓ");
  });

  test("27:30 keeps its INTERNAL basmalah — Sulaiman's letter is not an opening", () => {
    const v = shards[26]!.verses.find((x) => x.a === 30)!;
    expect(bare(v.ar)).toContain(BASMALAH_BARE);
  });
});

describe("literal_companion — the structural safeguard, enforced where readers are", () => {
  test("Anti: no verse ships an interpretive primary without its literal companion", () => {
    const orphans: string[] = [];
    for (const s of shards) {
      for (const v of s.verses) {
        if (v.p && !v.c) orphans.push(`${s.n}:${v.a}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  test("every one of the 6,236 verses carries both renderings", () => {
    const both = shards.flatMap((s) => s.verses).filter((v) => v.p && v.c).length;
    expect(both).toBe(6236);
  });
});

describe("Anti: tafsir never reaches a phone", () => {
  test("no shard contains a tafsir source id", async () => {
    const sources = (await Bun.file("data/canonical/tafsir-sources.json").json()) as { id: string }[];
    for (const n of [1, 2, 18, 36, 114]) {
      const raw = await SHARD(n).text();
      for (const src of sources) expect(raw).not.toContain(src.id);
    }
  });

  test("the largest shard stays inside the 4G wire budget", () => {
    let worst = 0;
    for (const s of shards) {
      const gz = Bun.gzipSync(Buffer.from(JSON.stringify(s))).length / 1024;
      if (gz > worst) worst = gz;
    }
    expect(worst).toBeLessThan(100); // Al-Baqarah, ~80KB gzipped
  });
});

describe("Anti: the UI speaks Indonesian only", () => {
  // The `why` captions were curation notes. They were never meant to ship, and they shipped —
  // in English, into an Indonesian product, at the exact point where it promises comprehension.
  const ENGLISH = /\b(the|and|with|that|will|from|your|not|for|who|whoever|every|upon|when|there|his|her|they|them)\b/i;

  test("no verse caption is English", () => {
    const leaks = PROBLEM_VERSES.filter((v) => ENGLISH.test(v.why)).map((v) => `${v.ref.join(":")} — ${v.why}`);
    expect(leaks).toEqual([]);
  });

  test("all 55 captions are populated", () => {
    expect(PROBLEM_VERSES.length).toBe(55);
    for (const v of PROBLEM_VERSES) expect(v.why.trim().length).toBeGreaterThan(0);
  });

  // Guard the ARTIFACT, not just the source.
  //
  // The captions were translated in problem-verses.ts and the source test above went green —
  // while the browser kept rendering "Remember Me, I will remember you", because corpus.json had
  // been built BEFORE the translation and nobody rebuilt it. The test was measuring the input;
  // the reader sees the output. A gate on the source alone is not a gate.
  test("Anti: the SHIPPED corpus.json carries no English caption", async () => {
    const corpus = (await Bun.file("web/public/corpus.json").json()) as { verses: { ref: string; why: string }[] };
    const leaks = corpus.verses.filter((v) => ENGLISH.test(v.why)).map((v) => `${v.ref} — ${v.why}`);
    expect(leaks).toEqual([]);
  });

  test("the shipped corpus.json is not stale relative to the source captions", async () => {
    const corpus = (await Bun.file("web/public/corpus.json").json()) as { verses: { ref: string; why: string }[] };
    for (const v of PROBLEM_VERSES) {
      const shipped = corpus.verses.find((x) => x.ref === v.ref.join(":"));
      expect(shipped?.why).toBe(v.why);
    }
  });
});
