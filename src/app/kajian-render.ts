/**
 * THE TWO BINARIES — everything in step 4 that cannot be unit-tested, kept in one small file so
 * `kajian-slide.ts` stays pure and its 30-odd assertions run without a browser.
 *
 * WHY `qrencode` AND NOT A LIBRARY. A QR is the whole point of ADR 6 — a printed URL on an image
 * buys nothing because nobody retypes it — so the encoder has to be one whose output is known-good.
 * `qrencode` is the reference C implementation, it emits SVG (which scales to any slide size with
 * no resampling), and it is already installed. A dependency would be a new supply-chain surface for
 * a tool that runs on one laptop.
 *
 * WHY SYSTEM CHROME AND NOT PUPPETEER. Same reasoning, plus this repo already drives real Chrome
 * for verification. `--headless --screenshot` is a two-decade-stable interface with no node_modules.
 *
 * ⚠ THE `--user-data-dir` IS NOT OPTIONAL. Erik runs Chrome with the Interceptor extension
 * attached, and a headless run against the default profile can lock the profile out from under a
 * live browsing session. Every invocation gets a throwaway directory.
 *
 * ⚠ EVERY SPAWN TAKES AN ARGUMENT ARRAY, never a shell string. The URL is whatever came back from
 * YouTube.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sanitizeQrSvg } from "./kajian-slide.ts";

const QRENCODE = "qrencode";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Slide canvas, in CSS pixels. Must match `--qs-w` / `--qs-h`.
 *
 * LANDSCAPE since 2026-08-23 (ISC-624). The portrait 1080x1350 it replaces was a single column;
 * Erik's reference is two panels, and panels need width.
 *
 * ⚠ THIS IS ALSO THE RESPONSIVE SWITCH, which is why it has to stay in step with the tokens.
 * `kajian-slide.ts` carries no media query at all — `.qs-slide` takes `min(var(--qs-h), 100dvh)`
 * and a wrapping flex row — so the document is the fixed canvas ONLY because Chrome is handed a
 * window exactly this size. Change one of these four numbers without the other three and the
 * screenshot silently captures the phone layout instead.
 */
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

/**
 * A QR for `url`, ready to inline.
 *
 * `-m 2` keeps a two-module quiet zone in the SVG itself; the stylesheet adds padding on top, so
 * the scanner has margin even if a future design tightens the box. Error level M survives a logo
 * or a thumb over one corner, which is what actually happens to a posted slide.
 */
export function qrSvg(url: string): string {
  const proc = Bun.spawnSync([QRENCODE, "-t", "SVG", "-o", "-", "-m", "2", "-s", "4", "--level=M", url], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) {
    throw new Error(
      `qrencode failed (exit ${proc.exitCode}): ${proc.stderr.toString().trim() || "no stderr"}\n` +
        `  Install it with: brew install qrencode`,
    );
  }
  return sanitizeQrSvg(proc.stdout.toString());
}

export interface RenderOptions {
  /** Device pixel ratio. 2 gives a 3840x2160 PNG, which is what a feed actually wants. */
  readonly scale?: number;
  readonly timeoutMs?: number;
}

/**
 * Screenshot `htmlPath` to `pngPath`.
 *
 * Chrome writes the file itself, so success is asserted on the FILE, not on the exit code —
 * headless Chrome has a long history of exiting zero after failing to paint, and a missing or
 * zero-length PNG downstream would surface as a broken post rather than an error here.
 */
export function renderPng(htmlPath: string, pngPath: string, opts: RenderOptions = {}): void {
  const scale = opts.scale ?? 2;
  const profile = mkdtempSync(join(tmpdir(), "kajian-chrome-"));
  try {
    const proc = Bun.spawnSync(
      [
        CHROME,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profile}`,
        `--force-device-scale-factor=${scale}`,
        `--window-size=${SLIDE_WIDTH},${SLIDE_HEIGHT}`,
        `--screenshot=${pngPath}`,
        `file://${htmlPath}`,
      ],
      { stdout: "pipe", stderr: "pipe", timeout: opts.timeoutMs ?? 60_000 },
    );

    const png = Bun.file(pngPath);
    if (!png.size) {
      throw new Error(
        `Chrome produced no screenshot at ${pngPath} (exit ${proc.exitCode}).\n` +
          `${proc.stderr.toString().trim()}`,
      );
    }
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}
