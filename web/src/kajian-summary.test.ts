/**
 * Tests for the Rangkuman Kajian surface.
 *
 * The escaping tests are not ceremony. `esc.ts` records that its injection risk is "theoretical"
 * because scripture and translator names come from a pinned corpus; this module is the first to put
 * THIRD-PARTY, UPLOADER-CONTROLLED strings (a YouTube title, channel and speaker) into `innerHTML`.
 * So the escape is asserted against a real payload, and the `href` restriction against a real
 * `javascript:` URL, rather than trusted because the helper exists.
 */

import { describe, expect, test } from "bun:test";
import {
  kajianCard,
  formatDuration,
  safeHttpUrl,
  safeArtifactUrl,
  AUDIO_NOTE,
  PROVENANCE_NOTE,
  type KajianSummary,
} from "./kajian-summary.ts";

const BASE: KajianSummary = {
  id: "tujuh-tanda-kebodohan",
  videoId: "abc123",
  url: "https://www.youtube.com/watch?v=abc123",
  title: "TUJUH TANDA KEBODOHAN",
  channel: "Masjid Al-Amanah Kota Harapan",
  speaker: "Ustadz Fulan Hamid, L.C., M.A.",
  publishedAt: "2026-08-01",
  durationSec: 3725,
  thumbUrl: "https://i.ytimg.com/vi/abc123/hq.jpg",
  summaryUrl: "https://new-quranku.axiara.ai/kajian/abc123/ui-summary.html",
  audioUrl: "https://new-quranku.axiara.ai/kajian/abc123/audio.mp3",
  generatedAt: "2026-08-23T00:00:00Z",
  reviewed: false,
};

