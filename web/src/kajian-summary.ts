/**
 * RANGKUMAN KAJIAN — the reader-facing list of generated kajian summaries.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ────────────────────────────────────────────────────────────
 *
 * This module RENDERS a list of summaries that were produced elsewhere. It generates nothing, calls
 * no model, and fetches no transcript. The pipeline that produces a summary (transcript → briefing →
 * 16:9 HTML + narration + QR) runs OUTSIDE the Worker — a Cloudflare Worker cannot run `yt-dlp` or
 * `edge-tts`, and YouTube blocks datacentre IPs — and the finished artifacts are served from R2.
 *
 * ── TWO DECISIONS THIS FILE IMPLEMENTS, BOTH ERIK'S, BOTH REVERSING AN ADR ──────────────────────
 *
 * On 2026-08-23 Erik ruled that `darussalam-kajian-summary`'s SKILL.md wins where it conflicts with
 * this repo. Recorded rather than silently coded, because each reverses a documented decision:
 *
 *   · THE SPEAKER IS NAMED FROM VIDEO METADATA. ADR 5 ("the kajian tool never speaks for a
 *     scholar") says a name appears ONLY from a hand-typed roster entry, and `roster.yaml` ships
 *     empty. The skill requires `speaker` in the UI. Erik chose the skill. So `speaker` here is
 *     whatever the pipeline read from the video, and it is NOT roster-backed.
 *
 *     CORRECTION 2026-08-23: this paragraph used to cite ISC-10 ("the video title never appears
 *     inside the identity slot") alongside ADR 5. THE CITATION WAS WRONG; THE RULE IT STATES IS NOT.
 *     ISC-10 (`ISA.md`) is `Anti: no shard, and not index.json, contains any tafsir passage text` —
 *     nothing to do with naming — and ISC-10 never contained that sentence; the DA attached it and
 *     shipped it in `fcb27c9`. But the rule is LIVE and enforced: `kajian-slide.ts:10` states it as
 *     that file's headline decision and `kajian-slide.test.ts:13` pins it. It is ADR 5's rule. There
 *     is no ISC for roster-only naming at all. Full retraction:
 *     `docs/review/erik-ruling-2026-08-23-skill-wins.md` §NOT "ISC-10".
 *
 *     Erik's follow-up ruling the same day settled WHERE in the metadata: the DESCRIPTION or the
 *     TITLE, never `channel` (it is a mosque on the one real capture). `src/app/kajian-speaker.ts`.
 *   · THE NARRATION VOICE is RULED to follow the skill (`id-ID-ArdiNeural` via `edge-tts`) rather
 *     than ADR 6's `id-ID-Chirp3-HD-Schedar`. STATED AS A RULING, NOT AS THE STATE OF THE TREE: the
 *     tree still uses ADR 6's voice (`kajian-narration.ts:110`), and the m4a built on 2026-08-22 was
 *     narrated with it. This is a decision not yet implemented. That choice lives in the runner, not here; noted so a reader of
 *     this file is not surprised by the audio.
 *
 * ── WHAT WAS *NOT* RELEASED, AND IS THEREFORE HELD ──────────────────────────────────────────────
 *
 * Erik's ruling of 2026-08-22 says the provenance labels "must not be softened, made conditional, or
 * removed". Naming the speaker is attribution to the video's SOURCE; it is not permission to present
 * model-written prose as that scholar's words. So `PROVENANCE_NOTE` ships on the surface and
 * `reviewed` defaults false. Anything not explicitly released is held by default.
 *
 * ── ESCAPING IS LOAD-BEARING HERE IN A WAY IT WAS NOT ELSEWHERE ─────────────────────────────────
 *
 * `esc.ts` notes that its injection risk is "theoretical, because the verse text is scripture and
 * the translator names come from a pinned corpus". THAT REASONING DOES NOT EXTEND TO THIS MODULE.
 * `title`, `channel` and `speaker` are YouTube metadata — third-party strings an uploader controls
 * — and they reach `innerHTML`. Every one of them is escaped, and `href` values are additionally
 * restricted to http(s) so a `javascript:` URL cannot ride in on a stored record.
 */

import { esc } from "./esc.ts";

