/**
 * The egress wall for the SYNTHESIS edition's authored answers (new-quranku-ai only).
 *
 * This wall is the INVERSE of compose-guard.ts in one respect and the SAME in another. Authoring is
 * now the point, so the "don't interpret" heuristic is gone. But the two rules that keep an authored
 * answer honest are enforced harder than ever:
 *
 *   - `arabic`     (HARD) — no Arabic script in the prose. Scripture renders as cards from the
 *                  sha256-pinned corpus; the model writes only Indonesian.
 *   - `bad_ref`    (HARD) — every verse reference the model writes MUST resolve to a REAL ayah
 *                  (surah 1–114, ayah within that surah's bounds). The app now lets the model reach
 *                  for any ayah in the Qur'an — Erik's "refer to the Aya and the translation we have":
 *                  we render OUR official translation for whatever it cites, so breadth is safe as long
 *                  as the reference is real. What is NOT safe is a citation to an ayah that does not
 *                  exist (Nur once told people real ayahs did not exist; a model invents them
 *                  confidently). So this rule no longer whitelists the grounding — it validates the
 *                  reference against the mushaf. The caller passes `isCitable`, which answers exactly
 *                  that question.
 *   - `fatwa`      (HARD) — no fiqh VERDICT. `SYNTHESIS_SYSTEM_PROMPT` rule 3 tells the model it is not
 *                  a mufti, but a prompt is a request, not a wall, and this file previously had no
 *                  backstop for the single failure this app most needs to refuse: an authored ruling
 *                  in fluent Indonesian. The two existing rules cannot see it — such a sentence carries
 *                  no Arabic, and cites a grounded ref or none at all, so it passes both. See VERDICT.
 *   - `bad_hadith` (HARD) — no prophetic attribution without a resolvable marker. The model cites
 *                  hadith by opaque marker (`[H:muslim:154]`) which must resolve against THIS turn's
 *                  grounding; the renderer turns it into a card carrying the verbatim Arabic and
 *                  English. Built like `fatwa` — a construction list, not a word list — because the
 *                  failure is not a wrong NUMBER but an attribution with no number at all, which the
 *                  other three rules are all blind to. A mistranslated or invented hadith is a
 *                  fabricated saying of the Prophet ﷺ; this is the highest-stakes wall in the file.
 *                  See PROPHETIC and `hadithShape`.
 *
 * On ANY violation the caller (answer.ts) discards the answer and the app falls back to the
 * principled behaviour — a pointer or an honest silence. The worst reachable outcome is that the
 * synthesis edition degrades to the trustworthy edition for that one turn, never a fabricated ruling.
 */

export type AnswerViolationKind = "arabic" | "bad_ref" | "fatwa" | "bad_hadith" | "own_wording";

export interface AnswerViolation {
  readonly kind: AnswerViolationKind;
  readonly detail: string;
}

export interface AnswerGuardResult {
  readonly ok: boolean;
  readonly violations: readonly AnswerViolation[];
}

/** Arabic-script ranges (main, supplement, presentation forms A/B) — same set as compose-guard. */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/**
 * The two honorific ligatures — ﷺ (U+FDFA, sallallahu alayhi wa sallam) and ﷻ (U+FDFB, jalla
 * jalaluhu) — are exempt from the `arabic` rule.
 *
 * They sit inside the Arabic presentation-forms block, so the rule rejected them, which made the
 * app's OWN intended voice unshippable: PRD decision 2 specifies prose of the form "Nabi ﷺ pernah
 * mengingatkan bahwa…". The rule exists to stop the model hand-writing SCRIPTURE — Qur'anic or
 * prophetic text that must instead render from the pinned corpus as a card. An honorific is not
 * scripture; it is punctuation of respect, it carries no claim, and it cannot be misquoted. Exempting
 * exactly these two codepoints and nothing else keeps the wall's purpose intact while letting the
 * model write the sentence it was designed to write.
 */
const HONORIFIC = /[ﷺﷻ]/g;

/** Any "surah:ayah" reference in the prose (also matches "112.1" and spaced "2 : 255"). */
const REF_IN_PROSE = /\b(\d{1,3})\s*[:.]\s*(\d{1,3})\b/g;

/** Normalise a ref to "surah:ayah" for whitelist comparison (drops a range tail like "112:1-4"). */
const normRef = (surah: string | number, ayah: string | number): string => `${Number(surah)}:${Number(ayah)}`;

/**
 * Fiqh VERDICT constructions — the grammar of a fatwa, not the vocabulary of one.
 *
 * The distinction matters and is the whole reason this is a construction list rather than a word
 * list. `SYNTHESIS_SYSTEM_PROMPT` rule 3 orders the model to say it is not a mufti, which means a
 * compliant answer legitimately CONTAINS "haram", "wajib" and "fatwa" — "aku tidak bisa menetapkan
 * hukum halal atau haram, tanyakan pada ustadz" is the behaviour we want, and a word-level check
 * would reject exactly the answers that obey. What must never ship is the model ASSIGNING a verdict.
 *
 * `tidak boleh` is deliberately absent: "kamu tidak boleh putus asa" is ordinary warm prose carrying
 * a verse's sense, not a ruling. Only unambiguously juristic negations (`tidak sah`, `tidak
 * diperbolehkan`, `tidak dibenarkan`) count.
 */
const VERDICT = [
  /\bhukumnya\s+(adalah\s+)?(haram|halal|wajib|sunnah|makruh|mubah|sah|batal|boleh)\b/,
  /\b(haram|halal|wajib|sunnah|makruh|mubah)\s+hukumnya\b/,
  /\b(itu|ini|tersebut)\s+(adalah\s+)?(haram|halal|wajib|makruh|mubah)\b/,
  /\b(wajib|haram|makruh)\s+bagi\s+\w+/,
  /\btidak\s+(sah|diperbolehkan|dibenarkan)\b/,
  /\btermasuk\s+dosa\s+besar\b/,
];

/**
 * An opaque hadith marker: `[H:bukhari:6962]`, `[H:muslim:154]`.
 *
 * The model may never hand-write hadith text, exactly as it may never hand-write Arabic. It cites by
 * marker; the renderer resolves the marker into a card carrying the verbatim Arabic and English with
 * full attribution. Opaque on purpose — the model cannot compose a marker for a hadith it did not
 * receive this turn, because it has no way to know the number.
 */
const MARKER_IN_PROSE = /\[H:([a-z][a-z-]*):(\d{1,6})\]/g;

/** `bukhari` + `6962` → the corpus id the retrieval layer returns. */
export const markerToId = (collection: string, n: string | number): string => `hadith-${collection}-${Number(n)}`;

/**
 * The INVERSE of `markerToId`: the corpus id → the exact marker the model must write for it, or
 * `null` when no writable marker exists for that id.
 *
 * WHY THIS EXISTS, AND WHY IT IS THE ONLY LEGAL WAY TO SHOW A MODEL A MARKER (2026-08-15).
 *
 * The prompt used to build the offered marker out of the record's `collection` field, which reads
 * `"Sahih al-Bukhari"` / `"Sahih Muslim"` — the human-readable name, correct for the card and fatal
 * here. Verified against the live text layer (`text/8177e2e6e6c47370/display/bukhari/024.json`):
 *
 *   id "hadith-bukhari-1349", collection "Sahih al-Bukhari"
 *     → prompt printed  [H:Sahih al-Bukhari:1349]
 *     → MARKER_IN_PROSE is /\[H:([a-z][a-z-]*):…/ — a capital and a space, so it MATCHES NOTHING
 *     → and even if it matched, markerToId gives "hadith-Sahih al-Bukhari-1349" ≠ the id
 *
 * So the model was ordered to copy the collection "exactly as listed", did exactly that, and every
 * possible output was refused: branch (a) saw an attribution with no marker in the sentence, because
 * the marker was invisible to the regex. `blocked:"bad_hadith"` with `records:2` was read for a full
 * session as "the model declined to cite" — it could not have cited. This is not a prompt-tuning
 * problem and no amount of prompt tuning could have reached it.
 *
 * THE FIX IS DIRECTIONAL. The id is the thing the guard resolves against, so the marker is derived
 * FROM the id and never from a parallel display field. `markerFor(id)` and `markerToId` are exact
 * inverses over the grammar `MARKER_IN_PROSE` accepts, which makes offered ≡ writable ≡ resolvable
 * true by construction rather than by two files agreeing. A record whose id is outside that grammar
 * returns `null` and is simply not offered — the same RETRIEVABLE ≡ DISPLAYABLE discipline `dalil.ts`
 * applies to records with no body, for the same reason: an uncitable hadith must never be citable.
 */
export const markerFor = (id: string): string | null => {
  const m = /^hadith-([a-z][a-z-]*)-(\d{1,6})$/.exec(id);
  return m ? `[H:${m[1]}:${Number(m[2])}]` : null;
};

/* ------------------------------------------------------------------------------------------------
 * THE ATTRIBUTION GRAMMAR (ISC-440)
 *
 * Everything from here to `hadithShape` exists because the `PROPHETIC` list below leaked TWICE in
 * production in one evening, and both times the fix was verified against one phrasing while the model
 * reached for another within minutes:
 *
 *   1. `mengajarkan` — active voice, absent while `menganjurkan` was present (one letter apart).
 *   2. `diajarkan oleh Rasulullah` — passive; the active patterns anchor subject-then-verb and
 *      Indonesian puts the agent last via `oleh`.
 *
 * The root cause is not either missing word. It is that a flat `RegExp[]` has NO SLOT FOR MORPHOLOGY,
 * so every new surface form must be typed by hand, forever — and the author's vocabulary is exactly
 * what the test cases sample, so the list can only ever be measured against itself.
 *
 * An unreceipted hadith claim is irreducibly three things standing in one relation:
 *
 *   | part      | what it is                              | bounded?                                  |
 *   | subject   | a referring expression for Muhammad ﷺ   | YES — a closed noun class, ~9 designations |
 *   | predicate | a speech-act verb                       | NO  — Indonesian derives these freely      |
 *   | relation  | the subject is the AGENT of the act      | YES — two voices, active and `oleh`-passive|
 *
 * The old list enumerated the UNBOUNDED part and hard-coded the bounded ones. That is inverted, and
 * it is why it reopened twice. Below, the verb axis is GENERATED from stems by Indonesian affixation
 * and the subject axis is enumerated — the way round the language actually is.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Speech-act stems. Semantic, not morphological: each is a way of SAYING something, so any affixed
 * form of it standing in an agent relation to the Prophet ﷺ is an attribution needing a receipt.
 *
 * Stems, never surface forms — that is the whole point. Adding `ajar` here yields `mengajarkan`,
 * `diajarkan`, `mengajari`, `diajari`, `terajarkan` and `memperajarkan` at once. Both production leaks
 * would have been closed by the presence of a stem that was already implied by words the list carried.
 *
 * What is deliberately NOT here: stems of ordinary predicates that appear near the Prophet ﷺ in
 * legitimate prose — `tentu` (menentukan), `kenal` (dikenal), `cinta` (mencintai), `hadap`
 * (menghadapi), `buat`, `banyak`, `rasa`, `curah`. Every one of those was checked against a corpus of
 * compliant sentences before this list was fixed; a speech-act stem is one where the Prophet ﷺ doing
 * it to a proposition IS a hadith claim.
 */
