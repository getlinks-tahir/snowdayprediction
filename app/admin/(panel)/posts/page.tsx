import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/admin/Icon";
import PostRowActions from "@/components/admin/PostRowActions";
import StatusBadge from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { listPosts, sanitizeSearch, type StatusFilter } from "@/lib/admin/posts";
import { formatPostDate } from "@/lib/admin/validators";

export const metadata: Metadata = { title: "Posts" };

const PAGE_SIZE = 10;
type Props = { searchParams: Promise<{ q?: string; status?: string; page?: string }> };

function href(q: string, status: StatusFilter, page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (status !== "all") p.set("status", status);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/admin/posts${s ? `?${s}` : ""}`;
}

export default async function PostsPage({ searchParams }: Props) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : "");
  const status: StatusFilter = sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const page = Math.max(1, Math.min(1000, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1));

  const { rows, total, failed } = await listPosts(supabase, { q, status, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(total, page * PAGE_SIZE);

  const tabs: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Drafts" },
  ];

  return (
    <>
      <div className="a-page-head">
        <div>
          <h1>Posts</h1>
          <p>Search, edit, publish or delete your blog posts.</p>
        </div>
        <Link href="/admin/posts/new" className="btn btn-primary btn-sm"><Icon name="plus" /> New post</Link>
      </div>

      <div className="a-toolbar">
        <div className="unit-toggle" role="group" aria-label="Filter by status">
          {tabs.map((t) => (
            <Link key={t.key} href={href(q, t.key, 1)} className="a-seg" aria-current={status === t.key ? "true" : undefined}>{t.label}</Link>
          ))}
        </div>
        <form method="get" action="/admin/posts" className="a-search" role="search">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input className="a-input" type="search" name="q" defaultValue={q} placeholder="Search title or slug" aria-label="Search posts" maxLength={80} />
          <button type="submit" className="btn btn-ghost btn-sm">Search</button>
          {q && <Link href={href("", status, 1)} className="a-link">Clear</Link>}
        </form>
      </div>

      {failed && <div className="error-box" role="alert"><Icon name="alert" /> <span>Couldn’t load posts. Reload the page to try again.</span></div>}

      <div className="table-wrap a-table-wrap">
        <table className="data-table a-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th className="a-col-date">Date</th><th className="a-col-read">Read</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/posts/${p.id}/edit`} className="a-row-title">{p.title || "Untitled"}</Link>
                  <div className="a-muted">/blog/{p.slug}</div>
                </td>
                <td><StatusBadge published={p.published} /></td>
                <td className="a-col-date">{p.date ? formatPostDate(p.date) : "—"}</td>
                <td className="a-col-read">{p.readMinutes} min</td>
                <td><PostRowActions id={p.id} title={p.title} slug={p.slug} published={p.published} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5}>
                <div className="a-empty">
                  <p>{q || status !== "all" ? "No posts match your filters." : "No posts yet."}</p>
                  {q || status !== "all" ? <Link href="/admin/posts" className="btn btn-ghost btn-sm">Clear filters</Link> : <Link href="/admin/posts/new" className="btn btn-primary btn-sm">Write your first post</Link>}
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="a-pager">
        <span className="a-muted">{total === 0 ? "0 posts" : `Showing ${first}–${last} of ${total}`}</span>
        <div className="a-pager-links">
          {page > 1 ? <Link className="btn btn-ghost btn-sm" href={href(q, status, page - 1)}>Previous</Link> : <span className="btn btn-ghost btn-sm" aria-disabled="true">Previous</span>}
          <span className="a-muted">Page {Math.min(page, pages)} of {pages}</span>
          {page < pages ? <Link className="btn btn-ghost btn-sm" href={href(q, status, page + 1)}>Next</Link> : <span className="btn btn-ghost btn-sm" aria-disabled="true">Next</span>}
        </div>
      </div>
    </>
  );
}
