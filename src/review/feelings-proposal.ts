/**
 * PROPOSAL — expanding the chat's feeling corpus beyond the original 12 themes / 55 verses.
 *
 * WHY THIS EXISTS. `problem-verses.ts` is a hand-written list of 55 entries across 12 feelings, and
 * it *is* the chat corpus (`build-corpus.ts` does `PROBLEM_VERSES.map(...)`). Its own header says it
 * was curated as a quality bar for the Tarjamah Tafsiriyah voice — "it has to earn that on THESE
 * verses" — not as the app's knowledge. It then quietly became the app's knowledge. So a real,
 * common question ("wajar ga sih kalau kadang merasa iri?") reaches honest silence, because envy is
 * not one of the twelve feelings. All 6,236 ayahs are already shipped; only the feeling TAGS are
 * missing. This file proposes tags, nothing else.
 *
 * NOTHING HERE IS LIVE. This is a review artifact. It is not imported by the build, and no verse
 * reaches a user from this file. Merging happens only after Erik (and, where he wants it, Ustadz
 * Ahmad Isrofiel) approves — by moving approved rows into `problem-verses.ts`.
 *
 * HOW THESE WERE CHOSEN — and the honest limits of it:
 *   · Every ref was found by SEARCHING the Indonesian translations in `data/canonical`, then reading
 *     the actual text. None came from recall. That matters: searching "dengki" surfaces 2:109 and
 *     4:54, which are about historical envy toward the Prophet — theologically a different subject
 *     from a person feeling envious at 2am. Only 4:32 and 113:5 survived that reading.
 *   · The verse TEXT in the generated review sheet is pulled from the corpus at build time, never
 *     transcribed here — so the sheet cannot misquote scripture even if this file has a typo.
 *   · `confidence` is the author's own estimate of PASTORAL fit — does this verse actually meet a
 *     person in this feeling? It is not a claim about the verse's meaning, which is the scholar's
 *     domain. Anything below "high" carries a `caveat` naming exactly what to check.
 *
 * The `why` lines follow the voice already in problem-verses.ts: short, Indonesian, pastoral.
 */

/** Proposed new feeling keys. English internal keys, matching the existing Theme convention. */
export type ProposedTheme =
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
  | "Temptation & desire"
  | "Marriage & spouse";

/** Indonesian labels for the browse surface, matching THEME_LABELS' register. */
export const PROPOSED_LABELS: Record<ProposedTheme, string> = {
  "Envy & comparison": "Iri & membanding-bandingkan",
  Anger: "Marah",
  Loneliness: "Kesepian",
  "Illness & healing": "Sakit & kesembuhan",
  "Speech & gossip": "Lisan & gunjingan",
  "Forgiving others": "Memaafkan orang lain",
  "Pride & arrogance": "Sombong & angkuh",
  "Fear of death": "Takut mati",
  "Doubt & weak faith": "Ragu & iman melemah",
  "Wealth & greed": "Harta & tamak",
  Parents: "Orang tua",
  "Injustice & being wronged": "Dizalimi",
  "Guilt & sin": "Rasa bersalah & dosa",
  "Temptation & desire": "Godaan & hawa nafsu",
  "Marriage & spouse": "Pernikahan & pasangan",
};

export interface ProposedVerse {
  readonly ref: readonly [surah: number, ayah: number];
  readonly theme: ProposedTheme;
  /** Why a person in this state reaches for this verse — same contract as ProblemVerse.why. */
  readonly why: string;
  /** Author's estimate of PASTORAL fit, not of meaning. */
  readonly confidence: "high" | "medium";
  /** Present whenever confidence is not high: exactly what a reviewer should check. */
  readonly caveat?: string;
}

