import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the Snow Day Calculator",
  description: "Who we are, where our weather data comes from and how our snow day prediction works for the USA and Canada.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="section">
      <div className="container prose">
        <span className="eyebrow">About</span>
        <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)" }}>A Smarter, Simpler Snow Day Calculator</h1>
        <p>
          We built this tool for families in the United States and Canada who want a quick, honest answer the night before
          a storm. You should not need to be a weather expert to know if you will need a babysitter in the morning.
        </p>
        <h2>Where our data comes from</h2>
        <ul>
          <li><strong>Forecasts:</strong> Open-Meteo, which blends models from NOAA (like HRRR and GFS) and Environment Canada (GEM). It picks the best model for each location.</li>
          <li><strong>Alerts:</strong> the US National Weather Service shares active winter alerts for any US location.</li>
          <li><strong>Places:</strong> Zippopotam.us for ZIP and postal codes plus Open-Meteo for city names.</li>
          <li><strong>Maps:</strong> OpenStreetMap data drawn by CARTO.</li>
        </ul>
        <h2>How we score a storm</h2>
        <p>
          We add points for snow, snow that falls between 3 AM and 7 AM, freezing rain before dawn, deep cold and strong
          wind. Then we scale the score for your state or province and for the day of the week. You can see every point
          by opening &quot;How we got&quot; under any result.
        </p>
        <h2>Our promise</h2>
        <p>
          We will never pretend a guess is a fact. We do not invent past closure records. Our number is a prediction.
          Your school district or school board always makes the final call.
        </p>
        <p><Link href="/#calculator" className="btn btn-primary btn-sm">Check your chance</Link></p>
      </div>
    </section>
  );
}
