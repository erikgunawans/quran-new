import { describe, expect, test } from "bun:test";
import { todayPick, todayCardHtml, type StandaloneVerse } from "./today.ts";
import type { CuratedVerse } from "./card.ts";

/**
 * The home screen is the first thing anyone opens, and its card shows ONE ayah with no neighbours.
 *
 * These tests exist because this invariant was, until now, a single unguarded line inside a
 * DOM-booting module. Deleting it left the whole suite green while putting a conditionally-approved
 * verse bare on the Beranda — a verse displayed without the passage the ustadz made a condition of
 * approving it, on the most-seen surface in the app.
 */
/** An ordinary verse carrying no reviewer condition — so it builds a `StandaloneVerse` outright. */
const v = (ref: string, over: Partial<StandaloneVerse> = {}): StandaloneVerse => ({
  ref,
  surah: Number(ref.split(":")[0]),
  ayah: Number(ref.split(":")[1]),
  surah_name: "Uji",
  arabic: `AR_${ref}`,
  primary: { text: `TR_${ref}`, translator: "Uji", translation_type: "interpretive" },
  companion: null,
  ...over,
});

/** A verse the reviewer approved only inside a passage. Deliberately a `CuratedVerse`: it is the
 *  shape `todayPick` must reject, and the one `todayCardHtml` can no longer be handed. */
const conditional = (ref: string): CuratedVerse => ({
  ...v(ref),
  passage: [{ ayah: 5, arabic: "AR_5", primary: { text: "TR_5" } }],
});

describe("a conditionally-approved verse is never eligible for the one-verse slot", () => {
  test("skipped even when it is the preferred pick", () => {
    expect(todayPick([conditional("94:6"), v("2:286")])?.ref).toBe("2:286");
  });

  test("skipped even when it sits at index 0 of the positional fallback", () => {
    // This is the case that actually bites: `verses[0]` is whatever the builder emits first, so a
    // corpus rebuild is enough to expose it. Checking only the two named refs would pass here.
    expect(todayPick([conditional("92:7"), v("3:139")])?.ref).toBe("3:139");
  });

  test("a corpus of nothing but conditional verses yields NO pick rather than a bare one", () => {
    // A gap on the home screen is the correct outcome. Showing the verse without its context is not.
    expect(todayPick([conditional("92:7"), conditional("20:26")])).toBeNull();
  });

  test("an empty corpus yields no pick", () => {
    expect(todayPick([])).toBeNull();
  });
});

describe("the ordinary path still works", () => {
  test("prefers 94:6, then 2:286, then whatever is first", () => {
    expect(todayPick([v("1:1"), v("2:286"), v("94:6")])?.ref).toBe("94:6");
    expect(todayPick([v("1:1"), v("2:286")])?.ref).toBe("2:286");
    expect(todayPick([v("1:1"), v("3:139")])?.ref).toBe("1:1");
  });
});

describe("the slot's markup cannot show a passage, which is why the pick rule must hold", () => {
  test("renders the ayah, its meaning and the surah name", () => {
    const html = todayCardHtml(v("2:286"));
    expect(html).toContain("AR_2:286");
    expect(html).toContain("TR_2:286");
    expect(html).toContain("Ayat 286");
  });

  test("a conditional verse can no longer even be HANDED to this renderer", () => {
    // `todayCardHtml` takes StandaloneVerse (`passage?: never`), so the line below is a COMPILE
    // error without the cast — which is the actual protection, and it is why this test needs one.
    //
    // An earlier version of this test called `todayCardHtml(conditional("92:7"))` directly and
    // asserted the markup came out bare. It passed, and it was pinning the hazard rather than the
    // guard: it documented that the renderer silently drops a reviewer's condition. Codex flagged
    // exactly that. The cast keeps the runtime evidence of what dropping looks like, while the
    // `@ts-expect-error` proves no real caller can reach it.
    // @ts-expect-error — a verse carrying `passage` is not a StandaloneVerse; that is the point.
    const unreachable: StandaloneVerse = conditional("92:7");
    const html = todayCardHtml(unreachable);
    expect(html).not.toContain("qk-passage");
    expect(html).not.toContain("AR_5");
  });

  test("falls back to the literal companion when there is no interpretive reading", () => {
    const html = todayCardHtml(v("2:286", { primary: null, companion: { text: "KEMENAG", translator: "Uji", translation_type: "literal" } }));
    expect(html).toContain("KEMENAG");
  });

  test("scripture is escaped", () => {
    const html = todayCardHtml(v("2:286", { arabic: "<script>x</script>" }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