/**
 * Verses that genuinely serve a proposed feeling but are ALREADY LIVE under another one.
 *
 * `ProblemVerse.theme` is a single value, so a verse can belong to exactly one feeling today. That
 * schema assumption was invisible while there were only twelve broad themes; it bites as soon as the
 * themes get finer-grained, because human states overlap. 3:185 ("every soul will taste death")
 * genuinely consoles BOTH someone grieving and someone afraid of dying. Today it can only do one.
 *
 * These are deliberately NOT proposed for re-tagging — moving them would silently strip a verse from
 * a theme that is live and working. They are listed so the real decision gets made on purpose:
 * either accept the thinner new themes, or widen the schema to `themes: Theme[]`.
 */
export const OVERLAPS: readonly { ref: string; liveTheme: string; wantedFor: ProposedTheme; note: string }[] = [
  { ref: "3:185", liveTheme: "Grief & loss", wantedFor: "Fear of death",
    note: "Menghibur orang yang berduka DAN orang yang takut mati — dua keadaan berbeda, satu ayat." },
  { ref: "21:35", liveTheme: "Grief & loss", wantedFor: "Fear of death",
    note: "\"Diuji lewat hal buruk dan hal baik\" — juga jawaban bagi rasa takut menghadapi kematian." },
  { ref: "24:22", liveTheme: "Forgiveness & despair", wantedFor: "Forgiving others",
    note: "Saat ini dipakai untuk ampunan Allah; isinya justru perintah MEMAAFKAN orang lain." },
  { ref: "3:135", liveTheme: "Forgiveness & despair", wantedFor: "Guilt & sin",
    note: "Ampunan Allah dan rasa bersalah manusia adalah dua pintu masuk ke ayat yang sama." },
];

