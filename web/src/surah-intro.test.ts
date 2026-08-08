import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, describe, expect, test } from "bun:test";

GlobalRegistrator.register();

const { introEl, bindIntroLang } = await import("./surah-intro.ts");
type SurahIntro = import("./surah-intro.ts").SurahIntro;
type IntroEdition = import("./surah-intro.ts").IntroEdition;

afterAll(async () => {
  await GlobalRegistrator.unregister();
});

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

const edition = (over: Partial<IntroEdition> = {}): IntroEdition => ({
  lang: "id",
  official: false,
  translation: "ai",
  reviewStatus: "unreviewed",
  reviewerNeeded: "Ustadz Ahmad Isrofiel",
  sections: [{ kind: "names", title: "Nama-Nama Surah", body: "satu\n\ndua" }],
  refs: ["riwayat Bukhari"],
  ...over,
});

/** Render, wire the toggle, and click a language — the path a reader actually takes. */
const pick = (i: SurahIntro, lang: string): HTMLElement => {
  const host = document.createElement("div");
  host.innerHTML = introEl(i);
  bindIntroLang(host, i);
  host.querySelector<HTMLButtonElement>(`.si-langbtn[data-lang="${lang}"]`)!.click();
  return host;
};

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

  test("Arabic is the default selection — it is the edition Dorar actually wrote", () => {
    const html = introEl(intro());
    expect(html).toMatch(/data-lang="ar"[^>]*aria-pressed="true"/s);
  });
});

describe("introEl — the language toggle", () => {
  test("offers Indonesian, disabled, when this surah has no edition", () => {
    const html = introEl(intro());
    expect(html).toContain('data-lang="id"');
    expect(html).toContain("disabled");
    expect(html).toContain("belum ada");
  });

  test("offers Indonesian enabled when the edition exists", () => {
    const html = introEl(intro({ editions: { id: edition() } }));
    expect(html).toContain('data-lang="id"');
    expect(html).not.toContain("belum ada");
  });

  test("renders the Arabic body first regardless of what editions exist", () => {
    const html = introEl(intro({ editions: { id: edition() } }));
    expect(html).toContain("أسماء السورة");
    expect(html).not.toContain("Nama-Nama Surah");
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

describe("bindIntroLang — an unofficial edition can never be shown unlabelled", () => {
  const withId = intro({ editions: { id: edition() } });

  test("selecting Indonesian renders the Indonesian body", () => {
    expect(pick(withId, "id").querySelector(".si-content")!.innerHTML).toContain("Nama-Nama Surah");
  });

  test("selecting Indonesian ALWAYS renders the provenance banner", () => {
    const html = pick(withId, "id").querySelector(".si-content")!.innerHTML;
    expect(html).toContain("si-warn");
    expect(html).toContain("belum ditinjau");
    expect(html).toContain("bukan edisi resmi");
  });

  test("the banner names who still has to review it", () => {
    expect(pick(withId, "id").innerHTML).toContain("Ustadz Ahmad Isrofiel");
  });

  test("an edition marked official gets no banner", () => {
    const off = intro({ editions: { id: edition({ official: true }) } });
    expect(pick(off, "id").querySelector(".si-content")!.innerHTML).not.toContain("si-warn");
  });

  test("switching back to Arabic drops the banner and restores Dorar's text", () => {
    const host = pick(withId, "id");
    host.querySelector<HTMLButtonElement>('.si-langbtn[data-lang="ar"]')!.click();
    const html = host.querySelector(".si-content")!.innerHTML;
    expect(html).toContain("أسماء السورة");
    expect(html).not.toContain("si-warn");
  });

  test("Dorar keeps the credit on every edition — the footer never moves", () => {
    expect(pick(withId, "id").querySelector(".si-cred a")!.getAttribute("href")).toContain("dorar.net");
  });

  test("a disabled language cannot swap the content", () => {
    const host = pick(intro(), "id"); // no id edition — button is disabled
    expect(host.querySelector(".si-content")!.innerHTML).toContain("أسماء السورة");
    expect(host.querySelector(".si-content")!.innerHTML).not.toContain("si-warn");
  });
});

describe("paras — the inline shapes the Indonesian edition actually uses", () => {
  const body = (b: string): string =>
    introEl(intro({ sections: [{ kind: "names", title: "t", body: b }] }));

  test("**bold** becomes strong, not literal asterisks", () => {
    const html = body("lihat **Ummul-Kitab** di sini");
    expect(html).toContain("<strong>Ummul-Kitab</strong>");
    expect(html).not.toContain("**");
  });

  test("a numbered list keeps one item per line instead of running together", () => {
    expect(body("1. satu\n2. dua")).toContain("1. satu<br>2. dua");
  });

  test("markup in the source is still escaped before any of that runs", () => {
    const html = body("**<img src=x>**");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  test("an unpaired asterisk is left alone rather than half-converted", () => {
    expect(body("2 * 3 = 6")).toContain("2 * 3 = 6");
  });
});
