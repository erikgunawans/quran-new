import { describe, expect, test } from "bun:test";
import {
  KEMENAG,
  METHODS,
  MUHAMMADIYAH,
  type CalcParams,
  equationOfTime,
  nextPrayer,
  prayerTimes,
  solarDeclination,
  type PrayerSlot,
  type PrayerTime,
} from "./prayer.ts";

const JAKARTA = { lat: -6.2088, lon: 106.8456 };

/**
 * Ihtiyati is a fiqh safety margin, not astronomy: it deliberately breaks solar symmetry
 * (+2 to Maghrib, -2 to Syuruq widens "daylight" by 4 minutes). Tests that assert the SOLAR
 * model — symmetry around noon, day length, declination — must therefore run with the margin
 * off, or they are silently asserting the margin instead. The margin has its own tests below.
 */
const ASTRONOMY_ONLY: CalcParams = { ...KEMENAG, ihtiyatiMinutes: {} };
const UTC_PLUS_7 = 420;
const LOCAL_MERIDIAN_LON = 105;
const EQUINOX_DAY = new Date("2026-03-20T00:00:00+07:00");
const FEB_EXTREME = new Date("2026-02-11T00:00:00+07:00");
const NOV_EXTREME = new Date("2026-11-03T00:00:00+07:00");

/**
 * These Jakarta values are self-derived from the current astronomy model, not from a published
 * Kemenag table. Today this test proves regression stability only; once the principal confirms the
 * official table, these values should be replaced to lock the promised external ±2 minute bound.
 */
const UNCONFIRMED_JAKARTA_REFERENCE: Record<PrayerTime["name"], string> = {
  subuh: "04:39",
  syuruq: "05:56",
  dzuhur: "12:00",
  ashar: "15:10",
  maghrib: "18:03",
  isya: "19:12",
};

function hhmm(date: Date, tzOffsetMinutes: number): string {
  const local = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  const hours = String(local.getUTCHours()).padStart(2, "0");
  const minutes = String(local.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function present(slot: PrayerSlot): slot is PrayerTime {
  return "at" in slot;
}

function mustTime(slot: PrayerSlot): PrayerTime {
  expect(slot).toSatisfy(present);
  return slot as PrayerTime;
}

function minutesBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 60_000;
}

function parseHm(value: string): number {
  const parts = value.split(":");
  const hours = Number(parts[0] ?? "");
  const minutes = Number(parts[1] ?? "");
  return hours * 60 + minutes;
}

describe("Jakarta on a fixed civil day", () => {
  test("the self-derived reference set stays within ±2 minutes until the official table lands", () => {
    const times = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);

    for (const slot of times) {
      const time = mustTime(slot);
      const actual = parseHm(hhmm(time.at, UTC_PLUS_7));
      const expected = parseHm(UNCONFIRMED_JAKARTA_REFERENCE[time.name]);
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(2);
    }
  });

  test("the prayers stay in the lived order Muslims expect", () => {
    const times = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7).map(mustTime);
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]!.at.getTime()).toBeLessThan(times[i]!.at.getTime());
    }
  });

  test("solar noon lands where longitude plus equation of time says it should", () => {
    const dzuhur = mustTime(prayerTimes(EQUINOX_DAY, JAKARTA, ASTRONOMY_ONLY, UTC_PLUS_7)[2]!);
    const expectedMinutes =
      12 * 60 -
      ((JAKARTA.lon - LOCAL_MERIDIAN_LON) / 15) * 60 -
      equationOfTime(EQUINOX_DAY, UTC_PLUS_7);

    const actualMinutes = parseHm(hhmm(dzuhur.at, UTC_PLUS_7));
    expect(Math.abs(actualMinutes - expectedMinutes)).toBeLessThanOrEqual(1);
    expect(Math.abs(actualMinutes - (12 * 60 - ((JAKARTA.lon - LOCAL_MERIDIAN_LON) / 15) * 60))).toBeLessThanOrEqual(20);
  });

  test("sunrise and sunset stay nearly symmetric around solar noon", () => {
    const [_, syuruq, dzuhur, , maghrib] = prayerTimes(EQUINOX_DAY, JAKARTA, ASTRONOMY_ONLY, UTC_PLUS_7);
    const sunrise = mustTime(syuruq!);
    const noon = mustTime(dzuhur!);
    const sunset = mustTime(maghrib!);

    const morningSpan = minutesBetween(noon.at, sunrise.at);
    const eveningSpan = minutesBetween(sunset.at, noon.at);
    expect(Math.abs(morningSpan - eveningSpan)).toBeLessThanOrEqual(1);
  });

  test("the equinox day length sits a little over twelve hours, not far beyond it", () => {
    const [_, syuruq, , , maghrib] = prayerTimes(EQUINOX_DAY, JAKARTA, ASTRONOMY_ONLY, UTC_PLUS_7);
    const sunrise = mustTime(syuruq!);
    const sunset = mustTime(maghrib!);
    const daylightMinutes = minutesBetween(sunset.at, sunrise.at);

    expect(daylightMinutes).toBeGreaterThanOrEqual(12 * 60);
    expect(daylightMinutes).toBeLessThanOrEqual(12 * 60 + 10);
  });

  test("near the equator the day stays close to twelve hours year-round", () => {
    const [_, syuruq, , , maghrib] = prayerTimes(new Date("2026-06-21T00:00:00+07:00"), JAKARTA, ASTRONOMY_ONLY, UTC_PLUS_7);
    const sunrise = mustTime(syuruq!);
    const sunset = mustTime(maghrib!);
    const daylightMinutes = minutesBetween(sunset.at, sunrise.at);

    expect(daylightMinutes).toBeGreaterThanOrEqual(12 * 60 - 20);
    expect(daylightMinutes).toBeLessThanOrEqual(12 * 60 + 20);
  });
});

