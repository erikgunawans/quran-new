/**
 * Hadith retrieval over the OKF corpus — the `cari_dalil` capability.
 *
 * Embeds the question with bge-m3 (Phase 0's bake-off winner: the only model of four that retrieved
 * Indonesian questions against Arabic hadith) and queries the `okf-hadith` Vectorize index.
 *
 * TWO RULES THAT ARE NOT NEGOTIABLE HERE:
 *
 * 1. THE DISPLAY CAP IS ENFORCED IN CODE, NOT IN A PROMPT. sunnah.com's terms permit per-hadith
 *    didactic display with attribution and forbid mass reproduction of collections. So retrieval may
 *    range over all 14,736 records, but `MAX_DISPLAY` of them may ever reach a reader. A prompt is a
 *    request; this is a wall.
 *
 * 2. SIMILARITY SCORE IS NOT A CONFIDENCE SIGNAL. Measured in Phase 0: "gimana hukumnya meninggalkan
 *    sholat?" retrieved "To leave or depart from the right and from the left after finishing the
 *    Salat" at 0.596 — a semantic false friend that outscored a perfectly correct hit at 0.575.
 *    Right and wrong hits share the same 0.47–0.63 band. Nothing downstream may treat rank or score
 *    as correctness, and no threshold may be used to gate trust. A reranker (next step) is the
 *    intended fix; until it lands, callers must assume the top hit can be confidently irrelevant.
 *
 * The corpus, not this index, is the source of truth for text: Vectorize carries identifiers,
 * citation data and rights fields only.
 */

export interface DalilHit {
  /** Frontmatter id, e.g. "hadith-bukhari-6962" — the marker the answer guard will validate against. */
  id: string;
  /** Cosine score. Useful for logging and debugging. NOT a correctness signal — see rule 2. */
  score: number;
  path: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
  rights_usage: string;
}

/** Retrieval breadth — what the model may reason over. */
export const MAX_RETRIEVE = 8;
/**
 * Display cap — what a reader may ever be shown in one answer. Decision 1 of the Tanya agent PRD,
 * resting on sunnah.com About §8 (per-entry didactic use, no mass reproduction).
 */
export const MAX_DISPLAY = 2;

const EMBED_MODEL = "baai/bge-m3";

interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, string | number>;
}
interface VectorizeIndex {
  query(vector: number[], opts: { topK: number; returnMetadata: string }): Promise<{ matches: VectorizeMatch[] }>;
}

export interface DalilEnv {
  VECTORIZE: VectorizeIndex;
  OPENROUTER_API_KEY?: string;
}

/** Embed one question. Throws on failure — the caller degrades to the principled path, never guesses. */
export async function embedQuestion(question: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: [question] }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}`);
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  const v = data.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length === 0) throw new Error("empty embedding");
  return v;
}

const str = (m: Record<string, string | number> | undefined, k: string): string => String(m?.[k] ?? "");
const num = (m: Record<string, string | number> | undefined, k: string): number => Number(m?.[k] ?? 0);

/**
 * Search the hadith corpus for one question.
 *
 * Returns up to MAX_RETRIEVE hits for the model to reason over. Callers that intend to SHOW hadith
 * must pass them through `capForDisplay` — retrieval breadth and display breadth are different
 * numbers on purpose.
 */
export async function searchDalil(env: DalilEnv, question: string, topK = MAX_RETRIEVE): Promise<DalilHit[]> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const vector = await embedQuestion(question, apiKey);
  const { matches } = await env.VECTORIZE.query(vector, { topK, returnMetadata: "all" });

  return matches
    // Defence in depth: `private` records are already excluded at build time, so this filter should
    // never fire. It exists because a rights failure must require TWO mistakes, not one.
    .filter((m) => str(m.metadata, "rights_usage") !== "private")
    .map((m) => ({
      id: m.id,
      score: m.score,
      path: str(m.metadata, "path"),
      collection: str(m.metadata, "collection"),
      hadith_number: num(m.metadata, "hadith_number"),
      grade: str(m.metadata, "grade"),
      book_en: str(m.metadata, "book_en"),
      bab_en: str(m.metadata, "bab_en"),
      source_url: str(m.metadata, "source_url"),
      rights_usage: str(m.metadata, "rights_usage"),
    }));
}

/** The rights wall. Whatever the model asked for, this is what a reader may see. */
export const capForDisplay = (hits: DalilHit[]): DalilHit[] => hits.slice(0, MAX_DISPLAY);
