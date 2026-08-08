import { describe, expect, test } from "bun:test";
import {
  classify,
  foldHeading,
  frontmatter,
  parseIntro,
  sectionsOf,
  splitRefs,
  type SurahIntro,
} from "./build-surah-intro.ts";

/**
 * The surah preface, under the same honesty guarantee as the shards.
 *
 * Two promises are mechanical here:
 *   1. the Arabic we ship is BYTE-IDENTICAL to the source — never retyped, never normalised;
 *   2. no preface reaches a reader without Dorar's attribution attached.
 *
 * The second is the one that matters most. This content is licensed to its author, and a render
 * path that can drop the credit is the failure mode with real-world consequences, so it is tested
 * at the corpus level rather than trusted to a template.
 */

const SRC = (n: number) => Bun.file(`data/surah-intro-src/${String(n).padStart(3, "0")}.md`);
const OUT = (n: number) => Bun.file(`web/public/surah-intro/${n}.json`);

const intros: SurahIntro[] = await Promise.all(
  Array.from({ length: 114 }, (_, i) => OUT(i + 1).json() as Promise<SurahIntro>),
);
const sources: string[] = await Promise.all(Array.from({ length: 114 }, (_, i) => SRC(i + 1).text()));

describe("foldHeading — diacritics are a comparison detail, never an edit", () => {
  test("collapses the vocalised and bare spellings of the same heading", () => {
    // Both spellings occur in the corpus; they must fold to one key.
    const bare = intros.find((i) => i.sections.some((s) => s.kind === "names"))!;
    const heading = bare.sections.find((s) => s.kind === "names")!.title;
    expect(foldHeading(heading)).toBe(foldHeading(`${heading} `));
  });

  test("is idempotent", () => {
    for (const i of intros.slice(0, 20)) {
      for (const s of i.sections) expect(foldHeading(foldHeading(s.title))).toBe(foldHeading(s.title));
    }
  });
});

describe("classify — every heading in the corpus lands somewhere deliberate", () => {
  test("the three universal sections are classified for all 114", () => {
    for (const i of intros) {
      for (const kind of ["names", "revelation", "aims"] as const) {
        expect(i.sections.some((s) => s.kind === kind)).toBe(true);
      }
    }
  });

  test("only Al-Fatihah carries a bespoke section", () => {
    const odd = intros.filter((i) => i.sections.some((s) => s.kind === "other")).map((i) => i.n);
    expect(odd).toEqual([1]);
  });

  test("the references heading is never emitted as prose", () => {
    for (const i of intros) {
      for (const s of i.sections) expect(classify(s.title)).not.toBe("references");
    }
  });
});

describe("frontmatter — the nested rights block never leaks into the scalars", () => {
  test("reads top-level keys and skips indented ones", () => {
    const fm = frontmatter(
      ['---', 'surah: 7', 'source: "X"', 'rights:', '  holder: "SHOULD NOT WIN"', '  usage: private', '---', 'body'].join(
        "\n",
      ),
    );
    expect(fm["surah"]).toBe("7");
    expect(fm["source"]).toBe("X");
    expect(fm["holder"]).toBeUndefined();
    expect(fm["usage"]).toBeUndefined();
  });
});

describe("sectionsOf / splitRefs", () => {
  test("splits on ## and trims the stray trailing space several headings carry", () => {
    const out = sectionsOf("## A \nalpha\n\n## B\nbeta");
    expect(out.map(([h]) => h)).toEqual(["A", "B"]);
    expect(out[0]![1]).toBe("alpha");
  });

  test("a multi-line footnote stays one entry", () => {
    expect(splitRefs("1. one\ncontinued\n2. two")).toEqual(["one\ncontinued", "two"]);
  });

  test("no references section yields no entries", () => {
    expect(splitRefs("")).toEqual([]);
  });
});

describe("parseIntro — refuses what it must not ship", () => {
  const head = (over: Record<string, string> = {}): string => {
    const fm = {
      surah: "1",
      surah_name: "X",
      source: "S",
      source_url: "https://dorar.net/tafseer/1",
      supervisor: "V",
      language: "ar",
      ...over,
    };
    const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
    return `---\n${lines.join("\n")}\n---\n## اسماء\na\n## بيان المكي\nb\n## مقاصد\nc\n`;
  };

  test("parses a well-formed file", () => {
    const i = parseIntro(head(), 1);
    expect(i.n).toBe(1);
    expect(i.sections.map((s) => s.kind)).toEqual(["names", "revelation", "aims"]);
  });

  test("rejects a shard whose frontmatter names a different surah", () => {
    expect(() => parseIntro(head({ surah: "2" }), 1)).toThrow(/frontmatter says/);
  });

  test("rejects a non-Arabic source — the AI Indonesian draft must not slip in", () => {
    expect(() => parseIntro(head({ language: "id" }), 1)).toThrow(/expected ar/);
  });

  test("rejects a preface with no attribution rather than ship it uncredited", () => {
    for (const missing of ["source", "source_url", "supervisor", "surah_name"]) {
      const raw = head()
        .split("\n")
        .filter((l) => !l.startsWith(`${missing}:`))
        .join("\n");
      expect(() => parseIntro(raw, 1)).toThrow(/unattributed/);
    }
  });
});

describe("the built corpus — verbatim and attributed, all 114", () => {
  test("every surah has a shard, numbered correctly", () => {
    expect(intros.map((i) => i.n)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1));
  });

  test("every section body and title is byte-identical to the source file", () => {
    intros.forEach((intro, idx) => {
      const raw = sources[idx]!;
      for (const s of intro.sections) {
        expect(raw.includes(s.title)).toBe(true);
        expect(raw.includes(s.body)).toBe(true);
      }
    });
  });

  test("every footnote is byte-identical to the source file", () => {
    intros.forEach((intro, idx) => {
      const raw = sources[idx]!;
      for (const r of intro.refs) expect(raw.includes(r)).toBe(true);
    });
  });

  test("every shard carries a Dorar source, url and supervisor", () => {
    for (const i of intros) {
      expect(i.source.title.length).toBeGreaterThan(0);
      expect(i.source.supervisor.length).toBeGreaterThan(0);
      expect(i.source.url.startsWith("https://dorar.net/")).toBe(true);
    }
  });

  test("the corpus is Arabic only — no AI-translated edition ships", () => {
    for (const i of intros) expect(i.lang).toBe("ar");
  });

  test("no shard is empty", () => {
    for (const i of intros) expect(i.sections.length).toBeGreaterThanOrEqual(3);
  });
});
