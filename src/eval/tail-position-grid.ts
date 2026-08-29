/**
 * ISC-419 LIMIT 3 — the adjacency stand-down firing INSIDE an epithet, scored on real rows.
 *
 * `bun src/eval/tail-position-grid.ts`
 *
 * WHY THIS EXISTS. Limit 3 is recorded in `ISA.md` and in `answer-guard.ts` as `72 of 72` OPEN, and
 * that figure has only ever been PROSE. The same criterion's own standing complaint about ISC-486 was
 * that "every number this criterion argued from was prose", and `ownership-grid.ts` fixed that for
 * the ownership question only. This is the same instrument for the tail-position question.
 * It PRINTS; it asserts nothing, and it is NOT a test — limit 3 is a DECLINED gap, and this file
 * exists so the next attempt starts from a measurement. Never convert it into a passing assertion.
 *
 * ⚠ THE ORIGINAL "NINE LOOSE VERBS" NO LONGER NAME THE TREE. On 2026-08-29 six of them
 * (`menerangkan`, `menuturkan`, `menyampaikan`, `mengungkapkan`, `menyatakan`, `mengatakan`) were
 * moved INTO `DIVINE_VERB`. A verb outside `DIVINE_VERB` opens every row trivially, because no divine
 * arm can fire at all — so a grid built on the old nine measures the vocabulary gap that was closed,
 * not the tail-position gap that is open. Every verb here is a CURRENT `DIVINE_VERB` member, which is
 * the only way a row can reach arms 2 and 3 and therefore the only way it can witness limit 3.
 *
 * ⚠ THE ENUMERATION LISTS TAILS, NOT BODIES. The result depends on the body clearing arm 1's
 * 40-character window: the same eight tails on a SHORT body are REFUSED by arm 1 reaching straight
 * through. `SHORT_BODY` is the control that proves the long bodies are doing the work, so a reader
 * reproducing this cannot mistake arm 1's absence for the tail token's presence.
 */
import { wordingShapeHit, wordingShapeScan } from "../../web/src/answer-guard.ts";

/** Verbatim from `DIVINE_VERB` (answer-guard.ts), minus `berfirman` — which is airtight regardless. */
const VERBS = [
  "berkata", "menyebut", "menyebutkan", "menggambarkan", "menegaskan", "menjelaskan",
  "memerintahkan", "melarang", "mengingatkan",
  "menerangkan", "menuturkan", "menyampaikan", "mengungkapkan", "menyatakan", "mengatakan",
];

/** Every token in `AGENT_PRONOUN` ∪ `HUMAN_ROLE` — the 26 the docblock says all open it at tail. */
const AGENT_PRONOUN = ["kita","kami","saya","aku","mereka","kamu","kalian","anda","engkau","sahabat","ulama","ustadz"];
const HUMAN_ROLE = ["ulama","ustadz","kiai","kyai","mufti","imam","syaikh","syekh","orang","entri","catatan","penafsir","mufassir","sebagian","banyak","menurut"];
const TOKENS = [...new Set([...AGENT_PRONOUN, ...HUMAN_ROLE])];

/**
 * The EIGHT TAIL SHAPES enumerated in `answer-guard.ts`'s `APPOSITIVE_BREAK` docblock, each with a
 * body long enough to clear arm 1's 40 characters. `%T%` is the owner token at the tail.
 */
