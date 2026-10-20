"use client";

import { useState } from "react";
import type { PredictionPayload } from "@/app/actions";
import { getChanceBand } from "@/lib/algorithm";
import { buildExplanation, factorDetail, formatTargetDate, hourLabel } from "@/lib/explain";
import type { Place } from "@/lib/geocode";
import { describeWeatherCode, formatSnow, formatTemp, formatWind, type UnitSystem } from "@/lib/units";
import ChanceRing from "./ChanceRing";
import { Link as LinkIcon, Pin } from "./Icons";

const BADGES = {
  blizzard: { cls: "badge-blizzard", text: "🌪️ Blizzard Synergy" },
  ice: { cls: "badge-ice", text: "🧊 Black Ice Alert" },
  predawn: { cls: "badge-predawn", text: "🕒 Pre-Dawn Peak" },
} as const;

const TIER_TEXT = {
  low: "Low resilience region",
  standard: "Standard region",
  high: "High resilience region",
  canada: "Canadian standard region",
} as const;

interface Props {
  place: Place;
  payload: PredictionPayload;
  showShare?: boolean;
}

export default function ResultCard({ place, payload, showShare = true }: Props) {
  const { prediction: p, alerts, simulated } = payload;
  const [units, setUnits] = useState<UnitSystem>(place.country === "US" ? "imperial" : "metric");
  const [copied, setCopied] = useState(false);
  const band = getChanceBand(p.chance);
  const sky = describeWeatherCode(p.metrics.weatherCode);
  const maxSnow = Math.max(0.5, ...p.timeline.map((h) => h.snowCm));

  const share = async () => {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = `?q=${encodeURIComponent(place.label)}`;
    const text = `${p.chance}% chance of a snow day ${p.targetLabel} in ${place.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Snow Day Calculator", text, url: url.toString() });
        return;
      }
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user closed the share sheet */
    }
  };

  return (
    <article className="result-card" aria-labelledby="result-title">
      <div className="result-top">
        <div>
          <div className="result-place" id="result-title"><Pin />{place.label}</div>
          <div className="result-when">
            Forecast for {formatTargetDate(p.targetDate)}
            {p.targetLabel === "this morning" ? " (this morning)" : ""}
          </div>
        </div>
        <div className="unit-toggle" role="group" aria-label="Units">
          <button type="button" aria-pressed={units === "imperial"} onClick={() => setUnits("imperial")}>°F / in</button>
          <button type="button" aria-pressed={units === "metric"} onClick={() => setUnits("metric")}>°C / cm</button>
        </div>
      </div>

      {simulated !== null && (
        <div className="notice" style={{ marginTop: 0, marginBottom: 18 }}>
          <strong>Simulation mode:</strong> this uses a pretend {formatSnow(simulated, units)} pre-dawn storm instead of the real forecast.
        </div>
      )}

      <div className="result-main">
        <ChanceRing value={p.chance} caption={p.isWeekend ? "Storm score" : "Snow day"} />
        <div>
          <div className="band-label"><span className="band-dot" data-band={band.key} />{band.short}</div>
          <h2 className="result-headline">
            {p.isWeekend ? `No school on ${p.weekday}` : band.label}
          </h2>
          {p.badges.length > 0 && (
            <div className="badges">
              {p.badges.map((b) => (
                <span key={b} className={`badge ${BADGES[b].cls}`}>{BADGES[b].text}</span>
              ))}
            </div>
          )}
          <p className="explain">{buildExplanation(p, place.regionName, units)}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alert-box" role="note">
          <strong>⚠️ Active National Weather Service alert{alerts.length > 1 ? "s" : ""}</strong>
          {alerts.map((a) => (
            <p key={a.headline}>{a.headline}</p>
          ))}
        </div>
      )}

      <div className="weather-stats">
        <Stat icon="❄️" label="Snowfall" value={formatSnow(p.metrics.snowfallCm, units)} />
        <Stat icon="🕒" label="Snow 3 AM to 7 AM" value={formatSnow(p.metrics.preDawnSnowCm, units)} />
        <Stat icon="🌡️" label="Low / High" value={`${formatTemp(p.metrics.minTempC, units)} / ${formatTemp(p.metrics.maxTempC, units)}`} />
        <Stat icon="💨" label="Max wind" value={formatWind(p.metrics.maxWindKmh, units)} />
        <Stat icon="💧" label="Precip chance" value={p.metrics.precipProb === null ? "N/A" : `${p.metrics.precipProb}%`} />
        <Stat icon={sky.icon} label="Conditions" value={p.metrics.freezingRainPreDawn ? "Freezing rain" : sky.text} />
      </div>

      {p.timeline.length > 0 && (
        <div className="timeline">
          <div className="timeline-head">
            <h3>Overnight snow, hour by hour</h3>
            <span>Bold hours = bus prep window</span>
          </div>
          <div className="timeline-bars" role="img" aria-label="Hourly snowfall from midnight to 10 AM">
            {p.timeline.map((h) => (
              <div
                key={h.time}
                className={`tbar${h.inWindow ? " window" : ""}${[56, 57, 66, 67].includes(h.code) ? " ice" : ""}`}
                title={`${hourLabel(h.hour)}: ${formatSnow(h.snowCm, units)}, ${formatTemp(h.tempC, units)}`}
              >
                <div className="tbar-fill" style={{ height: `${Math.max(3, (h.snowCm / maxSnow) * 80)}%` }} />
                <span className="tbar-label">{hourLabel(h.hour)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="breakdown">
        <summary>How we got {p.chance}%</summary>
        <table>
          <tbody>
            {p.factors.length === 0 && (
              <tr><td>No winter risk factors found</td><td>0</td></tr>
            )}
            {p.factors.map((f) => (
              <tr key={f.id}>
                <td><strong>{f.label}.</strong> {factorDetail(f.id, f.points, p, units)}</td>
                <td>+{f.points}</td>
              </tr>
            ))}
            <tr><td>Base score</td><td>{p.baseScore}</td></tr>
            <tr><td>{TIER_TEXT[p.resilience]} for {place.regionName}</td><td>×{p.regionalMultiplier.toFixed(2)}</td></tr>
            <tr><td>{p.weekday} day of week bias</td><td>×{p.dayMultiplier.toFixed(2)}</td></tr>
            <tr className="total"><td>Final chance (capped at 99%)</td><td>{p.chance}%</td></tr>
          </tbody>
        </table>
      </details>

      {showShare && (
        <div className="result-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={share}>
            <LinkIcon /> {copied ? "Link copied" : "Share this forecast"}
          </button>
        </div>
      )}
      <p className="small-print" suppressHydrationWarning>
        Updated {new Date(payload.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.
        This is a prediction. Your school district makes the final call.
      </p>
    </article>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}
