/**
 * LIVE probe of the DEPLOYED answer wall — the instrument the `own_wording` deploy needed and the
 * previous session did not leave behind.
 *
 * WHY IT EXISTS. `eval:answer` is deliberately OFFLINE: it calls the provider directly and runs its
 * own copy of the guard loop, so it can measure a guard's design but never a guard's DEPLOYMENT. The
 * number the wording wall actually needs is a different one — with the wall live and the Worker's
 * two-attempt retry open, how often does a reader end up with NOTHING? That is only observable
 * against prod, because only prod runs the retry.
 *
 * WHY IT IS NOT `curl`. A bare curl posts no grounding, and the no-grounding path is a different
 * code path with a different refusal rate (measured elsewhere in this repo at ~35% blank vs 96%
 * grounded). Reader conditions mean the browser retrieved first and posted what it found, so this
 * probe runs the SAME `gatherGrounding` prod's front end runs and posts the SAME body shape
 * `answer-live.ts` posts: `{question, verses, entries}`.
 *
 * WHY THE QUESTION SET IS IN THIS FILE. The 2026-08-17 (late-3) measurement reported "3 of 8" and
 * the eight questions were never written down, so "re-run the same 8" was not executable. The set
 * below is now the recorded one. Six are attested in PROGRESS.md / ISA.md as members of the original
 * sample; the two marked `added` are not, and are labelled so no future reading treats this as a
 * like-for-like replay of that run. It is a like-for-like replay from here on.
 *
 * READ THE BUCKETS, NOT THE HEADLINE. `blocked:*` is a refusal the reader sees as a pointer, not a
 * crash; `answered` is prose that cleared TWO generations' worth of wall. The interesting cell is
 * `blocked:own_wording`, because that residue — violated twice — is the only cost the retry does not
 * absorb.
 *
 * USAGE.
 *   bun run src/eval/wall-live-probe.ts                       # prod
 *   bun run src/eval/wall-live-probe.ts --base https://...    # another surface
 *   bun run src/eval/wall-live-probe.ts --repeat 2            # sample each question twice
 */
import { gatherGrounding } from "../../web/src/answer.ts";
import { wordingShape } from "../../web/src/answer-guard.ts";
import { understandThemes } from "../../web/src/theme-understand.ts";
import { liveThemeModel } from "../../web/src/theme-live.ts";
import type { Corpus } from "../../web/src/retrieve.ts";

// ── the recorded question set ───────────────────────────────────────────────────────
interface Probe {
  readonly q: string;
  /** `attested` = named in PROGRESS.md/ISA.md as part of the 2026-08-17 (late-3) sample. */
  readonly origin: "attested" | "added";
  /** Why this question is in the set — so a future editor knows what removing it would cost. */
  readonly why: string;
}

const PROBES: readonly Probe[] = [
  { q: "bolehkah aku pacaran", origin: "attested", why: "the ISC-419 violation — shipped QS 2:187's wording in quotation marks" },
  { q: "apakah musik haram", origin: "attested", why: "one of the two answers a hard rule would have destroyed; must stay answered" },
  { q: "bolehkah perempuan jadi pemimpin", origin: "attested", why: "the other one; must stay answered" },
  { q: "apa hukum riba dalam islam dan kenapa dilarang", origin: "attested", why: "ruling question; also the QS 7:19 mis-route case (§6)" },
  { q: "apa yang al quran katakan tentang neraka", origin: "attested", why: "the known SCRIPTURE-chapter mis-route (§7)" },
  { q: "kenapa kita harus salat lima waktu", origin: "attested", why: "the question that motivated the synthesis flip at all" },
  { q: "bagaimana adab kepada orang tua menurut islam", origin: "added", why: "adab lane — reaches for prophetic material, where the hadith-wording violations were" },
  { q: "apa keutamaan sedekah dalam islam", origin: "added", why: "fadhail lane — the other place prose quotes a hadith verbatim" },
] as const;

// ── flags ───────────────────────────────────────────────────────────────────────────
const flag = (n: string): string | undefined => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
};
const BASE = flag("base") ?? "https://new-quranku.axiara.ai";
const REPEAT = Number(flag("repeat") ?? "1");

// ── the shim that makes this the READER's path and not an approximation ─────────────
// Three kinds of relative URL exist in this code: `/peta/*.json` (Peta shards, on disk here because
// there is no server), `/api/*` (the Worker — which must go to the LIVE deploy, or the whole probe
// measures nothing), and absolute URLs (delegated untouched). Routing `/api/*` to BASE is what lets
// `liveThemeModel` run unmodified, which is what makes `modelThemes` the reader's themes rather than
// the empty array the unit tests pass. Grounding differs materially between the two: `bolehkah aku
// pacaran` retrieves NOTHING on `[]` and is answerable with real themes.
type FetchArgs = Parameters<typeof fetch>;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: FetchArgs[0], init?: FetchArgs[1]) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as { url: string }).url;
  if (/^https?:\/\//i.test(url)) return realFetch(input, init);
  if (url.startsWith("/api/")) return realFetch(`${BASE}${url}`, init);
  const text = await Bun.file(`web/public${url.startsWith("/") ? url : "/" + url}`).text();
  return { ok: true, json: async () => JSON.parse(text) } as unknown as Response;
}) as typeof fetch;

