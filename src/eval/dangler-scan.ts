/**
 * DANGLER SCAN — count cross-paragraph danglers in repaired answers. It ships nothing and guards
 * nothing.
 *
 * ── WHY THIS EXISTS (ISC-566) ───────────────────────────────────────────────────────────────────
 *
 * When `repairAnswerProse` excises a paragraph, a SURVIVING paragraph can carry a reference whose
 * antecedent left with it. ISC-566 scopes that class against ONE committed witness
 * (`docs/review/captures/api-answer-9ab57d4b-2026-08-22.json` turn-3). It does NOT decline the four
 * candidate fixes — it RECOMMENDS "no code fix at this granularity" and marks the choice
 * "OWED TO ERIK AND NOT DECIDABLE HERE". Erik chose THE HOLE AS IT STANDS — the UNNUMBERED fourth
 * option in that sentence, NOT ISC-566's enumerated cost (iv), which is a tie-break change he was
 * never shown. Written up in `docs/review/erik-decision-2026-08-23.md`, which records that it was a
 * SELECTION FROM OPTIONS AUTHORED HERE rather than words of his own.
 *
 * This is the INSTRUMENT for that measurement. The measurement itself is not available at n=1. It is
 * not a guard, it does not run in the Worker, and no route, build step or reader-facing surface
 * changes.
 *
 * ── IT SHARES THE REPAIR'S BINDING RATHER THAN COPYING IT ───────────────────────────────────────
 *
 * `splitParagraphs` is IMPORTED from `worker/src/answer-repair.ts` — the same function repair
 * excises with. A copy would drift the day repair's unit changes and would then be measuring a
 * different document than the one that shipped (`diagnostic-outlives-its-gate`).
 *
 * The connective list below is the opposite case and is stated rather than buried: repair has NO
 * connective list, deliberately. ISC-564 chose `splitParagraphs` for the property "no connective
 * word list, no dependency parse, nothing to tune, no fixture to teach the suite what to expect".
 * This file introduces one because COUNTING may be approximate where excising may not. It must not
 * migrate into `answer-repair.ts`, and THE REASON IS ISC-564'S OWN, NOT ERIK'S: the property it
 * names is "no connective word list, no dependency parse, nothing to tune". Migrating it would be
 * cost (i), which Erik passed over on 2026-08-23 by selecting the hole as it stands
 * (`docs/review/erik-decision-2026-08-23.md`) — but that record is explicit that his decision does
 * NOT close ISC-566 and does NOT rule on the granularity, so it cannot be cited as a standing bar on
 * cost (i). ISC-566 itself declines nothing: it RECOMMENDS and marks the choice owed.
 *
 * ── THE TWO SIGNALS, AND WHAT EACH CAN ACTUALLY ESTABLISH ───────────────────────────────────────
 *
 * SIGNAL A — a surviving paragraph opening on a back-referring connective.
 *
 *   ISC-566 words the condition as "…whose predecessor was excised". THAT CONDITION IS NOT
 *   DERIVABLE FROM AN `/api/answer` RESPONSE CAPTURE — a firing condition rather than an
 *   impossibility, because the broader claim is false (`impossibility-is-a-quantifier`).
 *   `refusal-capture.ts` output DOES carry pre-repair prose, and a diff of that against the shipped
 *   answer would locate the excision. What a RESPONSE capture carries is `gen` — `attempts`,
 *   `reason`, `rule`, `repaired`, `repairedDropped`, `repairedRule`, `repairedAttempt` — and none of
 *   those localises the drop. Against that corpus this signal reports a TIER, never a verdict:
 *
 *     · `necessary`  — paragraph index 0 opens on a back-referring connective, so NO SURVIVING
 *                      PREDECESSOR EXISTS AT ALL. That is the whole of what it establishes. It does
 *                      NOT establish that the antecedent is absent: in a question-answering app a
 *                      first paragraph opening on "Jadi," or "Artinya," MAY refer to THE READER'S
 *                      QUESTION, which was never in the prose and was never excised. (Not
 *                      "routinely" — the corpus holds ZERO `necessary` hits, so no frequency about
 *                      this class has been observed at all.)
 *     · `candidate`  — index >= 1. Its surviving predecessor is right there; whether the PRE-repair
 *                      predecessor was excised is unrecorded. A coherent answer whose paragraphs
 *                      simply open on connectives lands here too, and Indonesian prose does that
 *                      constantly. THIS TIER IS NOISY BY CONSTRUCTION.
 *
 *   On the one witness BOTH known danglers are `candidate` and NEITHER is `necessary` — (c1) sits
 *   at index 1 behind a surviving greeting, and (c2) at index 2. An instrument that could only see
 *   `necessary` would report zero on the very answer that motivated it. That is recorded here
 *   because it bounds what any count from this file means.
 *
 * SIGNAL B — a definite phrase NONE of whose content words occur elsewhere in the surviving prose.
 *   (It tests the whole phrase span, not a head noun — this file has no way to find a head.)
 *
 *   The `sungai rahmat yang mengalir itu` shape: `sungai` occurs EXACTLY ONCE in the shipped answer,
 *   definite and antecedent-less. Implemented as: for each `itu` / `tersebut` that is not part of a
 *   discourse connective, walk back to the clause boundary and flag only when EVERY content word in
 *   that span occurs exactly once in the whole surviving prose. Requiring merely SOME rare word is
 *   how this was written first, and it is a defect rather than a simplification — it fires on
 *   "Ada sungai di depan rumah. / Ingatlah sungai itu.", where the antecedent is right there and
 *   only the verb `ingatlah` is rare. If ANY content word recurs, an antecedent plausibly survived.
 *
 *   ITS DECLARED LIMIT, which is the reason it counts and never guards: it cannot separate an
 *   antecedent-less definite from an ORDINARY FIRST MENTION. "…hadiah dari Allah itu" on its first
 *   use is indistinguishable, to this rule, from a reference whose antecedent was excised. Only a
 *   comparison of the REMOVED text against the survivors settles that, and that is a coherence
 *   component — ISC-566 cost (iii), which Erik PASSED OVER by selecting option 1 and which NEITHER
 *   he nor ISC-566 declined, and against this module's
 *   founding line that the wall
 *   is a rules wall and never a coherence check (`green-wall-is-not-a-readable-answer`).
 *
 *   A SECOND FALSE-POSITIVE CLASS IS OBSERVED, NOT PREDICTED: Indonesian TOPIC-MARKING `itu`. On the
 *   witness, "…shalat di dua ujung siang dan sebagian malam itu menghapus kesalahan-kesalahan" fires
 *   the rule, and its referent is the noun phrase in its own clause — nothing left. (Quoted at the
 *   SHIPPED casing. It is the model's own paraphrase of a verse, UNREVIEWED, and carries no verse
 *   reference and no translator — label it so wherever it is repeated.) So signal B scores 2 hits on
 *   the only witness, of which ONE corresponds to the dangler ISC-566 INFERS. That criterion is
 *   careful that the distance is "INFERRED, NOT RECORDED", so 1-of-2 inherits the inference and is
 *   NOT a measured precision; if the (c2) antecedent was never in the excised paragraph it is 0-of-2.
 *   It is left unsuppressed on purpose. A discriminator fitted to this one answer (say, "the definite must end its clause")
 *   would be the fixture teaching the suite to expect the witness
 *   (`a-fixture-can-teach-the-suite-to-expect-the-bug`); tune it only against real transcripts, and
 *   only once there are several.
 *
 * ── WHAT THE CORPUS IS, TODAY ───────────────────────────────────────────────────────────────────
 *
 * ONE committed capture file, three turns, of which ONE is repaired. `rg -l repairedDropped` over
 * the tree finds no other CORPUS — it matches other files, but every one of them is source, test or
 * record rather than a capture. A rate cannot be established from one row, and a caveat prints on
 * every run AND rides inside the `--json` payload rather than being left for a reader to infer from a
 * denominator (`measured-set-is-not-a-class`). Its value is that the count becomes automatic as
 * captures accumulate — not that today's number means anything.
 *
 * THE CONTROL ARM, AND WHAT IT DOES AND DOES NOT BUY. Turns 1 and 2 of that same file were NEVER
 * repaired, so every signal there is a false positive by construction: turn 1 is silent on both
 * signals, turn 2 yields ONE signal-A false positive. That establishes the instrument is not
 * trivially always-firing (`control-arm-or-no-claim`) and nothing more. It does NOT make the hit
 * counts or the 1-of-2 above mean anything: same file, same session, same deploy, and turns 1-2
 * answer a DIFFERENT question from turn 3 (`run-to-run-confound`).
 *
 * ── CONTAINMENT ─────────────────────────────────────────────────────────────────────────────────
 *
 * This prints excerpts of its INPUT. Pointed at `docs/review/captures/` those are SHIPPED answers,
 * already public. Pointed at `refusal-capture.ts` output they would be REFUSED model prose, which
 * stays on the dev surface and is never quoted into `ISA.md`, `PROGRESS.md` or anything a reader
 * sees. The output inherits the containment of whatever it was pointed at; this file does not
 * relax it. `--no-excerpts` prints counts only.
 *
 * USAGE
 *   bun run eval:danglers                          # default corpus: docs/review/captures/*.json
 *   bun run eval:danglers path/to/capture.json ... # explicit files
 *   bun run eval:danglers --json                   # machine-readable
 *   bun run eval:danglers --no-excerpts            # counts only, no prose
 */

