import type { PostSection } from "@/content/posts";
import { BLOCK_SENTINEL, blockPlainText, decodeFallback, isContentBlock } from "./blocks";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** A site path ("/blog/x.svg") or an https URL. Rejects javascript:, data:, http:, "//host" and spaces. */
export function isValidImage(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//") && !/\s/.test(value);
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.length > 0 && !/\s/.test(value);
  } catch {
    return false;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Paragraphs are separated by a blank line. */
export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

/** One list item per line. */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function estimateReadMinutes(sections: PostSection[]): number {
  let words = 0;
  const count = (t?: string) => {
    if (!t || t.startsWith(BLOCK_SENTINEL)) return;
    words += t.trim().split(/\s+/).filter(Boolean).length;
  };
  for (const section of sections) {
    const loose = section as PostSection & { block?: unknown; paragraphs?: string[] };
    if (isContentBlock(loose.block)) {
      count(blockPlainText(loose.block));
      continue;
    }
    const recovered = decodeFallback(loose.paragraphs);
    if (recovered) {
      count(blockPlainText(recovered));
      continue;
    }
    count(section.heading);
    section.paragraphs?.forEach(count);
    section.list?.forEach(count);
    count(section.callout);
  }
  return Math.max(1, Math.ceil(words / 200));
}

export function formatPostDate(date: string): string {
  if (!isValidDate(date)) return "No date";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}
