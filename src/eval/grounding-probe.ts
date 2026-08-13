/**
 * ISC-418 — does `/api/answer` actually READ the grounding it is handed?
 *
 * WHY A SEPARATE HARNESS. `answer-run.ts` measures whether an answer is faithful to the grounding
 * RETRIEVAL happened to produce. It cannot answer ISC-418, because it never varies the grounding: if
 * the model ignores the material entirely and answers from its own parametric knowledge of fiqh, a
 * judge reading "was this answer licensed by the material?" can still score it well whenever the
 * model's own knowledge happens to agree. The failure is invisible without a CONTROL.
 *
 * THE INSTRUMENT. Each case is a (question, ayah) pair where that ayah is an honest answer to that
 * question. The same question is then run under three grounding arms:
 *
 *   grounded — verses = [the fitting ayah]        (what the app intends to happen)
 *   blank    — verses = []                        (the control: what the model says unaided)
 *   decoy    — verses = [an unrelated real ayah]  (does wrong grounding move it at all?)
 *
 * THE NUMBER THAT MATTERS IS THE LIFT, NOT THE HIT RATE. `grounded` citing the fitting ayah proves
 * nothing on its own — the model may have reached for that ayah anyway. Only
 *
 *     lift = hit(grounded) − hit(blank)
 *
 * separates "the model read our material" from "the model already knew". A high hit rate with zero
 * lift is precisely the ISC-418 defect: grounding present, grounding inert.
 *
 * `decoy` is the third leg because the two failure modes are opposite and a two-arm probe cannot tell
 * them apart. Zero decoy uptake means the model discards grounding that does not match its own view
 * (ISC-416's measured behaviour). Full decoy uptake would mean the model follows whatever it is
 * handed — which would make the app's retrieval quality the whole ballgame.
 *
 * WHAT IS MEASURED IS THE RAW CANDIDATE, BEFORE THE WALL. A guard rejection is recorded but does not
 * discard the sample: ISC-418 is about what the model cites, and dropping the refused generations
 * would bias the measurement toward whatever the wall happens to let through.
 *
 * Offline against the provider directly — the same model slug prod runs (`deepseek/deepseek-v4-flash`
 * via `worker/wrangler.toml`), the same SYNTHESIS_SYSTEM_PROMPT, the same buildAnswerUserMessage,
 * the same ANSWER_PARAMS. Never pokes prod: `curl` to prod `/api/answer` is classifier-blocked.
 *
 * USAGE.
 *   bun run eval:grounding -- --dry-run     # no key, no calls — prints the exact three prompts
 *   bun run eval:grounding                  # full run, writes src/eval/reports/grounding-<ts>.md
 *   bun run eval:grounding -- --samples 3   # more samples per arm (default 2)
 *   bun run eval:grounding -- --only iri    # one case
 */
import {
  ANSWER_PARAMS,
  SYNTHESIS_SYSTEM_PROMPT,
  buildAnswerUserMessage,
  type GroundingVerse,
} from "../../web/src/answer-contract.ts";
import { guardAnswerProse, refsInProse } from "../../web/src/answer-guard.ts";
import { isRealAyah } from "../../web/src/quran.ts";
import { resolveProvider, callChatModel } from "../../worker/src/providers.ts";
import type { Env } from "../../worker/src/index.ts";

// ── the pairs ───────────────────────────────────────────────────────────────────────
//
// Every `ref` is in the curated corpus (so it is grounding the app could really produce, verbatim
// ours) AND is an honest answer to its question — the pair is chosen so that "the model used our
// material" and "the model answered well" cannot be told apart by quality alone, only by the ref.
//
// `decoy` is a real corpus verse from a plainly unrelated theme. It must be REAL: a fake ref would
// be caught by the wall and would measure the guard rather than the model.
// TWO GROUPS, AND THE SPLIT IS THE POINT. ISC-418 was born on a FIQH question ("boleh ga sih nikah
// beda agama"), where the model's parametric priors are strongest and most opinionated. A probe built
// only from the curated feelings corpus would measure the easy half — the model has no strong prior
// about which ayah comforts a lonely person, so it takes ours. `hukum` cases are situational-fiqh
// shaped, where the model arrives with an answer already. If the lift survives there, it generalises;
// if it collapses there, the defect is real but narrower than "the model is not reading them".
type Group = "feeling" | "hukum";

