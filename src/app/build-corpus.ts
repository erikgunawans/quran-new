#!/usr/bin/env bun
/**
 * Build the browser corpus.
 *
 * THE SHARD ARCHITECTURE
 * ----------------------
 * The full corpus is ~230MB and the tafsir alone is 113MB — none of it goes near a phone
 * on 4G. But the previous build shipped only 55 curated verses, which meant Nur told users
 * that real ayahs did not exist. That is the trust-destroying failure for a scripture app.
 *
 * The fix is not "ship all 4MB". It is to notice that **you do not need a verse's text to
 * know the verse is real.** So we emit three artifacts:
 *
 *   1. surah-index.ts  — 114 surahs + ayah counts, INLINED into the JS bundle (~10KB).
 *                        This is the truth oracle. It answers "is 18:10 real?" with zero
 *                        network, offline, on a dead connection. Honesty costs nothing.
 *   2. surah/{n}.json  — one shard per surah: Arabic + both renderings. Median 33KB,
 *                        worst case Al-Baqarah at ~290KB. Fetched only when read.
 *   3. corpus.json     — the chat hot path, unchanged: curated verses WITH tafsir attached.
 *
 * Tafsir never enters a shard. It stays server-side, as the spec requires.
 *
 *   bun run app:corpus
 */
import type { Translation } from "../domain/canonical.ts";
import type { TafsirPassage, TafsirSource } from "../domain/interpretive.ts";
import { PROBLEM_VERSES } from "../review/problem-verses.ts";

const DIR = "data/canonical";
const OUT_DIR = "web/public";
const SHARD_DIR = `${OUT_DIR}/surah`;
const INDEX_TS = "web/src/surah-index.ts";
// NOT under data/ — that whole tree is gitignored, and this file is the artifact Erik has to
// actually act on. A review queue that vanishes on a clean checkout is not a review queue.
const REVIEW_OUT = "docs/review/divergence.json";

const load = async <T>(n: string): Promise<T[]> => Bun.file(`${DIR}/${n}`).json();

interface Ayah {
  id: string;
  surah_number: number;
  ayah_number: number;
  text_uthmani: string;
}
interface Surah {
  number: number;
  name_ar: string;
  name_translit: string;
  name_en: string;
  ayah_count: number;
  revelation_type: string;
  /** Sequence the surah was revealed in, 1-114 — not its position in the mushaf. */
  order_revealed: number;
}

const ayahs = await load<Ayah>("ayahs.json");
const translations = await load<Translation>("translations.json");
const passages = await load<TafsirPassage>("tafsir-passages.json");
const sources = await load<TafsirSource>("tafsir-sources.json");
const surahs = await load<Surah>("surahs.json");

const fail = (msg: string): never => {
  throw new Error(`✗ gate failed: ${msg}`);
};

// ── the basmalah ─────────────────────────────────────────────────────────────
//
// Tanzil PREPENDS the basmalah to ayah 1 of every surah except At-Tawbah (9). That is a
// property of the source text, not of the ayah: Al-Baqarah 2:1 is `الٓمٓ` — the basmalah in
// front of it is an opening, not part of the verse. Shipping it as ayah 1 renders 112 surahs
// textually wrong, and every Muslim reader sees it immediately.
//
// Two exceptions the strip must respect:
//   - Surah 1 (Al-Faatiha): the basmalah IS ayah 1. Never strip.
//   - Surah 9 (At-Tawbah):  there is no basmalah at all. Nothing to strip.
//   - 27:30 contains the basmalah INSIDE the verse (Sulaiman's letter to Bilqis) — which is
//     why the strip is leading-only and only ever applied to ayah 1.
//
// The prefix is DERIVED from the data rather than hardcoded: a hand-typed Arabic literal is
// a Unicode-normalization landmine (ٱ U+0671 vs ا U+0627, superscript alef U+0670).
//
// Matching is on the CONSONANTAL SKELETON, not the exact bytes. Surahs 95 and 97 carry a
// spurious shadda on the bā (`بِّسْمِ`, U+0628 U+0651 U+0650) — an artifact present in some
// Uthmani editions. Diacritics vary across renderings of this text; the letters do not. So we
// compare bare forms and slice the raw string by word count.
const first = (s: number) => ayahs.find((a) => a.surah_number === s && a.ayah_number === 1) ?? fail(`no ayah ${s}:1`);

