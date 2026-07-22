/**
 * Co-display for the demo's own verse card.
 *
 * The demo was forked self-sufficient (b5c6bf6) before co-display existed, so it draws its cards
 * with its own markup rather than through `verse.ts`. That made it the one surface that would have
 * shown a conditionally-approved verse stripped of the context it was approved inside. This module
 * closes that, mirroring `verse.ts`'s `passageEl` — same restraint, same layout, different skin.
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
 * Takes the ayah NUMBER, not the ref string. An earlier version took `"92:7"` and re-derived the
 * number with a regex, which needed a throw to stop `"20:"` parsing as ayah 0 (`Number("")` is 0,
 * an integer) and silently stacking the whole range below the verse. All of that was defending a
 * conversion that never had to happen: `corpus.json` emits `surah` and `ayah` as numbers, the ref
 * is *built* from them, and `verse.ts` has no parse and no failure mode for exactly this reason.
 * A throw here was also unguarded — no caller wraps the render — so it would have taken down the
 * whole answer rather than one card.
 */
export function passageHtml(
  surah: number,
  subject: number,
  passage: readonly PassageAyah[] | undefined,
  side: "before" | "after",
): string {
  if (!passage?.length) return "";

  /**
   * TWIN: `passageEl` in web/src/verse.ts uses this identical predicate. Two doctrinal invariants
   * ride on this one line — the subject is skipped so it never prints twice, and neighbours land on
   * the correct side of it — and each copy is pinned by its own test file. Changing one (a `<=`, a
   * reversed side) leaves the other silently correct and its twin silently wrong, and nothing in
   * the repo compares them. If you edit this line, edit verse.ts too.
   */
  const rows = passage.filter((p) => (side === "before" ? p.ayah < subject : p.ayah > subject));
  if (rows.length === 0) return "";

  return `<div class="qk-passage qk-passage-${side}" role="group" aria-label="Ayat sekitar ${surah}:${subject}">
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
