/**
 * The verse card — the one place scripture is rendered.
 *
 * Chat and the reading surface both draw through here. That is not just DRY: it is what
 * guarantees the honesty contract holds everywhere. The interpretive primary (Terjemahan makna)
 * reads open; the literal companion (Terjemahan harfiah) and the tafsir stack live one tap away
 * inside the depth disclosure — depth on demand (DESIGN principle 4), never depth removed. The
 * companion is always PRESENT in the card (and always ships in the corpus — the `literal_companion`
 * data gate), so "read both" is always reachable; for the handful of verses where the primary is
 * flagged as diverging (94:5), the disclosure renders OPEN so the comparison the caution asks for
 * is visible without a tap.
 */
import { hasAudio, nowPlaying, playMode, nextWithAudio } from "./audio.ts";
import type { ShardVerse } from "./quran.ts";
import { RELATED_VERSES } from "./related-verses.ts";

export { esc } from "./esc.ts";
import { esc } from "./esc.ts";


/**
 * Verse-action icons, matching the header's own icon language (viewBox 24, stroke 1.7,
 * round caps/joins — see index.html's info/theme-toggle icons) instead of the platform-default
 * glyph shapes a Unicode character renders as. A font's ⧉/↗/▦ can differ enough between OS and
 * browser to read as slightly off; an inline SVG draws exactly the same line everywhere.
 */
const ICON_COPY =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ICON_SHARE =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';
const ICON_IMAGE =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none"/><path d="m21 15-4.5-4.5a1.5 1.5 0 0 0-2.1 0L6 19"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 4.5v15l13-7.5Z" fill="currentColor"/></svg>';
const ICON_PAUSE =
  '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="4" width="4.5" height="16" rx="1" fill="currentColor"/><rect x="13.5" y="4" width="4.5" height="16" rx="1" fill="currentColor"/></svg>';
/**
 * Not the ⚠ character — most platforms render U+26A0 in full-color emoji presentation, which
 * ignores `.caution b`'s `color: var(--caution)` entirely. An SVG with `stroke="currentColor"`
 * is the only way this icon actually carries the caution token in both themes.
 */
const ICON_WARNING =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2 20h20L12 3.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/></svg>';

export interface Reading {
  text: string;
  translator: string;
  translation_type?: string;
}

/**
 * Verses where the primary voice is known to diverge from the verse's plain sense.
 *
 * HUMAN-CURATED, and it stays that way. We tried deriving this from a mechanical divergence
 * score and it was a dead end — token overlap cannot tell 2:156 (the Tafsiriyah's greatest
 * win) from 94:5 (its worst failure); both look "divergent". See ISA.md § Changelog.
 *
 * A caution earns its force by being rare and ruled on by a person. The structural safeguard
 * for every OTHER verse is that the literal companion always ships alongside the primary.
 */
export const FLAGGED: Record<string, string> = {
  "94:5":
    "Terjemahan makna di atas membaca ayat ini sebagai gambaran umum kehidupan. Terjemahan harfiah Kemenag membacanya sebagai janji: <em>sesudah kesulitan ada kemudahan</em>. Perbedaannya nyata — baca keduanya.",
  "94:6":
    "Sama seperti ayat sebelumnya. Al-Qur'an mengulang ayat ini — pengulangan itu sendiri adalah penegasan.",
};

/**
 * "Related verses" — Path B2's smallest honest slice (see `build-related-verses.ts`). T2/auto
 * per the graph spec's own tiering: a navigation pointer, never a doctrinal claim in Nur's own
 * voice — which is why this names its source explicitly, the same "attribution is design, not
 * fine print" discipline the readings above already follow, rather than presenting the link as
 * something Nur itself asserts.
 */
function relatedEl(ref: string): string {
  const related = RELATED_VERSES[ref];
  if (!related?.length) return "";

  return `
    <div class="related">
      <p class="related-label">Terhubung secara tematik</p>
      ${related
        .map(
          (r) => `
        <div class="related-item">
          <a class="related-link" href="#/surah/${r.ref.split(":")[0]}#${r.ref.split(":")[1]}">
            <span class="related-ref">${esc(r.ref)}</span> · ${esc(r.surah_name)}
          </a>
          <p class="related-source">menurut ${esc(r.source)}</p>
        </div>`,
        )
        .join("")}
    </div>`;
}

function readingEl(r: Reading, lead: boolean): string {
  const label = lead ? "Terjemahan makna" : "Terjemahan harfiah";

  // The chip IS the affordance.
  //
  // This label is the thing a first-timer is confused BY — two translations of the same verse,
  // saying different things, with no way to learn why. So it is also the thing they press. An
  // explainer parked behind an About link solves the problem for people who did not have it.
  return `
    <div class="reading ${lead ? "primary" : "companion"}">
      <div class="who">
        <button class="chip ${lead ? "lead" : ""}" data-explain="open"
                aria-label="${label} — apa bedanya? Buka penjelasan">
          ${label} <span class="chip-q" aria-hidden="true">?</span>
        </button>
        <span class="by">oleh <b>${esc(r.translator)}</b></span>
      </div>
      <p class="txt">${esc(r.text)}</p>
    </div>`;
}