/** Drop Arabic diacritics + tatweel, leaving the consonantal skeleton. */
const bare = (s: string) => s.replace(/[ً-ٰٕۖ-ۭـ]/gu, "");

const BASMALAH: string = first(1).text_uthmani.trim(); // Al-Faatiha 1:1 IS the basmalah.
const BASMALAH_BARE = bare(BASMALAH);
const BASMALAH_WORDS = BASMALAH.split(/\s+/).length; // 4

const NO_BASMALAH = new Set([9]); // At-Tawbah is the only surah without one.
const BASMALAH_IS_AYAH_1 = new Set([1]); // Al-Faatiha counts it as a numbered ayah.

/** Strip the prepended basmalah from ayah 1. Leading-only, ayah-1-only, never surah 1 or 9. */
function stripBasmalah(surah: number, ayahNumber: number, text: string): string {
  if (ayahNumber !== 1) return text;
  if (BASMALAH_IS_AYAH_1.has(surah) || NO_BASMALAH.has(surah)) return text;

  const words = text.split(/\s+/);
  const lead = words.slice(0, BASMALAH_WORDS).join(" ");
  if (bare(lead) !== BASMALAH_BARE) {
    fail(`${surah}:1 does not begin with the basmalah — got "${lead}", refusing to guess`);
  }
  return words.slice(BASMALAH_WORDS).join(" ").trim();
}

/** Does this surah render an unnumbered basmalah header above its first ayah? */
const hasBismillahHeader = (surah: number) => !NO_BASMALAH.has(surah) && !BASMALAH_IS_AYAH_1.has(surah);

// ── divergence ───────────────────────────────────────────────────────────────
//
// Jaccard token overlap between the interpretive primary and the literal companion.
//
// THIS IS A REVIEW-QUEUE SIGNAL. IT IS NOT A USER-FACING FLAG. That distinction was bought
// the hard way, and the reason is worth keeping in front of whoever reads this next:
//
//   2:156 — overlap 11% — the Tafsiriyah's single greatest WIN. Kemenag leaves the Arabic
//           untranslated at the verse recited over the dead; the Tafsiriyah renders it.
//   94:5  — overlap  7% — the Tafsiriyah's single worst FAILURE. A promise ("with hardship
//           comes ease") flattened into a general observation about life.
//
// The metric cannot tell those two apart. Median overlap across the corpus is 29%, so "low
// overlap" is not an anomaly at all — it is what an interpretive rendering NORMALLY looks
// like next to a literal one. Wiring a caution banner to this would put a warning on the
// verse that proves the thesis, and spread it across 1,224 verses until it meant nothing.
//
// The real safeguard is structural and already enforced: `literal_companion` guarantees the
// reader sees BOTH renderings on EVERY verse. Plurality is the mitigation. The caution banner
// stays rare and human-ruled — that is precisely what gives it force.
//
// So: rank divergence, hand it to the human, and let the human rule. See docs/review/.
const DIVERGENCE_THRESHOLD = 0.2;

const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );

function overlapOf(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 1; // nothing to compare — do not cry wolf
  const shared = [...A].filter((t) => B.has(t)).length;
  return shared / new Set([...A, ...B]).size;
}

// ── indexes ──────────────────────────────────────────────────────────────────
const bySurah = new Map<number, Ayah[]>();
for (const a of ayahs) {
  (bySurah.get(a.surah_number) ?? bySurah.set(a.surah_number, []).get(a.surah_number)!).push(a);
}
for (const list of bySurah.values()) list.sort((x, y) => x.ayah_number - y.ayah_number);

const trByAyah = new Map<string, Translation[]>();
for (const t of translations) {
  (trByAyah.get(t.ayah_id) ?? trByAyah.set(t.ayah_id, []).get(t.ayah_id)!).push(t);
}

