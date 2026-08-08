import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

GlobalRegistrator.register();

const { renderPetaIndex, renderPetaCategory, resetPetaCache } = await import("./peta.ts");

afterAll(async () => {
  await GlobalRegistrator.unregister();
});

/**
 * The Peta Tematik surface, under the rights guarantee.
 *
 * `src/app/peta-shards.test.ts` proves the DATA is faithful to Ustadz Muhammad Thalib's
 * published index. This file proves the SURFACE is — that what the generator preserved, the
 * renderer does not then quietly undo. The two halves are separate on purpose: the data being
 * right and the reader seeing it right are different claims, and this repo has a documented
 * history of tests staying green across exactly that seam.
 *
 * Fixtures here are real slices of the emitted shards, read from disk — not hand-written
 * shapes. A hand-written fixture proves the renderer matches my imagination.
 */

const readJSON = async (p: string) => JSON.parse(await Bun.file(p).text());

const INDEX = await readJSON("web/public/peta/index.json");
// The category holding a known-unresolvable ref (8:96 "Lawan lebih kuat").
const KEJIWAAN = await readJSON("web/public/peta/rahasia-kejiwaan-manusia-dalam-al-qur-an.json");
const KELUARGA = await readJSON("web/public/peta/keluarga.json");

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
  // Without this the module cache makes every fetch assertion below a no-op after the first
  // successful render — the tests would pass while proving nothing.
  resetPetaCache();
  document.body.innerHTML = `<div id="read"></div>`;
  mount = document.querySelector<HTMLElement>("#read")!;
});

describe("peta index — the 13 categories", () => {
  test("renders one card per category, from the real index", async () => {
    mockFetch({ "/peta/index.json": INDEX });
    await renderPetaIndex(mount);
    // The Tematik reskin (86a347b) replaced the .peta-list/.trow rows with the .tematik-grid masonry
    // of .tema-card links — one card per category. The count contract is unchanged: 13 categories.
    expect(mount.querySelectorAll(".tematik-grid .tema-card").length).toBe(13);
    expect(INDEX.categories.length).toBe(13);
  });

  test("the landing route fetches index.json ONLY — never a category shard", async () => {
    const hits: string[] = [];
    globalThis.fetch = (async (url: string | URL) => {
      hits.push(String(url));
      return { ok: true, status: 200, json: async () => INDEX } as Response;
    }) as typeof fetch;
    await renderPetaIndex(mount);
    expect(hits).toEqual(["/peta/index.json"]);
  });

  test("a failed index fetch shows a message, not a blank pane", async () => {
    mockFetch({});
    await renderPetaIndex(mount);
    expect(mount.querySelector(".oops")).not.toBeNull();
    expect(mount.textContent).toContain("Gagal memuat");
  });
});

