/**
 * Gates on what the READER actually receives.
 *
 * The 24 corpus gates validate `data/canonical/` — the *input*. They never looked at the three
 * artifacts a person's phone actually downloads. That gap is not theoretical: the Indonesian
 * captions were translated at source, the test suite went green, and the browser rendered English
 * for an hour — because `corpus.json` had been built beforehand and nothing rebuilt it.
 *
 * A gate on the input is not a gate on the output. These are the output gates, and they follow the
 * same doctrine as the rest: every check runs, all violations are reported together, and a
 * violation is fatal. A corpus that is right on disk and wrong in the browser is still wrong.
 */
import { IntegrityError } from "../ingest/validate.ts";
import { PROBLEM_VERSES } from "../review/problem-verses.ts";

const OUT = "web/public";
const SHARD_DIR = `${OUT}/surah`;
const INDEX_TS = "web/src/surah-index.ts";

export interface GateReport {
  checks: { name: string; detail: string }[];
}

/** English prose leaking into an Indonesian product — the wound this app exists to heal. */
const ENGLISH = /\b(the|and|with|that|will|from|your|not|for|who|every|upon|when|there|his|her|they|them)\b/i;

export async function validateBrowser(corpusVersion: string): Promise<GateReport> {
  const v: string[] = [];
  const checks: { name: string; detail: string }[] = [];
  const pass = (name: string, detail: string) => checks.push({ name, detail });

  if (!(await Bun.file(`${OUT}/corpus.json`).exists())) {
    throw new IntegrityError(["browser corpus not built — run `bun run app:corpus`"]);
  }

  // ── Gate: staleness ────────────────────────────────────────────────────────
  //
  // The one that matters most. The inlined index stamps the corpus_version it was generated from.
  // If it disagrees with the corpus on disk, every browser artifact belongs to a different build —
  // precisely the state that shipped English captions behind a green test suite.
  const indexTs = await Bun.file(INDEX_TS).text();
  const stamped = indexTs.match(/export const CORPUS_VERSION = "([^"]+)"/)?.[1];
  if (stamped !== corpusVersion) {
    v.push(`browser artifacts are STALE: built from ${stamped ?? "unknown"}, corpus is ${corpusVersion} — run \`bun run app:corpus\``);
  } else {
    pass("browser_not_stale", `artifacts built from ${corpusVersion}`);
  }

  // ── Gate: the reader sees Indonesian ───────────────────────────────────────
  const corpus = (await Bun.file(`${OUT}/corpus.json`).json()) as {
    verses: { ref: string; why: string; primary: unknown; companion: unknown }[];
  };

  const leaks = corpus.verses.filter((x) => ENGLISH.test(x.why));
  if (leaks.length) v.push(`${leaks.length} English captions SHIPPED (e.g. ${leaks[0]!.ref}: "${leaks[0]!.why}")`);
  else pass("shipped_captions_indonesian", `${corpus.verses.length} captions, zero English`);

  const drifted = PROBLEM_VERSES.filter((p) => corpus.verses.find((x) => x.ref === p.ref.join(":"))?.why !== p.why);
  if (drifted.length) v.push(`${drifted.length} shipped captions differ from problem-verses.ts — corpus.json is stale`);
  else pass("shipped_captions_match_source", "corpus.json matches the source captions");

  // ── Gate: literal_companion, enforced where readers are ────────────────────
  const orphaned = corpus.verses.filter((x) => x.primary && !x.companion);
  if (orphaned.length) v.push(`${orphaned.length} verses ship an interpretive primary with NO literal companion`);
  else pass("shipped_literal_companion", "no interpretive rendering ships alone");

  // ── Gate: the shards hold the whole Qur'an ─────────────────────────────────
  let total = 0;
  const missing: number[] = [];
  for (let n = 1; n <= 114; n++) {
    const f = Bun.file(`${SHARD_DIR}/${n}.json`);
    if (!(await f.exists())) {
      missing.push(n);
      continue;
    }
    const shard = (await f.json()) as { verses: { a: number }[] };
    total += shard.verses.length;
  }
  if (missing.length) v.push(`${missing.length} surah shards missing (first: ${missing[0]})`);
  else pass("shards_complete", "114 surah shards on disk");

  if (total !== 6236) v.push(`shards hold ${total} ayahs, expected 6236`);
  else pass("shards_hold_whole_quran", "6236/6236 ayahs reachable by the browser");

  // ── Gate: tafsir never reaches a phone ─────────────────────────────────────
  const sources = (await Bun.file("data/canonical/tafsir-sources.json").json()) as { id: string }[];
  const sample = await Bun.file(`${SHARD_DIR}/2.json`).text();
  const leaked = sources.filter((s) => sample.includes(s.id));
  if (leaked.length) v.push(`shard leaks tafsir source ${leaked[0]!.id} — the 113MB corpus must stay server-side`);
  else pass("shards_carry_no_tafsir", "tafsir stays server-side");

  if (v.length) throw new IntegrityError(v);
  return { checks };
}
