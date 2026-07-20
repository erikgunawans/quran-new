#!/usr/bin/env bun
/**
 * Apply the approved rows of the feeling-corpus proposal into problem-verses.ts.
 *
 *   bun run src/review/apply-feelings-proposal.ts [--include-caveated]
 *
 * Merges HIGH-CONFIDENCE rows only by default. The 27 rows carrying an explicit written doubt
 * (`confidence: "medium"` + `caveat`) are held back — those are precisely the placements where the
 * author flagged that a human should look, and shipping them unread would throw away the one signal
 * the review sheet exists to produce. `--include-caveated` merges them too, deliberately.
 *
 * Verification before writing (same discipline as the sheet builder): every ref must exist in
 * data/canonical, and no ref may collide with one already live. A bad ref fails the run rather than
 * landing a plausible-looking verse in the shipped corpus.
 */
import { PROBLEM_VERSES } from "./problem-verses.ts";
import { PROPOSED_LABELS, PROPOSED_VERSES } from "./feelings-proposal.ts";

const INCLUDE_CAVEATED = process.argv.includes("--include-caveated");

/**
 * Rows that cannot ship regardless of approval, with the reason.
 *
 * 23:60's own caveat asks for it to be displayed together with 23:61 — and retrieval returns ONE
 * verse per theme, so the pair can never both appear. Alone its rendering opens "yang senantiasa
 * mengeluarkan derma…", a mid-sentence fragment. Approval cannot make a dangling clause whole; the
 * constraint is architectural, so the row is held rather than shipped broken. 23:61 carries the same
 * feeling and stands on its own, so the theme is not left empty.
 */
const CANNOT_STAND_ALONE: Record<string, string> = {
  "23:60": "needs 23:61 beside it, which one-verse-per-theme retrieval cannot deliver; opens mid-sentence",
};
const SRC = "src/review/problem-verses.ts";
const fail = (m: string): never => { console.error(`✗ ${m}`); process.exit(1); };

interface Row { ref: readonly [number, number]; theme: string; why: string; confidence: "high" | "medium"; caveat?: string }

const batch = (await Bun.file("src/review/feelings-batch-merged.json").json()) as
  { labels: Record<string, string>; verses: Row[] };

const labels: Record<string, string> = { ...batch.labels, ...PROPOSED_LABELS };
const candidates: Row[] = [...(PROPOSED_VERSES as unknown as Row[]), ...batch.verses]
  .filter((r) => INCLUDE_CAVEATED || r.confidence === "high");

// ── verify against the canonical data ─────────────────────────────────────────────
interface Tr { ayah_id: string; display_role: string }
const rawTr = await Bun.file("data/canonical/translations.json").json();
const trs: Tr[] = Array.isArray(rawTr) ? rawTr : (rawTr.translations ?? Object.values(rawTr)[0]);
const exists = new Set(trs.filter((t) => t.display_role === "primary").map((t) => t.ayah_id));

const live = new Set(PROBLEM_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`));
const seen = new Set<string>();
const rows: Row[] = [];
for (const r of candidates) {
  const ref = `${r.ref[0]}:${r.ref[1]}`;
  if (!exists.has(`ayah:${r.ref[0]}:${r.ref[1]}`)) fail(`${ref} (${r.theme}) is not in data/canonical`);
  if (live.has(ref)) { console.log(`  · skip ${ref} — already live`); continue; }
  if (seen.has(ref)) { console.log(`  · skip ${ref} — duplicate in proposal`); continue; }
  if (CANNOT_STAND_ALONE[ref]) { console.log(`  · HOLD ${ref} — ${CANNOT_STAND_ALONE[ref]}`); continue; }
  seen.add(ref);
  rows.push(r);
}

// ── group into themes, preserving proposal order ──────────────────────────────────
const order: string[] = [];
for (const r of rows) if (!order.includes(r.theme)) order.push(r.theme);

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
let src = await Bun.file(SRC).text();

// This script must be RE-RUNNABLE: the first pass merged the high-confidence rows, so the union no
// longer ends at "Family" and THEME_LABELS already holds most keys. Add only what is genuinely new.
const newThemes = order.filter((t) => !src.includes(`  | "${esc(t)}"`));

// 1. extend the Theme union at whatever its current terminator is
if (newThemes.length) {
  const m = /export type Theme =\n(?:\s*\|[^\n]*\n)*?\s*\|[^\n]*;/.exec(src);
  if (!m) fail("could not locate the Theme union");
  else {
  src = src.replace(m[0], m[0].replace(/;$/, "\n" + newThemes.map((t) => `  | "${esc(t)}"`).join("\n") + ";"));
  }

  // 2. extend THEME_LABELS with the same new keys only
  const labelAnchor = /(export const THEME_LABELS: Record<Theme, string> = \{)/;
  if (!labelAnchor.test(src)) fail("could not find THEME_LABELS");
  src = src.replace(labelAnchor, `$1\n` + newThemes.map((t) => `  "${esc(t)}": "${esc(labels[t] ?? t)}",`).join("\n"));
}

// 3. append the verses
// Anchor on the array's OWN terminator. `lastIndexOf("];")` matched `readonly Theme[];` in the
// interface declaration and spliced 120 verses into the type — find the list first, then its end.
const listStart = src.indexOf("export const PROBLEM_VERSES");
if (listStart === -1) fail("could not find PROBLEM_VERSES");
// The array closes with `] as const;`, not `];` — match the real terminator, not an assumed one.
const listEnd = src.indexOf("\n] as const", listStart);
if (listEnd === -1) fail("could not find the end of PROBLEM_VERSES");
const block = ["", "  // ── Expanded feeling corpus (docs/review/feelings-expansion.md) ──"];
for (const t of order) {
  block.push(`  // ${t}`);
  for (const r of rows.filter((x) => x.theme === t)) {
    block.push(`  { ref: [${r.ref[0]}, ${r.ref[1]}], themes: ["${esc(t)}"], why: "${esc(r.why)}" },`);
  }
}
src = src.slice(0, listEnd) + "\n" + block.join("\n") + src.slice(listEnd);

await Bun.write(SRC, src);
console.log(`\n✓ merged ${rows.length} verses across ${order.length} new feelings into ${SRC}`);
console.log(`  caveated rows: ${INCLUDE_CAVEATED ? "INCLUDED" : "held back (run with --include-caveated to merge)"}`);
console.log(`  next: add LEXICON keywords + OPENERS in web/src/retrieve.ts, then bun run app:corpus`);
