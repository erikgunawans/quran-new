import type { Turn } from "./thread.ts";

/**
 * Which superseded turn a composed answer must keep BELOW it (ISC-476, Erik's call 2026-08-17).
 *
 * Lives in its own module rather than in `main.ts` so it can be tested without importing the app
 * entry point, which boots the whole surface on import.
 *
 * ONLY the two lanes where the app authored NOTHING qualify: the Indeks Tematik entries (Ustadz
 * Muhammad Thalib's own lines) and the reviewed-aqidah answer (Ustadz Ahmad Isrofiel's own prose).
 * Those are somebody else's scholarship, and taking them off the screen mid-read to substitute
 * machine-composed prose is the defect this fixes.
 *
 * Everything else the principled chain can produce is deliberately NOT kept:
 *   - `silence`, `refer`, `count-defer`, `hadith-defer`, `answer-blocked` are OUR copy, and each one
 *     says some version of "I am not answering this". Printing that under an answer contradicts the
 *     answer above it.
 *   - `ayah`, `surah`, `hits` are verse cards the composed answer already re-renders from its own
 *     `refs`, so keeping them would duplicate, not preserve.
 */
export function keptBelow(superseded: Turn | undefined): Extract<Turn, { kind: "ai" }>["below"] {
  if (superseded?.kind === "knowledge") return { kind: "knowledge", slug: superseded.slug };
  if (superseded?.kind === "aqidah") return { kind: "aqidah", id: superseded.id };
  return undefined;
}
