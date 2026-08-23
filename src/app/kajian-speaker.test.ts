/**
 * The extractor is tested against the REAL capture bytes, not against a description I wrote.
 *
 * `guard-tests-need-production-prose` is the reason: a hand-written fixture teaches the suite to
 * expect whatever shape the author imagined, and the hadith wall stayed open for two sessions
 * because every case was prose we authored. So the Darussalam description is READ FROM DISK when it
 * is there, and the inlined copy below is a verbatim splice of those bytes for when it is not.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSpeakerWithProvenance, speakerFromMetadata } from "./kajian-speaker.ts";

const CAPTURE = join(import.meta.dir, "../../.scratch/kajian/brlqHxjIp9c/meta.json");

/** Verbatim splice of the capture, used only if `.scratch/` is absent (it is gitignored). */
const FALLBACK = {
  title: "15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A.",
  channel: "Masjid Darussalam Kota Wisata",
  description:
    "KAJIAN MUSLIMAH KAMIS\n\u{1F54C} MASJID DARUSSALAM KOTA WISATA\n==========================\n" +
    "\u{1F5D3}\u{FE0F} 23 Juli 2026 / 9 Safar 1448 H\n\u{1F464}Ustadz Syariful Mahya, L.c., M.A.\n" +
    "\u{1F4CB} 15 Indikasi Kebodohan\n\u{1F310} Live Streaming Youtube: https://youtube.com/live/brlqHxjIp9c?feature=share\n",
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

describe("speakerFromMetadata — the real Darussalam capture", () => {
  it("reads the speaker from the description's person line, with the uploader's own casing", () => {
    const got = speakerFromMetadata(capture());
    expect(got).not.toBeNull();
    expect(got?.name).toBe("Ustadz Syariful Mahya, L.c., M.A.");
    expect(got?.via).toBe("description");
  });

  it("NEVER returns the channel — it is a mosque, and this is the case ADR 5 predicted", () => {
    const meta = capture();
    const got = speakerFromMetadata(meta);
    expect(got?.name).not.toBe(meta.channel);
    expect(got?.name).not.toContain("Masjid");
  });

  it("falls back to the title segment after the separator when the description says nothing", () => {
    const got = speakerFromMetadata({ title: capture().title, description: "no person line here" });
    expect(got?.via).toBe("title");
    // ALL-CAPS is normalised; dotted abbreviations stay uppercase because lowercasing them would
    // invent a house style. This is why `description` is preferred when both exist.
    expect(got?.name).toBe("Ustadz Syariful Mahya, L.C., M.A.");
  });

  it("does not take the whole title — the lecture name is not a person", () => {
    const got = speakerFromMetadata({ title: capture().title, description: "" });
    expect(got?.name).not.toContain("INDIKASI");
    expect(got?.name).not.toContain("15");
  });
});

describe("speakerFromMetadata — omission is still the fallback", () => {
  const nothing = [
    { why: "no honorific anywhere", title: "15 Indikasi Kebodohan | Kajian Muslimah", description: "" },
    { why: "title with no separator", title: "Ustadz Syariful Mahya bicara", description: "" },
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
  // The capture's channel is "Masjid Darussalam Kota Wisata", which carries no honorific — so the
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
        description: "\u{1F464} Ustadz Syariful Mahya, L.c., M.A.",
      }),
    );
    expect(got?.name).toBe("Ustadz Syariful Mahya, L.c., M.A.");
    expect(got?.name).not.toContain("Isrofiel");
  });
});
