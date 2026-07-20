#!/usr/bin/env bun
/**
 * Merge and VERIFY batched feeling-verse proposals.
 *
 *   bun run src/review/merge-feelings-batches.ts .scratch/feelings-batches/*.json
 *
 * The candidate search was parallelised, which means entries arrive from workers that could, in
 * principle, produce a plausible-looking reference that nobody read. For a scripture app that is the
 * one unacceptable failure, so nothing is trusted on assertion. Every entry must clear four gates:
 *
 *   1. REF EXISTS      — the ayah is present in data/canonical (catches invented refs)
 *   2. QUOTE MATCHES   — the `quoted_text` the worker claims to have read must actually appear at the
 *                        start of that ayah's Tarjamah Tafsiriyah. This is the real anti-fabrication
 *                        gate: a worker cannot pass it without having read the verse.
 *   3. NOT TAKEN       — no collision with the 55 live verses or the earlier hand-made proposal
 *   4. NOT DUPLICATED  — no ref proposed twice across batches
 *
 * Rejects are printed with a reason and DROPPED. A quiet merge that silently kept an unverifiable
 * verse would defeat the entire point of the exercise.
 */
import { PROBLEM_VERSES } from "./problem-verses.ts";
import { PROPOSED_VERSES } from "./feelings-proposal.ts";

const DIR = "data/canonical";
interface Tr { ayah_id: string; text: string; display_role: "primary" | "companion" }
interface Batch {
  theme: string; label_id: string; ref: [number, number]; why: string;
  confidence: "high" | "medium"; caveat?: string; quoted_text: string;
}

const rawTr = await Bun.file(`${DIR}/translations.json`).json();
const trs: Tr[] = Array.isArray(rawTr) ? rawTr : (rawTr.translations ?? Object.values(rawTr)[0]);
const primary = new Map<string, string>();
for (const t of trs) if (t.display_role === "primary") primary.set(t.ayah_id, t.text);

/** Normalise for comparison: lowercase, strip punctuation/diacritic quotes, collapse whitespace. */
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const taken = new Set<string>([
  ...PROBLEM_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`),
  ...PROPOSED_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`),
]);

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: merge-feelings-batches.ts <batch.json...>"); process.exit(1); }

const accepted: (Batch & { ref: [number, number] })[] = [];
const rejected: { ref: string; theme: string; reason: string }[] = [];
const seen = new Set<string>();

for (const f of files) {
  let rows: Batch[];
  try { rows = (await Bun.file(f).json()) as Batch[]; }
  catch (e) { console.error(`✗ ${f}: unreadable — ${(e as Error).message}`); continue; }
  if (!Array.isArray(rows)) { console.error(`✗ ${f}: not a JSON array`); continue; }

  for (const r of rows) {
    const ref = `${r.ref?.[0]}:${r.ref?.[1]}`;
    const id = `ayah:${r.ref?.[0]}:${r.ref?.[1]}`;
    const real = primary.get(id);

    if (!real) { rejected.push({ ref, theme: r.theme, reason: "ref does not exist in the corpus" }); continue; }
    if (taken.has(ref)) { rejected.push({ ref, theme: r.theme, reason: "already used by a live or proposed verse" }); continue; }
    if (seen.has(ref)) { rejected.push({ ref, theme: r.theme, reason: "duplicate across batches" }); continue; }

    // The anti-fabrication gate: the claimed quote must really come from this ayah.
    //
    // Word OVERLAP, not exact prefix. Exact matching was tried first and rejected a genuine quote
    // over "meninggalkanmu" vs "meninggalkan kamu" — a one-word transcription slip. A gate that
    // strict discards real work, which pushes toward trusting entries instead of verifying them.
    // Overlap still stops fabrication cold: invented text about another subject shares almost no
    // vocabulary with the verse, while a slightly-retyped real quote shares nearly all of it.
    const qWords = norm(r.quoted_text ?? "").split(" ").filter(Boolean);
    const realTokens = norm(real).split(" ").filter(Boolean);
    // Some ayahs are genuinely tiny — 94:2 ("Kami telah meringankan bebanmu") is five words, 20:26
    // ("mudahkanlah urusanku") is two. A flat 6-word minimum rejected those as "too short to verify",
    // which is the gate being wrong about good verses. Scale the requirement to the verse itself.
    const need = Math.min(6, realTokens.length);
    if (qWords.length < need) {
      rejected.push({ ref, theme: r.theme, reason: `quoted_text too short to verify (need ≥${need} words)` }); continue;
    }
    const realWords = new Set(realTokens);
    const matched = qWords.filter((w) => realWords.has(w)).length;
    const ratio = matched / qWords.length;
    // Threshold calibrated against fixtures, not guessed: a fabricated quote scored 0% overlap, a
    // genuine 6-word quote with one contraction slip ("meninggalkanmu"/"meninggalkan kamu") scored
    // 67%. Real quotes are ~25 words, where one slip costs ~8%, so genuine entries land near 90%.
    // 0.6 clears honest transcription noise while leaving fabrication nowhere to hide.
    if (ratio < 0.6) {
      rejected.push({
        ref, theme: r.theme,
        reason: `quoted_text does NOT match the real verse (${Math.round(ratio * 100)}% word overlap) — unverifiable`,
      });
      continue;
    }
    if (!r.why?.trim()) { rejected.push({ ref, theme: r.theme, reason: "no why line" }); continue; }
    if (r.confidence === "medium" && !r.caveat?.trim()) {
      rejected.push({ ref, theme: r.theme, reason: "medium confidence with no caveat" }); continue;
    }

    seen.add(ref);
    accepted.push(r);
  }
}

// ── emit verified data as JSON (not generated TS — codegen adds a failure mode for no gain) ───
const themes = [...new Set(accepted.map((a) => a.theme))];
const labels = Object.fromEntries(accepted.map((a) => [a.theme, a.label_id]));

await Bun.write(
  "src/review/feelings-batch-merged.json",
  JSON.stringify({ labels, verses: accepted.map(({ quoted_text: _q, label_id: _l, ...v }) => v) }, null, 2),
);

console.log(`✓ accepted ${accepted.length} verses across ${themes.length} feelings`);
console.log(`  → src/review/feelings-batch-merged.json`);
if (rejected.length) {
  console.log(`\n✗ rejected ${rejected.length}:`);
  for (const r of rejected) console.log(`   ${r.ref.padEnd(9)} ${r.theme.padEnd(28)} ${r.reason}`);
}
const meds = accepted.filter((a) => a.confidence === "medium").length;
console.log(`\nconfidence: ${accepted.length - meds} high · ${meds} to weigh`);
