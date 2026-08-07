/**
 * The live surah finder — the browser half of "Cari Surah". POSTs the person's words + the closed
 * list of all 114 surahs to the edge Worker's `/api/find-surah`, which asks the model to pick the
 * one that fits and guards the reply to the closed set.
 *
 * PURE UPSIDE + SAFE: any non-answer (endpoint 404s, model down, null, timeout) throws or returns
 * null, and the caller falls back to the keyword `findSurah()`. The model is the PRIMARY matcher —
 * keyword only catches the fall (Erik: no annoying keyword search).
 */
import { SURAH_INDEX, displayName, type SurahMeta } from "./quran.ts";

const FIND_ENDPOINT = "/api/find-surah";
const TIMEOUT_MS = 4000;

/** One compact label per surah: Indonesian name + English gloss, e.g. "Al-Baqarah (The Cow)". The
 *  model knows each surah's themes and stories from these names, so it can match a feeling or a
 *  half-remembered story — not just the literal spelling. */
const surahLabels = (): { n: number; label: string }[] =>
  SURAH_INDEX.map((s: SurahMeta) => ({ n: s.n, label: `${displayName(s.n)} (${s.en})` }));

/** The matched surah number, or null when the model finds nothing. Throws on transport/HTTP failure. */
export async function findSurahLive(query: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(FIND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, surahs: surahLabels() }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/find-surah returned ${res.status}`);
    const data = (await res.json()) as { n?: unknown };
    return typeof data.n === "number" ? data.n : null;
  } finally {
    clearTimeout(timer);
  }
}
