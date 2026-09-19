import "server-only";
import { predictSnowDay, type Prediction } from "./algorithm";
import type { City } from "./cities";
import { fetchForecast, fetchForecastBatch } from "./weather";

export interface CityPrediction {
  city: City;
  prediction: Prediction | null;
}

/** One city, cached for an hour. */
export async function getCityPrediction(city: City): Promise<CityPrediction> {
  try {
    const forecast = await fetchForecast(city.lat, city.lon, 3600);
    return { city, prediction: predictSnowDay(forecast, { country: city.country, region: city.region }) };
  } catch {
    return { city, prediction: null };
  }
}

/** Many cities in a single Open-Meteo request, cached for an hour. */
export async function getCityPredictions(cities: City[]): Promise<CityPrediction[]> {
  try {
    const forecasts = await fetchForecastBatch(cities, 3600);
    return cities.map((city, i) => ({
      city,
      prediction: forecasts[i]
        ? predictSnowDay(forecasts[i], { country: city.country, region: city.region })
        : null,
    }));
  } catch {
    return cities.map((city) => ({ city, prediction: null }));
  }
}
