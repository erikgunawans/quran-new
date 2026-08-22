/**
 * The narration module's assertions.
 *
 * The fixture below is COPIED FROM THE FIRST REAL BRIEFING, not invented — its blockquoted
 * quotation, its markdown table, its ordered Executive Summary and its `**bold**` bullets are the
 * shapes the model actually produces. A hand-written fixture is how a suite learns to expect the
 * bug: this repo already shipped an 8-word floor whose own test fixture contained the very prose it
 * was supposed to reject.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * A module's CODE, with comments stripped.
 *
 * The first version of these greps read the raw file and failed on `album=` — which appears only
 * inside a comment explaining why `album=` was removed. A source assertion that cannot tell code
 * from prose about code will fire on its own documentation, and the obvious "fix" is to delete the
 * explanation, which is the wrong direction entirely.
 */
function codeOf(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
import {
  DRAFT_WARNING,
  DEFAULT_CHUNK_BYTES,
  NARRATION_VOICE,
  TTS_HARD_LIMIT_BYTES,
  assertChunksCoverText,
  buildNarrationScript,
  byteLength,
  carriesCredential,
  NARRATION_DENIALS,
  channelMayBeSpoken,
  chunkForTts,
  closingLine,
  echoesTitle,
  expectedSeconds,
  openingLine,
  speakableFrom,
} from "./kajian-narration.ts";
import type { RosterOutcome } from "./kajian-roster.ts";

const TITLE = "15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A.";
const CHANNEL = "Masjid Darussalam Kota Wisata";
/**
 * ⚠ THE FIXTURE THAT MATTERS, AND ITS TWO FAILED ANCESTORS.
 *
 * v1 tested the unrostered opening against CHANNEL alone — a MOSQUE — asserting
 * `not.toContain("Syariful")`. It could never have failed.
 *
 * v2 replaced it with "Ustadz Fulan Official" and was ALSO tautological: the screen at the time
 * keyed on honorifics, and that fixture leads with one, so it could only exercise the case already
 * handled.
 *
 * v3 is a BARE PERSONAL NAME — no honorific, no gelar, nothing whatever to pattern-match on. It is
 * the commonest shape on Indonesian dakwah YouTube and the shape both earlier screens passed
 * straight through. If this test can pass with a name-matching heuristic in place, the heuristic
 * is the bug.
 */
const PERSON_CHANNEL = "Firanda Andirja";

const NONE: RosterOutcome = { kind: "none" };
const AMBIGUOUS: RosterOutcome = { kind: "ambiguous", names: ["A Rahman", "B Hakim"] };
const MATCH: RosterOutcome = {
  kind: "match",
  match: { entry: { name: "Syariful Mahya", credentials: "Lc., M.A." }, via: "titleContains" },
};

/** Real shapes: ordered summary, bold bullets, a blockquoted quotation, a table, a check list. */
const BRIEFING = `# BRIEFING DOKUMEN: 15 INDIKASI KEBODOHAN

## EXECUTIVE SUMMARY

Ceramah ini membahas tentang kebodohan dalam perspektif Islam.

## PEMBAHASAN UTAMA

### 1. Definisi Kecerdasan dan Kebodohan dalam Islam

Penceramah membedakan dua jenis kecerdasan:
- **Kecerdasan akademis**: mengacu pada nilai ujian dan prestasi sekolah
- **Kecerdasan versi Islam**: kemampuan mengenali kebaikan lalu mencintainya

> "Bodoh dalam bahasa agama kita lebih dititikberatkan pada perilaku."

| Penyakit | Penjelasan |
|----------|------------|
| **Syubhat** | Kebaikan tampak buruk |

- Penceramah menyebut sebuah hadits [rujukan tidak jelas dalam transkrip]
- Penceramah mengutip "amal itu tergantung niatnya" dari sebuah riwayat

---

## Perlu dicek terhadap video (32)

- **00:12:03** _(nomor ayat)_ surat al baqarah ayat dua ratus
`;

describe("the spoken frame", () => {
  test("a rostered speaker is named, with the credentials a person typed", () => {
    expect(openingLine(MATCH, CHANNEL)).toBe(
      "Ini ringkasan otomatis dari kajian oleh Syariful Mahya, Lc., M.A. Suara ini bukan suara beliau. " +
        "Isinya tidak dimaksudkan sebagai kutipan, bukan fatwa, dan belum diperiksa ulama.",
    );
  });

  test("a channel is spoken ONLY when a person allowlisted it", () => {
    expect(openingLine(NONE, CHANNEL, [CHANNEL])).toContain(CHANNEL);
    expect(openingLine(NONE, CHANNEL, [])).not.toContain(CHANNEL);
    expect(openingLine(NONE, CHANNEL, ["  masjid darussalam kota wisata "])).toContain(CHANNEL);
    expect(openingLine(NONE, CHANNEL, ["Masjid Darussalam"])).not.toContain(CHANNEL);
  });

  test("a BARE personal-name channel is not spoken — the shape both heuristics passed", () => {
    for (const c of [
      "Firanda Andirja", "Hanan Attaki", "Felix Siauw", "Khalid Basalamah Official",
      "Adi Hidayat Official", "Oemar Mita", "Erwandi Tarmizi", "Muhammad Nuzul Dzikri",
    ]) {
      expect(channelMayBeSpoken(c, [])).toBe(false);
      const line = openingLine(NONE, c, []);
      expect(line).toContain("Ini ringkasan otomatis dari sebuah kajian.");
      for (const word of c.split(" ")) expect(line).not.toContain(word);
    }
  });

  test("the default is omission — an allowlist nobody filled speaks no channel at all", () => {
    expect(channelMayBeSpoken("Masjid Darussalam Kota Wisata", [])).toBe(false);
    expect(channelMayBeSpoken("", [""])).toBe(false);
  });

  test("EVERY denial the artifact makes is heard FIRST, not only at the end", () => {
    for (const line of [openingLine(NONE, CHANNEL), openingLine(MATCH, CHANNEL)]) {
      expect(line).toContain("belum diperiksa ulama");
      expect(line).toContain("bukan fatwa");
      expect(line).toContain("tidak dimaksudkan sebagai kutipan");
    }
  });

  test("ambiguous is treated exactly as none — the roster's order never decides who is credited", () => {
    expect(openingLine(AMBIGUOUS, CHANNEL)).toBe(openingLine(NONE, CHANNEL));
    expect(openingLine(AMBIGUOUS, CHANNEL)).not.toContain("Rahman");
  });

  test("a channel-less video still opens with an attribution", () => {
    expect(openingLine(NONE, "   ")).toBe(
      "Ini ringkasan otomatis dari sebuah kajian. Suara ini bukan suara penceramahnya. " +
        "Isinya tidak dimaksudkan sebagai kutipan, bukan fatwa, dan belum diperiksa ulama.",
    );
  });

  test("the attribution is spoken FIRST — before the draft warning and before any content", () => {
    const s = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: true, kind: "long",
    });
    expect(s.full.startsWith(s.opening)).toBe(true);
    expect(s.full.indexOf(s.opening)).toBeLessThan(s.full.indexOf(DRAFT_WARNING));
    expect(s.full.indexOf(DRAFT_WARNING)).toBeLessThan(s.full.indexOf("Ceramah ini membahas"));
  });

  test("the draft warning is spoken only for a draft", () => {
    const base = { briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, kind: "long" } as const;
    expect(buildNarrationScript({ ...base, isDraft: true }).full).toContain(DRAFT_WARNING);
    expect(buildNarrationScript({ ...base, isDraft: false }).full).not.toContain(DRAFT_WARNING);
  });

  test("both artifacts close by pointing back at the source, by the means each one has", () => {
    expect(closingLine("short")).toContain("Pindai kode di layar");
    // The long form promises the link is in the FILE's details, which is a promise `encodeM4a`
    // has to keep with a metadata tag. If that tag goes, this sentence goes with it.
    expect(closingLine("long")).toContain("deskripsi file audio ini");
    expect(closingLine("short") + closingLine("long")).not.toContain("http");
  });

  test("the voice is the one ADR 6 records as load-bearing", () => {
    expect(NARRATION_VOICE).toBe("id-ID-Chirp3-HD-Schedar");
  });
});

