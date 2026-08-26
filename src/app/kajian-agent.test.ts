/**
 * The supervision descriptor for the kajian runner.
 *
 * `src/app/kajian-runner.ts` already survives everything it can survive on its own: its poll loop
 * catches network blips and pipeline deaths and keeps going. What it cannot survive is the SHELL
 * EXITING — the process is a foreground job and dies with the terminal, and with a logout, and with
 * a reboot. This module produces the launchd descriptor that closes exactly that gap, so what is
 * tested here is the handful of fields whose absence would be silent rather than loud.
 */
import { describe, expect, test } from "bun:test";
import { launchAgentPlist, AGENT_LABEL, type AgentPaths } from "./kajian-agent.ts";

const PATHS: AgentPaths = {
  repoRoot: "/Users/someone/quran-new",
  logDir: "/Users/someone/Library/Logs/quranku",
};

describe("the plist carries no credential of any kind", () => {
  test("it names the env files rather than inlining what they hold", () => {
    const plist = launchAgentPlist(PATHS);
    // The whole point of the sourcing shape: the secret stays in a 0600 file that launchd never
    // reads. A plist is world-readable in ~/Library/LaunchAgents and is backed up with the home
    // directory, so a secret pasted in here would leak by two routes at once.
    expect(plist).toContain(". ./.env.runner");
    expect(plist).not.toContain("QK_RUNNER_SECRET=");
    expect(plist).not.toContain("OPENROUTER_API_KEY=");
  });

  test("there is no EnvironmentVariables block to tempt anyone into pasting one in", () => {
    expect(launchAgentPlist(PATHS)).not.toContain("EnvironmentVariables");
  });
});

describe("the fields whose absence fails silently", () => {
  test("WorkingDirectory is the repo root, because both scripts resolve .scratch/ off cwd", () => {
    // `resolve(".scratch/kajian")` in BOTH kajian-runner.ts and kajian.ts. Started from `/` by
    // launchd, the runner would look for artefacts under `/.scratch` and report "pipeline reported
    // success but produced no slide.html" — a failure that names the wrong cause entirely.
    const plist = launchAgentPlist(PATHS);
    expect(plist).toContain("<key>WorkingDirectory</key>");
    expect(plist).toContain(`<string>${PATHS.repoRoot}</string>`);
  });

  test("KeepAlive restarts a runner that dies; RunAtLoad brings it up at login", () => {
    const plist = launchAgentPlist(PATHS);
    expect(plist).toMatch(/<key>KeepAlive<\/key>\s*<true\s*\/>/);
    expect(plist).toMatch(/<key>RunAtLoad<\/key>\s*<true\s*\/>/);
  });

  test("ThrottleInterval is at least 10s, so a runner that cannot start does not spin", () => {
    // Without it launchd respawns a process that exits immediately as fast as it can. A missing
    // .env.runner would become a hot loop against the Worker's 403, which is both a cost and a
    // sustained failed-auth signal against prod.
    const m = /<key>ThrottleInterval<\/key>\s*<integer>(\d+)<\/integer>/.exec(launchAgentPlist(PATHS));
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(10);
  });

  test("stdout and stderr are captured to files, or every reason the runner prints is lost", () => {
    const plist = launchAgentPlist(PATHS);
    expect(plist).toContain(`${PATHS.logDir}/kajian-runner.out.log`);
    expect(plist).toContain(`${PATHS.logDir}/kajian-runner.err.log`);
  });

  test("bun is invoked by absolute path — launchd sources no shell profile", () => {
    // `bun` is on PATH only because ~/.bun/bin is added by .zshrc, which launchd never reads.
    const plist = launchAgentPlist({ ...PATHS, bun: "/Users/someone/.bun/bin/bun" });
    expect(plist).toContain("/Users/someone/.bun/bin/bun");
  });
});

describe("the env files are sourced, and a missing one is loud", () => {
  test("both .env and .env.runner are sourced with allexport around them", () => {
    const plist = launchAgentPlist(PATHS);
    // `set -a` is what turns `KEY=value` lines into exported variables the child process inherits.
    // Sourcing without it leaves them as shell locals and `runnerConfig` refuses to start — which
    // at least fails loudly, but for the wrong stated reason.
    expect(plist).toContain("set -a");
    expect(plist).toContain(". ./.env");
    expect(plist).toContain("set +a");
  });

  test("the command aborts before exec if an env file is missing", () => {
    // Sourcing a missing file under `sh` prints an error and CARRIES ON. The runner would then
    // start with no secret, be refused by its own config check, exit 2, and be restarted by
    // KeepAlive for ever. Better to never reach exec.
    const plist = launchAgentPlist(PATHS);
    expect(plist).toMatch(/\[ -r \.\/\.env\.runner \]/);
  });
});

describe("the label", () => {
  test("is reverse-DNS and stable, because it is the handle for unloading", () => {
    // Lowercase, dotted, no spaces and no path separator — a label with either is accepted by
    // `launchctl bootstrap` and then cannot be addressed by `launchctl bootout`.
    expect(AGENT_LABEL).toMatch(/^[a-z0-9.-]+$/);
    expect(AGENT_LABEL.split(".").length).toBeGreaterThanOrEqual(3);
    expect(launchAgentPlist(PATHS)).toContain(`<string>${AGENT_LABEL}</string>`);
  });
});

describe("XML escaping, because a path is not markup", () => {
  test("a repo root containing & or < does not corrupt the document", () => {
    // launchd rejects a malformed plist with "Could not read plist" and no hint as to which field.
    const plist = launchAgentPlist({ ...PATHS, repoRoot: "/Users/a&b/q<uran>" });
    expect(plist).toContain("/Users/a&amp;b/q&lt;uran&gt;");
    expect(plist).not.toContain("/Users/a&b/q<uran>");
  });
});
