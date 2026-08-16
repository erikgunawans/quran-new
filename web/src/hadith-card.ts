/**
 * The hadith card — PRD decision 2, "split the register".
 *
 * This is the ONLY surface in the app allowed to show hadith text, and what it shows is the sourced
 * artifact untouched: Arabic and English verbatim, with collection, number, grade, source_url and
 * translator credit. The model's Indonesian prose may explain the POINT of a hadith in the app's own
 * voice; it may never present that explanation as the hadith. The card is where the actual words
 * live, and they arrive from the pinned corpus, not from a model.
 *
 * THE INDONESIAN, AND WHY IT ARRIVES IN TWO DIFFERENT FIELDS. This block used to read "there is no
 * Indonesian here", on the reasoning that an unreviewed AI rendering was already refused for the
 * Dorar surah preface and a mistranslated hadith is worse — it is a fabricated saying of the Prophet
 * ﷺ. That reasoning was never refuted; what changed is who carries the judgement. Ustadz Ahmad
 * approved DISPLAYING the machine Indonesian (relayed verbally by Erik, 2026-08-12), and Erik ruled
 * 2026-08-13 that the approval extends from the Hadis tab to this card (ISC-449).
 *
 * So the card can now show Indonesian — but permission to display is not permission to display
 * UNLABELLED, and it is emphatically not a statement that any sentence was checked. `reviewed_id`
 * means the narrow thing (a scholar checked THIS record's sentence) and stays empty until an
 * approved rendering ships from `docs/review/`; `machine_id` carries the generated layer and is
 * always marked `.is-ai`. Feeding `machine_id` into `reviewed_id` would collapse the only
 * distinction the data model has, irreversibly — that is ISC-448, and it is a tested invariant.
 *
 * WHY THE CAP IS RE-APPLIED HERE. `dalil.ts` caps retrieval at MAX_DISPLAY and `fetchDisplayRecords`
 * caps again before fetching text. This is the third wall, and it is not redundancy for its own
 * sake: sunnah.com's terms permit per-hadith didactic display and forbid mass reproduction, so
 * "never render a list of hadith" is a rights position, and a rights position that lives in only one
 * function is one refactor away from being lost.
 */
import { esc } from "./esc.ts";
import { mdEmphasis } from "./prose-format.ts";

/** Matches `DisplayRecord` in worker/src/dalil.ts — the shape the private text layer returns. */
export interface HadithCard {
  id: string;
  arabic: string;
  english: string;
  collection: string;
  hadith_number: number;
  grade: string;
  book_en: string;
  bab_en: string;
  source_url: string;
  /** Who rendered the English. Shown on every card — required by the record's own rights.attribution. */
  translator: string;
  /** Ustadz-approved Indonesian, when one exists for THIS record. Absent means no Indonesian shows. */
  reviewed_id?: string;
  /**
   * MACHINE Indonesian — a SEPARATE field from `reviewed_id`, and the separation is the point.
   *
   * ISC-449: Erik ruled 2026-08-13 that Ustadz Ahmad's approval of the machine Indonesian extends
   * from the Hadis tab to this card. That approval is permission to DISPLAY, relayed verbally
   * (`docs/review/hadith-id-approval-2026-08-12.md`) — it is not a statement that any particular
   * sentence was checked. `reviewed_id` means exactly that narrower thing and is the data model's
   * only way to tell "permitted" from "checked" (ISC-448, a tested invariant), so this text gets its
   * own field and its own `.is-ai` label rather than borrowing one that would erase the distinction.
   *
   * Populated by the caller from `hadith-id.ts`, never by the Worker: the `SHOW_MACHINE_HADITH_TEXT`
   * gate lives at that source so the whole app cannot start rendering this text by adding a caller.
   */
  machine_id?: string;
  /** Book number within the collection, from the corpus path — the `hadith-id` shard key. */
  book?: number;
}

/** The rights wall, restated. Same number as `MAX_DISPLAY` in worker/src/dalil.ts. */
export const MAX_DISPLAY_CARDS = 2;

/**
 * Grade badge. `sahih` and `hasan` are the only grades this corpus carries for Bukhari and Muslim,
 * but the label is rendered from the data rather than assumed, so a corpus that later includes
 * weaker material cannot show it silently ungraded.
 */
const gradeLabel = (grade: string): string => {
  const g = grade.trim().toLowerCase();
  if (!g) return "";
  const pretty: Record<string, string> = { sahih: "Sahih", hasan: "Hasan", daif: "Daif", "da'if": "Daif" };
  return pretty[g] ?? grade.trim();
};

/** A short human reference: "Sahih Muslim 154". */
export const hadithRef = (h: HadithCard): string => `${h.collection} ${h.hadith_number}`;

export function hadithCardEl(h: HadithCard): string {
  const grade = gradeLabel(h.grade);
  return `
    <article class="hadith" data-id="${esc(h.id)}">
      <header class="hadith-head">
        <span class="ref">${esc(hadithRef(h))}</span>
        ${grade ? `<span class="grade" data-grade="${esc(h.grade.trim().toLowerCase())}">${esc(grade)}</span>` : ""}
        ${h.bab_en ? `<span class="bab">${esc(h.bab_en)}</span>` : ""}
      </header>

      <p class="ar" dir="rtl" lang="ar">${esc(h.arabic)}</p>

      ${
        h.english
          // The sunnah.com export carries markdown in the text itself — every narration opens
          // `**Narrated \`Aisha:**` — so the reader met raw asterisks in the middle of a hadith.
          // Rendering them is presentation, NOT correction: it changes no word of the narration,
          // it shows the emphasis its own source marked. Verbatim still means verbatim.
          ? `<p class="hadith-en" lang="en">${mdEmphasis(esc(h.english))}</p>`
          : ""
      }

      ${
        h.reviewed_id
          ? `<p class="hadith-id" lang="id">${esc(h.reviewed_id)}</p>`
          : h.machine_id
            // `.is-ai` is the same class the Hadis tab marks its machine lines with, and it is what
            // the provenance notice below refers to. A reviewed rendering, if one ever exists for
            // this record, wins outright — never both, or the reader sees one hadith twice.
            ? `<p class="hadith-id is-ai" lang="id">${esc(h.machine_id)}</p>`
            : ""
      }

      <footer class="hadith-cite">
        <a href="${esc(h.source_url)}" target="_blank" rel="noopener noreferrer">${esc(h.source_url.replace(/^https?:\/\//, ""))}</a>
        ${h.translator ? `<span class="translator">Terjemahan Inggris: ${esc(h.translator)}</span>` : ""}
      </footer>
    </article>`;
}

/**
 * Render the hadith for one answer.
 *
 * Caps at MAX_DISPLAY_CARDS regardless of what the caller passes. An empty list renders nothing —
 * never an empty container, never a "tidak ada hadits" placeholder, because the absence of hadith is
 * the normal case (feelings questions never run hadith search at all) and is not worth a line.
 */
export function hadithCardsEl(cards: readonly HadithCard[]): string {
  if (cards.length === 0) return "";
  return cards.slice(0, MAX_DISPLAY_CARDS).map(hadithCardEl).join("\n");
}
