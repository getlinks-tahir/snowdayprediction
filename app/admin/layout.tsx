import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

/** Admin has no public Header or Footer. Each admin page provides its own <main>. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
