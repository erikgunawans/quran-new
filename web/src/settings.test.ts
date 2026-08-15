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

describe("ikut sistem RESOLVES the attribute — it is never absent", () => {
  /**
   * THIS BLOCK USED TO ASSERT THE OPPOSITE, and the inversion is the point.
   *
   * It was titled "ikut sistem must be an ABSENT attribute" and pinned
   * `hasAttribute("data-theme") === false`. Its reasoning named two real dangers — a frozen choice,
   * and the panel and ink tokens keyed off opposite mechanisms — and then chose the remedy that
   * causes the second one. Measured live on prod 2026-08-15: with the attribute absent, the panel
   * paints `rgb(242,255,248)` while the ink tokens stay dark-register, giving **15 contrast
   * failures** and answer prose at **1.06:1** — invisible. "Ikut sistem" is the DEFAULT choice, so
   * that was the shipped state, and a reload re-stamped a resolved value and hid it.
   *
   * A green test asserted the defect for as long as it existed. That is the reason this comment is
   * long: the next person to read `hasAttribute(...) === false` and think it looks more correct
   * needs the measurement, not the intent.
   *
   * The frozen-choice danger is still real and is now handled by the `matchMedia` watcher in
   * `applyTheme`, which is where it belonged — absence was never what kept the page following the
   * OS; re-resolving is.
   */
  test("choosing system resolves to a concrete register rather than removing the attribute", () => {
    S.setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    S.setTheme("system");
    // The ONE invariant that the white-on-white failure violates: the panel and the ink tokens must
    // never be able to read different signals, which requires the attribute to always be present.
    expect(document.documentElement.hasAttribute("data-theme")).toBe(true);
    expect(["light", "dark"]).toContain(String(document.documentElement.getAttribute("data-theme")));
  });

  test("system is stored, so the choice is remembered as a choice", () => {
    // Resolving the ATTRIBUTE must not resolve the STORED value — otherwise "follow the system"
    // decays into "I picked dark once", and the watcher would have nothing to re-read.
    S.setTheme("system");
    expect(localStorage.getItem(S.KEYS.theme)).toBe("system");
    expect(S.getTheme()).toBe("system");
  });

  test("applyAllSettings never writes the literal string 'system' into the attribute", () => {
    // Unchanged and still load-bearing: the CSS knows `light` and `dark`. `data-theme="system"`
    // would match no rule and reopen the same desync from the other direction.
    S.setTheme("system");
    S.applyAllSettings();
    expect(document.documentElement.getAttribute("data-theme")).not.toBe("system");
    expect(["light", "dark"]).toContain(String(document.documentElement.getAttribute("data-theme")));
  });

  test("the boot path and the settings path agree on what 'system' means", () => {
    // The bug was a POLICY CONFLICT, not a typo: main.ts's boot always stamped a resolved value
    // (its comment: "the bad state enters HERE"), while settings.ts removed the attribute — so the
    // app was correct on load and broke the moment the reader touched the control. Same input, same
    // attribute, whichever path ran.
    S.setTheme("system");
    const fromSet = document.documentElement.getAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme");
    S.applyAllSettings();
    const fromBoot = document.documentElement.getAttribute("data-theme");
    expect(fromBoot).toBe(fromSet);
    // AGREEING ON `null` IS NOT AGREEMENT. Under the old policy both paths removed the attribute, so
    // the equality above held while the app was broken — the assertion passed on `null === null`.
    // Pin the agreed value to a concrete register, or this test re-admits the exact bug it guards.
    expect(["light", "dark"]).toContain(String(fromBoot));
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
