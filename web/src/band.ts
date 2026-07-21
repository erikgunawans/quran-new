/**
 * The band: "Ayat untukmu hari ini" plus the prayer sidebar.
 *
 * Two rules govern this file:
 *
 * 1. The daily ayah is CURATED and DETERMINISTIC, never random. A random draw from 6,236 verses
 *    would eventually serve a verse about hellfire to someone opening the app at 2am carrying
 *    grief. The pool below is chosen to land on a hard day; the pick is a pure function of the
 *    civil date, so everyone opening the app today sees the same ayah, and reopening it does not
 *    reshuffle scripture like a slot machine.
 *
 * 2. Nothing here fabricates. If the corpus shard fails to load, the block does not appear; if
 *    the reader denies location, the prayer card says so plainly rather than guessing a city.
 */

import { greeting } from "./greet.ts";
import { loadAyah } from "./quran.ts";
import { KEMENAG, nextPrayer, prayerTimes, type CalcParams, type Coords, type PrayerSlot } from "./prayer.ts";

/**
 * Verses that meet a person where a hard day leaves them.
 *
 * This pool has now been wrong TWICE, the same way both times, so the reasoning is written down.
 *
 * First it shipped QS 65:2 — chosen for the beloved "Dia beri jalan keluar" in its tail, while
 * 65:2 entire is a ruling on divorce, iddah and witnesses. The "fix" was 65:3, which is WORSE
 * disguised: it is the same At-Talaq ruling one verse further down, and its Arabic opens on a
 * bare waw (`وَيَرْزُقْهُ`) coordinated onto 65:2 — the app's own Kemenag literal renders it
 * "Dan memberinya rezeki…", a verb with no subject and a pronoun with no antecedent. It reads as
 * standalone ONLY in the interpretive gloss, which silently supplies the missing subject. Reading
 * the gloss is what caused the bug; reading the gloss again is what "fixed" it.
 *
 * Both misses share one root: judging a verse by a remembered phrase instead of the shipped data.
 * So the pool is no longer trusted to be right by inspection — `band.test.ts` re-derives every
 * entry from `web/public/surah/*.json` on every run and fails on:
 *   - FLAGGED (verse.ts) — where the primary diverges from the literal. 94:5 was in this pool
 *     while the app's own registry says Thalib reads it as a description of life and Kemenag as
 *     the promise "sesudah kesulitan ada kemudahan". We were quoting the divergence as comfort.
 *   - an Arabic bare-waw opening, or a rendering that opens lowercase / on "Dan" — a fragment.
 *   - a sentence that does not finish in its own verse (trailing comma, unclosed quotation).
 *     15:49 ("Aku Maha Pengampun lagi Maha Penyayang,") is the mercy half of a PAIR — 15:50 is
 *     "dan sungguh siksa-Ku sangat pedih." Serving 49 alone hides half of what it says.
 *   - harsh content anywhere, including the tail (2:286 closes on defeating the disbelievers).
 *
 * What the test CANNOT decide is whether a verse consoles. That is judgment, made by reading each
 * one whole. The test guards the mechanical failures; it does not certify the meaning. Eight
 * verses is a short cycle — that is the price of only shipping ones that survive both.
 */
export const POOL: readonly (readonly [number, number])[] = [
  [93, 3], // "Tuhanmu tidak meninggalkanmu. Tuhanmu juga tidak membencimu."
  [93, 6], // "bukankah Tuhanmu mendapati kamu dahulu sebagai anak yatim, lalu Dia melindungimu?"
  [94, 1], // "bukankah Kami telah menjadikan dadamu lapang?"
  [2, 153], // sabar dan shalat — "rahmat Allah selalu menyertai orang-orang yang ikhlas"
  [2, 157], // "Kaum mukmin mendapatkan rahmat dan kasih sayang dari Tuhan mereka."
  [64, 11], // "bencana… hanyalah dengan izin Allah… hatinya akan mendapat hidayah"
  [10, 62], // "kekasih Allah tidak mempunyai rasa takut… dan rasa sedih"
  [46, 13], // "Tuhan kami adalah Allah" + istiqamah — "tidak takut… tidak merasa sedih"
];

