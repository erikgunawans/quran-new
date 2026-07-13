#!/usr/bin/env bun
/**
 * Build the browser corpus.
 *
 * The full corpus is ~120MB — it never goes near a phone on 4G. This ships the HOT PATH
 * (spec Part 4: devotional traffic is head-heavy) — the verses people actually arrive with,
 * with every voice attached and attributed. The rest is retrieved server-side.
 *
 *   bun run app:corpus
 */
import type { Translation } from "../domain/canonical.ts";
import type { TafsirPassage, TafsirSource } from "../domain/interpretive.ts";
import { PROBLEM_VERSES } from "../review/problem-verses.ts";

const DIR = "data/canonical";
const OUT = "web/public/corpus.json";

const load = async <T>(n: string): Promise<T[]> => Bun.file(`${DIR}/${n}`).json();

const ayahs = await load<{ id: string; surah_number: number; ayah_number: number; text_uthmani: string }>("ayahs.json");
const translations = await load<Translation>("translations.json");
const passages = await load<TafsirPassage>("tafsir-passages.json");
const sources = await load<TafsirSource>("tafsir-sources.json");
const surahs = await load<{ number: number; name_ar: string; name_translit: string; name_en: string }>("surahs.json");

const byAyah = new Map(ayahs.map((a) => [a.id, a]));
const surahByNum = new Map(surahs.map((s) => [s.number, s]));

/** Trim a tafsir passage to something a phone can render without a 200KB paragraph. */
const trim = (s: string, n = 700) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s);

const verses = PROBLEM_VERSES.map((v) => {
  const [s, a] = v.ref;
  const id = `ayah:${s}:${a}`;
  const ayah = byAyah.get(id);
  if (!ayah) throw new Error(`missing ${id} — run \`bun run ingest\``);
  const here = translations.filter((t) => t.ayah_id === id);
  const surah = surahByNum.get(s)!;

  return {
    id,
    ref: `${s}:${a}`,
    surah: s,
    ayah: a,
    surah_name: surah.name_translit,
    surah_ar: surah.name_ar,
    arabic: ayah.text_uthmani,
    theme: v.theme,
    why: v.why,
    // The primary voice and its permanent companion — the honesty contract, in the data.
    primary: here.find((t) => t.display_role === "primary") ?? null,
    companion: here.find((t) => t.display_role === "companion") ?? null,
    tafsir: passages
      .filter((p) => p.ayah_id === id)
      .map((p) => ({ source_id: p.source_id, text: trim(p.text), lang: p.text_lang }))
      .sort((x, y) => {
        const tx = sources.find((s2) => s2.id === x.source_id)?.authority_tier ?? 9;
        const ty = sources.find((s2) => s2.id === y.source_id)?.authority_tier ?? 9;
        return tx - ty;
      }),
  };
});

const bundle = {
  corpus_version: (await Bun.file(`${DIR}/manifest.json`).json()).corpus_version,
  sources: sources.map((s) => ({
    id: s.id,
    author: s.author,
    name: s.name,
    era: s.era,
    lang: s.lang,
    authority_tier: s.authority_tier,
    display_role: s.display_role,
    note: s.note ?? null,
  })),
  themes: [...new Set(verses.map((v) => v.theme))],
  verses,
};

await Bun.write(OUT, JSON.stringify(bundle));
const kb = (await Bun.file(OUT).size) / 1024;
console.log(`✓ ${verses.length} verses · ${bundle.sources.length} voices → ${OUT} (${kb.toFixed(0)} KB)`);
if (kb > 900) console.warn(`⚠ ${kb.toFixed(0)} KB is heavy for 4G — trim tafsir length`);
