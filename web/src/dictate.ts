/**
 * Dictation for the composer — speak instead of type.
 *
 * Erik asked for a microphone "for further development that we are going to convert from speech to
 * text". The button is the affordance he asked for; it is wired to the browser's own recogniser
 * rather than left inert because the landing composer's own rule is "no dead controls" — a mic that
 * does nothing when tapped is exactly the thing that rule forbids. Where the engine cannot do it the
 * button never appears at all, which is honest in the other direction: no affordance is better than
 * one that fails on tap.
 *
 * Recognition is the browser's, not ours — nothing is sent anywhere by this module. When a real
 * speech-to-text service arrives, `spawn()` is the seam: swap the recogniser, keep the button, the
 * pressed state, and the transcript-into-textarea contract exactly as they are.
 *
 * The mic stays on until it is switched off. Chrome's recogniser does not: `continuous = true`
 * still ends after a silence, so the session is held open by restarting it, and the button reflects
 * `wantLive` (the user's intent) rather than whether a recogniser happens to be alive right now.
 */

/** The vendor-prefixed constructor Chrome still ships, alongside the standard name. */
type RecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

/**
 * Errors where restarting is wrong: the microphone is unavailable or refused, so a restart would
 * either fail identically forever or re-prompt the user in a loop. Everything else — `no-speech`,
 * `aborted`, a transient `network` — is the service being ordinary, and the mic should come back.
 */
const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

/** Out of the `onend` handler before `start()` — Chrome throws if they overlap. Also throttles. */
const RESTART_DELAY_MS = 250;

/**
 * Loop guard. A silent user is EXPECTED to cycle every few seconds and must keep the mic — so this
 * only catches the pathological case of a recogniser ending instantly over and over.
 */
const RESTART_WINDOW_MS = 3000;
const MAX_RESTARTS_PER_WINDOW = 8;

function ctor(): RecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as RecognitionCtor | null;
}

/**
 * Wire `#mic` to `#q`.
 *
 * Returns whether the button was shown, so callers (and tests) can assert the capability gate
 * rather than infer it from the DOM.
 */
export function initDictation(doc: Document = document): boolean {
  const btn = doc.querySelector<HTMLButtonElement>("#mic");
  const box = doc.querySelector<HTMLTextAreaElement>("#q");
  if (!btn || !box) return false;

  const Recognition = ctor();
  if (!Recognition) return false; // stays `hidden` — see the module note
  btn.hidden = false;

  let live: SpeechRecognitionLike | null = null;
  /**
   * The USER's intent, which is NOT the recogniser's state — that distinction is the whole fix.
   * `continuous = true` does not mean "runs until told to stop": Chrome's recogniser ends itself
   * after a few seconds of silence, firing `no-speech` and then `onend`. Wiring those straight to
   * `stop()` meant the mic switched itself off mid-session and the button had no way to hold it on.
   * The mic is now on for exactly as long as `wantLive` says so, and an end the user did not ask
   * for is treated as what it is — an interruption to recover from, not a decision.
   */
  let wantLive = false;
  let restarts = 0;
  let windowOpenedAt = 0;

  const paint = (on: boolean): void => {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("is-live", on);
  };

  /** The user is done. Intent goes down first so a pending `onend` will not resurrect the mic. */
  const stop = (): void => {
    wantLive = false;
    const rec = live;
    live = null;
    rec?.stop();
    paint(false);
  };

  const spawn = (): void => {
    if (!wantLive) return; // stopped during the restart gap
    const rec = new Recognition();
    // Indonesian, because that is the language the placeholder invites and the corpus answers in.
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e): void => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i]?.[0];
        if (alt) said += alt.transcript;
      }
      if (!said.trim()) return;
      // Speech is flowing, so this is not the pathological cycle the guard below watches for.
      restarts = 0;
      // Append rather than replace: dictation adds to what is already typed, it does not erase it.
      box.value = box.value ? `${box.value.trimEnd()} ${said.trim()}` : said.trim();
      // The send button enables off `input`, and setting `.value` does not fire it.
      box.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onerror = (e): void => {
      // Only give up when a restart cannot help. `onend` always follows, and handles the rest.
      if (FATAL.has(e.error)) stop();
    };
    rec.onend = (): void => {
      if (!wantLive) {
        paint(false);
        return;
      }
      const now = Date.now();
      if (now - windowOpenedAt > RESTART_WINDOW_MS) {
        windowOpenedAt = now;
        restarts = 0;
      }
      if (++restarts > MAX_RESTARTS_PER_WINDOW) {
        stop();
        return;
      }
      live = null;
      setTimeout(spawn, RESTART_DELAY_MS);
    };
    live = rec;
    paint(true);
    try {
      rec.start();
    } catch {
      // Already-started or a refused device: a retry would only repeat it.
      stop();
    }
  };

  btn.addEventListener("click", () => {
    if (wantLive) {
      stop();
      return;
    }
    wantLive = true;
    restarts = 0;
    windowOpenedAt = Date.now();
    spawn();
  });

  return true;
}
