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
  /** A verse may console more than one state. Reach comes from all of them; rank from the best. */
  themes: string[];
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

  // ── Expanded feeling corpus ────────────────────────────────────────────────────
  // Written in what people actually type, same discipline as above. A feeling missing from here is
  // still reachable through the model classifier (its closed set is corpus.themes), but only the
  // keyword path carries the transparent "you typed this word" explanation — so the words that
  // matter most belong here, not in a dictionary's vocabulary.
  //
  // Overlap between themes is fine and expected: "anak" belongs to Family AND to the child-specific
  // feelings. Several themes matching is how a person carrying more than one thing gets heard.
  "Envy & comparison": ["iri","dengki","hasad","cemburu","insecure liat","bandingin","membandingkan"],
  Anger: ["marah","emosi","kesel","kesal","dongkol","geram","naik darah","sebel"],
  Loneliness: ["kesepian","sendirian","sendiri","sepi","gaada temen","ga punya temen","nggak punya siapa-siapa"],
  "Illness & healing": ["sakit","penyakit","sembuh","kesembuhan","dirawat","opname","berobat"],
  "Speech & gossip": ["ghibah","gosip","menggunjing","ngomongin orang","fitnah","julid","prasangka"],
  "Forgiving others": ["memaafkan","maafin","susah maafin","memaklumi","melepaskan dendam"],
  "Pride & arrogance": ["sombong","angkuh","tinggi hati","merasa paling","pamer","riya"],
  "Fear of death": ["takut mati","kematian","mati","ajal","meninggal nanti","sakaratul"],
  "Doubt & weak faith": ["ragu","iman turun","futur","goyah","bimbang iman","males ibadah"],
  "Wealth & greed": ["tamak","serakah","rakus","harta","kaya","materi"],
  Parents: ["birrul walidain","berbakti","orang tua","ibu bapak","bapak ibu"],
  "Injustice & being wronged": ["dizalimi","dizhalimi","ditindas","tidak adil","gak adil","diperlakukan tidak adil"],
  "Guilt & sin": ["bersalah","rasa bersalah","berdosa","dosa besar","nyesel banget"],
  "Longing for a child": ["belum punya anak","belum dikaruniai","mandul","program hamil","pengen punya anak"],
  "Waiting for a spouse": ["jodoh","belum nikah","nunggu jodoh","pengen nikah","belum ketemu jodoh"],
  "Struggling to raise children": ["mendidik anak","capek ngurus anak","anak susah diatur","parenting"],
  "A child who has gone astray": ["anak nakal","jauh dari agama","durhaka","ga nurut","nggak nurut","susah dibilangin"],
  "Caring for elderly parents": ["merawat orang tua","ibu sakit","ayah sakit","orang tua sakit","jagain orang tua"],
  "Conflict within the family": ["ribut keluarga","bertengkar","cekcok","konflik keluarga","berantem"],
  "Being a single parent": ["single parent","ngurus anak sendirian","orang tua tunggal","membesarkan sendiri"],
  "Worry about the future": ["masa depan","khawatir masa depan","gimana nanti","takut gagal","belum jelas arahnya"],
  "Confusion facing a big decision": ["bingung milih","harus pilih","istikharah","ambil keputusan","dilema"],
  "Starting over": ["mulai lagi","memulai dari nol","pindah","merantau","hijrah","mulai dari awal"],
  "Hope and optimism": ["harapan","berharap","optimis","semangat lagi","masih ada harapan"],
  "Joy and happiness": ["bahagia","senang","gembira","bersyukur banget","seneng banget"],
  "Growing older": ["menua","tua","umur","makin tua","ulang tahun","uban"],
  "Chronic illness": ["sakit menahun","sakit lama","penyakit kronis","ga sembuh-sembuh"],
  Divorce: ["cerai","perceraian","bercerai","pisah","gugat cerai"],
  Betrayal: ["dikhianati","khianat","selingkuh","dibohongi","ditipu","dikecewakan"],
  Abandonment: ["ditinggalkan","ditinggal","diabaikan","dicampakkan","ditinggal pergi"],
  Longing: ["rindu","kangen","kehilangan dia","pengen ketemu"],
  Poverty: ["miskin","kekurangan","ga punya uang","susah makan","serba kurang"],
  "Fear of poverty": ["takut miskin","cemas uang","takut ga cukup","khawatir rezeki"],
  Stinginess: ["pelit","kikir","bakhil","susah berbagi"],
  "Never enough": ["ga pernah cukup","kurang terus","selalu kurang","ga puas"],
  Contentment: ["qanaah","merasa cukup","cukup","syukuri yang ada"],
  Giving: ["sedekah","berbagi","donasi","infak","zakat","memberi"],
  "Envy of wealth": ["iri kekayaan","iri liat orang kaya","pengen kaya kayak"],
  Shame: ["malu","aib","memalukan","malu banget","nggak berani nunjukin muka"],
  "Regret over the past": ["menyesal","nyesel","masa lalu","penyesalan","andai dulu"],
  "Insecurity / feeling inferior": ["minder","rendah diri","ga percaya diri","insecure","ngerasa kalah"],
  "Feeling worthless or useless": ["ga berguna","tidak berguna","ga ada gunanya","beban","useless"],
  "Feeling unloved": ["ga dicintai","ga disayang","ga ada yang sayang","ga dianggap"],
  "Emptiness / life feels meaningless": ["hampa","kosong","hidup ga ada artinya","buat apa hidup","ga ada makna"],
  "Wanting to change and become better": ["ingin berubah","pengen berubah","jadi lebih baik","memperbaiki diri","taubat"],
  "Being bullied": ["dibully","bully","diejek","direndahkan","dihina","diolok"],
  "Being slandered": ["difitnah","dituduh","tuduhan","dituduh yang enggak-enggak"],
  "Feeling hatred": ["benci","membenci","ga suka banget","muak"],
  "Wanting revenge": ["balas dendam","dendam","pengen balas","ingin membalas"],
  "Losing a friend": ["kehilangan sahabat","temen menjauh","sahabat pergi","ga temenan lagi"],
  "Trouble with neighbours": ["tetangga","masalah tetangga","lingkungan","rt","rw"],
  "Wanting to reconcile": ["berdamai","islah","ingin baikan","rujuk","memperbaiki hubungan"],
  Despair: ["putus asa","udahlah","ga ada harapan","nyerah","hopeless"],
  "Anger at fate": ["kenapa aku","ga adil takdir","marah sama takdir","kenapa harus aku"],
  "Prayers unanswered": ["doa ga dijawab","doaku","udah doa tapi","doa belum dikabulkan"],
  "Far from God": ["jauh dari allah","ngerasa jauh","ga deket sama allah","hampa ibadah"],
  "Fear of insincerity": ["riya","takut riya","munafik","takut munafik","ga ikhlas"],
  "Struggling with consistency": ["istiqamah","istiqomah","susah konsisten","naik turun iman"],
  Burnout: ["burnout","jenuh","lelah banget","muak kerja","ga ada energi"],
  Overwhelm: ["kewalahan","kebanyakan","overwhelmed","ga sanggup semua","numpuk"],
  Laziness: ["malas","males","menunda","nunda","ga semangat","mager"],
  JobLoss: ["phk","dipecat","kehilangan pekerjaan","nganggur","di-phk","resign"],
  Direction: ["bingung arah","ga tau mau ngapain","arah hidup","tujuan hidup","tersesat"],
  StudyStress: ["ujian","skripsi","belajar","stres kuliah","tugas numpuk","sekolah"],
  EffortNotEnough: ["usaha ga cukup","udah berusaha tapi","sia-sia","percuma","ga dihargai"],
  "Temptation & desire": ["godaan","tergoda","nafsu","hawa nafsu","susah nahan","khilaf"],
  "Marriage & spouse": ["pernikahan","rumah tangga","sama suami","sama istri","hubungan kami"],
  Rejection: ["ditolak","penolakan","gak diterima","nggak diterima","dikucilkan"],
  Homesickness: ["kangen rumah","jauh dari rumah","perantauan","homesick","kangen kampung"],
  "Too far gone to repent": ["dosaku terlalu banyak","udah kelewatan","masih bisa diampuni","terlanjur"],
  Heartbreak: ["patah hati","putus cinta","sakit hati","ditinggal pacar","gagal move on"],
};

