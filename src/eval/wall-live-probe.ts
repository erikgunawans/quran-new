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
 * WHY IT IS NOT `curl`. A bare curl invents its own grounding, and the grounded and ungrounded paths
 * have different behaviour: measured elsewhere in this repo, an ungrounded turn still ANSWERS (46/46)
 * but reaches the fitting ayah only 35% of the time against 96% grounded — a citation gap, not an
 * answer gap. Do not restate those two numbers as answered rates; they are cite rates (ISC-418).
 * Reader conditions mean the browser retrieved first and posted what it found, so this probe runs
 * the SAME `gatherGrounding` prod's front end runs and posts the SAME body shape `answer-live.ts`
 * posts: `{question, verses, entries, weakVerses}`.
 *
 * AND IT POSTS EVEN WHEN RETRIEVAL FOUND NOTHING (2026-08-21). It did not until now, and that was
 * the instrument's single largest blind spot: Erik's always-answer ruling deleted the client-side
 * bow-out, so an empty-grounding question is exactly the case the app changed for — and it was the
 * one case this probe declined to ask. See `Row.grounded`, and read the two ARMS in the report
 * rather than the headline bucket table, which now spans two populations.
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
  /**
   * The REFS posted as grounding — not just how many.
   *
   * `scripture-echo` anchors its paraphrase axis on the ayahs a turn cited or was handed, and
   * without this field the only anchors available are the refs the prose itself names. That makes
   * an UNCITED re-worded rendering of a verse the model was handed invisible, which is precisely
   * the shape ISC-419's open seam has. A count cannot serve as an anchor; the refs can.
   */
  readonly verseRefs: readonly string[];
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
  /**
   * The Worker's `gen` diagnostic (ISC-532) — PER-ATTEMPT, which is the whole point.
   *
   * WHY IT IS HERE NOW. ISC-535 needs a percentile of the measured GENERATION distribution and
   * ISC-536 forbids moving `MIN_RETRY_MS` until that distribution exists. This probe is the
   * instrument both criteria point at, and until now it read `answer`, `blocked`, `hadith` and
   * `dalil` off the response and dropped `gen` on the floor — so it could report how a turn ENDED
   * but never how long each attempt ran, nor whether a second attempt happened, nor whether that
   * second attempt SUCCEEDED. That last number is the one ISC-536 says no instrument in this repo
   * can see, and it has been on the wire since ISC-532 shipped.
   *
   * `row.ms` is NOT a substitute: it is the wall-clock of the whole POST, so it carries retrieval,
   * the network, and both attempts blended into one figure. A percentile taken from it would set
   * `MIN_RETRY_MS` from the wrong distribution — the same class of arithmetic error as the 6_000 it
   * would be replacing.
   */
  readonly attempts: readonly { readonly ms: number; readonly budgetMs: number; readonly outcome: string }[];
  /** How the generation LOOP terminated, server-side: `deadline` | `blocked` | `ok` | … */
  readonly genReason: string | null;
  /**
   * WHICH CHECK earned the refusal — `gen.rule`, added 2026-08-20 (late).
   *
   * `blocked` is the READER's verdict and two different checks report `own_wording`
   * (`wordingShape` and `scriptureEchoShape`), with two more reporting `bad_hadith`. So the bucket
   * this probe already prints could not attribute the echo wall's live effect at all: post-deploy
   * `own_wording` moved 4/24 → 5/24 against a run-to-run spread documented at 46% vs 25% on
   * IDENTICAL code, and no instrument in the project could say which wall produced any of the five.
   * A whole-run bucket total is not evidence here; with the rule on the row it can at least become
   * a paired one.
   */
  readonly genRule: string | null;
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
  /**
   * Did retrieval hand this turn ANYTHING — `verses.length + entries.length > 0`?
   *
   * WHY IT IS HERE NOW (2026-08-21). Until this field existed, a turn that retrieved nothing was
   * not measured at all: `turn()` returned `no-grounding` at 0 ms **without posting**, encoding the
   * client-side bow-out that `web/src/answer.ts` used to run before the network call. Erik's
   * always-answer ruling DELETED that bow-out on 2026-08-21 (ISC-418 reversed, both gates removed),
   * and `answer-live.ts:102-109` now posts the same four-field body unconditionally, `verses: []`
   * and `entries: []` included. The probe kept the old contract and so was structurally blind to
   * the largest change of that session.
   *
   * Ask the disqualifying question the way this repo has learned to: **what would the old probe
   * print if the always-answer change were REVERTED?** For `apa yang al quran katakan tentang
   * neraka`: `no-grounding`, 0 ms — byte-identical, feature present or absent. Meanwhile prod
   * answers that exact body in 7.0–12.9 s with `gen.reason: answered` on the FIRST attempt.
   *
   * The field is not a bucket. It is the ARM a turn belongs to, because the ungrounded path is a
   * different population with a different refusal profile, and averaging the two produces a mean
   * over two populations — the same error this file already calls out for hadith-carrying turns.
   */
  readonly grounded: boolean;
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
    verseRefs: g.verses.map((v) => v.ref),
    weak: g.weakVerses,
    offered: 0,
    records: 0,
    cited: 0,
    dalilMs: null as number | null,
    failed: null as string | null,
    attempts: [] as Row["attempts"],
    genReason: null as string | null,
    genRule: null as string | null,
    prose: "",
    grounded: g.verses.length + g.entries.length > 0,
  };
  // NO SHORT-CIRCUIT. The turn is posted whatever retrieval returned — see `Row.grounded`.
  //
  // What used to stand here returned `{bucket:"no-grounding", ms:0}` without a request, which made
  // "the reader got nothing" and "the probe declined to ask" the same row. They are opposites now:
  // a zero-grounding question is precisely the case Erik's ruling was ABOUT, so it is the one row
  // the instrument must never skip.
  const t0 = performance.now();
  try {
    const res = await realFetch(`${BASE}/api/answer`, {
      method: "POST",
      // ISC-655 — DECLARE THAT THIS IS AN INSTRUMENT. Without it the Worker logs every question
      // below into D1 `events` exactly as if a reader had asked it: an unauthenticated POST still
      // resolves an anonymous `identity.userId`. Measured 2026-08-24, that put 39 rows across 36
      // distinct ids into the table with not one reader among them, and they had to be deleted by
      // hand. The header suppresses that one write and nothing else — it cannot change the answer,
      // and the Worker's side of it is `worker/src/probe-marker.ts`.
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-QuranKu-Probe": "1" },
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
      gen?: {
        attempts?: { ms?: number; budgetMs?: number; outcome?: string }[];
        reason?: string | null;
        rule?: string | null;
      } | null;
    };
    // The retrieval story travels with the row from here on, so a surprising bucket can be read
    // against what the model was actually handed rather than guessed at.
    const dalil = {
      offered: data.dalil?.offered ?? 0,
      records: data.dalil?.records ?? 0,
      cited: data.hadith?.length ?? 0,
      dalilMs: data.dalil?.ms?.total ?? null,
      failed: data.dalil?.failed ?? null,
      // A Worker that predates ISC-532 sends no `gen` at all. That must read as "the diagnostic is
      // ABSENT", not as "this turn ran zero attempts" — an empty array in a percentile is a silent
      // zero. `genReason` stays null in that case and the report says so out loud.
      attempts: (data.gen?.attempts ?? []).map((a) => ({
        ms: a.ms ?? 0,
        budgetMs: a.budgetMs ?? 0,
        outcome: a.outcome ?? "?",
      })),
      genReason: data.gen?.reason ?? null,
      genRule: data.gen?.rule ?? null,
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
      `${row.bucket.padEnd(22)} ${row.grounded ? " " : "U"}${String(row.themes).padStart(2)}t/${String(row.verses).padStart(2)}v/${String(row.entries).padStart(2)}e${row.weak ? " WEAK" : "     "}` +
        `  h${row.offered}→${row.records}→${row.cited}  ${String(row.ms).padStart(6)}ms  ${row.leak.padEnd(8)} ${row.q}`,
    );
  }
}