/**
 * The depth disclosure — everything but the interpretive primary.
 *
 * Terjemahan makna reads open above this; here live the literal companion (Terjemahan harfiah) and the
 * tafsir stack, one tap away. `flagged` verses (94:5/94:6) open by default so the caution's "baca
 * keduanya" stays honest. Lazy verses carry `data-lazy-tafsir` on THIS element — bindLazyTafsir
 * fills the `.tafsir-slot` inside on first open; chat's curated verses pass their stack html
 * directly. The tafsir keeps its `.sources` wrapper so tafsir.ts's lens `sortStacks()` still
 * finds it and the foreign-language / tier labels travel unchanged.
 */
function depthEl(v: VerseCard, flagged: boolean): string {
  const lazy = v.tafsirStack == null && v.lazyTafsir === true;
  const tafsir =
    v.tafsirStack != null
      ? `<div class="sources">${v.tafsirStack}</div>`
      : lazy
        ? `<div class="sources"><div class="tafsir-slot"></div></div>`
        : "";

  if (!v.companion && !tafsir) return "";

  const lazyAttrs = lazy ? ` data-lazy-tafsir data-surah="${v.surah}" data-ayah="${v.ayah}"` : "";
  return `
    <details class="depth"${flagged ? " open" : ""}${lazyAttrs}>
      <summary>Terjemahan harfiah &amp; tafsir ulama</summary>
      ${v.companion ? readingEl(v.companion, false) : ""}
      ${tafsir}
    </details>`;
}

export interface VerseCard {
  ref: string;
  surah: number;
  ayah: number;
  surah_name: string;
  arabic: string;
  primary: Reading | null;
  companion: Reading | null;
  /** Curation note. Chat shows it; the reading surface does not (it is per-question context). */
  why?: string;
  /**
   * Context the reviewer REQUIRED around this verse. Rendered, never optional.
   *
   * Includes the subject verse itself (the builder enforces that), so `passageEl` skips it while
   * laying out the neighbours — otherwise the ayah would appear twice on its own card.
   */
  // `| undefined` is explicit, not redundant: `exactOptionalPropertyTypes` is on, so without it a
  // caller may omit the key but may NOT pass `passage: v.passage` when the shard has no passage.
  // Every reader here treats absent and undefined identically (`?? []`, `?.length`), so widening the
  // declaration costs no invariant — it just lets the corpus be copied through in one literal.
  passage?: { ayah: number; arabic: string; primary: Reading | null; companion: Reading | null }[] | undefined;
  /** Pre-loaded tafsir STACK html (chat's 55 curated verses only, from `corpus.json`). Rendered
   * inside the depth disclosure, below the literal companion. Takes priority over `lazyTafsir`. */
  tafsirStack?: string;
  /** Path B1: fetch tafsir on demand when the reader opens the depth disclosure, instead of it
   * being pre-loaded. Covers the full 6,236-ayah corpus (the reading surface, theme browser) where
   * the stack isn't already known. Ignored if `tafsirStack` is set. */
  lazyTafsir?: boolean;
  /** Offer "read the rest of this surah". The emotional peak needs somewhere to land. */
  continueTo?: boolean;
  /**
   * Play the entrance animation.
   *
   * Opt-IN, and that matters. `data-new` used to be stamped on every card unconditionally and
   * never removed — permanent state standing in for a lifecycle event. In chat that is one or two
   * cards and a nice flourish; in Al-Baqarah it was 286 simultaneous `blur(7px)` filters, each its
   * own compositor layer, on the mid-range Android in the brief. The reading surface had to fight
   * it back with a specificity override. Now the reading surface simply never asks for it.
   */
  animate?: boolean;
}

/** Build a card from a shard verse. */
export const fromShard = (v: ShardVerse, surah: number, surahName: string): VerseCard => ({
  ref: `${surah}:${v.a}`,
  surah,
  ayah: v.a,
  surah_name: surahName,
  arabic: v.ar,
  primary: v.p,
  companion: v.c,
});

