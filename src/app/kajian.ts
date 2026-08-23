/**
 * Turn a recorded lecture into a briefing we can read — and nothing more than that.
 *
 * WHAT IT DOES. Fetches a YouTube transcript via the `baoyu-youtube-transcript` skill, then asks a
 * model for a briefing document in Bahasa Indonesia. Output lands in `.scratch/kajian/<videoId>/`.
 *
 * WHAT IT DELIBERATELY DOES NOT DO, and why each one is a decision rather than an omission
 * (`docs/adr/0005-the-kajian-tool-never-speaks-for-a-scholar.md`):
 *
 *   · IT NEVER REWRITES THE TRANSCRIPT. The tempting feature here is an LLM cleanup pass over
 *     garbled auto-captions — it reads better and it is unverifiable. Once a model has "fixed" a
 *     hadith attribution, nothing downstream can tell a right correction from a plausible wrong
 *     one, because the original is gone by then. This repo's standing rule: permission to display
 *     is not permission to correct. So the transcript is read and never edited.
 *
 *   · IT NEVER NAMES A SPEAKER IT WAS NOT TOLD ABOUT. The transcript skill returns `channel`, which
 *     is a CHANNEL and not a person — one channel hosts many speakers. Nothing here infers who
 *     spoke, and nothing here writes credentials. That comes from a roster a human maintains
 *     (`kajian-roster.ts`), and a video with no roster entry gets no name and no face — on the
 *     briefing AND on the slide, where it matters most.
 *
 *   · IT DOES NOT REPRODUCE THE LECTURE. The briefing is our writing ABOUT a talk. A long verbatim
 *     retelling would be a different thing entirely, both legally and in what it does to the
 *     speaker — and it would compete with the video instead of pointing at it.
 *
 * THE AUTO-CAPTION PROBLEM, AND WHY THE FLAGGING IS DETERMINISTIC. Auto-generated Indonesian
 * captions mangle precisely the vocabulary this content is made of: Arabic terms, hadith collection
 * names, surah and ayah numbers. `meta.language.isGenerated` tells us when we are in that case. The
 * scan that follows is plain pattern matching over the raw snippets — no model — because its job is
 * to say WHERE TO LOOK, and a model would be guessing at exactly the tokens it is worst at. Every
 * hit is reported with its timestamp so it can be checked against the video in seconds.
 *
 * A briefing built from auto-captions is written as a DRAFT and says so at the top. Per ADR 5 a
 * draft is not postable until its flagged citations have been checked.
 *
 * THE SLIDE (step 4, `kajian-slide.ts` + `kajian-render.ts`). A LANDSCAPE 1920x1080 page — cards
 * on the left, a source rail with a QR on the right — composed from the briefing this run just
 * wrote, never from a second model call. It reflows to one column on a phone with no media query,
 * because the published artifact is the HTML and an image of text is invisible to a screen reader.
 * It is where the roster's silence actually has to hold, and where the uploader's title is kept OUT
 * of the identity slot; see that module's docblock, which is the argument for the whole design.
 *
 * USAGE.
 *   export OPENROUTER_API_KEY=...          # it is in ./.env — source it, never print it
 *   bun run src/app/kajian.ts <youtube-url>
 *   bun run src/app/kajian.ts <url> --lang id,en     # transcript language priority
 *   bun run src/app/kajian.ts <url> --no-brief       # transcript + flags only, no model call
 *   bun run src/app/kajian.ts <url> --refresh        # ignore the skill's cache
 *   bun run src/app/kajian.ts <url> --no-slide       # skip the slide + QR render
 *   bun run src/app/kajian.ts <url> --bullets 4      # how many points reach the slide
 *   bun run src/app/kajian.ts <url> --deadline 900    # seconds to allow the briefing model
 *   bun run src/app/kajian.ts <url> --audio          # ALSO narrate (TTS spend; OFF by default)
 *   bun run src/app/kajian.ts <url> --audio --video  # ...and build the short mp4 from the slide
 *
 * SOUND AND VIDEO ARE BOTH OFF BY DEFAULT SINCE 2026-08-23, on Erik's instruction: *"I prefer the
 * result to be like the HTML format ... I don't need the video for that"*, and, asked directly
 * about the narration, to drop that too. **The deliverable is the slide** — `slide.html` and the
 * PNG rendered from it.
 *
 * ⚠ THAT REASONING APPLIES TO THE LONG FORM, AND A FIRST VERSION OF THIS COMMENT OVERSTATED IT INTO
 * A BLANKET. There are TWO narrations here and they are not the same artefact:
 *
 *   LONG FORM  (`narasi*.m4a`, ~474 s) — the WHOLE BRIEFING read aloud, a standalone file nobody
 *              asked for. Dropped, and the reasoning above is about this one: it manufactures a
 *              second machine-voiced derivative of a real person's lecture, needing a permission we
 *              do not have. Producing less of someone else's material by default is the safer floor.
 *
 *   SHORT FORM (`speak("short")`, ~48 s) — the SLIDE'S OWN BULLETS spoken, i.e. our composed summary
 *              rather than their lecture. **Erik wants this and it is a PRODUCT FEATURE**, not
 *              spend: the published HTML carries a play button so someone who cannot see the page,
 *              or who is driving, can hear the summary (2026-08-23). It is an accessibility
 *              affordance, and the voice is ADR 6's `id-ID-Chirp3-HD-Schedar` so every kajian is
 *              narrated by the same non-scholar voice.
 *
 * ⚠ AND THE CODE CANNOT EXPRESS THAT YET. The short narration lives INSIDE `if (!NO_VIDEO …)` below,
 * and its WAV is consumed ONLY by `stillVideo` — it is never kept as a file of its own. So turning
 * the video off also destroys the one thing that produces the play button's audio. Fixing that means
 * decoupling the short narration from the video branch and encoding it to its own audio artefact.
 * Specified in `.scratch/kajian-summarize/PRD.md`; NOT done here.
 *
 * `--no-audio` and `--no-video` are STILL ACCEPTED as no-ops so older invocations, docs and scripts
 * do not start failing; they now describe the default instead of changing it. Nothing is removed:
 * `narrateToWav`, `encodeM4a` and `stillVideo` are untouched and their tests still run.
 *
 * ⚠ `--video` WITHOUT `--audio` IS SILENT — not skipped-with-a-notice. The video IS the slide plus
 * narration, so with no narration there is nothing to build, and the existing "video dilewati" line
 * cannot report it: that line lives INSIDE the `if (!NO_AUDIO …)` block and is never reached. Pass
 * `--audio --video` for an mp4. Written down because a first version of this docblock claimed a skip
 * line prints, and it does not.
 *
 * The rights position on the mp4 and m4a ALREADY built on 2026-08-22 is a separate question and is
 * recorded in `docs/review/rights-darussalam-logo-2026-08-23.md`; changing a default does not
 * unbuild them.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { flagSpans, formatTimestamp, type FlaggedSpan } from "./kajian-flags.ts";
import {
  resolveSpeaker,
  checkOrganisations,
  validateRoster,
  type RosterEntry,
  type RosterOutcome,
} from "./kajian-roster.ts";
import { DENIALS, buildSlideHtml, extractSlideBullets, extractSlideTopics } from "./kajian-slide.ts";
import { qrSvg, renderPng } from "./kajian-render.ts";
import { buildNarrationScript, channelMayBeSpoken } from "./kajian-narration.ts";
import { encodeM4a, narrateToWav, stillVideo } from "./kajian-audio.ts";
import { resolveProvider, callChatModel } from "../../worker/src/providers.ts";
import type { Env } from "../../worker/src/index.ts";

// ── flags ──────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? (argv[i + 1] ?? "") : undefined;
};
const has = (name: string): boolean => argv.includes(`--${name}`);

/**
 * The first bare argument that is not some flag's VALUE.
 *
 * Written as a loop over a known set rather than "the first arg without `--`": that shorthand reads
 * `--refresh <url>` as the flag consuming the url, and drops it. Boolean flags take no value, so
 * the parser has to know which flags do.
 */
