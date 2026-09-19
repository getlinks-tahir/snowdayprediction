import type { Metadata } from "next";
import { PostCard } from "@/components/BlogPreview";
import { getPublishedPosts } from "@/content/posts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Snow Day Blog: Winter Guides for Parents and Students",
  description: "Easy guides about snow days, black ice, school delays and how schools in the USA and Canada decide to close.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Blog</span>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>Winter Guides for Families</h1>
          <p>Short, simple reads about snow, ice and school closures in the United States and Canada.</p>
        </div>
        <div className="grid-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
