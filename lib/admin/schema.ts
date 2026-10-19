import { z } from "zod";
import type { PostSection } from "@/content/posts";
import { SLUG_RE, isValidDate, isValidImage } from "./validators";

const dateField = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidDate(v), "Use a real date in YYYY-MM-DD format");

const sectionSchema = z
  .object({
    heading: z.string().trim().max(200, "Heading is too long (max 200 characters)"),
    paragraphs: z
      .array(z.string().trim().max(5000, "A paragraph is too long (max 5000 characters)"))
      .max(100, "Too many paragraphs in one section"),
    list: z
      .array(z.string().trim().max(1000, "A list item is too long (max 1000 characters)"))
      .max(100, "Too many list items in one section"),
    callout: z.string().trim().max(2000, "Callout is too long (max 2000 characters)"),
    block: z.any().optional(),
  })
  .transform((s): PostSection => {
    const out: PostSection = {};
    if (s.block !== undefined) out.block = s.block;
    if (s.heading) out.heading = s.heading;
    const paragraphs = s.paragraphs.filter(Boolean);
    if (paragraphs.length) out.paragraphs = paragraphs;
    const list = s.list.filter(Boolean);
    if (list.length) out.list = list;
    if (s.callout) out.callout = s.callout;
    return out;
  });

export const postInputSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long (max 200 characters)"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug is too long (max 100 characters)")
    .refine((v) => SLUG_RE.test(v), "Use lowercase letters, numbers and single hyphens only"),
  description: z.string().trim().max(500, "Description is too long (max 500 characters)"),
  date: dateField,
  updated: dateField,
  readMinutes: z
    .number("Read time must be a number")
    .int("Read time must be a whole number")
    .min(1, "Read time must be at least 1 minute")
    .max(180, "Read time can't be more than 180 minutes"),
  image: z
    .string()
    .trim()
    .max(1000, "Image URL is too long")
    .refine((v) => v === "" || isValidImage(v), "Use a path starting with / or a full https:// URL"),
  imageAlt: z.string().trim().max(300, "Alt text is too long (max 300 characters)"),
  tags: z
    .array(z.string().trim().min(1).max(40, "A tag is too long (max 40 characters)"))
    .max(10, "Use at most 10 tags")
    .transform((tags) => {
      const seen = new Set<string>();
      return tags.filter((t) => {
        const k = t.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }),
  sections: z
    .array(sectionSchema)
    .max(80, "Too many sections (max 80)")
    .transform((list) => list.filter((s) => Object.keys(s).length > 0)),
});

export type ParsedPost = z.output<typeof postInputSchema>;

/** What a post needs before it may go live. Used for new saves and for the publish toggle. */
export function publishProblems(p: {
  title: string; slug: string; description: string; date: string | null;
  image: string; imageAlt: string; sections: PostSection[];
}): string[] {
  const out: string[] = [];
  if (!p.title.trim()) out.push("Add a title.");
  if (!SLUG_RE.test(p.slug)) out.push("Add a valid slug.");
  if (!p.description.trim()) out.push("Add a meta description.");
  if (!p.date || !isValidDate(p.date)) out.push("Set a publish date.");
  if (!p.image || !isValidImage(p.image)) out.push("Add an image URL (a / path or https:// link).");
  if (!p.imageAlt.trim()) out.push("Add image alt text.");
  if (p.sections.length === 0) out.push("Add at least one section with content.");
  return out;
}

const FIELD_NAMES: Record<string, string> = {
  title: "Title", slug: "Slug", description: "Description", date: "Date", updated: "Updated date",
  readMinutes: "Read time", image: "Image", imageAlt: "Image alt text", tags: "Tags", sections: "Sections",
};

export function describeZodError(error: z.ZodError): { issues: string[]; fieldErrors: Record<string, string> } {
  const issues: string[] = [];
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String);
    const top = path[0] ?? "form";
    if (!(top in fieldErrors)) fieldErrors[top] = issue.message;
    if (top === "sections" && path.length >= 2) {
      const n = Number(path[1]) + 1;
      const part = path[2] ? ` ${path[2]}` : "";
      issues.push(`Section ${n}${part}: ${issue.message}`);
    } else {
      issues.push(`${FIELD_NAMES[top] ?? top}: ${issue.message}`);
    }
  }
  return { issues: issues.slice(0, 8), fieldErrors };
}
