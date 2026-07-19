#!/usr/bin/env bun
/**
 * Build the aqidah review sheet for the scholar reviewer (Ustadz Ahmad Isrofiel Mardlatillah).
 *
 * New-Quranku answers broad definitional questions ("siapakah Allah?", "apa itu tauhid?") with an
 * honest topic pointer today, because our KB is a PREDICATE index, not authored aqidah. Closing that
 * gap is CONTENT work, not code: the ustadz authors a short, plain-language answer for each question;
 * a developer transcribes it verbatim into `web/src/aqidah.ts`; the app displays it, cites the verses,
 * and names him. The app authors nothing. This script turns the pending questions in `aqidah.ts` into
 * a sheet he can fill: each question, our candidate verse anchors (which he may replace), and blank
 * fields for his answer + the verses he approves.
 *
 * Deterministic, depends only on `aqidah.ts` (+ peta/index.json for topic labels, best-effort).
 *   bun run src/review/build-aqidah-sheet.ts   (or: bun run app:aqidah-sheet)
 */
import { AQIDAH, aqidahRef, isReviewed, type AqidahEntry } from "../../web/src/aqidah.ts";

const OUT = "docs/review/aqidah-review.md";
const INDEX = "web/public/peta/index.json";

/** Best-effort slug → category label, so the sheet reads "topik: Allah…" not a raw slug. */
async function topicLabels(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const idx = (await Bun.file(INDEX).json()) as { categories: { slug: string; category: string }[] };
    for (const c of idx.categories) m.set(c.slug, c.category);
  } catch {
    /* label is a nicety, not a requirement — a missing index just omits it */
  }
  return m;
}

const labels = await topicLabels();

function section(e: AqidahEntry, i: number): string {
  const topic = e.topic ? `topik terkait: **${labels.get(e.topic) ?? e.topic}**` : "tanpa topik tunggal";
  const done = isReviewed(e) ? " ✅ _(sudah diisi — mohon Ustadz periksa)_" : "";

  const suggested = e.suggestedRefs
    .map((r) => {
      const { ref, resolvable } = aqidahRef(r);
      return `- ${ref}${resolvable ? "" : "  ⚠️ _(tidak ditemukan dalam mushaf — mohon dikoreksi)_"}`;
    })
    .join("\n");

  const noteBlock = e.note ? `\n> ⚠️ **Catatan:** ${e.note}\n` : "";

  // If already reviewed, echo the current answer so the ustadz reads what ships; else blank fields.
  const answerBlock = isReviewed(e)
    ? `**Jawaban sekarang (yang tampil di aplikasi):**\n\n> ${e.answer.split(/\n\s*\n/).join("\n>\n> ")}\n\n**Ayat yang disetujui:** ${e.refs.map((r) => aqidahRef(r).ref).join("; ")}`
    : `**Tingkat jawaban** — mohon Ustadz pilih **satu**:

- ☐ **A — Boleh dielaborasi.** Pertanyaan ini sudah mapan dan tidak diperdebatkan. Aplikasi boleh menyusun
  jawaban ringkas **hanya dari ayat yang Ustadz setujui** di bawah. Kami akan menunjukkan **satu contoh
  jawaban** untuk Ustadz setujui sebelum tayang. Untuk pilihan ini, Ustadz cukup menetapkan ayatnya.
- ☐ **B — Saya tulis sendiri.** Pertanyaan ini lebih halus, atau ingin Ustadz jawab persis dengan kata-kata
  sendiri. Tuliskan jawabannya di bawah.
- ☐ **C — Cukup tunjuk topik.** Sebaiknya tidak dijawab; biarkan aplikasi menunjuk ke daftar topik seperti
  sekarang.

**Ayat rujukan yang Ustadz setujui** _(untuk pilihan A atau B — boleh pakai usulan di atas, ganti, atau tambah):_

- QS. ______ : ______
- QS. ______ : ______

**Jawaban Ustadz** _(hanya untuk pilihan B — 2–5 kalimat, bahasa sederhana, bukan tafsir panjang; cukup yang menjawab pertanyaan ini dengan lurus):_

> ________________________________________________________________
>
> ________________________________________________________________
>
> ________________________________________________________________`;

  return `## ${i + 1}. ${e.question}${done}

_${topic}_
${noteBlock}
**Usulan ayat rujukan dari kami** _(silakan Ustadz koreksi, ganti, atau tambah — ini hanya usulan, bukan ketetapan):_

${suggested || "_(belum ada usulan — mohon Ustadz tetapkan)_"}

${answerBlock}
`;
}

