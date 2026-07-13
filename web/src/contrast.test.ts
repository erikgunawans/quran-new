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
const DARK = {
  bg: ok(0.158, 0.012, 155),
  surface: ok(0.205, 0.016, 155),
  surface2: ok(0.255, 0.018, 155),
  ink: ok(0.975, 0.004, 95),
  ink2: ok(0.78, 0.008, 155),
  ink3: ok(0.64, 0.01, 155),
  primary: ok(0.68, 0.115, 150),
  caution: ok(0.76, 0.14, 55),
};

const LIGHT = {
  bg: ok(1.0, 0.0, 0),
  surface: ok(0.978, 0.004, 155),
  surface2: ok(0.955, 0.006, 155),
  ink: ok(0.185, 0.018, 155),
  ink2: ok(0.42, 0.014, 155),
  ink3: ok(0.53, 0.012, 155),
  primary: ok(0.4, 0.106, 150),
  caution: ok(0.52, 0.135, 55),
};

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

describe("WCAG AA — dark theme (the 2am room)", () => {
  const t = DARK;
  const cases: [string, [number, number, number], [number, number, number], number][] = [
    ["scripture (ink on bg)", t.ink, t.bg, AA_LARGE],
    ["scripture on surface", t.ink, t.surface, AA_LARGE],
    ["body prose (ink2 on bg)", t.ink2, t.bg, AA_BODY],
    ["body prose on surface", t.ink2, t.surface, AA_BODY],
    ["labels (ink3 on bg)", t.ink3, t.bg, AA_BODY],
    ["labels on surface", t.ink3, t.surface, AA_BODY],
    ["placeholder (ink3 on surface2)", t.ink3, t.surface2, AA_BODY],
    ["primary link on bg", t.primary, t.bg, AA_BODY],
    ["primary on surface2", t.primary, t.surface2, AA_BODY],
    ["caution on surface", t.caution, t.surface, AA_BODY],
  ];
  for (const [name, fg, bg, need] of cases) {
    test(`${name} ≥ ${need}:1`, () => {
      const r = contrast(fg, bg);
      expect(r).toBeGreaterThanOrEqual(need);
    });
  }
});

describe("WCAG AA — light theme (the commute)", () => {
  const t = LIGHT;
  const cases: [string, [number, number, number], [number, number, number], number][] = [
    ["scripture (ink on bg)", t.ink, t.bg, AA_LARGE],
    ["scripture on surface", t.ink, t.surface, AA_LARGE],
    ["body prose (ink2 on bg)", t.ink2, t.bg, AA_BODY],
    ["body prose on surface", t.ink2, t.surface, AA_BODY],
    ["labels (ink3 on bg)", t.ink3, t.bg, AA_BODY],
    ["labels on surface", t.ink3, t.surface, AA_BODY],
    ["placeholder (ink3 on surface2)", t.ink3, t.surface2, AA_BODY],
    ["primary link on bg", t.primary, t.bg, AA_BODY],
    ["primary on surface2", t.primary, t.surface2, AA_BODY],
    ["caution on surface", t.caution, t.surface, AA_BODY],
  ];
  for (const [name, fg, bg, need] of cases) {
    test(`${name} ≥ ${need}:1`, () => {
      const r = contrast(fg, bg);
      expect(r).toBeGreaterThanOrEqual(need);
    });
  }
});

test("the ink is the brightest thing in the dark room — nūr, structurally", () => {
  // The scripture must out-luminance every chrome color. If a UI element ever glows brighter
  // than the verse, the design has inverted its own thesis.
  const inkL = luminance(DARK.ink);
  for (const [name, c] of Object.entries(DARK)) {
    if (name === "ink") continue;
    expect(luminance(c)).toBeLessThan(inkL);
  }
});
