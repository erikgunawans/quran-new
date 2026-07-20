/**
 * The one definition of "this grounding is really ours" — shared by the builder and the Worker.
 *
 * `/api/answer` authors religious answers from grounding the browser hands it. Bounding that input is
 * not the same as trusting it: a caller could POST invented scholar entries and get a fluent answer
 * built on them, and the egress guard cannot help, because it whitelists citations against the
 * SUBMITTED grounding — so forged grounding whitelists its own citations.
 *
 * So the build emits a hash per legitimate grounding item and the Worker checks against it. This file
 * exists because that check is only sound if both sides hash IDENTICALLY. Two copies of these six
 * lines would drift, and drift fails closed: legitimate grounding stops verifying, synthesis bows out
 * on every question, and the AI edition quietly becomes the principled one with nothing in the logs to
 * say why. One definition, imported by both, makes that failure unrepresentable.
 *
 * The hash covers ref AND text together, which is the whole point: a real reference carrying invented
 * words is the dangerous case. 2:255 exists; it is the sentence bolted onto it that gets screenshotted.
 */

/** Bounds applied by the Worker's sanitizeGrounding. The hashed form must match post-truncation. */
export const MAX_GROUNDING_TEXT = 800;
export const MAX_GROUNDING_REF = 40;

export const groundingKey = (ref: string, text: string): string =>
  `${ref.slice(0, MAX_GROUNDING_REF)} ${text.slice(0, MAX_GROUNDING_TEXT)}`;

/**
 * 12 hex chars = 48 bits. Across ~2,600 items the birthday collision probability is ~1e-8, and a
 * collision would let exactly one forged string through — it never opens the gate.
 */
export async function hashGrounding(ref: string, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(groundingKey(ref, text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The text gatherGrounding sends for a curated verse — interpretive primary, else literal companion. */
export const groundingTextOf = (v: { primary?: { text: string } | null; companion?: { text: string } | null }): string =>
  v.primary?.text ?? v.companion?.text ?? "";