describe("attribution — F-2, on every route", () => {
  test("the index credits Ustadz Muhammad Thalib and links the source", async () => {
    mockFetch({ "/peta/index.json": INDEX });
    await renderPetaIndex(mount);
    const credit = mount.querySelector(".peta-credit");
    expect(credit).not.toBeNull();
    expect(credit!.textContent).toContain("Indeks Tematik");
    expect(credit!.textContent).toContain("Ustadz Muhammad Thalib");
    expect(credit!.querySelector("a")!.getAttribute("href")).toBe("https://quran.tarjamahtafsiriyah.com/");
  });

  test("Anti: no category route renders without attribution — all 13 checked", async () => {
    for (const c of INDEX.categories) {
      const shard = await readJSON(`web/public/peta/${c.slug}.json`);
      mockFetch({ "/peta/index.json": INDEX, [`/peta/${c.slug}.json`]: shard });
      document.body.innerHTML = `<div id="read"></div>`;
      const m = document.querySelector<HTMLElement>("#read")!;
      await renderPetaCategory(m, c.slug);
      const credit = m.querySelector(".peta-credit");
      expect(credit, `${c.slug} has no attribution`).not.toBeNull();
      expect(credit!.textContent).toContain("Ustadz Muhammad Thalib");
    }
  });

  test("our editorial layer is named as ours on BOTH routes — his taxonomy vs our links/bridges", async () => {
    mockFetch({ "/peta/index.json": INDEX });
    await renderPetaIndex(mount);
    // On the INDEX the caveat rides the credit's ⓘ rather than sitting under the wall (Erik,
    // 2026-08-08). It is still NAMED AS OURS, which is what F-2 is about — and it is in the
    // button's accessible name too, so it does not depend on hover to be reachable.
    const tip = mount.querySelector(".peta-credit .si-tip");
    expect(tip, "index credit has no derivative-note tooltip").not.toBeNull();
    expect(tip!.textContent).toContain("tambahan kami");
    const tipBtn = mount.querySelector(".peta-credit .si-infobtn");
    expect(tipBtn!.getAttribute("aria-label")).toContain("tambahan kami");

    resetPetaCache();
    document.body.innerHTML = `<div id="read"></div>`;
    const m = document.querySelector<HTMLElement>("#read")!;
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(m, "keluarga");
    const note = m.querySelector(".peta-derivative");
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain("bukan bagian dari indeks aslinya");
  });

  test("every shard carries attribution INSIDE the payload — the JSON travels without our pages", async () => {
    for (const c of INDEX.categories) {
      const shard = await readJSON(`web/public/peta/${c.slug}.json`);
      expect(shard.source?.author, `${c.slug} shard has no embedded attribution`).toBe("Ustadz Muhammad Thalib");
      expect(shard.source?.url).toBe("https://quran.tarjamahtafsiriyah.com/");
    }
  });

  test("attribution is not visually hidden and not below body size — it is design, not fine print", async () => {
    mockFetch({ "/peta/index.json": INDEX });
    await renderPetaIndex(mount);
    const credit = mount.querySelector(".peta-credit")!;
    expect(credit.className).not.toContain("visually-hidden");
    expect(credit.getAttribute("hidden")).toBeNull();
    expect(credit.getAttribute("aria-hidden")).toBeNull();
    // The CSS pins it at --step-0 (body). Assert the stylesheet, since the DOM can't compute it here.
    const css = await Bun.file("web/src/read.css").text();
    expect(css).toMatch(/\.peta-credit\s*\{[^}]*font-size:\s*var\(--step-0\)/);
  });
});

describe("entries — Thalib's text, rendered as published", () => {
  test("every entry's text reaches the DOM byte-identical to the shard", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    const rendered = [...mount.querySelectorAll(".peta-text")].map((e) => e.textContent);
    const source = KELUARGA.subtopics.flatMap((s: { entries: { text: string }[] }) => s.entries.map((e) => e.text));
    expect(rendered).toEqual(source);
  });

  test("a resolvable ref links to the existing reading surface", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    const link = mount.querySelector<HTMLAnchorElement>("a.peta-ref")!;
    expect(link.getAttribute("href")).toMatch(/^#\/surah\/\d{1,3}#\d{1,3}$/);
  });

  test("the 5 null-named subtopics render entries with no heading — 'null' never reaches the DOM", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    expect(KELUARGA.subtopics[0].subtopic).toBeNull();
    expect(mount.querySelector(".peta-sub-name")).toBeNull();
    expect(mount.textContent).not.toContain("null");
    expect(mount.querySelectorAll(".peta-entry").length).toBeGreaterThan(0);
  });

  test("an unknown category shows a message, not a blank pane", async () => {
    mockFetch({ "/peta/index.json": INDEX });
    await renderPetaCategory(mount, "tidak-ada");
    expect(mount.querySelector(".oops")).not.toBeNull();
  });
});