/** Days since epoch in LOCAL time — the pick must turn over at the reader's midnight, not UTC's. */
export function localDayNumber(now: Date): number {
  return Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000,
  );
}

/** Pure, total, and stable for the whole civil day. */
export function ayahOfDay(now: Date): readonly [number, number] {
  const i = ((localDayNumber(now) % POOL.length) + POOL.length) % POOL.length;
  return POOL[i]!;
}

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const clock = (d: Date): string =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Hijri via Intl — the runtime already ships the calendar; shipping our own would be a liability. */
export function hijri(now: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  } catch {
    return "";
  }
}

const gregorian = (now: Date): string =>
  new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(now);

// ── the daily ayah ───────────────────────────────────────────────────────────

export async function renderAyahOfDay(host: HTMLElement, now: Date = new Date()): Promise<boolean> {
  const [surah, ayah] = ayahOfDay(now);
  try {
    const v = await loadAyah(surah, ayah);
    const makna = v.p;
    const literal = v.c;
    // The block's whole claim is "here is a verse you can understand". Without the interpretive
    // reading there is no claim to make, so it does not render at all.
    if (!makna) return false;
    // `literal_companion` is an egress invariant, not a chat-view detail: the interpretive primary
    // may never appear without the Kemenag literal beside it. The build gate enforces it in the
    // corpus, share.ts on copy, share-image.ts on the PNG — and this card is the most
    // screenshotted surface in the app. Rendering the primary alone here would walk around all
    // three through the camera button every phone already has.
    if (!literal) return false;

    host.innerHTML = `
      <div class="girih" aria-hidden="true"></div>
      <div class="aod-inner">
        <p class="aod-label" id="aod-label">
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 15.9 6.7 19l1.4-5.9-4.6-4 6.1-.5z"/></svg>
          Ayat untukmu hari ini
        </p>
        <div class="aod-rule" aria-hidden="true"></div>
        <p class="aod-ar" dir="rtl" lang="ar">${esc(v.ar)}</p>
        <p class="aod-makna">${esc(makna.text)}</p>
        <p class="aod-src">Terjemahan makna oleh <b>${esc(makna.translator)}</b></p>
        <details class="aod-lit">
          <summary>Terjemahan harfiah <b>${esc(literal.translator)}</b></summary>
          <p>${esc(literal.text)}</p>
        </details>
        <p class="aod-foot">
          <span class="aod-ref">QS. ${surah} : ${ayah}</span>
          <a class="aod-link" href="#/baca/${surah}/${ayah}">Baca &amp; tafsirnya →</a>
        </p>
      </div>`;
    return true;
  } catch {
    // Silence over fabrication: a shard that would not load is not a verse we may invent.
    return false;
  }
}

// ── prayer ───────────────────────────────────────────────────────────────────

type Located =
  | { kind: "ok"; coords: Coords }
  | { kind: "denied" }
  | { kind: "unavailable" }
  /** the permission prompt is open, or the fix is slow — up to 8s of it */
  | { kind: "locating" };

export function locate(timeoutMs = 8_000): Promise<Located> {
  if (!("geolocation" in navigator)) return Promise.resolve({ kind: "unavailable" });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          kind: "ok",
          coords: {
            lat: p.coords.latitude,
            lon: p.coords.longitude,
            elevation: p.coords.altitude ?? 0,
          },
        }),
      (e) => resolve({ kind: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { timeout: timeoutMs, maximumAge: 3_600_000 },
    );
  });
}

const ICONS: Record<string, string> = {
  subuh: '<path d="M12 4v3M5.6 6.6l2.1 2.1M2 15h3M19 15h3M16.3 8.7l2.1-2.1M8 15a4 4 0 0 1 8 0M3 19h18"/>',
  syuruq: '<circle cx="12" cy="14" r="3.5"/><path d="M12 4v3M4 15H2M22 15h-2M5.6 7.6l1.5 1.5M18.4 7.6l-1.5 1.5M3 20h18"/>',
  dzuhur: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5"/>',
  ashar: '<path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.3 2A3.5 3.5 0 0 0 6.5 18z"/>',
  maghrib: '<circle cx="12" cy="13" r="3.5"/><path d="M3 19h18M8 19a4 4 0 0 1 8 0M12 3v3M5 9l1.5 1.5M19 9l-1.5 1.5"/>',
  isya: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
};

