/**
 * Write the kajian runner's LaunchAgent descriptor. `bun run kajian:agent`.
 *
 * ── IT WRITES THE FILE AND STOPS THERE ──────────────────────────────────────────────────────────
 *
 * Loading the agent starts a process that polls production and spends model tokens on every job it
 * claims. Writing an inert plist is reversible with `rm`; starting a background consumer of a live
 * queue is a decision with a bill attached, so the two `launchctl` lines are PRINTED for a human to
 * run, never executed here.
 *
 * ── EVERY PATH IS DISCOVERED, NONE IS BAKED IN ──────────────────────────────────────────────────
 *
 * launchd needs absolute paths — it reads no shell profile, so `bun` is not on its PATH, and it
 * starts a job in `/` unless told otherwise. Those absolutes are resolved HERE, at install time, on
 * the machine that will run it. Nothing absolute is committed to the repository.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_LABEL, launchAgentPlist, plistPath } from "./kajian-agent.ts";

const HOME = homedir();
// Off this file's own location, not off cwd: `bun run` from a subdirectory must still produce a
// plist whose WorkingDirectory is the repo root, since the runner resolves `.scratch/` off cwd.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG_DIR = join(HOME, "Library", "Logs", "quranku");

/**
 * Where `bun` actually is. `process.execPath` is the binary running this script, which is the one
 * the user just invoked — a truer answer than a guess at `~/.bun/bin/bun`, and correct for a bun
 * installed by Homebrew, by mise, or anywhere else.
 */
const BUN = process.execPath;

// The two files the agent will source at every start. Their ABSENCE is checked now as well as at
// run time, because "the agent is loaded and the queue never drains" is a far more expensive way to
// discover a missing .env.runner than a line printed during install.
const missing = [".env", ".env.runner"].filter((f) => !existsSync(join(REPO_ROOT, f)));

const target = plistPath(HOME);
mkdirSync(dirname(target), { recursive: true });
mkdirSync(LOG_DIR, { recursive: true });
writeFileSync(target, launchAgentPlist({ repoRoot: REPO_ROOT, logDir: LOG_DIR, bun: BUN }), {
  mode: 0o644,
});

console.log(`wrote ${target}`);
console.log(`  working directory  ${REPO_ROOT}`);
console.log(`  bun                ${BUN}`);
console.log(`  logs               ${LOG_DIR}/kajian-runner.{out,err}.log`);

if (missing.length > 0) {
  console.log("");
  console.log(`⚠ ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} missing from ${REPO_ROOT}.`);
  console.log("  The agent refuses to exec without them (exit 78) rather than polling into a 403.");
}

console.log("");
console.log("The plist is inert until you load it. To start the runner and keep it running:");
console.log(`  launchctl bootstrap gui/$(id -u) ${target}`);
console.log("");
console.log("To stop it and leave nothing behind:");
console.log(`  launchctl bootout gui/$(id -u)/${AGENT_LABEL}`);
console.log("");
console.log("To see whether it is alive (the middle column is the last exit code):");
console.log(`  launchctl list | grep ${AGENT_LABEL}`);
