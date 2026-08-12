/**
 * CANDIDATES for the landing's random-question generator — not the shipped pool.
 *
 * These are drawn from the Gen Z curiosity pillars in CONTENT.md: the questions a young Indonesian
 * Muslim actually turns over — doubt, identity, money, friendship, worship they were taught by rote,
 * the gap between what they were told and what they feel. They are QUESTIONS, not confessions; the
 * four feeling-seeds they replace covered the confession door and this one covers curiosity.
 *
 * Every entry here is a candidate until `bun run src/app/probe-ask-seeds.ts` says otherwise. The
 * shipped pool lives in `web/src/ask-seeds.ts` and contains only what survived.
 *
 * DELIBERATELY ABSENT: family-law rulings (nikah siri, waris, poligami, beda agama). Those either
 * refer to a scholar by design or retrieve badly right now, and a generator that can roll one is a
 * machine for showcasing the app's worst answer. They are the ustadz's, not the generator's.
 */
export const CANDIDATES: readonly string[] = [
  // doubt and distance from God
  "kenapa doaku belum juga dikabulkan",
  "apakah Allah masih sayang sama aku",
  "gimana caranya biar khusyuk saat salat",
  "kenapa aku merasa jauh dari Allah",
  "apa tandanya Allah sayang sama kita",
  "gimana cara taubat yang benar",
  "apakah dosa besar bisa diampuni",
  // meaning and purpose
  "apa tujuan hidup menurut Al-Qur'an",
  "kenapa manusia diciptakan",
  "apa yang terjadi setelah kita mati",
  "kenapa hidup terasa berat terus",
  // money and work
  "apa kata Al-Qur'an tentang rezeki",
  "gimana Islam memandang kerja keras",
  "apakah kaya itu buruk dalam Islam",
  "apa hukum riba dalam Al-Qur'an",
  // people
  "gimana cara memaafkan orang yang menyakiti",
  "apa kata Al-Qur'an tentang berbakti pada orang tua",
  "gimana Islam mengajarkan berteman",
  "apa hukum bergunjing dan menggosip",
  "gimana cara menahan marah menurut Islam",
  // worship taught by rote
  "kenapa kita harus salat lima waktu",
  "apa makna puasa selain menahan lapar",
  "kenapa Al-Qur'an diturunkan dalam bahasa Arab",
  "apa keutamaan membaca Al-Qur'an",
  "apa itu takwa sebenarnya",
  // identity and the world
  "gimana bersikap ke teman yang beda agama",
  "apa kata Al-Qur'an tentang keadilan",
  "gimana Islam memandang ilmu pengetahuan",
  "apa kata Al-Qur'an tentang menjaga alam",
  "gimana cara bersyukur yang benar",
];
