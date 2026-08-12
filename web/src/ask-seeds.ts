/**
 * The question pool behind the "Coba tanya ini" card.
 *
 * WHY A MEASURED POOL AND NOT A WRITTEN ONE. This card hands its output straight to Tanya. Anything
 * in here that retrieves badly converts a failure the reader had to TYPE into one the app OFFERS,
 * unprompted, on the front door. So every question below was run end-to-end through the real lanes
 * — `looksFactual` → aqidah → `retrieveKnowledge`, then the feelings fall-through, in main.ts's own
 * order — before it was allowed in.
 *
 *   bun run src/app/probe-ask-seeds.ts   → docs/review/ask-seed-probe-2026-08-12.txt
 *   30 candidates: KNOWLEDGE 12 · FEELING 11 · SILENT 7
 *
 * THE SEVEN SILENT ONES ARE NOT HERE, and that is the whole point of the file. `gimana cara taubat
 * yang benar`, `apa itu takwa sebenarnya`, `apa kata Al-Qur'an tentang keadilan` and four others
 * all read like perfectly good questions and all come back with nothing. A generator that can roll
 * a silent question is worse than no generator.
 *
 * ONE MORE IS HELD, and it is not silent: `gimana bersikap ke teman yang beda agama` routes to
 * `perintah-dan-larangan` with 8 entries. A routing hit is not proof the entries answer the
 * question, and "beda agama" is the exact phrasing that fails elsewhere in this app — the same
 * shard answers `nikah beda agama` with QS 4:25 about marrying slave women. It ships when someone
 * has read those eight entries, not before.
 *
 * Family-law rulings were excluded from the candidate set by construction and must stay excluded.
 */

/** 22 questions: the 30 probed, minus 7 SILENT, minus 1 held for review. */
export const ASK_SEEDS: readonly string[] = [
  // FEELING — the 191-verse reviewed corpus answers these
  "kenapa doaku belum juga dikabulkan",
  "apakah Allah masih sayang sama aku",
  "kenapa aku merasa jauh dari Allah",
  "apa tandanya Allah sayang sama kita",
  "apakah dosa besar bisa diampuni",
  "apa tujuan hidup menurut Al-Qur'an",
  "kenapa hidup terasa berat terus",
  "apa kata Al-Qur'an tentang rezeki",
  "gimana Islam memandang kerja keras",
  "apa kata Al-Qur'an tentang berbakti pada orang tua",
  "gimana cara bersyukur yang benar",
  // KNOWLEDGE — Ustadz Thalib's Indeks Tematik answers these
  "gimana caranya biar khusyuk saat salat",
  "apa yang terjadi setelah kita mati",
  "apa hukum riba dalam Al-Qur'an",
  "gimana cara memaafkan orang yang menyakiti",
  "apa hukum bergunjing dan menggosip",
  "gimana cara menahan marah menurut Islam",
  "kenapa kita harus salat lima waktu",
  "apa makna puasa selain menahan lapar",
  "kenapa Al-Qur'an diturunkan dalam bahasa Arab",
  "apa keutamaan membaca Al-Qur'an",
  "gimana Islam memandang ilmu pengetahuan",
];

/**
 * A question that is not the one showing now.
 *
 * `exclude` matters more than it looks: without it, one draw in 22 repeats the question the reader
 * just pressed "acak" to get away from, and a shuffle button that visibly does nothing reads as
 * broken rather than unlucky. Falls back to a plain draw if the pool is ever down to one.
 */
export function nextSeed(exclude?: string, rand: () => number = Math.random): string {
  const pool = ASK_SEEDS.filter((q) => q !== exclude);
  const from = pool.length > 0 ? pool : ASK_SEEDS;
  return from[Math.floor(rand() * from.length)] ?? from[0]!;
}
