"use client";

import { FormEvent, useState } from "react";

type Location = { name: string; country: string; latitude: number; longitude: number };
type Weather = {
  date: string; snowfallCm: number; tempMaxC: number; tempMinC: number;
  windKmh: number; precipProb: number; weatherCode: number;
};

const weatherLabels: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Light freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Light freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Heavy showers",
  82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
};
const snowCodes = new Set([71, 73, 75, 77, 85, 86]);
const iceCodes = new Set([56, 57, 66, 67]);

async function geocode(value: string): Promise<Location> {
  const query = value.trim();
  const isUsZip = /^\d{5}$/.test(query);
  const isCanadianPostal = /^[A-Za-z]\d[A-Za-z]( ?\d[A-Za-z]\d)?$/.test(query);
  if (isUsZip || isCanadianPostal) {
    try {
      const country = isUsZip ? "us" : "ca";
      const code = isUsZip ? query : query.replace(/\s+/g, "").slice(0, 3).toUpperCase();
      const response = await fetch(`https://api.zippopotam.us/${country}/${code}`);
      if (response.ok) {
        const result = await response.json();
        const place = result.places?.[0];
        if (place) return {
          name: `${place["place name"]}, ${place.state || place["state abbreviation"] || ""}`.replace(/, $/, ""),
          country: result.country || (isUsZip ? "USA" : "Canada"), latitude: Number(place.latitude), longitude: Number(place.longitude),
        };
      }
    } catch { /* Try the city service below. */ }
  }
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Location lookup failed. Please try again.");
  const result = await response.json();
  const place = result.results?.[0];
  if (!place) throw new Error("Location not found. Try a ZIP code, postal code, or city name.");
  return { name: place.admin1 ? `${place.name}, ${place.admin1}` : place.name, country: place.country, latitude: place.latitude, longitude: place.longitude };
}

async function forecast(latitude: number, longitude: number): Promise<Weather> {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set("wind_speed_unit", "kmh");
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Unable to retrieve weather data. Please try again later.");
  const daily = (await response.json()).daily;
  if (!daily?.weather_code?.length) throw new Error("No forecast data is available for this location.");
  return { date, snowfallCm: daily.snowfall_sum[0] ?? 0, tempMaxC: daily.temperature_2m_max[0] ?? 0, tempMinC: daily.temperature_2m_min[0] ?? 0, windKmh: daily.wind_speed_10m_max[0] ?? 0, precipProb: daily.precipitation_probability_max[0] ?? 0, weatherCode: daily.weather_code[0] ?? 0 };
}

function score(weather: Weather) {
  let total = weather.snowfallCm > 5 ? 40 : weather.snowfallCm > 2 ? 25 : weather.snowfallCm > 0.5 ? 10 : 0;
  if (weather.tempMinC < 0) total += 20;
  if (weather.windKmh > 32) total += 10;
  if (snowCodes.has(weather.weatherCode)) total += 20;
  if (iceCodes.has(weather.weatherCode)) total += 10;
  return Math.min(100, total);
}

function label(chance: number) {
  if (chance >= 81) return ["Very High Chance", "blue"];
  if (chance >= 61) return ["High Chance", "orange"];
  if (chance >= 41) return ["Moderate Chance", "yellow"];
  if (chance >= 21) return ["Low Chance", "green"];
  return ["Very Low Chance", "gray"];
}

function explanation(weather: Weather, chance: number) {
  const factors = [] as string[];
  if (weather.snowfallCm >= 5) factors.push(`heavy snowfall (${weather.snowfallCm.toFixed(1)} cm)`);
  else if (weather.snowfallCm > 0) factors.push(`light snowfall (${weather.snowfallCm.toFixed(1)} cm)`);
  if (weather.tempMinC < 0) factors.push(`freezing temperatures (${Math.round(weather.tempMinC)}°C)`);
  if (weather.windKmh >= 32) factors.push(`strong winds (${Math.round(weather.windKmh)} km/h)`);
  if (iceCodes.has(weather.weatherCode)) factors.push("ice risk");
  if (!factors.length) return "Conditions look mild—school closures are unlikely.";
  const listed = factors.length === 1 ? factors[0] : `${factors.slice(0, -1).join(", ")} and ${factors.at(-1)}`;
  return `${listed.charAt(0).toUpperCase()}${listed.slice(1)} ${chance >= 60 ? "make school closures likely tomorrow." : chance >= 30 ? "could lead to a delayed opening tomorrow." : "give a small chance of a snow day tomorrow."}`;
}