interface ProbeCase {
  readonly id: string;
  readonly group: Group;
  readonly question: string;
  readonly ref: string;
  readonly decoy: string;
}

const CASES: readonly ProbeCase[] = [
  { id: "iri", group: "feeling", question: "aku iri banget lihat temanku sukses terus, gimana ya", ref: "4:32", decoy: "26:80" },
  { id: "sendirian", group: "feeling", question: "aku ngerasa sendirian banget, kayak gak ada yang ngerti aku", ref: "50:16", decoy: "2:280" },
  { id: "marah", group: "feeling", question: "gimana caranya nahan marah?", ref: "41:35", decoy: "21:87" },
  { id: "ghibah", group: "feeling", question: "aku sering kepancing ikut gosipin orang, gimana biar berhenti", ref: "49:12", decoy: "94:7" },
  { id: "sombong", group: "feeling", question: "gimana caranya biar gak jadi orang sombong", ref: "31:18", decoy: "12:86" },
  { id: "anak-salat", group: "feeling", question: "anakku susah banget disuruh salat, aku harus gimana", ref: "20:132", decoy: "55:13" },
  { id: "single-parent", group: "feeling", question: "aku ngurus anak sendirian dan rasanya capek banget", ref: "19:24", decoy: "8:46" },
  { id: "keputusan", group: "feeling", question: "aku bingung mau ambil keputusan besar dalam hidupku", ref: "42:38", decoy: "3:185" },
  { id: "takut-miskin", group: "feeling", question: "aku takut banget kekurangan uang sampai gak berani sedekah", ref: "2:268", decoy: "17:24" },
  { id: "mulai-lagi", group: "feeling", question: "aku pengen mulai hidup baru dari nol, pindah dan tinggalin semuanya", ref: "4:100", decoy: "27:19" },

  { id: "utang", group: "hukum", question: "temanku belum bisa bayar utangnya ke aku, secara islam aku harus gimana", ref: "2:280", decoy: "93:5" },
  { id: "cerai", group: "hukum", question: "istriku minta cerai, apa kata islam soal ini", ref: "4:130", decoy: "14:7" },
  { id: "prasangka", group: "hukum", question: "bolehkah aku curiga dan nyari-nyari kesalahan tetanggaku", ref: "49:12", decoy: "10:58" },
  { id: "nafkah-ortu", group: "hukum", question: "apakah aku wajib menafkahi orang tuaku yang sudah tua dan sakit-sakitan", ref: "46:15", decoy: "18:24" },
  { id: "anak-murtad", group: "hukum", question: "anakku meninggalkan agama, apa kewajibanku sebagai orang tua", ref: "28:56", decoy: "51:22" },
  { id: "sedekah-nyakitin", group: "hukum", question: "aku sedekah tapi sering aku ungkit-ungkit, apakah sedekahku batal", ref: "2:263", decoy: "30:54" },
];

// ── flags ───────────────────────────────────────────────────────────────────────────
const flag = (n: string): string | undefined => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 ? (process.argv[i + 1] ?? "") : undefined;
};
const has = (n: string): boolean => process.argv.includes(`--${n}`);

const DRY_RUN = has("dry-run");
const ONLY = flag("only");
const SAMPLES = flag("samples") ? Number(flag("samples")) : 2;
const TEMP = flag("temp") ? Number(flag("temp")) : ANSWER_PARAMS.temperature;
const MODEL = flag("model");
const CONCURRENCY = flag("concurrency") ? Number(flag("concurrency")) : 6;

