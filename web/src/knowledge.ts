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
import { norm } from "./retrieve.ts";

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
  ibadah: ["ibadah", "sholat", "shalat", "salat", "puasa", "zakat", "haji", "umroh", "umrah", "wudhu", "sujud"],
  "perintah-dan-larangan": ["perintah", "larangan", "hukum", "halal", "haram", "wajib", "sunnah", "makruh", "mubah", "syariat", "syari at"],
  "hijrah-jihad-dan-perang": ["hijrah", "jihad", "perang", "berperang"],
  "rahasia-kejiwaan-manusia-dalam-al-qur-an": ["jiwa", "kejiwaan", "psikologi", "nafsu", "mental", "kepribadian"],
  "prinsip-prinsip-pendidikan-islam": ["pendidikan", "mendidik", "pengajaran", "ilmu", "guru", "murid", "belajar"],
  keluarga: ["keluarga", "pernikahan", "menikah", "poligami", "warisan", "perceraian"],
  sosial: ["sosial", "masyarakat", "tetangga", "bermasyarakat", "gotong royong"],
  "ekonomi-islam": ["ekonomi", "riba", "jual beli", "perdagangan", "dagang", "harta", "bisnis", "muamalah"],
  "membangun-pribadi-shalih": ["akhlak", "karakter", "pribadi shalih", "adab", "budi pekerti"],
  "karakteristik-negara-bersyari-ah": ["negara", "syariah", "pemerintahan", "khilafah", "politik", "pemimpin", "hukum islam"],
};

/** Function/filler words that must not carry entry-ranking signal (mirrors retrieve.ts's discipline). */
const STOP = new Set<string>([
  "ada", "adalah", "apa", "apakah", "atau", "akan", "aku", "dan", "dari", "dengan", "dia", "ini",
  "itu", "juga", "kalau", "kamu", "karena", "kita", "mau", "maka", "mereka", "nya", "pada", "saja",
  "seperti", "untuk", "yang", "gak", "nggak", "tidak", "bisa", "buat", "gimana", "kenapa", "mengapa",
  "siapa", "siapakah", "dimana", "kapan", "berapa", "bagaimana", "sudah", "udah", "lagi", "banget",
]);

const MAX_ENTRIES = 8;

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
  const words = new Set(q.split(/[\s-]+/).filter(Boolean));
  let best: { slug: string; score: number } | null = null;
  for (const [slug, aliases] of Object.entries(TOPIC_ALIASES)) {
    let score = 0;
    for (const a of aliases) {
      if (a.includes(" ") ? q.includes(a) : words.has(a)) score += 1;
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
    [...norm(question).split(/[\s-]+/)].filter((w) => w.length > 2 && !STOP.has(w) && !nameWords.has(w)),
  );

  const matched: { text: string; ref: string; surah: number; ayah: number; resolvable: boolean; subtopic: string | null; score: number }[] = [];
  for (const st of shard.subtopics) {
    for (const e of st.entries) {
      const first = e.refs[0];
      if (!first) continue;
      const words = new Set(norm(e.text).split(/[\s-]+/).filter(Boolean));
      let score = 0;
      for (const w of qWords) if (words.has(w)) score += 1;
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
