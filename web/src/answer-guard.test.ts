import { describe, expect, test } from "bun:test";
import { allowedRefsFrom, guardAnswerProse, safeAnswer } from "./answer-guard.ts";

const allow = (...refs: string[]) => allowedRefsFrom(refs);

describe("guardAnswerProse — Arabic is always rejected", () => {
  test("any Arabic script in the prose fails", () => {
    const r = guardAnswerProse("Allah Maha Esa. قُلْ هُوَ ٱللَّهُ", allow("112:1"));
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("arabic");
  });

  test("plain Indonesian answer with no Arabic passes", () => {
    expect(guardAnswerProse("Allah itu Maha Esa dan tempat bergantung.", allow("112:1")).ok).toBe(true);
  });
});

describe("guardAnswerProse — citations must be grounded", () => {
  test("a cited ref that is in the grounding passes", () => {
    const prose = "Seperti disebut dalam QS Al-Ikhlas 112:1, Allah itu Esa.";
    expect(guardAnswerProse(prose, allow("112:1", "2:255")).ok).toBe(true);
  });

  test("a cited ref that is NOT in the grounding is a hallucination → rejected", () => {
    // The model invented 4:82; it was never handed that verse. This is the exact failure mode the
    // whole app refuses — the guard catches it even though the prose reads fluently.
    const prose = "Ini dijelaskan dalam QS 4:82 dan QS 112:1.";
    const r = guardAnswerProse(prose, allow("112:1"));
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toEqual({ kind: "bad_ref", detail: "4:82" });
  });

  test("ref spelled with a dot or spaces is still checked", () => {
    expect(guardAnswerProse("Lihat 2.255.", allow("2:255")).ok).toBe(true);
    expect(guardAnswerProse("Lihat 2 : 256.", allow("2:255")).ok).toBe(false);
  });

  test("a range citation is judged by its base ref", () => {
    expect(guardAnswerProse("Al-Ikhlas 112:1-4 menegaskan keesaan.", allow("112:1")).ok).toBe(true);
  });

  test("prose with no references at all passes (nothing to hallucinate)", () => {
    expect(guardAnswerProse("Allah Maha Pengasih dan dekat dengan hamba-Nya.", allow()).ok).toBe(true);
  });
});

describe("safeAnswer — the caller's fall-back gate", () => {
  test("clean prose returns as-is (trimmed)", () => {
    expect(safeAnswer("  Allah Maha Esa.  ", allow())).toBe("Allah Maha Esa.");
  });

  test("empty prose returns null", () => {
    expect(safeAnswer("   ", allow())).toBeNull();
  });

  test("an ungrounded citation returns null so the caller falls back", () => {
    expect(safeAnswer("Lihat QS 99:9.", allow("112:1"))).toBeNull();
  });
});

describe("allowedRefsFrom — normalises grounding refs to surah:ayah", () => {
  test("parses the scholar's display form and the bare form", () => {
    const set = allowedRefsFrom(["QS. Al-Ikhlas, 112:1", "2:255"]);
    expect(set.has("112:1")).toBe(true);
    expect(set.has("2:255")).toBe(true);
    expect(set.has("4:82")).toBe(false);
  });
});
