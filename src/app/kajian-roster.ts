/**
 * WHO WE ARE PREPARED TO NAME — and the deliberate silence when we are not.
 *
 * ADR 5 says the kajian tool may summarise but may never speak for a scholar. This module is where
 * that becomes code: a hand-maintained list of speakers, matched against a video, and NOTHING
 * inferred. A video with no entry produces no name, no gelar and no photo — only a link to the
 * source. Omission is the fallback, and it is the whole safety property.
 *
 * WHY MATCHING ON `channelId` ALONE WOULD NOT WORK, learned from the first real video rather than
 * guessed. That lecture's channel is "Masjid Darussalam Kota Wisata" — a MOSQUE. The speaker is
 * named only in the video title. A channel-only match would have credited a building, and a
 * mosque channel hosts many different speakers, so channel identity does not determine who spoke.
 * Hence two match modes, and hence `titlePattern`.
 *
 * AMBIGUITY IS TREATED AS ABSENCE. If two entries match one video we return null rather than
 * picking one. A wrong name on a slide is worse than no name, and "pick the first" would make the
 * roster's order silently load-bearing.
 *
 * WHAT THIS MODULE WILL NOT DO, ever:
 *   · infer a speaker from the transcript
 *   · infer a speaker from the channel name
 *   · write, complete or "look up" credentials
 * Every field it returns was typed by a person who is accountable for it.
 */

export interface RosterEntry {
  /** How this person is named on a slide, exactly as they should appear. */
  readonly name: string;
  /**
   * Title and credentials AS THE PERSON USES THEM — Ustadz, Ustadzah, Syaikh, Dr., Lc., M.A.
   * Free text on purpose: an enum here would force real people into our categories, and Indonesian
   * religious titles do not fit a closed list.
   */
  readonly credentials?: string;
  /** Path to a photo WE ARE ENTITLED TO USE, relative to the roster file. */
  readonly photo?: string;
  /** Matches when the video's channelId is exactly this — for a channel that IS one speaker. */
  readonly channelId?: string;
  /**
   * Matches when the video TITLE contains this, case-insensitively. Plain substring, not a regex:
   * a roster is edited by a person under time pressure, and a stray `(` in a regex would either
   * throw or silently match nothing. Substring cannot fail in a way that names the wrong person.
   */
  readonly titleContains?: string;
}

export interface RosterMatch {
  readonly entry: RosterEntry;
  /** Which rule fired — printed so a person can see WHY someone was named. */
  readonly via: "channelId" | "titleContains";
}

export type RosterOutcome =
  | { readonly kind: "match"; readonly match: RosterMatch }
  | { readonly kind: "none" }
  /** Two or more entries matched. Deliberately NOT a match — see the module docblock. */
  | { readonly kind: "ambiguous"; readonly names: readonly string[] };

export interface VideoIdentity {
  readonly title: string;
  readonly channelId: string;
}

/**
 * Reject an entry that cannot match anything, loudly, at load time.
 *
 * An entry with neither `channelId` nor `titleContains` is dead weight that looks like coverage —
 * someone adds a scholar, sees them in the file, and assumes their videos will be attributed. They
 * never will. That is exactly the shape of bug this repo keeps paying for, so it fails here instead.
 */
export function validateRoster(entries: readonly RosterEntry[]): string[] {
  const problems: string[] = [];
  entries.forEach((e, i) => {
    const where = `entry ${i + 1}${e.name ? ` (${e.name})` : ""}`;
    if (!e.name?.trim()) problems.push(`${where}: missing \`name\``);
    if (!e.channelId?.trim() && !e.titleContains?.trim()) {
      problems.push(`${where}: has neither \`channelId\` nor \`titleContains\`, so it can never match`);
    }
    // A one- or two-character fragment matches almost every title. Caught here rather than
    // discovered when it attributes a lecture to the wrong person.
    if (e.titleContains && e.titleContains.trim().length < 4) {
      problems.push(`${where}: \`titleContains\` "${e.titleContains}" is too short to be safe (min 4 chars)`);
    }
  });
  return problems;
}

/** Every entry matching this video, with the rule that fired. Exported for the ambiguity report. */
export function matchesFor(entries: readonly RosterEntry[], video: VideoIdentity): RosterMatch[] {
  const title = video.title.toLowerCase();
  const out: RosterMatch[] = [];
  for (const entry of entries) {
    if (entry.channelId && entry.channelId === video.channelId) {
      out.push({ entry, via: "channelId" });
      continue;
    }
    const frag = entry.titleContains?.trim().toLowerCase();
    if (frag && frag.length >= 4 && title.includes(frag)) {
      out.push({ entry, via: "titleContains" });
    }
  }
  return out;
}

/**
 * Who to name for this video, or the reason not to name anyone.
 *
 * Callers must handle `none` and `ambiguous` identically at the slide: no name, no gelar, no photo.
 * They are distinguished only so the CLI can tell a person WHY nothing was attributed — "nobody in
 * the roster" and "two people in the roster" need different fixes.
 */
export function resolveSpeaker(entries: readonly RosterEntry[], video: VideoIdentity): RosterOutcome {
  const found = matchesFor(entries, video);
  if (found.length === 0) return { kind: "none" };
  if (found.length > 1) return { kind: "ambiguous", names: found.map((m) => m.entry.name) };
  return { kind: "match", match: found[0]! };
}

export interface OrganisationsCheck {
  readonly problems: readonly string[];
  /** The entries that survived. Callers must use THIS, not the raw list. */
  readonly valid: readonly string[];
}

/**
 * Check the `organisations:` allowlist, and hand back the entries that may actually be used.
 *
 * ⚠ IT RETURNS THE SURVIVORS BECAUSE AN EARLIER VERSION ONLY PRINTED. It was called `validate…`,
 * its tests were named "rejects an entry too short…", and the CLI printed the problems and then
 * used the ORIGINAL array unchanged — so nothing was rejected by any of it. A function whose name,
 * comment and tests all describe a rejection it does not perform is the shape this repo keeps
 * paying for, so the survivors are now the return value and the caller cannot ignore them.
 *
 * ⚠ THERE IS NO MINIMUM LENGTH, AND THE FIRST VERSION HAD ONE. That floor was inherited from
 * `titleContains`, which is a SUBSTRING match where a two-character fragment matches almost every
 * title. `channelMayBeSpoken` is exact case-insensitive EQUALITY: an entry "TV" matches a channel
 * named exactly "TV" and nothing else, which is not a hazard — it is a short organisation name.
 * The floor only rejected legitimate entries, on reasoning that belonged to a different predicate.
 */
export function checkOrganisations(entries: readonly string[]): OrganisationsCheck {
  const problems: string[] = [];
  const valid: string[] = [];
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    const where = `organisations entry ${i + 1}`;
    if (typeof e !== "string") {
      problems.push(`${where}: not a string (${JSON.stringify(e)}), and dropped`);
      return;
    }
    const v = e.trim();
    if (!v) {
      problems.push(`${where}: empty, and dropped`);
      return;
    }
    const key = v.toLowerCase();
    if (seen.has(key)) {
      problems.push(`${where}: "${v}" is a duplicate, and dropped`);
      return;
    }
    seen.add(key);
    valid.push(v);
  });
  return { problems, valid };
}
