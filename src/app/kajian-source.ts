/**
 * Turn whatever an admin pasted into the queue into the one thing the transcript skill understands.
 *
 * ── WHY THIS IS A MODULE AND NOT THREE LINES IN `kajian.ts` ─────────────────────────────────────
 *
 * `worker/src/kajian-jobs.ts` has parsed `youtube.com/live/<id>` since 2026-08-24 — Erik reported
 * the rejected paste himself — and the queue row for the first real job holds the correct
 * `video_id`. The pipeline still failed, because it handed the skill the RAW URL and the skill
 * only understands `watch?v=` and bare ids. It answered *"Invalid video ID: pass the ID, not the
 * URL"* and exited in about a second.
 *
 * Both sides were right and the seam between them was wrong, which is the failure a module with a
 * test can hold and neither side's own tests can. `/live/` is not an edge case here either: a
 * kajian is streamed before it is a recording, so the stream URL is the NORMAL input.
 *
 * ── IT REUSES THE WORKER'S PARSER RATHER THAN CARRYING A SECOND ONE ─────────────────────────────
 *
 * `youTubeVideoId` is imported, not reimplemented. A copy here would be a second definition of
 * "which URLs are YouTube", free to drift from the one the queue actually admits — and the drift
 * would show up as a job that the admin page accepts and the runner then cannot process, which is
 * precisely the bug this file exists to close. `kajian.ts` already imports from `worker/src/`
 * (`providers.ts`, the `Env` type), so the direction is established.
 *
 * ── IT RETURNS A REASON INSTEAD OF THROWING ─────────────────────────────────────────────────────
 *
 * Same contract as `resultFrom` in `kajian-runner.ts`, for the same reason: the caller's job either
 * way is to tell a human what happened, and the sentence should be written for the admin reading
 * the queue rather than derived from an exception.
 */
import { youTubeVideoId } from "../../worker/src/kajian-jobs.ts";

/**
 * The id shape, matching `YOUTUBE_ID` in the Worker.
 *
 * A BARE ARGUMENT IS CHECKED, NOT ASSUMED. The documented usage is `<youtube-url-or-id>`, so a
 * non-URL argument is plausibly an id — but waving through anything that failed to parse as a URL
 * would turn a typo into the skill's error message instead of ours, which is how the original
 * defect stayed unreadable for a day.
 */
const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The bare video id to pass the skill, or the reason it cannot be worked out.
 *
 * A bare id is returned rather than a normalised `watch?v=` URL because the skill accepts one and
 * an id cannot carry a tracking parameter, a playlist, or a timestamp into the cache key.
 */
export function skillTarget(raw: string): string | { error: string } {
  const arg = raw.trim();
  if (arg === "") return { error: "no video URL or id was given" };

  if (BARE_ID.test(arg)) return arg;

  const id = youTubeVideoId(arg);
  if (id !== null) return id;

  // Names the input back. The failure this replaces named a clock ("exceeded its time limit"), and
  // an admin reading that goes looking at proxies and durations rather than at what they pasted.
  return { error: `not a YouTube video URL or id: ${arg}` };
}
