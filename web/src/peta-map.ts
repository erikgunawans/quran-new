/**
 * The Peta Tematik map — 13 categories on a ring, bonded by the verses they share.
 *
 * WHAT IT DRAWS. 69 of the 78 possible category pairs share at least one verse. The thickest
 * bond is Karakteristik Negara Bersyari'ah × Perintah dan Larangan (85 verses). Once drawn, the
 * structure states itself: "Perintah dan Larangan" sits at the centre of six of the eight
 * strongest bonds — commands and prohibitions thread through every other theme. That is a real
 * fact about how Ustadz Muhammad Thalib's team organised the Qur'an, and a list of rows cannot
 * show it.
 *
 * WHY IT IS HAND-ROLLED. `docs/reference/indeks-tematik/peta-tematik.html` already visualises
 * this — a 3D force-directed cosmos — and we refused to ship it twice over: it is 605 KB (the
 * whole app is 78 KB of JS) and it is a dark starfield, which is the retired aesthetic. d3 costs
 * 7.6× the app to draw one picture. This file is ~4 KB of arithmetic and returns an SVG string.
 * No dependency, no canvas, no simulation — the layout is a circle, which needs no solving.
 *
 * WHY IT IS OPT-IN. PRODUCT.md: the scripture out-shouts the interface, never the reverse. A
 * diagram parked on top of the index would invert that, and most readers came to read a verse,
 * not to study a graph. So `bonds.json` (4.8 KB) is fetched only when the reader taps "Lihat
 * peta" — bandwidth is their choice, which is the same rule the corpus shards already follow.
 *
 * WHAT IS OURS AND WHAT IS HIS. The categories and their names are his. The bonds are OUR
 * derivative work — we computed them by intersecting his citations. `peta.ts` names that seam on
 * the page; do not let this file imply the diagram is part of the original index.
 */
import { esc } from "./verse.ts";
import type { PetaIndex } from "./peta.ts";

export interface PetaBond {
  readonly a: string;
  readonly b: string;
  /** Verses cited by BOTH categories. Derived at build time from the shards. */
  readonly n: number;
}

export interface PetaBonds {
  readonly source: { readonly title: string; readonly author: string; readonly url: string };
  readonly max: number;
  readonly bonds: readonly PetaBond[];
}

// Wider than tall, deliberately. Horizontal labels need horizontal room: "Karakteristik Negara
// Bersyari'ah" on the right of the ring runs ~120px past the rim, which a square box clips. The
// ring itself stays circular — only the canvas around it is letterboxed.
const VIEW_W = 900;
const VIEW_H = 620;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const R = 182;

/** Long Indonesian category names cannot sit legibly around the ring at any size. Truncated for
 * the LABEL only — the full name is on the node's <title>, and in the authoritative list of 13
 * rows directly below the map. Truncation is display, never data; nothing here edits his index. */
const short = (s: string): string => (s.length <= 24 ? s : s.slice(0, 23).trimEnd() + "…");

interface Node {
  slug: string;
  name: string;
  entries: number;
  x: number;
  y: number;
  angle: number;
}

function layout(index: PetaIndex): Node[] {
  const n = index.categories.length;
  return index.categories.map((c, i) => {
    // -90° so the first category starts at the top rather than at 3 o'clock.
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      slug: c.slug,
      name: c.category,
      entries: c.entries,
      angle,
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    };
  });
}

/**
 * The control point is the chord's midpoint, pulled toward the centre by `k`.
 *
 * k = 1 puts the control ON the midpoint (a straight line); k = 0 puts it at the centre (maximum
 * bow). The subtlety is that k must NOT be constant. A fixed k=0.35 made neighbouring categories
 * bow as deeply as distant ones, and since a neighbour's midpoint already sits near the rim, the
 * result was a spiky star — every short bond diving at the centre for no reason.
 *
 * So k scales with angular separation: neighbours get a high k (gentle arc hugging the rim),
 * far-apart pairs get a low k (a sweep through the middle). Opposite pairs need no help — their
 * midpoint IS the centre, so they draw a diameter whatever k says. The bundling falls out of the
 * geometry; no force simulation, no solver, no d3.
 */
function chord(a: Node, b: Node): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;

  // Angular separation, normalised: 0 = adjacent, 1 = diametrically opposite.
  let d = Math.abs(a.angle - b.angle);
  if (d > Math.PI) d = Math.PI * 2 - d;
  const sep = d / Math.PI;

  const k = 0.35 + (1 - sep) * 0.5;
  const cx = CX + (mx - CX) * k;
  const cy = CY + (my - CY) * k;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
}

