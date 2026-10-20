import type { Country } from "./algorithm";

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export const CA_PROVINCES: Record<string, string> = {
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories",
  NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec",
  SK: "Saskatchewan", YT: "Yukon",
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const NAME_TO_CODE = new Map<string, { code: string; country: Country }>();
for (const [code, name] of Object.entries(US_STATES)) NAME_TO_CODE.set(norm(name), { code, country: "US" });
for (const [code, name] of Object.entries(CA_PROVINCES)) NAME_TO_CODE.set(norm(name), { code, country: "CA" });
// Common spellings returned by geocoders
NAME_TO_CODE.set("quebec", { code: "QC", country: "CA" });
NAME_TO_CODE.set("newfoundland", { code: "NL", country: "CA" });
NAME_TO_CODE.set("washingtondc", { code: "DC", country: "US" });

/** Turns "Georgia", "georgia", "GA" or "Québec" into a region code. */
export function toRegionCode(value: string | undefined | null, country?: Country): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (upper.length === 2) {
    if ((!country || country === "US") && US_STATES[upper]) return upper;
    if ((!country || country === "CA") && CA_PROVINCES[upper]) return upper;
  }
  const hit = NAME_TO_CODE.get(norm(trimmed));
  if (hit && (!country || hit.country === country)) return hit.code;
  return null;
}

export function regionName(code: string, country: Country): string {
  return (country === "US" ? US_STATES[code] : CA_PROVINCES[code]) ?? code;
}

export function countryOfRegion(code: string): Country | null {
  if (US_STATES[code]) return "US";
  if (CA_PROVINCES[code]) return "CA";
  return null;
}
