/**
 * WHO THE UPLOADER SAID SPOKE — a second, weaker source of a name, kept visibly weaker.
 *
 * ADR 5 said a speaker is named only from a roster we maintain, and `kajian-roster.ts` implements
 * exactly that. Erik reversed the roster-only rule on 2026-08-23 (the "skill wins" ruling,
 * `docs/review/erik-ruling-2026-08-23-skill-wins.md`) and settled the follow-up question on the same
 * day: the name comes from the DESCRIPTION or the TITLE, and **never from `channel`**, with omission
 * still the fallback when neither says who spoke.
 *
 * ── WHY `channel` IS EXCLUDED, AND WHY THAT IS MEASURED RATHER THAN ARGUED ──────────────────────
 *
 * The one real capture (`.scratch/kajian/brlqHxjIp9c/meta.json`) has
 * `channel: "Masjid Al-Amanah Kota Harapan"` — a MOSQUE — while the speaker is
 * `Ustadz Fulan Hamid, L.c., M.A.`. Using `channel` would not be "possibly wrong" on that video;
 * it would be certainly wrong, and it would render a building as a person. ADR 5 predicted this
 * ("a channel can host many"); the capture confirms it fires on the first real input we have.
 *
 * ── WHY THIS IS A SEPARATE MODULE FROM THE ROSTER, AND NOT A NEW MATCH MODE IN IT ───────────────
 *
 * `kajian-roster.ts` states in its own docblock that it will never infer a speaker and that
 * "every field it returns was typed by a person who is accountable for it". That is still true and
 * must stay true, so nothing here is added to it.
 *
 * The provenance difference is not cosmetic. A roster name was typed by US and we answer for it. A
 * metadata name was typed by the UPLOADER, in a free-text field, on a channel we do not control.
 * They are both names on a screen and they are not the same claim, so `SpeakerOutcome` keeps them
 * apart — and downstream code is required to branch on that rather than on "is there a name".
 *
 * ── THE ONE THING THIS MUST NOT BE READ AS PERMITTING ───────────────────────────────────────────
 *
 * Erik's ruling is scoped to what is WRITTEN. It is SILENT on the mp4, and kajian ruling (b) — may a
 * model-relayed speaker name be SPOKEN — is unanswered and his alone. ADR 6's distinction is the
 * reason the silence matters: "Text is visibly written about someone; audio is heard as spoken by
 * someone." So `kajian-narration.ts` refuses a `metadata` outcome by design. If a future change
 * makes narration speak one of these names, it has answered Erik's open question on his behalf.
 */

/** The bust-in-silhouette the Darussalam channel prefixes its speaker line with. */
const PERSON_GLYPH = "\u{1F464}";

/**
 * Labels an uploader may put in front of a speaker's name, lowercased for comparison.
 *
 * Deliberately short. Every entry here is a phrase whose ONLY plausible reading is "the person who
 * spoke is next"; anything vaguer ("bersama keluarga besar…") would start naming audiences.
 */
const SPEAKER_LABELS = ["pemateri", "pembicara", "narasumber", "penceramah", "ustadz/ustadzah", "bersama"];

/**
 * Honorifics and academic titles that mark a fragment as naming a PERSON.
 *
 * This list is the whole safety mechanism on the title path: a title segment is accepted only when
 * it carries one of these. Without that test, `TUJUH TANDA KEBODOHAN | KAJIAN MUSLIMAH` would name a
 * lecture series as a scholar. Matched as a whole word, case-insensitively, so `dr` does not fire
 * inside `Ahmadr`.
 */
const HONORIFICS = [
  "ustadz",
  "ustaz",
  "ustadzah",
  "ustazah",
  "syaikh",
  "syekh",
  "shaykh",
  "syeikh",
  "habib",
  "buya",
  "kyai",
  "kiai",
  "prof",
  "dr",
  "kh",
];

/** A name we would print. Anything outside this window is a paragraph or a fragment, not a name. */
const MIN_NAME = 4;
const MAX_NAME = 80;

export interface SpeakerFromMetadata {
  readonly name: string;
  /** Which field said so — printed in the run log so a person can see WHY someone was named. */
  readonly via: "description" | "title";
}

/**
 * The resolved speaker, carrying WHERE THE CLAIM COMES FROM.
 *
 * `roster` and `metadata` are both "we have a name". They are kept apart because they are different
 * claims with different people behind them, and because one of them may be spoken and the other may
 * not (see the module docblock).
 */
export type SpeakerOutcome =
  | { readonly kind: "roster"; readonly name: string; readonly credentials?: string }
  | { readonly kind: "metadata"; readonly name: string; readonly via: "description" | "title" }
  | { readonly kind: "none" };

function hasHonorific(s: string): boolean {
  const lower = s.toLowerCase();
  return HONORIFICS.some((h) => new RegExp(`(^|[^a-z])${h}([^a-z]|$)`, "i").test(lower));
}

/**
 * Reject anything that is not shaped like a name before it can reach a slide.
 *
 * A URL is the specific case worth naming: these descriptions are dense with them, and a line like
 * `👤 lihat di https://…` would otherwise print a link where a person goes.
 */
