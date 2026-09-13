import Link from "next/link";

export default function NotFound() {
  return <div className="page-shell not-found"><p className="eyebrow">404</p><h1>We couldn&apos;t find that page.</h1><Link className="button button-primary" href="/">Back to the calculator</Link></div>;
}
