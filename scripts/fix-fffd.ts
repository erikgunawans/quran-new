#!/usr/bin/env bun
// Repair U+FFFD ingest corruption in Thalib's Tarjamah Tafsiriyah records.
// Three kinds:
//   apos        — ain/apostrophe ('), unambiguous (already applied earlier).
//   quote-open  — double-quote SPEECH opener (introduced by `: `). → curly “ (U+201C)
//   quote-close — double-quote SPEECH closer (before sentence-end `.` or a straight `"`). → curly ” (U+201D)
//   quote-hold  — anything else, e.g. the single-quote du'a delimiter in 23:28 (opened with a
//                 straight `'`, not a double). The curly-DOUBLE convention Erik supplied does not
//                 apply to it, so it stays HELD pending its own decision.
// Curly-double convention authorized by Erik 2026-08-06 (Thalib uses “ ” for direct speech).
// Operates on the raw file text (no JSON re-serialize) to keep every other byte identical.
// Usage: bun scripts/fix-fffd.ts               (dry-run: list + classify + planned replacement)
//        bun scripts/fix-fffd.ts --apply        (write apostrophe fixes)
//        bun scripts/fix-fffd.ts --apply-quotes (write curly-double quote fixes; holds stay held)

export {}; // module marker so top-level await typechecks under the repo tsconfig

const FILE = "data/canonical/translations.json";
const FFFD = "�";
const LDQUO = "“"; // “
const RDQUO = "”"; // ”
const APPLY = process.argv.includes("--apply");
const APPLY_QUOTES = process.argv.includes("--apply-quotes");

const raw = await Bun.file(FILE).text();
const records: Array<{ id: string; ayah_id: string; text: string; translator: string }> =
  JSON.parse(raw);

type Kind = "apos" | "quote-open" | "quote-close" | "quote-hold";
type Hit = { id: string; ayah: string; idx: number; kind: Kind; ctx: string };
const hits: Hit[] = [];

// Classify a U+FFFD by its immediate context. Deterministic — no heuristics beyond the
// literal neighbours, so every decision is auditable against the printed context.
function classify(text: string, i: number): Kind {
  const prev = text[i - 1] ?? "";
  const prev2 = text.slice(Math.max(0, i - 2), i);
  const next = text[i + 1] ?? "";
  if (/[A-Za-z]/.test(next) && prev2 !== ": ") return "apos"; // ain/apostrophe inside a word
  if (prev2 === ": ") return "quote-open"; // `berfirman: “…` / `Quraisy: “…`
  if (prev === "." || next === '"') return "quote-close"; // `…bersih.”"` — inner close before outer straight quote
  return "quote-hold"; // e.g. 23:28 `…zhalim,�` — single-quote du'a delimiter, distinct convention
}

const replacementFor = (k: Kind): string | null =>
  k === "apos" ? "'" : k === "quote-open" ? LDQUO : k === "quote-close" ? RDQUO : null;

for (const r of records) {
  if (!r.text.includes(FFFD)) continue;
  for (let i = 0; i < r.text.length; i++) {
    if (r.text[i] !== FFFD) continue;
    const kind = classify(r.text, i);
    const ctx = r.text.slice(Math.max(0, i - 18), i) + "⟦" + FFFD + "⟧" + r.text.slice(i + 1, i + 14);
    hits.push({ id: r.id, ayah: r.ayah_id, idx: i, kind, ctx });
  }
}

const label: Record<Kind, string> = {
  "apos": "APOS→'",
  "quote-open": `QUOTE·OPEN→${LDQUO}`,
  "quote-close": `QUOTE·CLOSE→${RDQUO}`,
  "quote-hold": "QUOTE·HOLD",
};
console.log(`Records with U+FFFD: ${new Set(hits.map((h) => h.id)).size} | total U+FFFD: ${hits.length}\n`);
for (const h of hits) console.log(`[${label[h.kind]}] ${h.ayah}  …${h.ctx}…`);

const count = (k: Kind) => hits.filter((h) => h.kind === k).length;
console.log(`\napos: ${count("apos")} | quote-open: ${count("quote-open")} | quote-close: ${count("quote-close")} | quote-hold: ${count("quote-hold")}`);

if (!APPLY && !APPLY_QUOTES) {
  console.log("\nDry-run. --apply writes apostrophe fixes; --apply-quotes writes curly-double quote fixes.");
  process.exit(0);
}

// Which kinds get written this run. Apostrophes and quotes are separate opt-ins so each
// class is applied — and reviewable — on its own. Holds are never written.
const writeKinds = new Set<Kind>([
  ...(APPLY ? (["apos"] as Kind[]) : []),
  ...(APPLY_QUOTES ? (["quote-open", "quote-close"] as Kind[]) : []),
]);

// Surgical replace on RAW text: rebuild each affected record's text string and swap it into
// raw via its exact JSON-escaped occurrence, so every other byte stays identical.
let out = raw;
let applied = 0;
const affected = new Set(hits.filter((h) => writeKinds.has(h.kind)).map((h) => h.id));
for (const r of records) {
  if (!affected.has(r.id)) continue;
  let newText = "";
  for (let i = 0; i < r.text.length; i++) {
    if (r.text[i] === FFFD) {
      const kind = classify(r.text, i);
      const rep = writeKinds.has(kind) ? replacementFor(kind) : null;
      newText += rep ?? FFFD; // unwritten kinds (holds, or the other phase) keep the U+FFFD
    } else {
      newText += r.text[i];
    }
  }
  if (newText === r.text) continue;
  const oldJson = JSON.stringify(r.text);
  const newJson = JSON.stringify(newText);
  const before = out.length;
  out = out.replace(oldJson, newJson);
  if (out.length === before && oldJson.length !== newJson.length) {
    console.error(`FAILED to splice ${r.id} — occurrence not found uniquely`);
    process.exit(1);
  }
  applied++;
}
await Bun.write(FILE, out);
console.log(`\nApplied ${[...writeKinds].join("+")} fixes to ${applied} records. Wrote ${FILE}.`);
