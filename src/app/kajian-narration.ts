/**
 * THE SPOKEN FRAME — step 5 of the kajian tool, and the half of ADR 6 that can be unit-tested.
 *
 * Pure by construction: no network, no binaries, no clock. It turns a briefing that already exists
 * into a SCRIPT and into TTS-sized chunks. `kajian-audio.ts` holds everything that talks to Google
 * or to ffmpeg, exactly as `kajian-render.ts` holds step 4's binaries.
 *
 * ── WHY AUDIO IS TREATED MORE STRICTLY THAN THE SLIDE ────────────────────────────────────────
 *
 * ADR 6 states the hazard precisely: "Text is visibly written *about* someone; audio is heard as
 * spoken *by* someone." A slide can carry a labelled quotation — the label is visible beside it,
 * for as long as the reader looks. A narrator has no margin, no caption and no second glance: by
 * the time a listener has heard a sentence, they have already decided whose sentence it was.
 *
 * Three consequences, and each one is a REFUSAL rather than a rewrite:
 *
 *   · THE ATTRIBUTION IS SPOKEN FIRST. Not in a description, not at the end. ADR 6: "An audio
 *     frame only works if it is heard first." Nothing precedes it, including the draft warning.
 *
 *   · DIRECT QUOTATIONS ARE DROPPED, NOT READ. The slide drops quote-bearing bullets already; in
 *     audio the same sentence is strictly worse, because a narrator reading the speaker's own words
 *     IS the impersonation ADR 6 exists to prevent. Same predicate, imported from `kajian-slide.ts`
 *     so the two surfaces cannot drift apart — this repo has paid for a duplicated gate before.
 *
 *   · NO UPLOADER-WRITTEN STRING IS READ DIRECTLY INTO THE SCRIPT — not `meta.title`, not
 *     `meta.channel`. Step 4 kept the video title out of the identity slot and put it in a
 *     labelled source block; there is no audible equivalent of that label that survives an
 *     autoplaying feed, so the title is never spoken and the channel is spoken only from the
 *     `organisations:` allowlist a person maintains by hand.
 *
 *     THE CHANNEL WAS THE HOLE, and it was the only path that runs today. The first cut screened
 *     the title and passed `meta.channel` verbatim into the attribution sentence, on the reasoning
 *     that a channel is provenance rather than identity — which is true of "Masjid Darussalam Kota
 *     Wisata" and false of half of Indonesian dakwah YouTube, where the channel IS a person and a
 *     gelar. `roster.yaml` ships EMPTY on purpose, so every narration produced today takes the
 *     unrostered branch: that was not the edge case, it was the only case. Worse, the test that
 *     was supposed to catch it asserted `not.toContain("Syariful")` against a MOSQUE fixture and
 *     could never have failed.
 *
 *     ⚠ THE HONEST SCOPE OF THE CLAIM, at its fourth attempt — the three before it each asserted a
 *     guarantee wider than the code, and each was falsified by a probe rather than by a test.
 *     State it as a mechanism, not as a promise:
 *
 *       — the module never ADDS a name, and never reads one out of `meta.title` or `meta.channel`;
 *       — the BODY is the model's prose, and the model is told not to name the speaker;
 *       — a name the model relayed ANYWAY is screened by title-token overlap and by dotted
 *         post-nominal gelar, and NEITHER SCREEN IS COMPLETE.
 *
 *     The last line is the one that matters. "Penceramah, Syariful Mahya, menjelaskan tiga
 *     perkara" passes both screens — two of five title tokens is under the overlap threshold, and
 *     there is no gelar in it — and is spoken. That is a known, OPEN HOLE: the classical-author
 *     citations the body must keep are the same shape as the speaker name it must drop, and
 *     nothing in this file can tell them apart. The roster is what closes it, one video at a time.
 *
 *     ⚠ RECORDED HERE AND IN `PROGRESS.md` (2026-08-22 evening), and nowhere else. An earlier
 *     draft of this paragraph claimed the handoff before the handoff said anything — a claim about
 *     what has been recorded is a claim like any other, and asserting a record that does not exist
 *     is worse than the hole, because the next reader stops looking. It is deliberately NOT pinned
 *     by a passing test: this repo does not close a known gap with something green.
 *
 * ── ONE THING THE NARRATOR IS NOT SCREENED FOR, RECORDED SO ITS ABSENCE IS NOT READ AS A RULING ─
 *
 * (This names one known gap. It is not a complete inventory of what these screens miss — the
 * partial ones are described where they live: `echoesTitle`'s overlap threshold, and the dotted-
 * only credential pattern in `kajian-slide.ts`.)
 *
 * `speakableFrom` drops quotations, unclear references, title echoes and dotted gelar. It does NOT
 * screen CONSENSUS CLAIMS — "para ulama sepakat…", "tidak ada khilaf…" — and `kajian-flags.ts`
 * deliberately does not flag them either; `kajian-flags.test.ts` pins that as intended behaviour.
 *
 * That was a defensible call for a WRITTEN briefing sitting under a labelled disclaimer. This file
 * turns the same sentences into our narrator's voice, where ADR 6's own argument applies: text is
 * visibly written about someone, audio is heard as spoken by someone. Nothing here introduced the
 * gap and nothing here closes it — adding a consensus screen is a policy change, not a bug fix,
 * and it is Erik's to make. It is written down so the next reader does not mistake silence for a
 * decision.
 *
 * ⚠ Like the relayed-name hole above, this is recorded HERE and in `PROGRESS.md` (2026-08-22
 * evening). A decision that is Erik's to make, living only in a source comment, is one he never
 * gets asked — which is why it goes in the handoff in the same commit that ships the code.
 *
 * ── THE CHUNKING INVARIANT, WHICH IS THE POINT OF THE WHOLE FILE ─────────────────────────────
 *
 * ADR 6: "Chunking that splits mid-sentence, or drops a chunk, produces a file that plays cleanly
 * and is missing content — a failure with no error and no obvious symptom." A dropped chunk does
 * not throw, does not warn and does not sound wrong; it just quietly is not there.
 *
 * So `chunkForTts` does not merely try to be careful. It guarantees, and `assertChunksCoverText`
 * checks, that `chunks.join(" ")` is BYTE-IDENTICAL to the normalized script. Not "roughly the same
 * length", not "the sum is close" — identical. Anything less can be satisfied by a chunker that
 * lost a sentence and gained a longer one somewhere else.
 */

