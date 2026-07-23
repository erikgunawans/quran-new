/**
 * Restore the seven conditionally-approved verses (2026-07-23).
 *
 * The ustadz allowed these seven on condition they are shown INSIDE a passage ("tampilkan
 * bersama") — a condition one-verse-per-theme retrieval could not meet, so they were withheld:
 * five sit in WITHDRAWN as `condition-unmet`, and 23:60/23:61 were never added at all (the
 * 2026-07-20 fragment review dropped 23:61 as a referent-less fragment). Co-display now exists on
 * every render path, so his condition can be met and his approval holds. This script:
 *
 *   1. Inserts the seven back into PROBLEM_VERSES, each carrying its `codisplay.range` and the
 *      ustadz's REPLACEMENT caption (verdict "ganti") — sourced verbatim from the review record so
 *      the curly-quoted Indonesian is byte-identical to what he wrote, never re-typed.
 *   2. Removes the five `condition-unmet` rows from WITHDRAWN.
 *
 * `why` and `ruling.note` come from docs/review/ustadz-perasaan-2026-07-22.json; `themes`, `range`,
 * and the co-display `note` are fixed here. One-shot and guarded: it refuses to run twice.
 */
export {};

const SRC = "src/review/problem-verses.ts";
const RECORD = "docs/review/ustadz-perasaan-2026-07-22.json";

interface ReviewEntry {
  ref: string;
  replacement: string;
  note: string;
}

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// theme, co-display range, and the reviewer's display condition (verbatim intent) for each verse.
// `anchor` is the theme comment the entry is inserted after; 23:60/23:61 are handled separately
// because they replace a stale "DROPPED" comment rather than joining an existing section.
const PLAN: Record<string, { theme: string; range: [number, number]; condition: string; anchor?: string }> = {
  "41:35": { theme: "Anger", range: [34, 35], condition: "Tampilkan QS 41:34–35 bersama.", anchor: "  // Anger\n" },
  "92:7": { theme: "Laziness", range: [5, 7], condition: "Tampilkan QS 92:5–7 bersama.", anchor: "  // Laziness\n" },
  "20:25": { theme: "StudyStress", range: [25, 28], condition: "Tampilkan bersama QS 20:25–28.", anchor: "  // StudyStress\n" },
  "20:26": { theme: "StudyStress", range: [25, 28], condition: "Tampilkan QS 20:25–28 bersama.", anchor: "  // StudyStress\n" },
  "106:4": { theme: "Homesickness", range: [1, 4], condition: "Harus dibaca bersama QS Quraisy 106:1–4.", anchor: "  // Homesickness\n" },
  "23:60": { theme: "Fear of insincerity", range: [57, 61], condition: "Tampilkan bersama QS 23:57–61 atau minimal 23:60–61." },
  "23:61": { theme: "Fear of insincerity", range: [57, 61], condition: "Tampilkan bersama QS 23:57–61." },
};

const WITHDRAWN_REFS = ["41:35", "92:7", "20:25", "20:26", "106:4"] as const;

const record = (await Bun.file(RECORD).json()) as { verses: ReviewEntry[] };
const byRef = new Map(record.verses.map((v) => [v.ref, v]));

/** One PROBLEM_VERSES entry line. JSON.stringify keeps the ustadz's curly quotes byte-exact. */
function entryLine(ref: string): string {
  const p = PLAN[ref]!;
  const rec = byRef.get(ref) ?? fail(`${ref} not found in ${RECORD}`);
  const [s, a] = ref.split(":").map(Number);
  const why = JSON.stringify(rec.replacement);
  const note = JSON.stringify(rec.note);
  const theme = JSON.stringify(p.theme);
  const cond = JSON.stringify(p.condition);
  return `  { ref: [${s}, ${a}], themes: [${theme}], why: ${why}, ruling: { verdict: "ganti", note: ${note} }, codisplay: { range: [${p.range[0]}, ${p.range[1]}], note: ${cond} } },\n`;
}

let src = await Bun.file(SRC).text();

if (src.includes("ref: [41, 35]")) fail("41:35 already present — this restore has been applied; re-running would double-insert");

// 1. Insert the five section-joining entries after their theme comment.
for (const ref of WITHDRAWN_REFS) {
  const anchor = PLAN[ref]!.anchor!;
  if (!src.includes(anchor)) fail(`anchor not found for ${ref}: ${JSON.stringify(anchor)}`);
  src = src.replace(anchor, anchor + entryLine(ref));
}

// 2. Replace the stale "23:61 DROPPED" comment with a restored note + the two entries.
const dropped = /  \/\/ 23:61 DROPPED[\s\S]*?fragment-review\.md\.\n/;
if (!dropped.test(src)) fail("could not find the 23:61 DROPPED comment block to replace");
const restoredComment =
  '  // 23:60 + 23:61 RESTORED (2026-07-23) on the ustadz\'s 2026-07-22 ruling: ship 23:57–61 as one\n' +
  '  // passage. The referent-less-fragment problem the 2026-07-20 review flagged — 23:61 opens "mereka\n' +
  '  // itulah" pointing at nobody, 23:60 is the trembling heart — is exactly what co-display resolves:\n' +
  '  // both are shown inside 23:57–61, so neither ever stands alone. See docs/review/fragment-review.md.\n';
src = src.replace(dropped, restoredComment + entryLine("23:60") + entryLine("23:61"));

// 3. Remove the five condition-unmet rows from WITHDRAWN.
let removed = 0;
for (const ref of WITHDRAWN_REFS) {
  const row = new RegExp(`  \\{ ref: "${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}", kind: "condition-unmet"[\\s\\S]*?\\},\\n`);
  if (!row.test(src)) fail(`WITHDRAWN row not found for ${ref}`);
  src = src.replace(row, "");
  removed++;
}

if (/kind: "condition-unmet"/.test(src.split("export const WITHDRAWN")[1] ?? "")) {
  fail("condition-unmet rows still remain in WITHDRAWN after removal");
}

await Bun.write(SRC, src);
console.log(`✓ restored 7 verses (${Object.keys(PLAN).join(", ")})`);
console.log(`✓ removed ${removed} condition-unmet rows from WITHDRAWN`);
