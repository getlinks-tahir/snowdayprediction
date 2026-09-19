import { getChanceBand } from "@/lib/algorithm";
import { CITIES } from "@/lib/cities";
import { getCityPredictions } from "@/lib/city-forecast";
import { MAP_H, MAP_W, getMapGeometry } from "@/lib/map-geometry";
import SnowMapClient, { type MapPoint } from "./SnowMapClient";

/**
 * Server component. One batched forecast request for every city (cached for an
 * hour) plus a hand-built SVG base map. No map tiles, no API keys.
 */
export default async function SnowMap() {
  const results = await getCityPredictions(CITIES);
  const geo = getMapGeometry();

  const points: MapPoint[] = [];
  for (const { city, prediction: p } of results) {
    const xy = geo.project(city.lon, city.lat);
    if (!p || !xy) continue;
    points.push({
      slug: city.slug,
      name: city.name,
      region: city.region,
      country: city.country,
      x: xy[0],
      y: xy[1],
      chance: p.chance,
      band: getChanceBand(p.chance).key,
      snowCm: p.metrics.snowfallCm,
      minTempC: p.metrics.minTempC,
      weekday: p.weekday,
      isWeekend: p.isWeekend,
      badges: p.badges,
    });
  }

  // The land shapes live in cached static SVG files so the page HTML stays small.
  const baseMap = (
    <>
      <img className="map-base map-base-light" src="/map-light.svg" alt="" width={MAP_W} height={MAP_H} loading="lazy" decoding="async" />
      <img className="map-base map-base-dark" src="/map-dark.svg" alt="" width={MAP_W} height={MAP_H} loading="lazy" decoding="async" />
    </>
  );

  return (
    <section className="section" id="snow-map" aria-labelledby="map-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Live snow day map</span>
          <h2 id="map-title">Where Snow Days Could Happen Next</h2>
          <p>
            Every dot is a real forecast for the next school morning across the United States and Canada.
            Bigger colored dots mean a higher chance. The map refreshes every hour.
          </p>
        </div>
        {points.length === 0 ? (
          <div className="glass card" style={{ textAlign: "center" }}>
            <p style={{ margin: 0 }}>Unable to retrieve weather data. Please try again in a few minutes.</p>
          </div>
        ) : (
          <SnowMapClient points={points} width={MAP_W} height={MAP_H} baseMap={baseMap} />
        )}
      </div>
    </section>
  );
}
