"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps the public site's skip link, Header, <main> and Footer.
 * On /admin and /admin/* it shows only the page itself, so the admin panel
 * gets its own layout without moving any of your public pages.
 */
export default function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {header}
      <main id="main">{children}</main>
      {footer}
    </>
  );
}