import { splitParagraphs } from "../../worker/src/answer-repair.ts";

/**
 * Openers that point BACKWARDS. Longest-first at match time so "oleh karena itu" is not scored as
 * bare "oleh". Closed class on purpose: this list is for counting, and a list that grows to chase
 * recall becomes the tunable thing ISC-564 refused.
 */
const BACK_REFERRING_OPENERS = [
  "selain itu",
  "selain daripada itu",
  "di samping itu",
  "lebih dari itu",
  "tidak hanya itu",
  "tak hanya itu",
  "oleh karena itu",
  "oleh sebab itu",
  "karena itu",
  "sebab itu",
  "maka dari itu",
  "untuk itu",
  "setelah itu",
  "dengan demikian",
  "demikian pula",
  "begitu pula",
  "sebaliknya",
  "namun demikian",
  "akan tetapi",
  "kesimpulannya",
  "singkatnya",
  "intinya",
  "artinya",
  "dari situ",
  "hal ini",
  "hal itu",
  "jadi",
  "maka",
  "namun",
  "tetapi",
  "kemudian",
  "selanjutnya",
  "sehingga",
  "ini",
  "itu",
];

/**
 * `itu` inside these is a DISCOURSE connective, not the head of a noun phrase, so signal B skips it.
 * "setelah itu" is anaphoric too, but its antecedent is an EVENT — the head-noun heuristic below
 * cannot reach it, and pretending otherwise would be the instrument claiming a coverage it lacks.
 */