import {
  DENIALS,
  carriesCredential,
  carriesQuotation,
  hasUnclearReference,
  isCheckListHeading,
  stripInlineMarkdown,
} from "./kajian-slide.ts";
import type { RosterOutcome } from "./kajian-roster.ts";

/**
 * The narrator. Chosen by Erik on 2026-08-22 from eight rendered samples and recorded in ADR 6 as
 * LOAD-BEARING: viewers learn the voice as this channel's narrator rather than as whoever appears
 * on screen, which is the inference the spoken attribution exists to close. Changing it re-opens
 * that inference, so it is a constant here and a `--voice` flag is deliberately NOT offered.
 */
export const NARRATION_VOICE = "id-ID-Chirp3-HD-Schedar";
export const NARRATION_LANGUAGE_CODE = "id-ID";

/**
 * Google's hard cap on `input.text`, in UTF-8 BYTES — MEASURED against the live API on 2026-08-22,
 * not read off a docs page: 4,500 characters synthesized, 5,200 returned
 * "longer than the limit of 5000 bytes". Bytes, not characters, is what the API counts.
 */
export const TTS_HARD_LIMIT_BYTES = 5000;

/**
 * What we actually pack to. Headroom is deliberate — the cap is on the encoded request field and a
 * chunk that lands one byte over fails the whole run, whereas a smaller chunk costs only one more
 * HTTP round trip. At ~15.8 characters per second of Indonesian speech (measured from the same
 * probe: 4,500 characters returned 285 seconds of audio) this is a little over three minutes a
 * request.
 */
export const DEFAULT_CHUNK_BYTES = 3000;

export { carriesCredential } from "./kajian-slide.ts";

/** Re-exported so callers have one import site; the string itself lives with the other shared
 * refusals in `kajian-slide.ts`, because the SLIDE has to say it too. */
export { DENIALS as NARRATION_DENIALS } from "./kajian-slide.ts";

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

// ── the frame ──────────────────────────────────────────────────────────────────────────────────

export type NarrationKind = "short" | "long";