const reading = (t: Translation | undefined) =>
  t ? { text: t.text, translator: t.translator, translation_type: t.translation_type } : null;

// ── 1. the truth oracle — inlined, zero-network ──────────────────────────────
const index = surahs
  .slice()
  .sort((a, b) => a.number - b.number)
  .map((s) => ({
    n: s.number,
    ar: s.name_ar,
    tl: s.name_translit,
    en: s.name_en,
    ayahs: s.ayah_count,
    rev: s.revelation_type,
    order: s.order_revealed,
    bismillah: hasBismillahHeader(s.number),
  }));

if (index.length !== 114) fail(`index has ${index.length} surahs, expected 114`);

const corpusVersion: string = (await Bun.file(`${DIR}/manifest.json`).json()).corpus_version;
if (!corpusVersion) fail("manifest has no corpus_version — cache invalidation would be broken");

const indexTs = `// GENERATED by \`bun run app:corpus\` — do not edit.
//
// The truth oracle. Inlined into the bundle (not fetched) so Nur can prove an ayah is real
// with ZERO network — offline, on a dead connection, on the very first cold open. This is the
// cheapest possible form of "never lie about what the Qur'an contains", and it is why the app
// can no longer tell a user that 18:10 does not exist.

export interface SurahMeta {
  /** Surah number, 1-114. */
  readonly n: number;
  readonly ar: string;
  readonly tl: string;
  readonly en: string;
  /** How many ayahs this surah actually has — the bound every reference is checked against. */
  readonly ayahs: number;
  readonly rev: string;
  /**
   * Order of revelation, 1-114 — the sequence the surahs came down in, which is NOT the order
   * they are arranged in. Al-Faatiha is 5th revealed but 1st in the mushaf. Straight from
   * Tanzil's \`order\` attribute; a traditional ordering, not a contested reconstruction.
   */
  readonly order: number;
  /** Does this surah open with an unnumbered basmalah? (false for Al-Faatiha and At-Tawbah) */
  readonly bismillah: boolean;
}

export const SURAH_INDEX: readonly SurahMeta[] = ${JSON.stringify(index, null, 2)} as const;

/** The basmalah, rendered as an unnumbered opening above every surah but 1 and 9. */
export const BASMALAH = ${JSON.stringify(BASMALAH.trim())};

export const TOTAL_AYAHS = ${index.reduce((n, s) => n + s.ayahs, 0)};

/**
 * Derived from the hashes of the canonical artifacts, so it changes if and only if the scripture
 * changes. Shard URLs carry it, and the persistent cache is keyed on it — which is what makes
 * "cache a shard forever" safe to actually mean. Without it, a corpus rebuild would leave phones
 * and CDNs serving the previous text indefinitely.
 */
export const CORPUS_VERSION = ${JSON.stringify(corpusVersion)};
`;
await Bun.write(INDEX_TS, indexTs);

// ── 2. the shards — one surah at a time, never the whole book ─────────────────
await Bun.$`rm -rf ${SHARD_DIR}`.quiet();
await Bun.$`mkdir -p ${SHARD_DIR}`.quiet();

let shardedAyahs = 0;
let diverging = 0;
let largest = { n: 0, kb: 0 };

/** Erik's review queue — ranked, most-divergent first. Not shipped to the browser. */
const review: { ref: string; overlap: number; primary: string; companion: string }[] = [];

