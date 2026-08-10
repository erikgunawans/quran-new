/**
 * The mic must stay on until the USER turns it off.
 *
 * The bug these cover: Chrome's recogniser ends itself after a silence even with
 * `continuous = true`, and `onend`/`onerror` were wired straight to the teardown — so the mic
 * switched itself off mid-session and the button could not hold it on. Every test here drives the
 * recogniser's lifecycle callbacks directly, because that is the surface the browser actually
 * exercises and the one the old code got wrong.
 */

import { registerDom, unregisterDom } from "./test-dom.ts";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "bun:test";

registerDom();

const { initDictation } = await import("./dictate.ts");

afterAll(async () => {
  await unregisterDom();
});

/** A stand-in for Chrome's recogniser: records lifecycle, lets a test fire the callbacks. */
class FakeRecognition {
  static made: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  started = 0;
  stopped = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.made.push(this);
  }
  start(): void {
    this.started++;
  }
  stop(): void {
    this.stopped++;
  }

  /** What Chrome does on a silence: a `no-speech` error, then `end`. */
  silenceTimeout(): void {
    this.onerror?.({ error: "no-speech" });
    this.onend?.();
  }
}

const latest = (): FakeRecognition => FakeRecognition.made[FakeRecognition.made.length - 1]!;

/** The restart is deferred out of `onend`; this waits past that gap. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 400));

function mount(): { doc: Document; btn: HTMLButtonElement; box: HTMLTextAreaElement } {
  document.body.innerHTML = `
    <textarea id="q"></textarea>
    <button id="mic" hidden aria-pressed="false"></button>`;
  return {
    doc: document,
    btn: document.querySelector<HTMLButtonElement>("#mic")!,
    box: document.querySelector<HTMLTextAreaElement>("#q")!,
  };
}

describe("dictation", () => {
  beforeEach(() => {
    FakeRecognition.made = [];
    (window as unknown as Record<string, unknown>)["SpeechRecognition"] = FakeRecognition;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)["SpeechRecognition"];
  });

  it("shows the button and starts listening on click", () => {
    const { btn } = mount();
    expect(initDictation()).toBe(true);
    expect(btn.hidden).toBe(false);

    btn.click();
    expect(latest().started).toBe(1);
    expect(latest().continuous).toBe(true);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.classList.contains("is-live")).toBe(true);
  });

  it("STAYS ON when the recogniser times out on silence", async () => {
    const { btn } = mount();
    initDictation();
    btn.click();

    latest().silenceTimeout();
    await settle();

    // A new recogniser took over, and the button never stopped reading as live.
    expect(FakeRecognition.made.length).toBe(2);
    expect(latest().started).toBe(1);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.classList.contains("is-live")).toBe(true);
  });

  it("survives repeated silence timeouts across a long session", async () => {
    const { btn } = mount();
    initDictation();
    btn.click();

    for (let i = 0; i < 3; i++) {
      latest().silenceTimeout();
      await settle();
    }

    expect(FakeRecognition.made.length).toBe(4);
    expect(btn.classList.contains("is-live")).toBe(true);
  });

  it("stops for good when the user clicks again", async () => {
    const { btn } = mount();
    initDictation();
    btn.click();
    const first = latest();

    btn.click();
    expect(first.stopped).toBe(1);
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.classList.contains("is-live")).toBe(false);

    // A late `onend` from the recogniser must not bring the mic back.
    first.onend?.();
    await settle();
    expect(FakeRecognition.made.length).toBe(1);
    expect(btn.classList.contains("is-live")).toBe(false);
  });

  it("does NOT restart when the microphone is refused", async () => {
    const { btn } = mount();
    initDictation();
    btn.click();

    latest().onerror?.({ error: "not-allowed" });
    latest().onend?.();
    await settle();

    expect(FakeRecognition.made.length).toBe(1);
    expect(btn.classList.contains("is-live")).toBe(false);
  });

  it("appends transcripts instead of erasing what is typed", () => {
    const { btn, box } = mount();
    initDictation();
    box.value = "Sudah ada";
    btn.click();

    latest().onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: "teks baru" }], { isFinal: true })],
    });

    expect(box.value).toBe("Sudah ada teks baru");
  });

  it("hides the button entirely when the engine is unavailable", () => {
    const { btn } = mount();
    delete (window as unknown as Record<string, unknown>)["SpeechRecognition"];
    expect(initDictation()).toBe(false);
    expect(btn.hidden).toBe(true);
  });
});
