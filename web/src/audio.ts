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
 * FULL CORPUS since 2026-08-12. It shipped for a year as a 22-ayah sample — Al-Fatiha plus the
 * three short surahs read at the end of most sessions — because scaling to all 6,236 ayahs is
 * thousands of individual fetches against a third-party host, an ingest run of its own. That run
 * is `src/app/ingest-audio-r2.ts`; it filled the R2 bucket `new-quranku-audio` with keys
 * `{surah}/{ayah}.mp3`, which is the exact URL shape `arm()` below already requested, so the
 * player itself needed no change at all. The Worker serves those keys at `/audio/*`.
 *
 * WHY THERE IS NO LONGER A MANIFEST LITERAL. The old hand-written table listed four surahs. Its
 * replacement is not a 6,236-entry literal — `SURAH_INDEX` already inlines every surah's true ayah
 * count as the app's truth oracle, so "does this ayah have audio" collapses into "is this a real
 * ayah", answered from a table the bundle was already carrying. Zero added bytes, and one fewer
 * place that can disagree with the corpus.
 *
 * That equivalence is only honest while the bucket is COMPLETE. It is a claim about ingest state,
 * not a tautology: the ingest journal is the gate (6,236 successful objects, failures absent by
 * construction), and `audio.test.ts` asserts the bound rather than trusting it.
 *
 * Source: everyayah.com, Alafasy_64kbps, one of the most widely mirrored open per-ayah Qur'an
 * audio datasets (used by numerous other open Qur'an projects). License is UNVERIFIED — same
 * disclosed-but-unblocked status already accepted for the Tafsiriyah translation source
 * (`src/ingest/sources.ts`, "Unspecified — verify before redistribution"; see ISA.md §
 * Decisions, "Attribution risk accepted"). Scaling 22 → 6,236 enlarges that accepted risk without
 * changing its nature; per-ayah attribution in the UI is the open question it raises.
 */
import { SURAH_INDEX } from "./surah-index.ts";

/** Ayah counts by surah, from the truth oracle. Built once — `SURAH_INDEX` is a 114-entry array
 * and `hasAudio` is called per rendered verse. */
const AYAH_COUNT: ReadonlyMap<number, number> = new Map(SURAH_INDEX.map((s) => [s.n, s.ayahs]));

export function hasAudio(surah: number, ayah: number): boolean {
  const count = AYAH_COUNT.get(surah);
  if (count === undefined) return false;
  return Number.isInteger(ayah) && ayah >= 1 && ayah <= count;
}

export const RECITER_NAME = "Syaikh Mishary Rashid Alafasy";

/**
 * Where the recording came from. Named in the UI beside the reciter, because crediting the voice
 * and hiding the source is half an attribution.
 *
 * ERIK'S RULING, 2026-08-12: the UNVERIFIED licence is an ACCEPTED, DOCUMENTED risk at full-corpus
 * scale — asked and answered explicitly once the ingest went from 22 files to 6,236. Recorded here
 * rather than only in the ISA so that whoever next edits this file sees that the status is a
 * decision someone made, not an oversight nobody noticed.
 *
 * What attribution does NOT do: it does not confer permission. Naming everyayah.com credits a
 * source whose redistribution terms we have not confirmed; it does not make the redistribution
 * licensed. If that ever needs resolving, it is a separate piece of work from this line of text.
 */
export const AUDIO_SOURCE = "everyayah.com";

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
/**
 * `newquranku:`, not `qk:`. Every other persisted key in this app lives under that one namespace,
 * and `migrate-storage.ts` owns renaming it — a stray prefix is invisible to that migration, so the
 * next rename would silently strand this preference. It shipped as `qk:audio-mode` for part of one
 * day, so the old key is still read once and adopted rather than discarded.
 */
const MODE_KEY = "newquranku:audio-mode";
const MODE_KEY_LEGACY = "qk:audio-mode";

function loadMode(): PlayMode {
  try {
    const raw = localStorage.getItem(MODE_KEY) ?? localStorage.getItem(MODE_KEY_LEGACY);
    return raw === "continue" ? "continue" : "single";
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
    localStorage.removeItem(MODE_KEY_LEGACY); // adopted; do not leave two sources of truth
  } catch {
    /* remembering is a courtesy, not a requirement — never let it break playback */
  }
}

/**
 * The next ayah that actually HAS audio, or null.
 *
 * Still asks `hasAudio` rather than returning `ayah + 1`, and still stops at the surah boundary
 * rather than rolling into the next surah. Both matter more now, not less: with the full corpus
 * behind it the only remaining `null` is the END of a surah, which is exactly where recitation
 * should stop and wait for the reader — auto-advancing from An-Naas into Al-Faatiha would be the
 * app deciding on its own what someone is reciting.
 */
export function nextWithAudio(surah: number, ayah: number): { surah: number; ayah: number; ref: string } | null {
  if (!hasAudio(surah, ayah)) return null;
  const n = ayah + 1;
  if (!hasAudio(surah, n)) return null;
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
