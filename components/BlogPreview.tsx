import Image from "next/image";
import Link from "next/link";
import { getPublishedPosts, type Post } from "@/content/posts";

export function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="glass post-card">
      <div className="post-img">
        <Image src={post.image} alt={post.imageAlt} fill sizes="(max-width: 768px) 100vw, 380px" unoptimized />
      </div>
      <div className="post-body">
        <div className="post-meta">
          {new Date(`${post.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} · {post.readMinutes} min read
        </div>
        <h3>{post.title}</h3>
        <p>{post.description}</p>
      </div>
    </Link>
  );
}

export default async function BlogPreview() {
  const posts = await getPublishedPosts(3);
  if (posts.length === 0) return null;
  return (
    <section className="section" id="blog" aria-labelledby="blog-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">From the blog</span>
          <h2 id="blog-title">Winter Guides for Families</h2>
          <p>Simple reads about snow, ice and how schools decide.</p>
        </div>
        <div className="grid-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/blog" className="btn btn-ghost btn-sm">See all articles</Link>
        </p>
      </div>
    </section>
  );
}
