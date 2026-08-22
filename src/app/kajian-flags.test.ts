/**
 * The flagging is the only thing standing between a mangled auto-caption and a public post that
 * misattributes a hadith to a named scholar. These tests exist so that claim is checkable.
 *
 * ⚠ EVERY CASE BELOW WAS WRITTEN BY US, NOT HARVESTED FROM A REAL TRANSCRIPT. That is a known
 * weakness, recorded here rather than left for someone to discover: this repo has already shipped a
 * guard that stayed open for two sessions because its whole test suite was prose we invented, and
 * the verb that broke it was one nobody thought to write down. Treat green here as "the cues we
 * listed do fire", never as "the cue list is complete". The list is widened from transcripts that
 * actually came back, and only ever widened.
 */
import { describe, expect, it } from "bun:test";
import { flagSpans, formatTimestamp, type FlagSnippet } from "./kajian-flags.ts";

const snip = (text: string, start = 0): FlagSnippet => ({ text, start });

describe("formatTimestamp", () => {
  it("is a scrub position, not a duration — no hour segment under an hour", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(9)).toBe("0:09");
    expect(formatTimestamp(75)).toBe("1:15");
    expect(formatTimestamp(599)).toBe("9:59");
  });

  it("pads minutes only once an hour segment exists, so 1:05:03 never reads as 1:5:3", () => {
    expect(formatTimestamp(3600)).toBe("1:00:00");
    expect(formatTimestamp(3903)).toBe("1:05:03");
  });

  it("clamps a negative start rather than emitting a negative timestamp", () => {
    expect(formatTimestamp(-5)).toBe("0:00");
  });
});

describe("flagSpans", () => {
  it("flags Arabic script — the thing auto-captions mangle worst", () => {
    const out = flagSpans([snip("beliau membaca الحمد لله رب العالمين dengan tartil", 42)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.at).toBe("0:42");
    expect(out[0]!.why).toContain("teks Arab");
  });

  it("flags a numbered reference, which is where a caption slip changes the meaning", () => {
    const out = flagSpans([snip("ini ada dalam surat Al-Baqarah ayat 183", 130)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.at).toBe("2:10");
    expect(out[0]!.why).toContain("rujukan bernomor");
  });

  it("fires on an AFFIXED stem — `diriwayatkan`, not just `riwayat`", () => {
    // The failure this pins: \b-bounded keywords under-fire on Indonesian because affixation is
    // productive. A right-bounded `riwayat` misses every `diriwayatkan` in a transcript.
    //
    // THE SENTENCE CARRIES NO OTHER CUE, and that is the entire point. A first version of this test
    // read "hadits ini diriwayatkan oleh Imam Bukhari" — which also contains `hadits`, `imam` and
    // `bukhari`, so it stayed green with affix handling deleted. It was passing because a DIFFERENT
    // cue caught the span, which is indistinguishable from working until you force it red.
    const out = flagSpans([snip("kisah itu diriwayatkan secara turun temurun", 8)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.why).toContain("istilah/rujukan");
  });

  it("flags narrator names on their own, because that is what gets misheard", () => {
    // Again: no other cue in the carrier sentence. `itu riwayat ${n}` would have proven nothing,
    // because `riwayat` alone already flags the span whatever the name does.
    const names = ["Bukhari", "Muslim", "Tirmidzi", "Baihaqi", "Thabrani"];
    for (const n of names) {
      const out = flagSpans([snip(`kata beliau, itu dari ${n} kalau tidak salah`)]);
      expect(out, `name cue failed to fire on its own: ${n}`).toHaveLength(1);
    }
  });

  it("does NOT flag ordinary speech — a flag on every span is the same as no flags at all", () => {
    const ordinary = [
      snip("baik, kita lanjutkan pembahasan kita hari ini", 0),
      snip("silakan duduk yang rapat ke depan", 12),
      snip("mudah-mudahan kita semua diberi kesehatan", 20),
    ];
    expect(flagSpans(ordinary)).toHaveLength(0);
  });

  it("does NOT flag devotional vocabulary — the finding that cut 143 spans to 32", () => {
    // MEASURED, not imagined. Against a real 2h04m dakwah lecture (2,586 snippets) the first
    // version of the cue list fired `nabi` on 96 spans, `allah` on 74 and `imam` on 21 — 191 hits
    // that say nothing about whether a citation was spoken. A lecture mentions God and the Prophet
    // continuously; that is the genre, not a citation event. The list flagged the vocabulary of the
    // subject instead of the structure of a reference, and produced 143 items nobody would read.
    //
    // This test is what stops those words coming back. Each sentence below is shaped like real
    // lecture speech and carries NO citation structure.
    const devotional = [
      snip("Allah memberikan kepada kita nikmat yang sangat banyak", 0),
      snip("nabi kita adalah teladan yang paling baik", 30),
      snip("beliau menjadi imam di masjid itu bertahun-tahun", 60),
      snip("rasulullah adalah manusia yang paling pemalu", 90),
      snip("para ulama sepakat tentang pentingnya ilmu", 120),
      snip("ustadz akan menjelaskan setelah ini", 150),
    ];
    expect(flagSpans(devotional)).toEqual([]);
  });

  it("still flags a real citation sitting INSIDE devotional speech", () => {
    // The exclusion must not become a hole: dropping `allah`/`nabi` cannot be allowed to suppress a
    // span that also carries a reference. This is the case the exclusion could plausibly break.
    const out = flagSpans([snip("Allah berfirman dalam surat Al-Hujurat ayat 13", 200)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.at).toBe("3:20");
  });

  it("returns [] for an empty transcript instead of throwing", () => {
    expect(flagSpans([])).toEqual([]);
    expect(flagSpans([snip("   ", 5)])).toEqual([]);
  });

  it("keeps transcript order, so the list reads as a scrub plan", () => {
    const out = flagSpans([
      snip("nanti kita bahas", 0),
      snip("surat An-Nisa ayat 11", 60),
      snip("sekian dulu", 90),
      snip("riwayat Muslim", 120),
    ]);
    expect(out.map((f) => f.at)).toEqual(["1:00", "2:00"]);
  });

  it("reports BOTH reasons when a span carries Arabic and a numbered reference", () => {
    const out = flagSpans([snip("قال الله تعالى dalam surat Al-Ikhlas ayat 1", 5)]);
    expect(out).toHaveLength(1);
    expect(out[0]!.why).toContain("teks Arab");
    expect(out[0]!.why).toContain("rujukan bernomor");
  });
});
