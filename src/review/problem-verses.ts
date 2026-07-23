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
  /**
   * The reviewer's own warning about this pairing, verbatim.
   *
   * These existed only in the batch-merge artifact and were dropped at the last hop, so constraints
   * the reviewers actually wrote — "jangan disajikan sebagai jaminan datangnya jodoh" (51:49) —
   * existed nowhere in the shipped app. They are the reviewer's words about their own curation;
   * rewording one is the same category of error as rewording a translation.
   *
   * They are NOT reader-facing copy. A caveat is a note to us, backstage: shown verbatim to a
   * person it would read as stage direction leaking into the play. Three kinds are mixed here:
   *   - CO-DISPLAY rules ("jangan pernah bersama 4:145") — mechanically enforceable, see
   *     NEVER_TOGETHER in build-corpus.ts, which gates the build.
   *   - FRAMING limits on the `why` caption — human judgement, checked by eye at review time.
   *   - OPEN QUESTIONS for the ustadz ("mohon dicek…") — carried into the review sheet.
   */
  readonly caveat?: string;
  /**
   * The senior reviewer's ruling on this placement, verbatim — see RULING_REVIEW.
   *
   * A `caveat` above is the CURATOR's own doubt, written while proposing the placement. A `ruling`
   * is the ANSWER to it, given by the scholar whose name the app prints. Where both exist the
   * ruling supersedes; the caveat is kept as the record of what was asked, because a question that
   * disappears once answered leaves no trace that the answer was ever earned.
   *
   * `verdict: "ganti"` means the placement stands but HIS sentence replaced ours — in that case
   * `why` above is his words, not the curator's. `verdict: "pas"` means the placement and the
   * sentence both stood. Verses he rejected are listed in WITHDRAWN and are gone from here.
   *
   * `verdict: "cabut"` appearing on a verse that is STILL in this list is not a contradiction and
   * not a bug: he ruled against one placement of a verse that also sits on a theme he was never
   * asked about, so it survives there. 2:216 is the only such case today — rejected for "bingung
   * memilih", retained for "Heartbreak". Left visible rather than smoothed away, because the next
   * person to read this line needs to know a rejection is attached to it.
   *
   * Not reader-facing, and not shipped: build-corpus.ts emits only `themes` and `why`. Several
   * notes carry conditions we have NOT yet met (display this verse together with the one before
   * it). Those verses are withdrawn rather than shipped half-approved — a condition dropped
   * quietly is a scholar's name on an approval he did not give.
   */
  readonly ruling?: { readonly verdict: "pas" | "ganti" | "cabut"; readonly note: string };
  /**
   * The reviewer approved this verse ONLY as part of a passage — "tampilkan QS 92:5–7 bersama".
   *
   * This is the machine-readable half of a conditional approval. Until it existed, such verses had
   * exactly two possible fates and both were wrong: ship the verse alone (a scholar's name on an
   * approval he did not give) or withdraw it (his approval thrown away). They were withdrawn, which
   * is the safer wrong answer, and it emptied two whole feelings.
   *
   * `range` is an ayah span in the SAME surah as `ref`, inclusive, and MUST contain `ref` — a
   * passage that does not include the verse it is the context for is a mis-transcription, and
   * build-corpus fails on it rather than shipping it.
   *
   * The verse at `ref` stays the one the theme points at and the one `why` describes; the rest of
   * the range is context rendered around it, never re-captioned. Showing more of the Qur'an is
   * safe; putting our sentence on more of it is not.
   *
   * Two things this does NOT relax. The passage text is still the pinned corpus, and every ref the
   * range expands to is still checked against NEVER_TOGETHER in build-corpus.ts — otherwise
   * co-display would become a side door for putting a forbidden pair on screen together.
   */
  readonly codisplay?: {
    readonly range: readonly [from: number, to: number];
    /** The reviewer's condition, verbatim — the sentence that makes this range non-negotiable. */
    readonly note: string;
  };
}

