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
    `Bagian ini berdiri sendiri. Tidak perlu menunggu bagian lain, dan tidak perlu dikerjakan urut —`,
    `bagian mana pun yang sudah selesai boleh dikembalikan lebih dulu, dan ayat di dalamnya bisa`,
    `langsung diproses sementara sisanya menyusul.`,
    ``,
    `Perasaan di bagian ini: ${batch.map((f) => `**${f.name}**`).join(" · ")}`,
    ``,
    `---`,
    ``,
    instructions,
    ``,
    `---`,
    ``,
    batch.map((f) => f.body).join("\n\n---\n\n"),
    ``,
  ].join("\n");
  await Bun.write(`${OUT_DIR}/bagian-${pad(n)}.md`, md);
}

// ── index ────────────────────────────────────────────────────────────────────
const appendix = sections
  .filter((s) => /^## (Satu keputusan desain|Kalau disetujui)/.test(s))
  .map((s) => s.trim());

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