/** Returns an SVG string. Caller owns mounting; see peta.ts renderPetaIndex. */
export function chordSvg(index: PetaIndex, data: PetaBonds): string {
  const nodes = layout(index);
  const by = new Map(nodes.map((n) => [n.slug, n]));
  const maxEntries = Math.max(...nodes.map((n) => n.entries));

  // Thinnest bonds first, so the 85-verse ribbon is never buried under a 1-verse hairline.
  const bonds = [...data.bonds].sort((x, y) => x.n - y.n);

  const paths = bonds
    .map((bond) => {
      const a = by.get(bond.a);
      const b = by.get(bond.b);
      if (!a || !b) return "";
      const t = bond.n / data.max;
      // sqrt: linear width makes 1-verse bonds invisible and 85-verse bonds a slab.
      const w = (0.4 + Math.sqrt(t) * 4.6).toFixed(2);
      const o = (0.1 + t * 0.45).toFixed(3);
      return `<path class="pm-bond" data-a="${esc(bond.a)}" data-b="${esc(bond.b)}" d="${chord(a, b)}" stroke-width="${w}" opacity="${o}"><title>${esc(a.name)} × ${esc(b.name)} — ${bond.n} ayat bersama</title></path>`;
    })
    .join("");

  const dots = nodes
    .map((n) => {
      const r = (4 + Math.sqrt(n.entries / maxEntries) * 7).toFixed(1);
      return `<circle class="pm-node" data-slug="${esc(n.slug)}" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r}"><title>${esc(n.name)} — ${n.entries} entri</title></circle>`;
    })
    .join("");

  // Labels are HORIZONTAL, never rotated.
  //
  // The first cut rotated each label to its radius — the textbook chord-diagram treatment, and
  // wrong here. Indonesian category names are long, so the bottom of the ring ("Prinsip-Prinsip
  // Pendidikan Islam", "Rahasia Kejiwaan Manusia…") came out near-vertical and a reader had to
  // tilt their head. A diagram that needs its reader to rotate is a diagram that failed.
  //
  // Horizontal costs a wider box and a little more thought about anchoring, which is a trade
  // worth making every time: anchor by which side of the ring the node sits on, and let the
  // two nodes nearest the vertical axis centre themselves.
  const labels = nodes
    .map((n) => {
      const cos = Math.cos(n.angle);
      const lx = CX + (R + 14) * cos;
      const ly = CY + (R + 14) * Math.sin(n.angle);
      // 0.15, not 0.25. At 0.25 the two nodes flanking the bottom of a 13-node ring (±76°,
      // |cos| = 0.24) both centre-anchored and printed straight through each other. Only a node
      // genuinely at top or bottom dead-centre should centre its label; everything else anchors
      // away from the ring, which is what keeps neighbours from colliding.
      const vertical = Math.abs(cos) < 0.15;
      const anchor = vertical ? "middle" : cos > 0 ? "start" : "end";
      // Push top/bottom labels clear of their own dot instead of sitting on it.
      const dy = vertical ? (Math.sin(n.angle) > 0 ? 14 : -10) : 0;
      return `<text class="pm-label" data-slug="${esc(n.slug)}" x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(short(n.name))}</text>`;
    })
    .join("");

  return `
    <svg class="peta-map" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img"
         aria-label="Peta tematik: ${index.categories.length} kategori, ${data.bonds.length} hubungan berdasarkan ayat yang sama.">
      <g class="pm-bonds" fill="none">${paths}</g>
      <g class="pm-nodes">${dots}</g>
      <g class="pm-labels">${labels}</g>
    </svg>`;
}

/**
 * Focus behaviour. Hovering or focusing a category dims every bond it is not part of.
 *
 * Done in JS rather than CSS because a bond's relevance depends on comparing its own data-a/data-b
 * against the hovered node's slug — a relationship CSS selectors cannot express. Idempotent, and
 * the listeners live on the SVG root, so replacing the map's innerHTML disposes of them with it.
 */
export function bindMap(svg: SVGElement): void {
  const bonds = [...svg.querySelectorAll<SVGPathElement>(".pm-bond")];

  const focus = (slug: string | null) => {
    if (!slug) {
      for (const b of bonds) b.classList.remove("is-dim", "is-lit");
      return;
    }
    for (const b of bonds) {
      const on = b.dataset.a === slug || b.dataset.b === slug;
      b.classList.toggle("is-lit", on);
      b.classList.toggle("is-dim", !on);
    }
  };

  for (const el of svg.querySelectorAll<SVGElement>("[data-slug]")) {
    const slug = el.dataset.slug ?? null;
    el.addEventListener("mouseenter", () => focus(slug));
    el.addEventListener("focus", () => focus(slug));
  }
  svg.addEventListener("mouseleave", () => focus(null));
  svg.addEventListener("blurcapture" as never, () => focus(null));
}