describe("what the narrator refuses to say", () => {
  const spoken = speakableFrom(BRIEFING, TITLE);
  const reasons = spoken.dropped.map((d) => d.reason);

  test("a blockquoted direct quotation never reaches the microphone", () => {
    expect(spoken.text).not.toContain("Bodoh dalam bahasa agama");
  });

  test("an inline quotation is dropped and NAMED, not silently skipped", () => {
    expect(reasons).toContain("carries-a-quote");
    expect(spoken.text).not.toContain("amal itu tergantung niatnya");
  });

  test("a bullet carrying an unclear reference is dropped and named", () => {
    expect(reasons).toContain("unclear-reference");
    expect(spoken.text).not.toContain("rujukan tidak jelas");
  });

  test("markdown tables are not read aloud", () => {
    expect(spoken.text).not.toContain("Syubhat");
    expect(spoken.text).not.toContain("|");
  });

  test("it stops at the check-list heading, exactly as the slide does", () => {
    expect(spoken.text).not.toContain("00:12:03");
    expect(spoken.text).not.toContain("al baqarah");
  });

  test("prose and bullets DO survive, so the refusals are not just an empty result", () => {
    expect(spoken.text).toContain("Ceramah ini membahas tentang kebodohan");
    expect(spoken.text).toContain("Kecerdasan akademis");
    expect(spoken.text.length).toBeGreaterThan(180);
  });

  test("a line reproducing the uploader's title is dropped", () => {
    const echoed = `# ${TITLE}\n\nIsi ringkasan yang wajar dan panjang secukupnya.\n`;
    const r = speakableFrom(echoed, TITLE);
    expect(r.dropped.map((d) => d.reason)).toContain("echoes-the-title");
    expect(r.text).not.toContain("SYARIFUL");
    expect(r.text).toContain("Isi ringkasan yang wajar");
  });

  test("a title echo needs MOST of the title — a body line sharing two words is kept", () => {
    expect(echoesTitle("Penceramah menyebut 15 indikasi kebodohan dari kitab klasik", TITLE)).toBe(false);
    expect(echoesTitle("15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A.", TITLE)).toBe(true);
  });

  test("a post-nominal gelar is dropped wherever it appears in prose", () => {
    const r = speakableFrom("Materi disampaikan oleh beliau, S.Ag., pada malam itu.\n", "judul lain sekali");
    expect(r.dropped.map((d) => d.reason)).toContain("carries-a-credential");
  });

  test("the denial triad is ONE string, so no surface can quietly carry fewer", () => {
    // The m4a description panel is read WITHOUT pressing play, so the spoken frame never reaches
    // it. A second hand-typed copy is exactly how it came to carry one denial out of three.
    expect(NARRATION_DENIALS).toContain("bukan fatwa");
    expect(NARRATION_DENIALS).toContain("belum diperiksa ulama");
    expect(NARRATION_DENIALS.toLowerCase()).toContain("tidak dimaksudkan sebagai kutipan");
    const audio = codeOf("./kajian-audio.ts");
    expect(audio).toContain("${NARRATION_DENIALS}");
    // The FOURTH carrier: the briefing markdown. Uncovered until now, which is how a fourth copy
    // would have drifted exactly as the first three did.
    expect(codeOf("./kajian.ts")).toContain("${DENIALS}");
    /**
     * ⚠ ASSERTED ON THE PROPERTY, NOT ON A HISTORICAL STRING. The first version of this line read
     * `not.toContain("Kanal pengunggah")` — the literal that happened to be there when the bug was
     * found — so re-adding `album=${channel}`, the exact regression it was written to prevent,
     * would have sailed through it. What must hold is that `encodeM4a` cannot receive a channel at
     * all: `M4aTags` has no such field, and no metadata key carries one.
     */
    expect(audio).not.toContain("album=");
    expect(audio).not.toMatch(/readonly channel\??:/);
    expect(audio).not.toContain("tags.channel");
  });

  // The DRAFT gate and the panel's contents are asserted in `kajian-audio.test.ts`, by ENCODING a
  // file and reading its tags back. Two source-grep versions of that check lived here and both were
  // blind — a grep proves a symbol is spelled in a file, never that the code runs.

  test("every denial the opening makes is one the code can back", () => {
    // "bukan kutipan langsung" asserted a property of the CONTENT, but the screen behind it detects
    // only PAIRED QUOTE MARKS — a near-verbatim unquoted line ships under that denial. "bukan
    // dimaksudkan sebagai kutipan" is a claim about intent, which this pipeline can always make.
    expect(openingLine(NONE, CHANNEL)).toContain("tidak dimaksudkan sebagai kutipan");
    expect(openingLine(NONE, CHANNEL)).not.toContain("bukan kutipan langsung");
    // `bukan` negates nouns, `tidak` negates verbs, and `dimaksudkan` is a verb. This is SPOKEN
    // aloud in every narrated file, so the grammar is not cosmetic.
    expect(openingLine(NONE, CHANNEL)).not.toContain("bukan dimaksudkan");
  });

  test("the credential screen must NOT fire on ma'ruf — the undotted form did", () => {
    expect(carriesCredential("amar ma'ruf nahi munkar")).toBe(false);
    expect(carriesCredential("Beliau seorang guru di kota Roma.")).toBe(false);
    expect(carriesCredential("lima")).toBe(false);
    expect(carriesCredential("Ustadz Fulan, Lc.")).toBe(true);
    expect(carriesCredential("Fulan, M.A.")).toBe(true);
  });

  test("speakableFrom adds nothing — every word of the BODY came from the briefing", () => {
    // Scoped to the body on purpose: the opening, draft warning and closing are ours by design.
    const source = new Set(BRIEFING.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    for (const w of spoken.text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
      expect(source.has(w)).toBe(true);
    }
  });

  /**
   * ⚠ SCOPED TO WHAT THIS FIXTURE MEASURES, deliberately. The earlier name — "speaks no name and
   * no gelar — on BOTH paths" — asserted a CLASS, and the module docblock records that the class
   * does not hold: "Penceramah, Syariful Mahya, menjelaskan tiga perkara" clears the title-overlap
   * threshold and carries no dotted gelar, so it is spoken. That hole is deliberately not pinned
   * by a passing test, and a test NAMED as the guarantee is that pin by another route.
   */
  test("this briefing and this channel yield no name and no gelar, on both paths", () => {
    const long = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: PERSON_CHANNEL, title: TITLE, isDraft: true, kind: "long",
    });
    const short = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: PERSON_CHANNEL, title: TITLE, isDraft: true,
      kind: "short", bullets: ["Ustadz Syariful Mahya, L.C. berkata", "Poin yang aman dan wajar"],
    });
    for (const s of [long, short]) {
      expect(s.full.toLowerCase()).not.toContain("syariful");
      expect(s.full.toLowerCase()).not.toContain("firanda");
      expect(s.full.toLowerCase()).not.toContain("andirja");
      expect(carriesCredential(s.full)).toBe(false);
    }
  });

  test("a briefing that refuses down to nothing is not narrated as an empty frame either", () => {
    const allQuoted = '> "satu"\n\n- Penceramah berkata "dua"\n- Penceramah berkata "tiga"\n';
    expect(() =>
      buildNarrationScript({
        briefing: allQuoted, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false, kind: "long",
      }),
    ).toThrow(/nothing in the briefing survived/);
  });

  /**
   * The slide path screens gelar too, as of this change. This pass is kept because the two paths
   * are free to diverge again, `buildNarrationScript` is callable with any bullets, and
   * `echoesTitle` has no slide-side equivalent at all.
   */
  test("the SHORT path runs ALL FOUR screens — including the two the slide also runs", () => {
    /**
     * The first version ran only `echoesTitle` and `carriesCredential`, the two with no slide-side
     * equivalent — so it was correct about QUOTATIONS only because `collect()` happened to screen
     * them first. In audio that is the worst one to inherit from a caller: a narrator reading the
     * speaker's own words is what ADR 6 exists to prevent.
     */
    const s = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false, kind: "short",
      bullets: [
        'Penceramah mengutip "amal itu tergantung niatnya" dari sebuah riwayat',
        "Penceramah menyebut hadits [rujukan tidak jelas dalam transkrip]",
        "Poin yang aman dan wajar",
      ],
    });
    expect(s.body).toBe("Poin yang aman dan wajar.");
    const reasons = s.dropped.map((d) => d.reason);
    expect(reasons).toContain("carries-a-quote");
    expect(reasons).toContain("unclear-reference");
  });

  test("...and the fourth, echoesTitle, which no other assertion here reaches", () => {
    /**
     * The fourth screen was DELETABLE WITH THE SUITE GREEN. The test above is named "ALL FOUR" and
     * pinned three: removing `echoesTitle` from the short path changed nothing any assertion could
     * see. The obvious fixture — "Ustadz Syariful Mahya, L.C. berkata" — cannot serve as the pin,
     * because it trips `carriesCredential` too and would stay red for the wrong reason. This bullet
     * is the title with the gelar stripped: 3 of 5 tokens, exactly the 0.6 threshold, no dotted
     * post-nominal anywhere in it.
     */
    const s = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false, kind: "short",
      bullets: ["15 INDIKASI KEBODOHAN USTADZ SYARIFUL MAHYA", "Poin yang aman dan wajar"],
    });
    expect(s.dropped.map((d) => d.reason)).toEqual(["echoes-the-title"]);
    expect(s.body).toBe("Poin yang aman dan wajar.");
  });

  test("the SHORT path screens its own bullets rather than trusting its caller", () => {
    const s = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false, kind: "short",
      bullets: ["Ustadz Fulan, Lc. menjelaskan tiga perkara", "Poin yang aman dan wajar"],
    });
    expect(s.body).toBe("Poin yang aman dan wajar.");
    expect(s.dropped.map((d) => d.reason)).toContain("carries-a-credential");
  });

  test("a short narration whose every bullet is refused is refused whole", () => {
    expect(() =>
      buildNarrationScript({
        briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false,
        kind: "short", bullets: ["Fulan, M.A. berkata demikian"],
      }),
    ).toThrow(/every one of the 1 slide bullet/);
  });

  test("a short narration with no bullets is refused, not narrated as an empty frame", () => {
    expect(() =>
      buildNarrationScript({
        briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false,
        kind: "short", bullets: [],
      }),
    ).toThrow(/needs the slide's bullets/);
  });

  test("the short script narrates the slide's OWN bullets, not a re-extraction", () => {
    const s = buildNarrationScript({
      briefing: BRIEFING, speaker: NONE, channel: CHANNEL, title: TITLE, isDraft: false,
      kind: "short", bullets: ["Poin pertama yang dipilih", "Poin kedua"],
    });
    expect(s.body).toBe("Poin pertama yang dipilih. Poin kedua.");
    expect(s.full).not.toContain("Ceramah ini membahas");
  });
});

