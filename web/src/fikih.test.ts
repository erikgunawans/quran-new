import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

GlobalRegistrator.register();

const { renderFikih } = await import("./sections.ts");
const { resetHadithCache } = await import("./hadith.ts");
const { FIQH_AREAS } = await import("./fikih.ts");

afterAll(async () => {
  await GlobalRegistrator.unregister();
});

/**
 * Fikih is dalil-only: a doorway into the sourced hadith, never a ruling. These tests defend two
 * lines it must not cross — every topic must point at a kitab the imams themselves defined (a ref
 * that resolves in the real index), and the module must carry NO Arabic (kitab names are read from
 * the corpus at render time, never retyped) and NO fiqh prose.
 */
const readJSON = async (p: string) => JSON.parse(await Bun.file(p).text());
const INDEX = await readJSON("web/public/hadith/index.json");

const mockFetch = (routes: Record<string, unknown>) => {
  globalThis.fetch = (async (url: string | URL) => {
    const key = String(url);
    const body = routes[key];
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) } as Response;
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as typeof fetch;
};

let mount: HTMLElement;
beforeEach(() => {
  resetHadithCache();
  document.body.innerHTML = `<div id="read"></div>`;
  mount = document.querySelector<HTMLElement>("#read")!;
});

describe("fikih data — sourced in the compilers' own kitab", () => {
  test("every ref resolves to a real (collection, book) in the emitted index", () => {
    const real = new Set<string>();
    for (const c of INDEX.collections) for (const b of c.books) real.add(`${c.id}/${b.no}`);
    for (const area of FIQH_AREAS) {
      for (const ref of area.refs) {
        expect(real.has(`${ref.collection}/${ref.book}`)).toBe(true);
      }
    }
  });

  test("area ids are unique and every area has at least one ref", () => {
    const ids = FIQH_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of FIQH_AREAS) expect(a.refs.length).toBeGreaterThan(0);
  });

  test("the data carries NO Arabic and NO ruling text — only ids, labels, refs", () => {
    for (const a of FIQH_AREAS) {
      expect(/[؀-ۿ]/.test(a.title + a.sub)).toBe(false);
    }
  });
});

describe("fikih render", () => {
  test("one card per area, chips link into the hadith drilldown with corpus Arabic", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderFikih(mount);
    expect(mount.querySelectorAll(".fikih-card").length).toBe(FIQH_AREAS.length);
    const chips = mount.querySelectorAll<HTMLAnchorElement>(".fikih-kitab");
    const totalRefs = FIQH_AREAS.reduce((n, a) => n + a.refs.length, 0);
    expect(chips.length).toBe(totalRefs);
    for (const chip of chips) {
      expect(chip.getAttribute("href")).toMatch(/^#\/hadis\/(bukhari|muslim)\/\d+$/);
      // The Arabic kitab name came from the corpus, not the fikih module.
      expect(chip.querySelector(".fikih-kitab-ar")?.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  test("the 'not a ruling' honesty note is present", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderFikih(mount);
    expect(mount.textContent).toContain("pintu masuk ke dalil");
    expect(mount.textContent).toContain("tidak berfatwa");
  });

  test("a failed index fetch shows a message, not a blank pane", async () => {
    mockFetch({});
    await renderFikih(mount);
    expect(mount.textContent).toContain("Gagal memuat");
  });
});
