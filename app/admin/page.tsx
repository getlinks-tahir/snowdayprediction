import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { formattedDate } from "@/components/PostCard";
import { isAdmin } from "@/lib/auth";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");
  const posts = await getAllPosts();
  return (
    <div className="admin-shell">
      <div className="admin-top"><div><p className="eyebrow">Blog manager</p><h1>Your posts</h1><p className="admin-subtitle">Write a post here, publish it, and it automatically appears in the public Blog section.</p></div></div>
      <section className="admin-panel">
        <div className="admin-toolbar"><Link className="button button-primary" href="/admin/new">+ New post</Link><LogoutButton /></div>
        {posts.length ? <table className="admin-table"><thead><tr><th>Post</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td><Link href={`/admin/edit/${post.id}`}>{post.title}</Link><small>/blog/{post.slug}</small></td><td><span className={`status-pill ${post.status}`}>{post.status}</span></td><td>{formattedDate(post.updatedAt)}</td><td className="admin-action-cell"><Link className="button button-secondary button-small" href={`/admin/edit/${post.id}`}>Edit</Link>{post.status === "published" && <Link className="button button-secondary button-small" href={`/blog/${post.slug}`} target="_blank">View</Link>}</td></tr>)}</tbody></table> : <div className="admin-empty"><h2>No posts yet</h2><p>Start with your first article—when you publish it, the public Blog page updates automatically.</p></div>}
      </section>
    </div>
  );
}
