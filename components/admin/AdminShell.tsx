"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { logout } from "@/lib/admin/actions";
import Icon, { type IconName } from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { ToastProvider } from "./Toast";
import { UNSAVED_MESSAGE, isDirty } from "./dirty";

const NAV: Array<{ href: string; label: string; icon: IconName; match: (p: string) => boolean }> = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", match: (p) => p === "/admin" },
  { href: "/admin/posts", label: "Posts", icon: "posts", match: (p) => p.startsWith("/admin/posts") && p !== "/admin/posts/new" },
  { href: "/admin/posts/new", label: "New post", icon: "plus", match: (p) => p === "/admin/posts/new" },
];

export default function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function guard(e: MouseEvent) {
    if (isDirty() && !window.confirm(UNSAVED_MESSAGE)) e.preventDefault();
  }

  return (
    <ToastProvider>
      <a className="skip-link" href="#admin-main">Skip to content</a>
      <div className="a-shell">
        <header className="a-topbar">
          <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="a-sidebar">
            <Icon name="menu" />
          </button>
          <span className="a-topbar-title">Blog admin</span>
          <ThemeToggle />
        </header>

        <div className="a-scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
        <aside id="a-sidebar" className="a-sidebar" data-open={open} aria-label="Admin navigation">
          <div className="a-sidebar-head">
            <Link href="/admin" className="brand" onClick={guard}>
              <span className="brand-mark"><Icon name="snow" className="a-icon-lg" /></span>
              <span>Snow Day <b>Admin</b></span>
            </Link>
            <button type="button" className="icon-btn a-close" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
          </div>

          <nav className="a-nav">
            {NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <Link key={n.href} href={n.href} className="a-nav-link" aria-current={active ? "page" : undefined} data-active={active} onClick={guard}>
                  <Icon name={n.icon} /> {n.label}
                </Link>
              );
            })}
            <a className="a-nav-link" href="/blog" target="_blank" rel="noopener noreferrer">
              <Icon name="globe" /> View blog <Icon name="external" className="a-icon a-icon-sm" />
            </a>
          </nav>

          <div className="a-sidebar-foot">
            <div className="a-user" title={email}><span className="a-avatar" aria-hidden="true">{(email[0] ?? "A").toUpperCase()}</span><span className="a-user-email">{email}</span></div>
            <div className="a-foot-actions">
              <ThemeToggle />
              <form action={logout} onSubmit={(e) => { if (isDirty() && !window.confirm(UNSAVED_MESSAGE)) e.preventDefault(); }}>
                <button type="submit" className="btn btn-ghost btn-sm"><Icon name="logout" /> Sign out</button>
              </form>
            </div>
          </div>
        </aside>

        <main id="admin-main" className="a-main" tabIndex={-1}>
          <div className="a-content">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
