/**
 * ARM F, CYCLE 22 — the never-activated tab, with the guard Cycle 21 did not have.
 *
 *   bun .planning/armF-poll.ts
 *
 * WHAT CYCLE 21 GOT WRONG. `interceptor read` follows the tab Interceptor is currently targeting,
 * NOT a tab id — there is no `read --tab <id>`. So when another tab became the target, the poller
 * silently changed subject and read `file:///…/Story-Maker-Commercial-Case.html` with `elems=0`,
 * which scored as `opacity0=0`: a clean-looking null over a page that has no verses at all. The
 * `url=` column was the only reason it was caught, and it was caught by a human reading the log
 * afterwards rather than by the poller refusing to count.
 *
 * THE RULE THIS FILE IMPLEMENTS: assert the target, and ABORT on mismatch — never score the sample.
 * A hijacked sample is not a zero; it is an absence of measurement, and the two must never be
 * written to the same column.
 *
 * THREE GUARDS, because `read --json` carries NO url and NO tabId — the sample itself is unlabelled,
 * so any url check is a SEPARATE call and therefore racy:
 *
 *   1. `state` url BEFORE the read.
 *   2. `state` url AFTER the read. Together these bound the race to the width of one read call; a
 *      hijack landing mid-read is caught by the after-check rather than silently scored.
 *   3. AN INTRINSIC CONTENT ASSERTION on the sample itself — the surah name and a floor on element
 *      count. This is the only guard a race cannot defeat, because it reads the bytes that were
 *      actually scored rather than a second call that might describe a different tab. Guard 3 is
 *      what makes 1 and 2 belt-and-braces instead of load-bearing.
 *
 * ⚠ THE TAB MUST NEVER BE ACTIVATED. If the blank state is a frozen CSS animation, activating the
 * tab resumes it and `qkin` completes to opacity 1 in 320 ms — so a post-activation reading cannot
 * tell "never stranded" from "stranded, healed by the reveal". `read` is a read path and reaches a
 * background tab; `eval` silently NO-OPS on one, which is why this uses `read --include-style`.
 */
const EXPECTED = "https://new-quranku.axiara.ai/#/surah/3";
const SURAH_MARKER = "Ali 'Imran";
const MIN_ELEMS = 100;
const INTERVAL_MS = 10 * 60 * 1000;
const MAX_SAMPLES = 96; // 16 h
const LOG = ".planning/armF-cycle22.log";
const KEEP_DIR = ".planning";

const run = async (args: readonly string[]): Promise<string> => {
  const p = Bun.spawn(["interceptor", ...args], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  await p.exited;
  // NOT `signalCode !== null` — Bun leaves it undefined on a clean exit, so that test fires always.
  if (p.exitCode !== 0) throw new Error(`interceptor ${args[0]} exit ${p.exitCode}`);
  return out;
};

const stateUrl = async (): Promise<string> => {
  const raw = await run(["state", "--json"]);
  const m = raw.match(/"url":\s*"([^"]*)"/);
  return m?.[1] ?? "";
};

const stamp = (): string => new Date().toISOString().replace("T", " ").slice(0, 19);
const append = async (line: string): Promise<void> => {
  await Bun.write(LOG, (await Bun.file(LOG).exists() ? await Bun.file(LOG).text() : "") + line + "\n");
  console.log(line);
};

const abort = async (why: string, detail: string): Promise<never> => {
  await append(`${stamp()} | ABORT | ${why} | ${detail}`);
  process.exit(2);
};

await append(`${stamp()} | START | expected=${EXPECTED} | interval=${INTERVAL_MS / 60000}min max=${MAX_SAMPLES}`);

for (let n = 1; n <= MAX_SAMPLES; n++) {
  const before = await stateUrl();
  if (before !== EXPECTED) await abort("url before read", `got=${before}`);

  const raw = await run(["read", "--include-style", "--json"]);

  const after = await stateUrl();
  if (after !== EXPECTED) await abort("url after read", `got=${after}`);

  // Guard 3 — intrinsic. These bytes ARE the sample; no race can put another page here.
  if (!raw.includes(SURAH_MARKER)) await abort("surah marker absent from sample", `want=${SURAH_MARKER}`);

  const ops = [...raw.matchAll(/opacity=([0-9.]+)/g)].map((m) => Number(m[1]));
  const elems = ops.length;
  if (elems < MIN_ELEMS) await abort("element floor", `elems=${elems} < ${MIN_ELEMS}`);

  const opacity0 = ops.filter((o) => o === 0).length;
  const sub1 = ops.filter((o) => o < 1).length;
  const hidden = [...raw.matchAll(/visibility=hidden/g)].length;

  const line =
    `${stamp()} | url=${EXPECTED} | elems=${elems} | opacity0=${opacity0} | opacity_sub1=${sub1} | vis_hidden=${hidden}`;
  await append(line);

  // A clean sample self-deletes; a REPRODUCTION is kept, because it is the thing two cycles chased.
  if (opacity0 > 0 || sub1 > 0 || hidden > 0) {
    const path = `${KEEP_DIR}/armF-c22-s${n}.json`;
    await Bun.write(path, raw);
    await append(`${stamp()} | KEPT | ${path} | REPRODUCTION — non-zero opacity/visibility`);
  }

  if (n < MAX_SAMPLES) await Bun.sleep(INTERVAL_MS);
}
await append(`${stamp()} | DONE | ${MAX_SAMPLES} samples, no abort`);
