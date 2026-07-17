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
 * WHY DARK, IN AN APP THAT IS LOCKED LIGHT. Erik's explicit call. A star field is dark the way a
 * photograph is dark — it is a framed object on the page, not app chrome. And it is not a style
 * preference here: luminous points need darkness to be luminous. The same design on white cannot
 * bloom; it is just grey dots. The frame is the boundary; nothing outside it changes.
 *
 * WHAT IS HIS AND WHAT IS OURS. The categories, their names, and every verse citation are his.
 * The 3D positions, the clustering, and the bridge geometry are OURS — computed by intersecting
 * his citations. peta.ts names that seam on the page.
 */
import { esc } from "./verse.ts";

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

/** 13 hues. Erik's call: categorical colour is doing real work here — it is what makes a cluster
 * readable at a glance — so this is the one surface that leaves the emerald discipline. Tuned to
 * a common lightness/chroma so no single category shouts, and NO GOLD (hue 70–100), which stays
 * banned everywhere per the design gate. */
const HUES = [
  "#5eead4", "#7dd3fc", "#a5b4fc", "#c4b5fd", "#f0abfc", "#fda4af", "#fdba74",
  "#bef264", "#6ee7b7", "#67e8f9", "#93c5fd", "#d8b4fe", "#f9a8d4",
];

const catColor = (i: number): string => HUES[i % HUES.length]!;

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

  const hubs: Hub[] = data.cats.map((c, i) => ({
    x: c.x, y: c.y, z: c.z,
    name: c.name, slug: c.slug, entries: c.entries,
    color: catColor(i),
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
    color: v[5].length > 1 ? "#ffffff" : catColor(v[5][0] ?? 0),
    px: 0, py: 0, scale: 1, persp: 1, depth: 1,
  }));

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
    const scale = persp * (Math.min(w, h) / 2 / 1100); // 1100 leaves a margin around the sphere
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
    ctx.globalCompositeOperation = "lighter";
    for (const s of stars) {
      if (!s.bridge) continue;
      for (const ci of s.cats) {
        const hub = hubs[ci];
        if (!hub) continue;
        ctx.strokeStyle = hub.color;
        ctx.globalAlpha = 0.025;
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
      const r = Math.max(s.r * s.persp * 1.05, 0.4);
      ctx.globalAlpha = Math.min(tw * (s.bridge ? 1 : 0.62), 1);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.px, s.py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hubs last, with a bloom halo. `lighter` compositing is what makes overlapping light add up
    // instead of occluding — the reason this reads as luminous rather than as flat dots.
    for (const hub of hubs.slice().sort((a, b) => b.depth - a.depth)) {
      const r = Math.max(hub.r * hub.persp, 2);
      const g = ctx.createRadialGradient(hub.px, hub.py, 0, hub.px, hub.py, r * 4);
      g.addColorStop(0, hub.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hub.px, hub.py, r * 4, 0, Math.PI * 2);
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
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillText(hub.name, lx + 1, ly + 1);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
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
