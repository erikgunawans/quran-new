/**
 * Generates the value half of DESIGN.md from web/src/styles.css.
 *
 * DESIGN.md drifted for one reason: it hand-copied values that already live in code. Every oklch
 * triple existed twice — once where the browser reads it, once where a human reads it — so the two
 * diverged silently. By 2026-07-17 the doc still described a hue-155 dark-first palette and "Inter"
 * for an app that had shipped hue-165 light-first and Plus Jakarta Sans. A design doc that lies
 * about the design is worse than no design doc.
 *
 * So the rule is the same one `theme-index.ts` already follows: values are GENERATED, never typed
 * twice. The rationale — why the band is asymmetric, why bright emerald is actions-only — stays
 * hand-written above the generated block, because reasons cannot be derived from a stylesheet.
 *
 * Run: `bun run app:design`
 */

export {};

const CSS = "web/src/styles.css";
const DOC = "DESIGN.md";
const START = "<!-- GENERATED:tokens START — `bun run app:design`. Do not edit by hand. -->";
const END = "<!-- GENERATED:tokens END -->";

interface Token {
  name: string;
  value: string;
  comment: string;
}

/** Reads the `:root` block — the light register, which IS the default. */
function readRoot(css: string): Token[] {
  const open = css.indexOf(":root {");
  if (open === -1) throw new Error(`${CSS}: no :root block`);
  const body = css.slice(open, css.indexOf("\n}", open));

  const tokens: Token[] = [];
  let pending = "";
  for (const raw of body.split("\n")) {
    const line = raw.trim();

    // A comment line documents the token(s) below it — carry it forward.
    const c = line.match(/^\/\*\s*(.*?)\s*\*\/$/);
    if (c) {
      pending = c[1]!;
      continue;
    }
    if (line.startsWith("/*")) {
      pending = line.replace(/^\/\*\s*/, "");
      continue;
    }

    // Multiple tokens can share a line (the 4pt scale does).
    const decls = line.match(/--[\w-]+\s*:\s*[^;]+;/g);
    if (!decls) continue;
    for (const d of decls) {
      const m = d.match(/^(--[\w-]+)\s*:\s*([^;]+);$/);
      if (!m) continue;
      const trailing = raw.match(/;\s*\/\*\s*(.*?)\s*\*\//);
      tokens.push({ name: m[1]!, value: m[2]!.trim(), comment: trailing?.[1] ?? pending });
      pending = "";
    }
  }
  return tokens;
}

const GROUPS: [string, RegExp, string][] = [
  ["Surface & ink", /^--(bg|surface|surface-2|line|line-strong|ink|ink-2|ink-3)$/, "The light register. Dark flips only this axis — see `@media (prefers-color-scheme: dark)` in the stylesheet."],
  ["Brand", /^--(primary|primary-ink|primary-wash|primary-line|composer-line|composer-line-on|action|action-2|action-grad|action-ink|forest|forest-grad|clay|wash-1|wash-2)$/, "**Theme-invariant.** One emerald means \"you can do this\" in both registers, so the white-on-action contrast math is proved once, not per theme."],
  ["Semantic", /^--(caution|caution-wash|glow|shadow-pop|sh|sh-sm)$/, ""],
  ["Type", /^--(f-ar|f-ui|f-display|step--2|step--1|step-0|step-1|step-2|step-3|step-4|ar-size)$/, "Arabic is scaled by the reader independently of the UI (`--ar-size`), and by the surface via `--ar-scale` (1 everywhere except the conversation)."],
  ["Space & shape", /^--(s-[1-9]|r|r-lg|r-input)$/, "4pt scale. Rhythm comes from a defined set, never arbitrary numbers."],
  ["Motion & layers", /^--(ease|t|z-[\w-]+)$/, "z is semantic, never 9999."],
];

function render(tokens: Token[]): string {
  const out: string[] = [
    START,
    "",
    "> Generated from `web/src/styles.css` by `bun run app:design`. **Do not edit this block** — edit",
    "> the stylesheet and re-run. These values existed twice for months and silently diverged; the",
    "> browser's copy is the only one that was ever true, so it is now the only one written by hand.",
    "",
  ];

  for (const [title, re, note] of GROUPS) {
    const hits = tokens.filter((t) => re.test(t.name));
    if (!hits.length) continue;
    out.push(`### ${title}`, "");
    if (note) out.push(note, "");
    out.push("| Token | Value | Why |", "|---|---|---|");
    for (const t of hits) {
      out.push(`| \`${t.name}\` | \`${t.value}\` | ${t.comment || "—"} |`);
    }
    out.push("");
  }

  out.push(END);
  return out.join("\n");
}

const css = await Bun.file(CSS).text();
const tokens = readRoot(css);
if (tokens.length < 20) throw new Error(`${CSS}: parsed only ${tokens.length} tokens — the parser is broken, refusing to write a truncated doc`);

// A token matching no GROUPS regex used to be dropped in silence: the generator printed a cheerful
// "✓ 57 tokens" and the doc simply never mentioned it. The only thing that noticed was
// design-doc.test.ts, whose failure says "DESIGN.md is stale. Run `bun run app:design`" — advice
// that cannot work, because re-running drops the token again. That cost a full build/test cycle to
// diagnose. The generator now refuses rather than lies; adding a token means placing it.
const ungrouped = tokens.filter((t) => !GROUPS.some(([, re]) => re.test(t.name))).map((t) => t.name);
if (ungrouped.length) {
  throw new Error(
    `${CSS}: ${ungrouped.length} token(s) match no group in GROUPS, so they would be silently ` +
      `omitted from ${DOC}: ${ungrouped.join(", ")}. Add each to a group regex in build-design-doc.ts.`,
  );
}

const doc = await Bun.file(DOC).text();
const s = doc.indexOf(START);
const e = doc.indexOf(END);
if (s === -1 || e === -1) throw new Error(`${DOC}: missing the GENERATED:tokens markers`);

await Bun.write(DOC, doc.slice(0, s) + render(tokens) + doc.slice(e + END.length));
console.log(`✓ design   ${tokens.length} tokens → ${DOC} (from ${CSS})`);