const CONNECTIVE_ITU = [
  "selain itu",
  "selain daripada itu",
  "di samping itu",
  "lebih dari itu",
  "tidak hanya itu",
  "tak hanya itu",
  "oleh karena itu",
  "oleh sebab itu",
  "karena itu",
  "sebab itu",
  "maka dari itu",
  "untuk itu",
  "setelah itu",
];

/** Walking back from a definite marker stops here: the noun phrase does not cross these. */
const CLAUSE_BOUNDARY_WORDS = new Set([
  "dan", "atau", "tetapi", "namun", "lalu", "maka", "karena", "sebab", "bahwa", "jika",
  "kalau", "agar", "supaya", "untuk", "dengan", "dari", "pada", "ke", "di", "dalam",
  "kepada", "oleh", "sebagai", "ketika", "saat", "sehingga", "bila", "meski", "walau",
]);

/** Not evidence of a first mention on their own — too common to carry the signal. */
const FUNCTION_WORDS = new Set([
  "yang", "ini", "itu", "tersebut", "adalah", "ialah", "akan", "telah", "sudah", "sedang",
  "juga", "pun", "lah", "kah", "nya", "para", "sang", "si", "se", "tidak", "tak", "bukan",
  "ada", "lebih", "sangat", "amat", "hanya", "saja", "masih", "pernah", "bisa", "dapat",
  "harus", "boleh", "mau", "ingin", "anda", "kita", "kami", "saya", "mereka", "beliau",
  "dia", "ia", "semua", "setiap", "seluruh", "banyak", "satu", "dua", "tiga",
]);

export interface SignalAHit {
  paragraphIndex: number;
  opener: string;
  tier: "necessary" | "candidate";
  excerpt: string;
}

export interface SignalBHit {
  paragraphIndex: number;
  marker: string;
  /** Content words in the definite span that occur exactly once in the whole surviving prose. */
  soleOccurrences: string[];
  excerpt: string;
}

export interface AnswerScan {
  paragraphs: number;
  signalA: SignalAHit[];
  signalB: SignalBHit[];
}