describe("chunking — the invariant ADR 6 asks for", () => {
  const long = Array.from(
    { length: 120 },
    (_, i) => `Ini kalimat nomor ${i + 1} dalam ringkasan yang panjang sekali dan harus dipotong dengan rapi.`,
  ).join(" ");

  test("the rejoined chunks are byte-identical to the script", () => {
    const { chunks } = chunkForTts(long, 900);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.join(" ")).toBe(long);
  });

  test("every chunk fits under the cap", () => {
    for (const c of chunkForTts(long, 900).chunks) expect(byteLength(c)).toBeLessThanOrEqual(900);
  });

  test("the cap is counted in BYTES, not characters", () => {
    const arabic = Array.from({ length: 40 }, () => "Nabi \u{FDFA} bersabda begini.").join(" ");
    const { chunks } = chunkForTts(arabic, 200);
    for (const c of chunks) expect(byteLength(c)).toBeLessThanOrEqual(200);
    expect(chunks.join(" ")).toBe(arabic);
  });

  test("it splits at sentences when it can", () => {
    const r = chunkForTts(long, 900);
    expect(r.deepestSplit).toBe("sentence");
    for (const c of r.chunks) expect(c.trimEnd().endsWith(".")).toBe(true);
  });

  test("a sentence longer than the cap falls back to clauses, still reconstructing exactly", () => {
    const clauses = `${Array.from({ length: 30 }, (_, i) => `bagian ke ${i + 1} dari kalimat itu`).join(", ")}.`;
    const r = chunkForTts(clauses, 300);
    expect(r.deepestSplit).toBe("clause");
    expect(r.chunks.join(" ")).toBe(clauses);
    for (const c of r.chunks) expect(byteLength(c)).toBeLessThanOrEqual(300);
  });

  test("a clause longer than the cap falls back to words — never mid-word", () => {
    const words = Array.from({ length: 200 }, () => "katakatakata").join(" ");
    const r = chunkForTts(words, 120);
    expect(r.deepestSplit).toBe("word");
    expect(r.chunks.join(" ")).toBe(words);
    for (const c of r.chunks) {
      for (const w of c.split(" ")) expect(w).toBe("katakatakata");
    }
  });

  test("a single word over the cap throws rather than truncating", () => {
    expect(() => chunkForTts("x".repeat(300), 100)).toThrow(/single word/);
  });

  test("a cap above the API's measured hard limit is refused", () => {
    expect(() => chunkForTts("halo dunia", TTS_HARD_LIMIT_BYTES + 1)).toThrow(/hard limit/);
    expect(DEFAULT_CHUNK_BYTES).toBeLessThan(TTS_HARD_LIMIT_BYTES);
  });

  test("empty input yields no chunks rather than one empty request", () => {
    expect(chunkForTts("   \n  ", 900).chunks).toEqual([]);
  });

  test("A DROPPED CHUNK IS CAUGHT — the failure that otherwise plays cleanly", () => {
    const { chunks } = chunkForTts(long, 900);
    const missing = [...chunks.slice(0, 2), ...chunks.slice(3)];
    expect(() => assertChunksCoverText(missing, long)).toThrow(/do not reconstruct/);
  });

  test("a chunk truncated at a word boundary is caught too", () => {
    const { chunks } = chunkForTts(long, 900);
    const cut = [...chunks];
    cut[0] = cut[0]!.split(" ").slice(0, -3).join(" ");
    expect(() => assertChunksCoverText(cut, long)).toThrow(/first divergence at char/);
  });

  test("a chunker that lost one sentence and duplicated another is NOT saved by a length check", () => {
    const { chunks } = chunkForTts(long, 900);
    const swapped = [...chunks];
    // Same chunk count AND the exact same total length — the shape a length check cannot see.
    swapped[1] = chunks[1]!.split(" ").reverse().join(" ");
    expect(swapped.length).toBe(chunks.length);
    expect(swapped.join(" ").length).toBe(chunks.join(" ").length);
    expect(() => assertChunksCoverText(swapped, long)).toThrow(/do not reconstruct/);
  });

  test("expectedSeconds applies CHARS_PER_SECOND, whose value is a documented measurement", () => {
    expect(expectedSeconds("x".repeat(158))).toBeCloseTo(10, 1);
  });
});
