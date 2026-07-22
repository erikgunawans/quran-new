/**
 * The demo's verse card — the one place the demo renders scripture.
 *
 * Extracted from demo.ts so it can be tested. demo.ts boots on import (it wires the DOM at module
 * scope), so as long as the card lived there, nothing about it could be asserted — including the
 * thing that matters most here: that a conditionally-approved verse never reaches a reader without
 * the context it was approved inside.
 *
 * TWO ENTRY POINTS, AND THE SPLIT IS THE POINT. `curatedCardHtml` takes the corpus verse WHOLE, so
 * its `passage` cannot be left behind — there is no argument to forget. `shardCardHtml` names, in
 * its own signature, that it is drawing an ayah loaded from a surah shard, which carries no
 * `passage` because shards hold no curation. Previously this was one function with an optional
 * sixth positional argument: dropping it at a call site type-checked clean and passed every test,
 * which is precisely the regression the co-display mechanism exists to prevent.
 */
import { esc } from "../src/esc.ts";
import { passageHtml, type PassageAyah } from "./passage.ts";

/** The shape both the curated corpus (Reading) and a shard verse (ShardVerse.p/.c) satisfy. */
export type ReadingLike = { text: string; translator: string; translation_type: string } | null;

/** A curated verse, as it comes off `corpus.json`. Passed whole so `passage` travels with it. */
export interface CuratedVerse {
  ref: string;
  surah_name: string;
  arabic: string;
  primary: ReadingLike;
  companion: ReadingLike;
  passage?: readonly PassageAyah[];
}

export function readingHtml(r: ReadingLike, primary: boolean): string {
  if (!r || !r.text.trim()) return "";
  const tag = r.translation_type === "literal" ? "Terjemahan Harfiah" : "Terjemahan Makna";
  return `<div class="qk-reading${primary ? " primary" : ""}">
    <span class="qk-reading-tag">${tag}</span>
    <div class="qk-reading-txt">${esc(r.text)}</div>
    <div class="qk-reading-by">oleh <b>${esc(r.translator)}</b></div>
  </div>`;
}

/**
 * A verse card in the Tanya thread.
 *
 * The literal Kemenag rendering is COLLAPSED behind a disclosure, exactly as the reader does it
 * (Erik, 2026-07-22 — the answer surface was showing both renderings stacked open while the reader
 * hid one, so the same verse looked like two different products depending on where you met it).
 *
 * Which one hides is not arbitrary. Terjemahan Makna — the tafsiriyah — is the reading this app
 * exists to put in front of people, so it stays visible; the literal translation is the comparison
 * you reach for, not the thing you are handed. Collapsing it also stops an answer becoming a wall
 * of two near-identical paragraphs, which is what made the Tanya result hard to read.
 *
 * The companion may be absent (some verses ship one voice); the disclosure is only emitted when
 * there is genuinely something behind it, so a chevron never opens onto nothing.
 *
 * The required passage is NOT behind that disclosure and never will be. The reviewer's condition is
 * "tampilkan bersama"; the collapsed companion is our editorial choice about a translation. One is
 * ours to make, the other is not.
 */
function card(
  ref: string,
  surahName: string,
  arabic: string,
  primary: ReadingLike,
  companion: ReadingLike,
  passage: readonly PassageAyah[] | undefined,
): string {
  const harf = companion ? readingHtml(companion, false) : "";
  return `<article class="qk-verse">
    <div class="qk-verse-head">
      <span class="qk-verse-ref">${esc(ref)}</span>
      <span class="qk-verse-surah">${esc(surahName)}</span>
      ${harf ? `<button class="qk-harf-btn" type="button" aria-expanded="false" aria-label="Tampilkan terjemahan harfiah">
        <span>Terjemahan Harfiah</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>` : ""}
    </div>
    ${passageHtml(ref, passage, "before")}
    <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(arabic)}</div>
    ${readingHtml(primary, true)}
    ${passageHtml(ref, passage, "after")}
    ${harf ? `<div class="qk-harf" hidden>${harf}</div>` : ""}
  </article>`;
}

/**
 * A curated verse from `corpus.json` — the lanes where the app OFFERS a verse as an answer.
 *
 * Takes the verse whole. A conditional approval travels with it, so there is no way to render one
 * of these and leave the required context behind.
 */
export const curatedCardHtml = (v: CuratedVerse): string =>
  card(v.ref, v.surah_name, v.arabic, v.primary, v.companion, v.passage);

/**
 * An ayah loaded from a surah shard — a direct `20:26` lookup, or an anchor on a reviewed answer.
 *
 * Shards are the plain mushaf: 6,236 ayahs, no curation, no `why`, and therefore no `passage`. The
 * app makes no claim here — the reader asked for that ayah by number and gets it, which is the same
 * act as opening a printed mushaf. The main reader draws direct lookups the same way
 * (`web/src/main.ts` `case "ayah"`).
 *
 * The parameter list is long on purpose. It is the seam where a curated verse could be smuggled in
 * field-by-field and lose its passage on the way, so it should be uncomfortable to reach for.
 */
export const shardCardHtml = (
  ref: string,
  surahName: string,
  arabic: string,
  primary: ReadingLike,
  companion: ReadingLike,
): string => card(ref, surahName, arabic, primary, companion, undefined);
