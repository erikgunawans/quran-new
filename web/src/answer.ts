/**
 * The synthesis orchestrator (new-quranku-ai only) — gather grounding, author from it, guard, or bow out.
 *
 * Flow for one question in the AI edition:
 *   1. gatherGrounding() — reuse the SAME retrieval the principled app uses: feeling/keyword verses
 *      via retrieve(), plus the scholar's KB entries via retrieveKnowledge(). This is the fence: the
 *      model only ever sees what retrieval already found for this question.
 *   2. Empty grounding is NO LONGER a refusal (Erik, 2026-08-21). The model answers anyway, from
 *      what it knows, ayah-first where one genuinely fits. Retrieval's job is to SUGGEST, not to
 *      license. What it still cannot do is invent: see the citation rules in step 3.
 *   3. Otherwise call the model, then run the answer through answer-guard (no Arabic, no citation
 *      outside the grounding). Clean → return {prose, verses}. Rejected/failed → null (fall back).
 *
 * Returning null on every doubt WAS deliberate — "the synthesis edition can only ever be as bad as
 * the principled edition, never worse". Erik reversed that on 2026-08-21: measured against a real
 * reader, bowing out was not "no worse", it was a non-answer to a plain question. Doubt is now
 * handled by saying less, not by saying nothing — a violating sentence is excised and the rest of
 * the answer ships (`worker/src/answer-repair.ts`).
 */
import type {
  AnswerContext,
  AnswerModel,
  AnswerResult,
  GroundingEntry,
  GroundingVerse,
} from "./answer-contract.ts";
import {
  groundedHadithFrom,
  markersInProse,
  refsInProse,
  safeAnswer,
  type AnswerViolationKind,
} from "./answer-guard.ts";
import { AnswerBlockedError, type GenTerminalReason } from "./answer-live.ts";
import type { HadithCard } from "./hadith-card.ts";
import { retrieveKnowledge } from "./knowledge.ts";
import { isRealAyah } from "./quran.ts";
import { retrieve, REFERENCE_SCORE, type Corpus } from "./retrieve.ts";

// Re-export so existing importers (answer.test.ts) keep resolving it here; the definition lives in
// quran.ts, next to surahMeta, so the Worker can share it without pulling retrieval into its bundle.
export { isRealAyah } from "./quran.ts";

/** Bound the grounding: enough context to answer, small enough to stay cheap and on-prompt. */
const MAX_VERSES = 5;
const MAX_ENTRIES = 6;
/** Cap the verse cards rendered under an answer, so a citation-heavy reply doesn't become a wall. */
const MAX_CARDS = 5;

export interface SynthesisAnswer {
  /** The model's authored prose — already guarded (no Arabic, every citation a real ayah, no verdict). */
  readonly prose: string;
  /** The ayat the model ACTUALLY CITED, to render as cards below the prose (in our translation). */
  readonly refs: readonly string[];
  /**
   * The hadith the answer cited, as the Worker resolved them from the pinned corpus. Empty on every
   * turn that retrieved none — which is most turns, by design.
   */
  readonly hadith: readonly HadithCard[];
}

/**
 * What the synthesis attempt produced — an answer, or a named refusal.
 *
 * `null` still means what it always meant: an ABSENCE. Nothing to ground on, the model was down, the
 * request timed out. The caller falls back to the principled edition and the reader sees the honest
 * "I found no matching verse" copy, which is true.
 *
 * `blocked` is the state that had no representation before, and its absence is the bug this type
 * fixes. The model DID answer, the answer may well have been right, and the egress wall refused it
 * for a named reason. Rendering an absence's copy over a refusal tells the reader the corpus is empty
 * when the truth is that the app is holding something back — the reader concludes the app does not
 * know, and stops asking. A refusal has to be able to say so.
 */
export type SynthesisOutcome =
  | ({ readonly kind: "answer" } & SynthesisAnswer)
  | {
      readonly kind: "blocked";
      readonly by: AnswerViolationKind;
      /**
       * The Worker's terminal reason, carried through so the caller can tell a REFUSAL from an
       * EXPIRED CLOCK. `by` alone cannot — see `AnswerBlockedError.terminal`.
       *
       * `null` on the second wall below (this file's own `safeAnswer`), because that refusal never
       * had a Worker turn behind it, and on any Worker too old to report one.
       */
      readonly terminal: GenTerminalReason | null;
    };

