import { describe, expect, test } from "bun:test";
import { type VerseCard, verseEl } from "./verse.ts";

const base = (over: Partial<VerseCard> = {}): VerseCard => ({
  ref: "18:10",
  surah: 18,
  ayah: 10,
  surah_name: "Al-Kahfi",
  arabic: "إِذْ أَوَى ٱلْفِتْيَةُ",
  primary: { text: "MAKNA_TEXT", translator: "Ustadz Muhammad Thalib" },
  companion: { text: "HARFIAH_TEXT", translator: "Kementerian Agama Republik Indonesia" },
  ...over,
});

describe("verse card — interpretive primary reads open, everything else one tap away", () => {
  test("the primary (Terjemah makna) renders OUTSIDE the depth disclosure", () => {
    const html = verseEl(base());
    const maknaIdx = html.indexOf("MAKNA_TEXT");
    const depthIdx = html.indexOf('<details class="depth"');
    expect(maknaIdx).toBeGreaterThanOrEqual(0);
    expect(depthIdx).toBeGreaterThan(maknaIdx); // primary text is above the disclosure
  });

  test("the literal companion (Terjemah harfiah) lives INSIDE the depth disclosure", () => {
    const html = verseEl(base());
    expect(html).toContain('<details class="depth"');
    const depthIdx = html.indexOf('<details class="depth"');
    const harfiahIdx = html.indexOf("HARFIAH_TEXT");
    expect(harfiahIdx).toBeGreaterThan(depthIdx); // companion is after the disclosure opens
  });

  test("an ordinary verse keeps the disclosure CLOSED by default", () => {
    const html = verseEl(base());
    expect(html).toContain('<details class="depth"');
    expect(html).not.toContain('<details class="depth" open');
  });

  test("a flagged-divergent verse (94:5) opens the disclosure so 'baca keduanya' stays honest", () => {
    const html = verseEl(base({ ref: "94:5", surah: 94, ayah: 5 }));
    expect(html).toContain('<details class="depth" open');
    expect(html).toContain("baca keduanya"); // the caution still renders alongside
    // and with the disclosure open, the companion it points at is actually reachable
    expect(html).toContain("HARFIAH_TEXT");
  });

  test("a lazy verse carries data-lazy-tafsir on the depth element and an empty slot to fill", () => {
    const html = verseEl(base({ lazyTafsir: true }));
    expect(html).toMatch(/<details class="depth"[^>]*data-lazy-tafsir/);
    expect(html).toContain('class="tafsir-slot"');
  });

  test("an eager tafsir stack is folded into the depth, never left visible outside it", () => {
    const html = verseEl(base({ tafsirStack: '<div class="scholar">SCHOLAR_TEXT</div>' }));
    const depthIdx = html.indexOf('<details class="depth"');
    const scholarIdx = html.indexOf("SCHOLAR_TEXT");
    expect(scholarIdx).toBeGreaterThan(depthIdx);
    // the tafsir keeps its .sources wrapper so the lens sortStacks() still finds it
    expect(html).toContain('<div class="sources">');
  });
});
