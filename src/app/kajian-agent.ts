/**
 * Supervision for the kajian runner — the piece that makes the queue drain unattended.
 *
 * ── WHAT WAS ACTUALLY MISSING ───────────────────────────────────────────────────────────────────
 *
 * Not a poll loop. `kajian-runner.ts` already has one, and it already survives everything a runner
 * can survive by itself: a network blip, a Worker restart, a pipeline that segfaults. What it does
 * not survive is the SHELL EXITING. It is a foreground process started by hand, so it dies with the
 * terminal, with a logout, and with a reboot — and a queue whose consumer is dead looks exactly
 * like a queue nobody has clicked Summarize on.
 *
 * So this generates a launchd LaunchAgent: `RunAtLoad` brings the runner up at login, `KeepAlive`
 * brings it back when it dies, and `ThrottleInterval` stops a runner that CANNOT start from
 * hammering prod's 403 in a tight respawn loop.
 *
 * ── WHY LOCAL, AND NOT CLOUD RUN ────────────────────────────────────────────────────────────────
 *
 * Measured, not assumed, and the measurements are in `docs/runbooks/kajian-runner.md`: YouTube
 * refuses a transcript to a datacentre IP on Cloudflare (429 at the first request) AND on Cloud Run
 * (a 200 page, then the bot wall inside `yt-dlp`). Erik's residential IP is the only arm that
 * returns captions. A hosted runner therefore needs residential egress — cookies or a paid proxy —
 * which is his decision and his money, and it gates the HOSTED case only. Local supervision needs
 * neither, so it is the part that can be built today, and it is the runbook's own recommendation.
 *
 * The cost, stated plainly rather than glossed: the machine has to be awake and logged in. This
 * buys survival of the shell, not survival of a closed lid.
 *
 * ── THE PLIST HOLDS NO SECRET ───────────────────────────────────────────────────────────────────
 *
 * `~/Library/LaunchAgents` is world-readable and rides along in every home-directory backup, so the
 * runner's bearer token must not be in there. launchd is handed a `sh -c` that SOURCES `.env` and
 * `.env.runner` (mode 0600, gitignored) at start. The credential stays in the one file that already
 * holds it. There is deliberately no `EnvironmentVariables` block — its absence is the guardrail.
 */

/** The handle for `launchctl bootout`. Changing it orphans any agent already loaded. */
export const AGENT_LABEL = "ai.axiara.quranku.kajian-runner";

/** Seconds launchd waits before respawning. See the tight-loop note above. */
const THROTTLE_SECONDS = 30;

export interface AgentPaths {
  /** Absolute path to the repository root. Load-bearing: see `WorkingDirectory` below. */
  repoRoot: string;
  /** Absolute directory for the two log files. Created by the installer, not by launchd. */
  logDir: string;
  /** Absolute path to the `bun` binary. launchd reads no shell profile, so PATH will not have it. */
  bun?: string;
}

/** Escape for an XML text node. A path is data; `&` and `<` in one would make the plist unreadable. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The shell command launchd runs.
 *
 * `[ -r … ] || exit 78` before anything else: sourcing a missing file under `sh` prints an error and
 * CARRIES ON, so without the guard the runner would start with no secret, be refused by its own
 * `runnerConfig` check, exit 2, and be restarted for ever by `KeepAlive`. 78 is `EX_CONFIG`, which
 * says "misconfigured" rather than "crashed" to anyone reading the log.
 *
 * `set -a` around the sourcing is what exports the assignments into the child. Without it they are
 * shell locals, the runner sees no `QK_RUNNER_SECRET`, and it refuses to start — loudly, but naming
 * the wrong cause.
 */
function runnerCommand(bun: string): string {
  return [
    "[ -r ./.env ] || { echo 'kajian-agent: ./.env is missing or unreadable' >&2; exit 78; }",
    "[ -r ./.env.runner ] || { echo 'kajian-agent: ./.env.runner is missing or unreadable' >&2; exit 78; }",
    "set -a",
    ". ./.env",
    ". ./.env.runner",
    "set +a",
    `exec ${bun} run src/app/kajian-runner.ts`,
  ].join("\n");
}

/** The LaunchAgent descriptor, as the XML launchd parses. */
export function launchAgentPlist(paths: AgentPaths): string {
  const bun = paths.bun ?? "bun";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(AGENT_LABEL)}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-c</string>
    <string>${xml(runnerCommand(bun))}</string>
  </array>

  <!-- Both kajian-runner.ts and kajian.ts call resolve(".scratch/kajian"). Started from / by
       launchd, the runner would hunt artefacts under /.scratch and fail with a reason that names
       the wrong cause. -->
  <key>WorkingDirectory</key>
  <string>${xml(paths.repoRoot)}</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>ThrottleInterval</key>
  <integer>${THROTTLE_SECONDS}</integer>

  <!-- Without these, everything the runner prints — including every failure reason it was written
       to surface — goes to /dev/null. -->
  <key>StandardOutPath</key>
  <string>${xml(paths.logDir)}/kajian-runner.out.log</string>
  <key>StandardErrorPath</key>
  <string>${xml(paths.logDir)}/kajian-runner.err.log</string>
</dict>
</plist>
`;
}

/** Where the descriptor is written. `launchctl` only looks here for a per-user agent. */
export function plistPath(home: string): string {
  return `${home}/Library/LaunchAgents/${AGENT_LABEL}.plist`;
}
