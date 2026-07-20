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

  // ── Expanded feeling corpus (docs/review/feelings-expansion.md) ──
  // Envy & comparison
  { ref: [4, 32], themes: ["Envy & comparison"], why: "Jangan iri pada karunia orang lain — mintalah kepada Allah bagianmu sendiri" },
  // Anger
  { ref: [3, 134], themes: ["Anger"], why: "Mereka yang menahan amarah dan memaafkan orang lain" },
  { ref: [41, 35], themes: ["Anger"], why: "Membalas keburukan dengan kebaikan — hanya orang sabar yang sanggup" },
  // Loneliness
  { ref: [50, 16], themes: ["Loneliness"], why: "Allah lebih dekat kepadamu daripada urat lehermu — kamu tidak pernah sendirian" },
  // Illness & healing
  { ref: [26, 80], themes: ["Illness & healing"], why: "\"Ketika aku sakit, Tuhankulah yang menyembuhkan aku\" — doa Ibrahim" },
  // Speech & gossip
  { ref: [49, 12], themes: ["Speech & gossip"], why: "Jauhi prasangka, jangan mencari-cari kesalahan, jangan menggunjing" },
  // Forgiving others
  { ref: [2, 263], themes: ["Forgiving others"], why: "Berkata baik dan memaafkan lebih baik daripada sedekah yang menyakiti hati" },
  // Pride & arrogance
  { ref: [31, 18], themes: ["Pride & arrogance"], why: "Nasihat Luqman kepada anaknya — jangan berjalan di bumi dengan sombong" },
  { ref: [57, 23], themes: ["Pride & arrogance"], why: "Agar kamu tidak putus asa atas yang hilang, dan tidak bangga atas yang didapat" },
  // Fear of death
  { ref: [29, 57], themes: ["Fear of death"], why: "Setiap yang bernyawa pasti merasakan kematian, lalu dikumpulkan kembali" },
  // Doubt & weak faith
  { ref: [14, 27], themes: ["Doubt & weak faith"], why: "Allah meneguhkan hati orang mukmin — iman yang goyah bisa dikuatkan" },
  { ref: [18, 14], themes: ["Doubt & weak faith"], why: "\"Kami teguhkan hati mereka\" — para pemuda Ashabul Kahfi" },
  // Wealth & greed
  { ref: [2, 268], themes: ["Wealth & greed"], why: "Setan menakut-nakutimu dengan kemiskinan; Allah menjanjikan ampunan dan karunia" },
  { ref: [57, 20], themes: ["Wealth & greed"], why: "Dunia hanya permainan dan saling membanggakan harta dan anak" },
  // Parents
  { ref: [19, 14], themes: ["Parents"], why: "Yahya berbakti kepada ibu bapaknya, tidak durhaka" },
  { ref: [14, 41], themes: ["Parents"], why: "Doa Ibrahim — ampunilah aku dan kedua orang tuaku" },
  // Injustice & being wronged
  { ref: [4, 148], themes: ["Injustice & being wronged"], why: "Orang yang teraniaya boleh menyuarakan apa yang menimpanya" },
  // Guilt & sin
  { ref: [4, 27], themes: ["Guilt & sin"], why: "Allah menghendaki untuk mengampuni dosa-dosa kalian" },
  // Longing for a child
  { ref: [21, 89], themes: ["Longing for a child"], why: "Nabi Zakaria pun pernah memohon keturunan dengan hati yang sama" },
  { ref: [3, 38], themes: ["Longing for a child"], why: "Allah Maha Mendengar setiap permohonan yang kau bisikkan" },
  // Waiting for a spouse
  { ref: [25, 74], themes: ["Waiting for a spouse"], why: "Beginilah hamba-hamba-Nya meminta pasangan yang menenteramkan hati" },
  // Struggling to raise children
  { ref: [20, 132], themes: ["Struggling to raise children"], why: "Bersabarlah membimbing keluarga; urusan rezeki sudah Dia tanggung" },
  { ref: [11, 115], themes: ["Struggling to raise children"], why: "Tidak ada satu pun lelahmu yang disia-siakan Allah" },
  { ref: [14, 40], themes: ["Struggling to raise children"], why: "Doakan anakmu; itu pun bagian dari mendidiknya" },
  // A child who has gone astray
  { ref: [28, 56], themes: ["A child who has gone astray"], why: "Hidayah bukan di tanganmu, sekalipun untuk orang yang kaucintai" },
  // Caring for elderly parents
  { ref: [31, 14], themes: ["Caring for elderly parents"], why: "Merawat mereka adalah membalas lemah yang dahulu mereka tanggung" },
  { ref: [46, 15], themes: ["Caring for elderly parents"], why: "Susah payah mereka dahulu, kini susah payahmu; Allah mencatat keduanya" },
  // Conflict within the family
  { ref: [41, 34], themes: ["Conflict within the family"], why: "Balas keburukan dengan kebaikan, permusuhan bisa berubah jadi kedekatan" },
  { ref: [8, 63], themes: ["Conflict within the family"], why: "Hanya Allah yang sanggup menyatukan hati yang saling menjauh" },
  // Being a single parent
  { ref: [19, 24], themes: ["Being a single parent"], why: "Saat Maryam sendirian dan kesakitan, Allah menyapanya: jangan bersedih" },
  { ref: [19, 25], themes: ["Being a single parent"], why: "Kau cukup menggoyang pohonnya; sisanya Allah yang jatuhkan" },
  { ref: [28, 7], themes: ["Being a single parent"], why: "Kepada ibu yang ketakutan sendirian: jangan takut, jangan bersedih" },
  // Worry about the future
  { ref: [33, 3], themes: ["Worry about the future"], why: "Serahkan yang belum terjadi; Allah sendiri yang jadi pelindungmu" },
  { ref: [46, 13], themes: ["Worry about the future"], why: "Tetap teguh pada Allah, maka tak ada yang perlu ditakutkan" },
  // Confusion facing a big decision
  { ref: [18, 24], themes: ["Confusion facing a big decision"], why: "Ucapkan insya Allah, lalu minta ditunjukkan jalan yang paling benar" },
  { ref: [42, 38], themes: ["Confusion facing a big decision"], why: "Jangan putuskan sendirian; bermusyawarahlah, itu ciri orang beriman" },
  // Starting over
  { ref: [4, 100], themes: ["Starting over"], why: "Yang pergi karena Allah menemukan tempat luas dan rezeki berlimpah" },
  { ref: [29, 56], themes: ["Starting over"], why: "Bumi Allah itu luas; selalu ada tempat untuk memulai lagi" },
  // Hope and optimism
  { ref: [93, 5], themes: ["Hope and optimism"], why: "Allah akan memberi, sampai hatimu benar-benar puas dan senang" },
  // Joy and happiness
  { ref: [10, 58], themes: ["Joy and happiness"], why: "Bergembiralah dengan karunia dan rahmat Allah" },
  { ref: [27, 19], themes: ["Joy and happiness"], why: "Sulaiman tersenyum, lalu memohon agar pandai mensyukuri nikmat-Nya" },
  { ref: [93, 11], themes: ["Joy and happiness"], why: "Saat bahagia, sebut dan syukuri nikmat Tuhanmu" },
  // Growing older
  { ref: [30, 54], themes: ["Growing older"], why: "Lemah, kuat, lalu lemah lagi — semua dalam rencana-Nya" },
  // Chronic illness
  { ref: [21, 83], themes: ["Chronic illness"], why: "Doa Ayyub: penyakit ini menimpaku, dan Engkau Maha Penyayang" },
  { ref: [21, 84], themes: ["Chronic illness"], why: "Doa Ayyub dikabulkan; yang hilang dikembalikan berlipat oleh-Nya" },
  // Divorce
  { ref: [4, 130], themes: ["Divorce"], why: "Jika berpisah, Allah mencukupi keduanya dari karunia-Nya masing-masing" },
  // Betrayal
  { ref: [12, 18], themes: ["Betrayal"], why: "Saat orang terdekat berdusta, kesabaran yang indah adalah jalannya" },
  { ref: [12, 90], themes: ["Betrayal"], why: "Yusuf dikhianati saudaranya, namun Allah tak menyia-nyiakan orang yang bersabar" },
  // Abandonment
  { ref: [93, 6], themes: ["Abandonment"], why: "Dia mendapatimu sendirian dahulu, lalu Dia melindungimu" },
  // Longing
  { ref: [12, 84], themes: ["Longing"], why: "Bahkan seorang nabi menangis sampai matanya memutih karena rindu" },
  { ref: [12, 87], themes: ["Longing"], why: "Selama merindu, jangan pernah berputus asa dari rahmat Allah" },
  // Poverty
  { ref: [93, 8], themes: ["Poverty"], why: "Allah pernah mendapatimu kekurangan, lalu Dia mencukupkanmu" },
  { ref: [67, 15], themes: ["Poverty"], why: "Bumi dibentangkan untukmu; melangkahlah, rezeki-Nya ada di sana" },
  // Fear of poverty
  { ref: [15, 21], themes: ["Fear of poverty"], why: "Rezekimu sudah tersimpan di sisi-Nya, turun pada takarannya" },
  // Stinginess
  { ref: [17, 29], themes: ["Stinginess"], why: "Jangan menggenggam terlalu erat, jangan pula menghambur; ambil tengahnya" },
  { ref: [64, 16], themes: ["Stinginess"], why: "Bertakwalah sesanggupmu; berilah, itu kebaikan untuk dirimu sendiri" },
  // Never enough
  { ref: [102, 1], themes: ["Never enough"], why: "Berlomba menumpuk harta melalaikan, sampai kubur menghentikannya" },
  { ref: [63, 9], themes: ["Never enough"], why: "Jangan biarkan harta dan anak melalaikanmu dari mengingat-Nya" },
  // Contentment
  { ref: [28, 60], themes: ["Contentment"], why: "Yang ada di sisi Allah lebih baik dan lebih kekal" },
  { ref: [16, 96], themes: ["Contentment"], why: "Milikmu akan habis; yang di sisi Allah tetap kekal" },
  // Giving
  { ref: [2, 261], themes: ["Giving"], why: "Satu biji yang kamu tanam menjadi tujuh tangkai berbuah" },
  { ref: [2, 274], themes: ["Giving"], why: "Yang memberi diam-diam maupun terang: tak ada takut, tak ada sedih" },
  { ref: [34, 39], themes: ["Giving"], why: "Apa pun yang kamu berikan, pasti Allah menggantinya" },
  // Envy of wealth
  { ref: [20, 131], themes: ["Envy of wealth"], why: "Jangan tujukan matamu ke milik orang lain; itu ujian" },
  { ref: [15, 88], themes: ["Envy of wealth"], why: "Jangan melirik milik mereka, jangan pula bersedih karenanya" },
  // Shame
  { ref: [25, 70], themes: ["Shame"], why: "Bagi yang kembali, Allah menukar dosa-dosa itu dengan pahala" },
  { ref: [11, 114], themes: ["Shame"], why: "Kebaikan yang kamu kerjakan menghapus jejak yang kamu malukan" },
  // Regret over the past
  { ref: [2, 37], themes: ["Regret over the past"], why: "Adam pun pernah jatuh, dan taubatnya diterima Allah" },
  { ref: [3, 133], themes: ["Regret over the past"], why: "Jangan berlama-lama di masa lalu; bergegaslah menuju ampunan-Nya" },
  // Insecurity / feeling inferior
  { ref: [49, 11], themes: ["Insecurity / feeling inferior"], why: "Yang direndahkan orang bisa jadi lebih baik di sisi Allah" },
  { ref: [49, 13], themes: ["Insecurity / feeling inferior"], why: "Ukuran kemuliaan bukan status, melainkan takwa di sisi Allah" },
  // Feeling worthless or useless
  { ref: [21, 94], themes: ["Feeling worthless or useless"], why: "Tidak ada satu pun kebaikanmu yang disia-siakan Allah" },
  { ref: [99, 7], themes: ["Feeling worthless or useless"], why: "Sekecil debu pun kebaikanmu tetap terlihat dan berbalas" },
  { ref: [64, 3], themes: ["Feeling worthless or useless"], why: "Allah sendiri yang membentukmu, dan Dia membentukmu sebaik-baiknya" },
  // Feeling unloved
  { ref: [93, 3], themes: ["Feeling unloved"], why: "Tuhanmu tidak meninggalkanmu, dan Dia tidak membencimu" },
  { ref: [3, 31], themes: ["Feeling unloved"], why: "Dekati Dia, maka Allah pasti mencintaimu dan mengampunimu" },
  // Emptiness / life feels meaningless
  { ref: [16, 97], themes: ["Emptiness / life feels meaningless"], why: "Iman dan amal kecil pun membuahkan kehidupan yang baik" },
  { ref: [23, 115], themes: ["Emptiness / life feels meaningless"], why: "Kamu tidak diciptakan tanpa maksud; hidupmu punya tujuan" },
  { ref: [67, 2], themes: ["Emptiness / life feels meaningless"], why: "Hidup dan mati diadakan agar terlihat siapa terbaik amalnya" },
  // Wanting to change and become better
  { ref: [20, 82], themes: ["Wanting to change and become better"], why: "Bertaubat, beramal, lalu bertahan di jalan itu — Allah mengampuni" },
  // Being bullied
  { ref: [33, 58], themes: ["Being bullied"], why: "Kamu tidak bersalah; dosanya ada pada yang mengolok" },
  { ref: [3, 186], themes: ["Being bullied"], why: "Ejekan yang menyakitkan itu ujian; sabarmu bernilai besar" },
  // Being slandered
  { ref: [33, 69], themes: ["Being slandered"], why: "Musa pun difitnah, lalu Allah sendiri yang membersihkannya" },
  { ref: [24, 11], themes: ["Being slandered"], why: "Jangan kira fitnah ini merugikanmu; ia justru membawa kebaikan" },
  // Feeling hatred
  { ref: [5, 8], themes: ["Feeling hatred"], why: "Jangan biarkan bencimu membuatmu berlaku tidak adil kepadanya" },
  { ref: [17, 53], themes: ["Feeling hatred"], why: "Jawablah celaan dengan kata terbaik; setan senang mengadu domba" },
  // Wanting revenge
  { ref: [42, 43], themes: ["Wanting revenge"], why: "Sabar dan memaafkan itu tanda hati yang teguh, bukan lemah" },
  { ref: [42, 40], themes: ["Wanting revenge"], why: "Kamu berhak membalas setimpal, tapi pahala pemaaf ditanggung Allah" },
  { ref: [12, 92], themes: ["Wanting revenge"], why: "Yusuf berkuasa membalas, namun ia memilih berkata: tidak ada cercaan" },
  // Losing a friend
  { ref: [4, 69], themes: ["Losing a friend"], why: "Masih ada teman terbaik menantimu: para nabi dan orang shalih" },
  // Trouble with neighbours
  { ref: [4, 36], themes: ["Trouble with neighbours"], why: "Berbuat baik kepada tetangga dekat dan jauh, itu perintah Allah" },
  { ref: [49, 6], themes: ["Trouble with neighbours"], why: "Telitilah dulu kabar yang meragukan, agar kamu tidak menyesal" },
  { ref: [24, 27], themes: ["Trouble with neighbours"], why: "Menghormati batas rumah orang lain menjaga damainya bertetangga" },
  // Wanting to reconcile
  { ref: [49, 10], themes: ["Wanting to reconcile"], why: "Kalian bersaudara; damaikanlah, semoga kalian diberi rahmat" },
  { ref: [4, 114], themes: ["Wanting to reconcile"], why: "Mendamaikan yang berselisih adalah bicara paling bernilai di sisi Allah" },
  // Despair
  { ref: [42, 28], themes: ["Despair"], why: "Hujan turun justru ketika manusia hampir menyerah menunggu" },
  // Anger at fate
  { ref: [57, 22], themes: ["Anger at fate"], why: "Tidak ada yang menimpamu tanpa sudah tercatat sebelum dunia ada" },
  // Prayers unanswered
  { ref: [19, 4], themes: ["Prayers unanswered"], why: "Zakaria menua dan beruban, tapi doanya tak pernah sia-sia" },
  { ref: [21, 90], themes: ["Prayers unanswered"], why: "Doa Zakaria dikabulkan setelah menunggu bertahun-tahun lamanya" },
  { ref: [27, 62], themes: ["Prayers unanswered"], why: "Siapa lagi yang menjawab orang terhimpit selain Allah?" },
  // Far from God
  { ref: [57, 4], themes: ["Far from God"], why: "Allah beserta kalian di mana pun kalian berada" },
  { ref: [3, 8], themes: ["Far from God"], why: "Doa bagi hati yang takut menjauh setelah pernah diberi petunjuk" },
  // Fear of insincerity
  // 23:61 DROPPED (fragment review, 2026-07-20). It opens "mereka itulah" and the referent is the
  // whole of 23:57-60 — and every one of those ayahs is ITSELF a lowercase continuation, so there is
  // no standalone verse anywhere in the passage to swap in. Alone, "mereka itulah orang-orang yang
  // berusaha keras menaati Allah" points at nobody, and a person afraid their worship is hollow reads
  // it as a description of BETTER people than them — the exact inversion of the comfort intended
  // (23:60 is the trembling heart). Fear of insincerity keeps 4:146. Proposed for the ustadz: ship
  // 23:57-61 as one passage, or let him choose a different verse. See docs/review/fragment-review.md.
  // Struggling with consistency
  { ref: [73, 20], themes: ["Struggling with consistency"], why: "Allah tahu kalian tak sanggup terus-menerus, maka Dia meringankan" },
  // Burnout
  { ref: [94, 2], themes: ["Burnout"], why: "Allah sendiri yang meringankan beban itu dari pundakmu" },
  { ref: [78, 9], themes: ["Burnout"], why: "Tidurmu bukan kelemahan, itu penenang yang Allah sediakan" },
  { ref: [28, 73], themes: ["Burnout"], why: "Malam untuk beristirahat itu rahmat, bukan waktu yang terbuang" },
  // Overwhelm
  { ref: [4, 28], themes: ["Overwhelm"], why: "Allah tahu manusia diciptakan lemah, dan Dia meringankan bebannya" },
  { ref: [23, 62], themes: ["Overwhelm"], why: "Tidak ada yang dibebani di luar kemampuannya, termasuk kamu" },
  // Laziness
  { ref: [87, 8], themes: ["Laziness"], why: "Allah yang memudahkan langkahmu, kamu tak berjalan sendirian" },
  { ref: [92, 7], themes: ["Laziness"], why: "Mulai satu langkah kecil, jalan mudah akan disiapkan" },
  // JobLoss
  { ref: [29, 62], themes: ["JobLoss"], why: "Yang melapangkan dan menyempitkan rezeki tahu persis kebutuhanmu" },
  { ref: [42, 12], themes: ["JobLoss"], why: "Perbendaharaan langit dan bumi milik-Nya; satu pintu tertutup bukan akhir" },
  // Direction
  { ref: [1, 6], themes: ["Direction"], why: "Doa paling sederhana saat tak tahu harus ke mana" },
  // StudyStress
  { ref: [20, 25], themes: ["StudyStress"], why: "Doa Musa saat dadanya sesak menghadapi tugas berat" },
  { ref: [20, 26], themes: ["StudyStress"], why: "Dua kata yang cukup dibaca sebelum masuk ruang ujian" },
  { ref: [96, 5], themes: ["StudyStress"], why: "Dia yang mengajari manusia apa yang belum diketahuinya" },
  // EffortNotEnough
  { ref: [3, 195], themes: ["EffortNotEnough"], why: "Allah tidak menyia-nyiakan amal siapa pun, laki-laki maupun perempuan" },
  { ref: [4, 40], themes: ["EffortNotEnough"], why: "Sebesar zarrah pun tak hilang, malah dilipatgandakan" },
  { ref: [18, 30], themes: ["EffortNotEnough"], why: "Yang kamu kerjakan dengan baik tidak akan disia-siakan" },

  // ── Expanded feeling corpus (docs/review/feelings-expansion.md) ──
  // Envy & comparison
  // 113:5 DROPPED (fragment review, 2026-07-20). Al-Falaq is one unbroken du'a: the verb "aku
  // berlindung" lives in 113:1 and every later ayah hangs off it. Served alone the card reads "dan
  // dari kejahatan pendengki bila ia dengki\"" — opening with "dan dari", and closing on a quotation
  // mark that has no opening, which is the excision showing through to the reader. Envy & comparison
  // keeps 4:32. Proposed for the ustadz: ship Al-Falaq whole, the way it is actually recited.

  // Parents
  { ref: [71, 28], themes: ["Parents"], why: "Doa Nuh bagi dirinya dan kedua orang tuanya" },
  // Injustice & being wronged
  { ref: [22, 40], themes: ["Injustice & being wronged"], why: "Mereka diusir dari negerinya hanya karena berkata: \"Tuhan kami Allah\"" },
  // Temptation & desire
  { ref: [2, 183], themes: ["Temptation & desire"], why: "Puasa diwajibkan agar kamu sanggup menahan hawa nafsu" },
  // Marriage & spouse
  { ref: [19, 96], themes: ["Marriage & spouse"], why: "Allah menanamkan rasa cinta dan kasih sayang bagi orang beriman" },
  { ref: [2, 187], themes: ["Marriage & spouse"], why: "Suami-istri saling menjadi penenteram satu sama lain" },
  // Waiting for a spouse
  { ref: [51, 49], themes: ["Waiting for a spouse"], why: "Segala sesuatu Dia ciptakan berpasangan; tidak ada yang terlupakan" },
  // Worry about the future
  { ref: [31, 34], themes: ["Worry about the future"], why: "Tak seorang pun tahu esok; itu urusan Allah, bukan bebanmu" },
  // Confusion facing a big decision
  { ref: [2, 216], themes: ["Confusion facing a big decision", "Heartbreak"], why: "Yang kamu tolak bisa jadi baik; Allah tahu, kamu tidak" },
  // Chronic illness
  { ref: [10, 57], themes: ["Chronic illness", "Heartbreak"], why: "Saat tubuh belum sembuh, Al-Quran jadi penawar bagi hati" },
  // Divorce
  { ref: [2, 237], themes: ["Divorce"], why: "Berpisahlah tanpa melupakan kebaikan yang pernah ada di antara kalian" },
  { ref: [4, 19], themes: ["Divorce"], why: "Apa yang tak kausukai hari ini bisa menyimpan kebaikan besar" },
  // Betrayal
  { ref: [40, 19], themes: ["Betrayal"], why: "Tak ada khianat yang tersembunyi; Allah melihat semuanya" },
  // Rejection
  { ref: [9, 118], themes: ["Rejection"], why: "Saat bumi terasa sempit karena dikucilkan, Allah tetap menerimamu" },
  { ref: [16, 127], themes: ["Rejection"], why: "Bersabarlah, jangan bersedih dan jangan merasa sesak karena penolakan mereka" },
  // Longing
  { ref: [12, 96], themes: ["Longing"], why: "Rindu yang panjang itu akhirnya berujung kabar gembira" },
  // Homesickness
  { ref: [28, 85], themes: ["Homesickness"], why: "Yang menyuruhmu pergi jauh pasti mengembalikanmu ke tempat asalmu" },
  { ref: [106, 4], themes: ["Homesickness"], why: "Dia yang memberi makan di perjalanan dan mengamankan dari rasa takut" },
  // Shame
  { ref: [40, 7], themes: ["Shame"], why: "Saat kamu menutupi aibmu, para malaikat memohonkan ampun untukmu" },
  // Regret over the past
  { ref: [5, 39], themes: ["Regret over the past"], why: "Sesudah salah, taubat dan perbaikan diri tetap dibukakan Allah" },
  // Feeling unloved
  { ref: [11, 90], themes: ["Feeling unloved"], why: "Cinta Allah amat besar kepada siapa pun yang kembali" },
  // Wanting to change and become better
  { ref: [29, 69], themes: ["Wanting to change and become better"], why: "Bersungguh-sungguhlah, Allah membukakan jalan keluar dan menyertaimu" },
  // Despair
  { ref: [12, 110], themes: ["Despair"], why: "Pertolongan datang tepat saat para rasul pun hampir putus asa" },
  // Anger at fate
  { ref: [9, 51], themes: ["Anger at fate"], why: "Hanya yang Allah tetapkan yang sampai padamu; Dia pelindungmu" },
  // Too far gone to repent
  { ref: [4, 17], themes: ["Too far gone to repent"], why: "Pintu taubat terbuka selama napas masih ada" },
  // Fear of insincerity
  { ref: [4, 146], themes: ["Fear of insincerity"], why: "Yang bertaubat dan memperbaiki niat, dihitung bersama orang beriman" },
] as const;