for (const s of index) {
  const list = bySurah.get(s.n) ?? fail(`no ayahs for surah ${s.n}`);
  if (list.length !== s.ayahs) fail(`surah ${s.n}: ${list.length} ayahs, index says ${s.ayahs}`);

  const rows = list.map((a) => {
    const here = trByAyah.get(a.id) ?? [];
    const primary = reading(here.find((t) => t.display_role === "primary"));
    const companion = reading(here.find((t) => t.display_role === "companion"));

    // The literal_companion invariant, enforced at the shard boundary: an interpretive
    // primary NEVER ships without the literal alongside it. The ingest gates enforce this
    // in the corpus; we re-enforce it here because this is what actually reaches a reader.
    if (primary && !companion) {
      fail(`${s.n}:${a.ayah_number} has an interpretive primary with no literal companion`);
    }

    // Divergence is recorded for the REVIEW QUEUE, never shipped as a reader-facing flag.
    // (See the divergence note above — the metric cannot distinguish 2:156 from 94:5.)
    if (primary && companion) {
      const o = overlapOf(primary.text, companion.text);
      if (o < DIVERGENCE_THRESHOLD) {
        diverging++;
        review.push({ ref: `${s.n}:${a.ayah_number}`, overlap: o, primary: primary.text, companion: companion.text });
      }
    }

    return {
      a: a.ayah_number,
      ar: stripBasmalah(s.n, a.ayah_number, a.text_uthmani),
      p: primary,
      c: companion,
    };
  });

  const shard = {
    n: s.n,
    name: s.tl,
    name_ar: s.ar,
    /** Self-declared count. The client rejects a shard whose ayahs don't match — a truncated
     *  download must never render as a half-surah. Scripture does not degrade gracefully. */
    ayahs: s.ayahs,
    bismillah: s.bismillah,
    verses: rows,
  };

  const json = JSON.stringify(shard);
  await Bun.write(`${SHARD_DIR}/${s.n}.json`, json);
  shardedAyahs += rows.length;

  // Budget the WIRE size, not the disk size. Every real server gzips this, and 4G cares about
  // what crosses the network. Al-Baqarah is 327KB on disk and 79KB on the wire — gating on the
  // former would have us mangling the format to fix a number nobody's phone ever sees.
  const kb = Bun.gzipSync(Buffer.from(json)).length / 1024;
  if (kb > largest.kb) largest = { n: s.n, kb };
}

if (shardedAyahs !== 6236) fail(`sharded ${shardedAyahs} ayahs, expected 6236`);
if (largest.kb > 100) fail(`surah ${largest.n} is ${largest.kb.toFixed(0)}KB gzipped — over the 100KB wire budget`);

// ── 3. the chat hot path — curated verses, WITH tafsir ───────────────────────
const trim = (s: string, n = 700) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

const passagesByAyah = new Map<string, TafsirPassage[]>();
for (const p of passages) {
  (passagesByAyah.get(p.ayah_id) ?? passagesByAyah.set(p.ayah_id, []).get(p.ayah_id)!).push(p);
}
const tierOf = (id: string) => sources.find((s) => s.id === id)?.authority_tier ?? 9;
const langOf = (id: string) => sources.find((s) => s.id === id)?.lang ?? "id";

/**
 * Build the context passage for a conditionally-approved verse.
 *
 * Every failure here is a `fail()`, not a fallback. A co-display range that silently came back
 * short would put the verse on screen without the context it was approved inside — which is the
 * precise thing the condition exists to prevent, and it would do it quietly.
 */
function buildPassage(
  s: number,
  a: number,
  range: readonly [number, number],
): { ayah: number; arabic: string; primary: ReturnType<typeof reading>; companion: ReturnType<typeof reading> }[] {
  const [from, to] = range;
  if (from > to) fail(`${s}:${a} co-display range ${from}-${to} is inverted`);
  if (a < from || a > to) {
    fail(
      `${s}:${a} co-display range ${s}:${from}-${to} does not contain the verse it is context for.\n` +
        `  A passage that omits its own subject is a mis-transcription of the reviewer's condition.`,
    );
  }
  const bound = index.find((x) => x.n === s) ?? fail(`no surah ${s}`);
  if (to > bound.ayahs) fail(`${s}:${a} co-display range ends at ${to}, but surah ${s} has ${bound.ayahs} ayahs`);

  const out = [];
  for (let n = from; n <= to; n++) {
    const id = `ayah:${s}:${n}`;
    const ay = ayahs.find((x) => x.id === id) ?? fail(`missing ${id} for co-display of ${s}:${a}`);
    const tr = trByAyah.get(id) ?? [];
    out.push({
      ayah: n,
      arabic: stripBasmalah(s, n, ay.text_uthmani),
      primary: reading(tr.find((t) => t.display_role === "primary")),
      companion: reading(tr.find((t) => t.display_role === "companion")),
    });
  }
  return out;
}

