"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section">
      <div className="container prose" style={{ textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Unable to retrieve weather data. Please try again.</p>
        <p><button type="button" className="btn btn-primary btn-sm" onClick={reset}>Try again</button></p>
      </div>
    </section>
  );
}
