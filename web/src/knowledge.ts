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
import { norm, OVERLAP_STOP, phraseHit, questionForms } from "./retrieve.ts";

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
  "anda", "kami", "kalian", "tersebut", "semua", "setiap", "para", "orang",
  "sangat", "sekali", "hanya", "masih", "pernah", "selalu", "kadang", "mungkin", "harus", "perlu",
  "ingin", "mohon", "mana",
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
const STOP = new Set<string>([...OVERLAP_STOP, ...KNOWLEDGE_EXTRA]);

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
const FRAME = new Set<string>(["islam", "islami", "muslim", "agama", "ajaran"]);

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

/** Match a question to a single topic. Returns the highest-scoring category slug, or null. */
export function matchTopic(question: string): string | null {
  const q = norm(question);
  if (!q) return null;
  // Split on hyphens too, so "al-quran" yields the whole word "quran" for the alias match.
  const forms = questionForms(q);
  let best: { slug: string; score: number } | null = null;
  for (const [slug, aliases] of Object.entries(TOPIC_ALIASES)) {
    let score = 0;
    for (const a of aliases) {
      // Same matcher the theme lexicon uses. This used to be whole-word-only, so "hukumnya",
      // "sholatnya" and "zakatku" matched no topic while their bare forms did — the app quietly
      // required people to strip their own suffixes. Multi-word aliases are space-bounded rather
      // than raw substrings, for the reason documented on phraseHit.
      if (a.includes(" ") ? phraseHit(` ${q} `, a) : forms.has(a)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { slug, score };
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

  const matched: { text: string; ref: string; surah: number; ayah: number; resolvable: boolean; subtopic: string | null; score: number }[] = [];
  for (const st of shard.subtopics) {
    for (const e of st.entries) {
      const first = e.refs[0];
      if (!first) continue;
      const words = new Set(norm(e.text).split(/[\s-]+/).filter(Boolean));
      let score = 0;
      // A hit only counts in the asker's sense — see SENSE_COLLOCATIONS (haram: forbidden vs sacred).
      for (const w of qWords) if (words.has(w) && hasOwnSense(e.text, w)) score += 1;
      // ONLY genuinely-matching entries. No overlap → we surface nothing and let the render point to
      // the topic instead of faking an answer from arbitrary entries.
      if (score > 0) matched.push({ text: e.text, ref: e.ref, surah: first.surah, ayah: first.ayah, resolvable: first.resolvable, subtopic: st.subtopic, score });
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