const verses = PROBLEM_VERSES.map((v) => {
  const [s, a] = v.ref;
  const id = `ayah:${s}:${a}`;
  const ayah = ayahs.find((x) => x.id === id) ?? fail(`missing ${id} — run \`bun run ingest\``);
  const here = trByAyah.get(id) ?? [];
  const surah = index.find((x) => x.n === s) ?? fail(`no surah ${s}`);

  const primary = reading(here.find((t) => t.display_role === "primary"));
  const companion = reading(here.find((t) => t.display_role === "companion"));
  if (primary && !companion) fail(`${s}:${a} interpretive primary with no literal companion`);

  return {
    id,
    ref: `${s}:${a}`,
    surah: s,
    ayah: a,
    surah_name: surah.tl,
    surah_ar: surah.ar,
    arabic: stripBasmalah(s, a, ayah.text_uthmani),
    themes: v.themes,
    why: v.why,
    primary,
    companion,
    // A conditional approval: the reviewer allowed this verse only inside a passage. The range is
    // emitted as CONTEXT — same corpus text, no caption of ours on any of it — and `ref` above
    // stays the verse the theme points at.
    passage: v.codisplay ? buildPassage(s, a, v.codisplay.range) : undefined,
    tafsir: (passagesByAyah.get(id) ?? [])
      .map((p) => ({ source_id: p.source_id, text: trim(p.text), lang: langOf(p.source_id) }))
      // Indonesian first. An English tafsir rendered to an Indonesian reader is the exact
      // wound this product exists to heal — it may appear, but never in the lead, and it is
      // labelled as English so nobody is left wondering why they can't read it.
      .sort((x, y) => {
        if (x.lang !== y.lang) return x.lang === "id" ? -1 : 1;
        return tierOf(x.source_id) - tierOf(y.source_id);
      }),
  };
});

/**
 * Fragment gate — a verse whose rendering opens mid-sentence must be a deliberate choice.
 *
 * This rule was first written as CANNOT_STAND_ALONE inside the one-shot merge script, which meant it
 * protected nothing: it could not see verses already live, did not run on hand edits to
 * problem-verses.ts, and would not have run on the next batch. Six fragments had already shipped by
 * the time that was noticed. It belongs here, where every rendering is in hand and every build sees
 * every verse.
 *
 * A fragment is not automatically wrong — "mudahkanlah urusanku" (20:26) is a complete du'a and
 * 13:28 has been live since the original curated set. But it must be ACKNOWLEDGED, not discovered by
 * a reader who is handed a sentence starting with "kecuali".
 */
const FRAGMENT_OK: Record<string, string> = {
  "13:28": "reads as a complete thought; part of the original curated 55",
  "20:26": "a complete du'a on its own — Musa's 'mudahkanlah urusanku'",
  "18:24": "the clause carries its own instruction (say insya Allah)",
  // Reviewed 2026-07-20. 23:61 and 113:5 were DROPPED from the feeling corpus rather than blessed
  // (see the reasoning at their old sites in problem-verses.ts), so they no longer reach this gate.
  //
  // 25:70 is blessed, and it is the one case where the missing referent is not a loss. "kecuali"
  // hangs off 25:68's gravest sins — shirk, murder, zina — but everything AFTER it is a complete,
  // self-contained promise: repent, believe, do good, and Allah exchanges the sins for reward. The
  // omitted context makes the promise NARROWER than the fragment reads, so a person in shame who
  // takes it at face value is told something a fortiori true, never something false. The only defect
  // is a lowercase opener. Shipping the referent instead would put the gravest sins in front of
  // someone already drowning in shame, to no benefit.
  "25:70": "blessed: the clause after 'kecuali' is a whole promise; the hidden referent only narrows it",
};
// The signal is a LOWERCASE opening — the translator's own mark that this rendering continues the
// previous ayah. A capitalised "Dan…"/"Adapun…" is ordinary Qur'anic style and reads fine alone;
// an earlier draft of this gate flagged 25:74, 17:29 and 4:146 on that basis and was simply wrong.
const fragments = verses.filter((v) => /^[a-z]/.test((v.primary?.text ?? "").trim()));
const unacknowledged = fragments.filter((v) => !(v.ref in FRAGMENT_OK));
if (unacknowledged.length) {
  fail(
    `${unacknowledged.length} verse(s) open mid-sentence with no entry in FRAGMENT_OK: ` +
      unacknowledged.map((v) => `${v.ref} ("${(v.primary?.text ?? "").trim().slice(0, 40)}…")`).join(", ") +
      `\n  A reader gets a sentence with no beginning. Either pick a verse that stands alone, or add a` +
      `\n  reasoned FRAGMENT_OK entry saying why this one is fine.`,
  );
}
const needsReview = fragments.filter((v) => FRAGMENT_OK[v.ref]?.startsWith("REVIEW:"));

