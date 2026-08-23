/**
 * The extractor is tested against the REAL capture bytes when they are on disk.
 *
 * `guard-tests-need-production-prose` is the reason: a hand-written fixture teaches the suite to
 * expect whatever shape the author imagined, and the hadith wall stayed open for two sessions
 * because every case was prose we authored. So the real description is READ FROM DISK whenever
 * `.scratch/` is present (it is gitignored, so it never leaves the machine that captured it).
 *
 * ⚠ THE INLINED FALLBACK IS NO LONGER A SPLICE OF THOSE BYTES. It was, and that put a real lecture
 * title, a real mosque, a real speaker's name and gelar, and the real video id into a PUBLIC repo
 * — the thing ISC-627 is about, and the thing the disclosure letter promises to undo. It is now
 * INVENTED, and shaped byte-for-byte like the capture: the same emoji-prefixed lines, the same
 * `👤` person line with the uploader's mixed-case gelar, the same `|` separator in the title.
 *
 * ⚠ AND THE ASSERTIONS BELOW ARE NOW CAPTURE-RELATIVE, which is why the two paths cannot drift.
 * They used to name the expected string, so scrubbing the fallback made them pass on a clean clone
 * and fail on the machine holding the real capture — and a hardcoded negative
 * (`not.toContain("INDIKASI")`) was worse than that: against the OTHER path it could never fail.
 * Each case now derives what it expects from whichever capture it was handed, so it tests the
 * extractor's RULE — the person line wins, casing is normalised but not invented, the lecture name
 * is never a person — rather than one recorded output of it.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSpeakerWithProvenance, speakerFromMetadata } from "./kajian-speaker.ts";

const CAPTURE = join(import.meta.dir, "../../.scratch/kajian/brlqHxjIp9c/meta.json");

/** Verbatim splice of the capture, used only if `.scratch/` is absent (it is gitignored). */
const FALLBACK = {
  title: "TUJUH TANDA KEBODOHAN | USTADZ FULAN HAMID, L.C., M.A.",
  channel: "Masjid Al-Amanah Kota Harapan",
  description:
    "KAJIAN MUSLIMAH KAMIS\n\u{1F54C} MASJID AL-AMANAH KOTA HARAPAN\n==========================\n" +
    "\u{1F5D3}\u{FE0F} 23 Juli 2026 / 9 Safar 1448 H\n\u{1F464}Ustadz Fulan Hamid, L.c., M.A.\n" +
    "\u{1F4CB} Tujuh Tanda Kebodohan\n\u{1F310} Live Streaming Youtube: https://youtube.com/live/vIdEoIdXxYz?feature=share\n",
};

function capture(): { title: string; channel: string; description: string } {
  try {
    const raw = JSON.parse(readFileSync(CAPTURE, "utf8")) as Record<string, string>;
    // Only trust the file if it actually carries the fields under test.
    if (raw.title && raw.description) return raw as never;
  } catch {
    /* fall through */
  }
  return FALLBACK;
}

