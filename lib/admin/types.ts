import type { PostSection } from "@/content/posts";
import type { ContentBlock } from "./blocks";

export type { PostSection };

/**
 * One section as the editor sends it. All original keys stay present.
 * `block` is optional so posts written before the block editor still validate.
 *
 * Also add the same optional field on PostSection in content/posts.ts:
 *   block?: import("@/lib/admin/blocks").ContentBlock | null;
 *
 * And on the section object inside lib/admin/schema.ts:
 *   block: z.any().optional()
 */
export interface SectionInput {
  heading: string;
  paragraphs: string[];
  list: string[];
  callout: string;
  block?: ContentBlock | null;
}

export interface PostInput {
  id?: number;
  title: string;
  slug: string;
  description: string;
  date: string;
  updated: string;
  readMinutes: number;
  image: string;
  imageAlt: string;
  tags: string[];
  sections: SectionInput[];
}

export type SaveMode = "save" | "publish" | "unpublish";

export type Failure = {
  ok: false;
  error: string;
  issues?: string[];
  fieldErrors?: Record<string, string>;
};

export type SaveResult = { ok: true; id: number; slug: string; published: boolean } | Failure;
export type SimpleResult = { ok: true } | Failure;
export type SlugCheck = { ok: true; available: boolean } | Failure;
