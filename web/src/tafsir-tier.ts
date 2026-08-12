/**
 * The THIRD tier: when the Indeks Tematik comes back thin, show the ayah it points at and say —
 * in a named scholar's own words — what that ayah is about.
 *
 * WHY THIS EXISTS. The knowledge lane answers a hukum question with the scholar's index captions
 * and a reference: "QS. An-Nisa, 4:11 →". That is true, sourced, and — when it is one or two lines
 * — dry to the point of being no answer at all. Erik's amendment when this was grilled: *"A bare
 * pointer is not an answer — the reader must be told what the dalil is actually talking about."*
 * The app still never rules and never composes. It quotes.
 *
 * WHAT TIER 3 IS NOT. It does not retrieve. It orients an ayah the previous tiers ALREADY chose.
 * Where they found no ayah, there is nothing here to orient and silence stays correct — `pacaran`
 * is the measured example: it is absent from all 2,451 index entries, and routing it to the zina
 * entries would be the app deciding pacaran IS zina, which is a ruling.
 *
 * ── Why Al-Mukhtasar, and only Al-Mukhtasar, is quoted in the open ──────────────────────────────
 *
 * Measured across all 6,236 shards before a line of this was written, not chosen by taste:
 *
 *   source              lang            coverage        p50 chars   max chars
 *   source:mukhtasar    id (6236/6236)  6236/6236             292       2,976
 *   source:as-saadi     id                    —             ~6,200      39,525  (4:11)
 *   source:ibn-kathir   en (6236/6236)        —            ~10,500      15,225
 *
 * Ibn Kathir is English in EVERY file, and an English tafsir shown to an Indonesian reader is the
 * exact wound this product exists to heal (see `tafsir.ts`). As-Sa'di on 4:11 — the flagship
 * inheritance verse, the very case this tier was built for — is 39,525 characters; quoting it in a
 * chat answer means either an unreadable wall or cutting a scholar mid-sentence, and a truncated
 * quote is no longer verbatim. Al-Mukhtasar is the only source that is Indonesian, present for
 * every single ayah, and bounded small enough to quote WHOLE. That is what makes "verbatim"
 * literally true here rather than aspirational.
 *
 * This tier therefore makes NO ordering claim among the three scholars — the question still open
 * with Ustadz Ahmad ("which tafsir, in what order, for hukum questions"). The full unranked stack
 * stays exactly one tap away inside the verse card's existing lazy disclosure, unchanged.
 *
 * ── Additive, always ───────────────────────────────────────────────────────────────────────────
 *
 * Every path out of this module that is not a complete success returns `""`, and the caller renders
 * precisely what it renders today. Nothing here changes routing, ranking, `TOPIC_ALIASES`,
 * `topic-subjects.ts`, or the feeling-word filter.
 */
import type { KnowledgeAnswer, KnowledgeEntry } from "./knowledge.ts";
import { displayName, loadAyah } from "./quran.ts";
import { loadTafsir, loadTafsirSources } from "./tafsir.ts";
import { fromShard, type VerseCard } from "./verse.ts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const MUKHTASAR_ID = "source:mukhtasar";

/**
 * The thinness cut, picked from the measured distribution rather than guessed.
 *
 * `bun run src/app/probe-tafsir-tier.ts` over 22 hukum-shaped questions: entry counts cluster
 * 0→2 · 1→4 · 2→2 · 3→1 · 4→1 · 5→2 · 6→1 · 7→1 · 8→5. The natural break is at 2/3, and Erik's own
 * originating case — `hukum warisan di islam` — sits at exactly **2**. Above the cut the reader
 * already has a real list of the scholar's lines and does not need a verse card to make sense of it.
 */
export const TIER3_MAX_ENTRIES = 2;

