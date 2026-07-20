/**
 * The generated ustadz batches must survive regeneration with their corrections intact.
 *
 * This file exists because of a specific mistake: two false claims in the source proposal were fixed
 * by hand-editing the GENERATED README, and the next `bun run app:split-expansion` silently reverted
 * both. The output looked right when it was checked and was wrong when it shipped. A generated file
 * cannot be corrected by editing the generated file — so these assertions run against the output on
 * disk and fail if a regeneration has undone them.
 *
 * What is being protected is not code behaviour. It is that a real scholar is not handed a document
 * that misstates what is live and asks him to re-decide something already decided.
 */
import { describe, expect, test } from "bun:test";

const DIR = "docs/review/feelings-expansion";
const readme = await Bun.file(`${DIR}/README.md`).text();

const batches: string[] = [];
for await (const f of new Bun.Glob("bagian-*.md").scan(DIR)) {
  batches.push(await Bun.file(`${DIR}/${f}`).text());
}

describe("ustadz batches — the honesty corrections must survive regeneration", () => {
  test("no batch repeats the false 'nothing is live yet' status", () => {
    // 144 of the 147 shipped before he ever saw them. Telling him otherwise would have him believe
    // he is approving pre-launch when he is auditing what readers already see.
    for (const b of batches) expect(b).not.toContain("Belum ada satu pun yang tayang");
    expect(readme).not.toContain("Belum ada satu pun yang tayang");
  });

  test("every batch states what is actually live, and that rejection means removal", () => {
    for (const b of batches) {
      expect(b).toMatch(/SUDAH TAYANG/);
      expect(b).toContain("CABUT dari aplikasi");
    }
  });

  test("the multi-theme question is not re-asked — it was decided and shipped", () => {
    expect(readme).not.toMatch(/hanya bisa memiliki SATU tema \(/);
    expect(readme).toContain("SUDAH DIPUTUSKAN");
  });
});

describe("ustadz batches — nothing lost in the split", () => {
  /** Refs only. The batches are a call script now, so headings carry a number and the source does not. */
  const refsIn = (s: string) => [...s.matchAll(/QS\. .*? — (\d+:\d+)/g)].map((m) => m[1]!);

  test("every proposed verse appears exactly once across the batches", async () => {
    const original = refsIn(await Bun.file("docs/review/feelings-expansion.md").text());
    const split = batches.flatMap(refsIn);
    expect(split.length).toBe(original.length);
    expect(new Set(split).size).toBe(split.length); // no duplicates
    expect([...split].sort()).toEqual([...original].sort());
  });

  test("every batch is self-contained: opening, method, and closing", () => {
    // Batches get used on different days and in any order. One that assumes another was read first
    // is one that gets run wrongly — the reason the instructions are repeated rather than referenced.
    for (const b of batches) {
      expect(b).toContain("Pembuka telepon");
      expect(b).toContain("Cara memakai halaman ini");
      expect(b).toContain("Penutup telepon");
      expect(b).toContain("jangan dipakai");
    }
  });

  test("every verse gives the reader its text, a question, and somewhere to write the answer", () => {
    for (const b of batches) {
      const verses = (b.match(/^### \d+\. QS\./gm) ?? []).length;
      expect(verses).toBeGreaterThan(0);
      expect((b.match(/\*\*📖 Bacakan ayatnya:\*\*/g) ?? []).length).toBe(verses);
      expect((b.match(/\*\*✍️ Jawaban Ustadz:\*\*/g) ?? []).length).toBe(verses);
    }
  });

  test("every ⚠️ verse makes the reader speak our own doubt aloud", async () => {
    // The flags exist because the author already doubted the pairing. A script that lets the reader
    // skim past them silently collects a "yes" on exactly the verses least entitled to one.
    const source = await Bun.file("docs/review/feelings-expansion.md").text();
    const doubted = (source.match(/> ⚠️ \*\*Perlu ditimbang:\*\*/g) ?? []).length;
    const spoken = batches.flatMap((b) => b.match(/Yang ini kami sendiri ragu, Ustadz\./g) ?? []).length;
    expect(doubted).toBe(27);
    expect(spoken).toBe(doubted);
  });

  test("the closing captures HIS confirmation, since his name ships on the result", () => {
    for (const b of batches) {
      expect(b).toContain("Dikonfirmasi Ustadz");
      expect(b).toContain("jangan ditayangkan");
    }
  });
});
