import { describe, expect, test } from "bun:test";
import { classify, frontmatter, sectionsOf } from "./build-surah-intro.ts";

/**
 * The Indonesian draft corpus, under the constraints that make it safe to show a reviewer.
 *
 * This is machine output standing in for religious scholarship, published (labelled) to a live app so
 * Ustadz Ahmad Isrofiel can review it in situ. Three properties have to hold mechanically, because
 * none of them are visible by reading a page:
 *
 *   1. Every file declares it is an unreviewed AI draft. The app's provenance banner is rendered
 *      FROM these fields — a file that loses them renders as though it were Dorar's own edition.
 *   2. Footnote markers survive translation exactly. They tie each claim to its source in المراجع;
 *      a dropped or renumbered marker silently misattributes a hadith or a tafsir citation.
 *   3. No Qur'anic Arabic is retyped. The app displays scripture only through its licensed corpus
 *      and never authors a translation of it; an AI-written Arabic ayah inside commentary would be
 *      both unattributed scripture and a byte-drift hazard.
 */

const N = 114;
const pad = (n: number) => String(n).padStart(3, "0");

const ar: string[] = await Promise.all(
  Array.from({ length: N }, (_, i) => Bun.file(`data/surah-intro-src/${pad(i + 1)}.md`).text()),
);
const id: string[] = await Promise.all(
  Array.from({ length: N }, (_, i) => Bun.file(`data/surah-intro-src/id/${pad(i + 1)}.md`).text()),
);

const markers = (s: string): string[] =>
  (s.match(/\[\d+\]/g) ?? []).slice().sort((a, b) => Number(a.slice(1, -1)) - Number(b.slice(1, -1)));

const bodyOf = (s: string) => s.replace(/^---\n[\s\S]*?\n---\n?/, "").replace(/<!--[\s\S]*?-->/g, "");

/** Longest run of consecutive Arabic-script characters, ignoring spaces between them. */
const longestArabicRun = (s: string): number => {
  let best = 0;
  for (const m of s.matchAll(/[؀-ۿݐ-ݿ](?:[؀-ۿݐ-ݿ\s]*[؀-ۿݐ-ݿ])?/g)) {
    const run = m[0].replace(/\s/g, "").length;
    if (run > best) best = run;
  }
  return best;
};

describe("every surah has an Indonesian draft", () => {
  test("all 114 files exist and are non-trivial", () => {
    id.forEach((t, i) => {
      expect(t.length, `surah ${i + 1}`).toBeGreaterThan(400);
    });
  });

  test("each declares the surah it belongs to", () => {
    id.forEach((t, i) => {
      expect(Number(frontmatter(t)["surah"]), `surah ${i + 1}`).toBe(i + 1);
    });
  });
});

describe("every draft declares itself a draft — the banner depends on this", () => {
  test("official is false, translation is ai, review is pending, reviewer is named", () => {
    id.forEach((t, i) => {
      const fm = frontmatter(t);
      const at = `surah ${i + 1}`;
      expect(fm["official"], at).toBe("false");
      expect(fm["translation"], at).toBe("ai");
      expect(fm["review_status"], at).toBe("unreviewed");
      expect(fm["reviewer_needed"], at).toContain("Isrofiel");
      expect(fm["language"], at).toBe("id");
    });
  });

  test("each keeps the Dorar source and its url", () => {
    id.forEach((t, i) => {
      expect(frontmatter(t)["source_url"], `surah ${i + 1}`).toBe(`https://dorar.net/tafseer/${i + 1}`);
    });
  });
});

describe("footnote markers survive translation exactly", () => {
  test("the marker multiset matches the Arabic original, surah by surah", () => {
    id.forEach((t, i) => {
      expect(markers(bodyOf(t)).join(","), `surah ${i + 1}`).toBe(markers(bodyOf(ar[i]!)).join(","));
    });
  });
});

describe("structure comes from us, not from the model", () => {
  test("every draft carries the three sections the Arabic always has", () => {
    id.forEach((t, i) => {
      const kinds = new Set(sectionsOf(bodyOf(t)).map(([h]) => classify(h)));
      for (const need of ["names", "revelation", "aims"] as const) {
        expect(kinds.has(need), `surah ${i + 1} missing ${need}`).toBe(true);
      }
    });
  });

  test("no heading falls through to \"other\" except where the Arabic also has one", () => {
    id.forEach((t, i) => {
      const idOther = sectionsOf(bodyOf(t)).filter(([h]) => classify(h) === "other").length;
      const arOther = sectionsOf(bodyOf(ar[i]!)).filter(([h]) => classify(h) === "other").length;
      expect(idOther, `surah ${i + 1}`).toBe(arOther);
    });
  });

  test("a references section exists wherever the Arabic has one", () => {
    id.forEach((t, i) => {
      const has = (s: string) => sectionsOf(bodyOf(s)).some(([h]) => classify(h) === "references");
      if (has(ar[i]!)) expect(has(t), `surah ${i + 1}`).toBe(true);
    });
  });
});

describe("no Qur'anic Arabic is retyped into the draft", () => {
  test("no long Arabic-script run appears in any draft body", () => {
    // The only Arabic that belongs here is the المراجع heading (7 chars). Anything substantially
    // longer is an ayah or a hadith matn the model wrote out in Arabic script.
    id.forEach((t, i) => {
      expect(longestArabicRun(bodyOf(t)), `surah ${i + 1}`).toBeLessThan(20);
    });
  });
});
