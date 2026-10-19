import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getAdminContext } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  // Already signed in as the admin: skip the form.
  if (await getAdminContext()) redirect("/admin");
  return <LoginForm />;
}
