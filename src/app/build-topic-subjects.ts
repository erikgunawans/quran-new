#!/usr/bin/env bun
/**
 * Build the subject → category routing index.
 *
 * THE BUG THIS FIXES. `matchTopic` knew only category ALIASES, so it routed on how a question was
 * FRAMED rather than what it was ABOUT. "homo itu hukumnya apa sih di islam?" scored on `hukum`
 * and `larangan`, landed on Perintah dan Larangan's 626 entries, and pointed there confidently —
 * while the entry it wanted ("Homoseksual", QS 7:80) sits in Membangun Pribadi Shalih, a category
 * the router never even considered. The index HELD the answer and the router could not reach it.
 *
 * WHY NOT FREQUENCY. Twice before, an IDF/frequency ranking was tried against this index and twice
 * it failed — `hukum` is rarer in Perintah dan Larangan (6/626) than `riba` is in Ekonomi (2/69),
 * so frequency ranks the noise above the signal. See QUESTION_FRAME in knowledge.ts. The separator
 * that works here is word CLASS, and this index does not re-litigate that: it does not rank
 * anything. It answers one question — does this word actually OCCUR in that category's entries? —
 * and routing prefers a category that genuinely contains the subject over one that merely matches
 * the question's frame.
 *
 * DISCRIMINATING WORDS ONLY. A word appearing across many categories routes nowhere useful, so
 * words spanning more than MAX_SPREAD categories are dropped as noise. Stopwords, corpus-frame
 * words and question-frame words are excluded using the SAME sets knowledge.ts uses at runtime —
 * imported, not copied, because this file already records what happened when two "mirroring" word
 * lists drifted apart.
 *
 *   bun run app:topic-subjects
 */
import { readdirSync } from "node:fs";
import { FRAME, QUESTION_FRAME, STOP } from "../../web/src/topic-words.ts";
import { norm } from "../../web/src/retrieve.ts";

const PETA_DIR = "web/public/peta";
const OUT_TS = "web/src/topic-subjects.ts";

/** Not category shards — a 3D scene and a relationship graph that happen to live in the folder. */
const NOT_A_CATEGORY = new Set(["index.json", "cosmos.json", "bonds.json"]);

/** Above this many categories a word is framing, not subject, and routes nowhere useful. */
const MAX_SPREAD = 3;

/** Short tokens are prefixes and particles, not subjects. */
const MIN_LEN = 4;

interface Shard {
  subtopics?: { subtopic?: string; entries?: { text?: string }[] }[];
}

const index = (await Bun.file(`${PETA_DIR}/index.json`).json()) as {
  categories: { slug: string; category: string; entries: number }[];
};

// word → slug → how many entries in that category contain it
const byWord = new Map<string, Map<string, number>>();

for (const file of readdirSync(PETA_DIR)) {
  if (!file.endsWith(".json") || NOT_A_CATEGORY.has(file)) continue;
  const slug = file.replace(/\.json$/, "");
  const meta = index.categories.find((c) => c.slug === slug);
  if (!meta) continue;

  // A category's own name words match nearly everything inside it — the same rule retrieveKnowledge
  // applies at query time, applied here so they never enter the index in the first place.
  const nameWords = new Set(norm(meta.category).split(/[\s-]+/).filter(Boolean));

  const shard = (await Bun.file(`${PETA_DIR}/${file}`).json()) as Shard;
  for (const st of shard.subtopics ?? []) {
    for (const e of st.entries ?? []) {
      const text = e.text ?? "";
      if (!text) continue;
      const seen = new Set<string>();
      for (const w of norm(text).split(/[\s-]+/)) {
        if (w.length < MIN_LEN) continue;
        if (STOP.has(w) || FRAME.has(w) || QUESTION_FRAME.has(w) || nameWords.has(w)) continue;
        if (seen.has(w)) continue;
        seen.add(w);
        const slots = byWord.get(w) ?? new Map<string, number>();
        slots.set(slug, (slots.get(slug) ?? 0) + 1);
        byWord.set(w, slots);
      }
    }
  }
}

// Slugs are stored ONCE and referenced by index. Spelling "membangun-pribadi-shalih" out beside
// 2,000 words cost 116 KB inlined — most of it the same 13 strings repeated. Indices bring it under
// a third of that, which is what makes keeping this table in the bundle defensible at all.
const slugs = index.categories.map((c) => c.slug).sort();
const slugIdx = new Map(slugs.map((s, i) => [s, i] as const));

