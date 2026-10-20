/**
 * Snow day scoring engine.
 *
 * Pure and dependency free so it runs the same on the server, in the browser
 * and in `node --test`. All weather inputs are metric (cm, °C, km/h), which is
 * what Open-Meteo returns by default.
 */

export type Country = "US" | "CA";

export interface ForecastData {
  timezone: string;
  utcOffsetSeconds: number;
  daily: {
    time: string[];
    weatherCode: number[];
    tMax: number[];
    tMin: number[];
    precipProbMax: (number | null)[];
    snowfallSum: number[];
    windMax: number[];
  };
  hourly: {
    time: string[];
    temperature: number[];
    snowfall: number[];
    windSpeed: number[];
    weatherCode: number[];
  };
}

export interface RegionInput {
  country: Country;
  /** Two letter state or province code, for example "NY" or "ON". */
  region: string;
}

export type BadgeId = "blizzard" | "ice" | "predawn";
export type ResilienceTier = "low" | "standard" | "high" | "canada";

export interface Factor {
  id: string;
  label: string;
  points: number;
  detail: string;
}

export interface HourPoint {
  time: string;
  hour: number;
  snowCm: number;
  tempC: number;
  windKmh: number;
  code: number;
  inWindow: boolean;
}

export interface Prediction {
  chance: number;
  baseScore: number;
  regionalMultiplier: number;
  resilience: ResilienceTier;
  dayMultiplier: number;
  targetDate: string;
  /** "tomorrow" normally, "this morning" when checked in the middle of the night. */
  targetLabel: "tomorrow" | "this morning";
  weekday: string;
  isWeekend: boolean;
  metrics: {
    snowfallCm: number;
    daySnowfallCm: number;
    overnightSnowCm: number;
    preDawnSnowCm: number;
    minTempC: number;
    maxTempC: number;
    maxWindKmh: number;
    preDawnMaxWindKmh: number;
    precipProb: number | null;
    weatherCode: number;
    freezingRainPreDawn: boolean;
  };
  factors: Factor[];
  badges: BadgeId[];
  timeline: HourPoint[];
}

/* ------------------------------------------------------------------ */
/* Regional resilience                                                 */
/* ------------------------------------------------------------------ */

/** Places that rarely see snow and have few plows. Schools close easily. */
export const LOW_RESILIENCE_US = [
  "AL", "AR", "FL", "GA", "HI", "LA", "MS", "NC", "OK", "SC", "TN", "TX",
];

/** Snow belt states that clear roads fast. Schools need a lot to close. */
export const HIGH_RESILIENCE_US = [
  "AK", "MA", "ME", "MI", "MN", "MT", "ND", "NH", "NY", "SD", "VT", "WI", "WY",
];

/** Provinces and territories with long, hard winters and big plow fleets. */
export const HIGH_RESILIENCE_CA = ["AB", "MB", "NL", "NT", "NU", "ON", "QC", "SK", "YT"];

