/**
 * The surah reader renders every ayah at once. This suite pins the rule that bounds what it PAINTS.
 *
 * ── ⚠️ THE ORIGINAL JUSTIFICATION FOR THIS RULE WAS WITHDRAWN ───────────────────────────────────
 *
 * This file first carried a table showing Ali 'Imran (200 ayahs) scrolling at a fraction of the frame
 * rate of Al-Ikhlas (4 ayahs), with a worst frame well over a second. I falsified that myself. Under
 * an identical cold-load procedure with ALTERNATING arms, the same page with the same node count and
 * scroll height measures the same frame rate as the short surah, with zero long frames — and still
 * does after churning between long surahs eight times. The original readings were a transient
 * degraded browser state, not a property of surah length. Those numbers are gone from this file on
 * purpose. Do not reinstate them, and do not cite them anywhere else.
 *
 * What six PAIRED runs do support, and the entire case for the rule below: frame rate unchanged,
 * worst frame consistently lower with no overlap between the groups. Real, small, and inside one
 * frame budget either way.
 *
 * ── ⚠️ THIS RULE DOES NOT EXPLAIN THE BLANK AYAH CARDS ──────────────────────────────────────────
 *
 * Erik's screenshots show cards with a header and action row and a blank middle. Every card holds its
 * text — `innerText` confirms 0 of 200 empty — so the DOM is not the broken part, and a text-content
 * assertion reports everything fine. The paint-pressure story that would have explained it is the
 * same story the controlled measurement knocked down, so it cannot be turned around and used as the
 * cause. NOTHING BELOW ASSERTS A FIX FOR IT. It is recorded open in ISC-659.
 *
 * ── WHY `content-visibility` AND NOT VIRTUALISATION ─────────────────────────────────────────────
 *
 * `read.ts` already chunks insertion through `idle()`, parses each batch into a fragment, and keeps
 * a completeness backstop that flushes any ayah the chain missed. All of that protects the reader
 * from a surah that quietly stops short. Windowing the DOM would delete those guarantees and break
 * `tryLand()`'s deep link, find-in-page, and "salin"/"bagikan" on an off-screen ayah.
 *
 * `content-visibility: auto` keeps every ayah in the DOM and only skips its layout and paint while
 * off-screen. Nothing above changes behaviour; the browser simply stops painting 200 screens at
 * once.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(import.meta.dir, "read.css"), "utf8");

/** The rule block for the render budget, as one string — so the arms below read the same source. */
const RULE = /#read #surah-body \.verse\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";

describe("the surah reader bounds what it paints", () => {
  test("the ayah card opts out of rendering while off-screen", () => {
    expect(RULE).toMatch(/content-visibility:\s*auto/);
  });

  test("it is SCOPED to the surah reader, never to `.verse` at large", () => {
    // `.verse` is shared with the answer surface (`answer.ts`), where a turn holds a handful of
    // cards and there is nothing to save. Applying this globally would spend the sizing risk below
    // on a surface that never had the problem.
    expect(CSS).not.toMatch(/^\s*\.verse\s*\{[^}]*content-visibility/m);
    expect(CSS).toMatch(/#read #surah-body \.verse/);
  });

  test("an intrinsic size is declared — without it the scrollbar is destroyed", () => {
    // THE FOOTGUN. `content-visibility: auto` with no `contain-intrinsic-size` collapses every
    // off-screen card to zero height, so a 200-ayah surah reports a scroll height of about one
    // screen and the scrollbar jumps as the reader moves. The pair is the fix; the first half alone
    // is a worse bug than the one being fixed.
    expect(RULE).toMatch(/contain-intrinsic-size:/);
  });

  test("the intrinsic size uses the `auto` keyword, so a rendered card's REAL height is remembered", () => {
    // With a bare length every card is guessed at forever and the estimate never improves, so the
    // scroll height stays wrong by the error times 200. `auto <length>` uses the length only until
    // the card has been rendered once, then remembers what it actually was.
    expect(RULE).toMatch(/contain-intrinsic-size:\s*auto\s+\d/);
  });

  test("the fallback length is drawn from the measured distribution, not guessed", () => {
    // Measured on prod across all 200 cards of Ali 'Imran: min 323, p25 346, median 370, p75 450,
    // p95 520, max 728. The median is the right anchor — it minimises total estimate error before
    // any card has rendered. A number far outside this range means somebody guessed; the first
    // draft of this fix used 420 for exactly that reason.
    const px = Number(/contain-intrinsic-size:\s*auto\s+(\d+)px/.exec(RULE)?.[1]);
    expect(px).toBeGreaterThanOrEqual(323);
    expect(px).toBeLessThanOrEqual(520);
  });
});
