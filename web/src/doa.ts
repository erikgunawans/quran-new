/**
 * Kumpulan Doa — the supplications the Qur'an itself teaches.
 *
 * WHY THIS SECTION HOLDS NO TEXT
 *
 * The obvious way to build a doa section is to vendor a doa book. Every candidate was checked and
 * every one failed: Hisnul Muslim is in copyright until ~2068 and Darussalam's translation reserves
 * all rights; Kemenag's own *Kumpulan Doa Sehari-Hari* carries "Dilarang memperbanyak isi buku…" on
 * its copyright page, which switches off the government-works exemption in UU 28/2014 Pasal 43(b);
 * the MIT-labelled doa repositories on GitHub licence their *structure* while the Indonesian text
 * inside them is credited to no one. equran.id does permit display with attribution — but their
 * own records cite third-party dakwah sites for 128 of 227 entries, so their permission reaches
 * only as far as what they hold.
 *
 * So this module ships REFERENCES, never text. Every card is a doorway into `#/surah/N#A`, where
 * the Arabic and both Indonesian translations already render from the corpus this app already has
 * the right to serve — Tanzil's verbatim Uthmani text under attribution, with UU 28/2014 Pasal
 * 42(e) underneath it ("tidak ada Hak Cipta atas … kitab suci"). Nothing here is authored except
 * the Indonesian titles, which are this project's own editorial voice, the same way `fikih.ts`
 * writes area names over hadith it does not reproduce.
 *
 * The second reason is technical and just as binding: Arabic written by hand byte-differs from the
 * corpus even when it renders identically, because combining marks can be emitted in a different
 * canonical order. A module that quoted scripture would have to be verified glyph by glyph forever.
 * A module that quotes nothing cannot drift. `doa.test.ts` enforces both properties — every ref
 * resolves against the shipped shards, and no entry carries Arabic script.
 */

/** One ayah, addressed the way the reading surface addresses it. */
export interface DoaRef {
  surah: number;
  ayah: number;
  /** Who is speaking, or the occasion — Indonesian, ours. Never a translation of the ayah. */
  label: string;
}

export interface DoaTheme {
  id: string;
  title: string;
  /** One line of Indonesian context. Editorial, not exegetical — it frames, it never rules. */
  sub: string;
  refs: readonly DoaRef[];
}

/**
 * Grouped by WHO IS ASKING and WHAT FOR, not by surah order.
 *
 * A doa book's value is that it finds you where you are — someone who cannot sleep is not looking
 * up Al-Anbiya', they are looking for the du'a of a person in distress. Surah order would rebuild
 * the mushaf we already ship at `#/baca` and add nothing.
 */
