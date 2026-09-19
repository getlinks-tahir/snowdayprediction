export type UnitSystem = "imperial" | "metric";

export const cmToIn = (cm: number) => cm / 2.54;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const kmhToMph = (k: number) => k / 1.609344;

export function formatSnow(cm: number, units: UnitSystem): string {
  if (units === "imperial") {
    const inches = cmToIn(cm);
    return `${inches < 1 && inches > 0 ? inches.toFixed(1) : Math.round(inches * 10) / 10} in`;
  }
  return `${Math.round(cm * 10) / 10} cm`;
}

export function formatTemp(c: number, units: UnitSystem): string {
  return units === "imperial" ? `${Math.round(cToF(c))}°F` : `${Math.round(c)}°C`;
}

export function formatWind(kmh: number, units: UnitSystem): string {
  return units === "imperial" ? `${Math.round(kmhToMph(kmh))} mph` : `${Math.round(kmh)} km/h`;
}

/** WMO weather codes used by Open-Meteo, in plain words. */
export function describeWeatherCode(code: number): { text: string; icon: string } {
  if (code === 0) return { text: "Clear sky", icon: "☀️" };
  if (code <= 2) return { text: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { text: "Cloudy", icon: "☁️" };
  if (code === 45 || code === 48) return { text: "Fog", icon: "🌫️" };
  if (code === 56 || code === 57) return { text: "Freezing drizzle", icon: "🧊" };
  if (code >= 51 && code <= 55) return { text: "Drizzle", icon: "🌦️" };
  if (code === 66 || code === 67) return { text: "Freezing rain", icon: "🧊" };
  if (code >= 61 && code <= 65) return { text: "Rain", icon: "🌧️" };
  if (code === 71) return { text: "Light snow", icon: "🌨️" };
  if (code === 73) return { text: "Snow", icon: "🌨️" };
  if (code === 75) return { text: "Heavy snow", icon: "❄️" };
  if (code === 77) return { text: "Snow grains", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { text: "Rain showers", icon: "🌦️" };
  if (code === 85 || code === 86) return { text: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { text: "Thunderstorm", icon: "⛈️" };
  return { text: "Mixed weather", icon: "🌥️" };
}
