import { registerDom, unregisterDom } from "./test-dom.ts";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

registerDom();

const S = await import("./settings.ts");

afterAll(async () => {
  await unregisterDom();
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-reduce-motion");
});

describe("settings persist and reapply", () => {
  test("a written choice survives a reload", () => {
    S.setTranslation("harfiyah");
    S.setArabicSize("l");
    S.setReduceMotion(true);
    expect(S.getTranslation()).toBe("harfiyah");
    expect(S.getArabicSize()).toBe("l");
    expect(S.getReduceMotion()).toBe(true);
  });

  test("unknown or corrupt stored values fall back to the default", () => {
    localStorage.setItem(S.KEYS.translation, "klingon");
    localStorage.setItem(S.KEYS.arabicSize, "xxl");
    localStorage.setItem(S.KEYS.theme, "neon");
    expect(S.getTranslation()).toBe("tafsiriyah");
    expect(S.getArabicSize()).toBe("m");
    expect(S.getTheme()).toBe("system");
  });
});

describe("ikut sistem must be an ABSENT attribute", () => {
  /**
   * The failure this pins is not hypothetical. The panel flips on `data-theme` while the ink tokens
   * flip on `prefers-color-scheme`; writing a computed value at the moment the reader chose
   * "system" both freezes the choice (the page stops following the OS at sunset) and can pin the
   * two mechanisms to opposite values — which paints panel text white-on-white while every DOM
   * assertion still passes. Absence IS the state.
   */
  test("choosing system removes the attribute rather than computing one", () => {
    S.setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    S.setTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  test("system is stored, so the choice is remembered as a choice", () => {
    S.setTheme("system");
    expect(localStorage.getItem(S.KEYS.theme)).toBe("system");
    expect(S.getTheme()).toBe("system");
  });

  test("applyAllSettings never writes the literal string 'system' into the attribute", () => {
    S.setTheme("system");
    S.applyAllSettings();
    expect(document.documentElement.getAttribute("data-theme")).not.toBe("system");
  });
});

describe("hapus data deletes what it names, and nothing else", () => {
  test("removes conversation and bookmark keys", () => {
    localStorage.setItem("newquranku:thread:1", "a");
    localStorage.setItem("newquranku:bookmark", "b");
    const removed = S.deleteConversationData();
    expect(removed).toBe(2);
    expect(localStorage.getItem("newquranku:thread:1")).toBeNull();
    expect(localStorage.getItem("newquranku:bookmark")).toBeNull();
  });

  test("LEAVES the settings alone", () => {
    // Someone clearing a private conversation off a shared phone is not asking to have their text
    // size reset. Surprising them is how a privacy control stops being trusted.
    S.setTheme("dark");
    S.setArabicSize("l");
    localStorage.setItem("newquranku:thread:1", "a");
    S.deleteConversationData();
    expect(S.getTheme()).toBe("dark");
    expect(S.getArabicSize()).toBe("l");
  });

  test("leaves unrelated origin keys alone — it enumerates, never clears", () => {
    localStorage.setItem("someone-elses-key", "keep me");
    localStorage.setItem("newquranku:thread:1", "a");
    S.deleteConversationData();
    expect(localStorage.getItem("someone-elses-key")).toBe("keep me");
  });

  test("reports zero on an empty store rather than claiming a deletion", () => {
    expect(S.deletableKeys()).toEqual([]);
    expect(S.deleteConversationData()).toBe(0);
  });
});

describe("ANTI: settings may change presentation, never permission", () => {
  /**
   * The load-bearing rule. Every setting here changes how the page looks or which of two ALREADY
   * SHIPPED translations leads. None may promote unreviewed material into view — hadith text is
   * gated by `SHOW_MACHINE_HADITH_TEXT`, AI answers by `fatwaShape` and the edition split, and both
   * gates encode a scholarly decision. A user-facing switch would be a way to route around that
   * decision by clicking, which is exactly how such a line erodes: one reasonable request at a time.
   */
  test("no key mentions hadith, AI, fatwa, or answer-mode", () => {
    // Tokenised, not substring-matched. A substring check fails on its own vocabulary — "explained"
    // contains "ai" — and a guard that reports a violation it invented is as useless as one that
    // misses a real one.
    const tokens = new Set(
      Object.values(S.KEYS)
        .join(" ")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean),
    );
    for (const forbidden of ["hadith", "hadis", "ai", "fatwa", "answer", "synthesis", "review"]) {
      expect(tokens.has(forbidden), `settings key namespace must not mention "${forbidden}"`).toBe(false);
    }
  });

  test("the settings module exports no toggle for gated content", async () => {
    const src = await Bun.file("web/src/settings.ts").text();
    const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const forbidden of ["SHOW_MACHINE_HADITH_TEXT", "reviewed_id", "ANSWER_MODE", "synthesis"]) {
      expect(code.includes(forbidden), `settings.ts must not touch "${forbidden}"`).toBe(false);
    }
  });
});
