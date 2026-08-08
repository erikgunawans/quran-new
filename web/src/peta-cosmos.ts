/**
 * Peta Tematik — the cosmos. 1,632 verse-stars around 13 category hubs, in 3D, rotatable.
 *
 * WHY THIS EXISTS RATHER THAN THE ARTIFACT IT REPLACES.
 * `docs/reference/indeks-tematik/peta-tematik.html` drew this first and was refused twice: 605 KB
 * and a stale parse. Both objections were partly wrong and worth stating precisely, because the
 * lesson generalises:
 *
 *   - 301 KB of that file is d3 + d3-force-3d, whose ONLY job is deciding where the dots go — for
 *     a graph that never changes. That is a build-time computation being shipped to every phone
 *     in Indonesia and re-run on every page load. `src/app/build-peta-3d.ts` now solves it once
 *     and bakes integer coordinates into `cosmos.json` (46 KB). This file just draws them.
 *     Nothing here simulates anything; there is no force, no octree, no solver.
 *   - The other 294 KB was verbose JSON of 1,554 verses. Wrong number: the real index holds
 *     **1,632** verses and **518** bridges. That artifact predates the parse fix that recovered 87
 *     secondary refs, so shipping it would have silently dropped 78 of Ustadz Muhammad Thalib's
 *     verses from a picture bearing his name. THAT was the fatal objection, not the kilobytes.
 *
 * TRANSPARENT AND THEME-AWARE. The frame is transparent in both themes (see .pc-frame in
 * read.css) so the app's own page background shows through, and the canvas paints a theme-matched
 * palette. In DARK it keeps the original luminous look: bright pastels blooming under `lighter`
 * compositing. In LIGHT an additive pastel is invisible, so it switches to `source-over` with
 * darker saturated hues painted opaquely, a white gradient tail (no grey halo ring), and dark
 * labels. All of it lives in the Paint sets below; geometry and animation are theme-independent.
 * Theme is read from <html data-theme> (falling back to prefers-color-scheme) and re-read on
 * change via a MutationObserver + matchMedia listener that recolour in place.
 *
 * WHAT IS HIS AND WHAT IS OURS. The categories, their names, and every verse citation are his.
 * The 3D positions, the clustering, and the bridge geometry are OURS — computed by intersecting
 * his citations. peta.ts names that seam on the page.
 */
import { esc } from "./esc.ts";

