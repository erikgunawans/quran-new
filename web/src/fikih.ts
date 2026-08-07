/**
 * Fikih — dalil-only DATA (topic → the relevant Ṣaḥīḥayn kitab).
 *
 * WHY THIS SHAPE. New-Quranku never authors or issues fiqh — no ruling text, no "this ayah proves
 * that". A legally-clean, Indonesian, topic-structured fiqh CORPUS does not exist off the shelf
 * (research 2026-08-08: IslamHouse/Kemenag/rumahfiqih are obtainable only with written permission;
 * classical translations are separately copyrighted). So v1 is a doorway, not a treatise: each amal
 * area points into the hadith we already display, grouped by the COMPILERS' OWN كتاب divisions —
 * كتاب الطهارة, كتاب الصلاة, كتاب الزكاة… That grouping is al-Bukhari's and Muslim's, not ours.
 *
 * NO ARABIC HERE — on purpose. A ref is only (collection, book number). The Arabic kitab name is read
 * from the built hadith index at render time, so it stays byte-exact from the corpus and is never
 * retyped. The Indonesian title/sub are plain navigation labels (what the topic covers), never a
 * ruling. Qur'anic dalil + explanatory fiqh are the gated next step, from a licensed + reviewed source.
 */

export interface FiqhRef {
  readonly collection: string;
  readonly book: number;
}

export interface FiqhArea {
  readonly id: string;
  /** Indonesian navigation label. */
  readonly title: string;
  /** Plain descriptor of what the area covers — navigation, never a ruling. */
  readonly sub: string;
  /** The compilers' own kitab that hold this area's hadith. */
  readonly refs: readonly FiqhRef[];
}

/**
 * Core amaliyah, each mapped to the kitab the two imams themselves placed the material under
 * (numbers verified against web/public/hadith/index.json). Kept to areas where the kitab label IS
 * the topic, so the mapping carries no editorial fiqh claim.
 */
export const FIQH_AREAS: readonly FiqhArea[] = [
  {
    id: "thaharah",
    title: "Thaharah",
    sub: "Bersuci — wudu, mandi, tayamum, dan haid.",
    refs: [
      { collection: "muslim", book: 2 },
      { collection: "bukhari", book: 4 },
      { collection: "bukhari", book: 5 },
      { collection: "bukhari", book: 7 },
      { collection: "bukhari", book: 6 },
      { collection: "muslim", book: 3 },
    ],
  },
  {
    id: "salat",
    title: "Salat",
    sub: "Salat wajib, waktunya, azan, dan salat Jumat.",
    refs: [
      { collection: "bukhari", book: 8 },
      { collection: "bukhari", book: 9 },
      { collection: "bukhari", book: 10 },
      { collection: "bukhari", book: 11 },
      { collection: "muslim", book: 4 },
      { collection: "muslim", book: 7 },
    ],
  },
  {
    id: "zakat",
    title: "Zakat",
    sub: "Zakat harta dan orang-orang yang berhak menerimanya.",
    refs: [
      { collection: "bukhari", book: 24 },
      { collection: "muslim", book: 12 },
    ],
  },
  {
    id: "puasa",
    title: "Puasa",
    sub: "Puasa Ramadan dan puasa-puasa sunah.",
    refs: [
      { collection: "bukhari", book: 30 },
      { collection: "muslim", book: 13 },
    ],
  },
  {
    id: "haji",
    title: "Haji & Umrah",
    sub: "Ibadah haji dan umrah ke Baitullah.",
    refs: [
      { collection: "bukhari", book: 25 },
      { collection: "bukhari", book: 26 },
      { collection: "muslim", book: 15 },
    ],
  },
  {
    id: "jenazah",
    title: "Jenazah",
    sub: "Memandikan, mengafani, menyalati, dan memakamkan.",
    refs: [
      { collection: "bukhari", book: 23 },
      { collection: "muslim", book: 11 },
    ],
  },
  {
    id: "nikah",
    title: "Nikah",
    sub: "Pernikahan dan kehidupan rumah tangga.",
    refs: [
      { collection: "bukhari", book: 67 },
      { collection: "muslim", book: 16 },
    ],
  },
  {
    id: "talak",
    title: "Talak",
    sub: "Perceraian dan ketentuan yang menyertainya.",
    refs: [
      { collection: "bukhari", book: 68 },
      { collection: "muslim", book: 18 },
    ],
  },
  {
    id: "muamalah",
    title: "Muamalah",
    sub: "Jual-beli dan urusan harta.",
    refs: [
      { collection: "bukhari", book: 34 },
      { collection: "muslim", book: 21 },
    ],
  },
  {
    id: "makanan",
    title: "Makanan & Minuman",
    sub: "Yang halal dimakan, sembelihan, dan minuman.",
    refs: [
      { collection: "bukhari", book: 70 },
      { collection: "bukhari", book: 72 },
      { collection: "bukhari", book: 74 },
      { collection: "muslim", book: 34 },
      { collection: "muslim", book: 36 },
    ],
  },
];
