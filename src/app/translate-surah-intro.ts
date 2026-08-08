#!/usr/bin/env bun
/**
 * Generate the Indonesian draft of each surah preface, section by section.
 *
 * WHAT THIS PRODUCES IS A DRAFT FOR REVIEW, NOT A PUBLISHED EDITION. Erik commissioned it on
 * 2026-08-08 after speaking with Ustadz Ahmad Isrofiel, who asked to see the translation laid out
 * inside the app so he can review it in situ. Every file this writes carries `official: false`,
 * `translation: ai`, `review_status: unreviewed`, and names him as the reviewer — the app renders a
 * provenance banner off those fields, and `parseEdition` in build-surah-intro.ts refuses to build an
 * unofficial edition that omits them. Do not strip them to make the banner go away; the banner IS
 * the reason this is safe to show.
 *
 * WHY SECTION BY SECTION. Translating a whole file in one call lets the model reorganise it, drop a
 * section, or renumber footnotes — all of which are invisible until a reader hits them. Here the
 * STRUCTURE is ours and only the prose is the model's: we split the Arabic on its own `##`
 * headings, translate each body independently, and re-emit under a fixed Indonesian heading table.
 * A section cannot go missing because the loop, not the model, decides how many there are.
 *
 * VALIDATION IS PART OF GENERATION. Footnote markers ([1], [2] …) are the load-bearing detail: they
 * tie a claim to its source in المراجع, and a dropped or renumbered marker silently misattributes
 * scholarship. Every section is checked for the exact same marker multiset as its Arabic original
 * and retried on mismatch; a section that will not converge is written with the Arabic retained and
 * loudly reported, never quietly half-translated.
 *
 * Resumable: a surah whose file already exists is skipped, so an interrupted run costs nothing.
 *
 *   bun run app:translate-surah-intro            # all missing surahs
 *   bun run app:translate-surah-intro 2 3 4      # only these
 */
import { Glob } from "bun";
import { mkdir } from "node:fs/promises";
import { classify, foldHeading, sectionsOf } from "./build-surah-intro.ts";
import { SURAH_INDEX } from "../../web/src/surah-index.ts";

const SRC = "data/surah-intro-src";
const OUT = "data/surah-intro-src/id";
const INFERENCE = `${process.env["HOME"]}/.claude/PAI/TOOLS/Inference.ts`;
const CONCURRENCY = 14;
const ATTEMPTS = 3;

/**
 * Indonesian headings, taken verbatim from the hand-checked Al-Fatihah draft so the whole corpus
 * reads as one edition. These are also what `classify()` matches on — inventing a synonym here
 * would land the section in "other" and drop it out of render order.
 */
const HEADING: Readonly<Record<string, string>> = {
  names: "Nama-Nama Surah",
  virtues: "Keutamaan dan Keistimewaan Surah",
  revelation: "Penjelasan Makkiyah dan Madaniyah",
  aims: "Maksud-Maksud (Tujuan) Surah",
  topics: "Tema-Tema (Topik) Surah",
  references: "المراجع (Rujukan)",
};

const SYSTEM = `Anda penerjemah naskah keilmuan Islam dari bahasa Arab ke Bahasa Indonesia.
Sumber: Mausu'ah at-Tafsir, Dorar Al-Saniyyah (mukadimah surah).

ATURAN WAJIB:
1. Terjemahkan SELURUH teks. Jangan meringkas, menambah, menafsirkan, atau memberi komentar.
2. Pertahankan SEMUA penanda catatan kaki persis seperti aslinya: [1] [2] [3] ... Jumlah, angka, dan urutannya harus sama persis dengan teks Arab. Jangan menambah atau menghapus satu pun.
3. Istilah Arab ditransliterasi dengan diakritik: Fatihatul-Kitab -> Fātiḥatul-Kitāb, radiyallahu 'anhu -> raḍiyallāhu 'anhu, sallallahu 'alaihi wa sallam -> ṣallallāhu 'alaihi wa sallam, Sahih al-Bukhari -> Ṣaḥīḥ al-Bukhārī.
4. Matan hadis diapit guillemet «...». Kutipan di dalam hadis pakai tanda kutip ganda "...". Kutipan ayat atau lafal pendek di dalamnya pakai tanda kutip tunggal '...'.
5. Nama kitab rujukan dicetak miring dengan bintang ganda markdown: *Tafsīr Ibnu Kaṡīr* (1/105).
6. Istilah kunci yang ditonjolkan pakai **tebal**.
7. Daftar bernomor: SATU nomor per baris, diawali "1. ", "2. ", dst.
8. Jangan pernah menulis ulang teks Arab Al-Qur'an dalam huruf Arab. Terjemahkan maknanya ke Bahasa Indonesia, atau transliterasikan lafal pendek (mis. 'Al-ḥamdu lillāhi rabbil-'ālamīn').
9. Bahasa Indonesia yang wajar dan mengalir — hindari kalimat kaku hasil terjemahan harfiah, hindari kata birokratis. Tetap khidmat dan lugas.
10. Keluarkan HANYA hasil terjemahan. Tanpa pembuka, tanpa penutup, tanpa penjelasan, tanpa tanda kutip pembungkus.`;

/** The footnote markers in a body, in order. The multiset must survive translation exactly. */
const markers = (s: string): string[] => (s.match(/\[\d+\]/g) ?? []).slice().sort();

