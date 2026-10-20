import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the Snow Day Calculator handles your location and data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <section className="section">
      <div className="container prose">
        <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>Privacy Policy</h1>
        <p>We keep this simple because we collect very little.</p>
        <h2>What we use</h2>
        <ul>
          <li>The ZIP code, postal code or city you type. We send it to our location services to find the forecast. We do not tie it to you.</li>
          <li>Your GPS location, only if you tap the location button and your browser asks you first. We use it once to find your town.</li>
          <li>Your light or dark mode choice, saved in your own browser.</li>
        </ul>
        <h2>What we do not do</h2>
        <ul>
          <li>We do not ask you to sign up.</li>
          <li>We do not sell your data.</li>
          <li>We do not store your searches in a user profile.</li>
        </ul>
        <h2>Services we use</h2>
        <p>
          Forecasts come from Open-Meteo. US alerts come from the National Weather Service. Places come from Zippopotam.us,
          Open-Meteo and OpenStreetMap Nominatim. Map pictures come from CARTO. Each of these services has its own privacy
          policy.
        </p>
      </div>
    </section>
  );
}
