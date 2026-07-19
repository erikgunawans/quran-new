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
    : `**Jawaban Ustadz** _(tulis dengan bahasa sederhana, 2–5 kalimat — bukan tafsir panjang, cukup yang menjawab pertanyaan ini dengan lurus):_

> ________________________________________________________________
>
> ________________________________________________________________
>
> ________________________________________________________________

**Ayat rujukan yang Ustadz setujui** _(boleh pakai usulan di atas, ganti, atau tambah):_

- QS. ______ : ______
- QS. ______ : ______`;

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

Maka kami minta **Ustadz yang menuliskan jawabannya**. Aplikasi hanya **menampilkan persis** apa yang
Ustadz tulis, **menautkan ayat** yang Ustadz setujui, dan **menyebut nama Ustadz** sebagai peninjau. Tidak ada
satu kata pun yang aplikasi tambahkan ke dalam jawaban.

## Cara mengisi

1. Untuk tiap pertanyaan, tulis **jawaban singkat** (2–5 kalimat) dengan bahasa yang mudah dipahami orang awam —
   bukan tafsir panjang, cukup yang menjawab pertanyaan itu dengan lurus dan aman secara akidah.
2. Tetapkan **ayat rujukan** yang menyertai jawaban. Kami sudah mengusulkan beberapa, tapi **Ustadz yang berhak**
   mengganti atau menambah.
3. Bila sebuah pertanyaan menurut Ustadz **sebaiknya tidak dijawab** (mis. terlalu sensitif), cukup tulis
   *"biarkan menunjuk ke topik saja"* — aplikasi tetap memakai penunjuk topik yang ada sekarang.
4. Boleh menambah pertanyaan lain yang menurut Ustadz sering ditanyakan orang.

Setelah selesai, kembalikan lembar ini; developer yang memasukkannya ke aplikasi **persis** seperti yang Ustadz
tulis. Selama sebuah jawaban belum Ustadz isi, aplikasi tidak menampilkan apa pun untuk pertanyaan itu — ia tetap
menunjuk ke topik dengan jujur.

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
