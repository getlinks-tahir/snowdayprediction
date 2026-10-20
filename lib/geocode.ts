import "server-only";
import type { Country } from "./algorithm";
import { regionName, toRegionCode } from "./regions";
import { API_USER_AGENT } from "./site";

export interface Place {
  name: string;
  region: string;
  regionName: string;
  country: Country;
  lat: number;
  lon: number;
  /** "Buffalo, NY 14201" style label for the UI. */
  label: string;
  source: "zippopotam" | "open-meteo" | "gps";
}

export class GeocodeError extends Error {}

const US_ZIP = /^(\d{5})(?:-\d{4})?$/;
const CA_POSTAL = /^([A-Za-z]\d[A-Za-z])\s?(?:\d[A-Za-z]\d)?$/;

async function getJson(url: string, revalidate = 86400): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, headers: { "User-Agent": API_USER_AGENT } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Zippopotam: US ZIP codes and Canadian postal codes (first 3 characters). */
async function fromZippopotam(country: "us" | "ca", code: string, display: string): Promise<Place | null> {
  const data = await getJson(`https://api.zippopotam.us/${country}/${encodeURIComponent(code)}`);
  const p = data?.places?.[0];
  if (!p) return null;
  const cc: Country = country === "us" ? "US" : "CA";
  const region = toRegionCode(p["state abbreviation"], cc) ?? toRegionCode(p.state, cc);
  if (!region) return null;
  const name = String(p["place name"]).replace(/\s*\(.*\)$/, "");
  return {
    name,
    region,
    regionName: regionName(region, cc),
    country: cc,
    lat: Number(p.latitude),
    lon: Number(p.longitude),
    label: `${name}, ${region} ${display}`,
    source: "zippopotam",
  };
}

/** Splits "Atlanta, GA", "Atlanta GA" or "Toronto, Ontario" into name + region hint. */
function splitQuery(q: string): { name: string; hint: string | null } {
  const parts = q.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // "Buffalo, NY, USA" -> keep the state part
    const hint = parts.slice(1).find((s) => toRegionCode(s)) ?? null;
    return { name: parts[0], hint };
  }
  const words = q.trim().split(/\s+/);
  if (words.length > 1) {
    // Try the last one or two words as a region: "Buffalo NY", "Halifax Nova Scotia"
    for (const n of [2, 1]) {
      if (words.length > n) {
        const tail = words.slice(-n).join(" ");
        if (toRegionCode(tail)) return { name: words.slice(0, -n).join(" "), hint: tail };
      }
    }
  }
  return { name: q.trim(), hint: null };
}

/** Open-Meteo geocoding, filtered to the United States and Canada. */
async function fromOpenMeteo(query: string): Promise<Place | null> {
  const { name, hint } = splitQuery(query);
  const hintCode = toRegionCode(hint);
  const params = new URLSearchParams({ name, count: "20", language: "en", format: "json" });
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  const all: any[] = data?.results ?? [];
  let results = all.filter((r) => r.country_code === "US" || r.country_code === "CA");
  if (results.length === 0) return null;

  // "Tokyo" should not quietly become "Tokyo Hill, TX". When the best match is
  // abroad, only accept a US or Canadian place with the exact same name.
  if (all[0].country_code !== "US" && all[0].country_code !== "CA") {
    results = results.filter((r) => String(r.name).toLowerCase() === name.toLowerCase());
    if (results.length === 0) return null;
  }

  const withCode = results
    .map((r) => ({ r, code: toRegionCode(r.admin1, r.country_code) }))
    .filter((x) => x.code);
  if (withCode.length === 0) return null;

  const pick = (hintCode && withCode.find((x) => x.code === hintCode)) || withCode[0];
  const cc = pick.r.country_code as Country;
  const region = pick.code as string;
  return {
    name: pick.r.name,
    region,
    regionName: regionName(region, cc),
    country: cc,
    lat: pick.r.latitude,
    lon: pick.r.longitude,
    label: `${pick.r.name}, ${region}`,
    source: "open-meteo",
  };
}

export async function geocode(rawQuery: string): Promise<Place> {
  const query = rawQuery.trim().replace(/\s+/g, " ");
  if (query.length < 2) throw new GeocodeError("Please type a ZIP code, postal code or city.");

  const zip = query.match(US_ZIP);
  if (zip) {
    const hit = await fromZippopotam("us", zip[1], zip[1]);
    if (hit) return hit;
  }

  const postal = query.match(CA_POSTAL);
  if (postal) {
    const fsa = postal[1].toUpperCase();
    const hit = await fromZippopotam("ca", fsa, query.toUpperCase());
    if (hit) return hit;
  }

  // City names, or a code Zippopotam did not know.
  const hit = await fromOpenMeteo(query);
  if (hit) return hit;

  throw new GeocodeError(
    "We could not find that place in the United States or Canada. Try a ZIP code, postal code or \"City, State\".",
  );
}

/** Turns GPS coordinates into a city and state or province (OpenStreetMap Nominatim). */
export async function reverseGeocode(lat: number, lon: number): Promise<Place> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
    zoom: "10",
    addressdetails: "1",
  });
  const data = await getJson(`https://nominatim.openstreetmap.org/reverse?${params}`, 604800);
  const a = data?.address;
  const cc = String(a?.country_code ?? "").toUpperCase();
  if (cc !== "US" && cc !== "CA") {
    throw new GeocodeError("Your location looks like it is outside the United States and Canada.");
  }
  const iso = String(a?.["ISO3166-2-lvl4"] ?? "");
  const region = toRegionCode(iso.split("-")[1], cc as Country) ?? toRegionCode(a?.state, cc as Country);
  if (!region) throw new GeocodeError("We could not tell which state or province you are in.");
  const name = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county ?? "Your location";
  return {
    name,
    region,
    regionName: regionName(region, cc as Country),
    country: cc as Country,
    lat,
    lon,
    label: `${name}, ${region}`,
    source: "gps",
  };
}