export interface CosmosCat {
  readonly slug: string;
  readonly name: string;
  readonly entries: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** [x, y, z, surah, ayah, catIndexes, resolvable] — arrays, not objects: naming keys 1,632
 * times is ~40 KB of the word "surah". */
export type CosmosVerse = [number, number, number, number, number, number[], 0 | 1];

export interface Cosmos {
  readonly meta: { cats: number; verses: number; links: number; bridges: number; entries: number };
  readonly source: { title: string; author: string; url: string };
  readonly cats: readonly CosmosCat[];
  readonly verses: readonly CosmosVerse[];
}

/** 13 hues, one set per theme. Erik's call: categorical colour is doing real work here — it is
 * what makes a cluster readable at a glance — so this is the one surface that leaves the emerald
 * discipline. Tuned to a common lightness/chroma so no single category shouts, and NO GOLD
 * (hue 70–100), which stays banned everywhere per the design gate.
 *
 * DARK: bright pastels that bloom under `lighter` compositing against a dark page.
 * LIGHT: darker saturated variants — on white, an additive pastel is nearly invisible, so the
 * light theme paints these opaquely under `source-over`. */
const HUES_DARK = [
  "#5eead4", "#7dd3fc", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fdba74",
  "#bef264", "#6ee7b7", "#67e8f9", "#93c5fd", "#d8b4fe", "#f9a8d4",
];
const HUES_LIGHT = [
  "#0f8f80", "#1f7fb8", "#4f5bc4", "#7145c9", "#a83fb0", "#b8455c", "#a9631f",
  "#5d7d16", "#12876a", "#12798c", "#2f6fbe", "#8046b8", "#b2417e",
];

/**
 * All theme-dependent paint: hues, bridge-star colour, canvas composite mode, the scalar alphas,
 * the transparent gradient tail, and the two label colours. The DARK set is verbatim the old
 * hardcoded behaviour; the LIGHT set is its counterpart tuned for a white page under source-over.
 *
 * Everything else — geometry, projection, rotation, twinkle, sprite blitting, hub/star radii — is
 * theme-independent and untouched.
 */
interface Paint {
  readonly hues: readonly string[];
  readonly bridge: string;
  readonly composite: GlobalCompositeOperation;
  readonly linkAlpha: number;
  readonly haloBlit: number;
  readonly hubBloom: number;
  readonly gradTail: string;
  readonly labelShadow: string;
  readonly labelFill: string;
}

const PAINT_DARK: Paint = {
  hues: HUES_DARK,
  bridge: "#ffffff",
  composite: "lighter",
  linkAlpha: 0.045,
  haloBlit: 0.42,
  hubBloom: 0.3,
  gradTail: "rgba(0,0,0,0)",
  labelShadow: "rgba(0,0,0,0.6)",
  labelFill: "rgba(255,255,255,0.95)",
};

const PAINT_LIGHT: Paint = {
  hues: HUES_LIGHT,
  bridge: "#7c8d95",
  composite: "source-over",
  linkAlpha: 0.1,
  haloBlit: 0.1,
  hubBloom: 0.16,
  gradTail: "rgba(255,255,255,0)",
  labelShadow: "rgba(255,255,255,0.9)",
  labelFill: "rgba(16,36,30,0.95)",
};

/** Active theme: explicit `data-theme` wins; otherwise fall back to the OS preference. Undefined
 * document (SSR guard) is treated as dark, the historical default. */
function isDarkTheme(): boolean {
  const t = typeof document !== "undefined" ? document.documentElement.dataset.theme : undefined;
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

const currentPaint = (): Paint => (isDarkTheme() ? PAINT_DARK : PAINT_LIGHT);

/** Legend dots (DOM, rendered once) use the active theme's hues so they match the canvas at load.
 * The legend does not live-update on a later theme toggle; the canvas does. */
const catColor = (i: number): string => currentPaint().hues[i % HUES_DARK.length]!;

/**
 * One pre-rendered glow per colour, reused for every star of that colour.
 *
 * There are 14 distinct star colours (13 hues + white for bridges) and 1,632 stars. Allocating a
 * radial gradient per star per frame costs ~1.7 ms/frame on a Mac and multiples of that on a
 * mid-range Android — the device this app is actually written for. Drawing them is a memcpy.
 *
 * Rendered at a fixed 64px and scaled at blit time: a gradient is smooth, so downscaling it loses
 * nothing a reader can see, and one sprite serves every depth.
 *
 * Keyed by colour AND the transparent tail: the tail differs by theme (dark fades toward
 * rgba(0,0,0,0), light toward rgba(255,255,255,0), otherwise a source-over halo grows a grey ring
 * on white). Including the tail in the key means a theme switch lazily builds a fresh sprite set
 * rather than reusing the wrong-tailed cache — at most 28 sprites total, a memcpy to draw.
 */
const SPRITES = new Map<string, HTMLCanvasElement>();

function haloSprite(color: string, tail: string): HTMLCanvasElement {
  const key = `${color}|${tail}`;
  const hit = SPRITES.get(key);
  if (hit) return hit;

  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(1, tail);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  SPRITES.set(key, c);
  return c;
}

interface Star {
  x: number; y: number; z: number;
  surah: number; ayah: number;
  cats: number[];
  bridge: boolean;
  /** Per-star phase so the field twinkles instead of pulsing in unison. */
  phase: number;
  r: number;
  color: string;
  // Filled per frame by project().
  px: number; py: number; scale: number; persp: number; depth: number;
}

interface Hub {
  x: number; y: number; z: number;
  name: string; slug: string; entries: number;
  color: string; r: number;
  px: number; py: number; scale: number; persp: number; depth: number;
}

export interface CosmosHandle {
  destroy(): void;
  setAutoRotate(on: boolean): void;
  setBridgesOnly(on: boolean): void;
}

/**
 * Mounts the cosmos onto a canvas and returns a handle.
 *
 * The whole renderer is: rotate every point by two angles, divide by depth, draw. That is the
 * entire "3D engine" — perspective projection is one division, and it is why no library is
 * needed once the layout is precomputed.
 */
export function mountCosmos(
  canvas: HTMLCanvasElement,
  data: Cosmos,
  onPick: (surah: number, ayah: number) => void,
): CosmosHandle {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("canvas 2d context unavailable");
  // Bound explicitly rather than relying on narrowing: `frame()` is a hoisted function
  // declaration, and TS will not carry the null-check into it. A `!` at every one of the ~30
  // draw calls would be noise; one typed binding says it once.
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // The active paint set, chosen by theme and re-chosen on theme change (see applyPaint below).
  let paint: Paint = currentPaint();
  const hueFor = (i: number): string => paint.hues[i % paint.hues.length]!;

  const hubs: Hub[] = data.cats.map((c, i) => ({
    x: c.x, y: c.y, z: c.z,
    name: c.name, slug: c.slug, entries: c.entries,
    color: hueFor(i),
    r: 5 + Math.sqrt(c.entries / 626) * 12,
    px: 0, py: 0, scale: 1, persp: 1, depth: 1,
  }));

  const stars: Star[] = data.verses.map((v, i) => ({
    x: v[0], y: v[1], z: v[2],
    surah: v[3], ayah: v[4],
    cats: v[5],
    bridge: v[5].length > 1,
    // Golden-angle phase: deterministic, and adjacent stars never share a beat.
    phase: (i * 2.399963) % (Math.PI * 2),
    r: v[5].length > 1 ? 1.9 : 1.3,
    color: v[5].length > 1 ? paint.bridge : hueFor(v[5][0] ?? 0),
    px: 0, py: 0, scale: 1, persp: 1, depth: 1,
  }));

  /**
   * Re-derive every theme-dependent value in place. Called when the document theme flips. Stars
   * and hubs recolour by their stored category index; the sprite cache rebuilds lazily because
   * haloSprite is keyed by colour+tail and the new theme uses new keys. The rAF loop repaints on
   * its own next frame, so no explicit redraw is needed here.
   */
  function applyPaint() {
    paint = currentPaint();
    hubs.forEach((hub, i) => { hub.color = hueFor(i); });
    for (const s of stars) s.color = s.bridge ? paint.bridge : hueFor(s.cats[0] ?? 0);
  }

  let rotY = 0.6;
  let rotX = -0.25;
  let zoom = 1;
  let auto = true;
  let bridgesOnly = false;
  let raf = 0;
  let t = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /**
   * Rotate by rotY (yaw) then rotX (pitch), then perspective-divide.
   *
   * TWO scales come out of this, and conflating them is what turned the first build into a white
   * blob. `scale` maps WORLD units to screen: the cloud radius is 1000 and must land inside
   * min(w,h)/2, so it is ~0.23 — correct for positions, catastrophic for radii. `persp` is the
   * perspective factor alone (≈1, larger when near): a star is a fixed ~1px on screen that only
   * grows as it approaches the camera. Sizing radii with `scale` and then multiplying by 26 to
   * compensate produced 8px discs; 1,632 of those under `lighter` compositing saturate to white.
   */
  function project(p: { x: number; y: number; z: number }): {
    px: number; py: number; scale: number; persp: number; depth: number;
  } {
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const x1 = p.x * cy - p.z * sy;
    const z1 = p.x * sy + p.z * cy;
    const y1 = p.y * cx - z1 * sx;
    const z2 = p.y * sx + z1 * cx;

    const D = 2600; // camera distance; the cloud radius is 1000
    const depth = Math.max(D + z2, 1);
    const persp = (D / depth) * zoom;
    const scale = persp * (Math.min(w, h) / 2 / 980); // margin around the sphere; smaller = fills more
    return { px: w / 2 + x1 * scale, py: h / 2 + y1 * scale, scale, persp, depth };
  }

  function frame() {
    t += 0.016;
    if (auto) rotY += 0.0016;

    ctx.clearRect(0, 0, w, h);

    for (const hub of hubs) Object.assign(hub, project(hub));
    for (const s of stars) Object.assign(s, project(s));

    // Links first, underneath — only for bridge stars. Drawing all 2,370 every frame is both
    // slow and visual mud; the bridges are the point, so they are what earns a line.
    ctx.globalCompositeOperation = paint.composite;
    for (const s of stars) {
      if (!s.bridge) continue;
      for (const ci of s.cats) {
        const hub = hubs[ci];
        if (!hub) continue;
        ctx.strokeStyle = hub.color;
        ctx.globalAlpha = paint.linkAlpha;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(hub.px, hub.py);
        ctx.stroke();
      }
    }

    // Stars, painted back-to-front so near ones sit on top.
    const order = [...stars].sort((a, b) => b.depth - a.depth);
    for (const s of order) {
      if (bridgesOnly && !s.bridge) continue;
      // Twinkle: a slow sine per star. Bridges breathe wider — they are the interesting ones.
      const tw = 0.55 + 0.45 * Math.sin(t * (s.bridge ? 1.6 : 1.0) + s.phase);
      const r = Math.max(s.r * s.persp * 1.15, 0.5);
      const a = Math.min(tw * (s.bridge ? 1 : 0.8), 1);

      // The halo IS the luminosity — a flat arc() is a dot; a star is a core plus falloff, and
      // under `lighter` the overlapping falloffs of a cluster sum into the glow that makes this
      // read as a galaxy rather than as confetti.
      //
      // But it is BLITTED, not allocated. The first cut called createRadialGradient() per star
      // per frame: 1,632 allocations × 60fps ≈ 98k/sec, measured at 1.7 ms/frame on a Mac — 10%
      // of the frame budget spent before drawing a pixel, and several times worse on the
      // mid-range Android in the brief. A halo only depends on colour, so there are 14 of them,
      // not 1,632. Pre-rendered once (see haloSprite), then drawImage'd — which is a memcpy.
      const sprite = haloSprite(s.color, paint.gradTail);
      const hr = r * 3.2;
      ctx.globalAlpha = a * paint.haloBlit;
      ctx.drawImage(sprite, s.px - hr, s.py - hr, hr * 2, hr * 2);

      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.px, s.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hubs last, with a bloom halo. `lighter` compositing is what makes overlapping light add up
    // instead of occluding — the reason this reads as luminous rather than as flat dots.
    for (const hub of hubs.slice().sort((a, b) => b.depth - a.depth)) {
      const r = Math.max(hub.r * hub.persp, 2);
      const g = ctx.createRadialGradient(hub.px, hub.py, 0, hub.px, hub.py, r * 5.5);
      g.addColorStop(0, hub.color);
      g.addColorStop(1, paint.gradTail);
      ctx.globalAlpha = paint.hubBloom;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r * 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = hub.color;
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Labels: normal compositing, or `lighter` turns text into glowing mush.
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";

    // Nearest-first, then skip any label that would collide with one already drawn.
    //
    // Without this the centre of the cloud is unreadable — "Rahasia Kejiwaan Manusia dalam
    // Al-Qur'an" printing through "Hijrah, Jihad dan Perang". A 3D layout gives no guarantee that
    // 13 hubs project to 13 non-overlapping places, and at any rotation some pair will coincide.
    // Dropping the FARTHER label is the honest resolution: the near hub is the one in focus, the
    // hidden name is still in the legend below, and one rotation step brings it back. Silently
    // overprinting both, which is what canvas does by default, serves nobody.
    const drawn: { x: number; y: number; w: number }[] = [];
    for (const hub of [...hubs].sort((a, b) => a.depth - b.depth)) {
      const r = Math.max(hub.r * hub.persp, 2);
      const lx = hub.px;
      const ly = hub.py + r + 14;
      const tw = ctx.measureText(hub.name).width;

      const clash = drawn.some(
        (d) => Math.abs(d.y - ly) < 13 && Math.abs(d.x - lx) < (d.w + tw) / 2 + 6,
      );
      if (clash) continue;
      drawn.push({ x: lx, y: ly, w: tw });

      // Fade with depth so the far side of the sphere recedes instead of competing.
      const near = Math.max(0, Math.min(1, (2600 + 1000 - hub.depth) / 2000));
      ctx.globalAlpha = 0.45 + near * 0.55;
      ctx.fillStyle = paint.labelShadow;
      ctx.fillText(hub.name, lx + 1, ly + 1);
      ctx.fillStyle = paint.labelFill;
      ctx.fillText(hub.name, lx, ly);
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(frame);
  }

  // ── interaction ────────────────────────────────────────────────────────────
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;

  const down = (e: PointerEvent) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    rotY += dx * 0.005;
    rotX += dy * 0.005;
    rotX = Math.max(-1.4, Math.min(1.4, rotX));
    lastX = e.clientX; lastY = e.clientY;
  };
  const up = (e: PointerEvent) => {
    dragging = false;
    // A drag is not a click. Without this, rotating the cosmos also opens a random verse.
    if (moved < 5) pick(e);
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom = Math.max(0.4, Math.min(4, zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
  };

  function pick(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: Star | undefined;
    let bestD = 14;
    for (const s of stars) {
      if (bridgesOnly && !s.bridge) continue;
      const d = Math.hypot(s.px - mx, s.py - my);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (best) onPick(best.surah, best.ayah);
  }

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("resize", resize);

  // Repaint on theme change from either source: an explicit `data-theme` flip on <html> (the app
  // toggle) or the OS `prefers-color-scheme` when no explicit theme is set. applyPaint recolours
  // in place; the rAF loop shows it next frame.
  const themeMq = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onTheme = () => applyPaint();
  themeMq?.addEventListener("change", onTheme);
  const themeObserver = new MutationObserver(onTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  resize();
  // prefers-reduced-motion: stop the auto-spin AND the twinkle. A field of 1,632 pulsing dots is
  // exactly what that preference exists to prevent.
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduce) auto = false;
  frame();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
      window.removeEventListener("resize", resize);
      themeMq?.removeEventListener("change", onTheme);
      themeObserver.disconnect();
    },
    setAutoRotate(on) { auto = on; },
    setBridgesOnly(on) { bridgesOnly = on; },
  };
}

/** The legend — real DOM, not canvas text, so it is selectable and screen-readable. */
export function legendHtml(data: Cosmos): string {
  return `<ul class="pc-legend">${data.cats
    .map(
      (c, i) =>
        `<li><span class="pc-dot" style="background:${catColor(i)}"></span><span class="pc-name">${esc(c.name)}</span><span class="pc-n">${c.entries}</span></li>`,
    )
    .join("")}</ul>`;
}
