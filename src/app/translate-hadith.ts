/**
 * Generate Indonesian renderings of the hadith TEXT in the Ṣaḥīḥayn.
 *
 * READ THIS BEFORE RUNNING IT
 * ---------------------------
 * This is a different kind of output from `translate-babs.ts`. A bab title is a chapter heading;
 * this is the Prophet's words as transmitted by al-Bukhārī and Muslim, including the isnād. An
 * unreviewed machine rendering of that is a draft for testing and nothing else — it is badged,
 * it is a sidecar, and it never replaces the Arabic on screen.
 *
 * Erik, 2026-08-10: explicitly a test build, explicitly not for commercial use, with the ustadz
 * review still outstanding. That authorisation is what this file exists under; it is not a licence
 * to present the output as a translation anyone should rely on.
 *
 * SHARDED PER BOOK, NOT ONE FILE
 * ------------------------------
 * 14,736 hadith of Indonesian is roughly 9 MB. `babs.json` can be one file because 4,867 short
 * titles is ~300 KB and the reader needs the whole map to browse; this cannot, because a 9 MB
 * download to read one kitab would break the reader's-bandwidth principle the corpus itself is
 * sharded to respect (ISA § Principles). Output mirrors the corpus exactly:
 *
 *   web/public/hadith-id/<collection>/<book>.json  →  { meta, hadith: { "<n>": "..." } }
 *
 * so a book page fetches only its own translations, next to the shard it already fetches.
 *
 * SCALE
 * -----
 * ~8.3M Arabic characters. At the observed rate this is many hours. It is resumable per book and
 * writes after every batch; killing it costs one batch.
 *
 *   bun run src/app/translate-hadith.ts [--limit N] [--batch N]
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "web/public/hadith";
const OUT_DIR = "web/public/hadith-id";
const INFERENCE = `${process.env["HOME"]}/.claude/PAI/TOOLS/Inference.ts`;

interface Hadith {
  n: number;
  ar: string;
}
interface Shard {
  book: { no: number };
  babs: { hadith: Hadith[] }[];
}
interface OutFile {
  meta: Record<string, unknown>;
  hadith: Record<string, string>;
}

const args = process.argv.slice(2);
const flag = (name: string, dflt: number): number => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : dflt;
};
/** 3, not 6 or 20. These are paragraphs carrying an isnād, and a 6-item batch was measured
 * overrunning the model's output budget mid-record. 3 keeps a full reply inside it. */
const BATCH = flag("batch", 3);
const LIMIT = flag("limit", Number.POSITIVE_INFINITY);

const META = {
  kind: "machine-translation",
  translation: "ai",
  language: "id",
  source: "Ṣaḥīḥ al-Bukhārī & Ṣaḥīḥ Muslim — teks hadis",
  reviewed: false,
  reviewerNeeded: "Ustadz Ahmad Isrofiel Mardlatillah",
  notice:
    "Terjemahan mesin (AI), BELUM ditinjau ulama. Untuk pengujian saja — bukan rujukan, bukan fatwa. Teks Arab di bawahnya adalah yang kanonik.",
  generator: "src/app/translate-hadith.ts",
};

/**
 * Translate one batch of hadith.
 *
 * Delimiter-framed rather than numbered: an isnād contains its own numerals and the model was
 * observed re-numbering inside a rendering, which makes a numbered list unparseable. `###N###` on
 * its own line cannot collide with prose. The returned count is still checked — a short batch is
 * discarded whole rather than written against the wrong hadith numbers.
 */
async function translateBatch(items: Hadith[]): Promise<Map<number, string>> {
  const body = items.map((h) => `###${h.n}###\n${h.ar}`).join("\n\n");
  const prompt = `Terjemahkan setiap hadis berikut ke Bahasa Indonesia yang wajar dan mudah dipahami.
Sertakan sanadnya (rantai perawi) secara ringkas, lalu matan (isi hadis) secara lengkap.
Pertahankan istilah syar'i yang lazim. Jangan menambah tafsir, komentar, atau kesimpulan apa pun.
Setiap hadis dipisahkan penanda ###NOMOR###. Jawab dengan format yang PERSIS sama:
###NOMOR###
<terjemahan>

${body}`;

  const proc = Bun.spawn(["bun", INFERENCE, "standard", prompt], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  await proc.exited;

  const got = new Map<number, string>();
  const parts = text.split(/###(\d+)###/);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const value = (parts[i + 1] ?? "").trim();
    if (Number.isFinite(n) && value) got.set(n, value);
  }

  const wanted = new Set(items.map((h) => h.n));
  for (const k of got.keys()) if (!wanted.has(k)) got.delete(k); // never write a number we did not send

  // PARTIAL BATCHES ARE KEPT — and this is the opposite of the rule in translate-babs.ts, on
  // purpose. There, order carried the identity, so a short reply shifted every later title onto the
  // wrong key and the only safe move was to discard the batch. Here the identity is carried by an
  // explicit `###N###` delimiter, so whatever came back is bound to its own hadith regardless of
  // how many arrived. Long hadith DO overrun the model's output budget — a 6-item batch was
  // truncated and returned 0 usable records under the old rule, throwing away real work. The
  // resumable loop picks the stragglers up on a later pass.
  if (got.size !== items.length) {
    console.warn(`  ~ batch returned ${got.size} of ${items.length} (likely truncated) — keeping what arrived`);
  }
  return got;
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  let budget = LIMIT;
  let totalDone = 0;
  const started = Date.now();

  for (const coll of await readdir(SRC)) {
    let files: string[];
    try {
      files = await readdir(join(SRC, coll));
    } catch {
      continue;
    }
    if (!existsSync(join(OUT_DIR, coll))) await mkdir(join(OUT_DIR, coll), { recursive: true });

    for (const f of files.filter((x) => x.endsWith(".json"))) {
      if (budget <= 0) break;
      const shard = JSON.parse(await readFile(join(SRC, coll, f), "utf8")) as Shard;
      const outPath = join(OUT_DIR, coll, f);
      const out: OutFile = existsSync(outPath)
        ? (JSON.parse(await readFile(outPath, "utf8")) as OutFile)
        : { meta: META, hadith: {} };
      out.meta = META;

      const all = shard.babs.flatMap((b) => b.hadith);
      const pending = all.filter((h) => !out.hadith[String(h.n)]);
      if (!pending.length) continue;

      console.log(`${coll}/${f} — ${pending.length} of ${all.length} to do`);
      for (let i = 0; i < pending.length && budget > 0; i += BATCH) {
        const slice = pending.slice(i, i + BATCH);
        const got = await translateBatch(slice);
        for (const [n, v] of got) out.hadith[String(n)] = v;
        await writeFile(outPath, JSON.stringify(out, null, 1)); // every batch — see the note above
        budget -= slice.length;
        totalDone += slice.length;
        const rate = (Date.now() - started) / 1000 / totalDone;
        console.log(`  ${coll}/${f} ${i + slice.length}/${pending.length} (+${got.size}) · ${rate.toFixed(1)}s/hadis`);
      }
    }
  }
  console.log(`done — ${totalDone} hadith this run`);
}

await main();