describe("speakerFromMetadata — the real capture when it is on disk, the fallback when it is not", () => {
  it("reads the speaker from the description's person line, with the uploader's own casing", () => {
    const meta = capture();
    // Derived from whichever capture we got, so this asserts "the person line, verbatim" rather
    // than one recorded name — and it holds on the real bytes and the fallback alike.
    const personLine = meta.description.split("\n").find((l) => l.includes("\u{1F464}"));
    expect(personLine).toBeDefined();
    const expected = personLine!.replace(/^[^\p{L}]+/u, "").trim();
    const got = speakerFromMetadata(meta);
    expect(got).not.toBeNull();
    expect(got?.name).toBe(expected);
    expect(got?.via).toBe("description");
  });

  it("NEVER returns the channel — it is a mosque, and this is the case ADR 5 predicted", () => {
    const meta = capture();
    const got = speakerFromMetadata(meta);
    expect(got?.name).not.toBe(meta.channel);
    expect(got?.name).not.toContain("Masjid");
  });

  it("falls back to the title segment after the separator when the description says nothing", () => {
    const raw = capture().title.split("|")[1]?.trim();
    expect(raw).toBeTruthy();
    const got = speakerFromMetadata({ title: capture().title, description: "no person line here" });
    expect(got?.via).toBe("title");
    // ALL-CAPS is normalised; dotted abbreviations stay uppercase because lowercasing them would
    // invent a house style. This is why `description` is preferred when both exist. Asserted as
    // the RULE — same words, different casing — so it cannot be satisfied by dropping a word.
    expect(got?.name).not.toBe(raw);
    expect(got?.name?.toUpperCase()).toBe(raw!.toUpperCase());
    expect(got?.name).toMatch(/^Ustadz /);
    expect(got?.name).toMatch(/\bL\.C\./);
  });

  it("does not take the whole title — the lecture name is not a person", () => {
    // Every word BEFORE the separator is the lecture's name. Derived, because the hardcoded
    // version named the words of one capture and so could never fail against the other.
    const lecture = capture().title.split("|")[0]!.trim().split(/\s+/).filter(Boolean);
    expect(lecture.length).toBeGreaterThan(1);
    const got = speakerFromMetadata({ title: capture().title, description: "" });
    for (const word of lecture) expect(got?.name).not.toContain(word);
  });
});

describe("speakerFromMetadata — omission is still the fallback", () => {
  const nothing = [
    { why: "no honorific anywhere", title: "Tujuh Tanda Kebodohan | Kajian Muslimah", description: "" },
    { why: "title with no separator", title: "Ustadz Fulan Hamid bicara", description: "" },
    { why: "empty everything", title: "", description: "" },
    { why: "person line is a URL", title: "", description: "\u{1F464} https://youtube.com/@x" },
    { why: "person line is an email", title: "", description: "Pemateri: kontak@darussalam.id" },
    { why: "label with nothing after it", title: "", description: "Pemateri:" },
    { why: "too short to be a name", title: "", description: "\u{1F464} Ust" },
    { why: "a sentence, not a name", title: "", description: "\u{1F464} Siapa ustadz yang mengisi?" },
  ];
  for (const c of nothing) {
    it(`returns null — ${c.why}`, () => {
      expect(speakerFromMetadata(c)).toBeNull();
    });
  }

  it("returns null for a 200-character line even though it carries an honorific", () => {
    expect(speakerFromMetadata({ description: `\u{1F464} Ustadz ${"a".repeat(200)}` })).toBeNull();
  });
});

describe("resolveSpeakerWithProvenance — provenance is preserved, not flattened", () => {
  const meta = capture();
  const rosterMatch = { kind: "match", match: { entry: { name: "Ustadz Ahmad", credentials: "Lc." } } };

  it("a roster entry WINS over the description — a person typed it and answers for it", () => {
    const got = resolveSpeakerWithProvenance(rosterMatch, meta);
    expect(got.kind).toBe("roster");
    expect(got.kind === "roster" && got.name).toBe("Ustadz Ahmad");
  });

  it("a metadata name is kind:'metadata', NOT kind:'roster' — the claims are different", () => {
    const got = resolveSpeakerWithProvenance({ kind: "none" }, meta);
    expect(got.kind).toBe("metadata");
    expect(got.kind === "metadata" && got.via).toBe("description");
  });

  it("an AMBIGUOUS roster falls through to metadata — we cannot say which of ours, uploader still can", () => {
    expect(resolveSpeakerWithProvenance({ kind: "ambiguous" }, meta).kind).toBe("metadata");
  });

  it("no roster and no metadata is kind:'none' — ADR 5's fallback survives the reversal", () => {
    expect(resolveSpeakerWithProvenance({ kind: "none" }, { title: "Kajian", description: "" }).kind).toBe("none");
  });
});

