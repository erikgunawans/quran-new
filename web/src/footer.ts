/**
 * The expandable site footer.
 *
 * Collapsed, it is a hairline strip at the bottom of the app carrying only its own handle. Clicking
 * the handle unfolds the footer upward; clicking again folds it away. That is the entire feature,
 * and the reason it is this small is that the state lives in exactly one place.
 *
 * ONE SOURCE OF TRUTH: `aria-expanded` on the handle. The panel's `hidden` and the chevron's
 * rotation are both DERIVED from it — the chevron in CSS via `[aria-expanded="true"]`, the panel
 * here. The alternative (a `.is-open` class plus an aria attribute set alongside it) gives you two
 * states that agree until the day one write is forgotten, and the one that drifts is always the
 * accessible one, because it is the one nobody can see.
 *
 * WHY `hidden` AND NOT A HEIGHT ANIMATION TO ZERO. A panel collapsed to 0px is still in the tab
 * order and still read aloud, so a "closed" footer becomes the first thing a keyboard user meets
 * on the page. `hidden` removes it from both. The open transition is a CSS animation on mount
 * instead, which costs nothing and respects `prefers-reduced-motion`.
 */
import "./footer.css";

const OPEN = "true";

/** Read the state from the attribute that owns it, never from a cached boolean. */
function isOpen(handle: HTMLElement): boolean {
  return handle.getAttribute("aria-expanded") === OPEN;
}

function apply(handle: HTMLElement, panel: HTMLElement, open: boolean): void {
  handle.setAttribute("aria-expanded", open ? OPEN : "false");
  panel.hidden = !open;
}

/**
 * Wire the footer. Safe to call when the elements are absent — every other surface in this app
 * mounts into a document that may not carry them (tests, the demo bundle), and a boot step that
 * throws on a missing optional element takes the whole app down with it.
 */
export function bindFooter(doc: Document = document): void {
  const handle = doc.getElementById("sf-handle");
  const panel = doc.getElementById("sf-panel");
  if (!handle || !panel) return;

  handle.addEventListener("click", () => apply(handle, panel, !isOpen(handle)));

  // Escape closes it, matching every other dismissible surface in the app. Only when it is open —
  // otherwise this would swallow Escape from the composer and the dialogs that sit above it.
  doc.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isOpen(handle)) return;
    apply(handle, panel, false);
    handle.focus(); // never strand focus inside a panel that just left the tab order
  });
}
