import { notFound, redirect } from "next/navigation";
import { AdminEditor } from "@/components/AdminEditor";
import { isAdmin } from "@/lib/auth";
import { getPost } from "@/lib/posts";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: PageProps) {
  if (!(await isAdmin())) redirect("/admin/login");
  const post = await getPost((await params).id);
  if (!post) notFound();
  return <div className="admin-shell"><div className="admin-top"><div><p className="eyebrow">Blog manager</p><h1>Edit post</h1></div></div><AdminEditor post={post} /></div>;
}
