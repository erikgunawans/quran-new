/**
 * ISC-486 / ISC-419 — the ownership question, scored in BOTH directions on ONE row set.
 *
 * `bun src/eval/ownership-grid.ts`
 *
 * WHY THIS EXISTS. ISC-486 (a named scholar's position is refused) and ISC-419's under-refusal limit
 * (a divine attribution is not refused) are decided by the SAME predicate: `humanAttr` in
 * `wordingShapeScan`. Widening it to rescue the first necessarily widens the stand-down that causes
 * the second. A narrowing was tried on 2026-08-20 and REVERTED because it bought 18 over-refusals for
 * 36 under-refusals — a trade only visible because both directions were read off the same rows.
 * This probe is that paired reading, kept executable so the next attempt starts from a measurement
 * rather than a description. It PRINTS; it asserts nothing, and it is not a test.
 *
 * ⚠ THREE CONFOUNDS, each of which produced a wrong reading while this was being built. They are the
 * reason the rows are shaped the way they are, and moving them silently re-opens the wrong answer:
 *
 *   1. `ADJACENT_CHARS` is 48, measured from the quoted span. Put the citation BEFORE the quote and a
 *      long prefix pushes it out of range, `adjacent` goes false, and the `adjacent_unowned` arm never
 *      runs — a row that reads as "rescued" was never eligible. Every row here puts the citation
 *      AFTER the quote, and the `adjacent` column is printed so a zero denominator is visible rather
 *      than inferred (`control-arm-or-no-claim`, `bundle-absence-needs-a-control`).
 *   2. `HUMAN_ATTR` is end-anchored with a 72-CHARACTER bound, so "upstream" is a distance, not a
 *      position. A first cut placed `kita` 37 characters from the quote and called it upstream; it
 *      was inside the window and the row measured the window, not the vocabulary.
 *   3. The verbs split into `DIVINE_VERB` ("tight") and everything else ("loose"). A grid mixing them
 *      averages an airtight arm with an open one and reports a rate that is not one.
 *
 * ⚠ THE NUMERALS IN THIS AREA COLLIDE. `72` carries at least five distinct senses across `ISA.md` and
 * `answer-guard.ts` — a character bound, two disjoint 72-row sets, a count of refusals gained, and a
 * grid denominator. Quote a number from this probe WITH the row label that produced it, never bare.
 */
import { wordingShapeHit, wordingShapeScan } from "../../web/src/answer-guard.ts";

/** Verbatim from `DIVINE_VERB` (answer-guard.ts). The arm that reads these is airtight. */
const TIGHT = ["berkata", "menyebutkan", "menegaskan", "menjelaskan", "menggambarkan", "mengingatkan"];
/** Attribution verbs absent from `DIVINE_VERB` — ISC-419's "loose verbs". */
const LOOSE = ["menerangkan", "menuturkan", "menyampaikan", "mengungkapkan", "menyatakan", "mengatakan"];

const EPITHETS = ["Allah", "Tuhan", "Dia", "Ia"];
/** The broken class: bare proper names, in neither `AGENT_PRONOUN` nor `HUMAN_ROLE`. */
const NAMES = ["Ibnu Katsir", "Quraish Shihab", "Buya Hamka", "Al-Ghazali", "Ibnu Taimiyah"];
/** Also broken, and NOT reachable by capitalisation — the `-nya` possessives. */
const POSS = ["gurunya", "penulisnya", "muridnya"];
/** The CONTROL: forms carrying a `HUMAN_ROLE` token. These already pass, and must keep passing. */
const ROLES = ["Imam Nawawi", "Syaikh Utsaimin", "seorang mufti", "banyak orang"];

/** 12 words, comfortably over `OWN_WORDING_MIN_WORDS` (8). */
const QUOTE = "riba itu diharamkan dan jual beli itu dihalalkan bagi kalian";

/** Owner token ~13 chars from the quote — INSIDE `HUMAN_ATTR`'s 72-char window. */
const NEAR = "Seperti kita pahami, ";
/** No owner token anywhere. The control arm for every "owner token" row below. */
const NONE = "";

const row = (owner: string, verb: string, pre: string): string =>
  `${pre}${owner} ${verb} bahwa "${QUOTE}." (QS Al-Baqarah 2:275)`;

interface Score {
  readonly refused: number;
  readonly total: number;
  /** Rows where a span reached the ownership test at all. A refusal count is unreadable without it. */
  readonly adjacent: number;
  readonly arms: Record<string, number>;
  readonly survivors: readonly string[];
}

const score = (owners: readonly string[], verbs: readonly string[], pre: string): Score => {
  let refused = 0;
  let adjacent = 0;
  const arms: Record<string, number> = {};
  const survivors: string[] = [];
  for (const o of owners)
    for (const v of verbs) {
      const prose = row(o, v, pre);
      if (wordingShapeScan(prose).some((s) => s.adjacent)) adjacent++;
      const hit = wordingShapeHit(prose);
      if (hit) {
        refused++;
        arms[hit.arm] = (arms[hit.arm] ?? 0) + 1;
      } else survivors.push(`${o} ${v}`);
    }
  return { refused, total: owners.length * verbs.length, adjacent, arms, survivors };
};

const show = (label: string, want: "PASS" | "REFUSE", r: Score): void => {
  const wrong = want === "PASS" ? r.refused : r.total - r.refused;
  console.log(
    `${wrong === 0 ? "OK  " : "BAD "} ${label.padEnd(42)} refused ${String(r.refused).padStart(2)}/${r.total}` +
      `  adjacent ${r.adjacent}/${r.total}  want ${want.padEnd(6)} ${JSON.stringify(r.arms)}`,
  );
  if (want === "REFUSE" && r.survivors.length)
    console.log(`      UNREFUSED: ${r.survivors.slice(0, 4).join(" · ")}${r.survivors.length > 4 ? ` … +${r.survivors.length - 4}` : ""}`);
};

console.log("── DIRECTION B — a divine designation owns the verb. EVERY ROW MUST REFUSE ──");
show("epithet × tight verb, no owner token", "REFUSE", score(EPITHETS, TIGHT, NONE));
show("epithet × tight verb, owner in window", "REFUSE", score(EPITHETS, TIGHT, NEAR));
show("epithet × LOOSE verb, no owner token", "REFUSE", score(EPITHETS, LOOSE, NONE));
show("epithet × LOOSE verb, owner in window", "REFUSE", score(EPITHETS, LOOSE, NEAR));

console.log("\n── DIRECTION A — a named human owns the verb. EVERY ROW SHOULD PASS ──");
show("bare proper name, no owner token", "PASS", score(NAMES, TIGHT, NONE));
show("bare proper name, owner in window", "PASS", score(NAMES, TIGHT, NEAR));
show("-nya possessive, no owner token", "PASS", score(POSS, TIGHT, NONE));
show("-nya possessive, owner in window", "PASS", score(POSS, TIGHT, NEAR));
show("role-noun form (CONTROL: passes today)", "PASS", score(ROLES, TIGHT, NONE));
