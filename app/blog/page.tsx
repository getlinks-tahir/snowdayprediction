import type { Metadata } from "next";
import { PostCard } from "@/components/PostCard";
import { getPublishedPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "Blog", description: "Winter weather guidance and snow day planning tips." };
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <div className="page-shell section-page">
      <p className="eyebrow">Snow Day Calculator Blog</p>
      <h1>Winter weather guidance</h1>
      <p className="page-intro">Helpful articles for planning around snowy mornings, school closures, and winter travel.</p>
      {posts.length ? <div className="posts-grid">{posts.map((post) => <PostCard post={post} key={post.id} />)}</div> : (
        <div className="empty-public-state"><span>❄️</span><h2>No posts yet</h2><p>Your published blog posts will show up here automatically.</p></div>
      )}
    </div>
  );
}
