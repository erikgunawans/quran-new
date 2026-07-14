/**
 * Crisis-path detection.
 *
 * Verified live: "aku gak sanggup bayar utang, pengen mati aja" matched only on "utang" and
 * returned a verse about debt repayment. Nur never saw "pengen mati aja" at all — there was NO
 * crisis path anywhere in the codebase. Rifqi, 19, in debt, at 2am, is PRODUCT.md's founding
 * persona. This was the single highest-severity gap the product had.
 *
 * Detection is PHRASE-based, not single-word — "mati" alone is far too broad ("kalau aku mati
 * duluan gimana" is a completely different sentence) — and deliberately over-inclusive. Erik
 * ruled (2026-07-14) that the resource ships ALONGSIDE the normal verse match, never instead of
 * it, which is exactly why over-inclusion is the right default here: the cost of a false
 * positive is a caring message someone didn't strictly need, and the cost of a false negative is
 * the exact failure reproduced above. When in doubt, show it.
 */
import { norm } from "./retrieve.ts";

const CRISIS_PHRASES = [
  "pengen mati",
  "pengin mati",
  "pingin mati",
  "mau mati aja",
  "mau mati saja",
  "bunuh diri",
  "mengakhiri hidup",
  "akhiri hidup",
  "gak sanggup hidup",
  "ga sanggup hidup",
  "nggak sanggup hidup",
  "tidak sanggup hidup",
  "gak kuat hidup",
  "ga kuat hidup",
  "nggak kuat hidup",
  "tidak kuat hidup",
  "capek hidup",
  "cape hidup",
  "lelah hidup",
  "pengen hilang aja",
  "pengen menghilang selamanya",
  "gak mau hidup lagi",
  "ga mau hidup lagi",
  "nggak mau hidup lagi",
  "tidak mau hidup lagi",
  "mending mati",
  "lebih baik mati",
  "menyakiti diri",
  "melukai diri sendiri",
  "self harm",
] as const;

export function detectCrisis(question: string): boolean {
  const q = norm(question);
  return CRISIS_PHRASES.some((p) => q.includes(p));
}

/**
 * Kemenkes RI's official crisis line — Erik's ruling, 2026-07-14. Not a claim of clinical
 * authority; a door to someone who can actually help, stated plainly.
 */
export const CRISIS_RESOURCE = {
  title: "Kalau kamu sedang di titik itu…",
  body: "Yang kamu rasakan itu nyata, dan kamu tidak harus menghadapinya sendirian. Ada layanan yang siap dengar kamu sekarang, gratis dan rahasia:",
  hotline: "SEJIWA (Kementerian Kesehatan RI)",
  phone: "119 ext. 8",
  note: "Siap 24 jam. Ini bukan pengganti ayat di bawah — keduanya untuk kamu, sekarang.",
} as const;
