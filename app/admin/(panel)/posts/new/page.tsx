import type { Metadata } from "next";
import PostEditor from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { getAllTags } from "@/lib/admin/posts";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const { supabase } = await requireAdmin();
  const tagSuggestions = await getAllTags(supabase);
  return (
    <>
      <div className="a-page-head"><div><h1>New post</h1><p>Saved as a draft until you publish it.</p></div></div>
      <PostEditor initial={null} tagSuggestions={tagSuggestions} />
    </>
  );
}
