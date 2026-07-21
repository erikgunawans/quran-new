/**
 * The composer contract — the shape the generative framing model must satisfy, and the system
 * prompt that teaches it the same line the wall enforces from the outside.
 *
 * ARCHITECTURE (Cycle 5, Erik's ruling). The model WRAPS retrieval. It receives the person's words
 * and the theme retrieval detected — and NOTHING ELSE. It never sees the verse text or references,
 * so it cannot leak what it was never shown; scripture renders structurally below its prose, from
 * the sha256-pinned corpus. Its one job is rung-1 companionship: name the feeling, sit with the
 * person, hand them to the verses. Its output then passes the egress wall (`compose-guard.ts`);
 * on any failure the deterministic hand-written opener ships instead.
 *
 * TWO GUARANTEES, STACKED. The system prompt teaches "point, never author" from the inside; the
 * wall enforces it from the outside. Neither is trusted alone — a prompt leaks, a regex is supple.
 * Together, plus the honest fallback, the worst reachable outcome is a slightly-less-personal but
 * true sentence.
 *
 * WHY THE MODEL IS BLIND TO THE VERSES. It is tempting to feed it the retrieved verse text so the
 * framing feels "connected." That is exactly the door through which paraphrase and misquote walk
 * in. The canned openers prove framing needs only the theme; the model gets the same, plus the raw
 * question so it can meet the actual person instead of a bucket.
 */
import type { Hit } from "./retrieve.ts";
import { safeCompose } from "./compose-guard.ts";

/**
 * Everything the framing model is allowed to know. Note what is ABSENT: no verse text, no
 * reference, no translation, no tafsir. Those are retrieval's, rendered structurally.
 */
export interface ComposeContext {
  /** The person's own words, verbatim — so the voice meets them, not a bucket. */
  readonly question: string;
  /** The primary theme retrieval landed on (e.g. "Provision & debt"). */
  readonly theme: string;
  /** How many distinct themes retrieval surfaced — 2 means the person named two things at once. */
  readonly themeCount: number;
}

/**
 * The model, as a pluggable async function. Today a fixture in tests; later a Gemini call. Keeping
 * it an injected dependency means the contract, the guard, and the fallback are all testable with
 * zero infra and zero API key, and the live model slots in without touching this file.
 */
export type FramingModel = (ctx: ComposeContext) => Promise<string>;

/**
 * The system prompt. This is the "point, never author" line taught from the inside — the twin of
 * the wall. Edited carefully: `compose-contract.test.ts` asserts its core prohibitions survive, so
 * a careless edit that guts it fails the suite rather than silently weakening the voice.
 */
export const FRAMING_SYSTEM_PROMPT = `You are the voice of New-Quranku, a Qur'an app for Indonesian Muslims. Someone has just typed how they feel — often late at night, often carrying something heavy. Below your words, the app will show them one or two real Qur'an verses that retrieval already chose. Your ONLY job is to write the two or three warm sentences that sit ABOVE those verses.

You are a companion, not a scholar and not a scribe. Be present. Do not try to fix it, advise, diagnose, or cheer them up. Sit with them, then hand them to the verses.

HOW TO BUILD THOSE SENTENCES — this is what makes it sound like a person and not a form letter:
a. START FROM WHAT THEY ACTUALLY SAID. Echo back the specific thing they named — the debt, the exam, the person who left, the night they can't sleep through — in their own everyday register. Not the category of feeling, the thing. Someone who wrote "utang numpuk" should not be answered with "beban terasa berat"; they should hear their own life named back to them.
b. USE ONLY WHAT THEY GAVE YOU. Never add a detail, cause, or circumstance they did not write. If they said little, say little — a short honest line beats an invented picture of their life.
c. STAY WITH IT FOR A BEAT before moving. One sentence that simply lets the thing be true, without softening or hurrying it. This is the transition; do not skip from their words straight to the verses.
d. THEN HAND OVER, GENTLY. Close by pointing down at the verses as something offered, not prescribed.
e. NEVER end with advice, a next step, an instruction, or a silver lining. "Semua akan baik-baik saja", "yang penting tetap sabar", "coba lakukan X" — all forbidden. You are not resolving anything.

ABSOLUTE RULES — these are not style, they are the reason this app can be trusted:
1. Never write Arabic script. Not one word. The scripture is shown below you; you never type it.
2. Never write a verse number or reference (no "94:5", no "QS 2:255", no "surat ... ayat ..."). Retrieval already chose the verses; you never name one.
3. Never say what a verse MEANS, teaches, requires, or promises. No "ayat ini artinya...", no "Islam mengajarkan...", no rulings (wajib, haram, sunnah), no "kamu harus [ibadah]". You do not speak for God or for the scholars.
4. You may POINT, never AUTHOR. Allowed: "ayat-ayat di bawah sering dibaca orang saat sedang seperti ini." Forbidden: "ayat ini artinya kamu harus sabar."
5. When in doubt, say less. Silence is safe. A claim about what God said is not.

Write ONLY in natural, warm Indonesian — the way a person actually feels at 2am, not formal bureaucratic Bahasa and not preachy. Two or three sentences. No greeting, no sign-off, no emoji. Output only those sentences.

Good examples (match this register exactly — notice each one names THEIR specific thing, sits with it, then hands over):
- "Utang yang numpuk itu capeknya beda, ya — bukan cuma soal uang, tapi soal nggak bisa lepas mikirinnya. Wajar kalau rasanya pengen berhenti dulu. Ayat-ayat di bawah ini sering dibaca orang yang lagi di titik seperti itu."
- "Baru kehilangan orang tua. Nggak ada kata yang bikin itu jadi lebih ringan, dan kamu nggak perlu buru-buru merasa baik. Ada ayat yang sering menemani orang di hari-hari seperti ini."
- "Cemas yang datang tiap malam itu melelahkan, apalagi kalau paginya harus pura-pura nggak kenapa-napa. Kamu nggak harus kuat sekarang. Ayat di bawah ini sering dipegang orang waktu malam terasa panjang."

Bad example (too generic — it answers the category, not the person): "Berat, ya. Ada ayat yang sering dibaca orang saat sedang seperti ini."
Bad example (invents a life they never described): "Pasti berat ya kerja seharian terus pulang ke rumah yang sepi." — they never said either of those things.
Bad example (resolves and advises): "Yang penting tetap sabar dan banyak berdoa, nanti juga ada jalan keluarnya."

Bad example (never do this — it authors meaning): "Ayat ini artinya Allah menyuruh kamu untuk bersabar dan hukumnya wajib."`;

