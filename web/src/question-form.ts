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

/** First person openers: this person is telling us about themselves, not asking a question. */
const PERSONAL = /^\s*(aku|saya|gue|gua|gw|ane|kami|aq)\b/i;

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
  /\bcara(nya)?\s+\w/i, // cara wudhu, bagaimana caranya sholat
  /\bdalil\b/i,
];

/**
 * True when the question's SHAPE is a request for information rather than a statement of feeling.
 *
 * A first-person opener always wins: "aku bingung sama takdir" is someone struggling, even though
 * it names a subject the index covers. The feeling lane owns that sentence.
 */
export function looksFactual(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  if (PERSONAL.test(q)) return false;
  return FACTUAL.some((re) => re.test(q));
}
