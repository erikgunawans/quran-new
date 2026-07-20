#!/usr/bin/env bun
/**
 * Build the review sheet for the proposed feeling-corpus expansion.
 *
 *   bun run app:feelings-sheet   →  docs/review/feelings-expansion.md
 *
 * The proposal (`feelings-proposal.ts`) carries ONLY refs, themes, and `why` lines. Every verse text
 * in the sheet is pulled from `data/canonical` at build time, so the sheet cannot misquote scripture
 * even if the proposal has a typo — and a ref that does not exist FAILS THE BUILD rather than
 * appearing as a plausible-looking row. That is the same discipline build-corpus.ts applies to the
 * live corpus, for the same reason: a wrong verse dressed as a right one is the trust-destroying
 * failure for a scripture app.
 *
 * Also reports collisions with the 55 verses already live, so nothing is proposed twice.
 */
import { PROBLEM_VERSES } from "./problem-verses.ts";
import { OVERLAPS, PROPOSED_LABELS, PROPOSED_VERSES, type ProposedTheme } from "./feelings-proposal.ts";

const DIR = "data/canonical";
const OUT = "docs/review/feelings-expansion.md";

interface Tr { ayah_id: string; text: string; display_role: "primary" | "companion" }
interface Surah { number: number; name_translit: string }

const fail = (m: string): never => { console.error(`✗ ${m}`); process.exit(1); };

const rawTr = await Bun.file(`${DIR}/translations.json`).json();
const trs: Tr[] = Array.isArray(rawTr) ? rawTr : (rawTr.translations ?? Object.values(rawTr)[0]);
const primary = new Map<string, string>(), companion = new Map<string, string>();
for (const t of trs) (t.display_role === "primary" ? primary : companion).set(t.ayah_id, t.text);

const surahs = (await Bun.file(`${DIR}/surahs.json`).json()) as Surah[];
const nameOf = (n: number) => surahs.find((s) => s.number === n)?.name_translit ?? fail(`no surah ${n}`);

const live = new Set(PROBLEM_VERSES.map((v) => `${v.ref[0]}:${v.ref[1]}`));

// ── verify every proposed ref before writing a single line ────────────────────────
const collisions: string[] = [];
for (const p of PROPOSED_VERSES) {
  const id = `ayah:${p.ref[0]}:${p.ref[1]}`;
  if (!primary.has(id)) fail(`${p.ref[0]}:${p.ref[1]} (${p.theme}) has no Tarjamah Tafsiriyah — bad ref?`);
  if (!companion.has(id)) fail(`${p.ref[0]}:${p.ref[1]} (${p.theme}) has no Kemenag rendering — bad ref?`);
  if (live.has(`${p.ref[0]}:${p.ref[1]}`)) collisions.push(`${p.ref[0]}:${p.ref[1]} (${p.theme})`);
}

// ── group ─────────────────────────────────────────────────────────────────────────
const byTheme = new Map<ProposedTheme, typeof PROPOSED_VERSES[number][]>();
for (const p of PROPOSED_VERSES) byTheme.set(p.theme, [...(byTheme.get(p.theme) ?? []), p]);

const highs = PROPOSED_VERSES.filter((p) => p.confidence === "high").length;
const meds = PROPOSED_VERSES.length - highs;

const L: string[] = [
  `# Usulan perluasan tema perasaan — untuk ditinjau`,
  ``,
  `**Status: USULAN. Belum ada satu pun yang tayang.** Tidak ada file ini yang dibaca oleh build;`,
  `tidak ada ayat di sini yang sampai ke pengguna sampai baris-barisnya dipindahkan ke`,
  `\`src/review/problem-verses.ts\` setelah disetujui.`,
  ``,
  `## Kenapa`,
  ``,
  `Korpus chat saat ini **55 ayat / 12 tema**, dan itu berasal dari satu berkas yang ditulis tangan`,
  `(\`problem-verses.ts\`). Catatan di berkas itu sendiri menyebut daftar tersebut disusun sebagai`,
  `**tolok ukur mutu** bagi suara Tarjamah Tafsiriyah — bukan sebagai pengetahuan aplikasi. Akibatnya`,
  `pertanyaan yang sangat wajar ("wajar ga sih kalau kadang merasa iri?") berakhir pada diam, karena`,
  `*iri* memang bukan salah satu dari dua belas tema itu.`,
  ``,
  `Seluruh 6.236 ayat **sudah ada** di aplikasi (114 shard surah, sudah tayang). Yang belum ada hanya`,
  `**penandaan tema**. Usulan ini menambah penandaan — tidak menambah, mengubah, atau menafsirkan ayat.`,
  ``,
  `## Ringkasan`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Tema baru diusulkan | **${byTheme.size}** |`,
  `| Ayat diusulkan | **${PROPOSED_VERSES.length}** (${highs} keyakinan tinggi, ${meds} perlu ditimbang) |`,
  `| Tema saat ini | 12 |`,
  `| Ayat saat ini | ${PROBLEM_VERSES.length} |`,
  `| Bentrok dengan ayat yang sudah tayang | ${collisions.length ? `**${collisions.length}** — ${collisions.join(", ")}` : `tidak ada`} |`,
  ``,
  `## Cara meninjau`,
  ``,
  `Untuk setiap baris, satu pertanyaan: **apakah ayat ini benar-benar menemui orang yang sedang`,
  `merasakan hal itu?** Bukan "apakah ayat ini benar" (tentu benar), melainkan apakah penempatannya`,
  `pada perasaan ini tepat secara pastoral.`,
  ``,
  `Tandai tiap baris: **✅ setuju** · **✏️ ganti \`why\`-nya** · **❌ jangan dipakai**.`,
  ``,
  `Baris bertanda ⚠️ adalah yang penulis sendiri ragukan, dengan alasannya ditulis terbuka. Mohon`,
  `perhatian ekstra pada baris-baris itu.`,
  ``,
  `> Catatan cara memilih: setiap ayat ditemukan dengan **mencari teks terjemahan Indonesia** lalu`,
  `> dibaca, bukan dari hafalan. Ini penting — pencarian kata "dengki" memunculkan 2:109 dan 4:54,`,
  `> yang berbicara tentang kedengkian kaum terdahulu kepada Nabi: pokok yang berbeda dari seseorang`,
  `> yang sedang merasa iri. Keduanya tidak dipakai. Teks ayat di bawah ditarik langsung dari korpus`,
  `> saat berkas ini dibuat, bukan diketik ulang.`,
  ``,
  `---`,
  ``,
];