const WORD_RE = /[a-zA-ZÀ-ɏ']+/g;

function words(text: string): string[] {
  return (text.toLowerCase().match(WORD_RE) ?? []);
}

function matchOpener(paragraph: string): string | null {
  const head = paragraph.trimStart().toLowerCase();
  // Longest first, so "oleh karena itu" wins over "karena itu".
  for (const opener of [...BACK_REFERRING_OPENERS].sort((a, b) => b.length - a.length)) {
    if (!head.startsWith(opener)) continue;
    const next = head.charAt(opener.length);
    // Must end at a word boundary: "itu" must not fire on "itulah", "ini" not on "inilah".
    if (next === "" || /[\s,.;:!?—–]/.test(next)) return opener;
  }
  return null;
}

/**
 * The definite noun phrase ending at `markerEnd`, walked backwards from the RAW text.
 *
 * It reads the raw substring rather than a token array because the tokenizer discards punctuation,
 * and a span that cannot see a comma walks straight through it: on the committed witness that put
 * "shalat" — which recurs throughout the answer — inside a phrase that ends two clauses later.
 * Capped as well, because an unbounded walk turns the whole sentence into "the noun phrase" and
 * every rare word in it into a flag.
 */
function definiteSpan(paragraph: string, markerStart: number, cap = 6): string[] {
  const before = paragraph.slice(0, markerStart);
  // A noun phrase does not cross a clause mark.
  const cut = before.search(/[.!?,;:()"\u2014\u2013\u201c\u201d][^.!?,;:()"\u2014\u2013\u201c\u201d]*$/);
  const tail = cut === -1 ? before : before.slice(cut + 1);
  const span: string[] = [];
  for (const token of words(tail).reverse()) {
    if (span.length >= cap) break;
    if (CLAUSE_BOUNDARY_WORDS.has(token)) break;
    span.unshift(token);
  }
  return span;
}

/**
 * Scan ONE answer's shipped prose. `prose` must be the answer exactly as it shipped — the frequency
 * count that signal B rests on is a count over the SURVIVING prose, so any trimming upstream of
 * here changes the answer.
 */
export function scanAnswer(prose: string, opts: { excerpts?: boolean } = {}): AnswerScan {
  const wantExcerpts = opts.excerpts !== false;
  const paragraphs = splitParagraphs(prose);
  const freq = new Map<string, number>();
  for (const word of words(prose)) freq.set(word, (freq.get(word) ?? 0) + 1);

  const signalA: SignalAHit[] = [];
  const signalB: SignalBHit[] = [];

  paragraphs.forEach((paragraph, index) => {
    const opener = matchOpener(paragraph);
    if (opener !== null) {
      signalA.push({
        paragraphIndex: index,
        opener,
        // Index 0 has no surviving predecessor at all. That is ALL this tier establishes — the
        // antecedent may simply be the reader's question, which was never in the prose and was never
        // excised. Every other index is unresolvable from a response capture.
        tier: index === 0 ? "necessary" : "candidate",
        excerpt: wantExcerpts ? excerptOf(paragraph) : "",
      });
    }

    const lower = paragraph.toLowerCase();
    for (const match of paragraph.matchAll(/\b(itu|tersebut)\b/gi)) {
      const marker = match[1]!.toLowerCase();
      const start = match.index ?? 0;
      if (marker === "itu") {
        // `itu` inside a discourse connective heads no noun phrase. Checked against the text
        // ENDING at this marker, so a paragraph that carries "Selain itu" early does not silence a
        // genuine definite later in the same paragraph.
        const upTo = lower.slice(0, start + marker.length);
        if (CONNECTIVE_ITU.some((phrase) => upTo.endsWith(phrase))) continue;
      }
      const span = definiteSpan(paragraph, start);
      const content = span.filter((word) => !FUNCTION_WORDS.has(word) && word.length > 2);
      const sole = content.filter((word) => freq.get(word) === 1);
      // FLAG ONLY WHEN NOTHING IN THE PHRASE RECURS. If any content word appears again in the
      // surviving prose, an antecedent plausibly survived and the instrument must stay quiet —
      // that discrimination is the whole of signal B. Requiring merely SOME rare word instead fired
      // on "Ada sungai di depan rumah. / Ingatlah sungai itu.", where the antecedent is right there
      // and only the verb `ingatlah` happened to be rare.
      if (sole.length === 0 || sole.length !== content.length) continue;
      signalB.push({
        paragraphIndex: index,
        marker,
        soleOccurrences: sole,
        excerpt: wantExcerpts ? excerptOf(`${span.join(" ")} ${marker}`) : "",
      });
    }
  });

  return { paragraphs: paragraphs.length, signalA, signalB };
}

function excerptOf(text: string, limit = 120): string {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────

interface CapturedTurn {
  turn?: string;
  body?: { answer?: string | null; gen?: Record<string, unknown> | null };
}

async function main(argv: string[]): Promise<void> {
  const asJson = argv.includes("--json");
  const excerpts = !argv.includes("--no-excerpts");
  const paths = argv.filter((arg) => !arg.startsWith("--"));

  const files = paths.length > 0 ? paths : await defaultCorpus();
  if (files.length === 0) {
    console.error("No capture files found under docs/review/captures/.");
    process.exit(1);
  }

  const rows: Array<{ file: string; turn: string; dropped: number; rule: unknown; scan: AnswerScan }> = [];
  let turnsSeen = 0;

  for (const file of files) {
    const parsed = await Bun.file(file).json();
    const turns: CapturedTurn[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const turn of turns) {
      turnsSeen += 1;
      const gen = turn.body?.gen ?? null;
      const answer = turn.body?.answer;
      if (gen === null || gen.repaired !== true) continue;
      if (typeof answer !== "string" || answer.trim() === "") continue;
      rows.push({
        file,
        turn: turn.turn ?? "(unnamed)",
        dropped: Number(gen.repairedDropped ?? 0),
        rule: gen.repairedRule ?? null,
        scan: scanAnswer(answer, { excerpts }),
      });
    }
  }

  // The caveats ride in the PAYLOAD, not only in the prose footer. `--json` is the mode whose output
  // gets pasted into a report stripped of everything around it; a machine-readable total with no
  // caveat attached is exactly the number that comes back quoted as a defect count.
  const caveats = [
    "Counts, not defects. This instrument guards nothing and ISC-566 is OPEN.",
    "signalA.tier=necessary means only that no surviving predecessor exists; a first paragraph may" +
      " refer to the reader's question, which was never excised.",
    "signalA.tier=candidate is noisy by construction: a coherent paragraph that merely opens on a" +
      " connective lands there too.",
    "signalB cannot separate an antecedent-less definite from an ordinary first mention, and fires" +
      " on Indonesian topic-marking `itu`.",
    `Corpus is ${rows.length} repaired turn(s).` +
      (rows.length < 2
        ? " A rate cannot be established from this. One repaired turn is a witness, not a class."
        : " Small-n: state the denominator wherever any ratio from this run is quoted."),
  ];

  if (asJson) {
    console.log(JSON.stringify({ caveats, turnsSeen, repairedTurns: rows.length, rows }, null, 2));
    return;
  }

  console.log("DANGLER SCAN — counts only. Guards nothing, ships nothing. ISC-566 is OPEN.\n");
  console.log(`Corpus: ${files.length} file(s), ${turnsSeen} turn(s), ${rows.length} REPAIRED.`);
  // Printed on EVERY run, not only at n=1 — a warning that retires itself the moment a second
  // capture lands is a warning that goes quiet exactly when someone starts computing ratios.
  console.log(
    rows.length < 2
      ? "!! A rate cannot be established from this corpus. One repaired turn is a witness, not a\n" +
          "   class. Do not quote a percentage from this run."
      : "!! Small-n. State the denominator wherever any ratio from this run is quoted.",
  );
  console.log("");

  let necessary = 0;
  let candidate = 0;
  let definite = 0;

  for (const row of rows) {
    console.log(`── ${row.turn}`);
    console.log(
      `   ${row.file}  ·  ${row.scan.paragraphs} paragraph(s) shipped  ·  repairedDropped=${row.dropped}  ·  rule=${String(row.rule)}`,
    );
    for (const hit of row.scan.signalA) {
      if (hit.tier === "necessary") necessary += 1;
      else candidate += 1;
      console.log(`   A[${hit.tier}] ¶${hit.paragraphIndex} opens "${hit.opener}"`);
      if (excerpts) console.log(`        ${hit.excerpt}`);
    }
    for (const hit of row.scan.signalB) {
      definite += 1;
      console.log(
        `   B ¶${hit.paragraphIndex} definite "${hit.marker}" · sole occurrence(s): ${hit.soleOccurrences.join(", ")}`,
      );
      if (excerpts) console.log(`        ${hit.excerpt}`);
    }
    if (row.scan.signalA.length === 0 && row.scan.signalB.length === 0) console.log("   (no signals)");
    console.log("");
  }

  console.log(`TOTALS  A/necessary ${necessary}  ·  A/candidate ${candidate}  ·  B/definite ${definite}`);
  console.log(
    "A/necessary means only that no surviving predecessor exists — a first paragraph may be referring\n" +
      "to the READER'S QUESTION, which was never excised. A/candidate is noisy by construction: a\n" +
      "coherent paragraph that merely opens on a connective lands there too. B cannot separate an\n" +
      "antecedent-less definite from an ordinary first mention, and fires on topic-marking `itu`.\n" +
      "NONE of the three is a defect count.",
  );
}

async function defaultCorpus(): Promise<string[]> {
  const dir = new URL("../../docs/review/captures/", import.meta.url).pathname;
  const glob = new Bun.Glob("*.json");
  const out: string[] = [];
  for await (const entry of glob.scan({ cwd: dir, absolute: true })) out.push(entry);
  return out.sort();
}

if (import.meta.main) await main(process.argv.slice(2));
