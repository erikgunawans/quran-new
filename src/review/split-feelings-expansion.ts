/**
 * Split the feelings-expansion proposal into batches the ustadz can actually return.
 *
 * `docs/review/feelings-expansion.md` is 115 KB and 147 verses across 72 feelings. It has sat
 * unreviewed for weeks, and its size is the plausible reason: nobody opens a 115 KB document to give
 * careful pastoral judgement on 147 separate decisions. A batch he can finish in one sitting can be
 * RETURNED, and a returned batch unblocks the verses in it while the rest waits.
 *
 * Rules that shape the output:
 *   - A feeling is never split across batches. Its verses are judged against each other — "is THIS
 *     the verse for someone feeling this?" is a comparative question, and splitting it destroys that.
 *   - Every batch repeats the review instructions in full. He will open these on different days,
 *     possibly in any order, and a batch that assumes he just read another one is a batch that gets
 *     answered wrongly.
 *   - Each batch states its own ⚠️ count up front, because those are the ones the author already
 *     doubted and they are the ones worth his freshest attention.
 *
 * Run: `bun run app:split-expansion`
 */
const SRC = "docs/review/feelings-expansion.md";
const OUT_DIR = "docs/review/feelings-expansion";

/** Verses per batch. ~12 is one careful sitting; it yields ~12 batches from 147 verses. */
const TARGET_PER_BATCH = 12;

/** Sections that are front matter or appendix, not a feeling with verses to judge. */
const NOT_A_FEELING = /^## (Kenapa|Ringkasan|Cara meninjau|Satu keputusan desain|Kalau disetujui)/;

