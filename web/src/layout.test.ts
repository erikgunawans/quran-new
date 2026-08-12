import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * THE LAYOUT LAWS ARE NOW TESTS.
 *
 * This file exists because of a single sentence written into PROGRESS.md on 2026-08-09, after an
 * audit found `.thread` computing `max-width: none` and rendering 954px cards against a stated
 * 46rem measure:
 *
 *   > Colour rules here are tests; layout and type rules are prose.
 *
 * That asymmetry is the defect generator, not the drift it produced. `contrast.test.ts` has caught
 * every colour regression for months because a token that fails AA fails CI. DESIGN.md § Layout has
 * asserted the 46rem MEASURE since the design system was written and caught nothing, because prose
 * cannot fail. Fixing the `max-width` alone would have left the generator intact — so the rule below
 * is the actual fix, and the CSS is merely its subject.
 *
 * These assert the CSS SOURCE, deliberately. A computed-style test needs a browser and proves one
 * viewport on one machine; what we want to prevent is the rule being *deleted or weakened in the
 * file*, which is how it went missing the first time. Rendered proof is Interceptor's job, and it
 * ran against production for this change.
 */

const read = (f: string) => readFileSync(join(import.meta.dir, f), "utf8");
const shell = read("shell.css");
const styles = read("styles.css");
const design = readFileSync(join(import.meta.dir, "../../DESIGN.md"), "utf8");

/** Strip comments so a rule quoted inside a `/* … *\/` block can never satisfy an assertion. */
const live = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const shellLive = live(shell);
const stylesLive = live(styles);

describe("the 46rem MEASURE is enforced, not merely stated", () => {
  test("DESIGN.md still declares the measure — if this changes, the law changed, not the code", () => {
    expect(design).toContain("46rem is a MEASURE");
  });

  test("the thread is clamped to 46rem", () => {
    // (0,2,0) or stronger: a bare `.thread` loses to `.qk-panel-body .thread`, which is exactly
    // how the clamp went missing while a 46rem rule sat in styles.css looking correct.
    expect(shellLive).toMatch(/\.qk-panel-body\s+\.thread\s*\{[^}]*max-width:\s*46rem/);
  });

  test("the clamped thread is centred, so the saved width becomes margin and not a right gutter", () => {
    const rule = shellLive.match(/\.qk-panel-body\s+\.thread\s*\{[^}]*max-width:\s*46rem[^}]*\}/)?.[0] ?? "";
    expect(rule).toMatch(/margin-inline:\s*auto/);
  });

  test("the clamp is scoped OFF the landing, which DESIGN.md exempts at 1120px", () => {
    // `#hello` is a child of `.thread`. An unscoped clamp would enforce one line of § Layout by
    // breaking the sentence immediately after it.
    expect(shellLive).toMatch(/:root:not\(\[data-landing\]\)\s+\.qk-panel-body\s+\.thread/);
    expect(design).toContain("1120px");
  });

  test("the reading surface keeps its own width — #read is not inside the clamped thread", () => {
    // Asserting `#read` does not appear inside the `.thread { … }` DECLARATION body would be
    // tautological — a selector can never appear in its own braces. The real property is
    // structural, in the markup: #read must be a SIBLING of #chat, not a descendant of .thread.
    const html = readFileSync(join(import.meta.dir, "../index.html"), "utf8");
    const threadBlock = html.match(/<main[^>]*class="thread"[\s\S]*?<\/main>/)?.[0] ?? "";
    expect(threadBlock).not.toContain('id="read"');
    expect(html).toContain('id="read"');
  });
});