export const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();

/**
 * The honesty floor is a real SIGNAL, not an accumulated score.
 *
 * Scoring: an explicit reference = 100, a recognised feeling (theme) = 10 each, an incidental word
 * that appears in a rendering = 2 each. A verse may be RETURNED only when it was picked by a real
 * signal — a reference or a feeling (`qualified` in `retrieve()`). Word overlap can re-rank those
 * verses but can never qualify one on its own.
 *
 * Why not a numeric floor. A score floor of 10 seemed safe, but a question dense in common words —
 * "siapakah Allah, ada di mana Allah, dan mau-Nya Allah itu apa?" — matched six fragments
 * (`allah`,`ada`,`dan`,`nya`,`itu`,`apa`) at +2 each and cleared it, returning 2:286 wrapped in a
 * "you're struggling" framing: a confident, tone-deaf, WRONG answer to a theology question. Two
 * things made that possible and both are fixed below: word overlap could qualify a verse (now it
 * can't — only a real signal does), and it matched substrings (`nya` inside `kesanggupannya`) over
 * function words (now it matches whole content words only). A knowledge question with no feeling now
 * reaches honest silence, which is the truthful answer for an app that finds verses by feeling.
 */

/** Indonesian function/filler words carry no retrieval signal; excluded so word overlap ranks on
 * content ("sholat","utang","dosa"), never on grammar ("dan","itu","apa","yang"). */