export interface NarrationInput {
  /** The model's briefing, exactly as written. Never the assembled `briefing.md` file. */
  readonly briefing: string;
  /** Who the ROSTER says spoke — the only source of a name this module will read. */
  readonly speaker: RosterOutcome;
  /** The publishing channel. Source metadata, the same way the slide's source block treats it. */
  readonly channel: string;
  /** YouTube's title. Used ONLY as a screen — to find and remove echoes of it. Never spoken. */
  readonly title: string;
  /** Built from auto-captions with unchecked spans: ADR 5's draft gate applies to audio too. */
  readonly isDraft: boolean;
  /** `short` narrates the slide's bullets; `long` narrates the whole briefing. */
  readonly kind: NarrationKind;
  /** Channel names a person has allowlisted as organisations. Empty means no channel is spoken. */
  readonly organisations?: readonly string[];
  /** For `short` only: the very bullets the slide is showing, already extracted and screened. */
  readonly bullets?: readonly string[];
}

export type LineDropReason =
  | "carries-a-quote"
  | "unclear-reference"
  | "echoes-the-title"
  | "carries-a-credential";

export interface DroppedLine {
  readonly reason: LineDropReason;
  readonly text: string;
}

export interface NarrationScript {
  /** Spoken first. Always. */
  readonly opening: string;
  /** Spoken second, only when the briefing is a draft. */
  readonly draftWarning: string;
  readonly body: string;
  readonly closing: string;
  /** Everything, in speaking order, whitespace-normalized. This is what gets chunked. */
  readonly full: string;
  /** Every line the screens refused, with the reason. Printed by the CLI, never swallowed. */
  readonly dropped: readonly DroppedLine[];
}

/**
 * ── WHY THIS IS AN ALLOWLIST AND NOT A CLEVERER PATTERN ──────────────────────────────────────
 *
 * The channel was screened first by a honorific-and-gelar pattern: `ustadz`, `syaikh`, `habib`,
 * `Lc.`, `M.A.` and so on. Run against real Indonesian dakwah channels it caught `Buya Yahya` and
 * `Gus Baha` — and passed `Firanda Andirja`, `Hanan Attaki`, `Felix Siauw`, `Khalid Basalamah
 * Official`, `Adi Hidayat Official`, `Oemar Mita`, `Erwandi Tarmizi`. The dominant naming
 * convention is a BARE PERSONAL NAME, which carries no screenable token at all — so the pattern
 * caught the minority shape of the hazard and looked like coverage while doing it.
 *
 * No list can fix that: there is nothing in "Firanda Andirja" to match on. Any predicate over a
 * channel string is a GUESS about whether it names a person, and ADR 5 already ruled that out —
 * "Omission is the fallback; guessing is not available."
 *
 * So it is inverted. A channel is spoken only when a person has written it into `organisations:`
 * in `roster.yaml`, exactly as a speaker is named only from `speakers:`. Same accountability, same
 * default. The roster ships empty, so today NO channel is spoken at all — and the source still
 * reaches the listener by the three routes that carry a label: the QR, the slide's source block,
 * and the m4a `description` tag.
 */
/** "Tidak …" → "tidak …", so the shared denial string reads as a clause mid-sentence. */
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function channelMayBeSpoken(channel: string, organisations: readonly string[]): boolean {
  const c = channel.trim().toLowerCase();
  if (!c) return false;
  return organisations.some((o) => o.trim().toLowerCase() === c);
}

/**
 * The opening line. ADR 6: "an opening line naming the source as an automatic summary of a named
 * scholar's lecture, not a quotation."
 *
 * A rostered speaker is named because a person typed that name and stands behind it. An unrostered
 * one is not named AT ALL, and that now includes the CHANNEL unless a person has
 * allowlisted it as an organisation — see `channelMayBeSpoken` above. `none` and `ambiguous` are
 * handled identically for the same reason they are on the slide: two matching entries are exactly
 * as unsafe as zero.
 *
 * ⚠ EVERY DENIAL THE ARTIFACT MAKES IS MADE HERE, not at the end. ADR 6: "An audio frame only works
 * if it is heard first." The first cut put "belum diperiksa ulama" in the CLOSING only — so a
 * listener who scrolled at eight seconds heard a scholar's name and confident briefing content and
 * never heard that nobody had checked it. Of the whole script that is the one sentence whose
 * absence lets someone conclude review happened. "Bukan fatwa" is here for the same reason: it is
 * on every written surface and was on no spoken one, and a narrated fiqh lecture is where it works
 * hardest. The closing repeats them; repetition is the cheap half of this.
 */