/**
 * The fragment gate's blind spot: a dangling referent that CAPITALISES.
 *
 * The gate above keys on a lowercase opener, which is the translator's own mark of continuation. It
 * is a good signal and it caught six real fragments — but it is only a proxy, and 2:112 walked
 * straight through it. Its rendering opens "Pengakuan orang Yahudi dan Nasrani semacam itu adalah
 * dusta": a capital P, and "semacam itu" pointing back at 2:111, which the reader never sees. It was
 * tagged Anxiety & fear for its tail ("tiada takut… tiada sedih") and served, in production, as the
 * top answer to someone who could not sleep.
 *
 * Nothing found that for weeks. The synthesis answer eval found it on its first real run, judging
 * groundedness against grounding the app itself had chosen — which is the argument for the eval.
 *
 * So: a second, narrower probe for a back-reference in the opening sentence. It matches exactly one
 * verse across the corpus today (2:112, now dropped), so it costs nothing and holds the line.
 */
const BACKREF = /^[^.]*\b(semacam itu|demikian itu|yang demikian|hal itu|itulah)\b/i;
const BACKREF_OK: Record<string, string> = {};
const backrefs = verses.filter((v) => BACKREF.test((v.primary?.text ?? "").split(/(?<=\.)\s/)[0] ?? ""));
const danglers = backrefs.filter((v) => !(v.ref in BACKREF_OK));
if (danglers.length) {
  fail(
    `${danglers.length} verse(s) open by pointing back at an ayah the reader cannot see: ` +
      danglers.map((v) => `${v.ref} ("${(v.primary?.text ?? "").split(/(?<=\.)\s/)[0]}")`).join(", ") +
      `\n  A capitalised opener is not proof a verse stands alone — 2:112 proved that. Either pick a` +
      `\n  verse that stands alone, or add a reasoned BACKREF_OK entry saying why this one is fine.`,
  );
}

/**
 * Verses a reviewer said must NEVER be curated together, in their words.
 *
 * Most caveats on a ProblemVerse are framing advice a machine cannot check. These two are different:
 * they are flat prohibitions with a named partner, so they are enforceable, so they are enforced.
 *
 * The stakes are the whole product. 4:146 is the mercy clause — those who repent are counted with
 * the believers — and 4:145 is what it is an exception TO: the hypocrites in the lowest depths of the
 * fire. A person who opened this app because they are afraid their faith is fake, shown both, has
 * been handed the threat they already fear beside the reassurance, and the threat wins.
 *
 * Both partners are absent from the corpus today, so the ban currently holds — but it holds by the
 * accident of what got curated, and that is exactly how the honesty floor "held" right up until the
 * corpus grew from 12 feelings to 83 and it broke 8/8. A build gate does not care how the corpus grows.
 */
