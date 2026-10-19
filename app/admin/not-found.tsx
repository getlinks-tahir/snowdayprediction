import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="a-login">
      <div className="glass a-login-card">
        <h1>Post not found</h1>
        <p>This post doesn’t exist. It may have been deleted.</p>
        <Link className="btn btn-primary btn-sm" href="/admin/posts">Back to posts</Link>
      </div>
    </main>
  );
}