// ── the ayah-end medallion (mushaf craft) ────────────────────────────────────
// A traditional Qur'an marks the end of each ayah with an ornamented number. We render an
// 8-pointed khātam star holding the ayah number in Arabic-Indic digits, appended to the Arabic
// line. Decorative + aria-hidden: the meaningful reference already lives in the verse header, so a
// screen reader is not made to read the number twice. Emerald line-work — never gold-on-content.
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
const toArabicIndic = (n: number): string => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]!);
const AYAH_STAR =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path class="star" d="M20 2 L23.83 10.76 L32.73 7.27 L29.24 16.17 L38 20 L29.24 23.83 L32.73 32.73 L23.83 29.24 L20 38 L16.17 29.24 L7.27 32.73 L10.76 23.83 L2 20 L10.76 16.17 L7.27 7.27 L16.17 10.76 Z"/></svg>';
const ayahMark = (ayah: number): string =>
  `<span class="ayah-mark" aria-hidden="true">${AYAH_STAR}<span class="num">${toArabicIndic(ayah)}</span></span>`;

/**
 * The context ayahs a conditional approval requires, laid out around their subject.
 *
 * The reviewer's condition is "tampilkan bersama" — shown TOGETHER — so this is not a disclosure
 * and does not collapse. A chevron would make the context dismissible, and a condition you can
 * dismiss is not a condition.
 *
 * `side` splits the range at the subject: neighbours before it render above, neighbours after it
 * render below, so the passage reads in mushaf order with the subject in its true position. The
 * subject itself is skipped — it already renders in full, with the caption and the tafsir.
 *
 * Context ayahs get the Arabic and the interpretive reading only. No `why`, no tafsir, no actions:
 * our sentence belongs to the verse that was captioned, and putting it on the neighbours would be
 * exactly the over-reach the condition guards against.
 */
function passageEl(v: VerseCard, side: "before" | "after"): string {
  // TWIN: `passageHtml` in web/demo/passage.ts uses this identical predicate — the demo draws its
  // own card and cannot import this DOM module. Both copies carry the same two invariants (skip the
  // subject; put each neighbour on the correct side) and each is pinned by its own test file, so a
  // change here that is not mirrored there fails silently on the surface Erik demos.
  const rows = (v.passage ?? []).filter((p) =>
    side === "before" ? p.ayah < v.ayah : p.ayah > v.ayah,
  );
  if (rows.length === 0) return "";

  return `
    <div class="passage passage-${side}" role="group" aria-label="Ayat sekitar ${v.ref}">
      ${rows
        .map(
          (p) => `
        <div class="passage-ayah">
          <span class="passage-ref" aria-hidden="true">${v.surah}:${p.ayah}</span>
          <p class="ar" dir="rtl" lang="ar">${esc(p.arabic)}${ayahMark(p.ayah)}</p>
          ${p.primary ? `<p class="passage-tr">${esc(p.primary.text)}</p>` : ""}
        </div>`,
        )
        .join("")}
    </div>`;
}

export function verseEl(v: VerseCard): string {
  const flag = FLAGGED[v.ref];

  return `
    <article class="verse"${v.animate ? " data-new" : ""} data-ref="${v.ref}">
      <header class="verse-head">
        <span class="ref">${v.ref}</span>
        <span class="surah-name">${esc(v.surah_name)}</span>
        ${v.why ? `<span class="why">${esc(v.why)}</span>` : ""}
      </header>

      ${passageEl(v, "before")}

      <p class="ar" dir="rtl" lang="ar">${esc(v.arabic)}${ayahMark(v.ayah)}</p>

      ${v.primary ? readingEl(v.primary, true) : ""}

      ${passageEl(v, "after")}

      ${flag ? `<div class="caution"><b aria-hidden="true">${ICON_WARNING}</b><span>${flag}</span></div>` : ""}

      ${depthEl(v, Boolean(flag))}

      ${relatedEl(v.ref)}

      <div class="verse-acts">
        ${
          hasAudio(v.surah, v.ayah)
            ? (() => {
                const playing = nowPlaying() === v.ref;
                const mode = playMode();
                const more = nextWithAudio(v.surah, v.ayah) !== null;
                // While something is playing the button is a plain pause — asking "one or many?"
                // to stop a track would be nonsense. The menu only guards the START of playback.
                // It is also skipped when there is no next ayah with audio to continue INTO, since
                // both answers would then do the same thing (see the MVP manifest note in audio.ts).
                const opensMenu = !playing && more;
                return `<div class="act-play${opensMenu ? " has-menu" : ""}">
                  <button class="act play" data-act="${opensMenu ? "play-menu" : "play"}" data-ref="${v.ref}" data-surah="${v.surah}" data-ayah="${v.ayah}" aria-pressed="${playing}"${
                    opensMenu ? ' aria-haspopup="true" aria-expanded="false"' : ""
                  } aria-label="${playing ? "Jeda" : "Dengarkan"} ayat ${v.ref}">
                    <span aria-hidden="true">${playing ? ICON_PAUSE : ICON_PLAY}</span> ${playing ? "Jeda" : "Dengar"}
                  </button>
                  ${
                    opensMenu
                      ? `<div class="play-menu" role="menu" hidden aria-label="Cara memutar ayat ${v.ref}">
                           <button class="play-opt${mode === "single" ? " on" : ""}" role="menuitemradio" aria-checked="${mode === "single"}" data-act="play-mode" data-mode="single" data-ref="${v.ref}" data-surah="${v.surah}" data-ayah="${v.ayah}">
                             <span class="play-opt-t">Ayat ini saja</span>
                             <span class="play-opt-d">Berhenti setelah ayat ${v.ayah}</span>
                           </button>
                           <button class="play-opt${mode === "continue" ? " on" : ""}" role="menuitemradio" aria-checked="${mode === "continue"}" data-act="play-mode" data-mode="continue" data-ref="${v.ref}" data-surah="${v.surah}" data-ayah="${v.ayah}">
                             <span class="play-opt-t">Lanjut otomatis</span>
                             <span class="play-opt-d">Terus ke ayat berikutnya</span>
                           </button>
                         </div>`
                      : ""
                  }
                </div>`;
              })()
            : ""
        }
        <button class="act" data-act="copy" data-ref="${v.ref}" aria-label="Salin ayat ${v.ref}">
          <span aria-hidden="true">${ICON_COPY}</span> Salin
        </button>
        <button class="act" data-act="share" data-ref="${v.ref}" aria-label="Bagikan ayat ${v.ref}">
          <span aria-hidden="true">${ICON_SHARE}</span> Bagikan
        </button>
        <button class="act" data-act="image" data-ref="${v.ref}" aria-label="Buat kartu gambar ayat ${v.ref}">
          <span aria-hidden="true">${ICON_IMAGE}</span> Kartu
        </button>
        ${
          v.continueTo
            ? `<a class="act go" href="#/surah/${v.surah}#${v.ayah}" data-act="read" data-surah="${v.surah}">
                 Baca lanjutan ${esc(v.surah_name)} →
               </a>`
            : ""
        }
      </div>
    </article>`;
}