const SPEECH_ACT_STEMS = [
  // saying, plainly
  "sabda", "kata", "ucap", "tutur", "ujar", "bicara", "cerita", "kisah", "firman",
  // teaching, explaining, informing
  "ajar", "jelas", "terang", "papar", "sebut", "beritahu", "kabar", "sampai", "ungkap",
  "tegas", "nyata", "singgung", "urai", "tunjuk", "isyarat", "tekan", "sindir",
  // answering — the canonical hadith report shape is a question put to him and his reply, and not one
  // verb of it was here: `menjawab`, `ditanya`. Found by adversarial audit, not by writing more cases.
  "jawab", "tanya",
  // directing, urging, forbidding
  "anjur", "saran", "ajak", "seru", "himbau", "imbau", "suruh", "perintah", "larang",
  "tegur", "wanti", "ingat", "nasihat", "nasehat", "pesan", "wasiat", "arah", "bimbing", "tuntun",
  // teaching by DOING — `mencontohkan` is how a fi'li (action) hadith gets reported, and an action
  // attributed to him needs a receipt exactly as a saying does.
  "contoh", "didik",
  // promising, warning, likening
  "janji", "ancam", "jamin", "benar", "ibarat", "umpama", "gambar", "misal", "sama",
  // RULING verbs. `mewajibkan` was a double miss: not a speech-act stem here, and VERDICT's
  // `\b(wajib|haram|makruh)\s+bagi\b` cannot see `wajib` inside `mewajibkan` — so an authored ruling
  // attributed to the Prophet ﷺ cleared the hadith wall AND the fatwa wall at once.
  "wajib", "haram", "sunnah", "izin",
  // Javanese/regional registers this app's readers actually use.
  "dawuh", "wejang", "titah", "petuah",
];

/**
 * Indonesian `meN-` prefixation with nasal assimilation. The stem's first letter decides the nasal,
 * and four of them (`k p t s`) are ABSORBED by it:
 *
 *   ajar  → meng + ajar   → mengajar      sebut → meny + ebut  → menyebut   (s absorbed)
 *   kabar → meng + abar   → mengabar      tegas → men  + egas  → menegas    (t absorbed)
 *   jelas → men  + jelas  → menjelas      papar → mem  + apar  → memapar    (p absorbed)
 *
 * This is a rule of the language, not a lookup table, which is exactly why it can cover forms nobody
 * typed. It reproduces every verb the old list carried by hand, plus both that leaked.
 */
const activeForm = (stem: string): string => {
  const head = stem[0]!;
  if ("kpts".includes(head)) {
    const tail = stem.slice(1);
    return { k: "meng", p: "mem", t: "men", s: "meny" }[head as "k" | "p" | "t" | "s"] + tail;
  }
  if ("aiueogh".includes(head)) return `meng${stem}`;
  if ("bfv".includes(head)) return `mem${stem}`;
  if ("djcz".includes(head)) return `men${stem}`;
  return `me${stem}`; // l m n r w y ng ny
};

/**
 * Every surface form of a stem that can carry an attribution — across all four voices at once.
 *
 * `ber-` is here because it is where half the old hand-typed list actually came from: `bersabda`,
 * `berkata`, `berpesan`, `bercerita`, `berjanji` are one prefix over five stems. `memper-`/`diper-`
 * catch `memperingatkan`, which no simpler rule reaches.
 *
 * `belajar` (ber + ajar, irreducibly irregular) is NOT generated, and must not be: "dari kisah Nabi
 * Ayyub kita BELAJAR bahwa…" is compliant prose and generating it would refuse the app's own voice.
 */
const speechActForms = (stem: string): string[] => {
  // meN- and di- are the two affixes that RELIABLY derive a speech act from a speech-act stem.
  const bases = [activeForm(stem), `di${stem}`];
  return [
    ...bases.flatMap((b) => [b, `${b}kan`, `${b}i`]),
    // The bare root with -kan/-i is the OBJECT-FOCUS passive (pasif tipe 2), where the agent stands
    // bare in front of the root: "Itulah yang Rasulullah ﷺ AJARKAN kepada kita". Indonesian has two
    // passives and the file's own comment names only one — the `oleh` passive that leaked. This is
    // the other, and it was never covered by any pattern, legacy or generated.
    `${stem}kan`,
    `${stem}i`,
  ];
};

/**
 * `ber-` and `memper-` are OPT-IN, per stem, and that is the correction to this file's first attempt
 * at a grammar.
 *
 * Applying them across the board looked like more grammar and was actually less. `ber` + `sama` is
 * `bersama`, a preposition; `memper` + `ingat` + `i` is `memperingati`, which means to COMMEMORATE.
 * Generated blindly, they refused *"semoga kita dikumpulkan bersama Nabi ﷺ di surga"* and *"kita
 * memperingati Maulid Nabi ﷺ"* — stock du'a and core subject matter.
 *
 * `ter-` is gone entirely for the same reason and worse: it minted `ternyata`, `tersebut`,
 * `tersinggung`, `teringat`, `terancam` and `terlarang` as speech acts. `ternyata` and `tersebut` are
 * among the most frequent words in written Indonesian, so ANY sentence pairing one with the Prophet ﷺ
 * inside the clause window was silently dropped.
 *
 * The lesson generalises past this file: generating from an open axis is only safe where the
 * derivation is semantically reliable. `meN-`/`di-` on a speech-act stem always yields a speech act.
 * `ber-`/`ter-`/`memper-` do not, so their real forms are named — a SMALL, CLOSED set, which is the
 * one situation where enumeration is the honest instrument.
 */
const IRREGULAR_SPEECH_FORMS = [
  "bersabda", "berkata", "berpesan", "bercerita", "berbicara", "berujar", "bertutur", "berucap",
  "berjanji", "berfirman", "berdawuh", "berwasiat", "berseru", "berpetuah",
  "memperingatkan", "diperingatkan", "memperjelas", "diperjelas", "mempertegas", "dipertegas",
  "terucap", "tersirat",
];

/** One alternation over every generated form. Longest-first so `mengajarkan` wins over `mengajar`. */
const SPEECH_ACT = new RegExp(
  `\\b(?:${[...new Set([...SPEECH_ACT_STEMS.flatMap(speechActForms), ...IRREGULAR_SPEECH_FORMS])].join("|")})\\b`,
  "g",
);

/**
 * Nominalised speech acts — `penjelasan`, `sabda`, `pesan`, `riwayat`. Found by adversarial probing,
 * not by reasoning: *"Terdapat PENJELASAN DARI Rasulullah bahwa rasa sakit menggugurkan dosa"* carries
 * the identical claim with no verb in it at all, so every verb rule of every shape is blind to it.
 */
const SPEECH_NOUN =
  /\b(sabda|wasiat|nasihat|nasehat|penjelasan|keterangan|perkataan|ucapan|penuturan|pernyataan|seruan|petuah|dawuh|wejangan|titah|firman)(nya)?\b/g;

/**
 * AMBIGUOUS speech nouns — real in an attribution, but each has a dominant NON-speech reading:
 * `dengan kata lain`, `riwayat hidup`, `ajaran Islam`, `perintah Allah`, `kabar gembira`. Treating
 * them like the strong nouns above refused all five, and every one is ordinary prose this app writes.
 *
 * So they only count when ADJACENT to the subject — "kata Nabi,", "sabdanya", "riwayat dari beliau" —
 * where the noun and the referent form one phrase. Proximity inside a 64-character window is not
 * enough for a word this ambiguous, and the difference between the two lists is exactly how ambiguous
 * the word is on its own.
 */
const WEAK_SPEECH_NOUN =
  // `kata lain` ("in other words") and `riwayat hidup` ("biography") are fixed collocations in which the
  // noun is not a speech act at all. Both were refused as attributions until they were excluded here.
  /\b(kata(?!\s+lain)|riwayat(?!\s+hidup)|perintah|ajaran|kabar|pesan|anjuran|larangan|petunjuk|arahan|peringatan|bimbingan)(nya)?\b/g;

/** How close a WEAK noun must sit to the subject to count — one short function word, no more. */
const ADJACENT = 12;

/**
 * Referring expressions for Muhammad ﷺ — a genuinely CLOSED noun class, unlike the verbs. `kita`/
 * `kami` directly after the noun is absorbed because it is POSSESSIVE, not a new subject: "Nabi kita
 * melarang…" means *our* Prophet, and reading that `kita` as a subject would have opened the wall.
 */
const MUHAMMAD_SUBJECT =
  /\b(r[ao]s?[ou]l+ull?[oa]h|rasul|nabiyullah|nabiku|nabi|muhammad|beliau|baginda|junjungan|kanjeng|habibullah|al-?mustafa|al-?musthafa|(utusan|kekasih)\s+allah)\b(\s+(kita|kami))?/g;

/**
 * The other prophets — the canon taught in every Indonesian madrasah. Closed and stable, which is why
 * enumerating THIS is safe where enumerating verbs was not.
 *
 * `nabi` followed by one of these names is Qur'anic NARRATIVE, and the generated grammar deliberately
 * does not reach it: *"Kisah Nabi Yusuf mengajarkan kita arti kesabaran"* and *"Nabi Musa menunjukkan
 * kepada kita bahwa rasa takut itu manusiawi"* are the app's core competency, and refusing them would
 * be a silent loss. Other prophets keep the legacy `PROPHETIC` vocabulary below, unchanged.
 *
 * An UNLISTED name therefore falls through to Muhammad ﷺ and gets the strict treatment. That is the
 * correct failure polarity: an unknown name costs a pointer, never a fabricated hadith.
 *
 * `shalih`/`saleh` are deliberately NOT here, though Nabi Shalih is one of the 25. They are also
 * ordinary Indonesian adjectives, and the collision was exploitable: *"Nabi SALEH nan penyayang itu
 * menuturkan kepada kita…"* discarded the only Muhammad-designation in the sentence and shipped an
 * unreceipted attribution. A name that doubles as a common adjective cannot carry this weight, so
 * that one prophet falls to the strict side — costing a pointer on a rarely-told story.
 */
const OTHER_PROPHET =
  /^\s+(adam|idris|nuh|hud|ibrahim|luth|lut|ismail|ishaq|ishak|ya'?qub|yakub|yusuf|syu'?aib|ayyub|ayub|musa|harun|dzulkifli|zulkifli|dawud|daud|sulaiman|ilyas|ilyasa|yunus|zakaria|zakariya|yahya|isa|khidir|khidhir)\b/;

/**
 * A DISTINCT subject interposed between the Prophet ﷺ and the verb breaks the agent relation:
 * "Nabi ﷺ adalah teladan bagi kita semua, dan KITA harus mengajarkan kebaikan kepada anak-anak" is
 * compliant prose whose verb belongs to `kita`, not to the Prophet. Possessives are already absorbed
 * into the subject above, so only a genuine second subject reaches here.
 */