/**
 * Collect the grounding for a question: retrieval verses (with their Indonesian text) + KB entries.
 * `modelThemes` threads through the same model-detected feelings the principled path uses.
 */
export async function gatherGrounding(
  corpus: Corpus,
  question: string,
  modelThemes: string[],
): Promise<{ verses: GroundingVerse[]; entries: GroundingEntry[]; refs: string[]; weakVerses: boolean }> {
  const hits = retrieve(corpus, question, MAX_VERSES, modelThemes);
  const verses: GroundingVerse[] = hits.map((h) => ({
    ref: h.verse.ref,
    surah_name: h.verse.surah_name,
    text: h.verse.primary?.text ?? h.verse.companion?.text ?? "",
  }));

  // The KB is a FALLBACK, exactly as in main.ts: it runs only after the feeling path came up empty.
  // Ungated, it hijacked real feelings — the index is a ruling/predicate index, so "aku capek banget
  // sama utang" retrieved its verses AND a stack of Ekonomi/riba law lines, and the model, handed both,
  // answered the debt question instead of the exhausted person. Feelings first, the scholar's index
  // only when there is no feeling to answer. Same law, both editions.
  let entries: GroundingEntry[] = [];
  if (verses.length === 0) {
    try {
      const k = await retrieveKnowledge(question);
      // A ref the index cites that is NOT in the mushaf (4 of them: e.g. QS 8:77, a 75-ayah surah)
      // must never reach the citation whitelist. The principled edition renders these unlinked and
      // harmless; here the whitelist is what lets the model write a reference as scripture, so an
      // unresolvable entry would launder a non-existent ayah into an authored answer.
      if (k) {
        entries = k.entries
          .filter((e) => e.resolvable)
          .slice(0, MAX_ENTRIES)
          .map((e) => ({ ref: e.ref, text: e.text }));
      }
    } catch {
      // KB is optional grounding — a failed shard fetch just means fewer entries, never a broken turn.
    }
  }

  const refs = verses.map((v) => v.ref);
  // WEAK = the Qur'an lane returned something, but only because it recognised a FEELING.
  //
  // Erik's sequence (2026-08-17) is ayat, then hadits, then fikih. Before this, step two could only
  // run when step one returned NOTHING — the hadith gate keys on `entries`, and `entries` only fills
  // on `verses.length === 0`. Measured against 48 live reader turns, the questions that never
  // reached hadith were exactly the ones that retrieved one or two feeling-verses: `bagaimana adab
  // kepada orang tua` (2 verses), `apa keutamaan sedekah` (1), `bolehkah aku pacaran` (2). Those are
  // hadith topics; the sequence was mostly theoretical because of them.
  //
  // The split is the scorer's OWN, not a threshold invented here. `retrieve()` admits a verse on one
  // of two signals: an explicit reference (100) or a recognised feeling (10 each); word overlap can
  // re-rank but never qualify. A reference means the reader named an ayah and the Qur'an lane has
  // genuinely answered — leave it alone. A feeling means we matched a MOOD, which for a ruling or
  // knowledge question may be orthogonal to what was asked, and step two should still run.
  //
  // ONLY THE HADITH LANE OPENS ON THIS. `entries` stays gated on `verses.length === 0`, untouched.
  // That gate exists because the ruling index, ungated, hijacked real feelings — "aku capek banget
  // sama utang" pulled its verses AND a stack of riba law, and the model answered the debt instead
  // of the exhausted person. Widening the hadith lane does not reopen that: hadith is retrieved
  // semantically from the question, and it is offered to the model as extra material rather than
  // substituted for the feeling verses.
  const weakVerses = verses.length > 0 && hits.every((h) => h.score < REFERENCE_SCORE);
  return { verses, entries, refs, weakVerses };
}