const cases = CASES.filter((c) => (ONLY ? c.id.includes(ONLY) : true));
if (cases.length === 0) {
  console.error(`No cases matched --only ${ONLY}.`);
  process.exit(1);
}

// ── corpus (the shipped artifact — grounding must be verbatim ours) ─────────────────
const CORPUS_PATH = "web/public/corpus.json";
if (!(await Bun.file(CORPUS_PATH).exists())) {
  console.error(`✗ ${CORPUS_PATH} not found — run \`bun run app:corpus\` first.`);
  process.exit(1);
}
interface CorpusVerse {
  ref: string;
  surah_name: string;
  primary?: { text: string };
  companion?: { text: string };
}
const corpus = (await Bun.file(CORPUS_PATH).json()) as { verses: CorpusVerse[] };
const byRef = new Map(corpus.verses.map((v) => [v.ref, v]));

/** Build grounding exactly as `gatherGrounding` does — primary translation, else companion. */
function verseFor(ref: string): GroundingVerse {
  const v = byRef.get(ref);
  if (!v) {
    console.error(`✗ ${ref} is not in the curated corpus — the probe may only ground on verses the app can really send.`);
    process.exit(1);
  }
  return { ref: v.ref, surah_name: v.surah_name, text: v.primary?.text ?? v.companion?.text ?? "" };
}

type Arm = "grounded" | "blank" | "decoy";
const ARMS: readonly Arm[] = ["grounded", "blank", "decoy"];

const versesFor = (c: ProbeCase, arm: Arm): GroundingVerse[] =>
  arm === "grounded" ? [verseFor(c.ref)] : arm === "decoy" ? [verseFor(c.decoy)] : [];

const messageFor = (c: ProbeCase, arm: Arm): string =>
  buildAnswerUserMessage({ question: c.question, verses: versesFor(c, arm), entries: [] });

// ── dry run ─────────────────────────────────────────────────────────────────────────
if (DRY_RUN) {
  console.log("═══ DRY RUN — exact prompts, no API calls ═══\n");
  console.log(`Cases: ${cases.length} | arms: ${ARMS.length} | samples: ${SAMPLES} → ${cases.length * ARMS.length * SAMPLES} calls\n`);
  for (const c of cases) {
    console.log(`\n── [${c.id}] grounded=${c.ref} decoy=${c.decoy} ──`);
    for (const arm of ARMS) console.log(`\n▸ ${arm}\n${messageFor(c, arm)}`);
  }
  process.exit(0);
}

// ── live ────────────────────────────────────────────────────────────────────────────
if (MODEL) process.env["OPENROUTER_MODEL"] = MODEL;
const env = {
  OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"],
  OPENROUTER_MODEL: process.env["OPENROUTER_MODEL"],
} as unknown as Env;

let cfg: ReturnType<typeof resolveProvider>;
try {
  cfg = resolveProvider("openrouter", env);
} catch (e) {
  console.error(`✗ ${(e as Error).message}\n  Set OPENROUTER_API_KEY, or use --dry-run.`);
  process.exit(1);
}
console.log(
  `Model: ${cfg.model} | temp: ${TEMP} | ${cases.length} cases × ${ARMS.length} arms × ${SAMPLES} samples = ${cases.length * ARMS.length * SAMPLES} calls\n`,
);

interface Sample {
  readonly id: string;
  readonly arm: Arm;
  readonly n: number;
  readonly prose: string;
  readonly refs: string[];
  /** Did the model cite the ayah THIS arm was grounded on? (blank has nothing to hit.) */
  readonly hitGrounded: boolean;
  readonly hitDecoy: boolean;
  readonly guardOk: boolean;
  /** The rule that stopped the raw candidate, if any — prod's `blocked` channel, measured here. */
  readonly blocked: string | null;
  readonly error: string | null;
}

