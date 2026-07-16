/**
 * Prayer times are astronomy plus restraint.
 *
 * The math can honestly say "the sun never reaches this twilight angle today." When that happens,
 * silence is the feature: we return a typed absence so no caller can accidentally turn NaN into a
 * clock face and present invention as religion.
 */

export type PrayerName = "subuh" | "syuruq" | "dzuhur" | "ashar" | "maghrib" | "isya";

/**
 * Syuruq is not a prayer. It is the moment Subuh EXPIRES and salat becomes forbidden.
 *
 * This file already knew that — the ihtiyati sign for Syuruq is negative *because* it is a
 * deadline, where caution means earlier rather than later. But `PrayerName` flattened deadline
 * and prayer into one type, so the knowledge never reached `nextPrayer`, which happily announced
 * "Berikutnya: Syuruq" for the whole Subuh window — telling a reader at 05:00 that sunrise is
 * what they are next due to pray. A reader who defers to that misses Subuh entirely.
 */
const DEADLINES: ReadonlySet<PrayerName> = new Set(["syuruq"]);

/** Is this something you PRAY, or a limit you must beat? */
export function isPrayer(name: PrayerName): boolean {
  return !DEADLINES.has(name);
}

export type Coords = {
  lat: number;
  lon: number;
  /** metres above sea level. Raises the visible horizon for Maghrib/Syuruq only; defaults to 0. */
  elevation?: number;
};

export type CalcParams = {
  /** who says so — rendered next to the times, never hidden behind a default */
  authority: string;
  fajrAngle: number;
  ishaAngle: number;
  asrShadowFactor: 1 | 2;
  ihtiyatiMinutes: Partial<Record<PrayerName, number>>;
};

/**
 * Ihtiyati — the safety margin Indonesian falak adds so one schedule stays valid across a city.
 * +2 to every prayer; -2 to Syuruq, because Syuruq is a DEADLINE (Subuh ends), not an opening,
 * so caution there means earlier, not later. Getting that sign backwards would tell someone
 * their Subuh window is still open when it has closed.
 */
const IHTIYATI: Partial<Record<PrayerName, number>> = {
  subuh: 2,
  syuruq: -2,
  dzuhur: 2,
  ashar: 2,
  maghrib: 2,
  isya: 2,
};

/**
 * The state standard: Kemenag's Tim Falakiyah reaffirmed -20 degrees on 21 Dec 2020, on the basis
 * of fajr observations at Labuan Bajo, and still held it as of Dec 2025.
 * https://sulteng.kemenag.go.id/berita/66jl/21-12-2020-kriteria-waktu-subuh-20-derajat-benar-secara-fikih-dan-sains
 */
export const KEMENAG: CalcParams = {
  authority: "Kemenag RI",
  fajrAngle: 20,
  ishaAngle: 18,
  asrShadowFactor: 1, // Shafi'i — the Indonesian standard. Hanafi (2) is not.
  ihtiyatiMinutes: IHTIYATI,
};

/**
 * Muhammadiyah adopted -18 degrees at Munas Tarjih ke-31 (2020), from observatory research using
 * sky quality meters. Kemenag's 2020 statement was a direct rebuttal; the split is live.
 *
 * The delta is ~8 minutes of Subuh. That is not a rounding error — it is the difference between
 * a valid prayer and an invalid one, for tens of millions of people. This app does not get to
 * pick a winner: § Principles, "Plurality is warmth, not hedging. Show that scholars differ,
 * name them, trust the reader." The same rule that governs two translations governs two angles.
 * https://muhammadiyah.or.id/2021/03/waktu-subuh-muhammadiyah-kriteria-18-derajat/
 */
export const MUHAMMADIYAH: CalcParams = {
  authority: "Muhammadiyah",
  fajrAngle: 18,
  ishaAngle: 18,
  asrShadowFactor: 1,
  ihtiyatiMinutes: IHTIYATI,
};

export const METHODS: readonly CalcParams[] = [KEMENAG, MUHAMMADIYAH];

export interface PrayerTime {
  name: PrayerName;
  label: string;
  at: Date;
}

export type PrayerAbsent = {
  name: PrayerName;
  label: string;
  absent: "no-twilight";
};