const sections = AQIDAH.map(section).join("\n---\n\n");
const pending = AQIDAH.filter((e) => !isReviewed(e)).length;

const md = `# Lembar Tinjauan Akidah — New-Quranku

> **Untuk:** Ustadz Ahmad Isrofiel Mardlatillah  \n> **Dibuat otomatis** dari \`web/src/aqidah.ts\` — jangan diedit di kode; cukup isi lembar ini.

## Apa ini

Saat seseorang bertanya hal mendasar di aplikasi — *"siapakah Allah?"*, *"apa itu tauhid?"* — New-Quranku
saat ini **tidak menjawab langsung**. Ia hanya menunjuk ke daftar topik, karena kumpulan rujukan kami berisi
*daftar apa yang Allah lakukan* (indeks Ustadz Muhammad Thalib), **bukan** jawaban definitif atas pertanyaan
mendasar. Kami tidak mau aplikasi mengarang jawaban akidah sendiri — itu wewenang ulama, bukan mesin.

Yang kami minta ringan: untuk tiap pertanyaan, Ustadz cukup **menentukan bagaimana sebaiknya dijawab** —
dan hanya menuliskan jawaban sendiri **bila Ustadz memang ingin**. Aplikasi hanya **menampilkan persis** apa
yang Ustadz setujui, **menautkan ayat** yang Ustadz tetapkan, dan **menyebut nama Ustadz** sebagai peninjau.

## Cara mengisi

Untuk tiap pertanyaan, mohon Ustadz pilih **salah satu** dari tiga tingkat jawaban:

- **A — Boleh dielaborasi.** Untuk pertanyaan yang sudah **mapan dan tidak diperdebatkan** (mis. *"siapa Nabi
  Muhammad?"*). Aplikasi akan menyusun jawaban ringkas **hanya dari ayat yang Ustadz setujui**, dan kami
  tunjukkan **satu contoh jawaban** untuk Ustadz setujui sebelum tayang. Untuk ini Ustadz **cukup menetapkan
  ayatnya** — tidak perlu menulis jawaban.
- **B — Saya tulis sendiri.** Untuk pertanyaan yang lebih **halus atau sensitif**, atau yang ingin Ustadz jawab
  persis dengan kata-kata sendiri. Tuliskan **2–5 kalimat** dengan bahasa yang mudah dipahami orang awam.
- **C — Cukup tunjuk topik.** Bila menurut Ustadz sebaiknya **tidak dijawab**. Aplikasi tetap menunjuk ke daftar
  topik seperti sekarang; tidak ada yang dipaksakan.

Untuk **A atau B**, tetapkan **ayat rujukannya** (kami sudah usulkan beberapa; Ustadz berhak ganti atau tambah).
Boleh juga menambah pertanyaan lain yang menurut Ustadz sering ditanyakan orang.

Setelah selesai, kembalikan lembar ini; developer yang memasukkannya ke aplikasi **persis** seperti yang Ustadz
tetapkan. Selama sebuah pertanyaan belum Ustadz isi, aplikasi tidak menjawabnya — ia tetap menunjuk ke topik
dengan jujur.

---

${sections}
---

## Persetujuan

- **Ditinjau oleh:** Ustadz Ahmad Isrofiel Mardlatillah
- **Tanggal:** ____________________
- **Tanda tangan / persetujuan:** ____________________

_Status sekarang: **${pending} dari ${AQIDAH.length}** pertanyaan masih menunggu jawaban Ustadz._
`;

await Bun.write(OUT, md);
console.log(
  `✓ aqidah sheet → ${OUT} (${AQIDAH.length} questions, ${pending} pending, ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB)`,
);