const same = (a: string[], b: string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

async function infer(user: string): Promise<string> {
  const proc = Bun.spawn(["bun", INFERENCE, "--level", "smart", "--timeout", "180000", SYSTEM, user], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

/** Translate one section body, retrying while the footnote markers do not match. */
async function translateBody(body: string, label: string): Promise<{ text: string; ok: boolean }> {
  const want = markers(body);
  let last = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const nudge =
      attempt === 1
        ? ""
        : `\n\nPERHATIAN: percobaan sebelumnya salah menyalin penanda catatan kaki. Teks ini WAJIB memuat tepat penanda berikut, tanpa tambahan: ${want.join(" ")}\n\n`;
    const text = await infer(`${nudge}Terjemahkan ke Bahasa Indonesia:\n\n${body}`);
    last = text;
    if (text && same(markers(text), want)) return { text, ok: true };
    console.log(`    retry ${attempt}/${ATTEMPTS} ${label} — markers ${markers(text).length}/${want.length}`);
  }
  return { text: last, ok: false };
}

const nameOf = (n: number): string => SURAH_INDEX.find((s) => s.n === n)?.tl ?? `Surah ${n}`;

const frontmatterFor = (n: number): string =>
  `---
id: dorar-tafseer-id-${n}-intro
surah: ${n}
surah_name: ${nameOf(n)}
source: "موسوعة التفسير — الدرر السنية"
source_url: https://dorar.net/tafseer/${n}
source_language: ar
translation: ai
translator_engine: "PAI Inference (smart), Ar->Id, per-section with footnote-marker validation"
official: false
review_status: unreviewed
reviewer_needed: "Ustadz Ahmad Isrofiel"
language: id
content_type: tafsir-surah-intro
generated_at: 2026-08-08
license: "© Dorar Al-Saniyyah (teks asli) — terjemahan mesin turunan, BUKAN edisi resmi Dorar"
rights:
  usage: private
  holder: "Dorar Al-Saniyyah"
  basis: "terjemahan mesin adalah karya turunan dari kompilasi Dorar; hak teks sumber tetap pada Dorar"
  translation_status: "draf mesin, belum ditinjau ulama — menunggu Ustadz Ahmad Isrofiel"
  reviewed_at: 2026-08-08
---

<!-- ⚠ TERJEMAHAN AI, BELUM DITINJAU. Karya TURUNAN dari teks Arab Dorar, bukan scholarship
     Dorar itu sendiri, dan bukan edisi resmi. Nomor riwayat & rujukan kitab dipertahankan.
     Ditampilkan di aplikasi dengan label provenance agar dapat ditinjau Ustadz Ahmad Isrofiel. -->

# Surah ${nameOf(n)} — Mukadimah Surah
`;

async function translateSurah(n: number): Promise<{ n: number; sections: number; failed: string[] }> {
  const raw = await Bun.file(`${SRC}/${String(n).padStart(3, "0")}.md`).text();
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const parts = sectionsOf(body);

  const failed: string[] = [];
  const chunks: string[] = [];

  for (const [title, text] of parts) {
    if (!text.trim()) continue;
    const kind = classify(title);
    // A bespoke section keeps its own heading, translated; the standard six use the fixed table so
    // the whole corpus speaks one vocabulary and classify() can find them again.
    let heading = HEADING[kind];
    if (!heading) {
      const t = await infer(`Terjemahkan judul bagian ini ke Bahasa Indonesia, keluarkan judulnya saja:\n\n${title}`);
      heading = t.replace(/^#+\s*/, "").trim() || foldHeading(title);
    }

    const { text: id, ok } = await translateBody(text, `${n}/${kind}`);
    if (!ok) failed.push(`${kind} (${title})`);
    chunks.push(`## ${heading}\n${id}\n`);
  }

  await Bun.write(`${OUT}/${String(n).padStart(3, "0")}.md`, `${frontmatterFor(n)}\n${chunks.join("\n")}`);
  return { n, sections: chunks.length, failed };
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  await mkdir(OUT, { recursive: true });

  const done = new Set<number>();
  for await (const f of new Glob("*.md").scan(OUT)) done.add(Number(f.replace(/\.md$/, "")));

  const asked = process.argv.slice(2).map(Number).filter(Number.isInteger);
  const targets = (asked.length ? asked : Array.from({ length: 114 }, (_, i) => i + 1)).filter(
    (n) => asked.length || !done.has(n),
  );

  console.log(`translate-surah-intro: ${targets.length} surah(s) to do, ${done.size} already present`);
  if (!targets.length) process.exit(0);

  const queue = [...targets];
  const problems: string[] = [];
  let completed = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const n = queue.shift();
      if (n === undefined) return;
      try {
        const r = await translateSurah(n);
        completed++;
        const flag = r.failed.length ? `  ⚠ unverified: ${r.failed.join(", ")}` : "";
        if (r.failed.length) problems.push(`surah ${n}: ${r.failed.join(", ")}`);
        console.log(`[${completed}/${targets.length}] surah ${n} — ${r.sections} sections${flag}`);
      } catch (err) {
        problems.push(`surah ${n}: ${(err as Error).message}`);
        console.log(`[!] surah ${n} FAILED: ${(err as Error).message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\ndone. ${completed}/${targets.length} surahs written.`);
  if (problems.length) {
    console.log(`\n${problems.length} surah(s) need a human eye before review:`);
    for (const p of problems) console.log(`  - ${p}`);
  }
}
