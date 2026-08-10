import { registerDom, unregisterDom } from "./test-dom.ts";
import { afterAll, describe, expect, test } from "bun:test";

registerDom();

const { splitEl } = await import("./read.ts");

afterAll(async () => {
  await unregisterDom();
});

/**
 * The regression this file exists for.
 *
 * The split gave the surah text its own scroll container. The reading-position observer was still
 * rooted at the VIEWPORT with `rootMargin: "0px 0px -75% 0px"` — a band covering the top quarter of
 * the window. The text column starts below that band, so no verse could ever intersect it: the
 * bookmark silently stopped advancing and Riwayat Bacaan silently stopped updating. Nothing threw,
 * nothing logged, and every test still passed.
 *
 * The fix roots the observer at the column. These tests pin the structure that fix depends on, so
 * the failure cannot come back quietly.
 */

const dom = (html: string): HTMLElement => {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d;
};

describe("splitEl — the structure reading-position tracking depends on", () => {
  test("#surah-body IS the scrolling element, not a child of it", () => {
    const el = dom(splitEl(false));
    const body = el.querySelector("#surah-body");
    expect(body).not.toBeNull();
    // If this fails, renderSurah is handing startTracking a box that does not scroll.
    expect(body!.classList.contains("sp-scroll")).toBe(true);
  });

  test("the scrolling element is inside the text column, not the intro column", () => {
    const el = dom(splitEl(false));
    expect(el.querySelector(".sp-text #surah-body")).not.toBeNull();
    expect(el.querySelector(".sp-intro #surah-body")).toBeNull();
  });

  test("the preface has its own scroll container, separate from the text", () => {
    const el = dom(splitEl(false));
    const intro = el.querySelector(".sp-intro #intro-body");
    expect(intro).not.toBeNull();
    expect(intro!.classList.contains("sp-scroll")).toBe(true);
  });
});

describe("splitEl — the three states are reachable", () => {
  test("a surah opens 50/50", () => {
    expect(dom(splitEl(false)).querySelector(".surah-split")!.getAttribute("data-pane")).toBe("split");
  });

  test("both sides carry a control that names the pane it selects", () => {
    const el = dom(splitEl(false));
    const targets = [...el.querySelectorAll(".sp-tab")].map((t) => t.getAttribute("data-pane-to"));
    expect(targets.sort()).toEqual(["intro", "text"]);
  });

  test("every collapsed side keeps a labelled control, so no full-width state is a dead end", () => {
    const el = dom(splitEl(false));
    for (const tab of el.querySelectorAll(".sp-tab")) {
      expect(tab.querySelector(".sp-tab-label")!.textContent!.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("splitEl — the skeleton only shows when there is a wait to cover", () => {
  test("a cached surah paints no text skeleton", () => {
    expect(dom(splitEl(true)).querySelector(".sp-text .read-sk")).toBeNull();
  });

  test("an uncached surah does", () => {
    expect(dom(splitEl(false)).querySelector(".sp-text .read-sk")).not.toBeNull();
  });

  test("the preface always opens on a skeleton — it is always fetched", () => {
    expect(dom(splitEl(true)).querySelector(".sp-intro .read-sk")).not.toBeNull();
  });
});
