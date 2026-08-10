/**
 * Happy DOM registration for the seven DOM test suites, made abort-proof.
 *
 * The problem this exists to kill is a DIAGNOSTIC one, not a functional one. Bun runs every test
 * file in ONE process, and `GlobalRegistrator.register()` throws if the DOM is already registered.
 * Each suite used to call `register()` bare and `unregister()` in `afterAll`, which balances
 * perfectly — right up until any suite ABORTS at module scope. Then its `afterAll` never runs, the
 * DOM stays registered, and every later DOM suite dies with
 * `Failed to register. Happy DOM has already been globally registered.`
 *
 * That turns one legible red into eight illegible ones, and the seven innocent suites are the loud
 * part. The next person to hit a genuine failure in `peta.test.ts` goes hunting through Happy DOM
 * instead of reading the one error that actually mattered. Observed for real: a worktree missing its
 * `data/` and `node_modules` symlinks made the corpus-bearing suites throw at load, and the run came
 * back 890 pass / 10 fail / 10 err with the cause buried.
 *
 * The fix is NOT a `bunfig.toml` preload. A global preload forces a DOM onto every suite in the
 * repo, including the ones that want real Node globals, and it makes registration succeed so
 * uniformly that the abort itself stops being visible. This keeps the abort exactly as loud as it
 * was — the aborting file still fails, alone — and only stops it from poisoning its neighbours.
 *
 * Idempotent in both directions, so a suite that aborts before teardown costs one failure, not eight.
 */

import { GlobalRegistrator } from "@happy-dom/global-registrator";

/** Register Happy DOM unless a previous suite left it registered (i.e. it aborted before teardown). */
export function registerDom(): void {
  if (typeof globalThis.document !== "undefined") return;
  GlobalRegistrator.register();
}

/** Tear down, tolerating the case where the DOM is already gone. Safe to call from `afterAll`. */
export async function unregisterDom(): Promise<void> {
  if (typeof globalThis.document === "undefined") return;
  await GlobalRegistrator.unregister();
}
