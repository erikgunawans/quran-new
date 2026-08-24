import { describe, expect, it } from "bun:test";
import { isProbeRequest, PROBE_HEADER } from "./probe-marker.ts";

const req = (headers: Record<string, string> = {}): Request =>
  new Request("https://new-quranku.axiara.ai/api/answer", { method: "POST", headers });

describe("isProbeRequest — an instrument declares itself, a reader does not", () => {
  it("is false for a reader's request, which carries no such header", () => {
    expect(isProbeRequest(req())).toBe(false);
  });

  it("is true for the value the probe actually sends", () => {
    expect(isProbeRequest(req({ [PROBE_HEADER]: "1" }))).toBe(true);
  });

  it("matches the header case-insensitively, because HTTP header names are", () => {
    expect(isProbeRequest(req({ "x-quranku-probe": "1" }))).toBe(true);
    expect(isProbeRequest(req({ "X-QURANKU-PROBE": "1" }))).toBe(true);
  });

  /**
   * PRESENCE IS NOT THE TEST, and this is the case that decides it.
   *
   * A proxy that appends bare headers, or a client that sets the name without a value, would send an
   * empty string. Treating presence as truth would silently stop logging genuine reader traffic for
   * everyone behind that proxy — the exact failure this module exists to prevent, inverted.
   */
  it("is false for an empty or whitespace-only value", () => {
    expect(isProbeRequest(req({ [PROBE_HEADER]: "" }))).toBe(false);
    expect(isProbeRequest(req({ [PROBE_HEADER]: "   " }))).toBe(false);
  });

  it("is false for any value that is not 1 — no truthiness, no opt-out by accident", () => {
    for (const v of ["0", "true", "yes", "probe", "11", "1x"]) {
      expect(isProbeRequest(req({ [PROBE_HEADER]: v }))).toBe(false);
    }
  });

  it("tolerates the surrounding whitespace a hand-written curl adds", () => {
    expect(isProbeRequest(req({ [PROBE_HEADER]: " 1 " }))).toBe(true);
  });
});
