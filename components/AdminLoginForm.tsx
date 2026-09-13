"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={signIn}>
      <label className="form-label" htmlFor="username">Username</label>
      <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
      <label className="form-label" htmlFor="password">Password</label>
      <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
