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
   * The whole Arabic block plus the Arabic Presentation Forms, not a word list. A word list would
   * be a vocabulary check; this is a SCRIPT check, and the failure it exists to catch is someone
   * pasting a lafal in without thinking about where it came from.
   */
  const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

  test("the data module carries no Arabic script", async () => {
    const src = await Bun.file("web/src/doa.ts").text();
    const offending = src.split("\n").filter((l) => ARABIC.test(l));
    expect(offending, `doa.ts must reference scripture, never reproduce it:\n${offending.join("\n")}`).toEqual([]);
  });

  test("no label is long enough to be a translation of its ayah", () => {
    // Labels name the speaker and the occasion ("Ayyub — ketika penyakit menimpanya"). A label that
    // ran to translation length would be reproducing the verse's meaning under another name.
    for (const r of allDoaRefs()) expect(r.label.length).toBeLessThanOrEqual(64);
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

  test("is synchronous — it fetches nothing", () => {
    // Guards the property the module's header claims. If a future edit makes the renderer load a
    // shard to show the ayah, this fails and the rights note above has to be revisited first.
    const originalFetch = globalThis.fetch;
    let called = 0;
    // A Proxy, not a replacement function with a cast.
    //
    // Bun's `typeof fetch` carries a `preconnect` property, so every hand-written stub — throwing,
    // resolving, with or without parameters — fails the overlap check and needs an
    // `as unknown as typeof fetch` to compile. Proxying the real fetch keeps the type exactly as it
    // was, which means this mock cannot drift out of shape when Bun's signature changes.
    globalThis.fetch = new Proxy(originalFetch, {
      apply(target, thisArg, args: Parameters<typeof fetch>) {
        called++;
        return Reflect.apply(target, thisArg, args);
      },
    });
    try {
      renderDoa(mount);
      expect(called).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
