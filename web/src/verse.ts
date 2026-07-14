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
import { lazyTafsirEl } from "./tafsir.ts";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

function readingEl(r: Reading, lead: boolean): string {
  const label = lead ? "Terjemah makna" : "Terjemah harfiah";
  return `
    <div class="reading ${lead ? "primary" : "companion"}">
      <div class="who">
        <span class="chip ${lead ? "lead" : ""}">${label}</span>
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
    <article class="verse" data-new data-ref="${v.ref}">
      <header class="verse-head">
        <span class="ref">${v.ref}</span>
        <span class="surah-name">${esc(v.surah_name)}</span>
        ${v.why ? `<span class="why">${esc(v.why)}</span>` : ""}
      </header>

      <p class="ar" dir="rtl" lang="ar">${esc(v.arabic)}</p>

      ${v.primary ? readingEl(v.primary, true) : ""}
      ${v.companion ? readingEl(v.companion, false) : ""}

      ${flag ? `<div class="caution"><b>⚠</b><span>${flag}</span></div>` : ""}

      ${v.extra ?? (v.lazyTafsir ? lazyTafsirEl(v.surah, v.ayah) : "")}

      <div class="verse-acts">
        ${
          hasAudio(v.surah, v.ayah)
            ? (() => {
                const playing = nowPlaying() === v.ref;
                return `<button class="act play" data-act="play" data-ref="${v.ref}" data-surah="${v.surah}" data-ayah="${v.ayah}" aria-pressed="${playing}" aria-label="${playing ? "Jeda" : "Dengarkan"} ayat ${v.ref}">
                  <span aria-hidden="true">${playing ? "⏸" : "▶"}</span> ${playing ? "Jeda" : "Dengar"}
                </button>`;
              })()
            : ""
        }
        <button class="act" data-act="copy" data-ref="${v.ref}" aria-label="Salin ayat ${v.ref}">
          <span aria-hidden="true">⧉</span> Salin
        </button>
        <button class="act" data-act="share" data-ref="${v.ref}" aria-label="Bagikan ayat ${v.ref}">
          <span aria-hidden="true">↗</span> Bagikan
        </button>
        <button class="act" data-act="image" data-ref="${v.ref}" aria-label="Buat kartu gambar ayat ${v.ref}">
          <span aria-hidden="true">▦</span> Kartu
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
  if (icon) icon.textContent = playing ? "⏸" : "▶";
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
