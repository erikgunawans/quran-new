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
import { loadCategory, loadIndex, type PetaIndex } from "./peta-data.ts";
import { isFeelingWord, norm, phraseHit, questionForms } from "./retrieve.ts";
export { FRAME, QUESTION_FRAME, STOP } from "./topic-words.ts";
import { ACTION_FRAME, FRAME, QUESTION_FRAME, STOP } from "./topic-words.ts";
import { TOPIC_BROAD, TOPIC_SLUGS, TOPIC_SUBJECTS } from "./topic-subjects.ts";
import { vocabularyForms } from "./vocabulary.ts";

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
  // `warisan` is deliberately ABSENT. Keluarga's 40 entries are marriage, talak and parenting;
  // not one mentions inheritance, while the faraidh dalil (4:11, 4:33) sits in Perintah dan
  // Larangan and the HAM framing (2:180) in Karakteristik Negara Bersyari'ah. Listing it here
  // made keluarga score a GROUNDED alias hit, and a grounded hit short-circuits the subject
  // correction below — so "apa itu warisan" and "hukum warisan dalam keluarga" returned zero
  // entries with the answer one shard over. `hukum warisan` only escaped by accident: Perintah
  // dan Larangan tied it on `hukum` and wins the tie on iteration order.
  //
  // The other unheld words here STAY. `poligami`, `jodoh`, `mertua`, `ipar` are covered by no
  // category at all, so this alias is what turns them into a pointer at the Keluarga chapter;
  // dropping them would trade a useful pointer for silence. `perceraian` stays for a second
  // reason — it is also a FEELING word, so with the alias gone it routes nowhere and the pointer
  // becomes silence. Measured both ways before cutting; only `warisan` was a strict upgrade.
  keluarga: ["keluarga", "pernikahan", "menikah", "poligami", "perceraian", "mertua", "menantu", "ipar", "jodoh", "rumah tangga", "nafkah"],
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
 * Does this word name the SHAPE of the question rather than its subject?
 *
 * Two classes, both defined in topic-words.ts: the question-frame NOUNS (`hukum`, `cara`) and the
 * action-frame VERBS (`lakukan`, `membuat`, `masuk`). Used only to decide subject-hood inside a
 * chapter — routing deliberately consults `QUESTION_FRAME` alone, so `subjectWordsOf` and every
 * slug pinned in topic-broad-tier.test.ts are untouched by the verb half.
 */
const isFrameWord = (w: string): boolean => QUESTION_FRAME.has(w) || ACTION_FRAME.has(w);

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
  /**
   * The category this entry was actually collected under — NOT necessarily the answer's `category`.
   *
   * Retrieval reads more than one shard (see retrieveKnowledge), so an answer routed to Perintah dan
   * Larangan can legitimately carry a line the scholar filed under Ibadah. The render says "Ini yang
   * {author} kumpulkan soal {category}", and that sentence is false for a borrowed line unless the
   * line can say where it came from. So the field is required, not optional: an entry that cannot
   * name its own chapter has no business being displayed under someone else's.
   */
  readonly category: string;
  /** Shard slug for `category` — what `#/peta/{slug}` needs to link the borrowed line home. */
  readonly categorySlug: string;
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