const VALUE_FLAGS = new Set(["--lang", "--model", "--bullets", "--deadline"]);
function positional(): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      if (VALUE_FLAGS.has(a)) i += 1;
      continue;
    }
    return a;
  }
  return undefined;
}
const URL_ARG = positional();
const LANGS = flag("lang") ?? "id,en";
const NO_BRIEF = has("no-brief");
const REFRESH = has("refresh");
const MODEL = flag("model");
const NO_SLIDE = has("no-slide");
/**
 * How long the briefing model may take, in seconds.
 *
 * ⚠ THIS EXISTS SO `MODEL_DEADLINE_MS` NEVER HAS TO MOVE. That constant is 25 s because it guards
 * a READER waiting on a page, and it is deliberately set below the browser's own backstop — raising
 * it would make the client give up first, which is the expensive failure. But this CLI is nobody's
 * page load: it hands a model 80,000 characters of a two-hour lecture and the answer legitimately
 * takes minutes. Inheriting the reader's deadline made every real run die at 25 s with
 * "The operation timed out", which reads as a provider fault and is not one.
 */
const DEADLINE_S = Number(flag("deadline") ?? "600");
/**
 * Narration and the mp4 are both opt-IN since 2026-08-23. `--no-audio`/`--no-video` stay accepted
 * so older invocations keep working, but they are the default now and passing them changes nothing.
 * See the header for Erik's instruction and for why producing less by default is the safer floor.
 */
