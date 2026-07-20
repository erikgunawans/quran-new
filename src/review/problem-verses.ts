/**
 * The verses people actually arrive with.
 *
 * This is the product's hot path — the "help me with my problem" surface from the spec's
 * mission. If the primary voice (Tarjamah Tafsiriyah) is going to lead the reading
 * experience, it has to earn that on THESE verses, not on average across all 6,236.
 *
 * Curated for pastoral reach, not for theological completeness. Grouped by what a person
 * is actually feeling when they open the app at 2am.
 */

export interface ProblemVerse {
  readonly ref: readonly [surah: number, ayah: number];
  /** A verse may console more than one state — see retrieve-multi-theme.test.ts. */
  readonly themes: readonly Theme[];
  /** Why a person in this state reaches for this verse. */
  readonly why: string;
}

export type Theme =
  | "Hardship & ease"
  | "Anxiety & fear"
  | "Grief & loss"
  | "Patience"
  | "Forgiveness & despair"
  | "Provision & debt"
  | "Trust in God"
  | "Gratitude"
  | "Prayer answered"
  | "Mercy"
  | "Self-worth & purpose"
  | "Family";

/**
 * Indonesian display labels for the browse surface (/tema).
 *
 * The `Theme` values above are INTERNAL KEYS: they join `verse.theme` to the retrieval `LEXICON`
 * in `web/src/retrieve.ts` and must stay stable and English — renaming them would silently break
 * chat scoring. These labels are what a reader actually SEES. Keeping the two separate lets the
 * browse UI speak Indonesian (the whole point of this app) without touching the scoring keys.
 * `build-themes.ts` emits these into the generated `theme-index.ts`; retrieval never reads them.
 */
export const THEME_LABELS: Record<Theme, string> = {
  "Hardship & ease": "Kesulitan & kelapangan",
  "Anxiety & fear": "Cemas & takut",
  "Grief & loss": "Duka & kehilangan",
  Patience: "Kesabaran",
  "Forgiveness & despair": "Ampunan & putus asa",
  "Provision & debt": "Rezeki & utang",
  "Trust in God": "Tawakal",
  Gratitude: "Syukur",
  "Prayer answered": "Doa yang dikabulkan",
  Mercy: "Rahmat & kasih sayang",
  "Self-worth & purpose": "Harga diri & makna hidup",
  Family: "Keluarga",
};

