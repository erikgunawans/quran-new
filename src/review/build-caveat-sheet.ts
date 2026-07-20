/**
 * The caveat sheet — every reviewer warning attached to a shipped verse, sorted by what can be done
 * about it.
 *
 * These caveats were written during the 55→201 feeling expansion and then dropped at the last hop:
 * `ProblemVerse` had no field for them, so constraints the reviewers actually wrote existed nowhere
 * downstream. They are back on the verses now, and this renders them for the ustadz.
 *
 * The sort is the point. A caveat is not one kind of thing:
 *   - CO-DISPLAY is a flat prohibition with a named partner — a machine can hold it, so a machine
 *     does (NEVER_TOGETHER in build-corpus.ts gates the build). Listed here only for his awareness.
 *   - FRAMING binds the `why` caption we wrote. Nobody can check it but a human reading the caption
 *     beside the caveat, which is exactly what this sheet lays out.
 *   - OPEN QUESTION is the reviewer explicitly deferring to him. These are the ones that need an
 *     answer; the rest need only a nod.
 *
 * Caveats are NOT shipped to the browser. They are backstage notes — "mohon ustadz memastikan
 * pemakaian umumnya sah" is an internal question, and publishing it in corpus.json would put our
 * own uncertainty in front of every reader as if it were part of the reading.
 *
 * Run: `bun run app:caveat-sheet`
 */
import { PROBLEM_VERSES, THEME_LABELS, type ProblemVerse } from "./problem-verses.ts";

const OUT = "docs/review/caveat-review.md";

type Kind = "co-display" | "framing" | "open-question";

/** Classify by the reviewer's own phrasing — deferral language is unambiguous in Indonesian. */
function kindOf(caveat: string): Kind {
  const c = caveat.toLowerCase();
  if (/\b(bersama|berdampingan|ditampilkan sendiri)\b/.test(c)) return "co-display";
  if (/\b(mohon|periksa apakah|perlu memutuskan|dapat diterima|masih (pantas|layak))\b/.test(c)) return "open-question";
  return "framing";
}

const SECTIONS: { kind: Kind; title: string; blurb: string }[] = [
  {
    kind: "open-question",
    title: "A. Perlu jawaban Ustadz",
    blurb:
      "Peninjau sebelumnya secara eksplisit menyerahkan keputusan ini kepada Ustadz. Ayatnya sudah tayang " +
      "sekarang — bila salah satunya tidak berkenan, mohon dicoret dan akan kami cabut.",
  },
  {
    kind: "framing",
    title: "B. Batas pembingkaian — mohon dibaca sekilas",
    blurb:
      "Peninjau memberi batas pada bagaimana ayat ini boleh disajikan. Yang perlu dilihat: apakah kalimat " +
      "**Keterangan kami** di bawahnya sudah menghormati batas itu, atau justru melampauinya.",
  },
  {
    kind: "co-display",
    title: "C. Sudah dikunci oleh sistem — tidak perlu tindakan",
    blurb:
      "Larangan menampilkan berdampingan. Ini sudah dijaga otomatis: bila suatu saat pasangan yang dilarang " +
      "ikut masuk ke korpus, proses build akan berhenti dan gagal. Dicantumkan sekadar sebagai catatan.",
  },
];

const label = (v: ProblemVerse) => v.themes.map((t) => THEME_LABELS[t]).join(", ");
const ref = (v: ProblemVerse) => `QS. ${v.ref[0]}:${v.ref[1]}`;

const caveated = PROBLEM_VERSES.filter((v): v is ProblemVerse & { caveat: string } => !!v.caveat);

let md = `# Catatan peninjau atas ayat-ayat perasaan

**Untuk Ustadz Ahmad Isrofiel Mardlatillah.** Dibuat otomatis dari \`problem-verses.ts\` — jangan disunting
langsung; jalankan \`bun run app:caveat-sheet\` untuk memperbarui.

Saat korpus perasaan diperluas dari 55 menjadi 201 ayat, peninjau menuliskan **${caveated.length} catatan
peringatan**: batasan tentang bagaimana sebuah ayat boleh disajikan. Catatan-catatan itu sempat hilang di
langkah terakhir dan tidak terbawa ke aplikasi. Sekarang sudah dikembalikan, dan inilah daftarnya.

Untuk tiap ayat, yang ditampilkan pembaca hanyalah **ayatnya sendiri** (dua terjemahan) ditambah satu
kalimat **Keterangan kami**. Catatan peninjau **tidak** ditampilkan kepada pembaca — itu catatan kerja kami.

> Ringkasnya: **Bagian A** perlu jawaban. **Bagian B** cukup dibaca sekilas dan dicoret bila ada yang keliru.
> **Bagian C** sudah aman.

`;

for (const sec of SECTIONS) {
  const rows = caveated.filter((v) => kindOf(v.caveat) === sec.kind);
  md += `\n## ${sec.title} — ${rows.length} ayat\n\n${sec.blurb}\n\n`;
  for (const v of rows) {
    md += `### ${ref(v)} · _${label(v)}_\n\n`;
    md += `- **Keterangan kami (dibaca pengguna):** ${v.why}\n`;
    md += `- **Catatan peninjau:** ${v.caveat}\n`;
    md += `- **Putusan Ustadz:**  ☐ boleh tayang   ☐ perbaiki keterangan → ______________________   ☐ cabut ayat ini\n\n`;
  }
}

md += `\n---\n\n_${caveated.length} ayat bercatatan dari ${PROBLEM_VERSES.length} ayat perasaan._\n`;

await Bun.write(OUT, md);
const counts = SECTIONS.map((s) => `${s.kind} ${caveated.filter((v) => kindOf(v.caveat) === s.kind).length}`).join(" · ");
console.log(`✓ caveats  ${caveated.length} of ${PROBLEM_VERSES.length} verses → ${OUT} (${counts})`);
