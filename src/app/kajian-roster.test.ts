/**
 * The roster is the only thing that decides whether a real person's name goes on a public slide.
 * These tests pin the two properties that matter: it names the right person, and — more important —
 * it names NOBODY the moment it is unsure.
 */
import { describe, expect, it } from "bun:test";
import {
  matchesFor,
  resolveSpeaker,
  checkOrganisations,
  validateRoster,
  type RosterEntry,
} from "./kajian-roster.ts";

const FULAN: RosterEntry = {
  name: "Ustadz Fulan Hamid",
  credentials: "Lc., M.A.",
  titleContains: "fulan hamid",
};
const CHANNEL_OWNER: RosterEntry = {
  name: "Ustadz Contoh",
  channelId: "UC_one_speaker_channel",
};

/** The real video this tool was first run against — a MOSQUE channel, speaker only in the title. */
const REAL_VIDEO = {
  title: "TUJUH TANDA KEBODOHAN | USTADZ FULAN HAMID, L.C., M.A.",
  channelId: "UC_masjid_al_amanah",
};

describe("validateRoster", () => {
  it("rejects an entry that can never match, because it would look like coverage", () => {
    const problems = validateRoster([{ name: "Ustadz Tanpa Aturan" }]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("can never match");
  });

  it("rejects a title fragment short enough to catch the wrong lecture", () => {
    const problems = validateRoster([{ name: "X", titleContains: "ust" }]);
    expect(problems.some((p) => p.includes("too short"))).toBe(true);
  });

  it("rejects a nameless entry", () => {
    expect(validateRoster([{ name: "  ", channelId: "UC_x" }])[0]).toContain("missing `name`");
  });

  it("passes a well-formed roster", () => {
    expect(validateRoster([FULAN, CHANNEL_OWNER])).toEqual([]);
  });
});

describe("resolveSpeaker", () => {
  it("matches on the TITLE when the channel is a venue, not a person", () => {
    // The case that shaped the design: matching on channelId alone would have credited a mosque.
    const out = resolveSpeaker([FULAN], REAL_VIDEO);
    expect(out.kind).toBe("match");
    if (out.kind !== "match") throw new Error("unreachable");
    expect(out.match.entry.name).toBe("Ustadz Fulan Hamid");
    expect(out.match.via).toBe("titleContains");
  });

  it("matches on channelId when a channel really is one speaker", () => {
    const out = resolveSpeaker([CHANNEL_OWNER], { title: "Kajian apa saja", channelId: "UC_one_speaker_channel" });
    expect(out.kind).toBe("match");
    if (out.kind !== "match") throw new Error("unreachable");
    expect(out.match.via).toBe("channelId");
  });

  it("names NOBODY when the roster has no entry for the video", () => {
    const out = resolveSpeaker([CHANNEL_OWNER], REAL_VIDEO);
    expect(out.kind).toBe("none");
  });

  it("names NOBODY when two entries match — ambiguity is treated as absence", () => {
    // "pick the first" would make roster ORDER silently decide who gets credited.
    const alsoMatches: RosterEntry = { name: "Ustadz Lain", titleContains: "tanda kebodohan" };
    const out = resolveSpeaker([FULAN, alsoMatches], REAL_VIDEO);
    expect(out.kind).toBe("ambiguous");
    if (out.kind !== "ambiguous") throw new Error("unreachable");
    expect(out.names).toEqual(["Ustadz Fulan Hamid", "Ustadz Lain"]);
  });

  it("names nobody from an empty roster rather than throwing", () => {
    expect(resolveSpeaker([], REAL_VIDEO).kind).toBe("none");
  });

  it("is case-insensitive on the title, because titles are often SHOUTED", () => {
    const out = resolveSpeaker([FULAN], REAL_VIDEO);
    expect(out.kind).toBe("match");
  });

  it("never matches a too-short fragment even if validation was skipped", () => {
    // Defence in depth: `matchesFor` re-checks the length bound rather than trusting that
    // validateRoster ran. A guard that only works when another guard ran is not working.
    expect(matchesFor([{ name: "X", titleContains: "us" }], REAL_VIDEO)).toEqual([]);
  });

  it("does not infer a speaker from the channel NAME, only from an explicit channelId", () => {
    // There is no channel-name matching anywhere in this module, on purpose. If someone adds it,
    // this test is where they find out it was a decision.
    const out = resolveSpeaker([{ name: "Masjid Al-Amanah Kota Harapan", titleContains: "al-amanah" }], REAL_VIDEO);
    expect(out.kind).toBe("none");
  });
});

describe("the organisations allowlist", () => {
  it("returns the survivors, because printing a problem is not rejecting an entry", () => {
    const r = checkOrganisations(["Masjid Al-Amanah Kota Harapan", "Yufid TV"]);
    expect(r.problems).toEqual([]);
    expect(r.valid).toEqual(["Masjid Al-Amanah Kota Harapan", "Yufid TV"]);
  });

  it("drops an empty entry AND says so", () => {
    const r = checkOrganisations(["  ", "Yufid TV"]);
    expect(r.valid).toEqual(["Yufid TV"]);
    expect(r.problems.join(" ")).toContain("empty");
  });

  it("drops a duplicate and says so — inert for matching, but a maintainer should know", () => {
    const r = checkOrganisations(["Yufid TV", "yufid tv"]);
    expect(r.valid).toEqual(["Yufid TV"]);
    expect(r.problems.join(" ")).toContain("duplicate");
  });

  it("keeps a SHORT organisation name — exact match makes a length floor meaningless", () => {
    // The old min-4 floor was borrowed from `titleContains`, a SUBSTRING matcher. This one is
    // equality: "TV" matches a channel named exactly "TV" and nothing else.
    expect(checkOrganisations(["TV"]).valid).toEqual(["TV"]);
  });
});