describe("untrusted metadata never reaches the DOM unescaped", () => {
  test("a script tag in the TITLE is escaped", () => {
    const html = kajianCard({ ...BASE, title: `<script>alert(1)</script>` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("a breakout attempt in the CHANNEL is escaped", () => {
    const html = kajianCard({ ...BASE, channel: `" onerror="alert(1)` });
    expect(html).not.toContain(`onerror="alert(1)"`);
    expect(html).toContain("&quot;");
  });

  test("a script tag in the SPEAKER is escaped", () => {
    // The speaker is the field Erik's 2026-08-23 ruling newly admits from video metadata, so it is
    // newly attacker-reachable. Asserted separately for that reason.
    const html = kajianCard({ ...BASE, speaker: `<img src=x onerror=alert(1)>` });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

describe("href values are restricted to http(s)", () => {
  test("a javascript: summary URL drops the whole card", () => {
    // eslint-disable-next-line no-script-url
    const html = kajianCard({ ...BASE, summaryUrl: "javascript:alert(1)" });
    expect(html).toBe("");
  });

  test("a javascript: video URL drops only the source link, keeping the card", () => {
    const html = kajianCard({ ...BASE, url: "javascript:alert(1)" });
    expect(html).not.toContain("javascript:");
    expect(html).toContain("kajian-card");
    expect(html).not.toContain("Video asli");
  });

  test("safeHttpUrl accepts http and https, rejects everything else", () => {
    expect(safeHttpUrl("https://example.com/a")).not.toBeNull();
    expect(safeHttpUrl("http://example.com/a")).not.toBeNull();
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});

describe("the held provenance label", () => {
  test("says the summary is machine-written and unreviewed", () => {
    // Erik's 2026-08-22 ruling: must not be softened, made conditional, or removed.
    expect(PROVENANCE_NOTE).toContain("ditulis oleh mesin");
    expect(PROVENANCE_NOTE).toContain("belum diperiksa ulama");
  });

  test("states the speaker name is a source pointer, not an endorsement", () => {
    // This is the sentence that keeps naming the speaker from becoming speaking FOR him.
    expect(PROVENANCE_NOTE).toContain("bukan tanda bahwa beliau menulis");
  });

  test("an unreviewed card carries its own marker", () => {
    expect(kajianCard(BASE)).toContain("Belum diperiksa");
    expect(kajianCard({ ...BASE, reviewed: true })).not.toContain("Belum diperiksa");
  });
});

describe("speaker absence renders as absence", () => {
  test("a null speaker emits no speaker element", () => {
    expect(kajianCard({ ...BASE, speaker: null })).not.toContain("kajian-speaker");
  });

  test("a whitespace-only speaker is treated as absent, not printed blank", () => {
    expect(kajianCard({ ...BASE, speaker: "   " })).not.toContain("kajian-speaker");
  });
});

describe("formatDuration", () => {
  test("renders hours only when there are hours", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(0)).toBe("0:00");
  });

  test("refuses nonsense rather than printing NaN", () => {
    expect(formatDuration(Number.NaN)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });
});


describe("the card survives the urls the WORKER ACTUALLY RETURNS", () => {
  /**
   * ⚠ `BASE` ABOVE IS NOT THIS SHAPE, AND THAT IS WHY THIS BUG SHIPPED. Every fixture in this file
   * and in `kajian-feed.test.ts` uses an absolute `https://…` url. The upload endpoint answers with
   * `artifactPath()` — `/kajian/{videoId}/{name}` — so the suite was green against a shape the
   * runner never produces, while `safeHttpUrl` rejected every real one and `kajianCard` returned
   * "" for every published card. These values are copied from `artifactPath`, not invented.
   */
  const SERVED: KajianSummary = {
    ...BASE,
    thumbUrl: "/kajian/aaaaaaaaaaa/slide.png",
    summaryUrl: "/kajian/aaaaaaaaaaa/slide.html",
    audioUrl: "/kajian/aaaaaaaaaaa/short.m4a",
  };

  test("a card built from served paths is rendered at all", () => {
    // The assertion that would have caught it: not "the badge is present" but "the card exists".
    expect(kajianCard(SERVED)).not.toBe("");
  });

  test("the summary link and the thumbnail point at the served paths", () => {
    const html = kajianCard(SERVED);
    expect(html).toContain(`href="/kajian/aaaaaaaaaaa/slide.html"`);
    expect(html).toContain(`src="/kajian/aaaaaaaaaaa/slide.png"`);
  });

  test("the path is rendered RELATIVE — no deployment hostname is baked into the markup", () => {
    expect(kajianCard(SERVED)).not.toContain("artifact.invalid");
  });

  test("an absolute url still works, so a bucket-hosted future is not broken", () => {
    expect(kajianCard(BASE)).not.toBe("");
  });
});

describe("safeArtifactUrl accepts our own paths and nothing that leaves this origin", () => {
  test("a served artefact path is accepted and returned unchanged", () => {
    expect(safeArtifactUrl("/kajian/aaaaaaaaaaa/short.m4a")).toBe("/kajian/aaaaaaaaaaa/short.m4a");
  });

  test("absolute http(s) is still accepted", () => {
    expect(safeArtifactUrl("https://cdn.example/x.m4a")).not.toBeNull();
  });

  test.each([
    ["protocol-relative", "//evil.example/x.m4a"],
    // MEASURED, not assumed: WHATWG treats the backslash as a slash, so this resolves to origin
    // `https://evil.example`. A `startsWith("/") && !startsWith("//")` guard passes it.
    ["the backslash form of protocol-relative", "/\\evil.example/x.m4a"],
    ["javascript:", "javascript:alert(1)"],
    ["a data: url", "data:audio/mp4;base64,AAA"],
    ["path traversal that normalises away", "/kajian/../../etc/passwd"],
    ["the bare root", "/"],
    ["the empty string", ""],
    ["a bare relative name with no leading slash", "short.m4a"],
  ])("%s is refused", (_case, raw) => {
    expect(safeArtifactUrl(raw)).toBeNull();
  });
});

describe("the play button (ISC-624.8) — Erik ruled 2026-08-24 that it lives on the CARD", () => {
  const WITH_AUDIO: KajianSummary = { ...BASE, audioUrl: "/kajian/aaaaaaaaaaa/short.m4a" };

  test("a real control is rendered, not a badge saying one exists", () => {
    const html = kajianCard(WITH_AUDIO);
    expect(html).toContain("<audio");
    expect(html).toContain(`src="/kajian/aaaaaaaaaaa/short.m4a"`);
    expect(html).toContain("controls");
  });

  test("it is labelled, because a bare native control announces only its role", () => {
    expect(kajianCard(WITH_AUDIO)).toContain("aria-label=");
  });

  test("it does not preload — a grid of cards must not fetch every narration on load", () => {
    expect(kajianCard(WITH_AUDIO)).toContain(`preload="none"`);
  });

  test("the machine-voice line rides WITH the control, not only at the top of the page", () => {
    // ADR 6's reason for one fixed voice is that a listener must never hear the summary as the
    // scholar speaking — and this control sits directly under a line naming him. The page-level
    // PROVENANCE_NOTE is already scrolled past by someone who came to press play.
    const html = kajianCard(WITH_AUDIO);
    expect(html).toContain(AUDIO_NOTE);
    expect(AUDIO_NOTE).toContain("bukan suara penceramah");
  });

  test("no audio means NO control at all — never a dead player", () => {
    const html = kajianCard({ ...BASE, audioUrl: null });
    expect(html).not.toContain("<audio");
    expect(html).not.toContain(AUDIO_NOTE);
    expect(html).not.toBe("");
  });

  test("an unusable audio url drops the control but keeps the card", () => {
    const html = kajianCard({ ...BASE, audioUrl: "javascript:alert(1)" });
    expect(html).not.toContain("<audio");
    expect(html).not.toContain("javascript:");
    expect(html).not.toBe("");
  });

  test("the audio element is OUTSIDE the card's link — a control nested in an anchor is a trap", () => {
    const html = kajianCard(WITH_AUDIO);
    const linkEnd = html.indexOf("</a>");
    const audioAt = html.indexOf("<audio");
    expect(linkEnd).toBeGreaterThan(-1);
    expect(audioAt).toBeGreaterThan(linkEnd);
  });
});
