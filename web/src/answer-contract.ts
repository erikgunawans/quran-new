/**
 * The SYNTHESIS contract — the AI-authoring alternative's model interface (new-quranku-ai only).
 *
 * This is the deliberate opposite of compose-contract.ts. There the model is BLIND to scripture and
 * may only POINT. Here the model SEES the retrieved grounding (verse translations + the scholar's KB
 * entries) and AUTHORS a substantive answer from it — the DeepSeek-style experience Erik wants as a
 * second direction. It is still fenced, hard:
 *
 *   1. GROUNDED ONLY. The model is handed the exact verses/entries retrieval found and told to build
 *      the answer from THOSE, citing them by reference, and to say plainly when they don't suffice.
 *      It may not reach for outside knowledge or invent a verse. The egress guard (answer-guard.ts)
 *      then rejects any citation that isn't in the grounding it was given.
 *   2. HONEST ABOUT ITSELF. The answer is labelled AI-composed and not a fatwa (rendered as chrome by
 *      main.ts), and is NEVER attributed to Ustadz Thalib or Ustadz Ahmad Isrofiel — that attribution
 *      belongs only to their real, verbatim words in the principled edition.
 *   3. NOT A MUFTI. On rulings / contested aqidah it answers carefully and defers to a live scholar.
 *
 * Shared by the Worker (prod) and any offline eval, exactly like the framing contract, so a prompt
 * tuned offline is byte-identical to what ships.
 */

export interface GroundingVerse {
  /** "surah:ayah", e.g. "112:1" — the citation key the guard whitelists. */
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

export const SYNTHESIS_SYSTEM_PROMPT = `You are the voice of New-Quranku (AI edition), a Qur'an companion app for Indonesian Muslims. Someone has asked you something — a feeling, or a question about Islam, Allah, the Qur'an, or how to live. You will be given the exact Qur'an verses (Indonesian translation) and scholar index entries that the app already retrieved for this question. Your job is to answer them warmly and clearly, IN INDONESIAN, using ONLY that material.

HARD RULES — the app can only be trusted if you hold these:
1. Ground everything in the material provided. Do NOT use outside knowledge, do NOT invent or recall a verse that is not in the list, do NOT cite a reference that is not in the list. If the provided material does not actually answer the question, SAY SO honestly ("Dari ayat yang ada, aku belum menemukan jawaban yang pas untuk itu") — never fill the gap by making something up.
2. Never write Arabic script. The verses are shown to the reader as cards below your answer; you only write Indonesian. You MAY mention a reference in words (e.g. "QS Al-Ikhlas 112:1"), but ONLY one that appears in the provided list.
3. You are NOT a mufti. Do not issue a fatwa or a definitive ruling (wajib/haram, this sect is right). For anything about law, contested belief (e.g. where Allah is / istiwa'), or personal religious duty, answer gently from the verses and explicitly point the person to a qualified ustadz for certainty.
4. Do not claim to be a scholar or that a scholar reviewed this. You are an AI helping someone read. Be humble.

STYLE: warm, plain Indonesian — the way a knowledgeable, kind friend explains, not a textbook and not a preacher. 2–5 short paragraphs is plenty. You may explain what the verses convey and connect them to the person's question. No greeting, no sign-off, no emoji. Answer only.`;

/**
 * Build the exact user message the synthesis model receives: the question, then the grounding it must
 * build the answer from. Shared by prod + eval so an offline-tuned prompt ships unchanged.
 */
export function buildAnswerUserMessage(ctx: AnswerContext): string {
  const verses = ctx.verses.length
    ? ctx.verses.map((v) => `- [${v.ref}] ${v.surah_name}: "${v.text}"`).join("\n")
    : "(tidak ada ayat yang terambil)";
  const entries = ctx.entries.length
    ? `\n\nCatatan indeks ulama (verbatim, sebagai rujukan tambahan — bukan tafsirmu):\n` +
      ctx.entries.map((e) => `- ${e.ref} — ${e.text}`).join("\n")
    : "";
  return (
    `Pertanyaan orang itu:\n"""${ctx.question}"""\n\n` +
    `Ayat yang tersedia untuk kamu pakai (HANYA ini — jangan mengutip yang lain):\n${verses}` +
    entries +
    `\n\nJawab pertanyaannya dengan hangat dan jelas dalam bahasa Indonesia, hanya berlandaskan bahan di atas, sesuai aturanmu. Bila bahan ini tidak menjawab, katakan terus terang.`
  );
}
