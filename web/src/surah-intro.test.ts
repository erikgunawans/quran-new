import { describe, expect, test } from "bun:test";
import { introEl, type SurahIntro } from "./surah-intro.ts";

/**
 * The preface renderer.
 *
 * `introEl` draws content that belongs to Dorar Al-Saniyyah. The tests that matter here are the
 * ones that make dropping the credit impossible: attribution and the source link are asserted on
 * every path, including the one where a surah has no footnotes to show.
 */

const intro = (over: Partial<SurahIntro> = {}): SurahIntro => ({
  n: 1,
  nameAr: "الفاتحة",
  lang: "ar",
  source: {
    title: "موسوعة التفسير",
    url: "https://dorar.net/tafseer/1",
    supervisor: "علوي بن عبد القادر السقاف",
  },
  sections: [{ kind: "names", title: "أسماء السورة", body: "alpha\n\nbeta" }],
  refs: ["رواه البخاري"],
  ...over,
});

describe("introEl — the credit ships with the content", () => {
  test("renders the source title, link and supervisor", () => {
    const html = introEl(intro());
    expect(html).toContain("https://dorar.net/tafseer/1");
    expect(html).toContain("موسوعة التفسير");
    expect(html).toContain("علوي بن عبد القادر السقاف");
  });

  test("still credits a preface that has no footnotes", () => {
    const html = introEl(intro({ refs: [] }));
    expect(html).toContain("https://dorar.net/tafseer/1");
    expect(html).not.toContain("si-reflist");
  });

  test("the outbound source link cannot reach back into the app", () => {
    expect(introEl(intro())).toContain('rel="noopener noreferrer"');
  });
});

describe("introEl — the Arabic is marked as Arabic", () => {
  test("headings and prose carry dir and lang", () => {
    const html = introEl(intro());
    expect(html).toContain('dir="rtl" lang="ar"');
  });

  test("says out loud, in Indonesian, what language the reader is getting", () => {
    expect(introEl(intro())).toContain("bahasa Arab");
  });
});

describe("introEl — source text is escaped, never trusted as markup", () => {
  test("escapes a body that contains angle brackets", () => {
    const html = introEl(intro({ sections: [{ kind: "aims", title: "t", body: "<img src=x onerror=1>" }] }));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  test("escapes a hostile source url and title", () => {
    const html = introEl(
      intro({ source: { title: '"><script>', url: '"><script>', supervisor: "v" } }),
    );
    expect(html).not.toContain("<script>");
  });

  test("escapes footnotes", () => {
    const html = introEl(intro({ refs: ["<b>x</b>"] }));
    expect(html).not.toContain("<b>x</b>");
  });
});

describe("introEl — prose is paragraphed, never rewritten", () => {
  test("splits on the blank lines the source provides", () => {
    const html = introEl(intro());
    expect(html).toContain("<p>alpha</p>");
    expect(html).toContain("<p>beta</p>");
  });

  test("a single-block section stays one paragraph", () => {
    const html = introEl(intro({ sections: [{ kind: "aims", title: "t", body: "one only" }] }));
    expect(html.match(/<p>/g)).toHaveLength(1);
  });
});
