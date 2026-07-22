/**
 * The chat's knowledge path — grounded, sourced answers for topic/theology questions.
 *
 * WHY THIS EXISTS. The app answers by FEELING and, correctly, goes silent on a knowledge question
 * ("siapakah Allah?") rather than dress a random verse as an answer. But silence is not the most
 * helpful thing we can honestly do: our KB holds Ustadz Muhammad Thalib's Indeks Tematik — 2,451
 * verbatim, verse-cited statements across 13 topics ("Allah" alone has 329). For a topic question
 * we can SURFACE the scholar's own entries, cited, instead of nothing.
 *
 * THE BRIGHT LINE (Phase A). This path AUTHORS NOTHING. It matches the question to a topic, ranks
 * the scholar's entries by word overlap, and shows them verbatim with their verse links — the exact
 * material the Peta pages show, under the exact same attribution. No model, no synthesis, no
 * theology in the app's own voice. A later Phase B may thread these sourced entries into a
 * structured answer, but only behind a guard + an offline eval + the ustadz's review.
 *
 * ROUTING. It runs ONLY as a fallback after the feeling path finds nothing (main.ts), so a real
 * feeling is never hijacked into a topic dump. Unknown topic → null → the honest silence stands.
 */
import { loadCategory, loadIndex, type PetaIndex } from "./peta.ts";
import { isFeelingWord, norm, phraseHit, questionForms } from "./retrieve.ts";
export { FRAME, QUESTION_FRAME, STOP } from "./topic-words.ts";
import { FRAME, QUESTION_FRAME, STOP } from "./topic-words.ts";
import { TOPIC_SLUGS, TOPIC_SUBJECTS } from "./topic-subjects.ts";

/**
 * Question keywords → Peta category slug. Deliberately CONSERVATIVE: a topic must be named fairly
 * explicitly. Multi-word aliases match as a phrase; single words match whole-word (so "ilah" does
 * not fire inside "keadilan"). Aliases that collide with feeling keywords (doa, dosa, keluarga,
 * uang) are safe because the feeling path runs first — this only sees questions feelings missed.
 */
const TOPIC_ALIASES: Record<string, readonly string[]> = {
  "allah-subhanahu-wa-ta-ala": ["allah", "tuhan", "gusti allah", "rabb", "pencipta", "khalik", "khaliq"],
  "muhammad-shallallahu-alaihi-wasallam": ["muhammad", "nabi", "rasul", "rasulullah", "utusan allah"],
  "al-qur-an-taurat-injil-dan-zabur": ["quran", "qur an", "alquran", "al quran", "kitab suci", "taurat", "injil", "zabur", "wahyu", "mushaf"],
  ibadah: ["ibadah", "sholat", "shalat", "salat", "puasa", "zakat", "haji", "umroh", "umrah", "wudhu", "sujud",
    "ngaji", "mengaji", "tarawih", "taraweh", "witir", "tahajud", "dzikir", "zikir", "khusyuk", "khusyu", "sedekah", "adzan", "azan"],
  // "boleh" and friends matter as much as "hukum" here. Asked "pacaran itu HARAM atau nggak?" the
  // app matched this topic and offered the scholar's section; asked "pacaran itu BOLEH ga sih?" —
  // the same question in the way people actually type it — it matched nothing and fell to blank
  // silence. The casual phrasing deserves the same honest pointer as the formal one. None of these
  // make the app ANSWER a ruling; they route it to Ustadz Thalib's own material instead of nowhere.
  "perintah-dan-larangan": [
    "perintah", "larangan", "hukum", "halal", "haram", "wajib", "sunnah", "makruh", "mubah",
    "syariat", "syari at", "boleh", "gak boleh", "ga boleh", "nggak boleh", "bolehkah",
    "berdosa", "dosa ga", "dosa gak", "dilarang", "diperbolehkah", "diperbolehkan",
  ],
  "hijrah-jihad-dan-perang": ["hijrah", "jihad", "perang", "berperang"],
  "rahasia-kejiwaan-manusia-dalam-al-qur-an": ["jiwa", "kejiwaan", "psikologi", "nafsu", "mental", "kepribadian"],
  "prinsip-prinsip-pendidikan-islam": ["pendidikan", "mendidik", "pengajaran", "ilmu", "guru", "murid", "belajar"],
  keluarga: ["keluarga", "pernikahan", "menikah", "poligami", "warisan", "perceraian", "mertua", "menantu", "ipar", "jodoh", "rumah tangga", "nafkah"],
  sosial: ["sosial", "masyarakat", "tetangga", "bermasyarakat", "gotong royong"],
  "ekonomi-islam": ["ekonomi", "riba", "jual beli", "perdagangan", "dagang", "harta", "bisnis", "muamalah",
    "pinjol", "pinjaman online", "bunga bank", "kredit", "investasi", "saham", "kripto", "crypto", "asuransi", "gadai"],
  "membangun-pribadi-shalih": ["akhlak", "karakter", "pribadi shalih", "adab", "budi pekerti",
    "jadi orang baik", "pribadi yang baik", "pribadi yang lebih baik", "jadi pribadi",
    "memperbaiki diri", "jadi lebih baik", "sifat baik"],
  "karakteristik-negara-bersyari-ah": ["negara", "syariah", "pemerintahan", "khilafah", "politik", "pemimpin", "hukum islam"],
};