export function subjectWordsOf(q: string): string[] {
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

/**
 * Indonesian suffixes that mark a DERIVED form of a word the index may hold bare.
 *
 * Needed because `stemReach` reaches only LONGER written forms, and that asymmetry is deliberate
 * and load-bearing (see its comment). The gap it leaves is real all the same: `sadar` is in the
 * index — one category, maximally discriminating — and a reader typing the ordinary Indonesian
 * `sadari` could not reach it, because the written form is the shorter one.
 *
 * Stripping a suffix is NOT the same permission as reaching any shorter word. `sadari` → `sadar` is
 * one morphological step with a named suffix; the failure `stemReach` guards against
 * (`mendengarkan` sliding down to some shorter stem to answer for a subject the index lacks) is not
 * reachable this way, and the control set proves it: `hukum mendengarkan musik` routes exactly as
 * before, because `musik` is absent from BOTH tiers and still vetoes.
 *
 * MIN_STEM on the remainder is what keeps `-kan` honest: `makan` → `ma` is two letters and refused,
 * while `lakukan` → `laku` stands. Without it every word ending in "kan" would become a verb.
 */
const SUFFIXES = ["kan", "nya", "lah", "an", "i"] as const;

const stemForms = (w: string): string[] => {
  const out = [w];
  for (const s of SUFFIXES) {
    if (!w.endsWith(s)) continue;
    const stem = w.slice(0, -s.length);
    if (stem.length >= MIN_STEM) out.push(stem);
  }
  return out;
};

/**
 * Categories whose entries actually contain this word, strongest first.
 *
 * TWO TIERS. `TOPIC_SUBJECTS` holds the discriminating words and is consulted FIRST and in full, so
 * every question that routes correctly today keeps its answer. `TOPIC_BROAD` holds the 276 words the
 * spread cap rejects — `neraka`, `dosa`, `akhirat`, `surga`, `iman` — which are not noise but the
 * corpus's most central vocabulary, and which the router previously could not see at all. It is
 * read only when the first tier has nothing, so it can add a route and never redirect one.
 *
 * A word found in NEITHER tier is genuinely absent from the corpus ("musik", "pacaran"), and that
 * absence is what the caller's coverage veto is actually about.
 */
/**
 * Both tiers with their key lists built ONCE.
 *
 * `Object.keys` was previously called inside the loop, which was affordable while there was one
 * table and one form per word. With two tables and the stem forms above it became up to four
 * rebuilds of a 2,191-entry array per word, and the 13-category attribution test went from passing
 * to timing out at 5 s — a real cost the suite caught immediately, on a change that altered no
 * behaviour at all.
 */
const TIERS = [
  [TOPIC_SUBJECTS, Object.keys(TOPIC_SUBJECTS)],
  [TOPIC_BROAD, Object.keys(TOPIC_BROAD)],
] as const;

export function categoriesContaining(w: string): readonly string[] {
  // Naming variants first: someone typing `ghibah` is asking about entries written `menggunjing`,
  // and the index only knows the latter. See vocabulary.ts for what may and may not go in there.
  const forms = vocabularyForms(w).flatMap(stemForms);
  for (const [table, keys] of TIERS) {
    for (const form of forms) {
      const slots = table[form] ?? table[keys.find((k) => stemReach(form, k)) ?? ""];
      if (slots) return slots.map((i) => TOPIC_SLUGS[i]).filter((x): x is string => x !== undefined);
    }
  }
  return [];
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
    /**
     * THE SUBJECT WORDS VOTE. This used to be `coverage[0].holders[0]` — the first subject word's
     * strongest category — which made the route depend on WORD ORDER. Asked "apa aja sih yang tidak
     * kita sadari kita lakukan yang bisa membuat kita masuk neraka?", the leading word is `sadari`,
     * which reaches `sadar`: one entry, in Keluarga. The question went to a chapter on family
     * because of a word the asker used only to frame the question, while `neraka` — the actual
     * subject, five categories deep — got no say at all.
     *
     * This is NOT the frequency ranking this index refuses (see build-topic-subjects.ts). It does
     * not count how often a word occurs anywhere; it counts how many of THIS question's own subject
     * words point at each category, which is agreement, not prevalence. Ties keep the earlier word's
     * category, so a one-word question behaves exactly as it did.
     */
    const votes = new Map<string, number>();
    for (const { holders } of coverage) {
      for (const h of holders) votes.set(h, (votes.get(h) ?? 0) + 1);
    }
    let winner: string | undefined;
    let top = 0;
    for (const { holders } of coverage) {
      for (const h of holders) {
        const v = votes.get(h) ?? 0;
        if (v > top) {
          top = v;
          winner = h;
        }
      }
    }
    if (winner) return winner;
  }

  return best?.slug ?? null;
}

/**
 * Curated topic pins — the narrow, reviewed allowlist that overrides ranking.
 *
 * The general path ranks entries by word overlap, which is blind to DIRECTION. "kewajiban anak
 * kepada orang tua" (a child's duty) surfaces verses that merely contain "anak"/"orang tua" as
 * OBJECTS — the parent→child and orphan rules (24:58, 2:220, 2:233, 4:2…) — while the actual answer,
 * 17:23 "Kewajiban anak berbakti pada orang tua", is phrased with "ibu-bapak", scores zero, and is
 * buried. Word overlap cannot see that a question is about the child's obligation, not the child.
 *
 * For well-known topics where ranking fails this way, we PIN the canonical entries by reference.
 * The content stays the scholar's verbatim, attributed index text — we curate only WHICH of his
 * entries answer the topic. That curated ref-list is exactly what the reviewing ustadz signs off on.
 * A pin may span categories (birrul walidain's four entries live in two shards), so assembly loads
 * every shard the pin names and pulls entries by their leading ref.
 */
