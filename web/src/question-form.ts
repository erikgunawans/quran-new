/**
 * Is this a question ASKING something, or a person TELLING us something?
 *
 * The app has two lanes and the feeling lane runs first, on the reasoning that a real feeling must
 * never be hijacked by a topic match. That guard is correct and stays. But it only ever ran in one
 * direction, so the opposite hijack was wide open: 94 words in the feeling lexicon are also
 * subjects the scholar's index covers — `zakat`, `takdir`, `doa`, `taubat`, `ikhlas`, `ghibah`,
 * `riya`, `sedekah` and more.
 *
 * The result was an app that looked like it misheard you. "apa itu zakat" returned 2:261, a verse
 * about the reward of charity, because `zakat` is a Giving keyword — never reaching Ibadah, where
 * the index holds eight entries on it. "apa itu takdir" answered with a consolation verse instead
 * of explaining qadar. Silence would have been better; a confident answer to a question nobody
 * asked is worse than none.
 *
 * So: a question in FACTUAL FORM tries the knowledge lanes first, and still falls through to
 * feelings if they hold nothing. Someone who writes "aku ngerasa takdirku buruk" is telling us
 * something and keeps the feeling lane, because that is not a factual form at all.
 *
 * Deliberately narrow. This only reorders lanes for questions whose SHAPE is unambiguous — asking
 * what something is, who someone is, or what the ruling on something is. Anything else keeps
 * today's behaviour exactly.
 */

/**
 * First person ANYWHERE, not just as an opener.
 *
 * It began as `^(aku|saya|...)` because the shapes below were narrow enough that only an opener
 * could collide. Widening to "kenapa…" broke that: "kenapa aku selalu gagal" is a reasoning SHAPE
 * wrapped around a person talking about themselves, and it must stay in the feeling lane. If the
 * sentence mentions the asker, the asker is the subject.
 */
const PERSONAL = /\b(aku|saya|gue|gua|gw|ane|aq)\b/i;

/**
 * First person carried by the `-ku` POSSESSIVE SUFFIX rather than a standalone pronoun.
 *
 * "kenapa hidupku susah terus ya" names no pronoun at all, yet it is plainly someone talking about
 * their own life — and with "kenapa" now a factual shape, it was about to be routed to the
 * knowledge lanes and answered with silence. Caught by its own regression test.
 *
 * An explicit stem list rather than a `\w+ku` pattern, which would swallow `berlaku`, `perilaku`
 * and `pelaku` — all ordinary words in exactly the ruling questions this must not touch.
 */
const PERSONAL_SUFFIX =
  /\b(hidup|hati|diri|dosa|nasib|badan|jiwa|keluarga|ibu|ayah|orangtua|anak|suami|istri|kerja|masalah|beban|umur|rezeki|iman|amal|usaha|doa|mimpi|hubungan)ku\b/i;

/**
 * Shapes that unambiguously ASK.
 *
 * Both orders matter in Indonesian: "apa itu zina" and "zina itu apa" are the same question, and
 * the postfix form is if anything the more casual one — which is how people actually type.
 */
const FACTUAL: readonly RegExp[] = [
  /\bapa(kah)?\s+itu\b/i, // apa itu zakat
  /\bitu\s+apa(an)?\b/i, // zakat itu apa
  /\bapa\s+(arti|maksud|makna|pengertian|definisi)\b/i, // apa arti taubat
  /\bapa\s+bedanya\b/i, // apa bedanya iman dan islam
  /\bsiapa(kah)?\b/i, // siapa Allah / Allah itu siapa
  /\bdi\s?mana(kah)?\b/i, // di mana Allah
  /\bkapan(kah)?\b/i, // kapan hari kiamat
  /\bberapa\b/i, // berapa rakaat
  /\bhukum(nya)?\b/i, // hukum X / X hukumnya apa
  /\bhalal\s+atau\s+haram\b/i,
  /\b(boleh|dilarang|wajib|haram)\s?(kah)?\b.*\?/i, // boleh ga sih ...?
  /\bdalil\b/i,
  // ── Erik's 2026-07-22 set exposed these. All were being answered by the feeling lane, which
  // matched a keyword and returned a consolation verse: "apa aja yang termasuk dosa besar" got a
  // verse about mercy because it contains `dosa`. Counted as answered; entirely wrong.
  /\b(kenapa|mengapa|knp)\b/i, // kenapa syirik dosa paling parah
  /\bapa\s?(aja|saja)\b/i, // apa aja yang termasuk dosa besar
  /\bbeda(nya|kah)?\b/i, // beda takdir mubram sama muallaq
  /\bapakah\b/i, // apakah dosa besar bisa diampuni
  /\b(sebutkan|jelaskan|uraikan|urutin|urutkan)\b/i, // sebutkan rukun islam yang 5
  /\bterm?asuk\b/i, // yang termasuk kategori ...
  /\bkeutamaan\b/i, // keutamaan membaca ayat kursi
  // Colloquial yes/no RULING questions — "tetep dosa ngga?", "sah atau ngga ya?". These carry no
  // question word at all, so nothing above caught them, and they landed in the feeling lane: a
  // question about whether chatting is sinful was answered with a verse about God's mercy.
  /\b(dosa|boleh|haram|halal|wajib|sah|batal|makruh)\s+(ngga|nggak|nga|gak|ga|kah|atau)\b/i,
  /\b(sah|batal|dosa)\s+(atau|apa)\s+(ngga|nggak|gak|ga|tidak)\b/i,
];

