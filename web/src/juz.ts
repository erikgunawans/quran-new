/**
 * Juz lookup — the 30 divisions readers actually navigate by.
 *
 * "Aku lagi di juz 5" is how someone describes where they are in the Qur'an, far more often
 * than by surah number. The demo has offered a Juz tab and an audio blurb promising "per Surah
 * atau per Juz" with nothing behind either.
 *
 * DERIVED, NOT STORED. `juz-index.ts` holds 30 spans; every per-ayah answer here is computed
 * from them. The alternative — a 6,236-entry column — is the same fact written twice, and two
 * copies of a fact are two things that can disagree. A reader sent to the wrong juz would read
 * it as the app having an opinion about where a division falls, which is not ours to have.
 *
 * Boundaries come from Tanzil's quran-data.xml, sha256-pinned, and the builder refuses to emit
 * unless the 30 spans tile all 6,236 ayahs with no gap and no overlap.
 */
import { JUZ, type JuzSpan } from "./juz-index.ts";
import { SURAH_INDEX } from "./surah-index.ts";

export type { JuzSpan };
export { JUZ };

/**
 * Absolute ayah position, 1..6236 — the flattening that makes spans crossing a surah boundary
 * comparable with `<=`. Built once at module load from the same oracle the rest of the app
 * uses to decide whether a reference is real.
 */
const OFFSETS: readonly number[] = (() => {
  const out: number[] = new Array(115).fill(0);
  let running = 0;
  for (const s of SURAH_INDEX) {
    out[s.n] = running;
    running += s.ayahs;
  }
  return out;
})();

function absolute(surah: number, ayah: number): number {
  return (OFFSETS[surah] ?? 0) + ayah;
}

/** Is this a real ayah? Mirrors the surah-index bound check, so juz can never point outside it. */
function isReal(surah: number, ayah: number): boolean {
  const meta = SURAH_INDEX.find((s) => s.n === surah);
  if (meta === undefined) return false;
  return Number.isInteger(ayah) && ayah >= 1 && ayah <= meta.ayahs;
}

/**
 * Which juz contains this ayah? `null` for a reference that is not real — the same honesty
 * contract the rest of the app keeps: we do not invent a location for a verse that does not exist.
 */
export function juzOf(surah: number, ayah: number): number | null {
  if (!isReal(surah, ayah)) return null;
  const pos = absolute(surah, ayah);

  // 30 entries — a linear scan from the end is simpler than a binary search and just as fast.
  for (let i = JUZ.length - 1; i >= 0; i--) {
    const j = JUZ[i];
    if (j !== undefined && pos >= absolute(j.s, j.a)) return j.n;
  }
  return null;
}

/** The span record for a juz number, or `null` outside 1..30. */
export function juzSpan(n: number): JuzSpan | null {
  return JUZ.find((j) => j.n === n) ?? null;
}

/** Every ayah reference in a juz, in order. Used to drive per-juz reading and playback. */
export function ayahsInJuz(n: number): readonly { surah: number; ayah: number }[] {
  const span = juzSpan(n);
  if (span === null) return [];

  const out: { surah: number; ayah: number }[] = [];
  for (let surah = span.s; surah <= span.es; surah++) {
    const meta = SURAH_INDEX.find((s) => s.n === surah);
    if (meta === undefined) continue;
    const from = surah === span.s ? span.a : 1;
    const to = surah === span.es ? span.ea : meta.ayahs;
    for (let ayah = from; ayah <= to; ayah++) out.push({ surah, ayah });
  }
  return out;
}

/** Which surahs does this juz touch, in order? Enough to label a juz without loading text. */
export function surahsInJuz(n: number): readonly number[] {
  const span = juzSpan(n);
  if (span === null) return [];
  const out: number[] = [];
  for (let s = span.s; s <= span.es; s++) out.push(s);
  return out;
}

/** Display label, e.g. `"Juz 1 · Al-Faatiha – Al-Baqara"`. Single surah collapses to one name. */
export function juzLabel(n: number): string {
  const span = juzSpan(n);
  if (span === null) return "";
  return span.from === span.to ? `Juz ${span.n} · ${span.from}` : `Juz ${span.n} · ${span.from} – ${span.to}`;
}
