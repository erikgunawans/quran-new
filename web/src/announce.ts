/**
 * The live region has ONE owner.
 *
 * `main.ts` and `read.ts` each had a private `say()` writing straight to `#live`, with nothing
 * coordinating them. A chat answer and a surah load could land in the same tick and overwrite each
 * other, and a screen-reader user heard whichever won the race — or, worse, heard nothing, because
 * setting `textContent` to the same string twice in a row announces once.
 *
 * So: one writer, one queue. Messages are announced in order, and an identical consecutive message
 * is nudged (zero-width space) so assistive tech treats it as a new announcement rather than a
 * no-op. This is the difference between an accessibility feature and an accessibility gesture.
 */

let region: HTMLElement | null = null;
let last = "";
let timer: ReturnType<typeof setTimeout> | undefined;
const queue: string[] = [];

const el = (): HTMLElement | null => (region ??= document.getElementById("live"));

function flush(): void {
  const live = el();
  const next = queue.shift();
  if (!live || next === undefined) {
    timer = undefined;
    return;
  }

  // Re-announcing the same string is a no-op in most screen readers. A trailing zero-width space
  // makes it a different string without changing what the user hears.
  live.textContent = next === last ? `${next}​` : next;
  last = next;

  timer = queue.length ? setTimeout(flush, 900) : undefined;
}

/** Say something to assistive technology. Ordered, de-raced, never clobbered mid-sentence. */
export function announce(message: string): void {
  const msg = message.trim();
  if (!msg) return;

  queue.push(msg);
  if (timer === undefined) flush();
}

/** Drop anything still queued — the view changed and those announcements are now lies. */
export function clearAnnouncements(): void {
  queue.length = 0;
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
}
