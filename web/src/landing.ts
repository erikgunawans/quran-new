/**
 * The landing: where the composer lives, and when.
 *
 * The chat box is the main attraction, so on the empty state it sits INSIDE the hero — between
 * the invitation and the seeds — rather than docked at the bottom of the screen. It cannot be
 * placed there by CSS alone: `#composer-bar` is a body-level sibling of `.app`, so no amount of
 * `order` can interleave it with the hero's own children. We move the node.
 *
 * The landing is a STATE (the reader is standing in the empty chat door), not an EVENT (the
 * reader asked something). Wiring it to `ask()` alone broke navigation two ways, because
 * `#hello` lives inside `#chat`:
 *
 *   1. Routing to #/baca hid `#chat` with the composer still inside it — so the chat input,
 *      reachable from every route before the port, silently vanished from the reading surface.
 *   2. `data-landing` stayed on the root, inflating the 46rem reading MEASURE to the landing's
 *      1120px, so the surah list stretched to full width.
 *
 * This module exists as its own file so those two rules are testable. main.ts is DOM-heavy and
 * side-effectful at import, which is exactly why the regression could not be caught there.
 */

const LANDING_ATTR = "data-landing";

/** Reversible and idempotent — safe to call on every route pass. */
export function dockLanding(doc: Document = document): void {
  const hero = doc.querySelector("#hello");
  const bar = doc.querySelector("#composer-bar");
  if (!hero || !bar || hero.contains(bar)) return;

  const seeds = hero.querySelector(".seeds");
  if (seeds) seeds.before(bar);
  else hero.append(bar);

  doc.documentElement.setAttribute(LANDING_ATTR, "");
}

/**
 * The composer must leave the hero BEFORE anything hides or removes it — otherwise it is
 * hidden along with #chat (unreachable) or destroyed along with #hello (lost mid-question).
 */
export function undockLanding(doc: Document = document): void {
  const bar = doc.querySelector("#composer-bar");
  if (bar?.closest("#hello")) doc.body.append(bar);
  doc.documentElement.removeAttribute(LANDING_ATTR);
}

/** One-way: the reader asked something, so the empty state is over for good. */
export function destroyLanding(doc: Document = document): void {
  undockLanding(doc);
  doc.querySelector("#hello")?.remove();
}

export function isLandingDocked(doc: Document = document): boolean {
  return doc.documentElement.hasAttribute(LANDING_ATTR);
}

/**
 * Is the reader standing in the chat door, or a reading door?
 *
 * This is the single source of truth for that question. It used to be duplicated as a comment
 * warning ("mirrors route()'s match set") — and a mirror that must be maintained by hand is a
 * mirror that drifts. Exported so both the router and the thread-restore path read the same table.
 */
export function isChatRoute(hash: string): boolean {
  return !(
    /^#\/surah\/\d/.test(hash) ||
    /^#\/tema(?:\/|$)/.test(hash) ||
    /^#\/peta(?:\/|$)/.test(hash) ||
    hash === "#/baca"
  );
}

/**
 * The ONE call the router makes. Deciding and acting are deliberately fused here: the original
 * bug was not a wrong decision, it was that the router never asked the question on the way OUT.
 * A single idempotent sync called on every route pass cannot forget one direction.
 */
export function syncLanding(hash: string, doc: Document = document): void {
  if (isChatRoute(hash)) dockLanding(doc);
  else undockLanding(doc);
}