export function openingLine(
  speaker: RosterOutcome,
  channel: string,
  organisations: readonly string[] = [],
): string {
  const disclaim = `Suara ini bukan suara penceramahnya. Isinya ${lowerFirst(DENIALS)}`;
  if (speaker.kind === "match") {
    const { name, credentials } = speaker.match.entry;
    const who = credentials?.trim() ? `${name}, ${credentials.trim()}` : name;
    // `M.A.` already ends the sentence. Appending a second full stop produced "M.A.." — harmless in
    // print, and this string is not for print: it is handed to a synthesizer that decides pausing
    // and intonation from punctuation.
    const stop = /[.!?]$/.test(who) ? "" : ".";
    return `Ini ringkasan otomatis dari kajian oleh ${who}${stop} Suara ini bukan suara beliau. ` +
      `Isinya ${lowerFirst(DENIALS)}`;
  }
  const where = channel.trim();
  return where && channelMayBeSpoken(where, organisations)
    ? `Ini ringkasan otomatis dari sebuah kajian di kanal ${where}. ${disclaim}`
    : `Ini ringkasan otomatis dari sebuah kajian. ${disclaim}`;
}

/**
 * Spoken when the briefing came from unchecked auto-captions.
 *
 * ADR 5's draft gate says a draft is not postable. A file, unlike a slide, has no visible band to
 * carry that — so it says so out loud. An audio file that escapes a review folder should announce
 * what it is in the first five seconds.
 */
export const DRAFT_WARNING =
  "Catatan: ringkasan ini masih draf. Transkripnya dibuat otomatis dan belum diperiksa, " +
  "jadi rujukan di dalamnya belum bisa dipakai.";

/**
 * The closing. Both artifacts point back at the source, per ADR 6 — but by different means, because
 * only one of them has a screen. Neither speaks the URL: a narrator reading
 * "h-t-t-p-s titik dua garis miring" is not a link anybody follows.
 *
 * ⚠ THE LONG FORM'S SENTENCE IS A PROMISE THE FILE HAS TO KEEP. It first read "ada bersama berkas
 * ringkasan ini" — true of the output DIRECTORY and false of the file, which is the one thing that
 * gets shared. ADR 6 threw out exactly this kind of nominal compliance for the slide ("a link in an
 * image is not clickable… so that rule bought nothing"). `encodeM4a` now writes the URL into the
 * file's metadata, so the sentence describes a mechanism that exists. If that tag is ever dropped,
 * THIS SENTENCE MUST CHANGE WITH IT — under-attributing is an acceptable error, a false promise
 * about provenance is not.
 */
export function closingLine(kind: NarrationKind): string {
  const tail = "Ringkasan ini belum diperiksa ulama, dan tidak menggantikan kajian aslinya.";
  return kind === "short"
    ? `${tail} Pindai kode di layar untuk menonton sumbernya.`
    : `${tail} Tautan ke video sumbernya ada di deskripsi file audio ini.`;
}

// ── the screens ────────────────────────────────────────────────────────────────────────────────

/** Words worth matching a title on. Short and punctuation-only tokens match everything. */
function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 4);
}

/**
 * Does this line reproduce the video's title?
 *
 * The model is told not to name the speaker, and on the briefings seen so far it obeys — its H1 came
 * back as "BRIEFING DOKUMEN: 15 INDIKASI KEBODOHAN" from a title reading
 * "15 INDIKASI KEBODOHAN | USTADZ SYARIFUL MAHYA, L.C., M.A." But "so far" is not a property, and
 * the H1 is the one line in a briefing that is expected to echo the title. So it is screened rather
 * than trusted, on token overlap: a line carrying most of the title's substantial words is the
 * title, however it was punctuated.
 */
export function echoesTitle(line: string, title: string): boolean {
  const want = titleTokens(title);
  if (want.length < 2) return false;
  const have = new Set(titleTokens(line));
  const hit = want.filter((t) => have.has(t)).length;
  return hit / want.length >= 0.6;
}

// ── briefing → speakable prose ─────────────────────────────────────────────────────────────────