const NO_AUDIO = !has("audio");
const NO_VIDEO = !has("video");
const BULLETS = Number(flag("bullets") ?? "5");
if (!Number.isInteger(BULLETS) || BULLETS < 1) {
  console.error(`✗ --bullets must be a positive integer, got "${flag("bullets")}"`);
  process.exit(1);
}

if (!URL_ARG) {
  console.error(
    "Usage: bun run src/app/kajian.ts <youtube-url-or-id> [--lang id,en] [--no-brief] [--refresh]\n" +
      "                                 [--model <id>] [--no-slide] [--bullets N] [--deadline S]\n" +
      "                                 [--audio] [--video]",
  );
  process.exit(1);
}

const SKILL = join(homedir(), ".claude", "skills", "baoyu-youtube-transcript", "scripts", "main.ts");
if (!existsSync(SKILL)) {
  console.error(`✗ transcript skill not found at ${SKILL}\n  Install baoyu-youtube-transcript first.`);
  process.exit(1);
}

const OUT_ROOT = resolve(".scratch/kajian");
const CACHE_ROOT = join(OUT_ROOT, "_transcripts");

// ── 1. transcript, via the skill (never reimplemented here) ────────────────────────
console.log(`▸ fetching transcript — ${URL_ARG}`);
const args = [SKILL, URL_ARG, "--languages", LANGS, "--output-dir", CACHE_ROOT];
if (REFRESH) args.push("--refresh");

const proc = Bun.spawnSync(["bun", ...args], { stdout: "pipe", stderr: "pipe" });
const stdout = proc.stdout.toString().trim();
const stderr = proc.stderr.toString().trim();
if (proc.exitCode !== 0) {
  console.error(`✗ transcript fetch failed (exit ${proc.exitCode})\n${stderr || stdout}`);
  process.exit(1);
}

/**
 * The skill prints the path it wrote. `meta.json` and the raw snippets are its SIBLINGS, which is
 * the contract this depends on — asserted rather than assumed, because a silent shape change here
 * would otherwise surface as an empty briefing rather than an error.
 */
const printed = stdout.split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
const videoDir = printed.includes("/") ? resolve(printed, "..") : "";
const metaPath = join(videoDir, "meta.json");
const rawPath = join(videoDir, "transcript-raw.json");
if (!videoDir || !existsSync(metaPath) || !existsSync(rawPath)) {
  console.error(
    `✗ the skill did not leave meta.json + transcript-raw.json beside its output.\n` +
      `  printed: ${printed || "(nothing)"}\n  looked in: ${videoDir || "(unresolved)"}`,
  );
  process.exit(1);
}

