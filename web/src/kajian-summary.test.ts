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