/**
 * Verbatim or nothing — never truncated.
 *
 * The measured maximum across all 6,236 shards is 2,976 characters, which is why Al-Mukhtasar can
 * be quoted whole. But a measurement that happens to hold today is not a guard: the tafsir corpus
 * is a regenerable build artifact, and a rebuild could bring in a passage that no longer fits a
 * chat answer. If that ever happens the tier HOLDS rather than cutting a scholar mid-sentence,
 * because a truncated quote is not a verbatim one and the disclosure above still carries the full
 * text. The cap sits just above the observed max so it can only fire on genuine corpus drift.
 */
export const TIER3_MAX_QUOTE_CHARS = 3000;

/**
 * Marriage-shaped questions are HELD, and this is a review hold with an expiry, not a design rule.
 *
 * The probe caught this and the spec did not. `apa hukum nikah siri` returns ONE entry whose lead
 * ref is QS 4:25 — *"Nikahi budak perempuan dengan izin tuannya"* — an answer the project handoff
 * already records as live and *worse than silence*. It is thin by every measure here, so tier 3
 * would fire on it and promote a one-line caption into a full verse card plus a scholar's tafsir on
 * slavery, presented as the answer to a question about marriage. The feature built to make thin
 * answers honest would have made this app's worst live answer louder and more authoritative.
 *
 * `docs/review/hukum-pin-request-2026-08-12.md` asks Ustadz Ahmad six questions about exactly these
 * nikah ref-lists and has not been sent yet. Until it comes back, marriage questions get today's
 * answer unchanged — which is bad, but no worse, and it stops being bad by fixing the RETRIEVAL,
 * not by amplifying it here.
 *
 * Deliberately narrow. `talak` (lead QS 2:229, the talak verse) and `warisan` (lead QS 4:11, the
 * faraidh verse, confirmed correct on live prod) are both measured-correct and are NOT held —
 * holding them would trade a good answer for silence on no evidence.
 *
 * STEM match, not whole-word, and that distinction was a live bug before it was a comment. The first
 * version of this was `/\b(nikah|nikahi|menikah|pernikahan|kawin|…)\b/` — and Indonesian is
 * agglutinative, so `\bmenikah\b` does not match **menikahi**, the exact word in the QS 4:25 caption
 * this hold exists to keep off the screen. `bolehkah menikahi budak` walked straight through it. It
 * never reached the ayah in the live probe only because `looksFactual` rejected that phrasing
 * upstream — a guard passing because a DIFFERENT guard caught it is not a guard that works.
 * Matching the stem anywhere covers nikah / menikah / menikahi / dinikahi / pernikahan /
 * menikahkan without enumerating an open-ended affix list. `siri` stays word-bounded so it cannot
 * eat `sirih`.
 */
const MARRIAGE_HOLD = /nikah|kawin|mengawin|poligami|\bsiri\b/i;

/**
 * Does tier 3 fire, and on which entry?
 *
 * Returns the entry to orient, or `null` for "leave the answer exactly as it is". Pure and
 * synchronous so the decision can be tested without a network, a DOM, or a corpus.
 */
export function tier3Entry(k: KnowledgeAnswer, question: string): KnowledgeEntry | null {
  if (MARRIAGE_HOLD.test(question)) return null;
  if (k.entries.length > TIER3_MAX_ENTRIES) return null;
  // A ref the index cites but the mushaf does not carry is shown and cited, never linked — and it
  // cannot be loaded either. Take the first entry we can actually stand behind.
  //
  // This one line also settles the ZERO-entry case, which is why there is no separate guard for it.
  // Zero entries is a broad-topic POINTER, not a thin answer — no ayah is in hand, so there is
  // nothing to orient, and `knowledgeHtml` already renders the honest pointer. An explicit
  // `entries.length === 0` check was written here first and then deleted: force-red proved it dead
  // (removing it changed no test and no behaviour, because `find` on an empty array is already
  // `undefined`). A line that reads as a guard while guarding nothing is how the next reader comes
  // to trust a check that isn't there.
  return k.entries.find((e) => e.resolvable) ?? null;
}

