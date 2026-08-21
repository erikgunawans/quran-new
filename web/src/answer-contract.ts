/**
 * The SYNTHESIS contract — the AI-authoring alternative's model interface (new-quranku-ai only).
 *
 * This is the deliberate opposite of compose-contract.ts. There the model is BLIND to scripture and
 * may only POINT. Here the model LEADS: it answers warmly as the app's ustadz voice and may cite any
 * REAL ayah, for which the app renders its OWN official translation. The retrieved verses/entries are
 * handed over as PREFERRED grounding, not a fence. Four hard lines still hold (answer-guard.ts):
 *
 *   1. REAL AYAT ONLY. The model may reach beyond the retrieved set, but every reference it writes
 *      must resolve to an ayah that actually exists; a non-existent citation sinks the whole answer.
 *   2. HONEST ABOUT ITSELF. The answer is labelled AI-composed and not a fatwa (rendered as chrome by
 *      main.ts), and is NEVER attributed to Ustadz Thalib or Ustadz Ahmad Isrofiel — that attribution
 *      belongs only to their real, verbatim words in the principled edition.
 *   3. NOT A MUFTI. It teaches warmly but does not issue a binding verdict on a contested/situational
 *      matter — it defers those to a live scholar. The guard's fatwa rule is the backstop.
 *   4. NO PROPHETIC ATTRIBUTION WITHOUT A RECEIPT. The model may speak of what the Prophet ﷺ taught
 *      only by citing an opaque `[H:collection:number]` marker that resolves against the hadith
 *      retrieved for THIS turn; `bad_hadith` sinks the answer otherwise. It never writes the hadith's
 *      own words — the card below the answer carries those, verbatim from the pinned corpus.
 *
 * Shared by the Worker (prod) and any offline eval, exactly like the framing contract, so a prompt
 * tuned offline is byte-identical to what ships.
 */
import type { HadithCard } from "./hadith-card.ts";
import { markerFor } from "./answer-guard.ts";

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

/**
 * One hadith the app retrieved for THIS turn, offered to the model as citable-by-marker.
 *
 * The model never receives Arabic and never receives the app's reader-facing rendering — it gets the
 * English body it must reason over and the opaque `id` it must cite by. Everything a reader sees is
 * built by `hadith-card.ts` from the pinned corpus, so the model cannot influence a single word of
 * the hadith itself. That separation is the whole reason the marker is opaque rather than a quote.
 */
export interface GroundingHadith {
  /** Frontmatter id, e.g. "hadith-muslim-154" — what `groundedHadithFrom` validates a marker against. */
  readonly id: string;
  /** Collection slug as it appears in the marker: "bukhari", "muslim". */
  readonly collection: string;
  readonly hadith_number: number;
  readonly grade: string;
  /** English body. The model reasons over this; it may never reproduce it. */
  readonly english: string;
}

export interface AnswerContext {
  readonly question: string;
  readonly verses: readonly GroundingVerse[];
  readonly entries: readonly GroundingEntry[];
  /**
   * Hadith grounding, absent on most turns by design — see the knowledge-shaped gate in
   * `worker/src/index.ts`. Optional rather than `readonly []` so every existing caller and every
   * offline eval keeps compiling and keeps meaning exactly what it meant.
   */
  readonly hadith?: readonly GroundingHadith[];
  /**
   * The Qur'an lane returned verses, but qualified them on a FEELING rather than on an ayah the
   * reader named. Set by `gatherGrounding`; read by the Worker to decide whether the hadith lane
   * should also run (Erik's ayat → hadits → fikih sequence, 2026-08-17).
   *
   * OPTIONAL, AND THE DEFAULT IS THE OLD BEHAVIOUR. Absent means "not weak", so an older client, an
   * offline eval, or a hand-made request behaves exactly as it did before this field existed. It can
   * only ever OPEN a retrieval lane — never bypass a guard, never admit ungrounded material — which
   * is why the Worker may read it from the request body at all. Every wall downstream is unchanged.
   */
  readonly weakVerses?: boolean;
}

/**
 * What the model turn produced: the prose, plus the hadith the app resolved for it.
 *
 * `hadith` is NOT what the model asked for — it is what the authority (the Worker) resolved, capped
 * and fetched from the pinned corpus. The browser rebuilds its own guard predicate from these ids,
 * which is why they travel with the prose instead of being trusted implicitly.
 */
export interface AnswerResult {
  readonly prose: string;
  readonly hadith?: readonly HadithCard[];
}

export type AnswerModel = (ctx: AnswerContext) => Promise<AnswerResult>;

/**
 * May the model author this turn at all? Only when there is something OF OURS to author from.
 *
 * ISC-418, measured 2026-08-13 (`bun run eval:grounding`): handed no grounding whatsoever, the model
 * answered in full in 46 of 46 samples. The same probe's control showed grounding is emphatically NOT
 * inert — a fitting ayah lifts citation of that ayah from 35% to 96% — so the defect was never "the
 * model ignores our material". It was that nothing required our material to exist. An off-topic
 * question ("cara ganti oli motor beat") drew a fluent Islamic answer composed from parametric memory
 * alone, with no corpus, no index, and no attribution behind a word of it.
 *
 * Erik's ruling, 2026-08-13: bow out to the principled edition rather than author from nothing. The
 * reader gets the existing honest-silence / topic-pointer copy, which is TRUE in this state — there
 * really is no material — and unlike the `blocked` channel it makes no claim that an answer was found
 * and withheld.
 *
 * ENTRIES ALONE COUNT. `gatherGrounding` returns zero verses and N entries for a ruling question by
 * design (the honesty floor keeps feeling-verses off fiqh). A predicate demanding verses would silence
 * the whole hukum lane.
 *
 * Called by the Worker after `verifyGrounding` — which means forged grounding, already dropped there,
 * can no longer buy an authored answer either: it now lands here as empty and bows out.
 */
