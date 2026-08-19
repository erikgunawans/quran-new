/**
 * The `own_wording` rule — the app writing out the SOURCE's own words instead of citing them.
 *
 * Separate from the other guard suites because it catches a different failure. `bad_hadith` and
 * `bad_ref` ask whether a claim carries a RECEIPT. This rule asks what the app WROTE: an answer can
 * carry a perfectly resolving marker and a real ayah number and still print the app's own Indonesian
 * rendering of the verse or the hadith beside the official one. Both prohibitions existed only in
 * SYNTHESIS_SYSTEM_PROMPT until now, and a prompt rule is a request — measured on prod 2026-08-17,
 * 3 violations across 7 live answers with the rules deployed.
 *
 * THE THRESHOLD IS SET FROM A MEASURED DISTRIBUTION, NOT FROM TASTE. Every quoted span in those 7
 * answers, by word count: 18 and 12 (hadith wording, verbatim), 11 (QS 2:187's wording), 6 (the
 * reader's own imagined voice — benign), then 3, 2, 2, 1, 1, 1 (bare terms — benign). The violations
 * and the benign quotes separate at 8 words with two words of margin under it, and the 6-word case
 * is pinned below as a regression test rather than left to luck.
 */
import { describe, expect, test } from "bun:test";
import { allowedRefsFrom, groundedHadithFrom, guardAnswerProse, safeAnswer, wordingShape } from "./answer-guard.ts";

