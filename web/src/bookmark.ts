/**
 * The place, remembered.
 *
 * A bookmark is not a chat thread. It is a chosen act: "bring me back here." It is only a
 * coordinate — surah plus ayah, with the moment it was chosen. No scripture text, no Arabic, no
 * free-text disclosure, nothing someone else can read over your shoulder on a shared phone except
 * "you were at 18:10."
 *
 * That difference matters. The thread expires because it can hold what someone confided. A
 * bookmark can live indefinitely because it holds only position, and position is safe to keep.
 */
import { surahMeta } from "./quran.ts";

const KEY = "newquranku:baca";
const DEBOUNCE_MS = 400;

export type Bookmark = {
  surah: number;
  ayah: number;
  at: number;
};

interface Stored {
  v: 1;
  surah: number;
  ayah: number;
  at: number;
}

let pending: { surah: number; ayah: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const now = () => Date.now();

function isValidPosition(surah: number, ayah: number): boolean {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return false;
  if (!Number.isInteger(ayah) || ayah < 1) return false;

  const meta = surahMeta(surah);
  return meta !== undefined && ayah <= meta.ayahs;
}

function toBookmark(stored: Stored): Bookmark | null {
  if (!Number.isFinite(stored.at)) return null;
  if (!isValidPosition(stored.surah, stored.ayah)) return null;
  return { surah: stored.surah, ayah: stored.ayah, at: stored.at };
}

function read(): Bookmark | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Private mode or disabled storage must never break reading.
    return null;
  }

  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as Partial<Stored> | null;
    if (
      !stored ||
      stored.v !== 1 ||
      typeof stored.surah !== "number" ||
      typeof stored.ayah !== "number" ||
      typeof stored.at !== "number"
    ) {
      return null;
    }
    return toBookmark({ v: 1, surah: stored.surah, ayah: stored.ayah, at: stored.at });
  } catch {
    // Corrupt storage is treated as absent. A broken bookmark must never break the app.
    return null;
  }
}

function write(bookmark: Bookmark): void {
  try {
    const stored: Stored = { v: 1, surah: bookmark.surah, ayah: bookmark.ayah, at: bookmark.at };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Quota, private mode, disabled storage. "Continue reading" is an enhancement, not a dependency.
  }
}

function stopTimer(): void {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
}

function flushPending(): void {
  stopTimer();
  if (!pending) return;

  const next = pending;
  pending = null;
  if (!isValidPosition(next.surah, next.ayah)) return;

  write({ surah: next.surah, ayah: next.ayah, at: now() });
}

/** The last chosen reading position. Null if absent, corrupt, or out of bounds. */
export const loadBookmark = (): Bookmark | null => read();

/**
 * Remember where the reader chose to continue from.
 *
 * Scroll events can be noisy. We keep only the latest coordinate in a burst, then write once.
 */
export function saveBookmark(surah: number, ayah: number): void {
  if (!isValidPosition(surah, ayah)) return;

  pending = { surah, ayah };
  stopTimer();
  timer = setTimeout(() => {
    flushPending();
  }, DEBOUNCE_MS);
}

/** Write any pending position now. Used by tests, and by the debounce timer itself. */
export function flushBookmark(): void {
  flushPending();
}

/**
 * Drop a scheduled write without touching what is already stored.
 *
 * The teardown fix for a real race: `disconnect()`-ing the scroll observer stops NEW positions, but a
 * write already scheduled 400ms ago is still armed. If the reader leaves surah 18 within that window,
 * that pending `{18, 47}` would fire *after* navigation and clobber the new surah's position with a
 * stale one. So leaving a surah cancels the pending write — the last *committed* position stays; only
 * the not-yet-written one is dropped.
 */
export function cancelBookmark(): void {
  pending = null;
  stopTimer();
}

/** Forget the saved place, and cancel any write that has not happened yet. */
export function clearBookmark(): void {
  pending = null;
  stopTimer();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do, and nothing worth surfacing to the reader */
  }
}
