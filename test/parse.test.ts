import { describe, expect, test } from "bun:test";
import { parseSurahMetadata, parseVerseFile, toTranslations } from "../src/ingest/parse.ts";
import { sourceById } from "../src/ingest/sources.ts";

const XML = `<?xml version="1.0" encoding="utf-8" ?>
<quran type="metadata">
  <suras>
    <sura index="1" ayas="7" start="0" name="الفاتحة" tname="Al-Faatiha" ename="The Opening" type="Meccan" order="5" rukus="1" />
    <sura index="2" ayas="286" start="7" name="البقرة" tname="Al-Baqara" ename="The Cow" type="Medinan" order="87" rukus="40" />
  </suras>
</quran>`;

describe("parseSurahMetadata", () => {
  test("maps Tanzil attributes onto canonical Surah nodes", () => {
    const [first, second] = parseSurahMetadata(XML);
    expect(first).toMatchObject({
      id: "surah:1",
      truth_class: "canonical",
      number: 1,
      name_ar: "الفاتحة",
      name_translit: "Al-Faatiha",
      revelation_type: "meccan",
      order_revealed: 5,
      ayah_count: 7,
    });
    expect(second?.revelation_type).toBe("medinan");
  });

  test("rejects an unrecognized revelation type rather than guessing", () => {
    const bad = XML.replace('type="Meccan"', 'type="Martian"');
    expect(() => parseSurahMetadata(bad)).toThrow(/unrecognized revelation type/);
  });

  test("throws when a required attribute is absent", () => {
    const bad = XML.replace(' ayas="7"', "");
    expect(() => parseSurahMetadata(bad)).toThrow(/missing attribute "ayas"/);
  });

  test("throws on an empty document instead of returning nothing", () => {
    expect(() => parseSurahMetadata("<quran></quran>")).toThrow(/no <sura> entries/);
  });
});

describe("parseVerseFile", () => {
  test("parses surah|ayah|text and skips comments and blank lines", () => {
    const records = parseVerseFile("# header\n\n1|1|بِسْمِ\n1|2|ٱلْحَمْدُ\n\n# trailer\n", "t.txt");
    expect(records).toEqual([
      { surah: 1, ayah: 1, text: "بِسْمِ" },
      { surah: 1, ayah: 2, text: "ٱلْحَمْدُ" },
    ]);
  });

  test("preserves pipes inside the verse text", () => {
    const [r] = parseVerseFile("2|1|alif | lam | mim", "t.txt");
    expect(r?.text).toBe("alif | lam | mim");
  });

  test("refuses to silently drop a malformed line", () => {
    expect(() => parseVerseFile("1|1|ok\ngarbage line\n", "t.txt")).toThrow(/malformed line/);
  });

  test("refuses an empty verse", () => {
    expect(() => parseVerseFile("1|1|\n", "t.txt")).toThrow(/empty text/);
  });

  test("throws when the file yields no verses", () => {
    expect(() => parseVerseFile("# only comments\n", "t.txt")).toThrow(/no verse records/);
  });
});

describe("toTranslations", () => {
  test("stamps lang, named human translator, and canonical truth_class", () => {
    const source = sourceById("tanzil-id-indonesian");
    const [t] = toTranslations([{ surah: 2, ayah: 255, text: "Allah..." }], source);
    expect(t).toMatchObject({
      id: "translation:id:2:255",
      ayah_id: "ayah:2:255",
      lang: "id",
      truth_class: "canonical",
      translator: "Kementerian Agama Republik Indonesia",
    });
  });

  test("refuses a translation source that declares no translator", () => {
    // An anonymous translation is a provenance hole: every canonical translation must
    // name the human body responsible for it.
    const { translator: _omitted, ...source } = sourceById("tanzil-id-indonesian");
    expect(() => toTranslations([{ surah: 1, ayah: 1, text: "x" }], source)).toThrow(
      /must declare lang and translator/,
    );
  });
});