/** A pinned entry, named by its shard because the SAME verse carries different captions in different
 * categories — 2:83 is "Berbakti kepada ibu-bapak" in perintah-dan-larangan but "Wajib berbuat baik
 * pada anak yatim" in keluarga. The shard disambiguates which of the scholar's captions we mean. */
interface PinRef {
  readonly shard: string;
  readonly surah: number;
  readonly ayah: number;
}
interface TopicPin {
  readonly slug: string;
  readonly category: string;
  /** Phrases that route to this pin; matched space-bounded, like the alias lexicon. */
  readonly triggers: readonly string[];
  /** Canonical entries, in display order. Each names the shard its caption comes from. */
  readonly refs: readonly PinRef[];
}

const TOPIC_PINS: readonly TopicPin[] = [
  {
    slug: "kewajiban-anak-kepada-orang-tua",
    category: "Kewajiban anak kepada orang tua",
    triggers: [
      "kewajiban anak kepada orang tua", "kewajiban anak pada orang tua",
      "kewajiban anak terhadap orang tua", "kewajiban anak ke orang tua",
      "kewajiban anak sama orang tua", "kewajiban anak buat orang tua",
      "berbakti kepada orang tua", "berbakti pada orang tua", "berbakti ke orang tua",
      "birrul walidain", "durhaka kepada orang tua", "durhaka pada orang tua",
    ],
    refs: [
      { shard: "keluarga", surah: 17, ayah: 23 }, //           Kewajiban anak berbakti pada orang tua
      { shard: "perintah-dan-larangan", surah: 2, ayah: 83 }, // Berbakti kepada ibu-bapak
      { shard: "perintah-dan-larangan", surah: 29, ayah: 8 }, // the limit — refuse only when pushed to syirik
      { shard: "keluarga", surah: 46, ayah: 15 }, //           Anak usia 40 sadar hutang budi pada orang tua
    ],
  },
];

/** Does the question name a pinned topic? Space-bounded phrase match, like the alias lexicon. */
export function matchPin(question: string): TopicPin | null {
  const q = ` ${norm(question)} `;
  for (const pin of TOPIC_PINS) {
    if (pin.triggers.some((t) => phraseHit(q, t))) return pin;
  }
  return null;
}

/** Assemble a pin into a KnowledgeAnswer: the scholar's verbatim entries, in the curated order. */
async function retrievePinned(pin: TopicPin): Promise<KnowledgeAnswer | null> {
  const shardNames = [...new Set(pin.refs.map((r) => r.shard))];
  let index: PetaIndex;
  let shards: Awaited<ReturnType<typeof loadCategory>>[];
  try {
    const loaded = await Promise.all([loadIndex(), ...shardNames.map((s) => loadCategory(s))]);
    index = loaded[0] as PetaIndex;
    shards = loaded.slice(1) as Awaited<ReturnType<typeof loadCategory>>[];
  } catch {
    return null; // a failed fetch keeps the honest silence; it never takes the chat down
  }
  // Index every entry by "shard:surah:ayah" (its LEADING ref) — the shard is part of the key because
  // one verse can carry different captions in different categories, and the pin names which it wants.
  const byRef = new Map<string, KnowledgeEntry>();
  shardNames.forEach((name, i) => {
    // A pin has ALWAYS drawn from several chapters — it is the one path that already crossed shards.
    // Now that entries carry their own category, a pinned line names the chapter it was filed under
    // instead of inheriting the pin's title, which was never quite true for the borrowed ones.
    const poolCategory = index.categories.find((c) => c.slug === name)?.category ?? name;
    for (const st of shards[i]!.subtopics) {
      for (const e of st.entries) {
        const first = e.refs[0];
        if (!first) continue;
        const key = `${name}:${first.surah}:${first.ayah}`;
        if (!byRef.has(key)) {
          byRef.set(key, {
            text: e.text, ref: e.ref, surah: first.surah, ayah: first.ayah,
            resolvable: first.resolvable, subtopic: st.subtopic,
            category: poolCategory, categorySlug: name,
          });
        }
      }
    }
  });
  // Pull the pinned refs in curated order; skip any the index no longer carries rather than fake it.
  const entries = pin.refs
    .map((r) => byRef.get(`${r.shard}:${r.surah}:${r.ayah}`))
    .filter((e): e is KnowledgeEntry => e !== undefined);
  if (entries.length === 0) return null; // pin points at nothing → fall through, do not invent
  return { slug: pin.slug, category: pin.category, totalEntries: entries.length, source: index.source, entries };
}

