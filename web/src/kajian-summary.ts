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
 *   · THE NARRATION VOICE stays ADR 6's `id-ID-Chirp3-HD-Schedar`. A first cut of this docblock said
 *     the skill's `id-ID-ArdiNeural` had won; **Erik REVERSED that half of his own skill-wins ruling
 *     on 2026-08-23** (`docs/review/erik-ruling-2026-08-23-kajian-four.md` §3) — the skill wins on
 *     pipeline mechanics, not over a voice he picked himself from eight rendered samples for a stated
 *     safety reason. The tree at `kajian-narration.ts:110` never changed; what changed is that the
 *     record now agrees with it. The speaker-naming half of the skill-wins ruling STANDS. That choice lives in the runner, not here; noted so a reader of
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

/**
 * The origin an artefact path is TEST-resolved against. Never fetched, never rendered — `.invalid`
 * is reserved by RFC 2606 precisely so it can never be a real host.
 */
const PROBE_ORIGIN = "https://artifact.invalid";

/**
 * The URL of an artefact the runner uploaded — the slide, its PNG, the narration.
 *
 * ⚠ THIS EXISTS BECAUSE `safeHttpUrl` REJECTED EVERY REAL ONE. The upload endpoint answers with
 * `artifactPath()`, i.e. `/kajian/{videoId}/{name}` — a same-origin PATH, which is the right shape
 * for a file this app serves itself. But `new URL(path)` with no base THROWS, so `safeHttpUrl`
 * returned null for it, and `kajianCard` drops a card whose summary link is null. Every published
 * card would have rendered as an empty string, and the "Ada narasi" badge could never appear.
 * Nothing caught it: every fixture in `kajian-summary.test.ts` and `kajian-feed.test.ts` uses an
 * ABSOLUTE `https://…` url, so the suite was green against a shape production does not produce.
 *
 * ⚠ AND A PREFIX CHECK IS NOT ENOUGH. `startsWith("/") && !startsWith("//")` looks sufficient and
 * is not: `/\evil.example/x` resolves, per WHATWG, to origin `https://evil.example` — the parser
 * treats the backslash as a slash. Measured, not assumed.
 *
 * SO THE WHOLE GUARD IS ONE EQUALITY: the parser must hand back a path IDENTICAL to what went in.
 * That is a rule about what is VALID rather than a list of forms known to be dangerous, and it is
 * why the hostile cases fail — `//evil.example/x` parses to `/x`, the backslash form to `/x`,
 * `javascript:alert(1)` to `alert(1)`, `/kajian/../../etc/passwd` to `/etc/passwd`. None survive
 * the round trip. A first cut ALSO compared `u.origin`; that line COULD NEVER FIRE, because a
 * pathname equal to a raw string beginning with `/` is same-origin by construction — and a
 * mutation swapping the real check for the naive prefix guard passed the entire suite while it
 * sat there. Removed, rather than left as a comment claiming work it was not doing.
 *
 * NOT claimed: percent-encoded traversal (`/kajian/%2e%2e/x`) survives the equality, because the
 * parser does not decode it. Stated rather than papered over — such a URL still cannot leave this
 * origin, and the Worker's own `artifactKey` refuses the key, so the worst case is a link that 404s.
 *
 * Absolute http(s) is still accepted first: it was the existing contract and stays valid if these
 * files are ever served from a bucket's own hostname.
 */
export function safeArtifactUrl(raw: string): string | null {
  const absolute = safeHttpUrl(raw);
  if (absolute !== null) return absolute;
  let u: URL;
  try {
    u = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (u.pathname !== raw) return null;
  // Returned RELATIVE, deliberately. Resolving it against the live origin would bake this
  // deployment's hostname into the markup, and the whole point of the path is that it does not
  // care which environment serves it.
  return raw === "/" ? null : raw;
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

/**
 * The line that rides WITH the player, not merely on the page.
 *
 * ⚠ NOT DECORATION, AND NOT A SOFTER COPY OF `PROVENANCE_NOTE`. ADR 6 fixes one narrator voice for
 * a single reason: a listener must never hear the summary as the SCHOLAR speaking. This card puts a
 * play control directly beneath a line naming that scholar, which is exactly the confusion the ADR
 * is built around — and the page-level provenance note sits far above, already scrolled past by
 * someone who came to press play. So the disclaimer is attached to the control itself.
 */
export const AUDIO_NOTE = "Narasi suara mesin — bukan suara penceramah.";

export function kajianCard(item: KajianSummary): string {
  // `safeArtifactUrl` for the three files WE serve, `safeHttpUrl` for the one link that leaves this
  // origin. Not interchangeable: the artefact rule accepts a same-origin path, and a path is not a
  // valid destination for a third-party video link.
  const summaryHref = safeArtifactUrl(item.summaryUrl);
  const videoHref = safeHttpUrl(item.url);
  const thumb = safeArtifactUrl(item.thumbUrl);
  const duration = formatDuration(item.durationSec);

  // A card whose summary link is unusable is not shown at all — a card that looks clickable and
  // does nothing is worse than an absent row, and this is the only link the card exists for.
  if (summaryHref === null) return "";

  const speakerLine =
    item.speaker !== null && item.speaker.trim() !== ""
      ? `<p class="kajian-speaker">${esc(item.speaker)}</p>`
      : "";

  const meta = [duration, item.publishedAt].filter((s) => s !== "").map(esc).join(" · ");

  /**
   * The play button Erik asked for, on the CARD rather than inside `slide.html` — his call,
   * 2026-08-24. The slide is served under `default-src 'none'` with `sandbox`, which denies
   * `media-src` and `script-src` both, so a control there would have needed that policy relaxed;
   * the card is first-party markup and needs nothing loosened.
   *
   * `preload="none"` because a grid of cards must not fetch a megabyte of audio each on load; the
   * file is fetched when somebody presses play. `controls` rather than a custom button: the native
   * control is keyboard-operable, labelled, and exposes seek and volume without this file owning a
   * single line of player state.
   *
   * NO `speechSynthesis` FALLBACK, and its absence is a finding rather than an omission. The PRD
   * asks for one so the control is never dead — but a feed record carries no summary TEXT (see
   * `KajianSummary`: title, channel, speaker, urls), so the only string on this card a browser
   * voice could read aloud is the TITLE, which is not the summary. A control that reads the title
   * while claiming to read the summary is worse than an absent one. Making it possible means
   * carrying the bullets in `index.json`; recorded in `ISA.md` under ISC-624.8.
   */
  const audioHref = item.audioUrl === null ? null : safeArtifactUrl(item.audioUrl);
  const audioBlock =
    audioHref === null
      ? ""
      : `<div class="kajian-audio-wrap">
        <audio class="kajian-audio" controls preload="none" src="${esc(audioHref)}"
               aria-label="Putar narasi ringkasan — suara mesin, bukan suara penceramah"></audio>
        <p class="kajian-audio-note">${esc(AUDIO_NOTE)}</p>
      </div>`;

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
      ${audioBlock}
      <footer class="kajian-card-foot">
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
