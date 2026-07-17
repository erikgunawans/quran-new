#!/usr/bin/env bun
/**
 * Generate the remaining New-Quranku redesign frames via Stitch (MCP over curl), post-process
 * deterministically, and save into .scratch/stitch-redesign/.
 *
 * Per redesign memory: NO designSystem param (it re-derives Material3 + overrides the token card);
 * the pasted § PREAMBLE + § SCREEN + § TOKEN CARD + font <link> are the only reliable source.
 *
 * Usage:
 *   bun generate.ts <filter>     e.g. "screen1-landing-mobile-dark" or "mobile-dark" or "all"
 * Resumable: skips frames whose output file already exists.
 */
import { initialize, callTool } from "./stitch-mcp.ts";
import { postprocess } from "./postprocess.ts";

const PROJECT_ID = "353752272015046375";
const OUT_DIR = "/Users/erikgunawansupriatna/quran-new/.scratch/stitch-redesign";
const PROMPT_MD = `${OUT_DIR}/PROMPT.md`;
const FONT_LINK = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Poppins:wght@600;700;800&family=Inter:wght@400..600&display=swap">`;

function slice(md: string, start: string, end: string): string {
  const s = md.indexOf(start);
  const e = md.indexOf(end, s + start.length);
  if (s < 0 || e < 0) throw new Error(`section not found: ${start}`);
  return md.slice(s, e).trim();
}

const SCREENS = [
  { n: 1, slug: "landing", header: "## § SCREEN 1", next: "## § SCREEN 2" },
  { n: 2, slug: "chat-thread", header: "## § SCREEN 2", next: "## § SCREEN 3" },
  { n: 3, slug: "baca-surah-list", header: "## § SCREEN 3", next: "## § SCREEN 4" },
  { n: 4, slug: "reading-surface", header: "## § SCREEN 4", next: "## § SCREEN 5" },
  { n: 5, slug: "themes", header: "## § SCREEN 5", next: "## § SCREEN 6" },
  { n: 6, slug: "concept-maps", header: "## § SCREEN 6", next: "## § TOKEN CARD" },
];

const FRAMES = [
  {
    key: "mobile-dark",
    device: "MOBILE",
    directive:
      "Generate ONLY the mobile 390px DARK frame. Build the dark register from the DARK column of the § TOKEN CARD — composed, never inverted (do not filter or flip the light frame). --action/--forest/--clay keep their exact light hex; --primary flips to #52cb9d. The scripture out-luminates every piece of chrome. Every frame renders at every width — never use md:hidden or any breakpoint that hides the page.",
  },
  {
    key: "desktop-light",
    device: "DESKTOP",
    directive:
      "Generate ONLY the desktop 1120px LIGHT frame. Compose for desktop — do NOT stretch the mobile layout. Use the desktop nav shell (three destinations as a left-aligned top bar, hairline bottom border). Prose stays ≤46rem measure, centered with generous gutters. Every frame renders at every width — never use md:hidden.",
  },
  {
    key: "desktop-dark",
    device: "DESKTOP",
    directive:
      "Generate ONLY the desktop 1120px DARK frame. Compose BOTH for desktop (desktop top-bar nav shell, ≤46rem measure, generous gutters) AND the dark register from the § TOKEN CARD's DARK column — composed, not derived. --action/--forest/--clay keep their exact light hex; --primary flips to #52cb9d. Scripture out-luminates all chrome. Every frame renders at every width — never use md:hidden.",
  },
] as const;

/** Tree-walk to the first text/html downloadUrl. */
function findHtmlUrl(obj: any): string | null {
  let found: string | null = null;
  const walk = (o: any) => {
    if (found || !o || typeof o !== "object") return;
    if (o.mimeType === "text/html" && typeof o.downloadUrl === "string") { found = o.downloadUrl; return; }
    for (const v of Object.values(o)) walk(v);
  };
  walk(obj);
  return found;
}