/**
 * True when the question's SHAPE is a request for information rather than a statement of feeling.
 *
 * A first-person opener always wins: "aku bingung sama takdir" is someone struggling, even though
 * it names a subject the index covers. The feeling lane owns that sentence.
 */
/**
 * How-to shapes: factual, but a pastoral answer can still be RIGHT.
 *
 * Split out of FACTUAL after "gimana cara berbakti sama orang tua" regressed from two well-chosen
 * verses on honouring parents to nothing at all. "How do I do X" often has a legitimate answer in
 * scripture; "which things count as X" does not. So these prefer the knowledge lanes but may still
 * fall through, while the shapes above may not.
 */
const HOW_TO: readonly RegExp[] = [
  /\bcara(nya)?\s+\w/i, // cara wudhu, bagaimana caranya sholat
  /\bgimana\b/i,
  /\bbagaimana\b/i,
];

/** True when the question's SHAPE asks for information rather than states a feeling. */
export function looksFactual(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  if (PERSONAL.test(q) || PERSONAL_SUFFIX.test(q)) return false;
  return FACTUAL.some((re) => re.test(q)) || HOW_TO.some((re) => re.test(q));
}

/**
 * True when a feeling-lane answer would be WRONG rather than merely second-best.
 *
 * "apa aja yang termasuk dosa besar" answered with a verse about mercy is confidently wrong; that
 * question must end in a pointer or silence instead. A how-to question is not in that category, so
 * it is excluded here and keeps its fall-through.
 */
export function knowledgeOnly(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  if (PERSONAL.test(q) || PERSONAL_SUFFIX.test(q)) return false;
  return FACTUAL.some((re) => re.test(q));
}

/**
 * ENUMERATION-COUNT shapes: "how many X are there" — where the answer is a total the mushaf does
 * not state in a single ayah (the figures come from hadith, e.g. the number of prophets/messengers).
 *
 * The fallback used to keyword-match these to the nearest Indeks Tematik topic and dump its entries:
 * "ada berapa jumlah nabi dan rasul" landed on the topic *Muhammad* (himself a rasul), an answer to
 * a question nobody asked. A list of verse citations can never BE a count, so a count question must
 * never render a topic dump — it gets an honest pointer instead (see COUNT_DEFER / resolveTurn).
 *
 * Deliberately narrow: it keys on the QUANTITY NOUN "jumlah"/"banyak" ("total of a category")
 * co-occurring with "berapa", NOT on "berapa" alone. That is the line between the unbounded total
 * this must catch ("berapa jumlah nabi") and a bounded, answerable list the index handles well
 * ("Rukun Iman ada berapa aja") — the latter carries no "jumlah/banyak" and keeps its current
 * behaviour, as does a specific count like "berapa rakaat sholat subuh". A first-person opener always
 * stays in the feeling lane, same as the shapes above.
 */
const COUNT: readonly RegExp[] = [
  /\bberapa\s+(banyak|jumlah)\b/i, // berapa banyak nabi, berapa jumlah rasul
  /\b(jumlah|banyak)\b[^?]*\bberapa\b/i, // jumlah nabi itu berapa
  /\bberapa\b[^?]*\b(jumlah|banyak)\b/i, // ada berapa sih jumlah nabi dan rasul
  /\bberapa\s+jumlahnya\b/i, // nabi berapa jumlahnya
];

export function looksLikeCount(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  if (PERSONAL.test(q) || PERSONAL_SUFFIX.test(q)) return false;
  return COUNT.some((re) => re.test(q));
}
