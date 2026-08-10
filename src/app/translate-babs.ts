/**
 * Generate Indonesian renderings of the bab (chapter) titles in the Ṣaḥīḥayn.
 *
 * WHY THIS IS A SIDECAR, NOT AN EDIT
 * ----------------------------------
 * Output goes to `web/public/hadith-id/babs.json`, NEVER into the shards under
 * `web/public/hadith/`. Those shards are the canonical Arabic corpus, and machine output must not
 * be mixed into the thing it is a translation OF — that is the whole difference between displaying
 * someone's scholarship and quietly rewriting it. Keeping it in a separate file also means the
 * entire AI layer can be deleted with `rm` if the ustadz rejects it, with no risk of a partial
 * revert leaving edited scripture behind.
 *
 * WHAT IT PRODUCES
 * ----------------
 * `{ "meta": {...}, "babs": { "<coll>/<book>/<bab>": "Bab ..." } }`
 *
 * The meta block records that this is unreviewed machine output and who still has to review it.
 * `sections.ts` reads that meta to render the provenance banner — the label is data, not a string
 * duplicated in the UI, so it cannot drift out of sync with what was actually generated.
 *
 * RESUMABLE BY DESIGN
 * -------------------
 * ~4,867 titles at 20 per request is ~245 requests and over an hour of wall clock. Any run can be
 * interrupted; re-running skips everything already present in the output file and continues. That
 * is also why the file is written after EVERY batch rather than at the end — an hour of work must
 * never be lost to one failed request.
 *
 * Erik, 2026-08-10: "anything that's here in Arabic, please generate an AI translation" — for a
 * test build, explicitly not for commercial use.
 *
 *   bun run src/app/translate-babs.ts [--limit N] [--batch N]
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "web/public/hadith";
const OUT_DIR = "web/public/hadith-id";
const OUT = join(OUT_DIR, "babs.json");
const INFERENCE = `${process.env["HOME"]}/.claude/PAI/TOOLS/Inference.ts`;

interface Bab {
  no: number;
  ar: string;
}
interface Shard {
  collection: string;
  book: { no: number };
  babs: Bab[];
}
interface Out {
  meta: Record<string, unknown>;
  babs: Record<string, string>;
}

const args = process.argv.slice(2);
const flag = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
const BATCH = flag("batch", 20);
const LIMIT = flag("limit", Number.POSITIVE_INFINITY);

/** Every bab in the corpus, as `key → Arabic`. */
async function collectBabs(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const coll of await readdir(SRC)) {
    const dir = join(SRC, coll);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue; // index.json and friends are not directories
    }
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      const shard = JSON.parse(await readFile(join(dir, f), "utf8")) as Shard;
      for (const b of shard.babs ?? []) {
        out.set(`${coll}/${shard.book.no}/${b.no}`, b.ar);
      }
    }
  }
  return out;
}

/**
 * Translate one batch.
 *
 * Numbered in, numbered out, and the count is CHECKED. A model that drops or merges a line would
 * otherwise shift every subsequent title onto the wrong key — silently, and in a way no test would
 * catch because every value would still be a plausible Indonesian sentence. A mismatched batch is
 * discarded whole rather than written misaligned.
 */
async function translateBatch(items: { key: string; ar: string }[]): Promise<Map<string, string>> {
  const numbered = items.map((it, i) => `${i + 1}. ${it.ar}`).join("\n");
  const prompt = `Terjemahkan setiap judul bab hadis berikut ke Bahasa Indonesia yang wajar dan ringkas.
Pertahankan istilah syar'i yang lazim (wudu, khamar, wala', dsb) apa adanya.
Jawab HANYA daftar bernomor, satu baris per judul, tanpa penjelasan apa pun.

${numbered}`;

  const proc = Bun.spawn(["bun", INFERENCE, "fast", prompt], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s/.test(l));

  if (lines.length !== items.length) {
    console.warn(`  ! batch returned ${lines.length} of ${items.length} lines — discarded`);
    return new Map();
  }

  const got = new Map<string, string>();
  lines.forEach((l, i) => {
    const value = l.replace(/^\d+\.\s*/, "").trim();
    if (value) got.set(items[i]!.key, value);
  });
  return got;
}

async function main(): Promise<void> {
  const all = await collectBabs();
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const out: Out = existsSync(OUT)
    ? (JSON.parse(await readFile(OUT, "utf8")) as Out)
    : { meta: {}, babs: {} };

  out.meta = {
    kind: "machine-translation",
    translation: "ai",
    language: "id",
    source: "Ṣaḥīḥ al-Bukhārī & Ṣaḥīḥ Muslim — judul bab",
    reviewed: false,
    reviewerNeeded: "Ustadz Ahmad Isrofiel Mardlatillah",
    notice:
      "Terjemahan mesin (AI), belum ditinjau ulama. Judul bab saja — teks hadis tetap Arab. Untuk pengujian, bukan rujukan.",
    generator: "src/app/translate-babs.ts",
  };

  const pending = [...all.entries()]
    .filter(([k]) => !out.babs[k])
    .slice(0, LIMIT)
    .map(([key, ar]) => ({ key, ar }));

  console.log(`${all.size} babs total · ${Object.keys(out.babs).length} already done · ${pending.length} to do`);

  const started = Date.now();
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const got = await translateBatch(slice);
    for (const [k, v] of got) out.babs[k] = v;

    // Written every batch, never only at the end — see the resumability note above.
    await writeFile(OUT, JSON.stringify(out, null, 1));

    const done = i + slice.length;
    const rate = (Date.now() - started) / 1000 / done;
    const left = Math.round(((pending.length - done) * rate) / 60);
    console.log(`  ${done}/${pending.length} (+${got.size})  ~${left} min left`);
  }

  console.log(`done — ${Object.keys(out.babs).length} titles in ${OUT}`);
}

await main();