const AGENT_PRONOUN = "kita|kami|saya|aku|mereka|kamu|kalian|anda|engkau|sahabat|ulama|ustadz";

/**
 * …but only when it is actually a SUBJECT. Preceded by a preposition it is a RECIPIENT, and reading
 * the two the same way was an exploit: *"Hal itu dipesankan oleh Rasulullah"* is refused, while
 * *"Hal itu dipesankan KEPADA KITA oleh Rasulullah"* shipped. Four characters reopened the wall.
 */
const OTHER_AGENT = new RegExp(`(?<!\\b(kepada|bagi|untuk|pada|terhadap|dari|oleh|sama)\\s)\\b(${AGENT_PRONOUN})\\b`);

/**
 * The mirror case: a pronoun sitting immediately BEFORE the verb owns it, wherever the Prophet ﷺ is.
 * "Setiap hari KITA MENGINGAT Rasulullah ﷺ lewat sholawat" has the Prophet as the OBJECT, and the
 * window-local test could not see it because `kita` falls outside the span it inspects.
 */
const AGENT_BEFORE_VERB = new RegExp(`\\b(${AGENT_PRONOUN})\\s+(\\w+\\s+){0,1}$`);

/**
 * How far apart the subject and the speech act may sit and still be one clause.
 *
 * 64 characters, and the number is measured rather than chosen: the Latin honorific "shallallahu
 * alaihi wasallam" alone is 27, and production shipped *"Nabi ﷺ, sosok yang paling lembut kepada
 * umatnya, memerintahkan agar…"* at a gap of 42. A narrower window silently reopens the wall for
 * exactly the phrasings the model actually writes.
 */
const CLAUSE_WINDOW = 64;

/** Every position in the sentence where Muhammad ﷺ is the referent (other prophets excluded). */
const muhammadSubjects = (s: string): Array<{ start: number; end: number }> => {
  const out: Array<{ start: number; end: number }> = [];
  for (const m of s.matchAll(MUHAMMAD_SUBJECT)) {
    const end = m.index! + m[0].length;
    // "nabi Yusuf" is a different prophet; "nabi Muhammad" and bare "nabi" are not.
    if (/^(nabi|nabiyullah)$/.test(m[1]!) && OTHER_PROPHET.test(s.slice(end))) continue;
    out.push({ start: m.index!, end });
  }
  return out;
};

/**
 * Does this sentence put Muhammad ﷺ in an agent relation to a speech act, in EITHER voice?
 *
 * Order-blind on purpose. Active puts the subject first ("Rasulullah menuturkan bahwa…"), the `oleh`
 * passive puts it last ("…diajarkan oleh Rasulullah"), the agentless passive drops `oleh` entirely
 * ("…sebagaimana yang ditegaskan Nabi"), and the agent can even be fronted ("Oleh Nabi ﷺ, kegelisahan
 * hati diibaratkan…"). All four are the same claim. A rule that reads left-to-right sees three of them
 * as different problems — which is precisely how the passive leak happened.
 *
 * Note there is no `bahwa` gate here, unlike the legacy weak-verb pattern. For Muhammad ﷺ specifically
 * that gate was never sound: everything he taught is known ONLY through hadith, so "Rasulullah ﷺ
 * mengajarkan kita untuk selalu bersyukur" is a hadith claim carrying no receipt. The gate looked
 * correct only because every compliant test case happened to name Yusuf, Ibrahim or Musa.
 */
const muhammadSpeechAct = (s: string): boolean => {
  const subjects = muhammadSubjects(s);
  if (subjects.length === 0) return false;
  const acts = [
    ...[...s.matchAll(SPEECH_ACT)].map((m) => ({ m, reach: CLAUSE_WINDOW })),
    ...[...s.matchAll(SPEECH_NOUN)].map((m) => ({ m, reach: CLAUSE_WINDOW })),
    // Ambiguous nouns only count as part of the subject's own phrase — see WEAK_SPEECH_NOUN.
    ...[...s.matchAll(WEAK_SPEECH_NOUN)].map((m) => ({ m, reach: ADJACENT })),
  ];
  // Blank out the subject phrases before either agent test runs. Without this the possessive inside
  // "Nabi KITA menjanjikan…" reads as the agent of `menjanjikan` and the sentence ships — the same
  // possessive trap that MUHAMMAD_SUBJECT already absorbs, reappearing one rule later. Same length, so
  // every index below still refers to the original string.
  const masked = subjects.reduce(
    (acc, sub) => acc.slice(0, sub.start) + "#".repeat(sub.end - sub.start) + acc.slice(sub.end),
    s,
  );
  return subjects.some((subj) =>
    acts.some(({ m, reach }) => {
      const after = m.index! >= subj.end;
      const [lo, hi] = after ? [subj.end, m.index!] : [m.index! + m[0].length, subj.start];
      if (hi - lo > reach) return false;
      // A distinct subject between the two breaks the agent relation…
      if (OTHER_AGENT.test(masked.slice(lo, hi))) return false;
      // …and one immediately before the verb owns it outright, wherever the Prophet ﷺ sits.
      if (AGENT_BEFORE_VERB.test(masked.slice(0, m.index!))) return false;
      return true;
    }),
  );
};

/**
 * Prophetic-attribution grammar — the shape of "the Prophet said", not a vocabulary of holy words.
 *
 * Built like VERDICT and for the same reason. A word list is the wrong instrument twice over: it
 * would reject "Nabi" and "hadits" in ordinary compliant prose ("aku bukan ahli hadits") while
 * missing the actual failure, which is not a wrong NUMBER but an attribution carrying NO number at
 * all — a fabricated saying of the Prophet ﷺ in fluent Indonesian, invisible to `arabic` (no Arabic
 * script) and to `bad_ref` (no verse reference).
 *
 * This rule WILL reject true answers — a correct paraphrase of a real hadith the model happens not
 * to mark. That is the intended trade, and the same one `bad_ref` already makes: the app would
 * rather stay silent than attribute an unverifiable sentence to the Prophet ﷺ.
 */