const NEVER_TOGETHER: [string, string, string][] = [
  ["4:146", "4:145", "4:146 is the exception to 4:145's threat against the hypocrites — the reviewer's note says WAJIB ditampilkan sendiri"],
  ["4:17", "4:18", "4:18 narrows 4:17's open door with a threat — the reviewer's note says jangan tampilkan berdampingan"],
];
/**
 * The set of refs that can REACH A SCREEN — curated verses plus every ayah a co-display range
 * expands to.
 *
 * Co-display opened a second door. The gate below used to compare curated refs only, which was
 * complete when a curated ref was the only way a verse could be rendered. It no longer is: give
 * 4:146 a range of 4:145–146 and the forbidden pair is on screen together while `curated` never
 * contains 4:145 at all. The ban would still "hold" — over a set that no longer describes what
 * the reader sees.
 *
 * So the gate compares what is DISPLAYABLE, not what is curated. Both partners are checked in
 * both directions, because a companion is just as visible as a subject.
 */
const displayable = new Set(verses.map((v) => v.ref));
for (const v of verses) {
  for (const p of v.passage ?? []) displayable.add(`${v.surah}:${p.ayah}`);
}
for (const [a, b, why] of NEVER_TOGETHER) {
  if (displayable.has(a) && displayable.has(b)) {
    const via = (r: string): string =>
      verses.some((v) => v.ref === r) ? "curated" : "pulled in by a co-display range";
    fail(
      `${a} and ${b} can both reach the screen, and a reviewer forbade showing them together.\n` +
        `  ${a} is ${via(a)}; ${b} is ${via(b)}.\n  ${why}\n` +
        `  Drop one, or narrow the co-display range — do not silence this gate.`,
    );
  }
}


const bundle = {
  corpus_version: (await Bun.file(`${DIR}/manifest.json`).json()).corpus_version,
  sources: sources.map((s) => ({
    id: s.id,
    author: s.author,
    name: s.name,
    era: s.era,
    lang: s.lang,
    authority_tier: s.authority_tier,
    display_role: s.display_role,
    note: s.note ?? null,
  })),
  themes: [...new Set(verses.flatMap((v) => v.themes))],
  verses,
};

await Bun.write(`${OUT_DIR}/corpus.json`, JSON.stringify(bundle));
const hotKb = (await Bun.file(`${OUT_DIR}/corpus.json`).size) / 1024;

// Anti-criterion, enforced: no tafsir text may enter a shard.
const sampleShard = await Bun.file(`${SHARD_DIR}/2.json`).text();
for (const src of sources) {
  if (sampleShard.includes(src.id)) fail(`shard 2 leaks tafsir source ${src.id}`);
}

// ── 4. the review queue — for Erik, not for the browser ──────────────────────
review.sort((a, b) => a.overlap - b.overlap);
await Bun.write(REVIEW_OUT, JSON.stringify({ threshold: DIVERGENCE_THRESHOLD, count: review.length, verses: review }, null, 2));

console.log(`✓ index    114 surahs → ${INDEX_TS} (${(Buffer.byteLength(indexTs) / 1024).toFixed(1)} KB, inlined — zero network)`);
console.log(`✓ shards   ${shardedAyahs} ayahs → ${SHARD_DIR}/ (largest: surah ${largest.n} @ ${largest.kb.toFixed(0)} KB gzipped)`);
// Wire size, per this file's own budgeting rule above — the warning used to compare the DISK size
// against a 300 KB threshold, so growing the corpus tripped a 4G alarm that the network never sees.
// Every real server gzips this; measure what actually crosses the wire.
const hotGz = Bun.gzipSync(Buffer.from(JSON.stringify(bundle))).length / 1024;
console.log(`✓ hot path ${verses.length} verses · ${bundle.sources.length} voices → ${OUT_DIR}/corpus.json (${hotKb.toFixed(0)} KB, ${hotGz.toFixed(0)} KB gzipped)`);
console.log(`✓ review   ${diverging} verses ranked for human review → ${REVIEW_OUT} (NOT shipped to the browser)`);
console.log(`  ↳ the reader's safeguard is structural: every verse ships both renderings. No mechanical caution.`);
if (hotGz > 200) console.warn(`⚠ hot path ${hotGz.toFixed(0)} KB gzipped is heavy for 4G`);
if (needsReview.length) {
  console.warn(`⚠ ${needsReview.length} verse(s) open mid-sentence and are awaiting a decision: ${needsReview.map((v) => v.ref).join(", ")}`);
}
