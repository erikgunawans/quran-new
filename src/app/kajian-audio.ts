/**
 * THE NOISY EDGE — everything in steps 5-6 that talks to Google or to ffmpeg.
 *
 * Kept apart from `kajian-narration.ts` for the same reason `kajian-render.ts` is kept apart from
 * `kajian-slide.ts`: the decisions worth testing (what may be said, and that nothing was lost in
 * the cutting) are pure, and they should not need a network to run.
 *
 * ── WHY `gcloud` ADC AND NOT AN API KEY ──────────────────────────────────────────────────────
 *
 * Chirp3-HD is billed per character and an API key in a repo is a key that leaks. Application
 * Default Credentials are already configured on this machine, they expire, and they carry no secret
 * this file could print. The one non-obvious part is `X-Goog-User-Project`: with a user credential
 * rather than a service account, Google bills quota to a project that the CREDENTIAL does not name,
 * so without that header the call fails with a permission error that reads like an auth problem and
 * is not one.
 *
 * ── WHY THE ASSERTIONS ARE ON DURATION AND NOT ON EXIT CODES ─────────────────────────────────
 *
 * ADR 6: a dropped or truncated chunk "produces a file that plays cleanly and is missing content —
 * a failure with no error and no obvious symptom". Nothing in this file trusts an exit code:
 *
 *   · every chunk's returned audio is measured against how long its text should take to say, and a
 *     grossly short one throws NAMING THE CHUNK;
 *   · the concatenated file is measured against the sum of its parts;
 *   · (the chunk-vs-file count check at the end of the loop is belt-and-braces, not a third
 *     guarantee — the loop writes one part per chunk and throws on any failure, so it is equal by
 *     construction. It is kept as a cheap tripwire for a future edit, and named honestly here
 *     rather than listed beside the two checks that can actually fire.)
 *
 * The pure half already guarantees the chunks reconstruct the script exactly. This half guarantees
 * that every chunk became audio, and that the audio is as long as the words in it.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DRAFT_COPY } from "./kajian-slide.ts";
import {
  DEFAULT_CHUNK_BYTES,
  DRAFT_WARNING,
  NARRATION_DENIALS,
  NARRATION_LANGUAGE_CODE,
  NARRATION_VOICE,
  assertChunksCoverText,
  chunkForTts,
  expectedSeconds,
  normalizeForSpeech,
} from "./kajian-narration.ts";

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const SAMPLE_RATE = 24_000;

/**
 * How short an audio file may be relative to its text before we call it truncated.
 *
 * Deliberately loose. Speaking rate varies with punctuation and with the voice's own pacing, and a
 * floor tight enough to catch a 10% loss would fire on a chunk that simply reads briskly. What this
 * is for is the failure that actually happens — a chunk that came back as a fragment or as silence
 * — and half the expected length catches that with no room for argument.
 */
const DURATION_FLOOR_RATIO = 0.5;

let cachedToken: string | undefined;

