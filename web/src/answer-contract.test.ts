import { describe, expect, test } from "bun:test";
import { buildAnswerUserMessage, SYNTHESIS_SYSTEM_PROMPT, type AnswerContext } from "./answer-contract.ts";

const ctx = (over: Partial<AnswerContext> = {}): AnswerContext => ({
  question: "siapakah Allah?",
  verses: [{ ref: "112:1", surah_name: "Al-Ikhlas", text: "Katakanlah, Dialah Allah Yang Maha Esa." }],
  entries: [],
  ...over,
});

describe("SYNTHESIS_SYSTEM_PROMPT — the fences a careless edit must not remove", () => {
  test.each([
    ["cite only REAL ayat", /real ayah/i],
    ["always answer, never brush off", /always answer|never say ["“]?there is no verse/i],
    ["no Arabic", /never write arabic/i],
    ["not a mufti (warm-teacher boundary)", /not a mufti|binding verdict/i],
    ["not a scholar / humble", /not.*scholar|humble/i],
  ])("still teaches %s", (_label, re) => {
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(re);
  });
});

describe("buildAnswerUserMessage — hands the model the question + its grounding", () => {
  test("includes the question and the verse ref+text", () => {
    const msg = buildAnswerUserMessage(ctx());
    expect(msg).toContain("siapakah Allah?");
    expect(msg).toContain("[112:1]");
    expect(msg).toContain("Maha Esa");
  });

  test("includes scholar entries when present, labelled as reference not tafsir", () => {
    const msg = buildAnswerUserMessage(ctx({ entries: [{ ref: "QS. Al-Baqarah, 2:255", text: "Allah, tiada tuhan selain Dia." }] }));
    expect(msg).toContain("indeks ulama");
    expect(msg).toContain("2:255");
  });

  test("when nothing was auto-retrieved, invites the model to cite any real ayah it's sure of", () => {
    const msg = buildAnswerUserMessage(ctx({ verses: [] }));
    expect(msg).toMatch(/tidak ada ayat/i);
    expect(msg).toMatch(/ayat lain yang kamu yakin/i);
  });
});