// THE INVARIANT THAT REPLACES THE SHORT-CIRCUIT, asserted rather than commented.
//
// A source comment saying "always post" is not a guard; the previous contract also read as
// deliberate. `ms === 0` is a TRIPWIRE for the old early return if this run actually includes an
// ungrounded turn, not proof that the arm was exercised. It can also fire on a very fast `!res.ok`
// or thrown request path, because `ms` is local wall-clock rounded to milliseconds.
//
// So the FALSIFIER is the UNGROUNDED arm count below, never this exit code. The live theme
// classifier is nondeterministic (see the shim note above), so a run can contain no ungrounded turn
// at all — and on that run this check is green and the output is byte-identical to what a REINSTATED
// early return would print. A run reporting `UNGROUNDED  0 turns` has not tested Erik's always-answer
// ruling and must not be cited as though it had.
const unposted = rows.filter((r) => r.ms === 0);
if (unposted.length > 0) {
  console.error(
    `\n✗ ${unposted.length} turn(s) recorded 0 ms — either a turn short-circuited before the POST` +
      ` or a failed request rounded to zero.` +
      ` This probe measures the always-answer app; a turn it declines to ask is a false negative,` +
      ` not a result. Questions: ${unposted.map((r) => r.q).join(" · ")}`,
  );
  process.exitCode = 1;
}