describe("speakerFromMetadata — `channel` is unreachable, proved with a NAME-SHAPED channel", () => {
  // The capture's channel is "Masjid Al-Amanah Kota Harapan", which carries no honorific — so the
  // earlier "never returns the channel" test passes even if `channel` WERE read, because the
  // honorific guard would reject it anyway. It proves the guard, not the exclusion. These fixtures
  // are name-shaped and would sail through every guard, so only the exclusion can stop them.
  // `channel` is not in the parameter type at all, so today this is enforced by tsc; the tests are
  // insurance for the day somebody widens that type.
  const withChannel = (o: Record<string, string>): { title?: string; description?: string } => o;

  it("a channel that IS a scholar's name is still not returned", () => {
    expect(
      speakerFromMetadata(
        withChannel({
          channel: "Ustadz Ahmad Isrofiel Mardlatillah",
          title: "Kajian Rutin Pekanan",
          description: "Rekaman kajian pekanan.",
        }),
      ),
    ).toBeNull();
  });

  it("when the channel names scholar A and the description names scholar B, B is returned", () => {
    const got = speakerFromMetadata(
      withChannel({
        channel: "Ustadz Ahmad Isrofiel Mardlatillah",
        title: "Kajian Rutin Pekanan",
        description: "\u{1F464} Ustadz Fulan Hamid, L.c., M.A.",
      }),
    );
    expect(got?.name).toBe("Ustadz Fulan Hamid, L.c., M.A.");
    expect(got?.name).not.toContain("Isrofiel");
  });
});

/**
 * ONE literal, three uses. Each case used to type the description out for itself, which is how the
 * ISC-627 scrub left a negative assertion naming a surname the fixture no longer contained — an
 * assertion that could not fail. Deriving the forbidden words from this constant means renaming the
 * fixture renames what the assertions look for, in step.
 */
const METADATA_DESCRIPTION = "\u{1F464} Ustadz Fulan Hamid, L.c., M.A.";

describe("kajian ruling (b) — a metadata name may be WRITTEN, never SPOKEN", () => {
  // Erik REFUSED (b) permanently on 2026-08-23
  // (`docs/review/erik-ruling-2026-08-23-kajian-four.md` §2), on ADR 6's unrefuted ground: a caption
  // disclaimer does not reach an autoplaying feed, so a name heard over a briefing is heard as that
  // scholar speaking.
  //
  // He asked for it as a RULE, in the shape of the hadith wall — not as a habit. Before this, the
  // refusal was held by two accidents: `openingLine` takes `RosterOutcome`, so `{kind:"metadata"}`
  // is not assignable, and nothing called the extractor. Both are true and neither is a rule; a type
  // widens the day someone widens it, and "no caller" ends the day there is one.
  it("openingLine names NOBODY when the only name available came from uploader metadata", async () => {
    const { openingLine } = await import("./kajian-narration.ts");
    const fromMetadata = resolveSpeakerWithProvenance(
      { kind: "none" },
      { description: METADATA_DESCRIPTION },
    );
    expect(fromMetadata.kind).toBe("metadata");

    // The narration path is reached with the ROSTER outcome, which for this video is `none`. The
    // assertion is that the spoken line is the unnamed one even though a name was obtainable.
    const spoken = openingLine({ kind: "none" }, "Masjid Al-Amanah Kota Harapan", []);
    // Derived from the fixture, not typed out: one surname here was a leftover from the fixture's
    // PREVIOUS occupant after the ISC-627 scrub, so it could no longer ever fail.
    // Length-filtered because a dotted gelar splits into single letters, and "L", "c", "M" and "A"
    // are all substrings of the standard opening — a derived assertion can be trivially true too.
    const nameWords: string[] = METADATA_DESCRIPTION.replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 3);
    expect(nameWords.length).toBeGreaterThanOrEqual(3);
    for (const word of nameWords) expect(spoken).not.toContain(word);
    expect(spoken).toContain("sebuah kajian");
  });

  it("a metadata outcome is structurally not a roster outcome, so it cannot be passed as one", () => {
    const fromMetadata = resolveSpeakerWithProvenance(
      { kind: "none" },
      { description: METADATA_DESCRIPTION },
    );
    // `RosterOutcome` is match | none | ambiguous. "metadata" is none of them — this is the type
    // boundary, asserted at runtime so it survives a `RosterOutcome` widening that tsc would allow.
    expect(["match", "none", "ambiguous"]).not.toContain(fromMetadata.kind);
  });
});
