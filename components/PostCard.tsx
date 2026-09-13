import Link from "next/link";
import { BlogPost } from "@/lib/types";

export function formattedDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="post-card">
      {post.featuredImage ? (
        // A normal img keeps image uploads simple—no remote-image setup needed.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="post-image" src={post.featuredImage} alt="" />
      ) : (
        <div className="post-image post-image-placeholder" aria-hidden="true">❄️</div>
      )}
      <div className="post-card-body">
        <p className="eyebrow">{formattedDate(post.createdAt)}</p>
        <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt}</p>
        <Link className="text-link" href={`/blog/${post.slug}`}>Read article <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}
