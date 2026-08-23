import { registerDom, unregisterDom } from "./test-dom.ts";
import { afterAll, describe, expect, test } from "bun:test";

registerDom();

const { introEl, bindIntroLang } = await import("./surah-intro.ts");
type SurahIntro = import("./surah-intro.ts").SurahIntro;
type IntroEdition = import("./surah-intro.ts").IntroEdition;

afterAll(async () => {
  await unregisterDom();
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

describe("the awaited-reviewer clause is gone, and stays gone", () => {
  // Erik, 2026-08-23. The body used to render "Menunggu tinjauan Ustadz Ahmad Isrofiel." — a real
  // scholar named as the awaited reviewer of prose he never agreed to review, AND a waiting claim
  // Erik had already ended on 2026-08-22. The fixture above still carries `reviewerNeeded`, so
  // these tests fail the moment anything renders it again; they are not green by its absence.
  const withReviewer = intro({ editions: { id: edition() } });
  const rendered = (): HTMLElement => {
    const h = document.createElement("div");
    h.innerHTML = introEl(withReviewer);
    return h;
  };

  test("the reviewer's name is not rendered anywhere in the intro", () => {
    const html = rendered().innerHTML;
    expect(html).not.toContain("Isrofiel");
    expect(html).not.toContain("Menunggu tinjauan");
  });

  test("but the content is STILL declared unreviewed — dropping the clause must not drop the fact", () => {
    expect(rendered().querySelector(".si-tip")?.textContent ?? "").toContain("belum ditinjau");
  });
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

describe("provenance — an unofficial edition can never be shown unlabelled", () => {
  const withId = intro({ editions: { id: edition() } });

  const host = (i: SurahIntro): HTMLElement => {
    const h = document.createElement("div");
    h.innerHTML = introEl(i);
    bindIntroLang(h, i);
    return h;
  };

  test("the language tab carries an info affordance", () => {
    expect(host(withId).querySelector(".si-langopt .si-infobtn")).not.toBeNull();
  });

  // RENAMED AND NARROWED 2026-08-23 on Erik's instruction. This test used to be
  // "the tooltip names what the edition is and who must review it" and asserted
  // `toContain("Ustadz Ahmad Isrofiel")`. That third assertion pinned the very thing he removed: a
  // real scholar named as the awaited reviewer of prose he never agreed to review, alongside a
  // waiting claim he had already ended on 2026-08-22. **The assertion was not relaxed to make an
  // edit pass — the requirement it encoded was withdrawn by the principal**, and the negative that
  // replaces it lives in "the awaited-reviewer clause is gone, and stays gone" above. The other two
  // assertions are the disclosure itself and are UNCHANGED.
  test("the tooltip says what the edition is, without naming a reviewer", () => {
    const tip = host(withId).querySelector(".si-tip")!.textContent!;
    expect(tip).toContain("belum ditinjau");
    expect(tip).toContain("bukan edisi resmi");
  });

  test("the full sentence is in the accessible name, so it survives with no hover at all", () => {
    // The load-bearing assertion. Hover does not exist on the mid-range Android this app targets;
    // if the disclosure lived only in a hover tooltip, a touch or screen-reader user would get
    // machine-translated religious commentary with no signal whatsoever.
    const label = host(withId).querySelector(".si-infobtn")!.getAttribute("aria-label")!;
    expect(label).toContain("belum ditinjau");
    expect(label).toContain("bukan edisi resmi");
  });

  test("the tooltip is inert until asked for", () => {
    expect(host(withId).querySelector(".si-info")!.getAttribute("data-open")).toBe("false");
    expect(host(withId).querySelector(".si-infobtn")!.getAttribute("aria-expanded")).toBe("false");
  });

  test("tapping the icon opens it — the touch path, not just hover", () => {
    const h = host(withId);
    h.querySelector<HTMLButtonElement>(".si-infobtn")!.click();
    expect(h.querySelector(".si-info")!.getAttribute("data-open")).toBe("true");
    expect(h.querySelector(".si-infobtn")!.getAttribute("aria-expanded")).toBe("true");
  });

  test("tapping the icon does NOT switch language", () => {
    const h = host(withId);
    h.querySelector<HTMLButtonElement>(".si-infobtn")!.click();
    expect(h.querySelector(".si-content")!.innerHTML).toContain("أسماء السورة");
  });

  test("an edition marked official gets no info affordance", () => {
    const off = intro({ editions: { id: edition({ official: true }) } });
    expect(host(off).querySelector(".si-infobtn")).toBeNull();
  });

  test("Arabic — Dorar's own edition — carries no provenance warning", () => {
    const bar = host(withId).querySelector(".si-langbar")!;
    const arOpt = [...bar.children].find((c) => c.querySelector?.('[data-lang="ar"]') || c.getAttribute?.("data-lang") === "ar");
    expect(arOpt!.querySelector?.(".si-infobtn") ?? null).toBeNull();
  });

  test("selecting Indonesian renders the Indonesian body", () => {
    expect(pick(withId, "id").querySelector(".si-content")!.innerHTML).toContain("Nama-Nama Surah");
  });

  test("Dorar keeps the credit on every edition — the footer never moves", () => {
    expect(pick(withId, "id").querySelector(".si-cred a")!.getAttribute("href")).toContain("dorar.net");
  });

  test("switching back to Arabic restores Dorar's text", () => {
    const h = pick(withId, "id");
    h.querySelector<HTMLButtonElement>('.si-langbtn[data-lang="ar"]')!.click();
    expect(h.querySelector(".si-content")!.innerHTML).toContain("أسماء السورة");
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
