import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

GlobalRegistrator.register();

const { renderHadis, renderHadisBook } = await import("./sections.ts");
const { resetHadithCache, findCollection } = await import("./hadith.ts");

afterAll(async () => {
  await GlobalRegistrator.unregister();
});

/**
 * The Hadis surface, under the same rights guarantee the Peta Tematik tests enforce.
 *
 * The corpus is ARABIC ONLY on purpose (build-hadith.ts drops the "private research use" English).
 * These tests defend two separate claims: the DATA is faithful and translation-free, and the
 * RENDERER shows it without leaking English or inventing content. Fixtures are real slices of the
 * emitted shards read from disk — a hand-written fixture would only prove the renderer matches my
 * imagination. The shards are a build artifact; `bun run app:hadith` must have run.
 */
const readJSON = async (p: string) => JSON.parse(await Bun.file(p).text());

const INDEX = await readJSON("web/public/hadith/index.json");
const BUKHARI_1 = await readJSON("web/public/hadith/bukhari/1.json");

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

describe("hadith corpus — the emitted shards", () => {
  test("both Ṣaḥīḥs, 14,736 hadith total, counts internally consistent", () => {
    expect(INDEX.total).toBe(14736);
    const ids = INDEX.collections.map((c: { id: string }) => c.id);
    expect(ids).toEqual(["bukhari", "muslim"]);
    for (const c of INDEX.collections) {
      const summed = c.books.reduce((n: number, b: { hadith: number }) => n + b.hadith, 0);
      expect(summed).toBe(c.hadith);
    }
    const grand = INDEX.collections.reduce((n: number, c: { hadith: number }) => n + c.hadith, 0);
    expect(grand).toBe(INDEX.total);
  });

  test("a shard carries byte-nonempty Arabic, a grade, and a sunnah.com link — and NO translation", () => {
    const h = BUKHARI_1.babs[0].hadith[0];
    expect(h.ar.length).toBeGreaterThan(0);
    expect(h.grade).toBe("sahih");
    expect(h.url).toContain("sunnah.com");
    // The English body must never ship. No hadith text carries a run of Latin letters.
    for (const bab of BUKHARI_1.babs) {
      for (const one of bab.hadith) {
        expect(/[A-Za-z]{3,}/.test(one.ar)).toBe(false);
      }
    }
  });

  test("shard shape (no translation, narrator, or English titles smuggled in)", () => {
    const h = BUKHARI_1.babs[0].hadith[0];
    expect(Object.keys(h).sort()).toEqual(["ar", "grade", "n", "url"]);
    expect(BUKHARI_1.book).toEqual({ no: 1, ar: BUKHARI_1.book.ar });
    expect(BUKHARI_1.book.ar).not.toMatch(/[A-Za-z]/);
  });

  test("findCollection resolves ids and rejects unknown ones", () => {
    expect(findCollection(INDEX, "bukhari")?.name).toBe("Sahih al-Bukhari");
    expect(findCollection(INDEX, "muslim")?.name).toBe("Sahih Muslim");
    expect(findCollection(INDEX, "nope")).toBeUndefined();
  });
});