function slotRow(slot: PrayerSlot, active: string | null): string {
  const icon = ICONS[slot.name] ?? ICONS.isya!;
  // A prayer the math cannot honestly place is named and left blank — never filled with a guess.
  const time = "at" in slot ? clock(slot.at) : "—";
  return `<li class="p-row${slot.name === active ? " on" : ""}">
      <svg class="i" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>
      <span class="nm">${esc(slot.label)}</span>
      <span class="tm">${time}</span>
    </li>`;
}

function shell(inner: string): string {
  return `<div class="p-body">${inner}</div>`;
}

export function renderPrayer(
  host: HTMLElement,
  located: Located,
  now: Date = new Date(),
  params: CalcParams = KEMENAG,
): void {
  const head = `
    <div class="p-top">
      <div class="p-date">
        <span class="p-ico" aria-hidden="true">
          <svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>
        </span>
        <span>
          <b>${esc(gregorian(now))}</b>
          <small>${esc(hijri(now))}</small>
        </span>
      </div>
      <div class="p-time">
        <div class="clock" id="p-clock">${clock(now)}</div>
      </div>
    </div>`;

  if (located.kind === "locating") {
    // The date and clock are already true and cost nothing — show them rather than an empty box
    // for the up-to-8s the geolocation fix can take.
    host.innerHTML = shell(`${head}<p class="p-empty">Mencari lokasi kamu…</p>`);
    return;
  }

  if (located.kind !== "ok") {
    // No location, no times. The app says which, and does not invent a city.
    const why =
      located.kind === "denied"
        ? "Izin lokasi belum diberikan, jadi waktu salat belum bisa dihitung."
        : "Lokasi tidak tersedia di perangkat ini, jadi waktu salat belum bisa dihitung.";
    host.innerHTML = shell(`${head}
      <p class="p-empty">${why}</p>
      <button class="p-ask" id="p-ask" type="button">Aktifkan lokasi</button>`);
    return;
  }

  const slots = prayerTimes(now, located.coords, params, -now.getTimezoneOffset());
  const next = nextPrayer(now, slots);

  host.innerHTML = shell(`${head}
    ${
      next
        ? `<p class="p-next">
             <span>Berikutnya: <b>${esc(next.prayer.label)}</b> · ${clock(next.prayer.at)}</span>
           </p>`
        : ""
    }
    <ul class="p-list">${slots.map((s) => slotRow(s, next?.prayer.name ?? null)).join("")}</ul>
    <p class="p-src">Metode <b>${esc(params.authority)}</b></p>`);
}

/** Paints the band and keeps the clock honest. Returns a teardown. */
export async function mountBand(now: () => Date = () => new Date()): Promise<() => void> {
  const band = document.getElementById("band");
  const aod = document.getElementById("aod");
  const prayer = document.getElementById("prayer");
  if (!band || !aod || !prayer) return () => {};

  // Paint what is already true — the date, the Hijri date, the clock — before anything awaits.
  // The band was previously revealed only after BOTH the shard fetch and an up-to-8s geolocation
  // fix resolved, so it sat empty on screen the whole time.
  renderPrayer(prayer, { kind: "locating" }, now());
  band.hidden = false;

  const hasAyah = await renderAyahOfDay(aod, now());
  if (!hasAyah) aod.remove();

  renderPrayer(prayer, await locate(), now());

  const id = setInterval(() => {
    const el = document.getElementById("p-clock");
    if (el) el.textContent = clock(now());
  }, 1_000);

  prayer.addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest("#p-ask")) return;
    void locate().then((l) => renderPrayer(prayer, l, now()));
  });

  return () => clearInterval(id);
}

export { greeting };
