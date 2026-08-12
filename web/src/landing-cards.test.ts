/**
 * The two landing cards.
 *
 * The load-bearing test here is the pool's contents, not the DOM wiring. This card OFFERS a
 * question unprompted on the front door, so a silent question in the pool converts a failure a
 * reader had to type into one the app volunteers. The seven measured-silent candidates and the one
 * held for review are asserted absent BY NAME, so re-adding one has to be deliberate.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { registerDom, unregisterDom } from "./test-dom.ts";
import { ASK_SEEDS, nextSeed } from "./ask-seeds.ts";

registerDom();
afterAll(unregisterDom);

const { bindLandingCards } = await import("./landing-cards.ts");

/** Verbatim from docs/review/ask-seed-probe-2026-08-12.txt — SILENT verdicts. */
const MEASURED_SILENT = [
  "gimana cara taubat yang benar",
  "kenapa manusia diciptakan",
  "apakah kaya itu buruk dalam Islam",
  "gimana Islam mengajarkan berteman",
  "apa itu takwa sebenarnya",
  "apa kata Al-Qur'an tentang keadilan",
  "apa kata Al-Qur'an tentang menjaga alam",
];

describe("the pool is measured, and the silent ones stay out", () => {
  test.each(MEASURED_SILENT)("%j probed SILENT and must never be offered", (q) => {
    expect(ASK_SEEDS).not.toContain(q);
  });

  test("the one held for review is absent — a routing hit is not an answer", () => {
    // 8 entries in perintah-dan-larangan, but "beda agama" is the exact phrasing that fails
    // elsewhere in this app. Ships when someone has read those eight entries.
    expect(ASK_SEEDS).not.toContain("gimana bersikap ke teman yang beda agama");
  });

  test("30 probed, 7 silent, 1 held — 22 remain", () => {
    expect(ASK_SEEDS).toHaveLength(22);
  });

  test("no family-law ruling slipped in — they were excluded by construction and stay excluded", () => {
    for (const q of ASK_SEEDS) expect(q).not.toMatch(/nikah|kawin|talak|warisan|poligami/i);
  });
});

describe("nextSeed", () => {
  test("never returns the question already on screen", () => {
    // Every draw, not a sample: a shuffle that visibly does nothing reads as broken, not unlucky.
    for (const current of ASK_SEEDS) {
      for (let i = 0; i < 25; i++) expect(nextSeed(current)).not.toBe(current);
    }
  });

  test("always returns something from the pool", () => {
    expect(ASK_SEEDS).toContain(nextSeed());
  });

  test("Anti: a one-question pool still yields a question rather than undefined", () => {
    // The exclude filter can empty the pool; the fallback is what stops that becoming a blank card.
    expect(nextSeed(ASK_SEEDS[0], () => 0.99)).toBeTruthy();
  });
});

describe("wiring", () => {
  function mount(): void {
    document.body.innerHTML = `
      <div class="seeds">
        <button class="seed seed-pill" id="seed-q"><span>Acak pertanyaan</span></button>
        <button class="seed seed-pill" id="pop-open"><span>Yang sering dibuka</span></button>
      </div>
      <form id="composer"><textarea></textarea></form>`;
    bindLandingCards();
  }

  const box = () => document.querySelector("textarea")! as HTMLTextAreaElement;

  test("pressing it puts a pooled question IN the chat box", () => {
    mount();
    expect(box().value).toBe(""); // nothing lands there until asked for
    document.getElementById("seed-q")!.click();
    expect(ASK_SEEDS).toContain(box().value);
  });

  /**
   * The whole point of the control, and the thing that separates it from a slot machine: it offers
   * a question you can still read, edit or replace. Submitting on click would take that away.
   */
  test("Anti: it does NOT send the question — the reader still decides", () => {
    mount();
    let submitted = false;
    document.getElementById("composer")!.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
    });
    document.getElementById("seed-q")!.click();
    expect(submitted).toBe(false);
  });

  test("clicking again rotates to a different question, every time", () => {
    mount();
    const q = document.getElementById("seed-q")!;
    q.click();
    // Not a sample: a generator that can repeat itself reads as broken rather than unlucky, and
    // one press in 22 would do it if the previous pick were not excluded.
    for (let i = 0; i < 40; i++) {
      const before = box().value;
      q.click();
      expect(box().value).not.toBe(before);
    }
  });

  test("the rotation survives the reader editing the box by hand", () => {
    mount();
    const q = document.getElementById("seed-q")!;
    q.click();
    const generated = box().value;
    box().value = "aku ketik sendiri"; // reader types over it
    q.click();
    // Tracked internally rather than read back off the composer, so the next press cannot hand
    // back the question that was already shown.
    expect(box().value).not.toBe(generated);
    expect(ASK_SEEDS).toContain(box().value);
  });

  test("it fires `input`, or the send button stays disabled behind its own guard", () => {
    mount();
    let fired = false;
    box().addEventListener("input", () => {
      fired = true;
    });
    document.getElementById("seed-q")!.click();
    expect(fired).toBe(true);
  });

  test("Populer opens a real <dialog>, so the backdrop and inertness come for free", () => {
    mount();
    document.getElementById("pop-open")!.click();
    const d = document.getElementById("pop-dialog");
    expect(d).not.toBeNull();
    expect(d!.tagName).toBe("DIALOG");
  });

  test("the modal says the list is editorial — this edition measures no popularity", () => {
    mount();
    document.getElementById("pop-open")!.click();
    expect(document.getElementById("pop-dialog")!.textContent).toContain("bukan hasil penghitungan");
  });

  test("Anti: binding on a page without the cards does not throw", () => {
    document.body.innerHTML = `<main></main>`;
    expect(() => bindLandingCards()).not.toThrow();
  });
});
