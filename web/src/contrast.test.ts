import { describe, expect, test } from "bun:test";

/**
 * WCAG AA is a HARD requirement (PRODUCT.md), so it is a test, not an aspiration.
 *
 * We check the OKLCH tokens themselves rather than a rendered screenshot: the tokens are the
 * source of truth, and a screenshot only proves one moment on one machine. If someone lowers
 * a token's lightness "for elegance" later, this fails in CI.
 */

// ── OKLCH → sRGB (CSS Color 4) ───────────────────────────────────────
function oklchToRgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const enc = (v: number) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, c));
  };
  return [enc(lr), enc(lg), enc(lb)];
}

/** Relative luminance from *linear* channels — decode the sRGB gamma first. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const contrast = (fg: [number, number, number], bg: [number, number, number]) => {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const ok = (L: number, C: number, h: number) => oklchToRgb(L, C, h);

// ── the actual tokens from styles.css ────────────────────────────────

/**
 * The brand colors are theme-INVARIANT: only the bg/surface/ink axis flips between registers.
 * One emerald means "you can do this" in both, and the white-on-action math is proved once.
 */
const BRAND = {
  /** the ONE bright surface — actions only. Carries white text, so AA pins its lightness. */
  action: ok(0.532, 0.112, 163),
  /** the far stop of the action gradient. A gradient must pass at BOTH ends, not on average. */
  action2: ok(0.542, 0.092, 188),
  actionInk: ok(1.0, 0.0, 0),
  /** weight without shouting: prayer sidebar, resume bar, ayah badges */
  forest: ok(0.375, 0.073, 166),
  /** decorative only — never text, so it has no AA duty */
  clay: ok(0.586, 0.091, 49),
};

const LIGHT = {
  bg: ok(0.978, 0.007, 160),
  surface: ok(1.0, 0.0, 0),
  surface2: ok(0.955, 0.017, 165),
  ink: ok(0.219, 0.024, 167),
  ink2: ok(0.416, 0.021, 169),
  ink3: ok(0.509, 0.021, 166),
  primary: ok(0.416, 0.083, 165),
  caution: ok(0.52, 0.135, 55),
};

const DARK = {
  bg: ok(0.175, 0.018, 165),
  surface: ok(0.225, 0.02, 165),
  surface2: ok(0.275, 0.022, 165),
  ink: ok(0.97, 0.006, 160),
  ink2: ok(0.8, 0.012, 165),
  ink3: ok(0.68, 0.014, 165),
  primary: ok(0.76, 0.128, 165),
  caution: ok(0.78, 0.14, 55),
};

const AA_BODY = 4.5;
const AA_LARGE = 3.0;
/** WCAG 1.4.11: UI components and graphical objects need 3:1, not 4.5:1. */
const AA_NONTEXT = 3.0;

type Theme = typeof LIGHT;

const surfaceCases = (t: Theme): [string, [number, number, number], [number, number, number], number][] => [
  ["scripture (ink on bg)", t.ink, t.bg, AA_LARGE],
  ["scripture on surface", t.ink, t.surface, AA_LARGE],
  ["body prose (ink2 on bg)", t.ink2, t.bg, AA_BODY],
  ["body prose on surface", t.ink2, t.surface, AA_BODY],
  ["labels (ink3 on bg)", t.ink3, t.bg, AA_BODY],
  ["labels on surface", t.ink3, t.surface, AA_BODY],
  ["placeholder (ink3 on surface2)", t.ink3, t.surface2, AA_BODY],
  ["primary link on bg", t.primary, t.bg, AA_BODY],
  ["primary on surface", t.primary, t.surface, AA_BODY],
  ["primary on surface2 (the wash)", t.primary, t.surface2, AA_BODY],
  ["caution on surface", t.caution, t.surface, AA_BODY],
];

for (const [register, tokens] of [
  ["light — the default register", LIGHT],
  ["dark — the 2am room", DARK],
] as const) {
  describe(`WCAG AA — ${register}`, () => {
    for (const [name, fg, bg, need] of surfaceCases(tokens)) {
      test(`${name} ≥ ${need}:1`, () => {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(need);
      });
    }

    test("the action surface is distinguishable from the page ≥ 3:1", () => {
      // WCAG 1.4.11 — a button the eye cannot find is not a button.
      expect(contrast(BRAND.action, tokens.bg)).toBeGreaterThanOrEqual(AA_NONTEXT);
    });
  });
}

/**
 * The regression this file exists for. Bright emerald is the actions-only color and it carries
 * white TEXT — the chat bubble (the reader's own words) and the primary CTA. Three design passes
 * audited --ink-3 and never audited this, and it sat at 3.33:1: a fail. The action's lightness is
 * therefore pinned by contrast, not taste. Brightening it "to pop more" must fail here first.
 */
describe("WCAG AA — the action color carries white text", () => {
  test("white on action ≥ 4.5:1 (chat bubble, CTA)", () => {
    expect(contrast(BRAND.actionInk, BRAND.action)).toBeGreaterThanOrEqual(AA_BODY);
  });

  test("white on the FAR stop of the action gradient ≥ 4.5:1", () => {
    // A gradient passes at both ends or it does not pass. Text sits over the whole sweep.
    expect(contrast(BRAND.actionInk, BRAND.action2)).toBeGreaterThanOrEqual(AA_BODY);
  });

  test("white on forest ≥ 4.5:1 (prayer sidebar, resume bar, ayah badge)", () => {
    expect(contrast(BRAND.actionInk, BRAND.forest)).toBeGreaterThanOrEqual(AA_BODY);
  });
});

test("in the dark room, scripture out-luminates every piece of chrome", () => {
  // If a UI element ever glows brighter than the verse, the design has inverted its own thesis.
  const inkL = luminance(DARK.ink);
  for (const [name, c] of Object.entries(DARK)) {
    if (name === "ink") continue;
    expect(luminance(c)).toBeLessThan(inkL);
  }
  for (const [name, c] of Object.entries(BRAND)) {
    if (name === "actionInk") continue; // white text ON a brand surface, not chrome
    expect(luminance(c)).toBeLessThan(inkL);
  }
});
