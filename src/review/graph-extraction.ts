/**
 * Path B2 — the LLM-derived knowledge-graph layer, per `docs/design/quran-graphrag.html` §
 * Extraction. Pure schema/prompt/validation logic — no network, no `data/` dependency, so it's
 * directly unit-testable (`graph-extraction.test.ts`). The actual OpenRouter call lives in
 * `src/app/build-graph-derived.ts`.
 *
 * Every edge produced by this pipeline is `review_status: "auto"` until a human upgrades it —
 * same provenance model the spec itself mandates, same discipline `data/review/divergence.json`
 * already established for a different kind of human-reviewed queue.
 */

// EXPLAINS deliberately excluded: B1 (src/app/build-graph.ts) already produces it structurally,
// zero-LLM, for every one of the 18,707 tafsir passages in the corpus — not just this pilot's
// 55-verse sample. The pilot run confirmed all 93 LLM-extracted EXPLAINS edges were a strict
// subset of what B1 already has for free; keeping it here would just be paying for duplicate
// data on every future run.
export const ALLOWED_PREDICATES = [
  "REFERENCES",
  "ABROGATES",
  "HAS_CONTEXT",
  "MENTIONS",
  "ABOUT_TOPIC",
  "THEMATICALLY_LINKED_TO",
  "NARRATIVE_OF",
] as const;
export type Predicate = (typeof ALLOWED_PREDICATES)[number];

export type EdgeObject = string | { type: string; label: string };

export interface ValidatedEdge {
  predicate: Predicate;
  subject_id: string;
  object: EdgeObject;
  evidence_span: string;
  confidence: number;
}

export interface ExtractedEdge extends ValidatedEdge {
  source_id: string;
  extracted_by: string;
  review_status: "auto";
}

export const SYSTEM_PROMPT = `You extract knowledge-graph edges from Islamic exegetical text (tafsir commentary).
You may ONLY use these predicates:
  REFERENCES, ABROGATES, HAS_CONTEXT, MENTIONS, ABOUT_TOPIC, THEMATICALLY_LINKED_TO, NARRATIVE_OF

RULES
  - For every edge you MUST quote the exact evidence_span from the passage — copy it verbatim, do not paraphrase or translate it.
  - Write every "label" in the SAME LANGUAGE as the passage you are reading. If the passage is in Indonesian, the label is in Indonesian. If the passage is in English, the label is in English. Never translate the label into a different language than the source passage — a reader comparing the label to its evidence_span must see one consistent language, not a mix.
  - If the passage does not support an edge, omit it.
  - NEVER infer a relationship the text does not explicitly state.
  - NEVER assert the ruling or meaning of a verse as settled fact — you are extracting what THIS SOURCE says, not adjudicating truth.
  - If nothing is extractable, return {"edges": []}.
  - Return ONLY a JSON object of the shape {"edges": [...]}. No prose, no markdown fences.

Each edge in "edges" has this shape:
{
  "predicate": "ABOUT_TOPIC",
  "subject_id": "ayah:2:255",
  "object": {"type": "Topic", "label": "Divine sovereignty"},
  "evidence_span": "the exact quoted text from the passage",
  "confidence": 0.86
}

"object" is either a candidate descriptor {"type": "Entity"|"Topic", "label": "..."} for MENTIONS/ABOUT_TOPIC/NARRATIVE_OF, or a canonical ayah id string like "ayah:2:255" for REFERENCES/ABROGATES/THEMATICALLY_LINKED_TO. Never guess a node id for an Entity or Topic — a label is enough, resolution happens separately.`;

/**
 * Stage 04, per the spec: "Schema + predicate whitelist. Pure code." No model in this loop.
 *
 * The `evidence_span` check is the automatable half of "does this quote actually say that?" — it
 * verifies the model didn't fabricate a quote (exact substring of the real passage text), NOT
 * that the resulting claim is correct. That second judgment stays human, in review.
 */
export function validateEdge(raw: unknown, passageText: string): ValidatedEdge | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (typeof r["predicate"] !== "string" || !(ALLOWED_PREDICATES as readonly string[]).includes(r["predicate"])) {
    return null;
  }
  if (typeof r["subject_id"] !== "string" || !r["subject_id"].trim()) return null;
  if (typeof r["evidence_span"] !== "string" || !r["evidence_span"].trim()) return null;
  if (!passageText.includes(r["evidence_span"])) return null;
  if (typeof r["confidence"] !== "number" || r["confidence"] < 0 || r["confidence"] > 1) return null;

  const object = r["object"];
  const validObject =
    (typeof object === "string" && object.trim() !== "") ||
    (typeof object === "object" &&
      object !== null &&
      typeof (object as Record<string, unknown>)["type"] === "string" &&
      typeof (object as Record<string, unknown>)["label"] === "string");
  if (!validObject) return null;

  return {
    predicate: r["predicate"] as Predicate,
    subject_id: r["subject_id"],
    object: object as EdgeObject,
    evidence_span: r["evidence_span"],
    confidence: r["confidence"],
  };
}

/** Parses the model's raw text response into a candidate edge array. Never throws — a
 * malformed/non-JSON response yields `[]`, logged by the caller, not a crashed pilot run. */
export function parseEdgesResponse(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as { edges?: unknown };
    return Array.isArray(parsed.edges) ? parsed.edges : [];
  } catch {
    return [];
  }
}
