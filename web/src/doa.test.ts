import { registerDom, unregisterDom } from "./test-dom.ts";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

registerDom();

const { renderDoa } = await import("./sections.ts");
const { DOA_THEMES, allDoaRefs, doaHref } = await import("./doa.ts");

afterAll(async () => {
  await unregisterDom();
});

/**
 * Kumpulan Doa is reference-only, and these tests defend the two properties that make it shippable
 * without anyone's permission.
 *
 * The first is a RIGHTS boundary: the module carries no scripture. Every doa book that could have
 * been vendored here is in copyright (Hisnul Muslim to ~2068; Kemenag's own doa book carries
 * "Dilarang memperbanyak isi buku"), so the section earns its content by pointing at the corpus
 * this app already serves rather than by reproducing one. A future edit that pastes an ayah in to
 * "make the card nicer" would quietly cross that line, and `carries no Arabic script` is what
 * stops it.
 *
 * The second is a CORRECTNESS boundary and the reason a doorway is safer than a quote: a broken
 * reference is a dead link, but a mistyped ayah is a misattribution to God. Every ref is checked
 * against the shipped shards — Arabic AND both Indonesian translations present — because a chip
 * that opens onto a verse with no translation is a promise the reading surface cannot keep.
 */
const readJSON = async (p: string) => JSON.parse(await Bun.file(p).text());

const shards = new Map<number, { verses: { a: number; ar: string; p?: { text: string }; c?: { text: string } }[] }>();
for (const r of allDoaRefs()) {
  if (!shards.has(r.surah)) shards.set(r.surah, await readJSON(`web/public/surah/${r.surah}.json`));
}

let mount: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = `<div id="read"></div>`;
  mount = document.querySelector<HTMLElement>("#read")!;
});