const MAX_ENTRIES = 8;

/**
 * Sense disambiguation for words that mean two different things in Islamic vocabulary.
 *
 * The case that shipped: asked "pacaran itu haram atau nggak?" the app surfaced eleven entries about
 * warfare during the SACRED months — because `haram` means both *forbidden* (the ruling the asker
 * meant) and *sacred/inviolable* (Masjidil Haram, the sacred months). Word-set overlap cannot see the
 * difference; a collocation can.
 *
 * Each listed phrase pins the OTHER sense. If a word's only occurrences in an entry sit inside one of
 * its phrases, the entry does not really contain that word in the asker's sense and must not score.
 *
 * This is a LINGUISTIC judgment ("Masjidil Haram is a place name"), never a theological one — it
 * changes which of the scholar's entries we surface, never a word he wrote.
 */
const SENSE_COLLOCATIONS: Record<string, readonly string[]> = {
  haram: ["masjidil haram", "masjid haram", "bulan haram", "bulan bulan haram", "tanah haram", "al haram"],
};

/** Normalised word list — the same tokenisation the ranking uses. */
const wordsOf = (s: string): string[] => norm(s).split(/[\s-]+/).filter(Boolean);

/**
 * Does the entry contain `w` in its own right, rather than only inside a phrase that carries the
 * other sense? Words with no registered collocations always pass — this narrows nothing by default.
 */
function hasOwnSense(entryText: string, w: string): boolean {
  const collocations = SENSE_COLLOCATIONS[w];
  if (!collocations) return true;
  let t = ` ${wordsOf(entryText).join(" ")} `;
  for (const c of collocations) {
    const phrase = ` ${wordsOf(c).join(" ")} `;
    while (t.includes(phrase)) t = t.replace(phrase, " ");
  }
  return t.split(" ").filter(Boolean).includes(w);
}

export interface KnowledgeEntry {
  /** The scholar's statement, byte-identical to the published index — never reworded. */
  readonly text: string;
  /** The scholar's own display reference, e.g. "QS. Al-Ikhlas, 112:1". */
  readonly ref: string;
  readonly surah: number;
  readonly ayah: number;
  /** False for refs the index cites that are not in the mushaf — shown, cited, but not linked. */
  readonly resolvable: boolean;
  readonly subtopic: string | null;
}

export interface KnowledgeAnswer {
  readonly slug: string;
  readonly category: string;
  readonly totalEntries: number;
  readonly source: PetaIndex["source"];
  readonly entries: readonly KnowledgeEntry[];
}

