/**
 * Verse-reference linkifying for model prose — extracted from demo.ts so it can be tested without
 * booting the app's DOM (the same seam esc.ts and peta-data.ts were split along).
 *
 * The model writes references in prose — "surah Al-Isra' ayat 23-24", "QS Al-Baqarah ayat 83",
 * "2:255". We turn those into mushaf deep-links, but ONLY when the reference resolves to a real
 * surah and the ayah is within its bounds. Anything we cannot resolve stays plain text, because a
 * link that jumps to the wrong place (or a surah that does not exist) is its own small lie — the
 * same honesty the knowledge lane keeps with its resolvable/unresolvable refs.
 */
import { SURAH_INDEX } from "../src/surah-index.ts";
import { surahMeta } from "../src/quran.ts";
import { esc } from "../src/esc.ts";
import { idName } from "./surah-id.ts";

/** Fold a surah name to letters only, so "Al-Isra'", "Al Isra" and "al-isra" all collapse together. */
const foldSurahName = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

/**
 * Surah name → number, from the Indonesian names people actually type ("Al-Isra", "Al-'Ankabut"),
 * with the transliteration ("Al-Israa") as a fallback. Built once; first spelling for a number wins.
 */
const SURAH_NAME_TO_N: ReadonlyMap<string, number> = (() => {
  const m = new Map<string, number>();
  for (const s of SURAH_INDEX) {
    for (const nm of [idName(s.n, s.tl), s.tl]) {
      const key = foldSurahName(nm);
      if (key && !m.has(key)) m.set(key, s.n);
    }
  }
  return m;
})();

/**
 * Turn verse references inside RAW model prose into mushaf deep-links. Ranges link to the first
 * ayah. Escapes every non-link segment itself, so the model's output is safe to hand straight in.
 */
export function linkifyRefs(raw: string): string {
  type Span = { start: number; end: number; html: string };
  const spans: Span[] = [];
  const push = (start: number, end: number, n: number | null, ayah: number, label: string) => {
    if (n === null || !Number.isFinite(ayah)) return;
    const meta = surahMeta(n);
    if (!meta || ayah < 1 || ayah > meta.ayahs) return; // never emit a jump we cannot honour
    spans.push({ start, end, html: `<a class="qk-ref-link" href="#/mushaf/${n}/${ayah}">${esc(label)}</a>` });
  };
  // Named: "(surah|surat|QS) <Name> ayat <n>[-<m>]". The "ayat" keyword is required, so a colon form
  // like "surah Al-Baqarah 2:83" is left to the numeric pass below — no double-claim on the same text.
  const NAMED = /(?:qs\.?\s+|surah\s+|surat\s+)([a-z'’\-]+(?:\s+[a-z'’\-]+)?)\s+ayat\s+(\d{1,3})(?:\s*[-–]\s*\d{1,3})?/gi;
  // Numeric: "<n>:<m>", optionally prefixed "QS".
  const NUM = /(?:qs\.?\s*)?\b(\d{1,3}):(\d{1,3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = NAMED.exec(raw)) !== null) {
    push(m.index, m.index + m[0].length, SURAH_NAME_TO_N.get(foldSurahName(m[1]!)) ?? null, Number(m[2]), m[0]);
  }
  while ((m = NUM.exec(raw)) !== null) {
    push(m.index, m.index + m[0].length, Number(m[1]), Number(m[2]), m[0]);
  }
  if (spans.length === 0) return esc(raw);
  // Earliest first (longer wins a tie); drop any span overlapping one already kept, so a named and a
  // numeric match can never both claim the same text.
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Span[] = [];
  let last = -1;
  for (const s of spans) {
    if (s.start >= last) { kept.push(s); last = s.end; }
  }
  let out = "", pos = 0;
  for (const s of kept) { out += esc(raw.slice(pos, s.start)) + s.html; pos = s.end; }
  return out + esc(raw.slice(pos));
}

/**
 * Inline markdown the model emits in prose — `**bold**` and `*italic*` — rendered to HTML. Run AFTER
 * `linkifyRefs`, on its escaped, link-safe output: the model's asterisks survive HTML-escaping as
 * literal text, so without this they render raw (the "**word**" bug). Link labels are verse refs and
 * never contain asterisks, so converting on the linkified string can't corrupt an <a> tag. Bold is
 * matched before italic so `**` is consumed first and never mistaken for two single `*`.
 */
export function renderInlineMarkdown(html: string): string {
  return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
}

/**
 * The real ayat a piece of prose cites, as "surah:ayah", in order and de-duped — resolving BOTH the
 * named form ("QS Al-Isra' ayat 23") and the numeric form ("17:23"). This is what the answer renders
 * as cards, so it must recognise exactly what linkifyRefs turns into links: the model writes citations
 * in words far more often than in numbers, and a numeric-only reader would show no cards under a warm
 * answer full of "QS … ayat …". Only ayat that actually exist are returned.
 */
export function resolvedRefsInProse(raw: string): string[] {
  const found: { pos: number; ref: string }[] = [];
  const add = (pos: number, n: number | null, ayah: number) => {
    if (n === null || !Number.isFinite(ayah)) return;
    const meta = surahMeta(n);
    if (!meta || ayah < 1 || ayah > meta.ayahs) return;
    found.push({ pos, ref: `${n}:${ayah}` });
  };
  const NAMED = /(?:qs\.?\s+|surah\s+|surat\s+)([a-z'’\-]+(?:\s+[a-z'’\-]+)?)\s+ayat\s+(\d{1,3})(?:\s*[-–]\s*\d{1,3})?/gi;
  const NUM = /(?:qs\.?\s*)?\b(\d{1,3}):(\d{1,3})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = NAMED.exec(raw)) !== null) add(m.index, SURAH_NAME_TO_N.get(foldSurahName(m[1]!)) ?? null, Number(m[2]));
  while ((m = NUM.exec(raw)) !== null) add(m.index, Number(m[1]), Number(m[2]));
  found.sort((a, b) => a.pos - b.pos);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const f of found) { if (!seen.has(f.ref)) { seen.add(f.ref); out.push(f.ref); } }
  return out;
}
