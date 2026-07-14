#!/usr/bin/env bun
/**
 * Build the recitation-audio sample.
 *
 * MVP SCOPE — see `web/src/audio.ts` for the full rationale. Short version: a per-surah file is
 * too big to ship (Al-Baqarah alone measured 115 MB from the same host), so this fetches
 * PER-AYAH files instead, and only for a small, real, working sample — Al-Fatiha plus the three
 * short surahs read at the end of most sessions. Scaling to all 6,236 ayahs is a real ingest run
 * of its own (thousands of individual fetches against a third-party host), not something this
 * script attempts.
 *
 * Source: everyayah.com, Alafasy_64kbps. Sequential, not parallel — a good citizen of a free
 * third-party host, and 22 files does not need concurrency to be fast.
 *
 *   bun run app:audio
 */
import { mkdir } from "node:fs/promises";
import { sha256 } from "../ingest/fetch.ts";

const BASE = "https://everyayah.com/data/Alafasy_64kbps";
const OUT_DIR = "web/public/audio";
const LOCK_PATH = "src/app/audio.lock.json";

/** Al-Fatiha, plus Al-Ikhlas / Al-Falaq / An-Nas — the three short surahs recited at the close
 * of most sessions. Kept in web/src/audio.ts's MANIFEST — this script and that manifest must
 * agree, or hasAudio() would claim a file that doesn't exist. */
const SAMPLE: Record<number, number> = { 1: 7, 112: 4, 113: 5, 114: 6 };

type Lock = Record<string, { sha256: string; bytes: number; url: string }>;

async function readLock(): Promise<Lock> {
  const f = Bun.file(LOCK_PATH);
  return (await f.exists()) ? ((await f.json()) as Lock) : {};
}

async function main(): Promise<void> {
  const lock = await readLock();
  const next: Lock = {};
  const drift: string[] = [];

  for (const [surahStr, ayahCount] of Object.entries(SAMPLE)) {
    const surah = Number(surahStr);
    await mkdir(`${OUT_DIR}/${surah}`, { recursive: true });

    for (let ayah = 1; ayah <= ayahCount; ayah++) {
      const id = `${surah}:${ayah}`;
      const url = `${BASE}/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${res.statusText} — ${url}`);

      const bytes = new Uint8Array(await res.arrayBuffer());
      const hash = await sha256(bytes);
      const pinned = lock[id];

      if (pinned && pinned.sha256 !== hash) {
        drift.push(`  ${id}\n    expected ${pinned.sha256} (${pinned.bytes} B)\n    received ${hash} (${bytes.byteLength} B)`);
      }

      await Bun.write(`${OUT_DIR}/${surah}/${ayah}.mp3`, bytes);
      next[id] = { sha256: hash, bytes: bytes.byteLength, url };
      const status = pinned ? (pinned.sha256 === hash ? "pinned" : "DRIFT") : "new";
      console.log(`  ${id.padEnd(8)} ${String(bytes.byteLength).padStart(8)} B  [${status}]`);
    }
  }

  if (drift.length > 0) {
    throw new Error(
      `Audio checksum drift — refusing to overwrite silently.\n\n${drift.join("\n\n")}\n\n` +
        `Upstream content changed. Review, then delete ${LOCK_PATH} to re-pin deliberately.`,
    );
  }

  await Bun.write(LOCK_PATH, JSON.stringify(next, null, 2) + "\n");
  console.log(`\n  wrote ${LOCK_PATH}`);
  console.log(`  ${Object.keys(next).length} ayahs fetched to ${OUT_DIR}/`);
}

await main();