const jobs: { c: ProbeCase; arm: Arm; n: number }[] = [];
for (const c of cases) for (const arm of ARMS) for (let n = 0; n < SAMPLES; n += 1) jobs.push({ c, arm, n });

async function runOne(job: { c: ProbeCase; arm: Arm; n: number }): Promise<Sample> {
  const { c, arm, n } = job;
  const base = { id: c.id, arm, n } as const;
  let prose = "";
  try {
    prose =
      (await callChatModel(cfg, SYNTHESIS_SYSTEM_PROMPT, messageFor(c, arm), {
        temperature: TEMP,
        maxTokens: ANSWER_PARAMS.maxTokens,
      }))?.trim() ?? "";
  } catch (e) {
    process.stdout.write("✗");
    return { ...base, prose: "", refs: [], hitGrounded: false, hitDecoy: false, guardOk: false, blocked: null, error: (e as Error).message };
  }
  const refs = refsInProse(prose);
  // The wall prod runs, on the raw candidate — recorded, never used to discard the sample.
  const verdict = guardAnswerProse(prose, isRealAyah, () => false);
  const hitGrounded = arm === "grounded" ? refs.includes(c.ref) : arm === "decoy" ? refs.includes(c.decoy) : false;
  const s: Sample = {
    ...base,
    prose,
    refs,
    hitGrounded,
    hitDecoy: refs.includes(c.decoy),
    guardOk: verdict.ok,
    blocked: verdict.violations[0]?.kind ?? null,
    error: null,
  };
  process.stdout.write(arm === "blank" ? (refs.includes(c.ref) ? "B" : "b") : s.hitGrounded ? "●" : "○");
  return s;
}

const samples: Sample[] = [];
for (let i = 0; i < jobs.length; i += CONCURRENCY) {
  samples.push(...(await Promise.all(jobs.slice(i, i + CONCURRENCY).map(runOne))));
}
process.stdout.write("\n\n");