interface Snippet { text: string; start: number; duration: number }
interface VideoMeta {
  videoId: string; title: string; channel: string; channelId: string;
  description: string; duration: number; publishDate: string; url: string;
  coverImage: string; thumbnailUrl: string;
  language: { code: string; name: string; isGenerated: boolean };
  chapters: { title: string; start: number; end: number }[];
}

const meta = JSON.parse(readFileSync(metaPath, "utf8")) as VideoMeta;
const snippets = JSON.parse(readFileSync(rawPath, "utf8")) as Snippet[];
const transcript = snippets.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();

// One implementation, imported from the tested seam. A second copy here is how the two drift.
const hhmmss = formatTimestamp;

console.log(`  ${meta.title}`);
console.log(`  channel: ${meta.channel} · ${hhmmss(meta.duration)} · captions: ${meta.language.name} (${meta.language.isGenerated ? "AUTO-GENERATED ⚠" : "human-written"})`);

// ── 2. where to look, when the captions were machine-made ──────────────────────────
/**
 * The scan lives in `kajian-flags.ts` so it can be red-tested without fetching a video — see that
 * file for why it is patterns rather than a model, and why it over-reports on purpose.
 */
const flagged: FlaggedSpan[] = flagSpans(snippets);

// ── 2b. who, if anyone, we are prepared to name ────────────────────────────────────
/**
 * The roster decides whether a slide may carry a name. Resolved HERE rather than at slide time so
 * the CLI can tell you now — before you invest in checking 32 timestamps — whether the artifact
 * would be attributable at all.
 *
 * A missing or empty roster is a NORMAL state, not an error. The tool is designed to run with
 * nobody in it and simply attribute nobody.
 */
const ROSTER_PATH = resolve("docs/kajian/roster.yaml");
let speaker: RosterOutcome = { kind: "none" };
let organisations: string[] = [];
if (existsSync(ROSTER_PATH)) {
  const parsed = (Bun.YAML.parse(readFileSync(ROSTER_PATH, "utf8")) ?? {}) as {
    speakers?: RosterEntry[];
    organisations?: string[];
  };
  const entries = Array.isArray(parsed.speakers) ? parsed.speakers : [];
  // Channels the narration may say out loud. An allowlist, not a pattern — see `roster.yaml`.
  // A SCALAR IS NOT AN EMPTY LIST. `organisations: Yufid TV` (no dash) parses fine, fails
  // `Array.isArray`, and used to become `[]` with nothing printed — so the count read 0 and
  // roster.yaml sent the maintainer hunting for a duplicate key that was not there.
  if (parsed.organisations !== undefined && !Array.isArray(parsed.organisations)) {
    console.log(`  ⚠ roster: organisations: is not a list (got ${typeof parsed.organisations}) — ignored`);
  }
  const rawOrgs = Array.isArray(parsed.organisations) ? parsed.organisations : [];
  const orgCheck = checkOrganisations(rawOrgs);
  // The SURVIVORS, never the raw list — a printed problem that leaves the entry live is not a check.
  organisations = [...orgCheck.valid];
  for (const p of orgCheck.problems) console.log(`  ⚠ roster: ${p}`);
  const problems = validateRoster(entries);
  // Printed, never swallowed. An entry that can never match looks like coverage in the file and is
  // silence in the output — the exact shape of bug this repo keeps paying for.
  for (const p of problems) console.log(`  ⚠ roster: ${p}`);
  speaker = resolveSpeaker(entries, { title: meta.title, channelId: meta.channelId });
}
const speakerLine =
  speaker.kind === "match"
    ? `${speaker.match.entry.name}${speaker.match.entry.credentials ? `, ${speaker.match.entry.credentials}` : ""} (cocok lewat ${speaker.match.via})`
    : speaker.kind === "ambiguous"
      ? `TIDAK ADA — ${speaker.names.length} entri roster cocok sekaligus (${speaker.names.join(", ")}), jadi tidak ada yang dinamai`
      : `TIDAK ADA — tidak ada entri roster yang cocok`;
console.log(`  penceramah: ${speakerLine}`);