describe("Known solar anchors", () => {
  test("declination tracks equinoxes and solstices within half a degree", () => {
    expect(Math.abs(solarDeclination(new Date("2026-03-20T00:00:00+00:00"), 0) - 0)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(solarDeclination(new Date("2026-06-21T00:00:00+00:00"), 0) - 23.44)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(solarDeclination(new Date("2026-12-21T00:00:00+00:00"), 0) + 23.44)).toBeLessThanOrEqual(0.5);
  });

  test("equation of time reaches its known February and November extremes", () => {
    expect(Math.abs(equationOfTime(FEB_EXTREME, UTC_PLUS_7) - -14.2)).toBeLessThanOrEqual(1);
    expect(Math.abs(equationOfTime(NOV_EXTREME, UTC_PLUS_7) - 16.4)).toBeLessThanOrEqual(1);
  });
});

describe("nextPrayer after isya", () => {
  test("rolls over to tomorrow's subuh instead of stopping at null", () => {
    const times = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    const isya = mustTime(times[5]!);
    const next = nextPrayer(new Date(isya.at.getTime() + 5 * 60_000), times);

    expect(next).not.toBeNull();
    expect(next!.prayer.name).toBe("subuh");
    expect(hhmm(next!.prayer.at, UTC_PLUS_7)).toBe(hhmm(mustTime(times[0]!).at, UTC_PLUS_7));
    expect(next!.msUntil).toBeGreaterThan(0);
  });
});

describe("Polar summer honesty", () => {
  test("a missing twilight angle becomes a typed absence and never an Invalid Date", () => {
    const slots = prayerTimes(new Date("2026-06-21T00:00:00+02:00"), { lat: 69.6492, lon: 18.9553 }, KEMENAG, 120);
    const absent = slots.find((slot) => !present(slot));
    expect(absent).toBeDefined();
    expect(absent).toEqual(expect.objectContaining({ absent: "no-twilight" }));

    for (const slot of slots) {
      if (!present(slot)) continue;
      expect(Number.isNaN(slot.at.getTime())).toBe(false);
    }
  });
});

describe("Purity", () => {
  test("the same inputs produce the same outputs even if the host TZ changes", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "Asia/Jakarta";
    const first = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7).map((slot) =>
      present(slot) ? `${slot.name}:${slot.at.toISOString()}` : `${slot.name}:${slot.absent}`,
    );

    process.env.TZ = "America/New_York";
    const second = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7).map((slot) =>
      present(slot) ? `${slot.name}:${slot.at.toISOString()}` : `${slot.name}:${slot.absent}`,
    );

    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
    expect(second).toEqual(first);
  });
});

describe("Southern hemisphere sanity", () => {
  test("Jakarta still yields real times in order even though latitude is negative", () => {
    const times = prayerTimes(new Date("2026-12-21T00:00:00+07:00"), JAKARTA, KEMENAG, UTC_PLUS_7).map(mustTime);
    expect(times[0]!.name).toBe("subuh");
    expect(times.at(-1)!.name).toBe("isya");
    expect(times[0]!.at.getTime()).toBeLessThan(times.at(-1)!.at.getTime());
  });
});

// ── the Indonesian standard, and the live split inside it ───────────────────

const slotAt = (slots: PrayerSlot[], name: string): Date => {
  const s = slots.find((x) => x.name === name);
  if (!s || !("at" in s)) throw new Error(`${name} absent`);
  return s.at;
};