export const DOA_THEMES: readonly DoaTheme[] = [
  {
    id: "pembuka",
    title: "Pembuka dan perlindungan",
    sub: "Doa yang dibaca setiap hari — pembuka Al-Qur'an dan tiga surah perlindungan.",
    refs: [
      { surah: 1, ayah: 6, label: "Permintaan inti dalam Al-Fatihah" },
      { surah: 2, ayah: 255, label: "Ayat Kursi" },
      { surah: 2, ayah: 286, label: "Penutup Al-Baqarah — tentang batas kemampuan" },
      { surah: 113, ayah: 1, label: "Al-Falaq — surah perlindungan" },
      { surah: 114, ayah: 1, label: "An-Nas — surah perlindungan" },
    ],
  },
  {
    id: "ampunan",
    title: "Memohon ampunan",
    sub: "Kalimat yang diucapkan para nabi ketika sadar telah keliru.",
    refs: [
      { surah: 7, ayah: 23, label: "Adam — setelah menzalimi diri sendiri" },
      { surah: 28, ayah: 16, label: "Musa — setelah perbuatan yang ia sesali" },
      { surah: 21, ayah: 87, label: "Yunus — dari dalam kegelapan" },
      { surah: 3, ayah: 147, label: "Ampunan dan keteguhan bagi yang berjuang" },
      { surah: 71, ayah: 28, label: "Nuh — untuk dirinya, orang tuanya, dan orang beriman" },
    ],
  },
  {
    id: "kesulitan",
    title: "Saat sempit dan takut",
    sub: "Doa orang yang sedang di titik terendah — sakit, terdesak, atau ketakutan.",
    refs: [
      { surah: 21, ayah: 83, label: "Ayyub — ketika penyakit menimpanya" },
      { surah: 26, ayah: 80, label: "Ibrahim — ketika sakit, kepada siapa ia berharap" },
      { surah: 20, ayah: 25, label: "Musa — sebelum tugas yang berat" },
      { surah: 28, ayah: 24, label: "Musa — setelah menolong, dalam keadaan tak punya apa-apa" },
      { surah: 3, ayah: 173, label: "Kalimat yang diucapkan ketika diancam" },
    ],
  },
  {
    id: "keluarga",
    title: "Orang tua dan keturunan",
    sub: "Doa untuk orang yang membesarkan kita, dan untuk anak yang dinanti.",
    refs: [
      { surah: 17, ayah: 24, label: "Doa seorang anak untuk ayah dan ibunya" },
      { surah: 14, ayah: 41, label: "Ibrahim — memohonkan ampun bagi orang tuanya" },
      { surah: 3, ayah: 38, label: "Zakaria — menanti keturunan yang baik" },
      { surah: 21, ayah: 89, label: "Zakaria — takut tidak ada penerus" },
      { surah: 25, ayah: 74, label: "Permintaan tentang pasangan dan anak" },
    ],
  },
  {
    id: "ilmu",
    title: "Ilmu dan pekerjaan",
    sub: "Doa sebelum belajar, sebelum bicara, dan atas apa yang sudah diberikan.",
    refs: [
      { surah: 20, ayah: 114, label: "Permintaan agar ilmu ditambah" },
      { surah: 20, ayah: 26, label: "Musa — sebelum menghadap penguasa" },
      { surah: 27, ayah: 19, label: "Sulaiman — syukur atas nikmat" },
      { surah: 46, ayah: 15, label: "Syukur, dan kebaikan yang menurun ke anak" },
      { surah: 14, ayah: 40, label: "Ibrahim — tentang salat, untuk diri dan keturunannya" },
    ],
  },
  {
    id: "dikabulkan",
    title: "Tentang doa itu sendiri",
    sub: "Ayat yang berbicara tentang berdoa — bukan lafalnya, tetapi janji dan adabnya.",
    refs: [
      { surah: 2, ayah: 186, label: "Jawaban Allah ketika ditanya tentang kedekatan-Nya" },
      { surah: 40, ayah: 60, label: "Janji bahwa permintaan itu didengar" },
      { surah: 7, ayah: 55, label: "Adab meminta — pelan, tidak menuntut" },
      { surah: 19, ayah: 4, label: "Zakaria — tubuhnya menua, harapannya tidak" },
    ],
  },
  {
    id: "akhirat",
    title: "Dunia dan akhirat",
    sub: "Permintaan yang tidak berhenti di dunia.",
    refs: [
      { surah: 2, ayah: 201, label: "Permintaan yang mencakup dua negeri" },
      { surah: 3, ayah: 8, label: "Takut kehilangan petunjuk yang sudah didapat" },
      { surah: 3, ayah: 16, label: "Pengakuan iman, lalu permohonan ampun" },
      { surah: 40, ayah: 7, label: "Doa para malaikat untuk orang beriman" },
      { surah: 66, ayah: 8, label: "Permintaan pada hari cahaya jadi penentu" },
    ],
  },
];

/** Every ref in the section, flattened — used by the tests and by the count in the header. */
export const allDoaRefs = (): readonly DoaRef[] => DOA_THEMES.flatMap((t) => t.refs);

/**
 * The reading-surface address for a doa.
 *
 * Matches the detail route `main.ts` already parses (`#/surah/N#A`) rather than inventing one, so
 * the section stays a doorway: no new route, no new corpus fetch, no second renderer for scripture.
 */
export const doaHref = (r: DoaRef): string => `#/surah/${r.surah}#${r.ayah}`;
