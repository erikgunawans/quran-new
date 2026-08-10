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

/**
 * How playback behaves when an ayah finishes (Erik, 2026-08-10).
 *
 * `single` — stop at the end of the ayah, which is what the button did before and what a reader
 * checking one verse wants. `continue` — roll on into the next ayah, which is how recitation is
 * actually listened to.
 *
 * The choice is offered on every tap of Dengar rather than buried in settings, because it is a
 * decision about THIS listening session, not a preference about the app. The last answer is
 * remembered only so the menu can show which one is current — it never plays without being asked.
 */
export type PlayMode = "single" | "continue";
const MODE_KEY = "qk:audio-mode";

function loadMode(): PlayMode {
  try {
    return localStorage.getItem(MODE_KEY) === "continue" ? "continue" : "single";
  } catch {
    return "single"; // private mode / storage disabled — the safer default is "don't keep going"
  }
}

let mode: PlayMode = loadMode();

export function playMode(): PlayMode {
  return mode;
}

export function setPlayMode(next: PlayMode): void {
  mode = next;
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {
    /* remembering is a courtesy, not a requirement — never let it break playback */
  }
}

/**
 * The next ayah that actually HAS audio, or null.
 *
 * Walks the manifest rather than assuming `ayah + 1` exists: only four surahs are downloaded today
 * (see the MVP note above), so "the next ayah" is frequently not a file. Auto-advance that 404s
 * would be worse than not advancing.
 */
export function nextWithAudio(surah: number, ayah: number): { surah: number; ayah: number; ref: string } | null {
  const list = MANIFEST[surah];
  if (!list) return null;
  const i = list.indexOf(ayah);
  if (i < 0 || i + 1 >= list.length) return null;
  const n = list[i + 1]!;
  return { surah, ayah: n, ref: `${surah}:${n}` };
}

/** Fired when auto-advance moves playback on its own, so the UI can repaint buttons it did not click. */
export const ADVANCE_EVENT = "qk:audio-advance";
export interface AdvanceDetail {
  from: string;
  to: string | null;
  playing: boolean;
}

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
  arm(surah, ayah, ref);

  try {
    await a.play();
    return { playing: true, previous, failed: false };
  } catch {
    if (currentRef === ref) currentRef = null;
    return { playing: false, previous, failed: true };
  }
}

/**
 * Point the element at one ayah and install that ayah's own end-handler.
 *
 * The handler has to be re-armed per track, not set once in `toggleAudio`: it closes over the ref
 * it belongs to, so after an auto-advance the original closure would see `currentRef !== ref` and
 * bail — the chain would play exactly one extra ayah and then stop silently. Re-arming is what
 * makes `continue` actually continue.
 */
function arm(surah: number, ayah: number, ref: string): void {
  const a = audioEl();
  a.src = `/audio/${surah}/${ayah}.mp3`;
  currentRef = ref;
  a.onended = () => {
    if (currentRef !== ref) return; // something else took over mid-track; leave it alone
    currentRef = null;
    if (mode !== "continue") {
      emitAdvance({ from: ref, to: null, playing: false });
      return;
    }
    const next = nextWithAudio(surah, ayah);
    if (!next) {
      // End of what we actually hold. Stop cleanly rather than pretending the surah ended.
      emitAdvance({ from: ref, to: null, playing: false });
      return;
    }
    void advanceTo(ref, next);
  };
}

/**
 * Chain into the next ayah without going through `toggleAudio`.
 *
 * Deliberately not a recursive `toggleAudio` call: by this point `currentRef` has been cleared, so
 * the pause branch could not fire, and `previous` would be re-emitted to a caller that has no way
 * to interpret it for a move it did not initiate. The event is the only channel for that.
 */
async function advanceTo(from: string, next: { surah: number; ayah: number; ref: string }): Promise<void> {
  const a = audioEl();
  arm(next.surah, next.ayah, next.ref);
  try {
    await a.play();
    emitAdvance({ from, to: next.ref, playing: true });
  } catch {
    if (currentRef === next.ref) currentRef = null;
    emitAdvance({ from, to: next.ref, playing: false });
  }
}

function emitAdvance(detail: AdvanceDetail): void {
  if (typeof document === "undefined") return; // test/SSR contexts have no document
  document.dispatchEvent(new CustomEvent<AdvanceDetail>(ADVANCE_EVENT, { detail }));
}