for (const [theme, rows] of byTheme) {
  L.push(`## ${PROPOSED_LABELS[theme]}`, ``, `<sub>kunci internal: \`${theme}\`</sub>`, ``);
  for (const p of rows) {
    const id = `ayah:${p.ref[0]}:${p.ref[1]}`;
    const ref = `${p.ref[0]}:${p.ref[1]}`;
    L.push(`### ${p.confidence === "medium" ? "⚠️ " : ""}QS. ${nameOf(p.ref[0])} — ${ref}`, ``);
    L.push(`**Usulan \`why\`:** ${p.why}`, ``);
    if (p.caveat) L.push(`> ⚠️ **Perlu ditimbang:** ${p.caveat}`, ``);
    L.push(`**Tarjamah Tafsiriyah (Ustadz Muhammad Thalib)**  `, `${primary.get(id)}`, ``);
    L.push(`**Kemenag RI**  `, `${companion.get(id)}`, ``);
    L.push(`Keputusan: ☐ setuju ☐ ganti \`why\` ☐ jangan dipakai`, ``, `---`, ``);
  }
}

L.push(
  `## Satu keputusan desain: ayat yang cocok untuk dua perasaan`,
  ``,
  `Empat ayat sangat cocok untuk tema baru, tetapi **sudah tayang di tema lain**. Hari ini sebuah ayat`,
  `hanya bisa memiliki SATU tema (\`ProblemVerse.theme\` bernilai tunggal). Asumsi itu tidak terasa`,
  `ketika temanya cuma dua belas dan lebar; ia mulai menggigit begitu tema dibuat lebih halus, karena`,
  `keadaan hati manusia memang bertumpang tindih.`,
  ``,
  `| Ayat | Sekarang di | Diinginkan untuk | Catatan |`,
  `|---|---|---|---|`,
  ...OVERLAPS.map((o) => `| ${o.ref} | ${o.liveTheme} | ${PROPOSED_LABELS[o.wantedFor]} | ${o.note} |`),
  ``,
  `Keempatnya **sengaja tidak diusulkan pindah** — memindahkannya akan diam-diam mengosongkan tema`,
  `yang sekarang bekerja. Pilihannya:`,
  ``,
  `- **☐ Terima apa adanya** — tema baru lebih tipis (mis. "Takut mati" hanya 1 ayat), tidak ada kode berubah.`,
  `- **☐ Lebarkan skema** — \`theme\` menjadi \`themes: Theme[]\`. Satu ayat bisa menghibur beberapa`,
  `  keadaan. Perlu perubahan pada \`problem-verses.ts\`, \`build-corpus.ts\`, dan penilaian di`,
  `  \`retrieve.ts\` — tidak besar, tapi bukan sekadar data.`,
  ``,
  `---`,
  ``,
  `## Kalau disetujui`,
  ``,
  `Empat sentuhan, semuanya data — tidak ada perubahan arsitektur:`,
  ``,
  `1. \`src/review/problem-verses.ts\` — tambahkan kunci tema ke \`Theme\`, baris ke \`PROBLEM_VERSES\`,`,
  `   label ke \`THEME_LABELS\``,
  `2. \`web/src/retrieve.ts\` — tambahkan kata kunci \`LEXICON\` dan satu pembuka \`OPENERS\` per tema`,
  `3. \`bun run app:corpus\` — korpus terbangun ulang`,
  `4. Uji, lalu tayangkan kedua edisi`,
  ``,
  `Yang **tidak** diselesaikan usulan ini: pertanyaan yang bukan perasaan (hukum, akidah) tetap`,
  `mengikuti jalur yang sudah ada. Ini memperluas jangkauan perasaan, bukan mengubah hukum aplikasi.`,
  ``,
);

await Bun.write(OUT, L.join("\n"));
console.log(`✓ ${byTheme.size} themes · ${PROPOSED_VERSES.length} verses (${highs} high, ${meds} to weigh) → ${OUT}`);
if (collisions.length) console.log(`⚠ already live: ${collisions.join(", ")}`);
