/**
 * Presentation-only formatting for model-authored prose.
 *
 * Lives in its own module because main.ts is the entry point — it has no exports and runs its side
 * effects on import, so nothing in it can be unit-tested. This function decides how the reader sees
 * a sentence about their own sins, which is not a thing to verify only by looking at the screen.
 */

/**
 * Turn the model's markdown emphasis into real emphasis.
 *
 * The prose is model-authored and arrives with markdown in it. Escaping runs first in the render
 * pipeline (it has to — the other order hands a model-authored string an HTML injection surface),
 * so `**sikap meremehkan dosa kecil**` reached the reader with the asterisks showing, as raw syntax
 * in the middle of a sentence about their own sins. Reported from the live app 2026-08-16.
 *
 * MUST run AFTER escaping, so the input here is already inert: `<` and `&` are entities, and the
 * only tags in the output are the ones this function writes. Running it BEFORE escaping would be a
 * bug of a different order — the `<strong>` would come straight back out as `&lt;strong&gt;`, and
 * any tag the model wrote would still be escaped, so the mistake would look harmless while quietly
 * doing nothing.
 *
 * Deliberately narrow: bold and italic, nothing else. Headings, lists and links are not emphasis,
 * and a general markdown renderer over model-authored religious prose is a far larger surface than
 * this defect warrants.
 */
export const mdEmphasis = (s: string): string =>
  s
    // Bold FIRST: `**x**` would otherwise be eaten by the italic rule as two adjacent `*x*`.
    // `(?=\S)` and the trailing `\S` keep the match from starting or ending on a space, so a stray
    // pair of asterisks with a gap in it is left alone rather than swallowing a whole sentence.
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
    // Italic: `[^*\n]` so it cannot span a paragraph or reach across a surviving bold marker, and
    // the leading group protects `2*3*4` and mid-word asterisks from becoming emphasis.
    .replace(/(^|[^*\w])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1<em>$2</em>");
