import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostEditor from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllTags, getPostById } from "@/lib/admin/posts";

export const metadata: Metadata = { title: "Edit post" };
type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { supabase } = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [post, tagSuggestions] = await Promise.all([getPostById(supabase, id), getAllTags(supabase)]);
  if (!post) notFound();

  return (
    <>
      <div className="a-page-head"><div><h1>Edit post</h1><p>{post.title || "Untitled"}</p></div></div>
      <PostEditor
        key={post.id}
        tagSuggestions={tagSuggestions}
        initial={{
          id: post.id, title: post.title, slug: post.slug, description: post.description,
          date: post.date ?? "", updated: post.updated ?? "", readMinutes: post.readMinutes,
          image: post.image, imageAlt: post.imageAlt, tags: post.tags, sections: post.sections, published: post.published,
        }}
      />
    </>
  );
}
