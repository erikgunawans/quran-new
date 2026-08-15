/**
 * Where the reader is told the answer was written by a machine.
 *
 * These are pure string assertions on purpose — no Happy DOM, so this file cannot join the
 * registration collision the eight DOM suites share.
 */
import { describe, expect, it } from "bun:test";
import { AI_CHIP, AI_NOTE, AI_NOTE_NO_VERSES, assembleAnswer } from "./answer-disclosure.ts";

const BODY = `<p class="said ai-said">Allah Maha Pengampun bagi siapa saja yang bertobat.</p>`;
const TAIL = `<div class="ai-verses">…</div>`;

describe("the disclosure comes BEFORE the theology", () => {
  /**
   * MEASURED ON PROD 2026-08-16, `apakah Allah mengampuni dosa besar`: the only disclosure was the
   * footer note, rendering at **11.68px** against 17.5px prose and sitting **1,730px** below the
   * first sentence of the answer — and that was a SHORT answer (4 paragraphs, 2 verse cards). A
   * reader meets several hundred words about God and forgiveness, in the app's warm voice, long
   * before anything says a machine wrote it. Disclosure after the claim is not disclosure.
   */
  it("puts the chip ahead of the first spoken paragraph", () => {
    const html = assembleAnswer(BODY, TAIL, true);
    expect(html.indexOf(AI_CHIP)).toBeGreaterThanOrEqual(0);
    expect(html.indexOf(AI_CHIP)).toBeLessThan(html.indexOf('<p class="said ai-said"'));
  });

  it("says the two things that matter, in the reader's language", () => {
    expect(AI_CHIP).toContain("AI");
    expect(AI_CHIP.toLowerCase()).toContain("bukan fatwa");
  });

  it("is marked as a note for assistive tech, not read as prose", () => {
    expect(AI_CHIP).toContain('role="note"');
  });
});

describe("the footer note stays", () => {
  it("still closes the answer, so the full sentence is not lost", () => {
    const html = assembleAnswer(BODY, TAIL, true);
    expect(html.endsWith(AI_NOTE)).toBe(true);
  });

  it("keeps pointing at the verses only when verses are on the page", () => {
    expect(assembleAnswer(BODY, TAIL, true).endsWith(AI_NOTE)).toBe(true);
    expect(assembleAnswer(BODY, "", false).endsWith(AI_NOTE_NO_VERSES)).toBe(true);
    // The pointer is the whole difference between the two, and it must not survive into the
    // no-verses variant — it would send a reader looking for cards that were never rendered.
    expect(AI_NOTE).toContain("ayat-ayat di atas");
    expect(AI_NOTE_NO_VERSES).not.toContain("di atas");
  });
});

describe("neither disclosure claims scholarly authority", () => {
  it("names itself as not-a-fatwa and not-a-scholar in the full note", () => {
    for (const note of [AI_NOTE, AI_NOTE_NO_VERSES]) {
      expect(note).toContain("bukan fatwa");
      expect(note).toContain("bukan kata-kata seorang ulama");
      expect(note).toContain("ustadz");
    }
  });
});

describe("assembly order", () => {
  it("is chip → prose → trailing cards → note, and nothing is dropped", () => {
    const html = assembleAnswer(BODY, TAIL, true);
    const iChip = html.indexOf(AI_CHIP);
    const iBody = html.indexOf(BODY);
    const iTail = html.indexOf(TAIL);
    const iNote = html.indexOf(AI_NOTE);
    expect(iChip).toBeLessThan(iBody);
    expect(iBody).toBeLessThan(iTail);
    expect(iTail).toBeLessThan(iNote);
  });
});
