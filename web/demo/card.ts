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
 * which is precisely the regression the co-display mechanism exists to prevent. The shared body
 * takes the object too — a positional seam one layer down is the same seam, just less visible.
 */
import { esc } from "../src/esc.ts";
// `ShardVerse` is imported for its FIELD NAMES (a/ar/p/c), which is what makes a curated `Verse`
// structurally unable to reach `shardCardHtml`. Type-only — no runtime coupling to quran.ts.
import type { ShardVerse } from "../src/quran.ts";
import { passageHtml, type PassageAyah } from "./passage.ts";

/**
 * The shape both the curated corpus (`Reading`) and a shard verse (`ShardVerse.p`/`.c`) satisfy.
 *
 * Deliberately WIDER than `retrieve.ts`'s `Reading`, and it must stay that way. `Reading` types
 * `translation_type` as the union `"literal" | "interpretive"`; `ShardVerse` widens it to `string`.
 * Importing `Reading` here looks like the tidier move — it is the same three fields — but it makes
 * every shard-backed call site a type error, because one card serves both sources. The widening is
 * the feature.
 */
export type ReadingLike = { text: string; translator: string; translation_type: string } | null;

/**
 * A curated verse, as it comes off `corpus.json`.
 *
 * Structural rather than `Pick<Verse, …>`, for the same reason as `ReadingLike`: `Verse.passage`
 * requires each context ayah to carry a full `Reading` AND a `companion`, while this card renders
 * only the neighbour's text (see `PassageAyah`). Picking from `Verse` would drag both constraints
 * in and reject the looser shape the demo genuinely uses.
 *
 * The tradeoff is real and worth naming: if the corpus grows a SECOND must-render field, this type
 * will not notice. That risk is carried by the co-display tests in `card.test.ts` and by the build
 * gate in `build-corpus.ts`, not by the type.
 */
export interface CuratedVerse {
  ref: string;
  surah: number;
  ayah: number;
  surah_name: string;
  arabic: string;
  primary: ReadingLike;
  companion: ReadingLike;
  passage?: readonly PassageAyah[];
}

export function readingHtml(r: ReadingLike, primary: boolean): string {
  if (!r || !r.text.trim()) return "";
  const tag = r.translation_type === "literal" ? "Terjemahan Kemenag" : "Terjemahan Makna";
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
export function curatedCardHtml(v: CuratedVerse): string {
  // `readingHtml` already returns "" for an absent or blank reading, so this doubles as the
  // "is there anything behind the chevron?" test — no separate null check needed.
  const harf = readingHtml(v.companion, false);
  return `<article class="qk-verse">
    <div class="qk-verse-head">
      <span class="qk-verse-ref">${esc(v.ref)}</span>
      <span class="qk-verse-surah">${esc(v.surah_name)}</span>
      ${harf ? `<button class="qk-harf-btn" type="button" aria-expanded="false" aria-label="Tampilkan terjemahan Kemenag">
        <!-- Erik, 2026-07-22: the disclosure must name what it opens. "Harfiah" alone is an
             adjective floating next to a chevron — the reader has to already know that the
             literal Kemenag rendering is the thing being hidden. Full noun phrase.
             MIRRORED in demo.ts ayahHtml, which emits this same button for the mushaf card.
             (No backticks in this comment — it lives inside a template literal.) -->
        <span>Terjemahan Kemenag</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>` : ""}
    </div>
    ${passageHtml(v.surah, v.ayah, v.passage, "before")}
    <div class="qk-verse-ar" dir="rtl" lang="ar">${esc(v.arabic)}</div>
    ${readingHtml(v.primary, true)}
    ${passageHtml(v.surah, v.ayah, v.passage, "after")}
    ${harf ? `<div class="qk-harf" hidden>${harf}</div>` : ""}
  </article>`;
}

/**
 * An ayah loaded from a surah shard — a direct `20:26` lookup, or an anchor on a reviewed answer.
 *
 * Shards are the plain mushaf: 6,236 ayahs, no curation, no `why`, and therefore no `passage`. The
 * app makes no claim here — the reader asked for that ayah by number and gets it, which is the same
 * act as opening a printed mushaf. The main reader draws direct lookups the same way
 * (`web/src/main.ts` `case "ayah"`).
 *
 * TAKES THE SHARD VERSE ITSELF, AND THAT IS THE ENFORCEMENT. This used to take six loose
 * primitives, which meant any caller holding a CURATED verse could spread its fields in
 * (`v.surah, v.ayah, v.surah_name, v.arabic, v.primary, v.companion`) and render a reviewed verse
 * bare — the passage silently gone. Exactly the regression the two-entry-point split exists to
 * stop, one seam further out, and a comment saying "this should feel uncomfortable to reach for"
 * is not enforcement. `ShardVerse` names its fields `a`/`ar`/`p`/`c`, so a `Verse` cannot satisfy
 * it structurally: the downgrade is now a type error, not a discipline.
 *
 * `passage` is OMITTED from the constructed verse rather than passed as `undefined` — under
 * `exactOptionalPropertyTypes` those are different things, and omission is the honest one: this
 * verse has no curation to carry, rather than curation that happens to be absent.
 */
export const shardCardHtml = (surah: number, surahName: string, v: ShardVerse): string =>
  curatedCardHtml({
    ref: `${surah}:${v.a}`,
    surah,
    ayah: v.a,
    surah_name: surahName,
    arabic: v.ar,
    primary: v.p,
    companion: v.c,
  });
