/**
 * Naming variants — the same concept under a different word.
 *
 * The scholar's index is written in his vocabulary; people ask in theirs. So the app was returning
 * "I have no reviewed answer" to questions he had ALREADY answered: someone types `ghibah`, he
 * wrote `menggunjing`, and four reviewed entries sat unreachable. That is not a gap in his work.
 * It is a dictionary problem, and it is ours.
 *
 * ═══ THE LINE THIS FILE MUST NOT CROSS ═══
 *
 * Every pair here is the SAME THING NAMED TWICE. `ghibah` IS `menggunjing`; that is a fact about
 * Indonesian and Arabic vocabulary, and stating it asserts nothing about religion.
 *
 * What must NEVER go in here is an association that is really a RULING:
 *
 *   pinjol   -> riba              asserts that online lending IS riba
 *   asuransi -> judi              asserts that insurance IS gambling
 *   aborsi   -> membunuh anak     asserts those verses govern abortion
 *   kripto   -> gharar            asserts crypto carries prohibited uncertainty
 *
 * Each of those may well be right. Not one of them is a naming variant — they are fiqh
 * conclusions, and encoding them here would make the app issue rulings through a lookup table,
 * which is precisely what it exists not to do. They belong in the ustadz's worklist, as proposals
 * for him to accept or reject. See docs/review/ustadz-worklist.md.
 *
 * The test for adding an entry: could a translator settle it with a dictionary, without consulting
 * a scholar? If yes, it belongs here. If it needs a scholar, it does not.
 */

/** asked word → the word(s) the index uses for the SAME concept. Lowercase, normalised. */
export const VOCABULARY: Readonly<Record<string, readonly string[]>> = {
  // Arabic term vs the Indonesian verb the index uses for it.
  ghibah: ["menggunjing", "gunjing", "digunjing"],
  namimah: ["mengadu domba"],
  // Acronym vs the words the index spells out. Both name the same acts, no ruling implied.
  lgbt: ["homoseksual", "lesbian"],
  homo: ["homoseksual"],
  // Root form vs the affixed form the index happens to use. `stemReach` only widens a SHORT asked
  // word into a LONGER written one, so a prefixed written form ("mengkorupsi") is unreachable
  // from the bare root without this.
  korupsi: ["mengkorupsi"],
  // NOTE: `musik -> bernyanyi` was here and was REMOVED. Singing and music are not the same thing;
  // a translator would not equate them, so asserting that entries about bernyanyi answer a question
  // about musik is a fiqh association, not a naming variant. knowledge.test.ts pinned it and caught
  // the mistake. It belongs in the ustadz's worklist, not in this file.
  bohong: ["dusta", "berdusta"],
  sombong: ["takabur"],
  pelit: ["kikir", "bakhil"],
  // Spelling variants of the same term.
  sholat: ["shalat", "salat"],
  shalat: ["sholat", "salat"],
  salat: ["shalat", "sholat"],
  tobat: ["taubat"],
  taubat: ["tobat"],
  rezeki: ["rizki", "rizeki"],
  jum: ["jumat", "jum'at"],
};

/** Every form an asked word may legitimately match, itself included. Never widens beyond naming. */
export function vocabularyForms(word: string): readonly string[] {
  const alt = VOCABULARY[word];
  return alt ? [word, ...alt] : [word];
}