export type PrayerSlot = PrayerTime | PrayerAbsent;

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const SUNRISE_ALTITUDE = -0.833;

const LABELS: Record<PrayerName, string> = {
  subuh: "Subuh",
  syuruq: "Syuruq",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

type CivilDay = {
  year: number;
  month: number;
  day: number;
};

type SolarPosition = {
  declination: number;
  equationOfTime: number;
};

function normalizedLocalDay(date: Date, tzOffsetMinutes: number): CivilDay {
  const local = new Date(date.getTime() + tzOffsetMinutes * MS_PER_MINUTE);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
  };
}

function julianDay(year: number, month: number, day: number, hourUtc: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5 +
    hourUtc / 24
  );
}

function solarPositionForDay(date: Date, tzOffsetMinutes: number): SolarPosition {
  const civil = normalizedLocalDay(date, tzOffsetMinutes);
  const jd = julianDay(civil.year, civil.month, civil.day, 12 - tzOffsetMinutes / 60);
  const t = (jd - 2451545) / 36525;

  const meanLongitude = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const normalizedLongitude = meanLongitude < 0 ? meanLongitude + 360 : meanLongitude;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const anomalyRad = meanAnomaly * DEG;

  const equationOfCenter =
    Math.sin(anomalyRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * anomalyRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * anomalyRad) * 0.000289;

  const trueLongitude = normalizedLongitude + equationOfCenter;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  const meanObliquity =
    23 +
    (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * DEG);
  const obliquityRad = obliquity * DEG;
  const apparentLongitudeRad = apparentLongitude * DEG;
  const y = Math.tan(obliquityRad / 2) ** 2;

  const equationOfTime =
    4 *
    RAD *
    (y * Math.sin(2 * normalizedLongitude * DEG) -
      2 * eccentricity * Math.sin(anomalyRad) +
      4 * eccentricity * y * Math.sin(anomalyRad) * Math.cos(2 * normalizedLongitude * DEG) -
      0.5 * y * y * Math.sin(4 * normalizedLongitude * DEG) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * anomalyRad));

  const declination =
    Math.asin(Math.sin(obliquityRad) * Math.sin(apparentLongitudeRad)) * RAD;

  return { declination, equationOfTime };
}

export function solarDeclination(date: Date, tzOffsetMinutes: number): number {
  return solarPositionForDay(date, tzOffsetMinutes).declination;
}

export function equationOfTime(date: Date, tzOffsetMinutes: number): number {
  return solarPositionForDay(date, tzOffsetMinutes).equationOfTime;
}

function localDateAtMinutes(civil: CivilDay, minutes: number, tzOffsetMinutes: number): Date {
  const utcMidnight = Date.UTC(civil.year, civil.month - 1, civil.day);
  return new Date(utcMidnight - tzOffsetMinutes * MS_PER_MINUTE + minutes * MS_PER_MINUTE);
}

function minuteShift(name: PrayerName, params: CalcParams): number {
  return params.ihtiyatiMinutes[name] ?? 0;
}

function validHourAngleDegrees(lat: number, declination: number, altitude: number): number | null {
  const latRad = lat * DEG;
  const declRad = declination * DEG;
  const altitudeRad = altitude * DEG;
  const numerator = Math.sin(altitudeRad) - Math.sin(latRad) * Math.sin(declRad);
  const denominator = Math.cos(latRad) * Math.cos(declRad);
  const ratio = numerator / denominator;
  if (ratio < -1 || ratio > 1 || Number.isNaN(ratio)) return null;
  return Math.acos(ratio) * RAD;
}

/**
 * Kerendahan ufuk — dip of the horizon. Standing higher, you see further past the curve, so
 * sunset comes later and sunrise earlier. Kemenag takes elevation from Google Earth and folds
 * it into `H = semi diameter + refraksi + kerendahan ufuk`.
 *
 * This applies ONLY to Maghrib and Syuruq: those are defined by the sun's disc touching the
 * VISIBLE horizon. Subuh and Isya are defined by a twilight angle, and Dzuhur/Ashar by the
 * meridian and shadow ratio — none of which the observer's altitude moves. Applying dip to all
 * six (the tempting shortcut) would silently corrupt four prayers.
 *
 * dip = 0.0293 * sqrt(h), from D = sqrt(2h/R). Computed continuously; Kemenag's published table
 * (~1 min per 500 m) is the paper-era rounding of this same curve.
 */
