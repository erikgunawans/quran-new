#!/usr/bin/env bun
/**
 * Apply Ustadz Ahmad Isrofiel Mardlatillah's review of the feeling corpus into problem-verses.ts.
 *
 *   bun run src/review/apply-ustadz-review.ts [--dry]
 *
 * WHAT THE REVIEW IS. All 147 feeling placements that were live (or proposed) were read to him one
 * by one over the phone; Erik wrote down what he said. He returned a verdict on every one — none
 * deferred: 73 `pas`, 63 `ganti`, 11 `cabut`. The verbatim record is the JSON at RECORD, which is
 * the source this tool reads. Nothing here is paraphrased, and nothing is inferred: where he wrote
 * a replacement sentence it is copied character-for-character into `why`.
 *
 * THE THREE VERDICTS.
 *   pas    — placement and sentence both stand. Only his note is attached.
 *   ganti  — placement stands, OUR sentence does not. His replacement becomes `why`.
 *   cabut  — the verse comes out of the corpus. It was live; "jangan dipakai" means withdraw, not
 *            merely decline to add. That was the promise made to him on the call, in writing.
 *
 * THE FOURTH CASE, WHICH IS NOT ONE OF HIS. Five verses he ALLOWED on an explicit condition we
 * cannot currently meet: display them together with the neighbouring ayat (41:34–35, 92:5–7,
 * 20:25–28, 106:1–4). Retrieval returns exactly one verse per theme, so the condition is
 * architectural, not a to-do. Shipping his new sentence while silently dropping his condition
 * would put his name on an approval he did not give, so those five are withdrawn too — recorded
 * separately in WITHDRAWN as `condition-unmet`, because they come back the day co-display exists.
 * (102:1 is not among them: he offered "display 102:1–2 OR use this sentence", and we take the OR.)
 *
 * SCOPE DISCIPLINE. He reviewed each verse under ONE feeling. Two of the affected verses also sit
 * on a second theme he was never asked about (2:216 and 10:57, both also "Heartbreak"). His ruling
 * is applied to the theme he actually ruled on; extending it would be us making a scholarly
 * judgement in his name. 2:216 therefore loses only its "Confusion facing a big decision"
 * placement and stays on "Heartbreak". 10:57 is the one unavoidable compromise: `why` is a single
 * field shared by both of its themes, so his sentence necessarily replaces the caption everywhere.
 * His sentence is about the verse rather than the feeling, so this is safe — but it is a
 * consequence of the schema, and it is written down here rather than left to be discovered.
 */
import { PROBLEM_VERSES } from "./problem-verses.ts";

const DRY = process.argv.includes("--dry");
const SRC = "src/review/problem-verses.ts";
const RECORD = "docs/review/ustadz-perasaan-2026-07-22.json";
const fail = (m: string): never => { console.error(`✗ ${m}`); process.exit(1); };

/**
 * Allowed only if displayed with neighbouring ayat, which one-verse-per-theme retrieval cannot do.
 * Held back rather than shipped on a half-met condition. Keyed by ref, valued with his condition.
 */
const CONDITION_UNMET: Record<string, string> = {
  "41:35": "ayat 35 berdiri sebagai kelanjutan ayat 34 — minta QS 41:34–35 ditampilkan bersama",
  "106:4": "harus dibaca bersama QS Quraisy 106:1–4",
  "92:7": "bergantung pada syarat di ayat sebelumnya — minta QS 92:5–7 ditampilkan bersama",
  "20:25": "minta ditampilkan bersama QS 20:25–28",
  "20:26": "bagian dari rangkaian doa; minta ditampilkan bersama QS 20:25–28",
};

/** A verse he did not reject outright, but whose placement on ONE theme he ruled against. */
const THEME_ONLY: Record<string, string> = { "2:216": "Confusion facing a big decision" };

interface Entry {
  ref: string; feeling: string; captionShown: string | null;
  verdict: "pas" | "ganti" | "cabut"; note: string; replacement?: string;
}
const record = (await Bun.file(RECORD).json()) as { reviewer: string; verses: Entry[] };
const byRef = new Map(record.verses.map((v) => [v.ref, v]));