const faqs = [
  ["How accurate is this snow day prediction?", "It uses live forecast data, but school districts also consider road conditions, local policy and bus routes. Treat it as a helpful estimate, not a guarantee."],
  ["Can I use a city name?", "Yes. Enter a US ZIP code, Canadian postal code, or a city name and we will find the nearest local forecast."],
  ["Can ice cause a snow day?", "Yes. Freezing rain and ice pellets can make roads dangerous even where snowfall is light, so the calculator gives icy conditions extra weight."],
  ["When do schools usually decide?", "Many districts announce closures between 4:00 AM and 6:00 AM. Check your district’s official alert service for the final decision."],
];

export function Calculator() {
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<{ place: Location; weather: Weather; chance: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function calculate(event: FormEvent) {
    event.preventDefault();
    if (location.trim().length < 2) return setError("Please enter a ZIP code, postal code, or city name.");
    setError(""); setLoading(true); setResult(null);
    try {
      const place = await geocode(location);
      const weather = await forecast(place.latitude, place.longitude);
      setResult({ place, weather, chance: score(weather) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  const currentLabel = result ? label(result.chance) : null;
  return (
    <>
      <section className="calculator-card" id="calculator" aria-labelledby="calculator-title">
        <p className="eyebrow">Live weather forecast</p>
        <h1 id="calculator-title">Will there be a snow day tomorrow?</h1>
        <p className="lead">Enter your location for an easy-to-understand school closure estimate.</p>
        <form className="location-form" onSubmit={calculate}>
          <label htmlFor="location">ZIP code, postal code, or city</label>
          <div className="location-input-row">
            <input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. 14201, M5V, or Buffalo NY" autoComplete="postal-code" />
            <button className="button button-primary" disabled={loading}>{loading ? "Analyzing…" : "Calculate"}</button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>

      {loading && <div className="status-card"><span className="spinner" /> Fetching the live forecast…</div>}
      {result && currentLabel && (
        <section className="result-card" aria-live="polite">
          <div className="result-top">
            <div className={`chance-ring ${currentLabel[1]}`} style={{ "--chance": `${result.chance * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{result.chance}%</strong><span>snow day chance</span></div>
            </div>
            <div>
              <p className={`chance-label ${currentLabel[1]}`}>{currentLabel[0]}</p>
              <h2>{result.place.name}</h2>
              <p>Forecast for {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${result.weather.date}T12:00:00`))}</p>
            </div>
          </div>
          <p className="result-summary">{explanation(result.weather, result.chance)}</p>
          <div className="weather-stats">
            <div><span>Expected snowfall</span><strong>{result.weather.snowfallCm.toFixed(1)} cm ({(result.weather.snowfallCm / 2.54).toFixed(1)} in)</strong></div>
            <div><span>Low / high</span><strong>{Math.round(result.weather.tempMinC)}°C / {Math.round(result.weather.tempMaxC)}°C</strong></div>
            <div><span>Wind speed</span><strong>{Math.round(result.weather.windKmh)} km/h</strong></div>
            <div><span>Precipitation chance</span><strong>{Math.round(result.weather.precipProb)}%</strong></div>
            <div><span>Weather condition</span><strong>{weatherLabels[result.weather.weatherCode] || "Unknown"}</strong></div>
          </div>
        </section>
      )}

      <section className="faq-section" aria-labelledby="faq-title">
        <p className="eyebrow">Helpful answers</p>
        <h2 id="faq-title">Snow day calculator FAQ</h2>
        <div className="faq-list">
          {faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
        </div>
      </section>
    </>
  );
}