export const PROBLEM_VERSES: readonly ProblemVerse[] = [
  // ── Hardship & ease — the most-reached-for verses in the Qur'an ───────────
  { ref: [94, 5], themes: ["Hardship & ease"], why: "Ayat penghiburan — bersama kesulitan ada kemudahan" },
  { ref: [94, 6], themes: ["Hardship & ease"], why: "Diulang dua kali — itu yang membuatnya janji, bukan kebetulan" },
  { ref: [65, 7], themes: ["Hardship & ease"], why: "Allah akan memberi kemudahan setelah kesulitan" },
  { ref: [2, 286], themes: ["Hardship & ease"], why: "Allah tidak membebani seseorang melebihi kesanggupannya" },
  { ref: [65, 2], themes: ["Hardship & ease"], why: "Jalan keluar bagi orang yang bertakwa" },
  { ref: [2, 214], themes: ["Hardship & ease"], why: "\"Kapan datang pertolongan Allah?\" — jeritan orang yang diuji" },

  // ── Anxiety & fear ───────────────────────────────────────────────────────
  { ref: [13, 28], themes: ["Anxiety & fear"], why: "Hati menjadi tenang dengan mengingat Allah" },
  { ref: [3, 139], themes: ["Anxiety & fear"], why: "Jangan lemah, jangan bersedih" },
  { ref: [9, 40], themes: ["Anxiety & fear"], why: "\"Jangan sedih — Allah bersama kita\"" },
  { ref: [20, 46], themes: ["Anxiety & fear"], why: "\"Jangan takut. Aku bersama kalian, mendengar dan melihat\"" },
  { ref: [41, 30], themes: ["Anxiety & fear"], why: "Para malaikat: \"jangan takut, jangan bersedih\"" },
  { ref: [2, 112], themes: ["Anxiety & fear"], why: "Tidak ada rasa takut pada mereka, dan mereka tidak bersedih hati" },

  // ── Grief & loss ─────────────────────────────────────────────────────────
  { ref: [2, 156], themes: ["Grief & loss"], why: "Inna lillahi wa inna ilaihi raji'un — dibaca di setiap kematian" },
  { ref: [2, 155], themes: ["Grief & loss"], why: "\"Kami pasti menguji kalian… sampaikan kabar gembira bagi yang sabar\"" },
  { ref: [2, 157], themes: ["Grief & loss"], why: "Keberkahan dan rahmat bagi mereka yang bertahan" },
  { ref: [12, 86], themes: ["Grief & loss"], why: "Ya'qub: \"Hanya kepada Allah aku mengadukan kesedihanku\"" },
  { ref: [3, 185], themes: ["Grief & loss"], why: "Setiap yang bernyawa akan merasakan mati" },
  { ref: [21, 35], themes: ["Grief & loss"], why: "Diuji lewat hal buruk dan hal baik — dua-duanya ujian" },

  // ── Patience ─────────────────────────────────────────────────────────────
  { ref: [2, 153], themes: ["Patience"], why: "Mintalah pertolongan dengan sabar dan salat" },
  { ref: [39, 10], themes: ["Patience"], why: "Orang sabar diberi pahala tanpa batas" },
  { ref: [3, 200], themes: ["Patience"], why: "Sabar, kuatkan kesabaranmu, jangan goyah" },
  { ref: [103, 3], themes: ["Patience"], why: "Al-'Asr — mereka yang saling menasihati untuk sabar" },
  { ref: [8, 46], themes: ["Patience"], why: "Allah bersama orang-orang yang sabar" },

  // ── Forgiveness & despair ────────────────────────────────────────────────
  { ref: [39, 53], themes: ["Forgiveness & despair"], why: "\"Jangan berputus asa dari rahmat Allah\" — ayat untuk yang merasa kotor" },
  { ref: [3, 135], themes: ["Forgiveness & despair"], why: "Siapa yang mengampuni dosa selain Allah?" },
  { ref: [66, 8], themes: ["Forgiveness & despair"], why: "Kembalilah kepada Allah dengan tobat yang tulus" },
  { ref: [24, 22], themes: ["Forgiveness & despair"], why: "Maafkan, dan lapangkan dadamu" },
  { ref: [4, 110], themes: ["Forgiveness & despair"], why: "Siapa pun yang berbuat salah lalu minta ampun" },
  { ref: [42, 25], themes: ["Forgiveness & despair"], why: "Dia menerima tobat dari hamba-hamba-Nya" },

  // ── Provision & debt (Erik's own context — and most users') ──────────────
  { ref: [65, 3], themes: ["Provision & debt"], why: "Rezeki dari arah yang tidak disangka-sangka" },
  { ref: [11, 6], themes: ["Provision & debt"], why: "Semua makhluk sudah dijamin rezekinya oleh Allah" },
  { ref: [51, 22], themes: ["Provision & debt"], why: "Di langit ada rezekimu" },
  { ref: [29, 60], themes: ["Provision & debt"], why: "Allah yang memberi rezeki kepadanya dan kepadamu" },
  { ref: [2, 280], themes: ["Provision & debt"], why: "Kalau yang berutang lagi kesulitan, beri dia waktu" },
  { ref: [94, 7], themes: ["Provision & debt"], why: "Kalau sudah selesai, kerjakan yang berikutnya" },

  // ── Trust in God ─────────────────────────────────────────────────────────
  { ref: [3, 159], themes: ["Trust in God"], why: "Kalau sudah bertekad, bertawakallah kepada Allah" },
  { ref: [8, 2], themes: ["Trust in God"], why: "Hatinya bergetar, imannya bertambah, lalu ia bertawakal" },
  { ref: [3, 173], themes: ["Trust in God"], why: "\"Cukuplah Allah bagi kami\" — hasbunallah" },
  { ref: [64, 11], themes: ["Trust in God"], why: "Tidak ada musibah yang menimpa kecuali dengan izin Allah" },

  // ── Gratitude ────────────────────────────────────────────────────────────
  { ref: [14, 7], themes: ["Gratitude"], why: "\"Kalau kalian bersyukur, pasti Aku tambah nikmat untuk kalian\"" },
  { ref: [2, 152], themes: ["Gratitude"], why: "Ingatlah Aku, Aku pun mengingat kalian" },
  { ref: [55, 13], themes: ["Gratitude"], why: "Nikmat Tuhanmu yang mana lagi yang kamu dustakan?" },

  // ── Prayer answered ──────────────────────────────────────────────────────
  { ref: [2, 186], themes: ["Prayer answered"], why: "\"Aku dekat — Aku kabulkan doa orang yang berdoa\"" },
  { ref: [40, 60], themes: ["Prayer answered"], why: "\"Berdoalah kepada-Ku, akan Aku kabulkan\"" },
  { ref: [7, 55], themes: ["Prayer answered"], why: "Berdoalah dengan rendah hati, diam-diam saja" },
  { ref: [21, 87], themes: ["Prayer answered"], why: "Doa Nabi Yunus, dari dalam kegelapan" },

  // ── Mercy ────────────────────────────────────────────────────────────────
  { ref: [7, 156], themes: ["Mercy"], why: "\"Rahmat-Ku meliputi segala sesuatu\"" },
  { ref: [21, 107], themes: ["Mercy"], why: "Diutus sebagai rahmat bagi seluruh alam" },
  { ref: [6, 54], themes: ["Mercy"], why: "Tuhanmu telah menetapkan kasih sayang atas diri-Nya" },

  // ── Self-worth & purpose ─────────────────────────────────────────────────
  { ref: [95, 4], themes: ["Self-worth & purpose"], why: "Manusia diciptakan dalam bentuk yang sebaik-baiknya" },
  { ref: [51, 56], themes: ["Self-worth & purpose"], why: "Jin dan manusia diciptakan hanya untuk beribadah" },
  { ref: [17, 70], themes: ["Self-worth & purpose"], why: "Sungguh Kami telah memuliakan anak cucu Adam" },

  // ── Family ───────────────────────────────────────────────────────────────
  { ref: [30, 21], themes: ["Family"], why: "Dia jadikan di antara kalian rasa cinta dan kasih sayang" },
  { ref: [17, 23], themes: ["Family"], why: "Berbuat baiklah kepada orang tua" },
  { ref: [17, 24], themes: ["Family"], why: "\"Tuhanku, sayangilah mereka seperti mereka merawatku waktu kecil\"" },
] as const;
