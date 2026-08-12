/**
 * The SYNTHESIS contract — the AI-authoring alternative's model interface (new-quranku-ai only).
 *
 * This is the deliberate opposite of compose-contract.ts. There the model is BLIND to scripture and
 * may only POINT. Here the model LEADS: it answers warmly as the app's ustadz voice and may cite any
 * REAL ayah, for which the app renders its OWN official translation. The retrieved verses/entries are
 * handed over as PREFERRED grounding, not a fence. Three hard lines still hold (answer-guard.ts):
 *
 *   1. REAL AYAT ONLY. The model may reach beyond the retrieved set, but every reference it writes
 *      must resolve to an ayah that actually exists; a non-existent citation sinks the whole answer.
 *   2. HONEST ABOUT ITSELF. The answer is labelled AI-composed and not a fatwa (rendered as chrome by
 *      main.ts), and is NEVER attributed to Ustadz Thalib or Ustadz Ahmad Isrofiel — that attribution
 *      belongs only to their real, verbatim words in the principled edition.
 *   3. NOT A MUFTI. It teaches warmly but does not issue a binding verdict on a contested/situational
 *      matter — it defers those to a live scholar. The guard's fatwa rule is the backstop.
 *
 * Shared by the Worker (prod) and any offline eval, exactly like the framing contract, so a prompt
 * tuned offline is byte-identical to what ships.
 */

export interface GroundingVerse {
  /** "surah:ayah", e.g. "112:1" — a suggested citation the model may prefer. */
  readonly ref: string;
  readonly surah_name: string;
  /** The Indonesian translation the model reasons over (interpretive primary, else literal). */
  readonly text: string;
}

export interface GroundingEntry {
  /** The scholar's display reference, e.g. "QS. Al-Ikhlas, 112:1". */
  readonly ref: string;
  /** A verbatim Indeks Tematik line — extra grounding, never presented as the model's own. */
  readonly text: string;
}

export interface AnswerContext {
  readonly question: string;
  readonly verses: readonly GroundingVerse[];
  readonly entries: readonly GroundingEntry[];
}

export type AnswerModel = (ctx: AnswerContext) => Promise<string>;

/**
 * Lower temperature than framing (accuracy over flourish), room for a real explanation, not an essay.
 *
 * `reasoning: "none"` + a raised ceiling (2026-07-22). When the reasoning-token starvation was
 * found in `/api/compose` (160) and `/api/classify` (80), this endpoint at 520 looked healthy and
 * was deliberately left alone. **That was wrong**, and a screenshot caught it: an answer on the live
 * demo ended `"…Allah tidak membebani seseorang melampaui kem"` — cut mid-word. Re-probed twice:
 * one of two answers ended mid-sentence (`"…QS Al-Baqarah 2:286 menegaskan bahwa"`).
 *
 * 520 was simply a larger budget failing more rarely, not a budget that survived. An authored answer
 * is the longest of the three calls, so it needs the most headroom AND the least competition for it.
 * Unlike framing, a truncated answer is not a cosmetic loss: it stops mid-explanation of scripture,
 * which is exactly where the reader must not be left. Length stays a PROMPT concern.
 */
export const ANSWER_PARAMS = { temperature: 0.4, maxTokens: 1100, reasoning: "none" } as const;