describe("hadith index render", () => {
  test("one tab + panel per collection, one card per kitab, from the real index", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    expect(mount.querySelectorAll(".hadith-tab").length).toBe(2);
    expect(mount.querySelectorAll(".hadith-panel").length).toBe(2);
    // exactly one panel is visible at a time (tabs, not a 154-kitab wall)
    expect(mount.querySelectorAll(".hadith-panel:not([hidden])").length).toBe(1);
    const cards = mount.querySelectorAll(".hadith-kitab-grid .hadith-kitab").length;
    const kitab = INDEX.collections.reduce((n: number, c: { books: unknown[] }) => n + c.books.length, 0);
    expect(cards).toBe(kitab);
  });

  test("switching tabs reveals the other collection's panel", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    const tabs = mount.querySelectorAll<HTMLButtonElement>(".hadith-tab");
    tabs[1]!.click();
    const visible = mount.querySelector<HTMLElement>(".hadith-panel:not([hidden])");
    expect(visible?.dataset.coll).toBe("muslim");
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
  });

  test("the filter hides kitab cards that match neither number nor Arabic name", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    const filter = mount.querySelector<HTMLInputElement>(".hadith-filter")!;
    filter.value = "8"; // kitab 8 in the visible (Bukhari) panel
    filter.dispatchEvent(new Event("input"));
    const panel = mount.querySelector<HTMLElement>(".hadith-panel:not([hidden])")!;
    const visibleCards = [...panel.querySelectorAll<HTMLElement>(".hadith-kitab")].filter((c) => !c.hidden);
    expect(visibleCards.length).toBeGreaterThan(0);
    expect(visibleCards.every((c) => (c.dataset.search ?? "").includes("8"))).toBe(true);
  });

  test("kitab cards link into the drilldown route", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    const first = mount.querySelector<HTMLAnchorElement>(".hadith-kitab")!;
    expect(first.getAttribute("href")).toMatch(/^#\/hadis\/bukhari\/\d+$/);
  });

  test("the honesty note about withheld translation is always present", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    expect(mount.querySelector(".hadith-note")).not.toBeNull();
    // Tightened 2026-08-10, when the kitab TITLES became Indonesian. The old assertion read
    // "Terjemahan Indonesia menyusul" — which stopped being true the moment a title was translated,
    // and would have let the page keep claiming it. The note now has to distinguish the two, so the
    // test does too: what is still withheld is the TEXT, and the reason is still review + licence.
    expect(mount.textContent).toContain("teks hadisnya tetap Arab");
    expect(mount.textContent).toContain("Terjemahan teks hadis menyusul");
    expect(mount.textContent).toContain("ditinjau ustadz");
    expect(mount.textContent).toContain("tidak mengarang isinya");
  });

  test("kitab cards carry an Indonesian title beside the canonical Arabic", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadis(mount);
    const first = mount.querySelector<HTMLAnchorElement>(".hadith-kitab")!;
    // The Arabic must survive: translating the label must never replace the canonical name.
    expect(first.querySelector(".hadith-kitab-ar")?.textContent?.trim()).toContain("كتاب");
    // And the reader must be able to find it by the Indonesian word, not only by Arabic or number.
    expect((first.dataset["search"] ?? "").toLowerCase()).toContain("wahyu");
  });

  test("a failed index fetch shows a message, not a blank pane", async () => {
    mockFetch({});
    await renderHadis(mount);
    expect(mount.querySelector(".hadith-note")).not.toBeNull();
    expect(mount.textContent).toContain("Gagal memuat");
  });
});

describe("hadith book render", () => {
  test("renders bab blocks and hadith cards with Arabic + source", async () => {
    mockFetch({ "/hadith/index.json": INDEX, "/hadith/bukhari/1.json": BUKHARI_1 });
    await renderHadisBook(mount, "bukhari", 1);
    const totalHadith = BUKHARI_1.babs.reduce((n: number, b: { hadith: unknown[] }) => n + b.hadith.length, 0);
    expect(mount.querySelectorAll(".hadith-card").length).toBe(totalHadith);
    expect(mount.querySelectorAll(".hadith-ar").length).toBe(totalHadith);
    expect(mount.querySelectorAll(".hadith-src").length).toBe(totalHadith);
    // Arabic is right-to-left and marked as Arabic for the screen reader.
    const ar = mount.querySelector<HTMLElement>(".hadith-ar")!;
    expect(ar.getAttribute("dir")).toBe("rtl");
    expect(ar.getAttribute("lang")).toBe("ar");
  });

  test("breadcrumb names the collection", async () => {
    mockFetch({ "/hadith/index.json": INDEX, "/hadith/bukhari/1.json": BUKHARI_1 });
    await renderHadisBook(mount, "bukhari", 1);
    expect(mount.querySelector(".hadith-crumb")?.textContent).toContain("Sahih al-Bukhari");
  });

  test("a failed shard fetch shows a message, not a blank pane", async () => {
    mockFetch({ "/hadith/index.json": INDEX });
    await renderHadisBook(mount, "bukhari", 999);
    expect(mount.textContent).toContain("Gagal memuat");
  });
});