/** Shortest token that may stand in for a longer one. Below this, prefixes are particles. */
const MIN_STEM = 4;

/**
 * Does an asked word reach a written one?
 *
 * Exact, or the ASKED word being a prefix of the WRITTEN one — "homo" reaches "homoseksual". The
 * index is written in formal vocabulary while people ask in clipped casual forms, so requiring
 * identical tokens meant the index could hold a subject and still be unreachable by the word
 * anyone would actually type.
 *
 * ONE DIRECTION ONLY, and the asymmetry is load-bearing. Allowing the written word to be the
 * shorter one let "mendengarkan" reach "mendengar", which surfaced entries for
 * "hukum mendengarkan musik" — a question whose actual subject (musik) the index does not cover at
 * all. A verb form reaching a shorter stem is how a frame word starts answering for a missing
 * subject, which knowledge.test.ts pins against precisely because it shipped once before.
 *
 * Prefix, never substring — substring would let "ana" reach "zina".
 */
export function stemReach(asked: string, written: string): boolean {
  if (asked === written) return true;
  return asked.length >= MIN_STEM && written.length > asked.length && written.startsWith(asked);
}

/**
 * The words in a question that could name a SUBJECT the index might cover.
 *
 * Feeling words are excluded, and that exclusion is the load-bearing part. The feeling lane runs
 * first and owns "sedih", "capek", "kangen"; if the topic lane picked them up on the rebound, a
 * person saying they are sad would be handed a chapter of commands and prohibitions. Baseline
 * behaviour is that such questions route NOWHERE, and that is correct, not a gap.
 */
const INTERROGATIVE = new Set<string>([
  "apa", "apakah", "apaan", "siapa", "siapakah", "kenapa", "mengapa", "kapan", "kapankah",
  "mana", "dimana", "kemana", "bagaimana", "gimana", "gmn", "bagaimanakah", "berapa", "adakah",
  "boleh", "bolehkah", "harus", "haruskah", "itu", "yang",
]);

function subjectWordsOf(q: string): string[] {
  return norm(q)
    .split(/[\s-]+/)
    .filter(
      (w) =>
        w.length >= MIN_STEM &&
        !STOP.has(w) &&
        !FRAME.has(w) &&
        !QUESTION_FRAME.has(w) &&
        // Interrogatives name the SHAPE of a question, never its subject. "bagaimana" occurs in
        // plenty of entry texts, so without this it routed "bagaimana cara sholat" away from
        // Ibadah and into whichever category happened to use the word most.
        !INTERROGATIVE.has(w) &&
        !isFeelingWord(w),
    );
}

/**
 * Alias words that name the KIND of question rather than its subject.
 *
 * These are the ruling vocabulary — halal/haram/wajib/boleh and friends — which is essentially the
 * whole alias list of `perintah-dan-larangan`. That category answers "what is the ruling on X",
 * so matching it tells us the question's SHAPE and nothing about X. `ibadah` is the contrast: its
 * aliases ("sholat", "puasa", "zakat") are real subjects, so a hit there is grounded and must not
 * be second-guessed.
 */
const FRAME_ALIAS = new Set<string>([
  "perintah", "larangan", "hukum", "halal", "haram", "wajib", "sunnah", "makruh", "mubah",
  "syariat", "syari at", "boleh", "gak boleh", "ga boleh", "nggak boleh", "bolehkah",
  "berdosa", "dosa ga", "dosa gak", "dilarang", "diperbolehkah", "diperbolehkan",
]);

/** Categories whose entries actually contain this word, strongest first. */
function categoriesContaining(w: string): readonly string[] {
  const direct = TOPIC_SUBJECTS[w];
  const slots =
    direct ?? TOPIC_SUBJECTS[Object.keys(TOPIC_SUBJECTS).find((k) => stemReach(w, k)) ?? ""];
  return (slots ?? []).map((i) => TOPIC_SLUGS[i]).filter((x): x is string => x !== undefined);
}

