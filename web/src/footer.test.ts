import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { registerDom, unregisterDom } from "./test-dom.ts";

registerDom();
afterAll(unregisterDom);

const { bindFooter } = await import("./footer.ts");

/** The markup the real page carries, trimmed to what the behaviour depends on. */
function mount(): { handle: HTMLElement; panel: HTMLElement } {
  document.body.innerHTML = `
    <footer class="site-footer" id="site-footer">
      <div class="sf-panel" id="sf-panel" hidden><a href="#/doa">Kumpulan Doa</a></div>
      <button type="button" class="sf-handle" id="sf-handle" aria-expanded="false" aria-controls="sf-panel">
        <span class="sf-chev"></span>
      </button>
    </footer>`;
  bindFooter();
  return {
    handle: document.getElementById("sf-handle")!,
    panel: document.getElementById("sf-panel")!,
  };
}

describe("the footer opens, closes, and says so", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("starts collapsed — and collapsed means OUT of the tree, not merely 0px tall", () => {
    const { handle, panel } = mount();
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    // The whole reason `hidden` was chosen over a height animation: a 0px panel is still tabbable
    // and still read aloud, so a "closed" footer becomes the first thing a keyboard user meets.
    expect(panel.hidden).toBe(true);
  });

  test("clicking the handle opens it", () => {
    const { handle, panel } = mount();
    handle.click();
    expect(panel.hidden).toBe(false);
    expect(handle.getAttribute("aria-expanded")).toBe("true");
  });

  test("clicking again closes it — it is a toggle, not a one-way door", () => {
    const { handle, panel } = mount();
    handle.click();
    handle.click();
    expect(panel.hidden).toBe(true);
    expect(handle.getAttribute("aria-expanded")).toBe("false");
  });

  /**
   * The state the chevron and the screen reader both read from. If these two ever disagree the one
   * that drifts is `aria-expanded`, because nobody can see it — so it is asserted on every branch
   * above rather than once here.
   */
  test("aria-expanded and the panel never disagree across several toggles", () => {
    const { handle, panel } = mount();
    for (let i = 0; i < 5; i++) {
      handle.click();
      expect(panel.hidden).toBe(handle.getAttribute("aria-expanded") !== "true");
    }
  });

  test("Escape closes an open footer and returns focus to the handle", () => {
    const { handle, panel } = mount();
    handle.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(handle);
  });

  /**
   * What the `!isOpen(handle)` guard actually protects.
   *
   * The first version of this test asserted that Escape still reached other listeners — and that
   * assertion COULD NOT FAIL, because the handler never calls stopPropagation, so deleting the
   * guard left it green. Force-red caught it: a mutation that removes the guard has to turn a test
   * red or the test is decoration.
   *
   * The real regression is focus theft. Without the guard, Escape pressed anywhere in the app —
   * in the composer, in a dialog — runs `handle.focus()` and yanks the caret down to the footer.
   */
  test("Anti: Escape while closed does not steal focus to the handle", () => {
    const { handle, panel } = mount();
    const elsewhere = document.createElement("textarea");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    expect(document.activeElement).toBe(elsewhere);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(panel.hidden).toBe(true);
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(elsewhere);
  });

  test("Anti: binding on a document without the footer does not throw", () => {
    document.body.innerHTML = `<main id="app"></main>`;
    expect(() => bindFooter()).not.toThrow();
  });
});
