/**
 * Retrieval — the honest half of the chatbot.
 *
 * This is spec Part 4, Level 3 "source mode": retrieve, cite, and let the sources speak.
 * There is NO generative model in this path, and that is a design position, not a
 * limitation. Nur never answers in its own voice as if it were a scholar. It finds the
 * verse, names every voice, and gets out of the way.
 *
 * When an LLM is wired in later it slots in at `compose()` — and it still may only
 * phrase what retrieval already grounded. If retrieval finds nothing, Nur says so.
 */

export interface Voice {
  id: string;
  author: string;
  name: string;
  era: string;
  lang: string;
  authority_tier: number;
  display_role: "primary" | "companion" | "reference";
  note: string | null;
}

export interface Reading {
  text: string;
  translator: string;
  translation_type: "literal" | "interpretive";
  display_role?: string;
  authority_tier?: number;
}

export interface Verse {
  id: string;
  ref: string;
  surah: number;
  ayah: number;
  surah_name: string;
  surah_ar: string;
  arabic: string;
  theme: string;
  why: string;
  primary: Reading | null;
  companion: Reading | null;
  tafsir: { source_id: string; text: string; lang: string }[];
}

export interface Corpus {
  corpus_version: string;
  sources: Voice[];
  themes: string[];
  verses: Verse[];
}

/**
 * Indonesian intent lexicon.
 *
 * Deliberately written in how people ACTUALLY type at 2am — "capek", "gak kuat", "bangkrut",
 * "galau" — not in formal Bahasa. If the app only understands textbook Indonesian it has
 * already failed the person it was built for.
 */