/** The ADC access token, fetched once per process. Never logged, never written to disk. */
function accessToken(): string {
  if (cachedToken) return cachedToken;
  const proc = Bun.spawnSync(["gcloud", "auth", "application-default", "print-access-token"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = proc.stdout.toString().trim();
  if (proc.exitCode !== 0 || !out) {
    throw new Error(
      `could not get a Google access token (exit ${proc.exitCode}).\n` +
        `  Run: gcloud auth application-default login\n` +
        `  ${proc.stderr.toString().trim()}`,
    );
  }
  cachedToken = out;
  return out;
}

/**
 * The project quota is billed to.
 *
 * `GOOGLE_CLOUD_PROJECT` wins so a run can be billed somewhere else without touching gcloud's
 * global config, which is shared with every other tool on this machine.
 */
export function quotaProject(): string {
  const fromEnv = process.env["GOOGLE_CLOUD_PROJECT"]?.trim();
  if (fromEnv) return fromEnv;
  const proc = Bun.spawnSync(["gcloud", "config", "get-value", "project"], { stdout: "pipe", stderr: "pipe" });
  const out = proc.stdout.toString().trim();
  if (proc.exitCode !== 0 || !out || out === "(unset)") {
    throw new Error(
      "no Google Cloud quota project. Set GOOGLE_CLOUD_PROJECT, or run: gcloud config set project <id>",
    );
  }
  return out;
}

export interface SynthesizeOptions {
  readonly voice?: string;
  readonly languageCode?: string;
  readonly project?: string;
  /** Retries on 429 and 5xx. A per-character API rate-limits under a long briefing. */
  readonly attempts?: number;
}

/** One chunk of text to one LINEAR16 WAV, as bytes. */
export async function synthesizeChunk(text: string, opts: SynthesizeOptions = {}): Promise<Uint8Array> {
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: opts.languageCode ?? NARRATION_LANGUAGE_CODE, name: opts.voice ?? NARRATION_VOICE },
    audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE },
  });
  const headers = {
    Authorization: `Bearer ${accessToken()}`,
    "X-Goog-User-Project": opts.project ?? quotaProject(),
    "Content-Type": "application/json",
  };

  const attempts = opts.attempts ?? 3;
  let lastError = "";
  for (let i = 1; i <= attempts; i += 1) {
    const res = await fetch(TTS_ENDPOINT, { method: "POST", headers, body });
    if (res.ok) {
      const json = (await res.json()) as { audioContent?: string };
      if (!json.audioContent) throw new Error("Google returned 200 with no audioContent");
      return Uint8Array.from(atob(json.audioContent), (c) => c.charCodeAt(0));
    }
    lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
    // 4xx other than 429 will not get better by asking again.
    if (res.status !== 429 && res.status < 500) break;
    await Bun.sleep(1000 * i);
  }
  throw new Error(`text-to-speech failed after ${attempts} attempt(s) — ${lastError}`);
}

/** Seconds of audio in a media file, straight from ffprobe. Throws rather than returning 0. */
export function probeDurationSec(path: string): number {
  const proc = Bun.spawnSync(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { stdout: "pipe", stderr: "pipe" },
  );
  const secs = Number(proc.stdout.toString().trim());
  if (proc.exitCode !== 0 || !Number.isFinite(secs) || secs <= 0) {
    throw new Error(`ffprobe could not read a duration from ${path}: ${proc.stderr.toString().trim()}`);
  }
  return secs;
}

export interface NarrateResult {
  readonly wavPath: string;
  readonly chunks: number;
  readonly seconds: number;
  readonly characters: number;
}

export interface NarrateOptions extends SynthesizeOptions {
  readonly maxChunkBytes?: number;
  /** Called before each request, so a five-minute run is not five minutes of silence. */
  readonly onChunk?: (index: number, total: number, chars: number) => void;
}

/**
 * A script to one WAV, chunked, synthesized, concatenated and CHECKED.
 *
 * The order of the checks is the design. Coverage is asserted BEFORE a single request is paid for,
 * because a chunker that lost a sentence should cost nothing. Duration is asserted per chunk rather
 * than only on the total, because one short chunk inside twenty is invisible in a total and is
 * exactly what a truncated response looks like.
 */