/**
 * Surface the scholar's entries for the question's topic. A curated pin wins first (ranking is blind
 * to direction); otherwise ranks entries by content-word overlap; a broad question (no overlap)
 * simply takes the leading entries — the whole category is on-topic. All text is verbatim; all
 * attribution rides with it (the caller renders source + derivative note).
 */
export async function retrieveKnowledge(question: string): Promise<KnowledgeAnswer | null> {
  // A reviewed pin overrides the ranker for the handful of topics where overlap surfaces the wrong
  // direction. If the pin matches but its shards fail to load, fall through to general routing.
  const pin = matchPin(question);
  if (pin) {
    const pinned = await retrievePinned(pin);
    if (pinned) return pinned;
  }

  const slug = matchTopic(question);
  if (!slug) return null;

  /**
   * THE CANDIDATE POOL, NOT THE RANKER.
   *
   * Routing picks ONE category and this function used to rank inside it and nowhere else. Measured
   * on the reported neraka question: the index holds NINE entries whose text says `neraka`, spread
   * over five chapters — 4 in Perintah dan Larangan, 2 in Ibadah, and one each in Allah, Membangun
   * Pribadi Shalih and Muhammad. Four were reachable. Five were unreachable at ANY ranking quality,
   * because they were never in the array being sorted. That is a pool defect wearing a ranking
   * defect's clothes, and it is why tuning the ranker kept not fixing it.
   *
   * So we widen the pool by the SUBJECT words — the same ACTION_FRAME distinction the ranking fix
   * established, reused rather than reinvented. `neraka` reaches five chapters and pulls all five;
   * `masuk`, `lakukan` and `membuat` are action frames and pull nothing, which is the whole point:
   * they are how the question is phrased, not what it is about. Measured over a 12-question probe,
   * this loads a median of 1-2 shards and a MAXIMUM of 6 of 13 (`shard-spread.test.ts` pins that
   * number, so a corpus change that blows it up fails a test instead of a page load). Widening on
   * ALL subject words instead of subject-minus-frame measured 9 of 13 — most of the corpus, for
   * words like `masuk` that mean nothing about the topic.
   *
   * Widening the pool does NOT lower the bar for what surfaces: the `score > 0 && onSubject` gate
   * below is unchanged, so a shard with no matching line costs a fetch and contributes nothing.
   */
  const supplementary = [
    ...new Set(subjectWordsOf(question).filter((w) => !isFrameWord(w)).flatMap((w) => categoriesContaining(w))),
  ].filter((s) => s !== slug);

  let index: PetaIndex;
  let shard: Awaited<ReturnType<typeof loadCategory>>;
  // Supplementary shards are best-effort: one that fails to load must not cost us the routed
  // chapter, which is the answer we already had before any of this. Only the PRIMARY load is fatal.
  let extras: { slug: string; shard: Awaited<ReturnType<typeof loadCategory>> }[] = [];
  try {
    const [idx, primary, ...rest] = await Promise.all([
      loadIndex(),
      loadCategory(slug),
      ...supplementary.map((s) => loadCategory(s).then((v) => ({ ok: true as const, s, v })).catch(() => ({ ok: false as const, s, v: null }))),
    ]);
    index = idx as PetaIndex;
    shard = primary as Awaited<ReturnType<typeof loadCategory>>;
    extras = (rest as { ok: boolean; s: string; v: Awaited<ReturnType<typeof loadCategory>> | null }[])
      .filter((r) => r.ok && r.v !== null)
      .map((r) => ({ slug: r.s, shard: r.v! }));
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
  const subjectWords = new Set([...qWords].filter((w) => !isFrameWord(w)));

  const matched: { text: string; ref: string; surah: number; ayah: number; resolvable: boolean; subtopic: string | null; category: string; categorySlug: string; score: number; primary: boolean }[] = [];
  // The routed chapter first, then whatever the subject words reached. `primary` rides along because
  // a tie must not quietly hand a borrowed chapter's line the slot the routed chapter's line held.
  const pools = [{ slug, shard, primary: true }, ...extras.map((x) => ({ slug: x.slug, shard: x.shard, primary: false }))];
  for (const pool of pools) {
   const poolCategory = index.categories.find((c) => c.slug === pool.slug)?.category ?? pool.slug;
   for (const st of pool.shard.subtopics) {
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
        const written = vocabularyForms(w)
          .map((form) => (words.has(form) ? form : [...words].find((x) => stemReach(form, x))))
          .find((x) => x !== undefined);
        if (written === undefined || !hasOwnSense(e.text, written)) continue;
        score += 1;
        // …and a hit on the question's FRAME is not a hit on its subject. See subjectWords.
        if (!subjectWords.size || !isFrameWord(w)) onSubject = true;
      }
      // ONLY genuinely-matching entries, and only ones that matched the SUBJECT. No overlap → we
      // surface nothing and let the render point to the topic instead of faking an answer.
      if (score > 0 && onSubject) matched.push({ text: e.text, ref: e.ref, surah: first.surah, ayah: first.ayah, resolvable: first.resolvable, subtopic: st.subtopic, category: poolCategory, categorySlug: pool.slug, score, primary: pool.primary });
    }
   }
  }
  // Score first; then the ROUTED chapter wins every tie. Without that second key the pool widening
  // would silently rewrite answers that were already right: scores here are small integers and ties
  // are the common case, so entries from a borrowed chapter would take slots purely on the order the
  // fetches resolved in. The widening is meant to REACH lines that were unreachable, not to demote
  // the chapter the question actually routed to.
  /**
   * WIDENING DEEPENS AN ANSWER WE ALREADY HAD. IT NEVER MANUFACTURES ONE.
   *
   * If the routed chapter matched nothing on-subject, that IS the answer — the render points at the
   * topic instead of faking a reply, and that honest silence is the most important invariant on this
   * surface. Reading twelve more shards must not overturn it, and the first cut of this change did:
   * four guards went red at once. `hukum mendengarkan musik` started surfacing entries, because
   * `mendengarkan` is not an ACTION_FRAME verb but is not a subject either — it names no topic, so
   * it matched nothing in Perintah dan Larangan, and once the pool widened it found chapters where
   * the bare verb appears and scored there. Same for `atas` on the istiwa' question.
   *
   * Filtering the FRAME list word by word is the fix this repo has already tried and failed at three
   * times; the reach of a generic verb is not a property you can enumerate. So the rule is
   * structural instead: the routed chapter decides WHETHER there is an answer, and the other
   * chapters only decide how complete it is.
   */
  if (!matched.some((m) => m.primary)) matched.length = 0;

  matched.sort((a, b) => b.score - a.score || Number(b.primary) - Number(a.primary));
  // One verse can be filed in several chapters, and reading more than one shard therefore surfaces
  // it more than once: `hukum riba dalam islam` returned QS 2:278 TWICE the first time this ran —
  // once from Perintah dan Larangan, once from Ekonomi Islam. Two cards, same ayah, different
  // caption reads as padding, and on a scholarship surface it reads as padding by the scholar.
  // Dedupe AFTER the sort so the surviving copy is the best-scoring one, and the routed chapter's
  // copy wins a tie — which also means the entry keeps the category the reader was routed to.
  const seen = new Set<string>();
  const entries = matched
    .filter((f) => { const k = `${f.surah}:${f.ayah}`; return seen.has(k) ? false : (seen.add(k), true); })
    .slice(0, MAX_ENTRIES).map((f) => ({
    text: f.text, ref: f.ref, surah: f.surah, ayah: f.ayah, resolvable: f.resolvable, subtopic: f.subtopic,
    category: f.category, categorySlug: f.categorySlug,
  }));

  // `entries` may be empty — a BROAD topic question the index has no specific line for. That is a
  // valid answer: the render shows an honest pointer to the topic, never an invented one.
  return { slug, category: meta.category, totalEntries: meta.entries, source: index.source, entries };
}
