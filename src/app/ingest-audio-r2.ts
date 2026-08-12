#!/usr/bin/env bun
/**
 * Full-corpus recitation ingest — everyayah.com -> Cloudflare R2.
 *
 * WHY THIS IS SEPARATE FROM `build-audio.ts`. That script builds the 22-ayah MVP sample into
 * `web/public/audio/`, where Workers static assets serve it. ISA.md's 2026-07-14 entry closed that
 * ruling with "not the full 6,236-ayah corpus — that scale of ingest is a separate future run".
 * This is that run, and it does not touch the sample, its lock, or its manifest: the sample keeps
 * working from static assets exactly as it does today while this fills the bucket underneath.
 *
 * WHY R2 AND NOT `web/public/`. Measured 2026-08-12: nine ayahs sampled off everyayah average
 * 218 KB, and that sample is skewed high (it includes 2:282 at 1.1 MB and Ayat al-Kursi at 406 KB),
 * so the full corpus is under a gigabyte but of that order. That does not belong in git, and it
 * should not ride in the assets bundle. R2 keys mirror the URL the player already requests —
 * `{surah}/{ayah}.mp3` — so `web/src/audio.ts` needs no change when the Worker route lands.
 *
 * RIGHTS. Source and reciter are unchanged from Erik's 2026-07-14 ruling: self-hosted, Alafasy.
 * The everyayah licence is UNVERIFIED and recorded as such in `web/src/audio.ts`; this run changes
 * the SCALE of an accepted risk, not its nature, and the ISA anticipated the scale explicitly.
 * It does NOT introduce the-quran-project's mirror, which declares no licence at all.
 *
 * POLITENESS AND RESUMABILITY. Downloads are sequential against a free third-party host, with a
 * pause between each. Uploads run concurrently because they hit Cloudflare, not everyayah. Every
 * completed ayah is journalled, so a kill at hour three costs nothing — rerun and it resumes.
 *
 *   bun run src/app/ingest-audio-r2.ts            # whole corpus, resumable
 *   bun run src/app/ingest-audio-r2.ts 1 2 36     # only these surahs (smoke test)
 */
import { mkdir } from "node:fs/promises";
import { sha256 } from "../ingest/fetch.ts";

const BASE = "https://everyayah.com/data/Alafasy_64kbps";
const BUCKET = "new-quranku-audio";
/** Gitignored. Staging only — R2 is the system of record once an object lands. */
const STAGE = "data/audio";
const JOURNAL = "data/audio/ingest.journal.json";

/** Concurrent `wrangler r2 object put` processes. Each costs ~2.5s of CLI startup, so this is the
 * difference between a four-hour run and a forty-minute one. Kept modest: these are child
 * processes, and the download side deliberately stays sequential regardless. */
const UPLOAD_CONCURRENCY = 6;
/** Pause between everyayah requests. Good-citizen pacing, not rate-limit avoidance. */
const FETCH_PAUSE_MS = 120;

type Journal = Record<string, { sha256: string; bytes: number }>;

const readJournal = async (): Promise<Journal> => {
  const f = Bun.file(JOURNAL);
  return (await f.exists()) ? ((await f.json()) as Journal) : {};
};

/** Authoritative ayah counts come from the corpus this app already ships, never from a hardcoded
 * table — a table would be one more thing that can silently disagree with the reader's surah page. */
async function ayahCount(surah: number): Promise<number> {
  const d = (await Bun.file(`web/public/surah/${surah}.json`).json()) as { ayahs?: number };
  const n = d.ayahs;
  if (typeof n !== "number" || n < 1) throw new Error(`surah ${surah}: no ayah count in surah/${surah}.json`);
  return n;
}

const pad3 = (n: number) => String(n).padStart(3, "0");

/** One `wrangler r2 object put`. Returns stderr on failure so the caller can report, not guess. */
function upload(key: string, file: string): Promise<{ ok: boolean; err: string }> {
  return new Promise((resolve) => {
    // NO `--remote`: that flag is wrangler v4. On the v3.114 pinned here it is a hard
    // `Unknown argument` failure, and remote is already the default — `--local` is the opt-in.
    // A recitation file never changes once published, so it is cached immutably.
    const p = Bun.spawn(
      ["bunx", "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
       `--file=${file}`, "--content-type=audio/mpeg",
       "--cache-control=public, max-age=31536000, immutable"],
      { cwd: "worker", stdout: "ignore", stderr: "pipe" },
    );
    p.exited.then(async (code) => {
      resolve({ ok: code === 0, err: code === 0 ? "" : await new Response(p.stderr).text() });
    });
  });
}

async function main() {
  const argv = process.argv.slice(2).map(Number).filter((n) => n >= 1 && n <= 114);
  const surahs = argv.length > 0 ? argv : Array.from({ length: 114 }, (_, i) => i + 1);

  await mkdir(STAGE, { recursive: true });
  const journal = await readJournal();
  const already = Object.keys(journal).length;
  console.log(`ingest -> r2://${BUCKET}`);
  console.log(`surahs: ${argv.length > 0 ? surahs.join(",") : "1-114"} | already journalled: ${already}`);

  let done = 0, skipped = 0, failed = 0, bytes = 0;
  /** In-flight uploads. Downloads stay ahead of uploads by at most UPLOAD_CONCURRENCY. */
  const inflight = new Map<string, Promise<void>>();

  const drainTo = async (n: number) => {
    while (inflight.size > n) await Promise.race(inflight.values());
  };

  for (const surah of surahs) {
    const count = await ayahCount(surah);
    await mkdir(`${STAGE}/${surah}`, { recursive: true });

    for (let ayah = 1; ayah <= count; ayah++) {
      const id = `${surah}:${ayah}`;
      if (journal[id]) { skipped++; continue; }

      const url = `${BASE}/${pad3(surah)}${pad3(ayah)}.mp3`;
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        console.error(`\n  ${id} FETCH ${res.status} ${url}`);
        failed++;
        continue;
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const hash = await sha256(buf);
      const path = `${STAGE}/${surah}/${ayah}.mp3`;
      await Bun.write(path, buf);
      bytes += buf.byteLength;

      await drainTo(UPLOAD_CONCURRENCY - 1);
      const task = upload(`${surah}/${ayah}.mp3`, `../${path}`).then(async ({ ok, err }) => {
        if (!ok) { failed++; console.error(`\n  ${id} UPLOAD FAILED: ${err.trim().split("\n").pop()}`); }
        else {
          done++;
          journal[id] = { sha256: hash, bytes: buf.byteLength };
          // Journal after every object, not at the end: a run killed at hour three must cost nothing.
          await Bun.write(JOURNAL, JSON.stringify(journal));
        }
        inflight.delete(id);
      });
      inflight.set(id, task);

      if (done % 25 === 0) {
        process.stdout.write(`\r  ${surah}:${ayah} | up ${done} skip ${skipped} fail ${failed} | ${(bytes / 1048576).toFixed(0)} MB  `);
      }
      await Bun.sleep(FETCH_PAUSE_MS);
    }
  }

  await drainTo(0);
  console.log(`\n\nuploaded ${done} | skipped ${skipped} | failed ${failed} | ${(bytes / 1048576).toFixed(1)} MB fetched`);
  console.log(`journal: ${JOURNAL} (${Object.keys(journal).length} objects)`);
  if (failed > 0) { console.error("FAILURES ABOVE — rerun to retry only what is missing."); process.exit(1); }
}

await main();
