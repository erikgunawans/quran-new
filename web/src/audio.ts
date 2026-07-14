/**
 * Recitation playback.
 *
 * PROGRESS.md flagged this as an open gap since the reading surface first shipped: "Audio/
 * recitation is entirely absent — the Qur'an is recitation." Erik ruled (2026-07-14): self-host,
 * shard-style, reciter Syaikh Mishary Rashid Alafasy.
 *
 * PER-AYAH, not per-surah. A per-surah continuous recording was the obvious first design — until
 * measuring one: Al-Baqarah alone is 115 MB as a single mp3. The reader's-bandwidth principle
 * (ISA.md § Principles — "A 4 MB blob on patchy 4G is a product failure, not a deployment
 * detail") rules that out immediately. Per-ayah keeps every fetch small and LAZY: nothing
 * downloads until the reader actually taps play on that specific verse, same as how the text
 * shard architecture already works.
 *
 * MVP SCOPE. Only a small, real, working sample ships today (see MANIFEST) — Al-Fatiha plus the
 * three short surahs read at the end of most sessions (Al-Ikhlas, Al-Falaq, An-Nas). Scaling to
 * all 6,236 ayahs is thousands of individual fetches against a third-party host — a real ingest
 * run of its own, not something to do casually inside an unrelated session. `hasAudio()` tells
 * the truth about exactly what is and isn't available, the same "truth oracle" discipline the
 * surah index already follows — no verse ever claims audio it doesn't have.
 *
 * Source: everyayah.com, Alafasy_64kbps, one of the most widely mirrored open per-ayah Qur'an
 * audio datasets (used by numerous other open Qur'an projects). License is UNVERIFIED — same
 * disclosed-but-unblocked status already accepted for the Tafsiriyah translation source
 * (`src/ingest/sources.ts`, "Unspecified — verify before redistribution"; see ISA.md §
 * Decisions, "Attribution risk accepted"). Files are downloaded once via `bun run app:audio`,
 * sha256-pinned in `src/app/audio.lock.json`, and served from `web/public/audio/` — production
 * never touches the third-party host.
 */

/** Which (surah, ayah) pairs actually have a downloaded file. Inlined — zero network cost to
 * decide whether a play button should even render, exactly like the surah index. */
const MANIFEST: Readonly<Record<number, readonly number[]>> = {
  1: [1, 2, 3, 4, 5, 6, 7],
  112: [1, 2, 3, 4],
  113: [1, 2, 3, 4, 5],
  114: [1, 2, 3, 4, 5, 6],
};

export function hasAudio(surah: number, ayah: number): boolean {
  return MANIFEST[surah]?.includes(ayah) ?? false;
}

export const RECITER_NAME = "Syaikh Mishary Rashid Alafasy";

let el: HTMLAudioElement | null = null;
let currentRef: string | null = null;

function audioEl(): HTMLAudioElement {
  if (!el) el = new Audio();
  return el;
}

export function nowPlaying(): string | null {
  return currentRef;
}

/**
 * Play `ref` (surah:ayah), or pause it if it's already the one playing — one ayah at a time,
 * matching how a person actually listens. ASYNC and awaits `a.play()` deliberately: an earlier
 * version returned `{ playing: true }` synchronously and let the caller update the button
 * immediately, optimistically — but `play()` can reject (autoplay policy, a network hiccup), and
 * that version left the button stuck showing "Jeda" with nothing actually playing. Caught live
 * during self-verification, not assumed away. The button now only ever shows what's true.
 */
export async function toggleAudio(
  surah: number,
  ayah: number,
  ref: string,
): Promise<{ playing: boolean; previous: string | null; failed: boolean }> {
  const a = audioEl();

  if (currentRef === ref) {
    a.pause();
    currentRef = null;
    return { playing: false, previous: null, failed: false };
  }

  const previous = currentRef;
  a.src = `/audio/${surah}/${ayah}.mp3`;
  a.onended = () => {
    if (currentRef === ref) currentRef = null;
  };
  currentRef = ref;

  try {
    await a.play();
    return { playing: true, previous, failed: false };
  } catch {
    if (currentRef === ref) currentRef = null;
    return { playing: false, previous, failed: true };
  }
}
