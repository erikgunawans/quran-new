import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * THE HADITH-PAGE PERMISSION BANNER NAMES THE LAYER IT COVERS.
 *
 * This pins a promise, not a preference. `docs/review/ustadz-followup-2026-08-18.md` disclosed to
 * Ustadz Ahmad Isrofiel Mardlatillah that the app had already put his name on screen as the giver
 * of permission, above a page that interleaves TWO machine layers: the hadith TEXT (the layer he
 * permitted verbally on 2026-08-12) and the BAB TITLES (a different generator, shipped 2026-08-10,
 * never put to him). An unqualified "sudah diizinkan <nama>" credited him for a layer nobody asked
 * him about — i.e. it wrote ERIK's decision as the USTADZ's.
 *
 * That letter's promise `"Tidak menuliskan keputusan Erik sebagai keputusan Ustadz"` carried an
 * EXCEPTION for this one already-shipped sentence, whose remedy was promised "menurut jawaban
 * Ustadz atas nomor 2 dan nomor 4". The scoping fix landed independently in `6d4d909` (2026-08-19),
 * so the defect is corrected and Erik retired the exception on 2026-08-22 — which makes the promise
 * UNCONDITIONAL. An unconditional promise whose only guarantee is an unpinned string is one careless
 * edit from being broken silently, and no test covered it: this file is that test.
 *
 * Read from the SOURCE rather than rendered, because the banner lives inline in an async DOM
 * renderer (`renderHadisBook`) and this repo's DOM suites already collide on Happy DOM. Precedent
 * for source-read copy assertions: `landing-cards.test.ts`, `kept-below.test.ts`.
 *
 * DO NOT relax these assertions to make an edit pass. The permission covers the hadith TEXT layer
 * only; if the bab layer ever IS put to him, the record in `docs/review/` changes first.
 */
describe("the hadith permission banner scopes the ustadz's name to the layer he permitted", () => {
  const src = readFileSync(join(import.meta.dir, "sections.ts"), "utf8");
  const banner = src.slice(src.indexOf("sudah diizinkan") - 400, src.indexOf("belum dimintakan izin") + 40);

  test("the permission clause is scoped to the hadith TEXT layer", () => {
    expect(banner).toContain("Terjemahan <b>teks hadis</b>-nya sudah diizinkan");
  });

  test("the bab-title layer is named as NOT having been asked", () => {
    expect(banner).toContain("<b>Judul bab</b> diterjemahkan mesin secara terpisah dan belum dimintakan izin");
  });

  test("per-record review is still disclaimed, and never collapsed into the permission", () => {
    expect(banner).toContain("tinjauan per hadits belum dilakukan");
  });

  // SUPERSEDED 2026-08-23 and REPLACED BY A STRONGER TEST, not deleted.
  //
  // The old test asserted the name was never introduced by an UNSCOPED permission claim — it looked
  // for `sudah diizinkan ${esc(String(m.reviewerNeeded))}` and required no unscoped match. Erik's
  // 2026-08-23 instruction removed the name entirely, which would have made that test pass because
  // the string it hunts for no longer EXISTS anywhere — green for the absence of the whole
  // construct rather than for its scoping. A test that survives the thing it guards by having
  // nothing left to check is vacuous, so it is replaced by the stronger claim.
  test("the reviewer's name is not displayed in the banner AT ALL", () => {
    // `reviewerNeeded` may still GATE the sentence; it must never be INTERPOLATED into it.
    expect(banner).not.toContain("esc(String(m.reviewerNeeded))");
    expect(banner).not.toContain("Isrofiel");
    expect(banner).not.toContain("Ustadz");
  });

  test("the permission is still CLAIMED — unnaming must not become unclaiming", () => {
    // The other half, and the reason this is not simply a deletion: the permission is real. Dropping
    // the sentence as well as the name would understate what was actually granted on 2026-08-12.
    expect(banner).toContain("sudah diizinkan untuk ditampilkan");
  });
});
