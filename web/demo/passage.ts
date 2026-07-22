/**
 * Co-display for the demo's own verse card.
 *
 * The demo was forked self-sufficient (b5c6bf6) before co-display existed, so it draws its cards
 * with `cardHtml` in demo.ts rather than through `verse.ts`. That made it the one surface that
 * would have shown a conditionally-approved verse stripped of the context it was approved inside.
 * This module closes that, mirroring `verse.ts`'s `passageEl` exactly — same restraint, same
 * layout, different skin.
 *
 * The reviewer's condition is "tampilkan bersama" — shown TOGETHER — so this is not a disclosure
 * and never collapses. A chevron would make the context dismissible, and a condition you can
 * dismiss is not a condition. (The demo's card *does* collapse the literal Kemenag rendering
 * behind one; that is our editorial choice about a translation, not a scholar's condition.)
 *
 * Context ayahs get the Arabic and the interpretive reading only: no tag, no translator byline,
 * no actions. The subject card names the translator directly above, and putting our labels on the
 * surrounding ayahs is exactly the over-reach the condition guards against.
 */
import { esc } from "../src/esc.ts";

/** Only `text` is ever rendered for a neighbour, so only `text` is required of it. */
export interface PassageAyah {
  ayah: number;
  arabic: string;
  primary: { text: string } | null;
}

/**
 * The neighbours on one side of the subject.
 *
 * `side` splits the range at its subject so the passage reads in mushaf order with the subject in
 * its true position: what precedes it renders above, what follows renders below. The subject is
 * skipped — the range contains it by construction (the builder enforces that), so laying it out as
 * its own neighbour would print the ayah twice on its own card.
 *
 * A ref that will not parse throws rather than rendering nothing. This is unreachable at the call
 * sites — every ref here comes from `corpus.json` — but a silent empty return would put the verse
 * on screen WITHOUT the context the condition exists to require, and do it quietly. That is the
 * one failure this whole mechanism was built to prevent, so it is a throw, not a fallback.
 */
export function passageHtml(
  subjectRef: string,
  passage: readonly PassageAyah[] | undefined,
  side: "before" | "after",
): string {
  if (!passage?.length) return "";

  // Matched whole, not split-and-coerced. `"20:".split(":")` yields `""`, and `Number("")` is 0 —
  // an integer, so a digits-only check would ADMIT it, place the subject at ayah 0, and then render
  // every ayah of the range below the verse including the subject itself. That is the silent wrong
  // outcome this throw exists to prevent, reached through the guard meant to prevent it.
  const parsed = /^(\d+):(\d+)$/.exec(subjectRef);
  if (!parsed) {
    throw new Error(`co-display: cannot place a required passage around an unparseable ref "${subjectRef}"`);
  }
  const surah = Number(parsed[1]);
  const subject = Number(parsed[2]);

  const rows = passage.filter((p) => (side === "before" ? p.ayah < subject : p.ayah > subject));
  if (rows.length === 0) return "";

  return `<div class="qk-passage qk-passage-${side}" role="group" aria-label="Ayat sekitar ${esc(subjectRef)}">
    ${rows
      .map(
        (p) => `<div class="qk-passage-ayah">
      <span class="qk-passage-ref" aria-hidden="true">${surah}:${p.ayah}</span>
      <div class="qk-passage-ar" dir="rtl" lang="ar">${esc(p.arabic)}</div>
      ${p.primary ? `<p class="qk-passage-tr">${esc(p.primary.text)}</p>` : ""}
    </div>`,
      )
      .join("")}
  </div>`;
}
