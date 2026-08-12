/**
 * Word classes shared by the topic router at runtime and by the routing-index builder.
 *
 * Extracted into their own module for two reasons. The builder (src/app/build-topic-subjects.ts)
 * must apply exactly the same exclusions the query path applies, and this file already records
 * what happened the last time two "mirroring" word lists drifted apart. Importing knowledge.ts
 * directly would have worked, except it reaches peta.ts which reaches verse.ts — dragging DOM
 * types into a Bun build script that has no DOM.
 */
import { OVERLAP_STOP } from "./retrieve.ts";

/**
 * Function/filler words that must not carry entry-ranking signal (mirrors retrieve.ts's discipline).
 *
 * This list started at ~45 words and was too thin: entries are terse index lines, so a single shared
 * function word was enough to qualify one. "tentang" ("about") pulled 12 entries for a question about
 * the Prophet; "atas" ("upon") pulled 7 for the where-is-Allah question, where it is a preposition
 * ("saksi atas kebenaran"), not the spatial "above" the asker meant.
 *
 * Frequency/IDF weighting was measured as the alternative and REJECTED: in a corpus of terse lines
 * every offending word is rare in its own category ("tentang" 4.1%, "atas" 2.1%, "haram" 1.8%) —
 * right beside the legitimate "riba" (2.9%). Frequency cannot tell signal from noise here; word
 * class can. Hence: prepositions, conjunctions, particles, pronouns, and the speech-act verbs people
 * open questions with ("ceritakan", "jelaskan", "sebutkan") carry no topical signal and are dropped.
 *
 * Deliberately NOT here: topical nouns, including loaded ones like "hukum", "riba", "arsy", "nabi".
 * Those are the scholar's subject matter and must keep their signal.
 */
const KNOWLEDGE_EXTRA = [
  // Beyond the shared function words: prepositions, relators and the speech-act verbs people open a
  // question with. These earn their place here because index entries are terse, so a single shared
  // function word was enough to qualify one ("tentang" pulled 12 entries for a question about the Prophet).
  "tentang", "atas", "bawah", "dalam", "luar", "oleh", "kepada", "bagi", "antara", "hingga",
  "sampai", "secara", "serta", "bahwa", "agar", "supaya", "jika", "bila", "ketika", "saat",
  "setelah", "sebelum", "selama", "tanpa", "yaitu", "yakni", "terhadap", "menurut", "melalui",
  "ceritakan", "jelaskan", "sebutkan", "jawab", "jawaban", "tolong", "kasih", "beritahu", "berikan",
  // The asking verbs belonged with the answering ones from the start and were simply missed — the
  // one opener this app is literally named after. "saya mau TANYA tentang hukum warisan" ranked
  // QS 10:94 "Tanyakan kebenaran Al-Qur'an kepada Ahli Kitab" second, above the real inheritance
  // line, and shipped that way. Cost, accepted: a question whose SUBJECT is asking ("hukum bertanya
  // kepada ahli kitab") loses that word — the same trade already made for "jawab" and "ceritakan".
  "tanya", "tanyakan", "nanya", "bertanya", "menanyakan", "pertanyaan",
  "anda", "kami", "kalian", "tersebut", "semua", "setiap", "para", "orang",
  "sangat", "sekali", "hanya", "masih", "pernah", "selalu", "kadang", "mungkin", "harus", "perlu",
  "ingin", "mohon", "mana", "sama", "soal", "biar", "banget", "nih", "kok",
];

/**
 * Indonesian function words that carry no ranking signal.
 *
 * Built ON TOP of retrieve.ts's OVERLAP_STOP rather than beside it. The two lists used to be
 * hand-maintained copies "mirroring" each other, and they had already drifted — this file grew to
 * ~112 words while OVERLAP_STOP stayed at 57, so the same word could be noise on one side and signal
 * on the other. Sharing the base means a fix lands once instead of on whichever side the bug was
 * reported from.
 */
export const STOP = new Set<string>([...OVERLAP_STOP, ...KNOWLEDGE_EXTRA]);

/**
 * Corpus-frame words: generic across an Islamic index regardless of category, so they discriminate
 * nothing. This generalises the existing nameWords rule — that drops a category's OWN name ("allah"
 * in the Allah category, which matches nearly every entry there) — to words that are framing
 * everywhere. Someone asking "hukum mendengarkan musik dalam islam" uses "islam" to frame the
 * question, not to name its topic; ranking on it returned 8 entries about Islam in general
 * (df: islam 29/626, agama 32/626 in Perintah dan Larangan) and nothing about music.
 *
 * Consequence, and it is the right one: a bare "apa itu islam" now has no discriminating word left
 * and returns the honest topic pointer instead of arbitrary entries — exactly what the existing
 * "who is Allah" test already pins for the same reason.
 */
export const FRAME = new Set<string>(["islam", "islami", "muslim", "agama", "ajaran"]);

/**
 * Question-frame nouns: they name the KIND of question, never its subject.
 *
 * In "hukum pacaran dalam islam", `hukum` says *what is being asked* — the ruling on something — and
 * `pacaran` says *what it is being asked about*. `hukum` cannot go in FRAME or STOP: it is a real
 * content word that matches real law entries, and "apa hukum qishas" should absolutely find the
 * qishas lines. It is only noise when it matched INSTEAD of the subject.
 *
 * Frequency cannot make this distinction and was measured, not assumed: in Perintah dan Larangan
 * `hukum` is 6/626 (1.0%) — RARER than `riba` in Ekonomi (2/69, 2.9%) and barely commoner than the
 * legitimate `zina` (3/626, 0.5%). An IDF threshold would rank `hukum` as MORE specific than `riba`
 * and rank the noise above the signal. This is the second time frequency has been tried against this
 * index and the second time it has failed; the separator is word CLASS, as it was before.
 *
 * See `subjectHit` for how this is used.
 */
export const QUESTION_FRAME = new Set<string>(["hukum", "hukumnya", "syariat", "syariah", "dalil", "cara", "caranya"]);