describe("doa data — every door opens onto a real ayah", () => {
  test("every ref resolves in the shipped corpus", () => {
    for (const r of allDoaRefs()) {
      const v = shards.get(r.surah)!.verses.find((x) => x.a === r.ayah);
      expect(v, `QS ${r.surah}:${r.ayah} missing from the shard`).toBeDefined();
      expect(v!.ar.trim().length, `QS ${r.surah}:${r.ayah} has no Arabic`).toBeGreaterThan(0);
    }
  });

  test("every ref carries BOTH Indonesian translations the reading surface renders", () => {
    for (const r of allDoaRefs()) {
      const v = shards.get(r.surah)!.verses.find((x) => x.a === r.ayah)!;
      expect(v.p?.text?.trim(), `QS ${r.surah}:${r.ayah} has no interpretive translation`).toBeTruthy();
      expect(v.c?.text?.trim(), `QS ${r.surah}:${r.ayah} has no literal translation`).toBeTruthy();
    }
  });

  test("surah numbers are inside the mushaf and ayah numbers are positive", () => {
    for (const r of allDoaRefs()) {
      expect(r.surah).toBeGreaterThanOrEqual(1);
      expect(r.surah).toBeLessThanOrEqual(114);
      expect(r.ayah).toBeGreaterThanOrEqual(1);
    }
  });

  test("theme ids are unique and no ayah is listed twice", () => {
    const ids = DOA_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = allDoaRefs().map((r) => `${r.surah}:${r.ayah}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every theme has a title, a context line, and at least one door", () => {
    for (const t of DOA_THEMES) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.sub.trim().length).toBeGreaterThan(0);
      expect(t.refs.length).toBeGreaterThan(0);
      for (const r of t.refs) expect(r.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("doa rights boundary — the module reproduces nothing", () => {
  /**
   * `\p{Script=Arabic}`, not a hand-written range list. The hand-written version this replaces
   * covered U+0600–06FF, the Supplement and the Presentation Forms, but MISSED Arabic Extended-A
   * (U+08A0–08FF) — which is where the Quranic annotation signs live, i.e. exactly the marks a
   * pasted lafal is most likely to carry. A range list is a vocabulary check wearing a script
   * check's clothes; the property escape is the real thing and cannot drift.
   */
  const ARABIC = /\p{Script=Arabic}/u;

  test("the data module carries no Arabic script", async () => {
    const src = await Bun.file("web/src/doa.ts").text();
    const offending = src.split("\n").filter((l) => ARABIC.test(l));
    expect(offending, `doa.ts must reference scripture, never reproduce it:\n${offending.join("\n")}`).toEqual([]);
  });

  /**
   * No label may share a 4-word run with either shipped translation of its own ayah.
   *
   * This replaces a `label.length <= 64` bound, which was worthless: the longest label was 54, so
   * the guard was calibrated above everything that already existed and could never fire. It passed
   * while FOUR labels carried verbatim spans of the Kemenag and Thalib translations — "Dialah yang
   * menyembuhkan aku", "dan aku belum pernah kecewa", "aku dan kedua orang tuaku", "Kebaikan di
   * dunia dan" — on a card whose own note tells the reader `lafal dan artinya bukan` ours.
   *
   * The added legal exposure was nil: the app renders both translations in full one click away. The
   * defect was HONESTY, and it is the kind a length bound can never see. A label names the occasion
   * ("Musa — sebelum menghadap penguasa"); the moment it renders the meaning it is a translation,
   * whatever we call it.
   */
  const words = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const runs = (w: string[], n = 4): Set<string> => {
    const out = new Set<string>();
    for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
    return out;
  };

  test("no label shares a 4-word run with either translation of its own ayah", () => {
    const offenders: string[] = [];
    for (const r of allDoaRefs()) {
      const v = shards.get(r.surah)!.verses.find((x) => x.a === r.ayah)!;
      // Only the part AFTER the em dash is the claim about content; the part before it names the
      // speaker ("Ibrahim"), which is a fact and may legitimately echo the verse.
      const claim = runs(words(r.label.split("—").pop() ?? r.label));
      for (const t of [v.p?.text, v.c?.text]) {
        if (!t) continue;
        const src = runs(words(t));
        for (const g of claim) if (src.has(g)) offenders.push(`QS ${r.surah}:${r.ayah} — "${g}"`);
      }
    }
    expect(offenders, `labels must name the occasion, never render the meaning:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("the rendered section shows no Arabic either", () => {
    renderDoa(mount);
    expect(ARABIC.test(mount.textContent ?? "")).toBe(false);
  });
});

describe("doa render — a doorway, and it says so", () => {
  test("renders one card per theme with every ref as a chip", () => {
    renderDoa(mount);
    expect(mount.querySelectorAll(".doa-card").length).toBe(DOA_THEMES.length);
    expect(mount.querySelectorAll(".doa-ayat").length).toBe(allDoaRefs().length);
  });

  test("every chip points at the reading route the router already parses", () => {
    renderDoa(mount);
    const hrefs = [...mount.querySelectorAll<HTMLAnchorElement>(".doa-ayat")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(allDoaRefs().map(doaHref));
    // The shape `main.ts` matches at the detail-route regex. A chip that does not match it renders
    // a card that silently falls through to the chat surface.
    for (const h of hrefs) expect(h).toMatch(/^#\/surah\/\d{1,3}#\d{1,3}$/);
  });

  test("carries the honesty note about what is ours and what is not", () => {
    renderDoa(mount);
    const note = mount.querySelector(".hadith-note")?.textContent ?? "";
    expect(note).toContain("Al-Qur'an");
    expect(note).toMatch(/judulnya kami yang menulis/i);
  });

  /**
   * Read at the SOURCE, not through a runtime spy.
   *
   * The spy version of this test proxied `globalThis.fetch` and asserted it was never called. It
   * was a sieve, and three realistic edits walked straight through it: a module-scope
   * `const f = fetch` binds the real function at import time, which is BEFORE the spy installs;
   * a `queueMicrotask`/`setTimeout` fetch resolves after the synchronous assertion has already
   * passed; and `XMLHttpRequest` never touches `fetch` at all.
   *
   * A source check has none of those holes. `doa.ts` owns no data and must never acquire any — the
   * moment it can load a shard, the rights note in its header stops being true and has to be
   * rewritten before the code lands, which is exactly the order this test enforces.
   */
  test("the data module reaches no network API at all", async () => {
    // Comments are stripped first. The header explains WHY the module fetches nothing, and that
    // explanation necessarily contains the word — a check that reads prose flags its own rationale.
    const code = (await Bun.file("web/src/doa.ts").text())
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const api of ["fetch", "XMLHttpRequest", "EventSource", "WebSocket", "import("]) {
      expect(code.includes(api), `doa.ts must own no data — found "${api}" in code`).toBe(false);
    }
  });
});