export function getResilience(input: RegionInput): { tier: ResilienceTier; multiplier: number } {
  const code = input.region.toUpperCase();
  if (input.country === "CA") {
    return HIGH_RESILIENCE_CA.includes(code)
      ? { tier: "high", multiplier: 0.75 }
      : { tier: "canada", multiplier: 0.85 };
  }
  if (LOW_RESILIENCE_US.includes(code)) return { tier: "low", multiplier: 1.35 };
  if (HIGH_RESILIENCE_US.includes(code)) return { tier: "high", multiplier: 0.75 };
  return { tier: "standard", multiplier: 1.0 };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const FREEZING_CODES = [56, 57, 66, 67];

export function getDayMultiplier(weekdayIndex: number): number {
  if (weekdayIndex === 5) return 1.1; // Friday: long weekend bias
  if (weekdayIndex === 1) return 1.05; // Monday: Sunday night decision chaos
  return 1.0;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

/** Local wall clock time at the forecast location, as "YYYY-MM-DDTHH:mm". */
export function localNow(utcOffsetSeconds: number, nowMs: number): string {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Main scoring function                                               */
/* ------------------------------------------------------------------ */

export function predictSnowDay(
  forecast: ForecastData,
  region: RegionInput,
  nowMs: number = Date.now(),
): Prediction {
  const now = localNow(forecast.utcOffsetSeconds, nowMs);
  const today = now.slice(0, 10);
  const localHour = Number(now.slice(11, 13));

  // Before 5 AM the call for today has not been made yet, so score today.
  const targetLabel: Prediction["targetLabel"] = localHour < 5 ? "this morning" : "tomorrow";
  let targetDate = targetLabel === "this morning" ? today : addDays(today, 1);

  let dayIdx = forecast.daily.time.indexOf(targetDate);
  if (dayIdx === -1) {
    dayIdx = targetDate > forecast.daily.time[forecast.daily.time.length - 1]
      ? forecast.daily.time.length - 1
      : 0;
    targetDate = forecast.daily.time[dayIdx];
  }

  const weekdayIndex = new Date(`${targetDate}T12:00:00Z`).getUTCDay();
  const prevDate = addDays(targetDate, -1);

  // Walk the hourly data once and collect everything we need.
  let preDawnSnow = 0;
  let overnightSnow = 0;
  let preDawnMaxWind = 0;
  let freezingRainPreDawn = false;
  const timeline: HourPoint[] = [];

  forecast.hourly.time.forEach((t, i) => {
    const date = t.slice(0, 10);
    const hour = Number(t.slice(11, 13));
    const snow = num(forecast.hourly.snowfall[i]);
    const wind = num(forecast.hourly.windSpeed[i]);
    const code = num(forecast.hourly.weatherCode[i]);

    // Open-Meteo hourly snowfall is the total for the hour BEFORE the stamp,
    // so stamps 04:00 through 07:00 cover the 3 AM to 7 AM window.
    if (date === targetDate && hour >= 4 && hour <= 7) preDawnSnow += snow;

    // Weather code and wind are instant values, so check 3 AM to 7 AM.
    if (date === targetDate && hour >= 3 && hour <= 7) {
      preDawnMaxWind = Math.max(preDawnMaxWind, wind);
      if (FREEZING_CODES.includes(code)) freezingRainPreDawn = true;
    }

    // Overnight = 6 PM the evening before through 7 AM. Snow that falls
    // tonight still sits on the roads at bus time.
    if ((date === prevDate && hour >= 19) || (date === targetDate && hour <= 7)) {
      overnightSnow += snow;
    }

    if (date === targetDate && hour <= 10) {
      timeline.push({
        time: t,
        hour,
        snowCm: round1(snow),
        tempC: round1(num(forecast.hourly.temperature[i])),
        windKmh: Math.round(wind),
        code,
        inWindow: hour >= 3 && hour <= 7,
      });
    }
  });

  const daySnowfall = num(forecast.daily.snowfallSum[dayIdx]);
  const snowfall = Math.max(daySnowfall, overnightSnow);
  const minTemp = num(forecast.daily.tMin[dayIdx]);
  const maxTemp = num(forecast.daily.tMax[dayIdx]);
  const maxWind = num(forecast.daily.windMax[dayIdx]);
  const precipProb = forecast.daily.precipProbMax[dayIdx] ?? null;

  const factors: Factor[] = [];
  const badges: BadgeId[] = [];
  const add = (f: Factor) => factors.push(f);

  // A. Base scoring
  if (snowfall > 5) {
    add({ id: "snow", label: "Heavy snowfall", points: 35, detail: `${round1(snowfall)} cm of snow is on the way.` });
  } else if (snowfall > 2) {
    add({ id: "snow", label: "Moderate snowfall", points: 20, detail: `${round1(snowfall)} cm of snow is on the way.` });
  } else if (snowfall > 0.5) {
    add({ id: "snow", label: "Light snowfall", points: 10, detail: `${round1(snowfall)} cm of snow is on the way.` });
  }

  if (preDawnSnow >= 2) {
    badges.push("predawn");
    add({ id: "predawn", label: "Pre-dawn snow", points: 25, detail: `${round1(preDawnSnow)} cm falls between 3 AM and 7 AM while buses get ready.` });
  }

  if (minTemp < -15) {
    add({ id: "cold", label: "Frostbite cold", points: 20, detail: `The low drops to ${round1(minTemp)}°C. Kids at bus stops are at risk.` });
  } else if (minTemp < 0) {
    add({ id: "cold", label: "Below freezing", points: 10, detail: `The low is ${round1(minTemp)}°C so snow and slush will freeze.` });
  }

  if (freezingRainPreDawn) {
    badges.push("ice");
    add({ id: "ice", label: "Black ice", points: 30, detail: "Freezing rain or drizzle is expected before sunrise." });
  }

  if (maxWind > 40) {
    add({ id: "wind", label: "Strong wind", points: 15, detail: `Winds reach ${Math.round(maxWind)} km/h.` });
  }

  if (preDawnSnow >= 2 && preDawnMaxWind >= 35) {
    badges.unshift("blizzard");
    add({ id: "blizzard", label: "Blizzard synergy", points: 25, detail: `Snow plus ${Math.round(preDawnMaxWind)} km/h wind before dawn means drifts and low visibility.` });
  }

  const baseScore = factors.reduce((sum, f) => sum + f.points, 0);

  // B. Regional resilience, C. day of week bias
  const { tier, multiplier } = getResilience(region);
  const dayMultiplier = getDayMultiplier(weekdayIndex);
  const chance = Math.min(99, Math.round(baseScore * multiplier * dayMultiplier));

  return {
    chance,
    baseScore,
    regionalMultiplier: multiplier,
    resilience: tier,
    dayMultiplier,
    targetDate,
    targetLabel,
    weekday: WEEKDAYS[weekdayIndex],
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    metrics: {
      snowfallCm: round1(snowfall),
      daySnowfallCm: round1(daySnowfall),
      overnightSnowCm: round1(overnightSnow),
      preDawnSnowCm: round1(preDawnSnow),
      minTempC: round1(minTemp),
      maxTempC: round1(maxTemp),
      maxWindKmh: Math.round(maxWind),
      preDawnMaxWindKmh: Math.round(preDawnMaxWind),
      precipProb: precipProb === null ? null : Math.round(precipProb),
      weatherCode: num(forecast.daily.weatherCode[dayIdx]),
      freezingRainPreDawn,
    },
    factors,
    badges,
    timeline,
  };
}

/* ------------------------------------------------------------------ */
/* Presentation helpers (still pure)                                   */
/* ------------------------------------------------------------------ */

export interface ChanceBand {
  key: "blue" | "orange" | "yellow" | "green" | "gray";
  label: string;
  short: string;
}

export function getChanceBand(chance: number): ChanceBand {
  if (chance >= 81) return { key: "blue", label: "Snow day very likely", short: "Very likely" };
  if (chance >= 61) return { key: "orange", label: "Good chance of a snow day", short: "Likely" };
  if (chance >= 41) return { key: "yellow", label: "Could go either way", short: "Possible" };
  if (chance >= 21) return { key: "green", label: "Small chance, maybe a delay", short: "Unlikely" };
  return { key: "gray", label: "Plan on school as usual", short: "Very unlikely" };
}

/**
 * A synthetic storm used by `?simulate=<cm>` and the acceptance tests.
 * All the snow falls inside the 3 AM to 7 AM window with a low of -3°C and
 * light wind, so the only thing that differs between two cities is the
 * regional multiplier (and the day of week bias).
 */
export function buildSimulatedForecast(
  snowCm: number,
  utcOffsetSeconds: number,
  timezone: string,
  nowMs: number = Date.now(),
): ForecastData {
  const today = localNow(utcOffsetSeconds, nowMs).slice(0, 10);
  const days = [today, addDays(today, 1)];
  const time: string[] = [];
  const snowfall: number[] = [];
  const temperature: number[] = [];
  const windSpeed: number[] = [];
  const weatherCode: number[] = [];

  for (const d of days) {
    for (let h = 0; h < 24; h++) {
      time.push(`${d}T${String(h).padStart(2, "0")}:00`);
      const inStorm = h >= 4 && h <= 7;
      snowfall.push(inStorm ? snowCm / 4 : 0);
      temperature.push(h < 10 ? -3 : 1);
      windSpeed.push(15);
      weatherCode.push(inStorm ? 73 : 3);
    }
  }

  return {
    timezone,
    utcOffsetSeconds,
    daily: {
      time: days,
      weatherCode: [73, 73],
      tMax: [1, 1],
      tMin: [-3, -3],
      precipProbMax: [90, 90],
      snowfallSum: [snowCm, snowCm],
      windMax: [15, 15],
    },
    hourly: { time, temperature, snowfall, windSpeed, weatherCode },
  };
}