// ── aggregate ───────────────────────────────────────────────────────────────────────
const of = (arm: Arm) => samples.filter((s) => s.arm === arm && !s.error);
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((n / d) * 100).toFixed(0)}% (${n}/${d})`);

/** Did the answer cite the case's FITTING ayah — asked of every arm, including the ones not given it. */
const citedFitting = (s: Sample) => s.refs.includes(CASES.find((c) => c.id === s.id)!.ref);

const gr = of("grounded");
const bl = of("blank");
const dc = of("decoy");

const hitG = gr.filter(citedFitting).length;
const hitB = bl.filter(citedFitting).length;
const hitDdecoy = dc.filter((s) => s.hitGrounded).length; // decoy arm citing the decoy it was handed
const hitDfitting = dc.filter(citedFitting).length; // decoy arm reaching for the right ayah anyway

const rateG = gr.length ? hitG / gr.length : 0;
const rateB = bl.length ? hitB / bl.length : 0;
const lift = rateG - rateB;

const lines: string[] = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

say("═══ ISC-418 — grounding adherence ═══");
say();
say(`grounded → cites the ayah it was handed : ${pct(hitG, gr.length)}`);
say(`blank    → cites that ayah unaided      : ${pct(hitB, bl.length)}   ← the control`);
say(`LIFT (grounded − blank)                 : ${(lift * 100).toFixed(0)} pts`);
say();
say(`decoy    → cites the WRONG ayah it was handed : ${pct(hitDdecoy, dc.length)}`);
say(`decoy    → reaches the fitting ayah anyway    : ${pct(hitDfitting, dc.length)}`);
say();
say(`blank arm answered at all (never silent): ${pct(bl.filter((s) => s.prose.length > 0).length, bl.length)}`);
say(`guard cleared (raw candidate, all arms) : ${pct(samples.filter((s) => s.guardOk).length, samples.filter((s) => !s.error).length)}`);
// Prod BREAKS on bad_hadith rather than retrying (worker/src/index.ts:554), so a bad_hadith rejection
// is not a fluke to be re-rolled — it is the reader getting {answer:null} and the pointer copy.
const byKind = new Map<string, number>();
for (const s of samples) if (!s.error && s.blocked) byKind.set(s.blocked, (byKind.get(s.blocked) ?? 0) + 1);
for (const [k, n] of [...byKind].sort((a, b2) => b2[1] - a[1])) {
  say(`  blocked by ${k.padEnd(11)}                 : ${pct(n, samples.filter((s) => !s.error).length)}${k === "bad_hadith" ? "  ← prod does NOT retry these" : ""}`);
}
const errs = samples.filter((s) => s.error);
if (errs.length) say(`model errors                            : ${errs.length}`);
say();
// PER GROUP — the confound this probe exists to close. A lift that holds on `feeling` and collapses
// on `hukum` is a different finding from a lift that holds on both, and the pooled number hides it.
say("── lift by group ──");
say("| group | grounded | blank | LIFT | decoy→decoy |");
say("|---|---|---|---|---|");
const groupOf = new Map(CASES.map((c) => [c.id, c.group]));
for (const grp of ["feeling", "hukum"] as const) {
  const g = gr.filter((s) => groupOf.get(s.id) === grp);
  const b = bl.filter((s) => groupOf.get(s.id) === grp);
  const d = dc.filter((s) => groupOf.get(s.id) === grp);
  const rG = g.length ? g.filter(citedFitting).length / g.length : 0;
  const rB = b.length ? b.filter(citedFitting).length / b.length : 0;
  say(
    `| ${grp} | ${pct(g.filter(citedFitting).length, g.length)} | ${pct(b.filter(citedFitting).length, b.length)} | **${((rG - rB) * 100).toFixed(0)} pts** | ${pct(d.filter((s) => s.hitGrounded).length, d.length)} |`,
  );
}
say();

say(
  lift <= 0.1
    ? "VERDICT: grounding is INERT — the model answers from its own knowledge. ISC-418 NOT MET."
    : lift >= 0.5
      ? "VERDICT: grounding demonstrably moves the answer. ISC-418 evidence FOR."
      : "VERDICT: grounding moves the answer WEAKLY — read the per-case table before concluding.",
);
say();

// ── per-case ────────────────────────────────────────────────────────────────────────
say("| case | grp | grounded | blank | decoy→decoy | ref | decoy |");
say("|---|---|---|---|---|---|---|");
for (const c of [...cases].sort((a, b2) => a.group.localeCompare(b2.group))) {
  const g = gr.filter((s) => s.id === c.id);
  const b = bl.filter((s) => s.id === c.id);
  const d = dc.filter((s) => s.id === c.id);
  say(
    `| ${c.id} | ${c.group} | ${g.filter(citedFitting).length}/${g.length} | ${b.filter(citedFitting).length}/${b.length} | ${d.filter((s) => s.hitGrounded).length}/${d.length} | ${c.ref} | ${c.decoy} |`,
  );
}
say();

// ── report ──────────────────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const path = `src/eval/reports/grounding-${stamp}.md`;
const body = [
  `# ISC-418 — grounding adherence probe`,
  ``,
  `Model \`${cfg.model}\` · temp ${TEMP} · ${SAMPLES} samples/arm · ${new Date().toISOString()}`,
  ``,
  "```",
  ...lines,
  "```",
  ``,
  `## Every sample`,
  ``,
  ...samples.flatMap((s) => [
    `### [${s.id}] ${s.arm} #${s.n + 1}${s.guardOk ? "" : " — ⚠ guard rejected"}`,
    ``,
    `refs cited: ${s.refs.length ? s.refs.join(", ") : "(none)"}`,
    ``,
    s.error ? `> model error: ${s.error}` : s.prose.split("\n").map((l) => `> ${l}`).join("\n"),
    ``,
  ]),
].join("\n");
await Bun.write(path, body);
console.log(`Report: ${path}`);