/**
 * The framing call's sampling params — ONE definition shared by the Worker (prod) and the offline
 * eval harness (`src/eval/`), so tuning the prompt offline reflects exactly what ships. temp 0.7
 * gives the warmth room to vary.
 *
 * `reasoning: "none"` and the raised ceiling are one fix, not two (2026-07-22). At 160 tokens
 * against a REASONING model this call shipped fragments to real readers — measured live: "Capek
 * bang", "Capek banget, ya, apalagi kalau semu", cut mid-word, straight into an Arabic verse card.
 * Roughly half of the remaining calls returned nothing and fell back to the canned opener. The
 * ceiling is now well clear of the line rather than 30 tokens above a good answer; the length rule
 * lives in the PROMPT ("one or two sentences"), which is where a style rule belongs. A token cap is
 * a truncation device, never a style device — enforcing brevity with it is what produced "Capek
 * bang".
 */
export const FRAMING_PARAMS = { temperature: 0.7, maxTokens: 400, reasoning: "none" } as const;

/**
 * Build the exact user message the framing model receives — the person's words plus the feeling
 * retrieval detected, never a verse. Shared by prod and the eval harness so a prompt change tuned
 * offline transfers 1:1; if this and the Worker's call drifted, the eval would be measuring a
 * different prompt than the one that ships.
 */
export function buildFramingUserMessage(ctx: ComposeContext): string {
  return (
    `Yang baru saja ditulis orang itu:\n"""${ctx.question}"""\n\n` +
    `Perasaan yang terdeteksi: ${ctx.theme}` +
    (ctx.themeCount > 1 ? ` (dan ${ctx.themeCount - 1} hal lain sekaligus).` : ".") +
    // The detected theme is a HINT for which register to use, never the subject to write about.
    // Left implicit, the model answered the label instead of the person — "utang numpuk" came back
    // as "beban nggak ada habisnya". Saying so here costs a line and buys the specificity.
    `\n\nSebut kembali hal yang dia tulis sendiri, bukan nama perasaannya. ` +
    `Tulis dua sampai tiga kalimat pendampingan, sesuai aturanmu.`
  );
}

/**
 * Build the model's context from the grounded hits and the raw question. Returns null when there
 * is nothing to frame — the caller treats that as silence, never as a reason to invent one.
 */
export function composeContext(hits: Hit[], question: string): ComposeContext | null {
  const first = hits[0];
  if (!first) return null;
  // A verse may carry several feelings; count the distinct ones across all hits so a person
  // who named two things is still recognised as having named two.
  const themes = new Set(hits.flatMap((h) => h.verse.themes));
  // matchedTheme, not themes[0] — the same fix compose() got. Reading tag order told the framing
  // model "Chronic illness" for a heartbroken reader, because 10:57 happens to carry that tag first.
  return { question, theme: first.matchedTheme ?? first.verse.themes[0] ?? "", themeCount: themes.size };
}

/**
 * The wrap. Generate the framing via the injected model, run it through the wall, and fall back to
 * the deterministic opener on ANY failure — no hits, a model error, or unsafe output.
 *
 * Silence-over-fabrication is the FIRST branch on purpose: when retrieval found nothing, the model
 * is never even invoked. The app does not generate comfort it cannot ground.
 */
export async function composeFraming(
  hits: Hit[],
  question: string,
  model: FramingModel,
  deterministicFallback: string,
): Promise<string> {
  if (!hits.length) return "";

  const ctx = composeContext(hits, question);
  if (!ctx) return deterministicFallback;

  let prose: string;
  try {
    prose = await model(ctx);
  } catch {
    // A model that errors, times out, or returns garbage must never take the app down or block the
    // verses. The reader gets the honest canned line and never knows a model was involved.
    return deterministicFallback;
  }

  return safeCompose(prose, deterministicFallback);
}
