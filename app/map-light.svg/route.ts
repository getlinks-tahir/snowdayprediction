import { renderBaseMapSvg } from "@/lib/map-geometry";

export const dynamic = "force-static";

export function GET() {
  return new Response(renderBaseMapSvg("light"), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
