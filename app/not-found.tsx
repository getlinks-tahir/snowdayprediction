import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container prose" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "3rem", margin: 0 }} aria-hidden="true">❄️</p>
        <h1>This page got snowed in</h1>
        <p>We could not find what you were looking for.</p>
        <p><Link href="/" className="btn btn-primary btn-sm">Back to the calculator</Link></p>
      </div>
    </section>
  );
}
