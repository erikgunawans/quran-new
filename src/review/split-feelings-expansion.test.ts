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
  const refsOf = (s: string) => (s.match(/^### (?:⚠️ )?QS\..*$/gm) ?? []).map((l) => l.replace(/^### (?:⚠️ )?/, ""));

  test("every proposed verse appears exactly once across the batches", async () => {
    const original = refsOf(await Bun.file("docs/review/feelings-expansion.md").text());
    const split = batches.flatMap(refsOf);
    expect(split.length).toBe(original.length);
    expect(new Set(split).size).toBe(split.length); // no duplicates
    expect([...split].sort()).toEqual([...original].sort());
  });

  test("every batch carries the full review instructions, since they are read out of order", () => {
    for (const b of batches) {
      expect(b).toContain("Cara meninjau");
      expect(b).toContain("jangan dipakai");
    }
  });
});
