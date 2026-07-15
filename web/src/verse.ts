/**
 * The verse card — the one place scripture is rendered.
 *
 * Chat and the reading surface both draw through here. That is not just DRY: it is what
 * guarantees the honesty contract holds everywhere. A verse cannot appear in the reading
 * surface with its attribution or its literal companion quietly missing, because there is
 * only one renderer and it always draws both.
 */
import { hasAudio, nowPlaying } from "./audio.ts";
import type { ShardVerse } from "./quran.ts";
import { RELATED_VERSES } from "./related-verses.ts";
import { lazyTafsirEl } from "./tafsir.ts";

/**
 * Escape for HTML — including single quotes.
 *
 * `'` was missing. Nothing currently breaks, because every attribute here is double-quoted — but
 * that is a property of today's templates, not of this function, and the next person to write
 * `data-x='${esc(v)}'` would open an injection with no warning. The verse text is scripture and
 * the translator names come from a pinned corpus, so the risk is theoretical; the loaded gun
 * pointing at the next contributor is not.
 */
export const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
    "Terjemah makna di atas membaca ayat ini sebagai gambaran umum kehidupan. Terjemah harfiah Kemenag membacanya sebagai janji: <em>sesudah kesulitan ada kemudahan</em>. Perbedaannya nyata — baca keduanya.",
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
  const label = lead ? "Terjemah makna" : "Terjemah harfiah";

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
  /** Extra HTML dropped in below the readings — the tafsir stack, pre-loaded (chat's 55 curated
   * verses only). Takes priority over `lazyTafsir` if both are somehow set. */
  extra?: string;
  /** Path B1: fetch tafsir on demand when the reader opens the disclosure, instead of it being
   * pre-loaded. Covers the full 6,236-ayah corpus (the reading surface, theme browser) where
   * `extra` isn't already known. Ignored if `extra` is set. */
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

export function verseEl(v: VerseCard): string {
  const flag = FLAGGED[v.ref];

  return `
    <article class="verse"${v.animate ? " data-new" : ""} data-ref="${v.ref}">
      <header class="verse-head">
        <span class="ref">${v.ref}</span>
        <span class="surah-name">${esc(v.surah_name)}</span>
        ${v.why ? `<span class="why">${esc(v.why)}</span>` : ""}
      </header>

      <p class="ar" dir="rtl" lang="ar">${esc(v.arabic)}</p>

      ${v.primary ? readingEl(v.primary, true) : ""}
      ${v.companion ? readingEl(v.companion, false) : ""}

      ${flag ? `<div class="caution"><b aria-hidden="true">${ICON_WARNING}</b><span>${flag}</span></div>` : ""}

      ${v.extra ?? (v.lazyTafsir ? lazyTafsirEl(v.surah, v.ayah) : "")}

      ${relatedEl(v.ref)}

      <div class="verse-acts">
        ${
          hasAudio(v.surah, v.ayah)
            ? (() => {
                const playing = nowPlaying() === v.ref;
                return `<button class="act play" data-act="play" data-ref="${v.ref}" data-surah="${v.surah}" data-ayah="${v.ayah}" aria-pressed="${playing}" aria-label="${playing ? "Jeda" : "Dengarkan"} ayat ${v.ref}">
                  <span aria-hidden="true">${playing ? ICON_PAUSE : ICON_PLAY}</span> ${playing ? "Jeda" : "Dengar"}
                </button>`;
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
}

/** Only one ayah plays at a time — when a NEW one starts, whichever button was showing "Jeda"
 * needs to flip back to "Dengar", wherever on the page it happens to be (chat or reading). */
export function resetPlayButton(ref: string): void {
  const btn = document.querySelector<HTMLButtonElement>(`[data-act="play"][data-ref="${CSS.escape(ref)}"]`);
  if (btn) setPlayButton(btn, false);
}
