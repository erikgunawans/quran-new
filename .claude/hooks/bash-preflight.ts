#!/usr/bin/env bun
/**
 * PreToolUse guard on Bash — two checks, both for failures that REPORT SUCCESS.
 *
 * Every serious incident in this repo has the same shape: a gate said fine and wasn't. Neither check
 * below is about catching a crash; both are about catching a green that lied.
 *
 *   1. DEPLOY PREFLIGHT. `wrangler deploy` ships whatever is sitting in `web/dist`, and two different
 *      builds write there. The wrong one silently un-authors production. Generated content under
 *      `web/public/` is baked in at build time too, so a build that predates it ships stale assets
 *      with no error anywhere.
 *   2. EXIT-CODE GUARD. `bun run typecheck | tail` returns TAIL's exit code, so a failing typecheck
 *      reads as a pass. Observed doing exactly this on 2026-08-13.
 *
 * CONTRACT: exit 0 allows, exit 2 blocks and feeds stderr back as the reason. Anything else is
 * treated as a hook error by the harness, so every failure path here exits 0 — a broken guard must
 * never become a broken workflow. It is a seatbelt, not a gate.
 */
import { readFile, stat } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const REPO = "/Users/erikgunawansupriatna/quran-new";

interface HookInput {
  tool_name?: string;
  tool_input?: { command?: string };
}

const block = (msg: string): never => {
  console.error(msg);
  process.exit(2);
};

/** Newest mtime under a tree; 0 if unreadable. Mirrors src/app/build-meta.ts. */
async function newestMtime(dir: string): Promise<number> {
  let newest = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) newest = Math.max(newest, await newestMtime(p));
    else {
      try {
        newest = Math.max(newest, (await stat(p)).mtimeMs);
      } catch {
        /* mid-write, skip */
      }
    }
  }
  return newest;
}

/**
 * Which edition a given `wrangler deploy` invocation is FOR.
 *
 * Top-level (no --env) is prod, and prod has been EDITION=synthesis since 2026-08-12, so its dist
 * must be a synthesis build. `--env synthesis` is the second app and also synthesis. `--env demo`
 * serves an entirely separate bundle (`web/dist-demo`) and is left alone by this check.
 */
const editionFor = (cmd: string): "synthesis" | null => {
  if (/--env[= ]+demo\b/.test(cmd)) return null;
  return "synthesis";
};

async function checkDeploy(cmd: string): Promise<void> {
  const want = editionFor(cmd);
  if (!want) return;

  let meta: { answerMode?: string; builtAt?: number; gitSha?: string };
  try {
    meta = JSON.parse(await readFile(join(REPO, ".build-meta.json"), "utf8"));
  } catch {
    block(
      "BLOCKED — no .build-meta.json, so there is no way to tell what web/dist was built from.\n" +
        "This file records the edition, the git SHA and the build time; a deploy without it is a\n" +
        "deploy on faith. Run:  VITE_ANSWER_MODE=synthesis bun run build",
    );
  }

  if (meta!.answerMode !== want) {
    block(
      `BLOCKED — web/dist was built as "${meta!.answerMode}", but this deploy needs "${want}".\n` +
        "Shipping it would silently un-author production: /api/answer stops being called, no error\n" +
        "appears anywhere, and the app just quietly stops composing answers.\n" +
        "Rebuild:  VITE_ANSWER_MODE=synthesis bun run build",
    );
  }

  // Generated content is baked in at BUILD time — it does not stream. On 2026-08-13, 3,935 finished
  // hadith translations sat in web/public/ while prod served 1,746, because the build predated them.
  const publicNewest = await newestMtime(join(REPO, "web/public"));
  if (meta!.builtAt && publicNewest > meta!.builtAt) {
    const mins = Math.round((publicNewest - meta!.builtAt) / 60000);
    block(
      `BLOCKED — web/public/ changed ${mins} min AFTER this build (generated content is baked into\n` +
        "the bundle at build time, it does not stream). Deploying now ships the older copy and looks\n" +
        "entirely successful. Rebuild first:  VITE_ANSWER_MODE=synthesis bun run build",
    );
  }
}

/**
 * A gate command piped into head/tail reports the PIPE's exit code, not the gate's.
 *
 * Deliberately narrow: only the three commands whose exit code is load-bearing, and only when the
 * pipeline does not already capture PIPESTATUS. Warning on every pipe would train people to ignore
 * it, which is worse than not warning at all.
 */
const GATES = /\b(bun\s+run\s+typecheck|bun\s+test|bun\s+run\s+build|tsc\b)/;

function checkExitCode(cmd: string): void {
  if (!GATES.test(cmd)) return;
  if (!/\|\s*(tail|head)\b/.test(cmd)) return;
  if (/PIPESTATUS|pipefail/.test(cmd)) return;
  block(
    "BLOCKED — this pipes a gate command into head/tail, so $? is the PIPE's status and a FAILING\n" +
      "gate reads as a pass. (Observed 2026-08-13: `bun run typecheck | tail` printed an empty EXIT=.)\n" +
      "Redirect instead, then read the code:\n" +
      "  bun run typecheck > /tmp/tc.txt 2>&1; echo \"EXIT=$?\"; tail -20 /tmp/tc.txt",
  );
}

/**
 * Strip quoted spans before matching, so a command that merely MENTIONS a deploy is not treated as
 * one. Caught immediately in testing: the harness ran this guard against the very shell command that
 * was feeding it synthetic payloads, saw `wrangler deploy` inside a single-quoted JSON string, and
 * blocked it. A guard that fires on documentation, echoes, and its own test fixtures gets switched
 * off within a day, which costs more than the bug it prevents.
 *
 * Deliberately a lexical approximation and not a shell parser — the failure mode of a missed edge
 * case is one extra confirmable block, and the alternative is vendoring a parser into a seatbelt.
 *
 * ORDER IS LOAD-BEARING: heredocs are stripped BEFORE quotes. Stripping quotes first eats the
 * `'EOF'` delimiter of a `<<'EOF'` heredoc, which leaves its whole body exposed to the matchers —
 * caught when this guard blocked the very commit that was introducing it, because the commit message
 * described the deploy check it implements.
 */
const unquoted = (cmd: string): string =>
  cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\2/gm, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/"[^"]*"/g, " ");

async function main(): Promise<void> {
  let input: HookInput;
  try {
    input = JSON.parse(await Bun.stdin.text());
  } catch {
    process.exit(0); // unreadable payload → stay out of the way
  }
  const cmd = input!.tool_input?.command;
  if (input!.tool_name !== "Bash" || typeof cmd !== "string") process.exit(0);

  const bare = unquoted(cmd);
  checkExitCode(bare);
  if (/wrangler\s+deploy/.test(bare) && !/--dry-run/.test(bare)) await checkDeploy(bare);
  process.exit(0);
}

main().catch(() => process.exit(0)); // a broken guard must never be a broken workflow
