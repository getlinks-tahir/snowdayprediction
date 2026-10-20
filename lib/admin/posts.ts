import "server-only";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PostSection } from "./types";

export type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Row = Record<string, unknown>;

export interface AdminPost {
  id: number;
  slug: string;
  title: string;
  description: string;
  date: string | null;
  updated: string | null;
  published: boolean;
  readMinutes: number;
  image: string;
  imageAlt: string;
  tags: string[];
  sections: PostSection[];
  createdAt: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return strArray(value);
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    return strArray(JSON.parse(value));
  } catch {
    return [];
  }
}

function cleanSections(value: unknown): PostSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Row => typeof s === "object" && s !== null)
    .map((s) => {
      const out: PostSection = {};
      if (typeof s.heading === "string") out.heading = s.heading;
      if (Array.isArray(s.paragraphs)) out.paragraphs = strArray(s.paragraphs);
      if (Array.isArray(s.list)) out.list = strArray(s.list);
      if (typeof s.callout === "string") out.callout = s.callout;
      return out;
    });
}

export function mapRow(row: Row): AdminPost {
  return {
    id: Number(row.id),
    slug: str(row.slug),
    title: str(row.title),
    description: str(row.description),
    date: typeof row.date === "string" ? row.date : null,
    updated: typeof row.updated === "string" ? row.updated : null,
    published: row.published === true,
    readMinutes: Number(row.read_minutes) || 5,
    image: str(row.image),
    imageAlt: str(row.image_alt),
    tags: parseTags(row.tags),
    sections: cleanSections(row.sections),
    createdAt: str(row.created_at),
  };
}

/** Keep only letters, numbers, spaces, hyphens and underscores so the value is safe inside a PostgREST filter. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s\-_]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getCounts(db: Db) {
  const [all, pub] = await Promise.all([
    db.from("posts").select("id", { count: "exact", head: true }),
    db.from("posts").select("id", { count: "exact", head: true }).eq("published", true),
  ]);
  const total = all.count ?? 0;
  const published = pub.count ?? 0;
  return { total, published, drafts: Math.max(0, total - published), failed: Boolean(all.error || pub.error) };
}

export async function getRecent(db: Db, limit = 5): Promise<AdminPost[]> {
  const { data, error } = await db.from("posts").select("*").order("id", { ascending: false }).limit(limit);
  if (error) { console.error("Admin: failed to load recent posts", error); return []; }
  return (data ?? []).map(mapRow);
}

export type StatusFilter = "all" | "published" | "draft";

export async function listPosts(
  db: Db,
  opts: { q: string; status: StatusFilter; page: number; pageSize: number },
): Promise<{ rows: AdminPost[]; total: number; failed: boolean }> {
  let query = db.from("posts").select("*", { count: "exact" });
  if (opts.status === "published") query = query.eq("published", true);
  if (opts.status === "draft") query = query.not("published", "is", true);
  if (opts.q) query = query.or(`title.ilike.%${opts.q}%,slug.ilike.%${opts.q}%`);
  const from = (opts.page - 1) * opts.pageSize;
  const { data, count, error } = await query.order("id", { ascending: false }).range(from, from + opts.pageSize - 1);
  if (error) { console.error("Admin: failed to list posts", error); return { rows: [], total: 0, failed: true }; }
  return { rows: (data ?? []).map(mapRow), total: count ?? 0, failed: false };
}

export async function getPostById(db: Db, id: number): Promise<AdminPost | null> {
  const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) { console.error("Admin: failed to load post", error); return null; }
  return data ? mapRow(data) : null;
}

export async function getAllTags(db: Db): Promise<string[]> {
  const { data } = await db.from("posts").select("tags");
  const set = new Set<string>();
  (data ?? []).forEach((r: Row) => parseTags(r.tags).forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
