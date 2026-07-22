/**
 * The Beranda's "Topik Al-Qur'an Hari Ini" slot — one ayah, alone, in its own markup.
 *
 * Extracted from demo.ts for the same reason card.ts was: demo.ts wires the DOM at module scope,
 * so nothing inside it can be imported by a test. That mattered here more than anywhere else. This
 * is the FIFTH place the demo renders a curated verse, it is the only one that does NOT go through
 * `curatedCardHtml`, and its markup has no way to show a passage at all — so the whole co-display
 * invariant on the home screen rested on a single unguarded line. Deleting that line left all 20
 * tests green while putting a conditionally-approved verse bare on the first screen anyone opens.
 *
 * Now the rule is a named function with tests, and the markup that cannot render a passage sits
 * next to the rule that keeps passages away from it.
 */
import { esc } from "../src/esc.ts";
import type { CuratedVerse } from "./card.ts";

/**
 * A verse that carries no reviewer condition, and therefore may be shown on its own.
 *
 * `passage?: never` is the point: handing a conditionally-approved verse to a renderer that takes
 * this type is a COMPILE error, not a silent drop. The eligibility rule below is the only way to
 * obtain one, so the check cannot be bypassed by a caller who simply forgets it exists.
 */
export type StandaloneVerse = Omit<CuratedVerse, "passage"> & { passage?: never };

/**
 * The verse to show today, or null if there is nothing eligible.
 *
 * ELIGIBILITY IS A PROPERTY OF THE SLOT, NOT OF THE PICKS. This card shows one ayah with no
 * neighbours, by design, so a verse a reviewer approved only inside a passage can never be shown
 * here — not as the preferred pick, and not through the positional fallback. That last part is the
 * one that bites: `verses[0]` is whatever the builder happens to emit first, so filtering the
 * CANDIDATE POOL is the only version of this that stays true across a corpus rebuild. Checking the
 * two named refs alone would pass today and fail silently the day the corpus order changes.
 *
 * Disqualifies on the FIELD'S PRESENCE, not on its length. `!v.passage?.length` treated
 * `passage: []` as an ordinary standalone verse — a verse marked as conditional would have
 * rendered bare. The builder cannot currently emit an empty range (`buildPassage` fails on an
 * inverted range and on one that omits its subject), but the demo casts fetched JSON straight to
 * `Corpus` without validating it, so "the builder wouldn't do that" is not a guarantee this
 * function gets to rely on. A verse that carries the field at all is conditional.
 */
export function todayPick(verses: readonly CuratedVerse[]): StandaloneVerse | null {
  const eligible = verses.filter((v): v is StandaloneVerse => v.passage === undefined);
  // A verse of consolation, present in the curated corpus (falls back to the first if absent).
  return (
    eligible.find((v) => v.ref === "94:6") ??
    eligible.find((v) => v.ref === "2:286") ??
    eligible[0] ??
    null
  );
}

/**
 * The slot's markup. Deliberately NOT the verse card: this is a Beranda teaser, one ayah and one
 * line of meaning, with a link into Tanya. It emits no passage markup and never will.
 *
 * Takes `StandaloneVerse`, so that last sentence is enforced rather than promised. When this took
 * `CuratedVerse` it would accept a conditionally-approved verse and quietly render it without its
 * context — the invariant held only because the single caller happened to run `todayPick` first.
 * The rule now lives at the rendering boundary too, where a second caller cannot miss it.
 */
export function todayCardHtml(v: StandaloneVerse): string {
  const tr = v.primary?.text ?? v.companion?.text ?? "";
  const ayah = v.ref.split(":")[1] ?? v.ref;
  return `
    <div class="qk-today-head">
      <h3 class="qk-today-topic">${esc(v.surah_name)}</h3>
      <p class="qk-today-ref">Ayat ${esc(ayah)}</p>
    </div>
    <div class="qk-today-ar" dir="rtl" lang="ar">${esc(v.arabic)}</div>
    <p class="qk-today-tr">${esc(tr)}</p>
    <div class="qk-today-foot">
      <a class="qk-today-btn" href="#/tanya">Baca Selengkapnya</a>
    </div>`;
}