export const PROPOSED_VERSES: readonly ProposedVerse[] = [
  // ── Envy & comparison ─────────────────────────────────────────────────────
  // The feeling that started this: Erik asked "wajar ga sih kalau kadang merasa iri?" and got silence.
  { ref: [4, 32], theme: "Envy & comparison", confidence: "high",
    why: "Jangan iri pada karunia orang lain — mintalah kepada Allah bagianmu sendiri" },
  { ref: [113, 5], theme: "Envy & comparison", confidence: "medium",
    why: "Memohon perlindungan dari kejahatan pendengki",
    caveat: "Ini tentang MENJADI SASARAN kedengkian orang lain, bukan tentang mengelola rasa iri sendiri. Cek apakah tetap pas untuk orang yang sedang iri." },

  // ── Anger ─────────────────────────────────────────────────────────────────
  { ref: [3, 134], theme: "Anger", confidence: "high",
    why: "Mereka yang menahan amarah dan memaafkan orang lain" },
  { ref: [41, 35], theme: "Anger", confidence: "high",
    why: "Membalas keburukan dengan kebaikan — hanya orang sabar yang sanggup" },

  // ── Loneliness ────────────────────────────────────────────────────────────
  { ref: [50, 16], theme: "Loneliness", confidence: "high",
    why: "Allah lebih dekat kepadamu daripada urat lehermu — kamu tidak pernah sendirian" },

  // ── Illness & healing ─────────────────────────────────────────────────────
  { ref: [26, 80], theme: "Illness & healing", confidence: "high",
    why: "\"Ketika aku sakit, Tuhankulah yang menyembuhkan aku\" — doa Ibrahim" },

  // ── Speech & gossip ───────────────────────────────────────────────────────
  { ref: [49, 12], theme: "Speech & gossip", confidence: "high",
    why: "Jauhi prasangka, jangan mencari-cari kesalahan, jangan menggunjing" },

  // ── Forgiving others ──────────────────────────────────────────────────────
  { ref: [2, 263], theme: "Forgiving others", confidence: "high",
    why: "Berkata baik dan memaafkan lebih baik daripada sedekah yang menyakiti hati" },

  // ── Pride & arrogance ─────────────────────────────────────────────────────
  { ref: [31, 18], theme: "Pride & arrogance", confidence: "high",
    why: "Nasihat Luqman kepada anaknya — jangan berjalan di bumi dengan sombong" },
  { ref: [57, 23], theme: "Pride & arrogance", confidence: "high",
    why: "Agar kamu tidak putus asa atas yang hilang, dan tidak bangga atas yang didapat" },

  // ── Fear of death ─────────────────────────────────────────────────────────
  // Thin on purpose: the two strongest verses here (3:185, 21:35) are ALREADY live under
  // "Grief & loss" and a verse can only carry one theme today. See OVERLAPS below.
  { ref: [29, 57], theme: "Fear of death", confidence: "high",
    why: "Setiap yang bernyawa pasti merasakan kematian, lalu dikumpulkan kembali" },

  // ── Doubt & weak faith ────────────────────────────────────────────────────
  { ref: [14, 27], theme: "Doubt & weak faith", confidence: "high",
    why: "Allah meneguhkan hati orang mukmin — iman yang goyah bisa dikuatkan" },
  { ref: [18, 14], theme: "Doubt & weak faith", confidence: "high",
    why: "\"Kami teguhkan hati mereka\" — para pemuda Ashabul Kahfi" },

  // ── Wealth & greed ────────────────────────────────────────────────────────
  { ref: [2, 268], theme: "Wealth & greed", confidence: "high",
    why: "Setan menakut-nakutimu dengan kemiskinan; Allah menjanjikan ampunan dan karunia" },
  { ref: [57, 20], theme: "Wealth & greed", confidence: "high",
    why: "Dunia hanya permainan dan saling membanggakan harta dan anak" },

  // ── Parents ───────────────────────────────────────────────────────────────
  { ref: [19, 14], theme: "Parents", confidence: "high",
    why: "Yahya berbakti kepada ibu bapaknya, tidak durhaka" },
  { ref: [14, 41], theme: "Parents", confidence: "high",
    why: "Doa Ibrahim — ampunilah aku dan kedua orang tuaku" },
  { ref: [71, 28], theme: "Parents", confidence: "medium",
    why: "Doa Nuh bagi dirinya dan kedua orang tuanya",
    caveat: "Ayat ini berlanjut ke doa keras terhadap orang zalim. Cek apakah potongan awalnya cukup berdiri sendiri untuk tema orang tua." },

  // ── Injustice & being wronged ─────────────────────────────────────────────
  { ref: [4, 148], theme: "Injustice & being wronged", confidence: "high",
    why: "Orang yang teraniaya boleh menyuarakan apa yang menimpanya" },
  { ref: [22, 40], theme: "Injustice & being wronged", confidence: "medium",
    why: "Mereka diusir dari negerinya hanya karena berkata: \"Tuhan kami Allah\"",
    caveat: "Konteksnya penganiayaan agama dan izin berperang, bukan ketidakadilan sehari-hari (kantor, keluarga). Perlu ditimbang ulang." },

  // ── Guilt & sin ───────────────────────────────────────────────────────────
  { ref: [4, 27], theme: "Guilt & sin", confidence: "high",
    why: "Allah menghendaki untuk mengampuni dosa-dosa kalian" },

  // ── Temptation & desire ───────────────────────────────────────────────────
  { ref: [2, 183], theme: "Temptation & desire", confidence: "medium",
    why: "Puasa diwajibkan agar kamu sanggup menahan hawa nafsu",
    caveat: "Ayat tentang kewajiban puasa. Sebagai jawaban atas 'aku sedang tergoda' mungkin terasa seperti perintah, bukan penghiburan." },

  // ── Marriage & spouse ─────────────────────────────────────────────────────
  { ref: [19, 96], theme: "Marriage & spouse", confidence: "medium",
    why: "Allah menanamkan rasa cinta dan kasih sayang bagi orang beriman",
    caveat: "Bukan ayat pernikahan secara khusus — tentang kasih sayang yang Allah tanamkan. Cek apakah cukup tepat untuk tema pasangan." },
  { ref: [2, 187], theme: "Marriage & spouse", confidence: "medium",
    why: "Suami-istri saling menjadi penenteram satu sama lain",
    caveat: "Konteks ayat adalah malam puasa dan hubungan suami-istri. Bagian 'penenteram' pas, tetapi ayat penuhnya spesifik — perlu persetujuan ustadz." },
];
