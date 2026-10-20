import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { getCounts, getRecent } from "@/lib/admin/posts";
import { formatPostDate } from "@/lib/admin/validators";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase } = await requireAdmin();
  const [counts, recent] = await Promise.all([getCounts(supabase), getRecent(supabase, 5)]);

  const stats = [
    { label: "Total posts", value: counts.total, href: "/admin/posts" },
    { label: "Published", value: counts.published, href: "/admin/posts?status=published", tone: "live" },
    { label: "Drafts", value: counts.drafts, href: "/admin/posts?status=draft", tone: "draft" },
  ];

  return (
    <>
      <div className="a-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Manage the Snow Day blog.</p>
        </div>
        <Link href="/admin/posts/new" className="btn btn-primary btn-sm"><Icon name="plus" /> New post</Link>
      </div>

      {counts.failed && <div className="error-box" role="alert"><Icon name="alert" /> <span>Couldn’t load the post counts. Reload the page to try again.</span></div>}

      <div className="a-stats">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="glass a-stat" data-tone={s.tone}>
            <span className="a-stat-value">{s.value}</span>
            <span className="a-stat-label">{s.label}</span>
          </Link>
        ))}
      </div>

      <section className="glass a-card" aria-labelledby="recent-title">
        <div className="a-card-head">
          <h2 id="recent-title">Recent posts</h2>
          <Link href="/admin/posts" className="a-link">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="a-empty">
            <p>No posts yet.</p>
            <Link href="/admin/posts/new" className="btn btn-primary btn-sm">Write your first post</Link>
          </div>
        ) : (
          <ul className="a-recent">
            {recent.map((p) => (
              <li key={p.id}>
                <div className="a-recent-main">
                  <Link href={`/admin/posts/${p.id}/edit`} className="a-recent-title">{p.title || "Untitled"}</Link>
                  <span className="a-muted">{p.date ? formatPostDate(p.date) : "No date"} · /blog/{p.slug}</span>
                </div>
                <StatusBadge published={p.published} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
