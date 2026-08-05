#!/usr/bin/env bun
// Repair U+FFFD ingest corruption in Thalib's Tarjamah Tafsiriyah records.
// Two kinds: apostrophe/ain (') — unambiguous — and speech-quote delimiters — HELD.
// Operates on the raw file text (no JSON re-serialize) to keep every other byte identical.
// Usage: bun scripts/fix-fffd.ts        (dry-run: list + classify)
//        bun scripts/fix-fffd.ts --apply (write apostrophe fixes only)

export {}; // module marker so top-level await typechecks under the repo tsconfig

const FILE = "data/canonical/translations.json";
const FFFD = "�";
const APPLY = process.argv.includes("--apply");

const raw = await Bun.file(FILE).text();
const records: Array<{ id: string; ayah_id: string; text: string; translator: string }> =
  JSON.parse(raw);

type Hit = { id: string; ayah: string; idx: number; kind: "apos" | "quote"; ctx: string };
const hits: Hit[] = [];

// A U+FFFD is an ain/apostrophe ONLY if a letter immediately follows it AND it is not
// a `: ` speech-opener. Everything else (openers `: �`, closers `.�"` / `,�`) is a quote
// delimiter and is HELD — restoring those needs the source convention we don't have.
function classify(text: string, i: number): "apos" | "quote" {
  const prev2 = text.slice(Math.max(0, i - 2), i);
  const next = text[i + 1] ?? "";
  const nextIsLetter = /[A-Za-z]/.test(next);
  const isColonOpener = prev2 === ": ";
  return nextIsLetter && !isColonOpener ? "apos" : "quote";
}

for (const r of records) {
  if (!r.text.includes(FFFD)) continue;
  for (let i = 0; i < r.text.length; i++) {
    if (r.text[i] !== FFFD) continue;
    const kind = classify(r.text, i);
    const ctx = r.text.slice(Math.max(0, i - 18), i) + "⟦" + FFFD + "⟧" + r.text.slice(i + 1, i + 14);
    hits.push({ id: r.id, ayah: r.ayah_id, idx: i, kind, ctx });
  }
}

console.log(`Records with U+FFFD: ${new Set(hits.map((h) => h.id)).size} | total U+FFFD: ${hits.length}\n`);
for (const h of hits) {
  console.log(`[${h.kind === "apos" ? "APOS→'" : "QUOTE·HOLD"}] ${h.ayah}  …${h.ctx}…`);
}

const aposCount = hits.filter((h) => h.kind === "apos").length;
const quoteCount = hits.filter((h) => h.kind === "quote").length;
console.log(`\nApostrophe (will fix): ${aposCount} | Quote (held): ${quoteCount}`);

if (!APPLY) {
  console.log("\nDry-run. Re-run with --apply to write apostrophe fixes.");
  process.exit(0);
}

// Apply: surgical replace on RAW text. For each apos-type record, replace only the
// apostrophe U+FFFDs, leaving quote U+FFFDs intact. We rebuild each affected record's
// text string and swap it into raw via its exact JSON-escaped occurrence.
let out = raw;
let applied = 0;
const affected = new Set(hits.filter((h) => h.kind === "apos").map((h) => h.id));
for (const r of records) {
  if (!affected.has(r.id)) continue;
  // Build new text: replace apos U+FFFDs with ', keep quote U+FFFDs.
  let newText = "";
  for (let i = 0; i < r.text.length; i++) {
    if (r.text[i] === FFFD) {
      newText += classify(r.text, i) === "apos" ? "'" : FFFD;
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
console.log(`\nApplied apostrophe fixes to ${applied} records. Wrote ${FILE}.`);
