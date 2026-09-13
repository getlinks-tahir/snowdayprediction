import { redirect } from "next/navigation";
import { AdminEditor } from "@/components/AdminEditor";
import { isAdmin } from "@/lib/auth";

export default async function NewPostPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return <div className="admin-shell"><div className="admin-top"><div><p className="eyebrow">Blog manager</p><h1>Write a new post</h1></div></div><AdminEditor /></div>;
}
