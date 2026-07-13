import { mkdir } from "node:fs/promises";
import { SURAH_COUNT } from "../domain/canonical.ts";
import { SOURCES, type Source } from "./sources.ts";

export const RAW_DIR = "data/raw";
export const LOCK_PATH = "src/ingest/sources.lock.json";

export type Lockfile = Record<string, { sha256: string; bytes: number; url: string }>;

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readLock(): Promise<Lockfile> {
  const f = Bun.file(LOCK_PATH);
  return (await f.exists()) ? ((await f.json()) as Lockfile) : {};
}

async function getJson(url: string, label: string): Promise<unknown> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/** Bounded concurrency — be a good citizen to the upstream hosts. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

/**
 * Materialize a per-surah API source into ONE deterministic dump.
 *
 * This is what makes a live third-party endpoint pinnable at all: pull all 114 surahs once,
 * serialize in a fixed order, hash the result. Production never touches the upstream host —
 * it reads the checksummed dump. If upstream mutates or disappears, the pin catches it and
 * the build stops. That is the whole answer to "this tafsir is served off someone's box".
 */
async function downloadPerSurah(source: Source): Promise<Uint8Array> {
  const surahs = Array.from({ length: SURAH_COUNT }, (_, i) => i + 1);
  const pages = await mapLimit(surahs, 8, (s) =>
    getJson(source.surahUrl!(s), `${source.id} surah ${s}`),
  );
  const bundle = surahs.map((surah, i) => ({ surah, payload: pages[i] }));
  return new TextEncoder().encode(JSON.stringify(bundle));
}

async function download(source: Source): Promise<Uint8Array> {
  if (source.surahUrl) return downloadPerSurah(source);
  if (!source.url) throw new Error(`source ${source.id}: declares neither url nor surahUrl`);
  const res = await fetch(source.url, { redirect: "follow" });
  if (!res.ok) throw new Error(`fetch failed for ${source.id}: HTTP ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Fetch every source into data/raw/ and verify its sha256 against the lockfile.
 *
 * - Normal run: a checksum mismatch is a HARD FAILURE. Upstream changed, or the
 *   download was corrupted; either way we refuse to build a corpus from it.
 * - `updateLock`: recompute and rewrite the pins. The lockfile diff is the artifact
 *   a human reviews before accepting new upstream bytes.
 */
export async function fetchAll(opts: { updateLock: boolean }): Promise<Lockfile> {
  await mkdir(RAW_DIR, { recursive: true });
  const lock = await readLock();
  const next: Lockfile = {};
  const drift: string[] = [];

  for (const source of SOURCES) {
    const bytes = await download(source);
    const hash = await sha256(bytes);
    const pinned = lock[source.id];

    if (!opts.updateLock && pinned && pinned.sha256 !== hash) {
      drift.push(
        `  ${source.id}\n` +
          `    expected ${pinned.sha256} (${pinned.bytes} bytes)\n` +
          `    received ${hash} (${bytes.byteLength} bytes)`,
      );
    }

    await Bun.write(`${RAW_DIR}/${source.file}`, bytes);
    next[source.id] = {
      sha256: hash,
      bytes: bytes.byteLength,
      url: source.url ?? `${source.surahUrl!(1)} (+113 more, materialized)`,
    };
    const status = pinned ? (pinned.sha256 === hash ? "pinned" : "DRIFT") : "new";
    console.log(`  fetched ${source.file.padEnd(22)} ${String(bytes.byteLength).padStart(9)} B  [${status}]`);
  }

  if (drift.length > 0) {
    throw new Error(
      `Source checksum drift — refusing to ingest.\n\n${drift.join("\n\n")}\n\n` +
        `Upstream content changed. Review the change, then re-pin deliberately:\n` +
        `  bun run ingest:lock`,
    );
  }

  if (opts.updateLock) {
    await Bun.write(LOCK_PATH, JSON.stringify(next, null, 2) + "\n");
    console.log(`  wrote ${LOCK_PATH}`);
  }
  return next;
}