const HEADING_LINE = /^\s{0,3}#{1,6}\s+(.*)$/;
const BULLET_LINE = /^\s{0,3}(?:[-*+]|\d{1,2}[.)])\s+(.*)$/;
const TABLE_ROW = /^\s{0,3}\|/;
const RULE_LINE = /^\s{0,3}(?:[-*_]\s?){3,}$/;
const BLOCKQUOTE = /^\s{0,3}>/;
const FENCE = /^\s{0,3}(?:```|~~~)/;

/** Terminal punctuation, so the chunker's sentence splitter has boundaries to find. */
function asSentence(s: string): string {
  return /[.!?…:]$/.test(s) ? s : `${s}.`;
}

export interface SpeakableResult {
  readonly text: string;
  readonly dropped: readonly DroppedLine[];
}

/**
 * The briefing, as prose a narrator can read.
 *
 * REMOVAL ONLY. Nothing here rewrites a sentence, joins two claims, or supplies a word the model did
 * not write — the standing rule of this whole tool is that permission to display is not permission
 * to correct, and a narrator "smoothing" a garbled hadith attribution is that rule's worst case.
 * The only additions are a full stop at the end of a heading or a bullet, so the chunker can find a
 * sentence boundary there.
 *
 * What it refuses, and why each is a refusal rather than a formatting problem:
 *   · blockquotes — the briefing keeps DIRECT QUOTATIONS there, and a narrator reading them is the
 *     impersonation ADR 6 exists to prevent. Also where its own disclaimers live.
 *   · tables — read aloud, a markdown table is not language.
 *   · a line carrying a quotation, an unclear reference, a title echo, or a post-nominal gelar.
 *   · everything at and after the check-list heading, exactly as the slide stops there.
 */
export function speakableFrom(briefing: string, title: string): SpeakableResult {
  const out: string[] = [];
  const dropped: DroppedLine[] = [];
  let inFence = false;

  for (const raw of briefing.split("\n")) {
    const line = raw.trimEnd();
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (isCheckListHeading(line.trim())) break;
    if (!line.trim()) continue;
    if (BLOCKQUOTE.test(line) || TABLE_ROW.test(line) || RULE_LINE.test(line)) continue;

    const heading = HEADING_LINE.exec(line);
    const bullet = heading ? null : BULLET_LINE.exec(line);
    const body = heading?.[1] ?? bullet?.[1] ?? line;

    const text = stripInlineMarkdown(body);
    if (!text) continue;

    if (hasUnclearReference(text)) {
      dropped.push({ reason: "unclear-reference", text });
      continue;
    }
    if (carriesQuotation(text)) {
      dropped.push({ reason: "carries-a-quote", text });
      continue;
    }
    if (echoesTitle(text, title)) {
      dropped.push({ reason: "echoes-the-title", text });
      continue;
    }
    if (carriesCredential(text)) {
      dropped.push({ reason: "carries-a-credential", text });
      continue;
    }
    out.push(asSentence(text));
  }

  return { text: out.join(" ").replace(/\s+/g, " ").trim(), dropped };
}

/**
 * The full script, in speaking order.
 *
 * `short` narrates THE BULLETS THE SLIDE IS SHOWING — the same array, not a re-extraction — so the
 * voice and the picture cannot disagree about what the lecture said. `long` narrates the briefing.
 */
export function buildNarrationScript(input: NarrationInput): NarrationScript {
  const opening = openingLine(input.speaker, input.channel, input.organisations ?? []);
  const draftWarning = input.isDraft ? DRAFT_WARNING : "";
  const closing = closingLine(input.kind);

  let body = "";
  let dropped: readonly DroppedLine[] = [];
  if (input.kind === "short") {
    /**
     * A short script with no bullets is not a short script — it is the frame narrating itself, and
     * it would produce a perfectly listenable fifteen seconds that says nothing about the lecture.
     * This repo has shipped that exact shape once already, when a scope preference emptied the
     * slide and rendered "Ringkasan tidak tersedia" above forty perfectly good bullets. Refused
     * here rather than discovered in a published video.
     */
    if (!input.bullets?.length) {
      throw new Error("buildNarrationScript: a `short` narration needs the slide's bullets, and got none");
    }
    /**
     * ⚠ THE SHORT PATH RUNS THE SCREENS TOO, AND THE FIRST CUT DID NOT.
     *
     * The bullets arrive filtered by `collect()` in `kajian-slide.ts` — which at first applied only
     * `hasUnclearReference` and `carriesQuotation`, so a bullet reading "Ustadz Fulan, Lc.
     * menjelaskan…" was refused in the long-form audio and SPOKEN in the short video, the
     * autoplaying one ADR 6 calls the worst case. `carriesCredential` has since moved onto the
     * slide path too, so in the CLI those bullets are already gone before they reach here.
     *
     * THIS PASS STAYS ANYWAY, AND IT RUNS ALL FOUR SCREENS. `buildNarrationScript` is callable with
     * any bullets and the two paths are free to diverge again. The first version of this pass ran
     * only the two the slide lacked — which made it correct about QUOTATIONS purely because its
     * caller happened to screen them first, the precise dependency this paragraph rejects. In audio
     * that is the worst one to get wrong: a narrator reading the speaker's own words is what ADR 6
     * exists to prevent.
     *
     * Every refusal here is PRINTED by the CLI: a silent divergence between the picture and the
     * voice is exactly the shape the slide path already refuses to ship. And ADR 5 is NOT open on
     * the picture either — "no name, no face, no credentials" is its wording.
     *
     * What remains genuinely open, and is Erik's to rule on, is the slide's SOURCE BLOCK — and it
     * is TWO uploader-written strings there, not one: the video title, which carries a label, and
     * the CHANNEL, which carries none. This round established that a bare-name channel is a person
     * as often as not, so the channel belongs in that ruling beside the title.
     */
    const kept: string[] = [];
    const refused: DroppedLine[] = [];
    for (const b of input.bullets) {
      const text = stripInlineMarkdown(b);
      if (!text) continue;
      // ALL FOUR, in the same order the long path applies them. The first cut ran only the two the
      // slide does not — and was therefore correct about quotations solely because `collect()`
      // happens to screen them first, which is the exact dependency the paragraph above rejects.
      // `LineDropReason` declares all four; a path that can never emit two of them is a gap, not a
      // shorter list.
      if (hasUnclearReference(text)) {
        refused.push({ reason: "unclear-reference", text });
        continue;
      }
      if (carriesQuotation(text)) {
        refused.push({ reason: "carries-a-quote", text });
        continue;
      }
      if (echoesTitle(text, input.title)) {
        refused.push({ reason: "echoes-the-title", text });
        continue;
      }
      if (carriesCredential(text)) {
        refused.push({ reason: "carries-a-credential", text });
        continue;
      }
      kept.push(asSentence(text));
    }
    if (!kept.length) {
      throw new Error(
        `buildNarrationScript: every one of the ${input.bullets.length} slide bullet(s) was refused ` +
          `by the narrator's screens — there is nothing to speak over the slide`,
      );
    }
    dropped = refused;
    body = kept.join(" ");
  } else {
    const spoken = speakableFrom(input.briefing, input.title);
    /**
     * THE SAME HOLE AS THE EMPTY SHORT SCRIPT, ONE FILE FURTHER ALONG. A briefing whose every line
     * carried a quotation — a Q&A transcript, say — refuses down to nothing, and the frame would
     * narrate itself: fifteen impeccable seconds announcing a summary that is not there. Found by
     * running the pipeline on a 19-second video where five of its lines were refused; with a couple
     * more it would have shipped.
     */
    if (!spoken.text.trim()) {
      throw new Error(
        `buildNarrationScript: nothing in the briefing survived the narrator's screens ` +
          `(${spoken.dropped.length} line(s) refused) — there is no summary to speak`,
      );
    }
    body = spoken.text;
    dropped = spoken.dropped;
  }

  const full = [opening, draftWarning, body, closing]
    .filter((p) => p.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return { opening, draftWarning, body, closing, full, dropped };
}