const CORPUS_PATH = "web/public/corpus.json";
if (!(await Bun.file(CORPUS_PATH).exists())) {
  console.error(`✗ ${CORPUS_PATH} not found — run \`bun run app:corpus\` first.`);
  process.exit(1);
}
const corpus = (await Bun.file(CORPUS_PATH).json()) as Corpus;

// ── one live turn ───────────────────────────────────────────────────────────────────
interface Row {
  readonly q: string;
  readonly origin: string;
  readonly themes: number;
  readonly verses: number;
  readonly entries: number;
  /** Did the Qur'an lane qualify only on a feeling? Opens the hadith lane. */
  readonly weak: boolean;
  /**
   * The Worker's own `dalil` report, flattened.
   *
   * WHY IT IS HERE NOW. The 2026-08-17 (late-4) handoff's instruction for ISC-484 was "check the
   * response body's `dalil` report — `records>0` with an empty `hadith` array means retrieval worked
   * and the model declined to cite". This probe — the instrument that same handoff named for the
   * job — read only `answer` and `blocked` off that body and threw the rest away, so the check it
   * was pointed at had to be done by a second, unrecorded script. An instrument that cannot answer
   * the question it is cited for is the blind-instrument failure this repo keeps paying for.
   *
   * `cited` is the length of the response's `hadith` array: how many of the offered hadith the
   * answer actually carried a resolving marker for. `offered>0` with `cited:0` on an ANSWERED turn
   * is the model declining to cite; on a `blocked:bad_hadith` turn it is the model attributing
   * without a receipt. Those are different failures and the bucket alone cannot separate them.
   */
  readonly offered: number;
  readonly records: number;
  readonly cited: number;
  readonly dalilMs: number | null;
  readonly failed: string | null;
  /** The outcome bucket, as the READER experiences it. */
  readonly bucket: string;
  /**
   * `wordingShape` re-run on the prose the deployed Worker RETURNED.
   *
   * This is the only guard that can be honestly re-run here, and that is deliberate. `wordingShape`
   * is marker-blind and takes prose alone, so it needs nothing the Worker knows and this probe does
   * not. `hadithShape` would need the Worker's `isGroundedHadith`, which lives behind Vectorize; the
   * previous session's habit of pinning that predicate to `() => false` and calling the result a
   * measurement is exactly the blind instrument this file exists to avoid. A hit here means the
   * DEPLOYED wall passed something this BUILD would refuse — i.e. the deploy did not take.
   */
  readonly leak: string;
  readonly words: number;
  readonly ms: number;
  /** Raw prose, kept so a surprising bucket can be read rather than guessed at. */
  readonly prose: string;
}

