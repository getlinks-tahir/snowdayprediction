export const SITE_NAME = "Snow Day Calculator";

export const SITE_URL = "https://www.snowdayprediction.online";

/** NWS asks every app to send a User-Agent that identifies it. */
export const API_USER_AGENT = `SnowDayCalculator/1.0 (${SITE_URL})`;

/**
 * School snow season spans two calendar years. From July on we talk about the
 * coming winter ("2026-27"), before July about the current one.
 */
export function currentSeason(date = new Date()): string {
  const y = date.getFullYear();
  const start = date.getMonth() >= 6 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