/**
 * PRINTED, NEVER SWALLOWED — the standing rule in this file, and the allowlist had escaped it. A
 * run whose narration says a channel name out loud must say so here, so that "did we credit
 * anybody?" is answerable from the log rather than by listening to eight minutes of audio.
 */
// The COUNT is printed unconditionally. Printing only on a match made an allowlist that had been
// silently emptied — by a duplicate YAML key, say, where the last one wins — indistinguishable from
// one nobody had filled in yet. Neither speaks a channel; only one is what the maintainer intended.
const orgCount = `(organisations: ${organisations.length} entri)`;
if (speaker.kind === "match") {
  // A rostered speaker is named INSTEAD; `openingLine` returns before the channel is consulted, so
  // a channel PERMISSION here would over-report something that cannot happen on this run. The count
  // still prints — that is the whole point of printing it unconditionally, and the first version of
  // this branch dropped it, which put the silently-emptied-allowlist case back out of sight on
  // exactly the runs where a name IS spoken.
  console.log(`  kanal tidak dipakai: ada penceramah dari roster yang dipakai ${orgCount}`);
} else if (channelMayBeSpoken(meta.channel, organisations)) {
  console.log(`  kanal boleh disebut: "${meta.channel}" ada di daftar ${orgCount}`);
} else {
  console.log(`  kanal TIDAK disebut: "${meta.channel}" tidak ada di daftar ${orgCount}`);
}

const isDraft = meta.language.isGenerated && flagged.length > 0;
if (meta.language.isGenerated) {
  console.log(`  ⚠ auto-captions — ${flagged.length} spans flagged for checking against the video`);
}

// ── 3. the briefing ────────────────────────────────────────────────────────────────
const BRIEF_PROMPT =
  `Create a comprehensive briefing document that synthesizes the main themes and ideas from the sources. ` +
  `Start with a concise Executive Summary that presents the most critical takeaways upfront. ` +
  `The body of the document must provide a detailed and thorough examination of the main themes, evidence, ` +
  `and conclusions found in the sources. This analysis should be structured logically with headings and ` +
  `bullet points to ensure clarity. The tone must be objective and incisive.`;

/**
 * The constraints below are the ADR-5 stance expressed to the model. They are additive to Erik's
 * prompt above, which is reproduced verbatim and is not ours to edit.
 *
 * `jangan menebak` is the load-bearing one. A model handed a garbled citation will otherwise supply
 * the likeliest real one, and a plausible invented attribution is the single worst output this
 * pipeline could produce — it is wrong about a named person, in public, under our name.
 */
const SYSTEM =
  `Kamu menulis dokumen pengarahan (briefing) TENTANG sebuah ceramah. Kamu bukan penceramahnya.\n\n` +
  `ATURAN YANG TIDAK BOLEH DILANGGAR:\n` +
  `1. Tulis seluruh keluaran dalam Bahasa Indonesia yang wajar dan enak dibaca — bukan terjemahan kaku.\n` +
  `2. Ini RINGKASAN, bukan transkrip. Jangan menyalin kalimat panjang apa adanya. Kutipan pendek boleh, ` +
  `dan harus jelas ditandai sebagai kutipan.\n` +
  `3. JANGAN MENEBAK RUJUKAN. Jika transkrip menyebut ayat, hadits, atau nama ulama secara tidak jelas ` +
  `atau terpotong, tulis apa adanya dan tandai "[rujukan tidak jelas dalam transkrip]". Jangan pernah ` +
  `melengkapi, memperbaiki, atau menyimpulkan rujukan yang tidak tertulis jelas.\n` +
  `4. Jangan menambahkan hukum, fatwa, atau kesimpulan syar'i yang tidak ada dalam sumber.\n` +
  `5. Jangan menyebut nama atau gelar penceramah. Rujuk saja sebagai "penceramah".\n` +
  `6. Jika transkrip berasal dari teks otomatis, sebagian kata mungkin salah dengar. Jangan mengarang ` +
  `perbaikan; jika sebuah bagian tidak masuk akal, katakan bahwa bagian itu tidak jelas.`;