/** Strongest-containing category first; ties broken by slug so the output is deterministic. */
const rank = (slots: Map<string, number>) =>
  [...slots]
    .sort((x, y) => (y[1] - x[1] !== 0 ? y[1] - x[1] : x[0] < y[0] ? -1 : 1))
    .map(([slug]) => slugIdx.get(slug))
    .filter((i): i is number => i !== undefined);

/**
 * TWO TIERS, because "spread > MAX_SPREAD" was being read as two different things at once.
 *
 * The cap is a good rule for RANKING — a word in nine categories does not tell you which one to
 * open. It was a disastrous rule for PRESENCE, because the words it discards are not noise, they
 * are the vocabulary of the religion. Measured 2026-08-16 over the shipped shards, after stopwords
 * and frame words were already removed: `neraka`(5), `dosa`(9), `akhirat`(8), `surga`(7), `iman`(8),
 * `rezeki`(8), `nabi`(8), `rasul`(8), `tauhid`(7), `halal`(8), `ilmu`(6), `jiwa`(7), `dunia`(6) —
 * 276 words in all. In a thematic index of the Qur'an cut into 13 chapters, appearing everywhere is
 * what CENTRAL looks like, not what noise looks like.
 *
 * The cost was measured, not guessed: asked "apa aja sih yang tidak kita sadari kita lakukan yang
 * bisa membuat kita masuk neraka?", the app made ZERO model calls and told the reader nothing in
 * the verified corpus matched — while nine `neraka` entries sat in the index (74:43, 85:10, 8:13,
 * 14:28-30, 3:131), several of them direct answers.
 *
 * So the cap stays exactly where it was for the discriminating tier, and the words it rejects are
 * emitted separately instead of thrown away. `knowledge.ts` reads TOPIC_SUBJECTS first and only
 * falls back to TOPIC_BROAD — so nothing that routes correctly today changes route — and uses the
 * broad tier to answer a different question the router also needs: is this word in the corpus AT
 * ALL? A word absent from BOTH tiers ("musik", "pacaran") is genuinely uncovered and must still
 * veto a correction. A word that is merely broad is not evidence of a gap and must not.
 */
const out: Record<string, number[]> = {};
const broad: Record<string, number[]> = {};
for (const [word, slots] of [...byWord].sort(([a], [b]) => (a < b ? -1 : 1))) {
  (slots.size > MAX_SPREAD ? broad : out)[word] = rank(slots);
}
const dropped = Object.keys(broad).length;

const ts =
  `// GENERATED by \`bun run app:topic-subjects\` — do not edit.\n` +
  `//\n` +
  `// Subject word → the categories whose ENTRIES actually contain it, so matchTopic can route on\n` +
  `// what a question is ABOUT rather than only on how it is framed. Presence, not frequency: this\n` +
  `// table ranks nothing, it records where a word genuinely occurs. Categories are referenced by\n` +
  `// index into TOPIC_SLUGS — spelling them out cost 116 KB, almost all of it 13 repeated strings.\n` +
  `// See src/app/build-topic-subjects.ts.\n\n` +
  `export const TOPIC_SLUGS: readonly string[] = ${JSON.stringify(slugs)};\n\n` +
  `export const TOPIC_SUBJECTS: Readonly<Record<string, readonly number[]>> = ${JSON.stringify(out)};\n\n` +
  `// The SECOND tier: words the spread cap rejects for ranking but which the corpus demonstrably\n` +
  `// contains. Consulted only after TOPIC_SUBJECTS comes up empty. See the comment in\n` +
  `// src/app/build-topic-subjects.ts for why discarding these was a defect.\n` +
  `export const TOPIC_BROAD: Readonly<Record<string, readonly number[]>> = ${JSON.stringify(broad)};\n`;

await Bun.write(OUT_TS, ts);

const kb = (Buffer.byteLength(ts) / 1024).toFixed(1);
console.log(
  `✓ subjects ${Object.keys(out).length} routing words + ${dropped} broad-tier words (spread > ${MAX_SPREAD}) → ${OUT_TS} (${kb} KB, inlined)`,
);
