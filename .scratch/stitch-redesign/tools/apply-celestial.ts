#!/usr/bin/env bun
// Apply the locked "Celestial" background across the 24 redesign frames.
// Decision (Erik, 2026-07-18): rich on hero+cosmos, calm behind reading; keep crescent;
// forest-green brand tint. Dark frames -> night; light frames -> dawn.
//
// Mechanism: neutralize any existing girih via CSS, then paint celestial on a FIXED
// body::before (sky+nebula+crescent) and body::after (stars+vignette) BEHIND all content
// (z-index -2/-1, body made transparent). Uniform regardless of how each frame wired girih.
// Idempotent: re-running strips the previous injected block first. No DOM surgery.

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DIR = "/Users/erikgunawansupriatna/quran-new/.scratch/stitch-redesign";
const RICH_SCREENS = ["screen1-landing", "screen6-concept-maps"]; // hero + cosmos

const crescent = (fill: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='66' height='66' viewBox='0 0 66 66'%3E%3Cpath fill='${fill}' d='M44 6 A29 29 0 1 0 44 60 A23 23 0 1 1 44 6 Z'/%3E%3C/svg%3E")`;

// star dot fields (comma-joined radial-gradients)
const brightStars = [
  "radial-gradient(1.6px 1.6px at 12% 20%,#fff,transparent)",
  "radial-gradient(1.8px 1.8px at 68% 16%,#fff,transparent)",
  "radial-gradient(1.4px 1.4px at 40% 30%,#dfeaff,transparent)",
  "radial-gradient(1.7px 1.7px at 86% 40%,#fff,transparent)",
  "radial-gradient(1.5px 1.5px at 22% 60%,#fff,transparent)",
  "radial-gradient(1.9px 1.9px at 58% 78%,#ffe9b0,transparent)",
  "radial-gradient(1.5px 1.5px at 90% 82%,#fff,transparent)",
];
const midStars = [
  "radial-gradient(1px 1px at 30% 12%,rgba(255,255,255,.6),transparent)",
  "radial-gradient(1px 1px at 52% 40%,rgba(255,255,255,.6),transparent)",
  "radial-gradient(1px 1px at 78% 58%,rgba(207,224,255,.6),transparent)",
  "radial-gradient(1px 1px at 16% 84%,rgba(255,255,255,.6),transparent)",
  "radial-gradient(1px 1px at 44% 90%,rgba(255,255,255,.6),transparent)",
  "radial-gradient(1px 1px at 94% 26%,rgba(255,255,255,.6),transparent)",
];
const farStars = [
  "radial-gradient(.7px .7px at 24% 34%,rgba(255,255,255,.35),transparent)",
  "radial-gradient(.7px .7px at 62% 24%,rgba(255,255,255,.35),transparent)",
  "radial-gradient(.7px .7px at 82% 72%,rgba(255,255,255,.35),transparent)",
  "radial-gradient(.7px .7px at 38% 68%,rgba(255,255,255,.35),transparent)",
  "radial-gradient(.7px .7px at 8% 48%,rgba(255,255,255,.35),transparent)",
];

function skyBefore(theme: "night" | "dawn", intensity: "rich" | "calm"): string {
  if (theme === "night") {
    const nebula =
      intensity === "rich"
        ? "radial-gradient(38% 30% at 72% 24%, rgba(240,200,81,.10), transparent 70%),radial-gradient(46% 34% at 28% 68%, rgba(22,162,73,.12), transparent 70%),"
        : "radial-gradient(30% 26% at 78% 18%, rgba(240,200,81,.07), transparent 72%),";
    const grad =
      intensity === "rich"
        ? "radial-gradient(120% 90% at 80% 12%, #12305a 0%, transparent 46%),radial-gradient(120% 100% at 15% 90%, #0c2b22 0%, transparent 50%),linear-gradient(165deg,#070c1a 0%,#0a1524 45%,#0a1a14 100%)"
        : "radial-gradient(120% 90% at 82% 8%, #10233f 0%, transparent 42%),linear-gradient(170deg,#060a14 0%,#08111b 55%,#081611 100%)";
    return `${crescent("%23f4dd8f")} ${intensity === "rich" ? "88% 42px" : "90% 40px"} / 66px 66px no-repeat,${nebula}${grad}`;
  }
  // dawn (light) — "Soft Sky-green" (Erik's pick, option 3): palest green top -> cream, gold horizon glow.
  const grad =
    "radial-gradient(100% 55% at 50% 100%, rgba(240,200,81,.15), transparent 55%),linear-gradient(180deg,#e6f0ea 0%,#f1f6f1 42%,#fbfbf6 100%)";
  return `${crescent("%23c9a94a")} 86% 38px / ${intensity === "rich" ? "56px 56px" : "48px 48px"} no-repeat,${grad}`;
}

function starsAfter(theme: "night" | "dawn", intensity: "rich" | "calm"): string {
  let stars: string[];
  let vignette: string;
  if (theme === "dawn") {
    // Soft Sky-green: a couple of faint green-grey stars up high, whisper-soft vignette.
    stars =
      intensity === "rich"
        ? [
            "radial-gradient(1.1px 1.1px at 22% 12%,rgba(70,110,90,.30),transparent)",
            "radial-gradient(1px 1px at 68% 14%,rgba(70,110,90,.24),transparent)",
            "radial-gradient(1px 1px at 45% 9%,rgba(70,110,90,.20),transparent)",
          ]
        : [
            "radial-gradient(1.1px 1.1px at 22% 12%,rgba(70,110,90,.26),transparent)",
            "radial-gradient(1px 1px at 68% 14%,rgba(70,110,90,.20),transparent)",
          ];
    vignette = "radial-gradient(78% 66% at 50% 45%, transparent 60%, rgba(70,90,80,.10) 100%)";
    return `${stars.join(",")},${vignette}`;
  } else if (intensity === "rich") {
    stars = [...brightStars, ...midStars, ...farStars];
    vignette = "radial-gradient(70% 60% at 50% 52%, transparent 45%, rgba(4,6,12,.55) 100%)";
  } else {
    stars = [...brightStars.slice(0, 4).map((s) => s), ...midStars.slice(0, 3)];
    vignette = "radial-gradient(80% 70% at 50% 50%, transparent 30%, rgba(4,6,12,.7) 100%)";
  }
  return `${stars.join(",")},${vignette}`;
}

function buildStyle(theme: "night" | "dawn", intensity: "rich" | "calm"): string {
  return `<style data-celestial="${theme}-${intensity}">
/* Celestial background — locked 2026-07-18. ${theme} / ${intensity}. */
.girih-pattern,.bg-girih,.girih-bg{background:transparent!important;background-image:none!important}
html body{background:transparent!important}
body::before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:${skyBefore(theme, intensity)};background-attachment:fixed}
body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:${starsAfter(theme, intensity)}}
</style>`;
}

const files = readdirSync(DIR).filter(
  (f) => /^screen[1-6]-.*\.html$/.test(f) && !f.includes("PREPIVOT"),
);

let changed = 0;
for (const f of files) {
  const theme: "night" | "dawn" = f.includes("-dark") ? "night" : "dawn";
  const screen = f.replace(/-(mobile|desktop)-(dark|light)\.html$/, "");
  const intensity: "rich" | "calm" = RICH_SCREENS.includes(screen) ? "rich" : "calm";

  let html = readFileSync(join(DIR, f), "utf8");
  // strip prior injected block (idempotent)
  html = html.replace(/<style data-celestial=[^>]*>[\s\S]*?<\/style>\n?/g, "");
  const style = buildStyle(theme, intensity);
  if (!/<\/head>/i.test(html)) {
    console.error(`SKIP (no </head>): ${f}`);
    continue;
  }
  html = html.replace(/<\/head>/i, `${style}\n</head>`);
  writeFileSync(join(DIR, f), html);
  changed++;
  console.log(`${theme}/${intensity.padEnd(4)}  ${f}`);
}
console.log(`\nApplied celestial to ${changed}/${files.length} frames.`);
