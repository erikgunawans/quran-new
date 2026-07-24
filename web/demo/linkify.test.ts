import { describe, expect, test } from "bun:test";
import { linkifyRefs } from "./linkify.ts";

/**
 * The model writes verse references in prose. We link them into the mushaf — but only ones we can
 * resolve to a real surah + ayah, because a wrong jump is its own small lie. These tests pin both
 * halves: the references that MUST become links, and the ones that MUST stay plain text.
 */
describe("linkifyRefs — model prose references become mushaf links, safely", () => {
  test("a named reference with a range links to the first ayah (the screenshot case)", () => {
    const out = linkifyRefs("Rujuk ke surah Al-Isra' ayat 23-24 untuk berbakti.");
    expect(out).toContain(`href="#/mushaf/17/23"`);
    expect(out).toContain(`class="qk-ref-link"`);
    // The visible label is preserved verbatim (escaped).
    expect(out).toContain("Al-Isra&#39; ayat 23-24");
  });

  test("named references across spelling variants resolve", () => {
    expect(linkifyRefs("surah Luqman ayat 14")).toContain(`href="#/mushaf/31/14"`);
    expect(linkifyRefs("QS Al-Baqarah ayat 83")).toContain(`href="#/mushaf/2/83"`);
    expect(linkifyRefs("surat Al-Ankabut ayat 8")).toContain(`href="#/mushaf/29/8"`);
  });

  test("a bare numeric reference links; 'QS n:m' links once, not twice", () => {
    expect(linkifyRefs("Coba baca 2:255 pelan-pelan.")).toContain(`href="#/mushaf/2/255"`);
    const qs = linkifyRefs("Lihat QS 2:255.");
    expect(qs).toContain(`href="#/mushaf/2/255"`);
    expect(qs.match(/<a /g)?.length).toBe(1);
  });

  test("an out-of-bounds ayah is NOT linked — Al-Fatihah has 7 ayahs", () => {
    const out = linkifyRefs("Tidak ada 1:99 di mushaf.");
    expect(out).not.toContain("<a ");
    expect(out).toContain("1:99");
  });

  test("a nonexistent surah number is NOT linked", () => {
    expect(linkifyRefs("surah 200 ayat 3")).not.toContain("<a ");
    expect(linkifyRefs("999:1")).not.toContain("<a ");
  });

  test("an unknown surah NAME stays plain text", () => {
    const out = linkifyRefs("surah Narnia ayat 3");
    expect(out).not.toContain("<a ");
    expect(out).toContain("Narnia");
  });

  test("prose with no reference is returned escaped, unchanged in meaning", () => {
    expect(linkifyRefs("Semoga kamu tenang <3")).toBe("Semoga kamu tenang &lt;3");
  });
});
