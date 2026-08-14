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
 */
import { $ } from "bun";
import { readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
}
