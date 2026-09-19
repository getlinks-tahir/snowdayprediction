"use server";

import { buildSimulatedForecast, predictSnowDay, type Prediction } from "@/lib/algorithm";
import { GeocodeError, geocode, reverseGeocode, type Place } from "@/lib/geocode";
import { countryOfRegion } from "@/lib/regions";
import { fetchForecast, fetchNwsAlerts, type WeatherAlert } from "@/lib/weather";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const WEATHER_ERROR = "Unable to retrieve weather data. Please try again.";

/** Step 1: ZIP, postal code or city name to a place (US and Canada only). */
export async function resolveLocation(query: unknown): Promise<Result<Place>> {
  if (typeof query !== "string" || query.trim().length === 0 || query.length > 80) {
    return { ok: false, error: "Please type a ZIP code, postal code or city." };
  }
  try {
    return { ok: true, data: await geocode(query) };
  } catch (e) {
    if (e instanceof GeocodeError) return { ok: false, error: e.message };
    return { ok: false, error: "Location search is not responding. Please try again." };
  }
}

/** Step 1 (GPS): browser coordinates to a place. */
export async function resolveCoordinates(lat: unknown, lon: unknown): Promise<Result<Place>> {
  if (!isCoord(lat, 90) || !isCoord(lon, 180)) return { ok: false, error: "Those coordinates do not look right." };
  try {
    return { ok: true, data: await reverseGeocode(lat, lon) };
  } catch (e) {
    if (e instanceof GeocodeError) return { ok: false, error: e.message };
    return { ok: false, error: "We could not look up your location. Please type your ZIP or city instead." };
  }
}

export interface PredictionPayload {
  prediction: Prediction;
  alerts: WeatherAlert[];
  simulated: number | null;
  timezone: string;
  updatedAt: string;
}

/** Step 2: pull the forecast and score it. */
export async function getPrediction(place: unknown, simulateCm?: unknown): Promise<Result<PredictionPayload>> {
  const p = place as Partial<Place> | null;
  if (!p || !isCoord(p.lat, 90) || !isCoord(p.lon, 180) || typeof p.region !== "string") {
    return { ok: false, error: "Please search for a location first." };
  }
  const country = countryOfRegion(p.region);
  if (!country || country !== p.country) {
    return { ok: false, error: "We only cover the United States and Canada right now." };
  }

  const sim = typeof simulateCm === "number" && simulateCm > 0 && simulateCm <= 100 ? simulateCm : null;

  try {
    const [forecast, alerts] = await Promise.all([
      fetchForecast(p.lat, p.lon),
      country === "US" && sim === null ? fetchNwsAlerts(p.lat, p.lon) : Promise.resolve([]),
    ]);
    const input = sim === null
      ? forecast
      : buildSimulatedForecast(sim, forecast.utcOffsetSeconds, forecast.timezone);
    const prediction = predictSnowDay(input, { country, region: p.region });
    return {
      ok: true,
      data: { prediction, alerts, simulated: sim, timezone: forecast.timezone, updatedAt: new Date().toISOString() },
    };
  } catch {
    return { ok: false, error: WEATHER_ERROR };
  }
}

function isCoord(v: unknown, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;
}