/** Provenance for every `ruling` below. Uniform, so it is stated once instead of 133 times. */
export const RULING_REVIEW = {
  reviewer: "Ustadz Ahmad Isrofiel Mardlatillah",
  on: "2026-07-22",
  /** The complete verbatim record, including the verses he rejected. */
  record: "docs/review/ustadz-perasaan-2026-07-22.json",
} as const;

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
  | "Family"
  | "Envy & comparison"
  | "Anger"
  | "Loneliness"
  | "Illness & healing"
  | "Speech & gossip"
  | "Forgiving others"
  | "Pride & arrogance"
  | "Fear of death"
  | "Doubt & weak faith"
  | "Wealth & greed"
  | "Parents"
  | "Injustice & being wronged"
  | "Guilt & sin"
  | "Longing for a child"
  | "Waiting for a spouse"
  | "Struggling to raise children"
  | "A child who has gone astray"
  | "Caring for elderly parents"
  | "Conflict within the family"
  | "Being a single parent"
  | "Worry about the future"
  | "Confusion facing a big decision"
  | "Starting over"
  | "Hope and optimism"
  | "Joy and happiness"
  | "Growing older"
  | "Chronic illness"
  | "Divorce"
  | "Betrayal"
  | "Abandonment"
  | "Longing"
  | "Poverty"
  | "Fear of poverty"
  | "Stinginess"
  | "Never enough"
  | "Contentment"
  | "Giving"
  | "Envy of wealth"
  | "Shame"
  | "Regret over the past"
  | "Insecurity / feeling inferior"
  | "Feeling worthless or useless"
  | "Feeling unloved"
  | "Emptiness / life feels meaningless"
  | "Wanting to change and become better"
  | "Being bullied"
  | "Being slandered"
  | "Feeling hatred"
  | "Wanting revenge"
  | "Losing a friend"
  | "Trouble with neighbours"
  | "Wanting to reconcile"
  | "Despair"
  | "Anger at fate"
  | "Prayers unanswered"
  | "Far from God"
  | "Fear of insincerity"
  | "Struggling with consistency"
  | "Burnout"
  | "Overwhelm"
  | "Laziness"
  | "JobLoss"
  | "Direction"
  | "StudyStress"
  | "EffortNotEnough"
  | "Heartbreak"
  | "Temptation & desire"
  | "Marriage & spouse"
  | "Rejection"
  | "Homesickness"
  | "Too far gone to repent";

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
  Heartbreak: "Patah hati",
  "Temptation & desire": "Godaan & hawa nafsu",
  "Marriage & spouse": "Pernikahan & pasangan",
  "Rejection": "Ditolak",
  "Homesickness": "Merantau",
  "Too far gone to repent": "Merasa terlalu banyak dosa",
  "Envy & comparison": "Iri & membanding-bandingkan",
  "Anger": "Marah",
  "Loneliness": "Kesepian",
  "Illness & healing": "Sakit & kesembuhan",
  "Speech & gossip": "Lisan & gunjingan",
  "Forgiving others": "Memaafkan orang lain",
  "Pride & arrogance": "Sombong & angkuh",
  "Fear of death": "Takut mati",
  "Doubt & weak faith": "Ragu & iman melemah",
  "Wealth & greed": "Harta & tamak",
  "Parents": "Orang tua",
  "Injustice & being wronged": "Dizalimi",
  "Guilt & sin": "Rasa bersalah & dosa",
  "Longing for a child": "Menanti keturunan",
  "Waiting for a spouse": "Menanti jodoh",
  "Struggling to raise children": "Lelah mendidik anak",
  "A child who has gone astray": "Anak yang menjauh",
  "Caring for elderly parents": "Merawat orang tua",
  "Conflict within the family": "Pertengkaran keluarga",
  "Being a single parent": "Mengasuh sendirian",
  "Worry about the future": "Khawatir masa depan",
  "Confusion facing a big decision": "Bingung memilih",
  "Starting over": "Memulai lagi",
  "Hope and optimism": "Harapan",
  "Joy and happiness": "Bahagia",
  "Growing older": "Menua",
  "Chronic illness": "Sakit menahun",
  "Divorce": "Perceraian",
  "Betrayal": "Dikhianati",
  "Abandonment": "Ditinggalkan",
  "Longing": "Rindu",
  "Poverty": "Kekurangan",
  "Fear of poverty": "Cemas soal uang",
  "Stinginess": "Pelit",
  "Never enough": "Tidak pernah merasa cukup",
  "Contentment": "Merasa cukup",
  "Giving": "Sedekah",
  "Envy of wealth": "Iri melihat kekayaan orang",
  "Shame": "Malu",
  "Regret over the past": "Menyesal",
  "Insecurity / feeling inferior": "Minder",
  "Feeling worthless or useless": "Merasa tidak berguna",
  "Feeling unloved": "Merasa tidak dicintai",
  "Emptiness / life feels meaningless": "Hampa",
  "Wanting to change and become better": "Ingin berubah",
  "Being bullied": "Direndahkan",
  "Being slandered": "Difitnah",
  "Feeling hatred": "Menyimpan benci",
  "Wanting revenge": "Ingin membalas",
  "Losing a friend": "Kehilangan sahabat",
  "Trouble with neighbours": "Masalah dengan tetangga",
  "Wanting to reconcile": "Ingin berdamai",
  "Despair": "Putus asa",
  "Anger at fate": "Marah pada takdir",
  "Prayers unanswered": "Doa tidak dijawab",
  "Far from God": "Merasa jauh dari Allah",
  "Fear of insincerity": "Takut riya atau munafik",
  "Struggling with consistency": "Susah istiqamah",
  "Burnout": "Lelah & jenuh",
  "Overwhelm": "Kewalahan",
  "Laziness": "Malas & menunda",
  "JobLoss": "Kehilangan pekerjaan",
  "Direction": "Bingung arah hidup",
  "StudyStress": "Stres ujian & belajar",
  "EffortNotEnough": "Usaha terasa tak cukup",
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
  // 2:112 DROPPED (2026-07-20), found by the first real run of the synthesis answer eval.
  //
  // The curator reached for the verse's TAIL — "tiada takut… tiada sedih", a true anxiety verse in
  // the literal rendering. But the tafsiriyah rendering front-loads a refutation of 2:111 that the
  // plain text does not contain, so the verse OPENS: "Pengakuan orang Yahudi dan Nasrani semacam itu
  // adalah dusta." Someone typed that they were anxious and could not sleep, and the app answered —
  // top hit, in the principled edition, in production — with a polemic about Jews and Christians.
  //
  // "semacam itu" is a dangling reference to 2:111, so this is the same disease as 23:61 and 113:5.
  // It escaped the fragment gate only because it capitalises. That gap is now closed by BACKREF_OK
  // in build-corpus.ts. Anxiety & fear keeps 13:28, 3:139, 9:40, 20:46, 41:30.

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

  // ── Expanded feeling corpus (docs/review/feelings-expansion.md) ──
  // Envy & comparison
  { ref: [4, 32], themes: ["Envy & comparison"], why: "Jangan menginginkan kelebihan orang lain; mohonlah kepada Allah sebagian dari karunia-Nya.", ruling: { verdict: "ganti", note: "Ayat ini tepat untuk iri dan kebiasaan membandingkan diri, karena melarang menginginkan kelebihan yang Allah berikan kepada orang lain dan mengarahkan kita memohon karunia-Nya. Ganti kalimat menjadi: “Jangan menginginkan kelebihan orang lain; mohonlah kepada Allah sebagian dari karunia-Nya.”" } },
  // Anger
  { ref: [41, 35], themes: ["Anger"], why: "Membalas keburukan dengan cara yang lebih baik memerlukan kesabaran dan bagian kebaikan yang besar.", ruling: { verdict: "ganti", note: "Maknanya cocok sebagai lanjutan nasihat menghadapi kemarahan, tetapi ayat 35 berdiri sebagai kelanjutan ayat 34. Tampilkan QS 41:34–35 bersama, lalu gunakan kalimat: “Membalas keburukan dengan cara yang lebih baik memerlukan kesabaran dan bagian kebaikan yang besar.”" }, codisplay: { range: [34, 35], note: "Tampilkan QS 41:34–35 bersama." } },
  { ref: [3, 134], themes: ["Anger"], why: "Mereka yang menahan amarah dan memaafkan orang lain", ruling: { verdict: "pas", note: "Pas. Ayat ini secara langsung memuji orang yang menahan amarah dan memaafkan manusia. Tetap sampaikan bahwa menahan amarah tidak berarti membiarkan kekerasan atau kezaliman tanpa batas." } },
  // Loneliness
  { ref: [50, 16], themes: ["Loneliness"], why: "Allah mengetahui bisikan hatimu dan lebih dekat daripada urat lehermu; tidak ada isi hatimu yang tersembunyi dari-Nya.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk kesepian sebagai pengingat bahwa Allah mengetahui bisikan hati, tetapi jangan memahami kedekatan ini sebagai kedekatan fisik. Ganti kalimat menjadi: “Allah mengetahui bisikan hatimu dan lebih dekat daripada urat lehermu; tidak ada isi hatimu yang tersembunyi dari-Nya.”" } },
  // Illness & healing
  { ref: [26, 80], themes: ["Illness & healing"], why: "\"Ketika aku sakit, Tuhankulah yang menyembuhkan aku\" — doa Ibrahim", ruling: { verdict: "pas", note: "Pas. Ini pengakuan Nabi Ibrahim bahwa Allah adalah satu-satunya Pemberi kesembuhan. Tambahkan pemahaman bahwa bertawakal kepada Allah berjalan bersama ikhtiar pengobatan yang halal." } },
  // Speech & gossip
  { ref: [49, 12], themes: ["Speech & gossip"], why: "Jauhi prasangka, jangan mencari-cari kesalahan, jangan menggunjing", ruling: { verdict: "pas", note: "Pas. Ayat ini langsung melarang prasangka buruk, memata-matai, dan menggunjing. Kalimat aplikasi sudah mewakili pesan utama tanpa mengurangi beratnya larangan ghibah." } },
  // Forgiving others
  { ref: [2, 263], themes: ["Forgiving others"], why: "Berkata baik dan memaafkan lebih baik daripada sedekah yang menyakiti hati", ruling: { verdict: "pas", note: "Pas, dengan konteks adab sedekah. Ayat menegaskan bahwa perkataan baik dan pemberian maaf lebih baik daripada sedekah yang diikuti tindakan menyakiti; jangan dijadikan dalil tunggal untuk semua bentuk konflik." } },
  // Pride & arrogance
  { ref: [31, 18], themes: ["Pride & arrogance"], why: "Nasihat Luqman kepada anaknya — jangan berjalan di bumi dengan sombong", ruling: { verdict: "pas", note: "Pas. Nasihat Luqman ini secara langsung melarang memalingkan wajah karena sombong dan berjalan dengan angkuh. Kalimat pendamping sudah sesuai." } },
  { ref: [57, 23], themes: ["Pride & arrogance"], why: "Jangan berduka berlebihan atas yang luput dan jangan membanggakan diri atas yang Allah berikan.", ruling: { verdict: "ganti", note: "Cocok untuk kesombongan, tetapi jangan sampai larangan berbangga diri dipahami sebagai larangan bersyukur atau bergembira. Ganti kalimat menjadi: “Jangan berduka berlebihan atas yang luput dan jangan membanggakan diri atas yang Allah berikan.”" } },
  // Fear of death
  { ref: [29, 57], themes: ["Fear of death"], why: "Setiap yang bernyawa pasti merasakan kematian, lalu dikumpulkan kembali", ruling: { verdict: "pas", note: "Pas sebagai pengingat lembut bahwa kematian pasti dan semua kembali kepada Allah. Untuk orang yang sangat cemas, dampingi dengan ayat tentang rahmat, husnuzan, dan persiapan amal agar tidak terasa hanya sebagai ancaman." } },
  // Doubt & weak faith
  { ref: [14, 27], themes: ["Doubt & weak faith"], why: "Allah meneguhkan orang beriman dengan kalimat yang teguh di dunia dan akhirat.", ruling: { verdict: "ganti", note: "Cocok untuk iman yang melemah, tetapi kalimatnya jangan dibuat sebagai janji otomatis bahwa setiap kegoyahan segera hilang. Ganti menjadi: “Allah meneguhkan orang beriman dengan kalimat yang teguh di dunia dan akhirat.”" } },
  { ref: [18, 14], themes: ["Doubt & weak faith"], why: "\"Kami teguhkan hati mereka\" — para pemuda Ashabul Kahfi", ruling: { verdict: "pas", note: "Pas. Kisah para pemuda menunjukkan bahwa Allah meneguhkan hati orang beriman ketika mereka berdiri mempertahankan tauhid. Ini adalah teladan keberanian iman, bukan sekadar dorongan emosional." } },
  // Wealth & greed
  { ref: [2, 268], themes: ["Wealth & greed"], why: "Setan menakut-nakutimu dengan kemiskinan; Allah menjanjikan ampunan dan karunia", ruling: { verdict: "pas", note: "Pas untuk ketakutan miskin, kekikiran, dan keterikatan pada harta. Ayat membedakan bisikan setan yang menakut-nakuti dengan kemiskinan dari janji ampunan dan karunia Allah." } },
  { ref: [57, 20], themes: ["Wealth & greed"], why: "Dunia hanya permainan dan saling membanggakan harta dan anak", ruling: { verdict: "pas", note: "Pas. Ayat ini langsung mengingatkan sifat sementara dunia, perlombaan dalam harta dan anak, serta bahaya kesenangan yang menipu. Kalimat aplikasi sudah tepat." } },
  // Parents
  { ref: [19, 14], themes: ["Parents"], why: "Yahya berbakti kepada ibu bapaknya, tidak durhaka", ruling: { verdict: "pas", note: "Pas sebagai teladan berbakti kepada orang tua. Jelaskan bahwa ayat ini menggambarkan sifat Nabi Yahya, bukan sekadar slogan umum tentang keluarga." } },
  { ref: [14, 41], themes: ["Parents"], why: "Doa Ibrahim — ampunilah aku dan kedua orang tuaku", ruling: { verdict: "pas", note: "Pas. Ini doa Nabi Ibrahim memohon ampun untuk dirinya, kedua orang tuanya, dan kaum mukmin pada hari perhitungan. Kalimat pendamping sesuai." } },
  // Injustice & being wronged
  { ref: [4, 148], themes: ["Injustice & being wronged"], why: "Orang yang teraniaya boleh menyuarakan apa yang menimpanya", ruling: { verdict: "pas", note: "Pas. Ayat memberi ruang kepada orang yang dizalimi untuk menyuarakan keburukan yang menimpanya. Tekankan bahwa izin ini bukan pembenaran untuk berdusta, membuka aib yang tidak relevan, atau melampaui batas." } },
  // Guilt & sin
  { ref: [4, 27], themes: ["Guilt & sin"], why: "Allah hendak menerima taubatmu; jangan mengikuti hawa nafsu yang menjauhkanmu.", ruling: { verdict: "ganti", note: "Pas untuk rasa bersalah bila diarahkan kepada taubat, tetapi kalimat sekarang terlalu mudah terbaca sebagai pengampunan tanpa syarat. Ganti menjadi: “Allah hendak menerima taubatmu; jangan mengikuti hawa nafsu yang menjauhkanmu.”" } },
  // Longing for a child
  { ref: [21, 89], themes: ["Longing for a child"], why: "Nabi Zakaria pun pernah memohon keturunan dengan hati yang sama", ruling: { verdict: "pas", note: "Pas. Ini doa Nabi Zakaria ketika memohon keturunan dan mengakui Allah sebagai sebaik-baik Pewaris. Jangan menjadikannya jaminan bahwa setiap doa akan dijawab dengan bentuk dan waktu yang sama." } },
  { ref: [3, 38], themes: ["Longing for a child"], why: "Allah Maha Mendengar setiap permohonan yang kau bisikkan", ruling: { verdict: "pas", note: "Pas. Doa Nabi Zakaria secara langsung memohon keturunan yang baik dan menegaskan bahwa Allah Maha Mendengar doa. Kalimat pendamping sesuai selama tidak menjanjikan hasil tertentu." } },
  // Waiting for a spouse
  { ref: [25, 74], themes: ["Waiting for a spouse"], why: "Beginilah hamba-hamba-Nya meminta pasangan yang menenteramkan hati", ruling: { verdict: "pas", note: "Pas untuk menanti jodoh sekaligus membangun visi keluarga. Ayat mengajarkan meminta pasangan dan keturunan sebagai penyejuk mata serta menjadi teladan bagi orang bertakwa." } },
  // Struggling to raise children
  { ref: [20, 132], themes: ["Struggling to raise children"], why: "Perintahkan keluargamu salat dan bersabarlah menjaganya; Allah-lah yang memberi rezeki.", ruling: { verdict: "ganti", note: "Pas untuk orang tua yang lelah membimbing keluarga, tetapi kalimat harus tetap dekat dengan teks. Ganti menjadi: “Perintahkan keluargamu salat dan bersabarlah menjaganya; Allah-lah yang memberi rezeki.”" } },
  { ref: [11, 115], themes: ["Struggling to raise children"], why: "Bersabarlah; Allah tidak menyia-nyiakan pahala orang-orang yang berbuat baik", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai penguatan umum bagi orang tua yang bersabar berbuat baik. Ganti kalimat menjadi: “Bersabarlah; Allah tidak menyia-nyiakan pahala orang-orang yang berbuat baik,” agar tidak mengklaim setiap bentuk kelelahan otomatis bernilai ibadah." } },
  { ref: [14, 40], themes: ["Struggling to raise children"], why: "Doakan anakmu; itu pun bagian dari mendidiknya", ruling: { verdict: "pas", note: "Pas. Doa Nabi Ibrahim agar dirinya dan keturunannya menegakkan salat sangat relevan ketika ikhtiar mendidik terasa berat. Kalimat aplikasi sudah baik." } },
  // A child who has gone astray
  { ref: [28, 56], themes: ["A child who has gone astray"], why: "Kamu tidak dapat memberi hidayah kepada orang yang kamu cintai; Allah memberi hidayah, sedangkan tugasmu tetap menasihati, mendoakan, dan memberi teladan.", ruling: { verdict: "ganti", note: "Prinsipnya tepat: hidayah hati bukan di tangan orang tua, bahkan terhadap orang yang dicintai. Ganti kalimat menjadi: “Kamu tidak dapat memberi hidayah kepada orang yang kamu cintai; Allah memberi hidayah, sedangkan tugasmu tetap menasihati, mendoakan, dan memberi teladan.”" } },
  // Caring for elderly parents
  { ref: [31, 14], themes: ["Caring for elderly parents"], why: "Bersyukurlah kepada Allah dan kepada kedua orang tua; ingatlah beratnya ibu mengandung dan menyapih.", ruling: { verdict: "ganti", note: "Ayat sangat relevan untuk berbakti dan merawat orang tua, tetapi kalimat sekarang dapat menambah rasa bersalah pada perawat yang sudah kelelahan. Ganti menjadi: “Bersyukurlah kepada Allah dan kepada kedua orang tua; ingatlah beratnya ibu mengandung dan menyapih.”" } },
  { ref: [46, 15], themes: ["Caring for elderly parents"], why: "Berbuat baiklah kepada orang tua; mohon kekuatan untuk mensyukuri nikmat dan beramal saleh yang Allah ridhai.", ruling: { verdict: "ganti", note: "Pas untuk merawat orang tua karena memerintahkan berbuat baik dan mengajarkan doa syukur, tetapi kalimat aplikasi menyatakan sesuatu yang tidak disebut langsung. Ganti menjadi: “Berbuat baiklah kepada orang tua; mohon kekuatan untuk mensyukuri nikmat dan beramal saleh yang Allah ridhai.”" } },
  // Conflict within the family
  { ref: [41, 34], themes: ["Conflict within the family"], why: "Balas keburukan dengan kebaikan, permusuhan bisa berubah jadi kedekatan", ruling: { verdict: "pas", note: "Pas untuk pertengkaran keluarga sebagai prinsip menolak keburukan dengan cara yang lebih baik. Namun, dalam kekerasan atau bahaya nyata, ayat ini tidak menghapus kebutuhan akan batas aman, perlindungan, dan pertolongan." } },
  { ref: [8, 63], themes: ["Conflict within the family"], why: "Hanya Allah yang sanggup menyatukan hati yang saling menjauh", ruling: { verdict: "pas", note: "Pas sebagai pengingat bahwa penyatuan hati berada dalam kuasa Allah. Tetap lakukan sebab-sebab damai—komunikasi, keadilan, dan mediasi—seraya memohon Allah melembutkan hati." } },
  // Being a single parent
  { ref: [19, 24], themes: ["Being a single parent"], why: "Ketika Maryam sendirian dalam kesulitan, Allah menyampaikan kepadanya: jangan bersedih.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk menguatkan pengasuh yang merasa sendirian, tetapi konteksnya adalah Maryam saat melahirkan. Ganti menjadi: “Ketika Maryam sendirian dalam kesulitan, Allah menyampaikan kepadanya: jangan bersedih.”" } },
  { ref: [28, 7], themes: ["Being a single parent"], why: "Allah menenangkan ibu Musa ketika ia takut akan keselamatan anaknya: jangan takut dan jangan bersedih.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk ketakutan seorang ibu, tetapi jangan disamakan begitu saja dengan semua pengalaman orang tua tunggal. Ganti menjadi: “Allah menenangkan ibu Musa ketika ia takut akan keselamatan anaknya: jangan takut dan jangan bersedih.”" } },
  // Worry about the future
  { ref: [33, 3], themes: ["Worry about the future"], why: "Bertawakallah kepada Allah; cukuplah Allah sebagai Pemelihara", ruling: { verdict: "ganti", note: "Pas untuk kekhawatiran masa depan melalui tawakal. Ganti kalimat menjadi: “Bertawakallah kepada Allah; cukuplah Allah sebagai Pemelihara,” agar tidak menyiratkan tawakal berarti berhenti merencanakan atau berikhtiar." } },
  { ref: [46, 13], themes: ["Worry about the future"], why: "Tetap teguh pada Allah, maka tak ada yang perlu ditakutkan", ruling: { verdict: "pas", note: "Pas. Ayat menghubungkan pengakuan ‘Tuhan kami Allah’ dengan istiqamah, lalu meniadakan ketakutan dan kesedihan bagi mereka. Kalimat pendamping sesuai." } },
  // Confusion facing a big decision
  { ref: [18, 24], themes: ["Confusion facing a big decision"], why: "Katakan insya Allah dan mohon agar Tuhan menunjukkan jalan yang lebih dekat kepada kebenaran.", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai doa memohon jalan yang lebih dekat kepada kebenaran, tetapi konteks utamanya adalah adab mengucapkan insya Allah setelah terlupa. Ganti menjadi: “Katakan insya Allah dan mohon agar Tuhan menunjukkan jalan yang lebih dekat kepada kebenaran.”" } },
  { ref: [42, 38], themes: ["Confusion facing a big decision"], why: "Jangan putuskan sendirian; bermusyawarahlah, itu ciri orang beriman", ruling: { verdict: "pas", note: "Pas. Musyawarah disebut sebagai sifat orang beriman bersama salat dan infak. Untuk keputusan pribadi, pilih orang yang amanah, memahami masalah, dan tidak mengambil alih tanggung jawab keputusan." } },
  // Starting over
  { ref: [4, 100], themes: ["Starting over"], why: "Siapa yang berhijrah di jalan Allah akan mendapati tempat yang luas dan rezeki; niat dan arah hijrahnya harus karena Allah.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk memulai lagi bila perpindahan itu benar-benar hijrah menuju ketaatan dan keselamatan agama. Ganti kalimat menjadi: “Siapa yang berhijrah di jalan Allah akan mendapati tempat yang luas dan rezeki; niat dan arah hijrahnya harus karena Allah.”" } },
  // Hope and optimism
  { ref: [93, 5], themes: ["Hope and optimism"], why: "Tuhanmu akan memberi kepadamu hingga engkau ridha—penghiburan Allah kepada Nabi-Nya.", ruling: { verdict: "ganti", note: "Ayat ini adalah penghiburan dan janji khusus Allah kepada Nabi Muhammad. Boleh menjadi sumber harapan, tetapi jangan dijadikan jaminan bahwa semua keinginan setiap orang pasti terpenuhi; ganti menjadi: “Tuhanmu akan memberi kepadamu hingga engkau ridha—penghiburan Allah kepada Nabi-Nya.”" } },
  // Joy and happiness
  { ref: [10, 58], themes: ["Joy and happiness"], why: "Bergembiralah dengan karunia dan rahmat Allah", ruling: { verdict: "pas", note: "Pas. Ayat memerintahkan bergembira karena karunia dan rahmat Allah, yang lebih baik daripada apa yang manusia kumpulkan. Kalimat aplikasi tepat." } },
  { ref: [27, 19], themes: ["Joy and happiness"], why: "Sulaiman tersenyum, lalu memohon agar pandai mensyukuri nikmat-Nya", ruling: { verdict: "pas", note: "Pas untuk mengarahkan kebahagiaan kepada syukur. Nabi Sulaiman tersenyum lalu memohon kemampuan mensyukuri nikmat dan beramal yang diridhai Allah." } },
  { ref: [93, 11], themes: ["Joy and happiness"], why: "Saat bahagia, sebut dan syukuri nikmat Tuhanmu", ruling: { verdict: "pas", note: "Pas. Ayat mengajarkan menyebut nikmat Tuhan dengan syukur. Penyebutan nikmat hendaknya tidak berubah menjadi pamer, merendahkan orang lain, atau membuka hal yang sebaiknya dijaga." } },
  // Growing older
  { ref: [30, 54], themes: ["Growing older"], why: "Lemah, kuat, lalu lemah lagi — semua dalam rencana-Nya", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung menggambarkan fase lemah, kuat, lalu lemah dan beruban sebagai bagian dari penciptaan Allah. Kalimat pendamping sesuai." } },
  // Chronic illness
  { ref: [21, 83], themes: ["Chronic illness"], why: "Doa Ayyub: penyakit ini menimpaku, dan Engkau Maha Penyayang", ruling: { verdict: "pas", note: "Pas. Doa Nabi Ayyub mengajarkan mengadukan penderitaan kepada Allah dengan adab dan tetap mengakui keluasan rahmat-Nya. Ini tidak melarang mencari diagnosis, pengobatan, dan dukungan manusia." } },
  { ref: [21, 84], themes: ["Chronic illness"], why: "Allah mengabulkan doa Ayyub dan mengangkat penderitaannya—kisah rahmat dan harapan, bukan pola hasil yang dijanjikan kepada setiap orang.", ruling: { verdict: "ganti", note: "Kisah ini memberi harapan, tetapi jangan dibaca sebagai janji bahwa semua penyakit menahun pasti sembuh atau semua kehilangan kembali dalam bentuk yang sama. Ganti menjadi: “Allah mengabulkan doa Ayyub dan mengangkat penderitaannya—kisah rahmat dan harapan, bukan pola hasil yang dijanjikan kepada setiap orang.”" } },
  // Divorce
  { ref: [4, 130], themes: ["Divorce"], why: "Jika berpisah, Allah mencukupi keduanya dari karunia-Nya masing-masing", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung berbicara tentang perceraian dan keluasan karunia Allah bagi masing-masing pihak. Kecukupan tidak harus berarti kekayaan segera; maknanya mencakup pertolongan dan jalan hidup yang Allah bukakan menurut hikmah-Nya." } },
  // Betrayal
  { ref: [12, 18], themes: ["Betrayal"], why: "Saat orang terdekat berdusta, kesabaran yang indah adalah jalannya", ruling: { verdict: "pas", note: "Pas. Nabi Ya’qub menghadapi kebohongan orang-orang terdekat dengan ‘kesabaran yang indah’ dan memohon pertolongan Allah. Kesabaran di sini tidak berarti membenarkan pengkhianatan atau menolak mencari kebenaran." } },
  { ref: [12, 90], themes: ["Betrayal"], why: "Yusuf dikhianati saudaranya, namun Allah tak menyia-nyiakan orang yang bersabar", ruling: { verdict: "pas", note: "Pas. Kisah Yusuf menunjukkan bahwa takwa dan kesabaran tidak disia-siakan Allah setelah pengkhianatan panjang. Jangan menjanjikan bahwa pemulihan setiap orang akan mengikuti jalan cerita yang sama." } },
  // Abandonment
  { ref: [93, 6], themes: ["Abandonment"], why: "Bukankah Dia mendapatimu yatim lalu melindungimu?—penghiburan Allah kepada Nabi-Nya yang menumbuhkan harapan akan pemeliharaan-Nya.", ruling: { verdict: "ganti", note: "Ayat ini adalah penghiburan khusus kepada Nabi yang dahulu yatim, bukan pernyataan bahwa beliau sekadar ‘sendirian’. Ganti menjadi: “Bukankah Dia mendapatimu yatim lalu melindungimu?—penghiburan Allah kepada Nabi-Nya yang menumbuhkan harapan akan pemeliharaan-Nya.”" } },
  // Longing
  { ref: [12, 84], themes: ["Longing"], why: "Bahkan seorang nabi menangis sampai matanya memutih karena rindu", ruling: { verdict: "pas", note: "Pas. Al-Qur’an mengakui kesedihan dan rindu Nabi Ya’qub tanpa mencelanya. Gunakan dengan lembut dan jangan menyimpulkan bahwa kesedihan mendalam selalu berarti kurang iman." } },
  { ref: [12, 87], themes: ["Longing"], why: "Selama merindu, jangan pernah berputus asa dari rahmat Allah", ruling: { verdict: "pas", note: "Pas. Nabi Ya’qub tetap menyuruh mencari Yusuf dan melarang berputus asa dari kelapangan serta rahmat Allah. Ayat menggabungkan harapan dengan ikhtiar nyata." } },
  // Poverty
  { ref: [93, 8], themes: ["Poverty"], why: "Dia mendapatimu kekurangan lalu memberi kecukupan—penghiburan kepada Nabi yang menumbuhkan harapan, bukan janji cepat kaya bagi setiap orang.", ruling: { verdict: "ganti", note: "Ayat ini mengingatkan nikmat khusus Allah kepada Nabi yang dahulu kekurangan lalu dicukupkan. Ganti menjadi: “Dia mendapatimu kekurangan lalu memberi kecukupan—penghiburan kepada Nabi yang menumbuhkan harapan, bukan janji cepat kaya bagi setiap orang.”" } },
  { ref: [67, 15], themes: ["Poverty"], why: "Bumi dibentangkan untukmu; melangkahlah, rezeki-Nya ada di sana", ruling: { verdict: "pas", note: "Pas. Ayat memerintahkan berjalan di penjuru bumi dan memakan rezeki Allah, sehingga menggabungkan ikhtiar dengan kesadaran bahwa rezeki berasal dari-Nya." } },
  // Fear of poverty
  { ref: [15, 21], themes: ["Fear of poverty"], why: "Segala sesuatu memiliki khazanah di sisi Allah dan diturunkan dengan ukuran tertentu; tetaplah berikhtiar secara halal.", ruling: { verdict: "ganti", note: "Cocok untuk meredakan kecemasan, tetapi teksnya berbicara luas tentang khazanah segala sesuatu, bukan saldo pribadi yang sudah pasti. Ganti menjadi: “Segala sesuatu memiliki khazanah di sisi Allah dan diturunkan dengan ukuran tertentu; tetaplah berikhtiar secara halal.”" } },
  // Stinginess
  { ref: [17, 29], themes: ["Stinginess"], why: "Jangan menggenggam terlalu erat, jangan pula menghambur; ambil tengahnya", ruling: { verdict: "pas", note: "Pas. Ayat mengajarkan jalan tengah antara kikir dan boros. Kalimat aplikasi sesuai dan praktis." } },
  { ref: [64, 16], themes: ["Stinginess"], why: "Bertakwalah sesanggupmu; berilah, itu kebaikan untuk dirimu sendiri", ruling: { verdict: "pas", note: "Pas. Ayat memerintahkan takwa sesuai kemampuan, mendengar, taat, dan berinfak; keselamatan dari kekikiran diri disebut sebagai keberuntungan." } },
  // Never enough
  { ref: [102, 1], themes: ["Never enough"], why: "Berlomba memperbanyak dan bermegah-megahan telah melalaikanmu.", ruling: { verdict: "ganti", note: "Maknanya cocok, tetapi kalimat aplikasi memasukkan isi ayat 2 sementara yang ditampilkan hanya ayat 1. Tampilkan QS 102:1–2 bersama, atau ganti kalimat menjadi: “Berlomba memperbanyak dan bermegah-megahan telah melalaikanmu.”" } },
  { ref: [63, 9], themes: ["Never enough"], why: "Jangan biarkan harta dan anak melalaikanmu dari mengingat-Nya", ruling: { verdict: "pas", note: "Pas. Ayat langsung memperingatkan agar harta dan anak tidak melalaikan dari mengingat Allah. Ini mengoreksi rasa tidak pernah cukup tanpa mencela kepemilikan yang halal." } },
  // Contentment
  { ref: [28, 60], themes: ["Contentment"], why: "Yang ada di sisi Allah lebih baik dan lebih kekal", ruling: { verdict: "pas", note: "Pas untuk qanaah. Ayat menempatkan kenikmatan dunia sebagai sementara dan menegaskan bahwa yang di sisi Allah lebih baik serta lebih kekal." } },
  { ref: [16, 96], themes: ["Contentment"], why: "Milikmu akan habis; yang di sisi Allah tetap kekal", ruling: { verdict: "pas", note: "Pas. Ayat membandingkan apa yang ada pada manusia yang akan lenyap dengan apa yang ada di sisi Allah yang kekal, lalu menguatkan orang yang sabar." } },
  // Giving
  { ref: [2, 261], themes: ["Giving"], why: "Satu biji yang kamu tanam menjadi tujuh tangkai berbuah", ruling: { verdict: "pas", note: "Pas. Perumpamaan satu benih menjadi tujuh bulir menegaskan pelipatgandaan pahala infak di jalan Allah. Jangan membatasi ‘di jalan Allah’ hanya pada perang bila terjemahan pendamping dapat dibuat lebih luas dan tepat." } },
  { ref: [2, 274], themes: ["Giving"], why: "Yang memberi diam-diam maupun terang: tak ada takut, tak ada sedih", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung memuji orang yang berinfak malam dan siang, sembunyi maupun terang, serta menjanjikan pahala di sisi Allah." } },
  { ref: [34, 39], themes: ["Giving"], why: "Apa yang kamu infakkan, Allah menggantinya menurut hikmah-Nya; Dia sebaik-baik Pemberi rezeki.", ruling: { verdict: "ganti", note: "Pas untuk sedekah, tetapi ‘Allah menggantinya’ jangan dipersempit menjadi pengembalian uang segera atau jumlah yang sama. Ganti menjadi: “Apa yang kamu infakkan, Allah menggantinya menurut hikmah-Nya; Dia sebaik-baik Pemberi rezeki.”" } },
  // Envy of wealth
  { ref: [20, 131], themes: ["Envy of wealth"], why: "Jangan tujukan matamu ke milik orang lain; itu ujian", ruling: { verdict: "pas", note: "Pas. Ayat langsung melarang memanjangkan pandangan kepada kemewahan yang diberikan kepada kelompok lain dan mengingatkan bahwa rezeki Tuhan lebih baik serta lebih kekal." } },
  { ref: [15, 88], themes: ["Envy of wealth"], why: "Jangan melirik milik mereka, jangan pula bersedih karenanya", ruling: { verdict: "pas", note: "Pas. Ayat melarang mengarahkan pandangan kepada kenikmatan kelompok lain dan larut dalam kesedihan karenanya. Kalimat aplikasi sesuai." } },
  // Shame
  { ref: [25, 70], themes: ["Shame"], why: "Bagi yang kembali, Allah menukar dosa-dosa itu dengan pahala", ruling: { verdict: "pas", note: "Pas untuk malu karena dosa, dengan syarat taubat, iman, dan amal saleh disebut jelas. Jangan menyederhanakan pesan menjadi penghapusan otomatis tanpa perubahan nyata." } },
  { ref: [11, 114], themes: ["Shame"], why: "Kebaikan menghapus keburukan; dosa besar dan hak manusia tetap memerlukan taubat serta perbaikan khusus.", ruling: { verdict: "ganti", note: "Boleh dipakai, tetapi jangan memberi kesan bahwa semua dosa terhapus hanya dengan kebaikan tambahan. Ganti menjadi: “Kebaikan menghapus keburukan; dosa besar dan hak manusia tetap memerlukan taubat serta perbaikan khusus.”" } },
  // Regret over the past
  { ref: [2, 37], themes: ["Regret over the past"], why: "Adam pun pernah jatuh, dan taubatnya diterima Allah", ruling: { verdict: "pas", note: "Pas. Nabi Adam menerima kalimat-kalimat taubat dari Tuhannya, lalu Allah menerima taubatnya. Ini menumbuhkan harapan setelah penyesalan tanpa meremehkan kesalahan." } },
  { ref: [3, 133], themes: ["Regret over the past"], why: "Jangan berlama-lama di masa lalu; bergegaslah menuju ampunan-Nya", ruling: { verdict: "pas", note: "Pas. Ayat mengarahkan orang agar segera berlomba menuju ampunan dan surga, sehingga penyesalan diubah menjadi langkah taubat, bukan tenggelam dalam masa lalu." } },
  // Insecurity / feeling inferior
  { ref: [49, 11], themes: ["Insecurity / feeling inferior"], why: "Yang direndahkan orang bisa jadi lebih baik di sisi Allah", ruling: { verdict: "pas", note: "Pas. Ayat melarang saling merendahkan dan mengingatkan bahwa orang yang direndahkan boleh jadi lebih baik di sisi Allah. Kalimat pendamping sesuai." } },
  { ref: [49, 13], themes: ["Insecurity / feeling inferior"], why: "Ukuran kemuliaan bukan status, melainkan takwa di sisi Allah", ruling: { verdict: "pas", note: "Pas. Ayat menegaskan kesetaraan asal manusia dan bahwa ukuran kemuliaan di sisi Allah adalah takwa, bukan suku, status, atau penampilan." } },
  // Feeling worthless or useless
  { ref: [21, 94], themes: ["Feeling worthless or useless"], why: "Tidak ada satu pun kebaikanmu yang disia-siakan Allah", ruling: { verdict: "pas", note: "Pas. Ayat menegaskan bahwa amal saleh seorang mukmin tidak diingkari dan dicatat. Ini tepat untuk orang yang merasa jerih payahnya tidak berguna." } },
  { ref: [99, 7], themes: ["Feeling worthless or useless"], why: "Sekecil debu pun kebaikanmu tetap terlihat dan berbalas", ruling: { verdict: "pas", note: "Pas. Kebaikan seberat zarrah pun akan dilihat. Kalimat pendamping tepat selama tidak dipakai untuk mengecilkan kebutuhan akan amal yang lebih besar dan konsisten." } },
  { ref: [64, 3], themes: ["Feeling worthless or useless"], why: "Allah membentukmu dengan baik menurut hikmah-Nya; kepada-Nya seluruh perjalanan kembali.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk rasa rendah diri, tetapi jangan menjadikannya klaim tentang standar rupa atau tubuh tertentu. Ganti menjadi: “Allah membentukmu dengan baik menurut hikmah-Nya; kepada-Nya seluruh perjalanan kembali.”" } },
  // Feeling unloved
  { ref: [93, 3], themes: ["Feeling unloved"], why: "Tuhanmu tidak meninggalkan dan tidak membenci Nabi-Nya—ayat penghiburan bagi hati yang merasa jauh dari kasih Allah.", ruling: { verdict: "ganti", note: "Ayat ini adalah penghiburan Allah kepada Nabi Muhammad bahwa beliau tidak ditinggalkan dan tidak dibenci. Ganti menjadi: “Tuhanmu tidak meninggalkan dan tidak membenci Nabi-Nya—ayat penghiburan bagi hati yang merasa jauh dari kasih Allah.”" } },
  { ref: [3, 31], themes: ["Feeling unloved"], why: "Ikutilah Rasulullah; Allah akan mencintai dan mengampuni dosa-dosamu.", ruling: { verdict: "ganti", note: "Cocok untuk mencari cinta Allah, tetapi kalimat harus menyebut jalannya dengan jelas. Ganti menjadi: “Ikutilah Rasulullah; Allah akan mencintai dan mengampuni dosa-dosamu.”" } },
  // Emptiness / life feels meaningless
  { ref: [16, 97], themes: ["Emptiness / life feels meaningless"], why: "Iman dan amal kecil pun membuahkan kehidupan yang baik", ruling: { verdict: "pas", note: "Pas. Ayat menjanjikan kehidupan yang baik bagi laki-laki atau perempuan yang beramal saleh dalam keadaan beriman. Jangan menyempitkan ‘kehidupan yang baik’ hanya menjadi kenyamanan materi." } },
  { ref: [23, 115], themes: ["Emptiness / life feels meaningless"], why: "Kamu tidak diciptakan tanpa maksud; hidupmu punya tujuan", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung menolak anggapan bahwa manusia diciptakan sia-sia dan tidak akan kembali kepada Allah. Ini kuat untuk rasa hampa dan kehilangan tujuan." } },
  { ref: [67, 2], themes: ["Emptiness / life feels meaningless"], why: "Hidup dan mati diadakan agar terlihat siapa terbaik amalnya", ruling: { verdict: "pas", note: "Pas. Hidup dan mati disebut sebagai ujian untuk melihat siapa yang terbaik amalnya. Sampaikan dengan lembut agar orang yang sedang rapuh tidak merasa hidupnya hanya dinilai dari produktivitas." } },
  // Wanting to change and become better
  { ref: [20, 82], themes: ["Wanting to change and become better"], why: "Bertaubat, beramal, lalu bertahan di jalan itu — Allah mengampuni", ruling: { verdict: "pas", note: "Pas. Ayat menggabungkan taubat, iman, amal saleh, dan keteguhan di jalan petunjuk. Ini memberi arah perubahan yang utuh, bukan sekadar niat sesaat." } },
  // Being bullied
  { ref: [33, 58], themes: ["Being bullied"], why: "Menyakiti orang beriman tanpa kesalahan yang mereka lakukan adalah fitnah dan dosa yang nyata.", ruling: { verdict: "ganti", note: "Pas untuk orang yang disakiti atau direndahkan tanpa alasan yang benar, tetapi jangan berkata mutlak ‘kamu tidak bersalah’. Ganti menjadi: “Menyakiti orang beriman tanpa kesalahan yang mereka lakukan adalah fitnah dan dosa yang nyata.”" } },
  { ref: [3, 186], themes: ["Being bullied"], why: "Kamu akan mendengar banyak ucapan menyakitkan; sabar dan takwa adalah keteguhan yang besar.", ruling: { verdict: "ganti", note: "Boleh dipakai ketika seseorang menghadapi ucapan menyakitkan karena imannya, tetapi konteksnya adalah ujian harta, jiwa, dan gangguan dari kelompok penentang. Ganti kalimat agar tidak menormalisasi perundungan: “Kamu akan mendengar banyak ucapan menyakitkan; sabar dan takwa adalah keteguhan yang besar.”" } },
  // Being slandered
  { ref: [33, 69], themes: ["Being slandered"], why: "Musa pun difitnah, lalu Allah sendiri yang membersihkannya", ruling: { verdict: "pas", note: "Pas. Ayat mengingatkan agar tidak seperti orang yang menyakiti Nabi Musa, lalu Allah membersihkannya dari tuduhan mereka. Ini memberi harapan tanpa menyuruh korban membalas fitnah dengan fitnah." } },
  { ref: [24, 11], themes: ["Being slandered"], why: "Dalam peristiwa ifk, Allah membersihkan tuduhan dan menampakkan hikmah; jangan menjanjikan bahwa setiap fitnah akan terasa baik atau selesai dengan cara yang sama.", ruling: { verdict: "ganti", note: "Ayat ini terkait peristiwa fitnah besar terhadap keluarga Nabi dan hikmah yang Allah keluarkan darinya. Ganti menjadi: “Dalam peristiwa ifk, Allah membersihkan tuduhan dan menampakkan hikmah; jangan menjanjikan bahwa setiap fitnah akan terasa baik atau selesai dengan cara yang sama.”" } },
  // Feeling hatred
  { ref: [5, 8], themes: ["Feeling hatred"], why: "Jangan biarkan bencimu membuatmu berlaku tidak adil kepadanya", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung melarang kebencian mendorong ketidakadilan dan memerintahkan berlaku adil karena itu lebih dekat kepada takwa." } },
  { ref: [17, 53], themes: ["Feeling hatred"], why: "Jawablah celaan dengan kata terbaik; setan senang mengadu domba", ruling: { verdict: "pas", note: "Pas. Allah memerintahkan hamba-hamba-Nya mengucapkan yang terbaik karena setan menimbulkan perselisihan di antara manusia. Kalimat pendamping sesuai." } },
  // Wanting revenge
  { ref: [42, 43], themes: ["Wanting revenge"], why: "Sabar dan memaafkan itu tanda hati yang teguh, bukan lemah", ruling: { verdict: "pas", note: "Pas. Kesabaran dan memaafkan disebut sebagai perkara yang memerlukan keteguhan hati. Memaafkan tidak selalu berarti menghapus batas, keadilan, atau konsekuensi yang diperlukan." } },
  { ref: [42, 40], themes: ["Wanting revenge"], why: "Kamu berhak membalas setimpal, tapi pahala pemaaf ditanggung Allah", ruling: { verdict: "pas", note: "Pas. Ayat mengakui hak balasan yang setimpal sekaligus memuliakan pemaafan dan perbaikan. Ini menjaga keseimbangan antara keadilan dan ihsan." } },
  { ref: [12, 92], themes: ["Wanting revenge"], why: "Yusuf berkuasa membalas, namun ia memilih berkata: tidak ada cercaan", ruling: { verdict: "pas", note: "Pas. Nabi Yusuf memiliki kuasa untuk membalas, tetapi memilih tidak mencela dan mendoakan ampunan. Ini adalah teladan pemaafan setelah kebenaran tampak." } },
  // Losing a friend
  { ref: [4, 69], themes: ["Losing a friend"], why: "Ketaatan mengantarkan kepada kebersamaan dengan para nabi, siddiq, syuhada, dan orang saleh—mereka sebaik-baik teman.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk menguatkan orang yang kehilangan sahabat, tetapi konteksnya adalah kebersamaan di akhirat bagi orang yang taat kepada Allah dan Rasul. Ganti menjadi: “Ketaatan mengantarkan kepada kebersamaan dengan para nabi, siddiq, syuhada, dan orang saleh—mereka sebaik-baik teman.”" } },
  // Trouble with neighbours
  { ref: [4, 36], themes: ["Trouble with neighbours"], why: "Berbuat baik kepada tetangga dekat dan jauh, itu perintah Allah", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung memerintahkan berbuat baik kepada tetangga dekat dan jauh bersama kelompok lain yang berhak diperlakukan dengan ihsan." } },
  { ref: [49, 6], themes: ["Trouble with neighbours"], why: "Jika datang berita dari sumber yang tidak dapat dipercaya, telitilah agar tidak mencelakakan orang lalu menyesal.", ruling: { verdict: "ganti", note: "Pas bila masalah tetangga dipicu kabar atau tuduhan, bukan sebagai jawaban untuk semua konflik. Ganti menjadi: “Jika datang berita dari sumber yang tidak dapat dipercaya, telitilah agar tidak mencelakakan orang lalu menyesal.”" } },
  { ref: [24, 27], themes: ["Trouble with neighbours"], why: "Menghormati batas rumah orang lain menjaga damainya bertetangga", ruling: { verdict: "pas", note: "Pas. Ayat mengatur izin dan salam sebelum memasuki rumah orang lain, sehingga sangat relevan untuk menjaga privasi dan adab bertetangga." } },
  // Wanting to reconcile
  { ref: [49, 10], themes: ["Wanting to reconcile"], why: "Kalian bersaudara; damaikanlah, semoga kalian diberi rahmat", ruling: { verdict: "pas", note: "Pas. Ayat menyebut orang beriman bersaudara dan memerintahkan mendamaikan dua pihak yang berselisih. Perdamaian harus tetap berlandaskan keadilan, bukan sekadar menekan korban agar diam." } },
  { ref: [4, 114], themes: ["Wanting to reconcile"], why: "Mendamaikan yang berselisih adalah bicara paling bernilai di sisi Allah", ruling: { verdict: "pas", note: "Pas. Pembicaraan rahasia umumnya tidak bernilai kecuali yang memerintahkan sedekah, kebaikan, atau mendamaikan manusia. Kalimat aplikasi sesuai." } },
  // Despair
  { ref: [42, 28], themes: ["Despair"], why: "Allah menurunkan hujan setelah manusia berputus asa dan menyebarkan rahmat-Nya—tanda keluasan kuasa-Nya.", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai tanda bahwa Allah menurunkan hujan setelah manusia berputus asa, tetapi jangan dijadikan jadwal pasti datangnya pertolongan pribadi. Ganti menjadi: “Allah menurunkan hujan setelah manusia berputus asa dan menyebarkan rahmat-Nya—tanda keluasan kuasa-Nya.”" } },
  // Anger at fate
  { ref: [57, 22], themes: ["Anger at fate"], why: "Tidak ada yang menimpamu tanpa sudah tercatat sebelum dunia ada", ruling: { verdict: "pas", note: "Pas untuk menerima takdir. Ayat menegaskan bahwa musibah di bumi dan diri telah tercatat sebelum diwujudkan; ini tidak melarang berduka, berobat, menuntut keadilan, atau memperbaiki sebab." } },
  // Prayers unanswered
  { ref: [19, 4], themes: ["Prayers unanswered"], why: "Zakaria tetap memohon kepada Allah meski tubuhnya lemah dan rambutnya beruban; doa tidak menuntut hasil yang segera.", ruling: { verdict: "ganti", note: "Pas sebagai teladan tetap berdoa ketika usia dan keadaan terasa tidak mendukung, tetapi ayat ini belum memuat jawaban doanya. Ganti menjadi: “Zakaria tetap memohon kepada Allah meski tubuhnya lemah dan rambutnya beruban; doa tidak menuntut hasil yang segera.”" } },
  { ref: [21, 90], themes: ["Prayers unanswered"], why: "Allah mengabulkan doa Zakaria dan memperbaiki keadaan keluarganya—kisah harapan, bukan pola hasil yang wajib terulang.", ruling: { verdict: "ganti", note: "Kisah ini memberi harapan bahwa Allah mampu mengabulkan doa setelah penantian, tetapi jangan dijadikan jaminan bentuk jawaban yang sama. Ganti menjadi: “Allah mengabulkan doa Zakaria dan memperbaiki keadaan keluarganya—kisah harapan, bukan pola hasil yang wajib terulang.”" } },
  { ref: [27, 62], themes: ["Prayers unanswered"], why: "Siapakah yang mengabulkan doa orang yang terdesak dan menghilangkan kesusahan selain Allah?", ruling: { verdict: "ganti", note: "Pas sebagai seruan tauhid dan harapan ketika terdesak, tetapi hindari janji bahwa jawaban selalu datang seketika atau sesuai keinginan. Ganti menjadi: “Siapakah yang mengabulkan doa orang yang terdesak dan menghilangkan kesusahan selain Allah?”" } },
  // Far from God
  { ref: [57, 4], themes: ["Far from God"], why: "Allah mengetahui kalian di mana pun berada; tidak ada keadaanmu yang luput dari pengawasan-Nya.", ruling: { verdict: "ganti", note: "Pas untuk rasa jauh dari Allah, tetapi kebersamaan Allah dipahami melalui ilmu, pengawasan, pertolongan, dan kuasa-Nya, bukan keberadaan fisik di dalam makhluk. Ganti menjadi: “Allah mengetahui kalian di mana pun berada; tidak ada keadaanmu yang luput dari pengawasan-Nya.”" } },
  { ref: [3, 8], themes: ["Far from God"], why: "Doa bagi hati yang takut menjauh setelah pernah diberi petunjuk", ruling: { verdict: "pas", note: "Pas. Ini doa orang berilmu agar hati tidak disimpangkan setelah mendapat petunjuk dan agar diberi rahmat. Sangat tepat untuk rasa takut menjauh dari Allah." } },
  // Fear of insincerity
  // 23:60 + 23:61 RESTORED (2026-07-23) on the ustadz's 2026-07-22 ruling: ship 23:57–61 as one
  // passage. The referent-less-fragment problem the 2026-07-20 review flagged — 23:61 opens "mereka
  // itulah" pointing at nobody, 23:60 is the trembling heart — is exactly what co-display resolves:
  // both are shown inside 23:57–61, so neither ever stands alone. See docs/review/fragment-review.md.
  { ref: [23, 60], themes: ["Fear of insincerity"], why: "Mereka beramal sambil takut karena akan kembali kepada Tuhan.", ruling: { verdict: "ganti", note: "Maknanya sangat tepat untuk takut amal tidak diterima, sebagaimana penjelasan hadis tentang orang yang salat, puasa, dan bersedekah namun tetap takut. Tampilkan bersama QS 23:57–61 atau minimal 23:60–61; ganti kalimat menjadi: “Mereka beramal sambil takut karena akan kembali kepada Tuhan.”" }, codisplay: { range: [57, 61], note: "Tampilkan bersama QS 23:57–61 atau minimal 23:60–61." } },
  { ref: [23, 61], themes: ["Fear of insincerity"], why: "Mereka itulah yang bersegera dalam kebaikan dan menjadi yang terdepan melakukannya.", ruling: { verdict: "ganti", note: "Ayat ini adalah kelanjutan yang menjelaskan bahwa orang-orang dengan rasa takut tersebut justru bersegera dalam kebaikan. Tampilkan bersama QS 23:60 dan gunakan kalimat: “Mereka itulah yang bersegera dalam kebaikan dan menjadi yang terdepan melakukannya.”" }, codisplay: { range: [57, 61], note: "Tampilkan bersama QS 23:57–61." } },
  // Struggling with consistency
  { ref: [73, 20], themes: ["Struggling with consistency"], why: "Allah mengetahui keterbatasan kalian dalam salat malam, lalu memberi keringanan; lakukan yang mampu secara konsisten.", ruling: { verdict: "ganti", note: "Ayat ini memberi keringanan khusus dalam qiyamullail setelah Allah mengetahui keterbatasan umat, bukan izin umum meninggalkan kewajiban. Ganti menjadi: “Allah mengetahui keterbatasan kalian dalam salat malam, lalu memberi keringanan; lakukan yang mampu secara konsisten.”" } },
  // Burnout
  { ref: [94, 2], themes: ["Burnout"], why: "Bukankah Kami telah melapangkan dadamu dan mengangkat bebanmu?—penghiburan Allah kepada Nabi-Nya.", ruling: { verdict: "ganti", note: "Ayat ini adalah penghiburan khusus kepada Nabi tentang beban yang Allah angkat. Boleh memberi harapan, tetapi jangan dijadikan janji bahwa semua beban segera hilang; ganti menjadi: “Bukankah Kami telah melapangkan dadamu dan mengangkat bebanmu?—penghiburan Allah kepada Nabi-Nya.”" } },
  { ref: [78, 9], themes: ["Burnout"], why: "Tidurmu bukan kelemahan, itu penenang yang Allah sediakan", ruling: { verdict: "pas", note: "Pas. Allah menjadikan tidur sebagai waktu istirahat. Ini mengoreksi anggapan bahwa kebutuhan istirahat selalu berarti malas atau gagal." } },
  { ref: [28, 73], themes: ["Burnout"], why: "Malam untuk beristirahat itu rahmat, bukan waktu yang terbuang", ruling: { verdict: "pas", note: "Pas. Pergantian malam untuk beristirahat dan siang untuk mencari karunia disebut sebagai rahmat Allah. Kalimat pendamping sesuai." } },
  // Overwhelm
  { ref: [4, 28], themes: ["Overwhelm"], why: "Allah tahu manusia diciptakan lemah, dan Dia meringankan bebannya", ruling: { verdict: "pas", note: "Pas. Dalam konteks keringanan syariat, Allah menyatakan hendak meringankan beban karena manusia diciptakan lemah. Ini menumbuhkan rahmat tanpa menghapus tanggung jawab." } },
  { ref: [23, 62], themes: ["Overwhelm"], why: "Tidak ada yang dibebani di luar kemampuannya, termasuk kamu", ruling: { verdict: "pas", note: "Pas. Allah tidak membebani seseorang kecuali sesuai kesanggupannya, dan catatan di sisi-Nya berbicara benar. Hindari memakai ayat ini untuk menyalahkan orang yang sedang kewalahan atau menolak bantuan." } },
  // Laziness
  { ref: [92, 7], themes: ["Laziness"], why: "Bagi yang memberi, bertakwa, dan membenarkan kebaikan, Allah memudahkan jalan menuju kemudahan.", ruling: { verdict: "ganti", note: "Boleh dipakai, tetapi ayat ini bergantung pada syarat di ayat sebelumnya: memberi, bertakwa, dan membenarkan pahala terbaik. Tampilkan QS 92:5–7 bersama dan ganti menjadi: “Bagi yang memberi, bertakwa, dan membenarkan kebaikan, Allah memudahkan jalan menuju kemudahan.”" }, codisplay: { range: [5, 7], note: "Tampilkan QS 92:5–7 bersama." } },
  // JobLoss
  { ref: [29, 62], themes: ["JobLoss"], why: "Allah melapangkan dan menyempitkan rezeki bagi siapa yang Dia kehendaki; Dia mengetahui keadaan hamba-hamba-Nya.", ruling: { verdict: "ganti", note: "Pas untuk kehilangan pekerjaan sebagai pengingat bahwa keluasan dan kesempitan rezeki berada dalam ilmu Allah, tetapi bukan janji pekerjaan baru segera. Ganti menjadi: “Allah melapangkan dan menyempitkan rezeki bagi siapa yang Dia kehendaki; Dia mengetahui keadaan hamba-hamba-Nya.”" } },
  { ref: [42, 12], themes: ["JobLoss"], why: "Milik Allah kunci-kunci langit dan bumi; Dia melapangkan dan menyempitkan rezeki menurut ilmu-Nya.", ruling: { verdict: "ganti", note: "Pas sebagai penguatan bahwa kunci langit dan bumi milik Allah, tetapi kalimat ‘satu pintu tertutup bukan akhir’ adalah refleksi, bukan teks ayat. Ganti menjadi: “Milik Allah kunci-kunci langit dan bumi; Dia melapangkan dan menyempitkan rezeki menurut ilmu-Nya.”" } },
  // Direction
  { ref: [1, 6], themes: ["Direction"], why: "Doa paling sederhana saat tak tahu harus ke mana", ruling: { verdict: "pas", note: "Pas. Doa memohon jalan yang lurus adalah permohonan paling mendasar ketika arah hidup tidak jelas. Ia dibaca berulang dalam setiap rakaat dan harus diikuti usaha mencari ilmu serta nasihat yang baik." } },
  // StudyStress
  { ref: [20, 26], themes: ["StudyStress"], why: "Mudahkanlah urusanku, lepaskan kekakuan lidahku, agar mereka memahami ucapanku.", ruling: { verdict: "ganti", note: "Boleh dipakai, tetapi ayat ini adalah bagian dari rangkaian doa Nabi Musa, bukan dua kata yang berdiri sendiri untuk ujian sekolah. Tampilkan QS 20:25–28 dan gunakan: “Mudahkanlah urusanku, lepaskan kekakuan lidahku, agar mereka memahami ucapanku.”" }, codisplay: { range: [25, 28], note: "Tampilkan QS 20:25–28 bersama." } },
  { ref: [20, 25], themes: ["StudyStress"], why: "Ya Tuhanku, lapangkanlah dadaku.", ruling: { verdict: "ganti", note: "Boleh dibaca saat menghadapi ujian sebagai doa memohon kelapangan dada, tetapi konteksnya adalah Nabi Musa menerima tugas dakwah yang berat. Tampilkan bersama QS 20:25–28 dan ganti menjadi: “Ya Tuhanku, lapangkanlah dadaku.”" }, codisplay: { range: [25, 28], note: "Tampilkan bersama QS 20:25–28." } },
  { ref: [96, 5], themes: ["StudyStress"], why: "Dia yang mengajari manusia apa yang belum diketahuinya", ruling: { verdict: "pas", note: "Pas. Ayat menegaskan bahwa Allah mengajarkan manusia apa yang sebelumnya tidak diketahui. Ini baik untuk belajar selama disertai usaha, disiplin, dan kejujuran akademik." } },
  // EffortNotEnough
  { ref: [3, 195], themes: ["EffortNotEnough"], why: "Allah tidak menyia-nyiakan amal siapa pun, laki-laki maupun perempuan", ruling: { verdict: "pas", note: "Pas. Allah menegaskan tidak menyia-nyiakan amal siapa pun, laki-laki maupun perempuan. Kalimat pendamping tepat." } },
  { ref: [4, 40], themes: ["EffortNotEnough"], why: "Sebesar zarrah pun tak hilang, malah dilipatgandakan", ruling: { verdict: "pas", note: "Pas. Allah tidak menzalimi walau seberat zarrah dan melipatgandakan kebaikan. Ini kuat untuk orang yang merasa usahanya terlalu kecil." } },
  { ref: [18, 30], themes: ["EffortNotEnough"], why: "Yang kamu kerjakan dengan baik tidak akan disia-siakan", ruling: { verdict: "pas", note: "Pas. Ayat secara langsung menegaskan bahwa Allah tidak menyia-nyiakan pahala orang yang beriman dan beramal saleh dengan baik." } },

  // ── Expanded feeling corpus (docs/review/feelings-expansion.md) ──
  // Envy & comparison
  // 113:5 DROPPED (fragment review, 2026-07-20). Al-Falaq is one unbroken du'a: the verb "aku
  // berlindung" lives in 113:1 and every later ayah hangs off it. Served alone the card reads "dan
  // dari kejahatan pendengki bila ia dengki\"" — opening with "dan dari", and closing on a quotation
  // mark that has no opening, which is the excision showing through to the reader. Envy & comparison
  // keeps 4:32. Proposed for the ustadz: ship Al-Falaq whole, the way it is actually recited.

  // Parents
  { ref: [71, 28], themes: ["Parents"], why: "Nabi Nuh memohon ampun untuk dirinya, kedua orang tuanya, dan orang-orang beriman", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai contoh doa Nabi Nuh untuk orang tua dan orang beriman, tetapi ayat penuhnya juga berisi doa terhadap orang zalim. Ganti kalimat menjadi: “Nabi Nuh memohon ampun untuk dirinya, kedua orang tuanya, dan orang-orang beriman,” serta jangan memotong akhir ayat tanpa penjelasan." } },
  // Injustice & being wronged
  // Temptation & desire
  { ref: [2, 183], themes: ["Temptation & desire"], why: "Puasa diwajibkan agar kamu bertakwa; ia melatih pengendalian diri di bawah ketaatan kepada Allah.", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai jalan praktis menghadapi hawa nafsu, tetapi tujuan teksnya adalah takwa, bukan sekadar penekanan dorongan. Ganti menjadi: “Puasa diwajibkan agar kamu bertakwa; ia melatih pengendalian diri di bawah ketaatan kepada Allah.”" } },
  // Marriage & spouse
  { ref: [2, 187], themes: ["Marriage & spouse"], why: "Mereka adalah pakaian bagimu dan kamu adalah pakaian bagi mereka—kedekatan, perlindungan, dan kehormatan yang timbal balik.", ruling: { verdict: "ganti", note: "Cocok untuk pernikahan karena menggambarkan suami-istri sebagai pakaian satu sama lain, tetapi ayat penuhnya membahas hukum malam Ramadan. Ganti kalimat menjadi: “Mereka adalah pakaian bagimu dan kamu adalah pakaian bagi mereka—kedekatan, perlindungan, dan kehormatan yang timbal balik.”" } },
  // Waiting for a spouse
  // Worry about the future
  { ref: [31, 34], themes: ["Worry about the future"], why: "Tak seorang pun mengetahui pasti apa yang akan diusahakannya besok; Allah Maha Mengetahui—maka rencanakan, berikhtiar, dan serahkan hasil kepada-Nya.", caveat: "Ayat ini utamanya tentang ilmu Allah yang eksklusif (kiamat, hujan, rahim). Pemakaian pastoralnya adalah lepaskan cemas atas hal yang memang bukan wilayahmu — mohon dicek apakah pembingkaian ini dapat diterima ustadz.", ruling: { verdict: "ganti", note: "Cocok untuk menerima keterbatasan pengetahuan tentang masa depan, tetapi jangan menjadikannya alasan pasif. Ganti menjadi: “Tak seorang pun mengetahui pasti apa yang akan diusahakannya besok; Allah Maha Mengetahui—maka rencanakan, berikhtiar, dan serahkan hasil kepada-Nya.”" } },
  // Confusion facing a big decision
  { ref: [2, 216], themes: ["Heartbreak"], why: "Yang kamu tolak bisa jadi baik; Allah tahu, kamu tidak", caveat: "Teks tafsiriyah mempersempit maknanya ke perintah agama; versi Kemenag tetap umum. Reviewer perlu memutuskan terjemahan mana yang ditampilkan", ruling: { verdict: "cabut", note: "Jangan dipakai sebagai panduan umum ketika bingung memilih. Konteks langsungnya adalah kewajiban berperang, dan potongan ‘boleh jadi kamu membenci sesuatu’ tidak menggantikan istikharah, musyawarah, ilmu, dan penilaian maslahat." } },
  // Chronic illness
  { ref: [10, 57], themes: ["Chronic illness", "Heartbreak"], why: "Al-Qur’an adalah pelajaran dan penawar bagi penyakit dalam dada, sekalipun kesembuhan jasmani tetap memerlukan ikhtiar dan ketetapan Allah.", caveat: "Yang dimaksud obat penawar di sini adalah penyakit hati, bukan penyakit fisik. Pastikan teks pendamping tidak terbaca sebagai janji kesembuhan jasmani.", ruling: { verdict: "ganti", note: "Boleh dipakai karena kalimat pendamping sudah membedakan penyakit tubuh dari penyakit hati. Ganti menjadi lebih tegas: “Al-Qur’an adalah pelajaran dan penawar bagi penyakit dalam dada, sekalipun kesembuhan jasmani tetap memerlukan ikhtiar dan ketetapan Allah.”" } },
  // Divorce
  { ref: [2, 237], themes: ["Divorce"], why: "Berpisahlah tanpa melupakan kebaikan yang pernah ada di antara kalian", caveat: "Bagian terbesar ayat ini adalah aturan pembagian maskawin; sisi pastoralnya hanya pada kalimat janganlah kalian melupakan kebaikan di antara kalian", ruling: { verdict: "pas", note: "Pas, terutama untuk etika berpisah dengan adil dan tidak melupakan kebaikan. Tetap tampilkan konteks hukumnya tentang mahar agar potongan pastoral tidak terlepas dari ayat." } },
  // Betrayal
  { ref: [40, 19], themes: ["Betrayal"], why: "Allah mengetahui pandangan yang berkhianat dan apa yang disembunyikan hati.", caveat: "Ayat ini bicara tentang pengawasan Allah atas manusia secara umum, bukan penghiburan langsung bagi korban; pastikan nadanya menenangkan, bukan mengancam", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai pengingat bahwa pengkhianatan tersembunyi tidak luput dari ilmu Allah, tetapi jangan digunakan untuk menuduh tanpa bukti. Ganti menjadi: “Allah mengetahui pandangan yang berkhianat dan apa yang disembunyikan hati.”" } },
  // Rejection
  { ref: [16, 127], themes: ["Rejection"], why: "Bersabarlah dengan pertolongan Allah; jangan bersedih dan jangan bersempit dada karena tipu daya mereka.", caveat: "Ayat ini ditujukan kepada Nabi menghadapi gangguan kaum kafir; pastikan pemakaiannya tidak membingkai orang yang menolak kita sebagai musuh agama", ruling: { verdict: "ganti", note: "Boleh dipakai untuk penolakan yang disertai gangguan atau tipu daya, tetapi konteksnya adalah Nabi menghadapi penentangan dakwah. Ganti menjadi: “Bersabarlah dengan pertolongan Allah; jangan bersedih dan jangan bersempit dada karena tipu daya mereka.”" } },
  // Longing
  { ref: [12, 96], themes: ["Longing"], why: "Kisah Ya’qub berakhir dengan kabar gembira; jadikan ia teladan berharap kepada Allah, bukan janji hasil yang sama bagi semua orang.", caveat: "Ini bagian narasi pertemuan kembali, bukan janji umum; pastikan tidak terbaca sebagai jaminan bahwa setiap orang yang dirindukan pasti kembali", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai akhir kisah rindu Nabi Ya’qub, tetapi bukan jaminan bahwa setiap orang yang dirindukan akan kembali. Ganti menjadi: “Kisah Ya’qub berakhir dengan kabar gembira; jadikan ia teladan berharap kepada Allah, bukan janji hasil yang sama bagi semua orang.”" } },
  // Homesickness
  { ref: [106, 4], themes: ["Homesickness"], why: "Dalam perjalanan dagang Quraisy, Allah mengingatkan nikmat pangan dan keamanan; bersyukurlah kepada Tuhan pemilik Ka’bah.", ruling: { verdict: "ganti", note: "Boleh dipakai untuk syukur atas pangan dan keamanan dalam perjalanan, tetapi harus dibaca bersama QS Quraisy 106:1–4. Ganti menjadi: “Dalam perjalanan dagang Quraisy, Allah mengingatkan nikmat pangan dan keamanan; bersyukurlah kepada Tuhan pemilik Ka’bah.”" }, codisplay: { range: [1, 4], note: "Harus dibaca bersama QS Quraisy 106:1–4." } },
  // Shame
  { ref: [40, 7], themes: ["Shame"], why: "Para malaikat pemikul ‘Arsy memohonkan ampun bagi orang beriman yang bertaubat dan mengikuti jalan Allah.", caveat: "Ayat aslinya tentang malaikat pemikul 'Arsy; pastikan pembingkaian 'ada yang mendoakanmu' tidak melebihi makna ayat", ruling: { verdict: "ganti", note: "Boleh dipakai untuk mengangkat rasa malu, tetapi kalimat sekarang menambahkan ‘menutupi aib’ yang tidak disebut ayat. Ganti menjadi: “Para malaikat pemikul ‘Arsy memohonkan ampun bagi orang beriman yang bertaubat dan mengikuti jalan Allah.”" } },
  // Regret over the past
  { ref: [5, 39], themes: ["Regret over the past"], why: "Sesudah berbuat zalim, bertaubatlah dan perbaikilah diri; bila menyangkut hak manusia, kembalikan hak dan mintalah maaf.", caveat: "Konteks asli ayat ini adalah taubat pelaku pencurian; terjemahan tafsiriyah membacanya umum — mohon ustadz memastikan pemakaian umumnya sah", ruling: { verdict: "ganti", note: "Prinsip taubat dan perbaikan dapat dipakai, walaupun konteks langsungnya adalah pencurian. Ganti menjadi: “Sesudah berbuat zalim, bertaubatlah dan perbaikilah diri; bila menyangkut hak manusia, kembalikan hak dan mintalah maaf.”" } },
  // Feeling unloved
  { ref: [11, 90], themes: ["Feeling unloved"], why: "Mohonlah ampun dan bertaubatlah kepada-Nya; Tuhanku Maha Penyayang lagi Maha Pengasih.", caveat: "Ini ucapan Nabi Syu'aib kepada kaumnya; pastikan pengutipannya sebagai penegasan sifat Allah, bukan seruan polemik", ruling: { verdict: "ganti", note: "Pas sebagai penegasan kasih dan rahmat Allah bagi orang yang kembali, tetapi pertahankan urutan taubatnya. Ganti menjadi: “Mohonlah ampun dan bertaubatlah kepada-Nya; Tuhanku Maha Penyayang lagi Maha Pengasih.”" } },
  // Wanting to change and become better
  { ref: [29, 69], themes: ["Wanting to change and become better"], why: "Orang yang bersungguh-sungguh di jalan Kami akan Kami tunjukkan jalan-jalan Kami; Allah bersama orang yang berbuat baik.", caveat: "Ayat aslinya tentang jihad/kesungguhan di jalan Allah; pastikan pemakaian untuk usaha berubah menjadi lebih baik tidak menyempitkan makna ayat", ruling: { verdict: "ganti", note: "Boleh dipakai untuk perubahan yang sungguh-sungguh mencari ridha Allah, bukan motivasi diri yang bebas nilai. Ganti menjadi: “Orang yang bersungguh-sungguh di jalan Kami akan Kami tunjukkan jalan-jalan Kami; Allah bersama orang yang berbuat baik.”" } },
  // Despair
  { ref: [12, 110], themes: ["Despair"], why: "Ketika para rasul tidak lagi berharap kaumnya beriman dan mereka didustakan, pertolongan Allah datang.", caveat: "Bagian akhir ayat berbicara tentang adzab bagi kaum berdosa — pastikan tampilan menonjolkan paruh pertama, bukan ancamannya", ruling: { verdict: "ganti", note: "Boleh dipakai dengan kehati-hatian: para rasul tidak lagi berharap kaumnya beriman, bukan berputus asa dari Allah. Ganti menjadi: “Ketika para rasul tidak lagi berharap kaumnya beriman dan mereka didustakan, pertolongan Allah datang.”" } },
  // Anger at fate
  { ref: [9, 51], themes: ["Anger at fate"], why: "Tidak akan menimpa kami kecuali apa yang Allah tetapkan bagi kami; Dia Pelindung kami, maka kepada-Nya orang beriman bertawakal.", caveat: "Tafsiriyah menyempitkan konteks ke kekalahan perang. Periksa apakah pembacaan umumnya masih layak dipakai untuk keseharian", ruling: { verdict: "ganti", note: "Prinsip tawakalnya dapat dipakai secara umum, walaupun konteks dekatnya adalah peristiwa perang dan sikap orang munafik. Ganti menjadi: “Tidak akan menimpa kami kecuali apa yang Allah tetapkan bagi kami; Dia Pelindung kami, maka kepada-Nya orang beriman bertawakal.”" } },
  // Too far gone to repent
  { ref: [4, 17], themes: ["Too far gone to repent"], why: "Bertaubatlah segera setelah berbuat salah; Allah menerima taubat orang yang kembali sebelum terlambat.", caveat: "Ayat berikutnya (4:18) mempersempit dengan nada ancaman. Jangan tampilkan berdampingan dengan 4:18", ruling: { verdict: "ganti", note: "Ayat membuka harapan taubat bagi orang yang segera kembali setelah berbuat salah, tetapi tidak membenarkan menunda hingga kematian datang. Ganti menjadi: “Bertaubatlah segera setelah berbuat salah; Allah menerima taubat orang yang kembali sebelum terlambat.”" } },
  // Fear of insincerity
  { ref: [4, 146], themes: ["Fear of insincerity"], why: "Orang yang bertaubat, memperbaiki diri, berpegang teguh kepada Allah, dan mengikhlaskan agama akan bersama orang beriman.", caveat: "Ini pengecualian dari 4:145 yang mengancam munafik dengan neraka. WAJIB ditampilkan sendiri, jangan pernah bersama 4:145", ruling: { verdict: "ganti", note: "Boleh dipakai sebagai pintu harapan bagi orang yang takut munafik, tetapi jangan mendiagnosis dirinya sebagai munafik. Ganti menjadi: “Orang yang bertaubat, memperbaiki diri, berpegang teguh kepada Allah, dan mengikhlaskan agama akan bersama orang beriman.”" } },
] as const;

/**
 * Verses withdrawn on the ustadz's review of 2026-07-22 — kept here so they are not re-proposed.
 *
 * `cabut` is his own verdict: the placement was wrong and the verse came out of the app. It had
 * been live, and he was told plainly on the call that "jangan dipakai" would mean withdrawal.
 *
 * `condition-unmet` was NOT his verdict. He allowed those, conditioned on displaying the
 * neighbouring ayat, which one-verse-per-theme retrieval could not do — so they were parked here.
 * Co-display now exists on every render path (2026-07-23), so his condition is met and all five
 * (41:35, 92:7, 20:25, 20:26, 106:4) have RETURNED to PROBLEM_VERSES above, each carrying its
 * `codisplay.range`. None remain here; the `condition-unmet` kind stays in the type for provenance.
 * See `apply-conditional-restore.ts` and ISA.md ISC-215..223.
 */
export const WITHDRAWN: readonly { readonly ref: string; readonly kind: "cabut" | "condition-unmet"; readonly why: string }[] = [
  { ref: "19:25", kind: "cabut", why: "Jangan dipakai untuk tema umum mengasuh sendirian. Perintah menggoyang pohon kurma berada dalam kisah persalinan Maryam; metafora “kamu cukup menggoyang, sisanya Allah” terlalu jauh dari teks dan dapat mengecilkan beratnya pengasuhan." },
  { ref: "29:56", kind: "cabut", why: "Jangan dipakai sebagai slogan umum bahwa selalu ada tempat untuk memulai hidup baru. Ayat ini memerintahkan orang beriman berpindah ketika tidak leluasa menyembah Allah; konteksnya hijrah demi ibadah, bukan setiap perubahan hidup." },
  { ref: "87:8", kind: "cabut", why: "Jangan dipakai sebagai motivasi umum bagi orang malas atau menunda. Ayat ini adalah janji Allah kepada Nabi untuk memudahkan beliau menuju jalan kemudahan dalam tugas wahyu; kalimat aplikasi mengubah alamat khusus menjadi slogan pribadi." },
  { ref: "22:40", kind: "cabut", why: "Jangan dipakai untuk tema umum ‘dizalimi’. Konteksnya adalah orang beriman yang diusir karena agama dan pembelaan terhadap tempat ibadah; pemakaian pada konflik kantor atau keluarga berisiko mengaburkan konteks dan memanaskan keadaan." },
  { ref: "19:96", kind: "cabut", why: "Jangan dipakai sebagai ayat khusus pernikahan atau pasangan. Ayat menjelaskan bahwa Allah menanamkan kasih sayang bagi orang beriman dan beramal saleh secara umum, bukan janji hubungan romantis atau keberhasilan rumah tangga." },
  { ref: "51:49", kind: "cabut", why: "Jangan dipakai sebagai janji bahwa setiap orang pasti mendapatkan pasangan hidup. Ayat ini berbicara tentang tanda kebesaran Allah dalam penciptaan segala sesuatu berpasangan, bukan kepastian jodoh individual." },
  { ref: "4:19", kind: "cabut", why: "Jangan dipakai untuk orang yang sedang menghadapi perceraian secara umum. Ayat ini menata perlakuan terhadap perempuan dan kehidupan rumah tangga, bukan menyuruh semua orang bertahan; pemakaiannya dapat menekan korban kekerasan atau menyudutkan perempuan." },
  { ref: "9:118", kind: "cabut", why: "Jangan dipakai untuk penolakan sehari-hari. Ayat ini berbicara tentang tiga sahabat yang ditangguhkan penerimaan taubatnya dan dikucilkan sebagai disiplin agama; menggunakannya untuk penolakan romantis atau sosial dapat menimbulkan rasa bersalah yang keliru." },
  { ref: "28:85", kind: "cabut", why: "Jangan dipakai sebagai janji umum bagi perantau bahwa pasti pulang ke tempat asal. Ayat ini ditujukan kepada Nabi dan ditafsirkan berkaitan dengan pengembalian beliau ke tempat kembali; universalisasi kalimat aplikasi terlalu jauh." },
] as const;
