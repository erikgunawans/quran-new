/**
 * How an AI-authored answer tells the reader what it is, and WHERE it tells them.
 *
 * These three strings and the assembly below used to live inline in `main.ts`, where nothing could
 * test their ORDER — and order is the entire point. `aiHtml` returned `body + tail + AI_NOTE`, so
 * the only disclosure sat at the very bottom of the answer, beneath every paragraph and every verse
 * and hadith card.
 *
 * MEASURED ON PROD 2026-08-16, asking `apakah Allah mengampuni dosa besar`: the note rendered at
 * **11.68px** against **17.5px** prose and sat **1,730px** below the answer's first sentence — on a
 * SHORT answer (4 paragraphs, 2 verse cards). A reader meets several hundred words about God and
 * forgiveness, in the app's warm voice, long before anything says a machine wrote them. Disclosure
 * that arrives after the claim has already been read is not disclosure.
 *
 * The styling comment in `styles.css` had ALREADY committed to the fix and the code never carried it
 * out: *"The label is a touch more present than the reader-note — it must be readable, not fine
 * print, since it is the one thing telling the reader this answer is machine-made and not a fatwa."*
 * `.ai-note` overrode only `color` and `border-top-color`, inheriting `font-size: var(--step--1)`.
 * The intent was written down and never implemented.
 *
 * BOTH disclosures ship, and that is deliberate rather than belt-and-braces. The chip is the one a
 * reader cannot miss, so it carries the two facts that change how the words below should be read: a
 * machine wrote this, and it is not a fatwa. The footer keeps the full sentence — including where to
 * go for certainty — because "tanyakan kepada ustadz" is advice, and advice belongs at the end of
 * the reading, not stamped across the top of it.
 */

/**
 * The head chip. Short enough to be read rather than skipped, and it must stay short: it sits
 * directly above the answer, and a paragraph there would become another thing to scroll past.
 *
 * `role="note"` so a screen reader announces it as an aside rather than reading it as the answer's
 * opening sentence. The formal register is intentional across this app (Erik, 2026-08-15) — but a
 * chip is a label, not speech, so it takes no pronoun at all.
 */
export const AI_CHIP = `<p class="ai-disclosure" role="note">Disusun AI — bukan fatwa</p>`;

/**
 * The full disclosure, under the answer. Unchanged wording — it was never the sentence that was
 * wrong, only its position and its size.
 */
export const AI_NOTE = `<p class="reader-note ai-note">Jawaban ini disusun oleh AI berdasarkan ayat-ayat di atas — bukan fatwa, dan bukan kata-kata seorang ulama. Untuk kepastian, tanyakan kepada ustadz.</p>`;

/** Same disclosure, minus the pointer — used when no verse card made it onto the page, so the note
 *  never directs a reader to "the verses above" when there are none. */
export const AI_NOTE_NO_VERSES = `<p class="reader-note ai-note">Jawaban ini disusun oleh AI — bukan fatwa, dan bukan kata-kata seorang ulama. Untuk kepastian, tanyakan kepada ustadz.</p>`;

/**
 * Assemble a composed answer: disclosure, prose, whatever cards were grounded but never cited, and
 * the closing note.
 *
 * `hasVerses` picks which closing note is honest — it must reflect whether a card actually RENDERED,
 * not whether retrieval returned something. A note that points at "the verses above" when the page
 * shows none sends the reader hunting for evidence that was never drawn.
 */
export function assembleAnswer(body: string, tail: string, hasVerses: boolean): string {
  return AI_CHIP + body + tail + (hasVerses ? AI_NOTE : AI_NOTE_NO_VERSES);
}