const PROPHETIC = [
  /\b(nabi|rasul|rasulullah|beliau|muhammad)\b[^.!?]{0,40}\b(bersabda|menyabdakan|mengatakan|berkata|berpesan|mengingatkan|menganjurkan|melarang|memerintahkan)\b/,
  // WEAK attribution verbs, admitted only when they introduce a PROPOSITION.
  //
  // Found by probing live production, not by reading this list: asked *"apakah benar bahwa sakit itu
  // akan menghapus dosa kita?"*, prod answered *"Rasulullah shallallahu alaihi wasallam MENGAJARKAN
  // bahwa tidaklah seorang muslim tertimpa kelelahan…"* — a real hadith, no marker, `ok = true`, zero
  // violations. The list above carries `menganjurkan` and not `mengajarkan`; one letter apart to the
  // eye, different words, and the wall the file calls its highest-stakes one was open the whole time.
  // It also explains the intermittency that made this look like a caching problem: the same question
  // is refused or answered depending on which verb the model reaches for.
  //
  // These verbs CANNOT be added unconditionally, which is why they are a second pattern rather than
  // more alternatives above. Measured: a flat widening rejects *"Kisah Nabi Yusuf mengajarkan kita
  // arti kesabaran"* and *"Kisah Nabi Musa menjelaskan betapa besar pertolongan Allah"* — Qur'anic
  // narrative, the thing this app is FOR, and the loss would be silent.
  //
  // `bahwa` is the discriminator, and it is grammatical rather than lexical: it marks a complement
  // clause, so `mengajarkan bahwa X` reports a saying while `mengajarkan kita kesabaran` draws a
  // lesson. The first needs a receipt; the second is the app doing its job.
  /\b(nabi|rasul|rasulullah|beliau|muhammad)\b[^.!?]{0,60}\b(mengajarkan|menjelaskan|menyebutkan|memberitahu|mengabarkan|menuturkan|menyampaikan|menegaskan|mengungkapkan)\b[^.!?]{0,16}\b(bahwa|bahwasanya)\b/,
  // The same weak verbs introducing DIRECT speech — a colon or an opening quote does the work `bahwa`
  // does above. "Nabi ﷺ mengajarkan: tidaklah seorang muslim…" carries exactly the same claim.
  /\b(nabi|rasul|rasulullah|beliau|muhammad)\b[^.!?]{0,60}\b(mengajarkan|menjelaskan|menyebutkan|memberitahu|mengabarkan|menuturkan|menyampaikan|menegaskan|mengungkapkan)\s*[:,]\s*["'“„«]/,
  /\bsabda\s+(nabi|rasul|rasulullah|beliau)\b/,
  /\bdalam\s+(sebuah\s+)?(hadits|hadis|riwayat)\b/,
  /\b(hadits|hadis)\s+(riwayat|shahih|sahih|dari)\b/,
  /\bdiriwayatkan\s+(oleh|dari|bahwa)\b/,
  // PASSIVE VOICE, subject AFTER the verb — the construction that leaked on prod at 2026-08-12 22:xx,
  // minutes after the active-voice widening above was deployed and called done.
  //
  // Shipped to a reader: *"sakit dan musibah yang menimpa seorang mukmin memang bisa menjadi penghapus
  // dosa, sebagaimana yang DIAJARKAN OLEH Rasulullah ﷺ"*. Two independent misses. The active patterns
  // are anchored subject-then-verb, and Indonesian passive puts the agent last via `oleh`, so the whole
  // clause reads backwards to them. And `diajarkan` is the `di-` passive of `mengajarkan`, which the
  // list did not carry either — the same one-word-off failure as `menganjurkan`/`mengajarkan`.
  //
  // `diriwayatkan` directly above proves this shape was already known: it is exactly a `di-` passive
  // taking `oleh`, and it was enumerated as a single word instead of as the construction it is. This
  // pattern is the generalisation that should have been written then.
  //
  // No `bahwa` gate here, unlike the active weak verbs. `oleh <the Prophet>` names an AGENT, which is
  // an attribution whatever follows — there is no "draws a lesson" reading of "diajarkan oleh
  // Rasulullah" the way there is for "Kisah Nabi Yusuf mengajarkan kita kesabaran".
  /\bdi(sabdakan|ajarkan|jelaskan|sebutkan|sampaikan|kabarkan|tuturkan|perintahkan|anjurkan|tegaskan|larang)\w*\b[^.!?]{0,24}\boleh\s+(nabi|rasul|rasulullah|beliau|muhammad)\b/,
  // `menurut Nabi ﷺ` — the list already had `menurut (sebuah) hadits` but not the person himself.
  /\bmenurut\s+(nabi|rasul|rasulullah|beliau)\b/,
  /\b(h\.?r\.?|hr)\s+(bukhari|muslim|tirmidzi|abu\s+dawud|nasa'?i|ibnu\s+majah|ahmad)\b/,
  /\bmenurut\s+(sebuah\s+)?(hadits|hadis)\b/,
];

/**
 * Is any sentence attributing something to the Prophet ﷺ without a marker this turn's grounding can
 * resolve? Returns the offending fragment, or null.
 *
 * Sentence-scoped, exactly like `fatwaShape`, and for the identical reason: one resolvable marker
 * early in an answer must not license a paragraph of unmarked attributions after it. Every sentence
 * that makes a prophetic claim carries its own receipt.
 */
/**
 * Make prose safe to split on sentence punctuation without losing the two things this rule reads.
 *
 * Both fixes are for real prose the naive split got wrong:
 *
 *   - A marker is written AFTER the full stop ("…perkara berat. [H:muslim:154]"), which is the
 *     natural place for a citation and which threw the receipt into the FOLLOWING sentence, so a
 *     correctly-marked claim was rejected. Markers are pulled back inside the sentence they cite.
 *   - "HR." carries a full stop of its own, so "(HR. Bukhari)" split into "(HR" and "Bukhari)" and
 *     the attribution matched nothing. The abbreviation is flattened before splitting.
 */
const normaliseForSentences = (prose: string): string =>
  prose
    .replace(/\bH\.\s*R\.\s*/gi, "HR ")
    .replace(/\bHR\.\s*/gi, "HR ")
    .replace(/([.!?])(\s*(?:\[H:[a-z][a-z-]*:\d{1,6}\]\s*)+)/g, " $2$1");

export function hadithShape(prose: string, isGrounded: (id: string) => boolean): string | null {
  for (const raw of normaliseForSentences(prose).split(/[.!?\n]+/)) {
    const s = raw.toLowerCase();
    if (!s.trim()) continue;
    // UNION, never replacement (ISC-440). The generated grammar above is added BESIDE the legacy
    // list, never instead of it: widening only adds refusals, whereas narrowing is how a fabrication
    // ships. Keeping both makes a regression structurally impossible — every sentence the old list
    // caught is still caught, whatever the new rule decides.
    if (!muhammadSpeechAct(s) && !PROPHETIC.some((re) => re.test(s))) continue;
    // A marker in THIS sentence, resolving against THIS turn's grounding, is the receipt.
    const markers = [...raw.matchAll(MARKER_IN_PROSE)];
    if (markers.some((m) => isGrounded(markerToId(m[1]!, m[2]!)))) continue;
    return raw.trim();
  }
  return null;
}

/**
 * A quoted span long enough to BE the source's wording rather than a term the sentence is about.
 *
 * Set from the distribution measured across seven live prod answers on 2026-08-17, not from taste:
 * the violations were 18, 12 and 11 words; the longest benign quote was 6 (the reader's own imagined
 * voice), and every other benign one was a bare term of 1-3 words. Eight is the gap, with two words
 * of margin under it.
 */
const OWN_WORDING_MIN_WORDS = 8;


/**
 * Sentences that write out the wording of scripture or of the Prophet ﷺ instead of citing it.
 *
 * THIS IS NOT A RECEIPT RULE, and it is deliberately blind to markers. `hadithShape` already asks
 * whether an attribution carries a receipt; this asks what the app PRINTED. An answer can hold a
 * marker that resolves perfectly and still put the app's own Indonesian rendering of the hadith on
 * the screen — which is exactly what shipped on 2026-08-17, twice, with the card rendering below it.
 * The app's entire provenance posture is that the WORDS come from the pinned corpus with
 * attribution; a rule that only checked receipts left the words unguarded.
 *
 * WHAT THE RULE ASKS, AND WHY IT CHANGED — NARROWED 2026-08-17 (late-4), on measured cost.
 *
 * The first cut asked whether the SENTENCE cited an ayah. That is a different question from whether
 * the QUOTE is scripture, and 24 live turns priced the difference: `bolehkah perempuan jadi pemimpin`
 * refused 3 of 3 and `apa hukum riba…` 2 of 3, both questions whose good answers necessarily quote
 * SCHOLARSHIP at length while citing ayat. ISA.md names the first as one of the two answers a hard
 * rule would destroy; it had destroyed it. Verified by construction: the rule refused a scholar's
 * position, our own knowledge entry and the reader's own framing identically to a hand-written ayah
 * translation, because it never looked at whose words were in the quotation marks.
 *
 * So it now asks for one of the two things a quotation of scripture actually carries:
 *   DIVINE ATTRIBUTION — `Allah berfirman/menggambarkan/menegaskan`, `firman-Nya`, `artinya`,
 *     `terjemahannya`. This is the shape the 2026-08-17 QS 2:187 violation had.
 *   ADJACENCY — the quote sits against its citation, `"…" (QS Al-Isra 17:32)`. This shape carries no
 *     attribution verb at all and was the ORIGINAL ISC-419 evidence.
 * and it stands down when a HUMAN subject plainly owns the words and nothing divine is claimed.
 *
 * ADJACENCY IS MEASURED ON THE WHOLE PROSE, NOT PER SENTENCE, AND THAT IS A FIX. Writing the stop
 * inside the closing quote (`…jalan yang buruk.”`) is how real prose is punctuated, and the sentence
 * splitter breaks there — so the quote and its `(QS 17:32)` landed in DIFFERENT segments and the
 * bare-citation shape, the commonest violation of the three on record, was never caught by the
 * version that shipped this morning. The window spans the split.
 *
 * KNOWN AND ACCEPTED HOLE: `para ulama menyebutkan bahwa "<a verse's wording>"` with no citation
 * anywhere near it passes. Closing it needs the quoted span checked against the corpus, not a
 * grammar rule. The posture this wall defends is presenting our rendering AS scripture; an
 * unattributed, uncited quotation does not do that.
 */
/** Verbs that put a subject in an attribution relation to the quoted words. */
const DIVINE_VERB =
  "berfirman|berkata|menyebut|menyebutkan|menggambarkan|menegaskan|menjelaskan|memerintahkan|melarang|mengingatkan";

/**
 * Human roles that can own a speech act. One definition, two consumers — `HUMAN_ATTR` below, whose
 * stand-down this vocabulary was written for, and `APPOSITIVE_BREAK`, which needs the same answer to
 * the same question: could someone other than Allah have said this?
 *
 * `menurut` is the odd one out and is kept anyway. It is a PREPOSITION, not an agent, so as an
 * appositive break it is doing something the other entries are not — but it only ever appears where
 * an owner follows it, and dropping it here would fork the vocabulary that this const exists to keep
 * single. Noted rather than silently carried, because it is not covered by any of the THREE limits below (it was "the two limits" until 2026-08-20; limit 3 was added below it and this sentence was not updated in the same pass that updated the header).
 */
const HUMAN_ROLE =
  "ulama|ustadz|kiai|kyai|mufti|imam|syaikh|syekh|orang|entri|catatan|penafsir|mufassir|sebagian|banyak|menurut";

/**
 * The span an APPOSITIVE may occupy between a divine designation and its verb — any length inside one
 * sentence, stopping at a genuine second agent.
 *
 * WHY THERE IS NO NUMBER HERE. This was `[^.!?]{0,40}`, and one comma-set epithet walked the live
 * riba violation through at every quote length:
 *
 *     Allah, Tuhan semesta alam yang Maha Pengasih dan Maha Penyayang kepada kita, berfirman, "…"
 *
 * The cap conflated two jobs. Same-SENTENCE binding is done by `[^.!?]`, and that is the part doing
 * real work. Proximity was a guessed number standing in for "no one else owns this verb" — and an
 * epithet is unbounded, so any replacement number is bypassed by a longer one. This file already
 * learned that lesson on the eight-word floor; raising 40 to 80 would learn it a third time.
 *
 * So the proxy is replaced by the thing it was proxying for: the span runs until someone else who
 * could own the verb turns up. It carries the same preposition lookbehind `OTHER_AGENT` uses, so
 * `kepada kita` inside an epithet stays a RECIPIENT while `dan kita` ends the span.
 *
 * THE SPAN IS AN EXTRA ARM, NEVER A REPLACEMENT — and that correction came from a `scholarly-gate`
 * BLOCK on the first cut of this very change, caught by a paired HEAD-vs-tree probe that the green
 * suite could not see. `[^.!?]{0,40}` matched straight THROUGH an agent pronoun; this span stops at
 * one. So swapping the window out lost six refusals HEAD was making, each one an ayah rendering
 * attributed to Allah — `Allah mengajarkan kita lewat ayat ini, lalu menegaskan, "…"` and five like
 * it, all inside forty characters. Union, never replacement, is the rule `hadithShape` states thirty
 * lines up (ISC-440); this file breaks a wall every time it is treated as advice.
 *
 * WHY THE BREAK VOCABULARY IS WIDER THAN `AGENT_PRONOUN`. The same gate pass found the appositive arm
 * newly refusing `…Allah menutup pintu kezaliman…, dan Imam Nawawi menegaskan bahwa "…"` — a
 * scholar's position quoted beside an ayah, which is ISC-486 — now UN-MARKED, because
 * this arm broke it for bare proper names. `AGENT_PRONOUN` alone
 * does not know `imam`, `mufti`, `penafsir` or `banyak orang` can own a verb, but `HUMAN_ATTR`
 * already enumerates exactly them, so the break reuses that vocabulary rather than a third list.
 *
 * THREE LIMITS REMAIN. Naming only the safe one is how a guard comes to be read as stronger than it
 * is, which `ustadz-followup-2026-08-18` commits us in writing not to do — *"supaya Ustadz tidak
 * menilai penjaga itu lebih kuat daripada keadaannya."*
 *
 * This header said TWO for a whole gate pass AFTER limit 3 was added forty lines below it, while the
 * matching `ISA.md` header was corrected in the same diff. So the two records disagreed on how many
 * limits were open and **the one a maintainer reads in the code stated the smaller number** — under
 * the sentence above, which says that is exactly how the guard gets over-read.
 *
 * NUMBERING IS ISA's, NOT THE BULLET ORDER BELOW. Limit 1 = UNDER-refusal, limit 2 = OVER-refusal,
 * limit 3 = the adjacency stand-down — matching ISC-419 in `ISA.md`. The bullets below run
 * OVER first for historical reasons, so "limit 1" in this file never means "the first bullet".
 *
 *   - OVER-REFUSAL. A human subject in neither vocabulary — `gurunya`, `penulisnya`, a bare proper
 *     name like `Ibnu Katsir` or `Buya Hamka` — does not break the span, so a designation early in a
 *     long sentence can still reach a verb that is not its own. **The rate for that class is 100%,
 *     not the "3 in 6" an earlier version of this comment reported**: measured over 15 owner forms ×
 *     6 verbs, every survivor survived because its form CONTAINS a `HUMAN_ROLE` token (`Imam` Nawawi,
 *     `Syaikh` Utsaimin, seorang `mufti`), and no bare name survived at all. A denominator mixing the
 *     rescued class with the broken one reads as a rate and is not one. Safe polarity; ISC-486.
 *   - UNDER-REFUSAL, and this one is the price of the `HUMAN_ROLE` half. Those nouns are ordinary
 *     words as well as roles, so one planted INSIDE an epithet ends the span early and the bypass
 *     reopens for the loose verbs. Measured against a control — the same epithet without the noun is
 *     refused:
 *
 *         Allah, Tuhan yang menciptakan seluruh ORANG di muka bumi ini, melarang, "…"      passes
 *         Allah, Tuhan yang memberi BANYAK nikmat tak terhitung jumlahnya, menjelaskan, "…" passes
 *
 *     `berfirman` is airtight regardless — `VERBATIM_DIVINE` needs no subject — so this reaches only
 *     the nine looser verbs. **NARROWED, NOT CLOSED — and the word "CLOSED" stood here over two
 *     different false versions of this sentence before it came down.** `APPOSITIVE_OWNS_VERB` and the
 *     third arm below close it wherever the role noun sits AWAY from the verb — 72 of 72 of the
 *     comma-terminated epithets measured, and 7,020 of 7,020 across a wider comma grid. **That is a
 *     measured set, NOT the class "comma-terminated": a draft said "every comma-terminated epithet"
 *     and `Allah, Tuhan yang menciptakan seluruh orang di muka bumi ini, DAN KITA menegaskan, "…"`
 *     falsifies it — comma-terminated and still OPEN, because the owner sits after the comma.** The
 *     comma is not the discriminator; POSITION RELATIVE TO THE VERB is. It stays OPEN wherever an
 *     owner token is the last or
 *     second-to-last word before the verb, because that is exactly when the adjacency stand-down
 *     fires — see limit 3 below. The limit's text is kept rather than deleted because the arm it
 *     describes is still here and still has this shape; what changed is that a second arm now covers
 *     part of what it misses. Read the two together.
 *   - The OVER-refusal limit above is NOT closed, and the third arm does not close it — it ENLARGES
 *     it. That is the opposite of what the first version of this paragraph said, and the correction
 *     came from a `scholarly-gate` BLOCK: proximity makes the BREAK fire less often, but the third
 *     arm is not the break, and it ignores upstream owners the span used to stop at. On HEAD a bare
 *     name is RESCUED whenever any owner token appears earlier in the sentence — `…yang KITA baca
 *     bersama tadi malam, dan Ibnu Katsir menjelaskan bahwa "…"` passes, because the span ends at
 *     `kita` before ever reaching the verb. Measured at 120 of 120. A bare name with NO upstream
 *     token was already refused on HEAD, so this makes ISC-486 UNIFORMLY false for that class rather
 *     than newly false. The reducing fix is a proper-name vocabulary on the ownership test — shown to
 *     work, not built here; see the cost block below and ISC-486 in `ISA.md`.
 *   - LIMIT 3, THE ADJACENCY STAND-DOWN FIRES INSIDE AN EPITHET. Pre-existing, not a regression —
 *     HEAD passes these too — and the reason the word "CLOSED" above was wrong twice. The stand-down
 *     asks only whether an owner token sits within one word of the verb; it cannot tell whether that
 *     token is the sentence's subject or a noun buried in a description of Allah. Every pinned row
 *     terminates its epithet with a COMMA, and a comma defeats `\\w+\\s+`, so the arm fires. Move the
 *     same noun to the tail of the epithet — ordinary Indonesian, no comma — and all three arms stand
 *     down together:
 *
 *         Allah, Tuhan yang menghidupkan dan mematikan setiap makhluk dan banyak ORANG melarang, "…"
 *         Allah, Tuhan yang telah menciptakan langit dan bumi beserta KITA semua menegaskan, "…"
 *
 *     **EVERY ROW OPEN across eight tail-position epithet shapes × nine loose verbs — 72 of 72 on the grid described here, whose eight shapes are enumerated below.** ⚠ **The numeral 72 carries FOUR senses in these two files and two of them are opposite (a draft said THREE and missed `HUMAN_ATTR`'s `{0,72}` character bound at the foot of this file — a universal asserted about a numeral is still a universal): `72 GAINED` (refusals added), `72 of 72` CLOSED (comma-terminated set, limit 1), and this one, `72 of 72` OPEN (tail-position set, limit 3). The first two are the same rows; this third is a disjoint set of coincidentally equal size, ~30 lines away in the same docblock. A draft replaced a wrong "72 of 207" with a bare "72 of 72" and created the collision while fixing the denominator.** **AND 72 IS NOT THE ONLY ONE — 36 and 18 carry the identical shape and are flagged here rather than left: `36` is a count of under-refusals AND two disjoint 36-row measured sets AND a 36-of-36 figure; `18` is a count of over-refusals AND an 18-row owner-free set AND the numerator of the discredited "18 of 63" rate AND the largest word count in the `OWN_WORDING_MIN_WORDS` distribution ("the violations were 18, 12 and 11 words"). The `18` flag missed that fourth sense on its first pass while the `72` flag had already been widened to catch exactly that kind of non-measurement numeral — a flag held to a lower standard than the flag beside it.** And the 100% is a property of THIS eight-shape set, not of tail position as a class — an independently-chosen eight-shape set returned 54–59 of 72 — and that denominator is a FIFTH sense of 72, a different eight-shape grid, which the four-sense list above does not cover. **A draft wrote "72 of 207", and 8×9 is exactly 72 while 207 is not divisible by 8: the numerator came from the stated grid and the denominator from a larger one that mixed in shapes this class does not cover. That reads as a 35% rate and is not one** — the same denominator error `ISA.md` corrects under ISC-486 ("a denominator mixing the rescued class with the broken one reads as a rate and is not one"). Wider: 2 designations × 26 owner tokens × 8 tail shapes × 9 loose verbs × 2 quotes = 7,488 rows, 7,488 open on tree AND on HEAD, including the plain
 *     `Allah yang …` relative clause — but ONLY when an owner token sits at the tail. A draft said
 *     "with no appositive at all", which is false as a universal and in the direction that OVERSTATES
 *     the hole: `Allah yang Maha Pengasih menegaskan, "…"` is REFUSED on tree and on HEAD; the same
 *     clause ending `beserta KITA semua` is open. THE EIGHT TAIL SHAPES, enumerated because a draft
 *     cited a grid it never listed: four `Allah, Tuhan yang …` appositives (`… dan banyak <T>`,
 *     `… beserta <T> semua`, `… kepada setiap <T>`, `… di dalam <T>`), two `Allah yang …` relative
 *     clauses (`… dan banyak <T>`, `… beserta <T> semua`), and two more appositives
 *     (`… bagi hamba dan <T>`, `… setiap bagian tubuh <T>`), each closed by one of the nine loose
 *     verbs. THE ENUMERATION LISTS TAILS, NOT BODIES, and the result depends on the body clearing
 *     arm 1's forty characters — the same eight tails on a SHORT body are REFUSED. A reader
 *     reproducing 72 of 72 needs that constraint; without it the grid does not reproduce.
 *     **EVERY token in `AGENT_PRONOUN` ∪ `HUMAN_ROLE` opens it at tail position — 26 of 26 measured,
 *     one row per token, identical on HEAD.** Not merely the four nouns limit 1 names: a draft said
 *     "all four nouns … and both pronoun forms", which reads as six and is twenty-six. `berfirman` is
 *     airtight throughout. Deliberately NOT pinned by a passing test; recorded with its failing
 *     strings under ISC-419 in `ISA.md`, per this file's convention for a declined gap.
 */
const APPOSITIVE_BREAK = `(?<!\\b(?:kepada|bagi|untuk|pada|terhadap|dari|oleh|sama)\\s)\\b(?:${AGENT_PRONOUN}|${HUMAN_ROLE})\\b`;
const DIVINE_APPOSITIVE = `(?:(?!${APPOSITIVE_BREAK})[^.!?])*`;

/**
 * A `PRONOUN_APPOSITIVE` — the same span stopping only at `AGENT_PRONOUN` — STOOD HERE FOR ONE GATE
 * PASS AND WAS REVERTED. It is recorded rather than deleted because the reasoning that produced it is
 * the kind that will be produced again.
 *
 * It was written to answer a `scholarly-gate` finding that the ownership arm below enlarges ISC-486:
 * on HEAD a bare scholar name is rescued whenever any owner token appears earlier in the sentence,
 * and the arm ignores upstream tokens. Splitting `APPOSITIVE_BREAK` — always-agents (`kita`, `mereka`)
 * stop the span, sometimes-agents (`orang`, `banyak`) do not — restored that rescue for the first kind
 * and cut the over-refusal from 120 of 120 to 80 of 120.
 *
 * IT ALSO RE-OPENED THE BYPASS THIS WHOLE CRITERION EXISTS TO CLOSE, and the next gate pass found it:
 * a pronoun planted inside an epithet longer than forty characters ends the span too, so all three
 * arms stop before the verb and the divine attribution walks through. **45 of 45 pronoun-epithet rows
 * passed.** `Allah, Tuhan yang menciptakan KITA semua di muka bumi ini, menegaskan, "<an ayah
 * rendering>"` — which is ISA.md's own recorded live-violation shape, caught until now only because it
 * happened to fit inside forty characters.
 *
 * THE TRADE, MEASURED IN BOTH DIRECTIONS AT ONCE, is why it is gone: the split bought 18 fewer
 * over-refusals and cost 36 more under-refusals. On this wall those units are not comparable — an
 * under-refusal is the app printing its own rendering as Allah's words, an over-refusal is a scholar's
 * quotation declined. The premise it rested on was false in the same breath: `kita` in
 * `menciptakan kita semua` is an OBJECT, so the token is not "an agent wherever it appears" either.
 */

/**
 * The break's question, asked the other way round: not "does an owner APPEAR between the designation
 * and the verb", but "does one sit near enough to OWN it".
 *
 * This is `AGENT_BEFORE_VERB`'s test — owner, then at most one intervening word, then the verb — and
 * the shape is taken from there rather than re-guessed, because `muhammadSpeechAct` already answers
 * this question for the prophetic wall and two answers to one question drift. It reuses
 * `APPOSITIVE_BREAK` verbatim for the same reason the break reuses `HUMAN_ROLE`: the preposition
 * lookbehind is load-bearing here too, and a third copy of that vocabulary is a third thing to
 * forget. `Allah menurunkan rahmat-Nya KEPADA KITA, menegaskan, "…"` must still refuse — `kita` is
 * a RECIPIENT — while `…, dan KITA menegaskan, "…"` must stand the arm down.
 *
 * WHY THIS IS A THIRD ARM AND NOT A REPLACEMENT FOR `DIVINE_APPOSITIVE`. Union, never replacement —
 * the rule stated thirty lines above `hadithShape` (ISC-440), and the one whose breach deleted six
 * refusals one commit ago while `bun test` stayed 1616/0 green. Additive means no refusal CAN be
 * lost, rather than none appearing to be. Measured, not assumed: a paired HEAD-vs-tree sweep of 880
 * designation × epithet × verb × quote combinations returns 72 GAINED and **0 LOST**.
 *
 * An earlier draft justified the arm as a "strict superset" of the span instead. It is not one, and
 * `scholarly-gate` produced the counterexample: this lookbehind is not scoped to the region BETWEEN
 * the designation and the verb, so an owner standing before the designation blocks it while leaving
 * the span untouched — `menurut ulama allah menegaskan bahwa "…"` matches arm 2 and not arm 3. The
 * union is what makes the change safe; the superset argument was wrong and was never what made it so.
 *
 * WHAT IT COSTS, AND THE COST IS THE OVER-REFUSAL LIMIT GETTING WORSE. The arm ignores owner tokens
 * UPSTREAM of the verb, and on HEAD those are what rescue a bare scholar name — the span ends there
 * before the verb is ever reached. So this passed on HEAD and is refused here:
 *
 *     …pada bagian akhir pembahasan yang KITA baca tadi malam, dan Ibnu Katsir menjelaskan bahwa "…"
 *
 * **120 of 120** such rows, measured by `scholarly-gate` — not by this change's own first cost probe,
 * which reported "18 of 63" from a grid that put no owner token upstream and therefore could not have
 * contained the class it was offered as the cost of. A bare name with NO upstream token was already
 * refused on HEAD (27 of 27 here, and 48 of 48 in ISC-486's own measurement), so what this arm does
 * is make ISC-486 UNIFORMLY false for bare names rather than newly false.
 *
 * NO PROXIMITY TEST RECONCILES LIMITS 1 AND 2 — but the residue is NOT irreducible, and a draft of
 * this comment called it that. `scholarly-gate` refuted it in one pass by adding a proper-name
 * vocabulary to the ownership test alone: the bare-name rows are rescued, all four ISC-419 bypass
 * rows stay refused, whole suite green. The sentence distinguishes the cases after all — the owner
 * adjacent to the verb is a NAME. That path is not taken here because it is a real design question
 * and not a fourth correction inside one change: `before` is lower-cased before any arm sees it, so
 * capitalisation is unavailable and a hand-kept name list is what remains. Recorded under ISC-486.
 *
 * WHY THE COST IS PAID RATHER THAN SPLIT. Narrowing the span to always-agent tokens does cut this to
 * 80 of 120 — and it re-opens the bypass for pronoun epithets. **Two grids measure that re-opening and
 * they are not in conflict: 45 of 45 on a 5-epithet × 9-verb grid, and 36 of 36 on the 4-epithet ×
 * 9-verb paired grid that scores both directions at once.** The paired grid is the one the trade is
 * read off, because it is the only one that prices both sides on the same rows: 36 under-refusals
 * opened against 18 over-refusals rescued. See the reverted `PRONOUN_APPOSITIVE` block above. The
 * units are not comparable either way: an under-refusal is the
 * app printing its own rendering as Allah's words, an over-refusal is a scholar's quotation declined
 * with the reader told nothing. The divine side is chosen deliberately, and the cost is a cost, not
 * a second win. Exact figures under ISC-486 in `ISA.md`.
 */
const APPOSITIVE_OWNS_VERB = `(?<!${APPOSITIVE_BREAK}\\s+(?:\\w+\\s+)?)`;

/**
 * The words belong to Allah / the Qur'an — the sentence says so.
 *
 * `allah|tuhan` and `dia|ia` are split because they are not equally load-bearing. The designations
 * are unambiguous wherever they sit, so they get all THREE arms — the 40-character window, the
 * appositive span, and the ownership test. The pronouns are anaphoric — `ia berkata` is the commonest
 * reported-speech shape in Indonesian — and are divine only by proximity, so they keep the tight
 * window alone.
 *
 * The three designation arms are a UNION, and deletion says which of them still earns its place —
 * arm 1 turns **4** rows red, arm 3 turns **8**, **arm 2 turns none**. That is measured by deleting
 * each line in turn, with the probe asserting the line it deleted was an arm: two earlier versions of
 * this measurement reported all-zero because their edit never applied, and a third read 10/0/4 off a
 * narrower arm 3 that has since been reverted. A mutation probe that cannot fail is the same artifact
 * as a test that cannot fail, and this comment has now shipped both.
 *
 *   - ARM 1, the window, reaches straight THROUGH an owner adjacent to the verb. It is the ONLY arm
 *     that does. Its four rows are the block `the 40-character window catches what neither the span
 *     nor the ownership arm can`, and they exist because arm 3 adopts the six pass-1 regression rows
 *     that were previously arm 1's only witnesses — without them, deleting arm 1 is green across the
 *     whole file, which is exactly what it was when this was first measured.
 *   - ARM 2, the span, turns no row red — but it is NOT logically subsumed, and an earlier version of
 *     this comment said it was. `scholarly-gate` supplied the counterexample: arm 3's lookbehind is
 *     not scoped to the region between designation and verb, so `menurut ulama allah menegaskan bahwa
 *     "…"` matches arm 2 and not arm 3. Subsumed on every row in this file, measured; not subsumed as
 *     a property. It is kept for that reason and for the older one — `union, never replacement` is
 *     this file's law, and "provably loses nothing" is the exact reasoning that cost six refusals one
 *     commit ago.
 *   - ARM 3, the ownership test, reaches past ANY owner token that is not adjacent to the verb —
 *     `HUMAN_ROLE` and `AGENT_PRONOUN` alike. Restricting it to the first kind was tried and reverted;
 *     the block above `APPOSITIVE_BREAK` records why.
 */
const DIVINE_ATTR = [
  new RegExp(`\\b(allah|tuhan)\\b[^.!?]{0,40}\\b(${DIVINE_VERB})\\b`),
  new RegExp(`\\b(allah|tuhan)\\b${DIVINE_APPOSITIVE}\\b(${DIVINE_VERB})\\b`),
  new RegExp(`\\b(allah|tuhan)\\b[^.!?]*?${APPOSITIVE_OWNS_VERB}\\b(${DIVINE_VERB})\\b`),
  new RegExp(`\\b(dia|ia)\\b[^.!?]{0,40}\\b(${DIVINE_VERB})\\b`),
  /\bfirman(-?\s?nya)?\b/,
  /\b(yang\s+)?artinya\b/,
  /\bterjemahan(-?\s?nya)?\b/,
  /\bbunyinya\b/,
];
/**
 * A human subject owns the quoted words. Tested only on the text IMMEDIATELY BEFORE the quote, so a
 * scholar named at the top of a paragraph cannot license a verse quoted at the bottom of it.
 *
 * The role nouns live in `HUMAN_ROLE` above rather than inline, because `APPOSITIVE_BREAK` needs the
 * same vocabulary and two copies of a list like this drift. The pronouns stay here: they belong to
 * this rule's stand-down, not to the question of who can own a verb.
 */
const HUMAN_ATTR = new RegExp(`\\b(?:${HUMAN_ROLE}|kami|kita|kamu|anda)\\b[^“"]{0,72}$`);
/**
 * Quoted spans, straight or curly, anywhere in the prose. Matched left-to-right so a run of terms —
 * `"musik" atau "alat musik"` — yields two short spans rather than one long one.
 *
 * THE CLOSING QUOTE IS OPTIONAL, and that is not sloppiness. Indonesian and English both put the full
 * stop INSIDE the closing quote (`…bagi mereka.”`); a strictly-paired pattern matched nothing on the
 * first real violation this rule was written for. A span runs from the opening quote to the closing
 * one or to the end of the LINE, whichever comes first — bounded to the line so an unpaired quote
 * cannot swallow the rest of the answer now that this scans the whole prose rather than one sentence.
 *
 * NOT WIDENED TO `«…»` OR `'…'`, deliberately. Guillemets are unattested in this model's Indonesian
 * output (the two in ISA.md are that file's own nesting convention, not prod's bytes), and a single
 * quote is an apostrophe in `wallahu a'lam`, `ta'ala` and `do'a`, so admitting it would open spans
 * inside ordinary words. Widen only on evidence from live prose.
 */
const QUOTED_SPAN_ANY = /[“"]([^”"\n]+)(?:[”"]|$)/gmu;
/** How far from a long quote a citation still reads as belonging to it. */
const ADJACENT_CHARS = 48;

/**
 * A claim that the quote IS God's wording, as opposed to being about it.
 *
 * WHY THIS EXISTS — a live violation, 2026-08-19. Prod shipped, on `apa hukum riba dalam islam dan
 * kenapa dilarang`:
 *
 *     Allah berfirman dalam QS Ali Imran 3:130, "Janganlah kamu memakan riba dengan berlipat ganda."
 *
 * A machine-composed rendering of an ayah, in quotation marks, attributed to Allah, next to the ref
 * — the exact thing ISC-419 prohibits. `wordingShape` returned `clean`, and `DIVINE_ATTR` matches
 * that sentence perfectly. It never got that far: the quote is SEVEN words and
 * `OWN_WORDING_MIN_WORDS` is eight, so the loop `continue`d before any attribution was examined.
 * Adding one word to the same sentence makes it CAUGHT — the entire difference between shipped and
 * blocked was the floor.
 *
 * WHY THE FLOOR IS RIGHT ANYWAY, AND WHY IT MUST NOT SIMPLY BE LOWERED. Its comment says it was set
 * from a distribution: violations at 18, 12 and 11 words, longest benign quote 6. That reasoning was
 * sound and the number was still wrong, because a bound taken from the smallest violation seen so
 * far only holds until a smaller one arrives. Lowering it to 7 would buy one word of margin and
 * re-make the same mistake. The floor's real job is to spare BARE TERMS — `Allah menyebut mereka
 * "munafik"` — and a term is short because it is a term, not because of where the threshold sits.
 *
 * SO THE SPLIT IS BY WHAT THE VERB CLAIMS, NOT BY LENGTH. `berfirman` and the `firman` noun assert
 * *these are the words*; nothing following them is a bare term, and a short one is a more compact
 * forgery, not a safer one. Those bypass the floor. The looser verbs in `DIVINE_ATTR` — `menyebut`,
 * `menggambarkan`, `menjelaskan`, `melarang` — assert only *this is about*, which is where the
 * benign bare term lives, so they keep the floor.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * SCOPE: THIS RULE COVERS THE DIVINE CASE ONLY. That is a decision, not an oversight — Erik's call,
 * 2026-08-19, after three `scholarly-gate` passes and three BLOCKs. Read this before extending it.
 *
 * The divine half above is the violation that was actually MEASURED on prod, and all three passes
 * agree it is sound and costs nothing. Every attempt to extend the same bypass to the Prophet ﷺ in
 * the same commit introduced a NEW defect, each caught only by the next pass:
 *
 *   1. A hand-rolled subject list (`nabi|rasul|rasulullah|beliau|muhammad`) was a strict subset of
 *      `muhammadSubjects`, so `Baginda bersabda`, `Nabiyullah bersabda` and the passive forms walked
 *      through — the wall was built for God and not for the Prophet ﷺ, which this file had already
 *      been burned by twice.
 *   2. Reusing `muhammadSpeechAct` to fix that pulled in its TOPICAL verb stems (`sebut`, `jelas`,
 *      `larang`, `ajar`), because that function serves the RECEIPT rule, where topical verbs are
 *      attributions too. It inverted the seam instead of closing it: `Nabi Muhammad menyebut mereka
 *      "munafik"` refused while the identical sentence about Allah passed.
 *   3. A verbatim-only verb list (`bersabda|menyabdakan|disabdakan`) paired with `muhammadSubjects`
 *      fixed 2, but silently dropped the clause window and other-agent break that live inside
 *      `muhammadSpeechAct` — so subject and verb no longer had to be in the same SENTENCE — and left
 *      seven further verbatim verbs (`berkata`, `mengatakan`, `menuturkan`, `menyampaikan`,
 *      `berpesan`, `mengucapkan`, `bertutur`) uncaught while the comment disclosed only one.
 *
 * Underneath all three is a genuine ambiguity that no amount of machinery resolves: `beliau berkata`
 * is the Prophet ﷺ or a named scholar depending on nothing the sentence contains. Include those
 * verbs and the app refuses to quote scholars; exclude them and seven verbatim prophetic forms pass.
 * That trade needs deciding on its own, not as a rider on a divine-side fix.
 *
 * **The prophetic sub-eight-word seam is therefore OPEN, exactly as it was before this rule existed
 * — this is not a regression, it is a hole declined.** It is caught at eight words and up, by
 * `muhammadSpeechAct` and `PROPHETIC` below, as it always was. There is deliberately NO test
 * asserting the seam passes: a green test pinning a known hole is what let the divine violation ship
 * in the first place, and one of those is enough. It is tracked in ISA.md instead.
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * TWO THINGS THIS RULE ALSO DOES NOT DO, both learned by trying and measuring:
 *
 *   - `berkata` is NOT a divine verbatim verb here, though `DIVINE_ATTR` carries it above the floor.
 *     Under the subject class `dia|ia` it is the commonest reported-speech verb in Indonesian, so it
 *     refused `ia berkata, "aku takut."` — ordinary human speech. `Allah berkata` is not idiomatic
 *     anyway; `berfirman` is the word.
 *   - `artinya` / `terjemahannya` / `bunyinya` are SUBJECT-LESS, so they fired on a gloss of any
 *     ordinary term (`Kata "riba" artinya "tambahan"`). They are out of the bypass entirely, and the
 *     honest reading is that this rule does NOT fix the short-gloss shape. Gating them on
 *     ref-adjacency was tried and rejected: `ADJACENT_CHARS` is 48, so four extra words between the
 *     citation and the gloss defeated it, and a gate a sentence can walk around is worse than a
 *     declined case because it reads as covered. Glosses stay caught at eight words and up.
 *
 * ON THE SCHOLAR FALSE POSITIVES the earlier cuts produced — `Ustadz Muhammad Thalib … beliau
 * berkata, "kaum musyrik."` — be precise, because the first correction was not. That is a guard
 * FALSE POSITIVE, not a rights problem. F-1 (relayed verbally by Erik, `PROGRESS.md` 2026-07-17;
 * there is no `docs/review/` artefact) permits DISPLAYING the Indeks Tematik; it does not reach
 * AI-composed prose that puts quoted words in the author's mouth, and `tanya-ai-request-2026-08-17`
 * separately commits us never to re-render his sentences. Nor is he "the reviewer" — that is Ustadz
 * Ahmad Isrofiel Mardlatillah; the index is authored by Ustadz Muhammad Thalib's team, and he
 * reviewed nothing here. Do not escalate this class as a permission question: that is how the
 * Prophet ﷺ wall gets narrowed under a rights banner.
 *
 * THE SUBJECT REQUIREMENT IS GONE FROM `berfirman`, and dropping it is the fix rather than a
 * shortcut around one. It was `\b(allah|tuhan|dia|ia)\b[^.!?]{0,40}\bberfirman\b`, and the epithet
 * bypass above defeated the window. Widening the window is the third-best answer; deleting it is the
 * best one, because the subject was never carrying weight here. `berfirman` is not a general
 * reported-speech verb the way `berkata` is — Indonesian reserves it for God (the royal usage is
 * archaic and absent from this corpus), so the sentence claims divine speech whether or not a
 * designation happens to sit within some number of characters of it. `firman` beside it has been
 * subject-less since the rule was written, for exactly this reason; the two now agree.
 *
 * THIS RULE's change is a widening — it can only add refusals. **That was NOT true of the commit it
 * arrived in, and the sentence originally claimed it for both halves.** `DIVINE_ATTR`'s first cut
 * swapped its window for the appositive span instead of adding one, and lost six refusals; the arms
 * are now a union and the claim is scoped to the half that earns it. A polarity claim covering a
 * whole commit is the kind that is checked by reading, and reading is what missed it — the paired
 * HEAD-vs-tree probe found it in one run. `DIVINE_ATTR` keeps its subject test because its verbs are
 * ordinary ones.
 */
const VERBATIM_DIVINE = [/\bberfirman\b/, /\bfirman(-?\s?nya)?\b/];

export function wordingShape(prose: string): string | null {
  const text = normaliseForSentences(prose);
  QUOTED_SPAN_ANY.lastIndex = 0;
  for (const m of text.matchAll(QUOTED_SPAN_ANY)) {
    const span = (m[1] ?? "").trim();
    const words = span.split(/\s+/u).filter(Boolean).length;

    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 160), start).toLowerCase();
    const near = `${text.slice(Math.max(0, start - ADJACENT_CHARS), start)} ${text.slice(end, end + ADJACENT_CHARS)}`;

    REF_IN_PROSE.lastIndex = 0;
    const adjacent = REF_IN_PROSE.test(near);
    REF_IN_PROSE.lastIndex = 0;

    // Checked BEFORE the length floor, which is the whole fix. A verbatim claim in front of a quote
    // is not made innocent by the quote being short — a shorter forgery is a more compact one.
    //
    // DIVINE ONLY, deliberately. See the SCOPE block above `VERBATIM_DIVINE` before adding a
    // prophetic clause here; three attempts at one shipped three separate defects.
    if (VERBATIM_DIVINE.some((re) => re.test(before))) return (m[0] ?? "").trim();

    if (words < OWN_WORDING_MIN_WORDS) continue;

    const divine = DIVINE_ATTR.some((re) => re.test(before));
    const prophetic = muhammadSpeechAct(before) || PROPHETIC.some((re) => re.test(before));
    if (divine || prophetic) return (m[0] ?? "").trim();

    if (adjacent && !HUMAN_ATTR.test(before)) return (m[0] ?? "").trim();
  }
  return null;
}

/**
 * A verse as the WALL needs it — every translation we ship for that ayah, not just the one the
 * model was shown.
 *
 * `texts` is plural because of a measurement, not a hunch. The 2026-08-17 QS 17:32 violation scores
 * a contiguous run of **18 words against the COMPANION translation and 2 against the PRIMARY**, and
 * `gatherGrounding` posts `primary ?? companion` — one of them. A wall reading only the posted text
 * would have missed the exact violation that motivated this rule.
 *
 * ⚠ **AND TODAY THE WORKER SUPPLIES EXACTLY ONE, so that gap is OPEN, not closed.** The shape is
 * plural so the wall is ready, but the wire is not: `sanitizeGrounding` rebuilds each item as
 * `{ref, surah_name, text}` and `verifyGrounding` proves it ours by `hash(ref, text)` against a
 * build-time digest. Carrying the companion means adding `hash(ref, companion)` to that digest
 * (`src/app/build-grounding-digest.ts`) and verifying the second field separately — trusting a
 * browser-supplied one would let a caller weaken or trip the wall at will. That is a coherent
 * follow-up with a known design, and it is deliberately NOT half-built here: a partially wired
 * guard is the exact artifact this repo keeps paying for.
 *
 * So, stated as a limit rather than left to be discovered: **a rendering that tracks the COMPANION
 * translation of a verse whose PRIMARY was posted is not caught.** The 17:32 violation is of that
 * shape. What IS caught is a rendering tracking the posted text, which is what shipped live on
 * 2026-08-20.
 */
export interface EchoVerse {
  readonly ref: string;
  readonly texts: readonly string[];
}

/**
 * How many CONTIGUOUS words a sentence may share with a translation we ship before it stops being a
 * description of the ayah and starts being a copy of it.
 *
 * FOUR, and the number is measured rather than chosen. Over five live answered turns (2026-08-20)
 * scored sentence-by-sentence against every posted verse, the highest run in any NON-violating
 * sentence was 3, and the violating sentence scored 5. Against the three production violations this
 * file records: 17:32 scores 18, 2:187 scores 12, and today's 2:261 splice scores 5. Three is the
 * boundary a good answer actually reaches — `Dalam QS Al-Isra 17:23, Allah menetapkan…` runs 3 — so
 * moving this to 3 refuses a real answer that this project has on record as one it wants to keep.
 */
const ECHO_MIN_RUN = 4;

/** Words, lower-cased and stripped of punctuation. No stemming — see `scriptureEchoShape`. */
const echoWords = (s: string): string[] =>
  s.toLowerCase().normalize("NFC").replace(/[^a-z0-9' ]+/gu, " ").split(/\s+/u).filter(Boolean);

/** Longest run of consecutive words appearing in both sequences. */
function sharedRun(a: readonly string[], b: readonly string[]): number {
  let best = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k += 1;
      if (k > best) best = k;
    }
  }
  return best;
}

/**
 * Does any sentence COPY the wording of a translation we ship, rather than describe the ayah?
 *
 * WHY THIS EXISTS ALONGSIDE `wordingShape` AND NOT INSIDE IT. `wordingShape` asks a grammar
 * question — is there an attribution verb or a citation near a QUOTED span — and it is deliberately
 * marker-blind and corpus-blind, taking prose alone. That is exactly why it passed this, live, on
 * 2026-08-20:
 *
 *     "dalam QS Al-Baqarah 2:261, Allah menggambarkan pahala sedekah seperti sebutir biji yang
 *      menumbuhkan tujuh tangkai, dan setiap tangkai berisi seratus biji"
 *
 * `yang menumbuhkan tujuh tangkai` is a verbatim four-word run from the shipped primary and
 * `seratus biji` is verbatim in both, but there is no quotation mark anywhere, so a rule scanning
 * quoted spans has nothing to scan. It is the 2026-08-17 violation's construction — same lead-in,
 * same `menggambarkan` — minus the one feature `wordingShape` keys on.
 *
 * The criterion's own prompt rule already forbids this in words: *"not as a paraphrase presented as
 * the verse's wording"*. This is that clause made enforceable. It is a SECOND opinion beside
 * `wordingShape`, never a replacement — union, never swap (ISC-440), because a swap is not a
 * widening and this project has already lost six refusals to one.
 *
 * NO STEMMER, NO CORPUS, NO FREQUENCY TABLE, and each absence was tested rather than assumed. A
 * stem-based run and a rare-word overlap score were both measured first: sentence-scoped, overlap
 * does NOT separate (a benign closing du'a — *"Semoga Allah memudahkan kita semua untuk berbakti
 * kepada orang tua"* — scores a higher share of QS 19:14's distinctive words than the violation
 * scores of QS 2:261's, because a four-word ayah is easy to cover). Plain contiguous words
 * separate cleanly and need nothing but the two strings.
 *
 * WHAT IT DOES NOT CATCH, stated because a wall's gaps are the part worth writing down:
 *   · A LOOSE paraphrase. The earlier 2026-08-20 form — *"satu biji yang ditanam, lalu tumbuh tujuh
 *     tangkai"* — runs 2 and PASSES. This closes verbatim and near-verbatim copying, not paraphrase;
 *     paraphrase remains the prompt rule's job, and the prompt rule is a request.
 *   · Any ayah not in `verses`. The wall can only compare against text it was handed, so a
 *     rendering of a verse retrieval never returned is invisible here.
 *
 * Returns the offending sentence, or null.
 */
export function scriptureEchoShape(prose: string, verses: readonly EchoVerse[]): string | null {
  if (verses.length === 0) return null;
  for (const raw of prose.split(/(?<=[.!?])\s+/u)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const words = echoWords(sentence);
    if (words.length < ECHO_MIN_RUN) continue;
    for (const v of verses) {
      for (const text of v.texts) {
        if (sharedRun(words, echoWords(text)) >= ECHO_MIN_RUN) return sentence;
      }
    }
  }
  return null;
}

/**
 * Deferral CONSTRUCTIONS — the grammar of handing the question to a human, not a vocabulary of
 * words that appear near one.
 *
 * This started life as a flat word list (`bukan|ustadz|ulama|mufti|fatwa|tergantung|…`) and that
 * list was a hole, not a hedge. Because the test is sentence-scoped, ANY listed word anywhere in the
 * sentence switched the verdict wall off for that whole sentence — and the listed words include the
 * ones that appear in the STRONGEST rulings a model can issue. Measured, not reasoned:
 *
 *     fatwaShape("Perbuatan itu haram")                    → CAUGHT
 *     fatwaShape("Para ulama sepakat perbuatan itu haram") → PASSED   ← `ulama` bought the amnesty
 *     fatwaShape("Menurut fatwa, perbuatan itu haram")     → PASSED   ← `fatwa` bought the amnesty
 *
 * An ijmāʿ claim is not a deferral. It is the most authoritative form a verdict takes, and the old
 * list read it as a disclaimer purely because the word `ulama` was in the sentence.
 *
 * The word list was also load-bearing for nothing: replayed against twelve real answers pulled from
 * the live synthesis edition, disabling the amnesty entirely changed the verdict on 0 of the 11 that
 * shipped. It could only ever let a ruling out; it never once kept a good answer in.
 *
 * So the amnesty now requires the sentence to actually DEFER — first-person inability, an
 * instruction to ask a human, a disavowal of authority, `wallahu a'lam`, or an explicit
 * it-depends — rather than merely to MENTION the people who hold the authority.
 */
const DEFER = [
  /\b(aku|saya|kami)\b[^.!?]{0,48}\b(tidak|tak|bukan|belum)\b[^.!?]{0,32}\b(bisa|dapat|berhak|berwenang|akan)\b/,
  /\b(tanya|tanyakan|bertanya|tanyalah|konsultasi|konsultasikan|rujuk|merujuk|diskusikan)\b[^.!?]{0,48}\b(ustadz|ulama|kiai|kyai|mufti|ahli|guru|orang tua)\b/,
  /\bbukan\s+(seorang\s+)?(fatwa|mufti|ustadz|ulama|ahli)\b/,
  /\bwallahu\s*a'?\s*lam\b/,
  // No `tergantung` clause. An it-depends opener is the one deferral that routinely carries a
  // verdict behind a `tapi` — "Tergantung niat, tapi perbuatan itu haram" — and dropping it closed
  // that hole at a cost of zero: it regressed none of the eleven live answers and none of the
  // compliant-disclaimer cases below.
];

/** Is this sentence deferring the ruling to a human, rather than issuing one? */
const defers = (s: string): boolean => DEFER.some((re) => re.test(s));

/**
 * Is any sentence in the prose shaped like a ruling the app has issued?
 *
 * Sentence-scoped on purpose: hedging one paragraph does not license a bare verdict in the next.
 * Returns the offending sentence fragment, or null.
 */
export function fatwaShape(prose: string): string | null {
  for (const raw of prose.split(/[.!?\n]+/)) {
    const s = raw.toLowerCase();
    if (!s.trim()) continue;
    if (defers(s)) continue;
    const hit = VERDICT.find((re) => re.test(s));
    if (hit) return raw.trim();
  }
  return null;
}

/**
 * Guard an authored answer. `isCitable(ref)` decides whether a "surah:ayah" the model wrote is a
 * legitimate citation — for the live app that is "does this ayah exist in the mushaf"; a test may
 * pass a set membership instead. The Arabic and fatwa rules are unconditional.
 */
export function guardAnswerProse(
  prose: string,
  isCitable: (ref: string) => boolean,
  isGroundedHadith: (id: string) => boolean = () => false,
  /**
   * This turn's grounding verses, with EVERY translation we ship for each — for `scriptureEchoShape`.
   *
   * ⚠ DEFAULTS TO EMPTY, WHICH SILENTLY DISABLES THE ECHO WALL. That is the same shape as the
   * `isGroundedHadith = () => false` default directly above, which is on record in this repo as
   * having made a whole class of hadith check inert at one call site while three others looked
   * fine. It is optional here only because two of the five call sites are OFFLINE EVALS that have
   * no verse text to give it, and a required parameter would have them passing `[]` anyway — the
   * same hole with more ceremony.
   *
   * The live path is policed by a test instead: `answer-guard-echo.test.ts` asserts the Worker
   * forwards real verses, because a wall that quietly receives nothing is indistinguishable from a
   * wall that found nothing.
   */
  scripture: readonly EchoVerse[] = [],
): AnswerGuardResult {
  const violations: AnswerViolation[] = [];

  // Honorifics are stripped before the script test — see HONORIFIC. Everything else in the Arabic
  // ranges is still a hard violation.
  const arabic = ARABIC.exec(prose.replace(HONORIFIC, ""));
  if (arabic) violations.push({ kind: "arabic", detail: arabic[0] });

  const fatwa = fatwaShape(prose);
  if (fatwa) violations.push({ kind: "fatwa", detail: fatwa.slice(0, 80) });

  // The app printing the SOURCE's own words rather than citing them. Checked beside the receipt
  // rules, never instead of them: an answer can satisfy every receipt and still put our Indonesian
  // rendering of a verse next to the official one, which is what shipped on 2026-08-17.
  const wording = wordingShape(prose);
  if (wording) violations.push({ kind: "own_wording", detail: wording.slice(0, 80) });

  // The same rule from the other side — copying the SHIPPED WORDING rather than quoting it. Runs
  // BESIDE `wordingShape` and reports the same `own_wording` kind, because to a reader the failure
  // is identical: the app printed its own rendering of an ayah next to its own card for that ayah.
  // A union, never a replacement: `wordingShape` catches quoted renderings this cannot see (it has
  // no verse text for an ayah retrieval never returned), and this catches unquoted ones that have
  // no attribution grammar for `wordingShape` to find.
  const echo = scriptureEchoShape(prose, scripture);
  if (echo) violations.push({ kind: "own_wording", detail: echo.slice(0, 80) });

  // Two ways to fail the hadith rule, and both must be caught.
  // (a) An attribution to the Prophet ﷺ with no resolvable marker behind it.
  const hadith = hadithShape(prose, isGroundedHadith);
  if (hadith) violations.push({ kind: "bad_hadith", detail: hadith.slice(0, 80) });

  // (b) A marker that does not resolve against this turn's grounding — the hadith analogue of
  //     `bad_ref`. A model that invents "[H:bukhari:99999]" must not reach a renderer.
  for (const m of prose.matchAll(MARKER_IN_PROSE)) {
    const id = markerToId(m[1]!, m[2]!);
    if (!isGroundedHadith(id)) {
      violations.push({ kind: "bad_hadith", detail: m[0] });
      break;
    }
  }

  for (const m of prose.matchAll(REF_IN_PROSE)) {
    const ref = normRef(m[1]!, m[2]!);
    if (!isCitable(ref)) {
      violations.push({ kind: "bad_ref", detail: ref });
      break; // one bad citation is enough to reject the whole answer
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * Return the model's answer only when it clears the wall; otherwise null, so the caller falls back
 * to the principled edition's honest behaviour for this turn.
 */
export function safeAnswer(
  prose: string,
  isCitable: (ref: string) => boolean,
  isGroundedHadith: (id: string) => boolean = () => false,
): string | null {
  const trimmed = prose.trim();
  if (!trimmed) return null;
  return guardAnswerProse(trimmed, isCitable, isGroundedHadith).ok ? trimmed : null;
}

/**
 * Every hadith marker in the prose, in order, de-duped — the renderer's work list.
 *
 * Only call this on prose that has already cleared the guard: an uncleared answer may carry markers
 * that resolve to nothing, and this function does not re-check them.
 */
export const markersInProse = (prose: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of prose.matchAll(MARKER_IN_PROSE)) {
    const id = markerToId(m[1]!, m[2]!);
    if (!seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
};

/**
 * A grounding predicate over the hadith actually retrieved this turn.
 *
 * The turn's grounding ACCUMULATES across every `cari_dalil` call the model makes (PRD decision 13),
 * so build this once from the union at the end of the tool loop — never per call, or a marker from
 * the model's first search would fail to resolve after its second.
 */
export const groundedHadithFrom = (ids: Iterable<string>): ((id: string) => boolean) => {
  const set = new Set<string>(ids);
  return (id: string) => set.has(id);
};

/**
 * Remove every hadith marker from prose, for RENDERING only.
 *
 * The marker is machine plumbing — a receipt the guard checks and the renderer resolves into a card.
 * A reader must never see `[H:muslim:154]` sitting in a sentence. Stripping happens at render time
 * and never before storage, because the stored prose has to stay guardable: a replayed turn is
 * re-checked against the records it was stored with, and a marker-free string cannot be.
 *
 * Swallows one leading space so "…niatnya [H:bukhari:1]." closes up to "…niatnya." rather than
 * leaving a gap before the full stop.
 */
export const stripMarkers = (prose: string): string => prose.replace(/ ?\[H:[a-z][a-z-]*:\d{1,6}\]/g, "");

/** Extract every well-formed "surah:ayah" reference from prose, normalised and de-duped, in order. */
export const refsInProse = (prose: string): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of prose.matchAll(REF_IN_PROSE)) {
    const ref = normRef(m[1]!, m[2]!);
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
};

/** A citable-predicate that accepts only refs in a fixed set (used by tests and eval harnesses). */
export const allowedRefsFrom = (refs: Iterable<string>): ((ref: string) => boolean) => {
  const set = new Set<string>();
  for (const r of refs) {
    const m = /(\d{1,3})\s*[:.]\s*(\d{1,3})/.exec(r);
    if (m) set.add(normRef(m[1]!, m[2]!));
  }
  return (ref: string) => set.has(ref);
};
