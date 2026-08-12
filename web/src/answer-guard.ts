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

export type AnswerViolationKind = "arabic" | "bad_ref" | "fatwa" | "bad_hadith";

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
    if (!PROPHETIC.some((re) => re.test(s))) continue;
    // A marker in THIS sentence, resolving against THIS turn's grounding, is the receipt.
    const markers = [...raw.matchAll(MARKER_IN_PROSE)];
    if (markers.some((m) => isGrounded(markerToId(m[1]!, m[2]!)))) continue;
    return raw.trim();
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
): AnswerGuardResult {
  const violations: AnswerViolation[] = [];

  // Honorifics are stripped before the script test — see HONORIFIC. Everything else in the Arabic
  // ranges is still a hard violation.
  const arabic = ARABIC.exec(prose.replace(HONORIFIC, ""));
  if (arabic) violations.push({ kind: "arabic", detail: arabic[0] });

  const fatwa = fatwaShape(prose);
  if (fatwa) violations.push({ kind: "fatwa", detail: fatwa.slice(0, 80) });

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
