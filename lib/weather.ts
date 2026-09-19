import "server-only";
import type { ForecastData } from "./algorithm";
import { API_USER_AGENT } from "./site";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max";
const HOURLY = "temperature_2m,snowfall,wind_speed_10m,weather_code";

export class WeatherError extends Error {}

function parseForecast(raw: any): ForecastData {
  if (!raw?.daily?.time || !raw?.hourly?.time) throw new WeatherError("Malformed forecast");
  return {
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds ?? 0,
    daily: {
      time: raw.daily.time,
      weatherCode: raw.daily.weather_code,
      tMax: raw.daily.temperature_2m_max,
      tMin: raw.daily.temperature_2m_min,
      precipProbMax: raw.daily.precipitation_probability_max,
      snowfallSum: raw.daily.snowfall_sum,
      windMax: raw.daily.wind_speed_10m_max,
    },
    hourly: {
      time: raw.hourly.time,
      temperature: raw.hourly.temperature_2m,
      snowfall: raw.hourly.snowfall,
      windSpeed: raw.hourly.wind_speed_10m,
      weatherCode: raw.hourly.weather_code,
    },
  };
}

function buildUrl(lat: string, lon: string) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: DAILY,
    hourly: HOURLY,
    timezone: "auto",
    forecast_days: "2",
  });
  return `${FORECAST_URL}?${params.toString()}`;
}

/**
 * Forecast for one point. Coordinates are rounded to 2 decimals (about 1 km)
 * so nearby searches share the same cached response.
 */
export async function fetchForecast(lat: number, lon: number, revalidate = 1800): Promise<ForecastData> {
  const res = await fetch(buildUrl(lat.toFixed(2), lon.toFixed(2)), {
    next: { revalidate },
    headers: { "User-Agent": API_USER_AGENT },
  });
  if (!res.ok) throw new WeatherError(`Open-Meteo responded ${res.status}`);
  return parseForecast(await res.json());
}

/** Many points in ONE request. Open-Meteo returns an array in the same order. */
export async function fetchForecastBatch(
  points: { lat: number; lon: number }[],
  revalidate = 3600,
): Promise<ForecastData[]> {
  const url = buildUrl(
    points.map((p) => p.lat.toFixed(2)).join(","),
    points.map((p) => p.lon.toFixed(2)).join(","),
  );
  const res = await fetch(url, { next: { revalidate }, headers: { "User-Agent": API_USER_AGENT } });
  if (!res.ok) throw new WeatherError(`Open-Meteo responded ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : [json];
  return list.map(parseForecast);
}

/* ------------------------------------------------------------------ */
/* National Weather Service alerts (United States only, free, no key)  */
/* ------------------------------------------------------------------ */

export interface WeatherAlert {
  event: string;
  headline: string;
  severity: string;
  ends: string | null;
}

const WINTER_EVENTS = /winter|snow|blizzard|ice|freez|cold|wind chill|frost|sleet/i;

export async function fetchNwsAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        next: { revalidate: 600 },
        headers: { "User-Agent": API_USER_AGENT, Accept: "application/geo+json" },
      },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const features: any[] = json?.features ?? [];
    return features
      .map((f) => f.properties)
      .filter((p) => p && WINTER_EVENTS.test(p.event ?? ""))
      .slice(0, 3)
      .map((p) => ({
        event: String(p.event),
        headline: String(p.headline ?? p.event),
        severity: String(p.severity ?? "Unknown"),
        ends: p.ends ?? p.expires ?? null,
      }));
  } catch {
    // Alerts are a bonus. Never break a prediction because NWS is slow.
    return [];
  }
}