/** Match a question to a single topic. Returns the highest-scoring category slug, or null. */
export function matchTopic(question: string): string | null {
  const q = norm(question);
  if (!q) return null;


  // Split on hyphens too, so "al-quran" yields the whole word "quran" for the alias match.
  const forms = questionForms(q);
  let best: { slug: string; score: number; grounded: boolean } | null = null;
  for (const [slug, aliases] of Object.entries(TOPIC_ALIASES)) {
    let score = 0;
    // Did this category match on a real subject term, or only on ruling vocabulary?
    let grounded = false;
    for (const a of aliases) {
      // Same matcher the theme lexicon uses. This used to be whole-word-only, so "hukumnya",
      // "sholatnya" and "zakatku" matched no topic while their bare forms did — the app quietly
      // required people to strip their own suffixes. Multi-word aliases are space-bounded rather
      // than raw substrings, for the reason documented on phraseHit.
      if (a.includes(" ") ? phraseHit(` ${q} `, a) : forms.has(a)) {
        score += 1;
        if (!FRAME_ALIAS.has(a)) grounded = true;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { slug, score, grounded };
  }

  /**
   * Subject correction.
   *
   * Alias scoring above matches how a question is FRAMED. That is usually right, and it stays the
   * primary route. But "homo itu hukumnya apa sih di islam?" scored on `hukum` and `larangan`,
   * landed on Perintah dan Larangan's 626 entries, and pointed there confidently — while the entry
   * it wanted ("Homoseksual", QS 7:80) sat in Membangun Pribadi Shalih, a category the router never
   * considered. The index HELD the answer and the router could not reach it.
   *
   * So the alias result is kept UNLESS the question names a subject that the chosen category does
   * not contain and some other category does. Deliberately narrow: it only fires where the alias
   * route is demonstrably wrong, so every question that already routed correctly still does.
   */
  // A grounded alias hit is curation naming the subject outright — never overridden. "bagaimana
  // cara sholat" matches `ibadah` on "sholat" itself; the fact that Ibadah's entry TEXTS happen to
  // spell it differently is not evidence the route is wrong.
  if (best?.grounded) return best.slug;

  /**
   * Correct only when EVERY subject word is covered somewhere.
   *
   * The conservative half of the rule, and it is what keeps the fix from becoming the bug it
   * replaced. "hukum mendengarkan musik" has two subject words: `mendengarkan`, which the index
   * uses freely (about listening to the Qur'an), and `musik`, which it does not cover at all.
   * Correcting on the covered word alone would route a question about music into a chapter about
   * scripture and answer confidently about the wrong thing — the exact failure knowledge.test.ts
   * pins, because it shipped once already.
   *
   * If any named subject is absent from the whole index, we do not know enough to overrule the
   * alias, and silence remains the honest outcome.
   */
  const subjects = subjectWordsOf(q);
  const coverage = subjects.map((w) => ({ w, holders: categoriesContaining(w) }));
  if (coverage.length > 0 && coverage.every((c) => c.holders.length > 0)) {
    for (const { holders } of coverage) {
      if (best && holders.includes(best.slug)) return best.slug; // alias category has it — keep
    }
    const holder = coverage[0]?.holders[0];
    if (holder) return holder;
  }

  return best?.slug ?? null;
}

/**
 * Surface the scholar's entries for the question's topic. Ranks entries by content-word overlap; a
 * broad question (no overlap) simply takes the leading entries — the whole category is on-topic. All
 * text is verbatim; all attribution rides with it (the caller renders source + derivative note).
 */
export async function retrieveKnowledge(question: string): Promise<KnowledgeAnswer | null> {
  const slug = matchTopic(question);
  if (!slug) return null;

  let index: PetaIndex;
  let shard: Awaited<ReturnType<typeof loadCategory>>;
  try {
    [index, shard] = await Promise.all([loadIndex(), loadCategory(slug)]);
  } catch {
    return null; // a failed fetch must never take the chat down — the honest silence stands
  }
  const meta = index.categories.find((c) => c.slug === slug);
  if (!meta) return null;

  // Discriminating words only. Drop stopwords AND the category's OWN name words: "allah" matches
  // nearly every entry in the Allah category, so it's noise — ranking on it just returns arbitrary
  // leading entries, which for a definitional question ("who is Allah?") reads as a tone-deaf non
  // sequitur. A specific word ("riba" in Ekonomi) is not a category name, so it stays as real signal.
  const nameWords = new Set(norm(meta.category).split(/[\s-]+/).filter(Boolean));
  const qWords = new Set(
    [...norm(question).split(/[\s-]+/)].filter(
      (w) => w.length > 2 && !STOP.has(w) && !FRAME.has(w) && !nameWords.has(w),
    ),
  );

  /**
   * The words carrying what the question is ABOUT, as opposed to what kind of question it is.
   *
   * "hukum pacaran dalam islam" → {pacaran}. The index holds nothing on pacaran, so every entry that
   * scored did so on `hukum` alone and is about qishas or jahiliyah — six verses on following the law
   * of the Jahiliyyah, handed to someone asking about dating. In the synthesis edition those six were
   * the model's ONLY grounding, and it duly padded the gap from its own knowledge (koridor syariat,
   * khitbah) — claims the guard is structurally blind to, since they carry no citation at all.
   *
   * When the question has no subject beyond its frame ("apa hukumnya?"), the frame IS all we have and
   * suppressing it would be worse than useless — so `subjectWords` is empty there and the frame word
   * scores normally. The rule only bites when a subject exists and the index simply does not cover it.
   */
  const subjectWords = new Set([...qWords].filter((w) => !QUESTION_FRAME.has(w)));

  const matched: { text: string; ref: string; surah: number; ayah: number; resolvable: boolean; subtopic: string | null; score: number }[] = [];
  for (const st of shard.subtopics) {
    for (const e of st.entries) {
      const first = e.refs[0];
      if (!first) continue;
      const words = new Set(norm(e.text).split(/[\s-]+/).filter(Boolean));
      let score = 0;
      let onSubject = false;
      // A hit only counts in the asker's sense — see SENSE_COLLOCATIONS (haram: forbidden vs sacred).
      for (const w of qWords) {
        // Exact first, then the written form this asked word reaches: someone typing "homo" is
        // asking about the entry that says "Homoseksual", and requiring identical tokens meant the
        // index could hold a subject and still be unreachable by the word anyone would type.
        // Sense-checking uses the WRITTEN word, since that is what actually appears in the text.
        const written = words.has(w) ? w : [...words].find((x) => stemReach(w, x));
        if (written === undefined || !hasOwnSense(e.text, written)) continue;
        score += 1;
        // …and a hit on the question's FRAME is not a hit on its subject. See subjectWords.
        if (!subjectWords.size || !QUESTION_FRAME.has(w)) onSubject = true;
      }
      // ONLY genuinely-matching entries, and only ones that matched the SUBJECT. No overlap → we
      // surface nothing and let the render point to the topic instead of faking an answer.
      if (score > 0 && onSubject) matched.push({ text: e.text, ref: e.ref, surah: first.surah, ayah: first.ayah, resolvable: first.resolvable, subtopic: st.subtopic, score });
    }
  }
  matched.sort((a, b) => b.score - a.score);
  const entries = matched.slice(0, MAX_ENTRIES).map((f) => ({
    text: f.text, ref: f.ref, surah: f.surah, ayah: f.ayah, resolvable: f.resolvable, subtopic: f.subtopic,
  }));

  // `entries` may be empty — a BROAD topic question the index has no specific line for. That is a
  // valid answer: the render shows an honest pointer to the topic, never an invented one.
  return { slug, category: meta.category, totalEntries: meta.entries, source: index.source, entries };
}
