/**
 * The synthesis orchestrator (new-quranku-ai only) — gather grounding, author from it, guard, or bow out.
 *
 * Flow for one question in the AI edition:
 *   1. gatherGrounding() — reuse the SAME retrieval the principled app uses: feeling/keyword verses
 *      via retrieve(), plus the scholar's KB entries via retrieveKnowledge(). This is the fence: the
 *      model only ever sees what retrieval already found for this question.
 *   2. If there is nothing to ground on → return null. The caller falls back to the principled
 *      pointer/silence. The AI edition never authors an answer it cannot ground.
 *   3. Otherwise call the model, then run the answer through answer-guard (no Arabic, no citation
 *      outside the grounding). Clean → return {prose, verses}. Rejected/failed → null (fall back).
 *
 * Returning null on every doubt is deliberate: the synthesis edition can only ever be as bad as the
 * principled edition, never worse.
 */
import type { AnswerContext, AnswerModel, GroundingEntry, GroundingVerse } from "./answer-contract.ts";
import { allowedRefsFrom, safeAnswer } from "./answer-guard.ts";
import { retrieveKnowledge } from "./knowledge.ts";
import { retrieve, type Corpus } from "./retrieve.ts";

/** Bound the grounding: enough context to answer, small enough to stay cheap and on-prompt. */
const MAX_VERSES = 5;
const MAX_ENTRIES = 6;

export interface SynthesisAnswer {
  /** The model's authored prose — already guarded (no Arabic, citations all grounded). */
  readonly prose: string;
  /** The grounding verses to render as cards below the prose (byte-exact, from the corpus). */
  readonly refs: readonly string[];
}

/**
 * Collect the grounding for a question: retrieval verses (with their Indonesian text) + KB entries.
 * `modelThemes` threads through the same model-detected feelings the principled path uses.
 */
export async function gatherGrounding(
  corpus: Corpus,
  question: string,
  modelThemes: string[],
): Promise<{ verses: GroundingVerse[]; entries: GroundingEntry[]; refs: string[] }> {
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
  return { verses, entries, refs };
}

/**
 * Produce a grounded, guarded answer, or null if it can't be grounded/authored safely. The caller
 * treats null as "do what the principled edition would do".
 */
export async function synthesizeAnswer(
  corpus: Corpus,
  question: string,
  modelThemes: string[],
  model: AnswerModel,
): Promise<SynthesisAnswer | null> {
  const { verses, entries, refs } = await gatherGrounding(corpus, question, modelThemes);
  if (verses.length === 0 && entries.length === 0) return null; // nothing to ground on → fall back

  const ctx: AnswerContext = { question, verses, entries };
  let prose: string;
  try {
    prose = await model(ctx);
  } catch {
    return null; // model error/timeout → fall back to principled
  }

  // The whitelist is every ref we handed the model — verses AND scholar entries.
  const allowed = allowedRefsFrom([...refs, ...entries.map((e) => e.ref)]);
  const safe = safeAnswer(prose, allowed);
  if (safe === null) return null; // Arabic or an ungrounded citation → fall back

  return { prose: safe, refs };
}