export const hasGrounding = (ctx: Pick<AnswerContext, "verses" | "entries">): boolean =>
  ctx.verses.length > 0 || ctx.entries.length > 0;

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
7. HADIS. You may only speak about what the Prophet ﷺ said, did, or taught when a hadith for it is listed under "Hadis yang terambil" below, and you MUST put its marker in the same sentence — exactly like this: "Rasulullah ﷺ mengajarkan bahwa amal bergantung pada niatnya [H:bukhari:1]." The marker is written [H:collection:number] using the collection and number exactly as listed, nothing else. NEVER invent a marker, never adjust a number, and never write a marker for a hadith that is not in that list. If the list is empty or nothing in it fits, then do not attribute anything to the Prophet ﷺ at all — no "Rasulullah bersabda", no "dalam sebuah hadits", no "diriwayatkan bahwa" — teach from the Qur'an instead. Just like an ayah, you say what the hadith TEACHES in your own words and let the marker carry it: NEVER write out the hadith's own wording, not in quotation marks, not as "yang artinya", not as a paraphrase presented as its text. The app renders the sourced hadith itself as a card below your answer.
8. The home reading of this app is the Tarjamah Tafsiriyah of Ustadz Muhammad Thalib — the "Terjemahan Makna" the app shows first. Treat it as the primary reference here. When someone compares translations (e.g. Kemenag vs tafsiriyah), be fair and respectful to both — the Kemenag translation is accurate and valuable — but do NOT advise the person to make the Kemenag translation their main hold ("pegangan utama"); the tafsiriyah is the primary reading in this app. If you point them deeper, point to the tafsiriyah and to trusted tafsir (like Ibnu Katsir, At-Thabari), not to another translation as the primary.

9. ANSWER EVERY ISLAMIC QUESTION — NEVER BOW OUT. If retrieval handed you no ayah and no hadith, that means the app's search came up empty, NOT that Islam is silent. Answer anyway from what you know: cite an ayah you are certain of if one genuinely fits, otherwise teach from established Islamic guidance in your own words. Do NOT reply that you cannot find a verse, do not tell the person to search elsewhere instead of answering, and do not hand back a list of topics in place of an answer. The reader asked you a question; answer it.
   THE ONE EXCEPTION IS A QUESTION THAT IS NOT ABOUT ISLAM OR THEIR LIFE AT ALL — how to change motor oil, a football score, a recipe, code. Do not dress those in Islamic language and do not force a verse onto them. Say plainly and warmly, in one or two sentences, that it is outside what you can help with here, and offer to help with something about the Qur'an, faith, or how to live. A question about grief, money, anger, family, work or doubt is NOT off-topic — that is exactly what this app is for.

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
  // THE LIST IS RESTATED AS AN ABSENCE WHEN IT IS EMPTY, rather than omitted. Rule 7 in the system
  // prompt is static (so an offline-tuned prompt ships byte-identical), which means the model is
  // told the marker syntax on every turn — including the feeling turns that retrieve no hadith at
  // all. Left silent, that is an invitation to invent one, and an invented marker resolves against
  // nothing and sinks the whole answer under `bad_hadith` branch (b). So the empty case says so out
  // loud, in the same place the populated case would have been.
  // THE MARKER IS DERIVED FROM THE ID, NEVER FROM `collection`. `collection` is the reader-facing
  // name ("Sahih al-Bukhari") and building a marker out of it printed `[H:Sahih al-Bukhari:1349]`,
  // which no regex in this codebase matches and which resolves to no id — so the model was told to
  // copy a receipt that could never clear the wall. See `markerFor` for the full account. A record
  // with no writable marker is dropped rather than offered uncitable.
  const citable = (ctx.hadith ?? []).flatMap((h) => {
    const marker = markerFor(h.id);
    return marker ? [`- ${marker} (${h.grade}) — ${h.english}`] : [];
  });
  const hadith = citable.length
    ? `\n\nHadis yang terambil (boleh kamu rujuk dengan menulis markernya persis; JANGAN menyalin teksnya):\n` +
      citable.join("\n")
    : `\n\nHadis yang terambil: (tidak ada) — jangan menuliskan marker [H:...] apa pun, dan jangan menisbatkan apa pun kepada Rasulullah pada jawaban ini.`;
  return (
    `Pertanyaan orang itu:\n"""${ctx.question}"""\n\n` +
    `Ayat yang mungkin relevan (saran — boleh kamu pakai bila cocok, dan boleh juga mengutip ayat lain yang kamu yakin benar-benar tepat; semua ayat akan kami tampilkan dengan terjemahan resmi kami):\n${verses}` +
    entries +
    hadith +
    `\n\nJawab pertanyaannya dengan hangat, manusiawi, dan jelas dalam bahasa Indonesia, seperti seorang ustadz yang menemani. Temui dulu perasaan atau keadaannya, lalu ajarkan dari Al-Qur'an sesuai aturanmu.`
  );
}
