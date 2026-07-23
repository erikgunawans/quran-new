/**
 * Carrying a verse out of Nur.
 *
 * THE EGRESS CONTRACT
 * -------------------
 * This is the sharpest theological risk in the whole product, and it is worth stating plainly:
 *
 *   The primary rendering is an INTERPRETATION. If it leaves this app captioned "the Qur'an
 *   says…", we have laundered a man's reading of scripture into scripture itself.
 *
 * Inside the corpus, `literal_companion` is a build gate — the interpretive primary may never
 * ship without the Kemenag literal beside it, and the build fails if it tries. But a gate that
 * only guards the *inside* of the app is worthless the moment a verse is copied out of it. So
 * the same invariant is enforced here, on egress:
 *
 *   1. Both renderings always travel together.
 *   2. The interpretive one is LABELLED interpretive ("Terjemahan makna"), never as the Qur'an's
 *      own words.
 *   3. Every rendering names its translator.
 *
 * A verse that reaches someone else should be passable onward without becoming a lie.
 * Indonesians share in WhatsApp, so the payload is plain text that reads well as plain text.
 */
import { renderVerseCardImage } from "./share-image.ts";
import type { VerseCard } from "./verse.ts";

/** Format a verse for the outside world. Plain text, WhatsApp-shaped, honestly labelled. */
export function shareText(v: VerseCard): string {
  // A conditionally-approved verse travels only inside the passage it was approved in. On screen the
  // card enforces "tampilkan bersama"; here the same condition is enforced on egress, because a gate
  // that guards only the inside of the app is worthless the moment a verse is copied out — and share
  // is the one path where a stripped verse can never be corrected.
  if (v.passage?.length) return passageShareText(v);

  const lines: string[] = [`QS ${v.surah_name} ${v.ref}`, "", v.arabic, ""];

  if (v.primary) {
    lines.push(`Terjemahan makna (${v.primary.translator}):`, v.primary.text, "");
  }
  if (v.companion) {
    lines.push(`Terjemahan harfiah (${v.companion.translator}):`, v.companion.text, "");
  }

  lines.push("— dibagikan lewat New-Quranku");
  return lines.join("\n");
}

/**
 * The passage form of `shareText` — the whole approved range, in mushaf order.
 *
 * Mirrors the card (`verse.ts` `passageEl`): the captioned subject keeps its full dual rendering,
 * both translations labelled and each translator named; the surrounding ayat carry the Arabic and
 * the interpretive reading only, never our caption, because our sentence belongs to the one verse it
 * was written for. The reader who receives this gets the same "shown together" the scholar required,
 * not an ayah lifted out of it.
 */
function passageShareText(v: VerseCard): string {
  const rows = [...(v.passage ?? [])].sort((a, b) => a.ayah - b.ayah);
  const first = rows[0]?.ayah ?? v.ayah;
  const last = rows[rows.length - 1]?.ayah ?? v.ayah;
  const lines: string[] = [`QS ${v.surah_name} ${v.surah}:${first}-${last}`, ""];

  for (const p of rows) {
    lines.push(`(${v.surah}:${p.ayah})`, p.arabic, "");
    if (p.ayah === v.ayah) {
      if (v.primary) lines.push(`Terjemahan makna (${v.primary.translator}):`, v.primary.text, "");
      if (v.companion) lines.push(`Terjemahan harfiah (${v.companion.translator}):`, v.companion.text, "");
    } else if (p.primary) {
      lines.push(p.primary.text, "");
    }
  }

  lines.push("— dibagikan lewat New-Quranku");
  return lines.join("\n");
}

export type ShareOutcome = "shared" | "copied" | "failed";

/** Web Share where the platform has it (Android does), clipboard everywhere else. */
export async function shareVerse(v: VerseCard): Promise<ShareOutcome> {
  const text = shareText(v);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `QS ${v.surah_name} ${v.ref}`, text });
      return "shared";
    } catch (err) {
      // The user dismissing the share sheet is not a failure — say nothing and stop.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Anything else: fall through to the clipboard rather than leave them with nothing.
    }
  }

  return (await copyVerse(v)) ? "copied" : "failed";
}

export async function copyVerse(v: VerseCard): Promise<boolean> {
  const text = shareText(v);

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Android WebViews, and any non-secure context, have no clipboard API.
    return legacyCopy(text);
  }
}

function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
  document.body.append(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImageShareOutcome = "shared" | "downloaded" | "failed";

/**
 * Carry a verse out as a rendered image — Ayah's "hold to interact" pattern, ADDITIVE to
 * `shareVerse()`/`copyVerse()` above, never a replacement for them. `renderVerseCardImage`
 * itself already refuses to produce a blob when the literal companion is missing, so this
 * function inherits the egress contract rather than re-checking it.
 */
export async function shareVerseImage(v: VerseCard): Promise<ImageShareOutcome> {
  // A conditional verse has no faithful single-card image (see `renderVerseCardImage`), so the image
  // button degrades to the plain-text share, which carries the whole approved passage. The reader
  // still gets something to send; they just get it in the form that keeps the context intact.
  if (v.passage?.length) {
    const outcome = await shareVerse(v);
    return outcome === "failed" ? "failed" : "shared";
  }

  const blob = await renderVerseCardImage(v);
  if (!blob) return "failed";

  const filename = `nur-${v.ref.replace(":", "-")}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `QS ${v.surah_name} ${v.ref}`, text: shareText(v) });
      return "shared";
    } catch (err) {
      // The user dismissing the share sheet is not a failure — say nothing and stop.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // Anything else: fall through to a plain download rather than leave them with nothing.
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}
