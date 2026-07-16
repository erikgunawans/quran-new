import { describe, expect, test } from "bun:test";

/**
 * DESIGN.md must not lie about the design.
 *
 * It did, for months: it described a hue-155 dark-first palette and Inter for an app shipping
 * hue-165 light-first with Plus Jakarta Sans, plus a ≤12px radius rule the app had stopped obeying
 * and two tokens (`--canonical`, `--interpretive`) that were never built. Nothing caught it, because
 * a markdown file has no compiler.
 *
 * Generating the block was half the fix. This is the other half: generation only helps if someone
 * remembers to re-run it, and the whole failure mode here is *forgetting*. So the doc is checked
 * against the stylesheet on every test run.
 *
 * Run `bun run app:design` when this fails.
 */

const css = await Bun.file("web/src/styles.css").text();
const doc = await Bun.file("DESIGN.md").text();

/** The `:root` block — the light register, which IS the default. */
function rootTokens(): Map<string, string> {
  const open = css.indexOf(":root {");
  const body = css.slice(open, css.indexOf("\n}", open));
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1]!, m[2]!.trim());
  }
  return out;
}

const generated = (() => {
  const s = doc.indexOf("<!-- GENERATED:tokens START");
  const e = doc.indexOf("<!-- GENERATED:tokens END");
  return s === -1 || e === -1 ? "" : doc.slice(s, e);
})();

describe("DESIGN.md is generated from the stylesheet, not typed twice", () => {
  test("the generated block exists", () => {
    expect(generated.length, "run `bun run app:design`").toBeGreaterThan(0);
  });

  test("every :root token appears in the doc with its ACTUAL value", () => {
    // The exact drift that shipped: the doc said oklch(...155) while the browser read oklch(...165).
    const stale: string[] = [];
    for (const [name, value] of rootTokens()) {
      const row = new RegExp(`\\\`${name.replace(/-/g, "\\-")}\\\`\\s*\\|\\s*\\\`([^\\\`]+)\\\``);
      const m = generated.match(row);
      if (!m) stale.push(`${name} — missing from the doc`);
      else if (m[1] !== value) stale.push(`${name} — doc says "${m[1]}", stylesheet says "${value}"`);
    }
    expect(stale, `DESIGN.md is stale. Run \`bun run app:design\`.\n  ${stale.join("\n  ")}`).toEqual([]);
  });

  test("the doc invents no token the stylesheet does not define", () => {
    // `--canonical` and `--interpretive` were specified in the doc and never built.
    const defined = rootTokens();
    const invented: string[] = [];
    for (const m of generated.matchAll(/\|\s*`(--[\w-]+)`\s*\|/g)) {
      if (!defined.has(m[1]!)) invented.push(m[1]!);
    }
    expect(invented, `DESIGN.md specifies tokens that do not exist: ${invented.join(", ")}`).toEqual([]);
  });

  test("nobody hand-edited the generated block back to prose", () => {
    expect(generated).toContain("Do not edit this block");
  });
});

describe("the doc's own hard rules still match the code", () => {
  test("no gold — not one token", () => {
    // PRODUCT.md § Anti-references bans it outright; DESIGN.md repeats "not one token".
    // Gold/amber sits around hue 70–100 at meaningful chroma.
    const gold: string[] = [];
    for (const [name, value] of rootTokens()) {
      const m = value.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
      if (!m) continue;
      const [c, h] = [Number(m[2]), Number(m[3])];
      if (c > 0.05 && h >= 70 && h <= 100) gold.push(`${name}: ${value}`);
    }
    expect(gold, `gold entered the palette: ${gold.join(", ")}`).toEqual([]);
  });

  test("the radius scale the doc states is the radius scale that ships", () => {
    const t = rootTokens();
    expect(t.get("--r")).toBe("14px");
    expect(t.get("--r-lg")).toBe("16px");
    expect(t.get("--r-input")).toBe("18px");
  });

  test("the font stacks the doc names are the ones in the stylesheet", () => {
    const t = rootTokens();
    expect(t.get("--f-ar")).toContain("Amiri");
    expect(t.get("--f-display")).toContain("Fraunces");
    expect(t.get("--f-ui")).toContain("Plus Jakarta Sans");
    // The retired stack must not creep back.
    expect(t.get("--f-display")).not.toContain("Instrument Serif");
    expect(t.get("--f-ui")).not.toContain("Inter");
  });

  test("font weights are variable ranges, never a list of static cuts", async () => {
    // 5 static cuts = 548 KB for an Indonesian reader; the same range = 414 KB. Measured.
    const html = await Bun.file("web/index.html").text();
    const link = html.match(/fonts\.googleapis\.com\/css2\?[^"]+/)?.[0] ?? "";
    expect(link, "no Google Fonts link found").not.toBe("");
    // e.g. `wght@400;500;600;700;800` — a semicolon-separated weight list inside one family
    expect(/wght@[\d.]+(;[\d.]+){2,}(?![\d.]*\.\.)/.test(link), `static weight list in: ${link}`).toBe(false);
    expect(link).toContain("400..800");
  });
});