describe("an ayah's wording, written by the app", () => {
  test("the live 2026-08-17 violation is refused", () => {
    // Shipped to a reader on prod. The app's own translation card for 2:187 rendered directly below
    // this sentence, which is the "two renderings of one ayah on one screen" rule 2 names.
    const prose =
      "Dalam QS Al-Baqarah 2:187, Allah menggambarkan hubungan suami istri sebagai pakaian yang saling menenteramkan — “istri-istri kalian menjadi penenteram bagi kalian, kalian menjadi penenteram bagi mereka.”";
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("the reader's own imagined voice survives", () => {
    // Live prod prose from `kenapa allah menguji orang yang taat`, 6 words. The model is quoting the
    // PERSON, in a sentence that also cites an ayah — the pastoral register depends on this surviving.
    //
    // IT IS NOT THE WORD THRESHOLD THAT SAVES IT, and the first version of this test claimed it was.
    // Mutating the threshold from 8 to 3 left this green: the quote carries a `?`, the sentence
    // splitter breaks there, and no segment ever holds a long span. Kept as a regression pin on the
    // real prose, with the reason corrected — the boundary itself is pinned separately below.
    const prose =
      "Mungkin hatimu bertanya, “Kenapa ya, Allah? Apa yang kurang?” — dan itu wajar, sebagaimana QS Al-Baqarah 2:155 mengingatkan kita.";
    expect(wordingShape(prose)).toBeNull();
  });

  test("terms the sentence is ABOUT survive, however many of them there are", () => {
    // Also live prod prose. Three quoted terms in one citing sentence; naive pairing joined the
    // first closing quote to the second opening one and read 25 characters of prose as a quotation.
    const prose =
      "Tidak ada satu ayat pun yang menyebut kata “musik” atau “alat musik”, dan QS Luqman 31:6 berbicara tentang “lahwal hadits”.";
    expect(wordingShape(prose)).toBeNull();
  });
});

/**
 * The boundary, asserted directly — and REWRITTEN 2026-08-19, because the version that stood here
 * was GREEN while asserting the defect.
 *
 * It read `Allah berfirman “satu dua tiga empat lima enam tujuh”` and asserted `toBeNull()`: seven
 * words after an explicit claim to be quoting God, expected to pass. It did pass, for two sessions,
 * and prod duly shipped `Allah berfirman dalam QS Ali Imran 3:130, "Janganlah kamu memakan riba
 * dengan berlipat ganda."` — seven words, the same shape, an ISC-419 violation in front of a reader.
 * The suite could not catch it because the suite had been taught to expect it.
 *
 * The lesson is about the FIXTURE, not the threshold. To test a length floor you must hold
 * everything else at its most permissive; this fixture instead pinned the floor's behaviour under
 * the one preamble that should defeat it. So the floor is now probed with a TOPICAL verb, which is
 * the case it actually exists to protect, and the verbatim claim gets its own block below.
 */
describe("the eight-word floor, probed where the floor is the only thing deciding", () => {
  // `menyebut` says the sentence is ABOUT the quoted words. That is the bare-term case the floor
  // exists for, and the only preamble under which length is genuinely the deciding variable.
  const around = (quote: string) => `Seperti disebut dalam QS Al-Baqarah 2:155, Allah menyebut “${quote}” kepada kita semua`;

  test("seven words is a phrase, and passes", () => {
    expect(wordingShape(around("satu dua tiga empat lima enam tujuh"))).toBeNull();
  });

  test("eight words is a quotation, and is refused", () => {
    expect(wordingShape(around("satu dua tiga empat lima enam tujuh delapan"))).not.toBeNull();
  });
});

/**
 * A verbatim claim defeats the floor at ANY length.
 *
 * These are the tests the shipped violation should have had. Each asserts the same thing from a
 * different direction: once a sentence says *these are the words*, how few of them there are stops
 * being evidence of innocence — a short forgery is a compact one, not a safer one.
 */
describe("a verbatim claim is not made innocent by being short", () => {
  test("the live 2026-08-19 riba violation is refused", () => {
    const prose =
      'Allah berfirman dalam QS Ali Imran 3:130, "Janganlah kamu memakan riba dengan berlipat ganda." Ini bukan hanya soal jumlah yang besar.';
    expect(wordingShape(prose)).not.toBeNull();
  });

  /**
   * THE PROPHETIC HALF IS NOT COVERED BY THIS RULE, and that is Erik's decision of 2026-08-19 after
   * three `scholarly-gate` BLOCKs — see the SCOPE block in `answer-guard.ts`. Three attempts to
   * extend the bypass to the Prophet ﷺ each shipped a different defect: a subject list narrower than
   * `muhammadSubjects`; then `muhammadSpeechAct`, which dragged in its topical verbs and inverted
   * the seam; then a verbatim verb list that silently lost the clause window and disclosed one
   * uncaught verb when there were eight.
   *
   * **There is intentionally no test here asserting that a short prophetic wording PASSES.** A green
   * test pinning a known hole is exactly what let the divine violation ship — this file opens with
   * that story — and adding a second one to record the decision would repeat it. The gap lives in
   * ISA.md, where an open item cannot be mistaken for a satisfied assertion.
   *
   * What stays asserted is the part that did not change: at eight words and up the prophetic wall is
   * `muhammadSpeechAct` + `PROPHETIC`, untouched by any of this, and the block further down still
   * covers it.
   */

  test("three words after `berfirman` is still refused", () => {
    expect(wordingShape('Allah berfirman, "Bertakwalah kepada Allah."')).not.toBeNull();
  });

  /**
   * THE COST CHECK — and BOTH gate passes blocked on this, for different halves.
   *
   * Pass 1: the comment claimed the change "costs nothing that the 8-word floor was protecting".
   * That was a claim, not a measurement, and six benign strings had flipped to REFUSE — `berkata`
   * under `dia|ia` is ordinary reported speech, and `artinya`/`terjemahannya` are subject-less so
   * they fired on a gloss of any term.
   *
   * Pass 2: the CORRECTION to pass 1 re-committed the same error on the other half. It routed the
   * prophetic side through `muhammadSpeechAct`, whose verb set carries the topical stems, so eight
   * more benign strings flipped — and the cost check written to catch exactly this contained ZERO
   * prophetic cases, so it stayed green through all eight. The prophetic rows below exist because a
   * cost check that only samples the half you did not break is not a cost check.
   *
   * If any of these goes red, the bypass has grown back into the benign class.
   */
  test.each([
    ['Allah menyebut mereka "munafik" di banyak tempat.', "a bare term under a TOPICAL verb"],
    ['Nabi Muhammad menyebut mereka "munafik" di banyak tempat.', "the SAME sentence about the Prophet ﷺ"],
    ['Nabi menjelaskan makna "sabar" dengan sederhana.', "prophetic + topical verb"],
    ['Beliau melarang perbuatan yang disebut "riba".', "likewise"],
    ['Rasulullah menyebut bulan itu "Ramadan".', "likewise"],
    ['Kata "riba" artinya "tambahan" dalam bahasa Arab.', "a gloss with no reference in view"],
    ['Ada istilah "taqwa", yang artinya "menjaga diri".', "likewise"],
    ['Terjemahannya kira-kira "orang yang bertakwa".', "likewise, subject-less"],
    ['Seorang sahabat datang, ia berkata, "aku takut."', "reported HUMAN speech"],
    ['Banyak orang merasa begitu; ia berkata, "aku sendirian."', "likewise"],
  ])("still passes: %s (%s)", (prose) => {
    expect(wordingShape(prose)).toBeNull();
  });

  /**
   * SCHOLARS QUOTED VIA `beliau` — the cost class that nearly shipped twice, named correctly.
   *
   * The first correction pinned one of these as a KNOWN false positive and explained it as
   * `MUHAMMAD_SUBJECT` matching `muhammad` inside Ustadz Muhammad Thalib's name. **That explanation
   * was wrong**, and the second gate pass falsified it in one line: `beliau` is itself an
   * alternative inside `MUHAMMAD_SUBJECT`, so strings with no `muhammad` token anywhere behaved
   * identically. The real class was every scholar quoted via `beliau` — including Ustadz Ahmad
   * Isrofiel, the actual reviewer. A pin whose stated cause is wrong sends the next person to fix
   * the wrong thing.
   *
   * These now PASS, because the shipped bypass requires a verb reserved for the Prophet ﷺ.
   */
  test.each([
    ['Dalam Indeks Tematik, Ustadz Muhammad Thalib menyebut bab itu "Perintah dan Larangan".', "a real chapter title"],
    ['Ustadz Muhammad Thalib menulis entri itu; beliau berkata, "kaum musyrik."', "the originally-pinned string"],
    ['Imam Nawawi menjelaskan hal itu; beliau berkata, "sabar itu cahaya."', "no `muhammad` token at all"],
    // A fixture must never put an ANSWER in the reviewer's mouth. The row that stood here named the
    // real reviewer and had him reply to our letter granting permission. He has not replied, and
    // both sent letters say categorically that nothing may be recorded as answered until he does.
    // No reader could ever have seen it — `wordingShape`'s return reaches `violations[].detail` and
    // nothing consumes `.detail` — so it was a record injury rather than a shipped claim. It is
    // still the thing this suite's own subject matter forbids, and it is not reproduced here even
    // to document its removal. A generic scholar carries the test's point without inventing a reply.
    ['Seorang ustadz menjawab surat kami; beliau berkata, "begitulah."', "a scholar, no real name"],
  ])("a scholar quoted via `beliau` is not the Prophet ﷺ: %s (%s)", (prose) => {
    expect(wordingShape(prose)).toBeNull();
  });
});

/**
 * The Prophet's ﷺ wording, written by the app.
 *
 * This half is MARKER-BLIND on purpose, which is what distinguishes it from `bad_hadith`. That rule
 * asks whether an attribution carries a receipt; this one asks what the app printed. Both live prod
 * violations on 2026-08-17 carried a resolving marker — the hadith card rendered underneath — and
 * still put a machine-written Indonesian rendering of the Prophet's words on the reader's screen.
 * The app's public position, including in the letter sent to Ustadz Ahmad, is that it never does.
 */
describe("a hadith's wording, written by the app", () => {
  test("the live `bolehkah perempuan jadi pemimpin` violation is refused", () => {
    const prose =
      "Rasulullah ﷺ bersabda, “Tidak akan beruntung suatu kaum yang menyerahkan urusan mereka kepada seorang perempuan.”";
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("a resolving marker does NOT buy the wording through", () => {
    // The receipt is satisfied here and `hadithShape` is content. The words are still ours.
    const prose =
      "Rasulullah ﷺ bersabda, “Biarkanlah mereka, wahai Abu Bakar, karena setiap kaum memiliki hari raya” [H:bukhari:952].";
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("the compliant shape — the teaching in the app's own words, carried by a marker — passes", () => {
    // This is what rule 7 asks for, and it must remain shippable or the wall costs the app its best
    // hadith answers rather than its worst.
    const prose =
      "Rasulullah ﷺ bersabda bahwa setiap kaum memiliki hari rayanya sendiri, dan hari itu hari raya umat Islam [H:bukhari:952].";
    expect(wordingShape(prose)).toBeNull();
  });
});

/**
 * The rule reaching the wall. `wordingShape` being right is worth nothing until `guardAnswerProse`
 * consults it — the lesson from the hadith cycle, where a correct predicate sat behind a call site
 * that never used it.
 */
describe("the wall consults the rule", () => {
  const allow = (...refs: string[]) => allowedRefsFrom(refs);
  const grounded = (...ids: string[]) => groundedHadithFrom(ids);

  test("the live ayah violation is refused by the wall, under its own kind", () => {
    const prose =
      "Dalam QS Al-Baqarah 2:187, Allah menggambarkan — “istri-istri kalian menjadi penenteram bagi kalian, kalian menjadi penenteram bagi mereka.”";
    const r = guardAnswerProse(prose, allow("2:187"), grounded());
    expect(r.ok).toBe(false);
    expect(r.violations.map((v) => v.kind)).toContain("own_wording");
  });

  test("safeAnswer withholds it, so the turn falls back to principled behaviour", () => {
    const prose =
      "Rasulullah ﷺ bersabda, “Tidak akan beruntung suatu kaum yang menyerahkan urusan mereka kepada seorang perempuan” [H:bukhari:7099].";
    expect(safeAnswer(prose, allow(), grounded("hadith-bukhari-7099"))).toBeNull();
  });

  test("a compliant answer still ships — the wall must cost the bad answers, not the good ones", () => {
    const prose =
      "Rasulullah ﷺ mengingatkan bahwa amal bergantung pada niatnya [H:bukhari:1]. Hal serupa ditegaskan dalam QS Al-Baqarah 2:286.";
    const r = guardAnswerProse(prose, allow("2:286"), grounded("hadith-bukhari-1"));
    expect(r.ok).toBe(true);
  });
});

/**
 * NARROWING, 2026-08-17 (late-4) — measured on prod, after the wall was deployed.
 *
 * The first cut asked only whether the SENTENCE cited an ayah. That is not the same question as
 * whether the QUOTE is scripture, and 24 live turns showed what the difference costs: `bolehkah
 * perempuan jadi pemimpin` was refused 3 of 3, and `apa hukum riba…` 2 of 3. Both are questions whose
 * good answers necessarily quote SCHOLARSHIP at length while citing ayat — and ISA.md names the first
 * of them as one of the two answers "a hard rule would have destroyed". It had destroyed it.
 *
 * Verified by construction before this change: `wordingShape` refused a scholar's position, our own
 * knowledge entry, and the reader's own framing, identically to a hand-written ayah translation. It
 * could not tell them apart, because it never looked at who the words belonged to.
 *
 * So the rule now asks for one of two things a quotation of scripture actually has:
 *   - a DIVINE attribution in the sentence (`Allah berfirman/menggambarkan…`, `firman-Nya`,
 *     `artinya`, `terjemahannya`), or
 *   - ADJACENCY — the quote sits against the citation, which is the bare `"…" (QS 17:32)` shape that
 *     carries no attribution verb at all and is the most common violation of the three recorded.
 * and it stands down when a HUMAN subject owns the quoted words and no divine attribution is present.
 */
describe("scripture's wording vs everyone else's", () => {
  test("bare quote against its citation is still refused — no attribution verb needed", () => {
    // The original ISC-419 evidence. There is no `berfirman` here; the citation IS the claim.
    const prose =
      'Islam menutup jalan menuju zina: “Dan janganlah kamu mendekati zina; sesungguhnya zina itu adalah suatu perbuatan yang keji dan suatu jalan yang buruk.” (QS Al-Isra 17:32)';
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("`yang artinya` still gives it away", () => {
    const prose =
      'Ada ayat dalam QS Luqman 31:6 yang artinya kurang lebih “orang yang membeli ucapan yang melalaikan untuk menyesatkan manusia dari jalan Allah”.';
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("a scholar's position, quoted at length beside an ayah, survives", () => {
    // The shape that took `bolehkah perempuan jadi pemimpin` off prod 3 of 3.
    const prose =
      'Kisah Ratu Saba’ dalam QS An-Naml 27:23 sering dibahas, dan sebagian ulama menyimpulkan bahwa “perempuan boleh memegang kepemimpinan dalam urusan dunia selama ia memenuhi syarat kecakapan”.';
    expect(wordingShape(prose)).toBeNull();
  });

  test("our own knowledge entry, quoted beside an ayah, survives", () => {
    const prose =
      'Tentang QS An-Nisa 4:34, entri kami menjelaskan “laki-laki adalah pemimpin bagi perempuan dalam konteks rumah tangga, bukan larangan mutlak bagi perempuan untuk memimpin”.';
    expect(wordingShape(prose)).toBeNull();
  });

  test("the reader's framing, quoted beside an ayah, survives", () => {
    const prose =
      'Kamu bertanya soal QS An-Nisa 4:34, dan banyak orang membacanya sebagai “perempuan tidak boleh jadi pemimpin sama sekali dalam urusan apa pun”, padahal tidak begitu.';
    expect(wordingShape(prose)).toBeNull();
  });

  test("a human subject does NOT buy amnesty once Allah is named as the speaker", () => {
    // The hole the human-attribution stand-down would otherwise open: attribute to the scholars, then
    // print the verse anyway. Divine attribution outranks the stand-down.
    const prose =
      'Para ulama menyebutkan bahwa dalam QS Al-Isra 17:32 Allah berfirman “dan janganlah kamu mendekati zina, sesungguhnya ia perbuatan keji dan jalan yang buruk”.';
    expect(wordingShape(prose)).not.toBeNull();
  });

  test("the Prophet's own words are untouched by the narrowing", () => {
    const prose =
      'Rasulullah bersabda, “tidaklah seorang muslim tertimpa kelelahan, penyakit, kesedihan, dan kesusahan melainkan Allah menghapus dosanya”.';
    expect(wordingShape(prose)).not.toBeNull();
  });
});

/**
 * AN APPOSITIVE BETWEEN THE SUBJECT AND ITS VERB — hole (a), found by `scholarly-gate` on the commit
 * that shipped the divine bypass, verified live on 2026-08-19, fixed here.
 *
 * `VERBATIM_DIVINE` bound subject to verb inside `[^.!?]{0,40}` and `DIVINE_ATTR` carried the same
 * cap, so one comma-delimited epithet walked the live riba violation straight through AT ANY LENGTH:
 *
 *     Allah, Tuhan semesta alam yang Maha Pengasih dan Maha Penyayang kepada kita, berfirman, "…"
 *
 * Not a sub-eight-word seam — a full bypass, because the appositive is unbounded and the window was
 * not. THE FIX IS NOT A BIGGER NUMBER. This file's own SCOPE block records why: a bound taken from
 * the longest bypass seen so far only holds until a longer one arrives.
 *
 * WHICH ROWS ACTUALLY TEST WHICH ARM — measured by deleting each arm, not asserted. Two arms catch
 * these: subject-less `VERBATIM_DIVINE` takes every `berfirman` row whatever the epithet does, and
 * `DIVINE_ATTR`'s appositive span takes the rest. So the three `berfirman` rows survive the span's
 * deletion and CANNOT detect a re-introduced cap — an earlier version of this comment claimed the
 * long row was exactly that tripwire, and deleting the arm left it green. The `menjelaskan` rows are
 * the arm's only witnesses, which is why there are now two of them at different epithet lengths.
 *
 * The describe name is scoped to the DIVINE VERBATIM claim on purpose: `berfirman` is airtight at any
 * epithet, the loose verbs are not (see the UNDER-REFUSAL limit above `APPOSITIVE_BREAK`).
 */
describe("an appositive cannot walk a divine verbatim claim past the wall", () => {
  const EPITHET = "Tuhan semesta alam yang Maha Pengasih dan Maha Penyayang kepada kita";

  test.each([
    [`Allah, ${EPITHET}, berfirman, "Bertakwalah kalian."`, "two words — below the floor, `berfirman`"],
    [
      `Allah, ${EPITHET}, berfirman dalam QS Ali Imran 3:130, "Janganlah kamu memakan riba dengan berlipat ganda."`,
      "the live riba violation, wearing an epithet",
    ],
    [
      `Allah, ${EPITHET}, menjelaskan, "Janganlah kamu memakan riba dengan berlipat ganda karena itu merugikan sesama."`,
      "above the floor, a looser DIVINE_ATTR verb",
    ],
    [
      `Allah, Tuhan semesta alam, Yang Maha Pengasih lagi Maha Penyayang, Yang menciptakan langit dan bumi beserta segala isinya tanpa sekutu, Yang kepada-Nya kita semua kembali, berfirman, "Bertakwalah kalian."`,
      "an epithet far longer than the fix was tuned against",
    ],
    [
      `Allah, Tuhan semesta alam, Yang Maha Pengasih lagi Maha Penyayang, Yang menciptakan langit dan bumi beserta segala isinya tanpa sekutu, menjelaskan, "Janganlah kamu memakan riba dengan berlipat ganda karena itu merugikan sesama."`,
      "the same long epithet on the arm's OWN verb — this is the cap detector",
    ],
  ])("refused: %s (%s)", (prose) => {
    expect(wordingShape(prose)).not.toBeNull();
  });

  /**
   * THE PAIRED ARM — the rows the first cut of this change BROKE, and the reason it is a union rather
   * than a swap. Each was REFUSED before the appositive span existed and must stay refused after it.
   *
   * They are here because a green suite could not see the loss. `{0,40}` matched straight through an
   * agent pronoun; the span stops at one, so replacing the window silently deleted six refusals — all
   * of them an ayah rendering in quotation marks attributed to Allah, which is the exact object of
   * ISC-419. Found by a HEAD-vs-tree probe on the same strings, not by reading the regex.
   *
   * SIX FLIPPED, AND ALL SIX ARE PINNED. It was five for one correction pass while this comment said
   * six — one regression witness in nobody's suite, disclosed by a count nobody adds up.
   */
  const AYAH_RENDERING = '"Janganlah kamu memakan riba dengan berlipat ganda karena itu merugikan sesama."';

  test.each([
    [`Allah mengajarkan kita lewat ayat ini, lalu menegaskan, ${AYAH_RENDERING}`, "`kita` inside the window"],
    [`Allah memberi mereka peringatan keras, lalu melarang, ${AYAH_RENDERING}`, "`mereka`"],
    [`Allah menegur kalian dalam ayat ini, dan menjelaskan, ${AYAH_RENDERING}`, "`kalian`"],
    [`Allah menuntun kami dengan ayat ini, lalu menyebutkan, ${AYAH_RENDERING}`, "`kami`"],
    // The sixth. It was missing for one pass while the comment said six had flipped and five were
    // pinned — a gap disclosed by a count nobody adds up. `berkata` is the verb the SCOPE block calls
    // the commonest reported-speech verb in Indonesian, so it is the last one to leave unpinned.
    [`Allah mengajarkan kita lewat ayat ini, lalu berkata, ${AYAH_RENDERING}`, "`berkata`, the loosest verb"],
    [`Allah menyayangi kita sebagai hamba-Nya, dan melarang, ${AYAH_RENDERING}`, "idiomatic religious prose"],
  ])("the window still catches what the span cannot: %s (%s)", (prose) => {
    expect(wordingShape(prose)).not.toBeNull();
  });

  /**
   * THE COST CHECK, and its claim is now scoped to what the rows actually reach. The first version of
   * this block asserted it sampled "a divine designation whose speech act belongs to someone else"
   * and sampled no such thing: two rows terminated on `AGENT_PRONOUN` and one had no divine
   * designation at all. A comment that names a class the rows do not enter reads as coverage.
   *
   * Row 4 is the one that matters — a scholar's position quoted beside an ayah, which is ISC-486 —
   * un-marked as of this change, because the arm broke it for bare proper names. The appositive arm's first cut refused it, because `AGENT_PRONOUN` does not know that
   * `imam` can own a verb. `HUMAN_ROLE` does.
   */
  test.each([
    [
      'Allah Maha Mengetahui segala sesuatu, dan kita sering berkata, "aku tidak sanggup menanggung ujian sebesar ini seorang diri."',
      "an agent pronoun ends the span",
    ],
    [
      'Ia menemui gurunya di masjid seusai salat subuh, lalu gurunya berkata, "belajarlah dengan sabar sebab ilmu tidak datang seketika."',
      // NOT "the verb is owned by another" — the code has no such notion here, and the first label
      // said it did. `Ia berkata, "…"` on its own is REFUSED; this passes for one reason only, that
      // the `dia|ia` window does not reach. That is the whole assertion: the pronoun branch keeps its
      // window and the appositive span was not extended to it.
      "the `dia|ia` window, deliberately not widened",
    ],
    [
      'Kami membahas sifat Allah yang Maha Penyayang; seorang ustadz kemudian menjelaskan, "kesabaran adalah pangkal dari setiap kebaikan yang dituntut agama."',
      // NOT "a human role ends the span" — `ustadz` is in `AGENT_PRONOUN` already, so this row would
      // pass with `HUMAN_ROLE` deleted and witnesses nothing about it. Row 4 is the only witness.
      "an agent pronoun ends the span, a designation away",
    ],
    // GENERIC SUBJECT, and that is the second time this block has had to learn it. The row that stood
    // here named Imam Nawawi and put a verbatim fiqh ruling nobody sourced into his mouth — the same
    // class as the hadith qudsi it replaced, one notch down, and the same class the `beliau` block
    // seventeen lines up already forbids. `seorang mufti` exercises `HUMAN_ROLE` identically.
    //
    // The LEAD clause was rewritten too, on a third pass. It read `Riba dilarang karena Allah menutup
    // pintu kezaliman dalam muamalah` — an authored statement of divine MOTIVE with no source, which
    // survived two corrections because attention went each time to the clause after the comma. The
    // fixture only needs a divine designation upstream of a human speaker; it does not need to say
    // anything about why Allah does what He does.
    [
      'Ayat itu menyebut nama Allah pada bagian akhirnya, dan seorang mufti menegaskan bahwa "setiap tambahan yang disyaratkan dalam akad pinjaman termasuk yang dilarang".',
      "ISC-486 — a scholar’s position quoted beside an ayah",
    ],
  ])("still passes: %s (%s)", (prose) => {
    expect(wordingShape(prose)).toBeNull();
  });
});
