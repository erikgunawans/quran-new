import { describe, expect, test } from "bun:test";
import { guardComposeProse, safeCompose } from "./compose-guard.ts";

describe("guardComposeProse — clean companion prose passes", () => {
  // The existing hand-written openers ARE the reference for safe prose. If the wall rejected them,
  // the fallback itself would be unshippable.
  const canned = [
    "Berat, ya. Ada ayat yang sering dibaca orang saat sedang seperti ini.",
    "Rasa cemas itu nyata, dan Al-Qur'an tidak menyuruhmu pura-pura kuat.",
    "Kamu tidak sedang bicara dengan hakim. Ini ayat tentang pintu yang tetap terbuka.",
    "Sabar bukan berarti diam saja. Ini yang disebut Al-Qur'an tentang itu.",
    "Turut berduka. Ini ayat yang dibaca banyak orang ketika kehilangan.",
  ];
  for (const prose of canned) {
    test(prose.slice(0, 32), () => {
      expect(guardComposeProse(prose).ok).toBe(true);
    });
  }

  test("companion speech with 'harus' but no religious prescription passes", () => {
    expect(guardComposeProse("Berat ya. Kamu nggak harus kuat sekarang.").ok).toBe(true);
  });

  test("POINTING at meaning (Erik's approved example) passes", () => {
    const pointing = "Para ulama membaca ayat ini tentang rahmat — kata-kata mereka ada di bawah.";
    expect(guardComposeProse(pointing).ok).toBe(true);
  });
});

describe("guardComposeProse — the two hard walls", () => {
  test("Arabic script is rejected", () => {
    const r = guardComposeProse("Tenang ya. اللَّهُ menyertaimu.");
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "arabic")).toBe(true);
  });

  test("a digit verse reference is rejected", () => {
    const r = guardComposeProse("Coba baca 94:5, itu untukmu.");
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "verse_ref")).toBe(true);
  });

  test("a spelled verse reference (QS / surat) is rejected", () => {
    expect(guardComposeProse("Renungkan QS 94:5.").ok).toBe(false);
    expect(guardComposeProse("Ada di surat 94 ayat 5.").ok).toBe(false);
  });

  test("deictic pointing without a number is allowed", () => {
    expect(guardComposeProse("Ayatnya ada di bawah, baca pelan-pelan.").ok).toBe(true);
  });
});

describe("guardComposeProse — authoring (heuristic layer)", () => {
  test("AUTHORING meaning of a verse (Erik's blocked example) is rejected", () => {
    const r = guardComposeProse("Ayat ini artinya kamu harus sabar.");
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === "authoring")).toBe(true);
  });

  test("'Allah menyuruh kamu ...' is rejected", () => {
    expect(guardComposeProse("Allah menyuruh kamu untuk bersabar.").ok).toBe(false);
  });

  test("'menurut Islam ...' is rejected", () => {
    expect(guardComposeProse("Menurut Islam, ini adalah ujian.").ok).toBe(false);
  });

  test("a ruling ('hukumnya wajib') is rejected", () => {
    expect(guardComposeProse("Sholat malam hukumnya sunnah.").ok).toBe(false);
  });

  test("'kamu harus sabar' (prescribing worship) is rejected", () => {
    expect(guardComposeProse("Kamu harus sabar dan bersyukur.").ok).toBe(false);
  });
});

describe("safeCompose — graceful degradation", () => {
  const fallback = "Berat, ya. Ada ayat yang sering dibaca orang saat sedang seperti ini.";

  test("clean model prose is used", () => {
    const clean = "Aku di sini. Nggak buru-buru.";
    expect(safeCompose(clean, fallback)).toBe(clean);
  });

  test("unsafe model prose degrades silently to the deterministic opener", () => {
    const unsafe = "Ayat ini artinya kamu harus sabar.";
    expect(safeCompose(unsafe, fallback)).toBe(fallback);
  });
});