describe("Kemenag parameters — the state standard", () => {
  test("Subuh is -20 degrees, not -18 — reaffirmed Dec 2020, still held Dec 2025", () => {
    expect(KEMENAG.fajrAngle).toBe(20);
    expect(KEMENAG.ishaAngle).toBe(18);
  });

  test("Asr follows Shafi'i (factor 1) — Hanafi is not the Indonesian standard", () => {
    expect(KEMENAG.asrShadowFactor).toBe(1);
    expect(MUHAMMADIYAH.asrShadowFactor).toBe(1);
  });

  test("ihtiyati adds 2 minutes — except Syuruq, which SUBTRACTS", () => {
    // Syuruq is the deadline that closes Subuh. Caution there means earlier, not later.
    // A flipped sign would tell someone their Subuh window is open after it has shut.
    expect(KEMENAG.ihtiyatiMinutes.subuh).toBe(2);
    expect(KEMENAG.ihtiyatiMinutes.maghrib).toBe(2);
    expect(KEMENAG.ihtiyatiMinutes.syuruq).toBe(-2);
  });
});

describe("the -20 / -18 split is preserved, not resolved", () => {
  test("Muhammadiyah's Subuh is ~8 minutes later than Kemenag's", () => {
    const k = slotAt(prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7), "subuh");
    const m = slotAt(prayerTimes(EQUINOX_DAY, JAKARTA, MUHAMMADIYAH, UTC_PLUS_7), "subuh");
    const deltaMin = (m.getTime() - k.getTime()) / 60_000;
    expect(deltaMin).toBeGreaterThan(5);
    expect(deltaMin).toBeLessThan(11);
  });

  test("both methods ship and both name their authority", () => {
    // The app does not pick a winner between scholars — it names them. Same rule as the
    // two translations: plurality is warmth, not hedging.
    expect(METHODS.length).toBeGreaterThanOrEqual(2);
    for (const m of METHODS) expect(m.authority.length).toBeGreaterThan(0);
  });

  test("only Subuh diverges — Dzuhur, Ashar, Maghrib, Isya are identical", () => {
    const k = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    const m = prayerTimes(EQUINOX_DAY, JAKARTA, MUHAMMADIYAH, UTC_PLUS_7);
    for (const name of ["dzuhur", "ashar", "maghrib", "isya"]) {
      expect(hhmm(slotAt(k, name), UTC_PLUS_7)).toBe(hhmm(slotAt(m, name), UTC_PLUS_7));
    }
  });
});

describe("elevation — horizon dip, and only where it belongs", () => {
  const HIGH = { ...JAKARTA, elevation: 2000 };

  test("altitude pushes Maghrib later and Syuruq earlier", () => {
    const sea = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    const high = prayerTimes(EQUINOX_DAY, HIGH, KEMENAG, UTC_PLUS_7);
    expect(slotAt(high, "maghrib").getTime()).toBeGreaterThan(slotAt(sea, "maghrib").getTime());
    expect(slotAt(high, "syuruq").getTime()).toBeLessThan(slotAt(sea, "syuruq").getTime());
  });

  test("~6 minutes at 2000m — matches Kemenag's published lookup table", () => {
    const sea = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    const high = prayerTimes(EQUINOX_DAY, HIGH, KEMENAG, UTC_PLUS_7);
    const deltaMin = (slotAt(high, "maghrib").getTime() - slotAt(sea, "maghrib").getTime()) / 60_000;
    expect(deltaMin).toBeGreaterThan(4.5);
    expect(deltaMin).toBeLessThan(7.5);
  });

  test("dip does NOT move the angle- and shadow-defined prayers", () => {
    // The tempting shortcut is to apply elevation to all six. It would corrupt four of them.
    const sea = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    const high = prayerTimes(EQUINOX_DAY, HIGH, KEMENAG, UTC_PLUS_7);
    for (const name of ["subuh", "dzuhur", "ashar", "isya"]) {
      expect(slotAt(high, name).getTime()).toBe(slotAt(sea, name).getTime());
    }
  });

  test("a garbage GPS elevation must not move Maghrib", () => {
    const sea = prayerTimes(EQUINOX_DAY, JAKARTA, KEMENAG, UTC_PLUS_7);
    for (const bad of [NaN, -50, 0]) {
      const got = prayerTimes(EQUINOX_DAY, { ...JAKARTA, elevation: bad }, KEMENAG, UTC_PLUS_7);
      expect(slotAt(got, "maghrib").getTime()).toBe(slotAt(sea, "maghrib").getTime());
    }
  });
});
