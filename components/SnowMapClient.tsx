"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { BadgeId, Country } from "@/lib/algorithm";

export interface MapPoint {
  slug: string;
  name: string;
  region: string;
  country: Country;
  x: number;
  y: number;
  chance: number;
  band: "blue" | "orange" | "yellow" | "green" | "gray";
  snowCm: number;
  minTempC: number;
  weekday: string;
  isWeekend: boolean;
  badges: BadgeId[];
}

type Filter = "all" | "US" | "CA";

const BADGE_TEXT: Record<BadgeId, string> = {
  blizzard: "🌪️ Blizzard",
  ice: "🧊 Black ice",
  predawn: "🕒 Pre-dawn snow",
};

function snowText(cm: number, country: Country) {
  if (cm <= 0) return "No snow";
  return country === "US" ? `${(cm / 2.54).toFixed(1)} in of snow` : `${cm.toFixed(1)} cm of snow`;
}

function tempText(c: number, country: Country) {
  return country === "US" ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

const radius = (chance: number) => (chance < 21 ? 6 : 8 + (chance / 99) * 10);

interface Props {
  points: MapPoint[];
  width: number;
  height: number;
  baseMap: React.ReactNode;
}

export default function SnowMapClient({ points, width, height, baseMap }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const frame = useRef<HTMLDivElement>(null);

  const pick = (slug: string) => {
    setActive(slug);
    // On phones the list sits under the map, so bring the map back into view.
    if (window.innerWidth <= 1024) frame.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const sorted = useMemo(
    () =>
      points
        .filter((p) => filter === "all" || p.country === filter)
        .sort((a, b) => b.chance - a.chance || b.snowCm - a.snowCm || a.name.localeCompare(b.name)),
    [points, filter],
  );
  // Low chances first so the high ones are drawn on top.
  const drawOrder = useMemo(() => [...points].sort((a, b) => a.chance - b.chance), [points]);
  const atRisk = points.filter((p) => p.chance >= 21).length;
  const current = points.find((p) => p.slug === active) ?? null;

  return (
    <div className="map-shell">
      <div ref={frame} className="glass map-frame" onMouseLeave={() => setActive(null)}>
        <div className="map-stage" style={{ aspectRatio: `${width} / ${height}` }}>
          {baseMap}
          <svg className="map-overlay" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Snow day chance by city">
            <defs>
              <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            {drawOrder.map((p) => {
              const r = radius(p.chance);
              const on = active === p.slug;
              return (
                <g
                  key={p.slug}
                  className={`map-dot${on ? " is-active" : ""}`}
                  data-band={p.band}
                  transform={`translate(${p.x} ${p.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.name}, ${p.region}: ${p.chance}% chance. ${snowText(p.snowCm, p.country)}.`}
                  onMouseEnter={() => setActive(p.slug)}
                  onFocus={() => setActive(p.slug)}
                  onClick={() => setActive(p.slug)}
                >
                  {p.chance >= 21 && <circle r={r * 1.9} className="dot-halo" filter="url(#dot-glow)" />}
                  {p.chance >= 61 && <circle r={r} className="dot-pulse" />}
                  <circle r={on ? r + 3 : r} className="dot-core" />
                  {p.chance >= 21 && (
                    <text className="dot-label" dy="0.35em">{p.chance}</text>
                  )}
                </g>
              );
            })}
          </svg>

          {current && (
            <div
              className="map-tip"
              style={{
                left: `${(current.x / width) * 100}%`,
                top: `${(current.y / height) * 100}%`,
              }}
              data-flip={current.y / height < 0.35 ? "down" : "up"}
              data-align={current.x / width < 0.2 ? "left" : current.x / width > 0.8 ? "right" : "center"}
              role="status"
            >
              <b>{current.name}, {current.region}</b>
              <span className="tip-row">
                <span className="pct" data-band={current.band}>{current.chance}%</span>
                {current.isWeekend ? "Weekend" : current.weekday}
              </span>
              <span className="tip-row">{snowText(current.snowCm, current.country)} · low {tempText(current.minTempC, current.country)}</span>
              {current.badges.length > 0 && <span className="tip-row">{current.badges.map((b) => BADGE_TEXT[b]).join(" · ")}</span>}
              <Link href={`/snow-day-calculator/${current.slug}`}>Full forecast →</Link>
            </div>
          )}
        </div>

        <div className="map-legend" aria-hidden="true">
          <b>Snow day chance</b>
          <div><span className="band-dot" data-band="blue" /> 81 to 99%</div>
          <div><span className="band-dot" data-band="orange" /> 61 to 80%</div>
          <div><span className="band-dot" data-band="yellow" /> 41 to 60%</div>
          <div><span className="band-dot" data-band="green" /> 21 to 40%</div>
          <div><span className="band-dot" data-band="gray" /> 0 to 20%</div>
        </div>
      </div>

      <aside className="glass map-side" aria-label="Cities ranked by snow day chance">
        <h3>{atRisk > 0 ? `${atRisk} ${atRisk === 1 ? "city has" : "cities have"} a real chance` : "All quiet for now"}</h3>
        <p className="sub">
          {atRisk > 0
            ? "Ranked from highest to lowest. Pick a city to see it on the map."
            : "No city on our map has a real snow day risk right now. Check back when the next cold front arrives."}
        </p>
        <div className="map-filter" role="group" aria-label="Filter by country">
          {(["all", "US", "CA"] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "US" ? "USA" : "Canada"}
            </button>
          ))}
        </div>
        <ul className="map-list">
          {sorted.map((p) => (
            <li key={p.slug}>
              <button type="button" aria-pressed={active === p.slug} onClick={() => pick(p.slug)}>
                <span>
                  {p.name}, {p.region}
                  <br />
                  <span className="mini">{snowText(p.snowCm, p.country)}</span>
                </span>
                <span className="pct" data-band={p.band}>{p.chance}%</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