/**
 * Produce a warm, guarded answer as the app's ustadz voice, or null if it can't be authored safely.
 * The caller treats null as "do what the principled edition would do".
 *
 * The model LEADS now: it answers warmly and may cite any real ayah (we render our own translation
 * for whatever it cites). The retrieved verses/pins are handed to it as PREFERRED grounding, not a
 * fence. The guard still holds the three hard lines — no Arabic, no non-existent ayah, no fatwa
 * verdict — and on any breach we fall back, never worse than the trustworthy edition.
 */
export async function synthesizeAnswer(
  corpus: Corpus,
  question: string,
  modelThemes: string[],
  model: AnswerModel,
): Promise<SynthesisOutcome | null> {
  const { verses, entries, weakVerses } = await gatherGrounding(corpus, question, modelThemes);

  // ISC-418'S CLIENT HALF IS GONE TOO, 2026-08-21 — AND REMOVING ONLY THE WORKER'S WOULD HAVE BEEN
  // A NO-OP. This bow-out ran BEFORE the network call, so with it standing the Worker's copy could
  // never have been reached on a no-grounding question and the whole change would have shipped
  // invisibly. That is `three-walls-not-two` exactly: a predicate guarded in more than one place,
  // where fixing the one you found first changes nothing you can see.
  //
  // Erik ruled 2026-08-21: every question gets an answer. There is nothing to bow out to any more —
  // the fall-back this returned null INTO is the "Aku belum menemukan jalan…" copy he asked to be
  // removed. Grounding is now a STRONG SUGGESTION to the model (prompt rule 1), not a licence to
  // speak, and its absence costs suggested verses rather than the answer.
  //
  // The header above still describes the fence around what the model may CITE, and that fence is
  // unchanged: it may cite only real ayat, and may attribute to the Prophet ﷺ only what carries a
  // marker resolving against this turn's retrieval. What it may no longer do is refuse.

  const ctx: AnswerContext = { question, verses, entries, weakVerses };
  let result: AnswerResult;
  try {
    result = await model(ctx);
  } catch (err) {
    // A NAMED refusal from the Worker's wall is signal, not noise — pass it up so the caller can point
    // instead of falling silent. Every other throw (model down, timeout, 404, malformed body) is still
    // an absence and still returns null.
    if (err instanceof AnswerBlockedError) return { kind: "blocked", by: err.by, terminal: err.terminal };
    return null; // model error/timeout → fall back to principled
  }

  // Citations are validated against the mushaf, not a whitelist: any real ayah is fair game, a
  // non-existent one sinks the whole answer. Arabic and fatwa-verdict rules are unconditional.
  //
  // THE SECOND WALL, still standing, now built from the records rather than from a constant.
  //
  // This predicate used to be the `() => false` default, and the note here said that threading a
  // PERMISSIVE predicate through to match the Worker would remove a wall rather than fix one. That
  // is still true and this is not that: the predicate is rebuilt from the ids of the hadith the
  // response actually carried, so a marker only survives if a card for it arrived alongside. A
  // Worker that approved a marker but sent no record — the failure this wall exists to catch — is
  // refused here exactly as before, and the reader falls back to the principled behaviour.
  //
  // It is the same question the Worker asked, asked again over data the browser can see for itself,
  // which is what makes it an independent wall rather than an echo of the first.
  const hadith = result.hadith ?? [];
  const safe = safeAnswer(result.prose, isRealAyah, groundedHadithFrom(hadith.map((h) => h.id)));
  if (safe === null) return null;

  // Render exactly the ayat the model cited (validated, de-duped, capped) — not the grounding hints.
  const refs = refsInProse(safe).filter(isRealAyah).slice(0, MAX_CARDS);
  // And exactly the hadith it cited: `markersInProse` is the renderer's work list, and running it
  // over already-guarded prose is the contract that function documents. Anything the Worker sent
  // that the prose does not name is dropped here too, so the two surfaces cannot disagree.
  const marked = new Set(markersInProse(safe));
  return { kind: "answer", prose: safe, refs, hadith: hadith.filter((h) => marked.has(h.id)) };
}