// ── chunking ───────────────────────────────────────────────────────────────────────────────────

export type SplitLevel = "sentence" | "clause" | "word";

export interface ChunkResult {
  readonly chunks: readonly string[];
  /** The coarsest split that was needed. `word` means a single clause exceeded the cap on its own. */
  readonly deepestSplit: SplitLevel;
}

/** Collapse to single spaces. Every reconstruction below joins with exactly one space. */
export function normalizeForSpeech(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Split on a separator that is a single space, keeping the pieces joinable back to the original.
 * Every splitter here obeys the same contract: `pieces.join(" ") === input`.
 */
function splitKeeping(input: string, boundary: RegExp): string[] {
  const words = input.split(" ");
  const pieces: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (boundary.test(w)) {
      pieces.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) pieces.push(cur.join(" "));
  return pieces;
}

const SENTENCE_END = /[.!?…]["”’)]?$/;
const CLAUSE_END = /[,;:—–]["”’)]?$/;

function packInto(pieces: readonly string[], maxBytes: number): string[] | null {
  const chunks: string[] = [];
  let cur = "";
  for (const p of pieces) {
    if (byteLength(p) > maxBytes) return null;
    const next = cur ? `${cur} ${p}` : p;
    if (byteLength(next) <= maxBytes) {
      cur = next;
      continue;
    }
    if (cur) chunks.push(cur);
    cur = p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/**
 * Cut `text` into pieces each within `maxBytes`, at the coarsest boundary that fits.
 *
 * Sentence first, then clause, then — only if one clause is itself over the cap — word. A mid-word
 * cut is never produced: it would hand the synthesizer half a word and get back a mispronunciation
 * that sounds deliberate.
 *
 * THROWS rather than truncating. Every caller of this is about to spend money and produce a file
 * that plays cleanly whatever it contains, so the one thing this must never do is return something
 * shorter than what it was given.
 */
export function chunkForTts(text: string, maxBytes: number = DEFAULT_CHUNK_BYTES): ChunkResult {
  if (maxBytes > TTS_HARD_LIMIT_BYTES) {
    throw new Error(
      `chunkForTts: maxBytes ${maxBytes} exceeds the API's measured hard limit of ${TTS_HARD_LIMIT_BYTES} bytes`,
    );
  }
  const normalized = normalizeForSpeech(text);
  if (!normalized) return { chunks: [], deepestSplit: "sentence" };

  const levels: readonly { level: SplitLevel; pieces: string[] }[] = [
    { level: "sentence", pieces: splitKeeping(normalized, SENTENCE_END) },
    { level: "clause", pieces: splitKeeping(normalized, CLAUSE_END) },
    { level: "word", pieces: normalized.split(" ") },
  ];

  for (const { level, pieces } of levels) {
    const packed = packInto(pieces, maxBytes);
    if (packed) {
      assertChunksCoverText(packed, normalized);
      return { chunks: packed, deepestSplit: level };
    }
  }

  const worst = normalized.split(" ").reduce((a, b) => (byteLength(b) > byteLength(a) ? b : a), "");
  throw new Error(
    `chunkForTts: a single word is ${byteLength(worst)} bytes, over the ${maxBytes}-byte chunk cap: "${worst.slice(0, 60)}"`,
  );
}

/**
 * The assertion ADR 6 asks for, and the reason this module exists.
 *
 * NOT a length comparison. A chunker that lost one sentence and duplicated another passes any
 * length check that is not exact, and the resulting audio plays perfectly. So the check is byte
 * identity of the rejoined chunks against the script, and the error names the first divergence so a
 * failure is debuggable rather than merely loud.
 */
export function assertChunksCoverText(chunks: readonly string[], text: string): void {
  const rejoined = chunks.join(" ");
  const expected = normalizeForSpeech(text);
  if (rejoined === expected) return;

  let i = 0;
  while (i < rejoined.length && i < expected.length && rejoined[i] === expected[i]) i += 1;
  throw new Error(
    `narration chunks do not reconstruct the script — ${chunks.length} chunks, ` +
      `${rejoined.length} chars rejoined vs ${expected.length} expected.\n` +
      `  first divergence at char ${i}:\n` +
      `    expected …${expected.slice(Math.max(0, i - 40), i + 40)}…\n` +
      `    rejoined …${rejoined.slice(Math.max(0, i - 40), i + 40)}…`,
  );
}

/**
 * How long this script should take to say, in seconds.
 *
 * MEASURED, not assumed: the live probe returned 285 seconds of 24 kHz audio for 4,500 characters
 * of Indonesian, which is 15.8 characters per second. Used only as a FLOOR against silent
 * truncation — a chunk whose audio is far shorter than its text was cut off — so it is deliberately
 * generous. It is not a promise about pacing.
 */
export const CHARS_PER_SECOND = 15.8;

export function expectedSeconds(text: string): number {
  return normalizeForSpeech(text).length / CHARS_PER_SECOND;
}
