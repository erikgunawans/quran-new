#!/usr/bin/env bun
/**
 * Build the juz index.
 *
 * The 30 juz are the divisions people actually navigate by — "aku lagi di juz 5" is how a
 * reader describes where they are, and the demo already offers a Juz tab and an audio blurb
 * promising "per Surah atau per Juz". Neither had any data behind it.
 *
 * SOURCE: no new well. `data/raw/quran-data.xml` is already fetched, already sha256-pinned in
 * `src/ingest/sources.lock.json`, and already the source of our surah metadata — it carries 30
 * <juz> elements we simply never parsed. Adding juz costs zero new trust: the same checksum
 * gate that protects the surah names protects these boundaries.
 *
 * WHAT IS AND IS NOT STORED. Only the 30 boundaries are emitted. A per-ayah juz column would
 * be 6,236 entries that can drift out of agreement with the boundaries they were derived from;
 * a lookup over 30 sorted boundaries answers the same question, cannot disagree with itself,
 * and is small enough to inline. See `web/src/juz.ts` for the reader side.
 *
 * The end of each juz is NOT in the file — it is implied by the next juz's start (and 114:6
 * for the last). That inference is the only arithmetic here, and every invariant below exists
 * to catch it being wrong: a juz index that silently mis-slices scripture would send a reader
 * to the wrong page and look like the app's own opinion about where a division falls.
 *
 *   bun run app:juz
 */
import { SURAH_INDEX, TOTAL_AYAHS } from "../../web/src/surah-index.ts";

const RAW = "data/raw/quran-data.xml";
const OUT = "web/public/juz.json";
const INDEX_TS = "web/src/juz-index.ts";

const JUZ_TAG = /<juz\s+([^>]*?)\/>/g;
const ATTR = /(\w+)\s*=\s*"([^"]*)"/g;

interface Ref {
  readonly surah: number;
  readonly ayah: number;
}

interface JuzEntry extends Record<string, unknown> {
  readonly n: number;
  readonly start: Ref;
  readonly end: Ref;
  readonly startSurah: string;
  readonly endSurah: string;
  readonly ayahs: number;
}

function attrs(fragment: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of fragment.matchAll(ATTR)) {
    const [, k, v] = m;
    if (k !== undefined && v !== undefined) out[k] = v;
  }
  return out;
}

function intAttr(a: Record<string, string>, key: string, ctx: string): number {
  const raw = a[key];
  if (raw === undefined || raw === "") throw new Error(`${ctx}: missing attribute "${key}"`);
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`${ctx}: attribute "${key}" is not an integer: ${raw}`);
  return n;
}

/**
 * Absolute ayah position (1..6236), so juz spans that cross surah boundaries are comparable
 * with plain arithmetic. Built from SURAH_INDEX — the same oracle the app uses to decide
 * whether a reference is real, so a juz can never point outside what the app admits exists.
 */
function buildOffsets(): readonly number[] {
  const offsets: number[] = [0, 0]; // index 0 unused; surah 1 starts at absolute 1
  let running = 0;
  for (const s of SURAH_INDEX) {
    offsets[s.n] = running;
    running += s.ayahs;
  }
  if (running !== TOTAL_AYAHS) {
    throw new Error(`surah-index ayah counts sum to ${running}, expected ${TOTAL_AYAHS}`);
  }
  return offsets;
}

function ayahCountOf(surah: number): number {
  const meta = SURAH_INDEX.find((s) => s.n === surah);
  if (meta === undefined) throw new Error(`no surah ${surah} in SURAH_INDEX`);
  return meta.ayahs;
}

function nameOf(surah: number): string {
  const meta = SURAH_INDEX.find((s) => s.n === surah);
  if (meta === undefined) throw new Error(`no surah ${surah} in SURAH_INDEX`);
  return meta.tl;
}

/** Step one ayah back from a juz start to get the previous juz's last ayah. */
function previousRef(ref: Ref): Ref {
  if (ref.ayah > 1) return { surah: ref.surah, ayah: ref.ayah - 1 };
  const prevSurah = ref.surah - 1;
  if (prevSurah < 1) throw new Error("cannot step back before 1:1");
  return { surah: prevSurah, ayah: ayahCountOf(prevSurah) };
}

function parseStarts(xml: string): readonly Ref[] {
  const starts: Ref[] = [];
  let expected = 1;

  for (const match of xml.matchAll(JUZ_TAG)) {
    const fragment = match[1];
    if (fragment === undefined) continue;
    const a = attrs(fragment);
    const ctx = `juz index=${a["index"] ?? "?"}`;

    const index = intAttr(a, "index", ctx);
    if (index !== expected) throw new Error(`${ctx}: out of order, expected index ${expected}`);
    expected += 1;

    const surah = intAttr(a, "sura", ctx);
    const ayah = intAttr(a, "aya", ctx);
    if (surah < 1 || surah > 114) throw new Error(`${ctx}: surah ${surah} out of range`);
    const bound = ayahCountOf(surah);
    if (ayah < 1 || ayah > bound) throw new Error(`${ctx}: ayah ${ayah} outside surah ${surah} (1-${bound})`);

    starts.push({ surah, ayah });
  }

  if (starts.length !== 30) throw new Error(`quran-data.xml: expected 30 <juz> entries, found ${starts.length}`);
  return starts;
}

