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
 * Every entry here was chosen by reading its FULL interpretive text in the corpus, not by
 * remembering a famous phrase inside it. That distinction is the whole point, and getting it
 * wrong is easy: the beloved "Dia beri jalan keluar" line lives in the tail of 65:2, but 65:2
 * entire is a ruling on divorce, iddah and witnesses — hand that to someone at 2am under the
 * heading "ayat untukmu hari ini" and the app has misread them badly. Likewise 2:216 opens on
 * the obligation to fight, 40:60 ends in Jahannam, and 13:28 begins mid-sentence ("yaitu
 * mereka yang…"), grammatically dependent on the verse before it.
 *
 * The rule: the verse must stand alone AND console when read whole. Not "contains a comforting
 * fragment". If a verse only works cropped, it does not belong here — cropping scripture to fit
 * a mood is the fabrication this app exists to refuse.
 */
const POOL: readonly (readonly [number, number])[] = [
  [65, 3], // rezeki dari arah yang tidak disangka-sangka; cukuplah Allah menjadi penjamin
  [93, 3], // "Tuhanmu tidak meninggalkanmu. Tuhanmu juga tidak membencimu."
  [94, 5], // "Dalam kehidupan dunia ini benar-benar ada penderitaan dan ada kesenangan."
  [2, 286], // "Allah tidak membebani seseorang melebihi kemampuannya."
  [39, 53], // "janganlah kalian putus asa dari rahmat Allah"
  [2, 153], // sabar dan shalat; "rahmat Allah selalu menyertai"
  [16, 127], // "bersabarlah… janganlah kamu bersedih… jangan merasa tertekan"
  [29, 69], // "niscaya akan Kami bukakan jalan-jalan keluar dari kesulitan mereka"
  [64, 11], // "siapa saja yang beriman kepada Allah, pasti hatinya akan mendapat hidayah"
  [2, 155], // diuji dengan cobaan — "berilah kabar gembira kepada orang-orang yang ikhlas"
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
    // The block's whole claim is "here is a verse you can understand". Without the interpretive
    // reading there is no claim to make, so it does not render at all.
    if (!makna) return false;

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
        <p class="aod-src">Tarjamah Makna oleh <b>${esc(makna.translator)}</b></p>
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
  | { kind: "unavailable" };

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

  const hasAyah = await renderAyahOfDay(aod, now());
  if (!hasAyah) aod.remove();

  const located = await locate();
  renderPrayer(prayer, located, now());
  band.hidden = false;

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
