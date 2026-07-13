#!/usr/bin/env bun
/**
 * Canonical corpus ingest.
 *
 *   bun run ingest        fetch (verify pins) → parse → gate → emit
 *   bun run ingest:lock   same, but re-pin source checksums (review the lockfile diff!)
 *   bun run verify        re-run the integrity gates against data/raw/ (no network)
 */
import { ingest, verify } from "./ingest/run.ts";

const [command, ...flags] = Bun.argv.slice(2);

try {
  switch (command) {
    case "ingest":
      await ingest({ updateLock: flags.includes("--update-lock") });
      break;
    case "verify":
      await verify();
      break;
    default:
      console.error(`Unknown command: ${command ?? "(none)"}\nUsage: ingest [--update-lock] | verify`);
      process.exit(2);
  }
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