describe("the hero hierarchy: the distinctive line leads the generic one", () => {
  const html = readFileSync(join(import.meta.dir, "../index.html"), "utf8");

  // Without these three, index.html could be reverted to `<p class="greet-la">` +
  // `<h1 class="hero-tagline">` and every CSS assertion in this file would still pass while the
  // entire point of the change — WHICH SENTENCE IS THE HEADING — was gone. The CSS was tested; the
  // semantics were not. Found by an independent review, not by the suite.
  test("the greeting is the document's heading", () => {
    expect(html).toMatch(/<h1[^>]*id="greet-la"/);
  });

  test('"Tanya Apapun" is no longer a heading', () => {
    expect(html).toMatch(/<p[^>]*class="hero-tagline/);
    expect(html).not.toMatch(/<h1[^>]*class="hero-tagline/);
  });

  test("the only h1 ships with text — an empty heading is a worse outline than none", () => {
    // greet.ts writes the time-correct band over this via textContent. The static default is what
    // a crawler, a failed script, or the pre-hydration paint sees.
    const h1 = html.match(/<h1[^>]*id="greet-la"[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    expect(h1.trim().length).toBeGreaterThan(0);
  });

  test("the page has exactly one h1", () => {
    // Comments stripped first: the markup around this element DISCUSSES `<h1>` in prose, and a
    // naive count read 3 where the rendered document has 1 (confirmed on glass). Same discipline as
    // `live()` above — a tag named in a comment must never satisfy or break an assertion.
    const markup = html.replace(/<!--[\s\S]*?-->/g, "");
    expect((markup.match(/<h1[\s>]/g) ?? []).length).toBe(1);
  });

  test("the greeting is sized as the hero, at reskin specificity", () => {
    // Authored against the CLASS, not the tag: `#greet-la` became the h1, and a tag-based rule
    // would have silently handed the greeting the very 52px gradient rule being demoted.
    expect(shellLive).toMatch(/\.qk-panel-body\s+#hello\s+\.greet-la\s*\{[^}]*font-size:/);
  });

  test("the greeting out-sizes the tagline it replaced", () => {
    const grab = (sel: string) => {
      const rule = shellLive.match(new RegExp(`\\.qk-panel-body\\s+#hello\\s+\\${sel}\\s*\\{[^}]*\\}`))?.[0] ?? "";
      // clamp(min, pref, max) — compare the max, which is what a desktop landing actually paints.
      return Number(rule.match(/font-size:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)px/)?.[1] ?? NaN);
    };
    const greeting = grab(".greet-la");
    const tagline = grab(".hero-tagline");
    expect(greeting).toBeGreaterThan(0);
    expect(tagline).toBeGreaterThan(0);
    expect(greeting).toBeGreaterThan(tagline);
  });

  test("the greeting is NOT gradient-filled — the salam and the tagline carry that, it does not", () => {
    // The earlier form of this test counted gradients across (greet-la|hero-tagline) and asserted
    // exactly one. That was false in both directions: `.qk-hero-salam` also paints a gradient (so
    // the title "only one hero element" was untrue of the rendered page), and the tagline carries
    // `.qk-hero-gradient` as a second class, so deleting shell's `background` would still render a
    // gradient while the count-based test failed. Assert the property that actually matters:
    // stacking a gradient on the greeting too would be ornament on ornament.
    const greet = shellLive.match(/\.qk-panel-body\s+#hello\s+\.greet-la\s*\{[^}]*\}/)?.[0] ?? "";
    expect(greet).not.toMatch(/background(-image)?:\s*linear-gradient/);
    expect(greet).toMatch(/color:\s*var\(--panel-ink\)/);
  });

  test("the greeting reads against the PANEL, not the theme — --panel-ink, never --ink", () => {
    // The panel ground flips on the `data-theme` attribute; `--ink` flips on `prefers-color-scheme`.
    // With no attribute and a dark OS they disagree, and this line painted near-white on a light
    // panel. Measured on glass 2026-08-09, which is the only reason it was caught.
    const greet = shellLive.match(/\.qk-panel-body\s+#hello\s+\.greet-la\s*\{[^}]*\}/)?.[0] ?? "";
    expect(greet).not.toMatch(/color:\s*var\(--ink\)/);
    expect(stylesLive).toMatch(/--panel-ink:/);
  });

  test("no `.hello h1` font-size survives to out-specify `.greet-la`", () => {
    // (0,1,1) beats (0,1,0). This is the whole reason the first type-scale pass computed to nothing.
    expect(stylesLive).not.toMatch(/\.hello\s+h1\s*\{[^}]*font-size/);
  });
});

describe("attribution: who said it out-ranks how it is filed", () => {
  test("the scholar's name is set at 14px and does not scale with the surface chrome", () => {
    expect(stylesLive).toMatch(/\.by\s+b\s*\{[^}]*font-size:\s*14px/);
  });

  test("the filing chip stops shouting", () => {
    const chip = stylesLive.match(/(?<![\w.-])\.chip\s*\{[^}]*\}/)?.[0] ?? "";
    expect(chip).toMatch(/text-transform:\s*none/);
    expect(chip).toMatch(/letter-spacing:\s*normal/);
  });
});

/**
 * AMENDED 2026-08-12 (Erik), not deleted.
 *
 * These two tests pinned the 2026-08-09 decision: four seeds, every one first-person and
 * confessional, because "the hard part of this app is not typing, it is admitting what is wrong."
 * Erik replaced them with two curiosity cards — a question generator and Populer — which reverses
 * exactly that. The rule underneath survives the reversal: DESIGN.md still says the empty state
 * TEACHES, and it still needs an element to bind. So the assertions move to what now carries the
 * teaching, rather than being dropped along with the markup they described.
 *
 * The confessional path is not gone; it moved to the composer's own placeholder, which is asserted
 * below so it cannot quietly follow the seeds out.
 */
describe("the empty state teaches — DESIGN.md's rule needs an element to bind", () => {
  test("the landing ships the two pills", () => {
    const html = readFileSync(join(import.meta.dir, "../index.html"), "utf8");
    expect(html).toMatch(/class="seed seed-pill"[^>]*id="seed-q"/);
    expect(html).toMatch(/class="seed seed-pill"[^>]*id="pop-open"/);
  });

  test("the cards live inside .seeds, so the composer still docks above them", () => {
    // landing.test.ts asserts the composer is inserted BEFORE `.seeds`. Changing the container's
    // contents is fine; changing its identity would silently break that ordering rule.
    const html = readFileSync(join(import.meta.dir, "../index.html"), "utf8");
    const seeds = html.slice(html.indexOf('<div class="seeds">'));
    expect(seeds.indexOf('id="seed-q"')).toBeGreaterThan(0);
    expect(seeds.indexOf('id="pop-open"')).toBeGreaterThan(0);
  });

  test("the confessional invitation survives the swap — it moved to the composer, it did not vanish", () => {
    const html = readFileSync(join(import.meta.dir, "../index.html"), "utf8");
    expect(html).toMatch(/placeholder="[^"]*[Cc]eritakan/);
  });
});