if (NO_BRIEF) {
  console.log("▸ --no-brief — skipping the model call");
} else if (!process.env["OPENROUTER_API_KEY"]) {
  console.error("✗ OPENROUTER_API_KEY not set. Source ./.env, or pass --no-brief.");
  process.exit(1);
}

let briefing = "";
if (!NO_BRIEF) {
  if (MODEL) process.env["OPENROUTER_MODEL"] = MODEL;
  const env = {
    OPENROUTER_API_KEY: process.env["OPENROUTER_API_KEY"],
    OPENROUTER_MODEL: process.env["OPENROUTER_MODEL"],
  } as unknown as Env;
  const cfg = resolveProvider("openrouter", env);
  console.log(
    `▸ briefing — ${cfg.model} · ${transcript.length.toLocaleString()} chars of transcript · deadline ${DEADLINE_S}s`,
  );
  const user =
    `${BRIEF_PROMPT}\n\n` +
    `Sumber: transkrip ceramah "${meta.title}" (durasi ${hhmmss(meta.duration)}).\n` +
    `Teks otomatis: ${meta.language.isGenerated ? "YA — sebagian kata mungkin salah dengar" : "tidak"}\n\n` +
    `--- TRANSKRIP ---\n${transcript}\n--- AKHIR TRANSKRIP ---`;
  try {
    briefing = (
      await callChatModel(cfg, SYSTEM, user, {
        temperature: 0.3,
        maxTokens: 4000,
        deadlineMs: DEADLINE_S * 1000,
      })
    ).trim();
  } catch (e) {
    console.error(`✗ briefing failed: ${(e as Error).message}`);
    process.exit(1);
  }
}

// ── 4. write it out ────────────────────────────────────────────────────────────────
const outDir = join(OUT_ROOT, meta.videoId);
mkdirSync(outDir, { recursive: true });

const lines: string[] = [];
if (isDraft) {
  lines.push(
    `> # ⚠ DRAFT — BELUM BOLEH DIPOSTING`,
    `>`,
    `> Transkrip ini **dibuat otomatis oleh YouTube**, dan teks otomatis paling sering salah pada`,
    `> istilah Arab, nama perawi, dan nomor surah/ayat — persis bagian yang paling penting di sini.`,
    `>`,
    `> Periksa ${flagged.length} bagian yang ditandai di bawah terhadap videonya sebelum memakai`,
    `> ringkasan ini. Transkrip tidak diperbaiki oleh mesin dan tidak akan pernah diperbaiki`,
    `> otomatis — lihat \`docs/adr/0005-the-kajian-tool-never-speaks-for-a-scholar.md\`.`,
    ``,
  );
}
lines.push(
  `# Ringkasan Kajian — ${meta.title}`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Sumber | ${meta.url} |`,
  `| Kanal | ${meta.channel} |`,
  `| Durasi | ${hhmmss(meta.duration)} |`,
  `| Transkrip | ${meta.language.name} — ${meta.language.isGenerated ? "**otomatis**" : "ditulis manusia"} |`,
  `| Penceramah (roster) | ${speakerLine} |`,
  `| Dibuat | ${new Date().toISOString()} |`,
  ``,
  `> Ringkasan otomatis. ${DENIALS}`,
  // THE JUDUL CARRIES THE SPEAKER'S NAME, and an earlier version of this note claimed the opposite
  // — "nama penceramah sengaja tidak dicantumkan di sini" — while the H1 above it read
  // "… | USTADZ FULAN HAMID, L.C., M.A.", straight out of the video title. The note was false
  // about the document it sat in. What is actually true is narrower and worth stating precisely:
  // we reproduce YouTube's title verbatim, we did not identify anybody, and any gelar in that title
  // is the uploader's wording rather than something we checked.
  `> **Judul dan kanal di atas disalin apa adanya dari YouTube.** Kalau ada nama atau gelar di sana,`,
  `> itu tulisan pengunggah — bukan hasil identifikasi kami, dan belum kami verifikasi. Ringkasan ini`,
  `> sendiri tidak menisbatkan apa pun kepada orang yang disebutkan; penisbatan hanya lewat roster.`,
  ``,
  `---`,
  ``,
);
lines.push(briefing || `_(--no-brief: ringkasan tidak dibuat)_`, ``);

if (flagged.length) {
  lines.push(
    `---`,
    ``,
    `## Perlu dicek terhadap video (${flagged.length})`,
    ``,
    meta.language.isGenerated
      ? `Transkrip otomatis. Bagian di bawah menyebut rujukan atau memuat teks Arab — dengarkan ulang di menit yang tertera sebelum memakainya.`
      : `Transkrip ditulis manusia, jadi ini bukan peringatan — hanya daftar tempat rujukan disebut, kalau mau dicek cepat.`,
    ``,
  );
  for (const f of flagged) lines.push(`- **${f.at}** _(${f.why})_ — ${f.text}`);
  lines.push(``);
}

