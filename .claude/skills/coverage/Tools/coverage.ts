#!/usr/bin/env bun
/**
 * Generated-content coverage: on disk vs built vs live.
 *
 * These are three different numbers and conflating them has produced two wrong answers. Output under
 * `web/public/` is a gitignored sidecar baked into the static bundle at BUILD time — it does not
 * stream — so a generator can finish thousands of records that no reader can see.
 *
 * Prints BOOK NUMBERS, not just counts: "21 books" was once read as "books 1-21" when the real set
 * was scattered, and anyone acting on that opens a book in the gap and concludes the feature is
 * broken.
 *
 * Live probing keys on CONTENT-TYPE, never status: a missing asset returns 200 text/html via the SPA
 * fallback, so a status check reports every book present.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const PROD = "https://new-quranku.axiara.ai";
const ROOTS = { public: "web/public/hadith-id", dist: "web/dist/hadith-id" } as const;

interface Shard {
  collection: string;
  book: number;
  entries: number;
}

async function scan(root: string): Promise<Shard[]> {
  const out: Shard[] = [];
  let collections;
  try {
    collections = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const c of collections) {
    if (!c.isDirectory()) continue;
    for (const f of await readdir(join(root, c.name))) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(await readFile(join(root, c.name, f), "utf8")) as {
          hadith?: Record<string, string>;
        };
        out.push({
          collection: c.name,
          book: Number(f.replace(".json", "")),
          entries: Object.keys(j.hadith ?? {}).length,
        });
      } catch {
        /* mid-write or malformed — a partial file is not coverage */
      }
    }
  }
  return out;
}

const total = (s: Shard[]): number => s.reduce((n, x) => n + x.entries, 0);
const books = (s: Shard[], c: string): number[] =>
  s.filter((x) => x.collection === c).map((x) => x.book).sort((a, b) => a - b);

/** Live iff the response is really JSON. Status alone is a lie here — see the header. */
async function isLive(collection: string, book: number): Promise<boolean> {
  try {
    const res = await fetch(`${PROD}/hadith-id/${collection}/${book}.json`, { method: "GET" });
    return (res.headers.get("content-type") ?? "").includes("application/json");
  } catch {
    return false;
  }
}

const pub = await scan(ROOTS.public);
const dist = await scan(ROOTS.dist);
const collections = [...new Set([...pub, ...dist].map((s) => s.collection))].sort();

console.log("\nHADITH INDONESIAN — generated content coverage\n");

const checkLive = !process.argv.includes("--no-live");
for (const c of collections) {
  const p = books(pub, c);
  const d = books(dist, c);
  const pe = total(pub.filter((s) => s.collection === c));
  const de = total(dist.filter((s) => s.collection === c));

  let liveCount = -1;
  if (checkLive && d.length) {
    const results = await Promise.all(d.map((b) => isLive(c, b)));
    liveCount = results.filter(Boolean).length;
  }

  console.log(`  ${c}`);
  console.log(`    on disk   ${String(p.length).padStart(3)} books  ${String(pe).padStart(6)} entries`);
  console.log(`    built     ${String(d.length).padStart(3)} books  ${String(de).padStart(6)} entries`);
  if (liveCount >= 0) console.log(`    LIVE      ${String(liveCount).padStart(3)} books  (verified by content-type)`);
  console.log(`    books: ${p.length ? p.join(" ") : "(none)"}`);

  const missing = p.filter((b) => !d.includes(b));
  if (missing.length) console.log(`    ⚠ built but stale — rebuild to include books: ${missing.join(" ")}`);
  if (liveCount >= 0 && liveCount < d.length) console.log(`    ⚠ built but NOT live — deploy (${d.length - liveCount} book(s) missing)`);
  console.log();
}

// A collection at zero is invisible in any averaged percentage, and Bukhari is roughly half the
// corpus — so it is called out by name rather than folded into a total.
for (const c of ["bukhari", "muslim"]) {
  if (!collections.includes(c) || !books(pub, c).length) {
    console.log(`  ⚠ ${c}: NOTHING generated — every card in this collection renders Arabic + English only.\n`);
  }
}

const live = total(dist);
console.log(`  Reader-visible entries (best case, if fully deployed): ${live}`);
console.log(`  Generated on disk:                                    ${total(pub)}`);
console.log(`  Corpus total:                                         14736\n`);
