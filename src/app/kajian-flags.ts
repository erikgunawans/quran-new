/**
 * WHERE TO RE-LISTEN: the spans of a machine-made transcript a human must check against the video.
 *
 * WHY THIS IS A SEPARATE MODULE. It lives apart from `kajian.ts` so it can be red-tested without a
 * network call. `kajian.ts` is a CLI that runs on import; anything inline there is only reachable by
 * fetching a real video, which means the one piece of this pipeline that stops a wrong attribution
 * reaching a public post would be the one piece nothing could test. Same reason `answer-generation.ts`
 * was pulled out of the Worker's handler.
 *
 * WHY PATTERNS AND NOT A MODEL. Auto-generated Indonesian captions fail hardest on Arabic terms,
 * narrator names and surah/ayah numbers — exactly the tokens a model asked to rate its own
 * confidence would be worst at, and it would answer confidently either way. This does not judge
 * whether a citation is CORRECT. It cannot. It says only "a citation was spoken here, go listen",
 * which is a question a person answers in ten seconds and a model cannot answer at all.
 *
 * IT OVER-REPORTS ON PURPOSE. A false flag costs a few seconds of scrubbing. A missed one ships a
 * fabricated attribution to a named scholar, in public. The asymmetry is the whole design.
 *
 * ⚠ THE CUE LIST IS A FLOOR, NOT A CEILING, and it was written by us rather than harvested from
 * real transcripts. This repo has already paid for that distinction once: a guard whose every test
 * case was prose we wrote ourselves stayed open for two sessions because a verb nobody thought of
 * went unlisted. Widen this list from transcripts that actually came back, never from imagination,
 * and only ever widen it.
 */

export interface FlagSnippet {
  readonly text: string;
  /** Seconds from the start of the video. */
  readonly start: number;
}

export interface FlaggedSpan {
  /** `H:MM:SS`, or `M:SS` under an hour — a timestamp to scrub to, not a duration. */
  readonly at: string;
  readonly text: string;
  /** Which cue fired, in Indonesian — this string is shown to the person doing the checking. */
  readonly why: string;
}

/**
 * Words that mark a religious citation in Indonesian dakwah speech.
 *
 * Bounded with `\b` on the LEFT only via the alternation, and deliberately NOT right-bounded for the
 * stems that take Indonesian affixes. This repo's record: `\b`-bounded keywords under-fire on real
 * Indonesian because affixation is productive — `riwayat` also appears as `diriwayatkan`, and a
 * right boundary would miss every one of those.
 */
const CITATION_CUES =
  /\b(?:surah|surat|ayat|hadits?|hadis|riwayat|diriwayatkan|perawi|sanad|matan|h\.?\s?r\.?|bukhari|muslim|tirmidzi|tirmidhi|dawud|daud|nasa'?i|majah|ahmad|baihaqi|thabrani|shahih|sahih|dha'?if|dhoif|hasan|mutawatir|ijma'?|qiyas|ma[dz]hab|imam|syaikh|syekh|ustadz|ustadzah|ulama|fatwa|sunnah|nabi|rasulullah|allah\s+ta'?ala|firman)/i;

/** Any Arabic-script character. Auto-captions mangle these worst, or drop them entirely. */
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** A spoken surah/ayah reference: a citation word followed closely by a number. */
const NUMBERED_REFERENCE = /\b(?:surah|surat|ayat|juz|halaman|nomor|no\.?)\s*(?:ke-?\s*)?\d/i;

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/**
 * Every span carrying a cue, in transcript order.
 *
 * Returns `[]` for an empty transcript rather than throwing — a video with no captions is a real
 * state the caller already reports, and an exception here would turn it into a crash.
 */
export function flagSpans(snippets: readonly FlagSnippet[]): FlaggedSpan[] {
  const out: FlaggedSpan[] = [];
  for (const s of snippets) {
    const text = s.text.trim();
    if (!text) continue;
    const why: string[] = [];
    // Order matters only for readability of the reason string; a span can carry several.
    if (ARABIC.test(text)) why.push("teks Arab");
    if (NUMBERED_REFERENCE.test(text)) why.push("rujukan bernomor");
    else if (CITATION_CUES.test(text)) why.push("istilah/rujukan");
    if (why.length === 0) continue;
    out.push({ at: formatTimestamp(s.start), text, why: why.join(" + ") });
  }
  return out;
}
