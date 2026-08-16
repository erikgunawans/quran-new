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
  // GRAMMAR WORDS THE SPREAD CAP HAD BEEN HIDING (2026-08-16).
  //
  // These are function words, and they belonged in this list from the start. They were never
  // noticed because build-topic-subjects.ts discarded every word occurring in more than three
  // categories, so a word like "sedang" was silently deleted for being BROAD rather than for being
  // grammatical. That cap was doing two jobs at once, and the day the second tier stopped throwing
  // broad words away, the missing stopwords came back with the real subjects: `matchTopic("aku
  // sedang sedih")` routed to a chapter on the Prophet, on the strength of "sedang" alone — the one
  // outcome four separate tests exist to forbid, because a person saying they are sad must reach the
  // feeling lane and nothing else.
  //
  // Chosen by word CLASS, the separator this file already trusts: auxiliaries, quantifiers,
  // determiners and copulas — never a topical noun. Every religious subject the second tier exposed
  // (akhirat, dosa, iman, neraka, rezeki, surga, takwa, tauhid, zakat) is deliberately absent here.
  "adanya", "banyak", "baru", "bukan", "demi", "jadi", "kali", "lain", "lalu", "lebih", "lewat",
  "punya", "satu", "sebagai", "sebagian", "sedang", "sedikit", "seluruh", "sendiri", "seorang",
  "seseorang", "sesuai", "sesuatu", "telah", "tetap", "tetapi", "tertentu", "terus",
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

/**
 * Action-frame VERBS: doing, causing, becoming, entering. They say what SHAPE of act is being asked
 * about, never what the act is about.
 *
 * Measured case. "apa aja sih yang tidak kita sadari kita lakukan yang bisa membuat kita masuk
 * neraka?" routes correctly to Perintah dan Larangan, whose 626 entries include four on neraka
 * (3:131, 14:28-30). What came back was 2:180 wasiat, 2:208, 2:238, 3:131, 17:78, 24:27, 24:58,
 * 25:9 — the chapter in ascending surah order. Instrumented: 16 entries matched and the score
 * histogram was `{1: 16}` — a total tie, because `lakukan`, `membuat`, `masuk` and `neraka` each
 * count for one hit and never co-occur, so a stable sort handed back document order and
 * `MAX_ENTRIES = 8` cut the tie at position 8, dropping 14:28-30. Three of the eight that survived
 * are there on `masuk` alone: "Masuk Islam secara total", "Berilah salam sebelum masuk rumah
 * orang", "minta izin sebelum masuk kamar orang tua".
 *
 * Known and NOT addressed here: the index holds nine `neraka` entries across five chapters, and
 * `retrieveKnowledge` loads exactly one. Four are reachable; five are not, at any ranking quality.
 *
 * Frequency was tried FIRST and failed for the third time, which is why it is written down here as
 * well as above. Within the routed chapter the reaches are `lakukan` 1, `membuat` 3, `neraka` 4,
 * `masuk` 9 — so IDF ranks the two generic verbs ABOVE the subject. Widening the sample to all
 * 2,451 entries does not separate them either: `membuat` 8, `neraka` 9, `lakukan` 10. The captions
 * are terse imperative headings, so a common verb is not a frequent word in them. Word class is the
 * separator, exactly as `QUESTION_FRAME` and `STOP` already record.
 *
 * Deliberately NOT used by `subjectWordsOf`, so ROUTING is byte-identical: these words may still
 * vote on which chapter a question belongs to. Only the selection of entries INSIDE the chapter
 * treats them as frame. Routing is pinned by eight literal slugs in topic-broad-tier.test.ts and had
 * no measured defect; this fix has no business moving it.
 *
 * Deliberately NOT in STOP either. A word here keeps its ranking signal and loses only its claim to
 * be the subject — so "gimana cara masuk Islam?", where every other word is frame, still falls
 * through `subjectWords`'s empty-set escape and surfaces "Masuk Islam secara total" as before.
 */
export const ACTION_FRAME = new Set<string>([
  "lakukan", "melakukan", "dilakukan", "kulakukan",
  "membuat", "buat", "bikin", "membikin", "dibuat",
  "menyebabkan", "sebabkan", "penyebab", "menjadikan",
  "masuk", "memasuki", "termasuk",
  "terjadi", "menimpa",
]);

/**
 * Ruling VOCABULARY: the words that say a question is asking for a hukum.
 *
 * A third frame class, and unlike the other two it is consulted ONLY when choosing which shards to
 * read (see `supplementary` in knowledge.ts). It deliberately does NOT feed `isFrameWord`, because
 * these words must keep scoring normally INSIDE a chapter: "kenapa zina dilarang" should still rank
 * a "Dilarang..." caption in Perintah dan Larangan above one that is silent on the ruling.
 *
 * Measured case, reported from the live app with a screenshot. Asked "apa hukum riba dalam islam
 * dan kenapa dilarang", the widened pool returned QS 7:19 ("Adam dan istrinya disuruh tinggal di
 * surga tetapi DILARANG mendekati sebuah pohon"), 33:52 ("DILARANG menikah lagi dan mengganti
 * istri"), 5:49 ("DILARANG mengikuti hawa nafsu manusia") and 33:48 alongside the four real riba
 * entries. Every one of them is a genuine `dilarang` hit and not one is about riba.
 *
 * `dilarang` reaches 4 categories and `wajib` reaches 7, so left unlisted they widen the pool to
 * most of the corpus for the single commonest shape of question this app is asked. `riba` reaches
 * 2 and is what the question is actually about.
 *
 * NOTE the asymmetry with the other two sets, and do not "tidy" it: a ruling word is a legitimate
 * ranking signal and an illegitimate shard-selection signal, because ranking asks "is this entry
 * about what was asked" while selection asks "which chapters is this question about". Only the
 * second is answered wrongly by `dilarang`.
 */
export const RULING_FRAME = new Set<string>([
  "dilarang", "larangan", "melarang", "diharamkan", "mengharamkan",
  "diperbolehkan", "diperbolehkah", "dibolehkan", "membolehkan",
  "wajib", "diwajibkan", "kewajiban",
  "haram", "halal", "makruh", "mubah", "sunnah",
  "berdosa", "dosanya", "boleh", "bolehkah",
]);