/**
 * Render the tier-3 block, or `""`.
 *
 * `""` means "no change": either the tier did not fire, or something failed. A failure here must
 * never surface as an error or an empty box — the knowledge answer above it is complete and true on
 * its own, and this tier is a bonus on top of it.
 *
 * `mount` is INJECTED rather than imported. main.ts's `mount` is `remember(card)` then `verseEl`,
 * and `remember` registers the card in the bounded `onScreen` map the tap-to-act handlers read.
 * Calling `verseEl` directly here would render a card that looks identical and whose buttons do
 * nothing — so the tier borrows the caller's mount and inherits every behaviour a card already has.
 */
export async function tafsirTierHtml(
  k: KnowledgeAnswer,
  question: string,
  mount: (card: VerseCard) => string,
): Promise<string> {
  const entry = tier3Entry(k, question);
  if (!entry) return "";

  try {
    const [verse, passages, voices] = await Promise.all([
      loadAyah(entry.surah, entry.ayah),
      loadTafsir(entry.surah, entry.ayah),
      loadTafsirSources(),
    ]);

    const mukhtasar = passages.find((p) => p.source_id === MUKHTASAR_ID);
    // No Al-Mukhtasar for this ayah, or it came back empty: render nothing rather than a verse card
    // with a heading promising an explanation that isn't there. Measured at 6,236/6,236 present, so
    // this is a guard against future corpus drift, not an expected branch.
    if (!mukhtasar?.text.trim()) return "";
    // It is Indonesian in all 6,236 shards today. If that ever stops being true, hold rather than
    // hand an Indonesian reader English prose under a heading that says "menurut".
    if (mukhtasar.lang !== "id") return "";
    if (mukhtasar.text.length > TIER3_MAX_QUOTE_CHARS) return "";

    const voice = voices.get(MUKHTASAR_ID);
    const title = voice?.name.replace(/\s*—\s*Indonesian$/, "") ?? "Al-Mukhtasar fi at-Tafsir";
    const author = voice?.author ?? "";

    const card = fromShard(verse, entry.surah, displayName(entry.surah));
    card.lazyTafsir = true; // all three scholars, unranked, one tap away — as everywhere else
    card.continueTo = true;

    return (
      `<div class="tier3">` +
      `<p class="said tier3-lead">Entri di atas menunjuk ke <b>${esc(entry.ref)}</b>. Ini ayatnya, dan ini yang dijelaskan seorang mufasir tentang ayat itu — bukan jawaban kami, dan bukan putusan hukum:</p>` +
      mount(card) +
      `<figure class="tier3-tafsir">` +
      `<figcaption class="tier3-who">Menurut <b>${esc(title)}</b>${author ? ` — ${esc(author)}` : ""}</figcaption>` +
      `<blockquote class="tier3-txt">${esc(mukhtasar.text)}</blockquote>` +
      // The non-claim, ON THE GLASS. Printing one mufasir while three sit in a drawer IS a ranking
      // signal to the reader, whatever our reason was — prominence is how a reader reads precedence,
      // and selecting among tafsir is the classical form of tarjih. This app has said it attributes
      // and never adjudicates, so the criterion has to be legible where the choice is made, not
      // filed in a commit message. Rendered as real text for the same reason: a disclaimer that
      // lives in a data field can silently never reach the screen.
      `<p class="tier3-why">Ditampilkan di sini karena ringkas dan tersedia dalam bahasa Indonesia untuk setiap ayat — <b>bukan</b> karena lebih utama dari mufasir lain.</p>` +
      `</figure>` +
      `<p class="tier3-more">Tafsir selengkapnya dari ketiga ulama ada di dalam <b>Tafsir</b> pada kartu ayat di atas.</p>` +
      `</div>`
    );
  } catch {
    // A missing shard, an offline phone, a 500 — the answer above is still complete and true.
    return "";
  }
}
