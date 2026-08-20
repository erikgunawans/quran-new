/**
 * The hadith card — PRD decision 2, "split the register".
 *
 * What this card shows is the sourced artifact untouched: the ARABIC verbatim, with collection,
 * number, grade and source_url. The model's Indonesian prose may explain the POINT of a hadith in
 * the app's own voice; it may never present that explanation as the hadith. The card is where the
 * actual words live, and they arrive from the pinned corpus, not from a model.
 *
 * THIS PARAGRAPH WAS WRONG TWICE AND BOTH CORRECTIONS BELONG HERE, because the failure shape is the
 * point: a stale header makes behaviour look settled, which is exactly how the English survived six
 * handoffs behind a passing test (see the comment two hundred lines down).
 *
 *   1. It said "Arabic and English verbatim … and translator credit" until 2026-08-20 (late) — one
 *      commit AFTER the English and the credit were withdrawn from publication.
 *   2. It opened "This is the ONLY surface in the app allowed to show hadith text", and that was
 *      false when written and still false after the field list was fixed. There are at least three
 *      others: the Hadis browse page renders whole books (`sections.ts`), `dalil-search.ts` renders
 *      its own cards, and this same file records a FOURTH surface — the Dorar surah preface — in
 *      the paragraph below. The first correction rewrote the sentence's tail and left its stronger,
 *      falser head standing, which is the same mistake one clause over.
 *
 * THE INDONESIAN, AND WHY IT ARRIVES IN TWO DIFFERENT FIELDS. This block used to read "there is no
 * Indonesian here", on the reasoning that an unreviewed AI rendering was already refused for the
 * Dorar surah preface and a mistranslated hadith is worse — it is a fabricated saying of the Prophet
 * ﷺ.
 *
 * THAT PREMISE IS STALE AND COST A REVIEW (2026-08-18). The Dorar preface's AI Indonesian is NOT
 * refused any more: it was reversed on 2026-08-08 and `surah-intro.ts:205-229` now offers it as a
 * reader-selectable "Bahasa Indonesia" tab on all 114 surahs — `editions.id` with
 * `translation: "ai"`, `reviewStatus: "unreviewed"`, `reviewerNeeded: "Ustadz Ahmad Isrofiel"`, and
 * 61 of the 114 carry prophetic-speech markers. So the app has a FOURTH surface rendering machine
 * Indonesian about the Prophet ﷺ, from a DIFFERENT corpus under DIFFERENT rights terms (Dorar is
 * `usage: private`, shipped on Erik's own call). Three passes of a scholarly review missed it
 * because this comment and `PROGRESS.md` both still said it had been refused. Corrected here rather
 * than deleted, because the sentence that hid a surface is worth keeping as the reason it hid.
 *
 * The comparative reasoning ("a mistranslated hadith is worse") was never refuted; what changed is
 * who carries the judgement. Ustadz Ahmad
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
 * sake: "never render a list of hadith" is a load-bearing position, and one that lives in only a
 * single function is one refactor away from being lost. WHAT THE COUNT RESTS ON is editorial, not
 * licensing (Erik, 2026-08-20 — the canonical statement is the `MAX_DISPLAY` docblock in
 * `worker/src/dalil.ts`). This paragraph asserted the licensing basis until 2026-08-20 (late).
 */
import { esc } from "./esc.ts";

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
  /**
   * Who rendered the English. **No longer shown on any card** — the credit went with the English
   * when Erik ruled on 2026-08-20 that the narration must not be published. Kept on the record
   * because the record still HOLDS the English; what was withdrawn is publication, not possession.
   */
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

/**
 * The editorial cap, restated. Same number as `MAX_DISPLAY` in worker/src/dalil.ts, and see that
 * docblock for why it is NOT "the rights wall" — which is what this line called it until Erik ruled
 * on 2026-08-20 that the cap is an editorial judgement about answers, not a licensing limit.
 */
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
        ${/*
          NO ENGLISH CHAPTER TITLE. Erik's ruling, 2026-08-20 (late).

          `<span class="bab">${esc(h.bab_en)}</span>` rendered here until then. The 2026-08-20
          ruling below named `h.english`, the narration, and this comment recorded `bab_en` as
          deliberately untouched — "a heading is a different artifact from the narration". That
          reading did not survive being PUT to Erik: it is the same sunnah.com English editorial
          apparatus one level up, published under the same "private research use" terms.

          The trail is kept rather than deleted, because the point is that the question was flagged
          for six handoffs and never asked. It was asked on 2026-08-20 (late) and answered in one
          exchange. `machine_id` was asked in the same breath and KEPT — see below.
        */ ""}
      </header>

      <p class="ar" dir="rtl" lang="ar">${esc(h.arabic)}</p>

      ${/*
        NO ENGLISH NARRATION. Erik's ruling, 2026-08-20.

        The card used to render `h.english` verbatim, with a `mdEmphasis` pass so the source's own
        `**Narrated \`Aisha:**` markdown read as emphasis rather than raw asterisks. That was careful
        presentation of text we should not have been publishing at all:
        `docs/review/hadith-id-approval-2026-08-12.md` records sunnah.com's terms as **"private
        research use"**, and a public card is neither private nor research.

        The question had been raised in six consecutive handoffs and never actually PUT to Erik, and
        a passing test (`English renders verbatim`) made the behaviour look settled the whole time.

        SCOPE OF THE RULING — it named `h.english`, the narration. Two neighbours were flagged here
        rather than quietly swept in, and BOTH have since been put to Erik (2026-08-20, late):
          · `bab_en`, the English chapter title — WITHDRAWN. Same English apparatus, same terms.
          · `machine_id`, the machine Indonesian — KEPT, explicitly, even though it was GENERATED
            FROM this English. That is the whole of what Erik ruled: keep it. The DERIVATIVE-WORK
            QUESTION IS STILL OPEN AND WAS NOT ASKED — whether publishing a machine translation of
            text you may not publish is itself publication. It was put to him as context for the
            keep/withdraw choice, not as a question in its own right, and he answered the choice.
            Do not read the ruling as settling the principle.
            What the ruling does rest on is unchanged and documented: the ustadz's VERBAL approval
            covers DISPLAYING this Indonesian, and it keeps its `belum ditinjau` badge, which is the
            claim that actually matters. See `docs/review/rights-2026-08-20.md`.
        `h.english` also stays on the record and in the model's user message (`answer-contract.ts`);
        what was withdrawn is PUBLICATION, not possession.
      */ ""}

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
        ${/* The "Terjemahan Inggris: …" credit went with the English it credited — crediting a
             translation the reader cannot see is not attribution, it is noise. The SOURCE link
             above stays: what was withdrawn is the text, not the acknowledgement of where the
             record came from. Adjacent to Erik's ruling rather than named by it. */ ""}
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