export interface KajianSummary {
  /** Stable slug used in the URL fragment; assigned by the runner, never derived from the title. */
  readonly id: string;
  readonly videoId: string;
  /** The exact YouTube URL the QR code encodes. */
  readonly url: string;
  readonly title: string;
  readonly channel: string;
  /**
   * From video metadata per Erik 2026-08-23, NOT from the roster. `null` when the pipeline could not
   * read one — absence renders as absence, never as a guess.
   */
  readonly speaker: string | null;
  readonly publishedAt: string;
  readonly durationSec: number;
  readonly thumbUrl: string;
  readonly summaryUrl: string;
  readonly audioUrl: string | null;
  readonly generatedAt: string;
  /** Whether a person has read this summary. Defaults false and is never inferred. */
  readonly reviewed: boolean;
}

/**
 * Held by Erik's 2026-08-22 ruling. Do not soften, make conditional, or remove.
 */
export const PROVENANCE_NOTE =
  "Rangkuman di halaman ini <b>ditulis oleh mesin</b> dari transkrip video, lalu dinarasikan " +
  "otomatis. Isinya <b>belum diperiksa ulama</b>. Nama penceramah dan kanal diambil dari data " +
  "video sebagai penunjuk sumber — bukan tanda bahwa beliau menulis, memeriksa, atau menyetujui " +
  "rangkuman ini. Rujukan yang sahih tetap pada videonya sendiri.";

/** Only http(s) may reach an `href`. A stored record is data, and data can carry `javascript:`. */
export function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}

export function kajianCard(item: KajianSummary): string {
  const summaryHref = safeHttpUrl(item.summaryUrl);
  const videoHref = safeHttpUrl(item.url);
  const thumb = safeHttpUrl(item.thumbUrl);
  const duration = formatDuration(item.durationSec);

  // A card whose summary link is unusable is not shown at all — a card that looks clickable and
  // does nothing is worse than an absent row, and this is the only link the card exists for.
  if (summaryHref === null) return "";

  const speakerLine =
    item.speaker !== null && item.speaker.trim() !== ""
      ? `<p class="kajian-speaker">${esc(item.speaker)}</p>`
      : "";

  const meta = [duration, item.publishedAt].filter((s) => s !== "").map(esc).join(" · ");

  return `
    <article class="kajian-card">
      <a class="kajian-card-link" href="${esc(summaryHref)}">
        ${thumb !== null ? `<img class="kajian-thumb" src="${esc(thumb)}" alt="" loading="lazy" />` : ""}
        <div class="kajian-card-body">
          <h2 class="kajian-title">${esc(item.title)}</h2>
          ${speakerLine}
          <p class="kajian-channel">${esc(item.channel)}</p>
          ${meta !== "" ? `<p class="kajian-meta">${meta}</p>` : ""}
        </div>
      </a>
      <footer class="kajian-card-foot">
        ${item.audioUrl !== null && safeHttpUrl(item.audioUrl) !== null ? `<span class="kajian-has-audio">Ada narasi</span>` : ""}
        ${item.reviewed ? "" : `<span class="kajian-unreviewed">Belum diperiksa</span>`}
        ${videoHref !== null ? `<a class="kajian-source" href="${esc(videoHref)}" rel="noopener noreferrer" target="_blank">Video asli</a>` : ""}
      </footer>
    </article>`;
}

export function renderKajian(mount: HTMLElement, items: readonly KajianSummary[]): void {
  const cards = items.map(kajianCard).filter((s) => s !== "").join("");
  mount.innerHTML = `
    <div class="read-index kajian-index">
      <header class="tematik-head">
        <div class="tematik-head-l">
          <h1 class="qk-hero-gradient tematik-title">Rangkuman Kajian</h1>
          <p class="tematik-sub">Ringkasan kajian dari video YouTube — inti pesannya, lengkap dengan tautan ke videonya sendiri.</p>
        </div>
        <div class="tematik-head-r"><a class="tematik-back" href="#/">Kembali</a></div>
      </header>
      <p class="hadith-note" role="note">${PROVENANCE_NOTE}</p>
      ${
        cards === ""
          ? `<p class="kajian-empty">Belum ada rangkuman di sini.</p>`
          : `<div class="kajian-grid">${cards}</div>`
      }
    </div>`;
}