const OVERLAP_STOP = new Set<string>([
  "ada", "adalah", "apa", "apakah", "atau", "akan", "aku", "dan", "dari", "dengan", "dia", "ini",
  "itu", "juga", "kalau", "kalo", "kamu", "karena", "kita", "mau", "maka", "mereka", "nya", "pada",
  "saja", "saya", "seperti", "untuk", "yang", "kok", "sih", "gak", "nggak", "tidak", "bisa", "buat",
  "gimana", "kenapa", "mengapa", "siapa", "siapakah", "dimana", "kapan", "berapa", "bagaimana",
  "tuh", "deh", "dong", "pun", "sudah", "udah", "lagi", "banget", "kayak", "gitu", "gini", "aja",
]);

/** The set of whole words in a rendering — so overlap matches words, not substrings. */
const wordSet = (text: string): Set<string> => new Set(norm(text).split(" ").filter(Boolean));

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
/**
 * Which emotional themes the keyword lexicon recognises in the question, mapped to the exact terms
 * that matched (kept for the transparent "you typed this word" explanation). Shared so callers can
 * cheaply ask "did the lexicon already understand this?" without a second scan — e.g. to skip the
 * model classifier when it isn't needed.
 */
/**
 * Indonesian affixes, longest-first so "meng" is tried before "me".
 *
 * These exist because plain word matching would be too blunt for an agglutinative language:
 * "bersabar", "ketakutan" and "pekerjaan" must still reach sabar / takut / kerja. Stripping only
 * RECOGNISED affixes is also what keeps the noise out — "keuangan" reduces to `uang` (ke+UANG+an),
 * while "ruangan" cannot, because no valid prefix turns "ruang" into "uang".
 */
const PREFIXES = ["memper", "menyeng", "meng", "meny", "mem", "men", "ber", "ter", "per", "pen", "pem", "peng", "me", "di", "ke", "se", "pe"];
const SUFFIXES = ["kannya", "annya", "kan", "an", "nya", "ku", "mu", "i"];

/**
 * Every form of `w` that could reduce to a lexicon term: the word itself, and the word with one
 * recognised prefix and/or suffix removed. Deliberately shallow — one affix per side. Deeper
 * stripping starts inventing stems ("sepintas" → "sepi") and reintroduces the very noise this
 * replaced.
 */
function stemCandidates(w: string): string[] {
  const out = new Set<string>([w]);
  const bodies = [w];
  for (const p of PREFIXES) {
    if (w.length > p.length + 2 && w.startsWith(p)) { bodies.push(w.slice(p.length)); break; }
  }
  for (const b of bodies) {
    out.add(b);
    // Up to two suffix strips: Indonesian stacks them ("pekerjaan-ku" needs -ku then -an before it
    // reaches `kerja`). Capped at two — deeper stripping starts inventing stems and lets the noise
    // back in.
    let cur = b;
    for (let round = 0; round < 2; round += 1) {
      const s = SUFFIXES.find((x) => cur.length > x.length + 2 && cur.endsWith(x));
      if (!s) break;
      cur = cur.slice(0, -s.length);
      out.add(cur);
    }
  }
  return [...out];
}

/**
 * Which emotional themes the lexicon recognises, matched on WORD boundaries rather than substrings.
 *
 * The substring version let a term buried inside an unrelated word hijack the question — "ibu"
 * inside "d-IBU-lly" routed a bullied person to verses about honouring parents. See
 * retrieve-word-boundary.test.ts for the pinned cases.
 */
