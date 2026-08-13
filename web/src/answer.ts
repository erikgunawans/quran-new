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
import { hasGrounding } from "./answer-contract.ts";
import type { AnswerContext, AnswerModel, GroundingEntry, GroundingVerse } from "./answer-contract.ts";
import { refsInProse, safeAnswer, type AnswerViolationKind } from "./answer-guard.ts";
import { AnswerBlockedError } from "./answer-live.ts";
import { retrieveKnowledge } from "./knowledge.ts";
import { isRealAyah } from "./quran.ts";
import { retrieve, type Corpus } from "./retrieve.ts";

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
  | { readonly kind: "blocked"; readonly by: AnswerViolationKind };

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
  const { verses, entries } = await gatherGrounding(corpus, question, modelThemes);

  // ISC-418. Nothing of ours to author from → bow out before the network call, not after a ~6s
  // generation. The Worker enforces the same rule as the authority (a client can post anything); this
  // is the latency half, and both call the one `hasGrounding` so they cannot drift apart.
  if (!hasGrounding({ verses, entries })) return null;

  const ctx: AnswerContext = { question, verses, entries };
  let prose: string;
  try {
    prose = await model(ctx);
  } catch (err) {
    // A NAMED refusal from the Worker's wall is signal, not noise — pass it up so the caller can point
    // instead of falling silent. Every other throw (model down, timeout, 404, malformed body) is still
    // an absence and still returns null.
    if (err instanceof AnswerBlockedError) return { kind: "blocked", by: err.by };
    return null; // model error/timeout → fall back to principled
  }

  // Citations are validated against the mushaf, not a whitelist: any real ayah is fair game, a
  // non-existent one sinks the whole answer. Arabic and fatwa-verdict rules are unconditional.
  //
  // The hadith predicate is deliberately left at its `() => false` default here, and that is the
  // SECOND wall, not a copy of the first. The Worker already guarded this prose; if a future change
  // ever let marked hadith prose out of the edge, this re-guard would still stop it in the browser.
  // Threading a permissive predicate through to match the Worker would remove a wall, not fix one.
  const safe = safeAnswer(prose, isRealAyah);
  if (safe === null) return null;

  // Render exactly the ayat the model cited (validated, de-duped, capped) — not the grounding hints.
  const refs = refsInProse(safe).filter(isRealAyah).slice(0, MAX_CARDS);
  return { kind: "answer", prose: safe, refs };
}