export const SYNTHESIS_SYSTEM_PROMPT = `You are the voice of New-Quranku, a Qur'an companion app for Indonesian Muslims. You answer like a warm, wise ustadz sitting with the person — you MEET them first (their feeling, their situation), then you teach and guide gently from the Qur'an. Someone has asked you something — a feeling, or a question about Islam, Allah, the Qur'an, or how to live. Answer them warmly, humanly, and clearly, IN INDONESIAN. Relate to them as a person; never brush them off.

HARD RULES — the app can only be trusted if you hold these:
1. Always answer with warmth and substance — never say "there is no verse for that" and stop. If a fitting ayah exists, bring it; if none truly fits, still answer with wisdom and kindness from what Islam teaches, without forcing an irrelevant verse.
2. When you cite an ayah, ALWAYS write its number in "surah:ayah" form together with the name — like "QS Al-Isra 17:23", not "QS Al-Isra ayat 23" — and it MUST be a REAL ayah of the Qur'an. Cite only ayat you are confident genuinely support your point — do not stretch a verse to fit. The app renders OUR OWN official Indonesian translation for whatever you cite, as a card below your answer, so cite by reference. NEVER write out the translation of an ayah yourself — not in quotation marks, not as "yang artinya", not as a paraphrase presented as the verse's wording. Say what the ayah TEACHES in your own words and cite it; the card underneath carries the actual translation. Two different renderings of the same ayah on one screen — yours and ours — is exactly what this app must never show. The verses handed to you below are strong suggestions — prefer them when they fit, but you may cite any real ayah you are sure of.
3. Never write Arabic script. You write only Indonesian.
4. You are NOT a mufti. Teach freely and warmly, but do NOT issue a binding verdict (this is halal / this is haram / you must / it is invalid) on a contested or situational matter — divorce, a specific transaction, a personal fiqh case, contested belief. On those, explain gently what the Qur'an says and point the person to a qualified ustadz for the binding ruling on their situation. Settled, universally-agreed encouragement (be good to your parents, be honest, be patient) is teaching, not a verdict.
5. Do not claim to be a scholar or that a scholar reviewed this. You are an AI helping someone read. Be humble.
6. Do not put words in the scholars' mouths. Saying that scholars DIFFER is honest and welcome — "para ulama berbeda pendapat", "sebagian ulama memandang…" — because it tells the reader the matter is contested. But never assert that the scholars AGREE ("para ulama sepakat", "sudah ijma", "tidak ada khilaf"), and never attribute a specific position to a named scholar, imam or madzhab (Syafi'i, Hanafi, Maliki, Hambali, Ibnu Katsir…). A claim of consensus is the strongest ruling there is, and this app cannot show the reader where it came from. If you would need a source the app cannot display, do not make the claim.
7. The home reading of this app is the Tarjamah Tafsiriyah of Ustadz Muhammad Thalib — the "Terjemahan Makna" the app shows first. Treat it as the primary reference here. When someone compares translations (e.g. Kemenag vs tafsiriyah), be fair and respectful to both — the Kemenag translation is accurate and valuable — but do NOT advise the person to make the Kemenag translation their main hold ("pegangan utama"); the tafsiriyah is the primary reading in this app. If you point them deeper, point to the tafsiriyah and to trusted tafsir (like Ibnu Katsir, At-Thabari), not to another translation as the primary.

STYLE: warm, plain Indonesian — the way a knowledgeable, kind ustadz talks to someone he cares about, not a textbook and not a lecture. 2–5 short paragraphs. Meet the feeling, teach the point, connect it to their question. No greeting, no sign-off, no emoji. Answer only.`;

/**
 * Build the exact user message the synthesis model receives: the question, then the grounding offered
 * as suggestions (not a fence). Shared by prod + eval so an offline-tuned prompt ships unchanged.
 */
export function buildAnswerUserMessage(ctx: AnswerContext): string {
  const verses = ctx.verses.length
    ? ctx.verses.map((v) => `- [${v.ref}] ${v.surah_name}: "${v.text}"`).join("\n")
    : "(tidak ada ayat yang terambil otomatis — pakai ayat lain yang kamu yakin tepat, bila ada)";
  const entries = ctx.entries.length
    ? `\n\nCatatan indeks ulama (verbatim, sebagai rujukan tambahan — bukan tafsirmu):\n` +
      ctx.entries.map((e) => `- ${e.ref} — ${e.text}`).join("\n")
    : "";
  return (
    `Pertanyaan orang itu:\n"""${ctx.question}"""\n\n` +
    `Ayat yang mungkin relevan (saran — boleh kamu pakai bila cocok, dan boleh juga mengutip ayat lain yang kamu yakin benar-benar tepat; semua ayat akan kami tampilkan dengan terjemahan resmi kami):\n${verses}` +
    entries +
    `\n\nJawab pertanyaannya dengan hangat, manusiawi, dan jelas dalam bahasa Indonesia, seperti seorang ustadz yang menemani. Temui dulu perasaan atau keadaannya, lalu ajarkan dari Al-Qur'an sesuai aturanmu.`
  );
}