/**
 * Phrase match that tolerates an affix on the final word — "rumah tanggaku" must still reach the
 * phrase "rumah tangga". Bounded at both ends, so a phrase can never start or end mid-word.
 */
export function phraseHit(paddedQ: string, phrase: string): boolean {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\s${esc}(?:ku|mu|nya|kan|an|i)?\\s`).test(paddedQ);
}

/**
 * Every word of a normalised question plus its affix-stripped forms. Shared so topic matching and
 * theme matching cannot drift apart — matchTopic had its own weaker copy that matched whole words
 * only, so "hukumnya", "sholatnya" and "zakatku" reached no topic at all while "hukum" did.
 */
export function questionForms(normalisedQ: string): Set<string> {
  const forms = new Set<string>();
  for (const w of normalisedQ.split(" ").filter(Boolean)) {
    // Both the hyphenated token AND its parts. `norm` keeps hyphens, so "al-quran" arrives whole —
    // splitting on spaces alone never yielded "quran" and silently broke topic matching for it.
    // But splitting on hyphens alone would break "was-was", a lexicon term in its own right. Keep both.
    for (const c of stemCandidates(w)) forms.add(c);
    if (w.includes("-")) for (const part of w.split("-").filter(Boolean)) for (const c of stemCandidates(part)) forms.add(c);
  }
  return forms;
}

export function keywordThemeHits(question: string): Map<string, string[]> {
  const themeScore = new Map<string, string[]>();
  const q = norm(question);
  if (!q) return themeScore;

  const forms = questionForms(q);
  const padded = ` ${q} `;

  for (const [theme, terms] of Object.entries(LEXICON)) {
    // Multi-word terms ("gak kuat", "orang tua") still match as a phrase, but bounded by spaces so
    // they cannot start or end mid-word.
    const hits = terms.filter((t) => (t.includes(" ") ? phraseHit(padded, t) : forms.has(t)));
    if (hits.length) themeScore.set(theme, hits);
  }
  return themeScore;
}

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
  const contentWords = new Set([...qWords].filter((w) => !OVERLAP_STOP.has(w)));
  const modelThemeSet = new Set(modelThemes);

  // 1. Which emotional theme is this person in? (Shared with callers via keywordThemeHits.)
  const themeScore = keywordThemeHits(question);

  // 2. Explicit verse reference — "2:255", "surat 94 ayat 5"
  const direct = question.match(/(\d{1,3})\s*[:\.]\s*(\d{1,3})/);

  const scored = corpus.verses.map((verse) => {
    let score = 0;
    // The honest floor: a verse is returnable ONLY when a real signal picked it — a reference or a
    // recognised feeling. Word overlap below can re-rank a qualified verse, never qualify one.
    let qualified = false;
    const matched: string[] = [];

    if (direct && verse.ref === `${Number(direct[1])}:${Number(direct[2])}`) {
      score += 100;
      qualified = true;
      matched.push(verse.ref);
    }

    // A verse may carry several feelings. Credit the BEST-matching one, never the sum: a verse
    // tagged with four states must not outrank a single-tagged verse on a question that touches
    // one of them. Extra tags widen REACH, they must not buy RANK.
    let themeHits: string[] | undefined;
    for (const t of verse.themes) {
      const hits = themeScore.get(t);
      if (hits?.length && hits.length > (themeHits?.length ?? 0)) themeHits = hits;
    }
    if (themeHits?.length) {
      score += 10 * themeHits.length;
      qualified = true;
      matched.push(...themeHits);
    } else if (verse.themes.some((t) => modelThemeSet.has(t))) {
      // Keywords missed this theme but the model recognised it in what the person wrote — the whole
      // reason the understander exists ("ngerasa Tuhan udah nyerah sama aku" hits no keyword).
      // Credit it like one keyword theme hit and record honest provenance rather than a faked word.
      // Keyword themes still outrank it because they can stack (×count).
      score += 10;
      qualified = true;
      matched.push(MODEL_THEME_MATCH);
    }

    // Word overlap — RANK ONLY, whole-word, content words only. Matching the rendering's word SET
    // (not `includes`) stops fragments scoring inside longer words ("nya" ⊄ "kesanggupannya");
    // dropping function words stops "dan/itu/apa/ada" carrying signal. It never sets `qualified`.
    const hayWords = wordSet(`${verse.primary?.text ?? ""} ${verse.companion?.text ?? ""} ${verse.why}`);
    for (const w of contentWords) {
      if (hayWords.has(w)) {
        score += 2;
        matched.push(w);
      }
    }

    return { verse, score, qualified, matched: [...new Set(matched)] };
  });

  const ranked = scored
    .filter((h) => h.qualified)
    .sort((a, b) => b.score - a.score || a.verse.surah - b.verse.surah);

  // Diversify by theme.
  //
  // Someone typing "lagi banyak utang, stress" is carrying TWO things — debt and exhaustion.
  // Returning two verses about exhaustion answers half the person. One verse per theme means
  // the strongest signal in each thing they said gets heard, which is the whole point of
  // meeting them where they are.
  // With multi-theme verses, "one verse per theme" becomes: admit a verse only if it brings a
  // feeling not yet represented, then mark the feelings it actually answers as covered. Marking
  // ALL of a verse's tags covered would let one broadly-tagged verse consume several concerns and
  // crowd the second thing the person said out of the results — the exact failure this block exists
  // to prevent.
  const asked = new Set<string>([...themeScore.keys(), ...modelThemeSet]);
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const hit of ranked) {
    // The feelings this verse answers for THIS question — its tags intersected with what was asked.
    // Falls back to its own tags when nothing was asked (a direct ref lookup qualifies that way).
    const relevant = hit.verse.themes.filter((t) => asked.has(t));
    const covering = relevant.length ? relevant : hit.verse.themes;
    // Claim exactly ONE feeling — the first gap this verse can fill. Marking every tag it carries
    // would let a broadly-tagged verse answer "utang + stress" by itself and suppress the verse
    // that speaks to the second thing; claiming one keeps the original one-verse-per-feeling
    // behaviour while still letting a multi-tagged verse fill whichever slot is still open.
    const fills = covering.find((t) => !seen.has(t));
    if (fills === undefined) continue;
    seen.add(fills);
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
/**
 * The deterministic openers — the app's own companion voice, shown when the live framing model is
 * unavailable or its output was rejected by the wall. Each feeling now has a FEW variants (not one
 * canned line), in the "Berat, ya" register the system prompt praises: present, warm, 2am Indonesian
 * that names the feeling and POINTS to the verses — never authoring meaning, never a ruling. The
 * interpretive disclaimer is no longer bolted onto every line; it lives as quiet chrome under the
 * verses (main.ts READER_NOTE), so honesty stays present without being preached every turn.
 *
 * compose-openers.test.ts asserts every variant here clears compose-guard, so a careless edit that
 * slips a reference or a fatwa-shaped phrase in fails CI rather than reaching a reader.
 */
export const OPENERS: Record<string, readonly string[]> = {
  "Hardship & ease": [
    "Berat, ya. Ada ayat yang sering dibaca orang pas lagi seberat ini.",
    "Lagi susah banget, ya. Ini yang sering dipegang orang waktu rasanya nggak ada jalan.",
    "Capek, ya, nahan semuanya sendirian. Ada ayat yang sering dibaca orang di titik seperti ini.",
  ],
  "Anxiety & fear": [
    "Rasa cemas itu nyata, dan kamu nggak harus pura-pura kuat sekarang.",
    "Takut itu wajar, kok. Ini yang sering dibaca orang waktu pikirannya nggak mau berhenti.",
    "Lagi nggak tenang, ya. Ada ayat yang sering dipegang orang pas malam terasa panjang.",
  ],
  "Grief & loss": [
    "Turut berduka, ya. Ini yang sering dibaca orang waktu kehilangan.",
    "Kehilangan itu berat, dan nggak ada yang bisa buru-buru. Ada ayat yang sering menemani orang di saat seperti ini.",
    "Aku ikut sedih. Ini yang sering dipegang orang waktu ada yang pergi.",
  ],
  Patience: [
    "Sabar itu nggak berarti diam nahan sendiri. Ada ayat yang sering dibaca orang soal ini.",
    "Lagi disuruh nunggu sama keadaan, ya. Ini yang sering dipegang orang waktu harus bertahan.",
    "Capek buat terus sabar, ya. Ada ayat yang sering dibaca orang pas rasanya udah mentok.",
  ],
  "Forgiveness & despair": [
    "Kamu nggak sedang bicara sama hakim. Ini ayat tentang pintu yang tetap terbuka.",
    "Ngerasa udah kelewatan, ya. Ada ayat yang sering dibaca orang waktu ngerasa nggak pantas dimaafin.",
    "Lagi ngerasa jauh, ya. Ini yang sering dipegang orang pas ngerasa udah nggak ada harapan.",
  ],
  "Provision & debt": [
    "Soal rezeki dan utang — yang bikin susah tidur, ya. Ada ayat yang sering dibaca orang di titik ini.",
    "Lagi kepikiran uang terus, ya. Ini yang sering dipegang orang waktu napasnya sesak sama kebutuhan.",
    "Berat, ya, mikirin yang harus dibayar. Ada ayat yang sering dibaca orang soal ini.",
  ],
  "Trust in God": [
    "Lagi bingung harus ke mana, ya. Ini yang sering dijadikan pegangan orang waktu nggak tahu arah.",
    "Susah buat pasrah pas semuanya belum jelas, ya. Ada ayat yang sering dibaca orang di saat seperti ini.",
    "Lagi berat buat percaya semua bakal baik-baik aja. Ini yang sering dipegang orang waktu itu.",
  ],
  Gratitude: [
    "Kadang syukur itu justru paling susah pas lagi banyak yang kurang. Ini yang sering dibaca orang soal itu.",
    "Lagi pengen inget hal-hal yang masih baik, ya. Ada ayat yang sering dipegang orang soal syukur.",
    "Di tengah semuanya, masih ada yang bisa disyukuri, ya. Ini yang sering dibaca orang tentang itu.",
  ],
  "Prayer answered": [
    "Lagi nunggu doa dijawab, ya — dan diamnya kadang bikin ragu. Ada ayat yang sering dibaca orang soal ini.",
    "Ngerasa doa kayak nggak kedengeran, ya. Ini yang sering dipegang orang waktu itu.",
    "Soal doa — apakah didengar. Ada ayat yang sering dibaca orang pas lagi nunggu.",
  ],
  Mercy: [
    "Lagi butuh diingetin kalau kamu nggak sendirian, ya. Ini yang sering dibaca orang tentang rahmat.",
    "Kadang yang paling dibutuhin cuma rasa dikasihani, ya. Ada ayat yang sering dipegang orang soal itu.",
    "Tentang rahmat — yang sering dibaca orang pas lagi ngerasa berat sendirian.",
  ],
  "Self-worth & purpose": [
    "Lagi ngerasa nggak berharga, ya. Ada ayat yang sering dibaca orang pas ngerasa kayak gitu.",
    "Ngerasa kayak nggak ada gunanya, ya. Ini yang sering dipegang orang di titik ini.",
    "Lagi nyari alasan buat ngelanjutin, ya. Ada ayat yang sering dibaca orang soal ini.",
  ],
  Family: [
    "Soal keluarga — kadang yang paling dekat sekaligus yang paling bikin capek. Ada ayat yang sering dipegang orang di titik ini.",
    "Lagi berat sama urusan keluarga, ya. Ini yang sering dibaca orang soal itu.",
    "Keluarga itu rumit — bisa jadi tempat pulang sekaligus tempat luka. Ada ayat yang sering dibaca orang soal ini.",
  ],
};

const OPENER_DEFAULT: readonly string[] = [
  "Ini ayat yang paling dekat sama yang kamu rasain.",
  "Ada ayat yang mungkin nyambung sama yang kamu ceritain.",
];

/** Pick a variant by a stable hash of the question, so the SAME question always yields the SAME
 * opener — a restored thread reads exactly the way it was left — while different questions vary. */
function pickOpener(variants: readonly string[], seed: string): string {
  if (variants.length <= 1) return variants[0] ?? "";
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return variants[Math.abs(h) % variants.length]!;
}

// `question` seeds ONLY which pre-written, theme-appropriate variant is chosen — never what it says.
// New-Quranku still does not "reply" to the words; it just doesn't repeat one canned line either. This
// is the seam where the live generative model slots in (compose-live.ts); the wall and this honest
// fallback are what make that safe.
export function compose(hits: Hit[], question: string): string {
  if (!hits.length) return "";
  // The opener speaks to ONE feeling; use the first tag of the top hit as its voice.
  const theme = hits[0]!.verse.themes[0] ?? "";
  return pickOpener(OPENERS[theme] ?? OPENER_DEFAULT, question);
}