function horizonDip(elevationMetres: number): number {
  if (!(elevationMetres > 0)) return 0; // also catches NaN — a bad GPS fix must not move Maghrib
  return 0.0293 * Math.sqrt(elevationMetres);
}

function asrAltitude(lat: number, declination: number, shadowFactor: 1 | 2): number {
  const distance = Math.abs(lat - declination) * DEG;
  return Math.atan(1 / (shadowFactor + Math.tan(distance))) * RAD;
}

function present(
  name: PrayerName,
  civil: CivilDay,
  minutes: number,
  tzOffsetMinutes: number,
  params: CalcParams,
): PrayerTime {
  return {
    name,
    label: LABELS[name],
    at: localDateAtMinutes(civil, minutes + minuteShift(name, params), tzOffsetMinutes),
  };
}

function absent(name: PrayerName): PrayerAbsent {
  return { name, label: LABELS[name], absent: "no-twilight" };
}

function timed(slot: PrayerSlot): slot is PrayerTime {
  return "at" in slot;
}

export function prayerTimes(
  date: Date,
  coords: Coords,
  params: CalcParams,
  tzOffsetMinutes: number,
): PrayerSlot[] {
  const civil = normalizedLocalDay(date, tzOffsetMinutes);
  const solar = solarPositionForDay(date, tzOffsetMinutes);
  const noon = 720 - 4 * coords.lon - solar.equationOfTime + tzOffsetMinutes;

  // dip lowers the apparent horizon: sunrise earlier, sunset later, by the same angle
  const visibleHorizon = SUNRISE_ALTITUDE - horizonDip(coords.elevation ?? 0);
  const sunriseHourAngle = validHourAngleDegrees(coords.lat, solar.declination, visibleHorizon);
  const fajrHourAngle = validHourAngleDegrees(coords.lat, solar.declination, -params.fajrAngle);
  const ishaHourAngle = validHourAngleDegrees(coords.lat, solar.declination, -params.ishaAngle);
  const asrHourAngle = validHourAngleDegrees(
    coords.lat,
    solar.declination,
    asrAltitude(coords.lat, solar.declination, params.asrShadowFactor),
  );

  return [
    fajrHourAngle === null ? absent("subuh") : present("subuh", civil, noon - fajrHourAngle * 4, tzOffsetMinutes, params),
    sunriseHourAngle === null
      ? absent("syuruq")
      : present("syuruq", civil, noon - sunriseHourAngle * 4, tzOffsetMinutes, params),
    present("dzuhur", civil, noon, tzOffsetMinutes, params),
    asrHourAngle === null
      ? absent("ashar")
      : present("ashar", civil, noon + asrHourAngle * 4, tzOffsetMinutes, params),
    sunriseHourAngle === null
      ? absent("maghrib")
      : present("maghrib", civil, noon + sunriseHourAngle * 4, tzOffsetMinutes, params),
    ishaHourAngle === null ? absent("isya") : present("isya", civil, noon + ishaHourAngle * 4, tzOffsetMinutes, params),
  ];
}

/**
 * The next thing the reader is due to PRAY — never a deadline. Syuruq still appears in the list
 * (it is the Subuh limit and worth seeing); it is simply never the answer to "what's next?".
 */
export function nextPrayer(
  now: Date,
  times: PrayerSlot[],
): { prayer: PrayerTime; msUntil: number } | null {
  const timedSlots = times.filter(timed).filter((p) => isPrayer(p.name));
  if (!timedSlots.length) return null;

  for (const prayer of timedSlots) {
    const msUntil = prayer.at.getTime() - now.getTime();
    if (msUntil >= 0) return { prayer, msUntil };
  }

  const tomorrow = new Date(timedSlots[0]!.at.getTime() + MINUTES_PER_DAY * MS_PER_MINUTE);
  return { prayer: { ...timedSlots[0]!, at: tomorrow }, msUntil: tomorrow.getTime() - now.getTime() };
}
