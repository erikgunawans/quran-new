/**
 * HTML-escaping, in its own module.
 *
 * It used to live in verse.ts, which is DOM code. Every module needing to escape a string —
 * peta.ts, peta-cosmos.ts — therefore imported a browser module, and any Bun script reaching them
 * dragged `document` and `HTMLButtonElement` into a tsconfig with no DOM lib. That surfaced twice
 * as a typecheck failure in build scripts that never touch a page.
 *
 * Escaping is a pure string function. Nothing about it needs a browser.
 */
/**
 * Escape for HTML — including single quotes.
 *
 * `'` was missing. Nothing currently breaks, because every attribute here is double-quoted — but
 * that is a property of today's templates, not of this function, and the next person to write
 * `data-x='${esc(v)}'` would open an injection with no warning. The verse text is scripture and
 * the translator names come from a pinned corpus, so the risk is theoretical; the loaded gun
 * pointing at the next contributor is not.
 */
export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
