import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formattedDate } from "@/components/PostCard";
import { getPublishedPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPublishedPostBySlug((await params).slug);
  if (!post) return { title: "Article not found" };
  return { title: post.metaTitle || post.title, description: post.metaDescription || post.excerpt, keywords: post.metaKeywords };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const post = await getPublishedPostBySlug((await params).slug);
  if (!post) notFound();
  return (
    <article className="article-shell">
      <Link className="back-link" href="/blog">← All articles</Link>
      <p className="eyebrow">{formattedDate(post.createdAt)}</p>
      <h1>{post.title}</h1>
      <p className="article-deck">{post.excerpt}</p>
      {post.featuredImage && <img className="article-featured-image" src={post.featuredImage} alt="" />}
      <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