async function main(): Promise<void> {
  const xml = await Bun.file(RAW).text();
  const offsets = buildOffsets();
  const starts = parseStarts(xml);

  const abs = (r: Ref): number => (offsets[r.surah] ?? 0) + r.ayah;

  // Juz 1 must open the Qur'an; anything else means we mis-parsed the file entirely.
  const first = starts[0];
  if (first === undefined || first.surah !== 1 || first.ayah !== 1) {
    throw new Error(`juz 1 must start at 1:1, got ${first?.surah}:${first?.ayah}`);
  }

  const lastSurah = 114;
  const lastRef: Ref = { surah: lastSurah, ayah: ayahCountOf(lastSurah) };

  const juz: JuzEntry[] = starts.map((start, i) => {
    const nextStart = starts[i + 1];
    const end = nextStart === undefined ? lastRef : previousRef(nextStart);
    const ayahs = abs(end) - abs(start) + 1;
    if (ayahs <= 0) throw new Error(`juz ${i + 1}: non-positive span (${ayahs})`);
    return {
      n: i + 1,
      start,
      end,
      startSurah: nameOf(start.surah),
      endSurah: nameOf(end.surah),
      ayahs,
    };
  });

  // Strictly increasing, and the 30 spans must tile the whole Qur'an with no gap or overlap.
  for (let i = 1; i < juz.length; i++) {
    const prev = juz[i - 1];
    const cur = juz[i];
    if (prev === undefined || cur === undefined) throw new Error("juz array hole");
    if (abs(cur.start) !== abs(prev.end) + 1) {
      throw new Error(
        `juz ${cur.n} starts at ${cur.start.surah}:${cur.start.ayah} but juz ${prev.n} ends at ` +
          `${prev.end.surah}:${prev.end.ayah} — the spans do not tile`,
      );
    }
  }

  const covered = juz.reduce((sum, j) => sum + j.ayahs, 0);
  if (covered !== TOTAL_AYAHS) {
    throw new Error(`juz spans cover ${covered} ayahs, expected ${TOTAL_AYAHS}`);
  }

  const payload = {
    source: "Tanzil.net — Qur'an metadata (quran-data.xml), sha256-pinned in src/ingest/sources.lock.json",
    total_ayahs: TOTAL_AYAHS,
    juz,
  };

  await Bun.write(OUT, `${JSON.stringify(payload, null, 2)}\n`);

  // Also inlined into the bundle, for the same reason surah-index.ts is: "which juz am I in"
  // is a navigation primitive, and making it await a fetch would push async through every
  // caller to save under a kilobyte gzipped.
  const rows = juz
    .map(
      (j) =>
        `  { n: ${j.n}, s: ${j.start.surah}, a: ${j.start.ayah}, es: ${j.end.surah}, ea: ${j.end.ayah}, ` +
        `ayahs: ${j.ayahs}, from: ${JSON.stringify(j.startSurah)}, to: ${JSON.stringify(j.endSurah)} },`,
    )
    .join("\n");

  await Bun.write(
    INDEX_TS,
    `// GENERATED by \`bun run app:juz\` — do not edit.\n` +
      `//\n` +
      `// The 30 juz boundaries, from Tanzil's quran-data.xml (sha256-pinned). Inlined rather than\n` +
      `// fetched so "which juz is this ayah in" needs no network. Only starts and ends are stored;\n` +
      `// per-ayah juz numbers are derived in juz.ts so the two can never disagree.\n\n` +
      `export interface JuzSpan {\n` +
      `  /** Juz number, 1-30. */\n` +
      `  readonly n: number;\n` +
      `  /** First ayah of the juz. */\n` +
      `  readonly s: number;\n` +
      `  readonly a: number;\n` +
      `  /** Last ayah of the juz. */\n` +
      `  readonly es: number;\n` +
      `  readonly ea: number;\n` +
      `  readonly ayahs: number;\n` +
      `  readonly from: string;\n` +
      `  readonly to: string;\n` +
      `}\n\n` +
      `export const JUZ: readonly JuzSpan[] = [\n${rows}\n];\n`,
  );

  console.log(`juz: 30 spans, ${covered} ayahs, tiled and verified → ${OUT} + ${INDEX_TS}`);
}

await main();
