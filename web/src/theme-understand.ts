/**
 * The input understander — the mirror of the composer, on retrieval's INPUT side.
 *
 * ARCHITECTURE (Cycle 5). The composer wraps retrieval's OUTPUT (framing prose); this wraps its
 * INPUT (which themes the person's words belong to). Today `retrieve()` detects theme by matching a
 * hand-written slang lexicon — brilliant when the person types a word on the list, deaf when they
 * don't. "aku ngerasa Tuhan udah nyerah sama aku" carries despair and abandonment and matches no
 * keyword. A model reads that. This is the rung-0 win: understand the person better, generate no
 * scripture.
 *
 * THE INPUT-SIDE BRIGHT LINE: recognize a feeling, never invent a category. The model may ONLY
 * classify into themes that already exist in the corpus (`corpus.themes`). A theme it makes up is
 * dropped — it would be a new taxonomy layer with no verses behind it anyway, and inventing
 * categories is the input-side twin of authoring meaning. `guardThemes` is that wall.
 *
 * PURE UPSIDE BY CONSTRUCTION. On any failure — the model errors, returns nothing usable, or
 * returns only off-list junk — `understandThemes` falls back to the deterministic keyword detection.
 * Worst case is exactly today's behavior. The model can only ADD recall, never subtract honesty.
 *
 * A NOTE ON TRANSPARENCY (surfaced, not silently traded). `retrieve()` prides itself that "every
 * point is traceable to a word the user typed — no embedding black box." A model classification is
 * NOT so traceable. This file therefore returns the detected themes as a primitive; the integration
 * step (which touches retrieve.ts) should UNION model themes with the keyword hits, so the keyword
 * matches keep their transparent "you typed this word" explanation and the model only reaches
 * feelings the list missed. That policy is deferred to wiring — see ISA ISC-202.
 */

/** The maximum themes to carry forward. A person rarely holds more than two or three things at
 * once; a model that returns all twelve has classified nothing. Retrieval diversifies output
 * verses on top of this. */
export const MAX_THEMES = 3;

/**
 * Everything the theme model may know: the person's words and the CLOSED set it must choose from.
 * The valid set is data (`corpus.themes`), passed in — never hardcoded here, so it cannot drift
 * from the corpus.
 */
export interface ThemeContext {
  readonly question: string;
  /** The closed set of themes the model must classify into — `corpus.themes`. */
  readonly themes: readonly string[];
}

/**
 * The theme model, as a pluggable async function returning candidate theme names. Today a fixture
 * in tests; later a classification call. It returns theme strings only — it never touches scripture.
 */
export type ThemeModel = (ctx: ThemeContext) => Promise<string[]>;

/**
 * The system prompt for the classifier. Teaches the closed-set rule from the inside, the twin of
 * `guardThemes` outside. `theme-understand.test.ts` asserts its core instructions survive edits.
 */
export const THEME_SYSTEM_PROMPT = `You read how an Indonesian Muslim just described what they are feeling — often in casual, code-switched, 2am language ("capek banget", "gak kuat", "ngerasa Tuhan udah nyerah sama aku", "bangkrut", "galau") — and decide which emotional themes it belongs to.

You will be given a fixed LIST of allowed themes. Your rules:
1. Choose ONLY from the provided list. Never invent a theme, never rename one, never translate one.
2. Return the one to three themes from the list that best match what the person is FEELING — what they are carrying, not incidental words.
3. If the message expresses ANY feeling or inner state — even a subtle, unnamed, or spiritual one (feeling far from God, empty, lost, adrift, restless, unworthy) — choose the closest one or two themes; do NOT withhold. A sense of distance from God fits themes like Trust in God, Mercy, or Forgiveness & despair. Return an empty list ONLY when the message carries no emotional or spiritual weight at all — a factual question, a command, spam, or gibberish. When a feeling is present, silence is the wrong answer: the corpus has a verse for it, and returning nothing hides it.
4. Return only the theme names, exactly as written in the list. No explanation, no scripture, no commentary.

You are classifying a feeling into an existing shelf. You are not writing anything, not interpreting anything, and not speaking to the person.`;

/**
 * The wall: keep only model themes that exist in the closed set, deduped, order-preserving, capped.
 * Everything else — invented categories, renames, near-misses — is dropped. Case- and
 * whitespace-exact against the valid set: the model must return the theme verbatim, because a fuzzy
 * match is the first step toward a fabricated one.
 */
export function guardThemes(candidates: string[], valid: readonly string[]): string[] {
  const allowed = new Set(valid);
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!allowed.has(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    kept.push(candidate);
    if (kept.length === MAX_THEMES) break;
  }
  return kept;
}

/**
 * The wrap. Classify the question via the injected model, keep only real themes, and fall back to
 * the deterministic keyword detection whenever the model gives nothing usable.
 *
 * An empty question is silence at the door — no model call, no fallback, nothing to classify.
 */
export async function understandThemes(
  question: string,
  validThemes: readonly string[],
  model: ThemeModel,
  keywordFallback: () => string[],
): Promise<string[]> {
  if (!question.trim()) return [];

  let raw: string[];
  try {
    raw = await model({ question, themes: validThemes });
  } catch {
    return keywordFallback();
  }

  const kept = guardThemes(raw, validThemes);
  return kept.length ? kept : keywordFallback();
}
