#!/usr/bin/env bun
/**
 * Build the thematic-curation review sheet for the scholar reviewer (Ustadz Ahmad Isrofiel).
 *
 * The /tema browse surface is hand-curated: 55 verses tagged with 12 emotional themes, in
 * `problem-verses.ts`. Choosing which verse belongs to which feeling is INTERPRETIVE work — it is
 * the ustadz's call, not the code's. This script turns the current curation into a sheet he can
 * read and extend: each theme shows the verses already there (with their pastoral note) plus blank
 * rows to propose more. His additions get transcribed back into `problem-verses.ts` by a developer;
 * the app never authors scholarship, it only displays what he approved.
 *
 * Deterministic, zero-network, depends only on `problem-verses.ts`.
 *   bun run src/review/build-curation-sheet.ts   (or: bun run app:curation-sheet)
 */
import { PROBLEM_VERSES, THEME_LABELS, type Theme } from "./problem-verses.ts";

const OUT = "docs/review/thematic-curation-review.md";
const TARGET_PER_THEME = 15; // aspiration, not a cap — the ustadz decides
const MIN_BLANK_ROWS = 4;

// Preserve first-appearance order (curated: most-reached-for first), matching build-themes.ts.
const order: Theme[] = [];
for (const v of PROBLEM_VERSES) if (!order.includes(v.theme)) order.push(v.theme);

const cell = (s: string) => s.replace(/\|/g, "\\|").trim();

const sections = order
  .map((theme, i) => {
    const verses = PROBLEM_VERSES.filter((v) => v.theme === theme);
    const current = verses
      .map((v) => `| QS ${v.ref[0]}:${v.ref[1]} | ${cell(v.why)} | |`)
      .join("\n");
    const blanks = Array.from(
      { length: Math.max(MIN_BLANK_ROWS, TARGET_PER_THEME - verses.length) },
      () => `| QS __:__ | _(alasan singkat, gaya sama seperti di atas)_ | |`,
    ).join("\n");

    return `## ${i + 1}. ${THEME_LABELS[theme]}  \n\`${theme}\` · ${verses.length} ayat sekarang (target ± ${TARGET_PER_THEME})

**Ayat yang sudah ada** — mohon Ustadz periksa; bila ada yang kurang pas, tulis catatan di kolom terakhir:

| Ayat | Kenapa seseorang membuka ayat ini | Catatan Ustadz (mis. "ganti", "hapus", "sudah pas") |
|------|-----------------------------------|------------------------------------------------------|
${current}

**Usulan tambahan dari Ustadz** — tuliskan ayat baru untuk tema ini di sini:

| Ayat | Kenapa seseorang membuka ayat ini | |
|------|-----------------------------------|--|
${blanks}
`;
  })
  .join("\n---\n\n");

const md = `# Lembar Tinjauan Kurasi Tematik — New-Quranku

> **Untuk:** Ustadz Ahmad Isrofiel Mardlatillah  \n> **Dibuat otomatis** dari \`src/review/problem-verses.ts\` — jangan diedit di kode; cukup isi lembar ini.

## Apa ini

New-Quranku mengelompokkan ayat berdasarkan **apa yang sedang dirasakan** pembaca saat membuka aplikasi
(mis. sedang cemas, kehilangan, terlilit utang). Saat ini ada **${PROBLEM_VERSES.length} ayat** dalam
**${order.length} tema** — dipilih dengan tangan, untuk **kelembutan pastoral**, bukan kelengkapan tafsir.

Kami ingin menambah cakupannya, tapi **memilih ayat mana untuk perasaan mana adalah wewenang Ustadz**,
bukan kode. Aplikasi ini tidak pernah menafsirkan — ia hanya **menunjukkan** ayat dan **menyebut sumbernya**.

## Cara mengisi

1. Untuk tiap tema, lihat ayat yang sudah ada beserta catatan singkat *"kenapa seseorang membuka ayat ini"*.
2. Bila ada yang kurang pas, tulis di kolom **Catatan Ustadz** (mis. "hapus", "kurang tepat", "sudah pas").
3. Tambahkan ayat baru di bagian **Usulan tambahan**: cukup tulis **surah:ayat** dan **satu kalimat alasan**
   dengan gaya yang sama — bukan tafsir, tapi *kenapa orang dalam keadaan itu meraih ayat ini*.
4. Sasaran longgar: sekitar **${TARGET_PER_THEME} ayat per tema** (sekarang baru 3–6). Ustadz yang menentukan
   berapa yang pas — lebih baik sedikit tapi tepat daripada banyak tapi dipaksakan.

Setelah selesai, kembalikan lembar ini; developer yang akan memasukkannya ke aplikasi persis seperti yang
Ustadz tulis. Tidak ada yang diubah tanpa persetujuan Ustadz.

---

${sections}
---

## Persetujuan

- **Ditinjau oleh:** Ustadz Ahmad Isrofiel Mardlatillah
- **Tanggal:** ____________________
- **Tanda tangan / persetujuan:** ____________________

_Total ayat setelah penambahan: ______ (dari ${PROBLEM_VERSES.length} sekarang)._
`;

await Bun.write(OUT, md);
console.log(`✓ curation sheet → ${OUT} (${order.length} themes, ${PROBLEM_VERSES.length} verses today, ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB)`);
