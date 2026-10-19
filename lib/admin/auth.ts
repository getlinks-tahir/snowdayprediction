import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Returns the logged-in admin, or null.
 * - getUser() asks Supabase Auth to validate the token (getSession() would only read the cookie).
 * - is_admin() is the database function that checks private.admin_users using auth.uid().
 */
export async function getAdminContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) return null;
  return { supabase, user: data.user };
}

/** Call this first in every admin page and every Server Action. */
export async function requireAdmin() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  return ctx;
}
