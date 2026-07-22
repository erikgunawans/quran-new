/**
 * The question corpus the coverage audit runs against.
 *
 * Written the way people actually type — casual, clipped, mixed register, the way the feeling
 * lexicon was written and for the same reason. A corpus of textbook Indonesian would flatter the
 * app and tell us nothing about the demo we are about to put in front of a scholar.
 *
 * These are QUESTIONS WE EXPECT TO BE ASKED, not questions we expect to answer. The audit's job is
 * to say honestly which ones land, and its output is the ustadz's worklist. Adding a question here
 * that the app cannot answer is the point, not a failure of the list.
 *
 * `weight` is rough expected demand — 3 = someone will type this in the first five minutes of any
 * demo, 1 = long tail. It only orders the worklist; it is a judgement call, not a measurement.
 */
export interface DemoQuestion {
  readonly q: string;
  readonly kind: "aqidah" | "fiqh" | "ibadah" | "feeling" | "life" | "quran";
  readonly weight: 1 | 2 | 3;
}

export const DEMO_QUESTIONS: readonly DemoQuestion[] = [
  // ── AQIDAH / definitional — the "what is X" lane, currently the weakest ──────────────────────
  { q: "allah itu siapa sih ?", kind: "aqidah", weight: 3 },
  { q: "siapa allah", kind: "aqidah", weight: 3 },
  { q: "di mana allah", kind: "aqidah", weight: 3 },
  { q: "apa itu tauhid", kind: "aqidah", weight: 3 },
  { q: "apa itu iman", kind: "aqidah", weight: 3 },
  { q: "apa itu takwa", kind: "aqidah", weight: 3 },
  { q: "apa itu takdir", kind: "aqidah", weight: 3 },
  { q: "apa itu syirik", kind: "aqidah", weight: 2 },
  { q: "siapa nabi muhammad", kind: "aqidah", weight: 3 },
  { q: "apa itu al quran", kind: "aqidah", weight: 3 },
  { q: "malaikat itu apa", kind: "aqidah", weight: 2 },
  { q: "siapa itu iblis", kind: "aqidah", weight: 2 },
  { q: "apa itu surga", kind: "aqidah", weight: 2 },
  { q: "neraka itu seperti apa", kind: "aqidah", weight: 2 },
  { q: "hari kiamat kapan", kind: "aqidah", weight: 2 },
  { q: "apa bedanya iman dan islam", kind: "aqidah", weight: 2 },
  { q: "apa itu hidayah", kind: "aqidah", weight: 2 },
  { q: "kenapa allah menciptakan manusia", kind: "aqidah", weight: 2 },
  { q: "apa itu rukun islam", kind: "aqidah", weight: 3 },
  { q: "apa itu rukun iman", kind: "aqidah", weight: 3 },
  { q: "apa itu dosa besar", kind: "aqidah", weight: 2 },
  { q: "apa itu ikhlas", kind: "aqidah", weight: 2 },
  { q: "apa itu tawakal", kind: "aqidah", weight: 2 },
  { q: "apa itu sabar menurut al quran", kind: "aqidah", weight: 2 },
  { q: "apa itu taubat", kind: "aqidah", weight: 3 },
  { q: "apa itu riya", kind: "aqidah", weight: 2 },
  { q: "kenapa harus sholat", kind: "aqidah", weight: 2 },
  { q: "kenapa ada penderitaan kalau allah maha penyayang", kind: "aqidah", weight: 2 },

  // ── FIQH / rulings — what a curious visitor types first ─────────────────────────────────────
  { q: "homo itu hukumnya apa sih di islam?", kind: "fiqh", weight: 3 },
  { q: "hukum lgbt", kind: "fiqh", weight: 3 },
  { q: "hukum pacaran dalam islam", kind: "fiqh", weight: 3 },
  { q: "hukum mendengarkan musik", kind: "fiqh", weight: 3 },
  { q: "apa hukum riba", kind: "fiqh", weight: 3 },
  { q: "zina itu apa", kind: "fiqh", weight: 3 },
  { q: "hukum minum alkohol", kind: "fiqh", weight: 2 },
  { q: "hukum judi online", kind: "fiqh", weight: 3 },
  { q: "hukum merokok", kind: "fiqh", weight: 2 },
  { q: "hukum tato dalam islam", kind: "fiqh", weight: 2 },
  { q: "hukum pakai jilbab", kind: "fiqh", weight: 3 },
  { q: "hukum nikah beda agama", kind: "fiqh", weight: 3 },
  { q: "hukum aborsi", kind: "fiqh", weight: 2 },
  { q: "hukum bunuh diri", kind: "fiqh", weight: 2 },
  { q: "hukum ghibah", kind: "fiqh", weight: 3 },
  { q: "hukum korupsi", kind: "fiqh", weight: 2 },
  { q: "hukum poligami", kind: "fiqh", weight: 2 },
  { q: "hukum warisan anak perempuan", kind: "fiqh", weight: 2 },
  { q: "hukum makan babi", kind: "fiqh", weight: 2 },
  { q: "hukum onani", kind: "fiqh", weight: 2 },
  { q: "hukum pinjol", kind: "fiqh", weight: 3 },
  { q: "hukum asuransi", kind: "fiqh", weight: 2 },
  { q: "hukum kripto", kind: "fiqh", weight: 2 },
  { q: "hukum bunga bank", kind: "fiqh", weight: 3 },
  { q: "hukum pelihara anjing", kind: "fiqh", weight: 2 },
  { q: "hukum childfree", kind: "fiqh", weight: 2 },
  { q: "hukum nikah siri", kind: "fiqh", weight: 2 },
  { q: "hukum bohong demi kebaikan", kind: "fiqh", weight: 2 },
  { q: "hukum meninggalkan sholat", kind: "fiqh", weight: 3 },
  { q: "hukum durhaka sama orang tua", kind: "fiqh", weight: 2 },

  // ── IBADAH / practice ───────────────────────────────────────────────────────────────────────
  { q: "bagaimana cara sholat", kind: "ibadah", weight: 3 },
  { q: "cara wudhu yang benar", kind: "ibadah", weight: 3 },
  { q: "apa itu zakat", kind: "ibadah", weight: 3 },
  { q: "apa itu haji", kind: "ibadah", weight: 2 },
  { q: "puasa ramadhan wajib ga", kind: "ibadah", weight: 2 },
  { q: "sholat tahajud gimana", kind: "ibadah", weight: 2 },
  { q: "cara taubat nasuha", kind: "ibadah", weight: 3 },
  { q: "doa sebelum tidur", kind: "ibadah", weight: 2 },
  { q: "berapa rakaat sholat subuh", kind: "ibadah", weight: 2 },
  { q: "apa itu sedekah jariyah", kind: "ibadah", weight: 2 },
  { q: "kapan waktu mustajab berdoa", kind: "ibadah", weight: 2 },
  { q: "cara sholat jamak", kind: "ibadah", weight: 1 },

  // ── FEELINGS — must stay in the feeling lane, these are the app's strength ───────────────────
  { q: "aku sedang sedih", kind: "feeling", weight: 3 },
  { q: "aku capek banget", kind: "feeling", weight: 3 },
  { q: "aku kangen ibu", kind: "feeling", weight: 2 },
  { q: "aku cemas banget sama masa depan", kind: "feeling", weight: 3 },
  { q: "aku ngerasa gagal terus", kind: "feeling", weight: 3 },
  { q: "utang numpuk banget", kind: "feeling", weight: 3 },
  { q: "aku kesepian", kind: "feeling", weight: 3 },
  { q: "aku takut mati", kind: "feeling", weight: 2 },
  { q: "aku ngerasa jauh dari allah", kind: "feeling", weight: 3 },
  { q: "aku iri sama temen aku", kind: "feeling", weight: 2 },
  { q: "aku marah banget", kind: "feeling", weight: 2 },
  { q: "aku ngerasa ga berharga", kind: "feeling", weight: 3 },
  { q: "aku burnout kerja", kind: "feeling", weight: 2 },
  { q: "aku overthinking terus", kind: "feeling", weight: 3 },
  { q: "aku ngerasa dosaku terlalu banyak", kind: "feeling", weight: 3 },
  { q: "aku malas ibadah", kind: "feeling", weight: 3 },
  { q: "aku patah hati", kind: "feeling", weight: 2 },
  { q: "aku stres skripsi", kind: "feeling", weight: 2 },

  // ── LIFE / situational ──────────────────────────────────────────────────────────────────────
  { q: "gimana cara berbakti sama orang tua", kind: "life", weight: 3 },
  { q: "aku belum dapet jodoh", kind: "life", weight: 3 },
  { q: "susah cari kerja", kind: "life", weight: 3 },
  { q: "anak aku susah diatur", kind: "life", weight: 2 },
  { q: "suami aku selingkuh", kind: "life", weight: 2 },
  { q: "aku dizalimi atasan", kind: "life", weight: 2 },
  { q: "gimana biar istiqomah", kind: "life", weight: 3 },
  { q: "aku mau resign tapi takut", kind: "life", weight: 2 },
  { q: "orang tua aku sakit keras", kind: "life", weight: 2 },
  { q: "aku ribut terus sama pasangan", kind: "life", weight: 2 },

  // ── QUR'AN itself ───────────────────────────────────────────────────────────────────────────
  { q: "surat apa yang bagus dibaca kalau susah", kind: "quran", weight: 2 },
  { q: "ayat tentang sabar", kind: "quran", weight: 3 },
  { q: "ayat tentang rezeki", kind: "quran", weight: 3 },
  { q: "ayat kursi artinya apa", kind: "quran", weight: 2 },
  { q: "surat al fatihah tentang apa", kind: "quran", weight: 2 },
  { q: "ada berapa juz dalam al quran", kind: "quran", weight: 2 },
];
