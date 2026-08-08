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
 * speech-to-text service arrives, `start()` is the seam: swap the recogniser, keep the button, the
 * pressed state, and the transcript-into-textarea contract exactly as they are.
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
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

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

  const stop = (): void => {
    live?.stop();
    live = null;
    btn.setAttribute("aria-pressed", "false");
    btn.classList.remove("is-live");
  };

  btn.addEventListener("click", () => {
    if (live) {
      stop();
      return;
    }
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
      // Append rather than replace: dictation adds to what is already typed, it does not erase it.
      box.value = box.value ? `${box.value.trimEnd()} ${said.trim()}` : said.trim();
      // The send button enables off `input`, and setting `.value` does not fire it.
      box.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onerror = stop;
    rec.onend = stop;
    live = rec;
    btn.setAttribute("aria-pressed", "true");
    btn.classList.add("is-live");
    rec.start();
  });

  return true;
}