const buckets = new Map<string, number>();
for (const r of rows) buckets.set(r.bucket, (buckets.get(r.bucket) ?? 0) + 1);

console.log(
  `\n⚠ COMPARABILITY BREAK — before 2026-08-21 this probe returned \`no-grounding\` at 0 ms WITHOUT` +
    ` posting, so ungrounded turns were absent from every earlier bucket total. Do not read the` +
    ` table below against a figure recorded before that date.`,
);
console.log(`\n── every outcome bucket (${rows.length} turns) ──`);
for (const [b, n] of [...buckets].sort((a, b2) => b2[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${((n / rows.length) * 100).toFixed(0).padStart(3)}%  ${b}`);
}

// ── THE GROUNDED / UNGROUNDED ARMS, and the comparability break that rides with them ────────────
//
// The break these arms explain is printed ABOVE the bucket table rather than here, because a
// warning that follows the number it qualifies is read second and quoted never. From 2026-08-21
// the table includes turns retrieval handed NOTHING, which earlier runs of this file never posted
// at all — so its percentages are computed over a LARGER population than every figure in
// `PROGRESS.md` before that date. They are not a continuation of that series.
//
// The arms are kept apart for the reason the hadith split already exists: measured elsewhere in
// this repo, an ungrounded turn ANSWERED in 46 of 46 samples while citing the fitting ayah only 35%
// of the time against 96% grounded — so they are two populations on the axis that matters, and one
// mean over both describes neither. (35/96 are CITE rates from ISC-418, never answered rates, and
// that record carries no grounded ANSWERED rate, so no reliability comparison is made here.) An ungrounded turn is also the ONLY turn that can show
// whether Erik's always-answer ruling actually reaches a reader, which is why it must be visible as
// its own row and never absorbed into a headline.
const armed = (rs: readonly Row[], label: string): void => {
  if (rs.length === 0) {
    console.log(`  ${label.padEnd(28)}   0 turns — none in this run; this arm was not measured`);
    return;
  }
  const ans = rs.filter((r) => r.bucket === "answered");
  console.log(
    `  ${label.padEnd(28)} ${String(rs.length).padStart(3)} turns · answered ${String(ans.length).padStart(2)}/${rs.length}` +
      ` (${Math.round((ans.length / rs.length) * 100)}%)`,
  );
};
console.log(`\n── the two ARMS: did retrieval hand this turn anything? ──`);
armed(rows.filter((r) => r.grounded), "grounded (verses or entries)");
armed(rows.filter((r) => !r.grounded), "UNGROUNDED (nothing retrieved)");

// ── WHICH TURNS COULD THE ECHO WALL EVEN FIRE ON? ───────────────────────────────────────────────
//
// `worker/src/index.ts:829` hands the echo wall `verses.map(v => ({ref, texts:[v.text]}))`, so a
// turn that retrieved ZERO verses gives `scriptureEchoShape` an empty array and the rule is INERT —
// not silent because the prose was clean, silent because there was nothing to compare it against.
// Verified as a paired control on 2026-08-21: identical prose echoing QS 65:7's shipped wording
// scored `rules:["echo"]` with the verse present and `rules:[]` with `scripture: []`.
//
// Printed because a count of `rule:"echo"` refusals is meaningless without it. Zero echo blocks
// across a run whose turns were mostly verse-less is a number that could never have been anything
// else — the shape this repo files under "evidence that could never have failed". Note too that
// the always-answer change PUSHES this the wrong way: it sends more verse-less turns to the model,
// and every one of them is a turn the echo wall cannot police.
const echoEligible = rows.filter((r) => r.verses > 0);
const echoBlocked = rows.filter((r) => r.genRule === "echo");
console.log(
  `\n── echo wall (ISC-419) eligibility ──\n` +
    `  ${echoEligible.length}/${rows.length} turns retrieved ≥1 verse, so \`rule:"echo"\` could fire on` +
    ` ${echoEligible.length} of them and was INERT on the other ${rows.length - echoEligible.length}.` +
    `\n  observed \`rule:"echo"\` refusals: ${echoBlocked.length}` +
    ` — read this ONLY against the ${echoEligible.length}, never against ${rows.length}.`,
);

// ── TURNS THE READER NEVER SAW, whatever the bucket says ────────────────────────────────────────
//
// `web/src/answer-live.ts` aborts at `TIMEOUT_MS` (30 s). A turn that returns after that is a
// timeout to the reader no matter how the Worker classified it — an `answered` row past the abort
// delivered nothing, and a `blocked` row past it was not a refusal the reader experienced either.
// Counting refusals without this line attributes to the guard what the clock actually took.
const CLIENT_ABORT_MS = 30_000;
const pastAbort = rows.filter((r) => r.ms > CLIENT_ABORT_MS);
console.log(
  `\n── past the browser's ${CLIENT_ABORT_MS} ms abort (reader saw NOTHING) ──\n` +
    `  ${pastAbort.length}/${rows.length} turns` +
    (pastAbort.length
      ? `\n${pastAbort.map((r) => `    ${String(r.ms).padStart(6)}ms  ${r.bucket.padEnd(22)} ${r.q}`).join("\n")}`
      : ""),
);
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
// The `!== "no-grounding"` term that used to sit here was NOT a no-op, and dropping it outright
// WIDENED this arm rather than tidying it. The population it excluded did not cease to exist when
// the early return did — it MOVED, out of a bucket string and into real posted rows carrying
// `grounded: false`. So the exclusion is re-expressed against the field, not deleted.
//
// It has to stay, because an ungrounded turn can never reach the OTHER arm. The hadith lane is gated
// on `entries.length > 0 || weakVerses` (`worker/src/index.ts:648`); `entries` fills only when
// `verses.length === 0` (`web/src/answer.ts:101`); and `weakVerses` requires `verses.length > 0`
// (`web/src/answer.ts:141`). A turn with neither verses nor entries is therefore hadith-INELIGIBLE
// by construction and its `records` is always 0. Every ungrounded turn would pile into `withoutH`
// and none into `withH`, diluting the no-hadith side with a population that differs from it on
// latency and body size — so the comparison would move with a KNOWN SIGN, making hadith-
// carrying turns look better for a reason that is not hadith. That is the confound the section
// header two comments up already forbids.
const withoutH = rows.filter((r) => r.records === 0 && r.grounded);
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

// ── the GENERATION distribution (ISC-535) and the retry's actual yield (ISC-536) ────────────────
//
// Read per-ATTEMPT, never per-turn. `MIN_RETRY_MS` gates whether a SECOND attempt is admitted, so
// the only distribution that can set it is the distribution of how long ONE attempt takes. The
// question the threshold has to answer is "if I admit a retry with X ms of budget left, will it
// finish?" — and that is answered by the attempt percentiles below, not by turn wall-clock.
//
// A turn whose Worker sent no `gen` is EXCLUDED and counted separately. Folding it in as zero
// attempts would drag every percentile down and make a stale deploy look like a fast one.
const withGen = rows.filter((r) => r.genReason !== null || r.attempts.length > 0);
// Same retired term as above. An UNGROUNDED turn now belongs in this population by right: it is
// posted, so a missing `gen` on it means the same thing it means anywhere else — a stale deploy.
const noGen = rows.filter((r) => r.genReason === null && r.attempts.length === 0);
const allAttempts = withGen.flatMap((r) => r.attempts);
console.log(`\n── generation distribution, PER ATTEMPT (ISC-535) ──`);
console.log(`  ⚠ mixes grounded and ungrounded turns; ungrounded rows post smaller bodies and can skew these percentiles low.`);
if (noGen.length > 0) {
  console.log(`  ⚠ ${noGen.length} turn(s) returned NO \`gen\` block — excluded, not counted as zero.`);
  console.log(`    That means the Worker answering them predates ISC-532. Check what is deployed before reading on.`);
}
if (allAttempts.length === 0) {
  console.log(`  no attempts observed — nothing here can set a threshold`);
} else {
  const pct = (xs: number[], p: number) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
  };
  const ms = allAttempts.map((a) => a.ms);
  console.log(
    `  ${allAttempts.length} attempts over ${withGen.length} turns` +
      ` · min ${pct(ms, 0)} · p25 ${pct(ms, 25)} · median ${pct(ms, 50)} · p75 ${pct(ms, 75)}` +
      ` · p90 ${pct(ms, 90)} · max ${pct(ms, 100)} ms`,
  );
  // Split by outcome: an attempt KILLED by its budget did not "take" that long, it was cut off
  // there. Blending truncated attempts into a completion-time percentile inflates the estimate of
  // how long a generation needs, which is the opposite of the error `MIN_RETRY_MS = 6_000` makes,
  // and just as wrong.
  const byOutcome = new Map<string, number[]>();
  for (const a of allAttempts) byOutcome.set(a.outcome, [...(byOutcome.get(a.outcome) ?? []), a.ms]);
  for (const [o, xs] of [...byOutcome].sort((a, b) => b[1].length - a[1].length)) {
    console.log(
      `    ${String(xs.length).padStart(3)}  ${o.padEnd(24)} median ${String(pct(xs, 50)).padStart(6)} ms` +
        ` · max ${String(pct(xs, 100)).padStart(6)} ms${o === "threw" ? "   ← CUT OFF at budget, not a completion time" : ""}`,
    );
  }
  // ISC-536's blocker, stated in its own terms: it forbids raising `MIN_RETRY_MS` because "some of
  // those retries are currently SUCCEEDING" and no instrument can see per-attempt outcomes. It can
  // now. These two lines are that number.
  const retried = withGen.filter((r) => r.attempts.length > 1);
  const retrySaved = retried.filter((r) => r.bucket === "answered");
  console.log(
    `  retries admitted: ${retried.length}/${withGen.length} turns` +
      ` · of those, ${retrySaved.length} ended ANSWERED (the yield ISC-536 protects)`,
  );
  const secondAttempts = withGen.flatMap((r) => r.attempts.slice(1));
  console.log(
    `  second attempts: ${secondAttempts.length}` +
      ` · budget granted ${secondAttempts.map((a) => a.budgetMs).join(", ") || "-"} ms` +
      ` · ran ${secondAttempts.map((a) => a.ms).join(", ") || "-"} ms`,
  );
  const reasons = new Map<string, number>();
  for (const r of withGen) reasons.set(r.genReason ?? "-", (reasons.get(r.genReason ?? "-") ?? 0) + 1);
  console.log(`  terminal \`gen.reason\`: ${[...reasons].map(([k, v]) => `${k}=${v}`).join(" · ")}`);

  // WHICH WALL, not just which verdict. Printed unconditionally, including when it is all `-`:
  // a row of dashes says the deployed Worker predates `gen.rule` and this line is uninformative,
  // which is a different fact from "no rule fired" and must not read as the same one.
  const rules = new Map<string, number>();
  for (const r of withGen) rules.set(r.genRule ?? "-", (rules.get(r.genRule ?? "-") ?? 0) + 1);
  console.log(`  refusing \`gen.rule\`:  ${[...rules].map(([k, v]) => `${k}=${v}`).join(" · ")}`);
}

// ── the line that cannot fail, relabelled to what it can actually tell you ───────────
//
// This re-runs `wordingShape` on prose that the DEPLOYED `guardAnswerProse` already cleared with
// that same function. A zero is therefore true by construction — it prints 0 whether the wording fix
// shipped, was reverted, or never existed — and it was read as ISC-419 evidence for a whole session.
//
// It is not useless; it is a DEPLOY check, and only that. A non-zero means the Worker returned prose
// this build would refuse, i.e. the deploy did not take or prod is running older code. The label now
// says so, and says out loud what it cannot measure, so the number cannot be lifted out of context
// a second time. For whether an answer hand-wrote scripture, use `bun run eval:echo`, which anchors
// on the shipped corpus and shares no function with the wall.
const stale = rows.filter((r) => r.leak.startsWith("LEAK"));
console.log(
  `\nDEPLOY CHECK — prose this build would refuse but prod returned: ${stale.length}` +
    ` (non-zero ⇒ prod is running older code)`,
);
for (const l of stale) console.log(`  ${l.leak}  ${l.q}`);
console.log(
  `  ⚠ NOT an ISC-419 measurement. This re-scans with \`wordingShape\`, the very function the egress` +
    ` gate used, so a zero is tautological. Score the dump with \`eval:echo\` instead.`,
);

// Dump every answered turn's prose, so a bucket count is never the only evidence on the record.
const OUT = flag("dump");
if (OUT) {
  await Bun.write(OUT, JSON.stringify(rows, null, 2));
  console.log(`\nRaw rows → ${OUT}`);
}
