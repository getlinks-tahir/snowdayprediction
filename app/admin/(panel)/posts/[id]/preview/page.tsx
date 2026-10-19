import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostSections from "@/components/PostSections";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { getPostById } from "@/lib/admin/posts";
import { formatPostDate, isValidImage } from "@/lib/admin/validators";

export const metadata: Metadata = { title: "Preview" };
type Props = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Props) {
  const { supabase } = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const post = await getPostById(supabase, id);
  if (!post) notFound();

  return (
    <>
      <div className="a-banner">
        <div><StatusBadge published={post.published} /> <strong>{post.published ? "Preview of the live post" : "Draft preview"}</strong> <span className="a-muted">Only you can see this page.</span></div>
        <Link href={`/admin/posts/${post.id}/edit`} className="btn btn-ghost btn-sm">Back to editor</Link>
      </div>
      <article className="glass a-card a-preview">
        <div className="prose">
          <nav className="breadcrumbs" aria-label="Breadcrumb">Home / Blog</nav>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>{post.title || "Untitled post"}</h1>
          <p className="post-meta">{formatPostDate(post.date ?? "")} · {post.readMinutes} min read</p>
          {post.image && isValidImage(post.image) && (
            <div className="post-hero">
              <Image src={post.image} alt={post.imageAlt} fill sizes="(max-width: 820px) 100vw, 780px" unoptimized />
            </div>
          )}
          {post.sections.length ? <PostSections sections={post.sections} /> : <p>This post has no content yet.</p>}
        </div>
      </article>
    </>
  );
}