// ── verify the corpus still says what he was read ─────────────────────────────────
// If a caption drifted since the call, his ruling was given on text that no longer exists and the
// run must stop. This is the whole reason the sheet stored `captionShown`.
const liveRefs = new Set(PROBLEM_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`));
for (const e of record.verses) {
  const v = PROBLEM_VERSES.find((x) => `${x.ref[0]}:${x.ref[1]}` === e.ref);
  if (!v) continue;
  if (e.captionShown && v.why.trim() !== e.captionShown.trim())
    fail(`${e.ref} drifted since the review.\n  he was read: ${e.captionShown}\n  corpus now : ${v.why}\n  Re-review this verse; do not apply a ruling to text he never saw.`);
  if (e.verdict === "ganti" && !e.replacement)
    fail(`${e.ref} is "ganti" but carries no replacement sentence — refusing to invent one`);
}
for (const ref of [...Object.keys(CONDITION_UNMET), ...Object.keys(THEME_ONLY)])
  if (!liveRefs.has(ref)) fail(`${ref} is named in this tool but is not in the corpus — the tool is stale`);

// ── decide, per corpus line ───────────────────────────────────────────────────────
const withdrawn: { ref: string; kind: string; why: string }[] = [];
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

let src = await Bun.file(SRC).text();
const lines = src.split("\n");
const out: string[] = [];
let removed = 0, reworded = 0, ruled = 0, trimmed = 0;

for (const line of lines) {
  const m = /^\s*\{ ref: \[(\d+), (\d+)\],/.exec(line);
  if (!m) { out.push(line); continue; }
  const ref = `${m[1]}:${m[2]}`;
  const e = byRef.get(ref);
  if (!e) { out.push(line); continue; }

  if (e.verdict === "cabut" && !THEME_ONLY[ref]) {
    withdrawn.push({ ref, kind: "cabut", why: e.note });
    removed++; continue;
  }
  if (CONDITION_UNMET[ref]) {
    withdrawn.push({ ref, kind: "condition-unmet", why: CONDITION_UNMET[ref] });
    removed++; continue;
  }

  let l = line;
  if (THEME_ONLY[ref]) {
    const t = THEME_ONLY[ref];
    if (!l.includes(`"${t}"`)) fail(`${ref} no longer carries the theme "${t}" this tool means to drop`);
    l = l.replace(new RegExp(`"${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",\\s*|,\\s*"${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), "");
    trimmed++;
  }
  if (e.verdict === "ganti") {
    const before = l;
    l = l.replace(/why: "(?:[^"\\]|\\.)*"/, `why: "${esc(e.replacement!)}"`);
    if (l === before) fail(`${ref}: could not rewrite the why field`);
    reworded++;
  }
  // Attach his ruling just before the entry's closing brace, after every existing field.
  l = l.replace(/ \},\s*$/, `, ruling: { verdict: "${e.verdict}", note: "${esc(e.note)}" } },`);
  ruled++;
  out.push(l);
}
src = out.join("\n");

// ── record the withdrawals in the file itself, not only in a commit message ───────
const block = [
  "",
  "/**",
  " * Verses withdrawn on the ustadz's review of 2026-07-22 — kept here so they are not re-proposed.",
  " *",
  " * `cabut` is his own verdict: the placement was wrong and the verse came out of the app. It had",
  " * been live, and he was told plainly on the call that \"jangan dipakai\" would mean withdrawal.",
  " *",
  " * `condition-unmet` is NOT his verdict. He allowed these, conditioned on displaying the",
  " * neighbouring ayat, which one-verse-per-theme retrieval cannot do. They return the day",
  " * co-display exists; until then his condition is unmet and his approval does not hold.",
  " */",
  "export const WITHDRAWN: readonly { readonly ref: string; readonly kind: \"cabut\" | \"condition-unmet\"; readonly why: string }[] = [",
  ...withdrawn.map((w) => `  { ref: "${w.ref}", kind: "${w.kind}", why: "${esc(w.why)}" },`),
  "] as const;",
].join("\n");

if (src.includes("export const WITHDRAWN")) fail("WITHDRAWN already exists — this review has been applied; re-running would double-apply");
src = src.trimEnd() + "\n" + block + "\n";

if (DRY) {
  console.log("— dry run, nothing written —");
} else {
  await Bun.write(SRC, src);
}
console.log(`✓ ${record.reviewer}, ${record.verses.length} verses reviewed`);
console.log(`  withdrawn : ${removed}  (${withdrawn.filter((w) => w.kind === "cabut").length} cabut, ${withdrawn.filter((w) => w.kind === "condition-unmet").length} condition-unmet)`);
console.log(`  reworded  : ${reworded}  (his sentence replaced ours)`);
console.log(`  theme-trim: ${trimmed}`);
console.log(`  rulings   : ${ruled} attached`);
console.log(`  next: bun run app:corpus, then bun test`);
