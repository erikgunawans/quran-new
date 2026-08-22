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
 * Words marking a CITATION STRUCTURE — not religious vocabulary.
 *
 * THIS DISTINCTION WAS LEARNED FROM A REAL TRANSCRIPT, AFTER THE FIRST VERSION FAILED. That version
 * also listed `allah`, `nabi`, `rasulullah`, `imam`, `ustadz`, `syaikh`, `ulama`, `sunnah` and
 * `fatwa`. Measured against a 2h04m dakwah lecture (2,586 snippets): `nabi` fired on 96 spans,
 * `allah` on 74, `imam` on 21 — 191 hits out of 143 flagged spans, from three words that say
 * nothing about whether a citation was spoken. They are simply how this genre talks. The result was
 * a "scrub list" of 143 items for one lecture, which is not a list anybody reads.
 *
 * The words that carried real signal in the same transcript: `hadits` 11, `ayat` 6, `surat` 5,
 * `riwayat` 4, a narrator name 1, a grading term 1 — roughly two dozen spans, which is a scrub plan
 * a person actually completes.
 *
 * So the rule is: flag where a REFERENCE is being made, never where God or the Prophet is mentioned.
 * A lecture mentions them continuously; that is not a citation event.
 *
 * Bounded with `\b` on the LEFT only, and deliberately NOT right-bounded for stems that take
 * Indonesian affixes — `riwayat` also appears as `diriwayatkan`, and a right boundary misses every
 * one of those.
 *
 * `firman` stays despite firing zero times in that transcript: it introduces a quotation of divine
 * speech, which is a citation event by definition. Zero occurrences in ONE video is not evidence a
 * cue is wrong — only high-frequency noise is.
 */
const CITATION_CUES =
  /\b(?:surah|surat|ayat|juz|hadits?|hadis|riwayat|diriwayatkan|perawi|sanad|matan|h\.?\s?r\.?|bukhari|muslim|tirmidzi|tirmidhi|dawud|daud|nasa'?i|majah|baihaqi|thabrani|shahih|sahih|dha'?if|dhoif|mutawatir|firman)/i;

/**
 * Any Arabic-script character.
 *
 * ⚠ THIS NEVER FIRES ON AUTO-CAPTIONS, and the first version of this file claimed the opposite —
 * it called Arabic script "the thing auto-captions mangle worst". Measured: zero Arabic-script
 * characters in 80,113 characters of auto-captioned Indonesian. YouTube's ASR transliterates into
 * Latin (`bismillah`, not the Arabic), so on exactly the input this tool was built for, this
 * pattern is inert.
 *
 * Kept anyway, because it does fire on human-written captions — where an Arabic phrase typed by a
 * person is genuinely worth a glance. Documented rather than deleted so nobody reads it as coverage
 * of the auto-caption case, which is what the previous docblock invited.
 */
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