function looksLikeName(s: string): boolean {
  if (s.length < MIN_NAME || s.length > MAX_NAME) return false;
  if (/https?:|www\.|@|[<>]/i.test(s)) return false;
  if (/[\n\r\t]/.test(s)) return false;
  // A name does not end a sentence or ask a question.
  if (/[!?]/.test(s)) return false;
  return hasHonorific(s);
}

/**
 * Strip a leading glyph or label, then the punctuation that separated it from the name.
 *
 * Order matters: the glyph goes first because Darussalam writes `👤Ustadz …` with no space, so a
 * label test against the raw line would see `👤ustadz` and miss.
 */
function stripLead(line: string): string {
  let s = line.trim();
  if (s.startsWith(PERSON_GLYPH)) s = s.slice(PERSON_GLYPH.length).trim();
  const lower = s.toLowerCase();
  for (const label of SPEAKER_LABELS) {
    if (lower.startsWith(label)) {
      const rest = s.slice(label.length).replace(/^[\s:：\-–—.]+/, "").trim();
      // `bersama` with nothing after it is not a speaker line; only accept if a name follows.
      if (rest) return rest;
    }
  }
  return s;
}

/**
 * ALL-CAPS titles, normalised — the title path only, and it is the reason description is preferred.
 *
 * `USTADZ FULAN HAMID, L.C., M.A.` is how a title shouts; it is not how the person writes their
 * name. Dotted abbreviations are LEFT uppercase because lowercasing them would invent a house style
 * (`L.C.` → `L.c.` is what Darussalam actually writes, but we would be guessing that, and guessing
 * is the thing ADR 5 removed). So the title path can differ in casing from the person's own
 * spelling. That is a known, bounded inaccuracy and it is why `description` wins when both exist.
 */
function normaliseCaps(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s
    .split(/(\s+)/)
    .map((w) => {
      if (/^\s+$/.test(w)) return w;
      if (w.includes(".")) return w; // L.C., M.A. — an abbreviation, left as written
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Read a speaker out of a video's own description, then its title. Returns null when neither says.
 *
 * DESCRIPTION FIRST, because it is the field an uploader uses to state who spoke, and it carries
 * their own capitalisation. The title is a fallback and is normalised; see `normaliseCaps`.
 */
export function speakerFromMetadata(meta: {
  readonly title?: string;
  readonly description?: string;
}): SpeakerFromMetadata | null {
  for (const raw of (meta.description ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const glyphOrLabel =
      line.startsWith(PERSON_GLYPH) || SPEAKER_LABELS.some((l) => line.toLowerCase().startsWith(l));
    if (!glyphOrLabel) continue;
    const candidate = stripLead(line);
    if (looksLikeName(candidate)) return { name: candidate, via: "description" };
  }

  // Title fallback: only a segment AFTER a separator, and only if it carries an honorific. The
  // segment rule matters — without it `TUJUH TANDA KEBODOHAN | USTADZ …` would be taken whole.
  const title = meta.title ?? "";
  const segments = title.split(/[|–—]/).map((s) => s.trim());
  if (segments.length > 1) {
    for (const seg of segments.slice(1)) {
      const candidate = normaliseCaps(seg);
      if (looksLikeName(candidate)) return { name: candidate, via: "title" };
    }
  }
  return null;
}

/**
 * The one call a caller should make: roster first, uploader metadata second, silence third.
 *
 * NAMED `…WithProvenance` AND NOT `resolveSpeaker`, WHICH IS TAKEN. `kajian-roster.ts:112`
 * already exports a `resolveSpeaker`, and `kajian.ts:58` imports THAT one. A first cut of this
 * module exported the same identifier from a sibling file in the same directory, with a different
 * signature and a different return type — an import that compiles either way and means something
 * else depending on which line someone auto-completed. The roster function keeps the plain name
 * because it is the older caller-facing one; the distinguishing thing about this one is exactly
 * that it reports WHERE the name came from, so the name says so.
 *
 * ROSTER STILL WINS. Erik's ruling widened where a name may come from; it did not demote the list of
 * people we vouch for. A roster entry that matches is used even when the description disagrees,
 * because a person typed it and answers for it.
 */
export function resolveSpeakerWithProvenance(
  roster: { readonly kind: string; readonly match?: { readonly entry: { readonly name: string; readonly credentials?: string } } },
  meta: { readonly title?: string; readonly description?: string },
): SpeakerOutcome {
  if (roster.kind === "match" && roster.match) {
    const { name, credentials } = roster.match.entry;
    return credentials === undefined ? { kind: "roster", name } : { kind: "roster", name, credentials };
  }
  // `ambiguous` falls through to metadata deliberately: two roster entries matching means WE cannot
  // say which of our own people it was, which says nothing about whether the uploader named someone.
  const found = speakerFromMetadata(meta);
  return found === null ? { kind: "none" } : { kind: "metadata", name: found.name, via: found.via };
}
