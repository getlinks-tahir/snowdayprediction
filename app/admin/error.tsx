"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="a-login">
      <div className="glass a-login-card">
        <h1>Something went wrong</h1>
        <p>The admin page couldn’t load. Nothing was changed. Try again, or go back to the dashboard.</p>
        <div className="a-dialog-actions">
          <Link className="btn btn-ghost btn-sm" href="/admin">Dashboard</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={reset}>Try again</button>
        </div>
      </div>
    </main>
  );
}
