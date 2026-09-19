import "server-only";
import { geoConicConformal, geoGraticule10, geoPath } from "d3-geo";
import type { GeometryObject, Topology } from "topojson-specification";
import { feature, mesh } from "topojson-client";
import usAtlas from "us-atlas/states-10m.json";
import worldAtlas from "world-atlas/countries-50m.json";

export const MAP_W = 1000;
export const MAP_H = 640;

const US = "840";
const CA = "124";

export interface MapGeometry {
  focus: string[];
  context: string[];
  stateLines: string;
  borderLines: string;
  graticule: string;
  project: (lon: number, lat: number) => [number, number] | null;
}

let cached: MapGeometry | null = null;

/**
 * Builds the North America base map once per server process. Everything is
 * projected here so the browser only receives finished SVG path strings.
 */
export function getMapGeometry(): MapGeometry {
  if (cached) return cached;

  const projection = geoConicConformal().rotate([100, 0]).parallels([35, 62]);
  // Frame the continental US, southern Canada and Anchorage.
  projection.fitExtent(
    [[16, 16], [MAP_W - 16, MAP_H - 16]],
    {
      type: "MultiPoint",
      coordinates: [
        [-152, 61.5], [-135, 59], [-125, 49], [-118, 32], [-97, 25.5],
        [-80.5, 25], [-66, 44], [-52.5, 47.5], [-64, 56], [-95, 60],
      ],
    },
  );
  projection.clipExtent([[0, 0], [MAP_W, MAP_H]]);
  const path = geoPath(projection).digits(1);

  const world = worldAtlas as unknown as Topology;
  const us = usAtlas as unknown as Topology;
  const countries = feature(world, world.objects.countries as GeometryObject) as unknown as GeoJSON.FeatureCollection;

  const focus: string[] = [];
  const context: string[] = [];
  for (const f of countries.features) {
    const d = path(f);
    if (!d) continue;
    (f.id === US || f.id === CA ? focus : context).push(d);
  }

  const stateLines = path(mesh(us, us.objects.states as GeometryObject, (a, b) => a !== b)) ?? "";
  const borderLines =
    path(
      mesh(world, world.objects.countries as GeometryObject, (a, b) =>
        a !== b && [a.id, b.id].some((id) => id === US || id === CA),
      ),
    ) ?? "";
  const graticule = path(geoGraticule10()) ?? "";

  cached = {
    focus,
    context,
    stateLines,
    borderLines,
    graticule,
    project: (lon, lat) => {
      const p = projection([lon, lat]);
      return p ? [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10] : null;
    },
  };
  return cached;
}

const PALETTES = {
  light: {
    water: "#e6f0fa", land: "#ffffff", context: "#eef2f7", line: "rgba(15,23,42,0.14)",
    border: "rgba(15,23,42,0.32)", grat: "rgba(14,165,233,0.12)", sheen: "rgba(255,255,255,0.35)",
  },
  dark: {
    water: "#0b1324", land: "#1c2940", context: "#141e31", line: "rgba(148,163,184,0.16)",
    border: "rgba(148,163,184,0.4)", grat: "rgba(56,189,248,0.07)", sheen: "rgba(56,189,248,0.08)",
  },
} as const;

/** The base map as a standalone SVG document, served from a cached static route. */
export function renderBaseMapSvg(theme: keyof typeof PALETTES): string {
  const g = getMapGeometry();
  const c = PALETTES[theme];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}">`,
    `<defs><radialGradient id="s" cx="30%" cy="10%" r="90%"><stop offset="0" stop-color="${c.sheen}"/><stop offset="1" stop-color="${c.sheen}" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="${MAP_W}" height="${MAP_H}" fill="${c.water}"/>`,
    `<path d="${g.graticule}" fill="none" stroke="${c.grat}"/>`,
    `<path d="${g.context.join("")}" fill="${c.context}" stroke="${c.line}" stroke-width="0.6"/>`,
    `<path d="${g.focus.join("")}" fill="${c.land}" stroke="${c.border}" stroke-width="0.8" stroke-linejoin="round"/>`,
    `<path d="${g.stateLines}" fill="none" stroke="${c.line}" stroke-width="0.8" stroke-linejoin="round"/>`,
    `<path d="${g.borderLines}" fill="none" stroke="${c.border}" stroke-width="1.3" stroke-dasharray="5 4"/>`,
    `<rect width="${MAP_W}" height="${MAP_H}" fill="url(#s)"/>`,
    `</svg>`,
  ].join("");
}
