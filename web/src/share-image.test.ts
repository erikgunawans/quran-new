import { describe, expect, test } from "bun:test";
import { renderVerseCardImage, wrapLines } from "./share-image.ts";
import type { VerseCard } from "./verse.ts";

const charWidth = 8;
const measure = (text: string): number => text.length * charWidth;

describe("wrapLines", () => {
  test("fits on one line unchanged when under maxWidth", () => {
    expect(wrapLines(measure, "pendek", 400)).toEqual(["pendek"]);
  });

  test("wraps long text across multiple lines without splitting a word", () => {
    const text = "satu dua tiga empat lima enam tujuh delapan sembilan sepuluh";
    const lines = wrapLines(measure, text, 100); // ~12 chars per line at charWidth=8
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      for (const word of line.split(" ")) {
        expect(text).toContain(word);
      }
    }
    // no word lost or duplicated across the wrap
    expect(lines.join(" ").split(/\s+/).sort()).toEqual(text.split(/\s+/).sort());
  });

  test("empty string returns no lines", () => {
    expect(wrapLines(measure, "", 400)).toEqual([]);
  });

  test("whitespace-only string returns no lines", () => {
    expect(wrapLines(measure, "   ", 400)).toEqual([]);
  });
});

function card(overrides: Partial<VerseCard>): VerseCard {
  return {
    ref: "1:1",
    surah: 1,
    ayah: 1,
    surah_name: "Al-Faatiha",
    arabic: "بِسْمِ اللَّهِ",
    primary: { text: "Terjemah makna palsu.", translator: "Uji" },
    companion: { text: "Terjemah harfiah palsu.", translator: "Uji Kemenag" },
    ...overrides,
  };
}

describe("renderVerseCardImage — the egress contract", () => {
  test("refuses to render when the literal companion is missing", async () => {
    const blob = await renderVerseCardImage(card({ companion: null }));
    expect(blob).toBeNull();
  });

  test("refuses to render when both readings are missing", async () => {
    const blob = await renderVerseCardImage(card({ primary: null, companion: null }));
    expect(blob).toBeNull();
  });
});
