import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/content/posts";
import { CITIES } from "@/lib/cities";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getPublishedPosts();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...CITIES.map((c) => ({
      url: `${SITE_URL}/snow-day-calculator/${c.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: new Date(p.updated ?? p.date), priority: 0.6 })),
    { url: `${SITE_URL}/about`, priority: 0.3 },
    { url: `${SITE_URL}/privacy`, priority: 0.2 },
    { url: `${SITE_URL}/disclaimer`, priority: 0.2 },
  ];
}