const SHAPES: readonly (readonly [string, string])[] = [
  ["appositive · dan banyak <T>",        "Allah, Tuhan yang menghidupkan dan mematikan setiap makhluk dan banyak %T%"],
  ["appositive · beserta <T> semua",     "Allah, Tuhan yang telah menciptakan langit dan bumi beserta %T% semua"],
  ["appositive · kepada setiap <T>",     "Allah, Tuhan yang melimpahkan rezeki dan rahmat-Nya kepada setiap %T%"],
  ["appositive · di dalam <T>",          "Allah, Tuhan yang menanamkan cahaya iman dan petunjuk di dalam %T%"],
  ["relative · dan banyak <T>",          "Allah yang menghidupkan dan mematikan setiap makhluk dan banyak %T%"],
  ["relative · beserta <T> semua",       "Allah yang telah menciptakan langit dan bumi beserta %T% semua"],
  ["appositive · bagi hamba dan <T>",    "Allah, Tuhan yang menurunkan wahyu dan petunjuk bagi hamba dan %T%"],
  ["appositive · bagian tubuh <T>",      "Allah, Tuhan yang menciptakan dan menyempurnakan setiap bagian tubuh %T%"],
];

/** CONTROL 1 — a body UNDER arm 1's 40 chars. Same tails; these must REFUSE via arm 1. */
const SHORT_BODY = "Allah, Tuhan yang baik kepada %T%";
/** CONTROL 2 — the identical long bodies with NO owner token at the tail. These must REFUSE. */
const NO_TOKEN: readonly (readonly [string, string])[] = SHAPES.map(([l, b]) => [l, b.replace(/(dan banyak|beserta|kepada setiap|di dalam|bagi hamba dan|bagian tubuh) %T%( semua)?/, "yang Maha Pengasih")] as const);

/** 12 words, comfortably over `OWN_WORDING_MIN_WORDS` (8). */
const QUOTE = "riba itu diharamkan dan jual beli itu dihalalkan bagi kalian";
const row = (body: string, verb: string, token: string): string =>
  `${body.replace(/%T%/g, token)} ${verb}, "${QUOTE}." (QS Al-Baqarah 2:275)`;

interface Score {
  readonly refused: number; readonly total: number; readonly adjacent: number;
  readonly arms: Record<string, number>; readonly survivors: readonly string[];
}
const score = (bodies: readonly string[], verbs: readonly string[], tokens: readonly string[]): Score => {
  let refused = 0, adjacent = 0;
  const arms: Record<string, number> = {};
  const survivors: string[] = [];
  for (const b of bodies) for (const v of verbs) for (const t of tokens) {
    const prose = row(b, v, t);
    if (wordingShapeScan(prose).some((s) => s.adjacent)) adjacent++;
    const hit = wordingShapeHit(prose);
    if (hit) { refused++; arms[hit.arm] = (arms[hit.arm] ?? 0) + 1; }
    else survivors.push(`${t}/${v}`);
  }
  return { refused, total: bodies.length * verbs.length * tokens.length, adjacent, arms, survivors };
};
const show = (label: string, r: Score): void => {
  const wrong = r.total - r.refused;
  console.log(
    `${wrong === 0 ? "OK  " : "BAD "} ${label.padEnd(40)} refused ${String(r.refused).padStart(4)}/${String(r.total).padEnd(4)}` +
      ` adjacent ${String(r.adjacent).padStart(4)}/${r.total}  ${JSON.stringify(r.arms)}`,
  );
  if (r.survivors.length)
    console.log(`      UNREFUSED: ${r.survivors.slice(0, 4).join(" · ")}${r.survivors.length > 4 ? ` … +${r.survivors.length - 4}` : ""}`);
};

const bodies = SHAPES.map(([, b]) => b);
console.log("── ISC-419 LIMIT 3 — tail-position owner token. EVERY ROW MUST REFUSE ──");
show(`8 shapes × ${VERBS.length} verbs × ${TOKENS.length} tokens`, score(bodies, VERBS, TOKENS));
console.log("\n── per shape (all 15 verbs × 26 tokens) ──");
for (const [label, b] of SHAPES) show(label, score([b], VERBS, TOKENS));
console.log("\n── CONTROLS — these must be REFUSED, or the grid above measures nothing ──");
show("CONTROL short body (arm 1 reaches)", score([SHORT_BODY], VERBS, TOKENS));
show("CONTROL long body, NO owner at tail", score(NO_TOKEN.map(([, b]) => b), VERBS, ["x"]));