const LEXICON: Record<string, string[]> = {
  "Hardship & ease": [
    "susah","sulit","berat","capek","cape","lelah","kesulitan","masalah","ujian","cobaan",
    "gak kuat","ga kuat","nggak kuat","menyerah","putus asa","hancur","terpuruk","stress","stres",
  ],
  // The lexicon now carries the floor (MIN_SCORE = a theme hit), so a feeling that is missing here
  // is a feeling Nur goes silent on. That is the honest failure — but it means gaps are expensive,
  // and words people actually type must be in here, not the words a dictionary would choose.
  "Anxiety & fear": [
    "cemas","takut","khawatir","gelisah","panik","overthinking","anxiety","was-was","resah","galau","insecure",
    "tenang","ketenangan","damai","gak tenang","ga tenang","pikiran kacau","kepikiran terus","susah tidur","insomnia",
  ],
  "Grief & loss": [
    "sedih","kehilangan","meninggal","wafat","duka","menangis","nangis","ditinggal","kematian","almarhum","rindu",
  ],
  Patience: ["sabar","bertahan","kuat","tabah","istiqomah","menunggu","ikhlas"],
  "Forgiveness & despair": [
    "dosa","salah","menyesal","taubat","tobat","ampun","maaf","malu","hina","kotor","najis","berdosa","putus asa",
  ],
  "Provision & debt": [
    "uang","rezeki","rizki","hutang","utang","miskin","bangkrut","kerja","gaji","susah uang","ekonomi","bokek","cicilan",
  ],
  "Trust in God": ["pasrah","tawakal","tawakkal","percaya","serah","bingung","ragu","takdir"],
  Gratitude: ["syukur","bersyukur","terima kasih","nikmat","alhamdulillah","senang"],
  "Prayer answered": ["doa","berdoa","minta","memohon","dikabulkan","munajat","dengar"],
  Mercy: ["rahmat","kasih","sayang","cinta allah","pengampun","penyayang"],
  "Self-worth & purpose": [
    "tujuan","hidup","gunanya","berharga","sia-sia","hampa","kosong","buat apa","gaada arti",
    "sendirian","kesepian","sepi","gaada yang peduli","gak dianggap","gagal","gagal terus","minder",
  ],
  Family: ["orang tua","ibu","ayah","bapak","anak","keluarga","suami","istri","nikah","cerai","pasangan"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();

/**
 * The honesty threshold.
 *
 * Scoring is: an explicit verse reference = 100, a theme term = 10 each, an incidental word that
 * happens to appear somewhere in a translation = 2 each.
 *
 * The old floor was `score > 0`, which meant ONE incidental word was enough to answer. Asked
 * "gimana cara sholat tahajud", Nur returned 2:152 (Gratitude) — matched on the word `cara`
 * ("way") — and wrapped it in the full "here is a verse for you" framing. A wrong answer arrived
 * dressed exactly like a right one, which is worse than no answer at all: it spends the trust that
 * the whole no-generative-model design was built to earn.
 *
 * The floor is now a THEME hit. Nur answers when it recognises what the person is FEELING, not
 * when a word coincidentally appears in a rendering. Word overlap still ranks — it just can no
 * longer speak on its own.
 *
 * Below this line Nur says it does not know. That copy already existed and was simply unreachable.
 */
const MIN_SCORE = 10;

/** Marker pushed into a Hit's `matched` when a theme was recognised by the model rather than typed
 * as a keyword — honest provenance instead of a faked word. (`matched` is not surfaced in the UI
 * today, but the value stays truthful in case it ever is.) */
export const MODEL_THEME_MATCH = "(dari ceritamu)";

export interface Hit {
  verse: Verse;
  score: number;
  /** Which words in the question actually matched — shown to the user, never hidden. */
  matched: string[];
}

/**
 * Score a question against the corpus.
 *
 * Transparent by construction: every point is traceable to a word the user typed. No
 * embedding black box, no confidence theatre. If the score is low we say we're unsure —
 * we do not dress up a weak match as an answer.
 */
export function retrieve(
  corpus: Corpus,
  question: string,
  limit = 2,
  // Themes the input understander recognised in the person's words (already guarded to the closed
  // corpus set). ADDITIVE ONLY: the keyword pass below is untouched and keeps precedence; model
  // themes only reach a verse the keywords missed. Empty by default → identical to before.
  modelThemes: readonly string[] = [],
): Hit[] {
  const q = norm(question);
  if (!q) return [];
  const qWords = new Set(q.split(" ").filter((w) => w.length > 2));
  const modelThemeSet = new Set(modelThemes);

  // 1. Which emotional theme is this person in?
  const themeScore = new Map<string, string[]>();
  for (const [theme, terms] of Object.entries(LEXICON)) {
    const hits = terms.filter((t) => q.includes(t));
    if (hits.length) themeScore.set(theme, hits);
  }

  // 2. Explicit verse reference — "2:255", "surat 94 ayat 5"
  const direct = question.match(/(\d{1,3})\s*[:\.]\s*(\d{1,3})/);

  const scored: Hit[] = corpus.verses.map((verse) => {
    let score = 0;
    const matched: string[] = [];

    if (direct && verse.ref === `${Number(direct[1])}:${Number(direct[2])}`) {
      score += 100;
      matched.push(verse.ref);
    }

    const themeHits = themeScore.get(verse.theme);
    if (themeHits?.length) {
      score += 10 * themeHits.length;
      matched.push(...themeHits);
    } else if (modelThemeSet.has(verse.theme)) {
      // Keywords missed this theme but the model recognised it in what the person wrote — the whole
      // reason the understander exists ("ngerasa Tuhan udah nyerah sama aku" hits no keyword).
      // Credit it like one keyword theme hit (reaches MIN_SCORE), and record honest provenance
      // rather than a faked word. Keyword themes still outrank it because they can stack (×count).
      score += 10;
      matched.push(MODEL_THEME_MATCH);
    }

    // 3. Word overlap with the renderings themselves
    const hay = norm(`${verse.primary?.text ?? ""} ${verse.companion?.text ?? ""} ${verse.why}`);
    for (const w of qWords) {
      if (hay.includes(w)) {
        score += 2;
        matched.push(w);
      }
    }

    return { verse, score, matched: [...new Set(matched)] };
  });

  const ranked = scored
    .filter((h) => h.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.verse.surah - b.verse.surah);

  // Diversify by theme.
  //
  // Someone typing "lagi banyak utang, stress" is carrying TWO things — debt and exhaustion.
  // Returning two verses about exhaustion answers half the person. One verse per theme means
  // the strongest signal in each thing they said gets heard, which is the whole point of
  // meeting them where they are.
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const hit of ranked) {
    if (seen.has(hit.verse.theme)) continue;
    seen.add(hit.verse.theme);
    out.push(hit);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Nur's framing sentence.
 *
 * It orients the person and hands them straight to the sources. It never interprets, never
 * rules, never says "Islam teaches that…". The scripture and the named scholars do the
 * speaking; Nur only holds the door open.
 */
// `_question` is deliberately unused today: composition is theme-driven, and Nur must not appear
// to "reply" to the words themselves. It stays in the signature because this is the seam where a
// generative model would slot in — and even then it may only phrase what retrieval already
// grounded. (This unused param went unnoticed for a session because typecheck never covered web/.)
export function compose(hits: Hit[], _question: string): string {
  if (!hits.length) return "";
  const theme = hits[0]!.verse.theme;
  const opener: Record<string, string> = {
    "Hardship & ease": "Berat, ya. Ada ayat yang sering dibaca orang saat sedang seperti ini.",
    "Anxiety & fear": "Rasa cemas itu nyata, dan Al-Qur'an tidak menyuruhmu pura-pura kuat.",
    "Grief & loss": "Turut berduka. Ini ayat yang dibaca banyak orang ketika kehilangan.",
    Patience: "Sabar bukan berarti diam saja. Ini yang disebut Al-Qur'an tentang itu.",
    "Forgiveness & despair": "Kamu tidak sedang bicara dengan hakim. Ini ayat tentang pintu yang tetap terbuka.",
    "Provision & debt": "Soal rezeki dan utang, Al-Qur'an bicara cukup langsung.",
    "Trust in God": "Saat bingung harus ke mana, ini yang sering dijadikan pegangan.",
    Gratitude: "Ini ayat tentang syukur.",
    "Prayer answered": "Tentang doa — apakah didengar.",
    Mercy: "Tentang rahmat Allah.",
    "Self-worth & purpose": "Kalau sedang merasa tidak berharga, ini ayatnya.",
    Family: "Tentang keluarga.",
  };
  const lead = opener[theme] ?? "Ini ayat yang paling dekat dengan yang kamu tanyakan.";
  return `${lead} Aku tidak menafsirkan — <strong>silakan baca sendiri, dan lihat siapa yang mengatakan apa.</strong>`;
}