export async function narrateToWav(
  script: string,
  wavPath: string,
  opts: NarrateOptions = {},
): Promise<NarrateResult> {
  const normalized = normalizeForSpeech(script);
  const { chunks } = chunkForTts(normalized, opts.maxChunkBytes ?? DEFAULT_CHUNK_BYTES);
  if (chunks.length === 0) throw new Error("narrateToWav: the script is empty");
  // Belt and braces: `chunkForTts` already asserts this. Re-asserted here because THIS is the
  // function that is about to spend money and write a file somebody will publish.
  assertChunksCoverText(chunks, normalized);

  const work = mkdtempSync(join(tmpdir(), "kajian-tts-"));
  try {
    const parts: string[] = [];
    let partsSeconds = 0;

    for (const [i, chunk] of chunks.entries()) {
      opts.onChunk?.(i + 1, chunks.length, chunk.length);
      const audio = await synthesizeChunk(chunk, opts);
      const part = join(work, `part-${String(i).padStart(3, "0")}.wav`);
      writeFileSync(part, audio);

      const got = probeDurationSec(part);
      const want = expectedSeconds(chunk);
      if (got < want * DURATION_FLOOR_RATIO) {
        throw new Error(
          `chunk ${i + 1}/${chunks.length} came back truncated: ${got.toFixed(1)}s of audio for ` +
            `${chunk.length} characters (expected about ${want.toFixed(1)}s).\n` +
            `  starts: "${chunk.slice(0, 80)}…"`,
        );
      }
      parts.push(part);
      partsSeconds += got;
    }

    if (parts.length !== chunks.length) {
      throw new Error(`only ${parts.length} of ${chunks.length} chunks became audio`);
    }

    const listPath = join(work, "parts.txt");
    writeFileSync(listPath, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    // Re-encoded to PCM rather than stream-copied: `-c copy` across WAV inputs relies on their RIFF
    // headers agreeing, and a mismatch there produces a file whose header length disagrees with its
    // payload — which plays, and plays short. PCM to PCM is lossless, so this costs nothing.
    const cat = Bun.spawnSync(
      ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "pcm_s16le", "-ar", String(SAMPLE_RATE), "-ac", "1", wavPath],
      { stdout: "pipe", stderr: "pipe" },
    );
    if (cat.exitCode !== 0) {
      throw new Error(`ffmpeg concat failed (exit ${cat.exitCode}): ${cat.stderr.toString().slice(-600)}`);
    }

    const total = probeDurationSec(wavPath);
    // The concatenation lost a part if the whole is shorter than the pieces. One second of slack
    // covers rounding across twenty ffprobe reads and nothing else.
    if (total < partsSeconds - 1) {
      throw new Error(
        `the concatenated narration is ${total.toFixed(1)}s but its ${parts.length} parts total ` +
          `${partsSeconds.toFixed(1)}s — a part was dropped in the join`,
      );
    }

    return { wavPath, chunks: chunks.length, seconds: total, characters: normalized.length };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export interface M4aTags {
  /**
   * The canonical source video URL. REQUIRED, and required for a reason.
   *
   * ⚠ IT WAS OPTIONAL, AND THE SPOKEN CLOSING LINE IS NOT. Every long-form file says "Tautan ke
   * video sumbernya ada di deskripsi file audio ini" — unconditionally, with no branch for a file
   * that has no link. An optional field behind an unconditional promise means the promise holds by
   * caller discipline, and this module's own rule is that under-attributing is acceptable while a
   * false promise about provenance is not. Making it required is how that rule stops being
   * aspirational: a file that cannot keep the sentence cannot be encoded.
   */
  readonly sourceUrl: string;
  /**
   * The briefing came from unchecked auto-captions.
   *
   * ⚠ ADR 6: "the draft gate from ADR 5 applies to both." The slide carries a visible band; this
   * file's only carrier was its FILENAME, which survives neither a rename nor a player that shows
   * tags instead of names. The panel already argued its own case for the three denials — somebody
   * reads it without pressing play — and that argument covers the draft state identically.
   */
  readonly isDraft?: boolean;
}

/**
 * WAV to a shareable m4a. AAC because it is what a phone plays without asking.
 *
 * ⚠ THE METADATA IS NOT DECORATION. The long-form narration ends by telling the listener the source
 * link is in this file's details. It was not — the first cut wrote no tags at all, and the sentence
 * was a promise about a mechanism that did not exist, which is precisely the nominal compliance
 * ADR 6 rejected when it replaced a printed URL with a QR. The audio file is the thing that gets
 * shared, away from the directory that holds `meta.json`, so the URL rides inside it.
 *
 * If these tags are ever dropped, `closingLine("long")` must change in the same commit.
 */
export function encodeM4a(wavPath: string, outPath: string, tags: M4aTags): void {
  const meta: string[] = [];
  /**
   * ⚠ THIS TAG IS A SURFACE, AND IT TOOK TWO TRIES TO TREAT IT AS ONE.
   *
   * The first cut wrote `album=${channel}`, which a media player renders as a bare unlabelled line
   * — so a file whose narration deliberately REFUSES to say "Firanda Andirja" shipped displaying
   * it. The second cut moved the channel into a labelled sentence and still wrote it, which
   * contradicted `roster.yaml`'s promise to a maintainer that leaving a person off the allowlist
   * keeps their name out. The channel is now absent entirely: the URL identifies the source, and
   * whoever follows it sees the channel from YouTube rather than from us.
   *
   * ⚠ AND IT CARRIES THE WHOLE TRIAD. The second cut said only "bukan kutipan" — dropping "bukan
   * fatwa" and "belum diperiksa ulama" from the one artifact that travels ALONE, away from the
   * slide and the briefing. This is a panel somebody reads WITHOUT PRESSING PLAY, so the spoken
   * frame does not reach them. `NARRATION_DENIALS` is shared with the narration for that reason —
   * one string, so a surface cannot quietly carry fewer denials than the others.
   */
  /**
   * ⚠ THE DISCLAIMERS ARE UNCONDITIONAL. THEY WERE NOT, AND NOTHING SAW IT.
   *
   * Every one of them — the draft warning, all three denials, the `title=DRAFT` tag — was nested
   * inside `if (tags.sourceUrl)`, a check on an UNRELATED field. Encode a draft with no URL and
   * ffprobe showed four tags, all of them ffmpeg's own: no denial, no draft state, nothing. The
   * caller happens always to pass a URL today, which is exactly why it survived review twice.
   *
   * A disclaimer that is conditional on a different field is not a disclaimer. Only the two lines
   * that NEED the URL are gated on the URL.
   */
  if (!tags.sourceUrl?.trim()) {
    throw new Error(
      "encodeM4a: a source URL is required — the narration's closing line promises the listener " +
        "it is in this file's description, and a file that cannot keep that promise must not exist",
    );
  }
  const draft = tags.isDraft ? `${DRAFT_WARNING} ` : "";
  meta.push(
    "-metadata",
    `description=Ringkasan otomatis. ${draft}${NARRATION_DENIALS} Sumber: ${tags.sourceUrl}`,
  );
  if (tags.isDraft) meta.push("-metadata", `title=${DRAFT_COPY}`);
  meta.push("-metadata", `comment=Sumber: ${tags.sourceUrl}`);
  const proc = Bun.spawnSync(
    ["ffmpeg", "-y", "-i", wavPath, "-c:a", "aac", "-b:a", "128k", ...meta, outPath],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (proc.exitCode !== 0) {
    throw new Error(`ffmpeg m4a encode failed (exit ${proc.exitCode}): ${proc.stderr.toString().slice(-600)}`);
  }
}

/**
 * The slide PNG plus the narration, as a video.
 *
 * ⚠ `-shortest` IS NOT ENOUGH, and the first real render proved it: 50.8 seconds of narration came
 * back as a 63.0-second file — twelve seconds of a silent still frame hanging off the end of a
 * social post. `-shortest` cuts on the shortest INPUT, and a looped image has no length, so what
 * actually bounds the file is the encoder's own flushing behaviour. So the audio is MEASURED and
 * passed as an explicit `-t`, and the result is measured again: a still-image video is precisely as
 * long as its narration or it is a bug.
 *
 * 30 fps rather than the 2 fps that seemed clever. Identical frames cost almost nothing at any
 * frame rate with `-tune stillimage`, and low-frame-rate video is the kind of thing social players
 * re-encode badly or refuse outright.
 *
 * `yuv420p` is not optional either — a 4:4:4 file plays black in most social players and nothing
 * warns you. `-shortest` is kept as a second net beneath `-t`.
 */
export function stillVideo(pngPath: string, audioPath: string, outPath: string): void {
  const seconds = probeDurationSec(audioPath);
  const proc = Bun.spawnSync(
    [
      "ffmpeg", "-y",
      "-loop", "1", "-framerate", "30", "-i", pngPath,
      "-i", audioPath,
      "-t", seconds.toFixed(3),
      "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "30", "-g", "60",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-movflags", "+faststart",
      outPath,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (proc.exitCode !== 0) {
    throw new Error(`ffmpeg still-video failed (exit ${proc.exitCode}): ${proc.stderr.toString().slice(-600)}`);
  }

  const got = probeDurationSec(outPath);
  if (Math.abs(got - seconds) > 0.75) {
    throw new Error(
      `the video is ${got.toFixed(1)}s but its narration is ${seconds.toFixed(1)}s — ` +
        `${got > seconds ? "it ends on silence" : "the narration is cut off"}`,
    );
  }
}
