/**
 * The image share card — Ayah's "hold to interact" pattern, additive to `share.ts`'s plain-text
 * egress, never a replacement for it.
 *
 * THE SAME EGRESS CONTRACT, HARDER TO KEEP
 * -----------------------------------------
 * `share.ts` already states the risk: the primary rendering is an INTERPRETATION, and a payload
 * that lets it leave the app captioned as if it were the Qur'an's own words launders a man's
 * reading into scripture. An image is easier to strip context from than plain text — a caption
 * gets cropped, a screenshot of a screenshot loses whatever surrounded it — so this module holds
 * the line *harder*, not softer: if the literal companion is missing, no image is produced at
 * all. There is no image-only-primary state this function can return.
 */
import { FLAGGED, type VerseCard } from "./verse.ts";

const W = 1080;
const MIN_H = 1080;
const PAD = 88;
const MAX_CONTENT_W = W - PAD * 2;

/** Whitespace-split greedy line wrap. Canvas2D has no native wrapping — `measure` stands in for
 * `ctx.measureText(s).width` so this is testable without a real canvas. */
export function wrapLines(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let line = words[0] as string;

  for (let i = 1; i < words.length; i++) {
    const word = words[i] as string;
    const candidate = `${line} ${word}`;
    if (measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/** Strip the inline `<em>` markup `FLAGGED` carries for HTML rendering — canvas draws plain text. */
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, "");

interface Block {
  lines: string[];
  font: string;
  lineHeight: number;
  color: string;
  align: "center";
  direction: "ltr" | "rtl";
  gapBefore: number;
}

/** Render a verse as a themed PNG card. Returns `null` if there is nothing safe to show — no
 * DOM (SSR/test), no blob support, or (the load-bearing case) no literal companion to pair the
 * interpretive rendering with. */
export async function renderVerseCardImage(v: VerseCard): Promise<Blob | null> {
  // The egress contract applies before any environment check — never the primary alone,
  // regardless of where this runs.
  if (!v.primary && !v.companion) return null;
  if (!v.companion) return null;
  if (typeof document === "undefined" || typeof document.createElement !== "function") return null;

  const style = getComputedStyle(document.documentElement);
  const tok = (name: string, fallback: string): string => {
    const val = style.getPropertyValue(name).trim();
    return val === "" ? fallback : val;
  };

  const bg = tok("--bg", "oklch(0.158 0.012 155)");
  const surface = tok("--surface", "oklch(0.205 0.016 155)");
  const line = tok("--line", "oklch(0.305 0.016 155)");
  const ink = tok("--ink", "oklch(0.975 0.004 95)");
  const ink2 = tok("--ink-2", "oklch(0.780 0.008 155)");
  const ink3 = tok("--ink-3", "oklch(0.640 0.010 155)");
  const primaryColor = tok("--primary", "oklch(0.680 0.115 150)");
  const caution = tok("--caution", "oklch(0.760 0.140 55)");
  const fAr = tok("--f-ar", '"Amiri", "Scheherazade New", "Noto Naskh Arabic", serif');
  const fUi = tok("--f-ui", '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');

  // Fonts loaded async via <link> in index.html — a card painted before they're ready silently
  // falls back to a system font, and Arabic in a non-Arabic font is the one failure this
  // product cannot afford. Best-effort: swallow a load failure (offline) rather than crash.
  if (typeof document.fonts?.load === "function") {
    await Promise.all([
      document.fonts.load(`700 60px ${fAr}`),
      document.fonts.load(`400 60px ${fAr}`),
      document.fonts.load(`400 30px ${fUi}`),
      document.fonts.load(`600 30px ${fUi}`),
      document.fonts.load(`700 30px ${fUi}`),
    ]).catch(() => {});
  }

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) return null;

  const measure = (font: string) => (text: string) => {
    mctx.font = font;
    return mctx.measureText(text).width;
  };

  const arFont = (px: number) => `700 ${px}px ${fAr}`;
  const uiFont = (weight: number, px: number) => `${weight} ${px}px ${fUi}`;

  // ── lay out every block in measurement space first, so the canvas can be sized to fit
  //    everything exactly — a fixed aspect ratio would clip the longest ayah (2:282, ~130
  //    Arabic words) or crush the shortest (Al-Ikhlas's single-sentence ayahs) into an
  //    awkwardly empty card. Scripture does not degrade gracefully; the card grows instead.
  const blocks: Block[] = [];

  blocks.push({
    lines: [`QS ${v.surah_name} ${v.ref}`],
    font: uiFont(600, 30),
    lineHeight: 44,
    color: ink3,
    align: "center",
    direction: "ltr",
    gapBefore: 0,
  });

  const arSize = 58;
  blocks.push({
    lines: wrapLines(measure(arFont(arSize)), v.arabic, MAX_CONTENT_W),
    font: arFont(arSize),
    lineHeight: Math.round(arSize * 1.7),
    color: ink,
    align: "center",
    direction: "rtl",
    gapBefore: 56,
  });

  if (v.primary) {
    blocks.push({
      lines: ["Terjemah makna"],
      font: uiFont(700, 24),
      lineHeight: 34,
      color: primaryColor,
      align: "center",
      direction: "ltr",
      gapBefore: 64,
    });
    blocks.push({
      lines: wrapLines(measure(uiFont(400, 32)), v.primary.text, MAX_CONTENT_W),
      font: uiFont(400, 32),
      lineHeight: 46,
      color: ink,
      align: "center",
      direction: "ltr",
      gapBefore: 12,
    });
    blocks.push({
      lines: [`oleh ${v.primary.translator}`],
      font: uiFont(400, 24),
      lineHeight: 34,
      color: ink3,
      align: "center",
      direction: "ltr",
      gapBefore: 12,
    });
  }

  blocks.push({
    lines: ["Terjemah harfiah"],
    font: uiFont(700, 24),
    lineHeight: 34,
    color: ink2,
    align: "center",
    direction: "ltr",
    gapBefore: 40,
  });
  blocks.push({
    lines: wrapLines(measure(uiFont(400, 30)), v.companion.text, MAX_CONTENT_W),
    font: uiFont(400, 30),
    lineHeight: 44,
    color: ink2,
    align: "center",
    direction: "ltr",
    gapBefore: 12,
  });
  blocks.push({
    lines: [`oleh ${v.companion.translator}`],
    font: uiFont(400, 24),
    lineHeight: 34,
    color: ink3,
    align: "center",
    direction: "ltr",
    gapBefore: 12,
  });

  const flag = FLAGGED[v.ref];
  if (flag) {
    blocks.push({
      lines: wrapLines(measure(uiFont(400, 24)), `⚠ ${stripTags(flag)}`, MAX_CONTENT_W - 40),
      font: uiFont(400, 24),
      lineHeight: 36,
      color: caution,
      align: "center",
      direction: "ltr",
      gapBefore: 48,
    });
  }

  blocks.push({
    lines: ["نور Nur — dibagikan lewat Nur"],
    font: uiFont(400, 22),
    lineHeight: 32,
    color: ink3,
    align: "center",
    direction: "ltr",
    gapBefore: 56,
  });

  let contentH = 0;
  for (const b of blocks) contentH += b.gapBefore + b.lines.length * b.lineHeight;

  const height = Math.max(MIN_H, PAD * 2 + contentH);

  // Crisp export, bounded — an uncapped devicePixelRatio on a high-DPI phone multiplies canvas
  // memory for no visible gain past 2x and can OOM a low-end Android mid-render.
  const scale = Math.min(globalThis.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, height);

  ctx.fillStyle = surface;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  const inset = 24;
  ctx.fillRect(inset, inset, W - inset * 2, height - inset * 2);
  ctx.strokeRect(inset, inset, W - inset * 2, height - inset * 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let y = PAD + 20;
  for (const b of blocks) {
    y += b.gapBefore;
    ctx.font = b.font;
    ctx.fillStyle = b.color;
    // A shared 2D context carries `direction` across draws — reset explicitly every block or
    // Arabic's "rtl" leaks into the very next Indonesian line and mis-shapes it.
    ctx.direction = b.direction;
    for (const l of b.lines) {
      y += b.lineHeight;
      ctx.fillText(l, W / 2, y - b.lineHeight * 0.28);
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
