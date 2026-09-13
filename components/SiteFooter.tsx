import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <strong>❄️ Snow Day Calculator</strong>
          <p>Live forecasts turned into a helpful estimate—not an official school closure notice.</p>
        </div>
        <div className="footer-links">
          <Link href="/">Calculator</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Snow Day Calculator. Check your school district for official closures.</div>
    </footer>
  );
}
