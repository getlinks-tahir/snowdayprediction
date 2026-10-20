"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "./auth";
import { mapRow } from "./posts";
import { describeZodError, postInputSchema, publishProblems } from "./schema";
import { SLUG_RE } from "./validators";
import type { SaveMode, SaveResult, SimpleResult, SlugCheck, Failure } from "./types";

function fail(error: string, extra: Partial<Failure> = {}): Failure {
  return { ok: false, error, ...extra };
}

function dbFailure(error: { code?: string; message?: string }): Failure {
  if (error.code === "23505") {
    return fail("That slug is already used by another post.", { fieldErrors: { slug: "That slug is already used." } });
  }
  if (error.code === "23514") {
    return fail("The database refused this change because a published post must be complete.");
  }
  if (error.code === "42501") {
    return fail("Permission denied. Your account is not allowed to change posts.");
  }
  console.error("Admin database error:", error);
  return fail("Something went wrong while saving. Please try again.");
}

function revalidateBlog(...slugs: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/blog");
  for (const s of new Set(slugs)) if (s) revalidatePath(`/blog/${s}`);
  revalidatePath("/sitemap.xml");
}

const validId = (id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0;

export async function savePost(raw: unknown, mode: SaveMode): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  if (mode !== "save" && mode !== "publish" && mode !== "unpublish") return fail("Invalid request.");

  const parsed = postInputSchema.safeParse(raw);
  if (!parsed.success) {
    const { issues, fieldErrors } = describeZodError(parsed.error);
    return fail("Please fix the highlighted fields.", { issues, fieldErrors });
  }
  const input = parsed.data;

  let existing: { id: number; slug: string; published: boolean | null } | null = null;
  if (input.id !== undefined) {
    const { data, error } = await supabase.from("posts").select("id, slug, published").eq("id", input.id).maybeSingle();
    if (error) return fail("Could not load the post. Please try again.");
    if (!data) return fail("This post no longer exists. It may have been deleted.");
    existing = data;
  }

  const publish = mode === "publish" ? true : mode === "unpublish" ? false : existing?.published === true;
  if (publish) {
    const problems = publishProblems({ ...input, date: input.date || null });
    if (problems.length) return fail("This post can't be published yet.", { issues: problems });
  }

  const payload = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    date: input.date || null,
    updated: input.updated || null,
    published: publish,
    read_minutes: input.readMinutes,
    image: input.image,
    image_alt: input.imageAlt,
    tags: JSON.stringify(input.tags),
    sections: input.sections,
  };

  if (existing) {
    // RLS hides a blocked update by returning zero rows instead of an error, so an empty result is a failure.
    const { data, error } = await supabase.from("posts").update(payload).eq("id", existing.id).select("id, slug");
    if (error) return dbFailure(error);
    if (!data || data.length === 0) return fail("The change was not saved. You may have been signed out.");
    revalidateBlog(existing.slug, data[0].slug);
    return { ok: true, id: data[0].id, slug: data[0].slug, published: publish };
  }

  const { data, error } = await supabase.from("posts").insert(payload).select("id, slug").single();
  if (error) return dbFailure(error);
  if (!data) return fail("The post was not created. You may have been signed out.");
  revalidateBlog(data.slug);
  return { ok: true, id: data.id, slug: data.slug, published: publish };
}

export async function setPublished(id: number, publish: boolean): Promise<SimpleResult> {
  const { supabase } = await requireAdmin();
  if (!validId(id) || typeof publish !== "boolean") return fail("Invalid request.");

  const { data: row, error: loadError } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (loadError) return fail("Could not load the post. Please try again.");
  if (!row) return fail("This post no longer exists.");
  const post = mapRow(row);

  if (publish) {
    const problems = publishProblems(post);
    if (problems.length) return fail(`Can't publish yet. ${problems[0]}`, { issues: problems });
  }

  const { data, error } = await supabase.from("posts").update({ published: publish }).eq("id", id).select("id");
  if (error) return dbFailure(error);
  if (!data || data.length === 0) return fail("The change was not saved. You may have been signed out.");
  revalidateBlog(post.slug);
  return { ok: true };
}

export async function deletePost(id: number): Promise<SimpleResult> {
  const { supabase } = await requireAdmin();
  if (!validId(id)) return fail("Invalid request.");
  const { data, error } = await supabase.from("posts").delete().eq("id", id).select("id, slug");
  if (error) return dbFailure(error);
  if (!data || data.length === 0) return fail("Nothing was deleted. The post may already be gone.");
  revalidateBlog(data[0].slug);
  return { ok: true };
}

export async function checkSlugAvailable(slug: string, currentId?: number): Promise<SlugCheck> {
  const { supabase } = await requireAdmin();
  if (typeof slug !== "string" || !SLUG_RE.test(slug) || slug.length > 100) return fail("Invalid slug.");
  const { data, error } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
  if (error) return fail("Could not check the slug.");
  return { ok: true, available: !data || (validId(currentId) && data.id === currentId) };
}

/** Signs out. Deliberately does not require admin, so any signed-in user can log out. */
export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
