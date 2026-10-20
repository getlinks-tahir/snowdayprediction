import Link from "next/link";
import { TRENDING_CITIES } from "@/lib/cities";
import { getCityPrediction } from "@/lib/city-forecast";
import { describeWeatherCode, formatSnow, formatTemp } from "@/lib/units";
import ChanceRing from "./ChanceRing";

/** Server component. Six cities fetched at the same time, each cached for 1 hour. */
export default async function TrendingCities() {
  const results = await Promise.all(TRENDING_CITIES.map((c) => getCityPrediction(c)));

  return (
    <section className="section-tight" id="trending" aria-labelledby="trending-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow"><span className="live-dot" /> Updated every hour</span>
          <h2 id="trending-title">Trending Snow Day Cities</h2>
          <p>Live chances for big winter cities in the United States and Canada.</p>
        </div>
        <div className="city-grid">
          {results.map(({ city, prediction: p }) => {
            const units = city.country === "US" ? "imperial" : "metric";
            const sky = p ? describeWeatherCode(p.metrics.weatherCode) : null;
            return (
              <Link key={city.slug} href={`/snow-day-calculator/${city.slug}`} className="glass city-card">
                <div>
                  <h3>{city.name}</h3>
                  <div className="city-meta">
                    <span className="country-tag">{city.country === "US" ? "USA" : "CAN"}</span>
                    {city.region}
                    {p && <span>· {p.isWeekend ? "Weekend" : p.weekday}</span>}
                  </div>
                  {p && sky ? (
                    <div className="city-weather">
                      {sky.icon} {formatTemp(p.metrics.minTempC, units)} low · {formatSnow(p.metrics.snowfallCm, units)} snow
                    </div>
                  ) : (
                    <div className="city-weather">Forecast unavailable right now</div>
                  )}
                </div>
                {p ? <ChanceRing value={p.chance} size="sm" /> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