/** The word on the button, and only the word — the icon span stays untouched. Text lives in a
 * TEXT NODE, not the icon span; swapping the wrong node is exactly the "Salin Salin"-class bug
 * copy/share already have to guard against elsewhere. */
function playLabelNode(btn: HTMLButtonElement): ChildNode | undefined {
  return Array.from(btn.childNodes)
    .reverse()
    .find((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");
}

/** Update one play button's icon/label/aria state in place. */
export function setPlayButton(btn: HTMLButtonElement, playing: boolean): void {
  const icon = btn.querySelector("span[aria-hidden]");
  if (icon) icon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  const label = playLabelNode(btn);
  if (label) label.textContent = playing ? " Jeda" : " Dengar";
  btn.setAttribute("aria-pressed", String(playing));
  btn.setAttribute("aria-label", `${playing ? "Jeda" : "Dengarkan"} ayat ${btn.dataset["ref"] ?? ""}`);
  // The action itself flips with the state. A button that opens the "one ayah or keep going?" menu
  // must become a plain pause the moment something is playing — otherwise the only way to stop a
  // recitation is to re-answer a question about how to start it. Restored on the way back out, but
  // only for buttons that had a menu to begin with (`.has-menu` on the wrapper).
  const hasMenu = btn.parentElement?.classList.contains("has-menu") ?? false;
  if (!hasMenu) return;
  btn.dataset["act"] = playing ? "play" : "play-menu";
  if (playing) btn.removeAttribute("aria-expanded");
  else btn.setAttribute("aria-expanded", "false");
}

/**
 * The play button for one ayah, wherever it is on the page (chat or reading) and whichever state
 * it is in.
 *
 * BOTH spellings, and this is the whole reason the helper exists. A button that carries the
 * "one ayah or keep going?" menu sits at `data-act="play-menu"` while idle and only becomes
 * `play` while it is the one playing. Matching just `play` finds a button exactly when it is
 * already showing what you wanted to set — so every caller that looked one way missed silently:
 * the reset left a stale "Jeda" behind, and auto-advance never lit up the ayah it moved to.
 * Caught by driving a synthetic advance event, not by reading the code.
 */
export function findPlayButton(ref: string): HTMLButtonElement | null {
  const sel = `[data-ref="${CSS.escape(ref)}"]`;
  return document.querySelector<HTMLButtonElement>(
    `[data-act="play"]${sel}, [data-act="play-menu"]${sel}`,
  );
}

/** Only one ayah plays at a time — when a NEW one starts, whichever button was showing "Jeda"
 * needs to flip back to "Dengar", wherever on the page it happens to be (chat or reading). */
export function resetPlayButton(ref: string): void {
  const btn = findPlayButton(ref);
  if (btn) setPlayButton(btn, false);
}
