/**
 * When the person is not okay.
 *
 * This module exists because of one exchange, typed into the live app:
 *
 *   User: "aku gak sanggup bayar utang, pengen mati aja"
 *   Nur:  "Soal rezeki dan utang, Al-Qur'an bicara cukup langsung." → a verse about debt terms.
 *
 * Nur matched on the noun `utang` and did not see `pengen mati aja` at all. It answered a person
 * describing suicidal ideation with a verse about loan repayment, in a warm, confident voice.
 *
 * That is the product's founding persona — Rifqi, 19, in debt, awake at 2am — and it is the exact
 * moment the app most needed to notice a human being. So this check runs BEFORE reference parsing
 * and BEFORE retrieval. Nothing else gets to answer first.
 *
 * Three rules, and they are not negotiable:
 *
 *   1. ACKNOWLEDGE THE PERSON, NOT THE TOPIC. No verse leads. A person saying they want to die is
 *      not asking for a citation, and handing them one is a way of not listening.
 *   2. GIVE A REAL, REACHABLE RESOURCE. A human being who answers a phone in Indonesia, tonight.
 *   3. DO NOT PREACH, DO NOT RULE. Nur has no standing to tell someone their despair is a sin.
 *      The most harmful thing this app could do is make a person at their lowest feel judged by
 *      God's own book. Scripture is offered gently, second, and only as comfort — never as verdict.
 *
 * The detector is deliberately BROAD. A false positive costs a person one extra caring sentence.
 * A false negative costs something we cannot undo. That asymmetry decides every tuning question
 * here, and it is why this is a plain lexicon and not a score.
 */

/**
 * How Indonesians — especially young Indonesians — actually say it at 2am.
 *
 * Written in real, typed speech ("pengen", "gapapa", "gaada", "capek idup"), not in the formal
 * register a textbook would use. If the detector only understands clinical Indonesian it has
 * already failed the person it exists for.
 */
const CRISIS_TERMS: readonly string[] = [
  // wanting to die
  "pengen mati", "pengin mati", "pengen mati aja", "ingin mati", "mau mati", "mati aja",
  "pgn mati", "px mati", "kepengen mati", "pengen mati aja rasanya",
  // suicide, explicit
  "bunuh diri", "bundir", "gantung diri", "akhiri hidup", "mengakhiri hidup", "akhiri saja hidupku",
  "nyawa sendiri", "lompat dari",
  // not wanting to exist
  "gak mau hidup", "ga mau hidup", "nggak mau hidup", "males hidup", "capek hidup", "capek idup",
  "lelah hidup", "gak sanggup hidup", "ga sanggup hidup", "udah gak kuat hidup",
  "pengen hilang", "pengen menghilang", "pengen lenyap", "hilang aja dari dunia",
  "gaada gunanya hidup", "gak ada gunanya hidup", "hidupku sia-sia", "buat apa hidup",
  "lebih baik gak ada", "lebih baik mati",
  // self-harm
  "nyakitin diri", "menyakiti diri", "melukai diri", "sayat", "nyayat", "silet", "self harm",
  "self-harm", "nyilet",
  // hopelessness with intent
  "gak ada harapan lagi", "udah gak ada jalan", "semua percuma", "gak ada yang peduli",
  "menyerah aja", "udah nyerah sama hidup",
];

export interface CrisisSignal {
  /** The phrase we actually matched. Never hidden from the log; never shown as an accusation. */
  readonly matched: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Does this message carry a signal that the person may be in danger?
 *
 * Substring matching on a normalised string. Crude on purpose: it must fire on "pengen mati aja"
 * inside a longer sentence about debt, which is precisely the case that failed. Cleverness here
 * buys nothing and risks missing someone.
 */
export function detectCrisis(input: string): CrisisSignal | null {
  const q = norm(input);
  if (!q) return null;

  for (const term of CRISIS_TERMS) {
    if (q.includes(term)) return { matched: term };
  }
  return null;
}

/**
 * Indonesia's national mental-health line.
 *
 * SEJIWA, operated by Kementerian Kesehatan: dial 119, then extension 8. Free, 24 hours.
 * This number is a real-world commitment and is deliberately the ONLY one we name — a list of
 * options is a decision to make, and a person in crisis should not be made to choose.
 */
export const HELPLINE = {
  name: "SEJIWA (Kemenkes)",
  dial: "119",
  ext: "8",
  tel: "tel:119",
  note: "gratis, 24 jam",
} as const;

/**
 * What Nur says.
 *
 * Read this out loud before changing a word of it. It speaks to the person, not about the problem.
 * It does not quote scripture. It does not say "be patient". It does not mention sin, or reward,
 * or trial. It says: I heard you, you matter, here is a human who will pick up, and I am still here.
 */
export function crisisReply(): string {
  return `
    <div class="crisis" role="alert">
      <p class="crisis-lead">Aku berhenti sebentar, karena yang barusan kamu tulis itu penting.</p>

      <p>Kalau kamu lagi kepikiran untuk mengakhiri hidup, atau menyakiti diri sendiri — aku nggak
      mau cuma ngasih kamu ayat lalu pergi. Kamu berharga, dan rasa sakit yang kamu rasakan sekarang
      itu nyata. Kamu nggak harus menanggungnya sendirian malam ini.</p>

      <p class="crisis-line">
        Ada orang yang siap mendengarkan, sekarang juga:<br>
        <a class="crisis-cta" href="${HELPLINE.tel}">
          <b>Telepon 119</b> — lalu tekan <b>8</b>
        </a>
        <span class="crisis-meta">${HELPLINE.name} · ${HELPLINE.note}</span>
      </p>

      <p class="crisis-close">Kalau ada orang terdekat yang bisa kamu hubungi malam ini — kakak,
      teman, siapa pun — hubungi dia juga. Aku tetap di sini kalau kamu mau lanjut cerita atau
      cuma mau membaca.</p>
    </div>`;
}