describe("unresolvable refs — the four typos in the published index", () => {
  test("Anti: an unresolvable ref is NEVER a link into a dead shard", async () => {
    mockFetch({
      "/peta/index.json": INDEX,
      "/peta/rahasia-kejiwaan-manusia-dalam-al-qur-an.json": KEJIWAAN,
    });
    await renderPetaCategory(mount, "rahasia-kejiwaan-manusia-dalam-al-qur-an");
    for (const el of mount.querySelectorAll("a.peta-ref")) {
      expect(el.className).not.toContain("peta-ref-unresolved");
    }
    const dead = mount.querySelectorAll(".peta-ref-unresolved");
    expect(dead.length).toBe(2); // 8:96 and 48:59 both live in this category
    for (const el of dead) expect(el.tagName).not.toBe("A");
  });

  test("the entry still renders its text — we display his line, we do not delete it", async () => {
    mockFetch({
      "/peta/index.json": INDEX,
      "/peta/rahasia-kejiwaan-manusia-dalam-al-qur-an.json": KEJIWAAN,
    });
    await renderPetaCategory(mount, "rahasia-kejiwaan-manusia-dalam-al-qur-an");
    expect(mount.textContent).toContain("Lawan lebih kuat");
    expect(mount.textContent).toContain("Kekalahan");
  });

  test("the gap is NAMED, not silent", async () => {
    mockFetch({
      "/peta/index.json": INDEX,
      "/peta/rahasia-kejiwaan-manusia-dalam-al-qur-an.json": KEJIWAAN,
    });
    await renderPetaCategory(mount, "rahasia-kejiwaan-manusia-dalam-al-qur-an");
    expect(mount.textContent).toContain("tidak kami temukan dalam mushaf");
  });

  test("Anti: no ayah number is silently corrected — 8:96 renders as 8:96, never 8:66", async () => {
    mockFetch({
      "/peta/index.json": INDEX,
      "/peta/rahasia-kejiwaan-manusia-dalam-al-qur-an.json": KEJIWAAN,
    });
    await renderPetaCategory(mount, "rahasia-kejiwaan-manusia-dalam-al-qur-an");
    expect(mount.textContent).toContain("8:96");
    expect(mount.textContent).not.toContain("8:66");
  });
});

describe("bridges — the connective tissue", () => {
  test("a verse in more than one category names them, and the count is derived not hardcoded", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    const bridge = mount.querySelector(".peta-bridge");
    expect(bridge).not.toBeNull();
    expect(bridge!.textContent).toMatch(/Ayat ini muncul di \d+ tema/);

    // Re-derive the expected count from the fixture rather than trusting the rendered number.
    const entry = KELUARGA.subtopics
      .flatMap((s: { entries: { refs: { bridge: string[] }[] }[] }) => s.entries)
      .find((e: { refs: { bridge: string[] }[] }) => e.refs.some((r) => r.bridge.length > 0))!;
    const expected = new Set(entry.refs.flatMap((r: { bridge: string[] }) => r.bridge)).size + 1;
    expect(mount.textContent).toContain(`muncul di ${expected} tema`);
  });

  test("a bridge links to the other category's route", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    const link = mount.querySelector<HTMLAnchorElement>(".peta-bridge-link")!;
    expect(link.getAttribute("href")).toMatch(/^#\/peta\/[a-z0-9-]+$/);
  });
});

describe("coexistence and containment", () => {
  // esc moved verse.ts -> esc.ts (2026-07-22). The point of this test was never the FILE, it was
  // that peta.ts must not grow a fourth private copy. verse.ts was a DOM module, so importing it
  // for a pure string function dragged `document` into Bun scripts that never touch a page.
  test("Anti: peta.ts imports esc from the shared module — it does not re-implement it", async () => {
    const src = await Bun.file("web/src/peta.ts").text();
    expect(src).toMatch(/import\s*\{[^}]*\besc\b[^}]*\}\s*from\s*"\.\/esc\.ts"/);
    expect(src).not.toMatch(/const esc\s*=/);
    expect(src).not.toMatch(/function esc\s*\(/);
  });

  test("Anti: peta.ts uses announce() — no private say() implementation", async () => {
    const src = await Bun.file("web/src/peta.ts").text();
    expect(src).toMatch(/import\s*\{\s*announce\s*\}\s*from\s*"\.\/announce\.ts"/);
    expect(src).not.toMatch(/function say\s*\(/);
  });

  test("Anti: this surface renders no scripture at all — literal_companion cannot be violated here", async () => {
    mockFetch({ "/peta/index.json": INDEX, "/peta/keluarga.json": KELUARGA });
    await renderPetaCategory(mount, "keluarga");
    // No Arabic, and no verse cards — entries are index rows that link out.
    expect(mount.textContent).not.toMatch(/[؀-ۿ]/);
    expect(mount.querySelector(".verse")).toBeNull();
  });
});
