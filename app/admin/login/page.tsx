import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAdmin } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Snow Day Calculator</p>
        <h1>Admin sign in</h1>
        <p>Sign in to write, upload, publish, and manage your blog posts.</p>
        <AdminLoginForm />
      </section>
    </div>
  );
}