const src = await Bun.file(SRC).text();
const sections = src.split(/\n(?=## )/);
const head = sections[0]!; // title + intro, before the first ##

/**
 * The source document opens "Status: USULAN. Belum ada satu pun yang tayang" — none of these is live.
 * That was true when it was written and is FALSE now: the expansion shipped (55→201 verses) on our own
 * decision, before the ustadz saw any of it. 144 of the 147 are serving users right now.
 *
 * Handing a scholar a document that misstates this would have him believe he is approving something
 * before launch, when he is in fact auditing what is already in front of readers — and a rejection
 * means we REMOVE a live verse, not that we decline to add one. Different stakes, different urgency,
 * and not our call to obscure. So every batch is stamped with what is actually true, computed from
 * the built corpus rather than asserted.
 */
const liveRefs = new Set<string>(
  (await Bun.file("web/public/corpus.json").json()).verses.map((v: { ref: string }) => v.ref),
);
const refsIn = (body: string): string[] =>
  [...body.matchAll(/^### (?:⚠️ )?QS\. .*? — (\d+:\d+)$/gm)].map((m) => m[1]!);

const instructions = sections.find((s) => s.startsWith("## Cara meninjau"))?.trim() ?? "";
if (!instructions) throw new Error("could not find '## Cara meninjau' — the review instructions");

interface Feeling {
  readonly name: string;
  readonly body: string;
  readonly verses: number;
  readonly flagged: number;
}

/**
 * One proposed verse, parsed out of the source document so it can be re-laid-out as a call script.
 *
 * The original layout is a form: verse, then checkboxes for the reader to tick. That shape assumed
 * the ustadz would sit alone with 115 KB of markdown and fill it in, which is the ask that stalled.
 * The review itself was never the problem — a scholar can judge "does this verse meet someone feeling
 * this?" in seconds out loud. What we actually need from him is his judgement; what we need in
 * WRITING is only the RECORD of it, because his name is displayed on the result.
 *
 * So the page is rebuilt for the person holding the phone: what to read aloud, what to ask, and a
 * blank to write his answer into. He is not looking at this document. We are.
 */
interface Verse {
  readonly flagged: boolean;
  readonly surah: string;
  readonly ref: string;
  readonly why: string;
  readonly doubt: string | null;
  readonly tafsiriyah: string;
  readonly kemenag: string;
}

const VERSE_RE =
  /^### (⚠️ )?QS\. (.+?) — (\d+:\d+)\n\n\*\*Usulan `why`:\*\* (.+?)\n(?:\n> ⚠️ \*\*Perlu ditimbang:\*\* (.+?)\n)?\n\*\*Tarjamah Tafsiriyah \(Ustadz Muhammad Thalib\)\*\*  \n(.+?)\n\n\*\*Kemenag RI\*\*  \n(.+?)\n/s;

function parseVerses(body: string): Verse[] {
  return body
    .split(/\n(?=### )/)
    .filter((b) => b.startsWith("### "))
    .map((b) => {
      const m = VERSE_RE.exec(b);
      if (!m) throw new Error(`unparseable verse block: ${b.split("\n")[0]}`);
      return {
        flagged: !!m[1],
        surah: m[2]!.trim(),
        ref: m[3]!,
        why: m[4]!.trim(),
        doubt: m[5]?.trim() ?? null,
        tafsiriyah: m[6]!.trim(),
        kemenag: m[7]!.trim(),
      };
    });
}

/** ~90 seconds per verse, ~3 minutes for one we already doubt. Rounded up to the nearest 5. */
const minutesFor = (vs: Verse[]): number =>
  Math.ceil((vs.length * 1.5 + vs.filter((v) => v.flagged).length * 1.5) / 5) * 5;

/**
 * Verses we ourselves pulled after review, and what to say about them.
 *
 * Without this the script would have the reader asking about a verse we already removed, with no idea
 * that we had — and no way to give the ustadz the one piece of context that makes his answer useful,
 * which is WHY we pulled it. In both cases the fix he might bless is a whole passage rather than the
 * single ayah. See docs/review/fragment-review.md.
 */
const WITHDRAWN: Record<string, string> = {
  "113:5":
    "Ayat ini sudah kami cabut, Ustadz. Kalau berdiri sendiri, kalimatnya mulai dari 'dan dari' — " +
    "sambungan dari ayat sebelumnya, dan di layar jadi ada tanda kutip penutup tanpa pembuka. " +
    "Yang mau saya tanyakan: apakah lebih baik kami tampilkan **satu surat Al-Falaq utuh**?",
  "23:61":
    "Ayat ini sudah kami cabut, Ustadz. Kalau berdiri sendiri, 'mereka itulah' tidak ada rujukannya — " +
    "orang yang takut ibadahnya tidak ikhlas malah membacanya sebagai gambaran orang lain yang lebih " +
    "baik dari dia. Yang mau saya tanyakan: apakah lebih baik kami tampilkan **23:57-61 sekaligus**?",
  "23:60":
    "Ayat ini belum pernah tayang, Ustadz — kalimatnya sambungan dari ayat sebelumnya. " +
    "Apakah lebih baik ditampilkan bersama 23:57-61 sekaligus?",
};

/** The per-verse script: read it, ask it, write down what he says. */
function verseScript(v: Verse, n: number, live: boolean): string {
  const withdrawn = WITHDRAWN[v.ref];
  return [
    `### ${n}. QS. ${v.surah} — ${v.ref}${v.flagged ? "  ⚠️" : ""}${live ? "" : "  _(sudah kami cabut / belum tayang)_"}`,
    ``,
    ...(withdrawn
      ? [`**🗣️ Sampaikan dulu:**`, ``, `> "${withdrawn}"`, ``]
      : live
        ? []
        : [`> _Belum tayang. Tanyakan seperti biasa._`, ``]),
    `**📖 Bacakan ayatnya:**`,
    ``,
    `> ${v.tafsiriyah}`,
    ``,
    `**🗣️ Tanyakan:** "Kalau ada orang yang sedang **${"{PERASAAN}"}**, ayat ini pas nggak Ustadz`,
    `untuk menemani dia? Bukan soal benar atau tidaknya ayat — tentu benar — tapi pas atau tidaknya`,
    `ditaruh di perasaan itu."`,
    ``,
    ...(v.doubt
      ? [
          `**⚠️ Sampaikan keraguan kami — jangan dilewat:**`,
          ``,
          `> "Yang ini kami sendiri ragu, Ustadz. ${v.doubt}"`,
          ``,
        ]
      : []),
    `**Kalimat yang akan muncul di aplikasi:** _"${v.why}"_`,
    ``,
    `<details><summary>Terjemahan Kemenag (kalau Ustadz minta pembanding)</summary>`,
    ``,
    `> ${v.kemenag}`,
    ``,
    `</details>`,
    ``,
    `**✍️ Jawaban Ustadz:**`,
    ``,
    `\`\`\``,
    ``,
    ``,
    `\`\`\``,
    ``,
    `☐ pas, pakai   ☐ pas, tapi kalimatnya ganti   ☐ jangan dipakai   ☐ Ustadz mau pikir dulu`,
    ``,
  ].join("\n");
}

const feelings: Feeling[] = sections
  .filter((s) => s.startsWith("## ") && !NOT_A_FEELING.test(s))
  .map((s) => ({
    name: s.split("\n")[0]!.replace(/^## /, "").trim(),
    body: s.trim(),
    verses: (s.match(/^### /gm) ?? []).length,
    flagged: (s.match(/^### ⚠️/gm) ?? []).length,
  }))
  .filter((f) => f.verses > 0);

// ── batch, keeping every feeling whole ───────────────────────────────────────
const batches: Feeling[][] = [];
let current: Feeling[] = [];
let count = 0;
for (const f of feelings) {
  // Start a new batch when adding this feeling would overshoot — unless the batch is still empty,
  // in which case a single oversized feeling gets a batch of its own rather than being split.
  if (count > 0 && count + f.verses > TARGET_PER_BATCH) {
    batches.push(current);
    current = [];
    count = 0;
  }
  current.push(f);
  count += f.verses;
}
if (current.length) batches.push(current);

const totalVerses = feelings.reduce((n, f) => n + f.verses, 0);
const totalFlagged = feelings.reduce((n, f) => n + f.flagged, 0);
const pad = (n: number) => String(n).padStart(2, "0");

// ── one file per batch ───────────────────────────────────────────────────────
for (const [i, batch] of batches.entries()) {
  const n = i + 1;
  const verses = batch.reduce((s, f) => s + f.verses, 0);
  const flagged = batch.reduce((s, f) => s + f.flagged, 0);
  const refs = batch.flatMap((f) => refsIn(f.body));
  const liveHere = refs.filter((r) => liveRefs.has(r));
  const notLive = refs.filter((r) => !liveRefs.has(r));
  const md = [
    `# Peninjauan ayat perasaan — bagian ${n} dari ${batches.length}`,
    ``,
    `> **Mohon dibaca dulu — status yang sebenarnya.**`,
    `>`,
    `> **${liveHere.length} dari ${verses} ayat di bagian ini SUDAH TAYANG** dan sudah dibaca pengguna sekarang juga.`,
    `> Ayat-ayat ini kami naikkan lebih dulu atas keputusan kami sendiri, **sebelum** Ustadz sempat`,
    `> meninjaunya. Kami sampaikan terus terang karena itu mengubah arti peninjauan ini: Ustadz bukan`,
    `> sedang menyetujui sesuatu sebelum tayang, melainkan **memeriksa yang sudah berjalan**.`,
    `>`,
    `> Maka **"jangan dipakai" berarti kami CABUT dari aplikasi**, bukan sekadar tidak jadi menambah.`,
    `> Mohon jangan sungkan mencabut. Sudah ada beberapa ayat yang kami cabut sendiri setelah kami`,
    `> periksa ulang, dan itu memang seharusnya.`,
    ...(notLive.length
      ? [`>`, `> Belum/tidak tayang di bagian ini: ${notLive.join(", ")}.`]
      : []),
    ``,
    `| | |`,
    `|---|---|`,
    `| Perasaan di bagian ini | **${batch.length}** |`,
    `| Ayat di bagian ini | **${verses}** |`,
    `| Di antaranya sudah tayang | **${liveHere.length}** |`,
    `| Ditandai ⚠️ (mohon perhatian ekstra) | **${flagged}** |`,
    `| Bagian | ${n} dari ${batches.length} — total ${totalVerses} ayat |`,
    ``,
    `Perasaan di bagian ini: ${batch.map((f) => `**${f.name}**`).join(" · ")}`,
    ``,
    `---`,
    ``,
    `## Cara memakai halaman ini`,
    ``,
    `**Halaman ini untuk kamu, bukan untuk Ustadz.** Ustadz tidak perlu membaca apa pun dan tidak`,
    `perlu menulis apa pun — cukup menjawab lewat telepon. Kamu yang membacakan, bertanya, dan`,
    `menuliskan jawabannya di kolom yang sudah disediakan.`,
    ``,
    `Perkiraan waktu: **± ${minutesFor(batch.flatMap((f) => parseVerses(f.body)))} menit.**`,
    ``,
    `Yang penting dijaga:`,
    ``,
    `1. **Bacakan ayatnya dulu, baru bertanya.** Jangan minta Ustadz menilai dari nomor ayat saja.`,
    `2. **Pertanyaannya bukan "ayat ini benar tidak"** — tentu benar. Pertanyaannya: pas atau tidak`,
    `   ditaruh pada perasaan itu.`,
    `3. **Tanda ⚠️ wajib dibacakan keraguannya.** Itu bagian yang kami sendiri tidak yakin, dan justru`,
    `   di situ pendapat Ustadz paling dibutuhkan. Jangan dilewat supaya cepat.`,
    `4. **Tulis jawabannya apa adanya**, termasuk yang ragu-ragu atau setengah setuju. Jangan`,
    `   dibulatkan jadi "setuju".`,
    `5. Kalau Ustadz ingin berhenti di tengah, **berhenti saja.** Yang sudah dijawab tetap terpakai.`,
    ``,
    `---`,
    ``,
    `## Pembuka telepon`,
    ``,
    `> "Ustadz, saya minta waktunya sebentar untuk minta tolong diperiksa. Aplikasi Qur'an yang saya`,
    `> buat itu menemani orang lewat **perasaan** — jadi kalau seseorang menulis 'saya lagi sedih',`,
    `> aplikasinya menampilkan ayat yang kami rasa menemani perasaan itu.`,
    `>`,
    `> Yang mau saya minta: **apakah ayat yang kami pilih itu memang pas** untuk perasaan itu.`,
    `>`,
    `> Satu hal saya sampaikan terus terang dulu, Ustadz: **ayat-ayat ini sudah tayang duluan** dan`,
    `> sudah dibaca orang sekarang. Itu keputusan kami, sebelum sempat minta pendapat Ustadz. Jadi`,
    `> kalau menurut Ustadz ada yang tidak pas, **kami cabut** — bukan sekadar tidak jadi dipasang.`,
    `> Mohon jangan sungkan menyuruh cabut. Beberapa sudah kami cabut sendiri setelah kami periksa`,
    `> lagi.`,
    `>`,
    `> Nama Ustadz tercantum sebagai peninjau, jadi saya ingin memastikan yang tercantum itu memang`,
    `> benar-benar sudah Ustadz lihat."`,
    ``,
    `---`,
    ``,
    batch
      .map((f) => {
        const vs = parseVerses(f.body);
        return [
          `## Perasaan: ${f.name}`,
          ``,
          `<sub>${vs.length} ayat${vs.some((v) => v.flagged) ? ` · ${vs.filter((v) => v.flagged).length} ⚠️` : ""}</sub>`,
          ``,
          `**🗣️ Buka dengan:** "Sekarang tentang orang yang sedang **${f.name.toLowerCase()}**, Ustadz."`,
          ``,
          vs
            .map((v, k) =>
              verseScript(v, k + 1, liveRefs.has(v.ref)).replaceAll("{PERASAAN}", f.name.toLowerCase()),
            )
            .join("\n"),
          `**🗣️ Sebelum pindah:** "Ada ayat lain yang menurut Ustadz lebih pas untuk perasaan ini?"`,
          ``,
          `Usulan Ustadz: ______________________________________________`,
          ``,
        ].join("\n");
      })
      .join("\n---\n\n"),
    `---`,
    ``,
    `## Penutup telepon — jangan dilewat`,
    ``,
    `> "Terima kasih banyak, Ustadz. Saya rapikan dulu catatannya, nanti saya kirim ke Ustadz —`,
    `> **mohon dilihat sebentar apakah sudah sesuai** dengan yang Ustadz maksud. Kalau sudah pas,`,
    `> cukup Ustadz balas 'betul' saja, dan itu yang saya pakai sebagai persetujuan."`,
    ``,
    `**Kenapa langkah ini penting:** nama Ustadz tampil di aplikasi sebagai peninjau. Konfirmasi`,
    `singkat dari beliau — dibalas WhatsApp, pesan suara, apa saja — itulah yang menjadikan catatan`,
    `ini sah, bukan sekadar ingatan kita atas obrolan. **Tanpa konfirmasi itu, jangan ditayangkan`,
    `sebagai sudah ditinjau.**`,
    ``,
    `Setelah dikonfirmasi, isi lembar ini dipindahkan ke \`src/review/problem-verses.ts\`.`,
    ``,
    `| | |`,
    `|---|---|`,
    `| Tanggal telepon | ____________________ |`,
    `| Catatan dikirim ke Ustadz | ☐ sudah, tanggal ____________ |`,
    `| **Dikonfirmasi Ustadz** | ☐ **sudah** — cara: ☐ WhatsApp ☐ pesan suara ☐ lisan ulang |`,
    ``,
  ].join("\n");
  await Bun.write(`${OUT_DIR}/bagian-${pad(n)}.md`, md);
}

// ── index ────────────────────────────────────────────────────────────────────
/**
 * The multi-theme appendix asks the ustadz to choose something that was already chosen and shipped
 * (`1ebf396`, `theme` → `themes[]`). Left as written it would have him rejecting verses to protect a
 * constraint that no longer exists.
 *
 * This replacement lives HERE, in the generator, and not as a hand-edit of the output — which is
 * exactly the mistake made the first time: the correction was applied to README.md by hand, and the
 * very next `bun run app:split-expansion` silently reverted it. A generated file cannot be corrected
 * by editing the generated file. Anything true of the output has to be true of the code that emits it.
 */
const MULTI_THEME_RESOLVED = `## Satu keputusan desain: ayat yang cocok untuk dua perasaan — **SUDAH DIPUTUSKAN**

> **Catatan pembaruan (20 Juli 2026).** Bagian ini semula mengajukan pilihan kepada Ustadz, karena
> dahulu sebuah ayat hanya bisa memiliki satu tema saja. **Pilihan itu sudah diambil dan sudah
> dikerjakan:** skemanya dilebarkan, sehingga **satu ayat kini boleh menenangkan beberapa perasaan
> sekaligus.** Ustadz **tidak perlu memutuskan apa pun di bagian ini.**
>
> Saat meninjau: kalau menurut Ustadz sebuah ayat cocok untuk perasaan ini **walaupun ayat itu sudah
> dipakai di perasaan lain**, silakan setujui saja. Tidak ada yang perlu dikorbankan. Empat ayat yang
> dahulu terganjal (3:185, 21:35, 24:22, 3:135) sudah tidak menjadi masalah.`;

const appendix = sections
  .filter((s) => /^## (Satu keputusan desain|Kalau disetujui)/.test(s))
  .map((s) => (/^## Satu keputusan desain/.test(s) ? MULTI_THEME_RESOLVED : s.trim()));

const rows = batches
  .map((b, i) => {
    const verses = b.reduce((s, f) => s + f.verses, 0);
    const flagged = b.reduce((s, f) => s + f.flagged, 0);
    return `| [bagian-${pad(i + 1)}](bagian-${pad(i + 1)}.md) | ${verses} | ${flagged || "—"} | ${b.map((f) => f.name).join(", ")} |`;
  })
  .join("\n");

const totalLive = feelings.flatMap((f) => refsIn(f.body)).filter((r) => liveRefs.has(r)).length;

const readme = `# Peninjauan ayat perasaan — dibagi per bagian

> **Status sebenarnya, per 20 Juli 2026.**
>
> **${totalLive} dari ${totalVerses} ayat di berkas ini SUDAH TAYANG** dan dibaca pengguna sekarang juga.
> Berkas aslinya masih menulis "belum ada satu pun yang tayang" — itu benar ketika ditulis, dan sudah
> **tidak benar lagi**: perluasan korpus (55 → 201 ayat) kami naikkan atas keputusan kami sendiri,
> **sebelum** Ustadz meninjaunya.
>
> Kami menuliskannya terus terang karena itu mengubah arti peninjauan ini. Ustadz bukan sedang
> menyetujui sesuatu sebelum tayang, melainkan **memeriksa yang sudah berjalan** — sehingga
> **"jangan dipakai" berarti kami CABUT dari aplikasi.** Mohon jangan sungkan mencabut.

## Bagian-bagian

Berkas aslinya (\`../feelings-expansion.md\`, ${totalVerses} ayat) dibagi menjadi **${batches.length} bagian**
supaya bisa ditinjau dan dikembalikan sedikit demi sedikit. Setiap bagian berdiri sendiri dan sudah
memuat petunjuk peninjauan secara lengkap — tidak perlu dikerjakan berurutan.

| Bagian | Ayat | ⚠️ | Perasaan |
|---|---|---|---|
${rows}
| **Total** | **${totalVerses}** | **${totalFlagged}** | **${feelings.length} perasaan** |

Setiap bagian bisa dikembalikan sendiri-sendiri. Ayat dalam bagian yang sudah disetujui langsung
diproses; sisanya menunggu tanpa menghambat.

${appendix.join("\n\n")}
`;
await Bun.write(`${OUT_DIR}/README.md`, readme);

console.log(
  `✓ split     ${totalVerses} ayat / ${feelings.length} perasaan → ${batches.length} bagian in ${OUT_DIR}/ (⚠️ ${totalFlagged})`,
);
for (const [i, b] of batches.entries()) {
  const v = b.reduce((s, f) => s + f.verses, 0);
  const w = b.reduce((s, f) => s + f.flagged, 0);
  console.log(`   bagian-${pad(i + 1)}  ${String(v).padStart(2)} ayat${w ? `, ${w} ⚠️` : "       "}  ${b.map((f) => f.name).join(", ").slice(0, 72)}`);
}
