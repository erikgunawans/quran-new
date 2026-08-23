/**
 * Record WHAT THIS BUILD WAS, so a deploy can refuse to ship the wrong one.
 *
 * THE BUG THIS EXISTS FOR. `bun run build` and `VITE_ANSWER_MODE=synthesis bun run build` both write
 * `web/dist`. Deploying after the wrong one silently un-authors production — the app stops composing
 * answers, nothing errors, and the only visible difference is behaviour a reader would have to
 * notice for you. It is one forgotten env var away at all times, and it has cost real sessions.
 *
 * WHY PROVENANCE RATHER THAN A BUNDLE PROBE. The obvious check is "grep the built JS for
 * `synthesis`". That does not work: the literal is constant-folded away by the time it ships (probed
 * 2026-08-13 — zero occurrences in a synthesis bundle). The next idea, grepping for a symbol only
 * the synthesis path pulls in, is worse than useless without a control build to prove the symbol is
 * ABSENT otherwise — a lesson this repo already paid for. Recording the input is deterministic;
 * inferring it from the output is not.
 *
 * THE SECOND FIELD THAT MATTERS IS `publicNewest`. Generated content under `web/public/` — the
 * hadith Indonesian sidecar above all — is a GITIGNORED directory baked into the static bundle at
 * BUILD time. It does not stream. On 2026-08-13, 3,935 finished translations sat on disk while prod
 * served 1,746, because a build had run before they existed and nothing anywhere said so. Comparing
 * this timestamp against `web/public/` at deploy time turns that silence into a refusal.
 *
 * Written OUTSIDE `web/dist` on purpose: everything in dist is uploaded and publicly fetchable, and
 * a git SHA is not something to serve to readers.
 *
 * THE THIRD JOB — SWEEPING WHAT MUST NOT BE PUBLISHED. That same sentence cuts the other way:
 * everything in dist is uploaded, INCLUDING files no build step put there. On 2026-08-23 a deploy
 * published `web/dist/.DS_Store` — 6,148 bytes of local file names, HTTP 200 to anyone. It is
 * gitignored, which is exactly why it was invisible: `wrangler deploy` uploads the DIRECTORY and
 * has never read `.gitignore`. Finder writes the file; nothing in the build removes it.
 *
 * So the sweep is deterministic deletion, not a wrangler feature. `.assetsignore` IS written too and
 * wrangler does honour it (verified 2026-08-23: the file itself came back as the SPA fallback rather
 * than its own bytes, which is wrangler consuming it), but it lives inside `web/dist`, and vite
 * empties that directory on every build. A guard that the next build deletes is not a guard.
 *
 * The list below is what has actually been observed shipping, not a theory about what might. Add to
 * it when something else is caught, not in anticipation.
 */
import { $ } from "bun";
import { readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

export interface BuildMeta {
  /** "synthesis" when VITE_ANSWER_MODE=synthesis was set, else "principled". The whole point. */
  answerMode: string;
  /** Epoch ms. Compared against the newest file under web/public/ at deploy time. */
  builtAt: number;
  builtAtISO: string;
  /** HEAD at build time — catches "built, then pulled, then deployed". */
  gitSha: string;
  /** Newest mtime under web/public/ AS THIS BUILD SAW IT. Recorded so the deploy check can tell
   *  "generated content changed after the build" from "the clock moved". */
  publicNewest: number;
}

/** Newest mtime anywhere under a directory. Returns 0 for a missing tree rather than throwing —
 *  an absent web/public is a different failure and not this file's to report. */
export async function newestMtime(dir: string): Promise<number> {
  let newest = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      newest = Math.max(newest, await newestMtime(p));
    } else {
      try {
        newest = Math.max(newest, (await stat(p)).mtimeMs);
      } catch {
        /* raced with a generator mid-write — skip it, the next build will see it */
      }
    }
  }
  return newest;
}

/**
 * Basenames that have been caught being uploaded to the public asset store. One entry, because one
 * is what has been measured — see the docblock. `.assetsignore` mirrors this list for wrangler.
 */
export const NEVER_PUBLISH = [".DS_Store"] as const;

/**
 * Every directory a `wrangler deploy` uploads. BOTH, because `build` and `demo:build` end in the
 * same `app:build-meta` call and this file cannot tell which one invoked it — sweeping only the one
 * prod uses would leave `demo-quranku.axiara.ai` exposed to the identical defect. Sweeping a dist
 * the current build did not touch is harmless: it deletes nothing but the files named above.
 * (demo was checked clean on 2026-08-23 — this keeps it that way rather than fixing a live leak.)
 */
export const ASSET_DIRS = ["web/dist", "web/dist-demo"] as const;

const ASSETSIGNORE = [
  "# Generated by src/app/build-meta.ts — do not hand-edit; vite empties web/dist each build.",
  "# Wrangler's asset uploader does not read .gitignore. A stray macOS .DS_Store (6 KB of local",
  "# file names) was published to new-quranku.axiara.ai on 2026-08-23 because of that.",
  ...NEVER_PUBLISH.flatMap((name) => [name, `**/${name}`]),
  "",
].join("\n");

/**
 * Delete every `NEVER_PUBLISH` file under `dir` and write `.assetsignore` beside them.
 * Returns the dir-relative paths removed, so the caller can SAY what it deleted — a sweep that
 * reports nothing is indistinguishable from a sweep that did not run.
 */
export async function sweepPublishable(dir: string): Promise<string[]> {
  const removed: string[] = [];
  const walk = async (d: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return; // absent dist is the caller's problem to report, not this function's
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if ((NEVER_PUBLISH as readonly string[]).includes(e.name)) {
        await rm(p, { force: true });
        removed.push(relative(dir, p));
      }
    }
  };
  await walk(dir);
  // Written AFTER the walk so the sweep never reports deleting the guard it just wrote.
  await writeFile(join(dir, ".assetsignore"), ASSETSIGNORE).catch(() => {
    /* no dist to guard — the missing-dist failure belongs to the build, not here */
  });
  return removed;
}

export async function buildMeta(): Promise<BuildMeta> {
  const gitSha = (await $`git rev-parse HEAD`.text().catch(() => "unknown")).trim();
  const now = Date.now();
  return {
    answerMode: process.env["VITE_ANSWER_MODE"] === "synthesis" ? "synthesis" : "principled",
    builtAt: now,
    builtAtISO: new Date(now).toISOString(),
    gitSha,
    publicNewest: await newestMtime("web/public"),
  };
}

if (import.meta.main) {
  const meta = await buildMeta();
  await writeFile(".build-meta.json", `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`build-meta: ${meta.answerMode} · ${meta.gitSha.slice(0, 8)} · ${meta.builtAtISO}`);
  for (const dir of ASSET_DIRS) {
    const swept = await sweepPublishable(dir);
    if (swept.length > 0) console.log(`build-meta: swept from ${dir} → ${swept.join(", ")}`);
  }
}