async function turn(p: Probe): Promise<Row> {
  // The reader's themes, from the live classifier — not `[]`. See the shim note above.
  let themes: string[] = [];
  try {
    themes = await understandThemes(p.q, corpus.themes, liveThemeModel, () => []);
  } catch {
    themes = [];
  }
  const g = await gatherGrounding(corpus, p.q, themes);
  const base = {
    q: p.q,
    origin: p.origin,
    themes: themes.length,
    verses: g.verses.length,
    entries: g.entries.length,
    weak: g.weakVerses,
    offered: 0,
    records: 0,
    cited: 0,
    dalilMs: null as number | null,
    failed: null as string | null,
    prose: "",
  };
  if (g.verses.length === 0 && g.entries.length === 0) {
    return { ...base, bucket: "no-grounding", leak: "-", words: 0, ms: 0 };
  }
  const t0 = performance.now();
  try {
    const res = await realFetch(`${BASE}/api/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      // `weakVerses` must be sent or this probe silently measures the OLD cascade: the Worker reads
      // it as a strict `=== true`, so an omission is indistinguishable from "the Qur'an lane
      // answered properly" and the hadith lane stays shut. The probe posts the body the browser
      // posts, and this is now part of that body.
      body: JSON.stringify({
        question: p.q,
        verses: g.verses,
        entries: g.entries,
        weakVerses: g.weakVerses,
      }),
    });
    const ms = Math.round(performance.now() - t0);
    if (!res.ok) return { ...base, bucket: `http:${res.status}`, leak: "-", words: 0, ms };
    const data = (await res.json()) as {
      answer?: string | null;
      blocked?: string | null;
      hadith?: unknown[];
      dalil?: { offered?: number; records?: number; failed?: string | null; ms?: { total?: number } | null };
    };
    // The retrieval story travels with the row from here on, so a surprising bucket can be read
    // against what the model was actually handed rather than guessed at.
    const dalil = {
      offered: data.dalil?.offered ?? 0,
      records: data.dalil?.records ?? 0,
      cited: data.hadith?.length ?? 0,
      dalilMs: data.dalil?.ms?.total ?? null,
      failed: data.dalil?.failed ?? null,
    };
    if (typeof data.answer === "string" && data.answer.length > 0) {
      const w = wordingShape(data.answer);
      return {
        ...base,
        ...dalil,
        bucket: "answered",
        leak: w === null ? "clean" : `LEAK:${w.slice(0, 40)}`,
        words: data.answer.split(/\s+/).length,
        ms,
        prose: data.answer,
      };
    }
    return {
      ...base,
      ...dalil,
      bucket: data.blocked ? `blocked:${data.blocked}` : "null:no-reason",
      leak: "-",
      words: 0,
      ms,
    };
  } catch (e) {
    return { ...base, bucket: `error:${(e as Error).message.slice(0, 40)}`, leak: "-", words: 0, ms: Math.round(performance.now() - t0) };
  }
}

// ── run ─────────────────────────────────────────────────────────────────────────────
console.log(`Base: ${BASE} | ${PROBES.length} questions × ${REPEAT} = ${PROBES.length * REPEAT} turns\n`);

// Warm the edge. The first request after a deploy can serve stale, and this repo has twice judged a
// deploy on it. This turn is DISCARDED.
await turn(PROBES[0]!);

const rows: Row[] = [];
for (let r = 0; r < REPEAT; r += 1) {
  for (const p of PROBES) {
    const row = await turn(p);
    rows.push(row);
    console.log(
      `${row.bucket.padEnd(22)} ${String(row.themes).padStart(2)}t/${String(row.verses).padStart(2)}v/${String(row.entries).padStart(2)}e${row.weak ? " WEAK" : "     "}` +
        `  h${row.offered}→${row.records}→${row.cited}  ${String(row.ms).padStart(6)}ms  ${row.leak.padEnd(8)} ${row.q}`,
    );
  }
}

const buckets = new Map<string, number>();
for (const r of rows) buckets.set(r.bucket, (buckets.get(r.bucket) ?? 0) + 1);

console.log(`\n── every outcome bucket (${rows.length} turns) ──`);
for (const [b, n] of [...buckets].sort((a, b2) => b2[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${((n / rows.length) * 100).toFixed(0).padStart(3)}%  ${b}`);
}
// THE SPLIT THAT MATTERS FOR ISC-484/487, and the reason `dalil` is now on the row.
//
// A turn where the model was handed hadith is a materially different turn from one where it was
// not: a bigger user message, a second citation grammar to satisfy, and a whole extra refusal mode
// (`bad_hadith`) that simply cannot fire without them. Averaging the two together produced the
// single "answered turns average 12.2 s" figure the last checkpoint reported, which is a mean over
// two populations. Split here so the cost of carrying hadith is visible rather than blended away.
//
// This is a COMPARISON WITHIN ONE RUN, over turns that differ in what retrieval happened to return
// — not a control arm. It cannot tell you what these same questions would have done without their
// hadith; only re-posting the identical body with the lane shut can do that. Read it as "what does
// a hadith-carrying turn cost", never as "the cascade caused this".
const withH = rows.filter((r) => r.records > 0);
const withoutH = rows.filter((r) => r.records === 0 && r.bucket !== "no-grounding");
const stat = (rs: typeof rows, label: string) => {
  // An EMPTY arm prints and says so. Silently dropping the line makes "this run had no such turns"
  // look identical to "this side was never measured", and the whole point of the split is that a
  // reader can see BOTH sides — including the run where one side is empty, which is itself the
  // finding (every grounded turn carried hadith, so this run contains no within-run comparison).
  if (rs.length === 0) {
    console.log(`  ${label.padEnd(26)}   0 turns — none in this run, so no comparison is available`);
    return;
  }
  const ans = rs.filter((r) => r.bucket === "answered");
  const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  console.log(
    `  ${label.padEnd(26)} ${String(rs.length).padStart(3)} turns · answered ${String(ans.length).padStart(2)}/${rs.length}` +
      ` (${Math.round((ans.length / rs.length) * 100)}%) · mean ${String(mean(rs.map((r) => r.ms))).padStart(6)}ms` +
      ` · answered mean ${String(mean(ans.map((r) => r.ms))).padStart(6)}ms`,
  );
};
console.log(`\n── the cost of carrying hadith (within-run comparison, NOT a control arm) ──`);
stat(withH, "hadith offered to model");
stat(withoutH, "no hadith (grounded turns)");
const uncited = withH.filter((r) => r.bucket === "answered" && r.cited === 0);
console.log(
  `  answered WITH hadith but citing none: ${uncited.length}/${withH.filter((r) => r.bucket === "answered").length}` +
    ` — the model was offered a receipt and wrote around it`,
);

const leaks = rows.filter((r) => r.leak.startsWith("LEAK"));
console.log(`\nLeaks past the deployed wall (wordingShape on returned prose): ${leaks.length}`);
for (const l of leaks) console.log(`  ${l.leak}  ${l.q}`);

// Dump every answered turn's prose, so a bucket count is never the only evidence on the record.
const OUT = flag("dump");
if (OUT) {
  await Bun.write(OUT, JSON.stringify(rows, null, 2));
  console.log(`\nRaw rows → ${OUT}`);
}