function unwrap(mcp: any): any {
  const text = mcp?.result?.content?.[0]?.text;
  if (!text) return { _message: "(empty response)" };
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try { return JSON.parse(t); } catch { return { _message: t }; }
  }
  return { _message: t }; // Stitch returned a natural-language message/suggestion, not a screen
}

async function generateFrame(screen: (typeof SCREENS)[number], frame: (typeof FRAMES)[number], md: string): Promise<void> {
  const outFile = `${OUT_DIR}/screen${screen.n}-${screen.slug}-${frame.key}.html`;
  if (await Bun.file(outFile).exists()) {
    console.log(`SKIP  screen${screen.n}-${screen.slug}-${frame.key} (exists)`);
    return;
  }

  const preamble = slice(md, "## § PREAMBLE", "## § SCREEN 1");
  const screenBlock = slice(md, screen.header, screen.next);
  const tokenCard = slice(md, "## § TOKEN CARD", "## § SELF-CHECK");
  const prompt = [
    preamble,
    screenBlock,
    tokenCard,
    "## FRAME TO GENERATE NOW\n\n" + frame.directive,
    "## FONT TAG — use this exact tag, do not construct your own:\n\n" + FONT_LINK,
  ].join("\n\n---\n\n");

  console.log(`GEN   screen${screen.n}-${screen.slug}-${frame.key} … (${(prompt.length / 1024).toFixed(1)}KB prompt, ${frame.device})`);
  const t0 = Date.now();

  // generate_screen_from_text intermittently returns a natural-language message instead of a screen
  // (rate-limit blip, or a "suggestion"). Retry up to 3× with backoff before giving up.
  let res: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = unwrap(
      await callTool("generate_screen_from_text", { projectId: PROJECT_ID, prompt, deviceType: frame.device, modelId: "GEMINI_3_1_PRO" }),
    );
    if (!res._message) break;
    console.log(`      attempt ${attempt + 1} returned a message, not a screen: "${res._message.slice(0, 120)}" — retrying`);
    await new Promise((r) => setTimeout(r, 8000 * (attempt + 1)));
  }
  if (res._message) throw new Error(`message not screen: ${res._message.slice(0, 160)}`);

  // Find the HTML url; if the screen isn't ready, poll get_screen.
  let htmlUrl = findHtmlUrl(res);
  const screenName: string | undefined = res?.name ?? res?.screen?.name;
  for (let i = 0; !htmlUrl && screenName && i < 12; i++) {
    await new Promise((r) => setTimeout(r, 30000));
    const s = unwrap(await callTool("get_screen", { name: screenName, projectId: PROJECT_ID, screenId: screenName.split("/").pop() }));
    htmlUrl = findHtmlUrl(s);
    console.log(`      poll ${i + 1}: ${htmlUrl ? "ready" : "pending"}`);
  }
  if (!htmlUrl) throw new Error(`no html url for screen${screen.n}-${frame.key}`);

  const raw = await (await fetch(htmlUrl)).text();
  const { html, changes } = postprocess(raw);
  await Bun.write(outFile, html);
  console.log(`SAVE  screen${screen.n}-${screen.slug}-${frame.key}  (${(Date.now() - t0) / 1000 | 0}s, ${(html.length / 1024).toFixed(1)}KB)  [${changes.join(", ") || "clean"}]`);
}

// ── main ──
const filter = process.argv[2] ?? "all";
const md = await Bun.file(PROMPT_MD).text();
await initialize();

const jobs: Array<{ s: (typeof SCREENS)[number]; f: (typeof FRAMES)[number] }> = [];
for (const s of SCREENS) for (const f of FRAMES) {
  const id = `screen${s.n}-${s.slug}-${f.key}`;
  if (filter === "all" || id.includes(filter) || f.key === filter) jobs.push({ s, f });
}
console.log(`${jobs.length} frame(s) to generate\n`);
for (const { s, f } of jobs) {
  try {
    await generateFrame(s, f, md);
  } catch (e) {
    console.log(`FAIL  screen${s.n}-${s.slug}-${f.key}: ${(e as Error).message}`);
  }
}
console.log("\ndone.");
