import Link from "next/link";
import { CITIES } from "@/lib/cities";

export default function CityDirectory() {
  const groups = [
    { title: "United States", list: CITIES.filter((c) => c.country === "US") },
    { title: "Canada", list: CITIES.filter((c) => c.country === "CA") },
  ];
  return (
    <section className="section-tight" id="cities" aria-labelledby="cities-title">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">City forecasts</span>
          <h2 id="cities-title">Snow Day Predictions by City</h2>
          <p>Pick a city for its live chance, local school notes and hour by hour storm timing.</p>
        </div>
        <div className="directory">
          {groups.map((g) => (
            <div key={g.title} className="glass card">
              <h3>{g.title} <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.9rem" }}>({g.list.length} cities)</span></h3>
              <ul>
                {g.list.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/snow-day-calculator/${c.slug}`}>{c.name}, {c.region}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
