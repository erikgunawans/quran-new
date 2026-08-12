/**
 * Where an authored answer's verses sit on the page, and how a citation in its prose becomes a door.
 *
 * The synthesis edition used to render every paragraph, then every ayah card in a block at the
 * bottom, then the honesty note. That layout makes the reader do the joining: the prose says "seperti
 * dalam QS 2:155" and the verse it means is four paragraphs away, in a stack with two others, in an
 * order the prose never referred to. On a phone the card is off-screen entirely by the time it is
 * mentioned.
 *
 * So a citation now does two things at the point it is written. It becomes a LINK into the reading
 * surface at that exact ayah, and it pulls its CARD up to sit directly under the paragraph that
 * mentions it. Two verses cited in two different paragraphs land in two different places, with the
 * answer's own prose between them — which is what the answer was already claiming by citing them
 * separately.
 *
 * This module decides placement only. It renders no card and authors no sentence: `main.ts` still
 * builds every card from the pinned corpus, and the prose is the model's, escaped. Kept out of
 * `main.ts` so the placement rules can be tested directly — an end-to-end check of a laid-out answer
 * cannot tell you WHICH rule put a card where.
 */

/** A "surah:ayah" as the guard normalises it. */
export type Ref = string;

/**
 * Deep link into the reading surface at one ayah — the same shape the reviewed-aqidah answers use
 * (`aqidahHtml`), so a citation behaves identically wherever the reader meets one.
 */
export const ayahHref = (surah: number, ayah: number): string => `#/surah/${surah}#${ayah}`;

/**
 * Any "surah:ayah" written in prose, including the forms the model actually produces: `QS 2:155`,
 * `Q.S. 2:155`, `(QS. Al-Baqarah: 155)`, a bare `2:155`, and the dotted `2.155`.
 *
 * The optional `QS` prefix is captured so it can be swallowed INTO the link text. A link reading just
 * "2:155" next to a stranded "QS" is the kind of seam that makes an interface feel machine-assembled.
 */
const REF_IN_PROSE = /\b(Q\.?\s?S\.?\s*)?(\d{1,3})\s*[:.]\s*(\d{1,3})\b/g;

/** Normalise to the guard's "surah:ayah" form so placement and cards key on the same string. */
export const normRef = (surah: string | number, ayah: string | number): Ref =>
  `${Number(surah)}:${Number(ayah)}`;

/**
 * Turn every REAL citation in already-escaped prose into a link, and leave everything else alone.
 *
 * `isReal` is the mushaf check, passed in by the caller — the same question `bad_ref` asks on egress.
 * It matters here for a different reason than it does there: an unresolvable citation must not become
 * a link, because a link is a promise that something is on the other side of it. A number the guard
 * let through as ordinary prose ("dalam 40 hari", "surah ke-2 ayat 155" written oddly) stays text.
 *
 * MUST be given HTML-escaped input. The replacement injects markup, so calling it on raw prose would
 * hand the model an injection surface — and the prose here is model-authored by definition.
 */
export const linkifyRefs = (escapedProse: string, isReal: (ref: Ref) => boolean): string =>
  escapedProse.replace(REF_IN_PROSE, (whole, qs: string | undefined, s: string, a: string) => {
    const ref = normRef(s, a);
    if (!isReal(ref)) return whole;
    return `<a class="ai-ref" href="${ayahHref(Number(s), Number(a))}">${qs ?? ""}${s}:${a}</a>`;
  });

/** Every real citation in one paragraph, in the order written, de-duped. */
export const refsInParagraph = (para: string, isReal: (ref: Ref) => boolean): Ref[] => {
  const out: Ref[] = [];
  for (const m of para.matchAll(REF_IN_PROSE)) {
    const ref = normRef(m[2]!, m[3]!);
    if (isReal(ref) && !out.includes(ref)) out.push(ref);
  }
  return out;
};

export interface AnswerBlock {
  /** One paragraph of the model's prose, exactly as written. */
  readonly para: string;
  /** Cards to render directly beneath it — refs FIRST mentioned in this paragraph. */
  readonly refs: readonly Ref[];
}

export interface AnswerLayout {
  readonly blocks: readonly AnswerBlock[];
  /**
   * Cards for verses the prose never cites. They still render, at the bottom, exactly as the whole
   * stack used to — because retrieval grounding and prose citation are not the same set, and silently
   * dropping a grounded verse would be a content change dressed as a layout change.
   */
  readonly trailing: readonly Ref[];
}

/**
 * Decide where each verse card goes.
 *
 * A ref is placed under the FIRST paragraph that cites it and never repeated, so an answer that
 * refers back to a verse it already showed does not show it twice. Everything grounded but uncited
 * falls to the end, preserving the old behaviour for the case the new one does not cover.
 */
export const planAnswerLayout = (
  prose: string,
  refs: readonly Ref[],
  isReal: (ref: Ref) => boolean,
): AnswerLayout => {
  const available = new Set(refs);
  const placed = new Set<Ref>();
  const paras = prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = paras.map((para) => {
    const here = refsInParagraph(para, isReal).filter((r) => available.has(r) && !placed.has(r));
    for (const r of here) placed.add(r);
    return { para, refs: here };
  });

  return { blocks, trailing: refs.filter((r) => !placed.has(r)) };
};
