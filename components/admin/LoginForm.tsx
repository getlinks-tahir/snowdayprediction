"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Sign-in failed. Check your email and password.");
      setLoading(false);
      return;
    }

    // Signing in is not enough: this must also be the registered admin.
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
    if (rpcError) {
      await supabase.auth.signOut();
      setError("Could not verify admin access. Please try again.");
      setLoading(false);
      return;
    }
    if (isAdmin !== true) {
      await supabase.auth.signOut();
      setError("Sign-in failed. Check your email and password.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="a-login">
      <div className="a-login-theme"><ThemeToggle /></div>
      <div className="glass a-login-card">
        <span className="brand-mark a-login-mark"><Icon name="snow" className="a-icon-lg" /></span>
        <h1>Admin sign in</h1>
        <p>Sign in to manage the Snow Day blog.</p>
        <form onSubmit={handleLogin} noValidate>
          <label className="a-field">
            <span className="a-label">Email</span>
            <input className="a-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="a-field">
            <span className="a-label">Password</span>
            <input className="a-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="error-box" role="alert"><Icon name="alert" /> <span>{error}</span></div>}
          <button type="submit" className="btn btn-primary a-login-btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
