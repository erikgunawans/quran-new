/**
 * "Kejutkan aku" — the I'm-Feeling-Lucky affordance for someone who doesn't know how to begin.
 *
 * The point of this app is that you type how you FEEL, not a query. But a blank field asking for a
 * feeling is its own kind of intimidating at 2am. This drops a real, human-shaped question into the
 * composer so the person sees what "just talk to me" looks like — then decides whether to send it.
 * It never auto-sends.
 *
 * The pool is the app's own content, both halves of it:
 *   - FEELINGS — the heart. Each maps to a real theme in the 83-theme corpus, so it always lands on
 *     an actual verse (pinned by lucky.test.ts, which runs the real retrieval over every one). A
 *     lucky button that sometimes returns silence would be worse than no button.
 *   - READINGS — the Baca side: surah names and refs the parser resolves, so a draw can just as
 *     easily open Ar-Rahman as name a feeling. This is what makes it "the whole content", not only
 *     the feelings path.
 */

/** Feeling-shaped questions. Every one must retrieve ≥1 verse — enforced by lucky.test.ts. */
export const LUCKY_FEELINGS: readonly string[] = [
  "aku ngerasa gagal terus",
  "capek banget, pengen nyerah",
  "takut mikirin masa depan",
  "lagi kesepian, kayak nggak ada yang ngerti",
  "susah move on dari masa lalu",
  "ngerasa makin jauh dari Allah",
  "iri lihat hidup orang lain",
  "lagi marah banget, susah sabar",
  "kangen orang tua yang udah tiada",
  "overthinking terus tiap malam",
  "ngerasa diriku nggak ada gunanya",
  "pengen berubah jadi lebih baik",
  "ngerasa dosaku udah kebanyakan",
  "takut sama kematian",
  "lagi susah bersyukur",
  "baru dikhianati orang terdekat",
  "lagi minder banget sama orang lain",
  "hidup terasa hampa",
  "baru kehilangan pekerjaan",
  "stres mikirin ujian",
  "lagi difitnah, sakit rasanya",
  "pengen berdamai sama yang pernah nyakitin",
];

/** Direct-reading prompts. Every one must parse to a surah/ayah — enforced by lucky.test.ts. */
export const LUCKY_READINGS: readonly string[] = [
  "yasin",
  "ar-rahman",
  "al-kahf",
  "al-mulk",
  "2:255",
  "94:5",
];

export const LUCKY_PROMPTS: readonly string[] = [...LUCKY_FEELINGS, ...LUCKY_READINGS];

/**
 * Pick a prompt at random, never repeating the one just shown, so consecutive clicks always change.
 * `rand` is injectable so the test is deterministic; production passes Math.random.
 */
export function pickLucky(previous: string | null, rand: () => number = Math.random): string {
  if (LUCKY_PROMPTS.length <= 1) return LUCKY_PROMPTS[0]!;
  let choice = previous;
  while (choice === null || choice === previous) {
    choice = LUCKY_PROMPTS[Math.floor(rand() * LUCKY_PROMPTS.length)]!;
  }
  return choice;
}
