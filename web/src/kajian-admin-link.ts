import type { FetchLike } from "./kajian-feed.ts";
import { checkRole, type RoleCheck } from "./admin-kajian.ts";

/**
 * The ONLY entry point to the admin kajian queue.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 *
 * `#/admin/kajian` was reachable only by typing the hash. That was deliberate and is documented at
 * the route — an operating surface is not a reader mode, and `markNav`'s parameter is a closed
 * union that must not be widened to admit one. **That reasoning justifies keeping it out of the
 * NAV. It does not justify having no link anywhere**, and the two got conflated: the result was a
 * surface an administrator could only reach from memory. Measured 2026-08-24 on prod: zero anchors
 * containing `admin` in the rendered DOM, and `#/admin/kajian` appearing exactly once in the whole
 * source — in the router's `if`. It was matched, never linked. Erik, signed in as an admin, clicked
 * `Kajian`, landed on the reader page, and correctly reported that there was no field to paste a
 * URL into.
 *
 * So the link is added HERE — on the reader kajian page, the place he actually looked — and not in
 * the sidebar. The original intent survives intact: no nav item, no `markNav` widening, nothing an
 * ordinary reader ever sees.
 *
 * ── THE DEFAULT IS SILENCE, AND IT IS THE SAFE ONE ──────────────────────────────────────────────
 *
 * `admin` is the ONLY verdict that renders anything. `denied` and `unavailable` both render
 * nothing, and they are NOT collapsed for convenience — they stay distinct because the surface they
 * point at treats them differently (ISC-652), and a future reader of this file must not learn the
 * opposite lesson from it. What is identical here is the OUTPUT, not the verdict.
 *
 * ⚠ This is a CONVENIENCE, never a control. The gate is the Worker's `requireRole(…, "admin")`, and
 * nothing here is load-bearing for it: hiding a link denies no one anything, and showing one grants
 * no one anything. Anybody may type the hash today and be refused by the page exactly as before.
 * If this function ever starts deciding what a request may DO rather than what a page SHOWS, that
 * is the moment its client-side nature stops being harmless.
 */

/** Rendered only for `admin`. Kept as a constant so a test asserts the shipped string, not a copy. */
export const ADMIN_LINK_LABEL = "Antrean admin";

/**
 * Should the entry point be drawn for this verdict?
 *
 * Split out from the DOM work so the decision is testable on its own — the same reason
 * `withheld-turn.ts` exists. A predicate that can only be reached through a rendered page is a
 * predicate whose reachability no test can ask about.
 */
export function showsAdminLink(role: RoleCheck): boolean {
  return role === "admin";
}

/**
 * Build the anchor. Separate from insertion so the markup is asserted without a document.
 *
 * `rel="nofollow"` and no `target`: this is an internal operating surface, not somewhere to send a
 * crawler or a new tab.
 */
export function adminLinkHtml(): string {
  return `<a class="tematik-back kajian-admin-link" rel="nofollow" href="#/admin/kajian">${ADMIN_LINK_LABEL} →</a>`;
}

/**
 * Ask, then draw — as PROGRESSIVE ENHANCEMENT, never as a gate on the page.
 *
 * ⚠ The reader page is rendered BEFORE this runs and is never awaited on its behalf. Making
 * `renderKajian` async to fold the role check in would have put one network round trip in front of
 * every reader of a public page in order to serve the one person who is an admin. The page paints,
 * and the link appears a moment later for whoever is owed it.
 *
 * Returns whether the link was mounted, so a caller — and a test — can tell "not an admin" from
 * "the head element was not where we expected". Silent no-ops are how an entry point goes missing
 * in the first place, which is the whole reason this file exists.
 */
export async function mountAdminKajianLink(mount: HTMLElement, fetchImpl: FetchLike): Promise<boolean> {
  const role = await checkRole(fetchImpl);
  if (!showsAdminLink(role)) return false;
  const head = mount.querySelector(".tematik-head-r");
  if (!head) return false;
  // Idempotent: routing back to `#/kajian` re-renders the page, but a caller that mounts twice
  // against the SAME node must not stack two links.
  if (head.querySelector(".kajian-admin-link")) return true;
  head.insertAdjacentHTML("afterbegin", adminLinkHtml());
  return true;
}
