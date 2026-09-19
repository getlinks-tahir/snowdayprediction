import type { Prediction } from "./algorithm";
import { formatSnow, formatTemp, formatWind, type UnitSystem } from "./units";

/**
 * Turns a prediction into short, plain sentences a kid can follow.
 * Style rules: no em dashes, no comma before "and" or "or".
 */
export function buildExplanation(p: Prediction, regionName: string, units: UnitSystem): string {
  const m = p.metrics;
  const has = (id: string) => p.factors.some((f) => f.id === id);
  const day = p.targetLabel === "this morning" ? "this morning" : p.weekday;
  const out: string[] = [];

  if (p.isWeekend) {
    out.push(`${p.weekday} is a weekend so there is no school to cancel.`);
    if (p.baseScore === 0) return `${out[0]} The forecast looks calm anyway.`;
    out.push(`If this weather came on a school day it would score about ${p.chance}%.`);
  } else if (p.factors.length === 0) {
    return `No snow, ice or dangerous cold shows up in the forecast for ${day}. Plan on a normal school day.`;
  }

  if (has("snow")) {
    out.push(`The forecast shows ${formatSnow(m.snowfallCm, units)} of snow for ${day}.`);
  }
  if (has("blizzard")) {
    out.push(`Heavy snow and wind up to ${formatWind(m.preDawnMaxWindKmh, units)} hit before sunrise. That means drifts and poor visibility for buses.`);
  } else if (has("predawn")) {
    out.push(`About ${formatSnow(m.preDawnSnowCm, units)} falls between 3 AM and 7 AM. That is right when bus drivers start their routes and plows are still behind.`);
  }
  if (has("ice")) {
    out.push("Freezing rain is expected before sunrise. It can leave black ice on roads which is the top reason schools close.");
  }
  const cold = p.factors.find((f) => f.id === "cold");
  if (cold && cold.points >= 20) {
    out.push(`The low of ${formatTemp(m.minTempC, units)} is cold enough to hurt skin at a bus stop.`);
  } else if (cold) {
    out.push(`The low of ${formatTemp(m.minTempC, units)} is below freezing so wet roads can turn icy.`);
  }
  if (has("wind") && !has("blizzard")) {
    out.push(`Wind up to ${formatWind(m.maxWindKmh, units)} can blow snow back onto cleared roads.`);
  }

  if (p.resilience === "low") {
    out.push(`${regionName} does not get much snow and has fewer plows so schools here close with less.`);
  } else if (p.resilience === "high") {
    out.push(`${regionName} is used to heavy winters so schools here need a lot more before they close.`);
  } else if (p.resilience === "canada") {
    out.push(`Schools in ${regionName} handle winter well so the number is scaled down a little.`);
  }

  if (p.dayMultiplier > 1 && p.weekday === "Friday") {
    out.push("It is also a Friday. Leaders are a bit more willing to call a snow day before a weekend.");
  } else if (p.dayMultiplier > 1 && p.weekday === "Monday") {
    out.push("It is also a Monday. Roads are checked on Sunday night which makes the call harder.");
  }

  return out.join(" ");
}

/** Factor detail lines in the unit system the user picked. */
export function factorDetail(id: string, points: number, p: Prediction, units: UnitSystem): string {
  const m = p.metrics;
  switch (id) {
    case "snow":
      return `${formatSnow(m.snowfallCm, units)} of snow is on the way.`;
    case "predawn":
      return `${formatSnow(m.preDawnSnowCm, units)} falls between 3 AM and 7 AM while buses get ready.`;
    case "cold":
      return points >= 20
        ? `The low drops to ${formatTemp(m.minTempC, units)}. Kids at bus stops are at risk.`
        : `The low is ${formatTemp(m.minTempC, units)} so snow and slush will freeze.`;
    case "ice":
      return "Freezing rain or drizzle is expected before sunrise.";
    case "wind":
      return `Winds reach ${formatWind(m.maxWindKmh, units)}.`;
    case "blizzard":
      return `Snow plus ${formatWind(m.preDawnMaxWindKmh, units)} wind before dawn means drifts and low visibility.`;
    default:
      return "";
  }
}

export function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

export function formatTargetDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