const briefPath = join(outDir, "briefing.md");
writeFileSync(briefPath, lines.join("\n"));
writeFileSync(join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

// ── 5. the slide ───────────────────────────────────────────────────────────────────────────────
/**
 * Composed from the briefing that was just written, never from a second model call — see
 * `kajian-slide.ts` on why a regeneration here is a second chance to invent an attribution.
 *
 * Every bullet the extractor refuses is PRINTED with its reason. A silent drop would read as "the
 * briefing had nothing to say", and the person deciding whether to post this needs to know the
 * difference between an empty summary and a filtered one.
 */
let slidePath = "";
let pngPath = "";
/** Hoisted: the SHORT narration speaks these very bullets, never a second extraction. */
let slideBullets: readonly string[] = [];
if (!NO_SLIDE) {
  const extracted = extractSlideBullets(briefing, { max: BULLETS });
  slideBullets = extracted.bullets;

  /**
   * SAFETY DROPS ARE NAMED ONE BY ONE; LAYOUT DROPS ARE COUNTED.
   *
   * They are different kinds of news. "This point carries a quotation" is a judgement about what
   * may be published and the person deciding needs to see the sentence. "There was no room for
   * eleven more points" is arithmetic, and printing eleven lines of it buries the three that
   * matter — the briefing routinely has forty bullets and the slide holds three.
   */
  const LAYOUT: readonly string[] = ["over-max", "over-budget"];
  const safety = extracted.dropped.filter((d) => !LAYOUT.includes(d.reason));
  const layout = extracted.dropped.length - safety.length;
  for (const d of safety) {
    const short = d.text.length > 72 ? `${d.text.slice(0, 72)}…` : d.text;
    console.log(`  · slide drops (${d.reason}): ${short}`);
  }
  if (layout) console.log(`  · slide drops ${layout} more point${layout === 1 ? "" : "s"} for lack of room`);

  /**
   * The category strip runs the SAME safety screens the bullets run, so its safety drops are
   * reported the same way — a chip is an unmarked fragment and a silently dropped one reads as
   * "the lecture did not cover that".
   */
  const topics = extractSlideTopics(briefing);
  for (const d of topics.dropped.filter((d) => !LAYOUT.includes(d.reason))) {
    const short = d.text.length > 72 ? `${d.text.slice(0, 72)}…` : d.text;
    console.log(`  · slide drops topic (${d.reason}): ${short}`);
  }

  const html = buildSlideHtml({
    title: meta.title,
    channel: meta.channel,
    url: meta.url,
    qrSvg: qrSvg(meta.url),
    speaker,
    bullets: extracted.bullets,
    topics: topics.topics,
    isDraft,
  });

  slidePath = join(outDir, "slide.html");
  writeFileSync(slidePath, html);
  pngPath = join(outDir, "slide.png");
  renderPng(slidePath, pngPath);
  console.log(
    `  slide: ${extracted.bullets.length} poin, ${extracted.dropped.length} dibuang, ` +
      `${topics.topics.length} topik → ${pngPath}`,
  );
}

// ── 6. the narration ───────────────────────────────────────────────────────────────────────────
/**
 * Steps 5-6 (`kajian-narration.ts` + `kajian-audio.ts`). Two artifacts, per ADR 6: a SHORT video —
 * the slide, narrated with the very bullets it is showing — and a LONG-FORM audio of the briefing.
 *
 * Both open with the spoken attribution and close by pointing back at the source. Both are named
 * `-DRAFT` on disk when the briefing came from unchecked auto-captions, because ADR 5's draft gate
 * applies to audio too and a file that escapes a review folder carries no visible band.
 *
 * SKIPPED WHEN THERE IS NOTHING TO SAY. `--no-brief` leaves no script, and narrating a slide that
 * was never rendered would produce a video of nothing.
 */
const audioPaths: string[] = [];
if (!NO_AUDIO && briefing) {
  const suffix = isDraft ? "-DRAFT" : "";
  const speak = (kind: "short" | "long") =>
    buildNarrationScript({
      briefing,
      speaker,
      channel: meta.channel,
      title: meta.title,
      isDraft,
      kind,
      bullets: slideBullets,
      organisations,
    });

  try {
    // ── long form: the whole briefing ──
    const longScript = speak("long");
    // The narrator's refusals are DIFFERENT from the slide's and are printed on their own. A
    // quotation the slide dropped for want of room is a layout fact; the same quotation dropped
    // here is the refusal ADR 6 is built around, and the two must not be confused in a log.
    for (const d of longScript.dropped) {
      const short = d.text.length > 72 ? `${d.text.slice(0, 72)}…` : d.text;
      console.log(`  · narasi menolak (${d.reason}): ${short}`);
    }
    console.log(`▸ narasi panjang — ${longScript.full.length.toLocaleString()} karakter`);

    const longWav = join(outDir, `narasi${suffix}.wav`);
    const longOut = await narrateToWav(longScript.full, longWav, {
      onChunk: (i, n, chars) => console.log(`    chunk ${i}/${n} — ${chars} karakter`),
    });
    const longM4a = join(outDir, `narasi${suffix}.m4a`);
    encodeM4a(longWav, longM4a, { sourceUrl: meta.url, isDraft });
    rmSync(longWav, { force: true }); // the WAV is an intermediate; the m4a is the artifact
    audioPaths.push(longM4a);
    console.log(
      `  narasi: ${longOut.chunks} chunk, ${Math.round(longOut.seconds)}s → ${longM4a}`,
    );

    // ── short form: the slide, spoken ──
    if (!NO_VIDEO && pngPath && slideBullets.length) {
      const shortScript = speak("short");
      /**
       * PRINTED, exactly like the long form's. The short path screens its bullets too, so a bullet
       * can appear ON THE SLIDE and be absent from the VOICE. The person deciding whether to post
       * has to be told that; a silent divergence between the picture and the narration is the same
       * failure the slide path already refuses to ship.
       */
      for (const d of shortScript.dropped) {
        const short = d.text.length > 72 ? `${d.text.slice(0, 72)}…` : d.text;
        console.log(`  · narasi pendek menolak (${d.reason}), poin ini tetap ada di slide: ${short}`);
      }
      const shortWav = join(outDir, `short${suffix}.wav`);
      const shortOut = await narrateToWav(shortScript.full, shortWav);
      const shortMp4 = join(outDir, `short${suffix}.mp4`);
      stillVideo(pngPath, shortWav, shortMp4);
      rmSync(shortWav, { force: true });
      audioPaths.push(shortMp4);
      console.log(`  video: ${Math.round(shortOut.seconds)}s → ${shortMp4}`);
    } else if (!NO_VIDEO) {
      console.log(`  · video dilewati — tidak ada slide atau tidak ada poin untuk dibacakan`);
    }
  } catch (e) {
    // NOT fatal. The briefing and the slide are already on disk and are useful without audio; a
    // TTS quota error should not throw away a two-hour transcript and a model call.
    console.error(`✗ narasi gagal: ${(e as Error).message}`);
  }
}

console.log(`\n${isDraft ? "⚠ DRAFT" : "✓"} → ${briefPath}`);
if (slidePath) console.log(`  → ${join(outDir, "slide.png")}`);
for (const a of audioPaths) console.log(`  → ${a}`);
if (isDraft) console.log(`  ${flagged.length} spans to check against the video before this is postable.`);
