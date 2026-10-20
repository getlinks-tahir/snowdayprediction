
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Password updated successfully. Redirecting to login...");

      window.setTimeout(() => {
        router.push("/admin/login");
      }, 1500);
    } catch {
      setError("Something went wrong. Please open the reset link again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "30px",
          border: "1px solid var(--border, #334155)",
          borderRadius: "18px",
          background: "var(--card, #182338)",
          color: "var(--foreground, #f8fafc)",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
          Reset Password
        </h1>

        <p style={{ marginBottom: "24px", color: "#94a3b8" }}>
          Enter a new password for your account.
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: "8px" }}
          >
            New password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />

          <label
            htmlFor="confirmPassword"
            style={{ display: "block", margin: "18px 0 8px" }}
          >
            Confirm new password
          </label>

          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            style={inputStyle}
          />

          {error && (
            <p role="alert" style={{ color: "#f87171", marginTop: "16px" }}>
              {error}
            </p>
          )}

          {message && (
            <p role="status" style={{ color: "#4ade80", marginTop: "16px" }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...inputStyle,
              marginTop: "24px",
              border: "none",
              background: "linear-gradient(100deg, #0ea5e9, #6366f1)",
              color: "white",
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  border: "1px solid #475569",
  borderRadius: "10px",
  background: "#1e293b",
  color: "#f8fafc",
  fontSize: "15px",
};
